# Comando B-SAN3-09 — Bootstrap do 1º administrador de plataforma

**ID:** B-SAN3-09  
**Bloco:** item 43 do §4.1 do PLANO_SAN3.md  
**Branch:** `feat/bootstrap-platform-admin`  
**Mandato (tarefa de nuvem):** `agent-orchestration/omega/juntas/votos/B-SAN3-09/mandato.md`  
**Relatório dev:** `agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md`

---

## Escopo permitido

- `scripts/bootstrap-platform-admin.ts` (E1 — novo)
- `tests/san3-09-bootstrap-platform-admin.test.ts` (E2 — novo)
- `tests/san3-09-bootstrap-platform-admin-db.test.ts` (E3 — novo)
- `docs/deployment.md` linhas 169-185 apenas (E4 — Runbook B)
- `Kpis/kpis-latest.json`, `Kpis/kpis-history.json`, `Kpis/kpis-history.md`, `Kpis/app.js` linha `var FROZEN` apenas (E5)
- `agent-orchestration/codex/comandos/`, `agent-orchestration/controle/`, `agent-orchestration/docs/`, `agent-orchestration/codex/log-execucao.md` (E5)
- `agent-orchestration/omega/juntas/votos/B-SAN3-09/` (DEV-relatorio.md)

## Escopo proibido

- `src/**`, `prisma/**`, `.github/**`, `frontend/**`, `mobile/**`
- `package.json`, `package-lock.json`, `tsconfig.json`
- `tests/helpers/**`, `tests/db-catalog-write-guard.test.ts`
- `Kpis/index.html`, `Kpis/styles.css`
- Qualquer linha de `Kpis/app.js` exceto `var FROZEN = ...;`
- `CLAUDE.md`, `AGENTS.md`

## Entregas

| ID | Arquivo | Status |
|----|---------|--------|
| E1 | `scripts/bootstrap-platform-admin.ts` | ENTREGUE |
| E2 | `tests/san3-09-bootstrap-platform-admin.test.ts` | ENTREGUE |
| E3 | `tests/san3-09-bootstrap-platform-admin-db.test.ts` | ENTREGUE |
| E4 | `docs/deployment.md` (Runbook B linhas 169-185) | ENTREGUE |
| E5 | KPI + registro + orquestração | ENTREGUE |

## Bateria de validação

```bash
# E1 — tsc
npx tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext \
  --target ES2022 --esModuleInterop --skipLibCheck --types node \
  scripts/bootstrap-platform-admin.ts

# E2 — testes sem banco
node --test --import tsx tests/san3-09-bootstrap-platform-admin.test.ts
# esperado: 23/23 pass

# E3 — testes com banco de drill
DATABASE_URL=postgresql://postgres@127.0.0.1:54332/erp_san3_09_dev \
  node --test --import tsx tests/san3-09-bootstrap-platform-admin-db.test.ts
# esperado: 11/11 pass

# Regressões
node --test --import tsx tests/seed-guard.test.ts \
  tests/backfill-third-party-vehicle-identity.test.ts \
  tests/npm-test-runner-guard.test.ts \
  tests/db-catalog-write-guard.test.ts

# Suíte completa
DATABASE_URL=postgresql://postgres@127.0.0.1:54332/erp_san3_09_dev npm test
# esperado: 3088 testes, 3080 pass, 6 fail (Redis ausente), 2 skip

# KPI
node scripts/kpi-freeze.mjs --check
node --check Kpis/app.js
DATABASE_URL=postgresql://postgres@127.0.0.1:54332/erp_san3_09_dev \
  node --test --import tsx tests/kpi-dashboard-charts.test.ts
# esperado: 17/17 pass

# Limpeza
git diff --check
```

## KPIs (reexecução real 2026-10-01)

| Métrica | Anterior | Este PR |
|---------|----------|---------|
| blocks_completed | 168 | 169 |
| backend_tests | 3052/3054 | 3080/3088 |
| frontend_smoke_tests | 1202/1202 | LOADED (§C3.3) |
| flutter_tests | 864/864 | LOADED (§C3.3) |
| mvp_demo | 99% | INTOCADO |
| mvp_vendavel | 88% | INTOCADO |
