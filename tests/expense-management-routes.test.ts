import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

test("expense routes list policies and categories with RBAC", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const policyResponse = await fetch(`${baseUrl}/api/v1/expense-policies`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin"),
    });
    const policyBody = await readJson(policyResponse);

    assert.equal(policyResponse.status, 200);
    assert.equal(policyBody.pagination?.total, 1);
    assert.equal((policyBody.items as Array<Record<string, unknown>>)[0]?.status, "active");

    const categoryResponse = await fetch(`${baseUrl}/api/v1/expense-categories`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const categoryBody = await readJson(categoryResponse);

    assert.equal(categoryResponse.status, 200);
    assert.ok((categoryBody.items as unknown[]).length > 0);
  });
});

test("expense routes deny missing permission", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const response = await fetch(`${baseUrl}/api/v1/expense-policies`, {
      headers: authHeaders(seed.tenantA, seed.viewerA, "viewer"),
    });

    assert.equal(response.status, 403);
    assert.match(await response.text(), /expense_policy:read|permission_required/);
  });
});

test("expense reports create draft, list by tenant, add item and submit", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const created = await createReport(baseUrl, seed.tenantA, seed.technicianA, "technician");

    assert.equal(created.status, "draft");
    assert.equal(created.totalAmount, 0);

    const itemResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}/items`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify({
        categoryKey: "fuel",
        spentAt: "2026-06-11T10:00:00.000Z",
        amount: 120,
        currency: "BRL",
      }),
    });
    const itemBody = await readJson(itemResponse);

    assert.equal(itemResponse.status, 201);
    assert.equal(itemBody.data?.amount, 120);

    const detailResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const detailBody = await readJson(detailResponse);

    assert.equal(detailResponse.status, 200);
    assert.equal(detailBody.data?.totalAmount, 120);
    assert.equal(detailBody.data?.reimbursementAmount, 70);

    const submitResponse = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}/submit`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const submitBody = await readJson(submitResponse);

    assert.equal(submitResponse.status, 200);
    assert.equal(submitBody.data?.status, "submitted");

    const tenantBList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const tenantBBody = await readJson(tenantBList);

    assert.equal(tenantBList.status, 200);
    assert.equal(tenantBBody.pagination?.total, 0);
  });
});

test("expense read_own does not see another user report", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    await createReport(baseUrl, seed.tenantA, seed.technicianA, "technician");

    const listResponse = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantA, seed.otherTechnicianA, "technician"),
    });
    const listBody = await readJson(listResponse);

    assert.equal(listResponse.status, 200);
    assert.equal(listBody.pagination?.total, 0);
  });
});

test("expense mobile sync is idempotent and ignores cross-scope tenant payload", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const body = {
      actions: [
        {
          clientActionId: "sync-create-pc-1",
          type: "expense_report.create",
          payload: {
            tenantId: seed.tenantB.id,
            employeeUserId: seed.adminB.id,
            periodStart: "2026-06-01",
            periodEnd: "2026-06-30",
            origin: "field",
            advanceAmount: 10,
          },
        },
      ],
    };

    const firstResponse = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify(body),
    });
    const firstBody = await readJson(firstResponse);
    const secondResponse = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
      body: JSON.stringify(body),
    });
    const secondBody = await readJson(secondResponse);

    assert.equal(firstResponse.status, 200);
    assert.equal(secondResponse.status, 200);
    assert.equal(firstBody.data?.results?.[0]?.resultRef, secondBody.data?.results?.[0]?.resultRef);
    assert.equal(secondBody.data?.results?.[0]?.replayed, true);

    const tenantAList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantA, seed.technicianA, "technician"),
    });
    const tenantAListBody = await readJson(tenantAList);
    const tenantBList = await fetch(`${baseUrl}/api/v1/expense-reports`, {
      headers: authHeaders(seed.tenantB, seed.adminB, "tenant_admin"),
    });
    const tenantBListBody = await readJson(tenantBList);

    assert.equal(tenantAListBody.pagination?.total, 1);
    assert.equal(tenantBListBody.pagination?.total, 0);
  });
});

test("expense mobile sync without permission is blocked", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const response = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
      method: "POST",
      headers: jsonHeaders(seed.tenantA, seed.viewerA, "viewer"),
      body: JSON.stringify({ actions: [] }),
    });

    assert.equal(response.status, 403);
  });
});

