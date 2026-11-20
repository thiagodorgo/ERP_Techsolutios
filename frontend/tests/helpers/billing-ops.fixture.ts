// B-ASS-10c-OPERACAO — a fixture da tela de operação da cobrança: 3 organizações com demonstrativos de 6 meses, fila de
// envio (em revisão e com falha), notas pendentes, perfil incompleto e o canal (pagamento e nota). Dá o MODELO ÚNICO
// (`fixtureModel`) e as respostas JSON do servidor de mentira (`json*`), no formato das rotas do #608. Nenhum valor aqui é
// conta: são textos decimais fixos, como o servidor manda.

import { buildBillingOpsView, INITIAL_UI, type BillingOpsUi, type BillingOpsView } from "../../src/modules/platform/billing-operations/billing-ops.state";
import { mapStatement } from "../../src/modules/platform/billing-operations/billing-ops.adapter";
import type { BillingOpsData, OrganizationReading, Provider, QueueLine } from "../../src/modules/platform/billing-operations/billing-ops.types";

export const TODAY = "2026-11-20";
export const CURRENT_MONTH = "2026-11";
export const MONTH = "2026-10";

export const ORGS = [
  { id: "org-litoral", name: "Guinchos Litoral Norte" },
  { id: "org-vale", name: "Auto Socorro Vale do Paraíba" },
  { id: "org-patio", name: "Pátio Central Guarulhos" },
] as const;

const history = [{ at: "2026-11-01T03:00:00.000Z", event: "closed", by: "system", totalCents: 189000 }];

/** O demonstrativo no formato da rota (`toStatementDto`). */
export function statementJson(id: string, period: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    tenantId: "NAO-MOSTRAR",
    period,
    status: "closed",
    chargeStatus: "none",
    invoiceStatus: "none",
    baseAmount: "1490.00",
    usersExtra: 2,
    usersExtraAmount: "120.00",
    storageExtraAmount: "80.00",
    trackingAmount: "200.00",
    trackingBilledVehicles: 10,
    adjustmentsAmount: "0.00",
    creditsAppliedAmount: "0.00",
    totalAmount: "1890.00",
    paidAmount: "0.00",
    balance: "1890.00",
    dueDate: "2026-11-25",
    history,
    ...overrides,
  };
}

export const STATEMENTS: Readonly<Record<string, Record<string, unknown>[]>> = {
  "org-litoral": [
    statementJson("st-lit-10", MONTH),
    statementJson("st-lit-09", "2026-09", { status: "paid", paidAmount: "1890.00", balance: "0.00", chargeStatus: "confirmed", invoiceStatus: "authorized" }),
    statementJson("st-lit-11", CURRENT_MONTH, { status: "open", totalAmount: null, balance: null, paidAmount: null, dueDate: null }),
  ],
  "org-vale": [
    statementJson("st-vale-10", MONTH, { chargeStatus: "pending", dueDate: "2026-11-10", totalAmount: "980.00", balance: "980.00" }),
    statementJson("st-vale-09", "2026-09", { status: "closed", balance: "980.00", totalAmount: "980.00", dueDate: "2026-10-10" }),
  ],
  "org-patio": [statementJson("st-patio-10", MONTH, { status: "paid", paidAmount: "1520.00", balance: "0.00", totalAmount: "1520.00", chargeStatus: "confirmed", invoiceStatus: "none" })],
};

export function queueJson(id: string, statementId: string, kind: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { id, statementId, kind, provider: "asaas", status: "NEEDS_REVIEW", skipReason: null, attempts: 1, lastError: null, externalId: null, occurredAt: "2026-11-18T17:22:00.000Z", nextAttemptAt: null, updatedAt: "2026-11-18T17:22:00.000Z", ...overrides };
}

export const REVIEW_LINE: QueueLine = { id: "11111111-1111-4111-8111-111111111111", statementId: "st-vale-10", kind: "charge_cancel", status: "NEEDS_REVIEW", attempts: 1, lastError: null, occurredAt: "2026-11-18T17:22:00.000Z", updatedAt: "2026-11-18T17:22:00.000Z" };
export const FAILED_LINE: QueueLine = { id: "22222222-2222-4222-8222-222222222222", statementId: "st-lit-10", kind: "charge_create", status: "FAILED", attempts: 3, lastError: "provider_unavailable", occurredAt: "2026-11-19T09:00:00.000Z", updatedAt: "2026-11-19T09:00:00.000Z" };

