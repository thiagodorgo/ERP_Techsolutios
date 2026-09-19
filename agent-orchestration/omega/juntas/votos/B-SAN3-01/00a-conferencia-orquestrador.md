# B-SAN3-01 — conferência do orquestrador (antes da junta)

> Papel: orquestrador. Não vota, não desenvolve. Esta conferência é insumo **a re-verificar** pela junta, não prova.
> Data: 2026-09-17/18, depois do reboot da máquina. Worktree `.claude/worktrees/bsan301`, branch
> `fix/web-wo-sem-fallback-fabricado`. Modelo da sessão: Opus 5 (`claude-opus-5[1m]`).

## 1. Bateria barata no head `6ae71c0e` (4 commits da 2ª instância do desenvolvedor)

| Comando | Saída |
|---|---|
| `git diff --name-only origin/main HEAD -- src prisma mobile infra .github package-lock.json frontend/package-lock.json RBAC_MATRIX.md CLAUDE.md AGENTS.md .claude .agents` | 0 arquivos |
| `git diff --name-only origin/main HEAD -- frontend/src` fora de `modules/work-orders/**` e de `operations/dispatches/{dispatches.service.ts,pages/OperationsDispatchesPage.tsx}` | 0 arquivos |
| `git diff --numstat origin/main HEAD -- …/OperationsDispatchesPage.tsx` | +16 −2 |
| `git diff --check origin/main HEAD` | limpo |
| `node scripts/kpi-freeze.mjs --check` | `kpi-freeze: em dia (snapshot 2026-09-17).` |
| `node --check Kpis/app.js` | OK |
| 3 guards de KPI (`kpi-achados-paridade`, `kpi-dashboard-charts`, `kpi-dashboard-contraste`) | `# tests 28 · pass 28 · fail 0` |
| `node scripts/sync-agent-agents.mjs --check` | `OK — 25 agentes, espelho consistente.` |
| gerador do índice numa cópia (`gerar-indice-pendencias.py`) + `cmp` | byte-idêntico · 378 cabeçalhos / 367 IDs |
| `cd frontend && node --test --import tsx tests/work-orders-honest-errors.test.tsx` | `# tests 47 · pass 47 · fail 0` |

## 2. E2e — dois achados

Forma: cluster descartável do bloco `bsan301-pg` (`postgres:16`, `127.0.0.1:32768`, base `erp_bsan301`), `npm run db:seed`,
`CORE_SAAS_PERSISTENCE=prisma` (do `playwright.config.ts`), `E2E_API_PORT=3299`, `E2E_FRONTEND_PORT=5199`,
`chromium_headless_shell-1223`.

**Achado 1 — pré-existente.** O spec rastreado `tests/e2e/critical-flows.spec.ts` inteiro morre no login: 13/13 vermelhos,
todos esperando `getByLabel("Tenant ID")` (log da 2ª instância, `e2e-commitB-2.log`). O campo saiu do formulário em
`d5a4ed43` (#111, 2026-07-02). O e2e não roda no CI (item 42 do plano SAN3). A cópia avulsa da 2ª instância, com o login
ajustado, nunca compilou: os auxiliares estavam colados duas vezes (`Identifier 'workOrderCodesOf' has already been
declared`). O orquestrador removeu a duplicata e conferiu por hash que casos e auxiliares da cópia são idênticos ao rastreado.

**Achado 2 — dentro do bloco.** Pela cópia, E1 e E3 passam e E2 falha (`1 failed · 2 passed`, `e2e-conf-E1E3.log`):
`getByLabel(/^Descri[çc][ãa]o$/)` → `element(s) not found` depois do 422. O retrato da página no momento da falha mostra o
campo `textbox "Descricao"` com o texto digitado preservado: o produto está certo, o seletor não. Sonda
(`e2e-conf-sonda-rotulo.log`):

```
ANTES  getByLabel=1 getByRole=1 label.textContent="Descricao"
DEPOIS getByLabel=0 getByRole=1 label.textContent="Descricaoabc digitado" value=abc digitado
```

A `<textarea>` controlada vive dentro do `<label>` (`WorkOrderForm.tsx` l.179-182) e o React copia o valor para o texto dela.
Pela separação de papéis, o conserto foi da 3ª instância do desenvolvedor (`ca7c5d04`), com E1–E3 3/3 verdes depois
(`e2e-dev3-E1E3.log`).

## 3. Painel de KPI — a rodada SAN3 não aparecia

`Kpis/app.js` `roundOf` classifica a versão pelo prefixo; `B-SAN3-01` caía em "Blocos B". O `PLANO_SAN3.md` l.312-313 manda a
rodada entrar no painel com o primeiro bloco que entregar (§C3.1). A 3ª instância mediu que o `roadmap` não tem segunda
trilha. Decisão na emenda 2 (e) do comando.

## 4. Correção do registro

A linha de limpeza do log da 2ª instância diz que o contêiner `bsan301-pg` foi removido. Ele existia depois do reboot
(`docker ps -a` → `Exited (255)`), e segue vivo para a junta; sai pelo nome depois do merge.

## 5. Backend reexecutado no head `10eb7049` (o PR ganhou 1 caso na guarda do painel)

Forma: banco NOVO `erp_bsan301_orq` no cluster `bsan301-pg` (`prisma migrate deploy`, 107 migrações), `CORE_SAAS_PERSISTENCE`
não exportada, `node scripts/run-backend-tests.mjs`, node v20.19.5.

| Rodada | Redis | Resultado |
|---|---|---|
| 1ª | nenhuma `REDIS_URL` (cai em `localhost:6379`, o Redis vivo, parado depois do reboot) | morreu em 26 s, `EXIT=127`, saída cortada — não conta |
| 2ª | idem | `283 arquivos · 2998 · pass 2990 · fail 6 · skipped 2` — os 6 são `ECONNREFUSED` (`domain-events` 2, `job-queue` 3, `worker-heartbeat` 1) |
| isolada | `REDIS_URL` → Redis descartável `bsan301-redis` | os 3 arquivos: `29 · pass 29 · fail 0` |
| 3ª | `REDIS_URL` → `bsan301-redis` | **`283 arquivos · 2998 · pass 2996 · fail 0 · skipped 2`**, 392 s, `RUNNER_EXIT=0` |

O KPI publica 2996/2998 (o desenvolvedor mediu 2995/2997 antes do caso novo). A causa das 6 falhas virou emenda da
`P-REDIS-DEV-LIXO-DE-FILA`: sem `REDIS_URL` a suíte escreve no Redis vivo da máquina.

Logs no apoio: `apoio/e2e-conf-E1E3.log`, `apoio/e2e-conf-sonda-rotulo.log`, `apoio/e2e-commitB-2.log` (os 13 vermelhos do
spec rastreado, 2ª instância), `apoio/e2e-dev3-*.log` e `apoio/dev3-sonda-roadmap.log` (3ª instância).
