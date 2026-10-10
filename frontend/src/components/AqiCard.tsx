import { CPCB_SCALE, categoryColor } from "@/lib/aqi";
import type { AirQualityPayload } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function pollutantLabel(unit: string) {
  if (!unit || unit === "NA") return "CPCB sub-index";
  return unit;
}

export function AqiCard({ data }: { data: AirQualityPayload }) {
  const { current } = data;
  const ringColor = categoryColor(current.category);

  return (
    <Card>
      <CardHeader className="gap-3">
        {current.source === "sample" && (
          <Badge
            data-testid="sample-banner"
            variant="outline"
            className="w-fit"
          >
            Sample data — not a live reading.
          </Badge>
        )}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div
              className="relative flex h-32 w-32 shrink-0 items-center justify-center rounded-full sm:h-36 sm:w-36"
              style={{
                boxShadow: `0 0 0 4px ${ringColor}, 0 0 40px ${ringColor}33`,
              }}
            >
              <span
                data-testid="aqi-value"
                className="font-[family-name:var(--font-display)] text-5xl font-semibold tabular-nums text-foreground sm:text-6xl"
              >
                {current.insufficient ? "—" : current.nationalAqi}
              </span>
            </div>
            <div>
              <p
                data-testid="aqi-label"
                className="text-xs font-semibold uppercase tracking-[0.2em] text-primary"
              >
                National AQI (CPCB)
              </p>
              <Badge
                className="mt-2 text-white"
                style={{ backgroundColor: ringColor }}
              >
                {current.category}
              </Badge>
              <p
                data-testid="station-name"
                className="mt-4 max-w-sm text-sm text-muted-foreground"
              >
                {current.station}
              </p>
              <p data-testid="last-update" className="mt-1 text-xs text-muted-foreground">
                Last update: {current.observedAt}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                PM2.5
              </p>
              <p data-testid="pm25" className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {current.pollutants.pm25.avg}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {pollutantLabel(current.pollutants.pm25.unit)}
                </span>
              </p>
            </div>
            <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                PM10
              </p>
              <p data-testid="pm10" className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
                {current.pollutants.pm10.avg}
                <span className="ml-1 text-xs font-normal text-muted-foreground">
                  {pollutantLabel(current.pollutants.pm10.unit)}
                </span>
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p
          data-testid="place-summary"
          className="border-l-2 border-primary pl-4 text-sm leading-relaxed text-foreground/90"
        >
          {data.placeSummary}
        </p>
        <div
          data-testid="aqi-scale"
          className="mt-6 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-3"
        >
          {CPCB_SCALE.map((row) => (
            <p key={row.label}>
              <span className="text-foreground/70">{row.range}</span> {row.label}
            </p>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        <CardDescription data-testid="disclaimer" className="text-[11px] leading-relaxed">
          {data.disclaimer} {data.outlook.disclaimer}
        </CardDescription>
      </CardFooter>
    </Card>
  );
}
