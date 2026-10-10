import { categoryFromAqi } from "./aqi.js";

const RESOURCE =
  "https://api.data.gov.in/resource/3b01bcb8-0b14-4abf-b6f2-c1bfd384ba69";

interface CpcbRow {
  station?: string;
  city?: string;
  last_update?: string;
  pollutant_id?: string;
  pollutant_avg?: string;
  pollutant_unit?: string;
  latitude?: string;
  longitude?: string;
}

interface StationAggregate {
  name: string;
  city: string;
  lastUpdate: string;
  latitude: number | null;
  longitude: number | null;
  pollutants: Map<string, { avg: number; unit: string }>;
}

export async function fetchCpcbCityRows(
  cpcbCity: string,
  apiKey: string,
): Promise<CpcbRow[]> {
  const url = new URL(RESOURCE);
  url.searchParams.set("api-key", apiKey);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "200");
  url.searchParams.set("filters[city]", cpcbCity);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`CPCB data.gov.in request failed: ${res.status}`);
  }
  const body = (await res.json()) as { records?: CpcbRow[] };
  return body.records ?? [];
}

function parseStationMap(rows: CpcbRow[]): Map<string, StationAggregate> {
  const stations = new Map<string, StationAggregate>();
  for (const row of rows) {
    const name = row.station ?? "Unknown station";
    if (!stations.has(name)) {
      stations.set(name, {
        name,
        city: row.city ?? "",
        lastUpdate: row.last_update ?? "",
        latitude: row.latitude ? Number(row.latitude) : null,
        longitude: row.longitude ? Number(row.longitude) : null,
        pollutants: new Map(),
      });
    }
    const station = stations.get(name)!;
    if (row.last_update && row.last_update > station.lastUpdate) {
      station.lastUpdate = row.last_update;
    }
    if (row.latitude && row.longitude) {
      station.latitude = Number(row.latitude);
      station.longitude = Number(row.longitude);
    }
    const pollutant = row.pollutant_id;
    if (pollutant && row.pollutant_avg) {
      station.pollutants.set(pollutant, {
        avg: Number(row.pollutant_avg),
        unit: row.pollutant_unit ?? "NA",
      });
    }
  }
  return stations;
}

export function stationNationalAqi(station: StationAggregate): {
  aqi: number | null;
  prominent: string | null;
  insufficient: boolean;
} {
  const entries = [...station.pollutants.entries()];
  const hasPm =
    station.pollutants.has("PM2.5") || station.pollutants.has("PM10");
  if (entries.length < 3 || !hasPm) {
    return { aqi: null, prominent: null, insufficient: true };
  }
  let max = -1;
  let prominent: string | null = null;
  for (const [id, val] of entries) {
    if (val.avg > max) {
      max = val.avg;
      prominent = id;
    }
  }
  return { aqi: max, prominent, insufficient: false };
}

export function reduceCpcbCity(rows: CpcbRow[]) {
  const stations = parseStationMap(rows);
  const resultStations = [...stations.values()].map((s) => {
    const { aqi, prominent, insufficient } = stationNationalAqi(s);
    const category = aqi != null ? categoryFromAqi(aqi) : null;
    return {
      name: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      nationalAqi: aqi,
      category,
      prominentPollutant: prominent,
      lastUpdate: s.lastUpdate,
      insufficient,
      pollutants: s.pollutants,
    };
  });

  const valid = resultStations.filter(
    (s) => s.nationalAqi != null && !s.insufficient,
  );
  if (valid.length === 0) {
    return { insufficient: true as const, station: null, stations: resultStations };
  }
  valid.sort((a, b) => (b.nationalAqi ?? 0) - (a.nationalAqi ?? 0));
  const top = valid[0];
  const pm25 = top.pollutants.get("PM2.5");
  const pm10 = top.pollutants.get("PM10");

  return {
    insufficient: false as const,
    station: top.name,
    observedAt: top.lastUpdate,
    nationalAqi: top.nationalAqi!,
    category: top.category!,
    prominentPollutant: top.prominentPollutant ?? "PM2.5",
    pollutants: {
      pm25: pm25 ?? { avg: 0, unit: "NA" },
      pm10: pm10 ?? { avg: 0, unit: "NA" },
    },
    stations: resultStations
      .filter((s) => s.latitude != null && s.longitude != null && s.nationalAqi != null)
      .map((s) => ({
        name: s.name,
        latitude: s.latitude!,
        longitude: s.longitude!,
        nationalAqi: s.nationalAqi!,
        category: s.category!,
        lastUpdate: s.lastUpdate,
      })),
  };
}

export async function fetchCpcbCurrent(cpcbCity: string, apiKey: string) {
  const rows = await fetchCpcbCityRows(cpcbCity, apiKey);
  return reduceCpcbCity(rows);
}
