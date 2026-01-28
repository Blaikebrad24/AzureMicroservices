package com.app.reportsservice.service;

import com.app.reportsservice.model.Report;
import com.app.reportsservice.model.ReportStatus;
import com.app.reportsservice.repository.ReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportGenerationService {

    private final ReportRepository reportRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "report:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(5);

    public Report createReport(String name, String type, Map<String, Object> parameters) {
        Report report = Report.builder()
                .name(name)
                .type(type)
                .parameters(parameters)
                .status(ReportStatus.PENDING)
                .build();

        report = reportRepository.save(report);
        cacheReportStatus(report);

        log.info("Created report: id={}, name={}, type={}", report.getId(), name, type);
        return report;
    }

    @Async
    public void processReport(Long reportId) {
        Report report = reportRepository.findById(reportId)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + reportId));

        report.setStatus(ReportStatus.PROCESSING);
        reportRepository.save(report);
        cacheReportStatus(report);

        try {
            log.info("Processing report: id={}", reportId);

            // Simulate report generation work
            Thread.sleep(5000);

            report.setStatus(ReportStatus.COMPLETED);
            report.setGeneratedAt(OffsetDateTime.now());
            report.setResultPath("/reports/generated/" + reportId + ".pdf");
            reportRepository.save(report);
            cacheReportStatus(report);

            log.info("Report completed: id={}", reportId);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            report.setStatus(ReportStatus.FAILED);
            report.setErrorMessage("Report generation was interrupted");
            reportRepository.save(report);
            cacheReportStatus(report);
        } catch (Exception e) {
            log.error("Report generation failed: id={}", reportId, e);
            report.setStatus(ReportStatus.FAILED);
            report.setErrorMessage(e.getMessage());
            reportRepository.save(report);
            cacheReportStatus(report);
        }
    }

    public List<Report> listReports() {
        return reportRepository.findAllByOrderByCreatedAtDesc();
    }

    public Report getReport(Long id) {
        return reportRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Report not found: " + id));
    }

    public ReportStatus getReportStatus(Long id) {
        String cacheKey = CACHE_PREFIX + "status:" + id;
        Object cached = redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return ReportStatus.valueOf(cached.toString());
        }

        Report report = getReport(id);
        cacheReportStatus(report);
        return report.getStatus();
    }

    private void cacheReportStatus(Report report) {
        String cacheKey = CACHE_PREFIX + "status:" + report.getId();
        redisTemplate.opsForValue().set(cacheKey, report.getStatus().name(), CACHE_TTL);
    }
}
