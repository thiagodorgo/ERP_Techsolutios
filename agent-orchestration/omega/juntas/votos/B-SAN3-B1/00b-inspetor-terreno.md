# PARECER DO INSPETOR DE TERRENO — junta do `B-SAN3-B1` (PR #391, objeto `3a0ea095`)

> **NOTA DE SUBSTITUICAO DE MODELO (§C7.6 / D-INSPETOR-TERRENO-JUNTA):** o corpo deste papel fixa
> `model: fable`. A cota do Fable esgotou em 2026-09-21 e derrubou tres agentes; o dono decidiu que
> **cota esgotada e indisponibilidade**. Este parecer foi produzido em **Opus 5 (claude-opus-5[1m])**,
> com esta nota de substituicao, conforme a excecao ja admitida pelo contrato.

- **Papel:** `inspetor-de-terreno-da-junta`
- **Modelo:** Opus 5 (`claude-opus-5[1m]`) — substituindo Fable por indisponibilidade (ver nota acima)
- **Corpo aplicado:** carregado de `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/inspetor-de-terreno-da-junta.md`
  (md5 EOL-neutro `934a8b08`) e, por ele divergir do head julgado, **re-executado sob o corpo do head
  `3a0ea095`** (`8a7d53a5`), que e superset estrito — itens 3.1-bis, 3.3 e 4.3 inclusos. Medicao e
  fundamento no §8 deste parecer (ressalva R1).
- **Mandato:** `.../scratchpad/prompt-inspetor-B-SAN3-B1.md`
- **Briefing julgado:** `.../scratchpad/BRIEFING-B-SAN3-B1.md`
- **Data:** 2026-09-21

**VEREDITO: `LIBERADO COM RESSALVA`** — 6 ressalvas nomeadas (R1..R6), detalhadas no fim deste arquivo.

**Esqueleto preenchido por execucao, item a item (P1/P2).**

| # | Item | Estado |
|---|---|---|
| 1 | Arvore sem mutacao viva (head `3a0ea095`) | **VERDE** |
| 2 | Isolamento declarado e verificavel (sem junction) | **VERDE** |
| 3 | Insumos presentes | **VERDE** |
| 4 | Inelegibilidade + existencia das identidades | **VERDE** |
| 5 | Fatia S0 (espelho Codex) + guards de KPI | **VERDE no worktree julgado** |
| 6 | CI no objeto julgado (check-runs) | **VERDE — 14/14 success** |
| 7 | Baseline honesto | **VERDE — npm run check exit 0** |
| 8 | Plano de perda de jurado + P5 | **RESSALVA FORTE (R2, R3)** |
| 9 | Afirmacoes a re-verificar | **12 + 2 listadas (R6)** |
| 10 | Residuo de terreno | **inerte, reportado (R4, R5)** |

---
## 1. Arvore sem mutacao viva — **VERDE**

```
$ git -C .../worktrees/sanb1 rev-parse HEAD
3a0ea095cbbac36af0c21ba967e938fbe5375e83     (curto: 3a0ea095 — BATE com o briefing)
$ git -C .../worktrees/sanb1 rev-parse --abbrev-ref HEAD
chore/ci-ve-o-sha-julgado                    (BATE com o briefing)
$ git -C .../worktrees/sanb1 status --porcelain
(vazio — count:0)
```

Diff do bloco contra a base declarada (`aadaa6d5` = `origin/main`, confirmado por `git log -1 origin/main`):

```
$ git -C .../sanb1 diff --stat aadaa6d5 3a0ea095
 .agents/agents/inspetor-de-terreno-da-junta.md     |  12 ++
 .claude/agents/inspetor-de-terreno-da-junta.md     |  12 ++
 .github/workflows/ci.yml                           |  30 +++-
 AGENTS.md                                          |  14 +-
 CLAUDE.md                                          |  14 +-
 Kpis/app.js                                        |   2 +-
 Kpis/kpis-history.json                             |  19 ++-
 Kpis/kpis-history.md                               |  70 ++++++++
 Kpis/kpis-latest.json                              |  47 +++---
 .../comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md      | 183 +++++++++++++++++++++
 agent-orchestration/codex/log-execucao.md          |  71 ++++++++
 agent-orchestration/controle/pendencias-indice.md  |  13 +-
 agent-orchestration/controle/pendencias.md         |  10 ++
 agent-orchestration/docs/status-geral.md           |  71 ++++++++
 14 files changed, 528 insertions(+), 40 deletions(-)
```

