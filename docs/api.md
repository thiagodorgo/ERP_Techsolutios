# API

O backend atual usa o prefixo `/api/v1`. Os contratos abaixo documentam o boundary inicial do Console da Plataforma.

## Autenticacao de rotas protegidas

Rotas protegidas devem usar `Authorization: Bearer <access_token>` como caminho principal de contexto autenticado. Um Bearer token valido alimenta `userId`, `tenantId`, roles e permissoes efetivas via RBAC do backend.

Headers legados (`x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles`, `x-permissions`) continuam aceitos apenas em desenvolvimento/teste para transicao. Em `NODE_ENV=production`, rotas sensiveis de plataforma, Core SaaS e Checklists rejeitam esse fallback. Bearer token invalido, malformado ou expirado retorna `401 INVALID_TOKEN` antes de qualquer fallback.

## Login

```http
POST /api/v1/auth/login
```

Body:

```json
{
  "tenantId": "uuid-do-tenant",
  "email": "admin.demo@example.com",
  "password": "ChangeMe123!"
}
```

Resposta de sucesso:

```json
{
  "data": {
    "authenticated": true,
    "access_token": "jwt-assinado",
    "accessToken": "jwt-assinado",
    "token_type": "Bearer",
    "tokenType": "Bearer",
    "expires_in": 3600,
    "expiresIn": 3600,
    "refresh_token": "refresh-jwt-assinado",
    "refreshToken": "refresh-jwt-assinado",
    "refresh_expires_at": "2026-06-14T00:00:00.000Z",
    "refreshExpiresAt": "2026-06-14T00:00:00.000Z",
    "session_id": "uuid-da-sessao",
    "sessionId": "uuid-da-sessao",
    "user": {
      "id": "uuid-do-usuario",
      "tenant_id": "uuid-do-tenant",
      "email": "admin.demo@example.com",
      "name": "Admin Demo",
      "status": "active"
    },
    "tenant": {
      "id": "uuid-do-tenant",
      "name": "Tenant Demo"
    },
    "roles": [
      {
        "id": "uuid-da-role",
        "key": "tenant_admin",
        "name": "Tenant Admin"
      }
    ]
  }
}
```

O frontend em modo real usa esse endpoint e envia `Authorization: Bearer` automaticamente nas chamadas seguintes. Headers legados ficam restritos a `VITE_USE_MOCKS=true`.

O refresh token e retornado ao cliente, mas no banco fica persistido apenas como hash em `auth_sessions.refresh_token_hash`. A resposta nunca inclui senha, `password_hash` ou segredo JWT.

## Refresh de sessao

```http
POST /api/v1/auth/refresh
```

Body:

```json
{
  "refreshToken": "refresh-jwt-assinado"
}
```

Resposta de sucesso:

```json
{
  "data": {
    "access_token": "novo-jwt-assinado",
    "accessToken": "novo-jwt-assinado",
    "token_type": "Bearer",
    "tokenType": "Bearer",
    "expires_in": 3600,
    "expiresIn": 3600,
    "refresh_token": "refresh-jwt-rotacionado",
    "refreshToken": "refresh-jwt-rotacionado",
    "refresh_expires_at": "2026-06-14T00:00:00.000Z",
    "refreshExpiresAt": "2026-06-14T00:00:00.000Z",
    "session_id": "uuid-da-sessao",
    "sessionId": "uuid-da-sessao"
  }
}
```

Regras:

- `refreshToken` ausente retorna `400 BAD_REQUEST`;
- refresh invalido, expirado, revogado ou reutilizado apos rotacao retorna `401 INVALID_REFRESH_TOKEN`;
- cada refresh bem-sucedido rotaciona o refresh token e substitui somente o hash persistido;
- o access token novo continua sendo usado via `Authorization: Bearer`.

## Logout

```http
POST /api/v1/auth/logout
```

Body:

```json
{
  "refreshToken": "refresh-jwt-assinado"
}
```

