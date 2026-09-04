# Evidencia do inspetor de terreno — junta SAN2-6 (PR #368)

> Inspetor: inspetor-de-terreno-da-junta (Fable, D-INSPETOR-TERRENO-JUNTA). Identidade nova.
> Head a julgar: 41e2316 · Base: e6a6461 · Branch: docs/san2-6-contrato-p1p6-teto
> Worktree de medicao: .claude/worktrees/san2-r · Data: 2026-09-02
> Protocolo: P1 (apensar apos CADA item) · P2 (nasce esqueleto) · P4 (3 itens)

## T1 — Arvore e isolamento

**MEDIDO** (2026-09-02, worktree san2-r).

**Correcao de head no meio da inspecao (achado de terreno, do orquestrador, nao da junta):**
o despacho nomeava head `41e2316`. Na 1a medicao (`git rev-parse --short HEAD` + `git status --porcelain`)
vi `41e2316` com o `BRIEFING-SAN2-6.md` **untracked** na arvore. O orquestrador entao commitou o briefing
(`1115aeb`, 1 arquivo, 162 insercoes, 100% adicao — conferido por `git show --stat 1115aeb`) e corrigiu o
head por mensagem. Re-medi TUDO contra `1115aeb`. Classe "numero medido cedo, publicado tarde", assumida
pelo orquestrador; registrada aqui porque alcancou a 1a medicao.

1. `git rev-parse --short HEAD` -> `1115aeb` (= head corrigido). `git log -1` -> "docs(junta): briefing da
   junta do SAN2-6...". `git status --porcelain` -> **1 linha**: `?? .../votos/SAN2-6/00a-inspetor-evidencia.md`
   — o MEU esqueleto de evidencia, exigido pelo protocolo P2 e commitado depois pelo orquestrador. Nenhuma
   mutacao de arquivo rastreado. **VERDE.**

2. `git worktree list` -> 4 worktrees. Status de cada um (`git -C <wt> status --porcelain`):
   - **arvore principal** `demo/investidor` @ d1fab3b: `M .claude/agents/planejador-mestre.md`,
     `M .claude/agents/porteiro-pos-merge.md`, `M scripts/sync-agent-agents.mjs`, `?? .claude/worktrees/`.
     **ALCANCE:** a mutacao viva inclui EXATAMENTE o guard que a cadeira C2 executa
     (`scripts/sync-agent-agents.mjs`) e dois corpos de agente que ele compara. **NAO alcanca** a medicao
     desta junta ENQUANTO todo comando rodar de dentro de `san2-r` (arvore limpa no head: o script e os
     agentes ali sao os blobs de `1115aeb`). Jurado que rodar QUALQUER comando na arvore principal mede um
     guard mutado — vira RESSALVA R1 no parecer.
   - **agent-af6ea607f3ddf8efd** `feat/o6r-b02-financial-uow` @ 12c3825: porcelain **vazio**. Residuo
     inerte de outro bloco (B-O6R-02); ninguem desta junta toca nele. RESSALVA R2 (inerte, nomeado).
   - **gov-descuido** `docs/governanca-porteiro-pre-merge-sol` @ 497d360: porcelain **vazio**. Inerte.
3. **Nenhuma cadeira muta codigo** — bloco documental, as 3 so medem; o desenho NAO exige worktree por
   jurado. Onde os drills mutam SEM sujar a arvore julgada:
   - **C2 (drill de mordida do escopo):** worktree descartavel proprio a partir do head julgado
     (`git worktree add <scratchpad>/jur-c2-drill 1115aeb`), mutacao + commit temporario LA, medir o
     comando morder (`ec!=0`), e remover SO com `git worktree remove --force`. Nunca em `san2-r`, nunca na
     arvore principal, nunca `git checkout -- <arq>` em `san2-r` (armadilha 4: re-materializa CRLF).
   - **C3 (drill do guard do painel):** `git show e6a6461:Kpis/app.js > <scratchpad>/app-main.js` e rodar o
     teste em worktree descartavel proprio — o blob sai por `git show`, nada de checkout na arvore julgada.
4. **Junction/symlink de node_modules: NENHUM.** `ls -ld` + `cmd /c dir /AL` na raiz dos 4 worktrees:
   `node_modules` e diretorio real (nao reparse point) na principal, no agent-af6ea e no san2-r;
   **ausente** no gov-descuido. Proibicao da §C7.1-ter(c) atendida. **VERDE.**

**Veredito parcial T1: VERDE com 2 ressalvas de isolamento (R1: rodar tudo em san2-r; R2: residuo inerte).**

## T2 — Insumos do briefing existem e sao legiveis

**MEDIDO** (2026-09-02, head 1115aeb).

1. **Existencia no head julgado** — `git cat-file -e 1115aeb:<path>` para cada insumo que o briefing manda
   ler: `omega/planos/SAN2-6-plano.md` OK · `votos/SAN2-6/dev-contratos-readme.md` OK ·
   `PROTOCOLO-JUNTA-RESILIENTE.md` OK · `OBITUARIO-IDENTIDADES.md` OK · `controle/decisoes.md` OK ·
   `BRIEFING-SAN2-6.md` OK (entrou no head via 1115aeb). Base conferida: `git rev-parse origin/main` =
   `e6a6461` (= briefing). **VERDE.**
2. **Diretorio de voto gravavel** — provado por execucao: este proprio arquivo
   (`votos/SAN2-6/00a-inspetor-evidencia.md`) foi criado nele como esqueleto antes da medicao (P2),
   `ec=0`, e vem sendo apensado item a item (P1). **VERDE.**
