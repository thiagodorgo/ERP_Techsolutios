# Plano — B-GOV-PAUSA (PR 397) — `planejador-mestre` · identidade `planejador-b-gov-pausa` · modelo **Fable** (claude-fable-5-1, sem substituição) · `mandato_md5 = d8507e81d9de6d36acb8751a270d12a8` · corpo `planejador-mestre` de origin/main `md5(EOL-neutro) = 4c912f69a93f07b14d8fd1c49539c778`

> Esqueleto gravado em 2026-10-01 (P2 — nasce com os itens `EM APURAÇÃO` e cada seção é gravada ao ser medida).
> Objeto: PR 397, ramo `docs/gov-pausa-grava-e-para`, head medido `c9eda7bb64a6ff352a35e6a4afcc071bc91530fb`.
> Worktree de medição: `C:/Users/AMP/w-pl397` (detached no head), removido pelo nome ao fim.

## 0. Abertura — MEDIDO / HIPOTESE

**Separação de papéis (§C7.4-bis):** o **orquestrador** escreveu o texto do #397 (é o dev do bloco e **parte interessada**). Eu **planejo, não desenvolvo, não voto, não emendo**. Quem julga é a junta do §8; quem emenda é um dev de identidade nova. Nenhuma linha deste plano propõe redação nova do contrato — nomeia o que falta e quem decide.

### MEDIDO (comando → saída; cwd `C:/Users/AMP/w-pl397`, head `c9eda7bb`)

| # | o quê | comando | saída |
|---|---|---|---|
| 0.1 | mandato íntegro | `tr -d '\r' < …/votos/B-GOV-PAUSA/00-mandatos/planejador.md \| md5sum` | `d8507e81d9de6d36acb8751a270d12a8` — **confere** com o medido pelo orquestrador |
| 0.2 | corpo aplicado | `MSYS_NO_PATHCONV=1 git show origin/main:.claude/agents/planejador-mestre.md \| tr -d '\r' \| md5sum` · `head -6` | `4c912f69a93f07b14d8fd1c49539c778` · frontmatter `model: fable` · igual ao do head do ramo (`IGUAL`) |
| 0.3 | head do ramo | `git rev-parse HEAD` (w-pausa) · `git ls-remote origin refs/heads/docs/gov-pausa-grava-e-para` · `gh pr view 397 --json headRefOid,state,mergeable` | **`c9eda7bb64a6ff352a35e6a4afcc071bc91530fb`** nos três · `OPEN MERGEABLE` base `main` |
| 0.4 | o head **andou** desde o mandato | `git log --format='%h %ci %s' origin/main..c9eda7bb` · `git diff --stat 3b00cae9 c9eda7bb` | 2 commits: `3b00cae9` 06:50 −03 (texto P7) + `c9eda7bb` 10:34 −03 (**só** o mandato, +107) → `1 file changed` — o texto normativo é **o mesmo** nos dois SHAs; o objeto da junta é o head que cada cadeira resolver |
| 0.5 | base | mandato l.26 | merge-base = `origin/main` = `5b6e1036` (`IGUAL`) |
| 0.6 | o diff | `git diff --stat origin/main HEAD` | **6 files, +217/−2**: `AGENTS.md` 22 · `CLAUDE.md` 22 · `decisoes.md` +28 · `conhecimento-de-terreno.md` +6 · `PROTOCOLO-JUNTA-RESILIENTE.md` +34 · `votos/B-GOV-PAUSA/00-mandatos/planejador.md` +107 (novo) |
| 0.7 | quórum (§C7.1-ter(b)) | `git diff --name-only origin/main HEAD -- src prisma frontend mobile .github tests scripts infra Kpis \| wc -l` · controle positivo `-- CLAUDE.md` | **0** · 1 |
| 0.8 | higiene | `git diff --check origin/main HEAD; echo ec=$?` · `node scripts/sync-agent-agents.mjs --check` | `ec=0` · `[agents-sync] OK — 26 agentes, espelho consistente.` ec=0 |
| 0.9 | CRLF fantasma | por arquivo: contagem de CR no disco · `tr -d '\r' < f \| md5sum` × `git show HEAD:f \| tr -d '\r' \| md5sum` | CR: CLAUDE 696 · AGENTS 745 · decisoes 2851 · PROTOCOLO 144 · terreno 214; **md5 EOL-neutro disco = blob nos 5** |
| 0.10 | espelho (hunks) | mandato l.36 (`diff` dos dois `git diff -U0`) | `IDENTICAS` (CLAUDE × AGENTS) |
| 0.11 | CI no head julgado | `gh api repos/thiagodorgo/ERP_Techsolutios/commits/c9eda7bb…/check-runs --jq '…'` | 13:3xZ: `total=12 nao-verdes=2 pendentes=2` → **13:49Z: `total=14 nao-verdes=0 pendentes=0`** (o inspetor re-mede no head que a ata nomear) |
| 0.12 | #393 (`B-GOV-MANDATO`) | `gh pr view 393 --json state,mergedAt,headRefOid` · `git ls-tree origin/main scripts/ \| grep -c mandato` · `git merge-tree --write-tree --name-only HEAD origin/chore/mandato-refs-e-preflight; echo ec=$?` | `OPEN merged=null head=335cf09d` · **0** (`mandato-refs.sh`/`mandato-preflight.sh` **não estão na main**) · `ec=0` (árvore `d400d308`, **sem conflito hoje**) |
| 0.13 | ramo `gov-descuido` em voo | `git merge-tree --write-tree --name-only HEAD origin/docs/governanca-porteiro-pre-merge-sol` · idem contra `origin/main` | 5 conflitos (README Codex, `planejador-mestre` ×2, `porteiro-pos-merge` ×2) · **13 conflitos contra a main pura** → conflito **daquele ramo com a main**, não do #397 |
| 0.14 | worktrees (resíduo alheio: **reporta, não varre**) | `git worktree list` | `w-devs393` `w-devt393` `w-devt4` `w-mandato` `w-pv397` + `.claude/worktrees/{b04a,b11,gov-descuido}` + `w-pausa` (ramo) + `w-pl397` (este) |
| 0.15 | precedentes de KPI | `git log origin/main --format='%h %ad %s' -6 -- Kpis/kpis-latest.json` | `3b1fe0f9` #395 (backfill) · `b3f0af5f` #394 (bloco) · `fc3363e3` #392 · … — **#396 não tocou KPI** (mandato l.50: 0) |

### HIPOTESE (cada uma com o comando que a derruba)

- **H0.1** Nenhuma cadeira precisa de banco nem Docker; `erp-postgres` 5432 / `erp-redis` 6379 nunca são alvo — derruba: um briefing ou mandato de cadeira que peça `psql`/`docker`.
- **H0.2** O CI do head que a ata nomear estará 14/14 concluído — derruba: `gh api …/commits/<head>/check-runs` com `pendentes>0` ou `nao-verdes>0`.
- **H0.3** `npm run check` e os guards de KPI passam no head — **não executei** (`w-pl397` sem `node_modules`; `npm ci` próprio custa disco e o bloco é documental); a referência "17/17 · 6/6 · 6/6" é a do #392 **herdada** — derruba: `npm ci && node --test --import tsx tests/kpi-*.test.ts` no worktree da cadeira C3.
- **H0.4** O `w-pausa` só recebe os dois arquivos deste plano — derruba: `git -C C:/Users/AMP/w-pausa status --porcelain | grep -v 'B-GOV-PAUSA' | wc -l` ≠ 0 (mandato l.95).

