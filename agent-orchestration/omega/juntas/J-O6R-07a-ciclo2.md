# J-O6R-07a — ata da junta do bloco `B-O6R-07a`, **CICLO 2 (TETO)** (PR #369)

> **Quórum: UNANIMIDADE DE 3** (§C7.1-ter(b) — segurança e permissão).
> **Head julgado:** `9989c62` — medido **por cada cadeira**, não citado por mim.
> **Base:** `origin/main` = `f895dd2` · **CI: 7/7** · **Terreno:** `LIBERADO COM RESSALVA` (R1–R4).
> **Este era o TETO** (`D-TETO-DOIS-CICLOS`): reprovação aqui pararia o bloco e viraria dossiê ao dono.
> **Quedas nesta junta: 3** (duas cadeiras + o inspetor). **Votos perdidos: ZERO.**

## Votos

| Cadeira | Identidade | Veredito | Achados |
|---|---|---|---|
| **C1-v2 — `jurado-b07a-c2-autorizacao-s`** (VETO) | **nova** (a do ciclo 1 vetou) | **APROVADO** | 1 `alta` `pre-existente` |
| **C2-v2 — `jurado-b07a-c2-auth-multiorg-s`** (VETO) | **nova** (a do ciclo 1 vetou) | **APROVADO** | 1 `nota` |
| **C3 — `jurado-b07a-migracao-escopo-registro`** (VETO) | **mantida** (aprovou sem veto no ciclo 1 e não consertou nada — C2·8 permite) | **APROVADO** | 1 `alta` · 1 `nota` |

**RESULTADO: APROVADO 3×0.** Zero `bloqueia`.

---

## Os dois `bloqueia` do ciclo 1 — mortos, e provados mortos

### `C1-A1` → o P0 **deixou de ser declarado fechado**

O ciclo 1 marcou `Ω6R-SEC-002` como `fechado` enquanto o técnico ainda apagava anexo alheio. O ciclo 2
passou o achado a **`parcialmente_superado`** (formato QUA-004), com `componente_superado` preservando as
provas e **`componentes_abertos` = 9 rotas**, cada uma com **a forma do seu número** (3 por execução, 4 por
leitura, 2 condicionadas a env).

**A C1-v2 conferiu a paridade nos DOIS sentidos**, o que é o teste que importa: **9/9 rotas nomeadas
abertas respondem abertas** (nenhuma 403 — o registro não mente para o lado ruim) e **10/10 fechadas
respondem 403** (nenhuma via fora da lista aberta — o registro não mente para o lado bom). Drill
re-executado **em dois terrenos**.

### `C2-A1` → a cobrança saiu do laço

O incremento vivia **dentro de `verifyAnonymousCandidate`**, que roda **por candidato**. Virou **ato único
pós-veredicto**; `verifyAnonymousCandidate` voltou a ser função **sem efeito colateral**, restaurando o
invariante que o comentário do B01 declarava.

**A C2-v2 re-executou os vermelhos NAS DUAS PONTAS, por conta própria** — e é a medição mais limpa desta
junta:

| | no código pré-correção (`9d44989`) | na base (`f895dd2`) |
|---|---|---|
| M1 · uso correto trancava o dono | `5 !== 0` | — |
| M2 · sucesso gravava falha na irmã | `1 !== 0` | — |
| M3 · 1 requisição = N incrementos | `2 !== 1` | **`0 !== 1`, a forma OPOSTA** (a base não incrementa nada) |
| M4 · armar segue armando | — | `0 !== 5` |

Denominador `# tests 5` **idêntico nas três execuções**. Verde `5/5` com N=3; `-db` multi-org **3× `7/7`**
sob RLS real, em cluster próprio.

---

## Os achados desta junta

