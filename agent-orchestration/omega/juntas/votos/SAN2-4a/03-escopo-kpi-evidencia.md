# C3 — `zelador-do-escopo-e-do-kpi` — evidência incremental

**Bloco:** SAN2-4a · **PR** #365 · **head julgado:** `4199b92` · **identidade NOVA**
**Método:** voto-esqueleto criado ANTES de medir (P2+); esta evidência é apensada **após cada item** (P1).

---

## ITEM 1 — O bloco realmente NÃO consertou nada? · **SIM (reverificado por mim)**

### 1.1 Diff de código, as duas pontas

```
$ git merge-base main HEAD                → c9fd3a1  (= merge do #364; main é ancestral do head)
$ git rev-parse HEAD                      → 4199b922…  (= head julgado do briefing)

$ git diff --name-only main...HEAD -- src tests scripts prisma .github frontend mobile CLAUDE.md AGENTS.md
   (vazio)                                                                            ← COMMITADO
$ git diff --name-only main       -- src tests scripts prisma .github frontend mobile CLAUDE.md AGENTS.md
   (vazio)                                                                            ← ÁRVORE
$ git diff --check                        → ec=0
```

**Nenhuma linha de código, teste ou script, nem commitada nem na árvore.** A alegação central do
bloco (§5.2 do plano: "CORRIGIR QUALQUER COISA" é proibido) **sustenta-se por execução própria** —
não herdei o item 4 do inspetor.

### 1.2 O que o diff CONTÉM (11 arquivos) × §5.1 do plano

