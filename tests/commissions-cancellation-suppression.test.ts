import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import {
  evaluateWorkOrderCommissionEligibility,
  isUuid,
  isWorkOrderSourceType,
  resolveBasisEventStatusForVerdict,
} from "../src/modules/commissions/work-order-cancellation.gate.js";

// ── Unidade: a REGRA PURA de supressão (WS-SCALE-COMISSAO / P-Ω3F6-COMISSAO) ──────────────────────

test("eligibility rule: non-cancelled or missing OS → eligible", () => {
  assert.equal(evaluateWorkOrderCommissionEligibility(null), "eligible");
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "completed", financialDecision: null }), "eligible");
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "in_progress", financialDecision: "zero" }), "eligible");
});

test("eligibility rule: cancelled with keep → eligible (serviço prestado, remunera)", () => {
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: "keep" }), "eligible");
});

test("eligibility rule: cancelled with keep_unpaid/zero → ineligible (suprime)", () => {
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: "keep_unpaid" }), "ineligible");
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: "zero" }), "ineligible");
});

test("eligibility rule: cancelled with null/undefined decision → pending_review (nunca keep, J-Ω3F-6A)", () => {
  assert.equal(evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: null }), "pending_review");
  assert.equal(
    // decisão ausente (undefined) — legado via PATCH /status bypass — também é ambígua.
    evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: undefined as never }),
    "pending_review",
  );
});

test("eligibility rule: cancelled with UNKNOWN future decision → pending_review (segura por padrão)", () => {
  assert.equal(
    evaluateWorkOrderCommissionEligibility({ status: "cancelled", financialDecision: "some_future_decision" as never }),
    "pending_review",
  );
});

test("status resolver: eligible preserva o status pedido; supressão/hold sobrescrevem", () => {
  assert.equal(resolveBasisEventStatusForVerdict("received", "eligible"), "received");
  assert.equal(resolveBasisEventStatusForVerdict("eligible", "eligible"), "eligible");
  assert.equal(resolveBasisEventStatusForVerdict("received", "ineligible"), "ineligible");
  assert.equal(resolveBasisEventStatusForVerdict("received", "pending_review"), "pending_review");
});

test("sourceType matcher canoniza caixa/espaço; sourceId UUID guard", () => {
  assert.equal(isWorkOrderSourceType("work_order"), true);
  assert.equal(isWorkOrderSourceType("  Work_Order "), true);
  assert.equal(isWorkOrderSourceType("WORK_ORDER"), true);
  assert.equal(isWorkOrderSourceType("purchase_order"), false);
  assert.equal(isWorkOrderSourceType("work-order"), false); // hífen ≠ underscore: fonte diferente, não gateia
  assert.equal(isUuid(randomUUID()), true);
  assert.equal(isUuid("OS-100"), false);
});

// ── Integração HTTP: o basis event de OS cancelada nasce com o status certo (via router/memory) ──

test("basis event de OS cancelada nasce ineligible/pending_review conforme a decisão; keep/ativa seguem elegíveis", async () => {
  await withCommissionApi(async ({ baseUrl, seed, gate }) => {
    const cases = [
      { decision: "zero", status: "cancelled", expect: "ineligible" },
      { decision: "keep_unpaid", status: "cancelled", expect: "ineligible" },
      { decision: null, status: "cancelled", expect: "pending_review" },
      { decision: "keep", status: "cancelled", expect: "received" },
      { decision: null, status: "completed", expect: "received" },
    ] as const;

    let index = 0;
    for (const scenario of cases) {
      const workOrderId = randomUUID();
      gate.setState(seed.tenantA.id, workOrderId, {
        status: scenario.status,
        financialDecision: scenario.decision,
      });

      const response = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
        method: "POST",
        headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
        body: JSON.stringify({
          sourceType: "work_order",
          sourceId: workOrderId,
          sourceEventName: "work_order.completed",
          idempotencyKey: `wo-suppression-${index}`,
          payload: { amount: 100 },
        }),
      });
      const body = await readJson(response);

      assert.equal(response.status, 201, `caso ${index} deveria criar (201)`);
      assert.equal(body.data?.status, scenario.expect, `caso ${index} (${scenario.decision}/${scenario.status})`);
      index += 1;
    }

    // A fila de revisão / suprimidos é observável via filtro de status (sem 422 cego).
    const held = await fetch(`${baseUrl}/api/v1/commissions/basis-events?status=pending_review`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    const heldBody = await readJson(held);
    assert.equal(heldBody.pagination?.total, 1);

    const suppressed = await fetch(`${baseUrl}/api/v1/commissions/basis-events?status=ineligible`, {
      headers: authHeaders(seed.tenantA, seed.financeA, "finance"),
    });
    const suppressedBody = await readJson(suppressed);
    assert.equal(suppressedBody.pagination?.total, 2);
  });
});

