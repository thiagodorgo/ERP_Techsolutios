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
//
// ---------------------------------------------------------------------------------------------
// LIMITE DECLARADO (D-007) — LEIA ANTES DE CONFIAR NESTE ARQUIVO SOZINHO.
//
// No job `backend-postgres` do CI o banco é escrito por `npm run db:seed`, que faz upsert do
// PERMISSION_CATALOG inteiro e dos grants de ROLE_PERMISSIONS. Contra esse banco, este guard
// compara o catálogo com uma tabela derivada do próprio catálogo — ou seja, ali ele é largamente
// TAUTOLÓGICO e não pegaria uma permissão nova sem migração. Quem cobre esse caso é o guard
// estático `tests/permission-catalog-migration-parity.test.ts` (sem banco, roda em todo job).
//
// O valor REAL deste arquivo é contra um banco que NÃO foi semeado a partir do catálogo corrente:
// dev, staging e produção (provisionada uma única vez por bootstrap e depois só por migração).
// É lá que ele encontra a deriva — e encontrou: ver a divergência medida no comentário do segundo
// teste.
// ---------------------------------------------------------------------------------------------

// ATIVAÇÃO EXPLÍCITA (achado ALTA-3 do crítico-adversarial). A versão anterior deduzia "banco não
// provisionado" olhando se a tabela `roles` estava vazia — sentinela impossível de confiar: `npm test`
// roda os arquivos EM PARALELO e pelo menos seis suítes criam papéis (auth-login, auth-session,
// checklist-routes-db, core-saas-prisma, persistent-rbac-authorization, persistent-rbac-middleware).
// Uma amostragem no instante errado fazia o teste prosseguir contra um banco não semeado e pintar o
// job `backend` de vermelho listando o catálogo inteiro, num PR sem relação nenhuma com RBAC.
// Agora quem manda é uma variável de ambiente ligada SÓ no job `backend-postgres` (onde o seed roda
// antes). Nada de adivinhar o estado de um banco compartilhado.
const PARIDADE_LIGADA = process.env.RBAC_DB_PARITY === "1";
const MOTIVO_DESLIGADO =
  "RBAC_DB_PARITY não é \"1\": a paridade catálogo × banco exige um banco PROVISIONADO (migrate + seed) " +
  "e só é ligada no job `backend-postgres` do CI. Para rodar localmente: RBAC_DB_PARITY=1 com o " +
  "PostgreSQL de pé.";

/**
 * Papéis do catálogo que NÃO têm linha global (`tenant_id IS NULL`) num banco recém-provisionado.
 *
 * MEDIDO em 2026-08-10: `prisma/seed.ts` itera apenas `STANDARD_ROLES` (super_admin, tenant_admin,
 * manager, field_dispatcher, technician, viewer) e NENHUMA migração faz `INSERT INTO roles`. Logo,
 * depois de `prisma migrate deploy` + `npm run db:seed` existem 6 linhas globais — os 7 papéis
 * abaixo não existem. Em bancos históricos (o de desenvolvimento tem 12) seis deles existem, e aí
 * são comparados normalmente: a isenção vale só para a AUSÊNCIA.
 *
 * `platform_admin` é caso à parte: pseudo-papel de plataforma, nunca teve linha em banco nenhum.
 *
 * CONSEQUÊNCIA QUE ESTA LISTA DECLARA EM VOZ ALTA, em vez de esconder: como `field_technician` não
 * tem linha global num banco novo, a migração `20260862000000_reconcile_role_permission_grants`
 * (`WHERE r.key = 'field_technician'`) casa ZERO linhas lá — ela conserta os bancos já semeados,
 * não um provisionamento do zero. Corrigir isso exige mexer em `prisma/seed.ts` ou numa migração,
 * fora do escopo deste arquivo; fica registrado aqui para não passar por coberto.
 */
