papel=porteiro-pos-merge | modelo=Fable (claude-fable-5-1, o do frontmatter; sem fallback) | mandato_md5=52db0132b3b951147280f013be23091a | corpo_md5=374b1b0d091a85cddf1733d3e51456ae (EOL-neutro, `git show origin/main:.claude/agents/porteiro-pos-merge.md | tr -d '\r' | md5sum`)

# Parecer do porteiro pos-merge — PR #402 (B-SAN3-01b) — merge 3e40a256

Mandato: `C:/Users/AMP/w-reg402/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro.md` (ramo docs/registro-402 @3b8fe166).
Terreno: arvore principal `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios` so para leitura de refs; execucao em worktree proprio detached `C:/Users/AMP/w-port402` @origin/main. Nada escrito no repositorio. Base viva (5432/6379) nao e alvo.
Protocolo: P1 (apenso apos cada item) · P2 (este arquivo nasce esqueleto; itens `EM APURACAO` viram medidos) · P7 (sob PAUSA, secao `## PAUSA`).

## 0. Identidade e md5 — 2026-10-02T22:29Z
- `tr -d '\r' < <mandato> | md5sum` → `52db0132b3b951147280f013be23091a` — IGUAL ao declarado pelo orquestrador.
- `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/porteiro-pos-merge.md | tr -d '\r' | md5sum` → `374b1b0d091a85cddf1733d3e51456ae` — IGUAL ao declarado.
- `git rev-parse origin/main` → `3e40a256ce801a8e63230b4b764ba1d2803f4f23`.
- Nota de terreno: o 1o `git show origin/main:.claude/...` sem `MSYS_NO_PATHCONV=1` foi mangled pelo MSYS (`origin\main;.claude\...`) e devolveu md5 de string vazia (`d41d8cd9…`); repetido por comando com a variavel inline (nunca exportada).
- Veredito parcial: identidade conferida.

## 1. O merge existe e esta integro — 2026-10-02T22:31Z
- `git log origin/main -3 --format='%H %s'` → `3e40a256ce80… fix(web): a web guarda por alcance e pelo estado da pagina (B-SAN3-01b) (#402)` · `4ab9d232… (#399)` · `5bcdcc58… (#398)`.
- `gh pr view 402 --json state,mergeCommit,headRefOid,…` → `state=MERGED` · `mergeCommit=3e40a256ce801a8e63230b4b764ba1d2803f4f23` · `head=1483a6f7680ba9504e12bf25eaaa423373cd1a01` · `ref=fix/web-guarda-por-alcance-e-estado-da-pagina` · `mergedAt=2026-10-02T22:24:56Z` · `by=thiagodorgo`.
- `git merge-base --is-ancestor 3e40a256… origin/main` → `NA-MAIN`.
- `git show -s --format=%P 3e40a256` → `4ab9d232…` (pai unico = squash merge sobre a base que o mandato colou como merge-base). Confere com o MEDIDO do mandato (`mandato-refs.sh 402`).
- Veredito parcial: merge existe, esta integro e e o topo da `origin/main`. Ha o que validar.

## 2. Promessa x entregue (corpo do PR + plano x diff real) — 2026-10-02T22:36Z
- `gh pr view 402 --json body` → 12 linhas (E1–E7, provas, escopo "so `frontend/**` + linha `test:smoke`, registro e `Kpis/*`; `src/**` e `prisma/**` intocados").
- `git diff --name-status 4ab9d232 3e40a256` → 39 arquivos: `frontend/**` 6 (4 em `src/`, 2 testes), `frontend/package.json`, `Kpis/*` 4, `docs/revisoes/SAN3/B-SAN3-01b-plano.md`, `agent-orchestration/**` 25, e **2 corpos de jurado** (`.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md` + espelho `.agents/`). Nenhum `src/`, `tests/` da raiz, `prisma/`, lockfile.
- Os 2 corpos de jurado nao estao no corpo do PR; estao **declarados na ata** (§A2: "ato de registro do orquestrador, precedente `aadaa6d5`"). Escopo cresceu com declaracao — nao e silencio.
- `git diff 4ab9d232 3e40a256 -- frontend/src/`:
  - `WorkOrdersPage.tsx` l.247-257: `actions={canCreate ? (<button …>Nova OS</button>) : undefined}` — **E4 existe no codigo**. `PageHeader.tsx:25` (`{actions ? <div …> : null}`) omite o conteiner quando undefined — o comentario novo da pagina descreve o que o codigo faz.
  - `dispatches.service.ts`, `useServiceQuoteReferences.ts`, `repository.ts`: **so comentario** (E3). O comentario de `useServiceQuoteReferences.ts` afirma "em `VITE_USE_MOCKS=true` a coluna de OS recebe 6 itens e a de clientes volta vazia — medido no plano": plano l.113 (premissa P-o-linha, `gen/mockmode.mts`: OS `source=mock itens=6`, clientes `itens=0`) e l.1927 confirmam a medicao. Comentario com lastro.
  - `frontend/package.json`: `test:smoke` ganha `tests/work-orders-page-live.test.tsx` logo apos `work-orders-honest-errors.test.tsx` — **E5 existe**.
