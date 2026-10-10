import { test, expect } from "@playwright/test";

async function openAssistant(page: import("@playwright/test").Page) {
  await page.getByTestId("assistant-open").click();
  await expect(page.getByTestId("assistant-sheet")).toBeVisible();
}

test.describe("CleanAir Alert dashboard", () => {
  test("shows core air sections and sample banner", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("aqi-label")).toContainText("National AQI (CPCB)");
    await expect(page.getByTestId("sample-banner")).toBeVisible();
    await expect(page.getByTestId("aqi-scale")).toContainText("Severe");
    await expect(page.getByTestId("outlook-label")).toContainText("Model outlook");
    await expect(page.getByTestId("forecast-chart")).toBeVisible();
    await expect(page.getByText("CPCB forecast")).toHaveCount(0);
    await expect(page.getByText("official drought")).toHaveCount(0);
  });

  test("city change updates AQI and trend direction", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("aqi-value")).toContainText("312");
    await expect(page.getByTestId("trend-direction")).toContainText("Improving");
    await page.getByTestId("city-select").click();
    await page.getByRole("option", { name: "Mumbai" }).click();
    await expect(page.getByTestId("aqi-value")).toContainText("142");
    await expect(page.getByTestId("trend-direction")).toContainText("Degrading");
  });

  test("maps, rain slider, and soil units", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("city-map")).toBeVisible();
    await expect(page.getByTestId("climate-map")).toBeVisible();
    await expect(page.getByTestId("year-slider")).toBeVisible();
    await expect(page.getByTestId("soil-moisture")).toContainText("m³/m³");
    await expect(page.getByTestId("soil-temperature")).toContainText("°C");
    const before = await page.getByTestId("rain-total").textContent();
    await page.getByTestId("year-slider").fill("2018");
    await expect(page.getByTestId("rain-total")).not.toHaveText(before ?? "");
  });

  test("mobile viewport keeps sections", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("aqi-value")).toBeVisible();
    await expect(page.getByTestId("forecast-chart")).toBeVisible();
    await expect(page.getByTestId("climate-map")).toBeVisible();
  });

  test("API health and unknown city 404", async ({ request }) => {
    const health = await request.get("http://localhost:4000/health");
    expect(health.ok()).toBeTruthy();
    const missing = await request.get(
      "http://localhost:4000/api/air-quality/not-a-city",
    );
    expect(missing.status()).toBe(404);
  });

  test("air history question mentions 2022 archive", async ({ page }) => {
    await page.goto("/");
    await openAssistant(page);
    await page.getByTestId("chat-input").fill(
      "How has air quality changed over the last 10 years?",
    );
    await page.getByTestId("chat-submit").click();
    await expect(page.getByTestId("chat-answer").last()).toContainText("2022");
  });

  test("historical drought analysis map and year slider", async ({
    page,
    request,
  }) => {
    const res = await request.get("http://localhost:4000/api/drought-history");
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      byYear: { year: number; affectedCount: number }[];
    };
    const activeYear = body.byYear.find((y) => y.affectedCount > 0)?.year;
    expect(activeYear).toBeTruthy();

    await page.goto("/");
    await page.getByTestId("drought-section").scrollIntoViewIfNeeded();
    await expect(page.getByTestId("drought-section")).toBeVisible();
    await expect(page.getByTestId("drought-map")).toBeVisible();
    await expect(page.getByTestId("drought-summary-chart")).toBeVisible();
    await expect(page.getByText("official drought")).toHaveCount(0);

    await page.getByTestId("drought-year-slider").fill(String(activeYear));
    await expect(page.getByTestId("drought-affected-list")).toContainText(
      "Rain-deficit stress",
    );
    await expect(page.getByTestId("drought-affected-list")).not.toContainText(
      "0 of",
    );
  });

  test("assistant drought question lists Pune for 2022", async ({ page }) => {
    await page.goto("/");
    await openAssistant(page);
    await page
      .getByTestId("chat-input")
      .fill("in 2022 what are the city in india with drought condition");
    await page.getByTestId("chat-submit").click();
    await expect(page.getByTestId("chat-answer").last()).toContainText("Pune");
    await expect(page.getByTestId("chat-answer").last()).not.toContainText(
      "Very Poor",
    );
    await expect(page.getByTestId("assistant-chart").last()).toBeVisible();
  });

  test("assistant rain question shows chart and history persists", async ({
    page,
  }) => {
    await page.goto("/");
    await openAssistant(page);
    await page.getByTestId("chat-input").fill(
      "How is rain this year compared with 2025?",
    );
    await page.getByTestId("chat-submit").click();
    await expect(page.getByTestId("chat-answer").last()).toContainText("mm");
    await expect(page.getByTestId("assistant-chart").last()).toBeVisible();
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page.getByTestId("chat-history")).toContainText(
      "How is rain this year compared with 2025?",
    );
    await page.reload();
    await openAssistant(page);
    await page.getByRole("tab", { name: "History" }).click();
    await expect(page.getByTestId("chat-history")).toContainText(
      "How is rain this year compared with 2025?",
    );
  });
});
