// B-ASS-08b · (c) — a composição de PRODUÇÃO das dependências dos jobs do canal. Repositórios Prisma (tenant-scoped sob RLS,
// F11) no modo `prisma`, dublês no modo memória. As portas são SÓ as dos provedores LIGADOS (pagamento e nota), com o cofre
// disponível e o canal ligado por env — defesa em profundidade além do handler (R-OBX-4). Nunca grava `enabled = true`.

import { env } from "../../../config/env.js";
import { InMemoryChargeIntentRepository, type ChargeIntentRepository } from "../charges/charge-intent.repository.js";
import { profileCustomerResolver } from "../charges/charge-request.service.js";
import { InMemoryStatementChargeRepository, type StatementChargeRepository } from "../charges/charges.repository.js";
import { InMemoryProviderCustomerStore, persistingCustomerResolver, type ProviderCustomerStore } from "../charges/provider-customer.store.js";
import { InMemoryStatementInvoiceRepository, type StatementInvoiceRepository } from "../invoices/invoices.repository.js";
import { billingHttpClientFromEnv } from "../providers/http/billing-http.client.js";
import { createFocusNfeAdapter } from "../providers/invoice/focusnfe/index.js";
import type { InvoiceProviderPort } from "../providers/invoice/invoice-provider.port.js";
import { createAsaasAdapter } from "../providers/payment/asaas/index.js";
import type { PaymentProviderPort } from "../providers/payment/payment-provider.port.js";
import { missingFiscalFields } from "../providers/provider-config.service.js";
import { getProviderCatalogEntry } from "../providers/provider.catalog.js";
import { createDefaultStatementRuntime, type StatementRuntime } from "../statements/statement.factory.js";
import { InMemoryStatementRepository, type StatementRepository } from "../statements/statement.repository.js";
import { StatementSettlementService, type InvoiceIntents } from "../statements/statement-settlement.service.js";
import { createDefaultVaultRuntime, type VaultRuntime } from "../vault/vault.factory.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository, type StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { memoryWebhookEvents } from "../webhooks/webhook-runtime.js";
import type { ChannelDeps } from "./channel.jobs.js";
import { paymentProviderOn } from "./channel-state.js";
import { taxProfileFromSettings, type InvoiceIssueContextResolver } from "./invoice.dispatch.js";
import { InMemoryOutboxRepository, type OutboxRepository } from "./outbox.repository.js";

/** As portas dos provedores de PAGAMENTO ligados. Canal desligado ou cofre indisponível → nenhuma. B-ASS-08c1b (P4): o
 * predicado "ligado" é o de `paymentProviderOn` (`channel-state.ts`), o MESMO que a rota `/charge` usa. */
export async function enabledPaymentPorts(vault: VaultRuntime): Promise<Record<string, PaymentProviderPort>> {
  const on = await paymentProviderOn(vault);
  if (!on) return {};
  // Portão 1 + 1: só o Asaas tem adaptador ligado neste pacote (Mercado Pago é do B-ASS-15).
  return { asaas: createAsaasAdapter(billingHttpClientFromEnv(on.provider, on.environment), vault.vault) };
}

/** B-ASS-08c1b (P4): o repositório do PEDIDO de cobrança, nos dois modos — a rota `/charge` chama só `requestChargeCreate`
 * sobre ele. No modo memória, compõe os MESMOS dublês dos jobs (o demonstrativo, as cobranças, a fila e o índice). */
export async function createChargeIntentRepository(): Promise<ChargeIntentRepository> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    const statements = (await createDefaultStatementRuntime()).repository;
    const repos = await repositories(statements);
    if (
      !(statements instanceof InMemoryStatementRepository) ||
      !(repos.charges instanceof InMemoryStatementChargeRepository) ||
      !(repos.outbox instanceof InMemoryOutboxRepository) ||
      !(repos.refs instanceof InMemoryStatementRefRepository)
    ) {
      throw new Error("charge_intent_memory_composition_mismatch");
    }
    return new InMemoryChargeIntentRepository({ statements, charges: repos.charges, outbox: repos.outbox, refs: repos.refs });
  }
  const [{ prisma }, { PrismaChargeIntentRepository }] = await Promise.all([import("../../../database/prisma.js"), import("../charges/charge-intent.prisma.js")]);
  return new PrismaChargeIntentRepository(prisma);
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
  /** G12 — o cliente no provedor, guardado no perfil depois do `ensureCustomer`. */
  readonly customers: ProviderCustomerStore;
};

let memory: Omit<Repositories, "events"> | undefined;

/** Só para testes: zera os dublês do modo memória. */
export function resetChannelRuntimeForTests(): void {
  memory = undefined;
}

