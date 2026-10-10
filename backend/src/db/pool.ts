import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PLACES } from "../data/places.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool | null {
  return pool;
}

export async function initDb(databaseUrl: string | undefined): Promise<boolean> {
  if (!databaseUrl) return false;
  pool = new pg.Pool({ connectionString: databaseUrl });
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await pool.query(schema);
  for (const place of PLACES) {
    await pool.query(
      `INSERT INTO places (slug, name, state, latitude, longitude, cpcb_city)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         state = EXCLUDED.state,
         latitude = EXCLUDED.latitude,
         longitude = EXCLUDED.longitude,
         cpcb_city = EXCLUDED.cpcb_city`,
      [
        place.slug,
        place.name,
        place.state,
        place.latitude,
        place.longitude,
        place.cpcbCity,
      ],
    );
  }
  return true;
}

export async function listPlacesFromDb() {
  if (!pool) return null;
  const { rows } = await pool.query(
    "SELECT slug, name, state FROM places ORDER BY name",
  );
  return rows as { slug: string; name: string; state: string }[];
}

export async function getPlaceFromDb(slug: string) {
  if (!pool) return null;
  const { rows } = await pool.query(
    "SELECT slug, name, state, latitude, longitude, cpcb_city FROM places WHERE slug = $1",
    [slug],
  );
  return rows[0] as
    | {
        slug: string;
        name: string;
        state: string;
        latitude: number;
        longitude: number;
        cpcb_city: string | null;
      }
    | undefined;
}
