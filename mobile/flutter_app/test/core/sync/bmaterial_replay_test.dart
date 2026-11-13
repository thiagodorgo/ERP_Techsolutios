// B-MATERIAL-REENVIO, C-F9 — RC4 (1)–(9): o reenvio de material no app.
//
// Arnês: a fila em memória decorada por usuário (o `replaySyncQueueRepositoryProvider` real), a OS
// no Drift em memória (o provider real monta `DriftWorkOrderLocalStore`), a linha do prestador em
// memória e o `inventorySyncReplayServiceProvider` REAL, para que o atualizador de linha seja o de
// produção. A resposta do servidor passa pelo `InventorySyncCodec` real (corpo no formato da rota).
//
// Mutações (uma por vez, restauradas): M-C9 (filtro de tipo) → (1); M-C10 (prontidão) → (2);
// M-C11 (`rejected` → `failed`) → (3); M-C12 (S12) → (6); M-C13 (sem fatiar) → (7);
// M-C14 (chamada no coordenador) → (8). Controle: não compila no head-base (o serviço não existia).
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-bmaterial';
const _user = 'employee-1';
const _woReady = 'wo-pronta';
const _woReadyServer = 'srv-wo-pronta';
const _woWaiting = 'wo-a-caminho';
const _woOrphan = 'wo-orfa';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org material'),
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
  TechnicianStockItem(sku: 'ELE-0104', name: 'Cabo', available: 9, unit: 'm'),
  TechnicianStockItem(
    sku: 'ELE-0105',
    name: 'Fita',
    available: 9,
    unit: 'rolo',
  ),
];

/// Fila em memória que registra toda escrita, para provar "nunca marcou `syncing`".
class _RecordingQueue implements SyncQueueRepository {
  _RecordingQueue() : _inner = InMemorySyncQueueRepository();

  final InMemorySyncQueueRepository _inner;
  final List<SyncAction> updates = <SyncAction>[];

  @override
  Future<void> enqueue(SyncAction action) => _inner.enqueue(action);

  @override
  Future<List<SyncAction>> pendingForTenant(String tenantId) =>
      _inner.pendingForTenant(tenantId);

  @override
  Future<List<SyncAction>> actionsForTenant(String tenantId) =>
      _inner.actionsForTenant(tenantId);

  @override
  Future<void> update(SyncAction action) {
    updates.add(action);
    return _inner.update(action);
  }

  bool everSyncing(String clientActionId) => updates.any(
    (a) => a.clientActionId == clientActionId && a.status == SyncStatus.syncing,
  );
}

class _H {
  _H(InventorySyncBatchApi api) : db = AppDatabase.openInMemory() {
    repo = PrestadorRepository(
      session: _session,
      syncQueue: queue,
      actionFactory: factory,
      localStore: lines,
    );
    container = ProviderContainer(
      overrides: [
        appDatabaseProvider.overrideWithValue(db),
        syncQueueRepositoryProvider.overrideWithValue(queue),
        currentSyncUserIdProvider.overrideWithValue(_user),
        inventorySyncBatchApiProvider.overrideWithValue(api),
        prestadorRepositoryProvider.overrideWithValue(repo),
      ],
    );
  }

  final AppDatabase db;
  final _RecordingQueue queue = _RecordingQueue();
  final InMemoryPrestadorLocalStore lines = InMemoryPrestadorLocalStore();
  final SyncActionFactory factory = SyncActionFactory(
    currentUserId: () => _user,
  );
  late final PrestadorRepository repo;
  late final ProviderContainer container;

  InventorySyncReplayService get service =>
      container.read(inventorySyncReplayServiceProvider);

  Future<void> dispose() async {
    container.dispose();
    await db.close();
  }

  Future<void> saveOrder(String localId, {String? serverId}) =>
      DriftWorkOrderLocalStore(db).saveWorkOrder(_order(localId, serverId));

