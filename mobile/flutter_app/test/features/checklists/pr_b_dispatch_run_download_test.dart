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
import 'package:flutter_test/flutter_test.dart';

// ===========================================================================
// PR-B — Lado Flutter do conserto de data-loss de checklist.
// D-CHK-DISPATCH-CREATE: o despacho CRIA a run, o guincheiro BAIXA e responde.
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

// Fake remoto configurável: devolve a(s) run(s) pré-criada(s) ou lança (offline).
class _FakeRemoteApi implements ChecklistRemoteApi {
  _FakeRemoteApi({this.runs = const [], this.throwOnFetch = false});

  List<RemoteChecklistRun> runs;
  bool throwOnFetch;
  final List<String> fetchedWorkOrderIds = [];
  String? lastChecklistId;

  @override
  Future<List<RemoteChecklistRun>> fetchRunsForWorkOrder(
    String workOrderId, {
    String? checklistId,
  }) async {
    fetchedWorkOrderIds.add(workOrderId);
    lastChecklistId = checklistId;
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

class _CaptureUploadApi implements ChecklistAttachmentUploadApi {
  ChecklistAttachmentUploadRequest? captured;

  @override
  Future<ChecklistAttachmentUploadResponse> upload(
    ChecklistAttachmentUploadRequest request,
  ) async {
    captured = request;
    return ChecklistAttachmentUploadResponse(
      attachmentId: 'srv-att-${request.componentId}',
      status: 'stored',
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

SyncAction _action({
  required String type,
  required Map<String, Object?> payload,
  String id = 'a-1',
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  type: type,
  payload: payload,
  status: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 8, 1),
);

Map<String, Object?> _encode(SyncAction action) {
  final request = const ChecklistSyncCodec().encodeRequest([action]);
  return Map<String, Object?>.from((request['actions'] as List).single as Map);
}

MobileChecklistRun _localRun({
  required String localId,
  String? serverId,
  String tenantId = 'unset',
}) => MobileChecklistRun(
  localId: localId,
  serverId: serverId,
  tenantId: tenantId == 'unset' ? _tenant : tenantId,
  checklistId: 'cl-1',
  workOrderId: 'wo-1',
  schemaVersion: 'v1',
  status: MobileChecklistRunStatus.inProgress,
  executedByUserId: 'u-1',
  startedAt: DateTime.utc(2026, 8, 1),
  syncStatus: SyncStatus.pending,
  answers: const {},
);

void main() {
  // ── 1. Download da run pré-criada ────────────────────────────────────────
  group('resolveRunForWorkOrder — baixa a run do despacho', () {
    test('1. grava serverId e NÃO enfileira runCreate', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      final remote = _FakeRemoteApi(
        runs: const [
          RemoteChecklistRun(
            id: 'srv-run-1',
            checklistId: 'cl-1',
            status: 'in_progress',
          ),
        ],
      );
      final repo = _repo(store: store, queue: queue, remote: remote);

      final res = await repo.resolveRunForWorkOrder(
        checklistId: 'cl-1',
        workOrderId: 'wo-1',
        schemaVersion: 'v1',
      );

      expect(res.isReady, isTrue);
      expect(res.run!.serverId, 'srv-run-1');

      // serverId persistido no store local (Drift/in-memory).
      final saved = await store.loadRunsForWorkOrder('wo-1');
      expect(saved.single.serverId, 'srv-run-1');

      // Nenhum runCreate enfileirado (o guincheiro não cria).
      final actions = await queue.actionsForTenant(_tenant);
      expect(
        actions.where((a) => a.type == ChecklistSyncActionTypes.runCreate),
        isEmpty,
      );
    });

    test(
      '2. lista vazia => aguardando despacho (sem run local, sem runCreate)',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        final repo = _repo(
          store: store,
          queue: queue,
          remote: _FakeRemoteApi(runs: const []),
        );

        final res = await repo.resolveRunForWorkOrder(
          checklistId: 'cl-1',
          workOrderId: 'wo-1',
          schemaVersion: 'v1',
        );

        expect(res.isAwaitingDispatch, isTrue);
        expect(res.run, isNull);
        expect(await store.loadRunsForWorkOrder('wo-1'), isEmpty);
        expect(await queue.actionsForTenant(_tenant), isEmpty);
      },
    );

    test('3. desambigua por checklistId quando há >1 run', () async {
      final store = _store();
      final queue = InMemorySyncQueueRepository();
      final remote = _FakeRemoteApi(
        runs: const [
          RemoteChecklistRun(
            id: 'srv-old',
            checklistId: 'cl-OLD',
            status: 'completed',
          ),
          RemoteChecklistRun(
            id: 'srv-new',
            checklistId: 'cl-1',
            status: 'in_progress',
          ),
        ],
      );
      final repo = _repo(store: store, queue: queue, remote: remote);

      final res = await repo.resolveRunForWorkOrder(
        checklistId: 'cl-1',
        workOrderId: 'wo-1',
        schemaVersion: 'v1',
      );

      expect(res.run!.serverId, 'srv-new');
      expect(remote.lastChecklistId, 'cl-1');
    });

    test(
      '4. offline (backend inalcançável) => run local, sem runCreate',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        final repo = _repo(
          store: store,
          queue: queue,
          remote: _FakeRemoteApi(throwOnFetch: true),
        );

        final res = await repo.resolveRunForWorkOrder(
          checklistId: 'cl-1',
          workOrderId: 'wo-1',
          schemaVersion: 'v1',
        );

        expect(res.isReady, isTrue);
        expect(res.offline, isTrue);
        expect(res.run!.serverId, isNull);
        final actions = await queue.actionsForTenant(_tenant);
        expect(
          actions.where((a) => a.type == ChecklistSyncActionTypes.runCreate),
          isEmpty,
        );
      },
    );

    test(
      '5. download carimba server_run_id nas ações offline enfileiradas',
      () async {
        final store = _store();
        final queue = InMemorySyncQueueRepository();
        final remote = _FakeRemoteApi(throwOnFetch: true);
        final repo = _repo(store: store, queue: queue, remote: remote);

        // Offline: cria run local e enfileira uma resposta (sem server_run_id).
        final offline = await repo.resolveRunForWorkOrder(
          checklistId: 'cl-1',
          workOrderId: 'wo-1',
          schemaVersion: 'v1',
        );
        final localRunId = offline.run!.localId;
        await repo.saveAnswer(
          runId: localRunId,
          answer: MobileChecklistAnswer(
            fieldId: 'f-1',
            textValue: 'ok',
            answeredAt: DateTime.utc(2026, 8, 1),
          ),
        );
        final before = (await queue.actionsForTenant(_tenant)).single;
        expect(before.payload.containsKey('server_run_id'), isFalse);

        // Online: baixa a run e carimba o server_run_id na ação pendente.
        remote
          ..throwOnFetch = false
          ..runs = const [
            RemoteChecklistRun(id: 'srv-run-1', checklistId: 'cl-1'),
          ];
        await repo.resolveRunForWorkOrder(
          checklistId: 'cl-1',
          workOrderId: 'wo-1',
          schemaVersion: 'v1',
        );

        final after = (await queue.actionsForTenant(_tenant)).single;
        expect(after.payload['server_run_id'], 'srv-run-1');
      },
    );
  });

  // ── 2. Elegibilidade de sync (server_run_id) ─────────────────────────────
  group('checklistActionReadyForBackend', () {
    test('6. elegível só com server_run_id; runCreate nunca', () {
      final withServer = _action(
        type: ChecklistSyncActionTypes.markerCreate,
        payload: const {'local_run_id': 'clrun-c_1', 'server_run_id': 'srv-1'},
      );
      final withoutServer = _action(
        type: ChecklistSyncActionTypes.markerCreate,
        payload: const {'local_run_id': 'clrun-c_1'},
      );
      final runCreate = _action(
        type: ChecklistSyncActionTypes.runCreate,
        payload: const {'local_run_id': 'clrun-c_1', 'server_run_id': 'srv-1'},
      );

      expect(checklistActionReadyForBackend(withServer), isTrue);
      expect(checklistActionReadyForBackend(withoutServer), isFalse);
      expect(checklistActionReadyForBackend(runCreate), isFalse);
      expect(
        backendChecklistActionTypes.contains(
          ChecklistSyncActionTypes.runCreate,
        ),
        isFalse,
      );
    });
  });

  // ── 3. Codec canônico (não cai no genérico) ──────────────────────────────
  group('ChecklistSyncCodec — tipos+payloads canônicos', () {
    test('7. marker => checklist.marker_create', () {
      final enc = _encode(
        _action(
          type: ChecklistSyncActionTypes.markerCreate,
          payload: const {
            'local_marker_id': 'clmark-1',
            'local_run_id': 'clrun-c_1',
            'server_run_id': 'srv-run-1',
            'field_id': 'f-damage',
            'type': 'damage',
            'label': 'Arranhao',
            'position_label': 'frente-esquerda',
          },
        ),
      );
      final p = Map<String, Object?>.from(enc['payload'] as Map);
      expect(enc['type'], 'checklist.marker_create');
      expect(p['run_id'], 'srv-run-1');
      expect(p['component_id'], 'f-damage');
      expect(p['marker_type'], 'damage');
      expect(p['local_marker_id'], 'clmark-1');
      expect(p['position_label'], 'frente-esquerda');
    });

    test('8. divergence => checklist.divergence_create', () {
      final enc = _encode(
        _action(
          type: ChecklistSyncActionTypes.divergenceCreate,
          payload: const {
            'local_run_id': 'clrun-c_1',
            'server_run_id': 'srv-run-1',
            'component_id': 'f-cond',
            'observation': 'Divergencias (1): Condicao',
            'divergence_count': 1,
            'field_ids': ['f-cond'],
          },
        ),
      );
      final p = Map<String, Object?>.from(enc['payload'] as Map);
      expect(enc['type'], 'checklist.divergence_create');
      expect(p['run_id'], 'srv-run-1');
      expect(p['component_id'], 'f-cond');
      expect(p['observation'], 'Divergencias (1): Condicao');
    });

    test('9. acknowledgement => checklist.acknowledgement_create', () {
      final enc = _encode(
        _action(
          type: ChecklistSyncActionTypes.acknowledgementCreate,
          payload: const {
            'local_ack_id': 'clack-1',
            'local_run_id': 'clrun-c_1',
            'server_run_id': 'srv-run-1',
            'message': 'Ciência registrada por Joao (motorista).',
            'acknowledged_by_role': 'motorista',
          },
        ),
      );
      final p = Map<String, Object?>.from(enc['payload'] as Map);
      expect(enc['type'], 'checklist.acknowledgement_create');
      expect(p['run_id'], 'srv-run-1');
      expect(p['message'], 'Ciência registrada por Joao (motorista).');
    });

    test('10. attachment => checklist.attachment_attach (só metadado)', () {
      final enc = _encode(
        _action(
          type: ChecklistSyncActionTypes.attachmentAttach,
          payload: const {
            'local_att_id': 'clatt-1',
            'local_run_id': 'clrun-c_1',
            'server_run_id': 'srv-run-1',
            'field_id': 'f-photo',
            'file_name': 'foto.jpg',
            'mime_type': 'image/jpeg',
            'size_bytes': 1234,
          },
        ),
      );
      final p = Map<String, Object?>.from(enc['payload'] as Map);
      expect(enc['type'], 'checklist.attachment_attach');
      expect(p['run_id'], 'srv-run-1');
      expect(p['component_id'], 'f-photo');
      expect(p['local_att_id'], 'clatt-1');
      expect(p['file_name'], 'foto.jpg');
      expect(p['size_bytes'], 1234);
      // Nunca vaza binário/segredo no metadado.
      final serialized = enc.toString();
      expect(serialized.contains('base64'), isFalse);
      expect(serialized.contains('bearer'), isFalse);
    });

    test('11. run_id usa server_run_id (não o local)', () {
      final enc = _encode(
        _action(
          type: ChecklistSyncActionTypes.markerCreate,
          payload: const {
            'local_run_id': 'clrun-c_1',
            'server_run_id': 'srv-run-1',
            'field_id': 'f-damage',
            'type': 'damage',
          },
        ),
      );
      final p = Map<String, Object?>.from(enc['payload'] as Map);
      expect(p['run_id'], 'srv-run-1');
      expect(p['run_id'], isNot('clrun-c_1'));
    });
  });

  // ── 4. Foto por multipart (offline → online) ─────────────────────────────
  group('foto de checklist: enfileira offline, sobe por multipart', () {
    test(
      '12. addAttachment grava o binário e fica pendente de upload',
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
          bytes: Uint8List.fromList([1, 2, 3, 4]),
        );

        final pending = await store.loadAttachmentsPendingUpload();
        expect(pending, hasLength(1));
        expect(pending.single.localBlobRef, isNotNull);
        expect(pending.single.sizeBytes, 4);
      },
    );

    test(
      '13. upload multipart sobe contra o server_run_id e apaga o blob',
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
          bytes: Uint8List.fromList([9, 8, 7]),
        );

        final api = _CaptureUploadApi();
        final result = await ChecklistAttachmentUploadService(
          store: store,
          blobStore: blobStore,
          api: api,
        ).uploadTenant(_tenant);

        expect(result.uploaded, hasLength(1));
        expect(api.captured!.runServerId, 'srv-run-1');
        expect(api.captured!.componentId, 'f-photo');
        expect(api.captured!.bytes, [9, 8, 7]);
        // Após stored: não fica mais pendente e o blob foi apagado.
        expect(await store.loadAttachmentsPendingUpload(), isEmpty);
        expect(
          await blobStore.load(result.uploaded.single.localBlobRef ?? 'x'),
          isNull,
        );
      },
    );

