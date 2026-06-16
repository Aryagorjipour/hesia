"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import type { WeekLocalStats } from "@/types/report";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

const COLORS = ["var(--planned)", "var(--unplanned)"];

interface PlannedUnplannedChartProps {
  stats: WeekLocalStats;
}

export function PlannedUnplannedChart({ stats }: PlannedUnplannedChartProps) {
  const data = [
    { name: "Planned", value: stats.plannedCount },
    { name: "Flow wins", value: stats.unplannedCount },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <ChartWrapper title="Planned vs Flow">
        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
          No activity this week
        </div>
      </ChartWrapper>
    );
  }

  return (
    <ChartWrapper
      title="Planned vs Flow"
      description={`${stats.plannedPercent}% planned · ${100 - stats.plannedPercent}% flow`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: "12px",
              fontSize: "12px",
            }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: "12px", color: "var(--muted-foreground)" }}
          />
        </PieChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}