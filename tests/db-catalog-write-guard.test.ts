import "dotenv/config";

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import type { PrismaClient } from "@prisma/client";

import {
  createEphemeralRole,
  createSyntheticOrphanRole,
  createUnsweptProbeRole,
  dropEphemeralRoleResilient,
  dropSyntheticOrphanRole,
  dropUnsweptProbeRole,
  withRoleCatalogLock,
} from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-01 ciclo 3, C3 — RATCHET de escrita de catálogo de cluster em `tests/**` (propriedade P3
// do R-B-O6R-01-ciclo3-premissa).
//
// O PROBLEMA: objeto de catálogo de CLUSTER (`pg_authid`, `pg_auth_members`, `pg_shdepend`…) é
// compartilhado por TODAS as suítes do processo `node --test` paralelo. Os escritores atuais se
// serializam num advisory lock único (`withRoleCatalogLock`, tests/helpers/auth-identity-fixture.ts)
// — mas o lock é um workaround que falha exatamente por quem NÃO SABE que deveria tomá-lo (fonte
// primária do PD-O6R-B01-ISOLAMENTO). Antes deste guard, NADA ficava vermelho quando uma suíte
// nova escrevia catálogo por fora: o quinto escritor do ciclo 2 entrou assim.
//
// O QUE ISTO É (sem fingir mais do que entrega): um DETECTOR ESTÁTICO com trava de contagem.
// Varre `tests/**` pelas palavras-chave de escrita em catálogo de cluster e congela, por arquivo,
// a contagem permitida. Arquivo fora da allowlist com o padrão → vermelho. Contagem diferente da
// congelada (para MAIS ou para MENOS) → vermelho — mudar exige atualização CONSCIENTE da lista,
// nunca deriva silenciosa. Isolamento REAL de catálogo é do bloco irmão (P-O6R-ARNES-ISOLAMENTO);
// P3 pede mecanismo em vez de convenção — isto é mecanismo: a CI fica vermelha sem depender da
// memória de autor nenhum.
//
// ALCANCE DECLARADO (residual lexical):
//   - os padrões são CASE-SENSITIVE em maiúsculas — a forma em que TODO SQL de catálogo deste
//     repositório está escrito. O vocabulário de domínio em minúsculas ("revoke de sessão",
//     "grant de permissão") não é escrita de catálogo e fica fora, mantendo a lista curta.
//   - TRÊS ESCAPES MEDIDOS pela junta do ciclo 3, executados, não hipotéticos:
//       (a) SQL montado por concatenação ou em minúsculas — `create role`, `"CREATE " + "ROLE"`,
//           `["GRANT","SELECT"].join(" ")` — passa VERDE;
//       (b) a varredura só enxerga `.ts`: escritor novo em `.mjs`/`.js`/`.mts` não é visto;
//       (c) a trava é de contagem TOTAL por arquivo — dentro de um arquivo já na allowlist, trocar
//           um `GRANT` por um `CREATE ROLE` preserva o total e não é detectado.
//     Logo o ratchet NÃO garante que "nenhum escritor novo entra despercebido" — ele garante que
//     nenhum escritor novo entra despercebido **pela grafia que este repositório usa hoje**, que é
//     maiúscula e literal em 100% das ocorrências medidas. A classe só fecha de verdade com o
//     isolamento por arranjo do bloco irmão (`P-O6R-ARNES-ISOLAMENTO`).
//   - DDL de ESQUEMA (CREATE/ALTER TABLE…) NÃO entra: essa classe é o P4, que saiu do bloco por
//     decisão de escopo — o guard não pode anexá-la de volta.
// -----------------------------------------------------------------------------------------------

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TESTS_ROOT = __dirname;

// Escrita em catálogo de CLUSTER, na grafia em que este repositório a escreve (maiúsculas).
const CATALOG_WRITE_PATTERNS: ReadonlyArray<RegExp> = [
  /\bCREATE\s+ROLE\b/g,
  /\bDROP\s+ROLE\b/g,
  /\bALTER\s+ROLE\b/g,
  /\bGRANT\b/g,
  /\bREVOKE\b/g,
  /\bOWNER\s+TO\b/g,
];

// ALLOWLIST CONGELADA — por arquivo e por CONTAGEM (baseline medido na implementação do ciclo 3,
// 2026-08-19, com as mesmas regexes acima). Uma linha de motivo por entrada. Toda mudança aqui é
// um ato consciente que a junta enxerga no diff.
const FROZEN_ALLOWLIST: ReadonlyMap<string, { readonly count: number; readonly reason: string }> =
  new Map([
    [
      "helpers/auth-identity-fixture.ts",
      {
        count: 30,
        reason:
          "o ARNÊS — o único mecanismo autorizado de escrita de catálogo das suítes -db; toda sequência dentro de withRoleCatalogLock. B-O6R-ARNES: 17 -> 30 (teardown resiliente dropEphemeralRoleResilient, sonda de prefixo não varrido, e a prosa que explica as duas armadilhas do Postgres)",
      },
    ],
    [
      "rls-tenant-isolation.test.ts",
      {
        count: 8,
        reason:
          "escritor DENTRO do lock (role rls_test_ via withRoleCatalogLock importado do arnês) — SAN2-4b (C3+C4): o DROP ROLE saiu daqui para o teardown resiliente do arnês e o arquivo passou a varrer órfãs antes de criar; a contagem CONTINUA 8 por coincidência de composição (o DROP ROLE que saiu do SQL reapareceu na prosa que explica a migração), medida 8 e não herdada — CREATE ROLE 2 · DROP ROLE 2 · GRANT 4",
      },
    ],
    [
      "auth-identity-link-events-db.test.ts",
      {
        count: 2,
        reason: "OWNER TO da tabela-rascunho M-1, dentro do lock do arnês (1 SQL + 1 comentário)",
      },
    ],
    [
      "audit-security.test.ts",
      {
        count: 7,
        reason:
          "escritor DENTRO do lock (audit_rls_ via withRoleCatalogLock importado do arnês) — B-O6R-ARNES fechou o P3; 5 -> 7 porque a prosa que explica a entrada cita CREATE ROLE e DROP ROLE",
      },
    ],
    [
      "impound-process-checklist-link-schema.test.ts",
      {
        count: 4,
        reason:
          "escritor DENTRO do lock (vid_link_rls_ via withRoleCatalogLock importado do arnês) — B-O6R-ARNES fechou o P3; 5 -> 4 porque o DROP ROLE saiu daqui para o teardown resiliente do arnês",
      },
    ],
    [
      "vehicle-identity-schema.test.ts",
      {
        count: 4,
        reason:
          "escritor DENTRO do lock (vid_rls_test_ via withRoleCatalogLock importado do arnês) — B-O6R-ARNES fechou o P3; 5 -> 4 porque o DROP ROLE saiu daqui para o teardown resiliente do arnês",
      },
    ],
    [
      "auth-invariant-guards.test.ts",
      {
        count: 3,
        reason: "fala SOBRE GRANT em migrações (guard 8: título + regex + mensagem) — não escreve catálogo",
      },
    ],
    [
      "auth-identity-revocation-db.test.ts",
      {
        count: 1,
        reason: "ID de decisão em comentário (D-Ω4C-SESS-REVOKE-REAL) — não é SQL",
      },
    ],
  ]);

// Este próprio arquivo carrega os padrões como literais — é o detector, não um escritor. É o
// ÚNICO excluído da varredura, por caminho exato.
const SELF = path.basename(fileURLToPath(import.meta.url));

function walkTestFiles(dir: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walkTestFiles(absolute));
    } else if (entry.name.endsWith(".ts")) {
      files.push(absolute);
    }
  }

  return files;
}

