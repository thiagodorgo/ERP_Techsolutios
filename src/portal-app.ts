import cors from "cors";
import express, { type Express, type Router } from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { createAuthorityPortalRouter } from "./modules/authority/index.js";
import { createOwnerPortalRouter } from "./modules/owner-portal/index.js";

// Ω5P PR-16 (D-Ω5P-PORTAL-01) — o portal PÚBLICO é um app EXPRESS DISTINTO do core (src/app.ts): helmet/CORS
// PRÓPRIOS, porta própria (PORTAL_PORT), DTOs próprios, SEM attachAuthenticatedActor, SEM nada sob /api/v1.
// Deployável como container separado (builds/BFFs isolados — D-Ω5P-11). Modelo de ameaças ESTUDO §7:
//   - NENHUM reuso de sessão/cookie/JWT do ERP: não há middleware de auth aqui; a sessão do portal é jose com
//     secret próprio (PORTAL_SESSION_SECRET), emitida DENTRO do BFF.
//   - CORS próprio com gate de produção (env.ts) que rejeita vazio/curinga; sem `credentials:true` (posse, não
//     cookie).
//   - X-Robots-Tag: noindex — a superfície pública NÃO é indexável (anti-descoberta).
//   - trust proxy PERMANECE desligado (default) → req.ip = socket, não X-Forwarded-For spoofável (o rate-limit
//     por IP não é burlável por header forjado). Em produção, atrás de proxy confiável, configurar a contagem de
//     saltos exata no deploy (fronteira de ativação humana — D-Ω5P-PORTAL-07).
export function createPortalApp(options: { ownerRouter?: Router; authorityRouter?: Router } = {}): Express {
  const app = express();

  app.use(helmet());
  // CORS do PORTAL (independente do core). Vazio (dev/test) → reflete a origem; produção → allowlist do env.ts.
  app.use(cors({ origin: env.PORTAL_CORS_ORIGINS.length > 0 ? env.PORTAL_CORS_ORIGINS : true }));
  // Corpos do portal são minúsculos (placa+Renavam+PoW); limite apertado reduz superfície de abuso.
  app.use(express.json({ limit: "16kb" }));

  // Anti-indexação em TODA resposta do portal.
  app.use((_request, response, next) => {
    response.setHeader("X-Robots-Tag", "noindex, nofollow");
    next();
  });

  app.use(
    pinoHttp({
      level: env.LOG_LEVEL,
      // Redige cabeçalhos sensíveis; o portal não usa Authorization do ERP, mas a redação é defensiva.
      redact: ["req.headers.authorization", "req.headers.cookie"],
    }),
  );

  app.use("/portal/v1/owner", options.ownerRouter ?? createOwnerPortalRouter());
  // Ω5P PR-18a — 2º BFF ISOLADO (authority-portal): login anti-brute-force da autoridade credenciada. Aditivo — o
  // ownerRouter segue intacto. MESMO app Express (helmet/CORS/noindex compartilhados), rotas próprias, sessão JWE
  // com secret PRÓPRIO (PORTAL_AUTHORITY_SESSION_SECRET). NUNCA sob /api/v1, NUNCA reusa auth do ERP.
  app.use("/portal/v1/authority", options.authorityRouter ?? createAuthorityPortalRouter());

  app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found." } });
  });

  return app;
}
