// B-ASS-08b · (c) — a composição de PRODUÇÃO das dependências dos jobs do canal. Repositórios Prisma (tenant-scoped sob RLS,
// F11) no modo `prisma`, dublês no modo memória. As portas são SÓ as dos provedores de pagamento LIGADOS, com o cofre
// disponível e o canal ligado por env — defesa em profundidade além do handler (R-OBX-4). Nunca grava `enabled = true`.

import { env } from "../../../config/env.js";
import { InMemoryStatementChargeRepository, type StatementChargeRepository } from "../charges/charges.repository.js";
import { billingHttpClientFromEnv } from "../providers/http/billing-http.client.js";
import { createAsaasAdapter } from "../providers/payment/asaas/index.js";
import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { createDefaultStatementRuntime } from "../statements/statement.factory.js";
import { StatementSettlementService } from "../statements/statement-settlement.service.js";
import { createDefaultVaultRuntime, type VaultRuntime } from "../vault/vault.factory.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository, type StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { memoryWebhookEvents } from "../webhooks/webhook-runtime.js";
import type { ChannelDeps } from "./channel.jobs.js";
import { InMemoryOutboxRepository, type OutboxRepository } from "./outbox.repository.js";

/** As portas dos provedores de PAGAMENTO ligados. Canal desligado ou cofre indisponível → nenhuma. */
export async function enabledPaymentPorts(vault: VaultRuntime): Promise<Record<string, PaymentProviderPort>> {
  if (!env.BILLING_PROVIDERS_ENABLED) return {};
  if (vault.vault.status() !== "available") return {};
  const ports: Record<string, PaymentProviderPort> = {};
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (!entry || entry.kind !== "payment" || !config.enabled) continue;
    const client = billingHttpClientFromEnv(entry.id, config.environment);
    // Portão 1 + 1: só o Asaas tem adaptador ligado neste pacote (Mercado Pago é do B-ASS-15).
    if (entry.id === "asaas") ports.asaas = createAsaasAdapter(client, vault.vault);
  }
  return ports;
}

/** O provedor de NOTA ligado (um por vez — G14), para onde vai o `invoice_cancel`. */
async function enabledInvoiceProvider(vault: VaultRuntime): Promise<string | null> {
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (entry?.kind === "invoice" && config.enabled) return entry.id;
  }
  return null;
}

let memory: { outbox: OutboxRepository; refs: StatementRefRepository; charges: StatementChargeRepository } | undefined;

/** Só para testes: zera os dublês do modo memória. */
export function resetChannelRuntimeForTests(): void {
  memory = undefined;
}

async function repositories(): Promise<{ outbox: OutboxRepository; events: WebhookEventRepository; refs: StatementRefRepository; charges: StatementChargeRepository }> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    memory ??= { outbox: new InMemoryOutboxRepository(), refs: new InMemoryStatementRefRepository(), charges: new InMemoryStatementChargeRepository() };
    return { ...memory, events: memoryWebhookEvents() };
  }
  const [{ prisma }, { PrismaOutboxRepository }, { PrismaWebhookEventRepository }, { PrismaStatementRefRepository }, { PrismaStatementChargeRepository }] = await Promise.all([
    import("../../../database/prisma.js"),
    import("./outbox.prisma.js"),
    import("../webhooks/webhook-events.prisma.js"),
    import("../webhooks/statement-refs.prisma.js"),
    import("../charges/charges.prisma.js"),
  ]);
  return {
    outbox: new PrismaOutboxRepository(prisma),
    events: new PrismaWebhookEventRepository(prisma),
    refs: new PrismaStatementRefRepository(prisma),
    charges: new PrismaStatementChargeRepository(prisma),
  };
}

/** Monta as dependências de UMA rodada de job (as portas refletem os provedores ligados AGORA). */
export async function createChannelRuntime(): Promise<ChannelDeps> {
  const [vault, statements, repos] = await Promise.all([createDefaultVaultRuntime(), createDefaultStatementRuntime(), repositories()]);
  const ports = await enabledPaymentPorts(vault);
  const invoiceProvider = await enabledInvoiceProvider(vault);
  return {
    ...repos,
    ports,
    settlement: new StatementSettlementService(statements.repository, statements.service),
    statements: statements.repository,
    // R-WH-5: o cliente do provedor tem de ser o do perfil da organização dona do demonstrativo.
    resolveExpectedCustomerId: async (tenantId, provider) => {
      const profile = await statements.billingProfiles.find(tenantId);
      return provider === "asaas" ? profile?.asaasCustomerId ?? null : null;
    },
    // R-SET-2: estorno total/chargeback com nota autorizada → `invoice_cancel` DURÁVEL para o provedor de NOTA ligado.
    enqueueInvoiceCancel: async ({ tenantId, statementId }) => {
      if (!invoiceProvider) return;
      await repos.outbox.enqueue({ tenantId, statementId, kind: "invoice_cancel", provider: invoiceProvider, seq: 1, payload: { reason: "payment_reversed" } }, new Date());
    },
  };
}
