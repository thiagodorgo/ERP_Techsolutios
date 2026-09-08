# C1 — REVERIFICACAO dos dois achados (`C1-E-01` ALTA, `C1-E-02` MEDIA)

**Cadeira:** C1 `validador-mestre` — a MESMA que achou os dois defeitos na junta do
`B-GOV-ELENCO-ENXUTO`. Aqui eu **verifico**, nao conserto (§C7.4-bis proibe o segundo, nao o
primeiro).

- **Head do conserto medido:** `f9520ab3fb26c7eb118cc955cb926546bfd5e389`
- **Head anterior (o julgado pela junta):** `7af524ba`
- **Base:** `fe2748c84cc187a54ebe3fa651fcdc347c5b3494` (`git merge-base origin/main HEAD`)
- **Worktree:** `.claude/worktrees/gov-elenco`, branch `chore/gov-elenco-enxuto`
- **Forma:** `node v20.19.5` · `core.autocrlf=true` · `git status --porcelain` VAZIO no inicio
- **Mutacao:** NENHUMA na arvore. Toda execucao rodou em **copia isolada** fora do repo
  (`scratchpad/iso/Kpis/` para o head atual, `scratchpad/antes/Kpis/` para o head anterior,
  este ultimo extraido por `git show <sha>:Kpis/<arquivo>` — **nunca** `git archive` + `tar`,
  que injeta CR sob `autocrlf=true`).

---

## ITEM 1 — `C1-E-01` (ALTA): o painel publicava uma entrega que nao aconteceu

### 1.1 A medicao refeita — mesmo instrumento, mesmo arranjo

Reexecutei **exatamente** o que produziu o achado: o `Kpis/app.js` rodando num sandbox
`node:vm` com o DOM minimo do guard `tests/kpi-dashboard-charts.test.ts` (`getElementById`
memoizado, `fetch` servindo os JSON do proprio diretorio, 400 ms para a hidratacao assincrona),
sobre **copia isolada**. Rodei nas DUAS pontas — head do conserto e head julgado — para que a
diferenca seja **medida**, nao afirmada.

| medida | ANTES (`7af524ba`) | DEPOIS (`f9520ab3`) |
|---|---|---|
| `buildChartSeries(...).blocks`, ultimos 8 | `[156,157,158,158,160,161,162,163]` | `[156,157,158,158,160,161,161,162]` |
| ultimo valor da serie | **163** | **162** |
| `blocks.includes(163)` | `true` | `false` |
| maximo da serie | 163 | **162** |
| `<title>` contendo `163` nos 3 SVG | `08/09 · 163 blocos` | **(nenhum)** |
| semana de 07/09 (`weeks[-1].count`) | **2** | **1** |
| `<title>` da semana | `Semana de 07/09 · 2 blocos entregues` | `Semana de 07/09 · 1 bloco entregue — janela incompleta: a serie para em 08/09/2026 e cobre 2 dos 7 dias` |
| card em `#kpi-cards` | — | `162 · Blocos de trabalho entregues` |

Os dois pontos finais do `#chart-blocks` no head do conserto sao
`<title>08/09 · 161 blocos</title>` e `<title>08/09 · 162 blocos</title>`: o primeiro e a
entrada do `B-GOV-ELENCO`, **plana** contra os 161 do `B-O6R-07b` (06/09) — degrau ZERO,
nenhuma entrega creditada aquele bloco.

### 1.2 Varredura cega do DOM renderizado

Varri **todo** o conteudo escrito pelo app (21 elementos com conteudo) atras de `163` e de
`B-GOV-ELENCO` sem o sufixo `-ENXUTO`:

- **`163`: 10 ocorrencias, TODAS coordenada de SVG** — `y1="163.0"`/`y2="163.0"` de linha de
  grade e `cx="163.0"` de ponto, em `#chart-blocks` e `#chart-velocity`. **Zero** em `<title>`,
  **zero** em texto, **zero** em rotulo de eixo.
