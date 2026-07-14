# Deployment e Infraestrutura Local

## Visao geral dos ambientes

### Local

Ambiente de desenvolvimento na maquina do dev. Usa Docker Compose para subir PostgreSQL 16 e Redis 7 com credenciais locais de exemplo.

### Staging (config-as-code — Ω-INFRA-2)

Ambiente de validacao integrada antes de producao, no **Fly.io / regiao `gru`** (D-INFRA-PROVIDER). Config-as-code
JA no repo (o provisionamento vivo e hand-off — ver "Fronteira de provisionamento"):

- **`fly.staging.toml`** (backend) e **`frontend/fly.staging.toml`** (web/nginx) — apps `erp-techsolutions-api-staging`
  e `erp-techsolutions-web-staging`, `primary_region = gru`, healthchecks liveness (`/health`) + readiness
  (`/health/ready`), `min_machines_running = 0` (staging pode escalar a zero). O web faz proxy same-origin de
  `/api` pela rede privada do Fly (`API_UPSTREAM = http://erp-techsolutions-api-staging.flycast`), via **template
  nginx** (`frontend/nginx.conf.template` + envsubst nativo do entrypoint) — validado local: envsubst renderiza o
  upstream e o nginx serve a SPA. (No Fly, `.flycast` resolve pela DNS interna mesmo com 0 maquinas ativas.)
- **CD `.github/workflows/deploy-staging.yml`**: push na `main` → `prisma migrate deploy` → `db:seed:demo` (SO
  staging) → `flyctl deploy` (api + web) → **smoke** (`scripts/smoke-staging.mjs`: `/health/ready` 200 + login
  demo + `GET /me`). **Smoke vermelho = deploy invalido.** O job e **GATED**: so roda com a repo variable
  `STAGING_DEPLOY_ENABLED == 'true'` — ate o humano provisionar, e SKIPPED e a `main` fica verde.

