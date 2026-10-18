# B-TRC-01 — ciclo 3 — relatório do DEV

> **Identidade:** `dev-trc01-c3-opus`
> **Executor:** Claude **Opus** (claude-opus-5-5), nível menor do contrato (§C7.6), declarado. Cobre o trabalho porque o Codex está
> ocupado e o Gemini e o Argon estão sem limite (`D-IAS-EXTERNAS-PRIMEIRO`).
> **Papel:** DEV do ciclo 3; não achou o (c′)-P1 (achou a cadeira (c′), `jurado-trc01c2-c-opus`), não planejou
> (`planejador-trc01-ciclo3`, Fable), não vota. Implementa o plano; não o reescreve.
> **Plano (lei do ciclo):** `C:/Users/AMP/erp-pausa-2026-10-03/planos/B-TRC-01-ciclo3-auditoria-e-plano.md` §3.
> **Ordem do dono:** *"ataque so a c"* — só o (c′)-P1; nada do §4 do plano entra no código.
> **Worktree:** `C:/Users/AMP/w-trc01` · **Ramo:** `feat/traccar-b-trc-01` · **PR:** #426 · **Head de partida:** `e6b4a33a`
> **KPI:** congelado (§C7 item 8(5)); `Kpis/*` fora do escopo. Sem migração: `prisma/**` e `migrations/**` intocados.

## Evidência incremental (P1 — gravada após cada passo)

### Passo 0 — pré-voo

- **Comando:** `git -C C:/Users/AMP/w-trc01 fetch origin`; `git rev-parse HEAD origin/feat/traccar-b-trc-01`; `git status --short`
  nos arquivos-alvo; `file` dos arquivos-alvo; `git config core.autocrlf`.
- **Saída resumida:** HEAD = remoto = `e6b4a33a773e6a0bf8a4d5166517d033fbb0e5a2`; arquivos-alvo limpos; 55 linhas de `git status`
  (os ~53 ` M` só de fim de linha + 3 untracked pré-existentes `.npmtest-503.log`, `check_md5.cjs`, `check_md5.js` — não tocados);
  `core.autocrlf=true`; `src/` em CRLF na árvore, os 2 testes em LF.
- **Veredito parcial:** LIBERADO para implementar o §3.3/§3.5 do plano.

### Passo 1 — conserto (§3.3) e testes (§3.5) aplicados

- **Comando/edição:** Edit por âncora única nos 3 arquivos de `src/modules/field-dispatch/` (CRLF preservado, conferido por `file`) e nos
  2 testes (LF preservado). `git diff --stat` (EOL-neutro sob `autocrlf=true`).
- **Saída resumida:** `field-dispatch-prisma.repository.ts` +7/−3 (comentário; SELECT ganha `(wo.vehicle_assigned_at > ${input.at}) AS
  "vehicleAssignedAfterFix"`; WHERE troca o par de predicados por `(wo.vehicle_id = ${input.vehicleId}::uuid OR wo.vehicle_assigned_at >
  ${input.at})`) · `field-dispatch.repository.ts` +3/−1 (comentário; `candidate.vehicleAssignedAfterFix === true ||`) ·
  `field-dispatch.types.ts` +6/−1 (doc + `readonly vehicleAssignedAfterFix: boolean | null`) · `traccar-operator-at-fix-time.test.ts`
  +24 (`candidate()` com `vehicleAssignedAfterFix: false`; caso (e) com 3 asserções e mensagem própria) ·
  `traccar-position-ingestion-db.test.ts` (T-C1: título + motivos de a1/C1 e a6/C4 → `operator_history_ambiguous`, a5/C3 continua
  `no_operator_at_fix_time`, mensagem própria em todas as asserções; T-P1 e T-P2 novos depois do caso do gatilho). Total: 5 arquivos,
  +128/−21. Nenhum outro caso do ciclo 1/2 mudou.
- **Veredito parcial:** IMPLEMENTADO conforme §3.3/§3.5. Fidelidade ao diff literal do §3.3: idêntico no conteúdo.

