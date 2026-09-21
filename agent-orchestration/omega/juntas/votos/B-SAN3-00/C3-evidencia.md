# C3 — evidencia (agente-ci-doutor), junta do B-SAN3-00 (PR #392, objeto 7822deaf)

- **Papel:** cadeira C3 — bateria, regressao e contagens. **Julgo, nao conserto** (§C7.4-bis).
- **Modelo:** `claude-opus-5[1m]`.
- **Corpo aplicado:** `.claude/agents/agente-ci-doutor.md`. Confirmado por execucao propria em M-9
  que o corpo e IDENTICO nos tres lugares (head 7822deaf, raiz demo/investidor, worktree san300).
- **Forma geral:** git-bash com `export MSYS_NO_PATHCONV=1`; exit code capturado por variavel
  (`cmd > arq 2>&1; ec=$?`), **nunca por pipe**; leitura do objeto por `git show 7822deaf:<caminho>`;
  md5 **EOL-neutro** (`tr -d` do CR) sempre que comparo texto, porque `core.autocrlf=true` e os
  rastreados estao `i/lf w/crlf` — `diff` cru mentiria.
- **Gravacao incremental (P1/P2):** esqueleto gravado antes da primeira medicao; medicoes apensadas
  em ordem de execucao. Nao havia instancia anterior desta cadeira (pasta so tinha C2).

## 0. Declaracao de participacao previa (resposta R-2 do orquestrador)

**Declaro:** a identidade `agente-ci-doutor` **ja votou** sobre o `PLANO_SAN3.md` — cadeira C3 do
**ciclo 2** do plano, voto **APROVADO**, registrado em
`agent-orchestration/omega/juntas/J-SAN3-plano-ciclo2.md`. Este bloco **emenda o §5 daquele plano**.
Provo a participacao **por execucao**, nao por releitura do meu proprio texto — ver M-9.

---

## M-0. Terreno proprio (isolamento) — MEDIDO

```
git worktree add --detach C:/Users/AMP/w-j-san300-c3 7822deaf   -> ec=0
git -C <repo> worktree list | grep c3 -> C:/Users/AMP/w-j-san300-c3   7822deaf (detached HEAD)
```
**O caminho que SAIU e o caminho pedido** (`C:/Users/AMP/w-j-san300-c3`) — nao houve a resolucao para
`C:/c/Users/...` que o briefing avisou ter ocorrido em outra cadeira desta rodada. Conferido por
`worktree list`, nao pela string que passei.

```
git rev-parse HEAD              -> 7822deaf9afabd076d1095eaf48a6dfb635e5401
git status --porcelain -uall    -> (vazio)
gh pr view 392 --json headRefOid,mergeStateStatus,mergeable,state
   -> 7822deaf9afabd076d1095eaf48a6dfb635e5401 / CLEAN / MERGEABLE / OPEN
```
O head do PR **e** o objeto. `npm ci` PROPRIO na raiz (ec=0) e no `frontend/` (ec=0).
**Sem junction**, conferido por execucao:
```
fsutil reparsepoint query C:\Users\AMP\w-j-san300-c3\node_modules           -> "nao e um ponto de nova analise"
fsutil reparsepoint query C:\Users\AMP\w-j-san300-c3\frontend\node_modules  -> "nao e um ponto de nova analise"
```
**Nao ha `.env` no meu worktree** (`ls -la .env` -> *No such file or directory*) — logo `DATABASE_URL`
e `REDIS_URL` so podem vir do ambiente que eu exportei. Isto fecha **por construcao** a possibilidade
de a minha bateria ter caido na base viva por heranca de `.env`.

Conteineres DESCARTAVEIS meus, nomeados com o identificador deste bloco/cadeira:
```
docker run -d --name j-san300-c3-pg    ... -p 127.0.0.1:56840:5432 postgres:16      -> ec=0
docker run -d --name j-san300-c3-redis ... -p 127.0.0.1:56841:6379 redis:7-alpine   -> ec=0
netstat -an | grep -E ":(56840|56841)" (antes) -> vazio (portas livres)
```
Portas **fora** da faixa excluida 58284-58483 e **diferentes** da 5432 (outro projeto) e da 5433
(`pastrack-teste-banco-teste-1`, outro projeto). Estado da base viva ANTES e DEPOIS:
`erp-postgres` **Exited (255) 10 days ago**, `erp-redis` **Exited (255) 3 days ago** — **nao receberam
um comando**.

Banco NOVO `erp_c3`:
```
npm run db:generate       -> ec=0
npx prisma migrate deploy -> ec=0   "All migrations have been successfully applied."
```

---

## M-1. CI do objeto — 7 check-runs, 7 verdes — CONFIRMADO POR MEDICAO PROPRIA

```
gh api repos/thiagodorgo/ERP_Techsolutios/commits/7822deaf/check-runs --jq .total_count -> 7
```
| check-run | status | conclusion | janela (UTC) |
|---|---|---|---|
| backend | completed | success | 21:22:47 -> 21:29:48 |
| backend-postgres | completed | success | 21:22:47 -> 21:25:46 |
| frontend | completed | success | 21:22:47 -> 21:24:35 |
| owner-portal | completed | success | 21:22:47 -> 21:23:03 |
| authority-portal | completed | success | 21:22:47 -> 21:23:02 |
| flutter | completed | success | 21:22:47 -> 21:25:20 |
| docker | completed | success | 21:29:51 -> 21:32:38 |

**Tempo de CI do objeto:** primeiro job inicia 21:22:47; o ultimo (`docker`, que depende de
`backend`/`backend-postgres`/`frontend`) termina 21:32:38 -> **9 min 51 s de ponta a ponta**.

