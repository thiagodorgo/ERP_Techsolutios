/**
 * B-RDV-COMPROVANTE · RR5 — contrato Dart × TS do upload de comprovante, provado contra o lado real.
 *
 * Lê `expense_receipt_sync.dart` da árvore (molde "contratos front na suíte backend") e confere:
 *  (1) os campos multipart que o app manda são exatamente os que a rota lê
 *      (`EXPENSE_RECEIPT_MULTIPART_FIELDS` exportado por `expense-receipt.routes.ts`);
 *  (2) o caminho que o app monta é a rota que o backend monta (template de `api_contracts.dart`
 *      × `EXPENSE_RECEIPT_ROUTE_PATH`).
 *
 * Vermelho-controle: na `origin/main` nem o `.dart` nem a rota existem — o teste falha na leitura.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  EXPENSE_RECEIPT_MULTIPART_FIELDS,
  EXPENSE_RECEIPT_ROUTE_PATH,
} from "../src/modules/expense-management/expense-receipt.routes.js";

const receiptSyncSource = readFileSync(
  new URL("../mobile/flutter_app/lib/core/sync/expense_receipt_sync.dart", import.meta.url),
  "utf8",
);

const apiContractsSource = readFileSync(
  new URL("../mobile/flutter_app/lib/core/network/api_contracts.dart", import.meta.url),
  "utf8",
);

test("RR5 · os campos multipart do Dart são exatamente os que a rota do backend lê, e o caminho casa", () => {
  // (1) Campos do FormData no Dart: literais 'campo': dentro do FormData.fromMap.
  const formBlock = /FormData\.fromMap\(\{([\s\S]*?)\}\)/.exec(receiptSyncSource)?.[1];
  assert.ok(formBlock, "FormData.fromMap não encontrado em expense_receipt_sync.dart");
  const dartFields = new Set([...formBlock.matchAll(/'([^']+)'\s*:/g)].map((match) => match[1]));

  const backendFields = new Set<string>(EXPENSE_RECEIPT_MULTIPART_FIELDS);
  for (const field of backendFields) {
    assert.ok(dartFields.has(field), `o app não manda o campo '${field}' que o backend lê`);
  }
  for (const field of dartFields) {
    assert.ok(backendFields.has(field), `o app manda '${field}', que o backend não lê — contrato divergiu`);
  }

  // (2) Caminho: o template do app resolve no path que o backend monta sob /api/v1.
  const dartTemplate = /receiptUpload\(([^)]*)\)\s*=>\s*'([^']+)'/.exec(apiContractsSource)?.[2];
  assert.ok(dartTemplate, "template receiptUpload não encontrado em api_contracts.dart");
  const resolvedFromDart = dartTemplate
    .replace(/\$\{?reportId\}?/, ":reportId")
    .replace(/\$\{?itemId\}?/, ":itemId");
  assert.equal(resolvedFromDart, `/api/v1${EXPENSE_RECEIPT_ROUTE_PATH}`);
});
