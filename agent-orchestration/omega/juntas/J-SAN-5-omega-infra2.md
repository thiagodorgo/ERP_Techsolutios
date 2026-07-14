# J-SAN-5 — Ata: PR Ω-INFRA-2 (staging config-as-code + CD + smoke)

**Junta-de-código** (config-as-code do provedor) — distinta da **junta-de-ativação** (hand-off humano
vivo). Composição por maioria: **agente-devops-provisionador · agente-secops · inspetor-de-rotas**.
O "smoke verde ao vivo" é pré-condição da ATIVAÇÃO (conta Fly + secrets), **não** deste PR (split
ratificado em J-SAN-0). Branch `feat-omega-infra2-staging-v2`, revisão sobre o commit `521fb38`.

## Veredictos (3/3 APROVADO — unânime; maioria exigida atingida)
| Agente | Veredito | Núcleo |
|---|---|---|
| devops-provisionador | **APROVADO** | Config-as-code coerente com Fly: apps gru, liveness raso `/api/v1/health` + readiness profunda `/api/v1/health/ready` (confirmados no código: ping pg `SELECT 1` + redis, 503 sem vazar host/cred). Ordem do CD correta (migrate deploy da pipeline → seed → deploy api+web → smoke). `min_machines_running=0` p/ custo. `PORT=3000`/`8080` batem com Dockerfiles. Rollback documentado. Zero segredo no diff. |
| secops | **APROVADO** (sem veto disparado) | Grep de segredo real: **zerado** — todo hit é `${{ secrets.X }}`, comentário que nomeia o secret, ou leitura de env. Gate `env.ts` INTACTO (não tocado; `NODE_ENV=production` no toml sem `JWT_SECRET` → segredos JWT vêm do Fly, não versionados **e** gate preservado). CD gated (`STAGING_DEPLOY_ENABLED`) + `environment: staging` escopa secrets. Smoke não loga token/senha. `db:seed:demo` só em staging. |
| inspetor-de-rotas | **APROVADO** | Todas as rotas do smoke/healthcheck existem 1:1 no backend: `/api/v1/health` (liveness), `/health/ready` (readiness 200/503), `POST /auth/login` (retorna `data.access_token`), `GET /me` (`data.user.id`). Login sem tenantId resolve por membership (wiring `getCoreSaasService`). `proxy_pass` sem URI preserva `/api/v1/...` intacto — sem reescrita/duplicação. |

## Artefatos ratificados (todos cruzados contra o código real por ≥1 agente)
- **`fly.staging.toml`** (backend `erp-techsolutions-api-staging`, gru, checks liveness+readiness, `CORE_SAAS_PERSISTENCE=prisma`) · **`frontend/fly.staging.toml`** (web, `API_UPSTREAM=http://…api-staging.flycast`, rede privada Fly, resolve com 0 máquinas).
- **`frontend/nginx.conf.template`** + **`frontend/Dockerfile`** (envsubst nativo do entrypoint: `${API_UPSTREAM}` renderizado, vars nginx `$host/$uri` preservadas) — **validado AO VIVO** (docker build+run: proxy_pass rendeu, nginx subiu, SPA 200). Default `http://api:3000` bate com o serviço do compose.prod.
- **`.github/workflows/deploy-staging.yml`** — GATED (`if: vars.STAGING_DEPLOY_ENABLED == 'true'` → SKIPPED até ativar, main verde) · `environment: staging` · migrate deploy → `db:seed:demo` (só staging) → deploy api+web → smoke. Build-args `APP_VERSION`/`GIT_COMMIT=github.sha` no `/health`.
- **`scripts/smoke-staging.mjs`** — 3 provas (`/health/ready` 200 + login demo + `/me`); falha = `exit(1)` = job vermelho; nunca imprime token/senha.
- **`docs/deployment.md`** (seção Staging concreta) + **`docs/demo-credentials.md`** (staging).

## Achados não-bloqueantes (registrados p/ Ω-INFRA-3 / ativação)
- **P-SAN-SEED-GUARD (secops, MÉDIA):** `db:seed:demo` não tem guarda de runtime contra `NODE_ENV=production` — hoje só o gate de CD + ausência de workflow de prod protegem. Ω-INFRA-3 deve adicionar `if NODE_ENV==='production' → abort` no seed (defesa em profundidade).
- **P-SAN-SMOKE-PROXY (devops):** o smoke ataca a API direto (`STAGING_API_URL`); não exercita o proxy same-origin do nginx web. Ativação/PR6: passo adicional atravessando o app web (proxy fim-a-fim).
- **STAGING_API_URL (inspetor, hand-off):** o secret deve ser a origem (scheme+host) SEM `/api/v1` — o smoke concatena `/api/v1`; `.../api/v1` no secret duplicaria o path. Registrar no dossiê de ativação.

## Notas para PR6 (produção — Ω-INFRA-3)
`min_machines_running >= 1` (sem cold-start/scale-to-zero) · **seed NUNCA** em produção · **trava dupla**
(`PROD_DEPLOY_ENABLED` + protection rule do Environment `production`/required reviewers + junta 5/5 unânime +
PD registrado) · rollback por imagem GHCR anterior (`fly deploy --image <anterior>`) + runbook forward-only
(migrations aditivas) · **FIX P-SAN-CORS** (bare `cors()` → CORS_ORIGIN por ambiente) = gate do go-live.

## Evidência
Template nginx validado ao vivo (envsubst + SPA 200) · rotas do smoke/health confirmadas em `src/` (health/auth/me
routers) · zero segredo no diff (grep classificado) · CD gated → SKIPPED até ativação (main permanece verde).
Config-as-code sem toque em código de produto/teste → métricas de teste carregam o último valor oficial
(backend 768/768, smoke web 378, Flutter 764/764).

**APROVADO — merge do Ω-INFRA-2. Ativação viva (smoke real) segue como junta-de-ativação no dossiê de hand-off.**
