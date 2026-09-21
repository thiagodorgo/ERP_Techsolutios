# PARECER DO PORTEIRO POS-MERGE — PR #391 (B-SAN3-B1)

**NOTA DE SUBSTITUICAO DE MODELO:** este papel fixa `model: fable` no frontmatter; a cota do Fable
esgotou em 2026-09-21 e derrubou tres agentes. Por decisao do dono (2026-09-21) e pela excecao
prevista no proprio corpo do papel (`D-FALLBACK-MODELO-FABLE-OPUS`), o parecer rodou em
**Opus 5 (claude-opus-5[1m])**. Opus e o unico substituto admitido; abaixo dele haveria parada.

- **Papel:** `porteiro-pos-merge`
- **Modelo que rodou:** Opus 5 — substituicao declarada, Fable indisponivel por cota
- **Corpo aplicado:** o de `b8cd22df:.claude/agents/porteiro-pos-merge.md` (a ref mergeada)

---

## 0. Terreno

- Worktree **detached meu**: `C:/Users/AMP/w-port391` em `b8cd22df` (caminho curto, criado com
  `MSYS_NO_PATHCONV=1 git worktree add --detach`). **Conferi o caminho que saiu**: veio
  `C:/Users/AMP/w-port391`, **sem** o prefixo `C:/c/...` que mordeu outra cadeira desta rodada.
