import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

// Ω4-2b — Cobranças/Pagamentos sobre o backend financial-titles (Ω4-2a). Testes SSR (node:test +
// renderToString). Gates LIGADOS ao JSX (lição Ω3F-9). §3/§11.2: nenhum enum cru/UUID/competência crua no HTML.

// ── Browser test globals (o service importa client.ts → auth.storage → localStorage) ──
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
      const set = listeners.get(event) ?? new Set<EventListener>();
      set.add(listener);
      listeners.set(event, set);
    },
    removeEventListener: (event: string, listener: EventListener) => listeners.get(event)?.delete(listener),
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

import {
  adaptFinancialTitlesResponse,
  allowedStatusTargets,
  computeTitleKpis,
  formatCompactBRL,
  formatCompetencia,
  formatDueDate,
  getDirectionLabel,
  getPartyTypeLabel,
  getStatusActionLabel,
  getTitleStatusLabel,
  overdueBadgeSeverity,
  parseAmountInput,
  validateTitleForm,
} from "../src/modules/finance/titles/financial-titles.adapter";
import type { FinancialTitle, FinancialTitleStatus } from "../src/modules/finance/titles/financial-titles.types";
import { TitleOverdueBadge } from "../src/modules/finance/titles/components/TitleOverdueBadge";
import { TitleRowActions, TitleRowMenu } from "../src/modules/finance/titles/components/TitleRowActions";

const ALL_STATUSES: readonly FinancialTitleStatus[] = ["open", "scheduled", "partially_paid", "paid", "in_dispute", "cancelled"];

// =============================== A. Adapter — leitura defensiva + overdue passthrough ===============================