// -----------------------------------------------------------------------------------------------
// B-O6R-03a — T-B (plano v2 §3 + emenda v3): o contrato HTTP do sync de despesas, em memória.
// Memória não prova transação real (isso é o T-A, contra o Postgres); aqui se prova o CONTRATO por ação, o
// 400 antes de qualquer transação, o rollback honesto da memória e o transporte dos erros.
// D-03a-MESMA-CHAVE-OUTRO-ATOR = A: a mesma ação pertence a quem a enviou primeiro; outro ator → conflito.
// -----------------------------------------------------------------------------------------------

test("B1′ · (v3) sequência real do app: create + item(report_local_id) dá 400 depois do create; o reenvio sob u2 não lança de novo", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const actionId = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";
    const appBatch = {
      actions: [
        {
          clientActionId: actionId,
          type: "expense_report.create",
          payload: { local_id: "PC-local-1", employeeUserId: seed.technicianA.id, periodStart: "2026-10-11T10:00:00.000Z", periodEnd: "2026-10-11T10:00:00.000Z", origin: "mobile", advanceAmount: 100 },
        },
        { clientActionId: "c0ffee00-1111-4222-8333-444455556666", type: "expense_item.create", payload: { report_local_id: "PC-local-1", category_id: "fuel", amount: 10 } },
      ],
    };

    const first = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", appBatch);
    assert.equal(first.status, 400, "o item do app não tem reportId: o lote volta 400…");
    assert.equal(await countTenantReports(baseUrl, seed), 1, "…mas o create da ação 1 já confirmou (uma transação por ação)");

    const resent = await postSync(baseUrl, seed.tenantA, seed.managerA, "manager", appBatch);
    assert.equal(resent.status, 400, "o reenvio do mesmo lote sob u2 continua 400 no item");
    assert.equal(await countTenantReports(baseUrl, seed), 1, "e NÃO lança um segundo relatório");

    const onlyCreate = await postSync(baseUrl, seed.tenantA, seed.managerA, "manager", { actions: [appBatch.actions[0]] });
    assert.equal(onlyCreate.status, 200);
    assert.deepEqual(pick(onlyCreate.body.data?.results?.[0]), {
      clientActionId: actionId,
      status: "conflict",
      errorCode: "action_owned_by_other_actor",
      resultRef: null,
      replayed: true,
    });
    assert.equal(await countTenantReports(baseUrl, seed), 1);

    const ownReplay = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [appBatch.actions[0]] });
    assert.equal(ownReplay.body.data?.results?.[0]?.status, "processed", "o dono continua reconhecido como replay fiel");
    assert.equal(ownReplay.body.data?.results?.[0]?.replayed, true);
  });
});

test("B2 · divergência de valor, período ou tipo na mesma ação → conflict payload_mismatch, resultado original, dinheiro intacto", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const create = (overrides: Record<string, unknown> = {}) => ({
      clientActionId: "b2-create",
      type: "expense_report.create",
      payload: { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", advanceAmount: 100, ...overrides },
    });
    const original = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [create()] });
    const reportId = original.body.data?.results?.[0]?.resultRef;
    assert.equal(typeof reportId, "string");

    for (const divergent of [create({ advanceAmount: 999 }), create({ periodEnd: "2026-07-31" }), { clientActionId: "b2-create", type: "expense_report.submit", payload: { reportId } }]) {
      const response = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [divergent] });
      assert.equal(response.status, 200);
      assert.deepEqual(pick(response.body.data?.results?.[0]), {
        clientActionId: "b2-create",
        status: "conflict",
        errorCode: "payload_mismatch",
        resultRef: reportId,
        replayed: true,
      });
    }

    const report = await getReport(baseUrl, seed.tenantA, seed.technicianA, "technician", String(reportId));
    assert.equal(report.advanceAmount, 100, "o valor divergente NÃO foi aplicado");
    assert.equal(report.periodEnd, "2026-06-30");
    assert.equal(report.status, "draft", "o submit divergente não rodou");
    assert.equal(await countTenantReports(baseUrl, seed), 1);
  });
});