| # | Cadeira | Grav. | Escopo | O quê |
|---|---|---|---|---|
| **S-A1** | C1-v2 | **alta** | `pre-existente` (`eed6240`, 17/07, #197) | **A DÉCIMA via, achada POR EXECUÇÃO e fora do censo dos dois routers:** `POST /mobile/sync/work-order-actions` com `work_order.mileage` deixa o técnico **não atribuído** escrever quilometragem em OS alheia (`null→111111`, medido). **Não reprova**, mas torna **vinculante** que "9 rotas" seja lido como **escopado aos dois routers** e que o **`B-O6R-07c` cense a superfície de SYNC** antes de fechar o P0 |
| **K2-A1** | C3 | **alta** | `dentro-do-bloco` | **A narrativa publicada ficou no ciclo 1**, em três lugares: o **título** do PR dizia *"SEC-002 P0 fechado"*, o **corpo** publicava `2645` com zero ocorrência de `parcialmente_superado`, e o **`release.summary`** dizia *"fecha o P0 por inteiro"* e repetia *"perde TODA mutação"* — a frase que a **errata E-a declara FALSA** — contradizendo, **no mesmo arquivo**, o `findings.p0[SEC-002].status`. **E o título vira o assunto do squash em `main` verbatim** (medido em 5/5 merges recentes; re-medido pelo orquestrador): mergear como estava gravaria na história a declaração que este ciclo existiu para reverter |
| **J2-A1** | C2-v2 | nota | `dentro-do-bloco` | A dep `registerFailure` é **opcional**: com a injeção removida o **`tsc` fica verde** e a cobrança some **em silêncio** (fail-open no tipo). **Mas está guardada por execução** — 6 dos 7 subtestes do `-db` caem nesse estado. Por isso `nota`, não `alta`: o fail-open existe no tipo e **não sobrevive à suíte** |
| **K1-N1** | C3 | nota | `dentro-do-bloco` | `pendencias-indice.md` não nominado no C2·5, embora alterado. **Não é desvio**: é o artefato **gerado** de um arquivo permitido, e a cadeira rodou o gerador sobre os **blobs do head** obtendo **sha256 idêntico** ao commitado — o arquivo **não foi digitado**. Mesma classe do `C3-A3` do ciclo 1, e a mesma regra da casa que absolveu o `app.js` absolve este |

**Graduação do `K2-A1`, feita com a régua da própria cadeira:** no ciclo 1 ela graduou o erro dos
*"42 arquivos"* como **`baixa`** *explicitamente* porque *"o painel não publica número errado"*. Aqui o PR
publicava **número errado E status invertido** — logo `alta`. Não é `bloqueia` porque o painel não consome
o `summary` (`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`) e o lugar canônico do §C3.1 — a entrada nova do
`history` — já nascera correto. **Coerência de régua entre ciclos, aplicada contra o próprio bloco.**

---

## Delta pós-voto — declarado, com o que NÃO foi tocado

O `K2-A1` foi corrigido **depois do voto e antes do merge**, pelo orquestrador (não fui o achador):

1. **`release.summary`** — duas afirmações **falsas** corrigidas cirurgicamente (*"fecha o P0 por inteiro"* →
   `SUPERA PARCIALMENTE`; *"perde TODA mutação"* → o texto **medido** da errata E-a) + **apenso** declarando
   as 9 rotas, a décima via, a contagem real do ciclo 2 e o que o ciclo 2 consertou.
2. **Título e corpo do PR** — reescritos para o estado do ciclo 2.
3. **Freeze reinjetado** (`--check` `ec=0`); guards `kpi-dashboard-charts` **16/16** e `kpi-achados-paridade`
   **6/6**; `git diff --check` limpo.

**O que deliberadamente NÃO foi tocado, e é a parte que importa:** os parágrafos de medição do **ciclo 1**
(`255/2647/2645`). Eles dizem *"medido POR MIM nesta árvore"*, com nome de cluster, versão de Node e saída
literal. **Trocar os números ali atribuiria a quem mediu um número que ele não mediu.** Ficaram preservados
como medição do ciclo 1, e o apenso diz isso com todas as letras. **Corrigir registro não pode virar
falsificação de autoria.**

---

## §C7.4-bis — separação de papéis, respondida por escrito

- **(a) A composição cobre a competência que o achado exige?** **Sim.** As duas cadeiras que vetaram o ciclo 1
  foram **substituídas por identidades novas**, e as duas **re-executaram os drills em vez de ler o
  registro** — foi assim que a C1-v2 achou a décima via, que nenhum censo por leitura tinha. A C3 manteve a
  identidade por permissão expressa do C2·8 (aprovou sem veto, não consertou nada), e **usou a própria régua
  do ciclo 1 contra o bloco**.
- **(b) Quem achou é quem consertou?** **Não, em nenhuma volta.** Ciclo 2 inteiro: **as cadeiras acharam**
  (sem propor correção) · **o `planejador-mestre` planejou** (Fable, §C7.6) · **três devs em cadeia
  implementaram** sem rejulgar. O delta pós-voto foi do orquestrador, que **não foi o achador** do `K2-A1`.
- **(c) O planejador usou dado podre?** **Sim — e a resposta é sobre o orquestrador, de novo.** No ciclo 1
  o `§6` do briefing afirmava que o técnico não atribuído *"perde TODA mutação"*; era **falso por medição**
  (`C1-A2`). Essa frase **sobreviveu no `release.summary`** e só morreu aqui, pelo `K2-A1`. A mesma premissa
  errada atravessou **um ciclo inteiro** em dois artefatos diferentes, e as duas vezes quem a matou foi a
  junta, não eu.

---

## Quedas (P6) — 3 nesta junta, 6 no bloco

| # | agente | fase | erro | custo |
|---|---|---|---|---|
| 4 | inspetor de terreno (1ª) | **mensagem 1** | `rate_limit` | zero trabalho |
| 5 | C1-v2 (titular) | indo escrever o drill, com 3 sub-provas **gravadas** | `rate_limit` | **~1/3** |
| 6 | C2-v2 (titular) | lendo o arnês, só esqueleto | `rate_limit` | quase integral |

**As seis quedas do bloco cobrem três classes distintas** — `server_error` de streaming, `rate_limit` de
cota, `522` de rede. **Não há uma causa, logo não há um remédio.** O que protegeu nas três foi o mesmo:
**gravar ao medir**. A queda #1 mediu três itens sem gravar e custou **3/3** das provas; a #5 gravou e custou
**1/3**.

**P5 não disparou nas quedas 5 e 6, e a decisão está registrada em `00-quedas.md`:** elas foram
**simultâneas, no mesmo teto de cota**, que é **fronteira dura, não janela instável**. Pausar 15 minutos
contra um limite já reposto seria cumprir a letra contra a finalidade. **Hipótese à série, não norma:** o P5
poderia distinguir `server_error` (pausa) de `rate_limit` (redisparo quando reposto).

---

## Incidente entre sessões — e a regra que nasceu dele

Durante esta junta, uma cadeira **de outra sessão** (junta do `B-O6R-02`, ciclo 5) **destruiu o worktree da
cadeira C1-v2 deste bloco**, lendo `jur-c1v2-drill` como *"minha segunda encarnação"*. **Dano medido: zero**
(a jurada já havia migrado; sem junction, `node_modules` intactos) — **por sorte, não por desenho**.

**O agravante que define a classe:** o worktree destruído **não era resíduo de uma cadeira morta — era o
terreno da rede que substituiu a cadeira morta. A resiliência estava em uso quando foi atropelada.**

A regra, adotada pelas duas sessões e registrada em `P-JUNTA-RECURSO-EFEMERO-POR-BLOCO`: **só se remove
recurso cujo nome leve o identificador do BLOCO, nunca o da cadeira**; nome alheio é **intocável** mesmo
parecendo resíduo; **resíduo alheio se reporta, não se varre**. A dívida é **simétrica** — os mandatos das
duas sessões diziam *"remova o que você criar"*, e nenhum previa colisão de nome entre blocos simultâneos.
**Duas sessões independentes, mesmo buraco, mesma semana: defeito de forma de mandato, não descuido de
cadeira.**

**E uma segunda função do P1, não desenhada:** a jurada **anotou a destruição no próprio voto** em vez de só
sofrê-la — e foi só por isso que o acidente ficou visível das duas pontas. Passa a valer: **jurado registra
anomalia de terreno mesmo quando ela não afeta o mérito do voto dele.**

---

## O que este bloco entrega — e o que ele explicitamente NÃO fecha

**Fecha:** permissão dedicada `work_orders:approve` (provada **por mutação**: concedida em runtime a
`technician`, a rota **abriu**; restaurada, **fechou**; 18/18 negativos) · SoD nos dois verbos, **antes** do
`409` · escopo por objeto no service · os residuais do `Ω6R-SEC-003` · o dual-match que curou o `403` na
**fila offline do mobile**.

**NÃO fecha, e diz isso:** o `Ω6R-SEC-002` sai **`parcialmente_superado`**, com **9 rotas abertas + a décima
do `sync`**. Dona: **`P-O6R-SUBRECURSO-OBJECT-SCOPE`** (ALTA) → **`B-O6R-07c`**, que **não pode fechar o P0
sem censar a superfície de sync**.

**Residuais com dono:** `P-AUTH-KDF-ROTACAO-V2` · `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` ·
`P-O6R-B07-APPROVAL-BY-POLICY` · `P-KPI-HISTORY-MD-BACKLOG` · `Ω6R-QUA-004` segue **aberto** com o dono dele.

**Dívida deste PR:** backfill §C3.5 (`merge_commit` + `approved_head`) no PR seguinte.
