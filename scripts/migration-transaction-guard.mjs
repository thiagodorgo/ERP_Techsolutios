// B-GUARD-MIGRACAO — trava de CI: migração nova com mais de uma sentença leva `BEGIN;`/`COMMIT;` no próprio arquivo.
// Decisão do dono que rege: `D-MIGRACAO-COM-TRANSACAO-EXPLICITA` (2026-10-21, "3=aprovo"). ZERO dependência (§C7 item 1).
// Plano: `docs/revisoes/B-GUARD-MIGRACAO-plano.md` (planejador-mestre). Respostas do dono às Q1–Q5 (24/10): "Aceito as
// recomendações" — sem exceção genérica (só a estrutural `-- NAO-ATOMICA:`), drill nomeado exigido, drill genérico depois.
//
// POR QUE ESTE ARQUIVO EXISTE
// O `prisma migrate deploy` 7.8 executa o `migration.sql` sentença a sentença, em autocommit. Uma falha depois da k-ésima
// sentença deixa 1..k aplicadas (P3018) e o redeploy quebra (42701) — medido pelos drills do B-SAN3-02 (T-D(f)) e do
// B-TRC-02 (T-M(e)). A mesma classe de defeito foi reprovada em dois blocos seguidos (B-SAN3-02 C2-01, B-TRC-02 D1). Este
// guard troca a regra de planejador/DBA por um MECANISMO: roda no `npm test` (via `tests/migration-transaction-guard.test.ts`),
// sem banco, e fica vermelho no PR que traz a migração defeituosa.
//
// AS REGRAS (o que o guard imprime; uma linha por violação):
//   G0  diretório de migração sem `migration.sql`.
//   G1  carimbo < FRONTEIRA e nome fora de ANTERIORES ("migração nova com carimbo antigo"); ou nome de ANTERIORES que
//       sumiu do disco ("histórico reescrito").
//   G2  NOVA, só DDL transacional, mais de uma sentença ⇒ 1ª sentença `BEGIN`, última `COMMIT`, nenhum controle de
//       transação entre elas. Só as formas `BEGIN` e `COMMIT` são aceitas (`START TRANSACTION`, `END`, `BEGIN WORK` → G2).
//   G3  NOVA com DDL não transacional ⇒ fica SOZINHA no arquivo.
//   G4  idem ⇒ sem `BEGIN`/`COMMIT` (o Postgres recusa: "cannot run inside a transaction block").
//   G5  idem ⇒ declara `-- NAO-ATOMICA: <motivo com ≥ 20 caracteres não brancos>`.
//   G6  NOVA sob G2 ⇒ o nome do diretório aparece literalmente em algum `tests/*-migration-drill-db.test.ts`.
//   G7  declaração `NAO-ATOMICA` numa migração SEM DDL não transacional ("declaração usada como opt-out").
// Nova de UMA sentença transacional → isenta de G2 e G6 (a decisão diz "mais de uma sentença"). `BEGIN`/`COMMIT` em volta
// de uma sentença → tolerado, mas, se houver controle de transação, ele tem de estar na forma de envoltório.
// Arquivo sem sentença nenhuma (só comentários) → isento: não há o que aplicar pela metade.
//
// NÃO EXISTE marcador genérico "ignore este arquivo" (Q1 do plano, resposta do dono). A única exceção é ESTRUTURAL: é
// reconhecida pelo CONTEÚDO (sentença de `DDL_NAO_TRANSACIONAL`), e a declaração não desliga regra nenhuma (G7).
//
// LIMITES DECLARADOS (D-007):
//   - G6 prova que um drill CITA o nome da migração; não prova que ele injeta falha por prefixo nem que compara estado.
//     Isso é do revisor (checklist do comando do bloco) e do bloco seguinte, `B-DRILL-GENERICO-POR-PREFIXO`.
//   - O splitter não conhece o corpo SQL-padrão `BEGIN ATOMIC … END` (PG 14+): ele se partiria em pedaços e o `END`
//     solto cai em G2 — vermelho, nunca verde (falha fechada). Nenhuma migração do repositório usa essa forma.
//   - A fronteira e a lista só valem para o histórico do repositório. Fora de `prisma/migrations/` (fixtures), o CLI
//     usa lista vazia, salvo `--anteriores`.
//
// USO: node scripts/migration-transaction-guard.mjs [dirMigracoes] [--tests dirTests] [--anteriores nome1,nome2|-]
//   Sem argumentos: `prisma/migrations/` e `tests/` da raiz do repositório. Saída: uma linha `G<n> <dir>: <detalhe>` por
//   violação e o rodapé `migrações: <t> · anteriores: <a> · novas: <n> · violações: <v>`. Exit 1 se houver violação.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const REPO_MIGRATIONS_DIR = path.join(REPO_ROOT, "prisma", "migrations");
export const REPO_TESTS_DIR = path.join(REPO_ROOT, "tests");

