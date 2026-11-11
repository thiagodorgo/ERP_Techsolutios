import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const listeners = new Map<string, Set<EventListener>>();

  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: (event: string, listener: EventListener) => {
      const eventListeners = listeners.get(event) ?? new Set<EventListener>();
      eventListeners.add(listener);
      listeners.set(event, eventListeners);
    },
    removeEventListener: (event: string, listener: EventListener) => {
      listeners.get(event)?.delete(listener);
    },
    dispatchEvent: (event: Event) => {
      listeners.get(event.type)?.forEach((listener) => listener(event));
      return true;
    },
    setTimeout: globalThis.setTimeout.bind(globalThis),
  };

  Object.defineProperty(globalThis, "window", { configurable: true, value: windowStub });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { getElementById: () => null, createElement: () => ({ click() {}, set href(_v: string) {}, set download(_v: string) {} }) },
  });

  return { clear: () => storage.clear(), localStorage };
}

const browser = installBrowserTestGlobals();

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Gestor Operacional",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

async function renderOrcamentos(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredSessionPermissions } = await import("./helpers/session-permissions");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { OrcamentosPage } = await import("../src/modules/registry/service-quotes/pages/OrcamentosPage");

  setStoredSessionPermissions(mockSessionForEmail("gestor.web@techsolutions.example"), permissions);
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={["/operations/quotes"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <OrcamentosPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("orçamentos renderiza cabeçalho, filtro de situação, ação de criar e estado vazio (D-007)", async () => {
  const html = await renderOrcamentos(["service_quotes:read", "service_quotes:create", "service_quotes:update"]);

  assert.match(html, /Orçamentos/);
  assert.match(html, /Preço congelado a partir da Tarifa vigente/);
  assert.match(html, /Novo orçamento/);
  assert.match(html, /Nenhum orçamento encontrado/);
  assert.match(html, /Rascunho/);
  assert.match(html, /Aprovado/);
  // Linguagem PT-BR de negócio: nunca "tenant".
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("orçamentos esconde 'Novo orçamento' sem permissão de criação", async () => {
  const html = await renderOrcamentos(["service_quotes:read"]);
  assert.match(html, /Orçamentos/);
  assert.match(html, /Nenhum orçamento encontrado/);
  assert.doesNotMatch(html, /Novo orçamento/);
});

test("modal de criação mostra origem do preço (Tarifa/Manual) e serviço obrigatório", async () => {
  const { ServiceQuoteFormModal } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteFormModal");
  const html = renderToString(<ServiceQuoteFormModal context={{}} onClose={() => undefined} onSaved={() => undefined} />);
  assert.match(html, /Novo orçamento/);
  assert.match(html, /Origem do preço/);
  assert.match(html, /Tarifa publicada/);
  assert.match(html, /Manual/);
  assert.match(html, /Serviço/);
});

// Veto cognicao-visual (ciclo 1) — serviço/OS/cliente viram SELECTS de rótulo humano (mata o input de
// UUID). Aqui o modal recebe as opções e renderiza o NOME do serviço, não o id.
test("modal usa selects de referência com rótulo humano (não UUID)", async () => {
  const { ServiceQuoteFormModal } = await import("../src/modules/registry/service-quotes/components/ServiceQuoteFormModal");
  const html = renderToString(
    <ServiceQuoteFormModal
      context={{}}
      services={[{ id: "svc-uuid-1", label: "Guincho Pesado" }]}
      customers={[{ id: "cus-uuid-1", label: "Transportadora Alfa" }]}
      workOrders={[{ id: "wo-uuid-1", label: "OS-2026-001" }]}
      onClose={() => undefined}
      onSaved={() => undefined}
    />,
  );
  const selectCount = (html.match(/<select/g) ?? []).length;
  assert.equal(selectCount >= 4, true); // serviço + OS + cliente + origem do preço
  assert.match(html, /Guincho Pesado/);
  assert.match(html, /Transportadora Alfa/);
  assert.match(html, /OS-2026-001/);
});

// ---------- adapter (formatação + validação + B1) ----------

test("formatMoney emite valor COM moeda (lição B1)", async () => {
  const { formatMoney } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const out = formatMoney(1234.5, "BRL");
  assert.match(out, /1\.234,50/);
  assert.match(out, /R\$/);
});

test("getServiceQuoteStatusLabel/Tone traduz e colore por situação", async () => {
  const { getServiceQuoteStatusLabel, getServiceQuoteStatusTone } = await import(
    "../src/modules/registry/service-quotes/service-quotes.adapter"
  );
  assert.equal(getServiceQuoteStatusLabel("draft"), "Rascunho");
  assert.equal(getServiceQuoteStatusLabel("approved"), "Aprovado");
  assert.equal(getServiceQuoteStatusLabel("rejected"), "Rejeitado");
  assert.equal(getServiceQuoteStatusLabel("void"), "Anulado");
  assert.equal(getServiceQuoteStatusTone("approved"), "success");
  assert.equal(getServiceQuoteStatusTone("rejected"), "danger");
  assert.equal(getServiceQuoteStatusTone("void"), "default");
  assert.equal(getServiceQuoteStatusTone("draft"), "info");
});

test("getServiceQuotePriceSourceLabel traduz origem", async () => {
  const { getServiceQuotePriceSourceLabel } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  assert.equal(getServiceQuotePriceSourceLabel("tariff"), "Tarifa");
  assert.equal(getServiceQuotePriceSourceLabel("manual"), "Manual");
});

test("validateServiceQuote exige serviço", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const errors = validateServiceQuote({ serviceCatalogId: "", priceSource: "tariff" });
  assert.equal(errors.some((e) => e.field === "serviceCatalogId"), true);
});

test("validateServiceQuote exige valor unitário no preço manual", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const missing = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "manual" });
  assert.equal(missing.some((e) => e.field === "unitPrice"), true);
  const ok = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "manual", unitPrice: 10 });
  assert.equal(ok.some((e) => e.field === "unitPrice"), false);
});

