executor efetivo: jurado-san302c2-c1r-opus (Claude Code, subagente) · modelo: Claude Opus (claude-opus-5-5) · nível: MENOR, declarado (§C7.6) · objeto: 09b380dab54946e16303c8bae0e95bbaa0d667a5 · mandato_md5: b94a928a178bcd542927f9a20ad90fb9 (cru = EOL-neutro) · corpo carregado (git show 09b380da:.claude/agents/especialistas/jurado-san302-c1-atomicidade-e-corrida.md | tr -d '\r', md5 0668a346bc3d828dfdccc551b82c7408) × blob bbaed208 (git cat-file -p | tr -d '\r', md5 0668a346bc3d828dfdccc551b82c7408): IDENTICO

# Evidência — Cadeira C1r (REVALIDAÇÃO da C1, §C7 item 9 regra (2)) — B-SAN3-02 ciclo 2 (DINHEIRO)

Roteiro P3: `git show 09b380da:agent-orchestration/omega/juntas/votos/B-SAN3-02/c1-evidencia.md` e `c1-voto.json` (objeto do ciclo 1 8e6a6c29) — A RE-VERIFICAR, nunca fato. Logs do ciclo 1 em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302-c1/` — A RE-VERIFICAR.
Sondas desta cadeira guardadas em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/` (fora do worktree).

## 0. Legalidade e objeto — IGUAL (re-execução da §0 do ciclo 1, objeto novo)

- Objeto por duas fontes: `git ls-remote origin refs/heads/fix/faturamento-atomico-e-delta` → `09b380dab54946e16303c8bae0e95bbaa0d667a5`; `gh pr view 448 --json headRefOid,state,isDraft,mergeable` → `09b380da…`, OPEN, rascunho=false, MERGEABLE. Coincidem (ciclo 1: 8e6a6c29 por duas fontes — mesma forma, objeto novo).
- check-runs: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/09b380da…/check-runs --jq '.total_count, ([...select(.status != "completed" or .conclusion != "success")] | length)'` → `14` / `0` (ciclo 1: 14/0) → IGUAL.
- `git merge-base origin/main 09b380da` → `9009e81be3c5…` (B do ciclo 2); `origin/main` início = `7f07844c` (andou 1 commit, #452 KPI; não muda o objeto).
- Inspetor: `insp-san302c2-parecer.md` → LIBERADO COM RESSALVA (R-A…R-E), nomeia C1r = `jurado-san302c2-c1r-opus`, worktree `C:/Users/AMP/w-jsan302c2-c1r-…`, banco `teste-linux.sh`/`tl…`. R-A (sondas perdidas → reconstrução = VOTO NOVO) aplicada; R-D (disco) respeitada: sem `npm ci` no Windows.
- Regra que me rege: `git show origin/main:CLAUDE.md | grep -n 'JUNTA: SÓ A CADEIRA'` → l.809 (§C7 item 9; regras (0)–(4) lidas). Identidade `jurado-san302c2-c1r-opus` não está na lista de inelegíveis do inspetor (83 tokens gerados) — sem colisão.
- Corpo de contexto: md5 EOL-neutro do blob `bbaed208` = `0668a346…` = o carregado (1ª linha) → IDENTICO; igual ao do ciclo 1 (`0668a346…`).
- Divergência corpo × plano (§A2, já no mandato): T-A4 vale na forma do plano v2 (201 complementar), não no 409 da l.127 do corpo.

## 0.1 Terreno

- Worktree próprio: `git -C C:/Users/AMP/w-san3-02 worktree add --detach C:/Users/AMP/w-jsan302c2-c1r-a 09b380da…` → `HEAD is now at 09b380da`; `git status --short` = 0 linha. Prefixo `w-jsan302c2-c1r-` do mandato (sufixo `a`).
- `npm ci` próprio DENTRO do contêiner da ferramenta, sobre a cópia do worktree (tar exclui `node_modules`); no Windows o worktree fica SEM `node_modules` (`fsutil reparsepoint query …
ode_modules` → "não pode encontrar o arquivo") → zero junction por construção (§C7.1-ter(c)); poupa ~0,45 GB de disco (R-D).
- 06:41:20Z / 06:48:49Z P8: commit livre 8,14 / 7,91 GB (≥ 4) · `docker ps` = só `erp-postgres`/`erp-redis` (excluídos) → 0 trabalho Docker alheio · disco `/c` 14 / 13 GB (≥ 10).
- Sondas PRÓPRIAS (não rastreadas, nunca commitadas), GUARDADAS em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/` (`tests/jsan302c2-c1r-sonda-{db,mem}.test.ts`, `.jsan302c2-c1r/{driver.sh,mut.mjs,q.mjs,hashes.tsv,base-hashes.tsv,base/}`) e copiadas para o worktree. Base = 12 arquivos de `src/` de `2ecfb333` (B0 = merge-base(8e6a6c29, 9009e81b), o mesmo src da base do ciclo 1) por `git -c core.autocrlf=false show`; `git hash-object --no-filters` de cada um = `git rev-parse 2ecfb333:<arq>` → 12/12. `hashes.tsv` = `git rev-parse 09b380da:<arq>` dos 12 (prova de restauro EOL-neutra: `tr -d '
' < f | git hash-object --stdin`).
- Subida 1 (06:49Z, STAGE=obj): `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-jsan302c2-c1r-a "STAGE=obj bash .jsan302c2-c1r/driver.sh"` → contêineres **MEUS `tl179247896563165-{pg,redis,run}`** (registrados antes do `trap`; `docker inspect` do `-run` monta `C:/Users/AMP/w-jsan302c2-c1r-a`). Log `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/run1-obj.log`.
- Subida 1 resultado (`run1-obj.log`, `teste-linux ec=0`, 06:52:13Z→06:53:05Z): PG 16.14 descartável (alias `tlbanco7q`, sem porta publicada); `HASHCHECK inicial ok=12/12` e `final ok=12/12`; `RESTO [{"trg":"0","fn":"0","tenants":"0","roles":"0"}]`; contêineres removidos pelo `trap`.
- Subida 2 (06:54Z, STAGE=mut, base e m5b em sequência): P8 às 06:54:07Z commit livre 5,38 GB (≥ 4) · 1 trabalho Docker alheio (`tl179247899463276-*`, outra cadeira) + o meu = 2 (teto) · disco 13 GB. Contêineres **MEUS `tl179247925364581-{pg,redis,run}`** (`docker inspect` do `-run` monta `C:/Users/AMP/w-jsan302c2-c1r-a`). Log `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/run2-mut.log`. Antes dela, a sonda db ganhou o `EXPLAIN` do UPDATE sem ordem também pela conexão de superusuário (para comparar com o "Seq Scan" registrado no ciclo 1); cópia atualizada guardada na pasta fora do worktree.

