"use server";

import { apiGet, apiDelete, apiPostFormData } from "@/lib/api-client";
import type { BlobMetadata, UploadResponse } from "@/types/api";

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

export async function deleteBlob(container: string, blob: string): Promise<void> {
  return apiDelete("blob", `/api/blobs/${container}/${blob}`);
}
