import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { TenantRowsLeakError } from "../src/database/rls.js";
import { PrismaImpoundPaymentRepository } from "../src/modules/impound-payments/impound-payment-prisma.repository.js";

// B-PATIO-REC-01 — K2 (emenda 1 §12; achado C2-1 da junta do #488). Ambiente [SB]. O CANÁRIO de organização em TODO método de
// leitura do repositório Prisma, além do filtro `tenant_id`. Contra o Postgres real o filtro já impede que a linha alheia volte
// (T-ISO-db-1 mede o filtro como superusuário); para medir a SEGUNDA camada, cada caso injeta, por um executor falso, a linha de
// outra organização que um filtro faltante devolveria. Sem o canário do método, a linha alheia sai do repositório.

const TENANT_A = randomUUID();
const TENANT_B = randomUUID();

const money = (value: string) => ({ toFixed: () => value });

function intentRowOf(tenantId: string) {
  return {
    id: randomUUID(),
    tenant_id: tenantId,
    process_id: randomUUID(),
    status: "pending",
    cancel_reason: null,
    currency: "BRL",
    amount: money("350.00"),
    paid_amount: money("0.00"),
    applied_amount: money("0.00"),
    held_amount: money("0.00"),
    held_reason: null,
    refunded_amount: money("0.00"),
    methods: ["pix", "credit_card", "debit_card"],
    payer_name: "Maria",
    payer_document: "52998224725",
    provider: "asaas",
    payment_connection_id: randomUUID(),
    payment_group_id: null,
    payment_group_connection_id: null,
    external_charge_id: null,
    pay_url: null,
    pix_copy_paste: null,
    expires_at: new Date(),
    settled_charge_ids: [],
    settled_at: null,
    reversed_at: null,
    created_by: null,
    updated_by: null,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

// Executor falso: devolve a linha da organização B para qualquer consulta, como faria uma consulta sem o filtro de organização.
function leakingExecutor() {
  return {
    $queryRaw: async () => [{ id: randomUUID(), status: "RELEASE_IN_PROGRESS", tenant_id: TENANT_B }],
    impoundPaymentIntent: {
      findFirst: async () => intentRowOf(TENANT_B),
      findMany: async () => [intentRowOf(TENANT_B)],
    },
  } as never;
}

test("K2 · findById: linha de outra organização → TenantRowsLeakError (nunca a intenção alheia)", async () => {
  const repository = new PrismaImpoundPaymentRepository(leakingExecutor());
  await assert.rejects(repository.findById(TENANT_A, randomUUID()), TenantRowsLeakError, "findById devolveu a intenção de B");
});

test("K2 · findLiveByProcess: linha de outra organização → TenantRowsLeakError", async () => {
  const repository = new PrismaImpoundPaymentRepository(leakingExecutor());
  await assert.rejects(repository.findLiveByProcess(TENANT_A, randomUUID()), TenantRowsLeakError, "findLiveByProcess devolveu a intenção de B");
});

test("K2 · processExists: processo de outra organização → TenantRowsLeakError (nunca 'existe')", async () => {
  const repository = new PrismaImpoundPaymentRepository(leakingExecutor());
  await assert.rejects(repository.processExists(TENANT_A, randomUUID()), TenantRowsLeakError, "processExists confirmou o processo de B");
});

test("K2 · lockProcess: processo de outra organização → TenantRowsLeakError (nunca trava nem lê o estado alheio)", async () => {
  const repository = new PrismaImpoundPaymentRepository(leakingExecutor());
  await assert.rejects(repository.lockProcess(TENANT_A, randomUUID()), TenantRowsLeakError, "lockProcess travou o processo de B");
});
