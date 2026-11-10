# B-ASS-08 parte 1 (PR #522) — diário do 2º CONSERTO (dev), incremental (P1)

- **Dev:** identidade NOVA e exclusiva `dev-522-c2`, **Claude Opus 5.5 — nível menor DECLARADO** (§C7.6). Não achei (o
  diagnóstico é do workflow `causa-raiz-t-obx-db-1`), não planejei (síntese `sint-c2-opus`; emendas §13 e §14
  `topo3-j522-opus`), não critiquei (`crit-522-c2`, Codex) e não vou conferir. Não sou o `ass08c1` (dev do 1º conserto).
- **Cruzamento (§C7 item 11(1)):** o dev é Claude; a conferência e as cadeiras C2/C3 refeitas são de outro modelo.
- **Plano (fonte única):** `erp-pausa-2026-10-03/planos/B-ASS-08-conserto-c2.md`, §0–§14. A **§14 prevalece** sobre o E5 (§2.2,
  §4) e o E5′ (§13.2): o claim é o **E5″** (demonstrativo e linha da fila numa instrução só, o demonstrativo PRIMEIRO, as duas
  cláusulas com SKIP LOCKED, sem laço de adiamento; teto declarado de 2 000 ms por claim em N = 20 000). A §13 vale no resto
  (E6′/E7′, T-LOCK-2). A crítica de outro modelo fez 2 rodadas (`revisoes/ci522/crit-522-c2-r2.json`: VOLTA só em
  C2-CLAIM-STARVATION-25 + C2-CLAIM-BUDGET-STARVATION, ambos cobertos pela §14); não há terceira.
- **Ref medida (§A7):** `git rev-parse origin/feat/b-ass-08-outbox-webhooks` = `807deb7eda80be65393f2ec2ce75f2be52d0d76b`
  (o objeto do mandato). O ramo local estava em `0b5d7d0d`, ancestral do remoto (`git merge-base --is-ancestor` verdadeiro;
  2 commits atrás: o merge `807deb7e` e o `75572269`): avançado por `git merge --ff-only`. Nenhum código lido do disco de
  outra sessão; as sondas de `revisoes/ci522/topo3-sondas/` e `topo4-sondas/` são só referência de comportamento.