### Passo 2 — `db:generate` (URL fictícia), `check`, `lint`, unitários

- **Comando:** `DATABASE_URL=postgresql://ficticio:ficticio@127.0.0.1:1/ficticio npm run db:generate`; `npm run check`; `npm run lint`;
  `node --test --import tsx --test-reporter=tap tests/traccar-operator-at-fix-time.test.ts` e idem `tests/traccar-rls-budget-order.test.ts`.
- **Saída resumida:** ec 0 / ec 0 / ec 0. Unitários: `traccar-operator-at-fix-time` **5/5** (4 antigos + (e)), `traccar-rls-budget-order`
  **1/1**; fail 0, skipped 0.
- **Veredito parcial:** VERDE. **Premissa do plano falsificada (registro, não muda o conserto):** o §3.7 item 2 espera "5 + 4"; o
  `traccar-rls-budget-order` tem **1** caso (medido), logo 5 + 1 = 6. E o `tsconfig.json` inclui só `src/**/*.ts`: o `npm run check` **não**
  compila `tests/`, então "um `candidate()` de teste sem a flag não compila" (§3.7 item 1) não é guard do `check` — no `src` a flag é
  obrigatória (o `$queryRaw<OperatorAtFixTimeCandidate[]>` não a verifica em runtime; quem a garante é o SELECT e as mutações M-P1b/M-C1′).

### Passo 3 — catálogo de mutações e textos do §3.2

- **Comando/edição:** `mutations.mjs` — entrada `M-C1` re-derivada para a forma M-C1′ (`find` = a linha da flag no SELECT; `replace` =
  `> now()`), entradas novas `M-P1a` (WHERE só `wo.vehicle_id = V`) e `M-P1b` (remove `candidate.vehicleAssignedAfterFix === true ||`,
  testes = unitário + `T.ing`); `API_CONTRACTS.md:96` ganha o "ou" de `operator_history_ambiguous`; `PLANO_TRACCAR.md` §3.1 item 6
  (a coluna também é sinal de desconhecimento), §4.2 (bullet + "se outra OS ainda tiver V1, o fix NÃO vai para ela" + parágrafo
  "Ciclo 3"), §8.6 (parágrafo "Ciclo 3" com T-P1, T-P2, T-C1, T-C4(e)), §8.9 (M-C1′, M-P1a, M-P1b); seção `## Ciclo 3 — só o (c′)-P1`
  no comando `B-TRC-01-traccar-posicao-no-mapa.md`; seção `## Ciclo 3 — 2026-10-18` (5 linhas) em `B-TRC-01-dev.md`.
- **Saída resumida:** `node --check mutations.mjs` ok; import do catálogo: 57 entradas, `M-C1`/`M-P1a`/`M-P1b`/`M-C2`/`MUT-43` = 1 cada;
  CRLF preservado em `API_CONTRACTS.md` e `PLANO_TRACCAR.md` (`file`); nenhum teste lê esses arquivos (`grep` em `tests/`: 0).
  `git diff --check` ec 0. `git diff --stat`: 10 arquivos, +182/−27 (+ este relatório, novo).
- **Veredito parcial:** FEITO, dentro do PERMITIDO do §3.2.

### Passo 4 — rodada A (verde) no container, `w-trc01` — 11:40Z→~12:00Z

- **Comando:** `bash C:/Users/AMP/erp-pausa-2026-10-03/ferramentas/teste-linux.sh C:/Users/AMP/w-trc01 'set +e; cd /w; node --test
  --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts) …; node --test … $(ls tests/field-dispatch*.test.ts
  tests/work-order*.test.ts) …; npm test …'` (Postgres 16 + Redis 7 próprios, `npm ci` + `migrate deploy` dentro do container; grupos
  de outros no Docker antes de subir: 0). Log: `<scratchpad>/dev-trc01-c3/run-A-verde.log`.