| Arquivo | +/- | §5.1 |
|---|---|---|
| `Kpis/app.js` | 1/1 | ✅ "SOMENTE a linha FROZEN, gravada por `kpi-freeze.mjs`" — e é exatamente **a linha FROZEN**, provada gerada no item 2 (drill C) |
| `Kpis/kpis-latest.json` | 7/7 | ✅ |
| `Kpis/kpis-history.json` | 5/5 | ✅ |
| `omega/planos/SAN2-4a-plano.md` | 436/0 | ✅ nomeado |
| `omega/juntas/votos/SAN2-3/00c-porteiro-pos-merge-364.md` | 44/0 | ✅ glob `omega/juntas/**` (parecer do porteiro do #364, persistido) |
| `omega/juntas/votos/SAN2-4a/00a-inspetor-{evidencia,parecer}.md` | 119+68 | ✅ glob (papéis desta junta) |
| `omega/juntas/votos/SAN2-4a/kpi-backfill-log.md` | 141/0 | ✅ glob (R2 do inspetor: persistir) |
| `omega/juntas/votos/SAN2-4a/medicao-{1,2,3}-*.md` | 353+508+684 | ⚠️ glob permitido, **caminho ≠ o nomeado** (`omega/medicoes/SAN2-4a-medicao.md`) — **divergência DECLARADA §A2 nos três diários** (m1 §0 l.9-19; m2 l.11-16; m3 l.17-22): "obedecer ao mandato quanto ao CAMINHO e ao plano quanto ao CONTEÚDO … registrada, não escolhida em silêncio" |

**Zero arquivo fora do §5.1.** Caminhos do §5.1 **não usados** (`controle/pendencias.md`,
`pendencias-indice.md`, `status-geral.md`, `SAN2-2-plano.md`, `omega/medicoes/`) — permitido ≠
obrigatório; a consolidação fica para quem reunir as três medições, como os três diários declaram.

### 1.3 Base viva preservada (a prova do inspetor, reconferida)

```
$ docker ps --format '{{.Names}}\t{{.Status}}'
erp-postgres   Up 2 days (healthy)
erp-redis      Up 2 days (healthy)
```
Uptime **atravessa** o bloco sem restart; **zero** containers `san2-4a-*`. Nenhum comando meu foi
para dentro de `erp-postgres`/`erp-redis`.

> **VEREDITO PARCIAL ITEM 1 — APROVA.** Sem conserto escondido. A junta está julgando o que o
> bloco diz ser.

---

## ITEM 2 — O KPI · **APROVA COM ACHADO (não bloqueante)**

### 2.1 `approved_head 23d9227` é o head da ATA, não o do GitHub — **provado**

```
ata J-SAN2-3.md l.4        → "**Head julgado:** `23d9227`"
gh pr view 364 headRefOid  → 4083146283499301a51313e26090d9df422abf56     ← DIFERENTE
gh pr view 364 mergeCommit → c9fd3a1e9ecb…  (= main)  ✓ bate com merge_commit "c9fd3a1"

$ git log --oneline 23d9227..4083146
4083146 docs(junta): SAN2-3 APROVADO 3x0 — e o obituario cobre quem tinha ARQUIVO, nao quem VOTOU

$ git diff --name-only 23d9227..4083146      → 14 arquivos, TODOS em agent-orchestration/
   (ata J-SAN2-3, BRIEFING, 3 pares de voto+evidência, parecer+evidência do inspetor,
    dev-log, pos-voto-log, controle/pendencias.md, controle/pendencias-indice.md)
   ZERO em Kpis/, src/, tests/, scripts/, .github/
```

O delta entre o head julgado e o head do GitHub é **um único commit de registro pós-voto, sem uma
linha de código**. Gravar `4083146` declararia que a junta aprovou um commit que ela nunca viu.
**O backfill está certo, pela razão certa** — mesma lógica dos backfills do #362 e #363.

### 2.2 Métricas de teste e `mvp_*` INTOCADAS — diff estrutural de 90 chaves, não de olho

`kpis-latest.json` — **7 chaves mudaram de 90**:
`release.pr` (null→364) · `release.merge_commit` (null→"c9fd3a1") · `release.approved_head`
(null→"23d9227") · `release.summary` (apenso) · `metrics.blocks_completed.{value,display,note}`
(153→154). **As outras 83 são idênticas byte a byte.**

`kpis-history.json` — **147 entradas em `main` e 147 no HEAD** (nenhuma entrada nova); só a
entrada[146] (`SAN2-3`) muda, em **5 campos**: `pr`, `merge_commit`, `approved_head`,
`blocks_completed`, `description`.

Última entrada, reparseada no HEAD:
```json
{"version":"SAN2-3","pr":364,"merge_commit":"c9fd3a1","approved_head":"23d9227",
 "blocks_completed":154,"backend_tests":"2607/2609","frontend_smoke_tests":"1126/1126",
 "flutter_tests":"864/864"}
latest: mvp_demo=99 · mvp_vendavel=88   (inalterados)
```

**`backend_tests`, `frontend_smoke_tests`, `flutter_tests`, `mvp_demo`, `mvp_vendavel`: nenhum
campo tocado.** O PR não exerce essas trilhas — mexer neles seria mentira, e não mexeram.
`blocks_completed` **154** com justificativa escrita nos dois lugares (cartão e último ponto do
gráfico), nomeando o merge `c9fd3a1` e a condição que a própria entrada anterior publicara
("sobe para 154 só quando o SAN2-3 mergear").

### 2.3 O guard do freeze **MORDE** — 4 drills meus, em cópia no scratchpad (zero mutação na árvore)

| Drill | Arranjo | ec | Leitura |
|---|---|---|---|
| **A** | `app.js` de `main` + `kpis-latest.json` do HEAD | **1** | o guard **morde**: "a cópia congelada DIVERGE do kpis-latest.json" |
| **B** | roda `kpi-freeze.mjs` (grava) → `--check` | **0** | volta a fechar |
| **C** | `cmp` do `app.js` gerado × `git show HEAD:Kpis/app.js` | **idêntico** | a linha FROZEN do HEAD foi **GERADA pelo script, não digitada** (§5.1: "nunca à mão") |
| **D** | par de CONTROLE: `app.js` de main + JSON de main | **0** | o drill A **não é falso-positivo** |

No head, reexecutado por mim:
```
$ node scripts/kpi-freeze.mjs --check      → "em dia (snapshot 2026-08-30)"   ec=0
$ node --check Kpis/app.js                 → ec=0
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
  1..16 · # pass 16 · # fail 0 · ec=0
```

A afirmação do registro ("EXIT=1 depois das edições, EXIT=0 depois do freeze", commit `83d0366`)
**é verdadeira e eu a reproduzi**, em vez de herdá-la.

### 2.4 ACHADO A-1 — a entrada/release **SAN2-4a não existe**, e o plano a exigia

- Plano **§1.6**: *"A entrada NOVA do SAN2-4a nasce com os 3 campos `null` (§C3.5, autoria)"*.
- Plano **§6.4** (item da bateria): *"entrada/release SAN2-4a com os 3 campos null e
  `blocks_completed 154`"*. Plano **§6.9**: as três contagens entrariam **na entrada nova** como
  CARREGADAS.
- **Medido:** `history` tem 147 entradas em `main` e 147 no HEAD; `latest` segue
  `version:"SAN2-3"`, `snapshot_date:"2026-08-30"`, `release.pr:364`.
  **O item 4 da bateria do §6 não passa como escrito.**

**Está declarado?** Sim — mas **não onde o inspetor disse**. A R4(i) do parecer atribui a explicação
ao `kpi-backfill-log.md`; **medi: não está lá** (o arquivo tem 141 linhas e termina na "Edição 2";
`grep -n "entrada nova|entrada SAN2-4a"` → nada). Está na **mensagem do commit `83d0366`**:
> *"NAO ENTROU a entrada do SAN2-4a: o bloco ainda esta em execucao. Publicar metrica dele agora
> seria publicar numero antes de medi-lo."*

**Por que NÃO bloqueia:** (i) o gatilho do **§C3.1** é *"PR que altere código, teste ou escopo"* —
este PR não altera nenhum dos três (item 1 prova o código/teste; `mvp_*` intocados provam o escopo),
logo o **contrato** não exige entrada nova; (ii) **nenhum número publicado é falso** — a omissão não
afirma nada, e tudo que está publicado eu provei verdadeiro; (iii) a divergência é **declarada**, não
silenciosa (§A2). **Por que é achado assim mesmo:** o argumento do commit ("ainda em execução") não
refuta o plano — o §C3.5 existe **precisamente** para a entrada de autoria pré-merge, com `null`. E a
consequência é medível: **quando o #365 mergear, `kpis-latest.json` continuará em `version:"SAN2-3"`
/ `release.pr:364`, ou seja, o painel — o ARTEFATO PRINCIPAL (`D-KPI-INDEX-PAINEL`) — volta a estar
UM MERGE ATRÁS**, que é o defeito que este mesmo commit `83d0366` anuncia ter consertado.

### 2.5 ACHADO A-2 — o `kpi-backfill-log.md` para na metade do próprio método

O diário declara, na abertura: *"apensado **junto** com as edições, uma de cada vez — não escrito no
fim"*, e no §0 justifica o baseline: *"sem esse ponto de partida, o `exit 0` do fim não prova nada"*.
**Medido:** o arquivo (141 linhas) registra a Edição 1 e a Edição 2 (ambas no `history`) e **para**.
**Não registra**: a edição do `kpis-latest.json` (7 chaves, que ocorreu), a regravação do `app.js`
pelo `kpi-freeze`, nem o **`exit 0` do fim** que ele próprio anunciou como a prova. Os três fatos são
**verdadeiros** (medi-os na §2.2/§2.3) e estão na mensagem do commit — o defeito é de **registro
incompleto**, não de número.

> **VEREDITO PARCIAL ITEM 2 — APROVA, com A-1 (`media`) e A-2 (`baixa`), ambos
> `dentro-do-bloco`, ambos `nao-bloqueia`.** Todo número publicado é verdadeiro e foi provado por
> execução minha; o que falta é consolidação de registro, com dono nomeado.

---

## ITEM 3 — Observações nomeadas para o 4b, sem conserto · **APROVA**

### 3.1 A contagem real é **12**, não 11 — e o "11" não é do bloco

| Diário | Itens | Escopo declarado | Evidência de data/origem |
|---|---|---|---|
| medição 1 | **OBS-1, OBS-2, OBS-3** (3) | OBS-1/OBS-2: `pre-existente` explícito | *"a linha antecede este bloco — o diff de código do SAN2-4a é vazio por construção"* |
| medição 2 | **O-1..O-4** (4) | `pre-existente` para a classe (l.466-467) | *"a sentença da l.33 é anterior a este bloco, e o diff de código deste bloco é vazio"* |
| medição 3 | **O-1..O-5** (5) | *"Todos os itens abaixo são de escopo `pre-existente` **por construção**"* | **datas**: família do `B-O6R-01`; exclusão do sweep **28/08**; o 68 **18/08** |

`grep "11 observ|onze observ"` nos diários e no plano → **vazio**: o número **11** vem do briefing,
não do bloco. A reconciliação é limpa: **11 itens carregam "dono" nomeado**; o 12º (OBS-3 da medição
1) é uma **nota de método** sem dono — *"N=10 tem 96,2 % de chance de sair verde com o defeito
presente … o critério de N da pendência era, ele próprio, cego para a classe de defeito que ela
perseguia"*. Nada falso no bloco; corrijo o denominador do briefing.

### 3.2 Nomeadas COM dono, e sem correção proposta — §C7.4-bis intacto

Os três diários abrem a seção com a mesma fórmula executada, não decorativa:
`medicao-1:302` "**NENHUM conserto aplicado**" · `:304` *"Sou achador; achador não conserta …
**não** proponho nem escrevo a correção"* — idem `medicao-3:561,563`; `medicao-2:503` *"O 4a não
consertou nada"*. Donos nomeados por item: **SAN2-4b** (9), **junta** (2: recontagem supervisionada
das 68; nomenclatura da família), **junta do ciclo 5** (1, junto com o 4b).

