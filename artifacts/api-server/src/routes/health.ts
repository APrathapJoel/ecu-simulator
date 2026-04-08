import { Router, type IRouter } from "express";
import { healthCheckResponse } from "@workspace/api-zod";
import { isDatabaseConnected } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", (req, res) => {
  const dbConnected = isDatabaseConnected();
  const status = dbConnected ? "ok" : "degraded";
  
  const data = healthCheckResponse.parse({ 
    status,
    database: dbConnected ? "connected" : "disconnected",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString()
  });
  
  res.status(dbConnected ? 200 : 503).json(data);
});

router.get("/healthz/ready", (req, res) => {
  const dbConnected = isDatabaseConnected();
  
  if (process.env.NODE_ENV === "production" && !dbConnected) {
    return res.status(503).json({
      status: "not_ready",
      reason: "Database not connected in production"
    });
  }
  
  return res.json({
    status: "ready",
    database: dbConnected ? "connected" : "disconnected"
  });
});

export default router;
