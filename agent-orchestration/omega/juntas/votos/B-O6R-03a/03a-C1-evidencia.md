papel: C1 | identidade: jurado-o6r03a-v2-banco | modelo: Claude Opus 5.5 (claude-opus-5-5) · nível menor, DECLARADO (fonte: decisoes.md:3132 no objeto b75a0c2e, D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO; substitui D-FABLE-ASTRA-SO-DINHEIRO, l.3153) | mandato_md5: EOL-neutro 26dd48775a5236186956515c5f2f62a7 · cru 0afcf0f948a8e2e3ba1b31421d3afa84 (declarado no disparo como cru: 0afcf0f948a8e2e3ba1b31421d3afa84 — confere) | corpo_md5: 4afc985059608ce41053a15d9366578f (.claude, blob do objeto) · bf857394ffea8485d7e63f84ac28d1de (.agents, espelho Codex: difere só no frontmatter tools e no bloco "Papel para o Codex") (recebido: lançada como general-purpose com o corpo lido do blob; md5 EOL-neutro do recebido = 4afc985059608ce41053a15d9366578f, igual ao publicado no disparo)

# Evidência — C1 (banco e transação) — junta B-O6R-03a (PR 425), ciclo 1

## 0. Cabeçalho de terreno

- Início: 2026-10-11T23:57:43Z
- Objeto: `git ls-remote origin refs/heads/fix/expense-sync-atomic` → b75a0c2e96a80b2f54cc629fe856d16660ccbe86 (ec=0) · `gh pr view 425 --json headRefOid,...` → headRefOid b75a0c2e96a80b2f54cc629fe856d16660ccbe86, base main, OPEN, isDraft=false, MERGEABLE (ec=0). Iguais.
- Cerca do mandato 5cee8e5754888ef138d8d8b2bcb9ad9c37907ad5; `git diff --name-only 5cee8e57 b75a0c2e` = só os 4 `agent-orchestration/omega/juntas/votos/B-O6R-03a/00-mandatos/*.md` → delta só registro.
- Pais do objeto (`git rev-list --parents -n1`): b75a0c2e ← 5cee8e57 (um pai; o objeto é o commit dos mandatos sobre 5cee8e57).
- origin/main no início (após `git fetch origin main`, ec=0): 684e9afd7710486682992ee9fb464db17256e68a
- B = `git merge-base origin/main <objeto>` = 9566d55bd719ce7d7a545281c57923a25f883ed3
- `git diff --name-status B <objeto> -- src/` → 8 arquivos em src/modules/expense-management/: M prisma.repository.ts, M dto.ts, M repository.ts, M service.ts, M types.ts, M validators.ts, A expense-sync.ts, M index.ts
- `git diff --name-only 3a648ca4 B -- src/modules/expense-management | wc -l` → 0 (head-base do dev × B: mesmo produto)
- Check-runs (`gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100`, filtro: não-verde = completed com conclusion ∉ {success,skipped,neutral}; pendente = status ≠ completed): total 14 | não-verdes 0 | pendentes 0. backend-postgres: success (114603751105 e 114601463352).
- Shell: Git Bash (MINGW64_NT-10.0-22631 3.6.6, x86_64 Msys), /bin/bash.exe; node v20.19.5
- Disco C: antes de tudo: 238G, 223G usados, 16G livres (94%) — acima do piso de 10 GB.
- SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/j03a-c1

## 0.1 Legalidade

- Parecer do inspetor: C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md → "Veredito: LIBERADO COM RESSALVA", objeto b75a0c2e (início 23:41:43Z, fim 23:54:22Z). Tabela "Conferência por cadeira": C1 = jurado-o6r03a-v2-banco, corpo .claude md5 4afc9850… (= o meu), espelho .agents presente (S0 OK), worktree C:/Users/AMP/w-j03a-c1 (livre), cluster prefixo j03a-c1- (nenhum existe). Confere o meu nome, corpo, worktree e cluster: SIM.
- Ressalvas que valem para mim: R1 (objeto b75a0c2e), R2 (queda → sucessor com identidade nova, P3), R3 (R11a e drill 3a a re-verificar — não são do meu mandato de mérito), R5 (disco), R7 (CI attempt 1 T15).
- Âncoras do CLAUDE.md (grep -cF no blob do objeto | em origin/main): "## A1. Fontes" 1|1 · "## A2. Regra de conflito" 1|1 · "## A7. Onde se MEDE" 1|1 · "## C5. Limpeza" 1|1 · "**1-bis. INSPE" 1|1 · "**1-ter. ESCOPO" 1|1 · "(c) Duas lições" 1|1 · "4-bis. **SEPARA" 1|1 · "5. **Paradas imediatas" 1|1 · "6. **Modelo de cada papel" 1|1 · "6-bis. **ESGOTADO" 1|1 · "P1 — Evidência incremental" 1|1 · "P7 — Pausa ordenada" 1|1 · "8. **GOVERNANÇA PROPORCIONAL" 1|1 · "(1) Junta proporcional" 1|1 · "(2) Teto de 2 ciclos" 1|1 · "(5) KPI congelado" 1|1.
- decisoes.md no objeto: D-GOV-PROPORCIONAL l.2938 · D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO l.3132 (substitui D-FABLE-ASTRA-SO-DINHEIRO, l.3153) · D-03a-MESMA-CHAVE-OUTRO-ATOR = A l.3432. As três existem.
- Quórum aplicado: unanimidade de 3 com veto (bloco de dinheiro, §C7 item 8(1)); ciclo 1 (mandato e disparo) → régua dos ciclos 1–2: `bloqueia` + `dentro-do-bloco` reprova, de qualquer classe.

## 0.2 Terreno montado (ambiente declarado por comando; nenhum export; nenhum segredo na evidência)

- Processos no início: `docker ps -a` → erp-postgres (Up, 5432), erp-redis (Up, 6379), erp-postgres-alt (Exited 3 semanas), pastrack-teste-banco-teste-1 (Exited) — nenhum j03a-*, nenhum de outra cadeira; `tasklist node.exe` → 6 processos node.exe. Docker server 29.6.1 linux/amd64.
- Worktree: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree add --detach C:/Users/AMP/w-j03a-c1 b75a0c2e…` → ec=0; `test -e C:/Users/AMP/w-j03a-c1/.git` → OK; `rev-parse HEAD` = b75a0c2e96a80b2f54cc629fe856d16660ccbe86; `status --porcelain | wc -l` = 0.
- `timeout 900 npm ci --no-audit --no-fund` no worktree → ec=0 ("added 326 packages"); aviso EBADENGINE (node 20 × >=22 de um pacote) não bloqueante. Disco depois: 15G livres.
- Junction: `cmd //c "dir /AL C:\Users\AMP\w-j03a-c1"` → nenhum ponto de reparse listado; `dir /AL /S …\node_modules | grep -c JUNCTION` → 0.
- Porta 58471: `netsh interface ipv4 show excludedportrange protocol=tcp` → faixas 5357, 50000-50059, 54861-56019 (9 faixas), 64297-65426 (11 faixas): 58471 fora de todas; `Get-NetTCPConnection -LocalPort 58471 | Measure-Object` → 0.
- Container: `POSTGRES_PASSWORD=<gerada, 36 hex, só em arquivo 0600 no SCRATCH> docker run --detach --name j03a-c1-pg -e POSTGRES_PASSWORD -e POSTGRES_DB=j03a_c1 --publish 127.0.0.1:58471:5432 postgres:16` → ec=0; `select version()` → PostgreSQL 16.14 (Debian 16.14-1.pgdg13+1).
- `DATABASE_URL=<o meu, 127.0.0.1:58471> timeout 300 node node_modules/prisma/build/index.js migrate deploy` → ec=0 ("All migrations have been successfully applied"); `prisma generate` com o mesmo DATABASE_URL só no comando → ec=0. Senha nos logs: `grep -c <senha>` = 0 nos dois.
- `SELECT count(*) FROM _prisma_migrations` → 108 · `SHOW default_transaction_isolation` → read committed.
- Papel do serviço (SQL por stdin, senha nunca em argv): `CREATE ROLE j03a_c1_app LOGIN PASSWORD '<gerada>' NOSUPERUSER NOBYPASSRLS NOINHERIT NOCREATEDB NOCREATEROLE; GRANT USAGE ON SCHEMA public; GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES; GRANT USAGE,SELECT ON ALL SEQUENCES` → ec=0; pg_roles: j03a_c1_app | rolsuper f | rolbypassrls f | rolinherit f.
- RLS no cluster migrado (pg_class): expense_reports t/t · expense_items t/t · expense_events t/t · mobile_action_receipts t/t (relrowsecurity/relforcerowsecurity). Política de mobile_action_receipts: USING e WITH CHECK `tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid`.
- Gatilhos de usuário nas 4 tabelas (pg_trigger, not tgisinternal): 0 → não há append-only em expense_events com que conviver.
- Helpers que antecedem o bloco (`git log --diff-filter=A`): tests/helpers/auth-identity-fixture.ts 0a398246 (2026-08-19), tests/helpers/pg-barrier.ts 99f18403 (2026-09-04), ambos ancestrais de B. Não os uso: papel e barreira são meus.

## 0.3 A sonda (própria, verbatim em $SCRATCH/probe; md5 publicado)

