# Contratos Mobile, Sync e Eventos

## Principios

- Todo contrato tenant-scoped usa o `tenant_id` resolvido do ator autenticado; `tenant_id` do body nao e fonte de verdade.
- Toda mutacao mobile offline usa `client_action_id` para idempotencia.
- Toda resposta de erro deve ser segura para log e nao conter token, recibo bruto, path privado ou segredo.
- Toda decisao de workflow gera auditoria e evento tenant-scoped.
- O comportamento offline do app deve ser explicito por endpoint.

## Contratos HTTP

### GET /api/v1/mobile/bootstrap

- Permissao: usuario autenticado.
- Request: headers de autenticacao.
- Response: tenant ativo, tenants disponiveis, `enabled_modules`, `permissions`, `feature_flags`, `mobile_policy`, politicas e catalogos versionados.
- Erros: 401, 403, 409 para contexto invalido.
- Idempotencia: leitura.
- Offline: app usa cache local ate expirar ou sincronizar.
- Evento/auditoria: opcional `mobile.bootstrap.loaded`.

### POST /api/v1/mobile/sync/expense-actions

- Permissao: varia por acao; todas exigem modulo `expense_management` habilitado.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_action_id`, `tenant_id`, tipo, payload versionado e timestamp local.
- Response: resultado por acao, `server_id`, status, conflitos e catalog versions.
- Erros: 400, 401, 403, 409, 422, 429.
- Idempotencia: obrigatoria por `tenant_id` + `client_action_id`.
- Offline: origem principal das acoes offline.
- Evento/auditoria: `expense_report.synced_from_mobile` e eventos especificos por acao aceita.

### GET /api/v1/expense-policies

- Permissao: `expense_report:read` ou `expense_policy:manage`.
- Request: filtros opcionais por versao/status.
- Response: politicas versionadas, limites, categorias e regras.
- Erros: 401, 403.
- Idempotencia: leitura.
- Offline: app usa cache por `policy_version`.
- Evento/auditoria: nenhum por leitura comum.

### GET /api/v1/expense-categories

- Permissao: `expense_report:read`.
- Request: filtros opcionais por ativo.
- Response: categorias habilitadas, limites e exigencia de recibo.
- Erros: 401, 403.
- Idempotencia: leitura.
- Offline: cache local versionado.
- Evento/auditoria: nenhum por leitura comum.

### GET /api/v1/expense-reports

- Permissao: `expense_report:read` ou `expense_report:read_all`.
- Request: filtros por status, periodo, funcionario, OS, projeto e centro de custo.
- Response: lista paginada de RDVs permitidos.
- Erros: 401, 403.
- Idempotencia: leitura.
- Offline: app exibe cache local e marca frescor.
- Evento/auditoria: opcional para leitura sensivel.

### POST /api/v1/expense-reports

- Permissao: `expense_report:create`.
- Request: dados do RDV, `policy_version`, origem operacional e `client_action_id` quando vindo do app.
- Response: RDV criado com `id` e status.
- Erros: 400, 401, 403, 409, 422.
- Idempotencia: por `tenant_id` + `client_action_id`, quando enviado.
- Offline: criado localmente e enviado pela sync queue.
- Evento/auditoria: `expense_report.created`.

### GET /api/v1/expense-reports/:id

- Permissao: `expense_report:read` ou `expense_report:read_all`.
- Request: `id` na rota.
- Response: RDV completo, itens, recibos permitidos, totais e timeline.
- Erros: 401, 403, 404.
- Idempotencia: leitura.
- Offline: app usa detalhe local.
- Evento/auditoria: opcional para leitura sensivel.

### PATCH /api/v1/expense-reports/:id

- Permissao: `expense_report:update`.
- Request: campos editaveis em `draft` ou `returned`.
- Response: RDV atualizado e nova versao.
- Erros: 400, 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: entra na sync queue.
- Evento/auditoria: `expense_report.updated`.

### POST /api/v1/expense-reports/:id/items

- Permissao: `expense_report:update`.
- Request: categoria, data, valor, cidade, estabelecimento, observacao e metadados locais.
- Response: item criado.
- Erros: 400, 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: entra na sync queue.
- Evento/auditoria: `expense_item.created`.

### PATCH /api/v1/expense-items/:id

- Permissao: `expense_report:update`.
- Request: campos editaveis do item.
- Response: item atualizado e recalculo de totais.
- Erros: 400, 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: entra na sync queue.
- Evento/auditoria: `expense_item.updated`.

### DELETE /api/v1/expense-items/:id

- Permissao: `expense_report:update`.
- Request: `id` na rota.
- Response: confirmacao e totais recalculados.
- Erros: 401, 403, 404, 409.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: tombstone local na sync queue.
- Evento/auditoria: `expense_item.deleted`.

### POST /api/v1/expense-items/:id/receipts

- Permissao: `receipt:attach`.
- Request: metadados do recibo, hash, mime type, tamanho, OCR revisado e referencia de upload.
- Response: recibo registrado, status de upload e candidatos de duplicidade.
- Erros: 400, 401, 403, 404, 409, 413, 415, 422.
- Idempotencia: por hash + `client_action_id`.
- Offline: arquivo fica local, metadados entram na fila.
- Evento/auditoria: `expense_item.receipt_attached`.

### POST /api/v1/expense-reports/:id/submit

- Permissao: `expense_report:submit`.
- Request: confirmacao, justificativas de excecao e `client_action_id` quando mobile.
- Response: status `submitted` ou violacoes bloqueantes.
- Erros: 400, 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id`.
- Offline: pode ficar pendente, mas backend revalida antes de aceitar.
- Evento/auditoria: `expense_report.submitted`.

