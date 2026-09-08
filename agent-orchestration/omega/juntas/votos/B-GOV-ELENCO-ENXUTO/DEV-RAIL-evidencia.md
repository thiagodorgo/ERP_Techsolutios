# DEV-RAIL — evidência do conserto do rail do §8.7 (`B-GOV-ELENCO-ENXUTO`)

> **Papel:** `dev-rail-enxuto` — **quem DESENVOLVE**, §C7.4-bis. Identidade distinta de **quem ACHOU**
> (cadeira `C1` `validador-mestre`) e de quem escreveu o defeito (o orquestrador). **Não julgo a validade
> dos achados: implemento.**
>
> **A junta APROVOU o bloco (2×1).** O que retém o merge é o **rail** do §8.7 — *"nunca merge com KPI
> divergente da execução real"* —, que maioria não levanta (§1-bis da ata `J-B-GOV-ELENCO-ENXUTO.md`).
>
> **Alvo:** worktree `.claude/worktrees/gov-elenco`, branch `chore/gov-elenco-enxuto`, head de partida
> `7af524ba`.
>
> **Protocolo §C7.7 P1:** este arquivo é apensado **após cada passo**, em ordem cronológica.

---

## FORMA (declarada uma vez, vale para todo o arquivo)

| Item | Valor |
|---|---|
| Node | `v20.19.5` (`node --version`) |
| `core.autocrlf` | `true` (`git -C <wt> config core.autocrlf`) |
| Shell | Git Bash / Windows 11 |
| Worktree | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` |
| Cópia isolada | `C:/Users/AMP/AppData/Local/Temp/claude/.../scratchpad/dev-rail` — **caminho Windows**, que o Node do Windows resolve (o `mktemp -d` do Git Bash devolve `/tmp/...`, que ele **não** resolve; essa armadilha já fez um teste passar sem testar nada nesta sessão) |
| Árvore principal | `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios` (branch `demo/investidor`) — **não recebeu um único comando** |

---

## PASSO 0 — leitura dos insumos

Lidos integralmente, antes de tocar em qualquer arquivo:

- `agent-orchestration/omega/juntas/J-B-GOV-ELENCO-ENXUTO.md` — §1 (veredito 2×1), **§1-bis** (o merge fica
  retido por **rail**, não pela junta) e **§2** (os dois achados da C1).
- `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/C1-voto.json` — voto integral, inclusive
  `comandos_executados` e `limites_declarados`.
- `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/C1-evidencia.md`.
- `tests/kpi-dashboard-charts.test.ts` — **só leitura**, para reproduzir o arranjo `node:vm` do guard.
  `tests/` é **escopo PROIBIDO** neste bloco e não foi tocado.

Estado de partida medido: `git log --oneline -1` → `7af524ba`; `git status --short` → **vazio**.

---

## PASSO 1 — o ANTES, medido por EXECUÇÃO do próprio painel

**Não reli o achado: executei o painel.** Cópia isolada de `Kpis/{app.js,kpis-latest.json,kpis-history.json}`
em `…/scratchpad/dev-rail/antes/Kpis/`, e um runner `painel.mjs` que carrega o `app.js` **de verdade** num
sandbox `node:vm` com o mesmo arranjo de `tests/kpi-dashboard-charts.test.ts` (DOM mínimo + `fetch` stub
servindo os JSON do diretório dado).

```
$ node painel.mjs <…>/antes/Kpis
=== SERIE DE BLOCOS (ultimos 6 pontos: data | version | blocks_completed) ===
  2026-09-02 | B-O6R-07a                | 158
  2026-09-03 | B-O6R-07a-ciclo2         | 158
  2026-09-05 | B-O6R-02-ciclo5          | 160
  2026-09-06 | B-O6R-07b                | 161
  2026-09-08 | B-GOV-ELENCO             | 162      <-- bloco que NUNCA MERGEOU
  2026-09-08 | B-GOV-ELENCO-ENXUTO      | 163
