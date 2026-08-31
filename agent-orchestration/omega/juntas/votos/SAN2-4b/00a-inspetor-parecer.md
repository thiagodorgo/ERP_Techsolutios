# SAN2-4b — Parecer do inspetor de terreno da junta (instância nova, Fable)

> Data: 2026-08-31. Worktree: `.claude/worktrees/san2-r`, branch `fix/san2-4b-corrigir-arnes`,
> head a julgar `2d2d16d`, PR #366. Antecessor caiu por `server_error` ao iniciar o parecer,
> deixando `00a-inspetor-evidencia.md` (126 l). **Pela R2/P3, as conclusões dele NÃO são insumo**:
> cada item abaixo foi RE-EXECUTADO por mim (comando registrado = roteiro de re-execução barata);
> divergência seria achado e a minha medição prevaleceria. **Resultado da comparação: zero
> divergências nos 10 itens.** Este parecer foi criado PRIMEIRO com todos os itens marcados
> EM APURAÇÃO e preenchido a cada lote de medição (P1).

## Fronteira do parecer (mérito × terreno)

O bloco alega que C1–C4 foram provadas por vermelho-controle. **Isso é MÉRITO, não terreno.**
Eu confiro que os diários existem e estão íntegros; **quem julga se as provas valem são as três
cadeiras da junta.** Nada neste parecer endossa ou refuta o conteúdo das provas.

## Item 1 — Árvore sem mutação viva, head e worktrees — VERDE

- Forma: `git status --porcelain` · `git rev-parse --short HEAD` · `git branch --show-current` ·
  `git worktree list`, execução direta minha neste worktree.
- `git rev-parse --short HEAD` = **`2d2d16d`** (head nomeado); branch **`fix/san2-4b-corrigir-arnes`**.
- `git status --porcelain` = **apenas 2 untracked**, ambos registro DESTA inspeção
  (`votos/SAN2-4b/00a-inspetor-evidencia.md` do antecessor + este parecer). **Nenhum arquivo
  rastreado modificado** — zero mutação viva.
- `git worktree list` = 4: raiz (`demo/investidor` d1fab3b), `agent-af6ea607f3ddf8efd`
  (feat/o6r-b02-financial-uow, 12c3825 — bloco alheio), `gov-descuido` (497d360 — idem) e **este**
  (2d2d16d). Nenhum worktree `jur-*` residual. Worktrees alheios = fato anotado, não sujeira deste
  tabuleiro.

## Item 2 — `npm run check` no head (bloco mexeu em `src/`) — VERDE

- Forma: `npm run check > log 2>&1; ec=$?` (exit por variável, log no scratchpad da sessão).
- Resultado: **ec=0** (`tsc -p tsconfig.json --noEmit`), medido AGORA por mim no head `2d2d16d`.

## Item 3 — Fatia S0 (espelho Codex) — VERDE

- Forma: `node scripts/sync-agent-agents.mjs --check`, execução minha.
- Resultado: `[agents-sync] OK — 23 agentes, espelho consistente.` **ec=0**.

## Item 4 — Base viva intocada + zero descartáveis — VERDE

- Forma: `docker ps -a` com format de Names/Status/Image (só leitura; eu NÃO executei nenhum
  comando NOS containers).
- Resultado: **exatamente 2 containers** — `erp-postgres  Up 2 days (healthy)  postgres:16` ·
  `erp-redis  Up 2 days (healthy)  redis:7`. O **`Up 2 days`** medido HOJE (2026-08-31) cobre todo o
  período do trabalho do bloco (plano gravado 2026-08-31): **nenhum restart atravessou o trabalho** —
  compatível com a alegação de zero comandos na base viva (uptime prova ausência de reinício; a
  ausência de escrita nos diários é o que a cadeira de auditoria confere). **Nenhum** container
  `san2-4b-*`, `jur-*` ou `crit-*`.

## Item 5 — Escopo do diff dentro do §5.1 — VERDE (com 1 anotação para a cadeira 3)

- Forma: `git merge-base main HEAD` · `git diff --name-only main...HEAD` · `git diff --check` ·
  `git diff --numstat -- Kpis/app.js` · `git diff --stat` do 20º arquivo.
- Merge-base = **`45c3b97`** (= a base declarada no cabeçalho do plano e o `merge_commit` do
  backfill). **20 arquivos**; `git diff --check` **ec=0** (limpo).
- **Código: os 5 exatos do §5.1** (`authority-password.ts` · `authority-portal.test.ts` ·
  `auth-identity-fixture.ts` · `rls-tenant-isolation.test.ts` · `db-catalog-write-guard.test.ts`).
  Nenhum arquivo do §5.2 tocado (nenhum `scripts/**`, `prisma/**`, `.github/**`, `package*.json`,
  `.claude/agents/**`, `.agents/**`, nenhum outro gatilho do sweep).
