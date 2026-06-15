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
- Status B-098A: implementado como contrato expandido com tenant, usuario, roles, permissoes, modulos, categorias de despesas, `serverTime`, cursores nulos, `contract`, `mobile_app`, `cache`, `feature_flags`, `mobile_policy` e `catalogs`.

Blocos de controle do bootstrap:

- `contract`: `name=mobile_bootstrap`, `version=2026-06-14.b098a`, `schemaVersion=2`, `status=expanded`.
- `mobile_app`: plataforma `flutter`, versao minima suportada e versao recomendada.
- `cache`: TTL de 300 segundos, janela stale-while-revalidate de 900 segundos, `cache_key` por tenant/usuario e `vary_by`.
- `feature_flags`: capacidades implementadas, planejadas ou indisponiveis para o ator.
- `mobile_policy`: auth Bearer, tenant por ator autenticado, cache, sync de despesas/OS, limites de evidencia e diagnostico seguro.
- `catalogs`: modulos, permissoes, categorias de despesas e endpoints com status `implemented`, `planned`, `unavailable` ou `partial`.

### POST /api/v1/mobile/sync/expense-actions

- Permissao: varia por acao; todas exigem modulo `expense_management` habilitado.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_action_id`, `tenant_id`, tipo, payload versionado e timestamp local.
- Response: resultado por acao, `server_id`, status, conflitos e catalog versions.
- Erros: 400, 401, 403, 409, 422, 429.
- Idempotencia: obrigatoria por `tenant_id` + `client_action_id`.
- Offline: origem principal das acoes offline.
- Evento/auditoria: `expense_report.synced_from_mobile` e eventos especificos por acao aceita.
- Status B-098: implementado para o MVP de despesas com resposta em `data.results`.

### POST /api/v1/mobile/sync/work-order-actions

- Permissao: varia por acao de OS; `work_order.status_change` exige `work_orders:status` e `work_order.assign` exige `work_orders:assign`.
- Status B-098B: implementado para sincronizacao controlada de acoes de OS, sem checklist, inventario ou evidencias genericas.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_action_id`, `type`, `payload` e `local_created_at` opcional.
- Response: envelope em `data` com `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`.
- Erros de envelope/contexto: 400 ou 403 com envelope JSON seguro.
- Idempotencia: obrigatoria por tenant resolvido do ator + usuario do ator + `client_action_id`.
- Offline: contrato principal para replay local-first de status/atribuicao de OS.

Request:

```json
{
  "client_batch_id": "batch-local-1",
  "actions": [
    {
      "client_action_id": "action-local-1",
      "type": "work_order.status_change",
      "local_created_at": "2026-06-14T12:00:00.000Z",
      "payload": {
        "work_order_id": "server-work-order-id",
        "status": "assigned",
        "message": "Aceito no app mobile."
      }
    }
  ]
}
```

Tipos implementados:

- `work_order.status_change`: payload com `work_order_id`, `status`, `message?` e `cancellation_reason?`.
- `work_order.assign`: payload com `work_order_id`, `operator_id`, `user_id?` e `message?`.

Resposta:

```json
{
  "data": {
    "contract": {
      "name": "mobile_work_order_actions_sync",
      "version": "2026-06-14.b098b",
      "status": "implemented"
    },
    "client_batch_id": "batch-local-1",
    "tenant_id": "tenant-do-ator",
    "server_time": "2026-06-14T12:00:01.000Z",
    "summary": {
      "received": 1,
      "accepted": 1,
      "rejected": 0,
      "conflicts": 0,
      "already_applied": 0
    },
    "accepted": [],
    "rejected": [],
    "conflicts": [],
    "already_applied": []
  }
}
```

Regras obrigatorias:

