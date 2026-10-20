# B-SAN3-02 — Faturamento atômico e título complementar para o delta (plano inicial, modelo de TOPO)

- **Papel:** `planejador-mestre` (TOPO) · **identidade nova:** `planejador-san3-02-fable` — não achou, não desenvolveu, não vota (§C7.4-bis). **Sucessor P3** do `planejador-san3-02-astra` (Codex GPT-6 Astra), que caiu no limite de uso às 02:40Z com o plano pela metade (§0, §1 e §2 escritos). O parcial dele está preservado em `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano-parcial-codex-astra.md` (md5 `457df4969c056b19b568f6ec5cbd9173`, conferido por `md5sum` nesta sessão).
- **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter (`D-PLANEJADOR-MODELO-FABLE`); **sem fallback** — o Fable estava disponível, logo não há troca a declarar (§C7.6-bis).
- **Data:** 2026-10-19 (UTC; sessão iniciada em 2026-10-18 na hora local). **Bloco:** `B-SAN3-02` · ramo previsto `fix/faturamento-atomico-e-delta` · itens **20** e **21** do `PLANO_SAN3.md` §4.1 (l.138-139) e a linha do §5 (l.244). Bloco de **DINHEIRO**: inspetor de terreno + 3 cadeiras, **unanimidade com veto**, `critico-adversarial` antes do código; teto de 2 ciclos (§C7 item 8(2)); em toda reprovação de junta o topo audita e replaneja (§C7.4).
- **Onde medi (§A7):** **`origin/main = 3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d`** após `git fetch -q origin`, por `git show origin/main:<caminho>`, `git grep … origin/main`, `git ls-tree origin/main` e `git log origin/main`. A árvore da sessão (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`, HEAD `684e9afd`) está **atrás** da `origin/main` em 85 arquivos de `src/`, `tests/`, `prisma/` e `scripts/`; **nenhum deles** é dos caminhos deste bloco (`git diff --stat 684e9afd 3fbcaea2 -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow tests/work-order-invoicing.test.ts tests/work-order-financials.test.ts tests/financial-uow-memory.test.ts tests/financial-uow-journal-classification.test.ts scripts/run-backend-tests.mjs` = **vazio**). A única execução desta sessão foi a baseline em memória das duas suítes do módulo pelo runner (§12), declarada com essa procedência. **Não** editei o repositório, não fiz commit, não usei Docker, base viva, nem as portas 5432/6379/3000/5173/5050/8899.
- **Sucessão P3 — o que reexecutei e o que medi de novo.** Reexecutei **todos** os comandos do §0 do antecessor (F1–F13 e os greps de H1/H2/H4/H5) e comparei a saída: **13/13 fatos confirmados**, sem divergência (tabela "O que executei"). Medi **de novo**, porque o parcial não tinha: o `ci.yml` (jobs e `SUITES`), o wrapper `withTenantRls` e o lar da trava de período, o repositório Prisma de títulos (create, P2002, `findByIdForUpdate`, guard in-tx), os moldes de suíte `-db` (`financial-pay-title-atomic-db`, `financial-title-invariants-db`, `expense-sync-atomic-db`, `inventory-migration-drill-db`, `pg-barrier-scoped-db`), a migração do 04a (precedente de índice único parcial com censo), o texto das três pendências `P-Ω4-3-*`, o harness de classificação da UoW, o DTO de título, o veredito dos porteiros do #425 e do #389, a baseline N em memória e a ausência de consumidor do `POST /invoice` em `frontend/` e `mobile/`. Conclusão sem comando registrado **não** entrou como insumo; onde o antecessor afirmou sem comando (ex.: "status de 18/10"), re-medi (`status-geral.md` l.5142) antes de usar.
- **Insumos lidos (todos na ref):** `CLAUDE.md`; `docs/revisoes/SAN3/PLANO_SAN3.md` (§4.1, §5, §6, §7, §10.5); `agent-orchestration/controle/decisoes.md` (`D-Ω4-C2` l.609, `D-Ω4-C1` l.610, `REGISTRO-SAN3-CONFLITOS` l.2316-2339); `pendencias.md` l.1058-1118; `status-geral.md` l.5142-5160; os 9 arquivos de `src/modules/work-order-financials/**` e `src/modules/financial-titles/**`, os 3 de `src/modules/financial-uow/**`, `src/database/rls.ts`, `src/database/financial-period-lock.ts`; `prisma/schema.prisma` (`FinancialTitle` l.1988-2039, `WorkOrderFinancialItem` l.1845-1875, `WorkOrder` com `@@unique([tenant_id, id])`); as migrações `20260810`, `20260811`, `20260822`, `20260869`, `20260873`; os testes citados; `.github/workflows/ci.yml`; `scripts/run-backend-tests.mjs`; o plano-modelo `docs/revisoes/SAN3/B-O6R-07c-b1-ciclo2-plano.md` e o irmão de frente `B-O6R-03a-plano.md` (§8 Junta); a ata `J-B-O6R-03a-ciclo1.md`, o mandato `votos/B-O6R-03a/00-mandatos/C1.md` e os corpos em `.claude/agents/`.

## Resumo executivo

| o que o bloco fecha | causa medida na ref | remédio deste plano | depende de resposta do dono? |
|---|---|---|---|
| **Item 20 (a)** — título e carimbo fora de uma transação (`P-Ω4-3-INVOICE-ATOMIC`) | `work-order-financial.service.ts:378` cria o título por `createForWorkOrder` (transação própria do wrapper RLS, `financial-title-prisma.repository.ts:290-296`) e `:400` carimba por `markInvoiced` (outra transação, `work-order-financial-prisma.repository.ts:157-159`) | `invoice` roda **dentro da `financial-uow`**; `FinancialTitleService.createForWorkOrderInUnit(ctx, …)` cria o título por `ctx.titles`; os itens são carimbados por `ctx.workOrderItems` **na mesma transação**; contagem carimbada ≠ selecionada → a unidade aborta | só da **Q3** (ampliar a UoW com os itens; há plano B dentro da fronteira literal) |
| **Item 20 (b)** — item apagado entre a leitura e o carimbo entra no título (`P-Ω4-3-INVOICE-TOCTOU-DELETE`) | leitura `:362` sem trava; `softDelete`/`update` do item **não** têm `invoiced_at IS NULL` no WHERE (`work-order-financial-prisma.repository.ts:77,96`) — só o pré-check do serviço (`:174`, `:230`) | seleção `SELECT … FOR UPDATE` dos itens faturáveis **dentro** da unidade (a Σ vem do conjunto travado); **CAS** em `update`/`softDelete` (`AND invoiced_at IS NULL`); 0 linhas → relê → 422 `item_invoiced` ou 404 | não |
| **Item 21** — item lançado após o 1º faturamento nunca é faturado (`P-Ω4-3-REFATURAR-DELTA`) | índice `financial_titles_wo_direction_active_key` (`20260811000000:25-27`) = 1 título ativo por (tenant, OS, direção) — o mecanismo da `D-Ω4-C2` | **título complementar** para o delta, ligado ao original por `parent_title_id`; índice trocado por um que vale **só para originais** (`… AND parent_title_id IS NULL`): continua impedindo dois originais ativos, admite N complementares; cada item é faturado **uma** vez (carimbo) | **sim**: **Q1** (produto: faturar o delta — default sim do §10.5) e **Q2** (a troca honesta do índice **exige** 1 coluna anulável; "só índice" não distingue original de complementar) |

**Síntese:** os dois sítios do item 20 e a causa do item 21 **reproduzem na ref** exatamente como o plano SAN3 descreve — nenhum artefato de processo (§0). O desenho cabe nos módulos autorizados **mais** duas ampliações nominais que o §5 do SAN3 não escreveu e que este plano **pede, não assume**: (i) `src/modules/financial-uow/**` ganha o repositório de itens (a causa-raiz do §5 diz literalmente "faturamento fora do `financial-uow`"); (ii) `financial_titles` ganha **uma** coluna aditiva e anulável (`parent_title_id`) — sem ela não existe índice que "siga impedindo dois originais e admita o complementar", porque hoje as duas classes de linha são **indistinguíveis** no banco. A junta revê a `D-Ω4-C2` antes do código (`REGISTRO-SAN3-CONFLITOS`); a decisão proposta está no §2.

## O que executei (comandos → saída → veredito parcial)

| comando | saída | veredito |
|---|---|---|
| `git -C <repo> fetch -q origin && git rev-parse origin/main` | `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` | ref alvo fixada (a mesma do antecessor) |
| `md5sum …/B-SAN3-02-plano-parcial-codex-astra.md` | `457df4969c056b19b568f6ec5cbd9173` | parcial íntegro; §0–§2 presentes |
| `git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md \| grep -n 'B-SAN3-02'` e `sed -n '138,139p;244p;515,517p'` | itens 20/21 em l.138-139; linha do bloco em l.244 (fronteira, autorização do índice, 4 critérios, unanimidade + crítico, dep. `03a`); pergunta 10.5(a) em l.515-517 com default **sim** | **F1 confirmado** |
| `git show origin/main:src/modules/work-order-financials/work-order-financial.service.ts \| cat -n \| sed -n '336,423p'` | pré-check `findActiveByWorkOrder` l.357; `listInvoiceableByWorkOrder` l.362; Σ l.363; `createForWorkOrder` l.378; `markInvoiced` l.400; retorno l.409 sem comparar `invoicedItemCount` com `items.length` | **F2 confirmado** — o item 20 reproduz por leitura |
| idem, `sed -n '162,236p'` | `update` l.164-222 e `delete` l.225-236: pré-check `assertItemNotInvoiced` **antes** da escrita; repositório sem CAS | causa do TOCTOU do lado do DELETE/PATCH |
| `git show origin/main:src/modules/financial-titles/financial-title.service.ts \| cat -n \| sed -n '116,152p;338,345p'` | `createForWorkOrder` l.122-143 usa `this.assertPeriodOpen` e `this.repository.create`; não recebe contexto/tx | **F3 confirmado** |
| `git show origin/main:src/modules/work-order-financials/work-order-financial-prisma.repository.ts \| cat -n` | `PrismaExecutor = PrismaClient \| TransactionClient` l.13; `update` l.77 e `softDelete` l.96 sem `invoiced_at: null`; `markInvoiced` l.116-126 filtra `deleted_at`/`invoiced_at`; o wrapper `Rls…` abre `withTenantRls` por método l.130-160 | **F4 confirmado** |
| `git show origin/main:src/modules/financial-uow/financial-uow.ts`, `…/financial-uow-prisma.ts`, `…/index.ts` | contexto = `titles`, `entries`, `cheques`, `assertPeriodOpenShared` (l.54-65); mapas `TITLE/ENTRY/CHEQUE_REPO_KIND` com `satisfies Record<keyof …>` (l.180-220); memória = mutex por tenant + journal de before-images (l.81-136, 230-263); Prisma = 3 repositórios no mesmo `tx` (l.21-31) | **F5 confirmado**; a UoW não conhece itens de OS |
| `git show origin/main:src/modules/work-order-financials/work-order-financial.repository.ts \| cat -n` | InMemory sem `snapshotTenantForUow`/`restoreTenantForUow`; `update`/`softDelete` sem CAS de `invoicedAt` | **F6 confirmado** |
| `git show origin/main:prisma/migrations/20260811000000_add_invoicing/migration.sql \| cat -n` | l.25-27 `CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key" ON financial_titles(tenant_id, work_order_id, direction) WHERE deleted_at IS NULL AND work_order_id IS NOT NULL`; rollback comentado l.19-23 | **F7 confirmado** — o item 21 reproduz por leitura |
| `git show origin/main:prisma/schema.prisma \| cat -n \| sed -n '1988,2039p'` e `grep -n -A30 'model WorkOrderFinancialItem'` | `FinancialTitle` sem tipo/parcela/vínculo complementar; `@@unique([tenant_id, id])` l.2034; `WorkOrderFinancialItem.invoiced_at`/`title_id` l.1863-1864 com FK composta RESTRICT (no SQL) | **F7 confirmado** |
| `git show origin/main:agent-orchestration/controle/decisoes.md \| cat -n \| sed -n '609,610p;2316,2339p'` | `D-Ω4-C2` (sem competência na chave), `D-Ω4-C1` (carimbo + 422 `item_invoiced`); `REGISTRO-SAN3-CONFLITOS` item 1 manda a junta do `B-SAN3-02` rever a C2 **antes do código** e a mantém até lá | **F8 confirmado** |
| `git show origin/main:src/modules/work-order-financials/work-order-financial.routes.ts` e `…controller.ts` | `POST /work-orders/:workOrderId/invoice` sob `financial_titles:create` l.77-83; 201 `{data: DTO, invoicedTotal, currency, invoicedItemCount}`; auditoria curada `work_order.invoiced` | **F9 confirmado** |
| `git show origin/main:tests/work-order-invoicing.test.ts \| grep -n '^test('` (16) e `…work-order-financials.test.ts` (31) | nenhum teste de corrida/rollback; l.141 replay → 409; l.192 título removido + itens carimbados → 422 `nothing_to_invoice`; l.295 rota 201/409 | **F10 confirmado** |
| `MSYS_NO_PATHCONV=1 git show 'origin/main:.github/workflows/ci.yml' \| grep -n …`; `package.json`; `scripts/run-backend-tests.mjs` | job `backend`: `DATABASE_URL` + `CORE_SAAS_PERSISTENCE=memory` + `prisma migrate deploy` + `npm test`; job `backend-postgres`: `SUITES` curada (inclui as `-db` financeiras e o drill do 04a) + guard de zero skip; runner expande em JS, declara o modo, orçamento de skip = 2 | **F11 confirmado** |
| `git log -6 --oneline origin/main -- src/modules/expense-management/expense-sync.ts` | `d910c97f … (B-O6R-03a) (#425)` | **F12 confirmado**: `03a` na `main` |
| `git log -3 --oneline origin/main -- prisma/migrations/20260873000000_add_stock_movements_unique_backstops` | `ab52ec50 … (B-O6R-04a) (#389)` | **novo**: `04a` também na `main` → a trava de `prisma/` (`04a → 03a → SAN3-02`, SAN3 §6) está **livre** |
| `git show …/votos/B-O6R-03a/00c-porteiro-pos-merge-425.md`; `…/votos/B-O6R-04a/PORTEIRO-389.md` | #425: todos os itens **CONFORME** (GPT-5.6 Sol declarado); #389: **LIBERADO COM RESSALVA**, "o merge do 04a libera o 03a" | a dependência operacional do antecessor está **satisfeita** |
| `git show origin/main:agent-orchestration/docs/status-geral.md \| grep -n -E '^## .*2026-10-1[2-8]'`; `sed -n '5142,5160p'` | l.5142 "Estado em 2026-10-18 — #440 e #426 mergeados; P0 = 0 no papel"; produção não autorizada | **F13 confirmado** (o topo do arquivo é 10/10; o estado novo está no fim) |
| `git grep -n -E 'FinancialUowContext\|MemoryFinancialUowDeps\|TITLE_REPO_KIND' origin/main -- src tests` (H1) | 24 ocorrências: `financial-uow/**`, `cheques/cheque.service.ts`, `financial-entries/financial-entry.service.ts`, `tests/financial-entries.test.ts:526` (UoW falsa por Proxy), `tests/financial-uow-journal-classification.test.ts`; 4 construções de `createMemoryFinancialUnitOfWork(` | os 4 pontos de construção da UoW de memória precisam da dependência nova |
| `git grep -n 'findActiveByWorkOrder' origin/main -- src tests frontend/src` (H4) | serviço l.357; repositórios Prisma l.89/303 e InMemory l.168/204; UoW l.190/300; harness l.176/273/347 | mudar a semântica para "original ativo" alcança **só esses** consumidores |
| `git grep -n -i -E 'financial-items\|/invoice\|work-order-financial' origin/main -- frontend/src`; idem `mobile` | só `financials.service.ts` (itens) e `/finance/invoices` (NF, outra coisa); **zero** chamadas a `/invoice` | a resposta pode ganhar campo **aditivo** sem consumidor a quebrar (bate com `docs/refino/inventario-fluxos.md:463`) |
| `git show origin/main:agent-orchestration/controle/pendencias.md \| sed -n '1058,1118p'` | `P-Ω4-3-REFATURAR-DELTA`, `P-Ω4-3-INVOICE-ATOMIC`, `P-Ω4-3-INVOICE-TOCTOU-DELETE`: MÉDIA, dono `B-SAN3-02`; vizinhas `P-Ω4-3-TEST-HERMETIC`, `P-Ω4-3-CURRENCY-BRL`, `P-Ω4-3-INVOICE-LEASTPRIV` sem dono | as 3 pendências-alvo são deste bloco; as 3 vizinhas ficam **pré-existentes** |
| `git diff --name-only 684e9afd 3fbcaea2 -- src tests prisma scripts package.json package-lock.json \| wc -l` → **85**; `git diff --stat … -- <caminhos do bloco>` → **vazio** | a árvore da sessão difere da ref só fora do bloco | a baseline local vale para o módulo, com a ressalva declarada |
| `env -u CORE_SAAS_PERSISTENCE -u DATABASE_URL -u REDIS_URL node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts` (timeout 170 s) | `# tests 16 · pass 16 · fail 0 · skipped 0`, ec 0 | **N = 16** na suíte do bloco (modo memory declarado pelo runner) |
| idem `tests/work-order-financials.test.ts` | `# tests 31 · pass 31 · fail 0 · skipped 0`, ec 0 | regressão do módulo verde na base |

## §0 MEDIDO × HIPÓTESE

### 0.1 Fatos (leitura estática na ref `3fbcaea2`, salvo onde dito "executado")

| ID | MEDIDO | comando reproduzível |
|---|---|---|
| F1 | Itens 20/21, os 4 critérios, a fronteira, a autorização do índice e a dependência `03a` estão na linha do bloco; a política de produto é a pergunta 10.5(a), default sim | `git show origin/main:docs/revisoes/SAN3/PLANO_SAN3.md \| sed -n '138,139p;244p;515,517p'` |
| F2 | `invoice` = resolve OS (tx) → pré-check de título ativo (tx) → lê itens faturáveis (tx) → Σ → cria título (tx do wrapper RLS, com trava SHARED in-tx) → carimba (tx). Cinco transações; nada compara carimbados × lidos | `…work-order-financial.service.ts \| cat -n \| sed -n '339,410p'` |
| F3 | `createForWorkOrder` não recebe contexto; usa `this.assertPeriodOpen` (fora de tx) e `this.repository.create` (o wrapper RLS toma a trava SHARED e re-checa in-tx, repo Prisma l.290-296) | `…financial-title.service.ts \| sed -n '122,143p'`; `…financial-title-prisma.repository.ts \| sed -n '287,296p'` |
| F4 | `PrismaWorkOrderFinancialItemRepository` aceita `TransactionClient`; `update`/`softDelete` não filtram `invoiced_at`; `markInvoiced` filtra e devolve `count` | `…work-order-financial-prisma.repository.ts \| sed -n '13p;74,100p;112,127p'` |
| F5 | `FinancialUowContext` = `titles`, `entries`, `cheques`, `assertPeriodOpenShared`; Prisma liga os 3 ao mesmo `tx` de `withTenantRls`; memória = mutex por tenant + journal por repositório, classificado por mapa `satisfies` e julgado por harness | `…financial-uow.ts \| sed -n '54,69p;180,220p'`; `…financial-uow-prisma.ts` |
| F6 | O InMemory de itens não expõe `snapshotTenantForUow`/`restoreTenantForUow` (o de títulos expõe, l.395-404) | `git grep -n 'snapshotTenantForUow' origin/main -- src` → só títulos, lançamentos, cheques |
| F7 | Índice parcial `(tenant_id, work_order_id, direction) WHERE deleted_at IS NULL AND work_order_id IS NOT NULL`; `financial_titles` sem coluna que distinga original de complementar; `source_type`/`source_id` são de frota (enum-app) com índice parcial próprio (`20260822`) | `…20260811000000…/migration.sql \| sed -n '25,27p'`; `…schema.prisma \| sed -n '1988,2039p'`; `…financial-title.types.ts \| sed -n '25p'` |
| F8 | `D-Ω4-C2` (l.609) e `REGISTRO-SAN3-CONFLITOS` (l.2316-2339): a junta do bloco revê a C2 antes do código; até lá ela vale | `…decisoes.md \| sed -n '609p;2322,2339p'` |
| F9 | Rota sob `financial_titles:create`; 201 com DTO (sem `tenant_id`) + `invoicedTotal`/`currency`/`invoicedItemCount`; auditoria curada | `…work-order-financial.routes.ts \| sed -n '76,83p'`; `…controller.ts \| sed -n '19,44p'` |
| F10 | 16 testes de faturamento em memória, nenhum de corrida/rollback; contrato vivo: replay → 409 `already_invoiced` (l.141, l.295); título removido + itens carimbados → 422 `nothing_to_invoice` (l.192); período fechado → 422 `period_closed` (l.233) | `git show origin/main:tests/work-order-invoicing.test.ts \| grep -n '^test('` |
| F11 | CI: `backend` roda `npm test` com `DATABASE_URL` em modo memory (as `-db` fixam `prisma` elas mesmas); `backend-postgres` roda a `SUITES` curada sob guard de zero skip; o runner tem orçamento de 2 skips nomeados | `MSYS_NO_PATHCONV=1 git show 'origin/main:.github/workflows/ci.yml' \| sed -n '31,44p;125,140p;190,275p'`; `…run-backend-tests.mjs \| sed -n '67,95p'` |
| F12 | `03a` (#425, `d910c97f`) e `04a` (#389, `ab52ec50`) mergeados; porteiros CONFORME / LIBERADO COM RESSALVA | `git log -1 --oneline origin/main -- src/modules/expense-management/expense-sync.ts`; idem `-- prisma/migrations/20260873000000_add_stock_movements_unique_backstops` |
| F13 | Estado de 18/10: #440 e #426 mergeados, P0 = 0 no papel, produção não autorizada; KPI congelado (`D-GOV-PROPORCIONAL` (5)) | `…status-geral.md \| sed -n '5142,5160p'` |
| F14 | Precedentes de prova: `financial-pay-title-atomic-db` (vencedor por conexão crua com as peças do produto, perdedor real bloqueado, barreira escopada por `application_name`); `financial-title-invariants-db` (CAS de PATCH/DELETE, G7/G8); `expense-sync-atomic-db` (serviço sob papel efêmero sem BYPASSRLS); `inventory-migration-drill-db` (base própria por `CREATE DATABASE` + `migrate deploy` + up→down→re-up) | `git show origin/main:tests/<arquivo> \| sed -n '1,80p'` |
| F15 | Lar único da trava de período (`hashtext(tenant:period)`, SHARED para writers); regra da casa: **advisory antes de row lock** | `…src/database/financial-period-lock.ts \| sed -n '29,42p'` |
| F16 | `withTenantRls` = `$transaction` interativa com `set_config('app.current_tenant_id', …, true)` como 1ª instrução; sem opções de timeout | `…src/database/rls.ts \| sed -n '29,39p'` |
| F17 (executado) | Baseline em memória pelo runner, árvore `684e9afd` (caminhos do bloco idênticos à ref): invoicing **16/16**, financials **31/31** | §12 |

### 0.2 Hipóteses — cada uma com o comando que a derruba

| ID | HIPÓTESE | derrubador (dev/crítico executam antes de aceitar) |
|---|---|---|
| H1 | Acrescentar `workOrderItems` ao `FinancialUowContext` não quebra consumidor fora dos 4 pontos de construção medidos (`financial-uow.ts:392`, `tests/financial-entries.test.ts:519`, `tests/financial-uow-memory.test.ts:37`, harness `repos()`), e os imports ficam acíclicos (tipo-only estático; runtime por `import()` dinâmico, como `createFinancialUnitOfWork` já faz) | `npm run check` após a mudança; boot do app em memória (casos `[rota]` de `tests/work-order-invoicing.test.ts`) sem erro de ciclo |
| H2 | O `meta.target` do P2002 do índice renomeado continua **sem** a palavra `source`, logo `translatePersistenceError` (`financial-title-prisma.repository.ts:468-473`) devolve `work_order_already_invoiced` → 409 `already_invoiced` | T-C5-db assere `reason === "already_invoiced"` no 2º original pela rota; se cair, desambiguar pelo nome do índice (`…wo_direction…`) |
| H3 | `SELECT … FOR UPDATE` em `work_order_financial_items` funciona sob FORCE RLS com o papel de runtime (precisa de UPDATE na tabela — o papel tem DML) | T-RLS sob papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`) |
| H4 | O timeout default da transação interativa do Prisma (5 s) basta para o faturamento; nas corridas, o perdedor REAL bloqueado é liberado logo após a barreira (como o G7 "pagamento primeiro") | T-R1/T-R2 com `waitForOwnBlockedStatement` e liberação imediata; 3 execuções seguidas estáveis (§7.4) |
| H5 | A migração não pode falhar por legado: toda linha existente tem `parent_title_id = NULL`, logo o conjunto de chaves do índice novo é **o mesmo** do velho, que já era único | T-D com fixture legada (2 títulos da mesma OS, 1 deletado, antes do `migrate deploy`) → ec 0 |
| H6 | Nenhum consumidor web/mobile do `POST /invoice` → campo `parentTitleId` no DTO é aditivo e seguro | `git grep -n '/invoice' origin/main -- frontend/src mobile` = 0 (medido nesta sessão) |
| H7 | A semântica nova de `findActiveByWorkOrder` ("original ativo") alcança só serviço, repositórios, UoW e harness | grep H4 (11 ocorrências em 6 arquivos, medido) + `npm run check` |
| H8 | O drill em base própria exige CREATE DATABASE — o usuário do Postgres da CI (`postgres`) e do descartável local têm | T-D falha alto (nunca skip) sem a permissão, como o precedente do 04a |
| H9 | A ordem "advisory SHARED → `FOR UPDATE` dos itens → INSERT título → UPDATE carimbo" não inverte a ordem global de locks com `close`/`reopen` (que tomam o exclusivo e **não** travam itens) | revisão estática da C2 (DBA) contra `financial-period-lock.ts:29-30`; não há teste determinístico de deadlock — declarado em §11 |
| H10 | `prisma migrate deploy` aplica a migração nova numa única transação (sem `CONCURRENTLY`), então "CREATE índice novo → DROP índice velho" nunca deixa janela sem backstop | T-D confere `pg_indexes` só **depois** do deploy; a C2 confere o SQL (sem `CONCURRENTLY`) |

## §1 Onde mora a propriedade?

**Objetivo (ator: `finance` — e quem mais tiver `financial_titles:create` — faturando uma OS pela web, hoje por API; a tela vem no `SAN3-25`):** um faturamento produz título e carimbos **indivisíveis**; o que já foi faturado **nunca** é faturado de novo; o que ainda não foi faturado **pode** ser, num título próprio, sem tocar o anterior. Fluxo: `POST /work-orders/:id/invoice` → controller → `WorkOrderInvoicingService.invoice` → unidade financeira → Postgres.

### 1.1 Antes do remédio — fragmentada em cinco lugares, nenhum deles fecha a propriedade

| parte da propriedade | onde vive hoje (ref) | o que a fura |
|---|---|---|
| "título e carimbo juntos" | em lugar nenhum: `createForWorkOrder` (tx A) e `markInvoiced` (tx B), `service.ts:378` e `:400` | falha entre A e B → título sem lastro; o replay dá 409 e o lastro nunca nasce |
| "a Σ do título é a Σ dos itens que ele carimbou" | só na **intenção** do serviço (`:362-363` lê, `:385` grava, `:400` carimba) | DELETE/PATCH entre a leitura e o carimbo: `markInvoiced` pula o item apagado e o título fica maior que o lastro (`P-Ω4-3-INVOICE-TOCTOU-DELETE`) |
| "item faturado é imutável" | pré-check `assertItemNotInvoiced` no serviço (`:174`, `:230`), **antes** da escrita; repositório sem CAS (`prisma.repository.ts:77,96`) | pré-check passa, faturamento commita, DELETE/PATCH escreve por cima do item carimbado |
| "um título por OS e direção" | índice parcial (`20260811:25-27`) + simulação InMemory (`financial-title.repository.ts:168`) | é exatamente o que **impede** faturar o delta (`P-Ω4-3-REFATURAR-DELTA`) |
| "cada item é faturado uma vez" | `invoiced_at`/`title_id` + `markInvoiced` com `invoiced_at IS NULL` | funciona — e é o único pedaço que já mora no banco |

### 1.2 Depois do remédio — quatro âncoras, três delas no banco

| propriedade | âncora depois do bloco | evidência que a prova |
|---|---|---|
| **P1 — atomicidade:** ou título T **e** exatamente o conjunto S de carimbos persistem, ou nada deste faturamento persiste; T.amount = Σ `total_amount` congelado de S; todos com `title_id = T.id`; S ≠ ∅; mesma moeda | **uma transação** (`financial-uow`, `withTenantRls`): INSERT do título e UPDATE dos carimbos no mesmo `tx`; contagem carimbada ≠ selecionada → `throw` → rollback | T-A1/T-A2 (falha injetada), T-A3 (contagem), T-A4 (P2002 na unidade) |
| **P2 — imutabilidade do carimbado:** um item recebe no máximo um carimbo e nunca o perde; PATCH/DELETE de item carimbado falham mesmo que o pré-check tenha passado antes do faturamento | **CAS no banco**: `UPDATE … WHERE … AND invoiced_at IS NULL` em `update` e `softDelete` (0 linhas → relê → 422 `item_invoiced`); `markInvoiced` já tem o predicado | T-R1, T-R4 (corrida), T-M4b/T-M4c (memória) |
| **P3 — delta sem refaturar:** itens lançados depois de um faturamento viram **outro** título (complementar, `parent_title_id = original`), com só os itens ainda sem carimbo; o original — pago ou não — não muda | seleção `FOR UPDATE` de `invoiced_at IS NULL AND deleted_at IS NULL` dentro da unidade; `parent_title_id` gravado; `D-Ω4-C1` intacta | T-C1…T-C4, T-C6, T-C8 |
| **P4 — no máximo um ORIGINAL ativo por (tenant, OS, direção):** complementares não são porta para faturar carimbados | **índice único parcial novo** `… WHERE deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL`; simulação InMemory espelhada | T-C5 (memória), T-C5-db (23505 + 409), T-D (drill) |
| **P5 — linearizável com DELETE/PATCH:** o DELETE que commita **antes** da seleção travada deixa o item fora do título; o faturamento que vence a trava faz o DELETE posterior ser recusado. Não se promete que duas operações concorrentes ambas tenham sucesso | `SELECT … FOR UPDATE` (READ COMMITTED + EvalPlanQual: o perdedor re-avalia o WHERE contra a tupla nova) + CAS de P2 | T-R1, T-R2, T-R2b |

**Onde ela NÃO mora, dito porque existe:** (a) a OS **não** é travada — cancelar a OS durante um faturamento em voo continua uma corrida (pré-existente, `P-Ω3F6-TERMINAL-GUARD` é pré-check fora da unidade) → pendência §11; (b) o dublê de memória **não é evidência** (contrato explícito da UoW, `financial-uow.ts:31-34`): a prova de P1/P2/P5 é a suíte `-db`; (c) a moeda do título é a do 1º item (hoje igual) — `P-Ω4-3-CURRENCY-BRL` fica pré-existente.

## §2 O conflito com a `D-Ω4-C2` e as perguntas ao dono

A `D-Ω4-C2` diz: *idempotência do faturamento = unique parcial `(tenant_id, work_order_id, direction) WHERE deleted_at IS NULL` — sem competência na chave (senão duplo-faturamento entre meses)*. O **motivo** dela (não faturar o mesmo item duas vezes, em meses diferentes ou não) continua inteiro; o **mecanismo** (um título por OS) é o que impede o delta. A revisão que proponho à junta, para registrar como `D-SAN3-02-TITULO-COMPLEMENTAR` (append em `decisoes.md`, abaixo do `REGISTRO-SAN3-CONFLITOS`):

> A idempotência anti-refaturamento passa a ter **duas** âncoras: (1) **cada item é faturado uma vez** — o carimbo `invoiced_at`/`title_id` (`D-Ω4-C1`), lido sob `FOR UPDATE` e gravado na mesma transação do título; (2) **no máximo um título ORIGINAL ativo** por (tenant, OS, direção) — índice parcial `… AND parent_title_id IS NULL`. Títulos **complementares** (`parent_title_id` = o original ativo) cobrem só itens ainda sem carimbo. A competência segue como atributo, nunca na chave. Replay sem delta → 409 `already_invoiced`, como antes. A `D-Ω4-C1` não muda.

**Alternativas consideradas e por que não:** (a) **"aditar" o título original** com o delta — muta `amount` de um título possivelmente pago/baixado, exatamente o que `D-Ω4-C1` e o CHECK `paid_amount <= amount` (`20260869`) existem para proteger; (b) **competência ou `issue_date` na chave** — é o que a C2 proibiu, e dois faturamentos no mesmo dia colidiriam; (c) **`source_type='work_order_delta'`** para marcar complementares sem coluna nova — abusa de um enum de frota, e o índice de origem (`20260822`) impediria o **2º** complementar; (d) **índice por `status NOT IN ('paid','cancelled')`** — só admite o delta depois de pago; (e) **remover o índice e confiar só em trava + carimbo** — perde o backstop de banco contra dois originais, que o §5 exige nominalmente ("siga impedindo"). Sobra a coluna anulável, que é a menor instrumentação honesta.

### Q1 — produto (a pergunta 10.5(a) do SAN3, agora dirigida a este bloco)

**"Autoriza faturar os itens lançados depois do 1º faturamento da OS em títulos complementares — cobrando só os itens ainda sem carimbo, mantendo imutáveis o título original e os itens já faturados?"**
**Recomendação: sim.** Motivo: hoje é receita executada que o produto não consegue cobrar (`pendencias.md:1066`); o complementar preserva o histórico, não altera título pago e cabe no fluxo da tela futura (`SAN3-25`, "o delta faturável pela mesma ação"). O default **sim** do §10.5 é contexto; a resposta é do dono. **Depende de Q1:** o item 21 inteiro (§3 D3–D5, §5, T-C*, T-D, a decisão acima). **Se "não":** o bloco entrega só o item 20 (D1, D2 e testes T-A*/T-R*/T-M4*), o índice fica como está, `P-Ω4-3-REFATURAR-DELTA` recebe a decisão do dono e passa a "fechada por decisão", e a `D-Ω4-C2` é mantida com nota.

