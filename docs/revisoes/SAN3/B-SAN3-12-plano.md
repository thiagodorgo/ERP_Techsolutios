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

---

## Emenda E1 (12a) — o que a execução do dev falsificou no PERMITIDO do §7.1, e o que entra (D-EMENDA-ANTES-DO-CODIGO)

> **Papel:** `planejador-mestre` (TOPO), identidade nova `planejador-san312-e1-fable`. **Modelo efetivo:** Fable 5.1 (`claude-fable-5-1`), o do
> frontmatter — sem fallback. **Data:** 2026-10-25. **Insumo:** `C:/Users/AMP/w-san312a/docs/revisoes/SAN3/B-SAN3-12a-dev.md` (F1–F9, dev
> `dev-san312a-opus`). **Ref medida:** worktree do dev `C:/Users/AMP/w-san312a`, head **`fafd4b36`** (ramo `feat/web-financeiro-baixa-e-contas-12a`,
> base `8a7885f4`), **só leitura**: nenhum arquivo do ramo editado, nada rodou contra a base viva (5432/6379, `erp-*`); banco, se preciso, no
> container descartável `plan12e1-pg` (porta alta em 127.0.0.1, removido ao fim). **Pendência que responde:** `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO`.
> **Estado:** COMPLETO (P1/P2 — cada F foi gravado ao ser medido; 9/9 procedem · 4 caminhos entram + 2 se ampliam · 1 sai · 0 perguntas ao dono).

### E1.0 — Método
Para cada F: **(a)** a falsificação procede? (re-medida por comando, não herdada do relatório); **(b)** o caminho exato que entra no PERMITIDO,
ou o que muda no desenho; **(c)** a expectativa nova de cada teste antigo que muda — **sem apagar caso**; **(d)** a mutação que deixa vermelho
cada critério novo. Regra geral que esta emenda fixa: **o PERMITIDO do §7.1 passa a listar, por nome, todo teste e toda fixture que a bateria do
§9.2 executa e que a regra do dono muda por construção** — o plano v3 mandava rodá-los (§9.2, l.550) e não autorizava tocá-los.

### E1.F1 — `tests/cheque-title-link.test.ts` e `tests/cheque-title-link-atomic-db.test.ts` (regra antiga do #456)
**(a) Procede.** Re-medido em `fafd4b36` (só leitura):
- `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/cheque-title-link.test.ts` → `not ok 2, 11, 13, 14, 16` = K1 l.98, K2 l.170, K2 l.189, K2 l.204, K3 l.229 — os mesmos 5 do relatório (`unlink_requires_privilege`, `cheque_amount_mismatch`, `title_has_pending_cheque` x2, `cheque_amount_mismatch`).
- `-db` contra `plan12e1-pg` (`127.0.0.1:55499`, `prisma migrate deploy` até `20260882000000`): `tests/cheque-title-link-atomic-db.test.ts` → `# tests 15 · pass 13 · fail 2` = `K2-db: clear parcial deriva partially_paid` (l.65) e `K2-db: título pago antes do clear aborta cheque e segundo lançamento` (l.80). O `T-K2d` (barreira pay x clear) e os outros 12 seguem verdes.
- O §7.1 cita `cheque-title-link.test.ts` só como MOLDE (K4, l.264-275) e o `-atomic-db` só na BATERIA (§9.2, l.550): o plano mandava rodá-los e não autorizava tocá-los. Falsificação do **inventário**, não do desenho: cada vermelho é a regra do dono funcionando (valor exato; mesmo privilégio da troca; baixa recusada com cheque pendente; título com cheque pendente não é apagado).

**(b) Entram no PERMITIDO:** `tests/cheque-title-link.test.ts` — **só** os 5 casos nomeados abaixo (reescritos; nenhum apagado; o nome do caso passa a dizer a regra nova); `tests/cheque-title-link-atomic-db.test.ts` — **só** os 2 casos K2-db (l.65, l.80). Fora deles os dois arquivos seguem PROIBIDOS: os outros 33 + 13 casos são a regressão do #456 e continuam verdes no head.

**(c) Expectativa nova, caso a caso:**

