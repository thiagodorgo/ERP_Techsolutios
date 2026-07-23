import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { buildCsv, csvCell, downloadCsv } from "../src/lib/csv";
import {
  adaptCommissionCalculationsResponse,
  adaptSettlementResult,
  buildRemuneracoesCsv,
  describeSettlementResult,
  getSettlementLabel,
  getSettlementTone,
  isCalculationSettled,
} from "../src/modules/finance/commissions/commissions.adapter";
import { settleCommissions } from "../src/modules/finance/commissions/commissions.service";
import type { CommissionCalculation } from "../src/modules/finance/commissions/commissions.types";

// Ω4C PR-10 (frontend) — conferência + liquidação em lote das Remunerações. Cobre: util CSV compartilhado
// (D-Ω4C-REM-CSV, promovido de AuditTenantPage); a "bolinha" derivada de settledAt; §2.8 (nome, nunca CNH);
// o serviço de settle (POST /commissions/settlements) com os desfechos honestos (ok/404/422/403/mock);
// filtro-modal-ao-entrar (D-Ω4C-REM-MODAL) e o grid vazio honesto (D-007, sem fabricar linhas).

const SAMPLE_ID = "11111111-1111-4111-8111-111111111111";

// ── (a) util CSV compartilhado (D-Ω4C-REM-CSV) ────────────────────────────────────────────
test("csv util: csvCell escapa `;`, aspas e quebra de linha; buildCsv usa `;` e `\\r\\n`", () => {
  assert.equal(csvCell("simples"), "simples");
  assert.equal(csvCell("tem;ponto-e-vírgula"), '"tem;ponto-e-vírgula"');
  assert.equal(csvCell('aspas "dentro"'), '"aspas ""dentro"""');
  assert.equal(csvCell("linha1\r\nlinha2"), '"linha1\r\nlinha2"');

  const csv = buildCsv(["A", "B"], [["1", "2"], ["x;y", "z"]]);
  assert.equal(csv, 'A;B\r\n1;2\r\n"x;y";z');
});

test("csv util: downloadCsv é no-op silencioso sem DOM (SSR/testes não quebram)", () => {
  // Sem document/URL de navegador → não deve lançar.
  assert.doesNotThrow(() => downloadCsv("x.csv", ["A"], [["1"]]));
});

// ── (b) bolinha de liquidação + §2.8 no adapter ───────────────────────────────────────────
test("remunerações: a 'bolinha' deriva de settledAt (verde=liquidado, vermelho=pendente)", () => {
  assert.equal(isCalculationSettled({ settledAt: "2026-07-20T00:00:00.000Z" }), true);
  assert.equal(isCalculationSettled({ settledAt: null }), false);
  assert.equal(getSettlementLabel(true), "Liquidado");
  assert.equal(getSettlementLabel(false), "Pendente");
  assert.equal(getSettlementTone(true), "success");
  assert.equal(getSettlementTone(false), "pending");
});

test("remunerações: adapter surfacea settledAt/settlementRef e NUNCA tenant_id/CNH/payee cru (§2.8)", () => {
  const data = adaptCommissionCalculationsResponse({
    items: [
      {
        id: SAMPLE_ID,
        payee_id: "usr-1",
        amount: 150.5,
        status: "approved",
        source_type: "work_order",
        source_id: "os-9",
        settled_at: "2026-07-20T00:00:00.000Z",
        settlement_ref: "grp-1",
        created_at: "2026-07-01T00:00:00.000Z",
        // campos que o backend NUNCA envia — se vazarem, o adapter descarta:
        tenant_id: "ten-secreto",
        cnh_number: "123456789",
      },
    ],
  });

  assert.equal(data.items.length, 1);
  const calc = data.items[0];
  assert.equal(calc.settledAt, "2026-07-20T00:00:00.000Z");
  assert.equal(calc.settlementRef, "grp-1");
  assert.equal(isCalculationSettled(calc), true);
  assert.ok(!("tenantId" in calc), "adapter não deve carregar tenantId");
  assert.ok(!("cnhNumber" in calc), "adapter não deve carregar cnhNumber");
  assert.doesNotMatch(JSON.stringify(data), /ten-secreto|123456789/);
});