test("B3 · os três tipos funcionam pelo sync (UUID canônico aceito) e o replay de submit já submetido não refaz a transição", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const createAction = { clientActionId: "b3-create", type: "expense_report.create", payload: { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", advanceAmount: 50 } };
    const created = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [createAction] });
    const reportId = String(created.body.data?.results?.[0]?.resultRef);
    assert.match(reportId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/, "o id do relatório é UUID v4 canônico");

    const itemAction = { clientActionId: "b3-item", type: "expense_item.create", payload: { reportId, categoryKey: "fuel", spentAt: "2026-06-11T10:00:00.000Z", amount: 120 } };
    const submitAction = { clientActionId: "b3-submit", type: "expense_report.submit", payload: { reportId } };
    const batch = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [itemAction, submitAction] });
    assert.equal(batch.status, 200, "o item com reportId canônico não é mais 400 invalid_uuid");
    const [item, submit] = batch.body.data?.results ?? [];
    assert.equal(item?.status, "processed");
    assert.equal(submit?.status, "processed");
    assert.equal(submit?.resultRef, reportId);

    const report = await getReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId);
    assert.equal(report.totalAmount, 120, "total recalculado");
    assert.equal(report.status, "submitted");

    const replay = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [createAction, itemAction, submitAction] });
    assert.equal(replay.status, 200, "replay do submit já submetido não vira 409");
    assert.deepEqual(
      (replay.body.data?.results ?? []).map((result) => [result.status, result.replayed, result.errorCode, result.resultRef]),
      [
        ["processed", true, null, reportId],
        ["processed", true, null, item?.resultRef],
        ["processed", true, null, reportId],
      ],
    );
    const after = await getReport(baseUrl, seed.tenantA, seed.technicianA, "technician", reportId);
    assert.equal(after.totalAmount, 120, "nenhum item a mais");
    assert.equal((after.items as unknown[]).length, 1);
  });
});

test("B3b · o 404 work_order_not_found do repositório chega ao HTTP no create e no update REST e no sync, sem gravar nada", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const { getMemoryExpenseManagementRepositoryForTests, workOrderNotFoundError } = await import("../src/modules/expense-management/index.js");
    const repository = getMemoryExpenseManagementRepositoryForTests();
    const workOrderId = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const originalCreate = repository.createReport;
    const originalUpdate = repository.updateReport;
    repository.createReport = async () => {
      throw workOrderNotFoundError();
    };
    repository.updateReport = async () => {
      throw workOrderNotFoundError();
    };
    try {
      const restCreate = await fetch(`${baseUrl}/api/v1/expense-reports`, {
        method: "POST",
        headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
        body: JSON.stringify({ periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", workOrderId }),
      });
      assert.equal(restCreate.status, 404);
      assert.deepEqual(pickError(await restCreate.json()), { code: "EXPENSE_NOT_FOUND", reason: "work_order_not_found" });

      const sync = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", {
        actions: [{ clientActionId: "b3b", type: "expense_report.create", payload: { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", workOrderId } }],
      });
      assert.equal(sync.status, 404);
      assert.deepEqual(pickError(sync.body), { code: "EXPENSE_NOT_FOUND", reason: "work_order_not_found" });
      assert.equal(repository.listReceiptsForTests(seed.tenantA.id).length, 0, "o claim rolou para trás junto");
    } finally {
      repository.createReport = originalCreate;
    }

    const created = await createReport(baseUrl, seed.tenantA, seed.technicianA, "technician");
    try {
      const restUpdate = await fetch(`${baseUrl}/api/v1/expense-reports/${created.id}`, {
        method: "PATCH",
        headers: jsonHeaders(seed.tenantA, seed.technicianA, "technician"),
        body: JSON.stringify({ workOrderId }),
      });
      assert.equal(restUpdate.status, 404);
      assert.deepEqual(pickError(await restUpdate.json()), { code: "EXPENSE_NOT_FOUND", reason: "work_order_not_found" });
    } finally {
      repository.updateReport = originalUpdate;
    }
  });
});