## 1. Objetivo e ator

- **Objetivo:** publicar como padrão (**W5**) a decisão do dono de 2026-10-01: sob ordem de pausa, o agente grava o estado e para sozinho — de forma que a **próxima** ordem de pausa produza um corte limpo em vez de um `TaskStop` no meio de um comando (o caso do Dev-T4, §3 T-14).
- **Ator:** o orquestrador (transcritor; **parte interessada**). **Consumidores:** todo agente vivo sob este contrato — jurado, inspetor, porteiro, dev, planejador, fábrica, vigias — e o próprio orquestrador; o Codex via `AGENTS.md` + `.agents/agents/README.md`.
- **Papéis deste bloco (§C7.4-bis):** quem escreveu (orquestrador) **não emenda nem julga**; quem mede (este plano) **não emenda nem vota**; quem emenda (dev de identidade nova, §8) **não julga o achado**; quem julga (3 cadeiras novas) **não propõe correção**.
- Sem rotas, payloads ou códigos HTTP: bloco documental de governança. **Sem PD** (§C7.3): não há dúvida técnica a pesquisar — há uma decisão do dono a transcrever; o que se julga é **fidelidade, completude e coerência**.

## 2. O que o ramo muda (fluxo origem → destino)

**Fluxo:** palavras do dono (chat, 01/10 ≈06:4x −03) → `agent-orchestration/controle/decisoes.md` **l.2825–2851** (verbatim em l.2827–2830) → `CLAUDE.md` §C7.7: bullet **P7** l.563–578 · linha `[P7]` no modelo de mandato l.587–589 · item do orquestrador l.594–595 → espelho `AGENTS.md` l.591–606 · 615–617 · 622–623 (hunks `IDENTICAS`, §0.10) → fonte longa `PROTOCOLO-JUNTA-RESILIENTE.md` §P7 l.80–107 · modelo l.117–119 · orquestrador l.127–128 → lição `conhecimento-de-terreno.md` §2.2 ("Vida, morte e travamento de agentes e jobs", cabeçalho l.78) l.91–96. Medido: `grep -n -E 'P7|D-PAUSA|PAUSA'` nos cinco (B1).

**O que o texto diz (resumo operativo, não juízo):** ordem de pausa = corte limpo, não morte · o orquestrador repassa `PAUSA` (1 linha, `SendMessage`) a cada agente vivo · o agente termina o comando em curso, grava `## PAUSA <hora UTC>` (head · feito com comando e saída · falta · próximo comando exato · meio-escritos) no seu arquivo de evidência e para sozinho com 1 linha (P2); não inicia item novo · o orquestrador dá o tempo de gravar, só então para quem não respondeu, para os vigias, declara os jobs sem modelo que ficam vivos, registra o roteiro de retomada e encerra em 1 linha · retomada pela **mesma identidade, do mesmo mandato**, com a seção como roteiro (P3) · P7 não substitui P1/P2.

**Modelo de mandato "verbatim da fonte" — medido:** o bloco de 8 linhas extraído de `CLAUDE.md`, `AGENTS.md` e do `PROTOCOLO` (EOL-neutro, sem indentação) é **IDENTICO** nos três (`diff` vazio, I1). A linha `[P7]` entrou nos três.

**Proveniência das palavras do dono:** só existem em `decisoes.md` (ramo); a fonte primária é o chat. A junta **não consegue** cotejar com a primária; consegue medir a distância entre a citação e cada cláusula do texto (§3). `SendMessage` é mecanismo já usado no repositório (`R-omega4c-pr05-ciclo1.md:16`, `R-omega5p-pr03-ciclo1.md:22`) — não é artefato inventado.

## 3. Fidelidade — cláusula a cláusula contra as palavras do dono

**Palavras do dono, verbatim como registradas em `decisoes.md:2827–2830`** (as duas ordens):

> `"documente, quando eu mandar uma ordem de pausa, o agente grava o estado e para sozinho. publique nos documentos e deixe isso como padrão"`
> — e a que a motivou, minutos antes: `"pause tudo, o limite esta perto do teto, nao use mais tokens ate os limites serem resetados, assim eu planejo nao perde contexto e retorno rapido quando a seção estiver ok"`

**Proposições do dono** (a primeira ordem é a decisão; a segunda é **contexto**, não norma):

| # | o dono disse |
|---|---|
| W1 | **quando eu mandar uma ordem de pausa** (gatilho: ordem do dono) |
| W2 | **o agente grava o estado** |
| W3 | **e para sozinho** |
| W4 | **documente / publique nos documentos** |
| W5 | **deixe isso como padrão** (norma permanente) |
| W6 *(contexto)* | "pause **tudo**" · "**nao use mais tokens** ate os limites serem resetados" · motivo: "nao perde contexto e retorno rapido" |

**Elaborações do transcritor** — tudo o que os cinco arquivos dizem **além** de W1–W5. Classes: `[interp]` interpretação · `[acrésc]` conteúdo novo · `[herança]` regra anterior aplicada · `[arg]` racional · `[não-verif]` não verificável em arquivo rastreado · `[preserv]` preservação. **Eu não julgo; enumero** (C1 julga uma a uma; `bloqueia` só onde a elaboração **muda o que o dono decidiu**).

