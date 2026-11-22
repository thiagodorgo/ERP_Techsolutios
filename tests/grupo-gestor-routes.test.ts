// B-GRUPO-GESTOR (1a, F1) — ROT, GM, ISO (memória), PAR, PAY, RO e COV: as duas rotas do Painel do grupo pelo app REAL
// (`createApp`) sobre o núcleo em memória, com tokens JWT de verdade (o arnês do gate de módulo, B-SAN3-18).
//
// O arranjo junta as contas de uma pessoa numa identidade só fazendo a religação direto no mapa do núcleo em memória (lá
// não existe método público para isso; no banco é o `POST /auth/identity-links`). A marca de gestor é o falso da borda
// da FM (`getMemoryGroupManagerMarksForTests`). Os vínculos de grupo são os do B-ASS-09 em memória.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { request as httpRequest } from "node:http";
import { after, before, test } from "node:test";

import { abrirArnesDoGate, type ArnesDoGate } from "./helpers/san3-18-gate.js";
import { resolvePermissionsForRoles, type Role } from "../src/modules/core-saas/permissions/catalog.js";
import type { ICoreSaasService } from "../src/modules/core-saas/services/core-saas-service.interface.js";

type Mod = typeof import("../src/modules/group-panel/index.js");
type Groups = typeof import("../src/modules/subscription-billing/overview/overview.factory.js");

let h: ArnesDoGate;
let adapter: ICoreSaasService;
let gp: Mod;
let overview: Groups;
let financial: {
  titles: typeof import("../src/modules/financial-titles/index.js");
  accounts: typeof import("../src/modules/financial-accounts/financial-account.service.js");
  entries: typeof import("../src/modules/financial-entries/index.js");
  cheques: typeof import("../src/modules/cheques/index.js");
  summary: typeof import("../src/modules/financial-summary/index.js");
};

before(async () => {
  h = await abrirArnesDoGate({
    envolverServico: (servico) => {
      adapter = servico;
      return servico;
    },
  });
  gp = await import("../src/modules/group-panel/index.js");
  overview = await import("../src/modules/subscription-billing/overview/overview.factory.js");
  financial = {
    titles: await import("../src/modules/financial-titles/index.js"),
    accounts: await import("../src/modules/financial-accounts/financial-account.service.js"),
    entries: await import("../src/modules/financial-entries/index.js"),
    cheques: await import("../src/modules/cheques/index.js"),
    summary: await import("../src/modules/financial-summary/index.js"),
  };
});

after(async () => {
  await h.fechar();
});

const FINANCE_ON = ["finance", "work_orders"];

type Cenario = Awaited<ReturnType<typeof cenario>>;

async function cenario() {
  gp.resetGroupPanelMemoryForTests();
  const groups = overview.getMemoryOverviewEconomicGroupsForTests();
  const marks = gp.getMemoryGroupManagerMarksForTests(adapter);
  const novoGrupo = async () => (await groups.createGroup({ name: `Grupo ${randomUUID()}`, notes: null, createdBy: null })).id;
  const gA = await novoGrupo();
  const gB = await novoGrupo();
  const links = (h.core as { identityLinksByPair: Map<string, { identityId: string }> }).identityLinksByPair;

  const org = async (name: string, groupId: string | null, modules: readonly string[] = FINANCE_ON, validFrom = "2020-01-01") => {
    const tenant = h.criarOrganizacao(modules, `${name} ${randomUUID().slice(0, 6)}`);
    if (groupId) await groups.applyMembershipChanges({ closes: [], opens: [{ tenantId: tenant.id, groupId, validFrom, createdBy: null }] });
    return { id: tenant.id, name: (h.core.getTenantForActor(tenant.id, tenant.id) as { name: string }).name };
  };

  /** Uma pessoa com conta em várias organizações, juntadas numa identidade só. */
  const pessoa = async (contas: readonly { readonly tenantId: string; readonly roles: readonly Role[] }[]) => {
    const email = `pessoa-${randomUUID()}@example.com`;
    const users = new Map<string, string>();
    for (const conta of contas) {
      users.set(conta.tenantId, h.core.createUser({ tenantId: conta.tenantId, name: "Pessoa", email, roles: [...conta.roles] }).id);
    }
    const first = contas[0]!;
    const identity = (await adapter.resolveIdentityForUser({ tenantId: first.tenantId, userId: users.get(first.tenantId)! }))!;
    for (const conta of contas.slice(1)) links.get(`${conta.tenantId}::${users.get(conta.tenantId)!}`)!.identityId = identity;
    const rolesOf = (tenantId: string) => contas.find((conta) => conta.tenantId === tenantId)!.roles;
    return {
      email,
      identity,
      users,
      token: (tenantId: string) => h.token({ tenantId, userId: users.get(tenantId)!, email, roles: [...rolesOf(tenantId)] }),
      marcar: (groupId: string) => marks.grant(identity, groupId),
      retirar: (groupId: string) => marks.revoke(identity, groupId),
    };
  };

  return { groups, marks, gA, gB, org, pessoa };
}

