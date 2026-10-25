import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import {
  createMemoryFinancialAccountService,
  resetFinancialAccountRuntimeForTests,
} from "../src/modules/financial-accounts/financial-account.service.js";
import { createMemoryFinancialEntryService, resetFinancialEntryRuntimeForTests } from "../src/modules/financial-entries/index.js";
import { createMemoryFinancialTitleService, resetFinancialTitleRuntimeForTests } from "../src/modules/financial-titles/index.js";
import {
  buildChequeTitleUnlinkedAudit,
  createMemoryChequeService,
  getMemoryChequeRepositoryForTests,
  parseUnlinkJustification,
  resetChequeRuntimeForTests,
} from "../src/modules/cheques/index.js";
import type { ChequeActorContext } from "../src/modules/cheques/cheque.types.js";
import { buildAuditMetadata } from "../src/modules/core-saas/audit/audit-log.service.js";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — §4.3 do plano v3. TROCAR A VINCULAÇÃO do cheque ao título (dono, 24/10: "trocar a vinculacao do cheque
// por outro meio de pagamento e isso requer privilegios altos"), o fecho do bypass pelo PATCH, e cancelar/excluir
// cheque vinculado como troca (dono, 25/10: "Mesmo privilégio da troca (Recomendado)"). A5, A6, A7, A20 e o
// `bounce_reason_required` do R-res-2.
// -----------------------------------------------------------------------------------------------

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

const FINANCE_PERMISSIONS = [
  "financial_accounts:read", "financial_accounts:create", "financial_titles:read", "financial_titles:create",
  "financial_entries:read", "financial_entries:create", "financial_entries:update",
  "cheques:read", "cheques:create", "cheques:update",
] as const;

function finance(tenantId = randomUUID()): ChequeActorContext {
  return { tenantId, userId: randomUUID(), roles: ["finance"], permissions: [...FINANCE_PERMISSIONS] };
}

function admin(tenantId: string): ChequeActorContext {
  return { tenantId, userId: randomUUID(), roles: ["tenant_admin"], permissions: [...FINANCE_PERMISSIONS, "cheques:unlink_title"] };
}

function resetAll(): void {
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

async function seed() {
  resetAll();
  const ctx = finance();
  const accounts = createMemoryFinancialAccountService();
  const titles = createMemoryFinancialTitleService();
  const entries = createMemoryFinancialEntryService();
  const cheques = createMemoryChequeService();
  const account = await accounts.create(ctx, { name: `Conta ${randomUUID()}` });
  const title = await titles.create(ctx, {
    direction: "receivable", party_type: "customer", party_name: "Cliente 12a", amount: 100,
    issue_date: "2026-10-24", due_date: "2026-11-24", account_id: account.id,
  });
  const other = await titles.create(ctx, {
    direction: "receivable", party_type: "customer", party_name: "Outro 12a", amount: 100,
    issue_date: "2026-10-24", due_date: "2026-11-24",
  });
  return { ctx, admin: admin(ctx.tenantId), titles, entries, cheques, account, title, other };
}

const body = (accountId: string, titleId?: string) => ({
  account_id: accountId, title_id: titleId, direction: "received", cheque_number: `U12A-${randomUUID().slice(0, 10)}`, bank: "Banco 12a", amount: 100,
});

const JUST = "cliente trocou para pix no balcão";

function domain(error: unknown, statusCode: number, reason: string): boolean {
  return typeof error === "object" && error !== null &&
    (error as { statusCode?: unknown }).statusCode === statusCode &&
    (error as { reason?: unknown }).reason === reason;
}

// ------------------------------------------------------------------ A5 (serviço)

test("A5: unlink-title — registered e deposited → titleId nulo; deposited devolve o aviso de que ainda compensa", async () => {
  const s = await seed();
  const registered = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  const r1 = await s.cheques.unlinkTitle(s.admin, registered.id, { justification: JUST });
  assert.equal(r1.cheque.titleId, undefined);
  assert.equal(r1.previousTitleId, s.title.id);
  assert.equal(r1.warning, undefined);

  const deposited = await s.cheques.create(s.ctx, body(s.account.id, s.other.id));
  await s.cheques.deposit(s.ctx, deposited.id);
  const r2 = await s.cheques.unlinkTitle(s.admin, deposited.id, { justification: JUST });
  assert.equal(r2.cheque.titleId, undefined);
  assert.equal(r2.cheque.status, "deposited");
  assert.equal(r2.warning, "cheque_still_depositable");
});

test("A5: justificativa — 9 caracteres → 400 invalid_justification (antes do 404); 10 e 500 passam; 501 recusa; espaços não contam", async () => {
  const s = await seed();
  const cheque = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  await assert.rejects(() => s.cheques.unlinkTitle(s.admin, cheque.id, { justification: "123456789" }), (e) => domain(e, 400, "invalid_justification"));
  await assert.rejects(() => s.cheques.unlinkTitle(s.admin, randomUUID(), { justification: "curta" }), (e) => domain(e, 400, "invalid_justification"));
  await assert.rejects(() => s.cheques.unlinkTitle(s.admin, cheque.id, {}), (e) => domain(e, 400, "invalid_justification"));
  await assert.rejects(() => s.cheques.unlinkTitle(s.admin, cheque.id, { justification: `   ${"a".repeat(9)}   ` }), (e) => domain(e, 400, "invalid_justification"));
  assert.equal(parseUnlinkJustification("a".repeat(10)), "a".repeat(10));
  assert.equal(parseUnlinkJustification("a".repeat(500)).length, 500);
  assert.throws(() => parseUnlinkJustification("a".repeat(501)), (e) => domain(e, 400, "invalid_justification"));
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, s.title.id, "nenhuma recusa desvinculou");
});

test("A5: sem título → 422 cheque_not_linked; cleared/bounced/cancelled → 422 cheque_not_unlinkable; cross-tenant → 404", async () => {
  const s = await seed();
  const loose = await s.cheques.create(s.ctx, body(s.account.id));
  await assert.rejects(() => s.cheques.unlinkTitle(s.admin, loose.id, { justification: JUST }), (e) => domain(e, 422, "cheque_not_linked"));

  const repo = getMemoryChequeRepositoryForTests();
  for (const terminal of ["cleared", "bounced", "cancelled"] as const) {
    const c = await repo.create({
      tenantId: s.ctx.tenantId, accountId: s.account.id, titleId: s.title.id, direction: "received",
      chequeNumber: `T-${terminal}`, bank: "Banco 12a", amount: 100, currency: "BRL",
    });
    if (terminal === "cancelled") {
      await repo.transition({ tenantId: s.ctx.tenantId, chequeId: c.id, fromStatus: "registered", toStatus: "cancelled" });
    } else {
      await repo.transition({ tenantId: s.ctx.tenantId, chequeId: c.id, fromStatus: "registered", toStatus: "deposited" });
      await repo.transition({ tenantId: s.ctx.tenantId, chequeId: c.id, fromStatus: "deposited", toStatus: terminal });
    }
    await assert.rejects(() => s.cheques.unlinkTitle(s.admin, c.id, { justification: JUST }), (e) => domain(e, 422, "cheque_not_unlinkable"), terminal);
    assert.equal((await s.cheques.get(s.ctx, c.id)).titleId, s.title.id, `${terminal}: vínculo preservado`);
  }

  const linked = await s.cheques.create(s.ctx, body(s.account.id, s.other.id));
  await assert.rejects(() => s.cheques.unlinkTitle(admin(randomUUID()), linked.id, { justification: JUST }), (e) => domain(e, 404, "cheque_not_found"));
  assert.equal((await s.cheques.get(s.ctx, linked.id)).titleId, s.other.id);
});

test("A5 (CAS do repositório): o desvínculo casa 0 linhas se o título lido já não é o da linha ou se o status saiu do conjunto pendente", async () => {
  const s = await seed();
  const repo = getMemoryChequeRepositoryForTests();
  const cheque = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  assert.equal(await repo.unlinkTitle({ tenantId: s.ctx.tenantId, chequeId: cheque.id, expectedTitleId: s.other.id }), undefined, "título lido diferente");
  assert.equal(await repo.unlinkTitle({ tenantId: randomUUID(), chequeId: cheque.id, expectedTitleId: s.title.id }), undefined, "outro tenant");
  await repo.transition({ tenantId: s.ctx.tenantId, chequeId: cheque.id, fromStatus: "registered", toStatus: "deposited" });
  await repo.transition({ tenantId: s.ctx.tenantId, chequeId: cheque.id, fromStatus: "deposited", toStatus: "cleared" });
  assert.equal(await repo.unlinkTitle({ tenantId: s.ctx.tenantId, chequeId: cheque.id, expectedTitleId: s.title.id }), undefined, "cleared não desvincula");
  assert.equal((await s.cheques.get(s.ctx, cheque.id)).titleId, s.title.id);
});

// ------------------------------------------------------------------ A6 — o fecho do bypass pelo PATCH

test("A6: PATCH por finance — tirar o título (null) ou trocá-lo → 403 unlink_requires_privilege; primeiro vínculo → 200; mesmo título → 200", async () => {
  const s = await seed();
  const linked = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  await assert.rejects(() => s.cheques.update(s.ctx, linked.id, { title_id: null }), (e) => domain(e, 403, "unlink_requires_privilege"));
  await assert.rejects(() => s.cheques.update(s.ctx, linked.id, { title_id: s.other.id }), (e) => domain(e, 403, "unlink_requires_privilege"));
  assert.equal((await s.cheques.get(s.ctx, linked.id)).titleId, s.title.id, "as recusas não mexeram no vínculo");
  const same = await s.cheques.update(s.ctx, linked.id, { title_id: s.title.id, notes: "mesmo título" });
  assert.equal(same.titleId, s.title.id);
  assert.equal(same.notes, "mesmo título");

  const loose = await s.cheques.create(s.ctx, body(s.account.id));
  const first = await s.cheques.update(s.ctx, loose.id, { title_id: s.other.id });
  assert.equal(first.titleId, s.other.id, "primeiro vínculo segue cheques:update");
  const cleared = await s.cheques.update(s.ctx, (await s.cheques.create(s.ctx, body(s.account.id))).id, { title_id: null });
  assert.equal(cleared.titleId, undefined, "null num cheque SEM título não é desvínculo");
});

test("A6: com cheques:unlink_title o PATCH desvincula e troca (o privilégio vive em um lugar só: a mesma constante da rota)", async () => {
  const s = await seed();
  const linked = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  const swapped = await s.cheques.update(s.admin, linked.id, { title_id: s.other.id });
  assert.equal(swapped.titleId, s.other.id);
  const removed = await s.cheques.update(s.admin, linked.id, { title_id: null });
  assert.equal(removed.titleId, undefined);
});

// ------------------------------------------------------------------ A7 — auditoria Crítica

test("A7: a entrada de auditoria do desvínculo é Crítica, com cheque, título anterior e justificativa — sem tenant nem token", () => {
  const chequeId = randomUUID();
  const titleId = randomUUID();
  const entry = buildChequeTitleUnlinkedAudit(chequeId, titleId, JUST);
  assert.equal(entry.action, "cheque.title_unlinked");
  assert.equal(entry.severity, "critical");
  assert.equal(entry.resourceType, "cheque");
  assert.equal(entry.resourceId, chequeId);
  assert.deepEqual(entry.metadata, { chequeId, previousTitleId: titleId, justification: JUST });
  const sanitized = buildAuditMetadata({ ...entry, tenantId: randomUUID() }, randomUUID(), "success", "critical");
  const serialized = JSON.stringify(sanitized);
  assert.ok(!/tenant_id|tenantId/i.test(serialized), `metadados sem tenant: ${serialized}`);
  assert.ok(serialized.includes(JUST), "a justificativa chega aos metadados");
});

// ------------------------------------------------------------------ A20 — cancelar/excluir vinculado é troca

test("A20: cancel e DELETE de cheque registered VINCULADO → 422 cheque_linked_unlink_first para finance E para tenant_admin", async () => {
  const s = await seed();
  const linked = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  for (const who of [s.ctx, s.admin]) {
    await assert.rejects(() => s.cheques.cancel(who, linked.id), (e) => domain(e, 422, "cheque_linked_unlink_first"));
    await assert.rejects(() => s.cheques.delete(who, linked.id), (e) => domain(e, 422, "cheque_linked_unlink_first"));
  }
  const after = await s.cheques.get(s.ctx, linked.id);
  assert.equal(after.status, "registered");
  assert.equal(after.deletedAt, undefined);
  await assert.rejects(() => s.entries.payTitle(s.ctx, s.title.id, { account_id: s.account.id, amount: 100, payment_method: "pix" }), (e) => domain(e, 422, "title_has_pending_cheque"));
});

test("A20: depois do unlink-title, cancelar e excluir voltam a ser cheques:update; cheque sem título segue como hoje", async () => {
  const s = await seed();
  const a = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  await s.cheques.unlinkTitle(s.admin, a.id, { justification: JUST });
  assert.equal((await s.cheques.cancel(s.ctx, a.id)).status, "cancelled");
  const b = await s.cheques.create(s.ctx, body(s.account.id, s.other.id));
  await s.cheques.unlinkTitle(s.admin, b.id, { justification: JUST });
  assert.ok((await s.cheques.delete(s.ctx, b.id)).deletedAt);
  const loose = await s.cheques.create(s.ctx, body(s.account.id));
  assert.equal((await s.cheques.cancel(s.ctx, loose.id)).status, "cancelled");
});

// ------------------------------------------------------------------ R-res-2 — bounce de cheque vinculado exige motivo

test("R-res-2: bounce deposited→bounced de cheque VINCULADO sem motivo → 400 bounce_reason_required; com motivo → bounced; sem título, motivo segue opcional", async () => {
  const s = await seed();
  const linked = await s.cheques.create(s.ctx, body(s.account.id, s.title.id));
  await s.cheques.deposit(s.ctx, linked.id);
  await assert.rejects(() => s.cheques.bounce(s.ctx, linked.id, {}), (e) => domain(e, 400, "bounce_reason_required"));
  assert.equal((await s.cheques.get(s.ctx, linked.id)).status, "deposited");
  assert.equal((await s.cheques.bounce(s.ctx, linked.id, { reason: "devolvido pelo banco" })).status, "bounced");

  const loose = await s.cheques.create(s.ctx, body(s.account.id));
  await s.cheques.deposit(s.ctx, loose.id);
  assert.equal((await s.cheques.bounce(s.ctx, loose.id, {})).status, "bounced");
});

// ------------------------------------------------------------------ A5/A6/A20 pela ROTA (RBAC do catálogo)

type Api = { readonly baseUrl: string; readonly tenantA: { readonly id: string }; readonly tenantB: { readonly id: string } };

async function withApi(work: (api: Api) => Promise<void>): Promise<void> {
  const [{ createApp }, { CoreSaasRegistry }, { MemoryCoreSaasAdapter }, { InMemoryCoreSaasStore }] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenantA = core.createTenant({ name: "12a HTTP A", modules: ["dashboard", "finance"] });
  const tenantB = core.createTenant({ name: "12a HTTP B", modules: ["dashboard", "finance"] });
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  try {
    await work({ baseUrl, tenantA, tenantB });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
}

async function call(api: Api, tenant: { readonly id: string }, role: string, method: string, path: string, payload?: unknown) {
  const response = await fetch(`${api.baseUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": randomUUID(), "x-role": role },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

test("A5/A6/A20 (HTTP): sem cheques:unlink_title a rota responde 403; tenant_admin desvincula; PATCH null por finance 403; cancel vinculado 422; 404 cross-tenant", async () => {
  await withApi(async (api) => {
    const account = (await call(api, api.tenantA, "finance", "POST", "/financial-accounts", { name: `Conta ${randomUUID()}` })).body.data;
    const title = (await call(api, api.tenantA, "finance", "POST", "/financial-titles", {
      direction: "receivable", party_type: "customer", party_name: "HTTP 12a", amount: 100, due_date: "2026-12-01",
    })).body.data;
    const cheque = (await call(api, api.tenantA, "finance", "POST", "/cheques", body(account.id, title.id))).body.data;
    assert.equal(cheque.titleId, title.id);

    for (const role of ["finance", "manager", "auditor", "field_technician"]) {
      const denied = await call(api, api.tenantA, role, "POST", `/cheques/${cheque.id}/unlink-title`, { justification: JUST });
      assert.equal(denied.status, 403, `${role} não desvincula`);
    }
    const patch = await call(api, api.tenantA, "finance", "PATCH", `/cheques/${cheque.id}`, { title_id: null });
    assert.equal(patch.status, 403);
    assert.equal(patch.body.error.reason, "unlink_requires_privilege");
    const cancel = await call(api, api.tenantA, "tenant_admin", "POST", `/cheques/${cheque.id}/cancel`, {});
    assert.equal(cancel.status, 422);
    assert.equal(cancel.body.error.reason, "cheque_linked_unlink_first");

    const pay = await call(api, api.tenantA, "finance", "POST", `/financial-titles/${title.id}/pay`, { account_id: account.id, amount: 100, payment_method: "pix" });
    assert.equal(pay.status, 422);
    assert.equal(pay.body.error.reason, "title_has_pending_cheque");
    assert.deepEqual(pay.body.error.details.chequeIds, [cheque.id]);
    assert.equal(pay.body.error.details.nextStep, "unlink_cheque");
    assert.equal(pay.body.error.details.requiredPermission, "cheques:unlink_title");
    assert.equal(JSON.stringify(pay.body).includes(api.tenantA.id), false, "o corpo do 422 não leva o tenant");

    const foreign = await call(api, api.tenantB, "tenant_admin", "POST", `/cheques/${cheque.id}/unlink-title`, { justification: JUST });
    assert.equal(foreign.status, 404);

    const short = await call(api, api.tenantA, "tenant_admin", "POST", `/cheques/${cheque.id}/unlink-title`, { justification: "curta" });
    assert.equal(short.status, 400);
    assert.equal(short.body.error.reason, "invalid_justification");

    const ok = await call(api, api.tenantA, "tenant_admin", "POST", `/cheques/${cheque.id}/unlink-title`, { justification: JUST });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.titleId, null);
    assert.equal(ok.body.warning, undefined);
    const again = await call(api, api.tenantA, "tenant_admin", "POST", `/cheques/${cheque.id}/unlink-title`, { justification: JUST });
    assert.equal(again.status, 422);
    assert.equal(again.body.error.reason, "cheque_not_linked");

    const paid = await call(api, api.tenantA, "finance", "POST", `/financial-titles/${title.id}/pay`, { account_id: account.id, amount: 100, payment_method: "pix" });
    assert.equal(paid.status, 201, "A8 pela rota: depois do desvínculo a baixa por outro meio passa");
  });
});

test("A19 (HTTP): o 422 cheque_amount_mismatch leva chequeAmount e openBalance no corpo", async () => {
  await withApi(async (api) => {
    const account = (await call(api, api.tenantA, "finance", "POST", "/financial-accounts", { name: `Conta ${randomUUID()}` })).body.data;
    const title = (await call(api, api.tenantA, "finance", "POST", "/financial-titles", {
      direction: "receivable", party_type: "customer", party_name: "HTTP 12a", amount: 100, due_date: "2026-12-01",
    })).body.data;
    const partial = await call(api, api.tenantA, "finance", "POST", "/cheques", { ...body(account.id, title.id), amount: 40 });
    assert.equal(partial.status, 422);
    assert.equal(partial.body.error.reason, "cheque_amount_mismatch");
    assert.deepEqual(partial.body.error.details, { chequeAmount: 40, openBalance: 100 });
    const loose = (await call(api, api.tenantA, "finance", "POST", "/cheques", { ...body(account.id), amount: 40 })).body.data;
    const patch = await call(api, api.tenantA, "finance", "PATCH", `/cheques/${loose.id}`, { title_id: title.id });
    assert.equal(patch.status, 422);
    assert.deepEqual(patch.body.error.details, { chequeAmount: 40, openBalance: 100 });
  });
});