=== ULTIMO PONTO DA SERIE: 163 ===
```

`<title>` do `#chart-blocks` (154 no total; os que citam `16x`):

```
<title>05/09 · 160 blocos</title>
<title>06/09 · 161 blocos</title>
<title>08/09 · 162 blocos</title>     <-- credita o B-GOV-ELENCO
<title>08/09 · 163 blocos</title>     <-- degrau que se apoia nele
```

`<title>` do `#chart-velocity`, último:

```
<title>Semana de 07/09 · 2 blocos entregues — janela incompleta: a série para em 08/09/2026 e cobre 2 dos 7 dias</title>
```

**DUAS entregas desenhadas na semana de 07/09, e só UMA existe: este PR.** `weeks[-1]` =
`{start:"2026-09-07", label:"07/09", count:2, medido:true, janelaParcial:true, diasCobertos:2}`.
`charts-section hidden = false`. `FROZEN.metrics.blocks_completed` = `{"value":163,"display":"163",…}`.
Card renderizado: `<span class="num">163</span><span class="kpi-label">Blocos de trabalho entregues`.
Texto de conclusão: *"…ao longo de 163 blocos de trabalho entregues."*

Busca por `B-GOV-ELENCO` (sem `-ENXUTO`) em **todos** os elementos renderizados: **0 ocorrências** — o
desmentido do campo `note` **não chega à tela**, exatamente como a C1 mediu.

**O ANTES está reproduzido. É o defeito `C1-E-01`, verbatim.**

---

## PASSO 2 — `C1-E-01`: o conserto, e o princípio que o decide

### O princípio (orquestração, não escolha minha)

**Bloco que nunca mergeou NÃO ENTREGOU.** Portanto o acumulado não sobe por causa dele. Isso me foi dado
como decidido; o que é meu é o **como**, dentro do escopo permitido.

### Como implementei

| # | Arquivo | O que mudou |
|---|---|---|
| 1 | `Kpis/kpis-history.json` — entrada `B-GOV-ELENCO` | `blocks_completed` **162 → 161** (o valor do `B-O6R-07b`, a última entrega real). **A entrada NÃO some** — ela é registro do que aconteceu, e apagá-la seria reescrever a trilha (§A5/§C6). O que muda é ela **deixar de contar como entrega**. |
| 2 | idem, `description` da mesma entrada | Prefixo `[EMENDA DO RAIL §8.7 …]` **antes** do texto autoral, dizendo sem ambiguidade que a entrada **não entregou** e por quê (reprovada 3×0 no ciclo 1 e **2×1** no ciclo 2, teto `D-TETO-DOIS-CICLOS`, **dossiê ao dono**), que `pr`/`merge_commit`/`approved_head` são `null` **PERMANENTES — não backfill pendente**, e uma **errata** da frase autoral *"`blocks_completed` 161 → 162"*. O texto original fica **preservado na íntegra** (§A2 — acrescentar, nunca apagar em silêncio), sob marcador explícito. |
| 3 | idem, `backfill_note` da mesma entrada | Acrescentada a mesma declaração de permanência dos `null` — é o campo onde se procura status de backfill. |
| 4 | `Kpis/kpis-history.json` — entrada `B-GOV-ELENCO-ENXUTO` | `blocks_completed` **163 → 162**; `description` ganha a seção da emenda; `backfill_note` reescrita para `161 → 162`, nomeando o `B-O6R-07b` como degrau anterior. |
| 5 | `Kpis/kpis-latest.json` | `metrics.blocks_completed`: `value` **163 → 162** **e** `display` `"163"` → `"162"` — os **dois**, porque o ciclo 1 do bloco anterior foi reprovado justamente por divergência entre eles e o `app.js` renderiza `display`. `note` reescrita. |
| 6 | `Kpis/app.js` | `FROZEN` **regenerado** por `node scripts/kpi-freeze.mjs` — nunca digitado. |
| 7 | `Kpis/kpis-history.md` | O espelho em Markdown dizia `162 → 163`: corrigido para `161 → 162`, com seção própria *"Emenda do rail §8.7"* explicando o porquê. |

