import { getPlace, PLACES } from "../data/places.js";
import { buildSampleAirQuality, buildSampleClimatePlaces, listCities } from "../data/sample.js";
import {
  tipsForCategory,
  warningForCategory,
} from "./aqi.js";
import { fetchCpcbCurrent } from "./cpcb.js";
import {
  fetchAirHistory,
  fetchClimateArchive,
  fetchOutlook,
} from "./open-meteo.js";
import { getPool, getPlaceFromDb } from "../db/pool.js";
import { groqComplete } from "./groq.js";

const OUTLOOK_DISCLAIMER =
  "Hourly PM2.5 outlook from the Open-Meteo air-quality model. This is not a CPCB or SAFAR government forecast.";
const HISTORY_DISCLAIMER =
  "Same-month PM2.5 averages from the Open-Meteo model archive (available from August 2022). This is not an official CPCB trend.";
const CLIMATE_DISCLAIMER =
  "Rain and soil values from Open-Meteo reanalysis (ERA5). This is not an IMD or state drought declaration.";
const CURRENT_DISCLAIMER =
  "Current National AQI comes from CPCB station data via data.gov.in when live mode is enabled.";

function envSource() {
  return (process.env.AIR_QUALITY_SOURCE ?? "sample").toLowerCase();
}

async function resolvePlace(slug: string) {
  const fromDb = await getPlaceFromDb(slug);
  if (fromDb) {
    return {
      slug: fromDb.slug,
      name: fromDb.name,
      state: fromDb.state,
      latitude: fromDb.latitude,
      longitude: fromDb.longitude,
      cpcbCity: fromDb.cpcb_city,
    };
  }
  const seed = getPlace(slug);
  if (!seed) return null;
  return {
    slug: seed.slug,
    name: seed.name,
    state: seed.state,
    latitude: seed.latitude,
    longitude: seed.longitude,
    cpcbCity: seed.cpcbCity,
  };
}

export async function getCities() {
  const fromDb = await import("../db/pool.js").then((m) => m.listPlacesFromDb());
  if (fromDb && fromDb.length > 0) {
    return fromDb.filter((c) =>
      [
        "delhi",
        "gurugram",
        "noida",
        "mumbai",
        "bengaluru",
        "kolkata",
        "chennai",
        "hyderabad",
        "jaipur",
        "chandigarh",
      ].includes(c.slug),
    );
  }
  return listCities();
}

export async function getClimatePayload() {
  const source = envSource();
  if (source === "sample") {
    return {
      source: "sample" as const,
      places: buildSampleClimatePlaces(),
      disclaimer: CLIMATE_DISCLAIMER,
    };
  }

  const places = [];
  for (const seed of PLACES) {
    try {
      const years = await fetchClimateArchive(seed);
      places.push({
        slug: seed.slug,
        name: seed.name,
        state: seed.state,
        latitude: seed.latitude,
        longitude: seed.longitude,
        years,
      });
    } catch {
      /* skip failed place */
    }
  }
  return {
    source: "open-meteo-archive" as const,
    places,
    disclaimer: CLIMATE_DISCLAIMER,
  };
}

export async function getAirQuality(slug: string) {
  const place = await resolvePlace(slug);
  if (!place) return null;

  if (envSource() === "sample") {
    return buildSampleAirQuality(slug);
  }

  const sampleFallback = buildSampleAirQuality(slug)!;
  let current = sampleFallback.current;
  let currentError: string | null = null;

  const apiKey = process.env.DATA_GOV_IN_API_KEY;
  if (apiKey && place.cpcbCity) {
    try {
      const cpcb = await fetchCpcbCurrent(place.cpcbCity, apiKey);
      if (cpcb.insufficient || !("station" in cpcb) || !cpcb.station) {
        currentError = "No CPCB station data for this city";
        current = {
          ...current,
          source: "cpcb",
          insufficient: true,
          station: currentError,
        };
      } else {
        current = {
          source: "cpcb",
          station: cpcb.station,
          observedAt: cpcb.observedAt,
          nationalAqi: cpcb.nationalAqi,
          category: cpcb.category,
          prominentPollutant: cpcb.prominentPollutant,
          pollutants: {
            pm25: { avg: cpcb.pollutants.pm25.avg, unit: cpcb.pollutants.pm25.unit },
            pm10: { avg: cpcb.pollutants.pm10.avg, unit: cpcb.pollutants.pm10.unit },
          },
          stations: cpcb.stations.length
            ? cpcb.stations
            : [
                {
                  name: cpcb.station,
                  latitude: place.latitude,
                  longitude: place.longitude,
                  nationalAqi: cpcb.nationalAqi,
                  category: cpcb.category,
                  lastUpdate: cpcb.observedAt,
                },
              ],
          insufficient: false,
        };
      }
    } catch (e) {
      currentError = e instanceof Error ? e.message : "CPCB fetch failed";
    }
  }

  let outlook = sampleFallback.outlook;
  try {
    const hourly = await fetchOutlook(place.latitude, place.longitude);
    outlook = {
      source: "open-meteo",
      hourly,
      disclaimer: OUTLOOK_DISCLAIMER,
    };
  } catch {
    /* keep sample outlook in live if meteo fails - plan says don't fill CPCB with model; outlook separate */
  }

  let history = sampleFallback.history;
  try {
    const h = await fetchAirHistory(place.latitude, place.longitude);
    history = {
      source: "open-meteo",
      month: h.month,
      years: h.years,
      direction: h.direction,
      changePercent: h.changePercent,
      disclaimer: HISTORY_DISCLAIMER,
    };
  } catch {
    /* keep sample history */
  }

  const climate = await getClimatePayload();

  const category = current.category;
  const payload = {
    slug: place.slug,
    name: place.name,
    latitude: place.latitude,
    longitude: place.longitude,
    current,
    outlook,
    history,
    climate,
    placeSummary: "",
    warning: warningForCategory(category),
    tips: tipsForCategory(category),
    disclaimer: CURRENT_DISCLAIMER,
    currentError,
  };

  if (process.env.GROQ_API_KEY && process.env.CHAT_MODE !== "stub") {
    try {
      payload.placeSummary = await groqComplete(
        process.env.GROQ_API_KEY,
        process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
        "Write 2-3 sentences summarizing the place using only the JSON. No new numbers.",
        JSON.stringify({
          officialCurrent: payload.current,
          modelOutlook: payload.outlook,
          modelHistory: payload.history,
          climate: payload.climate.places.find((p) => p.slug === slug),
        }),
      );
    } catch {
      payload.placeSummary = sampleFallback.placeSummary;
    }
  } else {
    payload.placeSummary = sampleFallback.placeSummary;
  }

  const pool = getPool();
  if (pool) {
    await pool.query(
      `INSERT INTO air_quality_cache (slug, payload, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (slug) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [slug, JSON.stringify(payload)],
    );
  }

  return payload;
}
