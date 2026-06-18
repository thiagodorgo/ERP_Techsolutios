import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('B-108.1 response B-108 usa ref opaca e aliases seguros', () {
    final response = EvidenceUploadResponse.fromBody({
      'data': {
        'evidence_id': 'evidence:tenant-a:woevid-b108',
        'file_id': 'evfile_0123456789abcdef0123456789abcdef',
        'status': 'stored',
        'size_bytes': 3,
        'mime_type': 'image/jpeg',
        'checksum_sha256': 'a' * 64,
        'uploaded_at': '2026-06-18T12:00:00.000Z',
      },
    });

    expect(response.status, 'stored');
    expect(response.contentType, 'image/jpeg');
    expect(response.sha256, 'a' * 64);
    final serialized = jsonEncode({
      'evidenceId': response.evidenceId,
      'fileId': response.fileId,
      'status': response.status,
      'sizeBytes': response.sizeBytes,
      'contentType': response.contentType,
      'sha256': response.sha256,
    });
    for (final forbidden in _forbiddenTerms) {
      expect(serialized, isNot(contains(forbidden)));
    }
  });

  test('B-108.2 upload multipart seguro marca stored como synced', () async {
    final bytes = Uint8List.fromList([1, 2, 3]);
    final fixture = await _fixture(bytes);
    final api = _FakeEvidenceUploadApi(status: 'stored');

    final result = await EvidenceBinaryUploadService(
      store: fixture.store,
      blobStore: fixture.blobStore,
      api: api,
    ).uploadTenant(_tenantId);
    final updated = await fixture.store.findEvidence(_localEvidenceId);

    expect(result.uploaded, hasLength(1));
    expect(updated!.uploadStatus, SyncStatus.synced);
    expect(updated.uploadErrorCode, isNull);
    expect(await fixture.blobStore.load(fixture.blobRef), isNull);
    final request = api.requests.single;
    final metadata = jsonEncode({
      'evidence_id': request.evidenceId,
      'client_evidence_id': request.clientEvidenceId,
      'file_name': request.fileName,
      'content_type': request.contentType,
      'size_bytes': request.sizeBytes,
      'sha256': request.sha256,
      'work_order_id': request.workOrderId,
    });
    for (final forbidden in _forbiddenTerms) {
      expect(metadata, isNot(contains(forbidden)));
    }
  });

  test('B-108.3 rejected preserva evidencia local e falha segura', () async {
    final fixture = await _fixture(Uint8List.fromList([4, 5, 6]));

    final result = await EvidenceBinaryUploadService(
      store: fixture.store,
      blobStore: fixture.blobStore,
      api: _FakeEvidenceUploadApi(status: 'rejected'),
    ).uploadTenant(_tenantId);
    final updated = await fixture.store.findEvidence(_localEvidenceId);

    expect(result.failed, hasLength(1));
    expect(updated!.uploadStatus, SyncStatus.failed);
    expect(updated.uploadErrorCode, 'UPLOAD_REJECTED');
    expect(await fixture.blobStore.load(fixture.blobRef), isNotNull);
  });

  test('B-108.4 scan_failed preserva blob local', () async {
    final fixture = await _fixture(Uint8List.fromList([7, 8, 9]));

    await EvidenceBinaryUploadService(
      store: fixture.store,
      blobStore: fixture.blobStore,
      api: _FakeEvidenceUploadApi(status: 'scan_failed'),
    ).uploadTenant(_tenantId);
    final updated = await fixture.store.findEvidence(_localEvidenceId);

    expect(updated!.uploadStatus, SyncStatus.failed);
    expect(updated.uploadErrorCode, 'SCAN_FAILED');
    expect(await fixture.blobStore.load(fixture.blobRef), isNotNull);
  });

  test('B-108.5 pending_review nao apaga blob nem marca synced', () async {
    final fixture = await _fixture(Uint8List.fromList([10, 11, 12]));

    await EvidenceBinaryUploadService(
      store: fixture.store,
      blobStore: fixture.blobStore,
      api: _FakeEvidenceUploadApi(status: 'pending_review'),
    ).uploadTenant(_tenantId);
    final updated = await fixture.store.findEvidence(_localEvidenceId);

    expect(updated!.uploadStatus, SyncStatus.pending);
    expect(updated.uploadErrorCode, 'PENDING_REVIEW');
    expect(await fixture.blobStore.load(fixture.blobRef), isNotNull);
  });

  test('B-108.6 erro de rede preserva evidencia local', () async {
    final fixture = await _fixture(Uint8List.fromList([13, 14, 15]));

    await EvidenceBinaryUploadService(
      store: fixture.store,
      blobStore: fixture.blobStore,
      api: _FakeEvidenceUploadApi(error: const ApiNetworkError()),
    ).uploadTenant(_tenantId);
    final updated = await fixture.store.findEvidence(_localEvidenceId);

    expect(updated!.uploadStatus, SyncStatus.failed);
    expect(updated.uploadErrorCode, 'NETWORK_ERROR');
    expect(await fixture.blobStore.load(fixture.blobRef), isNotNull);
  });

  test('B-108.7 scanner HTTP errors usam codigos seguros', () async {
    final rejected = await _fixture(Uint8List.fromList([16, 17, 18]));
    await EvidenceBinaryUploadService(
      store: rejected.store,
      blobStore: rejected.blobStore,
      api: _FakeEvidenceUploadApi(error: const ApiServerError(statusCode: 422)),
    ).uploadTenant(_tenantId);

    final scanFailed = await _fixture(Uint8List.fromList([19, 20, 21]));
    await EvidenceBinaryUploadService(
      store: scanFailed.store,
      blobStore: scanFailed.blobStore,
      api: _FakeEvidenceUploadApi(error: const ApiServerError(statusCode: 503)),
    ).uploadTenant(_tenantId);

    expect(
      (await rejected.store.findEvidence(_localEvidenceId))!.uploadErrorCode,
      'UPLOAD_REJECTED',
    );
    expect(
      (await scanFailed.store.findEvidence(_localEvidenceId))!.uploadErrorCode,
      'SCAN_FAILED',
    );
  });

  test('B-108.8 UI de evidencias nao referencia path/storage key', () async {
    final source = await File(
      'lib/features/work_orders/ui/work_order_execute_screen.dart',
    ).readAsString();

    expect(source, isNot(contains('localBlobRef')));
    expect(source, isNot(contains('storage_key')));
    expect(source, isNot(contains('storageKey')));
    expect(source, isNot(contains('bucket')));
  });
}

