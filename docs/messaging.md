# Mensageria e Jobs

## Visao geral

A fundacao inicial de mensageria usa Redis local para eventos internos e jobs assíncronos simples. Ela nao substitui transacoes de banco nem move logica critica para fora do fluxo sincronico.

Nesta rodada, Redis cobre:

- enfileiramento de jobs internos;
- worker registrado por handler;
- retry com backoff exponencial simples;
- lista de falhas/dead-letter;
- publicacao de eventos de dominio mapeados para jobs.

Nao foram implementados Kafka, RabbitMQ, notificacoes reais, webhooks reais, cloud queue ou worker iniciado automaticamente no servidor.

## Configuracao

Variavel:

```env
REDIS_URL="redis://localhost:6379"
```

O Docker Compose local ja sobe `erp-redis` em `localhost:6379`.

## Arquivos principais

- `src/infra/redis/redis.client.ts`: cliente Redis padronizado, sob demanda.
- `src/infra/jobs/job.types.ts`: nomes, payloads, status e envelope de job.
- `src/infra/jobs/job.queue.ts`: enqueue, dequeue, retry, backoff e failed/dead-letter.
- `src/infra/jobs/job.registry.ts`: registro de handlers por job.
- `src/infra/jobs/job.worker.ts`: processamento manual ou por `startWorker`.
- `src/infra/events/domain-event.types.ts`: nomes e envelope de eventos.
- `src/infra/events/domain-event.publisher.ts`: publicacao de eventos e mapeamento evento -> job.

## Eventos iniciais

- `auth.session.created`
- `auth.session.revoked`
- `checklist_run.created`
- `checklist_run.completed`
- `checklist_run.attachment_uploaded`
- `checklist_run.divergence_reported`
- `checklist_run.acknowledgement_created`
- `notification.requested`
- `audit_log.created`

## Jobs iniciais

- `checklist-attachment-postprocess`
- `notification-dispatch`
- `audit-log-fanout`

Os handlers padrao sao placeholders seguros. O worker nao executa automaticamente no startup; qualquer processo de worker futuro deve chamar `startWorker` explicitamente.

## Semantica de fila

`enqueue` cria um `JobEnvelope` com:

- `id`
- `name`
- `payload`
- `tenantId`
- `userId`
- `correlationId`
- `attempts`
- `maxAttempts`
- `backoffMs`
- `runAfter`
- timestamps de criacao/atualizacao

`dequeue` promove jobs atrasados vencidos e reivindica um job pendente.

Se o handler falhar:

- enquanto `attempts < maxAttempts`, o job volta para delayed com backoff exponencial;
- ao esgotar tentativas, o job vai para a lista failed/dead-letter.

## Integracao inicial

Fluxo integrado: upload real de anexo de checklist.

Depois que o arquivo e salvo pelo provider configurado (`local` ou S3-compatible), o registro e criado no banco e a auditoria `checklist_run.attachment_uploaded` e persistida, o backend publica o evento `checklist_run.attachment_uploaded`. Esse evento enfileira o job `checklist-attachment-postprocess`. O runtime web operacional reutiliza o mesmo endpoint de anexos usado pelo runtime mobile compartilhado.

No hardening do runtime web, divergencia e ciencia continuam passando pelos endpoints backend existentes. Quando o backend registra `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`, os eventos/auditoria associados seguem a mesma trilha do runtime mobile compartilhado.

Fluxo integrado: notificacoes internas.

`checklist_run.completed`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created` enfileiram `notification-dispatch`. O handler resolve destinatarios ativos do tenant, deduplica por evento/destinatario e cria linhas em `notifications`. Falha desse job segue o retry/backoff da fila e nao reverte checklist, auditoria nem storage.

Se Redis falhar nesse ponto, o upload critico nao e revertido. O publisher retorna falha controlada e registra warning. A consistencia principal do arquivo, registro e auditoria continua sincronica.

Fluxo integrado: auditoria enterprise.

Depois que `EnterpriseAuditLogService` persiste um registro em `audit_logs`, o backend publica `audit_log.created`. Esse evento enfileira `audit-log-fanout` para processamento futuro. A gravacao principal da auditoria nao depende do Redis; falha no enqueue nao remove o audit log nem corrompe a operacao principal.

## Testes

Testes especificos:

```bash
node --test --import tsx tests/job-queue.test.ts
node --test --import tsx tests/domain-events.test.ts
node --test --import tsx tests/audit-log.test.ts
```

Eles requerem Redis local ativo via:

```bash
docker compose up -d
```

## Limitacoes

- Cliente Redis atual implementa apenas o subconjunto RESP necessario para a fila.
- Nao ha concorrencia distribuida sofisticada, heartbeat ou lock renovavel.
- Nao ha scheduling enterprise, UI operacional ou metricas de worker.
- Nao ha e-mail, SMS, WhatsApp, push externo ou webhook real.
- UI completa de notificacoes fica para rodada propria.
- Nao ha outbox transacional de banco; a integracao inicial publica evento apos commit/logica principal.

## Proximos usos

- fanout de auditoria;
- notificacoes internas;
- webhooks;
- relatorios assíncronos;
- pos-processamento de anexos;
- jobs de sync mobile;
- limpeza de sessoes expiradas.
