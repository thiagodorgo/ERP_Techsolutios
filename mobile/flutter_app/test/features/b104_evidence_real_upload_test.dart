import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_picker.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';
// ignore: depend_on_referenced_packages
import 'package:sqlite3/sqlite3.dart' as sqlite3;

void main() {
  test('B-104.1 picker carrega bytes sem expor path/base64 no resultado', () {
    final bytes = Uint8List.fromList([1, 2, 3, 4]);
    final result = EvidencePickerResult(
      fileName: 'panel.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: bytes.length,
      captureSource: EvidenceCaptureSource.camera,
      sha256: sha256.convert(bytes).toString(),
      bytes: bytes,
    );

    expect(result.bytes, bytes);
    final safeFields = [
      result.fileName,
      result.mimeType,
      result.sizeBytes.toString(),
      result.captureSource.name,
      result.sha256,
    ].join('|');
    expect(safeFields, isNot(contains('base64')));
    expect(safeFields, isNot(contains('file_data')));
    expect(safeFields, isNot(contains('local_path')));
    expect(safeFields, isNot(contains('C:\\')));
    expect(result.fileName, isNot(contains('/')));
  });

  test(
    'B-104.2 blob store usa referencia opaca e preserva bytes localmente',
    () async {
      final store = InMemoryEvidenceBlobStore();
      final bytes = Uint8List.fromList([9, 8, 7]);

      final ref = await store.save(bytes, contentType: 'image/png');
      final loaded = await store.load(ref);
      await store.delete(ref);

      expect(ref, startsWith('evidence-blob:'));
      expect(ref, isNot(contains('/')));
      expect(ref, isNot(contains('\\')));
      expect(loaded, bytes);
      expect(await store.load(ref), isNull);
    },
  );

  test(
    'B-104.3 attachEvidence salva blob e enfileira somente metadados seguros',
    () async {
      final queue = InMemorySyncQueueRepository();
      final blobStore = InMemoryEvidenceBlobStore();
      final wo = _order(serverId: 'wo-server-104');
      final repo = WorkOrderRepository(
        session: _session,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([wo]),
        evidenceBlobStore: blobStore,
      );
      final bytes = Uint8List.fromList([1, 1, 2, 3, 5]);
      await repo.load();

      final evidence = await repo.attachEvidence(
        workOrderLocalId: wo.localId,
        fileName: 'panel.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: bytes.length,
        captureSource: 'camera',
        bytes: bytes,
      );
      final actions = await queue.pendingForTenant(_tenantId);
      final payload = actions.single.payload;
      final serialized = payload.toString();

      expect(evidence.localBlobRef, startsWith('evidence-blob:'));
      expect(evidence.uploadStatus, SyncStatus.pending);
      expect(payload['local_evidence_id'], evidence.localId);
      expect(payload['work_order_id'], 'wo-server-104');
      expect(serialized, isNot(contains('base64')));
      expect(serialized, isNot(contains('file_data')));
      expect(serialized, isNot(contains('local_path')));
      expect(serialized, isNot(contains('path')));
      expect(serialized, isNot(contains('tenant_id')));
      expect(serialized, isNot(contains('evidence-blob:')));
    },
  );

  test(
    'B-104.4 metadata accepted e already_applied liberam upload pendente',
    () async {
      final queue = InMemorySyncQueueRepository();
      final store = InMemoryWorkOrderLocalStore([
        _order(serverId: 'wo-server-104'),
      ]);
      final evidence = _evidence(
        serverId: null,
        syncStatus: SyncStatus.pending,
      );
      await store.saveEvidence(evidence);
      final action = SyncActionFactory().create(
        tenantId: _tenantId,
        clientActionId: evidence.localId,
        type: EvidenceSyncActionTypes.workOrderPhoto,
        payload: {
          'local_evidence_id': evidence.localId,
          'work_order_id': 'wo-server-104',
          'file_name': evidence.fileName,
          'content_type': evidence.mimeType,
          'size_bytes': evidence.sizeBytes,
          'sha256': evidence.checksum,
        },
      );
      await queue.enqueue(action);

      final first = await EvidenceSyncReplayService(
        queue: queue,
        api: _FakeEvidenceSyncApi(EvidenceSyncItemStatus.accepted),
        entityUpdater: buildEvidenceSyncEntityUpdater(store),
      ).replayTenant(_tenantId);

      await store.saveEvidence(
        (await store.findEvidence(
          evidence.localId,
        ))!.copyWith(syncStatus: SyncStatus.pending),
      );
      final replayQueue = InMemorySyncQueueRepository();
      await replayQueue.enqueue(action.copyWith(status: SyncStatus.pending));
      final replay = await EvidenceSyncReplayService(
        queue: replayQueue,
        api: _FakeEvidenceSyncApi(EvidenceSyncItemStatus.alreadyApplied),
        entityUpdater: buildEvidenceSyncEntityUpdater(store),
      ).replayTenant(_tenantId);
      final updated = await store.findEvidence(evidence.localId);

      expect(first.synced.length, 1);
      expect(replay.synced.length, 1);
      expect(updated!.serverId, 'evidence:tenant-a:${evidence.localId}');
      expect(updated.syncStatus, SyncStatus.synced);
      expect(updated.uploadStatus, SyncStatus.pending);
    },
  );

  test(
    'B-104.5 upload binario envia multipart controlado e marca synced',
    () async {
      final store = InMemoryWorkOrderLocalStore([
        _order(serverId: 'wo-server-104'),
      ]);
      final blobStore = InMemoryEvidenceBlobStore();
      final bytes = Uint8List.fromList([4, 2, 0]);
      final ref = await blobStore.save(bytes, contentType: 'image/jpeg');
      final evidence = _evidence(
        serverId: 'evidence:tenant-a:woevid-local-104',
        sizeBytes: bytes.length,
        checksum: sha256.convert(bytes).toString(),
        localBlobRef: ref,
      );
      await store.saveEvidence(evidence);
      final api = _FakeEvidenceUploadApi();

      final result = await EvidenceBinaryUploadService(
        store: store,
        blobStore: blobStore,
        api: api,
      ).uploadTenant(_tenantId);
      final uploaded = await store.findEvidence(evidence.localId);

      expect(result.uploaded.length, 1);
      expect(api.requests.single.evidenceId, evidence.serverId);
      expect(api.requests.single.clientEvidenceId, evidence.localId);
      expect(api.requests.single.bytes, bytes);
      expect(uploaded!.uploadStatus, SyncStatus.synced);
      expect(uploaded.uploadErrorCode, isNull);
      expect(await blobStore.load(ref), isNull);
    },
  );

  test(
    'B-104.6 conflito de upload vira conflito manual sem perder evidencia',
    () async {
      final store = InMemoryWorkOrderLocalStore([
        _order(serverId: 'wo-server-104'),
      ]);
      final blobStore = InMemoryEvidenceBlobStore();
      final bytes = Uint8List.fromList([6, 6, 6]);
      final ref = await blobStore.save(bytes, contentType: 'image/jpeg');
      final evidence = _evidence(
        serverId: 'evidence:tenant-a:woevid-local-104',
        sizeBytes: bytes.length,
        checksum: sha256.convert(bytes).toString(),
        localBlobRef: ref,
      );
      await store.saveEvidence(evidence);

      final result = await EvidenceBinaryUploadService(
        store: store,
        blobStore: blobStore,
        api: _FakeEvidenceUploadApi(conflict: true),
      ).uploadTenant(_tenantId);
      final updated = await store.findEvidence(evidence.localId);

      expect(result.conflicts.length, 1);
      expect(updated!.uploadStatus, SyncStatus.conflict);
      expect(updated.uploadErrorCode, 'UPLOAD_CONFLICT');
      expect(updated.fileName, evidence.fileName);
      expect(updated.localBlobRef, ref);
    },
  );

  test('B-104.7 endpoint mobile de upload permanece registrado', () {
    expect(EvidenceApiEndpoints.upload, '/api/v1/mobile/evidence-uploads');
  });

  test('B-104.8 upgrade Drift schema 3 -> 5 nao duplica colunas', () async {
    await _expectLegacyEvidenceUpgrade(fromVersion: 3);
  });

  test('B-104.9 upgrade Drift schema 4 -> 5 preserva upload fields', () async {
    await _expectLegacyEvidenceUpgrade(fromVersion: 4);
  });
}

