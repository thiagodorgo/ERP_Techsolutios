# B-GOV-MANDATO — ciclo 2 — PLANO (PR #393)

- **Papel:** `planejador-mestre` · **Modelo:** Fable 5.1 (`D-PLANEJADOR-MODELO-FABLE` cumprido — sem substituição) ·
  **Corpo aplicado:** `.claude/agents/planejador-mestre.md`.
- **Separação de papéis (§C7.4-bis):** C1 e C2 acharam — não planejam nem consertam. Eu planejo e **não desenvolvo**.
  O orquestrador está **inelegível como dev** (escreveu `mandato-refs.sh`, `mandato-preflight.sh` e o teste). O dev
  do ciclo 2 é identidade nova e **não julga a validade dos achados**: implementa este plano e reporta o que mediu.
- **Insumos lidos integralmente:** `J-B-GOV-MANDATO.md` (ata, 2 × 1), `VOTO-C1.md`, `VOTO-C2.md` (273 l.),
  `VOTO-C3.md`, `R-B-GOV-MANDATO-1.md`, `D-NOITE-SEM-TETO`, os três artefatos julgados, o comando do bloco, a
  pendência `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME`.
- **Escrito incrementalmente** (§0 primeiro). Não commitado, não empurrado — isso é do orquestrador.

---

## §0 — Terreno e LINHA DE BASE (tudo medido por mim, no meu worktree `C:/Users/AMP/w-plan393`)

### 0.1 Terreno — e o chão que se moveu durante o planejamento

```
$ git rev-parse chore/mandato-refs-e-preflight        # no INICIO da sessao
1b66b444182d85ace45682004668dda17280606d
$ git worktree add --detach C:/Users/AMP/w-plan393 1b66b444 ; ls -d C:/Users/AMP/w-plan393 ; git status --porcelain | wc -l
C:/Users/AMP/w-plan393
0
$ gh pr view 393 --json headRefOid --jq .headRefOid   # minutos depois
58801bf022bbc431b3433cdc8f0e133b7b6668f4
$ git log --oneline 1b66b444..58801bf0
58801bf0 docs(decisao): D-NOITE-SEM-TETO expira as 07:00 (10:00Z) — hora marcada e regra de corte
fd36ae08 docs(decisao): D-NOITE-SEM-TETO estreitada as palavras do dono — amanha de manha o teto volta
8ae12edb docs(decisao): D-NOITE-SEM-TETO — teto de ciclos suspenso nesta noite, com escopo e o que NAO muda
2404e441 docs(reprovacao): R-B-GOV-MANDATO-1 — a classe unica por tras dos 4 bloqueantes, e os 3 erros do orquestrador
$ git log --oneline 58801bf0..d2ae17d3                 # ao escrever este arquivo, w-mandato ja estava em d2ae17d3
d2ae17d3 chore(junta): medidor-de-cobertura-do-artefato — o especialista do ciclo 2 (§C7.4)
$ git diff --name-status 7462b75b d2ae17d3 -- scripts tests | wc -l
0
$ for f in scripts/mandato-refs.sh scripts/mandato-preflight.sh tests/mandato-refs.test.ts; do git rev-parse d2ae17d3:$f | cut -c1-8; done
e056f38c   2592b8d9   52d61d32          # = os blobs do objeto julgado 7462b75b (C1 e C2 mediram os mesmos)
```

**Fatos de terreno que o plano usa:**
- O ramo andou **três vezes** enquanto eu media (`1b66b444` → `58801bf0` → `d2ae17d3`); **os três artefatos julgados
  são byte-idênticos** do objeto `7462b75b` até `d2ae17d3`. Toda medição abaixo vale para qualquer desses heads.
- **`D-NOITE-SEM-TETO`** (decisão do dono, lida em `58801bf0:agent-orchestration/controle/decisoes.md` l.2633): o
  `D-TETO-DOIS-CICLOS` está **suspenso até 2026-09-26 07:00 BRT = 10:00Z**; ciclo já em curso às 07:00 segue até
  concluir. Medido `date -u` = `2026-09-26T02:58Z` — o ciclo 2 nasceu sob a suspensão. **Este plano NÃO usa a
  suspensão para dimensionar nada**: o mandato que recebi diz "o teto não pode escolher a engenharia", e a própria
  decisão manda ler permissão ambígua "pelo lado estreito". O conserto é dimensionado pela engenharia (§3) e o teto
  entra só como fato registrado.
- O especialista que o R-1(a) pediu — *"o teste mede o artefato, não uma réplica"* — **já existe**:
  `medidor-de-cobertura-do-artefato` (commit `d2ae17d3`, nos dois espelhos). A composição da junta 2 está em §10.
- EOL: `git ls-files --eol` → `i/lf w/crlf` nos dois `.sh` e no teste; `tr -cd '\r' | wc -c` no blob = **0**. O git
  guarda LF; o Windows mostra CRLF por `autocrlf`. O arnês (§2.E1) roda em ubuntu com LF e no Windows com CRLF — o
  teste **não pode** depender de `\r`.
- Resíduo alheio visto e **não tocado**: worktrees `b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato`; na
  árvore principal 4 corpos `c5` modificados e `??` de outras sessões, entre eles
  `agent-orchestration/omega/juntas/TEMPLATE-J-ata.md` (**não rastreado**, `git ls-files` = 0, 92 linhas, de outra
  sessão) — **sem linha de Objeto** (`grep -nE 'Objeto' TEMPLATE-J-ata.md` = 0). Reporto; não varro.
- Base viva `erp-postgres`/`erp-redis`: nenhum comando meu abriu conexão. `npm ci` próprio em `w-plan393`, sem junction.

### 0.2 Linha de base — os quatro bloqueantes REPRODUZIDOS por mim com os artefatos reais

**C1-01 — a trava só enxerga `^[-*] `.** Mesmas 3 afirmações numéricas, zero `medido por:`, dentro de `## MEDIDO`:

```
$ for f in bullet tabela paragrafo numerada; do bash C:/Users/AMP/w-plan393/scripts/mandato-preflight.sh $f.md | tail -1; done
bullet     PRE-VOO REJEITOU 1 item(ns). O mandato NAO sai.   ec=1
tabela     PRE-VOO OK — tabela.md                             ec=0
paragrafo  PRE-VOO OK — paragrafo.md                          ec=0
numerada   PRE-VOO OK — numerada.md                           ec=0
$ grep -c 'falha "' scripts/mandato-preflight.sh
9
```

**C2-01 — o guard mede uma réplica.** Guard real 6/6; cópia byte-idêntica em sandbox 6/6; **sem o script**:

```
$ node --test --import tsx --test-reporter=tap tests/mandato-refs.test.ts | grep -E '^# (tests|pass|fail)'
# tests 6 / # pass 6 / # fail 0         ec=0
$ rm $SANDBOX/scripts/mandato-refs.sh ; node --test --import tsx --test-reporter=tap $SANDBOX/tests/mandato-refs.test.ts
not ok 4 - o script existe, e executavel e tem o modo --sha-only que o pre-voo consome
not ok 5 - o cabecalho do script nomeia o defeito que ele previne
# tests 6 / # pass 4 / # fail 2         ec=1      <- 4 dos 6 passam com o artefato APAGADO (confirma C2)
```

**C2-02 — `$RAMO` vazio fabrica `approved_head`.** Shim de `gh` devolvendo `headRefName:null` para o #393 (sem ata em `origin/main`):

```
$ PATH="$(cygpath -u $SHIM_GH):$PATH" bash scripts/mandato-refs.sh 393 | grep -E 'ramo:|approved_head|LIDO'
ramo:
approved_head:   7822deaf9afabd076d1095eaf48a6dfb635e5401
                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-B-SAN3-00.md      ec=0
```

**C2-03 — `python` não declarado; falha com ec=0 e texto falso.** Shim `python` → `exit 1`, PR #392 (mergeado, com ata, junta votada):

```
$ PATH="$(cygpath -u $SHIM_PY):$PATH" bash scripts/mandato-refs.sh 392 | grep -E 'head do PR|merge commit|approved_head|NAO invente'
head do PR:      <vazio>
merge commit:    <ainda nao mergeado>                 <- FALSO: mergeou em fc3363e3
approved_head:   <NAO ENCONTRADO NA ATA>
                   NAO invente: se a junta ainda nao votou, nao ha approved_head.   <- FALSO: J-B-SAN3-00 existe
ec=0
$ ... bash scripts/mandato-refs.sh 392 --sha-only | wc -l
0            ec=0
$ bash scripts/mandato-refs.sh 392 --sha-only          # controle: ferramenta viva
5cfcd7d35f1fbb7027c8d1811898a1c0e3216188 / b8cd22dfd4185f6e71f937ad4ae155646177c78e / 7822deaf9afabd076d1095eaf48a6dfb635e5401 / fc3363e38aabd77f54e6b53034128182f8000571   ec=0
```