### Q2 — fronteira de `prisma/`: uma coluna, além do índice

**"Autoriza, além da troca do índice `financial_titles_wo_direction_active_key` já prevista no §5, a coluna aditiva e anulável `financial_titles.parent_title_id` (FK composta `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)` RESTRICT) — a única forma de o índice novo distinguir original de complementar?"**
**Recomendação: sim.** Motivo medido: nenhuma coluna existente separa as duas classes (F7); todas as alternativas sem coluna (§2 a–e) ou violam decisão registrada, ou semântica existente, ou o próprio §5. A coluna é aditiva, anulável, sem backfill (legado = NULL = original), herda a RLS, e carrega a rastreabilidade que a tela vai precisar ("complementar de T1"). **Depende de Q2:** §5 inteiro e T-D. **Se "não":** não há índice honesto que cumpra o §5; o item 21 **para** e volta ao dono com este §2 (a parada é a do precedente `03a`: "se o remédio exigir `prisma/**`, o bloco para; o dono decide").

### Q3 — fronteira de código: a UoW ganha os itens

**"Autoriza ampliar a fronteira do bloco para `src/modules/financial-uow/financial-uow.ts`, `financial-uow-prisma.ts` e `index.ts`, só para acrescentar o repositório de itens de OS ao contexto da unidade (mais o mapa de classificação e o journal de memória)?"**
**Recomendação: sim.** Motivo: a causa-raiz escrita no §5 é "faturamento **fora** do `financial-uow`"; pô-lo dentro exige que a unidade entregue um repositório de itens ligado ao mesmo `tx`. O contexto hoje não expõe `tx` de propósito (é o desenho do `B-O6R-02`). **Se "não" (plano B, dentro da fronteira literal):** o serviço de faturamento monta a transação ele mesmo com `withTenantRls` + `PrismaWorkOrderFinancialItemRepository(tx)` + `PrismaFinancialTitleRepository(tx)` + `assertPeriodOpenSharedInTx` (todos exportados), e o dublê de memória ganha um rollback local por snapshot dos dois repositórios. Cumpre P1–P5, mas duplica a receita da UoW e cria a segunda porta transacional do financeiro — a classe de drift que o `B-O6R-02` fechou. Não recomendo.