**Testei a fronteira nos dois casos que mais se aproximam de "propor correção":**
- **m3/O-1** vai na direção OPOSTA à proposta: *"Acrescentar `rls_test_` a `SWEPT_ROLE_FAMILIES`
  **não bastaria**"* — nomeia por que o conserto óbvio é insuficiente (chamador único, `l.310`, que
  o criador nunca invoca). É achado, não receita.
- **m2/O-1..O-4** prescrevem *errata/apenso* em `status-geral.md` e `pendencias.md`. Para um
  **defeito de registro**, "esta sentença é falsa" e "apense a errata" são a mesma frase — e o 4a
  **não a aplicou** (`pendencias.md` e `status-geral.md` estão fora do diff, item 1.2). Fronteira
  respeitada.
- **m1/OBS-2** toca `src/` e se autolimita: *"Isto é **fato medido**, não juízo de risco … **Não
  proponho alteração de `src/`**. Dono: a junta do SAN2-4a designa."*

### 3.3 O **68** está **CARREGADO**, e nunca apresentado como medido

`medicao-3` l.493, na própria tabela de números:
```
| Roles rls_test_ órfãs na base do dono | 68 | 2026-08-18 |
| P-O6R-ARNES-ISOLAMENTO l.3296-3298; reafirmado em 28/08 | CARREGADO — NÃO re-verificado |
```
l.497 dá o motivo: *"contar as 68 exigiria consultar `erp-postgres`, e o §5.2 do plano proíbe"*.
l.541: *"O **68** segue **CARREGADO** (§F10), com data (18/08) e fonte."* l.590-592: *"**O 68
continua CARREGADO** — e é o item que esta medição mais deliberadamente **não** entrega."*
E a ligação é feita **sem contá-lo**: O-5 usa a assinatura **460 = 115×4, LOGIN, sem expiração**,
idêntica em 5/5 gêneses de hoje e igual ao "até 460 privilégios" de 18/08 — *"liga o mecanismo
medido às 68 declaradas **sem** contá-las"*. **Ninguém apresentou o 68 como medido.**

### 3.4 As duas falhas de instrumento estão publicadas, não maquiadas