- Subida 2 resultado (`run2-mut.log`, `teste-linux ec=0`, 06:55:43Z→06:59:31Z): STAGE=mut, base e m5b, cada um com `HASHCHECK inicial/final ok=12/12` e `RESTO {trg 0, fn 0, tenants 0, roles 0}`.
- Subidas 3, 4 e 5 (T-Z3/T-Z3L em cluster novo, para medir o plano):
  - 3: `tl179247964465205-*`, 07:00:55Z. P8: 5,06 GB, 1 trabalho alheio + o meu, 13 GB. Abortou no driver com CRLF (`ec=2`); falha do meu arnês, nada executou.
  - 4: `tl179247979265472-*`, 07:03:24Z, `run4-z3.log`. P8: 4,48 GB, 1 alheio + o meu, 13 GB. `ec=0`.
  - 5: `tl179248002465899-*`, 07:07:16Z, `run5-z3b.log`. P8: 4,86 GB, 1 alheio + o meu, 13 GB. `ec=0`.

  O `-run` de cada uma montava `C:/Users/AMP/w-jsan302c2-c1r-a` (`docker inspect`), e os IDs foram registrados antes do `trap`.

### Papel sem bypass (regra comum) — IGUAL
`JSAN_OBS ROLE` (sonda-db, subida 1): serviço = `o6r_b01_1792479168103_c7d7e12c80c8` com `rolsuper=false`, `rolbypassrls=false` lidos pela PRÓPRIA conexão (`SELECT current_user, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`); vencedor/medidor cru = `postgres` (`rolsuper=true`). Em TODA corrida o backend bloqueado em `pg_stat_activity` tem `usename` = o papel (`blocksAllRole:true`), e no ORD o backend que espera a advisory é o papel. Igual ao ciclo 1.