// ── (c) CSV da conferência (só dado real; rótulos PT-BR; §2.8 nome como label) ─────────────
test("remunerações: buildRemuneracoesCsv exporta SÓ o dado carregado com situação PT-BR (bolinha)", () => {
  const calcs: CommissionCalculation[] = [
    { id: "a", payeeId: "u", amount: 100, status: "approved", sourceType: "work_order", sourceId: "os-1", workOrderId: null, settledAt: "2026-07-20T00:00:00.000Z", settlementRef: "g1", createdAt: "2026-07-01T00:00:00.000Z" },
    { id: "b", payeeId: "u", amount: 50, status: "pending", sourceType: null, sourceId: null, workOrderId: null, settledAt: null, settlementRef: null, createdAt: "2026-07-02T00:00:00.000Z" },
  ];
  const { header, rows } = buildRemuneracoesCsv("Maria Souza", calcs);

  assert.deepEqual(header, ["Profissional", "Data", "Origem", "Valor da remuneração", "Situação"]);
  assert.equal(rows.length, 2);
  assert.equal(rows[0][0], "Maria Souza"); // nome como label (nunca CNH)
  assert.equal(rows[0][4], "Liquidado");
  assert.equal(rows[1][4], "Pendente");
  assert.doesNotMatch(JSON.stringify(rows), /CNH/i);
});

// ── (d) resumo honesto da liquidação + adapter do resultado ────────────────────────────────
test("remunerações: adaptSettlementResult mapeia lines/contagens; describeSettlementResult é honesto", () => {
  const result = adaptSettlementResult({
    data: {
      settlementDate: "2026-07-23",
      settledCount: 2,
      settledTotal: 150,
      lines: [
        { calculationId: "a", outcome: "settled", statementGroupId: "g1", operatorProfileId: "op-1" },
        { calculationId: "b", outcome: "settled", statementGroupId: "g2", operatorProfileId: "op-1" },
        { calculationId: "c", outcome: "already_settled", statementGroupId: "g0", operatorProfileId: "op-1" },
        { calculationId: "d", outcome: "skipped_zero", statementGroupId: null, operatorProfileId: null },
        { calculationId: "e", outcome: "lixo_desconhecido" }, // desfecho inválido → descartado
      ],
    },
  });

  assert.equal(result.settledCount, 2);
  assert.equal(result.lines.length, 4); // o desfecho inválido é descartado
  const message = describeSettlementResult(result);
  assert.match(message, /2 remunerações liquidadas/);
  assert.match(message, /já estava/); // 1 already_settled
  assert.match(message, /sem valor a liquidar/); // 1 skipped_zero
});

// ── (e) serviço de settle: desfechos honestos por status ───────────────────────────────────
function stubFetch(status: number, body: unknown) {
  return (async () => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } })) as typeof fetch;
}

test("settleCommissions: modo mock não liquida (parada honesta de demonstração)", async () => {
  process.env.VITE_USE_MOCKS = "true";
  try {
    const outcome = await settleCommissions({}, { calculationIds: [SAMPLE_ID] });
    assert.equal(outcome.kind, "error");
  } finally {
    process.env.VITE_USE_MOCKS = "";
  }
});

test("settleCommissions: seleção vazia → erro honesto sem chamar a API", async () => {
  process.env.VITE_USE_MOCKS = "";
  const outcome = await settleCommissions({}, { calculationIds: [] });
  assert.equal(outcome.kind, "error");
});

