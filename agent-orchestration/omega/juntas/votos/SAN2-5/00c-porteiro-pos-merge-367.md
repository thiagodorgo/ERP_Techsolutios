# Parecer do porteiro pós-merge — PR #367 (SAN2-5, squash `e6a6461`)

**Instância:** nova, nascida no merge do #367; morre neste parecer. **Data:** 2026-09-01.
**O que está em jogo:** o próximo bloco é o **ciclo 5 do `B-O6R-02`** — última tentativa
(`D-TETO-DOIS-CICLOS`, l.1790-1791: "Se reprovar, para"). Este parecer é o último filtro antes de a
única chance ser exposta a defeito de terreno.

Método: este arquivo nasceu com uma linha `EM APURAÇÃO` por item e cada linha foi preenchida ao
medir — nenhum item herdado de relato.

## 1. Integridade do merge — CONFERE

`git log origin/main -3`: `e6a6461` na ponta. `gh pr view 367`: **MERGED**, `mergeCommit
e6a646193d5394241d9f55ea32438b466ced223f`, mergedAt 2026-09-01T04:52:35Z, head
`chore/san2-5-preparar-ciclo5`. Local `main` = `e6a6461`. Árvore limpa (`git status --porcelain`: só
este parecer, untracked).

## 2. Promessa × entregue — CONFERE

`git show --stat e6a6461`: **29 arquivos, +7789/−48** — exatamente o que o corpo declara: 8 corpos em
`.claude/agents/especialistas/`, `Kpis/*` (app.js/latest/history), `pendencias.md` + índice,
briefing/ata/votos SAN2-5, parecer do porteiro #366, os 2 planos. Nenhum arquivo fora do que o corpo
menciona; nenhuma promessa sem arquivo. "Diff de código VAZIO" confirmado: zero em `src/ tests/
prisma/ .github/` no stat, e `git diff e6a6461^ e6a6461 -- .github/` = **0 linhas**.

## A. O preparo do ciclo 5 sobreviveu ao merge? — 5/5 CONFERE

- **A1 — CONFERE (re-medido por mim, não herdado).** 8 corpos no merge (`git ls-tree e6a6461`).
  `git hash-object` do disco = tabela **E1.8** (plano l.503-510) = blob do merge, **8/8**:
  `dc17357/357` · `254cc4f/400` · `ab726a8/409` · `d729159/410` · **`5d18365/413`** (o suplente
  reescrito pela fábrica — hash vigente, não o obsoleto `bcf7b5f3/422`) · `a08aeb2/400` ·
  `0a1f64c/367` · `deb2543/339`. Linhas 8/8. CR nos blobs: **0 em todos os 8** — medido com
  `git cat-file blob | tr -cd '\r' | wc -c`; nunca com `grep -c $'\r'`, que devolve 0 falso neste
  ambiente. O CR no disco é CRLF de checkout (autocrlf), não do conteúdo.
- **A2 — CONFERE.** Ocorrências de `5/5` nos 8 corpos: todas revogação/negação ("está **REVOGADO**"
  l.80 do jurado C1; "não 5/5"; "está desatualizado e este parágrafo vence"; "Não existe 5/5 aqui");
  crítico e suplente do crítico: 0 ocorrências. Schema de voto com campo
  `"escopo": "dentro-do-bloco | pre-existente"` nos **6/6 votantes** (ex.:
  `jurado-c5-banco-fk-triggers.md` l.395).
- **A3 — CONFERE.** Composição nomeada por escrito no apenso **E1.1** (plano l.362+): C1
  `jurado-c5-arnes-catalogo-postgres` · C2 `jurado-c5-banco-fk-triggers` · C3
  `jurado-c5-validador-diff-plano`, quórum **unanimidade de 3**; **E1.7** (l.560+) nomeia suplente
  1-a-1 (+ crítico e suplente do crítico, não-votantes); cláusula de precedência sobre o §13 antigo
  (">=7"/6 cadeiras SUPERADOS) presente. O inspetor fail-closed tem contra o que conferir.
- **A4 — CONFERE (identidade de objeto).** Parent `e6a6461^` do plano = blob **`a191381bea1f`**,
  **341 linhas**; novo = **847**; head -341 do blob novo re-hasheia para **`a191381bea1f`** —
  append puro. `git diff --numstat e6a6461^ e6a6461`: plano **506/0**, `pendencias.md` **121/0** —
  zero deleção nos dois.
- **A5 — CONFERE.** Decisão B3 (o `ci.yml` vence) no merge: apensos E3/E4 + errata operante (l.584+)
  com os intervalos re-medidos (guard morde na l.231; vizinhas 213-216); a linha única do LUGAR
  RESERVADO segue transcrita verbatim para o dev; C3 do E1.1 confere o diff do `ci.yml` como
  "exatamente a linha única". E o `ci.yml` não foi tocado neste merge (diff `.github/` = 0).

