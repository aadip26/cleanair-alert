import { Router } from "express";
import { getClimatePayload } from "../services/air-quality.js";

export const climateRouter = Router();

climateRouter.get("/api/climate", async (_req, res) => {
  const data = await getClimatePayload();
  res.json(data);
});
