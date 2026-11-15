// Controle (J-571, C3-A2): o app Express que termina com o tratador final passa na G4e.
import express from "express";

import { installFinalErrorHandler } from "../../../src/infra/http/final-error-handler.js";
import { createLogger } from "../../../src/infra/logging/logger.js";

export function criarAppComTratador() {
  const app = express();
  app.get("/x", (_request, response) => {
    response.json({ ok: true });
  });
  installFinalErrorHandler(app, createLogger());
  return app;
}
