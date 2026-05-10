import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

import { env } from "./config/env.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(
  pinoHttp({
    level: env.LOG_LEVEL,
  }),
);

app.use("/api/v1", healthRouter);

