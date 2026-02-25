"use server";

import { apiGet, apiDelete, apiPostFormData } from "@/lib/api-client";
import type { BlobMetadata, Page, UploadResponse } from "@/types/api";

export async function listContainers(): Promise<string[]> {
  return apiGet<string[]>("blob", "/api/blobs/containers");
}

export async function listBlobs(container: string): Promise<BlobMetadata[]> {
  return apiGet<BlobMetadata[]>("blob", `/api/blobs/${container}`);
}

export async function getBlobMetadata(
  container: string,
  blob: string
): Promise<BlobMetadata> {
  return apiGet<BlobMetadata>("blob", `/api/blobs/${container}/${blob}/metadata`);
}

export async function uploadBlob(
  container: string,
  formData: FormData
): Promise<UploadResponse> {
  return apiPostFormData<UploadResponse>("blob", `/api/blobs/${container}`, formData);
}

export async function listBlobsPaginated(
  page = 0,
  size = 20,
  sortBy = "lastModified",
  sortDir = "desc",
  container?: string,
  search?: string
): Promise<Page<BlobMetadata>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
    sortBy,
    sortDir,
  });
  if (container) params.set("container", container);
  if (search) params.set("search", search);

  return apiGet<Page<BlobMetadata>>("blob", `/api/blobs/paginated?${params}`);
}

export async function deleteBlob(container: string, blob: string): Promise<void> {
  return apiDelete("blob", `/api/blobs/${container}/${blob}`);
}

export async function downloadBlobUrl(container: string, blob: string): Promise<string> {
  // Return the proxied URL the browser can fetch directly for download
  return `/api/blobs/${container}/${encodeURIComponent(blob)}`;
}
