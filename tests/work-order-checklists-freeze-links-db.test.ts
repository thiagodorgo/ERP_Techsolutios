import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

// CHECKLIST P1 PR-04c (BLOQ 1 da verificação) — O CONGELAMENTO POR LINHA, CONTRA O PostgreSQL REAL.
//
// `freezeChecklistLinkSnapshots` é a escrita que o despacho usa para carimbar o formulário das vistorias que
// NÃO viram execução agora. Ela estava DECLARADA na interface do repositório e não tinha uma única
// implementação — o `tsc` reprovava o repositório inteiro. Implementada nos três lugares (memória, Prisma e o
// invólucro de RLS), só o de memória seria exercido por suíte: o SQL do Prisma é escrito à mão (o Prisma não
// expressa nem o índice parcial nem a remoção soft desta tabela) e o que ele faz de errado não aparece em
// memória.
//
// O que este arquivo tranca, e por que cada cláusula do `WHERE` existe:
//   · a FASE dentro do alvo — sem ela, congelar a ENTREGA carimbaria também a COLETA do mesmo modelo, e a
//     vistoria da coleta iria a campo com o formulário da outra ponta;
//   · `removed_at IS NULL` — uma linha retirada entre a leitura do despacho e o carimbo voltaria a carregar
//     formulário, ressuscitando estado que ninguém pediu;
//   · o ESPELHO (`work_orders.checklist_snapshot`) intocado — ele reproduz a PRIMÁRIA e é escrito por
//     `freezeChecklistSnapshot`; dois caminhos disputando a mesma coluna no mesmo despacho é exatamente como
//     ela dessincronizaria da junção.
//
// Cada caso roda dentro de uma transação com ROLLBACK, com o contexto de RLS setado como em produção: nada
// persiste na base de desenvolvimento (P-JUNTA-LIMPEZA-BASE-VIVA).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("congelamento por linha exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  test("congela SÓ o par (modelo, etapa) alvo — a outra etapa do MESMO modelo fica intacta", async () => {
    await comCenario(async ({ repository, tenantId, workOrderId, templateId, linhas }) => {
      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [{ checklistId: templateId, role: "delivery", snapshot: { versao: "entrega" } }],
      });

      const depois = await linhas();
      assert.deepEqual(depois.get("collection"), null, "a coleta não podia receber o formulário da entrega");
      assert.deepEqual(depois.get("delivery"), { versao: "entrega" });
    });
  });

  test("congela N linhas numa chamada só — o conjunto não sai do despacho pela metade", async () => {
    await comCenario(async ({ repository, tenantId, workOrderId, templateId, linhas }) => {
      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [
          { checklistId: templateId, role: "collection", snapshot: { versao: "coleta" } },
          { checklistId: templateId, role: "delivery", snapshot: { versao: "entrega" } },
        ],
      });

      const depois = await linhas();
      assert.deepEqual(depois.get("collection"), { versao: "coleta" });
      assert.deepEqual(depois.get("delivery"), { versao: "entrega" });
    });
  });

  test("linha RETIRADA não é carimbada — o despacho não ressuscita o que o operador tirou do conjunto", async () => {
    await comCenario(async ({ repository, client, tenantId, workOrderId, templateId, userId, linhaCrua }) => {
      // A corrida real: o despacho LÊ o conjunto, o operador retira a vistoria de entrega, o despacho carimba.
      await client.query(
        `UPDATE work_order_checklists
            SET removed_at = now(), removed_by = $3
          WHERE tenant_id = $1 AND work_order_id = $2 AND role = 'delivery'`,
        [tenantId, workOrderId, userId],
      );

      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [{ checklistId: templateId, role: "delivery", snapshot: { versao: "entrega" } }],
      });

      assert.equal(
        (await linhaCrua("delivery")).checklist_snapshot,
        null,
        "carimbar uma linha retirada faria o histórico afirmar que aquela vistoria foi prometida ao campo",
      );
    });
  });

  test("alvo inexistente é ignorado em SILÊNCIO — sem erro e sem escrita (contrato da interface)", async () => {
    await comCenario(async ({ repository, tenantId, workOrderId, templateId, linhas }) => {
      // `generic` não existe nesta ordem (as linhas são coleta e entrega). O despacho decide sobre o conjunto
      // que LEU; um erro aqui derrubaria um despacho por causa de uma linha que já não interessa.
      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [{ checklistId: templateId, role: "generic", snapshot: { versao: "fantasma" } }],
      });

      const depois = await linhas();
      assert.equal(depois.size, 2);
      assert.deepEqual([...depois.values()], [null, null], "nenhuma linha podia ter sido tocada");
    });
  });

  test("o ESPELHO da ordem não é tocado por esta escrita — quem o escreve é o freeze da primária", async () => {
    await comCenario(async ({ repository, client, tenantId, workOrderId, templateId }) => {
      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [{ checklistId: templateId, role: "delivery", snapshot: { versao: "entrega" } }],
      });

      const { rows } = await client.query(
        `SELECT checklist_snapshot FROM work_orders WHERE tenant_id = $1 AND id = $2`,
        [tenantId, workOrderId],
      );
      assert.equal(rows[0]?.checklist_snapshot, null);
    });
  });

  test("é tenant-scoped: a organização vizinha não carimba a vistoria desta (nem sabe que ela existe)", async () => {
    await comCenario(async ({ repository, tenantId, workOrderId, templateId, linhas }) => {
      const outraOrg = randomUUID();

      // Mesmo com o par (modelo, etapa) certo, o `WHERE` recorta por organização. Uma escrita cruzada aqui
      // mandaria a campo o formulário de outra empresa. (A RLS da tabela seria a segunda trava — mas ver a nota
      // do harness: nesta conexão ela é atravessada, então quem está sendo exercido aqui é o SQL.)
      await repository.freezeChecklistLinkSnapshots({
        tenantId: outraOrg,
        workOrderId,
        entries: [{ checklistId: templateId, role: "delivery", snapshot: { versao: "invasora" } }],
      });

      assert.deepEqual([...(await linhas()).values()], [null, null]);
      // Sanidade do próprio teste: o alvo legítimo AINDA é carimbável (senão o caso passaria por qualquer
      // motivo, inclusive por a linha não existir).
      await repository.freezeChecklistLinkSnapshots({
        tenantId,
        workOrderId,
        entries: [{ checklistId: templateId, role: "delivery", snapshot: { versao: "entrega" } }],
      });
      assert.deepEqual((await linhas()).get("delivery"), { versao: "entrega" });
    });
  });
}

