import {
  CHAT_TOOL_DEFINITIONS,
  chartFromToolResult,
  executeTool,
  type ChatToolName,
} from "./chat-tools.js";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type GroqMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: {
        id: string;
        type: "function";
        function: { name: string; arguments: string };
      }[];
    }
  | { role: "tool"; tool_call_id: string; content: string };

async function groqRequest(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  tools?: typeof CHAT_TOOL_DEFINITIONS,
): Promise<{
  message: GroqMessage & { role: "assistant" };
}> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      ...(tools ? { tools, tool_choice: "auto" as const } : {}),
      temperature: 0.2,
      max_tokens: 500,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq request failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: GroqMessage & { role: "assistant" } }[];
  };
  const message = data.choices?.[0]?.message;
  if (!message) throw new Error("Groq returned no message");
  return { message };
}

export async function groqComplete(
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  const { message } = await groqRequest(apiKey, model, [
    { role: "system", content: system },
    { role: "user", content: user },
  ]);
  return message.content?.trim() ?? "";
}

export function buildChatSystemPrompt(): string {
  return `You are CleanAir Alert assistant for India. You MUST call the provided tools to fetch data before stating any numbers.
Never invent pollutant measurements, rain totals, AQI, or city lists.
For drought or rain-deficit questions, use get_drought_places and describe results as rain-deficit stress (Jun–Sep), not an IMD drought declaration.
For current air use get_current_air; outlook use get_outlook; historical air use get_air_history; rain totals use get_rain_years.
Default city slug is given in the user message when relevant.
Keep answers concise (under 120 words). Mention which tool/source you used. Not medical advice.`;
}

export async function groqChatWithTools(
  apiKey: string,
  model: string,
  citySlug: string,
  question: string,
): Promise<{ answer: string; chart: import("./chat-chart.js").ChatChart | null; toolUsed: ChatToolName | null }> {
  const system = buildChatSystemPrompt();
  const messages: GroqMessage[] = [
    { role: "system", content: system },
    {
      role: "user",
      content: `Selected city slug: ${citySlug}. Question: ${question}`,
    },
  ];

  let lastTool: ChatToolName | null = null;
  let lastToolResult: unknown = null;

  for (let step = 0; step < 3; step++) {
    const { message } = await groqRequest(
      apiKey,
      model,
      messages,
      CHAT_TOOL_DEFINITIONS,
    );

    if (message.tool_calls?.length) {
      messages.push({
        role: "assistant",
        content: message.content,
        tool_calls: message.tool_calls,
      });
      for (const call of message.tool_calls) {
        const name = call.function.name as ChatToolName;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}") as Record<
            string,
            unknown
          >;
        } catch {
          args = {};
        }
        if (name === "get_drought_places" && args.year == null) {
          args.citySlug = citySlug;
        } else if (!args.citySlug) {
          args.citySlug = citySlug;
        }
        const result = await executeTool(name, args, citySlug);
        lastTool = name;
        lastToolResult = result;
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(result),
        });
      }
      continue;
    }

    const answer = message.content?.trim() ?? "";
    const chart =
      lastTool && lastToolResult
        ? chartFromToolResult(lastTool, lastToolResult)
        : null;
    return { answer, chart, toolUsed: lastTool };
  }

  return {
    answer: "I could not finish fetching data for that question.",
    chart:
      lastTool && lastToolResult
        ? chartFromToolResult(lastTool, lastToolResult)
        : null,
    toolUsed: lastTool,
  };
}

/** @deprecated use runStubChat from chat-tools.ts */
export function stubChatAnswer(
  category: string,
  direction: string | null,
  question?: string,
): string {
  void category;
  void direction;
  void question;
  return "Use runStubChat instead.";
}
