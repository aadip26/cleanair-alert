import type { CpcbCategory, TrendDirection, DrynessLabel } from "./services/aqi.js";

export interface AirQualityResponse {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  current: {
    source: "sample" | "cpcb";
    station: string;
    observedAt: string;
    nationalAqi: number;
    category: CpcbCategory;
    prominentPollutant: string;
    pollutants: {
      pm25: { avg: number; unit: string };
      pm10: { avg: number; unit: string };
    };
    stations: {
      name: string;
      latitude: number;
      longitude: number;
      nationalAqi: number;
      category: CpcbCategory;
      lastUpdate: string;
    }[];
    insufficient: boolean;
  };
  outlook: {
    source: "sample" | "open-meteo";
    hourly: { time: string; pm25: number }[];
    disclaimer: string;
  };
  history: {
    source: "sample" | "open-meteo";
    month: string;
    years: { year: number; pm25: number }[];
    direction: TrendDirection | null;
    changePercent: number | null;
    disclaimer: string;
  };
  climate: {
    source: "sample" | "open-meteo-archive";
    places: unknown[];
    disclaimer: string;
  };
  placeSummary: string;
  warning: string;
  tips: string[];
  disclaimer: string;
  currentError?: string | null;
}

export interface DroughtSeasonEntry {
  year: number;
  monsoonRainMm: number;
  dryness: DrynessLabel;
  affected: boolean;
}

export interface DroughtPlaceEntry {
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  seasons: DroughtSeasonEntry[];
}

export interface DroughtHistoryResponse {
  source: "sample" | "open-meteo-archive";
  disclaimer: string;
  method: string;
  years: number[];
  places: DroughtPlaceEntry[];
  byYear: {
    year: number;
    affectedSlugs: string[];
    affectedCount: number;
  }[];
}
