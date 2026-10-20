# B-SAN3-02 — Faturamento atômico e título complementar para o delta — **plano v2** (modelo de TOPO, após a rodada 1 dos críticos)

- **Papel:** `planejador-mestre` (TOPO) · **identidade:** `planejador-san3-02-fable` — a mesma que escreveu a v1 (quem planeja replaneja; não achou, não desenvolve, não vota — §C7.4-bis). A v1 nasceu como **sucessor P3** do `planejador-san3-02-astra` (Codex GPT-6 Astra), caído às 02:40Z; a sucessão e a reexecução estão registradas na v1.
- **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter (`D-PLANEJADOR-MODELO-FABLE`); **sem fallback** nas duas versões.
- **Versões:** **v1** = `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano-v1.md` (md5 `a662546626f071de48cbaffed900a37e`, preservada por cópia antes desta sobrescrita). **v2** = este arquivo (2026-10-19). O parcial do antecessor segue em `B-SAN3-02-plano-parcial-codex-astra.md` (md5 `457df4969c056b19b568f6ec5cbd9173`).
- **O que a v2 responde:** (1) a crítica do **Opus** (`C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-02-critica-r1-opus.md`, `critico-san3-02-opus`, Opus 5.5 declarado): **VOLTA AO PLANO**, 2 `bloqueia` (A1, A2) + 6 `ajuste` próprios (A3–A8) + 1 do Gemini confirmado (G2); (2) a crítica do **Gemini** (`…/revisoes/B-SAN3-02-critica-r1.md`): APROVA COM AJUSTES, 2 achados (G1 sobre M3/T-A3, G2 sobre M16/T-RLS); (3) as **respostas do dono** (`…/planos/B-SAN3-02-respostas-do-dono.md`): *"sim para tudo"* — Q1, Q2 e Q3 = **SIM**, tratadas daqui em diante como a decisão `D-SAN3-02-TITULO-COMPLEMENTAR` (§2). A tabela achado-por-achado está logo abaixo; **nenhuma mudança de alvo é silenciosa** — cada uma está nomeada na coluna "o que mudou" e na lista "mudanças de alvo declaradas".
- **Onde medi (§A7):** **`origin/main = 3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d`** (re-`fetch` nesta rodada: inalterada), por `git show`/`git grep`/`git log` na ref. Medições **novas** desta rodada: `RBAC_MATRIX.md` l.122; `financial-title.validators.ts` l.34-55 (máquina de status: `cancelled` é status terminal, `deleted_at` segue NULL); `financial-title.service.ts` l.251/318 (`changeStatus` × `delete`); `20260803000000` l.47-65 (FK composta `(tenant_id, work_order_id) → work_orders(tenant_id, id)`; policy de itens); `20260810000000` l.50-70 (`financial_titles_tenant_id_id_key`; FK de OS; policy); `work-order.service.ts` l.1517-1536 (`cancel(zero)` → `hasActiveInvoicedItems` → `zeroActiveItems`); `checklist-prisma.repository.ts` l.1166-1200 (classificação transiente por código: `P2034`, `40P01`, `40001`, `P2028`…; `$queryRaw` chega como `P2010` com o SQLSTATE em `meta.code`); `tests/expense-sync-atomic-db.test.ts` l.29 (503 para transitórios é a forma da casa); `node_modules/@prisma/client/runtime/client.js` contém `P2034` (cliente instalado da sessão, só para confirmar que o código existe). A árvore da sessão continua atrás da ref em 85 arquivos fora do bloco; nada foi executado nesta rodada além de leituras. **Não** editei o repositório, não fiz commit, não usei Docker, base viva nem as portas 5432/6379/3000/5173/5050/8899.
- **Insumos da v1 (todos na ref):** mantidos e não repetidos aqui; ver `B-SAN3-02-plano-v1.md` (cabeçalho e "O que executei"). As tabelas de execução da v1 seguem válidas e estão reproduzidas na seção "O que executei" abaixo, com as linhas novas desta rodada no fim.

## Respostas aos críticos — rodada 1, achado por achado

| achado (crítico) | gravidade · escopo | veredito | o que mudou na v2 | mutação NOVA que deixa o teste vermelho | evidência por comando (na ref) |
|---|---|---|---|---|---|
| **A1** (Opus) — T-A4 espera 409 com 1 título; o `FOR UPDATE` leva a 201 complementar; P2002 na unidade e H2 sem teste | bloqueia · dentro | **ACEITO** | T-A4 **muda de alvo** (declarado): dois faturamentos concorrentes → vencedor 201 original, perdedor **201 complementar** com o delta, 2 títulos (§7.1). Novo **T-A4b (db)**: decisão podre injetada (`findActiveByWorkOrder` do contexto devolve `undefined` com original já commitado) → INSERT de 2º original → **P2002 dentro da unidade** → rollback → 409 `already_invoiced` — é o teste da H2 e da M5b. §4 ganha a linha "corrida → 201 + 201"; D1 decide original × complementar **depois** da trava | **M17** — decidir original/complementar (chamar `findActiveByWorkOrder`) **antes** do `FOR UPDATE` (a ordem de hoje) → T-A4 dá 409 em vez de 201 | `git show origin/main:src/modules/financial-titles/financial-title-prisma.repository.ts \| sed -n '89,94p'` (`findFirst` = comando novo em READ COMMITTED, vê o commit do vencedor); E5 da crítica (PG 16 §13.2.1: `FOR UPDATE` re-avalia o WHERE contra a versão nova) |
| **A2** (Opus) — M6 não morre em T-C2 nem T-C4 | bloqueia · dentro | **ACEITO** | Novo **T-C9 (m: a/b; db: a)**: original **removido** com complementar ainda ativo → (a) item novo → nasce **original** (`parentTitleId: null`, linha sob o predicado do índice); (b) sem item → **422** `nothing_to_invoice`. É o cenário que distingue "original ativo" de "qualquer ativo". `findActiveByWorkOrder` Prisma sem `ORDER BY` por construção (≤ 1 linha sob o índice) — dito em D3 | **M6** passa a morrer em T-C9: sob a mutação o `find`/`findFirst` acha o complementar → (a) `parentTitleId = T2`, (b) 409 | `git show origin/main:src/modules/financial-titles/financial-title.repository.ts \| sed -n '204,211p'` (`[...values()].find` = 1º inserido) |
| **A3** (Opus) — T-PREC não mata M1 | ajuste · dentro | **ACEITO** | Tabela corrigida: M1 morre em T-A1/T-A2. T-PREC ganha mutação própria | **M18** — remover `assertPeriodOpenShared` do passo 1 de D1 **e** da variante (`ctx.titles.create` não checa período) → 201 em mês fechado | `…financial-title.service.ts \| sed -n '122,126p'` (hoje o período é checado antes de criar, logo a M1 não altera o T-PREC) |
| **A4** (Opus) — deadlock `FOR UPDATE … ORDER BY` × `softDeleteAllByWorkOrder` (cancel `zero`) | ajuste · dentro | **ACEITO** | D2: `softDeleteAllByWorkOrder` passa a travar na **mesma ordem total** (`SELECT … FOR UPDATE ORDER BY created_at, id` → `UPDATE … WHERE id = ANY`), dentro da transação que o wrapper já abre; D1 mapeia `P2034`/`40P01`/`40001`/`P2028` (2 níveis, `P2010.meta.code`) → **503 `invoice_transient_conflict`** após o rollback (forma da casa). Novos **T-Z1/T-Z2 (db)** (fatura × zero, nas duas ordens) e **T-A6 (m)** (P2034 injetado → 503, nada persiste). H9/R2 reescritos | **M4″** — `softDeleteAllByWorkOrder` sem `invoiced_at IS NULL` → T-Z1 apaga item carimbado; **M20** — sem o mapeamento transiente → T-A6 recebe erro cru (500). Deadlock real **não** tem teste determinístico (dito em §11) | `…work-order-financial-prisma.repository.ts \| sed -n '104,110p'` (`updateMany` sem ordem); `…work-order.service.ts \| sed -n '1533,1535p'`; `…checklist-prisma.repository.ts \| sed -n '1171,1191p'` (precedente) |
| **A5** (Opus) — "original ativo" inclui `cancelled` por status; sem teste | ajuste · dentro (regra do pai) / pré-existente (semântica do índice, 2026-08-11) | **ACEITO** | D3 declara: ativo = `deleted_at IS NULL`, **status não entra** (semântica pré-existente do índice); o pai pode ser cancelado por status; o caminho para um original novo é **remover** o cancelado. Novo **T-C10 (m)**. Pendência de produto `P-SAN3-02-PAI-CANCELADO` (dono `SAN3-25`) | **M21** — `findActiveByWorkOrder` excluindo `status = 'cancelled'` → o delta nasce "original" → 409 pela simulação/índice (T1 cancelado ainda conta) | `…financial-title.validators.ts \| sed -n '37,44p'`; `…financial-title.service.ts \| grep -n 'async changeStatus\|async delete'` (l.251, l.318) |
| **A6** (Opus) — banco não amarra pai à mesma OS/direção; índice isenta linhas com pai | ajuste · dentro | **ACEITO** | §5: FK de **4 colunas** `(tenant_id, work_order_id, direction, parent_title_id) → (tenant_id, work_order_id, direction, id)` + índice único **auxiliar** (ampliação nominal declarada no §2, C2 ratifica); P2003 da FK nova mapeado **antes** do ramo `work_order` (`invalid_parent_title`); §1.2 rebaixa "pai é original" a **aplicação** (P3″) — não se vende mais como banco. Novo **T-D(e)** | **M22** — FK de 2 colunas → INSERT com pai de outra OS/direção/avulso passa (T-D(e) espera 23503) | `…20260810000000…/migration.sql \| sed -n '50p'` (`financial_titles_tenant_id_id_key`, alvo da FK antiga); v1 §5 |
| **A7** (Opus) — `RBAC_MATRIX.md` l.122 contradiz o comportamento novo | ajuste · dentro | **ACEITO** | `RBAC_MATRIX.md` (só a frase "idempotente por OS … replay 409" da l.122) entra no PERMITIDO com o texto novo (§6/§10); divergência registrada sob a `D-SAN3-02` (§A2) | — (registro; a C3 confere o diff da linha) | `git show origin/main:RBAC_MATRIX.md \| sed -n '122p' \| grep -o '.\{0,60\}idempotente por OS.\{0,120\}'` |
| **A8** (Opus) — replay em mês fechado passa de 409 para 422; "única diferença" era falsa | ajuste · dentro | **ACEITO** | D1 ganha o **passo 0** fora da unidade (pré-check sem trava, fast-fail): sem itens faturáveis → 409/422 **antes** do período, como hoje; `due_date` na mesma posição de hoje. A precedência fica **idêntica** à de hoje (inclusive `nothing_to_invoice` antes de `period_closed`: a "diferença" da v1 desaparece). Novos **T-PREC2/T-PREC3 (m)** | **M23** — remover o passo 0 → replay em mês fechado dá 422 `period_closed` | `…work-order-financial.service.ts \| sed -n '357,359p'` (409 antes de tudo) e `…financial-title.service.ts \| sed -n '122,125p'` (período só no create) |
| **G1** (Gemini) — M3/T-A3: código inalcançável como critério | ajuste · dentro | **CONTESTADO** | Mantidos. A guarda `stamped !== items.length` é o que torna a **M2 observável** no T-R2/T-R2b: sem `FOR UPDATE`, o perdedor lê o item vivo, cria o título e o `markInvoiced` (que espera a trava do DELETE e re-avalia `deleted_at IS NULL`) carimba n−1 → com a guarda, 409 e rollback; sem ela, **título maior que o lastro** (o defeito original). Inalcançável sob `FOR UPDATE` ≠ inútil: é defesa em profundidade com efeito e teste, como `cheque.service.ts:288`. T-A3 (memória) continua sendo o único lugar onde a M3 morre — dito. O Opus chegou à mesma conclusão (G1 "não procede") | — | `…work-order-financial-prisma.repository.ts \| sed -n '116,126p'` (`markInvoiced` filtra `deleted_at`/`invoiced_at` e devolve `count`); `…cheque.service.ts \| sed -n '285,289p'` (precedente da guarda inalcançável) |
| **G2** (Gemini, confirmado pelo Opus) — M16/T-RLS: forma em vez de comportamento | ajuste · dentro | **ACEITO** | **M16 removida** (mutante equivalente: `work_order_id` já fixa a organização pela FK composta + `id` PK). T-RLS fica como prova de **comportamento** (H3 e controle positivo do arnês: papel sem BYPASSRLS, 404 cross-tenant, zero linhas) **sem mutação própria** — declarado | — | `…20260803000000…/migration.sql \| sed -n '50,52p'` (FK `(tenant_id, work_order_id) → work_orders(tenant_id, id)`) |

**Mudanças de alvo declaradas (nenhuma silenciosa):** (1) T-A4: 409/1 título → **201 complementar/2 títulos**; (2) §4: linha da corrida reescrita; (3) §3 D1: decisão original × complementar **depois** do `FOR UPDATE`; passo 0 fora da unidade; "precedência idêntica à de hoje" substitui "única diferença"; (4) §5: FK de 2 → **4 colunas** + índice auxiliar + mapeamento P2003; (5) §1.2: P3″ ("pai é original") rebaixada a aplicação; (6) M16 sai; M4″, M17, M18, M20, M21, M22, M23 entram → **24 mutações**; (7) **11 testes novos** (T-A4b, T-A6, T-Z1, T-Z2, T-C9a, T-C9b, T-C9d, T-C10, T-PREC2, T-PREC3, T-D(e)) → **38 nomeados** (+11 gerados); (8) `RBAC_MATRIX.md` l.122 entra no PERMITIDO; (9) código novo 503 `invoice_transient_conflict`; (10) `softDeleteAllByWorkOrder` muda de forma (trava ordenada), não de contrato.

**Saldo da rodada 1:** 10 achados — **9 aceitos** (A1–A8, G2) e **1 contestado** (G1), com a evidência por comando na última coluna.

## Resumo executivo

| o que o bloco fecha | causa medida na ref | remédio (v2) | decisão |
|---|---|---|---|
| **Item 20 (a)** — título e carimbo fora de uma transação (`P-Ω4-3-INVOICE-ATOMIC`) | `work-order-financial.service.ts:378` cria o título por `createForWorkOrder` (transação própria do wrapper RLS, `financial-title-prisma.repository.ts:290-296`) e `:400` carimba por `markInvoiced` (outra transação, `work-order-financial-prisma.repository.ts:157-159`) | `invoice` roda **dentro da `financial-uow`**; `FinancialTitleService.createForWorkOrderInUnit(ctx, …)` cria o título por `ctx.titles`; os itens são carimbados por `ctx.workOrderItems` **na mesma transação**; contagem carimbada ≠ selecionada → a unidade aborta; P2002/P2034 dentro da unidade → rollback e 409/503 | `D-SAN3-02` (3) = SIM |
| **Item 20 (b)** — item apagado entre a leitura e o carimbo entra no título (`P-Ω4-3-INVOICE-TOCTOU-DELETE`) | leitura `:362` sem trava; `softDelete`/`update` do item **não** têm `invoiced_at IS NULL` no WHERE (`work-order-financial-prisma.repository.ts:77,96`) — só o pré-check do serviço (`:174`, `:230`) | seleção `SELECT … FOR UPDATE ORDER BY created_at, id` dos itens faturáveis **dentro** da unidade (a Σ vem do conjunto travado); **CAS** em `update`/`softDelete` (`AND invoiced_at IS NULL`); 0 linhas → relê → 422 `item_invoiced` ou 404; `softDeleteAllByWorkOrder` trava na **mesma ordem** (A4) | — |
| **Item 21** — item lançado após o 1º faturamento nunca é faturado (`P-Ω4-3-REFATURAR-DELTA`) | índice `financial_titles_wo_direction_active_key` (`20260811000000:25-27`) = 1 título ativo por (tenant, OS, direção) — o mecanismo da `D-Ω4-C2` | **título complementar** para o delta, ligado ao original por `parent_title_id` (FK de 4 colunas: mesma organização, OS e direção); índice trocado por um que vale **só para originais** (`… AND parent_title_id IS NULL`): continua impedindo dois originais ativos, admite N complementares; cada item é faturado **uma** vez (carimbo) | `D-SAN3-02` (1) e (2) = SIM |

