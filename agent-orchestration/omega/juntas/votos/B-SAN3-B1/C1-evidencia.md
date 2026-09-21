# C1 — agente-secops — EVIDENCIA (incremental P1/P2)

Bloco `B-SAN3-B1` · PR #391 · objeto `3a0ea095` · ramo `chore/ci-ve-o-sha-julgado`
Foco da cadeira: portao do GHCR e fronteira de artefato.
Modelo: Opus 5 (`claude-opus-5[1m]`).

## M0 — terreno proprio e corpo aplicado (ressalva R1)

Worktree **detached proprio**, caminho curto, criado por mim:
`git worktree add --detach "C:/Users/AMP/w-j-sanb1-c1" 3a0ea095` -> head `3a0ea095`,
`git status --porcelain` = **0 linhas**. Sem junction. Sem `npm ci` — esta cadeira nao precisou:
toda medicao e de YAML lido na ref (`git show` / `git grep <sha>`) + `gh api`.

Nota de terreno (minha, declarada): a 1a tentativa com `MSYS_NO_PATHCONV=1` criou o worktree em
`C:\c\Users\AMP\w-j-sanb1-c1`; removido por `git worktree remove --force` (identificador MEU) e os
3 diretorios vazios remanescentes removidos por `rmdir`. **Nada alheio tocado.**

**Corpo aplicado (R1):** `agente-secops`, md5 EOL-neutro (`tr -d CR | md5sum`):

| Origem | md5 |
|---|---|
| head `3a0ea095` | `dc1a2974877dc56f04a5e3cb43668c75` |
| base `aadaa6d5` | `dc1a2974877dc56f04a5e3cb43668c75` |
| raiz (`demo/investidor`) | `dc1a2974877dc56f04a5e3cb43668c75` |
| `san300` (sessao) | `dc1a2974877dc56f04a5e3cb43668c75` |

**IGUAL nos quatro** — apliquei o corpo do head julgado, sem divergencia. Confirma a linha do
`agente-secops` na tabela do §8 do inspetor.

---

## M1 — o diff do `ci.yml`, medido na ref

`git diff aadaa6d5 3a0ea095 -- .github/workflows/ci.yml` — 5 alteracoes substantivas:
`on.push.branches` +4 globs · `workflow_dispatch:` novo · `concurrency` novo ·
`flutter-version: 3.47.5` · e os DOIS portoes do GHCR:

```
-        if: github.event_name == 'push'
+        if: github.ref == 'refs/heads/main'
-          push: ${{ github.event_name == 'push' }}
+          push: ${{ github.ref == 'refs/heads/main' }}
```

---

## M2 — A PERGUNTA CENTRAL DA CADEIRA: sobrou condicao com o sentido trocado?

Com o gatilho novo, **toda** condicao `github.event_name == 'push'` muda de sentido em silencio:
antes o evento `push` so existia na `main`; agora existe em 4 namespaces de ramo. Entao a pergunta
nao e "os dois portoes foram corrigidos", e sim **existe um TERCEIRO lugar que dependia disso?**
Contei as ocorrencias nas duas pontas:

```
BASE  aadaa6d5 — grep -n "event_name" .github/workflows/ci.yml
  389:        if: github.event_name == 'push'
  400:          push: ${{ github.event_name == 'push' }}
  -> DUAS, e ambas sao o portao do GHCR

HEAD  3a0ea095 — grep -n "event_name" .github/workflows/ci.yml
  27:  group: ci-${{ github.workflow }}-${{ github.event_name }}-${{ github.ref }}
  -> UMA, e e o concurrency (uso por desenho, nao portao)

HEAD  3a0ea095 — grep -n "if:" .github/workflows/ci.yml
  415:        if: github.ref == 'refs/heads/main'
  -> UM UNICO "if:" no arquivo inteiro
```

**Conclusao medida: as duas unicas condicoes do arquivo que dependiam do tipo de evento eram
exatamente os dois portoes do GHCR, e as duas foram corrigidas. Nao sobrou condicao com o sentido
trocado.** No head nao existe nenhum outro `if:` no arquivo — nao ha terceiro portao a auditar.

### M2-bis — tabela-verdade do portao novo contra o antigo

