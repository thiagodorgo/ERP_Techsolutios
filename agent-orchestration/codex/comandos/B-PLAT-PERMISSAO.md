# B-PLAT-PERMISSAO — a checagem da plataforma confere a permissão pedida; 6 chaves só para o super_admin (item 72 do portão)

> **Plano:** `plano-B-PLAT-PERMISSAO.md` + Emenda 1 + Emenda 2 (a mais nova prevalece), escritos fora do repositório
> (`erp-pausa-2026-10-03/planos/`): o plano por `plano-plat-perm-cl` (Claude Opus 5.5, topo declarado com o Fable suspenso),
> as emendas por `plano-plat-perm-e1-fable` e `plano-plat-perm-e2-fable` (Claude Fable 5.1, topo). Críticas:
> `crit-plat-perm-cl` e `crit-plat-perm-e1-cl` (Claude Opus 5.5), as duas SEGUE COM EMENDA. Este comando resume o que o
> dev executa; onde ele e o plano divergirem, vale o plano.
> **Dev:** `dev-plat-perm-cl` (Claude Opus 5.5, nível menor, declarado), identidade nova. **Sem cruzamento de casa**
> (§C7 item 11(2)): Codex sem cota nas 3 contas e o filtro da OpenAI barrou o tema; o dono mandou cobrir.
> **Ramo:** `feat/plat-permissao`, a partir da `origin/main` `60c0704a` (17/11).
> **Nível:** junta completa (permissão e dinheiro; `prisma/`), inspetor + 3 cadeiras, unanimidade; antes, a pré-revisão.

## Objetivo

O item 72 (`P-PLAT-PORTAO-SEM-PERMISSAO`): `requirePlatformPermission(P)` passa só quem tem um papel de plataforma
(`PLATFORM_ROLES`) **E** P no efetivo (o catálogo do papel por `createTenantContextFromRequestActor`; no cabeçalho legado,
a interseção com `x-permissions`); senão 403 `platform_permission_required` (o mesmo `reason` e a mesma mensagem de
hoje). `x-permissions` presente, mesmo vazio, é explícito (fail-closed). As 6 chaves que as rotas e as telas pediam e
não estavam no catálogo entram nele, com a migração de concessão só ao `super_admin`.

## As decisões do dono (17/11, canal do artefato)

| Pergunta | Resposta | ID |
|---|---|---|
| `d72-rev` | manter | `D-DONO-1711-ITEM-72-REVISTO` |
| `d72-p1` | sim | `D-DONO-1711-72-P1` (migração em `prisma/` autorizada, só as 6 chaves, só `super_admin`) |
| `d72-p2` | nao | `D-DONO-1711-72-P2` (o `settle` não é segregado) |

## Fatias (um commit cada)

- **F1** a migração `prisma/migrations/20260905000000_plat_permissoes_de_organizacao/migration.sql` e o drill
  `tests/plat-perm-migration-drill-db.test.ts` (a)–(e); MP-9.
- **F2** as 6 chaves no `PERMISSION_CATALOG`; o portão (§2.1 do plano); `satisfies readonly Permission[]`; `PlatformGate`
  e a propriedade `platformPermission`; `normalizeRole`; `expectedPermissionCatalog`; o snapshot de papéis (`12 0`) e a
  fixture do gate mobile (`6 0`) regenerados por comando; `ass-09-api-contracts` l.15 e l.102.
- **F3** `tests/helpers/route-walk.ts` (4 campos opcionais); `scripts/plat-perm-censo.mjs`; o instantâneo
  `tests/fixtures/plat-perm-rotas.json` (antes por `--so-dinamico` na base, depois completo, `cmp` igual);
  `tests/plat-perm-censo.test.ts` (i)–(vi-b); `tests/plat-perm-matriz.test.ts` (a)–(i), (g′); MP-1 a MP-14; o
  vermelho-controle na base.
- **F4** a linha `SUITES=` (fim da lista, comentário de praxe, medição 3×; `D-DONO-1611-SUITES-REGRA-FIXA`); a frase em
  `docs/subscription-billing.md` e a nota no `RBAC_MATRIX.md`; o registro (decisões, pendências, índice, linha 72,
  status-geral, este comando).

## PERMITIDO

O §9 da Emenda 1 com o §6 da Emenda 2: `src/modules/platform/platform-permissions.ts`; `catalog.ts` (só as 6 chaves);
a migração única; os 3 testes novos e o instantâneo; `scripts/plat-perm-censo.mjs`; `tests/helpers/route-walk.ts` (só os
4 campos opcionais); `tests/core-saas.test.ts` (só o `expectedPermissionCatalog`); o snapshot de papéis e a fixture
mobile (só regenerados); `tests/ass-09-api-contracts.test.ts` (só l.15 e l.102); `.github/workflows/ci.yml` (só a linha
`SUITES=` e o comentário); `docs/subscription-billing.md` e `RBAC_MATRIX.md` (uma frase/uma nota); o registro.

## PROIBIDO

`prisma/**` além da migração única; `src/modules/core-saas/middleware/**`; `src/modules/auth/**`, `src/app.ts`,
`src/config/env.ts`; as rotas (`src/modules/**/*.routes.ts`), salvo mutação temporária com restauro provado;
`tests/core-saas-role-authority.test.ts`; `frontend/**`, `portals/**`, `mobile/**` (salvo a fixture gerada);
`scripts/provision-rbac.ts`, `scripts/bootstrap-platform-admin.ts`; `infra/**`, `.env`, lockfiles, `pubspec.*`, `Kpis/**`.

## Bateria

`npm run check` · `npm run lint` · `node --test --import tsx tests/plat-perm-*.test.ts` (o `-db` com banco) · as
regressões (`core-saas`, `core-saas-role-authority`, `ass-09-api-contracts`, `mobile-gate-chave-matriz`,
`platform-routes`, `permission-catalog-migration-parity` e os consumidores do `route-walk`: `san3-18-route-module-census`,
`users-acesso-seg-portao-varredura`, `users-seg-desativado-varredura`) · `npm test` · `npm run build` ·
`node --import tsx scripts/plat-perm-censo.mjs` (saída igual ao instantâneo) · `node scripts/migration-transaction-guard.mjs`
· `npm --prefix frontend run check` · `flutter test test/features/bmobile_gate_chave_test.dart` · o lote `-db` 3× pela
receita v3 da Emenda 2 §5(b) · `git diff --check` · o PROIBIDO medido vazio. O verificador lê o resumo TAP de cada job
(`backend`, `backend-postgres`, `flutter`), não a cor.

## Execução

O diário do dev está fora do repositório: `erp-pausa-2026-10-03/revisoes/plat-perm/dev-plat-perm-cl.md` (comandos,
saídas, commits, a tabela das mutações, o vermelho-controle, a receita v3 com os 3 resumos TAP, a bateria, o PR e o TAP).