- Mecanismo (meu, só no cluster j03a-c1-pg): tabela de controle `j03a_c1_ctl(tenant_id, point, mode pause|raise, app_name, lock_key)` + função `j03a_c1_fault()` (plpgsql, roda como o invocador j03a_c1_app, SELECT concedido só na tabela de controle) + 7 gatilhos INERTES sem linha de controle: `AFTER INSERT ON mobile_action_receipts` ('claim'), `BEFORE UPDATE ON mobile_action_receipts` ('complete' = p2), `BEFORE INSERT ON expense_reports` ('effect_create' = p1 create), `BEFORE INSERT ON expense_items` ('effect_item' = p1 item), `BEFORE UPDATE ON expense_reports WHEN status muda` ('effect_submit' = p1 submit), `BEFORE INSERT ON expense_events WHEN event_type = sync` ('event_before' = p3a), `CONSTRAINT TRIGGER AFTER INSERT ON expense_events DEFERRABLE INITIALLY DEFERRED WHEN sync` ('event_commit' = p3b). Armar = inserir linha (tenant, ponto[, application_name]); desarmar = DELETE da linha. `pause` = `pg_advisory_xact_lock(k)` enquanto a minha sessão de controle segura `pg_advisory_lock(k)`; `raise` = `RAISE EXCEPTION 'j03a_c1 falha injetada <ponto> em <tabela>'`.
  - DDL: faults-install.sql md5 ed84edb0e9e2fcfbf3b61e9669df8016 (psql por stdin, ec=0; pg_trigger lista os 7, só j03a_c1_evt_def deferrable/initdeferred); DROP: faults-drop.sql md5 0650ad5d82ca263215cc7adcf991bf33 (roda no fim).
- Biblioteca: probe/lib.mts md5 e8a23d75d00f55a0a6bc2ce55f418abd. Importa do worktree (createRequire + caminho absoluto): `ExpenseManagementService`, `RlsPrismaExpenseManagementRepository`, `withTenantRls`, `EXPENSE_SYNC_RECEIPT_KEY_PREFIX`/`EXPENSE_SYNC_EVENT_TYPE`/`decodeSyncReceiptKey` (expense-sync.ts) e `ROLE_PERMISSIONS` (catalog.ts). Cliente do serviço = `new PrismaClient({ adapter: new PrismaPg({ connectionString: <j03a_c1_app>?application_name=j03a_c1_<X> }) })`. Admin = `pg.Client` superusuário do meu container (semeia, conta, observa, controla).
- Permissões tiradas do catálogo: `ROLE_PERMISSIONS.technician` (u1/u3, técnico) e `ROLE_PERMISSIONS.manager` (u2, gestor). Medido: `ROLE_PERMISSIONS.field_technician` (legado) NÃO tem `expense_sync:write` — a 1ª execução da sonda parou na asserção "field_technician sem expense_sync:write no catalogo" (ec=1); `technician` tem `expense_report:read_own, create, update, submit, expense_receipt:attach, expense_sync:write`; manager tem também `expense_report:read`. Fato de catálogo, fora do meu mandato (permissão), não é achado.
- Contagem por organização, pelo admin: relatórios (total e status de cada um), itens, recibos K2t (`left(client_action_id,161) = PREFIX`) × crus, recibos incompletos (`result_ref IS NULL`), eventos de sync × de domínio.

### Smoke = vermelho-controle 3 do item 1 (o contador vê a escrita legítima)

Comando: `J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=$SCRATCH J03A_OUT=$SCRATCH/out-smoke.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 120 node --import tsx probe/smoke.mts` (smoke.mts md5 02758d20a7d86570a806ac4953555690), cwd = worktree, src = objeto. ec=0.
- Postura pela conexão do serviço, DENTRO do `withSyncTransaction`: usr=j03a_c1_app, super=false, bypass=false, GUC app.current_tenant_id = tenant do cenário (true), application_name=j03a_c1_A.
- create: 1ª → processed/replayed:false; Δ relatórios +1, K2t +1, sync +1, domínio +1, cru 0, incompleto 0, status ">draft", total ">0". 2ª igual → processed/replayed:true mesmo resultRef; Δ tudo 0.
- item: 1ª → processed/false; Δ itens +1, total 0→12.34, K2t +1, sync +1, domínio +1. 2ª → replayed:true, Δ 0, total 12.34→12.34.
- submit: 1ª → processed/false; Δ status draft→submitted, K2t +1, sync +1, domínio +1, total 5→5. 2ª → replayed:true, Δ 0.
- Limpeza da smoke: tenants criados 3, removidos 3, sobra `j03a-c1-%` = 0.
- Veredito parcial: o contador vê exatamente o delta legítimo de cada tipo, total e status inclusive → VC3 do item 1 ACUSOU (verde).

## Item 1 — A1, A5, A6 e A3c (v3) com barreira causal, no OBJETO

Comando: `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=$SCRATCH J03A_OUT=$SCRATCH/out-i1-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx probe/item1.mts` (item1.mts md5 b00999d7a54c60775437ab674476c41a; lib.mts e8a23d75…). src = objeto b75a0c2e (hash-object = blob; worktree limpo). Concorrência: rodava também o container `j03a-c2-pg` (outra cadeira; não tocado); 6 node.exe antes. 00:11:36Z → 00:12:14Z, ec=0. Saída: out-i1-obj.jsonl (197 linhas, md5 79e96f7c93b66f6237e929fab451ad7e).

Mecanismo: A = cliente Prisma do papel j03a_c1_app com application_name j03a_c1_A; B = j03a_c1_B; A6 = 10 clientes j03a_c1_s0..s9 (postura de cada um provada antes: `j03a_c1_app:false:false:guc=tenant` ×12). PAUSA de A depois do claim = linha de controle (tenant, 'claim', pause, app=j03a_c1_A, k) → o gatilho AFTER INSERT do recibo chama `pg_advisory_xact_lock(k)` enquanto a sessão de controle segura `pg_advisory_lock(k)`. Observador: `pg_stat_activity` por application_name; só solto A DEPOIS de ver B em `Lock:transactionid` no INSERT do recibo. FALHA de A no A5 = `pg_cancel_backend(<pid de A>)` com A parada no gatilho depois do claim (57014). A3c: gestor = u2 (`ROLE_PERMISSIONS.manager`), técnico = u3 (`technician`); relatório de item/submit de u1 no par gestor e do primeiro ator no par técnico.

Linha de pg_stat_activity registrada (forma, igual em todas as rodadas): A `j03a_c1_A|<pid>|active|Lock:advisory|INSERT INTO "public"."mobile_action_receipts" (...)`; B `j03a_c1_B|<pid>|active|Lock:transactionid|INSERT INTO "public"."mobile_action_receipts" (...)`.

Tabela agregada (cenário | tipo | rodadas | ok | efeitos por rodada | B visto em Lock antes de soltar | 25P02/40P01):
| cenário | tipo | N | ok | efeitos | B visto | aborted |
|---|---|---|---|---|---|---|
| A1 (u1×u1) | create | 10 | 10 | 1 em 10/10 | 10/10 | 0 |
| A1 | item | 10 | 10 | 1 em 10/10 (total 0→12.34) | 10/10 | 0 |
| A1 | submit | 10 | 10 | 1 em 10/10 (draft→submitted) | 10/10 | 0 |
| A5 (A cancelada após o claim) | create/item/submit | 10+10+10 | 30 | 1 (de B) em 30/30 | 30/30 | 0 |
| A3c gestor direta (u1→u2) | ×3 tipos | 10 cada | 30 | 1 em 30/30 | 30/30 | 0 |
| A3c gestor inversa (u2→u1) | ×3 | 10 cada | 30 | 1 em 30/30 | 30/30 | 0 |
| A3c técnico direta (u1→u3) | ×3 | 10 cada | 30 | 1 em 30/30 | 30/30 | 0 |
| A3c técnico inversa (u3→u1) | ×3 | 10 cada | 30 | 1 em 30/30 | 30/30 | 0 |
| A6 (10 concorrentes, 1 pausado + 9 vistos na PK) | ×3 | 5 rodadas cada | 15 | 1 em 15/15 | adv 1 · txid 9 em 15/15 | 0 |

Detalhe por cenário (todas as rodadas iguais em forma):
- A1: A = processed/false/<ref>; B = processed/true/<mesmo ref>; ΔK2t +1, Δcru 0, incompletos 0, Δsync +1, Δdomínio +1. Exemplo item rep 1: ref b44fe16e…, total 0→12.34, status draft→draft.
- A5: A = `ERR:57014 canceling statement due to user request` (30/30); B = processed/false; 1 efeito; recibos no tenant = 1, do ator u1, completo; nenhum recibo órfão de A.
- A3c: primeiro = processed/false; segundo = `conflict/true/resultRef null/action_owned_by_other_actor` (única forma vista em 120/120); 1 efeito; o único recibo é do PRIMEIRO ator (donoRecibo = first em 120/120); 1 evento de sync.
- A6: distribuição por rodada = {não-replay 1, replay com o mesmo ref 9, 503 0, outros 0} em 15/15; efeitos 1; K2t 1; sync 1; incompletos 0. Observador viu, antes de soltar, 1 em Lock:advisory e 9 em Lock:transactionid em 15/15.
- Denominador constante: 10 por cenário×tipo (A6: 5 rodadas × 10 envios). Vaza-metro: tenants criados 196, removidos 196, sobra `j03a-c1-%` = 0.
- VC1 (a barreira é real): B visto em `Lock:transactionid` ANTES de soltar A em 180/180 rodadas pareadas; A6 com 9 vistos na PK em 15/15. Nenhuma rodada solta sem ver. ACUSOU.
- VC3 (contador vê a escrita legítima): ver smoke (§0.3) — ACUSOU.
- Veredito parcial (objeto): verde em 195/195 rodadas. VC2 (a sonda vê o efeito dobrado) e as mutações m5/A1noclaim: a seguir.

### Item 1 — VC2 (a sonda vê o efeito dobrado) na base B

