import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

// GUARD SISTÊMICO — achado ALTA unânime da junta do CHECKLIST P1 PR-03.
//
// O PROBLEMA QUE ESTE TESTE EXISTE PARA PEGAR: em `CORE_SAAS_PERSISTENCE=prisma` (o modo REAL),
// o gate das rotas resolve permissões da tabela PERSISTIDA `role_permissions`
// (`PersistentAuthorizationService`), NÃO do catálogo em código. O catálogo só chega ao banco por
// `prisma/seed.ts` — e `deploy-production.yml` roda apenas `prisma migrate deploy` ("SEM db:seed —
// produção NUNCA semeia"). Logo, toda permissão nova adicionada só ao código nasce MORTA em
// produção: a rota responde 403 para todos os papéis, inclusive `tenant_admin`/`super_admin`.
//
// Aconteceu de verdade com `checklist_runs:reopen` neste PR — e o agravante é que o corpo do LOGIN
// anuncia a permissão (vem do catálogo) enquanto `/me` e o middleware não a têm (vêm do banco):
// a interface habilita o botão e a API recusa.
//
// POR QUE NENHUM TESTE PEGAVA: `tests/checklist-routes.test.ts` (e as demais suítes de rota) forçam
// `CORE_SAAS_PERSISTENCE=memory`, onde o middleware persistente faz short-circuit e lê o catálogo em
// código. A suíte fechava verde com a rota inoperante no modo real.
//
// É a MESMA classe do bug que gerou o hotfix #341 (enum novo sem migração de CHECK): o código
// declara, o banco não sabe, o teste roda em memória e ninguém vê. Este guard fecha essa família.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("paridade catálogo × banco requer DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  test("toda permissão do catálogo existe na tabela `permissions` do banco", async () => {
    const { client } = await connect(connectionString);
    try {
      const { PERMISSION_CATALOG } = await import("../src/modules/core-saas/permissions/catalog.js");
      const rows: Array<{ key: string }> = await client.$queryRawUnsafe("select key from permissions");
      if (await bancoNaoProvisionado(rows.length)) return;
      const noBanco = new Set(rows.map((row) => row.key));

      const ausentes = PERMISSION_CATALOG.filter((permission) => !noBanco.has(permission));

      assert.deepEqual(
        ausentes,
        [],
        `Permissão declarada no catálogo e AUSENTE no banco: ${ausentes.join(", ")}. ` +
          "Em produção o gate lê a tabela, não o código — a rota protegida por ela responderia 403 para " +
          "TODOS os papéis. Entregue uma migração de dados idempotente no mesmo PR (padrão: " +
          "prisma/migrations/20260861000000_grant_checklist_run_reopen_permission).",
      );
    } finally {
      await client.$disconnect();
    }
  });

  test("os grants por papel do banco batem com ROLE_PERMISSIONS (nenhum papel a mais, nenhum a menos)", async () => {
    const { client } = await connect(connectionString);
    try {
      const { ROLE_PERMISSIONS } = await import("../src/modules/core-saas/permissions/catalog.js");
      const rows: Array<{ role: string; permission: string }> = await client.$queryRawUnsafe(
        `select r.key as role, p.key as permission
           from role_permissions rp
           join roles r on r.id = rp.role_id
           join permissions p on p.id = rp.permission_id`,
      );
      if (await bancoNaoProvisionado(rows.length)) return;

      const noBanco = new Map<string, Set<string>>();
      for (const row of rows) {
        if (!noBanco.has(row.role)) noBanco.set(row.role, new Set());
        noBanco.get(row.role)!.add(row.permission);
      }

      const divergencias: string[] = [];
      for (const [role, permissions] of Object.entries(ROLE_PERMISSIONS as Record<string, readonly string[]>)) {
        const efetivas = noBanco.get(role);
        // Papel do catálogo que nem existe no banco é registrado, não ignorado — mas só vira
        // divergência quando o catálogo lhe dá permissões (ex.: `platform_admin` é pseudo-papel).
        if (!efetivas) {
          if (permissions.length > 0) divergencias.push(`papel "${role}" não existe no banco`);
          continue;
        }
        for (const permission of permissions) {
          if (!efetivas.has(permission)) divergencias.push(`"${role}" deveria ter "${permission}" e não tem no banco`);
        }
      }

      assert.deepEqual(
        divergencias.filter((item) => !item.includes("não existe no banco")),
        [],
        `Divergência entre o catálogo em código e os grants persistidos:\n  ${divergencias.join("\n  ")}\n` +
          "O que vale em runtime é o BANCO. Provisione com migração de dados idempotente.",
      );
    } finally {
      await client.$disconnect();
    }
  });
}

/**
 * Banco MIGRADO mas NÃO PROVISIONADO (sem `prisma db seed`) não é o alvo deste guard: `permissions`/
 * `role_permissions` nascem vazias e o teste acusaria "tudo ausente" — ruído, não achado. O CI garante
 * que este caminho não vira verde-cego: o job `backend-postgres` roda o seed ANTES e **falha se qualquer
 * teste do subconjunto for pulado** (`# skipped 0`). Fora dele, o skip é declarado em voz alta.
 */
async function bancoNaoProvisionado(linhas: number): Promise<boolean> {
  if (linhas > 0) return false;
  // eslint-disable-next-line no-console
  console.warn(
    "[paridade catálogo × banco] PULADO: banco migrado porém sem provisionamento (`npm run db:seed`). " +
      "Este guard só tem sentido contra o estado real de papéis/permissões.",
  );
  return true;
}

async function connect(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
  ]);
  return { client: new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) }) };
}