const _tenantId = 'tenant-a';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantId, displayName: 'Tenant A'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:update'}),
);

WorkOrder _order({String? serverId}) => WorkOrder(
  localId: 'wo-local-104',
  serverId: serverId,
  tenantId: _tenantId,
  code: 'OS-104',
  title: 'B-104 evidence upload',
  customerName: 'Cliente B104',
  serviceAddress: 'Rua B104, 1',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 17),
);

WorkOrderEvidence _evidence({
  String? serverId,
  SyncStatus syncStatus = SyncStatus.synced,
  int sizeBytes = 3,
  String checksum = 'checksum',
  String? localBlobRef = 'evidence-blob:test-ref',
}) => WorkOrderEvidence(
  localId: 'woevid-local-104',
  serverId: serverId,
  workOrderLocalId: 'wo-local-104',
  tenantId: _tenantId,
  fileName: 'panel.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: sizeBytes,
  captureSource: 'camera',
  checksum: checksum,
  syncStatus: syncStatus,
  uploadStatus: SyncStatus.pending,
  createdAt: DateTime.utc(2026, 6, 17, 12),
  localBlobRef: localBlobRef,
);

class _FakeEvidenceSyncApi implements EvidenceSyncBatchApi {
  const _FakeEvidenceSyncApi(this.status);

