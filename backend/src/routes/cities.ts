import { Router } from "express";
import { getCities } from "../services/air-quality.js";

export const citiesRouter = Router();

citiesRouter.get("/api/cities", async (_req, res) => {
  const cities = await getCities();
  res.json(cities);
});
