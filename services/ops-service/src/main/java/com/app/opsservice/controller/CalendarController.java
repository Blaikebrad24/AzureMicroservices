package com.app.opsservice.controller;

import com.app.opsservice.model.Shift;
import com.app.opsservice.model.ShiftType;
import com.app.opsservice.model.TeamMember;
import com.app.opsservice.service.CalendarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/calendar")
@RequiredArgsConstructor
public class CalendarController {

    private final CalendarService calendarService;

    @GetMapping("/team-members")
    public ResponseEntity<List<TeamMember>> listTeamMembers() {
        return ResponseEntity.ok(calendarService.listTeamMembers());
    }

    @GetMapping("/shifts")
    public ResponseEntity<List<Shift>> getShifts(@RequestParam("weekOf") String weekOf) {
        LocalDate date = LocalDate.parse(weekOf);
        return ResponseEntity.ok(calendarService.getShiftsForWeek(date));
    }

    @PostMapping("/shifts")
    public ResponseEntity<Shift> createShift(@RequestBody Map<String, Object> body) {
        Long teamMemberId = Long.valueOf(body.get("teamMemberId").toString());
        String title = (String) body.get("title");
        LocalDate shiftDate = LocalDate.parse((String) body.get("shiftDate"));
        LocalTime startTime = body.get("startTime") != null && !body.get("startTime").toString().isEmpty()
                ? LocalTime.parse((String) body.get("startTime")) : null;
        LocalTime endTime = body.get("endTime") != null && !body.get("endTime").toString().isEmpty()
                ? LocalTime.parse((String) body.get("endTime")) : null;
        ShiftType shiftType = body.containsKey("shiftType")
                ? ShiftType.valueOf((String) body.get("shiftType")) : ShiftType.DAY;
        String notes = (String) body.get("notes");
        String createdBy = (String) body.get("createdBy");

        return ResponseEntity.ok(calendarService.createShift(
                teamMemberId, title, shiftDate, startTime, endTime, shiftType, notes, createdBy));
    }

    @PutMapping("/shifts/{id}")
    public ResponseEntity<Shift> updateShift(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        String title = (String) body.get("title");
        LocalDate shiftDate = LocalDate.parse((String) body.get("shiftDate"));
        LocalTime startTime = body.get("startTime") != null && !body.get("startTime").toString().isEmpty()
                ? LocalTime.parse((String) body.get("startTime")) : null;
        LocalTime endTime = body.get("endTime") != null && !body.get("endTime").toString().isEmpty()
                ? LocalTime.parse((String) body.get("endTime")) : null;
        ShiftType shiftType = body.containsKey("shiftType")
                ? ShiftType.valueOf((String) body.get("shiftType")) : ShiftType.DAY;
        String notes = (String) body.get("notes");

        return ResponseEntity.ok(calendarService.updateShift(id, title, shiftDate, startTime, endTime, shiftType, notes));
    }

    @DeleteMapping("/shifts/{id}")
    public ResponseEntity<Void> deleteShift(@PathVariable Long id) {
        calendarService.deleteShift(id);
        return ResponseEntity.noContent().build();
    }

    @SuppressWarnings("unchecked")
    @PostMapping("/import")
    public ResponseEntity<List<Shift>> importSchedule(@RequestBody Map<String, Object> body) {
        LocalDate weekOf = LocalDate.parse((String) body.get("weekOf"));
        List<Map<String, String>> shifts = (List<Map<String, String>>) body.get("shifts");
        String createdBy = (String) body.get("createdBy");

        return ResponseEntity.ok(calendarService.importSchedule(weekOf, shifts, createdBy));
    }

    @GetMapping("/shifts/count")
    public ResponseEntity<Map<String, Long>> getWeekShiftCount(@RequestParam("weekOf") String weekOf) {
        LocalDate date = LocalDate.parse(weekOf);
        return ResponseEntity.ok(Map.of("count", calendarService.getShiftCountForWeek(date)));
    }
}