- **`B-GOV-ELENCO` (nu): 0 ocorrencias.** Nenhum `<title>` atribui entrega aquele bloco.
- `charts-section.hidden = false` — a secao aparece, ou seja, a serie foi lida de verdade e o
  resultado acima nao e o vazio de um painel que nao hidratou.

### 1.3 `value` x `display`, e `FROZEN` x `latest`

- **10 metricas em `Kpis/kpis-latest.json`, 10 coerentes, ZERO divergencia** — conferido por
  reconstrucao INDEPENDENTE do `display` a partir de `value`/`total`/`unit`:
  `blocks_completed` `value=162` / `display="162"`; `backend_tests` `2936/2938`;
  `frontend_smoke_tests` `1126/1126`; `flutter_tests` `864/864`;
  `backend_contract_tests_focused` `34/34`; `flutter_modules` `17/17`;
  `mobile_backend_contracts` `18/18`; `mobile_core_saas_contracts` `21/21`; `mvp_demo` `99%`;
  `mvp_vendavel` `88%`.
- **O `FROZEN` do `Kpis/app.js` e BYTE-IDENTICO ao `kpis-latest.json`.** Extrai o literal
  (78 635 bytes brutos na linha) e comparei com `JSON.stringify(JSON.parse(latest))`:
  `literal === serializacao` -> **true**, 77 691 = 77 691 caracteres. Nao e igualdade semantica
  frouxa: e a mesma cadeia de bytes. `FROZEN.metrics.blocks_completed` =
  `{value:162, display:"162"}`, `FROZEN.version` = `B-GOV-ELENCO-ENXUTO`,
  `snapshot_date` = `2026-09-08`.
- O diff do `app.js` neste conserto e **1 linha** — so o literal `FROZEN`. Nenhuma regra de
  render foi tocada, o que importa: o achado era sobre o DADO, e o conserto ficou no dado.

### 1.4 A convencao invocada e VERDADEIRA — os quatro precedentes, conferidos no history

| bloco | linhas | `blocks_completed` |
|---|---|---|
| `B-O6R-07a` / `-ciclo2` | 02/09, 03/09 | 158 -> **158** |
| `B-O6R-01-IDENTIDADE` / `-CICLO2` / `-CICLO3` | 18/08, 18/08, 19/08 | 151 -> 151 -> **151** |
| `CHK-DISPATCH-CREATE-PR-A` / `-FIX-JUNTA` / `-REVERIF` | 01/08 | 120 / 120 / **120** |
| `OMEGA-VID-PR-05-SWEEP...` / `-FIX-JUNTA-...` | 01/08 | 122 / **122** |

Ciclo que nao entrega repete o acumulado. A citacao da emenda nao e retorica: e a regua da
casa, e o conserto se encaixa nela.

### 1.5 O que o conserto ESCOLHEU — e ate onde a escolha resolve

O `C1-E-01` punha um dilema de duas pontas: **(i)** se o 162 entregou, a nota
"NAO MERGEOU / `null` e assim permanece" fica falsa no instante do merge; **(ii)** se nao
entregou, o degrau 161->162 fabrica uma entrega. O conserto escolheu **(ii)** — e escolheu a
ponta certa, a unica compativel com a `D-KPI-INDEX-PAINEL` (o painel E a entrega) e com os
quatro precedentes de §1.4.

As duas afirmacoes de fato que sustentam (ii) foram reexecutadas por mim, e as duas passam:

- `git merge-base --is-ancestor 7facc396 origin/main` -> **ec=1 (FALSO)**.
- Nenhum PR aberto para o `B-GOV-ELENCO` (branches `chore/gov-auditoria-elenco` e
  `chore/gov-elenco-fatia-b` seguem sem PR).

E a entrada reprovada ficou com `blocks_completed` **161**, igual ao `B-O6R-07b`, com
`description` e `backfill_note` declarando em texto que **nao entregou** e que os `null` sao
**permanentes, nao backfill pendente**. O `Kpis/kpis-history.md` ganhou a secao
"Emenda do rail §8.7" contando a mesma historia com o mesmo numero — JSON e espelho legivel
**nao divergem**.

