// B-SAN3-18 (F5, P6 do plano v2; P1(a) do dono, `D-DONO-TODAS-RECOMENDACOES-1111`) — provisionamento ADITIVO dos
// módulos das organizações que já existem, para que NINGUÉM perca acesso no dia em que o gate de módulo ligar.
//
// O que faz, numa transação ÚNICA:
//   1. lê toda organização (`tenants`, tabela global sem RLS) com `FOR UPDATE`;
//   2. acrescenta a cada uma TODA chave que o gate ou o menu cobram (`ALL_MODULE_CLASSES`) e a chave canônica de cada
//      apelido presente (`work-orders` → `work_orders`, `checklists` → `tenant_checklist`, N3 do plano). Só ACRESCENTA:
//      nenhuma chave que a organização tem some, nem os apelidos;
//   3. relê e confere: sobrou organização sem alguma chave de `ALL_MODULE_CLASSES` → desfaz a transação inteira e sai
//      com código 1.
// E, à parte (relatório, sem escrita), conta as assinaturas vigentes cuja versão de plano (mais os adicionais) NÃO tem
// todas as chaves: atribuir ou sincronizar um plano SUBSTITUI a lista da organização (`tenant-modules.prisma.ts`), e
// essas organizações perderiam áreas na próxima sincronização (R-A13). As assinaturas têm RLS com FORCE: a leitura é
// organização por organização, com o GUC, pelo MESMO caminho de `listActiveSubscriptions` (R2-09) — nunca como
// superusuário ou BYPASSRLS. Rodado com um papel sem acesso, o 0 seria silencioso; por isso o teste
// `tests/san3-18-provision-modules-db.test.ts` prova o caso com 1 sob papel NOSUPERUSER NOBYPASSRLS.
//
// Uso (DATABASE_URL do papel de runtime):
//   npx tsx scripts/san3-18-provisionar-modulos.ts             → SIMULAÇÃO (padrão): conta, não escreve
//   npx tsx scripts/san3-18-provisionar-modulos.ts --aplicar   → escreve, na transação única
// Roteiro de operação: rodar ANTES do deploy do gate. Depois disso, módulos só mudam pela assinatura (versão do plano
// mais adicionais) ou por este script; revisar as versões de plano listadas antes de qualquer sincronização.
import "dotenv/config";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { PrismaClient } from "@prisma/client";

import { ALL_MODULE_CLASSES } from "../src/modules/navigation/route-modules.js";
import { MODULE_KEY_ALIASES, normalizeModuleKeys } from "../src/modules/platform/platform-modules.service.js";
import { resolveVersionAt } from "../src/modules/subscription-billing/plans/plan-versioning.js";
import { PrismaPlansRepository } from "../src/modules/subscription-billing/plans/plans-prisma.repository.js";
import { PrismaSubscriptionsRepository } from "../src/modules/subscription-billing/plans/subscriptions-prisma.repository.js";

const keysToAdd = [...ALL_MODULE_CLASSES];

export type ProvisionamentoOpcoes = {
  readonly aplicar: boolean;
  readonly agora?: Date;
  // Costura de teste: as chaves a acrescentar. O padrão é `keysToAdd`; a conferência final é SEMPRE contra
  // `ALL_MODULE_CLASSES`, então acrescentar menos deixa organização incompleta e o script falha.
  readonly chavesAcrescentadas?: readonly string[];
  // Costura de teste: restringe a varredura a estas organizações, para a suíte `-db` não tocar as organizações das
  // suítes irmãs que rodam em paralelo no mesmo banco. A linha de comando nunca a usa: lá vale TODA organização.
  readonly somenteOrganizacoes?: readonly string[];
};

export type ProvisionamentoRelatorio = {
  readonly linhas: readonly string[];
  readonly codigoDeSaida: number;
  readonly organizacoes: number;
  readonly incompletasAntes: number;
  readonly aAlterar: number;
  readonly alteradas: number;
  readonly incompletasDepois: number;
  readonly assinaturasComVersaoSemChaves: number;
};

class OrganizacaoIncompleta extends Error {
  constructor(readonly quantidade: number) {
    super(`${quantidade} organização(ões) sem todas as chaves depois do provisionamento`);
  }
}

function faltantes(modules: readonly string[]): string[] {
  const canonicas = new Set(normalizeModuleKeys(modules));
  return ALL_MODULE_CLASSES.filter((chave) => !canonicas.has(chave));
}

function provisionadas(atual: readonly string[], acrescentar: readonly string[]): string[] {
  const canonicasDosApelidos = atual.map((chave) => MODULE_KEY_ALIASES[chave.trim()]).filter((chave): chave is string => Boolean(chave));
  const final = [...new Set([...atual, ...canonicasDosApelidos, ...acrescentar])];
  return final;
}

