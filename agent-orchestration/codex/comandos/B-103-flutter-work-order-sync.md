# B-103 — Flutter OS Sync Bidirecional

## Objetivo

Conectar o replay Flutter de status de Ordem de Servico ao contrato backend real:

`POST /api/v1/mobile/sync/work-order-actions`

## Escopo

- Somente Flutter mobile.
- Sem backend, frontend web, Prisma, migrations, infra, secrets, `.env`, Figma,
  `pubspec` ou lockfiles.
- Sem upload binario, presigned URL, storage, antivirus, GPS/mapa, tracking,
  aprovacao real ou criacao remota de OS.

## Contrato Flutter

- Tipo interno: `WorkOrderSyncActionTypes.statusUpdate`.
- Tipo backend: `work_order.status_change`.
- Request:
  - `client_batch_id`
  - `actions[].client_action_id`
  - `actions[].type`
  - `actions[].local_created_at`
  - `actions[].payload`
- `payload.work_order_id` vem somente de `server_id` ou `work_order_id` real.
- `local_id` fica apenas em `metadata`.
- OS local-only permanece `pending`.

## Regras de replay

- `accepted` -> `synced`
- `already_applied` -> `synced`
- `rejected` -> `failed`
- `conflicts` -> `conflict`
- erro de rede -> `failed` com `NETWORK_ERROR`
- resultado ausente -> `failed` com `MISSING_RESULT`

## Fora do replay B-103

- `work_order.create`
- `work_order.approval_request`
- `work_order.evidence_attach`

Essas actions permanecem pendentes para blocos futuros.

## Proximos blocos recomendados

- B-104: upload real de evidencias com URL protegida e storage.
- B-105: GPS/mapa operacional e piloto Android real.
- B-106: criacao remota de OS/local-only mapping e resolucao manual de conflitos.
