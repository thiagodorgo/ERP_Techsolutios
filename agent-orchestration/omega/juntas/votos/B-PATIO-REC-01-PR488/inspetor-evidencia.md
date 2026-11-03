# Evidência incremental (P1) — inspetor-j488-opus, junta do PR #488

Identidade `inspetor-j488-opus`, papel inspetor-de-terreno-da-junta, Claude Opus 5.5 (nível menor, DECLARADO).
Corpo lido em `origin/main` (`git show origin/main:.claude/agents/inspetor-de-terreno-da-junta.md`), após `git fetch`.

## 1. Objeto
- cmd: `gh pr view 488 --json headRefOid` · `gh api repos/thiagodorgo/ERP_Techsolutios/commits/ea6d4aef…/check-runs`
- saída: headRefOid = ea6d4aef54181a0dc4030ec56e174e378aec5e12 (OPEN, ramo feat/patio-rec-01-dominio); total_count 16, todos `completed/success` (docker, backend, backend-postgres, owner-portal, frontend, authority-portal, flutter, antivirus, ×2 — push + pull_request).
- parcial: VERDE.

## 2. Mutação viva
- cmd: `git worktree list` · `git -C C:/Users/thiag/w-rec01 status --porcelain` · `git rev-parse HEAD` · processos com `w-rec01|j488|rec-01` (Win32_Process)
- saída: o worktree do dev `C:/Users/thiag/w-rec01` AINDA EXISTE, no ramo `feat/patio-rec-01-dominio`, HEAD = ea6d4aef (= objeto), porcelain 0 linhas, stash vazio; nenhum processo node/codex vivo nele (só a fila `fila-j488.sh`, que espera este parecer); registro `agentes-vivos.tsv:360` dá o dev como `concluido`. Container `rec01-pg` não existe (só erp-postgres/erp-redis).
- parcial: VERDE COM RESSALVA (a premissa do mandato "já não tem worktree" é falsa; o worktree existe, mas está limpo e igual ao objeto).

## 3. Insumos
- cmd: `ls planos/ revisoes/` · `grep -n '^## ' emenda-1` · `git cat-file -e ea6d4aef:docs/revisoes/PATIO/B-PATIO-REC-01-dev.md`
- saída: plano-v3.md (212 KB, §9.1 na l.953), emenda-1.md com §§0–11 (§11 na l.2182), prerev-488-parecer.md (VEREDITO: APROVADO, objeto ea6d4aef), diário no objeto (287 linhas, última `PRONTO PARA VERIFICAÇÃO`).
- parcial: VERDE.

## 4. Inelegibilidade
- cmd: `grep -rl jurado-j488-* / j488-c[123]` em revisoes, planos, prompts, todo `erp-pausa-2026-10-03`; `git grep j488 ea6d4aef`; OBITUARIO-IDENTIDADES.md em origin/main
- saída: os nomes só aparecem nos prompts dos próprios jurados, no BRIEFING e no agentes-vivos.tsv (linha da fila); 0 no objeto e no diário; 0 no obituário. Papéis do bloco: autor do plano/emenda `emenda-patio-v3-opus`; críticos `crit-patio-v3e1-sol`, `crit-patio-v3e1-r2-sol`, `crit-patio-s8-sol`, `crit-patio-s9-sol`; dev `dev-rec01-opus`; pré-revisor `prerev-488-sol`. Nenhuma colisão.
- parcial: VERDE.

## 5. Isolamento planejado
- cmd: `docker ps -a` · `netstat -ano` (55491/2/3) · `ls w-j488-c*` · Win32_OperatingSystem · Get-PSDrive C
- saída: só erp-postgres e erp-redis (Up 6 h, ambiente externo); portas 55491/55492/55493 livres; w-j488-c1/c2/c3 não existem; memória de commit livre 31,6 GB, física livre 7,3 GB; disco C livre 274,95 GB. Briefing: worktree próprio + `npm ci` + Postgres próprio por cadeira, proíbe erp-*, 3000/5173/5432/6379, o worktree externo da apresentação, árvore principal, prune e down -v.
- parcial: VERDE.

## 6. Fatia S0, baseline e corpos (worktree descartável `C:/Users/thiag/w-insp488`, detached em ea6d4aef, `npm ci` próprio)
- cmd: `node scripts/sync-agent-agents.mjs --check` → `ec=0`, `[agents-sync] OK — 95 agentes, espelho consistente.`
- cmd: `npm run check` (exit por variável). 1ª tentativa ec=2 (TS2305 `@prisma/client` sem `PrismaClient`): cliente Prisma não gerado. `npm run db:generate` sem `DATABASE_URL` falha (PrismaConfigEnvError). Com `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npm run db:generate` (ec=0, como o passo "Generate Prisma Client" do job backend, ci.yml l.97) → `npm run check` ec=0.
- cmd: `node scripts/migration-transaction-guard.mjs` → ec=0, `migrações: 120 · anteriores: 112 · novas: 8 · violações: 0`; `git diff --check <merge-base> HEAD` ec=0; porcelain 0 depois de tudo.
- cmd: md5 EOL-neutro (`tr -d '\r' | md5sum`) de `.claude/agents/inspetor-de-terreno-da-junta.md` e `critico-adversarial.md` no objeto, em origin/main e na árvore da sessão → iguais (cbbed450…, ae0a0461…); `git diff --name-only 7c89c73b ea6d4aef -- .claude/agents .agents/agents CLAUDE.md` = 0 linhas; `D-JUNTA-FLUXO-RAPIDO` e `D-UM-FAZ-OUTRO-VERIFICA` existem no CLAUDE.md do objeto.
- cmd: `git rev-list --count ea6d4aef..origin/main` = 5 (origin/main = 2e7987bd); `git merge-tree --write-tree origin/main ea6d4aef` sem conflito; interseção dos arquivos mudados (ceb62a07..origin/main × ceb62a07..ea6d4aef) = vazia; nenhuma migração nova na main.
- parcial: VERDE.

## 7. Perda de jurado (P3) e paralelismo (P5)
- cmd: `cat BRIEFING.md` · `cat ferramentas/fila-j488.sh` · `grep -A30 'roda()' ferramentas/fila-lib.sh`
- saída: o briefing traz o P3 do sucessor (re-executar a evidência do caído), mas NÃO declara a regra de quórum para voto perdido nem o P5. A fila lança C1 e C2 juntas (2 em paralelo) e re-dispara cada uma até 4 vezes (`roda`, tags `j488c1-1..4`) com o MESMO prompt e a MESMA identidade `jurado-j488-c1-sol`; depois de 4 quedas, loga `PARA`. A C3 (Claude) será lançada pelo orquestrador: se nascer enquanto C1 e C2 rodam, são 3 em paralelo.
- parcial: RESSALVA FORTE (não bloqueia, §5.1 do corpo).
