import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { adaptGroupPanelScope, adaptGroupPanelSummary } from "../frontend/src/modules/group-panel/group-panel.adapter.js";
import { GROUP_PANEL_SCOPE_ROUTE, GROUP_PANEL_SUMMARY_ROUTE } from "../frontend/src/modules/group-panel/group-panel.service.js";
import {
  ALL_ORGANIZATIONS,
  consolidatedValue,
  coverageNotices,
  GROUP_PANEL_INDICATORS,
  groupPanelStateFrom,
  indicatorValue,
  missingReason,
  organizationValue,
  profileLabel,
  sortOrganizations,
} from "../frontend/src/modules/group-panel/group-panel.state.js";
import type { GroupPanelSummary as FrontSummary } from "../frontend/src/modules/group-panel/group-panel.types.js";
import { toGroupPanelScopeDto, toGroupPanelSummaryDto } from "../src/modules/group-panel/group-panel.dto.js";
import { GROUP_PANEL_SCOPE_PATH, GROUP_PANEL_SUMMARY_PATH } from "../src/modules/group-panel/group-panel.routes.js";
import type { GroupPanelSummary as BackSummary } from "../src/modules/group-panel/group-panel.types.js";
import type { FinancialSummary } from "../src/modules/financial-summary/financial-summary.types.js";
import { NAVIGATION_REGISTRY } from "../src/modules/navigation/navigation.registry.js";

// -----------------------------------------------------------------------------------------------------------------------
// B-GRUPO-GESTOR-1b — contrato da TELA do Painel do grupo (R14 do plano: FRO-1 a FRO-6).
//  FRO-1 a tela usa os componentes da biblioteca (DenseTable com detalhe, KpiStatCard, ClickableKpiCard) e não monta tabela
//        nem componente próprio;
//  FRO-2 a tela NÃO SOMA: o valor do grupo é o `consolidated` do servidor, e total não publicado fica sem número;
//  FRO-3 os 5 estados §7 (carregando, vazio, erro, acesso não permitido, dados desatualizados) e a faixa de cobertura;
//  FRO-4 nenhum termo técnico na tela (tenant, papel técnico); perfil sem rótulo vira "Outro perfil";
//  FRO-5 as duas rotas do servidor, sem parâmetro; a rota /group e o item do menu com o mesmo gate;
//  FRO-6 a resposta REAL do servidor (o DTO de `src/`) passa pelo adaptador; campo faltando falha fechado; bloco fora de
//        `ok` e pátio em erro saem SEM número (E3.2 §14, K1).
// O código do front é EXECUTADO onde é puro (adaptador e estado) e LIDO como texto onde é React (CRLF → LF).
// -----------------------------------------------------------------------------------------------------------------------

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const MODULE_DIR = join(ROOT, "frontend", "src", "modules", "group-panel");
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n");

function moduleFiles(dir = MODULE_DIR): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? moduleFiles(path) : /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

const NOW = new Date("2026-11-22T15:00:00.000Z");

function financial(overrides: Partial<{ open: number; overdue: number; inflow: number; outflow: number; cash: number }> = {}): FinancialSummary {
  const { open = 1000, overdue = 100, inflow = 500, outflow = 300, cash = 2000 } = overrides;
  return {
    receivable: { openAmount: open, openCount: 3, overdueAmount: overdue, overdueCount: 1, inDisputeCount: 0 },
    payable: { openAmount: open / 2, openCount: 2, overdueAmount: 0, overdueCount: 0, inDisputeCount: 0 },
    settledThisMonth: { competencia: "2026-11", inflow, outflow },
    cash: { totalBalance: cash, accountCount: 2, currency: "BRL" },
    cheques: { pendingReceivedCount: 1, pendingReceivedAmount: 50, pendingIssuedCount: 0, pendingIssuedAmount: 0, linkedPendingCount: 0, linkedPendingAmount: 0 },
    cashFlow: [
      { competencia: "2026-10", inflow: 400, outflow: 200 },
      { competencia: "2026-11", inflow, outflow },
    ],
    recentTitles: [{ id: "t1", direction: "receivable", partyName: "Cliente", amount: 100, openAmount: 100, dueDate: new Date("2026-11-30T00:00:00.000Z"), status: "open", overdue: false }],
  };
}