## 0.2 Leitura do blob (item 1, "mesmo tx") — IGUAL

Comando (o mesmo do ciclo 1, nos dois objetos): `git show <obj>:src/modules/work-order-financials/work-order-financial.service.ts | awk 'NR>=395&&NR<=495' | grep -n -E 'this\.repository|ctx\.|uow\.run|createForWorkOrderInUnit'` + `financial-title.service.ts` + `financial-uow-prisma.ts`.
Saída no objeto novo, linhas absolutas: `this.repository.listInvoiceableByWorkOrder` só no pré-check sem escrita (l.422); `uow.run` (l.434) → `ctx.assertPeriodOpenShared` (l.436) → `ctx.workOrderItems.listInvoiceableByWorkOrderForUpdate` (l.438) → `ctx.titles.findActiveByWorkOrder` (l.442 no throw, l.448) → `titleService.createForWorkOrderInUnit(ctx, …)` (l.451) → `ctx.workOrderItems.markInvoiced` (l.465). `createForWorkOrderInUnit` (title service l.145): `ctx.assertPeriodOpenShared` (l.152) e `return ctx.titles.create(` (l.168) — 0 `this.repository` entre l.145 e l.190. `PrismaFinancialUnitOfWork.run` = UM `withTenantRls(this.prisma, tenantId, async (tx) => …)` (l.23) com `titles: new PrismaFinancialTitleRepository(tx)` (l.25) e `workOrderItems: new PrismaWorkOrderFinancialItemRepository(tx)` (l.29). `git grep isConflictError 09b380da -- src/modules/work-order-financials` → 1 linha, só comentário (l.514). As mesmas linhas no 8e6a6c29 (saída do grep idêntica nos dois objetos) → **IGUAL** ao registrado (l.422/434/436/438/448/451/465/514).
Identidade dos 12 arquivos de `src/` (o HASHCHECK 12/12 do ciclo 1): `git diff --stat 8e6a6c29 09b380da -- src/modules/work-order-financials src/modules/financial-titles src/modules/financial-uow src/database` → vazio (0 arquivo) → os 12 são byte-idênticos entre os objetos → **IGUAL**.
Veredito parcial 0.2: estaticamente, INSERT do título e carimbo no mesmo `tx` da unidade; nenhum `this.repository.create` no caminho do `invoice`. REVALIDADO (saída igual).

## Item 1 de 3 — o que se re-executa pelo MESMO comando (§0, §0.2, HASHCHECK 12/12, as três `RUN [obj-…]`) — REVALIDADO (IGUAL)

| comando (o mesmo do ciclo 1, `run2-all.log`) | registrado no ciclo 1 (objeto 8e6a6c29) | medido agora (objeto 09b380da, `run1-obj.log`, cluster migrado pela migração NOVA com `BEGIN;`/`COMMIT;`) | IGUAL/DIFERENTE |
|---|---|---|---|
| objeto por 2 fontes + check-runs (§0) | 2 fontes coincidem; 14 / 0 não-verdes | 2 fontes coincidem (`09b380da`); 14 / 0 | IGUAL |
| leitura estática do blob (§0.2, "mesmo tx"; `this.repository`) | l.422 pré-check sem escrita; `uow.run` l.434; advisory l.436; ForUpdate l.438; findActive l.448; `createForWorkOrderInUnit` l.451; `markInvoiced` l.465; 0 `this.repository.create` no caminho; mesmo `tx` em `financial-uow-prisma.ts` | as mesmas linhas; saída do grep idêntica nos dois objetos | IGUAL |
| identidade dos 12 de `src/` (HASHCHECK 12/12) | 12/12 | `git diff --stat 8e6a6c29 09b380da -- <os 12 + src/database>` vazio; e `HASHCHECK inicial/final ok=12/12` no contêiner contra `git rev-parse 09b380da:<arq>` | IGUAL |
| `RUN [obj-mem-invoicing]` `CORE_SAAS_PERSISTENCE=memory node --test --import tsx tests/work-order-invoicing.test.ts` | ec=0 · 35/35 · fail 0 · skipped 0 | ec=0 · `# tests 35` · `# pass 35` · `# fail 0` · `# skipped 0` | IGUAL |
| `RUN [obj-db-atomic-1]` `node --test --import tsx tests/work-order-invoicing-atomic-db.test.ts` | ec=0 · 17/17 · 0 skip | ec=0 · `# tests 17` · `# pass 17` · `# fail 0` · `# skipped 0` | IGUAL |
| `RUN [obj-db-atomic-2]` (o mesmo, 2ª vez) | ec=0 · 17/17 · 0 skip | ec=0 · 17/17 · `# fail 0` · `# skipped 0` | IGUAL |

