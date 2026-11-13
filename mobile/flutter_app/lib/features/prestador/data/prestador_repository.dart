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
import '../../../core/sync/inventory_sync_replay_service.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_interrupted_reclaim.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../../../core/sync/sync_stalled_resolver.dart';
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
  Future<void> _tail = Future<void>.value();

  Future<T> _serialized<T>(Future<T> Function() operation) {
    final run = _tail.then((_) => operation());
    _tail = run.then<void>((_) {}, onError: (Object _) {});
    return run;
  }

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

      if (!_isDemoSession && load.isFresh) {
        await _stockCache.save(scope, load.items, load.fetchedAt);
      }
      if (!_isDemoSession && load.isForbidden) {
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
  }) => _serialized(() async {
    if (selection.isEmpty) return _localStore.loadMaterials(workOrderLocalId);
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
      final material = merged.firstWhere((row) => row.sku == entry.key);
      final action = _actionFactory.create(
        tenantId: _session.activeTenant.tenantId,
        type: InventorySyncActionTypes.materialAdd,
        payload: {
          'work_order_local_id': workOrderLocalId,
          'material_local_id': material.localId,
          'sku': entry.key,
          'quantity': entry.value,
        },
      );
      await _syncQueue.enqueue(action);
    }

    notifyListeners();
    return merged;
  });

  /// C2 item 9(c): remover a peça desfaz o que a fila tem dela. A adição já baixada (`synced`
  /// com `result_ref`) ganha um `work_order_material.remove`; a que ainda não terminou é
  /// descartada (marca do 1º PR, nunca mais enviada) e, se pode ter baixado (N3), também ganha o
  /// `remove`. A adição já resolvida (descartada ou "Versão do gestor") teve a decisão tomada pelo
  /// gancho de resolução e não é tocada.
  Future<void> removeMaterial(String localId) => _serialized(() async {
    final tenantId = _session.activeTenant.tenantId;
    final actions = await _syncQueue.actionsForTenant(tenantId);
    final additions = actions
        .where((action) => action.type == InventorySyncActionTypes.materialAdd)
        .where((action) => action.payload['material_local_id'] == localId)
        .toList(growable: false);

    for (final addition in additions) {
      if (addition.status == SyncStatus.synced) {
        if (_hasResultRef(addition)) {
          await _enqueueRemovalFor(addition, actions);
        }
        continue;
      }
      await _syncQueue.update(
        addition.copyWith(
          status: SyncStatus.synced,
          processedAt: DateTime.now().toUtc(),
          lastErrorCode: syncDiscardedErrorCode,
          lastSafeError: syncDiscardedSafeError,
        ),
      );
      if (materialAdditionMayHaveReachedServer(addition)) {
        await _enqueueRemovalFor(addition, actions);
      }
    }

    await _localStore.deleteMaterial(localId);
    notifyListeners();
  });

  /// C2 item 11 (N3): "Descartar" ou "Versão do gestor" de uma adição que pode ter baixado deixa o
  /// `work_order_material.remove` dela na fila. Idempotente: não duplica o `remove`.
  Future<void> compensateMaterialAddition(SyncAction addition) =>
      _serialized(() async {
        if (addition.type != InventorySyncActionTypes.materialAdd) return;
        if (!materialAdditionMayHaveReachedServer(addition)) return;
        final actions = await _syncQueue.actionsForTenant(addition.tenantId);
        await _enqueueRemovalFor(addition, actions);
      });

  Future<void> _enqueueRemovalFor(
    SyncAction addition,
    List<SyncAction> queued,
  ) async {
    final alreadyQueued = queued.any(
      (candidate) =>
          candidate.type == InventorySyncActionTypes.materialRemove &&
          candidate.payload['source_client_action_id'] ==
              addition.clientActionId,
    );
    if (alreadyQueued) return;
    await _syncQueue.enqueue(
      _actionFactory.create(
        tenantId: addition.tenantId,
        type: InventorySyncActionTypes.materialRemove,
        payload: {
          'work_order_local_id': addition.payload['work_order_local_id'],
          'material_local_id': addition.payload['material_local_id'],
          'source_client_action_id': addition.clientActionId,
        },
      ),
    );
  }

  Future<void> applyMaterialSyncStatus(
    String localId,
    SyncStatus actionStatus, {
    int? quantityDelta,
  }) => _serialized(() async {
    final actions = await _syncQueue.actionsForTenant(
      _session.activeTenant.tenantId,
    );
    final additions = actions
        .where((action) => action.type == InventorySyncActionTypes.materialAdd)
        .where((action) => action.payload['material_local_id'] == localId)
        .toList(growable: false);
    if (additions.isEmpty) return;

    final workOrderLocalId = additions
        .map((action) => action.payload['work_order_local_id'])
        .whereType<String>()
        .firstOrNull;
    if (workOrderLocalId == null) return;
    final materials = await _localStore.loadMaterials(workOrderLocalId);
    final material = materials
        .where((row) => row.localId == localId)
        .firstOrNull;
    if (material == null) return;

    final nextQuantity = material.quantity + (quantityDelta ?? 0);
    if (nextQuantity <= 0) {
      await _localStore.deleteMaterial(localId);
      notifyListeners();
      return;
    }

    final nextStatus =
        additions.any((action) => action.status == SyncStatus.conflict)
        ? SyncStatus.conflict
        : additions.every((action) => action.status == SyncStatus.synced)
        ? SyncStatus.synced
        : actionStatus == SyncStatus.conflict
        ? SyncStatus.conflict
        : SyncStatus.pending;
    await _localStore.updateMaterial(
      localId,
      quantity: nextQuantity,
      syncStatus: nextStatus,
    );
    notifyListeners();
  });
}

/// C2 item 9(c) e N3: só a adição `pending` com `retryCount == 0` que nunca esteve `syncing` é
/// descartada sem `remove`. "Já esteve `syncing`" se lê pela tentativa gasta e pelas marcas que
/// voltam a ação a `pending` depois de um envio (503 do lote e resgate de envio interrompido).
/// Exceção declarada: o conflito S12 (`work_order_not_on_server`) nasce antes de qualquer envio.
/// Na dúvida, o `remove` vai: no servidor, sem baixa ele é inócuo (`already_applied`).
bool materialAdditionMayHaveReachedServer(SyncAction addition) {
  if (addition.type != InventorySyncActionTypes.materialAdd) return false;
  if (addition.status == SyncStatus.pending &&
      addition.retryCount == 0 &&
      !_materialSentBeforeCodes.contains(addition.lastErrorCode)) {
    return false;
  }
  if (addition.status == SyncStatus.conflict &&
      addition.retryCount == 0 &&
      addition.lastErrorCode == inventoryWorkOrderNotOnServerErrorCode) {
    return false;
  }
  return true;
}

const _materialSentBeforeCodes = <String>{
  inventorySyncBusyErrorCode,
  syncInterruptedErrorCode,
};

bool _hasResultRef(SyncAction action) {
  final ref = action.payload['result_ref'];
  return ref is String && ref.trim().isNotEmpty;
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