const OPS = {
  openedToday: 1,
  openedThisWeek: 4,
  inProgress: 2,
  overdue: 1,
  openedThisMonth: 10,
  completedThisMonth: 9,
  openedPreviousMonth: 8,
  completionRatePct: 90,
  arrivalAvgMinutes: 72,
  arrivalCount: 9,
  arrivalMissingCount: 1,
  completionAvgMinutes: 150,
};
const STAFF = { activeUsers: 5, byProfile: [{ profile: "field_technician", count: 3 }, { profile: "tenant_admin", count: 1 }], inServiceNow: 2 };

/** O resumo do SERVIDOR (tipos de `src/`): o consolidado é DE PROPÓSITO diferente da soma dos pátios. */
function backendSummary(options: { readonly consolidated?: boolean; readonly failedId?: string } = {}): BackSummary {
  const failedId = options.failedId;
  const org = (id: string, name: string, money: number): BackSummary["organizations"][number] => {
    const failed = id === failedId;
    return {
      id,
      name,
      finance: failed
        ? { status: "erro", summary: null, receivedVariationPct: null, paidVariationPct: null }
        : { status: "ok", summary: financial({ open: money, inflow: money / 2 }), receivedVariationPct: 25, paidVariationPct: -3 },
      operations: failed ? { status: "erro", summary: null } : { status: "ok", summary: OPS },
      staff: failed ? { status: "erro", summary: null } : { status: "ok", summary: STAFF },
    };
  };
  const organizations = [org("org-a", "Pátio Centro", 1000), org("org-b", "Pátio Norte", 3000), org("org-c", "Pátio Sul", 2000)];
  const complete = failedId === undefined && options.consolidated !== false;
  return {
    generatedAt: NOW,
    coverage: { complete, included: failedId ? 2 : 3, failed: failedId ? [failedId] : [], reason: complete ? null : "erro_de_leitura", withoutAccess: [] },
    consolidated: complete
      ? {
          currency: "BRL",
          finance: {
            receivableOpen: 777_777,
            receivableOpenCount: 9,
            receivableOverdue: 300,
            receivableOverdueCount: 3,
            payableOpen: 555,
            payableOpenCount: 6,
            payableOverdue: 0,
            payableOverdueCount: 0,
            receivedThisMonth: 888,
            paidThisMonth: 999,
            competencia: "2026-11",
            cashBalance: 6000,
            accountCount: 6,
            cashFlow: [{ competencia: "2026-11", inflow: 888, outflow: 999 }],
            receivedVariationPct: 12,
            paidVariationPct: null,
          },
          operations: { ...OPS, openedThisMonth: 30, arrivalAvgMinutes: 70, included: 3 },
          staff: { ...STAFF, activeUsers: 13 },
        }
      : null,
    organizations,
  };
}

function frontSummary(options?: Parameters<typeof backendSummary>[0]): FrontSummary {
  const adapted = adaptGroupPanelSummary({ data: toGroupPanelSummaryDto(backendSummary(options)) });
  assert.equal(adapted.ok, true, adapted.ok ? "" : `adaptador recusou a resposta real do servidor: ${adapted.field}`);
  return (adapted as { ok: true; data: FrontSummary }).data;
}