function finCtx(tenantId: string) {
  return { tenantId, userId: randomUUID(), roles: ["finance" as const], permissions: resolvePermissionsForRoles(["finance"]) };
}

/** Dados financeiros reais em memória para uma organização (título a receber, conta, entrada, cheque). */
async function semear(tenantId: string, valor: number) {
  const ctx = finCtx(tenantId);
  const account = await financial.accounts.createMemoryFinancialAccountService().create(ctx, { name: `Caixa ${randomUUID()}`, opening_balance: valor });
  await financial.titles.createMemoryFinancialTitleService().create(ctx, {
    direction: "receivable",
    party_type: "customer",
    party_name: "Cliente",
    amount: valor * 2,
    due_date: "2099-12-10",
    issue_date: "2026-01-10",
  });
  await financial.entries.createMemoryFinancialEntryService().create(ctx, { account_id: account.id, direction: "in", amount: valor / 4, payment_method: "pix" });
  await financial.cheques.createMemoryChequeService().create(ctx, { direction: "received", cheque_number: "1", bank: "B", amount: valor / 2, account_id: account.id });
}

async function gestorDeTres(c: Cenario) {
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  const b1 = await c.org("Pátio B1", c.gB);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["manager"] },
    { tenantId: a2.id, roles: ["finance"] },
    { tenantId: b1.id, roles: ["manager"] },
  ]);
  p.marcar(c.gA);
  return { a1, a2, b1, p };
}

const SUMMARY = "/api/v1/group-panel/summary";
const SCOPE = "/api/v1/group-panel/scope";

function semHora(body: any) {
  const copy = JSON.parse(JSON.stringify(body));
  if (copy?.data?.generatedAt) copy.data.generatedAt = "<hora>";
  return copy;
}

/** GET com corpo (o `fetch` não deixa): para provar que o corpo é ignorado. */
function getComCorpo(path: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: any }> {
  const url = new URL(h.baseUrl + path);
  return new Promise((resolve, reject) => {
    const req = httpRequest(
      { host: url.hostname, port: url.port, path: url.pathname + url.search, method: "GET", headers: { ...headers, "content-length": Buffer.byteLength(body) } },
      (res) => {
        let text = "";
        res.on("data", (chunk) => (text += chunk));
        res.on("end", () => resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null }));
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

// ------------------------------------------------------------------------------------------- GM (memória)

test("GM-1: sem marca, 403 not_group_manager nas duas rotas (P-F)", async () => {
  const c = await cenario();
  const { a1, p } = await gestorDeTres(c);
  p.retirar(c.gA);
  const sem = await c.pessoa([{ tenantId: a1.id, roles: ["manager"] }]);
  for (const path of [SUMMARY, SCOPE]) {
    const response = await h.chamar("GET", path, { token: await sem.token(a1.id) });
    assert.equal(response.status, 403, path);
    assert.equal(response.reason, "not_group_manager", path);
  }
});

test("GM-2: marca no grupo A e organização ativa em B1 — 403", async () => {
  const c = await cenario();
  const { b1, p } = await gestorDeTres(c);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(b1.id) });
  assert.equal(response.status, 403);
  assert.equal(response.reason, "not_group_manager");
});

test("GM-3: marca retirada — 403", async () => {
  const c = await cenario();
  const { a1, p } = await gestorDeTres(c);
  assert.equal((await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) })).status, 200, "controle: com a marca abre");
  p.retirar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 403);
  assert.equal(response.reason, "not_group_manager");
});

test("GM-4: o gestor marcado vê só os pátios do grupo em que tem conta", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  const a3 = await c.org("Pátio A3", c.gA);
  const response = await h.chamar("GET", SCOPE, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.organizations.map((org: any) => org.id).sort(), [a1.id, a2.id].sort());
  assert.ok(!JSON.stringify(response.body).includes(a3.id));
});

