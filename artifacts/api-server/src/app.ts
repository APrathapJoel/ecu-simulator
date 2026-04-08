import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import authRoutes from "./routes/auth";
import cookieParser from "cookie-parser";

const app: Express = express();

// Allow the dashboard origin to send cookies (needed for session auth on Render)
const dashboardHost = process.env.DASHBOARD_URL;
const dashboardOrigin = dashboardHost ? `https://${dashboardHost}` : undefined;
app.use(
  cors({
    origin: dashboardOrigin
      ? [dashboardOrigin, "http://localhost:5173"]
      : true, // allow all in local dev
    credentials: true,
  })
);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api", router);
app.use("/api", authRoutes);

export default app;