**Síntese:** os dois sítios do item 20 e a causa do item 21 **reproduzem na ref** (§0); as duas críticas da rodada 1 confirmaram todas as premissas de código (Opus: "todas as linhas citadas batem com `3fbcaea2`") e acharam defeitos **na prova**, não no desenho: um teste de corrida com desfecho contrário ao próprio desenho (A1) e uma mutação sem teste que a mate (A2), mais sete ajustes de contrato, lock, semântica e registro. A v2 corrige cada um com teste e mutação nomeados (tabela acima). As três ampliações que a v1 pedia foram **decididas** pelo dono (`D-SAN3-02-TITULO-COMPLEMENTAR`, §2) e deixam de ser condicionais; a única ampliação nova da v2 — o índice único auxiliar que a FK de 4 colunas exige (A6) — está declarada no §2 e no §5 para a cadeira de banco ratificar.
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
| **(v2)** `git fetch -q origin && git rev-parse origin/main` | `3fbcaea2…` (inalterada) | mesma ref nas duas rodadas |
| **(v2)** `git show origin/main:RBAC_MATRIX.md \| sed -n '122p' \| grep -o '.\{0,60\}idempotente por OS.\{0,120\}'` | "idempotente por OS (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL` → replay 409 already_invoiced)" | **A7 procede**: fonte nº 2 descreve o índice velho |
| **(v2)** `git show origin/main:src/modules/financial-titles/financial-title.validators.ts \| sed -n '34,55p'`; `…financial-title.service.ts \| grep -n 'async changeStatus\|async delete'` | `cancelled` é status terminal via `changeStatus` (l.251); `delete` (l.318) é o único que seta `deleted_at` | **A5 procede**: cancelado por status segue "ativo" para o índice (semântica de 2026-08-11) |
| **(v2)** `git show origin/main:prisma/migrations/20260803000000_add_work_order_financial_items/migration.sql \| sed -n '47,65p'` | FK composta `(tenant_id, work_order_id) → work_orders(tenant_id, id)`; policy por `app.current_tenant_id` | **G2 procede**: `tenant_id` no `FOR UPDATE` é mutante equivalente |
| **(v2)** `git show origin/main:prisma/migrations/20260810000000_add_financial_titles/migration.sql \| sed -n '50,70p'` | `financial_titles_tenant_id_id_key`; sem chave em `(tenant_id, work_order_id, direction, id)` | **A6**: a FK de 4 colunas precisa do índice auxiliar |
| **(v2)** `git show origin/main:src/modules/work-orders/work-order.service.ts \| sed -n '1517,1536p'`; `…work-order-financial-prisma.repository.ts \| sed -n '104,110p'` | `cancel(zero)` → `zeroActiveItems` → `updateMany` multi-linha sem ordem, em tx própria | **A4 procede**: escritor multi-linha sem ordem total |
| **(v2)** `git show origin/main:src/modules/checklists/checklist-prisma.repository.ts \| sed -n '1166,1200p'`; `git show origin/main:tests/expense-sync-atomic-db.test.ts \| sed -n '29p'` | transiente por **código** (`P2034`, `40P01`, `40001`, `P2028`…; `P2010.meta.code` para `$queryRaw`); 503 para transitórios no 03a | molde do mapeamento de D1 |
| **(v2)** `grep -rl 'P2034' node_modules/@prisma/client/runtime/*.js` (árvore da sessão, só confirmação) | `client.js`, `wasm-compiler-edge.js` | o código existe no cliente instalado |

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
| F18 (v2) | `RBAC_MATRIX.md` l.122 descreve "idempotente por OS (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL` → replay 409 already_invoiced)" — fonte nº 2 do §A1, acima da implementação | `git show origin/main:RBAC_MATRIX.md \| sed -n '122p' \| grep -o '.\{0,60\}idempotente por OS.\{0,120\}'` |
| F19 (v2) | `cancelled` é **status** terminal (`open/scheduled/in_dispute → cancelled`; `paid`/`partially_paid` não cancelam), via `changeStatus`; `deleted_at` segue NULL; só `delete` (lógico) tira a linha do índice | `…financial-title.validators.ts \| sed -n '34,44p'`; `…financial-title.service.ts \| sed -n '251p;318p'` |
| F20 (v2) | Itens: FK composta `(tenant_id, work_order_id) → work_orders(tenant_id, id)`; policy `work_order_financial_items_tenant_isolation` USING/WITH CHECK por `app.current_tenant_id`; `work_orders.id` é PK → `work_order_id = X` já fixa a organização (base do G2) | `…20260803000000_add_work_order_financial_items/migration.sql \| sed -n '47,65p'` |
| F21 (v2) | Títulos: `financial_titles_tenant_id_id_key` (alvo da FK antiga), FK `(tenant_id, work_order_id) → work_orders`, ENABLE+FORCE RLS; nenhuma chave única em `(tenant_id, work_order_id, direction, id)` (a FK de 4 colunas do §5 precisa criá-la) | `…20260810000000_add_financial_titles/migration.sql \| sed -n '50,70p'` |
| F22 (v2) | `cancel(zero)` → `hasActiveInvoicedItems` (422 se houver faturado) → `zeroActiveItems` → `softDeleteAllByWorkOrder` = `updateMany` multi-linha **sem ordem**, em transação própria do wrapper RLS | `…work-order.service.ts \| sed -n '1517,1536p'`; `…work-order-financial-prisma.repository.ts \| sed -n '104,110p;154,156p'` |
| F23 (v2) | Precedente de falha transiente por **código** (dois níveis: `$queryRaw` chega como `P2010` com SQLSTATE em `meta.code`): `P2034`, `40P01`, `40001`, `P2028`, `55P03`…; o 03a responde **503** a transitórios | `…src/modules/checklists/checklist-prisma.repository.ts \| sed -n '1166,1200p'`; `git show origin/main:tests/expense-sync-atomic-db.test.ts \| sed -n '29p'` |

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
| H2 (v2) | — derrubador corrigido (A1): o P2002 na unidade **não** é alcançável pelo caminho do produto (dois faturamentos se serializam no `FOR UPDATE`); quem o exercita é o **T-A4b** (decisão podre injetada) e o INSERT cru do T-C5-db | T-A4b assere `reason === "already_invoiced"` e rollback; T-C5-db assere `23505` no índice novo |
| H9 (v2) | A ordem global é **advisory SHARED → row locks em ordem total `(created_at, id)`** em **todo** escritor multi-linha de itens (faturamento e `softDeleteAllByWorkOrder`); `update`/`softDelete` travam 1 linha; `markInvoiced` só toca linhas já travadas pela própria unidade; `close`/`reopen` tomam o exclusivo e não travam itens. Deadlock entre faturamento e `zero` deixa de ter ciclo por construção; o residual (qualquer 40P01/40001) vira **503** após rollback | revisão estática da C2 + T-Z1/T-Z2 (sem ciclo) + T-A6 (mapeamento). Não há teste determinístico de deadlock — declarado em §11 |
| H11 (v2) | O pré-check do passo 0 (sem trava) decide **só** o fast-fail e a precedência; a unidade re-decide tudo sobre dado travado — nenhum desfecho de dinheiro depende do passo 0 | T-A4 (passo 0 viu i1 e i2; a unidade cobrou só i2), T-Z2 (passo 0 viu itens; a unidade viu zero → 422), M23 (sem passo 0 só a precedência muda) |

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

### 1.2 Depois do remédio — onde cada parte passa a morar (v2: a A6 rebaixou uma afirmação; está dito o que é banco e o que é aplicação)

| propriedade | âncora depois do bloco | onde mora | evidência |
|---|---|---|---|
| **P1 — atomicidade:** ou título T **e** exatamente o conjunto S de carimbos persistem, ou nada deste faturamento persiste; T.amount = Σ `total_amount` congelado de S; todos com `title_id = T.id`; S ≠ ∅; mesma moeda | **uma transação** (`financial-uow`, `withTenantRls`): INSERT do título e UPDATE dos carimbos no mesmo `tx`; contagem carimbada ≠ selecionada → `throw` → rollback; P2002/P2034 dentro da unidade → rollback | banco (transação) | T-A1/T-A2 (falha injetada), T-A3 (contagem), T-A4b (P2002 na unidade), T-A6 (P2034) |
| **P2 — imutabilidade do carimbado:** um item recebe no máximo um carimbo e nunca o perde; PATCH/DELETE de item carimbado falham mesmo que o pré-check tenha passado antes do faturamento | **CAS no banco**: `UPDATE … WHERE … AND invoiced_at IS NULL` em `update`, `softDelete`, `softDeleteAllByWorkOrder` e `markInvoiced` (0 linhas → relê → 422 `item_invoiced`) | banco (predicado + EvalPlanQual) | T-R1, T-R4, T-Z1 (corrida), T-M4b/T-M4c (memória), T-K4b |
| **P3 — delta sem refaturar:** itens lançados depois de um faturamento viram **outro** título (complementar), com só os itens ainda sem carimbo; o original — pago, cancelado ou não — não muda | seleção `FOR UPDATE` de `invoiced_at IS NULL AND deleted_at IS NULL` **dentro** da unidade; `parent_title_id` gravado; `D-Ω4-C1` intacta | banco (carimbo + trava) | T-C1…T-C4, T-C6, T-C8, T-C10 |
| **P3′ — o pai do complementar é da MESMA organização, OS e direção** | FK composta de **4 colunas** `(tenant_id, work_order_id, direction, parent_title_id) → financial_titles(tenant_id, work_order_id, direction, id)` RESTRICT (A6) | banco (FK) | T-D(e) |
| **P3″ — o pai é um ORIGINAL (nunca um complementar), e é o original ATIVO no instante da unidade** | regra de escolha do pai em D1/D3 (`findActiveByWorkOrder` = `parent_title_id IS NULL AND deleted_at IS NULL`); **não** há FK para "pai é original" (FK não aceita índice parcial como alvo) | **aplicação** + testes — dito, não vendido como banco | T-C2, T-C9a/b/d |
| **P4 — no máximo um ORIGINAL ativo por (tenant, OS, direção):** complementares não são porta para faturar carimbados (o carimbo é quem fecha isso, P2/P3) | **índice único parcial novo** `… WHERE deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL`; simulação InMemory espelhada | banco (índice) | T-C5 (memória), T-C5-db (23505), T-A4b (P2002 na unidade → 409), T-D |
| **P5 — linearizável com DELETE/PATCH/cancel(zero) e com outro faturamento:** o DELETE que commita **antes** da seleção travada deixa o item fora; o faturamento que vence a trava faz o DELETE posterior ser recusado; dois faturamentos concorrentes na mesma OS se serializam pela trava dos itens e o segundo cobra só o delta (A1) | `SELECT … FOR UPDATE ORDER BY created_at, id` (READ COMMITTED + EvalPlanQual) + CAS de P2; a **mesma ordem total** de travas em todo escritor multi-linha de itens (A4) | banco (row lock) | T-R1, T-R2, T-R2b, T-A4, T-Z1, T-Z2 |

**Onde ela NÃO mora, dito porque existe:** (a) a OS **não** é travada — cancelar a OS durante um faturamento em voo continua uma corrida (pré-existente, `P-Ω3F6-TERMINAL-GUARD` é pré-check fora da unidade) → pendência §11; (b) o dublê de memória **não é evidência** (contrato explícito da UoW, `financial-uow.ts:31-34`): a prova de P1/P2/P5 é a suíte `-db`; (c) a moeda do título é a do 1º item — `P-Ω4-3-CURRENCY-BRL` fica pré-existente; (d) "pai é original" é aplicação (P3″) — a única parte da P3 que o banco não amarra.

## §2 As decisões do dono (`D-SAN3-02-TITULO-COMPLEMENTAR`) e a revisão da `D-Ω4-C2`

**Respondido em 2026-10-19** (`C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-respostas-do-dono.md`), palavras literais do dono: *"sim para tudo"* — **Q1 = SIM, Q2 = SIM, Q3 = SIM**. Da v2 em diante as três perguntas são **decisões**, tratadas como fato; nada aqui é condicional a elas. O texto a apensar em `agent-orchestration/controle/decisoes.md` (no PR do bloco ou no de registro), abaixo do `REGISTRO-SAN3-CONFLITOS`:

> **`D-SAN3-02-TITULO-COMPLEMENTAR` (decisão do dono, 2026-10-19 — "sim para tudo").** (1) **Produto:** os itens lançados depois do 1º faturamento da OS são faturados em **títulos complementares**, cobrando só os itens ainda sem carimbo; o título original e os itens já faturados ficam imutáveis (`D-Ω4-C1` não muda). (2) **Banco:** `financial_titles` ganha a coluna aditiva e anulável `parent_title_id` (FK composta RESTRICT — na forma de 4 colunas do §5, que amarra organização, OS e direção) e o índice `financial_titles_wo_direction_active_key` é trocado por `financial_titles_wo_direction_original_active_key`, que vale **só para originais**. (3) **Código:** a fronteira do bloco inclui `src/modules/financial-uow/{financial-uow.ts,financial-uow-prisma.ts,index.ts}`, só para pôr o repositório de itens de OS no contexto da unidade. **Revisão da `D-Ω4-C2`:** o **motivo** (não faturar o mesmo item duas vezes, em meses diferentes ou não; competência fora da chave) segue inteiro; o **mecanismo** passa a ter duas âncoras — cada item é faturado uma vez (carimbo lido sob `FOR UPDATE` e gravado na mesma transação do título) e no máximo um título ORIGINAL ativo por (tenant, OS, direção). Replay sem delta → 409 `already_invoiced`, como antes. **Divergência registrada (§A2):** `RBAC_MATRIX.md` l.122 descreve o índice velho e "1 título por OS" — a linha é atualizada no mesmo PR (A7), com esta decisão como fonte nº 1.

**Alternativas consideradas e por que não (mantidas da v1, para a ata):** (a) **"aditar" o original** com o delta — muta `amount` de um título possivelmente pago, o que `D-Ω4-C1` e o CHECK `paid_amount <= amount` (`20260869`) protegem; (b) **competência ou `issue_date` na chave** — é o que a C2 proibiu, e dois faturamentos no mesmo dia colidiriam; (c) **`source_type='work_order_delta'`** — abusa de um enum de frota e o índice de origem (`20260822`) impediria o 2º complementar; (d) **índice por `status NOT IN ('paid','cancelled')`** — só admite o delta depois de pago; (e) **remover o índice e confiar em trava + carimbo** — perde o backstop de banco contra dois originais, que o §5 do SAN3 exige nominalmente.

**O que a v2 muda nesta seção, dito:** (i) as três perguntas saem; o que dependia delas (D3–D5, §5, T-C*, T-D) passa a incondicional; (ii) a FK passa de 2 para **4 colunas** (A6) — ainda "FK composta RESTRICT", como a decisão diz, mas exige um índice único auxiliar `(tenant_id, work_order_id, direction, id)` que a decisão não nomeia: **ampliação nominal declarada**, dentro da autorização de `prisma/` desta decisão; a cadeira C2 (banco) ratifica na junta, e se não ratificar, o plano cai para a FK de 2 colunas com P3′ rebaixada a aplicação (dito na ata, nunca em silêncio); (iii) o pai pode ser um original **cancelado por status** (A5) — comportamento declarado em D3, com pendência de produto para a tela.

## §3 Desenho mínimo

**Regra do espelho:** o módulo de referência é o próprio financeiro transacional do `B-O6R-02` — `financial-entry.service.ts:251-270` (`resolveUow` injetado, `uow.run`, `ctx.assertPeriodOpenShared` → `findByIdForUpdate` → escrita → `throw` fail-closed) e `cheque.service.ts:242-290` (`moveMoneyInUnit`); a classificação de falha transiente espelha `checklist-prisma.repository.ts:1171-1191`. Nada de porta nova.

### D1 — `invoice` dentro da unidade (fecha o item 20 (a) e metade do (b); v2: passo 0, decisão depois da trava, transiente)

`WorkOrderInvoicingService` passa a receber `resolveUow: FinancialUowResolver = createDefaultFinancialUnitOfWork` (import estático do resolver, como `financial-entry.service.ts:15`; os serviços de OS e de título continuam por `import()` dinâmico — `P-Ω4-3-TEST-HERMETIC` fica pré-existente). Algoritmo, na ordem exata (a ordem é parte do contrato de locks **e** da precedência de erros):

```
invoice(actor, workOrderId, body):
  wo = resolveWorkOrder(actor, workOrderId)                 // 404 cross-tenant (fora da unidade, como hoje)
  assertWorkOrderNotCancelled(wo)                           // 422 work_order_cancelled
  // passo 0 (A8) — PRÉ-CHECK fora da unidade, SEM trava: fast-fail e precedência de hoje. NÃO decide dinheiro:
  // a unidade re-decide tudo sobre dado travado (H11).
  pre = await this.repository.listInvoiceableByWorkOrder(tenantId, wo.id)
  if (pre.length === 0 || roundMoney(Σ pre.totalAmount) <= 0) {
    original = await titleService.findActiveByWorkOrder(actor, wo.id, "receivable")
    throw original ? alreadyInvoicedError() : nothingToInvoiceError()   // 409 / 422 — ANTES do período, como hoje (l.357/364)
  }
  dueDate = parseInvoiceDueDate(body.due_date ?? body.dueDate)   // 400 invalid_due_date — mesma posição de hoje (l.373)
  now = new Date(); competencia = deriveCompetencia(now)
  uow = await this.resolveUow()
  return uow.run(actor.tenantId, async (ctx) => {
    await ctx.assertPeriodOpenShared(competencia, periodClosedError)                       // 1) advisory SHARED ANTES de qualquer row lock (F15)
    items = await ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate(tenantId, wo.id) // 2) SELECT … FOR UPDATE ORDER BY created_at, id
    total = roundMoney(Σ items.totalAmount)
    if (items.length === 0 || total <= 0) {                                                // 3) re-decisão sobre dado TRAVADO (a corrida esvaziou o conjunto)
      original = await ctx.titles.findActiveByWorkOrder(tenantId, wo.id, "receivable")
      throw original ? alreadyInvoicedError() : nothingToInvoiceError()
    }
    original = await ctx.titles.findActiveByWorkOrder(tenantId, wo.id, "receivable")      // 4) DEPOIS da trava (A1/M17): vê o commit de quem venceu
    title = await titleService.createForWorkOrderInUnit(ctx, actor, {                      // 5) INSERT do título na MESMA tx
      workOrderId: wo.id, direction: "receivable", partyType: "customer",
      partyName: optionalString(wo.customerName) ?? "Cliente não informado", partyId: wo.customerId,
      amount: total, currency: items[0].currency, issueDate: now, dueDate,
      parentTitleId: original?.id,                                                          // undefined → ORIGINAL; id → COMPLEMENTAR
    })
    stamped = await ctx.workOrderItems.markInvoiced({ tenantId, workOrderId: wo.id, itemIds: items.map(i => i.id), titleId: title.id, invoicedAt: now, updatedBy: actor.userId })  // 6) carimbo na MESMA tx
    if (stamped !== items.length) throw invoiceItemsChangedError()                        // 7) 409 — inalcançável sob FOR UPDATE; fail-closed (cheque.service.ts:288); é o que torna a M2 observável (G1)
    return { title, totalAmount: total, currency: items[0].currency, invoicedItemCount: stamped, parentTitleId: original?.id }
  }).catch(translateUnitFailure)
  // translateUnitFailure: P2002 (índice novo) → 409 already_invoiced (isConflictError, l.440, já existe);
  // transiente por CÓDIGO em 2 níveis (P2034 · P2010.meta.code ∈ {40P01, 40001} · P2028 · 55P03) → 503 invoice_transient_conflict
  // (a transação já desfez; repetir é seguro); qualquer outro erro propaga como hoje.
```

- **Precedência de erros — idêntica à de hoje (A8):** 404 → 422 `work_order_cancelled` → 409 `already_invoiced` / 422 `nothing_to_invoice` (passo 0) → 400 `invalid_due_date` → 422 `period_closed` → 201. Replay em mês fechado continua 409 (T-PREC2); OS vazia em mês fechado continua 422 `nothing_to_invoice` (T-PREC3). A "única diferença" da v1 não existe mais.
- **Corrida entre dois faturamentos (A1):** ambos passam o passo 0; o 2º bloqueia no `FOR UPDATE` (o conjunto dele contém o do 1º), re-avalia o WHERE depois do commit do 1º, fica só com o delta, e no passo 4 **vê** o original recém-commitado → **201 complementar**; sem delta → 409 pelo passo 3. O P2002 do índice só é alcançável por decisão podre ou escrita crua (T-A4b, T-C5-db) — e, quando é, a unidade inteira desfaz.
- A trava SHARED de período **precede** o `FOR UPDATE` (F15). `createForWorkOrderInUnit` **re-chama** `ctx.assertPeriodOpenShared` por contrato próprio (lock reentrante; re-check é a semântica do DIN-008) — a variante não depende de o chamador ter travado; a M18 só fica verde se **as duas** chamadas sumirem.

### D2 — CAS nos itens e ordem total de travas (fecha a outra metade do item 20 (b), P2 e o A4)

- `PrismaWorkOrderFinancialItemRepository.update` e `.softDelete`: WHERE ganha `invoiced_at: null`. InMemory: `update`/`softDelete` devolvem `undefined` se `current.invoicedAt != null`.
- `WorkOrderFinancialService.update`/`.delete`: quando o repositório devolve `undefined`, **relê** por `findById`; se existe e `invoicedAt != null` → `assertItemNotInvoiced` (422 `item_invoiced`); senão 404 (como hoje). O pré-check antes da escrita **permanece** (fast-fail e precedência).
- Novo membro do contrato `WorkOrderFinancialItemRepository`: `listInvoiceableByWorkOrderForUpdate(tenantId, workOrderId)` — Prisma: `$queryRaw` `SELECT <colunas> FROM work_order_financial_items WHERE tenant_id = $1::uuid AND work_order_id = $2::uuid AND deleted_at IS NULL AND invoiced_at IS NULL ORDER BY created_at, id FOR UPDATE`, mapeado por `mapRecord` (precedente `findByIdForUpdate`, `financial-title-prisma.repository.ts:195-203`); InMemory: idêntico a `listInvoiceableByWorkOrder`.
- **`softDeleteAllByWorkOrder` (A4) — mesma ordem total, mesmo contrato:** dentro da transação que o wrapper RLS já abre (l.154-156), (i) `SELECT id FROM work_order_financial_items WHERE tenant_id = $1 AND work_order_id = $2 AND deleted_at IS NULL AND invoiced_at IS NULL ORDER BY created_at, id FOR UPDATE`; (ii) `UPDATE … SET deleted_at = now(), updated_by = … WHERE tenant_id = $1 AND work_order_id = $2 AND id = ANY($3) AND deleted_at IS NULL AND invoiced_at IS NULL`; devolve o `count` de (ii). Com isso **todo** escritor multi-linha de itens trava na ordem `(created_at, id)`; `update`/`softDelete` travam 1 linha (sem ciclo possível); `markInvoiced` só toca linhas que a própria unidade já travou. O ciclo "fatura i1→i2 × zero i2→i1" deixa de existir por construção. Retorno e semântica (`invoiced_at IS NULL` preservado — M4″) inalterados; `zeroActiveItems`/`hasActiveInvoicedItems` não mudam de assinatura. Dentro da UoW (`ctx.workOrderItems.softDeleteAllByWorkOrder`) a mesma receita roda no `tx` da unidade.
- **Residual declarado:** qualquer deadlock/serialização que ainda ocorra (outro escritor futuro, plano físico inesperado) é detectado pelo Postgres, a transação desfaz e o faturamento responde **503 `invoice_transient_conflict`** (D1); fora do faturamento o erro segue o tratamento de hoje. Não há teste determinístico de deadlock (§11).