test("GM-5: a organização ativa saiu do grupo — 403", async () => {
  const c = await cenario();
  const fora = await c.org("Pátio Saiu", c.gA, FINANCE_ON, "2020-01-01");
  const membership = (await c.groups.listMembershipsOfTenants([fora.id]))[0]!;
  await c.groups.applyMembershipChanges({ closes: [{ tenantId: fora.id, membershipId: membership.id, validTo: "2021-01-01", closedBy: null }], opens: [] });
  const p = await c.pessoa([{ tenantId: fora.id, roles: ["manager"] }]);
  p.marcar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(fora.id) });
  assert.equal(response.status, 403);
  assert.equal(response.reason, "not_group_manager");
});

// ------------------------------------------------------------------------------------------- ISO (memória)

test("ISO-1 (memória): A1 e A2 do grupo A, B1 do grupo B, ativa A1 — B1 não aparece em lugar nenhum da resposta", async () => {
  const c = await cenario();
  const { a1, a2, b1, p } = await gestorDeTres(c);
  await semear(b1.id, 999);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.organizations.map((org: any) => org.id).sort(), [a1.id, a2.id].sort());
  const text = JSON.stringify(response.body);
  assert.ok(!text.includes(b1.id), "o id de B1 não sai");
  assert.ok(!text.includes(b1.name), "o nome de B1 não sai");
  assert.equal(response.body.data.coverage.included, 2);
});

test("ISO-2 (memória): a mesma pessoa, marcada também no grupo B, com a ativa em B1, vê só B1", async () => {
  const c = await cenario();
  const { a1, a2, b1, p } = await gestorDeTres(c);
  p.marcar(c.gB);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(b1.id) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [b1.id]);
  const text = JSON.stringify(response.body);
  assert.ok(!text.includes(a1.id) && !text.includes(a2.id));
});

test("ISO-3 (memória): usuário comum com conta e Financeiro em A1 e A2, sem marca — 403", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["finance"] },
    { tenantId: a2.id, roles: ["finance"] },
  ]);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 403);
  assert.equal(response.reason, "not_group_manager");
});

test("ISO-4 (memória) e COV-1: sem financial_entries:read em A2 — A2 fora do total, em withoutAccess", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["manager"] },
    { tenantId: a2.id, roles: ["field_technician"] },
  ]);
  p.marcar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  const data = response.body.data;
  const a2View = data.organizations.find((org: any) => org.id === a2.id);
  assert.equal(a2View.finance.status, "sem_permissao");
  assert.equal(a2View.finance.summary, null);
  assert.equal(data.coverage.complete, true, "pátio sem acesso não anula o total");
  assert.equal(data.coverage.included, 1);
  assert.deepEqual(data.coverage.withoutAccess, [{ id: a2.id, name: a2.name }]);
  assert.equal(data.consolidated.finance.receivableOpen, 200, "só A1 (2 × 100) no total");
  assert.equal(data.consolidated.finance.cashBalance, 125, "só A1 (100 + 25) no total");
});

test("ISO-7 (memória): conta da pessoa em A2 desativada — A2 não aparece", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  h.core.updateUser({ userId: p.users.get(a2.id)!, tenantId: a2.id, status: "inactive" });
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [a1.id]);
});

test("ISO-9 (memória) e ROT-1: query, X-Tenant-Id e corpo que nomeiam B1 não mudam a resposta (P-E)", async () => {
  const c = await cenario();
  const { a1, b1, p } = await gestorDeTres(c);
  await semear(a1.id, 10);
  const token = await p.token(a1.id);
  const limpo = await h.chamar("GET", SUMMARY, { token });
  const forjado = await getComCorpo(
    `${SUMMARY}?organization_id=${b1.id}&tenantId=${b1.id}&tenant_id=${b1.id}`,
    { authorization: `Bearer ${token}`, "x-tenant-id": b1.id, "content-type": "application/json" },
    JSON.stringify({ organizationId: b1.id, tenantId: b1.id }),
  );
  assert.equal(limpo.status, 200);
  assert.equal(forjado.status, 200);
  assert.deepEqual(semHora(forjado.body), semHora(limpo.body));
  assert.ok(!JSON.stringify(forjado.body).includes(b1.id));
});

test("ISO-10 (memória): gestor marcado sem Financeiro na ativa — 200, com a ativa em sem_permissao", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["field_technician"] },
    { tenantId: a2.id, roles: ["finance"] },
  ]);
  p.marcar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  const status = Object.fromEntries(response.body.data.organizations.map((org: any) => [org.id, org.finance.status]));
  assert.deepEqual(status, { [a1.id]: "sem_permissao", [a2.id]: "ok" });
});

