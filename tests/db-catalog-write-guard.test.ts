import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

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
        count: 17,
        reason:
          "o ARNÊS — o único mecanismo autorizado de escrita de catálogo das suítes -db; toda sequência dentro de withRoleCatalogLock",
      },
    ],
    [
      "rls-tenant-isolation.test.ts",
      {
        count: 8,
        reason: "escritor DENTRO do lock (role rls_test_ via withRoleCatalogLock importado do arnês)",
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
        count: 5,
        reason:
          "escritor PRÉ-EXISTENTE fora do lock (audit_rls_) — anterior ao bloco; destino: P-O6R-ARNES-ISOLAMENTO",
      },
    ],
    [
      "impound-process-checklist-link-schema.test.ts",
      {
        count: 5,
        reason:
          "escritor PRÉ-EXISTENTE fora do lock (vid_link_rls_) — anterior ao bloco; destino: P-O6R-ARNES-ISOLAMENTO",
      },
    ],
    [
      "vehicle-identity-schema.test.ts",
      {
        count: 5,
        reason:
          "escritor PRÉ-EXISTENTE fora do lock (vid_rls_test_) — anterior ao bloco; destino: P-O6R-ARNES-ISOLAMENTO",
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