- `tenant_id` de body/payload nao e confiavel, nao entra no fingerprint e nao decide tenant.
- `client_action_id` vazio rejeita o envelope.
- lote maximo: 50 acoes.
- acao aceita retorna `server_state` da OS no shape do endpoint real de Work Orders.
- reenvio identico retorna `already_applied`.
- reenvio com mesmo `client_action_id` e payload diferente retorna conflito `idempotency_payload_mismatch`.
- transicao de status invalida retorna conflito `invalid_status_transition`.
- payload invalido, tipo nao suportado ou permissao por acao ausente retorna rejeicao/erro estruturado sem stack trace.

### POST /api/v1/mobile/sync/checklist-actions

- Permissao: varia por acao de checklist; `checklist.item_answer` e `checklist.item_note` exigem `checklist_runs:update`, `checklist.complete` exige `checklist_runs:complete`.
- Status B-098C: implementado parcial para replay minimo de respostas, notas e conclusao, sem anexos, marcadores, divergencia ou acknowledgement em lote.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_action_id`, `type`, `local_created_at` e `payload`.
- Response: envelope em `data` com `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`.
- Erros de envelope/contexto: 400 ou 403 com envelope JSON seguro.
- Idempotencia: obrigatoria por tenant resolvido do ator + usuario do ator + `client_action_id`.
- Offline: contrato minimo para replay local-first de respostas/notas/conclusao de checklist.

Request:

```json
{
  "client_batch_id": "checklist-batch-local-1",
  "actions": [
    {
      "client_action_id": "checklist-action-local-1",
      "type": "checklist.item_answer",
      "local_created_at": "2026-06-14T12:00:00.000Z",
      "payload": {
        "run_id": "server-checklist-run-id",
        "component_id": "server-component-id",
        "value": "Veiculo conferido sem avarias.",
        "metadata": {
          "source": "offline_form"
        }
      }
    }
  ]
}
```

Tipos implementados:

- `checklist.item_answer`: payload com `run_id`, `component_id`, `value` e `metadata?`.
- `checklist.item_note`: payload com `run_id`, `component_id`, `note`, `value?` e `metadata?`; a nota e gravada em `metadata.note` da resposta do componente, preservando o valor existente quando houver.
- `checklist.complete`: payload com `run_id`, `has_divergence?` e `observation?`.

Resposta:

```json
{
  "data": {
    "contract": {
      "name": "mobile_checklist_actions_sync",
      "version": "2026-06-14.b098c",
      "status": "partial"
    },
    "client_batch_id": "checklist-batch-local-1",
    "tenant_id": "tenant-do-ator",
    "server_time": "2026-06-14T12:00:01.000Z",
    "summary": {
      "received": 1,
      "accepted": 1,
      "rejected": 0,
      "conflicts": 0,
      "already_applied": 0
    },
    "accepted": [],
    "rejected": [],
    "conflicts": [],
    "already_applied": []
  }
}
```

Regras obrigatorias:

- `tenant_id` de body/payload nao e confiavel, nao entra no fingerprint e nao decide tenant.
- `client_action_id`, `type`, `local_created_at` e `payload` sao obrigatorios por acao.
- lote maximo: 50 acoes.
- acao aceita retorna `server_state.run` e `server_state.answers` no shape publico dos endpoints reais de checklist.
- reenvio identico retorna `already_applied`.
- reenvio com mesmo `client_action_id` e payload diferente retorna conflito `idempotency_payload_mismatch`.
- payload invalido, tipo nao suportado ou permissao por acao ausente retorna rejeicao/erro estruturado sem stack trace.
- lacunas B-098C: idempotencia duravel em banco/Redis, anexos/markers/divergencia/acknowledgement em lote e implementacao Flutter consumindo o endpoint.

### GET /api/v1/mobile/inventory/availability

- Permissao: `inventory.read` ou `inventory.manage`.
- Status B-098D: parcial para consulta mobile de disponibilidade, com dados em memoria e sem reserva duravel.
- Request: filtros opcionais `item_id`, `sku`, `warehouse_id` e `work_order_id`.
- Response: envelope em `data` com `contract`, `tenant_id`, `server_time`, `filters` e `items`.
- Erros de contexto/permissao: 403 com envelope JSON seguro.
- Idempotencia: leitura.
- Offline: fonte para cache local de saldos permitidos.

Campos minimos de `data.items[]`:

- `item_id`
- `sku`
- `name`
- `unit`
- `warehouse_id`
- `available_quantity`
- `reserved_quantity`
- `status`

Regras obrigatorias:

- `tenant_id` de query/body nao e confiavel e nao decide tenant.
- `work_order_id` e aceito como filtro seguro, mas ainda nao cruza relacionamento real de OS/estoque.
- resposta nao deve incluir dados de outro tenant.

### POST /api/v1/mobile/sync/inventory-actions

- Permissao: `inventory.manage` para o contrato parcial atual. No catalogo real do repo ainda nao existem permissoes separadas `inventory:reserve`/`inventory:consume`.
- Status B-098D: parcial para replay offline controlado de inventario, sem persistencia duravel.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_action_id`, `type`, `local_created_at` e `payload`.
- Response: envelope em `data` com `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`.
- Erros de envelope/contexto: 400 ou 403 com envelope JSON seguro.
- Idempotencia: obrigatoria por tenant resolvido do ator + usuario do ator + `client_action_id`.
- Offline: contrato minimo para reserva, consumo e registro de falta em campo.

