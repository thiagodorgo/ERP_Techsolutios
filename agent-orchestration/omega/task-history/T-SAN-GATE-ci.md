# T-SAN-GATE — Ω-GATE: CI roda a suíte inteira + main verde

## META
O gate de CI era ILUSÓRIO: `package.json` → `"test": "node --test tests/core-saas.test.ts"` rodava **1 de 100**
arquivos; `ci.yml` job backend definia `DATABASE_URL` mas **não tinha service container de Postgres**, então
os testes `*-prisma`/`rls`/`job-queue` nunca rodaram no CI. Tornar o gate real: `npm test` = suíte inteira,
CI com Postgres+Redis+`migrate deploy`, e main VERDE por causa raiz.

## DIAGNÓSTICO (o passo que ninguém tinha dado: rodar a suíte inteira)
Rodando `node --test --import tsx tests/*.test.ts` com Postgres vivo: **28 fails/761**. Triagem por isolamento
revelou que **25 eram POLUIÇÃO DE AMBIENTE**, não bug: `src/config/env.ts` chama dotenv `config()`, e o `.env`
LOCAL tem `CORE_SAAS_PERSISTENCE=prisma` (o CI não tem `.env` — é gitignored). Reproduzindo o ambiente REAL do
CI (sem `.env`, só `DATABASE_URL`+`REDIS_URL`, default `memory`): **28 → 3 fails**. Os 3 reais:

1. **platform-routes** "legacy headers disabled in production" (P-003): o me-router monta em `/api/v1` (largo)
   ANTES de `/api/v1/platform` e seu `tenantContextMiddleware` interceptava `/platform/*` em produção,
   devolvendo o motivo GENÉRICO `legacy_headers_disabled` antes do guard de plataforma emitir o específico
   `platform_legacy_headers_disabled`. **Bug de roteamento real.**
2. **cloud-usage-routes** "platform admin acessa summary": FIXTURE que apodrecia no relógio — evento em
   `occurredAt: 2026-06-08` consultado sem período; `normalizeFilters` usa janela default de 30d relativa a
   `now` (hoje 2026-07-13 → evento fora da janela → 0 métricas).
3. **approval-frontend-contract** (P-003): afirmava contrato OBSOLETO (`OperationalApprovalCard`,
   `can("work_orders:update")`); a tela foi refatorada para `ApprovalPanel` inline com gate
   `work_orders:approve`/`canDecide`.

## FORMA (correção por causa raiz — nada deletado/skipado)
- **`src/app.ts`**: montar `createPlatformRouter()` ANTES de `createMeRouter()` — plataforma emite o motivo
  correto. Único código de produto tocado.
- **`tests/cloud-usage-routes.test.ts`**: passar `periodStart`/`periodEnd` explícitos cobrindo o evento
  (mesmo padrão do teste irmão que passava). Determinístico; asserções (`metrics.length===1`, `403
  platform_permission_required`) preservadas.
- **`tests/approval-frontend-contract.test.ts`**: reescrito para o contrato VIVO (afirma `ApprovalPanel`,
  `work_orders:approve`, `canDecide`, handlers reais, labels, §2.8 no service). Mais forte que o antigo.
- **`package.json`**: `"test"` = `node --test --import tsx tests/*.test.ts` (suíte inteira, glob expande no
  `sh` do ubuntu) + `"test:unit"` (subconjunto rápido `core-saas`).
- **`.github/workflows/ci.yml`** job backend: services `postgres:16` + `redis:7` (healthcheck) + passo
  `npx prisma migrate deploy` antes dos testes; `REDIS_URL` no env.
- Playwright (`test:e2e`) fora do gate obrigatório (P-SAN-E2E → bloqueante contra staging na Ω-INFRA-2).

## RESULTADO TESTÁVEL
- Ambiente REAL do CI (sem `.env`, Postgres+Redis+`migrate deploy`): **suíte inteira 0 fail** (766 pass).
- `npm run check` + `npm run build` verdes; `git diff --check` limpo.
- P-003 → RESOLVIDO. 5 agentes-fábrica da rodada criados (ci-doutor, devops-provisionador, secops,
  dba-guardiao, finops).

## FORA (declarado)
- Playwright e2e bloqueante (P-SAN-E2E, Ω-INFRA-2). Poluição pré-existente do `.env` local é do dev, não do CI.
- Achado transversal P-INFRA-RLS (RLS bypassada em runtime dev) segue para a trilha de infra.
