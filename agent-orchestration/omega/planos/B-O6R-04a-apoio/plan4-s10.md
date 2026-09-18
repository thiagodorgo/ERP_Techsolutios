## 10. Bateria de validação (forma exata, N esperado, `ec` lido do processo)

1. `DATABASE_URL=postgresql://x npm run db:generate && npm run check` → ec 0 (token `ItemWriteLock`, outcomes, `fechando`, ausência das leituras sem lock).
2. `npm run lint` → ec 0.
3. `npm test` (`CORE_SAAS_PERSISTENCE` não exportado; `DATABASE_URL` do cluster descartável exportado = forma canônica 3) → **≥ 3048 pass · 0 fail · 2 skipped**; a linha "modo resolvido" do runner colada na ata.
4. `DATABASE_URL=<descartável> CORE_SAAS_PERSISTENCE=prisma node --test --import tsx tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-units-db.test.ts
   tests/inventory-unique-backstops-db.test.ts tests/inventory-migration-drill-db.test.ts` → **44 pass · 0 fail · 0 skip**, **3 execuções idênticas com o banco RECRIADO antes de cada**
   (`DROP DATABASE … WITH (FORCE)` + `CREATE DATABASE` + `prisma migrate deploy`); a 3ª execução **com as 4 suítes em paralelo** (`node --test` default) — é a forma da CI e o que T-04 protege.
5. `node --test --import tsx tests/inventory-write-paths-guard.test.ts` → 9/9; depois **cada mutação de T-D (D1–D9) executada e revertida** (saída vermelha na ata; `git diff --stat` vazio ao fim).
6. Regressão focada: as 7 suítes de estoque → 67/67; `tests/financial-*-db.test.ts`, `tests/o6r06-*-db.test.ts`, `tests/pg-barrier-scoped-db.test.ts`, `tests/checklist-run-*-db.test.ts`
   contra o mesmo cluster → inalteradas.
7. `npm run build` → ec 0 · `node --check Kpis/app.js` · `node scripts/kpi-freeze.mjs --check` · `node --test --import tsx tests/kpi-achados-paridade.test.ts tests/kpi-dashboard-charts.test.ts`
   → verdes (**6/6** no de paridade, com `aguardando_merge` preenchido — K-01) · `git diff --check`.
8. Migração: `prisma migrate deploy` no descartável → `pg_indexes` = 2 linhas com os `WHERE (... IS NOT NULL)`; **drill do M-02 no descartável** (semear 21 grupos por SQL cru → `migrate deploy`
   → `P3018/P0001` com "21 grupo(s)" → 2º deploy `P3009` → limpar → 3º deploy `P3009` → `migrate resolve --rolled-back 20260873…` → 4º deploy aplicado), colado na ata; `psql -f
   scripts/inventory-duplicates-census.sql` → 0 linhas (N publicado **com a ressalva** de que o N que importa é o de staging/produção — ato do dono, §13-1).
9. **Vermelho-controle no head-base, executado:** worktree descartável em `02bd7dab` (`git worktree add`, **`npm ci` próprio** — junction proibida), copiar só as 5 suítes novas, cluster
   recriado, passos 4–5 → esperado vermelho em A1, A2, A7, A8, A9, A10, A12, A14, B1, B2, B3 (**pela invariante: entry final `contado 5`**), B4, B9 (2 sessões), B11, B12, B13 (v2 embutida
   é o controle; head-base fica `aberta` — o caso assere também "recontagem aceita e cancel aceito", que o head-base cumpre: B13 é verde no head-base **de propósito**, e vermelho na emulação
   v2 embutida), B14 (v2 embutida −18), B15 (v2 embutida), B16, B17, C1, C2, C4′, C5′, C7, C8 e no guard D1–D9; colar `# pass/# fail` na ata; `git worktree remove --force`.
10. Sizing (emenda 2-h, N-E5), registrado na ata pelo dev **com o código REAL**: `close` de N = 250 / 500 / 1000 / 10 000 itens divergentes no descartável, com duração total, média, p95 e
    máx por unidade, `totalVarianceValue` = −3 × avg × N, e o head-base como controle nos mesmos N (script no scratchpad da ata; **não** vira teste de CI acima de 250). A máquina deve estar
    **sem outros clusters ativos** (os meus números `[10]` saíram com um cluster de jurado alheio de pé e são ruidosos).
11. CI: os 4 arquivos `-db` na lista `SUITES` do job `backend-postgres` e o guard "Fail on skipped tests" verde (0 pulos).
12. Limpeza §C5: `docker rm -f <cluster do bloco>`, worktree descartável removido, `dist/`, `coverage/`, `*.tsbuildinfo` — em 1 linha.