// A primeira migração que já cumpre a regra (B-SAN3-02, #448). Tudo abaixo dela é histórico.
export const FRONTEIRA = "20260878000000";

// As 112 migrações anteriores à fronteira, aplicadas em todos os ambientes, SEM transação explícita. Gerada por
// `ls prisma/migrations | awk '$0 < "20260878000000"'` na `main` 8a7885f4 (2026-10-25).
// ESTA LISTA NÃO CRESCE; SÓ ENCOLHE. Quem sanear uma antiga (P-MIGRACOES-ANTERIORES-SEM-TRANSACAO-EXPLICITA) remove o nome
// daqui, e o guard passa a julgá-la. Acrescentar um nome é abrir a brecha que este arquivo fecha.
export const ANTERIORES = Object.freeze([
  "20260521000000_init_core_saas",
  "20260527000000_add_user_role_assignments",
  "20260528000000_add_local_auth_credentials",
  "20260607000000_add_tenant_checklists",
  "20260608000000_enable_tenant_rls",
  "20260609000000_add_auth_sessions",
  "20260610000000_add_notifications",
  "20260611000000_add_cloud_usage_metering",
  "20260612000000_add_aws_cur_cost_import",
  "20260613000000_add_cloud_cost_allocation",
  "20260614000000_add_cloud_charge_markup_rules",
  "20260615000000_add_field_operator_locations",
  "20260616000000_add_work_orders",
  "20260617000000_add_field_dispatches",
  "20260618000000_add_commission_engine_foundation",
  "20260619000000_add_expense_management_foundation",
  "20260707000000_add_customers",
  "20260708000000_add_vehicles",
  "20260709000000_add_teams",
  "20260710000000_add_service_catalog",
  "20260711000000_add_work_order_registry_fks",
  "20260712000000_add_fuel_logs",
  "20260713000000_add_maintenance_orders",
  "20260714000000_add_fines",
  "20260715000000_add_insurance_policies",
  "20260716000000_add_damages",
  "20260717000000_add_inventory_core",
  "20260718000000_add_cycle_counts",
  "20260719000000_add_work_order_service_geocode",
  "20260722000000_add_tenant_modules",
  "20260723000000_add_price_tables",
  "20260724000000_add_tariffs",
  "20260725000000_add_suppliers",
  "20260726000000_add_operator_profiles",
  "20260727000000_add_tags",
  "20260728000000_add_pois",
  "20260729000000_add_tenant_settings",
  "20260730000000_add_service_quotes",
  "20260731000000_add_work_order_checklist_snapshot",
  "20260801000000_add_work_order_attachments",
  "20260802000000_workorder_origin_destination",
  "20260803000000_add_work_order_financial_items",
  "20260804000000_add_service_quote_items",
  "20260805000000_add_work_order_comments_tag_assignments",
  "20260806000000_add_work_order_cancel_decision_idempotency",
  "20260807000000_add_work_order_mileage",
  "20260808000000_add_audit_logs_entity_index",
  "20260809000000_add_financial_accounts",
  "20260810000000_add_financial_titles",
  "20260811000000_add_invoicing",
  "20260812000000_add_financial_entries",
  "20260813000000_add_reconciliation",
  "20260814000000_add_period_close",
  "20260815000000_add_cheques",
  "20260816000000_add_cancel_decision_check",
  "20260817000000_add_sla_due_at",
  "20260821000000_add_attachments",
  "20260822000000_add_financial_title_source",
  "20260823000000_add_professional_statements",
  "20260824000000_add_scheduled_notifications",
  "20260825000000_add_fuel_log_supplier_station_type",
  "20260826000000_add_maintenance_order_items_next_due",
  "20260827000000_add_fine_responsible_operator_profile",
  "20260828000000_add_stock_custody_ledger",
  "20260829000000_add_damage_responsible_and_fields",
  "20260830000000_add_commission_settlement",
  "20260831000000_add_telemetry_events",
  "20260832000000_add_consumer_stock_item_and_movement_source",
  "20260833000000_add_yard",
  "20260834000000_add_jurisdiction",
  "20260835000000_extend_price_tables_scope_category",
  "20260836000000_add_impound",
  "20260837000000_add_intake_inspection_and_custody_fk",
  "20260838000000_add_charging",
  "20260839000000_add_process_notifications",
  "20260840000000_add_release",
  "20260841000000_add_auction_attempts",
  "20260842000000_add_auction_edicts",
  "20260843000000_add_auction_sale_result",
  "20260844000000_add_auction_default_link",
  "20260845000000_add_settlement",
  "20260846000000_add_settlement_balance_cycle",
  "20260847000000_add_portal_access_log",
  "20260848000000_add_portal_release_request",
  "20260849000000_add_authority_credential",
  "20260850000000_add_authority_removal_request",
  "20260851000000_add_release_authority_decision",
  "20260852000000_add_portal_photo_viewed_action",
  "20260853000000_add_impound_outbox_events",
  "20260854000000_add_vehicle_identity",
  "20260855000000_add_impound_process_checklist_link",
  "20260856000000_add_identity_canonical_biconditional_chk",
  "20260857000000_add_checklist_run_client_key",
  "20260858000000_extend_field_dispatch_event_type_check",
  "20260859000000_extend_checklist_component_type_check",
  "20260860000000_add_checklist_run_reopen_link",
  "20260861000000_grant_checklist_run_reopen_permission",
  "20260862000000_reconcile_role_permission_grants",
  "20260863000000_revoke_checklist_run_create_drift",
  "20260864000000_add_checklist_applicability_rules",
  "20260865000000_add_work_order_checklists",
  "20260866000000_add_checklist_run_role",
  "20260868000000_add_auth_identities",
  "20260869000000_add_financial_invariants",
  "20260870000000_add_reversal_pair_atomicity",
  "20260871000000_grant_work_orders_approve_permission",
  "20260872000000_add_reversal_pair_fk",
  "20260873000000_add_stock_movements_unique_backstops",
  "20260874000000_traccar_ingestion_foundation",
  "20260875000000_validate_location_source_check",
  "20260876000000_work_orders_vehicle_assigned_at",
  "20260877000000_backfill_work_order_assignment_from_active_dispatches",
]);