| Evento / ref | ANTIGO `event_name=='push'` | NOVO `ref=='refs/heads/main'` | Publica? |
|---|---|---|---|
| `push` na `main` | true | **true** | sim (inalterado, desejado) |
| `push` em `chore/** fix/** feat/** docs/**` | **true (seria!)** | **false** | **nao** — e este o conserto |
| `pull_request` (`refs/pull/N/merge`) | false | false | nao (inalterado) |
| `workflow_dispatch` na `main` | false | **true** | **sim — ALARGAMENTO** (achado A-C1-01) |
| `workflow_dispatch` em ramo | false | false | nao |

O portao novo e **estritamente mais restrito** no caminho que o bloco existe para fechar, e
**alargado** em exatamente uma celula: `workflow_dispatch` na `main`.

---

## M3 — superficie de credencial no `ci.yml` (head)

```
grep -n -i "secret|token|password|env:" .github/workflows/ci.yml  ->
  51:  POSTGRES_PASSWORD: postgres           (service container efemero do CI)
  131: JWT_SECRET: dev-only-change-me        (placeholder rotulado; o smoke RECUSA rodar contra
                                              alvo cujo JWT_SECRET nao seja este placeholder, l.471)
  147: POSTGRES_PASSWORD: postgres           (idem)
  420: password: ${{ secrets.GITHUB_TOKEN }} <- UNICO segredo real, DENTRO do passo gated pela l.415
```

**Um unico segredo real no arquivo (`GITHUB_TOKEN`), e ele vive dentro do passo `Log in to GHCR`,
que e justamente o passo governado pelo `if:` da l.415.** Nenhum segredo externo: sem `AWS_`,
`COGNITO_`, chave PEM, PAT (`ghp_`/`github_pat_`), sem `DATABASE_URL` com credencial real.
Os dois `POSTGRES_PASSWORD: postgres` e o `JWT_SECRET: dev-only-change-me` sao **pre-existentes**
(nao estao no diff do bloco) e sao placeholders de service container, nao credencial.

---

## M4 — a fronteira de artefato INTEIRA do repositorio

```
git grep -n "ghcr.io" 3a0ea095 -- .github/** infra/** fly*.toml Dockerfile* docker-compose*
  ci.yml:418                 registry: ghcr.io                     <- passo gated (l.415)
  ci.yml:428                 .../erp-backend:${{ github.sha }}     <- tag do build gated (l.426)
  ci.yml:429                 .../erp-backend:latest                <- idem
  deploy-production.yml:116  docker login ghcr.io                  <- workflow_dispatch puro
  deploy-production.yml:117  docker manifest inspect .../erp-backend:${SHA}
  deploy-production.yml:171  flyctl deploy --image .../erp-backend:${SHA}
  fly.production.toml:28,35  (comentario, por SHA)
```

**A superficie de publicacao do repositorio sao 3 linhas, todas no job `docker` do `ci.yml`, todas
sob o mesmo portao.** Nao existe segundo publicador.

**A4 CONFIRMADA:** `erp-backend:latest` e **escrito** so em `ci.yml:429` e **lido por ninguem**:

```
git grep -n ":latest" 3a0ea095 -- deploy-production.yml deploy-staging.yml fly*.toml
  -> NENHUM   (deploy nunca le :latest)
```

Producao promove exclusivamente por `:${SHA}` (l.171). Ou seja, mesmo o efeito colateral mais feio
do defeito original (sobrescrever `:latest` com codigo nao julgado) **nao teria consumidor de
deploy** — o que reforca, e nao enfraquece, a leitura de que o dano real morava na trava (c).

---

## M5 — gatilho dos OUTROS quatro workflows: o gatilho novo alcanca algum?

```
deploy-staging.yml     on: push -> branches: [main]              (SO main)  <- A3 CONFIRMADA
deploy-production.yml  on: workflow_dispatch (promote_sha, rollback_rehearsed)
backup-database.yml    on: schedule("0 6 * * *")  + workflow_dispatch {}
uptime-check.yml       on: schedule("*/5 * * * *") + workflow_dispatch {}
```

**Nenhum deles tem gatilho de push em ramo.** Gatilho e por arquivo: a mudanca no `ci.yml` nao os
alcanca. Confirmado tambem **por execucao** — no SHA julgado rodaram **apenas 2 runs, ambos `ci`**:

```
gh api "repos/thiagodorgo/ERP_Techsolutios/actions/runs?head_sha=3a0ea095..."
  35655321306  ci  pull_request  success
  35655315031  ci  push          success
```