export function provider(overrides: Partial<Provider> = {}): Provider {
  return {
    provider: "asaas",
    label: "Asaas",
    kind: "payment",
    environment: "sandbox",
    enabled: false,
    configured: true,
    settings: {},
    fiscalDataComplete: true,
    missing: [],
    credentials: [{ kind: "api_token", last4: "9F2A", createdAt: "2026-11-19T10:00:00.000Z" }],
    credentialsReadable: true,
    pendingHomologationCount: 2,
    lastTest: null,
    ...overrides,
  };
}

export const PROVIDERS: readonly Provider[] = [
  provider(),
  provider({ provider: "focusnfe", label: "Focus NFe", kind: "invoice", fiscalDataComplete: false, missing: ["cnpj", "cTribNac"], credentials: [] }),
];

export type FixtureOptions = {
  readonly failedOrgs?: readonly string[];
  readonly loadingOrgs?: readonly string[];
  readonly providers?: BillingOpsData["providers"];
  readonly stale?: boolean;
  readonly empty?: boolean;
};

export function fixtureData(options: FixtureOptions = {}): BillingOpsData {
  const readings: Record<string, OrganizationReading> = {};
  for (const org of ORGS) {
    if (options.failedOrgs?.includes(org.id)) readings[org.id] = { state: "failed" };
    else if (options.loadingOrgs?.includes(org.id)) readings[org.id] = { state: "loading" };
    else
      readings[org.id] = {
        state: "ok",
        statements: options.empty ? [] : (STATEMENTS[org.id] ?? []).map(mapStatement),
        review: org.id === "org-vale" ? [REVIEW_LINE] : [],
        failedLines: org.id === "org-litoral" ? [FAILED_LINE] : [],
        backlog: org.id === "org-patio" ? [{ statementId: "st-patio-10", period: MONTH, category: "no_intent" }] : [],
        profile: org.id === "org-litoral" ? { complete: false, missing: ["document", "address.postalCode"] } : { complete: true, missing: [] },
      };
  }
  return {
    organizations: ORGS.map((org) => ({ ...org })),
    listState: "ok",
    readings,
    providers: options.providers ?? { state: "ok", providers: PROVIDERS },
    stale: options.stale ?? false,
    readAt: "2026-11-20T13:31:00.000Z",
  };
}

export function fixtureModel(ui: BillingOpsUi = INITIAL_UI, options: FixtureOptions = {}, serverOff: boolean | null = null): BillingOpsView {
  return buildBillingOpsView({ data: fixtureData(options), month: MONTH, ui, today: TODAY, currentMonth: CURRENT_MONTH, serverOff });
}

// ---- o servidor de mentira -----------------------------------------------------------------------------------------------
export type Call = { readonly method: string; readonly url: string; readonly body: unknown };
export type Reply = { readonly status?: number; readonly data?: unknown; readonly reason?: string; readonly details?: unknown; readonly delayMs?: number; readonly gate?: Promise<void> };
export type Route = (call: Call) => Reply | undefined;

export function installFakeServer() {
  const state = { calls: [] as Call[], routes: [] as Route[], inFlight: 0, maxInFlight: 0 };
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = { method: init?.method ?? "GET", url: String(input), body: init?.body ? JSON.parse(String(init.body)) : undefined };
    state.calls.push(call);
    state.inFlight += 1;
    state.maxInFlight = Math.max(state.maxInFlight, state.inFlight);
    try {
      for (const route of state.routes) {
        const reply = route(call);
        if (reply) {
          if (reply.delayMs) await new Promise((resolve) => setTimeout(resolve, reply.delayMs));
          if (reply.gate) await reply.gate;
          const status = reply.status ?? 200;
          const body = status >= 400 ? { error: { code: "ERRO", reason: reply.reason ?? "erro", message: "falha", ...(reply.details ? { details: reply.details } : {}) } } : { data: reply.data };
          return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
        }
      }
      return new Response(JSON.stringify({ error: { code: "SEM_ROTA", reason: "sem_rota", message: call.url } }), { status: 599, headers: { "Content-Type": "application/json" } });
    } finally {
      state.inFlight -= 1;
    }
  }) as typeof fetch;
  return {
    state,
    serve(...routes: Route[]) {
      state.calls = [];
      state.routes = routes;
      state.inFlight = 0;
      state.maxInFlight = 0;
    },
    writes: () => state.calls.filter((call) => call.method !== "GET"),
    reads: () => state.calls.filter((call) => call.method === "GET"),
  };
}

export const on =
  (method: string, pathPart: string | RegExp, reply: Reply | ((call: Call) => Reply)): Route =>
  (call) =>
    call.method === method && (typeof pathPart === "string" ? call.url.includes(pathPart) : pathPart.test(call.url)) ? (typeof reply === "function" ? reply(call) : reply) : undefined;
