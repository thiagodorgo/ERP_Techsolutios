// B-ASS-08b · (c) — a composição de PRODUÇÃO das dependências dos jobs do canal. Repositórios Prisma (tenant-scoped sob RLS,
// F11) no modo `prisma`, dublês no modo memória. As portas são SÓ as dos provedores LIGADOS (pagamento e nota), com o cofre
// disponível e o canal ligado por env — defesa em profundidade além do handler (R-OBX-4). Nunca grava `enabled = true`.

import { env } from "../../../config/env.js";
import { InMemoryStatementChargeRepository, type StatementChargeRepository } from "../charges/charges.repository.js";
import { InMemoryStatementInvoiceRepository, type StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import { billingHttpClientFromEnv } from "../providers/http/billing-http.client.js";
import { createFocusNfeAdapter } from "../providers/invoice/focusnfe/index.js";
import type { InvoiceProviderPort } from "../providers/invoice/invoice-provider.port.js";
import { createAsaasAdapter } from "../providers/payment/asaas/index.js";
import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import { missingFiscalFields } from "../providers/provider-config.service.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { createDefaultStatementRuntime, type StatementRuntime } from "../statements/statement.factory.js";
import type { StatementRepository } from "../statements/statement.repository.js";
import { StatementSettlementService } from "../statements/statement-settlement.service.js";
import { createDefaultVaultRuntime, type VaultRuntime } from "../vault/vault.factory.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository, type StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { memoryWebhookEvents } from "../webhooks/webhook-runtime.js";
import type { ChannelDeps } from "./channel.jobs.js";
import { taxProfileFromSettings, type InvoiceIssueContextResolver } from "./invoice.dispatch.js";
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

/** As portas dos provedores de NOTA ligados. Canal desligado ou cofre indisponível → nenhuma. */
export async function enabledInvoicePorts(vault: VaultRuntime): Promise<Record<string, InvoiceProviderPort>> {
  if (!env.BILLING_PROVIDERS_ENABLED) return {};
  if (vault.vault.status() !== "available") return {};
  const ports: Record<string, InvoiceProviderPort> = {};
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (!entry || entry.kind !== "invoice" || !config.enabled) continue;
    const client = billingHttpClientFromEnv(entry.id, config.environment);
    // Portão 1 + 1: só o Focus NFe tem adaptador ligado neste pacote (NFE.io e PlugNotas são do B-ASS-15).
    if (entry.id === "focusnfe") ports.focusnfe = createFocusNfeAdapter(client, vault.vault);
  }
  return ports;
}

/** O provedor de NOTA ligado (um por vez — G14), para onde vão `invoice_issue` e `invoice_cancel`. */
async function enabledInvoiceProvider(vault: VaultRuntime): Promise<string | null> {
  for (const config of await vault.configs.list()) {
    const entry = getProviderCatalogEntry(config.provider);
    if (entry?.kind === "invoice" && config.enabled) return entry.id;
  }
  return null;
}

type Repositories = {
  readonly outbox: OutboxRepository;
  readonly events: WebhookEventRepository;
  readonly refs: StatementRefRepository;
  readonly charges: StatementChargeRepository;
  readonly invoices: StatementInvoiceRepository;
};

let memory: Omit<Repositories, "events"> | undefined;

/** Só para testes: zera os dublês do modo memória. */
export function resetChannelRuntimeForTests(): void {
  memory = undefined;
}

async function repositories(statements: StatementRepository): Promise<Repositories> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    memory ??= {
      outbox: new InMemoryOutboxRepository(),
      refs: new InMemoryStatementRefRepository(),
      charges: new InMemoryStatementChargeRepository(),
      invoices: new InMemoryStatementInvoiceRepository(statements),
    };
    return { ...memory, events: memoryWebhookEvents() };
  }
  const [{ prisma }, { PrismaOutboxRepository }, { PrismaWebhookEventRepository }, { PrismaStatementRefRepository }, { PrismaStatementChargeRepository }, { PrismaStatementInvoiceRepository }] =
    await Promise.all([
      import("../../../database/prisma.js"),
      import("./outbox.prisma.js"),
      import("../webhooks/webhook-events.prisma.js"),
      import("../webhooks/statement-refs.prisma.js"),
      import("../charges/charges.prisma.js"),
      import("../invoices/invoices.prisma.js"),
    ]);
  return {
    outbox: new PrismaOutboxRepository(prisma),
    events: new PrismaWebhookEventRepository(prisma),
    refs: new PrismaStatementRefRepository(prisma),
    charges: new PrismaStatementChargeRepository(prisma),
    invoices: new PrismaStatementInvoiceRepository(prisma),
  };
}

