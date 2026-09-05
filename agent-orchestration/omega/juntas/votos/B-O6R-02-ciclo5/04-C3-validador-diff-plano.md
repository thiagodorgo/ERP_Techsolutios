# VOTO C3 — jurado-c5-validador-diff-plano · B-O6R-02 ciclo 5 (TETO)

- **Cadeira:** C3, TITULAR de diff x plano, COM VETO. Identidade NOVA — nunca votei, planejei nem
  desenvolvi nesta trilha; nada herdado de jurado-c4-validador-diff-plano, jurado-arnes-diff-escopo-registro,
  validador-mestre nem dos 3 especialistas de 12c3825. Suplente nomeado: jurado-c5-suplente-validador-diff-plano.
- **Data:** 2026-09-03 · **Head julgado:** `2709f4b` · **Base do bloco:** `84bb90b` (merge, pais `12c3825`+`f895dd2`)
- **Regra que aplico:** plano do ciclo 5 na precedencia E1.10 > E4 > E3 > E1 > EMENDA > ERRATA S0 > corpo,
  mais os rulings CP-0/CP-1(+adendo)/CP-3 do diario (julgo o ATO e o fundamento, nao a letra morta).
  Nenhuma afirmacao de ata, briefing, parecer do inspetor ou do critico entra como fato — tudo re-medido.
  O veto NAO alcanca achado `pre-existente` (D-JUNTA-ESCOPO-E-CALIBRACAO). Nao proponho correcao (§C7.4-bis).
- **Registro incremental (P1):** este arquivo cresce a cada medicao.

## ESQUELETO

