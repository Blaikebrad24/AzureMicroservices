package com.app.blobservice.controller;

import com.app.blobservice.model.BlobMetadata;
import com.app.blobservice.model.UploadResponse;
import com.app.blobservice.service.BlobStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/blobs")
@RequiredArgsConstructor
public class BlobController {

    private final BlobStorageService blobStorageService;

    @GetMapping("/containers")
    public ResponseEntity<List<String>> listContainers() {
        return ResponseEntity.ok(blobStorageService.listContainers());
    }

    @GetMapping("/{container}")
    public ResponseEntity<List<BlobMetadata>> listBlobs(@PathVariable String container) {
        return ResponseEntity.ok(blobStorageService.listBlobs(container));
    }

    @GetMapping("/{container}/{blob}/metadata")
    public ResponseEntity<BlobMetadata> getBlobMetadata(
            @PathVariable String container,
            @PathVariable String blob) {
        return ResponseEntity.ok(blobStorageService.getBlobMetadata(container, blob));
    }

    @GetMapping("/{container}/{blob}")
    public ResponseEntity<byte[]> downloadBlob(
            @PathVariable String container,
            @PathVariable String blob) {
        byte[] data = blobStorageService.downloadBlob(container, blob);
        BlobMetadata metadata = blobStorageService.getBlobMetadata(container, blob);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + blob + "\"")
                .contentType(MediaType.parseMediaType(
                        metadata.getContentType() != null ? metadata.getContentType() : "application/octet-stream"))
                .contentLength(data.length)
                .body(data);
    }

    @PostMapping("/{container}")
    public ResponseEntity<UploadResponse> uploadBlob(
            @PathVariable String container,
            @RequestParam("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(blobStorageService.uploadBlob(container, file));
    }

    @DeleteMapping("/{container}/{blob}")
    public ResponseEntity<Void> deleteBlob(
            @PathVariable String container,
            @PathVariable String blob) {
        blobStorageService.deleteBlob(container, blob);
        return ResponseEntity.noContent().build();
    }
}
