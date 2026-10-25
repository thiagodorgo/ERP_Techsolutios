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

## E2 — o que foi implementado (só o PERMITIDO do §7.1 + as ampliações nominais)

| Plano | Onde | O quê |
|---|---|---|
| §4.2 (A1–A4, A19, A25) | `financial-entry.service.ts` (`payTitle`), `cheque.service.ts` (`create`/`update`), `cheque.repository.ts` + `cheque-prisma.repository.ts` (`findPendingByTitle`), `financial-uow.ts` (só `CHEQUE_REPO_KIND` + `journaledCheques`), `financial-titles/cheque-pending-reader.ts` (novo) | fast-fail pelo pool (422 `title_has_pending_cheque` com `details`, nenhuma transação aberta) + re-check DEPOIS do `findByIdForUpdate` do título na unidade; vínculo de cheque (create/PATCH com `title_id`) em `uow.run` com o título travado e revalidado sob o lock; só o valor EXATO (`cheque_amount_mismatch` com `chequeAmount`/`openBalance`) |
| §4.3 (A5–A8, A20, A21, R-res-2/3) | `cheque.service.ts` (`unlinkTitle`, fecho do bypass do `PATCH`, `cancel`/`delete`, `bounce`), `cheque.repository.ts` + Prisma (`ChequeTitleUnlinker.unlinkTitle`, CAS de estado + `title_id` lido), `cheque.routes.ts` (`POST /cheques/:id/unlink-title`, `cheques:unlink_title`), `cheque.controller.ts` (auditoria Crítica, `details`, `warning`), `financial-title.service.ts` (só `update`/`delete`) | desvínculo com justificativa 10–500; 403 `unlink_requires_privilege` para tirar/trocar título sem o privilégio; cancelar/excluir vinculado → `cheque_linked_unlink_first` para todo ator; título com cheque pendente não muda `amount` nem é apagado; `bounce` de vinculado `deposited` exige motivo e é auditado `warning` com o `titleId`; `warning: cheque_still_depositable` |
| §4.4 (A9–A12, R4) | `financial-entry.service.ts` (`reconcileWithOutcome`, `reconciliationPolicy`), rotas/controller, `tenant-setting.validators.ts` + `tenant-setting.service.ts` (só `upsert`: `parseValue(key, value)`) | desfazer exige `financial_entries:unreconcile` OU (papel `finance` E política `"true"`); `GET /financial-entries/reconciliation-policy`; validador da chave (só `true`/`false`); auditoria do desfazer `warning` + `delegated` |
| §4.5 (A14, A15, A23, A24) | `financial-entry.repository.ts` + Prisma (`FinancialEntryAggregateReader.aggregate`, FORA do contrato da UoW), service/rotas/controller | `GET /financial-entries/aggregate` — mês = `competencia`, dia = data civil no `BUSINESS_TIMEZONE` (`AT TIME ZONE` com o nome vindo da constante); tetos 92 dias / 24 meses; SQL `SUM` sobre Decimal, `Number` só na borda |
| §4.6 (A13) | `financial-entry.types.ts` (`expectedReconciled`/`expectedReconciledAt`), repositórios (memória síncrona; Prisma no `WHERE`), service (`reconcile` em `uow.run`) | CAS obrigatório por estado lógico; 400 `expected_state_required`; 409 `reconciliation_stale` |
| §4.7 (A16, A17) | `financial-entry.dto.ts`, `financial-title.dto.ts`, `financial-summary.{types,compute}.ts`, `financial-summary-prisma.repository.ts` | lista de lançamentos com `description`/`reconciliationRef`/`reconciledAt`/`reconciledBy`/`updatedAt`; lista de títulos com `workOrderId`; `cheques.linkedPending*` (memória: ver F4) |
| §5.1/5.2 (A18, A22) | `catalog.ts` (2 chaves; `tenant_admin` por herança), migração de DADOS `20260882000000_…` (BEGIN/COMMIT, idempotente, runbook) | `scripts/provision-rbac.ts` NÃO tocado (F6) |
| §5.5 | `RBAC_MATRIX.md` (nota + as duas frases do conflito §A2), `APPROVAL_LIMITS.md` (2 linhas), `API_CONTRACTS.md` (§3.11) | conflito registrado em `controle/decisoes.md` antes de consolidar |

Precedência mudou num ponto, declarada: no `PATCH /financial-titles/:id` o `amount` passou a ser validado antes dos demais campos
(para ler o conjunto pendente só quando o valor muda); com `amount` E outro campo inválidos ao mesmo tempo, o 400 que sai é o do `amount`.

## E3 — critérios × testes (todos verdes no head, salvo A16 em memória — F4)

