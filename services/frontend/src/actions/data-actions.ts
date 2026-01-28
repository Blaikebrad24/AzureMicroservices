"use server";

import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import type { DataEntity, Page } from "@/types/api";

export async function listData(
  page: number = 0,
  size: number = 20
): Promise<Page<DataEntity>> {
  return apiGet<Page<DataEntity>>(
    "data",
    `/api/data?page=${page}&size=${size}&sort=createdAt,desc`
  );
}

export async function getDataById(id: number): Promise<DataEntity> {
  return apiGet<DataEntity>("data", `/api/data/${id}`);
}

export async function createData(
  entity: Omit<DataEntity, "id" | "createdAt" | "updatedAt">
): Promise<DataEntity> {
  return apiPost<DataEntity>("data", "/api/data", entity);
}

export async function updateData(
  id: number,
  entity: Omit<DataEntity, "id" | "createdAt" | "updatedAt">
): Promise<DataEntity> {
  return apiPut<DataEntity>("data", `/api/data/${id}`, entity);
}

export async function deleteData(id: number): Promise<void> {
  return apiDelete("data", `/api/data/${id}`);
}

export async function searchData(
  query: string,
  page: number = 0,
  size: number = 20
): Promise<Page<DataEntity>> {
  return apiGet<Page<DataEntity>>(
    "data",
    `/api/data/search?q=${encodeURIComponent(query)}&page=${page}&size=${size}`
  );
}
