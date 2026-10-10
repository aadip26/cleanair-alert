import type { getAirQuality } from "./air-quality.js";

export interface ChatChartPoint {
  label: string;
  value: number;
}

export interface ChatChart {
  title: string;
  unit: string;
  points: ChatChartPoint[];
}

type AirContext = NonNullable<Awaited<ReturnType<typeof getAirQuality>>>;

type ClimatePlace = {
  slug: string;
  name: string;
  years: { year: number; rainMm: number }[];
};

function climatePlace(context: AirContext, citySlug: string): ClimatePlace | null {
  const places = context.climate.places as ClimatePlace[];
  return places.find((p) => p.slug === citySlug) ?? places[0] ?? null;
}

function wantsAirHistory(q: string): boolean {
  if (q.includes("air history")) return true;
  if (q.includes("10 years") && (q.includes("air") || q.includes("quality"))) return true;
  if (q.includes("pm2.5") && (q.includes("year") || q.includes("over"))) return true;
  if (
    q.includes("air quality") &&
    (q.includes("changed") || q.includes("over") || q.includes("last"))
  ) {
    return true;
  }
  return false;
}

function wantsRain(q: string): boolean {
  if (q.includes("rain")) return true;
  if (q.includes("soil")) return true;
  if (q.includes("last 10 years") && !q.includes("air")) return true;
  if (/\bcompared (with|to)\b/.test(q) && /\b20\d{2}\b/.test(q)) return true;
  return false;
}

function wantsOutlook(q: string): boolean {
  return (
    q.includes("outlook") ||
    q.includes("next 24") ||
    q.includes("forecast") ||
    q.includes("later today") ||
    (q.includes("hour") && (q.includes("pm") || q.includes("air")))
  );
}

export function pickChatChart(
  question: string,
  context: AirContext,
  citySlug: string,
): ChatChart | null {
  const q = question.toLowerCase().trim();

  if (wantsAirHistory(q)) {
    if (!context.history.years.length) return null;
    return {
      title: `Same-month PM2.5 — ${context.name}`,
      unit: "µg/m³",
      points: context.history.years.map((y) => ({
        label: String(y.year),
        value: y.pm25,
      })),
    };
  }

  if (wantsRain(q)) {
    const place = climatePlace(context, citySlug);
    if (!place?.years?.length) return null;
    return {
      title: `Yearly rain — ${place.name}`,
      unit: "mm",
      points: place.years.map((y) => ({
        label: String(y.year),
        value: y.rainMm,
      })),
    };
  }

  if (wantsOutlook(q)) {
    if (!context.outlook.hourly.length) return null;
    return {
      title: "Model outlook PM2.5",
      unit: "µg/m³",
      points: context.outlook.hourly.map((h) => ({
        label: new Date(h.time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: h.pm25,
      })),
    };
  }

  return null;
}
