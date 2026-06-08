# Arquitetura

O ERP Techsolutions usa frontend React + TypeScript + Vite, backend Node.js + TypeScript, PostgreSQL planejado como persistencia principal, Redis para cache, filas/jobs/eventos internos e coordenacao futura, e Docker para ambiente local.

## Boundaries principais

### Console da Plataforma

Boundary global do dono do SaaS/Super Admin. Gerencia tenants, planos, modulos, saude da plataforma e auditoria global.

Escopo: `platform`

### Administrador

Boundary do administrador do tenant/empresa cliente. Gerencia configuracoes, usuarios e permissoes dentro do tenant atual.

Escopo: `tenant`

### Usuarios

Boundary operacional para listar, convidar, editar e gerenciar usuarios e permissoes do tenant atual.

Escopo: `tenant`

### Checklists

Boundary tenant-scoped para modelos e execucoes de checklist configuraveis.

Escopo: `tenant`

Responsabilidade da plataforma: definir o catalogo de componentes permitidos (`text`, `textarea`, `number`, `currency`, `date`, `datetime`, `select`, `multi_select`, `checkbox`, `radio`, `boolean`, `photo`, `file`, `signature`, `barcode`, `qr_code`, `location`, `rating`).

Responsabilidade do tenant: configurar templates, campos, ordem, obrigatoriedade, regras, status, publicacao e execucao dentro do seu proprio `tenant_id`.

## Separacao platform scope vs tenant scope

- Platform scope usa permissoes `platform:*`.
- Tenant scope usa permissoes de dominio como `users:read`, `roles:manage`, `tenant:manage`, `inventory:read`.
- Usuario comum de tenant nao deve visualizar ou acessar Console da Plataforma.
- O Console da Plataforma usa layout frontend separado e API boundary separado.

## Multi-tenancy

Entidades tenant-scoped devem carregar `tenant_id` e sempre filtrar por tenant. Entidades globais da plataforma podem existir sem `tenant_id`, mas qualquer acao sobre dados de tenant deve ser auditavel.

No modulo `checklists`, templates, campos, execucoes, respostas, anexos, marcadores e ciencias sao entidades tenant-scoped. Nenhum repository ou endpoint deve consultar essas entidades apenas por `id`; toda leitura, escrita, publicacao, exclusao logica, execucao, upload ou download deve validar tambem o `tenant_id` resolvido do contexto autenticado.

No modulo `auth`, `local_auth_credentials` e `auth_sessions` tambem sao tenant-scoped. Sessao de refresh deve ser acessada sempre dentro do tenant resolvido a partir do proprio refresh token validado, com RLS ativo e sem persistir o refresh token em texto puro.

A partir da migration `20260608000000_enable_tenant_rls`, o PostgreSQL tambem aplica Row Level Security nas tabelas tenant-scoped principais. O runtime Prisma deve configurar `app.current_tenant_id` por transacao antes de acessar dados de tenant. Essa camada nao substitui RBAC nem filtros de repository; ela reduz o risco de vazamento cross-tenant se uma query futura esquecer `tenant_id`.

Tabelas globais como `tenants` e `permissions` continuam fora de RLS. Platform Admin consulta dados globais pelo boundary `/api/v1/platform/*`; para dados tenant-scoped, deve selecionar tenant e executar as consultas com contexto RLS explicito. Nao ha bypass amplo de RLS no fluxo HTTP normal.

## Checklists configuraveis

O modulo `checklists` esta implementado de forma modular:

```txt
src/modules/checklists/
  checklist-attachment.storage.ts
  checklist.routes.ts
  checklist.controller.ts
  checklist.service.ts
  checklist.repository.ts
  checklist.schemas.ts
  checklist.types.ts
  checklist.permissions.ts
```

Regras arquiteturais:

- separar controller, service, repository, schemas/validators, types e permissoes;
- validar entrada de dados antes de acionar service/repository;
- nunca confiar em `tenant_id` do body;
- padronizar erros e respostas conforme as rotas existentes;
- nao introduzir dependencia nova sem necessidade;
- registrar auditoria para criacao, edicao, publicacao, desativacao, execucao, resposta, conclusao e cancelamento;
- preservar historico de templates por versao;
- manter execucoes antigas vinculadas a `template_version`;
- preparar respostas/evidencias para mobile Flutter e sincronizacao offline futura.
- salvar anexos locais fora do Git em desenvolvimento, com nome sanitizado, allowlist de MIME types, limite de tamanho, checksum e storage key logico;
- nao expor path absoluto de arquivo em API;
- manter a estrategia preparada para driver S3-compatible futuro sem implementar cloud real nesta rodada.

Decisao desta fase: storage local real foi implementado para anexos de checklist. Storage cloud/S3-compatible, mobile Flutter e frontend de upload permanecem fora do escopo desta rodada.

## Backend MVP necessario

O backend MVP deve atender o frontend com contratos claros, versionados e separados por boundary. Quando a persistencia final ainda nao existir, a implementacao pode usar service mockado ou em memoria, desde que:

- nao misture escopo platform e tenant;
- preserve contratos HTTP;
- nao crie dados sensiveis;
- registre pendencias de persistencia e auditoria.

Para os boundaries sensiveis `/api/v1/platform/*`, Core SaaS e Checklists, qualquer fallback por headers legados fica restrito a desenvolvimento/teste/local. Em producao, esses boundaries devem depender de actor autenticado via `Authorization: Bearer`; token invalido bloqueia antes de qualquer fallback. No runtime Prisma, o actor JWT alimenta RBAC persistido e os repositories tenant-scoped executam com `app.current_tenant_id` via `withTenantRls`.

Refresh/logout ficam no boundary `/api/v1/auth/*`. O refresh token usa sessao persistida em `auth_sessions`, hash HMAC-SHA256, expiracao mais longa que o access token e rotacao a cada refresh bem-sucedido. Logout marca `revoked_at` de forma idempotente. Access tokens ja emitidos continuam validos ate `exp`; revogacao imediata de access token exigiria outro mecanismo futuro, como blacklist/Redis ou introspeccao.

## Mensageria interna

A fundacao inicial de mensageria esta documentada em `docs/messaging.md`.

Redis e usado para jobs internos simples, eventos de dominio e dead-letter local. A regra arquitetural e manter o dado critico sincronico: banco, storage e auditoria devem ser concluídos antes de publicar evento assíncrono. Falha de Redis nao deve corromper nem reverter upload/anexo no MVP.

Integracao inicial: `checklist_run.attachment_uploaded` publica evento depois do upload real de anexo e enfileira `checklist-attachment-postprocess`. O worker nao inicia automaticamente no servidor.

## Auditoria enterprise

A auditoria enterprise esta documentada em `docs/audit.md`. A gravacao principal usa `audit_logs` de forma sincronica, tenant-scoped e protegida por RLS. O contrato padronizado inclui actor, action, resource, outcome, severity, correlationId, requestId, IP, user-agent e metadata sanitizado. Como a tabela atual ja possui `metadata Json`, os campos complementares ficam em metadata e nenhuma migration foi criada nesta rodada.

Depois da persistencia, `audit_log.created` e publicado como domain event para fanout futuro via Redis. Falha de Redis nao desfaz a operacao principal nem remove o audit log persistido.

## Evolucao planejada

- Persistir modulos habilitados por tenant.
- Criar auditoria global para acoes de plataforma.
- Implementar modo suporte auditado.
- Remover codigo de headers legados por feature flag ou modo strict depois da migracao para Bearer.
- Evoluir operacoes platform multi-tenant com contexto RLS explicito e auditoria.
- Avaliar cookie httpOnly/secure e Redis para sessoes distribuidas quando o produto sair do MVP localStorage.
- Evoluir jobs Redis para notificacoes, webhooks, relatorios, processamento de anexos e fanout de auditoria.
