// B-SAN3-13 — reconciliação do cache de OS: o que sai, o que fica, e a trava (plano v3 §2.3/§2.4/§2.6;
// CA-15..CA-20, CA-23, CA-24).
//
// A propriedade: depois de uma caminhada COMPLETA, toda linha da organização ativa ou está no conjunto devolvido
// pelo backend, ou tem trabalho pendente — e então FICA até drenar. Nada pendente é apagado: ação na fila (por
// qualquer das 5 chaves, de qualquer tipo), linha `pending`, blob de evidência ainda no aparelho, vistoria ou
// material do prestador não sincronizados.
import 'dart:async';
import 'dart:io';
import 'dart:typed_data';

import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fakes
// ---------------------------------------------------------------------------

/// API que caminha: devolve o conjunto S e se a caminhada foi completa.
class _WalkingApi implements WorkOrderRemoteApi, WalkingWorkOrderRemoteApi {
  _WalkingApi(this.serverIds, {this.complete = true});

  List<String> serverIds;
  bool complete;

  @override
  Future<WorkOrderFetchResult> fetchAssignedOpenWorkOrders({
    String? tenantId,
  }) async => WorkOrderFetchResult(
    orders: [for (final id in serverIds) _order(id, serverId: id)],
    complete: complete,
  );

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async =>
      (await fetchAssignedOpenWorkOrders(tenantId: tenantId)).orders;
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

/// Ciclo 2 (F35) — API antiga: só a lista, sem caminhada (não implementa `WalkingWorkOrderRemoteApi`).
class _ListOnlyApi implements WorkOrderRemoteApi {
  _ListOnlyApi(this.serverIds);

  final List<String> serverIds;

  @override
  Future<List<WorkOrder>> fetchWorkOrders({String? tenantId}) async => [
    for (final id in serverIds) _order(id, serverId: id),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => throw UnimplementedError();
}

/// Fila em memória com uma COMPORTA no `enqueue`: segura a mutação entre "gravou a linha/linha do tempo" e
/// "enfileirou" — a janela do CRIT-6.
class _GatedQueue extends InMemorySyncQueueRepository {
  Completer<void>? gate;
  bool waiting = false;

  @override
  Future<void> enqueue(SyncAction action) async {
    final g = gate;
    if (g != null) {
      waiting = true;
      await g.future;
    }
    return super.enqueue(action);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const _tenant = 'tenant-a';
const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant A'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:status'}),
);

WorkOrder _order(
  String localId, {
  String? serverId,
  SyncStatus sync = SyncStatus.synced,
  WorkOrderStatus status = WorkOrderStatus.scheduled,
  String tenant = _tenant,
}) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: tenant,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: sync,
  createdAt: DateTime.utc(2026, 10, 25),
);

WorkOrderTimelineEvent _timeline(String localId) => WorkOrderTimelineEvent(
  localId: 'tl-$localId',
  workOrderLocalId: localId,
  tenantId: _tenant,
  eventType: WorkOrderTimelineEventType.created,
  occurredAt: DateTime.utc(2026, 10, 25),
);

WorkOrderEvidence _evidence(
  String localId, {
  String? blob,
  SyncStatus upload = SyncStatus.pending,
  String? errorCode,
}) => WorkOrderEvidence(
  localId: 'ev-$localId-${upload.name}-$errorCode',
  workOrderLocalId: localId,
  tenantId: _tenant,
  fileName: 'foto.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 10,
  captureSource: 'camera',
  syncStatus: SyncStatus.synced,
  uploadStatus: upload,
  uploadErrorCode: errorCode,
  localBlobRef: blob,
  createdAt: DateTime.utc(2026, 10, 25),
);

SyncAction _action(
  String type,
  Map<String, Object?> payload, {
  SyncStatus status = SyncStatus.pending,
}) => SyncActionFactory()
    .create(tenantId: _tenant, type: type, payload: payload)
    .copyWith(status: status);

