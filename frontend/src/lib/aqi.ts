import type { CpcbCategory } from "./types";

export const CPCB_SCALE: { range: string; label: CpcbCategory }[] = [
  { range: "0–50", label: "Good" },
  { range: "51–100", label: "Satisfactory" },
  { range: "101–200", label: "Moderate" },
  { range: "201–300", label: "Poor" },
  { range: "301–400", label: "Very Poor" },
  { range: "401–500", label: "Severe" },
];

export function categoryFromAqi(aqi: number): CpcbCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
}

export function categoryColor(category: CpcbCategory): string {
  switch (category) {
    case "Good":
      return "#22c55e";
    case "Satisfactory":
      return "#84cc16";
    case "Moderate":
      return "#eab308";
    case "Poor":
      return "#f97316";
    case "Very Poor":
      return "#ef4444";
    case "Severe":
      return "#7f1d1d";
  }
}

export function drynessColor(label: string): string {
  if (label === "Drier than usual") return "#b45309";
  if (label === "Wetter than usual") return "#2563eb";
  return "#64748b";
}

export function warningForCategory(category: CpcbCategory): string {
  switch (category) {
    case "Good":
      return "Air quality is satisfactory. Outdoor activity is generally fine for most people.";
    case "Satisfactory":
      return "Air quality is acceptable. Sensitive people may notice minor effects during long outdoor exertion.";
    case "Moderate":
      return "Air quality may affect sensitive groups. Consider shorter outdoor activity if you have asthma or heart/lung conditions.";
    case "Poor":
      return "Air quality is unhealthy for sensitive groups. Reduce prolonged outdoor exertion if you are in a sensitive group.";
    case "Very Poor":
      return "Air quality is poor. Everyone should reduce heavy outdoor exertion; sensitive groups should stay indoors when possible.";
    case "Severe":
      return "Air quality is severe. Avoid outdoor exertion and keep windows closed when possible.";
  }
}

export function tipsForCategory(category: CpcbCategory): string[] {
  switch (category) {
    case "Good":
    case "Satisfactory":
      return [
        "Good time for a walk or commute outdoors.",
        "Keep an eye on updates if you have respiratory conditions.",
      ];
    case "Moderate":
      return [
        "Sensitive people may prefer a mask on busy roads.",
        "Schedule strenuous exercise for cleaner hours if possible.",
      ];
    case "Poor":
      return [
        "Wear a well-fitted mask if you must be outside for long.",
        "Use indoor ventilation carefully near traffic.",
      ];
    case "Very Poor":
    case "Severe":
      return [
        "Prefer indoor activity today.",
        "Use air purifiers indoors if available.",
        "Check again before planning outdoor sports or school events.",
      ];
  }
}
