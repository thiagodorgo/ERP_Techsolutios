// B-ASS-08 · F2 — o router PRÓPRIO do webhook (plano §3.5, §4.8 S11). Montado em `src/app.ts` ANTES de `express.json`
// e do `pinoHttp`, SEM `attachAuthenticatedActor` (F13). Ordem de decisão fail-closed:
//
//   (1) ANTES de qualquer parser: canal desligado por env, provedor desconhecido, provedor `enabled=false` ou cofre
//       indisponível → 404 com o corpo PADRÃO da casa, nada gravado (R-WH-1). Vale para 257 KB e JSON malformado,
//       porque a decisão vem antes do parser local — nem 413 nem 400 escapam.
//   (2) parser LOCAL `express.raw({ type: "*/*", limit: "256kb" })` → corpo > 256 KB → 413.
//   (3) teto global do provedor (600/min) e bloqueio por IP com excesso de falhas → 429.
//   (4) `verifyWebhook` do adaptador — falha → 401 sem motivo (e conta a falha do IP).
//   (5) `INSERT billing_webhook_events ON CONFLICT DO NOTHING` — conflito → 200 (replay ignorado).
//   (6) enfileira `billing.reconcile-webhook` → 200 `{}` em < 2 s. NENHUMA decisão de dinheiro acontece aqui (R-WH-4).

import { createHash } from "node:crypto";

import express, { type Request, type Response, type Router } from "express";

import type { WebhookEventRepository } from "./webhook-events.repository.js";
import type { WebhookRateLimiter } from "./webhook.rate-limit.js";

/** O corpo 404 PADRÃO da casa (o mesmo do handler `/api/v1` em `src/app.ts`): desligado é indistinguível de inexistente. */
export const WEBHOOK_NOT_FOUND_BODY = {
  error: { code: "NOT_FOUND", reason: "route_not_found", message: "Route not found." },
} as const;

/** O que a verificação do adaptador devolve ao router, unificado entre pagamento e nota. */
export type WebhookVerification = {
  readonly ok: boolean;
  readonly eventId?: string;
  readonly externalResourceId?: string;
  readonly externalReference?: string;
  readonly kind?: string;
};

/** O alvo resolvido de um provedor com o canal LIGADO. `resolveTarget` devolve `null` para forçar o 404 (R-WH-1). */
export type WebhookTarget = {
  readonly provider: string;
  verify(input: { headers: Request["headers"]; rawBody: string; query: Request["query"] }): Promise<WebhookVerification>;
};

export type WebhookRouterDeps = {
  /** `null` ⇒ 404 (provedor desconhecido, canal desligado por env, `enabled=false` ou cofre indisponível). */
  resolveTarget(provider: string): Promise<WebhookTarget | null>;
  readonly events: WebhookEventRepository;
  readonly limiter: WebhookRateLimiter;
  /** Enfileira `billing.reconcile-webhook` (F13 liga na fila real; o teste injeta um coletor). */
  enqueueReconcile(input: { provider: string; externalEventId: string }): Promise<void>;
  readonly now?: () => Date;
  /** IP de origem (F13 injeta o real; prod NUNCA confia em header forjável por padrão). */
  clientIp?(req: Request): string;
};

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isPayloadTooLarge(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && (error as { type?: string }).type === "entity.too.large");
}

export function createSubscriptionBillingWebhookRouter(deps: WebhookRouterDeps): Router {
  const router = express.Router();
  const now = deps.now ?? (() => new Date());
  const clientIp = deps.clientIp ?? ((req: Request) => req.ip ?? "unknown");
  // Parser LOCAL (o `type: "*/*"` cobre qualquer content-type; o HMAC exige o corpo CRU).
  const rawParser = express.raw({ type: () => true, limit: "256kb" });

  router.post("/:provider", (req, res) => {
    void handle(req, res);
  });

  async function handle(req: Request, res: Response): Promise<void> {
    const provider = typeof req.params.provider === "string" ? req.params.provider : "";
    // (1) ANTES de qualquer parser.
    const target = await deps.resolveTarget(provider);
    if (!target) {
      res.status(404).json(WEBHOOK_NOT_FOUND_BODY);
      return;
    }

    // (2) parser local → 413.
    try {
      await new Promise<void>((resolve, reject) => {
        rawParser(req, res, (error) => (error ? reject(error) : resolve()));
      });
    } catch (error) {
      if (isPayloadTooLarge(error)) {
        res.status(413).json({ error: { code: "payload_too_large" } });
        return;
      }
      // Corpo ilegível por outro motivo: trata como vazio (a verificação falha fechado adiante).
    }
    const rawBody = Buffer.isBuffer(req.body) ? (req.body as Buffer).toString("utf8") : "";

    // (3) teto global do provedor e bloqueio por IP.
    const ip = clientIp(req);
    if (!deps.limiter.allowGlobal(provider)) {
      res.status(429).json({ error: { code: "rate_limited" } });
      return;
    }
    if (deps.limiter.isIpBlocked(ip)) {
      res.status(429).json({ error: { code: "rate_limited" } });
      return;
    }

    // (4) autenticidade.
    const verification = await target.verify({ headers: req.headers, rawBody, query: req.query });
    if (!verification.ok) {
      deps.limiter.recordFailure(ip);
      res.status(401).json({ error: { code: "unauthorized" } });
      return;
    }

    // (5) grava o evento (só digest, nunca o corpo). Replay (mesmo id) → 200 sem novo trabalho.
    const digest = sha256Hex(rawBody);
    const externalEventId = verification.eventId ?? digest;
    const at = now();
    const inserted = await deps.events.insertIfAbsent(
      {
        provider,
        externalEventId,
        bodyDigest: digest,
        signatureOk: true,
        externalResourceId: verification.externalResourceId ?? null,
        externalReference: verification.externalReference ?? null,
      },
      at,
    );
    if (!inserted.created) {
      res.status(200).json({});
      return;
    }

    // (6) enfileira o reconcile (o corpo NÃO decide — a baixa vem da reconsulta no job). 200 rápido.
    await deps.enqueueReconcile({ provider, externalEventId });
    res.status(200).json({});
  }

  return router;
}
