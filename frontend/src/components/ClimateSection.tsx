"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { AirQualityPayload } from "@/lib/types";
import { drynessColor } from "@/lib/aqi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";

const ClimateMapInner = dynamic(() => import("./ClimateMapInner"), {
  ssr: false,
});

export function ClimateSection({
  data,
  selectedSlug,
}: {
  data: AirQualityPayload;
  selectedSlug: string;
}) {
  const places = data.climate.places;
  const years = useMemo(() => {
    const set = new Set<number>();
    places.forEach((p) => p.years.forEach((y) => set.add(y.year)));
    return [...set].sort((a, b) => a - b);
  }, [places]);

  const minYear = years[0] ?? 2010;
  const maxYear = years[years.length - 1] ?? new Date().getFullYear();

  const [selectedYear, setSelectedYear] = useState(maxYear);
  const [compareYear, setCompareYear] = useState(2025);

  const selectedPlace =
    places.find((p) => p.slug === selectedSlug) ?? places[0];
  const yearEntry = selectedPlace?.years.find((y) => y.year === selectedYear);
  const compareEntry = selectedPlace?.years.find((y) => y.year === compareYear);
  const currentYearEntry = selectedPlace?.years.find(
    (y) => y.year === new Date().getFullYear(),
  );

  let comparePercent: number | null = null;
  if (currentYearEntry && compareEntry && compareEntry.rainMm !== 0) {
    comparePercent =
      Math.round(
        ((currentYearEntry.rainMm - compareEntry.rainMm) / compareEntry.rainMm) *
          1000,
      ) / 10;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Rain & soil timeline</CardTitle>
        <CardDescription>{data.climate.disclaimer}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-4">
            <Field>
              <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                Scrub through years
              </FieldLabel>
              <Slider
                min={minYear}
                max={maxYear}
                value={[selectedYear]}
                onValueChange={(v) => {
                  const next = Array.isArray(v) ? v[0] : v;
                  if (typeof next === "number") setSelectedYear(next);
                }}
              />
              <input
                data-testid="year-slider"
                type="range"
                min={minYear}
                max={maxYear}
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="sr-only"
                aria-hidden
                tabIndex={-1}
              />
              <p className="font-[family-name:var(--font-display)] text-3xl tabular-nums text-foreground">
                {selectedYear}
              </p>
            </Field>

            <p data-testid="rain-total" className="text-sm text-muted-foreground">
              Rain total{" "}
              <span className="font-[family-name:var(--font-display)] text-2xl text-foreground">
                {yearEntry?.rainMm ?? "—"} mm
              </span>
            </p>
            <p
              data-testid="dryness-label"
              className="font-[family-name:var(--font-display)] text-xl"
              style={{ color: drynessColor(yearEntry?.dryness ?? "Near usual") }}
            >
              {yearEntry?.dryness ?? "Near usual"}
            </p>

            <div className="space-y-2 text-sm">
              <p data-testid="soil-moisture" className="text-muted-foreground">
                Soil moisture{" "}
                <span className="text-foreground">
                  {yearEntry?.soilMoisture ?? "—"} m³/m³
                </span>
              </p>
              <p data-testid="soil-temperature" className="text-muted-foreground">
                Soil temperature{" "}
                <span className="text-foreground">
                  {yearEntry?.soilTemperatureC ?? "—"} °C
                </span>
              </p>
            </div>

            <Field>
              <FieldLabel>Compare rain with</FieldLabel>
              <Select
                value={String(compareYear)}
                onValueChange={(v) => {
                  if (v) setCompareYear(Number(v));
                }}
              >
                <SelectTrigger data-testid="compare-year" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            {compareEntry && currentYearEntry && (
              <p className="text-xs text-muted-foreground">
                {currentYearEntry.dateWindow}: {currentYearEntry.rainMm} mm vs{" "}
                {compareYear}: {compareEntry.rainMm} mm
                {comparePercent != null &&
                  ` (${comparePercent > 0 ? "+" : ""}${comparePercent}%)`}
              </p>
            )}
          </div>

          <div
            data-testid="climate-map"
            className="h-80 overflow-hidden rounded-xl ring-1 ring-border lg:h-full lg:min-h-[320px]"
          >
            <ClimateMapInner places={places} selectedYear={selectedYear} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