**As três perguntas são independentes:** "sim" numa não responde às outras. O que **não** depende de nenhuma: D1 (unidade), D2 (CAS), T-A*, T-R*, T-M4*, T-RLS, o harness da UoW se Q3 = sim.

## §3 Desenho mínimo

**Regra do espelho:** o módulo de referência é o próprio financeiro transacional do `B-O6R-02` — `financial-entry.service.ts:251-270` (`resolveUow` injetado, `uow.run`, `ctx.assertPeriodOpenShared` → `findByIdForUpdate` → escrita → `throw` fail-closed) e `cheque.service.ts:242-290` (`moveMoneyInUnit`). Nada de porta nova.

### D1 — `invoice` dentro da unidade (fecha o item 20 (a) e metade do (b))

`WorkOrderInvoicingService` passa a receber `resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork` (import estático do resolver, como `financial-entry.service.ts:15`; os serviços de OS e de título continuam por `import()` dinâmico, como hoje — `P-Ω4-3-TEST-HERMETIC` fica pré-existente). Algoritmo, na ordem exata (a ordem é parte do contrato de locks):

```
invoice(actor, workOrderId, body):
  wo   = resolveWorkOrder(actor, workOrderId)            // fora da unidade: 404 cross-tenant
  assertWorkOrderNotCancelled(wo)                        // fora: 422 work_order_cancelled (como hoje)
  now  = new Date(); competencia = deriveCompetencia(now)
  uow  = await this.resolveUow()
  return uow.run(actor.tenantId, async (ctx) => {
    await ctx.assertPeriodOpenShared(competencia, periodClosedError)       // 1) advisory SHARED ANTES de qualquer row lock (F15)
    items = await ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate(tenantId, wo.id)  // 2) SELECT … FOR UPDATE, ORDER BY created_at, id
    total = roundMoney(Σ items.totalAmount)
    if (items.length === 0 || total <= 0) {
      original = await ctx.titles.findActiveByWorkOrder(tenantId, wo.id, "receivable")    // 3) original ATIVO (parent_title_id IS NULL)
      throw original ? alreadyInvoicedError() : nothingToInvoiceError()   // 409 / 422 — mesmos códigos de hoje
    }
    dueDate  = parseInvoiceDueDate(body.due_date ?? body.dueDate)          // 400 invalid_due_date (mesma posição relativa de hoje)
    original = await ctx.titles.findActiveByWorkOrder(tenantId, wo.id, "receivable")
    title = await titleService.createForWorkOrderInUnit(ctx, actor, {      // 4) INSERT do título na MESMA tx
      workOrderId: wo.id, direction: "receivable", partyType: "customer",
      partyName: optionalString(wo.customerName) ?? "Cliente não informado", partyId: wo.customerId,
      amount: total, currency: items[0].currency, issueDate: now, dueDate,
      parentTitleId: original?.id,                                          // undefined → ORIGINAL; id → COMPLEMENTAR
    })
    stamped = await ctx.workOrderItems.markInvoiced({ tenantId, workOrderId: wo.id, itemIds: items.map(i => i.id), titleId: title.id, invoicedAt: now, updatedBy: actor.userId })  // 5) carimbo na MESMA tx
    if (stamped !== items.length) throw invoiceItemsChangedError()         // 6) 409 invoice_items_changed — inalcançável sob FOR UPDATE; fail-closed como cheque.service.ts:288
    return { title, totalAmount: total, currency: items[0].currency, invoicedItemCount: stamped, parentTitleId: original?.id }
  })
```

