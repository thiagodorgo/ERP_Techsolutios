import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { FINANCIAL_ENTRY_FIELD_CLASS } from "../src/modules/financial-entries/financial-entry-undo-owners.js";
import { CHEQUE_ENTRY_LINK_COLUMNS } from "../src/modules/cheques/cheque.types.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C2 (P5) — CENSO DO SCHEMA: vínculo novo no Prisma não nasce invisível.
//
// O compilador (`financial-entry-undo-owners.ts` e `cheque.types.ts`) fecha o lado do TIPO: campo
// novo sem classificação não compila. Mas uma ponta pode nascer no OUTRO lado — direto no
// `schema.prisma`, como coluna ou como relação — e ficar meses sem chegar ao tipo. Este censo é a
// boca desse lado.
//
// SEM BANCO: lê `prisma/schema.prisma` como TEXTO. Por que texto e não introspecção por relação —
// MEDIDO: as duas pontas do cheque NÃO têm `@relation` no schema (são colunas app-level, linhas
// 2045-46, as únicas `*_entry_id` do schema inteiro). Um censo só-por-relação as perderia
// exatamente onde o defeito mora. O sinal é DUPLO de propósito: cobre os dois jeitos de uma ponta
// nascer.
//
// FAIL-CLOSED NAS DUAS BOCAS: desconhecido -> vermelho; schema não-parseável -> vermelho. Um censo
// que fica verde quando não conseguiu ler nada é pior do que censo nenhum, porque dá confiança.
//
// LIMITE DECLARADO (resíduo, registrado como `P-O6R-B02-CENSO-CONVENCAO`): uma ponta futura que
// nasça SEM `@relation` E com nome fora da convenção `*_entry_id` escapa deste censo. Ela ainda é
// pega pelo tipo TS no momento em que alguém a ler no código — mas não aqui, e isso está dito.
// -----------------------------------------------------------------------------------------------

const SCHEMA_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "prisma", "schema.prisma");

/** O model que o censo protege. */
const TARGET_MODEL = "FinancialEntry";

/**
 * ALLOWLIST ESTRUTURAL FECHADA — os lados INVERSOS das relações que o próprio `FinancialEntry`
 * declara (`tenant`, `account`, `title`). Elas apontam para `FinancialEntry` por construção do
 * Prisma, e não são vínculos de agregado novos. Fechada: qualquer coisa fora daqui é vermelha.
 */
const STRUCTURAL_BACK_RELATIONS = new Set([
  "Tenant.financial_entries",
  "FinancialAccount.financial_entries",
  "FinancialTitle.financial_entries",
]);

type ParsedModel = { readonly name: string; readonly fields: readonly ParsedField[] };
type ParsedField = { readonly name: string; readonly type: string; readonly baseType: string; readonly line: string };