### 1-bis. Arvore PRINCIPAL — mutacao viva de **OUTRA SESSAO**, reportada e NAO varrida

```
$ git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios status --porcelain
 M .agents/agents/especialistas/critico-c5-adversarial.md
 M .agents/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md
 M .claude/agents/especialistas/critico-c5-adversarial.md
 M .claude/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md
?? agent-orchestration/omega/juntas/{BRIEFING-B-O6R-02-ciclo5.md, J-B-O6R-02-ciclo5.md, TEMPLATE-J-ata.md, votos/...}
?? results.txt · scripts/audit-agents-skills.mjs
```

**Sao modificacoes REAIS, nao o ` M` fantasma de `autocrlf`** — medido por md5 do blob x arquivo:

```
.claude/agents/especialistas/critico-c5-adversarial.md   blob=be231deb...  work=dd8ff6ce...
.claude/.../jurado-c5-arnes-catalogo-postgres.md          blob=5afd6279...  work=cacc4606...
$ git -C <raiz> diff --numstat  ->  4 arquivos, +364 / -8
```

Sao os corpos dos especialistas **`c5`** do `B-O6R-02 ciclo 5` (outra sessao; a raiz esta em
`demo/investidor@d1fab3bc`, que **diverge** de `origin/main`). **Nenhum deles esta no diff deste bloco**
(o diff do `B-SAN3-B1` toca 14 arquivos, nenhum em `especialistas/`). Nao ha mutacao viva deste bloco.
**Reportado, nao varrido** (§residuo de outra sessao).

---

## 2. Isolamento — **VERDE (declarado e verificavel)**

O briefing §0 declara por escrito, e eu confirmei que o texto existe: worktree **detached proprio por
cadeira** em **caminho curto** (`C:/Users/AMP/w-j-sanb1-<cadeira>`), com a medicao de que worktree dentro do
scratchpad falha no Windows (`Filename too long`); **`npm ci` proprio**; **sem junction** (§C7.1-ter(c));
conteineres proprios com `DATABASE_URL`/`REDIS_URL` explicitas se subir banco; **5432 e de outro projeto**;
faixa **58284-58483 excluida pelo Windows**; **base viva `erp-postgres`/`erp-redis` NUNCA e alvo**; remocao
**pelo nome** ao fim. Tambem declara a armadilha de **CRLF** (ancora com `\n` nao substitui e devolve verde
falso). Isso cobre §1.2 do meu corpo integralmente.

### 2-bis. `node_modules` do worktree julgado: **diretorio real, NAO junction** — VERDE

```
powershell Get-Item -Force .../sanb1/node_modules
  Attributes=Directory :: LinkType=(vazio) :: Target=(vazio)   <- sem reparse point
ls .../sanb1/node_modules | wc -l   ->  222
```
`LinkType` vazio = nao e junction nem symlink (§C7.1-ter(c), licao de 2026-08-26). O `npm ci` proprio
declarado pelo dev se confirma no disco.

### 2-ter. Residuo no terreno — **inerte, reportado**

```
docker ps -a --format NOMES/STATUS
erp-postgres-alt               Exited (255) 3 days ago
pastrack-teste-banco-teste-1   Up 2 days (healthy)   [outro projeto, 127.0.0.1:5433]
erp-postgres                   Exited (255) 10 days ago
erp-redis                      Exited (255) 3 days ago
```
- **Zero conteiner `jur-*` / `crit-*`** — nenhum residuo de jurado de rodada anterior.
- A **base viva esta PARADA** (`erp-postgres` Exited ha 10 dias). Quem precisar de banco cria o seu, como o
  briefing manda. Nada na 5432 por Docker.
