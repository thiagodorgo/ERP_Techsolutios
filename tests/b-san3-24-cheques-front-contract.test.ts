import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

// B-SAN3-24 (24a) — contrato da tela de Cheques CONTRA O SERVIDOR REAL (R-E2E-JWT, P-CONTRATO, P-ACESSO, R-CAIXA).
// Sobe `createApp` em memória, cria os usuários no `CoreSaasRegistry`, assina o JWT com `signAccessToken` e chama as
// FUNÇÕES REAIS do front (`frontend/src/modules/finance/cheques/*.ts`) com `{ token }`, sob `VITE_USE_MOCKS=false` e
// `VITE_API_BASE_URL` apontando para o servidor do teste. Os módulos do front exercitados aqui só importam TypeScript
// puro, por isso este arquivo roda no job `backend` sem `frontend/node_modules`.
//   A1  registrar → depositar → compensar (1 lançamento `in`), devolver (1 contra-lançamento), cancelar, excluir, e o
//       mês fechado (422 `period_closed`, o cheque continua depositado);
//   A2  devolver um cheque vinculado e depositado com motivo: `bounced`, e o detalhe traz o motivo;
//   A3  a lista pelo adaptador real traz o `titleId`;
//   A5  toda ação OFERECIDA por `chequeActionsFor` responde 2xx; toda NEGADA responde 403 ou 422 (5 papéis × estados ×
//       vínculo × 6 ações, cada uma sobre um cheque novo preparado por um administrador);
//   A6a o `cashImpactFor` calculado ANTES da ação tem o sentido e o valor do lançamento que a ação gravou.

process.env.LOG_LEVEL = "silent";
process.env.JWT_SECRET = "dev-only-change-me";
process.env.JWT_EXPIRES_IN = "15m";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.VITE_USE_MOCKS = "false";

const { signAccessToken } = await import("../src/modules/auth/index.js");
const { CoreSaasRegistry } = await import("../src/modules/core-saas/services/core-saas.service.js");
const { MemoryCoreSaasAdapter } = await import("../src/modules/core-saas/services/memory-core-saas.adapter.js");
const { InMemoryCoreSaasStore } = await import("../src/modules/core-saas/store/core-saas.store.js");
const { getRolePermissions } = await import("../src/modules/core-saas/permissions/catalog.js");
const { resetChequeRuntimeForTests } = await import("../src/modules/cheques/index.js");
const { resetFinancialEntryRuntimeForTests } = await import("../src/modules/financial-entries/financial-entry.service.js");
const { resetFinancialAccountRuntimeForTests } = await import("../src/modules/financial-accounts/financial-account.service.js");
const { resetFinancialTitleRuntimeForTests, deriveCompetencia } = await import("../src/modules/financial-titles/index.js");
const { resetFinancialPeriodCloseRuntimeForTests } = await import("../src/modules/financial-period-closes/financial-period-close.service.js");

const front = await import("../frontend/src/modules/finance/cheques/cheques.service.ts");
const { chequeActionsFor, canRegisterCheque } = await import("../frontend/src/modules/finance/cheques/cheque-actions.ts");
const { cashImpactFor } = await import("../frontend/src/modules/finance/cheques/cheque-cash-impact.ts");
type Cheque = import("../frontend/src/modules/finance/cheques/cheques.types.ts").Cheque;
type ChequeAction = import("../frontend/src/modules/finance/cheques/cheques.types.ts").ChequeAction;

type Role = "tenant_admin" | "manager" | "finance" | "auditor" | "operator";
const ROLES: readonly Role[] = ["tenant_admin", "manager", "finance", "auditor", "operator"];
const ALL_ACTIONS: readonly ChequeAction[] = ["deposit", "clear", "bounce", "cancel", "edit", "delete"];