Request:

```json
{
  "client_batch_id": "inventory-batch-local-1",
  "actions": [
    {
      "client_action_id": "inventory-action-local-1",
      "type": "inventory.reserve",
      "local_created_at": "2026-06-15T12:00:00.000Z",
      "payload": {
        "item_id": "inv-item-tow-cable",
        "warehouse_id": "mobile-warehouse-main",
        "quantity": 2
      }
    }
  ]
}
```

Tipos implementados:

- `inventory.reserve`: payload com `item_id`, `quantity` e `warehouse_id?`.
- `inventory.consume`: payload com `item_id`, `quantity` e `warehouse_id?`.
- `inventory.shortage_report`: payload com `item_id`, `quantity`, `reason` e `warehouse_id?`.

Resposta:

```json
{
  "data": {
    "contract": {
      "name": "mobile_inventory_actions_sync",
      "version": "2026-06-15.b098d",
      "status": "partial"
    },
    "client_batch_id": "inventory-batch-local-1",
    "tenant_id": "tenant-do-ator",
    "server_time": "2026-06-15T12:00:01.000Z",
    "summary": {
      "received": 1,
      "accepted": 1,
      "rejected": 0,
      "conflicts": 0,
      "already_applied": 0
    },
    "accepted": [],
    "rejected": [],
    "conflicts": [],
    "already_applied": []
  }
}
```

Regras obrigatorias:

- `tenant_id` de body/payload nao e confiavel, nao entra no fingerprint e nao decide tenant.
- `client_action_id`, `type`, `local_created_at` e `payload` sao obrigatorios por acao.
- lote maximo: 50 acoes.
- reenvio identico retorna `already_applied`.
- reenvio com mesmo `client_action_id` e payload diferente retorna conflito `idempotency_payload_mismatch`.
- quantidade indisponivel retorna conflito de estoque, nao aceite silencioso.
- payload invalido, tipo nao suportado ou permissao ausente retorna rejeicao/erro estruturado sem stack trace.
- lacunas B-098D: idempotencia duravel em banco/Redis, reserva transacional, vinculacao real com OS/armazem, anexos de evidencia e implementacao Flutter consumindo o endpoint.

### POST /api/v1/mobile/sync/evidence-actions

- Permissoes: `work_orders:update` para evidencias de OS e `field_location:send` para evidencias genericas de campo.
- Status B-098E: parcial; registra manifesto/metadados, sem upload binario ou persistencia duravel.
- Request: lote `{ client_batch_id, actions[] }`, cada acao com `client_evidence_id`, `type`, `local_created_at` e `payload`.
- Response: envelope em `data` com `summary`, `accepted`, `rejected`, `conflicts` e `already_applied`.
- Idempotencia: tenant resolvido do ator + usuario do ator + `client_evidence_id`.

