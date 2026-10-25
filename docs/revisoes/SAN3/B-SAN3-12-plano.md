# B-SAN3-12 — Web financeiro: BAIXA do título, CONTA com EXTRATO e CONCILIAÇÃO (3 aparências) — **PLANO v3 (final)**

> **Papel:** `planejador-mestre` (TOPO). **Modelo efetivo:** Fable 5.1 (`claude-fable-5-1`), o do frontmatter — sem
> fallback. **Data:** 2026-10-24. **Ref medida:** `origin/main` `7ab2fe71d0d40c2be51a790f0d20893651cdf972` (worktree
> só-leitura `C:/Users/AMP/w-plan21`, detached) e, para a regra do cheque, `origin/fix/cheque-x-baixa` `a0f5aabc` (PR
> #456, **não mergeado**; merge-base = `7ab2fe71`). Nada foi editado, nada rodou contra a base viva, sem Docker.
> **Itens do portão:** #28 `P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` e #55 `P-WEB-CONCILIACAO-SEM-TELA` + CE-4
> (`docs/revisoes/SAN3/PLANO_SAN3.md:147, :163, :268, :327`). **Risco:** DINHEIRO + PERMISSÃO → junta completa,
> **unanimidade de 3** (§C7.1-ter(b)); teto de 2 ciclos (`D-GOV-PROPORCIONAL`); `critico-adversarial` ataca este plano.
> **Versão:** **v3 (final)** — 2026-10-25. Responde à crítica r2 (Claude Opus, a última rodada; seção própria abaixo): **todos os 5 bloqueantes e os 5 ajustes viram requisito explícito com critério e mutação**; o dono decidiu R2-01, R2-03 e R2-04 (apêndice no fim). **Ref medida agora:** `origin/main` **`37a3f360`** = o **PR #456 MERGEADO** (`mergedAt 2026-10-25T03:21:54Z`); o que o §0.2 chamava "ramo do #456" é hoje **fato da `main`** (`git diff --stat a0f5aabc bb3cbd6c -- src tests prisma` vazio, medido pelo crítico; o worktree `w-plan21` está detached em `37a3f360`). Não haverá rodada 3 de crítica: o próximo leitor é o dev do 12a. **Estado:** COMPLETO (P1/P2). Cópia versionada prevista: `docs/revisoes/SAN3/B-SAN3-12-plano-v3.md` (no PR do 12a).

## Resposta à crítica r1 (2026-10-24) — achado por achado, com re-execução própria (P3)
Crítica: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-12-critica-r1.md` (crit-san312-pro, Gemini 3.1 Pro CLI, crítico **de leitura** — não roda `npm`). Veredito: VOLTA AO PLANO
(1 bloqueia · 1 ajuste · 2 notas positivas). Re-executei o que o terreno permite (leitura por `git show` no ramo do #456 e `git grep` na `main`; sem `npm ci` no worktree, sem Docker).
A `main` avançou `7ab2fe71 → c76ec481` só em `Kpis/*` (`git diff --stat 7ab2fe71 origin/main` → 4 arquivos, todos `Kpis/`): **todas as medições do §0 continuam válidas**. O #456 segue `OPEN`, `mergedAt: null`.

| Achado | Gravidade | Re-execução própria (comando → saída) | Decisão | O que mudou no plano |
|---|---|---|---|---|
| **CRIT-12-03** — a mutação do A1 ("remover a chamada a `findPendingByTitle` no fast-fail") não derruba o teste: o re-check dentro da tx devolve o mesmo 422 | bloqueia | `git show origin/fix/cheque-x-baixa:src/modules/financial-entries/financial-entry.service.ts \| sed -n 424,476p`: ordem real = `assertPayable` → `currencyMismatch` → `cheque_required` → **`assertPeriodOpen` (fora da tx)** → `uow.run` → `assertPeriodOpenShared` → `entries.create` → `applyPaymentGuarded`. Logo, tirando **só** o fast-fail, um título com cheque pendente **e período fechado** responde `period_closed`, não `title_has_pending_cheque`; e sem período fechado o re-check devolve o mesmo 422 — o crítico está certo: a mutação do A1 como estava não muda a resposta HTTP no caso simples | **ACEITO** | §8.1: **uma mutação por mecanismo, cada uma observável por HTTP**: A1 (existência do 422) → mutação = remover **as duas** checagens; A3 (precedência) → mutação = remover **só o fast-fail**, com fixture "cheque pendente + período fechado" (o 422 vira `period_closed`) — molde `tests/cheque-title-link.test.ts:270` ("K4: cheque_required precede período fechado"); A4 (corrida `-db`) → mutação = remover **só o re-check**. A1 ganha ainda a asserção "nenhuma transação abre" (contador de `uow.run` no UoW em memória, `financial-uow.ts:91-106`), que também fica vermelha sem o fast-fail. §4.2 passa a dizer **para que serve cada checagem** (fast-fail: precedência pública e nenhuma tx aberta; re-check: a corrida) |
| **CRIT-12-02** *(v3: o mecanismo mudou de `expected_updated_at` para CAS por **estado lógico**, R2-05 — ver §4.6)* — o CAS do `reconcile` ficou opcional (`expected_updated_at` ausente → 200 cego, como hoje): dois clientes que omitem o campo sobrescrevem às cegas | ajuste | `git grep -n -E "reconcile\|financial-entries" origin/main -- mobile/flutter_app/lib frontend/src owner-portal authority-portal` (excluídos `reconciled`/status/test) → **0 linhas**: nenhum cliente chama `PATCH /reconcile` hoje; tornar o campo obrigatório **não quebra ninguém** (o contrato é versionado em `API_CONTRACTS.md`) | **ACEITO** | §4.6: `expected_updated_at` passa a ser **OBRIGATÓRIO** — ausente/inválido → **400 `expected_updated_at_required`**; defasado → 409 `reconciliation_stale`; o `WHERE` do `updateManyAndReturn` inclui `updated_at = expected` (CAS no banco, não só no serviço). Vale para conciliar **e** desconciliar (mesma rota). §4.1 soma o 400 à lista fechada (**20** códigos); §8.1 A13 e §8.2 F4/F10 atualizados; §1 passo 7 reescrito |
| CRIT-12-01 — `unlink-title` × `clear` são seguros por CAS na mesma tabela (`cheques`); `reserved.titleId` vem do UPDATE | nota (positivo) | conferido no mesmo `git show`: `clear` usa `reserved.titleId` devolvido pelo CAS (`cheque.service.ts:305-320`) — se o unlink venceu, `titleId` é `undefined` e nada liquida o título; se o clear venceu, o unlink casa 0 linhas (`status` já `cleared`) → 409 | registrado | nada a mudar; a propriedade vira teste explícito **A5-bis** (corrida `unlink × clear`, `-db`), porque "seguro por leitura" ainda não é "seguro por execução" |
| CRIT-12-04 — a divisão 12a → 12b → 12c não deixa estado inseguro na `main` (o front de hoje não consome as rotas) | nota (positivo) | §0.3 remedido na `main` nova: `git grep` → 0 chamadores | registrado | nada a mudar |

**Riscos residuais que a r1 não atacou (para a junta, não para o crítico):** (i) a leitura `findPendingByTitle` dentro da tx é READ COMMITTED — enxerga o cheque `deposited` de um `clear` ainda não commitado como **pendente** (recusa; fail-closed) e um `clear` já commitado como `cleared` (segue; o CAS do título guarda) — A4 mede as duas janelas; (ii) `expected_updated_at` obrigatório transfere ao front a disciplina de **reler antes de salvar** (F3/F10 já exigem); (iii) a política por `tenant-settings` depende de o validador da chave existir **antes** de o serviço a ler (A12 antes de A9 na ordem do dev).

## Resposta à crítica r2 (2026-10-25) — a última rodada; cada achado vira requisito
Crítica: `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-12-critica-r2.md` (`crit-san312-opus-r2`, Claude Opus — substituição declarada; **executou** sondas em worktree próprio: `probe.ts`, `parity.ts`, `tz.ts`).
Re-execução própria (P3), no que o terreno permite (sem `npm ci`): li em `37a3f360` cada arquivo:linha que a crítica cita e as três sondas; onde a crítica **executou** (guards vermelhos, P1–P3, tz), aceito o
resultado e confiro a premissa no código. **Decisões do dono (25/10, literais, apêndice no fim):** R2-03 *"Só cheque do valor exato (Recomendado)"*; R2-04 *"Mesmo privilégio da troca (Recomendado)"*; R2-01 *"Autorizo (Recomendado)"*.

| Achado | Grav. | Re-execução / conferência própria | Decisão | Onde virou requisito |
|---|---|---|---|---|
| **R2-01** permissão nova sem migração quebra 3 guards | bloqueia | `permission-catalog-migration-parity.test.ts:294,313-343` exige SQL em migração para toda chave fora da linha de base congelada (189); `core-saas.test.ts:257` compara com `expectedPermissionCatalog`; `core-saas-role-authority.test.ts:89-111` compara com o snapshot. A H2 da v1 olhava só o provisionamento — **errada** para produção (`deploy` sem seed) | **ACEITO** (dono autorizou a migração de dados) | §5.1 (migração `20260882000000_…`, drill, guards), §7.1 (ampliações), A22 |
| **R2-02** A4 sem mutação observável; a corrida real é `pay × vincular` | bloqueia | conferido: o conjunto pendente só cresce por `create`/`update` com `title_id` (`cheque.service.ts:113-133`, `:144-167`); o vínculo é `assertPayable` sem trava + `UPDATE cheques` (`:388-406`); `clear × pay` resolve no fast-fail ou em `title_already_paid` | **ACEITO** | §4.2 (vincular em `uow.run` com lock do título; o re-check fecha `pay × vincular`); A4 reescrito, A4-bis, A25 |
| **R2-03** cheque parcial → R$ 140 num título de R$ 100 | bloqueia | sonda P1 do crítico reproduz; `validateTitleLink` só exige `amount ≤ saldo` | **ACEITO** (dono: valor exato) | §4.2 (`cheque_amount_mismatch`), §4.3 (título com cheque pendente não muda `amount` nem é apagado), A19, A21, F21; pendência `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE` |
| **R2-04** cancelar/excluir contorna a troca | bloqueia | sonda P2 reproduz; `cancel`/`delete` exigem só `cheques:update` (`cheque.routes.ts`; `flipOnly :350`, `assertEditable :372`) | **ACEITO** (dono: mesmo privilégio) | §4.3 (`cheque_linked_unlink_first` para todos; o privilégio vive num write-path só), A20 |
| **R2-05** CAS por `updated_at` em ms não garante 409 | ajuste | `financial-entry.repository.ts:258` carimba `new Date()`; `reconcile` não passa pelo `uow.run` (`service :399`); sonda P3: 290/300 no mesmo ms | **ACEITO** | §4.6 (CAS por estado lógico `reconciled` + `reconciled_at`, obrigatório; `reconcile` em `uow.run`), A13, F22; ABA residual em R-res-4 |
| **R2-06** agregado em UTC × competência no fuso do negócio | bloqueia | `business-time.ts:10-31` (`BUSINESS_TIMEZONE`), `:37-44` (`deriveBusinessDate`); `financial-summary.compute.ts:75-99`; sonda `tz.ts` | **ACEITO** | §4.5 (mês = `competencia`; dia = `deriveBusinessDate` / `AT TIME ZONE`), A23, A24 |
| **R2-07** `findPendingByTitle` não compila sem `financial-uow.ts` | ajuste | `CHEQUE_REPO_KIND … satisfies Record<keyof ChequeRepository, …>` (`financial-uow.ts:221-232`) e `journaledCheques` (`:357`) são exaustivos por tipo | **ACEITO** | §7.1 ampliação nominal |
| **R2-08** validador por chave exige o serviço | ajuste | `upsert` chama `parseValue(body.value)` sem a chave (`tenant-setting.service.ts:40-50`) | **ACEITO** | §7.1 ampliação (`upsert`), A12 |
| **R2-09** CAS obrigatório quebra 2 testes fora do escopo | ajuste | `financial-period-closes.test.ts:141`, `financial-entry-reverse-restore-db.test.ts:342` chamam `reconcile` sem o estado; clientes: 0 (confirma a v1/v2) | **ACEITO** | §4.6, §7.1 (os 4 arquivos de teste) |
| **R2-10** incoerências v2 (CAS "opcional" no §3; F18 "200 sem CAS"; 20/31/27 códigos; `RBAC_MATRIX.md:128`) | ajuste | conferidas uma a uma | **ACEITO** | §3, F18, §4.1 (lista enumerada: **32**, derivada), §7.1 (`RBAC_MATRIX.md` l.128/130 + registro §A2) |
| **R2-11** Financeiro sem delegação não estorna/exclui conciliado | nota | `entry_reconciled` em `delete`/`reverse` (`financial-entry.service.ts:250-262`, `:304-317`) | **ACEITO como regra explícita** (consequência, não regra nova — sem pergunta) | §4.4, F20 |
| **R2-12** o que resistiu (portas de liquidação, `unlink × clear`, delegação fail-closed, estado intermediário) | positivo | — | registrado | A5-bis mantém `unlink × clear` como execução |

**Refutações:** nenhuma. **Hipótese H2 reclassificada:** "sustentada para o catálogo" → **derrubada para produção** (o caminho real é a migração; o provisionamento é convergência de ambientes que o rodam).

## §0 — MEDIDO × HIPÓTESE
> **v3:** tudo abaixo foi medido em `7ab2fe71`/ramo `a0f5aabc` e **re-conferido em `37a3f360`** (a `main` com o #456): os números de linha de `cheque.service.ts` citados nas emendas v3 são os da `main` (`create :113`, `update :144`, `delete :169`, `cancel :183`, `clear :193`, `bounce :226`, `flipOnly :350`, `assertEditable :372`, `validateTitleLink :388`). H1 **resolvida** (o #456 entrou).
Convenção: **M** = medido (comando → saída); **H** = hipótese (com o comando que a derruba). Tudo em `C:/Users/AMP/w-plan21`
(`git rev-parse HEAD` → `7ab2fe71…`); o ramo do #456 por `git show origin/fix/cheque-x-baixa:<caminho>` (`a0f5aabc`; `git merge-base`
= `7ab2fe71`, logo o ramo é a `main` + 10 commits do B-SAN3-20). `gh pr view 456` → `state: OPEN`, `mergeable: MERGEABLE`, 7 check-runs
`SUCCESS` (backend, backend-postgres, frontend, owner-portal, authority-portal, flutter, docker), `reviewDecision` vazio.

### 0.1 Backend que JÁ existe na `main` (nada disto precisa de código novo)
| Fato | M | Onde |
|---|---|---|
| Baixa = `POST /financial-titles/:financialTitleId/pay`, permissão `financial_entries:create` | M | `src/modules/financial-entries/financial-entry.routes.ts:94-100`; montado em `src/app.ts:213` sob `/api/v1` |
| Corpo da baixa: `amount`, `account_id`, `payment_method`, `occurred_at` (opcional, default server-now), `description`, `client_action_id`; direção derivada do título (`receivable→in`, `payable→out`); moeda da conta deve bater com a do título | M | `financial-entry.service.ts:424-449` (`payTitle`) |
| Baixa é atômica (UoW: trava SHARED do período → lançamento → CAS do título); `client_action_id` repetido → 409 `duplicate_payment` **dentro** da tx | M | `financial-entry.service.ts:412-470`; comentário `:412-421` |
| Erros da baixa: 404 título (inexistente/cross-tenant); 422 `title_cancelled`, `title_already_paid`, `overpayment`, `amount_below_paid`, `period_closed`, `account_inactive`, `currency_mismatch`, `amount_overflow`; 400 `invalid_amount`, `invalid_payment_method`, `invalid_account_reference`; 409 `duplicate_payment` | M | `financial-title.repository.ts:100-130`; `financial-entry.repository.ts:57-90`; `financial-entry.validators.ts:60-90` (`invalid_amount` é **400**, como a crítica v2 corrigiu) |
| Meios aceitos HOJE na `main`: `cash,pix,boleto,card,transfer,check` | M | `financial-entry.types.ts:11` |
| Extrato = `GET /financial-entries` com `account_id`, `direction`, `category`, `reconciled`, `divergence_type`, `from`/`to`, `limit` (1..100), `offset`; DTO de lista sem `description` | M | `financial-entry.service.ts:166-179`; `financial-entry.dto.ts:35-60` |
| Conciliação = `PATCH /financial-entries/:id/reconcile` (`financial_entries:update`), corpo `reconciled`, `divergence_type ∈ {value,date}`, `reconciliation_ref`; carimbo `reconciledAt/By` server-side; `reconciled=false` DESCONCILIA e limpa os 4 metadados; **sem CAS** (`updateManyAndReturn` por `tenant_id,id,deleted_at`) e sem chokepoint de período (decisão `D-Ω4-5-RECONCILE-META`) | M | `financial-entry.routes.ts:84-90`; `financial-entry.service.ts:370-395`; `financial-entry-prisma.repository.ts:88-102` |
| Saldo = `GET /financial-accounts/:id/balance` → `openingBalance, in, out, balance` somados no servidor | M | `financial-entry.routes.ts:104-110`; `financial-entry.service.ts:493-510` |
| Contas: `GET/POST/GET:id/PATCH/DELETE /financial-accounts` (`financial_accounts:read/create/update`); `kind ∈ {cash,bank,wallet}`, só BRL; delete lógico | M | `financial-account.routes.ts:31-70`; `financial-account.types.ts:10-17` |
| Títulos: lista com `direction,status,party_type,overdue,from,to,limit,offset`; DTO de lista **não traz** `workOrderId`/`description`; detalhe traz | M | `financial-title.service.ts:41-54`; `financial-title.dto.ts:7-70` |
| Resumo: `GET /financial-summary` traz `receivable/payable.{open,overdue}*`, `settledThisMonth`, `cash.{totalBalance,accountCount}`, `cheques.pending{Received,Issued}{Count,Amount}`, `cashFlow` (6 meses), `recentTitles` | M | `financial-summary.types.ts:20-82` |
| Cheques: `GET/POST/PATCH/DELETE /cheques`, `/deposit`, `/clear` (+`financial_entries:create`), `/bounce`, `/cancel` | M | `cheque.routes.ts:34-80`; `API_CONTRACTS.md:469-470` |
| Permissões (catálogo em código, provisionado ao banco por `scripts/provision-rbac.ts`, **convergente e aditivo**; o gate em modo `prisma` lê `role_permissions`) — `finance` tem `financial_accounts:read/create/update`, `financial_titles:read/create/update`, `financial_entries:read/create/update`, `cheques:*`, `financial_period:read/close`; `manager` e `auditor` só `:read`; `tenant_admin` herda o catálogo (`financial_period:reopen` só admins) | M | `catalog.ts:812-883` (finance), `:466-473` (manager), `:994-1001` (auditor), `:39`, `:146-158`; `scripts/provision-rbac.ts:1-45`; `roles.routes.ts` tem **só 2 GET** (não há endpoint de concessão por organização) |
| Não existe permissão separada para DESFAZER conciliação: é a mesma rota/permissão de conciliar | M | `financial-entry.routes.ts:81-90` |
| Nenhuma rota de "pedido de autorização" genérica: aprovações existem só para OS (`/approvals/*`, `work_orders:approve`) e despesas (`expense_approval_steps`) | M | `work-order.routes.ts:71-88`; `prisma/schema.prisma:2910`; `grep -n "model Approval" schema.prisma` → 0 |
| Auditoria: o serviço financeiro **não** emite evento de auditoria (`grep -n -i audit financial-entry.service.ts financial-title.service.ts` → 0) | M | — (a regra "Crítico = exclusão/cancelamento financeiro" de `D-AUDIT-REGRAS-CRITICO` roda no backend de auditoria, não aqui) |

### 0.2 O que o ramo do PR #456 (`B-SAN3-20`) acrescenta — e o que NÃO acrescenta
| Fato | M | Onde (ramo `origin/fix/cheque-x-baixa`) |
|---|---|---|
| `payment_method=check` → **422 `cheque_required`** nas duas portas (`POST /financial-entries` e `/pay`), depois da identidade/moeda do título e antes do período | M | `financial-entry.service.ts:82-89` (fábrica), `:198-200` (create), `:442-443` (payTitle) |
| Cheque ganha `title_id` (opcional) no `POST /cheques` e no `PATCH /cheques/:id` (nulável: `null` desvincula; só enquanto `registered` — `assertEditable`); vínculo validado por `assertPayable` + direção + moeda | M | `cheque.service.ts:118-127`, `:140-170`, `:388-406` |
| `GET /cheques?title_id=<uuid>` filtra os cheques de um título; DTO expõe `titleId` | M | `cheque.service.ts:102`; `cheque.repository.ts:106`; `cheque.dto.ts` (+2 linhas no diff) |
| `/clear` de cheque vinculado aplica o pagamento ao título na MESMA unidade (`applyTitlePaymentInUnit`); `bounce` restaura | M | `cheque.service.ts:305-336`, `:417-440` |
| Migração aditiva `20260881000000_cheque_title_link` (+ drill) | M | `git diff --stat origin/main...origin/fix/cheque-x-baixa` |
| **NÃO existe** recusa da baixa manual quando o título tem cheque vinculado pendente: `grep -n -i cheque financial-entry.service.ts` no ramo acha só `cheque_required` | M | — (é código NOVO deste bloco, §4.2) |
| **NÃO existe** "trocar a vinculação do cheque por outro meio" com autorização de superior; o `PATCH /cheques/:id {title_id:null}` desvincula sem alçada e só em `registered` (`P-SAN3-20-DESVINCULAR-DEPOSITADO`, aberta) | M | `cheque.service.ts:140-170`; `pendencias.md:11479-11481` (no ramo) |
| Decisão que rege: `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` — *"A: só pela compensação (Recomendado)"* | M | `decisoes.md:3843-3857` (no ramo) |
| Pendências abertas pelo #456 que tocam este bloco: `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` (dono: "bloco do painel Financeiro (3 opções)"), `P-SAN3-20-TELA-CHEQUES` (dono: B-SAN3-24), `P-SAN3-20-ATALHO-PAY-CHEQUE-ID`, `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` | M | `pendencias.md:11479-11513` (no ramo) |

### 0.3 Frontend que JÁ existe na `main`
| Fato | M | Onde |
|---|---|---|
| Nenhuma chamada a `/pay`, `/financial-accounts`, `/financial-entries`, `/reconcile` em `frontend/src` (os itens #28 e #55 do portão continuam abertos) | M | `pendencias.md:8525-8545`, `:9426-9433`; `grep -rn "financial-entries\|/pay\b\|financial-accounts" frontend/src` → 0 |
| Módulo `frontend/src/modules/finance/`: `pages/{FinanceiroPage,ChargesPage,PaymentsPage,InvoicesPage}.tsx`, `titles/{adapter,service,types,useFinancialTitles}` + `components/{TitleFormModal,TitleOverdueBadge,TitleRowActions,TitlesListView}`, `dashboard/*` (resumo), `commissions/*`, `payable-source/*` | M | `ls frontend/src/modules/finance/*` |
| `FinanceiroPage.tsx` = painel do resumo (4 KPIs via `ClickableKpiCard`, `TrendChart`, títulos recentes); o saldo em caixa é só um pop-up explicativo (`:95-108`) | M | `FinanceiroPage.tsx:46-200` |
| `financial-titles.service.ts` já tem `listFinancialTitlesFromApi`, `createFinancialTitle`, `changeFinancialTitleStatus` (erro NÃO engolido no create/status; lista cai em `fallback` com `fallbackReason`) | M | `financial-titles.service.ts:18-77` |
| Rotas: `/finance` (gate `financial_entries:read`), `/finance/charges` e `/finance/payments` (`financial_titles:read`), `/finance/invoices`, `/finance/commissions`; menu `FINANCEIRO/COBRANCAS/PAGAMENTOS` em `appSidebarNav.ts:91-93`, grupo `finance` `:187-196`; `tenantNavigation.ts:332-339` | M | `App.tsx:640-677` |
| Biblioteca: `components/patterns/{PageHeader,KpiStatCard,StatusPill,TablePager,InitialsAvatar}`, `components/kpi/{ClickableKpiCard,KpiDetailModal}`, `components/dense-list/{DenseTable,useDenseList,DenseListPagination}` (`DenseTable` tem `onRowClick`, **não** tem detalhe em linha), `components/charts/TrendChart`, `components/ui` | M | `ls frontend/src/components/*`; `DenseTable.tsx:14-35` |
| `aria-pressed` já é usado em 20 páginas (ex.: `PatiosPage`, `ClientesPage`) — mas **não** existe `DenseExpandableRow`/`renderDetail` em lugar nenhum | M | `grep -rln aria-pressed frontend/src` → 20; `grep -rn "DenseExpandable\|renderDetail" frontend/src` → 0 |
| CSS do padrão: `.pat-page-header*`, `.pat-kpi`, `.pat-kpi--clickable`, `.pat-table*` já existem em `app.css` e são guardados por `pattern-css-guard.test.ts` | M | `app.css:3023-3869`; `frontend/tests/pattern-css-guard.test.ts:23-34` |
| `StatePanel` e `StaleDataBanner` vivem em `modules/work-orders/components/` (não na biblioteca) | M | `ls frontend/src/modules/work-orders/components` |
| Mapa estático de permissões do modo mock: `finance: ["finance.manage","finance.read","os.read","notifications:*"]` — **defasado** do catálogo (pendência `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`, dono `B-SAN3-06a`) | M | `auth.adapter.ts:334` |
| Sessão do front expõe `id` e `email` do usuário | M | `frontend/src/modules/auth/types.ts:15-17` |
| Não há seletor de aparência nem hook `useScreenAppearance` em `frontend/src` (`grep -rln "aparencia\|appearance" frontend/src` → só `tenant-settings.presentation.ts:23` (categoria "Aparência" dos parâmetros da ORGANIZAÇÃO) e `app.css`) | M | — |
| CI do front = `npm --prefix frontend run check` + `test:smoke` (lista explícita em `frontend/package.json:11`) + `build`; backend = `check`, `npm test`, `build`; suítes `-db` no job `backend-postgres` | M | `.github/workflows/ci.yml:111-118, 131-312, 314-336` |

### 0.4 Telas, referências e governança
| Fato | M | Onde |
|---|---|---|
| Maquete aprovada (*"Aprovo as 3"*, 24/10 ~17:10): A "Abas do Financeiro" (cabeçalho `Financeiro · Baixas, contas e conciliação`, 6 indicadores clicáveis — Saldo em caixa, Entradas/Saídas do mês, A receber/pagar vencido, A conciliar —, faixa "Entradas × saídas · 6 meses" + "Conciliação por conta", abas `A receber / A pagar / Contas e extrato / Conciliação`, baixa em janela fixa); B "Conta em foco" (trilho de contas, ponte Abertura→Entradas→Saídas→Saldo atual, rosca de conciliação, abas `Extrato da conta / Títulos a baixar`, ações no detalhe da linha); C "Conferência do caixa" (`Financeiro · Rotina do dia`, passos `1 · Baixar / 2 · Conciliar / 3 · Ressalvas / Extrato completo`, blocos Vencidos/Vencem hoje/Próximos dias, Cheques a compensar, conferência em sequência) | M | maquete `:1076-1100` (A), `:1162-1196` (B), `:1198-1232` (C); quadro de notas `:1525-1610` |
| Marcas "falta no backend" da maquete (os agregados que o front NÃO pode somar): valor em R$ a conciliar; movimento por conta e por mês; entradas/saídas por dia (14 dias); nº da OS na lista de títulos; filtro do extrato por meio/título; "títulos com cheque pendente" (filtro inverso) | M | maquete `:1534-1537`, `:1545-1548`, `:1556-1558` |
| Padrão de tela: `D-TELAS-SEGUEM-O-PADRAO` (tela-modelo `WorkOrdersPage.tsx`), `D-PADRAO-BLOCOS-CLICAVEIS` (`financeiro-ab.reference.html`: bloco clicável filtra; linha ≤44 px sem botão; detalhe embaixo, um por vez), `D-TELAS-SAEM-COM-TRES` + `D-APARENCIA-POR-USUARIO` | M | `CLAUDE.md` §4 itens 1-7; `decisoes.md:3559, 3598, 3626-3640` |
| Referência anterior do Financeiro (`financeiro-3opcoes.reference.html`, 16/10) ainda lista "Cheque" entre os meios da baixa (`MEIOS` l.758) — **anterior** à `D-SAN3-20`; a maquete nova diverge de propósito | M | maquete `:1605` (divergência declarada) |
| Seletor de aparência: **não existe** na `main`; o plano `docs/revisoes/TELAS/B-APARENCIA-USUARIO-plano.md` propõe `localStorage` chave `techsol.aparencia.<tenantId>.<userId>`, hook `useScreenAppearance("<tela>")`, views puras A/B/C com UM fetch; o dono respondeu `D-APARENCIA-RESPOSTAS`: (a) v1 no navegador, por organização e usuário; (b) padrão B em Pátios, A nas demais; (c) escolha no **menu do usuário**, não em Configurações; (d) Pátios estreia junto | M | `B-APARENCIA-USUARIO-plano.md:28-29, 57`; `decisoes.md:3686`; `pendencias.md:11025-11032` (`P-APARENCIA-POR-USUARIO`, ABERTA, "bloqueia: a primeira tela que sair com as 3") |
| Plano v2 anterior deste bloco (Opus 5.5 pela API, base `ade03028`) + crítica v2 (APROVA COM AJUSTES: A1 duas telas p/ o mesmo título → redirecionar `/finance/charges|payments`; A2 `invalid_amount`=400; A3 nada de aba vazia; A4 portar o verificador da maquete ao `test:smoke`; endossa dividir em 12a/12b e estender `KpiStatCard` com `aria-pressed`) | M | `docs/revisoes/SAN3/B-SAN3-12-plano-v2.md:1-80`; `B-SAN3-12-critica-v2.md:22-60` |
| Agenda do PLANO_SAN3: B-SAN3-12 depende de `SAN3-04a` (mergeado — as permissões do Financeiro estão em `catalog.ts:816-823`); trava de mesmo arquivo (`App.tsx`, `appSidebarNav.ts`) com `SAN3-24` (depois) — `SAN3-06a-telas` já mergeou (#424) | M | `PLANO_SAN3.md:268, 327-335`; `git log origin/main` → `9566d55b` (#424) |
| Baseline de testes (contagem de `test(` por arquivo): backend `tests/financial-entries.test.ts` 76 (89 ocorrências de "reconcile"), `financial-titles.test.ts` 64, `financial-accounts.test.ts` 24, `cheques.test.ts` 43; frontend `tests/finance-titles.test.tsx` 23, `financial-summary.adapter.test.ts` 5; arnês: `node:test` + serviços em memória + servidor HTTP real (backend); `react-dom/server` + `MemoryRouter` + globais de navegador mínimas (front). Totais publicados pelo marco (não medidos por mim): backend 3760/3762 (PR #457), frontend 1339/1339 (#452) | M | `grep -c "^\s*test(" …`; `tests/financial-entries.test.ts:1-37`; `frontend/tests/finance-titles.test.tsx:1-60` |

### 0.5 Hipóteses (cada uma com o comando que a derruba)
| # | Hipótese | Comando que a derruba |
|---|---|---|
| H1 | O #456 mergeia antes do dev do 12b começar (ele está `MERGEABLE`, CI verde, aguardando a junta de dinheiro). Se não mergear, o 12b-backend é desenvolvido **sobre o ramo do #456** (base = `a0f5aabc`) e o PR do 12b declara a base; nunca sobre a `main` sem a recusa `cheque_required` | `gh pr view 456 --json state,mergedAt` antes de abrir o ramo do 12b |
| H2 | `requirePermission` em modo `prisma` lê `role_permissions`, logo permissão nova no catálogo chega ao banco pelo `db:provision-rbac` (CI já roda "Provision database") sem migração de dados | **sustentada** para o catálogo: `ci.yml:193` provisiona; `tenant-context.middleware.ts:71` resolve por `resolvePermissionsForRoles`; a C2 do 12a confere o caminho `prisma` por execução (`-db`) |
| H3 | O repositório Prisma de cheques no ramo aceita filtro `title_id` + `status IN (registered,deposited)` numa consulta só (para o guard "cheque pendente do título") | medido: `cheque-prisma.repository.ts:30,73,77` (ramo) tem `title_id` em create/update e o filtro de lista; **não** há consulta pendente-por-título → `findPendingByTitle` é método NOVO nos dois repositórios (§4.2), não reuso |
| H4 | O `TenantSettingService.get(actor,key)` serve para ler uma chave de política no servidor (delegação do desfazer ao Financeiro) sem tabela nova | `sed -n 25-40p src/modules/tenant-settings/tenant-setting.service.ts` (medido: `get` existe; o uso por OUTRO módulo, não — é hipótese de reuso) |
| H5 | `renderToString` do arnês do front não executa `useEffect`: os testes de interação (abrir detalhe, submeter baixa) precisam do "DOM mínimo" de `work-orders-page-live.test.tsx` | **sustentada**: 10 ocorrências de `useEffect`/`act(` nesse arquivo; `mount(permissions, role, …)` em `:457-464` é o molde dos testes F1–F3, F6, F10, F12 |
| H6 | O `financeiro-ab.reference.html` tem verificador `checar-ab.cjs` reutilizável para o smoke (A4 da crítica) | **DERRUBADA**: `ls …/screen-refs/*.cjs …/maquetes/*.cjs` → nenhum arquivo; os smokes F11/F12 nascem do zero no 12b (não há o que portar) |

## §1 — Objetivo, ator, fluxo origem→destino
**Objetivo.** Fechar os itens #28 e #55 do portão: pela web, um título **vira pago e vira caixa** (baixa), cada **conta tem saldo e
extrato** pela rota real, e o **lançamento é conciliado** (e desconciliado, com privilégio) — nas **3 aparências aprovadas** (A abas,
B conta em foco, C conferência do caixa), com o cheque **fora** da baixa e as regras novas do dono (24/10) no **servidor**.

**Ator principal.** Financeiro (`finance`) e Administrador da organização (`tenant_admin`). Gestor (`manager`) e Auditor só consultam.
Técnico de Campo não vê o Financeiro (painel "acesso não permitido"). Decide sempre o backend; a tela só molda (§B2.4).

**Fluxo origem → destino (CE-4, `PLANO_SAN3.md:327`).**
1. `POST /financial-accounts` (conta) → 2. `POST /financial-titles` (título) → 3. **baixa pela tela** → `POST /financial-titles/:id/pay`
→ título `paid`/`partially_paid` + lançamento `title_id` preenchido → 4. o lançamento aparece em `GET /financial-entries?account_id`
→ 5. `GET /financial-accounts/:id/balance` reflete → 6. **conciliar** `PATCH /financial-entries/:id/reconcile {reconciled:true, …}`
→ `reconciled=true` com carimbo → 7. conciliar de novo → **409 `reconciliation_stale`** se o **estado esperado** (`expected_reconciled` + `expected_reconciled_at`, obrigatórios, §4.6) estiver defasado; 400 se ausente;
200 só com o estado atual → 8. **desfazer** só com `financial_entries:unreconcile` ou delegação (§4.4).
Ramo do cheque: título com cheque vinculado pendente → baixa manual **recusada** (422 `title_has_pending_cheque`, §4.2) → a tela
direciona para **trocar a vinculação** (`POST /cheques/:id/unlink-title`, privilégio alto + justificativa, §4.3) → só então a baixa.

## §2 — Decisões do dono que regem o bloco (literais)
Citadas **assim**, nos termos do dono (24/10, ~17:10), e o que cada uma obriga neste plano:

1. ***"Aprovo as 3"*** — as 3 aparências da maquete `C:/Users/AMP/erp-pausa-2026-10-03/maquetes/B-SAN3-12-financeiro-baixa-conta-conciliacao-3opcoes.html`
   são entregues **todas**, e cada usuário escolhe a sua (`D-APARENCIA-POR-USUARIO`, `D-TELAS-SAEM-COM-TRES`). A maquete vai para
   `docs/claude-code-handoff/screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html` e passa a ser a referência da tela
   (a `financeiro-3opcoes.reference.html` de 16/10 fica como referência do **painel**; a linha "Cheque" dos meios dela é corrigida no
   mesmo PR, porque é anterior à `D-SAN3-20`).
2. ***"server recusa, mas ja direciona para trocar a vinculacao do cheque por outro meio de pagamento e isso requer privilegios altos,
   no geral o usuario pege autorizacao e o superior analisa"*** — (i) a recusa é do **servidor** (422 `title_has_pending_cheque`, com os
   cheques e o próximo passo no corpo), não só aviso da tela como estava na maquete (`:1580`); (ii) existe uma ação de **trocar a
   vinculação** (desvincular o cheque do título para pagar por outro meio) que exige **privilégio alto** — permissão nova
   `cheques:unlink_title`, do Administrador da organização, com **justificativa obrigatória**; (iii) o fluxo "pede → superior analisa"
   é entregue na v1 como **pedido visível na tela + ato do superior com justificativa** (o precedente da casa é a `D-07CB-SUPERIOR-UNICO`:
   "a mesma pessoa autoriza, com justificativa obrigatória, e a ação fica marcada como Crítica na auditoria"); a **fila durável** de
   pedido/aprovação é do `B-O6R-07c-b2`, que já vai construí-la para a OS — este plano pede ao dono para confirmar (Q2, §12).
3. ***"admin, mas deve existir a opcao do financeiro receber esse privilegio"*** — desfazer conciliação passa a exigir a permissão nova
   `financial_entries:unreconcile` (Administrador da organização; herdada por super/platform). A **opção** de o Financeiro recebê-la é
   uma **política da organização** (`tenant-settings` chave `finance.unreconcile_delegated_to_finance`), que só `tenant_settings:update`
   (Administrador) liga — sem endpoint de concessão de permissão por organização, que hoje não existe (`roles.routes.ts` só lê). Q3 no §12
   confirma o mecanismo e autoriza a emenda da `RBAC_MATRIX.md`/`APPROVAL_LIMITS.md`.
4. **Cheque não entra na baixa** (`D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO`, 21/10, aplicada no PR #456): a tela **não oferece** cheque como
   meio em nenhuma aparência; o aviso fixo "Registre o cheque em Cheques, vinculado a este título…" fica, com o atalho explicando que a
   tela de Cheques chega com o `B-SAN3-24`.

Decisões anteriores que este plano **aplica sem reabrir**: `D-TELAS-SEGUEM-O-PADRAO` (tela-modelo `WorkOrdersPage.tsx`),
`D-PADRAO-BLOCOS-CLICAVEIS`, `D-APARENCIA-RESPOSTAS` (a: navegador por organização e usuário; b: padrão A fora de Pátios; c: escolha no
menu do usuário), `D-GOV-PROPORCIONAL` (teto de 2 ciclos; junta completa porque é dinheiro e permissão), `D-JUNTA-SO-CADEIRA-VERMELHA`,
`D-EMENDA-ANTES-DO-CODIGO` (decisão nova no meio do bloco vira emenda escrita antes do código), `D-DESIGN-SO-CLAUDE`.

## §3 — Divisão em sub-blocos e ordem (dependência do #456)
O bloco é **G** (a crítica v2 já dizia: "bloco G em junta de dinheiro converge pior"). Divide-se em **três PRs do MESMO bloco**, cada um
pequeno o bastante para uma junta de 2 ciclos. A `main` **sem o #456** não tem a regra do cheque; por isso a ordem abaixo.

| Ordem | Sub-bloco · ramo | Conteúdo | Risco / junta | Depende de |
|---|---|---|---|---|
| 0 | **PR #456** (`B-SAN3-20`) | **MERGEADO** em `37a3f360` (2026-10-25) | — | — |
| 1 | **B-SAN3-12a** · `feat/fin-baixa-regras-servidor` (backend) | §4.2 recusa da baixa com cheque pendente (+ re-check sob o lock); §4.3 `POST /cheques/:id/unlink-title` com `cheques:unlink_title` + justificativa + fecho do bypass do `PATCH`; §4.4 `financial_entries:unreconcile` + política `finance.unreconcile_delegated_to_finance` + `GET /financial-entries/reconciliation-policy`; §4.5 `GET /financial-entries/aggregate`; §4.6 CAS **obrigatório por estado lógico** da conciliação (v3); §4.7 campos aditivos de DTO; **v3:** regra do cheque de valor exato (§4.2), cancelar/excluir cheque vinculado e alterar/excluir título com cheque pendente (§4.3), agregado no fuso do negócio (§4.5), **migração de DADOS** das 2 permissões com drill (§5.1) (`description` na lista de lançamentos, `workOrderId` na lista de títulos, `cheques.linkedPending*` no resumo); `API_CONTRACTS.md`; catálogo + `RBAC_MATRIX.md`/`APPROVAL_LIMITS.md` (emenda nominal) | **dinheiro + permissão** → junta completa, unanimidade de 3, `critico-adversarial` no plano | #456 já na `main` (H1 resolvida) |
| 1' | **B-APARENCIA-USUARIO** (plano e crítica já em `docs/revisoes/TELAS/`) | hook `useScreenAppearance`, chave `techsol.aparencia.<tenantId>.<userId>`, seletor no menu do usuário, Pátios estreia | **sem regra de negócio** → 1 revisor + CI (`D-GOV-PROPORCIONAL` (1)) | nenhum; corre **em paralelo** ao 12a (arquivos disjuntos) |
| 2 | **B-SAN3-12b** · `feat/web-financeiro-baixa-e-contas` (frontend) | camada de dados (`finance/accounts/**`, `finance/entries/**`, baixa/conciliar/agregado/política no `titles`/`entries` service); componentes de biblioteca (`KpiStatCard` com `pressed`, `DenseTable.renderDetail` + `DenseExpandableRow`); formulários (baixa, conciliar, nova conta, desvincular cheque); **aparência A completa**; `FinanceiroPage` troca de view por `useScreenAppearance("financeiro")`; redirecionamentos `/finance/charges|payments` → `/finance?aba=…` (A1 da crítica); estados §7; testes smoke + CE-4 `-db` | **tela com regra de dinheiro** → junta completa, unanimidade de 3 (+ `cognicao-visual`, `coordenador-de-acessos`) | 12a mergeado (ou contrato do 12a congelado no PR aberto); hook de aparência (de 1' ou entregue aqui, §6.4) |
| 3 | **B-SAN3-12c** · `feat/web-financeiro-aparencias-b-c` (frontend) | views **B** (trilho de contas, ponte do saldo, rosca de conciliação, "Movimento por mês nesta conta" via agregado) e **C** (3 passos, cheques a compensar, barras de 14 dias via agregado, conferência em sequência); 2 componentes SVG na biblioteca (`BalanceBridge`, `ReconcileDonut` — PD-004, zero dependência) | **só apresentação sobre a mesma camada** → junta completa de 3 **se** a junta do 12b apontar regra nova; senão 1 revisor + `cognicao-visual` + CI (o orquestrador declara qual, na abertura) | 12b mergeado |

**Por que 12b (A) antes de 12c (B e C), e não as três num PR só.** A `D-TELAS-SAEM-COM-TRES` diz que a tela sai com as 3; aqui a tela é
dada como pronta (itens #28/#55 fechados, `P-WEB-*` encerradas) **só no merge do 12c**. O 12b já fecha o CE-4 de ponta a ponta (a regra
de dinheiro inteira está em A); o 12c acrescenta duas vistas **puras** sobre a mesma camada — se a junta do 12c reprovar, nenhuma regra de
dinheiro está em jogo. Isto é uma **pergunta ao dono** (Q1, §12), com recomendação de aceitar.

**Travas de mesmo arquivo.** `App.tsx` e `appSidebarNav.ts`: 12b toca; `B-SAN3-24` só abre ramo depois do merge do 12b (`PLANO_SAN3.md:331-335`).
`catalog.ts`, `API_CONTRACTS.md`, `RBAC_MATRIX.md`: 12a toca; nenhum outro bloco em voo os toca hoje (#454 Traccar toca `src/modules/telemetry`
e `prisma/`; #456 toca cheques/títulos/lançamentos — **12a só abre depois do #456**, logo não há conflito de arquivo).

**Esforço (horas de dev, melhor caso):** 12a **M** (5 h) · 1' **P/M** (3 h) · 12b **M+** (7 h) · 12c **M** (5 h). Caminho crítico: #456 → 12a → 12b → 12c.

## §4 — Contrato (rotas, payloads, códigos)
Envelope de erro da casa (`core-saas/routes/http.ts:28-45`): `{ error: { code, reason, message } }`. Tenant **sempre** do ator (§B2.8); nada
de `tenant_id`, token, path ou binário na resposta. Tudo sob `/api/v1`. Versão de contrato: `financeiro_baixa_conta_conciliacao@2026-10-24.b-san3-12`.

### 4.1 Rotas que a tela consome SEM mudança de contrato (medidas em §0.1)
`GET/POST /financial-accounts`, `GET /financial-accounts/:id`, `PATCH`, `DELETE` (lógico) · `GET /financial-accounts/:id/balance` ·
`GET /financial-titles` (+ `overdue`, `from`, `to`, `status`, `direction`) · `GET /financial-titles/:id` · `POST /financial-titles/:id/pay` ·
`GET /financial-entries` (filtros de §0.1) · `GET /financial-entries/:id` · `PATCH /financial-entries/:id/reconcile` ·
`GET /financial-summary` · `GET /cheques?title_id=` (do #456). Códigos que a tela traduz em PT-BR (lista fechada, cada um com teste):
404 (título/conta/lançamento — inclusive cross-tenant: **404, nunca 403**); 400 `invalid_amount`, `invalid_payment_method`,
`invalid_account_reference`, `invalid_reconciled`, `invalid_divergence_type`; 422 `title_cancelled`, `title_already_paid`,
`overpayment`, `period_closed`, `account_inactive`, `currency_mismatch`, `amount_overflow`, `cheque_required`; 409 `duplicate_payment`,
`duplicate_account`; 403 (sem permissão).

**Lista fechada de códigos que a tela traduz (v3, R2-10 — o número vem da lista, não o contrário): 32.** Existentes (17): `404` (título/conta/lançamento/cheque — cross-tenant inclusive);
`400` `invalid_amount`, `invalid_payment_method`, `invalid_account_reference`, `invalid_reconciled`, `invalid_divergence_type`; `422` `title_cancelled`, `title_already_paid`, `overpayment`,
`period_closed`, `account_inactive`, `currency_mismatch`, `amount_overflow`, `cheque_required`; `409` `duplicate_payment`, `duplicate_account`; `403` (sem permissão). Do fluxo de cheque que a tela
alcança ao desvincular/cancelar (3): `422` `invalid_transition`, `cheque_not_editable`; `409` `transition_conflict`. **Novos deste bloco (12):** `422` `title_has_pending_cheque`, `cheque_amount_mismatch`,
`cheque_linked_unlink_first`, `cheque_not_linked`, `cheque_not_unlinkable`; `400` `expected_state_required`, `invalid_justification`, `aggregate_range_too_wide`; `409` `reconciliation_stale`,
`cheque_write_conflict`; `403` `unreconcile_forbidden`, `unlink_requires_privilege`. A lista vive **uma vez** no código: `frontend/src/modules/finance/entries/finance-errors.ts` exporta
`FINANCE_UI_ERROR_REASONS` (as 32) e o F4 itera sobre ela; o backend tem o espelho em `API_CONTRACTS.md` e um teste (A17-bis) que confere que todo `reason` lançado pelos módulos financeiros está na lista.

### 4.2 NOVO (12a) — cheque vinculado só do VALOR EXATO; baixa manual recusada enquanto ele estiver pendente (v3: R2-02, R2-03)
- **Decisão do dono (25/10, literal): *"Só cheque do valor exato (Recomendado)"*** — vincular cheque a título **só** se `cheque.amount === saldo aberto` (`amount − paidAmount`, `roundMoney`); senão **422**
  `cheque_amount_mismatch` (`details: { chequeAmount, openBalance }`). Vale no `POST /cheques` com `title_id` e no `PATCH /cheques/:id` que vincula (`cheque.service.ts:113-133`, `:144-167`, `validateTitleLink :388`).
  **Pagamento misto (cheque + outro meio) fica para bloco seguinte** (pendência `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE`, §12.2). Com isto, qualquer baixa manual sobre um título com cheque pendente é, por construção,
  uma **troca** de instrumento — nunca um complemento (fecha o caminho "R$ 140 para um título de R$ 100" da sonda P1 do crítico).
- **Conjunto "cheque pendente do título"** = cheques **ativos** (`deleted_at IS NULL`) com `title_id = T` e `status ∈ {registered, deposited}`. Entra nele **só** por vincular (create/update com `title_id`); sai por
  `clear`, `bounce`, `cancel`, `DELETE` ou pelo desvínculo (§4.3). Leitura: método **novo** `findPendingByTitle(tenantId, titleId)` no `ChequeRepository` (memória e Prisma) — e, por isso, em
  `CHEQUE_REPO_KIND` (`"read"`) e em `journaledCheques` (`financial-uow.ts:221-232`, `:357`; R2-07, escopo ampliado no §7.1).
- **A recusa.** `POST /financial-titles/:id/pay` com conjunto não vazio → **422** `{ code: "FINANCIAL_ENTRY_UNPROCESSABLE", reason: "title_has_pending_cheque", details: { chequeIds, pendingAmount, nextStep: "unlink_cheque",
  requiredPermission: "cheques:unlink_title" } }`. Precedência pública (fast-fail, fora da tx): 400 corpo → 404 título → 422 `title_cancelled`/`title_already_paid`/`overpayment` → 400/422 conta → 422
  `currency_mismatch` → 422 `cheque_required` → **422 `title_has_pending_cheque`** → 422 `period_closed` → (na tx) 409 `duplicate_payment`. O fast-fail garante a precedência e que **nenhuma tx abre**
  (A1, A3).
- **A corrida que o re-check fecha é `pay × vincular` — e só fecha porque VINCULAR passa a travar a linha do título (v3, R2-02).** Hoje o vínculo é `assertPayable` (leitura sem trava) + `UPDATE cheques`
  (`cheque.service.ts:388-406`), e na memória nem passa pelo mutex. Passa a ser: `create`/`update` com `title_id` rodam em `uow.run` → `ctx.titles.findByIdForUpdate` (trava a linha do título;
  `financial-title.repository.ts:41`) → revalida **sob o lock** `guardPayable` + valor exato → `ctx.cheques.create|update`. O `pay`, na tx, trava a mesma linha (`findByIdForUpdate`) **antes** de
  `findPendingByTitle` e de `entries.create`. Com os dois lados travando o título, as intercalações são: (a) vínculo commitou antes do fast-fail → recusado no fast-fail; (b) vínculo commitou **depois** do
  fast-fail e antes do lock do `pay` → o **re-check** vê o pendente e recusa; (c) `pay` travou primeiro → o vínculo espera, relê o título pago → `title_already_paid` (ou `cheque_amount_mismatch`).
  Sem o re-check, (b) commita os dois: título pago por Pix **e** cheque pendente vinculado. É isso que o A4 mede, com barreira determinística nos dois pontos. Ordem de travas: período → título → (leitura de
  cheque) → lançamento → CAS do título — não cruza com a do `clear` (período → cheque → lançamento → título) porque a leitura de cheque não trava.
- **`clear × pay` (A4-bis) não depende do re-check** — o crítico está certo: ou o fast-fail vê o cheque `deposited` (READ COMMITTED) e recusa, ou o `clear` já commitou e o `pay` recebe `title_already_paid`
  (cheque do valor exato → título `paid`). O teste fixa o conjunto de respostas **{`title_has_pending_cheque`, `title_already_paid`}** (com `overpayment` só se houver pagamento parcial anterior) e o
  **invariante de estado final**: nunca "título pago por outro meio **e** cheque vinculado ainda pendente".
- **O que NÃO muda:** `/clear` do cheque vinculado continua liquidando; título sem cheque pendente baixa como hoje; cheque `cleared`/`bounced`/`cancelled` não é pendente.

### 4.3 NOVO (12a) — trocar a vinculação do cheque, com privilégio alto e justificativa
- **Rota:** `POST /cheques/:chequeId/unlink-title` · permissão **nova** `cheques:unlink_title` (Administrador da organização; super/platform por herança; `finance` **não**).
  Corpo: `{ justification: string }` (obrigatória, 10–500 caracteres; 400 `invalid_justification`).
- **Efeito:** `title_id → null` por **CAS de estado** (`WHERE status IN ('registered','deposited') AND title_id = <lido> AND deleted_at IS NULL`); 0 linhas → 409 `cheque_write_conflict`
  (idioma do #456). O título fica **liquidável por outro meio** (nada a gravar nele: a baixa só olhava os cheques pendentes). Resposta 200 com o DTO do cheque (`titleId: null`).
- **Recusas:** 404 cheque (inexistente/cross-tenant); 422 `cheque_not_linked` (sem título); 422 `cheque_not_unlinkable` (`cleared`, `bounced`, `cancelled` — o dinheiro já andou ou nunca andará);
  403 (sem a permissão). Fecha de carona a `P-SAN3-20-DESVINCULAR-DEPOSITADO` (hoje `deposited` não desvincula por caminho nenhum).
- **Fecho do bypass:** `PATCH /cheques/:id` com `title_id: null` **ou** com `title_id` **diferente** do atual passa a exigir `cheques:unlink_title`
  (403 `unlink_requires_privilege`); vincular pela primeira vez (`title_id` atual nulo) continua `cheques:update`. Sem isto, qualquer Financeiro desvincularia pelo PATCH.
- **Rastro:** evento de auditoria `cheque.title_unlinked` pelo `EnterpriseAuditLogService` (`core-saas/audit/audit-log.service.ts:30`) com `severity: "critical"`
  (`D-AUDIT-REGRAS-CRITICO`, regra 1, por analogia declarada: desfazer vínculo financeiro) e metadados `{ chequeId, previousTitleId, justification }` **sanitizados** (`sanitizeAuditMetadata`, `:111`).
  Sem coluna nova (não há migração); se a junta exigir rastro **no agregado**, a alternativa está em §5.3.
- **Cancelar ou excluir um cheque vinculado é TROCA (v3, R2-04; decisão do dono, literal: *"Mesmo privilégio da troca (Recomendado)"*).** `POST /cheques/:id/cancel` e `DELETE /cheques/:id` de cheque
  **com `title_id`** respondem **422 `cheque_linked_unlink_first`** para **todo** ator — inclusive o Administrador: a única porta que tira o vínculo é `unlink-title` (privilégio + justificativa + auditoria
  Crítica); depois dela, cancelar/excluir volta a ser `cheques:update` sobre um cheque sem título. Um só write-path carrega o privilégio (fail-closed, sem gate duplicado). A tela do Administrador oferece
  "Desvincular" e, em seguida, "Cancelar o cheque" (se `registered`). `bounce` `deposited→bounced` **não** muda (é fato do banco, com `bounce_reason`) — risco residual declarado (R-res-2).
- **Nenhuma via muda o saldo de um título com cheque pendente senão a compensação ou o desvínculo (v3, corolário do valor exato).** `PATCH /financial-titles/:id` que altere `amount` e `DELETE /financial-titles/:id`
  respondem **422 `title_has_pending_cheque`** enquanto o conjunto pendente não estiver vazio (`financial-title.service.ts:263-295`, `:379-388`), lendo por uma porta estreita nova
  `src/modules/financial-titles/cheque-pending-reader.ts` (idioma de `cheques/cheque-link-reader.ts`: import dinâmico, sem ciclo). Fecha `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (o `DELETE` já falhava fechado
  no `clear`; agora falha na origem).
- **"O usuário pede e o superior analisa":** v1 = a tela mostra ao Financeiro o **pedido** (texto pronto com título, cheque e motivo, para copiar/enviar) e ao Administrador o botão
  **Desvincular** com justificativa; **sem fila persistida** (não existe primitivo genérico; o do `B-O6R-07c-b2` ainda não nasceu — §0.1). Pendência nomeada
  `P-SAN3-12-FILA-PEDIDO-DESVINCULO` (dono: `B-O6R-07c-b2`, ao generalizar a fila). Confirmação do dono em Q2.

### 4.4 NOVO (12a) — desfazer conciliação só com privilégio (delegável ao Financeiro)
- **Rota (a mesma):** `PATCH /financial-entries/:id/reconcile` com `reconciled: false`. A rota continua gated por `financial_entries:update`; o **serviço** decide o ramo "desfazer":
  permitido se o ator tem `financial_entries:unreconcile` (permissão **nova**, Administrador da organização; super/platform por herança) **ou** se `roles ∋ finance` **e** a política
  `finance.unreconcile_delegated_to_finance === "true"` (chave de `tenant-settings`, lida por `TenantSettingService.get` — `tenant-setting.service.ts:32`; ausente = `false`).
  Caso contrário **403** `{ code: "FINANCIAL_ENTRY_FORBIDDEN", reason: "unreconcile_forbidden" }`. Conciliar (`reconciled:true`) não muda.
- **Política:** `PUT /tenant-settings/finance.unreconcile_delegated_to_finance` `{ value: "true"|"false" }` — rota e permissão **existentes** (`tenant-setting.routes.ts:46-48`, `tenant_settings:update`);
  validador novo só para esta chave (valor fora de `true|false` → 400). Só o Administrador liga; o Financeiro não tem `tenant_settings:update` (catálogo `:812-883`).
- **Leitura para a tela moldar:** `GET /financial-entries/reconciliation-policy` (`financial_entries:read`) → `{ canUnreconcile: boolean, delegatedToFinance: boolean }` calculado **para o ator**.
  A tela mostra "Desfazer conciliação" só com `canUnreconcile`; o servidor recusa de qualquer forma (403 vira mensagem honesta se a tela estiver defasada).
- **Consequência explícita (v3, R2-11 — não é regra nova; é a composição de duas que já existem):** estornar (`/reverse`) ou excluir (`DELETE`) um lançamento **conciliado** já responde 422 `entry_reconciled`
  ("desconcilie antes", `financial-entry.service.ts:250-262`, `:304-317`; `RBAC_MATRIX.md:128`). Com o gate acima, **o Financeiro sem a política não estorna nem exclui lançamento conciliado sem o
  Administrador** — pede o desfazer, ou a organização liga a política. A tela diz isso em palavras (F20): "Este lançamento está conciliado. Para estornar ou excluir, um administrador (ou o Financeiro, se a
  organização permitir) precisa desfazer a conciliação." A alavanca do dono é a política; nada a perguntar.
- **Rastro:** evento de auditoria `financial_entry.unreconciled` (`severity: "warning"` — é desfazer um metadado, não dinheiro; o dinheiro não anda).

### 4.5 NOVO (12a) — agregado do extrato, no FUSO DO NEGÓCIO (v3, R2-06)
- `GET /financial-entries/aggregate?group_by=none|month|day&account_id&reconciled&divergence_type&direction&from&to` · `financial_entries:read`.
- Resposta: `{ groupBy, currency: "BRL", timezone: "America/Sao_Paulo", items: [{ bucket: null | "YYYY-MM" | "YYYY-MM-DD", count, inflow, outflow, net }] }`, somado no servidor (`SUM` sobre `Decimal(12,2)`;
  `Number` só na borda + `roundMoney`), só lançamentos ativos.
- **Buckets no fuso do negócio, nunca UTC.** A v2 afirmava "UTC (mesma base da competência)" — **falso**: `deriveCompetencia` usa `BUSINESS_TIMEZONE = "America/Sao_Paulo"` (`src/config/business-time.ts:10-31`)
  e o `cashFlow` do resumo agrupa por `competencia` (`financial-summary.compute.ts:75-99`). **Mês = a coluna `competencia`** (já derivada no fuso do negócio ao gravar) — idêntico ao resumo por construção.
  **Dia = `deriveBusinessDate(occurred_at)`** (`business-time.ts:37-44`) na memória e `(occurred_at AT TIME ZONE 'America/Sao_Paulo')::date` no Postgres (`$queryRaw` dentro de `withTenantRls`, como
  `sumByAccount`), com o nome do fuso vindo de `BUSINESS_TIMEZONE` (nunca literal duplicado). `from`/`to` são datas civis do negócio (`parseBusinessDate`).
- Limites: `day` ≤ 92 dias, `month` ≤ 24 meses (400 `aggregate_range_too_wide`); `group_by` inválido → 400. Paridade memória × Prisma **com a fixture de virada** (`2026-10-31T23:30:00-03:00` → `2026-10` /
  `2026-10-31`; A23) e paridade **agregado(mês) × resumo(cashFlow)** sobre os mesmos dados (A24).

### 4.6 NOVO (12a) — CAS **obrigatório, por ESTADO LÓGICO** da conciliação (v3, R2-05 — substitui o `expected_updated_at` da v2)
- **Por que não `updated_at`:** o carimbo é de milissegundo (`updatedAt: new Date()`, `financial-entry.repository.ts:258`; `@updatedAt` no Prisma) e a sonda P3 do crítico mediu **290 de 300** escritas no
  mesmo ms na memória — a igualdade não distingue "o mesmo estado" de "outro estado no mesmo ms" (ABA), e uma linha com `now()` em µs nunca casaria com ISO em ms.
- **Contrato:** `PATCH /financial-entries/:id/reconcile` exige `expected_reconciled` (boolean) **e** `expected_reconciled_at` (ISO ou `null`) — o estado que o cliente **leu**. Ausentes/inválidos → **400**
  `expected_state_required`. CAS no banco: `WHERE tenant_id AND id AND deleted_at IS NULL AND reconciled = $expected AND reconciled_at IS NOT DISTINCT FROM $expectedAt`; 0 linhas → o serviço relê e responde
  **409 `reconciliation_stale`** (ou 404 se sumiu). Memória: o `reconcile` passa a rodar **dentro de `uow.run`** (mutex do tenant; hoje chama `this.repository.reconcile` direto, `financial-entry.service.ts:399`)
  e compara o par (`reconciled`, `reconciledAt`) antes de gravar — **determinístico, sem relógio**: dois leitores do mesmo estado → o 2º recebe 409 sempre (A13 em memória fica estável).
- **ABA residual declarado:** sobra só a re-conciliação de um lançamento **já conciliado** por dois clientes quando a 1ª gravação **não muda** o carimbo (mesmo ms do `reconciled_at` lido). Como o serviço
  carimba `new Date()` a cada conciliação, isso exige duas gravações no mesmo ms **e** um carimbo anterior nesse mesmo ms. A13 prova o caso normal na memória; a junta decide se exige um `-db` adversarial
  (R-res-4). Linhas gravadas por SQL cru com `now()` (µs) só existem em fixtures (`financial-entry-delete-reverse-race-db.test.ts:131`); o DTO expõe `reconciledAt` em ISO ms e o cliente devolve o mesmo valor.
- **Compatibilidade:** nenhum cliente chama a rota (medido na r1; reconfirmado pelo crítico na r2). Chamadores **em teste** passam a enviar o estado esperado: `tests/financial-entries.test.ts`,
  `tests/cheques.test.ts:484`, `tests/financial-period-closes.test.ts:141`, `tests/financial-entry-reverse-restore-db.test.ts:342` (R2-09 — os quatro no PERMITIDO, §7.1); `tests/financial-uow-journal-classification.test.ts:326`
  fala com o repositório e muda porque a assinatura de `reconcile` ganha os dois campos esperados.

### 4.7 Campos aditivos de DTO (12a)
`GET /financial-entries` (lista) ganha `description`, `reconciliationRef`, `reconciledAt`, `reconciledBy` (`titleId` já vem) — `reconciled` + `reconciledAt` são o estado que o CAS de §4.6 espera; `GET /financial-titles` (lista) ganha `workOrderId`
(a maquete marca "Nº da OS na linha falta", `:1536`); `GET /financial-summary` ganha `cheques.linkedPendingCount/linkedPendingAmount` (cheques pendentes **com** `title_id`,
para a tela rotular "dos quais R$ X já cobertos por cheque a compensar" — fecha `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` sem alterar o razão). Nenhum campo removido; nada de `tenant_id`.

### 4.8 Permissões por passo (CE-G2; medidas em `catalog.ts`)
| Passo | Permissão exata da rota | `finance` | `tenant_admin` | `manager` | `auditor` | `field_technician` |
|---|---|---|---|---|---|---|
| ver painel/extrato/agregado/política | `financial_entries:read` | ✓ `:863` | ✓ herança | ✓ `:470` | ✓ `:998` | ✗ |
| listar títulos / detalhe | `financial_titles:read` | ✓ `:860` | ✓ | ✓ `:467` | ✓ `:995` | ✗ |
| listar contas / saldo | `financial_accounts:read` (+ `financial_entries:read` no `/balance`) | ✓ `:859` | ✓ | ✓ `:466` | ✓ `:994` | ✗ |
| nova conta | `financial_accounts:create` | ✓ `:870` | ✓ | ✗ | ✗ | ✗ |
| baixar | `financial_entries:create` | ✓ `:873` | ✓ | ✗ | ✗ | ✗ |
| conciliar | `financial_entries:update` | ✓ `:881` | ✓ | ✗ | ✗ | ✗ |
| desfazer conciliação | `financial_entries:update` **+** (`financial_entries:unreconcile` **ou** delegação) | só com política | ✓ | ✗ | ✗ | ✗ |
| desvincular cheque | `cheques:unlink_title` | ✗ | ✓ | ✗ | ✗ | ✗ |
| ligar a política | `tenant_settings:update` | ✗ | ✓ | ✗ | ✗ | ✗ |

## §5 — Modelagem (migrations aditivas, permissão nova, RBAC/APPROVAL)
### 5.1 Banco — **UMA migração de DADOS** (autorização nominal do dono, 25/10: *"Autorizo (Recomendado)"*) e nenhuma de esquema
- **Por quê (R2-01, executado pelo crítico):** o guard `tests/permission-catalog-migration-parity.test.ts:294` exige que **toda chave nova do catálogo apareça em SQL executável de alguma migração**
  (fronteira congelada em 2026-08-10, PR #344; a linha de base `PERMISSOES_HERDADAS_DO_SEED` **não cresce** — `TAMANHO_CONGELADO = 189`, `:321`). Produção roda só `prisma migrate deploy`, sem `db:seed`
  (`20260861000000/migration.sql`, cabeçalho). Logo as 2 permissões novas **pagam migração**; o `db:provision-rbac` continua convergindo nos ambientes que o rodam, mas não é o caminho de produção.
- **Arquivo:** `prisma/migrations/20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions/migration.sql`, molde **verbatim** do `20260861000000_grant_checklist_run_reopen_permission`:
  `BEGIN;` → `INSERT INTO permissions (key, description) VALUES ('financial_entries:unreconcile', …), ('cheques:unlink_title', …) ON CONFLICT (key) DO NOTHING;` →
  `INSERT INTO role_permissions (role_id, permission_id) SELECT r.id, p.id FROM roles r CROSS JOIN permissions p WHERE p.key IN (…) AND r.key IN ('super_admin','tenant_admin') ON CONFLICT (role_id, permission_id) DO NOTHING;`
  → `COMMIT;` (`D-MIGRACAO-COM-TRANSACAO-EXPLICITA`). **Aditiva e idempotente**; rodapé com o runbook de rollback (DELETE em `role_permissions` e depois em `permissions`, por FK). `platform_admin` não é
  papel no banco (pseudo-papel), como no molde. **`prisma/schema.prisma` não muda** e continua PROIBIDO.
- **Drill obrigatório (DBA na junta):** `tests/b-san3-12a-permissions-migration-drill-db.test.ts`, molde `tests/cheque-title-link-migration-drill-db.test.ts` (base própria `<db>_drill_<aleatório>`, `prisma migrate deploy`
  real em processo filho): (a) após o deploy as 2 chaves existem e `tenant_admin`/`super_admin` as têm, `finance`/`manager`/`auditor` não; (b) **idempotência**: aplicar o corpo 2× não duplica linha;
  (c) **rollback do runbook** executado e re-`deploy` convergem; (d) `permission-catalog-db-parity.test.ts` verde contra a base do drill.
- **Guards que mudam no mesmo PR (R2-01):** `tests/core-saas.test.ts` (`expectedPermissionCatalog`, l.17: +2 chaves — é o inventário deliberado), `tests/fixtures/role-catalog-contract.snapshot.json`
  (`ROLE_PERMISSIONS.tenant_admin` +2, na ordem do catálogo — o snapshot é editado à mão, não regenerado por script: `core-saas-role-authority.test.ts:42` exige literais independentes). A linha de base do
  `permission-catalog-migration-parity` **não é tocada** (A22 fica vermelho se alguém a crescer).
- **Ordem de travas e consistência:** nada muda no esquema das tabelas financeiras; o `findPendingByTitle`, o lock do título no vínculo e o CAS da conciliação usam colunas e índices existentes
  (`cheques.title_id`, `cheques.status`, `financial_entries.reconciled`, `reconciled_at`).

### 5.2 Permissões (código + provisionamento convergente)
- `PERMISSION_CATALOG` ganha `cheques:unlink_title` e `financial_entries:unreconcile` (`src/modules/core-saas/permissions/catalog.ts`; descrições PT-BR no mapa de descrições do
  `provision-rbac.ts`). `ROLE_PERMISSIONS.tenant_admin` ganha as duas; `finance`, `manager`, `auditor` **não**. `super_admin`/`platform_admin` recebem pelo catálogo integral (padrão da casa, `catalog.ts:39`).
- Chegam ao banco por `npm run db:provision-rbac` (aditivo e idempotente — `scripts/provision-rbac.ts:1-45`; a CI já roda "Provision database", `ci.yml:193`). **Com** a migração de DADOS de §5.1 (R2-01): é ela que leva as chaves a produção (`migrate deploy`, sem seed); o provisionamento converge os demais ambientes.
- O mapa estático do modo mock do front (`auth.adapter.ts:260-356`, `finance:` em `:334`) **não** recebe as novas (está defasado e tem dono: `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`, `B-SAN3-06a`); os testes do 12b
  injetam permissões explícitas, como `work-orders-page-live.test.tsx` faz com `ROLE_PERMISSIONS`.

### 5.3 Alternativa SÓ se a junta exigir rastro no agregado do cheque (autorização nominal pedida ao dono, Q2)
Migração aditiva `20260882000000_cheque_title_unlink_trail`: `ALTER TABLE cheques ADD COLUMN title_unlinked_at timestamptz NULL, ADD COLUMN title_unlinked_by uuid NULL,
ADD COLUMN title_unlink_justification text NULL, ADD COLUMN previous_title_id uuid NULL;` com `BEGIN/COMMIT` explícitos (`D-MIGRACAO-COM-TRANSACAO-EXPLICITA`) e `down` =
`DROP COLUMN` das quatro (sem perda: são novas e nuláveis). Drill por prefixo como no #456. **Default do plano: não fazer** — o rastro vai para a auditoria (§4.3), que é a trilha que a `D-AUDIT-REGRAS-CRITICO` manda consultar.

### 5.4 Dinheiro, tempo e exclusão
Dinheiro: `Decimal(12,2)` no banco; `Number` só na borda com `roundMoney`; **o front nunca soma** (T13 do plano v2 permanece: nenhum `reduce` sobre `amount` em `frontend/src/modules/finance/**`, guard em §8 F12).
Tempo: `occurred_at`/`reconciled_at`/`updated_at` são `timestamptz`; `bucket` do agregado em UTC. Exclusão: só lógica (`deleted_at`/`is_active`), nenhuma rota nova apaga nada.

### 5.5 Emenda dos arquivos-base (autorização nominal, Q3)
- `RBAC_MATRIX.md`: na lista de permissões planejadas (l.95+), acrescentar `cheques:unlink_title` (tenant_admin) e `financial_entries:unreconcile` (tenant_admin; **delegável** ao `finance` por política da organização).
  A linha "Finance" (l.49: `tenant_admin = tenant-finance-admin`, `finance = full`) **não muda** — "full" do Financeiro passa a ter duas exceções nomeadas, escritas na nota.
- `APPROVAL_LIMITS.md`: em `tenant_admin`, "Can delegate undo-reconciliation to finance via tenant policy; owns cheque-link swaps (justification required)"; em `finance`, "Undoes reconciliation only when
  delegated; requests cheque-link swaps, never performs them". Coerente com "finance: Can approve finance-sensitive flows **within tenant policy**" (l.50).
- `API_CONTRACTS.md` §Financeiro (l.452-537): as rotas/códigos de §4.2–4.7 e a versão `financeiro_baixa_conta_conciliacao@2026-10-24.b-san3-12`.

## §6 — Telas: tela-modelo, componentes, as 3 aparências, preferência do usuário, estados §7
### 6.1 Tela-modelo, referência e skills (`D-TELAS-SEGUEM-O-PADRAO`, item 4: todo prompt de dev cita)
- **Tela-modelo (lista + página-padrão):** `frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx` — de lá vêm `PageHeader`, `KpiStatCard`, `StatusPill`, `TablePager`
  (`components/patterns`), `ClickableKpiCard` (`components/kpi`), `StatePanel`/`StatePanelAction` e `StaleDataBanner` (`modules/work-orders/components/`, reusados por import
  como `DispatchConsolePage` e `patios/auction` já fazem — promover à biblioteca fica como pendência de biblioteca, fora do bloco), `useAutoRefresh`, `usePermissions().can`.
- **Camada de dados-modelo:** `finance/titles/{financial-titles.service,useFinancialTitles,adapter,types}` (erro **não** engolido em escrita; lista cai em `fallback` com `fallbackReason`).
- **Referência de layout/intenção:** a maquete aprovada (as 3 aparências, §0.4) movida para `screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html`;
  padrão de interação `financeiro-ab.reference.html` (`D-PADRAO-BLOCOS-CLICAVEIS`): bloco clicável com `aria-pressed` filtra a lista e o filtro sai com um clique; linha de **uma** linha
  (≤44 px), sem botão; reticências + `title` no texto longo; clique/Enter/Espaço abre o detalhe **embaixo** da linha, um por vez; o detalhe tem as propriedades e as ações.
- **Skills:** `ts-frontend-full` (implementar) e `ui-ux-pro-max` (revisar), em `.claude/skills/` e `.agents/skills/`.

### 6.2 Componentes — nascem NA biblioteca (item 3), com registro em `COMPONENT_LIBRARY.md`
| Componente | Tipo | Onde | Usado por |
|---|---|---|---|
| `KpiStatCard` + prop `pressed?: boolean` → `aria-pressed` (e `onClick` já existe) | **extensão** (`KpiStatCard.tsx:16-30`) | `components/patterns/KpiStatCard.tsx` | indicadores das 3 aparências |
| `DenseTable` + `renderDetail?: (row) => ReactNode` + `expandedKey` + teclado (Enter/Espaço) e `DenseExpandableRow` | **extensão + 1 novo** | `components/dense-list/` | todas as listas (títulos, extrato, contas) |
| `MoneyText` (formata `formatBRL`, cor por direção) — **só se** não houver equivalente em `components/ui`; senão reusa | condicional | `components/ui` | valores |
| `BalanceBridge` (ponte Abertura→Entradas→Saídas→Saldo) e `ReconcileDonut` (rosca) — SVG inline, zero dependência (PD-004), como `TrendChart` | **2 novos (12c)** | `components/charts/` | aparência B |
| `DayBars` (14 dias, entradas × saídas) — ou `TrendChart type="bar"` se bastar (preferir reuso) | condicional (12c) | `components/charts/` | aparência C |
| Formulários de dinheiro: `BaixaForm`, `ConciliarForm`, `NovaContaModal`, `DesvincularChequeModal` | módulo | `modules/finance/{entries,accounts}/components/` | 3 aparências (A em `Modal`; B/C inline no detalhe) |
Proibido: paleta, tipografia, espaçamento ou layout novos onde o `app.css` (`.pat-*`, `:3023-3869`) já tem o equivalente; `pattern-css-guard.test.ts` continua verde.

### 6.3 As 3 aparências sobre UMA camada de dados (sem duplicar fetch — lição do plano `B-APARENCIA-USUARIO:57`)
`FinanceiroPage.tsx` chama **uma vez** `useFinancialSummary()`, `useFinancialAccounts()`, `useFinancialEntries(filtros)`, `useFinancialTitles(filtros)`, `useReconciliationPolicy()`,
`useEntriesAggregate(…)` e passa dados + ações a `FinanceiroViewA` (abas), `FinanceiroViewB` (conta em foco), `FinanceiroViewC` (conferência), **views puras** em
`modules/finance/pages/views/`. Ações (baixar, conciliar, desfazer, nova conta, desvincular) vivem em `finance/entries/useFinanceActions.ts` e são as mesmas nas 3.
Querystring `?aba=rec|pag|ext|conc&conta=<id>` é o estado navegável de A (os redirecionamentos de `/finance/charges|payments` apontam para `?aba=rec|pag`).

### 6.4 Onde fica a preferência do usuário (o seletor ainda não existe — `P-APARENCIA-POR-USUARIO`)
- A tela consome `useScreenAppearance("financeiro")` → `"A" | "B" | "C"`, padrão **A** (`D-APARENCIA-RESPOSTAS` (b)), guardado em `localStorage` na chave
  `techsol.aparencia.<tenantId>.<userId>` (`D-APARENCIA-RESPOSTAS` (a); `userId` = `session.user.id`, `auth/types.ts:15`), isolado por organização e usuário, com `try/catch` como `useMapViewMemory.ts`.
- **Caminho preferido:** o hook e o seletor no **menu do usuário** vêm do `B-APARENCIA-USUARIO` (plano e crítica prontos em `docs/revisoes/TELAS/`), em paralelo ao 12a (§3, linha 1').
- **Caminho de contingência (declarado, sem pergunta nova):** se o `B-APARENCIA-USUARIO` não estiver mergeado quando o dev do 12b abrir o ramo, o 12b cria `frontend/src/hooks/useScreenAppearance.ts`
  com **exatamente** o contrato acima e um seletor **temporário** no cabeçalho da tela (3 botões A/B/C com `aria-pressed`, rótulos "Abas · Conta em foco · Conferência"), que o `B-APARENCIA-USUARIO`
  move para o menu do usuário sem mudar a chave. Nunca `tenant-settings` (é preferência pessoal, não da organização — `D-APARENCIA-POR-USUARIO`).

### 6.5 Estados obrigatórios (§7) — em cada aparência e em cada aba/painel
| Estado | Como aparece | Fonte do dado |
|---|---|---|
| carregando | esqueleto no lugar de indicadores, gráficos e linhas (nunca girador bloqueante) | `loading` dos hooks |
| vazio | sem contas → `StatePanel` "Cadastre a primeira conta" (botão só com `financial_accounts:create`); sem títulos/lançamentos → vazio honesto por aba | `items.length === 0` com `source !== "fallback"` |
| erro | `StatePanel` de erro com "Tentar novamente" — **nunca** lista vazia quando `source === "fallback"` (A10 do plano v2) | `source`, `fallbackReason` |
| acesso não permitido | `PermissionGuard` da rota (`financial_entries:read`) + painel por aba quando falta `financial_titles:read`/`financial_accounts:read`; Técnico de Campo cai sempre aqui | `can()` |
| dados desatualizados | `StaleDataBanner` ("Dados desatualizados — última atualização às HH:MM · Tentar novamente") quando o `refresh` falha com dado anterior em tela | `lastUpdatedAt`, erro do refresh |
| respostas de escrita | cada código de §4.1–4.6 vira mensagem PT-BR no formulário (lista fechada, §8 F4); 422 `title_has_pending_cheque` vira o bloco "trocar a vinculação" (§4.3); 403 `unreconcile_forbidden` vira "Seu perfil não pode desfazer; peça ao administrador" | `ApiError.status/reason` |
| baixa idempotente | `client_action_id` nasce ao abrir o formulário e se repete em todo reenvio; depois de qualquer não-sucesso a tela **relê o título** antes de falar e bloqueia o reenvio até a releitura voltar (B1 do plano v2) | `GET /financial-titles/:id` |
Sem termo técnico na UI (§B3): "organização", "perfil", "permissões"; nunca `tenant`, `role`, `reconciled`, código de rota.

## §7 — Arquivos tocados: escopo PERMITIDO / PROIBIDO
Regra do espelho: cada arquivo novo nasce ao lado do seu módulo de referência e segue o nome dele (`financial-titles.service.ts` → `financial-accounts.service.ts`, `financial-entries.service.ts`).

### 7.1 B-SAN3-12a (backend) — PERMITIDO
- `src/modules/financial-entries/financial-entry.{service,controller,routes,repository,prisma.repository,types,dto,validators}.ts` (recusa §4.2, política §4.4, agregado §4.5, CAS §4.6, DTO §4.7)
- `src/modules/cheques/cheque.{service,controller,routes,repository,prisma.repository,types,dto,validators}.ts` (`findPendingByTitle`, `unlink-title`, fecho do bypass do PATCH, `linkedPending*` no leitor)
- `src/modules/financial-summary/financial-summary.{compute,types,dto}.ts` e `financial-summary-prisma.repository.ts` (`cheques.linkedPending*`)
- `src/modules/financial-titles/financial-title.dto.ts` (**só** `workOrderId` na lista)
- `src/modules/tenant-settings/tenant-setting.validators.ts` (**só** o validador da chave `finance.unreconcile_delegated_to_finance`)
- `src/modules/core-saas/permissions/catalog.ts` (**só** as 2 permissões e a concessão ao `tenant_admin`), `scripts/provision-rbac.ts` (**só** as 2 descrições)
- `tests/financial-entries.test.ts`, `tests/cheques.test.ts`, `tests/financial-summary.test.ts` (casos novos) e **novos**: `tests/b-san3-12a-pay-pending-cheque-db.test.ts`,
  `tests/b-san3-12a-unlink-title.test.ts`, `tests/b-san3-12a-unreconcile-policy.test.ts`, `tests/b-san3-12a-entries-aggregate.test.ts` (+ `-db` de paridade), `tests/b-san3-12a-reconcile-cas-db.test.ts`
- `API_CONTRACTS.md` (§Financeiro), `RBAC_MATRIX.md` (**só** a nota de permissões, §5.5), `APPROVAL_LIMITS.md` (**só** as 2 linhas de §5.5) — autorização nominal (Q3)
- registro: `agent-orchestration/controle/{decisoes,pendencias}.md`, `docs/status-geral.md`, `docs/revisoes/SAN3/B-SAN3-12-plano-v3.md` (cópia deste plano), `PLANO_SAN3.md` (linha do bloco: M → G dividido)

**Ampliações nominais do 12a (v3 — cada uma responde a um achado da r2; fora delas, o arquivo continua PROIBIDO):**
| Arquivo | Só isto | Achado |
|---|---|---|
| `prisma/migrations/20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions/migration.sql` | **novo**; migração de DADOS das 2 permissões (§5.1); `prisma/schema.prisma` segue PROIBIDO | R2-01 (dono: "Autorizo") |
| `tests/core-saas.test.ts` | só `expectedPermissionCatalog` (+2 chaves) | R2-01 |
| `tests/fixtures/role-catalog-contract.snapshot.json` | só `ROLE_PERMISSIONS.tenant_admin` (+2) | R2-01 |
| `tests/b-san3-12a-permissions-migration-drill-db.test.ts` | **novo** (drill da migração de dados) | R2-01 |
| `src/modules/financial-uow/financial-uow.ts` | só `CHEQUE_REPO_KIND` (+`findPendingByTitle: "read"`) e `journaledCheques` (+ o membro) | R2-07 |
| `src/modules/tenant-settings/tenant-setting.service.ts` | só `upsert`: `parseValue(key, body.value)` (o validador recebe a chave) | R2-08 |
| `src/modules/financial-titles/financial-title.service.ts` | só `update` (guard de `amount` com cheque pendente) e `delete` (idem) | R2-03 (corolário) |
| `src/modules/financial-titles/cheque-pending-reader.ts` | **novo**: porta estreita títulos → cheques (idioma de `cheque-link-reader.ts`) | R2-03 (corolário) |
| `src/modules/cheques/cheque.service.ts` | além do §7.1: `create`/`update` com `title_id` passam a rodar em `uow.run` com o lock do título e a regra do valor exato; `cancel`/`delete` recusam cheque vinculado | R2-02, R2-03, R2-04 |
| `tests/financial-period-closes.test.ts` (l.141), `tests/financial-entry-reverse-restore-db.test.ts` (l.342), `tests/cheques.test.ts` (l.484), `tests/financial-uow-journal-classification.test.ts` (l.326) | só os chamadores de `reconcile` passam a enviar `expected_reconciled`/`expected_reconciled_at` | R2-09 |
| `RBAC_MATRIX.md` | além da nota de permissões (§5.5): **l.128** ("reusa a perm — sem permissão nova" → "desfazer exige `financial_entries:unreconcile` ou a política") e **l.130** ("vincula/desvincula `title_id` SÓ enquanto 'registered'" → desvínculo só por `unlink-title`; cancelar/excluir vinculado → `cheque_linked_unlink_first`; vínculo só do valor exato); conflito registrado em `controle/decisoes.md` antes de consolidar (§A2) | R2-10 |
| `src/config/business-time.ts` | **nada** (reusa `deriveCompetencia`/`deriveBusinessDate`/`BUSINESS_TIMEZONE`); se faltar helper de dia civil para SQL, ele nasce em `financial-entry-prisma.repository.ts` | R2-06 |

### 7.2 B-SAN3-12b (frontend, aparência A + camada) — PERMITIDO
- **novos:** `frontend/src/modules/finance/accounts/{financial-accounts.service,financial-accounts.adapter,financial-accounts.types,useFinancialAccounts}.ts`, `accounts/components/{NovaContaModal,AccountCard}.tsx`;
  `frontend/src/modules/finance/entries/{financial-entries.service,financial-entries.adapter,financial-entries.types,useFinancialEntries,useEntriesAggregate,useReconciliationPolicy,useFinanceActions}.ts`,
  `entries/components/{BaixaForm,ConciliarForm,DesvincularChequeModal,EntryDetail,TitleDetail}.tsx`; `frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx`; `frontend/src/modules/finance/pages/financeiro.state.ts` (querystring ↔ estado)
- **editados:** `frontend/src/modules/finance/pages/FinanceiroPage.tsx` (vira a página de 3 aparências; o painel atual é absorvido em A), `frontend/src/modules/finance/titles/financial-titles.service.ts` (`payFinancialTitle`, `getFinancialTitle`),
  `financial-titles.types.ts` (+`workOrderId`, payload da baixa), `titles/components/TitleRowActions.tsx` (a baixa **sai** do menu ⋮ e vira ação do detalhe — B2 do plano v2),
  `frontend/src/App.tsx` (**só** `/finance/charges` e `/finance/payments` → `<Navigate to="/finance?aba=rec|pag" replace />`), `frontend/src/layouts/appSidebarNav.ts` (**só** os `path` de `COBRANCAS`/`PAGAMENTOS` → `/finance?aba=…`),
  `frontend/src/navigation/tenantNavigation.ts` (idem, se tiver as duas entradas), `docs/navigation-matrix.md` (l.57-59)
- **biblioteca (ampliação nominal):** `frontend/src/components/patterns/KpiStatCard.tsx` (`pressed`), `frontend/src/components/dense-list/{DenseTable.tsx,DenseExpandableRow.tsx,types.ts,index.ts}`, `frontend/src/styles/app.css` (**só** regras `.pat-table__row--expanded`/`.pat-table__detail`), `COMPONENT_LIBRARY.md`
- **contingência §6.4:** `frontend/src/hooks/useScreenAppearance.ts` (+ teste) — só se o `B-APARENCIA-USUARIO` não tiver mergeado
- **testes:** `frontend/tests/finance-baixa.smoke.test.tsx`, `finance-contas-extrato.smoke.test.tsx`, `finance-conciliacao.smoke.test.tsx`, `finance-page-live.test.tsx` (DOM mínimo, molde `work-orders-page-live.test.tsx`),
  `finance-redirects.test.tsx`, `financial-accounts.adapter.test.ts`, `financial-entries.adapter.test.ts`, `dense-expandable-row.test.tsx`, `finance-no-money-reduce.guard.test.ts`; `frontend/package.json` (**só** a linha `test:smoke`); backend `tests/b-san3-12-ce4-db.test.ts` (CE-4 ponta a ponta)
- `docs/claude-code-handoff/screen-refs/financeiro-baixa-conta-conciliacao-3opcoes.reference.html` (a maquete) + `screen-refs/README.md` (índice) + correção da linha "Cheque" em `financeiro-3opcoes.reference.html`

### 7.3 B-SAN3-12c (frontend, aparências B e C) — PERMITIDO
`frontend/src/modules/finance/pages/views/{FinanceiroViewB,FinanceiroViewC}.tsx`, `frontend/src/components/charts/{BalanceBridge,ReconcileDonut,DayBars}.tsx` (+ `index.ts`), `COMPONENT_LIBRARY.md`,
`frontend/tests/finance-aparencia-b.smoke.test.tsx`, `finance-aparencia-c.smoke.test.tsx`, `balance-bridge.test.tsx`, `reconcile-donut.test.tsx`, `frontend/package.json` (**só** `test:smoke`).

### 7.4 PROIBIDO (nos três)
`prisma/schema.prisma` e `migrations/**` **salvo** a migração de DADOS de §5.1 (autorização nominal do dono, 25/10) — nenhuma DDL, `infra/**`, `.env*`, lockfiles, `.github/**`, `Kpis/**` (congelado, `D-GOV-PROPORCIONAL` (5)), `mobile/**`;
`src/modules/financial-titles/financial-title.service.ts` **fora** de `update`/`delete` (a máquina de estado do título é do #456 — nada aqui a toca) e `financial-title.repository.ts`, `src/modules/financial-uow/**` **fora** de `CHEQUE_REPO_KIND`/`journaledCheques`,
`src/modules/financial-period-closes/**`, `src/modules/work-orders/**`, `src/modules/expense-management/**`; no front: `modules/finance/{commissions,payable-source}/**`, `pages/InvoicesPage.tsx`
(B-SAN3-25), `modules/work-orders/**` (só **importar** `StatePanel`/`StaleDataBanner`), `navigation.registry.ts`, `auth.adapter.ts` (dono: B-SAN3-06a), telas de Cheques/Fechamento (B-SAN3-24),
estorno de baixa (`/reverse` — fora da fronteira, `PLANO_SAN3.md:268`), qualquer `reduce`/`+=` sobre dinheiro no front.

## §8 — Critérios de aceite, cada um com a mutação que o deixa vermelho
Formato: **critério → a mutação (uma linha) que o deixa vermelho** (o guard reconhece a propriedade, não a forma — lição C2 do B-O6R-04a). Todo teste novo nasce com **vermelho-controle** no head-base.

### 8.1 Backend (12a)
| # | Critério | Mutação que deixa vermelho |
|---|---|---|
| A1 | `/pay` de título com cheque `registered` ou `deposited` vinculado → 422 `title_has_pending_cheque`, `details.chequeIds` e `nextStep`; **nenhum** lançamento criado, `paid_amount` intocado; **nenhuma transação aberta** (contador de `uow.run` do UoW em memória = 0) | (v2) remover **as duas** checagens → 201 indevido; remover só o fast-fail → o contador de `uow.run` vai a 1 |
| A2 | título com cheque `cleared`/`bounced`/`cancelled` (ou sem cheque) baixa normalmente | trocar o `IN (registered, deposited)` por `<> cancelled` |
| A3 | precedência, com duas fixtures (cheque pendente **e** período fechado; `payment_method=check` **e** cheque pendente): `cheque_required` vence `title_has_pending_cheque`; este vence `period_closed` — molde `tests/cheque-title-link.test.ts:264-275` (K4) | (v2) remover **só o fast-fail** → a 1ª fixture responde `period_closed`; inverter a ordem das checagens → a 2ª responde `title_has_pending_cheque` |
| A4 | (v3, R2-02) **corrida `pay × vincular`** (`-db` e memória, barreira determinística em 2 pontos): (b) vínculo commita **depois** do fast-fail do `pay` e **antes** do lock do título → `pay` recebe 422 `title_has_pending_cheque`, nada criado; (c) `pay` trava primeiro → o vínculo relê sob o lock e recebe 422 `title_already_paid`; **invariante final:** nunca "título pago por outro meio **e** cheque pendente vinculado" | remover **só o re-check** → em (b) os dois commitam (vermelho); remover o lock do título no vínculo → em (c) o vínculo commita sobre título pago (vermelho) |
| A5 | `POST /cheques/:id/unlink-title` sem `cheques:unlink_title` → 403; com ela e `justification` de 9 caracteres → 400; `registered` e `deposited` → 200 com `titleId: null`; `cleared` → 422 `cheque_not_unlinkable`; sem título → 422 `cheque_not_linked`; cross-tenant → 404 | trocar o `requirePermission` por `cheques:update` |
| A5-bis | (v2, CRIT-12-01 vira execução) corrida `unlink-title × clear` (`-db`): exatamente um vence; se o unlink venceu, o `clear` posta caixa **sem** título (`reserved.titleId` nulo — comportamento do #456) e o título segue liquidável por outro meio; se o clear venceu, o unlink responde 409 `cheque_write_conflict` | tirar `title_id = <lido>` do `WHERE` do unlink |
| A6 | `PATCH /cheques/:id` com `title_id` nulo ou **diferente** do atual por `finance` → 403 `unlink_requires_privilege`; primeiro vínculo por `finance` → 200 | remover a comparação com o `title_id` atual |
| A7 | `unlink-title` grava auditoria `cheque.title_unlinked` com `severity: critical` e justificativa sanitizada; nenhum `tenant_id`/token nos metadados | apagar a chamada ao `EnterpriseAuditLogService` |
| A8 | `/pay` logo após o `unlink-title` → 201 (o título voltou a ser liquidável por outro meio) | não limpar `title_id` no unlink |
| A9 | `reconcile {reconciled:false}` por `finance` sem política → 403 `unreconcile_forbidden`; por `tenant_admin` → 200; por `finance` com a política `true` → 200; `manager` → 403 da rota | fixar `delegated = true` sem ler a política |
| A10 | `reconcile {reconciled:true}` por `finance` sem política → 200 (conciliar não muda) | aplicar o gate também ao `true` |
| A11 | `GET /financial-entries/reconciliation-policy` reflete o ator (`finance` sem política `false`; com política `true`; `tenant_admin` `true`) | calcular pela rota, não pelo ator |
| A12 | (v3, R2-08) `PUT /tenant-settings/finance.unreconcile_delegated_to_finance` com valor fora de `true|false` → 400 `invalid_value`; `"true"` → 200; outra chave com valor livre continua aceita (o validador decide **pela chave**, `parseValue(key, value)`) | aceitar qualquer string para a chave / recusar `"x"` numa chave alheia |
| A13 | (v3, R2-05) `reconcile` sem `expected_reconciled`/`expected_reconciled_at` → 400 `expected_state_required`, nada gravado; dois clientes **leem o mesmo estado** (`false`, `null`) e gravam em sequência → o 1º 200, o 2º **409 `reconciliation_stale` sempre** (memória: determinístico, sem relógio; `-db`: concorrente); estado defasado explícito (`true`, carimbo antigo) → 409; `reconciledBy` intocado nos 409 | tirar `reconciled`/`reconciled_at` do `WHERE` (Prisma) ou a comparação sob o mutex (memória) → o 2º recebe 200 |
| A14 | `aggregate group_by=none&reconciled=false` → `count`/`inflow`/`outflow` iguais à soma de fixture com centavos adversariais (0.1+0.2), em **memória e Prisma** (paridade `-db`); deletado não conta; cross-tenant não vaza | somar em `Number` antes do `round`; remover `deleted_at IS NULL` |
| A15 | `aggregate group_by=day` com 93 dias → 400 `aggregate_range_too_wide`; `month` com 25 meses → 400 | remover o teto |
| A16 | `financial-summary.cheques.linkedPendingAmount` = Σ cheques pendentes **com** `title_id`; sem vínculo = 0 | somar também os sem título |
| A17 | lista de lançamentos traz `description`/`updatedAt`; lista de títulos traz `workOrderId`; nenhum DTO traz `tenant_id` (`tests/audit-security.test.ts` verde) | remover o campo / expor `tenant_id` |
| A18 | catálogo: `tenant_admin` tem `cheques:unlink_title` e `financial_entries:unreconcile`; `finance`, `manager`, `auditor` não; `provision-rbac --dry-run` verde | conceder ao `finance` no catálogo |
| A4-bis | (v3) corrida `clear × pay` (`-db`): respostas do perdedor ∈ {`title_has_pending_cheque`, `title_already_paid`} (+ `overpayment` só com pagamento parcial anterior); **invariante final** igual ao A4 | remover fast-fail **e** re-check → o `pay` commita com o cheque ainda `deposited` e vinculado (estado proibido) |
| A17-bis | (v3, R2-10) todo `reason` lançado pelos módulos `financial-entries`, `financial-titles`, `cheques`, `financial-accounts` (censo gerado por script das fábricas `new …Error(` em `src/modules/financial-*/**` e `cheques/**`) está na lista fechada de §4.1 / `API_CONTRACTS.md` | criar `reason` novo sem listar |
| A19 | (v3, R2-03) vincular cheque de 40 a título com saldo 100 → 422 `cheque_amount_mismatch` (`details.chequeAmount=40`, `openBalance=100`); 100 → 200; após baixa parcial de 60, cheque de 40 → 200 e de 100 → 422; `PATCH` que vincula segue a mesma regra | comparar com `<=` em vez de igualdade |
| A20 | (v3, R2-04) `cancel` e `DELETE` de cheque `registered` **vinculado** → 422 `cheque_linked_unlink_first` para `finance` **e** para `tenant_admin`; após `unlink-title` → 200 com `cheques:update`; cheque sem título → comportamento de hoje | remover a checagem de `titleId` em `flipOnly`/`delete` |
| A21 | (v3) `PATCH /financial-titles/:id {amount}` e `DELETE /financial-titles/:id` com cheque pendente vinculado → 422 `title_has_pending_cheque`; `PATCH` só de `description` → 200; sem cheque pendente → como hoje | remover a leitura da porta `cheque-pending-reader` |
| A22 | (v3, R2-01) drill da migração de dados (§5.1 a–d) verde; `permission-catalog-migration-parity`, `core-saas`, `core-saas-role-authority` e `permission-catalog-db-parity` verdes **sem** tocar `PERMISSOES_HERDADAS_DO_SEED` | apagar o `INSERT INTO role_permissions` → db-parity e drill (a) vermelhos; acrescentar as chaves à linha de base → \"a fronteira não apodrece\" vermelho |
| A23 | (v3, R2-06) agregado com lançamento em `2026-10-31T23:30:00-03:00`: `month` → bucket `2026-10`; `day` → `2026-10-31` (memória **e** Prisma); outro em `2026-10-24T22:15:00-03:00` → `2026-10-24` | agrupar por `toISOString().slice(0,7|10)` → `2026-11`/`2026-11-01` (vermelho) |
| A24 | (v3) para os mesmos lançamentos, `aggregate group_by=month` por conta somado às contas == `financial-summary.cashFlow` da organização, mês a mês | agrupar o agregado por mês UTC |
| A25 | (v3, R2-02) vincular cheque roda em `uow.run` e trava a linha do título: `-db` com `pg_locks` mostra `FOR UPDATE` em `financial_titles` durante o vínculo; memória: contador de `uow.run` = 1 por vínculo | vincular fora da unidade → contador 0 / sem lock |

### 8.2 Frontend (12b, 12c)
| # | Critério | Mutação que deixa vermelho |
|---|---|---|
| F1 | a baixa chama `POST /financial-titles/:id/pay` com `account_id`, `amount`, `payment_method`, `occurred_at`, `client_action_id` (T1) | trocar por `PATCH /status` |
| F2 | o mesmo `client_action_id` em todo reenvio do mesmo formulário; formulário novo → id novo (T2) | gerar id a cada envio |
| F3 | depois de 409/422/rede a tela relê `GET /financial-titles/:id` antes de falar e bloqueia o reenvio até voltar (B1) | tratar como erro final sem releitura |
| F4 | os códigos de §4.1–4.6 (lista fechada de **31**) têm mensagem PT-BR distinta; desconhecido → genérica honesta (`invalid_amount` = **400**) | `catch` genérico |
| F5 | meios oferecidos = Pix, Transferência, Boleto, Dinheiro, Cartão — **nunca** cheque; aviso fixo do cheque presente; 422 `cheque_required` (cliente antigo) vira mensagem | incluir "Cheque" no seletor |
| F6 | 422 `title_has_pending_cheque` → bloco "Há um cheque vinculado aguardando compensação (R$, nº)"; com `cheques:unlink_title` → **Desvincular** (modal com justificativa → `POST /unlink-title` → a baixa reabre); sem → **pedido** pronto para o administrador, sem fila fingida | mostrar o botão a quem não tem a permissão |
| F7 | "Registrar recebimento/pagamento" só com `financial_entries:create` e em título ≠ `paid`/`cancelled`; "Nova conta" só com `financial_accounts:create`; "Conciliar" só com `financial_entries:update`; "Desfazer" só com `canUnreconcile`; Gestor/Auditor veem "Seu perfil só consulta…" (CE-G2) | gate por `financial_titles:update`; ignorar a política |
| F8 | saldo vem de `/balance`; dinheiro dos indicadores vem de `/financial-summary` ou `/aggregate` — **zero** `reduce`/`+=` sobre `amount` em `frontend/src/modules/finance/**` (guard sobre o diretório, T13) | somar `items.map(amount)` na view |
| F9 | `source === "fallback"` → `StatePanel` de erro, nunca lista vazia (T8/A10) | renderizar `items: []` |
| F10 | (v3) conciliar e desfazer **sempre** mandam `expected_reconciled` e `expected_reconciled_at` lidos da linha; 409 `reconciliation_stale` → "Este lançamento mudou; recarregue" e relê; 400 `expected_state_required` (nunca esperado) → mensagem honesta (T9) | omitir os campos (o servidor devolve 400 — o teste vê o 400, não um 200 cego) |
| F11 | indicador com `aria-pressed` leva à aba/lista filtrada e o chip de filtro sai com um clique (T11) | não filtrar |
| F12 | linha ≤44 px sem botão; detalhe embaixo, **um** por vez; Enter/Espaço abrem, Escape fecha (T12) | permitir dois abertos |
| F13 | `/finance/charges` → `/finance?aba=rec`; `/finance/payments` → `/finance?aba=pag`; itens de menu apontam para lá (A1 da crítica) | manter as páginas antigas roteadas |
| F14 | as 3 aparências renderizam com os **mesmos** dados: `fetch` chamado uma vez por rota por carga | chamar o hook dentro da view B |
| F15 | `useScreenAppearance("financeiro")` lê/grava `techsol.aparencia.<tenantId>.<userId>`; outro `userId` da mesma organização não herda; padrão A | tirar o `userId` da chave |
| F16 | estados §7 por aparência: carregando, vazio, erro, acesso não permitido (Técnico de Campo), desatualizado | remover o `StaleDataBanner` |
| F17 | nenhum termo técnico na UI (`tenant`, `role`, `reconciled`, path de rota) — guard textual sobre `modules/finance/**` | escrever "Tenant" num rótulo |
| F18 | **CE-4 `-db`** (`tests/b-san3-12-ce4-db.test.ts`): conta → título → baixa → lançamento no extrato → saldo → conciliar (com o estado esperado) → `reconciled:true` → conciliar de novo com o estado **antigo** → 409 `reconciliation_stale`; sem estado → 400 → desfazer sem privilégio 403 → com privilégio 200, como `finance` **com as permissões do banco** (`db:provision-rbac` + a migração de dados aplicada) | qualquer passo fora de ordem |
| F19 | o que o 12a não entregar **não é renderizado** (A3 da crítica: nada de placeholder, nada de "—" fingindo dado) | renderizar o cartão com "—" |
| F20 | (v3, R2-11) no detalhe de um lançamento **conciliado**, "Estornar"/"Excluir" aparecem desabilitados com a frase "Este lançamento está conciliado. Para estornar ou excluir, um administrador (ou o Financeiro, se a organização permitir) precisa desfazer a conciliação."; com `canUnreconcile` a ação primária é "Desfazer conciliação" | habilitar estornar em lançamento conciliado |
| F21 | (v3, R2-03) o formulário da baixa, ao receber 422 `title_has_pending_cheque`, **não** oferece "pagar o restante": mostra o valor do cheque pendente (= saldo) e o caminho da troca; nenhum campo de valor parcial | oferecer valor parcial |
| F22 | (v3) a tela de conciliação envia **sempre** `expected_reconciled` e `expected_reconciled_at` lidos da linha; depois de 409 relê e repinta a linha antes de permitir nova tentativa | enviar `null` fixo |

## §9 — Testes: baseline N, meta M≥2N, bateria exata
### 9.1 Baseline N e meta M ≥ 2N (do que o bloco toca; contagem de `test(` medida em §0.4)
| Sub-bloco | N (hoje) | M (meta) |
|---|---|---|
| 12a | `financial-entries.test.ts` 76 + `cheques.test.ts` 43 + `financial-summary.test.ts` (medir no ramo) ≈ 119 | ≥ 119 + **~85 casos novos** (A1–A25, A4-bis, A17-bis, cada um com negativo e cross-tenant) + 5 suítes `-db` (corrida pay×vincular, clear×pay, paridade e fuso do agregado, CAS, drill da migração de dados) |
| 12b | `finance-titles.test.tsx` 23 + `financial-summary.adapter.test.ts` 5 = 28 | ≥ **56** (F1–F19 em 9 arquivos novos; ≥ 6 casos por formulário de dinheiro) + CE-4 `-db` |
| 12c | 0 (views novas) | ≥ 24 (F14, F16, F19 por aparência; 2 componentes SVG × 4 casos) |
Pisos de regressão publicados (não medidos por mim): backend 3760/3762 (#457), frontend 1339/1339 (#452) — a bateria os re-mede.

### 9.2 Bateria exata (por PR; cada comando com saída no `DEV-relatorio.md`)
**12a** (raiz; worktree próprio com `npm ci` próprio — nunca junction; cluster Postgres descartável, nunca a base viva):
```
npm run check
npm run lint
node --test --import tsx tests/financial-entries.test.ts tests/cheques.test.ts tests/financial-summary.test.ts tests/financial-titles.test.ts tests/financial-accounts.test.ts
node --test --import tsx tests/b-san3-12a-*.test.ts
node --test --import tsx tests/permission-catalog-migration-parity.test.ts tests/core-saas.test.ts tests/core-saas-role-authority.test.ts tests/financial-period-closes.test.ts tests/financial-uow-journal-classification.test.ts   # v3: guards de catálogo + chamadores do reconcile
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx tests/b-san3-12a-permissions-migration-drill-db.test.ts tests/permission-catalog-db-parity.test.ts tests/b-san3-12a-pay-link-race-db.test.ts tests/b-san3-12a-aggregate-tz-db.test.ts tests/financial-entry-reverse-restore-db.test.ts   # v3
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx tests/b-san3-12a-pay-pending-cheque-db.test.ts tests/b-san3-12a-reconcile-cas-db.test.ts tests/b-san3-12a-entries-aggregate-db.test.ts tests/cheque-title-link-atomic-db.test.ts tests/financial-pay-title-atomic-db.test.ts
npm test
npm run build
npx tsx scripts/provision-rbac.ts --dry-run
node --test --import tsx tests/audit-security.test.ts
git diff --check
```
**12b / 12c** (raiz + `frontend/`):
```
npm --prefix frontend run check
node --test --import tsx frontend/tests/finance-*.test.tsx frontend/tests/financial-*.adapter.test.ts frontend/tests/dense-expandable-row.test.tsx frontend/tests/pattern-css-guard.test.ts
npm --prefix frontend run test:smoke        # em Node 22 E Node 20 (paridade com a CI, como no B-SAN3-01b)
npm --prefix frontend run build
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> npm run db:provision-rbac && node --test --import tsx tests/b-san3-12-ce4-db.test.ts
rg -n "reduce\(|\+= *[a-zA-Z.]*amount" frontend/src/modules/finance/ ; test $? -eq 1      # F8 também como comando
git diff --check
```
**Mutações de §8:** o dev roda cada uma, registra "vermelho" e restaura por hash (molde `DEV-relatorio.md §M` do B-SAN3-01b); a junta re-executa por amostragem (≥ 1/3, sorteada na ata).
**Limpeza (§C5):** `bash scripts/post-merge-cleanup.sh` após cada merge; cluster descartável derrubado; 1 linha no fechamento.

## §10 — Composição da junta e dev sugeridos
Regras: `D-IAS-EXTERNAS-PRIMEIRO` (Codex, Argon, Gemini Pro com teto em dólar vêm antes; o Claude da sessão cobre limite esgotado ou tarefa que falta); `D-GEMINI-SEGUNDO-REVISOR`
(Gemini nunca revisor único; ao menos uma cadeira não-Gemini); nível menor **declarado** em todo artefato (Opus / GPT-5.6 Sol / Argon); quem achou ≠ quem planeja ≠ quem desenvolve (§C7.4-bis);
`D-JUNTA-SO-CADEIRA-VERMELHA` (voto declara `arquivos_medidos`); inspetor de terreno antes de toda junta (CI concluída no head, cluster descartável por jurado); modelo de mandato P1–P8 colado.

| Sub-bloco | Dev sugerido | Crítico do plano | Cadeiras (unanimidade de 3) |
|---|---|---|---|
| **12a** (backend de dinheiro) | **Codex (GPT-5.6 Sol)**, uma tarefa paga por vez; fallback Claude Opus da sessão (declarado). Argon **não** (backend de dinheiro) | `critico-adversarial` em Opus (bloco de invariante, §C7.1-ter(b)) | C1 `agente-dba-guardiao`/dinheiro — **Claude Opus** (corrida A4, CAS A13, paridade A14, auditoria A7); C2 `coordenador-de-acessos` — **Codex Sol** (A5, A6, A9–A12, A18, catálogo × matriz × APPROVAL_LIMITS); C3 `guardiao-fail-closed` + contrato — **Gemini Pro** (API, teto US$ 5; A1–A3, A8, A15–A17, `API_CONTRACTS.md`) |
| **1'** (seletor de aparência) | **Argon** (tela sem regra de negócio) | — | 1 revisor independente não-Gemini (Codex) + CI (`D-GOV-PROPORCIONAL` (1)) |
| **12b** (telas A + camada) | **Argon** (dev de tela: aceitável) com vigia; fallback Claude Opus | revisor independente do plano de tela (Opus) — não é bloco de invariante | C1 `cognicao-visual` com `ui-ux-pro-max` — **Claude Opus** (F11, F12, F16, F17, F19, fidelidade à maquete); C2 `coordenador-de-acessos` — **Codex Sol** (F6, F7, F13, F15, CE-G2); C3 dinheiro/contrato do front — **Gemini Pro** (API, teto US$ 5; F1–F5, F8–F10, F14, F18) |
| **12c** (aparências B e C) | **Argon**; fallback Opus | — | se a junta do 12b não apontou regra nova: 1 revisor não-Gemini (Codex) + `cognicao-visual` (Opus) + CI; senão, as 3 cadeiras do 12b, com a régua do ciclo corrente |

Reprovação de junta: identidade **nova** em **Fable** audita e replaneja antes do ciclo seguinte (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`); teto de 2 ciclos — do 3º em diante só defeito grave de produto bloqueia
(perde dado, vaza entre organizações, quebra permissão, erra dinheiro). Porteiro pós-merge só depois do merge de produto (12a, 12b, 12c).

## §11 — Riscos e rollback
| # | Risco | Probabilidade / dano | Mitigação | Rollback |
|---|---|---|---|---|
| R1 | O #456 demora na junta e o 12a fica esperando | média / atrasa o caminho crítico | H1: o 12a abre o ramo **a partir de `a0f5aabc`** se o #456 não mergear em 48 h; o PR do 12a muda a base para `main` depois do merge (rebase) | nenhum (nada mergeado) |
| R2 | Corrida `clear × pay` não fechada pelo re-check (leitura READ COMMITTED vê cheque ainda `deposited` → recusa; ou já `cleared` → segue e o CAS do título guarda) | baixa / dupla contagem | A4 `-db` com barreira determinística; a ordem de travas período → título(lock) → cheque(leitura) não cria deadlock com a do #456 (período → cheque → lançamento → título) porque a leitura não trava — **a junta mede com `pg_locks`** | reverter o commit do 12a (sem migração, reversão limpa); permissões novas no banco ficam órfãs e inofensivas (ninguém as compara) |
| R3 | Permissão nova não chega ao banco em produção | baixa / 403 indevido para o admin | `db:provision-rbac` roda em todo deploy (convergente); A18 + `--dry-run` na bateria | o admin segue com `financial_entries:update` para conciliar; só o **desfazer** fica recusado até provisionar (fail-closed, declarado) |
| R4 | A política por `tenant-settings` vira "permissão escondida" fora do catálogo | média / auditabilidade | a chave é **nomeada** no catálogo de chaves (validador próprio), lida no serviço, exposta por `reconciliation-policy`, auditada quando usada (`financial_entry.unreconciled` com `delegated:true`); a `RBAC_MATRIX.md` a declara (§5.5) | desligar a chave (`"false"`) devolve o comportamento admin-only na hora |
| R5 | Desvínculo sem fila persistida vira "o Financeiro liga para o admin" | alta / processo, não dado | é o que o dono descreveu ("pede autorização e o superior analisa"); a fila durável tem dono (`B-O6R-07c-b2`) e pendência nomeada | — |
| R6 | Agregado em SQL diverge da memória (bucket em fuso diferente, `Number` antes do `round`) | média / número errado na tela | A14 paridade `-db` com centavos adversariais; bucket em UTC nos dois; `roundMoney` só na borda | o front **não renderiza** o cartão se o endpoint falhar (F19) — nunca inventa |
| R7 | Bloco G no front (12b) não converge em 2 ciclos | média / atraso | divisão 12b/12c; views puras; a regra de dinheiro inteira já está no 12a testado; mutações pré-rodadas pelo dev | PR do 12b fica aberto; 12a já entrega a regra no servidor (sem tela, mas sem o risco) |
| R8 | Seletor de aparência (1') não chega a tempo | média / contingência §6.4 | hook e seletor temporário no cabeçalho com a **mesma chave**; o 1' só move o seletor | nenhum (chave compatível) |
| R9 | Redirecionar `/finance/charges|payments` quebra atalhos/testes existentes (`finance-titles.test.tsx`, `sidebar-nav.test.tsx`, `san3-04a-sidebar-estoque-financeiro.test.tsx`) | alta / smoke vermelho | F13 ajusta esses testes **no mesmo PR**; `ChargesPage`/`PaymentsPage` ficam como legado sem rota (como `WorkOrdersListPage`), removidos pelo `B-SAN3-24` | manter as rotas antigas por um PR (opção (b) da crítica) se a junta pedir |
| R10 | Disco baixo na máquina do dono; sem Docker para o cluster descartável | alta / testes `-db` locais impossíveis | os `-db` rodam **na CI** (`backend-postgres`) — o dev registra que mediu pela CI, não localmente (`feedback-falha-de-ambiente-esconde-regressao`) | — |
| R11 | (v3) a regra do valor exato recusa um caso legítimo (cliente paga 40 em cheque + 60 em Pix) | média / processo | o dono decidiu: pagamento misto fica para bloco seguinte (`P-SAN3-12-PAGAMENTO-MISTO-CHEQUE`); a tela explica a recusa e sugere registrar o cheque **sem** título e baixar o título por Pix (os dois movimentos ficam no caixa; o título não dobra) | — |
| R12 | (v3) a migração de dados roda em produção por `migrate deploy` antes do código novo subir (ordem do deploy) — permissão existe no banco sem rota que a use por minutos | baixa / nenhum | aditiva e inofensiva (nenhuma rota compara a chave até o código subir) | runbook de rollback no rodapé da migração |
| R13 | (v3) `reconcile` dentro de `uow.run` muda o perfil de lock da conciliação em memória (mutex do tenant) — suítes que conciliam em paralelo no mesmo tenant podem serializar e ficar mais lentas | baixa / tempo de teste | medir o tempo de `tests/financial-entries.test.ts` antes/depois (±10%) | — |

## §12 — Pendências com dono e perguntas (com recomendação)
### 12.1 Pendências que este bloco FECHA (com o critério medido no fechamento)
`P-WEB-FIN-BAIXA-E-CONTA-SEM-TELA` (#28) e `P-WEB-CONCILIACAO-SEM-TELA` (#55) — no merge do **12c** (as 3 aparências), com o CE-4 `-db` verde na CI;
`P-SAN3-20-DESVINCULAR-DEPOSITADO` (12a, A5); `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (12a, A21 — v3); `P-SAN3-20-RESUMO-CHEQUE-VINCULADO` (12a, A16 + rótulo na tela em 12b).

### 12.2 Pendências que este bloco ABRE (com dono)
| Pendência | Dono |
|---|---|
| `P-SAN3-12-FILA-PEDIDO-DESVINCULO` — pedido/aprovação do desvínculo persistido (hoje: pedido visível + ato do admin com justificativa) | `B-O6R-07c-b2` (generalizar a fila de aprovações) |
| `P-SAN3-12-PREFERENCIA-APARENCIA-NO-SERVIDOR` — a preferência vive no navegador (v1); servidor junto da AWS (`D-APARENCIA-RESPOSTAS` (a)) | bloco da AWS |
| `P-SAN3-12-STATEPANEL-NA-BIBLIOTECA` — `StatePanel`/`StaleDataBanner` ainda moram em `work-orders/components` | bloco de biblioteca (sem dono; fila pós-gate) |
| `P-SAN3-12-ESTORNO-DE-BAIXA-SEM-TELA` — `/reverse` continua sem chamador na web (fora da fronteira) | `B-SAN3-24` |
| `P-SAN3-12-FILTRO-EXTRATO-POR-TITULO-E-MEIO` — `GET /financial-entries` não filtra por `title_id`/`payment_method` (a tela mostra o lançamento do título pelo `titleId` do DTO, sem filtro servidor) | próximo bloco de backend financeiro |
| `P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE` — fechada no 12b ao corrigir a linha "Cheque" da referência de 16/10 | 12b |
| `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE` (v3) — cheque de valor parcial + outro meio no mesmo título (dono, 25/10: *"pagamento misto fica para bloco seguinte"*) | próximo bloco de produto financeiro |
| `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO` (v3) — cheque desvinculado que compensa posta caixa sem título (R-res-3) | `B-SAN3-24` (tela de Cheques) |
| `P-SAN3-12-BOUNCE-COMO-DESVIO` (v3) — `bounce` sem privilégio tira o cheque do conjunto pendente (R-res-2) | junta do 12a decide se vira privilégio |
| `P-SAN3-12-CAS-VERSION-COLUMN` (v3) — se o ABA residual do §4.6 reproduzir, coluna `version` (migração de esquema, fora da autorização atual) | DBA / pedido ao dono |
| `P-SAN3-12-RBAC-MATRIX-128-CONFLITO` (v3, §A2) — `RBAC_MATRIX.md:128` diz "sem permissão nova" para o `reconcile`; registrado em `decisoes.md` e corrigido no PR do 12a | 12a |
| `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (já existe) — ganha as 2 permissões novas na lista do que falta | `B-SAN3-06a` |

### 12.3 Perguntas ao dono — cada uma com recomendação — **RESPONDIDAS** (apêndice no fim: *"Aceito as 4 (Recomendado)"*, 24/10 ~20:00 BRT; a v3 não abre pergunta nova — R2-01/03/04 já respondidos pelo dono em 25/10, apêndice; R2-11 é consequência, não regra nova)
**Q1 — Entregar em 3 PRs (12a backend → 12b aparência A + camada → 12c aparências B e C)?** A `D-TELAS-SAEM-COM-TRES` manda a tela sair com as 3; aqui ela só é dada
como pronta no 12c, mas o 12b já fecha o CE-4 e a regra de dinheiro inteira. **Recomendação: sim** — bloco G em junta de dinheiro converge pior (crítica v2), e a pressa é sua.
Alternativa: 12b com as 3 views num PR só (mais ~5 h de dev e mais ciclos de junta).

**Q2 — "Trocar a vinculação do cheque" na v1 = o Administrador desvincula com justificativa obrigatória e auditoria Crítica; o Financeiro vê o pedido pronto, sem fila persistida.**
É o mesmo desenho que você aprovou na `D-07CB-SUPERIOR-UNICO`; a fila durável de pedido/aprovação vem com o `B-O6R-07c-b2`. **Recomendação: sim.** Se quiser a fila já, o 12a
cresce (tabela nova + migração + 2 rotas) e passa a depender de `prisma/**` — autorização nominal e ~4 h a mais.

**Q3 — Mecanismo da "opção do Financeiro receber o privilégio" de desfazer conciliação = política da organização (`finance.unreconcile_delegated_to_finance`) ligada pelo
Administrador; e emenda nominal da `RBAC_MATRIX.md` e `APPROVAL_LIMITS.md` (§5.5) para registrar as 2 permissões novas.** Não existe hoje concessão de permissão por organização
(`roles.routes.ts` só lê); construí-la é um bloco de RBAC próprio. **Recomendação: sim** (a política fica declarada na matriz, auditada no uso e reversível na hora).

**Q4 — Depois do 12c, as páginas antigas `ChargesPage`/`PaymentsPage` saem do código no `B-SAN3-24`?** **Recomendação: sim** (uma tela só para o mesmo título — A1 da crítica).

**Q5 (só informar) —** a referência `financeiro-3opcoes.reference.html` (16/10) lista "Cheque" entre os meios da baixa; o 12b corrige a linha, porque é anterior à sua decisão de 21/10.

### 12.4 O que este plano NÃO decide (declarado)
Estorno de baixa pela tela (fora da fronteira, `PLANO_SAN3.md:268`); telas de Cheques e Fechamento (`B-SAN3-24`); faturar OS pela web (`B-SAN3-25`); fila durável de aprovações
(`B-O6R-07c-b2`); preferência de aparência no servidor (AWS); KPI (`Kpis/*` congelado — `D-GOV-PROPORCIONAL` (5)).

---

## Riscos residuais para a junta (o que a v3 mudou e ninguém atacou — para as cadeiras medirem)
| # | Risco | Quem mede | Como |
|---|---|---|---|
| R-res-1 | **Vincular passa a rodar dentro da UoW com lock do título** (§4.2): muda o caminho do #456 (`create`/`update` de cheque) — deadlock com `clear` (período → cheque → lançamento → título) se o vínculo travar o título **antes** do período | C1 (DBA) | `-db` com `pg_locks` e barreira: vínculo e `clear` do mesmo título em paralelo terminam (um 409/422, outro 200), sem `deadlock detected`; a ordem do vínculo é período(shared) → título(FOR UPDATE) → cheque |
| R-res-2 | **`bounce` `deposited→bounced` tira o cheque do conjunto pendente sem privilégio** (fato do banco, `cheques:update`): um Financeiro pode "devolver" um cheque que não voltou e baixar por Pix | C2 (acessos) | medir que `bounce` exige `bounce_reason` não vazio quando o cheque tem `title_id` (requisito **v3**: 400 `bounce_reason_required`) e gera auditoria `warning` com o `titleId`; a junta decide se vira privilégio (pendência `P-SAN3-12-BOUNCE-COMO-DESVIO`) |
| R-res-3 | **Cheque desvinculado que depois compensa posta caixa SEM título** (`reserved.titleId` nulo — comportamento do #456): se o admin desvincula e não cancela, o dinheiro entra sem título e o título é pago por Pix → caixa 2× | C1 | sonda igual à P1 do crítico, agora com o valor exato: `unlink` → `deposit` → `clear` → caixa sem título. Mitigação v3: a tela oferece "Cancelar o cheque" logo após desvincular (`registered`), e o 200 do `unlink-title` devolve `warning: "cheque_still_depositable"` quando `deposited`; pendência `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO` com dono |
| R-res-4 | **ABA residual do CAS por estado** (§4.6): re-conciliação dupla no mesmo ms com carimbo lido igual | C3 | `-db` adversarial opcional (dois `UPDATE` no mesmo ms com `reconciled_at` forçado igual); se reproduzir, a junta exige coluna `version` (migração de esquema — **fora** da autorização atual, vira pedido ao dono) |
| R-res-5 | **`$queryRaw` do bucket diário** com RLS: a consulta crua precisa rodar dentro de `withTenantRls` (como `sumByAccount`) — fora dela, vaza entre organizações | C2 | teste cross-tenant do agregado (`day`) com dois tenants na mesma base: cada um vê só os seus; mutação: tirar o `withTenantRls` |
| R-res-6 | **`cheque_linked_unlink_first` também para o Administrador** é desenho de um write-path, não um gate de permissão: a tela precisa encadear desvincular → cancelar sem deixar o cheque "no limbo" | C3 (visual) | smoke F6/F20: depois de desvincular, o detalhe mostra "Cancelar o cheque" e o estado do cheque; sem cancelar, aviso persistente |
| R-res-7 | **Snapshot editado à mão** (`role-catalog-contract.snapshot.json`): a ordem das chaves em `ROLE_PERMISSIONS.tenant_admin` precisa bater com o catálogo | C2 | `node --test tests/core-saas-role-authority.test.ts` no head; mutação: trocar a ordem das 2 chaves |
| R-res-8 | **12b depende do 12a em 5 pontos de contrato** (`title_has_pending_cheque.details`, `expected_*`, `reconciliation-policy`, `aggregate.timezone`, `cheque_amount_mismatch.details`) — se o 12a mudar um nome, o 12b quebra em silêncio | C3 do 12b | o 12b importa os `reason` de `API_CONTRACTS.md` via a lista única (§4.1) e tem teste de contrato que lê o `.md` (padrão `tests/api-contracts*.test.ts`) |

## Resposta do dono às 4 perguntas (24/10, ~20:00 BRT)
Resposta literal: ***"Aceito as 4 (Recomendado)"*** — (1) 3 PRs 12a → 12b → 12c; (2) troca da vinculação do cheque na v1 = admin com justificativa + auditoria crítica, sem fila (fila no bloco seguinte); (3) "desfazer conciliação" delegável ao Financeiro por política da organização, com emenda na RBAC_MATRIX e no APPROVAL_LIMITS; (4) ChargesPage/PaymentsPage saem no B-SAN3-24.

---

## Respostas do dono à crítica r2 (25/10, ~00:55 BRT) — literais
- Cheque parcial (R2-03): ***"Só cheque do valor exato (Recomendado)"*** — vincular cheque a título só se o valor do cheque for igual ao saldo do título; pagamento misto fica para bloco seguinte.
- Cancelar/excluir cheque vinculado (R2-04): ***"Mesmo privilégio da troca (Recomendado)"*** — exige o privilégio da troca da vinculação (admin), com justificativa e auditoria crítica.
- Migração de dados das 2 permissões novas (R2-01): ***"Autorizo (Recomendado)"*** — o 12a pode tocar `prisma/migrations` só para a migração de DADOS das permissões (aditiva, `BEGIN`/`COMMIT`, drill, DBA na junta).
