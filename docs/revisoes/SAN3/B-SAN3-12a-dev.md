# B-SAN3-12a — relatório do dev (backend de dinheiro do web financeiro)

> **Quem:** `dev-san312a-opus`, Claude **Opus** (`claude-opus-5-5`), nível menor **declarado** (§C7.6). Dev do bloco:
> não planejou, não criticou, não vota. O dono decidiu em 24/10 *"vc cobre o codex nessa rodada"*.
> **Fonte única:** `docs/revisoes/SAN3/B-SAN3-12-plano.md` (PLANO v3 final do `planejador-mestre`, Fable) + as críticas
> `B-SAN3-12-critica-r1.md` e `-r2.md` (cópias verbatim, LF).
> **Terreno:** worktree próprio `C:/Users/AMP/w-san312a`, ramo `feat/web-financeiro-baixa-e-contas-12a`, criado de
> `origin/main` `8a7885f4` (a `main` andou de `37a3f360` → `8a7885f4` só com o #454 Traccar; `git diff --stat 37a3f360 HEAD --
> src/modules/{financial-entries,cheques,financial-titles,financial-uow,tenant-settings,core-saas}` vazio). `npm ci` próprio
> (sem junction), `npm run db:generate`. Postgres 16 descartável próprio `dev-san312a-pg` em `127.0.0.1:55412` (1 trabalho
> Docker; nunca a base viva 5432/6379 nem `erp-*`).
> **Registro P1:** este arquivo cresce etapa a etapa.

## E0 — baseline (antes de qualquer edição)

- `npm test` (runner, `CORE_SAAS_PERSISTENCE=memory`, **sem** `DATABASE_URL`) em `8a7885f4`, antes de qualquer edição →
  `340 arquivo(s) · 3322 teste(s) · pass 3225 · fail 1 · skipped 96`; o `fail 1` é `tests/core-saas-role-authority.test.ts`,
  que exige `DATABASE_URL` no carregamento (`Error: DATABASE_URL is required to initialize Prisma Client.`) — ambiente, não
  defeito (na CI o job `backend` exporta `DATABASE_URL`). Log: `C:/Users/AMP/w-san312a-baseline-npmtest.log`.
- Segunda medição com `DATABASE_URL` do cluster descartável: **DESCARTADA** — rodou 17 min em paralelo com as primeiras
  edições do código (contaminada). A comparação base × objeto sai de um worktree limpo da base (E9).

## E1 — o que a execução falsificou no plano (PARADA registrada, §mandato: "PARE e registre; não improvise remédio")

Comando (memória): `node --test --import tsx --test-reporter=tap tests/financial-entries.test.ts tests/cheques.test.ts
tests/financial-summary.test.ts tests/financial-titles.test.ts tests/financial-accounts.test.ts tests/cheque-title-link.test.ts
tests/permission-catalog-migration-parity.test.ts tests/core-saas.test.ts tests/financial-period-closes.test.ts
tests/financial-uow-journal-classification.test.ts tests/o6r07c-census-guard.test.ts tests/tenant-settings.test.ts`
→ depois de implementar o §4 e de ajustar os chamadores PERMITIDOS: `# tests 400 · pass 391 · fail 9`. Os 9 vermelhos
estão TODOS em arquivos FORA do PERMITIDO do §7.1 (nem tocados):

| # | Falsificação | Saída medida | Arquivo fora do escopo |
|---|---|---|---|
| F1 | o §7.1 não inventaria `tests/cheque-title-link.test.ts` (do #456), que prova o comportamento que o dono MUDOU | `not ok 2 K1: PATCH vincula e null explícito desvincula` → `unlink_requires_privilege`; `not ok 11 K2: clear parcial` (cheque 100 / título 300) → `cheque_amount_mismatch`; `not ok 13 K2: título pago depois do vínculo` (pix com cheque pendente) → `title_has_pending_cheque`; `not ok 14 K2: título apagado depois do vínculo` → `title_has_pending_cheque`; `not ok 16 K3: pagamento misto` → `cheque_amount_mismatch` | `tests/cheque-title-link.test.ts` (e, pela leitura, `tests/cheque-title-link-atomic-db.test.ts`: "K2-db parcial 300" e "título pago antes do clear" por pix — medido em E6) |
| F2 | R2-07 pôs `findPendingByTitle` em `CHEQUE_REPO_KIND`, mas o arnês P7 exige fixture, critério de leitura e a contagem medida | `not ok 334 [P7][cheques.findPendingByTitle] … não tem fixture de invocação aqui`; `not ok 347 … 39 fixtures` | `tests/financial-uow-journal-classification.test.ts` além da l.326 ("só os chamadores de reconcile") |
| F3 | rota nova exige classificação no instantâneo GERADO do censo (B-O6R-07c-a) | `not ok 350 T1` → `NAO-CLASSIFICADA: ROTA GET /api/v1/financial-entries/aggregate`, `… /reconciliation-policy`, `ROTA POST /api/v1/cheques/:chequeId/unlink-title`; `not ok 363 T14` | `tests/fixtures/o6r07c-classificacao-vias.json` |

Falsificações por LEITURA (sem vermelho ainda; medidas nas etapas seguintes):
- **F4** — `cheques.linkedPending*` (§4.7, A16) precisa do `titleId` na projeção do resumo em MEMÓRIA, que vive em
  `src/modules/financial-summary/financial-summary.repository.ts` (fora do PERMITIDO: o §7.1 lista `compute`, `types`,
  `dto` e `financial-summary-prisma.repository.ts`). Sem ele, a memória responde `linkedPendingCount = 0` sempre.
- **F5** — o snapshot `tests/fixtures/role-catalog-contract.snapshot.json` guarda TAMBÉM `super_admin` e `platform_admin`
  (= `PERMISSION_CATALOG` inteiro, 198 cada); o §5.1 autoriza "só `ROLE_PERMISSIONS.tenant_admin` (+2)", mas o §5.2 diz que
  super/platform recebem pelo catálogo integral. Editei só o `tenant_admin` (literal); o vermelho dos outros dois vem em E6.
- **F6** — `scripts/provision-rbac.ts` NÃO tem mapa de descrições (elas vivem em `prisma/seed.ts`, PROIBIDO; o script usa o
  genérico `Permissão <chave>.` por desenho, `P-RBAC-PROVISION-DESCRICOES`). "só as 2 descrições" não tem onde entrar; nada
  feito (as descrições curadas estão na migração de dados).
- **F7** — o envelope de erro comum (`src/modules/core-saas/routes/http.ts`, fora do PERMITIDO) só emite `code/reason/message`;
  o `details` do §4.2 sai pelo controller do PRÓPRIO módulo (`financial-entry.controller.ts`, `cheque.controller.ts`), que é
  PERMITIDO — implementação, não remédio; registrado para a junta.
- **F8** — A17-bis ("todo `reason` lançado pelos módulos financeiros está na lista fechada de §4.1") é impossível na letra: o
  censo gera **50** `reason` distintos nas fábricas `new …Error(` de `src/modules/{financial-*,cheques}/**` na base, e **33**
  deles (pré-existentes: `invalid_limit`, `transition_conflict`, `duplicate_payment`, …) não aparecem em `API_CONTRACTS.md`
  (comando em E5). A lista de 32 é a do que a TELA traduz, não o universo dos módulos.
- **F9** — inconsistência interna do plano: R-res-2 (tabela final) chama de "requisito v3" o `400 bounce_reason_required`,
  que não está no §4 nem na lista fechada de 32 do §4.1. Implementado (é requisito escrito) e listado à parte (E5).

**Decisão do dev (declarada):** segui implementando TODO o escopo PERMITIDO (o que não é remédio) e NÃO toquei nenhum dos
arquivos acima. A bateria final mostra estes vermelhos e só estes; o PR sai como **rascunho**, para o orquestrador decidir a
emenda (`D-EMENDA-ANTES-DO-CODIGO`). Quem desenvolve não julga o achado (§C7.4-bis).
