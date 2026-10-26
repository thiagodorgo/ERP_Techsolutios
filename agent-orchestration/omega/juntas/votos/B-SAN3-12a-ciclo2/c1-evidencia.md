papel: cadeira C1 | identidade: jurado-san312a-c1-opus | corpo: jurado-san312a-c1-dinheiro-e-concorrencia | executor: Claude Opus (subagente genérico, corpo lido do blob do objeto) | modelo: Claude Opus 5.5 (claude-opus-5-5) (nível menor, §C7.6; substituição: nenhuma — cobre o Codex por ordem do dono) | objeto: 8a9fc1d8426426403f8642e263b3e932d1738716 | mandato_md5: 5b9304e73774f70b970f95dbc7d06e0e | corpo carregado × blob do objeto: IDENTICO

# Evidência — cadeira C1, junta de DINHEIRO do B-SAN3-12a, ciclo 2 (PR #459)

## Terreno (cabeçalho)
- origin/main no início: aaa9d36a50dfac81a2ce338ef552ab51a0bed650 (= 2º pai do objeto). $SCRATCH = C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c1/
- node v20.19.5 · docker server 29.6.1 · Postgres `PostgreSQL 16.15 on x86_64-pc-linux-musl` (container j12a2-c1-pg, 127.0.0.1:47813) · Redis 7 (j12a2-c1-redis, 127.0.0.1:47814)
- livre em C: 11G (antes do npm ci; ≥ 7 GB) · memória de commit livre: 13 GB (≥ 4 GB) · trabalhos Docker fora de `erp-*` antes de subir: 1 (dev-san322) → o meu é o 2º (teto).
- Variáveis (nomes; nenhum export; prefixo por `run.sh`): DATABASE_URL (senha `***`, aleatória, só por ambiente), REDIS_URL, CORE_SAAS_PERSISTENCE=prisma, C1DB (banco), C1PERS.
- Worktree próprio: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/j12a2-c1-wt 8a9fc1d8…` → HEAD 8a9fc1d8; `.git` existe, `.env` não. `npm ci --no-audit --no-fund` próprio ec=0 (326 pacotes); `prisma generate` ec=0; `node_modules` LinkType vazio (diretório real, sem junction — §C7.1-ter(c)).
- Portas 47813/47814: fora de faixa excluída do `netsh` e sem escuta antes; `docker ps -a` gravado em $SCRATCH/dockerps.txt. Nunca 5432/6379/55432.
- `npx prisma migrate deploy` (meu banco j12a2_c1_main) ec=0; última migração aplicada: `20260882000000_grant_finance_unreconcile_and_cheque_unlink_permissions`.
- Base viva (erp-postgres, erp-redis) e dev-san322 nunca tocados.

## Legalidade
- Parecer `insp-san312a-c2-parecer.md` (inspetor-san312a-c2-opus): **LIBERADO COM RESSALVA** (R1–R7), composição C1/C2b/C3/C4b no objeto 8a9fc1d8, ordem C2b → C4b → C1 → C3, uma por vez; a C2b e a C4b já votaram e removeram o terreno (disparo do orquestrador) → é a minha vez. Nota: o parecer cita `mandato_md5 5eeffbc7…` (o do mandato do inspetor); o meu mandato mede 5b9304e7… sem CR — não é o mesmo arquivo, não é divergência.
- Objeto por duas fontes: `git ls-remote origin refs/heads/feat/web-financeiro-baixa-e-contas-12a` = 8a9fc1d8426426403f8642e263b3e932d1738716; `gh pr view 459` headRefOid = o mesmo, OPEN, rascunho=false, MERGEABLE.
- Bases (1º pai): head-base do bloco `<objeto>~18` = 8a7885f4c3bfab02e6c31b318c1111e262f2907c; head-base da emenda `<objeto>~12` = fafd4b36731ae89574e1d0b3cff6ea34dc78abc7; objeto do ciclo 1 `<objeto>~4` = 04b8a667780930050c8af2c77c323b81fe8794bb.
- Check-runs (`gh api …/commits/8a9fc1d8…/check-runs?per_page=100` → $SCRATCH/checkruns.json): total 14 · não-verdes 0 · pendentes 0. backend ×2 success, backend-postgres ×2 success.
- Onde os `-db` do bloco rodaram: log do job `backend` (push, id 121407042504 → $SCRATCH/ci-backend.log): `ok 259..263 A27-a/b/c/d/f (db…)`, `ok 268/269 A5-bis (db)`, `ok 308..314 A29 (db)`, `ok 542..545 K2-db`; totais `# tests 4079 # pass 4077 # fail 0 # skipped 2` (os 2 skip são RBAC_DB_PARITY, alheios). Os `-db` do bloco rodam no job `backend` (com DATABASE_URL), não pulados.
- Âncoras do CLAUDE.md no objeto (`git show 8a9fc1d8:CLAUDE.md | tr -d '\r' | grep -c -i`): 'Junta proporcional ao risco' 1 · 'Teto de 2 ciclos' 4 · 'A cadeira vermelha é refeita' 1 · 'quem acha NÃO conserta' 1 · 'D-MEDIR-NA-REF-ALVO' 1 · 'Todo voto de cadeira declara' 1.
- Régua: ciclo 2, unanimidade das 4 cadeiras com veto; todo `bloqueia` `dentro-do-bloco` reprova. A C1 vota pela 1ª vez (nada a carregar). Não li votos/evidências de outras cadeiras de nenhum ciclo.