test("[A1] adapta o envelope { data: { items, pagination } } (snake/camel) e descarta linha sem campo essencial", () => {
  const data = adaptFinancialTitlesResponse({
    data: {
      items: [
        { id: "t1", direction: "receivable", party_type: "customer", party_name: "Indústria Alfa", amount: 24800, due_date: "2026-06-18T00:00:00.000Z", status: "open", competencia: "2026-06", overdue: false, active: true },
        { id: "t2", direction: "payable", partyType: "supplier", partyName: "Fornecedor Delta", amount: 8400, dueDate: "2026-06-20T00:00:00.000Z", status: "scheduled", competencia: "2026-06", overdue: false, active: true },
        { id: "x", direction: "receivable", party_type: "customer", party_name: "Sem status" }, // sem status/due_date → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });
  assert.equal(data.items.length, 2);
  assert.equal(data.items[0].partyName, "Indústria Alfa");
  assert.equal(data.items[1].direction, "payable");
  assert.equal(data.pagination.total, 2);
});

test("[A2] overdue vem PRONTO do backend — o front NÃO recalcula (flag mandado, não a data)", () => {
  const data = adaptFinancialTitlesResponse([
    // overdue=true com vencimento FUTURO: se o front recalculasse, seria false. Prova o passthrough.
    { id: "a", direction: "receivable", party_type: "customer", party_name: "A", amount: 10, due_date: "2999-01-01T00:00:00.000Z", status: "open", competencia: "2026-06", overdue: true, active: true },
    // overdue=false com vencimento PASSADO: passthrough do false.
    { id: "b", direction: "receivable", party_type: "customer", party_name: "B", amount: 10, due_date: "2000-01-01T00:00:00.000Z", status: "open", competencia: "2000-01", overdue: false, active: true },
  ]);
  assert.equal(data.items.find((t) => t.id === "a")?.overdue, true);
  assert.equal(data.items.find((t) => t.id === "b")?.overdue, false);
});

// =============================== B. Humanização — sem enum cru ===============================

test("[B1] status/direction/party_type humanizados em PT-BR (nunca o enum cru)", () => {
  assert.equal(getDirectionLabel("receivable"), "A receber");
  assert.equal(getDirectionLabel("payable"), "A pagar");
  assert.equal(getPartyTypeLabel("customer"), "Cliente");
  assert.equal(getPartyTypeLabel("supplier"), "Fornecedor");
  const labels = ALL_STATUSES.map((s) => getTitleStatusLabel(s));
  assert.deepEqual(labels, ["Em aberto", "Agendado", "Parcial", "Pago", "Em contestação", "Cancelado"]);
  for (const s of ALL_STATUSES) assert.doesNotMatch(getTitleStatusLabel(s), /_|receivable|payable|open|paid|dispute/);
});

test("[B2] competência crua '2026-07' vira 'jul/2026'; due_date ISO vira dd/mm; nunca o valor cru", () => {
  assert.equal(formatCompetencia("2026-07"), "jul/2026");
  assert.equal(formatCompetencia("2026-01"), "jan/2026");
  assert.equal(formatDueDate("2026-06-18T00:00:00.000Z"), "18/06");
  assert.doesNotMatch(formatCompetencia("2026-07"), /2026-07/);
});

test("[B3] formatCompactBRL bate com o padrão do PNG (derivado da soma real)", () => {
  assert.equal(formatCompactBRL(184000), "R$ 184k");
  assert.equal(formatCompactBRL(11500), "R$ 11,5k");
  assert.equal(formatCompactBRL(8200), "R$ 8,2k");
  assert.equal(formatCompactBRL(1_250_000), "R$ 1,3M");
  assert.equal(formatCompactBRL(0), "R$ 0");
});

// =============================== C. Máquina de status — espelha o backend, nunca paid/partially_paid ===============================

test("[C1] allowedStatusTargets espelha FINANCIAL_TITLE_STATUS_TRANSITIONS", () => {
  assert.deepEqual(allowedStatusTargets("open"), ["scheduled", "in_dispute", "cancelled"]);
  assert.deepEqual(allowedStatusTargets("scheduled"), ["open", "in_dispute", "cancelled"]);
  assert.deepEqual(allowedStatusTargets("in_dispute"), ["open", "cancelled"]);
  assert.deepEqual(allowedStatusTargets("paid"), []);
  assert.deepEqual(allowedStatusTargets("partially_paid"), []);
  assert.deepEqual(allowedStatusTargets("cancelled"), []);
});

test("[C2] paid/partially_paid NUNCA são oferecidos como destino manual (de nenhum status)", () => {
  for (const s of ALL_STATUSES) {
    const targets = allowedStatusTargets(s) as string[];
    assert.equal(targets.includes("paid"), false, `${s} não oferece paid`);
    assert.equal(targets.includes("partially_paid"), false, `${s} não oferece partially_paid`);
  }
});

test("[C3] rótulos de ação são PT-BR de negócio", () => {
  assert.equal(getStatusActionLabel("scheduled"), "Agendar");
  assert.equal(getStatusActionLabel("in_dispute"), "Marcar em contestação");
  assert.equal(getStatusActionLabel("open"), "Reabrir");
  assert.equal(getStatusActionLabel("cancelled"), "Cancelar");
});

// =============================== D. KPIs computados dos dados ===============================

const NOW = Date.parse("2026-07-15T12:00:00.000Z"); // competência corrente = 2026-07

function title(partial: Partial<FinancialTitle> & Pick<FinancialTitle, "id" | "status">): FinancialTitle {
  return {
    direction: "receivable",
    partyType: "customer",
    partyName: "X",
    document: null,
    category: null,
    description: null,
    amount: 0,
    currency: "BRL",
    issueDate: null,
    dueDate: "2026-07-10T00:00:00.000Z",
    paidAmount: 0,
    competencia: "2026-07",
    accountId: null,
    overdue: false,
    active: true,
    createdAt: "2026-07-01T00:00:00.000Z",
    ...partial,
  };
}

test("[D1] computeTitleKpis soma por recorte de status/overdue e 'do mês' pela competência corrente", () => {
  const items: FinancialTitle[] = [
    title({ id: "1", status: "open", amount: 100 }),
    title({ id: "2", status: "open", amount: 50, overdue: true }), // conta em open E overdue
    title({ id: "3", status: "scheduled", amount: 200 }),
    title({ id: "4", status: "paid", amount: 300, competencia: "2026-07" }), // recebido no mês
    title({ id: "5", status: "paid", amount: 999, competencia: "2026-06" }), // fora do mês → não conta
    title({ id: "6", status: "in_dispute", amount: 80 }),
  ];
  const k = computeTitleKpis(items, NOW);
  assert.equal(k.open, 150);
  assert.equal(k.scheduled, 200);
  assert.equal(k.overdue, 50);
  assert.equal(k.settledThisMonth, 300);
  assert.equal(k.inDispute, 80);
});

test("[D2] lista vazia ⇒ todos os KPIs zero (o front nunca inventa número)", () => {
  const k = computeTitleKpis([], NOW);
  assert.deepEqual(k, { open: 0, scheduled: 0, overdue: 0, settledThisMonth: 0, inDispute: 0 });
});

// =============================== E. Badge de atraso — liga/desliga (VISIBILIDADE do backend, cor derivada) ===============================

test("[E1] overdueBadgeSeverity: só liga quando overdue=true (mesmo vencido no passado, flag false → null)", () => {
  assert.equal(overdueBadgeSeverity(false, "2000-01-01T00:00:00.000Z", NOW), null);
  assert.equal(overdueBadgeSeverity(true, "2026-07-13T00:00:00.000Z", NOW), "warn"); // 2 dias → âmbar
  assert.equal(overdueBadgeSeverity(true, "2026-07-01T00:00:00.000Z", NOW), "critical"); // >7 dias → vermelho
  assert.equal(overdueBadgeSeverity(true, null, NOW), "warn"); // sem data → âmbar
});

test("[E2] TitleOverdueBadge: renderiza 'Atrasada' (âmbar/vermelho) e some quando não vencido", () => {
  const warn = renderToString(<TitleOverdueBadge overdue dueDate="2026-07-13T00:00:00.000Z" now={NOW} />);
  assert.match(warn, /Atrasada/);
  assert.match(warn, /#D97706/); // âmbar
  assert.match(warn, /Título vencido/);
  assert.doesNotMatch(warn, /mais de uma semana/); // atraso fresco não usa o aria crítico

  const crit = renderToString(<TitleOverdueBadge overdue dueDate="2026-07-01T00:00:00.000Z" now={NOW} />);
  assert.match(crit, /#DC2626/); // vermelho
  assert.match(crit, /mais de uma semana/); // aria distingue o crítico (WCAG 1.4.1)

  assert.equal(renderToString(<TitleOverdueBadge overdue={false} dueDate="2000-01-01T00:00:00.000Z" now={NOW} />), "");
});

// =============================== F. Ações de linha — gate LIGADO ao JSX (mutação) ===============================

function renderActions(status: FinancialTitleStatus, permissions: string[]) {
  return renderToString(<TitleRowActions status={status} permissions={permissions} onSelect={() => {}} />);
}

test("[F1] com financial_titles:update e status com transição ⇒ gatilho de ações presente", () => {
  const html = renderActions("open", ["financial_titles:read", "financial_titles:update"]);
  assert.match(html, /Ações do título/); // aria-label do ⋮
});

test("[F2] SEM financial_titles:update ⇒ gatilho de ações AUSENTE (gate ligado ao JSX — teste de mutação)", () => {
  const html = renderActions("open", ["financial_titles:read"]);
  assert.doesNotMatch(html, /Ações do título/);
});

test("[F3] status terminal (paid/cancelled) ⇒ sem ações mesmo com permissão", () => {
  for (const s of ["paid", "cancelled", "partially_paid"] as FinancialTitleStatus[]) {
    assert.doesNotMatch(renderActions(s, ["financial_titles:update"]), /Ações do título/, `${s} não tem ação`);
  }
});

test("[F4] TitleRowMenu lista SÓ transições válidas em PT-BR; nunca o enum cru", () => {
  const html = renderToString(<TitleRowMenu targets={allowedStatusTargets("open")} onSelect={() => {}} />);
  assert.match(html, /Agendar/);
  assert.match(html, /Marcar em contestação/);
  assert.match(html, /Cancelar/);
  assert.doesNotMatch(html, /scheduled|in_dispute|cancelled|\bopen\b|paid/);
});

// =============================== G. Service — PATCH /status propaga erro + contrato ===============================

test("[G1] changeFinancialTitleStatus: PATCH /financial-titles/:id/status com { status }", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const { changeFinancialTitleStatus } = await import("../src/modules/finance/titles/financial-titles.service");
  const original = globalThis.fetch;
  let url = "";
  let method = "";
  let body: Record<string, unknown> = {};
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    url = String(input);
    method = String(init?.method);
    body = JSON.parse(String(init?.body));
    return new Response(JSON.stringify({ data: { id: "t1", direction: "receivable", party_type: "customer", party_name: "A", amount: 10, due_date: "2026-07-10T00:00:00.000Z", status: "scheduled", competencia: "2026-07", overdue: false, active: true } }), { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  try {
    const updated = await changeFinancialTitleStatus({}, "t1", { status: "scheduled" });
    assert.match(url, /\/financial-titles\/t1\/status$/);
    assert.equal(method, "PATCH");
    assert.equal(body.status, "scheduled");
    assert.equal(updated.status, "scheduled");
  } finally {
    globalThis.fetch = original;
  }
});

test("[G2] changeFinancialTitleStatus: 422 (transição inválida) PROPAGA — não engole o erro", async () => {
  process.env.VITE_USE_MOCKS = "false";
  const { changeFinancialTitleStatus } = await import("../src/modules/finance/titles/financial-titles.service");
  const original = globalThis.fetch;
  globalThis.fetch = (async () => new Response("unprocessable", { status: 422 })) as typeof fetch;
  try {
    await assert.rejects(() => changeFinancialTitleStatus({}, "t1", { status: "cancelled" }));
  } finally {
    globalThis.fetch = original;
  }
});

// =============================== H. Página completa (SSR) — Cobranças & Pagamentos ===============================

function seedContext(permissions: readonly string[]) {
  browser.localStorage.setItem(
    "erp-techsolutions.active-context",
    JSON.stringify({
      tenantId: "ten-industrial-01",
      tenantName: "Techsolutions Industrial",
      tenantStatus: "active",
      branchId: "fil-sp-01",
      branchName: "Sao Paulo - Campo",
      role: "Financeiro",
      permissions,
      enabledModules: ["dashboard", "work-orders"],
      scope: "branch",
    }),
  );
}

// Sessão do teste vem do perfil AUDITOR (sem qualquer financial_titles:* no próprio usuário): assim o
// merge sessão+contexto NÃO injeta permissões e o que vale é EXATAMENTE o contexto semeado (gate honesto).
async function renderPage(which: "charges" | "payments", permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const mod = await import(
    which === "charges" ? "../src/modules/finance/pages/ChargesPage" : "../src/modules/finance/pages/PaymentsPage"
  );
  const Page = which === "charges" ? mod.ChargesPage : mod.PaymentsPage;

  setStoredAuthSession(mockSessionForEmail("auditor.web@techsolutions.example"));
  seedContext(permissions);

  return renderToString(
    <MemoryRouter initialEntries={[which === "charges" ? "/finance/charges" : "/finance/payments"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <Page />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

test("[H1] Cobranças: header + KPIs + tabs; 'Nova cobrança' com permissão de criar; sem 'tenant'/enum cru", async () => {
  const html = await renderPage("charges", ["financial_titles:read", "financial_titles:create", "financial_titles:update"]);
  assert.match(html, /Cobranças/);
  assert.match(html, /cobranças a clientes/);
  assert.match(html, /Em aberto/);
  assert.match(html, /Vencidas/);
  assert.match(html, /Recebidas \(mês\)/);
  assert.match(html, /Em contestação/);
  assert.match(html, /Nova cobrança/);
  assert.match(html, /CLIENTE/); // coluna de contraparte de receivable
  // KPIs computados de lista vazia (mock D-007) ⇒ R$ 0 — nunca hardcode "184k".
  assert.doesNotMatch(html, /R\$ 184k|R\$ 302k/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /receivable|in_dispute|party_type|competencia/);
});

test("[H2] Cobranças: sem financial_titles:create ⇒ 'Nova cobrança' ausente (ações somem sem permissão)", async () => {
  const html = await renderPage("charges", ["financial_titles:read"]);
  assert.match(html, /Cobranças/);
  assert.doesNotMatch(html, /Nova cobrança/);
});

test("[H3] Pagamentos: header + KPIs + coluna FORNECEDOR; 'Agendar pagamento' com permissão", async () => {
  const html = await renderPage("payments", ["financial_titles:read", "financial_titles:create"]);
  assert.match(html, /Pagamentos/);
  assert.match(html, /contas a pagar/);
  assert.match(html, /A pagar/);
  assert.match(html, /Agendados/);
  assert.match(html, /Pagos \(mês\)/);
  assert.match(html, /Vencendo/);
  assert.match(html, /FORNECEDOR/);
  assert.match(html, /Agendar pagamento/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /payable|supplier|party_type/);
});

// ── [pós-análise] validação PURA do formulário de criação (caminho de entrada de dinheiro) ──
test("[pós-análise] validateTitleForm: campos obrigatórios e valor > 0", () => {
  const ok = validateTitleForm({ partyName: "Cliente X", amount: "150,50", dueDate: "2026-08-10", partyLabel: "Cliente" });
  assert.deepEqual(ok, []);

  const semNome = validateTitleForm({ partyName: "  ", amount: "10", dueDate: "2026-08-10", partyLabel: "Cliente" });
  assert.ok(semNome.some((m) => m.includes("Cliente é obrigatório")));

  const valorZero = validateTitleForm({ partyName: "X", amount: "0", dueDate: "2026-08-10", partyLabel: "Cliente" });
  assert.ok(valorZero.some((m) => m.includes("maior que zero")));

  const valorNeg = validateTitleForm({ partyName: "X", amount: "-5", dueDate: "2026-08-10", partyLabel: "Fornecedor" });
  assert.ok(valorNeg.some((m) => m.includes("maior que zero")));

  const semVenc = validateTitleForm({ partyName: "X", amount: "10", dueDate: "", partyLabel: "Cliente" });
  assert.ok(semVenc.some((m) => m.includes("vencimento")));

  const vencInvalido = validateTitleForm({ partyName: "X", amount: "10", dueDate: "não-é-data", partyLabel: "Cliente" });
  assert.ok(vencInvalido.some((m) => m.includes("vencimento")));
});

test("[pós-análise] parseAmountInput aceita vírgula decimal pt-BR", () => {
  assert.equal(parseAmountInput("150,50"), 150.5); // vírgula decimal → ponto
  assert.equal(parseAmountInput("1234.56"), 1234.56); // ponto decimal direto
  assert.equal(parseAmountInput("42"), 42);
});
