import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  DEFAULT_ROLES,
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  type Permission,
  type Role,
} from "../src/modules/core-saas/permissions/catalog.js";

// PROVISIONAMENTO DE RBAC — CONVERGENTE, ADITIVO e IDEMPOTENTE (achado B1/ALTA do dba-guardiao na
// junta do CHECKLIST P1 PR-03).
//
// O FURO QUE ESTE SCRIPT FECHA: em `CORE_SAAS_PERSISTENCE=prisma` (o modo real) o gate das rotas
// resolve permissão da tabela `role_permissions`, não do catálogo em código. E o catálogo só chegava
// ao banco por `prisma/seed.ts` — que produção NUNCA roda (o CD tem só `prisma migrate deploy`,
// "SEM db:seed", e a guarda `assertSeedAllowed` barra o resto). As migrações de dados de RBAC
// (20260861000000, 20260862000000) fazem `INSERT ... SELECT FROM roles WHERE r.key IN (...)`:
// numa base NOVA, com `roles` VAZIA, o SELECT casa ZERO linhas, o INSERT "aplica" com sucesso, a
// migração é gravada em `_prisma_migrations` e NUNCA MAIS roda. Quando os papéis finalmente
// nascerem, `checklist_runs:reopen` continuará sem concessão e o técnico de campo continuará sem
// checklist — o bug ressuscitado, em silêncio. Migração de dados é tiro único; este script converge
// SEMPRE, porque roda em todo deploy e reconcilia o estado com o catálogo.
//
// O QUE ELE FAZ: cria o que falta em `permissions`, `roles` (papéis de sistema, tenant_id NULL) e
// `role_permissions`, a partir do catálogo em código.
//
// O QUE ELE NÃO FAZ, DE PROPÓSITO:
//  · não cria organização, usuário, credencial nem qualquer dado de demonstração (por isso ele NÃO
//    reusa `prisma/seed.ts`, que semeia a organização "demo" + admins com senha — inadequado para
//    produção; ver docs/deployment.md, Runbook B / P-SAN-PROD-BOOTSTRAP);
//  · não APAGA nem reescreve concessão existente — divergência (concessão no banco que o catálogo
//    não declara) é RELATADA, nunca removida: revogar às cegas em produção derrubaria acesso
//    concedido de propósito fora do catálogo, e revogação é ato deliberado, não efeito colateral
//    de deploy;
//  · não renomeia papel existente nem reescreve descrição de permissão existente (ver DESCRIÇÕES).
//
// DESCRIÇÕES (degradação declarada — D-007): o texto curado de cada permissão vive hoje no mapa
// `permissionDescriptions` de `prisma/seed.ts`, que não é importável daqui (importar o seed
// EXECUTA o seed demo). Permissão criada por este script nasce com a MESMA descrição genérica que o
// próprio seed usa como fallback (`Permissão <chave>.`) e é contada no relatório. Descrição é texto
// interno (nenhuma rota do backend lê `permissions.description`), então o RBAC efetivo não degrada.
// Unificar o mapa num módulo compartilhado é a pendência P-RBAC-PROVISION-DESCRICOES.
//
// USO:
//   npm run db:provision-rbac              # aplica (aditivo, idempotente)
//   npm run db:provision-rbac -- --dry-run # só relata o que faria; não escreve nada

// `platform_admin` fica FORA do provisionamento inteiro (criação, concessões e reconferência): é
// pseudo-papel do plano de controle, resolvido pelos claims do JWT (`allowPlatformControlPlaneContext`),
// e NUNCA teve linha em banco — o comentário do guard de paridade depende disso. Criá-la mudaria o
// contrato: `findByKeyForTenant` resolve papel global para QUALQUER organização, então a linha tornaria
// `platform_admin` (catálogo INTEIRO, família `platform:*` inclusa) atribuível por um tenant_admin
// comum via POST /users.
const PAPEIS_PROVISIONADOS = DEFAULT_ROLES.filter((chave) => chave !== "platform_admin");

const APPLY_MODE = !process.argv.includes("--dry-run");