| Caso (linha no head) | Afirmava (#456) | Passa a afirmar (regra do dono) |
|---|---|---|
| K1 l.98 "PATCH vincula e null explícito desvincula enquanto registered" | PATCH `{title_id:null}` desvincula com `cheques:update` | PATCH vincula (1º vínculo, `cheques:update`) → `titleId`; PATCH `{title_id:null}` pelo MESMO ator (sem `cheques:unlink_title`) → **403 `unlink_requires_privilege`**, vínculo intacto; pelo ator COM o privilégio → **422 `cheque_linked_unlink_first`** (D1, abaixo), vínculo intacto; `unlinkTitle(ctx admin, id, { justification })` → `titleId` undefined; em seguida PATCH `{title_id}` volta a ser 1º vínculo → 200 |
| K2 l.170 "clear parcial deriva partially_paid" | cheque 100 em título 300 → clear → `partially_paid`/100 | cheque 100 em título 300 → **422 `cheque_amount_mismatch`** (`details.chequeAmount=100`, `openBalance=300`); `payTitle(pix 200)` → `partially_paid`/200; cheque 100 (= saldo) vincula → deposit → clear → **`paid`/300**. A propriedade do caso (o clear deriva o status pelo `paidAmount`) fica; com valor exato o clear leva sempre a `paid` |
| K2 l.189 "título pago depois do vínculo faz clear falhar sem tocar cheque/razão" | pix paga o título com cheque `deposited` vinculado; clear → 422 `title_already_paid` | `payTitle(pix)` com cheque `deposited` vinculado → **422 `title_has_pending_cheque`** (`details.chequeIds` contém `cheque.id`, `nextStep: "unlink_cheque"`, `requiredPermission`); cheque segue `deposited`, `clearedEntryId` undefined, **0 lançamentos**, título `open`/`paidAmount 0` (o "sem tocar cheque/razão" migra para o lado da baixa); o clear em seguida liquida (`paid`, 1 lançamento) |
| K2 l.204 "título apagado depois do vínculo faz clear falhar fechado" | `titles.delete` apaga; clear → 404 `title_not_found` | `titles.delete(ctx)` → **422 `title_has_pending_cheque`** (A21), título vivo, cheque `deposited`; **e**, para não perder o caso original, apagar pelo REPOSITÓRIO (fora do serviço: `getMemoryFinancialTitleRepositoryForTests()`, o mesmo atalho que o arnês P7 usa) → clear → 404 `title_not_found`, cheque `deposited`, 0 lançamentos — o "falha fechado" do clear continua medido |
| K3 l.229 "pagamento misto volta ao parcial quando o cheque é devolvido" | cheque 100 + pix 200 em título 300; bounce → `partially_paid`/200 | cheque 100 em título 300 → **422 `cheque_amount_mismatch`** (misto = `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE`); `payTitle(pix 200)` → `partially_paid`; cheque 100 vincula → deposit → clear → `paid`/300; `bounce` (com motivo — A26) → **`partially_paid`/`paidAmount 200`**: "a devolução restaura o estado anterior" mantida, com a ordem pix → cheque |
| K2-db l.65 | = K2 l.170 | = K2 l.170 contra o Postgres (`paid_amount` 300, `status paid`; o 422 do cheque 100 em 300) |
| K2-db l.80 | = K2 l.189 | = K2 l.189: `financialEntry.count = 0`, cheque `deposited`, `cleared_entry_id null`; clear → `paid`, `count 1` |

**(d) Mutação que deixa vermelho cada caso reescrito** (todas já no roteiro E4 do dev, que as re-roda sobre os casos novos):
K1 → remover o 422 do PATCH privilegiado (D1) → o admin desvincula pelo PATCH (vermelho); remover a comparação com o `titleId` atual (A6) → o finance desvincula (vermelho). K2 l.170 / K2-db l.65 / K3 → `<=` no lugar de `===` no valor exato (A19) → o cheque de 100 vincula em 300 (vermelho). K2 l.189 / K2-db l.80 → remover fast-fail **e** re-check (A1-ambas) → o pix paga (vermelho). K2 l.204 → remover a leitura da porta `cheque-pending-reader` no `delete` (A21) → o delete passa (vermelho).

**D1 — ajuste de desenho (leitura do planejador, §A6; não é pergunta ao dono).** Medido no head, `cheque.service.ts:204-221`: o PATCH com `title_id: null` ou diferente **por quem tem `cheques:unlink_title`** desvincula sem justificativa e sem a auditoria Crítica — só o 403 de quem não tem o privilégio foi fechado. Isso contradiz a Q2 que o dono aceitou ("o Administrador desvincula **com justificativa obrigatória e auditoria Crítica**") e o princípio do próprio §4.3 ("um só write-path carrega o privilégio"), e é o risco residual que o dev deixou para a junta (E7, último item). Passa a ser: `titleId !== undefined && current.titleId !== undefined` → sem o privilégio **403 `unlink_requires_privilege`** (como está); com o privilégio **422 `cheque_linked_unlink_first`** — a única porta que tira ou troca o vínculo é `POST /cheques/:id/unlink-title`. "Trocar" = `unlink-title` (justificativa + auditoria) e depois PATCH do 1º vínculo (`cheques:update`). Toca só arquivos já PERMITIDOS: `cheque.service.ts` (`update`, 1 ramo), `tests/b-san3-12a-unlink-title.test.ts` (**A6-bis**: `tenant_admin` PATCH null/diferente → 422; `unlink-title` → 200; mutação = apagar o ramo do 422 → o admin recebe 200), `API_CONTRACTS.md` (l.537-538), `RBAC_MATRIX.md` (l.130). A alternativa que a junta pode preferir — 422 para todos e tirar o 403 — é mais simples, mas a tela perde a distinção "peça ao administrador" x "use Desvincular (com justificativa)"; fico com a mínima.

### E1.F2 — `tests/financial-uow-journal-classification.test.ts` (arnês P7: fixture e contagem de `findPendingByTitle`)
**(a) Procede.** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/financial-uow-journal-classification.test.ts` → `# tests 46 · pass 44 · fail 2`: `not ok 32 [P7][cheques.findPendingByTitle] classificado read … não tem fixture de invocação aqui` e `not ok 45 [P7] … o harness exerceu 40 membros write/read (medido nos contratos: 11+9+9+10 = 39)`. O arnês (l.404-440, l.469-500) julga **todo** membro de `CHEQUE_REPO_KIND` por fixture de invocação + prova de vida; a R2-07 pôs `findPendingByTitle: "read"` no mapa (`financial-uow.ts:231-232`) e o §7.1 só autorizou o chamador do `reconcile` (l.326, que o dev já ajustou). Falsificação de inventário.

**(b) Entra no PERMITIDO** (ampliação de `tests/financial-uow-journal-classification.test.ts`, além da l.326), **só**:
(i) `CHEQUE_CALLS.findPendingByTitle: (ctx, s) => ctx.cheques.findPendingByTitle(TENANT, s.titleId)`;
(ii) `PREPARES["cheques.findPendingByTitle"]`: cria pelo repositório, FORA da unidade e ANTES do snapshot (o idioma de `cheques.findActiveByLinkedEntry`, l.265-282), um cheque `received`, `amount: 500` (= saldo do título da semente, l.116-128), `titleId: s.titleId`, status `registered` — o repositório aceita `titleId` no `create` (`cheque.repository.ts:154`); o cheque da semente (l.141-150) continua **sem** título, para `list`/`findById` não mudarem;
(iii) `READ_RETURN_NONEMPTY["cheques.findPendingByTitle"] = hasRows` (retorno `readonly Cheque[]`, `cheque.repository.ts:35`);
(iv) a contagem do teste l.539: `39 → 40`, comentário `11+9+10+10 = 40`.

**(c)** Os 2 casos ficam verdes; os 44 restantes não mudam (leitura não muta; a PREPARES roda antes do snapshot).

**(d) Mutação:** o arnês é a própria mutação — `titleId` de outro id na PREPARES → retorno vazio → vermelho "fixture MORTA"; apagar a fixture → vermelho "não tem fixture"; `findPendingByTitle` em memória que ignore `deletedAt` ou aceite `cleared` → A2 do bloco vermelho (roteiro E4).

### E1.F3 — `tests/fixtures/o6r07c-classificacao-vias.json` (censo das rotas: 3 rotas novas não classificadas)
**(a) Procede.** `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/o6r07c-census-guard.test.ts` → `not ok 2 T1` (3 `NAO-CLASSIFICADA`: `ROTA GET /api/v1/financial-entries/aggregate`, `ROTA GET /api/v1/financial-entries/reconciliation-policy`, `ROTA POST /api/v1/cheques/:chequeId/unlink-title`) e `not ok 15 T14`. Gerei o instantâneo **fora do repo** (`node --import tsx tests/helpers/o6r07c-census.ts gravar <scratchpad>/e1-vias-gerado.json`): 471 chaves vivas, 0 violações; diff com a fixture commitada = **exatamente 3 entradas a mais**, nenhuma das 468 muda: `GET …/aggregate {LEITURA, n:1}`, `GET …/reconciliation-policy {LEITURA, n:1}`, `POST …/unlink-title {SEM-ALCANCE-CAMPO, n:1}`. Coerente com as irmãs (`GET /financial-entries` = LEITURA; `POST /cheques/:id/clear` = SEM-ALCANCE-CAMPO — o técnico de campo não tem `cheques:unlink_title`, o RBAC decide). `git status --porcelain` do worktree seguiu vazio.

**(b) Entra no PERMITIDO:** `tests/fixtures/o6r07c-classificacao-vias.json` — **só por regeneração pelo gerador** (`node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json`, cwd = raiz do worktree), nunca à mão; o diff do PR tem de ser exatamente as 3 entradas acima (o dev cola o diff no relatório; a junta compara). `tests/helpers/o6r07c-census.ts` e `tests/o6r07c-census-guard.test.ts` seguem PROIBIDOS. Toda rota nova de backend paga esta regeneração — vai para o §7.1 como regra geral, não só deste bloco.

**(c)** T1 e T14 verdes; os outros 13 T não mudam.

**(d) Mutação:** editar à mão a classe de `unlink-title` para `LEITURA` → T6 `CLASSE-INCOMPATIVEL` vermelho; apagar uma das 3 entradas → T1 vermelho; conceder `cheques:unlink_title` ao `field_technician` no catálogo → a classe gerada deixa de ser `SEM-ALCANCE-CAMPO` → T14 vermelho (o guard pegando permissão errada por construção).

### E1.F4 — `src/modules/financial-summary/financial-summary.repository.ts` (memória não projeta `titleId`)
**(a) Procede.** `src/modules/financial-summary/financial-summary.repository.ts:58` projeta `{ direction, status, amount }` sem `titleId`; o `compute` do head (l.145-152) soma `linkedPending*` só quando `cheque.titleId != null` → em memória o resultado é sempre 0. `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/financial-summary.test.ts` → `# tests 15 · pass 14 · fail 1` (`A16 (serviço, memória) … expected 1, actual 0`). O §7.1 listou `compute`, `types`, `dto` e o `-prisma.repository` e esqueceu a cópia em memória — inventário.

**(b) Entra no PERMITIDO:** `src/modules/financial-summary/financial-summary.repository.ts` — **só** a projeção da l.58: `titleId: c.titleId ?? null` (o campo existe na entidade, `cheque.types.ts:42`). Nada mais nesse arquivo.

**(c)** A16 (serviço, memória) verde. A paridade memória x Prisma do resumo passa a cobrir `cheques.linkedPending*`: o dev acrescenta a asserção na suíte `-db` que já lê o resumo (ou em `b-san3-12a-pay-pending-cheque-db`): o mesmo arranjo (1 cheque pendente com título + 1 sem) → `linkedPendingCount = 1` e o mesmo `linkedPendingAmount` nos dois repositórios.

**(d) Mutação:** tirar o `titleId` da projeção → A16 (serviço) vermelho — é o estado atual, o vermelho-controle já está medido; somar também os sem título no compute → A16 (compute) vermelho (roteiro E4).

### E1.F5 — `tests/fixtures/role-catalog-contract.snapshot.json` em `super_admin`/`platform_admin` (PERMISSÃO)
**(a) Procede — e NÃO muda quem tem o privilégio.** Medido em `fafd4b36`:
- Script no scratchpad (`e1-snapshot.ts`, importa o catálogo do worktree e compara com o snapshot): `PERMISSION_CATALOG.length = 200`; `super_admin` e `platform_admin` no snapshot = **198** (faltam exatamente `financial_entries:unreconcile` e `cheques:unlink_title`); `tenant_admin` 187 = IGUAL (o dev editou); os outros 10 papéis IGUAIS. E `ROLE_PERMISSIONS.super_admin === PERMISSION_CATALOG` → `true`, `ROLE_PERMISSIONS.platform_admin === PERMISSION_CATALOG` → `true` (**mesma referência**, `catalog.ts:419`, `:736`): toda chave nova do catálogo é, por construção, dos dois papéis de plataforma. `TENANT_ADMIN_PERMISSIONS` = catálogo sem `platform:` (`:414`); comentários `:39`, `:446-447`: "tenant_admin/super_admin/platform_admin por HERANÇA do catálogo (o padrão)".
- `DATABASE_URL=<plan12e1-pg> node --test --import tsx tests/core-saas-role-authority.test.ts` (sem `CORE_SAAS_PERSISTENCE=prisma`, como o dev) → `# tests 12 · pass 11 · fail 1` = `not ok 3 contrato do consumidor de deploy: snapshot…` (`deepEqual` de conteúdo E ordem, l.89-111). Nota de terreno: com `CORE_SAAS_PERSISTENCE=prisma` exportado, o caso 12 dá 500 — a suíte usa `MemoryCoreSaasAdapter`; é ambiente do invocador, não do bloco; a bateria do §9.2 ganha a observação (E1.10).
- **Precedente, medido no history do snapshot:** na última permissão nova do catálogo (`work_orders:approve`, `dc8168b9`, B-O6R-07a) o snapshot cresceu `super_admin 197→198`, `platform_admin 197→198`, `tenant_admin 184→185` — os três juntos. No `aadaa6d5` (B-SAN3-04a, sem chave nova) só `finance` mudou (56→61). É o padrão para TODA permissão nova.
- **Regra escrita, com fonte:** `RBAC_MATRIX.md` l.29-47 (matriz-base: `platform_admin` = **full** em "Finance" e em "Billing"); as notas por permissão sempre nomeiam os três (l.128 `financial_entries`: "create+update → super_admin, platform_admin, tenant_admin, finance"; l.130 `cheques`: idem; l.151 `checklist_runs:reopen`: "→ super_admin, platform_admin, …"); a l.131 que o dev já escreveu segue a forma. `APPROVAL_LIMITS.md` l.26 (`### platform_admin`). O plano v3 que o dono aceitou (Q3, "Aceito as 4") **já dizia** "super/platform por herança" (§4.3 l.244, §4.4 l.269, §5.2 l.346); a migração §5.1 concede a `super_admin` no banco (`platform_admin` é pseudo-papel sem linha, molde `20260861000000`) — medido no descartável depois do `provision-rbac`: `cheques:unlink_title | super_admin,tenant_admin` e `financial_entries:unreconcile | super_admin,tenant_admin`.
- **Conclusão:** herança automática + regra escrita + já no plano aprovado → o "só `ROLE_PERMISSIONS.tenant_admin` (+2)" do §7.1 era o inventário do SNAPSHOT errado, não a distribuição do privilégio. "Admin", nas palavras do dono, cobre o administrador da organização e os papéis de plataforma acima dele (matriz-base). `finance` continua sem as duas (A18). **Sem pergunta ao dono.**

**(b) Entra no PERMITIDO** (ampliação de `tests/fixtures/role-catalog-contract.snapshot.json`): `ROLE_PERMISSIONS.super_admin` e `ROLE_PERMISSIONS.platform_admin` (+2 cada, nas MESMAS posições do catálogo — `financial_entries:unreconcile` logo após `financial_entries:update`; `cheques:unlink_title` logo após `cheques:update`), além do `tenant_admin` já autorizado. Editado à mão (literais independentes, §5.1/R2-01), nunca regenerado do próprio catálogo.

**(c)** `core-saas-role-authority.test.ts` caso 3 verde (12/12 com banco); `tests/core-saas.test.ts` já verde (+2 no `expectedPermissionCatalog`). A18 passa a dizer por extenso: `tenant_admin`, `super_admin`, `platform_admin` têm as duas; `finance`, `manager`, `auditor` não (o dev já escreveu assim).

**(d) Mutação:** trocar a ordem das 2 chaves em `super_admin` → vermelho (`deepEqual` sensível à ordem; R-res-7); tirar uma das duas de `platform_admin` → vermelho; tirar `cheques:unlink_title` do `PERMISSION_CATALOG` → `core-saas.test.ts` vermelho; conceder ao `finance` no catálogo → A18 vermelho (roteiro E4).

### E1.F6 — `scripts/provision-rbac.ts` não tem mapa de descrições
**(a) Procede.** `scripts/provision-rbac.ts:38-47` declara: "DESCRIÇÕES (degradação declarada — D-007): o texto curado de cada permissão vive em `permissionDescriptions` de `prisma/seed.ts` … Permissão criada por este script nasce com a descrição genérica `Permissão <chave>.`" — não há mapa de descrições no script (`P-RBAC-PROVISION-DESCRICOES`, 2026-08-08, BAIXA). O §5.2 ("descrições PT-BR no mapa de descrições do `provision-rbac.ts`") afirmava um mapa que **não existe**; `prisma/seed.ts` é PROIBIDO. Confirmado em execução no descartável: `npx tsx scripts/provision-rbac.ts` → "196 criada(s) com descrição genérica" (as 4 que já existiam vieram das migrações de dados — inclusive as 2 deste bloco, com texto curado).

**(b) Desenho:** as 2 descrições curadas vivem na **migração de dados** (o dev já as escreveu: `('financial_entries:unreconcile', 'Desfazer a conciliação bancária de um lançamento (delegável ao Financeiro por política da organização).')`, `('cheques:unlink_title', 'Trocar a vinculação de um cheque ao título, com justificativa e auditoria crítica.')`) — o caminho de produção. `scripts/provision-rbac.ts` **sai do PERMITIDO** (nada a fazer nele; continua na bateria com `--dry-run`). `prisma/seed.ts` segue PROIBIDO. Nota, não pendência nova: o seed (só dev/demo) faz `upsert` com `update: { description }` (`prisma/seed.ts:232-238`) e sobrescreveria o texto curado pela genérica — é a duplicação pré-existente de `P-RBAC-PROVISION-DESCRICOES`; o dev acrescenta 1 linha nessa pendência com as 2 chaves.

**(c)/(d)** Sem teste novo: A22(a) já mede que as 2 chaves existem após `migrate deploy`; descrição é texto interno (nenhuma rota lê `permissions.description`). Observação medida para o drill: numa base NOVA, migrada sem papéis, o `INSERT INTO role_permissions … FROM roles` da migração casa 0 linhas (a armadilha que o cabeçalho do `provision-rbac.ts` descreve; aqui o `provision-rbac` concedeu as 2 chaves a `super_admin,tenant_admin` em seguida) — o drill A22(a) semeia os papéis de sistema antes do deploy, como o molde; a convergência real vem do `db:provision-rbac` em todo deploy (R3 do §11).

### E1.F7 — `details` no envelope de erro (`core-saas/routes/http.ts` fora do PERMITIDO)
**(a) Procede como lacuna do plano, não como bloqueio.** `src/modules/core-saas/routes/http.ts:28-45` só emite `code/reason/message`. Há precedente **na casa** para o que o dev fez: `src/modules/financial-period-closes/financial-period-close.routes.ts:61-71` serializa `details` com um wrapper LOCAL do módulo ("os demais erros caem no `sendRouteError` compartilhado"). O dev seguiu esse idioma — `cheque.controller.ts:138-149`, `financial-entry.controller.ts:84-89`; `ChequeError`/`FinancialEntryError` ganharam `details?: Readonly<Record<string, unknown>>` (`cheque.types.ts:195-200`, `financial-entry.types.ts:174-182`) — tudo em arquivos PERMITIDOS. Implementação, não remédio.

**(b)** `src/modules/core-saas/routes/http.ts` **fica PROIBIDO, nomeado**. O §4 ganha a frase: "`details` sai pelo controller do módulo (idioma de `financial-period-close.routes.ts:61-71`); o envelope comum não muda". A allowlist §B2.8 vale para `details`: nunca `tenant_id`, token, path, bucket ou binário (A17 + `tests/audit-security.test.ts` medem).

**(c)/(d)** A1 já assere `details.chequeIds`/`nextStep`/`requiredPermission`; A19 `details.chequeAmount`/`openBalance`. Mutação nova no roteiro, **F7-wrapper**: apagar o wrapper do controller (o erro cai no `sendRouteError` comum) → A1 e A19 vermelhos (o 422 sai sem `details`).

### E1.F8 — A17-bis impossível na letra (censo de `reason` dos módulos)
**(a) Procede.** Censo na base `8a7885f4` (E5 do dev, re-lido no teste): 61 `reason` lançados pelos 5 módulos, 37 sem contrato escrito; a lista de 32 do §4.1 é "o que a **tela** traduz". A17-bis na letra ("todo `reason` lançado pelos módulos está na lista fechada") era **impossível de passar por construção** — artefato do critério (§C7.4(a)), não defeito do produto. `node --test --import tsx tests/b-san3-12a-reasons-census.test.ts` → **4/4** no head: o censo é gerado das fontes, congela 26 pré-existentes, exige contrato para todo o resto e só deixa a dívida encolher.

**(b) Desenho — A17-bis reescrito** (vale no lugar do texto do §4.1 l.217 e da linha A17-bis do §8.1): (i) todo `reason` **novo** do bloco (os 12 do §4.1 + `bounce_reason_required`, `invalid_group_by`, `invalid_from`, `invalid_to`) está em `API_CONTRACTS.md`; (ii) todo `reason` lançado por `financial-entries`, `financial-titles`, `financial-accounts`, `cheques`, `financial-summary` está no contrato **ou** na lista congelada `PRE_EXISTENTES_SEM_CONTRATO` (26; escopo `pre-existente`, §C7.1-ter(a), com N, forma e causa publicados); (iii) a lista só encolhe — documentado ou extinto sai dela. Pendência `P-SAN3-12-REASONS-SEM-CONTRATO` (dono: próximo bloco de backend financeiro), já aberta pelo dev — fica.

**(c)/(d)** Verde no head. Mutações: criar `reason` novo sem contrato → vermelho (E4 `A17bis`); documentar um dos 26 no contrato sem tirá-lo da lista → vermelho (3º caso); apagar a leitura dos módulos (censo vazio) → vermelho (1º caso, `>= 61`).

### E1.F9 — `bounce_reason_required` (R-res-2) fora do §4 e da lista de 32
**(a) Procede.** `bounce_reason_required` aparece no plano só na R-res-2 (l.650, "requisito v3"), fora do §4.3, do §8.1 e da lista de 32 — inconsistência interna. O dev implementou (`cheque.service.ts:101-105`: `bounce` de cheque **com `title_id`** sem motivo → 400 `bounce_reason_required`; auditoria `cheque.bounced` com `severity: warning` e `titleId`), testou (`b-san3-12a-unlink-title.test.ts:228`, mutação `Rres2` vermelha) e documentou "fora da lista da tela" (`API_CONTRACTS.md:541-542`, `:574-575`).

**(b) Desenho:** vira **A26** no §4.3/§8.1: "`POST /cheques/:id/bounce` de cheque vinculado (`title_id` presente) exige `reason`/`bounce_reason` (trim, 1–500) → senão **400 `bounce_reason_required`**; auditoria `cheque.bounced` `warning` com `titleId`; sem título o motivo segue opcional (comportamento do #456)". A lista fechada da **tela** (§4.1) fica em **32**: o 12b não chama `bounce` (a devolução é da tela de Cheques, `B-SAN3-24`, que herda a mensagem) e `group_by`/`from`/`to` são montados pela própria tela — `bounce_reason_required`, `invalid_group_by`, `invalid_from`, `invalid_to` ficam na seção "novos FORA da lista da tela" do contrato, como o dev escreveu. A R-res-2 (bounce como desvio sem privilégio) continua para a junta via `P-SAN3-12-BOUNCE-COMO-DESVIO`.

**(c)/(d)** Verde no head; mutação `Rres2` (E4: não exigir motivo → 200) vermelha. K3 l.229 reescrito (E1.F1) passa a chamar `bounce` **com** motivo — o caso sem motivo é o do A26.

### E1.10 — §7.1 emendado (caminhos que ENTRAM no PERMITIDO)
Onde esta seção divergir do §7.1 ou do §9.2, **vale esta seção**. Regra geral que nasce aqui: **todo teste, fixture ou snapshot que a bateria executa e que a regra do bloco muda por construção entra no PERMITIDO por nome** — o plano não pode mandar rodar o que não autoriza tocar.

**ENTRAM (4 caminhos novos):**

| Caminho | Só isto | Achado |
|---|---|---|
| `tests/cheque-title-link.test.ts` | os 5 casos K1 l.98, K2 l.170 / l.189 / l.204, K3 l.229 — reescritos como E1.F1(c); nenhum caso apagado | F1 |
| `tests/cheque-title-link-atomic-db.test.ts` | os 2 casos K2-db l.65 e l.80 — idem | F1 |
| `tests/fixtures/o6r07c-classificacao-vias.json` | **só por regeneração** (`node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json`); diff = exatamente as 3 entradas de E1.F3 | F3 |
| `src/modules/financial-summary/financial-summary.repository.ts` | a projeção da l.58 (+ `titleId: c.titleId ?? null`) | F4 |

**AMPLIAM-SE (2 caminhos já listados no §7.1):**

| Caminho | Além do que o §7.1 já autorizava | Achado |
|---|---|---|
| `tests/financial-uow-journal-classification.test.ts` | `CHEQUE_CALLS.findPendingByTitle`, `PREPARES["cheques.findPendingByTitle"]`, `READ_RETURN_NONEMPTY["cheques.findPendingByTitle"]`, contagem `39 → 40` (l.539) | F2 |
| `tests/fixtures/role-catalog-contract.snapshot.json` | `ROLE_PERMISSIONS.super_admin` e `ROLE_PERMISSIONS.platform_admin` (+2 cada, posição do catálogo) | F5 |

**Conteúdo novo em arquivos já PERMITIDOS (D1 e A26):** `src/modules/cheques/cheque.service.ts` (`update`: ramo 422 `cheque_linked_unlink_first` para o PATCH privilegiado que tira/troca o título), `tests/b-san3-12a-unlink-title.test.ts` (A6-bis + a mutação D1), `API_CONTRACTS.md` (l.537-538: "com o privilégio → 422; só `unlink-title` tira o vínculo"), `RBAC_MATRIX.md` (l.130, mesma frase); o A26 (`bounce_reason_required`) já está implementado e documentado — só ganha número no §8.1.

**SAI do PERMITIDO (1):** `scripts/provision-rbac.ts` (F6: não há mapa de descrições; nada a fazer) — continua na bateria (`--dry-run`).

**PROIBIDOS, nomeados para não restar dúvida:** `src/modules/core-saas/routes/http.ts` (F7), `tests/helpers/o6r07c-census.ts`, `tests/o6r07c-census-guard.test.ts`, `prisma/seed.ts`, `tests/core-saas-role-authority.test.ts`, `tests/permission-catalog-migration-parity.test.ts` (e sua linha de base), e **todos os demais casos** dos dois arquivos de F1.

**Registro (mesmo PR):** `agent-orchestration/controle/pendencias.md` — fechar `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` (critério: esta E1 apensa + `npm test` base vs head com "vermelhos só no head = 0"), 1 linha em `P-RBAC-PROVISION-DESCRICOES` (as 2 chaves; o seed sobrescreve), `P-SAN3-12-REASONS-SEM-CONTRATO` fica; `decisoes.md` — D1 e A26 registrados como **leitura do planejador dentro da Q2/R2-04** (não são decisões novas do dono); `docs/revisoes/SAN3/B-SAN3-12-plano.md` — a cópia versionada recebe esta E1 apensa, verbatim; `docs/revisoes/SAN3/B-SAN3-12a-dev.md` — etapa E10 (o que a E1 mandou, comando e saída de cada item).

**Bateria (§9.2) — linhas que se somam ao 12a:**
```
node --test --import tsx tests/cheque-title-link.test.ts tests/financial-summary.test.ts tests/financial-uow-journal-classification.test.ts tests/o6r07c-census-guard.test.ts tests/b-san3-12a-reasons-census.test.ts   # E1: os guards que a regra do dono toca
DATABASE_URL=<descartável> node --test --import tsx tests/core-saas-role-authority.test.ts   # E1.F5 — SEM CORE_SAAS_PERSISTENCE=prisma (a suíte usa o adaptador em memória; com prisma o caso 12 dá 500 de ambiente)
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx tests/cheque-title-link-atomic-db.test.ts   # já estava (l.550); passa a exigir 15/15
node --import tsx tests/helpers/o6r07c-census.ts gravar tests/fixtures/o6r07c-classificacao-vias.json && git diff --stat -- tests/fixtures/o6r07c-classificacao-vias.json   # E1.F3: regenerar e colar o diff (3 entradas)
```
**Ordem sugerida ao dev:** D1 → F1 (memória; depois `-db`) → F2 → F4 → F5 → F3 (regenerar por último, com toda rota no lugar) → registro → re-rodar as mutações E4 que a emenda toca (A1-ambas, A6, **D1**, A19, A21, **F7-wrapper**, A17bis, Rres2) → `npm test` base vs head em banco FRESCO (forma do E6) com a expectativa **"vermelhos só no head = 0"** → o PR #459 sai de rascunho. **Meta §9.1:** inalterada (os casos reescritos não reduzem N; o head já tem +71).

**Junta (unanimidade de 3, dinheiro + permissão) — o que cada cadeira mede desta emenda:** C1 (DBA/dinheiro) — F1 `-db` 15/15, A4/A5-bis, paridade `linkedPending*` memória vs Prisma (F4-c); C2 (acessos) — F5 pelo comando acima com banco provisionado, D1/A6-bis, A18, catálogo vs `RBAC_MATRIX.md` vs `APPROVAL_LIMITS.md`; C3 (fail-closed/contrato) — F3 (diff do instantâneo = 3 entradas, T1–T14 verdes), F8 (A17-bis reescrito), A26, `API_CONTRACTS.md`. Quem achou (o dev) não planejou (eu) nem julga (§C7.4-bis).

### E1.11 — Perguntas ao dono
**Nenhuma.** Item a item:
- **F5** não muda quem tem o privilégio: `super_admin`/`platform_admin` recebem toda permissão nova por construção (mesma referência do catálogo), é regra escrita (`RBAC_MATRIX.md` matriz-base l.29-47 — `platform_admin` full em Finance — e notas por permissão l.128/130/151) e o plano v3 que o dono aceitou já o dizia (§4.3, §4.4, §5.2). O "só `tenant_admin`" do §7.1 era inventário do snapshot, não distribuição.
- **D1** está dentro da Q2 aceita ("o Administrador desvincula com justificativa obrigatória e auditoria Crítica"): fecha um caminho que a contrariava; não concede nem tira privilégio de ninguém.
- **A26** e **A17-bis reescrito** corrigem o próprio plano (inconsistência interna e critério impossível de passar); não mudam quem pode o quê.
- **Informação, não pergunta:** a pendência `P-SAN3-12-BOUNCE-COMO-DESVIO` (bounce de cheque vinculado tira-o do conjunto pendente sem privilégio — R-res-2) segue para a junta do 12a decidir se vira privilégio; se a junta quiser, ela sobe ao dono com opção recomendada.

### E1.12 — Resumo
- **Achados:** 9 de 9 procedem — F1–F5 com vermelho re-executado por mim no head (`fafd4b36`); F6 e F9 por leitura confirmada em execução; F7 e F8 como lacuna e critério impossível do plano (artefato de processo, não defeito do produto). Nenhum é defeito do código do dev: todos são falsificação do **inventário** (§7.1) ou de **critério** (§4.1/§8.1) do plano v3.
- **Caminhos:** **4 entram** + **2 se ampliam** (6 no total); **1 sai** (`scripts/provision-rbac.ts`); D1 e A26 em arquivos já permitidos; `core-saas/routes/http.ts` fica PROIBIDO nomeado.
- **Perguntas ao dono:** **0**.
- **Desenho que muda:** D1 (PATCH privilegiado que tira/troca o título → 422; só `unlink-title` desvincula), A26 (`bounce_reason_required` como requisito explícito), A17-bis reescrito (contrato para todo `reason` novo; dívida pré-existente congelada e só encolhe).
- **Terreno desta emenda:** worktree do dev intocado (`git status --porcelain` vazio em `fafd4b36`, conferido após cada medição); nada rodou contra 5432/6379 nem `erp-*`; container `plan12e1-pg` (127.0.0.1:55499) removido ao fim; artefatos só no scratchpad da sessão (`e1-snapshot.ts`, `e1-vias-gerado.json`, `e1-fill.py`, `f*.md`, `e1*.md`).

---

## Emenda E1-bis (12a) — resposta à crítica da E1 (`crit-san312a-e1-opus`): 1 bloqueia, 3 ajustes, 2 notas pré-existentes

> **Papel:** `planejador-mestre` (TOPO), a mesma identidade `planejador-san312-e1-fable` (devolução de **crítico**, não reprovação de junta — §C7.4 não
> exige identidade nova). **Modelo efetivo:** Fable 5.1 (`claude-fable-5-1`), sem fallback. **Data:** 2026-10-25. **Insumo:**
> `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-12a-E1-critica.md` (Claude Opus 5.5, declarado; VOLTA À EMENDA). **Ref medida:** `fafd4b36` em
> `C:/Users/AMP/w-san312a`, só leitura (`git status --porcelain` vazio antes e depois de cada medição); sem banco nesta rodada — o achado bloqueante
> vem com barreira no Postgres executada e registrada pelo crítico (P1, item 2.2), e a metade em memória eu re-executei (E1b.0); nada contra
> 5432/6379/`erp-*`. **Respostas do dono que esta emenda NÃO reabre:** "Só cheque do valor exato", "Mesmo privilégio da troca", desvínculo pelo
> administrador com justificativa e auditoria Crítica, delegável ao Financeiro por política. **Estado:** COMPLETO. **Última rodada sobre a emenda:
> o dev retoma com E1 + E1-bis.**

### E1b.0 — Re-execução própria (P3) e o que fica de pé
| Achado | Grav. | Re-execução / conferência própria (comando → saída) | Decisão | Vira |
|---|---|---|---|---|
| **2.2 D1-TOCTOU** | bloqueia | Sonda de memória do crítico, apontada para o worktree do dev (`e1bis-probe-race-mem.test.mts`, `cwd` = `w-san312a`, 3 rodadas): `RESULTS [{ok:T1},{ok:T2}] · FINAL titleId T2 · SEQ 403 unlink_requires_privilege` nas 3 — dois PATCH de 1º vínculo por `finance`, **ambos 200**, e o segundo trocou o título do primeiro sem privilégio. Código: `cheque.service.ts:193-206` (PATCH), `:258-266` (`delete`), `:275-279`/`:447-465` (`cancel` via `flipOnly`) decidem sobre `current` lido por `getWritable` (`:569`, sem trava); `cheque-prisma.repository.ts:75` (`update`), `:93` (`softDelete`), `:103` (`transition`) filtram só por `status`/`deleted_at`, **não** por `title_id`; em memória `cheque.repository.ts:199-251` idem. A barreira no Postgres (PATCH, cancel e delete; `audit_logs = 0`; Pix no T1 → 201) está no item 2.2 da crítica com comando e saída. | **ACEITO** | **A27** |
| **3.3 F1-CLEAR** | ajuste | Conferido: a reescrita de K2 l.189 na E1.F1(c) move a asserção para a baixa e nenhum caso de memória passa a exercer `cheque.service.ts:292` (fast-fail `assertPayable` do `clear`) nem `:556` (`locked.status === "paid"` sob a trava); a M2 do crítico (285 testes em memória, 0 vermelhos causados) é a prova. | **ACEITO** | **A28** |
| **5.1 critério cego** | ajuste | Conferido nos logs do dev citados pela crítica (base 16 vermelhos, head 27, **13 nos dois lados**, com o caminho absoluto do worktree no nome); `tests/san3-09-bootstrap-platform-admin-db.test.ts` (T2.1, `RBAC_NOT_PROVISIONED`) e `tests/san3-05-runtime-role-guard-db.test.ts` (RLS) são guards cegos no Windows. | **ACEITO** | **B1** |
| **5.2 pulado vira verde** | ajuste | `battery.sh:25` do dev: `env -u DATABASE_URL … tests/audit-security.test.ts`; `audit-security.test.ts:23-27` pula sem `DATABASE_URL` (`# SKIP`) e o E6 publicou "1/1"; `grep -c details tests/audit-security.test.ts` → 0 — a fonte que a E1.F7(b) cita não mede `details`. | **ACEITO** | **B2** |
| 2.3 `bounce` sem privilégio | nota · pre-existente | R-res-2 do plano v3 (§4.3 l.258); `P-SAN3-12-BOUNCE-COMO-DESVIO` já está com a junta | registrado | — |
| 2.4 `changeStatus → cancelled` com cheque pendente | nota · pre-existente | `financial-title.service.ts:302-331` não chama `assertNoPendingCheque` (só `update` `:280` e `delete` `:392`); o cheque segue vinculado e o `clear` depois recusa por `title_cancelled` — fail-closed, nenhum caixa anda | registrado | pendência nova (E1b.5) |
| 1.1–1.2, 2.1, 2.5, 3.1, 3.2, 3.4, 4.1–4.3 | nota | F5 confirmada por execução (12/12 com a edição do snapshot; `swap`/`dropplat` vermelhos); D1 coerente com as respostas do dono (2.5); reescritas da F1 passam sem apagar caso e com mutação vermelha; F3 = 3 entradas, 32/32; arnês P7 46/46 e não ficou frouxo | mantidos; 3 correções de texto (E1b.6) | — |

**O que fica de pé:** a **D1** (422 para o PATCH privilegiado que tira/troca o título) — o crítico mediu (2.5) que ela não contradiz resposta nenhuma do dono e que o defeito é a **concorrência**, não o desenho do 422. A E1-bis não troca o desenho sequencial da E1: acrescenta o CAS que faz esse desenho valer sob corrida.

### E1b.1 — A27 (2.2, bloqueia): toda escrita de cheque cuja guarda lê `title_id` leva o `title_id` LIDO no `WHERE`
**Regra.** O `unlinkTitle` já é assim (`cheque-prisma.repository.ts:147-162`: `WHERE … AND title_id = <lido>`; A5-bis). Passa a valer para as três escritas que hoje decidem por `current.titleId` fora de trava:

| Escrita | Guarda que lê `title_id` | CAS novo no `WHERE` | 0 linhas → |
|---|---|---|---|
| `update` com `titleId` string — o 1º vínculo (`cheque.service.ts:217-231`, dentro do `uow.run`) | `:204` (403/422 da D1 só quando `current.titleId !== undefined`) | `title_id IS NOT DISTINCT FROM <lido>` (na prática `IS NULL`: só o 1º vínculo chega à escrita) | **409 `cheque_write_conflict`** (já existe: `throwChequeWriteConflict`, `:229`) |
| `transition` `registered → cancelled` (`cancel`, `:275-279`, via `flipOnly :447-465`) | `:277` (`cheque_linked_unlink_first`) | idem | **409 `transition_conflict`** (idioma do `flipOnly :463`) |
| `softDelete` (`delete`, `:258-266`) | `:262` | idem | **409 `cheque_write_conflict`** (`:264`) |

O `deposit` (`flipOnly` sem guarda de título) e o `update` que não mexe em `title_id` **não** ganham CAS: não decidem nada por `title_id` nem o escrevem. `clear`/`bounce` seguem como estão (`reserved.titleId` vem do CAS por status; A26).

**Como.** `UpdateChequeInput` e `TransitionChequeInput` (`cheque.types.ts:150-172`) e a assinatura de `softDelete` ganham `expectedTitleId?: string | null` — a **presença** da chave liga o CAS; `null` = "tem de estar sem título"; ausência = sem CAS (os chamadores que não dependem do título, inclusive as fixtures do arnês P7 `CHEQUE_CALLS`, não mudam). Prisma: `where: { …, ...(temExpected ? { title_id: expectedTitleId } : {}) }` (Prisma traduz `null` para `IS NULL`); sob READ COMMITTED o `UPDATE` que bloqueou re-avalia o `WHERE` depois do commit do vencedor, logo o perdedor casa 0 linhas. Memória: a comparação entra no check-and-set **síncrono** já existente (`cheque.repository.ts:199-251`, sem `await` entre ler e gravar): `temExpected && (expectedTitleId ?? undefined) !== current.titleId → return undefined`. O serviço passa `expectedTitleId: current.titleId ?? null` nas três chamadas. `CHEQUE_REPO_KIND` não muda (mesmos membros).

**O que NÃO muda:** quem pode o quê (o CAS só faz a regra sequencial valer na corrida — a resposta do dono "Mesmo privilégio da troca" passa a ser verdadeira também sob concorrência); os códigos públicos (os 409 já estão na lista de 32 do §4.1 — `transition_conflict` do fluxo de cheque, `cheque_write_conflict` novo do bloco — e no contrato); a ordem de travas (o CAS não trava nada a mais).

**Critérios (A27), cada um com a mutação que o deixa vermelho.** Arquivo **novo** `tests/b-san3-12a-link-toctou-db.test.ts` — molde `tests/b-san3-12a-pay-link-race-db.test.ts` (barreira por `application_name`, `waitForOwnBlockedStatement` com `fragment: "cheques"`) + o `holdWinner` de `tests/cheque-title-link-atomic-db.test.ts:380-410` (vencedor por SQL próprio em **transação aberta**, `release()` decide), perdedor pelo **serviço**; **nunca por relógio**.

| # | Critério | Mutação que deixa vermelho |
|---|---|---|
| A27-a (db, barreira) | vencedor: `UPDATE cheques SET title_id = T1` em transação aberta; perdedor: `finance` (sem `cheques:unlink_title`) `PATCH {title_id: T2}` lê `current` sem título, passa a guarda e **bloqueia** no row lock (`waitForOwnBlockedStatement`); `release` → perdedor **409 `cheque_write_conflict`**; FINAL `title_id = T1`; `audit_logs` do tenant sem evento de troca; controle sequencial em seguida: o mesmo PATCH → 403 `unlink_requires_privilege` (D1) | tirar `title_id` do `WHERE` do `update` (Prisma) → perdedor 200, FINAL T2 (a saída da crítica) |
| A27-b (db, barreira) | vencedor: vínculo a T1 (idem); perdedor: `POST /cheques/:id/cancel` por `finance` → bloqueia → **409 `transition_conflict`**; FINAL `status = registered`, `title_id = T1`; depois `POST /financial-titles/T1/pay` (pix) → **422 `title_has_pending_cheque`** (invariante do A4: nunca "título pago por outro meio e cheque pendente vinculado") | tirar `title_id` do `WHERE` do `transition` → cancelado com título, pix 201 |
| A27-c (db, barreira) | idem com `DELETE /cheques/:id` → **409 `cheque_write_conflict`**; FINAL `deleted_at IS NULL`, `title_id = T1`; pix → 422 | tirar `title_id` do `WHERE` do `softDelete` → excluído com título, pix 201 |
| A27-d (db, controle) | sem corrida: 1º vínculo → 200; `cancel`/`DELETE` de cheque sem título → como hoje (o CAS com `IS NULL` casa); `deposit` de cheque vinculado → 200 (sem CAS) | — (controle: o CAS não recusa o caminho normal) |
| A27-e (memória) | em `tests/b-san3-12a-unlink-title.test.ts`: dois `update` de 1º vínculo concorrentes (T1, T2) por `finance`, com as duas leituras antes da primeira escrita (a sonda `probe-race-mem` reproduz 3/3) → **exatamente um 200**; o outro **409 `cheque_write_conflict`**; FINAL = o título do 200; o mesmo arranjo para `cancel` × vínculo e `delete` × vínculo (→ 409; o cheque segue vinculado e vivo); **nunca dois 200** | tirar a comparação de `expectedTitleId` do check-and-set em memória → dois 200 |
| A27-f (paridade) | o arranjo de A27-e no Postgres **sem** barreira (`Promise.allSettled`) termina em {200, 409}, nunca {200, 200} | — (invariante; A27-a é a prova determinística) |

Se a intercalação de A27-e não sair determinística só com `Promise.allSettled`, o dev acrescenta um seam de teste **no serviço** (`afterRead?: () => Promise<void>`, injetado só pelas fábricas `*ForTests`) — nunca `setTimeout`.

**Arquivos (todos já PERMITIDOS):** `src/modules/cheques/{cheque.types,cheque.repository,cheque-prisma.repository,cheque.service}.ts`; `tests/b-san3-12a-link-toctou-db.test.ts` (novo), `tests/b-san3-12a-unlink-title.test.ts`; `API_CONTRACTS.md` (PATCH/cancel/DELETE: "409 quando o vínculo mudou entre a leitura e a escrita"). **Conferência obrigatória do dev:** `grep -n "transition(\|softDelete(\|\.update(" src/modules/cheques/cheque.service.ts` — só `cancel`, `delete` e o 1º vínculo passam `expectedTitleId`; o resultado vai para o relatório.

### E1b.2 — A28 (3.3, ajuste): o `clear` de título JÁ PAGO falha fechado — preservado em memória e no Postgres
**Regra.** O estado "título pago por outro meio **e** cheque pendente vinculado" não nasce mais pelo serviço (A1/A4/A27), mas é alcançável por dado anterior ao 12a (o #456 permitia cheque parcial e baixa com cheque pendente) e é exatamente o estado que a guarda do `clear` (`cheque.service.ts:292`, fast-fail `assertPayable`; `:556`, `locked.status === "paid"` sob a trava) existe para conter — ela segue sendo o que impede a 2ª entrada de caixa. Essa guarda **tem de ter caso vermelho em memória**, não só o T-K2d no Postgres.

**Reescrita de K2 l.189 (emenda à E1.F1(c)):** mantém as asserções da E1 (pix → 422 `title_has_pending_cheque`, 0 lançamentos, cheque `deposited`) **e acrescenta** a propriedade original pela via do repositório, fora do serviço (o idioma do K2 l.204 reescrito): `getMemoryFinancialTitleRepositoryForTests().applyPaymentGuarded({ tenantId, financialTitleId, amount: 100 })` (`financial-title.repository.ts:345`, check-and-set síncrono) → título `paid`/`paidAmount 100`; então `clear` → **422 `title_already_paid`**; cheque segue `deposited`, `clearedEntryId` undefined; `entries.list` total **0** (nenhum lançamento, nem do `clear`). **K2-db l.80:** idem, com o título pago por SQL próprio e **commitado** (o `holdWinner "pay-pix"` de `cheque-title-link-atomic-db.test.ts:380-410`, sem barreira) → `clear` → 422 `title_already_paid`; `financialEntry.count` = só o do vencedor; cheque `deposited`, `cleared_entry_id null`; título `paid`.

**Mutação M2 (entra no roteiro E4):** remover o fast-fail `assertPayable` do `clear` (`:292`) **e** trocar `if (locked.status === "paid") throw titleAlreadyPaidError()` (`:556`) por `return` → K2 l.189 **vermelho em memória** (o `clear` posta caixa em título pago: `entries.list` total 1); K2-db l.80 e T-K2d vermelhos no Postgres. A variante "só o fast-fail" deixa K2 l.189 verde pela trava (`:556`) — por isso a M2 remove os dois, como o crítico fez; o dev registra as duas variantes.

**Correção de texto (3.4):** em E1.F1(c) K2 l.170, onde se lê "a propriedade do caso (o clear deriva o status pelo `paidAmount`) fica", leia-se: "a derivação `partially_paid`/`paid` é do `applyPaymentGuarded` do título, compartilhado pela baixa e pelo `clear` (`cheque.service.ts:545`); o caso passa a medi-la pela baixa parcial (pix 200 → `partially_paid`) e pelo `clear` do valor exato (→ `paid`)".

### E1b.3 — B1 (5.1, ajuste): o critério de fechamento não é "vermelhos só no head = 0"
**Regra.** O PR #459 sai de rascunho e a `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` fecha **só** com, cumulativamente:
1. **CI concluída e verde no head** — `gh api repos/<owner>/<repo>/commits/<head>/check-runs`: os jobs `backend` (`.github/workflows/ci.yml:31`, ubuntu) e `backend-postgres` (`:131`) `completed`/`success`; é lá, em Linux, que os 13 testes cegos no Windows rodam de fato; `cancelled`/`queued` conta como ausente (§C7.1-bis). A comparação local base × head é **insumo**, não critério.
2. **Comparação base × head normalizada por script e publicada inteira:** a chave de cada vermelho é `tests/<arquivo>` + nome do caso, com o prefixo do worktree removido **por script** (não por julgamento); o relatório publica **três listas** com N: "só no head" (tem de ser **0**), "só na base", e "**nos dois lados**" — esta com a **causa** de cada um (Redis inalcançável; drill que invoca o shim bash de `node_modules/.bin/prisma` com `node` no Windows → `SyntaxError: missing ) after argument list`; RLS do papel de runtime) — nunca omitida.
3. **A propriedade dos dois guards que a migração de dados e o RLS tocam, medida à mão no descartável só migrado** (como o crítico fez): `select count(*) from roles` → 0, `role_permissions` → 0, `permissions` → 4 (as 2 do bloco + 2 das migrações anteriores), concessões de `super_admin` → 0 ⇒ `bootstrap-platform-admin` recusa `RBAC_NOT_PROVISIONED` (`scripts/bootstrap-platform-admin.ts:215-224`) — a mesma propriedade do T2.1; para o RLS, a R-res-5 segue declarada (o agregado roda em `withTenantRls`; a camada RLS sozinha é medida pela CI em `tests/san3-05-runtime-role-guard-db.test.ts`).

**Falsificador:** um vermelho de ambiente que suma da lista "nos dois lados" sem causa, ou um "só no head" mascarado por nome com caminho absoluto, deixa o critério vermelho — o `inspetor-de-terreno-da-junta` confere a normalização **por comando**, e a CI no head é item 1-bis dele. O shim do `.bin/prisma` no Windows é **pré-existente** → pendência `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS` (dono: bloco de ferramentas de processo; `escopo: pre-existente`; solução provável: `npx prisma` ou `node node_modules/prisma/build/index.js` nos drills).

### E1b.4 — B2 (5.2, ajuste): pulado não é verde
**Regra.** Todo passo da bateria publica, lido do TAP, **`tests · pass · fail · skipped`** (nunca só "N/N"); no `npm test` fresco, **`skipped` do head ⊆ `skipped` da base** (nenhum teste passa a ser pulado por causa do bloco); e nenhum passo da bateria do bloco termina com `pass 0 · skipped ≥ 1`. **Correção concreta:** o passo `11-audit-security` do roteiro do dev (`battery.sh:25`) roda **com** `DATABASE_URL` do descartável (`audit-security.test.ts:23-30` pula sem ela) e publica `1 · pass 1 · fail 0 · skipped 0`; o E6 do relatório é corrigido ("1/1" → a forma completa, "com banco").

**Correção da E1.F7(b):** a allowlist §B2.8 do `details` é medida por `tests/b-san3-12a-unlink-title.test.ts` (caso HTTP "o corpo do 422 não leva o tenant", que o crítico pôs vermelho mutando `financial-entry.service.ts:156-161` com `tenantId` no `details`) e por A17; `tests/audit-security.test.ts` mede a allowlist dos **metadados de auditoria** (A7), não o `details`. **Mutações:** `tenantId` em `details` → esse caso HTTP vermelho; publicar um passo sem o campo `skipped` → o formato exigido falha (o inspetor confere o TAP).

### E1b.5 — Notas pré-existentes (2.3, 2.4): registro com dono, sem reabrir
- **2.3** `bounce` de cheque vinculado `deposited` sem privilégio: R-res-2 do plano v3 (§4.3 l.258); A26 exige motivo e audita `warning`; `P-SAN3-12-BOUNCE-COMO-DESVIO` já está com a junta do 12a. Nada a acrescentar.
- **2.4** `PATCH /financial-titles/:id/status → cancelled` com cheque pendente vinculado (`financial-title.service.ts:302-331` não consulta `assertNoPendingCheque`): o cheque segue vinculado, o `clear` depois recusa por `title_cancelled` (fail-closed, nenhum caixa anda) e o administrador o desvincula/cancela pelo caminho do §4.3. **Pendência nova** `P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE` — `escopo: pre-existente` (`changeStatus` é anterior ao bloco e o §4.3 do v3 nomeia só `amount` e `DELETE`); dono: o próximo bloco de backend financeiro, junto de `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE`; recomendação registrada: `changeStatus → cancelled` com conjunto pendente não vazio → 422 `title_has_pending_cheque` pela mesma porta `cheque-pending-reader`. **Não entra no 12a:** o §7.1 limita `financial-title.service.ts` a `update`/`delete`, e ampliar o alcance de um bloco em junta por achado pré-existente é o que a §C7.1-ter(a) manda não fazer.

### E1b.6 — O que muda no §7.1/§9.2 em relação à E1.10, bateria e ordem ao dev
**Arquivos (todos já PERMITIDOS pela E1.10; o único novo é um teste `-db` do bloco):** `src/modules/cheques/{cheque.types,cheque.repository,cheque-prisma.repository,cheque.service}.ts` (A27); `tests/b-san3-12a-link-toctou-db.test.ts` (**novo**, A27-a–d); `tests/b-san3-12a-unlink-title.test.ts` (A27-e, A6-bis); `tests/cheque-title-link.test.ts` K2 l.189 e `tests/cheque-title-link-atomic-db.test.ts` K2-db l.80 (A28); `API_CONTRACTS.md` (os 409 do CAS); roteiro `battery.sh` e `docs/revisoes/SAN3/B-SAN3-12a-dev.md` (B1/B2: `tests · pass · fail · skipped`, as três listas normalizadas, a medição à mão do T2.1).
**Correções de texto na E1 (3):** F3(d) — a edição à mão da classe de `unlink-title` deixa vermelho o **T14**, não o T6 (o T6 fica vermelho na mutação do catálogo, 4.2); F1(c) K2 l.170 — frase substituída (E1b.2); F7(b) — fonte da allowlist do `details` (E1b.4).
**Bateria (§9.2), linhas que se somam às da E1.10:**
```
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx --test-reporter=tap tests/b-san3-12a-link-toctou-db.test.ts   # A27-a..d (barreira; pg-barrier por application_name)
DATABASE_URL=<descartável> CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/audit-security.test.ts            # B2: COM banco → 1 · pass 1 · fail 0 · skipped 0
gh api repos/<owner>/<repo>/commits/<head>/check-runs --jq '.check_runs[] | [.name,.status,.conclusion] | @tsv'                            # B1-1: backend e backend-postgres completed/success no head
```
Toda linha da bateria publica `tests · pass · fail · skipped` (B2). **Mutações que se somam ao roteiro E4:** A27-a/b/c (3× tirar `title_id` do `WHERE`), A27-e (memória), **M2** (duas variantes), F7-wrapper, D1.
**Ordem ao dev:** A27 (tipos → repositórios → serviço → `-db` com barreira → memória) → D1 → F1 (com A28 em K2 l.189 / K2-db l.80) → F2 → F4 → F5 → F3 (regenerar por último) → B2 (bateria com `skipped`) → registro (fechar `P-SAN3-12A-PLANO-FALSIFICADO-ESCOPO` só pelo B1; abrir `P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE` e `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`; E1 + E1-bis apensas verbatim em `docs/revisoes/SAN3/B-SAN3-12-plano.md`) → mutações → `npm test` base vs head normalizado (B1-2) → CI verde no head (B1-1) → o PR #459 sai de rascunho.
**Junta (unanimidade de 3, dinheiro + permissão):** C1 (DBA/dinheiro) — A27-a/b/c com `pg_locks`/barreira e A28 (M2 nos dois lados), além do que a E1.10 já lhe dava; C2 (acessos) — A27 não muda quem pode o quê (403/422/409 por ator, sequencial e em corrida), D1/A6-bis, F5; C3 (fail-closed/contrato) — B1 (três listas, CI no head), B2 (`skipped`), F3, A17-bis, os 409 no contrato. Quem achou (o crítico) ≠ quem planejou (eu) ≠ quem desenvolve (o dev).

### E1b.7 — Perguntas ao dono
**Nenhuma.** O A27 faz a regra que o dono aprovou ("Mesmo privilégio da troca"; desvínculo só pelo administrador, com justificativa e auditoria Crítica) valer também sob concorrência — não concede nem tira privilégio de ninguém, e os códigos de recusa já existiam. A28, B1 e B2 são cobertura de teste e critério de fechamento. A nota 2.4 fica registrada com recomendação para o bloco seguinte; se a junta do 12a entender que o 12a deve fechá-la, isso amplia o §7.1 (`changeStatus`) e aí sobe ao dono como pergunta — não agora.

### E1b.8 — Resumo
- **Requisitos novos: 4** — **A27** (CAS do `title_id` lido em `update`/`cancel`/`delete`, provado com barreira no Postgres e em memória), **A28** (`clear` de título já pago falha fechado, com M2 vermelha em memória e no `-db`), **B1** (fechamento: CI verde no head + três listas normalizadas por script + T2.1 medido à mão), **B2** (`skipped` publicado em todo passo e `audit-security` com banco; fonte do `details` corrigida).
- **Pendências novas: 2** (`P-SAN3-12-STATUS-CANCELLED-COM-CHEQUE-PENDENTE`, `P-SAN3-12-DRILL-PRISMA-SHIM-WINDOWS`), ambas `pre-existente`. **Correções de texto na E1: 3.** **D1 mantida.**
- **Perguntas ao dono: 0.** Respostas do dono intactas.
- **Terreno:** `C:/Users/AMP/w-san312a` em `fafd4b36`, `git status --porcelain` vazio antes e depois; sem container nesta rodada; a sonda de memória do crítico foi re-executada a partir do scratchpad (`e1bis-probe-race-mem.test.mts`, `cwd` no worktree) sem gravar nada nele.

## Ciclo 2 (12a) — plano de resolução (reprovação do ciclo 1 da junta de dinheiro, `R-B-SAN3-12a-ciclo1.md`)

> **Papel:** `planejador-mestre` (TOPO, `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, §C7.4), identidade **nova** `planejador-san312a-c2-fable`
> (≠ `planejador-san312-e1-fable`, que escreveu E1/E1-bis; ≠ C2/C4, que acharam; ≠ `dev-san312a-opus`, que desenvolveu). **Modelo efetivo:**
> Fable 5.1 (`claude-fable-5-1`), sem fallback. **Data:** 2026-10-26 (~00:20 BRT). **Objeto julgado:** `04b8a667780930050c8af2c77c323b81fe8794bb`
> (PR #459, ciclo 1). **Insumos:** `omega/reprovacoes/R-B-SAN3-12a-ciclo1.md`; `omega/juntas/votos/B-SAN3-12a/{c2,c4}-{voto.json,evidencia.md}`;
> sondas das cadeiras em `C:/Users/AMP/erp-pausa-2026-10-03/j12a-c2/` e `j12a-c4/`; `B-SAN3-12a-dev.md` (E0–E14). **Terreno próprio, removido ao
> fim:** worktree `C:/Users/AMP/w-j12a-plan` (detached no objeto, `npm ci` próprio, sem junction) + Postgres 16 `j12a-plan-pg` em `127.0.0.1:47763`
> (117 migrações, última `20260882000000_…`); `git status --porcelain` do worktree = 0 ao fim; mutações restauradas por `hash-object = blob`;
> containers `j12a-plan-*` = 0, worktree = 0, senha apagada; **a base viva (5432/6379, `erp-*`) nunca foi alvo**; `C:/Users/AMP/w-san312a` recebeu
> só este apenso. Sondas e log: `<scratchpad>/j12a-plan/{zz-plan-c403-barrier.ts,zz-plan-c201-nul.ts,run.log}`. Disco: 12G → 11G → 12G (piso 7 GB).
> **Respostas do dono que este plano NÃO reabre:** "Só cheque do valor exato", "Mesmo privilégio da troca", desvínculo pelo administrador com
> justificativa e auditoria Crítica, delegação do desfazer por política, migração de dados autorizada. **Nenhum código foi tocado por mim.**

### C2.0 — Auditoria da reprovação: defeito real ou artefato? (re-execução própria, P3)

| Achado | Re-execução própria (comando → saída) | Veredito | Decisão |
|---|---|---|---|
| **C4-03** PATCH `amount` × vínculo (bloqueia, grave: dinheiro) | **Sonda minha com BARREIRA DE LOCK, não relógio** (`zz-plan-c403-barrier.ts`): vencedor = transação aberta `SELECT … FOR UPDATE` do título + `INSERT cheques (title_id=T, 100, registered)` **sem commit**; perdedor = `titleService.update(actor, T, {amount:150})` pelo serviço Prisma do objeto. O perdedor **passou a guarda** (leu 0 pendentes), **bloqueou no row lock** (`pg_stat_activity wait_event_type='Lock'`, 147/54/56 ms), o vencedor commitou e o perdedor **gravou**: `amount=150 deleted=false pendentes=1` — **3/3**. Sonda original da C4 (`zz-j12ac4-p4.ts MODES=patch-simultaneo N=10`): 10/10 estados ruins. Sequencial: vínculo → PATCH `title_has_pending_cheque` (correto). | **DEFEITO REAL DE PRODUTO**, dentro-do-bloco, grave: dinheiro. **Causa confirmada:** `assertNoPendingCheque` (`financial-title.service.ts:280` no `update`, `:392` no `delete`, função `:422-433`) lê o conjunto pendente pela porta `cheque-pending-reader` **fora de qualquer transação e sem trava**; a escrita (`repository.update`/`softDelete`) é a **standalone** (`financial-title-prisma.repository.ts:327`: "standalone as três operações abrem a própria transação"), que ao bloquear no `FOR UPDATE` do vínculo re-avalia só o seu `WHERE` (`tenant_id`, `id`, `deleted_at IS NULL`) e grava. **Não há re-check sob o lock** — o `pay` tem (`financial-entry.service.ts:675-677` fast-fail + re-check na unidade); o título não. **O lado oposto já está fechado:** PATCH em voo (FOR UPDATE + `UPDATE amount=150` sem commit) × vínculo pelo serviço → o vínculo bloqueia no `findByIdForUpdate`, relê sob o lock e sai **`cheque_amount_mismatch` 2/2** (`revalidateTitleLinkUnderLock`, `cheque.service.ts:522-541`). | **Conserta** — E2.1 (A29) |
| **C4-04** DELETE × vínculo (ajuste, `pre-existente`) | Mesma sonda, modo delete: perdedor `titleService.delete` passou a guarda, bloqueou no lock, gravou: `deleted=true pendentes=1` — **3/3**; p4 `MODES=simultaneo N=10`: 10/10. | **MESMA CAUSA** do C4-03: a mesma função (`assertNoPendingCheque`, chamada em `:392`), o mesmo `softDelete` standalone, o mesmo mecanismo. São **duas instâncias de UMA classe** ("guarda do conjunto pendente fora da transação que grava"). A leitura da C4 (`pre-existente` pela classe de `P-SAN3-20-DELETE-TITULO-COM-CHEQUE`, aberta 2026-10-24) está certa quanto à **classe do efeito**; mas o conserto da instância dentro-do-bloco é **o mesmo código** e alcança a outra sem ampliar o escopo (`delete` já está no PERMITIDO desde a E1.10: "`financial-title.service.ts` só `update`/`delete`"). | **ENTRA** no ciclo 2 pelo mesmo conserto (correção pela propriedade, não por instância); a pendência fecha no merge com a prova concorrente determinística (A29-c), que é o seu critério escrito ("422 … **e prova concorrente**"). Não vira pendência separada. |
| **C2-01** justificativa com NUL → desvínculo 200 sem auditoria (bloqueia, não grave) | **Sonda minha em dois níveis** (`zz-plan-c201-nul.ts`, caracteres construídos por `fromCharCode`): (1) `select '"…"'::jsonb` no Postgres 16 — **U+0000 RECUSADO** ("unsupported Unicode escape sequence"), **surrogate isolado U+D800 RECUSADO**, **U+DC00 RECUSADO** ("invalid input syntax for type json"); BEL U+0007, DEL U+007F e par válido U+D83D U+DE00 **aceitos**. (2) `recordRequestAuditBestEffort(request falso, buildChequeTitleUnlinkedAudit(…, j))`: NUL-início, NUL-meio, lone-high, lone-low → `parseUnlinkJustification` **ACEITA**, auditoria gravada **0**, `warn` engolido ("Audit log could not be recorded"). `String.prototype.isWellFormed` disponível (Node v20.19.5): `false` só para os dois surrogates. *Artefato da MINHA sonda, declarado:* os casos aceitos pelo jsonb (BEL, DEL, emoji, NFD, normal) caíram por FK `audit_logs_actor_user_id_fkey` (ator fictício sem linha em `users`) — logo **não** medi "gravada=1" para eles; isso está provado pela sonda HTTP da C2 (BEL+HTML, HTML, normal → 1 `critical`, verbatim). | **DEFEITO REAL**, dentro-do-bloco, não grave (rastro incompleto) — e **MAIOR do que a C2 mediu**: além do NUL, **surrogates isolados** passam no validador do bloco e derrubam a auditoria. Causa: `parseUnlinkJustification` (`cheque.service.ts:95-99`) só mede comprimento após `trim`; `recordRequestAuditBestEffort` (`core-saas/audit/audit-request-context.ts:32-80`, **de 2026-06-08, `a09f6a4a`**, usado em 20+ controllers) roda **depois** do desvínculo já commitado (`cheque.controller.ts:92-93`) e engole o erro por desenho. | **Conserta** — E2.2 (A30): rejeitar na validação; a auditoria transacional vira pendência com dono (E2.2 explica a escolha) |
| **C4-02** M13a (tirar `reconciled` do WHERE do CAS Prisma) sem caso vermelho (bloqueia, não grave) | M13a aplicada ao objeto (`mut.mjs`, âncora única, crlf): `b-san3-12a-reconcile-cas-db` **3 · pass 3 · fail 0**; `b-san3-12a-unreconcile-policy` (memória) **11 · pass 11**; restaurado (`3d492acd…` = blob). A sonda da C4 provou o mutante **não equivalente** (`expected (true,null)` contra linha `(false,null)` → 200 e grava). | **BURACO DE TESTE** (critério que não pode falhar), **não** defeito de produto: o código do objeto tem o operando (`financial-entry-prisma.repository.ts:98-105`). Pela régua do ciclo 1 (item 8(2): `bloqueia` dentro-do-bloco reprova, grave ou não) a reprovação é legítima. | **Conserta** — E2.3 (A13-bis), só teste |
| **C4-01** R-res-5 (db) não acusa M5a sob o superusuário da CI (ajuste) | M5a aplicada (standalone `aggregate` sem `withTenantRls`): `b-san3-12a-entries-aggregate-db` **3 · pass 3 · fail 0** sob superusuário; restaurado. | **BURACO DE TESTE**: o SQL filtra `tenant_id` e o superusuário (`ci.yml:40,134` = `postgres`, BYPASSRLS) nunca vê a camada RLS. O código não vaza (C4: 52/52 nos dois papéis). | **Conserta** — E2.4 (R-res-5-bis), só teste |
| C2-02, C2-03, C4-05 (notas) | Lidas; não re-executadas (não reprovam). | Pré-existentes / fora do diff. | Pendências nomeadas com dono (E2.5) |

**Veredito da auditoria: a junta funcionou.** Dos 5 achados que pesaram, **3 são defeitos reais** (C4-03 e C4-04 = uma classe, grave: dinheiro; C2-01, rastro) e **2 são buracos de teste** legítimos pela régua do ciclo 1. **Nenhum artefato de processo**: nenhuma premissa herdada, nenhum critério impossível, nenhuma amostra do próprio autor (as sondas das cadeiras reproduziram nos dois papéis e eu as reproduzi com barreira). A classe de defeito **não se repetiu sem informação nova** (o ciclo 1 é o primeiro). Não é ciclo 3: não cabe auditoria da máquina.

### C2.1 — Decisões por achado

#### E2.1 — C4-03 + C4-04 → **A29**: `update` com `amount` e `delete` do título rodam NA UNIDADE, com a linha do título travada e o re-check do conjunto pendente SOB o lock
**Regra** (espelho exato do `payTitle`, `financial-entry.service.ts:467-483` e `:644-677`, e do vínculo, `cheque.service.ts:179-181`/`:230-232`):
1. **Fast-fail fora da transação, precedência pública inalterada:** 404 (`getWritable`) → 422 `period_closed` (`assertPeriodOpen`) → 400 do corpo → 400 `invalid_account_reference` → **422 `title_has_pending_cheque`** pela porta do pool (`createDefaultChequePendingReader`), só quando `amount` muda (update) ou sempre (delete). Nenhuma transação abre nesses caminhos (contador de `uow.run` = 0).
2. **A escrita entra em `uow.run(actor.tenantId, ctx => …)`** (o `resolveUow` já está no construtor, `financial-title.service.ts:75`): `ctx.titles.findByIdForUpdate(tenantId, id)` (trava a linha; sumiu/deletado → 404) → **`ctx.assertPeriodOpenShared(locked.competencia, periodClosedError)`** (a trava SHARED do DIN-008 — **obrigatória**, porque `ctx.titles` na UoW Prisma é `new PrismaFinancialTitleRepository(tx)` (`financial-uow-prisma.ts:25`), a classe **sem** a trava de período que a standalone fazia por dentro em `financial-title-prisma.repository.ts:305-316`/`:339-348`; o idioma já existe em `createForWorkOrderInUnit`, `:155`) → **re-check sob o lock**: `ctx.cheques.findPendingByTitle(tenantId, id)` (membro `read` de `CHEQUE_REPO_KIND` e de `journaledCheques` desde a F2 da E1) não vazio → 422 `title_has_pending_cheque` (a unidade desfaz; nada gravado) → `ctx.titles.update({...})` / `ctx.titles.softDelete(tenantId, id, userId)` (membros `write` de `TITLE_REPO_KIND`, `financial-uow.ts:195,199`) → os `outcome` de hoje (`not_found` → 404, `amount_below_paid` → 422, `title_has_payments` → 422).
3. **Memória:** `uow.run` = mutex do tenant; o vínculo já roda na unidade (A25) — a intercalação vira determinística; `journaledTitles` desfaz em erro.
4. **Como (um caminho só):** `update` e `delete` rodam **inteiros** na unidade depois dos fast-fails (também o PATCH só de `description`: lock curto, inofensivo — R1); `assertNoPendingCheque` passa a receber o leitor (`pool` no fast-fail, `ctx.cheques` sob o lock — o idioma `poolUndoReaders`/`unitUndoReaders` de `financial-entry.service.ts:242-258`).
5. **Lado do vínculo: NADA muda.** A sonda provou 2/2 que `revalidateTitleLinkUnderLock` já relê sob o lock (`amount` novo → `cheque_amount_mismatch`; `deletedAt` → `invalid_title_reference`, `:531`).
6. **Ordem de travas:** período (leitura/SHARED) → título (`FOR UPDATE`) → cheques (leitura, sem trava). Igual ao `pay`; não cruza com o `clear` (período → cheque → lançamento → título) porque a leitura de cheque não trava → nenhum deadlock novo (R2).
7. **O que NÃO muda:** quem pode o quê; códigos públicos (422 `title_has_pending_cheque` já existe, A21); "Só cheque do valor exato" passa a valer **também sob corrida**. **Fecha `P-SAN3-20-DELETE-TITULO-COM-CHEQUE`** no merge (critério escrito: 422 **e prova concorrente** = A29-c + A29-g), pelo porteiro.
8. **Arnês P7** (`financial-uow-journal-classification.test.ts`): `titles.update`/`softDelete`/`findByIdForUpdate` e `cheques.findPendingByTitle` já são membros classificados com fixture; o conserto não acrescenta membro. Se o arnês acusar contagem, o dev **PARA e registra** (`D-EMENDA-ANTES-DO-CODIGO`) — o arnês está PROIBIDO.

**Critérios (A29), cada um com a mutação que o deixa vermelho.** Arquivo **novo** `tests/b-san3-12a-title-mutation-race-db.test.ts` — molde `tests/b-san3-12a-pay-link-race-db.test.ts` (`holdGate`, `waitForOwnBlockedStatement` com `fragment: "financial_titles"`, `assertApplicationNamePropagated`, `captureSettled`/`expectReason`), vencedor por **SQL próprio em transação aberta** (`$transaction` com `timeout` alto, `release()` decide), perdedor pelo **serviço** Prisma; **nunca por relógio**; asserção explícita de ausência de `deadlock detected`.

| # | Critério | Mutação que deixa vermelho |
|---|---|---|
| A29-a (db, barreira) | vencedor: tx aberta `SELECT … FOR UPDATE` do título T + `INSERT cheques (title_id=T, amount 100, registered)` **sem commit**; perdedor: `titleService.update(actor, T, {amount:150})` passa o fast-fail (0 pendentes), **bloqueia** no `FOR UPDATE` da unidade (`waitForOwnBlockedStatement`); `release` → perdedor **422 `title_has_pending_cheque`**; FINAL `amount=100`, `deleted_at IS NULL`, 1 pendente vinculado | tirar o re-check sob o lock (deixar só o fast-fail) → perdedor 200, `amount=150` com cheque 100 pendente (a saída da C4 36/37 e a minha 3/3) |
| A29-b (db, barreira — controle do lado oposto) | vencedor: tx aberta `FOR UPDATE` + `UPDATE financial_titles SET amount=150` sem commit; perdedor: `chequeService.create` com `title_id=T`, 100 → bloqueia no `findByIdForUpdate` → `release` → **422 `cheque_amount_mismatch`**; FINAL `amount=150`, 0 pendentes | tirar `assertExactOpenBalance` de `revalidateTitleLinkUnderLock` → vínculo 200 sobre título de 150 (restaurar!) |
| A29-c (db, barreira) | idem A29-a com `titleService.delete(actor, T)` → **422 `title_has_pending_cheque`**; FINAL `deleted_at IS NULL`, 1 pendente — **a prova concorrente que fecha a pendência** | tirar o re-check do `delete` → título apagado com cheque pendente (100/100 da C4) |
| A29-d (db, barreira — controle) | vencedor: `FOR UPDATE` + `UPDATE … SET deleted_at=now()` sem commit; perdedor vínculo → `release` → **422 `invalid_title_reference`** (o `reason` medido em `cheque.service.ts:531`); FINAL apagado, 0 pendentes | — (controle: o vínculo não grava sobre título apagado) |
| A29-e (memória, contador) | em `tests/b-san3-12a-pay-pending-cheque.test.ts` com `countingUow` (l.82-98) injetado no `FinancialTitleService` (construtor l.69-76): PATCH `{amount}` → contador de `uow.run` = **1**; DELETE → 1; PATCH recusado no fast-fail (pendente), 404, `period_closed`, 400 → **0** (nenhuma transação abre) | escrever fora da unidade → contador 0 no PATCH/DELETE que grava |
| A29-f (memória, determinístico, sem relógio) | `countingUow({ beforeRun: vincular o cheque a T })` (o vínculo commita **depois** do fast-fail e **antes** da unidade — molde A4(b, memória) l.219-233): PATCH `{amount:150}` → **422**; DELETE → 422; FINAL título intocado e cheque vinculado (venceu); e o arranjo inverso `beforeRun: PATCH/DELETE` dentro de um vínculo → `cheque_amount_mismatch`/`invalid_title_reference` | tirar o re-check → 200 (amount 150 com pendente) |
| A29-g (db, sem barreira — invariante de regressão) | `Promise.all([vincular, PATCH])` × N=20 e `[vincular, DELETE]` × N=20 pelos serviços Prisma (a sonda p4 da C4 como teste): **nunca** (`amount ≠ 100` ou apagado) com pendente > 0; cada rodada termina em exatamente um `ok` e um 422 do conjunto {`title_has_pending_cheque`, `cheque_amount_mismatch`, `invalid_title_reference`} | — (invariante; A29-a/c são a prova determinística) |
| A29-h (regressão de período) | PATCH e DELETE de título em competência **fechada** → 422 `period_closed` (fast-fail) **e**, com o período fechando **dentro** da corrida (fixture de `tests/financial-period-closes.test.ts`), a trava SHARED recusa — `tests/financial-period-closes.test.ts` e `tests/financial-titles.test.ts` verdes | tirar `ctx.assertPeriodOpenShared` da unidade → o caso de fechamento concorrente passa a gravar |

**Vermelho-controle no objeto do ciclo 1 (`04b8a667`):** A29-a, A29-c, A29-f e A29-g **vermelhos pelo desfecho** (200 com pendente) com `git checkout 04b8a667 -- src/modules/financial-titles/financial-title.service.ts` (restaurar por hash); A29-b/d verdes lá (o lado do vínculo já estava certo) — declarado.

#### E2.2 — C2-01 → **A30**: a justificativa só aceita texto gravável e legível; a auditoria transacional vira pendência com dono
**As duas opções, consideradas:**
- **(B) Auditoria na mesma transação do desvínculo.** Fecha a propriedade inteira ("todo desvínculo deixa rastro") contra **qualquer** falha da auditoria. Custo medido: o `unlinkTitle` grava pelo CAS standalone (`cheque.service.ts:247-252`) e a auditoria é do **controller** (`cheque.controller.ts:92-93`) via `recordRequestAuditBestEffort` — helper de `core-saas/audit` (**fora do PERMITIDO**, de 2026-06-08, política da casa em 20+ controllers, inclusive para eventos `critical` anteriores ao bloco). Levá-la para dentro exigiria um escritor de auditoria na UoW financeira (`financial-uow.ts` fora de `CHEQUE_REPO_KIND`/`journaledCheques` = **PROIBIDO** §7.4; o arnês P7 classifica cada membro) ou o serviço receber a transação do controller — **mudança de arquitetura da auditoria da casa**, decidida num ciclo de reprovação de um bloco de dinheiro: o "plano fraco que reintroduz defeito" que o §C7.6 manda o Fable evitar. E muda o modo de falha (auditoria indisponível → o administrador não desvincula), o que é decisão de produto.
- **(A) Rejeitar na validação.** Fecha o que é **dentro-do-bloco** — a propriedade que a C2 enunciou: *"há entrada aceita pelo validador do bloco com a qual o ato privilegiado é gravado sem rastro"*. Medido: o jsonb recusa **exatamente** U+0000 e surrogates isolados; nenhum outro caractere aceito pelo validador derruba a gravação. Barato, no PERMITIDO (`cheque.service.ts`), não muda quem pode o quê.

**Escolha: (A) agora, com a propriedade ampliada aos surrogates e aos controles C0, + (B) como pendência nomeada com dono.** `P-AUDIT-CRITICA-NA-TRANSACAO` — `escopo: pre-existente` (evidência: `audit-request-context.ts` nasce em `a09f6a4a`, 2026-06-08; o padrão best-effort é anterior ao bloco e alcança todos os eventos `critical` da casa); dono: bloco de auditoria do core-saas; recomendação registrada: eventos `severity: critical` gravados na transação do ato, ou fail-closed com o rastro antes do ato. **Régua para a C2 refeita:** falha **operacional** da auditoria (banco de auditoria, FK, RLS) é desta pendência pré-existente e **não reprova** (§C7.1-ter(a)); o que reprova é entrada aceita pelo validador que derrube o rastro — e com A30 não há nenhuma.

**Regra (A30).** `parseUnlinkJustification` (`cheque.service.ts:95-99`) aceita só, após o `trim`: **10–500 caracteres** (como hoje) **e** `value.isWellFormed()` (sem surrogate isolado; Node 20, medido disponível) **e** nenhum **U+0000**, nenhum controle **C0** (U+0001–U+001F) salvo **TAB, LF e CR**, e nenhum **DEL** (U+007F). Senão **400 `invalid_justification`** (mesmo `reason`; a mensagem distingue "texto com caracteres de controle ou mal-formado"). **Por quê os controles C0 além do que o jsonb recusa:** a justificativa é rastro de ato privilegiado lido por humanos (tela do administrador e auditoria); ESC U+001B abre sequência ANSI que adultera a leitura em terminal e log, BEL/BS são invisíveis — defesa do rastro a custo zero. **Não é regra de dinheiro nem de permissão** (não vai ao dono; é leitura do planejador, §A6, e se o dono preferir só NUL + surrogates, A30 encolhe numa linha). Unicode válido segue aceito e gravado **verbatim** (acentos NFD, emoji com par válido, HTML — o comportamento que a C2 mediu e aceitou: sanitizar é do leitor, não do rastro).

| # | Critério | Mutação que deixa vermelho |
|---|---|---|
| A30-a (memória, função pura) | em `tests/b-san3-12a-unlink-title.test.ts` (ao lado de l.103): com comprimento 10–500, **U+0000** (início e meio), **U+D800** e **U+DC00** isolados, **U+001B**, **U+0007**, **U+007F** → 400 `invalid_justification`; "pagou por pix no balcão", emoji U+1F600, "e"+U+0301, texto com TAB/LF/CR, "<b>x</b> motivo…" → aceitos **verbatim**; 10 e 500 passam, 9 e 501 recusam (mantido). Caracteres construídos por `String.fromCharCode`/`fromCodePoint` | tirar `isWellFormed()` → surrogate isolado aceito; tirar a classe C0 → NUL aceito |
| A30-b (HTTP, memória) | `POST /cheques/:id/unlink-title` com NUL → 400 `invalid_justification`, `titleId` relido intacto; precedência mantida: 403 da rota → 400 justificativa → 404 cheque → 422 | idem |
| A30-c (db, propriedade do rastro) | em `tests/b-san3-12a-pay-pending-cheque-db.test.ts` (ao lado do A7 db, l.89): para cada justificativa **rejeitada** (NUL, lone-high, lone-low, ESC) pelo controller → 400, `cheques.title_id = T` no banco, `audit_logs cheque.title_unlinked` = **0**; para cada **aceita** adversarial (emoji, NFD, HTML, 500 caracteres) → 200, `title_id` null, auditoria = **1** `critical`, `metadata.justification` **=== a enviada** (igualdade de string) | tirar a checagem → NUL: 200 com `title_id` null e auditoria 0 (a saída da C2, 3/3) |

**Vermelho-controle no objeto do ciclo 1:** A30-a/b/c vermelhos em `04b8a667` (NUL aceito; A30-c: 200 e 0 auditoria). **Contrato:** `API_CONTRACTS.md` l.531 ("10–500 caracteres após o trim" → "+ texto bem-formado: sem U+0000, sem surrogate isolado, sem controle C0 salvo TAB/LF/CR, sem DEL").

#### E2.3 — C4-02 → **A13-bis**: caso `-db` que acusa a retirada do operando `reconciled` do CAS
Em `tests/b-san3-12a-reconcile-cas-db.test.ts`, caso novo (espelho do caso de memória "A13 (repositório)", `b-san3-12a-unreconcile-policy.test.ts:218-231`): linha `(reconciled=false, reconciled_at=null)`; cliente envia `expected_reconciled: true, expected_reconciled_at: null` → **409 `reconciliation_stale`**, nada gravado (`reconciled` false, `reconciled_by` null); linha `(true, X)` com cliente `(false, X)` → 409. Por quê o operando fica mesmo sendo redundante em dado real (`reconciled ⇔ reconciled_at IS NOT NULL`): é o contrato do §4.6 e defende contra linha inconsistente (dado anterior/SQL cru). **Mutação:** M13a (tirar `reconciled: input.expectedReconciled` do `where`) → o 1º caso devolve 200 e grava (vermelho). **Controle declarado:** no objeto do ciclo 1 o caso novo é **verde** (o código está certo); o vermelho-controle aqui é **a mutação M13a sobre o objeto**, não o head-base. Só teste; nenhum código de produto.

#### E2.4 — C4-01 → **R-res-5-bis**: o R-res-5 (db) prova a camada RLS sob papel SEM bypass
Em `tests/b-san3-12a-entries-aggregate-db.test.ts`, o caso R-res-5 (l.106) ganha a segunda metade: com `DATABASE_URL` superusuário (o da CI), o teste cria um papel descartável `LOGIN NOSUPERUSER NOBYPASSRLS NOINHERIT` com senha própria (idioma de `tests/san3-05-runtime-role-guard-db.test.ts:86-89`; GRANTs de `scripts/db-runtime-role.sh:68-76`), abre um `PrismaClient` com ele e roda o agregado **pela standalone** `new RlsPrismaFinancialEntryRepository(clientRt)` (exportada, `financial-entry-prisma.repository.ts:198-199`; é a classe que a M5a muta em `:254-255`): sob o papel, com `withTenantRls` → vê **só os seus** (igual ao resultado sob superusuário, item a item). **Mutação M5a** (tirar o `withTenantRls`) → sem o GUC a RLS falha fechada → `items` vazio ≠ esperado → **vermelho** (sob superusuário continua verde — por isso a metade nova é obrigatória). Teardown **pelo superusuário** (o teardown atual l.173-176 sob papel sem bypass falha por FK `users_tenant_id_fkey`, medido pela C4 — fica no super); `DROP ROLE` no `after`. Se `DATABASE_URL` não tiver `rolcreaterole`/`rolsuper`, a metade nova é **pulada com motivo declarado** ("exige CREATE ROLE") e isso aparece no `skipped` publicado (B2). **Controle declarado:** no objeto o caso é verde; o vermelho-controle é M5a sob o papel. Só teste; nenhum código de produto.

#### E2.5 — Notas das cadeiras → pendências com dono (nenhuma reprova; nenhuma entra no 12a)
- `P-TENANT-SETTING-AUDIT-SEM-VALOR` (C2-02): `PUT /tenant-settings/<chave>` audita `tenant_setting.upserted` sem o valor — a trilha não diz se a delegação foi ligada ou desligada. `escopo: pre-existente` (`tenant-setting.controller.ts` fora do diff e do PERMITIDO); dono: módulo tenant-settings; recomendação: `{ key, category, value }` para chaves de política (sem segredo).
- `P-RBAC-MIGRATION-PARITY-ESTATICA` (C2-03): a guarda estática `permission-catalog-migration-parity` não acusa migração que conceda a chave a papel não autorizado; só a db-parity com banco (ativa na CI). `pre-existente`; dono: ferramentas de processo.
- `P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO` (C4-05): nenhum teste do resumo tem 2ª organização (M16d invisível em memória e sob superusuário). `pre-existente` (7eb1a814, 2026-07-18); dono: financial-summary.
- `P-AUDIT-CRITICA-NA-TRANSACAO` (E2.2, acima).

### C2.2 — Escopo do ciclo 2: PERMITIDO e PROIBIDO
**PERMITIDO (só isto; o resto da E1.10/E1b.6 continua valendo como estava):**
- `src/modules/financial-titles/financial-title.service.ts` — **só** `update`, `delete` e `assertNoPendingCheque` (E2.1)
- `src/modules/cheques/cheque.service.ts` — **só** `parseUnlinkJustification` (+ a mensagem do erro) (E2.2)
- testes: **novo** `tests/b-san3-12a-title-mutation-race-db.test.ts` (A29-a/b/c/d/g); `tests/b-san3-12a-pay-pending-cheque.test.ts` (A29-e/f); `tests/b-san3-12a-unlink-title.test.ts` (A30-a/b); `tests/b-san3-12a-pay-pending-cheque-db.test.ts` (A30-c); `tests/b-san3-12a-reconcile-cas-db.test.ts` (A13-bis); `tests/b-san3-12a-entries-aggregate-db.test.ts` (R-res-5-bis); `tests/financial-period-closes.test.ts` **só se** A29-h precisar de um caso novo (fixture existente)
- `API_CONTRACTS.md` (justificativa; PATCH/DELETE do título: "re-check sob o lock")
- registro: `agent-orchestration/controle/pendencias.md` (as 4 novas de E2.5; `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` fecha **no merge, pelo porteiro**, citando A29-c/g), `controle/decisoes.md` (A30 como leitura do planejador), `docs/revisoes/SAN3/B-SAN3-12a-dev.md` (E15+), `omega/reprovacoes/R-B-SAN3-12a-ciclo1.md` (papéis do ciclo 2), ata da junta.
**PROIBIDO (além do §7.4 e da E1.10):** `src/modules/financial-uow/**` (inclusive `financial-uow-prisma.ts`), `src/modules/core-saas/**` (inclusive `audit/`), `src/modules/cheques/cheque.controller.ts`, `cheque.routes.ts`, `cheque.repository.ts`, `cheque-prisma.repository.ts`, `cheque.types.ts`, `src/modules/financial-titles/{financial-title-prisma.repository,financial-title.repository,cheque-pending-reader}.ts`, `src/modules/financial-entries/**` (o A13-bis e o R-res-5-bis são só teste), `tests/helpers/**`, `tests/financial-uow-journal-classification.test.ts`, `tests/fixtures/**`, `prisma/**`, `.github/**`, `Kpis/**`, `frontend/**`, `mobile/**`. **Nenhum código de produto fora dos 2 arquivos acima.** Decisão nova no meio do conserto → emenda escrita antes do código (`D-EMENDA-ANTES-DO-CODIGO`).

### C2.3 — Bateria, mutações, baseline e ordem ao dev
**Linhas que se somam às da E1.10/E1b.6 (toda linha publica `tests · pass · fail · skipped`, B2):**
```
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx --test-reporter=tap tests/b-san3-12a-title-mutation-race-db.test.ts            # A29-a..d, g (barreira por application_name)
CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/b-san3-12a-pay-pending-cheque.test.ts tests/b-san3-12a-unlink-title.test.ts  # A29-e/f, A30-a/b
CORE_SAAS_PERSISTENCE=prisma DATABASE_URL=<descartável> node --test --import tsx --test-reporter=tap tests/b-san3-12a-pay-pending-cheque-db.test.ts tests/b-san3-12a-reconcile-cas-db.test.ts tests/b-san3-12a-entries-aggregate-db.test.ts   # A30-c, A13-bis, R-res-5-bis
CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap tests/financial-titles.test.ts tests/financial-period-closes.test.ts tests/cheque-title-link.test.ts tests/financial-uow-journal-classification.test.ts   # regressão A29-h, A21, arnês P7
```
+ a bateria inteira da E1.10/E1b.6 (`check`, `lint`, `build`, `link-toctou`, `pay-link-race`, `cheque-title-link-atomic-db`, censo, `core-saas`, drill), `npm test` base × head **normalizado** (B1-2, três listas), CI concluída e verde no head (B1-1), `skipped` do head ⊆ base (B2).
**Mutações obrigatórias (cada uma sozinha; restauro por hash do blob; a junta re-executa ≥ 1/3):** A29-a (tirar o re-check do `update`), A29-c (do `delete`), A29-b (tirar `assertExactOpenBalance` da revalidação — **restaurar**), A29-e (escrever fora da unidade), A29-h (tirar `ctx.assertPeriodOpenShared`), A30 (tirar `isWellFormed`; tirar a classe C0), M13a, M5a (sob o papel). **Vermelho-controle no objeto `04b8a667`** para A29-a/c/f/g e A30-a/b/c (`git checkout 04b8a667 -- <arquivo de produto>`; restaurar por hash; registrar `pass/fail` lido do TAP).
**Baseline N (objeto, E12):** testes do 12a = 51 (memória) + 30 (`-db`) = **81**. **Meta M:** ≥ 81 + **13** casos novos (A29 ×8, A30 ×3, A13-bis, R-res-5-bis) = **≥ 94**; a regressão publicada (backend 3760/3762 no #457; CI do head `a0b8f4be`: 4013 · fail 0 · skipped 2 e 493/493) **não cai**.
**Ordem ao dev:** E2.1 (serviço: `update` → `delete` → `assertNoPendingCheque` com leitor; `-db` novo com barreira; memória A29-e/f; A29-h) → E2.2 (validador → A30-a/b/c) → E2.3 → E2.4 → `API_CONTRACTS.md` → registro (pendências, dev.md E15, papéis em `R-…-ciclo1.md`) → mutações (as 8 + os vermelho-controle) → B1/B2 → push → CI concluída no head → PR pronto para a junta (inspetor antes).
**Dev:** Codex (GPT-5.6 Sol, nível menor declarado) ao voltar (01:15 BRT); se faltar, Claude Opus com identidade **nova** (≠ `dev-san312a-opus`, ≠ este planejador). Quem desenvolve não julga o achado (§C7.4-bis).

### C2.4 — Riscos e rollback
- **R1** — `update` inteiro na unidade muda o caminho de TODO PATCH (também o só de `description`): lock de linha curto, sem efeito funcional; coberto por `financial-titles.test.ts` e A21 ("PATCH só de `description` → 200"). Rollback: reverter o commit do ciclo 2 (sem migração, sem contrato novo).
- **R2** — deadlock vínculo × PATCH/DELETE: ordem de travas idêntica à do `pay` (título → leitura de cheques sem trava); A29-a/c/g terminam sem `deadlock detected` (asserção explícita).
- **R3** — perda da trava SHARED de período ao sair da standalone: fechada por A29-h (`ctx.assertPeriodOpenShared`) — **este é o ponto em que um conserto apressado reintroduz defeito**; o dev confere por `grep -n "assertPeriodOpenShared" src/modules/financial-titles/financial-title.service.ts` → 3 ocorrências (`createForWorkOrderInUnit`, `update`, `delete`), resultado no relatório.
- **R4** — A30 recusar texto legítimo: TAB/LF/CR permitidos; acentos, emoji e HTML passam (A30-a prova); se recusar algo que o dono queira, a classe C0 encolhe numa linha sem mexer no resto.
- **R5** — `P-AUDIT-CRITICA-NA-TRANSACAO` aberta: ato privilegiado ainda pode sair sem rastro por **falha operacional** da auditoria — declarado, pré-existente, com dono.
- **R6** — o A29-g é probabilístico: sozinho não prova nada; é regressão. A prova é A29-a/c (barreira).

### C2.5 — Cadeiras do ciclo 2 (§C7 item 9) e papéis (§C7.4-bis)
**Objeto do ciclo 2:** o head do PR #459 depois do conserto, com check-runs **concluídos** (`inspetor-de-terreno-da-junta`, identidade nova, Opus declarado, antes de qualquer voto — §C7.1-bis). **Régua:** ciclo 2 — `bloqueia` dentro-do-bloco reprova (item 8(2)); **unanimidade das 4 cadeiras** (dinheiro + permissão); todo voto com `arquivos_medidos` por item (item 9(0)); nenhuma cadeira lê o voto da outra; `pre-existente` só com evidência de data/origem.
- **C2 — permissão e auditoria — REFEITA, identidade nova** (≠ `jurado-san312a-c2-opus`): o conserto toca `cheque.service.ts`, que está no `arquivos_medidos` dela → item 9(3). Foco: **A30-a/b/c** (NUL, surrogates, C0, DEL; aceitos verbatim; vermelho-controle no objeto do ciclo 1 por checkout do arquivo) + regressão dos 3 itens dela (matriz por ator **por amostragem ≥ 1/3**, A27 por ator, snapshot × catálogo) + conferir que **A29 não muda quem pode o quê** (403/422 por ator iguais). Régua da falha operacional de auditoria: E2.2.
- **C4 — isolamento e invariantes — REFEITA, identidade nova** (≠ `jurado-san312a-c4-opus`): **A29-a..h** (re-executa a sonda p4 dela: esperado **0** estados ruins em N ≥ 20 por modo, nos 2 papéis — superusuário e papel sem bypass), **A13-bis com M13a aplicada** (vermelho), **R-res-5-bis com M5a** (vermelho sob o papel; verde sob super, declarado), regressão dos itens 1–3 (52/52 cross-tenant, 21/21 contrato do CAS, 49/49 A21/A16). Mandato > 3 itens → divide em C4a (A29) e C4b (A13-bis, R-res-5-bis, regressão) (P4).
- **C1 — DBA e dinheiro — vota pela 1ª vez** (o orquestrador a segurou no ciclo 1 porque o conserto toca o escopo dela): o mandato do ciclo 1 (A27-a/b/c com `pg_locks`/barreira, A28 com M2 nos dois lados, A4/A4-bis/A5-bis) **+ a ordem de travas e a ausência de deadlock do A29** (competência de DBA; sem duplicar a C4, que mede o desfecho). ≤ 3 itens; se estourar, C1a/C1b.
- **C3 — fail-closed, contrato e suíte (`**`) — vota pela 1ª vez:** B1 (CI no head; três listas normalizadas por script, "só no head" = 0 ou cada um com causa), B2 (`skipped`), A17-bis, contrato (justificativa A30; re-check do título; os 409), registro (as 4 pendências abertas com dono; `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` com o critério A29-c/g pronto para o porteiro; papéis nas atas dos 2 ciclos).
**Papéis do ciclo 2 (ata obrigatória):** achadores = `jurado-san312a-c2-opus` e `jurado-san312a-c4-opus` (ciclo 1); planejador = `planejador-san312a-c2-fable` (Fable 5.1, sem fallback); dev = Codex GPT-5.6 Sol **ou** Claude Opus identidade nova ≠ `dev-san312a-opus`; cadeiras/inspetor = identidades novas, Opus (ou Sol/Argon) **declarado**. Composição cobre a competência dos achados (corrida de banco → C4/C1; validação e rastro → C2; contrato e suíte → C3); inelegibilidade conferida por nome pelo inspetor; este plano usa só dado medido por mim ou re-executado (nenhuma afirmação herdada como fato).

### C2.6 — Perguntas ao dono
**Nenhuma.** A29 não muda quem pode o quê nem a regra "Só cheque do valor exato" — faz essa regra valer **também sob corrida**, com os códigos que já existem. A30 restringe caracteres de controle e texto mal-formado na justificativa (integridade do rastro; não é regra de dinheiro nem de permissão) — **leitura do planejador, declarada** (§A6), que o dono desfaz numa linha. A13-bis e R-res-5-bis são testes. As 4 pendências novas são pré-existentes, com dono e recomendação; nenhuma exige decisão agora.

### C2.7 — Resumo
- **Veredito da auditoria:** 3 defeitos reais (C4-03 + C4-04 = uma classe, grave: dinheiro; C2-01, rastro — ampliado aos surrogates isolados) e 2 buracos de teste legítimos (C4-02, C4-01); **nenhum artefato de processo**. A junta funcionou.
- **Requisitos novos: 4** — **A29** (8 critérios, a–h), **A30** (3 critérios, a–c), **A13-bis** (1), **R-res-5-bis** (1) = **13 critérios**, cada um com mutação vermelha e o controle declarado (objeto do ciclo 1 ou mutação sobre o objeto).
- **Pendências novas: 4** (todas `pre-existente`, com dono): `P-AUDIT-CRITICA-NA-TRANSACAO`, `P-TENANT-SETTING-AUDIT-SEM-VALOR`, `P-RBAC-MIGRATION-PARITY-ESTATICA`, `P-FINANCIAL-SUMMARY-SEM-SEGUNDA-ORGANIZACAO`. **Fecha no merge:** `P-SAN3-20-DELETE-TITULO-COM-CHEQUE` (A29-c + A29-g).
- **Código de produto tocado pelo conserto: 2 arquivos** (`financial-title.service.ts` só `update`/`delete`/`assertNoPendingCheque`; `cheque.service.ts` só `parseUnlinkJustification`). Nenhuma migração, nenhum contrato novo, nenhum membro novo na UoW.
- **Perguntas ao dono: 0.**

## Ratificação do orquestrador (2026-10-26 14:35Z) — duas incoerências internas que o dev do 12b achou antes do código

O dev (`dev-san312b-sol`) parou na releitura e registrou as duas em `docs/revisoes/SAN3/B-SAN3-12b-dev.md`. Nenhuma é decisão nova: o próprio plano já decide, e o defeito está só na transcrição.

1. **`frontend/src/modules/finance/entries/finance-errors.ts` entra no PERMITIDO do §7.2 (novos).** O §4.1 (l.216-217) já o exige: a lista vive uma vez no código e exporta `FINANCE_UI_ERROR_REASONS`, que o F4 itera. O §7.2 omitiu o arquivo. O mesmo vale para o teste que o importa, se ele nascer separado; senão, o teste fica num dos arquivos de teste já listados.
2. **O F4 diz "lista fechada de 31"; vale 32.** O §4.1 (l.211, v3, R2-10) diz *"o número vem da lista, não o contrário: 32"*, e a E1.F9 confirma os 32 da tela, com `bounce_reason_required`, `invalid_group_by`, `invalid_from` e `invalid_to` FORA da lista da tela. O "31" do F4 é resto da v2. O critério do F4 passa a ser: **a lista de `finance-errors.ts` é igual, como conjunto, à do §4.1 e à seção "lista da tela" de `API_CONTRACTS.md`, e o F4 itera sobre ela.** A mutação que deixa o critério vermelho é tirar 1 reason da lista ou acrescentar 1.

## Ratificação do orquestrador (2026-10-26 14:40Z) — o F8 vira trava com inventário congelado (achado do dev, F8)

O dev mediu, na `origin/main` `c9a2d036`, **8 ocorrências anteriores** de `reduce` ou `+=` sobre números em `frontend/src/modules/finance/**`:
- **7 em `commissions/**`:** `commissions.adapter.ts:144`, `CommissionDetailDrawer.tsx:80`, `ConferenciaRemuneracoesView.tsx:142,145,153` e `RemuneracoesPage.tsx:179,413`. O diretório é PROIBIDO no §7.4.
- **1 em `titles/financial-titles.adapter.ts:198`:** é o `sumAmount` de `computeTitleKpis`, usado só por `TitlesListView.tsx:74`, que mostra as telas legadas de Cobranças e Pagamentos. O 12b as redireciona, e a remoção delas é do `B-SAN3-24`, pela resposta do dono à Q4.

O "zero" do F8 era impossível sem tocar o PROIBIDO. Nenhuma das 8 é do bloco (§C7.1-ter(a), pré-existente, com origem na `main` antes do ramo). **O F8 passa a ser uma trava:**
- o guard `finance-no-money-reduce.guard.test.ts` varre `frontend/src/modules/finance/**` inteiro e compara com um **inventário congelado** das 8 ocorrências, por arquivo e pela expressão normalizada, não por número de linha;
- qualquer ocorrência fora do inventário reprova;
- se uma ocorrência do inventário sumir, o guard pede que ela saia do inventário, para o inventário não guardar entrada morta;
- nos diretórios que o 12b cria ou edita (`accounts/**`, `entries/**` e `pages/**`) o inventário é **vazio**.

**Mutações** (as duas deixam o guard vermelho):
- `items.reduce` somando `amount` numa view nova;
- acrescentar uma entrada falsa ao inventário.

O `rg` da bateria do §9 passa a ser: "`rg` lista exatamente as 8 do inventário".

**Pendência nova, aberta no PR do 12b:** `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`, BAIXA, pré-existente.
- **Dono das 7 de `commissions/**`:** o bloco das telas de comissões.
- **Dono da 1 de `titles/`:** o `B-SAN3-24`, quando as telas legadas saírem.
- **Fechamento:** inventário vazio.

---

## Emenda E2 (ciclo 2 do 12b) — plano de resolução da reprovação do ciclo 1

> Autor: `planejador-san312b-c1rep-fable` (topo, Fable). Parecer: `agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo1.md`. Esta emenda é apensa verbatim ao fim da cópia do orquestrador (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-12-plano.md`) e, pelo R13, ao plano versionado `docs/revisoes/SAN3/B-SAN3-12-plano.md`. Onde divergir do plano v3 e das ratificações de 26/10, **vale a E2**; onde a E2 cala, vale o plano.
> **Objetivo:** fechar os 6 `bloqueia` e o ajuste do ciclo 1 sem reintroduzir defeito, com o ramo trazido à `main` (`f7922ab7`), e entregar um objeto que a junta do ciclo 2 (C1 e C3 refeitas; C2 revalidada) possa aprovar. O ciclo 2 é o último em que achado não grave reprova (§C7 item 8(2)): cada requisito abaixo tem critério, mutação e vermelho-controle no objeto do ciclo 1.
> **Ator:** Financeiro (baixa, conciliação, contas), Administrador da organização (desvincular e cancelar cheque), Gestor/Auditor (só consulta), Técnico de Campo (sem acesso).
> **Fluxo origem → destino:** o mesmo do plano (§4 e §6): tela `/finance` → `GET /financial-summary`, `/financial-accounts(+/balance)`, `/financial-titles` (agora com `offset`), `/financial-entries(+/aggregate, /reconciliation-policy)`, `POST /financial-titles/:id/pay`, `PATCH /financial-entries/:id/reconcile`, `GET /cheques?title_id=`, `POST /cheques/:id/unlink-title` e, **de volta ao contrato**, `POST /cheques/:id/cancel`.
> **Contrato:** sem rota nova no backend e sem mudança de DTO. O §4.1 ganha a linha que faltava: `POST /cheques/:chequeId/cancel` (sem corpo; 200 com o DTO do cheque; 403 sem `cheques:update`; 404 cross-tenant; 422 `cheque_linked_unlink_first` se ainda vinculado; 422 `invalid_transition`/`cheque_not_editable`; 409 `transition_conflict`; os 4 últimos já estão nos 32 de `finance-errors.ts`). **Modelagem:** nenhuma (sem `prisma/**`, sem migração).

### E2.1 Escopo do conserto (o PERMITIDO do ciclo 2; o §7.4 continua PROIBIDO inteiro)
- **editados (produto):** `frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx`, `pages/FinanceiroPage.tsx`, `pages/financeiro.state.ts` (se precisar), `entries/useEntriesAggregate.ts`, `entries/components/BaixaForm.tsx`, `entries/financial-entries.service.ts`, `entries/financial-entries.types.ts`, `entries/useFinanceActions.ts`, **`titles/useFinancialTitles.ts` (novo no PERMITIDO: aditivo, forma de retorno preservada para `TitlesListView.tsx`)**, `titles/financial-titles.service.ts` (`buildQuery` + `offset`), `titles/financial-titles.types.ts` (`offset?` nos filtros).
- **testes:** `frontend/tests/finance-page-live.test.tsx`, `finance-baixa.smoke.test.tsx`, `finance-contas-extrato.smoke.test.tsx`, `finance-no-money-reduce.guard.test.ts`, `financial-entries.adapter.test.ts` (se o serviço ganhar adaptador do cancel); `frontend/package.json` **só** pelo merge da `main` (linha `test:smoke`).
- **registro:** `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` (sempre regenerado), `docs/revisoes/SAN3/B-SAN3-12b-dev.md` (seção do ciclo 2), `docs/revisoes/SAN3/B-SAN3-12-plano.md` (apensar as 3 ratificações e esta E2, verbatim), `agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo1.md` (este parecer, commitado pelo orquestrador).
- **merge da `main`:** os arquivos que o merge trouxer (#464) entram como vieram; o dev não os edita fora da resolução de conflito (E2.5).
- **fora:** `frontend/src/styles/app.css` (o C1-02 se resolve inline), `components/**` da biblioteca (nada novo: `TablePager` já existe), `src/**`, `prisma/**`, `.github/**`, `Kpis/**`, `navigation.registry.ts`, `PermissionGuard.tsx`, `work-orders/**`, `commissions/**`, lockfiles.

### E2.2 Divergências da opção A DECLARADAS (fidelidade, para a C1 julgar como declaradas, não como silêncio)
- **D-5 (mantida):** "Conciliação por conta" mostra a contagem a conciliar por conta (dado do `GET /financial-entries/aggregate?group_by=none&account_id=…&reconciled=false`), não a barra conciliado/ressalva/a conciliar da maquete: o agregado do 12a não agrupa por conta, e a barra exigiria 3 consultas por conta.
- **Busca da tabela ("Buscar documento, cliente ou descrição") ausente:** vira pendência com dono (E2.4, `P-SAN3-12B-BUSCA-TABELA-TITULOS`, dono `B-SAN3-12c`), porque é filtro de texto sobre linhas carregadas e a lista de títulos passa a ser parcial por desenho (R3); entra junto da paginação completa.
- **"Carregar mais títulos" (R3):** elemento que a maquete não tem, porque a maquete tem todos os dados em memória; o servidor limita a 100 por pedido (`invalid_limit`), e o botão é o caminho honesto até os títulos restantes. Declarado aqui.
- **Rótulos "Recebidos em parte"/"Pagos em parte"** (maquete: "Recebidos ou pagos em parte"), minigráfico dos indicadores e etiqueta "N com ressalva" ausentes: notas do ciclo 1, mantidas como estão (sem perda de informação; as ressalvas estão nos blocos da Conciliação).
- **D-9 (mantida):** só a aparência A neste bloco; B e C no 12c (`screen-refs/README.md` l.41).
- **AccountCard e FilterChip locais (C1-N7):** mantidos; o `FilterChip` vira lista (`FilterChips`) e continua local à view. Registro no COMPONENT_LIBRARY só quando o 12c os reusar.

### E2.3 Requisitos (cada um: requisito · arquivos · critério · mutação que deixa vermelho · vermelho-controle no objeto do ciclo 1 `fc5ead6c`)

**R1 — C1-01: o filtro de conta aparece acima da lista e sai com um clique; indicador da organização não carrega conta.**
- Arquivos: `FinanceiroViewA.tsx` (chips; `go()` dos indicadores), `finance-page-live.test.tsx`.
- Critério: (a) nas abas `ext` e `conc`, sempre que `state.accountId` estiver definido, a barra de filtros (`.pat-filtro-chip-bar`, acima da lista) mostra o chip `Conta: <nome>` (nome vindo de `model.accounts.items`; se a conta não estiver na lista, `Conta selecionada`), com botão `aria-label="Remover o filtro de conta"` → `go({ accountId: null })`; o pedido seguinte de `GET /financial-entries` sai **sem** `account_id` e a querystring **sem** `conta`. Chip de conta e chip de alvo coexistem (ordem: conta, alvo); na `conc`, o alvo `conc:*` continua representado pelo bloco pressionado (como no ciclo 1). (b) Os indicadores "A conciliar", "Entradas em <mês>" e "Saídas em <mês>" navegam com `accountId: null` (são números da organização; o "Saldo em caixa" já faz isso); só a faixa "Conciliação por conta" e o `AccountCard` gravam `accountId`.
- Teste (vivo): cenário 1: faixa "Banco do Brasil: 1 a conciliar" → `conc` com `?conta=acc-banco&filtro=conc:pendente`; clicar o bloco pressionado "A conciliar" → chip `Conta: Banco do Brasil` presente; clicar "Remover o filtro de conta" → `?aba=conc`, pedido sem `account_id`, 3 linhas. Cenário 2: `ext`, cartão "Caixa da loja" (chip `Conta: Caixa da loja` visível), clicar o indicador "A conciliar" → `conc` **sem** `conta`, sem chip de conta, nº de linhas = contagem do indicador.
- Mutação: `chipLabel` volta a olhar só `state.target` → cenário 1 vermelho; "A conciliar" volta a `go({ tab: "conc", target: "conc:pendente" })` → cenário 2 vermelho.
- Vermelho-controle: os 2 cenários no objeto do ciclo 1 → vermelhos (`pressedAll=[]`, `?conta=` mantido; o que a C1 mediu).

**R2 — C1-02: "Conciliação por conta" com o nome à esquerda e a contagem à direita.**
- Arquivos: `FinanceiroViewA.tsx` (l.327-340), `finance-contas-extrato.smoke.test.tsx` (ou o vivo).
- Critério: o botão de cada conta leva, inline, `display: "flex"`, `alignItems: "center"`, `justifyContent: "space-between"`, `width: "100%"`, `textAlign: "left"`; o nome fica num `<span>` com reticências (`title` = nome inteiro) e a contagem num `<b>` com `whiteSpace: "nowrap"` e `marginLeft: 8`; nenhuma regra nova em `app.css`. A C1 mede no navegador: nome à esquerda, contagem à direita, distância ≥ 8 px, como na referência.
- Teste (SSR): o `style` do botão contém `display:flex` e `justify-content:space-between`, e os filhos são `span` (nome) + `b` (contagem).
- Mutação: tirar o `display: "flex"` → vermelho.
- Vermelho-controle: objeto do ciclo 1 → vermelho (sem `display:flex`; a C1 mediu `display: block`, distância 0 px).

**R3 — C1-03: contagens do servidor, paginação padronizada e caminho até todos os títulos.**
- Arquivos: `titles/useFinancialTitles.ts`, `titles/financial-titles.service.ts` (`buildQuery` + `offset`), `titles/financial-titles.types.ts` (`offset?`), `FinanceiroViewA.tsx`, `FinanceiroPage.tsx` (passa `total`, `hasMore`, `loadingMore`, `loadMore`), `finance-page-live.test.tsx`.
- Critério: (a) **hook**: a 1ª carga continua `limit=100`; o hook expõe `total` (= `pagination.total` do servidor), `hasMore = items.length < total`, `loadingMore` e `loadMore()` → `GET /financial-titles?direction=…&limit=100&offset=<items.length>`, anexando sem repetir `id`; `refresh(background)` relê as páginas já carregadas (offsets 0, 100, … até onde o usuário chegou) e substitui o conjunto sem encolher; a forma de retorno antiga (`items, pagination, source, fallbackReason, loading, isRefreshing, refresh, context`) continua igual e `finance-titles.test.tsx` (23 casos, legado) segue verde. (b) **aba** "A receber"/"A pagar": contagem = `summary.receivable.openCount`/`summary.payable.openCount` (servidor); sem número se o resumo estiver carregando ou indisponível. (c) **bloco "Vencidos"**: `summary.<dir>.overdueCount` (servidor). **"Vencem hoje", "Próximos 7 dias", "Recebidos/Pagos em parte"**: contagem sobre as linhas carregadas **só com a carga completa** (`items.length >= total`); incompleta → sem número e `aria-label` "<rótulo>: contagem disponível depois de carregar todos os títulos — filtrar a lista" (o bloco continua filtrando as linhas carregadas). (d) **contador** (`.pat-table__count`): completa → `N títulos` (N = linhas visíveis); incompleta → `N entre os L mais recentes de T títulos` (sem alvo: `L mais recentes de T títulos`), o idioma do extrato. (e) **`TablePager`** (biblioteca) no rodapé da tabela, client-side sobre as linhas visíveis, `pageSize` 20 (opções 20/50), `rangeLabel` `a–b de N` (incompleta: `a–b de N carregados · T no servidor`); a página volta à primeira em todo `go()`; o detalhe aberto fecha ao trocar de página. (f) **botão "Carregar mais títulos (R restantes)"** (`pat-btn pat-btn--secondary`, R = `total − items.length`) ao lado do pager enquanto `hasMore`; durante `loadingMore`, desabilitado com "Carregando…"; some quando `hasMore` é falso. Nada disto soma dinheiro (F8): contagens e seleção.
- Teste (vivo; fixture gerado de 130 títulos a receber em aberto, `pagination.total=130`, dublê honrando `offset`; `SUMMARY.receivable.openCount=130`): aba "A receber 130"; contador `100 mais recentes de 130 títulos`; pager `1–20 de 100 carregados · 130 no servidor`; "Vencidos <n>" com o número do resumo; "Vencem hoje" sem número; "Carregar mais títulos (30 restantes)" → `GET …&limit=100&offset=100` → contador `130 títulos`, pager `1–20 de 130`, "Vencem hoje" com número, botão ausente; "Próxima" → linhas 21–40. O fixture de 3 títulos ganha `openCount` coerente no `SUMMARY`.
- Mutações (4): aba com `.length` → vermelho (100 ≠ 130); `loadMore` sem `offset` (o dublê devolve a 1ª página; dedupe segura 100) → vermelho; `TablePager` removido → vermelho; "Vencem hoje" contando linhas com carga incompleta → vermelho.
- Vermelho-controle: o teste novo no objeto do ciclo 1 → vermelho ("A receber 100", 0 paginação; o que a C1 mediu).

**R4 — C3-02: cada URL de agregado é pedida uma vez por carga; contagem por conta não some.**
- Arquivos: `FinanceiroPage.tsx`, `entries/useEntriesAggregate.ts`, `finance-page-live.test.tsx`.
- Critério: (a) a página chama o hook **duas vezes**, com chaves independentes: `useEntriesAggregate(SITUATION_QUERIES, …)`, com `SITUATION_QUERIES` constante de módulo (as 4 situações), e `useEntriesAggregate(accountQueries, …)`, memo sobre `accountKey` (`{}` até as contas chegarem; com `{}` o hook não pede nada); `model.aggregates = { ...situacao.data, ...porConta.data }`; `refreshAggregates(bg)` dispara os dois. (b) `useEntriesAggregate` grava `setData((current) => ({ ...current, ...rodada }))` e ignora resultado de rodada superada (contador em `useRef`): rodada velha nunca apaga chave da nova. (c) O F14 do teste vivo conta `GET /financial-entries/aggregate?…` **por URL completa**: cada URL exatamente 1 por carga (4 situações + 1 por conta ativa = 6 no fixture de 2 contas) e, concluída a carga, a faixa mostra "Banco do Brasil: 1 a conciliar" e "Caixa da loja: … a conciliar". O dublê responde `/financial-accounts` só depois de o 1º pedido de `/aggregate` sair (a ordem real; o arnês do ciclo 1 já reproduz, como a C3 provou).
- Mutações (2): as consultas por conta de volta no mesmo `useMemo` das 4 situações (a forma do objeto) → vermelho (URL ×2); a view chama `useFinancialSummary()` de novo (mutação F14 original) → vermelho.
- Vermelho-controle: o F14 ampliado no objeto do ciclo 1 → vermelho (4 URLs ×2; o que a C3 mediu).

**R5 — C3-05: depois de desvincular um cheque `registered`, a tela oferece "Cancelar o cheque"; nenhuma frase aponta para uma tela de Cheques que a web não tem.**
- Decisão e porquê: **a tela volta a oferecer, e isto não é pergunta ao dono.** O plano v3 decide em três cláusulas (§4.3 l.257-258; R-res-3 l.651; R-res-6 l.654) e a lista fechada do §4.1 (l.214) já traz os códigos do `cancel` ("do fluxo de cheque que a tela alcança ao desvincular/cancelar"); o dono decidiu o privilégio (R2-04, literal "Mesmo privilégio da troca"); a rota existe no backend sob `cheques:update`, sem corpo; nenhuma permissão nova, nenhuma rota nova, nenhum DTO novo. Só a linha de rotas do §4.1 omitiu `POST /cheques/:chequeId/cancel`: a E2 corrige a transcrição. A D-6 foi decisão do dev depois do código, sem emenda (`D-EMENDA-ANTES-DO-CODIGO`); o que ela tirou é a defesa do caixa 2× (R-res-3). Perguntar ao dono seria reabrir decisão já tomada.
- Arquivos: `entries/financial-entries.service.ts` (+`cancelCheque(context, chequeId)` → `POST /cheques/<id>/cancel`, sem corpo), `entries/financial-entries.types.ts` (resultado, se precisar), `entries/useFinanceActions.ts` (+`cancelCheque`), `entries/components/BaixaForm.tsx` (fluxo + textos), `FinanceiroPage.tsx` (`access.cancelCheque = can("cheques:update")` → prop `canCancelCheque`), `finance-page-live.test.tsx` (fluxo F6 ampliado), `finance-baixa.smoke.test.tsx`.
- Critério: (a) após `POST /unlink-title` 200 de cheque `registered`, a baixa reabre com o aviso "Cheque nº X desvinculado deste título. Se ele não vai mais ser usado, cancele-o agora: assim o dinheiro não entra duas vezes." e, para ator com `cheques:update`, o botão "Cancelar o cheque nº X" em dois passos (clique → "Confirmar o cancelamento" / "Manter o cheque"); confirmar → `POST /cheques/<id>/cancel` **sem corpo**; 200 → aviso "Cheque nº X cancelado. Ele não entra mais no caixa." e o botão some; erro → `financeErrorMessage` (os 32; `cheque_linked_unlink_first`, `invalid_transition`, `cheque_not_editable`, `transition_conflict` já traduzidos) e o botão fica. (b) cheque `deposited` (unlink 200 com `warning: cheque_still_depositable`): sem botão; aviso "Cheque nº X desvinculado deste título. Atenção: ele já estava depositado e ainda pode compensar — confira com o banco antes de receber por outro meio." (c) ator sem `cheques:update`: sem botão; o aviso acrescenta "Peça a quem administra os cheques para cancelar o cheque nº X." (d) `grep -n -E "cancele-o lá|Confira em Cheques" BaixaForm.tsx` = 0; a frase de l.210 vira "Não foi possível listar o cheque agora. Tente de novo."; a frase de l.282-283 ("A tela de Cheques chega com o próximo bloco") pode ficar: é honesta. (e) o dev publica `node --import tsx -e` que imprime `ROLE_PERMISSIONS.tenant_admin.includes("cheques:update")` e `ROLE_PERMISSIONS.finance.includes("cheques:update")` no head (a C2 confere o gate = permissão da rota, CE-G2).
- Teste: ator `tenant_admin` (unlink + update): (a) inteiro, inclusive o POST sem corpo e o 422 `cheque_linked_unlink_first` com o botão mantido; ator sintético `so:cheques:unlink_title` (sem `update`): desvincula e **não** vê o botão; cheque `deposited`: sem botão e com o aviso (b).
- Mutações (3): botão também para `deposited` → vermelho; gate por `cheques:unlink_title` em vez de `cheques:update` → vermelho (o ator `so:unlink` veria o botão); POST com corpo `{}` ou rota `/cheques/<id>` → vermelho.
- Vermelho-controle: objeto do ciclo 1 → vermelho (não há botão; `git grep "Cancelar o cheque" fc5ead6c -- frontend/src` = 0).

**R6 — C3-01: recusa definitiva do servidor nunca vira "esta baixa já está registrada".**
- Arquivos: `BaixaForm.tsx` (`settleAfterFailure`), `finance-page-live.test.tsx`.
- Critério: a fase `already` só nasce de (i) 409 `duplicate_payment` (o servidor confirma que este `client_action_id` já foi gravado) ou (ii) falha **sem** status HTTP (rede/timeout) ou 5xx **com** `fresh.paidAmount > before.paidAmount`. Toda recusa 4xx definitiva (`overpayment`, `title_already_paid`, `title_cancelled`, `period_closed`, `account_inactive`, `cheque_required`, `currency_mismatch`, `amount_overflow`, `title_has_pending_cheque`, 400, 403, 404) mostra a mensagem da razão e, se o título mudou, acrescenta "O título mudou desde que você abriu: pago R$ <paidAmount> de R$ <amount>." com o valor do formulário refeito para o saldo em aberto relido; `title_already_paid`/`title_cancelled` (ou `fresh.status` final) fecham (`closed`), o resto volta ao formulário. A ordem das checagens é: releitura → razão → só então o `paidAmount`.
- Teste (vivo): 422 `overpayment` com releitura `paidAmount` 400 > 0 → texto da recusa + "O título mudou desde que você abriu: pago R$ 400,00 de R$ 1.000,00", fase formulário, 0 reenvio automático; rede caída com releitura paga → `already` (como hoje); 409 `duplicate_payment` → `already`.
- Mutação: devolver o `if (fresh.paidAmount > before.paidAmount) → already` para antes da razão → vermelho.
- Vermelho-controle: objeto do ciclo 1 → vermelho (a sonda "concorrência" da C3: "Esta baixa já está registrada" após 422 `overpayment`).

**R7 — C3-07: o índice de pendências é sempre o que o gerador produz da fonte do mesmo commit.**
- Arquivos: `agent-orchestration/controle/pendencias.md`, `pendencias-indice.md`.
- Critério: em **todo** commit que toque `pendencias.md` (merge da `main` inclusive), o índice é regenerado por `python -I agent-orchestration/controle/gerar-indice-pendencias.py` e commitado junto; no head final, o gerador rodado numa cópia produz arquivo igual ao versionado (diff sem CR = 0 linhas). O dev publica o comando e `git diff --stat` = vazio.
- Mutação: trocar 1 `status:` em `pendencias.md` sem regenerar → diff ≠ 0 (a C3 provou: 108 linhas).
- Vermelho-controle: objeto do ciclo 1 → 104 linhas (medido por mim e pela C3).

**R8 — merge da `main`: o ramo contém `f7922ab7` com os dois lados do registro e a união do `test:smoke`.** Procedimento em E2.5; critérios lá.

**R9 — C2-01: o gate da baixa é provado por ator de PERMISSÃO, não só de papel.**
- Arquivos: `finance-baixa.smoke.test.tsx` (ou o vivo).
- Critério: 2 casos novos: ator com `financial_entries:create` **sem** `financial_titles:update` → "Registrar recebimento" presente; ator com `financial_titles:update` **sem** `financial_entries:create` → ausente, com a frase de consulta (CE-G2). Idem para "Conciliar" (`financial_entries:update` × `financial_titles:update`) se couber na mesma forma.
- Mutação: gate por `financial_titles:update` (a M2 do plano) → vermelho.
- Vermelho-controle: no objeto do ciclo 1 o código está certo e o teste novo fica **verde**; o controle é a M2 aplicada ao objeto com o teste novo → vermelho (a C2 provou que os 36 casos do bloco ficavam verdes sob a M2; o caso novo é o que a acusa).

**R10 — C1-N3: aba "Contas e extrato" sem `financial_accounts:read` mostra acesso não permitido, não um vazio.**
- Arquivos: `FinanceiroViewA.tsx` (aba `ext`, antes do "Cadastre a primeira conta"), `finance-page-live.test.tsx`.
- Critério: com `financial_entries:read` e sem `financial_accounts:read`, a aba `ext` renderiza `StatePanel tone="forbidden"` ("Acesso não permitido — Seu perfil não inclui as contas desta organização. Para mais acesso, fale com o administrador da organização.") e nenhum botão de cadastro; as outras abas não mudam.
- Mutação: voltar ao vazio "Cadastre a primeira conta" → vermelho. Vermelho-controle: objeto do ciclo 1 → vermelho (a C1 mediu o vazio).

**R11 — C1-N8: a guarda textual do F17 alcança palavra única com maiúscula e o diretório `titles/`.**
- Arquivos: `finance-contas-extrato.smoke.test.tsx` (o guard F17).
- Critério: um literal conta como texto de UI se tem espaço, acento **ou começa por maiúscula**; os diretórios varridos são `accounts/`, `entries/`, `pages/` **e `titles/`** (o dev mede antes: se `titles/` já tiver ocorrência pré-existente, lista-a com `git blame` numa exclusão nominal e abre pendência; a varredura da C1 achou 0 na tela). A lista técnica continua a do ciclo 1 (tenant, role, reconciled, scope, rbac, permission, path de rota).
- Mutações (2): `label="Reconciled"` em `EntryDetail.tsx` → vermelho; `"Open (not reconciled)"` em `financial-titles.adapter.ts` → vermelho. Vermelho-controle: no objeto do ciclo 1 as duas ficam verdes no F17 (a C1 provou); com a guarda nova, vermelhas.

**R12 — C3-04: a trava do F8 alcança a soma por `x = x + …`.**
- Arquivos: `finance-no-money-reduce.guard.test.ts`.
- Critério: além de `reduce(` e `+=`, a guarda acusa a forma `\b(\w+)\s*=\s*\1\s*[+-]` em `frontend/src/modules/finance/**`; o inventário congelado continua o das 8 (a trava NÃO ganha entrada por mutação); se a forma nova casar linha pré-existente em `commissions/**` ou `titles/` na `main` já mergeada, ela entra no inventário com `git blame` e na pendência `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` (o dev mede e publica N).
- Mutação: `let soma = 0; for (const e of items) soma = soma + Number(e.amount)` na view A → vermelho. Vermelho-controle: a C3 provou que esta mutação fica verde no objeto do ciclo 1; com a guarda nova, vermelha.

**R13 — registro: ratificações e emenda versionadas; transcrições corrigidas; D-8 verdadeiro.**
- Arquivos: `docs/revisoes/SAN3/B-SAN3-12-plano.md`, `docs/revisoes/SAN3/B-SAN3-12b-dev.md`, `agent-orchestration/controle/pendencias.md` (+ índice).
- Critério: (a) as 3 ratificações de 26/10 (14:35Z ×2, 14:40Z) e esta E2 são apensas **verbatim** ao fim do plano versionado (`git grep -c "Ratificação do orquestrador" <head> -- docs/revisoes/SAN3/B-SAN3-12-plano.md` = 2; `"Emenda E2"` ≥ 1); a frase de `pendencias.md` sobre "no fim do plano" passa a ser verdadeira. (b) No plano versionado, por linha de transcrição apensa na E2 (não editar o corpo v3): o §4.1 ganha `POST /cheques/:chequeId/cancel`; o §10 passa a dar à C3 também F20–F22 (ressalva 1 do inspetor); o F4 diz 32 (ratificação). (c) D-8 do relatório corrigido: "Node 22.14.0 está instalado (`C:/Users/AMP/AppData/Local/nvm/v22.14.0/node.exe`); o `test:smoke` foi executado nas duas versões por caminho absoluto no PATH do comando, nunca `nvm use`; a CI roda Node 20" e os dois TAP (`tests · pass · fail · skipped`) publicados. (d) as pendências de E2.4 abertas com dono e critério de encerramento; o índice regenerado (R7).
- Mutação: tirar uma ratificação do plano versionado → o `git grep` cai para 1 (vermelho). Vermelho-controle: objeto do ciclo 1 → 0 (medido pela C3).

**R14 — bateria do ciclo 2, relatório e mutações.**
- Executor: **Codex GPT-5.6 Sol** (`dev-san312b-ciclo2-sol`, identidade nova), comandos por `"C:/Program Files/Git/bin/bash.exe" -lc` (no Codex desta máquina `/bin/bash` não existe), no worktree `C:/Users/AMP/w-san312b` com os `node_modules` próprios dele (sem junction), **sem Docker**.
- Bateria (de `frontend/` para os `.tsx`, como a D-3 transcreve; cada linha publica `tests · pass · fail · skipped`): `npm --prefix frontend run check`; `cd frontend && node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/finance-titles.test.tsx` (meta: ≥ 67 + 17 = **84** casos nos arquivos do bloco; baseline do ciclo 1 N = 67); `npm --prefix frontend run test:smoke` em Node 20 **e** 22 (esperado ≥ 1435 + 1 do #464 + 17 = 1453); `npm --prefix frontend run build`; raiz `npm run check`, `npm run lint`, `npm run build`; F8 como comando (`git grep -n -E "reduce\(|\+= *[a-zA-Z.]*amount" -- frontend/src/modules/finance` = exatamente o inventário); `git diff --check`; `python -I …/gerar-indice-pendencias.py` → diff vazio. **CE-4 `-db` (F18):** o backend continua byte-idêntico (`git diff --name-only c9a2d036 HEAD -- src prisma scripts` = 0, publicado); o Codex não roda Docker, então a régua do F18 neste ciclo é o job `backend` da CI no head (braço 2) mais o parecer do ciclo 1 (braço 1, 3/3 na C3); a C3 do ciclo 2 re-executa o `-db` no Postgres descartável dela se quiser.
- Mutações (§M, uma por vez, âncora única, restauro por hash, uma linha por mutação no relatório): as **24 do ciclo 1** re-executadas no head final + as **17 novas** desta E2 (R1 ×2, R2 ×1, R3 ×4, R4 ×2, R5 ×3, R6 ×1, R9 ×1, R10 ×1, R11 ×2 — a R12 e a R7 contam como as suas próprias). O roteiro do ciclo 1 (`mutacoes.py`) vive no scratchpad do dev anterior, fora do repo: se o orquestrador não o entregar, o dev escreve o seu (mesma forma: aplicar, rodar o teste dono, restaurar, conferir hash).
- Relatório: seção `## Ciclo 2 (dev-san312b-ciclo2-sol)` em `B-SAN3-12b-dev.md`, P1 por fatia (E2.6), com `## RETOMADA n` ao fim de cada fatia (head · feito · falta · próximo comando).

### E2.4 Pendências com dono (abertas no PR, com critério de encerramento)
| Pendência | Origem | Escopo | Dono | Encerra quando |
|---|---|---|---|---|
| `P-SAN3-12B-BUSCA-TABELA-TITULOS` | C1-N6 (campo de busca da barra da tabela da opção A ausente) | dentro-do-bloco, declarado em E2.2 | `B-SAN3-12c` (mesma tela, mesma camada) | busca por documento/cliente/descrição sobre as linhas carregadas, com o contador honesto da R3 |
| `P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO` | C1-N4 ("Acesso nao autorizado…" em `PermissionGuard.tsx`, 98b4bee3, 2026-06-06) | pré-existente | `B-SAN3-06a` (dono de `auth.adapter.ts`/guarda do front); alternativa `B-SAN3-24` | texto acentuado e F17 estendido ao guarda |
| `P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO` | C1-N5 (`num()` do adaptador do resumo devolve 0 para campo ausente; 08d00949, 2026-07-18) | pré-existente | `B-SAN3-12c` (mesma camada de dados) | campo ausente → indicador não renderizado (F19 no adaptador) |
| `P-SAN3-12-CE4-BRACO1-NA-CI` | C3-03 (CE-4 só roda no braço 2 na CI; `.github/**` proibido aqui) | dentro-do-bloco (registro) | `B-SAN3-12c` + bloco de ferramentas de processo | job com `db:provision-rbac` rodando `tests/b-san3-12-ce4-db.test.ts` (braço 1) verde no head |
| `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO` (já aberta) | D-4 / C2-02 | — | `B-SAN3-24` | inalterada |
| `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` (já aberta) | ratificação 14:40Z; R12 pode ampliar o inventário com blame | pré-existente | telas de comissões / `B-SAN3-24` | inventário vazio |

Notas sem pendência (ficam no relatório do ciclo 2): C1-N7 (composição local sobre classes da biblioteca), C2-03 (células de atores sintéticos decididas por F13/Q4), D-5 e D-9 (E2.2), C3-06 (corrigido pela R13).

### E2.5 Merge da `main` (R8): como o dev traz `f7922ab7` (merge, nunca rebase)
Medido por mim em worktree descartável: `git merge --no-commit --no-ff f7922ab7` sobre `fc5ead6c` → **3 conflitos**, todos de registro: `agent-orchestration/controle/pendencias.md`, `agent-orchestration/controle/pendencias-indice.md`, `frontend/package.json`. O resto (API_CONTRACTS, app.css, appearance.registry, checklists, 3 corpos de jurado do #464) mergeia sozinho. No `test:smoke`: o objeto acrescenta 9 testes; a `main` acrescenta 1 (`tests/checklists-editor-lock.smoke.test.tsx`).
1. `git -C C:/Users/AMP/w-san312b fetch origin main && git merge origin/main` (sem `--rebase`, sem `reset`, sem `--force`; `git status` limpo antes).
2. `pendencias.md`: **os dois lados ficam** (as entradas do #464 e as do 12b; ordem: o lado da `main` primeiro, depois o do 12b, sem apagar nem reordenar entrada alheia); conferir que os cabeçalhos `## P-…` do objeto (`P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE`, `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO`, o fechamento de `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`) e os do #464 existem uma vez cada (`grep -c`).
3. `pendencias-indice.md`: **não se resolve à mão**: depois do passo 2, `python -I agent-orchestration/controle/gerar-indice-pendencias.py` e `git add` do resultado (R7).
4. `frontend/package.json`: a linha `test:smoke` = lista da `main` + os 9 testes do 12b no fim (união; nenhum repetido; `node -e` que lê o JSON e imprime a lista, publicado).
5. `git diff --check`; `npm --prefix frontend run check`; `npm --prefix frontend run test:smoke` (Node 20) → verde; só então `git commit` ("merge: traz a main (#464) para o ramo do B-SAN3-12b") e `git push`. Nenhum outro arquivo editado neste commit.
6. Critério: `git merge-base --is-ancestor f7922ab7 HEAD` = 0; `gh pr view 469 --json mergeable` ≠ `CONFLICTING`; CI do head concluída (o gatilho `pull_request` volta a nascer quando o conflito some, §C7.1-bis). Mutação: resolver o índice à mão → R7 vermelho. Rollback: o merge não se reverte; se algo sair errado, `git merge --abort` antes do commit, ou novo merge por cima.

### E2.6 Fatias para o Codex (≤ 45 min cada; cada fatia termina com commit, push e `## RETOMADA n` no relatório)
Regra de cada fatia: começar por `git fetch && git status --porcelain` (vazio) e `git rev-parse HEAD` publicado; escrever o teste (vermelho) antes do código; `npm --prefix frontend run check` + o teste dono verdes antes do commit; Conventional Commits; se a janela acabar no meio, o parcial **não** é commitado: a retomada seguinte mede o `git diff` e decide (P3/P7). Nunca `nvm use`, nunca Docker, nunca `rebase`.
| # | Fatia | Alcance | Tempo | Commit |
|---|---|---|---|---|
| 1 | merge da `main` | E2.5 inteira; índice regenerado; smoke Node 20 | ~25 min | `merge: traz a main (#464) para o ramo do B-SAN3-12b` |
| 2 | R2 + R1 | botão da faixa inline; chips de conta + alvo; `accountId: null` nos indicadores; 3 casos novos | ~40 min | `fix(financeiro): filtro de conta visível e removível; "Conciliação por conta" alinhada (B-SAN3-12b c2)` |
| 3 | R4 | dois hooks de agregado; merge e rodada no `setData`; F14 contando `/aggregate` por URL | ~35 min | `fix(financeiro): cada agregado pedido uma vez por carga (F14) (B-SAN3-12b c2)` |
| 4 | R3 (a)(b)(c) | hook com `offset`/`loadMore`/`total`; contagens da aba e dos blocos pelo resumo; fixture de 130 | ~45 min | `feat(financeiro): contagens de títulos do servidor e carga por páginas (B-SAN3-12b c2)` |
| 5 | R3 (d)(e)(f) | contador honesto; `TablePager`; "Carregar mais títulos"; 4 mutações da R3 | ~45 min | `feat(financeiro): paginação padronizada e caminho até todos os títulos (B-SAN3-12b c2)` |
| 6 | R5 | `cancelCheque` no serviço e nas ações; fluxo e textos no `BaixaForm`; gate `cheques:update`; 3 casos | ~45 min | `feat(financeiro): "Cancelar o cheque" depois de desvincular, como o plano manda (B-SAN3-12b c2)` |
| 7 | R6 + R9 + R10 + R11 + R12 | mensagem após recusa definitiva; atores por permissão; `ext` sem leitura de contas; guardas F17 e F8 ampliadas | ~40 min | `fix(financeiro): mensagem honesta após recusa; guardas e atores por permissão (B-SAN3-12b c2)` |
| 8 | R13 + R14 (bateria) | ratificações e E2 no plano versionado; D-8; pendências de E2.4; índice; bateria completa em Node 20 e 22; relatório | ~40 min | `docs(registro): ciclo 2 do B-SAN3-12b — plano com ratificações e E2, pendências, bateria` |
| 9 | R14 (mutações) | 24 + 17 mutações no head final, tabela §M; `git diff --check`; push final; "pronto para a junta" na retomada | ~45 min | `test(financeiro): mutações do ciclo 2 registradas (B-SAN3-12b c2)` (só se o roteiro mudar algum teste; senão sem commit, só relatório) |
Ordem obrigatória: 1 antes de tudo (o objeto da junta tem de aceitar a `main`); 4 antes de 5; 8 e 9 por último. Se o Codex cair entre fatias, a retomada é pelo head empurrado + `## RETOMADA n`; o Gemini CLI (sem saldo hoje) e o Claude da sessão só entram para cobrir fatia que o Codex não conseguir fechar na janela, declarados no relatório.

### E2.7 Riscos e rollback
- **R3 toca um hook compartilhado com as telas legadas** (`TitlesListView.tsx:97`, sem rota desde o F13, mas compilado e testado): a forma de retorno é preservada e `finance-titles.test.tsx` (23) é a trava; rollback = `git revert` das fatias 4-5.
- **R5 acrescenta uma ação de escrita adjacente a dinheiro** (cancelar cheque): gate exato da rota, dois passos, sem corpo; a C2 revalida o gate e a C3 mede o fluxo; rollback = `git revert` da fatia 6 (volta ao estado do ciclo 1, que a junta reprovou: não é opção de merge, só de contenção).
- **O merge da `main` traz `app.css` e `appearance.registry.ts` do #464**: a fatia 1 só fecha com `check` + `smoke` verdes; qualquer vermelho ali é do #464 ou do merge, não do 12b, e vai para o relatório antes de qualquer conserto.
- **Janela do Codex (~20–50 min)**: fatias atômicas; nada parcial commitado; sem `force-push`.
- **Disco**: start de cada fatia com ≥ 8,8 GB livres (ressalva 4 do inspetor); abaixo disso, espera.

## Transcrições da E2 no plano versionado (R13(b), ciclo 2 do 12b) — linhas de transcrição; o corpo v3 acima NÃO foi editado

> Apensadas por `dev-san312b-c2-f59-opus` (DEV, Claude Opus 5.5, nível menor declarado) na FATIA 8 da E2.6, como a R13(b) manda. Nenhuma decisão nova: cada linha só transcreve o que a E2 e as ratificações já decidem.

- **§4.1 — rotas que a tela consome:** acrescenta-se `POST /cheques/:chequeId/cancel` (sem corpo; 200 com o DTO do cheque; 403 sem `cheques:update`; 404 cross-tenant; 422 `cheque_linked_unlink_first` se ainda vinculado; 422 `invalid_transition`/`cheque_not_editable`; 409 `transition_conflict`). Os 4 códigos já estão nos 32 de `finance-errors.ts` (E2, "Contrato"; R5).
- **§10 — junta:** a C3 julga também F20, F21 e F22 (ressalva 1 do inspetor do ciclo 1; o mandato do ciclo 1 já fazia isso, o plano não).
- **F4 (§8):** "lista fechada de **32**", igual, como conjunto, à do §4.1 e à seção "lista da tela" de `API_CONTRACTS.md` (Ratificação de 2026-10-26 14:35Z, item 2).

---

## Emenda E3 (ciclo 3 do 12b) — plano de resolução da reprovação do ciclo 2

> Autor: `planejador-san312b-c2rep-fable` (topo, Fable). Parecer: `agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md`. Onde divergir da E2, do plano v3 e das ratificações de 26/10, **vale a E3**; onde a E3 cala, vale a E2 e o plano.
> **Objetivo:** fechar os 3 `bloqueia` (C1r2-01, C3R2-01, C3R2-02 — este ampliado para os DOIS fechamentos perdidos) e os 2 ajustes (C1r2-02, C1r2-03) do ciclo 2, mais 2 notas de custo zero (C1r2-N3, C3R2-04), **sem tocar gate, rota, DTO, permissão, hook ou formulário**, e entregar um objeto que a junta do ciclo 3 (C1 e C3 refeitas; C2 revalidada) julgue pela régua final: só defeito de produto grave bloqueia (§C7 item 8(2)). Cada requisito tem critério, mutação que deixa vermelho e vermelho-controle no objeto `e77a5ac1`.
> **Ator:** os da E2 (Financeiro; Administrador da organização; Gestor/Auditor; Técnico de Campo sem acesso). **Fluxo origem → destino:** o da E2, inalterado. **Contrato:** nenhuma rota, DTO ou permissão muda; o backend continua byte-idêntico ao objeto (`git diff --name-only e77a5ac1 HEAD -- src prisma scripts` = 0). **Modelagem:** nenhuma.

### E3.1 Escopo do conserto (o PERMITIDO do ciclo 3; tudo o mais é PROIBIDO)
- **produto (3 arquivos):** `frontend/src/styles/app.css` — **nominal**: só as regras `.pat-kpi-row--6`, `.pat-kpi-row--6 .pat-kpi__value` e a sua `@media (max-width: 1340px)` (ao lado de `.pat-kpi-row--4/--5`, l.8032-8034) e as 3 regras espelho `.pat-ab-table th.dense-col-right, .pat-ab-row td.dense-col-right`, `…dense-col-tabular`, `.pat-ab-table th.dense-col-right .dense-sort-btn` (junto das `.pat-ab-*`, l.8044-8061); `frontend/src/modules/finance/pages/views/FinanceiroViewA.tsx` — só l.212 (classe da grade no lugar do `gridTemplateColumns` inline) e l.504 (remoção do modificador morto `pat-btn--secondary`); `COMPONENT_LIBRARY.md` — 2 linhas de registro.
- **testes (2 arquivos, já no `test:smoke`):** `frontend/tests/finance-no-money-reduce.guard.test.ts`, `frontend/tests/finance-contas-extrato.smoke.test.tsx`. **Nenhum arquivo de teste novo** (para não tocar `frontend/package.json`).
- **registro:** `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` (sempre pelo gerador), `docs/revisoes/SAN3/B-SAN3-12b-dev.md` (D-6 + seção `## Ciclo 3`), `docs/revisoes/SAN3/B-SAN3-12-plano.md` (E3 verbatim ao fim), `agent-orchestration/omega/reprovacoes/R-B-SAN3-12b-ciclo2.md` (este parecer; commit do orquestrador).
- **PROIBIDO (explícito):** `frontend/src/components/**` (inclusive `KpiStatCard.tsx`, `DenseTable.tsx`, `DenseExpandableRow.tsx`, `TablePager.tsx`), `FinanceiroPage.tsx`, `financeiro.state.ts`, `entries/**`, `titles/**`, `accounts/**`, `PermissionGuard.tsx`, `App.tsx`, `layouts/**`, `navigation/**`, `appearance/**`, `src/**`, `prisma/**`, `.github/**`, `Kpis/**`, `frontend/package.json`, lockfiles, `commissions/**`, `work-orders/**`, qualquer regra de `app.css` fora das nomeadas, qualquer componente ou modificador novo. `KpiStatCard`/`DenseTable` não precisam mudar: a classe de alinhamento já chega ao DOM e a grade é da view.
- **Merge da `main`:** hoje não é preciso (`origin/main` = `f0769739` = merge-base, medido em 2026-10-28). Se a `main` andar antes da junta, repete-se a E2.5 **com a R-E3-1** no próprio commit de merge (os 2 `comm` publicados).

### E3.2 Divergências da opção A DECLARADAS (acrescenta à E2.2, que continua inteira)
- **Indicadores a 18 px (15,5 px até 1340 px), `nowrap` + reticências, pela variante `.pat-kpi-row--6` da biblioteca** — os números da própria opção A (`financeiro-baixa-conta-conciliacao-3opcoes.reference.html` l.93 e l.433-436) — e **não** os 27 px do `.pat-kpi__value` das Telas Padronizadas, que foram desenhados para 4–5 cartões. Declarado como padrão do sistema ganhando a variante de 6 que a referência já tinha; Dashboard, Auditoria, Pátios e Despacho continuam a 27 px. Medido antes de virar regra: a 1280×720 os valores `R$ 126.958,65`/`R$ 167.692,35` cabem com +35 px de sobra (27 px: −39; 21 px: −2).
- Dinheiro à direita e tabular nas listas (VALOR, SALDO EM ABERTO, VALOR do extrato): não é divergência, é a opção A cumprida (R-E3-4).

### E3.3 Requisitos (cada um: requisito · arquivos · critério · mutação que deixa vermelho · vermelho-controle no objeto `e77a5ac1`)

**R-E3-1 — C3R2-02, ampliado: o registro do bloco sobrevive ao merge — propriedade de três vias, não conferência de cabeçalho.**
- Arquivos: `agent-orchestration/controle/pendencias.md`, `pendencias-indice.md`.
- Critério: (a) as duas seções recebem de volta, **verbatim de `fc5ead6c`** (`git show fc5ead6c:agent-orchestration/controle/pendencias.md`, com a formatação de lá), as linhas que o ramo tinha: em `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, a linha de status "FECHADA pelo B-SAN3-12b (ramo feat/web-financeiro-baixa-e-contas; vale no merge) · antes: ABERTA · dono: encerrado · bloqueia: não" no lugar da "status: ABERTA · dono: bloco do painel Financeiro (3 opções)", e a linha "critério medido no fechamento (B-SAN3-12b): …" de volta; em `P-SAN3-12-REFERENCIA-FINANCEIRO-3OPCOES-CHEQUE` (`fc5ead6c` l.11693-11695), a linha de status "FECHADA (2026-10-26, ramo do B-SAN3-12b; antes: ABERTA) · dono: B-SAN3-12b · bloqueia: não" e a linha "fechamento: em financeiro-3opcoes.reference.html, o seletor Meio de pagamento … não oferece mais check…". (b) **Propriedade, medida no head e publicada:** com `A` = linhas que o ramo acrescentou desde a base (`git diff c9a2d036 fc5ead6c -- agent-orchestration/controle/pendencias.md | grep '^+' | grep -v '^+++' | sed 's/^+//' | sort -u`) e `B` = linhas que o ramo removeu (`^-`, idem), `comm -23 A <(git show HEAD:agent-orchestration/controle/pendencias.md | sort -u)` = **vazio** e `comm -12 B <(…)` = **vazio** — descontadas só as linhas que o ciclo 2/3 editou de propósito depois de `fc5ead6c` (hoje nenhuma; se houver, lista nominal com o commit). (c) Índice regenerado (`python -I agent-orchestration/controle/gerar-indice-pendencias.py`; diff vazio no head) e as duas linhas do índice passam de `sim` a `não` na coluna "aberta". (d) `grep -c "^## P-"` igual ao do objeto (nenhum cabeçalho nasce nem morre). (e) A mesma propriedade (os 2 `comm`) publicada para `docs/revisoes/SAN3/B-SAN3-12b-dev.md` e `docs/revisoes/SAN3/B-SAN3-12-plano.md` — esperado vazio (hoje é).
- Mutação: devolver a linha "status: ABERTA" numa das duas seções → o `comm -23` acusa 1 linha e o índice muda (vermelho).
- Vermelho-controle: `e77a5ac1` → `comm -23` = **4 linhas**, `comm -12` = **2 linhas** (medido por mim, §1).

**R-E3-2 — C3R2-01: a trava do F8 enuncia a propriedade — todo token `.reduce(` fora de comentário conta, seja qual for o receptor.**
- Arquivos: `frontend/tests/finance-no-money-reduce.guard.test.ts`.
- Critério: (a) `scanFinance` registra uma ocorrência para **cada** `.reduce(` do código sem comentários, independentemente do que o precede (cadeia de identificadores, `)`, `]`, `?.`, espaço); a chave continua `arquivo::expressão-sem-espaços` e, para os 8 do inventário, é **idêntica** à de hoje; para receptor que termina em `)`/`]`, o receptor é capturado andando para trás sobre parênteses/colchetes balanceados mais a cadeia de identificadores (ex.: `items.filter((e)=>e.ok).reduce(…)`, `Object.values(m).reduce(…)`, `(list??[]).reduce(…)`, `arr[0].reduce(…)`). (b) **Segunda trava, cega à forma:** o número de tokens `.reduce(` fora de comentário em `frontend/src/modules/finance/**` é **exatamente 6** (os do inventário: `commissions.adapter` 1, `CommissionDetailDrawer` 1, `ConferenciaRemuneracoesView` 1, `RemuneracoesPage` 2, `financial-titles.adapter` 1) e em `accounts/ entries/ pages/` é **0**; um token a mais reprova com a mensagem do F8 ("o dinheiro vem do servidor"). (c) Os controles positivos ganham os 4 receptores novos mais `items?.reduce(`; o guard continua verde no head. (d) `git grep -n -E "reduce\(|\+= *[a-zA-Z.]*amount" HEAD -- frontend/src/modules/finance` = 8 = inventário (nada muda no produto). As réguas `strict`/`broad` e as formas `+=` e `x = x + …` continuam.
- Mutações (5, uma por vez, âncora única, restauro por hash): `items.filter(f).reduce((s,e)=>s+e.amount,0)` em `entries/useFinanceActions.ts`; `Object.values(m).reduce(…)`, `(list ?? []).reduce(…)` e `arr[0].reduce(…)` em `pages/views/FinanceiroViewA.tsx`; `items?.reduce(…)` em `accounts/` → o guard **vermelho** nas 5. Mais o controle que já existe: entrada falsa no inventário → vermelho.
- Vermelho-controle: o guard de `e77a5ac1` sob as 4 primeiras → **verde** (C3: `mut-C3R2-F8-filter.tap`, `mut-C3R2-F8-values.tap`; eu: `sonda.ts`, 1 de 5 acusado); com o guard novo → vermelho.

**R-E3-3 — C1r2-01: os valores em dinheiro dos 6 indicadores cabem no cartão a 1280, 1366 e 1440 — variante de 6 da biblioteca, com os números da opção A.**
- Arquivos: `frontend/src/styles/app.css` (ao lado de `.pat-kpi-row--4/--5`), `FinanceiroViewA.tsx` l.212, `COMPONENT_LIBRARY.md`, `frontend/tests/finance-contas-extrato.smoke.test.tsx`.
- Critério: (a) `app.css` ganha, nominalmente: `.pat-kpi-row--6 { grid-template-columns: repeat(6, minmax(0, 1fr)); }`; `.pat-kpi-row--6 .pat-kpi__value { font-size: 18px; letter-spacing: -0.5px; line-height: 1.15; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }`; `@media (max-width: 1340px) { .pat-kpi-row--6 .pat-kpi__value { font-size: 15.5px; letter-spacing: -0.4px; } }` — nenhuma outra regra `.pat-kpi*` muda. (b) A view usa `className="pat-kpi-row pat-kpi-row--6"` e **não** tem mais `gridTemplateColumns` inline (`git grep -n "repeat(6" HEAD -- frontend/src/modules/finance` = 0); o esqueleto de carga (`aria-busy`) usa a mesma classe. (c) **No navegador** (a C1 mede; o dev publica a sonda), com `R$ 126.958,65`, `R$ 167.692,35`, `R$ 56.999,50`, `R$ 56.330,00`, `R$ 30.520,00` nos 5 indicadores em R$, a 1280×720, 1366×768 e 1440×900: `scrollWidth <= clientWidth` do `.pat-kpi__value`, texto inteiro visível (sobra ≥ 0; esperado ≥ +33 px), nenhum cartão encobrindo o vizinho, rótulo e `hint` intactos. (d) `pattern-css-guard.test.ts` continua verde (as regras novas não contêm `*/`). (e) `COMPONENT_LIBRARY.md`: 1 linha ao lado da entrada do `KpiStatCard` registrando `.pat-kpi-row--6` (grade de 6 indicadores; valor 18 px, 15,5 px ≤ 1340, reticências).
- Teste (suíte, em `finance-contas-extrato.smoke.test.tsx`): lê `frontend/src/styles/app.css`, remove comentários como o `pattern-css-guard` e afirma que o CSS efetivo tem o bloco `.pat-kpi-row--6 .pat-kpi__value {…}` com `font-size: 18px`, `white-space: nowrap` e `text-overflow: ellipsis`, e a `@media (max-width: 1340px)` com `font-size: 15.5px`; SSR da view com o resumo carregado: o `.pat-kpi-row` tem a classe `pat-kpi-row--6` e o atributo `style` não contém `grid-template-columns`.
- Mutações (2): tirar a regra `.pat-kpi-row--6 .pat-kpi__value` do `app.css` → vermelho; devolver o `gridTemplateColumns` inline e tirar a classe → vermelho (e a sonda volta a −39 a 1280).
- Vermelho-controle: `e77a5ac1` → o teste novo vermelho (sem regra, sem classe); sonda: −39/−27 a 1280 (C1 `kpiclip-obj.json`; eu `probe-out.txt`).
- Sondas (roteiro P3 para o dev e para a C1): `C:/Users/AMP/erp-pausa-2026-10-03/plan12b-c2rep/kpi/probe.{html,mjs}` (página estática; trocar o `styles/` pelo do head) e `C:/Users/AMP/erp-pausa-2026-10-03/j12b2-c1r2/zz-j12bc1r2-kpiclip.mjs` (app real no Vite).

**R-E3-4 — C1r2-02: VALOR, SALDO EM ABERTO (títulos) e VALOR (extrato) à direita e tabulares no skin `.pat-ab-table`.**
- Arquivos: `app.css` (junto das `.pat-ab-*`), `finance-contas-extrato.smoke.test.tsx`.
- Critério: (a) 3 regras espelho das de `.dense-table` (l.2706-2713 e 2742-2744): `.pat-ab-table th.dense-col-right, .pat-ab-row td.dense-col-right { text-align: right; }`; `.pat-ab-table th.dense-col-tabular, .pat-ab-row td.dense-col-tabular { font-variant-numeric: tabular-nums; }`; `.pat-ab-table th.dense-col-right .dense-sort-btn { justify-content: flex-end; }` (o botão é `inline-flex` com `width: 100%`, l.2716-2720). Nenhuma mudança em `DenseTable.tsx`/`DenseExpandableRow.tsx`: a classe já chega ao `th` (l.121) e ao `td` (`cellClassName`, l.136-141). (b) No navegador (C1): `th`/`td` dessas colunas com `text-align: right` e `font-variant-numeric: tabular-nums` computados; as outras colunas inalteradas; linha ≤ 42 px.
- Teste (SSR, no mesmo arquivo): o `th` "VALOR" e os `td` da coluna `amount` da lista de títulos carregam `dense-col-right dense-col-tabular`; o CSS efetivo contém `.pat-ab-row td.dense-col-right` com `text-align: right`.
- Mutação: tirar a regra do `td` → vermelho. Vermelho-controle: `e77a5ac1` → vermelho (regra ausente; C1 `align-obj.json`).

**R-E3-5 — C1r2-03: o F17 acusa `scope`, `rbac` e `permission`, como a E2/R11 prometia.**
- Arquivos: `finance-contas-extrato.smoke.test.tsx` l.95.
- Critério: `TECH` passa a `/\b(tenant|tenants|role|roles|reconciled|unreconcile|payment_method|client_action_id|scope|scopes|rbac|permission|permissions)\b|\/api\/|\/financial-|\/cheques\//i`; o F17 continua verde no head (medido por mim: 0 ofensor em 670 textos); controle positivo novo: `uiTexts('<StatusPill label="Scope" />')` e `'const l = "Sem permission";'` acusam, e `'const l = "Sem permissão";'` **não** acusa (PT-BR continua livre).
- Mutação: `label="Scope"` em `TitleDetail.tsx` → F17 vermelho (hoje verde: C1 `mut-MINE-scope.log`). Vermelho-controle: `e77a5ac1` com o controle novo → vermelho.

**R-E3-6 — registro: D-6 superada, modificador morto, E3 versionada, relatório do ciclo 3.**
- Arquivos: `B-SAN3-12b-dev.md`, `FinanceiroViewA.tsx` l.504, `B-SAN3-12-plano.md`, `pendencias.md` (E3.4).
- Critério: (a) a D-6 (l.192-195) ganha, antes do texto atual, `**(SUPERADA no ciclo 2 pela E2/R5: a tela oferece "Cancelar o cheque" após o desvínculo; o texto abaixo descreve o objeto do ciclo 1.)**`; (b) `git grep -n "pat-btn--secondary" HEAD -- frontend/src` = 0 (o botão "Carregar mais títulos" fica `pat-btn`); (c) `git grep -c "Emenda E3" HEAD -- docs/revisoes/SAN3/B-SAN3-12-plano.md` ≥ 1, com a E3 apensa **verbatim** ao fim (igual, sem CR, ao trecho de `## Emenda E3` até o fim da E3.6 deste parecer); (d) as pendências de E3.4 abertas com dono e critério; índice regenerado; (e) seção `## Ciclo 3 (dev-san312b-ciclo3-sol)` no relatório, P1 por fatia, `## RETOMADA n` ao fim de cada fatia.
- Mutação: tirar a E3 do plano versionado → (c) = 0. Vermelho-controle: `e77a5ac1` → 0.

**R-E3-7 — bateria do ciclo 3 e mutações.**
- Executor: **Codex GPT-5.6 Sol** (`dev-san312b-ciclo3-sol`, identidade nova), comandos por `"C:/Program Files/Git/bin/bash.exe" -lc`, no worktree `C:/Users/AMP/w-san312b` com os `node_modules` próprios (sem junction), **sem Docker**, **uma fatia por vez**.
- Bateria (de `frontend/` para os `.tsx`; cada linha publica `tests · pass · fail · skipped`): `npm --prefix frontend run check`; `cd frontend && node --test --import tsx tests/finance-*.test.ts* tests/financial-*.adapter.test.ts tests/dense-expandable-row.test.tsx tests/finance-titles.test.tsx tests/pattern-css-guard.test.ts` (baseline do ciclo 2 **N = 112** nos arquivos do bloco; meta **M ≥ 119**: +2 R-E3-2, +2 R-E3-3, +2 R-E3-4, +1 R-E3-5); `npm --prefix frontend run test:smoke` em Node 20 **e** 22 (esperado ≥ 1475 + 7 = **1482**); `npm --prefix frontend run build`; raiz `npm run check`, `npm run lint`, `npm run build`; `git grep` do F8 = 8; os 2 `comm` da R-E3-1 vazios; `python -I …/gerar-indice-pendencias.py` → diff vazio; `git diff --check`; `git diff --name-only e77a5ac1 HEAD -- src prisma scripts` = 0 (CE-4: backend intocado; a régua do F18 continua o job `backend` da CI no head).
- Mutações (uma por vez, âncora única, restauro por hash, uma linha por mutação no relatório): as **11 novas** (R-E3-2 ×5 + inventário falso, R-E3-3 ×2, R-E3-4 ×1, R-E3-5 ×1, R-E3-6 ×1) **e** a re-execução das mutações do ciclo 2 cujos testes-dono leem arquivos que a E3 toca (`FinanceiroViewA.tsx`, os 2 arquivos de teste): R1 ×2, R2, R3 ×4, R10, R11 ×2, F11, F12, F16, F17, F19, F8/R12 ×1 e as 2 da ratificação — **17**. As outras 24 do ciclo 2 (BaixaForm, hooks, gates, registro) **não** se re-executam: a E3 não toca esses arquivos, e `git diff --name-only e77a5ac1 HEAD` (publicado) é a prova.

### E3.4 Pendências com dono (abertas no PR, com critério de encerramento)
| Pendência | Origem | Escopo | Dono | Encerra quando |
|---|---|---|---|---|
| `P-SAN3-12B-R4B-TRAVA-RODADA-SEM-TESTE` | C3R2-03 | dentro-do-bloco (lacuna de teste; o código cumpre a R4(b)) | `B-SAN3-12c` | `finance-page-live` tem um caso em que a rodada velha de `/aggregate` responde **depois** da nova e que falha sem `if (round !== roundRef.current) return;` (roteiro: sonda `C3R2-2b` em `j12b2-c3r2/`) |
| `P-SAN3-12B-KPI-PRESSED-COM-CONTA` | C1r2-N1 | dentro-do-bloco | `B-SAN3-12c` | com `accountId` definido, o indicador da organização não publica `aria-pressed=true` (ou o chip da conta assume o estado pressionado) |
| `P-SAN3-12B-PERFIL-SEM-ENTRIES-READ-VAZIO` | C1r2-N2 | dentro-do-bloco (perfil sintético; nenhum papel do catálogo) | `B-SAN3-12c` (alternativa `B-SAN3-24`) | abas `ext`/`conc` sem `financial_entries:read` mostram `StatePanel tone="forbidden"`, não um vazio (a forma da R10) |
| `P-SAN3-12B-PAGER-ROTULO-FILTRADO` | C1r2-N4 | dentro-do-bloco | `B-SAN3-12c` | com alvo aplicado e carga parcial, o `rangeLabel` deixa de misturar a contagem filtrada com o total sem filtro |
| `P-REGISTRO-MERGE-CONFERE-TRES-VIAS` | C3R2-02 ampliado (2 fechamentos perdidos num merge que "conferiu os cabeçalhos") | processo (ferramenta) | bloco de ferramentas de processo (fila pós-gate) | `scripts/` ganha a conferência de três vias de `pendencias.md` (linhas do ramo sobrevivem; linhas removidas não voltam) e o passo entra na E2.5/ata de todo merge de registro |
| (já abertas, inalteradas) `P-FINANCE-SUMMARY-ADAPTER-NUM-ZERO` · `P-SAN3-12B-MENU-ABAS-FORA-DO-GOVERNO` · `P-FINANCE-FRONT-SOMA-DINHEIRO-PRE-EXISTENTE` · `P-SAN3-12-CE4-BRACO1-NA-CI` · `P-SAN3-12B-BUSCA-TABELA-TITULOS` · `P-WEB-GUARDA-ROTA-TEXTO-SEM-ACENTO` | C1r2-A1 · C2-02 · F8 · C3-03 · C1-N6 · C1-N4 | — | como estão | — |

Notas sem pendência (ficam na ata e no relatório): C2R-01 (fechada pelo `c2rev-voto.json`, item 4 de `o_que_executei`), C2-03 (F13/Q4), C3R2-04 e C1r2-N3 (consertadas na R-E3-6), D-5/D-9 (E2.2), 18/15,5 px (E3.2).

### E3.5 Fatias para o Codex (≤ 45 min cada; uma por vez; cada fatia termina com commit, push e `## RETOMADA n` no relatório)
Regra de cada fatia: `git fetch && git status --porcelain` (vazio) e `git rev-parse HEAD` publicados no início; teste vermelho antes do código; `npm --prefix frontend run check` + teste-dono verdes antes do commit; Conventional Commits; se a janela acabar no meio, o parcial **não** é commitado (a retomada mede o `git diff` e decide, P3/P7). Nunca `nvm use`, nunca Docker, nunca `rebase`, nunca `--force`.
| # | Fatia | Alcance | Tempo | Commit |
|---|---|---|---|---|
| 1 | R-E3-1 + R-E3-6(a) | as 2 seções de volta, verbatim de `fc5ead6c`; os 2 `comm` vazios (publicados); índice regenerado; D-6 marcada superada | ~25 min | `docs(registro): restaura os 2 fechamentos do 12b perdidos no merge da main e marca a D-6 como superada (B-SAN3-12b c3)` |
| 2 | R-E3-2 | guard por token (receptor balanceado + contagem 6/0); 5 controles positivos; 5 mutações + inventário falso; `git grep` = 8 | ~35 min | `test(financeiro): a trava do F8 conta todo .reduce( fora de comentário, seja qual for o receptor (B-SAN3-12b c3)` |
| 3 | R-E3-3 + R-E3-4 + R-E3-5 + R-E3-6(b) | `app.css` (variante `--6` + 3 regras `.pat-ab-*`); classe na view; `pat-btn` liso; TECH ampliado; testes SSR/CSS; `COMPONENT_LIBRARY.md`; sonda publicada (sobra nas 3 larguras); 4 mutações | ~45 min | `fix(financeiro): indicadores a 18/15,5 px na grade de 6 e dinheiro à direita na lista, como a opção A; F17 com scope/rbac/permission (B-SAN3-12b c3)` |
| 4 | R-E3-6(c)(d)(e) + R-E3-7 | E3 verbatim no plano versionado; pendências de E3.4; índice; bateria em Node 20 e 22; 11 + 17 mutações; relatório; push final; "pronto para a junta" na retomada | ~45 min | `docs(registro): ciclo 3 do B-SAN3-12b — E3 versionada, pendências, bateria e mutações` |
Ordem obrigatória: 1 → 2 → 3 → 4 (a 1 primeiro porque é a que conflitaria se a `main` andar; a 4 por último). **Antes da fatia 1, o orquestrador empurra `c8d455dc`** (os votos do ciclo 2; 0 linha de código) para o dev partir dele. Se o Codex cair entre fatias, a retomada é pelo head empurrado + `## RETOMADA n`; o Claude da sessão cobre a fatia que faltar, declarado no relatório (`dev-san312b-ciclo3-claude`).

### E3.6 Riscos e rollback
- **`app.css` é compartilhado:** as regras são nominais e escopadas (`.pat-kpi-row--6`; `.pat-ab-table`/`.pat-ab-row` + `dense-col-*`); `renderDetail` só existe no Financeiro e `.pat-kpi-row--6` só a view A usa (medido); `pattern-css-guard` e o `test:smoke` inteiro (1475+) são a trava de regressão. Rollback: `git revert` da fatia 3.
- **Fonte do cliente:** Inter não está instalada nem embutida (medido); a geometria depende da fonte da máquina do usuário. O `nowrap + ellipsis` é a rede de segurança, e a sobra ≥ +33 px a 1280 (com o fallback desta máquina) é a margem para fontes mais largas.
- **R-E3-1 mexe em registro que a `main` também edita:** se a `main` andar antes da junta, o merge seguinte repete a E2.5 **com** os 2 `comm` — a propriedade pega a perda na hora, em vez de a junta pegá-la depois.
- **C2 terá de ser revalidada** (`FinanceiroViewA.tsx` e `pendencias.md` estão no `arquivos_medidos` dela): ≈ 30 min de Opus/Sol com os 8 comandos de `j12b2-c2rev-b/`; saída esperada **igual**, porque a E3 não toca gate, rota, menu nem aparência. Rollback: nenhum (é medição).
- **Janela do Codex (~20–50 min):** 4 fatias atômicas; nada parcial commitado; sem `force-push`. **Disco:** ≥ 8,8 GB livres no start de cada fatia (hoje 12,3).