- **Registro/KPI: todos nomeados no §5.1** — pendencias.md, pendencias-indice.md, status-geral.md,
  B-O6R-02-ciclo5-plano.md (apenso D29), SAN2-2-plano.md (apenso), SAN2-4b-plano.md, os 3 `Kpis/*`,
  os 5 diários em `votos/SAN2-4b/`.
- **`Kpis/app.js`: numstat `1 1` — UM hunk, 1 linha trocada = a linha `var FROZEN`**, exatamente o
  que o §5.1 permite ("SOMENTE a linha FROZEN, via script").
- **Anotação (mérito da cadeira 3):** o 20º arquivo,
  `votos/SAN2-4a/00c-porteiro-pos-merge-365.md`, é **arquivo NOVO (+133/-0)** — persistência do
  parecer do porteiro do #365, insumo/autorização de start deste bloco. Cabe no glob
  `agent-orchestration/omega/juntas/**` do §5.1, mas o parêntese diz "desta junta"; é só-adição de
  registro, não edição de registro alheio. A cadeira de escopo pesa.

## Item 6 — Insumos: plano + 5 diários + ata J-SAN2-4a + ciclo — VERDE (briefing vira R1)

- **Plano** `omega/planos/SAN2-4b-plano.md`: existe no head, **lido INTEIRO por mim (554 l)** —
  nomeia base `45c3b97` e head de planejamento `fca131a`; §3.0 mapeia as 12 observações (fecha/não
  fecha com a razão de cada exclusão); §4/§6 bateria com **forma e N declarados, derivados de
  poder**; §5.1 lista fechada; §5.2 proibições com porquê; **§8 quórum UNANIMIDADE de 3 com o
  argumento §C7.1-ter(b) por escrito** (segurança: `authority-password.ts`; classe perda-de-dado:
  sweep de roles) e crítico-adversarial não convocado por regra literal do 1-ter(b).
- **5 diários do dev** em `votos/SAN2-4b/`: `dev-c1-parsestored.md` (356 l) ·
  `dev-c2-tamper-guard.md` (389 l) · `dev-c3-sweep.md` (308 l) · `dev-c4-teardown.md` (200 l) ·
  `dev-c5-c6-registro-kpi.md` (473 l). Presentes e não truncados (wc -l executado). O conteúdo
  (vermelho-controles C1–C4) é mérito das cadeiras — ver a fronteira no topo.
- **Ata `J-SAN2-4a.md`**: existe (83 l), com as 3 medições em `votos/SAN2-4a/medicao-*.md`
  (399/542/711 l). Presentes. **As afirmações da ata e das medições entram no briefing como
  "A RE-VERIFICAR"** onde a cadeira as consumir — nunca como fato herdado.
- **Ciclo = 1**: grep de san2-4b em `omega/reprovacoes/` = **vazio (ec=1)**. Parecer do crítico +
  PD com 5+ fontes: **N/A** (§C7.4 exige em ciclo 3+).
- **`BRIEFING-SAN2-4b`: NÃO EXISTE** (`ls juntas/ | grep -i 4b` = só `J-CHK-P1-PR04B` e
  `J-OMEGA3F-4B`, falsos positivos de outros blocos). Vira a **Ressalva R1, VINCULANTE**, abaixo.

## Item 7 — Inelegibilidade por nome — VERDE no que existe; o resto é condição da R1

- **`OBITUARIO-IDENTIDADES.md`** (144 l, em `juntas/`): tabela-resumo l.32-33 — **15 SEPULTADAS**
  (6 do B-O6R-ARNES + 9 do B-O6R-02 ciclo 4) + **2 RESERVADAS** ao ciclo 5 do B-O6R-02
  (`jurado-c5-arnes-catalogo-postgres` l.92 · `critico-c5-adversarial` l.93). O §8 do plano já
  proíbe as duas na cadeira 2, por escrito.
- `grep -rli "dev-san2-4b" juntas/J-*.md juntas/BRIEFING-*.md` = **vazio (ec=1)**: a identidade do
  dev é nova — não votou, não achou, não planejou. Separação §C7.4-bis conferida por nome no plano
  §8: planejador (não vota) / achadores (`dev-san2-4a` + cadeiras da J-SAN2-4a — não votam aqui) /
  dev (`dev-san2-4b` — não vota) / jurados (terceiros).
- **Jurados: ainda não nomeados** (não há briefing). A conferência final por nome — grep de CADA
  nome proposto contra o obituário E as atas `J-*`/`R-*` ANTES do disparo — é **condição vinculante
  da R1**. Ausência do nome no obituário NÃO absolve (`P-OBITUARIO-DERIVADO-DO-DIRETORIO` —
  cobertura parcial).

## Item 8 — Baseline de KPI — VERDE (por parser, com a fronteira declarada)

