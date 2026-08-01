import 'dart:typed_data';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_attachment_upload.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_comparison.dart';
import 'package:erp_techsolutions_mobile/features/checklists/domain/checklist_models.dart';
import 'package:erp_techsolutions_mobile/features/checklists/ui/checklist_run_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

// ===========================================================================
// PR-B — Correções dos achados reais da junta (APROVADO_CONDICIONADO):
//  2) marker sem component_id não pode enfileirar ação que o backend rejeita
//  3) acknowledgement: ordem do lote + has_divergence real + conflito não-terminal
//  4) auto-sync baixa a run das ações offline pendentes sem serverId
//  5) foto: só apaga o blob quando status == 'stored' (§B-108)
//  6c) widget test de fumaça do AwaitingDispatchView (acentuação PT-BR)
// ===========================================================================

final _tenant = devBootstrapSession.activeTenant.tenantId;

const _template = MobileChecklistTemplate(
  id: 'cl-1',
  tenantId: 'ignored',
  title: 'Vistoria',
  isRequired: false,
  schemaVersion: 'v1',
  status: 'active',
);

const _schema = MobileChecklistSchema(
  id: 'schema-1',
  checklistId: 'cl-1',
  version: 'v1',
  title: 'Vistoria',
  fields: [],
);

class _FakeRemoteApi implements ChecklistRemoteApi {
  List<RemoteChecklistRun> runs = const [];
  bool throwOnFetch = false;

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    if (throwOnFetch) throw const ApiNetworkError();
    return runs;
  }

  @override
  Future<List<MobileChecklistTemplate>> fetchAvailableChecklists({
    required String tenantId,
    String? workOrderId,
  }) async => const [];

  @override
  Future<MobileChecklistSchema> fetchChecklistRender(String checklistId) =>
      Future.value(_schema);

  @override
  Future<String> createRun({
    required String checklistId,
    required String workOrderId,
    required String tenantId,
    required String userId,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> patchRun({
    required String runId,
    required Map<String, Object?> answers,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> completeRun(String runId) =>
      Future.error(const ApiNetworkError());

  @override
  Future<void> createMarker({
    required String runId,
    required String type,
    String? label,
    String? description,
    String? positionLabel,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> createDivergence({
    required String runId,
    required String description,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> acknowledge({
    required String runId,
    required String acknowledgedByName,
    required String acknowledgedByRole,
  }) => Future.error(const ApiNetworkError());

  @override
  Future<void> attachMetadata({
    required String runId,
    required String fieldId,
    required String fileName,
    required String mimeType,
    required int sizeBytes,
    String? checksum,
  }) => Future.error(const ApiNetworkError());
}

class _StatusUploadApi implements ChecklistAttachmentUploadApi {
  _StatusUploadApi(this.status);

  final String status;
  ChecklistAttachmentUploadRequest? captured;

  @override
  Future<ChecklistAttachmentUploadResponse> upload(
    ChecklistAttachmentUploadRequest request,
  ) async {
    captured = request;
    return ChecklistAttachmentUploadResponse(
      attachmentId: 'srv-att-1',
      status: status,
    );
  }
}

ChecklistRepository _repo({
  required InMemoryChecklistLocalStore store,
  required SyncQueueRepository queue,
  required ChecklistRemoteApi remote,
  EvidenceBlobStore? blobStore,
}) => ChecklistRepository(
  session: devBootstrapSession,
  syncQueue: queue,
  actionFactory: SyncActionFactory(),
  localStore: store,
  remoteApi: remote,
  blobStore: blobStore,
);

InMemoryChecklistLocalStore _store() =>
    InMemoryChecklistLocalStore(templates: [_template], schemas: [_schema]);

MobileChecklistRun _localRun({required String localId, String? serverId}) =>
    MobileChecklistRun(
      localId: localId,
      serverId: serverId,
      tenantId: _tenant,
      checklistId: 'cl-1',
      workOrderId: 'wo-1',
      schemaVersion: 'v1',
      status: MobileChecklistRunStatus.inProgress,
      executedByUserId: 'u-1',
      startedAt: DateTime.utc(2026, 8, 1),
      syncStatus: SyncStatus.pending,
      answers: const {},
    );

SyncAction _action({
  required String id,
  required String type,
  required Map<String, Object?> payload,
  required DateTime createdAt,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  type: type,
  payload: payload,
  status: SyncStatus.pending,
  createdAt: createdAt,
);

void main() {
  // ── 2. Marker fail-safe (component_id obrigatório) ───────────────────────
  group('2. addMarker exige component_id (não enfileira ação rejeitável)', () {
    test('sem fieldId → lança e NÃO enfileira marker_create', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      await store.saveRun(
        _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
      );
      final repo = _repo(store: store, queue: queue, remote: _FakeRemoteApi());

      await expectLater(
        repo.addMarker(runId: 'clrun-c_1', type: 'damage'),
        throwsA(isA<ArgumentError>()),
      );

      final actions = await queue.actionsForTenant(_tenant);
      expect(
        actions.where((a) => a.type == ChecklistSyncActionTypes.markerCreate),
        isEmpty,
      );
    });

    test(
      'com fieldId → enfileira com component_id (field_id) no payload',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        await store.saveRun(
          _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
        );
        final repo = _repo(
          store: store,
          queue: queue,
          remote: _FakeRemoteApi(),
        );

        await repo.addMarker(
          runId: 'clrun-c_1',
          type: 'damage',
          fieldId: 'f-damage',
          label: 'Arranhao',
        );

        final marker = (await queue.actionsForTenant(_tenant)).single;
        expect(marker.type, ChecklistSyncActionTypes.markerCreate);
        expect(marker.payload['field_id'], 'f-damage');
      },
    );
  });

  // ── 3. Acknowledgement: ordem + has_divergence + não-terminal ────────────
  group('3. acknowledgement — ordem, has_divergence e conflito não-terminal', () {
    test('3a. lote é enviado em ordem divergence → ack → complete', () async {
      final queue = InMemorySyncQueueRepository();
      // Inserção EMBARALHADA (complete antes) mas created_at reflete a sequência
      // real. O replay deve reordenar por created_at.
      await queue.enqueue(
        _action(
          id: 'a-complete',
          type: ChecklistSyncActionTypes.runComplete,
          payload: const {
            'local_run_id': 'clrun-e_1',
            'server_run_id': 'srv-1',
          },
          createdAt: DateTime.utc(2026, 8, 1, 10, 0, 3),
        ),
      );
      await queue.enqueue(
        _action(
          id: 'a-divergence',
          type: ChecklistSyncActionTypes.divergenceCreate,
          payload: const {
            'local_run_id': 'clrun-e_1',
            'server_run_id': 'srv-1',
            'component_id': 'f-cond',
            'observation': 'x',
          },
          createdAt: DateTime.utc(2026, 8, 1, 10, 0, 1),
        ),
      );
      await queue.enqueue(
        _action(
          id: 'a-ack',
          type: ChecklistSyncActionTypes.acknowledgementCreate,
          payload: const {
            'local_run_id': 'clrun-e_1',
            'server_run_id': 'srv-1',
            'message': 'Ciencia',
          },
          createdAt: DateTime.utc(2026, 8, 1, 10, 0, 2),
        ),
      );

      final api = CaptureChecklistBatchApi(
        (batch) => [
          for (final a in batch)
            SyncActionResult(
              clientActionId: a.clientActionId,
              status: 'processed',
            ),
        ],
      );
      await ChecklistSyncReplayService(
        queue: queue,
        api: api,
      ).replayTenant(_tenant);

      final order = api.captured!.map((a) => a.type).toList();
      expect(order, [
        ChecklistSyncActionTypes.divergenceCreate,
        ChecklistSyncActionTypes.acknowledgementCreate,
        ChecklistSyncActionTypes.runComplete,
      ]);
    });

    test(
      '3c. 409 ACKNOWLEDGEMENT_NOT_REQUIRED → failed (re-tenta), não conflito terminal',
      () async {
        final queue = InMemorySyncQueueRepository();
        await queue.enqueue(
          _action(
            id: 'a-ack',
            type: ChecklistSyncActionTypes.acknowledgementCreate,
            payload: const {
              'local_run_id': 'clrun-e_1',
              'server_run_id': 'srv-1',
            },
            createdAt: DateTime.utc(2026, 8, 1),
          ),
        );

        final api = MockChecklistSyncBatchApi(
          results: const [
            SyncActionResult(
              clientActionId: 'a-ack',
              status: 'conflict',
              errorCode: 'acknowledgement_not_required',
            ),
          ],
        );
        final result = await ChecklistSyncReplayService(
          queue: queue,
          api: api,
        ).replayTenant(_tenant);

        // NÃO é conflito terminal: vira failed (retryável).
        expect(result.conflicts, isEmpty);
        expect(result.failed, hasLength(1));

        final action = (await queue.actionsForTenant(_tenant)).single;
        expect(action.status, SyncStatus.failed);
        expect(action.retryCount, 1);
        expect(action.lastErrorCode, 'acknowledgement_not_required');

        // Continua elegível para nova tentativa (não some do replay).
        final pending = await queue.pendingForTenant(_tenant);
        expect(pending.map((a) => a.clientActionId), contains('a-ack'));
      },
    );

    test(
      '3b. completeRun reporta has_divergence REAL (true com divergência)',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        await store.saveRun(
          _localRun(localId: 'clrun-e_1', serverId: 'srv-run-1'),
        );
        final repo = _repo(
          store: store,
          queue: queue,
          remote: _FakeRemoteApi(),
        );

        await repo.recordDivergences(
          runId: 'clrun-e_1',
          divergences: const [
            ChecklistDivergence(
              fieldId: 'f-cond',
              label: 'Condicao',
              collectionValue: 'ok',
              deliveryValue: 'dano',
            ),
          ],
        );
        await repo.completeRun(runId: 'clrun-e_1', schema: _schema);

        final complete = (await queue.actionsForTenant(
          _tenant,
        )).firstWhere((a) => a.type == ChecklistSyncActionTypes.runComplete);
        expect(complete.payload['has_divergence'], true);

        // E o codec propaga o has_divergence real (não força false).
        final encoded = const ChecklistSyncCodec().encodeRequest([complete]);
        final payload = Map<String, Object?>.from(
          (encoded['actions'] as List).single['payload'] as Map,
        );
        expect(payload['has_divergence'], true);
      },
    );

    test('3b. completeRun sem divergência → has_divergence false', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      await store.saveRun(
        _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
      );
      final repo = _repo(store: store, queue: queue, remote: _FakeRemoteApi());

      await repo.completeRun(runId: 'clrun-c_1', schema: _schema);

      final complete = (await queue.actionsForTenant(_tenant)).single;
      expect(complete.payload['has_divergence'], false);
    });
  });

  // ── 4. Auto-sync baixa a run das ações offline pendentes ─────────────────
  group('4. downloadPendingRuns religa o download antes do replay', () {
    test(
      'run offline sem serverId + ação pendente → baixa e carimba',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        // Run iniciada 100% offline (serverId nulo) + uma resposta enfileirada.
        await store.saveRun(_localRun(localId: 'clrun-c_1'));
        final remote = _FakeRemoteApi(); // offline no início
        final repo = _repo(store: store, queue: queue, remote: remote);

        await repo.saveAnswer(
          runId: 'clrun-c_1',
          answer: MobileChecklistAnswer(
            fieldId: 'f-1',
            textValue: 'ok',
            answeredAt: DateTime.utc(2026, 8, 1),
          ),
        );
        final before = (await queue.actionsForTenant(_tenant)).single;
        expect(before.payload.containsKey('server_run_id'), isFalse);

        // Volta a cobertura: o backend passa a devolver a run pré-criada.
        remote.runs = const [
          RemoteChecklistRun(id: 'srv-run-1', checklistId: 'cl-1'),
        ];
        await repo.downloadPendingRuns();

        final run = (await store.loadRunsForWorkOrder('wo-1')).single;
        expect(run.serverId, 'srv-run-1');

        final after = (await queue.actionsForTenant(_tenant)).single;
        expect(after.payload['server_run_id'], 'srv-run-1');
      },
    );

    test('run já com serverId não re-baixa (no-op)', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      await store.saveRun(
        _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
      );
      final repo = _repo(store: store, queue: queue, remote: _FakeRemoteApi());
      await repo.saveAnswer(
        runId: 'clrun-c_1',
        answer: MobileChecklistAnswer(
          fieldId: 'f-1',
          textValue: 'ok',
          answeredAt: DateTime.utc(2026, 8, 1),
        ),
      );

      await repo.downloadPendingRuns();

      final run = (await store.loadRunsForWorkOrder('wo-1')).single;
      expect(run.serverId, 'srv-run-1'); // inalterado
    });
  });

  // ── 5. Foto: só apaga o blob quando stored (§B-108) ──────────────────────
  group('5. blob preservado quando status != stored', () {
    test('scan_failed → preserva blob + ref, uploadStatus failed', () async {
      final store = _store();
      final blobStore = InMemoryEvidenceBlobStore();
      await store.saveRun(
        _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
      );
      final repo = _repo(
        store: store,
        queue: InMemorySyncQueueRepository(),
        remote: _FakeRemoteApi(),
        blobStore: blobStore,
      );
      await repo.addAttachment(
        runId: 'clrun-c_1',
        fieldId: 'f-photo',
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        bytes: Uint8List.fromList([5, 5, 5]),
      );
      final blobRef =
          (await store.loadAttachmentsPendingUpload()).single.localBlobRef!;

      final result = await ChecklistAttachmentUploadService(
        store: store,
        blobStore: blobStore,
        api: _StatusUploadApi('scan_failed'),
      ).uploadTenant(_tenant);

      expect(result.uploaded, isEmpty);
      expect(result.failed, hasLength(1));
      // Blob NÃO apagado e ref preservada.
      expect(await blobStore.load(blobRef), isNotNull);
      final saved = await store.loadAttachments('clrun-c_1', 'f-photo');
      expect(saved.single.localBlobRef, blobRef);
      expect(saved.single.uploadStatus, SyncStatus.failed);
      expect(saved.single.uploadErrorCode, 'SCAN_FAILED');
    });

    test(
      'pending_review → preserva blob, uploadStatus pending (re-tenta)',
      () async {
        final store = _store();
        final blobStore = InMemoryEvidenceBlobStore();
        await store.saveRun(
          _localRun(localId: 'clrun-c_1', serverId: 'srv-run-1'),
        );
        final repo = _repo(
          store: store,
          queue: InMemorySyncQueueRepository(),
          remote: _FakeRemoteApi(),
          blobStore: blobStore,
        );
        await repo.addAttachment(
          runId: 'clrun-c_1',
          fieldId: 'f-photo',
          fileName: 'foto.jpg',
          mimeType: 'image/jpeg',
          bytes: Uint8List.fromList([7, 7]),
        );
        final blobRef =
            (await store.loadAttachmentsPendingUpload()).single.localBlobRef!;

        await ChecklistAttachmentUploadService(
          store: store,
          blobStore: blobStore,
          api: _StatusUploadApi('pending_review'),
        ).uploadTenant(_tenant);

        expect(await blobStore.load(blobRef), isNotNull);
        // pending → continua na fila de upload (nada perdido).
        expect(await store.loadAttachmentsPendingUpload(), hasLength(1));
      },
    );
  });

  // ── 6c. Widget test de fumaça do AwaitingDispatchView ────────────────────
  group('6c. AwaitingDispatchView', () {
    testWidgets('mostra copy acentuada e Atualizar dispara onRetry', (
      tester,
    ) async {
      var retried = 0;
      final router = GoRouter(
        initialLocation: '/',
        routes: [
          GoRoute(
            path: '/',
            builder: (_, _) => AwaitingDispatchView(
              title: 'Vistoria',
              kind: MobileChecklistRunKind.collection,
              onBack: () {},
              onRetry: () => retried++,
            ),
          ),
        ],
      );
      await tester.pumpWidget(
        ProviderScope(child: MaterialApp.router(routerConfig: router)),
      );
      await tester.pumpAndSettle();

      expect(find.text('Aguardando despacho do checklist'), findsOneWidget);
      // Acentuação PT-BR correta (§11): serviço/não/você.
      expect(find.textContaining('serviço'), findsOneWidget);

      await tester.tap(find.widgetWithText(FilledButton, 'Atualizar'));
      await tester.pump();
      expect(retried, 1);
    });
  });
}
