// B-SAN3-13 — ciclo 2 (conserto da reprovação da junta de dado, plano "Ciclo 2 — plano de resolução").
//
// C2-01: o apagar da OS reconciliada é ATÔMICO com a checagem de material e de linha (`deleteWorkOrderUnlessPending`,
// predicado no próprio DELETE). C2-02: trabalho de vistoria pendente retém a OS mesmo com o run já `synced` (ação da
// fila por `local_run_id`/`server_run_id`, marcador e ciência). Drift em memória; produtores REAIS de
// `ChecklistRepository` e o gancho REAL do provider (`buildWorkOrderExternalPendingWork`).
import 'dart:async';

import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-a';
const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant A'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

class _WalkingApi implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
  _WalkingApi(this.serverIds);

  List<String> serverIds;

  @override
  Future<WorkOrderFetchResult> fetchAssignedOpenWorkOrders({
    String? tenantId,
  }) async => WorkOrderFetchResult(
    orders: [for (final id in serverIds) _order(id, serverId: id)],
    complete: true,
  );

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async =>
      (await fetchAssignedOpenWorkOrders(tenantId: tenantId)).orders;

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

class _NoChecklistRemote implements ChecklistRemoteApi {
  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

WorkOrder _order(
  String localId, {
  String? serverId,
  SyncStatus sync = SyncStatus.synced,
}) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 10, 25),
);

WorkOrderMaterial _material(
  String workOrderLocalId,
  SyncStatus sync, {
  String? localId,
}) => WorkOrderMaterial(
  localId: localId ?? 'mat-$workOrderLocalId',
  tenantId: _tenant,
  workOrderLocalId: workOrderLocalId,
  sku: 'ELE-0102',
  name: 'Cabo',
  quantity: 3,
  unit: 'un',
  syncStatus: sync,
);

MobileChecklistRun _run(String localId, String workOrderId, {String? serverId}) =>
    MobileChecklistRun(
      localId: localId,
      serverId: serverId,
      tenantId: _tenant,
      checklistId: 'cl-1',
      workOrderId: workOrderId,
      schemaVersion: '1',
      status: MobileChecklistRunStatus.inProgress,
      executedByUserId: 'u-1',
      startedAt: DateTime.utc(2026, 10, 25),
      syncStatus: SyncStatus.synced,
      answers: const {},
    );

SyncAction _action(String type, Map<String, Object?> payload) =>
    SyncActionFactory().create(
      tenantId: _tenant,
      type: type,
      payload: payload,
    );

/// O terreno de Drift em memória: as três tabelas de módulos diferentes no MESMO banco, como no aparelho.
class _Terrain {
  _Terrain() : db = AppDatabase(NativeDatabase.memory()) {
    store = DriftWorkOrderLocalStore(db);
    checklists = DriftChecklistLocalStore(db);
    prestador = DriftPrestadorLocalStore(db);
  }

  final AppDatabase db;
  late final DriftWorkOrderLocalStore store;
  late final DriftChecklistLocalStore checklists;
  late final DriftPrestadorLocalStore prestador;
  final queue = InMemorySyncQueueRepository();

  WorkOrderExternalPendingWork get realHook =>
      buildWorkOrderExternalPendingWork(
        checklistStore: () => checklists,
        prestadorStore: () => prestador,
      );

  ChecklistRepository checklistRepo() => ChecklistRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: checklists,
    remoteApi: _NoChecklistRemote(),
  );

  WorkOrderRepository repo({WorkOrderExternalPendingWork? hook}) =>
      WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
        remoteApi: _WalkingApi([]),
        hasExternalPendingWork: hook ?? realHook,
      );

  Future<List<String>> ids() async =>
      (await store.loadWorkOrders()).map((o) => o.localId).toList()..sort();

  Future<void> markAllActionsSynced() async {
    for (final a in await queue.actionsForTenant(_tenant)) {
      await queue.update(a.copyWith(status: SyncStatus.synced));
    }
  }
}

void main() {
  group('B-SAN3-13 ciclo 2 · C2-01 — material na janela da purga', () {
    // F29 — é a S3 da C2 com a asserção invertida: o escritor do prestador grava material `pending` e enfileira
    // `work_order_material.add` DEPOIS de o ramo 5 dizer "nada pendente" e ANTES do apagar.
    test(
      'F29 — material gravado na janela (depois do ramo 5, antes do apagar): OS e material ficam',
      () async {
        final t = _Terrain();
        addTearDown(t.db.close);
        await t.store.saveWorkOrder(_order('w', serverId: 'srv-w'));
        final real = t.realHook;
        var fired = false;
        final repo = t.repo(
          hook: (order) async {
            final pending = await real(order);
            if (order.localId == 'w' && !fired) {
              fired = true;
              await t.prestador.saveMaterial(
                _material('w', SyncStatus.pending),
              );
              await t.queue.enqueue(
                _action(InventorySyncActionTypes.materialAdd, {
                  'work_order_local_id': 'w',
                  'sku': 'ELE-0102',
                  'quantity': 3,
                }),
              );
            }
            return pending;
          },
        );

        await repo.refresh();
        expect(fired, isTrue);
        expect(await t.ids(), ['w'], reason: 'OS_restantes');
        expect(await t.prestador.loadMaterials('w'), hasLength(1));
        expect(await t.queue.actionsForTenant(_tenant), hasLength(1));

        // Segundo pull com o material ainda pendente: a OS continua.
        await repo.refresh();
        expect(await t.ids(), ['w']);

        // Material e ação drenados: a OS sai, com as filhas.
        await t.prestador.saveMaterial(_material('w', SyncStatus.synced));
        await t.markAllActionsSynced();
        await repo.refresh();
        expect(await t.ids(), isEmpty);
        expect(await t.prestador.loadMaterials('w'), isEmpty);
      },
    );
  });

  group('B-SAN3-13 ciclo 2 · C2-02 — vistoria pendente com run synced', () {
    // F28a — é a S2 da C2 com a asserção invertida, produtor REAL (`saveAnswer`).
    test(
      'F28a — resposta de vistoria pendente com o run synced: a OS fica até a ação drenar',
      () async {
        final t = _Terrain();
        addTearDown(t.db.close);
        await t.store.saveWorkOrder(_order('c', serverId: 'srv-c'));
        await t.checklists.saveRun(
          _run('run-c', 'srv-c', serverId: 'srv-run-c'),
        );
        await t.checklistRepo().saveAnswer(
          runId: 'run-c',
          answer: MobileChecklistAnswer(
            fieldId: 'f1',
            answeredAt: DateTime.utc(2026, 10, 25),
            textValue: 'resposta do tecnico',
          ),
        );
        expect(
          (await t.checklists.loadRun('run-c'))!.syncStatus,
          SyncStatus.synced,
        );
        final repo = t.repo();

        await repo.refresh();
        expect(await t.ids(), ['c'], reason: 'OS_restantes');
        expect((await t.checklists.loadRun('run-c'))!.answers, hasLength(1));
        expect(await t.queue.pendingForTenant(_tenant), hasLength(1));

        await t.markAllActionsSynced();
        await repo.refresh();
        expect(await t.ids(), isEmpty);
        expect(await t.checklists.loadRun('run-c'), isNotNull);
      },
    );
  });
}
