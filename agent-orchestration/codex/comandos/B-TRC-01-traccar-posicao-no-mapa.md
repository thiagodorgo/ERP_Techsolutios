# B-TRC-01 — Traccar: posição segura no mapa, ponta a ponta (dev, OsmAnd simulado)

- **Tipo:** feature
- **Fase:** Execution (A5)
- **Trilha:** backend/raiz (+ overlay Docker de dev; frontend só regressão)
- **Data:** 2026-10-11
- **Branch:** `feat/traccar-b-trc-01`
- **Autor:** `dev-trc01-claude` (Claude Opus 5.5, nível menor, cobrindo o Codex — `D-CLAUDE-SO-ORQUESTRA`)
- **Plano:** `docs/revisoes/TRACCAR/PLANO_TRACCAR.md` v2.1, §8 inteiro, com as emendas
  `PLANO_TRACCAR-EMENDA-v2.2.md` e `PLANO_TRACCAR-EMENDA-v2.3.md` e, acima delas, `D-TRC-DECISOES-DO-DONO-2026-10-11`,
  `D-TRC-PD-APROVADA-2026-10-11` e `D-TRC-ARQUITETURA-2026-10-11` em `agent-orchestration/controle/decisoes.md`.

## Objetivo

Uma posição OsmAnd simulada entra no Traccar 6.16.0 local (imagem por digest), é encaminhada por HTTP privado a um
listener de ingestão próprio do ERP (porta 3200, endereço privado, desligado por padrão), é resolvida para a organização
certa sob RLS (descoberta não autoritativa + confirmação `FOR SHARE`) e aparece no mapa operacional que já existe,
atribuída ao técnico que aceitou o despacho da viatura. **Fica de fora** (v2.3 A-7): GT06, comandos, níveis de
frequência, vínculo fixo, frota sem técnico, telas novas, staging e produção.

## Contexto / fontes de verdade

- Ler antes: o README de `docs/revisoes/TRACCAR/`, o plano e as emendas acima, `agent-orchestration/controle/`.
- Gate de início: §8.0 do plano (7 linhas), medido em `docs/revisoes/TRACCAR/B-TRC-01-dev.md`.
- Regras do dono para o Traccar (§C7 item 8(4)): nunca `tenant_id` do payload; dispositivo não mapeado em quarentena;
  vínculo ambíguo falha fechado; token nunca em código, log, query, frontend ou payload público, comparado em tempo
  constante; nenhuma porta fora de `127.0.0.1`; nunca os servidores públicos de demonstração.

## Contratos / Endpoints

- `POST /ingest/traccar/v1/positions` — **rota de serviço, só no listener de ingestão** (não é API de cliente; não
  existe em `src/app.ts`). Header `X-Traccar-Forward-Token`; corpo `{position, device}` do forward JSON do Traccar
  6.16.0; respostas e códigos em §4.6 e §8.2 do plano.
- Leitura pelo mapa: `GET /api/v1/field-locations/latest` (existente, sem mudança de contrato; `source` ganha o valor
  `traccar`, que o frontend não lê).

## Escopo PERMITIDO (§8.3 do plano)

- `prisma/schema.prisma` (três modelos de §3.1 e relações; em `FieldDispatch`, só `operator_assigned_at`)
- `prisma/migrations/<timestamp>_traccar_ingestion_foundation/migration.sql`
- `prisma/migrations/<timestamp+1>_validate_location_source_check/migration.sql`
- `src/integrations/traccar/traccar-ingest.app.ts`, `traccar-ingest.bootstrap.ts`, `traccar-ingest.logger.ts`,
  `traccar-forward-auth.ts`, `traccar-rate-limit.ts`, `traccar-position.schema.ts`, `traccar-position.adapter.ts`,
  `traccar-resolution.ts`, `traccar-ingestion.repository.ts`, `traccar-ingestion.service.ts`, `traccar-db.ts`, `index.ts`
