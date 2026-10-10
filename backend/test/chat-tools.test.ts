import test from "node:test";
import assert from "node:assert/strict";
import {
  pickStubTool,
  runStubChat,
  executeTool,
} from "../src/services/chat-tools.js";

test("pickStubTool routes drought questions", () => {
  assert.equal(
    pickStubTool("in 2022 what are the city in india with drought condition"),
    "get_drought_places",
  );
  assert.equal(
    pickStubTool("How has air quality changed over the last 10 years?"),
    "get_air_history",
  );
});

test("runStubChat answers 2022 drought with Pune not Very Poor", async () => {
  process.env.AIR_QUALITY_SOURCE = "sample";
  const { answer, chart } = await runStubChat(
    "in 2022 what are the city in india with drought condition",
    "delhi",
  );
  assert.match(answer, /Pune/i);
  assert.doesNotMatch(answer, /Very Poor/);
  assert.doesNotMatch(answer, /official drought/i);
  assert.ok(chart?.points?.length);
});

test("get_drought_places returns affected list for 2022", async () => {
  process.env.AIR_QUALITY_SOURCE = "sample";
  const result = (await executeTool(
    "get_drought_places",
    { year: 2022 },
    "delhi",
  )) as { affected: { name: string }[]; year: number };
  assert.equal(result.year, 2022);
  assert.ok(result.affected.some((p) => p.name === "Pune"));
});