Veredito parcial item 1: as 6 execuções que se repetem pelo mesmo comando (3 comandos) e as seções 0 e 0.2 dão saída IGUAL sobre o objeto novo, inclusive com o cluster saído da migração nova. **REVALIDADO.**

## Item 2 de 3 — K1 e K2 por sonda RECONSTRUÍDA — VOTO NOVO (régua do ciclo 2)

A sonda foi reconstruída pelo caso registrado, porque as originais sumiram (R-A). Os comandos ficam registrados e reexecutáveis:
- objeto: `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh <worktree com as sondas> "STAGE=obj bash .jsan302c2-c1r/driver.sh"`;
- mutações, base e M5b: `"STAGE=mut bash …; STAGE=base bash …; STAGE=m5b bash …"`;
- dentro do contêiner: `node --test --test-reporter=tap --import tsx tests/jsan302c2-c1r-sonda-db.test.ts` (seleção por `JC_CASES`, N por `JC_N_<caso>`) e `CORE_SAAS_PERSISTENCE=memory … tests/jsan302c2-c1r-sonda-mem.test.ts`.

Os textos estão em `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/`. O papel sem bypass está provado na seção "Papel sem bypass".

### K1 no objeto (`run1-obj.log`: sonda-mem 8/8 e sonda-db 17/17, 0 skip)

| caso | registrado no ciclo 1 | medido agora | comparação |
|---|---|---|---|
| K1A, gatilho `BEFORE UPDATE` em itens (WHEN tenant do teste ∧ `OLD.invoiced_at IS NULL` ∧ `NEW.invoiced_at IS NOT NULL`) | erro propaga, fired; antes {0,0,0, audit 0} → depois {0,0,0, audit 0}; órfão 0 | `outro P0001: jsan302c2_c1r falha injetada (work_order_financial_items)`, fired=true; antes {títulos 0, carimbos 0, title_id 0, órfão 0, audit 0} → depois idem; `leftover {trg:0, fn:0}` | mesmo desfecho |
| irmão positivo (mesmo tenant, sem gatilho) | 201; 1 título 100 = Σ 100; `titleMismatch 0` | `201`; 1 título, 2 carimbos, 2 title_id, Σtítulo 100 = Σcarimbado 100, `titleMismatch 0` | mesmo desfecho |
| K1B, gatilho `BEFORE INSERT` em `financial_titles` | erro propaga; 0/0 | `… (financial_titles)`, fired=true; 0 título, 0 carimbo; leftover 0/0 | mesmo |
| T-A1 (m), Proxy em que `markInvoiced` lança | o MESMO erro; 0/0; 2 ativos | `sameError:true`; 0 título, 0 carimbo, 2 ativos | mesmo |
| T-A3 (m), contagem n−1 | 409 `invoice_items_changed`; 0/0 | `409 invoice_items_changed`; 0/0 | mesmo |
| T-A6 (m), `{P2034}` e `{P2010, meta.code 40P01}` | 503 `invoice_transient_conflict` nas 2; 0/0 | `503 invoice_transient_conflict` nas 2; 0/0 | mesmo |
| T-A7 (m), 409 `source_already_launched` e 400 `invalid_parent_title_reference` em `ctx.titles.create` | propagam intactos (mesmo objeto); 0/0 | `sameObject:true` nos 2; 0/0 | mesmo |
| T-PREC, db (papel) e (m) | T1 → fechada → item novo → 422 `period_closed`; 1 título; item novo sem carimbo | db: `INSERT financial_period_closes … 'closed'` → `422 period_closed`, 1 título, `freshStamped:false`; mem: idem | mesmo |

