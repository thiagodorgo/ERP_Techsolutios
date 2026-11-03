# B-PATIO-REC-01 — diário do dev

- **Autor:** `dev-rec01-opus`, Claude Opus 5.5, nível menor **DECLARADO**. Cobre a conta 1 do Codex (limite), por ordem do dono.
  Não escreveu o plano. **Verificador:** Codex (outro modelo, `D-UM-FAZ-OUTRO-VERIFICA`); depois, junta completa.
- **Plano:** v3 §9.1 + emenda 1 §3.1, §6.2.2, §8.2.5, §10.1 (fora do repositório, `erp-pausa-2026-10-03/planos/`).
- **Terreno:** worktree `C:/Users/thiag/w-rec01`, `npm ci` próprio (sem junction), Postgres descartável `rec01-pg` (`postgres:16`,
  `127.0.0.1:55467`, usuário `postgres` como no CI). Nunca `erp-*`, nunca 5432/3000/5173/6379.
- **Ambientes (v3 §9.0):** `[SB]` = `env -u DATABASE_URL -u RBAC_DB_PARITY node --test --import tsx …`; `[UF]` =
  `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x`; `[DB]` = `DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:55467/postgres`;
  `[DBP]` = `[DB]` + `npm run db:seed` + `RBAC_DB_PARITY=1`.
- **Saídas TAP completas:** `C:/Users/thiag/erp-pausa-2026-10-03/rec01/` (fora do repositório).

## RETOMADA 0 — F0 (baselines), ref `origin/main` = `ceb62a07`

| comando | saída |
|---|---|
| `[SB] tests/release.test.ts tests/release-for-repair.test.ts tests/core-saas.test.ts tests/charging-daily-engine.test.ts` | `# tests 63 # pass 63 # fail 0 # skipped 0` (bate com a v3: 63) |
| `[UF] tests/core-saas-role-authority.test.ts` | `# pass 12 # fail 0 # skipped 0` (bate: 12) |
| `[DB] tests/release-gate-concurrency.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts` | `# tests 16 # pass 16 # fail 0 # skipped 0` = 3 + **`N_san3` = 13** (12 subtestes T10–T12 + o teste-pai) |
| `npm run db:seed` + `[DBP] tests/permission-catalog-db-parity.test.ts` | `# pass 2 # fail 0 # skipped 0` (bate: 2) |

Leitura: as quatro baselines batem com a v3 §9.1 F0. `N_san3` fica fixado em **13**. N do bloco = 63 + 12 + 3 + 2 + 13 = **93**.