### 0.3 Linha de base — o corpus de atas (a "cobertura" que a ferramenta tem de DECLARAR, não presumir)

```
$ # censo em origin/main@fc3363e3, pela fonte (git ls-tree + grep), nao por leitura
total=107  com_linha_de_Objeto=5  com_Objeto_e_SHA_na_1a_linha=4  multi_Objeto=1 (J-B-SAN3-01: 2 linhas)
titulo_com_#N=15  corpo_menciona_algum_PR=48
#393 mencionado em 0 atas · #392 em 2 · #387 em 3
```

**Lacuna que ninguém tinha medido (achada por mim no §0; a junta 2 decide se entra — está em §2.E3.c):**

```
$ git cat-file -e d2ae17d3:agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md && echo SIM-no-ramo ; git cat-file -e origin/main:...J-B-GOV-MANDATO.md || echo NAO-na-main
SIM-no-ramo
NAO-na-main
$ bash scripts/mandato-refs.sh 393 | grep -E 'approved_head|nenhuma|invente'
approved_head:   <NAO ENCONTRADO NA ATA>
                 ^ nenhuma ata tem '#393' nem o ramo ... no TITULO ou na linha
                   NAO invente: se a junta ainda nao votou, nao ha approved_head.    <- FALSO: votou, 2 x 1, esta no ramo
$ git show d2ae17d3:agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md | grep -nE '^\- \*\*Objeto|^# '
1:# J-B-GOV-MANDATO — ciclo 1
3:- **Objeto julgado:** `7462b75bfb7768556a2da2ee13f9ac92e9198872`, resolvido **independentemente pelas três
```

A ata do PR corrente vive **no ramo**, não em `origin/main`; a ferramenta só lê `origin/$BASE`. E mesmo lendo o ramo,
**o cabeçalho desta ata não nomeia o PR** (título sem `#393`, linha de Objeto sem `#393` e sem o ramo) — a ata mais
recente do repositório, escrita com a ferramenta na mão, também está fora dos 5/107. Isso **confirma e endurece** a
hipótese secundária do orquestrador (§0.5).

### 0.4 "Onde mora a propriedade?" — PRIMEIRA resposta, pelo enunciado (antes do remédio)

| # | propriedade enunciada (o que a ferramenta PROMETE) | onde ela mora hoje no código | por que não mora ali |
|---|---|---|---|
| P-A | *todo item de MEDIDO tem `medido por:`; todo item de HIPOTESE tem `derruba com:`* (script l.12-13; comando l.62) | `mandato-preflight.sh` l.38/40: `s && /^[-*] /` | mora numa **forma** (marcador na coluna 0). A checagem 2 (l.29-35) admite conteúdo não-bullet dentro das seções → **nada** inspeciona o resto. 5 de 7 formas passam |
| P-B | *todo SHA citado vem da ferramenta* (l.43) | l.46: delimitador crase/espaço dos dois lados; `grep -oE` consome o delimitador direito | mora na **vizinhança** — 7 pontuações escapam, 2 SHAs a um espaço escondem o 2º |
| P-C | *asserção de ausência é insensível a caixa* (l.59) | l.60: vocabulário ASCII `nao (existe\|ha\|aparece)\|zero\|nenhum` + aspas duplas | mora no **vocabulário e na grafia** — "não" com til passa; aspas simples passam; qualquer `-i` no texto passa |
| P-D | *todo caminho citado existe* (l.63) | l.64: lista de 10 extensões entre crases; l.68: `find -name basename` | mora na **extensão** (`.sh` dos dois entregáveis fora) e no **nome** (basename, pendência aberta); l.67 inalcançável |
| P-E | *`approved_head` se LÊ da ata, nunca se inventa* (refs l.12-14) | l.48-56: laço com `break`; l.53: `grep -q "$RAMO"` | insumo **não validado**: `$RAMO=""` casa tudo (C2-02); `-m1`/`head -1` escolhem sem avisar (C2-04); fonte única `origin/$BASE` (§0.3); "ausente" e "não consegui ler" saem iguais |
| P-F | *o guard exercita o artefato que nomeia* (teste l.1-9) | `casar()` TypeScript l.18-33 | é uma **réplica**; os 2 casos que tocam o `.sh` param na mensagem de uso (caso 4) ou leem um **comentário** (caso 5) |
| P-G | *falha de insumo é visível* | `g()` l.29 `2>/dev/null`; l.60 `\|\| echo "0 0 0"`; l.33 `\|\| true` | `python` não está em `ver()`; toda falha vira campo vazio com ec=0 |

**A classe é uma só** (R-1 tem razão): P-A, P-B, P-C, P-D e P-F são *guarda que reconhece FORMA conhecida em vez de
enunciar PROPRIEDADE*; P-E e P-G são *insumo não validado tratado com a confiança do caminho feliz*. Dois remédios,
não doze.

### 0.5 As hipóteses do orquestrador — medidas, e o veredito de cada uma

| hipótese | veredito | evidência |
|---|---|---|
| H1 *o teste exercita o artefato real; o padrão já existe na main* | **CONFIRMADA, com uma correção** | `npm-test-runner-guard` e `agents-mirror-guard` usam `spawnSync(process.execPath, …)` sobre o script REAL em `mkdtemp`; `o6r06-billing-census` usa `execFileSync`. **Nenhum** deles cria repositório git em tmpdir nem shima `gh` — o arnês de §2.E1 é **novo** nesses dois pontos. Protótipo executado (§0.6): funciona no Windows |
| H2 *cada checagem enuncia a PROPRIEDADE; mata C1-01, acento, `.sh`, vizinhanças e basename de uma vez* | **CONFIRMADA** | protótipos §0.6: uma regra de unidade reprova 8/8 formas erradas e aceita o correto; uma tokenização pega as 11 vizinhanças sem falso positivo no caminho do scratchpad nem no UUID; uma checagem de existência exata fecha extensão + basename |
| H3 *`approved_head` fail-closed: lê, ou declara que não consegue* | **REFINADA — dois estados não bastam** | com dois estados, "ausente" continua mentindo para 102/107 atas e para a ata **deste** PR (§0.3). Precisa de **três**: LIDO / AUSENTE (nenhuma ata nomeia nem menciona o PR) / **NÃO DETERMINÁVEL** (ambíguo, ata sem Objeto, menção só no corpo, ata só no ramo) — com código de saída próprio |
| H4 *dependências declaradas e código de saída honesto* | **CONFIRMADA, e mais barata que parecia** | `gh --jq` embutido substitui o `python` inteiro: `gh pr view 393 --json … --jq '[…]\|@tsv'` devolveu 7 campos, ec=0 (gh 2.89.0). Zero dependência nova |
| H-secundária *fazer as 107 atas conformarem é OUTRO bloco* | **CONFIRMADA e endurecida** | a ata mais nova (a deste bloco, no ramo) também não é legível pela ferramenta; o template não rastreado de outra sessão não tem linha de Objeto. O ritual é o dono — §3, bloco `B-GOV-ATA-CABECALHO` |
| *"quatro mudanças estruturais, não doze remendos"* | **CONFIRMADA; acrescento uma quinta** | E3.c: fonte das atas = `origin/$BASE` **∪ head do PR**. Sem ela a ferramenta afirma "a junta não votou" sobre o PR para o qual foi construída (§0.3) |

**Nenhuma hipótese derrubada.** Uma refinada (H3: três estados), uma corrigida (H1: o arnês git+shim é inédito na
casa) e uma acrescentada (E3.c). Registro isso porque o mandato me pediu para derrubar por escrito o que não se
sustentasse — o que não se sustentou foi o **tamanho** de H3, não a direção.

### 0.6 Protótipos no scratchpad — "onde mora a propriedade?" SEGUNDA resposta, depois do remédio

Nenhum arquivo rastreado foi tocado (`git status --porcelain` = 0 em `w-plan393` antes e depois). Os protótipos
**não são o código do dev** — provam que a propriedade discrimina; o dev escreve o dele a partir do enunciado.