  Future<SyncAction> enqueue(String type, Map<String, Object?> payload) async {
    final action = factory.create(
      tenantId: _tenant,
      type: type,
      payload: payload,
    );
    await queue.enqueue(action);
    return action;
  }

  Future<SyncAction> stored(String clientActionId) async =>
      (await queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.clientActionId == clientActionId);

  Future<List<SyncAction>> materialActions() async =>
      (await queue.actionsForTenant(_tenant))
          .where((a) => a.type == InventorySyncActionTypes.materialAdd)
          .toList(growable: false);

  Future<WorkOrderMaterial> line(String sku) async =>
      (await lines.loadMaterials(_woReady)).singleWhere((m) => m.sku == sku);
}

WorkOrder _order(String localId, String? serverId) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: serverId == null ? SyncStatus.pending : SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 13),
);

Map<String, Object?> _addPayload(String wo, String sku, {int quantity = 1}) => {
  'work_order_local_id': wo,
  'material_local_id': 'mat-$wo-$sku',
  'sku': sku,
  'quantity': quantity,
};

/// Corpo no formato da rota (`syncMobileInventoryActions`), decodificado pelo codec real.
List<SyncActionResult> _decode({
  List<Map<String, Object?>> accepted = const [],
  List<Map<String, Object?>> alreadyApplied = const [],
  List<Map<String, Object?>> conflicts = const [],
  List<Map<String, Object?>> rejected = const [],
}) => const InventorySyncCodec().decodeResponse({
  'data': {
    'accepted': accepted,
    'already_applied': alreadyApplied,
    'conflicts': conflicts,
    'rejected': rejected,
  },
});

Map<String, Object?> _ok(SyncAction a, String status) => {
  'client_action_id': a.clientActionId,
  'type': a.type,
  'status': status,
  'result_ref': 'mov-${a.clientActionId}',
};

Map<String, Object?> _rejected(SyncAction a, String reason) => {
  'client_action_id': a.clientActionId,
  'type': a.type,
  'status': 'rejected',
  'error': {'code': 'X', 'reason': reason, 'message': 'x'},
};

Map<String, Object?> _conflict(SyncAction a, String type) => {
  'client_action_id': a.clientActionId,
  'type': a.type,
  'status': 'conflict',
  'conflict': {'conflict_type': type, 'next_action': 'await_supervisor_review'},
  'error': {'code': 'X', 'reason': type, 'message': 'x'},
};

List<SyncActionResult> _acceptAll(List<SyncAction> batch) =>
    _decode(accepted: [for (final a in batch) _ok(a, 'accepted')]);