### D3 — título complementar e o índice só para originais (fecha o item 21; decidido pela `D-SAN3-02`)

- `FinancialTitle`, `CreateFinancialTitleInput` e `CreateFinancialTitleForWorkOrderInput` ganham `parentTitleId?: string` (`financial-title.types.ts`). O `create` público (`POST /financial-titles`) **nunca** o popula — só o caminho de faturamento, como já ocorre com `workOrderId`.
- `FinancialTitleService.createForWorkOrderInUnit(ctx: FinancialUowContext, actor, input)`: deriva `competencia` de `input.issueDate`; `await ctx.assertPeriodOpenShared(competencia, periodClosedError)`; `return ctx.titles.create({ …mesmos campos de createForWorkOrder…, parentTitleId: input.parentTitleId })`. O `createForWorkOrder` legado **permanece** (paridade InMemory, teste l.157) e passa a **delegar** à variante numa unidade própria (`resolveUow` injetado no `FinancialTitleService`, default `createDefaultFinancialUnitOfWork`) — uma receita só.
- `PrismaFinancialTitleRepository.create` grava `parent_title_id: input.parentTitleId ?? null`; `mapRecord` lê `parent_title_id`; `findActiveByWorkOrder` ganha `parent_title_id: null` no WHERE (= **original ativo**; nome mantido — H7). **Sem `ORDER BY`, de propósito:** sob o índice novo há **no máximo uma** linha que satisfaz `deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL` por (tenant, OS, direção) — a leitura é determinística por construção, não por ordem física (A2).
- InMemory de títulos: `create` simula o índice **novo** (`input.workOrderId && !input.parentTitleId && findActiveByWorkOrder(...)` → 409 `work_order_already_invoiced`); `findActiveByWorkOrder` exige `parentTitleId == null`.
- **Regra de escolha do pai (v2, A2/A5 — dita por inteiro):** pai = o original **ATIVO** no instante da unidade, onde "ativo" é **exatamente** o que o índice já chama de ativo desde 2026-08-11: `deleted_at IS NULL` — o **status não entra**. Consequências, cada uma com teste: (i) sem original ativo (OS nunca faturada, ou original **removido** por `delete` lógico) → o título nasce **original**, mesmo que existam complementares ativos do original removido (T-C9a); esses complementares continuam apontando para o removido (RESTRICT só impede exclusão física); (ii) original **cancelado por status** (`changeStatus → cancelled`, `deleted_at` NULL — `financial-title.validators.ts:37-44`) **continua sendo o original ativo**: o delta nasce complementar dele (T-C10). É a semântica pré-existente do índice (`20260811000000` l.5-6, `financial-title-prisma.repository.ts:89-94`), **não** uma escolha nova deste bloco; quem quiser um original novo para a OS **remove** o cancelado (`DELETE /financial-titles/:id`), que é o caminho que o índice sempre previu. A tela (`SAN3-25`) mostra o status do pai; se o produto quiser "cancelar = remover" para títulos de OS, é decisão de produto registrada como pendência (`P-SAN3-02-PAI-CANCELADO`, §11); (iii) terceiro delta → pai = o **original**, nunca o complementar anterior (T-C2) — e, se o original foi removido e só restam complementares, o novo título é original (T-C9), que é o cenário que **observa** a diferença entre "original ativo" e "qualquer título ativo" (A2).

### D4 — a UoW ganha os itens (decidido, Q3 = SIM)

- `FinancialUowContext.workOrderItems: WorkOrderFinancialItemRepository` (tipo-only import de `work-order-financials`). Prisma: `new PrismaWorkOrderFinancialItemRepository(tx)`. Memória: `MemoryFinancialUowDeps.workOrderItems: InMemoryWorkOrderFinancialItemRepository` + `journaledWorkOrderItems(base, journal)` (delegação explícita, before-image antes de cada escrita, como os três irmãos) + `WORK_ORDER_ITEM_REPO_KIND` (`create/update/softDelete/softDeleteAllByWorkOrder/markInvoiced` = `write`; `listByWorkOrder/listInvoiceableByWorkOrder/listInvoiceableByWorkOrderForUpdate/findById/findActiveByClientActionId` = `read`; `reset` = `test_reset`) com `satisfies Record<keyof WorkOrderFinancialItemRepository, UowMemberKind>` — membro novo sem classificação é TS1360.
- `InMemoryWorkOrderFinancialItemRepository` ganha `snapshotTenantForUow`/`restoreTenantForUow` (cópia de `financial-title.repository.ts:395-404`).
- `createFinancialUnitOfWork()` (memória) resolve `workOrderItems` por `import("../work-order-financials/work-order-financial.service.js")` → `getMemoryWorkOrderFinancialRepositoryForTests()` (dinâmico, sem ciclo). `index.ts` exporta `WORK_ORDER_ITEM_REPO_KIND`.
- Os 4 pontos de construção (H1) recebem a dependência; o harness `financial-uow-journal-classification.test.ts` ganha o 4º repositório em `REPOSITORIES` com `PREPARES`/`READ_RETURN_NONEMPTY`/`CALLS` (seed: 1 item ativo com `clientActionId`, 1 título para o `markInvoiced`), e o comentário de contagem passa de 13+10+10 para 13+10+10+11.

### D5 — contrato de resposta e auditoria

`WorkOrderInvoiceResult` ganha `parentTitleId?: string`. O DTO de título (`toFinancialTitleDto` e `toFinancialTitleListDto`) ganha `parentTitleId: title.parentTitleId ?? null` (valor de negócio, id do próprio tenant — mesma exposição de `workOrderId`). A auditoria `work_order.invoiced` ganha `complementary: boolean` nos metadados curados (sem valor, sem parte). Códigos novos: 409 `invoice_items_changed` (inalcançável por construção; fica documentado) e **503 `invoice_transient_conflict`** (A4: deadlock/conflito de escrita detectado pelo Postgres — `P2034`/`40P01`/`40001` — depois do rollback; a chamada pode ser repetida; espelha a classificação transiente de `checklist-prisma.repository.ts:1167-1181`).

### D6 — o que NÃO muda

`D-Ω4-C1` e `assertItemNotInvoiced`; `zeroActiveItems`/`hasActiveInvoicedItems` (só a ordem de travas por baixo, D2); a permissão da rota (`P-Ω4-3-INVOICE-LEASTPRIV` fica); `createForSource`/índice de origem; `financial-entries`, `cheques`, `financial-period-closes`; `work-orders`; frontend. A OS **não** é travada (§1.2, pendência §11).

## §4 Contrato (REST `/api/v1`, sem rota nova; v2: linhas da corrida, do mês fechado e do transiente)

| rota | quando | código / corpo |
|---|---|---|
| `POST /work-orders/:workOrderId/invoice` (perm. `financial_titles:create`) | OS do tenant, não cancelada, com itens sem carimbo e **sem** original ativo | **201** `{ data: <título ORIGINAL; parentTitleId: null>, invoicedTotal, currency, invoicedItemCount }` |
| idem | com itens sem carimbo e **com** original ativo (inclusive original **cancelado por status**, D3) | **201** `{ data: <título COMPLEMENTAR; parentTitleId: <id do original>>, invoicedTotal: Σ delta, currency, invoicedItemCount: n delta }` — o original não muda |
| idem | sem itens sem carimbo e **com** original ativo (replay) — mesmo com a competência corrente **fechada** | **409** `already_invoiced` (como hoje; T-PREC2) |
| idem | sem itens sem carimbo e **sem** original ativo (OS vazia; original removido com itens já carimbados; original removido com complementares ativos — T-C9b) — mesmo com a competência fechada | **422** `nothing_to_invoice` (como hoje; T-PREC3) |
| idem | OS de outra organização | **404** `work_order_not_found` (nada vaza) |
| idem | OS cancelada | **422** `work_order_cancelled` |
| idem | itens faturáveis e competência (mês de `now`) fechada | **422** `period_closed` — dentro da unidade, antes da seleção; nada persiste |
| idem | `due_date` inválida (com itens faturáveis) | **400** `invalid_due_date` |
| idem | **corrida entre dois faturamentos** da mesma OS (A1) | o 1º **201** original; o 2º **201 complementar** só com o delta que o 1º não cobriu (T-A4); sem delta → **409** `already_invoiced` |
| idem | corrida com DELETE/PATCH/`cancel(zero)` dos itens | quem vence a trava decide: faturamento vence → o DELETE/PATCH/zero posterior **não** toca o carimbado (422 `item_invoiced` / zero apaga 0); DELETE/zero vence → o item fica fora do título (ou **422** `nothing_to_invoice` se era o único) |
| idem | 2º ORIGINAL tentado dentro da unidade (decisão podre ou escrita crua — nunca pelo caminho normal) | **409** `already_invoiced` (P2002 do índice novo); nada persiste (T-A4b) |
| idem | deadlock/serialização detectados pelo Postgres (`40P01`/`40001`/`P2034`), transação expirada (`P2028`) | **503** `invoice_transient_conflict`; nada persiste; repetir é seguro |
| idem | contagem carimbada ≠ selecionada (inalcançável sob `FOR UPDATE`) | **409** `invoice_items_changed`, nada persiste |
| `PATCH`/`DELETE /work-orders/:id/financial-items/:itemId` | item carimbado, inclusive quando o carimbo venceu uma corrida com o pré-check | **422** `item_invoiced`; item intacto |
| `GET /financial-titles`, `GET /financial-titles/:id` | — | DTO ganha `parentTitleId` (null nos originais e nos legados) |
| `POST /financial-titles` | corpo com `parent_title_id`/`work_order_id` | ignorados (como `work_order_id` já é) |

## §5 Modelagem e migração (decidido pela `D-SAN3-02` (2); v2: FK de 4 colunas — A6)

**Migração `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql`** — aditiva (ADD COLUMN anulável + índice único auxiliar + FK + CHECK + CREATE INDEX) **mais a troca do índice** autorizada no §5 do SAN3 (DROP do velho **depois** de criado o novo, na mesma transação do `migrate deploy` — H10; nenhuma linha removida, nenhum UPDATE/DELETE de dado):

```sql
-- B-SAN3-02 — título COMPLEMENTAR para o delta de itens (D-SAN3-02-TITULO-COMPLEMENTAR revê o mecanismo da D-Ω4-C2).
-- (1) parent_title_id: NULL = título ORIGINAL (todo o legado); id = COMPLEMENTAR do original ativo da MESMA OS e direção.
ALTER TABLE "financial_titles" ADD COLUMN "parent_title_id" UUID;
-- (2) chave única AUXILIAR, alvo da FK de 4 colunas (id já é PK → sempre satisfeita; aditiva; A6)
CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction", "id");
-- (3) o pai é da MESMA organização, OS e direção — amarrado pelo BANCO (A6). RESTRICT: pai nunca é apagado fisicamente.
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_title_fkey"
  FOREIGN KEY ("tenant_id", "work_order_id", "direction", "parent_title_id")
  REFERENCES "financial_titles" ("tenant_id", "work_order_id", "direction", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- (4) MATCH SIMPLE não avalia a FK se work_order_id for NULL: complementar só existe com OS, e nunca aponta para si (legado: parent NULL → satisfaz)
ALTER TABLE "financial_titles"
  ADD CONSTRAINT "financial_titles_parent_requires_work_order_check"
  CHECK ("parent_title_id" IS NULL OR ("work_order_id" IS NOT NULL AND "parent_title_id" <> "id"));
-- (5) backstop de "um ORIGINAL ativo por (tenant, OS, direção)": mesmo conjunto de chaves do índice antigo para TODO o legado
--     (parent NULL) → não pode violar (H5); complementares ficam fora do predicado.
CREATE UNIQUE INDEX "financial_titles_wo_direction_original_active_key"
  ON "financial_titles" ("tenant_id", "work_order_id", "direction")
  WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL AND "parent_title_id" IS NULL;
-- (6) só depois de o novo existir: o antigo sai.
DROP INDEX IF EXISTS "financial_titles_wo_direction_active_key";
-- RLS: a coluna herda financial_titles_tenant_isolation (20260810); a FK não passa pela RLS, mas tenant_id está na chave. Nenhuma policy nova.
-- down (provado em T-D(d): up → down → re-up em base própria; DUAS PONTAS como 20260869):
--   CREATE UNIQUE INDEX "financial_titles_wo_direction_active_key" ON "financial_titles" ("tenant_id","work_order_id","direction")
--     WHERE "deleted_at" IS NULL AND "work_order_id" IS NOT NULL;   -- FALHA (23505) se já existir complementar ativo: o down PARA aqui,
--                                                                   -- o índice novo FICA e o resto é decisão humana (§C7.5)
--   DROP INDEX IF EXISTS "financial_titles_wo_direction_original_active_key";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_parent_requires_work_order_check";
--   ALTER TABLE "financial_titles" DROP CONSTRAINT IF EXISTS "financial_titles_parent_title_fkey";
--   DROP INDEX IF EXISTS "financial_titles_tenant_wo_direction_id_key";
--   ALTER TABLE "financial_titles" DROP COLUMN IF EXISTS "parent_title_id";   -- perde dado se houver complementar: NUNCA automático
```

**O que o banco garante e o que não (A6, dito):** FK (3) → pai da **mesma organização, OS e direção**, e existente; CHECK (4) → complementar tem OS e não é o próprio pai; índice (5) → no máximo um **original** ativo. O banco **não** garante "pai é original" (FK não aceita índice parcial como alvo) nem "pai está ativo" — são regras da aplicação (D3) com testes (T-C2, T-C9). `ON UPDATE CASCADE` é inerte na prática: `work_order_id`/`direction` são imutáveis pós-create (`financial-title.service.ts:232-233`).

**`translatePersistenceError` (`financial-title-prisma.repository.ts:463-482`):** P2003 cuja `meta` contenha `parent` → 409 `invalid_parent_title` (FINANCIAL_TITLE_CONFLICT) — **testado antes** do ramo `work_order` (o nome das colunas da FK nova contém `work_order_id`); P2002 segue como está (o índice novo mantém `wo_direction` no nome; `source` continua desambiguando o de origem — H2, provado em T-A4b).

**`prisma/schema.prisma` (`FinancialTitle`):** `parent_title_id String? @db.Uuid` (scalar-only; FK e CHECK só no SQL — precedente `WorkOrderComment`, l.1877-1880) + `@@unique([tenant_id, work_order_id, direction, id], map: "financial_titles_tenant_wo_direction_id_key")` (chave não-parcial, o Prisma modela) + o comentário l.2028-2030 atualizado para nomear o índice novo e o predicado `parent_title_id IS NULL`. Nenhum outro modelo muda. `npx prisma validate` ec 0; `prisma generate` regenera o cliente.

**Decimal/timestamptz/delete lógico:** inalterados. A coluna nova é UUID anulável — sem dinheiro, sem data.

**Rollback de código:** `git revert` do squash. O código antigo lendo dados novos é **fail-closed**: `findActiveByWorkOrder` antigo encontra **qualquer** título ativo (inclusive complementar) → 409 em todo faturamento da OS; nenhum dinheiro inventado. O índice antigo só volta se não houver complementar ativo (down, ponta B) — pendência de operação em §11.

## §6 Escopo — PERMITIDO e PROIBIDO (caminhos exatos; v2: `RBAC_MATRIX.md` l.122 entra — A7)

### 6.1 PERMITIDO

| caminho | o que muda |
|---|---|
| `src/modules/work-order-financials/work-order-financial.service.ts` | D1 (passo 0, unidade, `resolveUow` no construtor, resultado com `parentTitleId`, `translateUnitFailure`), D2 (relê → 422/404), `invoiceItemsChangedError`, `invoiceTransientConflictError` |
| `src/modules/work-order-financials/work-order-financial.repository.ts` | contrato `listInvoiceableByWorkOrderForUpdate`; InMemory: CAS em `update`/`softDelete`, `snapshotTenantForUow`/`restoreTenantForUow` |
| `src/modules/work-order-financials/work-order-financial-prisma.repository.ts` | `FOR UPDATE` por `$queryRaw`; `invoiced_at: null` em `update` e `softDelete`; `softDeleteAllByWorkOrder` com trava ordenada (A4) |
| `src/modules/work-order-financials/work-order-financial.controller.ts` | metadado `complementary` na auditoria; forma da resposta inalterada |
| `src/modules/financial-titles/financial-title.service.ts` | `createForWorkOrderInUnit`; `createForWorkOrder` delega; `resolveUow` injetado |
| `src/modules/financial-titles/financial-title.types.ts`, `financial-title.repository.ts`, `financial-title-prisma.repository.ts`, `financial-title.dto.ts` | `parentTitleId`; simulação do índice novo; `findActiveByWorkOrder` = original; P2003 `parent` → `invalid_parent_title`; DTO |
| `src/modules/financial-uow/financial-uow.ts`, `financial-uow-prisma.ts`, `index.ts` | D4 (`D-SAN3-02` (3)) |
| `prisma/schema.prisma` (só `FinancialTitle`: 1 coluna + 1 `@@unique` auxiliar + comentário) e `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` (novo) | §5 (`D-SAN3-02` (2); o índice auxiliar é a ampliação nominal declarada no §2, ratificada pela C2) |
| **`RBAC_MATRIX.md` — só a l.122, só a frase** "idempotente por OS (índice PARCIAL … → replay 409 already_invoiced)" | texto novo (§10); nenhuma outra linha, nenhuma permissão |
| `tests/work-order-invoicing.test.ts`, `tests/work-order-financials.test.ts` | casos novos §7 (memória) |
| `tests/work-order-invoicing-atomic-db.test.ts` (novo), `tests/work-order-invoicing-migration-drill-db.test.ts` (novo) | §7 (`-db`) |
| `tests/financial-uow-journal-classification.test.ts`, `tests/financial-uow-memory.test.ts`, `tests/financial-entries.test.ts` (só a dependência `workOrderItems` nas construções da UoW) | D4 |
| `tests/financial-titles.test.ts`, `tests/financial-titles-routes.test.ts` | só se o DTO novo exigir ajuste de asserção (`parentTitleId: null`) |
| `.github/workflows/ci.yml` | **só** as linhas `SUITES=` do job `backend-postgres`, apensando as 2 suítes `-db` novas (precedente 03a/04a) |
| `docs/revisoes/SAN3/B-SAN3-02-plano.md` (esta v2, versionada pelo orquestrador), `B-SAN3-02-plano-v1.md`, `B-SAN3-02-critica-r1*.md`, `B-SAN3-02-critica-r2.md`, `B-SAN3-02-dev.md` | registro do bloco |
| `agent-orchestration/controle/decisoes.md`, `pendencias.md`, `docs/status-geral.md`, `codex/log-execucao.md` — **APPEND only** | §10 |
| `.claude/agents/especialistas/jurado-san302-*.md` + espelho `.agents/agents/especialistas/` (fábrica; `sync-agent-agents.mjs --check` verde) | §9 |

### 6.2 PROIBIDO (nominal — fora disto, o §C4 vale por inteiro)