    test(
      '14. sem server_run_id (offline) o upload é adiado, não perde a foto',
      () async {
        final store = _store();
        final blobStore = InMemoryEvidenceBlobStore();
        await store.saveRun(_localRun(localId: 'clrun-c_1')); // serverId nulo
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
          bytes: Uint8List.fromList([1, 1]),
        );

        final api = _CaptureUploadApi();
        final result = await ChecklistAttachmentUploadService(
          store: store,
          blobStore: blobStore,
          api: api,
        ).uploadTenant(_tenant);

        expect(result.uploaded, isEmpty);
        expect(api.captured, isNull);
        // A foto continua pendente (nada perdido).
        expect(await store.loadAttachmentsPendingUpload(), hasLength(1));
      },
    );
  });

  // ── 5. Integração fina: divergência real carrega server_run_id ───────────
  group('recordDivergences carrega server_run_id da run baixada', () {
    test(
      '15. divergência enfileirada com server_run_id + component_id',
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

        final action = (await queue.actionsForTenant(_tenant)).single;
        expect(action.type, ChecklistSyncActionTypes.divergenceCreate);
        expect(action.payload['server_run_id'], 'srv-run-1');
        expect(action.payload['component_id'], 'f-cond');
        expect(action.payload['observation'], contains('Condicao'));
      },
    );
  });
}
