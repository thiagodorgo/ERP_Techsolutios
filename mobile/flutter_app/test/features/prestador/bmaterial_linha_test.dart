// B-MATERIAL-REENVIO, C-F10 — RC6 (1)–(5): a linha segue a ação, não perde soma, não ressuscita, e a OS drena
// (C2 itens 9(d), 10, 11 e 12; PC5).
//
// Mutações (uma por vez, restauradas): M-C17 (linha achada por SKU em vez de `localId`) → (2);
// M-C18 (`INSERT OR REPLACE` de volta: `saveMaterial` da linha lida no lugar do `updateMaterial`) → (3);
// M-C19 (a tela não chama o gancho de resolução) → (4). Controle: não compila no head-base.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-demo';
const _user = 'u-bmaterial-linha';
const _wo = 'wo-linha';
const _woServer = 'srv-wo-linha';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org linha'),
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
  TechnicianStockItem(
    sku: 'ELE-0103',
    name: 'Fusível',
    available: 9,
    unit: 'un',
  ),
];

/// Linha em memória com uma trava de uso único na leitura: quem lê a linha recebe o retrato de ANTES e espera a
/// trava abrir, para a corrida do RC6(3b) acontecer sempre na mesma ordem.
class _GatedLines implements PrestadorLocalStore {
  final InMemoryPrestadorLocalStore inner = InMemoryPrestadorLocalStore();
  Completer<void>? gate;
  final Completer<void> reading = Completer<void>();

  @override
  Future<List<WorkOrderMaterial>> loadMaterials(String workOrderLocalId) async {
    final rows = await inner.loadMaterials(workOrderLocalId);
    final g = gate;
    if (g != null) {
      gate = null;
      reading.complete();
      await g.future;
    }
    return rows;
  }

  @override
  Future<void> saveMaterial(WorkOrderMaterial material) =>
      inner.saveMaterial(material);

  @override
  Future<void> updateMaterial(
    String localId, {
    int? quantity,
    SyncStatus? syncStatus,
  }) =>
      inner.updateMaterial(localId, quantity: quantity, syncStatus: syncStatus);

  @override
  Future<void> deleteMaterial(String localId) => inner.deleteMaterial(localId);
}

PrestadorRepository _repo(
  SyncQueueRepository queue,
  PrestadorLocalStore lines, {
  BootstrapSession session = _session,
}) => PrestadorRepository(
  session: session,
  syncQueue: queue,
  actionFactory: SyncActionFactory(currentUserId: () => _user),
  localStore: lines,
);

Future<SyncAction> _addAndGet(
  PrestadorRepository repo,
  SyncQueueRepository queue,
  String sku,
  int quantity,
) async {
  final before = (await queue.actionsForTenant(
    _tenant,
  )).map((a) => a.clientActionId).toSet();
  await repo.addSelection(
    workOrderLocalId: _wo,
    selection: {sku: quantity},
    catalog: _catalog,
  );
  return (await queue.actionsForTenant(
    _tenant,
  )).singleWhere((a) => !before.contains(a.clientActionId));
}

Future<WorkOrderMaterial?> _lineOf(
  PrestadorLocalStore lines,
  String sku,
) async =>
    (await lines.loadMaterials(_wo)).where((m) => m.sku == sku).firstOrNull;

WorkOrder _order() => WorkOrder(
  localId: _wo,
  serverId: _woServer,
  tenantId: _tenant,
  code: 'OS-1',
  title: 'OS linha',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 13),
);

/// A caminhada do servidor não devolve a OS: ela é candidata a sair do aparelho (molde `bsan313` F21/F25).
class _WalkingApi implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
  @override
  Future<WorkOrderFetchResult> fetchAssignedOpenWorkOrders({
    String? tenantId,
  }) async => WorkOrderFetchResult(orders: const [], complete: true);

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async => const [];
  @override
  Future<WorkOrder> fetchWorkOrder(String id) => throw UnimplementedError();
  @override
  Future<WorkOrder> updateWorkOrderStatus(String id, WorkOrderStatus s) =>
      throw UnimplementedError();
  @override
  Future<List<WorkOrderTimelineEvent>> fetchTimeline(String id) async =>
      const [];
  @override
  Future<WorkOrder> assignWorkOrder(String id, String userId, {String? note}) =>
      throw UnimplementedError();
  @override
  Future<void> createApprovalRequest(String id, WorkOrderApprovalRequest r) =>
      throw UnimplementedError();
}