- O P2002 do índice (2º original numa corrida que passou o passo 3) estoura **dentro** da unidade → rollback completo → `isConflictError` → 409 `already_invoiced` (duck-typing já existente, `service.ts:440`).
- **Precedência de erros, declarada:** 404 → 422 `work_order_cancelled` → 422 `period_closed` → 409/422 (sem itens) → 400 `invalid_due_date` → 201. Única diferença contra hoje: `period_closed` passa a vir **antes** de `nothing_to_invoice` quando ambos valem (hoje a ordem é inversa, porque a competência só era checada no `createForWorkOrder`). Nenhum teste vivo cobre essa combinação (F10); fica em §11 como nota de contrato, não como risco de dinheiro.
- A trava SHARED de período **precede** o `FOR UPDATE` dos itens (F15: advisory antes de row lock). `createForWorkOrderInUnit` **re-chama** `ctx.assertPeriodOpenShared` por contrato próprio (o lock é reentrante na mesma sessão; o re-check é a semântica do DIN-008) — a variante não pode depender de o chamador ter travado.

### D2 — CAS nos itens (fecha a outra metade do item 20 (b) e P2)

- `PrismaWorkOrderFinancialItemRepository.update` e `.softDelete`: WHERE ganha `invoiced_at: null`. `softDeleteAllByWorkOrder` já tem (l.106).
- InMemory: `update`/`softDelete` devolvem `undefined` se `current.invoicedAt != null`.
- `WorkOrderFinancialService.update`/`.delete`: quando o repositório devolve `undefined`, **relê** por `findById`; se existe e `invoicedAt != null` → `assertItemNotInvoiced` (422 `item_invoiced`); senão 404 (como hoje). O pré-check antes da escrita **permanece** (fast-fail e precedência).
- Novo membro do contrato `WorkOrderFinancialItemRepository`: `listInvoiceableByWorkOrderForUpdate(tenantId, workOrderId)` — Prisma: `$queryRaw` `SELECT … FROM work_order_financial_items WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND deleted_at IS NULL AND invoiced_at IS NULL ORDER BY created_at, id FOR UPDATE` mapeado por `mapRecord` (precedente `findByIdForUpdate`, `financial-title-prisma.repository.ts:195-203`); InMemory: idêntico a `listInvoiceableByWorkOrder`.

