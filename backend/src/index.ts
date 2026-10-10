import "dotenv/config";
import { createApp } from "./app.js";
import { initDb } from "./db/pool.js";

const port = Number(process.env.PORT ?? 4000);

async function main() {
  await initDb(process.env.DATABASE_URL).catch((err) => {
    console.warn("Database not available, continuing without Postgres:", err.message);
  });
  const app = createApp();
  app.listen(port, () => {
    console.log(`CleanAir API listening on http://localhost:${port}`);
  });
}

main();