- `find .../sanb1 -name "*probe*"` (fora de `node_modules`) devolveu **vazio**; `git status` do worktree
  julgado **vazio**. Nenhum arquivo de sonda solto na arvore julgada.
- **Worktree `C:/Users/AMP/w-s1`** (`chore/ci-probe@27eae4b0`) segue vivo: e a sonda S2 do orquestrador,
  **deliberadamente preservada como evidencia ate este bloco mergear** (§7 do relatorio do dev). Residuo
  **inerte e declarado** — ressalva, nao bloqueio. **Nao e deste bloco e nao deve ser varrido por ninguem.**

---

## 3. Insumos — **VERDE**

| Insumo | Medida |
|---|---|
| Briefing | `BRIEFING-B-SAN3-B1.md` — **5 631 bytes**, lido inteiro |
| Relatorio do dev | `DEV-B-SAN3-B1.md` — **15 556 bytes** |
| Comando com as emendas | `.../sanb1/agent-orchestration/codex/comandos/B-SAN3-B1-ci-ve-o-sha-julgado.md` — **10 678 bytes** |
| Simulacoes | `SIMULACOES-S1-S2.md` — **4 574 bytes** (executadas **pelo orquestrador**, worktree descartavel `w-s1`) |
| Plano-mestre | `C:/Users/AMP/.claude/plans/luminous-nibbling-sparrow.md` — **23 727 bytes** |

**Item 2.3 (o comando nomeia head, escopo e bateria com forma).** Conferido por `grep` das secoes: o comando
tem Objetivo / Contexto e fontes / As duas mudancas sao INSEPARAVEIS / Escopo PERMITIDO / Escopo PROIBIDO /
Passos / Bateria de validacao (§9) / Estados (§7) / KPIs (§C3) / Junta (§C7) / DoD (§10) / Rastreabilidade
(§C6). O escopo permitido lista **caminho a caminho** — `ci.yml` so o bloco `on:`, o `concurrency`, os dois
portoes do GHCR e o `flutter-version`; `CLAUDE.md` e `AGENTS.md` so o §C7.1-bis; os dois corpos do inspetor
so o item 4.3; `agent-orchestration/**`; `Kpis/**` — e a bateria vem em **bloco bash executavel** (forma
declarada). **VERDE.**

**Itens 2.1 / 2.2 (ata anterior, parecer do critico, PD com 5+ fontes): NAO SE APLICAM** — este e o
**ciclo 1**. Medido: `ls agent-orchestration/omega/reprovacoes/ | grep SAN3-B1` devolveu **vazio**; nao
existe `J-*B-SAN3-B1*` nem `R-*B-SAN3-B1*`. Nao ha ata anterior a herdar, logo nao ha premissa herdada como
fato por esse caminho. O que **ha** a re-verificar esta no §9 deste parecer.

---

## 4. Inelegibilidade e composicao — **VERDE**

**As tres identidades EXISTEM** como `.claude/agents/<nome>.md` na raiz, no `san300` **e** no head julgado:
`agente-secops` · `agente-devops-provisionador` · `validador-mestre`.

**Obituario lido ANTES do grep** (item 3.1-bis do corpo julgado):
`agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` — 28 593 bytes, 41 `SEPULTADA`, 11 `RESERVADA`.

```
grep -E "SEPULTADA|RESERVADA" OBITUARIO-IDENTIDADES.md | grep -iE "secops|devops-provisionador|validador-mestre"
(vazio)   <- nenhuma das tres esta sepultada nem reservada
```

O proprio obituario diz, por escrito, que as permanentes (`agente-secops`, `validador-mestre`) **nao entram
no seu §4** — "a inelegibilidade delas e por caso, nas atas". Por isso fiz o cruzamento por caso:

| Barreira do item 3.1 | Quem e, medido | Colide? |
|---|---|---|
| votante do **ciclo anterior** | nao existe — ciclo 1 | **nao** |
| **achador** do defeito julgado | o **orquestrador** (S1/S2, 2026-09-21); e a junta do plano ciclo 2 nao achou nada de CI — grep por `check-run`, `ci.yml`, `GHCR`, `gatilho` em `J-SAN3-plano-ciclo2.md` devolveu **vazio** | **nao** |
| o **planejador** | `planejador-mestre` | **nao** |
| o **desenvolvedor** | `general-purpose` (cabecalho do relatorio do dev) | **nao** |

Contexto medido e reportado por transparencia — **nao** e colisao:

- `agente-secops` foi **suplente** da C2 na junta do **plano** SAN3 ciclo 2 e **nao entrou**: a ata
  `J-SAN3-plano-ciclo2.md` diz literalmente "Nenhuma queda e **nenhum suplente entrou**". Objeto diferente,
  e sem voto.
- `validador-mestre` votou como C1 em `J-B-SAN3-01` — **outro bloco, outro objeto**. O padrao desta casa e
  por caso: a `BRIEFING-SAN3-plano-ciclo2.md` lista como inelegiveis quem "votou no ciclo 1" **do mesmo**
  objeto.
- `agente-devops-provisionador` ja votou em `J-B-O6R-02-ciclo3` — outro bloco.

**Item 3.2, competencia x materia.** O objeto tem tres materias e cada uma tem cadeira:
(a) fronteira de artefato e portao do GHCR -> **C1 `agente-secops`**;
(b) gatilho, globs de ramo, `concurrency` e versao do Flutter -> **C2 `agente-devops-provisionador`**;
(c) diff x plano, escopo, KPI §C3.5 e o texto normativo espelhado em `CLAUDE.md` + `AGENTS.md` + os dois
corpos do inspetor -> **C3 `validador-mestre`**. **Coberto, sem buraco.**

---

## 5. Fatia S0 e guards — **VERDE no worktree julgado**

```
cd .../worktrees/sanb1 && node scripts/sync-agent-agents.mjs --check
[agents-sync] OK — 25 agentes, espelho consistente.
EXIT=0
```

Guards de KPI, **no head julgado**:

```
node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-contraste.test.ts
# tests 29   # pass 29   # fail 0   # cancelled 0   # skipped 0     EXIT=0
node --check Kpis/app.js   ->   EXIT=0
```

**Na RAIZ o mesmo comando e VERMELHO — e NAO e deste bloco:**

```
cd C:/Users/AMP/Documents/GitHub/ERP_Techsolutios && node scripts/sync-agent-agents.mjs --check
[agents-sync] FALTA no espelho: .agents/agents/especialistas/jurado-o6r11-contrato-mobile-fila.md
[agents-sync] FALTA no espelho: .agents/agents/especialistas/jurado-o6r11-suplente-contrato-mobile-fila.md
[agents-sync] FALTA no espelho: .agents/agents/especialistas/jurado-san3-01c2-fail-closed-web.md
[agents-sync] FALTA no espelho: .agents/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md
[agents-sync] DIVERGE: .agents/agents/inspetor-de-terreno-da-junta.md
[agents-sync] DIVERGE: .agents/agents/porteiro-pos-merge.md
EXIT=1
```

Sao especialistas de **outros blocos** (`B-O6R-11`, `B-SAN3-01`), e os dois `DIVERGE` sao efeito de a raiz
estar em `demo/investidor@d1fab3bc`, que **diverge de `origin/main`**
(`git merge-base --is-ancestor HEAD origin/main` -> `HEAD_DA_RAIZ_DIVERGE_DE_MAIN`).
**Nenhum desses arquivos esta no diff do `B-SAN3-B1`.** A cadeira que rodar o S0 roda **dentro do worktree
julgado**; rodar na raiz produz vermelho alheio.

---

## 6. CI no objeto julgado — **VERDE, 14/14** (a regra nova, item 4.3)

```
gh api repos/thiagodorgo/ERP_Techsolutios/commits/3a0ea095/check-runs --jq '.total_count'
14

gh api ...  --jq  nome / status / conclusao
docker            completed success      docker            completed success
frontend          completed success      frontend          completed success
owner-portal      completed success      owner-portal      completed success
flutter           completed success      flutter           completed success
backend           completed success      backend           completed success
authority-portal  completed success      authority-portal  completed success
backend-postgres  completed success      backend-postgres  completed success
```