test("ISO-11 (memória) e ROT-2: sem token, 401; cabeçalho legado sem JWT também não abre", async () => {
  const c = await cenario();
  const { a1, p } = await gestorDeTres(c);
  for (const path of [SUMMARY, SCOPE]) {
    assert.equal((await h.chamar("GET", path)).status, 401, path);
    const legado = await h.chamar("GET", path, { headers: { "x-tenant-id": a1.id, "x-user-id": p.users.get(a1.id)!, "x-role": "manager" } });
    assert.equal(legado.status, 401, `${path} com cabeçalho legado`);
  }
});

test("ISO-12 (memória): conta com o mesmo e-mail em A2, SEM vínculo de identidade — A2 não aparece (o e-mail não decide)", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  const p = await c.pessoa([{ tenantId: a1.id, roles: ["manager"] }]);
  h.core.createUser({ tenantId: a2.id, name: "Pessoa", email: p.email, roles: ["manager"] });
  p.marcar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [a1.id]);
});

test("ISO-13 (memória): o canário — vínculo de outra organização na volta de A2 derruba o pedido: 500, nenhum número", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  await semear(a1.id, 50);
  // Uma organização em que a pessoa NÃO tem conta (nunca é pedida): a linha dela vazar é o canário.
  const estranha = await c.org("Pátio de fora", c.gA);
  const honest = overview.getMemoryOverviewEconomicGroupsForTests();
  const leaky = {
    async listMembershipsOfTenants(tenantIds: readonly string[]) {
      const rows = await honest.listMembershipsOfTenants(tenantIds);
      if (!tenantIds.includes(a2.id)) return rows;
      return [...rows, ...(await honest.listMembershipsOfTenants([estranha.id]))];
    },
  };
  const service = new gp.GroupPanelService(gp.createMemoryGroupPanelReaders(adapter, { groups: () => leaky }));
  const actor = { userId: p.users.get(a1.id)!, tenantId: a1.id, email: p.email, roles: ["manager"], authType: "jwt" as const };
  await assert.rejects(() => service.getSummary(actor), (error: unknown) => (error as { name?: string }).name === "TenantRowsLeakError");

  const express = (await import("express")).default;
  const { attachAuthenticatedActor } = await import("../src/modules/auth/index.js");
  const app = express();
  app.use("/api/v1", attachAuthenticatedActor(), gp.createGroupPanelRouter(adapter, async () => service));
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  try {
    const port = (server.address() as { port: number }).port;
    const response = await fetch(`http://127.0.0.1:${port}${SUMMARY}`, { headers: { authorization: `Bearer ${await p.token(a1.id)}` } });
    const text = await response.text();
    assert.equal(response.status, 500);
    assert.ok(!text.includes("receivable") && !text.includes("consolidated"), "nenhum número sai");
    assert.ok(!text.includes("economic_group_members") && !text.includes("rows_from_another_tenant"), "a mensagem interna não sai");
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

test("ISO-16 (memória): A2 com o módulo financeiro desligado — modulo_desligado, fora do total; o Financeiro de A2 dá 403", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA, ["work_orders"]);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["manager"] },
    { tenantId: a2.id, roles: ["manager"] },
  ]);
  p.marcar(c.gA);
  const response = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  const a2View = response.body.data.organizations.find((org: any) => org.id === a2.id);
  assert.equal(a2View.finance.status, "modulo_desligado");
  assert.equal(a2View.finance.summary, null);
  assert.equal(response.body.data.consolidated.finance.receivableOpen, 200);
  const direto = await h.chamar("GET", "/api/v1/financial-summary", { token: await p.token(a2.id) });
  assert.equal(direto.status, 403, "o mesmo corte que o Financeiro aplica à organização ativa");
  assert.equal(direto.reason, "module_not_enabled");
});

// ------------------------------------------------------------------------------------------- PAR

