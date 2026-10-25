executor=jurado-san320-c1-opus (Claude Code, subagente do orquestrador) · modelo=Claude Opus (claude-opus-5-5) · nivel=menor declarado (§C7.6) · objeto=a0f5aabca6b86aba21051baffd40c245b5ef1a05 · mandato_md5=55bfbcee5829c2bc3d9d7d9c2ba67a34 · corpo carregado (blob .claude do objeto) x espelho .agents do objeto: IDENTICO (EOL-neutro)

# Evidência — Cadeira C1 (dinheiro) — B-SAN3-20 (PR #456), ciclo 1

## Legalidade (00:00Z 25/10)
- `git ls-remote origin refs/heads/fix/cheque-x-baixa` → a0f5aabc…; `gh pr view 456 --json headRefOid,state` → a0f5aabc… OPEN. Objeto confirmado por 2 fontes.
- `git merge-base origin/main <objeto>` → B = 7ab2fe71d0d40c2be51a790f0d20893651cdf972.
- `gh api …/commits/<objeto>/check-runs` → total 14, não-verdes/pendentes 0.
- Parecer do inspetor `insp-san320-parecer.md`: LIBERADO COM RESSALVA (R1–R7). Respeito R1 (porta ≠ 55441, provar com `docker port`), R2 (DB só com ≤1 grupo Docker alheio), R4 (piso 10 GB).
- Inelegibilidade: meu nome `jurado-san320-c1-opus` não coincide com planejadores, críticos, devs (`dev-san3-20`, `dev-san3-20b`, `dev-san320-opus`), redator `fab-red-san320-argon`, inspetores `insp-san320-argon`/`insp-san320-opus`, outras cadeiras.
- Terreno no início: `df -h /c` → 11G livres; `docker ps` → grupos alheios jt2c2-a2, jt2c2-a2-tl, jt2c2-b2 (3) → sem vaga para banco (R2); começo pelos itens em memória.
- Independência: não li votos/evidências de C2/C3.

## Terreno próprio (~00:02Z)
- `git worktree add --detach C:/Users/AMP/w-jsan320-c1 a0f5aabc…` → HEAD is now at a0f5aabc. `npm ci` → added 326 packages; `ls -la node_modules` → diretório comum (`drwxr-xr-x`), sem junction. `npm run db:generate` sem DATABASE_URL → PrismaConfigEnvError; com `DATABASE_URL=postgresql://x:y@127.0.0.1:1/x` (só para gerar, sem conexão) → cliente gerado.
- `node --test --import tsx tests/cheque-title-link.test.ts tests/financial-entry-undo-owners.test.ts` → tests 44 · pass 44 · fail 0 · skipped 0 (38 + 6).

## Sonda própria em memória/HTTP (Itens 1, 2 e 3 — parte sem banco)
- Comando: `cd C:/Users/AMP/w-jsan320-c1 && CORE_SAAS_PERSISTENCE=memory node --import tsx C:/Users/AMP/erp-pausa-2026-10-03/jsan320-c1/probe-mem.mts` (createApp real, HTTP em 127.0.0.1:0).
- Saída: `RESUMO: 35/35 OK, 0 FAIL` (ec=0). Linhas-chave:
  - K2 receivable/payable × título 100/300 com cheque 100: clear 200, 1 lançamento `check`/`cheque_clearing`/`title_id=t`, `clearedEntryId` presente, paid 100, status paid/partially_paid, saldo ±100.
  - K2 fail-closed: `title_already_paid` (pix depois do vínculo), `title_cancelled` (PATCH status cancelled), `overpayment` (pix 50 + cheque 100 em título 100), `404 title_not_found` (DELETE do título): cheque `deposited`, `clearedEntryId` null, zero lançamento novo, título intocado.
  - K3 bounce (2 direções): 2 lançamentos, `cheque_bounce` com `title_id` null, só 1 com o título, saldo 0, título open/0.
  - RR9 misto: clear 100 → partially_paid/100; pix 200 → paid/300, saldo 300; bounce → 200, título partially_paid/200, saldo 200, 3 lançamentos, pix 200 intacto com o título.
  - K5 (4 cenários): pay-clear → pay 422 `cheque_required`; clear-pay → pay 422 `title_already_paid`; saldo ±100, 1 lançamento com `title_id`, paid 100.
  - K4 precedência `/pay`: 400 `invalid_amount`, 404 `title_not_found`, 422 `overpayment`, 422 `title_cancelled` antes de `cheque_required`; com período fechado `cheque_required` vence nos dois; pix com período fechado → `period_closed` (controle). `/financial-entries`: 400 `invalid_direction` e 400 `invalid_account_reference` antes; check → 422 `cheque_required`; cash/pix/boleto/card/transfer → 201; `/pay` transfer → 201. (`currency_mismatch` não exercível por HTTP: só BRL nas portas públicas — fica para a suíte T-K1d/serviço.)
  - K6 HTTP: DELETE e reverse da compensação vinculada → 422 `cheque_entry_immutable`; título segue paid/100, saldo 100. K6b: liquidação pix sem cheque → DELETE 422 `settlement_entry_immutable`; reverse 201, título volta open/0.
  - R1-02: dois `POST /cheques` mesmo número/banco/conta/valor → 201, 201, ids distintos (P vale por linha de cheque).
