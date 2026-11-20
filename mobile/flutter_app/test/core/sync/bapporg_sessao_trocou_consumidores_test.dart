// B-APP-ORG (itens 69 e 70), B1 — os consumidores do erro "sessão trocou, não
// tentou" (Emenda 1 §A1.3; Emenda 1.2 D-F1-1: estes casos cobrem também a
// metade "a ação fica pendente" do T10b e do T10b-retry da F1).
//
// O arnês é comum: cada consumidor é o SERVIÇO REAL sobre a API Dio real,
// montada por `createAuthenticatedHttpClient` presa à sessão A
// (`u-a|org-a|n1`) e usada com a sessão viva B (`u-b|org-b|n2`). O adaptador
// conta os pedidos que de fato saíram. Onde o consumidor usa Drift, o Drift é
// real (`NativeDatabase.memory`). Cada item semeado tem `retryCount = 4`, uma
// tentativa antes do teto de 5: o descarte da telemetria e o corte da
// localização apareceriam se a tentativa contasse.
//
// Mutações literais que este arquivo pega (Emenda 1 §A1.4): M19 (C1 a C10),
// M20 (C1 a C6) e M21 a M30 (um Ck cada). C0, C0b e C11 ficam verdes em todas.
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_expense_local_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_models.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_api.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_store.dart';
import 'package:erp_techsolutions_mobile/core/location/location_consent_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_event.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_attachment_upload.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'org-a';
const _keyA = 'u-a|org-a|n1';
const _keyB = 'u-b|org-b|n2';

// ── O servidor de teste e o cliente real ─────────────────────────────────────

/// Conta os pedidos que de fato saíram do aparelho, com o `Authorization` do
/// momento do envio.
class _Server implements HttpClientAdapter {
  final List<String> paths = [];
  final List<String?> authSent = [];