Vermelho-controle do K1 (`run2-mut.log`). Cada mutação foi aplicada com âncora única (`alterado=true CRLF=true`), restaurada e provada por `HASHCHECK apos-<M> ok=12/12`:
- **Base** (`src/` de 2ecfb333, `BASE trocada … 12/12`), K1A: fired=true e **1 título amount 100 com 0 carimbo** (`orphanTitles 1, titleMismatch 1`). O POS na base sai `409 already_invoiced`, porque o órfão bloqueia o refaturamento. Igual ao registrado: a sonda MEDE.
- **M1** (o corpo do `invoice` fora da unidade, cada peça na sua transação): K1A → 1 título sem lastro (Σtítulo 100, Σcarimbado 0) = VERMELHO. MA1 → `201` com 1 título e 2 carimbos, porque a falha injetada na UoW some = VERMELHO. Igual ao registrado.
- **M9** (`return this.repository.create(` em `createForWorkOrderInUnit`): K1A → 1 título, 0 carimbo = VERMELHO. MA1 → `sameError`, mas 1 título e 0 carimbo = VERMELHO. Igual ao registrado.
- **M3** (sem a guarda do passo 7): MA3 → `201` com 1 título e 2 carimbos = VERMELHO. No banco a guarda NÃO pôde falhar, porque sob FOR UPDATE a contagem não diverge. É critério que só morre em memória, como registrado.
- **M20** (sem a tradução transiente): MA6 → `outro P2034` e `outro P2010,40P01` = VERMELHO. Igual ao registrado.
- **M24** (traduz por `statusCode === 409`): MA3 → `409 already_invoiced` = VERMELHO. MA7 → o 409 alheio vira `409 already_invoiced` (`sameObject:false`) = VERMELHO; o 400 continua 400. Igual ao registrado.

### K2 no objeto (N = 5 por corrida, um tenant novo por rodada, denominador constante, 0 skip)

| corrida | registrado no ciclo 1 | medido agora (frequência; bloqueio; banco) | comparação |
|---|---|---|---|
| T-R1, fatura vence × DELETE | `422 item_invoiced` 5/5; papel em `Lock/transactionid` no `UPDATE … SET deleted_at`; item não apagado e carimbado; 1 título 50 = Σ | `{"422 item_invoiced":5}`, 0 violação. Bloqueio em TODA rodada: `usename` = papel, `wait_event_type=Lock`, `wait_event=transactionid`, `UPDATE "public"."work_order_financial_items" SET "deleted_at"…`, com o perdedor ainda não liquidado (`settledBefore:false`) | mesmo |
| T-R2, DELETE vence × invoice | `201` 5/5; papel no `SELECT id … FOR UPDATE`; título 60 = Σ; apagado sem carimbo | `{"201":5}`, 0 violação (título 60, Σcarimbado 60, `invoicedItemCount` 1, i1 sem carimbo, 0 apagado-carimbado); bloqueio papel/Lock no `SELECT id FROM work_order_financial_items …` | mesmo |
| T-R2b, DELETE único × invoice | `422 nothing_to_invoice` 5/5; 0/0 | `{"422 nothing_to_invoice":5}`; 0 título, 0 carimbo; bloqueio papel/Lock no SELECT | mesmo |
| T-R4, fatura vence × PATCH qty 3 | `422 item_invoiced` 5/5; total 50, qty 1, título 50 | `{"422 item_invoiced":5}`; total 50, qty 1, título 50; bloqueio papel/Lock no `UPDATE … SET "quantity"` | mesmo |
| T-M4b (m) | update e delete `422 item_invoiced`, reads=2 | update e delete `422 item_invoiced`, `reads:2`; carimbado, total 40, não apagado | mesmo |
| T-M4c (m) | `undefined` nas 2; intacto | `undefined`/`undefined`; total 40, não apagado | mesmo |
| leitor de desfechos (resposta fabricada) | 201 / 409 / 422 item_invoiced / 422 nothing / outro 40P01 nos baldes | `LEIT` 6/6 nos baldes certos (inclui `409 invoice_items_changed`) | mesmo |

