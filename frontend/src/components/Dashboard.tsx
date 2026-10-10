"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchAirQuality, fetchCities } from "@/lib/api";
import type { AirQualityPayload, CityListItem } from "@/lib/types";
import { AqiCard } from "./AqiCard";
import { WarningTips } from "./WarningTips";
import { ForecastChart } from "./ForecastChart";
import { AirMap } from "./AirMap";
import { TrendPanel } from "./TrendPanel";
import { ClimateSection } from "./ClimateSection";
import { DroughtAnalysisSection } from "./DroughtAnalysisSection";
import { AssistantSheet } from "./AssistantSheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { SparklesIcon } from "lucide-react";

export function Dashboard() {
  const [cities, setCities] = useState<CityListItem[]>([]);
  const [slug, setSlug] = useState("delhi");
  const [data, setData] = useState<AirQualityPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiConnected, setApiConnected] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const load = useCallback(async (citySlug: string) => {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchAirQuality(citySlug);
      setData(payload);
      setApiConnected(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCities()
      .then((list) => {
        setCities(list);
        setApiConnected(true);
      })
      .catch(() => setApiConnected(false));
  }, []);

  useEffect(() => {
    load(slug);
  }, [slug, load]);

  const isSample = data?.current.source === "sample";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-2xl tracking-tight text-foreground">
              CleanAir Alert
            </h1>
            <p className="text-xs text-muted-foreground">
              CPCB · model outlook · rain context
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data && (
              <Badge variant={isSample ? "outline" : "secondary"}>
                {isSample ? "Sample mode" : "Live data"}
              </Badge>
            )}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                City
              </span>
              <Select
                value={slug}
                onValueChange={(value) => {
                  if (value) setSlug(value);
                }}
              >
                <SelectTrigger
                  data-testid="city-select"
                  className="min-w-[180px] sm:min-w-[200px]"
                >
                  <SelectValue placeholder="Select city" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.slug} value={c.slug}>
                      {c.name}
                    </SelectItem>
                  ))}
                  {!cities.length && (
                    <SelectItem value="delhi">Delhi</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="rounded-full"
              data-testid="assistant-open"
              onClick={() => setAssistantOpen(true)}
              aria-label="Open assistant"
            >
              <SparklesIcon data-icon="only" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        {loading && (
          <div className="flex flex-col gap-2" aria-live="polite">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-32 w-full" />
          </div>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Could not load data</AlertTitle>
            <AlertDescription>
              <p data-testid="error">{error}</p>
              <Button
                data-testid="retry"
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => load(slug)}
              >
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        {data && !error && (
          <>
            <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <AqiCard data={data} />
              <WarningTips data={data} />
            </div>
            <ForecastChart data={data} />
            <div className="grid gap-6 lg:grid-cols-2">
              <AirMap data={data} />
              <TrendPanel data={data} />
            </div>
            <ClimateSection data={data} selectedSlug={slug} />
            <DroughtAnalysisSection />
          </>
        )}
      </main>

      <AssistantSheet
        open={assistantOpen}
        onOpenChange={setAssistantOpen}
        citySlug={slug}
        apiConnected={apiConnected}
      />
    </div>
  );
}
