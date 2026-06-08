# Notificacoes internas

## Escopo

`notifications` e a fundacao de notificacoes internas tenant-scoped do ERP. Ela cria uma inbox por usuario para eventos operacionais relevantes, sem e-mail, SMS, WhatsApp, push externo, chat ou mensageria direta entre usuarios.

## Eventos iniciais

Eventos que geram notificacoes via job `notification-dispatch`:

- `checklist_run.completed`
- `checklist_run.divergence_reported`
- `checklist_run.acknowledgement_created`

`checklist_run.attachment_uploaded` continua gerando `checklist-attachment-postprocess`; nao gera notificacao no MVP para evitar spam. `audit_log.created` segue como fanout futuro de auditoria, nao como notificacao para cada evento.

## Modelo

Tabela: `notifications`.

Campos principais:

- `tenant_id`
- `recipient_user_id`
- `type`
- `title`
- `message`
- `severity`: `info`, `success`, `warning`, `critical`
- `status`: `unread`, `read`, `archived`
- `source_type`
- `source_id`
- `action_url`
- `metadata`
- `idempotency_key`
- `read_at`
- timestamps

RLS esta habilitado por `tenant_id`. O service tambem restringe listagem e updates ao `recipient_user_id` do ator autenticado.

## API

Endpoints:

- `GET /api/v1/notifications`
- `GET /api/v1/notifications/unread-count`
- `POST /api/v1/notifications/:notificationId/read`
- `POST /api/v1/notifications/read-all`
- `POST /api/v1/notifications/:notificationId/archive`

Permissoes:

- `notifications:read`
- `notifications:update`

Filtros de listagem:

- `status`
- `severity`
- `type`
- `sourceType`
- `limit`

As respostas nao expõem inbox de outros usuarios. `recipient_user_id` fica interno ao backend.

## Recipients

Resolver inicial:

- `checklist_run.completed`: usuarios ativos do tenant com `checklist_runs:read` ou roles `super_admin`, `tenant_admin`, `manager`;
- `checklist_run.divergence_reported`: roles `super_admin`, `tenant_admin`, `manager` ou permissao `audit.read`;
- `checklist_run.acknowledgement_created`: roles `super_admin`, `tenant_admin`, `manager`.

O ator que causou o evento nao recebe notificacao propria. Se nao houver destinatario, o job conclui sem criar notificacao.

## Seguranca

- Nenhum segredo real deve ser persistido ou documentado.
- Metadata e sanitizada contra tokens, senhas, secrets, storage keys, buckets, paths e URLs privadas.
- Falha de Redis/job nao desfaz a operacao principal.
- Deduplicacao MVP usa `idempotency_key` por `eventId + recipient`.

## Proximos passos

- UI completa em branch propria.
- Preferencias por usuario/perfil.
- Digest/agrupamento.
- Deduplicacao avancada por source/event window.
- E-mail, push ou integrações externas, sempre por provider configuravel e sem segredo no repositorio.
