const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function groqComplete(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 400,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export function buildChatSystemPrompt(): string {
  return `You are CleanAir Alert assistant for India. Answer only from the JSON context provided.
Never invent pollutant measurements, rain totals, or AQI numbers.
Use officialCurrent (CPCB station data) for "now".
Use modelOutlook for later hours only.
Use modelHistory for same-month PM2.5 trends; if asked about 10 years of air, say the Open-Meteo air archive starts August 2022 and list only years in modelHistory.
Use climate for rain and soil questions; use comparePercent and rainMm from context.
Keep answers concise (under 120 words). Mention which source you used. Not medical advice.`;
}

export function stubChatAnswer(
  category: string,
  direction: string | null,
  question?: string,
): string {
  const q = question?.toLowerCase() ?? "";
  if (q.includes("10 years") && q.includes("air")) {
    return `The Open-Meteo air archive starts in August 2022. From CPCB station data (sample), the current category is ${category}. Same-month model history is ${direction ?? "unavailable"}. Model outlook applies to later hours only.`;
  }
  if (q.includes("rain") && q.includes("2025")) {
    return `Using Open-Meteo reanalysis totals already on screen: compare this year’s rain with 2025 for the same date window. CPCB station data (sample) category is ${category}. Model outlook may change later today.`;
  }
  return `Based on CPCB station data (sample), the category is ${category}. The model outlook may change later today. Same-month model history is ${direction ?? "unavailable"}. This is not an official sensor reading for forecast hours.`;
}
