// B-ASS-05b · R-05b-1 — a allowlist da trilha de plataforma aceita `codes` e `count`, a metadata da trilha
// `plans.bootstrapped_by_migration`, e nada mais muda nela. Fora da forma, a chave some (sem erro).
import assert from "node:assert/strict";
import test from "node:test";

import {
  BILLING_AUDIT_RULES,
  pickBillingAuditMetadata,
} from "../src/modules/subscription-billing/platform-audit/audit-metadata.js";
import { RecordingPlatformAuditWriter } from "../src/modules/subscription-billing/plans/platform-audit.js";
import { InMemoryPlansRepository } from "../src/modules/subscription-billing/plans/plans.repository.js";
import { PlansService } from "../src/modules/subscription-billing/plans/plans.service.js";

const CODES = ["starter", "professional", "business", "enterprise", "tracking_basic", "tracking_plus"];
const ACTOR = "6f1c2d3e-4a5b-4c6d-8e7f-90a1b2c3d4e5";
const CRED = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

test("T-05b-1 · `codes` válido passa, inclusive a lista vazia e a de 50 itens", () => {
  assert.deepEqual(pickBillingAuditMetadata({ codes: [...CODES].sort() }), { codes: [...CODES].sort() });
  assert.deepEqual(pickBillingAuditMetadata({ codes: [] }), { codes: [] });
  const fifty = Array.from({ length: 50 }, (_, index) => `plan_${index}`);
  assert.deepEqual(pickBillingAuditMetadata({ codes: fifty }), { codes: fifty });
  const input = ["starter"];
  const picked = pickBillingAuditMetadata({ codes: input }) as { codes: string[] };
  assert.notEqual(picked.codes, input, "a saída é uma cópia, não a lista de entrada");
});

test("T-05b-2 · `codes` fora da forma some: código fora de SHORT_CODE, 51 itens, item que não é texto, não-lista", () => {
  const outOfShape: unknown[] = [
    ["starter", "Starter"],
    ["starter", "plano-pago"],
    ["starter", "1plano"],
    ["starter", ""],
    ["starter", "a".repeat(41)],
    ["starter", "starter "],
    Array.from({ length: 51 }, (_, index) => `plan_${index}`),
    ["starter", 7],
    ["starter", null],
    ["starter", { code: "x" }],
    ["starter", ["nested"]],
    "starter",
    { 0: "starter", length: 1 },
    null,
    6,
  ];
  for (const codes of outOfShape) {
    assert.deepEqual(pickBillingAuditMetadata({ codes, count: 1 }), { count: 1 }, `codes = ${JSON.stringify(codes)}`);
  }
});

test("T-05b-3 · `count` aceita inteiro ≥ 0; negativo, fracionário, texto e não-finito somem", () => {
  assert.deepEqual(pickBillingAuditMetadata({ count: 0 }), { count: 0 });
  assert.deepEqual(pickBillingAuditMetadata({ count: 6 }), { count: 6 });
  for (const count of [-1, 1.5, 0.1, "6", Number.NaN, Number.POSITIVE_INFINITY, null, true]) {
    assert.deepEqual(pickBillingAuditMetadata({ codes: ["starter"], count }), { codes: ["starter"] }, `count = ${String(count)}`);
  }
});

test("T-05b-4 · as chaves da allowlist são as 9 antigas mais `codes` e `count`, e as antigas seguem iguais", () => {
  assert.deepEqual(Object.keys(BILLING_AUDIT_RULES).sort(), [
    "actor_user_id",
    "codes",
    "count",
    "credential_ids",
    "environment",
    "fingerprint",
    "kind",
    "provider",
    "rotated_count",
    "unreadable_count",
    "unreadable_ids",
  ]);
  const old = {
    actor_user_id: ACTOR,
    provider: "asaas",
    environment: "sandbox",
    kind: "api_token",
    fingerprint: "0123456789abcdef",
    credential_ids: [CRED],
    unreadable_ids: [],
    rotated_count: 2,
    unreadable_count: 0,
  };
  assert.deepEqual(pickBillingAuditMetadata(old), old);
  assert.deepEqual(pickBillingAuditMetadata({ actor_user_id: null }), { actor_user_id: null });
  assert.deepEqual(
    pickBillingAuditMetadata({ provider: "Asaas Pago!", fingerprint: "XYZ", rotated_count: -1, credential_ids: ["nao-uuid"], token: "t", note: "n" }),
    {},
  );
  // `allowed` explícito continua mandando: quem pede só o provedor não recebe `codes` nem `count`.
  assert.deepEqual(pickBillingAuditMetadata({ provider: "asaas", codes: ["starter"], count: 1 }, ["provider"]), { provider: "asaas" });
});

test("T-05b-5 · a metadata que o PlansService escreve na trilha atravessa a allowlist sem perder nada", async () => {
  const repo = new InMemoryPlansRepository();
  for (const code of CODES) {
    await repo.createPlan({
      code,
      kind: code.startsWith("tracking_") ? "addon_tracking" : "base",
      name: code,
      description: "",
      active: true,
      createdBy: null,
    });
  }
  const audit = new RecordingPlatformAuditWriter();
  await new PlansService(repo, undefined, undefined, audit).listPlans();
  assert.equal(audit.list().length, 1);
  const metadata = audit.list()[0]!.metadata!;
  assert.deepEqual(pickBillingAuditMetadata(metadata), metadata);
  assert.deepEqual(pickBillingAuditMetadata(metadata), { codes: [...CODES].sort(), count: CODES.length });
});
