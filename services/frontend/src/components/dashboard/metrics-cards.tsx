"use client";

import { HardDrive, FolderOpen, FileText, Database, MessageSquare, CalendarDays } from "lucide-react";

interface MetricsCardsProps {
  blobCount: number;
  containerCount: number;
  reportCount: number;
  dataRecordCount: number;
  messageCount: number;
  shiftCount: number;
}

const metrics = [
  {
    key: "blobs" as const,
    label: "Total Blobs",
    icon: HardDrive,
    gradient: "from-blue-500 to-cyan-500",
    bgGlow: "shadow-blue-500/10",
  },
  {
    key: "containers" as const,
    label: "Containers",
    icon: FolderOpen,
    gradient: "from-blue-600 to-blue-400",
    bgGlow: "shadow-blue-500/10",
  },
  {
    key: "reports" as const,
    label: "Reports",
    icon: FileText,
    gradient: "from-blue-500 to-indigo-500",
    bgGlow: "shadow-indigo-500/10",
  },
  {
    key: "records" as const,
    label: "Data Records",
    icon: Database,
    gradient: "from-indigo-500 to-blue-500",
    bgGlow: "shadow-indigo-500/10",
  },
  {
    key: "messages" as const,
    label: "Messages",
    icon: MessageSquare,
    gradient: "from-cyan-500 to-blue-500",
    bgGlow: "shadow-cyan-500/10",
  },
  {
    key: "shifts" as const,
    label: "Shifts This Week",
    icon: CalendarDays,
    gradient: "from-purple-500 to-indigo-500",
    bgGlow: "shadow-purple-500/10",
  },
];

export function MetricsCards({
  blobCount,
  containerCount,
  reportCount,
  dataRecordCount,
  messageCount,
  shiftCount,
}: MetricsCardsProps) {
  const values: Record<string, number> = {
    blobs: blobCount,
    containers: containerCount,
    reports: reportCount,
    records: dataRecordCount,
    messages: messageCount,
    shifts: shiftCount,
  };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {metrics.map((metric) => {
        const Icon = metric.icon;
        return (
          <div
            key={metric.key}
            className={`rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm shadow-lg ${metric.bgGlow}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-200">
                  {metric.label}
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {values[metric.key].toLocaleString()}
                </p>
              </div>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${metric.gradient} shadow-lg`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
