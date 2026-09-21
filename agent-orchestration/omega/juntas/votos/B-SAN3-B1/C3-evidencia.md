# C3 — evidencia (validador-mestre) — junta B-SAN3-B1 (PR #391, objeto 3a0ea095)

- Cadeira: C3 · Identidade: `validador-mestre` · Modelo: Opus 5 (`claude-opus-5[1m]`)
- Foco: diff x plano, escopo, KPI §C3.5, §C7.1-bis espelhado (CLAUDE.md + AGENTS.md + 2 corpos do inspetor), registro
- Terreno proprio: worktree detached `C:/c/Users/AMP/w-j-sanb1-c3` @ `3a0ea095` (o `git worktree add` sob
  `MSYS_NO_PATHCONV=1` resolveu `/c/Users/...` como `C:/c/Users/...`; caminho curto, meu, removido ao fim).
  `git status --porcelain` = vazio na criacao. Sem junction. Nenhum conteiner subido.
- P1/P2: esqueleto escrito antes das medicoes; cada medicao apensada abaixo.
- **STATUS: EM MEDICAO** (M1..M9 fechadas)

## Esqueleto de medicoes (preenchido por execucao)
| # | Medicao | Estado |
|---|---|---|
| M1 | Diff x escopo permitido/proibido (14 arquivos) | **VERDE** |
| M2 | `ci.yml` — so as 4 areas permitidas; sem job e2e; outros workflows intocados | **VERDE** |
| M3 | §C7.1-bis byte-identico em `CLAUDE.md` e `AGENTS.md` | **VERDE (md5)** |
| M4 | Item 4.3 identico nos 2 corpos do inspetor + `sync-agent-agents --check` | **VERDE** |
| M5 | KPI §C3.5: `merge_commit`/`approved_head` null, `pr`, `status`, notas de carregamento | **VERDE** |
| M6 | `blocks_completed` 165->166 e o risco de recontagem (#392) | **VERDE hoje, condicao declarada** |
| M7 | Registro: pendencia + indice regerado pelo gerador | **VERDE** |
| M8 | C2-01 re-medido: a prova do `concurrency` citada pelo dev prova? | **NAO PROVA — achado** |
| M9 | C2-03 re-medido: censo de ramos `chore/` (relatorio diz 9) | **11 hoje — nota** |
| M10 | A7: `npm test` so no CI basta? | pendente |
| M11 | Corpo aplicado (R1) + baseline proprio | pendente |
| M12 | Guards de KPI e freeze no head julgado | pendente |

---
## M1 — Diff x escopo (VERDE)

Comando: `git diff --name-status <merge-base> 3a0ea095`, com `merge-base == origin/main == aadaa6d5`
(confirmado por `git merge-base`). Saida: os **14 arquivos** listados pelo inspetor, N=14 conferido por
`--name-only | wc -l`. **Cada um dos 14 esta no escopo PERMITIDO do comando do bloco.**

Escopo PROIBIDO re-medido por pathspec explicito — `src frontend mobile tests prisma migrations infra`
+ `package-lock.json` + `frontend/package-lock.json` + `.env` + `deploy-production.yml` +
`deploy-staging.yml` + `backup-database.yml` + `uptime-check.yml` + `pubspec.yaml` + `pubspec.lock`:
**saida VAZIA**. 3 commits na ramificacao: `e0dd6af4`, `16d39b41`, `3a0ea095`.

## M2 — ci.yml (VERDE)

4 hunks, e **so** as 4 areas permitidas: (a) `on.push.branches` mais 4 globs e `workflow_dispatch`;
(b) `concurrency` novo; (c) `flutter-version: 3.47.5` no job `flutter`; (d) os **dois** portoes do GHCR.
**Nenhum job e2e** criado. Nenhum outro workflow tocado (M1).

Equivalencia no caminho da `main`, conferida por leitura do texto antigo x novo: num push para `main` as
duas condicoes valem `true` nos dois textos; num `pull_request` as duas valem `false`, porque o ref e
`refs/pull/N/merge`. **O caminho de publicacao da `main` nao muda de comportamento** — a mudanca so retira
a publicacao dos pushes de ramo, que e o que o bloco existe para fazer.

## M3 — §C7.1-bis espelhado (VERDE, provado por md5)

    linhas ADICIONADAS   CLAUDE.md=10   AGENTS.md=10
    md5(add, EOL-neutro) CLAUDE = 631e97f5e59128a18e3157d52990e706
    md5(add, EOL-neutro) AGENTS = 631e97f5e59128a18e3157d52990e706   -> IDENTICAS
    paragrafo §C7.1-bis INTEIRO no head julgado: 19 linhas nos dois,
      md5 = 6fd3f8d920f13a228b20f92d7522f2b4 nos dois
    numstat: 10/4 em CLAUDE.md e 10/4 em AGENTS.md (1 hunk cada — so o §C7.1-bis)

**D-INTEROP-CLAUDE-CODEX cumprida:** alterou um, alterou o outro no mesmo trabalho, texto identico, e
nenhum dos dois arquivos foi tocado fora do §C7.1-bis.

## M4 — Os dois corpos do inspetor (VERDE)

    numstat: 12/0 em .claude/agents/inspetor-...md  e  12/0 em .agents/agents/inspetor-...md
    linhas adicionadas identicas nos dois (diff vazio); linhas REMOVIDAS = 0 (superset estrito)
    node scripts/sync-agent-agents.mjs --check  ->  [agents-sync] OK — 25 agentes   EXIT=0

Rodado **dentro do meu worktree do head julgado**. Na raiz da sessao o mesmo comando e vermelho por
especialistas de OUTROS blocos (R4 do inspetor) — nao e deste bloco, e nao varri nada.

## M5 — KPI §C3.5 (VERDE)

`Kpis/kpis-latest.json` no head julgado: `pr=391`, `merge_commit=None`, `approved_head=None`,
`status=published_per_pr`, `version=B-SAN3-B1`, `snapshot_date=2026-09-21`. **Exatamente a forma da
autoria** que o §C3.5 exige: null na autoria, backfill pos-merge.

**Backfill do #390 pago e conferido NA FONTE, nao herdado do relatorio:**

    gh pr view 390 --json state,mergeCommit
      state=MERGED   merge=aadaa6d51be950e152ca6a6f15327bc9989039de    <- bate com o backfill escrito
    git show 3a0ea095:agent-orchestration/omega/juntas/J-B-SAN3-04a.md | grep Objeto
      "**Objeto:** `fbda96b0` (PR #390); head na junta = o objeto"     <- bate com approved_head fbda96b0

`Kpis/kpis-history.json` +16/-3: uma entrada NOVA apensada (nao reescrita) mais o backfill do #390.

**As 10 metricas comparadas por script, base x julgado.** So `blocks_completed` se move (165 -> 166).
backend_tests 3052 · frontend_smoke_tests 1202 · flutter_tests 864 · backend_contract_tests_focused 34 ·
flutter_modules 17 · mobile_backend_contracts 18 · mobile_core_saas_contracts 21 — **todas CARREGADAS,
cada uma com nota datada e nomeada pelo bloco** (§C3.3). mvp_demo 99 e mvp_vendavel 88 **INTOCADOS** com
nota §C3.4. **Nenhum numero fabricado, nenhuma reexecucao inventada.**

## M6 — blocks_completed e a recontagem (VERDE hoje, com condicao declarada)

    gh pr view 392 --json state,mergedAt   ->  state=OPEN   mergedAt=null
    gh pr view 391 --json state,mergeable  ->  state=OPEN   mergeable=MERGEABLE

165 -> 166 esta **correto neste instante**: o #390 publicou 165 na `main@aadaa6d5`, e o #392 ainda nao
mergeou. A nota da metrica **nomeia o risco por escrito** — o B-SAN3-00 tambem soma um degrau e, se
mergear antes, a recontagem e deste bloco no pre-merge. Condicao declarada com dono. Nao e defeito; e
obrigacao pre-merge, e eu a carrego como **condicao do meu voto**.

## M7 — Registro: pendencia e indice (VERDE; indice provado pelo GERADOR)

A pendencia nova `P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO` traz **N, forma e causa** (§C7.1-ter(a)),
escopo `pre-existente` **com evidencia de data/origem**, **dono nomeado** (`B-SAN3-A2`), `bloqueia: nao`,
teste de encerramento **com vermelho-controle**, e separa o que o bloco fechou do que nao fechou.

**O indice nao foi digitado — e saida do gerador, provado por re-execucao propria:**

    cp pendencias-indice.md /tmp/indice-committed.md
    python agent-orchestration/controle/gerar-indice-pendencias.py      # da RAIZ do repo
      indice: 411 cabecalhos / 400 IDs | FECHADA 110, ABERTA 301 | baldes A 132, B 100, C 69
    diff EOL-neutro committed x regerado  ->  IDENTICO
      md5 committed = md5 regerado = f5d030e4fe77ff935fb3c7a3b378dc5b

O `diff` cru dava `1,499c1,499` — **a armadilha de CRLF do §0 do briefing**: o gerador escreve LF e o
arquivo rastreado esta em CRLF. Comparei EOL-neutro, como manda a licao de 2026-08-26. Minha propria
varredura (`grep -c` de cabecalhos = 411) bate, mas quem decide o numero e o **laco do gerador**, nao a
minha varredura. Depois de rodar o gerador **restaurei o meu worktree** (`git checkout --` do arquivo,
so no meu): `git status --porcelain` = 0 linhas e head continua `3a0ea095`.

## M8 — C2-01 RE-MEDIDO: a prova citada pelo dev e FALSA (e nao contaminou nada rastreado)

    gh api .../commits/16d39b41/check-runs          (head intermediario)
      backend  completed cancelled   |  backend  completed cancelled
      docker   completed cancelled   |  docker   completed cancelled
      authority-portal, backend-postgres, flutter, frontend, owner-portal = success x2
    gh api .../commits/e0dd6af4/check-runs
      backend cancelled + backend success | docker cancelled + docker success | resto success
    gh api .../commits/3a0ea095/check-runs
      total_count 14, TODOS completed/success   (re-medido por mim, nao herdado)

O `DEV-B-SAN3-B1.md` §5.c afirma, como prova de desenho: *"nao cruza eventos — o run `pull_request` do
mesmo head seguiu vivo"*. **A execucao desmente:** em `16d39b41` os **dois** `backend` e os **dois**
`docker` sairam `cancelled`. A causa e que um push tambem atualiza `refs/pull/391/merge`, disparando um
`pull_request` novo que cancela o anterior **dentro do proprio grupo**. Logo o **desenho** (grupo por
workflow+evento+ref) continua correto e esta provado pelo head final — mas **a frase citada como prova
nao prova**, e a leitura "o run de PR sobrevive ao push seguinte" e falsa.

**Onde a frase parou** — medido arquivo a arquivo com `grep -niE "cruza|seguiu vivo|35654817500"`:

| Artefato | Carrega a afirmacao falsa? |
|---|---|
| `DEV-B-SAN3-B1.md` §5.c (scratchpad, **nao rastreado**) | **SIM** |
| corpo do PR #391 (5 541 bytes, lido inteiro) | **nao** — so o racional de desenho |
| comentario do `concurrency` no `ci.yml` (rastreado) | **nao** |
| `Kpis/kpis-latest.json` (summary) e `kpis-history.json` | **nao** |
| `log-execucao.md` l.4516 e `status-geral.md` l.4629 | **nao** — mesmo racional de desenho |
| comando do bloco | **nao** (grep vazio) |

**Conclusao:** nada que mergeia carrega a afirmacao falsa. E o item 4.3 que o bloco inaugura — *"cancelled
conta como ausente ate concluir"* — sai **reforcado**, nao contrariado, pelo que eu medi: um head que nao e
o ultimo push da ramificacao perde os check-runs **nos dois** eventos, nao so no push.

## M9 — C2-03 RE-MEDIDO: o censo de ramos

    git fetch origin --prune ; git branch -r --list origin/<p>/* | wc -l     (agora, 2026-09-21)
      feature/ 78 (ultimo 2026-06-19)   feat/ 26 (2026-07-05)   fix/ 12 (2026-09-20)
      chore/   11 (ultimo 2026-09-21)   docs/  3 (2026-08-29)   codex/ 4 (2026-05-26)
      test/     1 (2026-06-10)          demo/  1 (2026-08-29)   TOTAL remotos 138

**9 das 10 linhas do censo do dev batem exatamente**, numero e data do ultimo commit. So `chore/` diverge:
relatorio e comando dizem **9**, eu meco **11**. Listei os 11 nomes — os dois excedentes sao
`chore/ci-ve-o-sha-julgado` (o ramo **deste bloco**, empurrado DEPOIS do censo) e
`chore/corpos-de-jurado-rastreados` (o #392, nascido em paralelo). **O censo estava certo quando foi
medido**, a conclusao (os 4 globs cobrem todo ramo vivo de bloco) nao se altera, e o comentario
**rastreado** no `ci.yml` nao publica o numero 9 — cita so 78/4/1 dos namespaces mortos, os tres
reconfirmados por mim.

## M10 — A7: `npm test` so no CI BASTA? **Sim — e eu medi o run, nao aceitei a palavra**

Concordo com a C2, **por medicao propria** (baixei o log do job e contei):

    gh run list --commit 3a0ea095...  ->  35655315031 push success · 35655321306 pull_request success
    jobs do run push: flutter, backend, frontend, authority-portal, backend-postgres, owner-portal, docker
                      = 7/7 success
    job backend, passos: 6 Agents mirror guard success · 10 TypeScript check success
                         11 Tests success · 12 Build success
    log do job backend (2 592 129 bytes), sumario do node:test:
      # tests 3054   # pass 3052   # fail 0   # cancelled 0   # skipped 2
    "not ok" em todo o log: 0

**Quatro razoes, nesta ordem:**
1. O escopo e **provadamente sem codigo** (M1): zero arquivo em `src/`, `tests/`, `frontend/`, `mobile/`,
   `prisma/`, por pathspec explicito. Nao ha o que a suite local exercitaria que o CI nao exercitou.
2. A suite rodou **no SHA julgado**, com Postgres e Redis **reais** como service containers — ambiente que
   a maquina local nao reproduz de graca. O objeto da junta e o SHA, nao a arvore do dev.
3. O numero **3052/3054** que o KPI carrega e **exatamente** o que o CI mediu neste head. Ou seja: o valor
   "carregado" esta **corroborado por execucao no proprio objeto**, nao apenas herdado.
4. Aceitar o CI aqui e **coerente com a norma que este bloco inaugura** (item 4.3: o objeto da junta e um
   SHA que maquina executou). Seria incoerente exigir do bloco a prova local do que ele acabou de tornar
   verificavel na maquina.

**Com uma condicao, que virou achado (C3-02):** isso precisa estar **escrito em arquivo rastreado**. Hoje
nao esta.

## M11 — Corpo aplicado (R1) e baseline proprio

    md5 EOL-neutro de .claude/agents/validador-mestre.md
      head julgado 3a0ea095 : 804d89f01d920ed72c23e5e24c062501
      raiz da sessao        : 804d89f01d920ed72c23e5e24c062501
      worktree san300 (cwd) : 804d89f01d920ed72c23e5e24c062501
      meu worktree          : 804d89f01d920ed72c23e5e24c062501

**O corpo que eu apliquei E o corpo do head julgado** — identicos nos quatro lugares. A R1 do inspetor
**nao alcanca esta cadeira**: a divergencia era so no corpo dele. Declarado como o briefing exige.

## M12 — Guards de KPI e freeze (VERDE, com prova de maquina no proprio objeto)

Zero-dep, no meu worktree do head julgado:

    node --check Kpis/app.js        EXIT=0
    node scripts/kpi-freeze.mjs --check   EXIT=0   "kpi-freeze: em dia (snapshot 2026-09-21)"
    Kpis/app.js: 1/1 — so a linha `var FROZEN = {...}` regerada (a copia congelada, fallback de file://)

**Os 3 guards do §C3.1 rodaram e passaram NO SHA JULGADO.** Primeiro grep meu deu 0 e estava errado: eu
procurei o **nome do arquivo**, e o TAP imprime o **nome do teste** (a armadilha da "ferramenta que responde
QUASE a pergunta"). Refeito por sonda de nome, um por arquivo:

| Guard | casos no arquivo | no log do CI do head julgado |
|---|---|---|
| `tests/kpi-dashboard-charts.test.ts` | 17 `test(` | `ok N -` = 1, `not ok` = 0 |
| `tests/kpi-achados-paridade.test.ts` | 6 `test(` | `ok N -` = 1, `not ok` = 0 |
| `tests/kpi-dashboard-contraste.test.ts` | 5 `test(` no topo | `ok N -` = 1, `not ok` = 0 |

(ex.: `ok 1490 - painel: a SÉRIE desenhada é a do kpis-history.json, ponto a ponto`; `ok 1498 - painel: a
cópia congelada é IDÊNTICA ao kpis-latest.json`.) **`# fail 0` na suite inteira.**

## M13 — Os dois numeros que o briefing mandou RE-MEDIR (confirmados por mim)

    gh api .../commits/3a0ea095/check-runs --jq .total_count   ->  14
      14 completed / 14 success / 0 queued / 0 in_progress / 0 cancelled   (7 jobs x 2 eventos)
    job docker do run 35655315031 (push, head julgado), passos:
      5  skipped   Log in to GHCR                                    <- o portao FECHOU
      6  success   Build backend image (push to GHCR only on main)
      9  success   Container smoke — write → restart → read (persistência + worker)

**Batem com o que o briefing publica.** O login **nao executou**: nao houve credencial no runner para
publicar, e ainda assim a imagem foi construida e o smoke de conteiner passou.

## M14 — Diff x PLANO-MESTRE (o alvo do meu mandato)

Plano-mestre l.264:

    | `B-SAN3-B1` | `chore/ci-ve-o-sha-julgado` | **portão do GHCR por ramo**, `push`+`dispatch`,
      `concurrency`, `flutter-version`, §C7.1-bis | segurança/pipeline → **unanimidade 3** +
      `agente-secops` | **sim** |

**Os 5 itens de escopo do plano estao no diff, e o diff nao tem um sexto.** O plano (l.85) tambem manda os
dois no **mesmo PR** ("B1 (obrigatório, mesmo PR): fechar o portão do GHCR por RAMO") — cumprido.

**Os 4 workflows proibidos estao BYTE-IDENTICOS a base** (md5 do blob, base x julgado):
`deploy-production.yml` `0ebf705d…` · `deploy-staging.yml` `1f7aa7ff…` · `backup-database.yml` `c0f72337…`
· `uptime-check.yml` `0ebff5c9…`. Nenhum job `e2e`. Protecao de ramo nao tocada.

**O alcance corrigido (A2) conferido na ref, nao herdado:** o `deploy-production.yml` tem mesmo, na trava
(c), `docker manifest inspect "ghcr.io/${OWNER}/erp-backend:${SHA}"` com a mensagem *"Garanta que o SHA foi
mergeado na main e publicado no GHCR"* — a premissa que publicar por ramo esvaziaria. **A3** conferida:
`deploy-staging.yml` dispara so em `push`/`branches: [main]`. **A4** conferida: `erp-backend:latest` ocorre
**0** vez em `deploy-production.yml`, `deploy-staging.yml`, `backup-database.yml` e `uptime-check.yml`, e
**1** vez no `ci.yml` (escrita, na lista de tags). A tese da inseparabilidade **se sustenta como corrigida**.

## M15 — ACHADO PROPRIO: o `concurrency` novo tambem vale para `push` na `main`

O bloco `concurrency:` esta na **coluna 0**, antes de `jobs:` (l.26-28 do `ci.yml` julgado) — logo e de
**workflow**, e alcanca **todo** evento, inclusive `push` em `refs/heads/main`:

    concurrency:
      group: ci-${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
      cancel-in-progress: true

**Consequencia nova, que o bloco introduz e que ninguem mediu:** antes deste PR **nao havia `concurrency`**;
dois merges na `main` dentro da janela de execucao rodavam ate o fim e **cada um publicava a sua imagem**.
Agora o segundo merge **cancela o run do primeiro** (mesmo grupo: workflow + `push` + `refs/heads/main`), e
com ele o job `docker` — de modo que `erp-backend:<sha1>` **pode nunca ser publicado**. Isso conversa com a
trava (c) do `deploy-production.yml`, que exige que a imagem **do SHA promovido exista**: um SHA mergeado e
cancelado ficaria **impromovivel** ate alguem reexecutar.

**Por que e `nota` e nao `bloqueia`:** (a) o remedio entra **neste mesmo PR** — o `workflow_dispatch` novo
permite reexecutar o CI no SHA e publicar; (b) merges na `main` desta casa sao serializados pelo processo de
junta, e a janela exige dois merges em minutos; (c) o estado anterior era pior (todo push de ramo publicava).
Registro para a ata e para o porteiro **porque e efeito do bloco e ninguem o mediu** — nao para reprovar.

---
# VEREDITO C3: **APROVADO** — 0 bloqueia · 2 ajustes · 5 notas

| id | gravidade | escopo | titulo |
|---|---|---|---|
| C3-01 | **ajuste** | dentro-do-bloco | comando rastreado e corpo do PR declaram quorum MENOR que o plano-mestre (omitem "seguranca" dos 4 gatilhos do §C7.1-ter(b); plano l.264 diz "unanimidade 3") |
| C3-02 | **ajuste** | dentro-do-bloco | a divergencia do `npm test` nao esta em arquivo rastreado — vive so no relatorio do scratchpad |
| C3-03 | nota | dentro-do-bloco | a prova do `concurrency` no §5.c do relatorio e falsa (C2-01 confirmado e estendido); nada rastreado a carrega |
| C3-04 | nota | dentro-do-bloco | a nota §C3.3 enumera "APENAS" 10 dos 14 arquivos do diff (conclusao substantiva continua verdadeira) |
| C3-05 | nota | dentro-do-bloco | censo de `chore/`: 9 no registro, 11 hoje — os 2 excedentes nasceram durante o bloco |
| C3-06 | nota | dentro-do-bloco | **achado meu:** o `concurrency` e de workflow e tambem cancela run de `push` na `main` — um SHA mergeado pode ficar sem imagem no GHCR (remedio no proprio PR: `workflow_dispatch`) |
| C3-07 | nota | dentro-do-bloco | o relatorio chama `16d39b41` de "head final"; o head julgado e `3a0ea095` (3 commits, nao 2) |

**Nenhum `pre-existente` invocado** — nao precisei da valvula do §C7.1-ter(a): tudo que achei nasceu neste
bloco, e digo isso explicitamente para que a ata nao registre escopo sem evidencia.

**Por que APROVADO e nao REPROVADO.** A materia central do meu mandato saiu limpa por medicao propria: os
14 arquivos do diff sao os 5 itens do plano-mestre l.264 e nada mais; o escopo proibido e vazio por pathspec
e os 4 workflows de deploy sao **byte-identicos** a base; o §C7.1-bis e **byte-identico** nos dois espelhos
(md5) e os dois corpos do inspetor tambem, com **zero** linha removida; o KPI esta na forma exata da autoria
(§C3.5), com **uma** metrica movida, `mvp_*` intocados, backfill do #390 conferido **na fonte** e indice de
pendencias provado como **saida do gerador**. Os dois ajustes sao de **registro**, de uma linha cada, e
nenhum deles altera comportamento, numero ou escopo.

**Por que os dois ajustes nao sao `bloqueia`.** O C3-01 nao causou dano nesta junta — o orquestrador
convocou o quorum **mais estrito**, que e o certo —, e o C3-02 tem a substancia provada por mim no proprio
objeto (suite 3052/3054, fail 0). Os dois ferem o **registro durável**, nao a entrega. Reprovar aqui seria
gastar um ciclo de teto para corrigir duas frases, num bloco cuja materia tecnica esta integralmente provada
— e o §C7.1-ter(a) existe justamente para calibrar isso.

## Limpeza (§C5)

- Removi **o meu** worktree `C:/c/Users/AMP/w-j-sanb1-c3` por `git worktree remove --force`, **pelo nome
  deste bloco** — nunca por varredura.
- **Nao toquei** nos worktrees alheios (`sanb1`, `san300`, `b04a`, `b11`, `gov-*`, `w-s1`), na arvore
  principal, nem na mutacao viva de outra sessao (R4) e na sonda S2 (R5): **residuo alheio se reporta**.
- Nenhum conteiner criado; a base viva nao recebeu um comando. Nenhum `prune`, `clean`, `stash`, `reset`.
- Unica escrita que fiz em arvore rastreada foi rodar o gerador de indice **no meu worktree**, e a **desfiz
  pela edicao inversa** (`git checkout --` do arquivo, so no meu): `git status --porcelain` = vazio e head
  `3a0ea095` antes de remover.
- Logs brutos (log do job backend, corpo do PR, diffs) ficaram em `/c/Users/AMP/AppData/Local/Temp/c3-tmp/`,
  **fora da pasta de votos**, como o briefing manda.

— `validador-mestre` · cadeira C3 · Opus 5 · 2026-09-21

## Anomalia de terreno que eu mesmo produzi — registrada, sem efeito no merito

Sob `MSYS_NO_PATHCONV=1` (que o briefing manda usar para `git show`), o `git worktree add /c/Users/...`
**nao** foi convertido pelo bash e o git resolveu o caminho na raiz da unidade corrente: o meu worktree
nasceu em **`C:/c/Users/AMP/w-j-sanb1-c3`**, nao em `C:/Users/AMP/w-j-sanb1-c3`. Usei-o assim (caminho
curto, meu, isolado) e o removi pelo nome; depois removi a cadeia de diretorios vazios `C:/c` que sobrou
(`find C:/c -type f` = **0 arquivos** antes de remover).

**Susto correlato, que registro para ninguem repetir:** `git -C /c/Users/.../sanb1 status` devolveu
`fatal: cannot change to ... No such file or directory` — **pelo mesmo motivo de conversao de caminho**, e
nao porque o worktree do dev tivesse sumido. Refeito com caminho Windows: **`sanb1` intacto**, head
`3a0ea095`, `git status --porcelain` = **0**, 41 entradas na raiz, `node_modules` presente. Nao toquei nele.

> Nota do orquestrador ao versionar: removida apenas a linha em branco final (`diff --check`).