**Algum job que DEVERIA ter rodado nao rodou? NAO.** Provado pela FONTE, nao pela contagem:
- `git ls-tree -r --name-only 7822deaf -- .github/workflows` -> 5 workflows. So o `ci.yml` dispara em
  `pull_request: branches: [main]`. Os outros quatro nao podiam rodar: `deploy-staging` so em `push`
  na main + gate `STAGING_DEPLOY_ENABLED`; `deploy-production` gated por `PROD_DEPLOY_ENABLED`;
  `backup-database` e `uptime-check` sao cron/gated por repo variable.
- `ci.yml` declara **exatamente 7 jobs**: backend, backend-postgres, frontend, owner-portal,
  authority-portal, flutter, docker. **7 declarados = 7 executados = 7 verdes.**
- `grep -nE "^\s*(paths|paths-ignore|if):"` no `ci.yml` -> **uma unica** ocorrencia, l.389
  (`if: github.event_name == push`, dentro de um STEP do `docker`, so para o push ao GHCR).
  **Nenhum filtro de `paths` e nenhum `if` de JOB.** Este e exatamente o ponto em que um bloco que so
  mexe em `.gitignore`/`agent-orchestration/**` poderia ter recebido um CI amputado por filtro de
  caminho — o repositorio nao tem filtro nenhum, entao a suite inteira roda no gate.

---

## M-2. O denominador do CI x o denominador publicado — MEDIDO NO LOG DO PROPRIO CI

Baixei o log dos jobs do objeto (`gh api repos/.../actions/jobs/<id>/logs`), run `35656811954`:

```
job backend  (106522395433):
  [run-backend-tests] CORE_SAAS_PERSISTENCE=memory - herdado do ambiente (exportado por quem chamou)
  [run-backend-tests] 287 arquivo(s) de teste - executando...
  # tests 3054 / # pass 3052 / # fail 0 / # cancelled 0 / # skipped 2 / # todo 0
  # duration_ms 325906.015929   (325,9 s)

job frontend (106522395679):
  # tests 1202 / # pass 1202 / # fail 0 / # cancelled 0 / # skipped 0 / # todo 0
  # duration_ms 50865.084241    (50,9 s)
```

**O CI, no proprio objeto julgado, publica 3052/3054 em 287 arquivos e 1202/1202** — identico ao que o
dev publicou. E o denominador **e o mesmo**, por construcao do gate:
- o job `backend` roda `npm test` -> o MESMO `node scripts/run-backend-tests.mjs`, mesma expansao em
  JS (nao depende de shell), com `DATABASE_URL`/`REDIS_URL` de service container e
  `CORE_SAAS_PERSISTENCE: memory` exportado (ci.yml l.15-20);
- o job `frontend` roda `npm --prefix frontend run test:smoke` -> lista **explicita** de arquivos no
  `frontend/package.json` (142 arquivos), a mesma que rodo aqui;
- **nao ha subconjunto no gate**: `backend-postgres` e um job ADICIONAL (roteia um subconjunto curado
  contra Postgres real com `RBAC_DB_PARITY=1`), nao um substituto da suite.

**Os 2 `skipped` nao sao buraco, e nao sao anonimos.** O proprio runner nomeia o orcamento
(`scripts/run-backend-tests.mjs`, `const SKIP_BUDGET_DB = 2`, com os dois testes escritos por extenso:
os dois de `tests/permission-catalog-db-parity.test.ts`, gated por `RBAC_DB_PARITY != 1` — so o job
`backend-postgres` liga essa var) e o guard e MONOTONICO: com `DATABASE_URL` presente, `skipped > 2`
REPROVA. O numero 2 e um teto executavel, nao uma observacao.

---

## M-3. Indice de pendencias — SAIDA DO GERADOR, provado por md5 EOL-neutro

```
git show 7822deaf:agent-orchestration/controle/pendencias-indice.md | tr -d CR | md5sum
   -> 8dd1f459323c410fd3a1b4a06625126d
python3 agent-orchestration/controle/gerar-indice-pendencias.py    -> ec=0
   saida LITERAL do gerador:
   "indice: 411 cabecalhos / 400 IDs | {FECHADA: 110, ABERTA: 301}
    | baldes {-: 110, C: 69, B: 100, A: 132} | diferidas-materiais 13"
tr -d CR < agent-orchestration/controle/pendencias-indice.md | md5sum
   -> 8dd1f459323c410fd3a1b4a06625126d      (IDENTICO ao commitado)
git diff --numstat -- agent-orchestration/controle/pendencias-indice.md  -> (vazio)
```
**Bate nas duas reguas.** Os numeros publicados pelo dev — **411 cabecalhos / 400 IDs, 110 FECHADAS,
301 ABERTAS** — sao a **saida literal do gerador**, nao varredura propria. Rodei o gerador na MINHA
arvore descartavel e o conteudo ficou identico, logo o commitado ja era saida do gerador.

**Nota de terreno (nao e defeito do bloco):** o gerador escreve com `newline=''` (LF) e o checkout no
Windows entrega CRLF, entao **depois de regenerar o arquivo aparece ` M` no `git status`** com
`git diff --numstat` **VAZIO**. Medi as duas coisas: conteudo identico (md5 EOL-neutro igual ao blob do
head), so o EOL de disco mudou (`git ls-files --eol` passou de `w/crlf` para `w/lf`). Restaurei com
`git checkout --` **na minha arvore**; `git status --porcelain -uall` voltou a vazio. Registro para que
a proxima cadeira nao leia isso como mutacao viva (classe `reference-phantom-modified-files-autocrlf`).

---

## M-4. As tres trilhas carregadas com nota (§C3.3) — MEDIDO NAS DUAS PONTAS

**Ponta 1 — o PR realmente nao toca a trilha:**
```
git diff --name-only aadaa6d5..7822deaf -- src tests frontend mobile prisma scripts .github -> (VAZIO)
```
Re-executado por mim no meu worktree; nao herdado do dev nem do inspetor.

**Ponta 2 — o valor carregado E o ultimo valor oficial:** li os dois blobs de `Kpis/kpis-latest.json`
(base e head) por `node` e comparei campo a campo:

| metrica | base `aadaa6d5` | head `7822deaf` | veredito |
|---|---|---|---|
| `backend_tests` value/total | 3052 / 3054 | **3052 / 3054** | carregado, inalterado |
| `frontend_smoke_tests` | 1202 / 1202 | **1202 / 1202** | carregado, inalterado |
| `flutter_tests` | 864 / 864 | **864 / 864** | carregado, inalterado |
| `flutter_modules` | 17 / 17 | 17 / 17 | inalterado |
| `mvp_demo` / `mvp_vendavel` | 99 / 88 | **99 / 88** | INTOCADOS (§C3.4) |
| `blocks_completed` | 165 | **166** | +1, nota cita a origem (`origin/main@aadaa6d5` = 165) |
| `release.pr` / `merge_commit` / `approved_head` | 390 / null / null | **null / null / null** | `null` na autoria (§C3.5) |

**A nota de cada trilha, lida inteira:**
- `backend_tests` — declara **CONFIRMACAO POR REGRESSAO, nao medicao do PR**; nomeia conteiner
  (`san300-pg`/`san300-redis`), portas (56820/56821), banco novo (`erp_san300`), `migrate deploy` ec=0,
  287 arquivos / 3054 / 3052 / fail 0 / skip 2 / 383 s; e diz: *"O numero continua CARREGADO por
  §C3.3 ...; a regressao so prova que o valor herdado ainda e verdade no head do bloco."*
- `frontend_smoke_tests` — mesma forma, 1202/1202, 50,4 s, "Continua CARREGADO".
- `flutter_tests` — **"SEM confirmacao por regressao: a trilha Flutter NAO foi reexecutada neste PR
  ... e isto esta dito para que ninguem leia a confirmacao das outras duas trilhas como se valesse
  para esta."**

A separacao e a que o §C3.3 exige, e a trilha **nao** executada esta **nomeada** em vez de escondida
atras das outras duas.

**Backfill da divida 1, conferido no history:** 162 entradas; a do `B-SAN3-04a` traz
`pr 390`, `merge_commit aadaa6d51be950e152ca6a6f15327bc9989039de`,
`approved_head a62d04e2bbe42533e58639643a19104bdccc0ab6` — backfill APLICADO. A entrada nova
(`B-SAN3-00`) traz `backend_tests "3052/3054"`, `frontend_smoke_tests "1202/1202"`,
`flutter_tests "864/864"`, `blocks_completed 166`, `pr/merge_commit/approved_head` **null**.

**Mudanca de formato conferida (podia ter quebrado o grafico em silencio):** as entradas anteriores
gravavam `frontend_smoke_tests: 1193` e `flutter_tests: 864` como NUMERO; a nova grava STRING
(`"1202/1202"`, `"864/864"`). Rodei o parser REAL do painel (`metricPass`, extraido do proprio
`Kpis/app.js`) sobre as 4 ultimas entradas do history:
```
B-SAN3-01        backend=2996 smoke=1173 flutter=864
B-SAN3-01-ciclo2 backend=2996 smoke=1193 flutter=864
B-SAN3-04a       backend=3052 smoke=1202 flutter=864
B-SAN3-00        backend=3052 smoke=1202 flutter=864
```
`metricPass` normaliza `"1202/1202"` -> `1202`. **A serie do painel nao quebra** e nao aparece ponto
zero/NaN. Sem defeito.

---

## M-5. A BATERIA §9 do comando — RE-EXECUTADA POR MIM NO HEAD JULGADO

Forma: worktree detached meu em `7822deaf`, `npm ci` proprio, sem `.env`, `DATABASE_URL` e `REDIS_URL`
**so no ambiente** apontando para os meus conteineres, `CORE_SAAS_PERSISTENCE=memory` (a forma do job
`backend` do CI). `ec` lido de variavel, nunca de pipe.

| comando do §9 | meu ec | numero |
|---|---|---|
| `npm run check` | **0** | — |
| `npm run lint` | **0** | — |
| `npm test` | **0** | **287 arquivos · 3054 testes · pass 3052 · fail 0 · skipped 2 · 399 s** |
| `npm run build` | **0** | — |
| `npm --prefix frontend run check` | **0** | — |
| `node scripts/kpi-freeze.mjs --check` | **0** | "kpi-freeze: em dia (snapshot 2026-09-21)" |
| `node --test ... tests/kpi-dashboard-charts.test.ts` | **0** | 17/17, fail 0 |
| `node --test ... tests/kpi-dashboard-contraste.test.ts` | **0** | 6/6, fail 0 |
| `node --test ... tests/kpi-achados-paridade.test.ts` | **0** | 6/6, fail 0 |
| `node scripts/sync-agent-agents.mjs --check` | **0** | "OK — 23 agentes, espelho consistente" |
| `node --check Kpis/app.js` | **0** | — |
| `git diff --check aadaa6d5..7822deaf` | **0** | sem erro de whitespace |

**ALEM do §9, porque o CLAUDE.md §9 exige e o comando nao listou:**
| `npm --prefix frontend run build` | **0** | (ver achado C3-02) |
| `npm --prefix frontend run test:smoke` | **0** | **1202 testes · pass 1202 · fail 0 · skipped 0 · 63 s** |

**Os numeros batem, e batem TRES VEZES, por caminhos independentes:**

| fonte | backend | smoke | forma |
|---|---|---|---|
| dev (relatorio) | 287 arq · 3054 · 3052 · fail 0 · skip 2 · 383 s | 1202/1202 · 50,4 s | conteineres `san300-pg`/`san300-redis`, banco `erp_san300` |
| **CI, no proprio objeto `7822deaf`** | 287 arq · 3054 · 3052 · fail 0 · skip 2 · 325,9 s | 1202/1202 · 50,9 s | service containers do runner |
| **eu** | 287 arq · 3054 · 3052 · fail 0 · skip 2 · 399 s | 1202/1202 · 63 s | `j-san300-c3-pg`/`j-san300-c3-redis`, banco `erp_c3` |

