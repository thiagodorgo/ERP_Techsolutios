import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ENABLE_CHECKLIST_TEXT, ERROR_TEXT, GENERIC_ERROR, UNKNOWN_CHECKLIST_ITEM, enableChecklist, errorText } from "../src/modules/platform/billing-operations/billing-ops.errors";

// B-ASS-10c-OPERACAO · R-ERRO — TODO código que as rotas da tela podem devolver tem texto em português na lista fechada.
// O teste lê os arquivos do SERVIDOR (o #608) pelas 4 formas de recusa do plano e compara com a lista; código novo no
// servidor sem texto aqui deixa o teste vermelho (M14 do plano).

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "../..");
const SERVER = "src/modules/subscription-billing";
const SERVER_FILES = [
  "statements/statement.service.ts",
  "charges/charge-request.service.ts",
  "outbox/outbox.prisma.ts",
  "statements/statements.platform.routes.ts",
  "providers/provider-config.service.ts",
  "vault/vault.platform.routes.ts",
  "vault/vault.service.ts",
];
const FORMS = [/StatementError\(\d+, "([a-z_]+)"/g, /\bfail\(\d+, "([a-z_]+)"/g, /failed\.push\("([a-z_]+)"/g, /VaultServiceError\(\d+, "([a-z_]+)"/g];
/** Os resultados do teste de conexão (código de RESPOSTA 200, não de recusa) também aparecem na tela. */
const TEST_OUTCOMES = ["credential_rejected", "provider_unavailable", "rate_limited", "not_configured"];

export function serverCodes(): string[] {
  const codes = new Set<string>(TEST_OUTCOMES);
  for (const file of SERVER_FILES) {
    const source = readFileSync(path.join(REPO, SERVER, file), "utf8");
    for (const form of FORMS) for (const match of source.matchAll(form)) codes.add(match[1]!);
  }
  return [...codes].sort();
}

const missingFrom = (table: Readonly<Record<string, string>>) => serverCodes().filter((code) => !Object.prototype.hasOwnProperty.call(table, code));

test("T-ERR-1 todo código de recusa do servidor tem texto em português (e o leitor enxerga os códigos)", () => {
  const codes = serverCodes();
  assert.ok(codes.length >= 60, `controle de vacuidade: o leitor achou ${codes.length} códigos no servidor`);
  for (const sample of ["amount_exceeds_balance", "payment_provider_disabled", "invoice_cancel_confirmation_required", "enable_preconditions_failed", "channel_disabled_by_env", "confirm_mismatch"]) {
    assert.ok(codes.includes(sample), `o leitor enxerga ${sample}`);
  }
  assert.deepEqual(missingFrom(ERROR_TEXT), []);
});

test("T-ERR-1 vermelho-controle: contra uma lista vazia, o mesmo leitor acusa todos os códigos", () => {
  const all = missingFrom({});
  assert.deepEqual(all, serverCodes());
  assert.ok(all.length >= 60);
});

test("T-ERR-3 o texto nunca é o código: nenhum texto da lista tem sublinhado, e o desconhecido cai no genérico", () => {
  for (const [code, text] of Object.entries(ERROR_TEXT)) {
    assert.doesNotMatch(text, /_/, code);
    assert.notEqual(text, code);
  }
  assert.equal(errorText("codigo_que_nao_existe"), GENERIC_ERROR);
  assert.equal(errorText(null), GENERIC_ERROR);
  assert.equal(errorText("__proto__"), GENERIC_ERROR, "chave de protótipo não vira texto");
  assert.match(errorText("amount_exceeds_balance"), /passa do saldo/);
});

test("T-LIG-3 cada código da recusa de Ligar vira uma linha do checklist; o desconhecido vira a linha genérica", () => {
  const enableCodes = [...readFileSync(path.join(REPO, SERVER, "providers/provider-config.service.ts"), "utf8").matchAll(/failed\.push\("([a-z_]+)"/g)].map((match) => match[1]!);
  assert.ok(enableCodes.length >= 8, `o leitor achou ${enableCodes.length} condições`);
  for (const code of enableCodes) assert.ok(Object.prototype.hasOwnProperty.call(ENABLE_CHECKLIST_TEXT, code), `condição sem linha: ${code}`);
  assert.deepEqual(enableChecklist(["last_test_expired", "condicao_nova"]), [ENABLE_CHECKLIST_TEXT.last_test_expired, UNKNOWN_CHECKLIST_ITEM]);
  assert.match(enableChecklist(["channel_disabled_by_env"])[0]!, /configuração do servidor liga/);
});