**Por que 161 e não uma lacuna (`null`):** é a convenção **medida** da casa em **quatro** precedentes, um
deles de dois dias atrás na mesma série — `B-O6R-07a` 158 → `ciclo2` **158**; `B-O6R-01` 151 → `ciclo2`
**151**; `CHK-DISPATCH-CREATE-PR-A`/`-FIX-JUNTA`/`-REVERIF` **120/120/120**; `OMEGA-VID-PR-05` **122/122**.
Ciclo que não entrega **repete** o acumulado. Um `null` abriria buraco na série e é outra afirmação
("não medido"), que seria falsa: o valor é conhecido — é 161.

Mutação aplicada por script (`fix.mjs`) que **falha se o estado de partida não for o esperado**
(`gov=162 ∧ enx=163`), e que reescreve os JSON com `JSON.stringify(o, null, 2) + "\n"` — forma provada
**byte-idêntica** ao original antes de qualquer edição (round-trip testado nos dois arquivos). Resultado:
`git diff --stat` = **12 linhas** no history e **6** no latest — nenhum churn de formatação.

### FROZEN regenerado e conferido

```
$ node scripts/kpi-freeze.mjs        -> "cópia congelada reinjetada (snapshot 2026-09-08, 77705 bytes)"  ec=0
$ node scripts/kpi-freeze.mjs --check -> "em dia (snapshot 2026-09-08)"                                   ec=0
$ node -e "JSON.stringify(latest) === <literal apos 'var FROZEN = '>"  -> true      # BYTE-IDENTICO
$ FROZEN.metrics.blocks_completed -> value 162 · display "162"
```

### O DEPOIS, medido por EXECUÇÃO — o mesmo runner, a mesma técnica, cópia isolada

```
$ node painel.mjs <…>/depois/Kpis
=== SERIE DE BLOCOS (ultimos 6 pontos) ===
  2026-09-02 | B-O6R-07a                | 158
  2026-09-03 | B-O6R-07a-ciclo2         | 158
  2026-09-05 | B-O6R-02-ciclo5          | 160
  2026-09-06 | B-O6R-07b                | 161
  2026-09-08 | B-GOV-ELENCO             | 161      <-- NAO entregou: repete o acumulado
  2026-09-08 | B-GOV-ELENCO-ENXUTO      | 162
=== ULTIMO PONTO DA SERIE: 162 ===
```

### A tabela ANTES × DEPOIS, item a item

| Medida (execução do painel) | ANTES | DEPOIS |
|---|---|---|
| Último ponto da série de blocos | **163** | **162** |
| Ponto do `B-GOV-ELENCO` | 162 (**degrau**) | 161 (**patamar**) |
| `<title>` do `#chart-blocks`, últimos 4 | `160` · `161` · **`162`** · **`163`** | `160` · `161` · **`161`** · **`162`** |
| `<title>` citando `163` **na página inteira** (639 `<title>`) | **1** — `<title>08/09 · 163 blocos</title>` | **0** |
| `<title>` nomeando `B-GOV-ELENCO` | 0 | 0 |
| `#chart-velocity`, última semana | `Semana de 07/09 · **2 blocos entregues**` | `Semana de 07/09 · **1 bloco entregue**` |
| `weeks[-1].count` | **2** | **1** |
| Card *"Blocos de trabalho entregues"* | **163** | **162** |
| `#conclusion-text` | *"…ao longo de **163** blocos…"* | *"…ao longo de **162** blocos…"* |
| `FROZEN.metrics.blocks_completed` | `{value:163, display:"163"}` | `{value:162, display:"162"}` |
| `charts-section hidden` | `false` | `false` (inalterado — a seção continua com dado real) |

**As duas condições exigidas estão medidas e batem:** a série termina em **162**, e **nenhum `<title>` diz
163 nem credita o `B-GOV-ELENCO`**.

