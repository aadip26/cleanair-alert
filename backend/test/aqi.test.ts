import test from "node:test";
import assert from "node:assert/strict";
import {
  categoryFromAqi,
  computeDryness,
  computeTrendDirection,
  compareRainPercent,
} from "../src/services/aqi.js";
import { reduceCpcbCity } from "../src/services/cpcb.js";
import { normalizeOutlookResponse } from "../src/services/open-meteo.js";
import request from "supertest";
import { createApp } from "../src/app.js";

test("CPCB category breakpoints", () => {
  assert.equal(categoryFromAqi(40), "Good");
  assert.equal(categoryFromAqi(90), "Satisfactory");
  assert.equal(categoryFromAqi(150), "Moderate");
  assert.equal(categoryFromAqi(250), "Poor");
  assert.equal(categoryFromAqi(350), "Very Poor");
  assert.equal(categoryFromAqi(420), "Severe");
});

test("air trend direction 5% rule", () => {
  assert.deepEqual(computeTrendDirection([{ year: 2023, pm25: 100 }]), {
    direction: null,
    changePercent: null,
  });
  assert.equal(
    computeTrendDirection([
      { year: 2023, pm25: 100 },
      { year: 2025, pm25: 90 },
    ]).direction,
    "Improving",
  );
  assert.equal(
    computeTrendDirection([
      { year: 2023, pm25: 40 },
      { year: 2025, pm25: 50 },
    ]).direction,
    "Degrading",
  );
});

test("rain dryness 15% rule", () => {
  const series = [
    { year: 2020, rainMm: 100 },
    { year: 2021, rainMm: 100 },
    { year: 2022, rainMm: 100 },
    { year: 2023, rainMm: 70 },
  ];
  assert.equal(computeDryness(series, 2023), "Drier than usual");
  assert.equal(computeDryness(series, 2020), "Near usual");
});

test("compare rain percent", () => {
  assert.equal(compareRainPercent(110, 100), 10);
});

test("cpcb station reducer picks max sub-index", () => {
  const reduced = reduceCpcbCity([
    {
      station: "Test Station",
      city: "Delhi",
      last_update: "2025-01-01 10:00:00",
      pollutant_id: "PM2.5",
      pollutant_avg: "120",
      pollutant_unit: "NA",
      latitude: "28.6",
      longitude: "77.2",
    },
    {
      station: "Test Station",
      pollutant_id: "PM10",
      pollutant_avg: "90",
      pollutant_unit: "NA",
    },
    {
      station: "Test Station",
      pollutant_id: "NO2",
      pollutant_avg: "60",
      pollutant_unit: "NA",
    },
  ]);
  assert.equal(reduced.insufficient, false);
  if (!reduced.insufficient) {
    assert.equal(reduced.nationalAqi, 120);
    assert.equal(reduced.station, "Test Station");
  }
});

test("outlook normalizer returns 24 hourly points", () => {
  const hourly = normalizeOutlookResponse({
    hourly: {
      time: Array.from({ length: 30 }, (_, i) => `2025-01-01T${String(i).padStart(2, "0")}:00`),
      pm2_5: Array.from({ length: 30 }, (_, i) => i + 1),
    },
  });
  assert.equal(hourly.length, 24);
  assert.equal(hourly[0].pm25, 1);
});

test("health and 404 routes", async () => {
  const app = createApp();
  const health = await request(app).get("/health");
  assert.equal(health.status, 200);
  const missing = await request(app).get("/api/air-quality/not-a-city");
  assert.equal(missing.status, 404);
});