## Item 1 — A27: o CAS do `title_id` lido no 1º vínculo, no `cancel` e no `delete` (A27-a…f)
Runner: `$SCRATCH/run.sh` (prefixo DATABASE_URL/REDIS_URL meus, CORE_SAAS_PERSISTENCE=prisma|memory) e `$SCRATCH/probe.sh` (copia `zz-j12ac1-lib.ts` + a sonda para `<wt>/tests/`, roda, apaga; `git status --porcelain` = 0 depois).

### 1(a) testes do bloco no objeto
- `bash run.sh node --test --import tsx --test-reporter=tap tests/b-san3-12a-link-toctou-db.test.ts` ×3 → rodada 1/2/3: `# tests 5 # pass 5 # fail 0 # skipped 0` (ec=0 nas três). Casos: A27-a (patch→409 cheque_write_conflict), A27-b (cancel→409 transition_conflict), A27-c (delete→409 cheque_write_conflict), A27-d (controle sem corrida), A27-f (paridade sem barreira, 5 rodadas).
- `C1PERS=memory bash run.sh node --test … tests/b-san3-12a-unlink-title.test.ts` → `# tests 17 # pass 17 # fail 0 # skipped 0`; A27-e = casos 8, 9, 10.
- Veredito parcial: verde.

### 1(b) sonda própria com barreira (`$SCRATCH/zz-j12ac1-i1.test.ts`, log `i1-probe-obj.log`)
Vencedor: SQL meu `update cheques set title_id=T1 where id=… and title_id is null` em transação ABERTA (application_name j12ac1-win); perdedor: `ChequeService` padrão (Prisma) como `finance` SEM `cheques:unlink_title` (application_name j12ac1-svc); bloqueio lido por `pg_stat_activity` + `pg_locks` ENQUANTO espera; COMMIT do vencedor; depois pix em T1 pelo `FinancialEntryService.payTitle`; invariante por SQL.
- patch (1º vínculo a T2): bloqueado `wait_event_type=Lock wait_event=transactionid`, `pg_locks` não concedido `transactionid ShareLock` (pid 196 × vencedor 197), query `UPDATE "public"."cheques" SET "title_id" = $1 …` → perdedor **409 cheque_write_conflict**; FINAL title_id=T1, registered, deleted_at null; audit_logs do tenant = [] ; pix T1 → **422 title_has_pending_cheque**; invariante N=0.
- cancel: bloqueado (transactionid ShareLock; `UPDATE … SET "status"`) → **409 transition_conflict**; FINAL T1/registered/vivo; pix 422; N=0.
- delete: bloqueado (transactionid ShareLock; `UPDATE … SET "deleted_at"`) → **409 cheque_write_conflict**; FINAL T1/registered/vivo; pix 422; N=0.
- A27-d sem corrida: 1º vínculo 200 · deposit de vinculado 200 · cancel sem título 200 (cancelled) · DELETE sem título 200 (deletedAt).
- Auditoria: a sonda é de serviço (o controller audita); 0 evento de troca, como esperado.
- Veredito parcial: verde (perdedor nunca 200; FINAL do vencedor; pix 422).

### 1(c) os três desfechos do conflito (mesma sonda, barreira no 1º vínculo)
- vencedor apaga (`deleted_at=now()`) → perdedor **404 cheque_not_found**; vencedor muda para `deposited` → **422 cheque_not_editable**; vencedor vincula a T1 → **409 cheque_write_conflict** (acima). `throwChequeWriteConflict` (cheque.service.ts l.559-564) relê e distingue os três.
- Conferência E1-bis: `grep -n -i -E 'transition\(|softDelete\(|\.update\(' src/modules/cheques/cheque.service.ts` → l.237 `repository.update(input)` (PATCH sem mudança de título: não grava `title_id`), l.248 (1º vínculo, `expectedTitleId`), l.284 (delete, `expectedTitleId`), l.349 (bounce deposited→bounced), l.410 (moveMoneyInUnit), l.479 (flipOnly; `casOnTitle` só no cancel, l.298/485). Caminhos que DECIDEM por `title_id` sem CAS: `clear` (l.312, fast-fail) e `bounce` (l.346). Leitura: o `clear` usa dentro da unidade o `reserved.titleId` devolvido pela transição CAS (l.423/436), não o lido — se o vínculo sumiu no meio, cai no R-res-3 declarado; o `bounce` exige motivo quando LEU título (falha fechado) e um cheque `deposited` não ganha título (o PATCH só edita `registered`). `deposit` não decide por `title_id`. Nenhum caminho decisor ficou sem CAS fora do desenho.
- Veredito parcial: verde.