- `git show 3e40a256:docs/revisoes/SAN3/B-SAN3-01b-plano.md` l.332-338: tabela E1–E7 bate 1:1 com o corpo do PR; l.523: "unanimidade de 3".
- E1: `frontend/tests/work-orders-page-live.test.tsx` A (+824) com 13 casos `[MD0] [PV1]–[PV7] [W1] [W2] [GB1]–[GB3]` (nomes lidos do TAP, item 3). E2: `work-orders-honest-errors.test.tsx` M (+628) com `[G1]`/`[G1b]`/`[G2]`/`[G3]`. E6/E7: `Kpis/*` e registro no diff.
- `git diff --name-only b02745b7 1483a6f7` filtrado por nao-registro → vazio: depois do fechamento do dev (`b02745b7`) so registro, como a ata afirma.
- Veredito parcial: toda afirmacao do corpo existe no diff; nenhum comentario afirma comportamento que o codigo nao tem; escopo extra (2 corpos de jurado) declarado na ata.

## 3. Numeros reexecutados — 2026-10-02T22:33Z–22:40Z (worktree `C:/Users/AMP/w-port402` @3e40a256, `npm ci` raiz 326 pacotes ec=0 + frontend ec=0, `node_modules` sem reparse point, Node v20.19.5)
- `npm --prefix frontend run test:smoke --silent > smoke-402.tap` (nao-TTY = TAP 13) → `# tests 1214 # pass 1214 # fail 0 # cancelled 0 # skipped 0 # todo 0`, `duration_ms 67794`, `grep -c "^not ok"` = 0, stderr 0 linhas, ec=0. **Declarado 1214/1214 — REPRODUZ.**
- `node --test --import tsx tests/work-orders-page-live.test.tsx` → `# tests 13 # pass 13 # fail 0`, ec=0 (E1: 13 casos — **reproduz**).
- `node --test --import tsx tests/work-orders-honest-errors.test.tsx` → `# tests 66 # pass 66 # fail 0`, ec=0 (§BAT do dev: 13 + 66 = 79 — **reproduz**).
- `npm --prefix frontend run check` → ec=0.
- `node --check Kpis/app.js` → ec=0; `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts` → `# tests 29 # pass 29 # fail 0` (declarado 29/29 — **reproduz**).
- `git status --porcelain | wc -l` no worktree apos as execucoes → 0 (nenhum residuo).
- **NAO reexecutado por mim — declarado:** suite backend (`npm test` = `scripts/run-backend-tests.mjs`, exige `DATABASE_URL`/Postgres com orcamento de skip; a unica base disponivel e a viva, que nao e alvo) e Flutter. Justificativa de nao-tocar: o diff nao tem `src/`, `tests/` da raiz, `prisma/` nem `mobile/`; `grep -l` por `WorkOrdersPage|work-orders-honest-errors|page-live|useServiceQuoteReferences|dispatches.service|work-orders/repository|frontend/package.json` em `tests/*.test.ts` → nenhum teste da raiz le os arquivos tocados. O KPI carrega `backend_tests 3052/3054` e `flutter_tests 864/864` com nota explicita (§C3.3), e a CI no head `1483a6f7` rodou `backend`, `backend-postgres`, `flutter`, `frontend`, `docker`, `owner-portal`, `authority-portal` = 14/14 `success` (`gh api …/check-runs`) — proxy executado por maquina, nao por mim.
- Veredito parcial: os numeros que o bloco exerceu reproduzem na `main` de agora, em N e forma (TAP).

