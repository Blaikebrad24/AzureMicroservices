package com.app.blobservice.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.OffsetDateTime;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlobMetadata implements Serializable {
    private String name;
    private String containerName;
    private Long contentLength;
    private String contentType;
    private OffsetDateTime lastModified;
    private Map<String, String> metadata;
}
