import { PLACES, getPlace, type PlaceSeed } from "./places.js";
import {
  categoryFromAqi,
  computeDryness,
  computeTrendDirection,
  tipsForCategory,
  warningForCategory,
} from "../services/aqi.js";

const OUTLOOK_DISCLAIMER =
  "Hourly PM2.5 outlook from the Open-Meteo air-quality model. This is not a CPCB or SAFAR government forecast.";
const HISTORY_DISCLAIMER =
  "Same-month PM2.5 averages from the Open-Meteo model archive (available from August 2022). This is not an official CPCB trend.";
const CLIMATE_DISCLAIMER =
  "Rain and soil values from Open-Meteo reanalysis (ERA5). This is not an IMD or state drought declaration.";
const CURRENT_DISCLAIMER =
  "Current National AQI comes from CPCB station data via data.gov.in when live mode is enabled.";

function baseAqi(slug: string): number {
  const map: Record<string, number> = {
    delhi: 312,
    gurugram: 285,
    noida: 268,
    mumbai: 142,
    bengaluru: 98,
    kolkata: 178,
    chennai: 112,
    hyderabad: 124,
    jaipur: 205,
    chandigarh: 156,
    pune: 88,
    nagpur: 132,
    nashik: 118,
    "chhatrapati-sambhajinagar": 126,
    kolhapur: 102,
  };
  return map[slug] ?? 150;
}

function historyYearsForSlug(slug: string) {
  if (slug === "delhi") {
    return [
      { year: 2023, pm25: 78 },
      { year: 2024, pm25: 71 },
      { year: 2025, pm25: 65 },
    ];
  }
  if (slug === "mumbai") {
    return [
      { year: 2023, pm25: 42 },
      { year: 2024, pm25: 48 },
      { year: 2025, pm25: 55 },
    ];
  }
  return [
    { year: 2023, pm25: 55 },
    { year: 2024, pm25: 52 },
    { year: 2025, pm25: 50 },
  ];
}

function buildOutlookHourly(base: number) {
  const now = new Date();
  return Array.from({ length: 24 }, (_, i) => {
    const t = new Date(now.getTime() + i * 60 * 60 * 1000);
    return {
      time: t.toISOString(),
      pm25: Math.round((base + Math.sin(i / 3) * 8 + i * 0.5) * 10) / 10,
    };
  });
}

function rainSeriesForPlace(slug: string) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const years: number[] = [];
  for (let y = startYear; y <= currentYear; y++) years.push(y);

  const baseRain =
    slug === "pune" ? 520 : slug === "mumbai" ? 2100 : slug === "nagpur" ? 980 : 750;

  return years.map((year, idx) => {
    let rain = baseRain + idx * 12;
    if (slug === "pune" && year === currentYear) rain = baseRain * 0.72;
    if (slug === "mumbai" && year === currentYear) rain = baseRain * 1.18;
    return {
      year,
      rainMm: Math.round(rain),
      soilMoisture: 0.22 + (idx % 5) * 0.02,
      soilTemperatureC: 26 + (idx % 4),
      dateWindow: `1 Jan – ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ${year}`,
    };
  });
}

function monsoonSeriesForPlace(slug: string) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const baseMonsoon =
    slug === "mumbai"
      ? 1800
      : slug === "pune"
        ? 420
        : slug === "jaipur"
          ? 280
          : slug === "nagpur"
            ? 720
            : 320;

  const years: { year: number; monsoonRainMm: number }[] = [];
  for (let y = startYear; y <= currentYear; y++) {
    let monsoon = baseMonsoon + (y - startYear) * 8;
    if (slug === "pune" && y === currentYear - 4) monsoon = baseMonsoon * 0.55;
    if (slug === "jaipur" && y === currentYear - 6) monsoon = baseMonsoon * 0.5;
    if (slug === "nagpur" && y === currentYear - 2) monsoon = baseMonsoon * 0.58;
    years.push({ year: y, monsoonRainMm: Math.round(monsoon) });
  }
  return years;
}