## 4. KPI (§C3.5) — 2026-10-02T22:41Z
- `git show 3e40a256:Kpis/kpis-latest.json` → `release: {pr: null, merge_commit: null, approved_head: null, status: published_per_pr}`; `kpis-history.json` 166 entradas, ultima `{version: B-SAN3-01b, pr: null, merge_commit: null, approved_head: null, blocks_completed: 170, frontend_smoke_tests: 1214/1214}`; anterior `{B-GOV-PAUSA, pr: 397, blocks 169, smoke 1202/1202}` → 169→170 e 1202→1214 coerentes.
- `git show 3b8fe166:Kpis/kpis-latest.json` (ramo `docs/registro-402`, head atual) → os 3 campos **ainda `null`**; `git diff --name-status origin/main 3b8fe166` → so `00-mandatos/porteiro.md`. O backfill ainda nao foi feito.
- `Kpis/app.js` diff → so a linha `FROZEN` (fallback congelado 2026-10-01/B-GOV-PAUSA → 2026-10-02/B-SAN3-01b), como o §C3.1 manda.
- **Achado (A-C1-01 da junta, confirmado):** `pr` ficou `null` com o #402 criado (o contrato diz que `pr` e preenchido apos `gh pr create`; o `status-geral` do proprio bloco mandava "preencher `release.pr` no KPI"). `merge_commit`/`approved_head` `null` e licito na autoria; **pos-merge e divida** que o `docs/registro-402` precisa pagar: `pr=402`, `merge_commit=3e40a256ce801a8e63230b4b764ba1d2803f4f23`, `approved_head=cdf370dcb4c817e1c4292aed1204140951616971` em `kpis-latest.json` e na entrada `B-SAN3-01b` do `kpis-history.json` (+ `kpis-history.md`, + `FROZEN` do `app.js` se o guard exigir).
- Veredito parcial: numeros certos; campos de fechamento em aberto → RESSALVA (viaja no registro pos-merge).

## 5. Ata da junta J-B-SAN3-01b + absorcao do squash — 2026-10-02T22:42Z
- `git show 3e40a256:agent-orchestration/omega/juntas/J-B-SAN3-01b.md` → objeto/`approved_head` `cdf370dcb4c817e1c4292aed1204140951616971`; VEREDITO **APROVADO 3 x 0**; quorum unanimidade de 3 (§C7.1-ter(b), toca permissao); inspetor 1a passada BLOQUEADO (3.1) → remedio (identidade nova pela fabrica) → 2a passada LIBERADO COM RESSALVA; §C7.4-bis preenchido (quem achou, planejou e desenvolveu sao distintos); divergencias §A2 declaradas.
- `C1-voto.json`/`C2-voto.json`/`C3-voto.json` → `objeto = cdf370dc…` nos tres; votos `A FAVOR`/`APROVADO`/`APROVADO`; mandato_md5 e corpo_md5 batem com a tabela da ata; worktrees proprios (`w-j01bc1/2/3`) removidos com 0 processo.
- `md5sum` EOL-neutro dos corpos em `origin/main`: `guardiao-fail-closed` `5b0f7f5d…`, `jurado-san3-01b-c2-cadeia-de-acesso` `14a07abc…`, `cognicao-visual` `59632cb9…` — **iguais a ata**. Frontmatter `model:` de C1/C3 vazio (nao sao gates); C2 fixa `opus` (declarado). Inspetor em Fable 5.1, corpo `de80b2a9…` nas 2 passadas; nenhuma substituicao em gate.
- `00-inspetor-terreno.md` l.119+ → `# **BLOQUEADO**`; `00-inspetor-terreno-passada2.md` l.308+ → `# **LIBERADO COM RESSALVA**` — bate com a ata.
- `00-quedas.md` → 2 quedas, ambas do inspetor (429 limite de sessao), retomado como a mesma instancia; nenhuma cadeira caiu — bate com a ata.
- `gh api …/commits/1483a6f7…/check-runs` → `total 14, nao_verdes [], pendentes []` (bate com o MEDIDO do mandato).
- **Absorcao do squash (comparacao de arvores, nao de pathspec):** `git diff --name-status cdf370dc 1483a6f7` → 7 arquivos, todos registro (ata + 3 evidencias + 3 votos); `git diff-tree -r 1483a6f7 3e40a256` → **vazio**; `git rev-parse` das duas arvores → `8209ebc4…` = `8209ebc4…`. O merge absorveu o head do PR inteiro.
- `git diff --check 4ab9d232 3e40a256` → ec=2 com **9 linhas, todas em `C2-evidencia.md`** — exatamente a excecao que a ata declara; nenhuma outra.
- Veredito parcial: junta registrada, veredito bate com o que aconteceu, squash integro.

