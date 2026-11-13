// B-MATERIAL-REENVIO, C-F10 — RC5 (1)–(4): remover a peça desfaz o que a fila tem dela (C2 item 9(c), N3).
//
// Mutações (uma por vez, restauradas): M-C15 (`remove` não enfileirado para a adição `synced`) → (1);
// M-C16 (`pending` não descartada) → (1); M-C21 (`failed` descartada sem `remove`) → (2).
// Controle: no head-base o `removeMaterial` só apagava a linha (nenhuma ação tocada).
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bmaterial-remove';
const _user = 'employee-1';
const _wo = 'wo-remove';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org remoção'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:update'}),
);

const _catalog = [
  TechnicianStockItem(
    sku: 'ELE-0102',
    name: 'Disjuntor',
    available: 9,
    unit: 'un',
  ),
];

class _H {
  final InMemorySyncQueueRepository queue = InMemorySyncQueueRepository();
  final InMemoryPrestadorLocalStore lines = InMemoryPrestadorLocalStore();
  late final PrestadorRepository repo = PrestadorRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(currentUserId: () => _user),
    localStore: lines,
  );

  /// Lança [quantity] peças e devolve a adição gravada na fila.
  Future<SyncAction> add(int quantity) async {
    final before = (await queue.actionsForTenant(
      _tenant,
    )).map((a) => a.clientActionId).toSet();
    await repo.addSelection(
      workOrderLocalId: _wo,
      selection: {'ELE-0102': quantity},
      catalog: _catalog,
    );
    return (await queue.actionsForTenant(
      _tenant,
    )).singleWhere((a) => !before.contains(a.clientActionId));
  }

  Future<void> set(SyncAction action) => queue.update(action);

  Future<SyncAction> stored(SyncAction action) async =>
      (await queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.clientActionId == action.clientActionId);

  Future<List<SyncAction>> removals() async => (await queue.actionsForTenant(
    _tenant,
  )).where((a) => a.type == InventorySyncActionTypes.materialRemove).toList();

  Future<WorkOrderMaterial?> line() async =>
      (await lines.loadMaterials(_wo)).firstOrNull;
}

void _expectDiscarded(SyncAction action) {
  expect(action.status, SyncStatus.synced);
  expect(action.lastErrorCode, syncDiscardedErrorCode);
  expect(action.lastSafeError, syncDiscardedSafeError);
}

void _expectRemovalOf(SyncAction removal, SyncAction addition) {
  expect(removal.status, SyncStatus.pending);
  expect(removal.payload['source_client_action_id'], addition.clientActionId);
  expect(removal.payload['work_order_local_id'], _wo);
  expect(
    removal.payload['material_local_id'],
    addition.payload['material_local_id'],
  );
}

void main() {
  test('RC5(1) A1 baixada e A2 pendente: A2 sai da fila, A1 ganha UM remove e '
      'a linha some', () async {
    final h = _H();
    final a1 = await h.add(3);
    final baixada = a1.copyWith(
      status: SyncStatus.synced,
      payload: {...a1.payload, 'result_ref': 'mov-a1'},
    );
    await h.set(baixada);
    final a2 = await h.add(2);
    final line = (await h.line())!;
    expect(line.quantity, 5);
    expect(a2.payload['material_local_id'], line.localId);

    await h.repo.removeMaterial(line.localId);

    _expectDiscarded(await h.stored(a2));
    final a1After = await h.stored(a1);
    expect(a1After.status, SyncStatus.synced);
    expect(a1After.lastErrorCode, isNull);
    expect(a1After.payload['result_ref'], 'mov-a1');
    final removals = await h.removals();
    expect(removals, hasLength(1));
    _expectRemovalOf(removals.single, a1);
    expect(await h.line(), isNull);
  });

  test('RC5(2) N3: adição failed com tentativa gasta vira descartada e ganha '
      'o remove', () async {
    final h = _H();
    final a1 = await h.add(2);
    await h.set(a1.copyWith(status: SyncStatus.failed, retryCount: 2));

    await h.repo.removeMaterial((await h.line())!.localId);

    _expectDiscarded(await h.stored(a1));
    final removals = await h.removals();
    expect(removals, hasLength(1));
    _expectRemovalOf(removals.single, a1);
    expect(await h.line(), isNull);
  });

  test('RC5(3) N3: adição em voo (syncing) ou que voltou de um envio (503) '
      'vira descartada e ganha o remove', () async {
    final h = _H();
    final a1 = await h.add(2);
    await h.set(a1.copyWith(status: SyncStatus.syncing));

    await h.repo.removeMaterial((await h.line())!.localId);

    _expectDiscarded(await h.stored(a1));
    final removals = await h.removals();
    expect(removals, hasLength(1));
    _expectRemovalOf(removals.single, a1);

    final busy = _H();
    final b1 = await busy.add(1);
    await busy.set(b1.copyWith(lastErrorCode: inventorySyncBusyErrorCode));
    await busy.repo.removeMaterial((await busy.line())!.localId);
    _expectDiscarded(await busy.stored(b1));
    expect(await busy.removals(), hasLength(1));
  });

  test('RC5(4) adição pending que nunca foi enviada: só descartada, nenhum '
      'remove', () async {
    final h = _H();
    final a1 = await h.add(2);
    expect(a1.status, SyncStatus.pending);
    expect(a1.retryCount, 0);

    await h.repo.removeMaterial((await h.line())!.localId);

    _expectDiscarded(await h.stored(a1));
    expect(await h.removals(), isEmpty);
    expect(await h.line(), isNull);
  });
}
