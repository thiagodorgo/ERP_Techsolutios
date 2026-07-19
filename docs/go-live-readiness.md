# Go-Live Readiness — ERP TechSolutions (Item 2 pós-Ω4)

**Data:** 2026-07-19 · **Veredito da junta:** **GO_WITH_GAPS** · **Junta:** devops-provisionador + secops + dba-guardião +
finops (avaliação por passo) + coordenador (junta final). Dry-runs REAIS executados no container `erp-postgres`.

> **Fronteira humana (parada irredutível da governança):** a **ativação viva** (conta Fly.io, billing, domínio, secrets,
> bucket S3) depende da **sua conta e pagamento** — não pode ser fabricada por agente. Este documento entrega **tudo até
> esse portão**: a config-as-code verificada, os dry-runs, o custo triangulado e o checklist ordenado de hand-off.

## 0. 🔴 BLOQUEIO CRÍTICO resolvido em parte (ação sua obrigatória)
O secops achou uma **chave Google Maps API ativa hardcoded** em arquivo rastreado (`docs/claude-code-handoff/ERP Web.dc.html:2670`).
- **Feito neste PR:** a chave foi **redigida do HEAD** (substituída por placeholder).
- **VOCÊ PRECISA:** **REVOGAR/ROTACIONAR** a chave no **Google Cloud Console** — a redação **não** a remove do histórico
  git, então ela deve ser considerada **comprometida**. Restrinja a nova chave por referer/HTTP + API + cota.

## 1. O que está PRONTO (verificado + dry-runs verdes)
- **Config-as-code Fly válida** (TOML parse OK): `fly.production.toml`/`fly.staging.toml` — app API região **gru (São Paulo)**,
  `force_https`, liveness raso `/api/v1/health` + readiness profundo `/api/v1/health/ready` (ping Postgres+Redis, 503 se down),
  prod `min_machines=1` (sem escala-a-zero), staging `min=0`, `NODE_ENV=production`, **sem seed em prod**.
- **5 workflows YAML válidos, pipelines GATED:** `deploy-staging` só com `STAGING_DEPLOY_ENABLED` (migrate→seed demo→deploy→smoke);
  `deploy-production` só com `PROD_DEPLOY_ENABLED` + **trava tripla** (ata junta-5 por SHA na main · smoke de staging verde no
  MESMO SHA · `rollback_rehearsed`) + **promoção por imagem** (mesmo artefato GHCR do SHA, sem rebuild) → `prisma migrate deploy`
  (forward-only, sem seed) → deploy → smoke.
- **Dockerfiles multi-stage** (backend + frontend), `USER node` (não-root), sem segredo no `/health`, `HEALTHCHECK` real.
- **Cadeia de 55 migrations aplica LIMPA do zero** (incl. Ω4 09..16 + o CHECK do item 1) — 0 erros; todas **aditivas**.
  **RLS ENABLE+FORCE + policy** confirmada nas 5 tabelas financeiras novas. CHECK `20260816` presente, **NOT VALID**, lógica
  de 3 valores verificada ao vivo (rejeita cancelled+NULL/garbage; aceita cancelled+keep). **0 linhas legadas** `cancelled+NULL`
  no banco → o `VALIDATE CONSTRAINT` passaria de imediato.
- **Restore comprovado (artefato):** `pg_dump -Fc` real → `restore-drill.sh` EXIT=0, **RTO ~4,5s** (volume mínimo), integridade
  (9 tenants / 23 users / 70 RLS policies / 79 tabelas), **isolamento multi-tenant sob role não-superuser** provado.
- **Gates de produção do `env.ts` INTACTOS pós-Ω4** (não tocado pelo Ω4): JWT_SECRET/JWT_REFRESH_SECRET obrigatórios com
  rejeição dos dev-secrets; CORS allowlist **sem curinga `*`** (fail-closed); Nominatim público bloqueado em prod; `booleanFlag`
  estrito; seed-guard aborta seed em produção. **Grep de segredo ZERADO** nos artefatos de infra (só `${{ secrets.X }}`).

## 2. Custo mensal estimado (Fly.io/gru, triangulado ≥3 fontes oficiais, 2026)
| Cenário | Faixa | Observação |
|---|---|---|
| **Mínima** | **~US$ 47–52/mês** | Postgres **Basic** 1GB (US$38) + storage ~US$3 + Redis free + compute ~US$6,7 (api 512MB + web 256MB, min=1, ×1,25 gru) + backup Tigris ~US$0 |
| **Típica** | **~US$ 90–110/mês** | Postgres **Starter** 2GB (US$72) + Redis pago + folga de storage/compute |

O **Postgres gerenciado domina 75–80%** da conta — a escolha do tier (Basic×Starter, ~US$34/mês de diferença) é a sua decisão de billing.