**Nota de honestidade sobre o `163` que sobrou no HTML.** Uma varredura crua por `163` ainda casa em **2**
elementos, e não é entrega nenhuma: são **coordenadas de SVG** — `y1="163.0"`, `cx="163.0"` — nas linhas de
grade e nos pontos do gráfico. Por isso a medida que vale é a de `<title>`, que é o texto que o leitor vê:
**639 `<title>` na página, 0 citando 163**, contra 1 antes. No ANTES a mesma varredura crua casava em **4**
elementos, e os dois a mais eram os que importavam: `#kpi-cards` (o card) e `#conclusion-text`.

**A semana de 07/09 agora desenha 1 entrega, e é a verdade:** só este PR entra.

---

## PASSO 3 — `C1-E-02`: a parada de rodada ganha decisão registrada

### O que estava errado, remedido por mim (não herdado da ata)

```
$ grep -c D-FALLBACK-MODELO-FABLE-OPUS agent-orchestration/controle/decisoes.md      -> 0
$ git grep -l D-FALLBACK-MODELO-FABLE-OPUS 9c0e6ac9 -- '*.md' | wc -l               -> 21   (head julgado pela C1)
$ git grep -l D-FALLBACK-MODELO-FABLE-OPUS 7af524ba -- '*.md' | wc -l               -> 23   (head de partida deste conserto)
$ diff <(lista em 9c0e6ac9) <(lista em 7af524ba)
    > agent-orchestration/omega/juntas/J-B-GOV-ELENCO-ENXUTO.md
    > agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/C1-evidencia.md
```

**O 21 da C1 e o meu 23 não se contradizem:** os dois arquivos a mais são exatamente a **ata** e a **própria
evidência dela**, ambas nascidas *depois* do voto. Publico o meu número com a forma, em vez de repetir o dela.

Entre os 23, os corpos de `inspetor-de-terreno-da-junta`, `planejador-mestre` e `porteiro-pos-merge` **nos
dois espelhos** (`.claude/agents/` e `.agents/agents/`) — isto é, a norma governa **em que modelo todo gate
de junta roda**, e institui uma **parada**, tendo como única autoridade escrita o texto que a cita.
Circular.

Conferi também a paridade do texto normativo, porque a decisão escrita tem de descrever o que existe:
`§C7.6-bis` = `CLAUDE.md` l.436-483 e `AGENTS.md` l.464-511, **48 linhas idênticas** (`diff` vazio).

### O que escrevi

`agent-orchestration/controle/decisoes.md`, ao final, no padrão das vizinhas
(`D-QUORUM-B-GOV-ELENCO`, `D-AUDITOR-ENXUTO`): **`## D-FALLBACK-MODELO-FABLE-OPUS (decisão do dono,
2026-09-07, ampliada em 2026-09-08)`**, com linha de `Status/Origem/Impacto` como as demais.

Contém, item por item, o que a torna auditável:

| Exigência | Onde está na decisão |
|---|---|
| A **ordem do dono** que a originou | as duas citações datadas — 2026-09-07 (*"esgotado o Fable, cai para o Opus"*) e 2026-09-08 (*"quando o Opus acabar, **para**"*) |
| **Por que a proibição importa mais que a permissão** | seção própria: o que a decisão institui não é a permissão de usar Opus, é a **proibição de tudo abaixo dele** — **gate degradado é pior que gate ausente**, porque a ausência é visível (alguém abre a ata e não acha o parecer) e a degradação **não é**: o parecer sai com a **mesma cara de autoridade**, mesmo cabeçalho e mesmo veredito, independentemente do modelo. Daí as duas consequências de desenho: fallback para **um** modelo **nomeado**, e escada que **termina em parada** |
| O `model: fable` **permanece no frontmatter** | seção própria: o fallback é do **invocador**, não do arquivo; trocar o `model:` tornaria a degradação **permanente e invisível** para a próxima sessão — o que o `D-PLANEJADOR-MODELO-FABLE` existe para impedir; quem caiu volta ao Fable sozinho, porque o arquivo nunca mudou |
| Mapeamento Codex, com **declarado × derivado** | tabela + parágrafo: roster **GPT-6 Astra · GPT-5.6 Sol · GPT-5.6 Terra · GPT-5.6 Luna · GPT-5.5**; **Astra ≡ Fable é DECLARADO pelo dono**; **Sol é DERIVADO** da ordem do roster. A distinção fica escrita porque §A6 manda separar fato de hipótese, e porque o efeito é assimétrico: a declarada só muda se o dono mudar de ideia, a derivada **se corrige numa linha**. `Terra`/`Luna`/`GPT-5.5` **nunca** são fallback de gate |
| O **motivo medido** da parada | em 2026-09-08 a rodada bateu **no limite do Fable e no do Opus na mesma sessão**; a política tinha um degrau só, e a saída silenciosa teria sido a que ela proíbe |

