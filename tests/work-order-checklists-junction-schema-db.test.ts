import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { CHECKLIST_APPLICABILITY_ROLES } from "../src/modules/checklists/applicability/checklist-applicability.types.js";

// CHECKLIST P1 PR-04c-A — GUARD ESTRUTURAL da JUNÇÃO ordem de serviço × vistoria, contra o PostgreSQL REAL.
//
// Por que este arquivo existe: a decisão que sustenta o bloco inteiro ("a identidade da junção inclui a FASE",
// junta do PR-04c, 3×0) é uma cláusula de ÍNDICE. Ela vive só no SQL — o Prisma não expressa índice parcial —
// e nenhum teste em memória a exerce. Sem este guard, a diferença entre "o índice existe como eu escrevi" e
// "o índice existe" só apareceria quando uma organização com UM formulário tentasse usá-lo na coleta e na
// entrega da mesma ordem: a segunda linha seria recusada, a vistoria de entrega nunca existiria, e a tela de
// comparação — cujo resumo de divergências é prova jurídica do estado do veículo — ficaria sem o segundo lado.
//
// É a mesma família de bug do hotfix #341 (CHECK do banco desatualizado em relação ao código, com a suíte
// verde o tempo todo porque rodava em memória).
//
// Cada caso roda dentro de uma transação com ROLLBACK: nada persiste na base de desenvolvimento.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("guard estrutural da junção exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  // ── identidade: a FASE dentro da chave ──────────────────────────────────────

  test("identidade: o MESMO modelo serve coleta E entrega na mesma ordem (a lei da junta do PR-04c)", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      // Sem a fase na chave, ESTA linha seria recusada — e a organização com um único formulário de vistoria
      // (o caso mais comum) ficaria sem a vistoria de entrega. A saída que sobraria, duplicar o formulário em
      // dois modelos, faz os `component_key` divergirem com o tempo e a comparação produzir divergências
      // vazias ou falsas, em silêncio: prova errada, que é pior que prova ausente.
      await inserirVinculo(client, {
        tenantId,
        workOrderId,
        templateId,
        role: "delivery",
        orderIndex: 1,
      });

      const { rows } = await client.query(
        `SELECT role FROM work_order_checklists WHERE tenant_id = $1 AND work_order_id = $2 ORDER BY order_index`,
        [tenantId, workOrderId],
      );
      assert.deepEqual(
        rows.map((linha: { role: string }) => linha.role),
        ["collection", "delivery"],
        "o par coleta+entrega do mesmo modelo é o que alimenta a tela de comparação",
      );
    });
  });

  test("identidade: `role` é NOT NULL, então duas linhas GENÉRICAS do mesmo modelo ainda COLIDEM", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "generic" });

      // Este é o preço que a fase na chave NÃO pode custar. Se `role` fosse nullable, cada NULL seria distinto
      // de si mesmo no Postgres e a MESMA vistoria entraria N vezes na mesma ordem — o guincheiro receberia o
      // mesmo formulário repetido, e cada repetição é uma unidade faturada.
      await assert.rejects(
        inserirVinculo(client, { tenantId, workOrderId, templateId, role: "generic", orderIndex: 1 }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_unique/);
          return true;
        },
        "a mesma vistoria duas vezes na mesma fase é duplicata, não configuração",
      );
    });
  });

  test("identidade: o default de `role` é 'generic' — a fase omitida não vira NULL", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await client.query(
        `INSERT INTO work_order_checklists (tenant_id, work_order_id, checklist_id, checklist_source)
         VALUES ($1, $2, $3, 'manual')`,
        [tenantId, workOrderId, templateId],
      );

      const { rows } = await client.query(
        `SELECT role, order_index FROM work_order_checklists WHERE tenant_id = $1`,
        [tenantId],
      );
      assert.equal(rows[0]?.role, "generic", "`generic` é VALOR de negócio ('vale para a ordem toda'), não ausência");
      assert.equal(rows[0]?.order_index, 0, "sem posição declarada a linha é a primeira — e portanto a primária");
    });
  });

  test("identidade: o índice é PARCIAL — retirar a vistoria LIBERA o par e permite re-adicionar", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId, userId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      await client.query(
        `UPDATE work_order_checklists
            SET removed_at = now(), removed_by = $2, removed_reason = 'cliente dispensou a vistoria'
          WHERE tenant_id = $1`,
        [tenantId, userId],
      );

      // Sem o predicado parcial, devolver ao conjunto uma vistoria retirada por engano exigiria APAGAR a linha
      // — perdendo quem retirou, quando e por quê. Numa disputa sobre o veículo, "por que esta vistoria não
      // aconteceu" é exatamente a pergunta que se faz.
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection", orderIndex: 1 });

      const { rows } = await client.query(
        `SELECT count(*)::int AS total FROM work_order_checklists WHERE tenant_id = $1`,
        [tenantId],
      );
      assert.equal(rows[0]?.total, 2, "a linha retirada permanece como histórico ao lado da nova");
    });
  });

  // ── coerência: os dois CHECKs biconditional ────────────────────────────────

  test("proveniência: `resolved` SEM regra é recusado — a linha não pode afirmar uma decisão sem política", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await assert.rejects(
        inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection", source: "resolved" }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_provenance_chk/);
          return true;
        },
        "'o sistema decidiu isto' sem poder dizer QUAL regra decidiu é a cadeia de proveniência mentindo",
      );
    });
  });

  test("proveniência: `manual` COM regra é recusado — escolha humana não se apresenta como automática", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId, ruleId }) => {
      await assert.rejects(
        inserirVinculo(client, {
          tenantId,
          workOrderId,
          templateId,
          role: "collection",
          source: "manual",
          ruleId,
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_provenance_chk/);
          return true;
        },
      );
    });
  });

  test("proveniência: os dois pares COERENTES passam (`manual` sem regra, `resolved` com regra)", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId, ruleId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection", source: "manual" });
      await inserirVinculo(client, {
        tenantId,
        workOrderId,
        templateId,
        role: "delivery",
        source: "resolved",
        ruleId,
        orderIndex: 1,
      });
    });
  });

  test("origem: `checklist_source` fora do vocabulário é recusado", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await assert.rejects(
        inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection", source: "automatic" }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_source_chk/);
          return true;
        },
      );
    });
  });

  test("remoção: retirada ANÔNIMA é recusada (`removed_at` sem `removed_by`)", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      // Retirar uma vistoria do conjunto é um ato sobre um documento que pode virar prova. Sem autor, a
      // auditoria registra que algo sumiu e não quem o retirou — o mesmo silêncio que a junta D2 recusou.
      await assert.rejects(
        client.query(`UPDATE work_order_checklists SET removed_at = now() WHERE tenant_id = $1`, [tenantId]),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_removal_chk/);
          return true;
        },
      );
    });
  });

  test("remoção: carimbo de autor SEM data é recusado (a linha se apresentaria como viva)", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId, userId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      // O índice de identidade decide "viva" pelo `removed_at`. Uma linha com autor de remoção e sem data
      // continuaria ocupando o par (ordem, modelo, fase) sem que ninguém entendesse por quê.
      await assert.rejects(
        client.query(`UPDATE work_order_checklists SET removed_by = $2 WHERE tenant_id = $1`, [tenantId, userId]),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_removal_chk/);
          return true;
        },
      );
    });
  });

  // ── vocabulário de fase ────────────────────────────────────────────────────

  test("fase: o CHECK aceita exatamente as três fases do domínio e recusa o resto", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      for (const role of CHECKLIST_APPLICABILITY_ROLES) {
        await client.query("SAVEPOINT fase");
        await inserirVinculo(client, { tenantId, workOrderId, templateId, role });
        await client.query("ROLLBACK TO SAVEPOINT fase");
      }

      // `custody_yard` é o caso concreto que o dono já antecipou e que ainda NÃO foi decidido (é valor de fase
      // ou discriminador próprio?). Enquanto não houver decisão, o banco recusa: melhor recusar do que aceitar
      // uma fase que metade do sistema não entende.
      await assert.rejects(
        inserirVinculo(client, { tenantId, workOrderId, templateId, role: "custody_yard" }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_role_chk/);
          return true;
        },
      );
    });
  });

  test("fase: o CHECK da junção e a união de fases do TypeScript são o MESMO conjunto", async () => {
    await comCenario(connection, async ({ client }) => {
      const noBanco = await vocabularioDoCheck(client, "work_order_checklists_role_chk");

      // Fonte única do vocabulário (MÉDIA 10 do ataque): a união TypeScript governa os TRÊS CHECKs (regra,
      // junção, run). Estender só o banco faz a junção aceitar uma fase que o domínio não conhece; estender só
      // o TypeScript faz o INSERT estourar em produção com erro cru de driver.
      assert.deepEqual(
        noBanco,
        [...CHECKLIST_APPLICABILITY_ROLES].sort(),
        "CHECK do banco e união de TypeScript divergiram — estenda os TRÊS CHECKs na mesma entrega",
      );
    });
  });

  // ── integridade referencial ────────────────────────────────────────────────

  test("isolamento: a FK é composta tenant-first — a junção não alcança modelo de OUTRA organização", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId }) => {
      const outraOrg = randomUUID();
      const modeloDeOutra = randomUUID();
      await client.query(`INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`, [
        outraOrg,
        "Outra organização",
        `outra-${outraOrg.slice(0, 8)}`,
      ]);
      await client.query(
        `INSERT INTO checklist_templates (id, tenant_id, name, type, status, schema)
         VALUES ($1, $2, 'Modelo alheio', 'towing_collection', 'published', '{}'::jsonb)`,
        [modeloDeOutra, outraOrg],
      );

      // Com FK simples em `checklist_id` isto passaria, e a ordem de uma organização mandaria ao campo o
      // formulário de outra. Tenant-first torna isso estruturalmente impossível, não apenas filtrado na
      // aplicação.
      await assert.rejects(
        inserirVinculo(client, { tenantId, workOrderId, templateId: modeloDeOutra, role: "collection" }),
        (error: unknown) => {
          assert.match(mensagem(error), /tenant_id_checklist_id_fkey/);
          return true;
        },
      );
    });
  });

  test("isolamento: a FK da REGRA também é tenant-first — a vistoria não é explicada por regra de OUTRA organização", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      // A regra citada aqui EXISTE — o que não pode existir é o atravessamento de organização. Se o teste
      // usasse um id inventado, uma FK simples em `rule_id` também o recusaria (id inexistente) e o guard
      // passaria sem exercer nada da composição tenant-first: teatro. Este cenário só falha com a FK composta.
      const outraOrg = randomUUID();
      const regraDeOutra = randomUUID();
      const modeloDeOutra = randomUUID();
      await client.query(`INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`, [
        outraOrg,
        "Outra organização",
        `outra-${outraOrg.slice(0, 8)}`,
      ]);
      await client.query(
        `INSERT INTO checklist_templates (id, tenant_id, name, type, status, schema)
         VALUES ($1, $2, 'Modelo alheio', 'towing_collection', 'published', '{}'::jsonb)`,
        [modeloDeOutra, outraOrg],
      );
      await client.query(
        `INSERT INTO checklist_applicability_rules (id, tenant_id, template_id, role)
         VALUES ($1, $2, $3, 'collection')`,
        [regraDeOutra, outraOrg, modeloDeOutra],
      );

      // Pré-requisito medido: `checklist_applicability_rules` nasceu sem `@@unique([tenant_id, id])`, e sem ele
      // o PostgreSQL RECUSA esta FK composta — sobraria a simples, e a proveniência de uma organização passaria
      // a apontar a política de outra.
      await assert.rejects(
        inserirVinculo(client, {
          tenantId,
          workOrderId,
          templateId,
          role: "collection",
          source: "resolved",
          ruleId: regraDeOutra,
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_tenant_id_rule_id_fkey/);
          return true;
        },
      );
    });
  });

  test("integridade: apagar a ORDEM leva a junção junto (CASCADE — a junção é filha da ordem)", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      // RESTRICT aqui deixaria a ordem impossível de apagar por causa de uma linha de composição — e uma
      // junção órfã de ordem não significa nada. Mesmo tratamento de `work_order_events`.
      await client.query(`DELETE FROM work_orders WHERE tenant_id = $1 AND id = $2`, [tenantId, workOrderId]);

      const { rows } = await client.query(
        `SELECT count(*)::int AS total FROM work_order_checklists WHERE tenant_id = $1`,
        [tenantId],
      );
      assert.equal(rows[0]?.total, 0);
    });
  });

  test("integridade: apagar um MODELO com vistoria viva é RESTRICT, não cascata silenciosa", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId }) => {
      // A regra do cenário também aponta este modelo e também é RESTRICT; sem removê-la, quem barraria o
      // DELETE seria a FK da REGRA e este teste passaria sem exercer nada da junção (guard de teatro).
      await client.query(`DELETE FROM checklist_applicability_rules WHERE tenant_id = $1`, [tenantId]);
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });

      // Cascata aqui mudaria, sem aviso, qual vistoria o técnico preenche em campo — e apagaria a explicação
      // de uma vistoria já executada.
      await assert.rejects(
        client.query(`DELETE FROM checklist_templates WHERE id = $1`, [templateId]),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_tenant_id_checklist_id_fkey/);
          return true;
        },
      );
    });
  });

  test("integridade: apagar quem RETIROU a vistoria é RESTRICT — a autoria da retirada não some", async () => {
    await comCenario(connection, async ({ client, tenantId, workOrderId, templateId, userId }) => {
      await inserirVinculo(client, { tenantId, workOrderId, templateId, role: "collection" });
      await client.query(
        `UPDATE work_order_checklists
            SET removed_at = now(), removed_by = $2, removed_reason = 'não se aplica a este serviço'
          WHERE tenant_id = $1`,
        [tenantId, userId],
      );

      // A linha retirada é histórico probatório: apagar o usuário levaria junto a resposta para "quem tirou
      // esta vistoria do conjunto" — a pergunta de uma disputa sobre o veículo.
      await assert.rejects(
        client.query(`DELETE FROM users WHERE id = $1`, [userId]),
        (error: unknown) => {
          assert.match(mensagem(error), /work_order_checklists_tenant_id_removed_by_fkey/);
          return true;
        },
      );
    });
  });

  test("RLS está habilitada, FORÇADA e com política de isolamento por organização", async () => {
    await comCenario(connection, async ({ client }) => {
      const { rows: flags } = await client.query(
        `SELECT relrowsecurity AS enabled, relforcerowsecurity AS forced
           FROM pg_class WHERE relname = 'work_order_checklists'`,
      );
      assert.equal(flags[0]?.enabled, true, "sem RLS habilitada o isolamento depende só do filtro da aplicação");
      assert.equal(flags[0]?.forced, true, "sem FORCE, o dono da tabela ignora a política");

      const { rows: policies } = await client.query(
        `SELECT policyname FROM pg_policies WHERE tablename = 'work_order_checklists'`,
      );
      assert.equal(policies.length, 1, "RLS habilitada SEM política nenhuma nega tudo — pior que não ter");
    });
  });
}