test("replay é estável: cancelar a OS DEPOIS do 1º create não flipa o status no replay (idempotência-primeiro)", async () => {
  await withCommissionApi(async ({ baseUrl, seed, gate }) => {
    const workOrderId = randomUUID();
    // OS ativa no 1º POST → nasce elegível.
    gate.setState(seed.tenantA.id, workOrderId, { status: "in_progress", financialDecision: null });

    const first = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: workOrderId,
        sourceEventName: "work_order.completed",
        idempotencyKey: "wo-replay-stable",
        payload: { amount: 100 },
      }),
    });
    const firstBody = await readJson(first);
    assert.equal(first.status, 201);
    assert.equal(firstBody.data?.status, "received");

    // OS cancelada com zero DEPOIS. O replay da MESMA chave deve devolver o registro original, sem re-gatear.
    gate.setState(seed.tenantA.id, workOrderId, { status: "cancelled", financialDecision: "zero" });

    const replay = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: workOrderId,
        sourceEventName: "work_order.completed",
        idempotencyKey: "wo-replay-stable",
        payload: { amount: 100 },
      }),
    });
    const replayBody = await readJson(replay);
    assert.equal(replay.status, 201);
    assert.equal(replayBody.data?.id, firstBody.data?.id, "replay deve devolver o MESMO basis event");
    assert.equal(replayBody.data?.status, "received", "replay não pode flipar received→ineligible");
  });
});

test("isolamento cross-tenant: OS cancelada semeada em OUTRO tenant não suprime o basis event do tenant A", async () => {
  await withCommissionApi(async ({ baseUrl, seed, gate }) => {
    const workOrderId = randomUUID();
    // Estado cancelado (zero) semeado sob um tenant DIFERENTE — o gate é keyed por (tenant, OS), então o
    // resolve do tenant A não enxerga isso (espelha o WHERE {tenant_id, id} + RLS do caminho Prisma).
    gate.setState("00000000-0000-0000-0000-0000000000bb", workOrderId, { status: "cancelled", financialDecision: "zero" });

    const response = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "work_order",
        sourceId: workOrderId,
        sourceEventName: "work_order.completed",
        idempotencyKey: "cross-tenant-not-suppressed",
        payload: { amount: 100 },
      }),
    });
    const body = await readJson(response);
    assert.equal(response.status, 201);
    assert.equal(body.data?.status, "received", "a decisão de cancelamento de OUTRO tenant não pode suprimir a do tenant A");
  });
});

test("sourceType não-OS não é gateado (comissão de outra fonte não é suprimida por engano)", async () => {
  await withCommissionApi(async ({ baseUrl, seed, gate }) => {
    const someId = randomUUID();
    // Mesmo com um estado cancelado semeado nesse id, um sourceType não-OS ignora o gate.
    gate.setState(seed.tenantA.id, someId, { status: "cancelled", financialDecision: "zero" });

    const response = await fetch(`${baseUrl}/api/v1/commissions/basis-events`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.financeA, "finance"),
      body: JSON.stringify({
        sourceType: "manual_adjustment",
        sourceId: someId,
        sourceEventName: "manual.bonus",
        idempotencyKey: "non-wo-source",
        payload: { amount: 100 },
      }),
    });
    const body = await readJson(response);
    assert.equal(response.status, 201);
    assert.equal(body.data?.status, "received");
  });
});

// ── Harness (espelha tests/commissions-routes.test.ts) ────────────────────────────────────────────

type SeedData = {
  readonly tenantA: Tenant;
  readonly financeA: User;
};

type CommissionApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
  readonly gate: {
    setState(tenantId: string, workOrderId: string, state: { status: string; financialDecision: string | null }): void;
  };
};

async function withCommissionApi(callback: (context: CommissionApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetCommissionRuntimeForTests, getMemoryWorkOrderCancellationGateForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/commissions/index.js"),
  ]);

  resetCommissionRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);
  // O gate em memória é semeado APÓS o reset (o reset limpa o gate também).
  const gate = getMemoryWorkOrderCancellationGateForTests();

  try {
    await callback({ baseUrl, seed, gate });
  } finally {
    resetCommissionRuntimeForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Comissao Cancelamento",
    modules: ["dashboard", "commissions"],
  });
  const financeA = service.createUser({
    tenantId: tenantA.id,
    name: "Financeiro Cancelamento",
    email: "commission-cancel-finance@example.com",
    roles: ["finance"],
  });

  return { tenantA, financeA };
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
  };
}

function jsonHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return {
    ...authHeaders(tenant, user, role),
    "content-type": "application/json",
  };
}

async function readJson(response: Response): Promise<{
  readonly data?: Record<string, unknown>;
  readonly items?: unknown[];
  readonly pagination?: Record<string, unknown>;
}> {
  return (await response.json()) as {
    readonly data?: Record<string, unknown>;
    readonly items?: unknown[];
    readonly pagination?: Record<string, unknown>;
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => setImmediate(resolve));
  const address = server.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