Vermelho-controle do K2:
- **Base**, N = 3: R1 → `201` 3/3, com o item **carimbado APAGADO** (`deleted:true, stamped:true`). R2 → `201` 3/3, com **título 100 e Σ carimbada 60**: o apagado entrou no título. TOCTOU reproduzido, igual ao registrado.
- **M2** (sem `FOR UPDATE` na seleção): R2 `409 invoice_items_changed` 5/5, R2b `409 invoice_items_changed` 5/5 e Z2 `409 invoice_items_changed` (perdedor bloqueado no `UPDATE … SET "invoiced_at"`) = VERMELHO nos três. Igual ao registrado.
- **M4** (softDelete sem `invoiced_at: null`): R1 → `201` 5/5, com `deleted:true, stamped:true` = VERMELHO. Igual ao registrado.
- **M4′** (update sem o predicado): R4 → `201` 5/5; o item vai a total 150 e qty 3, com título 50 = VERMELHO. Igual ao registrado.
- **M4m** (404 cego): MM4b → `404 financial_item_not_found` nas 2 ops; R1 → `404 financial_item_not_found` 5/5 = VERMELHO. Igual ao registrado.
- **M4i** (InMemory sem a verificação): MM4c → `update` e `softDelete` devolvem linha, e o item fica apagado = VERMELHO. Igual ao registrado.

Veredito parcial item 2: **VERDE no objeto**, em VOTO NOVO (sonda reconstruída) com a régua do ciclo 2. Todos os desfechos, frequências e vermelhos coincidem caso a caso com a tabela do ciclo 1:
- nenhuma escrita parcial;
- título = Σ carimbada, com título e carimbo na mesma transação;
- o apagado nunca entra no título, e o carimbado nunca é apagado nem alterado (N = 5, perdedor bloqueado provado, papel sem bypass).

Nenhum achado.

## Item 3 de 3 — corrida e ordem de travas por sonda RECONSTRUÍDA — VOTO NOVO (régua do ciclo 2)

Comandos: os mesmos do item 2. Além deles, as subidas 4 e 5 (`STAGE=z3`, `STAGE=z3b`, logs `run4-z3.log` e `run5-z3b.log`) repetem a T-Z3 e a T-Z3L em clusters novos para medir o plano. A subida 3 (`run3-z3.log`, `tl179247964465205-*`) **não executou nada**: o driver ficou com CRLF ao ser reescrito no Windows (`$'\r': command not found`, `teste-linux ec=2`). É falha do MEU arnês, não do produto. Corrigi com `sed -i 's/\r$//'` (CR=0 provado), e a subida 4 refez o estágio.

| caso | registrado no ciclo 1 | medido agora | comparação |
|---|---|---|---|
| (a) SYM: 2 `invoice` reais concorrentes, sem barreira, papel | N=10: `201 + 409 already_invoiced` 10/10; 1 original ativo; 2 carimbos; Σ = lastro; 0 violação | N=10 (`run1`): `{"201 + 409 already_invoiced":10}`, 0 violação (1 título, 1 original ativo, 2 carimbos, todos do vencedor, lastro ok) | IGUAL no desfecho |
| (b) T-A4 na forma do PLANO v2 (vale sobre a l.127 do corpo) | N=3: perdedor `201` COMPLEMENTAR, `parentTitleId === T1`, n=1, total 35 = i2; 2 títulos; i1→T1, i2→T2; T1 intacto; perdedor (papel) bloqueado no `SELECT … FOR UPDATE` | N=3: `{"201":3}`, 0 violação: `parentTitleId` = T1 no resultado e no título, `invoicedItemCount` 1, total 35, 2 títulos, i1→T1, i2→T2, T1 = 100. Bloqueio em toda rodada: papel, `Lock/transactionid` no `SELECT id FROM work_order_financial_items …`, `settledBefore:false` | IGUAL |
| (b) T-A4b, decisão podre | `409 already_invoiced`; 1 título; i2 sem carimbo | `409 already_invoiced`; 1 título, 1 original; i2 sem carimbo | IGUAL |
| (c) ORD: trava EXCLUSIVA do período segurada (`acquirePeriodLockExclusive` de `src/database/financial-period-lock.ts`) | o invoice (papel) espera em `advisory:ShareLock:granted=false`; locks só `virtualxid` + advisory → leitor 0; liberada → 201, 1 título, 2 carimbos | `waiter` = papel (`usename` = `o6r_b01_…`, `wait_event=advisory`, `SELECT pg_advisory_xact_lock_shared(hashtext($1))`). `pg_locks` do pid: `advisory ShareLock granted=false` + `virtualxid ExclusiveLock` → `rowLocks 0`; `settledBefore:false`; liberada → `201`, 1 título, 2 carimbos | IGUAL |
| (c) estático | `createForWorkOrderInUnit` re-chama `ctx.assertPeriodOpenShared` | title service l.152 (§0.2) | IGUAL |
| (d) T-Z1 | zero devolve 0; 2 carimbados não apagados; sem rejeição | `zeroed 0`, 0 apagado, 2 carimbados; bloqueio papel/Lock no SELECT | IGUAL |
| (d) T-Z2 | perdedor `422 nothing_to_invoice`; 0 títulos; sem 40P01 | `422 nothing_to_invoice`; 0 título; vencedor fulfilled; bloqueio papel/Lock | IGUAL |
| (d) T-Z3, planner padrão sem `PGOPTIONS` | N=3; `ctid(i1) < ctid(i2)` medido na 1ª tentativa; `EXPLAIN (COSTS OFF)` do UPDATE sem ordem = `Update → Seq Scan`; 3/3 sem rejeição | N=3+3+3 (`run1`, `run4`, `run5`): `{"ok":3}` em cada uma, sem rejeição em nenhuma conexão, `zeroed 0`, 2 carimbados. Premissa medida na 1ª tentativa: (2,19)<(2,20), (2,23)<(2,24), (2,27)<(2,28); (0,1)<(0,2), (0,5)<(0,6), (0,9)<(0,10); (86,25)<(86,26)… `EXPLAIN` do UPDATE sem ordem, pelo papel e pelo superusuário: **`Index Scan using work_order_financial_items_tenant_id_work_order_id_idx`** nas 9 rodadas | desfecho IGUAL; **forma do plano DIFERENTE** (ver nota) |
| (d) T-Z3L, 5000 linhas de lastro + `ANALYZE` | N=3; `Update → Index Scan using …tenant_id_work_order_id_idx`; 3/3 sem rejeição | N=3+3+3: `{"ok":3}` em cada uma; ctid (88,46)<(88,47), (86,26)<(86,27), (86,13)<(86,14)…; plano `Index Scan using work_order_financial_items_tenant_id_work_order_id_idx` | IGUAL |
| leitor de `pg_locks` (resposta fabricada) | `RowExclusiveLock` em itens → 1; `tuple` em itens → 1; `RowShareLock` em títulos → 1; só advisory+virtualxid → 0; relação alheia → 0; vazio → 0 | `LEITPG` igual, mais `transactionid` → 1 | IGUAL |

