# B-SAN3-07 — diário do dev (item 47: papéis legados no seed base e nome da organização demonstração, provados no banco)

- **Dev:** `dev-san3-07-cl`, Claude Opus 5.5, subagente da sessão, identidade nova (nível menor, declarado). Cobre o Codex,
  com exceção declarada: o Codex 1 está sem cota semanal até 16/11 e o Codex 2 está ocupado. Não planejei nem critiquei.
- **Plano:** `C:/Users/thiag/erp-pausa-2026-10-03/planos/plano-B-SAN3-07.md` (autor `plano-B-SAN3-07-api`, Claude Opus 5.5
  pela API), com a Emenda 1 (orquestrador, 11/11 03:01), que prevalece. Crítica `crit-07-cl` (Claude Opus 5.5 da sessão),
  APROVADO COM AJUSTES: `revisoes/crit-07-plano.json` e `-evidencia.md`.
- **Verificador:** de outra casa, a cargo do orquestrador (emenda 1, item 8). Este diário não verifica a si mesmo.
- **Terreno:** worktree `C:/Users/thiag/w-san307`, ramo `fix/seed-papeis-legados` a partir de `origin/main` = `07898adf`
  (`git rev-parse origin/main`, 11/11 03:02 SP). `npm ci` próprio, sem junction. Postgres 16.15 descartável `san307-pg`
  em `127.0.0.1:55498`.
- **Horas:** de `date`, em São Paulo.

## F0 — comando (03:05)

- `agent-orchestration/codex/comandos/B-SAN3-07-seed-papeis-e-nome.md`, no formato curto da trilha SAN3
  (`B-SAN3-21-acentuacao.md`).
- O ramo é `fix/seed-papeis-legados`, o do mandato do orquestrador; o plano dizia `fix/seed-demo-nome-de-negocio`.
- O texto sobre a superfície da mudança de permissão já sai corrigido pela emenda 1, item 3: ganham os 5 papéis só as
  bases preparadas apenas por `db:seed` (CI `backend-postgres`, `test:e2e`, dev sem `db:seed:users`). O staging roda
  `db:seed:demo`, e o `seed-users.ts` já cria os 5.

## F1 — teste primeiro, vermelho-controle (03:07)

**Base de hoje.** `create database san307_tpl` → `npx prisma migrate deploy` (base modelo, só migrada); `create database
san307_hoje template san307_tpl` → `npm run db:seed` com o `prisma/` igual ao da `main` (`git diff --quiet origin/main HEAD
-- prisma/`), exit 0.
- `select count(*), string_agg(key, ',' order by key) from roles where tenant_id is null` →
  `7|auditor,field_dispatcher,manager,super_admin,technician,tenant_admin,viewer` (a HIPÓTESE do §1.2 do plano, confirmada).
- `select name, slug from tenants` → `Organização Demonstração|demo`.

**Mudança no teste** (`tests/permission-catalog-db-parity.test.ts`):
- `PAPEIS_SEM_LINHA_GLOBAL` reduzido a `["platform_admin"]`; o comentário que dizia "6 linhas globais" foi reescrito.
- P2 (`select count(*)::int as n from roles where key = 'platform_admin' and tenant_id is null` = 0) e P3
  (`select name from tenants where slug = 'demo'` → 1 linha, sem `/tenant/i`) entram como asserções DENTRO do teste "os
  grants do papel GLOBAL…", sem `test()` novo e sem renomear os 2 (emenda 1, item 1). `grep -c "^test(" …` = 2.
- P2 e P3 ficam antes da asserção de P1, para cada mutação ficar vermelha na asserção dela.

**Vermelho-controle.** `RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts` contra
`san307_hoje` → exit 1, `# pass 1 · # fail 1`, `not ok 2` com exatamente 5 linhas:
`papel "operator" … 68`, `"finance" … 62`, `"inventory" … 17`, `"field_technician" … 49`, `"support" … 11` (soma 207).
P2 e P3 passaram nessa base (o seed de hoje não cria `platform_admin`, e o nome já foi corrigido pelo #518).

**Orçamento de pulos.** `DATABASE_URL=…/san307_tpl CORE_SAAS_PERSISTENCE=memory node scripts/run-backend-tests.mjs
tests/permission-catalog-db-parity.test.ts` → exit 0, `# tests 2 · # skipped 2`.

## F2 — a derivação no seed e o textual reescrito (03:09)

**Textual primeiro.** `tests/san3-04a-seed-semeia-auditor.test.ts` reescrito: lê `prisma/seed.ts` e
`scripts/provision-rbac.ts`, extrai o corpo do `DEFAULT_ROLES.filter((x) => …)` de `SEEDED_SYSTEM_ROLES` e de
`PAPEIS_PROVISIONADOS`, troca o nome do parâmetro e exige o mesmo texto, que deve ser `papel !== "platform_admin"`; exige
também o import de `DEFAULT_ROLES` do catálogo no seed (emenda 1, item 7). O segundo teste (o laço consome
`SEEDED_SYSTEM_ROLES`) ficou.
- Vermelho-controle no seed de hoje: `node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts` → exit 1,
  `not ok 1` com "seed.ts sem `const SEEDED_SYSTEM_ROLES = DEFAULT_ROLES.filter((…) => …);`", `ok 2`.

**O seed.** `prisma/seed.ts`: o import troca `STANDARD_ROLES` por `DEFAULT_ROLES` (`grep -c STANDARD_ROLES prisma/seed.ts`
= 0), e `const SEEDED_SYSTEM_ROLES = DEFAULT_ROLES.filter((role) => role !== "platform_admin");`, com o comentário
reescrito. O nome da organização não foi tocado. Nada mais no arquivo.

**Verde.**
- `node --test --import tsx tests/san3-04a-seed-semeia-auditor.test.ts tests/seed-guard.test.ts` → exit 0, `# tests 6 ·
  # pass 6 · # fail 0`.
- Base nova `san307_novo` (template `san307_tpl`) → `npm run db:seed` exit 0 → 12 globais:
  `auditor,field_dispatcher,field_technician,finance,inventory,manager,operator,super_admin,support,technician,tenant_admin,viewer`.
- `RBAC_DB_PARITY=1 node --test --import tsx tests/permission-catalog-db-parity.test.ts` contra `san307_novo` → exit 0,
  `# tests 2 · # pass 2 · # fail 0 · # skipped 0`.

**O sinal sobre o seed é executá-lo** (emenda 1, item 6). `npm run check` → exit 0, mas ele compila só `src/**`.
Typecheck explícito do seed com um tsconfig meu, fora do repositório (`extends` do `tsconfig.json`, `include` de `src/**`
+ `prisma/seed.ts`, `typeRoots` do worktree): os MESMOS 2 erros antes (seed de `07898adf`, por `git stash`) e depois —
`prisma/seed.ts(195,3) TS1360` (o `permissionDescriptions … satisfies Record<Permission, string>` não tem 43 das 205
permissões do catálogo; contado por script: 162 com descrição) e `prisma/seed.ts(257,48) TS2551` (o acesso
`permissionDescriptions[permission]`, que tem fallback genérico). Pré-existentes, fora do escopo; viram pendência na F4.
