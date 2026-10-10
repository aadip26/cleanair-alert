import { Router } from "express";
import { getDroughtHistory } from "../services/drought-history.js";

export const droughtRouter = Router();

droughtRouter.get("/api/drought-history", async (_req, res) => {
  const data = await getDroughtHistory();
  res.json(data);
});