| Critério | Teste(s) |
|---|---|
| A1, A2, A3, A4 (memória), A8, A19, A21, A25 (memória) | `tests/b-san3-12a-pay-pending-cheque.test.ts` (15) |
| A1, A2, A3, A7, A8, A19, A20, A21 (Postgres) | `tests/b-san3-12a-pay-pending-cheque-db.test.ts` (4) |
| A4 (b)(c), A4-bis, A25, A5-bis (Postgres, barreira escopada por `application_name`) | `tests/b-san3-12a-pay-link-race-db.test.ts` (6) |
| A5, A6, A7 (entrada pura), A20, R-res-2, A5/A6/A19/A20 pela rota | `tests/b-san3-12a-unlink-title.test.ts` (12) |
| A9–A13 (memória e rota), A18, R4 | `tests/b-san3-12a-unreconcile-policy.test.ts` (11) |
| A13 (Postgres: barreira + 10 rodadas concorrentes + ms exato) | `tests/b-san3-12a-reconcile-cas-db.test.ts` (3) |
| A14, A15, A17, A23, A24 (memória) e a rota do agregado | `tests/b-san3-12a-entries-aggregate.test.ts` (6) |
| A14 (paridade memória × Prisma), A24, R-res-5 | `tests/b-san3-12a-entries-aggregate-db.test.ts` (3) |
| A23 (Postgres, virada de mês/dia) | `tests/b-san3-12a-aggregate-tz-db.test.ts` (1) |
| A16 (compute + serviço em memória) | `tests/financial-summary.test.ts` (+2; o de serviço é o vermelho da F4) |
| A17-bis (censo gerado; dívida pré-existente congelada que só encolhe) | `tests/b-san3-12a-reasons-census.test.ts` (4) |
| A22 (drill: deploy real, concessões, idempotência, rollback do rodapé, paridade pós-provisionamento) | `tests/b-san3-12a-permissions-migration-drill-db.test.ts` (4) |

## E4 — mutações (uma a uma, restauro por `git checkout --` com hash do blob conferido contra o HEAD)

Roteiro: `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/san312a/mutations.py`
(saída `C:/Users/AMP/w-san312a-mutations.json`). Resultado: **35 de 35 mutações deixaram vermelho o caso do critério**; ao fim,
`git status --porcelain -- src prisma` vazio (`ARVORE-SRC-LIMPA`).

