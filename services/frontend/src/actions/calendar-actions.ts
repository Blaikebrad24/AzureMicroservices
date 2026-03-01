"use server";

import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import { getCurrentUser, requireRole } from "@/lib/auth";
import type { TeamMember, Shift, ScheduleUploadRequest } from "@/types/api";

export async function listTeamMembers(): Promise<TeamMember[]> {
  return apiGet<TeamMember[]>("ops", "/api/calendar/team-members");
}

export async function getShiftsForWeek(weekOf: string): Promise<Shift[]> {
  return apiGet<Shift[]>("ops", `/api/calendar/shifts?weekOf=${weekOf}`);
}

export async function createShift(shift: {
  teamMemberId: number;
  title: string;
  shiftDate: string;
  startTime?: string;
  endTime?: string;
  shiftType: string;
  notes?: string;
}): Promise<Shift> {
  const user = await requireRole("admin");
  return apiPost<Shift>("ops", "/api/calendar/shifts", {
    ...shift,
    createdBy: user.username,
  });
}

export async function updateShift(
  id: number,
  shift: {
    title: string;
    shiftDate: string;
    startTime?: string;
    endTime?: string;
    shiftType: string;
    notes?: string;
  }
): Promise<Shift> {
  await requireRole("admin");
  return apiPut<Shift>("ops", `/api/calendar/shifts/${id}`, shift);
}

export async function deleteShift(id: number): Promise<void> {
  await requireRole("admin");
  return apiDelete("ops", `/api/calendar/shifts/${id}`);
}

export async function importSchedule(
  request: Omit<ScheduleUploadRequest, "createdBy">
): Promise<Shift[]> {
  const user = await requireRole("admin");
  return apiPost<Shift[]>("ops", "/api/calendar/import", {
    ...request,
    createdBy: user.username,
  });
}

export async function getWeekShiftCount(weekOf: string): Promise<number> {
  const result = await apiGet<{ count: number }>(
    "ops",
    `/api/calendar/shifts/count?weekOf=${weekOf}`
  );
  return result.count;
}
