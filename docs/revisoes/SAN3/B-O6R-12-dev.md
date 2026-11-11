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

## F1 — 2026-11-11T01:49:43-0300 — vermelho-controle

Os cinco arquivos novos foram executados isoladamente antes de qualquer código de produção:

| Suíte | Resultado no controle | `not ok` nominal |
|---|---:|---|
| `b-o6r-12-profile-audit` | 0/1, ec 1 | `ERR_MODULE_NOT_FOUND` para `jurisdiction.audit.js` |
| `b-o6r-12-memory-parity` | 0/1, ec 1 | segunda leitura devolveu `UNLIMITED/CALENDAR/PRIVATE_CONTRACT`, não o primeiro retrato |
| `b-o6r-12-regime-census` | 0/2, ec 1 | `jp.scope` vivo e pendência de fuso ausente |
| `b-o6r-12-regime-migration-drill-db` | 0/1, ec 1 | `ENOENT` para a migração nova |
| `b-o6r-12-regime-snapshot-db` | 0/1, ec 1 | catálogo trouxe 0, não 9 colunas `regime_*` |

- Comando: `node --test --import tsx <arquivo>`; suíte DB com `DATABASE_URL` do `o6r12-pg` e
  `CORE_SAAS_PERSISTENCE=prisma`; demais com persistência `memory`.
- Nenhum arquivo de produto foi alterado nesta fatia.
- **Executor da fatia:** `dev-o6r12-cdx`.
- **Próximo comando:** F2 — schema, migração, geração Prisma, carimbo/imutabilidade e mapeador;
  depois rodar drill, snapshot DB, guard de migração, K12 e check.