### 1(d) memória
- A27-e (3 casos) verdes no objeto. Intercalação DETERMINÍSTICA sem relógio: portão por `Promise` (`gatedUow(gate)` no 1º vínculo; repositório delegado com `transition`/`softDelete` esperando o portão no cancel/delete) + um `setImmediate` (cede a vez; não é tempo) para o perdedor ler antes do vencedor escrever; se o perdedor não tivesse lido sem título, o desfecho seria 403 e o caso cairia (o critério não passa por acaso).
- Veredito parcial: verde (exatamente um 200; nunca dois).

### Mutações (protocolo restaurável `$SCRATCH/mut.sh` + `mutate.mjs`: âncora contada = 1, `git diff --numstat` não-vazio, irmão verde, restauro por `git checkout <objeto> -- f` e `hash-object` = blob, status 0)
- A27a-db (tira `...titleCas(input)` do WHERE do `update` Prisma; numstat 1 1) → link-toctou-db `tests 5 pass 3 fail 2`: **A27-a** "patch perdedor: era para recusar e passou" e **A27-f** "rodada 0: exatamente um 200" (pela asserção); A27-b/c/d verdes (carrega). Restaurado.
- A27b-db (tira do WHERE do `transition`) → `pass 4 fail 1`: **A27-b** "cancel perdedor: era para recusar e passou". Restaurado.
- A27c-db (tira do WHERE do `softDelete`) → `pass 4 fail 1`: **A27-c** "delete perdedor: era para recusar e passou". Restaurado.
- A27e-mem (`titleMatches` → `return true`) → unlink-title `tests 17 pass 14 fail 3`: os 3 **A27-e** (pela asserção); os outros 14 verdes. Restaurado.
- MINHA (o serviço deixa de passar o título lido no `cancel`: `}, true);` → `}, false);`, repositório intacto) → link-toctou-db `pass 4 fail 1`: **A27-b** "cancel perdedor: era para recusar e passou". Restaurado. Não é critério que não pode falhar.

### Vermelho-controle no head-base da EMENDA `<objeto>~12` = fafd4b36
- `git -C <wt> checkout fafd4b36731ae89574e1d0b3cff6ea34dc78abc7 -- src/modules/cheques src/modules/financial-uow` (5 arquivos M) → a MESMA sonda (`J12AC1_EXPECT=base`, log `i1-probe-base.log`): patch → perdedor **200** e FINAL **title_id = T2** (vínculo trocado por `finance` sem privilégio); cancel → **200**, cheque `cancelled` COM title_id T1; delete → **200**, cheque excluído COM title_id T1; e o pix em T1 passa (200) nos três. Veredito da sonda: `patch:CAS-FALHOU, cancel:CAS-FALHOU, delete:CAS-FALHOU`.
- A27-e do OBJETO contra a base (`--test-name-pattern='A27-e'`, memória): `tests 17 pass 0 fail 3 skipped 14` — os 3 A27-e vermelhos pela asserção (`expected: false, actual: true` = "nunca dois 200"/"não pode passar"), não por import.
- No objeto, controle do comparador: um FINAL fabricado por mim (title_id trocado para T2 por SQL, T2 marcado pago) → comparador acusa (true) e a consulta do invariante acusa N=1.
- Restauro: `git checkout 8a9fc1d8… -- src tests` → status 0; `hash-object` = blob nos 5 arquivos.

**Veredito parcial do item 1: VERDE.** Nenhum achado.

## Item 2 — A28: o `clear` de título já pago falha fechado (K2 l.189, K2-db l.80, M2 nas duas variantes; F1 `-db`)

