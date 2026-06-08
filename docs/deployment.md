# Deployment e Infraestrutura Local

## Visao geral dos ambientes

### Local

Ambiente de desenvolvimento na maquina do dev. Usa Docker Compose para subir PostgreSQL 16 e Redis 7 com credenciais locais de exemplo.

### Staging futuro

Ambiente previsto para validacao integrada antes de producao. Ainda nao configurado neste bloco.

### Production futuro

Ambiente produtivo futuro. Deve usar secrets do provedor/cloud/GitHub Actions, banco gerenciado, Redis gerenciado ou equivalente, observabilidade e politicas de acesso adequadas.

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

## Seguranca

- Nunca commitar `.env`.
- Nunca commitar senhas, tokens, chaves privadas ou secrets reais.
- `DATABASE_URL`, `REDIS_URL` e `JWT_SECRET` em `.env.example` sao exemplos locais.
- Producao deve usar secrets do provedor/cloud/GitHub Actions.
- PostgreSQL e Redis locais nao representam ambiente produtivo.
- Cloud usage metering nao deve receber secrets AWS reais enquanto a branch entregar apenas uso interno.
- Este bloco nao configura deploy produtivo.
