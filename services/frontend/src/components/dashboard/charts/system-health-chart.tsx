"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Mock uptime-style data for the three backend services
const healthData = [
  { time: "00:00", blob: 98, reports: 97, data: 99 },
  { time: "04:00", blob: 99, reports: 98, data: 99 },
  { time: "08:00", blob: 97, reports: 99, data: 98 },
  { time: "12:00", blob: 99, reports: 99, data: 99 },
  { time: "16:00", blob: 98, reports: 97, data: 99 },
  { time: "20:00", blob: 99, reports: 98, data: 98 },
  { time: "Now", blob: 99, reports: 99, data: 99 },
];

export function SystemHealthChart() {
  return (
    <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
      <h3 className="mb-1 text-sm font-medium text-blue-200">
        Service Health
      </h3>
      <p className="mb-4 text-xs text-blue-400">
        Simulated uptime percentage
      </p>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={healthData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis
              dataKey="time"
              tick={{ fill: "#93c5fd", fontSize: 12 }}
              axisLine={{ stroke: "#1e3a5f" }}
            />
            <YAxis
              domain={[90, 100]}
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
            <Legend
              wrapperStyle={{ color: "#93c5fd", fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="blob"
              name="Blob Service"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="reports"
              name="Reports Service"
              stroke="#06b6d4"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="data"
              name="Data Service"
              stroke="#93c5fd"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