void main() {
  test('RC6(1) estado agregado: synced só quando TODAS as adições da linha '
      'estão synced', () async {
    final queue = InMemorySyncQueueRepository();
    final lines = InMemoryPrestadorLocalStore();
    final repo = _repo(queue, lines);
    final a1 = await _addAndGet(repo, queue, 'ELE-0102', 3);
    final a2 = await _addAndGet(repo, queue, 'ELE-0102', 2);
    final localId = (await _lineOf(lines, 'ELE-0102'))!.localId;
    await queue.update(a1.copyWith(status: SyncStatus.synced));

    await repo.applyMaterialSyncStatus(localId, SyncStatus.synced);
    var line = (await _lineOf(lines, 'ELE-0102'))!;
    expect(line.syncStatus, SyncStatus.pending);
    expect(line.quantity, 5);

    await queue.update(a2.copyWith(status: SyncStatus.synced));
    await repo.applyMaterialSyncStatus(localId, SyncStatus.synced);
    line = (await _lineOf(lines, 'ELE-0102'))!;
    expect(line.syncStatus, SyncStatus.synced);
    expect(line.quantity, 5);
  });

  test('RC6(2) linha removida + resultado tardio: nada ressuscita, e a linha '
      'nova da mesma peça não é tocada', () async {
    final queue = InMemorySyncQueueRepository();
    final lines = InMemoryPrestadorLocalStore();
    final repo = _repo(queue, lines);
    await _addAndGet(repo, queue, 'ELE-0102', 2);
    final removedId = (await _lineOf(lines, 'ELE-0102'))!.localId;
    await repo.removeMaterial(removedId);
    expect(await lines.loadMaterials(_wo), isEmpty);

    await _addAndGet(repo, queue, 'ELE-0102', 4);
    final fresh = (await _lineOf(lines, 'ELE-0102'))!;
    expect(fresh.localId, isNot(removedId));

    await repo.applyMaterialSyncStatus(removedId, SyncStatus.synced);
    await repo.applyMaterialSyncStatus(
      removedId,
      SyncStatus.synced,
      quantityDelta: -2,
    );

    final rows = await lines.loadMaterials(_wo);
    expect(rows, hasLength(1));
    expect(rows.single.localId, fresh.localId);
    expect(rows.single.quantity, 4);
    expect(rows.single.syncStatus, SyncStatus.pending);
  });

  test('RC6(3) corrida: a soma 5 sobrevive na mesma cauda e quando outra '
      'instância grava entre a leitura e a escrita', () async {
    // (3a) a mesma cauda serializa: lançar +3 e atualizar o estado ao mesmo tempo.
    final queue = InMemorySyncQueueRepository();
    final lines = InMemoryPrestadorLocalStore();
    final repo = _repo(queue, lines);
    final a1 = await _addAndGet(repo, queue, 'ELE-0102', 2);
    await queue.update(a1.copyWith(status: SyncStatus.synced));
    final localId = (await _lineOf(lines, 'ELE-0102'))!.localId;
    await Future.wait([
      repo.addSelection(
        workOrderLocalId: _wo,
        selection: const {'ELE-0102': 3},
        catalog: _catalog,
      ),
      repo.applyMaterialSyncStatus(localId, SyncStatus.synced),
    ]);
    var line = (await _lineOf(lines, 'ELE-0102'))!;
    expect(line.quantity, 5);
    expect(line.syncStatus, SyncStatus.pending);

    // (3b) a atualização de estado não reescreve a soma: outra instância do repositório (o provider reconstruído
    // durante a passada) lança +3 enquanto esta segura a leitura antiga (2).
    final queueB = InMemorySyncQueueRepository();
    final gated = _GatedLines();
    final replaySide = _repo(queueB, gated);
    final screenSide = _repo(queueB, gated);
    final b1 = await _addAndGet(screenSide, queueB, 'ELE-0102', 2);
    await queueB.update(b1.copyWith(status: SyncStatus.synced));
    final gatedId = (await _lineOf(gated.inner, 'ELE-0102'))!.localId;
    final open = Completer<void>();
    gated.gate = open;
    final late = replaySide.applyMaterialSyncStatus(gatedId, SyncStatus.synced);
    await gated.reading.future;
    await screenSide.addSelection(
      workOrderLocalId: _wo,
      selection: const {'ELE-0102': 3},
      catalog: _catalog,
    );
    open.complete();
    await late;
    await replaySide.applyMaterialSyncStatus(gatedId, SyncStatus.pending);

    line = (await _lineOf(gated.inner, 'ELE-0102'))!;
    expect(line.quantity, 5);
    expect(line.syncStatus, SyncStatus.pending);
  });

  group('RC6(4) "Versão do gestor" pela tela', () {
    Widget wrap(
      InMemorySyncActionStore store,
      InMemoryPrestadorLocalStore lines,
    ) {
      final router = GoRouter(
        initialLocation: '/sync',
        routes: [GoRoute(path: '/sync', builder: (_, _) => const SyncScreen())],
      );
      return ProviderScope(
        overrides: [
          syncActionStoreProvider.overrideWithValue(store),
          currentSyncUserIdProvider.overrideWithValue(_user),
          expenseLocalStoreProvider.overrideWithValue(
            InMemoryExpenseLocalStore(),
          ),
          workOrderLocalStoreProvider.overrideWithValue(
            InMemoryWorkOrderLocalStore(),
          ),
          bootstrapSessionProvider.overrideWith(
            (_) async => devBootstrapSession,
          ),
          prestadorRepositoryProvider.overrideWith(
            (ref) => _repo(
              ref.watch(syncQueueRepositoryProvider),
              lines,
              session: devBootstrapSession,
            ),
          ),
        ],
        child: MaterialApp.router(routerConfig: router),
      );
    }

    SyncAction addition(
      String id,
      String materialLocalId,
      int quantity,
      SyncStatus status, {
      String? errorCode,
      int retryCount = 0,
      String? resultRef,
    }) => SyncAction(
      clientActionId: id,
      tenantId: _tenant,
      userId: _user,
      type: InventorySyncActionTypes.materialAdd,
      payload: {
        'work_order_local_id': _wo,
        'material_local_id': materialLocalId,
        'sku': 'ELE-0102',
        'quantity': quantity,
        'result_ref': ?resultRef,
      },
      status: status,
      createdAt: DateTime.utc(2026, 11, 13),
      retryCount: retryCount,
      lastErrorCode: errorCode,
      lastSafeError: errorCode == null ? null : 'Conflito do material.',
    );

    WorkOrderMaterial row(String localId, int quantity, SyncStatus status) =>
        WorkOrderMaterial(
          localId: localId,
          tenantId: _tenant,
          workOrderLocalId: _wo,
          sku: 'ELE-0102',
          name: 'Disjuntor',
          quantity: quantity,
          unit: 'un',
          syncStatus: status,
        );

    testWidgets('adição de 2 numa linha de 5 → linha 3, e o remove dela vai '
        'para a fila (pode ter baixado)', (t) async {
      final store = InMemorySyncActionStore([
        addition('a1', 'mat-5', 3, SyncStatus.synced, resultRef: 'mov-a1'),
        addition(
          'a2',
          'mat-5',
          2,
          SyncStatus.conflict,
          errorCode: 'insufficient_balance',
          retryCount: 1,
        ),
      ]);
      final lines = InMemoryPrestadorLocalStore([
        row('mat-5', 5, SyncStatus.conflict),
      ]);
      await t.pumpWidget(wrap(store, lines));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('conflict-use-server-a2')));
      await t.pumpAndSettle();

      final line = (await lines.loadMaterials(_wo)).single;
      expect(line.quantity, 3);
      expect(line.syncStatus, SyncStatus.synced);
      final removals = (await store.load())
          .where((a) => a.type == InventorySyncActionTypes.materialRemove)
          .toList();
      expect(removals, hasLength(1));
      expect(removals.single.payload['source_client_action_id'], 'a2');
    });

    testWidgets('adição de 2 numa linha de 2 → linha apagada; S12 nunca foi '
        'enviada, sem remove', (t) async {
      final store = InMemorySyncActionStore([
        addition(
          'a3',
          'mat-2',
          2,
          SyncStatus.conflict,
          errorCode: inventoryWorkOrderNotOnServerErrorCode,
        ),
      ]);
      final lines = InMemoryPrestadorLocalStore([
        row('mat-2', 2, SyncStatus.conflict),
      ]);
      await t.pumpWidget(wrap(store, lines));
      await t.pumpAndSettle();

      await t.tap(find.byKey(const Key('conflict-use-server-a3')));
      await t.pumpAndSettle();

      expect(await lines.loadMaterials(_wo), isEmpty);
      expect(
        (await store.load()).where(
          (a) => a.type == InventorySyncActionTypes.materialRemove,
        ),
        isEmpty,
      );
    });
  });

  test('RC6(5) com tudo aceito a OS sai do aparelho; com um conflito ela '
      'fica', () async {
    Future<List<String>> pass({required bool oneConflict}) async {
      final queue = InMemorySyncQueueRepository();
      final lines = InMemoryPrestadorLocalStore();
      final orders = InMemoryWorkOrderLocalStore([_order()]);
      final prestador = _repo(queue, lines);
      await prestador.addSelection(
        workOrderLocalId: _wo,
        selection: const {'ELE-0102': 1, 'ELE-0103': 2},
        catalog: _catalog,
      );
      final api = CaptureInventoryBatchApi(
        (batch) => [
          for (final a in batch)
            SyncActionResult(
              clientActionId: a.clientActionId,
              status: oneConflict && a.payload['sku'] == 'ELE-0103'
                  ? 'conflict'
                  : 'processed',
              resultRef: 'mov-${a.clientActionId}',
              errorCode: 'insufficient_balance',
            ),
        ],
      );
      await InventorySyncReplayService(
        queue: queue,
        api: api,
        workOrders: orders,
        entityUpdater: (action, result, status) =>
            prestador.applyMaterialSyncStatus(
              action.payload['material_local_id']! as String,
              status,
            ),
      ).replayTenant(_tenant);

      final workOrders = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: orders,
        remoteApi: _WalkingApi(),
        hasExternalPendingWork: buildWorkOrderExternalPendingWork(
          checklistStore: InMemoryChecklistLocalStore.new,
          prestadorStore: () => lines,
        ),
        allowSeedOrders: false,
      );
      await workOrders.refresh();
      return (await orders.loadWorkOrders()).map((o) => o.localId).toList();
    }

    expect(await pass(oneConflict: false), isEmpty);
    expect(await pass(oneConflict: true), [_wo]);
  });
}
