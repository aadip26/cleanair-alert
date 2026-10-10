import { PLACES } from "../data/places.js";
import { buildSampleMonsoonSeasons } from "../data/sample.js";
import type { DroughtHistoryResponse } from "../types.js";
import { fetchMonsoonArchive } from "./open-meteo.js";

export const DROUGHT_METHOD =
  "Jun–Sep precipitation vs other years at each location; ≥15% below local mean = rain-deficit stress (not an IMD drought declaration).";

export const DROUGHT_DISCLAIMER =
  "Monsoon rain-deficit stress from Open-Meteo ERA5 reanalysis (Jun–Sep). This is not an IMD or state drought declaration.";

function envSource() {
  return (process.env.AIR_QUALITY_SOURCE ?? "sample").toLowerCase();
}

function buildByYear(
  places: DroughtHistoryResponse["places"],
): DroughtHistoryResponse["byYear"] {
  const yearSet = new Set<number>();
  for (const place of places) {
    for (const s of place.seasons) yearSet.add(s.year);
  }
  return [...yearSet]
    .sort((a, b) => a - b)
    .map((year) => {
      const affectedSlugs = places
        .filter((p) => p.seasons.find((s) => s.year === year)?.affected)
        .map((p) => p.slug);
      return {
        year,
        affectedSlugs,
        affectedCount: affectedSlugs.length,
      };
    });
}

export async function getDroughtHistory(): Promise<DroughtHistoryResponse> {
  const source = envSource();

  if (source === "sample") {
    const places = buildSampleMonsoonSeasons();
    const years = places[0]?.seasons.map((s) => s.year) ?? [];
    return {
      source: "sample",
      disclaimer: DROUGHT_DISCLAIMER,
      method: DROUGHT_METHOD,
      years,
      places,
      byYear: buildByYear(places),
    };
  }

  const places: DroughtHistoryResponse["places"] = [];
  for (const seed of PLACES) {
    try {
      const seasons = await fetchMonsoonArchive(seed);
      places.push({
        slug: seed.slug,
        name: seed.name,
        state: seed.state,
        latitude: seed.latitude,
        longitude: seed.longitude,
        seasons,
      });
    } catch {
      /* skip failed place */
    }
  }

  const years =
    places[0]?.seasons.map((s) => s.year) ??
    (() => {
      const y = new Date().getFullYear();
      const out: number[] = [];
      for (let i = y - 10; i <= y; i++) out.push(i);
      return out;
    })();

  return {
    source: "open-meteo-archive",
    disclaimer: DROUGHT_DISCLAIMER,
    method: DROUGHT_METHOD,
    years,
    places,
    byYear: buildByYear(places),
  };
}
