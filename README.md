# CleanAir Alert

Pick an Indian city, see **National AQI (CPCB)** station data, a **model outlook** chart, station maps, same-month air history, and a **rain/soil** map from Open-Meteo reanalysis. Ask questions in plain language (Groq).

## Run locally

```bash
# Terminal 1 — API (sample data by default)
cd backend && npm install && npm run dev

# Terminal 2 — Dashboard
cd frontend && npm install && npm run dev
```

Open http://localhost:3000. API: http://localhost:4000/health.

Optional Postgres:

```bash
docker compose up postgres
export DATABASE_URL=postgres://cleanair:cleanair@localhost:5432/cleanair
```

Live CPCB + Open-Meteo: set `AIR_QUALITY_SOURCE=live` and `DATA_GOV_IN_API_KEY` in `.env`.

## Tests

```bash
npm install
npm run test:e2e          # starts API + web (sample + chat stub)
cd backend && npm test    # unit tests
```

## Docker

```bash
docker compose up --build
```

Includes a local [Open-Meteo](https://github.com/open-meteo/open-meteo/blob/main/docs/getting-started.md) instance on port **8080** with a **2 GB** LRU cache (`CACHE_SIZE=2GB`, **3 GB** memory limit). The API tries `OPEN_METEO_BASE_URL` first, then the public hosts if local is slow or down.

## What the numbers mean

- **National AQI (CPCB)**: from data.gov.in station feed when live; not the same as US AQI.
- **Model outlook / history**: Open-Meteo CAMS model — not CPCB or SAFAR official forecast.
- **Rain & soil map**: ERA5 reanalysis — not an IMD drought declaration.

Manual live checks: compare one Delhi station with [CPCB](https://airquality.cpcb.gov.in/AQI_India/), one Open-Meteo value, one Groq answer with `GROQ_API_KEY` set.
