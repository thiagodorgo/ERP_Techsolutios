# RODADA SANEAMENTO + Ω-INFRA — lista de execução

Fonte de verdade: `agent-orchestration/omega/prompt-rodada-saneamento-infra.md` (reler a cada bloco).
Governança: autonomia por juntas (verde da junta = merge + próximo); protocolo de dificuldade (fábrica cria
agentes antes de parar); paradas irredutíveis: migration destrutiva, exposição de segredo, ação irreversível
em produção sem junta unânime, **e a fronteira de provisionamento cloud** (conta/pagamento/domínio/secrets =
handoff humano — ratificada em J-SAN-0).

## Ordem: Ω-GATE → Ω-GOV → Ω-DOCS → Ω-INFRA-1 → 2 → 3 → 4

- [x] **PR 1 — Ω-GATE (CI roda a suíte inteira + main verde)** — **PR #174, merge `fb2e5fd`**. Junta J-SAN-1
      4/4 APROVADO (critico condicional, condições atendidas) + J-SAN-0 3/3. Fábrica da rodada criada. Diagnóstico
      28→3→0: 25 fails eram poluição do `.env` local (CORE_SAAS_PERSISTENCE=prisma que o CI não tem); 3 reais
      corrigidos por causa raiz (app.ts platform-antes-de-me; cloud-usage fixture-relógio; approval contrato
      vivo). `npm test` = suíte inteira; CI ganhou postgres:16+redis:7+migrate deploy+guard env+memory fixo.
      Suíte 0 fail no ambiente real do CI (766 pass, ~2m11s no gate). P-003 RESOLVIDO.
- [x] **PR 2 — Ω-GOV** (KPI por PR + autonomia por juntas como norma permanente) — **junta J-SAN-2 UNÂNIME 5/5**
      (1 ciclo de reprovação: critico/planejador/validador acharam §C4/§8.4/§8.7/§9 + index.html/release ainda na
      política antiga; corrigido; re-aprovado). D-KPI-PER-PR + D-SAN-AUTONOMIA. Reescrita normativa em
      CLAUDE.md (§C1/§C2/§C3/§C4/§C7 nova/§8/§9/§10 DoD)/READMEs KPI/plano-mestre; backend_tests 15/15→766/766;
      nota Ω4 ×1,5. P-SAN-KPI-BACKFILL. **PR #NN, merge <hash> — pendente push/merge.**
- [x] **PR 3 — Ω-DOCS** (descontaminação Kryos; D-DOCS-KRYOS) — **PR #176, merge `d0126d5`**, junta J-SAN-3 3/3.
- [x] **PR 4 — Ω-INFRA-1** (containerização + healthcheck + provedor) — junta **J-SAN-4 UNÂNIME 5/5**.
      Dockerfile multi-stage (não-root) + frontend nginx + /health(liveness)+/health/ready(profundo) +
      compose.prod validado ponta a ponta + GHCR via GITHUB_TOKEN + PD-INFRA-1. **D-INFRA-PROVIDER: Fly.io/gru
      1º · AWS 2º** com R1 (ratificar "dados no BR" no hand-off; senão Render) e R2 (drill de restore + RPO
      escrito = gate de go-live). backend 766→768. **PR #NN, merge <hash> — pendente push/merge.**

> ### ⛔ CHECKPOINT PAUSA-HANDOFF-CREDENCIAIS (entre PR4 e PR5 — ratificado J-SAN-0/J-SAN-1 critico)
> Fronteira externa IRREDUTÍVEL. A partir do PR5, a ATIVAÇÃO VIVA exige o que a D-SAN-AUTONOMIA não fabrica:
> conta no provedor + método de pagamento/cartão + domínio registrado & DNS + secrets iniciais nos GitHub
> Environments. O agente entrega toda a config-as-code aprovada em junta-de-código; o **hand-off** é um único
> dossiê ao humano. Adicionado às paradas imediatas: **falta de credencial/pagamento/domínio externo**.

- [x] **PR 5 — Ω-INFRA-2** (staging config-as-code + CD + smoke) — junta **J-SAN-5 UNÂNIME 3/3** (maioria
      exigida; devops-provisionador · secops · inspetor-de-rotas, junta-de-código). `fly.staging.toml` api+web
      (gru, liveness `/health`+readiness `/health/ready`, `min_machines_running=0`, `API_UPSTREAM` via `.flycast`)
      + `nginx.conf.template` envsubst **validado ao vivo** (build+run, SPA 200) + CD `deploy-staging.yml` GATED
      (`STAGING_DEPLOY_ENABLED` → SKIPPED até ativar; migrate→seed staging→deploy api+web→smoke) + `smoke-staging.mjs`
      (`/health/ready`+login demo+`/me`, falha=vermelho). Zero segredo no diff; gate `env.ts` intacto. Achados
      não-bloqueantes p/ PR6: P-SAN-SEED-GUARD (guarda runtime no seed), P-SAN-SMOKE-PROXY (e2e via nginx web),
      STAGING_API_URL sem `/api/v1` no dossiê. Ativação viva (smoke real) = junta-de-ativação no hand-off.
      **PR #181, merge `b772103`, CI verde (backend/flutter/frontend/docker), 2026-07-14.**
- [x] **PR 6 — Ω-INFRA-3** (produção config-as-code + trava dupla) — design-junta APROVADO_CONDICIONADO 3/3
      (critico/devops/secops; condições dobradas na impl) + junta-de-código J-SAN-PROD-CODE. FIX **P-SAN-CORS**
      (env.ts gate rejeita vazio/`*` em prod + app.ts allowlist + testes) e **P-SAN-SEED-GUARD** (assertSeedAllowed
      estrito nos 3 seeds). `fly.production.toml` api+web (min>=1, force_https, sem seed) + `deploy-production.yml`
      GATED (workflow_dispatch, promoção por IMAGEM, trava dupla: ata go-live por SHA + smoke-staging-verde-mesmo-SHA
      real + rollback ensaiado) + `smoke-production.mjs` (readiness + CORS restritivo) + Runbooks A/B. migration_needed
      =false. Suíte 0 fail (+15 backend). Follow-ups: P-SAN-PROD-BOOTSTRAP, P-SAN-PROD-WEBIMG. Go-live = hand-off.
      **PR #NN, merge `<hash>` — pendente push/merge.**
- [ ] **PR 7 — Ω-INFRA-4** (backup + observabilidade). Scripts backup/restore + PD-INFRA-2 autônomos; restore
      comprovado contra ambiente real = handoff.
- [ ] **Relatório final** `relatorio-saneamento-infra.md` + dossiê único de ativação ao humano.

## Teto autônomo (ratificado J-SAN-0): PR1→PR4 completos + IaC/pipelines/scripts/runbooks de PR5-7 escritos e
## aprovados em junta-de-código. Hand-off = ativação viva (um único dossiê, humano interrompido uma vez).
