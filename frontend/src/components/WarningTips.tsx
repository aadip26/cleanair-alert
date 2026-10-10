import type { AirQualityPayload } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function WarningTips({ data }: { data: AirQualityPayload }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          Guidance
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
        <p
          data-testid="warning"
          className="text-sm leading-relaxed text-foreground/90"
        >
          {data.warning}
        </p>
        <ul
          data-testid="tips"
          className="mt-4 flex-1 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground"
        >
          {data.tips.map((tip) => (
            <li key={tip} className="flex gap-2">
              <span className="text-primary">·</span>
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