**(a) Checagem 3 por UNIDADE** (regra: linha não-indentada dentro da seção abre uma unidade; linhas indentadas e
blocos cercados por ``` se anexam a ela; linha em branco fecha; separador de tabela e cabeçalho de tabela — linha `|`
seguida de `|---|` — são isentos; **toda unidade de MEDIDO contém `medido por:`; de HIPOTESE, `derruba com:`**):

```
bullet           rejeicoes=2   REJEITADO unidade l.5: - suite 3058/3060
tabela           rejeicoes=2   REJEITADO unidade l.7: | suite | 3058/3060 |
paragrafo        rejeicoes=1   REJEITADO unidade l.5: A suite passou 3058/3060 e o CI 14/14.
numerada         rejeicoes=2   REJEITADO unidade l.5: 1. suite 3058/3060
citacao          rejeicoes=1   REJEITADO unidade l.5: > suite 3058/3060
recuada          rejeicoes=1   REJEITADO unidade l.5:   - suite 3058/3060 (recuada, sem pai)
bullet_um_sem    rejeicoes=1   REJEITADO unidade l.6: - CI 14/14           <- so o item SEM evidencia
tabela_uma_sem   rejeicoes=1   REJEITADO unidade l.8: | CI | 14/14 | |      <- so a linha SEM evidencia
correto          rejeicoes=0   (bullet com saida colada indentada + bloco ``` + tabela com coluna 'medido por:')
```
Declaro: a **1ª versão** do meu protótipo reprovou o `correto` (l.14, linha em branco após linha de dados de tabela) por
bug de *lookahead* meu; a 2ª versão (duas passadas) resolveu. Fica registrado para o dev **não herdar a 1ª como
especificação**: a especificação é a propriedade, e o critério de aceite inclui `correto.md → 0 rejeições`.
**Onde a propriedade passa a morar:** na partição em unidades — a forma da linha deixa de existir como conceito.

**(b) Checagem 4 por TOKEN** (token = corrida máxima de `[A-Za-z0-9_/.:-]`; tira pontuação final `.:-`; é SHA sse o token
inteiro é hex de 7–40, sem distinguir caixa; normaliza para minúsculas):

```
ATUAL (l.46) extrai:   7462b75bfb…9198872  fc3363e3                                   (2 de 11 vizinhancas)
PROPOSTO extrai:       7462b75b  7462b75bfb…9198872  e056f38c…61831  fc3363e3        (as 11: crases, virgula, ponto,
                       parenteses, hifen colado, MAIUSCULAS, commit=, inicio de linha, 2 SHAs a um espaco, :NN)
NAO extrai (correto):  o caminho do scratchpad (…/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/…), o UUID solto, `deadbeef.md`
```
**Onde passa a morar:** na definição de token — a vizinhança deixa de existir como conceito.

**(c) Checagem 6 por EXISTÊNCIA EXATA** (caminho = token com `/`, exceto absoluto `X:/` ou `/…`, URL `://`, glob `*`,
placeholder `<…>`; tira sufixo `:NN`; existe em `$RAIZ/$c` ou `$RAIZ/mobile/flutter_app/$c`; token na mesma linha
que `(novo)` é declarado a criar):

```
OK   scripts/mandato-refs.sh · scripts/mandato-preflight.sh · docs/limpeza-de-disco.md · docs/revisoes/SAN3/
OK-FLUTTER lib/core/sync/sync_action_store.dart          <- o uso legitimo que a pendencia protege
REJ  scripts/zzz-inexistente-8821.sh                       <- .sh agora conferido
REJ  scripts/zzz-inexistente-8822.sh                       <- SEM crases agora conferido
REJ  src/diretorio/que/nao/existe/env.ts                   <- basename real em diretorio errado: FECHA a pendencia
NOVO-DECLARADO tests/mandato-preflight.test.ts
```
Declaro: meu protótipo marcou `tests/` como NOVO por casar a substring em outra linha — a regra do dev é **por token na
mesma linha**. **Onde passa a morar:** em "existe neste caminho" — extensão e basename deixam de existir como conceito.

**(d) O arnês do `mandato-refs.sh` REAL** (repo git em tmpdir com 2 atas-fixture; `refs/remotes/origin/main` por
`update-ref`; `gh` shimado; script real do worktree, `cwd` = repo tmp):

```
$ PATH="$(cygpath -u $HARNESS/bin):$PATH" bash C:/Users/AMP/w-plan393/scripts/mandato-refs.sh 777 | grep -E 'head do PR|merge-base|approved_head|LIDO|check-runs'
head do PR:      d9758abc94ae441a5c4bbae6d4b4fcd0401f0a26
merge-base:      d9758abc94ae441a5c4bbae6d4b4fcd0401f0a26
check-runs:      total=3 nao-verdes=0 pendentes=0
approved_head:   c280cbda21e85cde831b37a331ec05d6f9995c96
                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-B-X.md            ec=0
```
O script real listou, casou, extraiu, expandiu (`rev-parse`) e imprimiu — **no Windows, sem rede, sem `gh` real**.
(Meu shim devolvia o mesmo `headRefName` para todo PR, e por isso 778/999 também casaram J-B-X pelo ramo — é o
comportamento esperado do script com esse insumo, e diz ao dev que **o shim tem de responder por PR**.)
**Onde a propriedade P-F passa a morar:** no `execFileSync("bash", [script, PR], {cwd: repoTmp, env})` — apagar o
script derruba **todos** os casos, não 2 de 6.

---

## §1 — Objetivo · ator · fluxo · o que muda de FORMA

- **Objetivo:** as duas ferramentas passam a decidir por **propriedade sobre o documento** e a tratar **insumo
  ausente como falha visível**; e o guard passa a **exercitar o artefato**. Fecha C1-01, C2-01, C2-02, C2-03, a
  pendência `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` (dono nomeado: este ciclo) e os ajustes da **mesma classe**
  (vizinhanças, acento, `.sh`, ambiguidade, morte da ferramenta, l.67, cobertura do pré-voo). O que é de OUTRO dono
  sai nomeado em §3.
- **Ator:** o orquestrador, ao escrever mandato/briefing/KPI (consumidor das duas ferramentas); o inspetor de terreno e
  o porteiro (consumidores do `approved_head`); o CI (consumidor dos dois testes).
- **Fluxo origem → destino:** `gh`/`git` → `mandato-refs.sh` → {stdout: campos lidos · stderr: diagnóstico · ec ∈
  {0,1,2,3}} → `mandato-preflight.sh` (checagem 4 consome `--sha-only`) → `PRE-VOO OK` / `REJEITADO` (ec 0/1) →
  mandato sai ou não sai. Testes: `tests/*.test.ts` → `bash <script real>` em arnês isolado → `npm test` → CI job
  `backend` (o runner lista `tests/*.test.ts` por `readdirSync`, `scripts/run-backend-tests.mjs` l.118 — o novo
  arquivo entra no CI **sem tocar `.github/`**).
- **O que muda de forma (a resposta ao R-1):** nenhuma checagem enumera formas; nenhum insumo vazio é tratado como
  "ausente"; nenhum teste lê comentário nem réplica. O que sobra de enumeração é **declarado** como exceção com custo
  (§2.E2, "custo aceito") — e cada exceção tem a mutação que a derruba.

---

## §2 — As cinco entregas (E1–E5): contrato · critérios com a mutação que os deixa vermelhos · drill e fronteira

Convenção dos critérios: **[Ax]** = critério de aceite; **⇄ mutação** = a alteração que TEM de deixá-lo vermelho
(executada pelo dev em cópia no scratchpad — nunca em arquivo rastreado — com saída colada no relatório). Critério
sem mutação executável **não entra**: é o defeito que o mandato do ciclo 1 cometeu treze linhas depois de o proibir.

### E1 — `tests/mandato-refs.test.ts` REESCRITO: o guard exercita o `.sh`, nunca uma réplica (fecha C2-01)

**Propriedade:** *o teste fica vermelho se — e só se — o comportamento do artefato muda.* Corolários: apagar o script
derruba **todos** os casos; reescrever só comentários não derruba **nenhum**.

**Contrato do arnês** (padrão da casa: `mkdtempSync` + processo-filho, como `npm-test-runner-guard` e
`agents-mirror-guard`; **novo** na casa: repositório git em tmpdir e `gh` shimado — protótipo executado em §0.6(d)):
1. `mkdtempSync` → `git -c init.defaultBranch=main init -q`; atas-fixture em `agent-orchestration/omega/juntas/`;
   `git -c user.name=t -c user.email=t@t -c core.autocrlf=false add/commit`; **`git update-ref refs/remotes/origin/main HEAD`**
   (é o que o script lista por `ls-tree origin/$BASE`). Fixtures escritas com `\n`; nenhuma asserção depende de `\r`.
2. Shim `gh`: arquivo bash gravado pelo teste (`chmodSync 0o755`), **responde por PR** (`$2`): `pr view <N>` devolve o
   JSON com a **forma REAL** capturada de `gh pr view 392 --json headRefOid,headRefName,baseRefName,state,isDraft,mergeable,mergeCommit`
   (colada no teste com a data da captura — não inventada); `api …/check-runs` devolve `{"total_count":N,"check_runs":[…]}`
   mínimo; qualquer outro argumento → `exit 9`. Casos de degradação usam shims que devolvem `headRefName:null` ou `exit 1`.
3. Invocação **do artefato**: `spawnSync("bash", [path.join(RAIZ,"scripts/mandato-refs.sh"), pr, ...modo],
   {cwd: repoTmp, env: {...process.env, MANDATO_GH: shim}, encoding: "utf8"})` — lê `status`, `stdout`, `stderr`.
   `MANDATO_GH` (default `gh`) é a **única** costura nova do script para este fim; documentada no cabeçalho.
4. **Proibido no teste:** `cat` do script; asserção sobre comentário; função que "reproduz o matcher".

**Fixtures (mínimo):** `ATA_390` e `ATA_392` **verbatim do ciclo 1** (as duas regressões reais); `ATA_MULTI` (duas
linhas de Objeto, SHAs distintos — o caso `J-B-SAN3-01`); `ATA_SEM_OBJETO` (título com `(PR #N)`, sem linha de
Objeto — a classe das 102); `ATA_MENCAO` (menciona `#N` só no corpo). Os SHAs das fixtures são **commits reais do
repo tmp** (o `rev-parse` expande de verdade).

**Critérios de aceite:**
- **[A1]** 390 → `fbda96b0…` expandido, `LIDO DA ATA: …J-B-SAN3-04a.md`; 392 → `7822deaf…`, `…J-B-SAN3-00.md`; ec=0.
  **⇄ mutação:** trocar o discriminador do `.sh` para "documento inteiro" (l.53 → `grep` sobre `$C`) → 390 devolve a
  ata do 392 → A1 vermelho. (No ciclo 1 essa mutação deixou 6/6 verde — é o vermelho-controle da C2, agora no teste.)
- **[A2]** script renomeado/apagado → **0 casos passam** (`status` ≠ 0 e stdout vazio em todos). **⇄ mutação:** é a
  própria medição; no ciclo 1 deu 4/6 verdes.
- **[A3]** reescrever **só** o comentário `# CASA PELO TITULO + LINHA DO OBJETO` → **100 % verde**. **⇄ mutação:** um
  teste que lesse a fonte (o caso 5 do ciclo 1) ficaria vermelho aqui — por isso ele não existe mais.
- **[A4]** `headRefName:null` → `PARADO` no stderr, ec=1, **nenhum** `approved_head` no stdout. **⇄ mutação:** remover
  a validação de `$RAMO` (E3) → o #393-fixture recebe SHA de outra ata → A4 vermelho (é C2-02 reproduzido no arnês).
- **[A5]** `gh` que sai 1 → ec=1, `--sha-only` com **0 linhas e ec=1**. **⇄ mutação:** `2>/dev/null || true` no lugar
  do `PARADO` → ec=0 → vermelho.
- **[A6]** os casos de E3 (multi, sem-objeto, menção, ata só no head do PR, flag inválida, paridade `--sha-only`) —
  listados lá, exercitados **aqui**, no mesmo arnês.
- **Contagem:** ≥ 10 casos, todos por `spawnSync` do artefato.

**Drill e fronteira:** o drill (A1–A5) corre **deste lado** da fronteira: o `gh` é shimado com a forma real datada. **Não
atravessa:** a API do GitHub e o binário `gh` reais. Medição deste lado: A1–A5. Do outro lado, a execução **viva**
`bash scripts/mandato-refs.sh 392` / `393` / `387` entra na bateria (§8) com saída colada — cobre o head deste PR; o
drift permanente da forma do JSON é pendência com dono `B-GOV-MANDATO-2` (§3).

### E2 — `scripts/mandato-preflight.sh` REESCRITO: cada checagem enuncia a PROPRIEDADE (fecha C1-01, basename, acento, `.sh`, vizinhanças, l.67)

Checagens 1 e 2 **mantidas** (seções existem; nada de conteúdo fora — `#…` e `>` fora seguem isentos, declarado).
Linhas `^#{3,} ` dentro das seções são cabeçalho, não afirmação — **isentas, declarado**.

**Checagem 3 — por UNIDADE, não por marcador.** Unidade = linha **não-indentada** dentro da seção + todas as linhas
**indentadas** e todo bloco cercado por ``` que a seguem; **linha em branco fecha**. Separador de tabela (`|---|`) e
cabeçalho de tabela (linha `|` imediatamente seguida de separador) são isentos — a **única** exceção estrutural, com
custo declarado. **Toda unidade de MEDIDO contém `medido por:`; toda unidade de HIPOTESE contém `derruba com:`.**
Cada unidade sem o token = **1** `REJEITADO … l.N: <1ª linha>`. O cabeçalho do script documenta a regra (hoje ela não
está declarada em lugar nenhum — C1 mediu: zero no comando, zero no briefing, zero no script).
- **[B1]** as 8 formas de §0.6(a) → rejeições **exatamente** 2,2,1,2,1,1,1,1 (bullet, tabela, parágrafo, numerada,
  citação, recuada, bullet-um-sem, tabela-uma-sem); `correto.md` → **0**. **⇄ mutação:** reintroduzir `^[-*] ` → a
  tabela passa → B1 vermelho. **⇄ mutação 2:** remover a isenção do cabeçalho de tabela → `correto.md` reprova → B1 vermelho.
- **[B2]** as **8 afirmações numéricas reais** do ciclo 1 (a lista da C1: 3058/2, 167→168, 14/14, 20/20, 5/5, 6, 9, 9)
  em **tabela** sem `medido por:` → 8 rejeições. **⇄ mutação:** idem B1.

**Checagem 4 — SHA por TOKEN.** Token = corrida máxima de `[A-Za-z0-9_/.:-]`; tira `.`, `:`, `-` finais; é SHA sse o
token inteiro é hex de 7–40 (caixa indiferente; normaliza para minúsculas). Consome `--sha-only` do refs (`MANDATO_REFS`,
default `$RAIZ/scripts/mandato-refs.sh` — 2ª e última costura). **Lê o ec do refs:** ec 1/2 → `REJEITADO: referências
indisponíveis (ec=N): <stderr>` — **nada foi verificado** (não "SHA velho"); ec 3 → `AVISO: approved_head não
determinável — <stderr>` e LEG = o que veio no stdout; SHA presente sem PR → `REJEITADO` (mantido).
- **[B3]** as 11 vizinhanças de §0.6(b) com SHA fabricado → 11 rejeições; controles **negativos** (caminho do scratchpad,
  UUID, `deadbeef.md`) → 0 rejeições. **⇄ mutação:** voltar ao delimitador crase/espaço → vírgula passa → vermelho.
- **[B4]** `MANDATO_REFS=<shim exit 1>` sobre mandato com SHAs corretos → `REJEITADO … referências indisponíveis`, ec=1,
  e a string `SHA VELHO` **não aparece**. **⇄ mutação:** ignorar o ec do refs → volta "não está na saída" → vermelho.

**Checagem 5 — `-i` por COMANDO, sem vocabulário.** Toda invocação `grep`/`rg` citada dentro das seções que **não**
tenha `-i` (isolado ou agrupado, `-[a-zA-Z]*i`) e cuja unidade **não** declare `caixa-exata:` → `REJEITADO`. Sem lista
de palavras: acento, aspas e o truque `via-interna` deixam de existir como conceito. **Custo aceito e declarado:** um
`grep -c` de contagem legítimo precisa de `-i` ou de `caixa-exata:`.
- **[B5]** "não aparece" acentuado + `grep` sem `-i` → rejeita; aspas simples → rejeita; linha com `via-interna` →
  rejeita; `-ni` → aceita; `caixa-exata:` na unidade → aceita. **⇄ mutação:** reintroduzir `nao (existe|ha|aparece)` →
  o acentuado passa → vermelho.

**Checagem 6 — EXISTÊNCIA EXATA, sem extensão e sem basename.** Caminho = token com `/` que não é absoluto (`^[A-Za-z]:/`,
`^/`), URL (`://`), glob (`*`) nem placeholder (`<`); tira sufixo `:NN`; existe em `$RAIZ/$c` **ou** `$RAIZ/mobile/flutter_app/$c`
(raiz Flutter — o uso legítimo que a pendência protege); token terminado em `/` exige diretório; token na **mesma linha**
que `(novo)` é declarado a criar e isento (**custo aceito:** é confiança declarada). **Some o `find -name`** e some a
l.67 (o absoluto é excluído na tokenização — a linha inalcançável deixa de existir).
- **[B6] — teste de encerramento da pendência, literal:** ≥ 20 basenames **rastreados** (gerados por `git ls-files
  'scripts/*.mjs' 'tests/*.ts' 'src/config/*.ts' | head -20`, nunca digitados) sob `src/diretorio/que/nao/existe/` →
  **0 aceitas**; `lib/core/sync/sync_action_store.dart` → aceito; 5 basenames inexistentes → 5 rejeitados.
  **⇄ mutação:** reintroduzir `find -name "$(basename "$c")"` → 20 aceitas → vermelho.
- **[B7]** `scripts/zzz-inexistente.sh` entre crases e **sem** crases → rejeitado nas duas; `tests/x.test.ts (novo)` →
  aceito; `docs/revisoes/SAN3/` → aceito; `src/**` → ignorado. **⇄ mutação:** voltar à lista de extensões → `.sh` passa → vermelho.

**Drill e fronteira (E2):** os drills B1–B7 correm sobre **fixtures no tmpdir** com `MANDATO_REFS` shimado — **não
atravessam** o `mandato-refs.sh` real (é E3/E4) nem a rede. As 8 formas e as 11 vizinhanças são **amostras** da
propriedade, não a propriedade: a regra não as enumera. Do outro lado ficam, com dono `B-GOV-MANDATO-2` (§3): SHA dentro
de URL (token com `/` → não é SHA), `Select-String`/`findstr`, nomes de arquivo sem `/`.

### E3 — `scripts/mandato-refs.sh`: `approved_head` em TRÊS estados — lê, declara ausente, ou declara que NÃO consegue (fecha C2-02, C2-04, e a lacuna §0.3)

**Propriedade:** *o valor impresso como `approved_head` foi LIDO de uma linha de uma ata que se declara sobre este PR;
"não há" só é afirmado quando nenhuma ata nomeia nem menciona o PR; toda outra situação é declarada NÃO DETERMINÁVEL,
com a lista do que foi visto.* Nada é escolhido em silêncio.

**Contrato:**
- **a) Insumos validados ANTES do laço** (mata C2-02 na raiz): `PR` numérico; `HEAD_PR` casa `^[0-9a-f]{40}$`; `RAMO` e
  `BASE` não-vazios. Falha → `PARADO: campo <x> vazio/ inválido na resposta do gh` no stderr, **ec=1**, nada no stdout.
- **b) Discriminador estrutural mantido** (título `# ` + linhas `- **Objeto…:**`), com duas correções: **todas** as
  linhas de Objeto votam (não só `-m1`); o ramo casa **delimitado** (crase, espaço, vírgula, fim de linha), nunca
  substring — e nunca vazio (garantido por a).
