# Comando B-SAN3-11 — Dossiê: rótulo da vistoria substituída

**ID**: B-SAN3-11
**Data**: 2026-10-01
**Branch**: `fix/dossie-versao-da-vistoria`
**PR**: (null na autoria — backfill pós-merge)
**Tipo**: fix · frontend

## Objetivo

Fechar a pendência `P-CHK-DOSSIE-VERSAO-NA-UI` (item 8 do gate vendável): o backend já emitia
`supersededByRunId`/`reopenedFromRunId`/`currentRunId`, mas o frontend descartava os três e exibia
todas as vistorias como "Concluído" (verde), inclusive as substituídas.

## Escopo permitido

- `frontend/src/modules/patios/processes/processes.types.ts`
- `frontend/src/modules/patios/processes/processes.adapter.ts`
- `frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx`
- `frontend/tests/patios-dossie-checklist.smoke.test.tsx` (fixtures)
- `frontend/tests/patios-dossie-print.smoke.test.tsx` (fixtures)
- `frontend/tests/patios-dossie-versao.smoke.test.tsx` (novo)
- `frontend/package.json` (só a linha do `test:smoke`)
- `scripts/san3-11-dossie-vistoria-censo.mjs` (guard CE-G1)
- `Kpis/*`
- `agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md`
- `agent-orchestration/codex/comandos/B-SAN3-11-*`

## Entregas (E1–E6)

| ID | Arquivo | Descrição |
|---|---|---|
| E1 | `processes.types.ts` | +3 campos obrigatórios: `reopenedFromRunId`, `supersededByRunId`, `currentRunId` |
| E2 | `processes.adapter.ts` | lê camelCase e snake_case dos 3 campos; null quando ausente |
| E3 | `ChecklistRunsPanel.tsx` | três estados: substituída / vigente de reabertura / única |
| E4 | `scripts/san3-11-dossie-vistoria-censo.mjs` | guard AST: exit 1 se campo descartado ou ponto sem consulta |
| E5 | `frontend/tests/patios-dossie-versao.smoke.test.tsx` | 16 testes T1–T14 (inclui T5b e T7b) |
| E6 | `Kpis/*` + `agent-orchestration/` | KPI (169, 1218/1218), pendências, status, log |

## Bateria de validação

```
npm --prefix frontend run check
cd frontend && node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx
TS_ROOT=./frontend node scripts/san3-11-dossie-vistoria-censo.mjs .
npm --prefix frontend run test:smoke   # → 1218/1218
npm --prefix frontend run build && rm -rf frontend/dist
node --check Kpis/app.js
git diff --check
```

## Resultado

- `frontend_smoke_tests`: 1202 → **1218** (+16 testes novos)
- `blocks_completed`: 168 → **169**
- Guard CE-G1: exit 0 (DESCARTADAS=0, pontos sem consulta=0)
- Pendência `P-CHK-DOSSIE-VERSAO-NA-UI`: **RESOLVIDA**

### Ciclo 2 (§16) — 2026-10-03

A junta 1 reprovou `defa502e` por 0 × 3 (C1-01, C2-01, C2-02, C3-B1). O ciclo 2 (plano §16, emendado pela §16-bis; dev `dev-ciclo2-b-san3-11` em três fatias) troca cada guarda que reconhecia forma pela propriedade: os links de versão usam `.pat-link` e não navegam (foco e realce na linha; ids únicos com `idPrefix` na impressão); o adapter recusa resposta com chave de versão ausente ou inválida (`ChecklistRunContractError`, o painel cai no estado de erro existente); o gerador v2 confere emissor, espelho e adapter nos dois sentidos e reconhece a vistoria pelo tipo e a consulta pela decisão; as duas pendências do bloco ganham dono do plano da rodada. Arquivo do bloco 16 → 24 testes; `test:smoke` 1238/1238 nos dois terrenos; `blocks_completed` 171 contra a main `b404815c`.