test("B4 · tipo não suportado (expense_receipt.attach) e payload inválido → 400 SEM abrir transação de sync", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const { getMemoryExpenseManagementRepositoryForTests } = await import("../src/modules/expense-management/index.js");
    const repository = getMemoryExpenseManagementRepositoryForTests();
    const original = repository.withSyncTransaction;
    let transactions = 0;
    repository.withSyncTransaction = function (this: typeof repository, ...args: Parameters<typeof original>) {
      transactions += 1;
      return original.apply(this, args);
    } as typeof original;
    try {
      const cases: Array<[unknown, string, string]> = [
        [{ clientActionId: "b4-1", type: "expense_receipt.attach", payload: { itemId: "x" } }, "EXPENSE_SYNC_INVALID", "unsupported_action"],
        [{ clientActionId: "b4-2", type: "expense_report.create", payload: { periodEnd: "2026-06-30", origin: "field" } }, "EXPENSE_INVALID", "required_field"],
        [{ clientActionId: "b4-3", type: "expense_item.create", payload: { report_local_id: "PC-1", amount: 10 } }, "EXPENSE_INVALID", "required_field"],
        [{ clientActionId: "b4-4", type: "expense_item.create", payload: { reportId: "nao-e-uuid", categoryKey: "fuel", spentAt: "2026-06-11", amount: 1 } }, "EXPENSE_INVALID", "invalid_uuid"],
        [{ type: "expense_report.create", payload: {} }, "EXPENSE_INVALID", "required_field"],
        ["nao-e-objeto", "EXPENSE_SYNC_INVALID", "invalid_action"],
      ];
      for (const [action, code, reason] of cases) {
        const response = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", { actions: [action] });
        assert.equal(response.status, 400, JSON.stringify(action));
        assert.deepEqual(pickError(response.body), { code, reason });
      }
      assert.equal(transactions, 0, "erro sintático é recusado ANTES de qualquer withSyncTransaction");
      assert.equal(repository.listReceiptsForTests(seed.tenantA.id).length, 0);
    } finally {
      repository.withSyncTransaction = original;
    }
  });
});

test("B5 · rollback honesto em memória: duas transações sobrepostas, a que falha restaura os cinco mapas e a que confirma sobrevive", async () => {
  const { InMemoryExpenseManagementRepository } = await import("../src/modules/expense-management/index.js");
  const repository = new InMemoryExpenseManagementRepository();
  const tenantId = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const before = repository.countsForTests();
  const report = (tenant: string) => ({
    tenantId: tenant,
    employeeUserId: "u1",
    periodStart: new Date("2026-06-01"),
    periodEnd: new Date("2026-06-30"),
    origin: "field",
    advanceAmount: 0,
    currency: "BRL",
    createdBy: "u1",
  });

  let releaseFailing!: () => void;
  const failingMayFinish = new Promise<void>((resolve) => {
    releaseFailing = resolve;
  });
  let signalWritten!: () => void;
  const failingWrote = new Promise<void>((resolve) => {
    signalWritten = resolve;
  });
  let committingRan = false;

  const failing = repository
    .withSyncTransaction(tenantId, async (tx) => {
      await tx.listPolicies({ tenantId, limit: 10, offset: 0 });
      const created = await tx.createReport(report(tenantId));
      await tx.addItem({ tenantId, reportId: created.id, categoryKey: "fuel", spentAt: new Date(), amount: 10, currency: "BRL" });
      await tx.claimMobileActionReceipt({ tenantId, receiptKey: "b5-key", actorUserId: "u1", actionType: "expense_report.create" });
      await tx.createEvent({ tenantId, aggregateId: created.id, eventType: "x", payloadHash: "h", actorUserId: "u1" });
      signalWritten();
      await failingMayFinish;
      throw new Error("falha injetada B5");
    })
    .then(
      () => "fulfilled",
      (error: Error) => error.message,
    );
  await failingWrote;

  const committing = repository.withSyncTransaction(other, async (tx) => {
    committingRan = true;
    return tx.createReport(report(other));
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(committingRan, false, "a segunda transação ESPERA a primeira (fila por instância)");

  releaseFailing();
  assert.equal(await failing, "falha injetada B5");
  const committed = await committing;

  const after = repository.countsForTests();
  assert.deepEqual(
    { policies: after.policies, items: after.items, receipts: after.receipts, events: after.events },
    { policies: before.policies, items: before.items, receipts: before.receipts, events: before.events },
    "a transação que falhou não deixou NADA nos cinco mapas",
  );
  assert.equal(after.reports, before.reports + 1, "só o relatório da transação confirmada");
  assert.equal((await repository.getReport({ tenantId: other, reportId: committed.id }))?.id, committed.id, "o commit da outra chamada sobreviveu ao restore");
});

test("B6 · recibo legado (chave crua, sem prova de payload) nas 4 formas de id → conflito, 1 efeito, nenhum recibo K2t nem evento novo", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    const { getMemoryExpenseManagementRepositoryForTests, resetExpenseManagementRuntimeForTests, hashExpensePayload, parseCreateReportCommand } = await import(
      "../src/modules/expense-management/index.js"
    );
    const forms: Array<[string, string]> = [
      ["uuid v4 do app", "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f"],
      ["local:42", "local:42"],
      ["160 sem ':'", "z".repeat(160)],
      ["<uuid>:x", `${seed.otherTechnicianA.id}:x`],
    ];
    const payload = { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field", advanceAmount: 10 };
    for (const [label, legacyId] of forms) {
      resetExpenseManagementRuntimeForTests();
      const repository = getMemoryExpenseManagementRepositoryForTests();
      const actorContext = { tenantId: seed.tenantA.id, userId: seed.technicianA.id, roles: [], permissions: [] };
      let legacyReportId = "";
      await repository.withSyncTransaction(seed.tenantA.id, async (tx) => {
        const report = await tx.createReport(parseCreateReportCommand(actorContext, payload));
        legacyReportId = report.id;
        const claim = await tx.claimMobileActionReceipt({ tenantId: seed.tenantA.id, receiptKey: legacyId, actorUserId: seed.technicianA.id, actionType: "expense_report.create" });
        await tx.completeMobileActionReceipt(claim, { resultRef: report.id, processedAt: new Date() });
        await tx.createEvent({
          tenantId: seed.tenantA.id,
          aggregateId: report.id,
          eventType: "expense_report.synced_from_mobile",
          payloadHash: hashExpensePayload({ type: "expense_report.create", clientActionId: legacyId }),
          actorUserId: seed.technicianA.id,
        });
      });
      const countsBefore = repository.countsForTests();

      for (const [variant, expectedCode] of [
        [{ ...payload }, "legacy_payload_unverifiable"],
        [{ ...payload }, "legacy_payload_unverifiable"],
        [{ ...payload, advanceAmount: 999 }, "legacy_payload_unverifiable"],
      ] as const) {
        const response = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", {
          actions: [{ clientActionId: legacyId, type: "expense_report.create", payload: variant }],
        });
        assert.equal(response.status, 200, label);
        assert.deepEqual(pick(response.body.data?.results?.[0]), {
          clientActionId: legacyId,
          status: "conflict",
          errorCode: expectedCode,
          resultRef: legacyReportId,
          replayed: true,
        }, label);
      }
      const typeDivergent = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", {
        actions: [{ clientActionId: legacyId, type: "expense_report.submit", payload: { reportId: legacyReportId } }],
      });
      assert.equal(typeDivergent.body.data?.results?.[0]?.errorCode, "payload_mismatch", label);

      assert.deepEqual(repository.countsForTests(), countsBefore, `${label}: nenhum relatório, recibo (nem K2t) ou evento a mais`);
    }
  });
});