- [ ] V0 — terreno proprio (worktree, head, pristino por hash, Node)
- [ ] V1 — leitura do plano como emendado + reguas (a lista §5 que aplico; pisos que sobrevivem ao CP-3)
- [ ] V2 — escopo arquivo a arquivo: diff 84bb90b..2709f4b (numstat + name-only) x §5.1
- [ ] V3 — PROIBIDO, saida por comando (schema, migrations existentes, CLAUDE/AGENTS, .env, lockfiles, infra, frontend, mobile, tests fora da lista, a109fd7)
- [ ] V4 — migrations: contagem no head (106) + a UNA nova aditiva
- [ ] V5 — ci.yml: o ruling CP-1 (7 linhas no merge) julgado no ATO e fundamento; diff 84bb90b..head VAZIO
- [ ] V6 — pisos §6 por EXECUCAO (P13/P14/A6) em cluster descartavel proprio + grep de confirmacao
- [ ] V7 — canonicas 1 e 2 publicadas com N e forma (+ spot-check proprio)
- [ ] V8 — ordem do contrato (D36) por git log
- [ ] V9 — registro §12 item a item (7 fechar-com-PR; orfao do critico corrigido?) + ACHADO-4 corrigido nas 5 publicacoes
- [ ] V10 — KPI §C3 (N e forma, mvp_* intocados, pr/merge_commit/approved_head null, backfill #368 com head JULGADO d90fbbb)
- [ ] V11 — R5 do inspetor (as duas declaracoes do orquestrador x medicao) — mandato meu
- [ ] V12 — bateria por amostragem + limpeza
- [ ] VEREDITO

---

## NOTA DE CONTINUIDADE (P1)

Queda por limite de sessao logo apos gravar o esqueleto; retomada pela MESMA identidade (titular), por
instrucao do orquestrador. Nada medido antes da queda entra como fato sem re-medicao — o que segue abaixo
foi todo medido NESTA retomada.

## V0 — TERRENO PROPRIO · medido

- Worktree do bloco `.claude/worktrees/agent-af6ea607f3ddf8efd`: `git rev-parse --short HEAD` = **2709f4b**;
  `git status --porcelain` = **VAZIO** (0 linhas). Uso em MODO LEITURA (git show/diff/log) — nao muto nada nele.
- `git rev-parse origin/main` = `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9` (#368) — e o segundo pai de `84bb90b`.
- `git log --format=... -1 84bb90b` = merge com dois pais `12c3825` + `f895dd2` — base do bloco confirmada.
- `git merge-base --is-ancestor origin/main 2709f4b` → ec=0 — a main publicada e ancestral do head julgado.
- `git merge-base --is-ancestor bcf6460 2709f4b` → ec=0; `git log 84bb90b..2709f4b` = **4 commits**:
  `6986f10` (F4) · `5d6c6d3` (F5) · `bcf6460` (F6) · `2709f4b` (correcoes pos-critico).

## V1 — A REGUA QUE APLICO (lida, com a base de cada criterio declarada)

**ACHADO PRELIMINAR (gravidade: nota):** o plano `B-O6R-02-ciclo5-plano.md` na ARVORE PRINCIPAL
(`demo/investidor`) tem **307 linhas** — so corpo + ERRATA S0 + EMENDA. A versao que governa (com os
apensos E1/E3/E4, **847 linhas**) vive na linhagem do bloco (`git show 2709f4b:...`) e na main. Quem ler o
plano pela arvore principal julga por regua defasada. Escopo: `pre-existente` (a arvore principal esta na
branch demo/investidor, que nao e a linhagem do bloco); nomeado para a ata.

Reguas (apos leitura integral das 847 linhas, precedencia E1.10 > E4 > E3 > E1 > EMENDA > ERRATA S0 > corpo,
mais rulings CP-0/CP-1(+adendo)/CP-3 do diario):

- **§5 que aplico (pos-EMENDA, = §5.1 do comando):** migration NOVA `20260871000000_add_reversal_pair_fk` ·
  `tests/financial-entry-delete-reverse-race-db.test.ts` · `API_CONTRACTS.md` · `Kpis/kpis-latest.json`/
  `kpis-history.json`/`kpis-history.md`/`index.html` · `status-geral.md` · `codex/log-execucao.md` ·
  `pendencias.md` · `docs/revisoes/O6R/achados.jsonl`+`REGISTRO` · `terreno-pos-absorcao.md` (S0-zero-b) ·
  `B-O6R-02-ciclo5-*.md` (diario/auditoria) · ci.yml SOMENTE via autorizacao E3.3/ruling CP-1 (consumida no
  merge). **Subtracao da EMENDA item 1 (escrita):** audit-security, vehicle-identity-schema,
  impound-process-checklist-link-schema, auth-identity-fixture, db-catalog-write-guard,
  core-saas-role-authority-db, run-backend-tests.mjs, npm-test-runner-guard NAO podem aparecer no diff das
  fatias — e P10/P11/P12 NAO vinculam (CP-3(2): aritmetica da EMENDA; pisos remanescentes P13/P14/A6 +
  metas de bateria §6). `Kpis/app.js`: fora da tabela §5.1, AUTORIZADO pelo CP-3(5) exclusivamente via
  kpi-freeze (diff = linha FROZEN) — julgo o ato abaixo (V11).
- **Bases de cada diff (declaradas):** escopo das fatias = `84bb90b..2709f4b` · `src/**` = contra
  `84bb90b` (E4.4; contra `12c3825` sairia 1 arquivo da main e reprovaria por construcao — contraprova
  executada) · ci.yml pos-merge = `84bb90b..2709f4b` (VAZIO) e ato do merge = `f895dd2..2709f4b` ·
  CLAUDE/AGENTS = contra `origin/main` · ancoras = tabela do S0-zero-b (terreno §2), nao a do §0 do plano.

## V2 — ESCOPO ARQUIVO A ARQUIVO · **VERDE (13/13 na lista)**

`git diff 84bb90b 2709f4b --numstat` = **13 arquivos**:
API_CONTRACTS.md 25/9 · Kpis/app.js 1/1 · kpis-history.json 14/2 · kpis-history.md 59/0 ·
kpis-latest.json 36/18 · ciclo5-auditoria.md 63/0 · ciclo5-execucao.md 879/0 · log-execucao.md 96/0 ·
pendencias.md 178/7 · status-geral.md 72/0 · terreno-pos-absorcao.md 98/0 · migration nova 64/0 ·
financial-entry-delete-reverse-race-db.test.ts 256/8.

- 12/13 estao na tabela §5.1 do comando; o 13o (`Kpis/app.js`) esta autorizado pelo CP-3(5) e o diff dele
  e EXCLUSIVAMENTE a linha `var FROZEN` nos dois intervalos (`84bb90b..bcf6460` e `bcf6460..2709f4b`) —
  medido por diff, linhas +/- unicas = a linha FROZEN. Consigno como o R5b pediu: a classe e a mesma do
  tropeço do ARNES (`P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5`); a autorizacao preventiva do CP-3(5) foi
  o conserto documental correto, e o guard do painel (que executa o app.js real) e o juiz — re-executo em V10.
- **NENHUM arquivo da subtracao da EMENDA no diff** (0 ocorrencias dos 8 caminhos de arnes/runner).
- `index.html` e `achados.jsonl`/`REGISTRO` PERMITIDOS mas nao tocados: o painel hidrata dos JSON em runtime
  (nenhuma dimensao nova inaugurada; guard 22/22 — V10) e o status pos-junta NAO EXISTE na autoria (B.11:
  decisao consciente; quem registra nao inventa veredito). Lista permitida != lista obrigatoria. Sem achado.
- Nenhum artefato de drill commitado (0 `.log`/fixture-dir/tmp/node_modules no name-only).

## V3 — PROIBIDO, saida por comando · **VERDE (8/8)**

1. `git diff 84bb90b 2709f4b -- .github/workflows/ci.yml | wc -l` = **0** (autorizacao consumida no merge; §10.3(iv) na forma ruled).
2. `git diff 84bb90b 2709f4b -- prisma/schema.prisma | wc -l` = **0**.
3. `git diff --name-only 84bb90b 2709f4b -- prisma/migrations/` = **SO** `20260871000000_add_reversal_pair_fk/migration.sql` — nenhuma migration existente tocada (cabecalho da 20260870000000 incluso).
4. `git diff --stat 2709f4b origin/main -- CLAUDE.md AGENTS.md` = **VAZIO**.
5. `.env`/lockfiles/`frontend/`/`mobile/`/`infra/` no diff = **0**.
6. `tests/**` no diff = SO a suite -db da lista.
7. `git ls-tree -d 2709f4b prisma/migrations/ | wc -l` = **106** (105 pos-absorcao + 1 do F4 — bate §11.3).
8. `git diff --check 84bb90b 2709f4b` = limpo, ec=0.
Cherry-pick de `a109fd7`: os 4 commits das fatias sao F4/F5/F6/correcoes, mensagens e diffs proprios do bloco — nenhum e cherry-pick (evidencia: log + numstat acima).

## V4 — MIGRATION NOVA, ADITIVA · **VERDE** (leitura minha; profundidade e da C2)

`git show 2709f4b:prisma/migrations/20260871000000_add_reversal_pair_fk/migration.sql` (64 linhas):
censo `DO` fail-closed (RAISE EXCEPTION nomeando `P-O6R-B02-ORFAOS-LEGADOS`, so contagem) →
`ADD CONSTRAINT financial_entries_reversal_pair_fk ... NOT VALID` → `VALIDATE` → down documentado no
rodape. Conferido por leitura do blob em V4-leitura (abaixo); o drill D35 e mandato da C2 — nao o repito.

## V5 — CI.YML: O ATO DO RULING CP-1, JULGADO NO MERITO · **SUSTENTA — medido por mim**

O criterio que aplico e o RULED (terreno §7 + ruling CP-1, precedencia sobre a letra E3.3), e julgo o ATO:

- **Fundamento re-medido:** `git cat-file -e` das **7 suites** → main `f895dd2` ec=**128** (ausentes) e
  head ec=**0** (presentes), nas 7. Main-integral teria posto 6 suites dos ciclos 1-4 na main **roteadas em
  lugar nenhum** + mantido a divida da 7a. Cada uma tem exatamente **1 marcador `skip:`** (grep no blob) —
  auto-pulariam VERDES no job `backend`. E exatamente a classe de verde-cego que o E3.2 usa como fundamento
  para a propria linha unica; o ruling aplicou o MESMO argumento as 6. A emenda e consistente com a razao de
  ser da regra emendada — nao e afrouxamento.
- **Confinamento:** `git diff f895dd2 2709f4b -- .github/workflows/ci.yml` = **1 hunk unico** (25+/4-):
  -4 = o comentario LUGAR RESERVADO; +25 = 7 linhas `SUITES=` + comentarios + 1 comentario de fechamento
  ("Fecha o LUGAR RESERVADO da main e P-O6R-B02-SUITES-LIST-CI, cujo dono e este PR"). **Nenhum outro
  job/passo/env/action/guard mudou** (hunk unico; pipefail e guard de zero pulos fora do hunk = intactos).
- **Contagem por forma declarada:** `grep -c 'SUITES="\$SUITES'` = main **26** → head **33** (Δ **+7**).
  (O ruling publicou 27→34 contando tambem a inicializacao `SUITES=`; o DELTA +7 e identico nas duas formas
  — divergencia de forma de contagem, nao de substancia; consigno.)
- **Verbatim:** as 6 linhas do lado-branch existem no `ci.yml` de `12c3825` (grep com numeros de linha) e
  entraram com seus comentarios.
- **E3.3(b) "ATUALIZADO, nunca apagado":** o comentario de 4 linhas foi SUBSTITUIDO por 1 linha de
  fechamento. A letra nao foi cumprida; o PROPOSITO declarado da clausula (registrar que a suite entrou, em
  qual PR, e que a pendencia fechou) esta cumprido na integra pela linha nova + historico git + fechamento
  §12. Consigno como divergencia letra-x-ato ja NOMEADA pelo proprio processo (CP-3(4), terreno §7) — nao e
  consolidacao silenciosa. Gravidade: **nota**, dentro-do-bloco, sem efeito de produto.
- **Pos-merge:** diff `84bb90b..2709f4b` do arquivo = **VAZIO** — F4-F6 nao tocaram o ci.yml; a autorizacao
  foi consumida uma unica vez, no lugar que o ruling determinou.
- **A linha nova exercida:** juiz local = canonica 2 (lista EXTRAIDA do ci.yml do head, 34 suites) — re-executo
  em V7; prova final = job `backend-postgres` no CI do PR (juiz nomeado: CI + porteiro; fora do meu alcance na autoria).

## V6 — PISOS §6 POR EXECUÇÃO · **VERDE — P13 (2), P14 (1), A6 (1), no MEU cluster**

**Regua declarada (subtracao do CP-3(2), consequencia da EMENDA item 1):** P10/P11/P12 NAO vinculam este
bloco (materia do arnes, #359 mergeado); vinculam **P13** (>=2 casos SQL cru recusados pela FK), **P14**
(1 caso [RLS] real NOBYPASSRLS) e **A6** (1 caso censo com orfao semeado), mais as metas de bateria do §6
(canonica 3 10/10 denominador identico — cadeira C1; canonica 2 15/15; corrida x10 — C2/C1). Cobrar
P10/P11/P12 aqui seria reprovacao por construcao. **Sobrou piso suficiente?** SIM: o bloco mantem a regua
DELE (FK por construcao + RLS real + censo + numero-sob-forma), e a regua do arnes vive mergeada no #359.

**Forma da minha execucao:** worktree do bloco (so leitura git; execucao de teste), head `2709f4b`, arvore
limpa antes/depois (porcelain=0), Node v20.19.5, cluster descartavel PROPRIO `jur-c5-c3-pg` (postgres:16,
porta efemera 32779 via -P, conferida contra excludedportrange por netsh antes) + `jur-c5-c3-red` (redis:7,
32780), `npx prisma migrate deploy` ec=0 com **106** migrations conferidas por SELECT em
`_prisma_migrations` (a FK nova incluida — o censo `DO` nao abortou em base limpa), exit por variavel,
TAP lido de arquivo no scratchpad.

- `node --test --import tsx tests/financial-entry-delete-reverse-race-db.test.ts` → **ec=0 · tests 9 ·
  pass 9 · fail 0 · skipped 0**. Nomeados no TAP: `[C9/P13] sonda v` (23503 nomeando
  `financial_entries_reversal_pair_fk`) · `[C9/P13] sonda vii` · `[C10/P14][RLS real]` (papel efemero
  NOBYPASSRLS) · `[A6][censo]` (WARNING nomeado) + os 5 do ciclo 4 (race x2, trigger A/B, barrier).
- **Contagem por grep x execucao, diferenca EXPLICADA:** grep = 9 declaracoes `test(`; execucao = 9 pontos.
  Composicao difere: o template `[${order}]` produz 2 pontos (reverse-first/delete-first, +1) e o
  gate-test do DATABASE_URL nao registra ponto com DB presente (-1). Nenhum `describe.skip` oculto.
- **Nenhum caso morreu:** base `84bb90b` = 6 casos executaveis (gate + race x2 + trigger B + trigger A +
  barrier + `[RLS]` app-context); head = os mesmos 5 + `[RLS real]` (reformulacao 1:1 MANDADA pelo §2-C10
  — enunciado vivo, arranjo trocado de app-context para NOBYPASSRLS real) + 3 novos (v, vii, censo).
  Δ=+3 (6→9) — exatamente o que o PR declara. **Numero declarado = numero executado.**
- **DB-gate provado:** sem `DATABASE_URL` → ec=0, 1 skipped, 0 crash-no-load (sustenta o fundamento
  anti-verde-cego do ci.yml e o F5.4).
- Piso >=8 casos novos do §6 original NAO se aplica (era soma com P10-P12); dos pisos remanescentes a soma
  e 4 casos novos permanentes (2+1+1) — presentes e verdes. Profundidade (23503 nas duas direcoes, D34/D35)
  = mandato da C2; existencia, nome e contagem conferem.

## V7 — CANONICAS 1 E 2 COM N E FORMA · canonica 2 RE-EXECUTADA por mim

**Canonica 2 (minha execucao, N=1):** `npm run db:seed` (ec=0) + `node --test --import tsx <34 suites>`
com a lista **EXTRAIDA por mim do ci.yml do head** (33 linhas `SUITES="$SUITES ...` + 1 inicializacao
`SUITES="tests/checklist-routes-db.test.ts"` = **34** — a contagem "34" do diario confere pela forma
completa; minha primeira extracao de 33 errou por ignorar a inicializacao, corrigida). Resultado:
**ec=0 · tests 225 · pass 223 · fail 0 · skipped 2** (os 2 = casos `RBAC_DB_PARITY`, nomeados no TAP do
meu log) · grep `unhandledRejection|XX000|23505|40P01` = **0**. **Denominador 225 = o publicado (15/15,
225 constante). A linha nova do ci.yml esta EXERCIDA: a suite -db (9 testes) roda dentro do subconjunto.**
Publicacao do bloco (B.5): comando, N=15, env, denominador por iteracao, duracoes — N e forma presentes.

**Canonica 1 (minha execucao, N=1):** `env -u DATABASE_URL -u REDIS_URL -u CORE_SAAS_PERSISTENCE npm test`
→ **ec=1 · 261 arquivo(s) · 2485 testes · pass 2419 · fail 1 · skipped 65**; o UNICO `not ok` e
`tests/core-saas-role-authority.test.ts` — o ambiental PRE-EXISTENTE, DECLARADO por nome na publicacao e
com o PISO DE DENOMINADOR do #359 mordendo ao vivo no meu log. **Zera-lo NAO e meta deste bloco**
(carve-out `P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP`, `pre-existente`, produtor `src/database/prisma.ts:12`).
A publicacao B.2 (N=3, fail 4 = 1 ambiental + 3 do guard de paridade que o proprio F6 corrigiu) e honesta
— composicao nomeada; a composicao FINAL do head e a que eu medi (fail 1). N e forma presentes nas duas
canonicas publicadas.

## V8 — ORDEM DO CONTRATO (D36) POR GIT LOG · **VERDE**

- `git log --reverse 84bb90b..2709f4b -- API_CONTRACTS.md` = **SO `bcf6460`** (F6, 2026-09-03 02:33).
- Os commits do produto que os drills exercitam: `6986f10` (F4, migration) e `5d6c6d3` (F5, casos) =
  2026-09-02 23:45 — **ANTERIORES**. D35/D34 registrados no diario F5.2/F5.3 (2026-09-02), antes do F6.
  Contrato NUNCA a frente da execucao. Ancora do §2-C9: D35 (+D34 ao lado); D32 NAO se exige (EMENDA/#359).
- Texto lido no blob (l.399-448): re-versionamento `financial_entry_undo@2026-09-02.b-o6r-02-c5`; DUAS
  camadas (triggers = metade soft-delete/estorno, inclusive sob NOBYPASSRLS; FK = separacao crua, 23503);
  **o limite que resta NOMEADO** (UPDATE cru amount/account_id, DELETE fisico da CONTRAPARTIDA — sem
  desenho de par que feche); censo WARNING + censo fail-closed; amarracao por nome as DUAS suites
  (`tests/financial-entries.test.ts` — existe no head, cat-file ec=0 — e a `-db`), com os casos
  `[C9/P13]`/`[C10/P14]`/`[A6]` que EU executei verdes. O contrato afirma o que a execucao sustenta.

## V9 — REGISTRO §12, ITEM A ITEM · **VERDE**

`pendencias.md` no head, numstat 178+/7-: **as 7 linhas removidas sao EXATAMENTE as linhas de status
ABERTA→FECHADA das 7 pendencias fechadas** (medido no diff; §A2: status na propria pendencia, nada apagado).

| pendencia | estado no head | conferido |
|---|---|---|
| P-O6R-B02-TESTE-RLS-SUPERUSER | FECHADA (c5; C10+D34) | l.3780; caso [RLS real] executado verde por mim |
| P-O6R-B02-OVERCLAIM-ORFA-SQL-CRU | FECHADA (c5; FK+contrato) | l.3761; sondas v/vii verdes por mim |
| P-O6R-B02-CENSO-CASO-PERMANENTE | FECHADA (c5; A6) | l.3949; caso [A6] verde por mim |
| P-O6R-B02-REGISTRO-STATUS-LOG | FECHADA (c5; A5) | l.3936; status-geral 72+/log 96+ append |
| P-O6R-B02-BATERIA-CANONICAS-1-2 | FECHADA em 2709f4b (orfao do ACHADO-2 CORRIGIDO, com N/forma e ponteiro B.2/B.5) | l.3806+ |
| P-O6R-B02-SUITES-LIST-CI | FECHADA condicionada ao CI do PR — com a CONTRADICAO e a resolucao REGISTRADAS na propria entrada (E3.4) | l.3825+ |
| P-O6R-B02-RUNNER-SUMICO-SEM-SKIP | FECHADA como ATO DE REGISTRO, autor da correcao = #359, reconciliador = este PR (CP-3(1)); estado da materia MEDIDO antes de cobrar | l.3654+ |
| P-O6R-B02-S0-ESPELHO-NO-HEAD | FECHADA POR NAO-REPRODUCAO (28/08, ERRATA S0) — intacta, nao reaberta, nenhum fechamento novo por git archive+tar | l.3963 |
| P-O6R-ARNES-ISOLAMENTO | ABERTA + 2 emendas do c5 (objeto = tupla de ACL nspacl/relacl, pg_authid 0/150; EMENDA de PRECISAO com a tabela do critico) | l.5625/l.5666 |
| P-O6R-B02-ORFAOS-LEGADOS | NAO aberta — censo 0 penduradas (inclusive no MEU cluster: migrate deploy ec=0 com o censo DO no caminho) | correto |
| P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP | NOVA, pre-existente, produtor nomeado | l.3990 |
| P-O6R-B02-RULINGS-SEM-DESTINO | NOVA (ACHADO-1), destino por escrito | l.5704 |
| P-ARNES-DIVERGENCIA-RUNNER-SUMICO... | FECHADA (o ask dela cumpriu-se) | l.3652+ |

`achados.jsonl`/REGISTRO: NAO tocados — estados `aguardando_merge` = o estado VERDADEIRO na autoria
(B.11: quem registra nao inventa veredito). `status-geral.md`/`log-execucao.md`: append puro (72+/0-,
96+/0-), REPROVADO do c4 e autoria do c5 presentes (l.64-65 do status-geral com a redacao corrigida).

## V10 — KPI (§C3) · **VERDE**

- `kpis-latest.json`: `backend_tests` **2769/2771** com N e forma COMPLETOS (N=10 sequenciais, denominador
  identico, env/cluster/portas/106 migrations/Node, delta 2611→2771 DECOMPOSTO: +3 casos deste PR + 157 da
  absorcao — nenhum numero copiado de outro head, §C3.3 respeitado). `pr`/`merge_commit`/`approved_head`
  **null na autoria** (§C3.5 — cobra-los seria erro meu; `pr` sera preenchido no `gh pr create`).
- **`mvp_demo`/`mvp_vendavel` INTOCADOS** — objetos JSON comparados por parse entre `84bb90b` e `2709f4b`:
  **IDENTICOS** nos dois.
- `kpis-history.json`: 152 entradas; append da entrada do ciclo 5 (nulls na autoria) + **backfill §C3.5 do
  #368 na entrada SAN2-6**: `pr` 368 · `merge_commit` `f895dd2` · `approved_head` **`d90fbbb`** = o head
  JULGADO da ata `J-SAN2-6.md` l.5 (lido por mim), NAO o headRefOid `9051e9b`; delta `d90fbbb..9051e9b`
  re-medido POR MIM: 18 arquivos, **0** em src/tests/prisma/scripts/.github — registro puro. As 2 linhas
  removidas do numstat 14/2 sao artefato do append (campos da entrada SAN2-6 re-serializados com os MESMOS
  valores — `backend_tests` 2609/2611 preservado); nenhuma entrada historica alterada.
- Trilhas nao tocadas (flutter/smoke) carregam valor oficial com nota — conferido na entrada nova.
- Guards rodados POR MIM: `node --check Kpis/app.js` ec=0; `kpi-dashboard-charts` + `kpi-achados-paridade`
  **22/22 ec=0**. `app.js` = so a linha FROZEN (V2), gerada por `kpi-freeze.mjs` (CP-3(5)).
- A correcao do ACHADO-4 esta nas **5 publicacoes** (latest, history.json, history.md l.2530, status-geral
  l.64, log-execucao l.4015): tabelas nomeadas por execucao; ARQUIVO produtor NAO — candidatos de grep
  refutados 0/0; vazador medido `core-saas-role-authority-db` +1/+1 FORA da lista; +4/+4 SEM produtor.
  **A redacao afirma exatamente o que a execucao sustenta.**

## V11 — R5 DO INSPETOR (mandato meu) + ACUMULACAO DE PAPEIS

- **R5a:** `git log bcf6460..2709f4b` = **UM commit** (`2709f4b`). A declaracao do orquestrador ("dois
  commits novos") esta ERRADA; a medicao vence. Sem efeito de terreno ou produto — o head julgado e o
  certo. Consigno como **nota, dentro-do-bloco** (declaracao de convocacao, nao artefato do PR).
- **R5b:** `Kpis/app.js` fora da tabela literal do §5.1 — julgado em V2: autorizacao CP-3(5) via
  kpi-freeze, diff = SO a linha FROZEN nos dois intervalos, guard 22/22 verde. A propriedade que faltava ao
  plano (o ARNES ja havia registrado o buraco) foi suprida por ruling declarado, nao por silencio. ACEITO.
- **Acumulacao (R1):** o convocante e autor de F4-F6 e de `2709f4b`. Procurei a marca no diff que e meu
  mandato: o diff cabe na regua como emendada (V2/V3); a UNICA marca de autoria com risco — o over-claim
  do ACHADO-4, escrito pelo executor-orquestrador — foi apanhada pelo papel INDEPENDENTE (critico) e
  corrigida nas 5 publicacoes, com o limite residual (+4/+4 sem produtor) DECLARADO em vez de maquiado.
  A separacao §C7.4-bis nas tres pontas: achador (jurados c4 → critico c5) ≠ planejador (planejador-mestre
  c5 + dev SAN2-5 nos apensos) ≠ executor (Codex ate CP-3; orquestrador F4-F6). Nenhuma instrucao me foi
  dada durante o voto que estreitasse mandato (as mensagens do orquestrador entregaram mandato integral +
  continuidade pos-queda). Para a ata: consignado quem ocupou cada papel, acima.

## V12 — BATERIA POR AMOSTRAGEM + PRISTINO

- `npm run check` ec=**0** · `npm run lint` ec=**0** · `npm run build` ec=**0** ·
  `npm --prefix frontend run check` ec=**0** (exit por variavel, logs no scratchpad).
- `git status --porcelain` do worktree do bloco = **0 linhas ANTES e DEPOIS de todas as execucoes**
  (conferido apos suite -db, canonicas, guards e bateria).
- `git diff --check 84bb90b 2709f4b` limpo (V3.8).

---

# ACHADOS (nenhum propoe conserto)

1. **Plano na arvore principal DEFASADO** — a copia de `B-O6R-02-ciclo5-plano.md` em `demo/investidor`
   tem 307 linhas (sem E1/E1.10/E3/E4); a que governa tem 847 e vive na linhagem/main. Quem julgar pela
   arvore principal aplica regua morta. *Evidencia:* `wc -l` nas duas formas (307 x 847). *Gravidade:*
   nota. *Escopo:* `pre-existente` (estado da branch demo/investidor, anterior e alheio as fatias; os
   apensos chegaram a main via #367/#368 — origem provada pela presenca do blob de 847 na main e na
   linhagem). Propriedade ausente: *a arvore de onde os agentes leem a regua nao espelha a regua vigente*
   — mesma familia da reposicao de corpos do §2.1 do briefing. Dono a nomear na ata (classe do espelho
   da arvore principal).
2. **E3.3(b) letra nao cumprida no ato do CP-1** — o comentario do LUGAR RESERVADO foi SUBSTITUIDO por
   fechamento de 1 linha, nao "atualizado" in loco. *Evidencia:* diff `f895dd2..2709f4b` do ci.yml (V5).
   *Gravidade:* nota. *Escopo:* dentro-do-bloco. O proposito declarado da clausula (registrar que a suite
   entrou, em qual PR, e que a pendencia fechou) esta cumprido; a divergencia foi NOMEADA pelo proprio
   processo (CP-3(4), terreno §7) — nada consolidado em silencio.
3. **R5a — declaracao "dois commits" x medicao UM** (`git log bcf6460..2709f4b`). *Gravidade:* nota.
   *Escopo:* dentro-do-bloco. E a segunda declaracao do orquestrador corrigida por medicao nesta junta
   (a primeira foi o ACHADO-4 do critico); nenhuma das duas sobreviveu ao processo sem correcao — o
   processo funcionando, mas consignado para a ata.
4. **Contagem SUITES publicada 27→34 x minha forma 26→33** — ambas verdadeiras (com/sem a linha de
   inicializacao `SUITES="tests/checklist-routes-db.test.ts"`); Δ=+7 identico. *Gravidade:* nota (forma
   de contagem declarada ao lado do numero resolve). *Escopo:* dentro-do-bloco.

# O QUE NAO MEDI (de outra cadeira, nomeada)

- **C1 `jurado-c5-arnes-catalogo-postgres`:** canonica 3 N>=10 na base limpa (denominador 2771 identico,
  Δroles=0, vaza-metro por rodada), D29 lista-6 N>=13, D33. Meu contato com o numero: a publicacao carrega
  comando/env/Node/N/forma (V10); a re-execucao estatistica e mandato dela.
- **C2 `jurado-c5-banco-fk-triggers`:** D35 up→down→re-up, D34 nas duas pontas, profundidade das sondas
  cruas, semantica FK/RLS/censo, re-ataque de SALDO, corrida x10. Eu provei EXISTENCIA/nome/contagem dos
  casos (9/9 no meu cluster, N=1); a profundidade e dela.
- **CI real do PR** (job `backend-postgres` com a linha nova): so existe quando o PR abrir — juiz = CI +
  porteiro; o fechamento da SUITES-LIST-CI esta condicionado a isso NA PROPRIA pendencia.

# PENDENCIAS QUE ACEITO

`P-O6R-ARNES-ISOLAMENTO` (aberta, emendada — trilha de identidades, +4/+4 sem produtor, `pre-existente`) ·
`P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP` (`pre-existente`, produtor nomeado) · `P-O6R-B02-RULINGS-SEM-DESTINO`
(destino por escrito no proximo comando) · `P-SYNC-AGENTS-NAO-RECURSIVO` + espelho Codex de especialistas
(R3 do inspetor, `pre-existente` provado na main) · vermelho ambiental da canonica 1 (bloco irmao) ·
ACHADO-3/ACHADO-5 do critico (defeitos do PLANO, para a ata e planos futuros).

# TEARDOWN

Criei: containers `jur-c5-c3-pg` (:32779) e `jur-c5-c3-red` (:32780), ambos `--rm`, derrubados ao fim
(`docker stop`; conferencia `docker ps -a`); logs no scratchpad da sessao (c3-*.log), fora do repo.
NENHUMA mutacao de arquivo rastreado; worktree do bloco usado em leitura+execucao, porcelain 0
antes/depois; arvore principal: unico arquivo novo meu = ESTE voto (entregavel). Base viva
`erp-postgres`/`erp-redis`: zero comandos, nem leitura. Nenhum sed -i, git archive, junction, checkout,
stash, clean ou reset.

---

# PARECER FINAL (JSON)

```json
{
 "jurado": "jurado-c5-validador-diff-plano (TITULAR, identidade nova; nunca votou/planejou/desenvolveu nesta trilha; nada herdado de jurado-c4-validador-diff-plano, jurado-arnes-diff-escopo-registro, validador-mestre nem dos 3 especialistas de 12c3825; suplente nomeado: jurado-c5-suplente-validador-diff-plano)",
 "lente": "Diff x plano COMO EMENDADO (E1.10 > E4 > E3 > E1 > EMENDA > ERRATA S0 > corpo, + rulings CP-0/CP-1/CP-3) — escopo §5/PROIBIDO arquivo a arquivo em 84bb90b..2709f4b (src/** vazio contra o head POS-ABSORCAO, E4.4; ancoras pela tabela do S0-zero-b; 106 migrations), o ci.yml contra o RULING do CP-1 (7 linhas consumidas no merge; diff pos-merge VAZIO), pisos remanescentes P13/P14/A6 por execucao, canonicas 1 e 2 com N e forma, ordem do contrato (D36) por git log, registro §12 e KPI (§C3). Nao julga: canonica 3 N>=10/D29/D33/vaza-metro (C1 jurado-c5-arnes-catalogo-postgres); D35/D34/sondas cruas em profundidade/SALDO/corrida x10 (C2 jurado-c5-banco-fk-triggers); job backend-postgres real (CI + porteiro).",
 "voto": "APROVADO",
 "justificativa": "Terreno: worktree do bloco em leitura+execucao (porcelain 0 antes/depois de TODAS as execucoes), head 2709f4b conferido, Node v20.19.5, cluster descartavel proprio jur-c5-c3-pg/:32779 + jur-c5-c3-red/:32780 (netsh consultado antes; migrate deploy ec=0 com 106 migrations conferidas por SELECT), base viva intocada. REGUA: §5.1 do comando (= §5 do plano pos-EMENDA item 2) + CP-3(5) para Kpis/app.js; subtracao da EMENDA item 1 escrita no voto (P10/P11/P12 nao vinculam; 8 arquivos de arnes/runner proibidos no diff — 0 presentes). BASES: fatias = 84bb90b..2709f4b; src/** contra 84bb90b (VAZIO; contra 12c3825 sairia so authority-password.ts, da main); ci.yml pos-merge VAZIO e ato do merge medido em f895dd2..2709f4b (1 hunk unico 25+/4-, 7 suites existentes no head e ausentes na main com 1 skip-marker cada — fundamento anti-verde-cego VERDADEIRO); CLAUDE/AGENTS contra origin/main VAZIO. ESCOPO: 13 arquivos, 13/13 na regua. PROIBIDO 8/8 limpo. PISOS por execucao no MEU cluster: suite -db 9/9 ec=0 (P13=2 sondas 23503 nomeando a FK, P14=1 RLS real NOBYPASSRLS, A6=1 censo WARNING); grep=execucao=9 com composicao explicada; nenhum caso morreu (6->9, RLS reformulado 1:1 mandado pelo §2-C10); DB-gate 1 skip/ec=0. CANONICA 2 re-executada N=1: 225 constante (223/0/2 RBAC_DB_PARITY nomeados), 0 assinaturas, lista de 34 extraida do ci.yml do head — a linha nova EXERCIDA. CANONICA 1 re-executada N=1: fail 1 = so o ambiental declarado. D36: contrato SO em bcf6460, posterior a F4/F5. §12: 7 fechamentos com evidencia (7 remocoes = so status ABERTA->FECHADA), orfao do ACHADO-2 fechado em 2709f4b, S0-ESPELHO nao reaberta, ISOLAMENTO emendada 2x, ORFAOS-LEGADOS corretamente nao aberta. KPI: 2769/2771 com N e forma, delta decomposto, mvp_* IDENTICOS por parse, nulls na autoria, backfill #368 com approved_head d90fbbb = head julgado da ata (delta 18 arquivos/0 codigo re-medido), guards 22/22 rodados por mim. ACHADO-4 corrigido nas 5 publicacoes (verificado texto a texto). R5a: UM commit. R5b: app.js = so linha FROZEN, guard verde. Acumulacao R1: a unica marca de risco no diff (over-claim) foi pega pelo papel independente e corrigida; separacao consignada. Bateria: check/lint/build/fe-check ec=0. Papeis (§C7.4-bis): achador=jurados c4 + critico-c5-adversarial; planejador=planejador-mestre c5 + dev SAN2-5 (apensos); executor=Codex ate CP-3, orquestrador F4-F6 e 2709f4b. Achados: 4 notas — nenhum bloqueia. VOTO: APROVADO — diff cabe na §5 como emendada e o PROIBIDO esta vazio (saidas coladas), src/** vazio contra o head pos-absorcao, ci.yml VAZIO pos-merge com o ato do CP-1 medido e sustentado e P-O6R-B02-SUITES-LIST-CI fechada com a contradicao registrada, pisos 6 -> 9 casos por execucao, canonicas 1/2 com N e forma, contrato posterior aos drills, §12 apensada sem nada apagado, KPI com forma, mvp_* intocados e backfill d90fbbb correto",
 "o_que_executei": [
  {"comando": "git diff 84bb90b 2709f4b --numstat / --name-only (+ filtros src/, prisma/, tests/, ci.yml, CLAUDE/AGENTS vs origin/main)", "forma": "worktree do bloco, head 2709f4b; bases declaradas por criterio", "resultado": "13 arquivos, todos na regua; PROIBIDO 8/8 vazio; src/ vazio; ci.yml 0 linhas; 106 migrations (ls-tree -d)"},
  {"comando": "git diff f895dd2 2709f4b -- .github/workflows/ci.yml + git cat-file -e das 7 suites nas duas pontas + grep de skip/SUITES", "forma": "blobs, eol-neutro", "resultado": "1 hunk 25+/4-; 7 suites main ec=128/head ec=0; 1 skip-marker cada; SUITES append 26->33 (delta +7)"},
  {"comando": "docker run postgres:16/redis:7 (-P, --rm) + npx prisma migrate deploy + node --test --import tsx tests/financial-entry-delete-reverse-race-db.test.ts", "forma": "cluster proprio :32779/:32780, 106 migrations por SELECT, Node v20.19.5, TAP em arquivo, ec por variavel", "resultado": "ec=0, 9/9 pass, 0 skip; C9/P13 x2 23503, C10/P14 RLS real, A6 censo; sem DATABASE_URL: 1 skipped ec=0"},
  {"comando": "npm run db:seed + node --test --import tsx <34 suites extraidas do ci.yml do head> (canonica 2, N=1)", "forma": "mesmo cluster, lista extraida nao digitada", "resultado": "ec=0, 225 testes (223/0/2 RBAC_DB_PARITY), 0 unhandledRejection/XX000/23505/40P01"},
  {"comando": "env -u DATABASE_URL -u REDIS_URL -u CORE_SAAS_PERSISTENCE npm test (canonica 1, N=1)", "forma": "worktree do bloco, TAP em arquivo", "resultado": "ec=1, 261 arq/2485 testes, pass 2419, fail 1 (core-saas-role-authority, ambiental declarado), skipped 65; PISO do #359 mordendo"},
  {"comando": "git log --reverse 84bb90b..2709f4b -- API_CONTRACTS.md (+ migration/suite)", "forma": "log por caminho", "resultado": "contrato SO em bcf6460 (03/09 02:33) > F4/F5 (02/09 23:45); D36 cumprido"},
  {"comando": "git show 2709f4b de pendencias/kpis-latest/kpis-history + diffs e parse python dos mvp_*", "forma": "blobs + json.load", "resultado": "7 status ABERTA->FECHADA (unicas remocoes); mvp_* IDENTICOS; nulls; backfill 368/f895dd2/d90fbbb; ata J-SAN2-6 l.5 = d90fbbb; delta d90fbbb..9051e9b 18 arquivos/0 codigo"},
  {"comando": "node --check Kpis/app.js + node --test kpi-dashboard-charts + kpi-achados-paridade + npm run check/lint/build + npm --prefix frontend run check", "forma": "ec por variavel, logs no scratchpad", "resultado": "todos ec=0; guards 22/22"}
 ],
 "achados": [
  {"defeito": "Plano da arvore principal (demo/investidor) sem os apensos E1/E1.10/E3/E4 — 307 linhas vs 847 da regua vigente", "evidencia": "wc -l na arvore principal (307) x git show 2709f4b (847)", "gravidade": "nota", "escopo": "pre-existente", "motivo": "a arvore de onde agentes leem a regua nao espelha a regua vigente; origem: estado da branch demo/investidor, anterior as fatias — os apensos vivem na main (#367/#368) e na linhagem; dono a nomear na ata"},
  {"defeito": "E3.3(b) — comentario do LUGAR RESERVADO substituido por fechamento de 1 linha, nao atualizado in loco", "evidencia": "git diff f895dd2 2709f4b -- ci.yml (-4 comentario, +1 fechamento)", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "letra da clausula nao cumprida; o PROPOSITO declarado esta cumprido e a divergencia foi nomeada pelo proprio processo (CP-3(4) + terreno par.7) — nada consolidado em silencio"},
  {"defeito": "Declaracao do orquestrador de dois commits novos x medicao: UM (2709f4b)", "evidencia": "git log bcf6460..2709f4b = 1 commit", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "declaracao de convocacao imprecisa; segunda da rodada corrigida por medicao (R5a) — consignada para a ata"},
  {"defeito": "Contagem SUITES publicada 27->34 x minha forma 26->33", "evidencia": "grep append-only vs contagem com a linha de inicializacao", "gravidade": "nota", "escopo": "dentro-do-bloco", "motivo": "numero publicado sem a forma de contagem ao lado; delta +7 identico nas duas formas — declarar a forma resolve"}
 ],
 "pendencias_que_aceito": ["canonica 3 N>=10 + D29 N>=13 + D33/vaza-metro — C1 jurado-c5-arnes-catalogo-postgres", "D35/D34/sondas cruas/SALDO/corrida x10 — C2 jurado-c5-banco-fk-triggers", "job backend-postgres real — CI + porteiro (fechamento condicionado escrito na propria pendencia)", "P-O6R-ARNES-ISOLAMENTO aberta e emendada (trilha de identidades, +4/+4 sem produtor, pre-existente)", "P-O6R-B02-CRASH-NO-LOAD-SEM-SKIP (pre-existente, produtor src/database/prisma.ts:12)", "P-O6R-B02-RULINGS-SEM-DESTINO (proximo comando)", "espelho Codex de especialistas + P-SYNC-AGENTS-NAO-RECURSIVO (R3, pre-existente provado na main f895dd2)", "ACHADO-3/ACHADO-5 do critico (defeitos do plano, para a ata)"],
 "teardown": "Criei: jur-c5-c3-pg (:32779) e jur-c5-c3-red (:32780), ambos --rm, derrubados por docker stop e conferidos (docker ps -a: 0 jur-c5-c3; restam erp-postgres/erp-redis e os jur-c5-arnes-* da C1 em voo, nao tocados; volumes anonimos nao atribuiveis a mim NAO removidos por curinga — licao 26/07). Logs c3-*.log no scratchpad, fora do repo. Nenhuma mutacao de rastreado; worktree do bloco porcelain 0 antes/depois; arvore principal: unico arquivo novo = este voto. Base viva: zero comandos, nem leitura."
}
```

**VOTO: APROVADO** — diff cabe na §5 como emendada e o PROIBIDO esta vazio (saidas coladas), `src/**`
vazio contra o head pos-absorcao, `ci.yml` VAZIO pos-merge com o ato do CP-1 medido e sustentado, pisos
6→9 por execucao (P13/P14/A6 verdes no meu cluster), canonicas 1/2 com N e forma (re-executadas),
contrato posterior aos drills, §12 apensada sem nada apagado, KPI com forma, `mvp_*` intocados e
backfill `d90fbbb` correto.