| id | mutação | teste | resultado | 1º caso vermelho |
|---|---|---|---|---|
| A1-ambas | remover as duas checagens da baixa → 201 indevido | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 5) | A1: /pay de título com cheque registered vinculado → 422 title_has_pending_chequ |
| A1-fastfail | remover só o fast-fail → o contador de uow.run vai a 1 | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 3) | A1: /pay de título com cheque registered vinculado → 422 title_has_pending_chequ |
| A2 | trocar IN (registered, deposited) por <> cancelled (memória) | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 1) | A2: título sem cheque, ou com cheque cleared/bounced/cancelled vinculado, baixa  |
| A3-fastfail | remover só o fast-fail → a 1ª fixture responde period_closed | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 3) | A1: /pay de título com cheque registered vinculado → 422 title_has_pending_chequ |
| A3-ordem | inverter a ordem (pendente antes de cheque_required) → a 2ª fixture responde title_has_pending_cheque | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 1) | A3: precedência — cheque_required vence title_has_pending_cheque (payment_method |
| A4-recheck-mem | remover só o re-check → em (b) os dois commitam (memória) | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 1) | A4 (b, memória): o vínculo commita DEPOIS do fast-fail do pay e ANTES do lock do |
| A4-recheck-db | remover só o re-check → em (b) os dois commitam (Postgres) | b-san3-12a-pay-link-race-db.test.ts | **vermelho** (fail 1) | A4 (b, db): o vínculo commita entre o fast-fail e o lock do pay → 422 title_has_ |
| A4-lock-mem | vincular fora da unidade (sem o lock do título) → em (c) o vínculo commita sobre título pago (memória) | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 2) | A4 (c, memória): o pay trava primeiro → o vínculo espera, relê o título pago sob |
| A4-lock-db | remover o FOR UPDATE do título no vínculo → em (c) o vínculo não bloqueia (Postgres) | b-san3-12a-pay-link-race-db.test.ts | **vermelho** (fail 1) | A4 (c, db): o pay trava o título primeiro → o vínculo BLOQUEIA no FOR UPDATE do  |
| A4bis | remover fast-fail E re-check → o pay commita com o cheque deposited vinculado (Postgres) | b-san3-12a-pay-link-race-db.test.ts | **vermelho** (fail 2) | A4 (b, db): o vínculo commita entre o fast-fail e o lock do pay → 422 title_has_ |
| A5 | trocar o requirePermission do unlink-title por cheques:update | b-san3-12a-unlink-title.test.ts | **vermelho** (fail 1) | A5/A6/A20 (HTTP): sem cheques:unlink_title a rota responde 403; tenant_admin des |
| A5bis-db | tirar title_id = <lido> do WHERE do unlink (Prisma) | b-san3-12a-pay-link-race-db.test.ts | **vermelho** (fail 1) | A5-bis (db, CAS): o desvínculo com o título LIDO diferente do atual casa 0 linha |
| A6 | remover a comparação com o title_id atual (o fecho do bypass) | b-san3-12a-unlink-title.test.ts | **vermelho** (fail 2) | A6: PATCH por finance — tirar o título (null) ou trocá-lo → 403 unlink_requires_ |
| A7 | apagar a chamada de auditoria do unlink-title | b-san3-12a-pay-pending-cheque-db.test.ts | **vermelho** (fail 1) | A7 (db): o unlink-title pelo controller grava a auditoria CRÍTICA cheque.title_u |
| A8 | não limpar title_id no unlink (memória) | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 2) | A8: /pay logo depois do unlink-title → 201 (o título voltou a ser liquidável por |
| A9 | fixar delegated = true sem ler a política | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 1) | A9: desfazer por finance SEM política → 403 unreconcile_forbidden; por tenant_ad |
| A10 | aplicar o gate também ao conciliar (true) | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 4) | A9: desfazer por finance SEM política → 403 unreconcile_forbidden; por tenant_ad |
| A11 | calcular a política pela rota, não pelo ator (sempre true) | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 1) | A11: GET /financial-entries/reconciliation-policy reflete o ATOR (finance sem po |
| A12 | aceitar qualquer string para a chave da política | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 1) | A12: o validador da chave da política decide PELA CHAVE — fora de true/false → 4 |
| A13-mem | tirar o par (reconciled, reconciledAt) da comparação sob o mutex (memória) | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 3) | A13: dois clientes LEEM o mesmo estado e gravam em sequência → o 1º 200, o 2º 40 |
| A13-db | tirar reconciled/reconciled_at do WHERE (Prisma) | b-san3-12a-reconcile-cas-db.test.ts | **vermelho** (fail 3) | A13 (db, barreira): o 1º grava e segura o commit; o 2º com o MESMO estado lido b |
| A14 | remover deleted_at IS NULL do agregado (memória) | b-san3-12a-entries-aggregate.test.ts | **vermelho** (fail 1) | A14: group_by=none&reconciled=false — count/inflow/outflow somados no servidor c |
| A15 | remover o teto do dia | b-san3-12a-entries-aggregate.test.ts | **vermelho** (fail 2) | A15: day com 93 dias → 400 aggregate_range_too_wide; 92 passa; month com 25 mese |
| A16 | somar também os pendentes sem título | financial-summary.test.ts | **vermelho** (fail 2) | A16 (compute): linkedPending* = Σ dos cheques PENDENTES com título; sem vínculo  |
| A17 | remover workOrderId da lista de títulos | b-san3-12a-entries-aggregate.test.ts | **vermelho** (fail 1) | A17: a lista de lançamentos traz description, metadados de conciliação e updated |
| A17bis | criar reason novo sem contrato | b-san3-12a-reasons-census.test.ts | **vermelho** (fail 2) | A17-bis: o censo mede de fato (lê os 5 módulos e encontra os reasons novos do bl |
| A18 | conceder ao finance no catálogo | b-san3-12a-unreconcile-policy.test.ts | **vermelho** (fail 1) | A18: tenant_admin, super_admin e platform_admin têm cheques:unlink_title e finan |
| A19 | comparar com <= em vez de igualdade no valor exato | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 3) | A19: vincular cheque de 40 a título de saldo 100 → 422 cheque_amount_mismatch (c |
| A20 | remover a checagem de titleId no cancel | b-san3-12a-unlink-title.test.ts | **vermelho** (fail 2) | A20: cancel e DELETE de cheque registered VINCULADO → 422 cheque_linked_unlink_f |
| A21 | remover a leitura da porta cheque-pending-reader (título) | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 1) | A21: PATCH {amount} e DELETE do título com cheque pendente → 422 title_has_pendi |
| A22 | apagar o INSERT INTO role_permissions da migração | b-san3-12a-permissions-migration-drill-db.test.ts | **vermelho** (fail 2) | A22 (a): deploy real numa base própria → as 2 chaves existem; com os papéis de s |
| A23 | agrupar o dia por toISOString (UTC) na memória | b-san3-12a-entries-aggregate.test.ts | **vermelho** (fail 1) | A23 (memória): 2026-10-31T23:30-03:00 cai em 2026-10 (mês) e 2026-10-31 (dia); 2 |
| A23-db | agrupar o dia em UTC no Postgres | b-san3-12a-aggregate-tz-db.test.ts | **vermelho** (fail 1) | A23 (db): virada de mês e de dia no fuso do negócio — 2026-10-31T23:30-03:00 → 2 |
| A25-mem | vincular no create fora da unidade → contador 0 | b-san3-12a-pay-pending-cheque.test.ts | **vermelho** (fail 1) | A25 (memória): vincular cheque roda em UMA unidade (create e PATCH) — contador d |
| Rres2 | não exigir motivo no bounce de cheque vinculado | b-san3-12a-unlink-title.test.ts | **vermelho** (fail 1) | R-res-2: bounce deposited→bounced de cheque VINCULADO sem motivo → 400 bounce_re |