/**
 * Cria organização + usuário + modelo + ordem + DUAS linhas de junção (coleta e entrega do MESMO modelo, o caso
 * que a junta do PR-04c decidiu permitir) e roda o caso dentro de uma transação que SEMPRE termina em ROLLBACK.
 *
 * O repositório recebe o MESMO cliente transacional, com `app.current_tenant_id` setado como `withTenantRls` faz
 * em produção.
 *
 * MEDIDO, e dito porque a tentação é afirmar o contrário: nesta máquina a `DATABASE_URL` conecta como
 * `postgres` (SUPERUSUÁRIO), e superusuário ATRAVESSA a RLS mesmo com `FORCE ROW LEVEL SECURITY`. Removendo a
 * linha do contexto, os seis casos continuam passando — logo o recorte por organização que este arquivo
 * demonstra é o do `WHERE tenant_id` do SQL, NÃO a política de RLS. O contexto fica porque espelha produção;
 * afirmar que ele é o que segura o isolamento aqui seria falso. (A consequência é maior que este arquivo:
 * NENHUMA suíte `-db` do repositório exercita RLS de verdade enquanto a conexão de desenvolvimento for
 * superusuário — vale um papel de aplicação não-privilegiado, e isso é decisão de infraestrutura.)
 */
async function comCenario(
  callback: (contexto: {
    readonly repository: {
      freezeChecklistLinkSnapshots(input: {
        readonly tenantId: string;
        readonly workOrderId: string;
        readonly entries: readonly {
          readonly checklistId: string;
          readonly role: "collection" | "delivery" | "generic";
          readonly snapshot: Record<string, unknown> | null;
        }[];
      }): Promise<void>;
    };
    readonly client: { query(sql: string, params?: readonly unknown[]): Promise<any> };
    readonly tenantId: string;
    readonly workOrderId: string;
    readonly templateId: string;
    readonly userId: string;
    readonly linhas: () => Promise<Map<string, unknown>>;
    readonly linhaCrua: (role: string) => Promise<{ checklist_snapshot: unknown }>;
  }) => Promise<void>,
): Promise<void> {
  // O MESMO cliente da aplicação (adaptador `pg` + `DATABASE_URL` do `.env`): construir um `PrismaClient` nu
  // aqui falha, porque este esquema é gerado com adaptador obrigatório — e um cliente paralelo também não seria
  // o que roda em produção.
  const { prisma } = await import("../src/database/prisma.js");
  const { PrismaWorkOrderRepository } = await import("../src/modules/work-orders/work-order-prisma.repository.js");
  const { setTenantRlsContext } = await import("../src/database/rls.js");
  const tenantId = randomUUID();
  const templateId = randomUUID();
  const workOrderId = randomUUID();
  const userId = randomUUID();

  const RollbackSentinel = Symbol("rollback");

  try {
    await prisma
      .$transaction(async (tx) => {
        await setTenantRlsContext(tx, tenantId);

        const client = {
          query: async (sql: string, params: readonly unknown[] = []) => {
            const rows = await tx.$queryRawUnsafe<Record<string, unknown>[]>(sql, ...params);
            return { rows };
          },
        };

        await tx.$executeRawUnsafe(
          `INSERT INTO tenants (id, name, slug, status) VALUES ($1, $2, $3, 'active')`,
          tenantId,
          "Organização do congelamento",
          `freeze-${tenantId.slice(0, 8)}`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO users (id, tenant_id, name, email) VALUES ($1, $2, $3, $4)`,
          userId,
          tenantId,
          "Operadora de prova",
          `freeze-${userId.slice(0, 8)}@exemplo.test`,
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO checklist_templates (id, tenant_id, name, type, status, schema)
             VALUES ($1, $2, $3, 'towing_collection', 'published', '{}'::jsonb)`,
          templateId,
          tenantId,
          "Vistoria do Veículo",
        );
        await tx.$executeRawUnsafe(
          `INSERT INTO work_orders (id, tenant_id, code, title) VALUES ($1, $2, $3, $4)`,
          workOrderId,
          tenantId,
          `OS-${workOrderId.slice(0, 8)}`,
          "Ordem do congelamento",
        );
        for (const [role, orderIndex] of [
          ["collection", 0],
          ["delivery", 1],
        ] as const) {
          await tx.$executeRawUnsafe(
            `INSERT INTO work_order_checklists
               (tenant_id, work_order_id, checklist_id, role, checklist_source, order_index)
             VALUES ($1, $2, $3, $4, 'manual', $5)`,
            tenantId,
            workOrderId,
            templateId,
            role,
            orderIndex,
          );
        }

        const linhaCrua = async (role: string) => {
          const { rows } = await client.query(
            `SELECT checklist_snapshot FROM work_order_checklists
              WHERE tenant_id = $1 AND work_order_id = $2 AND role = $3
              ORDER BY created_at DESC LIMIT 1`,
            [tenantId, workOrderId, role],
          );
          return rows[0] as { checklist_snapshot: unknown };
        };

        const linhas = async () => {
          const { rows } = await client.query(
            `SELECT role, checklist_snapshot FROM work_order_checklists
              WHERE tenant_id = $1 AND work_order_id = $2 AND removed_at IS NULL
              ORDER BY order_index`,
            [tenantId, workOrderId],
          );
          return new Map(
            (rows as { role: string; checklist_snapshot: unknown }[]).map((row) => [row.role, row.checklist_snapshot]),
          );
        };

        await callback({
          repository: new PrismaWorkOrderRepository(tx),
          client,
          tenantId,
          workOrderId,
          templateId,
          userId,
          linhas,
          linhaCrua,
        });

        // Sai SEMPRE pelo erro: o rollback é a limpeza, e não depende de um teardown que pode falhar no meio.
        throw RollbackSentinel;
      })
      .catch((error: unknown) => {
        if (error !== RollbackSentinel) throw error;
      });
  } finally {
    await prisma.$disconnect();
  }
}
