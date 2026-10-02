# BRIEFING — junta do bloco `B-GOV-PAUSA` (PR #397) — ciclo 1

**Branch:** `docs/gov-pausa-grava-e-para` · **Base:** `origin/main` = `5b6e1036` (#396) · **Worktree do bloco:**
`C:/Users/AMP/w-pausa` (somente-leitura para as cadeiras) · **Plano:** `docs/revisoes/SAN3/B-GOV-PAUSA-plano.md`
(no ramo; **hipótese a reproduzir**, não fato) · **Mandato do planejador:** `votos/B-GOV-PAUSA/00-mandatos/planejador.md`
(`mandato_md5 d8507e81…`, forma A, PRE-VOO OK em `3b00cae9`).

**Objeto julgado: o head do ramo, que CADA CADEIRA RESOLVE POR SI** — `git rev-parse origin/docs/gov-pausa-grava-e-para`
cruzado com `gh pr view 397 --json headRefOid,isDraft,mergeable` — e **declara no voto**. O plano mediu `c9eda7bb` em
2026-10-01 13:49Z (`3b00cae9` = texto; `c9eda7bb` = texto + mandato versionado; **mesmo texto normativo**). Se o
orquestrador emendou (E2/E3 do plano §7), o head **andou** e o §0 do plano vale como linha de base **anterior**, a re-medir.
`scripts/mandato-refs.sh`/`mandato-preflight.sh` **não existem na main nem neste ramo** (são do #393, ainda OPEN); a saída
deles no mandato veio do worktree `w-pv397` e foi cruzada com `git`/`gh`. Cobrá-los aqui é reprovar por construção.

**Quórum: MAIORIA DE 3, sem veto individual, sem crítico** (§C7.1-ter(b) literal: o bloco não toca dinheiro, segurança,
permissão nem perda de dado — `git diff --name-only origin/main...<head> -- src prisma frontend mobile .github tests scripts
infra Kpis` = 0 hoje; confira — após E3, `Kpis` entra, e **continua** maioria: KPI é registro, não invariante). Reprovar
exige **duas** cadeiras. Se o quórum tiver subido para unanimidade, o orquestrador o declara **aqui, antes do inspetor**.

## Por que esta junta existe

O #397 transcreve uma **decisão do dono** (2026-10-01): sob ordem de pausa, o agente grava o estado e para sozinho
(`D-PAUSA-GRAVA-E-PARA`). Vira a norma **P7** do protocolo de junta resiliente, em cinco arquivos. **Quem escreveu o texto é
parte interessada** (o orquestrador) e, por §C7.4-bis, **não o emenda nem o julga**. Esta junta mede: (a) **fidelidade** — o
texto diz o que o dono decidiu, nem mais, nem menos, e o que acrescenta está declarado ou é derivação fiel; (b)
**completude e coerência** — P7 chegou a todo lugar vivo que carrega P1–P6, e nenhuma regra viva o nega, estreita ou
colide com ele; (c) **escopo, registro e KPI** — o diff é o do plano, e o KPI segue o contrato, não a frase do commit.

**É a primeira junta que roda sob P7.** Se o dono mandar pausar, cada cadeira grava `## PAUSA <hora UTC>` na sua
`-evidencia.md` e para sozinha (modelo de mandato, linha `[P7]`).

## 1. Composição — três competências, três identidades NOVAS

| cadeira | identidade (corpo versionado nos dois espelhos, no head) | competência | veto |
|---|---|---|---|
| **C1** | `jurado-pausa-c1-fidelidade-transcricao` | **fidelidade da transcrição** — cada elaboração T-01…T-17 contra as palavras do dono | não |
| **C2** | `jurado-pausa-c2-consistencia-normativa-espelho` | **consistência normativa e espelho** — regras vivas, README Codex, mecanismo (destinos existem na ref?), vocabulário pausa × parada | não |
| **C3** | `jurado-pausa-c3-escopo-registro-kpi` | **escopo, registro e KPI** — diff = §7 do plano; KPI §C3 pelo precedente; corpos no head; ata | não |

Nomes **sugeridos pelo plano**; o orquestrador os confirma ao versionar. Os corpos `jurado-semteto-c{1,2,3}-*` são
**modelo de competência** para a fábrica, **não** cadeiras (votaram no #394). Só contam corpos que estiverem no head
(`git ls-tree <head> .claude/agents/especialistas/ .agents/agents/especialistas/` → 6), com md5 EOL-neutro declarado no voto.

**As três votam JUNTAS, nunca 2+1.** Cada cadeira grava evidência incremental (P1), voto-arquivo-primeiro (P2), nasce
como esqueleto `EM APURAÇÃO`, mandato ≤3 itens (P4) e conclui **antes** de qualquer emenda ao ramo.

## 2. Inelegibilidade, conferida por NOME (inspetor 3.1/3.1-bis: `OBITUARIO-IDENTIDADES.md` + `grep` nas atas)

- **O orquestrador** — autor do texto do #397 e dev do bloco.
- **`planejador-b-gov-pausa`** — escreveu o plano e este briefing.
- **`dev-pausa-emenda`** (ou o nome que o dev de emenda receber) e **`agente-fabrica`** (escreve os três corpos).
- **Os votantes do #394** — `jurado-semteto-c1-fidelidade-transcricao`, `jurado-semteto-c2-consistencia-normativa`,
  `jurado-semteto-c3-escopo-registro` (`J-B-GOV-SEM-TETO.md:21–23`) e `dev-semteto-emenda`. **Atenção:** os três
  **não constam do OBITUARIO** (`grep -c semteto` = 0) — o inspetor confere **pela ata**; a lacuna é pendência pré-existente
  (`P-GOV-OBITUARIO-SEMTETO`, plano §7 E2c), não defeito deste bloco.
- As **50** linhas do OBITUARIO.
- **Por interesse (recomendação; o inspetor decide):** quem ocupou papel no ciclo 4 do #393 (o Dev-T4 é o caso narrado).

## 3. As palavras do dono — VERBATIM, como registradas em `decisoes.md:2827–2830`

> `"documente, quando eu mandar uma ordem de pausa, o agente grava o estado e para sozinho. publique nos documentos e deixe isso como padrão"`
> — e a ordem que a motivou, minutos antes: `"pause tudo, o limite esta perto do teto, nao use mais tokens ate os limites serem resetados, assim eu planejo nao perde contexto e retorno rapido quando a seção estiver ok"`

**Proveniência:** não existem em arquivo rastreado fora de `decisoes.md` (ramo); a fonte é o chat. A junta **não consegue**
cotejar com a primária; mede a distância entre a citação e cada cláusula. Cinco proposições do dono (W1–W5, plano §3):
**quando eu mandar uma ordem de pausa** · **o agente grava o estado** · **e para sozinho** · **documente/publique nos
documentos** · **deixe isso como padrão**. A segunda ordem (W6) é **contexto** — "pause **tudo**", "nao use mais **tokens**",
"nao perde contexto e retorno rapido" — não norma.

## 4. As elaborações do transcritor — a lista que a C1 julga uma a uma (detalhe no plano §3)

Tudo o que o texto diz **além** de W1–W5. **Nenhuma foi declarada** pelo orquestrador como sua (a entrada de `decisoes.md`
apresenta tudo sob "Decisão."). Não é defeito por si — é o que se julga.

| # | elaboração | | # | elaboração |
|---|---|---|---|---|
| T-01 | "**não é morte**: é um corte limpo" (moldura) | | T-10 | **jobs sem modelo não são alvo** — leitura por "tokens", não por "pause **tudo**"; **três listas** diferentes (`rodada de mutação, CI` · `+ cluster descartável` · `E4, CI`) |
| T-02 | exemplos de ordem: `"pause tudo", "pare", "não use mais tokens"` — **"pare"** não está nas ordens e é o verbo de **PARADA** (§C7.5, §C7.6-bis) | | T-11 | **retomada**: mesma identidade, mesmo mandato, seção como roteiro (**P3** emprestada a identidade **igual**) |
| T-03 | o orquestrador **repassa** (`SendMessage`, `PAUSA`) | | T-12 | meio-escrito se **mede** antes de confiar (CR, `tsc`, diff) |
| T-04 | "**termina o comando em curso**" (quando parar) | | T-13 | "a ordem **autoriza o gasto mínimo de gravar**" — reconcilia W2 com W6 |
| T-05 | o **conteúdo** de "estado" (head · feito · falta · próximo comando · meio-escritos) | | T-14 | o **caso** Dev-T4/`TaskStop`/LF→CRLF, "06:4x", "~20–40 min" (terreno: "~30 min") — **não verificável** em arquivo rastreado; traço físico em `w-devt4` (medido: 2 arquivos sujos, EOL **uniforme** hoje) |
| T-06 | **onde/como**: `## PAUSA <hora UTC>` "no seu arquivo de evidência" / `<cadeira>-evidencia.md` — **agente sem evidência** (dev, planejador, fábrica) sem destino | | T-15 | "P7 **não substitui** P1/P2"; "O que NÃO decide" (inclusive: não dispensa **esta** junta) |
| T-07 | 1 linha final apontando o arquivo (P2) — herança | | T-16 | a **escolha de lugares** ("Onde vive") — W4 não disse quais |
| T-08 | "**Não inicia item novo**" | | T-17 | "vigia que dispara **re-invoca o orquestrador e gasta tokens**" (racional) |
| T-09 | deveres do **orquestrador**: tempo de gravar ("ordem de minutos"), para quem não respondeu, **para os vigias**, roteiro "no **custo/trilha**" — artefato que **não existe em lugar nenhum** (`git grep` = 0) | | | |

## 5. O que a C2 re-mede — lista GERADA pelo plano (§4) e achados S-01…S-14 (§5), a reproduzir

**Comando da lista (gere a sua, não herde):** `git grep -c -i -E '\[P[1-6]\]|P1[–-]P[36]|P1–P6|junta resiliente|JUNTA-RESILIENTE|modelo de mandato|evid[eê]ncia incremental|voto-arquivo|00-quedas|perda de jurado' <head> -- CLAUDE.md AGENTS.md 'docs/claude-code-handoff/*.md' .agents/agents .claude/agents .claude/skills .agents/skills scripts tests Kpis agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/docs/conhecimento-de-terreno.md` + `EXECUTION_MODEL.md comando-template.md` da raiz + `git grep -i -c 'pausa' <head> -- .claude/agents .claude/skills`.

**Resultado do plano (hipótese):** quatro lugares vivos carregam o protocolo — `CLAUDE.md`, `AGENTS.md`, `PROTOCOLO`,
`.agents/agents/README.md`. P7 chegou a três; o **README Codex (l.69–72) ficou sem P7** (S-03). Corpos de gate,
`EXECUTION_MODEL`, `comando-template`, skills, scripts: **0** menções a P1–P6 → não precisam de P7. `pausa` em corpo/skill: 0.

**Entram (dentro-do-bloco, evidência no plano §5):** S-01 `CLAUDE.md:524–525`/`AGENTS.md:552–553` "**P1–P6**, inline" /
"as **seis** normas" (agora sete) · S-02 escopo "**TODA junta, inspeção de terreno e porteiro**" (`PROTOCOLO:3`,
`CLAUDE.md:525`) e "sobrevive à **morte**" (`PROTOCOLO:6–7`) — P7 alcança "cada agente vivo" e "não é morte" · S-03
README Codex · S-04 **destino** de `## PAUSA` para agente sem arquivo de evidência (o próprio mandato deste planejador
improvisou "no plano", l.94) · S-05 "**custo/trilha**" sem caminho na ref (classe da pergunta (d) do #394) · S-07 três
listas de jobs sem modelo (a fonte vale) · S-11 "**pare**" como pausa × PARADA do §C7.5/§C7.6-bis.
**Não entram (`nota`):** S-06 "vigia" sem definição · S-08 "20–40" × "30 min", "06:4x" · S-09 item do orquestrador
assimétrico (omite "declara quais jobs ficam vivos") · S-10 §C7.6-bis já manda "registrar o trabalho em voo onde está"
e não cita P7 · S-12 P3 (identidade nova) × P7 (mesma identidade) — declarado, coerente · S-13 §C7.5 e inspetor 5.1 ·
S-14 P6 (pausa não é queda).

**Medido pelo plano, a reproduzir:** modelo de mandato de 8 linhas **idêntico** nos 3 (EOL-neutro, sem indentação);
hunks de `CLAUDE.md` × `AGENTS.md` **IDENTICAS**; `sync --check` OK (26 agentes); `diff --check` ec=0; md5 EOL-neutro
disco = blob nos 5. **Se o head emendado ainda tiver uma frase viva que diga "seis normas"/"P1–P6" como total, ou um
destino que não exista na ref, é achado `dentro-do-bloco`.**

## 6. KPI (plano §6) — pelo contrato e pelo precedente medido, não pela frase do commit

O commit `3b00cae9` diz "`Kpis/*` intocados: registro sem bloco, precedente #396". **Medido:** #396 **não** tocou
`CLAUDE.md`/`AGENTS.md`, não tem ID de bloco nem junta; #394 tocou o contrato, tem ID e junta → contou bloco (167→168).
O #397 tem as três propriedades do #394. **Decisão do plano: KPI SIM** — `blocks_completed` 168 → **169** (recontado no
pré-merge contra a `origin/main` de agora; 170 se o #393 mergear antes); trilhas `3052/3054 · 1202/1202 · 864/864`
**carregadas com nota**; `mvp_*` intocados; `pr 397`; `merge_commit`/`approved_head` **`null` na autoria**; history `n` 164→165;
`app.js` só por `kpi-freeze.mjs`. **Backfill: nenhum devido** (a entrada do #394 já tem `merge_commit`/`approved_head`, pagos
pelo #395 — confira com `node -e` na última entrada). A C3 mede com N e forma.

## 7. A RE-VERIFICAR — nada abaixo é fato herdado (inspetor 2.1)

- O head, o diff (6 arquivos, +217/−2 em `c9eda7bb`; **5** normativos) e os hunks idênticos CLAUDE × AGENTS.
- A lista de lugares vivos (§5) e a classificação entra/nota; as linhas citadas (podem ter andado após E2).
- T-14: a existência e o estado de `C:/Users/AMP/w-devt4` (somente leitura; **não tocar**) — se já não existir, T-14 é `[não-verif]` integral e **não** é defeito.
- O precedente de KPI (#394 contou; #396 não) — ler `Kpis/kpis-history.json` e `git show --stat` dos dois na `main`.
- Check-runs no head (14/14 às 13:49Z — re-medir no head atual) · `sync --check` (26 → 29 com os corpos).
- Conflito com o #393: `merge-tree` **limpo** em `c9eda7bb`; após E3 (`Kpis/*`) provavelmente conflita — H6.1.
- `gov-descuido` conflita em 13 arquivos **com a main** (não com o #397) — reportado, não é deste bloco.

## 8. Reprovação POR CONSTRUÇÃO (cobrar isto é reprovar sem defeito)

- Cobrar `scripts/mandato-refs.sh`/`mandato-preflight.sh` no head — são do #393 (OPEN).
- Cobrar **PD** (§C7.3) — não há dúvida técnica; é transcrição de decisão do dono.
- Cobrar **testes** — N = 0 por construção; o executável são os guards de KPI, `sync --check`, `diff --check`.
- Cobrar o **desenho** do mecanismo de S-04/S-05 — o que se julga é se o destino **existe na ref** ou está **declarado com dono**; desenhá-lo não está nas palavras do dono.
- Cobrar que T-14 seja **provado** — é `[não-verif]` por natureza; o que se mede é se o texto o apresenta como medido sem fonte (gravidade da C1).
- Cobrar o OBITUARIO dos `semteto` **neste PR** — pré-existente (28/09), pendência com dono.
- Cobrar os conflitos do `gov-descuido` — são daquele ramo com a main.
- Ler md5 cru de disco × blob como mutação — a árvore é CRLF; compare com `tr -d '\r'`.
- Cobrar os nomes das cadeiras no plano — são sugestões; o orquestrador os confirma ao versionar.

## 9. Regra de voto

- Cada achado com **`gravidade`** (`bloqueia`/`ajuste`/`nota`) **e `escopo`** (`dentro-do-bloco`/`pre-existente` com evidência de data ou origem; sem evidência = `dentro-do-bloco`).
- **"Não consigo medir" = REPROVADO** (fail-closed). Afirmação sem comando executado não conta.
- **Nenhuma cadeira propõe correção** (§C7.4-bis) — reporta defeito, evidência e motivo.
- Veredito por cadeira: **APROVADO** / **REPROVADO**, com achados, modelo, md5 EOL-neutro do corpo aplicado e o head resolvido. **A junta não fecha com menos de 3 votos de mérito.**
- Evidência incremental (P1): após **cada item**, três linhas em `votos/B-GOV-PAUSA/<cadeira>-evidencia.md`; voto em `<cadeira>-voto.json` **antes** da mensagem final (P2).

## 10. Mandato por cadeira (3 itens cada, P4) — com os comandos

- **C1:** (1) T-01…T-17 **uma a uma** contra W1–W5 (`decisoes.md:2827–2830` do head; `grep -n -E 'P7|PAUSA'` nos 5 arquivos para localizar cada cláusula) — `bloqueia` só onde a elaboração **muda o que o dono decidiu**; (2) o que E2 acrescentou (S-01…S-05, S-07, S-11 emendados) é derivação fiel ou legislação nova? — e está declarado como do transcritor no parágrafo datado de `decisoes.md`?; (3) T-02, T-10, T-14 com atenção: são as que mais **decidem** por conta própria ("pare"; "tudo" × "tokens"; caso sem fonte).
- **C2:** (1) espelho: hunks CLAUDE × AGENTS (o `diff` dos dois `git diff -U0 origin/main <head>` filtrados por linhas `+`/`-`, comando do mandato l.36), item 7 inteiro md5 EOL-neutro, modelo de mandato nos 3 (o `awk` do plano I1); (2) lista **própria** pela propriedade (comando do §5) cruzada com S-01…S-14 nos dois sentidos — inclusive `grep -n -E 'P1–P6|seis normas' CLAUDE.md AGENTS.md`, `grep -c P7 .agents/agents/README.md`, `git grep -i 'custo/trilha' <head>`; (3) mecanismo e vocabulário: todo sujeito de P7 tem destino na ref? o roteiro de retomada tem destino na ref? "pare" tem outro sentido vivo (`grep -n -i -E 'pare|PARA\.' CLAUDE.md`)?
- **C3:** (1) `git diff --name-only origin/main...<head>` **por laço** contra o §7 do plano — nada fora, nada proibido; corpos das 3 cadeiras por `git ls-tree <head>` (6) e `sync --check` ec=0 com N; (2) KPI conforme §6 com N e forma (`kpi-freeze --check`, 3 guards com `npm ci` **próprio**, `blocks_completed` contra a `main` **de agora**, `null` na autoria, history `n`+1, **nenhum backfill devido** — provar com `node -e`); (3) registro e terreno: pendências E2c pelo gerador (`python agent-orchestration/controle/gerar-indice-pendencias.py` sem diff residual), parágrafo datado em `decisoes.md`, `status-geral.md`, check-runs no head, H6.1 re-medido (`merge-tree` com `origin/chore/mandato-refs-e-preflight`).

## 11. ISOLAMENTO — por escrito (inspetor 1.2)

- `C:/Users/AMP/w-pausa` é **somente-leitura** para as cadeiras. Cada cadeira escreve **apenas** os seus dois arquivos em `agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/`.
- Leitura do head por `MSYS_NO_PATHCONV=1 git show <head>:<caminho>` (prefixo **por comando**; nunca `export`) ou por **worktree próprio e descartável** em caminho curto (`git worktree add --detach C:/Users/AMP/w-jur-<id> <head>`), removido **só** por `git worktree remove --force`. **Sem junction de `node_modules`**; `npm ci` próprio se precisar dos guards.
- **Nenhuma cadeira precisa de banco.** **A base viva `erp-postgres` (5432) / `erp-redis` (6379) NUNCA é alvo.** Sem Docker.
- `timeout` em tudo que executa; **nunca `tail -f`**; logs longos só no arquivo de evidência.
- Resíduo alheio (`w-devs393`, `w-devt393`, `w-devt4`, `w-mandato`, `w-pv397`, `.claude/worktrees/*`, ` M` fantasma por CRLF) **se reporta, não se varre** — `w-devt4` é o traço físico de T-14 e **não se toca**.

## 12. Perda de jurado — e PAUSA (inspetor 5.1; §C7.7 P1–P3; P7)

Queda por infra (API, rede, cota) **relança a MESMA identidade**; nada que a cadeira tenha começado conta como voto;
**voto perdido nunca conta como aprovação**; a junta **não fecha com menos de 3 votos de mérito**; sem suplente.
**Ordem de pausa do dono** (P7, primeira junta sob a regra): o orquestrador repassa `PAUSA` em 1 linha; a cadeira termina o
comando em curso, grava `## PAUSA <hora UTC>` (head · feito · falta · próximo comando · meio-escritos) na sua
`-evidencia.md` e para sozinha com 1 linha; **não inicia item novo**. Retomada pela **mesma identidade, do mesmo mandato**,
re-executando o registrado e medindo a cauda; a ata registra o que foi re-executado vs medido de novo.
**Fable esgotado** → Opus **com substituição declarada** na evidência e na ata; **Opus esgotado → para** e registra onde está.

## 13. Sob qual regra esta junta vota

Sob a **`main`**: `D-SEM-TETO-AUDITORIA-NO-3` — **sem teto por contagem**; reprovação abre o ciclo seguinte com papéis
recompostos (§C7.4-bis) e identidade nova nas cadeiras; se o ciclo 3 reprovar, auditoria da **máquina** antes do ciclo 4.
Não é argumento para aprovar nem para reprovar: é o custo, escrito, de cada voto sem defeito medido.