test("validateServiceQuote rejeita quantidade <= 0", async () => {
  const { validateServiceQuote } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const errors = validateServiceQuote({ serviceCatalogId: "svc", priceSource: "tariff", quantity: 0 });
  assert.equal(errors.some((e) => e.field === "quantity"), true);
});

test("adaptServiceQuotesResponse aceita snake_case e emite DTO completo (B1)", async () => {
  const { adaptServiceQuotesResponse } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const data = adaptServiceQuotesResponse({
    items: [
      {
        id: "q1",
        work_order_id: "wo1",
        customer_id: "c1",
        service_catalog_id: "svc1",
        source_tariff_id: "t1",
        frozen_unit_price: 250,
        frozen_currency: "BRL",
        quantity: 2,
        frozen_total: 500,
        frozen_at: "2026-07-13T00:00:00.000Z",
        price_source: "tariff",
        status: "draft",
        is_active: true,
        created_at: "2026-07-13T00:00:00.000Z",
      },
    ],
    pagination: { limit: 20, offset: 0, total: 1 },
  });
  assert.equal(data.items.length, 1);
  const row = data.items[0]!;
  assert.equal(row.frozenUnitPrice, 250);
  assert.equal(row.frozenCurrency, "BRL");
  assert.equal(row.frozenTotal, 500);
  assert.equal(row.workOrderId, "wo1");
  assert.equal(row.customerId, "c1");
  assert.equal(row.priceSource, "tariff");
});

test("filterServiceQuotes filtra por situação de cadastro (isActive) e por busca", async () => {
  const { filterServiceQuotes } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const base = {
    id: "q",
    workOrderId: "wo-123",
    customerId: null,
    serviceCatalogId: "svc-abc",
    sourceTariffId: null,
    frozenUnitPrice: 10,
    frozenCurrency: "BRL",
    quantity: 1,
    frozenTotal: 10,
    frozenAt: "2026-07-13T00:00:00.000Z",
    priceSource: "tariff" as const,
    status: "draft" as const,
    isActive: true,
    createdAt: "2026-07-13T00:00:00.000Z",
  };
  const items = [base, { ...base, id: "q2", isActive: false, workOrderId: "wo-999" }];
  assert.equal(filterServiceQuotes(items, { search: "", isActive: "active" }).length, 1);
  assert.equal(filterServiceQuotes(items, { search: "", isActive: "inactive" }).length, 1);
  assert.equal(filterServiceQuotes(items, { search: "wo-999", isActive: "all" }).length, 1);
});

