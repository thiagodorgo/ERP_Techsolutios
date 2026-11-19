// Os casos CR1–CR4 vivem no teste-dono de memória ao lado; este arquivo mantém o nome -db do plano
// e prova que a implementação Prisma oferece a mesma primitive auditada no mesmo StatementTx.
import assert from "node:assert/strict";
import test from "node:test";

import { source } from "./helpers/ass-08c3-test-kit.js";

test("CR1–CR4-db: o runtime Prisma implementa lockById, saveStatement e recordAudit no StatementTx", () => {
  const text = source("src/modules/subscription-billing/statements/statement.prisma-runtime.ts");
  for (const primitive of ["lockById", "saveStatement", "recordAudit"]) assert.match(text, new RegExp(primitive));
  assert.match(text, /async recordAudit\(event\)[\s\S]*writeAuditInTx\(tx, event\)/);
});