Mais: a escada em tabela (Fable → Opus **declarado** → PARA), o vínculo da parada com a família do §C7.5
(trabalho em voo **registrado onde está**, dono avisado), o conteúdo obrigatório da declaração
(**papel · modelo · motivo**, na ata) e as 5 regras de fecho.

```
$ grep -c D-FALLBACK-MODELO-FABLE-OPUS agent-orchestration/controle/decisoes.md   -> 2   (era 0)
$ grep -n '^## D-' … | tail -1
  2049:## D-FALLBACK-MODELO-FABLE-OPUS (decisão do dono, 2026-09-07, **ampliada em 2026-09-08**) — …
```

**Não abre pendência:** o que faltava era o registro, e ele passa a existir. (`P-GOV-MODELO-CODEX-SEM-NOME`,
que a C1 mencionou de passagem, também tem **0** ocorrências em `pendencias.md` — mas ele está **fora** do
meu mandato e eu **não** o inventei; anoto para quem for reverificar.)

---

## PASSO 4 — bateria final, escopo e limpeza

### Forma publicada com os números

**Node `v20.19.5`** · `core.autocrlf=**true**` · Windows 11 / Git Bash · worktree
`.claude/worktrees/gov-elenco`, branch `chore/gov-elenco-enxuto`. **N do diff: 6 arquivos** (5 modificados,
1 novo). **Zero dependência nova.** Nenhum `npm ci`, nenhum `git worktree add`, nenhuma junction/symlink de
`node_modules` (§C7.1-ter(c)).

### A bateria, comando a comando

| # | Comando | Saída | `ec` |
|---|---|---|---|
| 1 | `node scripts/audit-agents-skills.mjs` | `23 agentes · 11 skills` · **`0 BLOQUEIA · 1 AVISO`** (o `C4-bis Bash tolerado`, N=17, pendência do dono `P-GOV-BASH-EM-QUEM-JULGA` — **idêntico ao que a C1 mediu**) | **0** |
| 2 | `node scripts/sync-agent-agents.mjs --check` | `OK — 23 agentes, espelho consistente.` | **0** |
| 3 | `node scripts/sync-agent-skills.mjs --check` | `OK — 11 skills, 36 arquivos, espelho idêntico.` | **0** |
| 4 | `node --check` × 5 (`audit-agents-skills`, `sync-agent-agents`, `sync-agent-skills`, `kpi-freeze`, `Kpis/app.js`) | todos limpos | **0** ×5 |
| 5 | `node scripts/kpi-freeze.mjs --check` | `em dia (snapshot 2026-09-08)` — `FROZEN` **byte-idêntico** ao `kpis-latest.json` | **0** |
| 6 | `JSON.parse` dos dois KPI | ambos parseiam | **0** |
| 7 | `git diff --check` | sem saída | **0** |

### Escopo — medido, não afirmado

```
$ git status --porcelain --untracked-files=all
 M Kpis/app.js
 M Kpis/kpis-history.json
 M Kpis/kpis-history.md
 M Kpis/kpis-latest.json
 M agent-orchestration/controle/decisoes.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/DEV-RAIL-evidencia.md
```