Driver de troca/mutação: probe/mut.py md5 23d43055b41c12beb39794006a964ea9 (copia para $SCRATCH/bk, conta âncora = 1 sobre o texto normalizado LF e regrava em CRLF, prova `git hash-object` ≠ blob do objeto; restaura da cópia e prova `hash-object` = blob e `status --porcelain` vazio). Troca pela base: `git cat-file --filters 9566d55b:<f> > <f>` para os 7 arquivos M; `expense-sync.ts` (novo) sai para o bk.
- `python mut.py swapbase` → 7/7 `hash_object_eq_B: true`, expense-sync.ts `absent_in_B_removed: true` (ec=0).
- `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=baseB J03A_KINDS=create J03A_ONLY=A1,A6 … node --import tsx probe/item1.mts` → ec=0 (out-i1-base.jsonl). Só `create`: na base, `parseRequiredUuid` usa a regex antiga (`[89ab][0-9a-f]{12}` sem o hífen) e o reportId canônico de item/submit nunca chega ao banco — por isso o VC2 de item/submit vai pela A1noclaim no objeto (abaixo).
  - A1 base create: 10/10 VERMELHO como esperado — efeitos 2, relatórios +2, recibo cru +1, K2t 0; A = processed/false; B = `ERR:P2002,23505 Invalid this.client.mobileActionReceipt.create()`; B visto em Lock:transactionid em 10/10 (barreira real também na base).
  - A6 base create: 5/5 VERMELHO — efeitos 10 por rodada (relatórios +10), dist {não-replay 1, replay 0, 503 0, outros 9 = P2002}, vistos {adv 1, txid 9}.
- `python mut.py restorebase` → 8/8 `eq_obj: true`, `status --porcelain` vazio (ec=0).
- Veredito parcial: a sonda VÊ o defeito antigo (efeito comitado e recibo recusado; 2 e 10 efeitos). VC2 ACUSOU.

### Item 1 — baseline do autor no meu cluster (insumo, não prova)

`DATABASE_URL=<o meu> CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 600 node --test --import tsx --test-reporter=tap tests/expense-sync-atomic-db.test.ts` no objeto → ec=0; tests 24 / pass 24 / fail 0 / skipped 0; ~15,2 s. Papéis `o6r_%` deixados = 0; tenants = 0. Senha no TAP: 0 ocorrência.

### Item 1 — mutação m5 (releitura dentro da transação abortada)

- `python mut.py apply m5` → âncora 1, trecho novo presente, CRLF, hash-object 092b78ca ≠ blob 0b66a7a4 (prisma.repository.ts). Carga provada pelo import da sonda.
- Irmão que a m5 não deve afetar: smoke sequencial → ec=0, os 3 tipos verdes (1ª processed/false com o delta legítimo; 2ª replayed:true com Δ 0).
- Minha sonda (`J03A_N=3 J03A_ONLY=A1 J03A_TAG=m5`): 9/9 VERMELHO — B = `ERR:25P02 current transaction is aborted, commands ignored until end of transaction block` em create/item/submit; aborted=true; efeitos 1 (A).
- Autor: `--test-name-pattern="^A1 "` → ec=1, `not ok 2 - A1 · …` (fail 1).
- `python mut.py restore m5` → `restored_equals_blob: true`, sha256 b8ecfc51… (= cópia), `status --porcelain` vazio.
- Veredito parcial: m5 MORTA pela minha sonda e pelo A1 do autor.

### Item 1 — mutação A1noclaim (sem claim e sem complete) = VC2 alternativo para item e submit

- `python mut.py apply A1noclaim` → 2 âncoras com count 1 cada (bloco do claim e linha do complete removidos), CRLF, hash-object fd156f70 ≠ blob 527058bc (service.ts); `grep -c 'claimMobileActionReceipt|completeMobileActionReceipt' service.ts` = 0.
- Barreira adaptada (não há claim para pausar): pausa de A no PRIMEIRO write do efeito (`effect_<tipo>`), `J03A_PAUSE=effect J03A_REQB=0` (B não bloqueia na PK porque não há PK disputada).
- Smoke sob o mutante (irmão = a 1ª entrega): 1ª entrega processed/false com o delta legítimo nos 3 tipos (K2t 0, como o mutante manda). A 2ª entrega dobra: create relatórios +1; item itens +1, total 12.34→24.68; submit 409 (relatório já submetido).
- Minha sonda (`J03A_N=3 J03A_ROUNDS=2 … J03A_ONLY=A1,A6`): A1 VERMELHO 9/9 — create efeitos 2 (2 relatórios); item efeitos 2, total 0→24.68; submit efeitos 2 (dois `expense_report.submitted`, B bloqueou na linha do relatório e reaplicou depois de A). A6 VERMELHO 6/6 — 10 efeitos por rodada; item total 0→123.4; dist {não-replay 10}.
- Autor: `--test-name-pattern="^A(1|6) "` → ec=1; `not ok 2 - A1 …` e `not ok 11 - A6 …` (fail 2).
- `python mut.py restore A1noclaim` → `restored_equals_blob: true`, sha256 0340348c…, `status --porcelain` vazio. Fixtures: 16/16 removidas, sobra 0.
- Veredito parcial: A1noclaim MORTA pela sonda (2 e 10 efeitos, nos 3 tipos) e pelo A1/A6 do autor. Com a base B (create) acusando e a A1noclaim acusando nos 3 tipos, o VC2 do item 1 ACUSOU.

### Item 1 — VEREDITO PARCIAL: VERDE
No objeto: 195/195 rodadas com 1 efeito por ação; perdedor relê sem 25P02/40P01 (0/195); A5 sem recibo órfão (30/30); A3c: o segundo ator sai `conflict action_owned_by_other_actor` com resultRef null e zero efeito em 120/120, nas duas ordens e com gestor e técnico; A6 1 não-replay + 9 replays com o mesmo ref em 15/15, 0 × 503. VC1, VC2 e VC3 acusaram. m5 e A1noclaim mortas pela minha sonda e pelo autor. Achados: nenhum.

## Item 2 — falha injetada tipo × ponto e crash real, no OBJETO

Comando: `J03A_TAG=obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=$SCRATCH J03A_OUT=$SCRATCH/out-i2-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx probe/item2.mts` (item2.mts md5 0cde2cfb88b051af66d39b01b29abc34 nesta execução; crashchild.mts md5 b7d6e66c403bfab41edd036b938d644b). 00:17:36Z → 00:17:50Z, ec=0. Postura do cliente: j03a_c1_app/false/false.

Mecanismo: linha de controle (tenant da célula, ponto, raise) → `RAISE EXCEPTION 'j03a_c1 falha injetada <ponto> em <tabela>'`. p1 = 1º write do efeito (BEFORE INSERT expense_reports | BEFORE INSERT expense_items | BEFORE UPDATE expense_reports com status mudando); p2 = BEFORE UPDATE do recibo (o complete); p3a = BEFORE INSERT do evento de sync; p3b = CONSTRAINT TRIGGER deferida no evento de sync (dispara no COMMIT, depois de todas as escritas). Por célula: contagem antes/depois, uma ação em OUTRO tenant com o gatilho armado no primeiro, desarme, reenvio da MESMA ação.

| tipo | ponto | resposta (VC1: a falha vista é a minha) | antes → depois (rel·itens·total·status·K2t·cru·incompl·sync·dom) | resíduo | reenvio após desarme | efeitos do reenvio | outro tenant |
|---|---|---|---|---|---|---|---|
| create | p1 | P0001 "falha injetada effect_create em expense_reports" | 0·0·–·–·0·0·0·0·0 → idem | 0 | processed/false | 1 (final 1·0·0·draft·1·0·0·1·1) | processed/false ef 1 |
| create | p2 | P0001 "… complete em mobile_action_receipts" | idem → idem | 0 | processed/false | 1 | ok |
| create | p3a | P0001 "… event_before em expense_events" | idem | 0 | processed/false | 1 | ok |
| create | p3b | P0001 "… event_commit em expense_events" | idem | 0 | processed/false | 1 | ok |
| item | p1 | P0001 "… effect_item em expense_items" | 1·0·0·draft·0·0·0·0·0 → idem | 0 | processed/false | 1 (final total 12.34) | ok |
| item | p2 | P0001 "… complete …" | idem → idem (total 0) | 0 | processed/false | 1 (12.34) | ok |
| item | p3a | P0001 "… event_before …" | idem (total 0) | 0 | processed/false | 1 (12.34) | ok |
| item | p3b | P0001 "… event_commit …" | idem (total 0) | 0 | processed/false | 1 (12.34) | ok |
| submit | p1 | P0001 "… effect_submit em expense_reports" | 1·1·5·draft·0·0·0·0·0 → idem | 0 | processed/false | 1 (final submitted) | ok |
| submit | p2 | P0001 "… complete …" | idem (draft) | 0 | processed/false | 1 (submitted) | ok |
| submit | p3a | P0001 "… event_before …" | idem (draft) | 0 | processed/false | 1 (submitted) | ok |
| submit | p3b | P0001 "… event_commit …" | idem (draft) | 0 | processed/false | 1 (submitted) | ok |

- 12/12 células: falha injetada vista (VC1 ACUSOU em 12/12), resíduo 0 (efeito, recibo, evento, total e status iguais aos de antes), reenvio = 1 efeito, K2t +1, incompletos 0.
- VC3 (o gatilho só pega a sua célula): o sync em outro tenant, com o gatilho ARMADO no tenant da célula, saiu processed/false com 1 efeito em 12/12; depois do desarme o mesmo tenant voltou ao normal (reenvio 12/12). O DROP final dos gatilhos e o sync sequencial depois dele estão no teardown.

Crash REAL (b): filho `node --import tsx probe/crashchild.mts` (application_name j03a_c1_crash) pausado pela minha barreira; `taskkill /F /PID <pid do filho>`; só então solto a trava; espero o backend sumir de pg_stat_activity; conto; desarmo; reenvio pelo pai.
| tipo | pausa | visto antes do kill | taskkill | backend depois do kill (ainda preso) | contagem com a trava presa | backend sumiu após soltar | resíduo | reenvio |
|---|---|---|---|---|---|---|---|---|
| create | depois do claim (INSERT do recibo) | Lock:advisory no INSERT mobile_action_receipts | "ÊXITO: o processo com PID 16128 foi finalizado", filho exit 1 | sim, ainda em Lock:advisory | 0 (nada comitado) | sim | 0 | processed/false, 1 efeito |
| create | depois do efeito (UPDATE do recibo) | Lock:advisory no UPDATE mobile_action_receipts | PID 29988 finalizado | sim | 0 | sim | 0 | 1 efeito |
| item | claim | idem | PID 1300 | sim | 1·0·0·draft·0… | sim | 0 (total 0) | 1 efeito |
| item | efeito | idem (UPDATE) | PID 26376 | sim | idem | sim | 0 | 1 efeito |
| submit | claim | idem | PID 29224 | sim | 1·1·5·draft | sim | 0 (status draft) | 1 efeito |
| submit | efeito | idem (UPDATE) | PID 18740 | sim | idem | sim | 0 | 1 efeito |
- 6/6: o servidor desfez tudo (contagens = antes, nenhum recibo), backend encerrado depois de soltar a trava, o filho nunca imprimiu "FILHO TERMINOU", reenvio = 1 efeito.
- Fixtures: 31 criadas, 31 removidas, sobra 0.

