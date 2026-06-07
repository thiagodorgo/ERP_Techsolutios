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
    "token_type": "Bearer",
    "expires_in": 3600,
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

### Mobile

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

### Anexos de checklist

`POST /mobile/checklist-runs/:runId/attachments` preserva o contrato JSON legado com `fileUrl`, mas tambem aceita upload real via `multipart/form-data`.

Formato multipart:

- campo `file`: arquivo obrigatorio;
- campo `componentId`: componente do template da execucao;
- campo `metadata`: JSON object opcional em string.

Limites locais configuraveis em `.env`:

- `CHECKLIST_ATTACHMENT_STORAGE_DRIVER=local`
- `CHECKLIST_ATTACHMENT_STORAGE_PATH=storage/checklist-attachments`
- `CHECKLIST_ATTACHMENT_MAX_SIZE_MB=10`
- `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES=image/jpeg,image/png,image/webp,application/pdf`

Resposta: cria registro em `checklist_attachments` com `fileUrl` logico `local://checklist-attachments/<tenantId>/<runId>/<filename>`, nome sanitizado, MIME type, tamanho e `metadata.storageDriver`, `metadata.storageKey` e `metadata.checksumSha256`. O backend nao expõe path absoluto do servidor.

`GET /mobile/checklist-runs/:runId/attachments/:attachmentId/download` retorna o arquivo somente quando `runId`, `attachmentId`, tenant, RBAC e RLS forem validos. Acesso cross-tenant deve retornar 404 seguro ou 403 quando faltar permissao.

Storage S3-compatible permanece pendente. A arquitetura atual isola driver, storage key e metadados para permitir futura troca sem remover `fileUrl` nem quebrar clientes existentes.

Frontend:

- `frontend/src/modules/checklists/checklist-attachments.service.ts` expõe upload multipart e download protegido.
- `VITE_USE_MOCKS=true` mantém upload/download simulados para desenvolvimento local.
- A W02A administrativa não executa checklist operacional; ela apenas sinaliza no preview que componentes `photo_upload`, `before_after` e `damage_map` produzem evidências com upload seguro.
- M10, M11 e M12 devem consumir os mesmos services/componentes quando as telas operacionais forem implementadas.

Regras especificas:

- M10 usa `towing_collection` para coleta de guincho/reboque, selecao de tipo de veiculo, imagem dinamica por tipo de veiculo, marcacao de avarias e fotos obrigatorias conforme template.
- M11 usa `towing_delivery` para entrega, nova vistoria e comparacao com M10.
- Se M11 detectar divergencia, exigir foto, observacao obrigatoria e ciencia de responsabilidade.
- M12 usa `technical_evidence` para foto antes, foto depois e observacoes em reparo, manutencao, construcao ou servico tecnico; nao pertence ao escopo de guincho/reboque.
- M10, M11 e M12 devem consumir schema de checklist vindo da API.
