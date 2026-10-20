executor efetivo: jurado-san302-c1-opus (Claude Code) · modelo: Claude Opus (claude-opus-5-5) · nível: MENOR, declarado (§C7.6) · objeto: 8e6a6c29b8a0aced5bf3968383aa9ef247019f46 · mandato_md5: a157649dc2175b5899ff02241942b7a2 (EOL-neutro = cru) · corpo no objeto: blob .claude bbaed208c7829468239ba2b1b5732865bbb544ed / .agents 54cee9536a850691117d061188648dc4ec155658 · carregado × blob .claude: IDENTICO (md5 EOL-neutro 0668a346…=0668a346…) · corpo .claude × corpo .agents (sem frontmatter e bloco Codex): IDENTICO

# Evidência — Cadeira C1 — B-SAN3-02 ciclo 1 (DINHEIRO)

## 0. Legalidade e objeto

- Objeto por duas fontes: `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` → 8e6a6c29…; `gh pr view 448 --json headRefOid,state` → 8e6a6c29… OPEN. Coincidem.
- `git fetch origin main` → origin/main=2ecfb333aed0a0efcc1f171148473aad2921be66 = merge-base B (início).
- check-runs: `gh api …/commits/8e6a6c29…/check-runs` → total 14, não-verdes/pendentes 0.
- Inspetor: `insp-san302-parecer.md` → LIBERADO COM RESSALVA (2026-10-20T01:52Z, inspetor-san302-opus), nomeia C1 `jurado-san302-c1-opus`, worktree `w-jsan302-c1-`, banco `teste-linux.sh`/`tl…`. Ressalvas aplicáveis: R1 (corpo do blob — cumprido acima), R4 (commit livre ≥3 GB antes de banco/npm ci), R5 (≤1 grupo Docker alheio), R6 (disco ≥10 GB).
- Identidade: `jurado-san302-c1-opus` × 16 inelegíveis do parecer (l.17) → sem colisão. Não votei no B-O6R-02/03a/04a nesta identidade (identidade nova).
- Normas no objeto (`git show 8e6a6c29:agent-orchestration/controle/decisoes.md | grep -n …`): `D-Ω4-C2` → l.609 · `D-Ω4-C1` → l.610 · `REGISTRO-SAN3-CONFLITOS` → l.2316 · `D-GOV-PROPORCIONAL` → l.2940 · `D-SAN3-02-TITULO-COMPLEMENTAR` → l.3765 (+ complemento l.3789) · "sim para tudo" → l.3765/l.3791 (e plano Anexo C l.821+).
- Divergência corpo × plano (§A2, já registrada no mandato): T-A4 do corpo espera 409; o plano v2 (§4 l.245, §7.1 l.344) espera 201 complementar → VALE O PLANO (o mandato manda). T-Z*/M19 ausentes do corpo → cobertos pelo item 3(d) do mandato.

## 0.1 Terreno

- Worktree próprio: `git -C C:/Users/AMP/w-san3-02 worktree add --detach C:/Users/AMP/w-jsan302-c1 8e6a6c29…` → `HEAD is now at 8e6a6c29`; `git status --short` vazio. (O corpo pede prefixo `w-jsan302-c1-<sufixo>`; o orquestrador nomeou `C:/Users/AMP/w-jsan302-c1`, sem sufixo — mesmo prefixo, exclusivo desta cadeira.)
- `npm ci`: o `teste-linux.sh` roda `npm ci` PRÓPRIO dentro do contêiner, sobre a CÓPIA do meu worktree (o tar exclui `node_modules`); no Windows o worktree fica SEM `node_modules` → zero junction/symlink por construção (§C7.1-ter(c)); poupa disco (R6).
- EOL: `core.autocrlf=true`; arquivos de `src/` em disco têm CR (ex.: work-order-financial.service.ts cr_disk=615, cr_blob=0); `git hash-object <arq>` (com filtro) = blob do objeto (1d944e52…, 1a96234a…, c05b6fba…, 573c307f…). Restauro será provado com `git -c core.autocrlf=true hash-object` = `git rev-parse <objeto>:<arq>` dentro da cópia.
- 01:56:07Z: commit livre `(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory/1MB` = 3,79 GB (≥3) · `docker ps` → 1 grupo alheio (`dtrc02-179246130524244-*`) + `erp-postgres`/`erp-redis` (excluídos) · disco `/c` 14 GB livres (≥10).