- `src/server.ts` (uma chamada ao bootstrap, depois do `portalApp.listen`)
- `src/database/rls.ts` (`findFirstTenantRls`, `withTenantRlsBudget`; `withTenantRls`/`forEachTenantRls` intactos)
- `src/config/env.ts`, `.env.example`
- `src/modules/field-location/field-location.types.ts`, `field-location.repository.ts`,
  `field-location-prisma.repository.ts`, `field-location.service.ts`
- `src/modules/field-dispatch/field-dispatch.types.ts`, `field-dispatch.repository.ts`,
  `field-dispatch-prisma.repository.ts`
- `docker-compose.traccar.yml`, `infra/traccar/dev/traccar.xml`, `infra/traccar/fixtures/6.16.0/position-osmand.json`
- `scripts/traccar-dev-demo.mjs`, `scripts/traccar-capture-fixture.mjs`
- os 13 arquivos de teste de §8.6 (`tests/traccar-*.test.ts`)
- `API_CONTRACTS.md`, `docs/deployment.md`
- `docs/revisoes/TRACCAR/**`, `agent-orchestration/codex/comandos/B-TRC-01-*.md` e os registros de junta

## Escopo PROIBIDO (§8.3 do plano)

- `src/app.ts` e `src/portal-app.ts`; `frontend/**`; `mobile/**`
- `src/modules/vehicles/**`, `src/modules/vehicle-identities/**`, `src/modules/telemetry/**`,
  `src/modules/notifications/**`, `src/modules/field-ops-realtime/**`; `src/infra/**`
- `Dockerfile`, `docker-compose.yml`, `docker-compose.prod.yml`; `.github/workflows/**`
- `package.json` e lockfiles (zero dependência nova); `Kpis/**` (`D-GOV-PROPORCIONAL` (5), KPI congelado); `fly*.toml`
- `infra/**` fora de `infra/traccar/dev/**` e `infra/traccar/fixtures/**`
- credencial real; porta publicada fora de `127.0.0.1`; servidor externo, inclusive os de demonstração do Traccar
- WebSocket, mapa novo, polling, rota pública ou administrativa; GT06, comandos, níveis de frequência (v2.3 A-7)

## Passos de implementação (§8.5 do plano — testes primeiro)

0. Gate §8.0, §8.4, baseline (§8.7) — em `B-TRC-01-dev.md`.
1. Este comando.
2. Topologia: `tests/traccar-dev-topology.test.ts` vermelho → overlay + `traccar.xml` → verde.
3. Fixture real: `scripts/traccar-capture-fixture.mjs` (projeto `erp-trc01-capture`).
4. Contrato: `tests/traccar-position-contract.test.ts` → schema + adapter.
5. Autenticação e limite: `tests/traccar-forward-auth.test.ts`, `tests/traccar-rate-limit.test.ts`.
6. Listener e logs: `tests/traccar-ingest-listener.test.ts`, `tests/traccar-ingest-logs.test.ts` → app, bootstrap,
   logger, `env.ts`, `server.ts`.
7. Esquema: `tests/traccar-binding-uniqueness-db.test.ts`, `tests/traccar-quarantine-db.test.ts`,
   `tests/traccar-idempotency-db.test.ts` → as duas migrações.
8. Resolução: `tests/traccar-resolution-cost.test.ts`, `tests/traccar-resolution-race-db.test.ts`.
9. Vertical no banco: `tests/traccar-position-ingestion-db.test.ts`, `tests/traccar-ingest-pool-db.test.ts`.
10. Smoke: `node scripts/traccar-dev-demo.mjs`.
11. Bateria (§8.8) e as 45 mutações de §8.9, cada uma vermelha e restaurada por sha256.
12. Limpeza e PR sem `Kpis/*`.

## Bateria de validação (§8.8 do plano)

Git Bash, na raiz do worktree. A porta do banco descartável é 47432 (a 55432 do plano está na faixa reservada pelo
Windows nesta máquina; ver `B-TRC-01-dev.md`).