Zero run de `deploy-staging`, `deploy-production`, `backup-database` ou `uptime-check` no SHA.

---

## M6 — A1 RE-MEDIDA POR MIM (o inspetor declarou, no §6, que NAO mediu os passos)

Passos do job `docker`, nos **dois** eventos do head julgado:

```
run 35655315031 (evento push, ramo chore/ci-ve-o-sha-julgado)
 4 Set up Docker Buildx                                => success
 5 Log in to GHCR                                      => SKIPPED
 6 Build backend image (push to GHCR only on main)     => success
 7 Load backend image into the local daemon            => success
 8 Load builder image for the compose migrate service  => success
 9 Container smoke - write/restart/read                => success

run 35655321306 (evento pull_request) — passos 4..9 IDENTICOS, com
 5 Log in to GHCR                                      => SKIPPED
```

**`Log in to GHCR` = `skipped` no evento `push` de um ramo de bloco.** O login **nao executou**,
logo **nenhuma credencial foi apresentada ao GHCR**, e o build correu com `push: false`. O par que
o bloco promete — o portao fecha **e** o processo continua provado (build + smoke de conteiner
verdes) — esta **medido por mim**, nao herdado do relatorio.

Contabilizei os passos para nao deixar buraco: o job termina na **l.477** do `ci.yml` (o smoke e o
ultimo passo do arquivo). A lacuna de numeracao 10-12 na API e a reserva dos passos `Post`.
**Nao ha passo apos o smoke** — logo nao existe segundo caminho de publicacao dentro do job.
Os dois passos de build seguintes usam tag LOCAL (`erp-techsolutions-api:ci-smoke`,
`erp-o6r-smoke-migrate:latest`) com `push: false` — nao tocam `ghcr.io`.

---

## M7 — numeros do briefing, re-medidos (nao herdados)

```
gh api .../commits/3a0ea095cbba.../check-runs --jq '.total_count'   -> 14
conclusoes: 14 success (7 nomes x 2 eventos); zero queued/in_progress/cancelled
PR #388  head 43557a17  -> check-runs = 0
PR #389  head 738ff531  -> check-runs = 0
```

**14/14 confere, e o "0 em #388/#389" confere.** O inspetor re-mediu o 14/14 e declarou
explicitamente **nao** ter medido o 0 de #388/#389 — **eu medi**: confirma.

---

## M8 — caca a segredo versionado (mandato permanente desta cadeira)

```
git diff aadaa6d5 3a0ea095 | grep "^+" | grep -v "^+++"   -> 528 linhas adicionadas
grep -iE "AKIA|ASIA|aws_secret|aws_access|COGNITO_|BEGIN .*PRIVATE KEY|api[_-]?key|
          client[_-]?secret|SESSION_SECRET|DATABASE_URL=|postgres://<u>:<p>@|redis://<u>:<p>@|
          ghp_|gho_|github_pat_|xox[baprs]-|sk-[A-Za-z0-9]{20,}|eyJ[A-Za-z0-9_-]{10,}\."
  -> ZERO ocorrencia

.gitignore (head):  .env  ·  .env.*  ·  !.env.example
git ls-tree -r --name-only 3a0ea095 | grep "\.env"   -> somente .env.example
```

**Zero segredo versionado no diff. Higiene de `.env*` correta. NAO ha PARADA IMEDIATA IRREDUTIVEL**
(exposicao de segredo) neste objeto.

O bloco tambem **nao toca `src/`, `tests/` nem rota alguma**, logo nao ha superficie nova de
payload/auditoria a auditar contra a allowlist do §2.8 — nenhuma resposta ou log de aplicacao e
alterado por este diff.

---

## M9 — o alcance corrigido do defeito (A2), lido no `deploy-production.yml` da ref

`on: workflow_dispatch` com `promote_sha` e `rollback_rehearsed`; job sob
`if: vars.PROD_DEPLOY_ENABLED == 'true'`. As tres travas, lidas linha a linha (l.60-122):

