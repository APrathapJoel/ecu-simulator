import { Router, type IRouter } from "express";
import { healthCheckResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = healthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

export default router;