WorkOrderMaterial _material(String workOrderLocalId, SyncStatus sync) =>
    WorkOrderMaterial(
      localId: 'mat-$workOrderLocalId-${sync.name}',
      tenantId: _tenant,
      workOrderLocalId: workOrderLocalId,
      sku: 'ELE-0102',
      name: 'Cabo',
      quantity: 2,
      unit: 'un',
      syncStatus: sync,
    );

MobileChecklistRun _run(String workOrderId, SyncStatus sync) =>
    MobileChecklistRun(
      localId: 'run-$workOrderId-${sync.name}',
      tenantId: _tenant,
      checklistId: 'cl-1',
      workOrderId: workOrderId,
      schemaVersion: '1',
      status: MobileChecklistRunStatus.inProgress,
      executedByUserId: 'u-1',
      startedAt: DateTime.utc(2026, 10, 25),
      syncStatus: sync,
      answers: const {},
    );

WorkOrderRepository _repo({
  required WorkOrderLocalStore store,
  SyncQueueRepository? queue,
  WorkOrderRemoteApi? api,
  WorkOrderExternalPendingWork? external,
  bool allowSeedOrders = true,
}) => WorkOrderRepository(
  session: _session,
  syncQueue: queue ?? InMemorySyncQueueRepository(),
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: api,
  hasExternalPendingWork: external,
  allowSeedOrders: allowSeedOrders,
);

Future<List<String>> _ids(WorkOrderLocalStore store) async =>
    (await store.loadWorkOrders()).map((o) => o.localId).toList()..sort();

Future<void> _settle() async {
  for (var i = 0; i < 20; i++) {
    await Future<void>.delayed(const Duration(milliseconds: 1));
  }
}

