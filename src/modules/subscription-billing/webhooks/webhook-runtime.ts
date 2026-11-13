// B-ASS-08b · (b) — a composição de PRODUÇÃO do router do webhook (montado em `src/app.ts` ANTES de `express.json` e do
// `pinoHttp`). Tudo é LAZY: nada de banco, cofre ou adaptador é tocado na montagem — só quando um pedido chega e o canal
// está ligado. O `resolveTarget` é FAIL-CLOSED: canal desligado por env, provedor fora do catálogo, cofre indisponível,
// provedor `enabled = false`, provedor sem verificador ligado neste portão (B-ASS-15) ou QUALQUER erro → `null` → 404
// padrão. Nunca gravamos `enabled = true` aqui (só se LÊ a configuração).

import type { Request, Router } from "express";

import { env } from "../../../config/env.js";
import { getDefaultJobQueue } from "../../../infra/jobs/job.queue.js";
import { billingHttpClientFromEnv } from "../providers/http/billing-http.client.js";
import { createFocusNfeAdapter } from "../providers/invoice/focusnfe/index.js";
import { createAsaasAdapter } from "../providers/payment/asaas/index.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { createDefaultVaultRuntime } from "../vault/vault.factory.js";
import { InMemoryWebhookEventRepository, type WebhookEventRepository } from "./webhook-events.repository.js";
import { createWebhookRateLimiter, type WebhookRateLimiter } from "./webhook.rate-limit.js";
import { createSubscriptionBillingWebhookRouter, webhookClientIp, type WebhookTarget } from "./subscription-billing.webhook.routes.js";

type FlatQuery = Readonly<Record<string, string | string[] | undefined>>;

/** `req.query` do Express pode trazer objetos aninhados; o port só aceita texto. O que não for texto é descartado. */
function flatQuery(query: Request["query"]): FlatQuery {
  const out: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === "string") out[key] = value;
    else if (Array.isArray(value) && value.every((item) => typeof item === "string")) out[key] = value as string[];
  }
  return out;
}

/** Resolve o alvo de um provedor com o canal LIGADO, ou `null` (→ 404). Fail-closed em qualquer erro. */
export async function resolveWebhookTargetFromRuntime(provider: string): Promise<WebhookTarget | null> {
  try {
    if (!env.BILLING_PROVIDERS_ENABLED) return null;
    const entry = getProviderCatalogEntry(provider);
    if (!entry) return null;
    const runtime = await createDefaultVaultRuntime();
    if (runtime.vault.status() !== "available") return null;
    const config = await runtime.configs.get(entry.id);
    if (!config || !config.enabled) return null;
    const client = billingHttpClientFromEnv(entry.id, config.environment);
    if (entry.id === "asaas") {
      const adapter = createAsaasAdapter(client, runtime.vault);
      return {
        provider: entry.id,
        verify: async (input) => {
          const result = await adapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody, query: flatQuery(input.query) });
          return { ok: result.ok, eventId: result.eventId, externalResourceId: result.chargeId, externalReference: result.externalReference, kind: result.kind };
        },
      };
    }
    if (entry.id === "focusnfe") {
      const adapter = createFocusNfeAdapter(client, runtime.vault);
      return {
        provider: entry.id,
        verify: async (input) => {
          const result = await adapter.verifyWebhook({ headers: input.headers, rawBody: input.rawBody });
          return { ok: result.ok, eventId: result.eventId, externalReference: result.externalRef, kind: result.kind };
        },
      };
    }
    // Provedores fora do portão 1 + 1 (B-ASS-15) ainda não têm verificador ligado: inexistente.
    return null;
  } catch {
    return null;
  }
}

let memoryEvents = new InMemoryWebhookEventRepository();
let targetResolverOverride: ((provider: string) => Promise<WebhookTarget | null>) | null = null;
type ReconcileEnqueue = (input: { provider: string; externalEventId: string }) => Promise<void>;
let enqueueOverride: ReconcileEnqueue | null = null;