## B. Contagens reexecutadas + KPI — CONFERE, com 1 ressalva de forma

**Reexecutei (comandos e resultados):**
- `node scripts/kpi-freeze.mjs --check` -> "em dia (snapshot 2026-09-01)", ec=0.
- `node --test --import tsx tests/kpi-dashboard-charts.test.ts` -> **16/16 pass, 0 skip, 0 fail**.
- `node --check Kpis/app.js` -> OK.
- `npm run check` (tsc --noEmit) -> verde.
- `node scripts/sync-agent-agents.mjs --check` -> ec=0, "23 agentes" — **executado E consignado como
  CEGO a `especialistas/`** (8 corpos novos e o número não moveu): NÃO vale como prova sobre os
  corpos; a prova dos corpos é o A1 (hash direto). `P-SYNC-AGENTS-NAO-RECURSIVO` cobre isso.
- Gerador do índice de pendências (item C2 abaixo) -> reproduz o commitado.
- CI do head `657928f`: `gh run list --commit` -> **ci: success** (R2 do inspetor — "merge só com CI
  7/7" — cumprida).

**NÃO reexecutei (declarado, não presumido):** suíte backend (2609/2611), smoke frontend
(1126/1126), Flutter (864/864), contratos focados (34/34) — o bloco não tocou código de produto
(diff `src/ tests/ prisma/` = 0, medido) e o history publica as quatro como **CARREGADAS com marcador
§C3.3**, sem afirmação em primeira pessoa; reexecutá-las não é deste gate. Também não rodei: drills
do ciclo 5 (são do bloco), merge simulado da absorção (é do S0 do ciclo 5), censo das 68 órfãs
(base viva proibida).

**KPI — CONFERE:**
- History = **150 entradas**; entrada 150 = SAN2-5, `pr/merge_commit/approved_head` **null** (correto
  na autoria, §C3.5); backfill do **#366 preservado**: pr 366 · merge_commit `df496d2` ·
  approved_head `2d2d16d` na entrada SAN2-4b (lido no JSON).
- `blocks_completed` **156**, com a nota que já se auto-obriga: sobe para 157 SÓ QUANDO O SAN2-5
  MERGEAR — mergeou.
- Trilhas carregadas com nota §C3.3 explícita; `mvp_demo` 99% / `mvp_vendavel` 88% INTOCADOS, com
  justificativa na entrada 150.
- **Correção C3-A1 ENTROU, nas duas superfícies** (history + `release.summary` do latest): "1
  arquivo" virou **17 arquivos**, ancorado ao head **`5256b49`** (1 em `44a30e4` + 16 em `5256b49`),
  com ERRATA que fixa a norma "todo número de diff passa a vir com o head em que vale".
- **Ressalva de forma (mesma classe, 4a ocorrência):** na MESMA descrição, "442 0" (plano) e "100 0"
  (pendencias.md) estão **sem âncora de head** — verifiquei: são verdadeiros em `5256b49`
  (`git diff --numstat df496d2 5256b49` = 442/0 e 100/0), mas no squash valem **506/0 e 121/0** (o
  pós-voto apensou depois da medição). O claim que sustenta (append-only, 0 deleção, 341 intactas) é
  verdadeiro no merge — re-medi. Corrigir a âncora no mesmo commit do backfill.

**Ata da junta — CONFERE (§C7.1).** `agent-orchestration/omega/juntas/J-SAN2-5.md`: **APROVADO 3x0**
(quórum exigia maioria; saiu unânime), nenhum achado `bloqueia`, papéis e achados registrados,
higiene de terreno registrada (C2 mutou em worktree próprio — a regra nova do porteiro do #366
funcionou na 1a aplicação). **Head julgado, LIDO na ata l.4: `5256b49`** — distinto do headRefOid
`657928f` (o delta pós-voto são as correções C3-A1/C3-A5).

**Dívida do PRÓXIMO PR (o do ciclo 5) — nomeada:**
1. Backfill §C3.5 do #367: pr 367 · merge_commit `e6a6461` · approved_head `5256b49` (**o head da
   ata, não `657928f`**).
2. `blocks_completed` 156 -> **157**.
3. Ancorar "442 0"/"100 0" a `5256b49` (ou re-medir no head que valer), pela norma da própria ERRATA.

## C. Pendências, próximo start e limpeza

**Pendências do bloco — CONFERE.** O PR abriu 1: `P-SYNC-AGENTS-NAO-RECURSIVO` — registrada em
`pendencias.md` com status ABERTA · MÉDIA · escopo `pre-existente` (com evidência de origem), dono
"a atribuir" com candidato nomeado e razão explícita de não ser do ciclo 5 (`scripts/**` congelado).
Fechou 0 (diff 121/0, append puro) — amostragem de fechada **sem objeto**; em seu lugar conferi as
**dívidas pagas** que o porteiro do #366 nomeou: backfill `df496d2`/`2d2d16d` (no JSON), 156 (no
JSON), worktree próprio para cadeira que muta (aplicado pela C2, ata, seção Higiene). 3/3 pagas de
verdade.

