import type { AirQualityPayload } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function TrendPanel({ data }: { data: AirQualityPayload }) {
  const { history } = data;
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-xl">Same-month air history</CardTitle>
        <CardDescription data-testid="trend-note">{history.disclaimer}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p className="text-sm text-muted-foreground">
          Month: <span className="text-foreground">{history.month}</span>
        </p>
        <ul data-testid="trend-years" className="mt-4 space-y-2">
          {history.years.map((y) => (
            <li
              key={y.year}
              className="flex justify-between border-b border-border py-2 text-sm"
            >
              <span className="text-muted-foreground">{y.year}</span>
              <span className="font-[family-name:var(--font-display)] tabular-nums text-foreground">
                {y.pm25} <span className="text-xs">µg/m³</span>
              </span>
            </li>
          ))}
        </ul>
        <p
          data-testid="trend-direction"
          className="mt-auto pt-6 font-[family-name:var(--font-display)] text-2xl text-primary"
        >
          {history.direction ?? "Not enough model history"}
        </p>
      </CardContent>
    </Card>
  );
}