**14 check-runs · 14 `completed` · 14 `success` · zero `queued`, `in_progress` ou `cancelled`.** Sao 7 nomes
de job com 2 ocorrencias cada (dois eventos). **Medido por mim, nao herdado do relatorio** — e bate com o
numero que o briefing publica. Pelo criterio do item 4.3 do corpo julgado, **este head esta apto a ser
julgado**: o objeto da junta e um SHA que maquina executou, do comeco ao fim.

> **Limite do que eu medi.** Eu medi **quantidade e conclusao dos check-runs**. As conclusoes **por passo**
> — `Log in to GHCR` = `skipped`, `Build backend image` = `success`, o smoke de conteiner = `success` — eu
> **nao** medi: sao materia de voto e entram no §9 como afirmacao a re-verificar.

---

## 7. Baseline honesto — **VERDE**

```
cd .../worktrees/sanb1 && npm run check > arq 2>&1 ; ec=$?     # exit por variavel, nunca por pipe
EXIT=0
> erp-techsolutions@0.1.0 check
> tsc -p tsconfig.json --noEmit
```

**O ponto de partida que as cadeiras comparam e este, e esta medido agora, antes de qualquer jurado entrar:**

| Medida | Valor no head `3a0ea095` |
|---|---|
| `git status --porcelain` do worktree julgado | **vazio** |
| `npm run check` | **exit 0** |
| `node scripts/sync-agent-agents.mjs --check` | **exit 0, 25 agentes** |
| guards de KPI (3 arquivos) | **29/29 pass, 0 fail** |
| `node --check Kpis/app.js` | **exit 0** |
| check-runs no SHA | **14/14 `success`** |

Qualquer vermelho que uma cadeira medir a partir daqui **nasceu na medicao dela**, nao no terreno que ela
recebeu — e isso vale como regra de leitura do voto.

**Eu nao mutei nada.** Depois de todas as minhas execucoes, `git status --porcelain` do `sanb1` continua
**count=0** e o head continua `3a0ea095`. O unico ignorado presente (`frontend/tsconfig.tsbuildinfo`) e
anterior a mim (bateria do dev) e so aparece sob `--ignored`.

---

## 8. Corpo carregado x corpo julgado (item 3.3) — **o meu diverge; os tres que VOTAM, nao**

Este item existe porque o subagente e carregado do `.claude/agents/` do **diretorio da sessao**, que pode
nao ser o head julgado. Medido EOL-neutro (`tr -d CR` antes do `md5sum`, §C7.1-ter(c) — hash cru fabrica
divergencia sob `autocrlf`):

| Identidade | head `3a0ea095` | raiz (`demo/investidor`) | `san300` | Resultado |
|---|---|---|---|---|
| `agente-secops` | `dc1a2974…` | `dc1a2974…` | `dc1a2974…` | **IGUAL** |
| `agente-devops-provisionador` | `1aa2acf7…` | `1aa2acf7…` | `1aa2acf7…` | **IGUAL** |
| `validador-mestre` | `804d89f0…` | `804d89f0…` | `804d89f0…` | **IGUAL** |
| `inspetor-de-terreno-da-junta` (eu) | `8a7d53a5…` | `934a8b08…` | `33dc3256…` | **DIVERGE** |

**Os tres corpos que VAO VOTAR sao byte-identicos ao head julgado.** A divergencia e so no meu — e eu a
decompus em vez de a declarar por atacado:

```
raiz x BASE(aadaa6d5)  ->  29 linhas que a raiz NAO tem   (ja estavam na main; a raiz esta em demo/investidor)
BASE x JULGADO         ->  10 linhas que ESTE BLOCO acrescenta (o item 4.3 inteiro)
linhas REMOVIDAS no julgado -> 0     (verificado: diff | grep -c '^-[^-]'  ->  0)
```