const _tenantId = 'tenant-a';
const _localEvidenceId = 'woevid-b108';

const _forbiddenTerms = [
  'tenant_id',
  'tenantId',
  'Authorization',
  'Bearer',
  'accessToken',
  'refreshToken',
  'base64',
  'file_data',
  'local_path',
  '"path"',
  'bucket',
  'storage_key',
  'storageKey',
  'absolutePath',
];

class _Fixture {
  const _Fixture({
    required this.store,
    required this.blobStore,
    required this.blobRef,
  });

  final InMemoryWorkOrderLocalStore store;
  final InMemoryEvidenceBlobStore blobStore;
  final String blobRef;
}

Future<_Fixture> _fixture(Uint8List bytes) async {
  final store = InMemoryWorkOrderLocalStore();
  final blobStore = InMemoryEvidenceBlobStore();
  final blobRef = await blobStore.save(bytes, contentType: 'image/jpeg');
  await store.saveEvidence(
    WorkOrderEvidence(
      localId: _localEvidenceId,
      serverId: 'evidence:tenant-a:$_localEvidenceId',
      workOrderLocalId: 'wo-local-b108',
      tenantId: _tenantId,
      fileName: 'panel.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: bytes.length,
      captureSource: 'camera',
      checksum: sha256.convert(bytes).toString(),
      syncStatus: SyncStatus.synced,
      uploadStatus: SyncStatus.pending,
      createdAt: DateTime.utc(2026, 6, 18, 12),
      localBlobRef: blobRef,
    ),
  );
  return _Fixture(store: store, blobStore: blobStore, blobRef: blobRef);
}

class _FakeEvidenceUploadApi implements EvidenceUploadApi {
  _FakeEvidenceUploadApi({this.status = 'stored', this.error});

  final String status;
  final ApiError? error;
  final List<EvidenceUploadRequest> requests = [];

  @override
  Future<EvidenceUploadResponse> upload(EvidenceUploadRequest request) async {
    requests.add(request);
    final error = this.error;
    if (error != null) throw error;
    return EvidenceUploadResponse(
      evidenceId: request.evidenceId,
      fileId: 'evfile_0123456789abcdef0123456789abcdef',
      status: status,
      sizeBytes: request.sizeBytes,
      contentType: request.contentType,
      sha256: request.sha256,
      uploadedAt: DateTime.utc(2026, 6, 18, 13),
    );
  }
}