test("filterServiceQuotes casa o RÓTULO resolvido (nome do serviço), não só o UUID", async () => {
  const { filterServiceQuotes } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  const item = {
    id: "q",
    workOrderId: null,
    customerId: null,
    serviceCatalogId: "svc-uuid-xyz",
    sourceTariffId: null,
    frozenUnitPrice: 10,
    frozenCurrency: "BRL",
    quantity: 1,
    frozenTotal: 10,
    frozenAt: "2026-07-13T00:00:00.000Z",
    priceSource: "tariff" as const,
    status: "draft" as const,
    isActive: true,
    createdAt: "2026-07-13T00:00:00.000Z",
  };
  const resolve = (q: typeof item) => (q.serviceCatalogId === "svc-uuid-xyz" ? ["Guincho Pesado"] : []);
  // sem resolver: buscar "guincho" não acha (só casa o UUID)
  assert.equal(filterServiceQuotes([item], { search: "guincho", isActive: "all" }).length, 0);
  // com resolver: casa o nome
  assert.equal(filterServiceQuotes([item], { search: "guincho", isActive: "all" }, resolve).length, 1);
});

test("shortRef encurta UUID e formatQuantity usa pt-BR", async () => {
  const { shortRef, formatQuantity } = await import("../src/modules/registry/service-quotes/service-quotes.adapter");
  assert.equal(shortRef("1234567890abcdef"), "12345678…");
  assert.equal(shortRef(null), "—");
  assert.equal(formatQuantity(2), "2");
});

// ---------- B-SAN3-08 (item 40) — aprovar com destino: diálogo único, regra de destino, desfechos ----------

const APPROVE_MODEL = "../src/modules/registry/service-quotes/service-quote-approve.model";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-/i;
const DESTINO_OBRIGATORIO = "Endereço de destino obrigatório para este serviço.";

type ApprovePayloadSeen = Record<string, unknown>;
function spyApprove(workOrderId: string | null = "wo-criada-1") {
  const calls: ApprovePayloadSeen[] = [];
  const approve = async (payload: ApprovePayloadSeen) => {
    calls.push(payload);
    return { workOrderId };
  };
  return { calls, approve };
}

// CE-G1 (a) fonte GERADA (varre frontend/src/** inteiro), (b) membro não previsto = NEGAR (só o arquivo da definição e o
// diálogo podem chamar), (c) mutações M10a/M10b/M10c do plano (acrescentadas ao fim de QuoteTab.tsx e OrcamentosPage.tsx).
const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const APPROVE_DEFINITION = "modules/registry/service-quotes/service-quotes.service.ts";
const APPROVE_DIALOG = "modules/registry/service-quotes/components/ServiceQuoteApproveDialog.tsx";
const APPROVE_ROUTE_RE = /service-quotes\b[^\n]*\/approve/;

function listFrontendSources(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) listFrontendSources(path, acc);
    else if (/\.tsx?$/.test(name)) acc.push(path);
  }
  return acc;
}

type ApproveCall = { readonly file: string; readonly line: number; readonly form: "texto" | "alias" | "namespace" };

function escapeIdentifier(identifier: string): string {
  return identifier.replace(/\$/g, "\\$");
}