// Serializa duas execuções concorrentes do provisionamento. NECESSÁRIO porque o UNIQUE (key,
// tenant_id) de `roles` NÃO protege papel de sistema: no PostgreSQL dois NULL são distintos, então
// duas execuções simultâneas criariam DOIS papéis "manager" globais e o RBAC ficaria dependendo de
// qual linha o login encontrasse primeiro. A idempotência dos papéis vem deste lock + do diff
// lido dentro da mesma transação, não da constraint.
const PROVISION_ADVISORY_LOCK = 20260863n;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL é obrigatório para provisionar o RBAC.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// "Faltando" = o diff medido ANTES de escrever. Em modo aplicar é o que foi criado; em --dry-run é
// o que seria criado. Um único número, para a simulação e a execução nunca contarem coisas diferentes.
type Relatorio = {
  readonly banco: string;
  readonly permissoesFaltando: readonly string[];
  readonly papeisFaltando: readonly string[];
  readonly concessoesFaltando: number;
  readonly concessoesJaExistentes: number;
  readonly concessoesForaDoCatalogo: readonly string[];
  readonly permissoesForaDoCatalogo: readonly string[];
};

function log(mensagem: string): void {
  // eslint-disable-next-line no-console
  console.log(`[provisionamento RBAC] ${mensagem}`);
}

function chaveDaConcessao(roleId: string, permissionId: string): string {
  return `${roleId}::${permissionId}`;
}

// Lista amostrada: num banco NOVO isto seriam ~200 chaves numa linha só, e log de deploy ilegível é
// log que ninguém lê. A contagem (essa sim, completa) vem sempre antes da amostra.
function amostra(itens: readonly string[], limite = 10): string {
  if (itens.length <= limite) return itens.join(", ");
  return `${itens.slice(0, limite).join(", ")} … (+${itens.length - limite})`;
}

// Nome é rótulo cosmético do papel; só é escrito na CRIAÇÃO (renomear papel existente seria
// sobrescrever ajuste feito pela organização — este script é aditivo).
function nomeDoPapel(role: string): string {
  return role
    .split("_")
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(" ");
}

