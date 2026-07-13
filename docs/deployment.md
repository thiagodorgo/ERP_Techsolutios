# Deployment e Infraestrutura Local

## Visao geral dos ambientes

### Local

Ambiente de desenvolvimento na maquina do dev. Usa Docker Compose para subir PostgreSQL 16 e Redis 7 com credenciais locais de exemplo.

### Staging (plano — Ω-INFRA-2)

Ambiente de validacao integrada antes de producao. Deploy automatico por push na `main`: `prisma migrate deploy`
+ `db:seed:demo` (so staging) + smoke HTTP pos-deploy (login demo + `GET /health/ready` + 1 rota autenticada).
Secrets via **GitHub Environment `staging`**. Provisionamento real (conta + secrets) e hand-off humano (ver
"Fronteira de provisionamento" abaixo). Config-as-code do provedor entra no PR 5.

### Production (plano — Ω-INFRA-3)

App e banco distintos do staging. Promocao para producao so com **trava dupla**: junta de 5 unanime registrada
ANTES do deploy + smoke de staging verde no mesmo commit + rollback ensaiado. Dominio + TLS; CORS/URLs por
ambiente via env; `NODE_ENV=production` com os gates do `env.ts` ativos (JWT_SECRET/JWT_REFRESH_SECRET reais,
Nominatim publico bloqueado). **Sem seed demo em producao.** Secrets via **GitHub Environment `production`**.

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