// DDL que o Postgres NÃO executa dentro de bloco de transação. Casada contra a sentença com comentários e literais
// mascarados, espaços colapsados, em maiúsculas. Acrescentar item = PR de ferramenta com fixture.
export const DDL_NAO_TRANSACIONAL = Object.freeze([
  // "CREATE INDEX CONCURRENTLY cannot run inside a transaction block" — a exceção que a decisão do dono nomeia.
  { id: "CREATE INDEX CONCURRENTLY", re: /^CREATE (UNIQUE )?INDEX CONCURRENTLY\b/ },
  // idem para a remoção.
  { id: "DROP INDEX CONCURRENTLY", re: /^DROP INDEX CONCURRENTLY\b/ },
  // REINDEX … CONCURRENTLY (PG 12+) não roda em transação.
  { id: "REINDEX CONCURRENTLY", re: /^REINDEX\b.*\bCONCURRENTLY\b/ },
  // PG ≥ 12 aceita em transação, mas o valor novo não é usável na mesma transação; tratado como não transacional por
  // segurança (H2 do plano). O schema hoje não tem enum.
  { id: "ALTER TYPE ADD VALUE", re: /^ALTER TYPE\b.*\bADD VALUE\b/ },
  // VACUUM não roda em transação.
  { id: "VACUUM", re: /^VACUUM\b/ },
  // ALTER SYSTEM não roda em transação.
  { id: "ALTER SYSTEM", re: /^ALTER SYSTEM\b/ },
  // CREATE/DROP DATABASE não rodam em transação.
  { id: "CREATE/DROP DATABASE", re: /^(CREATE|DROP) DATABASE\b/ },
  // CREATE/DROP TABLESPACE não rodam em transação.
  { id: "CREATE/DROP TABLESPACE", re: /^(CREATE|DROP) TABLESPACE\b/ },
  // ALTER TABLE … DETACH PARTITION … CONCURRENTLY (PG 14+) não roda em transação.
  { id: "DETACH PARTITION CONCURRENTLY", re: /^ALTER TABLE\b.*\bDETACH PARTITION\b.*\bCONCURRENTLY\b/ },
  // CREATE SUBSCRIPTION (com criação de slot) e DROP SUBSCRIPTION (com slot) não rodam em transação.
  { id: "CREATE/DROP SUBSCRIPTION", re: /^(CREATE|DROP) SUBSCRIPTION\b/ },
]);

