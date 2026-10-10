import {
  computeDryness,
  computeTrendDirection,
  type DrynessLabel,
} from "./aqi.js";
import type { PlaceSeed } from "../data/places.js";

const PUBLIC_AIR = "https://air-quality-api.open-meteo.com/v1/air-quality";
const PUBLIC_ARCHIVE = "https://archive-api.open-meteo.com/v1/archive";
const FETCH_TIMEOUT_MS = 20_000;

function endpoints() {
  const base = process.env.OPEN_METEO_BASE_URL?.replace(/\/$/, "");
  if (!base) {
    return { air: PUBLIC_AIR, archive: PUBLIC_ARCHIVE, preferLocal: false };
  }
  return {
    air: `${base}/v1/air-quality`,
    archive: `${base}/v1/archive`,
    preferLocal: true,
  };
}

async function fetchJson(url: URL): Promise<unknown> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJsonWithFallback(
  path: "air" | "archive",
  build: (base: string) => URL,
): Promise<unknown> {
  const { air, archive, preferLocal } = endpoints();
  const primary = path === "air" ? air : archive;
  const fallback = path === "air" ? PUBLIC_AIR : PUBLIC_ARCHIVE;

  if (preferLocal && primary !== fallback) {
    try {
      return await fetchJson(build(primary));
    } catch {
      return await fetchJson(build(fallback));
    }
  }
  return await fetchJson(build(primary));
}

export async function fetchOutlook(lat: number, lon: number) {
  const data = (await fetchJsonWithFallback("air", (base) => {
    const url = new URL(base);
    url.searchParams.set("latitude", String(lat));
    url.searchParams.set("longitude", String(lon));
    url.searchParams.set("hourly", "pm2_5");
    url.searchParams.set("forecast_days", "2");
    url.searchParams.set("timezone", "auto");
    return url;
  })) as { hourly?: { time?: string[]; pm2_5?: number[] } };

  const times = data.hourly?.time ?? [];
  const pm = data.hourly?.pm2_5 ?? [];
  return times.slice(0, 24).map((time, i) => ({
    time,
    pm25: pm[i] ?? 0,
  }));
}

export function normalizeOutlookResponse(data: {
  hourly?: { time?: string[]; pm2_5?: number[] };
}) {
  const times = data.hourly?.time ?? [];
  const pm = data.hourly?.pm2_5 ?? [];
  return times.slice(0, 24).map((time, i) => ({
    time,
    pm25: pm[i] ?? 0,
  }));
}