Vermelho-controle do item 3 (`run2-mut.log` e `run4-z3.log`, cada um restaurado com `HASHCHECK … ok=12/12`):
- **M17** (decisão original × complementar ANTES do `FOR UPDATE`): A4 → `409 already_invoiced` 3/3, 1 título, i2 sem título = VERMELHO determinístico. O perdedor estava bloqueado (papel, Lock). IGUAL.
- **Ordem invertida** (ORDINV: `FOR UPDATE` antes da advisory): ORD → o backend do papel espera a advisory JÁ segurando `relation work_order_financial_items RowShareLock` + `transactionid ExclusiveLock` (e os `RowShareLock` dos índices) → o leitor acusa `rowLocks 2` = VERMELHO. IGUAL ("RowShareLock + transactionid → 2").
- **M4″** (zero sem `invoiced_at IS NULL`): Z1 → `zeroed 2` e os 2 carimbados APAGADOS (`deletedStamped 2`) = VERMELHO. IGUAL.
- **M19** (zero volta ao `updateMany` sem `SELECT … ORDER BY … FOR UPDATE`), planner padrão sem `PGOPTIONS`. Z3 → `outro 40P01` 3/3 com plano **Seq Scan** (`run2` e `run4`, papel e superusuário). Z3L → `outro 40P01` 3/3 com plano **Index Scan** (`run2` e `run4`). VERMELHO nos dois planos, 6+6 rodadas. IGUAL (3+3 registrado).
- **M5b** (`DROP INDEX financial_titles_wo_direction_original_active_key` no MEU cluster depois do deploy; `IDX_ANTES` = a definição da migração, `IDX_DEPOIS []`). SYM continua 10/10 `201 + 409 already_invoiced`, porque a unidade serializa sozinha. A4B → `201` com **2 originais** e i2 carimbado = VERMELHO (M5b morre no T-A4b). IGUAL.
- **M1 + M5b**: SYM N=10 → 10/10 violações e N=20 → 20/20 violações, todas `201 + 409 invoice_items_changed` com **2 originais ativos**, um deles amount 100 com Σ 0 (título sem lastro persistido) = VERMELHO em toda rodada. IGUAL (30/30).
- **M1 sozinha** (índice recriado; `IDX_FIM` = a mesma definição). SYM N=20 (`m5b`) → 20/20 `201 + 409 already_invoiced`, 0 violação, como registrado. Já em `run2`, M1/SYM N=10 → **1/10 violação** (`201 + 409 invoice_items_changed`: 1 original + 1 complementar de 100 sem lastro) → **DIFERENTE** do "M1 sozinha na SYM verde" do ciclo 1. A mutação morre MAIS, o que fortalece a sonda e nada diz contra o objeto. A M1 morre de todo modo em K1A/MA1 (item 2).

