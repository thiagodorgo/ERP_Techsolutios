import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { STANDARD_ROLES } from "../src/modules/core-saas/permissions/catalog.js";

// B-SAN3-04a — T4 (item 14, `P-033`): o `prisma/seed.ts` semeia o papel `auditor` com as concessões do catálogo.
//
// Antes do bloco o laço de papéis iterava só `STANDARD_ROLES` (6 papéis) e uma base preparada como a CI
// (`migrate deploy` + `db:seed`, sem `db:provision-rbac`) não tinha linha global de `auditor` — o gate das rotas
// lê o BANCO em `CORE_SAAS_PERSISTENCE=prisma`, e o auditor recebia 403 em `/tags`, `/pois`, `/tenant-settings`.
//
// Limite declarado (D-007): este teste é TEXTUAL — prova que a constante existe e que o laço a consome. O efeito
// no banco é o drill D4 do plano (base nova: `migrate deploy` + `db:seed` → auditor presente com 56 concessões),
// executado pelo dev e reexecutado pela junta; e o braço 1 do T2 (`san3-04a-menu-com-permissoes-do-banco-db`).
// Os outros cinco papéis legados (`finance`, `inventory`, `operator`, `field_technician`, `support`) continuam
// fora do seed por decisão de escopo → `P-SAN3-04A-SEED-PAPEIS-LEGADOS` (dono: `B-SAN3-07`).
//
// Vermelho-controle no head-base (`13e3783c`): a constante não existe e o laço itera `STANDARD_ROLES`.

const seedText = readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8");

test("[item 14] prisma/seed.ts declara SEEDED_SYSTEM_ROLES = STANDARD_ROLES + auditor (e só o auditor, por escopo)", () => {
  const match = seedText.match(/const SEEDED_SYSTEM_ROLES = \[\.\.\.STANDARD_ROLES,\s*([^\]]*)\]\s*as const satisfies readonly Role\[\];/);
  assert.ok(match, "seed.ts sem `const SEEDED_SYSTEM_ROLES = [...STANDARD_ROLES, ...] as const satisfies readonly Role[]`");
  const extras = [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(extras, ["auditor"], "o escopo autoriza semear SÓ o auditor; os demais legados ficam para P-SAN3-04A-SEED-PAPEIS-LEGADOS");
  assert.equal(STANDARD_ROLES.includes("auditor" as (typeof STANDARD_ROLES)[number]), false, "se auditor virou STANDARD, a constante deixa de ter razão de ser");
});

test("[item 14] o laço de papéis do seed consome SEEDED_SYSTEM_ROLES, não STANDARD_ROLES", () => {
  assert.match(seedText, /for \(const role of SEEDED_SYSTEM_ROLES\) \{/, "o laço de papéis não itera SEEDED_SYSTEM_ROLES");
  assert.doesNotMatch(seedText, /for \(const role of STANDARD_ROLES\) \{/, "ainda existe um laço iterando STANDARD_ROLES — o auditor ficaria de fora");
});
