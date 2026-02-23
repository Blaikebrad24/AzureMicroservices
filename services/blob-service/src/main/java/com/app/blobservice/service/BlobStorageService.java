package com.app.blobservice.service;

import com.app.blobservice.model.BlobMetadata;
import com.app.blobservice.model.BlobPage;
import com.app.blobservice.model.UploadResponse;
import com.azure.storage.blob.BlobClient;
import com.azure.storage.blob.BlobContainerClient;
import com.azure.storage.blob.BlobServiceClient;
import com.azure.storage.blob.models.BlobItem;
import com.azure.storage.blob.models.BlobProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class BlobStorageService {

    private final BlobServiceClient blobServiceClient;
    private final RedisTemplate<String, Object> redisTemplate;

    private static final String CACHE_PREFIX = "blob:";
    private static final Duration CACHE_TTL = Duration.ofMinutes(10);

    public List<String> listContainers() {
        return blobServiceClient.listBlobContainers().stream()
                .map(container -> container.getName())
                .collect(Collectors.toList());
    }

    public List<BlobMetadata> listBlobs(String containerName) {
        String cacheKey = CACHE_PREFIX + "list:" + containerName;

        @SuppressWarnings("unchecked")
        List<BlobMetadata> cached = (List<BlobMetadata>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("Cache hit for blob list: {}", containerName);
            return cached;
        }

        BlobContainerClient containerClient = blobServiceClient.getBlobContainerClient(containerName);
        List<BlobMetadata> blobs = containerClient.listBlobs().stream()
                .map(item -> toBlobMetadata(containerName, item))
                .collect(Collectors.toList());

        redisTemplate.opsForValue().set(cacheKey, blobs, CACHE_TTL);
        return blobs;
    }

    public BlobPage listBlobsPaginated(String container, int page, int size,
                                       String sortBy, String sortDir, String search) {
        List<BlobMetadata> allBlobs;
        if (container == null || container.isBlank()) {
            allBlobs = getAllBlobsSorted(sortBy, sortDir);
        } else {
            allBlobs = getBlobsSortedForContainer(container, sortBy, sortDir);
        }

        if (search != null && !search.isBlank()) {
            String lowerSearch = search.toLowerCase();
            allBlobs = allBlobs.stream()
                    .filter(b -> b.getName().toLowerCase().contains(lowerSearch))
                    .collect(Collectors.toList());
        }

        int totalElements = allBlobs.size();
        int totalPages = (int) Math.ceil((double) totalElements / size);
        int fromIndex = Math.min(page * size, totalElements);
        int toIndex = Math.min(fromIndex + size, totalElements);

        List<BlobMetadata> pageContent = allBlobs.subList(fromIndex, toIndex);

        return BlobPage.builder()
                .content(pageContent)
                .totalElements(totalElements)
                .totalPages(totalPages)
                .number(page)
                .size(size)
                .first(page == 0)
                .last(page >= totalPages - 1)
                .build();
    }

    public BlobMetadata getBlobMetadata(String containerName, String blobName) {
        BlobClient blobClient = blobServiceClient
                .getBlobContainerClient(containerName)
                .getBlobClient(blobName);

        BlobProperties properties = blobClient.getProperties();
        return BlobMetadata.builder()
                .name(blobName)
                .containerName(containerName)
                .contentLength(properties.getBlobSize())
                .contentType(properties.getContentType())
                .lastModified(properties.getLastModified())
                .metadata(properties.getMetadata())
                .build();
    }

    public byte[] downloadBlob(String containerName, String blobName) {
        BlobClient blobClient = blobServiceClient
                .getBlobContainerClient(containerName)
                .getBlobClient(blobName);

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        blobClient.downloadStream(outputStream);
        return outputStream.toByteArray();
    }

    public UploadResponse uploadBlob(String containerName, MultipartFile file) throws IOException {
        BlobContainerClient containerClient = blobServiceClient.getBlobContainerClient(containerName);
        containerClient.createIfNotExists();

        String blobName = file.getOriginalFilename();
        BlobClient blobClient = containerClient.getBlobClient(blobName);

        blobClient.upload(file.getInputStream(), file.getSize(), true);

        invalidateCache(containerName);

        log.info("Uploaded blob: {}/{}", containerName, blobName);

        return UploadResponse.builder()
                .blobName(blobName)
                .containerName(containerName)
                .url(blobClient.getBlobUrl())
                .contentLength(file.getSize())
                .build();
    }

    public void deleteBlob(String containerName, String blobName) {
        BlobClient blobClient = blobServiceClient
                .getBlobContainerClient(containerName)
                .getBlobClient(blobName);

        blobClient.delete();

        invalidateCache(containerName);

        log.info("Deleted blob: {}/{}", containerName, blobName);
    }

    private List<BlobMetadata> getBlobsSortedForContainer(String containerName,
                                                          String sortBy, String sortDir) {
        String cacheKey = CACHE_PREFIX + "sorted:" + containerName;

        @SuppressWarnings("unchecked")
        List<BlobMetadata> cached = (List<BlobMetadata>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("Cache hit for sorted blob list: {}", containerName);
            List<BlobMetadata> sorted = new ArrayList<>(cached);
            sorted.sort(getComparator(sortBy, sortDir));
            return sorted;
        }

        List<BlobMetadata> blobs = listBlobs(containerName);
        redisTemplate.opsForValue().set(cacheKey, blobs, CACHE_TTL);

        List<BlobMetadata> sorted = new ArrayList<>(blobs);
        sorted.sort(getComparator(sortBy, sortDir));
        return sorted;
    }

    private List<BlobMetadata> getAllBlobsSorted(String sortBy, String sortDir) {
        String cacheKey = CACHE_PREFIX + "all:sorted";

        @SuppressWarnings("unchecked")
        List<BlobMetadata> cached = (List<BlobMetadata>) redisTemplate.opsForValue().get(cacheKey);
        if (cached != null) {
            log.debug("Cache hit for all blobs sorted list");
            List<BlobMetadata> sorted = new ArrayList<>(cached);
            sorted.sort(getComparator(sortBy, sortDir));
            return sorted;
        }

        List<String> containers = listContainers();
        List<BlobMetadata> allBlobs = new ArrayList<>();
        for (String container : containers) {
            allBlobs.addAll(listBlobs(container));
        }

        redisTemplate.opsForValue().set(cacheKey, allBlobs, CACHE_TTL);

        allBlobs.sort(getComparator(sortBy, sortDir));
        return allBlobs;
    }

    private Comparator<BlobMetadata> getComparator(String sortBy, String sortDir) {
        Comparator<BlobMetadata> comparator;
        switch (sortBy != null ? sortBy : "lastModified") {
            case "name":
                comparator = Comparator.comparing(BlobMetadata::getName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
                break;
            case "contentLength":
                comparator = Comparator.comparing(BlobMetadata::getContentLength,
                        Comparator.nullsLast(Comparator.naturalOrder()));
                break;
            case "contentType":
                comparator = Comparator.comparing(BlobMetadata::getContentType,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
                break;
            case "containerName":
                comparator = Comparator.comparing(BlobMetadata::getContainerName,
                        Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER));
                break;
            default: // lastModified
                comparator = Comparator.comparing(BlobMetadata::getLastModified,
                        Comparator.nullsLast(Comparator.naturalOrder()));
                break;
        }

        if ("asc".equalsIgnoreCase(sortDir)) {
            return comparator;
        }
        return comparator.reversed();
    }

    private void invalidateCache(String containerName) {
        redisTemplate.delete(CACHE_PREFIX + "list:" + containerName);
        redisTemplate.delete(CACHE_PREFIX + "sorted:" + containerName);
        redisTemplate.delete(CACHE_PREFIX + "all:sorted");
    }

    private BlobMetadata toBlobMetadata(String containerName, BlobItem item) {
        return BlobMetadata.builder()
                .name(item.getName())
                .containerName(containerName)
                .contentLength(item.getProperties().getContentLength())
                .contentType(item.getProperties().getContentType())
                .lastModified(item.getProperties().getLastModified())
                .build();
    }
}