**Veredito do item: a contradicao esta RESOLVIDA no lugar que importa** — o numero que o painel
desenha. Nao foi "movida de lugar": o painel deixou de publicar entrega inexistente, e isso e
MEDICAO, nao leitura de nota. Preservar a entrada com 161 e correto pelo §A5/§C6 (apaga-la
seria reescrever a trilha) e nao reintroduz o defeito, porque o render calcula por DIFERENCA
entre pontos medidos e a diferenca ali e ZERO.

### 1.6 Um residual que eu registro por honestidade — e que NAO reabre o achado

O dilema tinha um subproduto que eu mesmo nomeei no `motivo` do `C1-E-01`: os `null` orfanam um
bloco cujo conteudo esta na main. Medi de novo, e o fato persiste:

- `git merge-base --is-ancestor 7facc396 HEAD` -> **ec=0 (VERDADE)**: os 12 commits do bloco
  reprovado (`25c0112a`..`7facc396`) sao **ancestrais desta branch** e entram na main por ESTE PR.
- O trabalho que sobreviveu daquele bloco entra junto, medido:
  `git diff --stat fe2748c8..f9520ab3 -- .claude/` = **34 arquivos, +21 / -5079**;
  `agent-orchestration/controle/aposentadoria-especialistas.md` **nao existe em `fe2748c8` e
  existe no head**; a skill aninhada
  `.claude/skills/blockchain-developer/blockchain-developer/SKILL.md` **existe em `fe2748c8` e
  nao existe no head**.
- A emenda escreve, ainda assim: *"Nao existe merge para preencher, e nenhum bloco seguinte deve
  procura-los"*. A frase se salva pelo qualificador *"por merge proprio"* uma linha acima, e e
  literalmente verdadeira sobre `origin/main` HOJE — mas **nenhuma das duas entradas do history
  diz que a faxina do bloco reprovado viaja dentro do PR do `-ENXUTO`** (`faxina`, `aposentad`,
  `achat`, `.claude` -> 0 ocorrencias na `description` do `-ENXUTO`).

**Por que isto NAO reabre o `C1-E-01`:** (a) o achado era o **painel publicar entrega
inexistente**, e o painel parou de publicar; (b) o acumulado ficou **+1 para +1 merge**, que e a
aritmetica correta — a junta aprovou o head `7af524ba`, que **ja continha** esses 12 commits,
logo a faxina e entrega DO `-ENXUTO`, contada UMA vez, nao duas; (c) o residual e de
**rastreabilidade (§C6)**, vive em campo de texto e nao em numero publicado — severidade
**BAIXA**. Registro nominalmente para o porteiro pos-merge decidir se vira pendencia.
**Nao proponho correcao** (§C7.4-bis).

### 1.7 Comandos que produziram este item

```
git -C <wt> rev-parse HEAD                    -> f9520ab3fb26c7eb118cc955cb926546bfd5e389
git -C <wt> status --porcelain                -> (vazio)
git -C <wt> show 7af524ba:Kpis/<6 arquivos>   -> copia ANTES em scratchpad/antes/Kpis/
cp -r <wt>/Kpis scratchpad/iso/Kpis           -> copia DEPOIS (sha256 do app.js identico ao do repo)
node run-panel.mjs  {iso,antes}/Kpis/         -> serie, semanas, titles (vm + DOM do guard)
node run-panel2.mjs iso/Kpis/                 -> varredura cega por 163 e GOV-ELENCO
node run-panel3.mjs iso/Kpis/                 -> kpi-cards, kpi-secondary, recent-list
node run-panel4.mjs {iso,antes}/Kpis/         -> chart-rounds (12 x 12, inalterado pelo conserto)
git -C <wt> merge-base --is-ancestor 7facc396 origin/main -> ec=1
git -C <wt> merge-base --is-ancestor 7facc396 HEAD        -> ec=0
```