`medicao-3` §F8.0, l.299-316: **I-1** *"`$!` do Git Bash não é o PID do Windows"* — a primeira
tentativa teria publicado **`0/5` falso** (*"Aquele `0/5` é falha de instrumento, não janela
estreita"*); **I-2** contaminação por órfã anterior. l.590-591: *"Nenhuma rodada foi descartada para
maquiar resultado; as descartadas (I-1, I-2) estão nominadas com o motivo."*

> **VEREDITO PARCIAL ITEM 3 — APROVA.** Achados nomeados, com escopo e evidência de data/origem,
> com dono, e **sem conserto aplicado nem proposto**. O 68 declarado CARREGADO. Única correção
> factual: são **12** observações registradas (11 com dono), não 11.

---

## Fecho da cadeira C3

**APROVADO**, com **A-1 (`media`)** e **A-2 (`baixa`)** — ambos `dentro-do-bloco`, ambos
`nao-bloqueia`, ambos com dono nomeado para o porteiro pós-merge do #365 / o SAN2-4b.

Não propus correção a nenhum deles (§C7.4-bis). **Não commitei nada.**
**Limpeza (1 linha):** removi o diretório de drills `scratchpad/c3-freeze` (cópias de
`kpi-freeze.mjs` + `Kpis/`); zero containers criados, zero mutação em rastreado, `erp-postgres` e
`erp-redis` intocados (`Up 2 days (healthy)` preservado).

---
---

# PARTE II — RE-EXECUÇÃO PELA SUPLENTE (identidade NOVA)

> A cadeira C3 caiu ao escrever o voto final. **Tudo acima é ROTEIRO, não insumo** (R2): reexecutei
> os comandos registrados e comparei; onde há conclusão sem comando registrado, ignorei e medi.
> **Divergência entre a Parte I e a Parte II é achado, e a medição da Parte II prevalece.**
> Método P1/P3: cada item é gravado AQUI e no voto assim que medido, antes de passar ao seguinte.

---

## ITEM 1 (suplente) — o bloco NÃO consertou nada · **CONFIRMADO — APROVA**

### 1.1 As duas pontas, eol-neutro (reexecutado por mim)

```
$ git merge-base main HEAD  → c9fd3a1e9ecb…   $ git rev-parse main → c9fd3a1e9ecb…   (main É a merge-base)
$ git rev-parse HEAD        → 4199b9224035…   = head julgado do briefing ✓

$ git -c core.autocrlf=false diff --exit-code --name-only main...HEAD -- src tests scripts prisma .github frontend mobile CLAUDE.md AGENTS.md
  ec=0  (COMMITADO — vazio)
$ git -c core.autocrlf=false diff --exit-code --name-only main       -- <mesmos caminhos>
  ec=0  (ÁRVORE vs main — vazio)
$ git -c core.autocrlf=false diff --exit-code --name-only HEAD       -- <mesmos caminhos>
  ec=0  (MUTAÇÃO VIVA — vazio)
$ git diff --check → ec=0
```

**Terceira ponta que a Parte I não mediu, e eu medi:** `git diff` **não enxerga untracked** — um
arquivo novo em `src/` ou `tests/` passaria por todos os comandos acima. Medi explicitamente:

```
$ git status --porcelain --untracked-files=all -- src tests scripts prisma .github frontend mobile CLAUDE.md AGENTS.md
  (vazio)
```

**Zero arquivo de código, rastreado ou não, commitado ou vivo.** A alegação central do bloco
(§5.2: "CORRIGIR QUALQUER COISA" é proibido) **sustenta-se por execução minha**.

### 1.2 Os 11 arquivos do diff × §5.1 — e a fronteira que fica de pé

Diff completo (`git diff --numstat main...HEAD`), 11 arquivos, 6 commits:

| Arquivo | +/- | §5.1 |
|---|---|---|
| `Kpis/app.js` | 1/1 | ✅ "SOMENTE a linha FROZEN, gravada por `kpi-freeze.mjs`, nunca à mão" — provado gerado no item 2 |
| `Kpis/kpis-latest.json` · `kpis-history.json` | 7/7 · 5/5 | ✅ nomeados |
| `omega/planos/SAN2-4a-plano.md` | 436/0 | ✅ nomeado |
| `omega/juntas/votos/SAN2-3/00c-porteiro-pos-merge-364.md` | 44/0 | ✅ glob `omega/juntas/**`, papel da junta |
| `omega/juntas/votos/SAN2-4a/00a-inspetor-{evidencia,parecer}.md` | 119 · 68 | ✅ glob, papéis desta junta |
| `omega/juntas/votos/SAN2-4a/kpi-backfill-log.md` | 141/0 | ⚠️ caminho no glob; **autor é o dev**, não papel da junta |
| `omega/juntas/votos/SAN2-4a/medicao-{1,2,3}-*.md` | 353 · 508 · 684 | ⚠️ idem |

**Zero arquivo fora de `Kpis/` e `agent-orchestration/`.** Nenhum caminho do §5.2 tocado.

**A fronteira ⚠️, medida e não herdada:** o §5.1 nomeia `agent-orchestration/omega/medicoes/SAN2-4a-medicao.md`
como relatório canônico (arquivo NOVO, diretório NOVO). Medi: `ls -d agent-orchestration/omega/medicoes`
→ **`No such file or directory`** — o diretório **nunca foi criado**. Os quatro diários foram para
`omega/juntas/**`, cujo glob os cobre por CAMINHO, mas cujo parentético diz *"criados pelos papéis
dela, **não pelo dev**"*. Reexecutei a checagem da declaração §A2 nos três diários e ela é real e
literal (m1 §0; m2 l.11-16; m3 l.17-22), com a mesma resolução em todos: *"obedecer ao mandato quanto
ao CAMINHO e ao plano quanto ao CONTEÚDO … Divergência registrada, não escolhida em silêncio"*.

**Não é conserto escondido** — é registro em caminho vizinho, declarado três vezes. Não bloqueia.
Mas **o entregável nomeado do §5.1 não existe**, e isso volta no item 2 sob outra forma (A-1).

### 1.3 Base viva preservada — e um fato que a Parte I não podia ter visto

```
$ docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.CreatedAt}}'
c2san24a-redis   Up 2 minutes         2026-08-31 12:55:02
c2san24a-pg      Up 2 minutes         2026-08-31 12:55:01
erp-postgres     Up 2 days (healthy)  2026-07-13 18:25:26
erp-redis        Up 2 days (healthy)  2026-07-13 18:25:26
```

`erp-postgres`/`erp-redis` com **`Up 2 days`** — o uptime **atravessa** o bloco inteiro sem restart.
Nenhum comando meu foi para dentro deles (§5.2: "nem para leitura"); `docker ps` interroga o daemon,
não o container. Os dois `c2san24a-*` **não são do dev nem meus**: nasceram há 2 minutos e são o
**cluster descartável da cadeira C2**, que vota em paralelo — exatamente o isolamento por jurado que
`D-INSPETOR-TERRENO-JUNTA` exige. Zero container `san2-4a-*` do bloco.

> **ITEM 1 — APROVA.** Sem conserto escondido, em três pontas (commitado, árvore, untracked).
> A junta está julgando o que o bloco diz ser.

---

## ITEM 2 (suplente) — o KPI · medição em curso, gravada por partes

### 2.1 `approved_head 23d9227` é o head da ATA, não o do GitHub — **PROVADO**

```
ata J-SAN2-3.md l.4        → "**Head julgado:** `23d9227`"  (+ quórum MAIORIA de 3 · APROVADO 3×0 · CI 7/7 run 33346995433)
$ gh pr view 364 --json headRefOid,mergeCommit
  headRefOid  = 4083146283499301a51313e26090d9df422abf56     ← DIFERENTE do gravado
  mergeCommit = c9fd3a1e9ecb91acbcceaddec638e0d7d7bc4e46     ← bate com merge_commit "c9fd3a1" ✓
$ git log --oneline 23d9227..4083146
  4083146 docs(junta): SAN2-3 APROVADO 3x0 — e o obituario cobre quem tinha ARQUIVO, nao quem VOTOU
$ git diff --name-only 23d9227..4083146   → 14 arquivos, TODOS sob agent-orchestration/
  ZERO em Kpis/, src/, tests/, scripts/, .github/
```

O delta entre o head julgado e o head do GitHub é **um único commit de registro pós-voto, sem uma
linha de código**. Gravar `4083146` afirmaria que a junta aprovou um commit que ela nunca viu.
**O backfill está certo, e pela razão certa.**

### 2.2 Métricas de teste e `mvp_*` INTOCADAS — diff estrutural por chave-folha

Não conferi "de olho": achatei os dois JSON em chaves-folha e comparei uma a uma.

`kpis-latest.json` — **462 chaves-folha em main, 462 no HEAD; 7 mudaram:**
`release.pr` (None→364) · `release.merge_commit` (None→"c9fd3a1") · `release.approved_head`
(None→"23d9227") · `release.summary` · `metrics.blocks_completed.{value,display,note}` (153→154).
**As outras 455 são idênticas.**

> **Divergência com a Parte I, e prevalece a minha:** ela publicou *"7 chaves mudaram de **90**"*.
> O total de chaves-folha é **462**, não 90 — o numerador dela está certo, o denominador não.
> Nenhum comando de contagem estava registrado ao lado do 90.

As 5 famílias que o mandato manda conferir, medidas uma a uma (`value`, `total`, `display`, `note`):
`backend_tests` 2607/2609 · `frontend_smoke_tests` 1126/1126 · `flutter_tests` 864/864 ·
`mvp_demo` 99 · `mvp_vendavel` 88 → **todas `IGUAL`, em todos os subcampos, inclusive as `note`.**

`kpis-history.json` — **147 entradas em main, 147 no HEAD** (nenhuma acrescentada). Percorri as 147
em paralelo: **só a entrada[146] (`SAN2-3`) difere**, em 5 campos — `pr`, `merge_commit`,
`approved_head`, `blocks_completed`, `description`. As outras 146 são idênticas campo a campo.
Nela: `backend_tests` "2607/2609", `frontend_smoke_tests` "1126/1126", `flutter_tests` "864/864" —
**intocados**.

### 2.3 `blocks_completed 154` com justificativa escrita — **SIM, nos dois lugares**

`metrics.blocks_completed.note` (HEAD): *"SAN2-3 mergeado no #364 (c9fd3a1): a entrada anterior do
history declarava 'sobe para 154 so quando o SAN2-3 mergear' — subiu … Backfill §C3.5 do #364
aplicado pelo SAN2-4a (approved_head 23d9227, o head da ata J-SAN2-3, NAO o headRefOid 4083146 do
GitHub). Sobe para 155 so quando o proximo bloco mergear."*

Verifiquei que a condição citada **existe mesmo** na versão anterior: a `note` em `main` termina
literalmente em *"Sobe para 154 so quando o SAN2-3 mergear."* **O número cumpre uma condição que a
própria série havia publicado antes** — não é um incremento arbitrado agora. A `description` da
entrada[146] repete a justificativa por extenso, com o delta de 14 arquivos e os precedentes do
#362 (`4cd0867 != 55aa8a3`) e do #363 (`c8dc716 != e4926bd`).

### 2.4 Bateria reexecutada por mim no head

```
$ node scripts/kpi-freeze.mjs --check   → "kpi-freeze: em dia (snapshot 2026-08-30)."   ec=0
$ node --check Kpis/app.js              → ec=0
```
```
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
  1..16 · # tests 16 · # pass 16 · # fail 0 · # skipped 0 · ec=0
```

### 2.5 O guard do freeze **MORDE** — CONFIRMADO por 4 drills meus, em cópia isolada

Montei uma árvore-espelho no scratchpad (`scripts/` + `Kpis/`, o script resolve por `../`), com os
blobs extraídos por `git show` (eol-neutro por construção — nada de `git archive`+`tar`).
**Zero mutação na árvore de trabalho.**

| Drill | Arranjo | ec | Leitura |
|---|---|---|---|
| **A** | `app.js` de `main` + `kpis-latest.json` do **HEAD** | **1** | *"a cópia congelada do app.js DIVERGE do kpis-latest.json"* — **o guard morde** |
| **D** (controle) | `app.js` de `main` + `kpis-latest.json` de `main` | **0** | *"em dia (snapshot 2026-08-30)"* — o drill A **não é falso-positivo** |
| **B** | roda o freeze (grava, 60567 bytes) → `--check` | **0** | volta a fechar |
| **C** | `cmp` do `app.js` gerado × `git show HEAD:Kpis/app.js` | **idêntico** | a linha FROZEN do HEAD foi **GERADA pelo script**, não digitada (§5.1: "nunca à mão") |

**A afirmação do registro — "EXIT=1 antes do freeze, EXIT=0 depois" — é VERDADEIRA, e eu a
reproduzi em vez de herdá-la.** O drill D é o que a torna significativa: sem o par de controle,
o `ec=1` do drill A poderia ser um script quebrado em vez de um guard vivo.

### 2.6 ACHADO A-1 — a entrada/release **SAN2-4a não existe**, e o plano a exigia em dois lugares

Reli o plano e medi eu mesma, sem herdar:

- **§1.6** (rotulado *"obrigação, não opção"*): *"A entrada NOVA do SAN2-4a nasce com os 3 campos
  `null` (§C3.5, autoria) e `blocks_completed` 153→154"*.
- **§6.4** (item da bateria): *"entrada/release SAN2-4a com os 3 campos null e `blocks_completed 154`"*.
- **§6** (item 9): as três contagens *"entram na entrada nova como CARREGADOS com nota §C3.3"*.

**Medido:** `history` = **147 entradas em `main` e 147 no HEAD** (nenhuma acrescentada);
`grep -c '"SAN2-4a"'` nos dois JSON = **0**; `latest` segue `version:"SAN2-3"`,
`snapshot_date:"2026-08-30"`, `release.pr:364`. **O item 4 da bateria do §6 não passa como escrito.**

A explicação está na mensagem do commit `83d0366`: *"NAO ENTROU a entrada do SAN2-4a: o bloco ainda
esta em execucao. Publicar metrica dele agora seria publicar numero antes de medi-lo."*

**Por que NÃO bloqueia:** (i) o gatilho do **§C3.1** é *"PR que altere código, teste ou escopo"* — e
este PR não altera nenhum dos três (o item 1 prova código/teste em três pontas; `mvp_*` intocados
provam o escopo), logo o **contrato** não exige entrada nova, só o plano do bloco; (ii) **nenhum
número publicado é falso** — a omissão não afirma nada, e tudo que está publicado eu provei
verdadeiro; (iii) a divergência é declarada em commit, não silenciosa (§A2).
**Por que é achado assim mesmo:** o argumento "ainda em execução" não refuta o plano — o §C3.5
existe **precisamente** para a entrada de autoria pré-merge, com `null`. E a consequência é medível:
**quando o #365 mergear, `kpis-latest.json` continuará em `version:"SAN2-3"` / `release.pr:364`, ou
seja, o painel — o ARTEFATO PRINCIPAL (`D-KPI-INDEX-PAINEL`) — volta a estar UM MERGE ATRÁS**, que é
exatamente o defeito que o commit `83d0366` anuncia ter consertado.

### 2.7 ACHADO A-3 (MEU, não está na Parte I) — o `backfill_note` do §1.6 não foi escrito; o campo carrega o backfill ANTERIOR

O §1.6 exige, literalmente: *"Aplicar na última entrada de `Kpis/kpis-history.json` … **e nos campos
correspondentes de `Kpis/kpis-latest.json`, com `backfill_note` explicando o porquê do head da ata**"*.

O campo existe — e **não está entre as 7 chaves que mudaram**. Medi o valor nas duas pontas:

```
main  release.backfill_note = "Backfill §C3.5 do #363 aplicado por ESTE bloco: pr 363,
                               merge_commit d283903, approved_head c8dc716 …"
HEAD  release.backfill_note = (byte a byte IDÊNTICO ao de main)
```

**Cuidado com o falso achado, e digo por quê:** o objeto `release` inteiro ainda é o do **SAN2-3**
(`version:"SAN2-3"`), então *"aplicado por ESTE bloco"* = SAN2-3, e o SAN2-3 **de fato** aplicou o
backfill do #363 no SAN2-2. **A nota não é falsa** — 363/`d283903`/`c8dc716` estão corretos e vivem
na entrada SAN2-2 do history, como ela mesma diz. **Não é contradição factual.**

O defeito é de **localização**: o campo que o §1.6 nomeou para explicar *"o porquê do head da ata"*
deste backfill continua explicando o **backfill anterior**. A explicação exigida **existe e está
completa** — mas foi para `release.summary` (apenso de **1801 caracteres**, que reproduzi por diff
de string: 6827→8628 chars, apenso puro, nada reescrito) e para `blocks_completed.note`. Quem for ao
`backfill_note` procurar por que `approved_head` é `23d9227` e não `4083146` encontra uma resposta
sobre **outro par de hashes**.

**Gravidade `baixa` · escopo `dentro-do-bloco`** — evidência de origem: o campo é irmão dos três que
**este PR** editou (`release.{pr,merge_commit,approved_head}`, `None`→#364), e o §1.6 os nomeia na
mesma frase; a obrigação nasce e morre neste bloco. **Não bloqueia:** nenhum número falso, e a
substância exigida está publicada no campo vizinho.

> **ITEM 2 — APROVA, com A-1 (`media`) e A-3 (`baixa`), ambos `dentro-do-bloco`, ambos
> `nao-bloqueia`.** Todo número publicado é verdadeiro e foi provado por execução minha; o backfill
> está certo pela razão certa; o guard morde de verdade. O que falta é registro, com dono nomeado.

---

## ITEM 3 (suplente) — observações nomeadas para o 4b, sem conserto · **APROVA**

### 3.1 A contagem executável é **12**, não 11 — e o 11 não é do bloco

Contei por rótulo distinto, não de memória:

| Diário | Rótulos | Escopo declarado | Evidência de data/origem |
|---|---|---|---|
| medição 1 | `OBS-1 OBS-2 OBS-3` (**3**) | OBS-1/OBS-2 `pre-existente` explícito | *"a linha antecede este bloco — o diff de código do SAN2-4a é vazio por construção (§6.1 do plano)"* |
| medição 2 | `O-1 O-2 O-3 O-4` (**4**) | `pre-existente` por construção (l.467) | *"a sentença da l.33 é anterior a este bloco"* |
| medição 3 | `O-1 O-2 O-3 O-4 O-5` (**5**) | *"Todos os itens abaixo são de escopo `pre-existente` **por construção**"* (l.565) | **datas nomeadas**: família do `B-O6R-01` · exclusão do sweep **28/08** · o 68 de **18/08** |

**3 + 4 + 5 = 12.** O **11** vem do **briefing** (`BRIEFING-SAN2-4a.md` l.10 e l.25) — que é **insumo
da junta e está untracked, fora do diff do PR**. Nenhum diário e nenhum plano contém "11 observações"
(`grep "11 observ|onze observ|11 achado"` neles → vazio). **A reconciliação fecha, mas por uma regra
que ninguém escreveu:** 11 é o número de observações **com dono nomeado** — M1 contribui 2 (OBS-1 →
SAN2-4b; OBS-2 → "a junta do SAN2-4a designa"), M2 contribui 4 (tabela "Sugestão de dono", l.458),
M3 contribui 5 (coluna "Dono sugerido"); **2+4+5 = 11**. A 12ª (OBS-3 da M1) é **nota de método sem
dono** — *"N=10 tem 96,2 % de chance de sair verde com o defeito presente … o critério de N da
pendência era, ele próprio, cego para a classe de defeito que ela perseguia"*.
**Nada falso no bloco. Corrijo o denominador do briefing — e do meu próprio mandato.**

### 3.2 Nomeadas COM dono e SEM correção proposta — §C7.4-bis intacto

A fórmula abre as três seções e é executada, não decorativa: `medicao-1:302-305` *"**NENHUM conserto
aplicado** … Sou achador; achador não conserta … **não** proponho nem escrevo a correção. Não toquei
`tests/`, `scripts/`, `src/`, `.github/`, `Kpis/` nem contratos"* — idem `medicao-3:561-565`;
`medicao-2:456` *"O 4a **não corrigiu nada** e não vai corrigir"*. O item 1 **prova o texto por
execução**: diff de código vazio nas três pontas.

**Testei a fronteira nos dois casos que mais se aproximam de "propor correção":**
- **m3/O-1** vai na direção **oposta** à proposta: *"Acrescentar `rls_test_` a `SWEPT_ROLE_FAMILIES`
  **não bastaria**"* — nomeia por que o conserto óbvio é insuficiente (chamador único na `l.310`, que
  `tests/rls-tenant-isolation.test.ts` nunca invoca). É achado, não receita.
- **m1/OBS-2** toca `src/` e se autolimita no mesmo parágrafo: *"Isto é **fato medido**, não juízo de
  risco … **Não proponho alteração de `src/`.** **Dono: a junta do SAN2-4a designa**"*.
- **m3** ainda registra a *"Nota de calibração para a junta, **que não é conserto**"*, e devolve a
  decisão: *"**O custo-benefício é da junta; o número é meu.**"* Fronteira respeitada.

### 3.3 O **68** está **CARREGADO**, e nunca apresentado como medido

`medicao-3` l.493, na própria tabela de números:
`| Roles rls_test_ órfãs na base do dono | **68** | **2026-08-18** | P-O6R-ARNES-ISOLAMENTO l.3296-3298 | **CARREGADO — NÃO re-verificado** |`
l.497 dá o motivo: *"contar as 68 exigiria consultar `erp-postgres`, e o §5.2 do plano proíbe"*.
l.541: *"O **68** segue **CARREGADO** (§F10), com data (18/08) e fonte."* l.590: *"**O 68 continua
CARREGADO** — e é o item que esta medição mais deliberadamente **não** entrega."*
E o O-5 liga o mecanismo às 68 **sem contá-las**, pela assinatura **460 = 115×4, LOGIN, sem
expiração** (que confirmei aritmeticamente: 115×4 = 460). **Ninguém apresentou o 68 como medido.**

> **ITEM 3 — APROVA.** Escopo declarado com evidência de data/origem, dono nomeado, nenhum conserto
> aplicado nem proposto, o 68 declarado CARREGADO. Única correção factual: **12** rótulos, 11 com dono.

---

## ALVO EXTRA (vindo da C1) — número publicado sem origem no método declarado

### 4.1 Corroboro a C1 sobre o "+78 %", com a aritmética fechada

`medicao-1` l.129 e l.229 publicam: F1 (máquina livre) **2 637–2 765 ms** → F2 (starvation)
**3 902–4 797 ms**, *"**+48 % a +78 %**"*. Os **quatro** pareamentos possíveis:

| pareamento | conta | resultado |
|---|---|---|
| mín↔mín | 3902/2637 | **+48,0 %** ← bate com o "+48 %" publicado |
| **máx↔máx** | 4797/2765 | **+73,5 %** ← é o par correspondente, e **não** é 78 |
| máx F2 / mín F1 | 4797/2637 | +81,9 % |
| mín F2 / máx F1 | 3902/2765 | +41,1 % |

**Nenhum dá 78.** Para o "+78 %" fechar, o máximo da F2 teria de ser **4 922 ms** (medido 4 797) ou o
máximo da F1 **2 695 ms** (medido 2 765). O limite inferior do intervalo deriva; **o superior não**.
E o contraste é o que dá peso ao achado: **todo número vizinho que testei deriva** — (255/256)^10 =
**96,2 %** e ^30 = **88,9 %** (publicados idênticos), 115×4 = **460**. O bloco é aritmeticamente
rigoroso em volta; o +78 % é a exceção isolada.

### 4.2 O análogo na MINHA área — o "11", e o que ele revela

Mesma classe, gravidade menor, e **não é do bloco**: o **11 observações** publicado no briefing
(l.10 e l.25) não deriva de contagem nenhuma registrada — a contagem executável dá **12** (§3.1), e o
11 só fecha sob a regra tácita *"as que têm dono"*, **que não está escrita em lugar nenhum**.
Escopo **`pre-existente` / fora do bloco** (evidência de origem: `BRIEFING-SAN2-4a.md` está
**untracked**, não integra o diff do PR e foi escrito pelo orquestrador para esta junta, não pelo
bloco). Registro como observação de método, com dono na próxima passada do
`inspetor-de-terreno-da-junta`.

### 4.3 O que NÃO é achado — e digo por que procurei

Varri os números que **este PR publica** no KPI, um a um, e **todos derivam**:
`364` e `c9fd3a1` (de `gh pr view 364`) · `23d9227` (da ata l.4) · `154` (de condição publicada pela
série anterior) · "14 arquivos, todos em `agent-orchestration/`" (medi: 14) ·
`mergedAt 2026-08-31T12:06:58Z` (confere) · `1801` chars de apenso (medi por diff de string).

E fui à fonte do único número que o KPI cita **de segunda mão**, o CI da ata:
```
$ gh run view 33346995433 --json conclusion,headSha,jobs
  conclusion = success · jobs = 7, TODOS success
  (owner-portal, authority-portal, backend-postgres, backend, flutter, frontend, docker)
  headSha    = 23d922720cfbc797d0e3f036542b65f290a08ed3
```
**"CI 7/7 run 33346995433" confere exatamente** — e o `headSha` do run é **`23d9227`**. Isto é uma
prova **independente** do §2.1 que ninguém pediu: o CI que validou o SAN2-3 rodou **no head julgado**,
não no `4083146` do GitHub. O `approved_head` gravado é o commit que foi **de fato** testado e votado.

---

## Fecho da cadeira C3 (suplente, identidade NOVA)

**APROVADO.** Os três itens do mandato medidos por **execução minha** e aprovados; **nenhum achado
`bloqueia`**.

| # | Item | Veredito |
|---|---|---|
| 1 | O bloco não consertou nada | **APROVA** — diff vazio em 3 pontas, eol-neutro |
| 2 | O KPI (backfill, 154, métricas intocadas, guard) | **APROVA** com A-1 e A-3 |
| 3 | Observações nomeadas ao 4b, sem conserto; o 68 CARREGADO | **APROVA** — 12 rótulos, 11 com dono |

**Achados, todos `nao-bloqueia`, todos com dono:**
- **A-1** `media` · `dentro-do-bloco` — a entrada/release **SAN2-4a não existe** e o plano a exigia
  em dois lugares (§1.6 "obrigação, não opção"; §6.4 item da bateria). Consequência medível: no
  merge do #365 o painel volta a estar **um merge atrás**. Dono: porteiro pós-merge do #365 / 4b.
- **A-3** `baixa` · `dentro-do-bloco` · **achado meu, não consta da Parte I** — o `backfill_note`
  exigido pelo §1.6 não foi escrito; o campo homônimo carrega, byte a byte, o backfill do **#363**.
  Não é contradição factual (o `release` ainda é o do SAN2-3); é defeito de **localização** — a
  explicação certa está no `release.summary`. Dono: porteiro pós-merge do #365 / 4b.
- **+78 %** `media` · `dentro-do-bloco` — **corroboro a C1**: nenhum dos 4 pareamentos F1→F2 produz
  78 (o correspondente dá **73,5 %**). Dono: 4b.
- **"11 observações"** `baixa` · `pre-existente / fora do bloco` — número do **briefing untracked**,
  sem derivação registrada; a contagem executável dá **12**. Dono: próxima passada do inspetor.

**Divergência com a Parte I, e prevalece a minha medição (R2/P3):** ela publicou *"7 chaves mudaram
de **90**"*; o total de chaves-folha do `kpis-latest.json` é **462**. Numerador certo, denominador
não — e não havia comando de contagem registrado ao lado do 90.

**Não propus correção a nenhum achado (§C7.4-bis). Não commitei nada.**
**Limpeza (1 linha):** removi o diretório de drills `scratchpad/c3sup-freeze` (cópias de
`kpi-freeze.mjs` + `Kpis/`); zero container criado, zero mutação em arquivo rastreado,
`erp-postgres`/`erp-redis` intocados — nenhum comando, nem leitura (`Up 2 days (healthy)` preservado).