| Trava | O que EXIGE | Depende do GHCR? | Publicar por ramo a afeta? |
|---|---|---|---|
| **(a)** l.66-85 | ata `J-SAN-PROD-GOLIVE-<SHA>.md` **lida da `main`** via API, e que ela cite o SHA | **nao** | **nao** — fica de pe |
| **(b)** l.86-109 | run **completo** de `deploy-staging` no MESMO `head_sha`, com job `deploy`=`success` **e** step `Smoke staging`=`success` (run `skipped` e explicitamente rejeitado) | **nao** | **nao** — e mais: como `deploy-staging.yml` so dispara em **push na `main`**, a trava (b) **exige que o SHA tenha passado pela `main`** |
| **(c)** l.110-122 | `rollback_rehearsed == true` (auto-atestado pelo despachante) **+** `docker manifest inspect ghcr.io/.../erp-backend:${SHA}` **existir** | **SIM** | **SIM** |

Texto literal da mensagem de erro da trava (c), l.118:

```
::error::imagem GHCR erp-backend:${SHA} nao encontrada — a promocao e POR IMAGEM (mesmo
artefato validado). Garanta que o SHA foi mergeado na main e publicado no GHCR.
```

**A correcao do desenvolvedor esta CERTA, e eu a confirmo lendo o arquivo:**

1. **NAO alcanca producao direto.** As travas (a) e (b) sao independentes do GHCR; e (b), em
   particular, **so pode ser satisfeita por um SHA que passou pela `main`**, porque o
   `deploy-staging.yml` nao possui outro gatilho. Duas das tres travas continuam de pe.
2. **O que o defeito faz e esvaziar a trava (c) em silencio.** Ela testa **existencia da imagem** e
   trata isso como prova de merge na `main` — a propria mensagem de erro **declara a premissa por
   escrito**. Publicar por ramo tornaria a existencia da imagem verdadeira para codigo **nao**
   mergeado, e a trava passaria a **nao discriminar nada, sem emitir sinal**. Degrada de "prova de
   merge + simetria de rollback" para "existe alguma imagem".

**Veredito sobre A2: alcance corrigido ACEITO.** Registro que o enquadramento corrigido e **mais
preciso, nao mais brando**: uma trava que passa a aprovar sem discriminar e pior que uma que falha,
porque nao avisa. O desenvolvedor reportou divergencia contra o proprio mandato e a mediu — conduta
correta pelo §A2 (nao escolher um lado em silencio).

---

## M10 — ACHADOS DA CADEIRA

### A-C1-01 — `workflow_dispatch` na `main` passa a publicar no GHCR
gravidade: `nota` · escopo: `dentro-do-bloco`

**Evidencia.** O bloco acrescenta `workflow_dispatch:` (sem filtro de ramo — a sintaxe nao admite)
e troca o portao de `event_name` para `ref`. Cruzando as duas mudancas (tabela M2-bis): com o
portao ANTIGO um `workflow_dispatch` **nunca** publicava (o `event_name` vale `workflow_dispatch`,
nao `push`); com o NOVO, um dispatch **na `main`** satisfaz `github.ref == 'refs/heads/main'` e
**executa o login e publica** `:${SHA}` e `:latest`.

**Motivo de nao bloquear.** O invariante que esta cadeira protege e *so codigo da `main` vira
artefato* — e ele **continua valido**: `workflow_dispatch` recebe um **ref**, nunca um SHA
arbitrario, entao dispatch na `main` publica o **tip da `main`**, codigo ja mergeado e julgado.
Dispatch em ramo cai no portao (false). Nao existe caminho de dispatch que publique codigo nao
mergeado. E o ator precisa de acesso de escrita, que ja lhe permitiria empurrar para a `main`.
E **alargamento de superficie documentado, nao quebra de invariante**. Declaro para a ata porque e
consequencia REAL do cruzamento das duas mudancas e **nao esta escrita em lugar nenhum** — nem no
comentario do `ci.yml`, nem no relatorio do dev, nem no comando do bloco — e a proxima cadeira que
auditar este portao vai reencontra-la do zero.

### A-C1-02 — o lado `main` do portao novo nao esta provado por execucao
gravidade: `nota` · escopo: `dentro-do-bloco`

**Evidencia.** Os dois runs do head julgado provam o portao **fechando** (`Log in to GHCR` =
`skipped`, M6). O portao **abrindo** na `main` nao pode ser provado antes do merge — nao existe run
da `main` com a expressao nova. O que medi foi o comportamento sob o portao ANTIGO, no ultimo run
de push na `main` (`35521761719`, head `aadaa6d5`):

```
Log in to GHCR                              => success
Build backend image (push ... only on main) => success
```

