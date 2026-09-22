# C1 — `validador-mestre` — evidência executada (junta do `B-SAN3-00`, PR #392, objeto `7822deaf`)

- **Modelo:** `claude-opus-5[1m]` · **corpo aplicado:** lido da ref julgada (`git show 7822deaf:.claude/agents/validador-mestre.md`), md5 EOL-neutro `804d89f01d920ed72c23e5e24c062501`, idêntico ao corpo da sessão.
- **Worktree próprio:** `C:/Users/AMP/w-j-san300-c1` (detached @ `7822deaf`, caminho curto **conferido na saída de `git worktree list`** — não saiu o prefixo anômalo `C:/c/`). Sem junction, sem `npm ci`, **sem contêiner**, base viva sem um comando.
- **Forma:** git-bash com `export MSYS_NO_PATHCONV=1`, exit code por variável, conteúdo lido por `git show <ref>:<caminho>` e comparado por **md5 EOL-neutro** (a árvore é `i/lf w/crlf` sob `core.autocrlf=true`; `diff` cru mente).
- **VEREDITO: REPROVADO** — 2 `bloqueia`, 3 `ajuste`, 3 `nota`.

---

## E0. Fato de terreno que mudou DURANTE a junta

A `origin/main` **andou**: era `aadaa6d5` (base declarada) e hoje é **`b8cd22df`** — o **#391 (`B-SAN3-B1`) mergeou**.

```
git log --oneline aadaa6d5..origin/main   -> b8cd22df chore(ci): o CI passa a existir no SHA que a junta julga (B-SAN3-B1)
git merge-base 7822deaf origin/main       -> aadaa6d5      (a branch NAO divergiu; a main e que andou)
gh pr view 392 --json mergeable,mergeStateStatus -> CONFLICTING / DIRTY
git merge-tree --write-tree 7822deaf origin/main -> ec=1, conflito em 8 arquivos
```
Os 8 em conflito: `Kpis/app.js`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/kpis-latest.json`,
`agent-orchestration/codex/log-execucao.md`, `agent-orchestration/controle/pendencias-indice.md`,
`agent-orchestration/controle/pendencias.md`, `agent-orchestration/docs/status-geral.md`.
**É exatamente a interseção dos arquivos do #391 com os do #392.** Daí saem A2, A3 e A4.

## E1. Escopo — **VERDE**, medido pathspec a pathspec

```
git diff --name-only aadaa6d5 7822deaf -- <dir>
  src 0 · tests 0 · frontend 0 · mobile 0 · prisma 0 · scripts 0 · .github 0
  infra 0 · migrations 0 · .env 0 · package-lock.json 0 · CLAUDE.md 0 · AGENTS.md 0 · pubspec.yaml 0
```
20 arquivos: `.agents` 2 · `.claude` 2 · `.gitignore` 1 · `Kpis` 4 · `agent-orchestration` 10 · `docs` 1.
`PLANO_SAN3.md`: as 3 linhas alteradas caem entre `## 5. Os blocos` (l.223) e `## 6.` (l.331) — **só o §5**.
`git diff --check aadaa6d5 7822deaf` → **ec=0**. `package.json`/`frontend/package.json` intocados → **sem dependência nova**.
`git diff --shortstat` → **+691/−2122** (o dev declarou +659; a diferença de 32 é o commit `7822deaf`, a emenda 2 do **orquestrador**, posterior ao relatório — `7822deaf~1` dá exatamente +659). **N1.**

## E2. A premissa falsificada — RE-EXECUTADA, e a falsificação está CERTA

```
find <main>/.claude/agents <main>/.agents/agents -name '*.md'        -> 129
git ls-tree -r --name-only origin/main | grep os dois espelhos       ->  51
  => FORA da origin/main                                             ->  80  (41 .claude/ + 39 .agents/)
git rev-list --objects --all | filtro dos dois espelhos              -> 316 blobs distintos (151 ref tips)
git hash-object de cada um dos 80 x esse universo   => PERDIDOS      ->   0 de 80
```
Classificação dos 41 contra `OBITUARIO-IDENTIDADES.md` × `controle/aposentadoria-especialistas.md`:

| classe | N |
|---|---|
| sepultada **e** aposentada | 10 |
| só sepultada | 13 |
| só aposentada | 10 |
| **subtotal com decisão escrita** | **33** |
| sem decisão | **8** |

Os 8 são **exatamente** `jurado-o6r04a-c2-*` (4) e `jurado-o6r11-*` (4) — as cadeiras dos blocos em voo.

**Teste mais duro que o do dev** (ele provou alcançabilidade em *qualquer* ref, o que incluiria branch só local — e a `D-DURABILIDADE-BRANCHES-LOCAIS` diz que o que só existe num disco não conta):
```
git rev-list --objects --remotes=origin   -> 15973 blobs
dos 80, alcancaveis SO por ref LOCAL      -> 0        (os 80 existem em origin)
8 em voo x blob da branch julgada         -> 4/4 em 738ff531 e 4/4 em 43557a17, IDENTICOS
```

**Veredito: a falsificação está CERTA.** Versionar os 41 não consertaria nada (0 perdido, e durável em `origin`);
desfaria três rodadas escritas para 33 identidades (OBITUÁRIO §1.2: *"Identidade SEPULTADA não entra em junta
nenhuma. Nunca."*); e duplicaria na `main` os 8 corpos que #388/#389 já trazem idênticos, criando conflito no merge
deles. O executor falsificar a premissa do planejador, **reportar e não executar**, foi o §C7.4-bis funcionando —
**não é achado**. O denominador (41/138 dele, 43/146 da 1ª instância, 80 e 151 tips meus) diverge nos três; o
**conjunto e o veredito** são os mesmos nos três, como a emenda 2(a) previu.

## E3. `C1-A1` (bloqueia) — a prova publicada é VAZIA POR CONSTRUÇÃO, e mergeia

**Onde está, em arquivo que MERGEIA:**
```
Kpis/kpis-history.md:2781   "git ls-files -z | git check-ignore -z --stdin sai VAZIO - 0 arquivo rastreado hoje passa a ser ignorado"
Kpis/kpis-history.md:2830   "... da 0 ABSOLUTO"
agent-orchestration/codex/log-execucao.md:4518          mesma forma
agent-orchestration/controle/decisoes.md:2530           mesma forma
agent-orchestration/codex/comandos/B-SAN3-00-*.md:97    PRESCREVE: "Provar por exit code de git check-ignore -q ... e provar
                                                        que 0 arquivo rastreado hoje passa a ser ignorado"
```

**PROVA A — `check-ignore` sem `--no-index` nunca reporta rastreado:**
```
git ls-files --error-unmatch CLAUDE.md        -> ec=0  (esta rastreado)
git check-ignore -q CLAUDE.md                 -> ec=1  (diz NAO ignorado)
git check-ignore -q --no-index CLAUDE.md      -> ec=0  (esta ignorado, de fato)
```

**PROVA B — no objeto, a forma publicada × a forma que pode falhar:**
```
git ls-files -z | git check-ignore -z --stdin              -> N=0
git ls-files -z | git check-ignore -z --no-index --stdin   -> N=3  (AGENTS.md, CLAUDE.md, docs/claude-code-handoff/CLAUDE.md)
```

**PROVA C — a decisiva: a MESMA forma publicada, rodada com o `.gitignore` da BASE.**
Substituição provada ANTES de ler resultado, e restauração provada depois:
```
md5 EOL-neutro disco antes  = d965d5a903bbfdbeb63ceda1a486efb2 (= blob 7822deaf)
git show aadaa6d5:.gitignore > .gitignore
md5 EOL-neutro disco depois = 2ad3f3f41aed2bc8b1a31cd646a3de25 (= blob aadaa6d5)  SUBSTITUICAO PROVADA
ocorrencias do bloco novo no disco = 0

  FORMA PUBLICADA (sem --no-index) -> N=0      <<< o MESMO 0 do objeto
  FORMA --no-index                 -> N=128

git checkout -- .gitignore ; md5 = d965d5a903bbfdbeb63ceda1a486efb2   RESTAURACAO PROVADA
git status --porcelain -uall -> vazio
```
**A forma publicada devolve 0 para os DOIS `.gitignore`.** Não distingue o antes do depois; não pode falhar.

**A conclusão, porém, é VERDADEIRA** — provada por mim com a forma que pode falhar, universo único (os 3492
rastreados do objeto), `--no-index` nas duas pontas:
```
ignorados com .gitignore da BASE   -> 128
ignorados com .gitignore do OBJETO ->   3
comm -23 (objeto menos base)  -> N=0    PASSARAM a ser ignorados
comm -13 (base menos objeto)  -> N=125  DEIXARAM de ser ignorados
```
Reconciliação com a C2 (ela mediu 132/3): ela usou os **3494 rastreados da BASE**, eu os **3492 do OBJETO**; a
diferença de 4 são os 4 corpos `jurado-san3-01c2-*` que a dívida 2 remove — **128+4 = 132**. Dois caminhos
independentes, mesma conclusão.

**Por que é `bloqueia`:** o que merge é a *evidência*, não a minha medição. `kpis-history.md` é **append-only** e é
o artefato que o dono lê; e o **comando prescreve o instrumento** — e comando é o que o próximo bloco copia. Um
`.gitignore` que de fato escondesse arquivo rastreado **passaria nesse teste em verde**.

## E4. `C1-A2` (bloqueia) — o `approved_head` do #390 está errado e conflita com a `main`

```
objeto 7822deaf  : pr 390 -> merge_commit aadaa6d5...  approved_head a62d04e2bbe42533e58639643a19104bdccc0ab6
origin/main b8cd22df (#391, JA MERGEADO): mesma entrada -> approved_head fbda96b016ac65f88fe99d695295329e83938bea
```
**Convenção medida por precedente, não por leitura:**
```
gh pr view 387 --json headRefOid -> f999adb28272291d7be4a36db6f70f060aca02e7   (head do PR no merge)
approved_head PUBLICADO do 387   -> 8adaaa31f3709e2a01ad81b8154aba0243fa7a66
ata J-B-SAN3-01.md:18            -> "Objeto: 8adaaa31 (PR #387); head do PR = o objeto"
                                    => DIFEREM: approved_head = OBJETO DA JUNTA, nao head do PR no merge
gh pr view 390 --json headRefOid -> a62d04e2...   ;  ata J-B-SAN3-04a.md:5 -> "Objeto: fbda96b0 (PR #390)"
git merge-base --is-ancestor 8adaaa31 83a3c68c -> ec=1   (esperado sob squash)
git merge-base --is-ancestor fbda96b0 aadaa6d5 -> ec=1
```
O objeto publica **o head do PR**, não o objeto julgado → **contraria a convenção**.
A `main` ainda afirma, em `b8cd22df:Kpis/kpis-history.md` l.2822-2823, que *"os valores seriam os mesmos, e a
absorção da `main` no pré-merge resolve por união"* — **não são os mesmos**, e união não resolve campo escalar.
Origem da instrução errada: a prescrição do porteiro do #390 (o parecer que este PR versiona na dívida 5), que é
internamente inconsistente — ele próprio conferiu para o #387 o par `83a3c68c`/`8adaaa31`. **O parecer é documento
histórico e não deve ser editado.**

## E5. As 5 dívidas do porteiro do #390 — lidas do PARECER, não do relatório do dev

| # | Dívida (verbatim do veredito do porteiro) | Medição própria | Resultado |
|---|---|---|---|
| 1 | backfill §C3.5 do #390 em latest+history | `merge_commit` bate com `gh pr view 390`; `approved_head` errado (E4) | **PARCIAL** |
| 2 | aposentadoria rodada 4, `git rm` nos DOIS espelhos, `--check` verde, rodada EXECUTADA | base tinha **exatamente 4** arquivos em `especialistas/`, **todos** com o identificador de **BLOCO** `jurado-san3-01c2-`, nenhum de outra sessão; objeto tem **0**; peso por `git cat-file -s` = 48295+51843 = **100138 B** (bate **ao byte**); l.118 e l.132-133 marcam **EXECUTADA**; `sync-agent-agents --check` → `OK — 23 agentes`, ec=0 | **PAGA** |
| 3 | dono real / ampliação nominal nas 2 pendências | verbatim conferido contra a **BASE** (E6) | **PAGA** (ressalva A5) |
| 4 | linha do `B-SAN3-01b` no §5 | linha nova, com fronteira, as 4 mutações da C4 como teste de encerramento, dep. `SAN3-01` ✓, quórum **unanimidade (perda de dado)** | **PAGA** |
| 5 | versionar o parecer | `omega/juntas/votos/B-SAN3-04a/00c-porteiro-pos-merge-390.md` **A**, 111 linhas | **PAGA** |

## E6. `C1-N2` — a verbatim da ampliação, ancorada na BASE (R-5), não no head

```
git show aadaa6d5:agent-orchestration/controle/pendencias.md | sed -n '9700,9745p'   -> l.9721 confere
  "Ampliacao nominal necessaria: docs/navigation-matrix.md nao esta no §5 de bloco nenhum;
   quem executar o 06a o declara no §5 DO COMANDO (mesmo precedente do frontend/index.html na
   P-WEB-FONTE-INTER-NAO-CARREGADA)"
```
| item prescrito na base | o que o §5 do objeto escreve | bate? |
|---|---|---|
| `docs/navigation-matrix.md` | `docs/navigation-matrix.md` | **sim** |
| dono `B-SAN3-06a` | linha do `B-SAN3-06a` | **sim** |
| `rolePermissions` de `auth.adapter.ts:260-356` | "**só** o mapa estático `rolePermissions` (l.260-356)" | **sim** |
| 5 papéis `finance, inventory, operator, field_technician, support` (dono `B-SAN3-07`) | os 5 nomes, mesmo dono, "**aditivo**" | **sim** |
| **lugar:** "no §5 **do comando**" | declarado no §5 do **`PLANO_SAN3.md`** | **diverge** |

O precedente citado (`P-WEB-FONTE-INTER-NAO-CARREGADA`, `aadaa6d5:l.9587`) também deixou a ampliação como promessa
no campo *dono*. **Não é achado de substância:** o defeito que a pendência apontava era, literalmente, *"não está no
§5 de bloco nenhum"* — e é isso que o bloco corrigiu, num lugar mais visível e mais cedo. Registro só para a ata não
carregar "verbatim" como se o **lugar** também tivesse sido transcrito.

## E7. `C1-A5` — a ampliação do `seed.ts` × o quórum declarado do `B-SAN3-07`

```
awk sobre a linha do B-SAN3-07 no §5, nos dois lados:
  BASE    fronteira = "prisma/seed.ts (autorizado so para o nome)"        Junta = [ maioria ]
  OBJETO  fronteira = "... TAMBEM para semear finance, inventory,
                       operator, field_technician e support"              Junta = [ maioria ]   <<< nao mudou
  (comparacao: B-SAN3-06a, que ganhou auth.adapter.ts na mesma passada, ja diz
   [ unanimidade + coordenador-de-acessos + cognicao-visual ] -> ali o par ficou coerente)
CLAUDE.md §C7.1-ter(b), l.374-375 da ref julgada: "Unanimidade de 3 quando o bloco toca dinheiro,
  seguranca, permissao ou perda de dado; maioria de 3 no resto"
precedente da rodada: o B-SAN3-04a (catalogo de permissoes) foi julgado com unanimidade de 3
```
Semear cinco papéis globais com as concessões do catálogo **é tocar permissão**. A norma (§A1.2) vence o plano
(§A1.3), então o risco é mitigado — por isso `ajuste` e não `bloqueia`. Mas foi **este** bloco que alargou a
fronteira sem tocar na coluna.

## E8. KPI (§C3) e registro — re-executados

```
blocks_completed: base 165 -> main HOJE 166 (#391) -> objeto 166     <<< A3: o correto passa a ser 167
3 trilhas CARREGADAS com nota, e as notas sao honestas:
  backend_tests 3052  "CONFIRMACAO POR REGRESSAO, nao medicao do trabalho do PR"
  frontend_smoke 1202 idem
  flutter_tests 864   "SEM confirmacao por regressao: a trilha Flutter NAO foi reexecutada"
mvp_demo 99 e mvp_vendavel 88 INTOCADOS · pr/merge_commit/approved_head do PR corrente = null na autoria
node --check Kpis/app.js                -> ec=0
node scripts/kpi-freeze.mjs --check     -> "kpi-freeze: em dia (snapshot 2026-09-21)"  ec=0
node scripts/sync-agent-agents.mjs --check -> "OK - 23 agentes, espelho consistente"   ec=0
```

**Índice de pendências — provado como saída do GERADOR, por re-execução:**
copiei os blobs de `7822deaf` de `pendencias.md` e de `gerar-indice-pendencias.py` para uma árvore limpa **fora do
repo** e rodei o gerador:
```
saida do proprio gerador: 411 cabecalhos / 400 IDs | {FECHADA: 110, ABERTA: 301}
                          | baldes {-:110, C:69, B:100, A:132} | diferidas-materiais 13
md5 EOL-neutro do indice gerado agora = 8dd1f459323c410fd3a1b4a06625126d
md5 EOL-neutro de 7822deaf:pendencias-indice.md = 8dd1f459323c410fd3a1b4a06625126d   IDENTICO
```
(md5 EOL-neutro, e não `diff` cru, porque a árvore é `i/lf w/crlf`.)

`decisoes.md:2479` abre `REGISTRO-SAN3-00-CORPOS-DE-JURADO` como **registro §A2 de premissa falsificada**, não como
decisão do dono — classificação correta. `pendencias.md` abre `P-SAN3-00-RESIDUO-ELENCO-DEMO-INVESTIDOR` com dono
**"a junta nomeia"** e método proposto sem escolher. `status-geral.md` e `log-execucao.md` coerentes.

## E9. Limpeza (§C5) e resíduo alheio

- **Criei:** um worktree detached, `C:/Users/AMP/w-j-san300-c1` (caminho curto **conferido**). Sem `npm ci`, **sem
  contêiner**, sem junction. A base viva **não recebeu um comando**.
- **Não escrevi** na árvore principal, nem no worktree do dev (`san300` segue em `7822deaf`), nem em worktree alheio.
  A única mutação foi no **meu** `.gitignore`, provada nos dois sentidos e restaurada.
- **Removido pelo nome** ao fim. Logs brutos no scratchpad, fora da pasta de votos: `c1-*.txt`, `c1-gen/`.
- **Resíduo alheio — reporto, não varro:** árvore principal em `demo/investidor@d1fab3bc` com modificação viva de
  outra sessão; worktrees `b04a`, `b11`, `gov-descuido`, `gov-elenco`, `sanb1`, `w-s1`. **Mudou desde a inspeção:**
  `sanb1` andou de `3a0ea095` para `09dc4345` e o `w-j-sanb1-c1` já não existe — a junta paralela terminou e o
  **#391 mergeou durante esta junta**.