type Api = {
  readonly tokens: Readonly<Record<Role, string>>;
  /** Preparo e leitura de conferência como administrador, por cabeçalho (rápido); a ação sob teste vai sempre pelo
   * front com JWT (cada requisição com JWT passa por ~50 verificações do token, uma por roteador montado). */
  http: (method: string, path: string, body?: unknown) => Promise<{ status: number; body: any }>;
};

function resetAll(): void {
  resetFinancialPeriodCloseRuntimeForTests();
  resetChequeRuntimeForTests();
  resetFinancialEntryRuntimeForTests();
  resetFinancialAccountRuntimeForTests();
  resetFinancialTitleRuntimeForTests();
}

async function withApi(work: (api: Api) => Promise<void>): Promise<void> {
  const { createApp } = await import("../src/app.js");
  resetAll();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const tenant = core.createTenant({ name: "B-SAN3-24 cheques", modules: ["dashboard", "finance"] });
  const tokens = {} as Record<Role, string>;
  for (const role of ROLES) {
    const user = core.createUser({ tenantId: tenant.id, name: `Usuário ${role}`, email: `${role}-${randomUUID().slice(0, 8)}@b24.example.com`, roles: [role] });
    tokens[role] = await signAccessToken({ user_id: user.id, tenant_id: tenant.id, email: user.email, roles: [role] });
  }
  const server: Server = createApp(new MemoryCoreSaasAdapter(core)).listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/v1`;
  process.env.VITE_API_BASE_URL = baseUrl;
  const adminId = randomUUID();
  const http = async (method: string, path: string, body?: unknown) => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-tenant-id": tenant.id, "x-user-id": adminId, "x-role": "tenant_admin" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  };
  try {
    await work({ tokens, http });
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    resetAll();
  }
}

const ctx = (token: string) => ({ token });

async function newAccount(api: Api): Promise<string> {
  const created = await api.http("POST", "/financial-accounts", { name: `Conta ${randomUUID().slice(0, 8)}` });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data.id as string;
}

async function newTitle(api: Api, direction: "receivable" | "payable", amount: number): Promise<{ id: string; document: string | null }> {
  const created = await api.http("POST", "/financial-titles", {
    direction,
    party_type: direction === "receivable" ? "customer" : "supplier",
    party_name: "Parte B-SAN3-24",
    amount,
    due_date: "2026-12-01",
    document: `DOC-${randomUUID().slice(0, 6)}`,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return { id: created.body.data.id, document: created.body.data.document ?? null };
}

function registerBody(accountId: string, direction: "received" | "issued", amount: number, titleId?: string) {
  return { account_id: accountId, direction, cheque_number: `B24-${randomUUID().slice(0, 8)}`, bank: "Banco B24", amount, ...(titleId ? { title_id: titleId } : {}) };
}

async function accountEntries(api: Api, accountId: string): Promise<Array<{ id: string; direction: string; amount: number }>> {
  const listed = await api.http("GET", `/financial-entries?account_id=${accountId}&limit=100`);
  assert.equal(listed.status, 200, JSON.stringify(listed.body));
  return listed.body.items as Array<{ id: string; direction: string; amount: number }>;
}

function reasonOf(error: unknown): string | undefined {
  return (error as { reason?: string }).reason;
}

function statusOf(error: unknown): number | undefined {
  return (error as { status?: number }).status;
}

// ------------------------------------------------------------------------------------------------- A1

test("A1 (i)(ii) registrar → depositar → compensar um recebido: 1 lançamento `in`; devolver: 1 contra-lançamento", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const c = ctx(api.tokens.finance);
    const registered = await front.registerCheque(c, registerBody(accountId, "received", 250.4));
    assert.equal(registered.status, "registered");
    assert.equal((await front.depositCheque(c, registered.id)).status, "deposited");
    const cleared = await front.clearCheque(c, registered.id);
    assert.equal(cleared.status, "cleared");
    const afterClear = await accountEntries(api, accountId);
    assert.equal(afterClear.length, 1, "exatamente 1 lançamento");
    assert.equal(afterClear[0].direction, "in");
    assert.equal(afterClear[0].amount, 250.4);
    const bounced = await front.bounceCheque(c, registered.id, "Sem fundos");
    assert.equal(bounced.status, "bounced");
    const afterBounce = await accountEntries(api, accountId);
    assert.equal(afterBounce.length, 2, "1 contra-lançamento");
    assert.deepEqual(afterBounce.map((entry) => entry.direction).sort(), ["in", "out"]);
  });
});

test("A1 (iii)(iv) registrar → cancelar; registrar → excluir", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const c = ctx(api.tokens.finance);
    const toCancel = await front.registerCheque(c, registerBody(accountId, "issued", 80));
    assert.equal((await front.cancelRegisteredCheque(c, toCancel.id)).status, "cancelled");
    const toDelete = await front.registerCheque(c, registerBody(accountId, "received", 90));
    const deleted = await front.deleteCheque(c, toDelete.id);
    assert.equal(deleted.active, false);
    const listed = await front.listCheques(c, {});
    assert.equal(listed.source, "api");
    assert.deepEqual(listed.items.map((cheque) => cheque.id), [toCancel.id], "o excluído some da lista");
    assert.equal(await accountEntries(api, accountId).then((items) => items.length), 0, "nenhum caixa");
  });
});

test("A1 (v) com o mês corrente fechado, compensar dá 422 `period_closed` e o cheque relido continua depositado", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const c = ctx(api.tokens.finance);
    const cheque = await front.registerCheque(c, registerBody(accountId, "received", 120));
    await front.depositCheque(c, cheque.id);
    const period = deriveCompetencia(new Date());
    const closed = await api.http("POST", `/financial-periods/${period}/close`, {});
    assert.equal(closed.status, 200, JSON.stringify(closed.body));
    await assert.rejects(front.clearCheque(c, cheque.id), (error: unknown) => statusOf(error) === 422 && reasonOf(error) === "period_closed");
    assert.equal((await front.getCheque(c, cheque.id)).status, "deposited");
    assert.equal((await accountEntries(api, accountId)).length, 0);
  });
});

// ------------------------------------------------------------------------------------------------- A2 e A3

test("A2 devolver um cheque vinculado e depositado, com motivo, pela função do front: `bounced` e o detalhe traz o motivo", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const title = await newTitle(api, "receivable", 300);
    const c = ctx(api.tokens.finance);
    const cheque = await front.registerCheque(c, registerBody(accountId, "received", 300, title.id));
    await front.depositCheque(c, cheque.id);
    const bounced = await front.bounceCheque(c, cheque.id, "Assinatura divergente");
    assert.equal(bounced.status, "bounced");
    assert.equal((await front.getCheque(c, cheque.id)).bounceReason, "Assinatura divergente");
  });
});

test("A3 a lista pelo adaptador real traz o `titleId` do cheque vinculado (e null no sem título)", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const title = await newTitle(api, "receivable", 410);
    const c = ctx(api.tokens.finance);
    const linked = await front.registerCheque(c, registerBody(accountId, "received", 410, title.id));
    const free = await front.registerCheque(c, registerBody(accountId, "received", 50));
    const listed = await front.listCheques(c, { direction: "received" });
    assert.equal(listed.source, "api");
    assert.equal(listed.items.find((item) => item.id === linked.id)?.titleId, title.id);
    assert.equal(listed.items.find((item) => item.id === free.id)?.titleId, null);
    const byTitle = await front.listCheques(c, { titleId: title.id });
    assert.deepEqual(byTitle.items.map((item) => item.id), [linked.id]);
  });
});

// ------------------------------------------------------------------------------------------------- A5

type State = "registered" | "deposited" | "cleared" | "bounced" | "cancelled";
const STATES: readonly State[] = ["registered", "deposited", "cleared", "bounced", "cancelled"];

/** Um cheque novo no estado pedido, preparado por um administrador (por cabeçalho, rápido); null = inalcançável. */
async function prepare(api: Api, state: State, linked: boolean): Promise<Cheque | null> {
  if (state === "cancelled" && linked) return null; // inalcançável: cancelar exige cheque sem título
  const accountId = await newAccount(api);
  const title = linked ? await newTitle(api, "receivable", 100) : null;
  const step = async (path: string, body?: unknown) => {
    const done = await api.http("POST", path, body);
    assert.ok(done.status < 300, `${path}: ${done.status} ${JSON.stringify(done.body)}`);
  };
  const created = await api.http("POST", "/cheques", registerBody(accountId, "received", 100, title?.id));
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const id = created.body.data.id as string;
  if (state === "cancelled") await step(`/cheques/${id}/cancel`);
  if (state === "deposited" || state === "cleared" || state === "bounced") await step(`/cheques/${id}/deposit`);
  if (state === "cleared") await step(`/cheques/${id}/clear`);
  if (state === "bounced") await step(`/cheques/${id}/bounce`, { reason: "Preparo do A5" });
  return readCheque(api, id, state);
}

async function readCheque(api: Api, id: string, expectedStatus?: State): Promise<Cheque> {
  const got = await api.http("GET", `/cheques/${id}`);
  assert.equal(got.status, 200, JSON.stringify(got.body));
  const { adaptChequeResponse } = await import("../frontend/src/modules/finance/cheques/cheques.adapter.ts");
  const cheque = adaptChequeResponse(got.body);
  if (expectedStatus) assert.equal(cheque.status, expectedStatus);
  return cheque;
}

async function runAction(token: string, cheque: Cheque, action: ChequeAction): Promise<void> {
  const c = ctx(token);
  if (action === "deposit") await front.depositCheque(c, cheque.id);
  if (action === "clear") await front.clearCheque(c, cheque.id);
  if (action === "bounce") await front.bounceCheque(c, cheque.id, "Motivo do teste A5");
  if (action === "cancel") await front.cancelRegisteredCheque(c, cheque.id);
  if (action === "edit") await front.editCheque(c, cheque.id, { notes: "Observação do A5" });
  if (action === "delete") await front.deleteCheque(c, cheque.id);
}

test("A5 oferecida ⇒ 2xx; negada ⇒ 403 ou 422 — 5 papéis × estados × vínculo × 6 ações, sobre o servidor real", async () => {
  await withApi(async (api) => {
    const failures: string[] = [];
    let offered = 0;
    let denied = 0;
    for (const state of STATES) {
      for (const linked of [false, true]) {
        // As NEGADAS não mudam o cheque: rodam em paralelo sobre UM cheque preparado, conferido intacto no fim.
        const shared = await prepare(api, state, linked);
        if (!shared) continue;
        const where = `${state} · ${linked ? "com título" : "sem título"}`;
        const deniedRuns: Promise<void>[] = [];
        for (const role of ROLES) {
          const perms = new Set<string>(getRolePermissions(role));
          for (const action of ALL_ACTIONS) {
            const label = `${role} · ${where} · ${action}`;
            if (chequeActionsFor(shared, perms).includes(action)) {
              // A OFERECIDA muda o cheque: cada uma roda sobre um cheque novo no mesmo estado e vínculo.
              const fresh = await prepare(api, state, linked);
              try {
                await runAction(api.tokens[role], fresh!, action);
                offered++;
              } catch (error) {
                failures.push(`${label}: oferecida, mas o servidor recusou (${statusOf(error)} ${reasonOf(error)})`);
              }
              continue;
            }
            deniedRuns.push(
              runAction(api.tokens[role], shared, action).then(
                () => void failures.push(`${label}: NÃO oferecida, mas o servidor aceitou (2xx)`),
                (error: unknown) => {
                  const status = statusOf(error);
                  if (status === 403 || status === 422) denied++;
                  else failures.push(`${label}: negada com ${status} ${reasonOf(error)} (esperado 403 ou 422)`);
                },
              ),
            );
          }
        }
        await Promise.all(deniedRuns);
        const after = await readCheque(api, shared.id);
        assert.equal(after.status, shared.status, `${where}: as negadas não mudaram o cheque`);
        assert.equal(after.active, true, `${where}: as negadas não excluíram o cheque`);
      }
    }
    assert.deepEqual(failures, []);
    assert.equal(offered, 24, "ações oferecidas exercidas (12 por papel com escrita: administrador e financeiro)");
    assert.equal(offered + denied, 5 * 9 * 6, "todo papel × estado alcançável × ação foi exercido");
  });
});

test("A5 registrar: oferecido só a quem tem `cheques:create`, e o servidor concorda papel a papel", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    for (const role of ROLES) {
      const perms = new Set<string>(getRolePermissions(role));
      const attempt = front.registerCheque(ctx(api.tokens[role]), registerBody(accountId, "received", 10));
      if (canRegisterCheque(perms)) assert.equal((await attempt).status, "registered", role);
      else await assert.rejects(attempt, (error: unknown) => statusOf(error) === 403, role);
    }
  });
});

// ------------------------------------------------------------------------------------------------- A6a

async function entryDirection(api: Api, entryId: string | null): Promise<{ direction: string; amount: number }> {
  assert.ok(entryId, "o cheque traz o id do lançamento");
  const got = await api.http("GET", `/financial-entries/${entryId}`);
  assert.equal(got.status, 200, JSON.stringify(got.body));
  return { direction: got.body.data.direction, amount: got.body.data.amount };
}

for (const direction of ["received", "issued"] as const) {
  for (const linked of [false, true]) {
    test(`A6a R-CAIXA contra o servidor: ${direction}, ${linked ? "com título" : "sem título"} — compensar e devolver depois de compensar`, async () => {
      await withApi(async (api) => {
        const accountId = await newAccount(api);
        const title = linked ? await newTitle(api, direction === "received" ? "receivable" : "payable", 175.25) : null;
        const c = ctx(api.tokens.finance);
        const cheque = await front.registerCheque(c, registerBody(accountId, direction, 175.25, title?.id));
        const deposited = await front.depositCheque(c, cheque.id);

        const clearImpact = cashImpactFor(deposited, "clear");
        const cleared = await front.clearCheque(c, cheque.id);
        const clearEntry = await entryDirection(api, cleared.clearedEntryId);
        assert.equal(clearImpact.movement, clearEntry.direction, "sentido da compensação");
        assert.equal(clearImpact.amount, clearEntry.amount);
        assert.equal(clearImpact.title, linked ? "settles" : null);

        const bounceImpact = cashImpactFor(cleared, "bounce");
        const bounced = await front.bounceCheque(c, cheque.id, "Devolvido pelo banco");
        const bounceEntry = await entryDirection(api, bounced.bounceEntryId);
        assert.equal(bounceImpact.movement, bounceEntry.direction, "sentido do estorno");
        assert.equal(bounceImpact.amount, bounceEntry.amount);
        assert.equal(bounceImpact.title, linked ? "reopens" : null);
        if (title) {
          const reread = await api.http("GET", `/financial-titles/${title.id}`);
          assert.equal(reread.body.data.status, "open", "o título volta a ficar em aberto");
        }
      });
    });
  }
}

test("A6a devolver depositado: `none` e nenhum lançamento novo", async () => {
  await withApi(async (api) => {
    const accountId = await newAccount(api);
    const c = ctx(api.tokens.finance);
    for (const direction of ["received", "issued"] as const) {
      const cheque = await front.registerCheque(c, registerBody(accountId, direction, 60));
      const deposited = await front.depositCheque(c, cheque.id);
      assert.equal(cashImpactFor(deposited, "bounce").movement, "none");
      await front.bounceCheque(c, cheque.id, "");
    }
    assert.equal((await accountEntries(api, accountId)).length, 0);
  });
});
