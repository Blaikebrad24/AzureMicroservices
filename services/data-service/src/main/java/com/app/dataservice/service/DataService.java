package com.app.dataservice.service;

import com.app.dataservice.model.DataEntity;
import com.app.dataservice.repository.DataRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Slf4j
@Service
@RequiredArgsConstructor
public class DataService {

    private final DataRepository dataRepository;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "data:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    public Page<DataEntity> listData(Pageable pageable) {
        return dataRepository.findAll(pageable);
    }

    public DataEntity getById(Long id) {
        String cacheKey = CACHE_PREFIX + id;
        DataEntity cached = (DataEntity) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            return cached;
        }

        DataEntity entity = dataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Data entity not found: " + id));

        redisTemplate.opsForValue().set(cacheKey, entity, CACHE_TTL);
        return entity;
    }

    public DataEntity create(DataEntity entity) {
        DataEntity saved = dataRepository.save(entity);
        redisTemplate.opsForValue().set(CACHE_PREFIX + saved.getId(), saved, CACHE_TTL);
        log.info("Created data entity: id={}", saved.getId());
        return saved;
    }

    public DataEntity update(Long id, DataEntity updates) {
        DataEntity existing = dataRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Data entity not found: " + id));

        existing.setName(updates.getName());
        existing.setDescription(updates.getDescription());
        existing.setCategory(updates.getCategory());
        existing.setMetadata(updates.getMetadata());

        DataEntity saved = dataRepository.save(existing);
        redisTemplate.opsForValue().set(CACHE_PREFIX + saved.getId(), saved, CACHE_TTL);
        log.info("Updated data entity: id={}", saved.getId());
        return saved;
    }

    public void delete(Long id) {
        dataRepository.deleteById(id);
        redisTemplate.delete(CACHE_PREFIX + id);
        log.info("Deleted data entity: id={}", id);
    }

    public Page<DataEntity> search(String query, Pageable pageable) {
        return dataRepository.search(query, pageable);
    }
}