test("PAR-1: o resumo de cada pátio é o do Financeiro daquele pátio no MESMO instante (memória, relógio fixo)", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const now = new Date();
  const service = new gp.GroupPanelService(gp.createMemoryGroupPanelReaders(adapter), () => now);
  const actor = { userId: p.users.get(a1.id)!, tenantId: a1.id, email: p.email, roles: ["manager"], authType: "jwt" as const };
  const result = await service.getSummary(actor);
  const repository = new financial.summary.InMemoryFinancialSummaryRepository();
  for (const tenantId of [a1.id, a2.id]) {
    const own = await repository.getSummary({ tenantId, now });
    const panel = result.organizations.find((org) => org.id === tenantId)!;
    assert.deepEqual(panel.finance.summary, own, `pátio ${tenantId}`);
  }
  assert.notDeepEqual(
    result.organizations[0]!.finance.summary,
    result.organizations[1]!.finance.summary,
    "controle: os dois pátios têm números diferentes",
  );
});

test("PAR-2: pela API, o pátio no Painel é igual ao GET /financial-summary daquele pátio", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const painel = await h.chamar("GET", SUMMARY, { token: await p.token(a1.id) });
  assert.equal(painel.status, 200);
  for (const tenantId of [a1.id, a2.id]) {
    const direto = await h.chamar("GET", "/api/v1/financial-summary", { token: await p.token(tenantId) });
    assert.equal(direto.status, 200);
    const org = painel.body.data.organizations.find((candidate: any) => candidate.id === tenantId);
    assert.deepEqual(org.finance.summary, direto.body.data, `pátio ${tenantId}`);
  }
  const consolidated = painel.body.data.consolidated.finance;
  assert.equal(consolidated.receivableOpen, 800, "200 + 600");
  assert.equal(consolidated.cashBalance, 500, "125 + 375");
});

// ------------------------------------------------------------------------------------------- PAY

function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.length === 0 ? [`${prefix}[]`] : keyPaths(value[0], `${prefix}[]`);
  if (value === null || typeof value !== "object") return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => keyPaths(child, prefix ? `${prefix}.${key}` : key));
}

const SUMMARY_FINANCIAL_KEYS = [
  "receivable.openAmount", "receivable.openCount", "receivable.overdueAmount", "receivable.overdueCount", "receivable.inDisputeCount",
  "payable.openAmount", "payable.openCount", "payable.overdueAmount", "payable.overdueCount", "payable.inDisputeCount",
  "settledThisMonth.competencia", "settledThisMonth.inflow", "settledThisMonth.outflow",
  "cash.totalBalance", "cash.accountCount", "cash.currency",
  "cheques.pendingReceivedCount", "cheques.pendingReceivedAmount", "cheques.pendingIssuedCount", "cheques.pendingIssuedAmount",
  "cheques.linkedPendingCount", "cheques.linkedPendingAmount",
  "cashFlow[].competencia", "cashFlow[].inflow", "cashFlow[].outflow",
  "recentTitles[].id", "recentTitles[].direction", "recentTitles[].partyName", "recentTitles[].amount", "recentTitles[].openAmount",
  "recentTitles[].dueDate", "recentTitles[].status", "recentTitles[].overdue",
];

const OPERATIONS_KEYS = [
  "openedToday", "openedThisWeek", "inProgress", "overdue", "openedThisMonth", "completedThisMonth",
  "openedPreviousMonth", "completionRatePct", "arrivalAvgMinutes", "arrivalCount", "arrivalMissingCount", "completionAvgMinutes",
];

const STAFF_KEYS = ["activeUsers", "byProfile[].profile", "byProfile[].count", "inServiceNow"];

test("PAY-1: as duas respostas só têm as chaves do contrato (lista fechada)", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const token = await p.token(a1.id);
  const summary = await h.chamar("GET", SUMMARY, { token });
  const expected = [
    "data.generatedAt",
    "data.coverage.complete", "data.coverage.included", "data.coverage.failed[]", "data.coverage.reason", "data.coverage.withoutAccess[]",
    "data.consolidated.currency",
    ...[
      "receivableOpen", "receivableOpenCount", "receivableOverdue", "receivableOverdueCount",
      "payableOpen", "payableOpenCount", "payableOverdue", "payableOverdueCount",
      "receivedThisMonth", "paidThisMonth", "competencia", "cashBalance", "accountCount",
      "cashFlow[].competencia", "cashFlow[].inflow", "cashFlow[].outflow",
      "receivedVariationPct", "paidVariationPct",
    ].map((key) => `data.consolidated.finance.${key}`),
    "data.organizations[].id", "data.organizations[].name", "data.organizations[].finance.status",
    ...SUMMARY_FINANCIAL_KEYS.map((key) => `data.organizations[].finance.summary.${key}`),
    "data.organizations[].finance.receivedVariationPct", "data.organizations[].finance.paidVariationPct",
    ...OPERATIONS_KEYS.map((key) => `data.consolidated.operations.${key}`),
    ...STAFF_KEYS.map((key) => `data.consolidated.staff.${key}`),
    "data.organizations[].operations.status",
    ...OPERATIONS_KEYS.map((key) => `data.organizations[].operations.summary.${key}`),
    "data.organizations[].staff.status",
    ...STAFF_KEYS.map((key) => `data.organizations[].staff.summary.${key}`),
  ];
  assert.deepEqual([...new Set(keyPaths(summary.body))].sort(), [...expected].sort());
  const scope = await h.chamar("GET", SCOPE, { token });
  assert.deepEqual(
    [...new Set(keyPaths(scope.body))].sort(),
    ["data.inGroup", "data.organizations[].finance", "data.organizations[].id", "data.organizations[].name", "data.organizations[].operations", "data.organizations[].staff"].sort(),
  );
});

