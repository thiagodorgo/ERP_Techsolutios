// B-ASS-08 · F2 — o router PRÓPRIO do webhook (plano §3.5, §4.8 S11). Montado em `src/app.ts` em
// `/api/v1/webhooks/billing` ANTES de `express.json`, do `pinoHttp` e de QUALQUER `attachAuthenticatedActor` (o
// provedor não tem token nosso). Ordem de decisão fail-closed:
//
//   (1) ANTES de qualquer parser: canal desligado por env, provedor desconhecido, provedor `enabled=false` ou cofre
//       indisponível → o router NÃO responde: tira os cabeçalhos de segredo do pedido e chama `next()`, e quem responde
//       é o 404 padrão do próprio app (0.43) — IDÊNTICO ao de rota inexistente POR CONSTRUÇÃO, para qualquer corpo
//       (B-ASS-08b; antes o router emitia o corpo 0.43 por conta própria, mas fora de `/api/v1` o 404 do app é o HTML do
//       Express, e desligado ficava distinguível de inexistente). Nada gravado (R-WH-1).
//   (2) parser LOCAL `express.raw({ type: "*/*", limit: "256kb" })` → corpo > 256 KB → 413.
//   (3) teto global do provedor (600/min) e bloqueio por IP com excesso de falhas → 429.
//   (4) `verifyWebhook` do adaptador — falha → 401 sem motivo (e conta a falha do IP).
//   (5) `INSERT billing_webhook_events ON CONFLICT DO NOTHING` — conflito → 200 (replay ignorado).
//   (6) enfileira `billing.reconcile-webhook` → 200 `{}` em < 2 s. NENHUMA decisão de dinheiro acontece aqui (R-WH-4).

import { createHash } from "node:crypto";
import { isIP } from "node:net";

import express, { type NextFunction, type Request, type Response, type Router } from "express";

import type { WebhookEventRepository } from "./webhook-events.repository.js";
import type { WebhookRateLimiter } from "./webhook.rate-limit.js";

/** O corpo 404 PADRÃO da casa (o handler final de `/api/v1` em `src/app.ts`). O router NÃO o emite: com a decisão negativa ele
 * chama `next()` e é o app que responde — a constante fica para os testes conferirem a identidade. */
export const WEBHOOK_NOT_FOUND_BODY = {
  error: { code: "NOT_FOUND", reason: "route_not_found", message: "Route not found." },
} as const;

/** Onde o router é montado no app (sob `/api/v1`, para o 404 do app ser o mesmo da rota inexistente). */
export const BILLING_WEBHOOK_MOUNT_PATH = "/api/v1/webhooks/billing";

/** O caminho do webhook de um provedor, relativo à origem do app. */
export function billingWebhookPath(provider: string): string {
  return `${BILLING_WEBHOOK_MOUNT_PATH}/${encodeURIComponent(provider)}`;
}

/** A URL pública registrada no provedor: `BILLING_WEBHOOK_PUBLIC_BASE_URL` + o caminho (sem barra dupla). */
export function billingWebhookPublicUrl(publicBaseUrl: string, provider: string): string {
  return `${publicBaseUrl.replace(/\/+$/, "")}${billingWebhookPath(provider)}`;
}

/** Cabeçalhos em que os provedores mandam o segredo/assinatura do webhook. Na decisão negativa o pedido segue para o app
 * (`next()`) e passa pelo `pinoHttp`, que loga `req.headers`: estes saem do pedido ANTES, para nunca irem ao log (R-WH-7).
 * O `authorization` NÃO está aqui (PR530-01): ele é o cabeçalho da NOSSA autenticação, e a rota inexistente o entrega ao
 * `attachAuthenticatedActor` (token inválido → 401); apagá-lo deixava o webhook desligado distinguível dela. Nenhum
 * provedor do portão 1 + 1 manda segredo nele, e o `pinoHttp` já o redige (`req.headers.authorization`, src/app.ts). */
export const WEBHOOK_SECRET_HEADERS = ["asaas-access-token", "x-webhook-token", "x-signature", "x-hub-signature", "x-hub-signature-256"] as const;

export function stripWebhookSecretHeaders(req: Request): void {
  for (const name of WEBHOOK_SECRET_HEADERS) delete req.headers[name];
}

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

/**
 * Resolve o IP do emissor sem habilitar `trust proxy` global no Express.
 *
 * Cada salto confiável acrescenta a própria entrada à direita do `X-Forwarded-For`: por isso o cliente fica na
 * `hops`-ésima posição contada da direita. Zero saltos nunca confia no cabeçalho. Cabeçalho ausente, curto ou com a
 * entrada selecionada inválida falha fechado para o endereço do socket.
 */
export function webhookClientIp(req: Request, trustedProxyHops: number): string {
  const socketIp = req.socket.remoteAddress ?? "unknown";
  if (!Number.isInteger(trustedProxyHops) || trustedProxyHops <= 0) return socketIp;

  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded !== "string") return socketIp;
  const hops = forwarded.split(",").map((entry) => entry.trim());
  const candidate = hops.at(-trustedProxyHops);
  return candidate && isIP(candidate) !== 0 ? candidate : socketIp;
}

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

  router.post("/:provider", (req, res, next) => {
    void handle(req, res, next).catch(next);
  });

  async function handle(req: Request, res: Response, next: NextFunction): Promise<void> {
    const provider = typeof req.params.provider === "string" ? req.params.provider : "";
    // (1) ANTES de qualquer parser. Decisão negativa → o pedido segue para o app SEM os cabeçalhos de segredo e o 404 padrão
    // do app responde (idêntico ao de rota inexistente por construção; nem o corpo foi lido).
    const target = await deps.resolveTarget(provider);
    if (!target) {
      stripWebhookSecretHeaders(req);
      next();
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

    // (4) autenticidade. Conserto da J-530 (C2-A3): o verificador que LANÇA (adaptador ou cofre fora do ar) responde o 503 JSON
    // da casa, sem pilha nem detalhe, e não conta como falha do IP — o provedor reenvia.
    let verification: WebhookVerification;
    // [WH-ERR]
    try { verification = await target.verify({ headers: req.headers, rawBody, query: req.query }); } catch { res.status(503).json({ error: { code: "temporarily_unavailable" } }); return; }
    if (!verification.ok) {
      deps.limiter.recordFailure(ip);
      res.status(401).json({ error: { code: "unauthorized" } });
      return;
    }

    // (5) grava o evento (só digest, nunca o corpo). Replay (mesmo id) → 200 sem novo trabalho.
    const digest = sha256Hex(rawBody);
    const externalEventId = verification.eventId ?? digest;
    const at = now();
    try {
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
    } catch {
      // Banco ou fila indisponíveis: 503 SEM detalhe (nada do erro vai ao provedor — R-WH-7) para o provedor reenviar; o
      // evento já gravado sem job é retomado pelo poll-pending (R-WH-8). Nunca o 500 HTML do Express.
      res.status(503).json({ error: { code: "temporarily_unavailable" } });
    }
  }

  return router;
}