## 3. Checklist de HAND-OFF humano (ordem obrigatória)
1. **🔴 CRÍTICO** — Google Cloud Console: **revogar/rotacionar** a chave Google Maps exposta (item 0).
2. **🟠 R1** — Ratificar **por escrito** se "dados no Brasil" é requisito de produto/venda/LGPD **antes** de escolher o provedor
   (LGPD art.33 não obriga; se não for, Render/Neon podem sair mais barato). Se sim → Fly.io/gru.
3. **Provisionar conta Fly.io + billing (cartão) + ratificar gru** — decisão crítica: **junta-5 unânime + PD** (`docs/omega-pd.md`)
   antes de qualquer cobrança de serviço externo tarifado (D-SAN-AUTONOMIA).
4. **Criar apps Fly** (`erp-techsolutions-api-{staging,production}` + web) + **Postgres gerenciado + Redis** distintos por ambiente;
   escolher o **tier do Postgres** (Basic × Starter).
5. **Domínio + DNS** → apps web (TLS gerenciado pelo Fly; `force_https` já no toml) + **registry auth do GHCR privado** no Fly.
6. **Secrets (NUNCA versionados)** nos GitHub Environments + Fly secrets: staging (FLY_API_TOKEN, STAGING_DATABASE_URL,
   STAGING_DEMO_ADMIN_PASSWORD, STAGING_API_URL) e production (FLY_API_TOKEN, PROD_DATABASE_URL, PROD_API_URL,
   **PROD_SMOKE_EMAIL/PASSWORD**) + Fly secrets do app (DATABASE_URL, REDIS_URL, JWT_SECRET, JWT_REFRESH_SECRET, CORS_ORIGIN allowlist).
7. **Bucket S3 privado + imutável** (SSE + Versioning/Object Lock) + credenciais/OIDC; `BACKUP_ENABLED=true` (arma o cron diário);
   **ativar PITR/WAL** do Postgres gerenciado e ratificar **RPO≤24h**.
8. **Ligar `STAGING_DEPLOY_ENABLED=true`** e obter **1º deploy de staging com smoke real verde** — pré-requisito da trava (b) de produção.
9. **🟠 R2 (gate bloqueante)** — **drill de restore CRONOMETRADO no ambiente real**: baixar `.dump` do S3 → restaurar em DB vazio
   → subir o app apontando ao DB restaurado → **provar LOGIN OK + 1 rota autenticada** → escrever o **RPO/RTO reais** no runbook.
10. Comitar a **ata de go-live junta-5 unânime por SHA** (`J-SAN-PROD-GOLIVE-<sha>.md`) na main → `PROD_DEPLOY_ENABLED=true` →
    disparar `deploy-production`.
11. **Follow-up** (após 13..16 em prod + zero `cancelled+NULL` confirmado): rodar **`VALIDATE CONSTRAINT work_orders_cancelled_decision_check`** (P-Ω3F6-LEGACY-NULL).
12. Setar `vars.STAGING_HEALTH_URL` / `PROD_HEALTH_URL` → ativa o `uptime-check`.

## 4. Gaps residuais (por severidade)
- **CRÍTICA:** chave Google Maps versionada — redigida do HEAD; **rotação humana obrigatória** (segue no histórico).
- **ALTA:** R1 (requisito "dados no Brasil" não ratificado) · R2 (drill de restore cronometrado com app vivo — não executável fora do ambiente real).
- **MÉDIA:** smoke de prod só cobre rota autenticada com PROD_SMOKE_EMAIL/PASSWORD · trava (b) é vácuo até staging ativo · VALIDATE
  CONSTRAINT não operacionalizado como bloco rastreado · tier do Postgres (US$34/mês de swing) não fechado.
- **BAIXA:** prod `min=1` → blip no deploy (HA quer ≥2, pós-MVP) · item 1 forward-only deixa legadas NULL (constraint aditiva/inócua) ·
  migrations 13..16 ainda não no DB de dev (não afeta CD) · RTO ~4,5s é sobre volume mínimo (re-medir em escala).

## 5. Conclusão
A **config-as-code está go-live-ready** e todos os dry-runs possíveis **passaram**. O que falta é **exclusivamente humano**:
rotacionar o segredo exposto, ratificar o provedor, abrir a conta/billing, setar secrets e executar os 2 gates que só existem
no ambiente real (staging verde + drill de restore cronometrado). **Nenhum código bloqueia o go-live.** Fonte-mãe do runbook:
`agent-orchestration/omega/relatorio-saneamento-infra.md` (DOSSIÊ ÚNICO DE ATIVAÇÃO); este documento é a **atualização pós-Ω4**.
