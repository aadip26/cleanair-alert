"use client";

import type { AirQualityPayload } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OutlookLineChart } from "./AssistantLineChart";

export function ForecastChart({ data }: { data: AirQualityPayload }) {
  const chartData = data.outlook.hourly.map((h) => ({
    label: new Date(h.time).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    value: h.pm25,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle data-testid="outlook-label" className="text-xl">
          Model outlook
        </CardTitle>
        <CardDescription>{data.outlook.disclaimer}</CardDescription>
      </CardHeader>
      <CardContent>
        <OutlookLineChart data={chartData} testId="forecast-chart" />
      </CardContent>
    </Card>
  );
}
