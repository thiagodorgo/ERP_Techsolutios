# PARECER DO INSPETOR DE TERRENO — junta do `B-SAN3-00` (PR #392, objeto `7822deaf`)

> **NOTA DE SUBSTITUICAO DE MODELO:** o corpo deste papel fixa `model: fable`
> (`D-INSPETOR-TERRENO-JUNTA`, 2026-08-24). A cota do Fable esgotou hoje (2026-09-21) e derrubou tres
> agentes; o dono decidiu que **cota esgotada e indisponibilidade** e o papel roda em **Opus 5 (1M)**,
> **com esta nota no parecer** — a excecao ja admitida em §C7.6. Declarado aqui, na primeira linha.

- **Papel:** `inspetor-de-terreno-da-junta` (nao voto, nao conserto, nao julgo o merito)
- **Modelo:** `claude-opus-5[1m]` (substituindo `fable` — ver nota acima)
- **Corpo aplicado:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/inspetor-de-terreno-da-junta.md` (lido integralmente)
- **Mandato:** `.../scratchpad/prompt-inspetor-B-SAN3-00.md`
- **Briefing conferido:** `.../scratchpad/BRIEFING-B-SAN3-00.md`
- **Data/hora do inicio:** 2026-09-21
- **Forma:** git-bash com `export MSYS_NO_PATHCONV=1`, caminhos absolutos, exit code por variavel (`cmd > arq 2>&1; ec=$?`), nunca por pipe.

## Estado: CONCLUIDO — veredito no §"VEREDITO" e quadro final no §9

| # | Item | Estado |
|---|---|---|
| 1 | Arvore sem mutacao viva (head `7822deaf`) | pendente |
| 2 | Isolamento declarado | pendente |
| 3 | Insumos presentes | pendente |
| 4 | Inelegibilidade por nome + existencia das identidades | pendente |
| 5 | Fatia S0 (espelho Codex) + guards de KPI | pendente |
| 6 | CI — check-runs do objeto julgado (regra nova) | pendente |
| 7 | Baseline honesto | pendente |
| 8 | Plano de perda de jurado + P5 | pendente |
| 9 | Afirmacoes a re-verificar | pendente |

---

## 0. Corpo aplicado — divergência medida no MEU próprio corpo (item 3.3 do corpo do head)

O mandato me mandou ler o corpo em `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/agents/inspetor-de-terreno-da-junta.md`
(árvore principal, `demo/investidor@d1fab3bc`). Medi esse corpo contra o corpo **no head julgado**:

```
git -C <wt> show 7822deaf:.claude/agents/inspetor-de-terreno-da-junta.md | tr -d '\r' | md5sum  -> 33dc3256dd31e693314c7fe91f7cd235
tr -d '\r' < <raiz-sessao>/.claude/agents/inspetor-de-terreno-da-junta.md | md5sum             -> 934a8b08c5c789abb50513305ee52409
```

**DIVERGEM (EOL-neutro, não é artefato de CRLF).** O corpo da raiz é o **mais pobre**: faltam-lhe três
blocos que existem no head julgado — (i) a regra de fallback `Fable → Opus, e abaixo disso PARADA`
(`D-FALLBACK-MODELO-FABLE-OPUS`), (ii) o item **3.1-bis** (obituário como fonte primeira), (iii) o item
**3.3** (corpo carregado × corpo julgado). É **exatamente a classe `P-GOV-CAMINHO-REPO-SESSAO`** que o item
3.3 descreve, acontecendo comigo.

**O que fiz:** apliquei o **superset** — o corpo do head julgado (mais exigente, direção fail-closed) —
e executei também o 3.1-bis e o 3.3. Fica registrado para a ata: *o corpo do inspetor na árvore
`demo/investidor` está defasado em relação à `main`; quem invocar daquele diretório carrega um gate com
três itens a menos.*

---

## 1. Isolamento

### 1.1 Head a julgar — **VERDE**
```
git -C .../worktrees/san300 rev-parse HEAD      -> 7822deaf9afabd076d1095eaf48a6dfb635e5401
git -C .../worktrees/san300 rev-parse --abbrev-ref HEAD -> chore/corpos-de-jurado-rastreados
git -C .../worktrees/san300 status --porcelain        -> (vazio)
git -C .../worktrees/san300 status --porcelain -uall  -> (vazio)
git -C .../worktrees/san300 clean -nxd | grep -v node_modules -> (vazio)
gh pr view 392 --json headRefOid -> 7822deaf9afabd076d1095eaf48a6dfb635e5401
```
O head do PR #392 **é** o objeto nomeado pelo briefing, e a árvore do dev **não tem mutação viva nenhuma**
(nem untracked, nem ignorado fora de `node_modules`). Base: `merge-base 7822deaf origin/main` =
`aadaa6d51be950e152ca6a6f15327bc9989039de` = `origin/main` — a branch **não** divergiu da base declarada.

**Checkout independente do objeto:** criei worktree detached meu em `C:/Users/AMP/w-insp-san300` (caminho
curto) e `git status --porcelain -uall` saiu **vazio** também lá — o `.gitignore` novo não produz sujeira
em árvore recém-criada.

**Diff do objeto (20 arquivos, para a junta conferir o escopo — a medição de mérito é da C1):**
```
D  .agents/agents/especialistas/jurado-san3-01c2-fail-closed-web.md
D  .agents/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md
D  .claude/agents/especialistas/jurado-san3-01c2-fail-closed-web.md
D  .claude/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md
M  .gitignore
M  Kpis/app.js · Kpis/kpis-history.json · Kpis/kpis-history.md · Kpis/kpis-latest.json
A  agent-orchestration/codex/comandos/B-SAN3-00-registro-rastreavel.md
M  agent-orchestration/codex/log-execucao.md
M  agent-orchestration/controle/aposentadoria-especialistas.md · decisoes.md · pendencias-indice.md · pendencias.md
M  agent-orchestration/docs/status-geral.md
M  agent-orchestration/omega/juntas/J-CHK-P1-PR04-aplicabilidade.md
A  agent-orchestration/omega/juntas/votos/B-SAN3-04a/00c-porteiro-pos-merge-390.md
M  agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md
M  docs/revisoes/SAN3/PLANO_SAN3.md
```
`git diff --name-only aadaa6d5..7822deaf -- src tests frontend mobile prisma scripts .github` → **VAZIO**
(re-executado por mim; **não** herdado do relatório do dev).

### 1.2 Plano de isolamento declarado — **VERDE**
O briefing §0 declara, por escrito: worktree **detached próprio por cadeira**, em **caminho curto**
(`C:/Users/AMP/w-j-san300-<cadeira>`), com a razão medida (dentro do scratchpad o Windows falha com
`Filename too long`); **`npm ci` próprio**; **sem junction** (§C7.1-ter(c)); contêineres próprios com
`DATABASE_URL`/`REDIS_URL` explícitas se subir banco; **5432 é de outro projeto**, faixa 58284–58483
excluída pelo Windows, e **a base viva (`erp-postgres`/`erp-redis`) nunca é alvo**; remoção do que criar
**pelo nome**, ao fim. Nada falta.

**Confirmei que a proibição de junction está cumprida hoje:**
```
fsutil reparsepoint query .../san300/node_modules           -> "não é um ponto de nova análise"
fsutil reparsepoint query .../san300/frontend/node_modules  -> "não é um ponto de nova análise"
```
São diretórios reais (222 pacotes de topo na raiz do worktree, iguais em número aos da árvore principal,
mas **independentes**). O próprio `npm ci` que rodei no meu worktree (326 pacotes, ec=0) prova que a
receita do briefing funciona em caminho curto.

### 1.3 Resíduo — **VERDE no terreno deste bloco; resíduo ALHEIO reportado, não varrido**
```
docker ps -a --format '{{.Names}}' | grep -Ei "san300|jur-|crit-|plan-|probe" -> (nenhum)
```
Contêineres vivos na máquina: `pastrack-teste-banco-teste-1` (:5433, **outro projeto**),
`erp-postgres-alt`/`erp-postgres`/`erp-redis` **Exited** (base viva parada, não é alvo). Os
`plan-b04a-bat-pg`/`-redis` que o plano-mestre §0c listava **já não existem**.
Nenhum `*probe*` na árvore julgada; os dois diretórios `especialistas/` foram removidos vazios pelo dev
(conferido: não existem mais).

**Resíduo de OUTRAS sessões (reporto — não varro, §remoção só por identificador do meu bloco):**
- worktrees vivos alheios: `b04a` (`738ff531`), `b11` (`43557a17`), `gov-descuido` (`497d360d`),
  `gov-elenco` (`15ef3fbe`), `sanb1` (`3a0ea095` — é a junta paralela do `B-SAN3-B1`), `C:/Users/AMP/w-s1`
  (`27eae4b0`);
- **árvore principal** (`demo/investidor@d1fab3bc`) com **4 arquivos ` M` REAIS** — não são fantasma de
  `autocrlf`: `git diff --numstat` dá `+86/−0` em `critico-c5-adversarial.md` e `+96/−4` em
  `jurado-c5-arnes-catalogo-postgres.md`, **nos dois espelhos**, e o md5 do disco difere do blob do HEAD.
  São os apensos do **ciclo 5 do `B-O6R-02`** (outra sessão), mais 8 caminhos `??` da mesma rodada.
  **Nada disso toca o objeto julgado:** as jurados leem `7822deaf` no worktree `san300`, onde a árvore
  está limpa.


---

## 2. Insumos do briefing

### 2.1 Ata do ciclo anterior — **NAO SE APLICA, e provei que nao se aplica**
```
ls agent-orchestration/omega/juntas       | grep -i SAN3-00  -> (nenhuma)
ls agent-orchestration/omega/reprovacoes  | grep -i SAN3-00  -> (nenhuma)
ls agent-orchestration/omega/juntas/votos | grep -i SAN3-00  -> (nenhuma)
ls <scratchpad>/votos-B-SAN3-00                              -> nao existe
```
E o **ciclo 1** do bloco: nao ha ata anterior para herdar, nem voto velho na pasta de saida. O briefing §3
diz, em voz alta: *"Tudo isso e afirmacao a medir, nao fato herdado"* — a marcacao que o item 2.1 do meu
corpo exige esta la como clausula geral. A **ressalva R-1** aponta onde essa clausula geral precisa de nome
proprio.

### 2.2 Ciclo >= 3 — **NAO SE APLICA** (ciclo 1; parecer de critico e PD nao sao exigiveis, §C7.4)

### 2.3 Plano/comando do ciclo — **VERDE**
`agent-orchestration/codex/comandos/B-SAN3-00-registro-rastreavel.md` (15.804 B, **rastreado em 7822deaf**)
traz: head e base; **Escopo PERMITIDO** (`.gitignore` nominal; `especialistas/**` so para a remocao da
rodada 4 por identificador de BLOCO; `agent-orchestration/**`; `PLANO_SAN3.md` **so o §5**; `Kpis/**`);
**Escopo PROIBIDO** (`src`, `tests`, `frontend`, `mobile`, `prisma`, `migrations`, `scripts`, `.github`,
`infra`, `.env`, lockfiles, `CLAUDE.md`/`AGENTS.md`, e **escrita** nas arvores `b04a`/`b11`/`sanb1`/principal);
e a **bateria §9 com a forma declarada**, comando a comando (13 linhas, com `git diff --cached --check ||
exit 1` em linha propria). **Bateria com forma declarada: sim** — o item que mais vira ressalva forte esta
cumprido aqui.

### Insumos: existem todos — **VERDE**
```
DEV-B-SAN3-00.md              20.520 B
SIMULACOES-S1-S2.md            4.574 B
luminous-nibbling-sparrow.md  23.727 B   (plano-mestre da sessao)
BRIEFING-B-SAN3-00.md          5.306 B
comando (no tree do objeto)   15.804 B
```

---

## 3. Papeis (§C7.4-bis)

### 3.1-bis Obituario como fonte primeira — **VERDE**
`agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` (301 linhas) lido **antes** do `grep`.
Nenhuma das tres cadeiras aparece como `SEPULTADA` nem `RESERVADA`; o proprio obituario declara, em §3.6 e
§3.7, que as permanentes (`validador-mestre`, `agente-ci-doutor`, `agente-secops`) **nao entram nele** — a
inelegibilidade delas e **por caso, nas atas**. Entao fui as atas.

### 3.1 Inelegibilidade por nome — **VERDE, com participacao previa declarada (R-2)**
As tres identidades existem e estao **rastreadas nos dois espelhos** em `7822deaf`
(`.claude/agents/<x>.md` e `.agents/agents/<x>.md`, conferido por `git ls-tree -r`).

- Nao ha ciclo anterior deste bloco: ninguem e "votante do ciclo anterior".
- Quem **achou** os defeitos: o `porteiro-pos-merge` do #390 (as 5 dividas) e o **proprio desenvolvedor**
  (a falsificacao da premissa). Nenhum dos dois vota.
- Quem **planejou**: o orquestrador (Emendas 1 e 2) e o plano-mestre. Nao vota.
- Quem **desenvolveu**: `general-purpose`, duas instancias, Opus 5. Nao vota.
- `inspetor-de-terreno-da-junta` (eu) e `agente-fabrica` nao votam.

**Participacao previa — declaro, nao bloqueio** (precedente: a "R3 do inspetor" em `J-SAN3-plano-ciclo2`):
`validador-mestre` votou **REPROVADO** na C3 do **ciclo 1 do plano SAN3** (`R-SAN3-plano-ciclo1.md`);
`agente-ci-doutor` votou **APROVADO** na C3 do **ciclo 2** (`J-SAN3-plano-ciclo2.md`); `agente-secops` foi
**suplente nao convocado** nesse mesmo ciclo. O objeto daquelas juntas era o **`PLANO_SAN3.md`**, e este
bloco **altera o §5 desse plano**. Conferi se o conflito morde: a premissa falsificada (os "41 corpos")
**nao vem do `PLANO_SAN3.md`** — `grep "41" docs/revisoes/SAN3/PLANO_SAN3.md` nao devolve uma linha sobre
corpo de agente; ela vem do **plano-mestre da sessao** (`luminous-nibbling-sparrow.md`, Frente 0, item 0a),
que nenhuma das tres julgou. Sobrepoe-se a **vizinhanca** (o §5), nao a conclusao em julgamento.

### 3.2 Competencia x achados — **VERDE**
Tres superficies, tres cadeiras: `.gitignore`/visibilidade -> `agente-secops`; diff x plano, escopo, KPI e
registro -> `validador-mestre`; bateria, regressao e contagens -> `agente-ci-doutor`. A superficie que
nenhuma cobre por especialidade — **julgar se a falsificacao da premissa esta certa** — esta atribuida por
escrito a C1 no briefing §2, e as tres conseguem medi-la com `git`.

### 3.3 Corpo carregado x corpo julgado — **VERDE para as tres cadeiras**
```
identidade          head 7822deaf                      raiz (demo/investidor)  worktree san300
validador-mestre    804d89f01d920ed72c23e5e24c062501   = idem                  = idem     IGUAIS
agente-secops       dc1a2974877dc56f04a5e3cb43668c75   = idem                  = idem     IGUAIS
agente-ci-doutor    55979e2cc21a1e6aba6bfe36899454a0   = idem                  = idem     IGUAIS
```
md5 **EOL-neutro** (`tr -d` do CR dos dois lados) — nunca md5 cru, que fabricaria divergencia sob
`core.autocrlf=true` (§C7.1-ter(c)). Medi os **dois** diretorios de onde um subagente pode ser carregado
nesta sessao. Divergiu **so o meu proprio corpo** (§0).

**Modelo das cadeiras:** nenhuma das tres fixa `model:` no frontmatter (herdam o modelo da sessao) — logo
**nenhuma cai por cota do Fable**. Os unicos corpos com `model: fable` no head sao os tres gates:
`inspetor-de-terreno-da-junta`, `planejador-mestre`, `porteiro-pos-merge`. Consequencia a registrar: o
`porteiro-pos-merge` deste merge caira na mesma substituicao que eu (Opus + nota) enquanto a cota nao voltar.

---

## 4. Fatia S0 e guards

### 4.1 Espelho Codex — **VERDE no objeto julgado**
```
cd .../worktrees/san300       ; node scripts/sync-agent-agents.mjs --check -> "OK - 23 agentes, espelho consistente."  ec=0
cd C:/Users/AMP/w-insp-san300 ; node scripts/sync-agent-agents.mjs --check -> "OK - 23 agentes, espelho consistente."  ec=0
```
**Recursividade conferida** (o item que ja falhou por guard raso): o fonte do script diz, na l.66,
*"Recursivo DE PROPOSITO: o listing raso ja deixou especialistas/ fora"*, e a contagem por `git ls-tree -r`
no head bate — `.claude/agents` **23** `.md`, `.agents/agents` **24** (os 23 + `README.md`),
`especialistas/` **0 dos dois lados** (o bloco removeu as duas cadeiras da rodada 4 nos dois espelhos).

**Na arvore principal o mesmo comando e VERMELHO (ec=1) — e NAO e deste bloco:**
```
FALTA no espelho: .agents/agents/especialistas/jurado-o6r11-contrato-mobile-fila.md
FALTA no espelho: .agents/agents/especialistas/jurado-o6r11-suplente-contrato-mobile-fila.md
FALTA no espelho: .agents/agents/especialistas/jurado-san3-01c2-fail-closed-web.md
FALTA no espelho: .agents/agents/especialistas/jurado-san3-01c2-suplente-fail-closed-web.md
DIVERGE: .agents/agents/inspetor-de-terreno-da-junta.md
DIVERGE: .agents/agents/porteiro-pos-merge.md
```
Medi a natureza das duas divergencias: sao de **conteudo** (md5 EOL-neutro diferente dos dois lados), nao de
fim de linha. Sao o working tree de `demo/investidor` + residuo das sessoes `b11` e `B-SAN3-01`.
**Reporto; nao varro.**

### 4.2 Guards de KPI — **VERDES**, medidos por mim, `ec` por variavel
```
node --check Kpis/app.js                                        ec=0
node scripts/kpi-freeze.mjs --check                             ec=0   "kpi-freeze: em dia (snapshot 2026-09-21)"
node --test --import tsx tests/kpi-dashboard-charts.test.ts     ec=0   # tests 17 # pass 17 # fail 0
node --test --import tsx tests/kpi-dashboard-contraste.test.ts  ec=0   # tests 6  # pass 6  # fail 0
node --test --import tsx tests/kpi-achados-paridade.test.ts     ec=0   # tests 6  # pass 6  # fail 0
```
Batem numero a numero com o que o relatorio do dev afirma (17/17, 6/6, 6/6) — **confirmacao por
re-execucao independente**, nao leitura do relatorio.

---

## 5. CI do objeto julgado — a regra nova que este bloco inaugura — **VERDE**

```
gh api repos/thiagodorgo/ERP_Techsolutios/commits/7822deaf/check-runs
```
| medicao | total | conclusions |
|---|---|---|
| 1a (21:2x UTC, no inicio da inspecao) | **6** | 5 x `success` + `backend` ainda `in_progress` |
| 2a (21:39:16 UTC) | **7** | `docker`, `owner-portal`, `frontend`, `authority-portal`, `flutter`, `backend-postgres`, `backend` — **7 x completed / 7 x success** |

Registro a primeira medicao de proposito: o CI **ainda rodava** quando comecei e concluiu **verde** durante
a inspecao; `gh pr view 392` acompanhou, com `mergeStateStatus` saindo de **BLOCKED** para **CLEAN**
(`mergeable: MERGEABLE`; head do PR = `7822deaf9afabd076d1095eaf48a6dfb635e5401`; base `main`).
**Nao ha ausencia de CI e nao ha vermelho** — a ressalva alta prevista no meu mandato nao se aplica.

**As 2 annotations (no `owner-portal`) sao de runner, nao do bloco:** `warning` "Node.js 20 is deprecated...
actions/checkout@v4, actions/setup-node@v4" e `notice` "ubuntu-latest migrara para Ubuntu 26". Pre-existentes,
`path=.github` — diretorio que este bloco tem no **escopo proibido**.

---

## 6. Baseline honesto — medido AGORA, isolado, ANTES de qualquer cadeira — **VERDE**

Forma: worktree **detached meu** em `C:/Users/AMP/w-insp-san300` (caminho curto), em `7822deaf`, arvore
limpa, `npm ci` **proprio** (sem junction), `DATABASE_URL` **so no env** e apontando para porta
**inexistente** (59998) — **a base viva nao recebeu um comando** e **nenhum conteiner foi criado por mim**.
```
git status --porcelain -uall                      -> (vazio)
npm ci                                            -> ec=0   "added 326 packages ... in 19s"
npx prisma generate                               -> ec=0
npm run check  (tsc -p tsconfig.json --noEmit)    -> ec=0
```
**Armadilha medida, e e insumo para as cadeiras:** na primeira tentativa o `npm run check` deu **ec=2**, com
~15 erros `TS2305: Module "@prisma/client" has no exported member PrismaClient`. A causa **nao** e o codigo:
faltava o `prisma generate`, que por sua vez falhou com `PrismaConfigEnvError: Cannot resolve environment
variable: DATABASE_URL`. **Worktree novo sem `prisma generate` da falso-vermelho no `check`** — quem montar
cadeira propria precisa de `npm ci` **e** `prisma generate` com `DATABASE_URL` no env.

**Qual e o baseline que as cadeiras comparam:** `origin/main@aadaa6d5`. E, como
`git diff --name-only aadaa6d5..7822deaf -- src tests frontend mobile prisma scripts .github` e **VAZIO**
(re-executado por mim, nao herdado), o baseline de **codigo** e o mesmo antes e depois do bloco. Dai as
contagens `npm test` 3052/3054 e smoke 1202/1202 serem **regressao confirmatoria** de valor carregado com
nota (§C3.3) e **nao** medicao do trabalho deste PR. Eu **nao** rodei a suite inteira: e o mandato da C3, e
rodar duas vezes em paralelo violaria o P5 e o piso de disco (**12 GB livres**; o §C5 fala em ~10 GB).

---

## 7. Quorum, perda de jurado e P5

### 7.1 Quorum declarado — **declarado, com calibracao a consignar (R-3)**
O briefing §0 declara **MAIORIA DE 3** e escreve a razao (emenda 2(c): o bloco nao toca dinheiro, permissao
de produto nem dado; o §5 do `PLANO_SAN3.md` e declaracao de escopo de bloco, nao concessao de permissao).
Conferi que a norma citada **existe na ref julgada**: `CLAUDE.md` §C7.1-ter(b), l.374-375 — *"Unanimidade de
3 quando o bloco toca dinheiro, seguranca, permissao ou perda de dado; maioria de 3 no resto"*.

Duas leituras poderiam puxar para **unanimidade de 3**, e as deixo nomeadas em vez de decidir (nao e meu
papel): (a) o `.gitignore` e a superficie do que o git **versiona ou esconde** — o briefing reconhece isso
ao sentar a `agente-secops`; (b) a ampliacao nominal do §5 **nomeia** `auth.adapter.ts` (`rolePermissions`)
e `prisma/seed.ts` (5 papeis legados), e o proprio dev deixou escrito que, se a junta medir isso como
"permissao", sobe para unanimidade. **Consequencia pratica, para a ata nao travar:** com 3 cadeiras, maioria
e unanimidade **so divergem se houver voto dissidente**. Se as tres aprovarem, os dois quoruns estao
satisfeitos; **se uma reprovar, a ata tem de decidir a calibracao antes de concluir** — e nao depois.

### 7.2 Perda de jurado — **parcialmente declarado (R-4)**
O briefing invoca P1/P2 (voto incremental, esqueleto antes), **P5** e **P6** (quedas em `00-quedas.md`), mas
**nao transcreve** a regra do voto perdido. Ela existe na norma, e a cito da ref julgada
(`agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`, l.35-38): *"voto perdido nao conta; o
sucessor tem identidade nova"* + *"nada conta sem re-execucao propria, mas evidencia registrada em arquivo
pelo caido e roteiro de re-execucao barata"*. **A composicao nao nomeia suplente para nenhuma das tres
cadeiras** (as juntas de `SAN3-plano-ciclo2` e `B-SAN3-01-c2` nomeavam). Em maioria de 3, uma cadeira perdida
e nao reposta deixa 2 votos e um resultado que o dono nao consegue ler sem regra escrita. **Nao bloqueia** —
ressalva forte, para o briefing carregar a regra por extenso.

### 7.3 P5 (maximo 2 em paralelo) — **conferido, com um alerta de contagem**
No momento desta inspecao ha **2 agentes vivos**: eu e o `inspetor-de-terreno-da-junta` da junta paralela do
**`B-SAN3-B1`** (worktree `sanb1` @ `3a0ea095`, briefing `BRIEFING-B-SAN3-B1.md`, ambos de 21/09 18:25).
O teto do P5 conta **juntas vivas somadas**: se as cadeiras do `B-SAN3-B1` estiverem no ar, esta junta pode
disparar **menos de 2** por vez. Registro isto porque o teto e por sessao, nao por junta.
Quedas: nao havia `00-quedas.md` desta junta ate o fim da minha medicao (pasta `votos-B-SAN3-00` inexistente).

---

## 8. Afirmacoes que a junta NAO pode herdar (item 9 do mandato)

Tudo abaixo esta nos insumos como **medido**. Nenhuma delas e fato para a junta ate ser re-executada.

**(a) Os numeros da Emenda 1 — e os tres insumos discordam entre si.**
| insumo | universo | versionados/perdidos | "com decisao escrita" | ref tips |
|---|---|---|---|---|
| BRIEFING §2 | **80** | 80/0 | **33** | — |
| plano-mestre, Frente 0 (0a) | **43** | 43/0 | 33 **dos 43** | **146** |
| DEV §4 (2a instancia) | **80** = 41 `.claude/` + 39 `.agents/` | 80/0 | 33 **dos 41** | **138** |
O proprio dev declara a divergencia (41/138 x 43/146) e a explica pelo par `jurado-san3-01c2-*`. **A junta
re-mede o denominador que for usar, ou publica o numero com N, forma e causa** — herdar qualquer um dos tres
e assinar embaixo de medicao alheia.

**(b) O criterio de aceite do plano-mestre para este bloco esta DEFASADO — e contradiz a propria Emenda 1.**
`luminous-nibbling-sparrow.md`, secao "Verificacao ponta a ponta": *"**0:** `sync-agent-agents --check` verde
**com os 41 corpos no tree**; nenhum `.md` em `-text`."* — enquanto o item **0a** do mesmo arquivo esta
riscado como PREMISSA FALSIFICADA. Quem ler so a lista de verificacao reprova o bloco por nao ter versionado
41 corpos que a emenda **proibiu** versionar. **Nao e DoD.**

**(c) A comparacao "verbatim" da amplicacao nominal tem de ser feita contra a BASE, nao contra o head.**
O briefing §2 manda conferir se a ampliacao de `docs/navigation-matrix.md` e *"transcricao verbatim do que a
pendencia ja prescrevia"*. O texto prescritivo **so existe na base**:
```
git show aadaa6d5:agent-orchestration/controle/pendencias.md | grep -n Amplia   -> l.9721
  "**Ampliacao nominal necessaria:** docs/navigation-matrix.md nao esta no §5 de bloco nenhum;
   quem executar o 06a o declara no §5 DO COMANDO (mesmo precedente do frontend/index.html...)"
git show 7822deaf:agent-orchestration/controle/pendencias.md | grep -n Amplia   -> l.9723 (texto NOVO, do bloco)
```
Comparar contra o head e circular: seria comparar o texto do dev com o texto do dev. E `docs/navigation-matrix.md`
**nao esta no diff** (`git diff --name-only aadaa6d5..7822deaf -- docs/navigation-matrix.md` = vazio) — o que
mudou foi a **linha do §5** e o **campo dono** da pendencia. Nao ha arquivo de matriz a caçar.

**(d) As contagens de regressao.** `npm test` 3052/3054 (287 arquivos, 383 s) e smoke 1202/1202 (50,4 s) sao
**valor carregado com nota**, nao medicao deste PR (o diff nao toca `src`/`tests`/`frontend` — provei).
`flutter_tests` **nao foi reexecutado** e o dev diz isso em voz alta: a confirmacao das outras duas **nao**
se estende a ela.

**(e) Os numeros de KPI e de registro:** `blocks_completed` 165 -> 166; indice de pendencias "411 cabecalhos
/ 400 IDs, 110 FECHADAS, 301 ABERTAS"; peso removido na divida 2 "100.138 B / 4.091 chars"; parecer do
porteiro "25.607 B". Re-medir **pelo gerador**, nunca por varredura propria — a casa ja mediu que varredura
propria responde *quase* a pergunta que o gerador responde.

**(f) "0 arquivo rastreado passa a ser ignorado".** O proprio dev registrou **duas formas com resultados
diferentes** (1a instancia: "0, so `CLAUDE.md`/`AGENTS.md`, que ja eram"; 2a: "**0 absoluto**" por
`git ls-files -z | git check-ignore -z --stdin`). E deixou escrita a armadilha que o enganou:
**`git check-ignore -v` imprime tambem o padrao de NEGACAO** — "saiu texto" nao significa "ignorado". A regua
e o **exit code** (`-q`). Medicao nas **duas pontas** (o que passou a aparecer / o que continua escondido).

**(g) A armadilha de CRLF, que eu confirmei por execucao:**
```
git config --get core.autocrlf -> true
git ls-files --eol .gitignore pendencias.md PLANO_SAN3.md aposentadoria-especialistas.md
  -> i/lf  w/crlf  (todos)
```
Ancora com `\n` **nao substitui nada** e devolve verde falso; `git archive`+`tar` fabrica divergencia
(§C7.1-ter(c)). Leia o conteudo julgado por `git show <head>:<caminho>` ou
`git -c core.autocrlf=false checkout`.

**(h) O que e resíduo de OUTRA sessao e nao entra no merito deste bloco:** os 4 arquivos ` M` reais + 8
`??` na arvore principal (ciclo 5 do `B-O6R-02`), o `sync-agent-agents --check` **vermelho na raiz**, os
worktrees `b04a`/`b11`/`gov-descuido`/`gov-elenco`/`sanb1`/`w-s1`. Achado sobre isso e **`pre-existente`**
com evidencia de origem — e, pela regra da casa, **se reporta, nao se varre**.

---

# VEREDITO: **LIBERADO COM RESSALVA**

O tabuleiro esta limpo nos itens que decidem a validade do voto: o objeto e o do PR, a arvore do dev nao tem
mutacao viva nenhuma, o isolamento esta declarado por escrito e cumprido (sem junction, base viva intocada),
os insumos existem, as tres identidades sao elegiveis e carregam **o mesmo corpo** que o head julga, a fatia
S0 esta verde **no objeto**, os guards de KPI passam por re-execucao minha, o baseline `npm run check` e
**ec=0** e — a regra que este bloco inaugura — o objeto tem **7 check-runs concluidos, 7 verdes**.
Nada que eu tenha medido justifica BLOQUEADO; nada ficou por medir.

**As 8 ressalvas, para entrarem no briefing das cadeiras em destaque:**

| # | Ressalva | Peso |
|---|---|---|
| **R-1** | Os numeros da Emenda 1 (80/80, 33, 8) chegam como "Medido:" e os tres insumos **discordam do denominador** (80 x 43; 41 x 43; 138 x 146 ref tips). Re-medir ou publicar com N, forma e causa — §8(a). | forte |
| **R-2** | **Participacao previa declarada:** `validador-mestre` (ciclo 1) e `agente-ci-doutor` (ciclo 2) votaram nas juntas do **`PLANO_SAN3.md`**, e este bloco altera o **§5** desse plano; `agente-secops` foi suplente nao convocado. Medi que a premissa em julgamento **nao** vem daquele documento — sobrepoe-se a vizinhanca, nao a conclusao. Declarado; nao bloqueia. | media |
| **R-3** | **Calibracao de quorum:** maioria de 3, com razao escrita. Duas leituras puxam para unanimidade de 3 (`.gitignore` como superficie de seguranca; a ampliacao nominal que **nomeia** `auth.adapter.ts`/`prisma/seed.ts`). Com 3 cadeiras os dois quoruns so divergem se houver dissidencia: **se uma reprovar, a ata decide a calibracao ANTES de concluir**. | forte |
| **R-4** | **Perda de jurado:** o briefing invoca P1/P2/P5/P6 mas **nao transcreve** a regra do voto perdido (`PROTOCOLO-JUNTA-RESILIENTE` l.35-38: *voto perdido nao conta; o sucessor tem identidade nova e re-executa*), e **nao nomeia suplente** para nenhuma cadeira. Levar por extenso. | forte |
| **R-5** | A conferencia "verbatim" da ampliacao nominal tem de ser contra **`aadaa6d5`** (l.9721), nunca contra o head (l.9723, texto do proprio bloco); e `docs/navigation-matrix.md` **nao esta no diff** — §8(c). | forte |
| **R-6** | O criterio de aceite do plano-mestre para o bloco 0 ainda diz *"verde com os 41 corpos no tree"*, contradizendo o item 0a riscado. **Nao e DoD** — §8(b). | forte |
| **R-7** | **Resíduo de outra sessao** na arvore principal (4 ` M` reais do ciclo 5 do `B-O6R-02`, 8 `??`, `sync-agent-agents --check` **ec=1** na raiz) e 6 worktrees alheios vivos. Nao toca o objeto; **se reporta, nao se varre**. E o **corpo do inspetor na raiz esta 3 itens defasado** em relacao ao head (§0) — quem invocar gate daquele diretorio carrega um corpo mais pobre. | media |
| **R-8** | **Metodo de medicao do `.gitignore`:** `git check-ignore -v` imprime tambem o padrao de **negacao**; a regua e o **exit code** (`-q`), nas **duas pontas**. E a arvore e **CRLF no disco** (`i/lf w/crlf`, `core.autocrlf=true`): ancora com `\n` da verde falso — §8(f) e §8(g). | forte |

**O que eu NAO julguei** (nao e meu papel): se a falsificacao da premissa esta certa; se o `.gitignore` faz
o que promete; se o escopo do diff cabe no §5; se os numeros de KPI estao certos; se a ampliacao nominal e
transcricao fiel. Isso e o merito — C1, C2 e C3.

**Se a junta reprovar:** o teto e o `D-TETO-DOIS-CICLOS`, e quem achar **nao** conserta (§C7.4-bis).

---

## 9. Quadro final dos itens (substitui a tabela "EM MEDICAO" do topo)

| # | Item | Resultado |
|---|---|---|
| 0 | Corpo aplicado (3.3 sobre mim mesmo) | **DIVERGIU** — raiz 3 itens defasada; apliquei o **superset** do head |
| 1.1 | Arvore sem mutacao viva, head = `7822deaf` = head do PR #392 | **VERDE** |
| 1.2 | Plano de isolamento declarado (worktree/caminho curto/`npm ci`/sem junction/conteiner proprio/base viva fora) | **VERDE** (e junction conferida por `fsutil`) |
| 1.3 | Residuo no terreno do bloco | **VERDE**; residuo alheio **reportado**, nao varrido |
| 2.1 | Ata do ciclo anterior | **N/A** — ciclo 1, provado por `ls` |
| 2.2 | Critico + PD (ciclo >= 3) | **N/A** |
| 2.3 | Comando com escopo e bateria **com forma declarada** | **VERDE** |
| 3.1-bis | Obituario lido antes do grep | **VERDE** (nenhuma SEPULTADA/RESERVADA) |
| 3.1 | Inelegibilidade por nome | **VERDE** + participacao previa declarada (R-2) |
| 3.2 | Competencia x achados | **VERDE** |
| 3.3 | Corpo carregado x corpo julgado (3 cadeiras) | **VERDE** (md5 EOL-neutro) |
| 4.1 | Fatia S0 — espelho Codex, recursivo | **VERDE no objeto** (ec=0, 23 agentes); vermelho na raiz e de outra sessao |
| 4.2 | Guards de KPI + `kpi-freeze` + `node --check` | **VERDE** (17/17, 6/6, 6/6, ec=0) |
| 5 | CI do objeto (regra nova) | **VERDE** — 7 check-runs, 7 `completed`/`success` |
| 6 | Baseline honesto `npm run check` | **VERDE** (ec=0, worktree isolado meu) |
| 7.1 | Quorum declarado | declarado; calibracao a consignar (R-3) |
| 7.2 | Perda de jurado | parcialmente declarado (R-4) |
| 7.3 | P5 | conferido, com alerta de contagem |
| 8 | Afirmacoes a re-verificar | 8 blocos nomeados (a)-(h) |

**Atualizacao do P5, medida depois da limpeza:** apareceu o worktree `C:/Users/AMP/w-j-sanb1-c1`
(detached @ `3a0ea095`) — a junta paralela do **`B-SAN3-B1`** **ja disparou a cadeira C1**. Com ela viva,
**o teto de 2 em paralelo ja esta ocupado**: esta junta comeca disparando **uma cadeira por vez** ate o B1
liberar assento.

## 10. Limpeza (§C5) — o que eu criei e o que confirmei ter derrubado

- **Criei:** um worktree detached meu, `C:/Users/AMP/w-insp-san300` (caminho curto), com `npm ci` proprio
  (326 pacotes) e client Prisma gerado.
- **Derrubei, pelo nome:** `git -C <repo> worktree remove --force C:/Users/AMP/w-insp-san300` -> **ec=0**;
  `ls` do caminho -> *No such file or directory*; `git worktree list` mostra os **8** worktrees restantes,
  **todos alheios e intactos** (`b04a`, `b11`, `gov-descuido`, `gov-elenco`, `san300`, `sanb1`,
  `w-j-sanb1-c1`, `w-s1`). **Nunca** rodei `git worktree prune`, `git clean`, `stash`, `checkout` ou `reset`
  em arvore nenhuma.
- **Nao criei conteiner nenhum** (`docker ps -a | grep -Ei "insp|san300"` -> vazio); **a base viva nao
  recebeu um comando** — o `DATABASE_URL` que usei aponta para a porta **59998**, que nao existe.
- **Nao escrevi** na arvore principal, nem no worktree julgado (`san300` segue em `7822deaf` com
  `status --porcelain -uall` **vazio**), nem em worktree alheio.
- **Deixei no scratchpad** (logs brutos, fora da pasta de votos): `insp-npmci.txt`, `insp-prisma.txt`,
  `insp-check.txt`, `insp-kpi*.txt`, `insp-s0-san300.txt`, `insp-s0-raiz.txt`, `insp-obituario.txt`.
- **Disco:** 12 GB livres antes e **12 GB** depois.