/** Só para testes: zera o dublê de eventos do modo memória e desfaz o resolvedor e a fila injetados. */
export function resetWebhookRuntimeForTests(): void {
  memoryEvents = new InMemoryWebhookEventRepository();
  targetResolverOverride = null;
  enqueueOverride = null;
}

/** Só para testes do app REAL sem Redis: recebe o que o router enfileiraria em `billing.reconcile-webhook`. */
export function setWebhookEnqueueForTests(enqueue: ReconcileEnqueue | null): void {
  enqueueOverride = enqueue;
}

/** Só para testes do app REAL: simula o canal ligado para um provedor sem cofre nem rede (o resolvedor de produção fica
 * intocado). `null` volta ao resolvedor de produção. */
export function setWebhookTargetResolverForTests(resolver: ((provider: string) => Promise<WebhookTarget | null>) | null): void {
  targetResolverOverride = resolver;
}

/** O armazém de eventos do modo memória — o MESMO para o router e para os jobs (dev e testes). */
export function memoryWebhookEvents(): InMemoryWebhookEventRepository {
  return memoryEvents;
}

export function getMemoryWebhookEventsForTests(): InMemoryWebhookEventRepository {
  return memoryEvents;
}

/** O repositório de eventos é resolvido no 1º uso: memória (dev/teste) ou Prisma (o banco só é aberto com o canal ligado). */
class LazyWebhookEventRepository implements WebhookEventRepository {
  #resolved: Promise<WebhookEventRepository> | undefined;

  #repo(): Promise<WebhookEventRepository> {
    if (env.CORE_SAAS_PERSISTENCE !== "prisma") return Promise.resolve(memoryEvents);
    this.#resolved ??= Promise.all([import("../../../database/prisma.js"), import("./webhook-events.prisma.js")]).then(
      ([{ prisma }, { PrismaWebhookEventRepository }]) => new PrismaWebhookEventRepository(prisma),
    );
    return this.#resolved;
  }

  async insertIfAbsent(...args: Parameters<WebhookEventRepository["insertIfAbsent"]>) {
    return (await this.#repo()).insertIfAbsent(...args);
  }
  async find(...args: Parameters<WebhookEventRepository["find"]>) {
    return (await this.#repo()).find(...args);
  }
  async markStatus(...args: Parameters<WebhookEventRepository["markStatus"]>) {
    return (await this.#repo()).markStatus(...args);
  }
  async listByProvider(...args: Parameters<WebhookEventRepository["listByProvider"]>) {
    return (await this.#repo()).listByProvider(...args);
  }
  async listStale(...args: Parameters<WebhookEventRepository["listStale"]>) {
    return (await this.#repo()).listStale(...args);
  }
}

/** Composição de produção do router (um limitador por processo). B-ASS-08c-wh (P25): o IP do emissor sai dos saltos
 * confiáveis do proxy (`BILLING_WEBHOOK_TRUSTED_PROXY_HOPS`, lido na montagem), nunca de `trust proxy` no app. */
export function createSubscriptionBillingWebhookRouterForApp(
  options: { readonly limiter?: WebhookRateLimiter; readonly trustedProxyHops?: number } = {},
): Router {
  const trustedProxyHops = options.trustedProxyHops ?? env.BILLING_WEBHOOK_TRUSTED_PROXY_HOPS;
  return createSubscriptionBillingWebhookRouter({
    resolveTarget: (provider) => (targetResolverOverride ?? resolveWebhookTargetFromRuntime)(provider),
    events: new LazyWebhookEventRepository(),
    limiter: options.limiter ?? createWebhookRateLimiter(),
    enqueueReconcile: async (input) => {
      if (enqueueOverride) return enqueueOverride(input);
      await getDefaultJobQueue().enqueue("billing.reconcile-webhook", { provider: input.provider, externalEventId: input.externalEventId });
    },
    clientIp: (req: Request) => webhookClientIp(req, trustedProxyHops),
  });
}