Resposta:

```json
{
  "data": {
    "revoked": true
  }
}
```

O logout e idempotente e revoga a sessao vinculada ao refresh token quando ela existir. Tokens ausentes, invalidos ou ja revogados nao expõem detalhes ao cliente.

## Console da Plataforma

Todas as rotas de plataforma devem exigir permissao `platform:*` correspondente e nao devem ser acessiveis por usuario comum de tenant.

O fallback por headers legados (`x-user-id`, `x-role`, `x-roles`, `x-permissions`) e temporario para desenvolvimento/teste/local. Em `NODE_ENV=production`, as rotas `/api/v1/platform/*` rejeitam esse fallback e devem usar actor autenticado.

### Listar tenants

```http
GET /api/v1/platform/tenants
```

Permissao: `platform:tenants:read`

Resposta:

```json
{
  "data": [
    {
      "id": "pten_demo",
      "name": "Techsolutions Industrial",
      "slug": "techsolutions-industrial",
      "plan": "professional",
      "status": "active",
      "activeUsers": 84,
      "enabledModules": ["dashboard", "users"],
      "createdAt": "2026-01-10T12:00:00.000Z"
    }
  ]
}
```

### Criar tenant

```http
POST /api/v1/platform/tenants
```

Permissao: `platform:tenants:create`

Body:

```json
{
  "name": "Cliente Demo",
  "slug": "cliente-demo",
  "plan": "starter",
  "adminName": "Admin Cliente",
  "adminEmail": "admin.cliente@example.com"
}
```

### Detalhar tenant

```http
GET /api/v1/platform/tenants/:tenantId
```

Permissao: `platform:tenants:read`

### Atualizar tenant

```http
PATCH /api/v1/platform/tenants/:tenantId
```

Permissao: `platform:tenants:update`

### Alterar status do tenant

```http
PATCH /api/v1/platform/tenants/:tenantId/status
```

Permissao: `platform:tenants:suspend`

Body:

```json
{
  "status": "suspended"
}
```

### Listar modulos do tenant

```http
GET /api/v1/platform/tenants/:tenantId/modules
```

Permissao: `platform:tenants:read`

### Atualizar modulos do tenant

```http
PATCH /api/v1/platform/tenants/:tenantId/modules
```

Permissao: `platform:modules:manage`

Body:

```json
{
  "enabledModules": ["dashboard", "users", "inventory"]
}
```

### Criar admin inicial do tenant

```http
POST /api/v1/platform/tenants/:tenantId/admin-user
```

Permissao: `platform:users:create_admin`

Body:

```json
{
  "name": "Admin Cliente",
  "email": "admin.cliente@example.com"
}
```

### Cloud usage metering

```http
GET /api/v1/platform/cloud-usage/summary
GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary
GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily
```

Permissao: `platform:cloud-usage:read`

Filtros aceitos: `periodStart`, `periodEnd` e `metricKey`.

Resposta de resumo:

```json
{
  "data": {
    "tenantId": "uuid-do-tenant",
    "periodStart": "2026-06-08T00:00:00.000Z",
    "periodEnd": "2026-06-08T23:59:59.999Z",
    "metrics": [
      {
        "metricKey": "checklist_run.completed",
        "quantity": 3,
        "unit": "count",
        "sourceType": "checklist_run"
      }
    ],
    "generatedAt": "2026-06-08T12:00:00.000Z"
  }
}
```

Esta API expõe uso interno por tenant. Nao expõe custo monetario, preco, margem, fatura, pagamento, bucket, storage key, path privado, headers ou payloads sensiveis.

## Observacoes

- A implementacao inicial pode usar mock/service em memoria enquanto a persistencia de `tenant_modules` nao estiver versionada.
- Contratos devem permanecer versionados e separados do boundary de tenant.
- Operacoes criticas devem gerar auditoria quando a camada persistente estiver pronta.

