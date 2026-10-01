# Relatorio — papel `planejador-mestre` · identidade `planejador-b-san3-05-v3` · modelo **Fable** (claude-fable-5-1, o do frontmatter; sem substituicao) · mandato_md5 `068dbc0ee9bc5f1b0d3a80fd41ab3e69`

> Evidencia incremental (P1): cada secao e gravada AO MEDIR, com hora UTC, em MEDIDO (comando + saida) e HIPOTESE (com o comando que
> derruba). Logs longos ficam no scratch (`$SCR = /tmp/claude-0/-home-user-ERP-Techsolutios/ebd477e6-43d1-57c2-a4f1-24921d727a74/scratchpad/planejador-v3/`),
> que e efemero e nao conta como entregue. Papel: PLANEJO (§C7.4-bis) — nao escrevo codigo de produto no repositorio; prototipos e
> mutacoes rodam no scratch ou num worktree descartavel meu.

## §0 — Terreno, identidade e corpo (2026-10-01T21:53Z)

### MEDIDO

Corpo do papel e mandato, md5 EOL-neutro, no head do ramo:
```
$ git show HEAD:.claude/agents/planejador-mestre.md | tr -d '\r' | md5sum
4c912f69a93f07b14d8fd1c49539c778  -        (= o esperado pelo invocador)
$ tr -d '\r' < agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md | md5sum
068dbc0ee9bc5f1b0d3a80fd41ab3e69  -        (= o mandato_md5 do orquestrador e do invocador) · wc -l = 63
```

Maquina, Node, git, refs:
```
$ date -u                       → Thu Oct  1 21:53:40 UTC 2026
$ uname -a                      → Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
$ node -v                       → v22.22.0   (padrao da nuvem — NAO e o Node do CI; nao sera usado para numero)
$ PATH=/opt/node20/bin:$PATH node -v → v20.20.0   (o Node 20 que uso em toda medicao de teste)
$ git --version                 → git version 2.43.0
$ git rev-parse --abbrev-ref HEAD → docs/plano-b-san3-05
$ git rev-parse HEAD            → 9a808491bd7a3ffe20adbec5647879479f73f9e5
$ git rev-parse origin/main     → 5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d
$ git merge-base origin/main HEAD → 5b6e103638f398d6074eecc5daebdf2d3bcd2252   (a origin/main andou 2 commits depois do mandato: 513937b #397 e 5bcdcc5 #398)
```

Arvores das areas do bloco — identicas entre a base do ramo (`5b6e1036`), a base do plano v2 (`3b1fe0f9`) e a `origin/main` (`5bcdcc58`), medido por `git rev-parse <ref>:<dir>`:
```
src:     21e1c4f2fc63fbb511af76bbfee2e7b83c286fce  (5b6e1036 = 3b1fe0f9 = origin/main)
tests:   2854a3ec2bd694f885732ff5f4ddcf752e4ac22e  (idem)
scripts: 6445f8bc34d0b3c9b233080498d3dca465359a0a  (idem)
prisma:  e906ac2e4b484f1a9e754538d5837e1f8a5d781f  (idem)
$ git log --oneline 3b1fe0f9..origin/main → 5bcdcc5 (#398 registro) · 513937b (#397 P7 governanca) · 5b6e103 (#396 registro)
```
Consequencia: toda medicao de codigo feita aqui no checkout do ramo (HEAD `9a808491`, cujo `src/tests/scripts/prisma` = os da base `5b6e1036`,
pois o ramo so toca `docs/` e `agent-orchestration/`) vale como medicao na `origin/main` para essas quatro arvores. Confirmo que o ramo nao
toca essas arvores: `git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l` → (medido abaixo na §1).

Ferramentas: Postgres 16 em `/usr/lib/postgresql/16/bin` (initdb, pg_ctl, …), `psql` em `/usr/bin/psql`, `redis-server` em `/usr/bin`,
`node_modules` AUSENTE no checkout (`ls -d node_modules` → No such file). Sem Docker.

### HIPOTESE

- H0-a: o checkout tem `src/tests/scripts/prisma` identicos a `origin/main` — derruba com `git diff --stat origin/main HEAD -- src tests scripts prisma | tail -1` (qualquer linha = derrubada).
- H0-b: o Node 20 do CI e 20.x (`ci.yml`) e o v20.20.0 daqui conta como numero de CI — derruba com `grep -n 'node-version' .github/workflows/ci.yml` mostrando outra major.

Veredito parcial §0: identidade, corpo, mandato e refs conferem; terreno conforme o mandato. Nenhuma divergencia a gravar.

Medido depois de escrever as hipoteses (2026-10-01T21:55Z):
```
$ git diff --name-only origin/main HEAD -- src tests scripts prisma | wc -l → 0        (H0-a se sustenta)
$ grep -n 'node-version' .github/workflows/ci.yml → l.76,172,291,317,340: `node-version: 20`  (H0-b se sustenta)
```
