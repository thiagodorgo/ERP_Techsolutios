# Parecer do inspetor de terreno — junta do B-SAN3-01 (PR #387)

- **Papel:** `inspetor-de-terreno-da-junta`
- **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`) — contrato cumprido, sem fallback
- **Corpo aplicado:** `origin/main:.claude/agents/inspetor-de-terreno-da-junta.md` (lido por `git show`, `MSYS_NO_PATHCONV=1`). Acrescenta ao corpo carregado na sessão os itens **3.1-bis** (obituário antes do grep), **3.3** (corpo carregado × corpo julgado, EOL-neutro; cláusula citada tem de existir) e a nota de fallback Fable→Opus. O corpo carregado na sessão **diverge** do da ref (md5 EOL-neutro: disco `934a8b08…` × blob `33dc3256…` = `origin/main`); apliquei o da ref.
- **Objeto (re-verificado):** `bb540fb3139031f40eea93ec5d7a47e987167bc2` · branch `fix/web-wo-sem-fallback-fabricado` · PR #387 (`gh pr view`: OPEN, base `main`, **head `74f3f7c9`**) · base `origin/main@02bd7dab` (= `merge-base`) · briefing em `74f3f7c9`
- **Data:** 2026-09-18 · **Ciclo:** 1 (nenhum `J-*`/`R-*` de `B-SAN3-01` em `bb540fb3` nem em `74f3f7c9`)
- **Onde medi:** somente leitura em `bsan301` e na árvore principal; execução no MEU worktree detached `.claude/worktrees/insp-bsan301` em `bb540fb3` (`npm ci` e `npm --prefix frontend ci` próprios, sem junction), removido ao fim.

## 1. Isolamento

### 1.1 Head existe, é o nomeado, árvore limpa — VERDE
- `git rev-parse --short bb540fb3` → `bb540fb3`; `git merge-base bb540fb3 origin/main` → `02bd7dab…` (base bate).
- `git -C bsan301 status --porcelain` → **vazio**. `bsan301` está em `74f3f7c9` (branch `fix/web-wo-sem-fallback-fabricado`), 2 commits à frente do objeto.
- **Delta `bb540fb3..74f3f7c9`** (`git diff --name-status`): 10 arquivos, **todos `A` sob `agent-orchestration/omega/juntas/`** (BRIEFING, `votos/B-SAN3-01/00-dev.md`, `00a-conferencia-orquestrador.md`, `apoio/*.log`, `apoio/e2e-copia-avulsa.spec.ts`). Filtro fora desse diretório → **zero** arquivo de código. Ver R3.
- md5 EOL-neutro (`git show bb540fb3:<p> | tr -d '\r' | md5sum` × `tr -d '\r' < bsan301/<p> | md5sum`) dos 10 arquivos centrais — **IGUAL** em todos: `work-orders.service.ts` `4fbfd775…`, `work-orders.state.ts` `b6491f1f…`, `WorkOrdersPage.tsx` `66125e7f…`, `WorkOrderCreatePage.tsx` `96071ded…`, `WorkOrderDetailPage.tsx` `a7af2548…`, `dispatches.service.ts` `0c68f0b6…`, `OperationsDispatchesPage.tsx` `531ccebd…`, `work-orders-honest-errors.test.tsx` `15155386…`, `tests/e2e/critical-flows.spec.ts` `365834f4…`, `Kpis/kpis-latest.json` `5c145601…`. Sem mutação viva.

### 1.2 Plano de isolamento declarado no briefing — VERDE
`BRIEFING-B-SAN3-01.md` §0 (lido em `74f3f7c9`) declara por escrito: worktree próprio detached em `bb540fb3` por cadeira (`j-bsan301-<cadeira>`), `npm ci` + `npm --prefix frontend ci` próprios, **cluster Postgres descartável próprio** (`postgres:16`, `j-bsan301-<cadeira>-pg`, porta própria), **Redis descartável próprio** (`redis:7-alpine`, `j-bsan301-<cadeira>-redis`, `REDIS_URL` exportada), portas de app próprias, `VITE_USE_MOCKS` desligado, tudo removido pelo nome, sem junction de `node_modules`, sem `stash/checkout/reset/clean` alheio, **base viva (`erp-postgres`, `erp-redis`) fora de alvo**.

### 1.3 Resíduo de jurado anterior — VERDE com ressalva (R5)
- `docker ps -a`: **nenhum** `j-bsan301-*`, `jur-*`, `insp-*`. Vivos: `bsan301-pg` (127.0.0.1:32768) e `bsan301-redis` (127.0.0.1:56385) — do bloco, conforme o briefing; `crit-b04a-pg` (Up, 58643 — do bloco `b04a` em andamento, não desta junta); `pastrack-*` (outro projeto; **`pastrack-banco-1` Up em 127.0.0.1:5432**, ver R2); `erp-postgres` **Exited** (6 dias), `erp-redis` **Exited** (~1 h), `erp-postgres-alt` Exited(255) em 55432 (origem não declarada; inerte). `docker volume ls` filtrado por `jur|crit|j-bsan|insp` → nenhum.
- `find bsan301` por `jur-probe*`, `*-probe.ts`, `*-probe.mjs` (fora de `node_modules`) → **nenhum**; `git status --porcelain --ignored` filtrado por `probe|jur-|crit-` → nenhum.
- `git worktree list`: 7 registrados (principal `demo/investidor` d1fab3bc; `b04a`, `b11`, `bsan301`, `bsan304a`, `gov-descuido`, `gov-elenco` em `main`) — todos os declarados no briefing; `--porcelain` sem `prunable`/`locked`. **`ls .claude/worktrees/` tem um 8º diretório, `san2-r`**: vazio (16K, 0 entradas, sem `.git`, mtime 2026-09-02), não registrado — resíduo inerte alheio (reportado, não varrido).
- Árvore principal (`git status --porcelain`): 6 modificados (`.claude/agents/planejador-mestre.md`, `scripts/sync-agent-agents.mjs`, `critico-c5-adversarial.md` e `jurado-c5-arnes-catalogo-postgres.md` nos dois espelhos) + 22 untracked (especialistas `jurado-06-*`, `jurado-07b-*`, `jurado-c5-*`, `suplente-critico-c5-*`; `BRIEFING/J-B-O6R-02-ciclo5`; `TEMPLATE-J-ata.md`; `votos/{B-O6R-02-ciclo5,O6R-07a,O6R-07a-ressalvas,SAN2-6}/`; `scripts/audit-agents-skills.mjs`). Resíduo de outras sessões; **nenhum é corpo de cadeira desta junta** (ver 3.3). Reportado, não varrido.

## 2. Insumos do briefing

### 2.1 Ata anterior / afirmações "a re-verificar" — VERDE com ressalva (R6)
Ciclo 1: não há ata anterior de `B-SAN3-01`. O briefing §3 marca relatório do dev (`00-dev.md`), plano e conferência do orquestrador (`00a-…`) como **afirmações a medir, não prova**, e manda a C1 regenerar o censo. O único fato pré-declarado é o e2e defasado (§0): **medi a evidência** — `d5a4ed43` (2026-07-02, #111) altera `frontend/src/pages/LoginPage.tsx`; `tests/e2e/critical-flows.spec.ts` em `origin/main` pede `getByLabel("Tenant ID")` nas l.96/312/321; `git grep 'Tenant ID' origin/main -- frontend/src` → 0 ocorrências. A evidência sustenta a pré-existência; mas o escopo é declaração do jurado (§C7.1-ter(a)) — ver R6.

### 2.2 Ciclo ≥ 3? — N/A
Ciclo 1. `git ls-tree bb540fb3 agent-orchestration/omega/{juntas,reprovacoes}` filtrado por `SAN3-01` → nada. Crítico e PD não são exigidos (§C7.4). (As atas `J-SAN3-plano-ciclo1/2` e `R-SAN3-plano-*` são do PR #386 — o plano —, outro objeto.)

### 2.3 Plano do ciclo: head, §5 arquivos, §9 bateria com forma — VERDE
`agent-orchestration/omega/planos/B-SAN3-01-plano.md` existe em `bb540fb3` (519 linhas). §5 lista os arquivos com caminho exato e ação; §6.1 dá o baseline **com forma** (`npm --prefix frontend run test:smoke`, `# tests 1126 / # pass 1126 / # fail 0 / EXIT=0`, head `fef2421b`, log nomeado); §6.3 o protocolo do vermelho-controle (commit A só testes → `# fail`; commit B → 0); §8.1 a bateria **na ordem e com a forma** (comandos exatos, esperado por passo). O head julgado é nomeado no briefing e no comando (o plano precede o código; nomeia `fef2421b` como terreno do planejamento). O comando `B-SAN3-01-web-wo-sem-fallback-fabricado.md` traz escopo permitido/proibido e as emendas 1 e 2 do orquestrador.

## 3. Papéis (§C7.4-bis)

### 3.1 / 3.1-bis Inelegibilidade — VERDE com ressalva (R7)
- **Obituário primeiro** (`OBITUARIO-IDENTIDADES.md`, mesmo blob `bcd2063a` em `bb540fb3` e `origin/main`; 31 registradas / 31 SEPULTADAS / 0 RESERVADAS): nenhuma das 6 identidades (`validador-mestre`, `master-teste-telas-rotas`, `cognicao-visual`, `agente-ci-doutor`, `inspetor-de-rotas`, `frontend-pixel-master`) consta como sepultada/reservada; o trecho "não se sepultam" (l.128-129) as classifica como contratos de papel.
- **grep nas atas** (`J-*`, `reprovacoes/`, `docs/juntas/` em `bb540fb3`): `P-008` aparece em **0** atas. Votantes do ciclo anterior: **não há ciclo anterior**. Planejador (`planejador-mestre`), dev (`general-purpose`), orquestrador, `porteiro-pos-merge`, inspetor: nenhum está na composição. Participação registrada em outro objeto (#386, o plano): `validador-mestre` = C3 de `J-SAN3-plano-ciclo1` (REPROVADO); `agente-ci-doutor` = C3 de `J-SAN3-plano-ciclo2` (APROVADO) e conferência de aplicação — não é ciclo anterior deste bloco; fica para a ata.
- **Achador do P-008:** registro original em `13b1fcb3` (2026-07-07, #136, dev do bloco C2 — nota de convenção do módulo); a graduação **ALTA/BLOQUEIA** veio do inventário SAN3, fatia C1 (`docs/revisoes/SAN3/inventario/inventario-C1.md`, 2026-09-11, head `15ef3fbe`), cujo inventariante **não é nomeado** na ref (`PLANO_SAN3.md` l.8-9: "8 inventariantes somente-leitura"). As duas menções de cadeiras nos inventários (A1:5 `validador-mestre`, C2:25 `cognicao-visual`) são datas de origem de outras pendências, não autoria. Ver R7.

### 3.2 Composição cobre a competência — RESSALVA (R1)
Achado central: **fail-closed do frontend** (ramo de erro devolve estado, nunca dado — perda de dado). O plano §8.5 propunha `C3 = guardiao-fail-closed` com as mutações G1/R1/reducer-403 e `cognicao-visual` como voto de fidelidade; o briefing fixa C1 `validador-mestre` / C2 `master-teste-telas-rotas` / C3 `cognicao-visual` e transfere as mutações para a C1. O corpo de `validador-mestre` em `bb540fb3` tem **0** ocorrências de `muta`/`vermelho-controle`/`fail-closed` (só "Mutações gravam AuditLog"). A competência está no texto do mandato, não no corpo da cadeira.

### 3.3 Corpo carregado × corpo julgado · cláusulas citadas — VERDE
- md5 EOL-neutro (blob `bb540fb3` × disco da árvore principal × `origin/main`), todos em `.claude/agents/` raiz: `validador-mestre` `804d89f0…` **IGUAL** · `master-teste-telas-rotas` `2c01e7c2…` **IGUAL** · `cognicao-visual` `59632cb9…` **IGUAL** · `agente-ci-doutor` `55979e2c…` **IGUAL** · `inspetor-de-rotas` `23e135b3…` **IGUAL** · `frontend-pixel-master` `bfa8443a…` **IGUAL**. `model:` — nenhum fixa (só `frontend-pixel-master: inherit`).
- Cláusulas citadas: os 6 corpos citam **0** `§` (contagem do byte `\xc2\xa7`). O briefing cita `§A7`, `§C3`, `§C7.1-ter(b)`, `§7`, `§11`, `§3` e §§ do plano — **todas existem** em `CLAUDE.md@bb540fb3` (`## A7.` l.103; `1-ter` l.359; `1-bis` l.391; `4-bis` l.432; `6-bis` l.462; `D-JUNTA-RESILIENTE` P1–P6 l.510-560). Nenhuma `quater` citada.

## 4. Fatias de orquestração

### 4.1 S0 — espelho Codex — VERDE
No meu worktree em `bb540fb3`: `node scripts/sync-agent-agents.mjs --check` → **ec=0**, `[agents-sync] OK — 23 agentes, espelho consistente.` Cruzamento recursivo por `git ls-tree -r bb540fb3`: conjuntos de nomes `.claude/agents/**` × `.agents/agents/**` (menos `README.md`) **idênticos** (23 × 24); `especialistas/` = 0 arquivos nos dois lados; `jurado-san3c2-*` = 0 (dívida A2 do #386 paga na ref). O script é o mesmo blob em `bb540fb3` e `origin/main` (`093a6b93`); o da árvore principal está modificado — por isso rodei o da ref.

### 4.2 Baseline honesto, medido agora — VERDE
Worktree limpo em `bb540fb3` (`status --porcelain` vazio antes e depois), exit por variável:
- `npm ci` → ec=0 (326 pacotes) · `npx prisma generate` → ec=0 · **`npm run check` → ec=0** (`tsc -p tsconfig.json --noEmit`).
- `npm --prefix frontend ci` → ec=0 (103 pacotes) · **`npm --prefix frontend run check` → ec=0** (`tsc -b --noEmit`).
- Extra (trilha do bloco): `npm --prefix frontend run test:smoke` → **ec=0, `# tests 1173 / # pass 1173 / # fail 0`** (meta do plano ≥ 1166; bate com a afirmação do dev 1173/1173). `node --check Kpis/app.js` ec=0; `node scripts/kpi-freeze.mjs --check` ec=0 ("em dia (snapshot 2026-09-17)").
- `git diff --check origin/main bb540fb3` → **ec=0**.

## 5. Quórum

### 5.1 Plano de perda de jurado — VERDE
Briefing §4: suplente nomeado re-executa o mandato inteiro; voto perdido não conta; menos de 3 votos de mérito não fecha; toda queda em `votos/B-SAN3-01/00-quedas.md` (P6). Suplentes nomeados por cadeira (§1). P5 (≤2 em paralelo) e P1/P2 declarados.

## Itens extras do briefing do orquestrador

### Correção pós-commit `ab3722af` → `74f3f7c9` — VERDE
`git diff --check origin/main ab3722af` → **ec=2** (trailing whitespace em `apoio/e2e-commitB-2.log`, `e2e-conf-E1E3.log`, `e2e-dev3-rastreado.log`; "new blank line at EOF" em `apoio/e2e-copia-avulsa.spec.ts:196`). `git diff --check origin/main 74f3f7c9` → **ec=0**. Correção confirmada.

### Contêineres/portas do bloco × das cadeiras · Redis — VERDE com ressalva (R2)
`bsan301-pg` 32768 e `bsan301-redis` 56385 são do bloco; nomes `j-bsan301-*` **livres** (`docker ps -a --filter name=j-bsan301` → nada). Portas de app: `3200` (default `E2E_API_PORT`), `5173` (default `E2E_FRONTEND_PORT`), `3299/5199` (as do dev) e `6379` **não escutam** (`netstat`); nenhuma cai nas faixas excluídas do Windows (`netsh … excludedportrange`: 5357, 49680-50559, 51083-51918, 56500-57306, 60966-61165). **`5432` escuta — e é `pastrack-banco-1`**, não o `erp-postgres` (Exited). `erp-redis` Exited → `redis://localhost:6379` default = `ECONNREFUSED` (coerente com a medição do orquestrador em `00a` §5).

## Veredito

**`LIBERADO COM RESSALVA`.**

Nenhuma condição de `BLOQUEADO` se materializou: head existe e é o nomeado, árvore sem mutação viva, plano de isolamento escrito e verificável, nenhum resíduo com privilégio ou mutação, ciclo 1 sem fato herdado de ata, S0 verde na ref, baseline verde medido agora em worktree limpo, zero colisão de nome no obituário e nas atas, corpos das 6 cadeiras idênticos entre blob da ref e árvore da sessão.

## Ressalvas nomeadas (para o prompt das cadeiras e a ata)

- **R1 (forte) — Cadeira de fail-closed ausente; competência delegada por texto.** O plano §8.5 dava a `guardiao-fail-closed` as mutações G1 (reintroduzir `?? getMock…`), R1 (stale → apagar) e a do reducer de 403; o briefing as entrega à C1 `validador-mestre`, cujo corpo não carrega essa competência (0 menções). O dono/orquestrador decide se basta (§3.2). Se mantiver: o prompt da C1 traz as três mutações **explícitas, cada uma com o teste que deve ficar vermelho e a forma**, e a ata registra a substituição e o porquê.
- **R2 (forte) — Porta 5432 é banco de OUTRO projeto.** `pastrack-banco-1` (`postgres:16-alpine`) escuta em `127.0.0.1:5432`; `erp-postgres` está Exited. O default de `playwright.config.ts` (`postgresql://postgres:***@localhost:5432/erp_techsolutions`) e qualquer `.env` herdado apontam para lá. **Toda cadeira exporta `DATABASE_URL` e `REDIS_URL` explícitas para os seus `j-bsan301-<cadeira>-pg/-redis` antes de qualquer `db:seed`, `migrate`, `npm test` ou e2e**; rodar sem elas é escrever num banco alheio ou cair em `ECONNREFUSED`. A cadeira prova no voto a URL usada.
- **R3 — Head do PR ≠ objeto julgado.** PR #387 tem head `74f3f7c9`; a junta julga `bb540fb3`. Delta medido = 10 arquivos só de registro da junta (zero código). A ata registra "conteúdo julgado `bb540fb3`; head do PR na junta `74f3f7c9` (+docs)"; qualquer commit novo na branch antes do merge reabre a inspeção; o porteiro confere o merge contra `bb540fb3` + esses 10.
- **R4 — Corpo do inspetor diverge na árvore da sessão** (disco `934a8b08…` × ref `33dc3256…`); o gate rodou com o corpo da `origin/main`. Instrução ao invocador: manter o `git show origin/main:.claude/agents/<papel>.md` no prompt dos gates (inspetor, porteiro, planejador) até sincronizar a árvore da sessão; a árvore principal carrega 6 modificados + 22 untracked de outras sessões (lista em 1.3) — nenhum é cadeira desta junta.
- **R5 — Resíduos inertes alheios (reportar, não varrer):** `.claude/worktrees/san2-r` (diretório vazio, não registrado, 2026-09-02); `erp-postgres-alt` (Exited 255, 55432, origem não declarada); `crit-b04a-pg` (Up, do bloco `b04a` — prefixo `crit-*`, não desta junta).
- **R6 — Escopo pré-declarado no briefing.** "O e2e rastreado morre no login desde 2026-07-02 … não reprova este bloco" é insumo com evidência (eu a medi: `d5a4ed43`/#111 em `LoginPage.tsx`; spec da `main` l.96/312/321 pede "Tenant ID"; `frontend/src` sem o rótulo). Ainda assim, **quem declara `pre-existente` é o jurado, com evidência própria** (§C7.1-ter(a)); C1 e C2 re-medem e declaram. E a "cópia avulsa" (`apoio/e2e-copia-avulsa.spec.ts`) difere do spec rastreado em **411 linhas**: é um **subconjunto** (E1–E3 + 3 auxiliares; sem o `beforeAll` Prisma e sem os outros 10 casos) — a identidade que a C2 confere é **por função**, como o cabeçalho do arquivo diz, não por arquivo.
- **R7 — Achador da graduação ALTA do P-008 não nomeado na ref.** O inventário SAN3 fatia C1 (2026-09-11) não nomeia o inventariante. Atas: 0 menções a `P-008`; obituário: nenhuma cadeira. **O orquestrador declara na ata, por escrito, que nenhuma das 6 identidades da composição foi o inventariante da fatia C1** (só ele sabe quem rodou). Registra também a participação de `validador-mestre` (C3, ciclo 1) e `agente-ci-doutor` (C3, ciclo 2 + conferência) na junta do PR #386 — outro objeto, não é colisão pela regra.
- **R8 (nota) — C2 só como `tenant_admin`.** O plano §8.5 pedia `tenant_admin` e `operator`; o briefing reduz a `tenant_admin` (o seed só cria esse usuário). Decisão do orquestrador; a C2 registra no voto que a prova por papel `operator` fica nos testes unitários (CE-G2, §7 do plano), não no e2e.

## Limpeza

Criei e derrubei: worktree `.claude/worktrees/insp-bsan301` (com `node_modules` raiz e `frontend/`, `npm ci` próprios — removido por `git worktree remove --force` pelo nome); logs `insp-*.log` no scratchpad (apagados). **Nenhum container, volume ou banco** criado; nada escrito em `bsan301`, na árvore principal, na base viva ou em qualquer worktree alheio. Evidência da remoção apensada abaixo.

```
$ git worktree list | grep -c insp-bsan301
0
$ ls .claude/worktrees/
b04a b11 bsan301 bsan304a gov-descuido gov-elenco san2-r vc-b-o6r-11
$ docker ps -a --format '{{.Names}}' | grep -ciE 'insp|j-bsan301'
0
$ git -C bsan301 status --porcelain | wc -l
0
$ git -C bsan301 rev-parse --short HEAD
74f3f7c9
```

- **Estado deste arquivo:** FINAL (2026-09-18).

- **Adendo à R5 (medido ao fechar, 2026-09-18):** durante a inspeção surgiu um 9º diretório em `.claude/worktrees/`, `vc-b-o6r-11` (não existia no lote anterior). `git worktree list`: C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/vc-b-o6r-11 9dea0ef6 (detached HEAD). É de outra sessão (bloco `B-O6R-11`): **nem resíduo desta junta, nem alvo** — reportado, não tocado. Confirma que há sessões concorrentes escrevendo em `.claude/worktrees/`; as cadeiras removem **só pelo próprio nome** (`j-bsan301-<cadeira>`).