### Item 2 — VC2 (a matriz vê a escrita parcial) na base B
- `python mut.py swapbase` (8/8 provados) → `J03A_TAG=baseB J03A_KINDS=create J03A_ONLY=matrix J03A_POINTS=p2 J03A_P2=claim … node --import tsx probe/item2.mts` (item2.mts md5 5ee57b2e4dcdf505b6cb23cb4d6bd22b — só ganhou as variáveis J03A_POINTS/J03A_P2) → ec=0 → `restorebase` (8/8 eq_obj, porcelain vazio).
- Na base o recibo é INSERT DEPOIS do efeito (transações separadas); o p2 equivalente é a falha no INSERT do recibo ('claim'). Resultado: VERMELHO como esperado — resposta P0001 "falha injetada claim em mobile_action_receipts"; antes 0·…·0 → depois rel 1, dom 1, recibo 0 (efeito sem recibo, resíduo 1); reenvio processed/false e efeitos 2 (final rel 2, total 0|0, cru 1, sync 1). VC2 ACUSOU.

## PAUSA 2026-10-12T00:18:44Z

Ordem de PAUSA do orquestrador (P7) recebida depois de concluído o último comando (registro do item 2 no objeto + VC2 na base, ec=0). Nenhum comando novo aberto.

- **Head medido:** objeto b75a0c2e96a80b2f54cc629fe856d16660ccbe86 (ls-remote = gh headRefOid às 23:57:43Z); worktree C:/Users/AMP/w-j03a-c1 em b75a0c2e, `status --porcelain` = 0 linhas (nenhum arquivo de src mutado ou trocado: a última operação foi `mut.py restorebase` com 8/8 eq_obj).
- **Feito (comandos e saídas acima, nesta evidência):**
  - Legalidade e terreno (§0–§0.3): corpo/mandato conferidos, inspetor LIBERADO COM RESSALVA, check-runs 14/0/0, worktree + npm ci + cluster j03a-c1-pg (porta 58471) + papel j03a_c1_app sem BYPASSRLS, 108 migrações, read committed, injetor de falhas instalado.
  - Item 1 COMPLETO e VERDE: 195/195 no objeto; VC1/VC2/VC3 acusaram; m5 e A1noclaim mortas (sonda + autor). Voto: campo item1 gravado.
  - Item 2 PARCIAL: matriz 12/12 verde no objeto, crash real 6/6 verde, VC1/VC3 acusaram, VC2 (base B, create p2) acusou.
- **Falta:**
  - Item 2(c): mutações m2, m3, m4, m7 — cada uma: `apply` → smoke (irmão) → matriz própria (12 células) → autor `--test-name-pattern="^A2(b|c)? "` → `restore` com prova.
  - Item 3 inteiro: (a) diff prisma/migrations e restrições/índices + extrator de DDL; (b) extrator tenant-first + VC2 numa cópia; (c) A8 por execução (3 tenants, leitura/escrita cruzada, tenant da carga, GUC lido); (d) K2t de pior caso/ASCII/UUID com octet_length e decode; (e) A8mut e A0super; VCs do item 3.
  - Fechamento: voto final, teardown (faults-drop.sql + sync sequencial depois do DROP, docker rm -f -v j03a-c1-pg, worktree remove), checagem de espaço em fim de linha.
- **Próximo comando exato:**
  `P=<SCRATCH>/probe; S=<SCRATCH>; SW=$(cygpath -m $S); cd C:/Users/AMP/w-j03a-c1; M=m2; J03A_SCRATCH=$SW timeout 60 python $P/mut.py apply $M` — seguido de `J03A_TAG=$M J03A_ONLY=matrix J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=$SW J03A_OUT=$SW/out-$M-i2.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 600 node --import tsx $P/item2.mts`, depois `DATABASE_URL=<admin do meu cluster> … node --test --import tsx --test-reporter=tap --test-name-pattern="^A2(b|c)? " tests/expense-sync-atomic-db.test.ts`, depois `python $P/mut.py restore $M`.
- **Arquivos meio-escritos / estado de pé:**
  - Voto `03a-C1-voto.json`: esqueleto com item1 gravado; item2 e item3 `EM APURAÇÃO`; `voto` = `EM APURAÇÃO` (não há voto).
  - Nenhum arquivo de src mutado (porcelain 0). Cópias de backup em $SCRATCH/bk (de restaurações já concluídas).
  - Gatilhos MEUS ainda instalados no meu cluster (inertes): 7 `j03a_c1_*` (rcpt_ins, rcpt_upd, rep_ins, item_ins, rep_sub, evt_ins, evt_def) + função `j03a_c1_fault()` + tabela `j03a_c1_ctl` com 0 linhas. Travas consultivas presas: 0. Fixtures `j03a-c1-%`: 0.
  - De pé, por ordem do orquestrador: container `j03a-c1-pg` (127.0.0.1:58471) e worktree `C:/Users/AMP/w-j03a-c1`. Segredos do cluster em $SCRATCH/.pgpw e .apppw.
  - $SCRATCH = C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/j03a-c1 (sondas: probe/lib.mts e8a23d75…, item1.mts b00999d7…, item2.mts 5ee57b2e…, crashchild.mts b7d6e66c…, smoke.mts 02758d20…, mut.py 23d43055…, faults-install.sql ed84edb0…, faults-drop.sql 0650ad5d…).

## Sucessor 2026-10-12T22:36:53Z (Codex)

