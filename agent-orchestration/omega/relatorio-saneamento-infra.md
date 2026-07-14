# Relatório da RODADA SANEAMENTO + Ω-INFRA — e DOSSIÊ ÚNICO DE ATIVAÇÃO

Rodada de 7 PRs em 4 trilhas (Ω-GATE · Ω-GOV · Ω-DOCS · Ω-INFRA-1..4), rodada em paralelo ao Ω3F, sem tocar
feature de produto. Teto 100% autônomo atingido (config-as-code + pipelines + scripts + runbooks escritos e
aprovados em junta-de-código); a **ativação viva** é um único dossiê de hand-off ao humano (fim deste arquivo).

## Matriz PR → junta → veredito → merge
| PR | Bloco | Junta | Veredito | Merge |
|---|---|---|---|---|
| #174 | Ω-GATE (CI roda a suíte inteira) | J-SAN-1 4/4 + J-SAN-0 3/3 | APROVADO | `fb2e5fd` |
| #175 | Ω-GOV (KPI-por-PR + autonomia por juntas) | J-SAN-2 5/5 (1 ciclo) | APROVADO | `361f2c1` |
| #176 | Ω-DOCS (descontaminação Kryos) | J-SAN-3 3/3 | APROVADO | `d0126d5` |
| #177 | Ω-INFRA-1 (containerização + healthcheck + provedor) | J-SAN-4 5/5 unânime | APROVADO | `f457d9f` |
| #181 | Ω-INFRA-2 (staging config-as-code) | J-SAN-5 3/3 (junta-de-código) | APROVADO | `b772103` |
| #182 | Ω-INFRA-3 (produção config-as-code + fixes CORS/seed) | design 3/3 + J-SAN-PROD-CODE 4/4 | APROVADO | `4a2db09` |
| #NN | Ω-INFRA-4 (backup + restore comprovado + observabilidade) | design 3/3 + J-SAN-6 | APROVADO | `<backfill>` |

## Testes antes → depois (gate do CI)
- **Backend:** 15/15 (só core-saas, pré-Ω-GATE) → **766/766** (suíte inteira no gate, Ω-GATE) → **768** (Ω-INFRA-1
  +2 health-routes) → **783** (Ω-INFRA-3 +15 CORS/seed) → **797** (Ω-INFRA-4 +14 backup). 0 fail.
- Frontend smoke 378/378 · Flutter 764/764 (trilhas não tocadas nesta rodada; último valor oficial).

## Decisões registradas
- **D-KPI-PER-PR** e **D-SAN-AUTONOMIA** (Ω-GOV) · **D-INFRA-PROVIDER** (Fly.io/gru 1º · AWS 2º — J-SAN-4, com R1/R2).
- **PD-INFRA-1** (provedor de deploy) · **PD-INFRA-2** (observabilidade = Fly-native US$0 + Actions cron; sem serviço
  pago; `docs/omega-pd.md`).
- **P-SAN-CORS** e **P-SAN-SEED-GUARD** RESOLVIDOS (Ω-INFRA-3).

## Agentes criados pela fábrica nesta rodada
`agente-devops-provisionador · agente-secops · agente-dba-guardiao · agente-finops · agente-ci-doutor` (fábrica do
Ω-GATE/rodada). Todos permanentes de infra (não descomissionados — reutilizáveis). Nenhum agente efêmero desta rodada.

## Reprovações / ciclos
Nenhuma reprovação dura (nenhum ciclo 3+). Ω-GOV teve 1 ciclo de condição (política antiga residual, corrigida).
Ω-INFRA-2/3/4 foram APROVADO/APROVADO_CONDICIONADO com condições **corrigidas antes do merge** (nunca merge-over).

## Pendências abertas (não bloqueiam os merges de config inerte)
- **P-SAN-E2E** — promover Playwright e2e a bloqueante contra o staging (pós-ativação).
- **P-SAN-PROD-BOOTSTRAP** — script idempotente do 1º tenant/platform_admin real (o seed só cria demo; `User.tenant_id`
  NOT NULL). Entregar + verificar na ativação (Runbook B).
- **P-SAN-PROD-WEBIMG** — publicar imagem do web no GHCR p/ rollback simétrico (hoje: `fly releases`).
- **P-INFRA-RLS** — RLS bypassada em runtime dev (superuser); em prod o app DEVE conectar com role não-superuser.
- Provedor de geocoding de produção (Nominatim público bloqueado em prod pelo gate).

---

# DOSSIÊ ÚNICO DE ATIVAÇÃO (hand-off humano — a fronteira que a D-SAN-AUTONOMIA não fabrica)

A config-as-code está pronta e aprovada em junta. O **go-live real** exige do humano (uma única vez):

