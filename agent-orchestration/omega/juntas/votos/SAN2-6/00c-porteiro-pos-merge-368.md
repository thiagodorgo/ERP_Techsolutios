# Parecer do porteiro-pos-merge — PR #368 (SAN2-6)

- **Papel:** porteiro-pos-merge (Fable por contrato, D-PORTEIRO-POS-MERGE)
- **Data:** 2026-09-02 (pós-merge do PR #368, squash `f895dd2`)
- **Estado:** FECHADO — LIBERADO COM RESSALVA

## G1 — Promessa × diff real; squash × head julgado

**G1.1 — merge íntegro.** `git fetch origin main` + `git log origin/main -3`: topo = `f895dd25f0d8cd5fb6b7c18373245e43f968fcd9` "docs(contrato): P1-P6 inline... (SAN2-6) (#368)", sobre `e6a6461` (#367). `gh pr view 368 --json state,mergeCommit,headRefOid,mergedAt` → `MERGED` · `mergeCommit f895dd2` · `headRefOid 9051e9b` · `mergedAt 2026-09-02T11:46:49Z`. **OK.**

**G1.2 — diff de código ZERO, medido.** `git diff-tree -r --name-status f895dd2^ f895dd2` → 29 caminhos, todos em `Kpis/`, `agent-orchestration/`, `CLAUDE.md`, `AGENTS.md`, `.agents/agents/README.md`. Filtro `grep -E 'src/|tests/|scripts/|prisma/|\.github/|frontend/|mobile/|\.claude/agents/|package(-lock)?\.json|pubspec'` → **ec=1 (zero match)**. **A promessa central (diff de código vazio) é verdadeira no squash.**

**G1.3 — árvore do squash = árvore do head julgado.** `git rev-parse f895dd2^{tree}` = `git rev-parse 9051e9b^{tree}` = `997a409db963d0b9b927049f494aadcc12320afa`. **Idênticas.** Nota de precisão: a ata (l.5) chama de "head julgado" o `d90fbbb` (head no momento do VOTO); `9051e9b` é o head FINAL, com o delta pós-voto declarado na ata (3 commits: `e545e64` votos → `85a9058` correções → `9051e9b` ata). O CI 7/7 e o squash são deste head final.

**G1.4 — corpo do PR × diff, por amostragem executada.**
- Cláusula do teto: `git show f895dd2:CLAUDE.md | grep -cF "Não há ciclo 6"` = **1**; idem `AGENTS.md` = **1**; `"última tentativa sob qualquer das duas regras"` = **1/1**. Confere com o corpo ("0/0 antes → 1/1").
- Paridade §C7.4→fim: extraí o bloco dos dois contratos do blob do merge, eol-neutro → **111 linhas de cada lado, diff = 0 linhas** (ec=0). A ata diz 110 — a diferença de 1 é fronteira da MINHA extração (âncoras diferentes das da C1), não divergência entre contratos. **Paridade real.**
- Comando do Codex: `git show f895dd2:agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md | wc -l` = **1301**. Plano B-O6R-07: **444**. Briefing: **162** (numstat). Conferem com o corpo e com a description corrigida.

**G1.5 — a correção C2-A1/C3-A1 está no merge E é verdadeira.**
- Presente: a `description` da entrada SAN2-6 em `Kpis/kpis-latest.json` (blob do merge) contém a seção "O HANDOFF DO CICLO 5 — E A CORREÇÃO QUE A JUNTA EXIGIU", inventariando o comando (1.301 l., "34,4% do PR") e o plano (444 l.), com a ressalva C3-A1 apensa ao item "(4) Nada do ciclo 5 em si".
- Verdadeira: reexecutei a aritmética. Base da medição das cadeiras = head do voto `d90fbbb`: `git diff --numstat e6a6461 d90fbbb` → **3.783 adicionadas** (reproduzido). 1301/3783 = **34,4%** ✓ · 2067/3783 = 54,6% ✓ · 1745/3783 = 46,1% ✓ · 1716/3783 = 45,4% ✓. No squash FINAL a soma é 6.904 adicionadas (inclui o próprio delta pós-voto); os percentuais publicados referem-se explicitamente à medição do achado, base 3.783 — internamente consistentes e reproduzidos.

**Veredito parcial G1: OK — sem achado bloqueante.** Observação menor (não-achado): a evidência da C2 fala "2.068 (54,7%)" e a description "2.067 (54,6%)" — divergência de 1 linha entre recortes de categoria das duas cadeiras, sem efeito.


## G2 — KPI, registros e rito da junta

**G2.1 — Bateria REEXECUTADA no conteúdo mergeado** (worktree descartável detached em `f895dd2`, criado sob o scratchpad com `-c core.longpaths=true`; 1ª tentativa sem a flag falhou com "Could not reset index file" e o git desfez sozinho — nada ficou para trás; `tsx` usado por caminho absoluto da árvore principal, sem junction/symlink):

| passo | resultado | ec |
|---|---|---|
| `node --check Kpis/app.js` | ok | **0** |
| `node scripts/kpi-freeze.mjs --check` | "em dia (snapshot 2026-09-01)" | **0** |
| `node --test --import tsx tests/kpi-dashboard-charts.test.ts` | **16 pass / 0 fail / 0 skip** | **0** |
| `node scripts/sync-agent-agents.mjs --check` | "23 agentes, espelho consistente" | **0** |
| `git diff --check` (worktree limpo em f895dd2) | limpo | **0** |

**G2.2 — §C3.5 deste PR: null confirmado, dívida nomeada.** `Kpis/kpis-latest.json` (blob do merge): top-level `version: "SAN2-6"`, `release.pr = null` · `release.merge_commit = null` · `release.approved_head = null` · `status: "published_per_pr"`. Entrada 151 do history idem. **DÍVIDA DO PRÓXIMO PR (backfill §C3.5 da entrada 151):** `pr 368` · `merge_commit f895dd2` · `approved_head` = ver ressalva R1 abaixo — **a ata nomeia `d90fbbb` (3 ocorrências) e NÃO nomeia `9051e9b` nem `85a9058` (0 ocorrências)**; o precedente provado pela C3 (3 de 3: #363/#364/#366) grava **o head da ata**. O head final `9051e9b` tem árvore idêntica ao squash e carrega o delta pós-voto que a ata declara em prosa mas não pina por hash. Quem fizer o backfill precisa registrar QUAL head e por quê, senão nasce a 7ª materialização da classe.

**G2.3 — Backfill do #367, reexecutado por amostragem.** `kpis-history.json` entrada 150 (de 151): `version SAN2-5 · pr 367 · merge_commit e6a6461 · approved_head 5256b49 · blocks_completed 156`. `head -8 agent-orchestration/omega/juntas/J-SAN2-5.md` → l.4: **"Head julgado: `5256b49`"** — o gravado segue a ata, não o `headRefOid 657928f`, exatamente como o precedente manda. Entrada 151: `blocks_completed 157` (156→157 pago). **OK.**

**G2.4 — Ata, votos, quedas.** `J-SAN2-6.md` no merge (176 l.): APROVADO 3×0, quórum maioria-de-3 justificado (§C7.1-ter(b), diff de código 0), tabela de achados com `gravidade` E `escopo` + evidência de origem nos `pre-existente`. Votos JSON × ata: C1 APROVADO 3 achados (3 nota) ✓ · C2 APROVADO 4 (1 alta, 1 baixa, 2 nota) ✓ · C3 APROVADO 4 (1 alta, 3 nota) ✓ — batem cadeira a cadeira com a tabela da ata. `00-quedas.md` presente (1 queda `rate_limit` 429, 0 voto perdido, classe nova fora do numerador da série P6). **§C7.4-bis respondido por escrito** na ata (a: composição coberta; b: quem achou não consertou — plano do orquestrador, dev de identidade nova; c: dado podre — 1 caso, pego e declarado). **Delta pós-voto DECLARADO** em seção própria, com papéis separados e o que foi corrigido × só-registrado. Incidentes de terreno declarados (head movido durante inspeção; Edit na árvore principal desfeito por edição inversa).

**G2.5 — Pendências por amostragem.** As duas novas existem em `pendencias.md` com dono: `P-ESPELHO-C7-3-MECANISMO-PESQUISADOR` (l.5382, BAIXA, pre-existente, dono = quem tocar o §C7.3 do espelho, com medição re-executada sobre `e545e64`) e `P-KPI-CARIMBO-MVP-DEFASADO-SAN2-5` (l.5426, BAIXA, pre-existente, **bloco dono: SAN2-5**, com medição blob-a-blob). **Índice × gerador: reexecutei `gerar-indice-pendencias.py` no worktree → diff VAZIO (byte-idêntico)**, placar 244 cabeçalhos / 235 IDs / ABERTA 194 / FECHADA 50 — bate com o que a ata declara (242→244, 233→235, 192→194).

**Veredito parcial G2: OK — com a ressalva R1 (qual head o backfill grava) nomeada em G2.2.**


## G3 — Limpeza §C5 e o start do próximo bloco

**G3.1 — CI no head final.** `gh pr checks 368` → **7/7 pass** (authority-portal · backend · backend-postgres · docker · flutter · frontend · owner-portal). **OK.**

**G3.2 — Worktree e branches.** `git worktree list` → `san2-r` **não está registrado** (sobram: árvore principal, `agent-af6ea…` [B-O6R-02], `gov-descuido`, e o meu `wt368` descartável, removido ao final deste parecer). `git branch --list "*san2*"` → **vazio** (local apagada). `git ls-remote --heads origin | grep -ci san2` → **0** (remota apagada — confere com o relato de que o `--delete-branch` abortou e a remota caiu em comando separado). **Achado menor (nota N1):** `.claude/worktrees/san2-r/` ainda existe em disco como **diretório VAZIO** (0 arquivos, 16K, sem `.git`, sem `node_modules`) — casca que o `git worktree remove --force` deixou para trás no Windows. Varrer é de quem entrega, não meu; custo zero de disco, risco zero.

**G3.3 — Sem sobra rastreada.** `git status --porcelain | grep -c '^ D'` → **0** (nenhum rastreado apagado). Untracked na árvore principal: os 3 ` M` fantasma (ver seção seguinte), `.claude/worktrees/` e o diretório deste parecer — nada fora do permitido. `.tmp-demo/` (do snapshot da sessão) já não existe.

**G3.4 — Disco medido.** `df -h /` → **24 GB livres** (238G total, 91% usado). Acima do limiar de ~10 GB — `DEEP_CLEAN=1` **não é obrigatório** agora.

**G3.5 — A pergunta que decide o start, medida pelo campo estruturado.** `grep -c '^\*\*Bloqueia' pendencias.md` (blob do merge, no worktree em `f895dd2`) → **13 campos estruturados**, todos nas entradas `P-O6R-B01..B11`, + **2** ocorrências `**BLOQUEIA**` em prosa (l.2742 dentro do B06; l.4388 em `P-GOV-MAIN-SEM-PROTECAO`). Mapa medido campo a campo (entrada dona + status):
- **FECHADAS:** B01 (fechada em 2026-08-18, B-O6R-01/#357 — dependência declarada como satisfeita também pela B04) · B05 (fechada #353).
- **ABERTAS (9 entradas, 10 campos):** B02 (financeiro — *feature nova* em financeiro) · B03 (despesas/RDV) · B04 (estoque) · B06 (cloud billing + trilha CHECKLIST P1) · B07 (2 campos: OS/aprovações/RBAC; auth+evidências/upload) · B08 (jobs/tempo real) · B09 (despacho/Mapa) · B10 (portal proprietário/web transversal) · B11 (app de campo).
- `P-GOV-MAIN-SEM-PROTECAO`: bloqueia "qualquer afirmação de que o merge é controlado" e diz **literalmente "Não bloqueia trabalho de produto"** — campo negado para start.
- `grep -niE 'bloqueia[^
]{0,80}(ciclo *-?5|O6R-07|O6R-02)'` → **zero**: nenhuma pendência nomeia o ciclo 5, o B-O6R-02 ou o B-O6R-07 como alvo bloqueado.

**Conclusão do G3.5:** o **ciclo 5 do B-O6R-02** é o bloco de correção que FECHA a `P-O6R-B02` (5 P0 + QUA-003) — o campo dela bloqueia *feature nova em financeiro*, e correção não é feature; nenhuma outra entrada alcança financeiro. O **B-O6R-07** é o bloco que FECHA a `P-O6R-B07` (SEC-002 P0 + SEC-003/004 P1) — os campos que cobrem auth/OS/evidências são os da própria B07 (a B01, que cobria auth, está FECHADA e a dependência "(depende do B01)" declarada no plano l.45 está satisfeita desde o #357); o plano l.18 mostra a trilha CHECKLIST P1 esperando o B-O6R-07 mergear, ou seja, o B07 é *destravador*, não travado. **NENHUMA pendência BLOQUEIA aberta alcança os dois próximos blocos.**
**Nota de contagem (N2):** minha medição dá **9 entradas abertas com campo não-negado (10 campos)**; o número "8" citado no mandato do orquestrador não reproduz sob nenhum recorte que testei (por entrada ou por campo) — provavelmente foi medido em outro momento da rodada. Não muda a decisão (0 alcançam os alvos), mas fica registrado com o head ao lado (`f895dd2`).


## Re-verificação das duas afirmações do orquestrador

**Afirmação 1 (premissa da R1 do inspetor era falsa) — CONFIRMADA no estado atual, por medição própria.** Na árvore principal (HEAD `d1fab3b`, branch `demo/investidor`, `core.filemode=false`, `core.autocrlf=true`), para cada um dos 3 arquivos (`.claude/agents/planejador-mestre.md`, `.claude/agents/porteiro-pos-merge.md`, `scripts/sync-agent-agents.mjs`): `git diff --numstat HEAD -- <arq>` → **vazio**, e **sha256 eol-neutro do worktree = sha256 eol-neutro do blob HEAD** (dac83d94… / f255d763… / 26e66d24…, iguais par a par). O ` M` do `git status` persiste **sem nenhum diff de conteúdo ou modo** — é a classe stat-cache/autocrlf que o próprio contrato documenta. **Limite honesto:** eu meço o estado DE HOJE, pós-merge; não posso re-medir o instante da inspeção. Mas no estado presente **não há mutação viva** nesses 3 arquivos, e nenhuma junta futura deve herdar "a árvore principal tem mutação viva do guard" como fato — se citar, que re-meça.

**Afirmação 2 (nenhum dano decorreu) — CONCORDO.** Medir de dentro do `san2-r` era correto de qualquer forma (o head julgado vivia lá); a precaução foi redundante, não danosa.


## Veredito

**Executado por mim (resumo):** fetch + log da `origin/main` · `gh pr view/checks 368` · `diff-tree` filtrado (código = ZERO) · árvores squash×head (idênticas) · amostragem do corpo do PR (teto 1/1+1/1, paridade C7 0-diff, 1301/444/162 linhas) · reprodução da base 3.783 em `d90fbbb` · bateria 5/5 `ec=0` em worktree descartável de `f895dd2` (charts 16/16) · campos §C3.5 (151 null ✓, 150 backfilled ✓ contra a ata J-SAN2-5 l.4) · votos×ata cadeira a cadeira · índice de pendências regenerado byte-idêntico (244/235/194) · pendências novas com dono · limpeza (0 branch san2, 0 ` D`, 24 GB livres) · mapa completo dos 13+2 campos BLOQUEIA · re-medição dos 3 ` M` da árvore principal. **Não medido:** o instante passado da inspeção de terreno (irrecuperável por natureza); suítes backend/frontend/flutter **não** reexecutadas — o PR não toca código (provado por diff-tree) e as contagens estão marcadas §C3.3 como CARREGADAS, não afirmadas.

**Ressalvas e notas:**
- **R1 (dívida do próximo PR, a única que viaja):** backfill §C3.5 da entrada 151 — `pr 368` · `merge_commit f895dd2` · `approved_head`: **resolver e registrar QUAL head**. A ata J-SAN2-6 nomeia `d90fbbb` (head do voto, 3×) e **não nomeia** `9051e9b` (head final; árvore idêntica ao squash; carrega o delta pós-voto que a ata declara em prosa, sem hash). O precedente provado pela C3 (3 de 3) grava **o head da ata** — quem backfillar escolhe com a razão escrita ao lado, senão nasce a 7ª materialização da classe "número sem âncora".
- **N1:** casca vazia `.claude/worktrees/san2-r/` (0 arquivos) a varrer pelo orquestrador.
- **N2:** contagem de campos BLOQUEIA abertos = 9 entradas/10 campos na minha medição (o "8" do mandato não reproduz); decisão inalterada.
- **N3:** o mandato dizia "head julgado pela junta: 9051e9b" — impreciso frente à ata (que diz `d90fbbb`); registrado aqui para a afirmação não virar fato herdado.

**LIBERADO COM RESSALVA: ciclo 5 do B-O6R-02 (Codex, UMA tentativa) e B-O6R-07 (Claude Code, em paralelo) | o PR que mergear primeiro carrega o backfill §C3.5 da entrada 151 (`pr 368` · `merge_commit f895dd2` · `approved_head` resolvido conforme R1, com registro da escolha).**