// ── FRO-1 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FRO-1 — a tela usa a biblioteca (DenseTable com detalhe, KpiStatCard, ClickableKpiCard) e não monta tabela própria", () => {
  const page = read(join(MODULE_DIR, "pages", "GroupPanelPage.tsx"));
  const detail = read(join(MODULE_DIR, "components", "GroupPanelOrganizationDetail.tsx"));
  assert.match(page, /import \{ DenseTable \} from "\.\.\/\.\.\/\.\.\/components\/dense-list";/);
  assert.match(page, /<DenseTable<GroupPanelOrganization>[\s\S]*renderDetail=/, "a lista é o DenseTable com renderDetail (DenseExpandableRow)");
  assert.match(page, /import \{ KpiStatCard, PageHeader \} from "\.\.\/\.\.\/\.\.\/components\/patterns";/);
  assert.match(detail, /import \{ ClickableKpiCard \} from "\.\.\/\.\.\/\.\.\/components\/kpi";/);
  for (const file of moduleFiles()) {
    const text = read(file);
    assert.doesNotMatch(text, /<(table|tr|td|thead|tbody)\b/, `${file}: tabela montada à mão (use o DenseTable)`);
    assert.doesNotMatch(text, /from "(recharts|chart\.js|d3|victory)/, `${file}: biblioteca de gráfico (PD-004: SVG inline)`);
  }
});

// ── FRO-2 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FRO-2 — a tela não soma: o grupo mostra o consolidado do servidor e, sem total publicado, nenhum número", () => {
  const summary = frontSummary();
  // O consolidado do arranjo NÃO é a soma dos pátios (777.777 ≠ 1.000 + 3.000 + 2.000): a tela tem de mostrar o do servidor.
  assert.equal(indicatorValue(summary, ALL_ORGANIZATIONS, "receber"), 777_777);
  assert.equal(indicatorValue(summary, ALL_ORGANIZATIONS, "recebido"), 888);
  assert.equal(indicatorValue(summary, ALL_ORGANIZATIONS, "pago"), 999);
  assert.equal(indicatorValue(summary, ALL_ORGANIZATIONS, "funcionarios"), 13);
  assert.equal(indicatorValue(summary, ALL_ORGANIZATIONS, "chegada"), 70);
  // Um pátio: o número é o campo do bloco dele.
  assert.equal(indicatorValue(summary, "org-b", "receber"), 3000);

  const incompleto = frontSummary({ consolidated: false });
  for (const { key } of GROUP_PANEL_INDICATORS) {
    assert.equal(consolidatedValue(incompleto, key), null, `${key}: total não publicado tem de ficar sem número`);
    assert.equal(indicatorValue(incompleto, ALL_ORGANIZATIONS, key), null, `${key}: a tela não recompõe o total`);
  }
  for (const file of moduleFiles()) {
    const text = read(file);
    assert.doesNotMatch(text, /\.reduce\(/, `${file}: .reduce( é soma no front`);
    assert.doesNotMatch(text, /\+=/, `${file}: += é soma no front`);
  }
});