### 2(a) testes
- `C1PERS=memory bash run.sh node --test … tests/cheque-title-link.test.ts` → `# tests 38 # pass 38 # fail 0 # skipped 0` (ec=0).
- `bash run.sh node --test … tests/cheque-title-link-atomic-db.test.ts` ×3 → `15|15|0|0` nas três (ec=0) — o F1 `-db` 15/15.
- K2 reescrito (memória, l.213 do objeto; "l.189" do corpo é leitura da cerca): "K2: pix com cheque deposited vinculado → 422 title_has_pending_cheque sem tocar cheque/razão; título pago pelo repositório faz o clear falhar fechado (A28)" — assere pix 422 com `chequeIds`/`nextStep: unlink_cheque`/`requiredPermission: cheques:unlink_title`, cheque `deposited`, `clearedEntryId` vazio, 0 lançamento; depois paga o título pelo REPOSITÓRIO (`applyPaymentGuarded`, por fora do serviço) e exige `clear` → 422 `title_already_paid`, cheque `deposited`, `clearedEntryId` vazio, 0 lançamento, título paid/100.
- K2-db reescrito (l.89 do objeto): "K2-db: pix com cheque deposited vinculado → 422 … e 0 lançamento; título pago por fora → o clear aborta sem segundo lançamento (A28)" — pix 422 e 0 lançamento; título pago pelo vencedor `holdWinner("pay-pix")` commitado; `clear` → 422 `title_already_paid`; cheque `deposited`, `cleared_entry_id` null; só 1 lançamento (o do vencedor); título paid. Mais o T-K2d (barreira) no mesmo arquivo.
- Veredito parcial: verde.

### 2(b) sonda própria (`$SCRATCH/zz-j12ac1-i2.test.ts`, log `i2-probe-obj.log`)
Título 100, cheque 100 vinculado e `deposited` (pelo serviço). Discriminador de defesa sem relógio: o que acontece PRIMEIRO — a promessa liquida, ou aparece statement meu bloqueado em `pg_stat_activity`.
- (A) título pago por SQL meu COMMITADO; eu seguro a linha do CHEQUE (`select … for update`, sem mudar nada) e chamo `clear` → **422 title_already_paid**, "liquidou sem bloquear" no cheque ⇒ respondeu o **fast-fail** (`assertPayable`, fora da unidade); cheque `deposited`, `cleared_entry_id` null; `financial_entries` do tenant = **0**; título paid/100.00. (O invariante acusa N=1 aqui porque EU fabriquei o estado proibido — título pago por fora com cheque pendente — que é a premissa do caso; o sistema não o produziu.)
- (B) título pago em transação ABERTA (UPDATE meu segurando a linha do título) → o `clear` passa o fast-fail (lê pelo pool o título ainda aberto), entra na unidade e **bloqueia** em `UPDATE financial_titles SET paid_amount = paid_amount + …` (o `applyPaymentGuarded`); locks do `clear` bloqueado: `advisory ShareLock` (período), `RowExclusiveLock` em `cheques` (transição já feita) e em `financial_entries` (lançamento já inserido); COMMIT meu → **422 title_already_paid**, rollback de tudo: `financial_entries` = **0**, cheque `deposited`, `cleared_entry_id` null ⇒ respondeu a **defesa sob a trava** (`locked.status === "paid"` em `applyTitlePaymentInUnit`). Invariante do tenant N=0.
- A sonda foi vista acusando: sob o mutante "só a trava" (abaixo) a (B) dá `clear` 200 `cleared` com 1 lançamento `cheque_clearing` de 100.
- Veredito parcial: verde.

### 2(c) nenhum caso apagado (contagem de `test(` por blob)
- `tests/cheque-title-link.test.ts`: base `8a7885f4` = 38, objeto = 38. `tests/cheque-title-link-atomic-db.test.ts`: base 15, objeto 15.
- Renomeados (diff dos nomes): memória 5 — "K1: PATCH vincula e null explícito desvincula…" → "K1: PATCH faz o 1º vínculo; null pelo PATCH não desvincula (403/422)…"; "K2: clear parcial deriva partially_paid" → "K2: cheque menor que o saldo não vincula (422 cheque_amount_mismatch)…"; "K2: título apagado depois do vínculo faz clear falhar fechado" → "K2: título com cheque pendente não se apaga (422)…; apagado pelo repositório, o clear falha fechado"; "K2: título pago depois do vínculo faz clear falhar sem tocar cheque/razão" → "K2: pix com cheque deposited vinculado → 422 …(A28)"; "K3: pagamento misto volta ao parcial…" → "K3: pagamento misto (pix 200 → cheque do saldo 100)…". `-db` 2 — "K2-db: clear parcial deriva partially_paid" → "K2-db: cheque menor que o saldo não vincula…"; "K2-db: título pago antes do clear aborta…" → "K2-db: pix com cheque deposited vinculado → 422 …(A28)". N não diminuiu (= os 5 + 2 da E1.F1).
- Ciclo 2 × A28: o conserto do ciclo 2 tocou `financial-title.service.ts` só nos hunks de `update`/`delete` (`git diff -U0 <objeto>~4 <objeto>`: l.277-320 e 391-450; 0 menções a `assertPayable`) e `cheque.service.ts` só na justificativa (numstat 16 0); o `clear` e o `assertPayable` não mudaram, e (a)/(b) rodaram no objeto com o conserto — nenhum desfecho do A28 mudou.
- Veredito parcial: verde.

