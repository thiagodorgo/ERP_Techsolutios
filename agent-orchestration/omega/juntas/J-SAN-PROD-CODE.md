# J-SAN-PROD-CODE — Ata: junta-de-código do PR Ω-INFRA-3 (produção config-as-code + fixes CORS/seed)

**Junta-de-código** (verifica o DIFF implementado `b03ed2c`) — distinta da **junta de GO-LIVE**
(`J-SAN-PROD-GOLIVE-<sha>`, junta-5 unânime por SHA na ativação). Composição maioria + veto do secops:
**agente-secops · agente-devops-provisionador · critico-adversarial · inspetor-de-rotas**.

## Veredictos (4/4 favorável — 2 APROVADO + 2 APROVADO_CONDICIONADO; condições corrigidas antes do merge)
| Agente | Veredito | Núcleo |
|---|---|---|
| agente-secops | **APROVADO** (sem veto) | Zero segredo real versionado (grep classificado); nenhum gate do env.ts afrouxado (JWT/Nominatim intactos, prova de regressão); CORS gate ENDURECE (fail-closed, rejeita vazio/`*`); seed guard ESTRITO; CORS_ORIGIN omitido do toml = fail-closed correto; deploy-production secrets escopados, smoke não vaza. |
| inspetor-de-rotas | **APROVADO** | Rotas do smoke/health existem 1:1 (`/health/ready`, `/auth/login`→`access_token`, `/me`→`user.id`); CORS preflight tratado antes do router; ordem helmet→cors→json intacta; rodou cors-routes 4/4 + cors-env 7/7 + seed-guard 4/4 ao vivo (+15 confirmado). |
| agente-devops-provisionador | **APROVADO_CONDICIONADO** | Promoção por imagem OK, trava (b) rejeita `skipped` corretamente, sem `release_command`, `concurrency` presente, rollback coerente. **2 furos de executabilidade** (corrigidos). |
| critico-adversarial | **APROVADO_CONDICIONADO** | 5/5 condições do design dobradas; 4/5 vetores de furo limpos; **1 furo latente** (staging crash-loop) + 1 overclaim de comentário (corrigidos). |

## Furos encontrados e CORRIGIDOS neste ciclo (antes do merge)
1. **[devops F1] Trava (a) auto-referente/insatisfazível** — a ata `J-SAN-PROD-GOLIVE-<sha>` nomeia o próprio SHA,
   logo não pode estar na árvore do checkout de `promote_sha`. **Fix:** a trava (a) lê a ata da **main** via
   `gh api contents?ref=main -H Accept: raw` (dissocia ref de governança × SHO do artefato).
2. **[devops F2] Deploy web `--config` duplicado** — `working-directory: frontend` + `--config
   frontend/fly.*.toml` → `frontend/frontend/…` inexistente. **Fix:** `--config fly.*.toml` no
   `deploy-production.yml` **e** no `deploy-staging.yml` mergeado (#181, bug pré-existente replicado — corrigido nos dois).
3. **[critico F] Staging crash-loop por CORS_ORIGIN não documentado** — `fly.staging.toml` roda `NODE_ENV=production`;
   o novo gate CORS passa a EXIGIR `CORS_ORIGIN` lá também, mas o checklist de staging (toml + deployment.md) não a
   listava → boot fail-closed sem pista. **Fix:** `CORS_ORIGIN` adicionado ao cabeçalho do `fly.staging.toml` e à
   seção de staging do `docs/deployment.md`, com a **regra geral**: todo ambiente `NODE_ENV=production` exige `CORS_ORIGIN`.
4. **[critico minor] Overclaim de comentário** no `smoke-production.mjs` — o CORS-check prova CORS restritivo, não
   diretamente `NODE_ENV=production`. **Fix:** comentário corrigido (a garantia de prod vem do gate fail-closed).

## Condições do design-junta (fase de plano) confirmadas no código
seed guard estrito · CORS gate (rejeita vazio/`*`) + derivação `CORS_ORIGINS` · `seed-platform` REMOVIDO
(→ P-SAN-PROD-BOOTSTRAP) · promoção por imagem + assert real de smoke · 2 atas separadas. (Detalhe em
`task-history/T-SAN-INFRA3-producao.md`.)

## Evidência
tsc/lint/build verdes · suíte inteira 0 fail (+15 backend: seed-guard 4 + cors-env 7 + cors-routes 4) · zero
segredo no diff · `git diff --check` limpo. Os fixes deste ciclo tocam workflows/tomls/docs/comentário (sem TS novo).

**APROVADO — merge do Ω-INFRA-3.** O merge NÃO é go-live: entrega config INERTE (CD SKIPPED até
`PROD_DEPLOY_ENABLED`). Go-live = junta-5 por SHA (`J-SAN-PROD-GOLIVE-<sha>`) + ativação viva = hand-off humano.
Condições de ATIVAÇÃO registradas: P-SAN-PROD-BOOTSTRAP, P-SAN-PROD-WEBIMG, registry-auth GHCR no Fly.