## 6. Pendencias — 2026-10-02T22:43Z
- `git diff 4ab9d232 3e40a256 -- agent-orchestration/controle/pendencias.md` → 4 `ABERTA→FECHADA` com prova e comando (`P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO`, `P-SAN3-01B-PAGINA-NAO-AMARRADA-AO-ESTADO`, `P-SAN3-01B-GUARD-ALCANCE-MENOR-QUE-AS-RAIZES`, `P-SAN3-01B-VIGIA-TEXTUAL-DA-FIACAO`); 3 novas ABERTAS com `prova (N, forma, causa)`, `escopo`, `dono`, `bloqueia: nao`, `teste de encerramento` (`…FIACAO-DO-CREATE-TEXTUAL` → `B-SAN3-10`; `…PAGINA-FIACAO-DE-INTERACAO` → fila pos-gate; `…GUARD-DE-ROTA-COM-ATALHO-DE-PLATAFORMA` → `B-SAN3-06a`).
- Indice (`pendencias-indice.md` diff): ABERTAS 314→313 (-4 +3), FECHADAS 111→115 — consistente.
- **Amostragem de uma FECHADA no codigo da ref:** `P-SAN3-01-NOVA-OS-SEM-GATE-NO-BOTAO` → `git show 3e40a256:frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx | grep -n canCreate` → l.240 `const canCreate = permissions.includes("work_orders:create")`, l.252 `canCreate ? (` (botao do cabecalho), l.338 (CTA do vazio); e `[GB1]`/`[GB2]` verdes 13/13 no item 3. "RESOLVIDA" e verdade.
- **As 6 notas/ajustes da ata ("viram pendencia no registro pos-merge")** — cobertura medida em `pendencias.md` @3e40a256 e @3b8fe166 (identicos):
  1. `A-C1-01` (KPI `pr: null`) → nao e pendencia; e o backfill do item 4. **Em aberto.**
  2. `N-C1-01` (origem de mock decidida por convencao de nome; pre-existente `83a3c68c`) → `grep -c N-C1-01` = 0; nenhum cabecalho `## P-…` cobre a classe. **Sem pendencia nomeada.**
  3. C2 "prova extensional sobre o catalogo de hoje" (dentro do bloco) → `grep -ci extensional` = 0. **Sem pendencia nomeada.**
  4. C2 "conjunto de permissoes apos troca de organizacao" → **coberta** pela classe `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS` (l.9708, dono `B-SAN3-06a`).
  5. C2 "outro Nova OS sem gate em `DashboardPage.tsx`" (dono `B-SAN3-06c`) → as ocorrencias de `DashboardPage`/`B-SAN3-06c` pertencem a `P-SAN3-01-DESPACHOS-ALERTA-DADOS-DEMONSTRATIVOS` (l.9406) e `P-SAN3-01-DASHBOARD-DESPACHOS-ERRO-COMO-VAZIO` (l.9442) — outro tema. **Sem pendencia nomeada.**
  6. `C3-N1` (cabecalho da lista de OS diverge da referencia visual, 2026-08-04 #331/#332) → as 3 ocorrencias de `C3-N1` sao de outras juntas (l.324 ciclo 1 do B-SAN3-01, tela de criar OS; l.6021 J-SAN2-6). **Sem pendencia nomeada.**
- Veredito parcial: o que o bloco abriu/fechou esta certo e provado; **das 6 notas da junta, 5 ainda nao estao no registro (a 1 e o backfill; 2, 3, 5 e 6 sem pendencia nomeada com dono; so a 4 ja tem classe)** → RESSALVA para o `docs/registro-402`.

## 7. Limpeza §C5 — 2026-10-02T22:44Z (arvore principal `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`)
- `git status --porcelain | grep -c "^ D"` → 0 (nenhum rastreado apagado).
- `git branch --merged main` (sem `main`) → vazio.
- `git branch --list fix/web-guarda*` → 0; `git ls-remote --heads origin fix/web-guarda-por-alcance-e-estado-da-pagina` → 0; `git branch -r | grep -c web-guarda` → 0 (remoto apagado e prune feito).
- `git rev-parse main origin/main` → `3e40a256` = `3e40a256` (main local avancada).
- `git worktree list | grep -ciE "j01b|nuv01b|dev01b"` → 0; `ls -d /c/Users/AMP/w-j01bc* /c/Users/AMP/w-nuv01b` → inexistentes (worktrees das cadeiras e do dev removidos). Os outros 14 worktrees listados sao de outros blocos (b04a, b11, gov-descuido, devt4c5, mandato, nuv05/05d/09/11, pvnuv/pvpr/pvreg, reg399, reg402) — residuo alheio, reportado, nao varrido.
- `frontend/dist`, `dist`, `coverage`, `.vite`, `frontend/.vite`, `*.tsbuildinfo` (profundidade 2) → ausentes.
- Base viva: o bloco nao mexeu em banco (diff sem `prisma/`/`src/`); nada a conferir de residuo, e a base nao foi alvo deste parecer.
- `df -h /c` → **19 GB livres** (93% usado) — acima do limiar de ~10 GB; `DEEP_CLEAN=1` nao e obrigatorio agora, mas a margem e curta.
- Veredito parcial: limpeza declarada pelo orquestrador confere na integra.

## 8. O proximo bloco pode comecar? — 2026-10-02T22:50Z
- grep por `bloqueia` seguido de `sim` (palavra inteira, case-insensitive) em `pendencias.md` @3e40a256 → **0** pendencias que BLOQUEIAM qualquer alvo; as 3 que o bloco abriu dizem `bloqueia: nao`; as unicas linhas que citam `#393` (l.9785/9800/9814) dizem "nao bloqueia".
- **PR 401 (B-SAN3-11):** `gh pr view 401` → OPEN, draft, `mergeable=CONFLICTING`, head `91a60b37`; `gh api compare/3e40a256...91a60b37` → `behind_by 1, merge_base 4ab9d232, status diverged`; KPI no head (`contents/Kpis/kpis-latest.json?ref=91a60b37`) → `blocks_completed 170` (**colide** com o 170 que o #402 acabou de publicar), `frontend_smoke_tests 1218/1218` (medido sobre a base 1202, antes dos +12 deste merge), `pr 401`; check-runs 14/14 verdes (no head antigo). A unica pendencia com dono `B-SAN3-11` e `P-CHK-DOSSIE-VERSAO-NA-UI` (l.2244, ABERTA, e a que o bloco fecha). **Nada bloqueia o #401; ele precisa integrar `3e40a256`, resolver os conflitos de registro e recontar o KPI (`blocks_completed` 171, smoke reexecutado sobre 1214) antes do inspetor novo** — como o mandato previa.
- **Ciclo 4 do PR 393 (B-GOV-MANDATO):** `gh pr view 393` → OPEN, draft, head `95a8d071`, check-runs 14/14 verdes; `git merge-base 95a8d071 origin/main` → `4ab9d232` (1 atras); `comm -12` dos arquivos → 8 arquivos de registro em comum com o #402 (`Kpis/*` x4, `pendencias.md`, `pendencias-indice.md`, `status-geral.md`, `log-execucao.md`) — conflito de apensamento esperado na integracao; KPI no head → `blocks_completed 170` (colide), `smoke 1202/1202` carregado (defasado). Condicoes §8.6 (1–7) do `R-B-GOV-MANDATO-ciclo3-auditoria.md` @95a8d071 sao internas ao ciclo 4 (mandatos-artefato, plano, corpos, pre-voo, D-M4, inelegibilidades) — **nenhuma depende do #402**; nenhuma pendencia da `main` bloqueia a junta 4.
- Veredito parcial: nenhum start NEGADO; os dois alvos carregam a mesma obrigacao de integrar esta `main` e recontar o KPI.

## 9. Encerramento do terreno — 2026-10-02T22:53Z
- Terreno medido por: `git worktree add --detach C:/Users/AMP/w-port402 origin/main` (3589 arquivos, porcelain 0) · `npm ci` raiz e frontend proprios (ec=0; `fsutil reparsepoint query node_modules` → "nao e um ponto de nova analise" = sem junction) · `MSYS_NO_PATHCONV=1` so inline por comando (nunca `export`) · `timeout` em toda execucao · nenhum `tail -f` · base viva 5432/6379 nunca alvo (suite backend declarada nao executada no item 3) · nada escrito no repositorio (`git status --porcelain` da arvore principal: 0 ` D`; nenhum commit).
- Processos vivos antes da remocao, medido por `Get-CimInstance Win32_Process | Where CommandLine -like '*w-port402*'` → 5, **todos a propria cadeia de medicao** (bash.exe x2, timeout.exe x2, powershell.exe — o literal esta na linha de comando deles); 0 `node`/`npm`/`git` usando o worktree.
- `git worktree remove --force /c/Users/AMP/w-port402` → ec=0; `git worktree list | grep -c w-port402` → 0; `ls -d /c/Users/AMP/w-port402` → inexistente; `git worktree prune` ec=0.
- Residuo alheio reportado, nao varrido (item 7): 14 worktrees de outros blocos; 50 arquivos `??` em `.claude/agents/especialistas/` + espelho na arvore principal (corpos de jurado de outras juntas nao versionados — fora deste mandato).
- Veredito parcial: terreno encerrado como o mandato pede.

## VEREDITO — 2026-10-02T22:54Z

**O que confere (itens 1–8):** merge `3e40a256` integro e no topo da `origin/main` (squash de `1483a6f7`, arvore identica `8209ebc4`); toda promessa do corpo do PR e do plano (E1–E7) existe no diff, e nenhum comentario novo afirma o que o codigo nao faz; smoke **1214/1214** (TAP, Node 20.19.5), bloco **13/13 + 66/66**, KPI guards **29/29**, `tsc` ec=0 — reexecutados por mim e iguais ao declarado; ata `J-B-SAN3-01b` com objeto `cdf370dc` = `approved_head` = o que as 3 cadeiras votaram, APROVADO 3 x 0 em unanimidade, inspetor BLOQUEADO → LIBERADO COM RESSALVA, quedas registradas, md5 dos corpos iguais; 4 pendencias FECHADAS com prova (1 amostrada no blob) e 3 ABERTAS com dono; limpeza §C5 integral; 0 pendencia que BLOQUEIE o #401 ou a junta 4 do #393.

**O que NAO confere e viaja como divida (nao impede o start):**
1. **§C3.5 em aberto** — `pr`, `merge_commit`, `approved_head` seguem `null` em `Kpis/kpis-latest.json` e na entrada `B-SAN3-01b` do `kpis-history.json` na `main` **e** no head atual do `docs/registro-402` (`3b8fe166`). `pr: null` com o PR ja criado e o A-C1-01 da propria junta. Backfill devido: `pr=402`, `merge_commit=3e40a256ce801a8e63230b4b764ba1d2803f4f23`, `approved_head=cdf370dcb4c817e1c4292aed1204140951616971` (+ `kpis-history.md`, + `FROZEN` do `app.js` se o guard exigir).
2. **4 notas da junta sem pendencia nomeada com dono** (a ata diz "viram pendencia no registro pos-merge"; `pendencias.md` @main e @3b8fe166 nao as tem): `N-C1-01` (mock por convencao de nome, pre-existente `83a3c68c`), C2 "prova extensional sobre o catalogo de hoje" (dentro do bloco), C2 "Nova OS sem gate em `DashboardPage.tsx`" (dono `B-SAN3-06c`), `C3-N1` (cabecalho da lista de OS x referencia, pre-existente #331/#332). A 4a nota da C2 ja tem classe (`P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`).
3. **Trilha do #402** — `status-geral.md` e `log-execucao.md` na `main` ainda dizem "aguarda inspetor/junta/PR"; o registro pos-merge fecha a trilha (PR, merge, junta, porteiro), como o #398/#399 fizeram para o #397.
4. **Obrigacao dos dois alvos** (medida, nao divida deste bloco): #401 e #393 tem merge-base `4ab9d232` (1 atras), publicam `blocks_completed 170` (ocupado pelo #402) e carregam smoke pre-#402 — cada um integra `3e40a256`, resolve os 8 arquivos de registro em conflito e reconta o KPI antes do seu inspetor.

LIBERADO COM RESSALVA: PR #401 (B-SAN3-11) e ciclo 4 do PR #393 (B-GOV-MANDATO), cada um so depois de integrar 3e40a256 e recontar o KPI | no docs/registro-402, antes do inspetor novo de qualquer um deles: (1) backfill §C3.5 pr=402 · merge_commit=3e40a256ce801a8e63230b4b764ba1d2803f4f23 · approved_head=cdf370dcb4c817e1c4292aed1204140951616971 em kpis-latest.json e na entrada B-SAN3-01b do kpis-history.json (+ history.md, + FROZEN do app.js se o guard exigir); (2) 4 pendencias nomeadas com dono para N-C1-01, "prova extensional" (C2), "Nova OS sem gate no DashboardPage.tsx" (B-SAN3-06c) e C3-N1; (3) trilha do #402 em status-geral/log-execucao; e os dois alvos publicam blocks_completed 171/172 na ordem de merge com smoke reexecutado sobre 1214.
