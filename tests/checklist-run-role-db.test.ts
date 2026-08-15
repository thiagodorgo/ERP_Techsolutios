import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { CHECKLIST_APPLICABILITY_ROLES } from "../src/modules/checklists/applicability/checklist-applicability.types.js";

// CHECKLIST P1 PR-04c-A — GUARD ESTRUTURAL da FASE na vistoria (`checklist_runs.role`), contra o PostgreSQL
// REAL.
//
// Por que este arquivo existe: esta coluna é o eixo que a pendência P-CHK-AUTOLINK-FASE-REAL pediu — "a fase
// com que a vistoria nasceu, viajando na própria run, não inferida". Ela é criada AGORA e consumida DEPOIS, o
// que a torna exatamente o tipo de estrutura que ninguém exercita até o dia em que ela está errada. Duas
// propriedades decidem se ela vai servir ou atrapalhar, e as duas são cláusulas de banco:
//
//   1. o CHECK precisa aceitar NULL (senão a migração não passa sem backfill, e backfill aqui é fabricar fase);
//   2. o CHECK precisa recusar valor inventado (senão uma fase que metade do sistema não entende entra e a
//      tela de comparação passa a decidir sobre um vocabulário que não é o dela).
//
// Cada caso roda dentro de uma transação com ROLLBACK: nada persiste na base de desenvolvimento.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("guard estrutural da fase da vistoria exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  test("a fase é NULLABLE e o default é NULL — vistoria legada NÃO recebe fase inventada", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      const runId = await inserirRun(client, { tenantId, templateId });

      const { rows } = await client.query(
        `SELECT role FROM checklist_runs WHERE tenant_id = $1 AND id = $2`,
        [tenantId, runId],
      );
      // Sem backfill (decisão do dono), TODA vistoria anterior a este bloco fica NULL — inclusive 100% das que
      // estiverem em voo no dia do deploy. Um `DEFAULT 'generic'` carimbaria nelas uma fase que ninguém
      // resolveu, num registro que pode ser lido por autoridade: é fabricar dado (D-007). NULL diz a verdade —
      // "esta vistoria nasceu antes de existir fase" — e obriga o consumidor a tratar o desconhecido.
      assert.equal(rows[0]?.role, null, "a fase omitida precisa continuar desconhecida, não virar 'generic'");

      const { rows: coluna } = await client.query(
        `SELECT is_nullable, column_default FROM information_schema.columns
          WHERE table_name = 'checklist_runs' AND column_name = 'role'`,
      );
      assert.equal(coluna[0]?.is_nullable, "YES", "NOT NULL aqui exigiria backfill, e backfill aqui é invenção");
      assert.equal(coluna[0]?.column_default, null, "um default de fase reintroduziria a invenção pela porta dos fundos");
    });
  });

  test("a fase aceita exatamente as três fases do domínio", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      for (const role of CHECKLIST_APPLICABILITY_ROLES) {
        await client.query("SAVEPOINT fase");
        await inserirRun(client, { tenantId, templateId, role });
        await client.query("ROLLBACK TO SAVEPOINT fase");
      }
    });
  });

  test("a fase RECUSA valor fora do vocabulário (`custody_yard` ainda não foi decidido)", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      // O dono já antecipou `custody_field`/`custody_yard`, mas não decidiu se são fases ou um discriminador
      // próprio. Aceitar agora congelaria a escolha do eixo antes da decisão — e uma vistoria carimbada com um
      // valor que o domínio não conhece some da comparação em silêncio, nem comparada nem sinalizada.
      await assert.rejects(
        inserirRun(client, { tenantId, templateId, role: "custody_yard" }),
        (error: unknown) => {
          assert.match(mensagem(error), /checklist_runs_role_chk/);
          return true;
        },
      );
    });
  });

  test("o CHECK da run e a união de fases do TypeScript são o MESMO conjunto", async () => {
    await comCenario(connection, async ({ client }) => {
      const { rows } = await client.query(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'checklist_runs_role_chk'`,
      );
      const definicao: string = rows[0]?.def ?? "";
      assert.notEqual(definicao, "", "o CHECK checklist_runs_role_chk não existe no banco");

      const noBanco = [...definicao.matchAll(/'([^']+)'/g)].map((achado) => achado[1]).sort();

      // Fonte única do vocabulário: a união TypeScript governa os TRÊS CHECKs (regra, junção, run). Estender só
      // um lado é a família de bug do hotfix #341 — o banco e o código discordando com a suíte verde.
      assert.deepEqual(
        noBanco,
        [...CHECKLIST_APPLICABILITY_ROLES].sort(),
        "CHECK do banco e união de TypeScript divergiram — estenda os TRÊS CHECKs na mesma entrega",
      );

      // O `IS NULL OR` NÃO é necessário — em SQL um CHECK que avalia para NULL é considerado satisfeito, então
      // `role IN (...)` sozinho já deixaria NULL passar. Ele é exigido aqui porque a permissão precisa estar
      // ESCRITA: sem ela, a ausência de fase entra por uma regra de lógica de 3 valores que só quem conhece a
      // armadilha enxerga, e o próximo autor lê a constraint como fechada, "corrige" a coluna para NOT NULL e
      // descobre no deploy que precisaria carimbar uma fase em toda vistoria legada.
      assert.match(
        definicao,
        /\(role IS NULL\)\s+OR/,
        "a permissão de vistoria sem fase precisa estar escrita, não implícita na lógica de 3 valores",
      );
    });
  });
}

function mensagem(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function inserirRun(
  client: { query(sql: string, params?: readonly unknown[]): Promise<any> },
  input: { readonly tenantId: string; readonly templateId: string; readonly role?: string },
): Promise<string> {
  const runId = randomUUID();
  await client.query(
    `INSERT INTO checklist_runs (id, tenant_id, template_id, template_version, role)
     VALUES ($1, $2, $3, 1, $4)`,
    [runId, input.tenantId, input.templateId, input.role ?? null],
  );
  return runId;
}

/**
 * Cria organização + modelo publicado descartáveis e roda o caso dentro de uma transação que SEMPRE termina em
 * ROLLBACK. Nada persiste na base de desenvolvimento — a limpeza não depende de um teardown que pode falhar no
 * meio (P-JUNTA-LIMPEZA-BASE-VIVA).
 */
async function comCenario(
  connection: string,
  callback: (contexto: {
    readonly client: { query(sql: string, params?: readonly unknown[]): Promise<any> };
    readonly tenantId: string;
    readonly templateId: string;
  }) => Promise<void>,
): Promise<void> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: connection });
  await client.connect();

  const tenantId = randomUUID();
  const templateId = randomUUID();

  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`, [
      tenantId,
      "Organização de prova",
      `prova-${tenantId.slice(0, 8)}`,
    ]);
    await client.query(
      `INSERT INTO checklist_templates (id, tenant_id, name, type, status, schema)
       VALUES ($1, $2, $3, 'towing_collection', 'published', '{}'::jsonb)`,
      [templateId, tenantId, "Vistoria do Veículo"],
    );

    await callback({ client, tenantId, templateId });
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
}