**C1 — Nenhuma pendência BLOQUEIA o ciclo 5.** Régua aplicada: campo estruturado `**Bloqueia:**`,
valor não-negado, status aberto — 12 campos não-negados no arquivo, todos bloqueando trilhas de
FEATURE (auth/RBAC, despesas/RDV, estoque, deploy produtivo, cloud billing, OS/aprovações,
jobs/tempo-real, despacho/mapa, portal, mobile). Cruzamento com
O6R/ciclo/arnês/teste/migration/financeiro: ec=1 (zero). `P-O6R-ARNES-ISOLAMENTO`: "Bloqueia: nada
diretamente" (negado). `P-O6R-B02` "BLOQUEIA o financeiro" bloqueia features — o ciclo 5 é o bloco
que a RESOLVE, não alvo dela. **Start não negado por pendência.**

**C2 — Índice sincronizado — CONFERE.** Regenerei pelo script (`gerar-indice-pendencias.py`): saída
**241 cabeçalhos / 232 IDs / 191 ABERTAS** = o commitado (240/231/190 -> 241/232/191 corrigido neste
PR); diff **eol-neutro** (tr -d de CR nos dois lados) = **0 linhas**; bytes originais restaurados,
`git status` limpo. Medição por conteúdo, não md5sum — a armadilha
`P-SAN2-2-INDICE-DONO-SEMPRE-SIM` não foi acionada.

**C3 — Limpeza §C5 — CONFERE.** Branch remota `chore/san2-5-preparar-ciclo5` apagada (ls-remote =
0). Zero branch local mergeada sobrando (`--merged main` vazio). **4 worktrees** (árvore principal
`demo/investidor` · `agent-af6ea` = `feat/o6r-b02-financial-uow`, mantido de propósito para o ciclo
5 · `gov-descuido` · `san2-r` = main). Nenhum rastreado apagado (status sem linha " D").
`erp-postgres`/`erp-redis`: **Up 3 days (healthy)** — intocados, nem leitura. Disco: **16 GB
livres** (acima do piso ~10) — **recomendo `DEEP_CLEAN=1 bash scripts/post-merge-cleanup.sh` ANTES
do start do ciclo 5**: o bloco vai subir worktree com `npm ci` próprio por cadeira que muta (~1,5 GB
cada, junction proibida) + clusters Postgres descartáveis, e chegar ao piso NO MEIO do ciclo-teto
seria defeito de terreno evitável. Recomendação, não bloqueio.

## Consignações (abertas, nomeadas, não bloqueiam o start)

- **E2c** — `tests/junta-voto-escopo-guard.test.ts` NÃO existe (verificado: No such file). A
  propriedade "corpo com `gravidade` tem `escopo`" segue conferida à mão — e um corpo mudou entre
  duas conferências nesta mesma sessão. Enquanto não virar guard, toda junta re-mede na abertura (o
  inspetor já faz; que continue).
- **Absorção da `main`** pela `feat/o6r-b02-financial-uow` é do S0 do ciclo 5 (9 conflitos nomeados
  por merge simulado, reproduzidos pela C2). O worktree `agent-af6ea` está em `12c3825` — o dev do
  ciclo 5 absorve ANTES de tudo, como o plano manda.
- **`P-SYNC-AGENTS-NAO-RECURSIVO`** aberta — até fechar, `sync-agent-agents --check` ec=0 NÃO é
  prova sobre `especialistas/`; a prova é hash-object contra E1.8, como feito aqui.

## O próximo bloco pode começar?

**Sim.** Merge íntegro, promessa cumprida arquivo a arquivo, preparo do ciclo 5 intacto no merge
(composição + corpos 8/8 + apensos append-only + decisão B3), guards reexecutados verdes, KPI
honesto com dívida nomeada, nenhuma pendência BLOQUEIA alcançando o alvo, limpeza feita.

**LIBERADO COM RESSALVA: ciclo 5 do B-O6R-02 (última tentativa — S0 de absorção primeiro, inspetor
fail-closed antes da junta; recomendado DEEP_CLEAN=1 antes do start) | dentro do PR do ciclo 5:
(1) backfill §C3.5 do #367 — pr 367 · merge_commit e6a6461 · approved_head 5256b49 (o head da ata
J-SAN2-5.md, não o headRefOid 657928f); (2) blocks_completed 156 -> 157; (3) ancorar ao head as
provas "442 0"/"100 0" da entrada 150 (verdadeiras em 5256b49, defasadas no squash — a norma da
própria ERRATA C3-A1)**