// Controle de transação de topo. Só `BEGIN` e `COMMIT`, exatos, são a forma aceita (no envoltório).
const CONTROLE_DE_TRANSACAO = /^(BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|ABORT|START TRANSACTION|PREPARE TRANSACTION)\b/;

// Declaração da não-atomicidade. A forma válida é exatamente `-- NAO-ATOMICA: <motivo>`. Uma variação do marcador no
// início do comentário (acento, minúscula, `_` ou espaço, sem dois-pontos) conta como TENTATIVA de declaração para o G7,
// mas não satisfaz o G5.
const DECLARACAO_VALIDA = /^\s*--\s*NAO-ATOMICA:(.*)$/;
const DECLARACAO_TENTATIVA = /^\s*--\s*N[AÃ]O[-_ ]AT[OÔ]MICA/i;
export const MOTIVO_MINIMO = 20;

/**
 * Divide um script SQL em sentenças de topo. Remove comentários `--` e `/* … *\/` (aninháveis, como no Postgres), pula
 * literais `'…'` (com `''`), `E'…'` (com `\'`), identificadores `"…"` e corpos `$tag$ … $tag$`, e divide por `;` de topo.
 * Normaliza `\r\n` → `\n`. Devolve, por sentença, `text` (o trecho original sem comentários, aparado) e `code` (a mesma
 * sentença com o conteúdo dos literais mascarado, espaços colapsados, em maiúsculas — é contra ela que as regras casam).
 * @param {string} sql
 * @returns {{ text: string, code: string }[]}
 */