async function repositories(statements: StatementRepository): Promise<Repositories> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    if (!memory) {
      const charges = new InMemoryStatementChargeRepository();
      memory = {
        // R-OBX-5 (2º conserto do #522): o dublê nasce com o leitor do demonstrativo — o mesmo repositório da baixa — e com a
        // cobrança viva da própria tabela de cobranças; o `totalCents` é o V da adoção (E6′/E7′).
        outbox: new InMemoryOutboxRepository({
          readStatement: async (tenantId, statementId) => {
            const statement = await statements.findStatement(tenantId, statementId);
            if (!statement) return undefined;
            const live = await charges.findLive(tenantId, statementId);
            return { status: statement.status, reopenedAt: statement.reopenedAt, totalCents: statement.totalCents, paidCents: statement.paidCents, hasLiveCharge: live !== undefined };
          },
        }),
        refs: new InMemoryStatementRefRepository(),
        charges,
        invoices: new InMemoryStatementInvoiceRepository(statements),
        customers: new InMemoryProviderCustomerStore(),
      };
    }
    // Conserto da J-530: o dublê do demonstrativo grava a intenção de nota "na transação" (buffer até o fim do trabalho).
    if (statements instanceof InMemoryStatementRepository) statements.attachChannelStores({ outbox: memory.outbox, invoices: memory.invoices });
    return { ...memory, events: memoryWebhookEvents() };
  }
  const [
    { prisma },
    { PrismaOutboxRepository },
    { PrismaWebhookEventRepository },
    { PrismaStatementRefRepository },
    { PrismaStatementChargeRepository },
    { PrismaStatementInvoiceRepository },
    { PrismaProviderCustomerStore },
  ] = await Promise.all([
    import("../../../database/prisma.js"),
    import("./outbox.prisma.js"),
    import("../webhooks/webhook-events.prisma.js"),
    import("../webhooks/statement-refs.prisma.js"),
    import("../charges/charges.prisma.js"),
    import("../invoices/invoices.prisma.js"),
    import("../charges/provider-customer.prisma.js"),
  ]);
  return {
    outbox: new PrismaOutboxRepository(prisma),
    events: new PrismaWebhookEventRepository(prisma),
    refs: new PrismaStatementRefRepository(prisma),
    charges: new PrismaStatementChargeRepository(prisma),
    invoices: new PrismaStatementInvoiceRepository(prisma),
    customers: new PrismaProviderCustomerStore(prisma),
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

/** O provedor de nota da EMISSÃO da rodada (conserto da J-530, §3.1): o ligado; senão o configurado mais recente; senão o
 * Focus NFe (leitura do topo, pergunta 1 ao dono). `enabled` = há porta ligada para ele agora. */
async function invoiceIssueTarget(vault: VaultRuntime, invoiceProvider: string | null, invoicePorts: Readonly<Record<string, InvoiceProviderPort>>): Promise<InvoiceIntents["issueTarget"]> {
  let provider = invoiceProvider;
  if (!provider) {
    const configured = (await vault.configs.list())
      .filter((config) => getProviderCatalogEntry(config.provider)?.kind === "invoice")
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    provider = configured[0]?.provider ?? "focusnfe";
  }
  return { provider, enabled: provider in invoicePorts };
}

/** Monta as dependências de UMA rodada de job (as portas refletem os provedores ligados AGORA). */
export async function createChannelRuntime(): Promise<ChannelDeps> {
  const [vault, statements] = await Promise.all([createDefaultVaultRuntime(), createDefaultStatementRuntime()]);
  const repos = await repositories(statements.repository);
  const [ports, invoicePorts, invoiceProvider] = await Promise.all([enabledPaymentPorts(vault), enabledInvoicePorts(vault), enabledInvoiceProvider(vault)]);
  // (D)/(B): a intenção de nota nasce na transação do settlement — SEMPRE configurada na composição de produção.
  const invoiceIntents: InvoiceIntents = { issueTarget: await invoiceIssueTarget(vault, invoiceProvider, invoicePorts), enabledInvoiceProviders: Object.keys(invoicePorts) };
  return {
    ...repos,
    ports,
    invoicePorts,
    // R-PRF-1 + G12 (§11 (a) do conserto-c2): o cliente vem do PERFIL (`ensureCustomer`, fora de transação) e o id fica
    // guardado no perfil — é ele que o R-WH-5 confere na reconsulta.
    resolveCustomer: persistingCustomerResolver(profileCustomerResolver((tenantId) => statements.billingProfiles.find(tenantId)), repos.customers),
    // [INTX-08r]
    settlement: new StatementSettlementService(statements.repository, statements.service, invoiceIntents),
    statements: statements.repository,
    resolveIssueContext: issueContextResolver(vault, statements),
    // R-WH-5: o cliente do provedor tem de ser o do perfil da organização dona do demonstrativo (o id guardado — G12).
    resolveExpectedCustomerId: (tenantId, provider) => repos.customers.get(tenantId, provider),
  };
}
