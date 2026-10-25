import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

// -----------------------------------------------------------------------------------------------
// B-SAN3-12a — A17-bis do plano v3 (R2-10): todo `reason` que os módulos financeiros LANÇAM está escrito no contrato
// (`API_CONTRACTS.md`). O censo é GERADO das fontes (fábricas `new …Error(<status>, "<CODE>", "<reason>"` e as fábricas
// de parser `invalid("<reason>"` / `unprocessable("<reason>"` / `overflowReason: "<reason>"`), nunca uma lista à mão.
//
// FALSIFICAÇÃO REGISTRADA (relatório do dev, F8): a letra do A17-bis ("está na lista fechada de §4.1") é impossível — a
// lista de 32 é do que a TELA traduz, e o censo da BASE (`8a7885f4`) já tinha 61 `reason`, 37 deles SEM contrato
// escrito. Esses 37 ficam congelados abaixo como dívida PRÉ-EXISTENTE (o teto só encolhe: documentar um tira-o daqui);
// o que o bloco cria, ou qualquer `reason` novo depois dele, TEM de estar no contrato.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MODULES = ["financial-entries", "financial-titles", "financial-accounts", "cheques", "financial-summary"];

/**
 * Medido na base `8a7885f4` (comando no relatório do dev, E5): 37 `reason` lançados sem contrato escrito. Este bloco
 * escreveu 11 deles no contrato (a lista fechada do que a tela traduz, §4.1) — ficam os 26 abaixo.
 */
const PRE_EXISTENTES_SEM_CONTRATO = new Set([
  "account_not_found", "due_date_required", "field_too_long", "financial_write_forbidden", "invalid_boolean",
  "invalid_client_action_id", "invalid_currency", "invalid_direction", "invalid_due_date", "invalid_issue_date",
  "invalid_kind", "invalid_limit", "invalid_occurred_at", "invalid_offset", "invalid_opening_balance",
  "invalid_parent_title_reference", "invalid_party_name", "invalid_party_type", "invalid_source_type",
  "invalid_tenant_reference", "invalid_work_order_reference", "opening_balance_overflow", "party_name_required",
  "required_field", "source_already_launched", "work_order_already_invoiced",
]);

/** O que este bloco cria (plano v3 §4.1, novos 12 + os 4 fora da lista da tela). */
const NOVOS_DO_BLOCO = [
  "title_has_pending_cheque", "cheque_amount_mismatch", "cheque_linked_unlink_first", "cheque_not_linked", "cheque_not_unlinkable",
  "expected_state_required", "invalid_justification", "aggregate_range_too_wide", "reconciliation_stale", "cheque_write_conflict",
  "unreconcile_forbidden", "unlink_requires_privilege", "bounce_reason_required", "invalid_group_by",
];

function listTs(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) return listTs(full);
    return full.endsWith(".ts") ? [full] : [];
  });
}

export function censusOf(sources: string): Set<string> {
  const found = new Set<string>();
  for (const pattern of [
    /Error\(\s*\d{3},\s*"[A-Z_]+",\s*"([a-z_]+)"/g,
    /(?:invalid|unprocessable)\(\s*"([a-z_]+)"/g,
    /overflowReason:\s*"([a-z_]+)"/g,
  ]) {
    for (const match of sources.matchAll(pattern)) found.add(match[1]!);
  }
  return found;
}

const sources = MODULES.flatMap((m) => listTs(path.join(ROOT, "src", "modules", m))).map((f) => readFileSync(f, "utf8")).join("\n");
const census = censusOf(sources);
const contract = readFileSync(path.join(ROOT, "API_CONTRACTS.md"), "utf8");

test("A17-bis: o censo mede de fato (lê os 5 módulos e encontra os reasons novos do bloco)", () => {
  assert.ok(census.size >= 61, `censo vazio demais: ${census.size}`);
  for (const reason of NOVOS_DO_BLOCO) assert.ok(census.has(reason), `o censo não achou ${reason} nas fontes`);
});

test("A17-bis: todo reason lançado pelos módulos financeiros está no contrato, salvo a dívida pré-existente congelada", () => {
  const semContrato = [...census].filter((reason) => !contract.includes(reason) && !PRE_EXISTENTES_SEM_CONTRATO.has(reason)).sort();
  assert.deepEqual(semContrato, [], `reason lançado sem contrato em API_CONTRACTS.md: ${semContrato.join(", ")}`);
});

test("A17-bis: a dívida pré-existente só encolhe (documentado ou extinto sai da lista congelada)", () => {
  const documentados = [...PRE_EXISTENTES_SEM_CONTRATO].filter((reason) => contract.includes(reason));
  assert.deepEqual(documentados, [], `já documentado — remova da lista congelada: ${documentados.join(", ")}`);
  const extintos = [...PRE_EXISTENTES_SEM_CONTRATO].filter((reason) => !census.has(reason));
  assert.deepEqual(extintos, [], `não é mais lançado — remova da lista congelada: ${extintos.join(", ")}`);
});

test("A17-bis: o censo reconhece a forma multi-linha e a de parser (controle do próprio extrator)", () => {
  const sample = 'new FinancialTitleError(\n  422,\n  "FINANCIAL_TITLE_UNPROCESSABLE",\n  "um_reason",\n  "m",\n);\nx.invalid("outro_reason", "m"); { overflowReason: "terceiro" }';
  assert.deepEqual([...censusOf(sample)].sort(), ["outro_reason", "terceiro", "um_reason"]);
});
