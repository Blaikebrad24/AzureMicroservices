"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface DataActivityChartProps {
  totalRecords: number;
}

// Generate mock time-series data based on total record count
function generateActivityData(total: number) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const base = Math.max(1, Math.floor(total / 7));
  return days.map((day) => ({
    day,
    records: base + Math.floor(Math.random() * base * 0.5),
  }));
}

export function DataActivityChart({ totalRecords }: DataActivityChartProps) {
  const data = generateActivityData(totalRecords);

  return (
    <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
      <h3 className="mb-1 text-sm font-medium text-blue-200">
        Data Activity
      </h3>
      <p className="mb-4 text-xs text-blue-400">
        Simulated weekly distribution
      </p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorRecords" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis
              dataKey="day"
              tick={{ fill: "#93c5fd", fontSize: 12 }}
              axisLine={{ stroke: "#1e3a5f" }}
            />
            <YAxis
              tick={{ fill: "#93c5fd", fontSize: 12 }}
              axisLine={{ stroke: "#1e3a5f" }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1e3a8a",
                border: "1px solid #3b82f6",
                borderRadius: "8px",
                color: "#fff",
              }}
            />
            <Area
              type="monotone"
              dataKey="records"
              stroke="#3b82f6"
              fill="url(#colorRecords)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