  final EvidenceSyncItemStatus status;

  @override
  Future<EvidenceSyncBatchResponse> sendBatch(List<SyncAction> actions) async {
    final item = EvidenceSyncItemResult(
      clientEvidenceId: actions.single.clientActionId,
      status: status,
      evidenceId: 'evidence:tenant-a:${actions.single.clientActionId}',
    );
    return EvidenceSyncBatchResponse(
      clientBatchId: 'batch-b104',
      summary: EvidenceSyncSummary(
        received: 1,
        accepted: status == EvidenceSyncItemStatus.accepted ? 1 : 0,
        rejected: 0,
        conflicts: 0,
        alreadyApplied: status == EvidenceSyncItemStatus.alreadyApplied ? 1 : 0,
      ),
      accepted: status == EvidenceSyncItemStatus.accepted ? [item] : const [],
      rejected: const [],
      conflicts: const [],
      alreadyApplied: status == EvidenceSyncItemStatus.alreadyApplied
          ? [item]
          : const [],
    );
  }
}

class _FakeEvidenceUploadApi implements EvidenceUploadApi {
  _FakeEvidenceUploadApi({this.conflict = false});

  final bool conflict;
  final List<EvidenceUploadRequest> requests = [];

  @override
  Future<EvidenceUploadResponse> upload(EvidenceUploadRequest request) async {
    requests.add(request);
    if (conflict) throw const ApiConflictError();
    return EvidenceUploadResponse(
      evidenceId: request.evidenceId,
      fileId: 'file-104',
      status: 'uploaded',
      sizeBytes: request.sizeBytes,
      contentType: request.contentType,
      sha256: request.sha256,
      uploadedAt: DateTime.utc(2026, 6, 17, 13),
    );
  }
}

Future<void> _expectLegacyEvidenceUpgrade({required int fromVersion}) async {
  final file = await _legacyDatabaseFile(fromVersion);
  final db = AppDatabase(NativeDatabase(file));
  addTearDown(db.close);
  final store = DriftWorkOrderLocalStore(db);
  final uploadedAt = DateTime.utc(2026, 6, 17, 14);
  final evidence = WorkOrderEvidence(
    localId: 'woevid-legacy-$fromVersion',
    serverId: 'evidence:tenant-a:woevid-legacy-$fromVersion',
    workOrderLocalId: 'wo-local-104',
    tenantId: _tenantId,
    fileName: 'legacy.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 123,
    captureSource: 'camera',
    checksum: 'a' * 64,
    syncStatus: SyncStatus.synced,
    uploadStatus: SyncStatus.failed,
    createdAt: DateTime.utc(2026, 6, 17, 12),
    uploadedAt: uploadedAt,
    uploadErrorCode: 'UPLOAD_VALIDATION',
    localBlobRef: 'evidence-blob:legacy-ref',
  );

  await store.saveEvidence(evidence);
  final loaded = await store.findEvidence(evidence.localId);

  expect(loaded, isNotNull);
  expect(loaded!.serverId, evidence.serverId);
  expect(loaded.uploadStatus, SyncStatus.failed);
  expect(loaded.uploadedAt, uploadedAt);
  expect(loaded.uploadErrorCode, 'UPLOAD_VALIDATION');
  expect(loaded.localBlobRef, 'evidence-blob:legacy-ref');
}

Future<File> _legacyDatabaseFile(int version) async {
  final directory = await Directory.systemTemp.createTemp(
    'b104-drift-$version-',
  );
  addTearDown(() => directory.delete(recursive: true));
  final file = File('${directory.path}/legacy.sqlite');
  final db = sqlite3.sqlite3.open(file.path);
  try {
    if (version == 4) {
      db.execute('''
CREATE TABLE work_order_evidence (
  local_id TEXT NOT NULL PRIMARY KEY,
  work_order_local_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  capture_source TEXT NOT NULL,
  checksum TEXT,
  sync_status TEXT NOT NULL,
  created_at INTEGER NOT NULL
)''');
    }
    db.execute('PRAGMA user_version = $version');
  } finally {
    db.close();
  }
  return file;
}