### D3 — título complementar e o índice só para originais (fecha o item 21; depende de Q1 e Q2)

- `FinancialTitle`, `CreateFinancialTitleInput` e `CreateFinancialTitleForWorkOrderInput` ganham `parentTitleId?: string` (`financial-title.types.ts`). O `create` público (`POST /financial-titles`) **nunca** o popula — só o caminho de faturamento, como já ocorre com `workOrderId`.
- `FinancialTitleService.createForWorkOrderInUnit(ctx: FinancialUowContext, actor, input)`: deriva `competencia` de `input.issueDate`; `await ctx.assertPeriodOpenShared(competencia, periodClosedError)`; `return ctx.titles.create({ …mesmos campos de createForWorkOrder…, parentTitleId: input.parentTitleId })`. O `createForWorkOrder` legado **permanece** (usado pela paridade InMemory, teste l.157) e passa a **delegar** à variante numa unidade própria (`resolveUow` injetado no `FinancialTitleService`, default `createDefaultFinancialUnitOfWork`) — uma receita só.
- `PrismaFinancialTitleRepository.create` grava `parent_title_id: input.parentTitleId ?? null`; `mapRecord` lê `parent_title_id`; `findActiveByWorkOrder` ganha `parent_title_id: null` no WHERE (= **original ativo**; comentário atualizado; nome mantido para não mexer no mapa da UoW — H7).
- InMemory de títulos: `create` simula o índice **novo** (`input.workOrderId && !input.parentTitleId && findActiveByWorkOrder(...)` → 409 `work_order_already_invoiced`); `findActiveByWorkOrder` exige `parentTitleId == null`.
- Regra de escolha do pai: **o original ATIVO** no instante da unidade. Sem original ativo (OS nunca faturada, ou original removido) → o título nasce **original**; complementares anteriores continuam apontando para o original removido (RESTRICT só impede exclusão física). Terceiro delta → pai = o **original**, não o complementar anterior (sem cadeia).

### D4 — a UoW ganha os itens (depende de Q3)

- `FinancialUowContext.workOrderItems: WorkOrderFinancialItemRepository` (tipo-only import de `work-order-financials`). Prisma: `new PrismaWorkOrderFinancialItemRepository(tx)`. Memória: `MemoryFinancialUowDeps.workOrderItems: InMemoryWorkOrderFinancialItemRepository` + `journaledWorkOrderItems(base, journal)` (delegação explícita, before-image antes de cada escrita, como os três irmãos) + `WORK_ORDER_ITEM_REPO_KIND` (`create/update/softDelete/softDeleteAllByWorkOrder/markInvoiced` = `write`; `listByWorkOrder/listInvoiceableByWorkOrder/listInvoiceableByWorkOrderForUpdate/findById/findActiveByClientActionId` = `read`; `reset` = `test_reset`) com `satisfies Record<keyof WorkOrderFinancialItemRepository, UowMemberKind>` — membro novo sem classificação é TS1360.
- `InMemoryWorkOrderFinancialItemRepository` ganha `snapshotTenantForUow`/`restoreTenantForUow` (cópia de `financial-title.repository.ts:395-404`).
- `createFinancialUnitOfWork()` (memória) resolve `workOrderItems` por `import("../work-order-financials/work-order-financial.service.js")` → `getMemoryWorkOrderFinancialRepositoryForTests()` (dinâmico, sem ciclo). `index.ts` exporta `WORK_ORDER_ITEM_REPO_KIND`.
- Os 4 pontos de construção (H1) recebem a dependência; o harness `financial-uow-journal-classification.test.ts` ganha o 4º repositório em `REPOSITORIES` com `PREPARES`/`READ_RETURN_NONEMPTY`/`CALLS` (seed: 1 item ativo com `clientActionId`, 1 título para o `markInvoiced`), e o comentário de contagem passa de 13+10+10 para 13+10+10+11.

### D5 — contrato de resposta e auditoria

`WorkOrderInvoiceResult` ganha `parentTitleId?: string`. O DTO de título (`toFinancialTitleDto` e `toFinancialTitleListDto`) ganha `parentTitleId: title.parentTitleId ?? null` (valor de negócio, id do próprio tenant — mesma exposição de `workOrderId`). A auditoria `work_order.invoiced` ganha `complementary: boolean` nos metadados curados (sem valor, sem parte). Nenhum código HTTP novo além do 409 `invoice_items_changed` (inalcançável por construção; fica documentado).

### D6 — o que NÃO muda

`D-Ω4-C1` e `assertItemNotInvoiced`; `zeroActiveItems`/`hasActiveInvoicedItems`; `softDeleteAllByWorkOrder`; a permissão da rota (`P-Ω4-3-INVOICE-LEASTPRIV` fica); `createForSource`/índice de origem; `financial-entries`, `cheques`, `financial-period-closes`; `work-orders`; frontend. A OS **não** é travada (§1.2, pendência §11).

## §4 Contrato (REST `/api/v1`, sem rota nova)

| rota | quando | código / corpo |
|---|---|---|
| `POST /work-orders/:workOrderId/invoice` (perm. `financial_titles:create`) | OS do tenant, não cancelada, com itens sem carimbo e **sem** original ativo | **201** `{ data: <título ORIGINAL; parentTitleId: null>, invoicedTotal, currency, invoicedItemCount }` |
| idem | com itens sem carimbo e **com** original ativo | **201** `{ data: <título COMPLEMENTAR; parentTitleId: <id do original>>, invoicedTotal: Σ delta, currency, invoicedItemCount: n delta }` — o original não muda |
| idem | sem itens sem carimbo e **com** original ativo (replay) | **409** `already_invoiced` (como hoje) |
| idem | sem itens sem carimbo e **sem** original ativo (OS vazia; original removido com itens já carimbados) | **422** `nothing_to_invoice` (como hoje) |
| idem | OS de outra organização | **404** `work_order_not_found` (nada vaza) |
| idem | OS cancelada | **422** `work_order_cancelled` |
| idem | competência (mês de `now`) fechada | **422** `period_closed` — agora **dentro** da unidade, antes da seleção |
| idem | `due_date` inválida | **400** `invalid_due_date` |
| idem | corrida entre dois primeiros faturamentos | um **201** original; o outro **409** `already_invoiced` (P2002 na unidade → rollback) ou **422/409** pela seleção vazia |
| idem | contagem carimbada ≠ selecionada (inalcançável sob `FOR UPDATE`) | **409** `invoice_items_changed`, nada persiste |
| `PATCH`/`DELETE /work-orders/:id/financial-items/:itemId` | item carimbado, inclusive quando o carimbo venceu uma corrida com o pré-check | **422** `item_invoiced`; item intacto |
| `GET /financial-titles`, `GET /financial-titles/:id` | — | DTO ganha `parentTitleId` (null nos originais e nos legados) |
| `POST /financial-titles` | corpo com `parent_title_id`/`work_order_id` | ignorados (como `work_order_id` já é) |

## §5 Modelagem e migração (depende de Q2)

**Migração `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql`** — aditiva (ADD COLUMN anulável + FK + CHECK + CREATE INDEX) **mais a troca do índice** autorizada no §5 do SAN3 (DROP do velho **depois** de criado o novo; nenhuma linha removida, nenhum UPDATE/DELETE de dado):

```sql
-- B-SAN3-02 — título COMPLEMENTAR para o delta de itens (D-SAN3-02-TITULO-COMPLEMENTAR revê D-Ω4-C2).
-- (1) parent_title_id: NULL = título ORIGINAL (todo legado); id = COMPLEMENTAR do original ativo da mesma OS.
ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_tenant_id_parent_title_id_fkey"
  FOREIGN KEY ("tenant_id", "parent_title_id") REFERENCES "financial_titles"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- complementar só existe com OS e nunca aponta para si mesmo (legado: parent NULL → satisfaz; sem NOT VALID)
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_requires_work_order_check"
  CHECK ("parent_title_id" IS NULL OR ("work_order_id" IS NOT NULL AND "parent_title_id" <> "id"));
-- (2) o backstop de "um ORIGINAL ativo por (tenant, OS, direção)": mesmo conjunto de chaves do índice antigo
--     para todo o legado (parent NULL), logo não pode violar; complementares ficam fora do predicado.
CREATE UNIQUE INDEX "financial_titles_wo_direction_original_active_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction")
  WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL AND "parent_title_id" IS NULL;
-- (3) só depois de o novo existir (mesma transação do migrate deploy — H10): o antigo sai.
DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";
-- RLS: coluna herda a policy financial_titles_tenant_isolation (20260810); nenhuma policy nova.
-- down (provado em T-D: up → down → re-up em base própria; DUAS PONTAS como 20260869):
--   CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key" ON "financial_titles" ("tenant_id","work_order_id","direction")
--     WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL;   -- FALHA (23505) se já existir complementar ativo: aí o down
--                                                                   -- para aqui, o índice novo FICA e o resto é decisão humana (§C7.5)
--   DROP INDEX IF EXISTS "financial_titles_wo_direction_original_active_key";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_parent_requires_work_order_check";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_tenant_id_parent_title_id_fkey";
--   ALTER TABLE "financial_titles" DROP COLUMN IF EXISTS "parent_title_id";   -- perde dado se houver complementar: NUNCA automático
```

**`prisma/schema.prisma` (`FinancialTitle`):** `parent_title_id String? @db.Uuid` (scalar-only; FK e CHECK só no SQL — precedente `WorkOrderComment`, l.1877-1880) e o comentário l.2028-2030 atualizado para nomear o índice novo e o predicado `parent_title_id IS NULL`. Nenhum outro modelo muda. `npx prisma validate` ec 0; `prisma generate` regenera o cliente com a coluna.