Tipos implementados:

- `evidence.work_order_photo`
- `evidence.work_order_signature`
- `evidence.work_order_observation`
- `evidence.field_photo`
- `evidence.field_signature`
- `evidence.field_observation`

Request:

```json
{
  "client_batch_id": "batch-evidence-1",
  "actions": [
    {
      "client_evidence_id": "evidence-local-1",
      "type": "evidence.work_order_photo",
      "local_created_at": "2026-06-15T12:00:00.000Z",
      "payload": {
        "work_order_id": "server-work-order-id",
        "kind": "photo",
        "file_name": "panel-before.jpg",
        "content_type": "image/jpeg",
        "size_bytes": 245000,
        "sha256": "hash-or-placeholder",
        "caption": "Antes da manutencao",
        "gps": { "lat": -23.55052, "lng": -46.633308, "accuracy_m": 18 }
      }
    }
  ]
}
```

Regras obrigatorias:

- `tenant_id`/`tenantId` de body ou payload e ignorado e nao decide tenant.
- lote maximo de 50 acoes.
- fotos e assinaturas aceitam apenas `image/jpeg` ou `image/png`, com limite declarado de 10 MB.
- `base64`, `file_data`, `local_path` e `path` sao rejeitados; o contrato registra metadados, nao arquivo.
- reenvio identico retorna `already_applied`; payload diferente com o mesmo ID retorna `idempotency_payload_mismatch`.
- lacunas: upload/presigned URL, storage protegido, persistencia DB/Redis, antivirus, auditoria completa e consumo Flutter.

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
- Response: lista paginada de Prestações de Contas permitidas.
- Erros: 401, 403.
- Idempotencia: leitura.
- Offline: app exibe cache local e marca frescor.
- Evento/auditoria: opcional para leitura sensivel.

### POST /api/v1/expense-reports

- Permissao: `expense_report:create`.
- Request: dados da Prestação de Contas, `policy_version`, origem operacional e `client_action_id` quando vindo do app.
- Response: Prestação de Contas criada com `id` e status.
- Erros: 400, 401, 403, 409, 422.
- Idempotencia: por `tenant_id` + `client_action_id`, quando enviado.
- Offline: criado localmente e enviado pela sync queue.
- Evento/auditoria: `expense_report.created`.

### GET /api/v1/expense-reports/:id

- Permissao: `expense_report:read` ou `expense_report:read_all`.
- Request: `id` na rota.
- Response: Prestação de Contas completa, itens, recibos permitidos, totais e timeline.
- Erros: 401, 403, 404.
- Idempotencia: leitura.
- Offline: app usa detalhe local.
- Evento/auditoria: opcional para leitura sensivel.

### PATCH /api/v1/expense-reports/:id

- Permissao: `expense_report:update`.
- Request: campos editaveis em `draft` ou `returned`.
- Response: Prestação de Contas atualizada e nova versao.
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

## Backend Foundation - GD-002

Na fundacao backend inicial, `POST /api/v1/mobile/sync/expense-actions` aceita lote idempotente com estes tipos de acao:

- `expense_report.create`;
- `expense_item.create`;
- `expense_report.submit`.

Cada acao deve conter `client_action_id`, `type` e `payload`. O backend usa o `tenant_id` e o ator do contexto autenticado, nunca o `tenant_id` enviado no payload, e grava recibo em `mobile_action_receipts`.

Resposta esperada:

```json
{
  "results": [
    {
      "clientActionId": "client-action-1",
      "status": "processed",
      "resultRef": "server-id"
    }
  ]
}
```

Quando a mesma acao for reenviada com o mesmo `client_action_id`, a resposta deve retornar o resultado ja processado sem duplicar Prestação de Contas, item ou submissao.