void main() {
  test('RC4(1) só material e remoção vão no lote; o resto fica pending sem '
      'syncing', () async {
    final api = CaptureInventoryBatchApi(_acceptAll);
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    final add = await h.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0102'),
    );
    final remove = await h.enqueue(InventorySyncActionTypes.materialRemove, {
      'work_order_local_id': _woReady,
      'material_local_id': 'mat-$_woReady-ELE-0102',
      'source_client_action_id': '00000000-0000-4000-8000-000000000001',
    });
    final entry = await h.enqueue(InventorySyncActionTypes.entryCreate, {
      'sku': 'ELE-0102',
      'quantity': 1,
    });
    final status = await h.enqueue(WorkOrderSyncActionTypes.statusUpdate, {
      'local_id': _woReady,
      'server_id': _woReadyServer,
      'status': 'in_progress',
    });

    await h.service.replayTenant(_tenant);

    expect(api.capturedBatches, hasLength(1));
    expect(api.capturedBatches.single.map((a) => a.clientActionId).toSet(), {
      add.clientActionId,
      remove.clientActionId,
    });
    for (final other in [entry, status]) {
      final stored = await h.stored(other.clientActionId);
      expect(stored.status, SyncStatus.pending, reason: other.type);
      expect(stored.retryCount, 0, reason: other.type);
      expect(h.queue.everSyncing(other.clientActionId), isFalse);
    }
    expect((await h.stored(add.clientActionId)).status, SyncStatus.synced);
    expect((await h.stored(remove.clientActionId)).status, SyncStatus.synced);
  });

  test('RC4(2) OS ainda a caminho não envia; OS no servidor envia com '
      'work_order_id e material_local_id', () async {
    final api = CaptureInventoryBatchApi(_acceptAll);
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woWaiting);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    await h.enqueue(WorkOrderSyncActionTypes.create, {'local_id': _woWaiting});
    final waiting = await h.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woWaiting, 'ELE-0102'),
    );
    final ready = await h.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0103', quantity: 2),
    );

    await h.service.replayTenant(_tenant);

    expect(api.capturedBatches, hasLength(1));
    final sent = api.capturedBatches.single.single;
    expect(sent.clientActionId, ready.clientActionId);
    expect(sent.payload['work_order_id'], _woReadyServer);
    expect(sent.payload['material_local_id'], 'mat-$_woReady-ELE-0103');
    expect(sent.payload['quantity'], 2);
    final stillWaiting = await h.stored(waiting.clientActionId);
    expect(stillWaiting.status, SyncStatus.pending);
    expect(stillWaiting.retryCount, 0);
    expect(h.queue.everSyncing(waiting.clientActionId), isFalse);
  });

  test('RC4(3) accepted e already_applied → synced; rejected e conflicts → '
      'conflict com texto; a linha segue a ação', () async {
    late CaptureInventoryBatchApi api;
    api = CaptureInventoryBatchApi((batch) {
      SyncAction bySku(String sku) =>
          batch.singleWhere((a) => a.payload['sku'] == sku);
      return _decode(
        accepted: [_ok(bySku('ELE-0102'), 'accepted')],
        alreadyApplied: [_ok(bySku('ELE-0103'), 'already_applied')],
        rejected: [_rejected(bySku('ELE-0104'), 'inventory_item_not_found')],
        conflicts: [
          _conflict(bySku('ELE-0105'), 'assignment_changed_pending_review'),
        ],
      );
    });
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    await h.repo.addSelection(
      workOrderLocalId: _woReady,
      selection: const {
        'ELE-0102': 1,
        'ELE-0103': 2,
        'ELE-0104': 3,
        'ELE-0105': 4,
      },
      catalog: _catalog,
    );

    await h.service.replayTenant(_tenant);

    final bySku = {
      for (final a in await h.materialActions()) a.payload['sku']: a,
    };
    expect(bySku['ELE-0102']!.status, SyncStatus.synced);
    expect(
      bySku['ELE-0102']!.payload['result_ref'],
      'mov-${bySku['ELE-0102']!.clientActionId}',
    );
    expect(bySku['ELE-0103']!.status, SyncStatus.synced);
    expect(bySku['ELE-0104']!.status, SyncStatus.conflict);
    expect(bySku['ELE-0104']!.lastErrorCode, 'inventory_item_not_found');
    expect(bySku['ELE-0104']!.lastSafeError, contains('SKU ELE-0104'));
    // A1 da J-551: o botão da tela é "Versão do gestor" (`sync_screen.dart`), com acento.
    expect(
      bySku['ELE-0104']!.lastSafeError,
      contains('Versão do gestor tira a peça da OS.'),
    );
    expect(bySku['ELE-0105']!.status, SyncStatus.conflict);
    expect(
      bySku['ELE-0105']!.lastSafeError,
      'Você deixou de ser o técnico desta OS; um supervisor vai decidir.',
    );

    expect((await h.line('ELE-0102')).syncStatus, SyncStatus.synced);
    expect((await h.line('ELE-0103')).syncStatus, SyncStatus.synced);
    expect((await h.line('ELE-0104')).syncStatus, SyncStatus.conflict);
    expect((await h.line('ELE-0105')).syncStatus, SyncStatus.conflict);
    expect((await h.line('ELE-0104')).quantity, 3);
  });

  test('RC4(4) conflict não entra na passada seguinte', () async {
    final api = CaptureInventoryBatchApi(
      (batch) => _decode(
        rejected: [for (final a in batch) _rejected(a, 'insufficient_balance')],
      ),
    );
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    final add = await h.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0102'),
    );

    await h.service.replayTenant(_tenant);
    final afterFirst = await h.stored(add.clientActionId);
    expect(afterFirst.status, SyncStatus.conflict);
    expect(
      afterFirst.lastSafeError,
      'Sem saldo suficiente desta peça no estoque usado no lançamento.',
    );
    final updatesAfterFirst = h.queue.updates.length;

    await h.service.replayTenant(_tenant);

    expect(api.capturedBatches, hasLength(1));
    expect(h.queue.updates.length, updatesAfterFirst);
    expect((await h.stored(add.clientActionId)).status, SyncStatus.conflict);
  });

  test('RC4(5) backend pendente não marca syncing nem gasta tentativa; 503 '
      'volta a pending sem custo', () async {
    final pendingApi = _H(const PendingBackendInventorySyncBatchApi());
    addTearDown(pendingApi.dispose);
    await pendingApi.saveOrder(_woReady, serverId: _woReadyServer);
    final a1 = await pendingApi.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0102'),
    );
    await pendingApi.service.replayTenant(_tenant);
    expect(pendingApi.queue.updates, isEmpty);
    final p1 = await pendingApi.stored(a1.clientActionId);
    expect(p1.status, SyncStatus.pending);
    expect(p1.retryCount, 0);

    final busyApi = CaptureInventoryBatchApi(
      (_) => throw const ApiServerError(statusCode: 503),
    );
    final busy = _H(busyApi);
    addTearDown(busy.dispose);
    await busy.saveOrder(_woReady, serverId: _woReadyServer);
    final a2 = await busy.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0102'),
    );
    await busy.service.replayTenant(_tenant);
    final b2 = await busy.stored(a2.clientActionId);
    expect(b2.status, SyncStatus.pending);
    expect(b2.retryCount, 0);
    expect(b2.lastErrorCode, inventorySyncBusyErrorCode);
  });

  test('RC4(6) S12: OS criada e confirmada sem serverId → conflict '
      'work_order_not_on_server, nada enviado, linha em conflito', () async {
    final api = CaptureInventoryBatchApi(_acceptAll);
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woOrphan);
    final create = await h.enqueue(WorkOrderSyncActionTypes.create, {
      'local_id': _woOrphan,
    });
    await h.queue.update(create.copyWith(status: SyncStatus.synced));
    await h.repo.addSelection(
      workOrderLocalId: _woOrphan,
      selection: const {'ELE-0102': 2},
      catalog: _catalog,
    );

    await h.service.replayTenant(_tenant);

    expect(api.capturedBatches, isEmpty);
    final add = (await h.materialActions()).single;
    expect(add.status, SyncStatus.conflict);
    expect(add.lastErrorCode, inventoryWorkOrderNotOnServerErrorCode);
    expect(add.lastSafeError, contains('não foi criada no servidor'));
    expect(add.lastSafeError, contains('Versão do gestor descarta a peça'));
    expect(h.queue.everSyncing(add.clientActionId), isFalse);
    final line = (await h.lines.loadMaterials(_woOrphan)).single;
    expect(line.syncStatus, SyncStatus.conflict);
  });

  test('RC4(7) 120 ações → 3 lotes de no máximo 50 (serviço e cliente '
      'HTTP)', () async {
    final api = CaptureInventoryBatchApi(_acceptAll);
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    final actions = <SyncAction>[
      for (var i = 0; i < 120; i++)
        await h.enqueue(InventorySyncActionTypes.materialAdd, {
          ..._addPayload(_woReady, 'SKU-$i'),
        }),
    ];

    await h.service.replayTenant(_tenant);

    expect(api.capturedBatches.map((b) => b.length).toList(), [50, 50, 20]);
    final synced = (await h.materialActions()).where(
      (a) => a.status == SyncStatus.synced,
    );
    expect(synced, hasLength(120));

    final adapter = _CountingAdapter();
    final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
      ..httpClientAdapter = adapter;
    final results = await DioInventorySyncBatchApi(dio).sendBatch(actions);
    expect(adapter.batchSizes, [50, 50, 20]);
    expect(adapter.paths.toSet(), {InventoryApiEndpoints.sync});
    expect(results, hasLength(120));
  });

  test('RC4(8) coordenador: material depois da OS e antes da vistoria; '
      'exceção no material não impede despesa', () async {
    final calls = <String>[];
    final container = _coordinatorContainer(calls);
    addTearDown(container.dispose);
    await _runPass(container);
    expect(calls, contains('material'));
    expect(calls.indexOf('work_order'), lessThan(calls.indexOf('material')));
    expect(calls.indexOf('material'), lessThan(calls.indexOf('checklist')));

    final failing = <String>[];
    final broken = _coordinatorContainer(failing, materialFails: true);
    addTearDown(broken.dispose);
    await _runPass(broken);
    expect(failing, containsAllInOrder(['material', 'checklist', 'expense']));
    expect(broken.read(autoSyncCoordinatorProvider).hasError, isFalse);
  });

  test('RC4(9) 401/403 no lote: todo material em conflito decidível, sem '
      'syncing nem tentativa na passada seguinte; operator_profile_required '
      'com o texto do cadastro', () async {
    var deny = true;
    final api = CaptureInventoryBatchApi((batch) {
      if (deny) throw const ApiUnauthorizedError();
      return _acceptAll(batch);
    });
    final h = _H(api);
    addTearDown(h.dispose);
    await h.saveOrder(_woReady, serverId: _woReadyServer);
    await h.repo.addSelection(
      workOrderLocalId: _woReady,
      selection: const {'ELE-0102': 1, 'ELE-0103': 1},
      catalog: _catalog,
    );

    await h.service.replayTenant(_tenant);
    final denied = await h.materialActions();
    expect(denied, hasLength(2));
    for (final a in denied) {
      expect(a.status, SyncStatus.conflict);
      expect(a.lastErrorCode, inventorySessionForbiddenErrorCode);
      expect(
        a.lastSafeError,
        'O servidor não aceitou o envio de material. Entre de novo no app '
        'ou peça ao administrador para ativar o estoque na sua organização.',
      );
      expect(a.retryCount, 0);
      expect(
        (await h.line(a.payload['sku']! as String)).syncStatus,
        SyncStatus.conflict,
      );
    }

    deny = false;
    final updatesBefore = h.queue.updates.length;
    await h.service.replayTenant(_tenant);
    expect(api.capturedBatches, hasLength(1));
    expect(h.queue.updates.length, updatesBefore);
    for (final a in await h.materialActions()) {
      expect(a.status, SyncStatus.conflict);
      expect(a.retryCount, 0);
    }

    final profileApi = CaptureInventoryBatchApi(
      (batch) => _decode(
        rejected: [
          for (final a in batch) _rejected(a, 'operator_profile_required'),
        ],
      ),
    );
    final p = _H(profileApi);
    addTearDown(p.dispose);
    await p.saveOrder(_woReady, serverId: _woReadyServer);
    final add = await p.enqueue(
      InventorySyncActionTypes.materialAdd,
      _addPayload(_woReady, 'ELE-0102'),
    );
    await p.service.replayTenant(_tenant);
    final refused = await p.stored(add.clientActionId);
    expect(refused.status, SyncStatus.conflict);
    expect(
      refused.lastSafeError,
      'Você não tem cadastro de profissional. Peça ao administrador da sua '
      'organização para cadastrar você.',
    );
  });
}