## tenant_checklist

Modulo implementado: `tenant_checklist`.

Status atual: backend real com migration, models Prisma, modulo `src/modules/checklists`, rotas Express, RBAC, RLS, auditoria, testes de rota e upload local real para anexos de checklist. O mapeamento tela x endpoint tambem esta em `docs/api-screen-endpoints.md`.

Regras obrigatorias para todos os endpoints:

- usar `Authorization: Bearer` como fonte principal de contexto autenticado;
- aceitar headers legados apenas em desenvolvimento/teste;
- obter `tenant_id` do contexto autenticado/middleware, nunca confiar em `tenant_id` vindo do body;
- validar `tenant_id` junto com qualquer `id`, `templateId`, `fieldId` ou `runId`;
- exigir RBAC por acao;
- auditar criacao, edicao, publicacao, desativacao, execucao, resposta, conclusao e cancelamento;
- preservar `template_version` em execucoes para nao quebrar historico.

### Componentes disponiveis

```http
GET /tenant/checklist-components
```

Permissao: `tenant_checklists:read`

Retorna o catalogo de componentes permitidos pela plataforma. O tenant pode escolher e configurar estes componentes, mas nao cria novos tipos em codigo.

Componentes oficiais implementados:

- `vehicle_selector`
- `damage_map`
- `photo_upload`
- `observation`
- `comparison`
- `acknowledgement`
- `before_after`

### Templates

```http
GET    /tenant/checklists
POST   /tenant/checklists
GET    /tenant/checklists/:checklistId
PATCH  /tenant/checklists/:checklistId
DELETE /tenant/checklists/:checklistId
GET    /tenant/checklists/templates
POST   /tenant/checklists/:checklistId/publish
```

Permissoes:

- `GET /tenant/checklists`: `tenant_checklists:read`
- `POST /tenant/checklists`: `tenant_checklists:create`
- `GET /tenant/checklists/:checklistId`: `tenant_checklists:read`
- `PATCH /tenant/checklists/:checklistId`: `tenant_checklists:update`
- `DELETE /tenant/checklists/:checklistId`: `tenant_checklists:update`
- `GET /tenant/checklists/templates`: `tenant_checklists:read`
- `POST /tenant/checklists/:checklistId/publish`: `tenant_checklists:publish`

Status de template: `draft`, `published`, `archived`, `inactive`.

Estados oficiais de checklist no handoff Figma: checklist rascunho, checklist publicado e checklist inativo.

### Runtime operacional compartilhado web/mobile

Os endpoints abaixo nasceram com prefixo `/mobile`, mas nesta fase tambem sao consumidos pelo runtime web operacional em `/operations/checklists`. Eles devem ser tratados como runtime schema-driven compartilhado. O prefixo pode ser renomeado futuramente sem quebra, mantendo compatibilidade ou alias.

```http
GET    /mobile/checklists/available
GET    /mobile/checklists/:checklistId/render
POST   /mobile/checklist-runs
PATCH  /mobile/checklist-runs/:runId
POST   /mobile/checklist-runs/:runId/attachments
GET    /mobile/checklist-runs/:runId/attachments/:attachmentId/download
POST   /mobile/checklist-runs/:runId/markers
POST   /mobile/checklist-runs/:runId/complete
GET    /mobile/checklist-runs/:runId/comparison
POST   /mobile/checklist-runs/:runId/divergence
POST   /mobile/checklist-runs/:runId/acknowledgement
```

Permissoes:

- `GET /mobile/checklists/available`: `checklist_runs:read` ou `checklist_runs:create`
- `GET /mobile/checklists/:checklistId/render`: `checklist_runs:read` ou `checklist_runs:create`
- `POST /mobile/checklist-runs`: `checklist_runs:create`
- `PATCH /mobile/checklist-runs/:runId`: `checklist_runs:update`
- `POST /mobile/checklist-runs/:runId/attachments`: `checklist_runs:update`
- `GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download`: `checklist_runs:read`
- `POST /mobile/checklist-runs/:runId/markers`: `checklist_runs:update`
- `POST /mobile/checklist-runs/:runId/complete`: `checklist_runs:complete`
- `GET /mobile/checklist-runs/:runId/comparison`: `checklist_runs:read`
- `POST /mobile/checklist-runs/:runId/divergence`: `checklist_runs:update`
- `POST /mobile/checklist-runs/:runId/acknowledgement`: `checklist_runs:acknowledge`

Status de execucao: `in_progress`, `completed`, `completed_with_divergence`, `pending_acknowledgement`, `cancelled`.

Estados oficiais de execucao no handoff Figma: execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.

Execucoes devem poder ser associadas a entidades do ERP por `related_entity_type` e `related_entity_id`, como OS, recebimento, entrega, manutencao, auditoria, vistoria, estoque, compras ou vendas.

Runtime web:

- `GET /mobile/checklists/available`: lista checklists publicados para iniciar execucao em `/operations/checklists`.
- `GET /mobile/checklists/:checklistId/render`: carrega schema publicado para `/operations/checklists/:checklistId/run`.
- `POST /mobile/checklist-runs`: cria a execucao ao iniciar o runtime.
- `PATCH /mobile/checklist-runs/:runId`: salva rascunho/respostas.
- `POST /mobile/checklist-runs/:runId/complete`: conclui execucao sem divergencia no MVP web.
- componentes de evidencia reutilizam upload/download de anexos.
- hardening frontend atual: validacao client-side por schema bloqueia conclusao quando obrigatorios basicos estao incompletos, mas o backend continua autoridade final.
- `GET /mobile/checklist-runs/:runId/comparison` alimenta o componente `comparison` quando presente no schema.
- `POST /mobile/checklist-runs/:runId/divergence` e chamado com observacao obrigatoria e evidencia ja anexada.
- `POST /mobile/checklist-runs/:runId/acknowledgement` e chamado apenas quando a execucao esta `pending_acknowledgement`.
- `POST /mobile/checklist-runs/:runId/markers` recebe markers estruturados de `damage_map` com tipo e descricao.

### Anexos de checklist

`POST /mobile/checklist-runs/:runId/attachments` preserva o contrato JSON legado com `fileUrl`, mas tambem aceita upload real via `multipart/form-data`.

Formato multipart:

- campo `file`: arquivo obrigatorio;
- campo `componentId`: componente do template da execucao;
- campo `metadata`: JSON object opcional em string.

Storage configuravel em `.env`:

- `CHECKLIST_STORAGE_PROVIDER=local|s3`
- `CHECKLIST_STORAGE_LOCAL_DIR=storage/checklist-attachments`
- `CHECKLIST_STORAGE_MAX_FILE_SIZE_MB=10`
- `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf`
- `CHECKLIST_STORAGE_S3_BUCKET`
- `CHECKLIST_STORAGE_S3_REGION`
- `CHECKLIST_STORAGE_S3_ENDPOINT`
- `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE=true`
- `CHECKLIST_STORAGE_S3_ACCESS_KEY_ID`
- `CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY`
- `CHECKLIST_STORAGE_S3_PREFIX=checklist-attachments`

As variaveis legadas `CHECKLIST_ATTACHMENT_*` continuam aceitas como aliases locais para preservar compatibilidade de ambiente.

Resposta: cria registro em `checklist_attachments` com nome sanitizado, MIME type, tamanho e `metadata.checksumSha256`. Para uploads gerenciados pelo backend, `fileUrl` publico passa a apontar para a rota protegida de download. `storageProvider`, `storageDriver`, `storageKey`, bucket, path privado e URLs internas (`local://` ou `s3://`) ficam restritos ao backend e nao devem aparecer na resposta da API.

`GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download` retorna o arquivo somente quando `runId`, `attachmentId`, tenant, RBAC e RLS forem validos. Acesso cross-tenant deve retornar 404 seguro ou 403 quando faltar permissao.

O provider `local` continua sendo o padrao de desenvolvimento. O provider `s3` usa storage S3-compatible via SDK AWS v3 e pode apontar para AWS S3, MinIO, Cloudflare R2 ou outro endpoint compativel. Testes de S3 usam client mockado; nenhum bucket real ou segredo real deve ser exigido.

## Notificacoes internas

Modulo implementado: `notifications`.

Endpoints:

```http
GET  /notifications
GET  /notifications/unread-count
POST /notifications/:notificationId/read
POST /notifications/read-all
POST /notifications/:notificationId/archive
```

Permissoes:

- `GET /notifications`: `notifications:read`
- `GET /notifications/unread-count`: `notifications:read`
- `POST /notifications/:notificationId/read`: `notifications:update`
- `POST /notifications/read-all`: `notifications:update`
- `POST /notifications/:notificationId/archive`: `notifications:update`

`GET /notifications` retorna apenas notificacoes do usuario autenticado no tenant atual. Filtros aceitos: `status`, `severity`, `type`, `sourceType` e `limit`.

Eventos iniciais que alimentam notificacoes via Redis/job: `checklist_run.completed`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`. Nao ha e-mail, SMS, WhatsApp, push externo ou chat nesta rodada.

Frontend web:

- rota `/notifications`;
- service/adapter/mock em `frontend/src/modules/notifications`;
- contador de nao lidas no AppShell e na sidebar tenant;
- acoes: listar, marcar como lida, marcar todas como lidas, arquivar e abrir `actionUrl` interna;
- `actionUrl` externa nao deve ser navegada pelo cliente;
- metadata completa, storage keys, tokens e ids internos de destinatario nao devem ser exibidos.

## Auditoria

Endpoint existente:

```http
GET /audit-events
```

Requer `audit.read` e retorna eventos do tenant do actor autenticado. O endpoint nao foi alterado de forma destrutiva nesta rodada.

A gravacao usa o contrato enterprise documentado em `docs/audit.md`. Campos complementares como `outcome`, `severity`, `correlationId`, `requestId`, IP, user-agent e `resourceType` ficam em `metadata` porque a tabela atual ja suporta JSON. Dados sensiveis sao sanitizados antes da persistencia.

Eventos principais cobertos: auth login/refresh/logout/sessao, `user.created`, `permission.denied`, publicacao e execucao de checklists, upload de anexo, divergencia e ciencia.

Frontend:

- `frontend/src/modules/checklists/checklist-attachments.service.ts` expõe upload multipart e download protegido.
- `frontend/src/modules/checklists/checklist-runtime.service.ts` expõe listagem, render, create/update/complete, marcadores, divergencia, acknowledgement e comparacao.
- `VITE_USE_MOCKS=true` mantém upload/download simulados para desenvolvimento local.
- A W02A administrativa não executa checklist operacional; ela apenas sinaliza no preview que componentes `photo_upload`, `before_after` e `damage_map` produzem evidências com upload seguro.
- M10, M11 e M12 devem consumir os mesmos services/componentes e o runtime schema-driven, sem telas hardcoded.

Regras especificas:

- M10 usa `towing_collection` para coleta de guincho/reboque, selecao de tipo de veiculo, imagem dinamica por tipo de veiculo, marcacao de avarias e fotos obrigatorias conforme template.
- M11 usa `towing_delivery` para entrega, nova vistoria e comparacao com M10.
- Se M11 detectar divergencia, exigir foto, observacao obrigatoria e ciencia de responsabilidade.
- M12 usa `technical_evidence` para foto antes, foto depois e observacoes em reparo, manutencao, construcao ou servico tecnico; nao pertence ao escopo de guincho/reboque.
- M10, M11 e M12 devem consumir schema de checklist vindo da API.
