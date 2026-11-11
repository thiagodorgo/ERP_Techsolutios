import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_prestador_local_store.dart';
import '../../../core/local_db/drift_technician_stock_cache.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../../work_orders/data/work_order_repository.dart';
import '../domain/prestador_models.dart';
import 'prestador_local_store.dart';
import 'technician_stock_cache.dart';
import 'technician_stock_demo.dart';
import 'technician_stock_remote_api.dart';

class PrestadorRepository extends ChangeNotifier {
  PrestadorRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required PrestadorLocalStore localStore,
    TechnicianStockRemoteApi? stockRemoteApi,
    TechnicianStockCache? stockCache,
    bool allowDemoStock = true,
    bool isDemoSession = false,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore,
       _stockRemoteApi = stockRemoteApi,
       _stockCache = stockCache ?? InMemoryTechnicianStockCache(),
       _allowDemoStock = allowDemoStock,
       _isDemoSession = isDemoSession;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final PrestadorLocalStore _localStore;
  final TechnicianStockRemoteApi? _stockRemoteApi;
  final TechnicianStockCache _stockCache;
  final bool _allowDemoStock;
  final bool _isDemoSession;
  final Uuid _uuid = const Uuid();

  /// Estoque do técnico (peças sob a responsabilidade dele). No modo remoto a lista vem de
  /// `GET /mobile/technician/stock` e a última resposta fica salva por (organização, usuário);
  /// a semente de demonstração só roda no app local.
  Future<TechnicianStockLoad> loadTechnicianStock() async {
    final scope = TechnicianStockCacheScope(
      tenantId: _session.activeTenant.tenantId,
      userId: _session.user.userId,
    );

    if (!_allowDemoStock) {
      final cached = _isDemoSession ? null : await _stockCache.load(scope);

      final api = _stockRemoteApi;
      if (api == null) {
        return TechnicianStockLoad.failed(
          const ApiNetworkError(),
          cached: cached,
        );
      }

      TechnicianStockLoad load;
      try {
        final result = await api.fetchTechnicianStock();
        load = TechnicianStockLoad.fresh(
          result.items,
          custody: result.custody,
          fetchedAt: result.generatedAt,
        );
      } on TechnicianStockForbiddenError {
        load = TechnicianStockLoad.forbidden();
      } catch (error) {
        return TechnicianStockLoad.failed(error, cached: cached);
      }

      if (load.isFresh) {
        await _stockCache.save(scope, load.items, load.fetchedAt);
      }
      if (load.isForbidden) {
        await _stockCache.clear(scope);
      }
      return load;
    }

    return TechnicianStockLoad.fresh(
      demoTechnicianStock,
      custody: demoTechnicianStockCustody,
    );
  }

  Future<List<WorkOrderMaterial>> loadMaterials(String workOrderLocalId) =>
      _localStore.loadMaterials(workOrderLocalId);

  /// Adiciona a seleção de peças (sku→qty) aos materiais da OS, mesclando
  /// quantidades, persistindo localmente e enfileirando para sync.
  Future<List<WorkOrderMaterial>> addSelection({
    required String workOrderLocalId,
    required Map<String, int> selection,
    required List<TechnicianStockItem> catalog,
  }) async {
    if (selection.isEmpty) return loadMaterials(workOrderLocalId);
    final current = await _localStore.loadMaterials(workOrderLocalId);
    final merged = mergeMaterials(
      current: current,
      selection: selection,
      catalog: catalog,
      tenantId: _session.activeTenant.tenantId,
      workOrderLocalId: workOrderLocalId,
      idFor: (sku) => 'mat-local-${_uuid.v4()}',
    );

    for (final material in merged) {
      await _localStore.saveMaterial(material);
    }

    // B-O6R-11 (Ω6R-QUA-005) — `for-in` com `await`, nunca `selection.forEach`: o callback do
    // `forEach` é `void`, a `Future` de cada `enqueue` era descartada, e o método retornava (e
    // notificava a tela) ANTES de qualquer ação gravada. Um reinício logo depois perdia todas; e
    // as N gravações concorrentes da fila (read-modify-write) deixavam 1 de N. Retorno e
    // notificação só depois do último `await`.
    for (final entry in selection.entries) {
      if (entry.value <= 0) continue;
      final action = _actionFactory.create(
        tenantId: _session.activeTenant.tenantId,
        type: InventorySyncActionTypes.materialAdd,
        payload: {
          'work_order_local_id': workOrderLocalId,
          'sku': entry.key,
          'quantity': entry.value,
        },
      );
      await _syncQueue.enqueue(action);
    }

    notifyListeners();
    return merged;
  }

  Future<void> removeMaterial(String localId) async {
    await _localStore.deleteMaterial(localId);
    notifyListeners();
  }
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final prestadorLocalStoreProvider = Provider<PrestadorLocalStore>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return DriftPrestadorLocalStore(db);
});

/// API do estoque do técnico: nula no modo local (a semente de demonstração assume) e sem token.
final technicianStockRemoteApiProvider = Provider<TechnicianStockRemoteApi?>((
  ref,
) {
  if (!ref.watch(remoteAuthModeProvider)) return null;
  final config = ref.watch(authenticatedApiConfigProvider);
  if (config.accessToken == null) return null;
  return DioTechnicianStockRemoteApi.create(config);
});

final technicianStockCacheProvider = Provider<TechnicianStockCache>((ref) {
  return DriftTechnicianStockCache(ref.watch(appDatabaseProvider));
});

final prestadorRepositoryProvider = Provider<PrestadorRepository>((ref) {
  final sessionState = ref.watch(bootstrapSessionProvider);
  final session = sessionState.maybeWhen(
    data: (v) => v,
    orElse: () => devBootstrapSession,
  );
  return PrestadorRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(prestadorLocalStoreProvider),
    stockRemoteApi: ref.watch(technicianStockRemoteApiProvider),
    stockCache: ref.watch(technicianStockCacheProvider),
    allowDemoStock: !ref.watch(remoteAuthModeProvider),
    isDemoSession: session == devBootstrapSession,
  );
});