test("B7′ · (v3) o mesmo item da fila, reenviado sob u2 com o comando deep-equal ao de u1 → conflito, sem resultado de u1 e total 10", async () => {
  await withExpenseApi(async ({ baseUrl, seed }) => {
    process.env.EXPENSE_SYNC_FIXTURES_ONLY = "1";
    const { A12_ITEM_ACTION_FIXTURE } = await import("./expense-sync-fingerprint.test.js");
    const created = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", {
      actions: [{ clientActionId: "b7-create", type: "expense_report.create", payload: { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field" } }],
    });
    const reportId = String(created.body.data?.results?.[0]?.resultRef);

    const fromU1 = await postSync(baseUrl, seed.tenantA, seed.technicianA, "technician", {
      actions: [{ clientActionId: "b7-item", type: "expense_item.create", payload: { ...A12_ITEM_ACTION_FIXTURE.fromU1, reportId } }],
    });
    assert.equal(fromU1.body.data?.results?.[0]?.status, "processed");

    const fromU2 = await postSync(baseUrl, seed.tenantA, seed.managerA, "manager", {
      actions: [{ clientActionId: "b7-item", type: "expense_item.create", payload: { ...A12_ITEM_ACTION_FIXTURE.fromU2, reportId } }],
    });
    assert.deepEqual(pick(fromU2.body.data?.results?.[0]), {
      clientActionId: "b7-item",
      status: "conflict",
      errorCode: "action_owned_by_other_actor",
      resultRef: null,
      replayed: true,
    });

    const report = await getReport(baseUrl, seed.tenantA, seed.managerA, "manager", reportId);
    assert.equal(report.totalAmount, 10, "um único item de 10");
    assert.equal((report.items as unknown[]).length, 1);
  });
});

type SyncResponseBody = {
  readonly data?: { readonly results?: Array<Record<string, unknown>> };
  readonly error?: { readonly code?: string; readonly reason?: string };
};

async function postSync(baseUrl: string, tenant: Tenant, user: User, role: string, body: unknown): Promise<{ status: number; body: SyncResponseBody }> {
  const response = await fetch(`${baseUrl}/api/v1/mobile/sync/expense-actions`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify(body),
  });

  return { status: response.status, body: (await response.json()) as SyncResponseBody };
}

