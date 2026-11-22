// B-GRUPO-GESTOR (1a, fatia F2) — os testes de isolamento COM BANCO do Painel do grupo, sob o papel de runtime
// `NOSUPERUSER NOBYPASSRLS` (plano-base §3.7; Emendas 1 §1.3 e 2 §2.1 e §4.2).
//
// Terreno: uma base PRÓPRIA (template0 + `prisma migrate deploy` + `prisma db seed`), para que (a) os papéis do
// catálogo venham da mesma semente do CI, (b) a organização de sistema `platform` exista sem disputar o slug único com
// outra suíte que rode em paralelo, e (c) as mutações da migração (MUT-21) sejam reaplicadas a cada execução. O app real
// (`createApp`) roda no modo `prisma`, com o singleton do Prisma apontado para o cliente do papel efêmero, e os tokens são
// JWT de verdade (`signAccessToken`). A semeadura e a limpeza usam a conexão administrativa; a marca de gestor é dada e
// retirada pelo repositório REAL da FM (`PrismaEconomicGroupManagersRepository`), sob o papel.
//
// Casos: LMK-1 a LMK-4 (a leitura das marcas da própria pessoa); GM-1 a GM-5 (a porta da marca); ISO-1 a ISO-17; RLS-1
// (cada leitura no GUC da própria organização); PAR-2 (Prisma); AUD-5 (uma linha de trilha em cada organização lida).
// Os testes ISO-14, ISO-15 e ISO-17 provam o corte por par no `/scope`, os leitores Prisma no contexto de cada pátio e,
// depois da integração F4, os blocos `operations` e `staff` do `/summary`.
import "dotenv/config";

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { request as httpRequest, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createRequire } from "node:module";
import path from "node:path";
import test, { after, before } from "node:test";
import { fileURLToPath } from "node:url";

import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { computeOperations } from "../src/modules/group-panel/group-panel.sla.js";

const connectionString = process.env.DATABASE_URL;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARY = "/api/v1/group-panel/summary";
const SCOPE = "/api/v1/group-panel/scope";
const FINANCE_ON = ["finance", "work_orders"];

type Json = Record<string, any>;
type Ctx = Awaited<ReturnType<typeof bootstrap>>;

/** Valor ou erro, para que o teste fique vermelho por asserção (e não por exceção) quando o código falha. */
async function settle<T>(work: Promise<T>): Promise<T | { readonly error: string }> {
  try {
    return await work;
  } catch (error) {
    return { error: (error as { name?: string }).name ?? String(error) };
  }
}