**ITEM 1 — `C1-E-01`: CONSERTADO.** (Residual BAIXA de §1.6 declarado, fora do perimetro do
achado.)

---

## ITEM 2 — `C1-E-02` (MEDIA): a norma que institui uma PARADA de rodada nao tinha registro

### 2.1 A decisao existe agora — e o achado media de novo, nas tres pontas

| medida | `fe2748c8` (main) | `7af524ba` (head julgado) | `f9520ab3` (conserto) |
|---|---|---|---|
| `grep -c D-FALLBACK-MODELO-FABLE-OPUS` em `agent-orchestration/controle/decisoes.md` | **0** | **0** | **2** |

Entrada em `decisoes.md:2049`, **122 linhas acrescentadas, ZERO deletadas** — apendice puro no
fim do arquivo (`@@ -2042,3 +2042,122 @@`), sem reescrever nenhuma decisao anterior. O arquivo
nao tem indice no topo (as entradas sao sequenciais), entao nao ha sumario para dessincronizar.

### 2.2 E auditavel? Os quatro elementos exigidos, conferidos um a um

1. **A ordem do dono, citada e datada.** Secao "As duas ordens que a originaram", com as duas
   falas em bloco de citacao: 2026-09-07 (*"quando o Fable esgotar, cai para o Opus"*) e a
   ampliacao de 2026-09-08 (*"quando o Opus acabar, para"*). "A primeira criou o degrau; a
   segunda fechou a escada."
2. **O PORQUE da proibicao**, e nao so a regra. Secao inteira "Por que a PROIBICAO importa mais
   do que a permissao": *gate degradado e pior que gate ausente* — a ausencia e visivel, a
   degradacao nao, porque o parecer sai com a mesma cara de autoridade qualquer que seja o
   modelo. Dai as duas consequencias de desenho declaradas: fallback para **um** modelo
   **nomeado** (escada aberta vira "o modelo da sessao") e **termino numa parada**.
3. **O motivo MEDIDO da ampliacao**, com data: em 2026-09-08 a rodada bateu no limite do Fable
   **e** no do Opus na mesma sessao. Nao e zelo abstrato — e o fato que criou o terceiro degrau.
4. **O mapeamento Codex**, com o roster nomeado
   (`GPT-6 Astra · GPT-5.6 Sol · GPT-5.6 Terra · GPT-5.6 Luna · GPT-5.5`) e a parada explicita
   para `Terra`/`Luna`/`GPT-5.5`.

### 2.3 DECLARADO x DERIVADO — a distincao que eu exigia esta escrita, e escrita para nao confundir

O titulo da secao ja carrega a divisao: **"Espelho Codex — o mapeamento, e o que nele e
DECLARADO × DERIVADO"**. Na tabela, cada celula traz a sua propria etiqueta:

- `GPT-6 Astra` — *equivalencia **declarada pelo dono***
- `GPT-5.6 Sol` — ***derivado** da ordem do roster, nao declarado nominalmente*

E logo abaixo o paragrafo que explica **por que a distincao precisa existir**, que e o que
separa uma etiqueta decorativa de uma regra util: *"a linha declarada so muda se o dono mudar
de ideia; a derivada **se corrige numa linha** se estiver errada, e quem a le precisa saber que
ela e corrigivel"*, com a ancora no §A6 (separar fato de hipotese). Um leitor futuro nao tem
como confundir: a etiqueta esta **na propria celula**, nao numa nota de rodape.

### 2.4 Coerencia entre os TRES textos — medida, nao lida

Primeiro os dois espelhos do contrato, comparados **por blob** (`git show HEAD:<arquivo>`,
nunca `git archive`+`tar`, para nao injetar CR sob `autocrlf=true`):

```
CLAUDE.md §C7.6-bis : 48 linhas · 3292 bytes · sha256 7083454049b3effe...
AGENTS.md §C7.6-bis : 48 linhas · 3292 bytes · sha256 7083454049b3effe...
diff -> ec=0, IDENTICOS
```