const PAPEIS_SEM_LINHA_GLOBAL = new Set<string>([
  "platform_admin",
  "operator",
  "finance",
  "inventory",
  "field_technician",
  "auditor",
  "support",
]);

test("toda permissão do catálogo existe na tabela `permissions` do banco", async (t) => {
  if (!PARIDADE_LIGADA) {
    // `t.skip()` e não `return` seco (achado do crítico-adversarial): com `return` o node reporta
    // `ok` e `# skipped` fica 0, então o guard anti-verde-cego do CI (`test "$skipped" -eq 0`) não
    // enxergaria a passagem vazia — a porta que ele deveria fechar ficaria aberta.
    t.skip(MOTIVO_DESLIGADO);
    return;
  }

  const { client } = await conectar();
  try {
    const { PERMISSION_CATALOG } = await import("../src/modules/core-saas/permissions/catalog.js");
    const linhas: Array<{ key: string }> = await client.$queryRawUnsafe("select key from permissions");
    const noBanco = new Set(linhas.map((linha) => linha.key));

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

test("os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções)", async (t) => {
  if (!PARIDADE_LIGADA) {
    t.skip(MOTIVO_DESLIGADO);
    return;
  }

  const { client } = await conectar();
  try {
    const { ROLE_PERMISSIONS } = await import("../src/modules/core-saas/permissions/catalog.js");

    // SÓ `tenant_id IS NULL`. A versão anterior agrupava por `r.key` ignorando o tenant e unia o
    // papel global aos homônimos por organização — o que MASCARA a família de bug que este guard
    // existe para pegar: um papel global SEM o grant fica coberto por um homônimo de organização
    // QUE TEM o grant, e a asserção passa.
    //
    // Medido na base de desenvolvimento: existem 9 linhas `field_technician` (1 global + 8 por
    // organização) e as por-organização carregam `checklist_runs:create`, que o catálogo NEGA a
    // esse papel (D-CHK-DISPATCH-CREATE). Unidas, ninguém via nada.
    //
    // DECISÃO — os papéis POR ORGANIZAÇÃO ficam FORA desta comparação. Motivo: são objetos da
    // organização, criados pela API de papéis (`POST /roles`), e podem divergir do catálogo por
    // customização legítima do cliente; além disso, num banco compartilhado eles carregam entulho
    // de teste. Compará-los produziria ruído, não achado.
    // O QUE OS COBRE, HONESTAMENTE: nada aqui. O único freio existente é
    // `PersistentAuthorizationService`, que filtra por `isValidPermission` e portanto impede um papel
    // de organização de inventar uma chave FORA do catálogo — mas NÃO o impede de carregar uma chave
    // válida que aquele papel não deveria ter (o `checklist_runs:create` acima é exatamente isso).
    // É lacuna real, declarada e não coberta.
    const linhas: Array<{ role: string; permission: string | null }> = await client.$queryRawUnsafe(
      `select r.key as role, p.key as permission
         from roles r
         left join role_permissions rp on rp.role_id = r.id
         left join permissions p on p.id = rp.permission_id
        where r.tenant_id is null`,
    );

    // `@@unique([key, tenant_id])` NÃO impede duas linhas globais com a mesma chave: no PostgreSQL
    // dois NULL são distintos para efeito de UNIQUE. Se houvesse duplicata, a união abaixo repetiria
    // o mascaramento que acabamos de eliminar — só que dentro do próprio escopo global.
    const duplicadas: Array<{ role: string; n: number }> = await client.$queryRawUnsafe(
      `select key as role, count(*)::int as n
         from roles where tenant_id is null group by key having count(*) > 1`,
    );
    assert.deepEqual(
      duplicadas,
      [],
      `Papel global duplicado no banco: ${duplicadas.map((d) => `${d.role} (${d.n} linhas)`).join(", ")}. ` +
        "Cada usuário é atribuído a UMA delas, então a que ele usa pode não ser a que tem o grant.",
    );

    // LEFT JOIN acima: um papel global existente porém SEM nenhum grant precisa aparecer no mapa,
    // senão seria confundido com papel inexistente e cairia na isenção de PAPEIS_SEM_LINHA_GLOBAL.
    const noBanco = new Map<string, Set<string>>();
    for (const linha of linhas) {
      if (!noBanco.has(linha.role)) noBanco.set(linha.role, new Set());
      if (linha.permission) noBanco.get(linha.role)!.add(linha.permission);
    }

    const divergencias: string[] = [];

    for (const [role, permissions] of Object.entries(
      ROLE_PERMISSIONS as Record<string, readonly string[]>,
    )) {
      const efetivas = noBanco.get(role);

      if (!efetivas) {
        // Papel do catálogo ausente do banco REPROVA — antes era registrado e depois filtrado para
        // fora da asserção (`divergencias.filter(item => !item.includes("não existe no banco"))`),
        // o que tornava impossível reprovar por papel faltando. A isenção agora é nominal e
        // justificada, não uma exclusão silenciosa no momento da asserção.
        if (!PAPEIS_SEM_LINHA_GLOBAL.has(role)) {
          divergencias.push(
            `papel "${role}" não tem linha global no banco, e o catálogo lhe dá ${permissions.length} permissões`,
          );
        }
        continue;
      }

      for (const permission of permissions) {
        if (!efetivas.has(permission)) {
          divergencias.push(`"${role}" deveria ter "${permission}" e não tem no banco`);
        }
      }

      // A DIREÇÃO QUE FALTAVA. O teste prometia "nenhum a mais, nenhum a menos" e só olhava "a
      // menos". Grant no banco que o catálogo não concede é privilégio efetivo que ninguém revisou:
      // em modo prisma quem manda é o banco, então o papel PODE o que o código diz que ele não pode.
      const naoConcedidas = new Set(permissions);
      for (const permission of efetivas) {
        if (!naoConcedidas.has(permission)) {
          divergencias.push(`"${role}" tem "${permission}" no banco e o catálogo NÃO concede`);
        }
      }
    }

    for (const role of noBanco.keys()) {
      if (!(role in ROLE_PERMISSIONS)) {
        divergencias.push(`papel global "${role}" existe no banco e não existe no catálogo`);
      }
    }

    const orfaos = [...PAPEIS_SEM_LINHA_GLOBAL].filter((role) => !(role in ROLE_PERMISSIONS));
    assert.deepEqual(
      orfaos,
      [],
      `Papel isento em PAPEIS_SEM_LINHA_GLOBAL que não existe mais no catálogo: ${orfaos.join(", ")}. ` +
        "Remova a linha: isenção órfã vira esconderijo para um papel futuro de mesmo nome.",
    );

    assert.deepEqual(
      divergencias,
      [],
      `Divergência entre o catálogo em código e os grants persistidos no papel GLOBAL:\n  ${divergencias.join("\n  ")}\n` +
        "O que vale em runtime é o BANCO. Provisione com migração de dados idempotente (padrão: " +
        "prisma/migrations/20260861000000_grant_checklist_run_reopen_permission); para RETIRAR um grant, " +
        "a migração precisa do DELETE correspondente — tirar do catálogo em código não tira do banco.",
    );
  } finally {
    await client.$disconnect();
  }
});

async function conectar() {
  const connectionString = process.env.DATABASE_URL;

  // Falha, não pula: quem ligou RBAC_DB_PARITY pediu a checagem explicitamente. Pular aqui
  // devolveria o verde-cego pela porta dos fundos, agora com a bênção de uma variável.
  assert.ok(
    connectionString,
    "RBAC_DB_PARITY=1 exige DATABASE_URL — sem banco não há paridade a verificar.",
  );

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
  ]);
  return { client: new PrismaClient({ adapter: new PrismaPg({ connectionString }) }) };
}
