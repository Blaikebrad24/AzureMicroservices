import { getShiftsForWeek, listTeamMembers } from "@/actions/calendar-actions";
import { ShiftCalendar } from "@/components/calendar/shift-calendar";
import { ScheduleUploadDialog } from "@/components/calendar/schedule-upload-dialog";
import RoleGate from "@/components/role-gate";

function getCurrentWeekMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday = 1
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

export default async function CalendarPage() {
  const weekOf = getCurrentWeekMonday();

  let shifts: Awaited<ReturnType<typeof getShiftsForWeek>> = [];
  let teamMembers: Awaited<ReturnType<typeof listTeamMembers>> = [];

  try {
    [shifts, teamMembers] = await Promise.all([
      getShiftsForWeek(weekOf),
      listTeamMembers(),
    ]);
  } catch {
    // Services may not be available yet
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Shift Calendar</h2>
          <p className="mt-1 text-sm text-blue-200">
            Weekly team schedule — data center operations
          </p>
        </div>
        <RoleGate allowedRoles={["admin"]} fallback={null}>
          <ScheduleUploadDialog />
        </RoleGate>
      </div>

      <ShiftCalendar
        initialShifts={shifts}
        teamMembers={teamMembers}
        initialWeekOf={weekOf}
      />
    </div>
  );
}
