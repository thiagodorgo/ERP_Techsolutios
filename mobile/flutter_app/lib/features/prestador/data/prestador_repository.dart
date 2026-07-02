import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_prestador_local_store.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/sync/sync_action_factory.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/prestador_models.dart';
import 'prestador_local_store.dart';

class PrestadorRepository extends ChangeNotifier {
  PrestadorRepository({
    required BootstrapSession session,
    required SyncQueueRepository syncQueue,
    required SyncActionFactory actionFactory,
    required PrestadorLocalStore localStore,
  }) : _session = session,
       _syncQueue = syncQueue,
       _actionFactory = actionFactory,
       _localStore = localStore;

  final BootstrapSession _session;
  final SyncQueueRepository _syncQueue;
  final SyncActionFactory _actionFactory;
  final PrestadorLocalStore _localStore;
  final Uuid _uuid = const Uuid();

  /// Estoque do técnico (peças no carro). Enquanto o backend não expõe
  /// `/mobile/technician/stock`, retorna um catálogo semente.
  Future<List<TechnicianStockItem>> loadTechnicianStock() async {
    return const [
      TechnicianStockItem(
        sku: 'ELE-0102',
        name: 'Disjuntor tripolar 25A',
        category: 'Protecao',
        available: 6,
        unit: 'un',
      ),
      TechnicianStockItem(
        sku: 'ELE-0210',
        name: 'Contatora 18A 220V',
        category: 'Comando',
        available: 3,
        unit: 'un',
      ),
      TechnicianStockItem(
        sku: 'ELE-0215',
        name: 'Rele termico 12-18A',
        category: 'Comando',
        available: 2,
        unit: 'un',
      ),
      TechnicianStockItem(
        sku: 'ELE-0044',
        name: 'Cabo flexivel 2,5mm2',
        category: 'Cabos',
        available: 30,
        unit: 'm',
      ),
      TechnicianStockItem(
        sku: 'ELE-0031',
        name: 'Fusivel 20A',
        category: 'Protecao',
        available: 24,
        unit: 'un',
      ),
      TechnicianStockItem(
        sku: 'CON-0009',
        name: 'Fita isolante 19mm',
        category: 'Consumivel',
        available: 8,
        unit: 'rolo',
      ),
      TechnicianStockItem(
        sku: 'CON-0021',
        name: 'Conector WAGO 3 vias',
        category: 'Conexao',
        available: 40,
        unit: 'un',
      ),
      TechnicianStockItem(
        sku: 'FIX-0012',
        name: 'Abracadeira nylon 200mm',
        category: 'Fixacao',
        available: 60,
        unit: 'un',
      ),
    ];
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

    selection.forEach((sku, qty) {
      if (qty <= 0) return;
      final action = _actionFactory.create(
        tenantId: _session.activeTenant.tenantId,
        type: InventorySyncActionTypes.materialAdd,
        payload: {
          'work_order_local_id': workOrderLocalId,
          'sku': sku,
          'quantity': qty,
        },
      );
      _syncQueue.enqueue(action);
    });

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

final prestadorRepositoryProvider = Provider<PrestadorRepository>((ref) {
  final session = ref
      .watch(bootstrapSessionProvider)
      .maybeWhen(data: (v) => v, orElse: () => devBootstrapSession);
  return PrestadorRepository(
    session: session,
    syncQueue: ref.watch(syncQueueRepositoryProvider),
    actionFactory: ref.watch(syncActionFactoryProvider),
    localStore: ref.watch(prestadorLocalStoreProvider),
  );
});