async function contarAssinaturasSemChaves(client: PrismaClient, agora: Date, somente?: readonly string[]): Promise<number> {
  const assinaturas = new PrismaSubscriptionsRepository(client);
  const planos = new PrismaPlansRepository(client);
  let semChaves = 0;
  for (const assinatura of await assinaturas.listActiveSubscriptions()) {
    if (somente && !somente.includes(assinatura.tenantId)) continue;
    const versao = resolveVersionAt(await planos.listVersions(assinatura.planId), agora);
    const modulos = [...(versao?.modules ?? [])];
    for (const adicional of await assinaturas.listActiveAddons(assinatura.tenantId, assinatura.id)) {
      const versaoAdicional = resolveVersionAt(await planos.listVersions(adicional.planId), agora);
      modulos.push(...(versaoAdicional?.modules ?? []));
    }
    if (faltantes(modulos).length > 0) semChaves += 1;
  }
  return semChaves;
}

export async function provisionarModulos(client: PrismaClient, opcoes: ProvisionamentoOpcoes): Promise<ProvisionamentoRelatorio> {
  const acrescentar = opcoes.chavesAcrescentadas ?? keysToAdd;
  const agora = opcoes.agora ?? new Date();
  const escopo = opcoes.somenteOrganizacoes ? [...opcoes.somenteOrganizacoes] : undefined;
  let resultado: Omit<ProvisionamentoRelatorio, "linhas" | "codigoDeSaida" | "assinaturasComVersaoSemChaves"> | undefined;
  let codigoDeSaida = 0;
  try {
    resultado = await client.$transaction(async (tx) => {
      const antes = await tx.$queryRawUnsafe<Array<{ id: string; modules: string[] }>>(
        `SELECT id::text AS id, modules FROM tenants${escopo ? " WHERE id = ANY($1::uuid[])" : ""} ORDER BY id FOR UPDATE`,
        ...(escopo ? [escopo] : []),
      );
      const incompletasAntes = antes.filter((org) => faltantes(org.modules).length > 0).length;
      const mudancas = antes
        .map((org) => ({ id: org.id, atual: org.modules, novo: provisionadas(org.modules, acrescentar) }))
        .filter((org) => org.novo.length !== org.atual.length || org.novo.some((chave, i) => chave !== org.atual[i]));
      if (!opcoes.aplicar) {
        const projetadas = antes.map((org) => provisionadas(org.modules, acrescentar));
        return {
          organizacoes: antes.length,
          incompletasAntes,
          aAlterar: mudancas.length,
          alteradas: 0,
          incompletasDepois: projetadas.filter((modules) => faltantes(modules).length > 0).length,
        };
      }
      let alteradas = 0;
      for (const org of mudancas) {
        alteradas += await tx.$executeRawUnsafe("UPDATE tenants SET modules = $1::text[] WHERE id = $2::uuid", org.novo, org.id);
      }
      const depois = await tx.$queryRawUnsafe<Array<{ id: string; modules: string[] }>>(
        `SELECT id::text AS id, modules FROM tenants${escopo ? " WHERE id = ANY($1::uuid[])" : ""} ORDER BY id`,
        ...(escopo ? [escopo] : []),
      );
      const incompletasDepois = depois.filter((org) => faltantes(org.modules).length > 0).length;
      if (incompletasDepois > 0) throw new OrganizacaoIncompleta(incompletasDepois);
      return { organizacoes: antes.length, incompletasAntes, aAlterar: mudancas.length, alteradas, incompletasDepois };
    });
  } catch (erro) {
    if (!(erro instanceof OrganizacaoIncompleta)) throw erro;
    codigoDeSaida = 1;
    resultado = { organizacoes: -1, incompletasAntes: -1, aAlterar: -1, alteradas: 0, incompletasDepois: erro.quantidade };
  }
  if (resultado.incompletasDepois > 0) codigoDeSaida = 1;
  const assinaturasComVersaoSemChaves = await contarAssinaturasSemChaves(client, agora, escopo);
  const linhas = [
    `modo=${opcoes.aplicar ? "aplicar" : "simulacao"}`,
    `chaves_exigidas=${ALL_MODULE_CLASSES.length}`,
    `organizacoes=${resultado.organizacoes}`,
    `incompletas_antes=${resultado.incompletasAntes}`,
    `a_alterar=${resultado.aAlterar}`,
    `alteradas=${resultado.alteradas}`,
    `incompletas_depois=${resultado.incompletasDepois}`,
  ];
  linhas.push(`assinaturas_com_versao_sem_chaves=${assinaturasComVersaoSemChaves}`);
  if (codigoDeSaida !== 0) linhas.push("FALHOU: sobrou organização sem todas as chaves; a transação foi desfeita e nada foi gravado.");
  return { ...resultado, assinaturasComVersaoSemChaves, linhas, codigoDeSaida };
}

async function main(): Promise<void> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL é obrigatório.");
    process.exit(2);
  }
  const aplicar = process.argv.includes("--aplicar");
  const client = createPrismaClient(connectionString);
  try {
    const relatorio = await provisionarModulos(client, { aplicar });
    console.log(relatorio.linhas.join("\n"));
    process.exitCode = relatorio.codigoDeSaida;
  } finally {
    await client.$disconnect();
  }
}

const chamadoDireto = Boolean(process.argv[1]) && /san3-18-provisionar-modulos\.ts$/i.test(process.argv[1]);
if (chamadoDireto) {
  main().catch((erro) => {
    console.error(erro instanceof Error ? erro.message : erro);
    process.exit(1);
  });
}
