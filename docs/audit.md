# Auditoria Enterprise

## Visao geral

A auditoria do ERP Techsolutions e tenant-scoped por padrao e registra acoes criticas com gravacao sincronica no PostgreSQL. A tabela existente `audit_logs` continua sendo usada sem migration nesta rodada; campos enterprise adicionais ficam em `metadata` sanitizado.

Tabela atual:

- `id`
- `tenant_id`
- `actor_user_id`
- `action`
- `entity`
- `entity_id`
- `metadata`
- `created_at`

## Contrato interno

O contrato padronizado e implementado em `src/modules/core-saas/audit/`:

- `tenantId`: obrigatorio para auditoria tenant-scoped.
- `actorId`: usuario autenticado quando disponivel.
- `actorType`: `user`, `system`, `service` ou `anonymous`.
- `actorEmail`: e-mail do ator quando seguro e disponivel.
- `action`: acao canonica, por exemplo `auth.login.success`.
- `resourceType`: tipo de recurso auditado.
- `resourceId`: identificador do recurso quando existir.
- `outcome`: `success`, `failure` ou `denied`.
- `severity`: `info`, `warning` ou `critical`.
- `correlationId`: id de correlacao propagado ou gerado.
- `requestId`: id tecnico da requisicao quando existir.
- `ipAddress`: IP de origem quando disponivel.
- `userAgent`: user-agent quando disponivel.
- `metadata`: detalhes complementares sanitizados.
- `createdAt`: timestamp persistido pelo banco.

Como `audit_logs` ainda nao possui colunas diretas para todos esses campos, `action`, `entity`, `entity_id`, `tenant_id` e `actor_user_id` seguem em colunas nativas, enquanto `actorType`, `actorEmail`, `outcome`, `severity`, `correlationId`, `requestId`, `ipAddress`, `userAgent`, `resourceType`, `resourceId` e detalhes complementares ficam em `metadata`.

## Sanitizacao

`EnterpriseAuditLogService` sanitiza metadata antes da persistencia. Chaves sensiveis sao redigidas recursivamente:

- `authorization`
- `accessToken` / `access_token`
- `refreshToken` / `refresh_token`
- `password`
- `password_hash`
- `refresh_token_hash`
- `token_hash`
- `secret`
- `apiKey` / `api_key`

Auditoria nao deve registrar access token, refresh token, senha, hash de senha, secrets ou header Authorization completo.

## Eventos auditados

Eventos cobertos nesta rodada:

- `tenant.created`
- `user.created`
- `permission.denied`
- `auth.login.success`
- `auth.login.failed`
- `auth.session.created`
- `auth.refresh.success`
- `auth.refresh.failed`
- `auth.logout`
- `auth.session.revoked`
- `checklist_template.created`
- `checklist_template.updated`
- `checklist_template.published`
- `checklist_template.deleted`
- `checklist_run.created`
- `checklist_run.updated`
- `checklist_run.completed`
- `checklist_run.attachment_uploaded`
- `checklist_run.divergence_reported`
- `checklist_run.acknowledgement_created`

O runtime web operacional chama os mesmos endpoints de execucao que o runtime mobile compartilhado. Portanto, criar, atualizar, concluir, anexar evidencia, registrar divergencia e registrar ciencia geram a mesma auditoria backend; W02A permanece limitada a auditoria de template/builder.

Hardening runtime web:
- validacao client-side por schema nao gera auditoria por si so;
- eventos auditaveis continuam saindo dos endpoints backend de update, complete, attachment upload, divergence e acknowledgement;
- remocao local de marker no MVP web nao possui evento persistente enquanto nao existir endpoint backend de delete marker.

Nem todo evento gera tela ou endpoint novo nesta rodada. A consulta existente continua em `GET /api/v1/audit-events` com permissao `audit.read`.

## RLS e RBAC

`audit_logs` tem RLS habilitado e usa `app.current_tenant_id` para isolamento. O backend tambem filtra por `tenant_id`; RLS e camada adicional de defesa.

Leitura de auditoria exige `audit.read`. Negações de RBAC em rotas tenant-scoped geram `permission.denied` em modo Prisma de forma best-effort: se a auditoria falhar, a resposta 403 continua sendo enviada.

## Redis e eventos

A gravacao principal do audit log permanece sincronica. Depois da persistencia, o servico publica `audit_log.created` como domain event para o job `audit-log-fanout`.

Falha de Redis nao desfaz a operacao principal nem remove o audit log persistido. O fanout e complementar e preparado para SIEM, exportacao ou pipelines futuros.

## Limites desta rodada

- Sem migration: `metadata` suporta o contrato enterprise atual.
- Sem painel visual completo de auditoria.
- Sem SIEM externo.
- Sem exportacao de logs.
- Sem mover auditoria critica para fila assíncrona.
- Sem alteracao destrutiva de contrato API.

## Testes

Testes especificos:

```bash
node --test --import tsx tests/audit-log.test.ts
node --test --import tsx tests/audit-security.test.ts
```

`tests/audit-security.test.ts` requer `DATABASE_URL`, PostgreSQL ativo e migrations aplicadas.