/** O contexto fiscal da emissão (plano §4.7/§4.8; decisão do orquestrador de 09/11): emissor = settings fiscais do provedor
 * de nota (`cnpj`, `razaoSocial`, `inscricaoMunicipal` + perfil fiscal); tomador = perfil de cobrança da organização;
 * descrição = plano + competência, sem dado pessoal. Falta → `{ reason }` (vira `NEEDS_REVIEW` visível). */
export function issueContextResolver(vault: VaultRuntime, statements: StatementRuntime): InvoiceIssueContextResolver {
  return async ({ tenantId, provider, statement }) => {
    const entry = getProviderCatalogEntry(provider);
    const config = await vault.configs.get(provider);
    if (!entry || !config) return { reason: "provider_not_configured" };
    if (missingFiscalFields(entry, config.settings).length > 0) return { reason: "fiscal_data_incomplete" };
    const profile = await statements.billingProfiles.find(tenantId);
    if (!profile?.document || !profile.legalName) return { reason: "billing_profile_missing" };
    const version = statement.planVersionId ? await statements.plans.getVersionById(statement.planVersionId) : null;
    const plan = version ? await statements.plans.getPlanById(version.planId) : null;
    const taxProfile = taxProfileFromSettings(config.settings);
    const legalName = config.settings.razaoSocial;
    const municipalRegistration = config.settings.inscricaoMunicipal;
    return {
      environment: config.environment,
      serie: taxProfile.serieDps ?? 1,
      emitter: {
        cnpj: String(config.settings.cnpj ?? ""),
        ...(typeof legalName === "string" && legalName ? { legalName } : {}),
        ...(typeof municipalRegistration === "string" && municipalRegistration ? { municipalRegistration } : {}),
      },
      borrower: {
        document: profile.document,
        name: profile.legalName,
        ...(profile.email ? { email: profile.email } : {}),
        ...(profile.address.cityIbge ? { municipalityCode: profile.address.cityIbge } : {}),
      },
      taxProfile,
      serviceDescription: plan ? `Assinatura ${plan.name} — competência ${statement.period}` : `Assinatura da plataforma — competência ${statement.period}`,
    };
  };
}

/** Monta as dependências de UMA rodada de job (as portas refletem os provedores ligados AGORA). */
export async function createChannelRuntime(): Promise<ChannelDeps> {
  const [vault, statements] = await Promise.all([createDefaultVaultRuntime(), createDefaultStatementRuntime()]);
  const repos = await repositories(statements.repository);
  const [ports, invoicePorts, invoiceProvider] = await Promise.all([enabledPaymentPorts(vault), enabledInvoicePorts(vault), enabledInvoiceProvider(vault)]);
  return {
    ...repos,
    ports,
    invoicePorts,
    settlement: new StatementSettlementService(statements.repository, statements.service),
    statements: statements.repository,
    resolveIssueContext: issueContextResolver(vault, statements),
    // R-WH-5: o cliente do provedor tem de ser o do perfil da organização dona do demonstrativo.
    resolveExpectedCustomerId: async (tenantId, provider) => {
      const profile = await statements.billingProfiles.find(tenantId);
      return provider === "asaas" ? profile?.asaasCustomerId ?? null : null;
    },
    // R-SET-2: demonstrativo PAGO com provedor de nota ligado → `invoice_issue` DURÁVEL (seq 1; a reemissão é da rota /invoice).
    enqueueInvoiceIssue: async ({ tenantId, statementId }) => {
      if (!invoiceProvider) return;
      await repos.outbox.enqueue({ tenantId, statementId, kind: "invoice_issue", provider: invoiceProvider, seq: 1, payload: { seq: 1 } }, new Date());
    },
    // R-SET-2: estorno total/chargeback com nota autorizada → `invoice_cancel` DURÁVEL para o provedor de NOTA ligado.
    enqueueInvoiceCancel: async ({ tenantId, statementId }) => {
      if (!invoiceProvider) return;
      await repos.outbox.enqueue({ tenantId, statementId, kind: "invoice_cancel", provider: invoiceProvider, seq: 1, payload: { reason: "payment_reversed" } }, new Date());
    },
  };
}