**Decimal/timestamptz/delete lógico:** inalterados (`amount` `Decimal(12,2)`, `issue_date`/`due_date` `Timestamptz(6)`, `deleted_at`). A coluna nova é UUID anulável — sem dinheiro, sem data.

**Rollback de código:** `git revert` do squash. O código antigo lendo dados novos é **fail-closed**: `findActiveByWorkOrder` antigo encontra **qualquer** título ativo (inclusive complementar) → 409 em todo faturamento da OS; nenhum dinheiro inventado. O índice antigo só volta se não houver complementar ativo (down, ponta B) — registrado como pendência de operação em §11.

## §6 Escopo — PERMITIDO e PROIBIDO (caminhos exatos)

### 6.1 PERMITIDO

| caminho | o que muda | depende |
|---|---|---|
| `src/modules/work-order-financials/work-order-financial.service.ts` | D1 (unidade, `resolveUow` no construtor, resultado com `parentTitleId`), D2 (relê → 422/404), `invoiceItemsChangedError` | — |
| `src/modules/work-order-financials/work-order-financial.repository.ts` | contrato `listInvoiceableByWorkOrderForUpdate`; InMemory: CAS em `update`/`softDelete`, `snapshotTenantForUow`/`restoreTenantForUow` | — |
| `src/modules/work-order-financials/work-order-financial-prisma.repository.ts` | `FOR UPDATE` por `$queryRaw`; `invoiced_at: null` em `update` e `softDelete` | — |
| `src/modules/work-order-financials/work-order-financial.controller.ts` | metadado `complementary` na auditoria; resposta inalterada na forma | — |
| `src/modules/financial-titles/financial-title.service.ts` | `createForWorkOrderInUnit`; `createForWorkOrder` delega; `resolveUow` injetado | — |
| `src/modules/financial-titles/financial-title.types.ts`, `financial-title.repository.ts`, `financial-title-prisma.repository.ts`, `financial-title.dto.ts` | `parentTitleId`; simulação do índice novo; `findActiveByWorkOrder` = original; DTO | Q1·Q2 |
| `src/modules/financial-uow/financial-uow.ts`, `financial-uow-prisma.ts`, `index.ts` | D4 | **Q3** |
| `prisma/schema.prisma` (só `FinancialTitle`: 1 coluna + comentário) e `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` (novo) | §5 | **Q2** (o índice sozinho já estava autorizado pelo §5 do SAN3) |
| `tests/work-order-invoicing.test.ts`, `tests/work-order-financials.test.ts` | casos novos §7 (memória) | — |
| `tests/work-order-invoicing-atomic-db.test.ts` (novo), `tests/work-order-invoicing-migration-drill-db.test.ts` (novo) | §7 (`-db`) | — / Q2 |
| `tests/financial-uow-journal-classification.test.ts`, `tests/financial-uow-memory.test.ts`, `tests/financial-entries.test.ts` (só a dependência `workOrderItems` nas construções da UoW) | D4 | Q3 |
| `tests/financial-titles.test.ts`, `tests/financial-titles-routes.test.ts` | só se o DTO novo exigir ajuste de asserção (`parentTitleId: null`) | Q1·Q2 |
| `.github/workflows/ci.yml` | **só** as linhas `SUITES=` do job `backend-postgres`, apensando as 2 suítes `-db` novas (precedente 03a/04a) | — |
| `docs/revisoes/SAN3/B-SAN3-02-plano.md` (este plano, versionado pelo orquestrador), `B-SAN3-02-critica-r*.md`, `B-SAN3-02-dev.md` | registro do bloco | — |
| `agent-orchestration/controle/decisoes.md`, `pendencias.md`, `docs/status-geral.md`, `codex/log-execucao.md` — **APPEND only** | §10 | — |
| `.claude/agents/especialistas/jurado-san302-*.md` + espelho `.agents/agents/especialistas/` (fábrica; `sync-agent-agents.mjs --check` verde) | §9 | — |

### 6.2 PROIBIDO (nominal — fora disto, o §C4 vale por inteiro)

`src/modules/work-orders/**` · `src/modules/financial-entries/**` · `src/modules/cheques/**` · `src/modules/financial-period-closes/**` · `src/modules/financial-accounts/**` · `src/modules/service-quotes/**` · `src/database/**` (inclusive `rls.ts` e `financial-period-lock.ts`) · `src/app.ts` · `src/config/**` · qualquer outra migração (a `20260811000000` **não** se edita: histórico só-apensar) · qualquer outro modelo do `schema.prisma` · `prisma/seed*.ts` · `frontend/**` · `mobile/**` · `Kpis/**` (congelado, `D-GOV-PROPORCIONAL` (5)) · `package.json`, lockfiles, `.env*`, `infra/**`, `scripts/**` · `tests/helpers/**` (consumir, não editar; se o arnês precisar de helper novo, nasce no arquivo da suíte) · reescrever texto antigo de qualquer registro.

**Travas de mesmo arquivo (SAN3 §6):** `SAN3-20` (cheque × título, `src/modules/financial-titles/**`) e `SAN3-23` (`src/modules/work-order-financials/**`) só abrem ramo depois do merge deste; `B-O6R-12` espera a trava de `prisma/` (`SAN3-02 → SAN3-20 → B-O6R-12`). O `SAN3-25` (tela) consome `parentTitleId` e o 201 complementar.

## §7 Testes por critério — cada um com a mutação que o deixa vermelho

