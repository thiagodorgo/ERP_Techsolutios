# B-099 — Flutter Real Work Orders Pull

## Objetivo

Conectar o `WorkOrderRepository` ao endpoint real `GET /api/v1/work-orders` do
backend, em modo remoto. As ordens recebidas sao salvas no Drift (cache local),
preservando alteracoes locais pendentes. Em caso de erro de rede, o app exibe
os dados do cache. A arquitetura local-first e mantida.

## Branch

`feature/flutter-real-work-orders-pull`

## Escopo

### O que este comando faz

- Corrige o parser `DioWorkOrderRemoteApi.fetchWorkOrders()` para desempacotar
  o envelope `{items:[...], pagination:{...}}` retornado pelo backend.
- Adiciona `_workOrderFromRemoteJson()` tolerante a camelCase (backend) e
  snake_case (cache local).
- Adiciona `WorkOrderPullOutcome` enum: `success`, `cached`, `error`, `pulling`.
- Adiciona `WorkOrderRemoteApi? remoteApi` opcional ao `WorkOrderRepository`.
- `load()`: em modo remoto, nao faz seed de dados falsos; dispara
  `_pullInBackground().ignore()` apos carregar cache local.
- `refresh()`: em modo local (sem remoteApi) retorna `pulling` como no-op.
- `_pullInBackground()`: faz fetch, upsert no Drift, atualiza `lastPulledAt`.
- `_upsertRemoteOrders()`: preserva WOs com `SyncStatus.pending`; para WOs
  existentes (synced), atualiza mantendo `localId` original.
- `workOrderRemoteApiProvider`: retorna `null` em local/dev mode;
  instancia `DioWorkOrderRemoteApi` em remote mode com token de acesso.
- UI `WorkOrderListScreen`: `LinearProgressIndicator`, `_PullErrorBanner`,
  `_LastUpdatedBanner`, `_LocalCacheBanner`; `RefreshIndicator` para pull manual.
- UI `HomeScreen`: banners `_WoPullErrorBanner` e `_WoLocalCacheBanner` no
  painel de estatisticas.
- 35 testes unitarios cobrindo todos os cenarios.

### O que este comando NAO faz

- NÃO altera backend nem contratos de API.
- NÃO altera frontend web React.
- NÃO implementa sync de alteracoes locais para o backend.
- NÃO implementa checklist remoto, evidencias, inventario, aprovacao ou GPS.
- NÃO faz push nem cria PR sem autorizacao explicita.

## Arquivos modificados

| Arquivo | Tipo | Descricao |
|---------|------|-----------|
| `lib/features/work_orders/data/work_order_remote_api.dart` | fix+feat | Parser tolerante; envelope items desempacotado |
| `lib/features/work_orders/data/work_order_repository.dart` | feat | Pull background, upsert, fallback, pull state |
| `lib/features/work_orders/ui/work_order_list_screen.dart` | feat | Banners de pull state + RefreshIndicator |
| `lib/shared/ui/home_screen.dart` | feat | Banners de pull state na home |
| `test/features/b099_real_work_orders_pull_test.dart` | test | 35 novos testes (novo arquivo) |

## Decisoes tecnicas

- **Envelope `{items:[...], pagination:{...}}`**: backend retorna camelCase
  dentro de items; parser aceita ambos os formatos para robustez.
- **`stored.isEmpty` como guarda de seed**: o seed de dados falsos ocorre apenas
  quando o store esta completamente vazio (nao apenas quando o tenant atual nao
  tem orders), preservando o comportamento original de isolamento de tenant.
- **`refresh()` no-op em local mode**: retorna `WorkOrderPullOutcome.pulling`
  para sinalizar "nao aplicavel" sem lancar excecao.
- **`_FakeSyncQueue` nos testes**: implementa `SyncQueueRepository` como no-op;
  `SyncActionFactory()` instanciado diretamente — sem Riverpod nos testes.
- **Listener reativo nos widgets**: `addListener`/`removeListener` em
  `didChangeDependencies`/`dispose` para reagir a `notifyListeners()` do repo
  sem `ChangeNotifierProvider`.

## Validacao

| Verificacao | Resultado |
|-------------|-----------|
| `flutter test` | **443/443 passando** (+35 novos de B-099) |
| `npm test` | **15/15 passando** |
| `npm run lint` | **0 erros** |
| `npm run build` | **0 erros** |

## Commits gerados

1. `feat(mobile): pull real work orders into drift cache`
2. `test(mobile): add 35 real work order pull tests`
3. `docs: add B-099 work orders pull command and update status` *(este)*
