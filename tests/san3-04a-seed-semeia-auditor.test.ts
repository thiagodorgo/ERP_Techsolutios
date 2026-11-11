import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { DEFAULT_ROLES } from "../src/modules/core-saas/permissions/catalog.js";

// B-SAN3-04a — T4 (item 14, `P-033`) e B-SAN3-07 (item 47, `P-SAN3-04A-SEED-PAPEIS-LEGADOS`): o `prisma/seed.ts`
// semeia os papéis de sistema do catálogo com a MESMA regra do provisionamento de produção.
//
// O B-SAN3-04a trouxe o `auditor` para o seed: uma base preparada como a CI (`migrate deploy` + `db:seed`, sem
// `db:provision-rbac`) não tinha a linha global dele, e o gate das rotas lê o BANCO em `CORE_SAAS_PERSISTENCE=prisma`.
// O B-SAN3-07 fecha o resto: `operator`, `finance`, `inventory`, `field_technician` e `support` também ficavam sem linha
// global nessa base. Agora o seed semeia `DEFAULT_ROLES` menos `platform_admin`, que é exatamente o que
// `scripts/provision-rbac.ts` cria em produção. A lista é DERIVADA do catálogo, e não escrita à mão, para um papel novo
// não voltar a ficar fora do seed.
//
// Limite declarado (D-007): este teste é TEXTUAL, um aviso rápido no job `backend` (sem banco). Ele prova que as duas
// constantes têm a mesma exclusão e que o laço consome a do seed. O dono da prova é o teste de banco
// `tests/permission-catalog-db-parity.test.ts` (job `backend-postgres`, depois de `db:seed`), que exige os 12 papéis
// globais com as concessões do catálogo, nenhum `platform_admin` e o nome de negócio da organização demonstração.
//
// Vermelho-controle no head-base (`07898adf`): o seed declara `[...STANDARD_ROLES, "auditor"]` e o primeiro teste falha.

const seedText = readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8");
const provisionText = readFileSync(new URL("../scripts/provision-rbac.ts", import.meta.url), "utf8");

/** Extrai o corpo do `DEFAULT_ROLES.filter((x) => …)` da constante e troca o nome do parâmetro por `papel`. */
function exclusao(texto: string, constante: string): string | null {
  const re = new RegExp(`const ${constante} = DEFAULT_ROLES\\.filter\\(\\((\\w+)\\) => ([^;]+)\\);`);
  const match = texto.match(re);
  if (!match) return null;
  const [, parametro, corpo] = match;
  return corpo.replace(new RegExp(`\\b${parametro}\\b`, "g"), "papel").trim();
}

test("[item 47] prisma/seed.ts semeia DEFAULT_ROLES menos platform_admin, a mesma regra de scripts/provision-rbac.ts", () => {
  const doSeed = exclusao(seedText, "SEEDED_SYSTEM_ROLES");
  const doProvisionamento = exclusao(provisionText, "PAPEIS_PROVISIONADOS");

  assert.ok(doSeed, "seed.ts sem `const SEEDED_SYSTEM_ROLES = DEFAULT_ROLES.filter((…) => …);`");
  assert.ok(doProvisionamento, "provision-rbac.ts sem `const PAPEIS_PROVISIONADOS = DEFAULT_ROLES.filter((…) => …);`");
  assert.equal(
    doSeed,
    doProvisionamento,
    "o seed e o provisionamento de produção excluem papéis diferentes do catálogo: uma base só do seed (CI, test:e2e) " +
      "teria um conjunto de papéis globais diferente do de produção",
  );
  assert.equal(doSeed, 'papel !== "platform_admin"', "a exclusão deve ser só platform_admin, o pseudo-papel do plano de controle");
  assert.ok(
    /import \{[^}]*\bDEFAULT_ROLES\b[^}]*\} from "\.\.\/src\/modules\/core-saas\/permissions\/catalog\.js";/.test(seedText),
    "seed.ts deve importar DEFAULT_ROLES do catálogo, a mesma fonte do provisionamento",
  );
  assert.equal(DEFAULT_ROLES.includes("platform_admin"), true, "se platform_admin saiu do catálogo, a exclusão deixa de ter razão de ser");
});

test("[item 14] o laço de papéis do seed consome SEEDED_SYSTEM_ROLES, não STANDARD_ROLES", () => {
  assert.match(seedText, /for \(const role of SEEDED_SYSTEM_ROLES\) \{/, "o laço de papéis não itera SEEDED_SYSTEM_ROLES");
  assert.doesNotMatch(seedText, /for \(const role of STANDARD_ROLES\) \{/, "ainda existe um laço iterando STANDARD_ROLES — os papéis legados ficariam de fora");
});