export async function fetchAirHistory(lat: number, lon: number) {
  const now = new Date();
  const month = now.getMonth();
  const monthName = now.toLocaleString("en-IN", { month: "long" });
  const years: number[] = [];
  const currentYear = now.getFullYear();
  for (let y = 2023; y <= currentYear; y++) {
    if (y === currentYear && month === 0) continue;
    years.push(y);
  }

  const yearAvgs: { year: number; pm25: number }[] = [];
  for (const year of years) {
    const start = new Date(Date.UTC(year, month, 1));
    const end = new Date(Date.UTC(year, month + 1, 0));
    try {
      const data = (await fetchJsonWithFallback("air", (base) => {
        const url = new URL(base);
        url.searchParams.set("latitude", String(lat));
        url.searchParams.set("longitude", String(lon));
        url.searchParams.set("hourly", "pm2_5");
        url.searchParams.set("start_date", start.toISOString().slice(0, 10));
        url.searchParams.set("end_date", end.toISOString().slice(0, 10));
        url.searchParams.set("timezone", "auto");
        return url;
      })) as { hourly?: { pm2_5?: number[] } };
      const values = (data.hourly?.pm2_5 ?? []).filter((v) => v != null);
      if (values.length === 0) continue;
      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      yearAvgs.push({ year, pm25: Math.round(avg * 10) / 10 });
    } catch {
      continue;
    }
  }

  const { direction, changePercent } = computeTrendDirection(yearAvgs);
  return {
    month: monthName,
    years: yearAvgs,
    direction,
    changePercent,
  };
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** June–September (UTC month index 5–8). */
export function isMonsoonMonth(utcMonth: number): boolean {
  return utcMonth >= 5 && utcMonth <= 8;
}

type YearBucket = {
  rain: number;
  monsoonRain: number;
  soilM: number[];
  soilT: number[];
  days: number;
};

function dayOfYearUtc(d: Date) {
  const startY = new Date(Date.UTC(d.getUTCFullYear(), 0, 0));
  return Math.floor((d.getTime() - startY.getTime()) / 86400000);
}

export function buildClimateAggregates(
  times: string[],
  precip: number[],
  soilMoist: (number | null | undefined)[],
  soilTemp: (number | null | undefined)[],
  today: Date,
) {
  const currentYear = today.getFullYear();
  const todayDoy = dayOfYearUtc(today);

  const byYear = new Map<number, YearBucket>();

  for (let i = 0; i < times.length; i++) {
    const d = new Date(times[i]);
    const y = d.getUTCFullYear();
    const doy = dayOfYearUtc(d);
    if (y === currentYear && doy > todayDoy) continue;
    if (!byYear.has(y)) {
      byYear.set(y, { rain: 0, monsoonRain: 0, soilM: [], soilT: [], days: 0 });
    }
    const bucket = byYear.get(y)!;
    const p = precip[i] ?? 0;
    bucket.rain += p;
    if (isMonsoonMonth(d.getUTCMonth())) {
      bucket.monsoonRain += p;
    }
    if (soilMoist[i] != null) bucket.soilM.push(soilMoist[i]!);
    if (soilTemp[i] != null) bucket.soilT.push(soilTemp[i]!);
    bucket.days += 1;
  }

  const climateYears = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, bucket]) => ({
      year,
      rainMm: Math.round(bucket.rain * 10) / 10,
      monsoonRainMm: Math.round(bucket.monsoonRain * 10) / 10,
      soilMoisture:
        bucket.soilM.length > 0
          ? Math.round(
              (bucket.soilM.reduce((a, b) => a + b, 0) / bucket.soilM.length) *
                1000,
            ) / 1000
          : null,
      soilTemperatureC:
        bucket.soilT.length > 0
          ? Math.round(
              (bucket.soilT.reduce((a, b) => a + b, 0) / bucket.soilT.length) *
                10,
            ) / 10
          : null,
      dateWindow: `1 Jan – ${today.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${year}`,
    }));

  const monsoonSeries = climateYears.map((y) => ({
    year: y.year,
    monsoonRainMm: y.monsoonRainMm,
  }));

  return { climateYears, monsoonSeries };
}

async function fetchClimateArchiveDaily(place: PlaceSeed) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const startYear = currentYear - 10;
  const start = new Date(Date.UTC(startYear, 0, 1));

  const data = (await fetchJsonWithFallback("archive", (base) => {
    const url = new URL(base);
    url.searchParams.set("latitude", String(place.latitude));
    url.searchParams.set("longitude", String(place.longitude));
    url.searchParams.set("start_date", ymd(start));
    url.searchParams.set("end_date", ymd(today));
    url.searchParams.append("daily", "precipitation_sum");
    url.searchParams.append("daily", "soil_moisture_0_to_7cm_mean");
    url.searchParams.append("daily", "soil_temperature_0_to_7cm_mean");
    url.searchParams.set("timezone", "auto");
    return url;
  })) as {
    daily?: {
      time?: string[];
      precipitation_sum?: number[];
      soil_moisture_0_to_7cm_mean?: number[];
      soil_temperature_0_to_7cm_mean?: number[];
    };
  };

  return buildClimateAggregates(
    data.daily?.time ?? [],
    data.daily?.precipitation_sum ?? [],
    data.daily?.soil_moisture_0_to_7cm_mean ?? [],
    data.daily?.soil_temperature_0_to_7cm_mean ?? [],
    today,
  );
}

export async function fetchClimateArchive(place: PlaceSeed) {
  const { climateYears } = await fetchClimateArchiveDaily(place);
  const rainTotals = climateYears.map((y) => ({ year: y.year, rainMm: y.rainMm }));
  return climateYears.map((entry) => {
    const { monsoonRainMm: _m, ...rest } = entry;
    return {
      ...rest,
      dryness: computeDryness(rainTotals, entry.year) as DrynessLabel,
      comparePercent: null as number | null,
    };
  });
}

export async function fetchMonsoonArchive(place: PlaceSeed) {
  const { monsoonSeries } = await fetchClimateArchiveDaily(place);
  const totals = monsoonSeries.map((y) => ({
    year: y.year,
    rainMm: y.monsoonRainMm,
  }));
  return monsoonSeries.map((entry) => {
    const dryness = computeDryness(totals, entry.year) as DrynessLabel;
    return {
      year: entry.year,
      monsoonRainMm: entry.monsoonRainMm,
      dryness,
      affected: dryness === "Drier than usual",
    };
  });
}