- `git worktree list`: alem do meu existem `b04a`, `b11`, `gov-descuido`, `gov-elenco`, `san300`
  (bloco irmao vivo, #392) e as duas cadeiras `w-j-san300-c1` / `w-j-san300-c3`. **Residuo alheio se
  reporta, nao se varre** — nada deles foi tocado por mim.
- **Base viva: zero comando de banco meu.** Nenhum conteiner subido por mim.

**Corpo contratual aplicado — e uma divergencia que registro.** Li o corpo a partir da ref e segui
ESSE corpo. Ele **diverge do que a sessao carregou**: o corpo da ref abre com o bloco
`D-FALLBACK-MODELO-FABLE-OPUS` (dono, 2026-09-07/08) — "Fable esgotado? Rode em Opus — e DECLARE.
Opus esgotado? PARE" — que **nao esta** no corpo injetado no meu prompt de sessao. O arquivo
`porteiro-pos-merge.md` **nao** aparece no diff do #391, entao a divergencia **e anterior** a este
PR (fenomeno ja catalogado: corpo de sessao congelado / `M` fantasma por stat-cache sob autocrlf).
Consequencia pratica: a substituicao de modelo declarada acima e exatamente o que o corpo da ref
manda fazer. Foi por isso que o mandato exigiu carregar o corpo da ref — e a exigencia se provou.

---

## 1. O merge existe e esta integro

    $ git log origin/main -3 --format=%H %s
    b8cd22dfd4185f6e71f937ad4ae155646177c78e chore(ci): o CI passa a existir no SHA que a junta julga... (B-SAN3-B1)
    aadaa6d51be950e152ca6a6f15327bc9989039de fix(rbac): ... (B-SAN3-04a)
    83a3c68ce50129d96d0357b3e7ab6ff725b9659d fix(web): ... (B-SAN3-01)

    $ gh pr view 391 --json state,mergeCommit,headRefOid,mergedAt
    state=MERGED   mergeCommit=b8cd22dfd4185f6e71f937ad4ae155646177c78e
    headRefOid=09dc4345951a35cb88daa4457226f64192dba87c   mergedAt=2026-09-21T22:34:50Z

**Confere.** O merge commit e o HEAD de `origin/main`; o head aprovado bate com o do mandato. Base
do squash = `aadaa6d5` (#390). **INTEGRO** — ha o que validar.

---

## 2. Promessa x entregue

`git show --stat b8cd22df` -> **22 arquivos, +2545 / -40**. Confronto item a item com o corpo do PR:

| promessa do corpo | onde esta | confere? |
|---|---|---|
| gatilho `push` em `fix/**` `feat/**` `chore/**` `docs/**` | `.github/workflows/ci.yml:10-17` | SIM |
| `workflow_dispatch` | `ci.yml:18` | SIM |
| `concurrency` por (workflow, evento, ref) | `ci.yml:26-28` | SIM |
| **os dois** portoes do GHCR por ramo | `ci.yml:415` e `ci.yml:426` | SIM |
| `flutter-version: 3.47.5` | `ci.yml:368` | SIM |
| C7.1-bis nos dois contratos | `CLAUDE.md` + `AGENTS.md` | SIM (secao 5, por hash) |
| item 4.3 nos dois corpos do inspetor | `.claude/...` + `.agents/...` | SIM (secao 5, por hash) |

**Nenhum outro if mudou de sentido em silencio.** O `ci.yml` tem **um unico** `if:` em toda a base
e em todo o head:

    BASE aadaa6d5 -> 389:        if: github.event_name == push
    HEAD b8cd22df -> 415:        if: github.ref == refs/heads/main

Varri tambem toda expressao condicional (`github.event_name`, `github.ref`, `push:`): na base eram
um `push:` condicional por evento (l.400) + dois `push: false` (l.418, l.435); no head sao um
`push:` condicional **por ramo** (l.426) + os mesmos dois `push: false` (l.444, l.461). O diff
textual completo do `ci.yml` tem **exatamente 4 hunks** e nada alem do prometido — o job `e2e`
esta intocado.

**Os quatro workflows de deploy, por hash de blob (nao por leitura):**

    IDENTICO  deploy-production.yml  74adc1065ce2c884c0ebd8100a9add104ba373f2
    IDENTICO  deploy-staging.yml     47d5a3978fee7e98f08712a728124e6b6b3be946
    IDENTICO  backup-database.yml    78c8e5fd189ba58cd9be0ffb6f1c1a39b838e3ef
    IDENTICO  uptime-check.yml       eec6d299b276416b452dde98f6fe3a679733d0ef
    $ git show --stat b8cd22df -- .github/    -> 1 file changed (so ci.yml)

**Escopo proibido intocado:** nada de `src/**`, `frontend/**`, `mobile/**`, `tests/**`, `prisma/**`
ou lockfiles no diff.

**Escopo que cresceu em silencio?** Nao encontrei. Os 22 arquivos se dividem em: 1 workflow,
2 contratos, 2 corpos de inspetor, 5 de KPI, 5 de registro (`comandos/`, `log-execucao`,
`pendencias`, `pendencias-indice`, `status-geral`) e 7 de rito (ata + 6 de voto/inspetor). Todos
cabem no escopo declarado.

---

## 3. Conferencia nomeada #1 — o portao que ABRE o GHCR na main

**PROVADO POR EXECUCAO, e com controle negativo.** Run da `main` no merge commit: **35663407984**
(evento `push`, ref `refs/heads/main`). Quando comecei, o run estava `in_progress` com o `docker`
ainda rodando — **esperei concluir** em vez de presumir.

    $ gh run view 35663407984 --json status,conclusion,jobs
    run: completed / success
      backend-postgres success . frontend success . flutter success . authority-portal success
      owner-portal success . backend success . docker SUCCESS
      docker/step 5  "Log in to GHCR"  completed  SUCCESS      <-- nao mais skipped

Log do job `docker` (106545208539), linhas literais:

    22:41:05.673Z  Login Succeeded!
    22:41:05.693Z    push: true
    22:41:51.400Z  #26 pushing manifest for
       ghcr.io/thiagodorgo/erp-backend:b8cd22dfd4185f6e71f937ad4ae155646177c78e@sha256:6f221d918d57b4ab5ce3e04912e2dec648f510e36d890be5dfd3c5d476c46bb1  1.3s done
    22:41:51.400Z  #26 pushing manifest for
       ghcr.io/thiagodorgo/erp-backend:latest@sha256:6f221d918d...c46bb1  0.7s done

Os outros dois `build-push-action` (carga no daemon para o smoke) seguem `push: false` — correto.

**Confirmacao independente do registry** (nao do log do proprio run), por token anonimo do GHCR. E
o **mesmo fato** que a trava (c) do `deploy-production.yml:117-118` testa com `docker manifest
inspect`:

| alvo | HTTP | docker-content-digest |
|---|---|---|
| `erp-backend:b8cd22df...` (merge commit) | **200** | `sha256:6f221d918d57b4ab5ce3e04912e2dec648f510e36d890be5dfd3c5d476c46bb1` |
| `erp-backend:latest` | **200** | **o mesmo digest** |
| `erp-backend:09dc4345...` (head do RAMO, onde o gatilho push novo disparou e o docker rodou) | **404** | — |
| `erp-backend:27eae4b0` (sonda `chore/ci-probe`) | **404** | — |

Os dois **404 sao o controle negativo** que impede esta prova de ser tautologica: o gatilho `push`
por ramo de bloco de fato disparou e o job `docker` de fato executou naqueles SHAs — **e nao
publicou**. O portao discrimina por ramo **nos dois sentidos**, medido nas duas pontas. E o digest
do registry bate com o digest do log. **Sem achado.**

**Nota lateral, pre-existente e fora do escopo deste bloco:** o pacote `erp-backend` aceita **pull
anonimo** (token de escopo publico emitido, manifest 200). A visibilidade do pacote no GHCR e
anterior a este PR, que nao a tocou. Registro como nota, nao como achado.

---

## 4. Conferencia nomeada #2 — alcance do concurrency na main

**Leitura do arquivo rastreado** (`.github/workflows/ci.yml:26-28`, **coluna 0** = chave de
workflow): o grupo e `ci-<workflow>-<event_name>-<ref>` com `cancel-in-progress: true`.

Nao ha `concurrency` de job em lugar nenhum do arquivo (ocorrencia unica, coluna 0). Logo
**alcanca todo evento, inclusive `push` na `main`**: dois merges consecutivos caem no mesmo grupo
`ci-CI-push-refs/heads/main`, e o segundo **cancela** o primeiro levando junto o job `docker` —
aquele SHA fica sem imagem e a trava (c) passa a recusa-lo. Nao simulei um segundo merge: seria
mutacao da `main`, fora do meu papel.

**A regressao e NOVA deste PR:** `git show aadaa6d5:.github/workflows/ci.yml` **nao tem
`concurrency` nenhum**. Antes, dois merges seguidos produziam dois runs completos.

**Reexecutei a medicao da cadeira C2** (ela declarou 0/39; medi 40 intervalos sobre 41 commits de
`origin/main`):

    intervalos medidos: 40 . abaixo de  9 min: 0
                             abaixo de 15 min: 1
                             abaixo de 30 min: 2
    menor intervalo: 13,1 min (1a7ad4d5 -> 3c291893, 2026-09-05T16:31:41-03:00)
    mediana: 559,2 min

-> **A medicao da C2 reproduz.** E medi a **janela real** (duracao do run de CI em `push`/`main`,
11 runs completos, createdAt -> updatedAt):
8,2 . 8,5 . 8,6 . 8,7 . 8,7 . 9,0 . 9,2 . 9,2 . 9,5 . 9,5 . 9,7 min.
A janela de ~9 min esta **medida, nao estimada**.

**Veredito sobre o risco: aceitavel como esta — com margem fina, e por isso nomeada.**

- Falha e **fechada**: o SHA sem imagem e *recusado* pela trava (c), nunca promovido por engano.
- O remedio entrou **no mesmo PR**: `workflow_dispatch` (`ci.yml:18`) reexecuta o CI no SHA.
- **Mas** a margem e 13,1 min contra 8,2-9,7 min de janela: **~1,4x**. E a mediana de 559 min vem
  de uma rodada com um PR por vez; **esta** rodada tem merges em fila (#392 logo atras, e o plano
  SAN3 com 37 blocos). O historico mede o passado, nao a fila. -> **ressalva operacional**, nao
  bloqueio.

---

## 5. Contrato — C7.1-bis espelhado (CLAUDE.md, AGENTS.md, 2 corpos do inspetor)

**Comparado por hash, nao por leitura.** Extrai o C7.1-bis inteiro de cada arquivo na ref e hasheei;
li os blobs com `git -c core.autocrlf=false show` justamente para **nao fabricar CR** (a armadilha
do C7.1-ter(c)).

| arquivo | sha256 do C7.1-bis | bytes |
|---|---|---|
| `CLAUDE.md` | `d3794b4e0ca0bc2f...` | 1808 |
| `AGENTS.md` | `d3794b4e0ca0bc2f...` | 1808 |

-> **byte-identicos**. A frase nova ("o objeto da junta e um SHA com check-runs CONCLUIDOS") esta
nos dois. **Regra de espelhamento respeitada.**

| corpo do inspetor | sha256 do item 4.3 | bytes |
|---|---|---|
| `.claude/agents/inspetor-de-terreno-da-junta.md` | `65f7c39519039516...` | 950 |
| `.agents/agents/inspetor-de-terreno-da-junta.md` | `65f7c39519039516...` | 950 |

-> **byte-identicos**. E o espelho inteiro esta consistente:

    $ node scripts/sync-agent-agents.mjs --check
    [agents-sync] OK - 25 agentes, espelho consistente.     (exit 0)

**Sem achado.**

---

## 6. Numeros reexecutados

O bloco **nao toca codigo de produto nem teste** (provado na secao 2), entao a §C3.3 manda CARREGAR
as metricas de trilha com nota. Reexecutei assim mesmo — e a melhor reexecucao disponivel nao e a
minha maquina, e a **suite rodando no PROPRIO merge commit**, que e o artefato que ficou na `main`.
Run **35663407984** (`push`/`main`, head `b8cd22df`), 7/7 jobs `success`:

| trilha | job / run | medido AGORA por mim no merge commit | KPI declarado | confere? |
|---|---|---|---|---|
| backend | `backend` 106543621351 | `# tests 3054 . pass 3052 . fail 0 . skipped 2` | `3052/3054` | **SIM** |
| backend+Postgres | `backend-postgres` 106543620965 | `# tests 263 . pass 263 . fail 0 . skipped 0` | (nao e metrica publicada) | — |
| smoke web | `frontend` 106543621188 | `# tests 1202 . pass 1202 . fail 0 . skipped 0` | `1202/1202` | **SIM** |
| Flutter | `flutter` 106543621195 | `01:06 +864: All tests passed!` | `864/864` | **SIM** |

As tres metricas de trilha **reproduzem no artefato mergeado** — nao so obedecem a politica de
carregamento, elas sao verdadeiras *hoje*. Reexecutei tambem no **head aprovado** o que o PR
declarou:

    $ gh api .../commits/09dc4345.../check-runs --jq .total_count   -> 14
      14/14 `success` (2 runs: 35662410601 push + 35662414888 pull_request, 7 jobs cada)
    $ gh api .../commits/3a0ea095/check-runs  (objeto julgado pela ata) -> 14, todos `success`
    docker job 106542097571 (pull_request) e 106542352401 (push):
      step 5 "Log in to GHCR" -> completed/SKIPPED nos DOIS eventos
      `push: false` nas TRES invocacoes de build-push-action

-> as quatro afirmacoes numericas do corpo do PR (14/14 . `skipped` nos dois eventos . `push: false`
nos tres . 3054/3052/0/2) **reproduzem**. Nenhum numero declarado deixou de reproduzir.

**O que NAO executei, e por que.** Nao rodei `npm ci` + `npm test` + `test:smoke` + `flutter test`
na minha maquina: (a) o disco esta com **12 GB livres de 238 GB (96% usado)** e um `node_modules`
proprio custaria ~1-2 GB; (b) o bloco nao toca `src/`, `tests/`, `frontend/`, `mobile/` nem
`prisma/` — nao ha o que a minha execucao pudesse contradizer que a do CI no mesmo commit ja nao
tenha coberto; (c) subir Postgres/Redis proprios ficaria a um passo da base viva, que e alvo
proibido. Rodei, sem dependencia, no meu worktree em `b8cd22df`:

    $ node --check Kpis/app.js                 -> exit 0
    $ git diff --check b8cd22df^ b8cd22df      -> exit 0 (zero erro de whitespace)
    $ node scripts/sync-agent-agents.mjs --check -> exit 0, 25 agentes, espelho consistente

Digo isto em vez de presumir: **a suite completa quem rodou foi o CI, no merge commit**, e eu li o
resultado dela job a job, nao o relato de ninguem.

Ainda: **os guards de painel do §C3.1 rodaram no merge commit e passaram** (log do job `backend`):

    ok 1490 - painel: a SERIE desenhada e a do kpis-history.json, ponto a ponto (nao serie fabricada)
    ok 1498 - painel: a copia congelada e IDENTICA ao kpis-latest.json (gerada, nunca digitada)

Por isso o `Kpis/index.html` **nao precisava mudar** (ele hidrata dos JSON em runtime) e a unica
linha alterada do `Kpis/app.js` e a copia `var FROZEN`, que o guard prova identica ao
`kpis-latest.json`.

---

## 7. KPI (C3.5)

**Estado do PR corrente — correto, e a divida esta NOMEADA abaixo.**

    Kpis/kpis-latest.json  -> release: pr=391, merge_commit=null, approved_head=null,
                              status="published_per_pr", version="B-SAN3-B1"
    Kpis/kpis-history.json -> entrada 162: version="B-SAN3-B1", pr=391,
                              merge_commit=null, approved_head=null

Pela C3.5 isso e **o esperado na autoria** e **nao bloqueia**. Mas o meu corpo e explicito: "null
depois do merge e divida, nao convencao". Entao nomeio a divida com os valores medidos por mim:

> **DIVIDA D-391-BACKFILL (para o PR seguinte, #392):** em `Kpis/kpis-latest.json` (se ainda for a
> entrada corrente) e na entrada `B-SAN3-B1` de `Kpis/kpis-history.json`, preencher
> **merge_commit = b8cd22dfd4185f6e71f937ad4ae155646177c78e** e
> **approved_head = 09dc4345951a35cb88daa4457226f64192dba87c** (`gh pr view 391 --json headRefOid`
> — medido, nunca completado de cabeca). Se a casa preferir a convencao do #387/#390 (registrar o
> **objeto julgado pela ata** em vez do head mergeado), o valor e
> **3a0ea095cbbac36af0c21ba967e938fbe5375e83** — mas entao **diga qual regua**, porque hoje as duas
> convivem no mesmo arquivo sem ninguem dizer qual e (achado **A3**).

**blocks_completed 165 -> 166: CONFERE.** `git show aadaa6d5:Kpis/kpis-latest.json` devolve
`blocks_completed = 165` — a contagem partiu do valor publicado na `main`, nao de numero herdado.

**As notas C3.3/C3.4 sao honestas** (valor CARREGADO, sem reexecucao desta trilha neste PR,
mvp_demo/mvp_vendavel INTOCADOS) — e, como a secao 6 mostra, os valores carregados **tambem
reproduzem** no merge commit. Uma imprecisao na nota esta no achado **A4**.

---

## 8. Rito — ata, votos, inspetor, emenda 1

**Tudo existe e o placar REPRODUZ.** Contei os achados abrindo os JSON de voto, nao lendo a ata:

| cadeira | identidade | veredito no JSON | eu contei | a ata diz |
|---|---|---|---|---|
| C1 | `agente-secops` | APROVADO | 6 nota, 0 ajuste, 0 bloqueia | 0 bloqueia . 0 ajuste . 6 nota OK |
| C2 | `agente-devops-provisionador` | APROVADO | 3 nota, 2 ajuste, 0 bloqueia | 0 bloqueia . 2 ajuste . 3 nota OK |
| C3 | `validador-mestre` | APROVADO | 5 nota, 2 ajuste, 0 bloqueia | 0 bloqueia . 2 ajuste . 5 nota OK |

- **APROVADO 3 x 0, unanimidade de 3** — bate com o veredito registrado.
- **Todo voto declara escopo** (C7.1-ter(a)): C1 com 3 `dentro-do-bloco` + 3 `pre-existente`; C2 e
  C3 com tudo `dentro-do-bloco`. Nenhum achado sem escopo.
- **Inspetor de terreno:** `votos/B-SAN3-B1/00b-inspetor-terreno.md:18` traz
  `VEREDITO: LIBERADO COM RESSALVA` com 6 ressalvas nomeadas (R1..R6). Bate com a ata.
- **Papeis (C7.4-bis)** registrados na ata: planejou (orquestrador) diferente de desenvolveu
  (`general-purpose`) diferente de julgou (as 3 cadeiras). Nenhuma cadeira propos correcao —
  conferi nos JSON: os achados trazem `evidencia` e `motivo`, e nenhum traz plano de conserto.

**A emenda 1 esta no arquivo RASTREADO**
(`agent-orchestration/codex/comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md:185-215`), nao so prometida.
Julguei os dois ajustes **um a um**:

- **Ajuste (b) — APLICADO E VERDADEIRO.** A declaracao de que o `npm test` nao rodou localmente
  agora existe em arquivo rastreado (l.197-204) e cita o run `35655315031`. **Verifiquei o
  identificador em vez de aceita-lo:** `gh api .../actions/runs/35655315031` devolve
  `head_sha = 3a0ea095cbbac36af0c21ba967e938fbe5375e83`, `event=push`, `conclusion=success` — que e
  **exatamente o objeto julgado pela ata**. E o `# tests 3054 / pass 3052 / fail 0 / skipped 2`
  citado reproduz.
- **Ajuste (a) — APLICADO PELA METADE. Vira o achado A1.**

---

## 9. Caca a "prova que nao prova" — o que a execucao desmente no que MERGEOU

Quatro achados. **Nenhum e defeito de produto**; tres sao de registro e um e conta de dividas
(secao 10). Em ordem de consequencia.

### A1 — o ajuste (a) da junta ficou PELA METADE no arquivo rastreado

`agent-orchestration/codex/comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md:152-153` — a secao
**"Junta (C7)"**, que e a que um bloco futuro le para saber o quorum — continua dizendo, literal:

    - **Quorum:** o bloco **nao** toca dinheiro, permissao nem perda de dado; toca **pipeline**, logo
      `agente-secops` e obrigatorio por gatilho. **Maioria de 3** (C7.1-ter(b)).

E a **emenda 1 (a)**, 38 linhas abaixo (l.191-196), declara essa exata frase como o defeito: o
comando dizia "maioria de 3", a junta que rodou foi unanimidade de 3, e a enumeracao do comando
omitia justamente o gatilho que se aplicava (seguranca) — fechando com "registro que diz menos do
que aconteceu vira precedente errado".

A correcao entrou **so** na linha de Rastreabilidade (l.180) e na prosa da emenda. Resultado: **duas
linhas do mesmo arquivo rastreado se contradizem sobre o quorum, e a errada e a normativa** —
incluindo a premissa falsa de que o bloco nao toca seguranca. A ata (`J-B-SAN3-B1.md:3`) diz "o
bloco toca **seguranca** e o pipeline"; o comando diz o contrario.

**Nao invalida o merge:** o quorum CONVOCADO foi o estrito (unanimidade de 3 com `agente-secops`),
provado pela ata e pelos tres votos. Mas e a classe de defeito que o proprio texto se propos a
matar, sobrevivendo dentro do conserto dela. **Gravidade: ajuste / registro.**

### A2 — quatro `ajuste` na tabela, dois tratados no texto

A ata registra na tabela **2 ajuste da C2 + 2 ajuste da C3 = 4**. O texto logo abaixo diz
"**Os 2 ajustes**, aplicados antes do merge", e a emenda 1 trata so os dois da C3. Os da C2
(`C2-01`, `C2-02`) foram reclassificados **em prosa** pelo orquestrador — emenda 1, l.211: "a frase
falsa nao esta em nenhum arquivo que mergeia — por isso nota, nao ajuste" — sendo que o
`agente-devops-provisionador` votou `"gravidade": "ajuste"` nos dois (conferi no JSON bruto, nao na
ata).

**Nada foi escondido:** a substancia dos dois virou as duas conferencias que chegaram ate mim, e eu
executei as duas (secoes 3 e 4). O defeito e que **quem foi constrangido pelo ajuste reetiquetou o
ajuste do jurado**, e a ata publica um total que o seu proprio quadro contradiz.
**Gravidade: nota / registro.**

### A3 — a procedencia do backfill do #390 e falsa, e esta em TRES arquivos que mergearam

`Kpis/kpis-history.json` (entrada `B-SAN3-04a`, campo `backfill_note`),
`agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` dizem que o
`merge_commit` e o `approved_head` do #390 foram "medidos por `gh pr view 390` ... nao herdados".
**Executei:**

    $ gh pr view 390 --json headRefOid  ->  a62d04e2bbe42533e58639643a19104bdccc0ab6
      (2026-09-20: "docs(b-san3-04a): emenda 4 — as 8 divergencias do pre-merge")
    valor escrito no history            ->  fbda96b016ac65f88fe99d695295329e83938bea
      (2026-09-18: "chore(kpi): B-SAN3-04a — pr 390 preenchido apos o gh pr create")

**A medicao citada NAO produz o valor escrito.** Dois commits distintos, dois dias de distancia.

**Nao afirmo que o numero esteja errado** — e este e o ponto fino. A entrada do **#387** no mesmo
arquivo usa `approved_head = 8adaaa31...` enquanto `gh pr view 387 --json headRefOid` da
`f999adb2...`: a convencao viva e registrar **o objeto JULGADO pela ata**, nao o head mergeado, e
`fbda96b0` e de fato o objeto do ciclo 1 (`J-B-SAN3-04a.md:5`). O que esta errado e **a frase**: ela
credita a uma medicao um valor que a medicao contradiz — a mesma classe da prova falsa do dev sobre
o `concurrency`, com a diferenca de que **esta mergeou**. Agrava que o porteiro do #390 entregou
`a62d04e2...` por escrito: divergir da instrucao do gate e legitimo, **divergir sem registrar** nao
e — e o parecer onde a instrucao esta **nao foi versionado** (divida 5). **Gravidade: ajuste / registro.**

### A4 — o "APENAS" da nota de KPI descreve um diff menor do que o que mergeou

Todas as metricas de `Kpis/kpis-latest.json` carregam a nota: "`git diff --name-only
origin/main...HEAD` devolve **APENAS** `.github/workflows/ci.yml`, `CLAUDE.md`, `AGENTS.md`, os dois
corpos do `inspetor-de-terreno-da-junta`, o comando do bloco e `Kpis/*`".

**O diff real do merge tem 22 arquivos** — os 9 nomeados, mais `log-execucao.md`, `pendencias.md`,
`pendencias-indice.md`, `status-geral.md`, a ata e os 7 arquivos de voto/inspetor. A nota descreve um
momento anterior do ramo e foi publicada como se descrevesse o PR.

**A conclusao que sustenta o KPI continua VERDADEIRA e eu a verifiquei** na lista completa dos 22:
zero arquivo em `src/`, `tests/`, `frontend/`, `mobile/` ou `prisma/`. Por isso e **nota**: a metrica
carregada e legitima; a frase e que promete uma medicao mais estreita do que a realidade.

### O que eu procurei e NAO achei

Varri o `ci.yml` mergeado atras de comentario afirmando comportamento inexistente. As contagens de
ramo cravadas no comentario (`ci.yml:13-15`) e na tabela do corpo do PR **reproduzem na integra**:

    feature 78 (mais recente 2026-06-19) . feat 26 . fix 12 . chore 9
    codex 4 (2026-05-26) . docs 3 . test 1 (2026-06-10) . demo 1 (2026-08-29)

E a afirmacao da cadeira C2 que eu poderia ter aceitado de terceiro, **eu remedi**: no head
intermediario `16d39b41`, `backend` e `docker` sairam `cancelled` nos DOIS runs — a cadeira estava
certa e o dev estava errado. Registro como o lugar onde o processo funcionou como desenhado: a prova
falsa foi pega **antes** de virar linha em arquivo rastreado.

---

## 10. As 5 dividas do #390 herdadas pelo primeiro merge — julgamento

O orquestrador pos na mesa que "este PR mergeou primeiro e NAO as pagou". **Medi uma a uma, e a
afirmacao precisa de uma correcao: o #391 pagou UMA das cinco.** Placar:

| # | divida atribuida pelo porteiro do #390 | estado medido |
|---|---|---|
| 1 | backfill C3.5 do #390 em latest+history | **PAGA** (com o defeito de procedencia **A3**) |
| 2 | aposentadoria rodada 4 (`git rm` de `jurado-san3-01c2-*` nos DOIS espelhos) | **NAO PAGA** |
| 3 | dono real / ampliacao nominal nas duas pendencias do 04a | **NAO PAGA** |
| 4 | linha do `B-SAN3-01b` no §5 do `PLANO_SAN3.md` | **NAO PAGA** |
| 5 | versionar o parecer do porteiro do #390 | **NAO PAGA** |

**Como medi cada uma:**

1. `git show aadaa6d5:Kpis/kpis-history.json` -> entrada do #390 com `merge_commit: null,
   approved_head: null`; no `b8cd22df` -> `aadaa6d5.../fbda96b0...`. **O #391 escreveu o backfill.**
   (O `kpis-latest.json` nao precisava: ele carrega o PR corrente, que agora e o 391.)
2. `git ls-files | grep san3-01c2` -> **4 arquivos de corpo ainda rastreados**:
   `.claude/agents/especialistas/jurado-san3-01c2-fail-closed-web.md`,
   `.claude/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md` e os dois espelhos em
   `.agents/agents/especialistas/`. E `agent-orchestration/controle/aposentadoria-especialistas.md:118`
   diz "Rodada 4 — ANUNCIADA aqui, EXECUTADA no PR seguinte", com as l.132-133 nomeando "o primeiro
   a mergear depois deste". **O #391 e esse PR e nao tocou o arquivo**
   (`git diff --name-only aadaa6d5 b8cd22df -- .../aposentadoria-especialistas.md` sai vazio).
3. `pendencias.md:9712` segue `dono: B-SAN3-06a` e `pendencias.md:9662` segue `dono: B-SAN3-07`,
   sem ampliacao nominal declarada. O unico delta de `pendencias.md` no #391 e a **abertura** de
   `P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO`.
4. `grep -n 'SAN3-01b' docs/revisoes/SAN3/PLANO_SAN3.md` -> **vazio no arquivo inteiro**.
5. `git ls-files | grep -i porteiro` -> o mais recente versionado e
   `agent-orchestration/omega/juntas/votos/SAN3-plano-opcao-B/00c-porteiro-pos-merge-386.md`.
   **Nao ha parecer versionado de #387, #390 nem deste #391.**

**E — este e o agravante que eu acrescento ao ponto do orquestrador — o #391 nao DECLAROU o que
deixou de pagar.** `status-geral.md` e `log-execucao.md` dizem so "Este PR pagou o backfill C3.5 do
#390", sem uma linha sobre as outras quatro. **Divida que nao se nomeia e divida que some**: foi
precisamente por isso que a divida 5 (versionar o parecer) importa — o unico lugar onde as cinco
estao escritas e um arquivo de scratchpad (`PORTEIRO-390.md:111`), que nao e artefato do repositorio
e morre com a sessao.

**Julgamento: e RESSALVA, nao bloqueio.**

Por que nao bloqueio: nenhuma das quatro em aberto e pre-requisito tecnico de nada. (2) e higiene de
diretorio de agentes — e os dois corpos nem foram convocados nesta junta; (3) e (4) sao campos de
registro; (5) e arquivamento. Nenhuma toca codigo, banco, permissao ou dinheiro. Negar o start do
#392 por causa delas puniria o bloco errado: **o trabalho existe e esta dentro do #392** — o que
mudou foi a ordem de merge, nao o conteudo.

Por que ressalva e nao "tudo bem": porque a divida ja mudou de dono **duas vezes** (do #387 para o
#390, do #390 para o "primeiro a mergear") e a cada salto perdeu um pedaco. O #391 pagou 1 de 5 e
nao registrou as 4 restantes — e o proximo porteiro, sem o parecer do #390 versionado, nao teria
como saber que elas existem.

**O que o #392 tem de carregar, nominalmente:**

- **(D1)** `git rm` de `jurado-san3-01c2-fail-closed-web.md` e
  `jurado-san3-01c2-suplente-fail-closed-web.md` nos **dois** espelhos (`.claude/agents/especialistas/`
  e `.agents/agents/especialistas/`), `node scripts/sync-agent-agents.mjs --check` verde depois, e a
  **rodada 4 marcada como EXECUTADA** em `agent-orchestration/controle/aposentadoria-especialistas.md`.
  **Remocao por identificador de BLOCO** (`jurado-san3-01c2-`), nunca por nome de cadeira.
- **(D2)** dono real **ou** ampliacao nominal declarada em `P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS`
  (`pendencias.md:9712` — `frontend/src/modules/auth/auth.adapter.ts` nao esta no §5 do `B-SAN3-06a`)
  e em `P-SAN3-04A-SEED-PAPEIS-LEGADOS` (`pendencias.md:9662` — o `prisma/seed.ts` do `B-SAN3-07` e
  autorizado "so para o nome").
- **(D3)** linha do `B-SAN3-01b` no §5 do `docs/revisoes/SAN3/PLANO_SAN3.md` (hoje ele existe so por
  `controle/decisoes.md:2365`).
- **(D4)** versionar os pareceres de porteiro que faltam — o do **#390** e **este do #391** — sob a
  convencao viva `agent-orchestration/omega/juntas/votos/<bloco>/00c-porteiro-pos-merge-<pr>.md`.
- **(D5)** backfill C3.5 deste #391: `merge_commit b8cd22dfd4185f6e71f937ad4ae155646177c78e` e
  `approved_head 09dc4345951a35cb88daa4457226f64192dba87c` (ou `3a0ea095...` se a casa declarar que
  a regua e o objeto julgado — ver A3, e **declare a regua**).
- **(D6)** consertar **A1** (`comandos/B-SAN3-B1-...md:152-153` ainda diz "Maioria de 3" e "nao toca
  ... [seguranca]") e **A3** (a frase "medidos por `gh pr view 390`" nos tres arquivos). Sao duas
  edicoes de texto.

---

## 11. Pendencias e limpeza (C5)

### Pendencias

**Abertas pelo bloco: 1**, com dono e PR-alvo, como manda o contrato.
`agent-orchestration/controle/pendencias.md:9735` — `P-SAN3-B1-FLUTTER-CI-X-MAQUINA-DO-DONO`
(MEDIA, escopo `pre-existente` com evidencia de data, dono `B-SAN3-A2`, "nao bloqueia o gate").
O indice foi recontado junto (`pendencias-indice.md`: 410 -> 411 cabecalhos, 399 -> 400 IDs,
300 -> 301 abertas, balde A 131 -> 132). **Fechadas pelo bloco: 0** (FECHADAS segue 110).

**Amostragem** — como o bloco nao fechou nenhuma, conferi no codigo a que ele **abriu**, que e o
equivalente util: a pendencia afirma que o CI fixou `3.47.5`. `.github/workflows/ci.yml:368` traz
`flutter-version: 3.47.5` sob `channel: stable` — **verdadeiro**. A outra metade (maquina do dono em
3.41.6) eu **nao executei** — `flutter --version` na maquina do dono e medicao de ambiente do dono,
fora do meu alvo; declaro como **nao verificado**, nao como verificado.

**Pendencias que BLOQUEIAM:** varri os 411 blocos de `pendencias.md` por script, extraindo `status` e
o campo `bloqueia`. Das 301 abertas, **16** declaram bloqueio nao-trivial, e **15 delas bloqueiam o
gate da versao vendavel** (criterios 3, 4, 7, 13) — nenhuma nomeia um PR-alvo proximo. A 16a e a
recem-aberta, que diz explicitamente "nao bloqueia o gate". **Nenhuma pendencia nomeia `B-SAN3-00`**
(`grep 'B-SAN3-00' pendencias.md` sai vazio). -> **nada bloqueia o #392 pelo lado das pendencias.**

### Limpeza (C5)

| item | medido | estado |
|---|---|---|
| ramo remoto do PR | `git ls-remote --heads origin chore/ci-ve-o-sha-julgado` -> vazio | **APAGADO** |
| sonda | `git ls-remote --heads origin chore/ci-probe` -> vazio | **APAGADA** |
| ramos locais mergeados | `git branch --merged origin/main` (menos `main`) -> vazio | **LIMPO** |
| rastreado apagado na arvore | `git status --porcelain \| grep '^ D'` no meu worktree **e** na arvore principal -> vazio | **NENHUM** |
| build artifacts | `frontend/dist`, `dist`, `coverage` na arvore principal -> **todos ausentes** | **LIMPO** |
| base viva | nenhum comando meu; o bloco nao mexe em banco | **INTACTA** |

**Disco: 12 GB livres de 238 GB (96% usado).** Ainda acima do piso de ~10 GB do meu corpo, mas a
**um passo** dele — e este bloco nao gastou quase nada (nem `npm ci` houve). **Recomendo rodar
`DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` antes do proximo merge**, seguindo
`docs/limpeza-de-disco.md`: gradle/npm/docker liberam varios GB sem tocar `node_modules`, `.env` nem
rastreado. Nao e bloqueio; e aviso com numero.

### Residuo alheio — REPORTADO, nao varrido

- `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios` (arvore principal) esta em `demo/investidor` com
  4 arquivos ` M` (`critico-c5-adversarial.md` e `jurado-c5-arnes-catalogo-postgres.md` nos dois
  espelhos) e 8 untracked em `agent-orchestration/omega/juntas/` + `results.txt` +
  `scripts/audit-agents-skills.mjs`. **Nao e deste merge e nao e meu.**
- Worktrees vivos de outras sessoes: `gov-descuido`, `gov-elenco`, `b04a`, `b11`.
- Worktrees do **bloco irmao vivo (#392)**: `san300` + as cadeiras `w-j-san300-c1` e `w-j-san300-c3`.
  **Nao toquei em nenhum.**
- O **meu** worktree `C:/Users/AMP/w-port391` foi removido por nome ao fechar este parecer:
  `git worktree remove --force C:/Users/AMP/w-port391` -> sumiu da lista e do disco, e os cinco
  worktrees alheios seguem intactos. Nao usei junction/symlink de `node_modules` e nao instalei
  dependencia nenhuma (o worktree morreu sem `node_modules`). Os logs de CI que baixei ficaram
  no scratchpad da sessao, fora do repositorio.

---

## 12. O proximo bloco pode comecar?

### Alvo imediato: #392 (B-SAN3-00, junta viva) — **SIM**

- Head `7822deaf9a`: `gh api .../commits/7822deaf9a/check-runs` devolve **7, todos
  `completed/success`** (`authority-portal backend backend-postgres docker flutter frontend
  owner-portal`), do run `35656811954` (`pull_request`). Atende ao item 4.3 que o #391 mergeou.
- Nenhuma pendencia aberta nomeia `B-SAN3-00` como alvo bloqueado.
- As 4 dividas em aberto do #390 (secao 10) **sao** o conteudo do #392 — negar o start por elas
  seria negar o start do proprio pagamento.

### Alvos seguintes — **UM PRE-REQUISITO NOVO, criado por ESTE merge**

Este PR mergeou o item **4.3** do C7.1-bis: "Zero check-run = BLOQUEADO — a junta estaria votando
sobre um objeto que maquina nenhuma executou", com `cancelled`/`queued` contando como ausente. Vale
agora para todo inspetor de terreno, em `CLAUDE.md`, `AGENTS.md` e nos dois corpos.
**Medi os dois alvos seguintes AGORA:**

    gh api .../commits/43557a17/check-runs --jq .total_count  ->  0
       (#388, fix/mobile-work-order-contracts = a raiz da fila do app de campo)
    gh api .../commits/738ff531/check-runs --jq .total_count  ->  0
       (#389, fix/inventory-consistency = os dois gatilhos do estoque)

**Os dois heads que o porteiro do #390 liberou para junta de ciclo 2 tem ZERO check-run** — eram
justamente os PRs que o #391 existe para nunca mais deixar acontecer. Sob a regra que acabou de
entrar na `main`, **o inspetor de terreno desses dois e obrigado a devolver BLOQUEADO**.

**Nao e impasse — o remedio veio no mesmo PR.** Os dois ramos casam `fix/**`, entao basta disparar o
`workflow_dispatch` do `ci.yml` em cada ref (ou um push em cada ramo), esperar concluir e conferir
`total_count > 0` com tudo `completed`. E **pre-requisito de abertura da junta**, nao de start de
trabalho: planejar, rebasear e montar o briefing desses blocos pode comecar hoje.

### Resumo do gate

| demanda | pode comecar? | condicao |
|---|---|---|
| **#392** (`B-SAN3-00`, junta viva) | **SIM** | carregar as dividas nomeadas na secao 10 |
| #388 (raiz da fila do app de campo) | trabalho SIM, **junta NAO** | CI rodado no head, check-runs concluidos (4.3) |
| #389 (dois gatilhos do estoque) | trabalho SIM, **junta NAO** | idem |

---

## Inventario do que EXECUTEI

    git worktree add --detach C:/Users/AMP/w-port391 b8cd22df   (caminho conferido)
    git show b8cd22df:.claude/agents/porteiro-pos-merge.md      (corpo da ref)
    git log origin/main -3 ; gh pr view 391 --json state,mergeCommit,headRefOid,mergedAt
    git show --stat b8cd22df ; git show --name-only b8cd22df
    git show b8cd22df -- ci.yml CLAUDE.md AGENTS.md e os 2 corpos do inspetor
    os 4 deploy-*.yml comparados por hash de blob (git rev-parse <ref>:<path>)
    diff integral base-vs-head do ci.yml ; grep de TODO if / github.ref / github.event_name / push:
    sha256 do C7.1-bis e do item 4.3, com os blobs lidos sob core.autocrlf=false
    node scripts/sync-agent-agents.mjs --check     -> exit 0, 25 agentes
    node --check Kpis/app.js                       -> exit 0
    git diff --check b8cd22df^ b8cd22df            -> exit 0
    gh run view 35663407984 (run da main no merge commit) + log do job docker 106545208539
    curl ao ghcr.io/v2/.../manifests de b8cd22df, latest, 09dc4345 e 27eae4b0 (token anonimo)
    gh api check-runs de 09dc4345, 3a0ea095, 16d39b41, 7822deaf, 738ff531 e 43557a17
    gh api actions/jobs 106542097571 e 106542352401 (steps do docker no head do ramo)
    logs dos jobs backend, backend-postgres, frontend e flutter NO MERGE COMMIT (contagens TAP)
    git log origin/main -41 -> 40 intervalos entre merges (script proprio)
    gh run list --workflow ci.yml --branch main --event push -> 11 duracoes reais de run
    git ls-remote --heads origin -> contagem por prefixo + data do commit mais recente de cada
    leitura dos 3 C*-voto.json com contagem de gravidade e escopo por script
    varredura dos 411 blocos de pendencias.md por script (status + campo bloqueia)
    gh pr view 386/387/390 --json headRefOid ; git cat-file -t a62d04e2 e fbda96b0
    git ls-files com grep de san3-01c2, porteiro e aposent ; grep SAN3-01b no PLANO_SAN3.md
    df -h /c ; git status --porcelain na minha arvore e na arvore principal

**O que NAO executei, declarado em vez de presumido:**

- `npm ci` + `npm test` + `test:smoke` + `flutter test` locais — motivo na secao 6 (disco em 12 GB,
  bloco sem codigo de produto, e a suite inteira ja rodou **no proprio merge commit**, cujo
  resultado eu li job a job em vez de aceitar o relato de alguem).
- `flutter --version` na maquina do dono — e ambiente do dono, fora do meu alvo. A metade da
  pendencia nova que depende disso fica **nao verificada**, nao "verificada".
- Simular um segundo merge para ver o `concurrency` cancelar — seria mutacao da `main`.
- `gh api users/.../packages/container/erp-backend/versions` — o token nao tem `read:packages`
  (HTTP 403). Contornei pelo token anonimo do proprio registry, que provou o mesmo fato e ainda
  entregou os dois controles negativos.

---

## Achados, um por linha

| id | onde | o que | gravidade |
|---|---|---|---|
| **A1** | `agent-orchestration/codex/comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md:152-153` | ainda diz "Maioria de 3" e que o bloco nao toca seguranca — a frase que a emenda 1(a) declara corrigida; contradiz a l.180 e a ata | ajuste / registro |
| **A2** | `agent-orchestration/omega/juntas/J-B-SAN3-B1.md` | a tabela conta 4 ajuste (2 da C2 + 2 da C3), o texto diz "os 2 ajustes"; C2-01 e C2-02 foram reetiquetados de ajuste para nota em prosa, pelo orquestrador | nota / registro |
| **A3** | `Kpis/kpis-history.json` (backfill_note do #390), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md` | dizem "medidos por gh pr view 390"; o comando devolve a62d04e2 e o escrito e fbda96b0 — a medicao citada nao produz o valor | ajuste / registro |
| **A4** | `Kpis/kpis-latest.json`, nota de todas as metricas | "o diff devolve APENAS [9 arquivos]" — o merge tem 22; a parte que sustenta o KPI (zero em src/tests/frontend/mobile/prisma) e verdadeira | nota |
| **A5** | secao 10 | 4 das 5 dividas do #390 seguem abertas, e o PR nao declarou que ficaram | ressalva |
| **A6** | #388 (43557a17) e #389 (738ff531) | zero check-run nos dois; o item 4.3 que este PR mergeou obriga o inspetor a devolver BLOQUEADO nas juntas deles | pre-requisito |
| **N1** | corpo de `porteiro-pos-merge` | o da ref traz o bloco D-FALLBACK-MODELO-FABLE-OPUS que a sessao nao carregou (divergencia anterior a este PR) | nota |
| **N2** | GHCR | o pacote `erp-backend` aceita pull anonimo (manifest 200 com token publico) — pre-existente, fora do escopo | nota |

**Zero achado de produto. Zero numero declarado que nao reproduza. Zero arquivo rastreado sumido.**

---

## VEREDITO

O merge esta integro. As duas conferencias que a junta nomeou foram **provadas por execucao** — a do
GHCR com controle negativo nas duas pontas, a do `concurrency` com a medicao da C2 reproduzida e a
janela de ~9 min medida em vez de estimada. Os quatro numeros do corpo do PR e as tres metricas de
trilha **reproduzem no proprio merge commit**. O contrato esta espelhado byte a byte nos quatro
arquivos. O rito esta completo e o placar da ata reproduz achado a achado.

O que sobra e **divida de registro** — quatro achados de texto e quatro dividas herdadas — mais **um
pre-requisito novo que o proprio bloco criou** e que atinge os dois alvos depois do proximo.

LIBERADO COM RESSALVA: #392 (B-SAN3-00, junta viva — head 7822deaf com 7/7 check-runs success, nenhuma pendencia o nomeia, nada o bloqueia) | carregar DENTRO dele: (D1) git rm de jurado-san3-01c2-fail-closed-web.md e jurado-san3-01c2-suplente-fail-closed-web.md nos DOIS espelhos, sync-agent-agents --check verde depois, e rodada 4 marcada EXECUTADA em controle/aposentadoria-especialistas.md; (D2) dono real ou ampliacao nominal declarada em P-SAN3-04A-FRONT-PERMISSOES-POR-PAPEL-DEFASADAS (pendencias.md:9712) e P-SAN3-04A-SEED-PAPEIS-LEGADOS (pendencias.md:9662); (D3) linha do B-SAN3-01b no paragrafo 5 do PLANO_SAN3.md; (D4) versionar os pareceres de porteiro do #390 e do #391 em omega/juntas/votos/<bloco>/00c-porteiro-pos-merge-<pr>.md; (D5) backfill C3.5 do #391 com merge_commit b8cd22dfd4185f6e71f937ad4ae155646177c78e e approved_head 09dc4345951a35cb88daa4457226f64192dba87c, DECLARANDO qual regua (head mergeado x objeto julgado da ata), porque as duas convivem hoje no mesmo arquivo; (D6) corrigir A1 (comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md:152-153 ainda diz "Maioria de 3" e nega o gatilho de seguranca) e A3 (a frase "medidos por gh pr view 390" nos tres arquivos onde mergeou); e, ANTES de abrir a junta do #388 e do #389 — hoje com ZERO check-run no head —, rodar o ci.yml por workflow_dispatch em fix/mobile-work-order-contracts e em fix/inventory-consistency e esperar concluir, porque pelo item 4.3 que ESTE PR acabou de mergear o inspetor de terreno e obrigado a devolver BLOQUEADO sem isso
