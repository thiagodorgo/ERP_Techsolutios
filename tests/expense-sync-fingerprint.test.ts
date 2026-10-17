import assert from "node:assert/strict";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-O6R-03a — T-C (plano v2 §3 + emenda v3): fingerprint v2, normalização e chave interna K2t, PUROS.
//
//   C1 ordenação recursiva e datas equivalentes        C2 todo campo consumido altera o hash
//   C3 ator e tenant alteram o hash (comando de item idêntico, sem autor no normalizado)
//   C4 tipo e id alteram o hash                        C5 aliases camel/snake e defaults normalizados
//   C6 envelope e campos ignorados não alteram         C7 K2t injetiva, disjunta do legado, ida e volta
//   C8 hash legado nunca promove replay a prova v2     C9 (v3) a fixture do A12′/B7′ é deep-equal pelo normalizador
//
// A FIXTURE DO A12′ MORA AQUI e é importada por `expense-sync-atomic-db.test.ts` (A12′) e por
// `expense-management-routes.test.ts` (B7′): é o C9 que prova a PRÉ-CONDIÇÃO deles — o comando de u2 é
// deep-equal ao de u1 pelo normalizador de produção. Desviar um campo da fixture (ex.: o `spentAt`) deixa o
// C9 vermelho. Quem importa só a fixture define `EXPENSE_SYNC_FIXTURES_ONLY=1` ANTES do import dinâmico, e
// este arquivo não registra os testes naquele processo (`node --test` dá um processo por arquivo).
// -----------------------------------------------------------------------------------------------

export const SYNC_TEST_TENANT_ID = "11111111-1111-4111-8111-111111111111";
export const SYNC_TEST_U1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const SYNC_TEST_U2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/**
 * A12′/B7′ (v3, A-06 da r2): o MESMO item enviado por u1 e reenviado sob u2. Dois objetos literais separados de
 * propósito — a igualdade entre eles é o que o C9 prova, e o `reportId` entra em tempo de execução.
 */
export const A12_ITEM_ACTION_FIXTURE = {
  fromU1: { categoryKey: "fuel", spentAt: "2026-10-11T10:00:00.000Z", amount: 10, currency: "BRL", city: "Campinas", notes: "posto" },
  fromU2: { categoryKey: "fuel", spentAt: "2026-10-11T10:00:00.000Z", amount: 10, currency: "BRL", city: "Campinas", notes: "posto" },
} as const;

const TECH_PERMISSIONS = [
  "expense_report:read_own",
  "expense_report:create",
  "expense_report:update",
  "expense_report:submit",
  "expense_sync:write",
] as const;
const MANAGER_PERMISSIONS = ["expense_report:read", ...TECH_PERMISSIONS] as const;
const REPORT_ID = "4be437fd-369a-4cae-b800-aaf64622448a";
const OTHER_REPORT_ID = "9c0d7a1e-2b3c-4d5e-8f6a-7b8c9d0e1f2a";

type Actor = { tenantId: string; userId: string; roles: never[]; permissions: string[] };

function actor(userId: string, permissions: readonly string[], tenantId = SYNC_TEST_TENANT_ID): Actor {
  return { tenantId, userId, roles: [], permissions: [...permissions] };
}

async function loadSync() {
  return import("../src/modules/expense-management/expense-sync.js");
}

