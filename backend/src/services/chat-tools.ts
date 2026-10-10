import { getAirQuality } from "./air-quality.js";
import { getDroughtHistory, DROUGHT_DISCLAIMER } from "./drought-history.js";
import type { ChatChart } from "./chat-chart.js";

export type ChatToolName =
  | "get_current_air"
  | "get_outlook"
  | "get_air_history"
  | "get_rain_years"
  | "get_drought_places";

export const CHAT_TOOL_DEFINITIONS = [
  {
    type: "function" as const,
    function: {
      name: "get_current_air",
      description:
        "CPCB station air quality now for one city (AQI, category, PM2.5, PM10).",
      parameters: {
        type: "object",
        properties: {
          citySlug: { type: "string", description: "City slug, e.g. delhi" },
        },
        required: ["citySlug"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_outlook",
      description: "Model PM2.5 outlook for the next ~24 hours for a city.",
      parameters: {
        type: "object",
        properties: {
          citySlug: { type: "string" },
        },
        required: ["citySlug"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_air_history",
      description:
        "Same-calendar-month PM2.5 by year from Open-Meteo archive (from August 2022).",
      parameters: {
        type: "object",
        properties: {
          citySlug: { type: "string" },
        },
        required: ["citySlug"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_rain_years",
      description: "Calendar-year rain totals (mm) for a city from climate data.",
      parameters: {
        type: "object",
        properties: {
          citySlug: { type: "string" },
        },
        required: ["citySlug"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "get_drought_places",
      description:
        "Rain-deficit stress across 15 tracked India locations for a year (Jun–Sep monsoon, not IMD drought).",
      parameters: {
        type: "object",
        properties: {
          year: {
            type: "number",
            description: "Calendar year, e.g. 2022. Omit for latest year in series.",
          },
        },
      },
    },
  },
];

export function extractYearFromQuestion(question: string): number | null {
  const match = question.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : null;
}

export function pickStubTool(question: string): ChatToolName {
  const q = question.toLowerCase();
  if (
    q.includes("drought") ||
    q.includes("rain-deficit") ||
    q.includes("monsoon deficit") ||
    (q.includes("drier") && q.includes("monsoon"))
  ) {
    return "get_drought_places";
  }
  if (q.includes("outlook") || q.includes("next 24") || q.includes("forecast")) {
    return "get_outlook";
  }
  if (
    (q.includes("10 years") && (q.includes("air") || q.includes("quality"))) ||
    q.includes("air history") ||
    (q.includes("air quality") && (q.includes("changed") || q.includes("over")))
  ) {
    return "get_air_history";
  }
  if (
    q.includes("rain") ||
    q.includes("soil") ||
    (/\bcompared (with|to)\b/.test(q) && /\b20\d{2}\b/.test(q))
  ) {
    return "get_rain_years";
  }
  return "get_current_air";
}

type ClimatePlace = {
  slug: string;
  name: string;
  state: string;
  years: { year: number; rainMm: number }[];
};

export async function executeTool(
  name: ChatToolName,
  args: Record<string, unknown>,
  defaultCitySlug: string,
): Promise<unknown> {
  const citySlug =
    typeof args.citySlug === "string" && args.citySlug.trim()
      ? args.citySlug.trim()
      : defaultCitySlug;

  switch (name) {
    case "get_current_air": {
      const data = await getAirQuality(citySlug);
      if (!data) return { error: "City not found", citySlug };
      return {
        city: data.name,
        slug: data.slug,
        source: data.current.source,
        nationalAqi: data.current.nationalAqi,
        category: data.current.category,
        station: data.current.station,
        observedAt: data.current.observedAt,
        pm25: data.current.pollutants.pm25,
        pm10: data.current.pollutants.pm10,
        disclaimer: data.disclaimer,
      };
    }
    case "get_outlook": {
      const data = await getAirQuality(citySlug);
      if (!data) return { error: "City not found", citySlug };
      return {
        city: data.name,
        source: data.outlook.source,
        disclaimer: data.outlook.disclaimer,
        hourly: data.outlook.hourly,
      };
    }
    case "get_air_history": {
      const data = await getAirQuality(citySlug);
      if (!data) return { error: "City not found", citySlug };
      return {
        city: data.name,
        month: data.history.month,
        archiveNote:
          "Open-Meteo air archive starts in August 2022; not an official CPCB trend.",
        source: data.history.source,
        years: data.history.years,
        direction: data.history.direction,
        disclaimer: data.history.disclaimer,
      };
    }
    case "get_rain_years": {
      const data = await getAirQuality(citySlug);
      if (!data) return { error: "City not found", citySlug };
      const places = data.climate.places as ClimatePlace[];
      const place = places.find((p) => p.slug === citySlug) ?? places[0];
      return {
        city: place?.name ?? data.name,
        source: data.climate.source,
        disclaimer: data.climate.disclaimer,
        years: place?.years ?? [],
      };
    }
    case "get_drought_places": {
      const drought = await getDroughtHistory();
      let year =
        typeof args.year === "number"
          ? args.year
          : extractYearFromQuestion(String(args.year ?? ""));
      if (year == null || Number.isNaN(year)) {
        year = drought.years[drought.years.length - 1];
      }
      const row = drought.byYear.find((y) => y.year === year);
      const affected = drought.places
        .map((p) => {
          const season = p.seasons.find((s) => s.year === year);
          if (!season?.affected) return null;
          return {
            name: p.name,
            state: p.state,
            slug: p.slug,
            monsoonRainMm: season.monsoonRainMm,
            dryness: season.dryness,
          };
        })
        .filter(Boolean);
      const yearsWithStress = drought.byYear
        .filter((y) => y.affectedCount > 0)
        .map((y) => ({ year: y.year, count: y.affectedCount }));
      return {
        year,
        method: drought.method,
        disclaimer: DROUGHT_DISCLAIMER,
        trackedLocations: drought.places.length,
        affected,
        yearsWithStress,
        affectedCount: row?.affectedCount ?? 0,
      };
    }
    default:
      return { error: "Unknown tool" };
  }
}

export function chartFromToolResult(
  toolName: ChatToolName,
  result: unknown,
  cityName?: string,
): ChatChart | null {
  if (!result || typeof result !== "object") return null;
  const r = result as Record<string, unknown>;

  if (toolName === "get_drought_places") {
    const yearsWithStress = r.yearsWithStress as { year: number; count: number }[] | undefined;
    if (!yearsWithStress?.length) return null;
    return {
      title: "Rain-deficit stress locations by year",
      unit: "locations",
      points: yearsWithStress.map((y) => ({
        label: String(y.year),
        value: y.count,
      })),
    };
  }

  if (toolName === "get_rain_years") {
    const years = r.years as { year: number; rainMm: number }[] | undefined;
    if (!years?.length) return null;
    return {
      title: `Yearly rain — ${(r.city as string) ?? cityName ?? "City"}`,
      unit: "mm",
      points: years.map((y) => ({ label: String(y.year), value: y.rainMm })),
    };
  }

  if (toolName === "get_air_history") {
    const years = r.years as { year: number; pm25: number }[] | undefined;
    if (!years?.length) return null;
    return {
      title: `Same-month PM2.5 — ${(r.city as string) ?? cityName ?? "City"}`,
      unit: "µg/m³",
      points: years.map((y) => ({ label: String(y.year), value: y.pm25 })),
    };
  }

  if (toolName === "get_outlook") {
    const hourly = r.hourly as { time: string; pm25: number }[] | undefined;
    if (!hourly?.length) return null;
    return {
      title: "Model outlook PM2.5",
      unit: "µg/m³",
      points: hourly.map((h) => ({
        label: new Date(h.time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        value: h.pm25,
      })),
    };
  }

  return null;
}

export function formatStubAnswer(
  toolName: ChatToolName,
  result: unknown,
): string {
  if (!result || typeof result !== "object") {
    return "I could not load data for that question.";
  }
  const r = result as Record<string, unknown>;

  if (r.error) {
    return `Data error: ${String(r.error)}.`;
  }

  switch (toolName) {
    case "get_drought_places": {
      const year = r.year as number;
      const affected = r.affected as {
        name: string;
        state: string;
        monsoonRainMm: number;
      }[];
      const yearsWithStress = r.yearsWithStress as { year: number; count: number }[];
      if (!affected.length) {
        const hint = yearsWithStress
          .slice(-5)
          .map((y) => `${y.year} (${y.count})`)
          .join(", ");
        return `For ${year}, none of the ${r.trackedLocations} tracked locations met the Jun–Sep rain-deficit threshold. Years with at least one location in stress include: ${hint || "see the drought map"}. ${DROUGHT_DISCLAIMER}`;
      }
      const list = affected
        .map((p) => `${p.name}, ${p.state} (${p.monsoonRainMm} mm monsoon)`)
        .join("; ");
      return `In ${year}, rain-deficit stress among tracked locations: ${list}. Other tracked locations were not below the 15% monsoon threshold that year. ${DROUGHT_DISCLAIMER}`;
    }
    case "get_air_history": {
      const years = r.years as { year: number; pm25: number }[];
      const list = years.map((y) => `${y.year}: ${y.pm25} µg/m³`).join(", ");
      return `${r.archiveNote} For ${r.city} (${r.month}): ${list}. Trend: ${r.direction ?? "unavailable"}. Source: ${r.source}.`;
    }
    case "get_rain_years": {
      const years = r.years as { year: number; rainMm: number }[];
      const list = years.map((y) => `${y.year}: ${y.rainMm} mm`).join(", ");
      return `Calendar-year rain for ${r.city} (Open-Meteo reanalysis): ${list}. ${r.disclaimer}`;
    }
    case "get_outlook": {
      const hourly = r.hourly as { time: string; pm25: number }[];
      const sample = hourly.slice(0, 6).map((h) => {
        const t = new Date(h.time).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${t} ${h.pm25} µg/m³`;
      });
      return `Model outlook for ${r.city}: ${sample.join("; ")}${hourly.length > 6 ? "…" : ""}. ${r.disclaimer}`;
    }
    case "get_current_air":
    default: {
      return `CPCB station data (${r.source}) for ${r.city}: National AQI ${r.nationalAqi} (${r.category}). PM2.5 ${(r.pm25 as { avg: number }).avg}. Station: ${r.station}. ${r.disclaimer}`;
    }
  }
}

export async function runStubChat(
  question: string,
  citySlug: string,
): Promise<{ answer: string; chart: ChatChart | null; toolUsed: ChatToolName }> {
  const toolName = pickStubTool(question);
  const args: Record<string, unknown> = {};
  if (toolName === "get_drought_places") {
    const y = extractYearFromQuestion(question);
    if (y != null) args.year = y;
  } else {
    args.citySlug = citySlug;
  }
  const result = await executeTool(toolName, args, citySlug);
  const answer = formatStubAnswer(toolName, result);
  const chart = chartFromToolResult(
    toolName,
    result,
    typeof (result as Record<string, unknown>).city === "string"
      ? ((result as Record<string, unknown>).city as string)
      : undefined,
  );
  return { answer, chart, toolUsed: toolName };
}
