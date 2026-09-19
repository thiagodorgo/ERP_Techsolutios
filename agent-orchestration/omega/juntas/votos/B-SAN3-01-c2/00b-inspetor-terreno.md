# Parecer do inspetor de terreno — junta do B-SAN3-01, CICLO 2 (o último)

- **Papel:** `inspetor-de-terreno-da-junta` · **Modelo que rodou:** Fable 5.1 (`claude-fable-5-1`) — o contratual, sem fallback
- **Corpo aplicado:** `origin/main:.claude/agents/inspetor-de-terreno-da-junta.md` (md5 EOL-neutro `33dc3256…`, = `8adaaa31`), lido por `git show` antes de qualquer ação. **Nota 3.3 aplicada a mim mesmo:** o corpo que a sessão me carregou é o da árvore principal (`demo/investidor`, `3b4837ae`, md5 `934a8b08…`): **não tem** 3.1-bis, 3.3 nem o fallback Opus (grep → 0; na ref → 3). Apliquei o da ref.
- **Objeto:** `8adaaa31f3709e2a01ad81b8154aba0243fa7a66` (branch `fix/web-wo-sem-fallback-fabricado`, PR #387); base `origin/main@02bd7dab`
- **Data:** 2026-09-18 · gravação incremental (P2). Logs de apoio nesta pasta: `insp-*.log`.

> Este parecer NÃO julga o mérito. Julga o tabuleiro.

## Veredito

**LIBERADO COM RESSALVA** — nenhum item do corpo ficou vermelho; 9 ressalvas nomeadas abaixo (R-A a R-I), uma delas forte (R-D). Nenhuma verificação ficou sem execução.

## 1. Isolamento

### 1.1 Head existe, é o nomeado, árvore limpa — VERDE
- `git -C bsan301 rev-parse 8adaaa31` → `8adaaa31f3709e2a01ad81b8154aba0243fa7a66`; `HEAD` do `bsan301` = `8adaaa31`, branch `fix/web-wo-sem-fallback-fabricado`.
- `gh pr view 387 --json headRefOid,state` → `headRefOid: 8adaaa31f37…`, `state: OPEN`, base `main`. **Head do PR = objeto.**
- `git -C bsan301 status --porcelain` → **vazio**. `git merge-base --is-ancestor ec8492fd 8adaaa31` → ec=0 (a correção `git diff ec8492fd 8adaaa31` é bem definida; 9 commits, de `e3db4d62` a `8adaaa31`).
- md5 EOL-neutro (CR removido) blob × disco do `bsan301` (worktree do dev): **SAME** nos 10 arquivos centrais (`work-orders.state.ts`, `WorkOrdersPage.tsx`, `WorkOrderDetailPage.tsx`, `StatePanel.tsx`, `repository.ts`, `work-orders.service.ts`, `work-orders.adapter.ts`, `useWorkOrders.ts`, `dispatches.service.ts`, `work-orders-honest-errors.test.tsx`). Sem mutação viva.
- `git log ec8492fd..8adaaa31 -- tests/e2e/` → vazio; `git diff --stat ca7c5d04 8adaaa31 -- tests/e2e/critical-flows.spec.ts` → vazio. A afirmação do briefing "nenhum commit do ciclo 2 tocou o spec" **confere**.

### 1.2 Plano de isolamento declarado no briefing — VERDE
`BRIEFING-B-SAN3-01-ciclo2.md` §0 (herdado do v2, vale para o ciclo 2): worktree próprio detached em `8adaaa31` por cadeira (`j-bsan301-<cadeira>`), `npm ci` próprios, sem junction; Postgres descartável próprio `j-bsan301-<cadeira>-pg` + Redis `j-bsan301-<cadeira>-redis`, `DATABASE_URL`/`REDIS_URL` explícitas, URL citada no voto; base viva (`erp-postgres`, `erp-redis`) fora de alvo; a 5432 nomeada como `pastrack-banco-1`; tudo removido pelo nome. Os 3 requisitos do item estão escritos.

### 1.3 Resíduo de jurado anterior — VERDE com nota (R-G)
- `docker ps -a` → **nenhum** `j-bsan301-*`, `dev-bsan301-c2-*`, `jur-*`, `crit-*`, `insp*`. Vivos: `bsan301-pg`/`bsan301-redis` (orquestrador, declarados), `j-b04a-c1/c2-*`, `j-bsan304a-c2-*` (outras juntas, declarados), `pastrack-*` (outro projeto), `erp-postgres`/`erp-redis`/`erp-postgres-alt` **Exited**.
- `git worktree list` → nenhum `j-bsan301-*`. Os `j-b04a-c1/c2`, `j-b11-c2/c3`, `j-bsan304a-c2/-base` são os declarados; **`j-bsan304a-c3`** apareceu registrado às 19:36 (outra junta, em curso, não é desta). Diretório **`.claude/worktrees/san2-r`** existe **vazio** (02/09), não registrado — resíduo inerte alheio; reporto, não varro.
- Árvore `bsan301`: sem `jur-probe*`, `*-probe.ts`, `_c2-*.spec.ts`; `tests/e2e/` só com `critical-flows.spec.ts`. Ignorados (inertes, do dev do ciclo 2): `frontend/tsconfig.tsbuildinfo`, `test-results/.last-run.json`, 55 pastas em `storage/checklist-attachments/` (gitignored, subproduto do `npm test`), `mobile/flutter_app/android/.gradle/`.
- Árvore principal (`demo/investidor`): 6 ` M` + ~30 `??` (especialistas Ω6R, atas O6R-07a/SAN2-6/B-O6R-02-ciclo5, `scripts/audit-agents-skills.mjs`) — resíduo de outras sessões, nenhum toca esta junta; reportado, não varrido.

## 2. Insumos do briefing

### 2.1 Ata do ciclo anterior, marcada "a re-verificar" — VERDE com ressalva leve (R-A)
- Existem na ref (`git ls-tree 8adaaa31`): `J-B-SAN3-01.md` (`d59e289c`), `R-B-SAN3-01-ciclo1.md` (`6ee570a4`), `B-SAN3-01-ciclo2-plano.md` (`94abddf3`), comando com emendas 3 e 4 (`4ffcade9`, l.143–182), `00-dev-ciclo2.md` (`382f4165`), `00-quedas.md`, `C4-guardiao-fail-closed-evidencia.md`, `apoio/e2e-copia-avulsa.spec.ts`.
- O briefing do ciclo 2 manda cada cadeira **remedir**: C1 reexecuta a bateria e o vermelho-controle do commit A; C4 reexecuta F403a/b/c e as mutações do ciclo 1 "e diga quais ficam vermelhas e por quê"; C3 mede "de novo" C3-B1/A1/A2/A3; C2 refaz E1–E3 no objeto. Nenhuma conclusão da ata do ciclo 1 é repassada como fato estabelecido sem ordem de medir.
- **R-A (leve):** o §3 "A re-verificar" ainda é o texto do ciclo 1 (cita `00-dev.md` 2ª/3ª instâncias e o censo de 350/19); **não nomeia** `00-dev-ciclo2.md` nem as aceitações da emenda 4 (u)/(v) — "medido", "é a propriedade P1 funcionando" — como afirmações a re-verificar. Os mandatos §2-bis já cobrem, mas a linha deve entrar para fechar a porta.

### 2.2 Ciclo ≥ 3 (crítico + PD) — N/A
Ciclo 2 sob `D-TETO-DOIS-CICLOS`; não há ciclo 3. Briefing declara "sem crítico (bloco não é de invariante financeiro)". Item não se aplica.

### 2.3 Plano do ciclo: head, §5 arquivos, bateria com forma — VERDE
Plano do ciclo 2 completo (§0–§10, `planejador-mestre` Fable 2ª instância, medições em §0). Nomeia o objeto do replanejamento (`bb540fb3`); o objeto do ciclo 2 (`8adaaa31`) está nomeado no briefing e na emenda 4. §4 lista arquivo a arquivo (permitidos e "não tocados de propósito"); §6 bateria com **forma** (cwd `frontend/` para o teste do bloco, `DATABASE_URL`/`REDIS_URL` explícitas, N esperado por comando). Divergência de N conhecida e decidida: §6 esperava smoke ≥1195 / bloco ≥69; o dev mediu 1193 / 67 (D-C2-2, aceita na emenda 4 (v)) — a C1 remede.

## 3. Papéis

### 3.1 / 3.1-bis Inelegibilidade por nome — VERDE com ressalva (R-B, R-C)
- **Obituário lido primeiro** (`OBITUARIO-IDENTIDADES.md` na ref, 31 sepultadas, 0 reservadas): `validador-mestre`, `master-teste-telas-rotas`, `frontend-pixel-master`, `coordenador-de-acessos`, `inspetor-de-rotas` → 0 ocorrências; `agente-ci-doutor` → 1, no §3.6 como "permanente que votou no #386 — o §4 não a cobre". Nenhuma SEPULTADA/RESERVADA.
- **grep nas atas do caso** (`J-B-SAN3-01.md`, `R-B-SAN3-01-ciclo1.md`, `BRIEFING-B-SAN3-01.md`, `votos/B-SAN3-01/**`): achadores do ciclo 1 = `cognicao-visual` (C3-B1) e `guardiao-fail-closed` (C4-01/02/03) — **nenhum dos dois** está na composição do ciclo 2. Planejador `planejador-mestre` e desenvolvedor `general-purpose` não votam. `frontend-pixel-master` e `coordenador-de-acessos` não assinaram voto nem acharam nada no ciclo 1.
- **R-B (nomeada, não bloqueia):** `validador-mestre` (C1) e `master-teste-telas-rotas` (C2) **votaram no ciclo 1** (APROVADO) e voltam às mesmas cadeiras. O meu corpo 3.1 lista "votante do ciclo anterior" como colisão; a norma superior `D-TETO-DOIS-CICLOS` item 2 (decisão do dono, `decisoes.md` l.1774-1775) exige **identidade nova só "na cadeira que reprovou"**, e é ela que `R-B-SAN3-01-ciclo1.md` (a) ("C1 e C2 revotam o objeto novo") e a emenda 3 (t) aplicam. Precedente na ref: `J-O6R-07a-ciclo2.md` l.15 — cadeira C3 "**mantida** (aprovou sem veto no ciclo 1 e não consertou nada)". Pela hierarquia §A1 (decisão do dono > contrato de agente) **não bloqueio**; registro o conflito (§A2) para a ata: a composição C1/C2 se sustenta na `D-TETO-DOIS-CICLOS`, não no corpo do inspetor.
- **R-C (nomeada, não bloqueia):** `frontend-pixel-master` e `coordenador-de-acessos` foram **suplentes nomeados** de C3 e C4 no briefing v2 do ciclo 1 (l.55-56) — **não acionados** (`00-quedas.md`: "nenhum suplente foi acionado"; nada em disco). O obituário §3.1 sepulta suplentes `nomeada-e-preparada` de identidades **descartáveis**; o §4 diz que papéis **permanentes** não são cobertos e a inelegibilidade deles é por caso (planejou/achou/votou) — nenhuma das três se aplica. A ata do ciclo 2 deve registrar essa leitura por escrito.

### 3.2 Composição cobre a competência dos achados — RESSALVA FORTE (R-D) + nota (R-E)
- Achados em julgamento: **C3-B1/A1/A2/A3** (fidelidade de estado, estilo computado) e **C4-01/02/03** (cadeia 403 → estado; guard G1 **por alcance, provado por mutação**; **enumeração fechada** com default erro).
- C3 `frontend-pixel-master` (corpo de 78 linhas na ref): replicação pixel-perfect, "NUNCA chuta valores visuais", extração de tokens, screenshot lado a lado — **cobre** C3-B1/A1/A2/A3. Mas o frontmatter traz `tools: Read, Write, Edit, …` e `model: inherit`, e o mandato diz "somente leitura no código" (M19) → **R-E**.
- C4 `coordenador-de-acessos` (corpo de **11 linhas** na ref): cadeia papel → permissões → menu → rota → backend com LOGIN REAL; **cobre C4-01** (403 → estado). Para **C4-02 e C4-03** o `grep -i` de `mutação|enumera|exaustiv|fail-closed` no corpo dá **0**; nos 23 corpos permanentes da ref só `guardiao-fail-closed` (13) carrega essa competência — e ele é inelegível (achou). A competência de mutação/enumeração da C4 vem **do texto do mandato** (§2-bis (2)-(3); plano §9 "mandato por extenso"), não do corpo — a **mesma classe da R1 do ciclo 1** (`00b-inspetor-terreno.md` l.85: "competência delegada por texto"), que então fez o orquestrador acrescentar a 4ª cadeira. → **R-D**.

### 3.3 Corpo carregado × corpo julgado — VERDE
md5 EOL-neutro (CR removido antes do `md5sum`) de `.claude/agents/<x>.md`: ref `8adaaa31` × árvore principal (de onde a sessão carrega) × disco `bsan301` × `origin/main` → **SAME** nas 6 identidades: `validador-mestre 804d89f0`, `master-teste-telas-rotas 2c01e7c2`, `frontend-pixel-master bfa8443a`, `coordenador-de-acessos a4141c31`, `agente-ci-doutor 55979e2c`, `inspetor-de-rotas 23e135b3`. Normas citadas nos mandatos (`D-TETO-DOIS-CICLOS`, §C7.1-ter(a)/(b), §C7.4-bis) existem na ref (`decisoes.md` l.1748; `CLAUDE.md` §C7). Único DIFF: o corpo do **inspetor** (cabeçalho deste parecer).

## 4. Fatias de orquestração

### 4.1 Fatia S0 — espelho Codex — VERDE
`cd bsan301 && node scripts/sync-agent-agents.mjs --check` → exit **0**, `[agents-sync] OK — 23 agentes, espelho consistente.` (`--check` não escreve: l.16 do script; `status --porcelain` depois → vazio; log `insp-s0-check.log`). Recursivo: `ls-tree -r` de `.claude/agents` × `.agents/agents` na ref → mesmos 23 nomes (+ `README.md` só no espelho, por desenho); **0 `especialistas/`** na ref. A comparação crua acusa os 23 porque o espelho é **adaptado** (sem `tools:` + bloco "Papel para o Codex"), conforme `D-INTEROP-CLAUDE-CODEX`; o instrumento canônico é o script.

### 4.2 Baseline honesto medido agora — VERDE
- Worktree **meu**: `insp2-bsan301` (detached em `8adaaa31`, `status --porcelain` vazio antes e depois), `npm ci` próprio (326 pacotes, 4 min, diretório real, sem junction), `npm --prefix frontend ci` próprio (103 pacotes, 3 min, sem junction). Node v20.19.5 / npm 11.7.0.
- `npm run check` (raiz, `tsc -p tsconfig.json --noEmit`) → **exit 0** (22:51:51Z → 22:57:09Z; exit por variável; `insp-npm-run-check.log`).
- `npm --prefix frontend run check` (`tsc -b --noEmit`) → **exit 0** (23:02:34Z → 23:03:51Z; `insp-frontend-check.log`).
- `(cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx)` → **# tests 67 · pass 67 · fail 0 · skipped 0**, exit 0 (`insp-bloco-67.log`) — bate com o "bloco 67" do dev.
- `(cd frontend && npm run test:smoke)` → **# tests 1193 · pass 1193 · fail 0 · cancelled 0 · skipped 0**, exit 0 (23:03:59Z → 23:05:03Z; `insp-smoke.log`) — bate com o "smoke 1193" do dev.
- **Não medi** (não é exigência do corpo 4.2; é mandato da C1/C2 com cluster próprio): backend `npm test` (dev: 2996/2998) e e2e E1–E3 (dev: 3/3). Ficam como **a re-verificar** (R-I). `npx prisma generate` sem `DATABASE_URL` → exit 1 `PrismaConfigEnvError` (R-H).

## 5. Quórum

### 5.1 Plano de perda de jurado — VERDE
Briefing ciclo 2 cabeçalho + §4: suplentes C1 `agente-ci-doutor`, C2 `inspetor-de-rotas`; C3/C4 sem suplente pronto → "se o titular cair duas vezes, a `agente-fabrica` cria a identidade"; "suplente re-executa o mandato inteiro; voto perdido não conta; menos de 4 votos de mérito não fecha; toda queda em `00-quedas.md` (P6)"; P5 (máx. 2 cadeiras em paralelo, levas C1+C4 e C2+C3). Declarado e interpretável.

## Ressalvas nomeadas (para o prompt das cadeiras)

| # | Força | Ressalva | O que o orquestrador põe no prompt / na ata |
|---|---|---|---|
| **R-A** | leve | §3 do briefing não nomeia `00-dev-ciclo2.md` nem as aceitações da emenda 4 (u)/(v) como "a re-verificar" | Uma linha no §3: smoke 1193, bloco 67, backend 2996/2998, e2e 3/3, "15 vermelhos em 67" no commit A, F403b inerte, 26/26 mutações restauradas, "E1 caía no plano literal" — **tudo afirmação do dev, a medir**; a emenda 4 aceita divergências, não prova |
| **R-B** | nomeada | C1 `validador-mestre` e C2 `master-teste-telas-rotas` votaram no ciclo 1 e revotam | A ata registra a base normativa: `D-TETO-DOIS-CICLOS` item 2 (identidade nova só na cadeira que reprovou) + precedente `J-O6R-07a-ciclo2.md` l.15; conflito com o corpo 3.1 do inspetor registrado (§A2). C1 e C2 declaram no voto que revotam sob essa regra e que não consertaram nada |
| **R-C** | nomeada | C3 `frontend-pixel-master` e C4 `coordenador-de-acessos` foram suplentes nomeados (não acionados) das cadeiras que reprovaram no ciclo 1 | Cada uma declara no voto: identidade nova, suplente nomeada no v2 sem ter sido acionada, nada lido do caso antes deste briefing; ata registra a leitura do §4 do obituário (permanentes: inelegibilidade por planejou/achou/votou) |
| **R-D** | **forte** | A competência de **mutação e enumeração** da C4 (C4-02, C4-03) vem do mandato por extenso, não do corpo (`coordenador-de-acessos`, 11 linhas, 0 menções; só `guardiao-fail-closed` a carrega e é inelegível). Mesma classe da R1 do ciclo 1 | **O dono decide se basta.** Opções nomeadas, sem consertar: (a) aceitar o mandato por texto — então o prompt da C4 leva os 26 specs do dev (`scratchpad/c2dev/mut/*.json`, existem, + `*.result.md`) e a evidência C4 do ciclo 1 com os comandos, e a C4 declara cada mutação executada com N e saída, inclusive as 3 que o corpo dela não saberia inventar (G1h/G1i por alcance, NSkind, L6M); (b) `agente-fabrica` cria um especialista de fail-closed **dentro do teto** (`D-TETO-DOIS-CICLOS` item 4) como 5ª cadeira ou no lugar da C4 — sem herdar o corpo de `guardiao-fail-closed` |
| **R-E** | nomeada | `frontend-pixel-master` tem `tools: Write, Edit` e `model: inherit`; o mandato manda "somente leitura no código" | Prompt da C3: escreve só no scratchpad e no próprio worktree (evidência), nunca no objeto; declara o modelo que rodou (herda o da sessão — não é Fable por contrato) |
| **R-F** | forte (infra) | Disco a **97 %** (`df`: 9,4 GB livres de 238 GB) antes das cadeiras; cada worktree com `npm ci` + `frontend ci` custa o medido na seção Limpeza | P5 já limita a 2 cadeiras simultâneas; cada cadeira **remove o próprio worktree e os contêineres pelo nome antes da leva seguinte**, e o orquestrador confere `df` entre as levas; sem isso a 2ª leva pode cair por disco, não por mérito |
| **R-G** | leve | Resíduos inertes alheios: `.claude/worktrees/san2-r` (vazio, 02/09, não registrado); ignorados no `bsan301` (55 `storage/checklist-attachments/`, `tsbuildinfo`, `test-results/`); árvore principal `demo/investidor` suja; `j-bsan304a-c3` nasceu às 19:36 (outra junta) | Ninguém varre nada disso durante a junta; nenhuma cadeira usa `git worktree prune`, `git clean` nem remove por nome de cadeira (só por nome de bloco: `j-bsan301-<cadeira>`) |
| **R-H** | prática | `npx prisma generate` na ref exige `DATABASE_URL` (`PrismaConfigEnvError`), não só o `migrate` | Prompt de C1/C2: exportar `DATABASE_URL`/`REDIS_URL` dos SEUS contêineres **antes do `prisma generate`**; portas fora das faixas excluídas (`netsh`: 49680–50559, 51083–51918, 56500–57306, 60966–61165) e distintas das em uso (32768, 56385, 56443–56464) |
| **R-I** | nomeada | Backend `npm test` (2996/2998) e e2e (3/3) **não medidos por mim** | C1 (backend, com Postgres+Redis próprios, forma do plano §6) e C2 (e2e pela cópia avulsa, base vazia E com OS) medem e citam N, forma e URL sem senha; nenhum número desses entra na ata sem a execução da cadeira |

## Limpeza

Criei para medir: o worktree `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/insp2-bsan301` (detached em `8adaaa31`, `npm ci` + `frontend ci` próprios, sem junction) — **removido pelo nome** com `git worktree remove --force` (exit 0); `git worktree list | grep -c insp2` → **0**; diretório ausente do disco; `docker ps -a | grep insp` → nenhum (não criei contêiner nem toquei em `bsan301-*`, `j-*`, `erp-*`, `pastrack-*`); `bsan301` e a árvore principal intocados (`status --porcelain` do `bsan301` vazio ao fim). **Custo medido de um worktree de cadeira** (para a R-F): `node_modules` 420 MB + `frontend/node_modules` 183 MB + árvore 56 MB ≈ **0,66 GB**; livre em `C:` depois da remoção: **12 GB (95 %)**. Ficam só no scratchpad desta sessão (fora da árvore): os logs `insp-*.log` desta pasta e este parecer.
