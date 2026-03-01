package com.app.opsservice.repository;

import com.app.opsservice.model.Shift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ShiftRepository extends JpaRepository<Shift, Long> {

    List<Shift> findByShiftDateBetweenOrderByShiftDateAscStartTimeAsc(LocalDate start, LocalDate end);

    @Transactional
    void deleteByShiftDateBetween(LocalDate start, LocalDate end);
}