## E5 — o censo de `reason` (F8), por comando

`python` sobre `git show 8a7885f4:<arquivo>` de `src/modules/{financial-entries,financial-titles,financial-accounts,cheques,financial-summary}/**/*.ts`
com os padrões `Error\(\s*\d{3},\s*"[A-Z_]+",\s*"([a-z_]+)"` (multi-linha), `(?:invalid|unprocessable)\(\s*"([a-z_]+)"` e `overflowReason:\s*"([a-z_]+)"`
→ **61** `reason` na base, **37** ausentes de `API_CONTRACTS.md`. O 12a escreveu no contrato 11 deles (a lista fechada do que a tela
traduz) e todos os seus novos; ficam **26** congelados em `tests/b-san3-12a-reasons-census.test.ts` (só encolhem; pendência
`P-SAN3-12-REASONS-SEM-CONTRATO`, escopo `pre-existente`). Novos do bloco: os 12 do §4.1 + `bounce_reason_required`, `invalid_group_by`
(e os dinâmicos `invalid_from`/`invalid_to`, documentados) — **F9**: fora da lista de 32 da tela, declarados no contrato.

## E6 — bateria do §9.2, no head (Windows, Node 20.19.5; Postgres 16 descartável `dev-san312a-pg`, `127.0.0.1:55412`)

Roteiro: `C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/san312a/battery.sh`
(logs por passo em `C:/Users/AMP/w-san312a-bat/`).

| Passo | Resultado |
|---|---|
| `npm run check` · `npm run lint` · `npm run build` | ec=0 · ec=0 · ec=0 |
| módulos financeiros (`financial-entries`, `cheques`, `financial-summary`, `financial-titles`, `financial-accounts`) | 227 · pass 226 · **fail 1** = A16 serviço em memória (**F4**) |
| `tests/b-san3-12a-*.test.ts` (memória, 5 arquivos) | **48/48** |
| guards de catálogo + chamadores do `reconcile` (sem banco) | 89 · pass 86 · fail 3 = `core-saas-role-authority` sem `DATABASE_URL` (ambiente, igual à base) + P7 ×2 (**F2**) |
| `core-saas-role-authority` com banco | 12 · pass 11 · **fail 1** = snapshot de `super_admin`/`platform_admin` (**F5**) |
| `-db` A: drill da migração + corridas + fuso + `financial-entry-reverse-restore-db` | **19/19** |
| `db:provision-rbac` (aplicar) → `permission-catalog-db-parity` (`RBAC_DB_PARITY=1`) | convergiu (12 papéis, 912 concessões) → **2/2** |
| `-db` B: recusa da baixa, CAS, agregado + `cheque-title-link-atomic-db` + `financial-pay-title-atomic-db` | 29 · pass 27 · **fail 2** = `K2-db parcial` e `K2-db pago antes do clear` (**F1**, `cheque-title-link-atomic-db`) |
| `provision-rbac --dry-run` | 0 a criar · 912 concessões já existiam · nada escrito |
| `audit-security` (com banco) | 1/1 |
| `git diff --check 8a7885f4 HEAD` | limpo |

**`npm test` base × head, cada um num banco FRESCO migrado (forma do job `backend`: memória + `DATABASE_URL` migrado sem seed; `REDIS_URL`
inalcançável nos dois):**
- base `8a7885f4` (worktree limpo `C:/Users/AMP/w-s312b`, banco `erp_san312a_base`): `340 arquivos · 3924 testes · pass 3906 · fail 16 · skipped 2`;
- head (banco `erp_san312a_head`): `351 arquivos · 3995 testes · pass 3966 · fail 27 · skipped 2` (+71 testes: os 69 dos 11 arquivos novos + 2 em `financial-summary`).
- **Vermelhos SÓ no head = 13, e são exatamente F1–F5:** `cheque-title-link.test.ts` ×5 e `cheque-title-link-atomic-db.test.ts` ×2 (F1),
  P7 ×2 (F2), censo T1/T14 (F3), A16 em memória (F4), snapshot (F5). Os demais vermelhos são os MESMOS da base (Redis inalcançável,
  drills de migração/`san3-09`/`B-SAN3-05` neste Windows) — ambiente, não o bloco. Só na base (2, flutuação de drill):
  `work-order-invoicing-migration-drill-db` e `[atômica · controle 2]`.
- Uma 1ª rodada do head no banco SUJO (o das suítes do bloco, com papéis provisionados) deu fail 39 — os 26 a mais sumiram no banco
  fresco (`o6r07c-b-scope-db` 13/13, `o6r07c-subresource-scope-db` 6/6, `financial-title-status-cas-db` 9/9, `traccar-position-ingestion-db`
  22/22 isolados); descartada como contaminada pelo estado do banco.

## E7 — resumo para quem decide