- Papel: C1, banco e transação. Identidade NOVA: `jurado-o6r03a-v2-banco-cdx`. Modelo: `gpt-5.6-sol`, esforço `high`, nível menor (fonte: `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `decisoes.md:3132` no objeto; equivalência do nível menor no §C7.6). Sucessão P3 determinada pelo dono; a identidade anterior pausada não é reutilizada.
- Corpo `.claude` EOL-neutro medido no objeto `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`: `4afc985059608ce41053a15d9366578f`, igual ao publicado. Mandato cru: `0afcf0f948a8e2e3ba1b31421d3afa84`, igual ao publicado. O nome sucessor tem 0 ocorrências no obituário do objeto.
- Terreno ao assumir: `C:/Users/AMP/w-j03a-c1` existe, HEAD `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, `git status --porcelain` vazio; os 8 arquivos da sonda conferem com os md5 registrados. `j03a-c1-pg` está ativo na porta isolada 58471 (a primeira consulta usou um filtro de nome ancorado incompatível com o Docker CLI e retornou vazio; a listagem geral confirmou o container). Disco C: 3,7 GB livres, abaixo do piso de criação de worktree de R5, mas o worktree já existia; acima da parada de ~2 GB do corpo. Não farei novo `npm ci` nem criarei worktree adicional.
- Antes da cauda, reexecuto os comandos registrados pela cadeira anterior e comparo as saídas. Comando abreviado por `…` no registro não é herdado como conclusão: uso a sonda identificada pelo md5 e publico o comando completo nesta seção.

### P3 — reexecução do terreno e do item 1

- Comandos de legalidade reexecutados sob Git Bash, todos com `timeout`: `git ls-remote origin refs/heads/fix/expense-sync-atomic`; `gh pr view 425 --json headRefOid,baseRefName,state,isDraft,mergeable`; hashes EOL-neutros dos dois corpos; hash cru e EOL-neutro do mandato; `git -C C:/Users/AMP/w-j03a-c1 rev-parse HEAD` e `status --porcelain`; consultas no cluster para role, migrações, isolamento, locks e fixtures. Saída comparada: objeto Git = objeto GitHub = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; corpo `.claude` `4afc985059608ce41053a15d9366578f`; corpo `.agents` `bf857394ffea8485d7e63f84ac28d1de`; mandato cru `0afcf0f948a8e2e3ba1b31421d3afa84` e EOL-neutro `26dd48775a5236186956515c5f2f62a7`; worktree limpo; role `j03a_c1_app|f|f|f`; 108 migrações; `read committed`; controle/locks/fixtures `0|0|0`. O estado corresponde ao registrado. O setup criador (`worktree add`, `docker run`, `CREATE ROLE`) não é repetível sobre os mesmos nomes preservados; revalidei seus pós-estados e não herdei conclusão deles. `npm ci` não foi repetido porque C: tinha 3,7 GB; as sondas e `npm run check` carregaram o `node_modules` próprio existente.
- Smoke reexecutada: `J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-successor-smoke.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 120 node --import tsx <scratch>/probe/smoke.mts`; ec=0, 5 linhas, md5 `79cc1b24f86df38fe7a6ca0f0f20c57d`. Postura na conexão do serviço `j03a_c1_app/false/false`, GUC igual ao tenant; create/item/submit: primeira entrega `processed/replayed:false` com delta legítimo; segunda `replayed:true` e delta zero; total do item `0→12.34`, status `draft→submitted`; 3/3 fixtures removidas. Igual em forma ao registro anterior (valores UUID naturalmente novos). VC3 acusou.
- Item 1 objeto reexecutado: `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=successor-obj ... timeout 900 node --import tsx <scratch>/probe/item1.mts`; ec=0, 197 linhas, md5 `0d0497439070dc4fbb5cc5d9e2460c82`. Resultado comparado: 195/195 verdes; A1/A5/A3c N=10 por tipo, A3c nas quatro ordens/perfis; A6 5 rodadas por tipo. Um efeito por ação; B observado em `Lock:transactionid` antes de soltar A; 0 ocorrências de 25P02/40P01; A3c segundo ator `conflict/action_owned_by_other_actor/resultRef null`; A6 `1 não-replay + 9 replays`, zero 503; 196/196 fixtures removidas. Igual ao resultado registrado.
- Vermelho-controle base B reexecutado: `mut.py swapbase` provou 7 blobs iguais a B e removeu o arquivo novo; A1/A6 create (`N=10`, `ROUNDS=5`) deu 2 efeitos em 10/10 e 10 efeitos em 5/5, respectivamente; B em `Lock:transactionid`; `mut.py restorebase` provou 8/8 iguais ao objeto e worktree limpo. Item 2/base p2 também foi repetido: efeito sem recibo e reenvio com 2 efeitos. VC2 acusou.
- Teste do autor reexecutado no objeto, cluster próprio: `DATABASE_URL=<admin do cluster> ... timeout 600 node --test --import tsx --test-reporter=tap tests/expense-sync-atomic-db.test.ts`; ec=0; 24 testes, 24 pass, 0 fail, 0 skip; segredo no TAP = 0.
- `m5` reexecutada com `apply → npm run check → smoke → sonda A1 N=3 → autor ^A1 → restore`: âncora 1, hash mutado `092b78ca...`; smoke ec=0; sonda acusou 25P02 em 9/9; autor ec=1 com A1 vermelho; restauro igual ao blob e worktree limpo. `A1noclaim` reexecutada com `apply → smoke → sonda A1/A6 (N=3, R=2) → autor ^A(1|6) → restore`: duas âncoras únicas, hash `fd156f70...`; sonda acusou 2 efeitos em A1 9/9 e 10 efeitos em A6 6/6; autor derrubou A1 e A6; restauro igual ao blob.
- Veredito parcial sucessor, item 1: **VERDE**. Todos os comandos de mérito registrados foram reexecutados e comparados; VC1/VC2/VC3 acusaram; `m5` e `A1noclaim` morreram. Achados: nenhum.

### P3 + cauda — item 2

- Objeto reexecutado: `J03A_TAG=successor-obj ... timeout 900 node --import tsx <scratch>/probe/item2.mts`; ec=0, 20 linhas, md5 `78871b1e79427bc09354e1331e203ad7`. Matriz 12/12: a falha P0001 do injetor foi vista, antes=depois para efeito/recibo/eventos/total/status, reenvio `processed/false` com um efeito; outro tenant não afetado. Crash real 6/6: processo filho morto em claim e complete por tipo, backend ainda visto em Lock até liberar, depois desapareceu; zero resíduo; reenvio com um efeito. Fixtures 31/31 removidas. Igual em forma ao registro anterior.
- `m2`: `apply → npm run check → smoke → matriz 12 células → autor ^A2(b|c)? → restore`; check/smoke ec=0. Nas 12/12 células a sonda acusou recibo K2t incompleto órfão e reenvio `receipt_unverifiable` sem efeito; o outro tenant continuou normal. Autor: A2 e A2b vermelhos, A2c verde previsto (1 pass, 2 fail, 21 skip). Restauro igual ao blob.
- `m3`: a primeira passagem carregou (`npm run check` ec=0), mas a função de postura da sonda não atravessava o Proxy mutante (`$queryRawUnsafe` ausente); essa passagem não foi usada. Repeti com cópia mecânica da sonda que suprimiu somente as 3 linhas de postura (`item2.mts` `5ee57b2e...`→`d61e2116...`, âncora 1, restaurada a `5ee57b2e...`), mantendo a postura já provada antes da mutação. Matriz 12/12 acusou escrita parcial: p1 deixou recibo incompleto; p2/p3 deixaram efeito/total/status/evento e recibo parcial conforme o ponto, nos três tipos. Autor: A2/A2b/A2c vermelhos. Irmão que m3 não deve afetar, A10, passou isolado (1 pass, 0 fail, 23 skip). Fonte e sonda restauradas; worktree limpo.
- `m4`: check/smoke ec=0; a matriz acusou efeito fora da transação em p2/p3a/p3b para create/item/submit: create dobrou 1→2, item total 0→12.34→24.68, submit ficou `submitted` sem recibo e o retry foi recusado; A2/A2b vermelhos e A2c verde previsto. Restauro igual ao blob.
- `m7`: check/smoke ec=0; 12/12 tentativas foram recusadas pelo CHECK `mobile_action_receipts_status_check`, SQLSTATE 23514, antes do injetor; zero efeito/recibo/evento e retry igualmente recusado. Autor A2/A2b/A2c vermelho; restauro igual ao blob.
- Vermelhos-controle do item 2: VC1, falha própria vista em 12/12 no objeto; VC2, base B deixou efeito sem recibo e dobrou no retry, e m3 mostrou escrita parcial; VC3, outro tenant normal em 12/12 e objeto normal depois do desarme. `m2/m3/m4/m7` foram todos vistos pela sonda e pelo autor com irmão carregável/verde quando aplicável.
- Veredito parcial sucessor, item 2: **VERDE** no objeto; nenhum resíduo em 12/12 falhas e 6/6 kills, total/status intactos, retry com um efeito. Achados: nenhum.

## Sucessor 2026-10-13T01:59:33Z (Codex 2)

- Papel: C1, banco e transação. Identidade NOVA: `jurado-o6r03a-v2-banco-cdx2`. Modelo: `gpt-5.6-sol`, esforço `high`, nível menor (fonte: `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `decisoes.md:3132` no objeto; equivalência no §C7.6). Sucessão P3: reexecuto cada comando registrado pelos antecessores antes de aceitar os itens 1 e 2 e só então meço o item 3.
- Legalidade reexecutada, PowerShell chamando Git Bash com `timeout`: `git ls-remote origin refs/heads/fix/expense-sync-atomic`; `gh pr view 425 --json headRefOid,baseRefName,state,isDraft,mergeable`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<objeto>/check-runs?per_page=100`; hashes do corpo e mandato. Resultado: Git e GitHub = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; PR OPEN, não rascunho, MERGEABLE; check-runs `14 total | 0 não-verdes | 0 pendentes`; `backend-postgres` completed/success nos dois runs; corpo `.claude` EOL-neutro `4afc985059608ce41053a15d9366578f`; mandato cru `0afcf0f948a8e2e3ba1b31421d3afa84`. Parecer do inspetor: LIBERADO COM RESSALVA e confere a cadeira original; R2 manda esta identidade sucessora nova. Nome `jurado-o6r03a-v2-banco-cdx2` no obituário do objeto: 0.
- Terreno revalidado: `C:/Users/AMP/w-j03a-c1` existe em `b75a0c2e`, `git status --porcelain` vazio; `j03a-c1-pg` ativo exclusivamente em `127.0.0.1:58471`; `j03a-c2-pg` e `erp-*` apenas listados, não são alvo. Sondas preservadas e medidas: `lib.mts e8a23d75...`, `item1.mts b00999d7...`, `item2.mts 5ee57b2e...`, `crashchild.mts b7d6e66c...`, `smoke.mts 02758d20...`, `mut.py 23d43055...`, `faults-install.sql ed84edb0...`, `faults-drop.sql 0650ad5d...`; conferem com o registro. Há ainda `item3-extractor.mjs 5c16a2d...` e `item3.mts 83011a81...`, sem conclusão registrada: são apenas rascunhos a inspecionar e executar. Disco C: 9,62 GB livres — abaixo do piso de criação de worktree de R5, por isso nenhum worktree/npm ci novo; acima da parada de ~2 GB. `node.exe`: 6. R11a permanece A RE-VERIFICAR: antes e após cada mutação será provado `hash-object = blob` e worktree limpo; o drill 3a não integra o mandato C1.

## Sucessor 2026-10-13T06:23:42Z (Codex 3)

- Papel: C1, banco e transação. Identidade NOVA: `jurado-o6r03a-v2-banco-cdx3`. Modelo: `gpt-5.6-sol`, esforço `high`, nível menor (fonte: `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `decisoes.md:3132` no objeto; equivalência no §C7.6). Sucessão P3 após queda registrada de Codex 2; reexecuto os comandos registrados antes de medir a cauda, sem usar conclusão herdada como insumo.
- Legalidade própria: corpo `.claude` EOL-neutro no objeto = `4afc985059608ce41053a15d9366578f`, igual ao publicado; mandato cru = `0afcf0f948a8e2e3ba1b31421d3afa84`, igual ao publicado; parecer do inspetor = `LIBERADO COM RESSALVA`; nome `jurado-o6r03a-v2-banco-cdx3` no obituário do objeto = 0 ocorrências.
- Objeto resolvido por duas fontes em 2026-10-13T06:23:42Z: `git ls-remote origin refs/heads/fix/expense-sync-atomic` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; `gh pr view 425` = mesmo `headRefOid`, base `main`, OPEN, não rascunho. Check-runs no objeto: `14 total | 0 pendentes | 0 não-verdes`; `backend-postgres` = `completed/success` nos dois runs.
- Terreno restaurado conferido antes de usar: C: 24 GB livres; `C:/Users/AMP/w-j03a-c1` em `b75a0c2e`, `status --porcelain` = 0; `expense-management-prisma.repository.ts` no disco e no blob = `0b66a7a494c8182406d01dbba1f9845c24725735`; `j03a-c1-pg` Up em `127.0.0.1:58471`; outros containers apenas listados (`j03a-c2-pg`, `erp-postgres`, `erp-redis`), não tocados. Os 10 hashes das sondas conferem com o registro, inclusive `item3-extractor.mjs 5c16a2d...` e `item3.mts 83011a81...` sem conclusão herdada.

### P3 — reexecução própria do item 1 (Codex 3)

- Pós-estado do terreno, por execução: `docker exec j03a-c1-pg psql -U postgres -d j03a_c1 ...` → papel `j03a_c1_app = rolsuper false, rolbypassrls false, rolinherit false`; 108 migrações; `read committed`; controle/locks/fixtures = `0|0|0`. `npm run check` no worktree → ec=0. A tentativa anterior com `psql` Windows e `PGPASSFILE` expirou em 30 s sem consultar; não foi usada como prova. O `docker exec` no container próprio fechou a medição.
- Smoke reexecutada: `J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx3-smoke.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 120 node --import tsx <scratch>/probe/smoke.mts` → ec=0, 5 linhas, md5 `2014f45918efa867457f3fc2536d8e68`; postura `j03a_c1_app/false/false`, GUC igual ao tenant; create/item/submit com primeira entrega `processed/false`, replay `processed/true`, deltas legítimos, item `0→12.34`, submit `draft→submitted`, fixtures 3/3 removidas. Igual em forma ao registro; VC3 acusou.
- Objeto reexecutado: `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=cdx3-obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx3-i1-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx <scratch>/probe/item1.mts` → ec=0, 197 linhas, md5 `dd37c29747434fc00c538ee0e80f5be3`. Resultado comparado: 195/195 verdes; A1/A5/A3c N=10 por tipo e A3c nas quatro ordens/perfis; A6 5 rodadas por tipo. Um efeito por ação; B em `Lock:transactionid` antes de soltar A; 0 × 25P02/40P01; A3c segundo ator `conflict/action_owned_by_other_actor/resultRef null`; A6 `1 não-replay + 9 replays`, zero 503; fixtures 196/196 removidas.
- Vermelho-controle base B reexecutado com comando completo: `mut.py swapbase` → 7 blobs iguais a B e arquivo novo removido; `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=cdx3-baseB J03A_KINDS=create J03A_ONLY=A1,A6 ... item1.mts` → A1 com 2 efeitos em 10/10 e A6 com 10 efeitos em 5/5, B observado em `Lock:transactionid`; `J03A_ONLY=matrix J03A_POINTS=p2 J03A_P2=claim ... item2.mts` → efeito sem recibo e reenvio com 2 efeitos; `mut.py restorebase` → 8/8 iguais ao objeto e worktree limpo. VC2 acusou.
- Teste do autor no objeto, pela forma Linux obrigatória da máquina: `timeout 900 bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-j03a-c1 "node --test --import tsx --test-reporter=tap tests/expense-sync-atomic-db.test.ts"` → ec=0; 24 testes, 24 pass, 0 fail, 0 skip; worktree limpo.
- `m5` reexecutada: `mut.py apply m5` (âncora 1, hash `092b78ca...` ≠ blob), `npm run check` ec=0, smoke ec=0, `J03A_N=3 J03A_ONLY=A1 ... item1.mts` → 25P02 em 9/9; autor `^A1 ` no `teste-linux.sh` → ec=1, A1 vermelho (1 fail, 23 skip); `mut.py restore m5` → igual ao blob, worktree limpo.
- `A1noclaim` reexecutada: duas âncoras únicas, hash `fd156f70...` ≠ blob; check/smoke ec=0; `J03A_N=3 J03A_ROUNDS=2 J03A_ONLY=A1,A6 J03A_PAUSE=effect J03A_REQB=0 ... item1.mts` → A1 com 2 efeitos em 9/9 e A6 com 10 efeitos em 6/6; autor `^A(1|6) ` no `teste-linux.sh` → ec=1, A1 e A6 vermelhos (2 fail, 22 skip); restauração igual ao blob e worktree limpo.
- Veredito parcial próprio, item 1: **VERDE**. Todos os comandos de mérito registrados foram reexecutados e comparados; VC1/VC2/VC3 acusaram; `m5` e `A1noclaim` morreram na sonda e no autor. Achados: nenhum.

### P3 — reexecução própria do item 2 (Codex 3)

- Objeto reexecutado: `J03A_TAG=cdx3-obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx3-i2-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx <scratch>/probe/item2.mts` → ec=0, 20 linhas, md5 `7f8039aa29422bcf20b3100f01801b22`. Matriz 12/12: falha P0001 própria vista, antes=depois para efeito/recibo/eventos/total/status, reenvio `processed/false` com um efeito, outro tenant normal. Crash real 6/6: filho morto em claim e complete nos três tipos, backend ainda observado em `Lock:advisory` até liberar e depois ausente, zero resíduo, reenvio com um efeito; fixtures 31/31 removidas. Igual em forma ao registro.
- `m2`: `apply → npm run check → smoke → matriz 12 células → autor A2/A2b/A2c no teste-linux.sh → restore`. Check/smoke ec=0; 12/12 células deixaram recibo K2t incompleto órfão e reenvio `receipt_unverifiable` sem efeito, outro tenant normal. Autor: A2 e A2b vermelhos, A2c verde previsto (1 pass, 2 fail, 21 skip). Restauro igual ao blob e worktree limpo.
- `m3`: `apply m3` (âncora 1, hash `ccc3faa6...` ≠ blob), check ec=0; cópia mecânica da sonda sem somente as três linhas de postura, `item2-cdx3-m3.mts` md5 `96c15b49355b5e4d595a67b6ec878d1a`, preservando a postura provada antes da mutação. Matriz 12/12 acusou escrita parcial: p1 deixou recibo incompleto; p2/p3 deixaram efeito, total/status, evento e recibo parcial conforme o ponto nos três tipos. Autor A2/A2b/A2c vermelho (3 fail, 21 skip); irmão A10 verde isolado (1 pass, 0 fail, 23 skip). Fonte restaurada; sonda original permaneceu md5 `5ee57b2e...`; worktree limpo.
- `m4`: check/smoke ec=0; matriz acusou efeito fora da transação em p2/p3a/p3b para create/item/submit: create dobra, item dobra total e submit fica `submitted` sem recibo com retry recusado. Autor A2/A2b vermelhos e A2c verde previsto (1 pass, 2 fail, 21 skip); restauro igual ao blob, worktree limpo.
- `m7`: check/smoke ec=0; 12/12 tentativas recusadas antes do injetor pelo CHECK `mobile_action_receipts_status_check`, SQLSTATE 23514; zero efeito/recibo/evento e retry igualmente recusado. Autor A2/A2b/A2c vermelho (3 fail, 21 skip); restauro igual ao blob, worktree limpo.
- Vermelhos-controle do item 2: VC1, falha própria vista em 12/12 no objeto; VC2, base B deixou efeito sem recibo e dobrou no retry, e m3 mostrou escrita parcial; VC3, outro tenant normal em 12/12 e objeto normal depois do desarme. Todos os testes `-db` de autoria desta sucessão rodaram no container Linux isolado por `teste-linux.sh`.
- Veredito parcial próprio, item 2: **VERDE** no objeto; nenhum resíduo em 12/12 falhas e 6/6 kills, total/status intactos e retry com um efeito. Achados: nenhum.

## Sucessor 2026-10-13T11:31:54Z (Codex 4)

- Papel: C1, banco e transação. Identidade NOVA: `jurado-o6r03a-v2-banco-cdx4`. Modelo: `gpt-5.6-sol`, esforço `high`, nível menor (fonte: `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `decisoes.md:3132` no objeto; equivalência no §C7.6). Sucessão P3 após queda registrada do Codex 3: itens 1 e 2 voltam a `EM APURAÇÃO` até a reexecução própria; depois meço a cauda, item 3.
- Corpo `.claude` EOL-neutro no objeto = `4afc985059608ce41053a15d9366578f`, igual ao publicado. Mandato cru = `0afcf0f948a8e2e3ba1b31421d3afa84`, igual ao publicado; o EOL-neutro medido é `26dd48775a5236186956515c5f2f62a7`. Parecer do inspetor = `LIBERADO COM RESSALVA`; aplico R1/R2/R3/R5/R7.
- Legalidade própria em 2026-10-13T11:31:54Z: `git ls-remote origin refs/heads/fix/expense-sync-atomic` e `gh pr view 425` resolveram `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, PR OPEN, não rascunho; API do SHA retornou 14 check-runs, 0 pendentes e 0 não-verdes. O objeto não andou. Worktree `C:/Users/AMP/w-j03a-c1` está no objeto e limpo; cluster `j03a-c1-pg` está Up só em `127.0.0.1:58471`; outros containers foram apenas listados e não são alvo. Disco C: 16 GB livres, acima do piso de 10 GB. Os 10 hashes das sondas conferem com o registro, inclusive os dois rascunhos do item 3, que ainda não são conclusão.

### P3 — reexecução própria do item 1 (Codex 4)

- Smoke: `J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx4-smoke.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 120 node --import tsx <scratch>/probe/smoke.mts` → ec=0, 5 linhas, md5 `afaecb760af457c6213ef67d6b9ee02d`. A conexão do serviço imprimiu `j03a_c1_app`, `super=false`, `bypass=false`, GUC igual ao tenant. Create/item/submit: primeira entrega `processed/false` com delta legítimo; replay `processed/true` com delta zero; item `0→12.34`; submit `draft→submitted`; fixtures 3/3 removidas. VC3 acusou.
- Objeto: `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=cdx4-obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx4-i1-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx <scratch>/probe/item1.mts` → ec=0, 197 linhas, md5 `c21bb1af16aa5f08b386cf56b669bdf8`. Resultado comparado: 195/195 verdes; A1/A5/A3c N=10 por tipo, A3c nas quatro ordens/perfis; A6 5 rodadas por tipo. Um efeito por ação; B observado em `Lock:transactionid` antes de soltar A; 0 × 25P02/40P01; A3c segundo ator `conflict/action_owned_by_other_actor/resultRef null`; A6 `1 não-replay + 9 replays`, zero 503; fixtures 196/196 removidas. VC1 acusou.
- VC2/base B: `mut.py swapbase` provou os 7 arquivos existentes iguais a B e removeu `expense-sync.ts`; A1/A6 create (`N=10`, `ROUNDS=5`) reproduziu 2 efeitos em 10/10 e 10 efeitos em 5/5, respectivamente, com B em `Lock:transactionid`; item 2/base create p2 reproduziu efeito sem recibo e retry com 2 efeitos; `mut.py restorebase` provou 8/8 iguais ao objeto e worktree limpo. VC2 acusou.
- Autor no objeto, na forma Linux obrigatória: `timeout 900 bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-j03a-c1 "node --test --import tsx --test-reporter=tap tests/expense-sync-atomic-db.test.ts"` → ec=0; 24 testes, 24 pass, 0 fail, 0 skip; worktree limpo.
- `m5`: `apply → npm run check → smoke → sonda A1 N=3 → autor ^A1 no teste-linux.sh → restore`; âncora 1, hash `092b78ca...` ≠ blob; check/smoke ec=0; sonda acusou 25P02 em 9/9; autor ec=1 com A1 vermelho (1 fail, 23 skip); restauro igual ao blob e worktree limpo.
- `A1noclaim`: `apply → npm run check → smoke → sonda A1/A6 N=3,R=2 → autor ^A(1|6) no teste-linux.sh → restore`; duas âncoras únicas, hash `fd156f70...` ≠ blob; check/smoke ec=0; sonda acusou 2 efeitos em A1 9/9 e 10 efeitos em A6 6/6; autor ec=1 com A1 e A6 vermelhos (2 fail, 22 skip); restauro igual ao blob e worktree limpo.
- Veredito parcial próprio, item 1: **VERDE**. Todos os comandos registrados foram reexecutados e comparados; VC1/VC2/VC3 acusaram; `m5` e `A1noclaim` morreram na sonda e nos testes de autoria. Achados: nenhum.

### P3 — reexecução própria do item 2 (Codex 4)

- Objeto: `J03A_TAG=cdx4-obj J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx4-i2-obj.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 900 node --import tsx <scratch>/probe/item2.mts` → ec=0, 20 linhas, md5 `77bb55e9d6ae0113aa28f73b72489035`. Matriz 12/12: falha P0001 própria vista, antes=depois para efeito/recibo/eventos/total/status, reenvio `processed/false` com um efeito e outro tenant normal. Crash real 6/6: filho morto em claim e complete nos três tipos, backend observado em `Lock:advisory` até a liberação e depois ausente, zero resíduo e reenvio com um efeito. Fixtures 31/31 removidas. Igual em forma ao registro.
- `m2`: `apply → npm run check → smoke → matriz 12 células → autor A2/A2b/A2c no teste-linux.sh → restore`. Check/smoke ec=0; 12/12 células deixaram recibo K2t incompleto órfão e reenvio `receipt_unverifiable` sem efeito. Autor: A2 e A2b vermelhos, A2c verde previsto (1 pass, 2 fail, 21 skip). Restauro igual ao blob e worktree limpo.
- `m3`: `apply → npm run check → sonda mecânica sem somente as três linhas de postura (`item2-cdx3-m3.mts`, md5 `96c15b49355b5e4d595a67b6ec878d1a`) → autor A2/A2b/A2c → irmão A10 isolado → restore`. Check ec=0; matriz 12/12 acusou escrita parcial nos três tipos e pontos; autor A2/A2b/A2c vermelho (3 fail, 21 skip); A10 verde isolado (1 pass, 0 fail, 23 skip). Restauro igual ao blob e worktree limpo.
- `m4`: `apply → npm run check → smoke → matriz 12 células → autor A2/A2b/A2c → restore`. Check/smoke ec=0; a matriz acusou efeito fora da transação em p2/p3a/p3b, 9/12 células: create dobrou, item chegou a total 24.68 e submit permaneceu `submitted` sem recibo. Autor A2/A2b vermelhos e A2c verde previsto (1 pass, 2 fail, 21 skip). Restauro igual ao blob e worktree limpo.
- `m7`: `apply → npm run check → smoke → matriz 12 células → autor A2/A2b/A2c → restore`. Check/smoke ec=0; 12/12 tentativas recusadas pelo CHECK `mobile_action_receipts_status_check`, SQLSTATE 23514, antes do injetor; zero escrita da ação e retry igualmente recusado. Autor A2/A2b/A2c vermelho (3 fail, 21 skip). Restauro igual ao blob e worktree limpo. A expressão de encerramento da chamada esperava por engano `smoke ec=1`, então o comando agregador devolveu ec=1 apesar de imprimir todos os seis pós-estados corretos; essa expectativa do invocador não é insumo, e o smoke real foi ec=0 como registrado.
- Vermelhos-controle: VC1, falha própria vista em 12/12 no objeto; VC2, base B deixou efeito sem recibo e dobrou no retry, e m3 mostrou escrita parcial; VC3, outro tenant normal em 12/12 e objeto normal depois do desarme. Todos os testes `-db` desta sucessão rodaram no container Linux isolado por `teste-linux.sh`.
- Veredito parcial próprio, item 2: **VERDE** no objeto; nenhum resíduo em 12/12 falhas e 6/6 kills, total/status intactos e retry com um efeito. Todos os comandos registrados foram reexecutados e comparados. Achados: nenhum.

### Cauda — item 3: tenant-first, RLS e integridade da PK sem schema novo (Codex 4)

- Terreno revalidado antes do item: `docker exec j03a-c1-pg psql ...` → `j03a_c1_app|rolsuper=f|rolbypassrls=f|rolinherit=f`; 108 migrações; `read committed`; `expense_reports`, `expense_items`, `expense_events` e `mobile_action_receipts` com `relrowsecurity=t` e `relforcerowsecurity=t`; controle/travas/fixtures = `0|0|0`.
- (a) `git diff --name-only 9566d55b... b75a0c2e... -- prisma migrations` → vazio, ec=0. Restrições de `mobile_action_receipts`: PK `(tenant_id, client_action_id)`; CHECK `status IN ('processed','failed','conflict')`; FKs tenant-first para ator e tenant. Índices: PK tenant+client_action_id e quatro índices iniciados por tenant (`action_type`, `actor_user_id`, `tenant_id`, `status`).
- Extrator AST próprio `item3-extractor.mjs`, md5 `5c16a2d8479cb8d131f5fa80d3a40e8f`, sobre os 8 blobs de `src/` do bloco: 21 chamadas sintáticas; 19 são chamadas Prisma reais e todas as 19 têm `tenant_id` direto ou no `where` indireto; as duas marcadas `missing` eram `createHash(...).update(...)`, não Prisma. As 13 strings que o regex amplo marcou como DDL eram somente literais de tipo de ação `expense_report.create`/`expense_item.create`; não há string SQL DDL. `git grep` no objeto não encontrou `$executeRaw`/`$queryRaw` nos 8 arquivos.
- VC2 do extrator: cópia no scratch `cdx4-tenant-mut.ts`, md5 `d35851b8a41225fce99c78ccf8e5a4bd`; a âncora `where: { tenant_id: input.tenantId, id: input.reportId }` era 1, removi somente `tenant_id`, a âncora antiga passou a 0 e a nova a 1. O extrator acusou exatamente uma chamada Prisma real sem tenant: `findFirst`, linha 85 da cópia. O arquivo do worktree permaneceu igual ao blob e o status vazio. Controle acusou.
- (c)(d) Sonda própria inspecionada `item3-cdx3.mts`, md5 `05f497828ef8dc4f9ed546554b5c3a3c` (difere do rascunho só na leitura correta do erro 404). Comando: `J03A_MODE=object J03A_ROOT=C:/Users/AMP/w-j03a-c1 J03A_SCRATCH=<scratch> J03A_OUT=<scratch>/out-cdx4-i3-object.jsonl CORE_SAAS_PERSISTENCE=memory LOG_LEVEL=silent timeout 300 node --import tsx <scratch>/probe/item3-cdx3.mts` → ec=0, `ok=true`, fixtures 3/3 removidas.
  - Mesma ação em T1/T2/T3: três `processed/replayed:false`, cada tenant com 1 relatório, 1 K2t, 1 evento sync e 1 evento de domínio. A mesma conexão do serviço imprimiu `j03a_c1_app`, super=false, bypass=false e GUC igual ao tenant em 3/3.
  - RLS: papel sem GUC viu `0/0/0` relatórios/recibos/eventos; com GUC de T2, a leitura explicitamente dirigida a T1 viu `0/0/0`; com GUC de T1 viu `1/1/2`; o admin viu as três organizações `3/3/6`. Escrita de T2 no reportId de T1 respondeu 404 `EXPENSE_NOT_FOUND` e deixou os dois tenants inalterados. `tenantId`/`tenant_id` forjado na carga não moveu o efeito: T1 ficou em 1 relatório e T2 foi de 1 para 2.
  - K2t: id de 160 unidades escapadas → 1125 bytes; ASCII 160 → 325 bytes; UUID v4 → 201 bytes. Os três foram gravados, decodificados de volta byte a byte e ficaram abaixo de 2704 bytes.
- `A8mut`: mutação removeu o GUC da fronteira transacional (âncora 1; hash diferente), `npm run check` ec=0. Sonda `J03A_MODE=A8mut` imprimiu a mesma conexão `j03a_c1_app`, super=false, bypass=false, GUC=null; o RLS recusou o INSERT com SQLSTATE 42501 e antes=depois zero. Autor `^A8 ` no `teste-linux.sh` ficou vermelho (1 fail, 23 skip). Restauro igual ao blob e worktree limpo.
- `A0super`, versão própria: sonda com o cliente admin imprimiu `postgres`, super=true, bypass=true; a asserção de postura falhou e a leitura de T1 sob GUC T2 passou a ver 1. Na mutação do autor, as duas âncoras dos clientes de serviço eram únicas e foram trocadas pelo `admin`; hash mutado `e759e4d6...` ≠ blob `5a137a37...`; `^A0 ` no `teste-linux.sh` ficou vermelho (1 fail, 23 skip). O teste foi restaurado ao blob e o worktree ficou limpo.
- VCs do item 3: (1) RLS mordeu: admin viu 3 tenants, papel sem GUC viu 0 e com GUC viu só o próprio; (2) extrator acusou exatamente a chamada adulterada; (3) postura do serviço foi provada pela própria conexão e a versão superusuária falhou. Todos acusaram. A afirmação R11a não foi herdada: em cada troca/mutação desta sucessão o arquivo restaurado teve `hash-object = blob` e `status --porcelain` vazio. O drill 3a permanece matéria C2, não foi usado.
- Veredito parcial próprio, item 3: **VERDE**. Sem schema novo ou DDL runtime; 19/19 chamadas Prisma reais tenant-first; RLS/PK/CHECK/índices e K2t satisfazem o mandato; `A8mut` e `A0super` morreram. Achados: nenhum.

## Sucessor 2026-10-13T16:33:23Z (Codex 5)

- Papel: C1, banco e transação. Identidade NOVA: `jurado-o6r03a-v2-banco-cdx5`. Modelo declarado pela invocação: `gpt-5.6-sol`, esforço `high`, nível menor (fonte: `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`, `decisoes.md:3132` no objeto; §C7.6). Sucessão P3 após queda do Codex 4: nenhuma conclusão anterior foi herdada como fato.
- Legalidade própria: corpo `.claude` EOL-neutro no objeto = `4afc985059608ce41053a15d9366578f`, igual ao publicado; mandato cru = `0afcf0f948a8e2e3ba1b31421d3afa84`, igual ao publicado. O cálculo preliminar `b3d64...` foi descartado porque substituição de comando removeu o newline final; a medição válida foi o pipe direto `git show ... | tr -d '\r' | md5sum`. Parecer = `LIBERADO COM RESSALVA`.
- Objeto por duas fontes: `git ls-remote` e `gh pr view 425` = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`, PR OPEN, não rascunho. Terreno antes do mérito: disco C: 12 GB livres; worktree no objeto e `status --porcelain` vazio; `j03a-c1-pg` Up somente em `127.0.0.1:58471`; papel `j03a_c1_app` = super f, bypassrls f, inherit f; 108 migrações; `read committed`. `j03a-c2-pg`, `erp-postgres` e `erp-redis` apenas listados, nunca tocados.

### P3 — item 1 reexecutado (Codex 5)

- Objeto, comando registrado reexecutado: `J03A_N=10 J03A_ROUNDS=5 J03A_TAG=cdx5-obj ... timeout 900 node --import tsx <scratch>/probe/item1.mts` → ec=0, 197 linhas, md5 `69daa2a4093701279cd311f7256d7fdb`. Resultado: 195/195 verdes; A1/A5/A3c N=10 por tipo; A3c nas quatro ordens/perfis; A6 5 rodadas por tipo. Um efeito por ação; B observado em `Lock:transactionid`; 0 ocorrências de 25P02/40P01; segundo ator em A3c = `conflict/action_owned_by_other_actor/resultRef null`; A6 = 1 não-replay + 9 replays e zero 503; fixtures 196/196 removidas.
- VC2/base B: `mut.py swapbase` confirmou 7 blobs iguais a B e removeu o arquivo novo; A1/A6 create reproduziu 2 efeitos em 10/10 e 10 efeitos em 5/5; matriz create/p2 deixou efeito sem recibo e o reenvio terminou com 2 efeitos. `restorebase` confirmou 8/8 iguais ao objeto, `status` vazio.
- `m5`: apply com âncora 1 e hash mutado `092b78ca...`; check ec=0; smoke ec=0; sonda A1 N=3 acusou 25P02 em 9/9; teste do autor `^A1 ` no container Linux ec=1, 1 fail; restore = blob e worktree vazio.
- `A1noclaim`: apply com duas âncoras únicas e hash `fd156f70...`; check/smoke ec=0; sonda A1 N=3 e A6 R=2 acusou 2 efeitos em 9/9 e 10 efeitos em 6/6; teste do autor `^A(1|6) ` no container Linux ec=1, 2 fails; restore = blob, worktree vazio. VCs 1/2/3 acusaram.
- Veredito parcial próprio, item 1: **VERDE**. Achados: nenhum. Item 2 e item 3 permanecem `EM APURAÇÃO` nesta sucessão.

### P3 — item 2 reexecutado (Codex 5)

- Objeto: `J03A_TAG=cdx5-obj ... timeout 900 node --import tsx <scratch>/probe/item2.mts` → ec=0, 20 linhas, md5 `8bbd4b35bc384839cb19a28f05d8186b`. Matriz 12/12: P0001 próprio visto e antes=depois para efeito/recibo/eventos/total/status; reenvio `processed/false` com um efeito; outro tenant normal. Crash real 6/6: filho morto em claim e complete nos três tipos, backend observado em `Lock:advisory` até soltar e depois ausente, zero resíduo, reenvio com um efeito; fixtures 31/31 removidas.
- `m2`: apply (2 âncoras, hash diferente), check/smoke ec=0; matriz 12/12 acusou recibo incompleto e reenvio `receipt_unverifiable`; autor A2/A2b vermelho e A2c verde previsto (2 fail, 1 pass); restore = blob, worktree vazio.
- `m3`: apply (âncora 1, hash `ccc3faa6...`), check ec=0; sonda mecânica registrada `item2-cdx3-m3.mts` md5 `96c15b49355b5e4d595a67b6ec878d1a` acusou escrita parcial em 12/12; autor A2/A2b/A2c vermelho (3 fail), irmão A10 isolado verde (1 pass); restore = blob, worktree vazio.
- `m4`: apply (âncora 1, hash diferente), check/smoke ec=0; matriz acusou efeito fora da transação em 9/12 células (p2/p3a/p3b nos três tipos); autor A2/A2b vermelho, A2c verde previsto; restore = blob, worktree vazio.
- `m7`: apply (âncora 1, hash diferente), check/smoke ec=0; 12/12 recusadas pelo CHECK com SQLSTATE 23514 antes do injetor; autor A2/A2b/A2c vermelho (3 fail); restore = blob, worktree vazio. VCs 1/2/3 acusaram.
- Veredito parcial próprio, item 2: **VERDE**. Achados: nenhum. Item 3 permanece `EM APURAÇÃO` nesta sucessão.

### P3 — item 3 reexecutado e voto consolidado (Codex 5)

- Schema/estrutura: `git diff B objeto -- prisma migrations` = 0 caminhos. No cluster próprio, PK = `(tenant_id, client_action_id)`; CHECK = `processed|failed|conflict`; FKs tenant-first; PK e quatro índices começam por tenant. As quatro tabelas do mandato têm RLS/FORCE = true/true.
- Extrator AST `item3-extractor.mjs` md5 `5c16a2d...` sobre os 8 arquivos: 21 chamadas sintáticas, 19 Prisma reais, 19/19 tenant-first; as 2 restantes eram `createHash().update()`. As 13 strings DDL eram literais de tipo de ação, sem execução SQL. VC2 na cópia `cdx4-tenant-mut.ts` acusou exatamente um `findFirst` sem tenant na linha 85.
- Sonda objeto `J03A_MODE=object ... item3-cdx3.mts` → ec=0, `ok=true`, fixtures 3/3 removidas. Mesma ação em T1/T2/T3 produziu três efeitos isolados; conexão do serviço = `j03a_c1_app`, super=false, bypass=false, GUC correto. Sem GUC: 0/0/0; GUC T2 lendo T1: 0/0/0; GUC T1: 1/1/2; admin: 3/3/6. Escrita cruzada respondeu 404 e não alterou dados. Tenant forjado não moveu o efeito. K2t = 1125/325/201 bytes, três round-trips verdadeiros e abaixo de 2704.
- `A8mut`: âncora 1, check ec=0; sonda viu GUC null, papel sem BYPASSRLS e SQLSTATE 42501 com antes=depois zero; autor `^A8 ` vermelho (1 fail); restore = blob, worktree vazio.
- `A0super`: sonda própria imprimiu `postgres`, super=true, bypass=true; a asserção de postura falhou e GUC T2 passou a ver T1 (=1). Mutação do autor trocou as duas conexões do serviço por `admin`, hash `e759e4d6...` != blob; `^A0 ` vermelho (1 fail); reversão conferida por hash `5a137a37...` = blob, worktree vazio. VCs 1/2/3 acusaram.
- Veredito parcial próprio, item 3: **VERDE**. Achados: nenhum. Campo `voto` consolidado imediatamente como **APROVADO**.

### Teardown e conferência final

- Antes do desmonte: controle/travas consultivas/fixtures = `0:0:0`. `faults-drop.sql` removeu 7 gatilhos, função e tabela; pós-contagem = 0 gatilhos e 0 fixtures.
- Fonte restaurada: teste A0 `hash-object 5a137a37...` = blob; repository `0b66a7a4...` = blob; `status --porcelain` vazio.
- `docker rm -f -v j03a-c1-pg` ec=0; containers `j03a-c1-*` restantes = 0. `git worktree remove --force C:/Users/AMP/w-j03a-c1` ec=0; path e registro do worktree ausentes; processos com o caminho, excluída a própria sonda, = 0. Base viva e recursos alheios nunca tocados.
- A remoção do scratch C1 foi tentada após validar o caminho absoluto exato, primeiro por PowerShell e depois por Git Bash; ambas foram recusadas pela política de execução antes de iniciar a exclusão. Resíduo: somente o scratch temporário C1 com logs/sondas; nenhuma credencial foi publicada. Não declarei limpeza inexistente.
- Objeto final: git remoto = gh PR 425 = `b75a0c2e96a80b2f54cc629fe856d16660ccbe86`; check-runs = 14 total, 0 não-verdes, 0 pendentes; backend-postgres = completed/success em dois runs.

VOTO: APROVADO — A1/A5/A6/A3c com barreira observada, N=10 por cenário × 3 tipos: 1 efeito por ação; crash em p1/p2/p3a/p3b × 3 tipos e kill real: zero resíduo; RLS sob papel sem BYPASSRLS, 19/19 chamadas Prisma reais tenant-first, PK/CHECK intactos; mutantes exigidos mortos; nenhum achado.
