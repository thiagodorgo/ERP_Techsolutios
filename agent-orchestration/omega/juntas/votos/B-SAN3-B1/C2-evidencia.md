# C2 — EVIDENCIA EXECUTADA — junta `B-SAN3-B1` (PR #391, objeto `3a0ea095`)

- **Cadeira:** C2 · **Identidade:** `agente-devops-provisionador` · **Modelo:** Opus 5 (`claude-opus-5[1m]`)
- **Corpo aplicado:** ver E0 (medido, nao herdado do inspetor)
- **Data:** 2026-09-21 · **Foco:** gatilhos/globs x ramos REAIS · `concurrency` · pin do Flutter · job `docker` em ramo · execucao dupla
- **Terreno:** medicoes SOMENTE LEITURA (`git show`, `git for-each-ref`, `gh api`) a partir do worktree `san300`
  (head proprio `7822deaf`, de OUTRO bloco) lendo a ref julgada por `git show 3a0ea095:<caminho>`. **Nao criei
  worktree, nao subi conteiner, nao toquei a base viva, nao mutei arvore nenhuma.** Nao precisei de `npm ci`:
  nenhuma medicao minha exige build (o que eu julgo executou na maquina do GitHub, e eu leio o resultado dela).
- **Escrita incremental (P1/P2):** cada secao foi apensada assim que medida.

---

## E0 — head julgado, PR e corpo aplicado

```
$ git cat-file -t 3a0ea095                    -> commit
$ git log -1 --format='%H %ad %s' 3a0ea095
3a0ea095cbbac36af0c21ba967e938fbe5375e83 Mon Sep 21 18:07:29 2026 -0300
  style(governanca): requebra a linha do §C7.1-bis na largura do arquivo
$ gh pr view 391 --json headRefOid,headRefName,state,baseRefName,mergeable
  headRefOid=3a0ea095cbbac36af0c21ba967e938fbe5375e83  headRefName=chore/ci-ve-o-sha-julgado
  baseRefName=main  state=OPEN  mergeable=MERGEABLE
```
**O objeto que eu julgo e o head do PR #391.** Confirmado por mim.

---

## E1 — GATILHOS E GLOBS x ramos REAIS (`git branch -r`)

Bloco `on:` do head julgado (`git show 3a0ea095:.github/workflows/ci.yml`, linhas 1-21), sem comentarios:

```yaml
name: ci
on:
  pull_request:
    branches: [main]
  push:
    branches: [main, 'fix/**', 'feat/**', 'chore/**', 'docs/**']
  workflow_dispatch:
```

### E1.1 — Censo dos prefixos remotos, medido agora (nao herdado do dev)

```
$ git fetch origin --prune -q
$ git branch -r --format='%(refname:short)' | grep -v HEAD | wc -l     -> 138  (137 ramos + o symref `origin`)
$ git for-each-ref  refs/remotes/origin/<p>/*   (n e ultimo commit por prefixo)
```

| prefixo | n | ultimo commit | glob cobre? |
|---|---|---|---|
| `feature/` | 78 | **2026-06-19** | NAO — morto ha 3 meses |
| `feat/` | 26 | 2026-07-05 | **sim** |
| `fix/` | 12 | **2026-09-20** | **sim** |
| `chore/` | **11** | **2026-09-21** | **sim** |
| `codex/` | 4 | 2026-05-26 | NAO — morto |
| `docs/` | 3 | 2026-08-29 | **sim** |
| `test/` | 1 | 2026-06-10 | NAO — morto |
| `demo/` | 1 | 2026-08-29 | NAO — ramo de demonstracao, nenhuma junta julga |
| (sem prefixo) | 1 | — | `main`, ja coberto |

**Divergencia numerica com o relatorio do dev (§1): ele contou `chore/` = 9; eu conto 11.** Causa medida: os
ramos `chore/ci-ve-o-sha-julgado`, `chore/ci-probe` e `chore/corpos-de-jurado-rastreados` nasceram durante a
propria rodada. **Nao altera conclusao nenhuma** (o glob `chore/**` cobre os 11) — registro por honestidade de
numero, gravidade `nota`.

### E1.2 — O teste que importa: os globs cobrem os ramos que VIRAM PR?