**Nota (forma do plano, DIFERENTE):** o ciclo 1 registrou o `EXPLAIN` do UPDATE sem ordem do objeto como `Seq Scan` na T-Z3. Aqui, em três clusters distintos (inclusive o recém-migrado da subida 4 e o pós-lastro da subida 5), o planner padrão escolheu `Index Scan` para a T-Z3 do OBJETO nas 9 rodadas. O `Seq Scan` só apareceu nas rodadas sob M19 (`run2` e `run4`). A escolha do plano depende das estatísticas do cluster; não forcei plano, para não usar `PGOPTIONS`. O que o mandato pede está cumprido: premissa medida, `EXPLAIN` registrado, T-Z3L em Index Scan, M19 vermelha em Seq e em Index. A propriedade do objeto não depende do plano, por construção medida: no objeto, o zero trava pelo `SELECT … ORDER BY created_at, id FOR UPDATE` (prisma repo l.142-160), e o `LockRows` age sobre a saída ordenada. Quem depende do plano é a forma M19, e ela morreu nas duas. Classifico como diferença de forma da medição, não de desfecho. **Não é achado.**

Veredito parcial item 3: **VERDE no objeto**, em VOTO NOVO com a régua do ciclo 2:
- um só faturamento original vence e o delta vira complementar;
- a advisory precede o row lock (medido por `pg_locks` enquanto o papel espera);
- não há 40P01 em nenhuma conexão (T-Z3 em 9 rodadas, T-Z3L em 9);
- M17, ORDINV, M4″, M19 (Seq e Index), M5b (A4b) e M1+M5b (SYM) ficam vermelhas.

Nenhum achado.

## Teardown (07:10Z)

- **Contêineres e redes meus** (`tl179247896563165`, `tl179247925364581`, `tl179247964465205`, `tl179247979265472`, `tl179248002465899`): 0 contêiner e 0 rede restantes (`docker ps -a`, `docker network ls` filtrados pelos IDs). Foram removidos pelo `trap` da ferramenta, com volumes (`rm -f -v`).
- **O que não toquei:** nenhum contêiner alheio (o `tl179247899463276-*` de outra cadeira seguiu vivo) nem `erp-*` (`erp-postgres`/`erp-redis` vivos). Nenhum `prune`, nenhuma porta publicada; 5432/6379/3000/5173/5050/8899 intocadas e base viva nunca usada.
- **Cluster antes de morrer:** `RESTO [{"trg":"0","fn":"0","tenants":"0","roles":"0"}]` em todas as subidas que executaram: gatilhos e funções `jsan302c2_c1r%` = 0 em `pg_trigger`/`pg_proc`, tenants `jsan302c2c1r-%` = 0, papéis efêmeros `o6r_b01_%` = 0. O índice M5b foi recriado antes do fim (`IDX_FIM`).
- **Mutações e base:** só na cópia `/w` do contêiner, com `HASHCHECK ok=12/12` depois de cada uma e no fim. O worktree no Windows nunca foi mutado (`git diff --stat` vazio antes da remoção).
- **Worktree:** nenhum processo com `w-jsan302c2-c1r` na linha de comando (`tasklist //V` = 0). `git worktree remove --force C:/Users/AMP/w-jsan302c2-c1r-a` → REMOVIDO; `git worktree list` sem ele; diretório ausente.
- **Sondas guardadas** fora do repositório, `cmp`-iguais às do worktree antes da remoção: `C:/Users/AMP/erp-pausa-2026-10-03/jsan302c2-c1r/` (`tests/`, `.jsan302c2-c1r/`, logs `run1-obj.log`…`run5-z3b.log`).
- **Disco depois:** 13 GB livres.
- Não li voto de outra cadeira. Não commitei. Não proponho correção.