Hoje a `main` publica; se a expressao nova estivesse errada, a `main` **pararia** de publicar.

**Motivo de nao bloquear.** A direcao da falha e **fail-closed**: se `github.ref` nao casasse, o
efeito seria *deixar de publicar*, e a consequencia a jusante seria a **trava (c) do
`deploy-production.yml` falhar e barrar a promocao** — nunca publicar a mais. Nao e risco de
seguranca, e risco funcional, e se manifesta com erro visivel no primeiro deploy. Alem disso,
`github.ref` valer `refs/heads/<ramo>` em evento `push` e comportamento documentado e estavel do
GitHub Actions. Fica como **verificacao pos-merge** (o porteiro confere, no primeiro run da `main`,
que `Log in to GHCR` = `success`), nao como defeito.

### A-C1-03 — `permissions: packages: write` segue concedido nos runs de ramo
gravidade: `nota` · escopo: `pre-existente`

**Evidencia.** `ci.yml` l.397-399, no job `docker`:

```
    permissions:
      contents: read
      packages: write
```

**Evidencia de origem (escopo):** o bloco nao tocou esse trecho — o `git diff aadaa6d5 3a0ea095`
altera somente os 5 pontos listados no M1, e o bloco `permissions` nao esta entre eles. A linha vem
do Ω-INFRA-1 e ja valia para os runs de `pull_request` antes deste bloco. O que o bloco faz e
**ampliar o contexto** em que o privilegio e concedido sem uso (agora tambem em push de ramo).

**Motivo de nao bloquear.** Privilegio concedido nao publica sozinho: publicar exige o login
(medido `skipped`) e `push: true` (medido `false`). O `GITHUB_TOKEN` com `packages: write` nunca e
apresentado a registry nenhum nos runs de ramo. Defesa em profundidade pediria condicionar o
escopo, mas **nao ha caminho executavel** a partir do que este objeto entrega. `pre-existente` nao
reprova (§C7.1-ter(a)) — fica como **pendencia nomeada**, dono sugerido: o proximo bloco que
revisitar o job `docker`.

### A-C1-04 — conteudo de workflow controlado por ramo passa a executar sem PR
gravidade: `nota` · escopo: `pre-existente`

**Evidencia, e por que NAO e classe nova.** Com o gatilho `push` em ramo, o `ci.yml` **da propria
branch** e o que executa: quem empurra a branch controla o workflow. Verifiquei se isso cria classe
nova de exposicao — **nao cria**. O gatilho `pull_request` ja executava o `ci.yml` do merge ref
(que inclui as alteracoes do proprio PR ao `ci.yml`), com segredos disponiveis por ser PR do mesmo
repositorio. A classe "conteudo de workflow controlado pelo autor da branch executa com
`packages: write`" e, portanto, **anterior a este bloco**. O que muda e a **visibilidade**: antes
exigia abrir um PR, agora basta o push. Acesso de escrita ao repositorio e exigido nos dois casos.

**Motivo de nao bloquear.** Classe pre-existente, mesma barreira de acesso, e o portao que este
bloco instala e imune a ela na direcao que importa: um ramo que **nao** mexa no `ci.yml` nao
publica. Registro porque e a resposta explicita a pergunta do meu mandato — *sobrou caminho em que
push de ramo produza publicacao?* — e a resposta honesta e: **somente alterando o proprio portao,
o que ja era possivel antes pelo outro gatilho.**

### A-C1-05 — `cache-to: type=gha,mode=max` passa a ser escrito por runs de ramo
gravidade: `nota` · escopo: `dentro-do-bloco`

**Evidencia.** `ci.yml` l.433-434, passo `Build backend image`: `cache-from: type=gha` e
`cache-to: type=gha,mode=max`. Com o gatilho novo, esse passo passa a **escrever** cache de Actions
a partir de ramos de bloco (antes, so `main` e `pull_request`).

**Motivo de nao bloquear.** O escopo de cache do Actions isola por ref: um run de ramo escreve no
escopo **do proprio ramo**; caches da `main` (default branch) sao legiveis pelos ramos, mas um ramo
**nao sobrescreve a entrada da `main`**. Logo nao ha envenenamento ramo -> `main` da imagem que a
`main` publica. E o dado em cache e camada de build do Dockerfile, sem segredo — o unico segredo do
arquivo nao entra em camada (M3). E consumo de cota, nao risco de artefato.