### POST /api/v1/expense-reports/:id/approve-manager

- Permissao: `expense_report:approve_operational`.
- Request: decisao, comentario e override limitado quando permitido.
- Response: status `approved_manager` ou proxima etapa.
- Erros: 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: normalmente exige online; se permitido, entra na fila e pode conflitar.
- Evento/auditoria: `expense_report.approved_manager`.

### POST /api/v1/expense-reports/:id/approve-finance

- Permissao: `expense_report:approve_finance`.
- Request: validacao financeira, glosas, comentario e resultado.
- Response: status `approved_finance`.
- Erros: 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: normalmente exige online.
- Evento/auditoria: `expense_report.approved_finance`.

### POST /api/v1/expense-reports/:id/return

- Permissao: `expense_report:return`.
- Request: motivo obrigatorio e campos solicitados para correcao.
- Response: status `returned`.
- Erros: 400, 401, 403, 404, 409.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: normalmente exige online.
- Evento/auditoria: `expense_report.returned`.

### POST /api/v1/expense-reports/:id/reject

- Permissao: `expense_report:reject`.
- Request: motivo obrigatorio.
- Response: status `rejected`.
- Erros: 400, 401, 403, 404, 409.
- Idempotencia: por `client_action_id` quando mobile.
- Offline: normalmente exige online.
- Evento/auditoria: `expense_report.rejected`.

### POST/PATCH /api/v1/expense-reports/:id/payment

- Permissao: `expense_report:pay`.
- Request: agendamento, valor, tipo de resultado e referencia financeira futura.
- Response: status `scheduled_for_payment` ou `paid`.
- Erros: 400, 401, 403, 404, 409, 422.
- Idempotencia: por `client_action_id` ou chave financeira.
- Offline: fora do fluxo offline principal.
- Evento/auditoria: `expense_report.payment_scheduled` ou `expense_report.paid`.

## Eventos assincronos

Todo evento deve conter `tenant_id`, `event_id`, `occurred_at`, `actor_id`, `aggregate_id`, `idempotency_key`, `source` e payload sanitizado.

| Evento | Origem | Consumidores futuros |
| --- | --- | --- |
| `expense_report.created` | API/sync mobile | audit, notifications, analytics |
| `expense_item.created` | API/sync mobile | audit, policy engine |
| `expense_item.receipt_attached` | receipt engine | audit, duplicate detector, receipt processor |
| `expense_report.policy_violation_detected` | policy engine | approvals, notifications |
| `expense_report.submitted` | workflow | approvals, notifications, audit |
| `expense_report.returned` | manager/finance | mobile sync, notifications |
| `expense_report.approved_manager` | manager | finance, notifications |
| `expense_report.approved_finance` | finance | payment/export, audit |
| `expense_report.rejected` | manager/finance | notifications, audit |
| `expense_report.payment_scheduled` | finance | finance, notifications |
| `expense_report.paid` | finance | audit, analytics, accounting future |
| `expense_policy.changed` | tenant admin | mobile bootstrap cache, audit |
| `expense_report.synced_from_mobile` | sync ingest | audit, conflict monitor |

Relacao futura com comissoes: eventos podem ser consumidos no futuro, mas o modulo de Gestao de Despesas nao chama nem bloqueia no motor de comissoes.

## Contrato de conflito

Um conflito deve retornar:

- `client_action_id`;
- `server_id` quando existir;
- `conflict_type`;
- valores locais e remotos relevantes;
- campos seguros para exibicao;
- proxima acao permitida.

O app deve gravar o conflito em fila propria e exigir decisao explicita quando houver risco de perda de dados.