- **Terreno:** worktree próprio `C:/Users/thiag/w-dev522` (caminho curto), `npm ci` próprio (sem junction, §C7.1-ter(c)),
  `prisma generate` com `DATABASE_URL` fictícia. Postgres 16 descartável `dev522-pg` em `127.0.0.1:5496` (imagem
  `postgres:16-alpine`, padrões da CI: `max_connections 100`, `shared_buffers 128MB`); trabalhos Docker na máquina: `ci522-pg`
  + `dev522-pg` = 2 (teto). O `-db` usa o administrador do MEU cluster só para montar a base própria; o código sob teste roda
  em papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`). Intocados: `w-ass08`, `w-users-seg`, `w-dev525*`,
  `w-ci522-*`, `w-demoint`, `w-crit*`, os containers `ass08pg`, `ass08redis`, `users-seg-pg`, `dev525-pg`, `ci522-pg` e as
  portas 3000/5173/5432/6379.
- **Memória (acréscimo do orquestrador):** medida antes do `npm ci`, do container e de cada suíte pesada; só sigo com
  ≥ 4 GB de commit livre (`(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory/1MB`).

## F0 — terreno e linha de base

| hora (SP, `date`) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 07:16:33 | `date`; memória; `docker ps` | commit livre **4,87 GB**, RAM livre 1,12 GB; Docker: só `ci522-pg` | terreno com vaga para 1 container |
| 07:16 | `git fetch origin`; `git rev-parse origin/feat/b-ass-08-outbox-webhooks`; `git worktree list` | `807deb7e…`; nenhum worktree no ramo; `w-dev522` inexistente | objeto conferido |
| 07:17 | `git worktree add C:/Users/thiag/w-dev522 feat/b-ass-08-outbox-webhooks` → `git merge --ff-only origin/feat/b-ass-08-outbox-webhooks` | `HEAD is now at 0b5d7d0d` → fast-forward → `git rev-parse HEAD` = `807deb7eda80be65393f2ec2ce75f2be52d0d76b` | HEAD = objeto do mandato |
| 07:17 | `git merge-tree --write-tree 807deb7e origin/main` (exit 0); `git diff --name-only 807deb7e...origin/main` | sem conflito; a `main` (`699e6e20`, #526, registro) traz 6 arquivos, todos de `agent-orchestration/` (decisões, status, ata J-522, porteiro-424, J519-C3) — interseção com o PR vazia | merge limpo, como o plano mediu (F0) |
| 07:17 | `git merge --no-ff origin/main` | merge `793fa01e8f8e29decd31da32fdc813e069867614` | **`BASE_C2 = 793fa01e`** (E11: a base da checagem de escopo) |
| 07:17:41 | memória antes do `npm ci` → `npm ci --no-audit --no-fund` | 4,75 GB → `added 326 packages in 42s`, exit 0 | dependências próprias |
| 07:19:30 | `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` | cliente gerado (sem `DATABASE_URL` o `prisma.config` recusa: `PrismaConfigEnvError`) | cliente próprio |
| 07:22:07 | memória → `docker run -d --name dev522-pg -p 127.0.0.1:5496:5432 postgres:16-alpine` | 4,39 GB; `PostgreSQL 16.15`; `show max_connections` 100 (recriado sem `-c max_connections=60`, para espelhar a CI) | banco descartável próprio de pé (2 trabalhos na máquina) |
| 07:23:00→07:23:53 | `DATABASE_URL=postgresql://postgres:dev522@127.0.0.1:5496/postgres npm test -- tests/ass-08-*.test.ts` | 12 arquivos · `# tests 72 · pass 72 · fail 0 · cancelled 0 · skipped 0` | **linha de base**: o verde que o conserto não pode enfraquecer (o T-OBX-db-1 antigo passou nesta execução; a intermitência é a corrida real F3) |

## RETOMADA 1 — F0 empurrada (`c8f5b804`, 07:28:57 SP)

## F1 — E8 em memória (porta `ChargeIntentRepository`, `seq` sob a trava, 409 no conflito)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 07:30 | `git grep -n "requestChargeCreate\|chargeCreateEligibility\|ChargeRequestDeps\|ChargeRequestInput" -- src tests` | chamadores: só `tests/ass-08-charge-request.test.ts` e `tests/ass-08-flow-e2e.test.ts` | nenhuma rota/fechamento chama o pedido (F8 da síntese) |
| 07:30 | testes ESCRITOS ANTES do código: `ass-08-charge-request.test.ts` (T-CHG-5/6 religados a `{ intents: new InMemoryChargeIntentRepository({ statements, charges, outbox, refs }) }`, sem `seq`, asserções iguais; **T-CHG-7** novo; **T-CHG-7b** novo, com `ConflictingOutbox` cujo `enqueue` responde `created: false`); e2e: só a ligação do `requestChargeCreate` | — | — |
| 07:30:23 | **VERMELHO-CONTROLE no objeto** (código de `807deb7e`): `npm test -- tests/ass-08-charge-request.test.ts tests/ass-08-flow-e2e.test.ts` | `not ok 1 … ass-08-charge-request.test.ts`, `not ok 2 … ass-08-flow-e2e.test.ts` — `ERR_MODULE_NOT_FOUND … charge-intent.repository.js`; `# tests 2 · pass 0 · fail 2` | a porta não existe no objeto |
| 07:31 | código: **novo** `charges/charge-intent.repository.ts` (`ChargeIntentTx = { lockStatement, findLiveCharge, listChargeLines, putRef, enqueue }`, `ChargeIntentRepository`, `InMemoryChargeIntentRepository` tipado com os dublês e montado sobre `InMemoryStatementRepository.transaction`); `charge-request.service.ts` (`ChargeRequestDeps = { intents }`, `ChargeRequestInput` SEM `seq`, `requestChargeCreate` = `intents.transaction(… enqueueChargeCreateInTx)`, `enqueueChargeCreateInTx` exportado, `seq = 1 + maxChargeCreateSeq(lines)` sob a trava, `created = false` → 409 `charge_intent_conflict`, comentário l.9-11 reescrito); `charge-eligibility.ts`: só o tipo do 1º parâmetro (`Pick<SubscriptionStatement, "status">`) | — | — |
| 07:31:59 | `npm run check`; `npm test -- tests/ass-08-charge-request.test.ts tests/ass-08-flow-e2e.test.ts tests/ass-08-outbox.test.ts tests/ass-08-charges-profile.test.ts` | `tsc` exit 0; `# tests 25 · pass 25 · fail 0 · skipped 0` | T-CHG-5/6/7/7b e o e2e verdes |
| 07:32 | F1 posta no índice (`git add`), `git diff --exit-code` limpo — cada mutação aparece sozinha no `git diff` e a reversão se prova por `git diff --exit-code` | árvore = índice | protocolo de mutação |
| 07:32 | **M1a** (literal): em `enqueueChargeCreateInTx`, `const eligibility = chargeCreateEligibility(statement, liveCharge, lines)` → `const eligibility = { ok: true } as …` (`1 insertion, 1 deletion`) → `npm test -- tests/ass-08-charge-request.test.ts` | `not ok 1 … (T-CHG-5)`, `not ok 2 … (T-CHG-6)`; `# tests 4 · pass 2 · fail 2` | vermelho medido; revertida por edição inversa, `git diff --exit-code` limpo |
| 07:33 | **M1d** (literal): `const seq = 1 + maxChargeCreateSeq(lines)` → `const seq = 1` | `not ok 3 … (T-CHG-7)` com `error: 'The charge intent key is already in use.'` (o 409 `charge_intent_conflict`); `pass 3 · fail 1` | vermelho medido (409, como o plano diz); revertida, limpo |
| 07:34 | **M1e** (literal): `if (!created) throw new StatementError(409, …)` → `if (!created) return row` | `not ok 4 … (T-CHG-7b)`; `pass 3 · fail 1` | vermelho medido; revertida, limpo |
| 07:35:41 | `git diff --exit-code`; `npm run check`; `npm run lint`; `git diff --cached --check`; as 4 suítes | limpo; 0; 0; 0; `# tests 25 · pass 25 · fail 0` | fatia fechada |

## RETOMADA 2 — F1 empurrada (`e3a01c17`, 07:36:07 SP)

## F2 — E8 no Prisma (`charge-intent.prisma.ts`, as extrações `*InTx`, T-CHG-db-1/2, T-LOCK-1a)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 07:36–07:39 (entre `date` vizinhos) | T-CHG-db-1 ESCRITO ANTES do código, com as deps de `807deb7e` (`{ statements: new PrismaStatementRepository(c), charges, outbox, refs }`, `seq` 1 e 2), no fim de `tests/ass-08-channel-db.test.ts`, com o arnês novo do topo do arquivo: trava numa conexão `pg` própria (`openHolder`, BEGIN … COMMIT), barreira por `pg_stat_activity` escopada à base da suíte (`datname`) e aos papéis do teste (`usename`), com `pg_blocking_pids` (a 2ª sessão pode esperar a 1ª na fila da tupla — lição do S3); `seedStatement` ganha `period` e `refs: false` | — | — |
| 07:39:04 | **VERMELHO-CONTROLE literal**: `git checkout 793fa01e -- src/…/charge-request.service.ts` (o serviço de `807deb7e`) → `DATABASE_URL=…5496… npm test -- tests/ass-08-channel-db.test.ts` → `git checkout HEAD -- …` (`git diff --quiet -- src` = limpo) | `not ok 9 - T-CHG-db-1 …` com `nenhum P2028 (vieram: P2028: … + P2028: Transaction API error: A commit cannot be executed on an expired transaction. The timeout for this transaction was 5000 ms, however 5067 ms passed …)`, `expected 0 · actual 2`, `duration_ms 5305.9`; `# tests 9 · pass 8 · fail 1` | o objeto dá `P2028 + P2028` (o plano mediu `P2028 + P2028` em 3/3, > 4 s) |
| 07:39:04 | **FALHA MINHA, declarada:** a memória medida no início desse mesmo comando foi **3,57 GB** de commit livre, abaixo do piso de 4 GB do orquestrador, e a suíte `-db` rodou assim mesmo (medi e rodei no mesmo comando, sem checar o valor). A partir daqui a medida vem num passo próprio e nada pesado roda abaixo de 4 GB; uma espera em segundo plano registra a medida a cada 60 s (`scratchpad/mem-wait.log`) | — | regra P8/acréscimo do orquestrador violada 1×; nenhum efeito observado na máquina |
| 07:39–07:41 (entre `date` vizinhos) | depois do vermelho, troca SÓ da construção das deps no teste: `deps = (client) => ({ intents: new PrismaChargeIntentRepository(client) })`, `input` sem `seq`; asserções intocadas | — | — |
| 07:41–07:44 (entre `date` vizinhos) | código: **novo** `charges/charge-intent.prisma.ts` (`CHARGE_INTENT_BUDGET = { maxWait 5 000, timeout 15 000, lockTimeoutMs 5 000, statementTimeoutMs 10 000 }`; `prismaChargeIntentTx(tx, tenantId)` com `lockStatement` = `SELECT id, status … WHERE id = $1 AND tenant_id = $2 FOR UPDATE` e `isUuid` antes; `PrismaChargeIntentRepository.transaction` = `withTenantRlsBudget(…)` com 55P03 → `StatementError(409, "statement_busy")`); extrações com o método original delegando: `enqueueInTx`/`listByStatementInTx` + `outboxRowFromDb` (= `toDomain`) + `postgresErrorCode` em `outbox.prisma.ts` (o auxiliar do 55P03 mora no módulo de baixo para o `retry` da F6 usá-lo sem ciclo de import), `findLiveInTx` em `charges.prisma.ts`, `putRefInTx` em `statement-refs.prisma.ts` (tipo do parâmetro `Pick<PrismaClient, "$queryRawUnsafe">`, que o `tx` satisfaz, para não mexer nos imports) | — | — |
| 08:01:43 | `git diff -- <arquivo> \| grep -c '^@@'` nas extrações | `statement-refs.prisma.ts`: **1 hunk** (+25/−18); `charges.prisma.ts`: **2 hunks** (+11/−7); `outbox.prisma.ts`: 3 hunks, +47/−24 (sem teto no plano) | **divergência medida × §5 ("1 hunk por arquivo"):** em `charges.prisma.ts` a função de topo não fica a ≤ 6 linhas de `findLive` (3º método da classe) sem mover código; os 2 hunks são SÓ a função extraída e a delegação (conferível por `git diff 793fa01e.. -- src/modules/subscription-billing/charges/charges.prisma.ts`). Mover métodos daria mais ruído, não menos |
| 07:44–07:47 (entre `date` vizinhos) | **novo** `tests/helpers/lock-order-recorder.ts` (PERMITIDO §13.3.6): o gravador do T-LOCK (Proxy no `PrismaClient`: `$transaction` com a pilha de quem abriu; o `tx` grava cada `$queryRaw*`/`$executeRaw*` e cada `tx.<model>.<op>`; SQL cru fora de transação vai para `outside`). T-CHG-db-2 (pedido isolado < 1 s, 1 PENDING sem `customerId`, índice com a organização; e o braço 55P03: demonstrativo travado além do `lock_timeout` → 409 `statement_busy`, rollback limpo) e **T-LOCK-1a** (1 transação, `outside` vazio, instruções 1–3 `set_config`, a 4ª a trava do demonstrativo, 8 no total) escritos | — | — |
| 07:41→ | **espera de memória** (acréscimo do orquestrador): 3,03 → 3,53 → 3,26 → 3,39 → 3,12 → 3,31 → 2,98 → 3,10 → 3,01 GB (medidas de `date` + `FreeVirtualMemory` entre 07:41 e 08:01); commit total da máquina 64,23 GB, quase todo da VM do WSL e de outros processos; `dev522-pg` usa 79 MiB (`docker stats`) | nada pesado rodou; rascunhos das fatias seguintes escritos FORA do worktree (scratchpad), para não misturar fatias na árvore | aguardo ≥ 4 GB para o `tsc` e a suíte `-db` da F2 |
| 08:02 (`date` do comando anterior: 08:01:43) | **correção de registro da F1:** as horas "07:30" (testes escritos), "07:31" (código), "07:32", "07:33" e "07:34" (M1a, M1d, M1e) da tabela da F1 não vieram de `date` no mesmo comando: são do intervalo entre os `date` medidos (07:30:23, 07:31:59 e 07:35:41). Os resultados (saídas) são os registrados; só a hora é aproximada | — | a regra "hora de `date`" vale daqui em diante sem exceção |
| 08:09:39 → 08:09:55–08:11:02 | memória **4,07 GB** (o orquestrador soltou o cache da VM do Docker às ~08:10) → `npm run check` | `tsc` exit 0 (F2 compila); a medida seguinte, 08:11:02, deu 3,81 GB, e o laço de 60 s registrou **1 216 MB às 08:10:48**, durante o `tsc` (somado à suíte da pré-revisão do #527) | o `tsc` também conta como processo pesado: só com ≥ 4 GB |
| 08:10 | mensagem do orquestrador: seguir esperando a regra de ≥ 4 GB; com folga, **re-rodar o vermelho-controle do T-CHG-db-1 com ≥ 4 GB e registrar as duas saídas** | preparado `scratchpad/redctl-chgdb1.mjs` (aplica as deps de `807deb7e` e o `seq` 1/2 no teste, com backup; desfaz pelo backup) | a re-execução vem antes da suíte verde da F2 |
| 08:13:19 → 08:14:10 | **RE-EXECUÇÃO do vermelho-controle com memória suficiente** (ordem do orquestrador): memória **4,07 GB** → `node scratchpad/redctl-chgdb1.mjs apply` (deps de `807deb7e` + `seq` 1/2 no T-CHG-db-1, backup no scratchpad) → `git checkout 793fa01e -- src/…/charge-request.service.ts` → `npm test -- tests/ass-08-channel-db.test.ts` → `git checkout HEAD -- …` + `redctl restore` | `not ok 9 - T-CHG-db-1` com `nenhum P2028 (vieram: StatementError 422 charge_already_exists + P2028: … The timeout for this transaction was 5000 ms, however 5049 ms passed …)`, `duration_ms 5313.6`; também `not ok 3 - T-OBX-db-1` (forma ANTIGA, par do mesmo demonstrativo) com `expected 'claimed' · actual 'needs_review'` em 260 ms, e `not ok 10/11` (T-CHG-db-2, T-LOCK-1a) com `Cannot read properties of undefined (reading 'transaction')` (o serviço antigo não conhece `{ intents }`); `# tests 11 · pass 7 · fail 4`. Restauro: `git diff --quiet HEAD -- charge-request.service.ts` e `cmp` do teste com o backup, ambos limpos | **as duas saídas do vermelho-controle:** 07:39 (3,57 GB) `P2028 + P2028` em 5 306 ms; 08:13 (4,07 GB) `422 + P2028` em 5 314 ms — o 2º pedido às vezes vê a linha que a conexão separada do 1º gravou depois do rollback dele (o "às vezes sem linha" da L3c). Nos dois: P2028, > 5 s. O T-OBX-db-1 antigo vermelho é a intermitência F3 da síntese (o COMMIT de Y antes da releitura de X), ainda com o claim do objeto na árvore |
| 08:19:02 | CI do head `e3a01c17` (F1): `gh run list --branch feat/b-ass-08-outbox-webhooks`; `gh run view 42800514376 --job 129776637546 --log` (job `backend` da execução `push`) | `push` 42800514376: `backend` failure, demais jobs success, `docker` skipped; resumo TAP do `backend`: `# tests 4825 · pass 4822 · fail 1 · cancelled 0 · skipped 2`, único `not ok 322 - T-OBX-db-1: dois workers … pegam linhas DISTINTAS` (a forma ANTIGA do par do mesmo demonstrativo); `pull_request` 42800522103: success | a F1 não quebrou nada; o vermelho é a intermitência F3 da síntese, que a F4 corrige reformando o T-OBX-db-1 (critério 4) |
| 08:15→08:57:57 | espera de memória para a suíte verde da F2: esperas com condição (`FreeVirtualMemory ≥ 4,05 GB`, medição a cada 5 s) | 3,9 → 3,4 → 3,0 → 2,8 GB (último: 2,79 GB às 08:57:57; RAM física livre 1,37 GB); Docker inalterado (`dev522-pg` 68 MiB, `ci522-pg` 172 MiB) | nada pesado rodou; F2 continua escrita e não validada |
| 09:12 | mensagem do orquestrador: ~40 GB presos fora dos processos; regime de **bastão** (um agente pesado por vez): agora com o dev do #525, depois a pré-revisão do #527, depois este dev; **com o bastão, piso de 3,0 GB**; sem bastão, só leitura e rascunho (nada de suíte, `tsc`, lint nem mutação) | espera de 4 GB em segundo plano parada (`TaskStop bzxli8xmr`) | aguardo o bastão |

## PAUSA 2026-11-10 09:19 SP (12:19 UTC) — a rodada do dev foi encerrada pelo harness sem o bastão de memória (nada pesado pôde rodar desde 08:14)

- **Head empurrado:** `e3a01c17` (F0 `c8f5b804` + F1 `e3a01c17`; este registro vai num commit só de diário). `BASE_C2 = 793fa01e`. PR #522 `OPEN`, head remoto `e3a01c17` antes deste commit.
- **Feito:** F0 (linha de base 72/72); F1 (E8 em memória, T-CHG-5/6/7/7b, M1a/M1d/M1e vermelhas, CI do `e3a01c17`: `backend` push `# tests 4825 · pass 4822 · fail 1 · skipped 2`, único `not ok` o T-OBX-db-1 ANTIGO, a intermitência F3; `pull_request` verde); F2 ESCRITA (porta Prisma `charge-intent.prisma.ts`, extrações `enqueueInTx`/`listByStatementInTx`/`findLiveInTx`/`putRefInTx`, `postgresErrorCode`, T-CHG-db-1/2, T-LOCK-1a, gravador `tests/helpers/lock-order-recorder.ts`), com `tsc` verde (08:09:55) e o vermelho-controle literal do T-CHG-db-1 medido DUAS vezes (07:39 `P2028 + P2028` com 3,57 GB — falha minha de piso, declarada; 08:13 `422 + P2028` com 4,07 GB).
- **Meio-escrito, NÃO commitado (no worktree `C:/Users/thiag/w-dev522`):** F2 = `src/modules/subscription-billing/charges/charge-intent.prisma.ts` (novo), `charges/charges.prisma.ts`, `outbox/outbox.prisma.ts`, `webhooks/statement-refs.prisma.ts`, `tests/ass-08-channel-db.test.ts`, `tests/helpers/lock-order-recorder.ts` (novo); F3 (só testes, ainda sem o código) = `tests/ass-08-outbox.test.ts` (T-OBX-18 novo e a fixture `STMT_2` do T-OBX-12 — o vermelho-controle do T-OBX-18 no dublê do objeto ainda NÃO rodou). Nada disso foi medido verde.
- **Falta:** F2 = a suíte verde, M1b e M1c (`f2-battery.sh`), o gerador do T13 (`node scripts/san3-05-acessos-de-plataforma.mjs .`) com as chaves novas (`-.enqueueInTx`, `-.listByStatementInTx`, `-.findLiveInTx`, `-.putRefInTx`, `-.lockStatement`; sai a de `PrismaStatementRefRepository.put`), o T13, o `lint`, commit e push; depois F3, F4, F4b, F5, F5b, F6, F6b, F6c, F7 e F8 do plano (§13.4 com a §14.5).
- **Rascunhos e roteiros (fora do repositório, prontos):** `C:/Users/thiag/erp-pausa-2026-10-03/revisoes/ci522/dev522-c2-rascunhos/` — claim E5″ sem função interna (o gerador do T13 chavearia uma `const settle` como método falso), dublê na ordem nova, testes `-db` da F4/F4b/F5b/F6, braços do T-OBX-17, o classificador/censo do T-LOCK-2, os cenários de `statements/` da F6c, o texto da F7, `mut.mjs` (M1b/M1c), `f2-battery.sh` e as saídas TAP. Os roteiros apontam para o scratchpad desta sessão: ao retomar, troque `SP=` pela pasta acima.
- **Decisões de fatia declaradas (não mudam o plano):** a reforma do T-OBX-db-1 vai com o código da F3 (o E5″ deixa a forma antiga deterministicamente vermelha); o vermelho-controle dos `-db` da F4 se mede pondo o `outbox.prisma.ts` do commit da F2 na árvore; `AdoptionFacts.totalCents` é `number | null` (o dublê sem total falha fechado); o `adoptionFacts` Prisma entra na F5 para a F5 compilar, com os testes `-db` na F5b.
- **Terreno ao parar:** monitor e esperas de memória parados (`TaskStop`); container `dev522-pg` REMOVIDO para liberar a vaga de Docker (a próxima rodada sobe outro: `docker run -d --name dev522-pg -e POSTGRES_PASSWORD=dev522 -p 127.0.0.1:5496:5432 postgres:16-alpine`); worktree mantido.
- **Próximo comando exato (com o bastão):** `docker run …dev522-pg…` → `git -C C:/Users/thiag/w-dev522 add <os 6 arquivos da F2>` → `bash <pasta dos rascunhos>/f2-battery.sh all` → gerador do T13 → T13 → `npm run lint` → commit `fix(billing): pedido de cobrança numa conexão, com o demonstrativo travado` → push.

## RETOMADA 3 — 09:48 SP: o BASTÃO DE MEMÓRIA veio do orquestrador (piso 3,0 GB enquanto com ele; passos pesados um de cada vez; `o6r07c-census-guard` e `inventory-write-paths-guard` só sozinhos e por último)

| hora (SP, `date`) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 09:50:03 | memória; `docker ps`; `git rev-parse --short HEAD`; `git fetch`; `origin/main` | 5,86 GB; nenhum trabalho Docker; HEAD `4d7574f6` = remoto; `main` parada em `699e6e20` | terreno livre |
| 09:50:37 | `docker run -d --name dev522-pg … postgres:16-alpine`; `SP=` do `f2-battery.sh` → `revisoes/ci522/dev522-c2-rascunhos` | PostgreSQL 16.15; 1 trabalho Docker | — |
| 09:50:57→09:51:41 | `git add` dos 6 arquivos da F2 → `f2-battery.sh green` (memória 5,68 GB): `npm test -- channel-db charge-request flow-e2e outbox charges-profile` | `# tests 37 · pass 36 · fail 1`; os 11 do `channel-db` verdes (T-CHG-db-1 em 245 ms; T-CHG-db-2 com o braço 409 `statement_busy`; T-LOCK-1a; o T-OBX-db-1 antigo passou desta vez); o único `not ok 31` é o **T-OBX-18** (da F3, já na árvore) com `expected 0 · actual 1` | F2 verde; **vermelho-controle da F3 medido**: no dublê do objeto, duas vivas do mesmo demonstrativo dão 1 `createCharge` |
| 09:52:10→09:53:28 | **M1b** (literal possível, declarado): no `PrismaChargeIntentRepository.transaction`, o `enqueue` do `tx` trocado por `new PrismaOutboxRepository(this.client).enqueue(…)` (outra conexão; o `prismaChargeIntentTx` não tem o `client`) — `mut.mjs apply M1b`, 2 trocas → `npm test -- tests/ass-08-channel-db.test.ts` → `revert` | `pass 8 · fail 3`: `not ok 9 T-CHG-db-1` (15 306 ms), `not ok 10 T-CHG-db-2` e `not ok 11 T-LOCK-1a`, todos com `Transaction API error: A commit cannot be executed on an expired transaction … 14994 ms passed` (P2028); `git diff --exit-code` limpo depois do revert | M1b vermelha por P2028, como o plano mede |
| 09:53:56→09:54:31 | **M1c** (literal): `lockStatement` sem `FOR UPDATE` → `channel-db` → `revert` | `pass 9 · fail 2`: `not ok 9 T-CHG-db-1` com `o outro sai 422 charge_already_exists (veio: StatementError 409 charge_intent_conflict)` e `not ok 11 T-LOCK-1a` com `a 4ª instrução é a trava do demonstrativo`; o T-CHG-db-2 segue verde (o seu 409 vem do KEY SHARE do INSERT); revert limpo | M1c vermelha, como o plano previu (409 em vez de 422) |
| 09:54:45→09:55:30 | gerador do T13 `node scripts/san3-05-acessos-de-plataforma.mjs .` (memória 5,31 GB) | exit 0, stderr vazio, 120 chaves; NOVAS: `charge-intent.prisma.ts -.lockStatement subscription_statements ×1`, `charges.prisma.ts -.findLiveInTx subscription_statement_charges ×1`, `outbox.prisma.ts -.enqueueInTx billing_outbox ×2`, `-.listByStatementInTx billing_outbox ×1`, `statement-refs.prisma.ts -.putRefInTx OPACO ×1`, todas `PARAMETRO(tx)`; SAIU `PrismaStatementRefRepository.put` (o método não tem mais SQL) | as 5 chaves coladas no T13 com o motivo em 1 linha cada; literal L0 (123) intocado |
| 09:56:14→09:57:21 | `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` sozinho (memória 5,43 → 5,38 GB) | `# tests 35 · pass 35 · fail 0` | ratchet atualizado |
| 09:57:36→09:58:03 | `npm run lint` (= `npm run check`, `package.json`); `git diff --cached --check` | lint 0; diff-check 0; 7 arquivos no índice (os 6 da F2 + o T13) | fatia fechada |

## RETOMADA 4 — F2 empurrada (`f2a5969e`, 09:58:32 SP); o orquestrador confirmou às 09:59. Antes de cada passo pesado: 1ª linha de `painel/bastao-memoria.txt` = `dev-522-c2`

## F3 — E4 (irmã viva = conjunto do D1) e E5″ (a pick conjunta do demonstrativo e da linha, sem laço de adiamento)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 09:51:41 | (na rodada verde da F2) **vermelho-controle do T-OBX-18** no dublê do objeto | `not ok 31 … (T-OBX-18)` com `expected 0 · actual 1`: duas `charge_create` PENDING do mesmo demonstrativo → 1 `createCharge` | o dublê do objeto cobra uma das duas vivas |
| 09:59–10:00 | **T-OBX-db-1 reformado** (E10/critério 4; DECLARADO: vem nesta fatia, não na F4, porque o E5″ deixa a forma antiga — par do mesmo demonstrativo exigindo `claimed × claimed` — deterministicamente vermelha): dois demonstrativos da mesma organização (`2026-10`, `2026-09`), provedor ÚNICO do teste (o claim só vê `enabledProviders`; `provider` é TEXT sem CHECK), barreira `LOCK TABLE billing_outbox IN SHARE ROW EXCLUSIVE MODE` com as duas sessões em `wait_event = relation` bloqueadas pelo arnês; `seedOutboxRow` ganha `provider`; auxiliares `uniqueProvider`, `claimParamsFor`, `outboxRows` | — | — |
| 09:59:51→10:00:39 | bastão = `dev-522-c2`, memória 5,35 GB → `npm test -- tests/ass-08-channel-db.test.ts` com o claim do OBJETO | `# tests 11 · pass 11 · fail 0`; `ok 3 - T-OBX-db-1 (E10) …` | **vermelho-controle do T-OBX-db-1: passa no objeto**, como o plano diz (o vermelho dele é a M4, na F4) |
| 10:00–10:03 | código: `claimNext` E5″ em `outbox.prisma.ts` — (1) órfã `FOR UPDATE SKIP LOCKED`; (2) `SELECT current_setting('enable_nestloop'), set_config('enable_nestloop','off',true)` → `CHARGE_CREATE_JOINT_PICK_SQL` (`FOR NO KEY UPDATE OF s SKIP LOCKED` ANTES de `FOR UPDATE OF o SKIP LOCKED`, `LIMIT 1`, filtros de `o` na instrução de cima) → `set_config('enable_nestloop', <anterior>, true)`; (3) releitura E4 com `o2.status IN ('PENDING','PROCESSING','SENT','NEEDS_REVIEW')`; (4) pick dos outros tipos; o desfecho (SKIPPED/NEEDS_REVIEW/PROCESSING) num trecho só, sem função interna (o gerador do T13 chavearia uma `const settle` como método falso); sumiram o pick único e a ordenação `(status = 'PROCESSING') DESC`; cabeçalho com a regra de ordem do §2.1/§14.2. Dublê: órfã, `charge_create`, outros tipos (sem emular a trava), irmã viva do D1. Comentários de `outbox.repository.ts` e `outbox.types.ts` | — | — |
| 10:03:14→10:03:39 | `npm run check` (memória 5,19 GB) | `tsc` exit 0 | — |
| 10:03:52→10:04:27 | `npm test -- ass-08-outbox ass-08-charge-request ass-08-flow-e2e ass-08-charges-profile ass-08-channel-db` (5,37 GB) | `# tests 37 · pass 37 · fail 0 · skipped 0` (T-OBX-1..18, T-CHG, e2e, T-PRF, os 11 `-db`) | F3 verde |
| 10:04:52 | **M2 no dublê** (literal): em `#readSnapshot`, a irmã viva volta a `(row.status === "SENT" \|\| row.status === "PROCESSING")` (`1 insertion, 1 deletion`) → `npm test -- tests/ass-08-outbox.test.ts` → revertida por edição inversa | `not ok 8 - E4 (critério 2) … (T-OBX-18)` com `expected 0 · actual 1`; `# tests 14 · pass 13 · fail 1`; `git diff --exit-code` limpo | vermelho medido |
| 10:05:23→10:05:49 | gerador do T13 (5,20 GB) | exit 0, stderr vazio; `PrismaOutboxRepository.claimNext`: `billing_outbox ×5 → ×7`, `subscription_statements ×1 → ×2`, NOVA `RAW-SQL($queryRawUnsafe) OPACO ? ×2` (os dois `set_config` do planejador) | chaves e motivos atualizados no T13 |
| 10:06:28→10:07:30 | `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` (5,22 GB) | `# tests 35 · pass 35 · fail 0` | — |
| 10:07:46→10:08:14 | `npm run lint`; `git diff --cached --check` | 0; 0; 6 arquivos no índice | fatia fechada |

## RETOMADA 5 — F3 empurrada (`e2ce1676`, 10:08:46 SP)

## F4 — o par proibido, o claim que nunca espera e a ordem das cláusulas (T-OBX-db-4/5, T-LOCK-1b)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 10:09–10:10 | testes ESCRITOS ANTES (o código é o da F3): `tests/ass-08-channel-db.test.ts` ganha **T-OBX-db-4** ((a) barreira `LOCK TABLE … SHARE ROW EXCLUSIVE`, que aceita "as duas em `relation`" OU "uma esperando e a outra resolvida", + dreno sequencial; (b) dois `runDispatchOutbox` em `Promise.all`, dois papéis, a mesma porta), **T-OBX-db-5** (arnês segura o demonstrativo FOR UPDATE: `null` em < 1 s, linha intocada; depois de pagar e COMMIT, `skipped statement_paid`) e **T-LOCK-1b** (gravador; toda cláusula `FOR …` que trava `subscription_statements` tem SKIP LOCKED; na pick conjunta a cláusula do demonstrativo vem antes da da fila). O helper ganha o leitor de cláusulas (`lockClauses`, `tableAliases`, `clauseTables`, `normalizedSql`). Cada teste usa um provedor ÚNICO | — | — |
| 10:10:44→10:11:23 | **VERMELHO-CONTROLE no claim do objeto**: `git checkout f2a5969e -- src/…/outbox.prisma.ts` (o claim de `807deb7e` + as extrações da F2) → `npm test -- tests/ass-08-channel-db.test.ts` → `git checkout HEAD -- …` (`git diff --quiet HEAD` limpo) | `# tests 14 · pass 11 · fail 3`: `not ok 12 T-OBX-db-4` ("nenhuma das duas é reclamada"), `not ok 13 T-OBX-db-5` ("… (veio: claimed)"), `not ok 14 T-LOCK-1b` ("o claim trava o demonstrativo (a pick conjunta existe)"); `ok 3 T-OBX-db-1` | o objeto reclama as duas vivas e reclama sob a baixa em voo |
| 10:11:50→10:12:29 | rodada verde (4,85 GB) | `# tests 14 · pass 14 · fail 0`; T-OBX-db-5 em 473 ms | F4 verde |
| 10:13:02→10:14:23 | **M4** (literal no E5″: tirar o SKIP LOCKED do pick — as duas cláusulas da pick conjunta) → `-db` → revert | `pass 10 · fail 4`: `not ok 3 T-OBX-db-1` com "barreira não cumprida em 10000 ms" (10 275 ms), e db-4, db-5, T-LOCK-1b; revert limpo | vermelho medido, como o plano diz |
| 10:14:30→10:15:53 | **M2 no SQL** (a irmã da releitura volta a `('SENT', 'PROCESSING')`) | `pass 13 · fail 1`: `not ok 12 T-OBX-db-4` ("nenhuma das duas é reclamada"); revert limpo | vermelho medido |
| 10:16:00→10:17:02 | **M5a** (≡ M5g no E5″: tirar o SKIP LOCKED de `FOR NO KEY UPDATE OF s`) | `pass 10 · fail 4`: `not ok 13 T-OBX-db-5` com `Code: 55P03 … canceling statement due to lock timeout` (6 819 ms), `not ok 14 T-LOCK-1b` "trava do demonstrativo sem SKIP LOCKED", e db-1, db-4; revert limpo | vermelho medido |
| 10:18:04→10:18:58 | **M5b** (tirar a cláusula do demonstrativo inteira) | `pass 12 · fail 2`: `not ok 13 T-OBX-db-5` "(veio: claimed)", `not ok 14 T-LOCK-1b` "o claim trava o demonstrativo"; revert limpo | vermelho medido |
| 10:19:07→10:19:53 | **M5j** (inverter as cláusulas: `OF o` antes de `OF s`) | `pass 13 · fail 1`: `not ok 14 T-LOCK-1b` "a cláusula do demonstrativo vem antes da cláusula da fila"; revert limpo | vermelho medido |
| 10:20:26→10:21:26 | `npm run lint` (3,87 GB); `git diff --exit-code`; `git diff --cached --check` | 0; limpo; 0; 2 arquivos no índice (`channel-db`, o helper) | fatia fechada |

## BASTÃO DEVOLVIDO — 10:22:15 SP (ordem do orquestrador: depois da F4, o bastão vai para a conferência do #525)

- **Ponto exato:** F4 fechada e empurrada em `a9577496` (commit + push + rodada verde 14/14 e as 5 mutações vermelhas). Nada pesado em curso; `dev522-pg` de pé e ocioso.
- **Daqui até o bastão voltar:** só trabalho leve — escrever o código e os testes da F5 (E6′/E7′, `adoptionFacts` na porta, no dublê e no Prisma; T-OBX-11, T-OBX-17 braços 1–8 e 11–14, T-OBX-NODEL), sem suíte, `tsc`, lint nem banco. A 1ª linha de `painel/bastao-memoria.txt` é conferida a cada 5 min; quando voltar a `dev-522-c2`, a F5 é validada (vermelho-controle no objeto, verde, M3a/M3d′/M3e/M3f/M3i, T13, lint, commit e push).

## RETOMADA 6 — 10:55 SP: o bastão voltou (`bastao-memoria.txt` = `dev-522-c2`, 5,47 GB)

## F5 — E6′/E7′: nenhuma cobrança criada nem adotada às cegas (reconsulta sempre antes de criar; adoção só por U ∧ V)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 10:22–10:55 | (sem bastão, trabalho leve) testes da F5 ESCRITOS ANTES do código em `tests/ass-08-outbox.test.ts`: `RecordingPort` com `stored` (o que existe no provedor) e roteiros `createScript` ("lost" cria e perde a resposta; "5xx"/"429" sem criar), `lookupScript` e `ensureScript`; T-OBX-11 com leitor `closedWithTotal(19990)` e `lookups` `[STMT, STMT]`; **T-OBX-17** braços 1–8 e 11–14; **T-OBX-NODEL**. Código da F5 escrito FORA da árvore (`rascunhos/f5-src/`): porta `adoptionFacts` + `AdoptionFacts` (com `totalCents: number \| null`: o dublê sem total falha fechado — declarado, o plano dizia `number`) + `StatementClaimReadResult.totalCents?`; dublê; Prisma (`withTenantRls`, uma leitura: status, `reopened_at`, `round(total_amount*100)`, `other_intents` em QUALQUER status — DECLARADO: entra na F5, não na F5b, para a F5 compilar; os testes `-db` dele são da F5b); despacho (`ADOPTABLE_CHARGE_STATES`, `adoptionDecision` pura, `settleFoundCharge`, reconsulta SEMPRE depois do gate do perfil, órfã pela régua U ∧ V). Testes da F5b (T-OBX-db-7/8) escritos em `tests/ass-08-channel-db.test.ts`, fora do commit da F5 | — | — |
| 10:56:19→10:56:34 | **VERMELHO-CONTROLE da F5** (código da F4, sem a F5): `npm test -- tests/ass-08-outbox.test.ts` (5,29 GB) | `# tests 28 · pass 17 · fail 11`: T-OBX-11 e os braços 1, 3, 4, 5, 7, 11, 12, 13 e 14 vermelhos; os braços 2, 6 e 8 já valiam no objeto (o gate do perfil e a adoção da própria órfã existiam); o T-OBX-NODEL é guarda de premissa (verde no objeto; o vermelho dele é a M3i) | o objeto cria às cegas e adota a fantasma |
| 10:56:50→10:57:41 | **vermelho-controle da F5b medido no mesmo código** (o `adoptionFacts` Prisma ainda não estava): `npm test -- tests/ass-08-channel-db.test.ts` | `pass 14 · fail 2`: `not ok 15 T-OBX-db-7` ("L1: 0 createCharge" — o objeto cria) e `not ok 16 T-OBX-db-8` (`external_id: 'pay_own_L5'` — o objeto adota no L5) | registrado para a F5b |
| 10:57:52→10:58:29 | `f5-battery.sh apply` (cópia dos 3 arquivos: `3 files changed, 120 insertions(+), 13 deletions(-)`) → `check` (5,19 GB) | `tsc` exit 0 | — |
| 10:58:46→10:59:22 | verde: `ass-08-outbox`, `-charge-request`, `-flow-e2e`, `-charges-profile`, `-channel-db` (5,18 GB) | `# tests 56 · pass 56 · fail 0 · skipped 0` (com os T-OBX-db-7/8 da F5b já verdes) | F5 verde |
| 10:59:40→10:59:50 | 1ª execução da **M3a**: vermelha (`pass 20 · fail 8`; braço 1 `expected 1 · actual 2`), mas o meu aplicador NÃO conseguiu desfazê-la (a mutação de remoção deixava `to: ""`, sem âncora) | `M3a revert: âncora encontrada 15307×` → restaurado pelo índice (`git checkout -- outbox.dispatcher.ts`; `git diff --exit-code` limpo); o aplicador passou a deixar marcador único nas remoções (M3a, M3g, M5d) | defeito do aplicador, declarado; nada fora do índice foi tocado |
| 11:01:18→11:01:26 | **M3a** de novo (literal: sem a reconsulta antes de criar), revertida por edição inversa | `pass 20 · fail 8`: braço 1 (`1 createCharge no total, nunca 2`: `expected 1 · actual 2`), e T-OBX-11, braços 3, 4, 5, 11, 14; revert limpo | vermelho medido |
| 11:01:31→11:01:39 | **M3d′** (a órfã adota só com `found && ADOPTABLE`) | `pass 23 · fail 5`: braços 7, 12, 13 e 14; revert limpo | vermelho medido |
| 11:01:45→11:01:54 | **M3e** (reconsulta ANTES do gate do perfil) | `pass 24 · fail 4`: braço 6 (e o 3 e o T-OBX-11, pela reconsulta a mais); revert limpo | vermelho medido |
| 11:02:15→11:02:23 | **M3f no dublê** (U trocado pela régua anterior: outra `charge_create` com `attempts > 0 \|\| lastError`, via `listByStatement`) | `pass 25 · fail 3`: braços 11 e 12; revert limpo | vermelho medido |
| 11:02:28→11:02:37 | **M3i** (um `DELETE FROM billing_outbox` num método novo de `outbox.prisma.ts`) | `pass 27 · fail 1`: T-OBX-NODEL; revert limpo | vermelho medido |
| 11:02:52→11:03:13 | gerador do T13 | exit 0, stderr vazio; nenhuma chave muda (só os contadores do resumo: +2 `SOB-CONTEXTO`, o `adoptionFacts` sob `withTenantRls`) | T13 sem edição |
| 11:03:28→11:04:17 | T13 sozinho | `# tests 35 · pass 35 · fail 0` | — |
| 11:04:28→11:04:54 | `npm run lint`; `git diff --exit-code -- src`; `git diff --cached --check` | 0; limpo; 0; 4 arquivos no índice | fatia fechada |

## BASTÃO DEVOLVIDO 2 — 11:06:01 SP (ordem do orquestrador: depois da F5, o bastão vai para `conf-525-b`)

- **Ponto exato:** F5 fechada e empurrada em `743bea8b`. Na árvore, não commitados: os testes da F5b (T-OBX-db-7/8 em `tests/ass-08-channel-db.test.ts`, já verdes na rodada da F5 e com o vermelho-controle medido às 10:56); faltam as mutações dela (M3f no SQL, M3g, M3h), o lint e o commit.
- **Até o bastão voltar:** escrever a F6 (o `retry` guardado do E9 já está em `rascunhos/f6-src/`; testes T-OBX-9 com `lastError` mantido, T-OBX-9b e os braços 9–10 do T-OBX-17 no dublê; T-CHG-db-3 e T-OBX-db-6 em rascunho até a F5b ser commitada, porque moram no mesmo arquivo `-db`), sem suíte, `tsc`, lint nem banco. A 1ª linha do painel é conferida a cada 5 min.

## RETOMADA 7 — 12:51 SP: o bastão voltou (`bastao-memoria.txt` = `dev-522-c2`, 3,58 GB)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 11:06–12:51 | (sem bastão, trabalho leve) rascunhos da F6/F4b/F7 conferidos fora da árvore; achado e consertado no RASCUNHO do T-LOCK-2 (`rascunhos/f6b-src/ass-08-lock-order-db.test.ts` l.119): o `MAP_MENTION` tinha sido gravado com backspace (0x08) no lugar de `\b` e sem os escapes de `\.transaction\(` (a regex nem compilaria); varredura de caracteres de controle em todos os rascunhos e nos arquivos do ramo: só aquela linha | `scan-ctrl.mjs`: 4 ocorrências → 0; a regex consertada compila | defeito de rascunho, nada no ramo |
| 12:51:19 | `docker ps -a` | a VM do Docker reiniciou às ~12:40 (pressão de memória): `dev522-pg` `Exited (255)`; de pé só `j527-c2-pg` (1 outro trabalho) | — |
| 12:51:30→12:51:43 | `docker start dev522-pg` + `pg_isready` (3,62 GB) | pronto em 1 s; log: `database system was not properly shut down; automatic recovery in progress` → `redo done` → `ready to accept connections` | recuperação limpa |
| 12:51:52→12:52:07 | `psql`: bancos e papéis; e a conexão da bateria (`postgresql://postgres:dev522@127.0.0.1:5496/postgres`) pelo `pg` do host | só `postgres`, `template0`, `template1`; papel `postgres` (super); 0 banco `postgres_ass08%` e 0 papel efêmero sobrando; PostgreSQL 16.15 | a bateria não depende de schema no `postgres`: cada arquivo `-db` cria a própria base e roda `migrate deploy` — nada a re-migrar |

## F5b — `adoptionFacts` no Prisma: a adoção só por fato que não se apaga (T-OBX-db-7/8)

O código da F5b (`adoptionFacts` no `PrismaOutboxRepository`) entrou no commit da F5 (`743bea8b`, declarado lá). Os testes `-db` foram escritos antes e o vermelho-controle deles está na F5 (10:56:50, `not ok 15 T-OBX-db-7` "L1: 0 createCharge" e `not ok 16 T-OBX-db-8` `external_id: 'pay_own_L5'`); o verde, na rodada da F5 (10:58:46, 56/56).

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 12:52:45 | `f56-battery.sh f5b-mut M3fsql` | `ABAIXO DO PISO` (2,92 GB): parou antes de aplicar | a trava funcionou |
| 12:53:01 | espera medindo | 3,51 GB | — |
| 12:53:16→12:54:13 | **M3f no SQL** (U trocado pela régua anterior: `other_intents` só conta a irmã `attempts > 0 OR last_error IS NOT NULL`) → `-db` → revert | `# tests 16 · pass 15 · fail 1`: `not ok 15 T-OBX-db-7`, L1 adota a fantasma: `{ status: 'SENT', external_id: 'pay_phantom_db7l1' }` em vez de `NEEDS_REVIEW charge_found_for_previous_intent`; revert limpo | vermelho medido |
| 12:54:45→12:55:34 | **M3g** (sem o V: tira `if (!current) return …_stale_closing`) | `pass 15 · fail 1`: `not ok 16 T-OBX-db-8`, L5 adota a própria com fechamento desfeito: `SENT pay_own_L5` em vez de `NEEDS_REVIEW orphan_found_stale_closing`; revert limpo | vermelho medido |
| 12:55:52→12:56:31 | **M3h** (`other_intents` conta só as irmãs VIVAS) | `pass 15 · fail 1`: `not ok 15 T-OBX-db-7`, L1 adota a fantasma (`SENT pay_phantom_db7l1`); revert limpo | vermelho medido |
| 12:56:55→12:57:35 | verde depois das reversões e do reinício do container (3,36 GB) | `# tests 16 · pass 16 · fail 0 · skipped 0` (`ok 15 T-OBX-db-7`, `ok 16 T-OBX-db-8`) | F5b verde |
| — | `npm run lint` NÃO re-rodado | o commit não toca `src/` (o `tsc` do `lint` só inclui `src/**`, `tsconfig.json` `include`) e o `src` é o de `743bea8b`, cujo `lint` deu 0 às 11:04 | declarado |

## F6 — E9: o retry só reabre com o demonstrativo travado e sem outra intenção viva (em curso)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 11:06–12:51 | (sem bastão) testes da F6 ESCRITOS ANTES do código: no dublê, T-OBX-9 (`lastError` mantido), T-OBX-9b (outra viva → 422, a FAILED fica FAILED) e os braços 9 e 10 do T-OBX-17; no `-db`, T-CHG-db-3 (i) retry primeiro e (ii) pedido primeiro, com barreira por `pg_stat_activity`/`pg_blocking_pids`, e T-OBX-db-6 (ATK-2d e ATK-8 com o Prisma real). Código do E9 fora da árvore (`rascunhos/f6-src/`) | — | — |
| 12:58:37 | `insert-block.mjs` do bloco `-db` no fim do `else` de `tests/ass-08-channel-db.test.ts` | +143 linhas; 0 caractere de controle | — |
| 12:58:56→13:00:21 | **VERMELHO-CONTROLE** (código da F5): `npm test -- tests/ass-08-outbox.test.ts` e o `-db` | dublê `# tests 32 · pass 28 · fail 4`: T-OBX-9 (`null !== 'boom'`), T-OBX-9b (`Missing expected rejection`), braço 9 (`recovered` `0 !== 1`) e o pai; braço 10 verde. `-db` `18 · 17 · 1`: T-CHG-db-3 (`barreira não cumprida em 10000 ms: (i) o retry esperando o demonstrativo do arnês`); T-OBX-db-6 verde no código da F5 (com U, o apagamento já não adota — plano §13 l.705) | o retry da F5 não trava nem confere |
| 13:01:12→13:02:05 | **vermelho-controle do T-OBX-db-6 no despacho do objeto** (`git checkout 793fa01e -- outbox.dispatcher.ts` → `-db` → `git checkout HEAD -- …`) | `18 · 14 · 4`: T-OBX-db-6 ATK-2d com a 2ª cobrança `{ status: 'SENT', external_id: 'pay_db_2' }` em vez de `NEEDS_REVIEW charge_found_for_previous_intent`; e db-7, db-8, CHG-db-3; despacho restaurado (`git diff --quiet HEAD`) | o objeto cobra duas vezes |
| 13:02:26 | `f6-apply` (cópia de `f6-src/`) | `2 files changed, 60 insertions(+), 16 deletions(-)` | — |
| 13:02:35→13:17 | `check` parado pela trava: 2,87 GB < 3,0 | espera medindo; às 13:17 o orquestrador baixou o piso para **2048 MB** (o arquivo de paginação cresce até 64 GB) e pediu medida a cada 5 min — a bateria passou a reaproveitar a medida por 300 s (`mem-last.txt`) | — |
| 13:19:50→13:20:50 | `npm run check` (2,73 GB) | exit 0, 60 s | — |
| 13:21:05→13:21:51 | verde: `ass-08-outbox`, `-charge-request`, `-flow-e2e`, `-charges-profile`, `-channel-db` | `# tests 62 · pass 62 · fail 0 · skipped 0` (T-CHG-db-3 1,19 s; T-OBX-db-6 0,51 s) | verde |
| 13:22:12→13:22:20 | **M3b** (o retry volta a apagar `last_error`, no Prisma e no dublê) → dublê | `32 · 29 · 3`: T-OBX-9 e braço 9 (+ o pai); revertida. O laço acusou "NÃO REVERTEU LIMPO" porque o código da F6 ainda NÃO estava no índice (deslize meu de sequência: o `git add` da F6 vinha antes das mutações); a reversão foi provada por `cmp` contra `rascunhos/f6-src/` (idênticos) e então os 4 arquivos foram ao índice | vermelho medido; declarado |
| 13:22:48→13:23:43 | **M5c**, 1ª execução (forma antiga do T-CHG-db-3) | só a barreira da (i) ficou vermelha e a (ii) nem rodou | → o T-CHG-db-3 virou DOIS SUBTESTES, (i) e (ii), para cada mutação mostrar o próprio vermelho (nenhuma asserção saiu; mudança de forma declarada) |
| 13:24:52→13:25:44 | vermelho-controle de novo, com os subtestes, sobre o retry da F5 (`git restore --source=HEAD --worktree` dos 2 arquivos da outbox → `-db` → `git restore --worktree`; `cmp` com `f6-src` ok) | `20 · 17 · 3`: (i) barreira (o retry não espera o demonstrativo); (ii) `(ii) 1 viva` `2 !== 1` | vermelho-controle medido na forma final |
| 13:26:10→13:26:52 | verde `-db` com os subtestes | `# tests 20 · pass 20 · fail 0`; `git add` do teste; árvore = índice | verde |
| 13:27:..→13:28:08 | **M5c** (retry sem `FOR UPDATE OF s`) | `20 · 17 · 3`: (i) barreira e **(ii) `2 !== 1` vivas**; revert limpo | vermelho medido (o do plano: (ii) com 2 vivas) |
| 13:28:10→13:28:55 | **M5d** (retry sem a checagem de outra viva) | `20 · 18 · 2`: **(ii) `2 !== 1` vivas**; (i) verde; revert limpo | vermelho medido |
| 13:28:58→13:29:41 | **M1c** (pedido sem o `FOR UPDATE` do demonstrativo) | `20 · 15 · 5`: T-CHG-db-1 (`409 charge_intent_conflict`, não 422), T-LOCK-1a ("a 4ª instrução é a trava do demonstrativo"), T-CHG-db-3 **(i) `2 !== 1`** e (ii) `2 !== 1`; revert limpo | vermelho medido (o do plano: (i) com 2 vivas) |
| 13:30:12→13:30:37 | gerador do T13 (`node scripts/san3-05-acessos-de-plataforma.mjs .`) | exit 0, stderr vazio. Muda SÓ o `retry`: `billing_outbox` `×1` → `×3` e chave NOVA `subscription_statements` `×1` (as duas `PARAMETRO(tx de callback de withTenantRlsBudget)`); resumo 935 → 938 call-sites, PARAMETRO 72 → 75, inventário 112 → 113 chaves (`sha1=d99ebd1b8fa397b05609a077778fe4bfb1a6f383`); saída em `rascunhos/t13-f6.out` | — |

## PAUSA 16:31 UTC (13:31 SP) — ordem do orquestrador (P7): o dono vai reiniciar a máquina

- **head:** `f7476918` (empurrado). A F6 **NÃO foi commitada**: está no ÍNDICE do `w-dev522`, completa e validada até o gerador do T13 — `src/modules/subscription-billing/outbox/outbox.prisma.ts`, `outbox.repository.ts` (= `rascunhos/f6-src/`, `cmp` ok), `tests/ass-08-outbox.test.ts`, `tests/ass-08-channel-db.test.ts`. Árvore = índice.
- **mutação aplicada no worktree:** NENHUMA (`git diff --exit-code` limpo; `grep -rn MUTACAO src tests` vazio; `cmp` do `src` contra `f6-src`).
- **feito:** tabela da F6 acima (vermelho-controle, verde 62/62 e 20/20, M3b, M5c, M5d, M1c, gerador do T13).
- **falta, nesta ordem:** (1) em `tests/san3-05-acessos-de-plataforma-guard.test.ts`, a chave L1 do `PrismaOutboxRepository.retry` sobre `billing_outbox` de `"×1"` para `"×3"` e a chave nova sobre `subscription_statements` `"×1"`, coladas da saída `rascunhos/t13-f6.out` l.50-51, com o motivo em uma linha; (2) o T13 sozinho; (3) `npm run lint`, sozinho; (4) estas linhas no diário, `git add` do T13 e do diário, `git diff --cached --check`, commit `fix(billing): retry só reabre com o demonstrativo travado e sem outra intenção viva`, push; (5) a mensagem `F6 ok · head <sha>` (o bastão vai então para a C2 do #527; eu sigo com a F7 sem rodar). Depois: F4b (`rascunhos/f4b-battery.sh paste|green|mut M5g M5h M5i`), F6b+F6c, F7 (`rascunhos/f7-apply.mjs`), F8.
- **na retomada, o PRIMEIRO comando:** `docker start dev522-pg` e `docker exec dev522-pg pg_isready -U postgres -h 127.0.0.1` (o container cai com a máquina; o T13 e o `lint` não usam banco, a F4b em diante usa); depois `git -C /c/Users/thiag/w-dev522 status --short` (devem aparecer os 4 arquivos com `M ` no índice) e a edição do item (1); o próximo comando PESADO é `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts > rascunhos/t13-f6-test.tap`.
- **arquivos meio-escritos:** nenhum no ramo. Fora do repositório, prontos e não executados: `rascunhos/f4b-db9-draft.ts`, `f4b-battery.sh`, `f6b-src/` (o `MAP_MENTION` consertado às 12:xx), `f7-apply.mjs`.

## RETOMADA 8 — 14:12 SP: a máquina reiniciou às 13:39 (50,5 GB de commit livre); bastão com até 3 detentores, piso 2048 MB

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 14:12:33 | `docker start dev522-pg` + `pg_isready`; medida do parcial (P3/P7): `git status`, `git diff --exit-code`, `grep -rln MUTACAO src tests`, `cmp` do `src` com `rascunhos/f6-src/` | pronto em 2 s; head `1f376efe`; os 4 arquivos da F6 com `M ` no índice, árvore = índice, 0 marcador de mutação, `src` = `f6-src` | o parcial da PAUSA confere |
| 14:12–14:13 | T13: a chave do `retry` sobre `billing_outbox` `×1` → `×3` e a chave nova sobre `subscription_statements` `×1`, coladas de `rascunhos/t13-f6.out` l.50-51, com o motivo | +6/−2 em `tests/san3-05-acessos-de-plataforma-guard.test.ts` | — |
| 14:13:13→14:13:58 | `npm test -- tests/san3-05-acessos-de-plataforma-guard.test.ts` (43,9 GB) | `# tests 35 · pass 35 · fail 0` | T13 verde |
| 14:14:06→14:14:23 | `npm run lint` | exit 0 (17 s) | fatia fechada |

## F4b — T-OBX-db-9: o claim sem teto de adiamento, nenhuma linha faminta (§14.4)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| (sem bastão) | T-OBX-db-9 escrito em `rascunhos/f4b-db9-draft.ts`: N ∈ {26, 20 000}; estatística VELHA (ANALYZE com 50 organizações de 2 demonstrativos ANTES, a organização grande semeada depois, sem ANALYZE); semeadura por `generate_series`; o arnês segura `FOR UPDATE` nos N mais antigos e há 1 linha livre na cauda; papel `rolsuper=false rolbypassrls=false`; amostrador de `pg_stat_activity` (`wait_event_type = 'Lock'`) em paralelo. Afirma: UM `claimNext` → `claimed` com a linha da cauda, ≤ 2 000 ms, sem erro, 0 amostra esperando trava, as N travadas intactas e, depois do COMMIT, a mais antiga. O código é o E5″ da F3 (o teste nasce depois do código, e o vermelho dele é o desenho da §13, M5i, como o plano pede) | — | — |
| 14:15 | `f4b-battery.sh paste` | +109 linhas no fim de `tests/ass-08-channel-db.test.ts` | — |
| 14:15:..→14:15:37 | verde `-db` (46 GB) | `# tests 21 · pass 21 · fail 0 · skipped 0`; T-OBX-db-9 em 2 642 ms (as duas escalas, com semeadura) | verde |
| 14:15:52→14:16:47 | **M5g** (tirar o SKIP LOCKED de `FOR NO KEY UPDATE OF s`) | `21 · 16 · 5`: T-OBX-db-9 (`N = 26`, `55P03 canceling statement due to lock timeout` em 5 177 ms), e T-OBX-db-1, db-4, db-5 e T-LOCK-1b; revert limpo | vermelho medido (o do plano: 55P03 em ~5 s) |
| 14:16:47→14:17:22 | **M5h** (tirar o `set_config('enable_nestloop', 'off', true)`) | `21 · 20 · 1`: T-OBX-db-9 (`N = 20000`, `57014 canceling statement due to statement timeout` em 10 046 ms); revert limpo | vermelho medido (o do plano: 57014 em ~10 s) |
| 14:17:23→14:18:16 | **M5i** = o desenho da §13 (o laço: pick com `NOT (id = ANY($3))` + a trava do demonstrativo em comando próprio + adiadas, sem teto; o parâmetro das adiadas é `$3` porque no E5″ a órfã já tem pick próprio — declarado) | `21 · 19 · 2`: T-OBX-db-9 (`N = 20000`, `P2028 … expired transaction` em 30 103 ms) e T-LOCK-1b (sem a pick conjunta); revert limpo. É também o vermelho-controle da §13 que o plano manda registrar | vermelho medido (o do plano: P2028 em ~30 s) |
| — | `npm run lint` NÃO re-rodado | o commit não toca `src/` (o `src` é o de `e16fd02a`, lint 0 às 14:14) | declarado |

## F6b + F6c — T-LOCK-2: a ordem de travas executada e o censo das transações (§13.3, §14.4)

**Commit único, declarado:** a F6b (gravador, classificador, censo, tabela congelada, cenários de `outbox/`, `charges/` e do pedido) e a F6c (os cenários de `statements/`) entram juntas, porque o teste de cobertura exige TODA chave `cenario:` da tabela congelada com transação gravada: com só a F6b ele fica vermelho pelas chaves de `statements/`.

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| (sem bastão) | helper e teste escritos fora da árvore (`rascunhos/f6b-src/`); a tabela congelada sai do censo (55 chaves: 39 `cenario:`, 15 `sem-tabela-do-mapa`, 1 `dublê-em-memória`); o `MAP_MENTION` consertado (RETOMADA 7) | — | — |
| 14:19 | cópia para `tests/helpers/lock-order-recorder.ts` (a única linha que sai da versão da F4 é a captura da pilha, agora com `Error.stackTraceLimit = 60`) e `tests/ass-08-lock-order-db.test.ts` (novo); 0 caractere de controle | — | — |
| 14:19:17→14:19:28 | `npm test -- tests/ass-08-lock-order-db.test.ts` | `# tests 6 · pass 6 · fail 0`: setup (papel `rolsuper=false rolbypassrls=false`, filhas do demonstrativo pelo `pg_constraint`), cenários F6b e F6c sem erro, unitário do classificador, censo = tabela congelada com cobertura, 0 violação ORD-0/1/2/UNK | verde |
| 14:19:42→14:19:54 | **M7a** (no retry, o UPDATE da fila antes da trava do demonstrativo) | `6 · 5 · 1`: `outbox.retry: ORD-1@4 SELECT s.id, o.kind … FOR UPDATE OF s`; revert limpo | vermelho medido |
| 14:19:54→14:20:06 | **M7b** (≡ M5g: claim sem SKIP LOCKED no demonstrativo) | `6 · 5 · 1`: `outbox.claimNext (…): ORD-2@5` e `ORD-1@5` na pick conjunta; revert limpo | vermelho medido |
| 14:20:06→14:20:17 | **M7c** (abertura nova `touch` em `charges.prisma.ts`) | `6 · 5 · 1`: "abertura nova sem classe na tabela congelada": `…charges.prisma.ts#PrismaStatementChargeRepository.touch#withTenantRls`; revert limpo | vermelho medido |
| 14:20:17→14:20:28 | **M7d** (apagar o cenário do retry) | `6 · 5 · 1`: `…#PrismaOutboxRepository.retry#withTenantRlsBudget (cenario:outbox.retry): nenhuma transação gravada abriu por …` (sem cobertura); revert limpo | vermelho medido |
| 14:20:28→14:20:39 | **M7e** (o classificador sem a detecção de escrita escondida) | `6 · 5 · 1`: "escrita escondida numa CTE sobre a tabela do mapa é UNK (fail-closed)"; revert limpo | vermelho medido |
| 14:21:02→14:21:27 | `-db` de novo com o helper estendido | `# tests 21 · pass 21 · fail 0` | T-LOCK-1a/1b intactos |
| — | `npm run lint` NÃO re-rodado | o commit não toca `src/` | declarado |

## F7 — registro: a pendência corrigida e as 5 novas (§10, §13.5, §14.5)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 14:2x | `node rascunhos/f7-apply.mjs` (troca por trechos exatos, cada âncora 1×; o texto que não muda não é redigitado) | `P-ASS08-OBX5-EAGER-E-CANCEL`: título "— MÉDIA (gravidade corrigida em 10/11; 5 obrigações bloqueiam o merge da 08b e 3 bloqueiam ligar o canal)"; a frase de gravidade trocada pelo texto do §10.1, com a lista de testes do desenho FINAL (E5″, E6′/E7′, T-LOCK-2 — declarado: o texto do §10.1 é anterior à §13/§14); a precisão da corrida residual; as obrigações (1)–(5) (a (4) com "o claim E5″", §14.5; a (5) do §13.3.4, mais "o T-OBX-db-9 também fica verde no head da 08b", leitura declarada do §14.8) e (a)–(c); o acréscimo do teste de encerramento. Novas no fim: `P-ASS08-MUTATE-SEM-GUARDA` (ALTA), `-RECONSULTA-SEM-VALOR` (MÉDIA, com o acréscimo da §13.5), `-RECUPERADA-SEM-COBRANCA` (MÉDIA), `-RECONSULTA-CONSISTENCIA` (MÉDIA, hipótese), `-INDICE-UMA-VIVA` (BAIXA). Nada apagado | — |
| 14:2x | `python agent-orchestration/controle/gerar-indice-pendencias.py` (2×) | 793 cabeçalhos / 782 IDs; ABERTAS 593 → 598; a 2ª execução sai byte-idêntica (`cmp`) | índice regenerado, sem mão |
| 14:2x | critério 6: `grep -c` em `pendencias.md` | "com (ii) em pé, nenhuma cobrança indevida sai" → **0**; "Bloqueiam o merge da 08b" → **1**; "Bloqueiam ligar o canal" → **1** | critério 6 cumprido |

### Contagens de execução, F0 a F6c (cada uma medida no diário acima)

| fatia | commit | teste-dono (verde) | mutações vistas vermelhas |
|---|---|---|---|
| F0 | `c8f5b804` | linha de base | — |
| F1 | `e3a01c17` | T-CHG-5/6/7/7b | M1a, M1d, M1e |
| F2 | `f2a5969e` | T-CHG-db-1/2, T-LOCK-1a | M1b (P2028), M1c (409) |
| F3 | `e2ce1676` | T-OBX-18 + T-OBX-1..16 | M2 no dublê |
| F4 | `a9577496` | T-OBX-db-1/4/5, T-LOCK-1b (`-db` 14/14) | M4, M2 SQL, M5a, M5b, M5j |
| F5 | `743bea8b` | T-OBX-11, T-OBX-17 (1–8, 11–14), T-OBX-NODEL (56/56) | M3a, M3d′, M3e, M3f, M3i |
| F5b | `f7476918` | T-OBX-db-7/8 (`-db` 16/16) | M3f SQL, M3g, M3h |
| F6 | `e16fd02a` | T-OBX-9/9b, T-OBX-17 (9–10), T-CHG-db-3 (i)/(ii), T-OBX-db-6 (62/62; T13 35/35) | M3b, M5c, M5d, M1c |
| F4b | `b56ee865` | T-OBX-db-9 (`-db` 21/21) | M5g (55P03), M5h (57014), M5i (P2028, o laço da §13) |
| F6b+F6c | `49ff6480` | T-LOCK-2 (6/6) | M7a, M7b, M7c, M7d, M7e |

## F8 — bateria (em curso)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 14:22:58→14:23:06 | `CREATE DATABASE erp_c2` no `dev522-pg` + `npx prisma migrate deploy` (a forma do job `backend`, que migra a base do `DATABASE_URL`) | "All migrations have been successfully applied." | — |
| 14:23:16 | `npm test -- <456 arquivos>` | "Linha de comando muito longa" (o `cmd.exe` do npm); nada rodou | → o runner chamado direto: `node scripts/run-backend-tests.mjs <456 arquivos>` (sem shell, a mesma expansão) |
| 14:23:45→14:31:20 | suíte inteira com `DATABASE_URL=…/erp_c2`, SEM os 2 guards pesados (que vão sozinhos e por último), sem Redis (o `ass08redis` não é meu) | `# tests 4811 · pass 4793 · fail 16 · cancelled 0 · skipped 2`. As 16: (a) **guard 3** de `tests/auth-invariant-guards.test.ts` ("set_config vivem SÓ em src/database/rls.ts") acusa `outbox.prisma.ts` l.194 e l.197, o `set_config('enable_nestloop', …)` do E5″ (§14.2) — **defeito REAL, nascido na F3**, que o CI já acusava (run `42855489156`, job `backend`: `# tests 4848 · pass 4845 · fail 1`, e o único `not ok` é este); (b) **T-OBX-db-5** "o claim não esperou a trava (1 239 ms < 1 000)", só sob a carga da suíte inteira no Windows: sozinho deu 473 ms (F4) e no CI passou; (c) de ambiente: 5 de Redis ausente (`domain event publishes …` ×2, `Redis job queue …`, `job worker …` ×2, `o writer grava SET … EX …`), 2 `EBUSY` de `rmdir` no Temp do Windows (`traccar-event-migration-drill-db`, `work-order-invoicing-migration-drill-db`), e `B-SAN3-05 · o papel de runtime …` e `san3-09 T2` (bancos de drill no cluster local; nenhum toca o PERMITIDO); todos verdes no CI | o guard 3 é meu e vai para a emenda |
| 14:32 | conflito plano × guard 3 levado ao orquestrador (§A2, `D-EMENDA-ANTES-DO-CODIGO`): opção A recomendada (`SET LOCAL`); B mexe em teste de segurança fora do PERMITIDO; C é `src/database/**` (PROIBIDO) | o orquestrador escolheu a A e a escreveu como **Emenda 15** no plano; ela passa pelo `critico-adversarial` (crit-522-e15) ANTES do código; não aplico até "emenda 15 aprovada" | parado nesse ponto |
| 14:32:45→14:33:52 | `o6r07c-census-guard`, sozinho | `# tests 32 · pass 32 · fail 0` | — |
| 14:33:52→14:34:16 | `inventory-write-paths-guard`, sozinho | `# tests 12 · pass 12 · fail 0` | — |
| 14:34:24→14:34:44 | `npm run build` + `rm -rf dist` | exit 0; `dist/` removido (§C5) | — |
| 14:2x | `node scripts/migration-transaction-guard.mjs` | "migrações: 129 · anteriores: 112 · novas: 17 · violações: 0" | — |
| 14:2x | escopo: `git diff --name-only 793fa01e..HEAD` (20 caminhos, todos no PERMITIDO do §5 e do §13.3.6); `git diff --stat 793fa01e..HEAD -- prisma/ src/…/statements/ src/…/providers/ Kpis/ frontend/ mobile/ src/app.ts src/config/ src/database/ CLAUDE.md AGENTS.md agent-orchestration/controle/decisoes.md package*.json` vazio; extrações: 3 hunks (2 em `charges.prisma.ts`, declarados na F2, e 1 em `statement-refs.prisma.ts`); `git diff --check 793fa01e..HEAD` limpo | escopo cumprido | — |

## Emenda 15 — `SET LOCAL` no lugar de `set_config` no E5″ (aprovada às 14:56 depois de 2 rodadas de `crit-522-e15`; valem os requisitos finais da rodada 2)

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 14:57 | gerador do T13 ANTES (`rascunhos/e15/t13-antes.out`) | exit 0, stderr vazio; byte-igual à saída da F6 (`t13-f6.out`) | — |
| 14:57 | T-OBX-E15 ESCRITO ANTES do código, em `tests/ass-08-outbox.test.ts` (+ import de `PrismaOutboxRepository`): cliente de transação FALSO que grava toda instrução em ordem (no molde do `recordingClient`, que não muda), `current_setting('enable_nestloop')` e a pick controlados pelo teste; exige ADJACÊNCIA (desligar = instrução imediatamente anterior à pick; devolver = imediatamente seguinte, com o literal igual ao valor lido), só 2 `SET` do planejador e nenhum `set_config` dele; casos `off`/`on` × pick que ACHA / pick vazia, mais "valor fora de {on, off} falha fechado sem rodar a pick" | — | — |
| 14:57:30→14:57:32 | **VERMELHO-CONTROLE** (o `set_config` do E5″) | `# tests 38 · pass 32 · fail 6`: os 5 subtestes do T-OBX-E15 e o pai | o código antigo não tem a forma |
| 14:57:42→14:57:57 | `rascunhos/e15/apply-e15.mjs` (troca por trechos exatos em `outbox.prisma.ts`: `SELECT current_setting(…) AS previous`; fora de {on, off} lança; `SET LOCAL enable_nestloop = off`; a pick; logo em seguida `SET LOCAL enable_nestloop = on` ou `= off` por literal escolhido em código — em sequência, sem `finally`) + `npm run check` | exit 0; nenhum `set_config(` sobrando no arquivo | — |
| 14:57:57 | `npm test -- tests/ass-08-outbox.test.ts tests/auth-invariant-guards.test.ts` | `# tests 49 · pass 49 · fail 0` (o **guard 3 verde**) | — |
| 14:58:34→14:58:59 | `-db`: `ass-08-channel-db` + `ass-08-lock-order-db` | `# tests 27 · pass 27 · fail 0` (T-OBX-db-9 e T-LOCK-2 verdes; o classificador lê o `SET` como sem trava) | — |
| 14:59:09→14:59:46 | **M5h** (tirar o `SET LOCAL enable_nestloop = off`) → dublê e `-db` | dublê `pass 33 · fail 5`: os 4 casos do T-OBX-E15; `-db` `pass 20 · fail 1`: **T-OBX-db-9 com `57014` em 10 169 ms** (o vermelho que conta); revert limpo | vermelho medido |
| 14:59:46→14:59:47 | **M5h′** (devolve sempre `on`) | `pass 35 · fail 3`: os 2 casos `prev = 'off'`; revert limpo | vermelho medido |
| 14:59:48→14:59:49 | **M5h″** (sem a devolução) | `pass 33 · fail 5`: os 4 casos; revert limpo | vermelho medido |
| 14:59:49→14:59:51 | **M5h‴** (a devolução depois da instrução SEGUINTE: a releitura E4 ou o pick dos outros tipos) | `pass 33 · fail 5`: os 4 casos (adjacência); revert limpo | vermelho medido |
| 14:59:51→14:59:52 | **M5h⁗** (a devolução logo depois só com a pick vazia; quando acha, depois da releitura E4) | `pass 35 · fail 3`: os 2 casos "a pick ACHA a linha"; revert limpo | vermelho medido |
| 14:59:5x | gerador do T13 DEPOIS (`t13-depois.out`) | exit 0, stderr vazio. Mudam SÓ chaves do `claimNext`: `RAW-SQL($queryRawUnsafe) OPACO` `×2` → `×1` e a NOVA `RAW-SQL($executeRawUnsafe) OPACO` `×2` (os dois `SET LOCAL`); resumo 938 → 939, PARAMETRO 75 → 76, inventário 113 → 114 (`sha1=445cafb613c80f6b0ac664c55434de1f26bb71eb`); nenhuma chave de outro método | aceite E15-T13 cumprido |
| 15:00:30→15:01:11 | T13 com as 2 chaves coladas da saída, motivo em uma linha | `# tests 35 · pass 35 · fail 0` | — |
| 15:01:19→15:01:34 | `npm run lint`; `git diff --check` | 0; limpo | — |
| — | `P-GUARD3-SO-RECONHECE-SET-CONFIG` | NÃO gravada (E15R2-PENDENCIA-FORA-DO-PERMITIDO: é do registro do orquestrador) | — |

### Emenda 15 — o CI do `509859ef` e o ajuste de forma

| hora (SP) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 15:12:20 | CI run `42870995043` (`509859ef`), job `backend`, pelo resumo TAP | `# tests 4869 · pass 4866 · fail 1 · skipped 2`: o **guard 3 passou**; o único `not ok` é o D1 de `tests/inventory-write-paths-guard.test.ts`: `'<sql dinâmico> …/outbox.prisma.ts:200 $executeRawUnsafe(<não literal: ConditionalExpression>)'` — a devolução por ternário de dois literais é, para o guard de escritores, SQL que ele não resolve (fail-closed). Falha MINHA: rodei os 2 guards pesados às 14:33, ANTES da Emenda 15, e não de novo depois dela | defeito real de forma |
| 15:13 | a devolução vira UMA de DUAS chamadas com literal fixo (`if (prev === "on") … = on; else … = off`), na mesma posição (a instrução logo depois da pick): é a letra da Emenda 15 ("escolhendo, em código, um de dois literais fixos"), sem ternário no argumento — declarado | `npm run check` exit 0; dublê + guard 3 `49/49`; `inventory-write-paths-guard` `12/12` | — |
| 15:13–15:15 | as entradas M5h′, M5h″, M5h‴ e M5h⁗ do aplicador reescritas para a forma de duas chamadas (`rascunhos/e15/rebuild-mut.mjs`; aplica e desfaz limpo) | — | — |
| 15:15:50→15:16:21 | `-db` (`channel-db` + `lock-order-db`) | `# tests 27 · pass 27 · fail 0` | — |
| 15:16:21→15:16:58 | as 5 mutações de novo | M5h′ `fail 3` (os 2 `off`); M5h″ `fail 5` (os 4); M5h‴ `fail 5` (os 4); M5h⁗ `fail 3` (os 2 "ACHA"); M5h `fail 5` no dublê, **mas o T-OBX-db-9 VERDE nessa execução** (21/21); todas desfeitas limpo | o vermelho da M5h no `-db` não era determinístico |
| 15:17 | causa e conserto: a "estatística velha" do T-OBX-db-9 não ficava velha com certeza — o autovacuum pode reanalisar as tabelas depois da semeadura grande; o teste passa a desligar o autovacuum das duas tabelas (`ALTER TABLE … SET (autovacuum_enabled = off)`) logo depois do `ANALYZE`, na base própria do arquivo (descartada no `after`); é a letra do §14.4 ("estatística velha de propósito") — declarado | +5 linhas em `tests/ass-08-channel-db.test.ts` | — |
| 15:17:26→15:19:19 | **M5h 3×** com o autovacuum desligado | `fail 1` nas 3: T-OBX-db-9 com `57014` em 10 073, 10 221 e 10 048 ms; revert limpo | vermelho determinístico (3/3) |
| 15:19:32→15:20:01 | `-db` verde | `# tests 27 · pass 27 · fail 0` | — |
| 15:20 | gerador do T13 (`t13-depois2.out`): só o `claimNext` muda, agora `RAW-SQL($executeRawUnsafe) OPACO` `×3` (desligar + as duas chamadas da devolução) e `RAW-SQL($queryRawUnsafe) OPACO` `×1`; o T13 com a contagem colada; `npm run lint`; `o6r07c-census-guard` | T13 `35/35`; lint 0; censo `32/32`; `inventory-write-paths-guard` `12/12` (15:14) | — |