**Todos dentro do permitido** (`Kpis/*` · `agent-orchestration/controle/decisoes.md` ·
`agent-orchestration/omega/**`).

**Escopo PROIBIDO — 0 de 6 arquivos** casam
`^(src/|tests/|prisma/|frontend/|mobile/|\.github/|\.gitignore$|scripts/sync-agent-|package(-lock)?\.json$)`.

**`scripts/audit-agents-skills.mjs` INTOCADO:** `git diff --stat -- scripts/audit-agents-skills.mjs` →
**vazio**. A junta já o aprovou; mexer nele reabriria o que foi julgado.

### O guard que eu não pude rodar, e o que fiz no lugar

`tests/kpi-dashboard-charts.test.ts` não foi executado: este worktree **não tem `node_modules`** e `npm ci`
está fora. Em vez de declarar "não consigo medir", medi a **mesma propriedade de forma mais direta e mais
forte** — executei o `Kpis/app.js` **de verdade** no mesmo sandbox `node:vm` que o guard usa, com `fetch`
stub servindo os JSON, e li o **SVG renderizado**. E li o guard para ver se ele crava algum número: **não
crava** — a única asserção sobre a série é
`assert.deepEqual(series.blocks, rows.map((r) => expectedMetric(r.blocks_completed)))`, isto é, ela **deriva
do JSON**, então move junto. `tests/kpi-achados-paridade.test.ts` lê de `kpis-latest.json` apenas
`production_readiness` e `roadmap`, **ambos intocados**.

### Confirmação final — painel executado **contra o próprio worktree**, somente leitura

```
TOTAL de <title> na pagina inteira: 639
<title> que citam 163 (qualquer forma): 0
<title> que nomeiam B-GOV-ELENCO: 0
--- ultimos 4 <title> do #chart-blocks ---
<title>05/09 · 160 blocos</title>
<title>06/09 · 161 blocos</title>
<title>08/09 · 161 blocos</title>
<title>08/09 · 162 blocos</title>
--- CARD 'Blocos de trabalho entregues' = 162 ---
--- conclusion-text: "…ao longo de 162 blocos de trabalho entregues."
```

`git status --porcelain` **antes e depois** desta execução: **idêntico** — o runner só lê.

### Terreno

Árvore principal `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios` (branch `demo/investidor`, trabalho de
outra sessão): **não recebeu um único comando**. Os demais worktrees: idem. Toda mutação de teste ficou em
`…/scratchpad/dev-rail/{antes,depois}/Kpis/` — cópias **fora** do repositório, em **caminho Windows** que o
Node do Windows resolve.

**Limpeza (§C5):** removidos os diretórios `antes/` e `depois/` da cópia isolada e os scripts de trabalho
(`painel.mjs`, `prova.mjs`, `fix.mjs`, `passo*.md`, `decisao.md`, `*.log`) do scratchpad da sessão. Nenhum
arquivo rastreado apagado; nenhum untracked permitido tocado. Nenhum build artifact foi gerado (não houve
build, nem `npm ci`, nem cluster de banco).

### O que este conserto NÃO fez, declarado

- **Não julguei a validade dos achados** — §C7.4-bis: quem acha não conserta, e quem conserta não julga.
- **Não abri PR nem dei `push`** (fora do mandato).
- **Não toquei** `pendencias.md`: `C1-E-02` fecha por decisão registrada, não por pendência, e
  `P-GOV-MODELO-CODEX-SEM-NOME` está fora do meu mandato — anotado, não inventado.
- **Não mexi** em `scripts/audit-agents-skills.mjs` nem em nada de `src/`, `tests/`, `prisma/`, `frontend/`,
  `mobile/`, `.github/`, `.gitignore`, `scripts/sync-agent-*.mjs` ou lockfiles.

### Re-verificação

Pelo §6.2 da ata, quem confere este conserto é **a cadeira C1** — verificar não é consertar. Os dois números
que ela precisa reencontrar por execução própria: **a série termina em 162** e **`<title>` citando 163 = 0**.