async function provisionar(): Promise<Relatorio> {
  const [{ db }] = await prisma.$queryRaw<Array<{ db: string }>>`SELECT current_database() AS db`;

  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${PROVISION_ADVISORY_LOCK}::bigint)`;

      // ---- 1) Permissões ----------------------------------------------------------------
      const permissoesNoBanco = await tx.permission.findMany({ select: { id: true, key: true } });
      const idPorPermissao = new Map(permissoesNoBanco.map((permissao) => [permissao.key, permissao.id]));
      const permissoesFaltando = PERMISSION_CATALOG.filter((chave) => !idPorPermissao.has(chave));

      if (APPLY_MODE && permissoesFaltando.length > 0) {
        await tx.permission.createMany({
          data: permissoesFaltando.map((chave) => ({ key: chave, description: `Permissão ${chave}.` })),
          skipDuplicates: true,
        });

        const recemCriadas = await tx.permission.findMany({
          where: { key: { in: [...permissoesFaltando] } },
          select: { id: true, key: true },
        });
        for (const permissao of recemCriadas) idPorPermissao.set(permissao.key, permissao.id);
      }

      // ---- 2) Papéis de sistema (tenant_id NULL) ----------------------------------------
      // Papéis PRÓPRIOS de uma organização (tenant_id preenchido) ficam de fora: são dela, não do
      // catálogo. O filtro `tenant_id: null` é o que impede este script de mexer no que é do cliente.
      const papeisNoBanco = await tx.role.findMany({ where: { tenant_id: null }, select: { id: true, key: true } });
      const idPorPapel = new Map(papeisNoBanco.map((papel) => [papel.key, papel.id]));
      // DEFAULT_ROLES (e não STANDARD_ROLES): `field_technician`, `operator` e `auditor` são
      // "legacy" no catálogo mas são papéis VIVOS com concessões declaradas — foi justamente a
      // ausência de `field_technician` que deixou o técnico de campo sem checklist nenhum. Regra
      // única, sem escolher a dedo: o banco reflete o catálogo.
      const papeisFaltando = PAPEIS_PROVISIONADOS.filter((chave) => !idPorPapel.has(chave));

      if (APPLY_MODE && papeisFaltando.length > 0) {
        await tx.role.createMany({
          data: papeisFaltando.map((chave) => ({ key: chave, name: nomeDoPapel(chave), scope: "system" })),
          skipDuplicates: true,
        });

        const recemCriados = await tx.role.findMany({
          where: { tenant_id: null, key: { in: [...papeisFaltando] } },
          select: { id: true, key: true },
        });
        for (const papel of recemCriados) idPorPapel.set(papel.key, papel.id);
      }

      // ---- 3) Concessões (role_permissions) ---------------------------------------------
      const idsDosPapeis = [...idPorPapel.values()];
      const concessoesNoBanco =
        idsDosPapeis.length > 0
          ? await tx.rolePermission.findMany({
              where: { role_id: { in: idsDosPapeis } },
              select: { role_id: true, permission_id: true },
            })
          : [];
      const concessoesExistentes = new Set(
        concessoesNoBanco.map((concessao) => chaveDaConcessao(concessao.role_id, concessao.permission_id)),
      );

      const concessoesFaltando: Array<{ role_id: string; permission_id: string }> = [];
      const pendentes: string[] = [];

      for (const papel of PAPEIS_PROVISIONADOS) {
        const papelId = idPorPapel.get(papel);

        for (const permissao of ROLE_PERMISSIONS[papel as Role] as readonly Permission[]) {
          const permissaoId = idPorPermissao.get(permissao);

          if (!papelId || !permissaoId) {
            // Só acontece em --dry-run (papel/permissão ainda não criados) — registra a intenção.
            pendentes.push(`${papel} → ${permissao}`);
            continue;
          }

          if (concessoesExistentes.has(chaveDaConcessao(papelId, permissaoId))) continue;
          concessoesFaltando.push({ role_id: papelId, permission_id: permissaoId });
          pendentes.push(`${papel} → ${permissao}`);
        }
      }

      if (APPLY_MODE && concessoesFaltando.length > 0) {
        // UNIQUE (role_id, permission_id) é real aqui (sem NULL), então `skipDuplicates` de fato
        // protege: rodar duas vezes não duplica linha nenhuma.
        await tx.rolePermission.createMany({ data: concessoesFaltando, skipDuplicates: true });
      }

      // ---- 4) Divergências: relatadas, JAMAIS removidas ---------------------------------
      const chavePorId = new Map([...idPorPapel].map(([chave, id]) => [id, chave]));
      const permissaoPorId = new Map([...idPorPermissao].map(([chave, id]) => [id, chave]));
      const declaradas = new Set<string>();
      for (const papel of PAPEIS_PROVISIONADOS) {
        for (const permissao of ROLE_PERMISSIONS[papel as Role] as readonly Permission[]) {
          declaradas.add(`${papel} → ${permissao}`);
        }
      }

      const concessoesForaDoCatalogo = concessoesNoBanco
        .map((concessao) => {
          const papel = chavePorId.get(concessao.role_id);
          const permissao = permissaoPorId.get(concessao.permission_id);
          return papel && permissao ? `${papel} → ${permissao}` : null;
        })
        .filter((item): item is string => item !== null && !declaradas.has(item));

      const catalogo = new Set<string>(PERMISSION_CATALOG);
      const permissoesForaDoCatalogo = [...idPorPermissao.keys()].filter((chave) => !catalogo.has(chave));

      // Em --dry-run os números são os MESMOS (o que falta), só o verbo do relatório muda: zerar a
      // contagem porque "não escreveu" faria a simulação anunciar um banco convergido que não está.
      return {
        banco: db,
        permissoesFaltando,
        papeisFaltando,
        // `pendentes` conta o que falta nos DOIS modos: em --dry-run papel/permissão ainda não
        // existem, então a concessão não tem ids para virar linha, mas continua faltando.
        concessoesFaltando: pendentes.length,
        concessoesJaExistentes: concessoesNoBanco.length,
        concessoesForaDoCatalogo,
        permissoesForaDoCatalogo,
      } satisfies Relatorio;
    },
    { timeout: 120_000, maxWait: 30_000 },
  );
}

// Reconferência DEPOIS do commit: lê o banco de novo e prova que o catálogo inteiro está
// persistido. O que ela pega é DIVERGÊNCIA DE CONVERGÊNCIA — um filtro errado no laço de escrita, um
// papel que ficou de fora, uma concessão que a lógica deixou de gerar (se a transação tivesse
// abortado, o erro já teria subido antes daqui). É detector, não rede: quando ela falha, o que foi
// gravado FICA gravado — o estado é aditivo e a saída do operador é re-rodar `npm run
// db:provision-rbac` depois de corrigir a causa (não existe rollback, e não é preciso).
async function conferirConvergencia(): Promise<readonly string[]> {
  const linhas = await prisma.$queryRaw<Array<{ role: string; permission: string }>>`
    SELECT r.key AS role, p.key AS permission
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id AND r.tenant_id IS NULL
      JOIN permissions p ON p.id = rp.permission_id
  `;

  const persistidas = new Set(linhas.map((linha) => `${linha.role} → ${linha.permission}`));
  const ausentes: string[] = [];

  for (const papel of PAPEIS_PROVISIONADOS) {
    for (const permissao of ROLE_PERMISSIONS[papel as Role] as readonly Permission[]) {
      if (!persistidas.has(`${papel} → ${permissao}`)) ausentes.push(`${papel} → ${permissao}`);
    }
  }

  return ausentes;
}