test("settleCommissions: sucesso 200 → kind ok com o resultado da liquidação", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  globalThis.fetch = stubFetch(200, {
    data: { settlementDate: "2026-07-23", settledCount: 1, settledTotal: 100, lines: [{ calculationId: "a", outcome: "settled", statementGroupId: "g1", operatorProfileId: "op-1" }] },
  });
  try {
    const outcome = await settleCommissions({}, { calculationIds: ["a"], settlementDate: "2026-07-23" });
    assert.equal(outcome.kind, "ok");
    if (outcome.kind === "ok") assert.equal(outcome.result.settledCount, 1);
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

test("settleCommissions: 404/422/403 → desfechos tipados honestos (sem vazar corpo cru)", async () => {
  process.env.VITE_USE_MOCKS = "";
  const original = globalThis.fetch;
  try {
    globalThis.fetch = stubFetch(404, {});
    assert.equal((await settleCommissions({}, { calculationIds: ["a"] })).kind, "not_found");

    globalThis.fetch = stubFetch(422, {});
    assert.equal((await settleCommissions({}, { calculationIds: ["a"] })).kind, "not_a_professional");

    globalThis.fetch = stubFetch(403, {});
    assert.equal((await settleCommissions({}, { calculationIds: ["a"] })).kind, "forbidden");
  } finally {
    globalThis.fetch = original;
    process.env.VITE_USE_MOCKS = "";
  }
});

// ── (f) render SSR: filtro-modal-ao-entrar, grid vazio honesto, gating do "Liquidar" ────────
function installBrowserTestGlobals() {
  const storage = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  };
  const windowStub = {
    localStorage,
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
    setTimeout: globalThis.setTimeout.bind(globalThis),
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setInterval: globalThis.setInterval.bind(globalThis),
    clearInterval: globalThis.clearInterval.bind(globalThis),
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

async function renderRemuneracoes(permissions: readonly string[]): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  browser.clear();
  const { mockSessionForEmail } = await import("../src/mocks/auth/context");
  const { setStoredAuthSession } = await import("../src/modules/auth/auth.storage");
  const { AuthProvider } = await import("../src/providers/AuthProvider");
  const { TenantProvider } = await import("../src/providers/TenantProvider");
  const { PermissionProvider } = await import("../src/providers/PermissionProvider");
  const { RemuneracoesPage } = await import("../src/modules/finance/commissions/pages/RemuneracoesPage");

  setStoredAuthSession(mockSessionForEmail("gestor.web@techsolutions.example"));
  seedContext(permissions);

  const html = renderToString(
    <MemoryRouter initialEntries={["/finance/commissions"]}>
      <AuthProvider>
        <TenantProvider>
          <PermissionProvider>
            <RemuneracoesPage />
          </PermissionProvider>
        </TenantProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
  process.env.VITE_USE_MOCKS = "";
  return html;
}

test("remunerações: o filtro-modal-ao-entrar abre no escopo total (D-Ω4C-REM-MODAL, §3 PT-BR)", async () => {
  const html = await renderRemuneracoes(["commissions:read", "commissions:settle"]);

  // Modal de conferência aberto ao entrar (só nesta tela).
  assert.match(html, /Conferir remunerações/);
  assert.match(html, /Profissional/);
  assert.match(html, /Confirmar/);
  // Coexistência: o resumo por operador segue atrás do modal (não foi reescrito).
  assert.match(html, /Total geral/);
  // §2.8/§3: nada de CNH nem termo técnico.
  assert.doesNotMatch(html, /CNH/i);
  assert.doesNotMatch(html, /payee_id|Tenant/);
});

async function renderConference(canSettle: boolean): Promise<string> {
  const { ConferenciaRemuneracoesView } = await import(
    "../src/modules/finance/commissions/components/ConferenciaRemuneracoesView"
  );
  return renderToString(
    <MemoryRouter>
      <ConferenciaRemuneracoesView
        professional={{ profileId: "op-1", userId: "usr-1", name: "Maria Souza" }}
        from="2026-07-01"
        to="2026-07-31"
        context={{}}
        canSettle={canSettle}
        onReopenFilter={() => {}}
        onBackToSummary={() => {}}
      />
    </MemoryRouter>,
  );
}

test("conferência: totalizadores, toolbar (CSV/Imprimir/Colunas), estado vazio honesto (D-007) e §2.8", async () => {
  const html = await renderConference(true);

  assert.match(html, /Conferência — Maria Souza/);
  // Totalizadores derivados.
  assert.match(html, /Total a pagar/);
  assert.match(html, /Serviços/);
  // Toolbar: CSV (util), impressão, seletor de colunas e engrenagem de liquidar (com permissão).
  assert.match(html, /Exportar CSV/);
  assert.match(html, /Imprimir/);
  assert.match(html, /Colunas/);
  assert.match(html, /Liquidar/);
  // Grid vazio honesto — o mock não fabrica linhas.
  assert.match(html, /Sem remunerações no período/);
  assert.doesNotMatch(html, /CNH/i);
});

test("conferência: engrenagem 'Liquidar' some sem commissions:settle (backend é a autoridade)", async () => {
  const html = await renderConference(false);
  assert.match(html, /Conferência — Maria Souza/);
  assert.match(html, /Exportar CSV/);
  assert.doesNotMatch(html, /Liquidar/);
});

// ── (g) filtro-modal isolado: rótulos, seleção obrigatória e §2.8 ──────────────────────────
test("filtro-modal: rótulos PT-BR (Período/Profissional/Confirmar) e sem CNH", async () => {
  const { RemuneracoesFilterModal } = await import(
    "../src/modules/finance/commissions/components/RemuneracoesFilterModal"
  );
  const html = renderToString(
    <RemuneracoesFilterModal
      open
      operatorProfiles={[]}
      initialFrom=""
      initialTo=""
      initialProfileId=""
      onClose={() => {}}
      onConfirm={() => {}}
    />,
  );

  assert.match(html, /Conferir remunerações/);
  assert.match(html, /Período/);
  assert.match(html, /Profissional/);
  assert.match(html, /Confirmar/);
  assert.match(html, /Selecione um profissional/);
  assert.doesNotMatch(html, /CNH|Tenant/i);
});
