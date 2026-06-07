# API

O backend atual usa o prefixo `/api/v1`. Os contratos abaixo documentam o boundary inicial do Console da Plataforma.

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

## Checklists configuraveis por tenant

Modulo planejado: `checklists`.

Status atual: documentado para Fase 1. Endpoints abaixo ainda nao foram implementados nesta etapa e devem seguir o prefixo atual `/api/v1` quando forem criados.

Regras obrigatorias para todos os endpoints:

- obter `tenant_id` do contexto autenticado/middleware, nunca confiar em `tenant_id` vindo do body;
- validar `tenant_id` junto com qualquer `id`, `templateId`, `fieldId` ou `runId`;
- exigir RBAC por acao;
- auditar criacao, edicao, publicacao, desativacao, execucao, resposta, conclusao e cancelamento;
- preservar `template_version` em execucoes para nao quebrar historico.

### Componentes disponiveis

```http
GET /api/v1/checklists/components
```

Permissao: `checklists.template.read`

Retorna o catalogo de tipos permitidos pela plataforma. O tenant pode escolher e configurar estes tipos, mas nao cria novos tipos em codigo.

Tipos iniciais planejados:

- `text`
- `textarea`
- `number`
- `currency`
- `date`
- `datetime`
- `select`
- `multi_select`
- `checkbox`
- `radio`
- `boolean`
- `photo`
- `file`
- `signature`
- `barcode`
- `qr_code`
- `location`
- `rating`

### Templates

```http
POST /api/v1/checklist-templates
GET /api/v1/checklist-templates
GET /api/v1/checklist-templates/:id
PUT /api/v1/checklist-templates/:id
PATCH /api/v1/checklist-templates/:id/status
DELETE /api/v1/checklist-templates/:id
```

Permissoes:

- `checklists.template.create`
- `checklists.template.read`
- `checklists.template.update`
- `checklists.template.delete`
- `checklists.template.publish`

Status planejados de template: `draft`, `published`, `archived`, `inactive`.

### Campos do template

```http
POST /api/v1/checklist-templates/:id/fields
PUT /api/v1/checklist-templates/:id/fields/:fieldId
DELETE /api/v1/checklist-templates/:id/fields/:fieldId
PATCH /api/v1/checklist-templates/:id/fields/reorder
```

Permissoes:

- `checklists.template.update`
- `checklists.template.publish` quando a alteracao implicar nova versao publicada

Campos planejados devem validar tipo permitido, `field_key`, `label`, `required`, `order_index`, `config`, `validation_rules` e `visibility_rules`.

### Execucoes

```http
POST /api/v1/checklist-runs
GET /api/v1/checklist-runs
GET /api/v1/checklist-runs/:id
POST /api/v1/checklist-runs/:id/answers
PATCH /api/v1/checklist-runs/:id/complete
PATCH /api/v1/checklist-runs/:id/cancel
```

Permissoes:

- `checklists.run.create`
- `checklists.run.read`
- `checklists.run.answer`
- `checklists.run.complete`
- `checklists.run.cancel`

Status planejados de execucao: `in_progress`, `completed`, `cancelled`.

Execucoes devem poder ser associadas a entidades do ERP por `related_entity_type` e `related_entity_id`, como OS, recebimento, entrega, manutencao, auditoria, vistoria, estoque, compras ou vendas.
