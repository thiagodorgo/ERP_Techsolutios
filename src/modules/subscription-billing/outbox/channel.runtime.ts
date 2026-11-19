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
import { StatementSettlementService } from "../statements/statement-settlement.service.js";
import { createDefaultVaultRuntime, type VaultRuntime } from "../vault/vault.factory.js";
import type { WebhookEventRepository } from "../webhooks/webhook-events.repository.js";
import { InMemoryStatementRefRepository, type StatementRefRepository } from "../webhooks/statement-refs.repository.js";
import { memoryWebhookEvents } from "../webhooks/webhook-runtime.js";
import type { ChannelDeps } from "./channel.jobs.js";
import { invoiceIntentsNow, invoiceProvidersOn, paymentProviderOn } from "./channel-state.js";
import { taxProfileFromSettings, type InvoiceIssueContextResolver } from "./invoice.dispatch.js";
import { InMemoryOutboxRepository, type OutboxRepository } from "./outbox.repository.js";
import { createPersistedDispatchAuditSink } from "./dispatch-audit.js";

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

/** As portas dos provedores de NOTA ligados. Canal desligado ou cofre indisponível → nenhuma. B-ASS-08c2 (§4.1 item 1): o
 * predicado "ligado" é o de `invoiceProvidersOn` (`channel-state.ts`), o MESMO que a intenção de nota usa; aqui só se montam
 * os adaptadores. */
export async function enabledInvoicePorts(vault: VaultRuntime): Promise<Record<string, InvoiceProviderPort>> {
  const on = await invoiceProvidersOn(vault);
  if (on.length === 0) return {};
  const configs = await vault.configs.list();
  const ports: Record<string, InvoiceProviderPort> = {};
  for (const provider of on) {
    const config = configs.find((candidate) => candidate.provider === provider && candidate.enabled);
    if (!config) continue;
    // Portão 1 + 1: só o Focus NFe tem adaptador ligado neste pacote (NFE.io e PlugNotas são do B-ASS-15).
    if (provider === "focusnfe") ports.focusnfe = createFocusNfeAdapter(billingHttpClientFromEnv(provider, config.environment), vault.vault);
  }
  return ports;
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
            return { status: statement.status, reopenedAt: statement.reopenedAt, totalCents: statement.totalCents, paidCents: statement.paidCents, hasLiveCharge: live !== undefined, providerPayments: (await statements.listPayments(tenantId, statementId)).map((payment) => ({ source: payment.source, externalChargeId: payment.externalChargeId })) };
          },
        }),
        refs: new InMemoryStatementRefRepository(),
        charges,
        invoices: new InMemoryStatementInvoiceRepository(statements),
        customers: new InMemoryProviderCustomerStore(),
      };
    }
    // Conserto da J-530: o dublê do demonstrativo grava a intenção de nota "na transação" (buffer até o fim do trabalho).
    if (statements instanceof InMemoryStatementRepository) statements.attachChannelStores({ outbox: memory.outbox as InMemoryOutboxRepository, invoices: memory.invoices, charges: memory.charges as InMemoryStatementChargeRepository, refs: memory.refs as InMemoryStatementRefRepository });
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

/** B-ASS-08c2 (plano §4.5, §4.6): as organizações da plataforma, sem a de sistema (o precedente do fechamento,
 * `subscription-billing.jobs.ts`). É leitura de PLATAFORMA da tabela de organizações (sem dado de organização); o que vem
 * depois roda sob a RLS de cada uma. No modo memória, as organizações que têm demonstrativo no dublê. */
async function listPlatformTenantIds(statements: StatementRepository): Promise<readonly string[]> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    if (!(statements instanceof InMemoryStatementRepository)) throw new Error("channel_memory_composition_mismatch");
    return statements.tenantIds();
  }
  const { prisma } = await import("../../../database/prisma.js");
  const tenants = await prisma.tenant.findMany({ select: { id: true, slug: true }, orderBy: { created_at: "asc" } });
  return tenants.filter((tenant) => (tenant.slug ?? "").toLowerCase() !== "platform").map((tenant) => tenant.id);
}

/** Monta as dependências de UMA rodada de job (as portas refletem os provedores ligados AGORA). */
export async function createChannelRuntime(): Promise<ChannelDeps> {
  const [vault, statements] = await Promise.all([createDefaultVaultRuntime(), createDefaultStatementRuntime()]);
  const repos = await repositories(statements.repository);
  const [ports, invoicePorts, invoiceIntents] = await Promise.all([enabledPaymentPorts(vault), enabledInvoicePorts(vault), invoiceIntentsNow(vault)]);
  // (D)/(B): a intenção de nota nasce na transação do settlement — SEMPRE configurada na composição de produção. B-ASS-08c2
  // (§4.1 item 1): o `issueTarget` (o ligado; senão o configurado mais recente; senão o Focus NFe) e os ligados, pelo MESMO
  // predicado das portas (`invoiceIntentsNow`, `channel-state.ts`).
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
    // B-ASS-08c2 (plano §4.5): a varredura da nota no despacho e o poll da nota por organização.
    listTenantIds: () => listPlatformTenantIds(statements.repository),
    invoiceRecovery: statements.service,
    onAudit: env.CORE_SAAS_PERSISTENCE === "prisma"
      ? createPersistedDispatchAuditSink((await import("../../../database/prisma.js")).prisma)
      : async () => {},
  };
}
