"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BlobStorageChartProps {
  data: { container: string; count: number }[];
}

export function BlobStorageChart({ data }: BlobStorageChartProps) {
  return (
    <div className="rounded-xl border border-blue-700/30 bg-gradient-to-br from-blue-900/40 to-slate-900/40 p-6 backdrop-blur-sm">
      <h3 className="mb-4 text-sm font-medium text-blue-200">
        Blobs per Container
      </h3>
      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
            <XAxis
              dataKey="container"
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
            <Bar
              dataKey="count"
              fill="#3b82f6"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
