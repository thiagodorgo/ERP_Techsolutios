// B-ASS-08b · conserto da J-530 (plano `B-ASS-08b-conserto-530-v2.md` §5) — os testes-dono SEM banco:
//   T-INTX-8b (R-INTX-8b): a composição de PRODUÇÃO (`createChannelRuntime`, modo memória) sempre configura a intenção de
//     nota — com o provedor de nota desligado, a baixa deixa 1 linha `invoice_issue` visível como `provider_disabled`;
//   T-INTX-10 (R-INTX-10): nada enfileira nota fora da transação (guard de texto sobre `src/`);
//   T-MARK (R-MARK, CRIT530-05, CRIT530R2-04): cada marcador de mutação existe UMA vez em `src/modules/subscription-billing`,
//     o conjunto achado é o do plano, e nenhum é prefixo de outro.

import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { env } from "../src/config/env.js";
import { createChannelRuntime, resetChannelRuntimeForTests } from "../src/modules/subscription-billing/outbox/channel.runtime.js";
import { createDefaultStatementRuntime, resetStatementRuntimeForTests } from "../src/modules/subscription-billing/statements/statement.factory.js";
import { resetVaultRuntimeForTests } from "../src/modules/subscription-billing/vault/vault.factory.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const BILLING = path.join(SRC, "modules", "subscription-billing");

function filesUnder(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) out.push(...filesUnder(full));
    else if (full.endsWith(".ts")) out.push(full);
  }
  return out;
}
const rel = (file: string) => path.relative(ROOT, file).replaceAll("\\", "/");

test("T-INTX-8b (R-INTX-8b): createChannelRuntime() em memória, com o provedor de nota desligado — a baixa que quita deixa 1 invoice_issue PENDING provider_disabled", async () => {
  const mutableEnv = env as unknown as { CORE_SAAS_PERSISTENCE: string };
  const previous = mutableEnv.CORE_SAAS_PERSISTENCE;
  mutableEnv.CORE_SAAS_PERSISTENCE = "memory";
  resetVaultRuntimeForTests();
  resetStatementRuntimeForTests();
  resetChannelRuntimeForTests();
  try {
    const statements = await createDefaultStatementRuntime();
    const tenantId = "11111111-1111-4111-8111-111111111111";
    const statement = await statements.repository.transaction(tenantId, async (tx) => {
      const { statement: open } = await tx.insertIfAbsentAndLock({ tenantId, period: "2026-10" });
      return tx.saveStatement({ ...open, status: "closed", totalCents: 10000, closedAt: new Date() });
    });
    const deps = await createChannelRuntime();
    assert.deepEqual(Object.keys(deps.invoicePorts ?? {}), [], "premissa: nenhum provedor de nota ligado");
    const settled = await deps.settlement.settle({ tenantId, statementId: statement.id, source: "asaas", externalChargeId: "ch_intx8b", paidCents: 10000, method: null, now: new Date() });
    assert.equal(settled.kind === "settled" ? settled.statement.status : settled.kind, "paid");
    const rows = await deps.outbox.listByStatement(tenantId, statement.id);
    assert.deepEqual(
      rows.map((row) => ({ kind: row.kind, provider: row.provider, status: row.status, skipReason: row.skipReason })),
      [{ kind: "invoice_issue", provider: "focusnfe", status: "PENDING", skipReason: "provider_disabled" }],
    );
  } finally {
    mutableEnv.CORE_SAAS_PERSISTENCE = previous;
    resetVaultRuntimeForTests();
    resetStatementRuntimeForTests();
    resetChannelRuntimeForTests();
  }
});

test("T-INTX-10 (R-INTX-10): nada enfileira nota fora da transação — sem enqueueInvoiceIssue/Cancel em src, e `kind: \"invoice_*\"` só no settlement", () => {
  const bridges: string[] = [];
  const kinds: string[] = [];
  for (const file of filesUnder(SRC)) {
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    lines.forEach((line, index) => {
      if (/enqueueInvoice(Issue|Cancel)/.test(line)) bridges.push(`${rel(file)}:${index + 1}`);
      if (/kind: *"invoice_(issue|cancel)"/.test(line)) kinds.push(rel(file));
    });
  }
  assert.deepEqual(bridges, [], "nenhuma ponte que enfileire nota fora da transação");
  assert.deepEqual([...new Set(kinds)], ["src/modules/subscription-billing/statements/statement-settlement.service.ts"], "a intenção de nota só nasce no settlement, dentro da transação");
});

/** Os marcadores do plano v2 §5 (`[INTX-NN]`, `[WH-*]`) mais os dois dos requisitos da crítica r2: `[INTX-12f]` (CRIT530R2-01,
 * a órfã decidida pela leitura rápida) e `[INTX-11e]` (CRIT530R2-03, a reconsulta antes da revisão por idade). */
const EXPECTED_MARKERS = [
  "[INTX-01]",
  "[INTX-02]",
  "[INTX-03]",
  "[INTX-06a]",
  "[INTX-06b]",
  "[INTX-06c]",
  "[INTX-07]",
  "[INTX-08]",
  "[INTX-08r]",
  "[INTX-09]",
  "[INTX-11b]",
  "[INTX-11d]",
  "[INTX-11e]",
  "[INTX-11r]",
  "[INTX-12a]",
  "[INTX-12b]",
  "[INTX-12f]",
  "[WH-5]",
  "[WH-ERR]",
].sort();

test("T-MARK (R-MARK, CRIT530-05): cada marcador de mutação existe UMA vez em src/modules/subscription-billing, o conjunto é o do plano e nenhum é prefixo de outro", () => {
  const counts = new Map<string, number>();
  for (const file of filesUnder(BILLING)) {
    for (const match of readFileSync(file, "utf8").matchAll(/\/\/ (\[(?:INTX|WH)-[0-9A-Za-z-]+\])/g)) {
      counts.set(match[1]!, (counts.get(match[1]!) ?? 0) + 1);
    }
  }
  assert.deepEqual([...counts.keys()].sort(), EXPECTED_MARKERS, "o conjunto de marcadores achado é o do plano");
  for (const [marker, count] of counts) assert.equal(count, 1, `${marker} aparece ${count} vezes`);
  for (const a of EXPECTED_MARKERS) {
    for (const b of EXPECTED_MARKERS) {
      if (a !== b) assert.ok(!b.startsWith(a), `${a} é prefixo de ${b}`);
    }
  }
});