### Mutações (`mut.sh`, âncora única CRLF-consciente, numstat, restauro por hash-object)
- **M2-ambas** (fast-fail do `clear` removido E `if (locked.status === "paid") throw` → `return` em `applyTitlePaymentInUnit`; numstat 2 2): memória `38|37|1` — **K2 (A28)** vermelho (`ERR_ASSERTION`); `-db` `15|13|2` — **K2-db (A28)** e **T-K2d** vermelhos (`expected: true, actual: false`). Restaurado (status 0).
- **M2 só o fast-fail** (numstat 1 1): memória 38/38 e `-db` 15/15 **verdes** — prova que a defesa sob a trava sozinha segura o `clear` de título pago (é a defesa que decide sob corrida; o fast-fail é precedência/latência).
- **MINHA — só a defesa sob a trava** (`throw` → `return`, fast-fail intacto; numstat 1 1): memória **38/38 verde** (nenhum caso de memória acusa: em memória o título pago por fora é visto pelo fast-fail); `-db` `15|14|1` — **T-K2d** vermelho (`expected: true, actual: false`); e a minha sonda (B) sob o mesmo mutante fica vermelha (`clear` 200 + 1 lançamento em título pago). Graduação: a defesa sob a trava tem caso que morre sem ela no `-db` (T-K2d) e na sonda; em memória não tem caso próprio porque o fast-fail a cobre deterministicamente — **nota C1-N1**, não bloqueio.

### Vermelho-controle no head-base do BLOCO `<objeto>~18` = 8a7885f4
- `git checkout 8a7885f4… -- src/modules/cheques src/modules/financial-entries src/modules/financial-titles` (15 M) → o K2 reescrito do objeto (`--test-name-pattern` "K2: pix com cheque deposited", memória) `tests 38 pass 0 fail 1 skipped 37` — vermelho pela asserção: "Missing expected rejection." (na base o pix paga o título com cheque pendente vinculado). Restaurado: `checkout <objeto> -- src tests`, status 0, hash-object = blob nos 16 arquivos do diff base→objeto desses módulos.

**Veredito parcial do item 2: VERDE.** Nota C1-N1 (não bloqueia).

## Item 3 — D1 sob concorrência, A5-bis, R-res-1/R-res-3, ordem de travas do A29 e invariante do A4/A4-bis
Sondas próprias: `$SCRATCH/zz-j12ac1-i3.test.ts` (D1, A5-bis, ordem de travas, cruzamentos, dois cheques, controle) e `$SCRATCH/zz-j12ac1-i3b.test.ts` (barreiras D, R, W). Rodadas por `probe.sh`; status do worktree 0 depois de cada uma. O lib ganhou `statement_timeout=15s` nos clientes de leitura e `releaseAllHolds()` no `finally` depois de uma execução minha travar no meu próprio arranjo (o SQL de preparo, com FK, esperava a minha trava `FOR UPDATE` do título); essa execução foi morta, e os 3 tenants que ela deixou foram removidos por id (`delete … where tenant_id='<id>'`, sem curinga). Defeito da sonda, não do objeto.

### 3(a) D1 como dinheiro (sonda i3 `d1`, Postgres, `tenant_admin` COM `cheques:unlink_title`) — log `i3-probe-a.log`
- PATCH `{title_id: null}` → **422 cheque_linked_unlink_first**; PATCH `{title_id: T2}` → **422 cheque_linked_unlink_first**; depois dos dois, a linha segue `title_id = T1`, `registered`; pix em T1 → **422 title_has_pending_cheque**.
- `unlinkTitle` com justificativa → **200 `titleId: null`** (registered, sem aviso); PATCH do 1º vínculo depois (para T2) → **200**; cheque `deposited` desvinculado → **200** com `warning: "cheque_still_depositable"`. Invariante N=0.
- A auditoria fica no controller. A sonda é de serviço, então a auditoria da rota vem do teste HTTP do dev `A5/A6/A20 (HTTP)`, que está verde nas 17/17 do item 1. O 403 × 422 por ator é da C2b.
- Enumeração por script (`node -e` sobre os fontes do objeto):
  - Rotas de cheque: N=10 — GET /cheques · POST /cheques · GET/PATCH/DELETE /cheques/:id · POST deposit · cancel · clear · unlink-title · bounce.
  - Métodos que GRAVAM `title_id`: N=3 no Prisma (`create`, `update`, `unlinkTitle`) e N=3 na memória (os mesmos). O serviço os chama em 5 pontos: `repository.create`, `ctx.cheques.create` (o 1º vínculo no POST), `repository.update` (l.237, só sem mudança de título, porque `titleId` ali é sempre `undefined`), `ctx.cheques.update` (o 1º vínculo no PATCH, com CAS) e `repository.unlinkTitle` (só pela rota `unlink-title`, com `cheques:unlink_title`).
  - O único caminho que grava `title_id = null` é `unlinkTitle`. A FK `cheques_tenant_id_title_id_fkey` é `ON DELETE RESTRICT`, então apagar o título não desvincula.
