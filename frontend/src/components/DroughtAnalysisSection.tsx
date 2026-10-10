"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { fetchDroughtHistory } from "@/lib/api";
import type { DroughtHistoryPayload } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

const DroughtMapInner = dynamic(() => import("./DroughtMapInner"), { ssr: false });

const summaryConfig = {
  count: { label: "Locations", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function DroughtAnalysisSection() {
  const [data, setData] = useState<DroughtHistoryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);

  useEffect(() => {
    fetchDroughtHistory()
      .then((payload) => {
        setData(payload);
        setSelectedYear(payload.years[payload.years.length - 1] ?? null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  const year = selectedYear ?? data?.years[data.years.length - 1] ?? new Date().getFullYear();
  const minYear = data?.years[0] ?? year - 10;
  const maxYear = data?.years[data.years.length - 1] ?? year;

  const affectedPlaces = useMemo(() => {
    if (!data) return [];
    return data.places.filter(
      (p) => p.seasons.find((s) => s.year === year)?.affected,
    );
  }, [data, year]);

  const summaryChartData = useMemo(
    () =>
      data?.byYear.map((row) => ({
        year: String(row.year),
        count: row.affectedCount,
      })) ?? [],
    [data],
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Historical drought analysis unavailable</AlertTitle>
        <AlertDescription>{error ?? "No data"}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card data-testid="drought-section">
      <CardHeader>
        <CardTitle className="text-xl">Historical drought analysis</CardTitle>
        <CardDescription>
          {data.method} {data.disclaimer}
        </CardDescription>
        <p className="text-xs text-muted-foreground">
          Monsoon (Jun–Sep) view only — separate from the calendar-year rain timeline above.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Select year
              </FieldLabel>
              <Slider
                min={minYear}
                max={maxYear}
                value={[year]}
                onValueChange={(v) => {
                  const next = Array.isArray(v) ? v[0] : v;
                  if (typeof next === "number") setSelectedYear(next);
                }}
              />
              <input
                data-testid="drought-year-slider"
                type="range"
                min={minYear}
                max={maxYear}
                value={year}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="sr-only"
                aria-hidden
                tabIndex={-1}
              />
              <p className="font-[family-name:var(--font-display)] text-3xl tabular-nums">
                {year}
              </p>
            </Field>

            <div data-testid="drought-affected-list">
              <p className="text-sm font-medium text-foreground">
                Rain-deficit stress ({affectedPlaces.length} of {data.places.length}{" "}
                locations)
              </p>
              {affectedPlaces.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No locations met the monsoon deficit threshold this year.
                </p>
              ) : (
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {affectedPlaces.map((p) => {
                    const season = p.seasons.find((s) => s.year === year);
                    return (
                      <li key={p.slug}>
                        <span className="text-foreground">{p.name}</span>, {p.state} —{" "}
                        {season?.monsoonRainMm ?? "—"} mm monsoon
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div data-testid="drought-summary-chart" className="h-48 w-full">
              <p className="mb-2 text-xs font-medium text-muted-foreground">
                Affected locations by year
              </p>
              <ChartContainer config={summaryConfig} className="h-40 w-full aspect-auto">
                <BarChart data={summaryChartData} margin={{ left: 0, right: 8, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="year" tickLine={false} axisLine={false} tickMargin={8} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--color-count)" radius={4} />
                </BarChart>
              </ChartContainer>
            </div>
          </div>

          <div
            data-testid="drought-map"
            className="h-80 overflow-hidden rounded-xl ring-1 ring-border lg:min-h-[360px]"
          >
            <DroughtMapInner places={data.places} selectedYear={year} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
