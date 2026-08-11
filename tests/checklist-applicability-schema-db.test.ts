import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// CHECKLIST P1 PR-04a — GUARD ESTRUTURAL da tabela de regras de aplicabilidade, contra o PostgreSQL REAL.
//
// Por que este arquivo existe: a resolução em JS (tests/checklist-applicability-resolution.test.ts) prova a
// SEMÂNTICA; ela roda em memória e não sabe nada do banco. Quem impede duas regras ambíguas de coexistirem em
// produção é o índice único parcial — e ele carrega uma cláusula que o Prisma nem expressa
// (`NULLS NOT DISTINCT`). Sem este guard, a diferença entre "o índice existe como eu escrevi" e "o índice
// existe" só apareceria com duas vistorias conflitantes numa ordem de serviço real.
//
// É a mesma família de bug que gerou o hotfix #341 (CHECK do banco desatualizado em relação ao código, com a
// suíte verde o tempo todo porque rodava em memória).
//
// Cada caso roda dentro de uma transação com ROLLBACK: nada persiste na base.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("guard estrutural da aplicabilidade exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  test("bucket: NULL é VALOR ('qualquer'), então duas regras curinga do mesmo bucket COLIDEM", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "collection" });

      // Sem `NULLS NOT DISTINCT` (o padrão do PostgreSQL) esta segunda linha PASSARIA: NULLs seriam distintos
      // entre si e N regras curinga conviveriam, deixando indefinido qual vistoria o técnico receberia.
      await assert.rejects(
        inserirRegra(client, { tenantId, templateId, role: "collection" }),
        (error: unknown) => {
          assert.match(mensagem(error), /checklist_applicability_rules_bucket_key/);
          return true;
        },
        "duas regras curinga para a mesma etapa tornariam a vistoria da ordem de serviço indefinida",
      );
    });
  });

  test("bucket: a ETAPA faz parte da chave — mesma combinação em fases diferentes convive", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "collection" });
      await inserirRegra(client, { tenantId, templateId, role: "delivery" });
    });
  });

  test("bucket: o índice é PARCIAL — desativar a regra libera a combinação", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "collection" });
      await client.query(
        `UPDATE checklist_applicability_rules SET is_active = false WHERE tenant_id = $1`,
        [tenantId],
      );

      // Sem o predicado parcial, a regra desativada continuaria ocupando o bucket e a organização teria de
      // APAGAR a linha para cadastrar a substituta — perdendo o histórico de por que a regra existiu.
      await inserirRegra(client, { tenantId, templateId, role: "collection" });
    });
  });

  test("bucket: a regra APAGADA também libera a combinação (soft-delete entra no predicado)", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "generic" });
      await client.query(
        `UPDATE checklist_applicability_rules SET deleted_at = now() WHERE tenant_id = $1`,
        [tenantId],
      );
      await inserirRegra(client, { tenantId, templateId, role: "generic" });
    });
  });

  test("eixo de serviço: serviço concreto e tipo de serviço são mutuamente exclusivos", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await assert.rejects(
        inserirRegra(client, {
          tenantId,
          templateId,
          role: "generic",
          serviceCatalogId: randomUUID(),
          serviceType: "reboque",
        }),
        (error: unknown) => {
          assert.match(mensagem(error), /service_axis_chk/);
          return true;
        },
        "preencher os dois eixos tornaria a precedência 'serviço concreto > tipo' indecidível",
      );
    });
  });

  test("eixo de serviço: os DOIS em branco é legítimo — é a regra curinga que a decisão do dono prevê", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "generic" });
    });
  });

  test("etapa: o CHECK aceita exatamente as três fases do domínio e recusa o resto", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      for (const role of ["collection", "delivery", "generic"]) {
        await client.query("SAVEPOINT fase");
        await inserirRegra(client, { tenantId, templateId, role });
        await client.query("ROLLBACK TO SAVEPOINT fase");
      }

      // `custody_yard` é o caso concreto: a decisão do dono deixa em aberto se a custódia de pátio é um valor
      // de etapa ou um discriminador próprio. Enquanto não houver decisão, o banco recusa — é melhor recusar
      // do que aceitar um valor que metade do sistema não entende.
      await assert.rejects(
        inserirRegra(client, { tenantId, templateId, role: "custody_yard" }),
        (error: unknown) => {
          assert.match(mensagem(error), /role_chk/);
          return true;
        },
      );
    });
  });

  test("tipo de serviço em branco é recusado (seria um terceiro estado que casa nada e parece configurado)", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await assert.rejects(
        inserirRegra(client, { tenantId, templateId, role: "generic", serviceType: "   " }),
        (error: unknown) => {
          assert.match(mensagem(error), /service_type_not_blank_chk/);
          return true;
        },
      );
    });
  });

  test("isolamento: a FK é composta tenant-first — regra não alcança modelo de OUTRA organização", async () => {
    await comCenario(connection, async ({ client, templateId }) => {
      const outraOrg = randomUUID();
      await client.query(`INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`, [
        outraOrg,
        "Outra organização",
        `outra-${outraOrg.slice(0, 8)}`,
      ]);

      // Com FK simples em `template_id` isto passaria e a regra de uma organização escolheria a vistoria com
      // o modelo de outra. Tenant-first torna isso estruturalmente impossível, não apenas filtrado na aplicação.
      await assert.rejects(
        inserirRegra(client, { tenantId: outraOrg, templateId, role: "generic" }),
        (error: unknown) => {
          assert.match(mensagem(error), /tenant_id_template_id_fkey/);
          return true;
        },
      );
    });
  });

  test("integridade: apagar um modelo com regra viva é RESTRICT, não cascata silenciosa", async () => {
    await comCenario(connection, async ({ client, tenantId, templateId }) => {
      await inserirRegra(client, { tenantId, templateId, role: "collection" });

      // Cascata aqui mudaria, sem aviso, qual vistoria o técnico preenche em campo.
      await assert.rejects(
        client.query(`DELETE FROM checklist_templates WHERE id = $1`, [templateId]),
        (error: unknown) => {
          assert.match(mensagem(error), /checklist_applicability_rules/);
          return true;
        },
      );
    });
  });

  test("RLS está habilitada, FORÇADA e com política de isolamento por organização", async () => {
    await comCenario(connection, async ({ client }) => {
      const { rows: flags } = await client.query<{ enabled: boolean; forced: boolean }>(
        `SELECT relrowsecurity AS enabled, relforcerowsecurity AS forced
           FROM pg_class WHERE relname = 'checklist_applicability_rules'`,
      );
      assert.equal(flags[0]?.enabled, true, "sem RLS habilitada o isolamento depende só do filtro da aplicação");
      assert.equal(flags[0]?.forced, true, "sem FORCE, o dono da tabela ignora a política");

      const { rows: policies } = await client.query<{ policyname: string }>(
        `SELECT policyname FROM pg_policies WHERE tablename = 'checklist_applicability_rules'`,
      );
      assert.equal(policies.length, 1, "RLS habilitada SEM política nenhuma nega tudo — pior que não ter");
    });
  });
}

function mensagem(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function inserirRegra(
  client: { query(sql: string, params?: readonly unknown[]): Promise<unknown> },
  input: {
    readonly tenantId: string;
    readonly templateId: string;
    readonly role: string;
    readonly serviceCatalogId?: string;
    readonly serviceType?: string;
    readonly customerId?: string;
  },
): Promise<void> {
  await client.query(
    `INSERT INTO checklist_applicability_rules
       (tenant_id, template_id, role, service_catalog_id, service_type, customer_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      input.tenantId,
      input.templateId,
      input.role,
      input.serviceCatalogId ?? null,
      input.serviceType ?? null,
      input.customerId ?? null,
    ],
  );
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
      [templateId, tenantId, "Modelo de prova"],
    );

    await callback({ client, tenantId, templateId });
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    await client.end();
  }
}