// ── FRO-3 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FRO-3 — os 5 estados (carregando, vazio, erro, acesso não permitido, dados desatualizados) e a faixa de cobertura", () => {
  const summary = frontSummary();
  const scope = { ok: true as const, data: { inGroup: true, overLimit: false, omittedCount: 0, organizations: [] } };
  const good = { summary, scope: scope.data, at: "2026-11-22T15:00:00.000Z" };

  assert.deepEqual(groupPanelStateFrom({ summary: { ok: false, failure: { kind: "forbidden", reason: "not_group_manager" } }, scope, lastGood: null, now: "x" }).state, { status: "forbidden", reason: "not_group_manager" });
  assert.equal(groupPanelStateFrom({ summary: { ok: false, failure: { kind: "error", message: "m" } }, scope, lastGood: null, now: "x" }).state.status, "error");
  const stale = groupPanelStateFrom({ summary: { ok: false, failure: { kind: "error", message: "m" } }, scope, lastGood: good, now: "x" }).state;
  assert.equal(stale.status, "ready");
  assert.equal(stale.status === "ready" && stale.stale, true, "atualização que falha depois de leitura boa = dados desatualizados");
  const one = { ...summary, organizations: summary.organizations.slice(0, 1) };
  assert.equal(groupPanelStateFrom({ summary: { ok: true, data: one }, scope, lastGood: null, now: "x" }).state.status, "empty");
  assert.equal(groupPanelStateFrom({ summary: { ok: true, data: summary }, scope, lastGood: null, now: "x" }).state.status, "ready");

  const page = read(join(MODULE_DIR, "pages", "GroupPanelPage.tsx"));
  for (const marker of ['state.status === "loading"', 'tone="forbidden"', 'tone="error"', 'tone="empty"', "<StaleDataBanner", 'data-state="cobertura"', 'aria-busy="true"']) {
    assert.ok(page.includes(marker), `a página não tem o estado: ${marker}`);
  }
  const hook = read(join(MODULE_DIR, "useGroupPanel.ts"));
  assert.doesNotMatch(hook, /useAutoRefresh|setInterval/, "sem consulta periódica (plano §3.5: cada leitura grava trilha)");

  const falha = coverageNotices(frontSummary({ failedId: "org-b" }), { inGroup: true, overLimit: true, omittedCount: 2, organizations: [] });
  assert.ok(falha.some((notice) => notice.tone === "error" && notice.text.includes("Pátio Norte") && notice.text.includes("não foi somado")));
  assert.ok(falha.some((notice) => notice.text.includes("2 pátios ficaram de fora")), "overLimit/omittedCount do /scope aparecem (K9)");
});

// ── FRO-4 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
const TECH = /\b(tenants?|tenant_\w+|platform_admin|super_admin|field_technician|field_dispatcher|rbac|permissions?|role|roles)\b/i;