Ou seja: **o corpo julgado e superset ESTRITO do carregado** — nenhuma clausula foi retirada, so acrescentada.
As 29 linhas pre-existentes sao a nota `D-FALLBACK-MODELO-FABLE-OPUS`, o item **3.1-bis** (obituario como
fonte primeira) e o item **3.3** (este); as 10 do bloco sao o item **4.3** (check-runs).

**O que eu fiz com isso, em vez de bloquear no automatico:** li o corpo do head julgado por inteiro e
**re-executei sob ELE**, que e o mais estrito — item 3.1-bis (obituario lido ANTES do grep: §4 acima), item
3.3 (esta tabela) e item 4.3 (os 14 check-runs, §6 acima). **Norma citada conferida na ref julgada**, como o
proprio 3.3 exige: `§C7.1-bis` existe em `CLAUDE.md` (linha 391) **e** em `AGENTS.md` (linha 419) do head
`3a0ea095` — nao estou bloqueando por clausula inexistente, nem deixando de aplicar clausula existente.

**Por que isto e RESSALVA e nao BLOQUEIO.** A letra do 3.3 diz "divergencia no corpo de quem tem VETO =
BLOQUEADO". Aplicada aqui ao pe da letra, ela seria **circular e insoluvel**: a divergencia e, em 10 das 39
linhas, **exatamente a entrega que esta sendo julgada** (o corpo novo so chega a `main` quando o PR mergear),
e nas outras 29, efeito de a sessao rodar a partir de um ramo que diverge da `main` — nada que o orquestrador
possa "limpar" antes da junta sem mergear o proprio objeto. O mal que o 3.3 existe para evitar — gate
aplicando corpo errado, bloqueando por norma inexistente ou perdendo um dever — **esta medido como ausente**:
zero remocao, dever novo lido e executado, norma conferida na ref. **Registro como ressalva alta, com o diff
medido, e a ata decide se aceita a leitura.** Diff completo: `/tmp/insp/diff-corpo-inspetor.txt` (75 linhas).

---

## 9. Quorum, perda de jurado e P5 — **RESSALVA FORTE**