`src/modules/work-orders/**` (o `cancel(zero)` não muda: a ordem de travas é resolvida por baixo, no repositório de itens) · `src/modules/financial-entries/**` · `src/modules/cheques/**` · `src/modules/financial-period-closes/**` · `src/modules/financial-accounts/**` · `src/modules/service-quotes/**` · `src/modules/checklists/**` (o precedente transiente é **espelhado**, não importado) · `src/database/**` (inclusive `rls.ts` e `financial-period-lock.ts`) · `src/app.ts` · `src/config/**` · qualquer outra migração (a `20260811000000` **não** se edita: histórico só-apensar) · qualquer outro modelo do `schema.prisma` · `prisma/seed*.ts` · `frontend/**` · `mobile/**` · `Kpis/**` (congelado, `D-GOV-PROPORCIONAL` (5)) · `package.json`, lockfiles, `.env*`, `infra/**`, `scripts/**` · `tests/helpers/**` (consumir, não editar) · qualquer outra linha de `RBAC_MATRIX.md` · reescrever texto antigo de qualquer registro.

**Travas de mesmo arquivo (SAN3 §6):** `SAN3-20` (cheque × título, `src/modules/financial-titles/**`) e `SAN3-23` (`src/modules/work-order-financials/**`) só abrem ramo depois do merge deste; `B-O6R-12` espera a trava de `prisma/` (`SAN3-02 → SAN3-20 → B-O6R-12`). O `SAN3-25` (tela) consome `parentTitleId`, o 201 complementar e o 503 transiente (repetir).

## §7 Testes por critério — cada um com a mutação que o deixa vermelho (v2)

