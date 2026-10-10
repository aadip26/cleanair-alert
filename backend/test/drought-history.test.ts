import test from "node:test";
import assert from "node:assert/strict";
import {
  buildClimateAggregates,
  isMonsoonMonth,
} from "../src/services/open-meteo.js";
import { buildSampleMonsoonSeasons } from "../src/data/sample.js";
import { getDroughtHistory } from "../src/services/drought-history.js";

test("isMonsoonMonth covers Jun–Sep only", () => {
  assert.equal(isMonsoonMonth(4), false);
  assert.equal(isMonsoonMonth(5), true);
  assert.equal(isMonsoonMonth(8), true);
  assert.equal(isMonsoonMonth(9), false);
});

test("buildClimateAggregates splits monsoon rain", () => {
  const today = new Date(Date.UTC(2026, 9, 10));
  const times = [
    "2024-06-15",
    "2024-07-01",
    "2024-11-01",
    "2025-08-20",
  ];
  const precip = [10, 20, 50, 5];
  const { climateYears, monsoonSeries } = buildClimateAggregates(
    times,
    precip,
    [],
    [],
    today,
  );
  const y2024 = climateYears.find((y) => y.year === 2024);
  assert.ok(y2024);
  assert.equal(y2024!.rainMm, 80);
  assert.equal(y2024!.monsoonRainMm, 30);
  const m2024 = monsoonSeries.find((y) => y.year === 2024);
  assert.equal(m2024!.monsoonRainMm, 30);
});

test("sample drought history has affected locations", async () => {
  process.env.AIR_QUALITY_SOURCE = "sample";
  const data = await getDroughtHistory();
  const withAffected = data.byYear.filter((y) => y.affectedCount > 0);
  assert.ok(withAffected.length > 0);
  const pune = data.places.find((p) => p.slug === "pune");
  assert.ok(pune?.seasons.some((s) => s.affected));
});

test("buildSampleMonsoonSeasons marks deficit years", () => {
  const places = buildSampleMonsoonSeasons();
  const jaipur = places.find((p) => p.slug === "jaipur");
  assert.ok(jaipur?.seasons.some((s) => s.affected));
});