- **Bateria do bloco:** check/lint/build verdes; testes do 12a **48/48 (memória) + 30/30 (-db: 19 + 4 + 3 + 3 + 1)**; mutações **35/35 vermelhas**.
- **Vermelhos restantes = 13**, todos em arquivos FORA do PERMITIDO (F1–F5), nenhum tocado. O PR fica em **rascunho**; o merge
  depende da emenda do plano (`P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`). Arquivos que a emenda precisa nomear: `tests/cheque-title-link.test.ts`,
  `tests/cheque-title-link-atomic-db.test.ts`, `tests/financial-uow-journal-classification.test.ts` (além da l.326),
  `tests/fixtures/o6r07c-classificacao-vias.json` (regenerado pelo gerador), `src/modules/financial-summary/financial-summary.repository.ts`,
  `tests/fixtures/role-catalog-contract.snapshot.json` (super_admin/platform_admin).
- **Riscos residuais para a junta** (os do plano, com o que foi medido): R-res-1 (vínculo × clear sem deadlock — o vínculo toma
  título → cheque, sem trava de período; o A4/A5-bis `-db` terminam sem `deadlock detected`); R-res-2 (bounce exige motivo e é auditado,
  segue sem privilégio — `P-SAN3-12-BOUNCE-COMO-DESVIO`); R-res-3 (medido no A5-bis); R-res-4 (não exercido — `P-SAN3-12-CAS-VERSION-COLUMN`);
  R-res-5 (o SQL do agregado filtra `tenant_id` E roda em `withTenantRls`; o banco do teste é superusuário, logo a camada RLS sozinha
  NÃO foi medida aqui); PATCH com `cheques:unlink_title` também desvincula SEM justificativa (o plano só pede o 403 a quem não tem; a
  junta decide se o único caminho com justificativa deve ser o `unlink-title`).

## E8 — limpeza (§C5)

Worktree da base `C:/Users/AMP/w-s312b` removido por `git worktree remove --force`; container `dev-san312a-pg` removido (com os bancos
`erp_san312a`, `_base`, `_head` e os de drill, que já tinham sido derrubados pelos testes). O worktree do bloco `C:/Users/AMP/w-san312a`
FICA (o ramo continua depois da emenda). Logs fora do repositório em `C:/Users/AMP/w-san312a-*`.

---

## E10 — retomada pelas Emendas E1 e E1-bis (2026-10-25, mesmo dev `dev-san312a-opus`, Claude Opus declarado)

Fonte: `docs/revisoes/SAN3/B-SAN3-12-plano.md` (E1 l.670+, E1-bis l.837–937; copiadas verbatim do arquivo do planejador) e
`docs/revisoes/SAN3/B-SAN3-12a-E1-critica.md`. Ordem seguida (E1b.6): A27 → D1 → F1 (+A28) → F2 → F4 → F5 → F3 → B2 → registro →
mutações → B1. Terreno: o mesmo worktree (HEAD de partida `fafd4b36`, limpo) e Postgres 16 descartável NOVO `dev-san312a-pg2`
(`127.0.0.1:55413`; base viva intocada). Docker: além da base viva, só `agv3-proxy` (pré-existente) e o meu.
Nota de terreno: a máquina estava carregada (outros worktrees com `tsc`/`npm ci` em paralelo; `npx tsc --noEmit` levou 19 min numa
das medições) — os tempos de execução abaixo não são comparáveis aos do E6.