function scanApproveCallers() {
  const files = listFrontendSources(SRC_ROOT).map((path) => ({
    rel: relative(SRC_ROOT, path).split("\\").join("/"),
    text: readFileSync(path, "utf8"),
  }));
  const calls: ApproveCall[] = [];
  const routes: Array<{ readonly file: string; readonly line: number }> = [];
  for (const { rel, text } of files) {
    const lines = text.split(/\r?\n/);
    // (b) alias: `import { approveServiceQuote as X }`; X seguido de `(` é chamada.
    const aliases: string[] = [];
    for (const match of text.matchAll(/import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'][^"']+["']/g)) {
      for (const spec of match[1].matchAll(/\bapproveServiceQuote\s+as\s+([A-Za-z_$][\w$]*)/g)) aliases.push(spec[1]);
    }
    // (c) namespace: `import * as ns`; `ns.approveServiceQuote(` é chamada.
    const namespaces = [...text.matchAll(/import\s+\*\s+as\s+([A-Za-z_$][\w$]*)\s+from\s*["'][^"']+["']/g)].map((m) => m[1]);
    lines.forEach((content, index) => {
      const line = index + 1;
      // (a) toda ocorrência textual de `approveServiceQuote(` (pega também chamada sem import).
      if (/\bapproveServiceQuote\s*\(/.test(content)) calls.push({ file: rel, line, form: "texto" });
      for (const alias of aliases) {
        if (new RegExp(`(?<![\\w$.])${escapeIdentifier(alias)}\\s*\\(`).test(content)) calls.push({ file: rel, line, form: "alias" });
      }
      for (const ns of namespaces) {
        if (new RegExp(`(?<![\\w$.])${escapeIdentifier(ns)}\\s*\\.\\s*approveServiceQuote\\s*\\(`).test(content)) {
          calls.push({ file: rel, line, form: "namespace" });
        }
      }
      if (APPROVE_ROUTE_RE.test(content)) routes.push({ file: rel, line });
    });
  }
  return { fileCount: files.length, calls, routes };
}

test("[G-APPROVE] só o diálogo chama approveServiceQuote, e só o service monta a rota de aprovação do orçamento", (t) => {
  const scan = scanApproveCallers();
  const fora = scan.calls.filter((call) => call.file !== APPROVE_DEFINITION && call.file !== APPROVE_DIALOG);
  const rotaFora = scan.routes.filter((route) => route.file !== APPROVE_DEFINITION);
  t.diagnostic(
    `[G-APPROVE] arquivos=${scan.fileCount} · chamadas=${scan.calls.length} (no diálogo=${scan.calls.filter((c) => c.file === APPROVE_DIALOG).length}) · fora=${fora.length} · rotas=${scan.routes.length} · rota fora=${rotaFora.length}`,
  );
  // Denominadores: a varredura enxerga o código, a definição, a chamada legítima do diálogo e a rota do service.
  assert.ok(scan.fileCount > 100, `arquivos varridos em frontend/src: ${scan.fileCount}`);
  assert.ok(scan.calls.some((c) => c.file === APPROVE_DEFINITION), "a definição de approveServiceQuote foi vista");
  assert.ok(scan.calls.some((c) => c.file === APPROVE_DIALOG), "a chamada do diálogo foi vista");
  assert.ok(scan.routes.some((r) => r.file === APPROVE_DEFINITION), "a rota do service foi vista");
  assert.deepEqual(fora.map((c) => `${c.file}:${c.line} (${c.form})`), [], "chamada de approveServiceQuote fora do diálogo de aprovação");
  assert.deepEqual(rotaFora.map((r) => `${r.file}:${r.line}`), [], "rota de aprovação do orçamento montada fora do service");
});

test("[P2] serviço exige destino e o destino está vazio: approve não é chamado; com destino, é chamado com ele", async () => {
  const { submitApprove } = await import(APPROVE_MODEL);
  const spy = spyApprove();
  const blocked = await submitApprove({ approve: spy.approve }, { destinationRule: "required" });
  assert.equal(spy.calls.length, 0);
  assert.ok(blocked.kind === "invalid" && blocked.errors.includes(DESTINO_OBRIGATORIO), JSON.stringify(blocked));

  const sent = await submitApprove({ approve: spy.approve }, { destinationRule: "required", destinationAddress: "Oficina Central, 200" });
  assert.equal(spy.calls.length, 1);
  assert.equal(spy.calls[0].destinationAddress, "Oficina Central, 200");
  assert.deepEqual(sent, { kind: "approved", workOrderId: "wo-criada-1" });
});

test("[R-A4] destino por pino, 0/0 e faixa", async () => {
  const { submitApprove, buildServiceQuoteApproveBody } = await import(APPROVE_MODEL);
  const pino = spyApprove();
  const ok = await submitApprove(
    { approve: pino.approve },
    { destinationRule: "required", destinationLatitude: "-23.55", destinationLongitude: "-46.63" },
  );
  assert.equal(ok.kind, "approved");
  assert.equal(pino.calls.length, 1, "só o pino válido basta como destino");
  const body = buildServiceQuoteApproveBody(pino.calls[0]);
  assert.equal(body.destinationLatitude, -23.55);
  assert.equal(body.destinationLongitude, -46.63);

  const zero = spyApprove();
  const sentinela = await submitApprove({ approve: zero.approve }, { destinationRule: "required", destinationLatitude: "0", destinationLongitude: "0" });
  assert.equal(zero.calls.length, 0, "0/0 não é destino");
  assert.equal(sentinela.kind, "invalid");

  const faixa = spyApprove();
  const fora = await submitApprove({ approve: faixa.approve }, { destinationRule: "required", destinationLatitude: "91", destinationLongitude: "-46.63" });
  assert.equal(faixa.calls.length, 0);
  assert.ok(fora.kind === "invalid" && fora.errors.includes("Latitude do destino inválida."), JSON.stringify(fora));

  const origem = spyApprove();
  const origemFora = await submitApprove({ approve: origem.approve }, { destinationRule: "optional", serviceLongitude: "181" });
  assert.equal(origem.calls.length, 0);
  assert.ok(origemFora.kind === "invalid" && origemFora.errors.includes("Longitude inválida."), JSON.stringify(origemFora));
});

test("[R-A5] derivação da regra de destino: lançar e null viram unknown; a flag do serviço vira required ou optional", async () => {
  const { loadDestinationRule } = await import(APPROVE_MODEL);
  assert.equal(
    await loadDestinationRule(async () => {
      throw new Error("falha de leitura");
    }),
    "unknown",
  );
  assert.equal(await loadDestinationRule(async () => null), "unknown");
  assert.equal(await loadDestinationRule(async () => ({ requiresDestination: true })), "required");
  assert.equal(await loadDestinationRule(async () => ({ requiresDestination: false })), "optional");
});

test("[R-A5] unknown não bloqueia: sem destino, o approve é chamado e o servidor decide", async () => {
  const { submitApprove } = await import(APPROVE_MODEL);
  const spy = spyApprove();
  const result = await submitApprove({ approve: spy.approve }, { destinationRule: "unknown" });
  assert.equal(spy.calls.length, 1);
  assert.equal(result.kind, "approved");
});

test("[R-A5] required bloqueia: sem destino, 0 chamadas e a mensagem do destino obrigatório", async () => {
  const { submitApprove } = await import(APPROVE_MODEL);
  const spy = spyApprove();
  const result = await submitApprove({ approve: spy.approve }, { destinationRule: "required", serviceAddress: "Rua da Coleta, 10" });
  assert.equal(spy.calls.length, 0);
  assert.ok(result.kind === "invalid" && result.errors.includes(DESTINO_OBRIGATORIO), JSON.stringify(result));
});

test("[P3] 422 por reason: destino obrigatório, vencido e sem itens têm cada um a sua mensagem; a recusa por destino mantém o diálogo aberto", async () => {
  const { ApiError } = await import("../src/services/api/client");
  const { approveErrorOutcome, submitApprove } = await import(APPROVE_MODEL);
  assert.deepEqual(approveErrorOutcome(new ApiError(422, "Dados inválidos.", "WORK_ORDER_UNPROCESSABLE", "destination_required")), {
    message: "Este serviço exige endereço de destino.",
    action: "keep_open_require_destination",
  });
  assert.deepEqual(approveErrorOutcome(new ApiError(422, "Dados inválidos.", "SERVICE_QUOTE_UNPROCESSABLE", "quote_expired")), {
    message: "Este orçamento está vencido. Atualize a validade antes de aprovar.",
    action: "close_and_reload",
  });
  assert.deepEqual(approveErrorOutcome(new ApiError(422, "Dados inválidos.", "SERVICE_QUOTE_UNPROCESSABLE", "quote_empty")), {
    message: "Este orçamento não tem itens com valor para aprovar.",
    action: "close_and_reload",
  });
  const refused = await submitApprove(
    {
      approve: async () => {
        throw new ApiError(422, "Dados inválidos.", "WORK_ORDER_UNPROCESSABLE", "destination_required");
      },
    },
    { destinationRule: "unknown" },
  );
  assert.ok(refused.kind === "failed" && refused.outcome.action === "keep_open_require_destination", JSON.stringify(refused));
});

test("[R-A2] desfechos por status e reason: 409, 403, 404, outro 422, 5xx e rede", async () => {
  const { ApiError } = await import("../src/services/api/client");
  const { approveErrorOutcome } = await import(APPROVE_MODEL);
  const naoConfirmada = "Não foi possível confirmar a aprovação. Antes de tentar de novo, confira na lista de ordens de serviço se a OS foi criada.";
  const casos: Array<[Error, string, string]> = [
    [new ApiError(422, "x", "WORK_ORDER_UNPROCESSABLE", "invalid_service_reference"), "keep_open", "Não foi possível criar a ordem de serviço. Confira os endereços."],
    [new ApiError(409, "x", "SERVICE_QUOTE_CONFLICT", "quote_already_approved"), "close_and_reload_notice", "Este orçamento já foi aprovado e já gerou uma ordem de serviço. A lista foi atualizada."],
    [new ApiError(409, "x", "SERVICE_QUOTE_CONFLICT", "quote_not_approvable"), "close_and_reload", "Este orçamento não está mais em rascunho. A lista foi atualizada."],
    [new ApiError(409, "x"), "close_and_reload", "Este orçamento não está mais em rascunho. A lista foi atualizada."],
    [new ApiError(403, "x", "FORBIDDEN", "permission_required"), "blocked", "Você não tem permissão para aprovar orçamentos nesta organização."],
    [new ApiError(404, "x", "SERVICE_QUOTE_NOT_FOUND", "not_found"), "close_and_reload", "Este orçamento não foi encontrado nesta organização. A lista foi atualizada."],
    [new ApiError(500, "x"), "keep_open", naoConfirmada],
    [new Error("rede"), "keep_open", naoConfirmada],
  ];
  for (const [error, action, message] of casos) {
    const outcome = approveErrorOutcome(error);
    const status = (error as { status?: number }).status ?? "rede";
    assert.deepEqual(outcome, { action, message }, `${status}/${(error as { reason?: string }).reason ?? "-"} → ${JSON.stringify(outcome)}`);
  }
});

test("[R-A2] envio duplo: o segundo envio em voo é ignorado e não chega ao servidor", async () => {
  const { createApproveSubmitter } = await import(APPROVE_MODEL);
  const calls: ApprovePayloadSeen[] = [];
  const pending: Array<(value: { workOrderId: string | null }) => void> = [];
  const submit = createApproveSubmitter({
    approve: (payload: ApprovePayloadSeen) => {
      calls.push(payload);
      return new Promise<{ workOrderId: string | null }>((resolve) => pending.push(resolve));
    },
  });
  const input = { destinationRule: "optional" as const };
  const first = submit(input);
  const second = submit(input);
  assert.equal(calls.length, 1, "o segundo envio chegou ao servidor");
  assert.deepEqual(await second, { kind: "ignored" });
  pending[0]({ workOrderId: "wo-1" });
  assert.deepEqual(await first, { kind: "approved", workOrderId: "wo-1" });

  const third = submit(input);
  assert.equal(calls.length, 2, "depois de concluído, um novo envio volta a chamar");
  pending[1]({ workOrderId: "wo-2" });
  assert.deepEqual(await third, { kind: "approved", workOrderId: "wo-2" });
});

test("[R-A9] modo de acionamento vazio não bloqueia e não vai no corpo", async () => {
  const { submitApprove, buildServiceQuoteApproveBody } = await import(APPROVE_MODEL);
  const spy = spyApprove();
  const result = await submitApprove({ approve: spy.approve }, { destinationRule: "optional" });
  assert.equal(result.kind, "approved");
  assert.equal(spy.calls.length, 1);
  assert.equal("activationMode" in spy.calls[0], false);
  assert.equal("activationMode" in buildServiceQuoteApproveBody(spy.calls[0]), false);

  const espacos = spyApprove();
  await submitApprove({ approve: espacos.approve }, { destinationRule: "optional", activationMode: "   " });
  assert.equal(espacos.calls.length, 1);
  assert.equal("activationMode" in buildServiceQuoteApproveBody(espacos.calls[0]), false);

  const preenchido = spyApprove();
  await submitApprove({ approve: preenchido.approve }, { destinationRule: "optional", activationMode: " guincho " });
  assert.equal(buildServiceQuoteApproveBody(preenchido.calls[0]).activationMode, "guincho");
});

test("[acabamento] o aviso de sucesso da tela Orçamentos não imprime o identificador da OS e traz o link abrir OS", async () => {
  process.env.VITE_USE_MOCKS = "true";
  const { approvedNoticeFor, ActionNoticeBody } = await import("../src/modules/registry/service-quotes/pages/OrcamentosPage");
  const workOrderId = "3f2b8c1e-7d4a-4c2b-9e1f-0a1b2c3d4e5f";
  const notice = approvedNoticeFor({ workOrderId });
  assert.equal(UUID_RE.test(notice.text), false, `o texto do aviso imprime o identificador: ${notice.text}`);
  const html = renderToString(<ActionNoticeBody notice={notice} />);
  const visible = html.replace(/<[^>]+>/g, "");
  assert.equal(UUID_RE.test(visible), false, `o aviso visível imprime o identificador: ${visible}`);
  assert.match(visible, /Orçamento aprovado/);
  assert.match(html, new RegExp(`<a href="/work-orders/${workOrderId}">abrir OS</a>`));
});