- Veredito parcial: memória/HTTP VERDE em K2, K3, RR9, K4, K5, K6 e R1-02. Postgres pendente (R2: Docker sem vaga).

## Banco descartável próprio (~00:08Z)
- R2: `docker ps` → grupos alheios vivos só `jt2c2-b2` (1; `erp-*` excluído) → vaga. R4: `df -h /c` → 11G. P8: commit livre 11,97 GB.
- Porta: 55461 livre (R1: 55441 é do `jt2c2-a2-pg`, não usada). `docker run -d --name jsan320-c1-pg … -p 127.0.0.1:55461:5432 postgres:16-alpine` → `docker port jsan320-c1-pg` = `5432/tcp -> 127.0.0.1:55461`; `select version()` → PostgreSQL 16.15.
- `DATABASE_URL=postgresql://c1:***@127.0.0.1:55461/c1db npx prisma migrate deploy` → "All migrations have been successfully applied."; `npm run db:generate` ok.
- Suítes `-db` do bloco, 2 execuções: `npm test -- tests/cheque-title-link-atomic-db.test.ts tests/financial-title-status-cas-db.test.ts` (prisma) → `2 arquivo(s) · 24 teste(s) · pass 24 · fail 0 · skipped 0` nas duas (15 + 9; T-K2d, T-K2e, T-K5×2, T-K10a/b/c/e, T-K11a/b/c/h incluídos).

## Sonda própria no Postgres (Itens 1, 2 e 3)
- Comando: `DATABASE_URL=<jsan320-c1-pg> CORE_SAAS_PERSISTENCE=prisma node --import tsx C:/Users/AMP/erp-pausa-2026-10-03/jsan320-c1/probe-db.mts` (serviços de produto sobre Prisma; a sonda recusa rodar fora da porta 55461).
- 1ª execução: 20/22 — as 2 barreiras próprias deram P2028 (tx interativa 5 s expirada) porque eu observava `pg_stat_activity` de dentro da transação do segurador (snapshot de estatística congelado). Defeito da MINHA sonda, não do produto; corrigido com conexão-monitor separada (`c1-mon`).
- Execução final: `RESUMO: 22/22 OK, 0 FAIL`. Linhas-chave:
  - K2-db receivable/payable × título 100/300: 1 lançamento `check`/`cheque_clearing`/`title_id=t`, `cheques.cleared_entry_id` = id desse lançamento, paid 100, paid/partially_paid, saldo (`entrySvc.balance`) ±100.
  - K2-db fail-closed: `422 title_already_paid`, `422 title_cancelled`, `422 overpayment`, `404 title_not_found` (título apagado por `titleSvc.delete`): cheque `deposited`, `cleared_entry_id` NULL, zero lançamento novo, título intocado.
  - K3-db (2 direções): cheque `bounced` com `bounce_entry_id`, 2 lançamentos, contra-lançamento `cheque_bounce` com `title_id` NULL, saldo 0, título open/0.
  - RR9-db misto: clear → partially_paid/100; pix 200 → paid/300, saldo 300; bounce → ok, partially_paid/200, saldo 200, pix 200 intacto e vinculado.
  - K5-db 4 cenários: pay-clear → `422 cheque_required`; clear-pay → `422 title_already_paid`; saldo ±100, 1 lançamento com `title_id`, paid 100, paid.
  - K4-db: `POST /financial-entries` (serviço) com check → `422 cheque_required`, 0 lançamento.
  - K6-db: DELETE e reverse da compensação vinculada → `422 cheque_entry_immutable`; K6b-db: pix sem cheque → DELETE `settlement_entry_immutable`, reverse ok, título open/0.
  - **RR1(iv) própria (barreira):** segurador `UPDATE financial_titles SET deleted_at=now() … AND paid_amount=0` sem commit; `titleSvc.changeStatus(open→cancelled)` observado bloqueado (`pg_stat_activity` wait_event_type=Lock, monitor separado) → commit → **`404 title_not_found`** (nunca 409); título apagado, status open.
  - **RR1(i) própria (barreira):** segurador com o UPDATE condicional de liquidação (paid+100) sem commit; `changeStatus(open→cancelled)` bloqueado → commit → **`422 invalid_status_transition`**; título paid/100.