3. **Inelegibilidade POR NOME** — `grep -r` dos 3 nomes de cadeira
   (`auditor-da-insercao-e-da-paridade`, `provador-do-espelho-e-do-comando`,
   `conferente-do-kpi-e-das-dividas`) em `agent-orchestration/omega/juntas/**` (inclui todas as atas
   `J-SAN2-*`, todos os `votos/**` e o `OBITUARIO-IDENTIDADES.md`): **unica ocorrencia = o proprio
   BRIEFING-SAN2-6.md**. As 8 identidades reservadas ao ciclo 5 em `.claude/agents/especialistas/`
   (listadas: critico-c5-adversarial, jurado-c5-arnes-catalogo-postgres, jurado-c5-banco-fk-triggers,
   jurado-c5-validador-diff-plano + 3 suplentes-c5 + suplente-critico-c5-adversarial) **nao colidem** com
   nenhum nome de cadeira. As 23 identidades de topo em `.claude/agents/*.md` tambem nao colidem.
   Cadeiras = identidades novas. **VERDE.**
4. **Afirmacoes marcadas para re-medicao, nao herdadas como fato** — briefing l.8: "Este briefing e
   insumo, nao veredito. Toda afirmacao aqui e do orquestrador e deve ser re-medida". **VERDE.**
5. **Tabela de numstat do briefing §2 re-medida por mim** — `git diff --numstat e6a6461...1115aeb` -> 16
   linhas: as **15 do briefing batem numero a numero** (CLAUDE.md 57/11 · AGENTS.md 61/15 · README 26/14 ·
   PROTOCOLO 14/0 · history 14/2 · latest 12/12 · app.js 1/1 · pendencias 98/0 · indice 7/6 ·
   status-geral 5/0 · ciclo5 1301/0 · B-O6R-07 444/0 · SAN2-6-plano 505/0 · diario-dev 755/0 ·
   porteiro-367 161/0) + **1 linha nova esperada**: `BRIEFING-SAN2-6.md 162/0` (o commit 1115aeb, 100%
   adicao). Nenhum caminho de codigo no diff (`src/ tests/ scripts/ prisma/ .github/ frontend/ mobile/
   lockfiles`: zero linhas no numstat). **VERDE.**

**Veredito parcial T2: VERDE.**

## T3 — Baseline honesto e plano de perda de jurado

**MEDIDO** (2026-09-02, head 1115aeb, dentro de san2-r).

1. **CI do PR #368 no head ATUAL** — `gh pr view 368 --json headRefOid` -> `1115aeb` (o PR ja aponta o
   head corrigido). `gh pr checks 368`, duas medicoes:
   - 1a: 5 pass + `backend` pending (checks-ec=8, OPEN/BLOCKED).
   - 2a (minutos depois): **6 pass** (authority-portal 17s · backend 5m40s · backend-postgres 2m0s ·
     flutter 2m44s · frontend 1m9s · owner-portal 16s) + **`docker` pending** — 7 jobs no total.
   **A junta PODE votar agora** (o voto mede o head, nao o CI); **o MERGE nao pode** ate 7/7 verde no
   `1115aeb`. O 7/7 anterior era do head `2c1eee1` e **nao vale** para o head atual. RESSALVA R3.
2. **Baseline da bateria documental, medido por mim, sem confiar no diario do dev** (todos em san2-r,
   ec por variavel, nunca por pipe):
   - `node --check Kpis/app.js` -> **ec=0**. (1a tentativa deu ec=1 por falha de redirect MEU
     (`/tmp_out.txt` sem permissao) — vermelho fabricado pelo instrumento, descartado e re-medido limpo
     via scratchpad. Registrado para ninguem herdar o numero podre.)
   - `node scripts/kpi-freeze.mjs --check` -> **ec=0** ("kpi-freeze: em dia (snapshot 2026-09-01)").
   - `node scripts/sync-agent-agents.mjs --check` -> **ec=0** ("[agents-sync] OK — 23 agentes, espelho
     consistente"). Nota ja conhecida do briefing C2.1: guard fail-open quanto a `especialistas/` —
     ec=0 prova os 23 de topo, NAO prova os corpos de jurado; a cadeira C2 detalha.
   - `git diff --check` -> **ec=0**.
   **Baseline VERDE nos 4 comandos.**
3. **Plano de perda de jurado (P3 inline no contrato; 1 linha por cadeira):**
   - **C1 `auditor-da-insercao-e-da-paridade`** (sem veto): sucessor de identidade nova re-executa cada
     comando do `01-*-evidencia.md` dela, compara com o gravado, e mede so a cauda nao medida.
   - **C2 `provador-do-espelho-e-do-comando`** (veto): sucessor re-executa o `02-*-evidencia.md` — o
     drill de mutacao SEMPRE em worktree descartavel NOVO (nunca reaproveitar o do caido sem medi-lo
     antes) — compara e mede a cauda; o veto acompanha a cadeira, entao **sem sucessor a junta nao
     conclui**.
   - **C3 `conferente-do-kpi-e-das-dividas`** (veto): sucessor re-executa o `03-*-evidencia.md` (freeze,
     backfill, drill do guard do painel via `git show e6a6461:Kpis/app.js` no scratchpad), compara e mede
     a cauda; idem: **sem sucessor a junta nao conclui**.
   Quorum e maioria de 3 (§C7.1-ter(b)); com P1/P2 a perda custa a cauda, nunca o trabalho ja gravado.

**Veredito parcial T3: VERDE com 1 ressalva (R3: merge preso ao 7/7 do 1115aeb).**
