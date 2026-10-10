"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { ChatChart } from "@/lib/types";

const defaultConfig = {
  value: {
    label: "Value",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

export function AssistantLineChart({
  chart,
  testId,
  className,
  heightClass = "h-48",
}: {
  chart: Pick<ChatChart, "title" | "unit" | "points">;
  testId?: string;
  className?: string;
  heightClass?: string;
}) {
  const data = chart.points.map((p) => ({
    label: p.label,
    value: p.value,
  }));

  const config: ChartConfig = {
    value: {
      label: chart.unit,
      color: "var(--chart-1)",
    },
  };

  return (
    <div data-testid={testId} className={className}>
      <p className="mb-2 text-xs font-medium text-muted-foreground">{chart.title}</p>
      <ChartContainer config={config} className={`${heightClass} w-full aspect-auto`}>
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            unit={` ${chart.unit}`}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}

export function OutlookLineChart({
  data,
  testId,
}: {
  data: { label: string; value: number }[];
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="h-64 w-full">
      <ChartContainer config={defaultConfig} className="h-full w-full aspect-auto">
        <LineChart data={data} margin={{ left: 4, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            width={48}
            unit=" µg/m³"
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Line
            type="monotone"
            dataKey="value"
            stroke="var(--color-value)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
