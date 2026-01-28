"use server";

import { getCachedValue } from "@/lib/redis-client";

export async function getCachedReportStatus(
  reportId: number
): Promise<string | null> {
  return getCachedValue<string>(`report:status:${reportId}`);
}

export async function getCachedBlobList(
  containerName: string
): Promise<unknown[] | null> {
  return getCachedValue<unknown[]>(`blob:list:${containerName}`);
}

export async function getCachedDataEntity(
  id: number
): Promise<unknown | null> {
  return getCachedValue<unknown>(`data:${id}`);
}
