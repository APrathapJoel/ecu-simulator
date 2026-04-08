import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import authRoutes from "./routes/auth";
import cookieParser from "cookie-parser";

const app: Express = express();

// Reflect the requesting origin — works with credentials on any domain (Render, localhost, etc.)
app.use(
  cors({
    origin: true,
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