function mensagem(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Lê o vocabulário literal de um CHECK direto do catálogo do PostgreSQL. */
async function vocabularioDoCheck(
  client: { query(sql: string, params?: readonly unknown[]): Promise<any> },
  nome: string,
): Promise<readonly string[]> {
  const { rows } = await client.query(
    `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = $1`,
    [nome],
  );
  const definicao: string = rows[0]?.def ?? "";
  assert.notEqual(definicao, "", `o CHECK ${nome} não existe no banco`);
  return [...definicao.matchAll(/'([^']+)'/g)].map((achado) => achado[1]).sort();
}

async function inserirVinculo(
  client: { query(sql: string, params?: readonly unknown[]): Promise<unknown> },
  input: {
    readonly tenantId: string;
    readonly workOrderId: string;
    readonly templateId: string;
    readonly role: string;
    readonly source?: string;
    readonly ruleId?: string;
    readonly orderIndex?: number;
    readonly addedBy?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO work_order_checklists
       (tenant_id, work_order_id, checklist_id, role, checklist_source, rule_id, order_index, added_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      input.tenantId,
      input.workOrderId,
      input.templateId,
      input.role,
      input.source ?? "manual",
      input.ruleId ?? null,
      input.orderIndex ?? 0,
      input.addedBy ?? null,
    ],
  );
}

/**
 * Cria organização + usuário + modelo publicado + ordem de serviço + regra descartáveis e roda o caso dentro de
 * uma transação que SEMPRE termina em ROLLBACK. Nada persiste na base de desenvolvimento — a limpeza não
 * depende de um teardown que pode falhar no meio (P-JUNTA-LIMPEZA-BASE-VIVA).
 */
async function comCenario(
  connection: string,
  callback: (contexto: {
    readonly client: { query(sql: string, params?: readonly unknown[]): Promise<any> };
    readonly tenantId: string;
    readonly workOrderId: string;
    readonly templateId: string;
    readonly ruleId: string;
    readonly userId: string;
  }) => Promise<void>,
): Promise<void> {
  const { Client } = await import("pg");
  const client = new Client({ connectionString: connection });
  await client.connect();

  const tenantId = randomUUID();
  const templateId = randomUUID();
  const workOrderId = randomUUID();
  const ruleId = randomUUID();
  const userId = randomUUID();

  try {
    await client.query("BEGIN");
    await client.query(`INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`, [
      tenantId,
      "Organização de prova",
      `prova-${tenantId.slice(0, 8)}`,
    ]);
    await client.query(`INSERT INTO users (id, tenant_id, name, email) VALUES ($1, $2, $3, $4)`, [
      userId,
      tenantId,
      "Operadora de prova",
      `prova-${userId.slice(0, 8)}@exemplo.test`,
    ]);
    await client.query(
      `INSERT INTO checklist_templates (id, tenant_id, name, type, status, schema)
       VALUES ($1, $2, $3, 'towing_collection', 'published', '{}'::jsonb)`,
      [templateId, tenantId, "Vistoria do Veículo"],
    );
    await client.query(
      `INSERT INTO work_orders (id, tenant_id, code, title) VALUES ($1, $2, $3, $4)`,
      [workOrderId, tenantId, `OS-${workOrderId.slice(0, 8)}`, "Ordem de prova"],
    );
    await client.query(
      `INSERT INTO checklist_applicability_rules (id, tenant_id, template_id, role) VALUES ($1, $2, $3, 'delivery')`,
      [ruleId, tenantId, templateId],
    );

    await callback({ client, tenantId, workOrderId, templateId, ruleId, userId });
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
}