**Ativacao (hand-off humano — dossie):** criar conta Fly + `fly apps create` dos 2 apps + Postgres/Redis
gerenciados + preencher o **GitHub Environment `staging`** com os secrets `FLY_API_TOKEN`, `STAGING_DATABASE_URL`,
`STAGING_DEMO_ADMIN_PASSWORD`, `STAGING_API_URL` + `STAGING_DEPLOY_ENABLED=true`. **Secrets do app de staging**
(via `fly secrets set -a erp-techsolutions-api-staging`): `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`,
`JWT_REFRESH_SECRET` **e `CORS_ORIGIN`** (allowlist https:// da origem web de staging). **Atencao:** o staging roda
`NODE_ENV=production`, entao o gate do `env.ts` EXIGE `CORS_ORIGIN` sem `*` — **sem ela o boot falha de proposito**
(fail-closed) e o healthcheck nunca fica verde. **Regra geral: todo ambiente com `NODE_ENV=production` (staging e
producao) exige `CORS_ORIGIN`.** URL do staging entra aqui e em `docs/demo-credentials.md` apos o primeiro deploy verde.

### Production (config-as-code — Ω-INFRA-3)

App e banco **distintos** do staging, no **Fly.io/gru**. Config-as-code JA no repo; o go-live e hand-off humano.

- **`fly.production.toml`** (backend `erp-techsolutions-api-production`) e **`frontend/fly.production.toml`** (web) —
  `min_machines_running >= 1` e `auto_stop_machines = "off"` (produção NAO escala a zero), `force_https = true`,
  os mesmos dois healthchecks liveness/readiness. **`NODE_ENV = production`** com os gates do `env.ts` ativos
  (JWT_SECRET/JWT_REFRESH_SECRET reais; Nominatim publico bloqueado; **CORS allowlist obrigatoria** — o gate
  rejeita vazio/`*`). `CORS_ORIGIN` NAO e versionado no toml (**fail-closed**): sem allowlist https real o boot
  em produção falha de propósito, em vez de degradar para `*`. Nenhum segredo nos tomls.
- **CD `.github/workflows/deploy-production.yml`** — `workflow_dispatch` (nao dispara sozinho), GATED por
  `vars.PROD_DEPLOY_ENABLED == 'true'`, `environment: production`, `concurrency: deploy-production`. **Promocao por
  IMAGEM** (`flyctl deploy --image ghcr.io/<owner>/erp-backend:<promote_sha>` — o MESMO artefato validado em
  staging pelo SHA; nao rebuilda). Migrate `deploy` forward-only da pipeline; **sem `db:seed`**. Smoke de produção
  (`scripts/smoke-production.mjs`): readiness + prova de CORS restritivo + login opcional (usuario de smoke real).
- **Trava dupla** (nao usa required-reviewers humano; tres selos maquinaveis no CD): **(a)** ata de go-live
  junta-5 unanime **por SHA** (`agent-orchestration/omega/juntas/J-SAN-PROD-GOLIVE-<sha>.md`, nomeando o
  `promote_sha`) registrada ANTES; **(b)** smoke de staging **verde no mesmo SHA** (o CD checa a EXECUCAO real do
  job `deploy` + step `Smoke staging`, rejeitando run `skipped=success` — enquanto staging estiver desativado este
  selo e VACUO, entao ativar staging e pre-requisito); **(c)** rollback ensaiado (atestacao `rollback_rehearsed`
  amarrada a evidencia cronometrada na ata + imagem anterior presente no GHCR). **O merge do PR NAO e go-live** —
  entrega config inerte; a junta-5 por SHA + a ativacao viva sao hand-off humano irredutivel.

**Secrets** via **GitHub Environment `production`** (`FLY_API_TOKEN`, `PROD_DATABASE_URL`, `PROD_API_URL`,
opcional `PROD_SMOKE_EMAIL`/`PROD_SMOKE_PASSWORD`) + **Fly secrets do app** (`DATABASE_URL`, `REDIS_URL`,
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`). Nenhum versionado.

#### Runbook A — rollback ensaiavel (forward-only, P-007)

O deploy e a promocao da imagem GHCR `:<sha>`; o rollback e a **redeploy da imagem `:<sha-anterior>`** — simetrico.

1. **Backend:** `fly deploy --config fly.production.toml --image ghcr.io/<owner>/erp-backend:<sha-anterior>`
   (o pull do GHCR **privado** exige registry auth no Fly — item do dossie de ativacao; alternativa nativa:
   `fly releases -c fly.production.toml` + `fly deploy --image <release anterior>`).
2. **Frontend:** o web **nao** tem imagem GHCR (gap **P-SAN-PROD-WEBIMG**) → rollback via `fly releases -c
   frontend/fly.production.toml` (release nativo anterior) ou rebuild do SHA anterior.
3. **Migrations sao forward-only (P-007):** rollback de codigo **nao** desfaz schema. Se o codigo anterior for
   incompativel com uma migration ja aplicada, o runbook exige um **fix-forward** (nova migration aditiva) — nunca
   `migrate resolve --rolled-back` as cegas em produção. Toda migration da rodada e aditiva justamente para isso.
4. **Ensaio (pre-go-live):** executar o ciclo `deploy N → deploy da imagem N-1 → smoke verde` **em staging**,
   cronometrar o RTO e anexar a evidencia (comando + saida + tempo) na ata `J-SAN-PROD-GOLIVE-<sha>`. O selo (c)
   do CD referencia essa evidencia; a parte cronometrada permanece atestacao humana registrada na junta-5.

#### Runbook B — provisionamento do 1o tenant real (sem seed demo)

Produção **nunca** roda `db:seed`/`db:seed:demo` (guarda `assertSeedAllowed` + ausencia do passo no CD). O
bootstrap do 1o tenant/administrador de plataforma real e uma acao de **ativacao** contra o banco vivo de
produção (exige o DB provisionado), NAO um passo deste PR. Requisitos:

1. E um **bootstrap dedicado e idempotente** (tenant de sistema + role `super_admin` + platform admin +
   credencial), exigindo `PLATFORM_ADMIN_EMAIL`/`PLATFORM_ADMIN_PASSWORD` — **nunca** o seed demo. O script de
   bootstrap idempotente e verificado contra um banco prod-like e entregue na ativacao (follow-up
   **P-SAN-PROD-BOOTSTRAP**; o seed atual so cria o tenant demo, inadequado para produção).
2. Se o bootstrap precisar rodar com `NODE_ENV=production`, usar o escape hatch **one-shot** `ALLOW_PROD_SEED=1`
   **inline no unico comando** e **remove-lo em seguida** — NUNCA persistir a variavel no `[env]` do toml nem
   como secret fixo (senao reabre o seed demo no mesmo ambiente).
3. Dominio + TLS pelo Fly (certs gerenciados) apos o `fly apps create` e o apontamento de DNS.

### Provedor (decidido na PD-INFRA-1 — `docs/omega-pd.md`)

**Fly.io (regiao `gru`/Sao Paulo)** — 1a escolha (regiao BR/LGPD + Postgres gerenciado + menor lock-in via imagem
OCI + `fly.toml`). **AWS (Lightsail -> RDS/ECS)** — fallback quando a recuperabilidade do dado financeiro (PITR
padrao-ouro) virar prioridade. A escolha vai a junta de 5 unanime; a config-as-code (fly.toml/render.yaml/IaC)
e escrita para o vencedor no PR 5.

## Containers e imagem (Ω-INFRA-1)

- **Backend** — `Dockerfile` multi-stage (build TS + `prisma generate` no `builder`; runtime `node:20-bookworm-slim`
  com so as deps de producao + client Prisma gerado; **usuario nao-root**; `HEALTHCHECK` na readiness). Metadados
  de build (`APP_VERSION`/`GIT_COMMIT`) injetados por `--build-arg` e expostos no `/health` (sem segredo).
- **Frontend** — `frontend/Dockerfile` (Vite build -> **nginx** servindo o estatico, com gzip, cache de assets
  e proxy same-origin de `/api/` para o backend). Justificativa: nginx da cache/gzip nativos e desacopla do backend.
- **CI publica no GHCR** — o job `docker` do `ci.yml` builda a imagem do backend em TODO PR (valida o Dockerfile)
  e **publica no GHCR** (`ghcr.io/<owner>/erp-backend:<sha>` + `:latest`) **apenas em push na `main`**, via
  `GITHUB_TOKEN` (sem conta/segredo externo).

### Validacao local-prod (nao e o deploy do provedor)

`docker-compose.prod.yml` sobe Postgres + Redis + `migrate` (one-shot `prisma migrate deploy`) + `api` (imagem de
runtime) + `web` (nginx). Valida o stack containerizado ponta a ponta:

```bash
# porta do host configuravel (evita conflito com um dev server em :3000)
API_PORT=3001 docker compose -f docker-compose.prod.yml up -d --build
curl -s http://localhost:3001/api/v1/health/ready      # 200 {"status":"ready", checks: pg/redis up}
curl -s http://localhost:8080/                          # SPA (nginx)
curl -s http://localhost:8080/api/v1/health             # proxy nginx -> backend
docker compose -f docker-compose.prod.yml down -v
```

Os `JWT_SECRET`/`JWT_REFRESH_SECRET`/`POSTGRES_PASSWORD` no compose.prod sao **placeholders de validacao local**,
NAO segredos de producao.

### Fronteira de provisionamento (hand-off humano — D-SAN-AUTONOMIA)

A `D-SAN-AUTONOMIA` pre-autoriza a **decisao**/gasto de provedor, mas nao fabrica credencial. O go-live real exige,
**do humano**: conta no provedor + cartao/billing + verificacao + dominio registrado & DNS + os valores dos secrets
nos GitHub Environments. O agente entrega toda a config-as-code (Dockerfile, `/health`, compose.prod, pipeline CD,
runbooks) aprovada em junta-de-codigo; a ativacao viva (smoke/restore reais) e um unico dossie de hand-off entre
o PR 4 e o PR 5.

## Infraestrutura local

Subir PostgreSQL e Redis:

```bash
docker compose up -d
```

Derrubar containers mantendo volumes:

```bash
docker compose down
```

Resetar volumes locais:

```bash
docker compose down -v
```

Alerta: `docker compose down -v` apaga os dados locais do PostgreSQL e do Redis.

## Configuracao do backend

Instalar dependencias:

```bash
npm install
```

Configurar variaveis locais:

```bash
cp .env.example .env
```

Storage de anexos de checklist:

- padrao local: `CHECKLIST_STORAGE_PROVIDER=local` e `CHECKLIST_STORAGE_LOCAL_DIR=storage/checklist-attachments`;
- S3-compatible: `CHECKLIST_STORAGE_PROVIDER=s3`, `CHECKLIST_STORAGE_S3_BUCKET`, `CHECKLIST_STORAGE_S3_REGION`, `CHECKLIST_STORAGE_S3_ENDPOINT` opcional, `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE` e `CHECKLIST_STORAGE_S3_PREFIX`;
- credenciais S3 devem vir de secrets do ambiente (`CHECKLIST_STORAGE_S3_ACCESS_KEY_ID` e `CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY`) ou cadeia padrao do provider, nunca de valores reais commitados;
- `.env.example` usa apenas placeholders vazios e exemplos locais.

Gerar Prisma Client:

```bash
npm run db:generate
```

Rodar migrations:

```bash
npm run db:migrate
```

Rodar seed:

```bash
npm run db:seed
```

O seed local/dev e idempotente e garante:

- tenant demo `demo`;
- Tenant Admin local `admin.demo@example.com`, senha local `DEMO_ADMIN_PASSWORD` ou fallback `ChangeMe123!`;
- Platform Admin local `platform.admin@erp.local`, senha local `E2E_PLATFORM_PASSWORD` ou fallback `platform-admin-dev-password`.

Essas credenciais sao apenas exemplos de desenvolvimento e E2E. Nunca use esses valores em producao.

Rodar backend:

```bash
npm run dev
```

## Validacao

```bash
npm run check
npm test
npm run build
```

Validacao E2E local:

```bash
docker compose up -d
npx playwright install chromium
npm run db:migrate
npm run test:e2e
```

O E2E usa Playwright, sobe backend local em modo Prisma e frontend Vite em modo real. O comando executa o seed demo idempotente antes da suite e cobre login tenant, bloqueio de Platform Console para Tenant Admin, login Platform Admin e acesso positivo a `/platform/tenants`. Artifacts pesados ficam ignorados por Git em `playwright-report/` e `test-results/`.

Validacao de mensageria/jobs Redis:

```bash
docker compose up -d
node --test --import tsx tests/job-queue.test.ts
node --test --import tsx tests/domain-events.test.ts
node --test --import tsx tests/notifications.test.ts
node --test --import tsx tests/notification-routes.test.ts
```

Esses testes usam o Redis local do Docker Compose e prefixes isolados por teste.

Notificacoes internas nao exigem variavel de ambiente propria nesta fase. Elas usam PostgreSQL para persistencia, RLS por tenant e Redis apenas para o job `notification-dispatch`.

Cloud usage metering nao exige credencial AWS nesta branch. O uso e registrado internamente em PostgreSQL e a agregacao diaria e acionada pelo job `cloud-usage.aggregate-daily`; scheduler/cron produtivo fica para etapa futura.

AWS CUR cost import nesta fase usa arquivo local/mock e nao exige credenciais AWS. As variaveis abaixo sao passivas para etapa futura com S3/Athena:

```env
AWS_CUR_IMPORT_ENABLED=false
AWS_CUR_S3_BUCKET=
AWS_CUR_S3_PREFIX=
AWS_CUR_S3_REGION=
AWS_CUR_ATHENA_DATABASE=
AWS_CUR_ATHENA_WORKGROUP=
AWS_CUR_ATHENA_OUTPUT_LOCATION=
```

Cloud cost allocation nao exige variavel de ambiente propria nesta branch. O engine consome PostgreSQL local com `cloud_usage_*` e `cloud_cost_*`, roda via API Platform ou job `cloud-cost-allocation.run` e nao depende de AWS real.

Cloud charge markup rules nao exige variavel de ambiente propria nesta branch. O engine consome `tenant_cloud_cost_allocations`, regras persistidas em PostgreSQL e roda via API Platform ou job `cloud-charges.calculate`. Nao integra gateway, checkout, fatura ou emissao fiscal.

## Seguranca

- Nunca commitar `.env`.
- Nunca commitar senhas, tokens, chaves privadas ou secrets reais.
- `DATABASE_URL`, `REDIS_URL` e `JWT_SECRET` em `.env.example` sao exemplos locais.
- Producao deve usar secrets do provedor/cloud/GitHub Actions.
- PostgreSQL e Redis locais nao representam ambiente produtivo.
- Cloud usage metering, AWS CUR cost import, Cloud cost allocation e Cloud charge markup rules nao devem receber secrets AWS reais nas foundations atuais.
- Este bloco nao configura deploy produtivo.

## Operacao (Ω-INFRA-4) — observabilidade, backup, restore, uptime

### Observabilidade (onde ver log/metrica)
Decisao PD-INFRA-2 (`docs/omega-pd.md`): **nativo da Fly** (custo US$0, dado em gru/BR). Logs em tempo real:
`fly logs -a <app>` (live-tail) e o dashboard. Metricas: managed Prometheus (~15d) + managed Grafana em
`fly-metrics.net`. Alerta de aplicacao: regras no Grafana. NENHUM serviço externo pago adotado (Better Stack/
Axiom sao upgrades documentados, so com junta-5 + LGPD — ver PD-INFRA-2). **Nota de escopo:** os logs/metricas
nativos sao ATIVACAO viva (nao wired neste PR); o PR entrega o BACKUP e o UPTIME-PROBE.

### Backup do Postgres (pg_dump -Fc → S3)
- **`.github/workflows/backup-database.yml`** — schedule diario 06:00 UTC (03:00 BRT), GATED por
  `vars.BACKUP_ENABLED == 'true'` (SKIPPED ate ativar), Environment DEDICADO `backup` (sem required-reviewers,
  para o cron nao-assistido nao travar). Roda `scripts/backup-database.mjs`: `pg_dump -Fc` (custom, comprimido) →
  auto-valida com `pg_restore -l` (nunca sobe dump truncado) → `PutObject` no bucket dedicado com
  `ServerSideEncryption` → retencao 30d SEGURA. Credenciais do Postgres via `PG*` env (nunca em argv/process table);
  creds AWS pela cadeia padrao do SDK.
- **Bucket S3 (hand-off de ativacao — OBRIGATORIO):** PRIVADO (Block Public Access nos 4 flags), **SSE default**
  (idealmente KMS), **bucket policy** negando `PutObject` sem encriptacao e negando `aws:SecureTransport=false`
  (TLS-only), e **retencao autoritativa do provedor**: S3 **Lifecycle** (expiracao 30d) + **Versioning** +
  **Object Lock (WORM)** para que um bug/credencial comprometida NAO destrua os backups. O `DeleteObject` do
  script e conveniencia (guardas: so apos upload OK, so chaves do prefixo com timestamp valido, nunca a chave
  recem-enviada, nunca deixa < keepMinimum, lista truncada aborta a poda) — a rede de seguranca e o provedor.
- **IAM minimo:** as credenciais AWS do workflow so `s3:PutObject/GetObject/ListBucket/DeleteObject` no bucket/
  prefixo dedicado (preferir OIDC a chave longa); o `PROD_DATABASE_URL` do backup pode apontar para um papel
  Postgres **read-only** dedicado (reduz blast radius).
- **Teto de 5GB por objeto** (PutObject cru, sem multipart): DB cujo `.dump` passe de 5GB FALHA — quando o
  volume crescer, migrar para `@aws-sdk/lib-storage` (multipart). Registrado como limite de escala conhecido.
- **Versao do cliente:** `pg_dump` DEVE ser >= major do servidor gerenciado (o workflow fixa `postgresql-client-16`).
  Re-verificar em QUALQUER upgrade de major do provedor.

### Restore — runbook + RPO/RTO (DRILL COMPROVADO)
Restaurar o `.dump` (pg_dump -Fc) baixado do S3 num banco vazio via `pg_restore`, exatamente o formato que o
script produz (casado com `scripts/restore-drill.sh`):
```bash
# 1) baixar o objeto do S3 (aws s3 cp s3://<bucket>/db-backups/<chave>.dump ./restore.dump)
# 2) restaurar num alvo VAZIO
createdb -h <host> -U <admin> erp_restore
pg_restore -h <host> -U <admin> -d erp_restore -j4 restore.dump
# 3) apontar uma instancia do app (DATABASE_URL=...erp_restore) e provar login + rota autenticada
```
- **DRILL comprovado ao vivo (Ω-INFRA-4):** o `scripts/backup-database.mjs` REAL rodou (`pg_dump -Fc` 713.655
  bytes) → upload a um S3-compativel (MinIO, SSE) → **download do objeto** (byte-exato) → `pg_restore` do objeto
  baixado **EXIT=0 em ~3,6s (RTO)** → integridade SOURCE==RESTAURADO exata (9 tenants / 16 users / **62 policies
  RLS** / 71 tabelas) → **isolamento por tenant comportamental sob role NAO-superuser** (FORCE RLS): com
  `app.current_tenant_id` de UMA org, so as linhas dessa org sao visiveis (1 tenant distinto). Re-medir o RTO
  por faixa de tamanho no provedor gerenciado (restore e super-linear com indices).
- **Em PRODUCAO o app conecta com role NAO-superuser** (o `app_user`, sem BYPASSRLS) — nunca `postgres` —, senao
  o `FORCE ROW LEVEL SECURITY` e ignorado e o isolamento por tenant nao vale. Confirmar na ativacao.
- **RPO/RTO:** RPO **<= 24h** com o dump diario (perda maxima de 1 dia). Para **RPO sub-24h**, ATIVAR o
  **PITR/WAL nativo** do Postgres gerenciado (R2 do D-INFRA-PROVIDER) — trilha de hand-off separada. O dump S3 e a
  copia **portavel/off-provider**; o PITR e a copia de **baixo RPO**. A missao exige AMBOS. **RPO<=24h e decisao
  de NEGOCIO a ratificar** (aceitavel para MVP? um ERP financeiro/OS pode exigir menos — nesse caso PITR e
  pre-go-live, nao ativacao futura).

### Uptime / alerta (quem e alertado)
- **`.github/workflows/uptime-check.yml`** — cron `*/5`, dois jobs (staging/prod) gated por
  `vars.STAGING_HEALTH_URL`/`vars.PROD_HEALTH_URL` != ''. Roda `scripts/uptime-check.mjs` (GET `/health`;
  status != 200/timeout = down → run vermelho → **notificacao nativa do GitHub**).
- **Limitacoes aceitas p/ MVP (dossie de ativacao):** o schedule do Actions atrasa/pula sob carga (NAO e
  sub-minuto nem multi-PoP); o alerta nativo NAO tem on-call/ACK/escalonamento; o schedule **auto-desabilita
  apos 60d** sem atividade no repo (confirmar vivo). O custo US$0 do cron depende de o repo ser **PUBLICO**
  (minutos ilimitados) — se virar PRIVADO, `*/5` passa a custar: reduzir cadencia ou migrar para monitor
  sintetico (Better Stack FREE, upgrade documentado no PD-INFRA-2).
