import { Router } from "express";
import { getAirQuality } from "../services/air-quality.js";
import { groqChatWithTools } from "../services/groq.js";
import { getPool } from "../db/pool.js";
import { type ChatChart } from "../services/chat-chart.js";
import { runStubChat } from "../services/chat-tools.js";

const memoryMessages: {
  id: number;
  citySlug: string;
  question: string;
  answer: string;
  chart: ChatChart | null;
  createdAt: string;
}[] = [];
let memoryId = 1;

export const chatRouter = Router();

chatRouter.post("/api/chat", async (req, res) => {
  const { citySlug, question } = req.body as {
    citySlug?: string;
    question?: string;
  };
  if (!citySlug || !question?.trim()) {
    res.status(400).json({ error: "citySlug and question are required" });
    return;
  }

  const context = await getAirQuality(citySlug);
  if (!context) {
    res.status(404).json({ error: "City not found" });
    return;
  }

  let answer: string;
  let chart: ChatChart | null = null;
  const chatMode = process.env.CHAT_MODE ?? "";
  const groqKey = process.env.GROQ_API_KEY;

  if (chatMode === "stub" || !groqKey) {
    if (!groqKey && chatMode !== "stub") {
      res.status(503).json({ error: "GROQ_API_KEY is not configured" });
      return;
    }
    const stub = await runStubChat(question.trim(), citySlug);
    answer = stub.answer;
    chart = stub.chart;
  } else {
    try {
      const live = await groqChatWithTools(
        groqKey,
        process.env.GROQ_MODEL ?? "openai/gpt-oss-20b",
        citySlug,
        question.trim(),
      );
      answer = live.answer;
      chart = live.chart;
    } catch (e) {
      res.status(502).json({
        error: e instanceof Error ? e.message : "Groq request failed",
      });
      return;
    }
  }

  const pool = getPool();
  let id = memoryId++;
  let createdAt = new Date().toISOString();
  if (pool) {
    const result = await pool.query(
      `INSERT INTO chat_messages (city_slug, question, answer, chart)
       VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      [citySlug, question.trim(), answer, chart ? JSON.stringify(chart) : null],
    );
    id = result.rows[0].id;
    createdAt = result.rows[0].created_at;
  } else {
    memoryMessages.unshift({
      id,
      citySlug,
      question: question.trim(),
      answer,
      chart,
      createdAt,
    });
  }

  res.json({
    id,
    citySlug,
    question: question.trim(),
    answer,
    chart,
    createdAt,
  });
});

chatRouter.get("/api/chat/:citySlug", async (req, res) => {
  const pool = getPool();
  if (!pool) {
    res.json(
      memoryMessages.filter((m) => m.citySlug === req.params.citySlug).slice(0, 20),
    );
    return;
  }
  const { rows } = await pool.query(
    `SELECT id, city_slug AS "citySlug", question, answer, chart, created_at AS "createdAt"
     FROM chat_messages WHERE city_slug = $1 ORDER BY created_at DESC LIMIT 20`,
    [req.params.citySlug],
  );
  res.json(rows);
});
