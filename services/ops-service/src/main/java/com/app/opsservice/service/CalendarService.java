package com.app.opsservice.service;

import com.app.opsservice.model.Shift;
import com.app.opsservice.model.ShiftType;
import com.app.opsservice.model.TeamMember;
import com.app.opsservice.repository.ShiftRepository;
import com.app.opsservice.repository.TeamMemberRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class CalendarService {

    private final ShiftRepository shiftRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "cal:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    public List<TeamMember> listTeamMembers() {
        return teamMemberRepository.findAll();
    }

    public List<Shift> getShiftsForWeek(LocalDate weekOf) {
        LocalDate monday = weekOf.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = monday.plusDays(6);

        String cacheKey = CACHE_PREFIX + "week:" + monday;
        @SuppressWarnings("unchecked")
        List<Shift> cached = (List<Shift>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        List<Shift> shifts = shiftRepository.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(monday, sunday);
        redisTemplate.opsForValue().set(cacheKey, shifts, CACHE_TTL);
        return shifts;
    }

    public Shift createShift(Long teamMemberId, String title, LocalDate shiftDate,
                             LocalTime startTime, LocalTime endTime, ShiftType shiftType,
                             String notes, String createdBy) {
        TeamMember member = teamMemberRepository.findById(teamMemberId)
                .orElseThrow(() -> new IllegalArgumentException("Team member not found: " + teamMemberId));

        Shift shift = Shift.builder()
                .teamMember(member)
                .title(title)
                .shiftDate(shiftDate)
                .startTime(startTime)
                .endTime(endTime)
                .shiftType(shiftType != null ? shiftType : ShiftType.DAY)
                .notes(notes)
                .createdBy(createdBy)
                .build();

        Shift saved = shiftRepository.save(shift);
        evictWeekCache(shiftDate);
        log.info("Created shift: id={}, member={}, date={}", saved.getId(), member.getName(), shiftDate);
        return saved;
    }

    public Shift updateShift(Long id, String title, LocalDate shiftDate,
                             LocalTime startTime, LocalTime endTime, ShiftType shiftType,
                             String notes) {
        Shift existing = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found: " + id));

        LocalDate oldDate = existing.getShiftDate();

        existing.setTitle(title);
        existing.setShiftDate(shiftDate);
        existing.setStartTime(startTime);
        existing.setEndTime(endTime);
        existing.setShiftType(shiftType);
        existing.setNotes(notes);

        Shift saved = shiftRepository.save(existing);
        evictWeekCache(oldDate);
        evictWeekCache(shiftDate);
        log.info("Updated shift: id={}", saved.getId());
        return saved;
    }

    public void deleteShift(Long id) {
        Shift shift = shiftRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Shift not found: " + id));
        shiftRepository.deleteById(id);
        evictWeekCache(shift.getShiftDate());
        log.info("Deleted shift: id={}", id);
    }

    @Transactional
    public List<Shift> importSchedule(LocalDate weekOf, List<Map<String, String>> shiftEntries, String createdBy) {
        LocalDate monday = weekOf.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = monday.plusDays(6);

        // Replace mode: delete existing shifts for the week
        shiftRepository.deleteByShiftDateBetween(monday, sunday);

        List<Shift> created = new ArrayList<>();
        for (Map<String, String> entry : shiftEntries) {
            String memberName = entry.get("teamMemberName");
            TeamMember member = teamMemberRepository.findByName(memberName)
                    .orElseThrow(() -> new IllegalArgumentException("Team member not found: " + memberName));

            LocalDate date = LocalDate.parse(entry.get("shiftDate"));
            LocalTime start = entry.get("startTime") != null && !entry.get("startTime").isEmpty()
                    ? LocalTime.parse(entry.get("startTime")) : null;
            LocalTime end = entry.get("endTime") != null && !entry.get("endTime").isEmpty()
                    ? LocalTime.parse(entry.get("endTime")) : null;
            ShiftType type = ShiftType.valueOf(entry.get("shiftType"));

            Shift shift = Shift.builder()
                    .teamMember(member)
                    .title(entry.getOrDefault("title", type.name() + " Shift"))
                    .shiftDate(date)
                    .startTime(start)
                    .endTime(end)
                    .shiftType(type)
                    .notes(entry.get("notes"))
                    .createdBy(createdBy)
                    .build();

            created.add(shiftRepository.save(shift));
        }

        evictWeekCache(monday);
        log.info("Imported {} shifts for week of {}", created.size(), monday);
        return created;
    }

    public long getShiftCountForWeek(LocalDate weekOf) {
        LocalDate monday = weekOf.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate sunday = monday.plusDays(6);
        return shiftRepository.findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(monday, sunday).size();
    }

    private void evictWeekCache(LocalDate date) {
        LocalDate monday = date.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        redisTemplate.delete(CACHE_PREFIX + "week:" + monday);
    }
}