function addDays(day: string, days: number): string {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Todo caso tem prazo: um pedido que não volta vira vermelho, e o `after` (que apaga a base própria) ainda roda. */
const CASE_TIMEOUT_MS = 120_000;

function semHora(body: any) {
  const copy = JSON.parse(JSON.stringify(body));
  if (copy?.data?.generatedAt) copy.data.generatedAt = "<hora>";
  return copy;
}

if (!connectionString) {
  test("B-GRUPO-GESTOR · isolamento -db exige DATABASE_URL", { skip: "Defina o PostgreSQL descartável." });
} else {
  let ctx: Ctx;
  before(async () => {
    ctx = await bootstrap(connectionString);
  });
  after(async () => {
    await ctx?.close();
  });

  // ------------------------------------------------------------------------------------- LMK: a leitura das marcas

  test("LMK-1: a marca RETIRADA volta, com revokedAt, ao lado da viva — lida do pátio ativo pelo braço de identidade", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gB);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: "manager" }]);
    const viva = await c.marcar(p, c.gA, a1.id);
    const retirada = await c.marcar(p, c.gB, a2.id);
    await c.retirar(c.gB, retirada);
    const marks = await settle(ctx.marks.listMarksForActor(p.actor(a1.id)));
    assert.ok(Array.isArray(marks), `a leitura falhou: ${JSON.stringify(marks)}`);
    const byGroup = Object.fromEntries((marks as any[]).map((mark) => [mark.groupId, mark.revokedAt === null ? "viva" : "retirada"]));
    assert.deepEqual(byGroup, { [c.gA]: "viva", [c.gB]: "retirada" });
    assert.ok((marks as any[]).find((mark) => mark.groupId === c.gB).revokedAt instanceof Date, "a marca retirada traz revokedAt");
    assert.ok(viva.length > 0, "a marca viva foi gravada");
  });

  test("LMK-2: a marca de OUTRA identidade não volta (a pessoa Y, no mesmo pátio, não lê a marca de X)", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const x = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    const y = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    await c.marcar(x, c.gA, a1.id);
    assert.deepEqual(await settle(ctx.marks.listMarksForActor(y.actor(a1.id))), []);
    const own = await settle(ctx.marks.listMarksForActor(x.actor(a1.id)));
    assert.deepEqual(own, [{ groupId: c.gA, revokedAt: null }], "controle: X lê a própria");
  });

  test("LMK-3: sem contexto, não volta nada — par sem vínculo de identidade e cliente sem GUC leem zero", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const x = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    await c.marcar(x, c.gA, a1.id);
    const semVinculo = await c.pessoa([{ tenantId: a1.id, role: "manager" }], { link: false });
    assert.deepEqual(await settle(ctx.marks.listMarksForActor(semVinculo.actor(a1.id))), []);
    assert.equal((await ctx.role.client.economicGroupManager.findMany()).length, 0, "o papel sem GUC não lê marca nenhuma");
  });

  test("LMK-4: no contexto da organização dona das marcas, a pessoa recebe só as próprias (filtro e canário de identidade)", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const x = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: ctx.platform, role: "manager" }]);
    const y = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    await c.marcar(x, c.gA, a1.id);
    await c.marcar(y, c.gA, a1.id);
    const marks = await settle(ctx.marks.listMarksForActor(x.actor(ctx.platform)));
    assert.deepEqual(marks, [{ groupId: c.gA, revokedAt: null }]);
  });

  // ------------------------------------------------------------------------------------- GM (banco): a porta da marca

  test("GM-1: sem marca, 403 not_group_manager nas duas rotas (P-F)", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    for (const route of [SUMMARY, SCOPE]) {
      const response = await ctx.call(route, { token: await p.token(a1.id) });
      assert.equal(response.status, 403, route);
      assert.equal(response.body?.error?.reason, "not_group_manager", route);
    }
  });

  test("GM-2: marca no grupo A e organização ativa em B1 — 403", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { b1, p } = await c.gestorDeTres();
    const response = await ctx.call(SUMMARY, { token: await p.token(b1.id) });
    assert.equal(response.status, 403);
    assert.equal(response.body?.error?.reason, "not_group_manager");
  });

  test("GM-3: marca retirada — 403", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, p, mark } = await c.gestorDeTres();
    assert.equal((await ctx.call(SUMMARY, { token: await p.token(a1.id) })).status, 200, "controle: com a marca abre");
    await c.retirar(c.gA, mark);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 403);
    assert.equal(response.body?.error?.reason, "not_group_manager");
  });

  test("GM-4: o gestor marcado vê só os pátios do grupo em que tem conta", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    const a3 = await c.org("Pátio A3", c.gA);
    const response = await ctx.call(SCOPE, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.organizations.map((org: any) => org.id).sort(), [a1.id, a2.id].sort());
    assert.ok(!JSON.stringify(response.body).includes(a3.id), "A3 (sem conta) não sai na resposta");
  });

  test("GM-5: a organização ativa saiu do grupo — 403", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const fora = await c.org("Pátio Saiu", c.gA);
    const p = await c.pessoa([{ tenantId: fora.id, role: "manager" }]);
    await c.marcar(p, c.gA, fora.id);
    await c.fecharVinculo(fora.id, ctx.today);
    const response = await ctx.call(SUMMARY, { token: await p.token(fora.id) });
    assert.equal(response.status, 403);
    assert.equal(response.body?.error?.reason, "not_group_manager");
  });

  test("GM-8: grupo apagado não abre scope nem summary e não grava trilha", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, p } = await c.gestorDeTres();
    const token = await p.token(a1.id);
    assert.equal((await ctx.call(SUMMARY, { token })).status, 200, "controle: grupo vivo abre");
    const viewsBefore = await ctx.viewsIn([a1.id]);
    await ctx.db.economicGroup.update({ where: { id: c.gA }, data: { deleted_at: new Date("2026-11-22T15:00:00.000Z") } });
    for (const route of [SCOPE, SUMMARY]) {
      const response = await ctx.call(route, { token });
      assert.equal(response.status, 403, route);
      assert.equal(response.body.error?.reason, "not_group_manager", route);
    }
    assert.equal(await ctx.viewsIn([a1.id]), viewsBefore);
  });

  // ------------------------------------------------------------------------------------- ISO (banco)

  test("ISO-1: A1 e A2 do grupo A, B1 do grupo B, ativa A1 — B1 não aparece em lugar nenhum da resposta, nem na contagem", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, b1, p } = await c.gestorDeTres();
    await c.semear(a1.id, 100);
    await c.semear(b1.id, 999);
    for (const route of [SUMMARY, SCOPE]) {
      const response = await ctx.call(route, { token: await p.token(a1.id) });
      assert.equal(response.status, 200, route);
      assert.deepEqual(response.body.data.organizations.map((org: any) => org.id).sort(), [a1.id, a2.id].sort(), route);
      const text = JSON.stringify(response.body);
      assert.ok(!text.includes(b1.id), `${route}: o id de B1 não sai`);
      assert.ok(!text.includes(b1.name), `${route}: o nome de B1 não sai`);
    }
    const summary = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(summary.body.data.coverage.included, 2);
    assert.equal(summary.body.data.consolidated.finance.receivableOpen, 200, "só A1 (2 × 100); B1 (2 × 999) fora");
  });

  test("ISO-2: a mesma pessoa, marcada também no grupo B, com a ativa em B1, vê só B1", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, b1, p } = await c.gestorDeTres();
    await c.marcar(p, c.gB, b1.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(b1.id) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [b1.id]);
    const text = JSON.stringify(response.body);
    assert.ok(!text.includes(a1.id) && !text.includes(a2.id), "A1 e A2 não saem na resposta da ativa B1");
  });

  test("ISO-3: usuário comum com conta e Financeiro em A1 e A2, sem marca — 403 not_group_manager", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    const p = await c.pessoa([{ tenantId: a1.id, role: "finance" }, { tenantId: a2.id, role: "finance" }]);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 403);
    assert.equal(response.body?.error?.reason, "not_group_manager");
    assert.equal((await ctx.call("/api/v1/financial-summary", { token: await p.token(a1.id) })).status, 200, "controle: o Financeiro de A1 abre");
  });

  test("ISO-4: Financeiro em A1 e papel sem financial_entries:read em A2 — A2 fora do bloco financeiro e do total", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    await c.semear(a1.id, 100);
    await c.semear(a2.id, 300);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: "field_technician" }]);
    await c.marcar(p, c.gA, a1.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    const data = response.body.data;
    const a2View = data.organizations.find((org: any) => org.id === a2.id);
    assert.equal(a2View.finance.status, "sem_permissao");
    assert.equal(a2View.finance.summary, null);
    assert.equal(data.coverage.included, 1);
    assert.deepEqual(data.coverage.withoutAccess, [{ id: a2.id, name: a2.name }]);
    assert.equal(data.consolidated.finance.receivableOpen, 200, "só A1 (2 × 100) no total");
  });

  test("ISO-5: A2 saiu do grupo ontem (valid_to = hoje) — A2 não aparece", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    await c.fecharVinculo(a2.id, ctx.today);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [a1.id]);
    assert.ok(!JSON.stringify(response.body).includes(a2.id), "A2 (fora do grupo hoje) não sai na resposta");
  });

  test("ISO-6: A2 entra no grupo amanhã (valid_from = amanhã) — A2 não aparece", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA, { validFrom: addDays(ctx.today, 1) });
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: "manager" }]);
    await c.marcar(p, c.gA, a1.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [a1.id]);
    assert.ok(!JSON.stringify(response.body).includes(a2.id), "A2 (entra amanhã) não sai na resposta");
  });

  test("ISO-7: conta da pessoa em A2 desativada, ou A2 suspensa — A2 não aparece", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    assert.equal((await ctx.call(SUMMARY, { token: await p.token(a1.id) })).body.data.organizations.length, 2, "controle");
    await ctx.db.user.update({ where: { id: p.users.get(a2.id)! }, data: { status: "inactive" } });
    const inativa = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.deepEqual(inativa.body.data.organizations.map((org: any) => org.id), [a1.id], "conta desativada");
    await ctx.db.user.update({ where: { id: p.users.get(a2.id)! }, data: { status: "active" } });
    await ctx.db.tenant.update({ where: { id: a2.id }, data: { status: "suspended" } });
    const suspensa = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.deepEqual(suspensa.body.data.organizations.map((org: any) => org.id), [a1.id], "organização suspensa");
  });

  test("ISO-8: organização ativa sem grupo — 403 not_group_manager, nada de outra organização é lido", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const solta = await c.org("Pátio Sem Grupo", null);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: solta.id, role: "manager" }]);
    await c.marcar(p, c.gA, a1.id);
    for (const route of [SUMMARY, SCOPE]) {
      const response = await ctx.call(route, { token: await p.token(solta.id) });
      assert.equal(response.status, 403, route);
      assert.equal(response.body?.error?.reason, "not_group_manager", route);
      assert.ok(!JSON.stringify(response.body).includes(a1.id), route);
    }
    assert.equal(await ctx.viewsIn([a1.id, solta.id]), 0, "nenhuma trilha: nada foi lido");
  });

  test("ISO-9: X-Tenant-Id, parâmetro organization_id e corpo que nomeiam B1 — resposta idêntica à do pedido sem eles", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, b1, p } = await c.gestorDeTres();
    await c.semear(a1.id, 10);
    const token = await p.token(a1.id);
    const limpo = await ctx.call(SUMMARY, { token });
    const forjado = await ctx.getComCorpo(
      `${SUMMARY}?organization_id=${b1.id}&tenantId=${b1.id}&tenant_id=${b1.id}`,
      { authorization: `Bearer ${token}`, "x-tenant-id": b1.id, "content-type": "application/json" },
      JSON.stringify({ organizationId: b1.id, tenantId: b1.id }),
    );
    assert.equal(limpo.status, 200);
    assert.equal(forjado.status, 200);
    assert.deepEqual(semHora(forjado.body), semHora(limpo.body));
    assert.ok(!JSON.stringify(forjado.body).includes(b1.id), "B1 não sai na resposta forjada");
  });

  test("ISO-10: gestor marcado sem Financeiro na ativa — 200, com a ativa em sem_permissao; sem marca, 403", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    const p = await c.pessoa([{ tenantId: a1.id, role: "field_technician" }, { tenantId: a2.id, role: "finance" }]);
    assert.equal((await ctx.call(SUMMARY, { token: await p.token(a1.id) })).status, 403, "sem marca");
    await c.marcar(p, c.gA, a2.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    const status = Object.fromEntries(response.body.data.organizations.map((org: any) => [org.id, org.finance.status]));
    assert.deepEqual(status, { [a1.id]: "sem_permissao", [a2.id]: "ok" });
  });

  test("ISO-11: sem token, 401; cabeçalho legado sem JWT também não abre", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, p } = await c.gestorDeTres();
    for (const route of [SUMMARY, SCOPE]) {
      assert.equal((await ctx.call(route)).status, 401, route);
      const legado = await ctx.call(route, { headers: { "x-tenant-id": a1.id, "x-user-id": p.users.get(a1.id)!, "x-role": "manager" } });
      assert.equal(legado.status, 401, `${route} com cabeçalho legado`);
    }
  });

  test("ISO-12: duas organizações com o mesmo e-mail e SEM vínculo de identidade — a outra não aparece (o e-mail não decide)", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }]);
    await c.usuarioAvulso(a2.id, p.email, "manager");
    await c.marcar(p, c.gA, a1.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    assert.deepEqual(response.body.data.organizations.map((org: any) => org.id), [a1.id]);
    assert.ok(!JSON.stringify(response.body).includes(a2.id), "A2 (sem vínculo) não sai na resposta");
  });

  test("ISO-13: canário — o repositório devolve vínculo de outra organização na volta de A2: TenantRowsLeakError, 500, nenhum número", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    await c.semear(a1.id, 50);
    const estranha = await c.org("Pátio de fora", c.gA);
    const honest = new ctx.mod.groups.PrismaEconomicGroupsRepository(ctx.role.client);
    const leaky = {
      async listMembershipsOfTenants(tenantIds: readonly string[]) {
        const rows = await honest.listMembershipsOfTenants(tenantIds);
        if (!tenantIds.includes(a2.id)) return rows;
        return [...rows, ...(await honest.listMembershipsOfTenants([estranha.id]))];
      },
    };
    const service = new ctx.mod.gp.GroupPanelService(ctx.mod.prisma.createPrismaGroupPanelReaders(ctx.role.client, ctx.core, { groups: leaky }));
    const outcome = await settle(service.getSummary(p.actor(a1.id)));
    assert.deepEqual(outcome, { error: "TenantRowsLeakError" });

    const express = (await import("express")).default;
    const { attachAuthenticatedActor } = await import("../src/modules/auth/index.js");
    const app = express();
    app.use("/api/v1", attachAuthenticatedActor(), ctx.mod.gp.createGroupPanelRouter(ctx.core, async () => service));
    const server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    try {
      const port = (server.address() as AddressInfo).port;
      const response = await fetch(`http://127.0.0.1:${port}${SUMMARY}`, { headers: { authorization: `Bearer ${await p.token(a1.id)}` } });
      const text = await response.text();
      assert.equal(response.status, 500);
      assert.ok(!text.includes("receivable") && !text.includes("consolidated"), "nenhum número sai");
      assert.ok(!text.includes("economic_group_members") && !text.includes("rows_from_another_tenant"), "a mensagem interna não sai");
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("ISO-14: escritório em A1 e papel de campo em A2 — o bloco de chamados de A2 fica fora; as OS lidas são só as de cada pátio", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: "field_technician" }]);
    await c.marcar(p, c.gA, a1.id);
    await c.os(a1.id, 1);
    await c.os(a2.id, 2);
    const response = await ctx.call(SCOPE, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    const operations = Object.fromEntries(response.body.data.organizations.map((org: any) => [org.id, org.operations]));
    assert.deepEqual(operations, { [a1.id]: true, [a2.id]: false }, "papel de campo com recorte em A2: sem bloco de chamados");
    assert.equal((await ctx.mod.prisma.readGroupPanelWorkOrderRows(ctx.role.client, { tenantId: a1.id })).length, 1, "A1 lê só a dela");
    assert.equal((await ctx.mod.prisma.readGroupPanelWorkOrderRows(ctx.role.client, { tenantId: a2.id })).length, 2, "A2 lê só as dela");
    const summary = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(summary.status, 200);
    const operationViews = Object.fromEntries(summary.body.data.organizations.map((org: any) => [org.id, org.operations]));
    assert.equal(operationViews[a1.id].status, "ok");
    assert.equal(operationViews[a1.id].summary.openedThisMonth, 1, "A1 entra no bloco de chamados");
    assert.deepEqual(operationViews[a2.id], { status: "sem_permissao", summary: null }, "A2 não vaza chamados no summary");
    assert.equal(summary.body.data.consolidated.operations.openedThisMonth, 1, "o consolidado soma somente A1");
  });

  test("ISO-15: dashboard:read em A1 e não em A2 — A2 sem bloco de chamados; o financeiro de A2 não muda", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    await c.semear(a2.id, 300);
    const semPainel = ctx.roleWith("financial_entries:read", "dashboard:read");
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: semPainel }]);
    await c.marcar(p, c.gA, a1.id);
    const scope = await ctx.call(SCOPE, { token: await p.token(a1.id) });
    assert.equal(scope.status, 200);
    const flags = Object.fromEntries(scope.body.data.organizations.map((org: any) => [org.id, [org.finance, org.operations]]));
    assert.deepEqual(flags, { [a1.id]: [true, true], [a2.id]: [true, false] });
    const summary = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(summary.status, 200);
    const a2View = summary.body.data.organizations.find((org: any) => org.id === a2.id);
    assert.equal(a2View.finance.status, "ok");
    assert.deepEqual(a2View.operations, { status: "sem_permissao", summary: null }, "A2 fica fora do bloco de chamados no summary");
    const direto = await ctx.call("/api/v1/financial-summary", { token: await p.token(a2.id) });
    assert.equal(direto.status, 200);
    assert.deepEqual(a2View.finance.summary, direto.body.data, "o financeiro de A2 é o do Financeiro de A2");
  });

  test("ISO-16: A2 com o módulo financeiro desligado — modulo_desligado, sem número, fora do total; o Financeiro de A2 dá 403", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA, { modules: ["work_orders"] });
    await c.semear(a1.id, 100);
    await c.semear(a2.id, 300);
    const p = await c.pessoa([{ tenantId: a1.id, role: "manager" }, { tenantId: a2.id, role: "manager" }]);
    await c.marcar(p, c.gA, a1.id);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    const a2View = response.body.data.organizations.find((org: any) => org.id === a2.id);
    assert.equal(a2View.finance.status, "modulo_desligado");
    assert.equal(a2View.finance.summary, null);
    assert.equal(response.body.data.consolidated.finance.receivableOpen, 200, "só A1 no total");
    const direto = await ctx.call("/api/v1/financial-summary", { token: await p.token(a2.id) });
    assert.equal(direto.status, 403, "o mesmo corte que o Financeiro aplica à organização ativa");
    assert.equal(direto.body?.error?.reason, "module_not_enabled");
  });

  test("ISO-17: os funcionários de B1 não entram em lugar nenhum — fora do alcance e fora da leitura de cada pátio", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, b1, p } = await c.gestorDeTres();
    const funcionarioB1 = await c.usuarioAvulso(b1.id, `func-b1-${randomUUID()}@example.com`, "operator");
    const scope = await ctx.call(SCOPE, { token: await p.token(a1.id) });
    assert.equal(scope.status, 200);
    assert.ok(!JSON.stringify(scope.body).includes(b1.id), "B1 não sai no alcance");
    for (const tenantId of [a1.id, a2.id]) {
      const rows = await ctx.mod.prisma.readGroupPanelStaffRows(ctx.role.client, { tenantId });
      assert.deepEqual(rows.map((row) => row.userId), [p.users.get(tenantId)], `pátio ${tenantId}: só o próprio usuário`);
      assert.ok(!rows.some((row) => row.userId === funcionarioB1 || row.localKey.startsWith(`${b1.id}:`)), "nenhum funcionário de B1 na leitura do pátio");
      assert.equal(rows[0]!.identityId, p.identity, "a chave interna da pessoa é a identidade (nunca o e-mail)");
    }
    const b1Rows = await ctx.mod.prisma.readGroupPanelStaffRows(ctx.role.client, { tenantId: b1.id });
    assert.equal(b1Rows.length, 2, "controle: B1 tem 2 usuários, lidos só no contexto de B1");
    const summary = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(summary.status, 200);
    const summaryText = JSON.stringify(summary.body);
    assert.ok(!summaryText.includes(b1.id), "B1 não sai no bloco staff do summary");
    assert.ok(!summaryText.includes(funcionarioB1), "o funcionário de B1 não sai no summary");
    assert.deepEqual(summary.body.data.organizations.map((org: any) => org.id).sort(), [a1.id, a2.id].sort());
    assert.equal(summary.body.data.organizations.find((org: any) => org.id === a1.id).staff.status, "ok");
    assert.equal(summary.body.data.consolidated.staff.activeUsers, 1, "a identidade do gestor conta uma vez no grupo; B1 não entra");
  });

  // ------------------------------------------------------------------------------------- RLS-1, PAR-2, AUD-5

  test("RLS-1: a leitura de cada pátio roda com o GUC daquele pátio (A1 em A1, A2 em A2) e devolve o número dele", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    await c.semear(a1.id, 100);
    await c.semear(a2.id, 300);
    const seen: string[] = [];
    const { withTenantRls } = await import("../src/database/rls.js");
    const { PrismaFinancialSummaryRepository, RlsPrismaFinancialSummaryRepository } = await import("../src/modules/financial-summary/financial-summary-prisma.repository.js");
    const finance = {
      getSummary: (input: { tenantId: string; now: Date }) =>
        withTenantRls(ctx.role.client, input.tenantId, async (tx) => {
          const [row] = await tx.$queryRaw<Array<{ guc: string }>>`SELECT current_setting('app.current_tenant_id', true) AS guc`;
          seen.push(row!.guc);
          return new PrismaFinancialSummaryRepository(tx).getSummary(input);
        }),
    };
    const now = new Date();
    const service = new ctx.mod.gp.GroupPanelService(ctx.mod.prisma.createPrismaGroupPanelReaders(ctx.role.client, ctx.core, { finance }), () => now);
    const result = await service.getSummary(p.actor(a1.id));
    assert.deepEqual(seen, [a1.id, a2.id], "uma leitura por pátio, cada uma no contexto dele");
    const own = new RlsPrismaFinancialSummaryRepository(ctx.role.client);
    for (const tenantId of [a1.id, a2.id]) {
      const panel = result.organizations.find((org) => org.id === tenantId)!;
      assert.deepEqual(panel.finance.summary, await own.getSummary({ tenantId, now }), `pátio ${tenantId}`);
    }
    assert.notDeepEqual(result.organizations[0]!.finance.summary, result.organizations[1]!.finance.summary, "controle: números diferentes");
  });

  test("PAR-2 (Prisma): pela API, o pátio no Painel é igual ao GET /financial-summary daquele pátio; o total é a soma", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const { a1, a2, p } = await c.gestorDeTres();
    await c.semear(a1.id, 100);
    await c.semear(a2.id, 300);
    const painel = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(painel.status, 200);
    for (const tenantId of [a1.id, a2.id]) {
      const direto = await ctx.call("/api/v1/financial-summary", { token: await p.token(tenantId) });
      assert.equal(direto.status, 200);
      const org = painel.body.data.organizations.find((candidate: any) => candidate.id === tenantId);
      assert.deepEqual(org.finance.summary, direto.body.data, `pátio ${tenantId}`);
    }
    assert.equal(painel.body.data.consolidated.finance.receivableOpen, 800, "200 + 600");
    assert.equal(painel.body.data.consolidated.finance.cashBalance, 400, "100 + 300");
  });

  test("LEITOR-OS: lê o mês anterior e chamados abertos antigos, mas não terminal antigo", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const patio = await c.org("Pátio Leitor", c.gA);
    const now = new Date("2026-11-22T15:00:00.000Z");
    const rows = [
      { tenant_id: patio.id, code: `OLD-DONE-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "completed", created_at: new Date("2025-01-10T15:00:00.000Z"), completed_at: new Date("2025-01-10T16:00:00.000Z") },
      { tenant_id: patio.id, code: `OLD-OPEN-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "on_site", created_at: new Date("2025-01-11T15:00:00.000Z"), scheduled_for: new Date("2025-01-11T16:00:00.000Z") },
      { tenant_id: patio.id, code: `CURRENT-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "open", created_at: new Date("2026-11-10T15:00:00.000Z") },
    ] as const;
    await ctx.db.workOrder.createMany({ data: [...rows] });
    const selected = await ctx.mod.prisma.readGroupPanelWorkOrderRows(ctx.role.client, { tenantId: patio.id, now });
    assert.deepEqual(selected.map((row: any) => row.status).sort(), ["on_site", "open"].sort());
    assert.deepEqual(computeOperations(selected, now), computeOperations(rows.map((row) => ({
      status: row.status as any,
      createdAt: row.created_at,
      scheduledFor: "scheduled_for" in row ? row.scheduled_for : null,
      arrivedAt: null,
      completedAt: "completed_at" in row ? row.completed_at : null,
      assignedUserId: null,
    })), now));
  });

  test("LEITOR-OS-PLANO: explica o SQL real capturado e usa índice sem Seq Scan", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const patio = await c.org("Pátio Plano", c.gA);
    const now = new Date("2026-11-22T15:00:00.000Z");
    for (let offset = 0; offset < 20_000; offset += 1_000) {
      await ctx.db.workOrder.createMany({ data: Array.from({ length: 1_000 }, (_, index) => ({
        tenant_id: patio.id,
        code: `PLAN-${offset + index}-${randomUUID()}`,
        title: "OS",
        customer_name: "Cliente",
        status: "completed",
        created_at: new Date("2025-01-10T15:00:00.000Z"),
      })) });
    }
    await ctx.db.workOrder.createMany({ data: [
      { tenant_id: patio.id, code: `PLAN-OPEN-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "on_site", created_at: new Date("2025-01-11T15:00:00.000Z") },
      { tenant_id: patio.id, code: `PLAN-PREV-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "completed", created_at: new Date("2026-10-10T15:00:00.000Z") },
      { tenant_id: patio.id, code: `PLAN-CURRENT-${randomUUID()}`, title: "OS", customer_name: "Cliente", status: "open", created_at: new Date("2026-11-10T15:00:00.000Z") },
    ] });
    await ctx.db.$executeRawUnsafe("ANALYZE work_orders");
    ctx.queryEvents.length = 0;
    const selected = await ctx.mod.prisma.readGroupPanelWorkOrderRows(ctx.role.client, { tenantId: patio.id, now });
    assert.equal(selected.length, 3);
    const event = [...ctx.queryEvents].reverse().find((candidate) => candidate.query.includes('FROM "public"."work_orders"'));
    assert.ok(event, "LEITOR-OS-PLANO: o evento query captura o SELECT real de work_orders");
    assert.ok(event!.query.includes("created_at") && event!.query.includes("status"), `SQL capturado: ${event!.query}`);
    const params = JSON.parse(event!.params) as unknown[];
    const { withTenantRls } = await import("../src/database/rls.js");
    const explained = await withTenantRls(ctx.role.client, patio.id, (tx: any) => tx.$queryRawUnsafe(`EXPLAIN (FORMAT JSON) ${event!.query}`, ...params));
    const plan = JSON.stringify(explained);
    assert.doesNotMatch(plan, /Seq Scan[^}]*work_orders/i);
    assert.match(plan, /(Index Scan|Index Only Scan|Bitmap Index Scan)/i);
  });

  test("AUD-5: leitura de A1, A2 e A3 — uma linha de trilha em cada uma, com o ator local de cada uma; nenhuma em B1", { timeout: CASE_TIMEOUT_MS }, async () => {
    const c = await ctx.cenario();
    const a1 = await c.org("Pátio A1", c.gA);
    const a2 = await c.org("Pátio A2", c.gA);
    const a3 = await c.org("Pátio A3", c.gA);
    const b1 = await c.org("Pátio B1", c.gB);
    const p = await c.pessoa([
      { tenantId: a1.id, role: "manager" },
      { tenantId: a2.id, role: "finance" },
      { tenantId: a3.id, role: "manager" },
      { tenantId: b1.id, role: "manager" },
    ]);
    await c.marcar(p, c.gA, a1.id);
    await c.semear(a2.id, 70);
    const response = await ctx.call(SUMMARY, { token: await p.token(a1.id) });
    assert.equal(response.status, 200);
    const rows = await ctx.db.auditLog.findMany({
      where: { tenant_id: { in: [a1.id, a2.id, a3.id, b1.id] }, action: "group_panel.viewed" },
      select: { tenant_id: true, actor_user_id: true, metadata: true },
    });
    const byTenant = Object.fromEntries(rows.map((row: any) => [row.tenant_id, row.actor_user_id]));
    assert.equal(rows.length, 3);
    assert.deepEqual(byTenant, { [a1.id]: p.users.get(a1.id), [a2.id]: p.users.get(a2.id), [a3.id]: p.users.get(a3.id) });
    for (const row of rows as any[]) {
      assert.deepEqual(Object.keys(row.metadata).sort(), ["actorType", "complete", "correlationId", "origin", "outcome", "resourceType", "severity"].sort());
      assert.equal(row.metadata.origin, "group_panel");
      assert.equal(row.metadata.complete, true);
      const text = JSON.stringify(row.metadata);
      for (const forbidden of [a1.id, a2.id, a3.id, b1.id, c.gA, "receivable", "amount", "cash", p.email]) assert.ok(!text.includes(forbidden), `metadado sem ${forbidden}`);
    }
  });
}

async function bootstrap(connection: string) {
  // A trilha publica na fila (Redis). Sem `REDIS_URL` explícito o `env.ts` cai no `localhost:6379`, que numa máquina de
  // desenvolvimento é o Redis vivo: o arquivo recusa rodar antes de tocar em qualquer coisa (fail-closed).
  assert.ok(process.env.REDIS_URL?.trim(), "Defina REDIS_URL de um Redis descartável: sem ele o env.ts usa localhost:6379.");
  const [{ PrismaClient }, pg] = await Promise.all([import("@prisma/client"), import("../src/database/pg-connection.js")]);
  const admin0 = new PrismaClient({ adapter: pg.createPgAdapter(connection) });
  const base = decodeURIComponent(new URL(connection).pathname.replace(/^\//, "")) || "postgres";
  const databaseName = `${base}_gp_iso_${randomUUID().replaceAll("-", "").slice(0, 8)}`.slice(0, 63);
  await admin0.$executeRawUnsafe(`CREATE DATABASE "${databaseName}" TEMPLATE template0`);
  const url = new URL(connection);
  url.pathname = `/${databaseName}`;
  const targetUrl = url.toString();
  const childEnv = { ...process.env, DATABASE_URL: targetUrl };
  const prismaCli = createRequire(path.join(ROOT, "package.json")).resolve("prisma/build/index.js");
  execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], { cwd: ROOT, env: childEnv, stdio: "pipe" });
  if (process.platform === "win32") {
    execFileSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", "npm run db:seed"], { cwd: ROOT, env: childEnv, stdio: "pipe" });
  } else {
    execFileSync("npm", ["run", "db:seed"], { cwd: ROOT, env: childEnv, stdio: "pipe" });
  }

  const db = new PrismaClient({ adapter: pg.createPgAdapter(targetUrl) });
  const queryEvents: Array<{ query: string; params: string }> = [];
  const role: EphemeralRole = await createEphemeralRole(db, targetUrl, (roleUrl) => new PrismaClient({
    adapter: pg.createPgAdapter(roleUrl),
    log: [{ emit: "event", level: "query" }],
  }));
  (role.client as any).$on("query", (event: { query: string; params: string }) => queryEvents.push(event));
  const [posture] = (await db.$queryRawUnsafe(`SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`, role.roleName)) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
  assert.deepEqual(posture, { rolsuper: false, rolbypassrls: false }, "o papel do app é NOSUPERUSER NOBYPASSRLS");

  (globalThis as { prisma?: unknown }).prisma = role.client;
  process.env.DATABASE_URL = targetUrl;
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-change-me";
  process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";

  const [envModule, { createApp }, { signAccessToken }, { PrismaCoreSaasService }, { prisma: appPrisma }, gp, prismaMod, groups, managers, rules, catalog] = await Promise.all([
    import("../src/config/env.js"),
    import("../src/app.js"),
    import("../src/modules/auth/index.js"),
    import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
    import("../src/database/prisma.js"),
    import("../src/modules/group-panel/index.js"),
    import("../src/modules/group-panel/group-panel.prisma.js"),
    import("../src/modules/subscription-billing/economic-groups/economic-groups.prisma.js"),
    import("../src/modules/subscription-billing/economic-groups/economic-group-managers.prisma.js"),
    import("../src/modules/subscription-billing/economic-groups/membership.rules.js"),
    import("../src/modules/core-saas/permissions/catalog.js"),
  ]);
  assert.equal(envModule.env.CORE_SAAS_PERSISTENCE, "prisma");
  assert.equal(appPrisma, role.client, "o singleton do app é o cliente do papel efêmero");

  const core = new PrismaCoreSaasService();
  const app = createApp(core);
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const platform = (await db.tenant.create({ data: { name: "Plataforma", slug: "platform" } })).id;
  const globalRoles = new Map((await db.role.findMany({ where: { tenant_id: null }, select: { id: true, key: true } })).map((row: any) => [row.key, row.id]));
  const managerRepository = new managers.PrismaEconomicGroupManagersRepository(role.client);
  const marks = new prismaMod.PrismaGroupManagerMarksReader(role.client);
  const today = rules.todayBusinessDate(new Date());

  // Os papéis que o teste usa, conferidos contra o catálogo (vermelho aqui = premissa errada, não o Painel).
  const perms = catalog.ROLE_PERMISSIONS as Record<string, readonly string[]>;
  assert.ok(perms.manager!.includes("financial_entries:read") && perms.manager!.includes("dashboard:read"), "manager lê Financeiro e Dashboard");
  assert.ok(!perms.field_technician!.includes("financial_entries:read"), "field_technician não lê o Financeiro");

  function roleWith(must: string, mustNot: string): string {
    const key = Object.keys(perms).find((candidate) => globalRoles.has(candidate) && perms[candidate]!.includes(must) && !perms[candidate]!.includes(mustNot));
    assert.ok(key, `há um papel com ${must} e sem ${mustNot}`);
    return key!;
  }

  async function call(route: string, options: { readonly token?: string; readonly headers?: Record<string, string> } = {}): Promise<{ status: number; body: Json }> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    const response = await fetch(baseUrl + route, { headers, signal: AbortSignal.timeout(60_000) });
    const text = await response.text();
    return { status: response.status, body: text ? (JSON.parse(text) as Json) : {} };
  }

  function getComCorpo(route: string, headers: Record<string, string>, body: string): Promise<{ status: number; body: any }> {
    const target = new URL(baseUrl + route);
    return new Promise((resolve, reject) => {
      const req = httpRequest(
        { host: target.hostname, port: target.port, path: target.pathname + target.search, method: "GET", headers: { ...headers, "content-length": Buffer.byteLength(body) } },
        (res) => {
          let text = "";
          res.on("data", (chunk) => (text += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode ?? 0, body: text ? JSON.parse(text) : null });
            } catch (error) {
              reject(error);
            }
          });
        },
      );
      // Sem resposta em 60 s, o pedido falha (nunca trava o arquivo nem pula a limpeza do `after`).
      req.setTimeout(60_000, () => req.destroy(new Error("getComCorpo: sem resposta em 60 s")));
      req.on("error", reject);
      req.end(body);
    });
  }

  async function viewsIn(tenantIds: readonly string[]): Promise<number> {
    return db.auditLog.count({ where: { tenant_id: { in: [...tenantIds] }, action: "group_panel.viewed" } });
  }

  async function cenario() {
    const tag = randomUUID().slice(0, 8);
    const gA = (await db.economicGroup.create({ data: { name: `Grupo A ${tag}` } })).id;
    const gB = (await db.economicGroup.create({ data: { name: `Grupo B ${tag}` } })).id;

    async function org(name: string, groupId: string | null, options: { readonly modules?: readonly string[]; readonly validFrom?: string } = {}) {
      const label = `${name} ${tag}`;
      const tenant = await db.tenant.create({ data: { name: label, slug: `gp-iso-${randomUUID().slice(0, 12)}`, modules: [...(options.modules ?? FINANCE_ON)] } });
      if (groupId) {
        await db.economicGroupMember.create({ data: { tenant_id: tenant.id, group_id: groupId, valid_from: new Date(`${options.validFrom ?? "2020-01-01"}T00:00:00.000Z`) } });
      }
      return { id: tenant.id as string, name: label };
    }

    async function usuarioAvulso(tenantId: string, email: string, roleKey: string): Promise<string> {
      const user = await db.user.create({ data: { tenant_id: tenantId, name: "Avulso", email } });
      await db.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: user.id, role_id: globalRoles.get(roleKey)! } });
      return user.id;
    }

    /** Uma pessoa com conta em várias organizações, juntadas numa identidade só (ou sem vínculo nenhum). */
    async function pessoa(contas: readonly { readonly tenantId: string; readonly role: string }[], options: { readonly link?: boolean } = {}) {
      const email = `pessoa-${randomUUID()}@example.com`;
      const users = new Map<string, string>();
      const roles = new Map<string, string>();
      for (const conta of contas) {
        assert.ok(globalRoles.has(conta.role), `papel global ${conta.role}`);
        users.set(conta.tenantId, await usuarioAvulso(conta.tenantId, email, conta.role));
        roles.set(conta.tenantId, conta.role);
      }
      const identity = randomUUID();
      if (options.link ?? true) {
        await db.authIdentity.create({ data: { id: identity } });
        await db.authIdentityLink.createMany({
          data: contas.map((conta) => ({ identity_id: identity, tenant_id: conta.tenantId, user_id: users.get(conta.tenantId)!, attached_via: "backfill" })),
        });
      }
      return {
        email,
        identity,
        users,
        actor: (tenantId: string) => ({ tenantId, userId: users.get(tenantId)!, email, roles: [roles.get(tenantId)!], authType: "jwt" as const }),
        token: (tenantId: string) => signAccessToken({ user_id: users.get(tenantId)!, tenant_id: tenantId, email, roles: [roles.get(tenantId)!] }),
      };
    }

    /** A marca pelo repositório REAL da FM, sob o papel (a organização de sistema é a dona). */
    async function marcar(p: { readonly users: Map<string, string> }, groupId: string, viaTenantId: string): Promise<string> {
      const manager = await managerRepository.grant({ groupId, organizationId: viaTenantId, userId: p.users.get(viaTenantId)!, actorTenantId: platform, actorUserId: null, today });
      return manager.id;
    }

    async function retirar(groupId: string, managerId: string): Promise<void> {
      assert.equal(await managerRepository.revoke(groupId, managerId, null), true);
    }

    async function fecharVinculo(tenantId: string, validTo: string): Promise<void> {
      const updated = await db.economicGroupMember.updateMany({ where: { tenant_id: tenantId, valid_to: null }, data: { valid_to: new Date(`${validTo}T00:00:00.000Z`) } });
      assert.equal(updated.count, 1);
    }

    /** Dados financeiros reais: uma conta com saldo inicial `valor` e um título a receber de `2 × valor`. */
    async function semear(tenantId: string, valor: number): Promise<void> {
      await db.financialAccount.create({ data: { tenant_id: tenantId, name: `Caixa ${randomUUID().slice(0, 6)}`, opening_balance: valor } });
      await db.financialTitle.create({
        data: { tenant_id: tenantId, direction: "receivable", party_type: "customer", party_name: "Cliente", amount: valor * 2, due_date: new Date("2099-12-10T12:00:00.000Z"), competencia: "2026-01" },
      });
    }

    async function os(tenantId: string, quantas: number): Promise<void> {
      for (let i = 0; i < quantas; i += 1) {
        await db.workOrder.create({ data: { tenant_id: tenantId, code: `GP-${randomUUID().slice(0, 10)}`, title: "OS", customer_name: "Cliente" } });
      }
    }

    async function gestorDeTres() {
      const a1 = await org("Pátio A1", gA);
      const a2 = await org("Pátio A2", gA);
      const b1 = await org("Pátio B1", gB);
      const p = await pessoa([
        { tenantId: a1.id, role: "manager" },
        { tenantId: a2.id, role: "finance" },
        { tenantId: b1.id, role: "manager" },
      ]);
      const mark = await marcar(p, gA, a1.id);
      return { a1, a2, b1, p, mark };
    }

    return { gA, gB, org, usuarioAvulso, pessoa, marcar, retirar, fecharVinculo, semear, os, gestorDeTres };
  }

  return {
    db,
    role,
    queryEvents,
    core,
    platform,
    today,
    marks,
    call,
    getComCorpo,
    viewsIn,
    roleWith,
    cenario,
    mod: { gp, prisma: prismaMod, groups },
    async close() {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await role.drop();
      await db.$disconnect();
      await admin0.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      await admin0.$disconnect();
    },
  };
}
