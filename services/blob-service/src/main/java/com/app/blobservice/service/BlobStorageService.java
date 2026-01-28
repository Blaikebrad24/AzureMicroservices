package com.app.blobservice.service;

import com.app.blobservice.model.BlobMetadata;
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

        // Invalidate cache
        redisTemplate.delete(CACHE_PREFIX + "list:" + containerName);

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

        // Invalidate cache
        redisTemplate.delete(CACHE_PREFIX + "list:" + containerName);

        log.info("Deleted blob: {}/{}", containerName, blobName);
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