- Veredito parcial: Postgres VERDE em K2, K3, RR9, K4, K5, K6, RR1(i) e RR1(iv).

## Vermelho-controle (Itens 1, 2 e 3) — 18 mutações, uma por vez, no worktree próprio
- Mecanismo: `PYTHONIOENCODING=utf-8 python C:/Users/AMP/erp-pausa-2026-10-03/jsan320-c1/mutar.py` (âncora única por `count == 1`, EOL preservado; roda o comando; `git checkout -- <arquivo>`; `git hash-object` == `git rev-parse <objeto>:<arquivo>`; `git status --short -- src` vazio). Saída crua: `C:/Users/AMP/erp-pausa-2026-10-03/jsan320-c1/mutacoes.jsonl`. 1ª rodada abortou após M6 por erro de `print` cp1252 do MEU script (registro de M6 íntegro, restauro ok); rodada completa refeita do zero. Memória = `CORE_SAAS_PERSISTENCE=memory npm test -- tests/cheque-title-link.test.ts`; DB = `DATABASE_URL=<jsan320-c1-pg> CORE_SAAS_PERSISTENCE=prisma npm test -- <suíte>`.
- Item 1:
  - M6 (lançamento do clear sem titleId) → mem `38 · pass 35 · fail 3` (#10 K2, #35/#36 K5) · probe-mem `25/35, 10 FAIL` (K2 ×4, K5 ×4…). VERMELHO.
  - M7 (sem applyPaymentGuarded) → mem `pass 29 · fail 9` (#10–#12 K2, #15–#16 K3…). VERMELHO.
  - M8 (0-linhas do CAS do título engolido) → mem `38 · pass 38 · fail 0` (EQUIVALENTE no T-K2b: o fast-fail `assertPayable` pré-unidade recusa antes do CAS — confirma a declaração do dev) · DB atomic `15 · pass 14 · fail 1` (#8 T-K2d, barreira). VERMELHO onde a corrida existe.
  - M10 (bounce sem restorePaymentGuarded) → mem `pass 35 · fail 3` (#15, #16 misto, #28) · probe-db `19/22` (K3-db ×2, RR9-db). VERMELHO.
  - M11 (contra-lançamento com titleId) → mem `pass 36 · fail 2` (#15, #28 T-K3c). VERMELHO.
  - M12/M16 (payTitle aceita check) → mem `pass 33 · fail 5` (#18, #21, #34, #35, #36 K5) · probe-mem `32/35` (K5 pay-clear receivable/payable: pay 201 e clear 422 — a dupla porta reaparece; K4 período). VERMELHO.
  - M-C1b NOVA (bounce restaura 3× o valor do cheque) → probe-db morre no K3-db com `409 title_restore_conflict` (o CAS `paid_amount − X ≥ 0` recusa) — ec 1. VERMELHO. (Nota: o código devolve **409** `title_restore_conflict` — erro pré-existente de `financial-entry.repository.ts` na base 7ab2fe71 —; a tabela do §1 do plano diz 422. Inalcançável sem mutante.)
- Item 2:
  - M13 (create aceita check) → mem `pass 36 · fail 2` (#19, #34). VERMELHO.
  - M14 (recusa antes do assertPayable) → mem `pass 35 · fail 3` (#20 precedência, #35/#36). VERMELHO.
  - M27 (update Prisma sem status='registered') → DB atomic `pass 12 · fail 3` (#12 T-K10a, #13 T-K10b, #15 T-K10e). VERMELHO.
  - M29 (0 linhas do PATCH/DELETE → 404 sem reler) → DB atomic `pass 12 · fail 3` (#12, #13, #14 T-K10c). VERMELHO.
  - M30 (changeStatus sem status=fromStatus) → DB status-cas `9 · pass 4 · fail 5` (#1, #6 T-K11a, #7, #8, #9). VERMELHO.
  - M31 (0 linhas do changeStatus → 404 sem reler) → DB status-cas `pass 5 · fail 4` (#6–#9). VERMELHO.
  - M33 (changeStatus em memória sem check-and-set) → mem `pass 37 · fail 1` (#31 T-K11d). VERMELHO.
  - M37 (retentativa sem limite, recursão) → DB status-cas `pass 8 · fail 1` (#9 T-K11h). VERMELHO.
  - M-C1a NOVA (releitura do changeStatus ignora deleted_at) → probe-db `21/22`, FAIL só RR1(iv) (o apagado concorrente deixaria de dar 404). VERMELHO — a minha sonda RR1(iv) não passa por construção.
- Item 3:
  - M17 (title_settlement antes de cheque_link) → mem `pass 37 · fail 1` (#23 K6, pelo `reason`) · probe-mem `34/35` (K6 DELETE). VERMELHO.
  - M18 (cheque_link fora da ordem) → `npm run check` ec 2: `financial-entry-undo-owners.ts(220,14): error TS2322: Type 'true' is not assignable to type 'never'`. VERMELHO.
- Restauro: 18/18 `restore_hash_ok: true`, `src_clean: true`; M-C1b refeita à parte para ver a saída: restauro `59a0c7913a4f` = blob. `git -C C:/Users/AMP/w-jsan320-c1 status --short` → vazio.
- Veredito parcial: vermelho-controle completo nos 3 itens (16 mutações do mandato + 2 novas); M8 equivalente em memória e morta no Postgres, como declarado.

## Leituras (Itens 2 e 3)
- RR10: `grep -n 'async changeStatus' -A14 src/modules/financial-titles/financial-title.repository.ts` → l.321-333: `this.titles.get` → checa `fromStatus` → `this.titles.set`, sem `await`; `cheque.repository.ts` update/softDelete: 0 `await` entre `this.cheques.get` e `set`. Execução: T-K10d e T-K11d verdes (38/38), M33 vermelha.
- F-DEV-02: T-K10b (2 ordens) verde 2× no banco próprio; ordem PATCH-vence → deposit `fulfilled`, cheque `deposited` com `title_id` (resultado sequencial PATCH→deposit); ordem deposit-vence → PATCH `422 cheque_not_editable`, `title_id` NULL. O vínculo gravado em `registered` passou pela pré-checagem do título e o `/clear` ainda decide pelo CAS do título → nenhum dinheiro em risco; P e P2 preservadas. A linha do §2.5 do plano ("deposit → 409") e o corolário "um vencedor e um perdedor" não descrevem esse par; `API_CONTRACTS.md` e `decisoes.md` não repetem o 409 (`git diff 7ab2fe71 -- API_CONTRACTS.md`; entrada `D-SAN3-20-…` cita o dev.md onde está F-DEV-02).
- `parsePaymentMethod` normaliza (`trim` + `toLowerCase`) antes da recusa → " CHECK " também cai em `cheque_required` (validators l.61-71).
- Publicação: `decisoes.md` (entrada `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO`) diz "**Limite explícito:** a garantia é por linha de cheque" e remete a enumeração dos writers ao §2.5; `pendencias.md` l.1393 fecha `P-Ω4-7-DUPLA-CONTAGEM` com "**Limite declarado (R1-02):** a garantia é **por linha de cheque**"; l.11495 `P-SAN3-20-CHEQUE-FISICO-DUPLICADO` ABERTA, MÉDIA, dono "próximo bloco de cheques + migração própria". `API_CONTRACTS.md`: `PATCH /:id/status` CAS com 404/422/1 retentativa/409, igual ao medido.

## Teardown
- `docker rm -f jsan320-c1-pg` → removido; `docker ps -a | grep -c jsan320-c1` → 0. Base viva (erp-postgres/erp-redis) e `jt2c2-*` não tocadas.
- `git -C <worktree> status --short` → 0 linhas (nenhuma mutação viva); `git worktree remove --force C:/Users/AMP/w-jsan320-c1` → removido; `worktree list | grep -c jsan320` → 0. Disco: 12G livres.
- Sondas e saída crua preservadas fora do repo: `C:/Users/AMP/erp-pausa-2026-10-03/jsan320-c1/` (probe-mem.mts, probe-db.mts, mutar.py, mutacoes.jsonl, mutar.log). Nenhum commit; no repositório escrevi só `cadeira-c1-evidencia.md` e `cadeira-c1-voto.json`.

## Veredito
- Itens 1, 2 e 3 medidos por execução própria (memória/HTTP e Postgres 16 próprio), com vermelho-controle completo. Nenhum achado `bloqueia`. Achados `nota` no voto. **VOTO: APROVADO.**
