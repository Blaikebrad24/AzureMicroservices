"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ReportStatusChartProps {
  data: { status: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  PROCESSING: "#3b82f6",
  COMPLETED: "#22c55e",
  FAILED: "#ef4444",
};

export function ReportStatusChart({ data }: ReportStatusChartProps) {
  return (
    <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-blue-200">
        Report Status Distribution
      </h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="status"
              cx="50%"
              cy="50%"
              outerRadius={80}
              strokeWidth={2}
              stroke="#0f172a"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.status}
                  fill={STATUS_COLORS[entry.status] ?? "#60a5fa"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e3a8a",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Legend
              wrapperStyle={{ color: "#93c5fd", fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