if (process.env.EXPENSE_SYNC_FIXTURES_ONLY !== "1") {
  const baseCreate = {
    employeeUserId: SYNC_TEST_U2,
    periodStart: "2026-06-01",
    periodEnd: "2026-06-30",
    origin: "field",
    workOrderId: "0f8fad5b-d9cb-469f-a165-70867728950e",
    projectId: "proj-1",
    costCenter: "cc-1",
    city: "Sao Paulo",
    advanceAmount: 50.25,
    currency: "BRL",
    policyVersion: "default",
  };
  const baseItem = {
    reportId: REPORT_ID,
    categoryKey: "fuel",
    spentAt: "2026-06-11T10:00:00.000Z",
    city: "Campinas",
    vendorName: "Posto",
    amount: 120.5,
    currency: "BRL",
    km: 42,
    notes: "abastecimento",
    policyFlags: { overLimit: false, tags: ["a", "b"] },
  };

  test("C1 · ordem de chaves (recursiva) e datas equivalentes não mudam o hash; a ordem de array muda", async () => {
    const sync = await loadSync();
    const envelope = { tenantId: SYNC_TEST_TENANT_ID, actorUserId: SYNC_TEST_U1, clientActionId: "c1", type: "expense_item.create" };
    const a = sync.computeSyncFingerprint({ ...envelope, normalized: { b: 1, a: { d: [{ y: 1, x: 2 }], c: new Date("2026-06-11T10:00:00.000Z") } } });
    const b = sync.computeSyncFingerprint({ ...envelope, normalized: { a: { c: "2026-06-11T10:00:00.000Z", d: [{ x: 2, y: 1 }] }, b: 1 } });
    assert.equal(a, b, "chaves reordenadas em qualquer nível e Date × ISO equivalente dão o MESMO hash");

    assert.notEqual(
      sync.computeSyncFingerprint({ ...envelope, normalized: { d: [{ x: 2 }, 3] } }),
      sync.computeSyncFingerprint({ ...envelope, normalized: { d: [3, { x: 2 }] } }),
      "array preserva ordem: [x,3] ≠ [3,x]",
    );

    const tech = actor(SYNC_TEST_U1, TECH_PERMISSIONS);
    const dateOnly = sync.prepareSyncAction(tech, { clientActionId: "c1d", type: "expense_report.create", payload: { ...baseCreate, periodStart: "2026-06-01", periodEnd: "2026-06-30" } });
    const isoDate = sync.prepareSyncAction(tech, { clientActionId: "c1d", type: "expense_report.create", payload: { ...baseCreate, periodStart: "2026-06-01T00:00:00.000Z", periodEnd: "2026-06-30T00:00:00Z" } });
    assert.equal(dateOnly.fingerprint, isoDate.fingerprint, "data só-dia e ISO do mesmo instante normalizam igual");

    const offset = sync.prepareSyncAction(tech, { clientActionId: "c1i", type: "expense_item.create", payload: { ...baseItem, spentAt: "2026-06-11T07:00:00-03:00" } });
    const utc = sync.prepareSyncAction(tech, { clientActionId: "c1i", type: "expense_item.create", payload: { ...baseItem, spentAt: "2026-06-11T10:00:00.000Z" } });
    assert.equal(offset.fingerprint, utc.fingerprint, "mesmo instante com fuso diferente → mesmo hash");
  });

  test("C2 · todo campo consumido pelo efeito altera o hash (create, item e submit) e o normalizado não tem campo a mais nem a menos", async () => {
    const sync = await loadSync();
    const manager = actor(SYNC_TEST_U1, MANAGER_PERMISSIONS);
    const fp = (type: string, payload: Record<string, unknown>) =>
      sync.prepareSyncAction(manager, { clientActionId: "c2", type, payload }).fingerprint;

    const createVariants: Record<string, unknown> = {
      employeeUserId: SYNC_TEST_U1,
      periodStart: "2026-05-31",
      periodEnd: "2026-07-01",
      origin: "office",
      workOrderId: "1f8fad5b-d9cb-469f-a165-70867728950e",
      projectId: "proj-2",
      costCenter: "cc-2",
      city: "Recife",
      advanceAmount: 50.26,
      currency: "USD",
      policyVersion: "v2",
    };
    const createBase = fp("expense_report.create", baseCreate);
    for (const [field, value] of Object.entries(createVariants)) {
      assert.notEqual(fp("expense_report.create", { ...baseCreate, [field]: value }), createBase, `create: mudar ${field} tem de mudar o hash`);
    }
    const createNormalized = sync.normalizeSyncCommand(sync.parseSyncCommand(manager, "expense_report.create", baseCreate));
    assert.deepEqual(Object.keys(createNormalized).sort(), Object.keys(createVariants).sort(), "normalizado do create = exatamente os campos consumidos");

    const itemVariants: Record<string, unknown> = {
      reportId: OTHER_REPORT_ID,
      categoryKey: "meal",
      spentAt: "2026-06-11T10:00:01.000Z",
      city: "Santos",
      vendorName: "Outro",
      amount: 120.51,
      currency: "USD",
      km: 43,
      notes: "outra nota",
      policyFlags: { overLimit: true, tags: ["a", "b"] },
    };
    const itemBase = fp("expense_item.create", baseItem);
    for (const [field, value] of Object.entries(itemVariants)) {
      assert.notEqual(fp("expense_item.create", { ...baseItem, [field]: value }), itemBase, `item: mudar ${field} tem de mudar o hash`);
    }
    const itemNormalized = sync.normalizeSyncCommand(sync.parseSyncCommand(manager, "expense_item.create", baseItem));
    assert.deepEqual(Object.keys(itemNormalized).sort(), Object.keys(itemVariants).sort(), "normalizado do item = exatamente os campos consumidos");

    assert.notEqual(
      fp("expense_report.submit", { reportId: REPORT_ID }),
      fp("expense_report.submit", { reportId: OTHER_REPORT_ID }),
      "submit: mudar reportId tem de mudar o hash",
    );
  });

  test("C3 · ator e tenant alteram o hash, com o comando de item idêntico (o normalizado não tem autor)", async () => {
    const sync = await loadSync();
    const command = sync.parseSyncCommand(actor(SYNC_TEST_U1, TECH_PERMISSIONS), "expense_item.create", baseItem);
    const normalized = sync.normalizeSyncCommand(command);
    assert.equal(JSON.stringify(normalized).includes(SYNC_TEST_U1), false, "o normalizado do item não carrega o ator — o ator só entra pelo envelope");

    const base = { tenantId: SYNC_TEST_TENANT_ID, actorUserId: SYNC_TEST_U1, clientActionId: "X", type: "expense_item.create", normalized };
    const h = sync.computeSyncFingerprint(base);
    assert.notEqual(sync.computeSyncFingerprint({ ...base, actorUserId: SYNC_TEST_U2 }), h, "outro ATOR, mesmo comando → outro hash");
    assert.notEqual(sync.computeSyncFingerprint({ ...base, tenantId: "22222222-2222-4222-8222-222222222222" }), h, "outro TENANT → outro hash");
  });

  test("C4 · tipo e id da ação alteram o hash", async () => {
    const sync = await loadSync();
    const tech = actor(SYNC_TEST_U1, TECH_PERMISSIONS);
    const a = sync.prepareSyncAction(tech, { clientActionId: "id-a", type: "expense_item.create", payload: baseItem });
    const b = sync.prepareSyncAction(tech, { clientActionId: "id-b", type: "expense_item.create", payload: baseItem });
    assert.notEqual(a.fingerprint, b.fingerprint, "outro id externo → outro hash");

    const normalized = sync.normalizeSyncCommand(a.command);
    const envelope = { tenantId: SYNC_TEST_TENANT_ID, actorUserId: SYNC_TEST_U1, clientActionId: "id-a", normalized };
    assert.notEqual(
      sync.computeSyncFingerprint({ ...envelope, type: "expense_item.create" }),
      sync.computeSyncFingerprint({ ...envelope, type: "expense_report.submit" }),
      "outro tipo, mesmo normalizado → outro hash",
    );
  });

  test("C5 · aliases camel/snake e defaults explícitos normalizam para o mesmo hash", async () => {
    const sync = await loadSync();
    const manager = actor(SYNC_TEST_U1, MANAGER_PERMISSIONS);
    const fp = (type: string, payload: Record<string, unknown>) =>
      sync.prepareSyncAction(manager, { clientActionId: "c5", type, payload }).fingerprint;

    const snakeCreate = {
      employee_user_id: baseCreate.employeeUserId,
      period_start: baseCreate.periodStart,
      period_end: baseCreate.periodEnd,
      origin: baseCreate.origin,
      work_order_id: baseCreate.workOrderId,
      project_id: baseCreate.projectId,
      cost_center: baseCreate.costCenter,
      city: baseCreate.city,
      advance_amount: baseCreate.advanceAmount,
      currency: baseCreate.currency,
      policy_version: baseCreate.policyVersion,
    };
    assert.equal(fp("expense_report.create", snakeCreate), fp("expense_report.create", baseCreate), "create snake_case = camelCase");

    const minimal = { periodStart: "2026-06-01", periodEnd: "2026-06-30", origin: "field" };
    assert.equal(
      fp("expense_report.create", minimal),
      fp("expense_report.create", { ...minimal, advanceAmount: 0, currency: "BRL" }),
      "defaults: advanceAmount 0 e currency BRL explícitos = ausentes",
    );

    const snakeItem = {
      report_id: baseItem.reportId,
      category_key: baseItem.categoryKey,
      spent_at: baseItem.spentAt,
      city: baseItem.city,
      vendor_name: baseItem.vendorName,
      amount: baseItem.amount,
      currency: baseItem.currency,
      km: baseItem.km,
      notes: baseItem.notes,
      policy_flags: baseItem.policyFlags,
    };
    assert.equal(fp("expense_item.create", snakeItem), fp("expense_item.create", baseItem), "item snake_case = camelCase");

    const minimalItem = { reportId: REPORT_ID, categoryKey: "fuel", spentAt: "2026-06-11T10:00:00.000Z", amount: 1 };
    assert.equal(
      fp("expense_item.create", minimalItem),
      fp("expense_item.create", { ...minimalItem, currency: "BRL", policyFlags: {} }),
      "defaults do item: currency BRL e policyFlags {} explícitos = ausentes",
    );
    assert.equal(fp("expense_report.submit", { report_id: REPORT_ID }), fp("expense_report.submit", { reportId: REPORT_ID }), "submit snake = camel");
  });

  test("C6 · envelope da ação e campos ignorados pelo efeito não alteram o hash", async () => {
    const sync = await loadSync();
    const tech = actor(SYNC_TEST_U1, TECH_PERMISSIONS);
    const plain = sync.prepareSyncAction(tech, { clientActionId: "c6", type: "expense_report.create", payload: baseCreate });
    const withEnvelope = sync.prepareSyncAction(tech, {
      clientActionId: "c6",
      type: "expense_report.create",
      tenantId: "99999999-9999-4999-8999-999999999999",
      retryCount: 7,
      createdAt: "2030-01-01T00:00:00.000Z",
      status: "failed",
      payload: { ...baseCreate, tenantId: "99999999-9999-4999-8999-999999999999", unknownField: "x", token: "segredo", local_id: "PC-1" },
    });
    assert.equal(withEnvelope.fingerprint, plain.fingerprint, "envelope e campos não consumidos não entram no hash");

    // técnico não escolhe empregado: o employeeUserId do payload é ignorado (resolve para o próprio ator)
    const noEmployee = sync.prepareSyncAction(tech, { clientActionId: "c6", type: "expense_report.create", payload: { ...baseCreate, employeeUserId: undefined } });
    assert.equal(plain.fingerprint, noEmployee.fingerprint, "employeeUserId de outro, para quem não lê todos, é ignorado");
  });

  test("C7 · K2t é injetiva, disjunta de todo id legado válido e faz ida e volta exata", async () => {
    const sync = await loadSync();
    const P = sync.EXPENSE_SYNC_RECEIPT_KEY_PREFIX;
    assert.equal(P.length, 161, "prefixo de 161 caracteres");
    assert.equal(/^[\x20-\x7e]+$/.test(P), true, "prefixo ASCII imprimível");

    const ids = [
      "local:42",
      "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f",
      "z".repeat(160),
      `${SYNC_TEST_U2}:x`,
      "x",
      'aspas "e" \\barra',
      "ação-ü-😀",
      "\uD83D",
      "\uDE00",
      P.slice(0, 160),
      P.slice(0, 120) + JSON.stringify(["x"]),
      P.slice(0, 16) + JSON.stringify(["x"]),
    ];
    const keys = ids.map((id) => sync.buildSyncReceiptKey(id));
    assert.equal(new Set(keys).size, ids.length, "ids distintos → chaves distintas (injetiva)");
    ids.forEach((id, index) => {
      const key = keys[index];
      assert.ok(key.length > sync.LEGACY_CLIENT_ACTION_ID_MAX_LENGTH, `K2t de ${JSON.stringify(id)} tem mais de 160 unidades: nunca é id legado`);
      assert.equal(key.startsWith(P), true);
      assert.equal(sync.decodeSyncReceiptKey(key), id, `ida e volta exata de ${JSON.stringify(id)}`);
      assert.equal(sync.decodeSyncReceiptKey(id), undefined, `o id legado ${JSON.stringify(id)} não decodifica como K2t`);
      assert.equal(keys.includes(id), false, `nenhuma K2t coincide com o id legado ${JSON.stringify(id)}`);
    });

    for (const malformed of [P + "x", P + '["a","b"]', P + "[1]", P + ' ["a"]', P + '["a"] ', P.slice(0, 160) + '["a"]', P + '["\\u0061"]']) {
      assert.equal(sync.decodeSyncReceiptKey(malformed), undefined, `forma não canônica recusada: ${JSON.stringify(malformed.slice(155))}`);
    }
  });

  test("C8 · o hash do evento legado nunca vira prova v2: replay do legado é conflito, sem recibo nem evento novo", async () => {
    const sync = await loadSync();
    const { InMemoryExpenseManagementRepository, ExpenseManagementService, hashExpensePayload } = await import(
      "../src/modules/expense-management/index.js"
    );
    const tech = actor(SYNC_TEST_U1, TECH_PERMISSIONS);
    const action = { clientActionId: "legacy-c8", type: "expense_report.create", payload: baseCreate };
    const prepared = sync.prepareSyncAction(tech, action);
    const legacyHash = hashExpensePayload({ type: action.type, clientActionId: action.clientActionId });
    assert.notEqual(prepared.fingerprint, legacyHash, "o hash legado {type, clientActionId} ≠ fingerprint v2");

    // estado que o binário antigo deixava: relatório + recibo na chave CRUA + evento com o hash legado
    const repository = new InMemoryExpenseManagementRepository();
    await repository.withSyncTransaction(SYNC_TEST_TENANT_ID, async (tx) => {
      const report = await tx.createReport(sync.parseCreateReportCommand(tech, baseCreate));
      const claim = await tx.claimMobileActionReceipt({
        tenantId: SYNC_TEST_TENANT_ID,
        receiptKey: action.clientActionId,
        actorUserId: SYNC_TEST_U1,
        actionType: "expense_report.create",
      });
      await tx.completeMobileActionReceipt(claim, { resultRef: report.id, processedAt: new Date() });
      await tx.createEvent({ tenantId: SYNC_TEST_TENANT_ID, aggregateId: report.id, eventType: sync.EXPENSE_SYNC_EVENT_TYPE, payloadHash: legacyHash, actorUserId: SYNC_TEST_U1 });
    });
    const eventsBefore = repository.listEventsForTests(SYNC_TEST_TENANT_ID).length;

    const service = new ExpenseManagementService(repository);
    for (let attempt = 0; attempt < 3; attempt++) {
      const { results } = await service.syncExpenseActions(tech, { actions: [action] });
      assert.equal(results[0]?.status, "conflict");
      assert.equal(results[0]?.errorCode, "legacy_payload_unverifiable");
    }
    assert.equal(repository.listEventsForTests(SYNC_TEST_TENANT_ID).length, eventsBefore, "nenhum evento novo");
    assert.equal(repository.listReceiptsForTests(SYNC_TEST_TENANT_ID).length, 1, "nenhum recibo novo (nem K2t)");
    assert.equal((await repository.listReports({ tenantId: SYNC_TEST_TENANT_ID, limit: 10, offset: 0 })).total, 1, "um único relatório");
  });

  test("C9 · (v3) a fixture do A12′/B7′ é deep-equal pelo normalizador de produção — sem isso o A12′ não prova o M10", async () => {
    const sync = await loadSync();
    const fromU1 = sync.normalizeSyncCommand(
      sync.parseSyncCommand(actor(SYNC_TEST_U1, TECH_PERMISSIONS), "expense_item.create", { ...A12_ITEM_ACTION_FIXTURE.fromU1, reportId: REPORT_ID }),
    );
    const fromU2 = sync.normalizeSyncCommand(
      sync.parseSyncCommand(actor(SYNC_TEST_U2, MANAGER_PERMISSIONS), "expense_item.create", { ...A12_ITEM_ACTION_FIXTURE.fromU2, reportId: REPORT_ID }),
    );
    assert.deepEqual(
      sync.canonicalizeSyncValue(fromU2),
      sync.canonicalizeSyncValue(fromU1),
      "o comando de u2 tem de ser campo a campo o de u1 (é a mesma ação da fila do aparelho)",
    );
  });
}
