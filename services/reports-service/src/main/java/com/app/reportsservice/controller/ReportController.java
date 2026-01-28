package com.app.reportsservice.controller;

import com.app.reportsservice.model.Report;
import com.app.reportsservice.model.ReportStatus;
import com.app.reportsservice.service.ReportGenerationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
public class ReportController {

    private final ReportGenerationService reportGenerationService;

    @PostMapping("/generate")
    public ResponseEntity<Report> generateReport(@RequestBody Map<String, Object> request) {
        String name = (String) request.get("name");
        String type = (String) request.get("type");

        @SuppressWarnings("unchecked")
        Map<String, Object> parameters = (Map<String, Object>) request.getOrDefault("parameters", Map.of());

        Report report = reportGenerationService.createReport(name, type, parameters);
        reportGenerationService.processReport(report.getId());

        return ResponseEntity.ok(report);
    }

    @GetMapping
    public ResponseEntity<List<Report>> listReports() {
        return ResponseEntity.ok(reportGenerationService.listReports());
    }

    @GetMapping("/{id}")
    public ResponseEntity<Report> getReport(@PathVariable Long id) {
        return ResponseEntity.ok(reportGenerationService.getReport(id));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<Map<String, String>> getReportStatus(@PathVariable Long id) {
        ReportStatus status = reportGenerationService.getReportStatus(id);
        return ResponseEntity.ok(Map.of("id", id.toString(), "status", status.name()));
    }
}