### A-C1-06 — a trava (c) chama-se "imagem anterior existe" mas inspeciona a imagem ATUAL
gravidade: `nota` · escopo: `pre-existente`

**Evidencia.** `deploy-production.yml` l.110: o passo se chama
`"Trava (c) — rollback ensaiado + imagem anterior existe"`, e a sua mensagem final diz
`"rollback simetrico possivel"`. Mas o unico `docker manifest inspect` do passo (l.117) e sobre
`erp-backend:${SHA}` — a imagem **que esta sendo promovida**, nao a imagem **N-1** para a qual o
rollback voltaria. Nenhuma linha do passo consulta a imagem anterior.

**Evidencia de origem (escopo):** `deploy-production.yml` **nao esta no diff deste bloco** — o
diff toca 14 arquivos e nenhum workflow alem do `ci.yml` (confirmado no `diff --stat` do objeto).
Defeito anterior ao bloco.

**Motivo de reportar assim mesmo.** Encontrei-o lendo o arquivo por ordem do briefing (conferir a
correcao do alcance), e ele **compoe** com o defeito que este bloco conserta: a trava (c) ja era a
mais fraca das tres, e a promessa que o nome dela faz (simetria de rollback verificada) nao esta
implementada. `pre-existente` **nao reprova** (§C7.1-ter(a)); vira **pendencia nomeada**, dono
sugerido: o bloco da trilha de infra/go-live que revisitar `deploy-production.yml`.

---

## M11 — A7 (`npm test` nao rodou localmente): a posicao desta cadeira

Medi o que sustenta a decisao, em vez de opinar:
- o diff do bloco sao **14 arquivos**, **nenhum** em `src/`, `tests/`, `prisma/`, `infra/` ou
  lockfile (conferido no `diff --stat` do objeto);
- a suite backend **rodou no SHA julgado**, no CI, com Postgres e Redis reais: job `backend` =
  `success` nos **dois** runs (M7), e e exatamente esse o artefato que o bloco existe para criar.

**Posicao: BASTA — e pelo motivo que e a tese do proprio bloco.** A execucao no SHA julgado, por
maquina, e evidencia mais forte que a execucao local do dev: e reproduzivel, datada e auditavel por
terceiro (eu a reli por `gh api`, sem depender da palavra dele). Exigir a execucao local aqui seria
preferir a afirmacao nao verificavel a prova verificavel. **Sem achado.**

---

## M12 — o que esta cadeira NAO mediu (limite declarado)

- **KPI, §C3.5, espelho Codex e texto normativo** (`CLAUDE.md`/`AGENTS.md` §C7.1-bis, corpos do
  inspetor): materia da **C3**. Nao votei sobre eles.
- **Globs de ramo conferidos contra `git branch -r` real (A5), deriva do Flutter (A6) e semantica
  do `concurrency` (A12)**: materia da **C2**. Usei o `concurrency` so onde ele toca o portao
  (M2), sem julgar a dedupe.
- **Conteudo do cache do GHA** (A-C1-05): afirmo o modelo de isolamento por ref do Actions como
  conhecimento de plataforma, nao como medicao minha — por isso o achado e `nota` e nao `ajuste`.
- **`blocks_completed` 165 -> 166 (A8)** e **backfill do #390 (A9)**: materia da C3.

---

## VEREDITO DA CADEIRA C1: **APROVADO**

6 achados, **todos `nota`** — 3 `dentro-do-bloco` (A-C1-01, 02, 05) e 3 `pre-existente` com
evidencia de origem (A-C1-03, 04, 06). **Zero `bloqueia`, zero `ajuste`.**

**Por que aprovo, na materia desta cadeira.** A pergunta que me coube nao era "os dois portoes
foram corrigidos" — era **se sobrou caminho**. Medi os tres caminhos possiveis e os tres estao
fechados:

1. **Dentro do `ci.yml`:** a mudanca de gatilho trocaria em silencio o sentido de *toda* condicao
   `github.event_name == 'push'`. Contei: a base tinha **exatamente duas**, e as duas eram o
   portao do GHCR. O head tem **um unico `if:` no arquivo inteiro**, e e o portao. Nao ha terceiro
   lugar.