| Item | Onde | Prova (comando → saída) |
|---|---|---|
| **A27** (CAS do título lido) | `cheque.types.ts` (`expectedTitleId?` em `UpdateChequeInput`/`TransitionChequeInput`; `ChequeTitleGuard`), `cheque.repository.ts` (`titleMatches` dentro do check-and-set síncrono; `softDelete(…, guard?)`), `cheque-prisma.repository.ts` (`titleCas` no `WHERE` de `update`/`transition`/`softDelete`), `financial-uow.ts` (`journaledCheques.softDelete` repassa a guarda), `cheque.service.ts` | `tests/b-san3-12a-link-toctou-db.test.ts` (novo, barreira por `application_name`, vencedor por SQL em transação aberta): **5 · pass 5 · fail 0 · skipped 0** — A27-a PATCH → 409 `cheque_write_conflict`, A27-b cancel → 409 `transition_conflict`, A27-c DELETE → 409 `cheque_write_conflict`, FINAL vinculado a T1, pix em T1 → 422, controle sequencial 403; A27-d controle; A27-f 5 rodadas sem barreira: perdedores `cheque_write_conflict ×5`, nunca dois 200. Memória (A27-e, `tests/b-san3-12a-unlink-title.test.ts`): **15 · pass 15 · fail 0 · skipped 0** |
| conferência obrigatória | `grep -n "transition(\|softDelete(\|\.update(" src/modules/cheques/cheque.service.ts` | só o 1º vínculo (`ctx.cheques.update({ ...input, expectedTitleId })`), o `delete` (`softDelete(…, { expectedTitleId })`) e o `cancel` (`flipOnly(…, casOnTitle=true)`) passam o título lido; o `update` sem título, o `deposit`, o `clear`/`bounce` (`moveMoneyInUnit`) não |
| **Falsificação pequena da E1-bis, resolvida sem remédio novo** | `throwChequeWriteConflict` | a E1-bis diz "409 `cheque_write_conflict` (já existe: `throwChequeWriteConflict`)"; medido: ele lançava **422 `cheque_not_editable`** (ou 404). Passou a reler e distinguir: sumiu → 404; saiu de `registered` → 422 (o caso sequencial do #456, K10 inalterado); continua `registered` com título ≠ do lido → **409 `cheque_write_conflict`**. Declarado para a junta |
| **D1** | `cheque.service.ts` (`update`) | sem o privilégio 403; com o privilégio **422 `cheque_linked_unlink_first`** (A6-bis no `b-san3-12a-unlink-title`; K1 reescrito) |
| **F1 (+A28)** | `tests/cheque-title-link.test.ts` (só K1 l.98, K2 l.170/189/204, K3 l.229), `tests/cheque-title-link-atomic-db.test.ts` (só K2-db l.65/l.80) | memória **38 · pass 38 · fail 0 · skipped 0**; `-db` **15 · pass 15 · fail 0 · skipped 0**; nenhum caso apagado (nomes reescritos dizem a regra nova); A28: título pago pelo repositório (`applyPaymentGuarded`) / por SQL commitado → `clear` 422 `title_already_paid`, 0 (memória) / só o do vencedor (Postgres) lançamento |
| **F2** | `tests/financial-uow-journal-classification.test.ts` (só `CHEQUE_CALLS`/`PREPARES`/`READ_RETURN_NONEMPTY` de `findPendingByTitle` e a contagem 39 → 40) | **46 · pass 46 · fail 0 · skipped 0** |
| **F4** | `src/modules/financial-summary/financial-summary.repository.ts` (só a projeção: `titleId: c.titleId ?? null`) | `tests/financial-summary.test.ts` **15 · pass 15 · fail 0 · skipped 0**; paridade memória × Prisma de `cheques.*` em `tests/b-san3-12a-pay-pending-cheque-db.test.ts` (caso A16 db) — **5 · pass 5 · fail 0 · skipped 0** |
| **F5** | `tests/fixtures/role-catalog-contract.snapshot.json` (`super_admin` e `platform_admin` +2, nas posições do catálogo) | `core-saas-role-authority` + `core-saas` com banco: **38 · pass 38 · fail 0 · skipped 0**; tamanhos medidos `super_admin 200 · platform_admin 200 · tenant_admin 187` |
| **F3** | `tests/fixtures/o6r07c-classificacao-vias.json` só por `node --import tsx tests/helpers/o6r07c-census.ts gravar …` | gerador: `chaves vivas: 471 · VIOLAÇÕES: 0`; `git diff --stat` = `12 ++++++++++++`, exatamente as 3 entradas (`GET …/aggregate` LEITURA n 1; `GET …/reconciliation-policy` LEITURA n 1; `POST /cheques/:chequeId/unlink-title` SEM-ALCANCE-CAMPO n 1); `tests/o6r07c-census-guard.test.ts` **32 · pass 32 · fail 0 · skipped 0** (uma 1ª rodada sob carga estourou o tempo do censo — 16 vermelhos de tempo — e foi refeita sem o `timeout` curto) |
| **E1.F6** | `scripts/provision-rbac.ts` | não tocado (saiu do PERMITIDO); 1 linha em `P-RBAC-PROVISION-DESCRICOES` |
| **Contrato/matriz** | `API_CONTRACTS.md` (D1 + os 409 do A27), `RBAC_MATRIX.md` (l. dos cheques) | — |
| **Registro** | `pendencias.md` (emenda e critério B1 em `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`; novas `P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE` e `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`, `pre-existente`), `decisoes.md` (D1, A26, A27, F5 como leitura do planejador), índice regenerado (635 cabeçalhos · 479 abertas), `status-geral.md` | — |

## E11 — mutações da E1/E1-bis (uma a uma, restauro por hash; roteiro `…/scratchpad/san312a/mutations2.py`, saída `C:/Users/AMP/w-san312a-mutations2.json`)

**17 de 17 conformes** (16 vermelhas no caso do critério + a variante "só o fast-fail" da M2, que fica VERDE como a E1-bis previu: a trava
sob o lock segura). `git status --porcelain -- src prisma` vazio ao fim. Mais a do A5-bis reescrito (tirar `title_id = <lido>` do `WHERE`
do `unlinkTitle` no Prisma) → `not ok 6 A5-bis (db, CAS)` · 6 · pass 5 · fail 1 · skipped 0, restaurado.

| id | mutação | teste | esperado | resultado | conformidade |
|---|---|---|---|---|---|
| A27a-db | tirar o title_id lido do WHERE do update (Prisma) | b-san3-12a-link-toctou-db.test.ts | vermelho | **vermelho** · 5 · pass 3 · fail 2 · skipped 0 | conforme |
| A27b-db | tirar o title_id lido do WHERE do transition (Prisma) | b-san3-12a-link-toctou-db.test.ts | vermelho | **vermelho** · 5 · pass 4 · fail 1 · skipped 0 | conforme |
| A27c-db | tirar o title_id lido do WHERE do softDelete (Prisma) | b-san3-12a-link-toctou-db.test.ts | vermelho | **vermelho** · 5 · pass 4 · fail 1 · skipped 0 | conforme |
| A27e-mem | tirar a comparação de expectedTitleId do check-and-set em memória | b-san3-12a-unlink-title.test.ts | vermelho | **vermelho** · 15 · pass 12 · fail 3 · skipped 0 | conforme |
| D1 | apagar o ramo do 422 do PATCH privilegiado | b-san3-12a-unlink-title.test.ts, cheque-title-link.test.ts | vermelho | **vermelho** · 53 · pass 51 · fail 2 · skipped 0 | conforme |
| M2-ambas | remover o fast-fail assertPayable do clear E trocar o throw do título pago sob a trava por return | cheque-title-link.test.ts | vermelho | **vermelho** · 38 · pass 37 · fail 1 · skipped 0 | conforme |
| M2-ambas-db | idem, no Postgres | cheque-title-link-atomic-db.test.ts | vermelho | **vermelho** · 15 · pass 13 · fail 2 · skipped 0 | conforme |
| M2-so-fastfail | remover SÓ o fast-fail do clear (a trava sob o lock segura) | cheque-title-link.test.ts | verde | verde · 38 · pass 38 · fail 0 · skipped 0 | conforme |
| F7-wrapper-entries | apagar o wrapper de details do controller de lançamentos | b-san3-12a-unlink-title.test.ts | vermelho | **vermelho** · 15 · pass 14 · fail 1 · skipped 0 | conforme |
| F7-wrapper-cheques | apagar o wrapper de details do controller de cheques | b-san3-12a-unlink-title.test.ts | vermelho | **vermelho** · 15 · pass 14 · fail 1 · skipped 0 | conforme |
| B2-tenant-em-details | pôr o tenant no details do 422 da baixa | b-san3-12a-unlink-title.test.ts | vermelho | **vermelho** · 15 · pass 14 · fail 1 · skipped 0 | conforme |
| A1-ambas | remover as duas checagens da baixa | b-san3-12a-pay-pending-cheque.test.ts, cheque-title-link.test.ts | vermelho | **vermelho** · 53 · pass 47 · fail 6 · skipped 0 | conforme |
| A6 | remover a guarda do título atual no PATCH | b-san3-12a-unlink-title.test.ts, cheque-title-link.test.ts | vermelho | **vermelho** · 53 · pass 49 · fail 4 · skipped 0 | conforme |
| A19 | comparar com > em vez de igualdade no valor exato | b-san3-12a-pay-pending-cheque.test.ts, cheque-title-link.test.ts | vermelho | **vermelho** · 53 · pass 48 · fail 5 · skipped 0 | conforme |
| A21 | remover a leitura da porta cheque-pending-reader (título) | b-san3-12a-pay-pending-cheque.test.ts, cheque-title-link.test.ts | vermelho | **vermelho** · 53 · pass 51 · fail 2 · skipped 0 | conforme |
| A17bis | criar reason novo sem contrato | b-san3-12a-reasons-census.test.ts | vermelho | **vermelho** · 4 · pass 2 · fail 2 · skipped 0 | conforme |
| Rres2 | não exigir motivo no bounce de cheque vinculado | b-san3-12a-unlink-title.test.ts | vermelho | **vermelho** · 15 · pass 14 · fail 1 · skipped 0 | conforme |

## E12 — bateria (B2: todo passo com `tests · pass · fail · skipped`, lido do TAP; roteiro `…/scratchpad/san312a/battery2.sh`, logs `C:/Users/AMP/w-san312a-bat2/`)

| Passo | ec | tests · pass · fail · skipped |
|---|---|---|
| check · lint · build · provision-rbac `--dry-run` · `git diff --check 8a7885f4 HEAD` | 0 · 0 · 0 · 0 · 0 | (sem TAP) |
| módulos financeiros (5 arquivos) | 0 | 227 · pass 227 · fail 0 · skipped 0 |
| `b-san3-12a-*` em memória (5 arquivos) | 0 | 51 · pass 51 · fail 0 · skipped 0 |
| guards da E1 (`cheque-title-link`, arnês P7, migration-parity, `core-saas`, period-closes) | 0 | 126 · pass 126 · fail 0 · skipped 0 |
| `core-saas-role-authority` com banco (sem `prisma`) | 0 | 12 · pass 12 · fail 0 · skipped 0 |
| `-db` A (drill, corridas, fuso, reverse-restore, **link-toctou**) | 1 | 24 · pass 23 · fail 1 · skipped 0 — o 1 era o A5-bis CAS ainda trocando pelo PATCH (D1); corrigido no `a0b8f4be` e re-rodado: 6 · pass 6 · fail 0 · skipped 0 |
| `db:provision-rbac` → `permission-catalog-db-parity` (`RBAC_DB_PARITY=1`) | 0 | 2 · pass 2 · fail 0 · skipped 0 |
| `-db` B (recusa, CAS, agregado, `cheque-title-link-atomic-db`, `financial-pay-title-atomic-db`) | 0 | 30 · pass 30 · fail 0 · skipped 0 |
| `audit-security` **COM banco** (B2) | 0 | 1 · pass 1 · fail 0 · skipped 0 |
| `o6r07c-census-guard` (isolado) | 0 | 32 · pass 32 · fail 0 · skipped 0 |

## E13 — B1 (critério de fechamento da `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`)

**(1) CI no head `a0b8f4be`** (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/a0b8f4be…/check-runs`): `backend completed success`
(job 121208746478: `352 arquivo(s) · 4013 teste(s) · pass 4011 · fail 0 · skipped 2`), `backend-postgres completed success` (job
121208746575: `# tests 493 · pass 493 · fail 0 · skipped 0`, "testes pulados: 0"), frontend/flutter/owner-portal/authority-portal success,
docker em andamento na leitura. Nota: no head anterior `f458f3a1` o `backend` falhou com 4 vermelhos — o A5-bis (corrigido) e T0/T12/"tempo
do censo" do `o6r07c-census-guard` por `semente incompleta` (o `POST /operations/dispatches` do censo estourou o `AbortSignal.timeout(4000)`
sob carga); no `a0b8f4be` o mesmo job passou inteiro, e isolado o censo dá 32/32 — flutuação de tempo, registrada.

**(2) base × head normalizado por script** (`…/scratchpad/san312a/normaliza.py`: chave = `tests/<arquivo>` lido do `location` do TAP + nome do
caso, sem o prefixo do worktree; saída `C:/Users/AMP/w-san312a-b1-listas.txt`). Base `8a7885f4` (worktree limpo, banco fresco, E6):
`340 arquivos · 3924 · pass 3906 · fail 16 · skipped 2`. Head (`a0b8f4be`, banco fresco `erp_san312a_fresh2`): `352 · 4005 · pass 3987 · fail 16 · skipped 2`.
- **só no head — N=1:** `tests/traccar-position-ingestion-db.test.ts :: ingestão: tempo esgotado → 503 e, depois do fim do trabalho, 0 posição, 0 recibo e 0 evento`.
  Causa: teste de TEMPO do Traccar (módulo que o bloco não toca); o caso irmão do mesmo arquivo ("…quarentena interna e conflito…") está
  na lista "nos dois lados"; o arquivo isolado no head deu `22 · pass 22 · fail 0 · skipped 0`, e passou na CI (`backend` 0 fail). **O "= 0"
  da letra do B1 NÃO foi atingido nesta máquina carregada** — declarado; a 1ª rodada fresca do head teve 6 só-head (o A5-bis, já corrigido,
  e 5 de tempo/carga: Traccar ×3, drill do Traccar [T-M(a)], `o6r07c-b-scope-db` FORCE RLS), todos verdes isolados (13/13, 22/22, 5/5) e na CI.
- **só na base — N=1:** `tests/o6r07c-b-scope-db.test.ts :: [atômica · controle 2]` (flutuação; verde no head).
- **nos dois lados — N=11, com causa:** `domain-events` ×2, `job-queue` ×3 e `worker-heartbeat` ×1 — Redis inalcançável (`REDIS_URL=redis://127.0.0.1:1`,
  a base viva não é alvo); `traccar-event-migration-drill-db` (arquivo) e `work-order-invoicing-migration-drill-db` (arquivo) — drill que invoca o
  shim bash de `node_modules/.bin/prisma` com `node` no Windows (`P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`); `san3-09 T2` — bootstrap em banco de
  drill (mesma família, Windows); `san3-05` — RLS do papel de runtime (medido na CI); `traccar-position-ingestion-db` "quarentena interna…" — tempo.
- **skipped:** base 2 · head 2 · pulados só no head **0** (B2).

**(3) T2.1 medido à mão** no descartável só migrado (`erp_san312a_t21`): `roles=0 · role_permissions=0 · permissions=4
(checklist_runs:reopen, cheques:unlink_title, financial_entries:unreconcile, work_orders:approve) · super_admin_grants=0` ⇒ o
`bootstrap-platform-admin` recusa `RBAC_NOT_PROVISIONED` (a propriedade do T2.1); a convergência real vem do `db:provision-rbac` (E12).

## E14 — estado e limpeza

Head `a0b8f4be` + este registro. PR #459 sai de rascunho (`gh pr ready 459`) por ordem do orquestrador; a pendência
`P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` fica ABERTA para o porteiro/orquestrador fechar pelo B1 (o item (2) tem 1 só-head de tempo, declarado acima).
Limpeza: container `dev-san312a-pg2` removido (com os bancos `erp_san312a`, `_t21`, `_fresh2`); worktree `C:/Users/AMP/w-san312a` mantido.