// ── RC4(7): cliente HTTP real com adaptador de contagem ───────────────────────

class _CountingAdapter implements HttpClientAdapter {
  final List<int> batchSizes = <int>[];
  final List<String> paths = <String>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    paths.add(options.path);
    final data = options.data as Map;
    final actions = (data['actions'] as List).cast<Map>();
    batchSizes.add(actions.length);
    return ResponseBody.fromString(
      jsonEncode({
        'data': {
          'accepted': [
            for (final a in actions)
              {'client_action_id': a['client_action_id'], 'result_ref': 'm'},
          ],
        },
      }),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

// ── RC4(8): coordenador com serviços que só registram a ordem ─────────────────

const _empty = SyncReplayResult(synced: [], failed: [], conflicts: []);

class _RecordingReclaim extends SyncQueueReclaimService {
  _RecordingReclaim(this.calls, SyncQueueRepository queue)
    : super(queue: queue, expenseChannelOff: () => true);

  final List<String> calls;

  @override
  Future<void> reclaimTenant(String tenantId) {
    calls.add('reclaim');
    return super.reclaimTenant(tenantId);
  }
}

class _RecordingFieldLocation extends FieldLocationSyncService {
  _RecordingFieldLocation(this.calls)
    : super(
        store: InMemoryFieldLocationStore(),
        api: const PendingFieldLocationApi(),
      );

  final List<String> calls;

  @override
  Future<FieldLocationSyncResult> syncTenant(String tenantId) {
    calls.add('field_location');
    return super.syncTenant(tenantId);
  }
}

class _RecordingTelemetry extends TelemetrySyncService {
  _RecordingTelemetry(this.calls)
    : super(
        store: InMemoryTelemetryLocalStore(),
        api: const PendingTelemetryApi(),
      );

  final List<String> calls;

  @override
  Future<TelemetryFlushSummary> flushTenant(String tenantId) {
    calls.add('telemetry');
    return super.flushTenant(tenantId);
  }
}

class _RecordingWorkOrderReplay extends WorkOrderSyncReplayService {
  _RecordingWorkOrderReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('work_order');
    return _empty;
  }
}

class _RecordingInventoryReplay extends InventorySyncReplayService {
  _RecordingInventoryReplay(
    this.calls,
    SyncQueueRepository queue, {
    required this.fail,
  }) : super(
         queue: queue,
         api: const PendingBackendInventorySyncBatchApi(),
         workOrders: InMemoryWorkOrderLocalStore(),
       );