```
$ gh pr list --state all --limit 40 --json headRefName --jq '.[].headRefName' | awk -F/ '{print $1}' | sort | uniq -c
     23 chore        12 fix        3 feat        2 docs
```
**Os 40 PRs mais recentes usam SO os quatro prefixos que o glob cobre. Cobertura = 40/40 (100%).**

```
$ gh pr list --state open
392  chore/corpos-de-jurado-rastreados
391  chore/ci-ve-o-sha-julgado
389  fix/inventory-consistency
388  fix/mobile-work-order-contracts
```
**Os 4 PRs abertos agora casam com os globs** — inclusive os dois (#388/#389) cujo zero de check-run motivou o
bloco. `feature/` e o maior namespace em numero (78) e **nao** esta coberto, mas nao produz PR desde
2026-06-19 e nao esta no §8.2 do `CLAUDE.md` (que nomeia `feat/`, `fix/`, `chore/`). **Sem buraco operacional.**


### E1.3 — O gatilho novo alcanca SO o `ci.yml`

Li o bloco `on:` dos **cinco** workflows da ref julgada (`git ls-tree -r --name-only 3a0ea095 .github/workflows/`):

| workflow | gatilho na ref julgada | alcancado pelos globs novos? |
|---|---|---|
| `ci.yml` | `pull_request[main]` + `push[main, fix/**, feat/**, chore/**, docs/**]` + `workflow_dispatch` | **sim — e e o unico** |
| `deploy-staging.yml` | `push: branches: [main]` **so** | **nao** (confirma A3 do dev) |
| `deploy-production.yml` | `workflow_dispatch` com inputs `promote_sha` + `rollback_rehearsed` | **nao** |
| `backup-database.yml` | `schedule` + `workflow_dispatch` | **nao** |
| `uptime-check.yml` | `schedule` + `workflow_dispatch` | **nao** |

**Nenhum outro workflow passa a disparar.** Tambem nao ha `paths`/`paths-ignore` no `on:` — e **isso e
exigido pelo proprio §C7.1-bis** que o bloco escreve: com filtro de caminho, um head so de registro teria
ZERO check-run e a clausula nova bloquearia o start da junta. Desenho coerente consigo mesmo.

---

## E2 — `concurrency`: as duas armadilhas, conferidas uma a uma

```yaml
concurrency:
  group: ci-${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
  cancel-in-progress: true
```

| Armadilha do mandato | Cai nela? | Prova |
|---|---|---|
| **(a) agrupar so por `github.ref`** — nao dedupa, porque `pull_request` usa `refs/pull/N/merge` e `push` usa `refs/heads/<ramo>` | **NAO** | a chave inclui **`github.event_name`** ALEM do ref; os dois eventos caem em grupos diferentes **por construcao**, e o ref sozinho nunca decide |
| **(b) agrupar por SHA CRUZANDO eventos** — um cancelaria o outro e deixaria o SHA julgado `cancelled` | **NAO** | **nao ha `github.sha` na chave**; e no head julgado os **dois** runs sobreviveram — `35655315031` (push) e `35655321306` (pull_request), ambos `completed/success` |

```
$ gh api "repos/.../actions/runs?head_sha=3a0ea095..." --jq '.workflow_runs[]|[.id,.event,.status,.conclusion]'
35655321306  pull_request  completed  success   (criado 21:07:41Z)
35655315031  push          completed  success   (criado 21:07:37Z)
```
**Zero `cancelled` no SHA julgado.** A armadilha (b) esta materialmente afastada, nao so no papel.

Conferi tambem que a chave nao colide com workflow nenhum: `github.workflow` = `ci` (campo `name:` do
arquivo), logo todo grupo deste workflow comeca por `ci-ci-`, enquanto os outros quatro usam grupos fixos
(`deploy-staging`, `deploy-production`, `backup-database`, `uptime-check`). **Sem colisao entre workflows.**

### E2.1 — ACHADO C2-01: a evidencia do dev para "nao cruza eventos" e FALSA (o desenho, nao)

O relatorio do dev, §5.c, afirma: *"o run `pull_request` do mesmo head seguiu vivo"* (head intermediario
`16d39b41`). **Medido por mim — os DOIS morreram:**

```
$ gh api "repos/.../actions/runs?head_sha=<16d39b41>" --jq ...
35654825104  pull_request  completed  cancelled
35654817500  push          completed  cancelled

$ gh api "repos/.../commits/16d39b41/check-runs" --jq '.check_runs[]|[.name,.conclusion]' | sort | uniq -c
   2 authority-portal success     2 backend CANCELLED       2 backend-postgres success
   2 docker CANCELLED             2 flutter success         2 frontend success
   2 owner-portal success
```

**Causa medida:** o push seguinte (`3a0ea095`) atualiza **tambem** o `refs/pull/391/merge`, gerando um run
`pull_request` NOVO que cancela o anterior **dentro do mesmo grupo** (`...-pull_request-refs/pull/391/merge`).
Ou seja: a dedup por evento+ref funciona **nos dois eventos** — o que o head intermediario prova e a
armadilha (a) vencida, **nao** a (b). A conclusao de desenho ("nao cruza eventos") **continua verdadeira**, e
esta provada independentemente pelo head FINAL (E2, dois runs vivos). **O que esta errado e a prova citada,
nao o artefato.** (Detalhe que confirma a leitura: no head intermediario os jobs que ja tinham terminado
ficaram `success` e so os em voo — `backend` e `docker` — foram `cancelled`, nos DOIS eventos.)

---

## E3 — `cancel-in-progress: true` tambem vale para a `main` (ACHADO C2-02)

**A chave `concurrency` NAO existia na base.** Medido: `grep -n concurrency` no `ci.yml` de `aadaa6d5`
devolve **uma unica linha — a 184 — que e o NOME de um arquivo de teste**
(`tests/checklist-run-create-concurrency-db.test.ts`), nao a chave YAML. O `on:` da base e
`pull_request[main]` + `push[main]`, sem `concurrency`. **Logo, cancelar run em voo e comportamento NOVO
deste diff, e ele alcanca `push` na `main` por tabela.**

Cadeia medida do que isso alcanca na `main`:

```
$ gh api ".../workflows/ci.yml/runs?branch=main&event=push&per_page=12"   (duracao dos 12 ultimos)
35521761719 16:08:23 -> 16:17:05  (8m42)        34287133929  ~9m
35440526835 11:35:26 -> 11:44:56  (9m30)        34274237306  8m31
34763329502 14:40:10 -> 14:49:40  (9m30)        menor 7m38 · maior 9m39
```
```
$ git log origin/main -40   (intervalo entre commits consecutivos)
menor intervalo = 13 min · 1 de 39 intervalos abaixo de 20 min · ZERO abaixo de 9 min (a janela do CI)
```

**O que acontece se dois merges caem dentro da janela:** o run da `main` do primeiro SHA e cancelado, o job
`docker` dele nao chega a rodar, e **`ghcr.io/<owner>/erp-backend:<SHA1>` nunca e publicado**. Quem depende
disso, medido na ref julgada:

- `deploy-staging.yml` — **NAO depende**: deploya por `flyctl deploy --config fly.staging.toml --remote-only`
  (build na Fly), sem ler o GHCR. Staging **nao quebra**.
- `deploy-production.yml`, **Trava (c)**, l.117-118 — **depende**:
  `docker manifest inspect "ghcr.io/${OWNER}/erp-backend:${SHA}"`, com a mensagem *"Garanta que o SHA foi
  mergeado na main e publicado no GHCR"*. Esse SHA fica **impromovivel** ate o run cancelado ser
  re-executado.

**Severidade:** e **fail-closed** (recusa promover; nao promove artefato errado), a serie medida **nao tem
nenhum** intervalo dentro da janela (0/39 abaixo de 9 min), e o run cancelado e re-executavel pela via
normal do GitHub. Por isso `ajuste`, nao `bloqueia`. **Mas e efeito NOVO deste diff e nao coberto pelo texto
que o bloco escreve** — o §C7.1-bis trata `cancelled` so como "conta como ausente" **para o start da
junta**; na `main` o run nao e feedback, e o **produtor do artefato de promocao**. Escopo
**`dentro-do-bloco`** (a chave nasce neste diff; sem evidencia de pre-existencia, e dentro do bloco — e a
evidencia que eu tenho aponta o contrario: a base nao tinha a chave).

---

## E4 — Versao do Flutter: o que foi fixado, e se `channel` + `flutter-version` convivem

```yaml
- uses: subosito/flutter-action@v2
  with:
    channel: stable
    flutter-version: 3.47.5      # versao COMPLETA, nao wildcard
```

**(i) O pin pegou, no head julgado** (log do job `flutter` do run `35655315031`, 351 KB baixados):

```
com   channel: stable  /  flutter-version: 3.47.5
->    /opt/hostedtoolcache/flutter/stable-3.47.5-x64            (UNICO caminho de toolcache no log inteiro)
      FLUTTER_ROOT: /opt/hostedtoolcache/flutter/stable-3.47.5-x64/flutter   (4 ocorrencias)
$ grep -iE "::warning|::error|Warning:"   ->   ZERO
```
**Sem ambiguidade observada:** a chave do toolcache e `stable-<versao>-x64` — **canal E versao na mesma
chave**, resolucao deterministica; a versao e **completa** (`3.47.5`), nao um wildcard tipo `3.47.x` que
reintroduziria a deriva; e o action **nao emitiu aviso** de conflito entre as duas entradas. As duas chaves
convivem porque nao sao concorrentes: `channel` diz de qual manifesto sair, `flutter-version` diz qual
release daquele manifesto — e releases nao saem do manifesto depois de publicadas.

**(ii) A deriva que justifica o pin — re-medida por MIM, nao herdada** (A6):

```
run 35381265287  criado 2026-09-18T18:37:30Z  ->  hostedtoolcache/flutter/stable-3.47.4-x64
run 35409352362  criado 2026-09-19T00:26:19Z  ->  hostedtoolcache/flutter/stable-3.47.5-x64
```
**A deriva e real e ocorreu dentro desta rodada, exatamente na janela que o dev declara. A6 CONFERE.**

**(iii) Cobertura do pin:** varri os **cinco** workflows da ref julgada por `flutter-action|channel:|
flutter-version:` — **existe UM unico setup de Flutter no repositorio inteiro**, e e este. **Nao sobrou
canal solto em outro workflow.**

---

## E5 — Job `docker` em ramo: `push: false` e ainda prova que o processo sobe

**(i) Conclusoes por passo, medidas nos DOIS eventos do head julgado** (confirma A1, que o inspetor
declarou explicitamente **nao** ter medido):

| Passo | run `push` 35655315031 | run `pull_request` 35655321306 |
|---|---|---|
| 4 Set up Docker Buildx | success | success |
| **5 `Log in to GHCR`** | **`skipped`** | **`skipped`** |
| 6 Build backend image (push to GHCR only on main) | **success** | **success** |
| 7 Load backend image into the local daemon | success | success |
| 8 Load builder image for the compose migrate service | success | success |
| **9 `Container smoke — write -> restart -> read`** | **success** | **success** |

**(ii) Que `push: false` foi mesmo o que o action recebeu, e que nada foi ao registry** (log do job
`docker`, 203 KB):

```
$ grep "push: "                          ->  3 ocorrencias, TODAS "push: false"  (os 3 build-push-action)
$ grep -ic "exporting to registry|pushing manifest|pushing layers"   ->  0
$ a linha real do buildx:
  docker buildx build --build-arg APP_VERSION=3a0ea09... --cache-from type=gha --cache-to type=gha,mode=max
    --attest type=provenance,... --tag ghcr.io/thiagodorgo/erp-backend:3a0ea09... --tag ...:latest .
  (SEM --push e SEM --output type=registry: as tags sao so rotulos locais)
$ grep "Login Succeeded"                 ->  nenhuma (o passo 5 nem executou)
```

**(iii) Que o smoke prova o PROCESSO, nao so o build** (12 asserts, o compose de producao de pe no runner):

```
[smoke-compose] OK   6. grava uma organizacao pelo agregado core-saas (563ms)
[smoke-compose] OK   7. a organizacao e legivel ANTES do restart (45ms)
[smoke-compose] OK   8. reinicia o servico da api (10299ms)
[smoke-compose] OK   9. o processo e OUTRO (o restart aconteceu de verdade) (90ms)
[smoke-compose] OK  10. readiness volta a 200 depois do restart (3014ms)
[smoke-compose] OK  11. o worker sobe de novo no processo NOVO (a linha do boot e exercitada) (2ms)
[smoke-compose] OK  12. a organizacao SOBREVIVEU ao restart (O6R-DAT-001) (41ms)
[smoke-compose] VERDE — worker de pe no boot e no restart; organizacao gravada sobreviveu.
  Container/Volume/Network ... Removed       (teardown com -v; sem residuo no runner)
```

**Veredito do item: o par pedido esta provado EM RAMO — portao fechado (`skipped`, zero credencial, zero
export ao registry) E processo provado (build + boot + restart + persistencia + worker).** Nao e "build que
compila": e artefato que roda.

---

## E6 — Execucao dupla (push + pull_request no mesmo SHA): o que de fato acontece

**Acontece, e foi medido:** 2 runs, **7 jobs cada**, 4 segundos de diferenca na criacao, **14 check-runs**.

```
$ gh api ".../commits/3a0ea095.../check-runs" --jq '.total_count'      ->  14
$ ... --jq '.check_runs[]|[.name,.status,.conclusion]' | sort | uniq -c
   2 authority-portal completed success      2 backend completed success
   2 backend-postgres completed success      2 docker completed success
   2 flutter completed success               2 frontend completed success
   2 owner-portal completed success
$ ... --jq '.check_runs[].conclusion' | sort | uniq -c     ->  14 success
```
**14/14 `success` — RE-MEDIDO por mim, confere com o numero que o briefing publica. Zero `cancelled`,
zero `queued`.** E os jobs dos dois runs, lidos um a um pela API, sao 7 + 7 `success`.

**Custo, medido e nao estimado:**
```
soma das duracoes dos jobs:  run push = 15 min · run pull_request = 16 min   (~31 job-min por push)
$ gh api ".../runs/<id>/timing" --jq '.billable'    ->  UBUNTU = 0 min, jobs=7   (nos DOIS runs)
$ gh api repos/thiagodorgo/ERP_Techsolutios --jq '{private,visibility}'  ->  private=false, visibility=public
```
**Repositorio PUBLICO: o minuto de runner nao e faturado.** O custo real da duplicacao e **slot de
concorrencia**, nao dinheiro: 14 jobs por push, com **duas juntas vivas** empurrando (#391 e #392). Nao
observei fila hoje — o primeiro job comecou 38 s depois da criacao do run.

**O desenho aceita isso conscientemente? SIM, e esta escrito onde deveria:** o comentario do proprio
`ci.yml` (linhas 21-24) explica a chave de agrupamento e por que **nao** se agrupa por SHA cruzando eventos;
o §Passos do comando declara `concurrency` por `(workflow, evento, ref)` com `cancel-in-progress: true`; e o
§C7.1-bis novo fecha o circuito dizendo que `cancelled`/`queued` conta como ausente ate concluir. **A
duplicacao e o preco explicito de nao cancelar cruzando eventos** — o desenho preferiu 2 runs vivos a 1 run
e um SHA `cancelled`. Com custo faturado **zero**, a troca e favoravel e esta declarada. `nota`, nao defeito.

---

## E7 — Afirmacoes do dev que RE-VERIFIQUEI (R6 do inspetor)

| # | Afirmacao | Meu resultado |
|---|---|---|
| **A1** | `Log in to GHCR` skipped · build success · smoke success | **CONFERE** — E5, e nos **dois** eventos |
| **A3** | `deploy-staging` so em push/main; o gatilho novo nao o alcanca | **CONFERE** — E1.3 |
| **A5** | censo dos globs (78/26/12/9/3) e cobertura dos 4 globs | **CONFERE na conclusao**; `chore/` = **11**, nao 9 (achado C2-03, `nota`) |
| **A6** | deriva 3.47.4 -> 3.47.5 na janela 18/09T18:37Z -> 19/09T00:26Z | **CONFERE** — E4(ii), medido nos dois runs que ele cita |
| **A7** | `npm test` nao rodou localmente; quem rodou foi o CI no SHA julgado | **CONFERE, e BASTA** — ver E8 |
| **A11** | escopo limpo (outros workflows nao tocados) | **CONFERE na minha fatia**: o diff de `.github/` entre `aadaa6d5` e `3a0ea095` e **so** `ci.yml` (+30/-3); os outros 4 workflows sao identicos |
| **A12** | `concurrency` dedupa dentro de evento+ref e **nao** cruza eventos | **CONCLUSAO confere; a EVIDENCIA citada e FALSA** — achado C2-01, E2.1 |
| briefing | 14/14 `success` no head julgado | **CONFERE** — E6, re-medido |
| briefing | 0 check-runs nos PRs #388/#389 | **NAO medi** — nao usei no meu voto |
| A2/A4/A8/A9/A10 | alcance do defeito · `:latest` nao e lido · `blocks_completed` · backfill · semantica YAML | **fora da minha lente** (C1 e C3); nao votei com eles. Do A2 eu toquei so a parte que e minha: li a Trava (c) na ref e ela de fato depende do GHCR (E3) |

---

## E8 — A7: `npm test` nao rodou local. Basta? **SIM — e digo por que**

Medi o que o CI executou **no proprio SHA julgado** (job `backend` do run `35655315031`, log de 2,59 MB):

```
passos: Initialize containers success · Checkout success · Setup Node.js success · Install deps success
        Agents mirror guard (sync-agent-agents --check) success · Generate Prisma Client success
        Guard required env success · Apply migrations (Prisma) success · TypeScript check success
        Tests success · Build success · Stop containers success
totais: # tests 3054   # pass 3052   # fail 0   # cancelled 0   # skipped 2
```

**Basta, por tres razoes medidas — e a terceira e a que decide:**
1. a suite rodou **no objeto que eu julgo** (`3a0ea095`), nao numa arvore parecida com ele;
2. rodou contra **Postgres e Redis efemeros do runner** (`Initialize containers`), nao contra a base viva
   desta maquina — que, alias, esta parada ha 10 dias;
3. **nao existe caminho pelo qual este diff mude o resultado da suite:** ele nao toca `src/`, `tests/`,
   `prisma/` nem lockfile — o que ele muda e **quando e onde a suite roda**. Exigir a execucao local aqui
   seria exigir uma medicao **mais fraca** do mesmo numero.

Ressalva honesta, para nao virar precedente torto: essa aceitacao **so vale porque o bloco nao toca codigo**.
Num bloco que tocasse `src/`, "o CI roda" **nao** substituiria a bateria local — o §9 existe para pegar o
vermelho **antes** do push.

---

## E9 — Corpo que eu apliquei (R1 do inspetor), medido por mim

```
md5 EOL-neutro (tr -d '\r' | md5sum) de .claude/agents/agente-devops-provisionador.md
head julgado 3a0ea095 : 1aa2acf73d986b6389537fe671333ca4
worktree san300       : 1aa2acf73d986b6389537fe671333ca4
arvore principal      : 1aa2acf73d986b6389537fe671333ca4
```
**Os tres sao o MESMO corpo.** O corpo que a sessao carregou **nao diverge** do corpo do head julgado — a
ressalva R1 do inspetor **nao me alcanca**, e nao precisei escolher entre versoes.

---

## E10 — O que eu NAO medi (dito, nao presumido)

- **Zero check-runs nos PRs #388/#389** — numero do briefing; nao o usei.
- **A2 no que e do portao do GHCR/segredo** (se sobrou caminho de publicacao ou credencial em log) — lente
  da **C1**. Eu medi so a parte de pipeline: que a Trava (c) le o GHCR (E3) e que em ramo nao ha login nem
  export (E5).
- **KPI, escopo do diff fora de `.github/`, §C7.1-bis espelhado no `AGENTS.md`, registro** — lente da **C3**.
- **`:latest` nao ser lido por nenhum caminho de deploy (A4)** — li os 5 workflows e nao vi leitura de
  `:latest`, mas **nao varri `infra/`, `docker-compose*` nem scripts**; nao afirmo o universal.
- **Fila de concorrencia sob as duas juntas empurrando ao mesmo tempo** — nao houve evento hoje para medir;
  registro so o que observei (38 s ate o primeiro job).

---

## Limpeza (§C5)

Nao criei worktree, nao subi conteiner, nao toquei a base viva (`erp-postgres`/`erp-redis` seguem parados —
nao mandei um comando sequer), nao rodei `clean`/`prune`/`stash`/`checkout`/`reset`/`gc` em arvore nenhuma.
O unico comando de escrita que rodei no repositorio foi `git fetch origin --prune -q` (atualiza refs
remotas; nao muta arvore de trabalho nenhuma) — declarado por honestidade. Tudo o mais foi leitura
(`git show`, `git for-each-ref`, `git log`, `gh api`). Nao alterei arquivo rastreado; o `git status` do
`san300` esta como eu o encontrei. Arquivos que criei: este parecer, o voto, e os logs brutos em
`.../scratchpad/logs-C2/` (fora da pasta de votos, como o briefing manda). **Residuo alheio: nada varrido** —
o worktree `w-s1` (sonda S2) e a mutacao viva da arvore principal (corpos `c5` de outra sessao) continuam
exatamente onde estavam.
