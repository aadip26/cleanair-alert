import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "npm run dev --prefix backend",
      url: "http://localhost:4000/health",
      reuseExistingServer: !process.env.CI,
      env: {
        AIR_QUALITY_SOURCE: "sample",
        CHAT_MODE: "stub",
        PORT: "4000",
      },
    },
    {
      command: "npm run dev --prefix frontend",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      env: {
        NEXT_PUBLIC_API_URL: "http://localhost:4000",
      },
    },
  ],
});