## 0.2 Leitura do blob (item 1, "mesmo tx")

Comando: `git show 8e6a6c29:src/modules/work-order-financials/work-order-financial.service.ts | awk 'NR>=395&&NR<=495' | grep -n -E 'this\.repository|ctx\.|uow\.run|createForWorkOrderInUnit'` + idem em `financial-title.service.ts` (`createForWorkOrderInUnit`) e `financial-uow-prisma.ts`.
Saída: no `invoice`, `this.repository` só aparece no pré-check SEM escrita (`listInvoiceableByWorkOrder`, l.422); dentro de `uow.run` (l.434): `ctx.assertPeriodOpenShared` (l.436) → `ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate` (l.438) → `ctx.titles.findActiveByWorkOrder` (l.448) → `titleService.createForWorkOrderInUnit(ctx, …)` (l.451) → `ctx.workOrderItems.markInvoiced` (l.465). Em `createForWorkOrderInUnit`: `ctx.assertPeriodOpenShared` (re-chamada) e `return ctx.titles.create(` — 0 `this.repository`. `PrismaFinancialUnitOfWork.run` = UM `withTenantRls(this.prisma, tenantId, async (tx) => …)` e `titles: new PrismaFinancialTitleRepository(tx)` + `workOrderItems: new PrismaWorkOrderFinancialItemRepository(tx)` — o MESMO `tx`. `git grep isConflictError 8e6a6c29 -- src/modules/work-order-financials` → 1 linha, só comentário (l.514).
Veredito parcial: estaticamente, INSERT do título e carimbo no mesmo `tx` da unidade; nenhum `this.repository.create` no caminho. A medir por execução.

## 0.3 Sondas próprias e subida do banco