- **c) Fonte = `origin/$BASE` ∪ `$HEAD_PR`** (após fetch): a ata do PR corrente vive no ramo (§0.3). Mesmo caminho nos
  dois → vale o do head do PR (o mais novo); a saída registra `LIDO DA ATA: <f> @ <ref>`.
- **d) Coleta TODOS os candidatos** `(ata, linha, SHA)` — sem `break`, sem `head -1`; todos os SHAs de cada linha.
- **e) Estados e códigos de saída:**
  | estado | condição | stdout | ec |
  |---|---|---|---|
  | **LIDO** | exatamente 1 candidato | `approved_head: <40>` + `LIDO DA ATA: f @ ref` | 0 |
  | **AUSENTE** | 0 atas casam no cabeçalho **e** 0 mencionam `#PR` no corpo, nas duas fontes | `approved_head: AUSENTE — nenhuma ata nomeia nem menciona #PR (junta não votou, ou a ata não está em origin/BASE nem no head do PR)` | 0 |
  | **NÃO DETERMINÁVEL** | >1 candidato · ou ata casa no título sem linha de Objeto · ou atas mencionam `#PR` só no corpo | `approved_head: NAO DETERMINAVEL (motivo)` + lista `f:linha → sha` / `f (sem Objeto)` / `f (menção no corpo)` | 3 |
