# App Flutter Tudo-em-Um

## Decisao

O Flutter sera um app unico modular do ERP Techsolutions. O app pode carregar os modulos no binario, mas deve habilitar telas e acoes apenas a partir do bootstrap autenticado do backend.

O primeiro caminho versionado nesta fase e `mobile/flutter_app`, porque nao havia `pubspec.yaml` existente no repositorio fora de `experiments/`.

## Camadas

- App Shell: inicializacao, tema, roteamento, home modular e diagnostico.
- Auth: sessao, tokens, refresh e secure storage.
- Tenant Context: tenant ativo, troca de tenant e isolamento local.
- Module Resolver: transforma `enabled_modules` em rotas/cards.
- Permission Resolver: avalia permissoes para acoes e telas.
- Local DB: base SQLite/Drift planejada para dados, catalogos e fila.
- Sync Engine: fila idempotente, retry, conflito e atualizacao incremental.
- Evidence Engine: recibos, fotos, hashes, retencao e upload futuro.
- OCR Engine: extracao local planejada de dados de recibos.
- PDF Engine: previa local com marca d'agua quando nao sincronizado.
- Expense Module: Prestação de Contas, itens, totais, politica, submissao e status.
- Field Ops Module: OS, checklists, GPS e evidencias em fases futuras.
- Diagnostics: fila, ultimo sync, versao, tenant e logs sanitizados.

## Bootstrap esperado

`GET /api/v1/mobile/bootstrap` deve retornar:

- `active_tenant`;
- tenants disponiveis;
- `enabled_modules`, incluindo `expense_management` quando permitido;
- `permissions`;
- `feature_flags`;
- `mobile_policy`;
- categorias e politicas de despesas;
- versoes de catalogos para cache e sync.

### Status backend B-098A/B-098D

`GET /api/v1/mobile/bootstrap` ja existe no backend como contrato expandido e cacheavel. Ele preserva tenant ativo, usuario, roles, permissoes, modulos habilitados, categorias de despesas quando o ator tem permissao relacionada a despesas, `serverTime` e cursores nulos de sync.

Blocos adicionais disponiveis para o Flutter:

- `contract`: nome, versao `2026-06-14.b098a`, `schemaVersion` e horario de geracao.
- `mobile_app`: plataforma Flutter, versao minima suportada, versao recomendada e versao do contrato.
- `cache`: TTL de 300 segundos, `stale_while_revalidate_seconds` de 900 segundos, `expires_at`, `cache_key` e `vary_by`.
- `feature_flags`: chaves por capacidade, com `enabled`, `status` e `reason` quando aplicavel.
- `mobile_policy`: regras de auth, cache, sync, evidencias e diagnostico seguro.
- `catalogs`: modulos, permissoes, categorias de despesas e endpoints com versoes e status.

No B-098B, `POST /api/v1/mobile/sync/work-order-actions` passou a existir para replay controlado de acoes de OS:

- `feature_flags.work_order_sync.status=implemented` quando o modulo `work_orders` esta disponivel;
- `mobile_policy.sync.implemented_domains` inclui `work_orders`;
- `catalogs.endpoints.work_order_sync` aponta para `POST /api/v1/mobile/sync/work-order-actions` como `implemented`;
- o app deve enviar lotes com `client_action_id` por acao e tratar `accepted`, `rejected`, `conflicts` e `already_applied` separadamente;
- o Flutter nao deve enviar `tenant_id` como fonte de decisao; o backend usa o tenant do ator autenticado;
- conflitos exigem resolucao explicita na fila local antes de descartar dados.

No B-098C, `POST /api/v1/mobile/sync/checklist-actions` passou a existir como contrato parcial para replay minimo de `checklist.item_answer`, `checklist.item_note` e `checklist.complete`.

No B-098D, `GET /api/v1/mobile/inventory/availability` e `POST /api/v1/mobile/sync/inventory-actions` passaram a existir como contrato parcial:

- `feature_flags.inventory_mobile.status=partial` quando o modulo `inventory` esta disponivel;
- `feature_flags.inventory_sync.status=partial` quando o ator possui `inventory.manage`;
- `mobile_policy.sync.partial_domains` inclui `inventory`;
- `catalogs.endpoints.inventory_availability` e `catalogs.endpoints.inventory_sync` apontam para os endpoints B-098D;
- o sync de inventario aceita `inventory.reserve`, `inventory.consume` e `inventory.shortage_report`;
- o backend ignora `tenant_id` no query/body/payload e resolve o tenant pelo ator autenticado.

Ainda nao ha tenants disponiveis, persistencia duravel de idempotencia mobile, reserva transacional multi-instancia, associacao real de inventario com OS/armazem nem upload generico de evidencia de OS. Esses itens ficam para fases seguintes.

## Estrutura inicial

```txt
mobile/flutter_app/lib/
  main.dart
  app/
    app.dart
    router.dart
  core/
    auth/
    bootstrap/
    diagnostics/
    modules/
    network/
    permissions/
    storage/
    sync/
  features/
    expenses/
    field_ops/
  shared/
    ui/
```

## Dependencias planejadas

- `flutter_riverpod`: estado de app, bootstrap e modulos.
- `go_router`: rotas declarativas.
- `dio`: HTTP.
- `flutter_secure_storage`: tokens e segredos.
- `drift`: banco local.
- `sqlite3_flutter_libs`: runtime SQLite.
- `path_provider`: paths locais.
- `uuid`: `client_action_id`.
- `crypto`: hashes de recibos/acoes.
- `equatable`: igualdade de modelos.

OCR, PDF, camera e upload real ficam documentados, mas fora da primeira fundacao para reduzir risco de build.

## Regras locais obrigatorias

- Tokens nunca devem ir para SQLite comum.
- Toda entidade local tenant-scoped carrega `tenant_id`.
- `client_action_id` e obrigatorio em toda acao de sync.
- A fila de OS deve usar `POST /api/v1/mobile/sync/work-order-actions` apenas para `work_order.status_change` e `work_order.assign` nesta fase.
- Recibos nao devem aparecer em logs.
- Conflito nao pode ser resolvido silenciosamente.
- UI pode esconder acoes, mas backend continua sendo a autoridade.

## Telas funcionais minimas

1. Login/Dev Session simples.
2. Home modular por tenant/modulos/permissoes.
3. Gestao de Despesas - lista.
4. Nova Prestação de Contas.
5. Detalhe Prestação de Contas.
6. Adicionar item.
7. Resumo para envio.
8. Diagnostico de sync.

## Testes esperados

- Home mostra `expense_management` quando modulo e permissao existem.
- Home nao mostra modulo sem permissao.
- Prestação de Contas calcula total e diferenca de adiantamento.
- Violacao de politica aparece para recibo obrigatorio ou limite excedido.
- Sync status aparece no diagnostico.
- `tenant_id` e obrigatorio nas acoes locais.
