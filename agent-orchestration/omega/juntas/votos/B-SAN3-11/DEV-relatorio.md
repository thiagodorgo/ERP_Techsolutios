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

## Correção pós-CI — Kpis/app.js (cópia congelada) — 2026-10-02T10:22Z

O CI do PR #401 (job `backend`) ficou vermelho em UM teste: `tests/kpi-dashboard-charts.test.ts` — "a cópia congelada é IDÊNTICA
ao kpis-latest.json". Causa: atualizei `Kpis/kpis-latest.json` (E6) e NÃO regenerei `Kpis/app.js` por `node scripts/kpi-freeze.mjs`
(a cópia FROZEN do painel). O que faltou na minha bateria: rodei só `node --check Kpis/app.js` (sintaxe), e não o `kpi-freeze.mjs
--check` nem os guards do painel — o §C3 e o conhecimento de terreno (§2.4) dizem que o `app.js` só se gera pelo script, e a bateria
do bloco não os listava; deviam ter entrado assim mesmo.

```
node scripts/kpi-freeze.mjs --check  (antes) → DIVERGE, ec=1
node scripts/kpi-freeze.mjs          → cópia congelada reinjetada (snapshot 2026-10-01, 99381 bytes)
node scripts/kpi-freeze.mjs --check  → em dia (snapshot 2026-10-01), ec=0
node --test --import tsx tests/kpi-dashboard-charts.test.ts    → # tests 17 # pass 17 # fail 0
node --test --import tsx tests/kpi-dashboard-contraste.test.ts → # tests 6 # pass 6 # fail 0
node --test --import tsx tests/kpi-achados-paridade.test.ts    → # tests 6 # pass 6 # fail 0
node --check Kpis/app.js → ok
```
Só `Kpis/app.js` muda neste commit (gerado, nunca editado à mão). Node v20.20.0.

## ERRATA 1 — 2026-10-02T16:10Z — PARADA POR DIVERGÊNCIA (plano §15 × medição)

**Quem:** `dev-errata1-b-san3-11` (identidade nova e local; Opus 5.5 — o contrato fixa Fable só para gates e planejador); mandato
`00-mandatos/dev-errata1.md` (md5 EOL-neutro `e348f93ce9f778ccb06cf55bc17790f6`). Não achou (inspetor), não planejou
(`planejador-errata1-b-san3-11`), não vota. Evidência incremental completa (P1): `scratchpad/DEV-ERRATA1-401.md` da sessão do orquestrador.

**Terrenos:** `C:/Users/AMP/w-dev11` (CRLF, `core.autocrlf=true`, CR no adapter = 583) e `C:/Users/AMP/w-dev11lf` (`core.autocrlf=false`, CR = 0);
`MINGW64_NT-10.0-22631`, Node v20.19.5; `npm ci` próprio em `frontend/` nos dois e na raiz (`--ignore-scripts`) no CRLF; sem junction.

**Head anterior:** `508240fb`. **Commits locais (NÃO empurrados, por causa da parada):** `1654ae57` merge da `origin/main` `4ab9d232`
(conflitos só nos 7 arquivos de registro/KPI da §15.10, as duas entradas mantidas, a do bloco por último) · `92cfc05e` E6+E7 verbatim da §15.3
(só `frontend/tests/patios-dossie-versao.smoke.test.tsx`, 15+ 17-) · `3208cf13` E8 (KPI recontado) · este registro.

```
baseline @508240fb, CRLF, arquivo isolado   → # tests 16 # pass 15 # fail 1 (T14: "mutação 2 deve deixar gerador vermelho") ec=1
@92cfc05e, CRLF, arquivo isolado            → # tests 16 # pass 16 # fail 0 ec=0 · 'morto por sinal' = 0
@92cfc05e, LF, arquivo isolado              → # tests 16 # pass 16 # fail 0 ec=0 · 'morto por sinal' = 0
@92cfc05e, CRLF, npm --prefix frontend run test:smoke → # tests 1218 # pass 1218 # fail 0 ec=0
KPI: blocks_completed 169 (origin/main 4ab9d232) -> 170 · frontend_smoke_tests 1218/1218 (TAP acima) · version B-SAN3-11 · release.pr 401
     merge_commit/approved_head null · history n 165 -> 166 (a do bloco por último) · kpi-freeze --check ec=0 · app.js: 2 linhas [-+]var FROZEN
guards raiz: kpi-dashboard-charts 17/17 · kpi-dashboard-contraste 6/6 · kpi-achados-paridade 6/6 · node --check Kpis/app.js ok
escopo: git diff --name-only 508240fb HEAD -- scripts frontend/src frontend/package.json <2 fixtures> .github → 0
```

**D1 — A17.** Sob teto, o Node preenche `error` (ETIMEDOUT) **e** `signal` (SIGTERM), `status` null (medido por `node -e` com `spawnSync(…, {timeout: 1})`).
A forma de referência testa `error` antes de `status === null`; o controle A17 executado (`timeout: 1,` no `spawnSync`, revertido com diff vazio) deu
`# pass 13 # fail 3` — T12, T13, T14 com `gerador não executou: spawnSync C:\nvm4w\nodejs\node.exe ETIMEDOUT`; `grep -c 'morto por sinal'` = **0**
(o A17 espera 3); `grep -c 'deve deixar gerador vermelho'` = 0. A propriedade P-A vale (a morte vira exceção com causa; nunca "exit 1" passando);
a mensagem cobrada pelo A17, e a afirmação de M9/VC2, não.

**D2 — A18.** `node san3-11-errata1-varredura.mjs . origin/main` → `MUT=5 · EOL=3 · CP=1 · TETO=0 · NULL=1 · WRITE=3`. O único NULL é a linha de retorno
da forma de referência (§15.3, l.1116 do plano): `return { exitCode: result.status, stdout: result.stdout ?? "" };` — a regex NULL da §15.7 casa
`"status, stdout: result.stdout ??"`; o `??` é do `stdout`. O alvo `NULL=0` não é atingível com a forma verbatim. (EOL=3, não 2: a 3ª é a
normalização `/\r\n/g` do próprio `mutate`.)

**Não decidido aqui (§C7.4-bis):** forma ou critério — é do plano. **Não rodados depois da parada:** A17 de novo, A19 (CRLF e LF), A20, A21, a bateria
§15.8 completa no head final nos dois terrenos, a linha de `log-execucao.md` e de `status-geral.md`, e o push. Worktrees mantidos para a retomada.
