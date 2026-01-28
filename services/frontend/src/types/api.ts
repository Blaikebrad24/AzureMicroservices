export interface BlobMetadata {
  name: string;
  containerName: string;
  contentLength: number;
  contentType: string;
  lastModified: string;
  metadata?: Record<string, string>;
}

export interface UploadResponse {
  blobName: string;
  containerName: string;
  url: string;
  contentLength: number;
}

export interface Report {
  id: number;
  name: string;
  type: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  parameters?: Record<string, unknown>;
  resultPath?: string;
  errorMessage?: string;
  generatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DataEntity {
  id: number;
  name: string;
  description?: string;
  category?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}
