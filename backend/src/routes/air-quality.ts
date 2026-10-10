import { Router } from "express";
import { getAirQuality } from "../services/air-quality.js";

export const airQualityRouter = Router();

airQualityRouter.get("/api/air-quality/:slug", async (req, res) => {
  const data = await getAirQuality(req.params.slug);
  if (!data) {
    res.status(404).json({ error: "City not found" });
    return;
  }
  res.json(data);
});