## 1. Conta + billing + região (R1 a ratificar)
- Criar conta **Fly.io** + método de pagamento; região **`gru`** (São Paulo).
- **R1 (premissa a carimbar):** "dados no Brasil" é requisito de produto/venda? A LGPD (art. 33) não obriga. **Se
  NÃO for requisito, o 1º provedor correto seria Render** (PD-INFRA-1). Ratifique antes de contratar.

## 2. Apps + banco + rede (Fly)
- `fly apps create` dos 4 apps: `erp-techsolutions-api-staging`, `-web-staging`, `-api-production`, `-web-production`.
- Postgres gerenciado + Redis por ambiente (staging e produção **distintos**).
- `fly ips allocate-v6 --private` nos apps de API (habilita `.flycast` para o proxy nginx do web).
- Registry auth do **GHCR privado** no Fly (para `fly deploy --image ghcr.io/...` puxar a imagem) — ou tornar o
  pacote público conscientemente.

## 3. Domínio + TLS
- Registrar domínio + DNS apontando para os apps web; TLS gerenciado pelo Fly (`force_https=true` já no toml).

## 4. Secrets (GitHub Environments + Fly secrets) — NUNCA versionados
- **Environment `staging`:** `FLY_API_TOKEN · STAGING_DATABASE_URL · STAGING_DEMO_ADMIN_PASSWORD · STAGING_API_URL`
  + var `STAGING_DEPLOY_ENABLED=true`. **Fly secrets do app staging:** `DATABASE_URL · REDIS_URL · JWT_SECRET ·
  JWT_REFRESH_SECRET · CORS_ORIGIN` (allowlist https, sem `*` — senão o boot falha fail-closed).
- **Environment `production`:** `FLY_API_TOKEN · PROD_DATABASE_URL · PROD_API_URL` (+ opcional
  `PROD_SMOKE_EMAIL/PROD_SMOKE_PASSWORD`) + var `PROD_DEPLOY_ENABLED=true`. **Fly secrets do app prod:** os mesmos +
  `CORS_ORIGIN`. Environment `production` DEVE ter proteção (o go-live usa a trava dupla por junta, não required-reviewers).
- **Environment `backup`** (SEM required-reviewers/wait-timer): `PROD_DATABASE_URL` (papel read-only) `·
  BACKUP_S3_BUCKET · BACKUP_S3_REGION · AWS_ACCESS_KEY_ID · AWS_SECRET_ACCESS_KEY` (preferir OIDC) + var `BACKUP_ENABLED=true`.
- **Vars de uptime:** `STAGING_HEALTH_URL`, `PROD_HEALTH_URL` (URL completa do `/health`).

## 5. Bucket S3 do backup (privado + imutável)
- Bucket DEDICADO, **Block Public Access (4 flags)** + **SSE default (KMS)** + **bucket policy** (nega PutObject sem
  encriptação; TLS-only) + **Lifecycle 30d** + **Versioning** + **Object Lock (WORM)**. IAM mínimo (só o bucket/prefixo).

## 6. Ativação viva + gates de go-live (ordem)
1. Ligar `STAGING_DEPLOY_ENABLED` → 1º deploy de staging verde (smoke real). Só então o selo (b) da trava dupla de
   produção deixa de ser vácuo.
2. **PITR/WAL nativo** do Postgres gerenciado ATIVADO (R2 — RPO sub-24h). Ratificar **RPO<=24h** como decisão de
   negócio (aceitável p/ MVP? senão PITR é pré-go-live).
3. **Drill de restore CRONOMETRADO no ambiente real** (Runbook A) + RPO escrito → gate de go-live (R2). O drill
   local já provou o procedimento (~3,6s RTO / 62 policies RLS / isolamento não-superuser).
4. Bootstrap do 1º tenant real (Runbook B / P-SAN-PROD-BOOTSTRAP) — sem seed demo.
5. **Go-live de produção:** junta-5 unânime por SHA (`J-SAN-PROD-GOLIVE-<sha>` na main) + smoke-staging-verde-mesmo-SHA
   + rollback ensaiado → `workflow_dispatch` do `deploy-production.yml` com o `promote_sha`.
6. Ligar `BACKUP_ENABLED` + `*_HEALTH_URL` (backup diário + uptime).
- URLs de staging/prod entram em `docs/deployment.md` + `docs/demo-credentials.md` após o 1º deploy verde.

**Custo mensal contratado:** a definir na ativação (Fly gru: apps + Postgres/Redis gerenciados + S3 backup;
observabilidade US$0 no nativo). O relatório é a prestação de contas; a rodada não esperou por ele para concluir.