Convenções: **(m)** = memória, em `tests/work-order-invoicing.test.ts` ou `tests/work-order-financials.test.ts`, pelo runner em modo memory; **(db)** = `tests/work-order-invoicing-atomic-db.test.ts`, Postgres 16 **descartável**, `CORE_SAAS_PERSISTENCE=prisma` fixado pela própria suíte antes de importar a aplicação, barreira escopada por `application_name` (`tests/helpers/pg-barrier.ts`: `waitForOwnBlockedStatement`, `captureSettled`, `expectRejected`), tenant descartável por teste e teardown escopado em ordem de FK (molde: `financial-pay-title-atomic-db` e `financial-title-invariants-db`); o serviço fala com o banco por papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`, molde `expense-sync-atomic-db` A0). **Vencedor** de corrida = conexão crua com as **peças do produto na ordem do produto** (`setTenantRlsContext` → `acquirePeriodLockShared` → `SELECT … FOR UPDATE ORDER BY created_at, id` → …), transação aberta até a barreira e liberada logo depois (H4); **perdedor** = serviço real. **Injeção de falha/decisão** = UoW embrulhada por Proxy (padrão `tests/financial-entries.test.ts:519-541`), sobre a de memória **ou** sobre a `PrismaFinancialUnitOfWork` com resolver injetado. Vermelho-controle: o dev aplica cada mutação **M** no `src/` de um worktree próprio, roda o teste que a cita, registra `comando → saída → veredito` e restaura com hash conferido.

### 7.1 Critério K1 — falha injetada entre o título e o carimbo → nenhum persiste

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-A1 (m)** falha no carimbo | Proxy: `ctx.workOrderItems.markInvoiced` lança | `invoice` rejeita com o erro injetado; `titles.list` total 0; nenhum item com `invoicedAt`; `financials.list` intacta | **M1** (tirar o `uow.run`, voltar ao sequencial) · **M9** (variante usa `this.repository.create` em vez de `ctx.titles.create`) |
| **T-A2 (db)** falha no carimbo sob Postgres | mesma injeção sobre a UoW Prisma; conta antes/depois | `financial_titles` do tenant = 0; `invoiced_at` e `title_id` NULL em todos os itens; nenhuma linha órfã | M1 · M9 |
| **T-A3 (m)** contagem carimbada menor | Proxy: `markInvoiced` devolve `items.length - 1` | 409 `invoice_items_changed`; rollback: 0 títulos, 0 carimbos | **M3** (remover o `if (stamped !== items.length)`) — só morre em memória; é a guarda que torna a M2 observável em T-R2 (G1) |
| **T-A4 (db)** — **v2, alvo mudado (A1)** — dois faturamentos concorrentes da mesma OS | i1 commitado. Vencedor cru: advisory → `FOR UPDATE` (trava i1) → [barreira] → 3ª conexão insere **i2** (autocommit) → perdedor REAL `invoice` entra: passo 0 vê i1+i2; na unidade bloqueia em i1 (`waitForOwnBlockedStatement`) → vencedor: INSERT T1 original, carimba i1, commit → perdedor re-avalia | perdedor **201** com `parentTitleId === T1.id`, `invoicedItemCount` 1, `invoicedTotal` = i2; i1 → T1, i2 → T2; **2 títulos**; T1 intacto | **M17** (decidir original × complementar **antes** do `FOR UPDATE`: o perdedor decide "original" sem ver T1 → INSERT → P2002 → 409 ≠ 201) · **M2** (sem `FOR UPDATE`: o perdedor não espera, decide "original", bloqueia no índice, 23505 → 409 ≠ 201) |
| **T-A4b (db)** — **novo (A1)** — P2002 dentro da unidade e a H2 | T1 original commitado (faturamento real); i2 novo; serviço real com UoW Prisma embrulhada: Proxy em `ctx.titles.findActiveByWorkOrder` devolve `undefined` (decisão podre) → o serviço tenta INSERT de **2º original** | **409 `already_invoiced`** (`reason` exato — H2: P2002 do índice novo → `work_order_already_invoiced` → tradução); `financial_titles` = 1; i2 **sem** carimbo; nada persiste da unidade | **M5b** (índice removido sem substituto → INSERT passa → 201 com 2 originais) · tradução errada do P2002 (ex.: `source_already_launched`) |
| **T-A6 (m)** — **novo (A4)** — falha transiente mapeada | Proxy: `markInvoiced` lança `{ code: "P2034" }`; 2ª forma: `{ code: "P2010", meta: { code: "40P01" } }` | **503 `invoice_transient_conflict`** nas duas formas; 0 títulos, 0 carimbos | **M20** (sem `translateUnitFailure` transiente → o erro cru propaga, 500) |

### 7.2 Critério K2 — item apagado durante o faturamento → fica fora do título (v2: + `cancel(zero)`, A4)

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-R1 (db)** faturamento vence a trava | vencedor cru: advisory SHARED → `FOR UPDATE` dos itens → (barreira) → INSERT título → UPDATE carimbo → commit; perdedor real: `financials.delete(item)` bloqueia em `work_order_financial_items` | perdedor: 422 `item_invoiced`; item **não** deletado e carimbado; `title.amount` inclui o item | **M4** (tirar `invoiced_at: null` do WHERE de `softDelete`) |
| **T-R2 (db)** DELETE vence | vencedor cru soft-deleta o item e segura; perdedor real `invoice` bloqueia no `FOR UPDATE`; vencedor commita | 201; `title.amount` = Σ **sem** o item; `invoicedItemCount` = n−1; o item deletado sem carimbo | **M2** (sem `FOR UPDATE`: a leitura antiga inclui o item; o `markInvoiced` espera a trava do DELETE, re-avalia `deleted_at IS NULL`, carimba n−1 e a guarda de D1 aborta → 409 em vez de 201) |
| **T-R2b (db)** único item apagado | como T-R2 com 1 item | 422 `nothing_to_invoice`; 0 títulos | M2 (com M3 junto: título inflado — o par é o defeito original) |
| **T-R4 (db)** PATCH vence/perde | como T-R1 com `financials.update(quantity)` | 422 `item_invoiced`; `total_amount` do item inalterado; título bate | **M4′** (tirar o predicado do `update`) |
| **T-Z1 (db)** — **novo (A4)** — faturamento vence; `cancel(zero)` espera | vencedor cru: advisory → `FOR UPDATE ORDER BY created_at, id` de todos os itens → (barreira) ; perdedor real: `financials.zeroActiveItems(wo)` bloqueia no `SELECT … FOR UPDATE` dele; vencedor: INSERT título + carimbo + commit | perdedor devolve **0** (re-avaliou: itens carimbados ficam fora); itens carimbados e **não** deletados; **sem 40P01** nas duas conexões; título bate | **M4″** (`softDeleteAllByWorkOrder` sem `invoiced_at IS NULL` no SELECT/UPDATE → apaga os carimbados) |
| **T-Z2 (db)** — **novo (A4)** — `zero` vence; faturamento espera | vencedor cru: `SELECT … FOR UPDATE ORDER BY created_at, id` → (barreira) → UPDATE `deleted_at` → commit; perdedor real `invoice` (passo 0 viu itens) bloqueia no `FOR UPDATE` | perdedor: **422 `nothing_to_invoice`** (re-avaliou: conjunto vazio); 0 títulos; **sem 40P01** | M2 (sem `FOR UPDATE`: lê os itens vivos, cria o título, `markInvoiced` carimba 0 → 409 `invoice_items_changed` ≠ 422) |
| **T-M4b (m)** corrida simulada no serviço | Proxy em `findById`: 1ª leitura devolve o item **sem** carimbo (pré-check passa), estado real carimbado | `delete`/`update` → 422 `item_invoiced` (não 404) | **M4m** (serviço devolve 404 cego quando o CAS casa 0) |
| **T-M4c (m)** CAS do repositório | `repository.softDelete`/`update` diretos num item carimbado | devolvem `undefined`; item intacto | **M4i** (InMemory sem a verificação de `invoicedAt`) |

### 7.3 Critério K3 — item lançado depois do 1º faturamento → título complementar, sem refaturar o carimbado (v2: + T-C9, T-C10, T-PREC2/3)

| teste | arranjo | asserção | mata |
|---|---|---|---|
| **T-C1 (m + db)** o delta | faturar (T1) → lançar item novo → faturar | 201; `title.parentTitleId === T1.id`; `amount` = total do item novo; `invoicedItemCount` = 1; T1 inalterado (`amount`, `status`, `paidAmount`, `updatedAt`); itens antigos com `titleId = T1`, novo com `titleId = T2`; `titles.list` total 2 | **M5** (índice/simulação sem `parent_title_id IS NULL` → 409/23505) · **M13** (DTO sem `parentTitleId`) |
| **T-C2 (m)** terceiro delta | T1 → delta → T2 → delta → T3 | `T3.parentTitleId === T1.id` (não T2) | regressão de D3; a M6 **não** morre aqui (A2: o 1º inserido é T1) — a prova da M6 é o T-C9 |
| **T-C3 (m)** original pago | T1 pago por `applyPayment`; delta | 201 complementar; T1 continua `paid`, `paidAmount` igual | M5 |
| **T-C4 (m)** original removido, sem complementar | T1 removido (`titles.delete`); item novo; faturar | 201 com `parentTitleId: null` (novo **original**); os itens de T1 continuam carimbados para T1 (não entram) | regressão de D3 (a M6 não morre aqui — A2) |
| **T-C9a (m + db)** — **novo (A2)** — original removido **com complementar ativo** | T1 → delta → T2 (pai T1) → `titles.delete(T1)` → item novo → faturar | 201 com **`parentTitleId: null`** (original novo); no db: a linha nova satisfaz o predicado do índice (`SELECT count(*) … WHERE deleted_at IS NULL AND work_order_id = wo AND parent_title_id IS NULL` = 1); T2 segue apontando para T1 (removido) | **M6** (`findActiveByWorkOrder` sem `parent_title_id IS NULL` → acha T2 → `parentTitleId = T2`, fora do backstop) |
| **T-C9b (m)** — **novo (A2)** — idem, sem item novo | T1 → delta → T2 → `delete(T1)` → faturar | **422 `nothing_to_invoice`** (não há original ativo) | M6 (acha T2 → 409 `already_invoiced`) |
| **T-C10 (m)** — **novo (A5)** — original cancelado por status | T1 → `changeStatus(cancelled)` → item novo → faturar | 201 **complementar** com `parentTitleId === T1.id` (comportamento declarado em D3); T1 segue `cancelled` | **M21** (`findActiveByWorkOrder` excluindo `status = 'cancelled'` → decide "original" → 409 pela simulação/índice: T1 ainda está sob o predicado) |
| **T-C6 (db)** dois complementares ativos | T1 → delta → T2 → delta → T3 | sem 23505; 3 linhas ativas, 2 com `parent_title_id = T1` | M5 |
| **T-C8 (m, [rota])** contrato HTTP | finance fatura, lança item, fatura de novo | 201; `body.data.parentTitleId` = id do 1º; `invoicedItemCount` = 1; auditoria `work_order.invoiced` com `complementary: true`, sem `amount`/`party_name`/`tenant` | M13 · **M14** (auditoria vaza valor) |
| **T-PREC (m)** período fechado com delta | competência fechada após T1; delta | 422 `period_closed`; nenhum T2; item novo sem carimbo | **M18** (remover `assertPeriodOpenShared` do passo 1 **e** da variante → 201 em mês fechado) — A3: a M1 **não** morre aqui |
| **T-PREC2 (m)** — **novo (A8)** — replay em mês fechado | T1; competência corrente fechada; faturar sem delta | **409 `already_invoiced`** (como hoje) | **M23** (remover o passo 0 → 422 `period_closed`) |
| **T-PREC3 (m)** — **novo (A8)** — OS vazia em mês fechado | OS sem itens; competência fechada | **422 `nothing_to_invoice`** (como hoje) | M23 (→ `period_closed`) |

### 7.4 Critério K4 — refaturar o carimbado → recusado

| teste | arranjo | asserção | mata |
|---|---|---|---|
| l.141 / l.295 **(existentes)** replay sem delta | — | 409 `already_invoiced`; 1 título | — (contrato preservado) |
| l.192 **(existente)** título removido + itens carimbados | — | 422 `nothing_to_invoice` | — |
| **T-C5 (m)** paridade InMemory | `titles.createForWorkOrder` direto de um 2º **original** | 409 `work_order_already_invoiced` | **M7** (simulação do índice novo removida) |
| **T-C5-db (db)** backstop do banco | INSERT cru de 2º original ativo (parent NULL) | `23505` em `financial_titles_wo_direction_original_active_key` | M5b (a tradução para 409 pela rota é o T-A4b — A1) |
| **T-K4b (db)** carimbo não se sobrescreve | `markInvoiced` com id já carimbado (outro título) | `count` 0; `title_id` original mantido | **M15** (tirar `invoiced_at: null` do `markInvoiced`) |

### 7.5 Transversais (v2: T-RLS sem mutação — G2; T-D ganha (e) — A6)

| teste | asserção | mata |
|---|---|---|
| **T-RLS (db)** serviço sob papel efêmero sem BYPASSRLS | OS de outra organização → 404 e **zero** linhas tocadas em `financial_titles`/itens; complementar do tenant A invisível ao B (`findActiveByWorkOrder` do B = undefined); o `FOR UPDATE` funciona sob FORCE RLS (H3); a tag da suíte chega ao backend (`assertApplicationNamePropagated`) | **sem mutação própria** (G2: tirar `tenant_id` do `FOR UPDATE` é mutante equivalente — a FK composta e a PK já fixam a organização). É prova de comportamento/H3 e controle positivo do arnês, como o A0 do 03a |
| **T-UOW** harness `[P7][workOrderItems.*]` (11 casos gerados) + `financial-uow-memory` "+1: undo-log desfaz carimbo e título juntos" | write journaled → estado idêntico após aborto; read devolve não-vazio; `reset` não exposto | **M8** (journal de itens vira delegação pura) |
| **T-D (db, drill em base própria)** 5 casos: (a) `migrate deploy` → `pg_indexes` tem `…original_active_key` e `…tenant_wo_direction_id_key`, **não** tem `…active_key`; coluna, FK de 4 colunas e CHECK em `pg_constraint`; (b) fixture **legada** antes do deploy (2 títulos da mesma OS, 1 deletado) → ec 0 (H5); (c) original + 2 complementares OK, 2º original → 23505, complementar sem OS → 23514, pai = si mesmo → 23514; (d) down (SQL do comentário) → re-up, índices 2 → 0 → 2; **(e) — novo (A6)**: pai de **outra OS** → 23503, pai **avulso** (`work_order_id` NULL) → 23503, pai de **outra direção** → 23503, pai de outro tenant → 23503 | — | **M11** (down ausente/errado) · M5 · **M22** (FK de 2 colunas → os 23503 de (e) viram sucesso) |
| **T-ORDER (revisão estática, C2)** advisory antes de `FOR UPDATE` em D1 e na variante; `(created_at, id)` nos dois escritores multi-linha (D2) | — | sem teste determinístico (H9); T-Z1/T-Z2 provam ausência de ciclo nos dois arranjos, não a impossibilidade |

**Resumo das mutações (vermelho-controle obrigatório, uma por linha no relatório do dev) — 24:** M1 · M2 · M3 · M4 · M4′ · M4″ · M4m · M4i · M5 · M5b · M6 · M7 · M8 · M9 · M11 · M13 · M14 · M15 · M17 · M18 · M20 · M21 · M22 · M23. **Saiu:** M16 (equivalente, G2). **Entraram na v2:** M4″ (A4), M17 (A1), M18 (A3), M20 (A4), M21 (A5), M22 (A6), M23 (A8). Cada uma tem o teste que a mata nas tabelas; M3 só morre em memória (dito); M6 morre em T-C9a/b (A2).

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

## §8 Rodadas do crítico (antes do código — §5 do SAN3: "unanimidade + crítico")

**Rodada 1 — concluída:** Opus (`critico-san3-02-opus`) VOLTA AO PLANO (A1, A2 bloqueia; A3–A8 ajuste; G2 confirmado; G1 não procede) e Gemini (2 ajustes). Resposta achado por achado no topo deste arquivo; cada aceite virou emenda **escrita** com teste e mutação (nunca emenda implícita). **Rodada 2 — a última (máx. 2):** ataca **esta v2**, identidade nova (`critico-san3-02-r2-*`, nível menor declarado; o Gemini nunca sozinho). Alvos que eu mesmo aponto: (1) o passo 0 lê sem trava — há algum desfecho de dinheiro que dependa dele? (H11 diz que não; T-A4/T-Z2 exercitam); (2) a FK auto-referente de 4 colunas com `ON UPDATE CASCADE` e o índice auxiliar — custo, nome, e se `prisma migrate diff` fica limpo com o `@@unique` modelado; (3) 503 transiente: a tela do `SAN3-25` repete? o cliente mobile não chama; (4) "pai cancelado por status" (D3/T-C10) — é aceitável até a tela, ou a pendência `P-SAN3-02-PAI-CANCELADO` precisa decisão antes do merge?; (5) se a trava ordenada no `softDeleteAllByWorkOrder` muda algum comportamento observável do `cancel(zero)` (contagem, 422 `has_invoiced_items`); (6) M3 e a guarda inalcançável (G1 contestado) — o crítico 2 pode reabrir, com execução. Saída: `docs/revisoes/SAN3/B-SAN3-02-critica-r2*.md`; achados `bloqueia` viram **v3** antes do dev.

## §9 Junta — 3 cadeiras por competência, unanimidade com veto, inspetor antes

**Régua:** bloco de dinheiro (§C7 item 8(1)): `inspetor-de-terreno-da-junta` (Opus, frontmatter) libera; 3 cadeiras, **unanimidade**, cada voto com `gravidade` e `escopo` (§C7.1-ter(a)); ciclos 1–2 como sempre, do 3 em diante só defeito grave de produto bloqueia (§C7 item 8(2)); toda reprovação → topo audita e replaneja (§C7.4). Corpos novos pela `agente-fabrica` (`jurado-san302-c1-dinheiro`, `jurado-san302-c2-banco-migracao`, `jurado-san302-c3-regressao`), versionados em `.claude/agents/especialistas/` + espelho, `sync-agent-agents.mjs --check` verde. Mandatos na **forma A com pré-voo** (`scripts/mandato-refs.sh <PR>`, `scripts/mandato-preflight.sh`), ≤ 3 itens cada, modelo P1–P7 verbatim abaixo.

| cadeira | corpos-base (na ref) | mandato (≤ 3 itens, por EXECUÇÃO própria em worktree e Postgres próprios) |
|---|---|---|
| **C1 — dinheiro** (atomicidade, imutabilidade, delta) | `guardiao-fail-closed` + `validador-mestre` | (1) sondas **próprias** de T-A1/T-A2/T-A3/T-A4/T-A4b/T-A6 e T-R1/T-R2: falha injetada, decisão podre, transiente e corrida, contagens e valores lidos no banco; (2) T-C1…T-C4, T-C8, T-C9a/b, T-C10: o original não muda (`amount`, `status`, `paid_amount`), o delta é só o delta, o pai é o original ativo (inclusive cancelado por status), auditoria sem valor; (3) refaturar recusado nas 3 portas (replay, `createForWorkOrder` direto, INSERT cru) e a precedência de hoje (T-PREC2/3) |
| **C2 — banco e migração** | **`agente-dba-guardiao`** + `inspetor-de-arnes-concorrente` | (1) migração em base própria: up → down → re-up, fixture legada (H5), `pg_indexes`/`pg_constraint`, FK de **4 colunas** + índice auxiliar (ratificação da ampliação do §2), T-D(e), SQL sem `CONCURRENTLY` (H10), RLS herdada, `prisma migrate diff` limpo; (2) ordem total de travas nos **dois** escritores multi-linha (D2, H9) e `FOR UPDATE` sob papel sem BYPASSRLS (T-RLS, H3); T-Z1/T-Z2 sem 40P01; mapeamento transiente por código em 2 níveis; (3) estabilidade das `-db` novas: 3 execuções, denominador constante, 0 skip, barreira escopada (nunca cluster-wide) |
| **C3 — regressão, escopo e registro** | `agente-ci-doutor` + `validador-mestre` | (1) baseline/bateria do §7.6 reexecutada e CI: check-runs **concluídos** no head, `SUITES` com as 2 suítes novas, orçamento de skip; (2) diff × §6: nada fora do PERMITIDO, `Kpis/*` intocado, `20260811000000` intocada, `RBAC_MATRIX.md` só a frase da l.122, **24** mutações com vermelho registrado, M16 ausente; (3) registro §10: `D-SAN3-02` apensada com as palavras do dono, 3 pendências fechadas com evidência, pré-existentes nomeadas, ata com quem achou/planejou/desenvolveu |

**Inelegíveis (o inspetor confere por nome, nas atas da ref):** `planejador-san3-02-astra`, `planejador-san3-02-fable`, `critico-san3-02-opus`, o crítico Gemini da r1, `critico-san3-02-r2-*`, o(s) dev(s) deste bloco, e quem corrigir qualquer achado (§C7.4-bis). Quem votou no `B-O6R-02`/`03a`/`04a` **não** é inelegível por isso — bloco diferente — mas a ata registra nome, bloco e papel anteriores.

**Pré-voo do inspetor (§C7.1-bis):** objeto = SHA completo do head do PR com check-runs **concluídos**; plano v2 (e v3 se houver), críticas r1/r2, relatório do dev e os 24 vermelhos-controle presentes; `sync-agent-agents.mjs --check`; corpos julgados = corpos carregados (md5 EOL-neutro); árvores sem mutação viva; Postgres descartável e papel sem bypass por executor; plano de perda de jurado; `D-SAN3-02-TITULO-COMPLEMENTAR` apensada (ou o arquivo de respostas do dono anexado ao briefing com a data) — sem isso o inspetor **não libera**.

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

- **`decisoes.md`:** `D-SAN3-02-TITULO-COMPLEMENTAR` com o texto do §2 e as palavras literais do dono (*"sim para tudo"*, 2026-10-19), abaixo do `REGISTRO-SAN3-CONFLITOS`; nota "revê o **mecanismo** da `D-Ω4-C2`; o motivo e a `D-Ω4-C1` não mudam"; **divergência §A2** com `RBAC_MATRIX.md` l.122 registrada na mesma entrada, com a frase antiga preservada e a nova.
- **`RBAC_MATRIX.md` l.122 (A7) — só a frase:** de *"idempotente por OS (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL` → replay 409 already_invoiced)"* para *"anti-refaturamento por ITEM (carimbo `invoiced_at`/`title_id`, lido sob `FOR UPDATE` e gravado na mesma transação do título) + no máximo 1 título ORIGINAL ativo por OS e direção (índice PARCIAL `(tenant_id,work_order_id,direction) WHERE deleted_at IS NULL AND work_order_id IS NOT NULL AND parent_title_id IS NULL`); itens lançados depois do 1º faturamento viram título COMPLEMENTAR (`parent_title_id` = o original ativo) pela MESMA rota e permissão; replay sem delta → 409 already_invoiced (B-SAN3-02, D-SAN3-02-TITULO-COMPLEMENTAR)"*. Nada mais na linha muda.
- **`pendencias.md`:** `P-Ω4-3-INVOICE-ATOMIC`, `P-Ω4-3-INVOICE-TOCTOU-DELETE`, `P-Ω4-3-REFATURAR-DELTA` → linha nova `status: FECHADA — B-SAN3-02, PR #<n>, merge <sha>` (valor antigo preservado), cada uma citando o teste que a fecha (T-A2, T-R2, T-C1). Novas: `P-SAN3-02-OS-NAO-TRAVADA` (cancelar OS durante faturamento em voo; dono `SAN3-23` ou pós-gate), `P-SAN3-02-PAI-CANCELADO` (A5: produto decide se "cancelar" um título de OS deve "remover" para liberar original novo; dono `SAN3-25`), `P-SAN3-02-DEADLOCK-RESIDUAL` (A4: sem teste determinístico; 503 mapeado; dono `B-ARNES-2` ou pós-gate), `P-SAN3-02-DOWN-COM-COMPLEMENTAR` (operação: o down para na ponta B se houver complementar ativo), `P-SAN3-02-TELA-DELTA` (dono `SAN3-25`: complementares, `parentTitleId`, repetir no 503). Pré-existentes declaradas com evidência de data: `P-Ω4-3-TEST-HERMETIC`, `P-Ω4-3-CURRENCY-BRL`, `P-Ω4-3-INVOICE-LEASTPRIV` (2026-08-11/29).
- **`achados.jsonl`/inventário SAN3:** itens 20 e 21 → fechados com PR e SHA. **KPI:** nada (congelado).
- **`status-geral.md` e `log-execucao.md`:** entrada do bloco com quem achou (críticos r1/r2, junta), quem planejou (`planejador-san3-02-astra` parcial + `planejador-san3-02-fable` v1/v2), quem desenvolveu, modelos declarados, Postgres descartável usado, limpeza em 1 linha.

## §11 Riscos, rollback, o que fica fora, pendências com dono

| risco | mitigação | residual |
|---|---|---|
| R1 — `FOR UPDATE` dos itens serializa PATCH/DELETE/zero contra um faturamento em voo | transação curta (7 passos, sem HTTP/outbox); `withTenantRls` sem budget como os irmãos | PATCH de item **não** faturado espera o faturamento terminar (ms); aceito |
| R2 (v2, A4) — deadlock fatura × `cancel(zero)` | **ordem total `(created_at, id)`** nos dois escritores multi-linha (D2); advisory sempre antes; qualquer 40P01/40001 residual → rollback + **503** repetível (D1) | sem teste determinístico de deadlock; T-Z1/T-Z2 provam os dois arranjos sem ciclo; `P-SAN3-02-DEADLOCK-RESIDUAL` |
| R3 — `DROP INDEX` toma ACCESS EXCLUSIVE breve em `financial_titles`; o índice auxiliar é um `CREATE INDEX` a mais | dentro da transação do `migrate deploy`; tabela pequena | janela de ms em produção (ainda não autorizada) |
| R4 — P2002/P2003 mal mapeados pelo `meta.target` (H2; FK nova) | nome do índice mantém `wo_direction`; `parent` testado antes de `work_order`; T-A4b assere a razão | — |
| R5 — dublê de memória divergir do Postgres | harness de classificação (M8) + as `-db` são a evidência | o dublê **não** prova corrida (contrato) |
| R6 (v2, A8/H11) — o passo 0 lê sem trava | decide só fast-fail/precedência; a unidade re-decide sobre dado travado; M23 só muda precedência | — |
| R7 — legado com `title.amount ≠ Σ itens carimbados` (produto do defeito antigo) | **fora do bloco**: este plano não corrige dado; T-D não varre legado | consulta só-leitura do DBA em ambiente autorizado, se o dono quiser |
| R8 (v2, A6) — FK auto-referente de 4 colunas + índice auxiliar não nomeados na decisão | declarados no §2/§5 como ampliação nominal; C2 ratifica; alternativa (FK de 2 colunas, P3′ vira aplicação) dita na ata se não ratificar | — |

**Rollback:** código por `git revert` do squash (fail-closed sob dados novos, §5); migração pelo down documentado, **duas pontas** (T-D(d) prova a ponta A; a ponta B é decisão humana — §C7.5 proíbe remoção de linha automática).

**Fica fora (dito):** tela de faturar (`SAN3-25`); cheque × título (`SAN3-20`); moeda ≠ BRL; fábrica de memória hermética; least-privilege da rota; estorno/cancelamento de título complementar (fluxo normal de título); "aditar" o original (rejeitado, §2); travar a OS no faturamento; corrigir legado; "cancelar = remover" para títulos de OS (pendência de produto).

## §12 Baseline N e meta M ≥ 2N (v2)

- **N = 16** — `tests/work-order-invoicing.test.ts`, a suíte cujo comportamento o bloco muda; medido **16/16** pelo runner em modo memory na árvore `684e9afd` (caminhos do bloco byte-idênticos à `origin/main`; o dev re-mede na ref antes de editar — passo 0 da bateria). Regressão do módulo: `work-order-financials` **31/31**. Demais suítes do financeiro (contadas por `grep -c '^test('` na ref): titles 64 · titles-routes 15 · title-source 17 · title-invariants-db 16 · uow-memory 8 · uow-journal 4 · financials-routes 8 = **132**, todas a permanecer verdes.
- **M ≥ 32** nas suítes de faturamento (invoicing memória + `atomic-db` + `migration-drill-db`). Planejado na v2: memória **18** (T-A1, T-A3, T-A6, T-M4b, T-M4c, T-C1m, T-C2, T-C3, T-C4, T-C5, T-C8, T-C9a, T-C9b, T-C10, T-PREC, T-PREC2, T-PREC3, +1 uow-memory), `-db` **15** (T-A2, T-A4, T-A4b, T-R1, T-R2, T-R2b, T-R4, T-Z1, T-Z2, T-C1d, T-C6, T-C5-db, T-C9d, T-K4b, T-RLS), drill **5** (T-D a–e) → 16 + 38 = **54 ≥ 32**; mais **11** casos gerados pelo harness para `workOrderItems`. É meta, não contagem publicada: a contagem real vem da execução do dev e é conferida pela C3. (A v1 tinha 27 nomeados; a v2 tem **38**: +T-A4b, T-A6, T-Z1, T-Z2, T-C9a, T-C9b, T-C9d, T-C10, T-PREC2, T-PREC3, T-D(e). Não há mais ramo condicional: Q1/Q2/Q3 estão decididas.)
- **Mutações:** **24** (§7.5), cada uma com o teste que a mata; M16 saiu (equivalente); M3 só morre em memória (dito); M6 morre em T-C9.

## Limpeza desta sessão de planejamento

Nenhum artefato no repositório. Criados **só** no scratchpad da sessão (`…/scratchpad/san302/`, partes da v1 e da v2) — removíveis pelo orquestrador; os entregáveis são `B-SAN3-02-plano.md` (v2) e `B-SAN3-02-plano-v1.md`. Nenhum worktree, contêiner, porta ou banco foi criado em nenhuma das duas rodadas.

## P7

Não recebi `PAUSA`. Se o orquestrador precisar retomar: esta v2 está completa (respostas aos críticos + §0–§12); o próximo passo é a **rodada 2 do crítico** (§8), depois o dev — as decisões do dono já estão tomadas (§2).


---

# ANEXO A — Emenda v2.1 (versionada pelo orquestrador; vale sobre a v2 onde mudar)

# B-SAN3-02 — EMENDA v2.1 ao plano v2 (rodada 2 do crítico: 0 `bloqueia` · 5 `ajuste`)

- **Papel:** `planejador-mestre` (TOPO) · **identidade:** `planejador-san3-02-fable` (a mesma da v1 e da v2; quem planeja emenda — §C7.4-bis). **Modelo:** **Fable 5.1 (`claude-fable-5-1`)**, o do frontmatter; sem fallback.
- **Regra:** `D-EMENDA-ANTES-DO-CODIGO` (dono, 2026-10-17; CLAUDE.md §C2 item 2): o que muda num bloco já planejado entra **primeiro como emenda escrita** (critério de aceite + caminhos afetados), passa pela revisão e **só então** o dev mexe no código. Esta emenda **não reescreve a v2**: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-plano.md` (md5 `ad4e92fad7b2006b8f11523460f018c3`, 500 linhas) continua o plano; **onde esta emenda divergir da v2, vale a emenda**. Cada ajuste cita o trecho da v2 (linha) que substitui.
- **Objeto respondido:** `C:/Users/AMP/erp-pausa-2026-10-03/revisoes/B-SAN3-02-critica-r2-opus.md` (`critico-san3-02-opus`, rodada 2 de 2, Opus 5.5 declarado): **APROVA COM AJUSTES**, B1–B5, todos `dentro-do-bloco`; os dois `bloqueia` da r1 fecharam; G1 (contestação) procede. Esta é a última rodada de crítica; os ajustes **não** exigem v3 para o dev começar, mas o dev começa **por esta emenda**.
- **Onde medi (§A7):** `origin/main = 3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d` (re-`fetch`, inalterada). Novo nesta rodada: `node node_modules/prisma/build/index.js --version` → **prisma 7.8.0**; `… migrate diff --help` → flags `--from-migrations`, `--to-migrations`, `--from-schema`, `--to-schema`, `--from-config-datasource`, `--to-config-datasource`, `--from-empty`/`--to-empty`, `--script`, `--exit-code` (0 vazio · 1 erro · 2 não-vazio) — **não há** `--shadow-database-url` nem `--from-url` nesta versão (B4); `git show origin/main:CLAUDE.md | sed -n '316,323p'` (texto da `D-EMENDA-ANTES-DO-CODIGO`); `git show origin/main:agent-orchestration/controle/decisoes.md | sed -n '3738p'`; `grep -n` na v2 para cada trecho substituído (linhas citadas abaixo). Sem Docker, sem banco, sem porta; repositório não editado.
- **Caminhos afetados por esta emenda (todos já no PERMITIDO da v2 §6; nenhum caminho novo):** `src/modules/work-order-financials/work-order-financial.service.ts` (B1, B2), `src/modules/work-order-financials/work-order-financial-prisma.repository.ts` (B3), `src/modules/financial-titles/financial-title.service.ts` e `financial-title-prisma.repository.ts` (B1, B5), `prisma/migrations/20260878000000_invoice_complementary_title/migration.sql` e `prisma/schema.prisma` (B5 — forma condicionada a Q4), `tests/work-order-invoicing.test.ts` (T-A7, T-C11), `tests/work-order-invoicing-atomic-db.test.ts` (T-Z3), `tests/work-order-invoicing-migration-drill-db.test.ts` (T-D(e) condicional), `agent-orchestration/controle/decisoes.md` (B5, texto da decisão em dois blocos), mandato da C2 (B4).

## Ajuste B1 — o 409 da unidade todo virava `already_invoiced`

**Trecho da v2 substituído.** §3 D1, l.192-193: *"`}).catch(translateUnitFailure)` // translateUnitFailure: P2002 (índice novo) → 409 already_invoiced (isConflictError, l.440, já existe);"* — e §5 l.295: *"P2003 cuja `meta` contenha `parent` → 409 `invalid_parent_title` (FINANCIAL_TITLE_CONFLICT)"*; §6 l.309/314 citam `invalid_parent_title` como 409.

**Texto novo.**
1. `translateUnitFailure` **não** usa `isConflictError` (duck-type só por `statusCode === 409`, `service.ts:440-442`). Ele traduz **só** o erro que o repositório de títulos produz para o índice novo: `isWorkOrderAlreadyInvoicedConflict(e) = statusCode === 409 && reason === "work_order_already_invoiced"` → `alreadyInvoicedError()`. Qualquer outro 409 nascido na unidade (`invoice_items_changed` do passo 7, `source_already_launched`, `title_has_payments`, …) **propaga intacto**. O duck-type antigo `isConflictError` sai do caminho do faturamento (ficava só no `catch` do `createForWorkOrder`, que a unidade substitui); se continuar referenciado em outro lugar, fica como está.
2. A falha de FK do pai **não é conflito de negócio, é referência inválida**, como o resto da tradução P2003 da casa (`financial-title-prisma.repository.ts:474-480`, 400): P2003 cuja `meta` contenha `parent` → **400 `invalid_parent_title_reference`** (`FINANCIAL_TITLE_INVALID`), testado **antes** do ramo `work_order` (o nome das colunas da FK contém `work_order_id`). Um 400 vindo da unidade **propaga** (não é 409; não passa pela tradução do item 1). Inalcançável pelo produto (o serviço só passa o pai que `findActiveByWorkOrder(wo.id, direction)` devolveu); é defesa contra bug, com o código certo.
3. §4: a linha "2º ORIGINAL tentado dentro da unidade → 409 `already_invoiced`" permanece; ganha a linha "referência de pai inválida (só por bug) → **400** `invalid_parent_title_reference`, nada persiste".

**Teste e mutação.**
- **T-A7 (m) — novo:** UoW embrulhada por Proxy: `ctx.titles.create` lança `FinancialTitleError(409, …, "source_already_launched")` (um 409 **alheio**) → `invoice` rejeita com **esse** `reason`, não com `already_invoiced`; 0 títulos, 0 carimbos. 2ª forma: lança `FinancialTitleError(400, …, "invalid_parent_title_reference")` → propaga 400.
- **M24 — nova:** `translateUnitFailure` traduzindo por `statusCode === 409` (o `isConflictError` antigo) → **T-A3** fica vermelho (`invoice_items_changed` viraria `already_invoiced`) e **T-A7** fica vermelho (o 409 alheio viraria `already_invoiced`).
- T-A4b continua asserindo `reason === "already_invoiced"` para o P2002 **real** (H2).

**Critério de aceite:** T-A3, T-A4b e T-A7 verdes; M24 vermelha em T-A3 e T-A7; `git grep -n isConflictError src/modules/work-order-financials` mostra 0 usos no caminho do `invoice` (ou o uso remanescente justificado no relatório do dev).

## Ajuste B2 — na M2 do T-A4 o desfecho real é deadlock, não 23505

**Trecho da v2 substituído.** §7.1, célula "mata" do T-A4, l.344: *"**M2** (sem `FOR UPDATE`: o perdedor não espera, decide "original", bloqueia no índice, 23505 → 409 ≠ 201)"*.

**Texto novo (célula "mata" do T-A4):** *"**M17** (decidir original × complementar **antes** do `FOR UPDATE`: o perdedor decide "original" sem ver T1, bloqueia em i1, e depois do commit do vencedor o INSERT dele bate em T1 já commitado → 23505 → P2002 → 409 ≠ 201 — **determinístico**). Sob a **M2** o T-A4 também fica vermelho, mas por **deadlock**: o perdedor não espera na leitura, decide "original", **insere** o original dele (o vencedor ainda está na barreira, antes do INSERT de T1) e bloqueia no `markInvoiced` em i1; o vencedor então insere T1 e espera a chave única não commitada do perdedor → ciclo → `40P01` com vítima escolhida pelo detector (exceção na conexão crua do vencedor **ou** 503 no perdedor). **Esse vermelho não é determinístico na forma e NÃO conta como vermelho-controle da M2**: a morte determinística da M2 é em **T-R2/T-R2b** e **T-Z2**. No relatório do dev, a M2 aplicada ao T-A4 é registrada como 'vermelho por deadlock (forma variável)', **nunca** como falha de ambiente (lição do 03a: vermelho de arnês ≠ vermelho funcional)."*

**Mutações:** nenhuma nova; a tabela de mutações da v2 (§7.5) passa a atribuir a M2 a T-R2, T-R2b e T-Z2 — **não** a T-A4. A contagem (24) não muda por este ajuste.

**Critério de aceite:** no relatório do dev, a linha da M2 cita T-R2/T-R2b/T-Z2 com `comando → saída → veredito` determinísticos; a linha do T-A4 cita só a M17; a execução da M2 no T-A4, se feita, aparece como nota ("deadlock, forma variável"), fora da contagem obrigatória.

## Ajuste B3 — a ordem total do `zero` não tinha mutação que a derrubasse

**Trecho da v2 substituído.** §3 D2, l.207: *"O ciclo "fatura i1→i2 × zero i2→i1" deixa de existir por construção."*; §7.5 T-ORDER, l.395: *"sem teste determinístico (H9); T-Z1/T-Z2 provam ausência de ciclo nos dois arranjos, não a impossibilidade"*; §10/§11 l.467 e l.476: *"sem teste determinístico"*. Nenhuma das 24 mutações era "voltar ao `updateMany` sem ordem".

**Texto novo.**
- D2 passa a dizer: *"A ordem total `(created_at, id)` nos dois escritores multi-linha **remove o ciclo conhecido** (fatura × `zero`); a prova é o **T-Z3** sob a premissa declarada abaixo, mais a revisão estática da C2 (T-ORDER)."* O "por construção" sai.
- **Premissa de T-Z3 (declarada, verificável pelo próprio teste):** (a) o Postgres aplica `ORDER BY` **antes** de travar em `SELECT … ORDER BY … FOR UPDATE` (docs PG 16, SELECT → *The Locking Clause*: "ORDER BY is applied first … might then block trying to obtain a lock"), logo a trava ordenada segue `(created_at, id)`; (b) um `UPDATE … WHERE` multi-linha **sem** ordem (o `updateMany` da ref, l.105-109) trava na ordem de varredura; numa tabela pequena, depois de um `PATCH` no 1º item, a versão viva dele vai para o **fim** do heap e a varredura (seq scan, ou índice `(tenant_id, work_order_id)` com duplicatas em ordem de TID) visita **i2 antes de i1**. Se (b) não valer no cluster do dev/jurado, o T-Z3 fica **verde sob a mutação** — e isso é registrado como "M19 não derrubada neste cluster", nunca como morte.
- **T-Z3 (db) — novo (B3):** OS com i1 e i2 (i1 criado antes); `PATCH` em i1 (`notes`) para mover a versão viva para o fim do heap; vencedor cru: advisory SHARED → `SELECT … WHERE id = i1 FOR UPDATE` (**só i1**, a 1ª linha na ordem total) → barreira; perdedor real: `financials.zeroActiveItems(wo)` → com o conserto, o `SELECT … FOR UPDATE ORDER BY created_at, id` dele tenta **i1 primeiro** e bloqueia (`waitForOwnBlockedStatement`); vencedor: `SELECT … WHERE id = i2 FOR UPDATE` (livre) → `UPDATE` carimbo de i1 e i2 → commit; perdedor re-avalia (ambos carimbados) → devolve **0**. **Asserções:** nenhum `40P01`/`P2034`/503 em nenhuma conexão; zero devolve 0; i1 e i2 carimbados e não deletados.
- **M19 — nova:** `softDeleteAllByWorkOrder` volta ao `updateMany` sem `SELECT … ORDER BY … FOR UPDATE` (a forma da ref). Sob a premissa (b), o perdedor trava **i2 primeiro** e bloqueia em i1; o vencedor tenta i2 → **ciclo** → `40P01` em um dos lados → a asserção "nenhum 40P01" fica **vermelha**. (A vítima varia; a asserção não.)
- T-Z1/T-Z2 ficam como estão (são os arranjos "um lado já segura tudo"; não provam ordem, provam ausência de ciclo e o CAS).

**Critério de aceite:** T-Z3 verde 3× seguidas com o conserto; M19 vermelha 3× seguidas (pela asserção "nenhum 40P01"); se a M19 **não** ficar vermelha no cluster do dev, o relatório diz isso com o `EXPLAIN` do `UPDATE` sem ordem (ordem de varredura observada) e a pendência `P-SAN3-02-DEADLOCK-RESIDUAL` ganha o fato — o conserto **permanece** (é inócuo e correto), só a prova é rebaixada a revisão estática. §11 R2 passa a citar T-Z3/M19.

## Ajuste B4 — "`prisma migrate diff` limpo" é critério impossível de passar

**Trecho da v2 substituído.** §9, mandato da C2, item (1), l.443: *"…RLS herdada, `prisma migrate diff` limpo;"* — e §8 (2), l.434: *"…e se `prisma migrate diff` fica limpo com o `@@unique` modelado"*.

**Por que era impossível (medido):** a `main` já tem objetos "só no SQL" que o datamodel não modela — índices parciais (`schema.prisma` l.2028-2033) e FKs scalar-only (`WorkOrderComment`, l.1877-1880). Um diff datamodel × banco/migrações **nunca** está vazio neste repositório, com ou sem este bloco. E o Prisma **7.8.0** instalado não tem `--shadow-database-url` nem `--from-url`: `--from-migrations` exigiria a base-sombra do `prisma.config.ts`; o caminho que **se pode** executar no cluster descartável da C2 é `--from-config-datasource` (a base recém-migrada, lida pelo `DATABASE_URL` do config) × `--to-schema prisma/schema.prisma`.

**Texto novo (mandato da C2, item (1), em substituição à frase):** *"`npx prisma validate` ec 0; em base PRÓPRIA (`CREATE DATABASE`, como o drill do 04a): `npx prisma migrate deploy` ec 0 e `npx prisma migrate status` sem migração pendente ou falhada; e o **delta de drift**: rodar `DATABASE_URL=<base própria> npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` **duas vezes** — na base migrada até a `main` (merge-base) e na base migrada até o head do PR — e comparar as duas saídas (normalizadas: uma sentença por linha, aspas e ordem iguais). O diff **da `main`** nunca é vazio (objetos só-SQL pré-existentes); o que se julga é a **diferença entre os dois**, que tem de ser **exatamente**: sai `DROP INDEX "financial_titles_wo_direction_active_key"`; entram `DROP INDEX "financial_titles_wo_direction_original_active_key"` e `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"` (e, se Q4 = SIM, `DROP CONSTRAINT "financial_titles_parent_requires_work_order_check"`); **nada mais** — em particular a coluna `parent_title_id` e (se Q4 = SIM) a chave `financial_titles_tenant_wo_direction_id_key` **não** aparecem, porque estão modeladas no `schema.prisma`. Qualquer linha a mais ou a menos é achado."*

**Teste:** não é teste de código; é item de mandato, por execução da C2 (e o dev registra a mesma medição no relatório, com as duas saídas em anexo). **Mutação (do dev, vermelho-controle do critério):** **M27 — nova:** omitir a coluna `parent_title_id` do `schema.prisma` (deixando-a só na migração) → o delta ganha `ALTER TABLE "financial_titles" DROP COLUMN "parent_title_id"` → critério **vermelho**. É a mutação que prova que o critério enxerga drift novo.

**Critério de aceite:** delta igual à lista nominal acima (variante conforme Q4); M27 vermelha; o §8 (2) da v2 passa a ler "…e se o **delta de drift** fica igual ao declarado".

## Ajuste B5 — o texto da decisão atribuía ao dono a FK de 4 colunas

**Trecho da v2 substituído.** §2, l.146 (parágrafo apresentado como decisão do dono): *"…coluna aditiva e anulável `parent_title_id` (FK composta RESTRICT — **na forma de 4 colunas do §5, que amarra organização, OS e direção**) e o índice…"*; §2 l.150 e §6 l.316: *"ampliação nominal declarada … dentro da autorização de `prisma/` desta decisão; a cadeira C2 (banco) ratifica"*; §11 R8, l.482; tabela de respostas, linha A6, l.19.

**O que é do dono — literal, e só isto (`B-SAN3-02-respostas-do-dono.md`, 2026-10-19):** *"sim para tudo"* às três perguntas da v1 §2, **com o texto que o dono viu**:
- **Q1:** faturar os itens lançados depois do 1º faturamento em títulos complementares, só os itens ainda sem carimbo; título original e itens faturados imutáveis.
- **Q2:** *"a coluna aditiva e anulável `financial_titles.parent_title_id` (FK composta `(tenant_id, parent_title_id) → financial_titles(tenant_id, id)` RESTRICT) — além da troca do índice `financial_titles_wo_direction_active_key`"* — a FK que o dono aprovou é a de **2 colunas**.
- **Q3:** ampliar a fronteira para `src/modules/financial-uow/{financial-uow.ts,financial-uow-prisma.ts,index.ts}`, só para o repositório de itens no contexto da unidade.

**O que é derivação minha (A6 da r1), não palavra do dono:** (i) a FK de **4 colunas** `(tenant_id, work_order_id, direction, parent_title_id) → (tenant_id, work_order_id, direction, id)` no lugar da de 2; (ii) o índice único **auxiliar** `financial_titles_tenant_wo_direction_id_key`, alvo dessa FK; (iii) o **CHECK** `financial_titles_parent_requires_work_order_check`. São três objetos de `prisma/**` que o dono **não nomeou**; o §C4 exige autorização **explícita** para `prisma/**`, e uma cadeira de junta não a substitui. A v2 errou ao embutir (i) no texto da decisão e ao transferir (ii)/(iii) à C2.

**Texto novo.**
1. **`D-SAN3-02-TITULO-COMPLEMENTAR` em `decisoes.md` — dois blocos, rotulados:** **(A) Palavras do dono** (as três respostas acima, literais, com a data e a frase *"sim para tudo"*) e **(B) Derivação do planejador, submetida ao dono como Q4** (os três objetos (i)–(iii), com o motivo: amarrar no banco que o pai é da mesma organização, OS e direção, e que complementar só existe com OS). Nada de (B) aparece como palavra do dono.
2. **Q4 — pergunta ao dono (uma linha, recomendação SIM):** *"Autoriza, no lugar da FK de 2 colunas aprovada na Q2, a FK de 4 colunas `(tenant_id, work_order_id, direction, parent_title_id)`, o índice único auxiliar `(tenant_id, work_order_id, direction, id)` e o CHECK `parent_title_id IS NULL OR (work_order_id IS NOT NULL AND parent_title_id <> id)` — três objetos aditivos em `financial_titles` que fecham no banco o A6 da crítica?"* **Default se não houver resposta antes de o dev escrever a migração: NÃO** — vale a Q2 literal (FK de 2 colunas, sem CHECK, sem índice auxiliar). Um default que amplie `prisma/**` sem o dono é o que o §C4 proíbe.
3. **Consequências por resposta.** **Q4 = SIM:** §5 da v2 vale como está (FK de 4 colunas, índice auxiliar, CHECK); T-D(e) e M22 valem. **Q4 = NÃO/silêncio:** a migração tem só `ADD COLUMN parent_title_id` + FK de 2 colunas `financial_titles_tenant_id_parent_title_id_fkey` + o índice novo + `DROP` do antigo; T-D(e) e M22 **saem**; P3′ ("pai da mesma OS e direção") e "complementar só com OS" passam a **regras da aplicação** com teste próprio (item 4); o down perde as linhas do CHECK e do índice auxiliar.
4. **Em qualquer caso (defesa em profundidade, já no PERMITIDO):** `createForWorkOrderInUnit` valida o pai **na aplicação** antes do INSERT: carrega `ctx.titles.findById(tenantId, parentTitleId)` e exige `workOrderId === input.workOrderId`, `direction === input.direction`, `deletedAt == null` e `parentTitleId == null` (pai é original) — senão **400 `invalid_parent_title_reference`** (o mesmo código do B1). Com Q4 = SIM, a FK é o backstop; com Q4 = NÃO, esta validação é a única âncora de P3′ — e é dito assim na ata.
   - **T-C11 (m) — novo:** `createForWorkOrderInUnit` com `parentTitleId` de título de **outra OS**, de **outra direção**, **removido** e **complementar** (4 subcasos) → 400 `invalid_parent_title_reference`; nada criado.
   - **M26 — nova:** remover a validação do pai na variante → T-C11 vermelho (4/4 em memória; no db, com Q4 = SIM, a FK ainda pega os 2 primeiros — por isso a prova da M26 é a de memória).
5. §11 R8 passa a: *"objetos de `prisma/` derivados do A6 — autorização **só** por Q4 escrita; default NÃO; a C2 **confere**, não autoriza"*. A linha A6 da tabela de respostas da v2 ganha a nota "ver emenda v2.1 B5".

**Critério de aceite:** `decisoes.md` com os blocos (A) e (B) separados e a resposta a Q4 (ou o default datado); migração na forma correspondente; T-C11 verde e M26 vermelha; se Q4 = SIM, T-D(e) verde e M22 vermelha.

## Consolidação — o que esta emenda muda nos números e no fluxo

| item | v2 | v2.1 |
|---|---|---|
| testes novos nomeados | 38 (+11 gerados) | **41** (+11): + **T-A7 (m)** (B1), **T-Z3 (db)** (B3), **T-C11 (m)** (B5); T-D(e) passa a **condicional a Q4 = SIM** (se NÃO, 40) |
| mutações | 24 | **27**: + **M24** (B1), **M19** (B3), **M26** (B5), **M27** (B4, critério de drift); M22 condicional a Q4 = SIM (se NÃO, 26); a M2 deixa de ser atribuída ao T-A4 (B2) |
| §12 meta | 16 + 38 = 54 ≥ 32 | 16 + 41 = **57** (Q4 = SIM) ou 56 (Q4 = NÃO) — meta, não contagem publicada |
| perguntas ao dono em aberto | 0 | **1 — Q4** (B5), com default NÃO e recomendação SIM |
| códigos HTTP novos | 409 `invoice_items_changed`, 503 `invoice_transient_conflict`, 409 `invalid_parent_title` | 409 `invoice_items_changed`, 503 `invoice_transient_conflict`, **400 `invalid_parent_title_reference`** (B1) |
| decisão em `decisoes.md` | um parágrafo "do dono" com a FK de 4 colunas embutida | **(A) palavras do dono** (Q1–Q3 literais) + **(B) derivação do planejador** (Q4) — separados (B5) |
| mandato C2 item (1) | "`prisma migrate diff` limpo" | **delta de drift** nominal, por `migrate diff --from-config-datasource --to-schema --script` em base própria, `main` × head (B4) |

**Ordem de execução (D-EMENDA-ANTES-DO-CODIGO):** (1) o orquestrador leva **Q4** ao dono (uma linha; se não houver resposta até o dev chegar à migração, vale o default NÃO e a ata registra a hora); (2) o dev começa **pela v2 + esta emenda** — D1 com `translateUnitFailure` estreito (B1), T-A4 com a célula do B2, D2 com T-Z3/M19 (B3), variante com validação do pai + T-C11/M26 (B5), migração na forma que Q4 decidir; (3) a C2 recebe o item (1) do mandato na forma do B4; (4) a C3 confere **27** mutações (ou 26) e a linha da M2 em T-R2/T-R2b/T-Z2.

**O que NÃO muda:** o desenho (D1–D6), o contrato do §4 fora das linhas citadas, a bateria do §7.6, a composição da junta, as pendências do §10 (a `P-SAN3-02-DEADLOCK-RESIDUAL` ganha o fato do T-Z3/M19 quando medido), o escopo do §6 (nenhum caminho novo), o KPI (congelado).

**Registro:** esta emenda é versionada pelo orquestrador ao lado do plano (`docs/revisoes/SAN3/B-SAN3-02-emenda-v2.1.md`); o inspetor de terreno exige, no briefing, a v2, esta emenda, as duas críticas e a resposta (ou default datado) de Q4.

**Limpeza desta rodada:** nenhum artefato no repositório; partes desta emenda só no scratchpad da sessão (`…/scratchpad/san302/e21/`). Nenhum worktree, contêiner, porta ou banco. **P7:** não recebi `PAUSA`.


---

# ANEXO B — Emenda v2.2 (versionada pelo orquestrador; vale sobre a v2 e a v2.1 onde mudar)

# B-SAN3-02 — EMENDA v2.2 à emenda v2.1 (reconciliação do critério B4: delta de drift)

- **Papel:** `planejador-mestre` (TOPO) · **identidade:** `planejador-san302-b4-fable` (NOVA; não é a `planejador-san3-02-fable` da v1/v2/v2.1 — §C7.4-bis: quem achou (`rev-san3-02-cdx`, achado 2) ≠ quem planeja (eu) ≠ quem desenvolve). **Modelo:** Fable 5.1 (`claude-fable-5-1`), o do frontmatter; sem fallback.
- **Regra:** `D-EMENDA-ANTES-DO-CODIGO`. Esta emenda substitui **só** o ajuste B4 da v2.1 (`B-SAN3-02-emenda-v2.1.md` l.48-58); B1, B2, B3 e B5 ficam como estão; o plano v2 (`B-SAN3-02-plano.md`, md5 `ad4e92fad7b2006b8f11523460f018c3`) continua o plano. **Onde esta emenda divergir da v2.1 B4, vale esta.**
- **Objeto:** head `c68434a290384eb1dda0dfec55b102bcad42bdab` (ramo `fix/faturamento-atomico-e-delta`, worktree `C:/Users/AMP/w-san3-02`, SÓ LEITURA — `git status --short | wc -l` = **0** no início; no fim, **1** linha ALHEIA: ` M .github/workflows/ci.yml` (+2 linhas, gravada às 10:12Z por outro agente — as duas linhas de `SUITES` do achado 1 da revisão; nenhum comando meu tocou `.github`, e nada mais mudou), merge-base `3fbcaea2ba3cd1d39a42ff8943a2cc0086ef010d`.
- **Terreno (§A7, medido):** `docker ps` → `tl179240411322641-*` (Up 9 min) e `tl179240460423571-*` (Up ~1 min), dois trabalhos Docker **alheios** vivos; memória de commit livre **3,35 GB** (física 1,51 GB). O mandato é "≤ 1 contêiner" e o terreno já estava ocupado: **não subi contêiner nem banco.** As medições abaixo são (i) estáticas, no schema engine que o head executa, e (ii) dinâmicas **sem banco** (`migrate diff --from-empty --to-schema`). A medição **em banco** do delta main×head continua sendo a do dev (relatório l.57), que **não** re-executei — e digo isso onde a cito.

## §0 Objeto e insumos

| insumo | onde | o que diz |
|---|---|---|
| v2.1 B4 | `…/planos/B-SAN3-02-emenda-v2.1.md` l.48-58 | delta main×head "exatamente": sai `DROP INDEX "financial_titles_wo_direction_active_key"`; entram `DROP INDEX "…original_active_key"`, `DROP CONSTRAINT "…parent_title_fkey"` e (Q4 = SIM) `DROP CONSTRAINT "…parent_requires_work_order_check"`; "qualquer linha a mais ou a menos é achado"; M27 = coluna fora do schema → `DROP COLUMN` |
| relatório do dev | `C:/Users/AMP/w-san3-02/docs/revisoes/SAN3/B-SAN3-02-dev.md` l.57, l.82, l.101 | main 217 linhas · head 220; **delta normalizado = 1 linha** `> ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`; coluna e chave auxiliar ausentes; M27 vermelha (`DROP COLUMN`); "premissa do B4 FALSIFICADA em parte" |
| revisão | `…/revisoes/B-SAN3-02-revisao-dev-cdx.md` achado 2 (l.21-27), `ajuste · dentro-do-bloco` | o aceite B4, como escrito, não pode ser declarado cumprido; não demonstra defeito monetário; pede reconciliação formal |
| script do dev | cópia em `…/scratchpad/san302/tmp-san302-copia/drift.sh` (e `schema-main.prisma`) | duas bases (`drift_main`, `drift_head`), `migrate deploy` em cada, `migrate diff --from-config-datasource --to-schema <schema> --script`, normalização (`tr -s`, sem `--`, sem vazias, sem `;`, `sort`), `diff`; M27 por `grep -v` da coluna numa cópia, md5 de restauro |

## §1 A premissa de B4 está falsificada? — SIM, em 3 das 4 sentenças; a 4ª (FK) está confirmada

**(a) Versão e engine que o head executa.**
```
$ cd C:/Users/AMP/w-san3-02 && DATABASE_URL=postgresql://x:x@127.0.0.1:59999/x node node_modules/prisma/build/index.js --version
prisma : 7.8.0 · @prisma/client : 7.8.0 · Node.js : v20.19.5
Schema Engine : schema-engine-cli 3c6e192761c0362d496ed980de936e2f3cebcd3a (at node_modules\@prisma\engines\schema-engine-windows.exe)
```
(O `schema_engine_bg.wasm` em `prisma/build/` é a mesma fonte — as mesmas strings do item (b) aparecem nos dois.)

**(b) O describer do Postgres LÊ o índice parcial, mas o retira do conjunto comparado; o CHECK vai para uma lista só de aviso.**
```
$ grep -a -o -E '.{0,80}indpred.{0,80}' node_modules/@prisma/engines/schema-engine-windows.exe
 indpred, pg_get_expr(rawindex.indpred, rawindex.indrelid) AS predicate
$ grep -a -o -E '.{0,120}stripped_partial.{0,120}' …/schema-engine-windows.exe
 …table_columns…foreign_key_columns indexes stripped_partial_indexes index_columns check_constraints views…
$ grep -a -o -E '.{0,140}[Pp]artial ind.{0,140}' …/schema-engine-windows.exe
 "Partial indexes are a preview feature. Add "partialIndexes" to previewFeatures in your generator block." · "Partial indexes (with a `where` clause) are not …"
$ grep -a -o -E '.{0,120}contype.{0,160}' …/schema-engine-windows.exe
 … constr.contype AS constraint_type, … AND contype NOT IN ('p', 'u', 'f') ORDER BY namespace, table_name, constr.contype, constraint_name …
$ grep -a -o -E '.{0,140}[Cc]heck constraint.{0,140}' …/schema-engine-windows.exe
 "This table contains check constraints and requires additional setup for migrations." · "…Prisma currently does not fully support check constraints…"
```
Leitura: a estrutura descrita tem `indexes` **e** `stripped_partial_indexes` separados — o índice com `WHERE` é lido (`predicate`) e **retirado** de `indexes` (vai para a lista "stripped", que só alimenta o aviso de introspecção e a preview `partialIndexes`); `check_constraints` (consulta `contype NOT IN ('p','u','f')`) é a lista do aviso "requires additional setup". O differ compara `indexes`, `foreign_keys` e colunas — **não** compara `stripped_partial_indexes` nem `check_constraints`. Logo `DROP INDEX` de índice parcial e `DROP CONSTRAINT` de CHECK **nunca saem** do `migrate diff` nesta versão sem a preview ligada.

**(c) A preview `partialIndexes` NÃO está ligada no head.**
```
$ git show HEAD:prisma/schema.prisma | sed -n '1,3p'
generator client {
  provider = "prisma-client-js"
}
$ git grep -n -i partialIndexes HEAD -- prisma/schema.prisma prisma.config.ts package.json   → (vazio)
```

**(d) Lado `to-schema`, sem banco: o datamodel do head não expressa índice parcial, CHECK nem a FK do pai.**
```
$ DATABASE_URL=… node node_modules/prisma/build/index.js migrate diff --from-empty --to-schema prisma/schema.prisma --script > from-empty-head.sql   → ec=0, 4509 linhas
$ grep -n -E 'parent_title_id|financial_titles_tenant_wo_direction_id_key|financial_titles_wo_direction|parent_title_fkey|parent_requires' from-empty-head.sql
1254:    "parent_title_id" UUID,
3080:CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key" ON "financial_titles"("tenant_id", "work_order_id", "direction", "id");
$ grep -c -E 'CREATE (UNIQUE )?INDEX .* WHERE ' from-empty-head.sql   → 0      (nenhum índice parcial é expressável)
$ grep -c -E 'CHECK \(' from-empty-head.sql                             → 0      (nenhum CHECK)
$ grep -c -E 'ALTER TABLE "work_order_comments" ADD CONSTRAINT' …       → 0      (precedente scalar-only: as FKs de WorkOrderComment também não são modeladas → aparecem como DROP no diff da main, classe pré-existente)
$ git show 3fbcaea2:prisma/schema.prisma > …/scratchpad/san302/e22/schema-main.prisma   (md5 76177ff97b7bf23494de3f59541b3805)
$ … migrate diff --from-empty --to-schema …/schema-main.prisma --script > from-empty-main.sql   → ec=0, 4505 linhas
$ diff from-empty-main.sql from-empty-head.sql
1253a1254
>     "parent_title_id" UUID,
3076a3078,3080
> -- CreateIndex
> CREATE UNIQUE INDEX "financial_titles_tenant_wo_direction_id_key" ON "financial_titles"("tenant_id", "work_order_id", "direction", "id");
```
O que o datamodel do head acrescenta ao da main é **exatamente** a coluna e a chave auxiliar — nada mais.

**(e) Derivação do delta (mecanismo) × medição do dev (banco).** Lado banco, main→head (migração `20260878000000`, lida por `git show HEAD:prisma/migrations/20260878000000_invoice_complementary_title/migration.sql`): +coluna (1), +chave auxiliar (2), +FK de 4 colunas (3), +CHECK (4), +índice parcial novo (5), −índice parcial velho (6). Lado datamodel (d): +coluna, +chave auxiliar. Visíveis ao differ: coluna e chave auxiliar (nos dois lados → **cancelam**); FK (só no banco → **`DROP CONSTRAINT`**). Invisíveis (b): os dois índices parciais e o CHECK. **Delta previsto: 1 sentença.** Medido pelo dev em banco descartável (relatório l.57, **não re-executado por mim** — ver "Terreno"): delta = `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`, 1 linha; M27 → `DROP COLUMN "parent_title_id"`, vermelha. **Mecanismo e medição coincidem.**

**(f) Veredito.** A lista nominal da v2.1 B4 era **impossível de cumprir por construção**: 3 das 4 sentenças esperadas não existem na saída do engine 7.8.0, e "qualquer linha a mais ou a menos é achado" reprovava a execução **correta**. A v2.1 mediu as *flags* (`migrate diff --help`, l.6) e **não** mediu o describer; a premissa "o diff enxerga índice parcial e CHECK" entrou sem medição — no próprio ajuste que nasceu para trocar um critério impossível ("diff limpo") por outro. É **artefato do processo, não defeito do produto** (a pergunta do §C7.4). O dev agiu certo: executou, registrou a falsificação (l.101) e **não** reescreveu o critério por conta própria (`D-EMENDA-ANTES-DO-CODIGO`). A revisão também: `ajuste`, não `bloqueia`.

## §2 O que B4 queria proteger, e por onde se prova agora

**A propriedade:** *o que a migração faz no banco e o que o `schema.prisma` declara não divergem além do declarado* — em duas metades, porque o Prisma só enxerga uma delas.

**(P-a) Paridade datamodel × banco para o que o Prisma modela.** A coluna `parent_title_id` e a chave auxiliar `financial_titles_tenant_wo_direction_id_key` têm de estar no `schema.prisma`; senão o cliente gerado não as conhece e o próximo `migrate diff`/`migrate dev` de **qualquer** bloco proporia `DROP COLUMN`/`DROP INDEX` — **perda de dado por drift**. O único instrumento que prova isto é o diff datamodel × banco; o que se julga é o **delta** main × head, e o delta **legítimo** é a FK scalar-only de 4 colunas (declarada no §5 da v2 e no comentário do schema, l.2014-2018 do head; precedente `WorkOrderComment`). Mutações: **M27** (coluna fora do schema → `DROP COLUMN`; já executada, vermelha) e **M27b — nova** (a linha `@@unique([tenant_id, work_order_id, direction, id], map: "financial_titles_tenant_wo_direction_id_key")` fora do schema → o delta ganha `DROP INDEX "financial_titles_tenant_wo_direction_id_key"`). A M27b fecha a metade do critério que a M27 não exercia (a v2.1 só provava que o critério vê a coluna).

**(P-b) Existência e forma exata dos objetos só-SQL no banco migrado** — o Prisma não os vê, logo **só o catálogo e o comportamento** provam. O drill do head já faz isto (`tests/work-order-invoicing-migration-drill-db.test.ts`, lido por `git show HEAD:…`):

| objeto | prova no drill (linha) | mutação que a deixa vermelha (relatório do dev l.72-82) |
|---|---|---|
| índice parcial de originais presente, o velho ausente | l.213 `indexNames(db)` = `NEW_INDEXES`, sem `OLD_INDEX` | **M5b** (índice removido) → l.213 + T-A4b/T-C5-db — VERMELHA |
| predicado do parcial exclui complementares | l.217 `indexdef ~ /parent_title_id IS NULL/`; e **por comportamento** T-D(c) l.284 (2º original → 23505), T-D(b) l.241-244 (legado com 1 deletado sobe — `deleted_at IS NULL` no predicado) | **M5** (predicado sem `parent_title_id IS NULL`) → T-D(c), T-C1d, T-C6 — VERMELHA |
| coluna uuid anulável | l.221 (`information_schema.columns`) | M27 (lado schema) · o `DROP COLUMN` do down em T-D(d) l.263 |
| FK de 4 colunas, RESTRICT | l.229-230 (`pg_get_constraintdef` ~ `FOREIGN KEY (tenant_id, work_order_id, direction, parent_title_id) REFERENCES financial_titles(tenant_id, work_order_id, direction, id)`, `ON DELETE RESTRICT`); comportamento T-D(e) l.302-305 (4 × 23503) | **M22** (FK de 2 colunas) → T-D(a), T-D(e) — VERMELHA |
| CHECK "complementar só com OS, nunca o próprio pai" | l.227 (`constraints.length === 2`), l.231-232 (`contype = 'c'`, def ~ `parent_title_id IS NULL`); comportamento T-D(c) l.285 (sem OS → 23514) e l.287 (pai = si → 23514) | **LACUNA: nenhuma** — o `mutar-db.mjs` do dev tem M5, M5b, M11, M11b, M22; nada remove a sentença (4). → **M28 — nova** (abaixo) |
| down desfaz os 6 objetos; ponta B para em 23505 | T-D(d) l.253-275; T-D(b) l.237-238 | **M11b** (down recria o índice velho com outro nome) → T-D(b), T-D(d) — VERMELHA; M11 (1ª forma) = equivalente, dito |

**M28 — nova (vermelho-controle do CHECK):** no `migration.sql`, remover a sentença (4) (`ADD CONSTRAINT "financial_titles_parent_requires_work_order_check" CHECK (…)`), base NOVA migrada. Esperado: **T-D(c) vermelho pela propriedade** — "complementar sem OS" (l.285) e "pai = si mesmo" (l.287) **inserem** em vez de 23514; secundariamente T-D(a) l.227 (`constraints.length` 1 ≠ 2) e a guarda de forma l.97 (`upStatements()` conta 5 ≠ 6 → T-D(b)/(d) falham por contagem). No relatório, a linha da M28 cita o **23514 ausente** como a morte (enuncia a propriedade); l.227 e l.97 são corroboração (reconhecem forma). Restauro por md5, como as outras.

**Controle do mecanismo (na evidência da C2, uma linha):** no diff da **main**, `grep -c 'DROP INDEX' n-main` para os parciais conhecidos (`financial_titles_wo_direction_active_key`, `financial_titles_source_direction_active_key`, `authority_removal_requests_open_plate_key`) = **0**. Isto registra que o describer não os vê. Se um dia aparecerem (upgrade do Prisma ou preview `partialIndexes` ligada), o critério desta emenda muda — e isso é achado de **ambiente**, não de produto.

## §3 Texto novo do critério B4 (substitui a v2.1 B4 "Texto novo" l.54 e "Critério de aceite" l.58; o "Por que era impossível" l.52 e o método — duas bases próprias, `--from-config-datasource --to-schema --script`, normalização — ficam)

**Mandato da C2, item (1), em substituição à frase da v2.1:** *"`npx prisma validate` ec 0; em base PRÓPRIA (`CREATE DATABASE`, como o drill): `npx prisma migrate deploy` ec 0 e `npx prisma migrate status` sem migração pendente ou falhada; e o **delta de drift**: `DATABASE_URL=<base própria> npx prisma migrate diff --from-config-datasource --to-schema <schema> --script` **duas vezes** — na base migrada até a `main` (merge-base `3fbcaea2`, sem a `20260878000000`, com o `schema.prisma` da `main`) e na base migrada até o head (com o `schema.prisma` do head) — normalizadas (uma sentença por linha, sem comentários e vazias, `;` final removido, ordenadas) e comparadas. O diff da `main` nunca é vazio (objetos só-SQL pré-existentes, inclusive as FKs scalar-only de `work_order_comments`). O delta tem de ser **exatamente uma sentença, só no head**: `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"` — a FK de 4 colunas que o datamodel não modela (scalar-only, §5 da v2, precedente `WorkOrderComment`). **Nem `parent_title_id` nem `financial_titles_tenant_wo_direction_id_key` aparecem** (estão modelados). Os índices parciais (`…wo_direction_active_key`, `…original_active_key`) e o CHECK **não aparecem em nenhum dos dois lados**: o schema engine 7.8.0, sem a preview `partialIndexes` (que o head não liga), retira índices parciais e CHECKs do conjunto comparado (`stripped_partial_indexes`/`check_constraints`). Esses objetos são provados **no drill, pelo catálogo e pelo comportamento** (T-D(a)–(e); §2 (P-b)), não pelo diff. Qualquer sentença a mais ou a menos no delta é achado; `DROP INDEX` de parcial ou `DROP CONSTRAINT` de CHECK no delta é achado de **ambiente** (versão/preview do Prisma mudou), registrado como tal."*

**Vermelho-controle do critério (dev, no relatório, cada um com `comando → saída → veredito` e md5 de restauro):**
- **M27** (coluna fora do `schema.prisma`) → delta ganha `DROP COLUMN "parent_title_id"` — **já executada, vermelha** (l.82).
- **M27b — nova** (o `@@unique` auxiliar fora do `schema.prisma`, mesma técnica do `drift.sh`: `grep -v financial_titles_tenant_wo_direction_id_key` numa cópia) → delta ganha `DROP INDEX "financial_titles_tenant_wo_direction_id_key"` — vermelha.
- **M28 — nova** (migração sem a sentença (4), base nova) → T-D(c) sem os dois 23514 (propriedade); T-D(a) l.227; l.97 — vermelha.

**Critério de aceite (v2.2):** delta = a sentença nominal, 1 e só 1; M27 **e** M27b vermelhas pelo delta; M28 vermelha em T-D(c) pelo 23514 ausente; controle do mecanismo registrado (0 `DROP INDEX` de parcial no diff da `main`); T-D(a)–(e) verdes no lote (5/5 — já medido pelo dev, l.54; a C2 re-executa). O §8 (2) da v2 passa a ler *"…e se o **delta de drift** é exatamente a FK scalar-only declarada"*.

## §4 Exige código/teste novo, ou só reescrita do aceite? — **Só reescrita do aceite + duas execuções de mutação.**

- **Código de produto:** nenhum.
- **Teste novo ou alterado:** nenhum. O drill no head **já** assere todos os objetos só-SQL (§2, linhas citadas) e o comportamento deles (23505/23514/23503); o script de drift **já** existe (`drift.sh` do dev). Mutação é **execução registrada** com restauro, não código versionado.
- **O que é novo:** (i) o aceite (esta emenda); (ii) duas execuções — M27b e M28 — com artefatos existentes, em 1 trabalho Docker (a M28 precisa de base nova migrada; a M27b só do `migrate diff` na base do head, no mesmo lote); (iii) no relatório do dev, 2 linhas na tabela de mutações de banco + 1 linha de controle do mecanismo; a contagem passa a 30.
- **Opcional, NÃO exigido** (para não reabrir código que a revisão já julgou coerente — o risco que o §C7.6 nomeia é um plano fraco reintroduzir defeito): endurecer l.232 do drill para `/parent_title_id <> id/`. T-D(c) l.287 já enuncia essa propriedade por 23514; não vale um ciclo.

**Dependência nomeada (não é achado novo desta emenda):** o valor **contínuo** de (P-b) depende de o drill rodar na CI Postgres — é o **achado 1** da revisão (`SUITES` do `backend-postgres`, `bloqueia`), medido por mim também: `git show HEAD:.github/workflows/ci.yml | grep -n work-order-invoicing` → vazio no commit julgado (`c68434a2`); na árvore de trabalho desse worktree, às 10:12Z, outro agente já apensou as duas linhas `SUITES="$SUITES tests/work-order-invoicing-atomic-db.test.ts"` e `…migration-drill-db.test.ts` — ainda não commitadas, logo ainda não no objeto da junta. Fica com o plano de resolução do achado 1; esta emenda não o duplica. (Nota: o job `backend` roda `npm test` com `DATABASE_URL` — o drill não auto-pula lá —, mas só o `backend-postgres` pune pulos; a revisão está certa em exigir a lista curada.)

**Alternativas rejeitadas (uma linha cada, para a ata):** (a) modelar a FK como `@relation` auto-referente de 4 campos → delta vazio, mas cria campos de relação, muda o cliente gerado e ultrapassa o §6.1 ("1 coluna + 1 `@@unique` + comentário") — fora de autorização (§C4, `prisma/**`); (b) ligar `previewFeatures = ["partialIndexes"]` → o differ passaria a ver **todos** os índices parciais do repositório (≈15 modelos os citam como "só na migration") como drift até serem modelados — config nova, bloco próprio, só se o dono quiser; (c) `--from-migrations` com base-sombra → não há `--shadow-database-url` em 7.8.0 (v2.1 l.6).

## §5 Consolidação (números, mandato da C2, o que NÃO muda)

| item | v2.1 | v2.2 |
|---|---|---|
| mutações | "27" (erro aritmético; o dev contou **28** = 24 + M24, M19, M26, M27 — relatório l.84) | **30** = 28 + **M27b** + **M28** |
| testes nomeados | 41 (+11 gerados) | **inalterado** (o dev entregou 42 + 11; o 42º é T-C8d, dito em l.97 do relatório) |
| critério B4 | lista nominal de 4 sentenças (3 impossíveis) | **1 sentença** (a FK scalar-only); só-SQL provados no drill (P-b) |
| mandato C2 item (1) | "delta igual à lista nominal" | texto do §3 |
| mandato C3 item (2) | "27 mutações com vermelho registrado" | "**30** mutações com vermelho registrado; M11 pela forma M11b; M19 como o B3 mandar" |
| códigos HTTP, decisão, Q4, escopo §6, testes §7, bateria §7.6 | — | **não mudam** |

**Ordem de execução:** (1) o orquestrador versiona esta emenda ao lado das outras (`docs/revisoes/SAN3/B-SAN3-02-emenda-v2.2.md`); (2) o dev (identidade distinta da revisão) roda M27b e M28 num lote Docker **quando o terreno permitir** (≤ 1 trabalho, ≥ 3 GB de commit livre — hoje há dois `tl*` alheios vivos), apensa as 2 linhas e o controle do mecanismo ao relatório, restauro por md5; (3) a C2 recebe o item (1) na forma do §3; (4) a C3 confere 30. Os achados 1 (CI) e 3 (M19 3×) seguem os seus próprios planos; esta emenda só reconcilia B4.

**O que NÃO muda:** D1–D6, §4 e §5 da v2 (a migração fica como está no head), B1/B2/B3/B5 da v2.1, Q4 = SIM, a composição da junta, as pendências do §10, o KPI (congelado).

**Limpeza desta rodada:** nada MEU no repositório nem no worktree (`git status --short` = 0 no início; a única linha no fim, ` M .github/workflows/ci.yml`, apareceu às 10:12Z por obra de outro agente — achado 1 — e não é minha); criados só no scratchpad (`…/scratchpad/san302/e22/`: `schema-main.prisma`, `from-empty-main.sql`, `from-empty-head.sql`, as partes `p1-p7.md` desta emenda) — removíveis. Nenhum contêiner, banco, porta ou worktree. **P7:** não recebi `PAUSA`.

## Resumo para o orquestrador

1. **Premissa de B4 falsificada em 3 das 4 sentenças** — medido no engine do head (7.8.0): índice parcial vai para `stripped_partial_indexes` e CHECK para `check_constraints`, fora do conjunto que o differ compara; a preview `partialIndexes` não está ligada. A 4ª (FK) confirmada. Critério impossível por construção = artefato do processo; o dev e a revisão agiram certo.
2. **Critério novo:** delta main×head = exatamente `ALTER TABLE "financial_titles" DROP CONSTRAINT "financial_titles_parent_title_fkey"`; os objetos só-SQL são provados pelo drill T-D(a)–(e) no catálogo e por 23505/23514/23503 (linhas citadas no §2).
3. **Sem código nem teste novo.** Só o aceite reescrito + 2 execuções de mutação (M27b: `@@unique` fora do schema → `DROP INDEX`; M28: migração sem o CHECK → T-D(c) sem 23514) → 30 mutações.
4. **Não subi Docker** (2 trabalhos `tl*` alheios vivos, 3,35 GB de commit livre); a medição em banco continua a do dev (l.57), coerente com o mecanismo medido.
5. Achado 1 (SUITES da CI) e achado 3 (M19 3×) ficam com os seus planos; esta emenda não os toca.
6. Arquivo: `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-SAN3-02-emenda-v2.2.md`.

---

## §6 Adendo (pergunta do orquestrador, mesma identidade `planejador-san302-b4-fable`, Fable): T-Z3/M19 dependem do plano físico — decisão

**Insumos (lidos no head `98df3c48a60b7f89e29222d78444eaf4a6092d6a` de `C:/Users/AMP/w-san3-02`, só leitura):** `docs/revisoes/SAN3/B-SAN3-02-dev.md` l.133-139 (Achado 3: com M19 e o planner padrão, `Index Scan using work_order_financial_items_tenant_id_work_order_id_idx`, M19 **sobrevive 3×** 17/17; só com `PGOPTIONS="-c enable_indexscan=off -c enable_bitmapscan=off"` fica vermelha 3× no T-Z3); `tests/work-order-invoicing-atomic-db.test.ts` l.264-302 (T-Z3: `addItem` i1, i2 → `UPDATE … SET notes` em i1 → vencedor trava i1 → barreira → trava i2 → `markInvoiced`; perdedor `zeroActiveItems`; asserção "nenhum 40P01/P2034/503"); `src/modules/work-order-financials/work-order-financial-prisma.repository.ts` l.142-162 (`softDeleteAllByWorkOrder`: `SELECT … ORDER BY created_at, id FOR UPDATE` → `updateMany` restrito aos ids travados); `addItem` l.578 (Prisma `create`, `created_at` default `now()`).

**Medição própria — Postgres 16.14 descartável (`tlz3179240635929057-pg`, `--network none`, sem porta, removido pelo nome; só a imagem `postgres:16` do `teste-linux.sh`, sem runner/`npm ci`, porque a medição é de catálogo e planner, não do repo).** Tabela `work_order_financial_items` com os 3 índices reais da `20260803000000` (l.39-45), **5000 linhas de lastro + `ANALYZE`** para o planner padrão escolher Index Scan como no cluster do dev. Scripts `setup.sql`, `visita.sql`, `s1.sql`, `s2-m19.sql`, `s2-fix.sql` e logs `r-R1…R6-*.log` em `…/scratchpad/san302/e22/`.

**(1) Por que a M19 sobrevive sob Index Scan — o diagnóstico do dev, confirmado por mecanismo.**
```
E1 (arranjo atual: i1 created 10:00:00, i2 10:00:01, depois UPDATE notes em i1)
antes do PATCH:  i1 (71,31) · i2 (71,32)
depois do PATCH: i1 (71,35) · i2 (71,32)        pg_stat_user_tables: n_tup_upd 2 · n_tup_hot_upd 2   ← o PATCH é HOT
plano PADRÃO (com lastro): Index Scan using …tenant_id_work_order_id_idx
  ordem de visita Index Scan:  i1 (71,35), i2 (71,32)     ← o índice aponta o TID-RAIZ (71,31) da cadeia HOT: i1 PRIMEIRO
  ordem de visita Bitmap Heap: i1 (71,35), i2 (71,32)     ← idem (TIDs do índice)
  ordem de visita Seq Scan:    i2 (71,32), i1 (71,35)     ← só aqui a "versão viva no fim" conta
corrida R1 (vencedor trava i1 · M19 · plano padrão):  S1 travou i1 → S1 travou i2 → COMMIT; S2 sem erro        → SEM deadlock: M19 SOBREVIVE
corrida R2 (vencedor trava i1 · M19 · Seq Scan forçado): ERROR: deadlock detected … while locking tuple (71,34)  → M19 morre
```
A premissa (b) do B3 da v2.1 ("a varredura sem ordem visita i2 antes de i1") **só vale sob Seq Scan**: Index Scan e Bitmap seguem os TIDs do índice, e um PATCH HOT não muda o TID que o índice conhece. Com estatísticas (tabela com lastro, como em qualquer cluster de suíte depois de alguns testes) o planner padrão escolhe Index Scan — logo a M19 sobrevive **na configuração que a CI executa**. A execução "VERMELHA 1/17" do relatório l.80 é coerente: base recém-migrada, sem estatísticas, Seq Scan.

**(2) Arranjo plano-independente (proposto): i2 inserido DEPOIS de i1 com `created_at` ANTERIOR, sem PATCH.**
```
E2: j1 inserido 1º com created_at 10:00:01 → (71,37); j2 inserido 2º com created_at 10:00:00 → (71,41)
ordem TOTAL (created_at, id): j2, j1          ordem de visita Index Scan: j1, j2 · Seq Scan: j1, j2 · Bitmap: j1, j2   ← TID em QUALQUER plano
EXPLAIN do conserto (SELECT … ORDER BY created_at, id FOR UPDATE): LockRows → Sort (created_at, id) → Index Scan     ← a trava ordenada NÃO depende do plano
corrida R3 (vencedor trava j2 = 1º da ordem total · M19 · plano PADRÃO/Index Scan): ERROR: deadlock detected (71,37)   → M19 morre
corrida R4 (idem · M19 · Seq Scan forçado):                                          ERROR: deadlock detected (71,38)   → M19 morre
corrida R5 (idem · M19 · Bitmap forçado):                                            ERROR: deadlock detected (71,39)   → M19 morre
corrida R6 (idem · CONSERTO · plano padrão): S1 travou j2 → travou j1 → carimbou → COMMIT; S2 (trava ordenada) esperou em j2, re-avaliou → 0 linhas; SEM deadlock
```
Por que vale em qualquer plano: um `UPDATE`/`SELECT … FOR UPDATE` **sem `ORDER BY`** sobre uma tabela trava as linhas na ordem em que a varredura as devolve, e as três varreduras devolvem em **ordem de TID** (btree v4 ordena duplicatas por TID desde o PG 12; bitmap e seq são TID por construção). Só uma cadeia HOT (TID-raiz ≠ TID vivo) faz Index/Bitmap divergirem do Seq — exatamente o que o T-Z3 atual explora. **Sem UPDATE entre a inserção e a corrida, ordem de TID = ordem de inserção**; invertendo o `created_at`, a ordem total fica ≠ da física em todo plano. **Residual, e como o teste o trata:** numa tabela compartilhada e "mexida" (teardowns de outras suítes), uma inserção nova pode cair num line pointer reaproveitado ou numa página anterior via FSM e dar `ctid(i2) < ctid(i1)` — raro; o teste **mede** a premissa (`SELECT ctid`) e refaz o par numa OS nova (limitado), e se não alcançar, **falha dizendo isso** — nunca verde silencioso, nunca skip (guard de zero pulos do `backend-postgres`).

**(a) É defeito do teste que a junta de dinheiro reprovaria?** É defeito da **PROVA** (vermelho-controle), não do produto nem do conserto: a ordem de travas do produto é independente do plano por construção (`LockRows` acima de `Sort` — R6 + `EXPLAIN`); o que depende do plano é a **morte da M19**, e a M19 é a forma da ref. Gravidade: `ajuste · dentro-do-bloco`. Não é dinheiro nem dado: o deadlock residual vira `40P01` → rollback → **503 transiente** (D1, T-A6), nada persiste, repetir é seguro — é disponibilidade. E a própria v2.1 B3 (l.41, l.46) já escrevera o fallback "M19 não derrubada neste cluster → `EXPLAIN` no relatório, prova rebaixada a revisão estática, pendência ganha o fato" — logo, pelo texto do plano, **não há reprovação**; nos ciclos ≥ 3 (`D-GOV-PROPORCIONAL` (2)) nunca bloquearia. **Decido, porém, consertar o teste em vez de rebaixar a prova**: existe arranjo determinístico barato (acima), e "verde que não discrimina o conserto da ref na configuração que a CI roda" é exatamente a classe que a auditoria do §C7.4 chama de guarda que passa sem enunciar a propriedade — uma prova que só funciona sob um plano que a CI não escolhe apodrece em silêncio. O fallback da v2.1 B3 fica **retirado** por esta emenda: se a M19 sobreviver depois do conserto, é teste vermelho = achado, não nota.

**(b) Conserto mínimo de TESTE — só o T-Z3, em `tests/work-order-invoicing-atomic-db.test.ts` (PERMITIDO §6.1); nenhum ajudante compartilhado muda de contrato.**
1. Sai o PATCH (l.268-269) e a premissa "versão viva no fim do heap".
2. Arranjo: `i1 = addItem(t, 10, { createdAt: T0 + 1 s })`, depois `i2 = addItem(t, 20, { createdAt: T0 })` — i2 **inserido depois** com `created_at` **anterior**. `addItem` (l.578) ganha um opcional `createdAt` passado ao `create` do Prisma (`created_at` é coluna com default; nunca por `UPDATE`, que criaria versão nova e mudaria o TID).
3. Premissa **medida**: `SELECT id, ctid FROM work_order_financial_items WHERE id IN (i1, i2)` pelo `h.admin`; comparar `(página, lp)` numericamente e exigir `ctid(i1) < ctid(i2)`. Se não valer (line pointer reaproveitado / página anterior via FSM), descartar o par (DELETE físico dos dois, como o teardown) e repetir com itens novos até 5×; esgotado, `assert.fail("arranjo físico não alcançado em 5 tentativas: ctid(i1) ≥ ctid(i2)")` — vermelho honesto, nunca skip. Registrar os dois `ctid` no log do teste (`console.log`), para o relatório.
4. Vencedor: trava **o 1º da ordem total = i2** (l.277 passa a `${i2}`), barreira, depois **i1** (l.280 passa a `${i1}`); `markInvoiced` dos dois, inalterado. Perdedor (`zeroActiveItems`) inalterado. `waitForOwnBlockedStatement` (l.295) inalterado — com o conserto o zero bloqueia em i2 na `SELECT … FOR UPDATE` ordenada; sob M19 o `UPDATE` trava i1 (1º de TID) e bloqueia em i2: nos dois casos "bloqueado em `work_order_financial_items`", a barreira serve às duas formas.
5. Asserções inalteradas (l.299-302): nenhum `40P01`/`P2034`/503 em nenhuma conexão; zero devolve 0; os dois carimbados e não deletados. Título do teste: *"[T-Z3] ordem total do zero: ordem física (TID) ≠ ordem total (created_at, id) em qualquer plano; o vencedor trava o 1º da ordem total; o zero espera nele; sem 40P01/503"*. Comentário do arranjo cita este §6.
6. **Mutação que fica vermelha no planner padrão — M19, forma inalterada** (`softDeleteAllByWorkOrder` volta ao `updateMany` sem a `SELECT … ORDER BY … FOR UPDATE`): o `UPDATE` visita i1 primeiro (TID), segura-o, bloqueia em i2 (do vencedor); o vencedor pede i1 → ciclo → `40P01` → a asserção "nenhum 40P01" fica vermelha — **determinístico em Index Scan, Seq Scan e Bitmap** (R3/R4/R5). Opcional, não exigido: **M19 (forma 2)** — manter a `SELECT … FOR UPDATE` mas tirar o `ORDER BY` → mesma morte (trava na ordem da varredura).
7. **Rejeitado como conserto:** forçar `enable_indexscan/enable_bitmapscan = off` (por `PGOPTIONS` ou `options=` na conexão do perdedor). Motivos medidos: (i) provaria o conserto só sob um plano que a CI nunca escolhe; (ii) continua dependendo da premissa HOT "line pointer novo depois de i2", que um line pointer reaproveitado numa página mexida quebra — o arranjo por `created_at` + `ctid` medido **não depende de HOT**.

**Critério de aceite (substitui, na v2.1 B3 l.46, só a parte da premissa; o resto do B3 fica):** T-Z3 **verde 3×** com o conserto no planner padrão **e 1×** com `PGOPTIONS="-c enable_indexscan=off -c enable_bitmapscan=off"` (o lado verde também independente do plano); **M19 vermelha 3×** no planner padrão, **sem** `PGOPTIONS`; os `ctid` medidos (i1 < i2) aparecem no relatório em pelo menos uma execução, junto com o `EXPLAIN (COSTS OFF)` do `UPDATE` sem ordem no cluster da suíte (plano observado, para a ata); o fallback "M19 não derrubada → revisão estática" da v2.1 B3 **sai**. `P-SAN3-02-DEADLOCK-RESIDUAL` ganha o fato "T-Z3 plano-independente desde <sha>" e fica aberta só para o residual que o §11 R2 da v2 nomeia (escritores fora do bloco; OS não travada).

**(c) Exige algo de produto?** **Não.** O desenho (`SELECT … ORDER BY created_at, id FOR UPDATE` → `updateMany` restrito aos ids travados, l.142-162) está correto e é independente do plano (R6; `EXPLAIN`: `LockRows → Sort`). Nenhuma mudança de desenho; nenhuma emenda de produto. O `updateMany` sem ordem existe **só como mutação** (M19), não no head.

**Números e papéis:** testes **inalterados** (T-Z3 é modificado, não acrescentado); mutações **30** (M19 permanece; "forma 2" é opcional). Quem conserta o teste: o dev do ciclo seguinte — não `rev-san3-02-cdx` (achou) nem esta identidade (planejou) — §C7.4-bis. Caminho tocado: só `tests/work-order-invoicing-atomic-db.test.ts`.

**Limpeza do adendo:** `tlz3179240635929057-pg` removido pelo nome (`docker rm -f -v`); nenhuma porta, rede ou base viva tocada (`erp-postgres`/`erp-redis` intocados). Restaram na máquina `tl179240640629258-pg` e `-redis` **alheios** (sem `-run`) — reportados, não removidos (`feedback-remocao-por-identificador-de-bloco`). Scratchpad `…/scratchpad/san302/e22/` com SQL e logs, removível. Worktree `w-san3-02`: nada escrito por mim. **P7:** não recebi `PAUSA`.

## Resumo para o orquestrador — adendo §6 (T-Z3/M19)

1. Diagnóstico do dev confirmado por mecanismo em Postgres 16 descartável: o PATCH de `notes` é HOT; Index Scan e Bitmap visitam i1 primeiro pelo TID-raiz; só Seq Scan visita i2 antes — por isso a M19 sobrevive no planner padrão (R1) e morre só sob Seq Scan (R2).
2. (a) Defeito da **prova**, não do produto: `ajuste · dentro-do-bloco`; sem reprovação pelo texto da v2.1 B3, mas decido **consertar o teste** em vez de rebaixar a prova.
3. (b) Conserto mínimo, só no T-Z3: i2 inserido depois de i1 com `created_at` anterior, sem PATCH; premissa `ctid(i1) < ctid(i2)` **medida** (retry limitado, falha honesta); vencedor trava o 1º da ordem total (i2). Medido: M19 morre por `40P01` em Index, Seq e Bitmap (R3/R4/R5); o conserto passa sem deadlock (R6).
4. (c) Produto: **nada** — a trava ordenada é `LockRows → Sort`, independente do plano. `PGOPTIONS` como conserto fica rejeitado (prova só sob plano que a CI não usa e ainda depende de HOT).
5. Aceite: T-Z3 verde 3× no padrão + 1× com Seq Scan forçado; M19 vermelha 3× no padrão; `ctid` e `EXPLAIN` no relatório; fallback "revisão estática" da v2.1 B3 sai. Quem conserta: dev do ciclo seguinte.
6. Contêiner removido; 2 contêineres `tl179240640629258-*` alheios ficaram (reportados). Arquivo: este, §6.


---

# ANEXO C — Respostas do dono (Q1–Q4)

# B-SAN3-02 — respostas do dono às perguntas do plano (2026-10-19)

Palavras do dono, literais: *"sim para tudo"* (resposta às Q1, Q2 e Q3 do `B-SAN3-02-plano.md` §2, apresentadas com recomendação "sim" em cada uma).

- **Q1 = SIM:** faturar os itens lançados depois do 1º faturamento em títulos complementares, só os itens ainda sem carimbo; título original e itens faturados imutáveis. Revê o MECANISMO da `D-Ω4-C2` (o motivo segue).
- **Q2 = SIM:** coluna aditiva e anulável `financial_titles.parent_title_id` (FK composta RESTRICT), além da troca do índice `financial_titles_wo_direction_active_key` por um só para originais.
- **Q3 = SIM:** ampliar a fronteira do bloco para `src/modules/financial-uow/{financial-uow.ts,financial-uow-prisma.ts,index.ts}`, só para pôr o repositório de itens de OS no contexto da unidade.

A registrar em `agent-orchestration/controle/decisoes.md` como `D-SAN3-02-TITULO-COMPLEMENTAR` (no PR do bloco ou no de registro), com estas palavras.

## Q4 (emenda v2.1, B5) — resposta do dono em 2026-10-19

Palavras do dono, literais: *"Q4, sim"*.

- **Q4 = SIM:** no lugar da FK de 2 colunas da Q2, vale a FK de 4 colunas `(tenant_id, work_order_id, direction, parent_title_id)`, o índice único auxiliar `(tenant_id, work_order_id, direction, id)` e o CHECK `parent_title_id IS NULL OR (work_order_id IS NOT NULL AND parent_title_id <> id)` — três objetos aditivos em `financial_titles`. Consequência (emenda v2.1 B5 item 3): §5 da v2 vale como está; T-D(e) e M22 valem; a validação do pai na aplicação (T-C11, M26) fica como defesa em profundidade.