A afirmacao da propria decisao ("48 linhas, identicas nos dois — conferido por `diff` linha a
linha") e **verdadeira**.

Depois as tres pontas, por presenca de cada afirmacao normativa, com o texto normalizado
(sem `*`, sem crase, sem acento, espacos colapsados) para que diferenca de enfase nao passe por
diferenca de conteudo. **10 de 10 presentes nos TRES:**

| afirmacao | decisoes.md | CLAUDE.md | AGENTS.md |
|---|---|---|---|
| `Fable esgotado -> roda em Opus` | SIM | SIM | SIM |
| `Opus esgotado -> PARA` | SIM | SIM | SIM |
| "unico substituto autorizado" | SIM | SIM | SIM |
| "Nunca Sonnet, nunca Haiku, nunca [o modelo da sessao]" | SIM | SIM | SIM |
| "gate degradado e pior que gate ausente" | SIM | SIM | SIM |
| parada da familia do §C7.5 | SIM | SIM | SIM |
| "a substituicao e DECLARADA, nunca silenciosa" | SIM | SIM | SIM |
| "qual papel · qual modelo rodou · por que o Fable faltou" | SIM | SIM | SIM |
| "o fallback e do invocador, nao do arquivo" / "volta ao Fable quando o limite renovar" | SIM | SIM | SIM |
| roster nomeado + Astra declarado / Sol derivado | SIM | SIM | SIM |

**Os tres dizem a mesma coisa.** Nenhuma afirmacao vive em um e falta no outro.

### 2.5 Cross-check do que a decisao afirma sobre a arvore

- **"trocar o `model:` de `{planejador-mestre, inspetor-de-terreno-da-junta, porteiro-pos-merge}`"**
  — sao **exatamente** os arquivos com `model: fable`:
  `grep -rl "^model:[[:space:]]*fable" .claude/agents/` -> **3**, e o espelho `.agents/agents/`
  -> **os mesmos 3**. Nenhum quarto arquivo fixado que a clausula tenha esquecido (o unico outro
  `model:` da pasta e um `inherit` em `frontend-pixel-master.md`, papel alheio a esta norma). O
  "assento permanente" citado no impacto nao tem frontmatter — e coberto pela regra do
  **invocador**, e o §C7.6-bis tambem o nomeia, entao as duas pecas concordam.
- **"21 arquivos no head julgado `9c0e6ac9`, 23 em `7af524ba`, e os dois a mais sao a ata e a
  evidencia da C1"** — reexecutei `git grep -l ... <rev> -- '*.md'`: **21**, **23**, e o `diff`
  das duas listas devolve **exatamente** `agent-orchestration/omega/juntas/J-B-GOV-ELENCO-ENXUTO.md`
  e `.../votos/B-GOV-ELENCO-ENXUTO/C1-evidencia.md`. A conta bate ate os dois nomes.
  (No head do conserto sao **25** — entram `decisoes.md` e `DEV-RAIL-evidencia.md`.)
- **"Nao abre pendencia"** — correto pelo meu proprio contrato: a condicao que eu impus era
  registro em `pendencias.md` **se o achado acompanhasse a aprovacao ainda aberto**. Ele nao
  acompanha: **fechou**. `pendencias.md` nao foi tocado pelo conserto, e nao precisava ser.
- Sobre o `P-GOV-MODELO-CODEX-SEM-NOME` que eu citei como corroboracao no `C1-E-02`: rastreei a
  historia e **me corrijo em parte** — ele nao esta ausente por esquecimento. `git log -S` sobre
  `pendencias.md` mostra que `c0cbfe10` o **abriu** e `7facc396` o **fechou/removeu**, os dois
  dentro da branch; em `fe2748c8` ele nunca existiu. Saldo liquido na main: zero. Nao e defeito
  deste conserto, e o proprio `dev-rail-enxuto` anotou o item como **fora do mandato** dele —
  anotacao honesta.

**ITEM 2 — `C1-E-02`: CONSERTADO.**

---

## ITEM 3 — o conserto nao alargou o escopo

### 3.1 `git diff --name-status f9520ab3~1..f9520ab3` — 6 arquivos, 6 dentro do permitido

```
M  Kpis/app.js                                                            (1 linha: o literal FROZEN)
M  Kpis/kpis-history.json
M  Kpis/kpis-history.md
M  Kpis/kpis-latest.json
M  agent-orchestration/controle/decisoes.md                               (+122 / -0)
A  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/DEV-RAIL-evidencia.md
```

Filtrei o proprio `--name-only` pelo escopo declarado
(`^Kpis/`, `^agent-orchestration/controle/decisoes\.md$`, `^agent-orchestration/omega/`):
**resto VAZIO**. Nenhum arquivo fora do permitido.

### 3.2 `scripts/audit-agents-skills.mjs` — o julgado NAO foi reaberto

- `git diff --name-only f9520ab3~1..f9520ab3 -- scripts/` -> **vazio**.
- Prova mais forte que ausencia no diff, porque nao depende do recorte: **o blob e o mesmo**.
  `git rev-parse 7af524ba:scripts/audit-agents-skills.mjs` e
  `git rev-parse f9520ab3:scripts/audit-agents-skills.mjs` devolvem os DOIS
  `c82c592806141a39020e5ecd67e438daaf1d9f3b`. O instrumento que a junta aprovou chega ao merge
  **byte a byte** como foi julgado.
- (Para contraste: no head reprovado `7facc396` o mesmo caminho e o blob
  `2354129f5f3cc42b666ce8f95451cfe9efdc7249` — outro arquivo, superado pelo `3b4aa97c`.)
- `git diff --stat f9520ab3~1..f9520ab3 -- scripts/ .claude/ .agents/ src/ tests/ prisma/ frontend/ mobile/ CLAUDE.md AGENTS.md`
  -> **vazio**. O conserto nao tocou contrato, elenco, espelho, codigo, teste nem schema.

### 3.3 O conserto foi CIRURGICO tambem dentro do que podia tocar

Comparei `Kpis/kpis-latest.json` chave a chave entre `7af524ba` e `f9520ab3`:
**13 das 14 chaves de topo IDENTICAS** (`release`, `findings`, `production_readiness`,
`recent`, `roadmap`, `series_breaks`, `policy`, `notes`, `limitations`, `scope`, `source`,
`version`, `snapshot_date`). A unica que mudou e `metrics`, e dentro dela **uma unica metrica**:

```
metrics.blocks_completed : value 163 -> 162   E   display "163" -> "162"
```

Os dois juntos — que e exatamente o que o achado `C1-01` do ciclo 1 do bloco anterior cobrava.
Consequencia util: `tests/kpi-achados-paridade.test.ts` e `tests/kpi-dashboard-contraste.test.ts`
leem `findings`/`production_readiness`, **intocados**.

### 3.4 Bateria — executada por mim, com `ec` visto

| # | comando | resultado |
|---|---|---|
| 1 | `node scripts/audit-agents-skills.mjs` | `23 agentes · 11 skills` · **0 BLOQUEIA · 1 AVISO** (`C4-bis Bash tolerado`, o pendente `P-GOV-BASH-EM-QUEM-JULGA`) · **ec=0** |
| 2 | `node scripts/sync-agent-agents.mjs --check` | `OK — 23 agentes, espelho consistente` · **ec=0** |
| 3 | `node scripts/sync-agent-skills.mjs --check` | `OK — 11 skills, 36 arquivos, espelho idêntico` · **ec=0** |
| 4 | `node --check Kpis/app.js` | **ec=0** |
| 4b | `JSON.parse` de `kpis-latest.json` e `kpis-history.json` | **ec=0** (157 registros no history) |
| 5 | `git diff --check` (arvore) e `git diff --check f9520ab3~1..f9520ab3` | **ec=0** nos dois |
| 6 | `git status --porcelain` | so o **meu** `C1-reverificacao-evidencia.md` como `??` — arvore sem mutacao alheia |

### 3.5 O guard do painel, portado — e a razao de eu nao me apoiar nele

Este worktree **nao tem `node_modules`** (e nao criei junction — a licao de 26/08 e explicita), entao
nao rodei `tests/kpi-dashboard-charts.test.ts` sob `tsx`. Portei as **10 asserções que este conserto
poderia quebrar** para Node puro, no mesmo arranjo `vm`, e rodei nas duas pontas:

```
DEPOIS (f9520ab3): 10 PASS de 10 · ec=0
ANTES  (7af524ba): 10 PASS de 10 · ec=0
```

Inclui a invariante mais sensivel — *"a soma das semanas fecha com a diferenca do acumulado"* —,
`serie de blocos == JSON ponto a ponto`, `FROZEN == latest` pelo round-trip do guard real,
`sem fetch nao desenha SVG (D-007)` e `rotula copia congelada`.

**E ai esta o dado desconfortavel que eu registro de proposito: o guard passava ANTES tambem.**
Ele policia a **coerencia interna** (a curva e a do JSON), nao a pergunta semantica de se uma linha
do history corresponde a um merge que existiu. O `C1-E-01` nunca ia cair por CI — caiu por leitura
adversarial do dado. Que ninguem credite ao guard o que ele nao mede.

### 3.6 Varredura final por `163` residual nos artefatos VIVOS

| arquivo | ocorrencias de `163` | natureza |
|---|---|---|
| `Kpis/index.html` | **0** | — |
| `Kpis/app.js` | 1 | dentro do `FROZEN`, no texto da `note` que **explica a correcao** |
| `Kpis/kpis-latest.json` | 1 | a mesma `note` |
| `Kpis/kpis-history.json` | 6 | 4 sao narrativa da emenda; 2 sao falso-positivo (um hash de merge e o `N=16384` do scrypt) |
| DOM renderizado | 10 | **todas coordenada de SVG** (`y="163.0"`, `cx="163.0"`) |

**Zero** ocorrencias de `163` como VALOR. O texto de conclusao do painel
(`app.js:1174`, *"ao longo de N blocos de trabalho entregues"*) e **derivado da metrica**, nao
digitado — logo passou a dizer **162** sozinho.

**ITEM 3 — escopo e bateria: OK.**

---

## VEREDITO

**CONSERTADO.** Os dois achados fecharam, medidos pelo mesmo instrumento que os produziu:

- **`C1-E-01` (ALTA)** — a serie termina em **162**, **nenhum** `<title>` diz `163`, **nenhum**
  credita o `B-GOV-ELENCO`, a semana de 07/09 caiu de **2** para **1** entrega, `value` e
  `display` batem nas 10 metricas e o `FROZEN` e **byte-identico** ao `latest`.
- **`C1-E-02` (MEDIA)** — `D-FALLBACK-MODELO-FABLE-OPUS` existe em `decisoes.md` (0 -> 2), com a
  ordem do dono citada e datada, o porque da proibicao, o mapeamento Codex e a distincao
  **DECLARADO x DERIVADO** escrita **na propria celula** da tabela. Os tres textos
  (`decisoes.md`, `CLAUDE.md`, `AGENTS.md`) dizem a mesma coisa: 10 de 10 afirmacoes normativas
  presentes nos tres, e os dois §C7.6-bis com **sha256 identico**.

**Um residual BAIXA declarado** (§1.6): os 12 commits do bloco reprovado sao ancestrais desta
branch e a faxina dele entra na main por este PR (34 arquivos em `.claude/`, +21/-5079), e
nenhuma das duas entradas do history diz isso. Nao reabre o achado — o numero publicado esta
certo, e a aritmetica e +1 para +1 merge. Fica nomeado para o porteiro pos-merge.

**Nao proponho correcao para nada disto** (§C7.4-bis).