export function buildSampleMonsoonSeasons() {
  return PLACES.map((place) => {
    const series = monsoonSeriesForPlace(place.slug);
    const totals = series.map((s) => ({ year: s.year, rainMm: s.monsoonRainMm }));
    return {
      slug: place.slug,
      name: place.name,
      state: place.state,
      latitude: place.latitude,
      longitude: place.longitude,
      seasons: series.map((entry) => {
        const dryness = computeDryness(totals, entry.year);
        return {
          year: entry.year,
          monsoonRainMm: entry.monsoonRainMm,
          dryness,
          affected: dryness === "Drier than usual",
        };
      }),
    };
  });
}

export function buildSampleClimatePlaces(selectedYear?: number) {
  const year = selectedYear ?? new Date().getFullYear();
  return PLACES.map((place) => {
    const series = rainSeriesForPlace(place.slug);
    const rainTotals = series.map((s) => ({ year: s.year, rainMm: s.rainMm }));
    return {
      slug: place.slug,
      name: place.name,
      state: place.state,
      latitude: place.latitude,
      longitude: place.longitude,
      years: series.map((entry) => ({
        ...entry,
        dryness: computeDryness(rainTotals, entry.year),
        comparePercent: null as number | null,
      })),
    };
  });
}

export function buildSampleAirQuality(slug: string) {
  const place = getPlace(slug);
  if (!place) return null;

  const aqi = baseAqi(slug);
  const category = categoryFromAqi(aqi);
  const historyYears = historyYearsForSlug(slug);
  const { direction, changePercent } = computeTrendDirection(historyYears);
  const month = new Date().toLocaleString("en-IN", { month: "long" });

  const stationName = `${place.name} - CPCB (sample)`;
  const observedAt = new Date().toISOString();

  const stations = [
    {
      name: stationName,
      latitude: place.latitude + 0.02,
      longitude: place.longitude - 0.01,
      nationalAqi: aqi,
      category,
      lastUpdate: observedAt,
    },
    {
      name: `${place.name} Station B (sample)`,
      latitude: place.latitude - 0.015,
      longitude: place.longitude + 0.012,
      nationalAqi: Math.max(50, aqi - 40),
      category: categoryFromAqi(Math.max(50, aqi - 40)),
      lastUpdate: observedAt,
    },
  ];

  const placeSummary = `${place.name}: National AQI is ${aqi} (${category}) from CPCB station data (sample). Same-month model history is ${direction ?? "unavailable"}. Rain uses Open-Meteo reanalysis, not an IMD drought declaration.`;

  return {
    slug: place.slug,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    current: {
      source: "sample" as "sample" | "cpcb",
      station: stationName,
      observedAt,
      nationalAqi: aqi,
      category,
      prominentPollutant: "PM2.5",
      pollutants: {
        pm25: { avg: Math.round(aqi * 0.35), unit: "NA" },
        pm10: { avg: Math.round(aqi * 0.42), unit: "NA" },
      },
      stations,
      insufficient: false,
    },
    outlook: {
      source: "sample" as "sample" | "open-meteo",
      hourly: buildOutlookHourly(aqi * 0.3),
      disclaimer: OUTLOOK_DISCLAIMER,
    },
    history: {
      source: "sample" as "sample" | "open-meteo",
      month,
      years: historyYears,
      direction,
      changePercent,
      disclaimer: HISTORY_DISCLAIMER,
    },
    climate: {
      source: "sample" as "sample" | "open-meteo-archive",
      places: buildSampleClimatePlaces(),
      disclaimer: CLIMATE_DISCLAIMER,
    },
    placeSummary,
    warning: warningForCategory(category),
    tips: tipsForCategory(category),
    disclaimer: CURRENT_DISCLAIMER,
  };
}

export function listCities() {
  return PLACES.map((p) => ({ slug: p.slug, name: p.name, state: p.state }));
}

export { PLACES, type PlaceSeed };
