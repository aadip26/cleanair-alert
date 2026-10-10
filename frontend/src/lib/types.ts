export type CpcbCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type TrendDirection = "Improving" | "Degrading" | "About the same";

export type DrynessLabel = "Drier than usual" | "Near usual" | "Wetter than usual";

export interface PollutantReading {
  avg: number;
  unit: string;
}

export interface StationPoint {
  name: string;
  latitude: number;
  longitude: number;
  nationalAqi: number;
  category: CpcbCategory;
  lastUpdate: string;
}

export interface CurrentReading {
  source: "sample" | "cpcb";
  station: string;
  observedAt: string;
  nationalAqi: number;
  category: CpcbCategory;
  prominentPollutant: string;
  pollutants: {
    pm25: PollutantReading;
    pm10: PollutantReading;
  };
  stations: StationPoint[];
  insufficient: boolean;
}

export interface OutlookHour {
  time: string;
  pm25: number;
}

export interface AirHistoryYear {
  year: number;
  pm25: number;
}

export interface ClimateYearEntry {
  year: number;
  rainMm: number;
  soilMoisture: number | null;
  soilTemperatureC: number | null;
  dateWindow: string;
  dryness: DrynessLabel;
  comparePercent: number | null;
}

export interface ClimatePlace {
  slug: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  years: ClimateYearEntry[];
}

export interface AirQualityPayload {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  current: CurrentReading;
  outlook: {
    source: "sample" | "open-meteo";
    hourly: OutlookHour[];
    disclaimer: string;
  };
  history: {
    source: "sample" | "open-meteo";
    month: string;
    years: AirHistoryYear[];
    direction: TrendDirection | null;
    changePercent: number | null;
    disclaimer: string;
  };
  climate: {
    source: "sample" | "open-meteo-archive";
    places: ClimatePlace[];
    disclaimer: string;
  };
  placeSummary: string;
  warning: string;
  tips: string[];
  disclaimer: string;
}

export interface CityListItem {
  slug: string;
  name: string;
  state: string;
}

export interface ChatChart {
  title: string;
  unit: string;
  points: { label: string; value: number }[];
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

export interface DroughtHistoryPayload {
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

export interface ChatMessage {
  id: number;
  citySlug: string;
  question: string;
  answer: string;
  chart?: ChatChart | null;
  createdAt: string;
}