2. **Fora do `ci.yml`:** os outros quatro workflows nao tem gatilho de push em ramo
   (`deploy-staging` so `main`; `deploy-production` so dispatch; os dois restantes so schedule).
   Confirmado tambem por execucao: no SHA julgado rodaram **2 runs, ambos `ci`**.
3. **Por execucao, no proprio objeto:** `Log in to GHCR` = **`skipped`** nos dois eventos —
   nenhuma credencial foi apresentada ao GHCR — com `Build backend image` e o smoke de conteiner
   **`success`**. O portao fecha **e** o processo continua provado.

Somo a isso: zero segredo versionado em 528 linhas adicionadas, higiene de `.env*` correta, e
nenhum dos criterios de VETO desta cadeira acionado (segredo versionado · gate de producao do
`env.ts` afrouxado · CORS `*`/TLS off · segredo ou PII em resposta/log/auditoria) — os tres
ultimos **nao se aplicam**, porque o diff nao toca `src/`.

**Sobre a materia que o briefing mandou julgar:**
- **A2 (alcance corrigido): ACEITO.** Li o `deploy-production.yml` na ref, trava a trava. O
  desenvolvedor esta certo nos dois sentidos — nao alcanca producao direto (travas (a) e (b) sao
  independentes do GHCR, e (b) so pode ser satisfeita por SHA que passou pela `main`) **e** o
  dano real e esvaziar a trava (c), que trata existencia da imagem como prova de merge, com a
  premissa escrita na propria mensagem de erro. Enquadramento mais **preciso**, nao mais brando.
- **A7 (`npm test` local): BASTA.** O diff nao toca `src/` nem `tests/`, e a suite rodou no SHA
  julgado, por maquina, com servicos reais — evidencia auditavel por terceiro, que eu reli por
  `gh api` sem depender da palavra do dev. E a tese do proprio bloco.

**As duas mudancas sao mesmo inseparaveis**, e isso nao e retorica do comando: com o gatilho novo
e **sem** a correcao do portao, `github.event_name == 'push'` seria **verdadeiro** em todo push de
`chore/**`, `fix/**`, `feat/**` e `docs/**` — a celula que a tabela M2-bis marca como
"**true (seria!)**". O bloco teria aberto, sozinho, o caminho que esta cadeira existe para vigiar.

**O que levo para a ata como pendencia nomeada** (nenhuma reprova): A-C1-01 e A-C1-02 pedem uma
linha de registro (o alargamento do dispatch; a conferencia pos-merge do portao abrindo na `main`);
A-C1-03, A-C1-04 e A-C1-06 sao pre-existentes com dono sugerido.

## Limpeza (§C5)

Worktree proprio `C:/Users/AMP/w-j-sanb1-c1` criado e **removido por identificador MEU** ao fim.
Nenhum conteiner subido; a base viva (`erp-postgres`/`erp-redis`) **nunca foi alvo**; nenhum
`prune`/`clean`/`stash`/`checkout`/`reset` em arvore alguma. Medicoes foram leitura (`git show`,
`git grep <sha>`, `git diff`) e `gh api`. Residuo alheio — a mutacao viva da arvore principal e o
worktree `w-s1` — **reportado pelo inspetor e nao varrido por mim** (remocao so por identificador
deste bloco).

— `agente-secops` · cadeira C1 · Opus 5 (`claude-opus-5[1m]`) · 2026-09-21

## Anexo — anomalia de terreno observada (sem efeito no merito)

Registro por disciplina, ainda que nao afete o meu voto. No inicio da minha passada (18:41) o
`git worktree list` incluia `C:/Users/AMP/w-insp-san300` (`7822deaf`, detached) — o worktree do
inspetor da junta irma `B-SAN3-00` (PR #392), citado na ressalva R3. Ao fim da minha passada
(18:58) ele **nao consta mais da lista nem existe em disco**.

**Nao fui eu.** O unico `git worktree remove` que executei nomeia explicitamente o meu proprio
caminho (`C:/Users/AMP/w-j-sanb1-c1`), e `remove` nao alcanca outras entradas. A explicacao provavel
e que a sessao irma encerrou e limpou o proprio terreno no intervalo. Anoto porque a licao de
2026-09-04 desta casa e que **remocao se faz por identificador de bloco** e que **anomalia de
terreno se anota mesmo sem efeito no merito** — se a sessao irma ainda estiver viva e sentir falta
do worktree, o registro de horario acima ajuda a datar o evento.