function parseSchema(source: string): ParsedModel[] {
  const models: ParsedModel[] = [];
  const lines = source.split(/\r?\n/);
  let current: { name: string; fields: ParsedField[] } | undefined;

  for (const raw of lines) {
    const line = raw.trim();
    const opening = /^model\s+(\w+)\s*\{$/.exec(line);
    if (opening) {
      current = { name: opening[1]!, fields: [] };
      continue;
    }
    if (current && line === "}") {
      models.push({ name: current.name, fields: current.fields });
      current = undefined;
      continue;
    }
    if (!current) continue;
    if (line === "" || line.startsWith("//") || line.startsWith("@@")) continue;
    const field = /^(\w+)\s+([A-Za-z0-9_]+(?:\[\])?\??)/.exec(line);
    if (!field) continue;
    const type = field[2]!;
    current.fields.push({
      name: field[1]!,
      type,
      baseType: type.replace(/\[\]$/, "").replace(/\?$/, ""),
      line,
    });
  }
  return models;
}

function snakeToCamel(name: string): string {
  return name.replace(/_([a-z0-9])/g, (_all, char: string) => char.toUpperCase());
}

function loadModels(): ParsedModel[] {
  const source = readFileSync(SCHEMA_PATH, "utf8");
  const models = parseSchema(source);

  // ---- fail-closed da BOCA DE LEITURA: schema que não parseia não pode dar verde ----
  assert.ok(models.length >= 50, `censo: o schema parseou só ${models.length} models — leitura não confiável`);
  const byName = new Map(models.map((model) => [model.name, model]));
  const target = byName.get(TARGET_MODEL);
  assert.ok(target, `censo: model ${TARGET_MODEL} não encontrado no schema — leitura não confiável`);
  assert.ok(
    target.fields.length >= 20,
    `censo: model ${TARGET_MODEL} parseou só ${target.fields.length} campos — leitura não confiável`,
  );
  const cheque = byName.get("Cheque");
  assert.ok(cheque, "censo: model Cheque não encontrado no schema — leitura não confiável");
  assert.ok(cheque.fields.length >= 15, `censo: model Cheque parseou só ${cheque.fields.length} campos`);
  return models;
}

// ------------------------------------------------------------------ (a) colunas `*_entry_id`

test("[P5][censo] toda coluna `*_entry_id` FORA de FinancialEntry está registrada na fonte única do vínculo", () => {
  const models = loadModels();
  const registered = new Set(
    Object.values(CHEQUE_ENTRY_LINK_COLUMNS).map((column) => `Cheque.${column}`),
  );

  const found: string[] = [];
  for (const model of models) {
    if (model.name === TARGET_MODEL) continue;
    for (const field of model.fields) {
      if (field.name.endsWith("_entry_id")) found.push(`${model.name}.${field.name}`);
    }
  }

  // As duas pontas do cheque continuam sendo as ÚNICAS colunas `*_entry_id` do schema inteiro — se
  // isso mudar sem passar pela fonte única, o censo nomeia a coluna nova.
  assert.deepEqual(
    [...found].sort(),
    [...registered].sort(),
    "censo: coluna `*_entry_id` desconhecida (ou ponta registrada que sumiu do schema). Toda ponta " +
      "tem de nascer pela fonte única em src/modules/cheques/cheque.types.ts (CHEQUE_ENTRY_LINK_COLUMNS).",
  );
  assert.ok(found.length >= 2, "censo: o próprio conjunto conhecido tem de aparecer — zero achado é leitura cega");
});

// ------------------------------------------------------------------ (a') relações para FinancialEntry

test("[P5][censo] toda relação cujo alvo é FinancialEntry está na allowlist estrutural FECHADA", () => {
  const models = loadModels();
  const found: string[] = [];
  for (const model of models) {
    if (model.name === TARGET_MODEL) continue;
    for (const field of model.fields) {
      if (field.baseType === TARGET_MODEL) found.push(`${model.name}.${field.name}`);
    }
  }

  assert.deepEqual(
    [...found].sort(),
    [...STRUCTURAL_BACK_RELATIONS].sort(),
    "censo: relação para FinancialEntry fora da allowlist estrutural. Uma relação nova é um VÍNCULO " +
      "novo: ou é estrutural (e entra aqui, com justificativa no diff), ou é dono-de-desfazer (e " +
      "precisa de política em financial-entry-undo-owners.ts).",
  );
  assert.ok(found.length >= 3, "censo: as relações estruturais conhecidas têm de aparecer — zero achado é leitura cega");
});

// ------------------------------------------------------------------ (b) colunas do próprio model

test("[P5][censo] toda coluna do model FinancialEntry mapeia para chave CLASSIFICADA em src/", () => {
  const models = loadModels();
  const byName = new Map(models.map((model) => [model.name, model]));
  const modelNames = new Set(models.map((model) => model.name));
  const target = byName.get(TARGET_MODEL)!;

  const classified = new Set(Object.keys(FINANCIAL_ENTRY_FIELD_CLASS));
  const scalarColumns = target.fields.filter((field) => !modelNames.has(field.baseType));
  const naoClassificadas = scalarColumns
    .map((field) => ({ column: field.name, key: snakeToCamel(field.name) }))
    .filter((entry) => !classified.has(entry.key));

  assert.deepEqual(
    naoClassificadas,
    [],
    "censo: coluna de financial_entries sem classificação em FINANCIAL_ENTRY_FIELD_CLASS. Uma coluna " +
      "que existe só no Prisma é um campo que o desfazimento nunca considerou — classifique-a como " +
      "'plain' ou como 'owner:<id>', e a decisão aparece no diff.",
  );
  assert.equal(
    scalarColumns.length,
    classified.size,
    `censo: o schema tem ${scalarColumns.length} colunas escalares e o mapa classifica ${classified.size} campos — ` +
      "os dois lados têm de casar exatamente (chave classificada sem coluna também é divergência).",
  );
});