**A FORMA do dev, o que consigo e o que NAO consigo verificar — digo os dois.** Os conteineres do dev
ja foram removidos na limpeza dele (portas 56820/56821 **livres** agora), entao **nao posso** auditar a
forma dele diretamente. O que **posso** medir, e medi:
- a afirmacao "a base viva nao recebeu um comando" **e verificavel e e verdadeira**: `erp-postgres`
  esta `Exited (255) **10 days ago**` e `erp-redis` `Exited (255) **3 days ago**` — um `docker start`
  hoje teria zerado esses carimbos. Nao zeraram, nem depois da minha propria bateria. A base viva
  **nao foi alvo de ninguem** hoje;
- e o RESULTADO dele esta confirmado por **duas** execucoes independentes (CI e eu), cada uma com
  base descartavel propria. A forma nao auditavel **nao contamina a conclusao**, porque a conclusao
  nao depende dela.

## M-6. Os 2 `skipped` — NOMEADOS, ORCADOS e EXECUTADOS em outro job

Os dois pulos sao, literalmente, os mesmos na minha execucao e na do CI (mesmo ordinal, 2027 e 2028):
```
ok 2027 - toda permissão do catálogo existe na tabela permissions do banco
          # SKIP RBAC_DB_PARITY não é "1" ...
ok 2028 - os grants do papel GLOBAL batem exatamente com ROLE_PERMISSIONS (nas duas direções)
          # SKIP RBAC_DB_PARITY não é "1" ...
```
- O runner **orca** esse numero e o guard e MONOTONICO (`SKIP_BUDGET_DB = 2`; com `DATABASE_URL`
  presente, `skipped > 2` reprova) — e os dois testes estao NOMEADOS no fonte, nao anonimos.
- **E eles NAO ficam sem cobertura.** O job `backend-postgres` roteia
  `tests/permission-catalog-db-parity.test.ts` com `RBAC_DB_PARITY=1`, e no log do CI do objeto os dois
  saem **VERDES**: `ok 158 - toda permissão do catálogo...` e `ok 159 - os grants do papel GLOBAL...`,
  com `# tests 263 / # pass 263 / # fail 0 / # skipped 0` e o guard imprimindo `testes pulados: 0`.

**Conclusao: ZERO teste silenciado no gate.** Nenhum teste deletado, comentado, `.skip`/`.only`,
`it.todo` nem tolerado: o diff do bloco **nao toca `tests/` nem `frontend/tests/`** (VAZIO, medido), e o
gate roda a suite inteira, nao subconjunto.

---

## M-7. CACA A "PROVA QUE NAO PROVA" — dois controles vermelhos executados

O briefing me deu esta lente depois de a C2 mostrar que a prova de "0 rastreado passou a ser ignorado"
era tautologica. Ataquei as **minhas** provas do mesmo jeito: *ela pode falhar?*

### (a) Os guards de KPI PODEM falhar — controle vermelho executado

Adulterei, na MINHA arvore descartavel, o numero publicado de backend (`"value": 3052` -> `3053`) —
exatamente a mentira que um dev poderia contar sobre a minha superficie.

**Primeiro provei que a mutacao LANDOU** (a armadilha que o briefing avisa: ancora que nao substitui
devolve verde falso):
```
md5 Kpis/kpis-latest.json  ANTES  -> 8a4160f61e1364887b03de333d4b6460
md5 Kpis/kpis-latest.json  DEPOIS -> 0c823717a89e0a6feee3b294f20030aa   (MUDOU)
git diff --numstat         -> 1  1  Kpis/kpis-latest.json               (1 linha trocada)
grep '"value": 3053'       -> casou                                     (o novo valor esta la)
```
(o script de mutacao aborta com `exit 9` se a substituicao nao casar — nao ha verde falso por ancora)

**Resultado com o numero adulterado:**
```
node scripts/kpi-freeze.mjs --check                        -> ec=1
   "kpi-freeze: a cópia congelada do app.js DIVERGE do kpis-latest.json."
node --test --import tsx tests/kpi-dashboard-charts.test.ts -> ec=1
   # tests 17 / # pass 16 / # fail 1
```
**Restaurado e reconfirmado:** md5 de volta a `8a4160f6...`, `kpi-freeze --check` ec=0, charts 17/17.

**Conclusao:** os guards **nao** saem por construcao. Numero publicado que divergisse da copia
congelada REPROVA. (Eles nao provam que o numero corresponde a realidade — quem prova isso e a
re-execucao do M-5, que fiz.)

### (b) A regressao NAO e vacua — o diff deste PR e mesmo exercitado pela suite

A nota de `backend_tests` diz que o PR "nao exerceu esta trilha". Medi que isso e **impreciso a favor
da prudencia**: a suite **le** arquivos que este PR mudou — `tests/kpi-dashboard-charts.test.ts` e
`tests/kpi-dashboard-contraste.test.ts` leem `Kpis/*` (mudado) e `tests/kpi-achados-paridade.test.ts`
le `agent-orchestration/controle/pendencias*` (mudado). Ou seja, o `npm test` **podia** ter ficado
vermelho por causa deste PR — e ja ficou, por esta exata razao, no pre-merge do `B-SAN3-04a` (a nota
do KPI registra a passada que deu 3051/3054 com 1 FAIL em `kpi-dashboard-charts`). **A regressao e
falsificavel**, logo o verde dela vale alguma coisa. Ver achado C3-03.

### (c) ONDE a prova NAO prova — achado C3-01 (pre-existente)

