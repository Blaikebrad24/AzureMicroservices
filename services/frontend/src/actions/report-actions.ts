"use server";

import { apiGet, apiPost } from "@/lib/api-client";
import type { Report } from "@/types/api";

export async function listReports(): Promise<Report[]> {
  return apiGet<Report[]>("reports", "/api/reports");
}

export async function getReport(id: number): Promise<Report> {
  return apiGet<Report>("reports", `/api/reports/${id}`);
}

export async function getReportStatus(
  id: number
): Promise<{ id: string; status: string }> {
  return apiGet<{ id: string; status: string }>(
    "reports",
    `/api/reports/${id}/status`
  );
}

export async function generateReport(
  name: string,
  type: string,
  parameters?: Record<string, unknown>
): Promise<Report> {
  return apiPost<Report>("reports", "/api/reports/generate", {
    name,
    type,
    parameters,
  });
}
