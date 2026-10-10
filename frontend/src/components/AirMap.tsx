"use client";

import dynamic from "next/dynamic";
import type { AirQualityPayload } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const MapInner = dynamic(() => import("./AirMapInner"), { ssr: false });

export function AirMap({ data }: { data: AirQualityPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Air stations</CardTitle>
        <CardDescription>
          CPCB stations near {data.name}. One dot is not the whole city.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div
          data-testid="city-map"
          className="h-72 overflow-hidden rounded-xl ring-1 ring-border"
        >
          <MapInner
            center={[data.latitude, data.longitude]}
            stations={data.current.stations}
          />
        </div>
      </CardContent>
    </Card>
  );
}