```bash
DB='postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public'
RD='redis://127.0.0.1:56379'

timeout -k 15 600 npm run check
timeout -k 15 600 npm run lint

# testes novos sem banco
timeout -k 15 300 npm test -- tests/traccar-ingest-listener.test.ts tests/traccar-forward-auth.test.ts \
  tests/traccar-ingest-logs.test.ts tests/traccar-position-contract.test.ts tests/traccar-resolution-cost.test.ts \
  tests/traccar-rate-limit.test.ts
timeout -k 15 300 npm test -- tests/traccar-dev-topology.test.ts

# testes novos com banco (papel efêmero NOSUPERUSER NOBYPASSRLS no cluster descartável)
DATABASE_URL="$DB" timeout -k 15 900 npm test -- tests/traccar-binding-uniqueness-db.test.ts \
  tests/traccar-resolution-race-db.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-quarantine-db.test.ts \
  tests/traccar-position-ingestion-db.test.ts tests/traccar-ingest-pool-db.test.ts

# regressões diretas (§8.7) e a do papel de runtime
timeout -k 15 300 npm test -- tests/field-location-routes.test.ts tests/field-ops-realtime.test.ts \
  tests/field-ops-events.test.ts tests/field-dispatch.test.ts tests/field-dispatch-routes.test.ts
DATABASE_URL="$DB" timeout -k 15 900 npm test -- tests/san3-05-leituras-de-plataforma-db.test.ts

# suíte inteira nas duas formas canônicas do runner
timeout -k 15 2400 npm test
DATABASE_URL="$DB" REDIS_URL="$RD" timeout -k 15 3000 npm test

# frontend (não muda; regressão)
timeout -k 15 900 npm --prefix frontend run test:smoke
timeout -k 15 600 npm --prefix frontend run check
timeout -k 15 900 npm --prefix frontend run build

timeout -k 15 900 npm run build

# vertical ponta a ponta (sobe e derruba o próprio projeto compose)
timeout -k 30 900 node scripts/traccar-dev-demo.mjs

git diff --check
```

## KPIs

**Congelados** (`D-GOV-PROPORCIONAL` (5)): este PR não toca `Kpis/*`.

## Junta (§C7 item 8(1), §8.10 do plano)

- Junta completa de segurança, **unanimidade 3/3**, com o `inspetor-de-terreno-da-junta` antes; teto de 2 ciclos.
- Cadeiras: (a) RLS, unicidade e banco; (b) superfície e segredo; (c) contrato e atribuição (com a leitura da trava
  `Ω6R-SEC-002`). Cada uma re-executa as mutações listadas em §8.10.
- Migração aditiva sob o `agente-dba-guardiao`.
- Registro: `agent-orchestration/omega/juntas/J-B-TRC-01-ciclo<n>.md`.

## Definition of Done (§8.10 do plano)

- [ ] casos novos de §8.6 verdes (≥ N executado = 65), os N diretos verdes sem edição, as duas formas da suíte verdes
- [ ] migração aditiva aprovada pelo `agente-dba-guardiao`; `FORCE` e o guard do runtime provados sob papel efêmero
- [ ] smoke vertical verde, com 1 recibo e 1 localização depois do reenvio
- [ ] as 45 mutações registradas em vermelho
- [ ] `check`, `lint`, `build`, frontend `check`/`build`/`test:smoke` e `git diff --check` verdes
- [ ] limpeza de §8.4 reportada em uma linha; PR sem `Kpis/*`

## Rastreabilidade (§C6)

- **ID:** B-TRC-01 · **PR #:** <após `gh pr create`> · **Merge commit:** null → backfill · **Approved head:** null →
  backfill · **Gate:** §8.0 do plano (7 linhas, verdes em 2026-10-11) · **Status:** `published_per_pr`
- **Contrato:** `traccar_position_ingest@2026-10-11.b-trc-01` (rota de serviço, não é API de cliente)
- **Evidência do dev:** `docs/revisoes/TRACCAR/B-TRC-01-dev.md`
