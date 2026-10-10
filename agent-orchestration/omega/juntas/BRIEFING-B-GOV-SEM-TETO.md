# BRIEFING — junta do bloco `B-GOV-SEM-TETO` (PR #394) — ciclo 1

**Branch:** `docs/sem-teto-auditoria-no-3` · **Base:** `origin/main` = `fc3363e3` (#392) · **Worktree do
bloco:** `C:/Users/AMP/w-teto` (somente-leitura para as cadeiras) · **Plano:**
`docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` (no ramo; **hipótese a reproduzir**, não fato).

**Objeto julgado: o head do ramo, que CADA CADEIRA RESOLVE POR SI** — `git rev-parse origin/docs/sem-teto-auditoria-no-3`
cruzado com `gh pr view 394 --json headRefOid,isDraft,mergeable` — e **declara no voto**. O plano mediu
`3e92b2b8` em 2026-09-28; se o orquestrador emendou (E2/E3 do plano §5), o head **andou** e o §0 do plano vale
como linha de base **anterior**, a re-medir. O PR está em **rascunho**: irrelevante para o voto, bloqueia o
merge (§9.13 do plano). `scripts/mandato-refs.sh` **não existe** neste ramo — é do #393; a saída dele no
plano §0.1 veio do ramo do #393 e foi cruzada com `git`/`gh`. Cobrá-lo aqui é reprovar por construção.

**Quórum: MAIORIA DE 3, sem veto individual, sem crítico** (§C7.1-ter(b) literal: o bloco não toca dinheiro,
segurança, permissão nem perda de dado — `git diff --name-only origin/main...<head> -- src prisma frontend mobile
.github` = 0; confira). Continua maioria **mesmo com a edição do item 2.2 do inspetor** (plano §3.3(a)/§10):
um item, confinado por diff, que **remove** uma exigência órfã; precedente `B-GOV-ELENCO-ENXUTO` (#381, §C7.6-bis
com PARADA + 30 corpos apagados) sob maioria por decisão do dono (`D-QUORUM-B-GOV-ELENCO`). Reprovar exige
**duas** cadeiras. Se o quórum tiver subido para unanimidade, o orquestrador o declara **aqui, antes do inspetor**.

## Por que esta junta existe, e por que é urgente

O #394 transcreve uma **decisão do dono** (2026-09-27). Enquanto não mergeia, a `main` diz no §C7.4:
*"Reprovou no ciclo 2 → PARA. Não há ciclo 3."* — e o `B-GOV-MANDATO` (#393) **está no ciclo 3**. **O #394 é
pré-requisito legal do #393.** E há um segundo pré-requisito que o texto original **não** cobria: o §C7.1-bis
do contrato e o item 2.2 do `inspetor-de-terreno-da-junta` exigem, em **ciclo ≥3**, "parecer do crítico + PD
≥5 fontes" — protocolo do teto de 5, **reativado** agora que o ciclo 3 volta a existir. Sem tratar isso, o
gate que corre antes de toda junta **bloqueia a junta 3 do #393** por construção (plano §3.3).

**Quem escreveu o texto é parte interessada.** O orquestrador transcreveu as palavras do dono **e elaborou**
sobre elas (vinte elaborações enumeradas no plano §2, quatro declaradas por ele, dezesseis não). Esta junta
mede **cada uma** contra as palavras cruas: derivação fiel, ou o transcritor legislando?

## 1. Composição — três competências, três identidades NOVAS

| cadeira | identidade (corpo versionado nos dois espelhos, no head) | competência | veto |
|---|---|---|---|
| **C1** | `jurado-semteto-c1-fidelidade-transcricao` | **fidelidade da transcrição** — o texto diz o que o dono decidiu, nem mais nem menos | não |
| **C2** | `jurado-semteto-c2-consistencia-normativa` | **consistência normativa** — espelho idêntico; nenhuma regra viva contraditória; o gatilho tem mecanismo; a edição do gate é confinada | não |
| **C3** | `jurado-semteto-c3-escopo-registro` | **escopo, registro e terreno** — diff = §6 do plano; KPI §C3; conflito com o #393; corpos no head; ata | não |

Identidades: corpos **vistos no disco** de `w-teto` em 2026-09-28 10:14 (`.claude/agents/especialistas/`), **não versionados e sem espelho `.agents/`** no momento deste plano — só contam se estiverem no head (`git ls-tree <head>`), com md5 EOL-neutro declarado no voto.

**As três votam JUNTAS, nunca 2+1.** Voto escalonado com tabuleiro mudando é contaminação. Cada cadeira grava
evidência incremental (P1) e conclui **antes** de qualquer emenda ao ramo.

## 2. Inelegibilidade, conferida por NOME (inspetor 3.1/3.1-bis: `OBITUARIO-IDENTIDADES.md` + `grep` nas atas)

- **O orquestrador** — autor do texto do #394 e dev deste bloco.
- **O `planejador-mestre` deste bloco** — escreveu o plano e este briefing.
- **A `agente-fabrica`** — escreveu os três corpos e a hipótese do plano §3.
- **Todos os votantes do #393** — ciclo 1: `jurado-mandato-c1-prevoo-fail-closed`, `jurado-mandato-c2-pergunta-feita`,
  `jurado-mandato-c3-escopo-kpi-registro`; ciclo 2: `guardiao-fail-closed` (permanente; fora mesmo assim),
  `medidor-de-cobertura-do-artefato`, `jurado-mandato-c3b-fronteira-numero-registro`.
- **Por interesse (recomendação do plano; o inspetor decide):** as cadeiras **designadas** para a junta 3 do
  #393 (`jurado-mandato-c1c-invariancia-de-forma`, `jurado-mandato-c2c-cobertura-por-mutacao`,
  `jurado-mandato-c3c-fronteira-numero-registro`) — votariam sob a regra que esta junta legaliza; os devs do
  #393 (`aa051e8cc3eb1c1a0`, `a4ed42a5e3a81bdd3`, Dev-T, Dev-S); o `planejador-mestre` do ciclo 3 do #393.

## 3. As palavras do dono — VERBATIM, como transmitidas pelo orquestrador (2026-09-27)

> *"vamos remover a trava de dois ciclos, se rodar tres ciclos e encontrar mais erro, faremos uma auditoria na
> orquestração e na junta para gantir esta tudo normal e continuaremos. se esta encontrando erro esta tudo certo"*

**Proveniência:** não existe em arquivo rastreado; a única fonte é o chat. O repositório tem a versão
**normalizada** (`decisoes.md` §"nas palavras dele"; `CLAUDE.md` item 4, negrito-itálico). A citação acima e a
do plano §2 são **byte a byte iguais** entre si; se o corpo da C1 trouxer outra grafia, a divergência é achado
da C1 — **a crua vence**. Seis proposições do dono (W1–W6, plano §2): remover a trava de **dois** · se rodar
**três** ciclos e encontrar **mais erro** · auditoria na **orquestração e na junta** · para garantir que **está
tudo normal** · **e continuaremos** · se está encontrando erro, **está tudo certo**.

## 4. As elaborações do transcritor — a lista que a C1 julga uma a uma (detalhe no plano §2)

Tudo o que o texto diz **além** de W1–W6. Marcadas com (*) as que o orquestrador **declarou** como suas.

| # | elaboração | | # | elaboração |
|---|---|---|---|---|
| T-01 | citação **normalizada** sob o rótulo "nas palavras dele" (`gantir esta`→`garantir que está`; acentos; `;`) | | T-11 (*) | "**CONTINUA-SE** … máquina defeituosa → **conserta-se e abre o ciclo 4**" — o dono só cobriu "está tudo normal → continuaremos" |
| T-02 | "**Não há mais teto**" (nenhum, nunca) — o dono removeu a trava de **dois** | | T-12 | glosa "máquina **fabricando** achados, ou **deixando de ver** os reais" |
| T-03 | "Reprovação NÃO para o bloco" (corolário geral) | | T-13 (*) | "**Risco assumido** … melhor dirigido que uma contagem"; **dever novo**: relatar a cada ciclo classe repetida |
| T-04 | "identidade nova nas cadeiras que **votaram**" — o `D-TETO` dizia "que **reprovou**"; divergência pré-existente resolvida **em silêncio** (§A2) | | T-14 | fábrica "por ciclo" (limite dos dois ciclos removido) |
| T-05 | "encontrar mais erro" lido como achado **`bloqueia`** | | T-15 | §C7.5 preservado (listada por completude) |
| T-06 | "**também**" · "**antes do ciclo 4**, OBRIGATÓRIA" — que nenhum gate executa | | T-16 | `decisoes.md` §"melhora de desenho, não afrouxamento" — racional em nome da decisão, pelo autor do #393 |
| T-07 | "da MÁQUINA, **não do bloco**" | | T-17 | §"Contexto que o dono **tinha na mão**" — estado epistêmico do dono, não verificável |
| T-08 | "responde **por execução**" | | T-18 | §"O que NÃO muda" (10 itens) — alcance delimitado pelo transcritor |
| T-09 (*) | perguntas **(a)–(e)**; (a) = classes dos achados do #393; **(d) cita um pré-voo que só existe no #393** | | T-19 | §"Blocos em voo … **retoma no ciclo 3**" — retroativo a bloco já PARADO |
| T-10 (*) | "Conduz … identidade que não votou, não planejou e não desenvolveu" (o dono disse "**faremos**") | | T-20 | título "**NO CICLO 3**" × corpo "**antes do ciclo 4**" |

## 5. Regras vivas remanescentes — o que a C2 re-mede (plano §3; geradas pela PROPRIEDADE, `grep -i 'ciclo'`)

**Onze vivas e contraditórias**, três classes de escopo decididas pelo plano — **a re-verificar com `git log -S`:**
- **(a) entram no #394:** V-01 §C7.7 "teto de dois ciclos ficam intactos" (`CLAUDE.md:531`/`AGENTS.md:559`) ·
  V-02 cauda do item 4 "Por quê, medido … dois conjuntos de achados, não cinco" (`:439–445`/`:467–473`) ·
  **V-03 §C7.1-bis "parecer do crítico + PD nos ciclos ≥3" (`:395`/`:423`)** · **V-04 inspetor item 2.2**
  (`.claude/agents/inspetor-de-terreno-da-junta.md:73–75` + espelho) · V-05 `.agents/agents/README.md:59–63,122,126`
  · V-06 `PROTOCOLO-JUNTA-RESILIENTE.md:6`.
- **(b) saem com dono (`P-GOV-CICLOS-CORPOS-ORFAOS`):** V-07 `validador-mestre:100` (2026-07-08) · V-08
  `critico-adversarial:3,6` (07-10) · V-09 `avaliador-mapas:17` (07-13) · V-10 `agente-fabrica:8` (07-10) · V-11
  `EXECUTION_MODEL.md:270–278` (07-28/08-15).
- **(c) histórico:** `CRONOGRAMA.md:106` e a lista do plano §3.2.

**Se o head emendado ainda contiver qualquer linha viva que limite ou condicione o número de ciclos, é achado
`dentro-do-bloco`.** A C2 **gera a própria lista** (não herda esta) e a cruza nos dois sentidos.

## 6. O gatilho, a pergunta (d) e a edição do gate (plano §4)

O texto define quando/o quê/perguntas/quem conduz/desfechos; **faltam dez peças** (M-01…M-10: quem convoca e
quem impede o ciclo 4; corpo do auditor; registro/veredito/quórum; quem conserta e quem atesta; recorrência;
destino do relato; a ferramenta citada em (d); V-03/V-04; duplicação do §C7.4-bis; `bloqueia` × reprovação).
**Decisões do plano, a julgar:** (d) **reescrita** para não citar ferramenta ausente da `main` (§4.1); o item
2.2 do inspetor muda — **apagar** ou **trocar por "ciclo ≥4 → parecer da auditoria presente"** (§4.2, opção
recomendada, **mecanismo do transcritor**, não palavra do dono). Propriedade para a C2: V-03 (contrato) e 2.2
(corpo) dizem **a mesma coisa**; com a edição, o inspetor **ainda bloqueia** sem ata anterior/`R-*`/plano.

## 7. KPI (plano §7) e o conflito conhecido (plano §0.6)

**O bloco atualiza `Kpis/*`** (§C3.1; precedente #392/#391/#381; #386 não contou por não ter ID de bloco):
`blocks_completed` 167 → 168 **recontado no pré-merge**; métricas de teste **carregadas com nota**; `mvp_*`
intocados; `pr 394`, `merge_commit`/`approved_head` `null` na autoria; backfill do #392 = `merge_commit fc3363e3`
+ `approved_head` **da ata** (`J-B-SAN3-00.md:3` → `7822deaf…`), nunca do merge. A C3 mede com N e forma.
**Conflito:** `git merge-tree --write-tree --name-only <head> origin/chore/mandato-refs-e-preflight` → `decisoes.md`
(+ `Kpis/*` após o KPI). **#394 mergeia primeiro; o #393 integra por merge.** Não é defeito do #394.

## 8. A RE-VERIFICAR — nada abaixo é fato herdado (inspetor 2.1)

- O head, o diff (3 arquivos, +95/−34 em `3e92b2b8`) e o espelho do item 4 (md5 EOL-neutro `3b6be147…`).
- A lista de onze regras vivas e as datas de origem; a classificação (a)/(b)/(c).
- "O #393 tem parecer de crítico (2 rodadas) mas **não tem PD ≥5 fontes**" — afirmação do orquestrador.
- Os números da entrada nova de `decisoes.md` (`87%`, `195`, `0 de 51`, `4 de 6`) — só existem lá e no ramo do #393.
- 14/14 check-runs verdes no head; `sync --check` OK (23 agentes) — re-medir no head **atual**.
- O precedente de KPI (#392 "166 → 167" com métricas carregadas) — ler `Kpis/kpis-history.json` da `main`.

## 9. Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- Cobrar `scripts/mandato-refs.sh`/`mandato-preflight.sh` no head — são do #393.
- Cobrar **PD** (§C7.3) — não há dúvida técnica; é transcrição de decisão do dono.
- Cobrar **testes** — N = 0 por construção; o executável são os guards de KPI e o `npm run check`.
- Cobrar correção de V-07…V-11 **neste PR** — pré-existentes por data (§C7.1-ter(a)); só entram se a cadeira
  provar, com evidência, que o escopo declarado está errado.
- Cobrar que o **mecanismo completo** da auditoria seja desenhado aqui — as peças M-01…M-10 são para **nomear
  com dono**; desenhá-las não está nas palavras do dono. O que se julga é se o transcritor as **calou**.
- Cobrar julgamento sob a **regra nova** — este bloco é julgado sob a `main` (`D-TETO-DOIS-CICLOS`).
- Ler md5 cru de disco × blob como mutação — a árvore é CRLF (`core.autocrlf=true`); compare com `tr -d '\r'`.
- Ler `isDraft=true` como defeito do objeto — é condição de merge, não de voto.
- Cobrar os nomes das cadeiras no plano — o plano não os inventa; o orquestrador os preenche ao versionar.

## 10. Regra de voto

- Cada achado com **`gravidade`** (`bloqueia`/`ajuste`/`nota`) **e `escopo`** (`dentro-do-bloco`/`pre-existente`,
  **com evidência de data ou origem**; sem evidência = `dentro-do-bloco`).
- **"Não consigo medir" = REPROVADO** (fail-closed). Afirmação sem comando executado não conta.
- **Nenhuma cadeira propõe correção** (§C7.4-bis) — reporta defeito, evidência e motivo.
- Veredito por cadeira: **APROVADO** / **REPROVADO**, com a lista de achados, o modelo, o md5 EOL-neutro do corpo
  aplicado e o head resolvido. **A junta não fecha com menos de 3 votos de mérito.**
- Evidência incremental (P1): após **cada item medido**, três linhas em `votos/B-GOV-SEM-TETO/<cadeira>-evidencia.md`.

## 11. Mandato por cadeira (3 itens cada)

- **C1:** (1) T-01…T-20 **uma a uma**, mais o que E2 acrescentar ((d) reescrita; opção §4.2 se adotada) —
  `bloqueia` só onde a elaboração **muda o que o dono decidiu**; (2) a citação nos três lugares (`decisoes.md`,
  `CLAUDE.md`, `AGENTS.md`) contra a crua, byte a byte; (3) T-04, T-11 e T-19 com atenção: são as que mais
  **decidem** por conta própria.
- **C2:** (1) espelho: item 4 + as regiões de E2 com md5 EOL-neutro; (2) lista própria de regras vivas pela
  **propriedade** (`grep -n -i 'ciclo'` em contratos, `EXECUTION_MODEL.md`, `comando-template.md`, os 23+3 corpos
  dos dois espelhos, README, PROTOCOLO, skills) e cruzamento com V-01…V-11 nos dois sentidos; (3) o gate:
  diff do inspetor **confinado ao 2.2**; V-03 = 2.2; **mutação em cópia fora do repo** — sem ata anterior, sem
  `R-*`, sem plano, o inspetor ainda diz BLOQUEADO?
- **C3:** (1) `git diff --name-only origin/main...<head>` **por laço** contra o §6 do plano — nada fora, nada
  proibido; (2) KPI conforme §7 com N e forma (`kpi-freeze --check`, guards, `blocks_completed` contra a `main`
  **de agora**, `approved_head` do #392 lido da **ata**); (3) registro: corpos das 3 cadeiras listados por
  `git ls-tree <head>`, `sync --check` ec=0, pendência E2c pelo gerador, `isDraft`, conflito §0.6 re-medido.

## 12. ISOLAMENTO — por escrito (inspetor 1.2)

- O worktree `C:/Users/AMP/w-teto` é **somente-leitura** para as cadeiras. Cada cadeira escreve **apenas** os
  seus dois arquivos em `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/`.
- Leitura do head por `git show <head>:<caminho>` ou por **worktree próprio e descartável** em caminho curto
  (`git worktree add --detach C:/Users/AMP/w-jur-<id> <head>`), removido **só** por `git worktree remove --force`.
  **Sem junction de `node_modules`** (§C7.1-ter(c)); `npm ci` próprio se precisar dos guards.
- **Nenhuma cadeira precisa de banco.** **A base viva `erp-postgres` (5432) / `erp-redis` (6379) NUNCA é alvo de
  jurado.** Sem Docker. Mutação para medir (C2) **só em cópia fora do repo**, apagada ao fim.
- Resíduo alheio (worktrees `w-devs393`/`w-devt393`/`w-mandato`, ` M` fantasma por CRLF) **se reporta, não se varre**.
- `git.exe`/`node.exe` recusam `/c/…`: use `C:/…` e `export MSYS_NO_PATHCONV=1`.

## 13. Perda de jurado (inspetor 5.1; §C7.7 P1–P3)

Queda por infra (API, rede, cota) **relança a MESMA identidade**; nada que a cadeira tenha começado conta
como voto; **voto perdido nunca conta como aprovação**; a junta **não fecha com menos de 3 votos de mérito**;
sem suplente. A evidência incremental é o que faz a queda custar parcial, não total.

## 14. Sob qual regra esta junta vota

Sob a **`main`**: `D-TETO-DOIS-CICLOS`. Se esta junta reprovar e a segunda também, o bloco **para** — sob a
regra que tenta revogar — e o #393 fica sem base legal para o ciclo 3 até o dono decidir. Não é argumento
para aprovar: é o custo, escrito, de reprovar sem defeito medido **e** de aprovar sem medir.