  @override
  Future<ResponseBody> fetch(
    RequestOptions o,
    Stream<Uint8List>? s,
    Future<void>? c,
  ) async {
    paths.add(o.path);
    authSent.add(o.headers['Authorization'] as String?);
    return ResponseBody.fromString(
      jsonEncode({
        'data': {'results': <Object>[]},
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

/// A sessão viva lida pelo cliente a cada pedido.
class _Live {
  _Live(this.key, this.token);

  final String? key;
  final String? token;
}

/// O cliente de produção (`createAuthenticatedHttpClient` + o interceptador
/// real), preso à sessão A. Por padrão, a sessão viva é B.
Dio _client(_Server server, {_Live? live}) {
  final l = live ?? _Live(_keyB, 'tok-b');
  final dio = createAuthenticatedHttpClient(
    const ApiConfig(baseUrl: 'http://servidor-de-teste'),
    renew: (_, _) async => const SessionDead(),
    expire: (_) async {},
    currentAccessToken: () => l.token,
    currentEpoch: () => 1,
    boundSessionKey: _keyA,
    currentSessionKey: () => l.key,
  );
  dio.httpClientAdapter = server;
  return dio;
}

// ── Sementes ──────────────────────────────────────────────────────────────────

AppDatabase _db() {
  final db = AppDatabase(NativeDatabase.memory());
  addTearDown(db.close);
  return db;
}

SyncQueueRepository _queue(AppDatabase db) =>
    PersistentSyncQueueRepository(DriftSyncActionStore(db));

SyncAction _acao(String id, String type, Map<String, Object?> payload) =>
    SyncAction(
      clientActionId: id,
      tenantId: _tenant,
      userId: 'u-a',
      type: type,
      payload: payload,
      status: SyncStatus.pending,
      retryCount: 4,
      createdAt: DateTime.utc(2026, 11, 20, 10),
    );

WorkOrder _ordem(String localId, String serverId) => WorkOrder(
  localId: localId,
  serverId: serverId,
  tenantId: _tenant,
  code: 'OS-$localId',
  title: 'OS $localId',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 20),
);

/// "Não tentou": a ação volta a `pending`, a tentativa não conta e o motivo é
/// o da troca de sessão. Nunca `failed` nem `conflict`.
Future<void> _naoTentou(SyncQueueRepository queue, String id) async {
  final a = (await queue.actionsForTenant(
    _tenant,
  )).singleWhere((x) => x.clientActionId == id);
  expect(a.status, SyncStatus.pending, reason: '$id fica pendente');
  expect(a.retryCount, 4, reason: '$id: a tentativa não conta');
  expect(a.lastErrorCode, 'SESSION_CHANGED');
  expect(a.lastSafeError, kSessionChangedMessage);
}

void _semFalha(SyncReplayResult r) {
  expect(r.failed, isEmpty);
  expect(r.conflicts, isEmpty);
  expect(r.synced, isEmpty);
}

final _bytes = Uint8List.fromList(List<int>.filled(32, 7));

BootstrapSession _sessaoDespesa() => const BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org A'),
  user: AuthenticatedUser(
    userId: 'u-a',
    email: 'u-a@exemplo.com',
    tenantRole: 'field_technician',
    tenantRoles: ['field_technician'],
    scope: 'tenant',
  ),
  enabledModules: [],
  permissions: PermissionSet({
    'expense_report:create',
    'expense_report:read',
    'expense_report:update',
    'expense_report:submit',
  }),
  expensePolicy: ExpensePolicySnapshot(
    version: 'v1',
    categoryLimits: {'fuel': 150, 'meal': 80},
    receiptRequiredCategories: {'fuel'},
  ),
);

void main() {
  // ── C0, C0b: a vida normal não regride ─────────────────────────────────────

  test('[C0] chave igual à viva: o pedido sai (1 pedido)', () async {
    final db = _db();
    final queue = _queue(db);
    final server = _Server();
    await queue.enqueue(
      _acao('o-c0', WorkOrderSyncActionTypes.create, {
        'local_id': 'wo-c0',
        'title': 'OS c0',
      }),
    );

    await WorkOrderSyncReplayService(
      queue: queue,
      api: DioWorkOrderSyncBatchApi(
        _client(server, live: _Live(_keyA, 'tok-a')),
      ),
    ).replayTenant(_tenant);

    expect(server.paths, hasLength(1));
    expect(server.authSent.single, 'Bearer tok-a');
  });

  test('[C0b] sessão viva nula: o pedido sai sem Authorization', () async {
    final db = _db();
    final queue = _queue(db);
    final server = _Server();
    await queue.enqueue(
      _acao('o-c0b', WorkOrderSyncActionTypes.create, {
        'local_id': 'wo-c0b',
        'title': 'OS c0b',
      }),
    );

    await WorkOrderSyncReplayService(
      queue: queue,
      api: DioWorkOrderSyncBatchApi(_client(server, live: _Live(null, null))),
    ).replayTenant(_tenant);

    expect(server.paths, hasLength(1));
    expect(server.authSent.single, isNull);
  });

  // ── C1 a C5: os lotes da fila ──────────────────────────────────────────────

  test(
    '[C1] despesa: 0 pedido; a ação fica pendente sem gastar tentativa',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      await queue.enqueue(
        _acao('d-1', ExpenseSyncActionTypes.reportCreate, {
          'local_id': 'rel-1',
          'title': 'Despesa 1',
        }),
      );

      final r = await SyncReplayService(
        queue: queue,
        api: DioExpenseSyncBatchApi(_client(server)),
        supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
      ).replayTenant(_tenant);

      expect(server.paths, isEmpty);
      _semFalha(r);
      await _naoTentou(queue, 'd-1');
    },
  );

  test(
    '[C2] OS: 0 pedido; a ação fica pendente sem gastar tentativa',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      await queue.enqueue(
        _acao('o-1', WorkOrderSyncActionTypes.create, {
          'local_id': 'wo-1',
          'title': 'OS 1',
        }),
      );

      final r = await WorkOrderSyncReplayService(
        queue: queue,
        api: DioWorkOrderSyncBatchApi(_client(server)),
      ).replayTenant(_tenant);

      expect(server.paths, isEmpty);
      _semFalha(r);
      await _naoTentou(queue, 'o-1');
    },
  );

  test(
    '[C3] checklist: 0 pedido; a ação fica pendente sem gastar tentativa',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      await queue.enqueue(
        _acao('c-1', ChecklistSyncActionTypes.answerUpsert, {
          'server_run_id': 'run-srv-1',
          'item_key': 'pneus',
          'value': 'ok',
        }),
      );

      final r = await ChecklistSyncReplayService(
        queue: queue,
        api: DioChecklistSyncBatchApi(_client(server)),
        supportedActionTypes: backendChecklistActionTypes,
        extraEligibility: checklistActionReadyForBackend,
      ).replayTenant(_tenant);

      expect(server.paths, isEmpty);
      _semFalha(r);
      await _naoTentou(queue, 'c-1');
    },
  );