- **f) Expansão:** `git rev-parse --verify "$S^{commit}"`; se não resolve → imprime o SHA **como lido** com `(não resolvido
  localmente — fetch?)`; nunca completa dígitos.
- **g) `--sha-only`:** imprime `head`, `merge-base`, `merge commit` (os lidos) e `approved_head` **só se LIDO**; ec = o do
  estado; diagnóstico só no stderr. Consequência assumida: mandato de bloco multi-ciclo com ata ambígua **não cita**
  `approved_head` até a ata ser legível — é fail-closed, e é o que empurra o conserto para o ritual (§3).

**Critérios (exercitados no arnês de E1):**
- **[C1]** `headRefName:null` → ec=1, stdout sem `approved_head` (= A4). **⇄ mutação:** remover a); vermelho.
- **[C2]** `ATA_MULTI` → ec=3, stderr lista **2** candidatos com `arquivo:linha`. **⇄ mutação:** reintroduzir `break` →
  ec=0 com o 1º → vermelho. (É o #387 real: hoje devolve o objeto do ciclo **REPROVADO** em silêncio.)
- **[C3]** `ATA_SEM_OBJETO` (título com `(PR #N)`) → ec=3 nomeando a ata "sem linha de Objeto". **⇄ mutação:** tratar
  como AUSENTE → ec=0 → vermelho.
- **[C4]** `ATA_MENCAO` (só no corpo) → ec=3 "menção no corpo, sem cabeçalho". **⇄ mutação:** ignorar o corpo → AUSENTE → vermelho.
- **[C5]** nenhuma ata nomeia nem menciona → `AUSENTE`, ec=0. **⇄ mutação:** trocar por ec=3 → vermelho (o critério
  discrimina AUSENTE de NÃO DETERMINÁVEL nos dois sentidos).
- **[C6]** ata **só no head do PR** (commit fora de `origin/main` no repo tmp) → LIDO `@ <head>`. **⇄ mutação:** listar só
  `origin/$BASE` → AUSENTE → vermelho. (É o #393 hoje.)
- **[C7]** `--sha-only` × completo: mesmos SHAs, um por linha, **nada** além deles no stdout. **⇄ mutação:** imprimir o
  `AVISO` no stdout → vermelho.

**Drill e fronteira (E3):** o drill mede a **leitura** (estados, ec, lista). **Não atravessa** a **forma das atas**: com o
corpus de hoje, 102/107 atas caem em NÃO DETERMINÁVEL ou AUSENTE — a ferramenta passa a **dizer isso** em vez de
"a junta não votou". Deste lado a propriedade vale (C1–C7). Do outro lado — template rastreado com cabeçalho legível,
convenção para multi-ciclo (linha `approved_head` explícita ou arquivo por ciclo) e retrofit — o dono é
**`B-GOV-ATA-CABECALHO`** (§3). Medida-ponte: o orquestrador escreve a seção do ciclo 2 de `J-B-GOV-MANDATO.md` com
`(PR #393)` no título — está no escopo dele, não do dev.

### E4 — dependências declaradas e código de saída honesto (fecha C2-03, C2-05, a morte silenciosa do check-runs e do fetch)

- `ver git; ver gh` — **`python` some**: os campos vêm de `gh pr view … --jq '[.headRefOid,.headRefName,.baseRefName,
  .state,(.isDraft|tostring),.mergeable,(.mergeCommit.oid // "")]|@tsv'` + `IFS=$'\t' read -r …` (provado em §0.5, H4:
  7 campos, ec=0, gh 2.89.0 — `jq` embutido, **zero dependência nova**).
- `gh api …/check-runs` falha → `PARADO`, ec=1 (nunca `0 0 0`: hoje vira `AVISO: ZERO check-run`, que o §C7.1-bis lê
  como BLOQUEADO **pela causa errada**).
- `git fetch` falha → `AVISO: fetch falhou (offline?) — refs locais podem estar velhas` no **stderr**, segue; se
  `origin/$BASE` não existe localmente → `PARADO`, ec=1.
- Flag desconhecida (`--shaonly`) → mensagem de uso, **ec=2** (hoje: modo completo em silêncio, ec=0).
- Tabela de saída no cabeçalho do script: **0** lido/ausente · **1** PARADO (insumo) · **2** uso · **3** approved_head
  NÃO DETERMINÁVEL. Costuras documentadas: `MANDATO_GH`, `MANDATO_REPO` (já existe), e no pré-voo `MANDATO_REFS`.
- **[D1]** shim `python` que sai 1 no PATH → saída **idêntica** à normal (campos cheios, ec=0). **⇄ mutação:** voltar ao
  `python -c` → campos vazios → vermelho. **[D2]** shim `gh` que falha só em `api` → ec=1. **⇄ mutação:** `|| echo "0 0 0"` →
  ec=0 → vermelho. **[D3]** `--shaonly` → ec=2. **⇄ mutação:** aceitar qualquer 2º argumento → ec=0 → vermelho.

### E5 — `tests/mandato-preflight.test.ts` NOVO: o pré-voo ganha cobertura no CI (fecha a nota "zero cobertura")

- Mesmo padrão de E1: `mkdtempSync` com fixtures `.md` escritas pelo teste; `spawnSync("bash", [RAIZ/scripts/mandato-preflight.sh,
  fixture, pr], {env: {MANDATO_REFS: shim}})`. Shim `MANDATO_REFS`: imprime SHAs canônicos e sai 0; variante que sai 1
  (ferramenta morta); variante que sai 3 (não determinável) com stderr.
- **Casos (≥ 12):** B1 (8 formas + `correto`), B2 (tabela real), B3 (11 vizinhanças + 3 controles negativos), B4 (refs
  morta → causa certa), B5 (5 casos do `-i`), B6 (≥ 20 basenames gerados de `git ls-files` **do repo real** + Flutter +
  5 inexistentes), B7 (`.sh` com/sem crases, `(novo)`, diretório, glob), + o ec do refs = 3 → `AVISO`, não `REJEITADO`.
- **[E1]** apagar `mandato-preflight.sh` → 0 casos passam. **⇄ mutação:** é a medição. **[E2]** o arquivo aparece na
  lista do runner (`npm test -- tests/mandato-preflight.test.ts` roda; a suíte inteira o conta) — **sem** tocar
  `.github/**`. **⇄ mutação:** nome fora do sufixo `.test.ts` → o runner não o lista → vermelho.
- **Drill e fronteira:** cobre o pré-voo **como script**; **não atravessa** o uso real — mandatos não são versionados, logo
  não há "pré-voo no CI sobre mandatos". Deste lado: E1/E2. Do outro lado: o **dogfooding** da bateria (§8) — o relatório
  do próprio dev passa pelo pré-voo com saída colada — é a única medição sobre um mandato real neste PR.

### Mapa achado → entrega (para a junta 2 conferir que nada ficou sem dono)

| achado (ata) | gravidade | entrega | critério |
|---|---|---|---|
| C1-01 forma da linha | bloqueia | E2 checagem 3 | B1, B2 |
| C2-01 réplica | bloqueia | E1 | A1–A3 |
| C2-02 RAMO vazio | bloqueia | E3.a | A4 = C1 |
| C2-03 python/ec | bloqueia | E4 | D1 |
| C1-02 vizinhanças / 2 SHAs a um espaço | ajuste | E2 checagem 4 | B3 |
| C1-03 acento / aspas / `-i` no texto | ajuste | E2 checagem 5 | B5 |
| C1-04 `.sh` e sem crases | ajuste | E2 checagem 6 | B7 |
| C1-05 morte da ferramenta culpa o mandato | ajuste | E2 checagem 4 (ec do refs) | B4 |
| C1-06 l.67 inalcançável | nota | E2 checagem 6 (some) | B7 |
| C1-07 zero cobertura do pré-voo | nota | E5 | E1, E2 |
| C2-04 `-m1`/`head -1` (#387 → ciclo REPROVADO) | ajuste | E3.d/e | C2 |
| C2-05 flag inválida silenciosa | nota | E4 | D3 |
| C2-06 5/107 atas com Objeto | nota · pre-existente | E3.e declara; **ritual → `B-GOV-ATA-CABECALHO`** (§3) | C3, C4 |
| §0.3 ata só no ramo (achado do planejador) | — | E3.c | C6 |
| P-…-CAMINHO-POR-BASENAME | pendência (dono: este ciclo) | E2 checagem 6 | **B6 = teste de encerramento** |
| C3-01 escopo não declarado (corpos de jurado) | ajuste | §4 declara os corpos da junta 2 no permitido | — |
| C3-02 dono da pendência | nota | nomeado pela ata: este ciclo | B6 |

---

## §3 — Cabe num ciclo? SIM. O que SAI, sai por ter OUTRO DONO — nunca por prazo

**Estimativa de engenharia** (um dev, uma sessão): `mandato-refs.sh` ≈ 130 linhas (hoje 94), `mandato-preflight.sh` ≈ 120
(hoje 74), `tests/mandato-refs.test.ts` ≈ 180, `tests/mandato-preflight.test.ts` ≈ 200, registro/KPI. O item de maior
risco — o arnês git+shim no Windows e no ubuntu — já foi **executado** em protótipo (§0.6(d)). Se a medição do dev
disser que não cabe, a ordem de corte é a de §9/R1 (fallback do arnês), **nunca** encolher um critério.

**Entra (E1–E5):** 4 bloqueantes, 5 ajustes, 3 notas, a pendência do basename, a lacuna §0.3. Tudo da **mesma classe**
ou do **mesmo arquivo**; consertar em separado repetiria o erro diagnosticado (R-1).

**Sai, com dono nomeado** (o orquestrador abre as pendências em `controle/pendencias.md` e os blocos em
`PLANO_SAN3.md` §7.3 — fila pós-gate — **no mesmo PR**; sair sem registro = não saiu):

| o que fica de fora | por que é de outro dono | dono |
|---|---|---|
| Template de ata **rastreado** com cabeçalho legível (`# J-… (PR #N)` + `- **Objeto…:** \`sha\``) — o `TEMPLATE-J-ata.md` de 07/09 é alheio, não rastreado e não tem a linha | é o **ritual da junta**, não a ferramenta; a ferramenta não define a forma da ata unilateralmente | **`B-GOV-ATA-CABECALHO`** (novo) |
| Convenção para atas **multi-ciclo** (linha `approved_head` explícita, ou um arquivo por ciclo) + o leitor correspondente em `mandato-refs.sh` | idem — e sem convenção o leitor seria adivinhação | `B-GOV-ATA-CABECALHO` |
| Retrofit das 102 atas sem Objeto (e das 92 sem `#N` no título) | tocar 102 atas históricas é decisão do dono; a ferramenta agora **declara** o que não lê (E3.e) | `B-GOV-ATA-CABECALHO` — **opcional, decisão do dono** |
| A seção do ciclo 2 em `J-B-GOV-MANDATO.md` com `(PR #393)` no título | é escrita pela **junta/orquestrador**, não pelo dev — mas entra **neste PR** | orquestrador (autor da ata) |
| SHA dentro de URL (`…/commit/7462b75b` → token com `/` → não é conferido) | propriedade **vizinha** da checagem 4 ("SHA citado como identificador"), declarada | `B-GOV-MANDATO-2` (fila §7.3) |
| `Select-String`/`findstr` (PowerShell) na checagem 5 | a checagem enuncia `grep`/`rg`; a casa usa bash nos mandatos | `B-GOV-MANDATO-2` |
| Nomes de arquivo **sem `/`** (`CLAUDE.md`, `package.json`) na checagem 6 | tokenização por `/`; declarado | `B-GOV-MANDATO-2` |
| Drift da forma do JSON do `gh` (fixture datada em E1) | cobertura viva só na bateria deste PR | `B-GOV-MANDATO-2` (candidato alternativo: `B-GOV-CI-AUDITOR`, já na fila) |
| `(novo)` como exceção por confiança na checagem 6 | mandato cita arquivo a criar; a alternativa seria proibir citar | `B-GOV-MANDATO-2` |

**Fronteira de cada drill, resumida:** E1 não atravessa a API real · E2 não atravessa o refs real nem formas fora da
amostra · E3 não atravessa a forma das atas · E5 não atravessa mandatos reais. Em cada uma a propriedade foi medida
deste lado (critérios A–E) e o outro lado tem dono na tabela acima.

---

## §4 — Escopo (§C4) — PERMITIDO e PROIBIDO com caminhos exatos

**PERMITIDO ao dev (identidade nova):**
- `scripts/mandato-refs.sh` · `scripts/mandato-preflight.sh` — reescrita.
- `tests/mandato-refs.test.ts` — reescrita. `tests/mandato-preflight.test.ts` — **NOVO**. ⚠ **Divergência declarada do
  comando do ciclo 1** (l.89: "qualquer outro arquivo de `scripts/` ou `tests/`" era proibido): este plano **autoriza
  exatamente este arquivo**, e a emenda do comando o registra.
- `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` — emenda "ciclo 2" (escopo, bateria, casos).
- `agent-orchestration/controle/pendencias.md` (fecha `P-GOV-MANDATO-PREFLIGHT-CAMINHO-POR-BASENAME` com o teste de
  encerramento colado; abre as pendências de §3) + `pendencias-indice.md` **só pelo gerador**
  `agent-orchestration/controle/gerar-indice-pendencias.py`.
- `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` — trilha do ciclo 2.
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` **só por `node scripts/kpi-freeze.mjs`**.

**PERMITIDO ao orquestrador/junta — mesmo PR, DECLARADO (lição C3-01):**
- `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md` (seção ciclo 2) · `BRIEFING-B-GOV-MANDATO.md` (ciclo 2) ·
  `agent-orchestration/omega/reprovacoes/R-B-GOV-MANDATO-1.md` (já em `2404e441`).
- `.claude/agents/especialistas/**` e `.agents/agents/especialistas/**` — corpos da junta 2 (o
  `medidor-de-cobertura-do-artefato` já está em `d2ae17d3`); `node scripts/sync-agent-agents.mjs --check` na bateria.
- `docs/revisoes/SAN3/B-GOV-MANDATO-ciclo2-plano.md` — este arquivo. `docs/revisoes/SAN3/PLANO_SAN3.md` §7.3 — só para
  **nomear** `B-GOV-ATA-CABECALHO` e `B-GOV-MANDATO-2` na fila.

**PROIBIDO (a todos):** `src/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` ·
`.env` · lockfiles JS · `pubspec.yaml`/`pubspec.lock` · Figma · `CLAUDE.md` · `AGENTS.md` · arquivos-base da raiz ·
`.gitattributes` · qualquer outro `scripts/*` ou `tests/*` · **as 106 outras atas** em `omega/juntas/` ·
`TEMPLATE-J-ata.md` (alheio, não rastreado — reportar, não tocar) · os 3 corpos `jurado-mandato-c{1,2,3}-*` do ciclo 1
(identidades julgadas; não se editam) · os worktrees alheios `b04a`, `b11`, `gov-descuido`, `gov-elenco`, `w-mandato`.

## §5 — Modelagem

**Não se aplica, declarado:** sem banco, sem migração, sem dinheiro, sem tenant. O contrato do papel pede Decimal/
timestamptz/delete lógico/migrations com up-down — nenhum item existe aqui; as duas ferramentas são read-only sobre
git e GitHub, e os testes escrevem só em `mkdtemp`.

## §6 — Arquivos tocados (caminhos exatos; espelho = os guards da `main`)

| arquivo | ação | quem | espelho/referência |
|---|---|---|---|
| `scripts/mandato-refs.sh` | reescrita (E3, E4) | dev | — |
| `scripts/mandato-preflight.sh` | reescrita (E2) | dev | — |
| `tests/mandato-refs.test.ts` | reescrita (E1) | dev | `tests/agents-mirror-guard.test.ts` (mkdtemp + spawnSync do script real) |
| `tests/mandato-preflight.test.ts` | **novo** (E5) | dev | `tests/npm-test-runner-guard.test.ts` (fixtures em tmpdir + `status`) |
| `agent-orchestration/codex/comandos/B-GOV-MANDATO-mandato-verificavel.md` | emenda ciclo 2 | dev | `comando-template.md` |
| `agent-orchestration/controle/pendencias.md` + `pendencias-indice.md` | fecha 1, abre ≥ 2 · gerador | dev | — |
| `agent-orchestration/docs/status-geral.md` · `codex/log-execucao.md` | trilha | dev | — |
| `Kpis/*` | `kpi-freeze` | dev | §C3 |
| `agent-orchestration/omega/juntas/J-B-GOV-MANDATO.md` · `BRIEFING-…` | ciclo 2 | junta/orquestrador | `TEMPLATE-J-ata.md` **não** (alheio) |
| `.claude/agents/especialistas/**` · `.agents/agents/especialistas/**` | corpos da junta 2 | orquestrador/fábrica | `sync-agent-agents.mjs --check` |

---

## §7 — Linha de base N de testes · meta M ≥ 2N · KPI (§C3)

- **N (o bloco, ciclo 1):** 6 casos em `tests/mandato-refs.test.ts` — **todos sobre réplica**; 4 sobrevivem ao artefato
  apagado (§0.2). Contam como zero cobertura do artefato.
- **Meta M:** ≥ 10 em `mandato-refs.test.ts` + ≥ 12 em `mandato-preflight.test.ts` = **≥ 22 casos, 100 % por
  `spawnSync` do script real** (≥ 3,6 × N). Critério de contagem honesto: **[F1]** cada arquivo, com o seu script
  apagado, passa **0** casos. ⇄ mutação: é a medição.
- **`backend_tests`:** baseline da `main` **3052/3054** (medido pela C3 e pelo dev do ciclo 1 — **herdado com fonte; o dev
  do ciclo 2 re-mede**); head do ciclo 1 3058/3060 (+6). Ciclo 2: 3052 + (casos novos) — o dev publica o número **da
  execução**, forma por extenso (`npm test` = `node scripts/run-backend-tests.mjs`, cwd, Postgres/Redis **descartáveis
  próprios** com porta, `CORE_SAAS_PERSISTENCE`, TAP `# tests/pass/fail/skipped`), **N=2 execuções com denominador
  idêntico**, como a C3 fez.
- `frontend_smoke_tests` e `flutter_tests`: **carregados com nota** (§C3.3) — o PR não toca `frontend/` nem `mobile/`
  (provar por `git diff --name-only origin/main HEAD -- frontend mobile` = 0 **e** o mesmo comando com `-- scripts` > 0,
  para o zero não ser pathspec que não casa).
- `blocks_completed`: **168, inalterado** — o ciclo 1 já contou o bloco; ciclo 2 não é bloco novo (1 linha no history).
- `mvp_demo`/`mvp_vendavel`: intocados (§C3.4). `pr`=393; `merge_commit`/`approved_head` **null na autoria** (§C3.5).
- `Kpis/app.js` **só** por `node scripts/kpi-freeze.mjs`; `node scripts/kpi-freeze.mjs --check` ec=0; guards do painel verdes.

## §8 — Bateria de validação (§9) e regras para o dev

```bash
# worktree PROPRIO em caminho curto (C:/Users/AMP/w-dev393), npm ci proprio, sem junction; base viva NUNCA e alvo
npx prisma generate                 # DATABASE_URL no ambiente (aponta para o Postgres DESCARTAVEL do dev)
npm run check
npm run lint
npm test                            # 2x; denominador identico; log em ARQUIVO, lido do arquivo
npm run build
npm --prefix frontend run check
npm --prefix frontend run build
node --test --import tsx tests/mandato-refs.test.ts
node --test --import tsx tests/mandato-preflight.test.ts
node scripts/kpi-freeze.mjs --check
node --test --import tsx tests/kpi-dashboard-charts.test.ts
node scripts/sync-agent-agents.mjs --check
node --check Kpis/app.js
python agent-orchestration/controle/gerar-indice-pendencias.py && git diff --stat -- agent-orchestration/controle/pendencias-indice.md
bash scripts/mandato-refs.sh 392 ; echo ec=$?      # VIVO: LIDO 7822deaf… @ origin/main, ec=0 — saida colada
bash scripts/mandato-refs.sh 393 ; echo ec=$?      # VIVO: NAO DETERMINAVEL ou LIDO @ head (conforme a ata do ciclo 2) — colada
bash scripts/mandato-refs.sh 387 ; echo ec=$?      # VIVO: ec=3 com 2 candidatos (J-B-SAN3-01) — colada
bash scripts/mandato-preflight.sh <relatorio-do-dev.md> 393 ; echo ec=$?   # DOGFOODING: o relatorio passa pelo pre-voo
git diff --cached --check || exit 1
```
A última linha em **linha própria** (`feedback-checagem-como-trava`). As **mutações A1–A5, B1–B7, C1–C7, D1–D3, E1–E2,
F1** correm em **cópia no scratchpad** (o classificador negou mutação de rastreado às duas cadeiras — e estava certo),
com `git hash-object` = blob do head antes e depois, e **saída colada** no relatório.

**Regras para o dev — as que o ciclo 1 mostrou que faltavam:**
1. **Não julga os achados.** Implementa o plano; onde medir que o plano está errado, **escreve a falsificação** (comando +
   saída) e para — não conserta por conta (`feedback-executor-falsifica-premissa-do-plano`).
2. **Relatório em `## MEDIDO` / `## HIPOTESE`**, e ele **passa pelo próprio pré-voo** com `PRE-VOO OK` colado (§8). Se o
   pré-voo rejeitar o relatório por regra legítima, corrige o relatório; se rejeitar por bug, é achado — reporta.
3. **Mede o head no início e no fim** (`git rev-parse HEAD`, `gh pr view 393 --json headRefOid`): o ramo andou 3× durante
   este planejamento; o inspetor vai conferir.
4. Nunca toca ata, corpo de jurado, `.github/`, `.gitattributes`. Nunca `stash`/`clean`/`checkout` alheio/`prune`.
   Resíduo alheio se reporta. Remove o que criou, **pelo nome** (`git worktree remove --force C:/Users/AMP/w-dev393`,
   `docker rm -f pg-dev393 redis-dev393`), e reporta a limpeza §C5 em 1 linha nominal.
5. Toda afirmação numérica do relatório vem com `medido por:` **na mesma unidade** — é exatamente o que a checagem 3 nova
   vai exigir dele.

---

## §9 — Riscos e rollback

| # | risco | mitigação | rollback / corte (com dono) |
|---|---|---|---|
| R1 | o arnês git em tmpdir se comporta diferente no ubuntu do CI (`safe.directory`, `user.*`, `autocrlf`, `init.defaultBranch`) | `-c` em **toda** invocação de git do teste; fixtures LF; protótipo já executado no Windows (§0.6(d)); o CI roda no primeiro push e o dev lê o log | se em < 1 h de tentativa o arnês não subir no CI: **fallback declarado** = costura `MANDATO_ATAS_DIR` (lista `J-*.md` de um diretório) **ainda exercitando o script real** (estados, ec, matcher); a listagem por `ls-tree` fica coberta só pela execução viva → **pendência com dono `B-GOV-MANDATO-2`**. **Proibido**: voltar à réplica |
| R2 | a regra de unidade rejeita prosa legítima quebrada em 2 linhas sem indentação | é o desenho: continuação **indentada** (estilo do repo) ou linha em branco + nova unidade com evidência; documentado no cabeçalho do script | nenhum — custo aceito e declarado (E2) |
| R3 | a checagem 5 sem vocabulário rejeita `grep -c` legítimo de contagem | `-i` ou `caixa-exata:` na unidade; documentado | nenhum — custo aceito |
| R4 | ec=3 trava o `approved_head` de blocos multi-ciclo (inclusive **este**, na ata do ciclo 2) até a ata ser legível | é fail-closed e desejado; o orquestrador escreve a seção do ciclo 2 com `(PR #393)` no título; a convenção multi-ciclo tem dono (`B-GOV-ATA-CABECALHO`) | nenhum — declarar `NAO DETERMINAVEL` é o produto |
| R5 | o ramo continua andando durante o desenvolvimento (aconteceu 3× comigo) | o dev mede o head no início e no fim; o inspetor confere; o objeto da junta 2 é o head que **cada cadeira resolve** | — |
| R6 | o `gh` do shim não é executável no runner (modo de arquivo) | `chmodSync(0o755)` + shebang `#!/usr/bin/env bash`; no MSYS o shebang basta | invocar o shim como `bash "$MANDATO_GH"` — decisão do dev, documentada |
| R7 | reintroduzir a classe **na correção** (as 4 instâncias do painel de KPI nasceram em correções — `D-JUNTA-SEPARACAO-DE-PAPEIS`) | cada critério tem mutação executada por **outro** agente (a junta 2 re-executa A–F); o `medidor-de-cobertura-do-artefato` mede o que o dev afirmou | reprovação abre ciclo 3 sob as regras vigentes (§0.1) |

**Rollback global:** os quatro arquivos são **novos no bloco** (`A` no diff contra `fc3363e3`); nada de produto os
importa. `git revert` do squash devolve a `main` ao estado de `fc3363e3` para esses caminhos. Sem migração, sem dado.

## §10 — Junta 2 (§C7) — composição por competência, quórum, papéis

- **Quórum:** maioria de 3 (§C7.1-ter(b)) — inalterado: o bloco não toca dinheiro, segurança, permissão nem perda de
  dado (zero byte de `src/`, `prisma/`, `frontend/`, `mobile/`). Sem crítico-adversarial obrigatório; a junta pode
  convocá-lo se quiser atacar o desenho de E3.
- **Cadeiras por competência** (nomes são do orquestrador; competências são deste plano):
  - **C1′ — fail-closed do pré-voo e propriedade × forma:** `guardiao-fail-closed` ou identidade nova. Re-executa
    B1–B7 **e** as mutações; e as amostras dela **não podem ser as minhas** — gera formas/vizinhanças próprias.
  - **C2′ — o teste mede o artefato:** `medidor-de-cobertura-do-artefato` (criado em `d2ae17d3` para isto, §C7.4). Re-executa
    A1–A5, C1–C7, D1–D3, F1; **conta** os casos que sobrevivem ao script apagado (meta: 0).
  - **C3′ — escopo, KPI e registro:** pode ser a identidade do ciclo 1 (`jurado-mandato-c3-escopo-kpi-registro`: aprovou, não
    achou bloqueante, mediu por execução). Confere §4 (inclusive os corpos de jurado **declarados**), KPI reexecutado 2×,
    pendências fechadas/abertas e o índice pelo gerador, e que **§3 virou registro** (pendências + blocos na fila).
- **§C7.4-bis, respondido por escrito:** (a) a composição cobre a competência? **Sim** — a lacuna que o R-1 nomeou
  ("o teste mede o artefato") tem especialista próprio desde `d2ae17d3`. (b) quem achou consertou? **Não**: C1/C2 do
  ciclo 1 não planejam nem consertam; o orquestrador é inelegível como dev; o planejador não desenvolve. (c) dado podre?
  **Tudo que este plano afirma está medido em §0 ou marcado como herdado com fonte** (3052/3054 → C3, a re-medir).
- **Inspetor de terreno (§C7.1-bis) antes do voto,** com: S0 (`sync-agent-agents.mjs --check`, ec=0); worktree próprio
  de caminho curto por cadeira; Postgres/Redis descartáveis para quem rodar a suíte; **este §0 marcado "a re-verificar"**,
  nunca herdado como fato; inelegibilidade por nome (orquestrador como dev; C1/C2 do ciclo 1 como dev/planejador);
  plano de perda de jurado (sem suplente: queda relança a mesma identidade; voto perdido nunca conta como aprovação).
- **Teto:** `D-NOITE-SEM-TETO` vigente até `2026-09-26T10:00Z`; este ciclo nasceu sob ela. **A junta vota o mérito; o
  teto não entra no voto** (`D-CUSTO-NAO-E-CRITERIO`). Se reprovar: R-2, papéis recompostos, e o registro diz se a classe
  se repetiu **sem informação nova** (a mitigação que a decisão do dono exige).

## §11 — A linha

**Cabe num ciclo: SIM — 5 entregas (E1–E5) cobrindo os 4 bloqueantes, 5 ajustes, 3 notas, a pendência do basename e uma
lacuna nova (§0.3); 9 itens saem com dono nomeado (`B-GOV-ATA-CABECALHO` ×3 + orquestrador ×1 + `B-GOV-MANDATO-2` ×5), por
pertencerem a outro dono — nenhum por prazo; nenhuma hipótese do orquestrador derrubada: H3 refinada (três estados, não
dois), H1 corrigida (o arnês git+shim é inédito na casa) e uma quinta mudança estrutural acrescentada (fonte das atas =
`origin/BASE` ∪ head do PR — hoje a ferramenta diz "a junta não votou" sobre o próprio #393, cuja ata está no ramo).**