function uiTexts(source: string): string[] {
  const body = source
    .split("\n")
    .filter((line) => !/^\s*(import|export \{|\/\/|\*|\/\*)/.test(line))
    .join("\n");
  const texts: string[] = [];
  for (const match of body.matchAll(/"([^"\n]*)"|`([^`]*)`/g)) texts.push(match[1] ?? match[2] ?? "");
  for (const match of body.matchAll(/>([^<>{}\n]+)</g)) texts.push(match[1]);
  return texts.filter((text) => /[A-Za-zÀ-ú]{3,}/.test(text) && !/^[a-z0-9_.:/#-]+$/i.test(text.trim()));
}

test("FRO-4 — nenhum termo técnico nos textos da tela; perfil sem rótulo vira 'Outro perfil'", () => {
  for (const file of moduleFiles().filter((path) => /(pages|components)[\\/]/.test(path) || /group-panel\.state\.ts$/.test(path))) {
    for (const text of uiTexts(read(file))) assert.doesNotMatch(text, TECH, `${file}: termo técnico na tela: "${text}"`);
  }
  assert.equal(profileLabel("field_technician"), "Técnico de Campo");
  assert.equal(profileLabel("tenant_admin"), "Administrador");
  assert.equal(profileLabel("field_dispatcher"), "Operação de Campo");
  assert.equal(profileLabel("papel_que_nao_existe"), "Outro perfil");
  for (const key of ["tenant_admin", "manager", "operator", "finance", "inventory", "field_technician", "auditor", "support", "field_dispatcher"]) {
    assert.doesNotMatch(profileLabel(key), TECH, `${key} vira rótulo de tela`);
  }
});

// ── FRO-5 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FRO-5 — as duas rotas do servidor sem parâmetro; /group no App.tsx e o item do menu com o mesmo gate", () => {
  assert.equal(GROUP_PANEL_SCOPE_ROUTE, GROUP_PANEL_SCOPE_PATH);
  assert.equal(GROUP_PANEL_SUMMARY_ROUTE, GROUP_PANEL_SUMMARY_PATH);
  const service = read(join(MODULE_DIR, "group-panel.service.ts"));
  assert.doesNotMatch(service, /group-panel\/(scope|summary)[?/]/, "nenhum parâmetro nas rotas do Painel (P-E)");
  assert.doesNotMatch(service, /method:|body:/, "o Painel só lê (GET sem corpo)");

  const app = read(join(ROOT, "frontend", "src", "App.tsx"));
  const route = app.match(/path="\/group"\s*element=\{[\s\S]*?<\/PermissionGuard>/);
  assert.ok(route, "rota /group no App.tsx");
  assert.match(route[0], /<PermissionGuard permissions=\{\["financial_entries:read"\]\}>\s*<GroupPanelPage \/>/);

  const item = NAVIGATION_REGISTRY.find((entry) => entry.id === "group.panel");
  assert.ok(item, "item group.panel no registro");
  assert.equal(item.path, "/group");
  assert.deepEqual(item.requiredPermissions, ["financial_entries:read"], "menu e guarda da rota com a mesma permissão");
  assert.deepEqual(item.requiredModules, ["finance"]);
  assert.doesNotMatch(item.label, TECH);
});

// ── FRO-6 ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
test("FRO-6 — a resposta real do servidor passa; campo faltando falha fechado; bloco fora de ok e pátio em erro sem número", () => {
  const scope = adaptGroupPanelScope({ data: toGroupPanelScopeDto({ inGroup: true, overLimit: true, omittedCount: 1, organizations: [{ id: "org-a", name: "Pátio Centro", finance: true, operations: true, staff: false }] }) });
  assert.equal(scope.ok, true);
  assert.equal(scope.ok && scope.data.omittedCount, 1);

  const dto = toGroupPanelSummaryDto(backendSummary());
  const sem = structuredClone(dto) as { consolidated: { finance: Record<string, unknown> } };
  delete sem.consolidated.finance.receivableOpen;
  assert.deepEqual(adaptGroupPanelSummary({ data: sem }), { ok: false, field: "summary.consolidated.finance.receivableOpen" });
  const semPagina = structuredClone(dto) as { organizations: { finance: { summary: Record<string, unknown> } }[] };
  delete semPagina.organizations[0].finance.summary.cash;
  assert.equal(adaptGroupPanelSummary({ data: semPagina }).ok, false, "o resumo de um pátio sem um campo obrigatório não vira R$ 0,00");

  // Bloco fora de ok com corpo preenchido: o adaptador descarta o número.
  const vazado = structuredClone(dto) as { organizations: { finance: { status: string }; operations: { status: string } }[] };
  vazado.organizations[1].finance.status = "sem_permissao";
  vazado.organizations[1].operations.status = "sem_permissao";
  const adapted = adaptGroupPanelSummary({ data: vazado });
  assert.ok(adapted.ok);
  assert.equal(adapted.data.organizations[1].finance.summary, null);
  assert.equal(adapted.data.organizations[1].operations.summary, null);
  assert.equal(organizationValue(adapted.data.organizations[1], adapted.data.coverage, "receber"), null);
  assert.equal(missingReason(adapted.data.organizations[1], adapted.data.coverage, "receber"), "sem acesso");

  // Pátio em erro (K1): nenhum número em nenhum indicador, e o total não sai.
  const erro = frontSummary({ failedId: "org-b" });
  assert.equal(erro.consolidated, null);
  const norte = erro.organizations.find((organization) => organization.id === "org-b")!;
  for (const { key } of GROUP_PANEL_INDICATORS) {
    assert.equal(organizationValue(norte, erro.coverage, key), null, `${key}: pátio em erro sai sem número`);
    assert.equal(missingReason(norte, erro.coverage, key), "erro na leitura");
  }
  // Mesmo que um bloco do pátio venha ok, estar em `coverage.failed` já tira o número.
  const centro = erro.organizations.find((organization) => organization.id === "org-a")!;
  assert.equal(centro.finance.status, "ok");
  assert.equal(organizationValue(centro, { ...erro.coverage, failed: ["org-a"] }, "receber"), null);
  // Ordenar não some com o pátio em erro: ele vai para o fim.
  assert.deepEqual(sortOrganizations(erro, "receber").map((organization) => organization.id), ["org-c", "org-a", "org-b"]);
});