function countCatalogWrites(source: string): number {
  let total = 0;

  for (const pattern of CATALOG_WRITE_PATTERNS) {
    const matches = source.match(pattern);

    total += matches ? matches.length : 0;
  }

  return total;
}

test("ratchet de catálogo: nenhuma suíte nova escreve catálogo de cluster despercebida; contagens congeladas por arquivo", () => {
  const measured = new Map<string, number>();

  for (const absolute of walkTestFiles(TESTS_ROOT)) {
    const relative = path.relative(TESTS_ROOT, absolute).split(path.sep).join("/");

    if (relative === SELF) {
      continue;
    }

    const count = countCatalogWrites(readFileSync(absolute, "utf8"));

    if (count > 0) {
      measured.set(relative, count);
    }
  }

  const violations: string[] = [];

  for (const [file, count] of measured) {
    const frozen = FROZEN_ALLOWLIST.get(file);

    if (!frozen) {
      violations.push(
        `${file}: ${count} ocorrência(s) de escrita de catálogo FORA da allowlist — escritor novo. ` +
          "Catálogo de cluster é compartilhado por todo o lote paralelo: use o arnês " +
          "(withRoleCatalogLock em tests/helpers/auth-identity-fixture.ts) e registre o arquivo " +
          "aqui com motivo — nunca escreva catálogo por fora.",
      );
    } else if (count !== frozen.count) {
      violations.push(
        `${file}: contagem ${count} difere da congelada ${frozen.count} — mudar exige atualização ` +
          "CONSCIENTE desta allowlist (e, se for SQL novo, o lock do arnês).",
      );
    }
  }

  for (const [file, frozen] of FROZEN_ALLOWLIST) {
    if (!measured.has(file)) {
      violations.push(
        `${file}: entrada da allowlist sem ocorrência medida (arquivo removido ou limpo — ` +
          `congelada ${frozen.count}). Encolha a lista: entrada morta esconderia um regresso futuro.`,
      );
    }
  }

  assert.deepEqual(violations, [], `ratchet de catálogo reprovou:\n${violations.join("\n")}`);
});