Convenções: **(m)** = memória, em `tests/work-order-invoicing.test.ts` ou `tests/work-order-financials.test.ts`, pelo runner em modo memory; **(db)** = `tests/work-order-invoicing-atomic-db.test.ts`, Postgres 16 **descartável**, `CORE_SAAS_PERSISTENCE=prisma` fixado pela própria suíte antes de importar a aplicação, barreira escopada por `application_name` (`tests/helpers/pg-barrier.ts`: `waitForOwnBlockedStatement`, `captureSettled`, `expectRejected`), tenant descartável por teste e teardown escopado em ordem de FK (molde: `financial-pay-title-atomic-db` e `financial-title-invariants-db`); o serviço fala com o banco por papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`, molde `expense-sync-atomic-db` A0). **Vencedor** de corrida = conexão crua com as **peças do produto na ordem do produto** (`setTenantRlsContext` → `acquirePeriodLockShared` → `SELECT … FOR UPDATE` → …), transação aberta até a barreira; **perdedor** = serviço real. Vermelho-controle: o dev aplica cada mutação **M** no `src/` de um worktree próprio, roda o teste que a cita, registra `comando → saída → veredito` e restaura com hash conferido.

### 7.1 Critério K1 — falha injetada entre o título e o carimbo → nenhum persiste

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-A1 (m)** falha no carimbo | UoW falsa por Proxy sobre a de memória (padrão `tests/financial-entries.test.ts:519-541`): `ctx.workOrderItems.markInvoiced` lança | `invoice` rejeita com o erro injetado; `titles.list` total 0; nenhum item com `invoicedAt`; `financials.list` intacta | **M1** (tirar o `uow.run`, voltar ao sequencial) · **M9** (variante usa `this.repository.create` em vez de `ctx.titles.create`) |
| **T-A2 (db)** falha no carimbo sob Postgres | mesma injeção embrulhando a `PrismaFinancialUnitOfWork` (resolver injetado); conta antes/depois | `financial_titles` do tenant = 0; `invoiced_at` e `title_id` NULL em todos os itens; nenhuma linha órfã | M1 · M9 |
| **T-A3 (m)** contagem carimbada menor | Proxy: `markInvoiced` devolve `items.length - 1` | 409 `invoice_items_changed`; rollback: 0 títulos, 0 carimbos | **M3** (remover o `if (stamped !== items.length)`) |
| **T-A4 (db)** P2002 dentro da unidade | dois primeiros faturamentos concorrentes com itens **distintos** (o 2º item é inserido após o vencedor travar o 1º): vencedor segura após o INSERT do título; perdedor real tenta | perdedor: 409 `already_invoiced`; **seus** carimbos não persistem (item 2 segue sem carimbo); 1 título | M1 (parcial) · **M5b** (índice removido sem substituto → os dois commitam) |

### 7.2 Critério K2 — item apagado durante o faturamento → fica fora do título

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-R1 (db)** faturamento vence a trava | vencedor cru: advisory SHARED → `FOR UPDATE` dos itens → (barreira) → INSERT título → UPDATE carimbo → commit; perdedor real: `financials.delete(item)` bloqueia em `work_order_financial_items` | perdedor: 422 `item_invoiced`; item **não** deletado e carimbado; `title.amount` inclui o item | **M4** (tirar `invoiced_at: null` do WHERE de `softDelete`) |
| **T-R2 (db)** DELETE vence | vencedor cru soft-deleta o item e segura; perdedor real `invoice` bloqueia no `FOR UPDATE`; vencedor commita | 201; `title.amount` = Σ **sem** o item; `invoicedItemCount` = n−1; o item deletado sem carimbo | **M2** (trocar `…ForUpdate` por `listInvoiceableByWorkOrder` sem trava: a leitura antiga inclui o item e a contagem de D1 aborta — 409 em vez de 201) |
| **T-R2b (db)** único item apagado | como T-R2 com 1 item | 422 `nothing_to_invoice`; 0 títulos | M2 (com M3 junto: título inflado — o par é o defeito original) |
| **T-R4 (db)** PATCH vence/perde | como T-R1 com `financials.update(quantity)` | 422 `item_invoiced`; `total_amount` do item inalterado; título bate | **M4′** (tirar o predicado do `update`) |
| **T-M4b (m)** corrida simulada no serviço | Proxy em `findById`: 1ª leitura devolve o item **sem** carimbo (pré-check passa), estado real carimbado | `delete`/`update` → 422 `item_invoiced` (não 404) | **M4m** (serviço devolve 404 cego quando o CAS casa 0) |
| **T-M4c (m)** CAS do repositório | `repository.softDelete`/`update` diretos num item carimbado | devolvem `undefined`; item intacto | **M4i** (InMemory sem a verificação de `invoicedAt`) |

### 7.3 Critério K3 — item lançado depois do 1º faturamento → título complementar, sem refaturar o carimbado

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-C1 (m + db)** o delta | faturar (T1) → lançar item novo → faturar | 201; `title.parentTitleId === T1.id`; `amount` = total do item novo; `invoicedItemCount` = 1; T1 inalterado (`amount`, `status`, `paidAmount`, `updatedAt`); itens antigos com `titleId = T1`, novo com `titleId = T2`; `titles.list` total 2 | **M5** (índice/simulação sem `parent_title_id IS NULL` → 409/23505) · **M13** (DTO sem `parentTitleId`) |
| **T-C2 (m)** terceiro delta | T1 → delta → T2 → delta → T3 | `T3.parentTitleId === T1.id` (não T2) | **M6** (`findActiveByWorkOrder` sem o predicado de original → acha T2) |
| **T-C3 (m)** original pago | T1 pago por `applyPayment`; delta | 201 complementar; T1 continua `paid`, `paidAmount` igual | M5 |
| **T-C4 (m)** original removido | T1 removido (`titles.delete`); item novo; faturar | 201 com `parentTitleId: null` (novo **original**); os itens de T1 continuam carimbados para T1 (não entram) | M6 (acharia T1 deletado? não — `deleted_at IS NULL`; mata quem esquecer o filtro) |
| **T-C6 (db)** dois complementares ativos | T1 → delta → T2 → delta → T3 | sem 23505; 3 linhas ativas, 2 com `parent_title_id = T1` | M5 |
| **T-C8 (m, [rota])** contrato HTTP | finance fatura, lança item, fatura de novo | 201; `body.data.parentTitleId` = id do 1º; `invoicedItemCount` = 1; auditoria `work_order.invoiced` com `complementary: true`, sem `amount`/`party_name`/`tenant` | M13 · **M14** (auditoria vaza valor) |
| **T-PREC (m)** período fechado com delta | competência fechada após T1; delta | 422 `period_closed`; nenhum T2; item novo sem carimbo | M1 (sem a unidade, o carimbo de hoje viria depois — aqui a ordem garante zero efeito) |

### 7.4 Critério K4 — refaturar o carimbado → recusado

| teste | arranjo | asserção | mata |
|---|---|---|---|
| l.141 / l.295 **(existentes)** replay sem delta | — | 409 `already_invoiced`; 1 título | — (contrato preservado) |
| l.192 **(existente)** título removido + itens carimbados | — | 422 `nothing_to_invoice` | — |
| **T-C5 (m)** paridade InMemory | `titles.createForWorkOrder` direto de um 2º **original** | 409 `work_order_already_invoiced` | **M7** (simulação do índice novo removida) |
| **T-C5-db (db)** backstop do banco | INSERT cru de 2º original ativo (parent NULL) | `23505` em `financial_titles_wo_direction_original_active_key`; pela rota: 409 `already_invoiced` (H2) | M5b · H2 |
| **T-K4b (db)** carimbo não se sobrescreve | `markInvoiced` com id já carimbado (outro título) | `count` 0; `title_id` original mantido | **M15** (tirar `invoiced_at: null` do `markInvoiced`) |

### 7.5 Transversais

| teste | asserção | mata |
|---|---|---|
| **T-RLS (db)** serviço sob papel efêmero sem BYPASSRLS | OS de outra organização → 404 e **zero** linhas tocadas em `financial_titles`/itens; complementar do tenant A invisível ao B (`findActiveByWorkOrder` do B = undefined); `FOR UPDATE` funciona sob FORCE RLS (H3) | **M16** (filtro `tenant_id` removido do `FOR UPDATE` — sob o papel sem bypass a policy ainda esconde; o teste assere a forma do SQL **e** o efeito) |
| **T-UOW** harness `[P7][workOrderItems.*]` (11 casos gerados) + `financial-uow-memory` "+1: undo-log desfaz carimbo e título juntos" | write journaled → estado idêntico após aborto; read devolve não-vazio; `reset` não exposto | **M8** (journal de itens vira delegação pura) |
| **T-D (db, drill em base própria)** 4 casos: (a) `migrate deploy` → `pg_indexes` tem `…original_active_key` e **não** tem `…active_key`; coluna, FK e CHECK em `pg_constraint`; (b) fixture **legada** antes do deploy (2 títulos da mesma OS, 1 deletado) → ec 0 (H5); (c) original + 2 complementares OK, 2º original → 23505, complementar sem OS → 23514; (d) down (SQL do comentário) → re-up, índices 1 → 1 → 1 | — | **M11** (down ausente/errado) · M5 |
| **T-ORDER (revisão estática, C2)** advisory antes de `FOR UPDATE` em D1 e na variante | — | sem teste determinístico (H9) |

**Resumo das mutações (vermelho-controle obrigatório, uma por linha no relatório do dev):** M1 · M2 · M3 · M4 · M4′ · M4m · M4i · M5 · M5b · M6 · M7 · M8 · M9 · M11 · M13 · M14 · M15 · M16 — **18**, cada uma com o teste que a mata na tabela. M3 só morre em memória (inalcançável sob `FOR UPDATE`): declarado, não escondido.

### 7.6 Bateria exata (CLAUDE.md §9, backend/raiz) — o dev registra `comando → saída → veredito` por passo

**Terreno:** worktree próprio em caminho curto (`C:/Users/AMP/w-san302`), `npm ci` próprio (**sem** junction/symlink — §C7.1-ter(c)), Postgres 16 **descartável** próprio (contêiner Linux com prefixo `san302-`, porta alta só em `127.0.0.1`, testada antes; **nunca** 5432/6379/3000/5173/5050/8899 nem a base viva), `DATABASE_URL` apontando só para ele, `migrate deploy` nele. Redis: sem serviço (`REDIS_URL` de loopback descartável), como o 03a. Sem `tail -f`; timeout em tudo.

```bash
# 0. baseline ANTES de editar src (forma canônica 3: DATABASE_URL exportada, CORE_SAAS_PERSISTENCE NÃO exportada → runner assume memory)
npm run check && npm run lint
node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts      # esperado 16/16 (N)
node scripts/run-backend-tests.mjs tests/work-order-financials.test.ts     # 31/31
DATABASE_URL=<san302> npm test                                             # suíte inteira; skipped <= 2 (orçamento nomeado)
# 1. migração (só com Q2 = sim)
npx prisma validate && DATABASE_URL=<san302> npx prisma migrate deploy && npm run db:generate
# 2. bloco (memória)
node scripts/run-backend-tests.mjs tests/work-order-invoicing.test.ts tests/work-order-financials.test.ts tests/work-order-financials-routes.test.ts
node scripts/run-backend-tests.mjs tests/financial-uow-memory.test.ts tests/financial-uow-journal-classification.test.ts tests/financial-entries.test.ts
# 3. bloco (-db) — 3 execuções seguidas, denominador constante, 0 skip
for i in 1 2 3; do DATABASE_URL=<san302> node --test --import tsx --test-reporter=tap tests/work-order-invoicing-atomic-db.test.ts; done
DATABASE_URL=<san302> node --test --import tsx --test-reporter=tap tests/work-order-invoicing-migration-drill-db.test.ts
# 4. regressões dos blocos anteriores do financeiro (B-O6R-02, Ω4-2/3/4/6/7, Ω4C PR-02)
node scripts/run-backend-tests.mjs tests/financial-titles.test.ts tests/financial-titles-routes.test.ts tests/financial-title-source.test.ts tests/financial-period-closes.test.ts tests/financial-summary.test.ts
DATABASE_URL=<san302> node --test --import tsx --test-reporter=tap tests/financial-title-invariants-db.test.ts tests/financial-pay-title-atomic-db.test.ts tests/cheque-clear-bounce-atomic-db.test.ts tests/financial-entry-reverse-restore-db.test.ts tests/financial-entry-delete-reverse-race-db.test.ts tests/financial-period-close-write-race-db.test.ts tests/pg-barrier-scoped-db.test.ts tests/financial-period-lock-guard.test.ts
# 5. vermelho-controle: para cada M do §7, aplicar no worktree, rodar o teste citado (vermelho), restaurar e conferir hash
# 6. suíte inteira, build, guardas
DATABASE_URL=<san302> npm test && npm run build
node scripts/sync-agent-agents.mjs --check
git diff --check
# 7. KPI: CONGELADO (D-GOV-PROPORCIONAL (5)) — Kpis/* NÃO se toca; `node --check Kpis/app.js` só confirma que nada mudou
```

**Estabilidade:** as duas suítes `-db` novas rodam 3× com o mesmo `# tests` e 0 skip antes de entrarem na `SUITES` do `backend-postgres` (regra medida da SAN2-2, `ci.yml` l.227-231). **Nunca** contar falha de import/compilação como vermelho funcional (lição do 03a).

**Limpeza (§C5):** ao fim de cada rodada, `docker rm -f` **só** dos contêineres `san302-*` (nunca `prune`), remoção de `dist/`, `coverage/`, `*.tsbuildinfo`; worktree só por `git worktree remove --force` depois de conferir que nenhum processo o usa. Uma linha no relatório dizendo o que saiu.

## §8 Rodada do crítico (antes do código — §5 do SAN3: "unanimidade + crítico")

O `critico-adversarial` (nível menor, Opus/Sol declarado; identidade nova `critico-san3-02-r1`, máx. 2 rodadas) ataca **este plano**, não o código. Alvos que eu mesmo aponto: (1) a escolha "pai = original ativo" quando o original foi **removido** e depois recriado (T-C4) — há cenário em que um item fica preso a um título removido e nunca é cobrado? (resposta do plano: sim, e é **intencional** — `D-Ω4-C1`: carimbo não se solta; a saída é estorno/recriação, fora do bloco); (2) a precedência `period_closed` × `nothing_to_invoice` (§3 D1); (3) o `invoice_items_changed` inalcançável — é guard ou teatro?; (4) se o `FOR UPDATE` serializa **demais** (PATCH de item não faturado esperando um faturamento longo); (5) a hipótese H2 do `meta.target`; (6) se a coluna `parent_title_id` é mesmo a menor instrumentação ou se um `CHECK` a mais (`parent` deve ter `direction` igual) cabe; (7) Q3 negada — o plano B realmente cumpre P1–P5? Saída: `docs/revisoes/SAN3/B-SAN3-02-critica-r1.md`; achados `bloqueia` viram emenda **escrita** deste plano antes do dev (nunca emenda implícita).

## §9 Junta — 3 cadeiras por competência, unanimidade com veto, inspetor antes

**Régua:** bloco de dinheiro (§C7 item 8(1)): `inspetor-de-terreno-da-junta` (Opus, frontmatter) libera; 3 cadeiras, **unanimidade**, cada voto com `gravidade` e `escopo` (§C7.1-ter(a)); ciclos 1–2 como sempre, do 3 em diante só defeito grave de produto bloqueia (§C7 item 8(2)); toda reprovação → topo audita e replaneja (§C7.4). Corpos novos pela `agente-fabrica` (identidades `jurado-san302-c1-dinheiro`, `jurado-san302-c2-banco-migracao`, `jurado-san302-c3-regressao`), versionados em `.claude/agents/especialistas/` + espelho, `sync-agent-agents.mjs --check` verde. Mandatos na **forma A com pré-voo** (`scripts/mandato-refs.sh <PR>`, `scripts/mandato-preflight.sh`), ≤ 3 itens cada, modelo P1–P7 verbatim abaixo.