void main() {
  group('B-SAN3-13 · retenção por família', () {
    // F8 — reatribuída, nada pendente: sai com as filhas.
    test(
      'F8 — fora de S e sem nada pendente: OS e linha do tempo saem',
      () async {
        final store = InMemoryWorkOrderLocalStore(
          [_order('a', serverId: 'srv-a'), _order('b', serverId: 'srv-b')],
          [_timeline('b')],
        );
        final repo = _repo(store: store, api: _WalkingApi(['srv-a']));
        await repo.refresh();
        expect(await _ids(store), ['a']);
        expect(await store.loadTimeline('b'), isEmpty);
        expect(repo.workOrders.map((o) => o.localId), ['a']);
      },
    );

    // F9/F10/F11/F19 (CA-15) — ramo 1 por CHAVE: uma linha por chave; cada uma tem só a ação daquela chave.
    test(
      'F9-F11, F19 — ação pendente por local_id, server_id, work_order_id (evidência e saída de estoque), '
      'work_order_local_id (material) e ação failed: todas ficam',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          for (final id in ['l', 's', 'e', 'x', 'm', 'f', 'livre'])
            _order(id, serverId: 'srv-$id'),
        ]);
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(WorkOrderSyncActionTypes.unableToStart, {'local_id': 'l'}),
        );
        await queue.enqueue(
          _action(WorkOrderSyncActionTypes.approvalRequest, {
            'server_id': 'srv-s',
          }),
        );
        await queue.enqueue(
          _action(EvidenceSyncActionTypes.workOrderPhoto, {
            'work_order_id': 'srv-e',
            'local_evidence_id': 'ev-1',
          }),
        );
        await queue.enqueue(
          _action(InventorySyncActionTypes.exitCreate, {
            'work_order_id': 'srv-x',
          }),
        );
        await queue.enqueue(
          _action(InventorySyncActionTypes.materialAdd, {
            'work_order_local_id': 'm',
            'sku': 'ELE-0102',
            'quantity': 2,
          }),
        );
        await queue.enqueue(
          _action(WorkOrderSyncActionTypes.statusUpdate, {
            'local_id': 'f',
          }, status: SyncStatus.failed),
        );
        final repo = _repo(store: store, queue: queue, api: _WalkingApi([]));
        await repo.refresh();
        expect(await _ids(store), ['e', 'f', 'l', 'm', 's', 'x']);
      },
    );

    // F12 (CA-17) — ramo 2: linha `pending` sem ação fica; o carimbo `conflict` da linha NÃO retém.
    test(
      'F12 — linha pending sem ação fica; linha conflict com ação synced sai',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('p', serverId: 'srv-p', sync: SyncStatus.pending),
          _order('c', serverId: 'srv-c', sync: SyncStatus.conflict),
        ]);
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(WorkOrderSyncActionTypes.statusUpdate, {
            'local_id': 'c',
          }, status: SyncStatus.synced),
        );
        final repo = _repo(store: store, queue: queue, api: _WalkingApi([]));
        await repo.refresh();
        expect(await _ids(store), ['p']);
      },
    );

    // F20 (CA-16) — ramo 3: só blob AINDA no aparelho e não enviado retém.
    test(
      'F20 — LOCAL_BLOB_MISSING sai; blob em conflict/pending/failed fica; evidência sem blob sai',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          for (final id in ['miss', 'conf', 'pend', 'fail', 'semblob'])
            _order(id, serverId: 'srv-$id'),
        ]);
        await store.saveEvidence(
          _evidence(
            'miss',
            blob: 'blob-1',
            upload: SyncStatus.failed,
            errorCode: 'LOCAL_BLOB_MISSING',
          ),
        );
        await store.saveEvidence(
          _evidence('conf', blob: 'blob-2', upload: SyncStatus.conflict),
        );
        await store.saveEvidence(
          _evidence('pend', blob: 'blob-3', upload: SyncStatus.pending),
        );
        await store.saveEvidence(
          _evidence('fail', blob: 'blob-4', upload: SyncStatus.failed),
        );
        await store.saveEvidence(
          _evidence('semblob', upload: SyncStatus.pending),
        );
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(EvidenceSyncActionTypes.workOrderPhoto, {
            'work_order_id': 'srv-semblob',
          }, status: SyncStatus.synced),
        );
        final repo = _repo(store: store, queue: queue, api: _WalkingApi([]));
        await repo.refresh();
        expect(await _ids(store), ['conf', 'fail', 'pend']);
      },
    );

    // F25 + F21 (CA-19) — ramos 4 e 5 pelo gancho REAL do provider (`buildWorkOrderExternalPendingWork`).
    test(
      'F21/F25 — vistoria não sincronizada e material pending ficam; sincronizados saem',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          for (final id in ['vp', 'vs', 'mp', 'ms'])
            _order(id, serverId: 'srv-$id'),
        ]);
        final checklists = InMemoryChecklistLocalStore();
        await checklists.saveRun(_run('srv-vp', SyncStatus.pending));
        await checklists.saveRun(_run('srv-vs', SyncStatus.synced));
        final prestador = InMemoryPrestadorLocalStore([
          _material('mp', SyncStatus.pending),
          _material('ms', SyncStatus.synced),
        ]);
        final repo = _repo(
          store: store,
          api: _WalkingApi([]),
          external: buildWorkOrderExternalPendingWork(
            checklistStore: () => checklists,
            prestadorStore: () => prestador,
          ),
        );
        await repo.refresh();
        expect(await _ids(store), ['mp', 'vp']);
      },
    );

    test('R10 — gancho que falha RETÉM (fail-closed)', () async {
      final store = InMemoryWorkOrderLocalStore([
        _order('a', serverId: 'srv-a'),
      ]);
      final repo = _repo(
        store: store,
        api: _WalkingApi([]),
        external: buildWorkOrderExternalPendingWork(
          checklistStore: () => throw StateError('store fora'),
          prestadorStore: InMemoryPrestadorLocalStore.new,
        ),
      );
      await repo.refresh();
      expect(await _ids(store), ['a']);
    });

    // F17 — a outra organização não é tocada.
    test('F17 — linha de outra organização fica intocada', () async {
      final store = InMemoryWorkOrderLocalStore([
        _order('outra', serverId: 'srv-o', tenant: 'tenant-b'),
        _order('minha', serverId: 'srv-m'),
      ]);
      final repo = _repo(store: store, api: _WalkingApi([]));
      await repo.refresh();
      expect(await _ids(store), ['outra']);
    });

    // F5 (CA-14) — caminhada incompleta não tira nada.
    test(
      'F5 — caminhada incompleta: atualiza, não apaga, marca desatualizado',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('a', serverId: 'srv-a'),
        ]);
        final repo = _repo(
          store: store,
          api: _WalkingApi(['srv-b'], complete: false),
        );
        await repo.refresh();
        expect(await _ids(store), ['a', 'srv-b']);
        expect(repo.lastPullIncomplete, isTrue);
      },
    );
  });

  group('B-SAN3-13 · drenagem e criação offline', () {
    // F13/F14 (CA-18) — replay → conflito → resolução → pull completo sem a OS.
    for (final choice in ConflictChoice.values) {
      test(
        'F13/F14 — ${choice.name}: ${choice == ConflictChoice.useServer ? 'sai' : 'fica'}',
        () async {
          final store = InMemoryWorkOrderLocalStore([
            _order('x', serverId: 'srv-x'),
          ]);
          final queue = InMemorySyncQueueRepository();
          final api = _WalkingApi(['srv-x']);
          final repo = _repo(store: store, queue: queue, api: api);
          await repo.load();
          await _settle();

          final mutation = await repo.updateStatus(
            'x',
            WorkOrderStatus.dispatched,
          );
          // O que o replay faz (`sync_replay_service.dart`): `update` da ação, depois o atualizador da linha.
          final emConflito = mutation.action.copyWith(
            status: SyncStatus.conflict,
          );
          await queue.update(emConflito);
          await buildWorkOrderSyncEntityUpdater(store)(
            emConflito,
            SyncActionResult(
              clientActionId: emConflito.clientActionId,
              status: 'conflict',
            ),
            SyncStatus.conflict,
          );
          expect(
            (await store.loadWorkOrders()).single.syncStatus,
            SyncStatus.conflict,
          );
          await queue.update(resolveConflictAction(emConflito, choice));

          api.serverIds = []; // reatribuída: o backend não a devolve mais
          await repo.refresh();
          if (choice == ConflictChoice.useServer) {
            expect(await _ids(store), isEmpty);
            expect(await store.loadTimeline('x'), isEmpty);
          } else {
            expect(await _ids(store), ['x']);
          }
        },
      );
    }

    // F15 — criada offline (com `work_order.create` na fila) fica; semente sai.
    test('F15 — criada offline fica; semente sem create sai', () async {
      final store = InMemoryWorkOrderLocalStore([
        _order('wo-local-1', sync: SyncStatus.pending),
      ]);
      final queue = InMemorySyncQueueRepository();
      final repo = _repo(store: store, queue: queue, api: _WalkingApi([]));
      await repo.load();
      await _settle();
      final criada = await repo.createWorkOrder(
        title: 'Nova',
        customerName: 'Cliente',
        serviceAddress: 'Rua',
        priority: WorkOrderPriority.normal,
      );
      await repo.refresh();
      expect(await _ids(store), [criada.workOrder.localId]);
    });

    // F6 (Q5) — sem sementes fora do app de demonstração: some já no load(), e nada é semeado.
    test(
      'F6 — allowSeedOrders:false tira as sementes no load() e não semeia',
      () async {
        final comSementes = InMemoryWorkOrderLocalStore([
          _order('wo-local-1'),
          _order('wo-local-3', sync: SyncStatus.pending),
          _order('real', serverId: 'srv-real'),
        ]);
        await _repo(store: comSementes, allowSeedOrders: false).load();
        expect(await _ids(comSementes), ['real']);

        final vazio = InMemoryWorkOrderLocalStore();
        await _repo(store: vazio, allowSeedOrders: false).load();
        expect(await _ids(vazio), isEmpty);
      },
    );

    // F7 (H6) — o padrão do construtor preserva o modo local do b099 6.x: semeia.
    test('F7 — padrão (allowSeedOrders: true) sem API ainda semeia', () async {
      final vazio = InMemoryWorkOrderLocalStore();
      await _repo(store: vazio).load();
      expect(await _ids(vazio), ['wo-local-1', 'wo-local-2', 'wo-local-3']);
    });
  });

  group('B-SAN3-13 · trava', () {
    // F18 (CA-20, uma instância) — a mutação segura no `enqueue` (linha do tempo gravada, ação ainda não) e a
    // reconciliação chega no meio: sem a trava, a OS sumia e a ação nascia órfã.
    test(
      'F18 — reconciliação espera a mutação em curso; a OS fica com a ação',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('x', serverId: 'srv-x'),
        ]);
        final queue = _GatedQueue();
        final api = _WalkingApi(['srv-x']);
        final repo = _repo(store: store, queue: queue, api: api);
        await repo.load(seedIfEmpty: false);
        await _settle();
        api.serverIds = []; // a partir daqui, a OS deixou de ser do técnico

        queue.gate = Completer<void>();
        final mutacao = repo.createApprovalRequest(
          localId: 'x',
          reason: 'peça',
          impact: 'alto',
          urgency: 'alta',
        );
        await _settle();
        expect(queue.waiting, isTrue);
        final pull = repo.refresh();
        await _settle();
        queue.gate!.complete();
        await mutacao;
        await pull;

        expect(await _ids(store), ['x']);
        expect(await queue.actionsForTenant(_tenant), hasLength(1));
      },
    );

    // F22 (CA-20, R2-4) — duas instâncias no MESMO store: a trava é do processo, não da instância; e a decisão
    // vem do store relido, não do `_orders` velho da instância.
    test(
      'F22 — duas instâncias: B muta (enqueue retido) enquanto A reconcilia → a OS fica',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('x', serverId: 'srv-x'),
        ]);
        final queue = _GatedQueue();
        final b = _repo(store: store, queue: queue);
        await b.load(seedIfEmpty: false);
        final a = _repo(store: store, queue: queue, api: _WalkingApi([]));

        queue.gate = Completer<void>();
        final mutacao = b.createApprovalRequest(
          localId: 'x',
          reason: 'peça',
          impact: 'alto',
          urgency: 'alta',
        );
        await _settle();
        expect(queue.waiting, isTrue);
        final pull = a.refresh();
        await _settle();
        queue.gate!.complete();
        await mutacao;
        await pull;

        expect(await _ids(store), ['x']);
        expect(await queue.actionsForTenant(_tenant), hasLength(1));
      },
    );

    test(
      'F22b — instância com _orders velho (synced) e store pending: não apaga',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('x', serverId: 'srv-x'),
        ]);
        final api = _WalkingApi(['srv-x']);
        final a = _repo(store: store, api: api);
        await a.load();
        await _settle();
        expect(a.workOrders.single.syncStatus, SyncStatus.synced);
        // Outro escritor (outra instância, o atualizador do replay) põe a linha em `pending` no STORE.
        await store.saveWorkOrder(
          _order('x', serverId: 'srv-x', sync: SyncStatus.pending),
        );
        api.serverIds = [];
        await a.refresh();
        expect(await _ids(store), ['x']);
      },
    );
  });

  group('B-SAN3-13 · Drift', () {
    // F16 (CA-19/CA-23) — `deleteWorkOrder` apaga as 4 tabelas, SÓ da OS alvo.
    test(
      'F16 — deleteWorkOrder: OS, linha do tempo, evidência e materiais — só da alvo',
      () async {
        final db = AppDatabase(NativeDatabase.memory());
        addTearDown(db.close);
        final store = DriftWorkOrderLocalStore(db);
        final prestador = DriftPrestadorLocalStore(db);
        for (final id in ['alvo', 'outra']) {
          await store.saveWorkOrder(_order(id, serverId: 'srv-$id'));
          await store.saveTimelineEvent(_timeline(id));
          await store.saveEvidence(_evidence(id, upload: SyncStatus.synced));
          await prestador.saveMaterial(_material(id, SyncStatus.synced));
        }

        await store.deleteWorkOrder('alvo');

        expect(await _ids(store), ['outra']);
        expect(await store.loadTimeline('alvo'), isEmpty);
        expect(await store.loadEvidence('alvo'), isEmpty);
        expect(await prestador.loadMaterials('alvo'), isEmpty);
        expect(await store.loadTimeline('outra'), hasLength(1));
        expect(await store.loadEvidence('outra'), hasLength(1));
        expect(await prestador.loadMaterials('outra'), hasLength(1));
      },
    );

    // F21 com Drift (CA-19) — material sincronizado sai JUNTO com a OS; pendente segura a OS e a linha.
    test(
      'F21 Drift — material synced sai com a OS; pending retém OS e material',
      () async {
        final db = AppDatabase(NativeDatabase.memory());
        addTearDown(db.close);
        final store = DriftWorkOrderLocalStore(db);
        final prestador = DriftPrestadorLocalStore(db);
        await store.saveWorkOrder(_order('ms', serverId: 'srv-ms'));
        await store.saveWorkOrder(_order('mp', serverId: 'srv-mp'));
        await prestador.saveMaterial(_material('ms', SyncStatus.synced));
        await prestador.saveMaterial(_material('mp', SyncStatus.pending));
        final repo = _repo(
          store: store,
          api: _WalkingApi([]),
          external: buildWorkOrderExternalPendingWork(
            checklistStore: InMemoryChecklistLocalStore.new,
            prestadorStore: () => prestador,
          ),
        );
        await repo.refresh();
        expect(await _ids(store), ['mp']);
        expect(await prestador.loadMaterials('ms'), isEmpty);
        expect(await prestador.loadMaterials('mp'), hasLength(1));
      },
    );
  });

  // Ciclo 2 (C2-03, RQ-3) — o produto já estava certo; estes testes existem para ficar VERMELHOS sob a mutação.
  group('B-SAN3-13 ciclo 2 · J1/J2/J6 acusados', () {
    // F32 (J1) — ação em `syncing` (o replay a pegou e ainda não voltou) retém, por `local_id` e por
    // `work_order_local_id`.
    test(
      'F32 — ação syncing por local_id e por work_order_local_id: ficam',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('sl', serverId: 'srv-sl'),
          _order('sm', serverId: 'srv-sm'),
          _order('livre', serverId: 'srv-livre'),
        ]);
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(WorkOrderSyncActionTypes.statusUpdate, {
            'local_id': 'sl',
          }, status: SyncStatus.syncing),
        );
        await queue.enqueue(
          _action(InventorySyncActionTypes.materialAdd, {
            'work_order_local_id': 'sm',
            'sku': 'ELE-0102',
            'quantity': 1,
          }, status: SyncStatus.syncing),
        );
        final repo = _repo(store: store, queue: queue, api: _WalkingApi([]));
        await repo.refresh();
        expect(await _ids(store), ['sl', 'sm']);
      },
    );

    // F33 (J2) — exceção dentro da trava (bytes ≠ tamanho declarado) libera a cauda: a mutação seguinte completa.
    test(
      'F33 — exceção no corpo da trava não prende a próxima mutação',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('z', serverId: 'srv-z', status: WorkOrderStatus.inService),
        ]);
        final repo = _repo(store: store);
        await repo.load(seedIfEmpty: false);
        await expectLater(
          repo.attachEvidence(
            workOrderLocalId: 'z',
            fileName: 'a.jpg',
            mimeType: 'image/jpeg',
            sizeBytes: 5,
            captureSource: 'camera',
            bytes: Uint8List.fromList([1, 2]),
          ),
          throwsArgumentError,
        );
        final next = await repo
            .updateStatus('z', WorkOrderStatus.paused)
            .timeout(const Duration(seconds: 5));
        expect(next.workOrder.status, WorkOrderStatus.paused);
      },
    );

    // F35 (J6) — API que só implementa `WorkOrderRemoteApi` (sem caminhada) = caminhada incompleta: atualiza, nunca
    // tira nada, e a tela sabe ("dados desatualizados").
    test(
      'F35 — API sem caminhada: nada sai e o pull fica incompleto',
      () async {
        final store = InMemoryWorkOrderLocalStore([
          _order('a', serverId: 'srv-a'),
          _order('b', serverId: 'srv-b'),
        ]);
        final repo = _repo(store: store, api: _ListOnlyApi(['srv-a']));
        await repo.refresh();
        expect(await _ids(store), ['a', 'b']);
        expect(repo.lastPullIncomplete, isTrue);
      },
    );
  });

  // F24 (CA-24) — TESTE-GUARDA das famílias: toda constante de `*SyncActionTypes` está classificada, e toda chave
  // classificada (exceto `run_id`, que é o ramo 4) está nas chaves do ramo 1.
  test('F24 — toda ação da fila está classificada no mapa de retenção', () {
    final source = File(
      'lib/core/network/api_contracts.dart',
    ).readAsStringSync();
    final declared = <String>{};
    for (final match in RegExp(
      r'class (\w+SyncActionTypes)\s*\{([\s\S]*?)\n\}',
    ).allMatches(source)) {
      for (final constant in RegExp(
        r"static const \w+ = '([^']+)'",
      ).allMatches(match.group(2)!)) {
        declared.add(constant.group(1)!);
      }
    }
    expect(declared, isNotEmpty);
    expect(
      declared.difference(workOrderActionReferenceKeys.keys.toSet()),
      isEmpty,
      reason: 'tipo de ação sem classificação de retenção',
    );
    expect(
      workOrderActionReferenceKeys.keys.toSet().difference(declared),
      isEmpty,
      reason: 'classificação de tipo que não existe mais',
    );
    final ramo1 = {
      ...workOrderLocalReferenceKeys,
      ...workOrderServerReferenceKeys,
    };
    for (final entry in workOrderActionReferenceKeys.entries) {
      final keys = entry.value.difference(workOrderRunReferenceKeys);
      expect(
        ramo1.containsAll(keys),
        isTrue,
        reason: '${entry.key}: ${entry.value}',
      );
    }
    // Ciclo 2 (C2-02, RQ-2) — toda chave citada no mapa é LIDA por um ramo: as do ramo 1 ou as do run que o ramo 4
    // lê. Uma chave sem leitor (como `run_id`) fica vermelha. E toda chave do run tem PRODUTOR: os produtores de
    // vistoria (`checklist_repository.dart`) a gravam no payload.
    for (final entry in workOrderActionReferenceKeys.entries) {
      expect(
        {...ramo1, ...workOrderRunReferenceKeys}.containsAll(entry.value),
        isTrue,
        reason: 'chave sem leitor em ${entry.key}: ${entry.value}',
      );
    }
    expect(workOrderRunReferenceKeys, {'local_run_id', 'server_run_id'});
    final producers = File(
      'lib/features/checklists/data/checklist_repository.dart',
    ).readAsStringSync();
    // Cada sítio que cria ação de vistoria (`type: ChecklistSyncActionTypes.…`) grava as duas chaves no payload
    // (`server_run_id` também no carimbo da fila, por isso `>=`). `runCreate` não tem produtor no app (medido).
    final sites = RegExp(
      r'type: ChecklistSyncActionTypes\.',
    ).allMatches(producers).length;
    expect(sites, greaterThan(0));
    for (final key in workOrderRunReferenceKeys) {
      expect(
        RegExp("'$key':").allMatches(producers).length,
        greaterThanOrEqualTo(sites),
        reason: 'produtor de vistoria sem a chave do run: $key',
      );
    }
  });
}
