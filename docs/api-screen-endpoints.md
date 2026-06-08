# API x Telas

Este documento mapeia telas Web/Mobile para endpoints do backend. O prefixo implementado nesta rodada e `/api/v1`.

## Autenticacao

### W01 · Login e selecao de contexto

Objetivo: autenticar usuario, criar sessao local tenant-scoped, renovar access token quando necessario e encerrar sessao.

Endpoints implementados:

```http
POST /auth/login
POST /auth/refresh
POST /auth/logout
```

Regras:

- `POST /auth/login` recebe `tenantId`, `email` e `password`, retorna access token, refresh token, expiracoes, usuario, tenant, roles e `sessionId`;
- refresh token e persistido somente como hash em `auth_sessions`;
- `POST /auth/refresh` recebe `refreshToken`, valida sessao ativa, rotaciona refresh token e retorna novo access token;
- `POST /auth/logout` revoga a sessao de refresh de forma idempotente;
- o frontend deve tentar refresh uma unica vez em `401` de rota protegida e nao deve tentar refresh nos endpoints `/auth/login`, `/auth/refresh` ou `/auth/logout`;
- logout deve limpar sessao local mesmo se a revogacao backend falhar ou a sessao ja estiver revogada.

## tenant_checklist

Feature configuravel por tenant. A plataforma fornece componentes permitidos; o tenant cria e publica checklists combinando esses componentes.

### W02A · Administrador — Checklists

Objetivo: listar, criar, editar, ativar/inativar, configurar componentes e publicar checklists do tenant.

Permissoes:

- `tenant_checklists:read`
- `tenant_checklists:create`
- `tenant_checklists:update`
- `tenant_checklists:publish`

Endpoints implementados:

```http
GET    /tenant/checklists
POST   /tenant/checklists
GET    /tenant/checklists/:checklistId
PATCH  /tenant/checklists/:checklistId
DELETE /tenant/checklists/:checklistId
GET    /tenant/checklist-components
GET    /tenant/checklists/templates
POST   /tenant/checklists/:checklistId/publish
```

Regras:

- `tenant_id` deve vir do contexto autenticado.
- O body nao deve ser fonte confiavel de `tenant_id`.
- Checklist deve ter tipo `towing_collection`, `towing_delivery`, `technical_evidence` ou `custom`.
- Componentes oficiais do handoff Figma: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`.
- O tenant configura obrigatoriedade de fotos, observacoes, marcadores e ciencia.
- Publicacao deve versionar o schema consumido por Web/Mobile.
- Estados de checklist: rascunho, publicado e inativo.

## Mobile Checklists

M10, M11 e M12 devem renderizar schema retornado pela API, evitando hardcode de campos no cliente.

Permissoes:

- `checklist_runs:read`
- `checklist_runs:create`
- `checklist_runs:update`
- `checklist_runs:complete`
- `checklist_runs:acknowledge`

Endpoints implementados:

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

### M10 · Checklist de coleta

Tipo: `towing_collection`.

Uso: guincho/reboque, coleta, selecao de tipo de veiculo, imagem dinamica por tipo de veiculo, marcacao de avarias e fotos obrigatorias conforme template.

### M11 · Checklist de entrega

Tipo: `towing_delivery`.

Uso: guincho/reboque, entrega, nova vistoria e comparacao com a coleta.

Regra de divergencia:

- se a comparacao com M10 detectar divergencia, exigir foto e observacao obrigatoria;
- exigir ciencia de responsabilidade antes da conclusao quando configurado.
- estados possiveis: execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.

### M12 · Evidencia tecnica antes/depois

Tipo: `technical_evidence`.

Uso: reparo, manutencao, construcao ou servico tecnico, com foto antes, foto depois e observacoes conforme template.

M12 nao pertence ao escopo de guincho/reboque e nao deve reutilizar a semantica de coleta/entrega.
