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

## Navegacao

### Sidebar/AppShell dinamicos

Objetivo: renderizar menu por usuario autenticado, boundary, tenant, permissoes, modulos habilitados, status de tela, rotas frontend, icones e grupos.

Endpoint implementado:

```http
GET /navigation/menu
```

Filtros opcionais:

```http
GET /navigation/menu?scope=platform
GET /navigation/menu?scope=tenant
GET /navigation/menu?scope=operations
GET /navigation/menu?scope=logistics
GET /navigation/menu?scope=finance
```

Regras:

- Platform Admin recebe apenas itens Platform quando filtra `scope=platform`;
- tenant comum nao recebe itens Platform;
- itens tenant/operacionais exigem permissao RBAC e modulo habilitado quando definido;
- `relatedEndpoints` e `status` documentam rastreabilidade da tela;
- autorizacao real continua nos endpoints de dominio.
- frontend implementado consome esta rota via `useNavigationMenu`;
- fallback local permanece apenas para mock/transicao e falha segura da API.

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

## Operacao em Campo

### Mapa Operacional

Objetivo: permitir que a tela `/operations/map` consulte a fundacao backend de localizacao de operadores em campo.

Status desta branch: UI inicial implementada no frontend web; Google Maps real, despacho, roteirizacao, WebSocket e novos endpoints ficam fora do escopo.

Endpoints implementados:

```http
POST /mobile/field-locations
GET  /field-locations/latest
GET  /field-locations/history
```

Permissoes:

- `POST /mobile/field-locations`: `field_location:send`
- `GET /field-locations/latest`: `field_location:read`
- `GET /field-locations/history`: `field_location:history`

Regras:

- envio mobile registra a localizacao do proprio actor autenticado;
- consulta web retorna somente dados do tenant atual;
- historico exige permissao separada para reduzir exposicao de dados sensiveis;
- `/operations/map` consome `GET /field-locations/latest` para dados atuais e pode usar `GET /field-locations/history` para historico por operador;
- a tela usa fallback/mock seguro quando a API falha, retorna vazia ou `VITE_USE_MOCKS=true`;
- localizacao com `capturedAt` acima de 15 minutos aparece como antiga.

## P04 · Platform Cloud Billing

Tela platform-scoped implementada em `/platform/cloud-billing`. Consolida uso, custo AWS, rateio, cobranca, regras e runs em uma rota unica com abas internas.

Permissoes:

- `platform:cloud-usage:read`
- `platform:cloud-costs:read`
- `platform:cloud-costs:import`
- `platform:cloud-cost-allocation:read`
- `platform:cloud-cost-allocation:run`
- `platform:cloud-charge-rules:read`
- `platform:cloud-charge-rules:write`
- `platform:cloud-charges:read`
- `platform:cloud-charges:calculate`

Endpoints consumidos pela UI:

```http
GET  /platform/cloud-usage/summary
GET  /platform/cloud-costs/imports
GET  /platform/cloud-costs/summary
POST /platform/cloud-costs/imports/manual-csv
GET  /platform/cloud-cost-allocations/runs
GET  /platform/cloud-cost-allocations/summary
POST /platform/cloud-cost-allocations/runs
GET  /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charges/summary
POST /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charge-rules
POST /platform/cloud-charge-rules
PATCH /platform/cloud-charge-rules/:ruleId
```

Regras:

- apenas Platform Admin acessa a rota e os endpoints;
- cada aba bloqueia conteudo quando falta permissao especifica;
- `POST /platform/cloud-charges/calculation-runs` precisa de `sourceAllocationRunId`;
- custo, preco, valor cobravel e margem nao sao expostos em rotas ou telas tenant;
- fatura, pagamento, checkout e emissao fiscal ficam fora desta rodada.

## Platform Cloud Cost Allocation

Feature platform-scoped consumida pela P04 Cloud Billing.

Permissoes:

- `platform:cloud-cost-allocation:read`
- `platform:cloud-cost-allocation:run`

Endpoints implementados:

```http
GET  /platform/cloud-cost-allocations/runs
GET  /platform/cloud-cost-allocations/runs/:runId
POST /platform/cloud-cost-allocations/runs
GET  /platform/cloud-cost-allocations/runs/:runId/tenant-allocations
GET  /platform/cloud-cost-allocations/summary
```

Regras:

- apenas Platform Admin acessa estes endpoints;
- usuario comum de tenant nao acessa custo bruto nem custo alocado nesta branch;
- `tenant_cloud_cost_allocations` e protegida por RLS no banco;
- markup, fatura, pagamento e UI completa ficam fora desta rodada.

## Platform Cloud Charge Markup Rules

Feature platform-scoped consumida pela P04 Cloud Billing para revisar regras comerciais, charges, margem e pendencias.

Permissões:

- `platform:cloud-charge-rules:read`
- `platform:cloud-charge-rules:write`
- `platform:cloud-charges:read`
- `platform:cloud-charges:calculate`

Endpoints implementados:

```http
GET  /platform/cloud-charge-rules
POST /platform/cloud-charge-rules
GET  /platform/cloud-charge-rules/:ruleId
PATCH /platform/cloud-charge-rules/:ruleId
GET  /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charges/calculation-runs/:runId
POST /platform/cloud-charges/calculation-runs
GET  /platform/cloud-charges/calculation-runs/:runId/tenant-charges
GET  /platform/cloud-charges/summary
```

Regras:

- apenas Platform Admin acessa estes endpoints;
- usuario comum de tenant nao acessa custo, valor cobrável nem margem nesta branch;
- `tenant_cloud_charges` e protegida por RLS no banco;
- fatura, pagamento, checkout, emissão fiscal e UI completa ficam fora desta rodada.