| # | onde (head) | o que o transcritor escreveu | classe | contra o quê medir |
|---|---|---|---|---|
| T-01 | `CLAUDE.md:563–565` · PROTOCOLO:82–83 | "**não é morte**: é um corte limpo" | `[interp]`+`[arg]` | W1–W3 não opõem pausa a morte; é a moldura do transcritor (coerente com W6 "retorno rapido") |
| T-02 | `CLAUDE.md:564` · PROTOCOLO:82 | exemplos do que é ordem de pausa: `"pause tudo", "pare", "não use mais tokens"` | `[interp]` | o dono disse "ordem de pausa" e "pause tudo"; **"pare"** não está em nenhuma das duas ordens e é o verbo de **PARADA** no §C7.5/§C7.6-bis (ver §5 S-11) |
| T-03 | `CLAUDE.md:565` · PROTOCOLO:90 · decisoes:2832–2833 | "o orquestrador a **repassa a cada agente vivo** (`SendMessage`, 1 linha: `PAUSA`)" | `[acrésc]` | W1 não diz **como** a ordem chega ao agente |
| T-04 | `CLAUDE.md:566` · PROTOCOLO:85 | "**termina o comando em curso**" (antes de parar) | `[interp]` de W3 | W3 diz "para sozinho"; **quando** parar é do transcritor — e tensiona W6 "nao use mais tokens" (resolvido por T-13) |
| T-05 | `CLAUDE.md:566–568` · PROTOCOLO:85–88 · decisoes:2833–2834 | o **conteúdo** de "estado": head medido · feito (comando e saída) · falta · **próximo comando exato** · meio-escritos nomeados | `[acrésc]` | W2 diz "grava o estado" sem definir "estado" |
| T-06 | `CLAUDE.md:566` ("no seu arquivo de evidência") · `:587` (`<cadeira>-evidencia.md`) · PROTOCOLO:85,117 | **onde** e **como**: seção `## PAUSA <hora UTC>` no arquivo de evidência | `[acrésc]` | W2 não diz onde; **agente sem arquivo de evidência** (dev, planejador, fábrica) fica sem destino — §5 S-04 |
| T-07 | `CLAUDE.md:567` · PROTOCOLO:88 | "mensagem final de 1 linha apontando o arquivo (P2)" | `[herança]` | aplica P2; fiel por construção |
| T-08 | `CLAUDE.md:567–568` · PROTOCOLO:85 · decisoes:2835 | "**Não inicia item novo**" | `[interp]` de W3 | corolário de "para" |
| T-09 | `CLAUDE.md:568–570` · PROTOCOLO:90–93 · decisoes:2835–2837 | deveres do **orquestrador**: dá o tempo de gravar ("ordem de minutos"), só então para quem não respondeu, **para os vigias**, registra o roteiro de retomada "no **custo/trilha**", encerra o turno em 1 linha | `[acrésc]` | o dono não falou do orquestrador; "vigia" só existe por uso (`terreno:89`, pré-existente), **"custo/trilha" não existe em lugar nenhum** (`git grep` = 0 fora dos 5 arquivos, H4) — §5 S-05 |
| T-10 | `CLAUDE.md:570–572` · PROTOCOLO:93–94 · decisoes:2836 · terreno:94 | "**Jobs locais sem modelo** … **não são alvo** de uma pausa de tokens; o orquestrador declara quais ficam vivos" | `[interp]` de W6 | o dono disse "pause **tudo**" e, na mesma ordem, "nao use mais **tokens**"; o transcritor escolheu a leitura por tokens. As listas de exemplo **divergem**: `(rodada de mutação, CI)` ×3 · `rodada de mutação, CI, cluster descartável` (PROTOCOLO) · `(E4, CI)` (terreno) — §5 S-07 |
| T-11 | `CLAUDE.md:572–573` · PROTOCOLO:96–98 · decisoes:2837–2838 | "**Retomada:** a mesma identidade nasce do mesmo mandato e usa a seção como roteiro (**P3** …)" | `[acrésc]` | W6 pede "retorno rapido"; identidade/mandato/método são do transcritor; P3 foi escrita para **sucessor com identidade nova** — aqui é emprestada à **mesma** identidade (declarado como "P3 aplicada a um corte limpo") |
| T-12 | `CLAUDE.md:573` · PROTOCOLO:97–98 · decisoes:2838 | "arquivo meio-escrito se **mede** antes de se confiar (contagem de CR, `tsc`, diff)" | `[acrésc]` | nenhuma W |
| T-13 | `CLAUDE.md:574` · PROTOCOLO:103–104 · decisoes:2847 | "A ordem **autoriza o gasto mínimo de gravar** — custa um comando e economiza o redo" | `[interp]`+`[arg]` | reconcilia W2 (gravar) com W6 (não gastar): a 2ª ordem do dono (W2) **é posterior** à 1ª (W6) — derivação; a junta diz se é fiel |
| T-14 | `CLAUDE.md:574–577` · PROTOCOLO:100–104 · decisoes:2845–2847 ("06:4x", "E4 de 5–6 h") · terreno:94–95 | o **caso**: "o orquestrador **matou** o Dev-T4 (`TaskStop`) no meio de uma conversão LF→CRLF de `tests/mandato-preflight.test.ts` — parcial possivelmente inconsistente e **~20–40 min** de redo" (terreno diz **~30 min**) | `[não-verif]` | **nenhum arquivo rastreado** narra o evento fora dos 5 (B2, H3: `git grep -i` por `TaskStop`/`Dev-T4`/`ordem de pausa` no head e em `335cf09d` → só ruído). **Traço físico, medido hoje (J1, somente leitura):** `w-devt4` (head `335cf09d`) tem ` M tests/mandato-preflight.test.ts` (+526/−6) e ` M tests/mandato-refs.test.ts` (+137); ambos **uniformemente CRLF** (2485/2485 · 1093/1093 linhas com CR; blob 1971/956) — o parcial **não está inconsistente de EOL hoje**; conteúdo não medido (fora do escopo). "06:4x" e "20–40 min" não têm fonte |
| T-15 | `CLAUDE.md:577–578` · PROTOCOLO:106–107 · decisoes:2850–2851 | "P7 **não substitui** P1/P2 … é a evidência incremental que salva"; "O que NÃO decide" (não altera P1–P6; não para job sem modelo; **não dispensa a junta deste PR**) | `[preserv]`+`[acrésc]` | o dono não delimitou; listada por completude |
| T-16 | decisoes:2840–2843 ("Onde vive") | a **escolha de lugares**: §C7.7 P7 · espelho byte a byte · PROTOCOLO · linha `[P7]` no modelo · terreno §2.2 | `[acrésc]` sobre W4 | W4 diz "publique nos documentos" sem dizer quais — o que falta está em §4 (completude gerada por comando) |
| T-17 | PROTOCOLO:91–92 · terreno:95–96 | "um vigia que dispara **re-invoca o orquestrador e gasta tokens**" | `[arg]` | racional do "para os vigias"; coerente com W6 |