**Quorum declarado:** o briefing diz, por escrito, **unanimidade de 3** com o fundamento (§C7.1-ter(b): o
bloco toca fronteira de publicacao de artefato e o pipeline) e a consequencia ("o voto de uma cadeira sozinha
reprova"). **Presente.**

**Perda de jurado — o que FALTA no briefing.** O briefing cita `P1/P2` (voto incremental, parcial preservada
em `*.parcial-anterior.*`), `P5` e `P6` (`00-quedas.md`), mas **nao diz, em palavras, o que acontece com a
unanimidade de 3 se uma cadeira cair** e nao puder ser redisparada. A norma **existe no head julgado** e
resolve em uma frase — `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`, P3, texto vigente
da R2: *"voto perdido nao conta; o sucessor tem identidade nova"*, e a evidencia registrada pelo caido e
roteiro de re-execucao barata (nada conta sem re-execucao propria). **Ausencia no briefing = ressalva forte
pelo item 5.1** (nao bloqueia sozinha), e o conserto e colar essa frase no briefing das cadeiras.

**P5 — a conta tem de somar as juntas vivas, e ha UMA viva agora.** O briefing diz "maximo 2 cadeiras em
paralelo", mas **nao diz que o teto e compartilhado com outras juntas vivas**. Medido:

```
ls -l --time-style=+%H:%M  (scratchpad, agora = 18:37)
18:25  prompt-inspetor-B-SAN3-00.md      18:25  BRIEFING-B-SAN3-00.md      18:26  INSPETOR-B-SAN3-00.md
gh pr view 392  ->  #392 OPEN chore/corpos-de-jurado-rastreados 7822deaf
gh pr view 391  ->  #391 OPEN chore/ci-ve-o-sha-julgado 3a0ea095 mergeable=MERGEABLE
```

Existe **uma inspecao irma viva** (`B-SAN3-00`, PR #392) montada nos mesmos minutos que a minha. Se as duas
juntas votarem ao mesmo tempo sem conta comum, o teto de 2 vira **6 cadeiras em voo**. **Ressalva:** o
briefing precisa dizer que o teto de 2 e **somado entre as juntas vivas**, e quem sequencia e o orquestrador.

---

## 10. Afirmacoes a RE-VERIFICAR — o que a junta **nao** pode herdar

Tudo abaixo e **afirmacao de quem entregou**, nao fato medido por mim. Nenhuma delas entra no voto sem
re-execucao propria da cadeira (o `pre-existente` tambem precisa de evidencia de data/origem, senao conta
como `dentro-do-bloco`).

**Do relatorio do dev (`DEV-B-SAN3-B1.md`):**

| # | Afirmacao a medir | Onde |
|---|---|---|
| A1 | `Log in to GHCR` = **`skipped`**, `Build backend image` = `success`, smoke de conteiner = `success` no job `docker` do run do head final | §5.d — **eu so medi o total e a conclusao dos 14 check-runs; os passos, nao** |
| A2 | O alcance corrigido: o defeito **nao** alcanca producao direto; esvazia **uma** das tres travas do `deploy-production.yml` (a `docker manifest inspect`, l.117-118) e as outras duas (ata + staging verde no mesmo SHA) ficam de pe | §3 e §6.1 — **confiram lendo o `deploy-production.yml` na ref julgada** |
| A3 | `deploy-staging.yml` dispara **so** em `push` para `main`, e o gatilho novo nao o alcanca | §3 |
| A4 | `:latest` **nao e lido** por nenhum caminho de deploy; so escrito pelo `ci.yml` | §3 |
| A5 | Censo dos globs de ramo (78 `feature/`, 26 `feat/`, 12 `fix/`, 9 `chore/`, 3 `docs/`, `demo/` fora de proposito) e a conclusao de que os 4 globs cobrem todo ramo vivo de bloco | §1 |
| A6 | Deriva do Flutter `3.47.4` -> `3.47.5` na janela 18/09T18:37Z -> 19/09T00:26Z, e o pin em `3.47.5` | §2 |
| A7 | **`npm test` NAO rodou localmente** — quem executou a suite inteira foi o CI no SHA julgado (`backend: success`). **Decidir se basta e dizer por que** | §6.2 — e a divergencia que o briefing manda julgar |
| A8 | `blocks_completed` 165 -> 166 **pode exigir recontagem** se o `B-SAN3-00` mergear antes — **medido por mim que o #392 esta OPEN e com junta viva AGORA** | §6.3 |
| A9 | Backfill §C3.5 do #390 (`merge_commit aadaa6d5`, `approved_head fbda96b0`) e a tese de que a absorcao resolve por uniao se o #392 pagar o mesmo | §6.4 |
| A10 | Semantica YAML **byte-identica** a da sonda por `yaml.safe_load` — so os comentarios mudaram | §6.5 |
| A11 | O escopo esta limpo: `git diff --name-only origin/main...HEAD` sobre `src frontend mobile tests prisma migrations infra` + lockfiles + os 4 outros workflows sai **VAZIO**; protecao de ramo nao tocada | §4 |
| A12 | Comportamento do `concurrency`: dedupa dentro de evento+ref (run `35654817500` `cancelled`) e **nao** cruza eventos | §5.c |

**Do briefing:** os numeros "14/14 `success`" e "0 nos PRs #388 e #389" vem marcados **"re-mecam, nao
herdem"** — eu re-medi o 14/14 e confirmo; o **0 em #388/#389 eu nao medi**, fica para a cadeira que quiser
usa-lo.

**Das simulacoes S1/S2:** sao do orquestrador, em worktree descartavel, e tratam de frentes **de outro
bloco** (`.gitattributes`/EOL). Entram como contexto, **nunca** como prova deste objeto.

---

## VEREDITO: **LIBERADO COM RESSALVA**

O tabuleiro esta limpo para o voto valer: head `3a0ea095` confirmado e identico ao head do PR #391, arvore
**vazia**, isolamento declarado e verificado no disco (sem junction), insumos todos presentes, composicao
elegivel e competente, espelho Codex **verde dentro do worktree julgado**, baseline **verde** e — pela regra
que este proprio bloco inaugura — **14/14 check-runs concluidos com `success`** no objeto julgado.

**As ressalvas que a junta carrega POR ESCRITO** (o orquestrador as cola no briefing das cadeiras, em
destaque):

| # | Ressalva | O que a cadeira precisa saber |
|---|---|---|
| **R1** (alta) | **Meu corpo carregado diverge do corpo julgado** (39 linhas, **zero removidas**): 29 pre-existentes na `main` que a raiz nao tem (raiz em `demo/investidor`, que diverge da `main`) + 10 que **sao a entrega deste bloco** (item 4.3). **Re-executei sob o corpo JULGADO**, o mais estrito, e conferi que o §C7.1-bis existe na ref (`CLAUDE.md` l.391, `AGENTS.md` l.419). Os **tres corpos que votam sao byte-identicos ao head** — medido EOL-neutro. | Se a C3 discordar da minha leitura de que isso e ressalva e nao bloqueio, ela registra como achado; a decisao e da ata. |
| **R2** (forte) | **O briefing nao diz o que acontece com a unanimidade de 3 se uma cadeira cair.** A norma existe no head: `PROTOCOLO-JUNTA-RESILIENTE.md`, P3/R2 — *"voto perdido nao conta; o sucessor tem identidade nova"*. | Conserto = uma frase no briefing. Sem ela, um voto perdido produz resultado que o dono nao consegue interpretar. |
| **R3** | **P5 sem conta comum.** Ha uma **junta irma viva** (`B-SAN3-00`, PR #392, `7822deaf`) montada nos mesmos minutos. O teto de 2 cadeiras precisa ser **somado entre as juntas vivas**. | Quem sequencia e o orquestrador; a cadeira so precisa saber que pode esperar vez. |
| **R4** | **Mutacao viva de OUTRA sessao na arvore principal** (4 corpos `c5` do `B-O6R-02 ciclo5`, +364/-8, medida real e nao fantasma de `autocrlf`) e **S0 vermelho na raiz** (4 especialistas de outros blocos fora do espelho + 2 `DIVERGE`). **Nada disso esta no diff deste bloco.** | Rode tudo **dentro do worktree julgado**. Residuo alheio **se reporta, nunca se varre** — remocao so por identificador **deste** bloco. |
| **R5** | **Worktree `C:/Users/AMP/w-s1`** (`chore/ci-probe@27eae4b0`) segue vivo de proposito: e a sonda S2, preservada como evidencia ate este bloco mergear. Inerte, sem privilegio, sem mutacao. | Nao e sujeira a limpar durante a junta. |
| **R6** | **12 afirmacoes do dev + 2 numeros do briefing estao listados no §10 como A RE-VERIFICAR** — inclusive a A7 (`npm test` nao rodou localmente) e a A2 (o alcance corrigido do defeito), que o briefing manda julgar. | Nada disso e fato herdado. |

**Nao ha item que eu tenha deixado de medir.** Onde meu alcance parou, esta dito no texto (conclusoes por
passo do job `docker`, §6) e virou item de re-verificacao, nao "provavelmente ok".

---

## Limpeza

Nao criei worktree, nao subi conteiner, nao toquei a base viva, nao rodei `prune`/`clean`/`stash`/`checkout`/
`reset` em arvore nenhuma. Todas as medicoes foram **somente leitura** (`git -C`, `git show`, `gh api`) ou
execucoes sem escrita no repositorio (`tsc --noEmit`, `node --test`, `node --check`) dentro do proprio
worktree do bloco — que **continua com `git status --porcelain` vazio e head `3a0ea095`** depois de mim.
Unicos arquivos que criei: o proprio parecer e os intermediarios em `/tmp/insp/` (temp do shell, fora do
projeto), dos quais so `/tmp/insp/diff-corpo-inspetor.txt` fica citado como evidencia da R1. **Nao sou fonte
da proxima contaminacao.**

— `inspetor-de-terreno-da-junta` · Opus 5 em substituicao declarada ao Fable · 2026-09-21
