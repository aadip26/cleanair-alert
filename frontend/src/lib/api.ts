import type {
  AirQualityPayload,
  ChatMessage,
  CityListItem,
  DroughtHistoryPayload,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export async function fetchCities(): Promise<CityListItem[]> {
  const res = await fetch(`${API_BASE}/api/cities`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load cities");
  return res.json();
}

export async function fetchAirQuality(slug: string): Promise<AirQualityPayload> {
  const res = await fetch(`${API_BASE}/api/air-quality/${slug}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error("City not found");
    throw new Error("Failed to load air quality data");
  }
  return res.json();
}

export async function fetchDroughtHistory(): Promise<DroughtHistoryPayload> {
  const res = await fetch(`${API_BASE}/api/drought-history`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to load drought history");
  return res.json();
}

export async function fetchChatHistory(slug: string): Promise<ChatMessage[]> {
  const res = await fetch(`${API_BASE}/api/chat/${slug}`, { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

export async function postChat(
  citySlug: string,
  question: string,
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ citySlug, question }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? "Chat request failed");
  }
  return res.json();
}

export { API_BASE };