- Veredito parcial: verde.

### 3(b) A5-bis no meu Postgres
- Testes do dev: `tests/b-san3-12a-pay-link-race-db.test.ts` ×3 → `6|6|0|0` (A5-bis (db) e A5-bis (db, CAS) inclusos).
- Sonda, sentido 1, com o CLEAR em voo. Eu seguro a linha do título; o `clear` faz a transição do cheque e bloqueia no INSERT do lançamento (a FK pede KEY SHARE no título); o `unlink-title` bloqueia em `UPDATE "cheques" SET "title_id"`. Os dois aparecem bloqueados em `pg_stat_activity`.
  - Solto a trava → `clear` **200 cleared**; `unlink` **409 cheque_write_conflict**.
  - FINAL: o cheque fica `cleared` com `title_id = T`, o título fica paid/100 e há 1 lançamento `cheque_clearing` com `title_id = T`. Invariante N=0.
- Sonda, sentido 2, com o UNLINK em voo. Eu seguro a linha do cheque; o `unlink` bloqueia primeiro e o `clear` depois (`UPDATE … SET "status"`).
  - Solto a trava → `unlink` **200**; `clear` **200 cleared SEM título** (o lançamento `cheque_clearing` sai com `title_id = null`).
  - O título segue liquidável: pix depois → 200, e o título fica paid. São **2 entradas de caixa**: o cheque sem título e o pix.
  - É o **R-res-3** declarado (comportamento do #456), com dono `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO`. Fica registrado como risco residual com dono e não reprova (corpo, "Reprovação por construção" item 2).
- CAS do desvínculo: o título LIDO muda no meio (`update cheques set title_id=T2`, meu, commitado) → `unlink` **409 cheque_write_conflict**; o cheque segue com T2.
- Veredito parcial: verde.

### 3(c) R-res-1, A25 e a ordem de travas do A29 (pg_locks do statement bloqueado; eu seguro o título com FOR UPDATE)
- **vínculo** (PATCH do 1º vínculo): bloqueia em `SELECT … financial_titles … FOR UPDATE` com `G:tuple:AccessExclusiveLock:financial_titles` e espera um `transactionid`; **nenhuma trava advisory**. A ordem é título → cheque, **sem a trava do período**.
- **PATCH amount** e **DELETE** do título (o conserto do ciclo 2): `G:advisory:ShareLock` concedida ANTES de esperar o título. A ordem é período → título.
- **payTitle**: `G:advisory:ShareLock` e depois o título (período → título), a mesma ordem do PATCH/DELETE.
- **clear**: `G:advisory:ShareLock`, depois `RowExclusiveLock` em `cheques` (a transição) e em `financial_entries`, e espera o título pela FK. A ordem é período → cheque → lançamento → título.
- Divergência medida: o texto do plano (R-res-1) diz que o vínculo segue período(shared) → título → cheque, mas o código não toma a trava do período no vínculo. Efeito em deadlock: nenhum. O vínculo não segura período, e a inversão título↔cheque com o `clear` não fecha ciclo, porque o `clear` já segura o KEY SHARE do título (FK) antes do UPDATE. → **nota C1-N3**.
- Barreira D, a inversão no MESMO cheque, 5 rodadas:
  - Arranjo: o vínculo A leu o cheque X sem título e espera o título; um vínculo e um depósito de X entram por SQL e commitam; o `clear` de X segura X e espera o título.
  - Resultado nas **5/5**: `clear ok` e vínculo **422 title_already_paid**. Liquida em 12–20 ms, **0 deadlock**, 1 lançamento, invariante N=0.
- Barreira R (R-res-1, vínculo X × clear Y do mesmo título, título seguro por mim), **N=10**: `clear ok | vínculo 422:title_already_paid` ×10, **0 deadlock**, invariante N=0.
- Cruzamentos sem barreira (`Promise.all`), **N=10 por par, 13 pares**, total `deadlocks: 0`. Desfechos:

| Par | Desfecho | Rodadas |
|---|---|---|
| patchAmount×vínculo | `422 title_has_pending_cheque` / ok | 10 |
| delete×vínculo | `422 title_has_pending_cheque` / ok | 10 |
| patchAmount×clear | `422 title_has_pending_cheque` / ok | 10 |
| delete×clear | `422 title_has_pending_cheque` / ok | 10 |
| patchAmount×payTitle | ok / ok | 10 |
| delete×payTitle | ok / `404 title_not_found` | 10 |
| patchAmount×fechamento | `422 period_closed` / ok | 10 |
| delete×fechamento | `422 period_closed` / ok | 10 |
| vínculo×payTitle | ok / `422 title_has_pending_cheque` | 10 |
| clear×payTitle | ok / `422 title_has_pending_cheque` | 10 |
| clear×fechamento | `422 period_closed` / ok | 10 |
| vínculo×fechamento | ok / ok | 10 |
| **vínculo×clear** (cheque X novo × cheque Y já vinculado e depositado) | **ok / ok** | 10 (**invariante N=10**, ver C1-A1) |

  Invariante N=0 em todos os outros pares.
- **A leitura do dev, julgada**:
  - A competência do título é imutável depois do create. Por script: 6 sítios de escrita em `financial_titles` no Prisma (`create` l.37; UPDATE cru l.119 [update]; `updateManyAndReturn` l.155 [status]; UPDATE l.166 [softDelete]; l.211 [applyPaymentGuarded]; l.234 [restorePaymentGuarded]) — 0 gravam `competencia`. Na memória, 5 spreads `...current` sem atribuição de `competencia`. Ler `current.competencia` antes da trava é, portanto, equivalente.
  - A ordem do passo 2 do plano (título antes do período) teria criado deadlock? Medido pela minha mutação, abaixo: forma-se o ciclo de 3 vias PATCH × payTitle × fechamento, mas o Postgres o resolve como *soft deadlock*, reordenando a fila depois do `deadlock_timeout`. **Não sai `deadlock detected`**; sai uma espera de ~1 s em cada rodada. A ordem do objeto evita isso: 38–60 ms.
- Veredito parcial: verde.

### 3(d) invariante do A4/A4-bis (regressão)
- `b-san3-12a-pay-link-race-db` ×3 → `6|6|0|0`; `b-san3-12a-title-mutation-race-db` ×3 → `7|7|0|0`; `b-san3-12a-pay-pending-cheque-db` ×3 → `6|6|0|0`. `deadlock detected` no TAP: 0 nas 9 execuções.
- Consulta do invariante (lib `INVARIANT_SQL`): cheque ativo `registered|deposited` vinculado a título `paid|partially_paid`, ou apagado, ou com `amount ≠` o do cheque. Ao fim de cada sonda, N=0, salvo:
  - (i) os estados que EU fabriquei como premissa: o 2(b)(A) e os controles;
  - (ii) **o par vínculo×clear de dois cheques** e o caso `dois` sequencial, ver C1-A1.
- Controle: um estado proibido fabricado por mim (título pago por SQL com cheque `deposited` vinculado) → a consulta acusa **N=1**.

### C1-A1 — dois cheques pendentes no mesmo título (medido; `pre-existente`)
- Sequencial, sem corrida (sonda `dois`):
  1. Y (100) vinculado ao título T (100) e `deposited`.
  2. Um segundo cheque X (100) vincula a T → **200**, porque a regra do valor exato compara com o saldo aberto (`amount − paidAmount`), que não desconta o cheque pendente Y.
  3. `clear` de Y → T paid.
  4. Resultado: X `registered` segue vinculado a T pago → invariante **N=1**.
- O `clear` de X depois → **422 title_already_paid**, com 1 lançamento só. A razão falha fechado: não há caixa em dobro no livro. O cheque físico X, porém, ainda pode ser compensado pelo banco, e aí cai no caminho do R-res-3: desvincular e compensar sem título.
- **Origem medida**: o mesmo roteiro no head-base do bloco `8a7885f4` (`cheques`, `financial-entries`, `financial-titles` e `financial-uow` da base) dá o MESMO estado (2º vínculo 200, T paid, X pendente vinculado, N=1, `clear_x` 422). A FK e o vínculo vêm de `37a3f360` (2026-10-25, #456, B-SAN3-20; `git log --diff-filter=A` da migração `20260881000000_cheque_title_link`).
- O plano não o põe como critério: o A4/A4-bis fala de pagamento "por outro meio" pela porta do `pay`. A regra do valor exato (dono) também não o fecha.
- Classificação: **ajuste**, **pré-existente** (com a evidência acima), classe **não grave** (sem segunda entrada no livro). A pendência sugerida, com dono, é o próximo bloco de backend financeiro, junto de `P-SAN3-12-PAGAMENTO-MISTO-CHEQUE` / `P-SAN3-12-CHEQUE-DESVINCULADO-CAIXA-SEM-TITULO`. Não reprova (§C7.1-ter(a)).

### Mutações (`mut.sh`)
- **D1** (apaga o `throw chequeLinkedUnlinkFirstError()` do PATCH privilegiado; numstat 0 1):
  - `b-san3-12a-unlink-title` (memória) `17|16|1` — **A6-bis** vermelho (`ERR_ASSERTION`).
  - Minha sonda d1 no Postgres: PATCH null **200 (desvincula)**, PATCH troca **200 (T2)**, pix em T1 200 → falha `d1`.
  - Restaurado.
- **A5-bis CAS** (tira `title_id: input.expectedTitleId` do WHERE do `unlinkTitle` Prisma; 0 1):
  - `pay-link-race-db` `6|5|1` — **A5-bis (db, CAS)** vermelho (`Expected values to be strictly equal`).
  - Minha sonda a5-cas: `unlink` **200** e `title_id = null`, apagando o vínculo T2 que não foi o lido.
  - Restaurado.
- **A4 só o re-check** (tira o `assertNoPendingCheque(findPendingByTitle)` de dentro da unidade do `payTitle`; 0 1): `pay-link-race-db` `6|5|1` — **A4 (b, db)** "pay perdedor: era para recusar e passou". Restaurado.
- **MINHA**, no `update` do título com `findByIdForUpdate` ANTES da trava do período (1 1):
  - `b-san3-12a-title-mutation-race-db` fica **7/7 VERDE**: nenhum teste do bloco morre sem a ordem período → título.
  - A minha sonda W (3 vias: PATCH amount × payTitle × fechamento, com o título seguro por mim), 3 rodadas: com o mutante, o PATCH bloqueado no título **não** segura advisory, e cada rodada fica parada **1010–1055 ms** até o `deadlock_timeout` resolver o soft deadlock. Os três terminam ok, sem `deadlock detected`. No objeto, o PATCH segura `G:advisory:ShareLock` e liquida em 38–60 ms.
  - Graduação: **nota C1-N2** — a ordem período → título do conserto do ciclo 2 não tem caso de teste que morra sem ela; o efeito do mutante é latência, não erro nem dinheiro.
  - Restaurado.

### Vermelho-controle no head-base da EMENDA `<objeto>~12` = fafd4b36
- `git checkout fafd4b36… -- src/modules/cheques` (4 M) → a minha sonda d1: o `tenant_admin` faz PATCH `{title_id: null}` → **200 `titleId: null`**, desvinculando SEM justificativa; o PATCH troca → 200; o pix em T1 passa (200). É o caminho que a D1 fecha.
- No objeto, a consulta do invariante acusa o estado proibido fabricado por mim (N=1).
- Restaurado: `checkout <objeto> -- src tests`, status 0, `hash-object` = blob nos 4 arquivos.

**Veredito parcial do item 3: VERDE.** Achado `ajuste` pré-existente C1-A1 (com origem medida em #456). Notas C1-N2 (a ordem do A29 sem teste que morra sem ela) e C1-N3 (o texto do R-res-1 diz que o vínculo segura o período; o código não segura; sem efeito de deadlock medido).

## Fechamento
- Objeto no fim: `git ls-remote` = `gh pr view 459` = 8a9fc1d8426426403f8642e263b3e932d1738716 (não andou); origin/main no fim aaa9d36a50dfac81a2ce338ef552ab51a0bed650.
- Bases usadas nos vermelhos-controle: item 1 e item 3 → head-base da emenda `<objeto>~12` = fafd4b36; item 2 → head-base do bloco `<objeto>~18` = 8a7885f4; C1-A1 (origem) → head-base do bloco 8a7885f4.
- Teardown:
  - `docker rm -f -v j12a2-c1-pg j12a2-c1-redis` → `docker ps -a --filter name=j12a2-c1- -q | wc -l` = 0.
  - Processos com `j12a2-c1-wt` na linha de comando = 0 → `git worktree remove --force C:/Users/AMP/j12a2-c1-wt` → `git worktree list` sem j12a2-c1 e o caminho ausente.
  - A senha não aparece em lugar nenhum (`grep -c -F` na evidência e no voto = 0; arquivos de log do $SCRATCH com a senha = 0), e o arquivo da senha foi apagado.
  - As sondas e os scripts (`zz-j12ac1-*.ts`, `run.sh`, `probe.sh`, `mut.sh`, `mutate.mjs`, `vote.mjs`) ficam em `C:/Users/AMP/erp-pausa-2026-10-03/j12a2-c1/`, para re-execução (P3).
  - A base viva (`erp-postgres`, `erp-redis`) e o `dev-san322` não foram tocados. Em `w-san312a` escrevi só `c1-evidencia.md` e `c1-voto.json`. Livre em C: 11G.
- Achados:
  - C1-A1 — `ajuste`, pré-existente desde o #456 (medido no head-base do bloco), não grave. Não reprova (§C7.1-ter(a)).
  - C1-N1, C1-N2 e C1-N3 — notas.
  - Nenhum `bloqueia` `dentro-do-bloco`. Nenhum item ficou sem medir.

**VOTO: APROVADO**
