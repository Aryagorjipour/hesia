"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import type { WeekLocalStats } from "@/types/report";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

interface CategoryChartProps {
  stats: WeekLocalStats;
}

export function CategoryChart({ stats }: CategoryChartProps) {
  const data = Object.entries(stats.byCategory)
    .map(([name, v]) => ({
      name: name.length > 12 ? `${name.slice(0, 12)}…` : name,
      fullName: name,
      planned: v.planned,
      unplanned: v.unplanned,
    }))
    .sort((a, b) => b.planned + b.unplanned - (a.planned + a.unplanned))
    .slice(0, 8);

  if (data.length === 0) {
    return (
      <ChartWrapper title="By category">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No categories yet
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper title="By category" description="Planned vs flow by grouping">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ left: 4, right: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={64}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
            formatter={(value, name) => [value, name === "planned" ? "Planned" : "Flow"]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.fullName ?? ""
            }
          />
          <Legend
            wrapperStyle={{ fontSize: "11px" }}
            formatter={(v) => (v === "planned" ? "Planned" : "Flow")}
          />
          <Bar dataKey="planned" stackId="a" fill="var(--planned)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="unplanned" stackId="a" fill="var(--unplanned)" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}