async function getReport(baseUrl: string, tenant: Tenant, user: User, role: string, reportId: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports/${reportId}`, { headers: authHeaders(tenant, user, role) });
  assert.equal(response.status, 200);
  return ((await response.json()) as { data: Record<string, unknown> }).data;
}

async function countTenantReports(baseUrl: string, seed: SeedData): Promise<number> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports`, { headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin") });
  const body = (await response.json()) as { pagination?: { total?: number } };
  return Number(body.pagination?.total);
}

function pick(result: Record<string, unknown> | undefined) {
  return {
    clientActionId: result?.clientActionId,
    status: result?.status,
    errorCode: result?.errorCode,
    resultRef: result?.resultRef,
    replayed: result?.replayed,
  };
}

function pickError(body: unknown) {
  const error = (body as SyncResponseBody).error;
  return { code: error?.code, reason: error?.reason };
}

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
  readonly technicianA: User;
  readonly otherTechnicianA: User;
  readonly viewerA: User;
  readonly managerA: User;
};

type ExpenseApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withExpenseApi(callback: (context: ExpenseApiContext) => Promise<void>): Promise<void> {
  process.env.NODE_ENV = "test";
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";

  const [
    { createApp },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
    { resetExpenseManagementRuntimeForTests },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
    import("../src/modules/expense-management/index.js"),
  ]);

  resetExpenseManagementRuntimeForTests();
  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({ baseUrl, seed });
  } finally {
    resetExpenseManagementRuntimeForTests();
    await closeServer(server);
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string; readonly modules?: readonly string[] }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({ name: "Tenant Despesas A", modules: ["dashboard", "expense_management"] });
  const tenantB = service.createTenant({ name: "Tenant Despesas B", modules: ["dashboard", "expense_management"] });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin Despesas A",
    email: "expense-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin Despesas B",
    email: "expense-admin-b@example.com",
    roles: ["tenant_admin"],
  });
  const technicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Despesas A",
    email: "expense-tech-a@example.com",
    roles: ["technician"],
  });
  const otherTechnicianA = service.createUser({
    tenantId: tenantA.id,
    name: "Tecnico Despesas A2",
    email: "expense-tech-a2@example.com",
    roles: ["technician"],
  });
  const viewerA = service.createUser({
    tenantId: tenantA.id,
    name: "Viewer Despesas A",
    email: "expense-viewer-a@example.com",
    roles: ["viewer"],
  });
  // B-O6R-03a: gestor (lê todos e sincroniza) — o "u2" do A-04, que reenvia a ação da fila de u1.
  const managerA = service.createUser({
    tenantId: tenantA.id,
    name: "Gestor Despesas A",
    email: "expense-manager-a@example.com",
    roles: ["manager"],
  });

  return { tenantA, tenantB, adminA, adminB, technicianA, otherTechnicianA, viewerA, managerA };
}

async function createReport(baseUrl: string, tenant: Tenant, user: User, role: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${baseUrl}/api/v1/expense-reports`, {
    method: "POST",
    headers: jsonHeaders(tenant, user, role),
    body: JSON.stringify({
      periodStart: "2026-06-01",
      periodEnd: "2026-06-30",
      origin: "field",
      city: "Sao Paulo",
      advanceAmount: 50,
      policyVersion: "default",
    }),
  });
  const body = await readJson(response);

  assert.equal(response.status, 201);
  return body.data ?? {};
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
  readonly data?: Record<string, unknown> & { readonly results?: Array<Record<string, unknown>> };
  readonly items?: unknown[];
  readonly pagination?: Record<string, unknown>;
}> {
  return (await response.json()) as {
    readonly data?: Record<string, unknown> & { readonly results?: Array<Record<string, unknown>> };
    readonly items?: unknown[];
    readonly pagination?: Record<string, unknown>;
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  const address = await new Promise<AddressInfo>((resolve) => {
    server.on("listening", () => resolve(server.address() as AddressInfo));
  });

  return `http://127.0.0.1:${address.port}`;
}

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}