- Arquivos PRÓPRIOS, só no meu worktree (não rastreados, nunca commitados): `tests/jsan302-c1-sonda-db.test.ts`, `tests/jsan302-c1-sonda-mem.test.ts`, `tests/jsan302-c1-leitores.ts`, `.jsan302-c1/{driver.sh,mut.mjs,q.mjs,hashes.tsv,base/…}` (base = 12 arquivos de `src/` por `git -c core.autocrlf=false show 2ecfb333:<arq>`; `git hash-object --no-filters` de cada um = `git rev-parse 2ecfb333:<arq>`, 12/12). Logs em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/`.
- 02:14:26Z pré-subida: commit livre 3,97 GB (≥3) · grupos Docker alheios (fora `erp-*`) = 0 · disco 14 GB.
- Subida 1 (STAGE=obj): `bash …/ferramentas/teste-linux.sh C:/Users/AMP/w-jsan302-c1 "STAGE=obj bash .jsan302-c1/driver.sh"` → contêineres **MEUS: `tl179246253526570-{pg,redis,run}`** (provado por `docker inspect` do mount = `C:/Users/AMP/w-jsan302-c1`). No mesmo segundo subiu `tl179246253626587-*` com mount `w-jsan302-c2` (cadeira C2, alheio) → 2 grupos na máquina contando o meu (teto 2 do corpo respeitado; o `dtrc02` da R5 já não existia às 02:14Z).
- Subida 1 resultado (log `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/run1-obj.log`, ec=0, 02:18:47Z→02:19:39Z): PG 16.14 descartável (`tlbanco7q`, sem porta publicada); HASHCHECK inicial e final 12/12; suítes do OBJETO: `work-order-invoicing.test.ts` (memória) 35/35 · `work-order-invoicing-atomic-db.test.ts` 17/17 e 17/17 (2 execuções, 0 skip); sondas PRÓPRIAS: mem 8/8, db 15/15, 0 skip; RESTO no cluster `{trg:0, fn:0, tenants:0, roles:0}`. Contêineres removidos pela ferramenta (trap). Falha DO MEU ARNÊS: o `node --test` publica o `console.log` como comentário TAP (`# JSAN_OBS …`) e o meu `grep '^JSAN_OBS'` não o capturou — as observações detalhadas se perderam. Não é insumo de mérito além de "verde"; tudo é re-executado na subida 2 com o grep corrigido (`JSAN_OBS` em qualquer posição).
- 02:19:55Z: commit livre **2,81 GB < 3** (R4) → espera em laço de 2 min (teto 30 min), cada medida em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/r4-espera.log`. Grupo alheio vivo: `tl179246253626587-*` (C2).
- 02:22:24Z commit 3,06 GB, 0 grupos alheios → OK; 02:22:37Z re-medido 3,98 GB, 0 grupos alheios, disco 14 GB. Subida 2 (STAGE=all = objeto + mutações + base): contêineres **MEUS `tl179246297929975-{pg,redis,run}`** (mount `C:/Users/AMP/w-jsan302-c1`). Log `…/jsan302-c1/run2-all.log`.
- Subida 2 resultado (`run2-all.log`, ec=0, 02:23:58Z→02:28:02Z): HASHCHECK inicial OK 12/12; suítes do objeto 35/35 (mem) e 17/17 + 17/17 (`-db`); sondas próprias mem 8/8 e db 15/15, 0 skip; 14 mutações aplicadas uma a uma (cada uma com `MUT … alterado=true · CRLF=true · CR antes/depois`) e restauradas com HASHCHECK OK 12/12 depois de CADA uma; base trocada (12/12 `hash-object --no-filters` = `rev-parse 2ecfb333:<arq>`) e restaurada (HASHCHECK base OK 12/12); RESTO `{trg:0, fn:0, tenants:0, roles:0}`; HASHCHECK final OK.

### Papel sem bypass (regra comum)
`JSAN_OBS ROLE` em CADA processo `-db`: serviço = `o6r_b01_…` com `rolsuper=false`, `rolbypassrls=false` lidos pela PRÓPRIA conexão do serviço (`SELECT … FROM pg_roles WHERE rolname = current_user`); vencedor cru = `postgres` (superusuário, só como vencedor/medidor). Em toda corrida o backend bloqueado em `pg_stat_activity` tem `usename` = o papel efêmero (`PAPEL_EFEMERO`), e no ORD o backend que espera a advisory é o papel (`waiterIsRole:true`). Nota (não-achado): o pré-check FORA da unidade (`resolveWorkOrder`, `titleService.findActiveByWorkOrder`) usa o cliente default da aplicação (`DATABASE_URL`, aqui superusuário) — é leitura; TODA escrita de dinheiro (INSERT do título, carimbo, CAS) passa pela `PrismaFinancialUnitOfWork`/repositório sobre o papel.

## Item 1 — K1 (falha injetada entre o título e o carimbo)

Comandos (dentro de `tl179246297929975-run`, na cópia do worktree): `node --test --import tsx tests/jsan302-c1-sonda-db.test.ts` (K1A, K1B, K1PREC) e `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/jsan302-c1-sonda-mem.test.ts` (MA1, MA3, MA6, MA7, MPREC).

| caso | saída medida no objeto (lida no banco) |
|---|---|
| K1A gatilho `BEFORE UPDATE` em `work_order_financial_items` (WHEN tenant do teste e `OLD.invoiced_at IS NULL AND NEW.invoiced_at IS NOT NULL`) | erro propagou (`jsan302_c1 falha injetada (work_order_financial_items)`, fired=true); antes {títulos 0, carimbos 0, title_id 0, audit 0} → depois {0, 0, 0, audit 0}; órfão 0 |
| irmão positivo (mesmo tenant, gatilho já removido) | 201; 1 título, amount 100 = Σ 100 dos 2 carimbados, `title_id` = T.id nos 2 (`titleMismatch 0`) |
| K1B gatilho `BEFORE INSERT` em `financial_titles` | erro propagou (`… (financial_titles)`); 0 título, 0 carimbo |
| T-A1 (m) Proxy `markInvoiced` lança | o MESMO erro propaga; 0 título, 0 carimbo, 2 ativos |
| T-A3 (m) `markInvoiced` devolve n−1 | `409 invoice_items_changed`; 0/0 |
| T-A6 (m) `{code:P2034}` e `{code:P2010, meta:{code:40P01}}` | `503 invoice_transient_conflict` nas 2 formas; 0/0 |
| T-A7 (m) 409 `source_already_launched` e 400 `invalid_parent_title_reference` injetados em `ctx.titles.create` | propagam INTACTOS (mesmo objeto de erro); 0/0 |
| T-PREC db (papel) e (m) | T1 → competência fechada (`financial_period_closes` status `closed`) → item novo → `422 period_closed`; 1 título; item novo sem carimbo |
| gatilhos/funções | DROP no `finally` com `pg_trigger`/`pg_proc` = 0 por nome; TEARDOWN final `{triggers:0, funcs:0}` |

Vermelho-controle (cada mutação sozinha, restaurada e provada por hash):
- **Base** (`src/` de 2ecfb333, K1A): `fired:true` e **1 título amount 100 com 0 carimbo** (`sigma 0, n 0`) — o defeito `P-Ω4-3-INVOICE-ATOMIC` reproduzido; o irmão "positivo" na base sai `409 already_invoiced` (o título órfão bloqueia o refaturamento). A sonda MEDE.
- **M1** (tirar `uow.run`, sequencial): K1A → 1 título sem lastro (amount 100, Σ 0) = VERMELHO; MA1 → 201 com título+carimbos (a falha injetada no contexto some com a unidade) = VERMELHO.
- **M9** (`return this.repository.create(` em `createForWorkOrderInUnit`): K1A → 1 título sem carimbo = VERMELHO; MA1 → título persiste (titles 1, stamped 0) = VERMELHO.
- **M3** (sem `if (invoicedItemCount !== items.length)`): MA3 → 201 com 1 título e 2 carimbos = VERMELHO. Critério que **no banco NÃO PÔDE falhar**: sob `FOR UPDATE` a contagem nunca diverge (declarado pelo plano); só morre em memória.
- **M20** (sem a tradução transiente): MA6 → `outro P2034` / `outro P2010` (cru) = VERMELHO.
- **M24** (traduz por `statusCode === 409`): MA3 → `409 already_invoiced` (≠ invoice_items_changed) = VERMELHO; MA7 → o 409 alheio vira `already_invoiced` = VERMELHO (o 400 continua 400).

Veredito parcial item 1: **verde no objeto**, com base vermelha e M1/M9/M3/M20/M24 vermelhas. Sem escrita parcial, título = Σ dos carimbados, título e carimbo na mesma transação (estático §0.2 + dinâmico K1A/K1B/M9).

## Item 2 — K2 (item apagado/alterado durante o faturamento)

Comando: `node --test --import tsx tests/jsan302-c1-sonda-db.test.ts` (R1, R2, R2B, R4: N=5 cada, um tenant novo por rodada); vencedor cru (admin) segura a transação até a barreira; perdedor = serviço real sob o papel; `waitForOwnBlockedStatement` + `pg_stat_activity` (`application_name` próprio, `wait_event_type='Lock'`) ANTES da liberação, e o perdedor ainda não liquidado.

| corrida | frequência (denominador 5, 0 skip) | bloqueio provado (rodada 0) | leitura no banco |
|---|---|---|---|
| T-R1 fatura vence × DELETE | `422 item_invoiced` 5/5 | papel, `Lock/transactionid`, `UPDATE … SET deleted_at` | item não apagado e carimbado; 1 título amount 50 = Σ |
| T-R2 DELETE vence × invoice | `201` 5/5 | papel, `Lock/transactionid`, `SELECT id … FOR UPDATE` | total 60, n=1, título 60 = Σ; apagado sem carimbo |
| T-R2b DELETE único × invoice | `422 nothing_to_invoice` 5/5 | papel, no `SELECT … FOR UPDATE` | 0 títulos, 0 carimbos |
| T-R4 fatura vence × PATCH qty 3 | `422 item_invoiced` 5/5 | papel, `UPDATE … SET quantity` | total 50, qty 1, título 50 = Σ |
| T-M4b (m) | update e delete `422 item_invoiced` (reads=2: o serviço releu) | — | carimbado, total 40, não apagado |
| T-M4c (m) | `update`/`softDelete` diretos → `undefined` | — | total 40, não apagado |
| leitor de desfechos (LEIT, linhas fabricadas) | 201 / 409 already_invoiced / 422 item_invoiced / 422 nothing_to_invoice / `outro 40P01` → todos no balde certo | — | — |

Vermelho-controle:
- **Base** (R1 e R2, N=3): R1 → DELETE `201` 3/3, **item carimbado APAGADO** (deleted+stamped); R2 → `201` com **título 100 e Σ carimbada 60** (o apagado entrou no título) 3/3. TOCTOU reproduzido.
- **M2** (sem `…ForUpdate`): R2 `409 invoice_items_changed` 5/5, R2b `409 invoice_items_changed` 5/5, Z2 `409 invoice_items_changed` — VERMELHO determinístico nos três (perdedor agora bloqueia no `UPDATE … invoiced_at`).
- **M4** (softDelete sem `invoiced_at: null`): R1 → `201` 5/5 com o carimbado apagado = VERMELHO.
- **M4′** (update sem o predicado): R4 → `201` 5/5, item vira total 150 qty 3 com título 50 (Σ 150 ≠ 50) = VERMELHO.
- **M4m** (404 cego): MM4b → `404 financial_item_not_found` nas 2 ops; R1 → 404 5/5 = VERMELHO.
- **M4i** (InMemory sem a verificação): MM4c → `update`/`softDelete` devolvem linha = VERMELHO.

Veredito parcial item 2: **verde no objeto**, N=5 por corrida, denominador constante, 0 skip, 0 violação de P5/P2; base e M2/M4/M4′/M4m/M4i vermelhas.

## Item 3 — dois faturamentos na mesma OS; advisory antes do row lock; ordem total

Comandos: subida 2 (`run2-all.log`) e subida 3 (`STAGE=m5b`, `run3-m5b.log`, ec=0; 02:29:02Z pré-subida: commit 4,40 GB, 1 grupo alheio `tl179246310831754-*` (C2), disco 14 GB; o ID `tl…` desta subida não foi anotado antes do `trap` remover os contêineres — o log prova pelo HASHCHECK do meu worktree e o RESTO 0).

| caso | saída no objeto (lida no banco) |
|---|---|
| (a) SYM: 2 `invoice` reais concorrentes, sem barreira | N=10 (subida 1 e 2): `201 + 409 already_invoiced` 10/10; 1 original ativo; 2 carimbos; Σ = lastro; 0 violação |
| (b) T-A4 na forma do PLANO v2 (vale sobre a l.127 do corpo) | N=3: perdedor `201` COMPLEMENTAR, `parentTitleId === T1` (resultado e título), n=1, total 35 = i2; 2 títulos; i1→T1, i2→T2; T1 intacto; bloqueio do perdedor (papel) no `SELECT … FOR UPDATE` provado |
| (b) T-A4b decisão podre | `409 already_invoiced` (P2002 do índice novo traduzido); 1 título; i2 sem carimbo |
| (c) ORD: trava EXCLUSIVA do período segurada (`acquirePeriodLockExclusive`, a peça do `close`) | o backend do invoice (papel) espera em `advisory:ShareLock:granted=false`; os locks dele: só `virtualxid` + a advisory → leitor de row lock = **0** (nenhum `tuple`/`transactionid`/`RowShare`/`RowExclusive` em itens ou títulos); liberada → `201`, 1 título, 2 carimbos |
| (c) estático | `createForWorkOrderInUnit` re-chama `ctx.assertPeriodOpenShared(competencia, periodClosedError)` (§0.2) |
| (d) T-Z1 | zero real devolve 0; 2 carimbados não apagados; sem rejeição em nenhuma conexão |
| (d) T-Z2 | perdedor `422 nothing_to_invoice`; 0 títulos; sem 40P01 |
| (d) T-Z3 (planner padrão, sem `PGOPTIONS`) N=3 | premissa MEDIDA `ctid(i1) < ctid(i2)` na 1ª tentativa: (2,21)<(2,22), (2,25)<(2,26), (2,29)<(2,30); `EXPLAIN (COSTS OFF)` do UPDATE sem ordem = `Update → Seq Scan` (cluster recém-migrado); 3/3 sem rejeição, zero=0, 2 carimbados |
| (d) T-Z3L (5000 linhas de lastro + `ANALYZE`) N=3 | ctid (88,47)<(88,48) etc.; `EXPLAIN` do UPDATE sem ordem = `Update → Index Scan using work_order_financial_items_tenant_id_work_order_id_idx`; 3/3 sem rejeição |
| leitor de `pg_locks` (LEIT, fabricado) | `RowExclusiveLock` em itens → acusa 1; `tuple` em itens → 1; `RowShareLock` em títulos → 1; só advisory+virtualxid → 0; relação alheia → 0; vazio → 0 |

Vermelho-controle:
- **M17** (decisão original × complementar ANTES do `FOR UPDATE`): A4 → `409 already_invoiced` 3/3, 1 título, i2 sem título = VERMELHO determinístico.
- **Ordem invertida** (`FOR UPDATE` antes da advisory, ORDINV): ORD → o backend espera a advisory JÁ segurando `relation:items:RowShareLock` + `transactionid:ExclusiveLock` → leitor acusa 2 = VERMELHO.
- **M4″** (zero sem `invoiced_at IS NULL`): Z1 → zero devolve 2 e APAGA os 2 carimbados = VERMELHO.
- **M19** (zero volta ao `updateMany` sem `SELECT … ORDER BY … FOR UPDATE`), planner padrão SEM `PGOPTIONS`: Z3 → `deadlock detected` 3/3 (Seq Scan) e Z3L → `deadlock detected` 3/3 (Index Scan) = VERMELHO nos dois planos; a revisão independente (M19 viva no planner padrão) NÃO se reproduz no objeto (o commit "tornar o T-Z3 independente do planner" está no objeto e a minha sonda própria, com o arranjo `created_at` invertido + `ctid` medido, mata a M19 em Seq e em Index).
- **M5b** (cluster sem `financial_titles_wo_direction_original_active_key`, `DROP INDEX` no MEU cluster depois do `migrate deploy`; `IDX_DEPOIS []`): SYM continua 10/10 `201 + 409` (a unidade sozinha serializa); A4b → `201` com **2 originais** = VERMELHO (M5b morre no T-A4b).
- **M1 + M5b** ("sem a unidade"): SYM → 10/10 e 20/20 violações: `201 + 409 invoice_items_changed`, **2 originais ativos, um deles amount 100 com Σ 0** (título sem lastro persistido) = VERMELHO em toda rodada.
- **M1 sozinha** (índice recriado, `IDX_FIM` presente): SYM 20/20 `201 + 409 already_invoiced`, 0 violação — o índice de originais é backstop suficiente na corrida simétrica sem barreira; a M1 morre em K1A/MA1 (item 1). Registrado como fato, não como falha da sonda.

Veredito parcial item 3: **verde no objeto**; um só vence; a advisory precede o row lock (medido por `pg_locks`); ordem total `(created_at, id)` sem 40P01 em Seq e Index Scan; M17, ordem invertida, M4″, M19 (3×+3×), M5b (A4b) e M1+M5b (SYM) vermelhas.

## Teardown (02:33Z)

- Contêineres/redes meus restantes (`tl179246253526570`, `tl179246297929975`, subida 3): 0 contêiner, 0 rede (`docker ps -a`, `docker network ls`) — removidos pelo `trap` da ferramenta, com volumes (`rm -f -v`). Nenhum contêiner alheio nem `erp-*` tocado (`erp-postgres`/`erp-redis` seguem vivos); nenhum `prune`; nenhuma porta publicada (5432/6379/3000/5173/5050/8899 intocadas); base viva nunca usada.
- Cluster antes de morrer: `RESTO {trg:0, fn:0, tenants:0, roles:0}` nas 3 subidas (gatilhos/funções `jsan302_c1%` = 0, tenants `jsan302c1-%` = 0, papéis efêmeros = 0).
- Mutações e base: só na cópia `/w` do contêiner; HASHCHECK OK 12/12 depois de cada uma e no fim; meu worktree no Windows nunca foi mutado.
- Worktree: nenhum processo com `w-jsan302-c1` na linha de comando (`tasklist //V`); `git worktree remove --force C:/Users/AMP/w-jsan302-c1` → REMOVIDO; `git worktree list` sem ele; diretório ausente. Sondas próprias foram junto (nunca rastreadas, nunca commitadas).
- Disco depois: 15 GB livres. Logs mantidos em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/` (run1-obj.log, run2-all.log, run3-m5b.log, r4-espera.log).
- Não li voto de outra cadeira. Não commitei. Não proponho correção.