**Total: 17 elaborações** (T-07 e T-15 são herança/preservação, listadas por completude). O orquestrador **não declarou nenhuma como sua** no texto — a entrada de `decisoes.md` apresenta tudo sob "**Decisão.**" como se fosse a decisão; o único trecho marcado como do dono é a citação. Isto não é defeito por si (o #394 teve 16 não declaradas e foi aprovado com ajustes) — é o que a C1 julga.

## 4. Completude — todo lugar vivo onde P1–P6 aparecem, e o que precisa de P7

**Critério (o mesmo do #394, declarado):** *regra viva* = texto que um ator lê como norma no momento de agir — os dois contratos; os companheiros nomeados (`EXECUTION_MODEL.md`, `comando-template.md`, raiz e `docs/claude-code-handoff/`); os corpos de agente nos dois espelhos e o protocolo de emulação `.agents/agents/README.md`; o `PROTOCOLO-JUNTA-RESILIENTE.md` ("a fonte; em divergência, ela vale", §C7.7); skills; scripts/guards. *Registro* = atas, votos, notas de KPI, logs.

**Lista GERADA (C2, F6, F8; cwd `w-pl397`):** `git grep -c -i -E '\[P[1-6]\]|P1[–-]P[36]|P1–P6|junta resiliente|JUNTA-RESILIENTE|modelo de mandato|evid[eê]ncia incremental|voto-arquivo|00-quedas|perda de jurado' HEAD -- CLAUDE.md AGENTS.md 'docs/claude-code-handoff/*.md' .agents/agents .claude/agents .claude/skills .agents/skills scripts tests Kpis agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md agent-orchestration/docs/conhecimento-de-terreno.md` + o mesmo `grep -c` em `EXECUTION_MODEL.md comando-template.md` da raiz + `git grep -i -c 'pausa' HEAD -- .claude/agents .claude/skills`.

| lugar vivo (head) | casa | P7 chegou? | precisa? | por quê (medido) |
|---|---|---|---|---|
| `CLAUDE.md` §C7.7 | 12 | **sim** (l.563–578, 587–589, 594–595) | — | mas a abertura do item 7 ficou **falsa**: l.524 "**P1–P6**, inline" · l.525 "seguem **as seis normas** abaixo" (F1) → **S-01** |
| `AGENTS.md` §C7.7 | 12 | **sim** (hunks idênticos) | — | idem l.552–553 → **S-01** |
| `PROTOCOLO-JUNTA-RESILIENTE.md` | 10 | **sim** (§P7 l.80–107, modelo l.117–119, orquestrador l.127–128) | — | cabeçalho l.3 "Norma permanente para **TODA junta, inspeção de terreno e porteiro**" e l.6–7 "muda **como o trabalho sobrevive à morte** de quem o fez" — P7 alcança "**cada agente vivo**" e diz "**não é morte**" → **S-02** |
| `.agents/agents/README.md` l.69–72 | 2 | **NÃO** | **SIM** | "**Resiliência de junta (P1–P6** — §C7.7 do `AGENTS.md`, inline)" enumera P1–P6 e a emenda voto-esqueleto; é o que o Codex emulado lê como protocolo; regra do espelho ("alterou um, altera o outro no mesmo trabalho"); precedente **V-05 do #394** entrou no bloco → **S-03** |
| `.claude/agents/inspetor-de-terreno-da-junta.md` 5.1 (+ espelho) | 1 | não | **não** | item "plano de **perda** de jurado declarado"; P7 é do **mandato colado**, não do corpo (nenhum corpo carrega P1–P6); opcional **H4.1**: o briefing declara ao lado o "plano de pausa" — não é palavra do dono |
| `porteiro-pos-merge` · `planejador-mestre` · `critico-adversarial` · `validador-mestre` · `agente-fabrica` | 0 | — | **não** | não carregam P1–P6 (C3); o modelo é colado no disparo (`[P7]` já está nele) |
| `especialistas/jurado-semteto-c{1,2,3}-*` (2 espelhos) | 4 cada | não | **não** | l.155–159 = modelo P1–P4 **embutido**; identidades que **já votaram** (#394, `J-B-GOV-SEM-TETO.md:21–23`) → inertes. **Nota:** não constam do `OBITUARIO-IDENTIDADES.md` (`grep -c semteto` = **0**, K2) → pendência pré-existente (§9) |
| `EXECUTION_MODEL.md` · `comando-template.md` (raiz e handoff) | 0 | — | **não** | nunca carregaram P1–P6 (F6 = 0 nos quatro) |
| skills (`ts-frontend-full`) | 1 | — | **não** | falso positivo: "resiliente" na `description` (F5) |
| `Kpis/*` (7+4+1+1) · `tests/*.ts` (18) | — | — | **não** | notas de history (registro) e falso positivo de regex em testes |
| `votos/B-GOV-PAUSA/00-mandatos/planejador.md` l.94 | — | **sim, improvisado** | — | o orquestrador já aplicou P7 a este planejador: "grava a secao PAUSA **no plano**" — o destino teve de ser inventado porque o texto só nomeia o arquivo de evidência → **S-04** |

**Conclusão de completude:** dos **quatro** lugares vivos que carregam o protocolo (dois contratos, PROTOCOLO, README Codex), P7 chegou a **três**; o README Codex ficou de fora (S-03); e nos três em que chegou, a frase de abertura ficou desatualizada ou estreita (S-01, S-02). **Nenhum outro lugar precisa de P7** — corpos, companheiros, skills e scripts não carregam P1–P6, e `pausa` não aparece em corpo nem skill (F8 = 0).

## 5. Coerência de P7 com queda, suplente e parada

Regras vivas cotejadas (E1–E4, I1–I5): P1–P6 (`CLAUDE.md:532–579`, PROTOCOLO §P1–P6 l.9–78), modelo de mandato, item do orquestrador, §C7.5 paradas irredutíveis (`CLAUDE.md:460`), §C7.6-bis escada de modelo (`:476–522`; "trabalho em voo registrado onde está" `:494–495`), §C7.1-bis/inspetor 5.1 (plano de perda de jurado), §C7.4-bis (identidade nova por ciclo). **Eu não corrijo; nomeio o achado, o escopo com evidência e o que a C2 mede.**

| # | onde (head) | achado | escopo (evidência) | o que a C2 mede |
|---|---|---|---|---|
| S-01 | `CLAUDE.md:524–525` · `AGENTS.md:552–553` | "P1–**P6**, inline" / "as **seis** normas abaixo" — com P7 há sete | **dentro-do-bloco** (as linhas antecedem o PR — `f895dd25` 2026-09-02 — mas é o PR que as torna falsas; classe idêntica a **V-01 do #394**, que entrou no bloco) | `grep -n -E 'P1–P6|seis normas' CLAUDE.md AGENTS.md` = 0 após emenda; espelho md5 EOL-neutro do item 7 inteiro |
| S-02 | PROTOCOLO:3 ("TODA junta, inspeção de terreno e porteiro") · :6–7 ("sobrevive à **morte**") · `CLAUDE.md:525` ("Toda junta, inspeção de terreno e porteiro seguem") | o escopo declarado do protocolo é **mais estreito** que o de P7 ("cada agente vivo": dev, planejador, fábrica, vigias) e o enunciado de propósito ("morte") exclui o que P7 diz ("não é morte") | **dentro-do-bloco** (mesma lógica de S-01) | a frase de escopo cobre os sujeitos de P7? propriedade, não forma |
| S-03 | `.agents/agents/README.md:69–72` | lado Codex sem P7 (§4) | **dentro-do-bloco** pela regra do espelho; precedente V-05 (#394) | `grep -c 'P7' .agents/agents/README.md` ≥ 1 e a frase descreve o mesmo comportamento |
| S-04 | `CLAUDE.md:566` · PROTOCOLO:85 · decisoes:2833 ("no seu arquivo de evidência") · modelo l.587 (`<cadeira>-evidencia.md`) | **destino indefinido** para agente **sem** arquivo de evidência (dev, planejador, fábrica — o inspetor e o porteiro têm parecer `.md` por P2). Este mandato improvisou "no plano" (l.94) | **dentro-do-bloco** (nasce com o texto) — peça de mecanismo **M-01** | o texto emendado nomeia o destino por papel, ou declara a regra geral ("o artefato principal do papel")? sem desenhar: a C2 mede se há destino para cada sujeito que P7 nomeia |
| S-05 | `CLAUDE.md:570` ("no **custo/trilha**") · PROTOCOLO:92 ("no arquivo de custo/trilha") | artefato **sem caminho nem convenção**: `git grep -i 'custo/trilha\|trilha de custo\|arquivo de custo'` = **0** fora dos 5 (H4) | **dentro-do-bloco** — **M-02**; mesma classe da pergunta (d) do #394 (norma citando artefato ausente da ref), que o dev reescreveu | o roteiro de retomada tem destino que **existe na ref**? |
| S-06 | `CLAUDE.md:570,594` ("vigias") | termo sem definição no contrato; existe por uso em `terreno:89` (pré-existente) | `nota` | — |
| S-07 | `CLAUDE.md:570–571`/`AGENTS`/decisoes:2836 `(rodada de mutação, CI)` · PROTOCOLO:93 `rodada de mutação, CI, cluster descartável` · terreno:94 `(E4, CI)` | **três listas** para "jobs sem modelo"; "E4" é nome de fase do #393, não categoria | **dentro-do-bloco**, `ajuste` (o PROTOCOLO é "a fonte; em divergência, ela vale" — os outros se subordinam) | as listas são exemplos coerentes com a fonte? |
| S-08 | `CLAUDE.md:576`/PROTOCOLO:102/decisoes:2847 "**~20–40 min**" · terreno:95 "**~30 min**" · decisoes:2845 "06:4x" | o mesmo fato com dois números; hora sem fonte (T-14 `[não-verif]`) | `nota` | — |
| S-09 | `CLAUDE.md:594–595` × PROTOCOLO:127–128 | o item "Do orquestrador" do contrato **omite** "declara quais jobs sem modelo ficam vivos", que a fonte e o próprio bullet P7 (`:571–572`) trazem | `nota` (assimetria, não contradição) | — |
| S-10 | `CLAUDE.md:494–495` (§C7.6-bis) | a parada por Opus esgotado já manda "registrar o trabalho em voo **onde está** (evidência P1, votos parciais, head medido)"; P7 dá **forma** (`## PAUSA`) ao mesmo ato; as duas regras **não se citam** | `nota` — coerentes (nenhuma nega a outra); ligar as duas é elaboração, não palavra do dono | — |
| S-11 | `CLAUDE.md:564` · PROTOCOLO:82 (T-02: `"pare"`) | "pare" é o verbo de **PARADA** no §C7.5 ("paradas imediatas irredutíveis") e no §C7.6-bis ("**PARA.** Não se desce mais um degrau"); lido como **pausa** (retomável, mesma identidade) produz comportamento diferente de parada (registro + aviso ao dono) | **dentro-do-bloco**, `ajuste` | existe regra viva que dê a "pare" sentido de parada? (`grep -n -i '\bpare\b\|PARA\.' CLAUDE.md`) |
| S-12 | P3 (`:545`) × P7 (`:572`) | P3: "sucessor tem **identidade nova**"; P7: "a **mesma identidade** nasce" — não contradizem (P3 = perda; P7 = pausa) e o texto declara o empréstimo ("P3 aplicada a um corte limpo"); §C7.4-bis identidade nova é por **ciclo de reprovação**, não por retomada | coerente | — |
| S-13 | §C7.5 (`:460`) · inspetor 5.1 | P7 não cria parada; é pausa. Inspetor exige "plano de **perda**", não "de pausa" — `[P7]` no modelo cobre | coerente (H4.1 opcional) | — |
| S-14 | P6 (`:555–558`) | pausa **não é queda** → não entra em `00-quedas.md`; o registro da pausa é "o roteiro de retomada" — cujo destino é S-05 | coerente com P6; incompleto por S-05 | — |

**Veredito do plano sobre coerência:** P7 **não contradiz** P1–P6, §C7.5 nem §C7.6-bis. O que falha é (i) três frases de abertura que P7 tornou falsas ou estreitas (S-01, S-02); (ii) o lado Codex (S-03); (iii) duas peças de mecanismo sem destino na ref (S-04, S-05); (iv) uma ambiguidade de vocabulário com as paradas (S-11); (v) consistência interna (S-07, S-08, S-09). **Escopo:** S-01…S-05, S-07, S-11 → **entram** (dentro-do-bloco, evidência na tabela); S-06, S-08…S-10, S-12…S-14 → `nota`, não entram; OBITUARIO dos semteto (§4) → **pré-existente** (28/09, `J-B-GOV-SEM-TETO.md`), pendência com dono.

## 6. KPI — decisão pelo precedente medido

**O que o ramo diz:** o commit `3b00cae9` (A9) e o corpo do PR (A10) afirmam "`Kpis/*` intocados: registro de decisão do dono **sem bloco**, precedente **#396**". `git diff --name-only origin/main HEAD -- Kpis | wc -l` = **0** (D4). **A frase do commit não é regra; o contrato e o precedente medido são.**

**Precedente medido na main (L4, L5, L6, D2, D3):**

| PR | muda contrato (`CLAUDE.md`/`AGENTS.md`)? | ID de bloco? | junta registrada? | KPI |
|---|---|---|---|---|
| **#394** `B-GOV-SEM-TETO` (`b3f0af5f`) | **sim** | sim | sim (`J-B-GOV-SEM-TETO.md`) | **contou bloco**: `blocks_completed` 167→168; trilhas carregadas com nota; entrada `## 2026-09-28 — B-GOV-SEM-TETO (PR #394, na autoria)` |
| #395 (`3b1fe0f9`) | não (`git show --stat -- CLAUDE.md AGENTS.md` vazio) | não | não | só **backfill** do #394 |
| #396 (`5b6e1036`) | **não** (idem) | não | não (`git grep -l '#396' -- omega/juntas` = vazio) | **não tocou** (registro: decisões portadas, terreno, DEMO-UX) |
| **#397** `B-GOV-PAUSA` (`c9eda7bb`) | **sim** (+22/+22) | **sim** (`votos/B-GOV-PAUSA/`, mandato versionado) | **prometida** (PR: "Junta: maioria de 3") | — |

O #397 tem as **três** propriedades do #394 e **nenhuma** das do #396. O precedente citado pelo commit é o **errado**. Regra: §C3.1 ("todo PR que altere código, teste ou **escopo**" — e este altera o contrato que governa todos os blocos), §C3.5 (campos por PR corrente), §C3.3 (trilhas não tocadas carregam com nota).

**Decisão: SIM — o bloco atualiza `Kpis/*` no próprio PR (E3).** Conteúdo, para o dev:
1. `Kpis/kpis-latest.json`: `release.block` descreve `B-GOV-PAUSA` (governança; não fecha item do §4.1 do `PLANO_SAN3.md`); `release.pr 397`; `release.merge_commit`/`release.approved_head` **`null` na autoria** (§C3.5); `release.status "published_per_pr"`; `metrics.blocks_completed` **168 → 169**, **recontado no pré-merge** a partir do que a `origin/main` publicar (se o #393 mergear antes e publicar 169, aqui é 170 — precedente `backfill_note` do #394); `backend_tests 3052`, `frontend_smoke_tests 1202`, `flutter_tests 864` **carregados com nota** (§C3.3; valores de `metrics`, L7); `mvp_demo 99` / `mvp_vendavel 88` **intocados** (§C3.4).
2. `Kpis/kpis-history.json`: **append** (`n` 164 → 165) com `version "B-GOV-PAUSA"`, `pr 397`, `merge_commit null`, `approved_head null`, as três trilhas carregadas, `blocks_completed 169`, `description` e `backfill_note` dizendo que as trilhas são carregadas e que o número se reconta se o #393 mergear antes.
3. `Kpis/kpis-history.md`: entrada `## 2026-10-01 — B-GOV-PAUSA (PR #397, na autoria) — …` no formato das três últimas (L3).
4. `Kpis/app.js` **só** via `node scripts/kpi-freeze.mjs` (`--check` existe: L3). Painel: o PR **não inaugura dimensão** → sem gráfico novo (§C3.1.0).
5. **Backfill §C3.5: nenhum devido.** A última entrada da main (#394) já tem `merge_commit b3f0af5f…` e `approved_head 7ad08690…` (pagos pelo #395 — D2, G3). Prova: `node -e "const h=require('./Kpis/kpis-history.json');const e=h.at(-1);console.log(e.pr,e.merge_commit,e.approved_head)"` → `394 b3f0af5f… 7ad08690…`.

**Hipóteses:**
- **H6.1** Após E3, o ramo passa a conflitar com o #393 em `Kpis/*` (hoje `merge-tree` limpo, 0.12; o #393 também publica KPI) — confirma/derruba: `git merge-tree --write-tree --name-only <head-pós-E3> origin/chore/mandato-refs-e-preflight`. Quem mergear segundo **reconta**; não é defeito do #397.
- **H6.2** Os guards passam após E3 — derruba: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts` (com `npm ci` próprio) e `node scripts/kpi-freeze.mjs --check` com `ec≠0`.

## 7. Contrato, modelagem e arquivos tocados

**Contrato (o que a entrega tem de satisfazer):** (i) o texto operante diz **o que o dono decidiu**; onde o transcritor acrescentou, o acréscimo está declarado ou a junta o aceita como derivação fiel (C1, §3); (ii) **nenhuma regra viva** remanescente nega ou estreita P7 — S-01, S-02 (C2); (iii) **espelho completo** nos dois lados, inclusive o README Codex — S-03 (C2); (iv) as **peças de mecanismo** que P7 nomeia existem na ref ou estão declaradas com dono — S-04, S-05 (C2); (v) o vocabulário de pausa **não colide** com o de parada — S-11 (C2); (vi) consistência interna — S-07 (C2); (vii) **KPI por PR** (§C3) — §6 (C3); (viii) **registro** do bloco — E4 (C3).

**Modelagem:** não há (documental). Sem migration. Rollback = `git revert` do squash.

**Entregas (o head `c9eda7bb` entrega só a E1):**
- **E1 — o texto** nos cinco arquivos. **Entregue.**
- **E2a — contrato consistente** (`dentro-do-bloco`): `CLAUDE.md:524–525` e `AGENTS.md:552–553` (S-01); a frase de escopo `CLAUDE.md:525`/`AGENTS.md:553` (S-02); e, se o voto confirmar, S-11 ("pare") e S-07 (lista) nos dois contratos — **mesmo commit** nos dois. O **conteúdo** é do dev, à luz do voto; a **propriedade**: "a abertura do item 7 e o escopo declarado descrevem P1–P7 e os sujeitos de P7". **Não entregue.**
- **E2b — fonte e espelho Codex:** `PROTOCOLO-JUNTA-RESILIENTE.md:3,6–7` (S-02); `.agents/agents/README.md:69–72` (S-03); S-07 (listas) e S-04/S-05 na fonte e no contrato — propriedades: "**todo sujeito** que P7 nomeia tem **destino** nomeado na ref" e "o roteiro de retomada tem destino que **existe** na ref" (sem desenhar aqui; o dev escreve, a C2 mede). **Não entregue.**
- **E2c — pendências com dono** (`agent-orchestration/controle/pendencias.md`; índice **pelo gerador** `agent-orchestration/controle/gerar-indice-pendencias.py`, nunca à mão): `P-GOV-OBITUARIO-SEMTETO` (pré-existente: os 3 votantes do #394 não estão no `OBITUARIO-IDENTIDADES.md`; dono: o próximo bloco de registro, ou este se o orquestrador decidir pagar — declarado na ata) · `P-GOV-PAUSA-ESCADA-C76BIS` (nota S-10: ligar a parada por Opus esgotado à forma `## PAUSA` — elaboração futura, não palavra do dono). **Não entregue.**
- **E3 — KPI** (§6). **Não entregue.**
- **E4 — registro:** este plano; `BRIEFING-B-GOV-PAUSA.md`; **3 corpos** das cadeiras versionados nos **dois** espelhos antes do inspetor; `J-B-GOV-PAUSA.md` (orquestrador, após o voto) com `- **Objeto julgado:**` e, se aprovado, `- **approved_head:**` (formato de `J-B-GOV-SEM-TETO.md:3,6`); `votos/B-GOV-PAUSA/*`; `status-geral.md` (hoje `grep -c B-GOV-PAUSA` = 0, K6); parágrafo **datado** na entrada `D-PAUSA-GRAVA-E-PARA` de `decisoes.md` registrando E2 (§A2: o que mudou além de E1 e por quê). Não há `codex/comandos/B-GOV-PAUSA.md` (K7; o #394 também não teve) — **este plano é o comando do bloco**.

**Consequência declarada:** submeter `c9eda7bb` como está é submeter E1 sem E2/E3 — as cadeiras julgam a lacuna com esta evidência. **Recomendo emendar antes do inspetor** (o head anda; o §0 é re-medido por ele). **Sob qual regra este bloco é julgado:** a da `main` — `D-SEM-TETO-AUDITORIA-NO-3` (sem teto por contagem; reprovação abre ciclo seguinte com papéis recompostos; auditoria da máquina se o ciclo 3 reprovar).

**Arquivos tocados:**

| arquivo | entrega | quem | prova |
|---|---|---|---|
| `CLAUDE.md` (l.524–525 · 563–578 · 587–589 · 594–595) | E1 · E2a | dev | md5 EOL-neutro do item 7 inteiro × `AGENTS.md` |
| `AGENTS.md` (l.552–553 · 591–606 · 615–617 · 622–623) | E1 · E2a | dev | idem; `diff` dos dois `git diff -U0` = vazio |
| `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` (l.3, 6–7 · 80–107 · 117–119 · 127–128) | E1 · E2b | dev | modelo de mandato idêntico nos 3 (I1) |
| `.agents/agents/README.md` (l.69–72) | E2b | dev | `grep -c P7` ≥ 1 |
| `agent-orchestration/controle/decisoes.md` (l.2825–2851 + parágrafo datado) | E1 · E4 | dev | `grep -c '^## D-PAUSA-GRAVA-E-PARA'` = 1 |
| `agent-orchestration/docs/conhecimento-de-terreno.md` (l.91–96) | E1 (· E2b se S-07/S-08) | dev | — |
| `agent-orchestration/controle/pendencias.md` · `pendencias-indice.md` | E2c | dev | índice pelo gerador; 2 cabeçalhos novos |
| `Kpis/kpis-latest.json` · `kpis-history.json` · `kpis-history.md` · `app.js` | E3 | dev | §8 bateria 8–10 |
| `docs/revisoes/SAN3/B-GOV-PAUSA-plano.md` · `omega/juntas/BRIEFING-B-GOV-PAUSA.md` | E4 | planejador (eu) | existem no ramo |
| `.claude/agents/especialistas/<c1,c2,c3>.md` + `.agents/agents/especialistas/<…>.md` | E4 | fábrica escreve, **orquestrador versiona** (`git add -f` nos dois; o ignore global cobre ambos) | `git ls-tree <head>` lista 6; `sync --check` ec=0 |
| `omega/juntas/J-B-GOV-PAUSA.md` · `votos/B-GOV-PAUSA/**` · `docs/status-geral.md` | E4 | orquestrador · cadeiras | ata com `Objeto julgado` |

**Escopo (§C4) — PERMITIDO:** exatamente os arquivos da tabela. **PROIBIDO:** `src/**` · `tests/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` · `infra/**` · `.env*` · lockfiles · `scripts/**` (inclusive **importar** `mandato-refs.sh`/`mandato-preflight.sh` do #393) · `docs/omega-pd.md` · `Kpis/index.html` · `Kpis/styles.css` · `Kpis/README.md` · `EXECUTION_MODEL.md` · `comando-template.md` · **qualquer corpo de agente além dos 3 novos** (inclusive o inspetor — P7 não entra em corpo, §4) · `J-*`/`R-*`/`BRIEFING-*`/votos de **outro** bloco (#393, #394) · texto novo em P7 além do que o voto pedir · os worktrees alheios de 0.14 (`w-devt4` é o traço físico do caso — **reporta, não toca**).

## 8. Papéis, junta, inelegíveis e baseline

- **Quórum: MAIORIA DE 3**, sem veto individual, **sem `critico-adversarial`** (não é bloco de invariante). §C7.1-ter(b) literal: unanimidade só se tocar dinheiro, segurança, permissão ou perda de dado — `git diff --name-only origin/main HEAD -- src prisma frontend mobile .github tests scripts infra Kpis` = **0** (0.7). Se o orquestrador discordar, sobe para unanimidade **antes** do inspetor — quórum não muda em voo.
- **Papéis (§C7.4-bis), por nome:**

| papel | quem | o que faz / não faz |
|---|---|---|
| autor do texto | **o orquestrador** | parte interessada: **não emenda, não vota, não escreve corpo de jurado** |
| plano + briefing | `planejador-b-gov-pausa` (eu; Fable 5.1; corpo `4c912f69…`) | mede e nomeia; **não emenda, não vota** |
| emenda E2/E3/E4-registro | **dev de identidade nova** — nome sugerido `dev-pausa-emenda` (precedente `dev-semteto-emenda`, Opus 5.5, `J-B-GOV-SEM-TETO.md:99`) | implementa a **propriedade** de cada S-*, não a redação deste plano; **não julga** a validade do achado |
| corpos das 3 cadeiras | `agente-fabrica` escreve; **o orquestrador versiona** nos dois espelhos (`git add -f`; `sync --check` **antes** do inspetor) | a fábrica cola o modelo de mandato **com a linha `[P7]`** — primeiro uso real de P7 |
| gates | `inspetor-de-terreno-da-junta` antes · `porteiro-pos-merge` depois (Fable; Opus só com substituição declarada; abaixo, para) | — |

- **Três cadeiras, identidades NOVAS** (nomes sugeridos; o orquestrador confirma ao versionar; os 3 corpos `semteto` são **modelo de competência**, não cadeiras):

| cadeira | competência | pergunta única |
|---|---|---|
| **C1 `jurado-pausa-c1-fidelidade-transcricao`** | texto × decisão do dono | T-01…T-17 (§3) **uma a uma**, mais o que E2 acrescentar: derivação fiel de W1–W5, ou o transcritor legislou? `bloqueia` só onde a elaboração **muda o que o dono decidiu** |
| **C2 `jurado-pausa-c2-consistencia-normativa-espelho`** | regras vivas, espelho, mecanismo | lista **própria** gerada (comando do §4) cruzada com S-01…S-14 nos dois sentidos; modelo de mandato idêntico nos 3; md5 EOL-neutro do item 7 nos dois contratos; README Codex; destino de cada sujeito de P7 e do roteiro de retomada **existe na ref**? |
| **C3 `jurado-pausa-c3-escopo-registro-kpi`** | §C4, §C3, §C5, ata, terreno | diff = exatamente o §7 **por laço** (`git diff --name-only`); E3 conforme §6 com N e forma; 6 corpos no head; `sync --check`; pendências pelo gerador; check-runs no head; H6.1 re-medido |

- **Votam JUNTAS, nunca 2+1.** Cada cadeira **resolve o head por si** (`git rev-parse origin/docs/gov-pausa-grava-e-para` × `gh pr view 397 --json headRefOid`) e declara no voto o modelo e o md5 EOL-neutro do corpo aplicado.
- **Inelegíveis, por nome** (inspetor 3.1/3.1-bis contra `OBITUARIO-IDENTIDADES.md` **e as atas**): o **orquestrador**; `planejador-b-gov-pausa`; `dev-pausa-emenda` (ou o nome que receber); `agente-fabrica`; os votantes do #394 — `jurado-semteto-c1-fidelidade-transcricao`, `jurado-semteto-c2-consistencia-normativa`, `jurado-semteto-c3-escopo-registro` (`J-B-GOV-SEM-TETO.md:21–23`; **não estão no OBITUARIO**, K2 = 0 — o inspetor confere **pela ata**) — e `dev-semteto-emenda`; as **50** linhas do OBITUARIO. **Por interesse (recomendação; o inspetor decide):** quem ocupou papel no ciclo 4 do #393 (o Dev-T4 é o caso narrado em T-14).
- **Baseline N de testes do bloco: N = 0** (sem código nem teste); meta **M ≥ 2N = 0** por construção. Executáveis: `git diff --check` (ec=0 hoje) · `sync --check` (26 OK hoje) · `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · 3 guards de KPI após E3 (`npm ci` **próprio**; referência **herdada** 17/17 · 6/6 · 6/6 — a re-verificar) · check-runs **14/14** no head (0.11).
- **Isolamento (inspetor 1.2), por escrito:** cadeiras **somente-leitura** — escrevem **apenas** `votos/B-GOV-PAUSA/<cadeira>-evidencia.md` e `<cadeira>-voto.json`. Leitura por `MSYS_NO_PATHCONV=1 git show <head>:<caminho>` (prefixo **por comando**, nunca exportado) ou **worktree próprio** em caminho curto (`git worktree add --detach C:/Users/AMP/w-jur-<id> <head>`), removido **só** por `git worktree remove --force`; **sem junction**; **sem banco** (`erp-postgres` 5432 / `erp-redis` 6379 nunca alvo); sem Docker; `timeout` no que executa; **nunca `tail -f`**. Resíduo alheio (0.14) **se reporta, não se varre**.
- **Perda de jurado — e PAUSA (inspetor 5.1; P1–P3; P7):** queda por infra **relança a MESMA identidade**; voto perdido **nunca** conta como aprovação; a junta **não fecha com menos de 3 votos de mérito**; sem suplente. **Esta é a primeira junta sob P7:** se o dono mandar pausar, o orquestrador repassa `PAUSA`; cada cadeira grava `## PAUSA <hora UTC>` na sua `-evidencia.md` e para sozinha; a retomada é pela **mesma identidade, do mesmo mandato**; a ata registra o que foi **re-executado** vs **medido de novo**.
- **Regra de voto:** `gravidade` (`bloqueia`/`ajuste`/`nota`) **e** `escopo` (`dentro-do-bloco`/`pre-existente` **com evidência**; sem evidência = `dentro-do-bloco`). **"Não consigo medir" = REPROVADO.** **Nenhuma cadeira propõe correção.** Afirmações deste plano, do briefing e da fábrica são **hipóteses**.
- **§C7.4-bis, por escrito (ciclo 1, preventivo):** (a) composição cobre a competência? **sim** — fidelidade · norma/espelho/mecanismo · escopo/registro/KPI; (b) quem achou consertou? **não se aplica ainda** — se reprovar, o dev do ciclo 2 é identidade nova e **não** o orquestrador; (c) dado podre? **tudo medido** em §0/§3/§4/§5/§6 ou marcado `[não-verif]`/hipótese (T-14; H0.3; H6.1).
- **Bateria de validação (§9 do contrato), forma declarada:** cwd = worktree da cadeira; `ec` por variável, nunca por pipe; `HEAD` = o head que a ata nomear.
  1. `git status --porcelain` → vazio · `git rev-parse HEAD` = head da ata.
  2. `git diff --check origin/main...HEAD` → ec=0.
  3. `node scripts/sync-agent-agents.mjs --check` → ec=0, **29** agentes (26 + 3 corpos) — publicar N.
  4. **Espelho:** item 7 inteiro (`^7\. \*\*Protocolo de junta resiliente` até a linha anterior a `^---`) com md5 EOL-neutro **igual** em `CLAUDE.md` e `AGENTS.md`; `diff` dos dois `git diff -U0` = vazio; modelo de mandato idêntico nos 3 (comando I1).
  5. **Marcadores:** `grep -c 'D-PAUSA-GRAVA-E-PARA' CLAUDE.md AGENTS.md decisoes.md PROTOCOLO` ≥ 1 cada; `grep -c 'P7' .agents/agents/README.md` ≥ 1. **Negativo pela propriedade (após E2):** `grep -n -E 'P1–P6, inline|seis normas' CLAUDE.md AGENTS.md` → 0; `git grep -i 'custo/trilha' HEAD -- CLAUDE.md AGENTS.md PROTOCOLO` → 0 **ou** o artefato existe na ref.
  6. **CRLF-neutro:** por arquivo tocado, `tr -d '\r' < f | md5sum` = `git show HEAD:f | tr -d '\r' | md5sum`.
  7. **Check-runs** (inspetor 4.3): `gh api …/commits/<head>/check-runs` → `N 0 0` com N > 0.
  8. `node --check Kpis/app.js` → ec=0 · `node scripts/kpi-freeze.mjs --check` → ec=0 · `node -e "require('./Kpis/kpis-latest.json');require('./Kpis/kpis-history.json')"` → ec=0.
  9. Guards: `node --test --import tsx tests/kpi-dashboard-charts.test.ts tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts` → pass/fail **com N**.
  10. `blocks_completed` contra a `origin/main` **de agora**; `pr 397`; `merge_commit`/`approved_head` `null`; história `n` = anterior + 1.
  11. Pendências: `python agent-orchestration/controle/gerar-indice-pendencias.py` regenera sem diff residual.
  12. Conflito (informativo): `git merge-tree --write-tree --name-only HEAD origin/chore/mandato-refs-e-preflight` — declara, não resolve.

## 9. Riscos, rollback e pendências

| risco | mitigação / rollback |
|---|---|
| A junta reprova E1 por elaboração (T-*) → ciclo 2 | dev novo no ciclo 2 (não o orquestrador); plano novo em **Fable obrigatório** (§C7.6); sem teto por contagem (`D-SEM-TETO-AUDITORIA-NO-3`); o orquestrador relata se a classe se repetiu sem informação nova |
| O head é submetido **sem E2/E3** e a junta reprova por lacuna que este plano já mediu | §7: recomendação escrita de emendar **antes** do inspetor; a escolha fica na ata |
| S-04/S-05 viram **desenho de mecanismo** pelo dev (classe "remédio nasce com a doença") | o dev entrega a **propriedade** (destino existe na ref), mínima; a C1 julga o que for acréscimo como elaboração **nova** e a entrada de `decisoes.md` o declara como do transcritor/dev, não do dono |
| "pare" (S-11) é corrigido de um lado só (contrato × fonte) | espelho medido pelo item 7 inteiro + modelo nos 3 (bateria 4) |
| Colisão de KPI com o #393 (H6.1) | hoje `merge-tree` limpo (0.12); quem mergear segundo reconta (precedente `backfill_note` do #394); não é defeito do #397 |
| `gov-descuido` (0.13) conflita em 13 arquivos **com a main** | não é deste bloco; **reportado** para o orquestrador decidir a ordem — cobrar aqui é reprovação por construção |
| Corpos das cadeiras não versionados → inspetor **BLOQUEADO** (2× em 2026-09-20) | `git add -f` nos dois espelhos + `sync --check` **antes** do inspetor; `git ls-tree <head>` lista 6 |
| CRLF lido como mutação viva | 0.9: comandos EOL-neutros no briefing |
| `w-devt4` (traço físico de T-14) é removido antes de a C1 medir | a C1 mede **primeiro** (somente leitura: `git -C C:/Users/AMP/w-devt4 status --porcelain`); se já não existir, T-14 fica `[não-verif]` integral — **não** é defeito do texto |
| Fable esgotado no meio da junta | Opus **com substituição declarada** na evidência e na ata; Opus esgotado → **para** e registra onde está (§C7.6-bis) — e, agora, pela forma de P7 |
| Rollback | `git revert` do squash; só texto/KPI/registro mudam; as pendências E2c ficam (são verdadeiras com ou sem o PR) |

**Pendências nomeadas por este plano (E2c):** `P-GOV-OBITUARIO-SEMTETO` (pré-existente, 28/09; dono: bloco de registro ou este, por decisão na ata) · `P-GOV-PAUSA-ESCADA-C76BIS` (nota S-10; dono: bloco de governança futuro). **Reportado, sem pendência:** conflito `gov-descuido` × main (0.13); H6.1.

## 10. Limpeza

**Executado (comando → saída):** `git -C C:/Users/AMP/w-pl397 status --porcelain | wc -l` → **0** · `git worktree remove --force C:/Users/AMP/w-pl397; echo ec=$?` → **ec=0** · `git worktree prune` · `ls -d C:/Users/AMP/w-pl397` → *No such file or directory*. Temporários **próprios** apagados do scratchpad e de `$TEMP` (`sec0–9.md`, `brfA–D.md`, `splice.py`, `diff-397.txt`, `mm-*.txt`, `mt*.txt`). **Nada rastreado tocado; nada versionado nem empurrado.** `git -C C:/Users/AMP/w-pausa status --porcelain` → só os dois arquivos novos deste plano. **Resíduo alheio intacto e reportado** (§0.14): `w-devs393`, `w-devt393`, `w-devt4` (traço físico de T-14), `w-mandato`, `w-pv397`, `.claude/worktrees/{b04a,b11,gov-descuido}`; o scratchpad da sessão tem ~1,7 mil entradas de outros processos — **não varridas**.

**Uma linha:** limpeza — worktree `w-pl397` removido pelo nome; 15 temporários próprios apagados; nada rastreado tocado.

## 11. A linha

O head `c9eda7bb` transcreve **cinco proposições do dono** em **dezessete elaborações** (nenhuma declarada como do transcritor — tudo sob "Decisão."); leva P7 a **três dos quatro** lugares vivos que carregam o protocolo e deixa o **README Codex** de fora; nos três em que chega, a abertura do item 7 e o escopo da fonte ficam dizendo "**seis** normas", "**P1–P6**" e "**só junta, inspeção e porteiro**"; nomeia **dois destinos que não existem na ref** (o arquivo de evidência de quem não tem um; o "custo/trilha"); usa "**pare**" como ordem de pausa onde o contrato o usa para **parada**; conta o mesmo caso com dois números; e **não traz KPI** por citar o precedente errado (#396 — registro sem contrato, sem ID, sem junta — quando o #394 é o precedente de mesma natureza e contou bloco). **Decisões deste plano:** E2a/E2b entram (S-01…S-05, S-07, S-11 — dentro-do-bloco com evidência); S-06, S-08…S-10, S-12…S-14 são nota; OBITUARIO dos `semteto` é pendência pré-existente; **KPI sim** (168→169, recontado); **maioria de 3** sem crítico; emendar **antes** do inspetor. Nada disso diz que o texto é ruim — é um texto fiel ao espírito de W1–W5 com lacunas de mecanismo e de espelho — diz **o que a junta tem de medir** e o que o transcritor, parte interessada, não podia atestar sozinho.
