# B-ASS-08 parte 1 (PR #522) — diário do 2º CONSERTO (dev), incremental (P1)

- **Dev:** identidade NOVA e exclusiva `dev-522-c2`, **Claude Opus 5.5 — nível menor DECLARADO** (§C7.6). Não achei (o
  diagnóstico é do workflow `causa-raiz-t-obx-db-1`), não planejei (síntese `sint-c2-opus`; emendas §13 e §14
  `topo3-j522-opus`), não critiquei (`crit-522-c2`, Codex) e não vou conferir. Não sou o `ass08c1` (dev do 1º conserto).
- **Cruzamento (§C7 item 11(1)):** o dev é Claude; a conferência e as cadeiras C2/C3 refeitas são de outro modelo.
- **Plano (fonte única):** `erp-pausa-2026-10-03/planos/B-ASS-08-conserto-c2.md`, §0–§14. A **§14 prevalece** sobre o E5 (§2.2,
  §4) e o E5′ (§13.2): o claim é o **E5″** (demonstrativo e linha da fila numa instrução só, o demonstrativo PRIMEIRO, as duas
  cláusulas com SKIP LOCKED, sem laço de adiamento; teto declarado de 2 000 ms por claim em N = 20 000). A §13 vale no resto
  (E6′/E7′, T-LOCK-2). A crítica de outro modelo fez 2 rodadas (`revisoes/ci522/crit-522-c2-r2.json`: VOLTA só em
  C2-CLAIM-STARVATION-25 + C2-CLAIM-BUDGET-STARVATION, ambos cobertos pela §14); não há terceira.
- **Ref medida (§A7):** `git rev-parse origin/feat/b-ass-08-outbox-webhooks` = `807deb7eda80be65393f2ec2ce75f2be52d0d76b`
  (o objeto do mandato). O ramo local estava em `0b5d7d0d`, ancestral do remoto (`git merge-base --is-ancestor` verdadeiro;
  2 commits atrás: o merge `807deb7e` e o `75572269`): avançado por `git merge --ff-only`. Nenhum código lido do disco de
  outra sessão; as sondas de `revisoes/ci522/topo3-sondas/` e `topo4-sondas/` são só referência de comportamento.
- **Terreno:** worktree próprio `C:/Users/thiag/w-dev522` (caminho curto), `npm ci` próprio (sem junction, §C7.1-ter(c)),
  `prisma generate` com `DATABASE_URL` fictícia. Postgres 16 descartável `dev522-pg` em `127.0.0.1:5496` (imagem
  `postgres:16-alpine`, padrões da CI: `max_connections 100`, `shared_buffers 128MB`); trabalhos Docker na máquina: `ci522-pg`
  + `dev522-pg` = 2 (teto). O `-db` usa o administrador do MEU cluster só para montar a base própria; o código sob teste roda
  em papel efêmero `NOSUPERUSER NOBYPASSRLS` (`createEphemeralRole`). Intocados: `w-ass08`, `w-users-seg`, `w-dev525*`,
  `w-ci522-*`, `w-demoint`, `w-crit*`, os containers `ass08pg`, `ass08redis`, `users-seg-pg`, `dev525-pg`, `ci522-pg` e as
  portas 3000/5173/5432/6379.
- **Memória (acréscimo do orquestrador):** medida antes do `npm ci`, do container e de cada suíte pesada; só sigo com
  ≥ 4 GB de commit livre (`(Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory/1MB`).

## F0 — terreno e linha de base

| hora (SP, `date`) | comando | saída resumida | veredito parcial |
|---|---|---|---|
| 07:16:33 | `date`; memória; `docker ps` | commit livre **4,87 GB**, RAM livre 1,12 GB; Docker: só `ci522-pg` | terreno com vaga para 1 container |
| 07:16 | `git fetch origin`; `git rev-parse origin/feat/b-ass-08-outbox-webhooks`; `git worktree list` | `807deb7e…`; nenhum worktree no ramo; `w-dev522` inexistente | objeto conferido |
| 07:17 | `git worktree add C:/Users/thiag/w-dev522 feat/b-ass-08-outbox-webhooks` → `git merge --ff-only origin/feat/b-ass-08-outbox-webhooks` | `HEAD is now at 0b5d7d0d` → fast-forward → `git rev-parse HEAD` = `807deb7eda80be65393f2ec2ce75f2be52d0d76b` | HEAD = objeto do mandato |
| 07:17 | `git merge-tree --write-tree 807deb7e origin/main` (exit 0); `git diff --name-only 807deb7e...origin/main` | sem conflito; a `main` (`699e6e20`, #526, registro) traz 6 arquivos, todos de `agent-orchestration/` (decisões, status, ata J-522, porteiro-424, J519-C3) — interseção com o PR vazia | merge limpo, como o plano mediu (F0) |
| 07:17 | `git merge --no-ff origin/main` | merge `793fa01e8f8e29decd31da32fdc813e069867614` | **`BASE_C2 = 793fa01e`** (E11: a base da checagem de escopo) |
| 07:17:41 | memória antes do `npm ci` → `npm ci --no-audit --no-fund` | 4,75 GB → `added 326 packages in 42s`, exit 0 | dependências próprias |
| 07:19:30 | `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` | cliente gerado (sem `DATABASE_URL` o `prisma.config` recusa: `PrismaConfigEnvError`) | cliente próprio |
| 07:22:07 | memória → `docker run -d --name dev522-pg -p 127.0.0.1:5496:5432 postgres:16-alpine` | 4,39 GB; `PostgreSQL 16.15`; `show max_connections` 100 (recriado sem `-c max_connections=60`, para espelhar a CI) | banco descartável próprio de pé (2 trabalhos na máquina) |
| 07:23:00→07:23:53 | `DATABASE_URL=postgresql://postgres:dev522@127.0.0.1:5496/postgres npm test -- tests/ass-08-*.test.ts` | 12 arquivos · `# tests 72 · pass 72 · fail 0 · cancelled 0 · skipped 0` | **linha de base**: o verde que o conserto não pode enfraquecer (o T-OBX-db-1 antigo passou nesta execução; a intermitência é a corrida real F3) |
