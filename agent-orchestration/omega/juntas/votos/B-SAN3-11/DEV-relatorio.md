# Papel: dev · Identidade: dev-san3-11-dossie · Modelo: claude-sonnet-4-6 · mandato_md5: 82667c06be7b19c06c86220431c2b718

## §0 — Terreno — 2026-10-01T21:38:45Z

```
uname: Linux vm 6.18.44-fc-v51 #1 SMP PREEMPT_DYNAMIC @0 x86_64 x86_64 x86_64 GNU/Linux
node: v22.22.2
git rev-parse HEAD: fa2952f9842a6d2e3b87beef1e34f816ec1e605b
git rev-parse origin/main: 5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d
```

Nota: `origin/main` avançou de `3b1fe0f9` (SHA do plano) para `5bcdcc58` desde a escrita do mandato.
Verificação da fronteira: `git diff --name-only 3b1fe0f9 origin/main -- frontend/src/modules/patios/processes/ frontend/tests/patios-dossie scripts/` → **0 arquivos** (só KPIs mudaram).
A análise do plano segue válida para os arquivos a modificar.

Mandato md5 EOL-neutro: `82667c06be7b19c06c86220431c2b718` ✓

## E1 — Espelho do DTO (processes.types.ts) — CONCLUÍDO

`frontend/src/modules/patios/processes/processes.types.ts`: adicionados 3 campos obrigatórios a `ChecklistRunSummaryItem` após `completedAt`:
- `reopenedFromRunId: string | null`
- `supersededByRunId: string | null`
- `currentRunId: string | null`

`tsc -b --noEmit` verde.

## E2 — Adapter preserva 3 campos (processes.adapter.ts) — CONCLUÍDO

`frontend/src/modules/patios/processes/processes.adapter.ts`: em `adaptChecklistRun` adicionados:
```ts
reopenedFromRunId: readString(record, ["reopenedFromRunId", "reopened_from_run_id"]) ?? null,
supersededByRunId: readString(record, ["supersededByRunId", "superseded_by_run_id"]) ?? null,
currentRunId: readString(record, ["currentRunId", "current_run_id"]) ?? null,
```

## E3 — Painel rotula três estados (ChecklistRunsPanel.tsx) — CONCLUÍDO

`frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx`: lógica de três estados:
- `isSuperseded = run.supersededByRunId !== null` → chip "Versão substituída" (tone default) + "Situação na época: ..."
- `isReopenedCurrent = !isSuperseded && run.reopenedFromRunId !== null` → "Versão atual — substitui uma vistoria anterior" + link opcional para anterior
- caso base (nem um nem outro) → chip normal com status atual

Âncoras: `<tr id={"vistoria-" + run.id} tabIndex={-1}>` para navegação interna.

## E4 — Guard gerado (scripts/san3-11-dossie-vistoria-censo.mjs) — CONCLUÍDO

Criado `scripts/san3-11-dossie-vistoria-censo.mjs` (AST TypeScript, CE-G1).

Execução:
```
$ TS_ROOT=./frontend node scripts/san3-11-dossie-vistoria-censo.mjs .
# VEREDITO: descartadas=0 · pontos sem consulta=0
exit code: 0
```

## E5 — Testes T1–T14 — CONCLUÍDO

16 testes em `frontend/tests/patios-dossie-versao.smoke.test.tsx`:
- T1–T3: adapter camelCase/snake_case/ausente
- T4–T8, T5b, T7b: painel rendering (substituída, vigente com/sem lista, cadeia v1→v3, única)
- T9–T10: DossiePrintDocument + VehicleDossieView integração
- T11: §allowlist (UUID não vaza como texto)
- T12–T14: guard CE-G1 (exit 0 no head, exit 1 em duas mutações)

Fixtures atualizadas em `patios-dossie-checklist.smoke.test.tsx` e `patios-dossie-print.smoke.test.tsx`.

Execução: `node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx` → 16/16 ✓

`npm --prefix frontend run test:smoke` → **1218/1218** ✓

## E6 — KPI e registro — CONCLUÍDO

- `Kpis/kpis-latest.json`: `blocks_completed` 168→169, `frontend_smoke_tests` 1202→1218
- `Kpis/kpis-history.json`: entrada B-SAN3-11 append
- `Kpis/kpis-history.md`: seção B-SAN3-11 append
- `agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md`: criado
- `agent-orchestration/controle/pendencias.md`: P-CHK-DOSSIE-VERSAO-NA-UI → RESOLVIDA; +2 pendências não-bloqueantes
- `agent-orchestration/docs/status-geral.md`: seção B-SAN3-11 append
- `agent-orchestration/codex/log-execucao.md`: entrada B-SAN3-11 append

## Bateria de validação — VERDE

```
npm --prefix frontend run check              → exit 0 (tsc -b)
node --test --import tsx tests/patios-dossie-versao.smoke.test.tsx → 16/16
TS_ROOT=./frontend node scripts/san3-11-dossie-vistoria-censo.mjs . → exit 0, DESCARTADAS=0, sem consulta=0
npm --prefix frontend run test:smoke         → 1218/1218, exit 0
npm --prefix frontend run build              → exit 0 (warn chunk size, não erro)
node --check Kpis/app.js                     → exit 0
git diff --check                             → exit 0 (sem whitespace errors)
```