O `backend-postgres` roda o subconjunto roteado assim (`ci.yml` l.255):
```
node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap
```
e o **proprio log do job**, no objeto julgado, declara o shell do step:
```
shell: /usr/bin/bash -e {0}       <- medido no log, nao suposto
```
`bash -e` **sem `pipefail`**: o status do step e o do `tee`, sempre 0. Provei a semantica por execucao:
```
bash -e -c 'false | tee /dev/null > /dev/null'          -> ec=0    (mascarado)
bash -c 'set -eo pipefail; false | tee /dev/null > /dev/null' -> ec=1    (propaga)
```
E o unico guard seguinte le **so o pulo**, nunca a falha:
```
skipped=$(grep -E '^# skipped ' postgres-subset.tap | awk '{print $3}')
test "$skipped" -eq 0 || exit 1
```
Nao ha `grep '# fail'`. **Consequencia:** um teste VERMELHO no subconjunto roteado contra o Postgres
nao derruba o job — o check-run `backend-postgres` VERDE prova que nada pulou, **nao** que tudo passou.
`ci.yml` nao tem `defaults: run: shell:` (grep -> nada), entao o default vale para todos os steps.

**Impacto NESTE objeto: NENHUM** — medi o log do job e ele saiu `# tests 263 / # pass 263 / # fail 0`.
Nada foi mascarado aqui.

**Escopo `pre-existente`, com evidencia de data E de origem:**
- origem: `git diff --name-only aadaa6d5..7822deaf -- .github` -> **VAZIO**. O bloco tem `.github/` no
  **escopo proibido** do proprio comando; nao criou e nao podia consertar;
- data: `git log -S "tee postgres-subset.tap" -- .github/workflows/ci.yml` -> **`287bda36`, 2026-08-10,
  "CHK P1 PR-03 ... (#344)"** — **42 dias** antes da base deste bloco.

Pela emenda `D-JUNTA-ESCOPO-E-CALIBRACAO` 1-ter(a), **nao reprova**: vira pendencia nomeada, com bloco
dono a nomear pela junta.

## M-8. O delta entre a bateria do dev e o objeto julgado — MEDIDO, nao assumido

O relatorio do dev cobre **9 commits** (ate `04f4837b`); o objeto julgado e `7822deaf`, um **decimo**
commit feito depois (a Emenda 2, pelo orquestrador). Se esse commit tivesse tocado `Kpis/` ou codigo, a
bateria do dev estaria defasada. Medi:
```
git diff --name-only 04f4837b..7822deaf
   -> agent-orchestration/codex/comandos/B-SAN3-00-registro-rastreavel.md   (so este)
git show --stat 7822deaf -> 1 file changed, 32 insertions(+)
```
**So o arquivo de comando, +32 linhas.** A bateria do dev nao foi invalidada pelo delta — e, de toda
forma, **eu re-executei tudo NO head julgado**, sem herdar.

## M-9. [R-2] Participacao previa — PROVADA POR EXECUCAO, nao por releitura

```
git show 7822deaf:agent-orchestration/omega/juntas/J-SAN3-plano-ciclo2.md | grep -nE "agente-ci-doutor|C3"
  l.16: | C3 — diff x regras, KPI, registro e numeros | `agente-ci-doutor` | `agente-dba-guardiao`
        | Opus 5 | carregado = ref | **APROVADO** |
git show 7822deaf:.../J-SAN3-plano-ciclo1.md | grep -n "agente-ci-doutor"
  l.15: | C3 — ... | `validador-mestre` | `agente-ci-doutor` | Opus 5 | **REPROVADO** |   <- eu era SUPLENTE
```
**Declaro:** votei **uma vez** sobre o `PLANO_SAN3.md` — cadeira **C3 do ciclo 2**, **APROVADO**. No
ciclo 1 eu era **suplente** do `validador-mestre` (nao votei). Este bloco **emenda o §5 daquele plano**.

**Por que nao morde a minha superficie, medido e nao argumentado:**
```
(extrai o §5 inteiro do PLANO_SAN3.md no head: 109 linhas)
grep -ciE "bateria|# tests|npm test|3052|3054|1202|contagem de teste"  -> 1 unica linha,
   e e a l.79, generica sobre encerramento de bloco ("plano -> dev -> bateria"), que o bloco NAO MUDOU.

git diff --numstat aadaa6d5..7822deaf -- docs/revisoes/SAN3/PLANO_SAN3.md  -> 3 / 2
```
O que o bloco mudou no §5 sao **3 linhas da tabela**: a linha nova do `B-SAN3-01b` e as duas ampliacoes
nominais (`B-SAN3-06a` -> `auth.adapter.ts`/`docs/navigation-matrix.md`; `B-SAN3-07` -> os 5 papeis
legados no `prisma/seed.ts`). **Nenhuma delas fala de bateria, contagem ou numero de teste.** Nao ha
conclusao minha anterior que este voto precise confirmar ou desdizer. (Se a ampliacao nominal conta como
"permissao" para efeito de quorum — R-3 — e questao da C1 e da ata, nao minha; **eu nao reprovo**, logo a
calibracao nao muda o resultado por mim.)

**Corpo aplicado, md5 EOL-neutro nos tres lugares:**
```
git show 7822deaf:.claude/agents/agente-ci-doutor.md | tr -d CR | md5sum -> 55979e2cc21a1e6aba6bfe36899454a0
worktree meu (7822deaf)                                                  -> 55979e2cc21a1e6aba6bfe36899454a0
raiz da sessao (demo/investidor)                                         -> 55979e2cc21a1e6aba6bfe36899454a0
```
**IGUAIS** — nao ha a divergencia de corpo que o inspetor mediu no dele (R-1 de terreno).

---

# ACHADOS