async function main(): Promise<void> {
  const relatorio = await provisionar();

  const verbo = APPLY_MODE ? "criada(s)" : "a criar";

  log(`banco: ${relatorio.banco} · modo: ${APPLY_MODE ? "aplicar" : "simulação (--dry-run)"}`);
  log(
    `permissões: ${PERMISSION_CATALOG.length} no catálogo · ${relatorio.permissoesFaltando.length} ${verbo}` +
      `${relatorio.permissoesFaltando.length > 0 ? ` com descrição genérica (o texto curado vive em prisma/seed.ts — P-RBAC-PROVISION-DESCRICOES): ${amostra(relatorio.permissoesFaltando)}` : ""}`,
  );
  log(
    `papéis do sistema: ${PAPEIS_PROVISIONADOS.length} provisionáveis (platform_admin fica fora por contrato) · ${relatorio.papeisFaltando.length} ` +
      `${APPLY_MODE ? "criado(s)" : "a criar"}` +
      `${relatorio.papeisFaltando.length > 0 ? `: ${amostra(relatorio.papeisFaltando, 15)}` : ""}`,
  );
  log(`concessões: ${relatorio.concessoesFaltando} ${verbo} · ${relatorio.concessoesJaExistentes} já existiam`);

  if (relatorio.concessoesForaDoCatalogo.length > 0) {
    // Não é erro: pode ser concessão deliberada fora do catálogo. É informação para auditoria.
    log(
      `divergência (NÃO removida, apenas relatada): ${relatorio.concessoesForaDoCatalogo.length} concessão(ões) ` +
        `no banco que o catálogo não declara — ${amostra(relatorio.concessoesForaDoCatalogo)}`,
    );
  }

  if (relatorio.permissoesForaDoCatalogo.length > 0) {
    log(
      `divergência (NÃO removida): ${relatorio.permissoesForaDoCatalogo.length} permissão(ões) no banco fora do ` +
        `catálogo — ${amostra(relatorio.permissoesForaDoCatalogo)}`,
    );
  }

  if (!APPLY_MODE) {
    log("simulação encerrada — nada foi escrito no banco.");
    return;
  }

  const ausentes = await conferirConvergencia();

  if (ausentes.length > 0) {
    throw new Error(
      `Provisionamento NÃO convergiu: ${ausentes.length} concessão(ões) do catálogo continuam ausentes no banco ` +
        `(ex.: ${ausentes.slice(0, 5).join(", ")}). O gate das rotas lê o BANCO — publicar assim deixaria rota ` +
        "protegida respondendo 403 para todos os papéis.",
    );
  }

  log("CONVERGIDO — banco reflete o catálogo. Nenhum dado de demonstração foi criado.");
}

main()
  .catch((erro: unknown) => {
    // eslint-disable-next-line no-console
    console.error("[provisionamento RBAC] FALHOU:", erro instanceof Error ? erro.message : erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
