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

## tenant_checklist

Modulo planejado: `tenant_checklist`.

Status atual: documentado para Fase 1. Endpoints abaixo ainda nao foram implementados nesta etapa. O mapeamento tela x endpoint tambem esta em `docs/api-screen-endpoints.md`.

Regras obrigatorias para todos os endpoints:

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

- `tenant_checklists:read`
- `tenant_checklists:create`
- `tenant_checklists:update`
- `tenant_checklists:publish`

Status planejados de template: `draft`, `published`, `archived`, `inactive`.

Estados oficiais de checklist no handoff Figma: checklist rascunho, checklist publicado e checklist inativo.

### Mobile

```http
GET    /mobile/checklists/available
GET    /mobile/checklists/:checklistId/render
POST   /mobile/checklist-runs
PATCH  /mobile/checklist-runs/:runId
POST   /mobile/checklist-runs/:runId/attachments
POST   /mobile/checklist-runs/:runId/markers
POST   /mobile/checklist-runs/:runId/complete
GET    /mobile/checklist-runs/:runId/comparison
POST   /mobile/checklist-runs/:runId/divergence
POST   /mobile/checklist-runs/:runId/acknowledgement
```

Permissoes:

- `checklist_runs:read`
- `checklist_runs:create`
- `checklist_runs:update`
- `checklist_runs:complete`

Status planejados de execucao: `in_progress`, `completed`, `cancelled`.

Estados oficiais de execucao no handoff Figma: execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.

Execucoes devem poder ser associadas a entidades do ERP por `related_entity_type` e `related_entity_id`, como OS, recebimento, entrega, manutencao, auditoria, vistoria, estoque, compras ou vendas.

Regras especificas:

- M10 usa `towing_collection` para coleta de guincho/reboque, selecao de tipo de veiculo, imagem dinamica por tipo de veiculo, marcacao de avarias e fotos obrigatorias conforme template.
- M11 usa `towing_delivery` para entrega, nova vistoria e comparacao com M10.
- Se M11 detectar divergencia, exigir foto, observacao obrigatoria e ciencia de responsabilidade.
- M12 usa `technical_evidence` para foto antes, foto depois e observacoes em reparo, manutencao, construcao ou servico tecnico; nao pertence ao escopo de guincho/reboque.
- M10, M11 e M12 devem consumir schema de checklist vindo da API.