export function splitStatements(sql) {
  const src = String(sql).replace(/\r\n?/g, "\n");
  const out = [];
  let text = "";
  let code = "";
  let i = 0;
  const n = src.length;
  const flush = () => {
    const t = text.trim();
    const c = code.replace(/\s+/g, " ").trim().toUpperCase();
    if (c.length > 0) out.push({ text: t, code: c });
    text = "";
    code = "";
  };
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === "-" && next === "-") {
      while (i < n && src[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      let depth = 1;
      i += 2;
      while (i < n && depth > 0) {
        if (src[i] === "/" && src[i + 1] === "*") {
          depth += 1;
          i += 2;
        } else if (src[i] === "*" && src[i + 1] === "/") {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      text += " ";
      code += " ";
      continue;
    }
    if (ch === "'") {
      const escaped = i > 0 && /[eE]/.test(src[i - 1]) && (i < 2 || !/[A-Za-z0-9_]/.test(src[i - 2]));
      let j = i + 1;
      while (j < n) {
        if (escaped && src[j] === "\\") {
          j += 2;
          continue;
        }
        if (src[j] === "'") {
          if (src[j + 1] === "'") {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      text += src.slice(i, j + 1);
      code += "'?'";
      i = j + 1;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      while (j < n) {
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            j += 2;
            continue;
          }
          break;
        }
        j += 1;
      }
      text += src.slice(i, j + 1);
      code += '"?"';
      i = j + 1;
      continue;
    }
    if (ch === "$") {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(src.slice(i, i + 64));
      if (m && !(i > 0 && /[A-Za-z0-9_]/.test(src[i - 1]))) {
        const tag = m[0];
        const end = src.indexOf(tag, i + tag.length);
        const stop = end === -1 ? n : end + tag.length;
        text += src.slice(i, stop);
        code += "$?$";
        i = stop;
        continue;
      }
    }
    if (ch === ";") {
      flush();
      i += 1;
      continue;
    }
    text += ch;
    code += ch;
    i += 1;
  }
  flush();
  return out;
}

function resumo(stmt) {
  const t = stmt.text.replace(/\s+/g, " ");
  return t.length > 70 ? `${t.slice(0, 67)}...` : t;
}

/**
 * Classifica UMA migração e devolve as violações.
 * @param {{ name: string, sql: string | null, drillSources?: string[], anteriores?: readonly string[] }} input
 *   `sql === null` = o diretório não tem `migration.sql`.
 */
export function auditMigration({ name, sql, drillSources = [], anteriores = ANTERIORES }) {
  const violations = [];
  const add = (rule, detail) => violations.push({ rule, name, detail, line: `${rule} ${name}: ${detail}` });
  const historica = anteriores.includes(name);
  const info = { name, historica, nova: !historica, statements: 0, controle: 0, naoTransacional: [], violations };
  if (sql === null || sql === undefined) {
    add("G0", "diretório sem migration.sql");
    return info;
  }
  if (!historica && name < FRONTEIRA) {
    add("G1", `carimbo anterior à fronteira ${FRONTEIRA} e nome fora da lista das anteriores (migração nova com carimbo antigo)`);
  }
  if (historica) return info;

  const all = splitStatements(sql);
  const ctl = all.filter((s) => CONTROLE_DE_TRANSACAO.test(s.code));
  const body = all.filter((s) => !CONTROLE_DE_TRANSACAO.test(s.code));
  const naoTx = body
    .map((s) => ({ s, hit: DDL_NAO_TRANSACIONAL.find((d) => d.re.test(s.code)) }))
    .filter((x) => x.hit);
  const lines = String(sql).replace(/\r\n?/g, "\n").split("\n");
  const tentativa = lines.some((l) => DECLARACAO_TENTATIVA.test(l) || DECLARACAO_VALIDA.test(l));
  const valida = lines.some((l) => {
    const m = DECLARACAO_VALIDA.exec(l);
    return m !== null && m[1].replace(/\s/g, "").length >= MOTIVO_MINIMO;
  });
  info.statements = body.length;
  info.controle = ctl.length;
  info.naoTransacional = naoTx.map((x) => x.hit.id);

  if (naoTx.length > 0) {
    const ids = [...new Set(info.naoTransacional)].join(", ");
    if (body.length > 1) {
      add("G3", `DDL não transacional (${ids}) acompanhada de ${body.length - 1} outra(s) sentença(s); divida em migração própria, sozinha no arquivo`);
    }
    if (ctl.length > 0) {
      add("G4", `DDL não transacional (${ids}) com ${ctl.length} controle(s) de transação; o Postgres recusa ("cannot run inside a transaction block"), tire o BEGIN/COMMIT`);
    }
    if (!valida) {
      add("G5", `DDL não transacional (${ids}) sem a linha "-- NAO-ATOMICA: <motivo com >= ${MOTIVO_MINIMO} caracteres>"; declare a não-atomicidade e o plano de aplicação`);
    }
    return info;
  }

  if (tentativa) {
    add("G7", "declaração NAO-ATOMICA numa migração sem DDL não transacional (declaração usada como opt-out)");
  }

  const envoltorio =
    all.length >= 2 &&
    all[0].code === "BEGIN" &&
    all[all.length - 1].code === "COMMIT" &&
    ctl.length === 2;
  if (body.length > 1) {
    if (!envoltorio) {
      const formas = ctl.filter((s) => s.code !== "BEGIN" && s.code !== "COMMIT").map((s) => s.code);
      const dica = formas.length > 0 ? ` (achado: ${[...new Set(formas)].join(", ")}; use BEGIN;/COMMIT;)` : "";
      add(
        "G2",
        `n = ${body.length} sentenças sem BEGIN;/COMMIT; nas pontas e só nelas; ${ctl.length} controle(s) de transação; ` +
          `1ª sentença: \`${resumo(all[0])}\`; última: \`${resumo(all[all.length - 1])}\`${dica}`,
      );
    }
    if (!drillSources.some((src) => src.includes(name))) {
      add("G6", "falta o drill por prefixo: nenhum tests/*-migration-drill-db.test.ts cita o nome desta migração");
    }
  } else if (ctl.length > 0 && !envoltorio) {
    add("G2", `${ctl.length} controle(s) de transação fora da forma de envoltório (BEGIN; <sentença>; COMMIT;)`);
  }
  return info;
}

/** Lê o texto de todo `tests/*-migration-drill-db.test.ts` (só o topo, como o runner do `npm test`). */
export function readDrillSources(testsDir) {
  if (!fs.existsSync(testsDir)) return [];
  return fs
    .readdirSync(testsDir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith("-migration-drill-db.test.ts"))
    .map((e) => fs.readFileSync(path.join(testsDir, e.name), "utf8"));
}

/**
 * Audita um diretório de migrações inteiro.
 * @param {string} dir
 * @param {{ testsDir?: string, drillSources?: string[], anteriores?: readonly string[] }} [opts]
 */
export function auditMigrationsDir(dir, opts = {}) {
  const anteriores = opts.anteriores ?? ANTERIORES;
  const drillSources = opts.drillSources ?? readDrillSources(opts.testsDir ?? REPO_TESTS_DIR);
  const names = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const migrations = names.map((name) => {
    const file = path.join(dir, name, "migration.sql");
    const sql = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
    return auditMigration({ name, sql, drillSources, anteriores });
  });
  const violations = migrations.flatMap((m) => m.violations);
  const present = new Set(names);
  for (const old of anteriores) {
    if (!present.has(old)) {
      violations.push({
        rule: "G1",
        name: old,
        detail: "nome da lista das anteriores ausente do disco (histórico reescrito ou renomeado)",
        line: `G1 ${old}: nome da lista das anteriores ausente do disco (histórico reescrito ou renomeado)`,
      });
    }
  }
  return {
    total: names.length,
    anteriores: migrations.filter((m) => m.historica).length,
    novas: migrations.filter((m) => m.nova).length,
    migrations,
    violations,
  };
}

function parseArgs(argv) {
  const args = { dir: null, testsDir: null, anteriores: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--tests") args.testsDir = argv[++i];
    else if (a === "--anteriores") {
      const v = argv[++i] ?? "-";
      args.anteriores = v === "-" ? [] : v.split(",").map((s) => s.trim()).filter(Boolean);
    } else args.dir = a;
  }
  return args;
}

export function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  const dir = path.resolve(args.dir ?? REPO_MIGRATIONS_DIR);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    console.error(`[migration-transaction-guard] diretório de migrações inexistente: ${dir}`);
    return 2;
  }
  // A lista congelada descreve o histórico do repositório; fora dele (fixtures) vale lista vazia, salvo --anteriores.
  const anteriores = args.anteriores ?? (dir === path.resolve(REPO_MIGRATIONS_DIR) ? ANTERIORES : []);
  const result = auditMigrationsDir(dir, {
    testsDir: path.resolve(args.testsDir ?? REPO_TESTS_DIR),
    anteriores,
  });
  for (const v of result.violations) console.log(v.line);
  console.log(
    `migrações: ${result.total} · anteriores: ${result.anteriores} · novas: ${result.novas} · violações: ${result.violations.length}`,
  );
  return result.violations.length > 0 ? 1 : 0;
}

const invokedPath = process.argv[1];
const isDirectRun =
  invokedPath !== undefined &&
  (import.meta.url === pathToFileURL(invokedPath).href ||
    path.basename(invokedPath) === "migration-transaction-guard.mjs");

if (isDirectRun) {
  process.exitCode = main();
}