  final List<String> calls;
  final bool fail;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('material');
    if (fail) throw const ApiNetworkError();
    return _empty;
  }
}

class _RecordingChecklistReplay extends ChecklistSyncReplayService {
  _RecordingChecklistReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('checklist');
    return _empty;
  }
}

class _RecordingEvidenceReplay extends EvidenceSyncReplayService {
  _RecordingEvidenceReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('evidence');
    return _empty;
  }
}

class _RecordingExpenseReplay extends SyncReplayService {
  _RecordingExpenseReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockExpenseSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('expense');
    return _empty;
  }
}

ProviderContainer _coordinatorContainer(
  List<String> calls, {
  bool materialFails = false,
}) {
  final queue = InMemorySyncQueueRepository();
  return ProviderContainer(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      syncQueueReclaimServiceProvider.overrideWithValue(
        _RecordingReclaim(calls, queue),
      ),
      fieldLocationSyncServiceProvider.overrideWithValue(
        _RecordingFieldLocation(calls),
      ),
      telemetrySyncServiceProvider.overrideWithValue(
        _RecordingTelemetry(calls),
      ),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _RecordingWorkOrderReplay(calls, queue),
      ),
      inventorySyncReplayServiceProvider.overrideWithValue(
        _RecordingInventoryReplay(calls, queue, fail: materialFails),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _RecordingChecklistReplay(calls, queue),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _RecordingEvidenceReplay(calls, queue),
      ),
      syncReplayServiceProvider.overrideWithValue(
        _RecordingExpenseReplay(calls, queue),
      ),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
    ],
  );
}

Future<void> _runPass(ProviderContainer container) async {
  await container.read(bootstrapSessionProvider.future);
  container.read(autoSyncCoordinatorProvider);
  await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();
}
