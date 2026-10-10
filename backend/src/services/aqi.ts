export type CpcbCategory =
  | "Good"
  | "Satisfactory"
  | "Moderate"
  | "Poor"
  | "Very Poor"
  | "Severe";

export type TrendDirection = "Improving" | "Degrading" | "About the same";

export type DrynessLabel = "Drier than usual" | "Near usual" | "Wetter than usual";

export function categoryFromAqi(aqi: number): CpcbCategory {
  if (aqi <= 50) return "Good";
  if (aqi <= 100) return "Satisfactory";
  if (aqi <= 200) return "Moderate";
  if (aqi <= 300) return "Poor";
  if (aqi <= 400) return "Very Poor";
  return "Severe";
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

export function computeTrendDirection(
  years: { year: number; pm25: number }[],
): { direction: TrendDirection | null; changePercent: number | null } {
  if (years.length < 2) {
    return { direction: null, changePercent: null };
  }
  const sorted = [...years].sort((a, b) => a.year - b.year);
  const earliest = sorted[0].pm25;
  const latest = sorted[sorted.length - 1].pm25;
  if (earliest === 0) {
    return { direction: "About the same", changePercent: 0 };
  }
  const changePercent = ((latest - earliest) / earliest) * 100;
  let direction: TrendDirection = "About the same";
  if (changePercent <= -5) direction = "Improving";
  else if (changePercent >= 5) direction = "Degrading";
  return { direction, changePercent: Math.round(changePercent * 10) / 10 };
}

export function computeDryness(
  rainByYear: { year: number; rainMm: number }[],
  targetYear: number,
): DrynessLabel {
  const target = rainByYear.find((y) => y.year === targetYear);
  if (!target) return "Near usual";
  const others = rainByYear.filter((y) => y.year !== targetYear);
  if (others.length === 0) return "Near usual";
  const mean =
    others.reduce((sum, y) => sum + y.rainMm, 0) / others.length;
  if (mean === 0) return "Near usual";
  const diff = ((target.rainMm - mean) / mean) * 100;
  if (diff <= -15) return "Drier than usual";
  if (diff >= 15) return "Wetter than usual";
  return "Near usual";
}

export function compareRainPercent(
  currentRain: number,
  compareRain: number,
): number | null {
  if (compareRain === 0) return null;
  return Math.round(((currentRain - compareRain) / compareRain) * 1000) / 10;
}