test("PAY-2: nada de identificador de grupo, e-mail, token nem identidade nas respostas", async () => {
  const c = await cenario();
  const { a1, p } = await gestorDeTres(c);
  await semear(a1.id, 100);
  const token = await p.token(a1.id);
  for (const path of [SUMMARY, SCOPE]) {
    const text = JSON.stringify((await h.chamar("GET", path, { token })).body);
    for (const forbidden of [c.gA, c.gB, p.email, token, p.identity, "tenant_id", "tenantId", "groupId", "group_id", "email", "token"]) {
      assert.ok(!text.includes(forbidden), `${path} não pode conter ${forbidden}`);
    }
  }
});

// ------------------------------------------------------------------------------------------- RO

async function contagens(tenantIds: readonly string[]) {
  const all = { tenantId: "", includeDeleted: true, includeInactive: true, limit: Number.MAX_SAFE_INTEGER, offset: 0 };
  const counts: number[] = [];
  for (const tenantId of tenantIds) {
    const input = { ...all, tenantId };
    counts.push((await financial.titles.getMemoryFinancialTitleRepositoryForTests().list(input as never)).items.length);
    counts.push((await financial.entries.getMemoryFinancialEntryRepositoryForTests().list(input as never)).items.length);
    counts.push((await financial.accounts.getMemoryFinancialAccountRepositoryForTests().list(input as never)).items.length);
    counts.push((await financial.cheques.getMemoryChequeRepositoryForTests().list(input as never)).items.length);
  }
  return counts;
}

test("RO-1: o Painel não escreve nada financeiro — as 4 contagens iguais antes e depois", async () => {
  const c = await cenario();
  const { a1, a2, p } = await gestorDeTres(c);
  await semear(a1.id, 100);
  await semear(a2.id, 300);
  const antes = await contagens([a1.id, a2.id]);
  assert.ok(antes.every((count) => count === 1), "controle: cada pátio tem 1 de cada");
  const token = await p.token(a1.id);
  await h.chamar("GET", SUMMARY, { token });
  await h.chamar("GET", SCOPE, { token });
  assert.deepEqual(await contagens([a1.id, a2.id]), antes);
});

test("RO-2: POST, PUT, PATCH e DELETE nas duas rotas são 404 (rota inexistente)", async () => {
  const c = await cenario();
  const { a1, p } = await gestorDeTres(c);
  const token = await p.token(a1.id);
  for (const path of [SUMMARY, SCOPE]) {
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      const response = await h.chamar(method, path, { token, body: {} });
      assert.equal(response.status, 404, `${method} ${path}`);
    }
  }
});

test("ROT-3: o /scope lista os pátios do alcance com o que a pessoa pode ver em cada um", async () => {
  const c = await cenario();
  const a1 = await c.org("Pátio A1", c.gA);
  const a2 = await c.org("Pátio A2", c.gA);
  const p = await c.pessoa([
    { tenantId: a1.id, roles: ["manager"] },
    { tenantId: a2.id, roles: ["field_technician"] },
  ]);
  p.marcar(c.gA);
  const response = await h.chamar("GET", SCOPE, { token: await p.token(a1.id) });
  assert.equal(response.status, 200);
  assert.equal(response.body.data.inGroup, true);
  const byId = Object.fromEntries(response.body.data.organizations.map((org: any) => [org.id, org]));
  assert.deepEqual(byId[a1.id], { id: a1.id, name: a1.name, finance: true, operations: true, staff: true });
  assert.deepEqual(byId[a2.id], { id: a2.id, name: a2.name, finance: false, operations: false, staff: false });
});