// =================================================================================================
// B-O6R-ARNES (2026-08-28) — PROVAS -db PERMANENTES DAS PROPRIEDADES DO ARNÊS
//
// POR QUE ELAS MORAM NESTE ARQUIVO, e não num arquivo novo — nota CONSCIENTE exigida pelo C-F:
// este é o ÚNICO arquivo excluído da varredura do ratchet (`SELF`, l. do `const SELF`), porque ele
// é o DETECTOR e carrega os padrões como literais. Logo o SQL de catálogo escrito aqui embaixo NÃO
// é visto pela trava lexical — e isso está declarado por escrito, em vez de ficar como surpresa
// para quem for auditar a contagem. Em troca, todo esse SQL passa por `withRoleCatalogLock` ou
// pelos helpers do arnês, que é a propriedade que o ratchet existe para defender.
//
// GATE: `DATABASE_URL`. Sem banco, UM skip DECLARADO (entra na contabilidade do orçamento
// `SKIP_BUDGET_DB=2` do runner, que só vale COM banco presente). Com banco, os casos RODAM — não
// pulam —, e é por isso que o orçamento de 2 continua correto na forma canônica 3.
// =================================================================================================

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("provas -db do arnês de catálogo exigem DATABASE_URL e um banco migrado", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute these tests.",
  });
} else {
  const databaseUrl = connectionString;

  async function novoAdminClient(): Promise<PrismaClient> {
    const [{ PrismaPg }, { PrismaClient: Client }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
    ]);

    return new Client({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    }) as unknown as PrismaClient;
  }

  // Limpeza de teardown que NÃO pode mascarar o erro original do teste (estamos num `finally`) e
  // TAMBÉM não pode sumir em silêncio. `.catch(() => undefined)` aqui seria o anti-padrão que este
  // bloco inteiro existe para matar — e não é hipótese: durante o D43 a mutação fez o padrão de
  // nome deixar de casar, `dropSyntheticOrphanRole` lançou, um `.catch(() => undefined)` engoliu, e
  // uma role `audit_rls_*` ficou viva no cluster sem que nada dissesse. O vaza-metro a encontrou.
  async function limparOuGritar(acao: Promise<unknown>, contexto: string): Promise<void> {
    try {
      await acao;
    } catch (error) {
      process.stderr.write(
        `[b-o6r-arnes] LIMPEZA FALHOU (${contexto}): ` +
          `${error instanceof Error ? error.message : String(error)}\n`,
      );
    }
  }

  async function roleVive(client: PrismaClient, roleName: string): Promise<boolean> {
    const rows = await client.$queryRaw<Array<{ rolname: string }>>`
      SELECT rolname FROM pg_roles WHERE rolname = ${roleName}
    `;

    return rows.length > 0;
  }

  // -----------------------------------------------------------------------------------------------
  // PA — SONDA DE BARREIRA. O par medido como o produtor da classe: `DROP OWNED BY` de um lado e
  // `GRANT USAGE ON SCHEMA public` do outro, disputando a MESMA tupla de ACL (`pg_namespace.nspacl`
  // do schema `public`). Sem mecanismo, a sonda de par do ciclo 5 mediu 200/200 `XX000`. Sob o
  // mecanismo único, a meta é ZERO.
  //
  // As duas pontas usam CONEXÕES DISTINTAS — o paralelismo real do `node --test` é entre PROCESSOS,
  // e um lock em JS não o alcançaria; só o `pg_advisory_xact_lock` (lock do SERVIDOR) alcança. Duas
  // conexões é o mínimo para que a serialização provada aqui seja a mesma que roda lá.
  //
  // Cada iteração REPREPARA o terreno para que os dois statements escrevam de fato: o lado esquerdo
  // ganha o privilégio que o `DROP OWNED` vai revogar, e o direito o perde para que o `GRANT` tenha
  // o que gravar. `GRANT` de privilégio já detido é no-op e não escreveria a tupla — a sonda ficaria
  // verde por não medir nada.
  //
  // DRILL D38: remover `withRoleCatalogLock` de UM dos lados tem de fazer o `XX000` voltar. 0/N na
  // mutação = drill inconclusivo, e a propriedade volta para a mesa.
  // -----------------------------------------------------------------------------------------------
  test("(PA) sonda de barreira: DROP OWNED × GRANT na mesma tupla de ACL, sob o mecanismo único, não produz XX000", async () => {
    const ITERACOES = 50;
    const esquerda = await novoAdminClient();
    const direita = await novoAdminClient();
    const roleAlvo = await createSyntheticOrphanRole(esquerda, "o6r_b01", 0);
    const roleGrant = await createSyntheticOrphanRole(esquerda, "o6r_b01", 0);
    const falhas: string[] = [];

    try {
      for (let i = 0; i < ITERACOES; i++) {
        await withRoleCatalogLock(esquerda, async (tx) => {
          await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleAlvo}"`);
          await tx.$executeRawUnsafe(`REVOKE USAGE ON SCHEMA public FROM "${roleGrant}"`);
        });

        const resultados = await Promise.allSettled([
          withRoleCatalogLock(esquerda, async (tx) => {
            await tx.$executeRawUnsafe(`DROP OWNED BY "${roleAlvo}"`);
          }),
          withRoleCatalogLock(direita, async (tx) => {
            await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleGrant}"`);
          }),
        ]);

        for (const resultado of resultados) {
          if (resultado.status === "rejected") {
            const mensagem =
              resultado.reason instanceof Error
                ? resultado.reason.message
                : String(resultado.reason);

            // A mensagem vai INTEIRA (colapsada), nunca só a primeira linha: os erros do Prisma
            // começam com linha vazia, e cortar ali produz "iteração 7: " — uma falha ANÔNIMA, que
            // não distingue o `XX000` desta classe de um erro qualquer. Drill que fica vermelho sem
            // NOMEAR o erro não prova a propriedade que diz provar (medido no D38: 39/50 falhas
            // anônimas na primeira execução da mutação).
            falhas.push(`iteração ${i}: ${mensagem.replace(/\s+/g, " ").trim().slice(0, 240)}`);
          }
        }
      }

      const xx000 = falhas.filter((f) => f.includes("XX000"));

      assert.deepEqual(
        xx000,
        [],
        `o mecanismo único tem de eliminar o XX000 nesta sonda (N=${ITERACOES})`,
      );
      assert.deepEqual(
        falhas,
        [],
        `nenhuma falha era esperada sob o mecanismo único (N=${ITERACOES})`,
      );
    } finally {
      await limparOuGritar(
        withRoleCatalogLock(esquerda, async (tx) => {
          await tx.$executeRawUnsafe(`REVOKE USAGE ON SCHEMA public FROM "${roleGrant}"`);
        }),
        "revoke final da sonda de barreira",
      );
      await dropSyntheticOrphanRole(esquerda, roleAlvo);
      await dropSyntheticOrphanRole(esquerda, roleGrant);
      await esquerda.$disconnect();
      await direita.$disconnect();
    }
  });

  // -----------------------------------------------------------------------------------------------
  // PC — TEARDOWN RESILIENTE E RUIDOSO, com a armadilha `2BP01` exercitada de verdade.
  //
  // A injeção derruba o PRIMEIRO statement de catálogo (o `DROP OWNED BY`) UMA vez — que é o formato
  // real da falha: `XX000 tuple concurrently updated` é transitório, não permanente. O que se prova
  // aqui é a consequência ENCADEADA que o teardown antigo não tratava: sem o `DROP OWNED`, o
  // `DROP ROLE IF EXISTS` seguinte falha com `2BP01 dependent_objects_still_exist` (o `IF EXISTS`
  // suprime "role inexistente", nunca "role com dependências"). Portanto tentar cada statement uma
  // única vez, cada um no seu catch, deixaria a role VIVA e diria que tentou.
  //
  // O aceite tem DUAS metades e as duas são aferidas: (1) nenhum papel vivo ao fim; (2) as falhas
  // REPORTADAS, não engolidas. Um teardown que zera a role em silêncio reprova tanto quanto um que
  // faz barulho e deixa a role viva.
  //
  // DRILL D39: reduzir `MAX_DROP_ATTEMPTS` para 1 (ou remover a repetição da sequência) tem de
  // deixar este caso VERMELHO — a role sobrevive e `dropEphemeralRoleResilient` lança.
  // -----------------------------------------------------------------------------------------------
  test("(PC) teardown resiliente: falha injetada no 1º statement não deixa papel vivo E reporta as falhas", async () => {
    const MARCADOR = "falha-injetada-b-o6r-arnes";
    const adminClient = await novoAdminClient();
    const efemera = await createEphemeralRole(adminClient, databaseUrl);

    try {
      assert.ok(
        await roleVive(adminClient, efemera.roleName),
        "arranjo: a role efêmera tem de existir antes do teardown",
      );

      await efemera.client.$disconnect();

      // Duplo de teste que derruba a PRIMEIRA aquisição de lock e delega todas as outras. Só os dois
      // membros que `dropEphemeralRoleResilient` usa são delegados — nada de Proxy sobre o cliente
      // do Prisma, cujos internos não são contrato público.
      let jaInjetou = false;
      const adminComFalha = {
        $queryRaw: (...args: unknown[]) =>
          (adminClient as unknown as Record<string, (...a: unknown[]) => unknown>).$queryRaw(
            ...args,
          ),
        $transaction: (...args: unknown[]) => {
          if (!jaInjetou) {
            jaInjetou = true;

            return Promise.reject(new Error(MARCADOR));
          }

          return (
            adminClient as unknown as Record<string, (...a: unknown[]) => unknown>
          ).$transaction(...args);
        },
      } as unknown as PrismaClient;

      const relatorio = await dropEphemeralRoleResilient(adminComFalha, efemera.roleName);

      assert.equal(
        await roleVive(adminClient, efemera.roleName),
        false,
        "METADE 1 do aceite: nenhum papel vivo ao fim, mesmo com o 1º statement falhando",
      );
      assert.ok(
        relatorio.failures.length >= 1,
        "METADE 2 do aceite: a falha tem de ser REPORTADA — teardown silencioso reprova",
      );
      assert.ok(
        relatorio.failures.some((f) => f.message.includes(MARCADOR)),
        `a falha injetada tem de aparecer no relatório: ${JSON.stringify(relatorio.failures)}`,
      );
      assert.equal(
        relatorio.attempts,
        2,
        "a sequência INTEIRA tem de ser repetida — é o que vence a armadilha 2BP01",
      );
      assert.ok(
        relatorio.failures.some((f) => f.statement.includes("DROP OWNED BY")),
        "a falha do 1º statement tem de estar nomeada pelo statement",
      );
    } finally {
      await limparOuGritar(
        dropEphemeralRoleResilient(adminClient, efemera.roleName),
        `drop de garantia da role ${efemera.roleName}`,
      );
      await adminClient.$disconnect();
    }
  });

  // -----------------------------------------------------------------------------------------------
  // PD — SWEEP POR FAMÍLIA. As TRÊS famílias que entraram com os seus escritores (`audit_rls_`,
  // `vid_rls_test_`, `vid_link_rls_`) passam a ser varridas com o MESMO corte de 60 min das duas
  // antigas. Sem isto, serializar a criação e deixar o resíduo sem varredor seria meia correção: as
  // órfãs medidas na canônica 3 eram justamente `audit_rls_*`, com LOGIN e DML em 115 tabelas.
  //
  // SAN2-4b, C3: entra a QUARTA — `rls_test_`, a família do `rls-tenant-isolation.test.ts`, que era
  // a última tratada de forma assimétrica (fora da lista E com um varredor que o seu criador nunca
  // chamava). Ela é a família cuja órfã o SAN2-4a produziu 5/5 matando o processo na janela, com
  // LOGIN e 460 grants. A lista deste laço é a mesma coisa que a `SWEPT_ROLE_FAMILIES`: se alguém
  // remover a família do arnês sem mexer aqui, este caso fica VERMELHO.
  //
  // ARMADILHA DE NOMENCLATURA exercitada por construção (M3-O-4): `rls_test` e `vid_rls_test` estão
  // as DUAS no laço. Se a varredura fosse por SUBSTRING em vez de prefixo ancorado, `rls_test_%`
  // varreria as `vid_rls_test_*` — e a contraprova de sobrevivência do caso seguinte cairia. É por
  // isso que as duas convivem aqui em vez de o teste escolher uma.
  //
  // DRILL D43 tem as duas metades: esta (recolhe o que deve) e a seguinte (não toca no que não deve).
  // -----------------------------------------------------------------------------------------------
  test("(PD) sweep: órfã VELHA de cada família nova é recolhida pela próxima criação de role", async () => {
    const adminClient = await novoAdminClient();
    const DUAS_HORAS = 2 * 60 * 60 * 1000;
    const orfas: string[] = [];

    try {
      for (const familia of ["audit_rls", "vid_rls_test", "vid_link_rls", "rls_test"] as const) {
        orfas.push(await createSyntheticOrphanRole(adminClient, familia, DUAS_HORAS));
      }

      for (const orfa of orfas) {
        assert.ok(await roleVive(adminClient, orfa), `arranjo: ${orfa} tem de existir antes do sweep`);
      }

      // O sweep roda dentro de `createEphemeralRole` — é assim que ele roda na suíte de verdade.
      const varredor = await createEphemeralRole(adminClient, databaseUrl);

      try {
        for (const orfa of orfas) {
          assert.equal(
            await roleVive(adminClient, orfa),
            false,
            `a família de ${orfa} entrou no varredor: órfã além do corte de 60 min tem de ser recolhida`,
          );
        }
      } finally {
        await varredor.drop();
      }
    } finally {
      for (const orfa of orfas) {
        await limparOuGritar(
          dropSyntheticOrphanRole(adminClient, orfa),
          `drop da órfã sintética ${orfa}`,
        );
      }

      await adminClient.$disconnect();
    }
  });

  // -----------------------------------------------------------------------------------------------
  // PD (contraprova) — O CONTROLE ANTI-MASS-DELETE. Este caso existe porque a diferença entre
  // teardown e acidente é exatamente esta: um varredor que recolhe "o que parece lixo" é o incidente
  // de 26/07 esperando repetir. Duas roles têm de sobreviver ao sweep:
  //   (a) prefixo NÃO REGISTRADO (`zzz_probe_`), por mais velho que pareça — varredura é por lista
  //       explícita, jamais por heurística;
  //   (b) família REGISTRADA com timestamp NOVO — o corte de idade protege a execução corrente, que
  //       é o que impede o varredor de matar as roles dos processos irmãos rodando em paralelo.
  //
  // SAN2-4b, C3: o controle (b) passa a valer TAMBÉM para a `rls_test_` recém-registrada. É a
  // resposta executada ao receio que manteve a família fora do varredor por dois blocos — o
  // incidente de mass-delete de 26/07: a família entra, mas o corte de idade continua sendo o que
  // separa "recolho o meu lixo velho" de "apago o que estiver na frente". `rls_test_` com timestamp
  // NOVO tem de sobreviver ao sweep, como qualquer irmã.
  // -----------------------------------------------------------------------------------------------
  test("(PD) sweep: prefixo não registrado e família registrada com timestamp NOVO ficam intocados", async () => {
    const adminClient = await novoAdminClient();
    const sonda = await createUnsweptProbeRole(adminClient);
    const recente = await createSyntheticOrphanRole(adminClient, "audit_rls", 0);
    const recenteRlsTest = await createSyntheticOrphanRole(adminClient, "rls_test", 0);

    try {
      const varredor = await createEphemeralRole(adminClient, databaseUrl);

      try {
        assert.equal(
          await roleVive(adminClient, sonda),
          true,
          "prefixo NÃO registrado é intocável — o varredor não adivinha de quem é o lixo",
        );
        assert.equal(
          await roleVive(adminClient, recente),
          true,
          "família registrada com timestamp NOVO sobrevive: o corte de 60 min protege a execução corrente",
        );
        assert.equal(
          await roleVive(adminClient, recenteRlsTest),
          true,
          "rls_test_ com timestamp NOVO sobrevive: registrar a família não pode matar a role da " +
            "execução corrente — é o corte de idade que separa teardown de mass-delete",
        );
      } finally {
        await varredor.drop();
      }
    } finally {
      await limparOuGritar(dropUnsweptProbeRole(adminClient, sonda), `drop da sonda ${sonda}`);
      await limparOuGritar(
        dropSyntheticOrphanRole(adminClient, recente),
        `drop da role recente ${recente}`,
      );
      await limparOuGritar(
        dropSyntheticOrphanRole(adminClient, recenteRlsTest),
        `drop da role recente ${recenteRlsTest}`,
      );
      await adminClient.$disconnect();
    }
  });
}