| cadeira | corpos-base (na ref) | mandato (≤ 3 itens, por EXECUÇÃO própria em worktree e Postgres próprios) |
|---|---|---|
| **C1 — dinheiro** (atomicidade, imutabilidade, delta) | `guardiao-fail-closed` + `validador-mestre` | (1) sondas **próprias** de T-A1/T-A2/T-A3 e T-R1/T-R2: falha injetada e corrida, contagens e valores lidos no banco; (2) T-C1…T-C4 e T-C8: o original não muda (`amount`, `status`, `paid_amount`), o delta é só o delta, `parentTitleId` certo, auditoria sem valor; (3) refaturar recusado nas 3 portas (replay, `createForWorkOrder` direto, INSERT cru) |
| **C2 — banco e migração** | **`agente-dba-guardiao`** + `inspetor-de-arnes-concorrente` | (1) migração em base própria: up → down → re-up, fixture legada (H5), `pg_indexes`/`pg_constraint`, SQL sem `CONCURRENTLY` (H10), RLS herdada; (2) ordem global de locks (H9/T-ORDER) e `FOR UPDATE` sob papel sem BYPASSRLS (T-RLS, H3); (3) estabilidade das `-db` novas: 3 execuções, denominador constante, 0 skip, barreira escopada (nunca cluster-wide) |
| **C3 — regressão, escopo e registro** | `agente-ci-doutor` + `validador-mestre` | (1) baseline/bateria do §7.6 reexecutada e CI: check-runs **concluídos** no head, `SUITES` com as 2 suítes novas, orçamento de skip; (2) diff × §6: nada fora do PERMITIDO, `Kpis/*` intocado, `20260811000000` intocada, 18 mutações com vermelho registrado; (3) registro §10: decisão apensada, 3 pendências fechadas com evidência, pré-existentes nomeadas, ata com quem achou/planejou/desenvolveu |

**Inelegíveis (o inspetor confere por nome, nas atas da ref):** `planejador-san3-02-astra`, `planejador-san3-02-fable`, `critico-san3-02-r*`, o(s) dev(s) deste bloco, e quem corrigir qualquer achado (§C7.4-bis). Quem votou no `B-O6R-02` (a UoW) ou no `03a`/`04a` **não** é inelegível por isso — bloco diferente — mas a ata registra nome, bloco e papel anteriores.

**Pré-voo do inspetor (§C7.1-bis):** objeto = SHA completo do head do PR com check-runs **concluídos**; plano, crítica(s), relatório do dev e os 18 vermelhos-controle presentes; `sync-agent-agents.mjs --check`; corpos julgados = corpos carregados (md5 EOL-neutro); árvores sem mutação viva; Postgres descartável e papel sem bypass por executor; plano de perda de jurado; Q1/Q2/Q3 **respondidas por escrito** pelo dono (ou default declarado na ata, com a data) — sem isso o inspetor **não libera**, porque a junta votaria sobre um índice que o dono não autorizou.

**Modelo de mandato (colar verbatim no disparo de cada cadeira):**
```
Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
(head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
o arquivo. Não inicie item novo.  [P7]
```
Orquestrador: ≤ 2 cadeiras em paralelo, pausa de janela instável (P5), `00-quedas.md` (P6), commit de evidência/voto após cada conclusão. Ata: `agent-orchestration/omega/juntas/J-B-SAN3-02-ciclo<n>.md`; votos em `votos/B-SAN3-02/`.

## §10 Registro que o bloco deixa (APPEND, nunca reescrita; o dev escreve no PR, a C3 confere, o orquestrador consolida)

- **`decisoes.md`:** `D-SAN3-02-TITULO-COMPLEMENTAR` (texto do §2), abaixo do `REGISTRO-SAN3-CONFLITOS`, com a resposta do dono a Q1/Q2/Q3 (ou o default e a data) e a nota "revê a `D-Ω4-C2`; a `D-Ω4-C1` não muda".
- **`pendencias.md`:** `P-Ω4-3-INVOICE-ATOMIC`, `P-Ω4-3-INVOICE-TOCTOU-DELETE`, `P-Ω4-3-REFATURAR-DELTA` → linha nova `status: FECHADA — B-SAN3-02, PR #<n>, merge <sha>` (valor antigo preservado na linha), cada uma citando o teste que a fecha (T-A2, T-R2, T-C1). Novas: `P-SAN3-02-OS-NAO-TRAVADA` (cancelar OS durante faturamento em voo; dono: `SAN3-23` ou pós-gate), `P-SAN3-02-PRECEDENCIA-PERIOD-CLOSED` (nota de contrato, §3 D1), `P-SAN3-02-DOWN-COM-COMPLEMENTAR` (operação: o down da migração para na ponta B se houver complementar ativo), `P-SAN3-02-TELA-DELTA` (dono `SAN3-25`: mostrar complementares e `parentTitleId`). Pré-existentes declaradas com evidência de data: `P-Ω4-3-TEST-HERMETIC`, `P-Ω4-3-CURRENCY-BRL`, `P-Ω4-3-INVOICE-LEASTPRIV` (todas de 2026-08-11/29, antes do bloco).
- **`achados.jsonl`/inventário SAN3:** itens 20 e 21 → fechados com PR e SHA. **KPI:** nada (congelado).
- **`status-geral.md` e `log-execucao.md`:** entrada do bloco com quem achou (crítico/junta), quem planejou (`planejador-san3-02-astra` parcial + `planejador-san3-02-fable`), quem desenvolveu, modelos declarados, Postgres descartável usado, limpeza em 1 linha.

## §11 Riscos, rollback, o que fica fora, pendências com dono

| risco | mitigação | residual |
|---|---|---|
| R1 — `FOR UPDATE` dos itens serializa PATCH/DELETE contra um faturamento em voo | transação curta (5 passos, sem HTTP/outbox); `withTenantRls` sem budget como os irmãos | PATCH de item **não** faturado espera o faturamento terminar (ms); aceito |
| R2 — ordem de locks com `close` (H9) | advisory SHARED **primeiro**, sempre; revisão da C2 | sem teste determinístico de deadlock |
| R3 — `DROP INDEX` toma ACCESS EXCLUSIVE breve em `financial_titles` | dentro da transação do `migrate deploy`, depois do CREATE do novo; tabela pequena | janela de ms em produção (ainda não autorizada) |
| R4 — P2002 mal mapeado pelo `meta.target` (H2) | nome do índice mantém `wo_direction`; T-C5-db assere a razão | — |
| R5 — dublê de memória divergir do Postgres | harness de classificação (M8) + as `-db` são a evidência | o dublê **não** prova corrida (contrato) |
| R6 — Q1/Q2/Q3 respondidas tarde | inspetor não libera sem resposta/defaults datados; o que não depende delas (D1, D2, T-A*, T-R*, T-M4*) pode ser desenvolvido antes | item 21 espera |
| R7 — legado com `title.amount ≠ Σ itens carimbados` (produto do defeito antigo) | **fora do bloco**: este plano não corrige dado; T-D não varre legado | consulta só-leitura do DBA em ambiente autorizado, se o dono quiser (pendência opcional) |

**Rollback:** código por `git revert` do squash (fail-closed sob dados novos, §5); migração pelo down documentado, **duas pontas** (T-D prova a ponta A; a ponta B é decisão humana — §C7.5 proíbe remoção de linha automática).

**Fica fora (dito):** tela de faturar (`SAN3-25`); cheque × título (`SAN3-20`); moeda ≠ BRL (`P-Ω4-3-CURRENCY-BRL`); fábrica de memória hermética (`P-Ω4-3-TEST-HERMETIC`); least-privilege da rota; estorno/cancelamento de título complementar (segue o fluxo normal de título, `delete`/`changeStatus`, já coberto pelos testes de título); "aditar" o original (rejeitado, §2); travar a OS no faturamento; corrigir legado.

## §12 Baseline N e meta M ≥ 2N

- **N = 16** — `tests/work-order-invoicing.test.ts`, a suíte cujo comportamento o bloco muda; medido **16/16** pelo runner em modo memory na árvore `684e9afd` (caminhos do bloco byte-idênticos à `origin/main`; o dev re-mede na ref antes de editar — passo 0 da bateria). Regressão do módulo: `work-order-financials` **31/31**. Demais suítes do financeiro (contadas por `grep -c '^test('` na ref): titles 64 · titles-routes 15 · title-source 17 · title-invariants-db 16 · uow-memory 8 · uow-journal 4 · financials-routes 8 = **132**, todas a permanecer verdes.
- **M ≥ 32** nas suítes de faturamento (invoicing memória + `atomic-db` + `migration-drill-db`). Planejado: memória **12** (T-A1, T-A3, T-M4b, T-M4c, T-C1m, T-C2, T-C3, T-C4, T-C5, T-C8, T-PREC, +1 uow-memory), `-db` **11** (T-A2, T-A4, T-R1, T-R2, T-R2b, T-R4, T-C1d, T-C6, T-C5-db, T-K4b, T-RLS), drill **4** (T-D a–d) → 16 + 27 = **43 ≥ 32**; mais **11** casos gerados pelo harness para `workOrderItems`. É meta, não contagem publicada: a contagem real vem da execução do dev e é conferida pela C3. Se Q1/Q2 = não, saem T-C1…T-C8 (memória, 6), T-C1d/T-C6/T-C5-db (db, 3) e T-D (4) = −13: restam 16 + 6 + 8 = **30**, abaixo de 2N; o dev acrescenta os 2 casos de precedência de D1 (`period_closed` × `nothing_to_invoice`; `invalid_due_date` com itens) e um T-A5 (falha injetada no INSERT do título → nada persiste) para fechar ≥ 32 — ou a ata registra a redução com o número.

## Limpeza desta sessão de planejamento

Nenhum artefato no repositório. Criados **só** no scratchpad da sessão (`…/scratchpad/san302/p*.md`, `hd-*.md`) — removíveis pelo orquestrador; o plano final é este arquivo. Nenhum worktree, contêiner, porta ou banco foi criado.

## P7

Não recebi `PAUSA` nesta sessão. Se o orquestrador precisar retomar: este arquivo está completo (§0–§12); o próximo passo é do **crítico** (§8), depois as respostas do dono (§2) e só então o dev.
