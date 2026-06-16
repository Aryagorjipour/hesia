"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import type { WeekLocalStats } from "@/types/report";
import { ChartWrapper } from "@/components/ui/chart-wrapper";

interface DailyActivityChartProps {
  stats: WeekLocalStats;
}

export function DailyActivityChart({ stats }: DailyActivityChartProps) {
  const data = stats.dailyActivity.map((d) => ({
    ...d,
    label: format(parseISO(d.date), "EEE"),
  }));

  return (
    <ChartWrapper title="Daily rhythm" description="Activity across the week">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
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
            formatter={(value, name, item) => {
              const label =
                name === "planned"
                  ? "Planned"
                  : name === "unplanned"
                    ? "Flow wins"
                    : "Carried forward";
              const count = item.payload?.carriedForward;
              if (name === "unplanned" && count > 0) {
                return [`${value} (+${count} carried)`, label];
              }
              return [value, label];
            }}
            labelFormatter={(_, payload) => {
              const date = payload?.[0]?.payload?.date;
              return date ? format(parseISO(date), "EEEE, MMM d") : "";
            }}
          />
          <Bar dataKey="planned" stackId="d" fill="var(--planned)" radius={[0, 0, 0, 0]} />
          <Bar dataKey="unplanned" stackId="d" fill="var(--unplanned)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}