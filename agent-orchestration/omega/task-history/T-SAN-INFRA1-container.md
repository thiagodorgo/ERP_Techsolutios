# T-SAN-INFRA1 — Ω-INFRA-1: containerização + healthcheck real + escolha de provedor

## META
Containerizar backend + frontend, healthcheck real (ping Postgres+Redis), publicar imagem no GHCR e ESCOLHER o
provedor de deploy (PD-INFRA-1 + junta de 5). Último bloco 100% autônomo antes da **fronteira de provisionamento**
(conta/cartão/domínio/secrets = hand-off humano).

## FORMA
- **`Dockerfile`** (backend, multi-stage): builder (`npm ci` + `prisma generate` com DATABASE_URL dummy — generate
  não conecta; Prisma 7 exige a env resolvível por causa do `prisma.config.ts`) + `tsc build`; runtime
  `node:20-bookworm-slim` com só deps de produção + Prisma Client gerado + `openssl` (engine de migrate) +
  **usuário não-root** + `HEALTHCHECK` na readiness. `APP_VERSION`/`GIT_COMMIT` via `--build-arg` → `/health`.
- **`frontend/Dockerfile`**: Vite build → **nginx** servindo o estático (gzip, cache de assets, proxy same-origin
  de `/api`). Decisão: nginx (cache/gzip nativos, desacoplado). `frontend/nginx.conf` + `.dockerignore`.
- **`src/routes/health.routes.ts`**: `GET /health` (liveness, estável — preserva o contrato histórico
  `{status:ok,service,timestamp}` + `version`/`commit`) + **`GET /health/ready`** (checagem PROFUNDA: ping
  Postgres `SELECT 1` + Redis PING com timeout, **200/503**, reporta só up/down+latência — NUNCA vaza
  URL/credencial/host §2.8). +2 testes (`tests/health-routes.test.ts`, env-robustos).
- **`docker-compose.prod.yml`**: postgres+redis+migrate(one-shot `prisma migrate deploy`)+api+web. Porta do host
  configurável (`${API_PORT:-3000}`). Secrets = **placeholders de validação local** (rotulados; produção via
  GitHub Environments).
- **`ci.yml` job `docker`**: `needs:[backend,frontend]`, `permissions: packages:write`; builda em TODO PR (valida
  o Dockerfile) e publica no **GHCR** (`erp-backend:<sha>`+`:latest`) só em push na main via **GITHUB_TOKEN**
  (sem conta/segredo externo).
- **`docs/omega-pd.md` → PD-INFRA-1**: matriz Railway/Render/Fly.io/Hetzner+Coolify/AWS × {custo, região BR/LGPD,
  Postgres PITR, CD, lock-in}, ≥3 fontes por preço/região. Recomendação: **Fly.io/gru 1º, AWS 2º**;
  Railway/Render/Hetzner reprovam no gate de região BR. Decisão → junta de 5 unânime.
- **`docs/deployment.md`** reescrito: staging (Ω-INFRA-2) + produção (Ω-INFRA-3, trava dupla) reais + seção de
  containers + **fronteira de provisionamento** (hand-off humano).

## PROVA AO VIVO (docker local)
`docker build` backend OK (837MB). `docker-compose.prod.yml` (API_PORT=3001) ponta a ponta: **migrate deploy
"All migrations applied"**; `/health` 200; **`/health/ready` 200** (postgres up 1ms, redis up 1ms, sem vazar
dado); nginx serve a SPA (200 text/html); **proxy web→api 200**. Prod gate provado: api CRASHOU quando JWT era
dev-secret (env.ts rejeita) → placeholder não-bloqueado corrige.

## RESULTADO TESTÁVEL
`npm run check`/`build` verdes; suíte **768/768** no ambiente do CI (766 + 2 health-routes); `git diff --check`
limpo; guard de KPI (b106) 20/20. KPI-por-PR: backend 766→768 + backfill do Ω-DOCS (#176/d0126d5).

## FORA (declarado)
- Provisionamento vivo (staging/produção/backup) = PRs 5-7 + hand-off de credenciais. Otimização do tamanho da
  imagem (837MB → multi-stage mais agressivo/distroless) = follow-up. Playwright e2e contra staging = P-SAN-E2E.
