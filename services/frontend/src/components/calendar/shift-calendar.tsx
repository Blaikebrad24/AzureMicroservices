"use client";

import { useState, useTransition } from "react";
import { getShiftsForWeek } from "@/actions/calendar-actions";
import type { Shift, TeamMember } from "@/types/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ShiftCalendarProps {
  initialShifts: Shift[];
  teamMembers: TeamMember[];
  initialWeekOf: string;
}

const SHIFT_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  DAY:    { bg: "bg-blue-500/20",   text: "text-blue-300",   border: "border-blue-500/30" },
  SWING:  { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30" },
  NIGHT:  { bg: "bg-slate-500/20",  text: "text-slate-300",  border: "border-slate-500/30" },
  ONCALL: { bg: "bg-amber-500/20",  text: "text-amber-300",  border: "border-amber-500/30" },
  OFF:    { bg: "bg-gray-500/10",   text: "text-gray-400",   border: "border-gray-500/20" },
};

function getMonday(dateStr: string): Date {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatTime(time?: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${h}:${m}`;
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function ShiftCalendar({ initialShifts, teamMembers, initialWeekOf }: ShiftCalendarProps) {
  const [weekOf, setWeekOf] = useState(initialWeekOf);
  const [shifts, setShifts] = useState<Shift[]>(initialShifts);
  const [isPending, startTransition] = useTransition();

  const monday = getMonday(weekOf);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  function navigateWeek(offset: number) {
    const newMonday = addDays(monday, offset * 7);
    const newWeekOf = toISODate(newMonday);
    setWeekOf(newWeekOf);
    startTransition(async () => {
      try {
        const result = await getShiftsForWeek(newWeekOf);
        setShifts(result);
      } catch {
        setShifts([]);
      }
    });
  }

  // Build a lookup: teamMemberId -> date -> Shift
  const shiftMap = new Map<string, Shift>();
  for (const s of shifts) {
    const key = `${s.teamMember.id}-${s.shiftDate}`;
    shiftMap.set(key, s);
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigateWeek(-1)}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-blue-700/30 px-3 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-800/30 hover:text-white disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev Week
        </button>
        <h3 className="text-lg font-semibold text-white">
          Week of {formatShortDate(monday)} — {formatShortDate(addDays(monday, 6))}
          {isPending && <span className="ml-2 text-sm text-blue-400">Loading...</span>}
        </h3>
        <button
          onClick={() => navigateWeek(1)}
          disabled={isPending}
          className="flex items-center gap-1 rounded-lg border border-blue-700/30 px-3 py-2 text-sm font-medium text-blue-200 transition-colors hover:bg-blue-800/30 hover:text-white disabled:opacity-50"
        >
          Next Week
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 backdrop-blur-sm">
        <div className="grid min-w-[800px]" style={{ gridTemplateColumns: "140px repeat(7, 1fr)" }}>
          {/* Header row */}
          <div className="border-b border-r border-blue-800/30 p-3" />
          {days.map((day, i) => {
            const isToday = toISODate(day) === toISODate(new Date());
            return (
              <div
                key={i}
                className={`border-b border-blue-800/30 p-3 text-center ${
                  i < 6 ? "border-r" : ""
                } ${isToday ? "bg-blue-600/10" : ""}`}
              >
                <p className={`text-xs font-medium uppercase tracking-wider ${
                  isToday ? "text-blue-300" : "text-blue-400/70"
                }`}>
                  {DAY_NAMES[i]}
                </p>
                <p className={`text-sm font-semibold ${
                  isToday ? "text-white" : "text-blue-200"
                }`}>
                  {formatShortDate(day)}
                </p>
              </div>
            );
          })}

          {/* Team member rows */}
          {teamMembers.map((member) => (
            <>
              {/* Name cell */}
              <div
                key={`name-${member.id}`}
                className="flex items-center gap-2 border-b border-r border-blue-800/30 p-3"
              >
                <div
                  className="h-3 w-3 shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-white">
                    {member.name.split(" ")[0]}
                  </p>
                  <p className="truncate text-xs text-blue-400/60">
                    {member.role}
                  </p>
                </div>
              </div>

              {/* Day cells */}
              {days.map((day, dayIdx) => {
                const dateStr = toISODate(day);
                const shift = shiftMap.get(`${member.id}-${dateStr}`);
                const isToday = dateStr === toISODate(new Date());
                const colors = shift ? SHIFT_COLORS[shift.shiftType] ?? SHIFT_COLORS.DAY : null;

                return (
                  <div
                    key={`${member.id}-${dayIdx}`}
                    className={`border-b border-blue-800/30 p-2 ${
                      dayIdx < 6 ? "border-r" : ""
                    } ${isToday ? "bg-blue-600/5" : ""}`}
                  >
                    {shift && colors && (
                      <div
                        className={`rounded-md border p-2 ${colors.bg} ${colors.border}`}
                        title={shift.notes ?? shift.title ?? ""}
                      >
                        <p className={`text-xs font-semibold ${colors.text}`}>
                          {shift.shiftType}
                        </p>
                        {shift.startTime && shift.endTime && (
                          <p className="mt-0.5 text-xs text-blue-300/60">
                            {formatTime(shift.startTime)}-{formatTime(shift.endTime)}
                          </p>
                        )}
                        {shift.title && (
                          <p className="mt-0.5 truncate text-xs text-blue-300/40">
                            {shift.title}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4">
        {Object.entries(SHIFT_COLORS).map(([type, colors]) => (
          <div key={type} className="flex items-center gap-2">
            <div className={`h-3 w-3 rounded-sm ${colors.bg} border ${colors.border}`} />
            <span className={`text-xs ${colors.text}`}>{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
