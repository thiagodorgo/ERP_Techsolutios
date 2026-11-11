# B-O6R-12 — diário do dev

- **Executor:** `dev-o6r12-cdx` — Codex 2, GPT-5.6 Sol (nível menor declarado)
- **Verificador previsto:** Claude Opus, identidade nova
- **Ramo:** `fix/jurisdiction-profile-versioning`
- **Base:** `6f727afc0ed9eb40449d34cafb5ebf00a47c52f5`
- **Worktree:** `C:/Users/thiag/w-o6r12`
- **Banco:** `o6r12-pg`, PostgreSQL 16, `127.0.0.1:55492`

## F0 — 2026-11-11T01:45:47-0300

- `git diff --name-status d5ec1696..6f727afc -- <escopo>`: nenhum arquivo de produto,
  schema, migração, teste ou CI do bloco mudou; somente registros operacionais avançaram.
- `npm ci`: 326 pacotes instalados no worktree próprio; sem junction. Aviso preexistente de
  engine para `@prisma/streams-local`; auditoria npm reportou 44 vulnerabilidades da árvore
  bloqueada, sem alteração de lockfile.
- Primeira invocação de `npx prisma generate` sem `DATABASE_URL`: reportou
  `PrismaConfigEnvError`; repetida com a URL explícita e concluída em 2,77 s.
- `npx prisma migrate deploy` no `o6r12-pg`: 129 migrações aplicadas com sucesso.
- A crítica v2 foi lida integralmente. Seus 4 achados médios e 6 baixos viraram a Emenda E1 no
  comando do bloco antes do código.
- Decisões ratificadas: Q1 inclui prazos/leilão/liberação; Q3 = abertura; Q4 = valor atual no
  backfill; QA(a) = portal mostra o regime da abertura; QB(a) = duas linhas no `SUITES=`.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** escrever F1 (testes novos), rodar vermelho-controle em `6f727afc` e
  registrar o TAP antes do código de produção.