- Forma: `node -e` com asserts estritos sobre os dois JSONs; `node scripts/kpi-freeze.mjs --check`;
  `node --check Kpis/app.js`; `node --test --import tsx tests/kpi-dashboard-charts.test.ts` com ec
  por variável.
- history = **149 entradas**. Entrada **SAN2-4a**: `pr 365` · `merge_commit "45c3b97"` ·
  `approved_head "4199b92"` (o head JULGADO da ata, não o headRefOid `aa22b7f`) — **backfill pago**.
  Entrada **SAN2-4b**: `pr`/`merge_commit`/`approved_head` **null/null/null** (§C3.5 na autoria) ·
  `blocks_completed` **155** (condição do 156 escrita na entrada) · `backend_tests` **"2609/2611"**.
  latest: `version SAN2-4b`, 155, 2609/2611, 3 nulls no `release`, `mvp_demo 99`/`mvp_vendavel 88`
  intocados. **TODAS AS ASSERCOES PASSARAM, ec=0.**
- `kpi-freeze --check` = "em dia (snapshot 2026-08-31)", **ec=0** · `node --check Kpis/app.js`
  **ec=0** · `kpi-dashboard-charts` reexecutado por MIM: **16/16 pass, ec=0**.
- **Fronteira de honestidade:** o **2609/2611 é medição do dev** (diário C5-C6, execução real
  declarada em cluster descartável). Eu **não** reexecutei a suíte completa — exigiria cluster
  próprio e é exatamente o trabalho da cadeira 2. O que eu PROVO é que o número publicado = o
  medido no diário (parser) e que o baseline estático do head é verde (item 2).

## Item 9 — Plano de perda de jurado (P5/P6) — VERDE

- `juntas/PROTOCOLO-JUNTA-RESILIENTE.md` presente (96 l): **P5** l.59 (disparo escalonado, máx 2
  paralelos, pausa em janela instável) · **P6** l.69 (`votos/<JUNTA>/00-quedas.md`, colunas fixas) ·
  **R2 vigente** l.35: *"voto perdido não conta; o sucessor tem identidade nova"* + **P3** (emenda:
  re-executar é barato, herdar é proibido — o rito que ESTE parecer seguiu). O §8 do plano declara o
  rito por referência explícita. O briefing (R1) deve repeti-lo.

## Item 10 — CI do PR #366 — VERDE

- Forma: `gh pr view 366 --json state,mergeable,headRefOid,statusCheckRollup`.
- **7/7 SUCCESS** (backend · backend-postgres · frontend · owner-portal · authority-portal ·
  flutter · docker), estado **OPEN**, `headRefOid 2d2d16db69afa...` **= head local `2d2d16d`**,
  `mergeable: MERGEABLE`.

## Veredito — LIBERADO COM RESSALVA

Terreno provado limpo nos 10 itens, por execução minha, com zero divergência da evidência do
antecessor. Três ressalvas para o orquestrador colocar em destaque no briefing:

- **R1 (VINCULANTE — a junta NÃO vota antes de cumprida):** `BRIEFING-SAN2-4b` não existe. Antes
  do disparo dos jurados o orquestrador grava o briefing com: (a) os **3 nomes** das cadeiras, cada
  um conferido por grep contra `OBITUARIO-IDENTIDADES.md` **e** as atas `J-*`/`R-*` (ausência no
  obituário não absolve; as 2 RESERVADAS proibidas na cadeira 2); (b) o rito **P5/P6** repetido
  (máx 2 paralelos, `00-quedas.md`, R2/P3); (c) as afirmações da ata J-SAN2-4a e das medições
  marcadas **"A RE-VERIFICAR"** — insumo a auditar, nunca fato herdado; (d) a fronteira mérito
  versus terreno deste parecer (as cadeiras julgam as provas C1–C4; eu só provei que os diários
  existem e estão íntegros).
- **R2 (anotação de escopo, cadeira 3):** o 20º arquivo do diff
  (`votos/SAN2-4a/00c-porteiro-pos-merge-365.md`, novo, +133/-0) está sob o glob do §5.1 mas o
  parêntese diz "desta junta" — pesar se a persistência do insumo de start cabe ali.
- **R3 (fronteira do 2609/2611):** número publicado = medido no diário (provado por parser), mas a
  suíte completa não foi reexecutada por mim — a cadeira 2 a reexecuta em cluster descartável
  próprio antes de o voto dela valer.

## Linha de limpeza do inspetor

Criei apenas: este parecer (registro da junta, fica; a evidência do antecessor eu **não** editei) e
2 logs no scratchpad da sessão (`san2-4b-npm-check.log`, `san2-4b-charts.log` — morrem com ela).
**Zero containers, zero worktrees, zero portas, zero comandos à base viva, zero commits** — nada meu
a derrubar.
