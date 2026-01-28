package com.app.dataservice.controller;

import com.app.dataservice.model.DataEntity;
import com.app.dataservice.service.DataService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/data")
@RequiredArgsConstructor
public class DataController {

    private final DataService dataService;

    @GetMapping
    public ResponseEntity<Page<DataEntity>> listData(
            @PageableDefault(size = 20, sort = "createdAt") Pageable pageable) {
        return ResponseEntity.ok(dataService.listData(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<DataEntity> getById(@PathVariable Long id) {
        return ResponseEntity.ok(dataService.getById(id));
    }

    @PostMapping
    public ResponseEntity<DataEntity> create(@RequestBody DataEntity entity) {
        return ResponseEntity.ok(dataService.create(entity));
    }

    @PutMapping("/{id}")
    public ResponseEntity<DataEntity> update(@PathVariable Long id, @RequestBody DataEntity entity) {
        return ResponseEntity.ok(dataService.update(id, entity));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        dataService.delete(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/search")
    public ResponseEntity<Page<DataEntity>> search(
            @RequestParam("q") String query,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(dataService.search(query, pageable));
    }
}
