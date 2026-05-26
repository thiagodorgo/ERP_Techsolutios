import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { coreSaasService, createCoreSaasRouter } from "./modules/core-saas/index.js";
import { healthRouter } from "./routes/health.routes.js";

export const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const logger = pinoHttp({
  level: env.LOG_LEVEL,
});

app.use(logger);

app.use("/api/v1", healthRouter);
app.use("/api/v1", createCoreSaasRouter(coreSaasService));