- **Saída resumida:**
  - Traccar, 15 suítes juntas: **`# tests 132`, pass 123, fail 9, skipped 0**. Os 9 `not ok` são **todos** de `traccar-dev-topology`
    (#7–#14, #16: "o serviço do Traccar não tem `ports`" … "nenhum servidor público de demonstração") — `docker compose` ausente dentro do
    container, limite conhecido do ciclo 2. 132 títulos `ok|not ok` listados no log.
  - `field-dispatch*` + `work-order*` (34 arquivos): **366/366**, fail 0, skipped 0.
  - `npm test` (forma do job `backend`, `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` presente): **3496 tests, pass 3485, fail 9,
    skipped 2** (`[run-backend-tests] 320 arquivo(s)`); os `not ok` visíveis no recorte são da topologia (#2758–#2761…). O recorte do log
    não listou os 9 → re-medido na rodada A2 (passo 8) com a lista inteira.
  - Aviso do `tar` na cópia: `file changed as we read it` — eu editava, na mesma hora, só documentação (`API_CONTRACTS.md`,
    `PLANO_TRACCAR.md`, comando, `B-TRC-01-dev.md`), que nenhum teste lê (`grep` em `tests/`: 0). `src/` e `tests/` não mudaram depois
    do passo 1. Mesmo assim, a rodada A2 refaz a medição sobre a árvore final.
- **Veredito parcial:** VERDE no que o ciclo toca (Traccar 132 = 129 + 3 novos, fail só da topologia por ambiente; 366/366).

### Passo 5 — topologia no Windows (onde há `docker compose`)

- **Comando:** `node --test --import tsx --test-reporter=tap tests/traccar-dev-topology.test.ts` em `C:/Users/AMP/w-trc01`
  (só `docker compose … config`, sem subir container). Log: `<scratchpad>/dev-trc01-c3/topology.tap`.
- **Saída resumida:** **12/12**, fail 0, skipped 0.
- **Veredito parcial:** VERDE. Logo, Traccar = 123 (container) + 9 (os 9 de topologia que caíram lá, verdes aqui) → **132/132**,
  skipped 0, sobre o mesmo src.

### Passo 6 — rodada B (vermelho-controle + mutações) no container, cópia descartável `C:/Users/AMP/w-trc01-mut3`

- **Comando:** `git -C C:/Users/AMP/w-trc01 worktree add --detach C:/Users/AMP/w-trc01-mut3 HEAD`; cópia byte a byte dos 6 arquivos do
  meu diff (`cmp` igual nos 6); `.c3/objeto/<3 src>` = `git show 2043c584:<caminho>`; runner `.c3/run-mut.mjs` (âncora única EOL-consciente,
  `tsc`, TAP, restauro por bytes, `git hash-object` = `git rev-parse HEAD:<arquivo>` no retrato do container); `teste-linux.sh
  C:/Users/AMP/w-trc01-mut3 'set +e; cd /w; node .c3/run-mut.mjs all'`. `npm ci` próprio = o do container (nenhum `node_modules` no
  `w-trc01-mut3`, nenhuma junction). Log: `<scratchpad>/dev-trc01-c3/run-B-mut.log`.
- **Saída resumida** (suítes: `traccar-position-ingestion-db` 22 + `traccar-operator-at-fix-time` 5 = 27):

  | Medição | tsc | TAP | `not ok` — asserção que caiu (mensagem própria) · expected → actual |
  |---|---|---|---|
  | VERDE | 0 | **27/27** | — |
  | **Vermelho-controle** (3 src do objeto `2043c584`) | 0 | **23/27, fail 4** | (e) "datado + desconhecido…" `history_ambiguous` → `ambiguous` · **T-C1 a1 (C1)** `operator_history_ambiguous` → `no_operator_at_fix_time` · **T-P1 a2 (P1)** `quarantined/operator_history_ambiguous` → **`stored`** (o P1 da (c′), reproduzido) · **T-P2 a1 (N1)** → `stored` |
  | restauro + VERDE | — | **27/27** | blobs dos 3 = HEAD (`3176a6c0be60`, `191725dd6a55`, `46c88d2e943c`) |
  | **M-P1a** (WHERE só `vehicle_id = V`; âncora 1, CRLF) | 0 | **19/22, fail 3** | **T-C1 a6 (C4)** → `no_operator_at_fix_time` (a1–a5 passam) · **T-P1 a2** → `stored` · **T-P2 a1** → `stored` |
  | **M-P1b** (classificador sem a flag; âncora 1) | 0 | **23/27, fail 4** | (e) → `ambiguous` · **T-C1 a1** → `stored` · **T-P1 a2** → `quarantined/ambiguous_operator_at_fix_time` · **T-P2 a1** → `quarantined/ambiguous_operator_at_fix_time` |
  | **M-C1′** (flag `> now()`; âncora 1) | 0 | **19/22, fail 3** | **T-C1 a1** → `stored` · **T-P1 a2** → `ambiguous_operator_at_fix_time` · **T-P2 a1** → `quarantined/ambiguous_operator_at_fix_time` (o unitário não vê SQL — esperado) |
  | M-C2 (inalterada; âncora 1) | 0 | **24/27, fail 3** | caso (a) do unitário → `ambiguous` · (e) "legada (sem data, flag nula)" → `single` · "OS anterior à migração…" → `stored` |
  | restauro de cada mutação | — | — | blob = HEAD em todos |

  M-C3, M-C4 (migração) e MUT-43: a rodada parou em M-C3 por erro **do meu runner** (`new PrismaClient({ datasources })` não existe no
  Prisma do repo, que exige `adapter`) — **antes** de criar banco ou rodar teste; a migração foi restaurada (blob = HEAD `e1a6c302a631`).
  Runner corrigido para `pg.Client`; as três re-executadas na rodada B2 (passo 7).
- **Veredito parcial:** vermelho-controle e M-P1a/M-P1b/M-C1′ **vermelhos pelas asserções nomeadas no §3.5/§3.6**; todo restauro = blob.
  Diferenças em relação à previsão do plano, só de detalhe (não mudam o veredito): sob M-P1b e M-C1′ o T-P1 continua em quarentena, mas
  com o motivo `ambiguous_operator_at_fix_time` (o plano previu isso para M-P1b; para M-C1′ diz "os mesmos de M-P1b" — confere); sob M-P1b o
  T-C1 cai na a1 com `stored` (a OS que ganhou V2 depois do fix vira dona sem a flag).

### Passo 7 — rodada B2 (M-C3, M-C4, MUT-43) no container, `w-trc01-mut3`, runner corrigido — terminou 11:57Z

- **Comando:** `teste-linux.sh C:/Users/AMP/w-trc01-mut3 'set +e; cd /w; node .c3/run-mut.mjs M-C3,M-C4,MUT-43'`; mutação de migração
  numa base `trc01_mut` própria dentro do Postgres do container (`CREATE DATABASE` por `pg.Client`, `prisma migrate deploy`, `DROP … WITH
  (FORCE)` no `finally`). Log: `<scratchpad>/dev-trc01-c3/run-B2-mut.log`.
- **Saída resumida:**

  | Mutação | âncora | migrate/tsc | TAP (`traccar-position-ingestion-db`) | `not ok` |
  |---|---|---|---|---|
  | M-C3 (troca preserva o carimbo antigo) | 1, CRLF | migrate ec 0 | **18/22, fail 4** | T-C1 a1 → `stored` · gatilho ("troca regrava") `expected true / actual false` · T-P1 a2 → `stored` · T-P2 a1 → `stored` |
  | M-C4 (honra o valor forjado) | 1, CRLF | migrate ec 0 | **21/22, fail 1** | gatilho ("forja ignorada") `expected 1792324558776 / actual 946684800000` |
  | MUT-43 (`false && candidates.some(…)`) | 1, CRLF | tsc 0 | **15/22, fail 7** | A→B sem evento · `reassigned → on_route` · A→B→A · T-C1 · OS anterior à migração · T-P1 · T-P2 |

  Restauro: blob da migração = HEAD `e1a6c302a631` (2×), `field-dispatch.repository.ts` = HEAD `191725dd6a55`.
- **Veredito parcial:** M-C2, M-C3, M-C4 e MUT-43 **continuam mordendo** (âncoras do catálogo ainda existem e são únicas). O conserto
  passa a ser vigiado também por M-C3 (T-P1/T-P2 caem se a troca não regravar a coluna).

### Passo 8 — rodada A2 (verde) sobre a árvore FINAL, `w-trc01` — terminou ~12:01Z

- **Comando:** `teste-linux.sh C:/Users/AMP/w-trc01 'set +e; cd /w; node --test --import tsx --test-reporter=tap $(ls tests/traccar-*.test.ts)
  …; npm test …'` (lista inteira de `not ok` dos dois). Sem aviso do `tar` desta vez. Log: `<scratchpad>/dev-trc01-c3/run-A2-verde.log`.
- **Saída resumida:**
  - Traccar, 15 suítes: **132 tests, pass 123, fail 9, skipped 0**; os 9 `not ok` = #7–#14 e #16 de `traccar-dev-topology` (os mesmos da
    rodada A); 132 títulos `ok|not ok`. Com a topologia 12/12 no Windows (passo 5): **132/132 no total, skipped 0** (meta ≥ 132).
  - `npm test` (forma do job `backend`): **3496 tests, pass 3485, fail 9, skipped 2** (`320 arquivo(s)`); os 9 `not ok` são
    **exatamente** os 9 de topologia (#2758–#2765, #2767) — `docker compose` ausente no container; no runner da CI e no Windows passam.
    `skipped 2` = os dois do runner (paridade RBAC × banco, que só liga no `backend-postgres` — ver passo 9).
- **Veredito parcial:** VERDE no que o ciclo toca; fail só por ambiente, identificado por título.

### Passo 9 — forma do job `backend-postgres` (a lista `SUITES=` do `ci.yml`, sem editá-lo), no container

- **Comando:** `eval` das 49 linhas `SUITES=` do `ci.yml` (CR removido: a árvore está em CRLF), `npm run db:seed`, `node --test --import tsx
  $SUITES | tee`, env do job (`CORE_SAAS_PERSISTENCE=prisma`, `JWT_*`, `RBAC_DB_PARITY=1`). Logs: `run-C*-backend-postgres.log`.
- **Saída resumida:** rodada C: o `eval` sem tirar o CR deixou `` nos caminhos → `Could not find …` (erro **meu** de emulação, 0 teste
  rodado). C3 e C4 (CR tirado, **sem** `RBAC_DB_PARITY`): **391 tests, pass 389, fail 0, skipped 2** (as duas são `RBAC_DB_PARITY não é "1"` —
  variável que o job define na l.139 e eu tinha omitido). **C5 (env completo do job): 391 tests, pass 391, fail 0, skipped 0** (o `ec=1`
  final do `teste-linux` é o `grep` de `not ok|# SKIP` sem achado).
- **Veredito parcial:** VERDE. Denominador **391 = 389 + 2** (os 2 casos `-db` novos), como o §3.7 item 6 previa; o comentário da l.282 do
  `ci.yml` continua dizendo 363 — pendência `P-TRC-CI-COMENTARIO-DENOMINADOR` do §4, **não** consertada aqui (ordem do dono).

### Passo 10 — `build`, espelho de agentes, painel, `diff --check`, escopo

- **Comando:** `npm run build`; `node scripts/sync-agent-agents.mjs --check`; `node --check Kpis/app.js`; `git diff --check`; `git diff
  --name-only` contra os proibidos do §3.2 (`prisma/`, `.github/`, `src/integrations/traccar/`, `src/database/rls.ts`,
  `src/modules/work-orders/`, `field-dispatch.service.ts`, `Kpis/`, `package*.json`); `git diff -U0 -- src | grep ^@@`.
- **Saída resumida:** build ec 0 (`dist/` já existia, gitignored); `[agents-sync] OK — 61 agentes, espelho consistente`; `Kpis/app.js` ec 0;
  `git diff --check` ec 0; proibidos tocados: **0**. Hunks de `src/`: o bloco de comentário imediatamente acima de
  `findOperatorsForVehicleAt` e o SELECT/WHERE dela; o comentário acima de `classifyOperatorsAtFixTime` e a linha da flag; o tipo
  `OperatorAtFixTimeCandidate`. `git diff --stat`: **10 arquivos, +182/−27** (+ este relatório, novo): 3 de `src/`, 2 de `tests/`,
  `mutations.mjs`, `API_CONTRACTS.md`, `PLANO_TRACCAR.md`, o comando e `B-TRC-01-dev.md` — todos no PERMITIDO do §3.2. Nenhum outro teste
  mudou (`tests/field-dispatch*`, `tests/work-order*`, os casos do ciclo 1, T-C2, T-C3 intactos).
- **Veredito parcial:** VERDE; escopo dentro do §3.2.

### Passo 11 — limpeza (§C5)

- **Comando:** `git worktree remove --force C:/Users/AMP/w-trc01-mut3` + `prune` (antes: `cmp` dos 6 arquivos igual ao `w-trc01` e nenhum
  container montando o worktree); `docker ps -a` e `docker network ls` filtrando `tl*`; `git status --short`.
- **Saída resumida:** worktree removido (`ls` não acha; `worktree list` sem ele); containers `tl*` = 0, redes `tl*` = 0 (o `teste-linux.sh`
  removeu pelo nome; `erp-postgres`/`erp-redis`, base viva, nunca tocados); `w-trc01`: só os ` M` de EOL pré-existentes, os 3 untracked
  pré-existentes, o meu diff e este relatório. Scratch: só a subpasta `dev-trc01-c3/` (logs `run-*.log`, `topology.tap` e a cópia do runner
  `run-mut.mjs`, md5 `b127d1f0…`) — fica como evidência; apagável sem perda.
- **Veredito parcial:** LIMPO. Nenhuma junction, nenhum `node_modules` novo, nada de base viva, nenhuma porta proibida.

## Fechamento

- **Nada reescrito:** o ciclo 3 não reescreve nem apaga posição já gravada sob a regra antiga (plano §3.1; fecha a nota 3 da (b′) para este
  ciclo). Sem migração, sem backfill; `prisma/**` intocado.
- **Bateria (N e forma):** `check`/`lint`/`build` ec 0 · unitários 5/5 + 1/1 · Traccar **132/132** (123 Linux + 9 topologia no Windows;
  topologia 12/12), skipped 0 · `field-dispatch*` + `work-order*` **366/366** · `npm test` (job `backend`, Linux) 3496: pass 3485, fail 9 =
  os 9 de topologia por ambiente, skipped 2 · `backend-postgres` (Linux, env completo) **391/391**, skipped 0 · vermelho-controle
  **23/27** (T-C4(e), T-C1, T-P1, T-P2 pelas asserções nomeadas; restauro → 27/27) · mutações M-P1a 19/22, M-P1b 23/27, M-C1′ 19/22, M-C2
  24/27, M-C3 18/22, M-C4 21/22, MUT-43 15/22 — todas vermelhas, todo restauro = blob · `git diff --check` ec 0 · espelho ok.
- **Premissas do plano falsificadas (só registro):** `traccar-rls-budget-order` tem 1 caso, não 4 (§3.7 item 2); o `npm run check` não
  compila `tests/` (o `tsconfig` inclui só `src/**`), então o "candidato sem a flag não compila" só vale no `src`.
- **Não executado (fora da bateria que o orquestrador me deu):** smoke vertical `scripts/traccar-dev-demo.mjs` (§3.7 item 10); o
  `backend-postgres` 3× (é da cadeira (a″)). Nada commitado nem empurrado — o orquestrador versiona (§3.7 item 12 é dele).
