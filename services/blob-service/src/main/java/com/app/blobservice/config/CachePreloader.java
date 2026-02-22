package com.app.blobservice.config;

import com.app.blobservice.service.BlobStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class CachePreloader {

    private final BlobStorageService blobStorageService;

    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void preloadCache() {
        log.info("Starting cache preload...");
        try {
            List<String> containers = blobStorageService.listContainers();
            log.info("Found {} containers to preload", containers.size());

            for (String container : containers) {
                try {
                    blobStorageService.listBlobsPaginated(container, 0, 20,
                            "lastModified", "desc", null);
                    log.info("Preloaded cache for container: {}", container);
                } catch (Exception e) {
                    log.warn("Failed to preload cache for container {}: {}", container, e.getMessage());
                }
            }

            // Also preload the all-containers aggregate
            blobStorageService.listBlobsPaginated(null, 0, 20,
                    "lastModified", "desc", null);

            log.info("Cache preload complete");
        } catch (Exception e) {
            log.warn("Cache preload failed: {}", e.getMessage());
        }
    }
}