  test(
    '[C4] evidência: 0 pedido; pendente sem gastar tentativa; o atualizador não roda',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      final atualizacoes = <String>[];
      await queue.enqueue(
        _acao('e-1', EvidenceSyncActionTypes.workOrderObservation, {
          'work_order_id': 'srv-wo-1',
          'local_evidence_id': 'ev-1',
          'note': 'observação',
        }),
      );

      final r = await EvidenceSyncReplayService(
        queue: queue,
        api: DioEvidenceSyncBatchApi(_client(server)),
        entityUpdater: (action, result, status) async =>
            atualizacoes.add(action.clientActionId),
      ).replayTenant(_tenant);

      expect(server.paths, isEmpty);
      _semFalha(r);
      expect(atualizacoes, isEmpty);
      await _naoTentou(queue, 'e-1');
    },
  );

  test(
    '[C5] estoque: 0 pedido; a ação fica pendente sem gastar tentativa',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      final orders = DriftWorkOrderLocalStore(db);
      await orders.saveWorkOrder(_ordem('wo-pronta', 'srv-wo-pronta'));
      await queue.enqueue(
        _acao('m-1', InventorySyncActionTypes.materialAdd, {
          'work_order_local_id': 'wo-pronta',
          'material_local_id': 'mat-1',
          'sku': 'SKU-1',
          'quantity': 1,
        }),
      );

      final r = await InventorySyncReplayService(
        queue: queue,
        api: DioInventorySyncBatchApi(_client(server)),
        workOrders: orders,
      ).replayTenant(_tenant);

      expect(server.paths, isEmpty);
      _semFalha(r);
      await _naoTentou(queue, 'm-1');
    },
  );

  // ── C6: o comprovante ──────────────────────────────────────────────────────

  test(
    '[C6] comprovante: 0 pedido; pendente sem gastar tentativa; o recibo fica pendente e nada vai a busy',
    () async {
      final db = _db();
      final queue = _queue(db);
      final server = _Server();
      final blobStore = InMemoryEvidenceBlobStore();
      final repository = LocalExpenseRepository(
        session: _sessaoDespesa(),
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: DriftExpenseLocalStore(db),
        blobStore: blobStore,
      );
      final created = await repository.createReport(
        title: 'Viagem',
        advanceAmount: 0,
      );
      final reportLocalId = created.report.localId;
      final item = await repository.addItem(
        reportId: reportLocalId,
        categoryId: 'fuel',
        amount: 50,
        city: 'Campinas',
        vendorName: 'Posto',
      );
      final itemLocalId = item.report.items.last.localId;
      final action = await repository.attachReceiptPlaceholder(
        reportLocalId: reportLocalId,
        itemLocalId: itemLocalId,
        fileName: 'nota.jpg',
        mimeType: 'image/jpeg',
        bytes: _bytes,
        sha256: 'a' * 64,
      );
      await queue.update(action!.copyWith(retryCount: 4));
      await repository.markReportSynced(reportLocalId, 'report-server-1');
      await repository.markItemSynced(
        reportLocalId,
        itemLocalId,
        'item-server-1',
      );
      final blobRef = repository
          .receiptsForItem(reportLocalId, itemLocalId)
          .single
          .localReference!;

      final r = await ExpenseReceiptSyncService(
        queue: queue,
        repository: repository,
        blobStore: blobStore,
        api: DioExpenseReceiptUploadApi(_client(server)),
      ).uploadTenant(_tenant);

      expect(server.paths, isEmpty);
      expect(r.busy, isEmpty);
      expect(r.failed, isEmpty);
      expect(r.conflicts, isEmpty);
      expect(r.uploaded, isEmpty);
      await _naoTentou(queue, action.clientActionId);
      expect(
        repository
            .receiptsForItem(reportLocalId, itemLocalId)
            .single
            .uploadStatus,
        ReceiptUploadStatus.pending,
      );
      expect(await blobStore.load(blobRef), isNotNull);
    },
  );

  // ── C7, C8: telemetria e posição ───────────────────────────────────────────

  test(
    '[C7] telemetria: 0 pedido; o evento continua guardado, igual ao de antes',
    () async {
      final db = _db();
      final server = _Server();
      final store = DriftTelemetryLocalStore(db);
      final evento = TelemetryEvent(
        localId: 'tel-1',
        tenantId: _tenant,
        clientActionId: 'tel-cid-1',
        eventType: TelemetryEventType.heartbeat,
        capturedAt: DateTime.utc(2026, 11, 20, 10),
        syncStatus: SyncStatus.pending,
        retryCount: 4,
        createdAt: DateTime.utc(2026, 11, 20, 10),
        latitude: -23.5,
        longitude: -46.6,
      );
      await store.save(evento);

      final r = await TelemetrySyncService(
        store: store,
        api: DioTelemetryApi(_client(server)),
      ).flushTenant(_tenant);

      expect(server.paths, isEmpty);
      expect(r.failed, 0);
      expect(r.purged, 0);
      final guardado = (await store.eventsForTenant(_tenant)).single;
      expect(guardado.localId, 'tel-1');
      expect(guardado.retryCount, 4);
      expect(guardado.syncStatus, SyncStatus.pending);
      expect(guardado.lastErrorCode, isNull);
    },
  );

  test('[C8] posição: 0 pedido; a posição continua guardada, igual', () async {
    final db = _db();
    final server = _Server();
    final store = DriftFieldLocationStore(db);
    await store.save(
      FieldLocationEvent(
        localId: 'pos-1',
        tenantId: _tenant,
        workOrderLocalId: 'wo-1',
        latitude: -23.5,
        longitude: -46.6,
        recordedAt: DateTime.utc(2026, 11, 20, 10),
        syncStatus: SyncStatus.pending,
        retryCount: 4,
        createdAt: DateTime.utc(2026, 11, 20, 10),
      ),
    );

    final r = await FieldLocationSyncService(
      store: store,
      api: DioFieldLocationApi(_client(server)),
    ).syncTenant(_tenant);

    expect(server.paths, isEmpty);
    expect(r.failed, isEmpty);
    expect(r.synced, isEmpty);
    final guardada = (await store.eventsForTenant(_tenant)).single;
    expect(guardada.localId, 'pos-1');
    expect(guardada.retryCount, 4);
    expect(guardada.syncStatus, SyncStatus.pending);
    expect(guardada.lastErrorCode, isNull);
  });

  // ── C9, C10: os binários ───────────────────────────────────────────────────

  test(
    '[C9] foto da OS: 0 pedido; o uploadStatus fica igual e o blob fica',
    () async {
      final db = _db();
      final server = _Server();
      final store = DriftWorkOrderLocalStore(db);
      final blobStore = InMemoryEvidenceBlobStore();
      await store.saveWorkOrder(_ordem('wo-1', 'srv-wo-1'));
      final blobRef = await blobStore.save(_bytes, contentType: 'image/jpeg');
      await store.saveEvidence(
        WorkOrderEvidence(
          localId: 'ev-1',
          workOrderLocalId: 'wo-1',
          tenantId: _tenant,
          fileName: 'foto.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: _bytes.length,
          captureSource: 'camera',
          syncStatus: SyncStatus.synced,
          createdAt: DateTime.utc(2026, 11, 20, 10),
          checksum: 'a' * 64,
          serverId: 'srv-ev-1',
          uploadStatus: SyncStatus.pending,
          localBlobRef: blobRef,
        ),
      );

      final r = await EvidenceBinaryUploadService(
        store: store,
        blobStore: blobStore,
        api: DioEvidenceUploadApi(_client(server)),
      ).uploadTenant(_tenant);

      expect(server.paths, isEmpty);
      expect(r.failed, isEmpty);
      expect(r.conflicts, isEmpty);
      expect(r.uploaded, isEmpty);
      final depois = (await store.findEvidence('ev-1'))!;
      expect(depois.uploadStatus, SyncStatus.pending);
      expect(depois.uploadErrorCode, isNull);
      expect(await blobStore.load(blobRef), isNotNull);
    },
  );

  test(
    '[C10] anexo do checklist: 0 pedido; o uploadStatus fica igual e o blob fica',
    () async {
      final db = _db();
      final server = _Server();
      final store = DriftChecklistLocalStore(db);
      final blobStore = InMemoryEvidenceBlobStore();
      await store.saveRun(
        MobileChecklistRun(
          localId: 'run-1',
          tenantId: _tenant,
          checklistId: 'cl-1',
          workOrderId: 'srv-wo-1',
          schemaVersion: '1',
          status: MobileChecklistRunStatus.inProgress,
          executedByUserId: 'u-a',
          startedAt: DateTime.utc(2026, 11, 20, 9),
          syncStatus: SyncStatus.synced,
          answers: const {},
          serverId: 'run-srv-1',
        ),
      );
      final blobRef = await blobStore.save(_bytes, contentType: 'image/jpeg');
      await store.saveAttachment(
        MobileChecklistAttachmentMetadata(
          localId: 'att-1',
          runId: 'run-1',
          fieldId: 'foto_frente',
          fileName: 'frente.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: _bytes.length,
          syncStatus: SyncStatus.synced,
          localBlobRef: blobRef,
          uploadStatus: SyncStatus.pending,
        ),
      );

      final r = await ChecklistAttachmentUploadService(
        store: store,
        blobStore: blobStore,
        api: DioChecklistAttachmentUploadApi(_client(server)),
      ).uploadTenant(_tenant);

      expect(server.paths, isEmpty);
      expect(r.failed, isEmpty);
      expect(r.conflicts, isEmpty);
      expect(r.uploaded, isEmpty);
      final depois = (await store.loadAttachments(
        'run-1',
        'foto_frente',
      )).single;
      expect(depois.uploadStatus, SyncStatus.pending);
      expect(depois.uploadErrorCode, isNull);
      expect(await blobStore.load(blobRef), isNotNull);
    },
  );

  // ── C11: o controle ────────────────────────────────────────────────────────

  test(
    '[C11] consentimento (controle): 0 pedido e nenhum estado mudado',
    () async {
      const owner = LocationConsentOwner(tenantId: _tenant, userId: 'u-a');
      final consentStore = InMemoryLocationConsentStore(
        ownerResolver: () => owner,
      );
      await consentStore.acceptManualCapture();
      final antes = await consentStore.pendingDecisionFor(owner);
      final statusAntes = await consentStore.status();
      final server = _Server();
      final db = _db();
      final sync = LocationConsentSync(
        store: consentStore,
        currentOwner: () => owner,
        api: () => DioLocationConsentApi(_client(server)),
        fieldLocationStore: () => DriftFieldLocationStore(db),
        telemetryStore: () => DriftTelemetryLocalStore(db),
      );

      final ok = await sync.settleDecision(_tenant);

      expect(server.paths, isEmpty);
      expect(ok, isFalse);
      final depois = await consentStore.pendingDecisionFor(owner);
      expect(antes, isNotNull);
      expect(depois?.clientActionId, antes!.clientActionId);
      final statusDepois = await consentStore.status();
      expect(statusDepois.granted, statusAntes.granted);
      expect(statusDepois.serverState, statusAntes.serverState);
      expect(statusDepois.needsReconfirm, statusAntes.needsReconfirm);
    },
  );

  // ── G-A1: a guarda de fiação ───────────────────────────────────────────────

  test(
    '[G-A1] todo arquivo de lib/ que gasta tentativa ou marca falha trata a troca de sessão',
    () {
      // Avisa, não prova: quem prova o comportamento são os C1 a C10.
      final marca = RegExp(
        r'retryCount: [a-z]+\.retryCount \+ 1|_markFailed\(|retryCount: nextRetry|uploadStatus: SyncStatus\.failed',
      );
      const excecoes = {'core/sync/sync_engine.dart'};
      final semRamo = <String>[];
      final comMarca = <String>[];
      for (final f in Directory('lib').listSync(recursive: true)) {
        if (f is! File || !f.path.endsWith('.dart')) continue;
        final rel = f.path
            .replaceAll(r'\', '/')
            .replaceFirst(RegExp(r'^lib/'), '');
        final src = f.readAsStringSync();
        if (!marca.hasMatch(src)) continue;
        comMarca.add(rel);
        if (excecoes.contains(rel)) continue;
        if (!src.contains('ApiSessionChangedError')) semRamo.add(rel);
      }
      expect(comMarca, isNotEmpty, reason: 'a guarda precisa casar algo');
      expect(
        comMarca,
        containsAll(excecoes),
        reason: 'a exceção existe e casa',
      );
      expect(
        semRamo,
        isEmpty,
        reason: 'consumidor com contador e sem o ramo da troca de sessão',
      );
    },
  );
}