| id | titulo | gravidade | escopo |
|---|---|---|---|
| **C3-01** | O check-run `backend-postgres` e cego a FALHA do subconjunto roteado: o `node --test` e canalizado para `tee` sob `bash -e` **sem `pipefail`**, e o unico guard le so `# skipped`, nunca `# fail` | **ajuste** | **pre-existente** (`.github/` fora do diff e no escopo PROIBIDO do bloco; linha de `287bda36`, 2026-08-10, #344 — 42 dias antes da base) |
| **C3-02** | A bateria §9 declarada no comando e um subconjunto estrito do §9 do `CLAUDE.md` para a trilha front: falta `npm --prefix frontend run build` (e `test:smoke`) | **nota** | dentro-do-bloco |
| **C3-03** | A nota de `backend_tests` diz que o PR "nao exerceu esta trilha"; medi que a suite **le** arquivos que o PR mudou (`Kpis/*`, `pendencias*`) por 3 arquivos de teste — impreciso a favor da prudencia | **nota** | dentro-do-bloco |
| **C3-04** | Regenerar o indice no Windows deixa o arquivo ` M` no `git status` com `git diff --numstat` VAZIO (gerador escreve LF, checkout entrega CRLF) | **nota** | terreno, nao e do bloco |

**C3-01, por extenso.** O que o veredito do CI significa muda com isto: **6 dos 7** check-runs verdes
provam o que parecem provar; o `backend-postgres` verde prova **"nenhuma suite roteada pulou"**, nao
"todas passaram". Neste objeto nao houve dano — medi `# fail 0` no log do proprio job —, mas a
propriedade nao esta garantida por execucao. E a classe **exata** que este ciclo foi mandado cacar
("prova que nao prova"), so que do lado do arnes e **anterior** ao bloco. Por `D-JUNTA-ESCOPO-E-CALIBRACAO`
1-ter(a): **nao reprova**; vira pendencia nomeada, com bloco dono a nomear pela junta. Nao proponho
correcao (§C7.4-bis) — reporto defeito, evidencia executada e motivo.

**C3-02, por extenso.** Sem consequencia pratica neste bloco: o job `frontend` do CI roda
check + `test:smoke` + build de toda forma (li os steps), o dev rodou o smoke por conta propria, e eu
rodei os dois faltantes (ec=0 nos dois). Nomeio para que um bloco que **toque** `frontend/` nao copie a
bateria estreita deste, que e uma trilha doc/KPI.

**C3-03, por extenso.** O erro pende para o lado seguro (o dev **nao** reivindica a contagem como
medicao do PR, que e o que o §C3.3 proibe), e a imprecisao tem um efeito colateral BOM: prova que a
regressao e falsificavel. Nao ha nada a corrigir no numero.

---

# VEREDITO: **APROVADO**

Nao encontrei um defeito `bloqueia` na minha superficie, e nao ha nada que eu nao tenha conseguido medir.

**O que sustenta o voto, cada item por execucao minha no head julgado:**
1. **Bateria §9 inteira VERDE** (12 comandos, `ec` por variavel), mais os 2 que o comando nao listou.
2. **As contagens batem, tres vezes, por caminhos independentes:** dev, **CI no proprio objeto
   `7822deaf`** e eu — `287 arquivos · 3054 · pass 3052 · fail 0 · skipped 2` e `1202/1202 · fail 0 ·
   skipped 0`. Nao ha numero herdado sem execucao.
3. **O denominador e o mesmo do CI:** mesmo comando, mesmo runner (`run-backend-tests.mjs`, expansao
   em JS), mesma lista explicita do `test:smoke`, **nenhum filtro de `paths` e nenhum `if` de job** no
   `ci.yml` — o gate roda a suite inteira, nao subconjunto.
4. **A forma bate no que e auditavel:** worktree detached proprio em caminho curto, `npm ci` proprio,
   **sem junction**, **sem `.env`**, `DATABASE_URL`/`REDIS_URL` so no ambiente, banco NOVO com
   `migrate deploy` ec=0, conteineres descartaveis meus fora da 5432 e da faixa 58284-58483. E a base
   viva **nao foi alvo de ninguem hoje**, o que e verificavel e verifiquei: `erp-postgres` segue
   `Exited (255) 10 days ago` e `erp-redis` `Exited (255) 3 days ago` — carimbos que um `docker start`
   teria zerado.
5. **Zero teste silenciado.** Diff nao toca `tests/` nem `frontend/tests/` (VAZIO); os 2 `skipped` sao
   nomeados no fonte do runner, orcados por guard monotonico, e **rodam VERDES** no `backend-postgres`
   (ok 158/159, `testes pulados: 0`).
6. **As 3 trilhas carregadas com nota, provadas nas DUAS pontas** — diff vazio nas trilhas + valor
   identico ao ultimo oficial —, com a trilha Flutter **nomeada** como nao-reexecutada em vez de
   escondida atras das outras duas.
7. **Indice de pendencias = saida do gerador**, md5 EOL-neutro identico (`8dd1f459...`), com os numeros
   (411/400/110/301) saindo da boca do proprio gerador.
8. **Os guards PODEM falhar** — controle vermelho executado: adulterar o 3052 publicado derruba
   `kpi-freeze --check` (ec=1) e `kpi-dashboard-charts` (16/17, 1 fail). Nao ha verde por construcao.
9. **CI do objeto: 7 check-runs, 7 `completed`/`success`; 7 jobs declarados = 7 executados.**
   **Nenhum job que deveria ter rodado deixou de rodar** (os outros 4 workflows nao disparam em
   `pull_request`, provado nos gatilhos). **Tempo de CI: 9 min 51 s** (21:22:47 -> 21:32:38 UTC).

**Ressalva que carrego para a ata (nao muda o voto):** o achado **C3-01** encolhe o que "7 verdes"
significa — o `backend-postgres` verde nao prova que suas 263 asserções passaram, so que nao pularam.
Neste objeto passaram (medido). E pre-existente e fora do escopo permitido do bloco; a junta nomeia o
dono.

**Sobre a calibracao de quorum (R-3):** como **nao reprovo**, maioria-3 e unanimidade-3 dao o mesmo
resultado pela minha cadeira. Se houver dissidencia, a ata decide a calibracao **antes** de concluir,
como o inspetor escreveu.

---

# LIMPEZA (§C5) — o que criei e o que derrubei, pelo nome

- **Criei:** o worktree detached `C:/Users/AMP/w-j-san300-c3` (`npm ci` proprio na raiz **e** no
  `frontend/`, client Prisma gerado, banco `erp_c3`) e os conteineres **`j-san300-c3-pg`** e
  **`j-san300-c3-redis`**.
- **Derrubei, PELO NOME** (identificador desta cadeira, nunca por wildcard nem por nome de papel):
```
docker rm -f j-san300-c3-pg j-san300-c3-redis            -> ec=0 (os dois)
docker ps -a | grep j-san300-c3                          -> (vazio)
git -C <repo> worktree remove --force C:/Users/AMP/w-j-san300-c3 -> ec=0
ls C:/Users/AMP/w-j-san300-c3                            -> No such file or directory
```
- **Antes de remover, conferi que a minha arvore estava limpa** (`git status --porcelain -uall`
  vazio) — o controle vermelho do M-7(a) e a regeneracao do indice do M-3 foram **restaurados**,
  nao deixados para tras.
- **A base viva NAO recebeu um comando, e isso e verificavel:** `erp-postgres` continua
  `Exited (255) **10 days ago**` e `erp-redis` `Exited (255) **3 days ago**` — os mesmos carimbos de
  antes da minha bateria. Um `docker start` os teria zerado.
- **NAO rodei** `git worktree prune`, `git clean`, `git stash`, `git checkout` nem `git reset` em
  arvore alheia nenhuma. O unico `git checkout --` que rodei foi dentro do **meu** worktree.
- **A arvore do dev (`san300`) segue em `7822deaf`** e os worktrees alheios seguem intactos.
- **Residuo de OUTRAS sessoes, que eu REPORTO e nao varro:** entre o inicio e o fim da minha medicao
  o `git worktree list` mudou sozinho — `C:/Users/AMP/w-s1` e `.claude/worktrees/sanb1` sairam e
  apareceu `C:/Users/AMP/w-port391` (detached `b8cd22df`); a arvore principal segue em
  `demo/investidor@d1fab3bc` com mutacao viva de outra sessao. **Nada disso toca o objeto julgado** —
  eu li `7822deaf` no meu proprio checkout.
- **Logs brutos deixados no scratchpad, FORA da pasta de votos:** `c3-npmci-root.txt`,
  `c3-npmci-front.txt`, `c3-prisma-gen.txt`, `c3-migrate.txt`, `c3-npmtest.txt`, `c3-smoke.txt`,
  `c3-bat-*.txt`, `c3-guard-*.txt`, `c3-red-*.txt`, `c3-gerador.txt`, `c3-ci-backend.log`,
  `c3-ci-frontend.log`, `c3-ci-bpg.log`, `c3-hist.json`, `c3-latest-{base,head}.json`.
- **Disco: 12 GB livres antes e 12 GB depois.**

---

## M-10. Um numero que eu ia herdar, e medi (adendo)

Afirmei no M-2 que a lista do `test:smoke` tem **142 arquivos**. Esse numero aparece na nota de KPI do
bloco anterior ("141 da main + 1 do bloco = 142") e eu ia repeti-lo. Medi no objeto julgado, em vez de
herdar:
```
git show 7822deaf:frontend/package.json -> parse do script test:smoke -> 142 arquivos | duplicatas: 0
```
**142, sem duplicata.** Confirmado por execucao propria.

---

*Fim do parecer da cadeira C3. Voto em `C3-voto.json` (APROVADO, 4 achados: 1 `ajuste` pre-existente,
3 `nota`). Nenhuma correcao proposta — §C7.4-bis.*

---
---

# M-11. RE-MEDICAO DO C3-01 — **O ACHADO ERA FALSO. RETIRADO.**

> **Nada acima foi apagado.** O §M-7(c) e a linha do C3-01 no quadro de ACHADOS ficam como foram
> escritos; esta secao os **revoga** e diz por que. Quem corrige o voto e a cadeira, nao o orquestrador
> — ele deu a pista e o pedido de re-medir; a medicao abaixo e minha.

## 11.1 O que eu havia concluido, e o que estava errado

Eu concluí que o job `backend-postgres` era **cego a FALHA** porque o step canaliza `node --test` para
`tee` e o log declara `shell: /usr/bin/bash -e {0}` — sem `pipefail`. **As duas premissas eram
verdadeiras. A conclusao nao segue delas.** O `pipefail` nao e ligado na **invocacao** do shell (ali o
GitHub nao liga mesmo); e ligado na **primeira linha do proprio script**.

## 11.2 As duas linhas estao no MESMO `run:` — provado por PARSE, nao a olho

No objeto julgado `7822deaf`:
```
l.171  - name: Route suites against PostgreSQL          (indentacao 6)
l.172    run: |                                         (indentacao 8)
l.173      set -o pipefail                              (indentacao 10)  <- PRIMEIRA linha do script
...        77 linhas montando o $SUITES
l.250      node --test --import tsx $SUITES 2>&1 | tee postgres-subset.tap
l.255  - name: Fail on skipped tests (green-blind guard) (indentacao 6)  <- so AQUI comeca o step seguinte
```
Delimitei o bloco por **parse de indentacao**, nao a olho:
```
step  : - name: Route suites against PostgreSQL
run:  : l.172, indentacao 8
bloco : l.173 ate l.251  (79 linhas de script)
1a linha do script : "set -o pipefail"
tee DENTRO do bloco: true
algum "set +o"     : false
proxima linha apos o bloco: "# GUARD ANTI-VERDE-CEGO: ..."
```
**Confirmado: l.173 e l.250 sao o mesmo `run:`**, e nada desliga o `pipefail` entre as duas.

## 11.3 O drill de semantica, refeito na FORMA REAL

O GitHub executa `bash -e <arquivo-de-script>`. Entao o drill tem de ser sobre um **script cuja
primeira linha e `set -o pipefail`** — e nao sobre um `bash -e -c` que omite essa linha, que foi o que
eu publiquei.
```
# FORMA REAL (1a linha = set -o pipefail), bash -e script:
  set -o pipefail ; SUITES="a b c" ; false | tee saida.tap      -> ec=1   <- o step FALHA
# o que EU havia drilado (sem a 1a linha):
  SUITES="a b c" ; false | tee saida.tap                        -> ec=0   <- mascarado
# emulacao mais fiel (pipefail + 77 linhas de montagem + comando que imprime "# fail 3" e sai 1):
                                                                -> ec=1   <- vermelho PROPAGA pelo tee
  (e o tee capturou normalmente: "# tests 10 # fail 3")
```
**O vermelho propaga.** O job **nao** e cego a falha.

## 11.4 A refutacao estava DENTRO da evidencia que eu ja tinha

```
grep -n "set -o pipefail" c3-ci-bpg.log
  764: ##[group]Run set -o pipefail
  765: set -o pipefail
```
Eu citei a **linha 842** (o `tee`) e a **843** (`shell: /usr/bin/bash -e {0}`) do mesmo arquivo, e
**nunca subi as 78 linhas** ate o inicio do script. O log do CI imprime o **script inteiro** no cabecalho
do step: a prova contra a minha tese estava no artefato que eu proprio baixei.

## 11.5 Sobra algum caminho cego? Varri pela PROPRIEDADE, nao pela instancia

Para nao repetir o erro na direcao oposta — concluir "esta tudo bem" olhando so o bloco que me
interessava —, gerei **todas** as instancias por script a partir da fonte (a licao
`feedback-correcao-por-instancia-nao-pela-propriedade`): para **cada** bloco `run:` do `ci.yml` do
objeto, procurei pipe em posicao de comando e conferi se o bloco liga `pipefail`.
```
blocos run: encontrados = 29
blocos COM pipe e SEM pipefail = 1
  --- bloco run: l.256 ---
      skipped=$(grep -E '^# skipped ' postgres-subset.tap | awk '{print $3}')
```
O unico e o **proprio guard de pulos**, e ele e **fail-closed por construcao**:
```
skipped=$(grep -E '^# skipped ' postgres-subset.tap | awk '{print $3}')
test -n "$skipped" || { echo "não consegui ler a contagem de pulos — tratando como falha"; exit 1; }
test "$skipped" -eq 0 || { echo "suíte ... PULOU $skipped teste(s) ..."; exit 1; }
```
Se o `grep`/`awk` falharem, `skipped` sai vazio e a linha seguinte **derruba o job**. **Nao sobra
caminho em que a falha nao derrube o job.**

## 11.6 O desenho do job, dito certo

As duas travas sao **complementares**, nao redundantes, e cada uma cobre a propriedade que a outra nao
ve:
- **falha** (`node --test` sai != 0): pega pelo **`set -o pipefail` + `bash -e`** do proprio step;
- **auto-pulo** (a suite `-db` pula e sai **0**, que o `pipefail` jamais veria): pega pelo **guard de
  pulos**, que por isso le `# skipped` e nao `# fail`.

Eu havia lido a ausencia de `grep '# fail'` como buraco. Nao e: e divisao de trabalho.

# REVOGACAO EXPLICITA NO VEREDITO

A ressalva que escrevi no §VEREDITO — *"o achado C3-01 encolhe o que '7 verdes' significa: o
`backend-postgres` verde nao prova que suas 263 asserções passaram, so que nao pularam"* — esta
**REVOGADA**. O certo e:

> **Os SETE check-runs verdes provam o que aparentam.** O `backend-postgres` verde prova **as duas
> coisas**: que as 263 asserções passaram (`# fail 0`, com o vermelho propagando pelo `pipefail`) **e**
> que nenhuma pulou (`# skipped 0`, com o guard fail-closed).

**O veredito segue APROVADO, e sai mais forte.** Ele nunca dependeu do C3-01 — que era `ajuste` e
`pre-existente`, e por `D-JUNTA-ESCOPO-E-CALIBRACAO` 1-ter(a) ja nao reprovava. Com o achado retirado,
a unica coisa que muda e que o arnes do gate esta **melhor** do que eu havia descrito.

**Quadro de achados, atualizado:**

| id | gravidade | estado |
|---|---|---|
| **C3-01** | ~~ajuste~~ | **RETIRADO — FALSO** (texto original preservado no voto, em `*_original`) |
| C3-02 | nota | vale (bateria do comando e subconjunto do §9 do CLAUDE.md na trilha front) |
| C3-03 | nota | vale (a nota diz "nao exerceu a trilha"; a suite le `Kpis/*` e `pendencias*`) |
| C3-04 | nota | vale (indice ` M` no Windows por LF x CRLF, `numstat` vazio) |
| **C3-05** | nota | **NOVO** — registro do meu erro de metodo (o grep que nao podia achar o que eu procurava) |

**A licao, que e a mesma que o orquestrador registrou sobre o SHA fabricado:** a medicao respondeu a
pergunta **vizinha**. "Como o shell foi invocado?" nao e "o script liga `pipefail`?", do mesmo jeito que
"a API achou este SHA?" nao e "o CI rodou?". E o veiculo do erro, nos dois casos, foi uma ferramenta que
**nao podia** devolver a resposta certa: um `grep` por lista de padroes so encontra o que ja esta na
lista. Regra que levo: quando a conclusao for sobre uma **propriedade de um bloco**, delimitar o bloco
**inteiro por parse** e ler as **bordas** — sobretudo a primeira linha, onde moram os `set` — em vez de
inspecionar a janela ao redor da linha que me chamou a atencao.

*(Copia do voto como foi entregue antes desta re-medicao: `C3-voto.pre-remedicao.json`.)*
