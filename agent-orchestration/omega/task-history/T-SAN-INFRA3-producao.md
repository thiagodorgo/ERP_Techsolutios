# T-SAN-INFRA3 — Ω-INFRA-3: produção config-as-code + trava dupla + fixes CORS/seed

**Bloco:** Ω-INFRA-3 (PR6 da RODADA SANEAMENTO). **Provedor:** Fly.io/gru (D-INFRA-PROVIDER).
**Natureza:** config-as-code INERTE (go-live = hand-off humano, fronteira J-SAN-0) + 2 fixes de código real
(P-SAN-CORS, P-SAN-SEED-GUARD). **migration_needed = false** (nenhum toque em schema/migrations).

## Fluxo (ultracode: design antes de código)
Workflow de design (5 leitores paralelos → plano do `planejador-mestre` → ataque de `critico-adversarial` +
`agente-devops-provisionador` + `agente-secops`). Os 3 ataques deram **APROVADO_CONDICIONADO**; as condições viraram
requisito da implementação (abaixo). Depois: implementação, bateria, e junta-de-código do diff (J-SAN-PROD-CODE).

## O que foi entregue
**Fixes de código (src/ + prisma/):**
- **P-SAN-CORS:** `env.ts` ganha `CORS_ORIGIN` (CSV) + gate no `superRefine` que REJEITA vazio/`*` (e qualquer
  entrada CONTENDO `*`) em produção — fail-closed, espelhando o gate do JWT. `app.ts`:
  `cors({ origin: env.CORS_ORIGINS.length>0 ? array : true })` (dev/test permissivo; prod restritivo garantido pelo
  gate). Sem `credentials:true` (auth 100% Bearer). Testes `cors-env` (7) + `cors-routes` (4, integração express).
- **P-SAN-SEED-GUARD:** `prisma/seed-guard.ts` (`assertSeedAllowed`/`isSeedAllowed`) no topo de
  `seed.ts`/`seed-users.ts`/`seed-fleet.ts`. Escape hatch ESTRITO `ALLOW_PROD_SEED` (só `1/true/yes/on`) — corrige
  o footgun `!Boolean("false")`. Teste `seed-guard` (4).

**Config-as-code de produção:**
- `fly.production.toml` + `frontend/fly.production.toml` — `min_machines_running>=1`, `auto_stop_machines=off`,
  `force_https=true`, healthchecks liveness/readiness. `CORS_ORIGIN` NÃO versionado (fail-closed). Sem segredo.
- `.github/workflows/deploy-production.yml` — `workflow_dispatch`, GATED `PROD_DEPLOY_ENABLED`, `environment:
  production`, `concurrency: deploy-production`. **Promoção por IMAGEM** (`--image ghcr…:<promote_sha>` — mesmo
  artefato validado em staging; não rebuilda). Migrate forward-only da pipeline; **sem seed**. Trava dupla: (a)
  ata go-live por SHA, (b) smoke de staging verde no mesmo SHA (checa job+step real, rejeita `skipped=success`),
  (c) rollback ensaiado (atestação + imagem anterior no GHCR).
- `scripts/smoke-production.mjs` — readiness + prova de CORS restritivo (origem proibida não refletida) + login
  opcional (usuário de smoke real). Nunca imprime segredo.
- `docs/deployment.md` §Produção — Runbook A (rollback ensaiável, forward-only P-007) + Runbook B (1º tenant real,
  sem seed demo). `.env.example` documenta CORS allowlist + `ALLOW_PROD_SEED`.

## Condições do design-junta folded (rastreabilidade)
- secops C1/critico C4 — seed guard estrito (não inversão booleana). **Feito.**
- critico C6 — guarda inerte no runner de CI (NODE_ENV≠production lá); protecao do pipeline = ausência do passo.
  **Documentado honestamente** (não anunciar "defesa dupla" no pipeline).
- critico C9 — `seed-platform.ts` era INFEASÍVEL (User.tenant_id NOT NULL/FK Restrict). **Removido do PR;** vira
  follow-up P-SAN-PROD-BOOTSTRAP (Runbook B documenta a intenção + boundary). Também removeu a exceção de escopo em
  `package.json`.
- devops C1-C3/critico C2 — rollback simétrico: **promoção por imagem GHCR**; web sem imagem → `fly releases`
  (gap P-SAN-PROD-WEBIMG). GHCR privado → registry auth no dossiê.
- devops C4/critico C1 — assert de smoke de staging checa **execução real** do job/step (não `--status success`);
  documentado que o selo é vácuo até staging ativado.
- critico C3/devops C8 — duas atas separadas: J-SAN-PROD-CODE (code-junta deste PR) × J-SAN-PROD-GOLIVE-<sha>
  (junta-5 por SHA, pós-merge). Workflow casa a de go-live.
- devops C5 — proibido `release_command` no toml (runtime slim sem Prisma CLI); migrate = passo da pipeline.
- devops C9 — `concurrency: deploy-production`. secops C3 — `force_https` explícito.
- critico C8 — CORS rejeita qualquer entrada com `*`. critico C11/C9 — smoke prova CORS restritivo vivo (fecha o
  ponto único de falha silenciosa do NODE_ENV).

## HONESTIDADE (limitação registrada, não defeito escondido)
O **merge deste PR NÃO é go-live.** Entrega config INERTE (CD SKIPPED até `PROD_DEPLOY_ENABLED`). Os 3 selos da
trava dupla são shell auto-autorado no mesmo repo; a barreira humana real é a **junta-5 unânime por SHA** + a
**ativação viva** (apps/banco/secrets/domínio/`PROD_DEPLOY_ENABLED`/deploy/drill de restore) = hand-off
irredutível. Enquanto o staging estiver desativado, o selo (b) é **vácuo** — ativar staging (Ω-INFRA-2) é
pré-requisito da promoção.

## Bateria (verde)
`tsc` (check/lint/build) · `node --test` novos 15/15 (seed-guard 4 + cors-env 7 + cors-routes 4) + env-geocoding
reconciliado · suíte inteira local (memory + Postgres+Redis): **0 fail** (772 pass, 6 skip pré-existentes
DB-gated) · `git diff --check`. CI é a autoridade do total (768 → +15).
