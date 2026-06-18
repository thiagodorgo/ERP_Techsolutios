import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../features/work_orders/data/work_order_local_store.dart';
import '../../features/work_orders/domain/work_order_models.dart';
import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import '../sync/sync_models.dart';
import 'evidence_blob_store.dart';
import 'evidence_sync.dart';

class EvidenceUploadRequest {
  const EvidenceUploadRequest({
    required this.evidenceId,
    required this.clientEvidenceId,
    required this.fileName,
    required this.contentType,
    required this.sizeBytes,
    required this.sha256,
    required this.bytes,
    this.workOrderId,
  });

  final String evidenceId;
  final String clientEvidenceId;
  final String fileName;
  final String contentType;
  final int sizeBytes;
  final String sha256;
  final Uint8List bytes;
  final String? workOrderId;
}

class EvidenceUploadResponse {
  const EvidenceUploadResponse({
    required this.evidenceId,
    required this.fileId,
    required this.status,
    required this.sizeBytes,
    required this.contentType,
    required this.sha256,
    required this.uploadedAt,
  });

  final String evidenceId;
  final String fileId;
  final String status;
  final int sizeBytes;
  final String contentType;
  final String sha256;
  final DateTime uploadedAt;

  factory EvidenceUploadResponse.fromBody(Object? body) {
    final outer = _asMap(body);
    final data = _asMap(outer['data'] ?? outer);
    return EvidenceUploadResponse(
      evidenceId: _requiredString(data, 'evidence_id', 'evidenceId'),
      fileId: _requiredString(data, 'file_id', 'fileId'),
      status: _requiredString(data, 'status', 'status'),
      sizeBytes: _requiredInt(data, 'size_bytes', 'sizeBytes'),
      contentType: _requiredString(
        data,
        'mime_type',
        'content_type',
        'contentType',
      ),
      sha256: _requiredString(data, 'checksum_sha256', 'sha256', 'sha256'),
      uploadedAt: DateTime.parse(
        _requiredString(data, 'uploaded_at', 'uploadedAt'),
      ).toUtc(),
    );
  }
}

abstract class EvidenceUploadApi {
  Future<EvidenceUploadResponse> upload(EvidenceUploadRequest request);
}

class PendingEvidenceUploadApi implements EvidenceUploadApi {
  const PendingEvidenceUploadApi();

  @override
  Future<EvidenceUploadResponse> upload(EvidenceUploadRequest request) =>
      Future.error(const ApiUnauthorizedError());
}

class DioEvidenceUploadApi implements EvidenceUploadApi {
  const DioEvidenceUploadApi(this._client);

  final Dio _client;

  @override
  Future<EvidenceUploadResponse> upload(EvidenceUploadRequest request) async {
    try {
      final form = FormData.fromMap({
        'evidence_id': request.evidenceId,
        'client_evidence_id': request.clientEvidenceId,
        if (request.workOrderId != null) 'work_order_id': request.workOrderId,
        'sha256': request.sha256,
        'size_bytes': request.sizeBytes.toString(),
        'content_type': request.contentType,
        'file': MultipartFile.fromBytes(
          request.bytes,
          filename: request.fileName,
        ),
      });
      final response = await _client.post(
        EvidenceApiEndpoints.upload,
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      return EvidenceUploadResponse.fromBody(response.data);
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}

class EvidenceBinaryUploadResult {
  const EvidenceBinaryUploadResult({
    required this.uploaded,
    required this.failed,
    required this.conflicts,
  });

  final List<WorkOrderEvidence> uploaded;
  final List<WorkOrderEvidence> failed;
  final List<WorkOrderEvidence> conflicts;
}

class EvidenceBinaryUploadService {
  const EvidenceBinaryUploadService({
    required WorkOrderLocalStore store,
    required EvidenceBlobStore blobStore,
    required EvidenceUploadApi api,
  }) : _store = store,
       _blobStore = blobStore,
       _api = api;

  final WorkOrderLocalStore _store;
  final EvidenceBlobStore _blobStore;
  final EvidenceUploadApi _api;

  Future<EvidenceBinaryUploadResult> uploadTenant(String tenantId) async {
    final uploaded = <WorkOrderEvidence>[];
    final failed = <WorkOrderEvidence>[];
    final conflicts = <WorkOrderEvidence>[];
    final evidence = (await _store.loadAllEvidence()).where(
      (item) =>
          item.tenantId == tenantId &&
          item.serverId != null &&
          item.localBlobRef != null &&
          (item.uploadStatus == SyncStatus.pending ||
              item.uploadStatus == SyncStatus.failed),
    );

    for (final item in evidence) {
      final blobRef = item.localBlobRef;
      final serverId = item.serverId;
      final checksum = item.checksum;
      if (blobRef == null || serverId == null || checksum == null) continue;

      final bytes = await _blobStore.load(blobRef);
      if (bytes == null) {
        final next = item.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: 'LOCAL_BLOB_MISSING',
        );
        await _store.saveEvidence(next);
        failed.add(next);
        continue;
      }
      if (bytes.isEmpty ||
          bytes.length > evidenceMaxFileSizeBytes ||
          bytes.length != item.sizeBytes) {
        final next = item.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: 'INVALID_FILE_SIZE',
        );
        await _store.saveEvidence(next);
        failed.add(next);
        continue;
      }

      try {
        final response = await _api.upload(
          EvidenceUploadRequest(
            evidenceId: serverId,
            clientEvidenceId: item.localId,
            fileName: item.fileName,
            contentType: item.mimeType,
            sizeBytes: item.sizeBytes,
            sha256: checksum,
            bytes: bytes,
          ),
        );
        if (_isStoredStatus(response.status)) {
          final next = item.copyWith(
            uploadStatus: SyncStatus.synced,
            uploadedAt: response.uploadedAt,
            uploadErrorCode: null,
            clearUploadErrorCode: true,
          );
          await _store.saveEvidence(next);
          await _blobStore.delete(blobRef);
          uploaded.add(next);
        } else {
          final next = item.copyWith(
            uploadStatus: response.status == 'pending_review'
                ? SyncStatus.pending
                : SyncStatus.failed,
            uploadErrorCode: _remoteUploadStatusCode(response.status),
          );
          await _store.saveEvidence(next);
          failed.add(next);
        }
      } on ApiConflictError {
        final next = item.copyWith(
          uploadStatus: SyncStatus.conflict,
          uploadErrorCode: 'UPLOAD_CONFLICT',
        );
        await _store.saveEvidence(next);
        conflicts.add(next);
      } on ApiError catch (error) {
        final next = item.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: _uploadErrorCode(error),
        );
        await _store.saveEvidence(next);
        failed.add(next);
      } catch (_) {
        final next = item.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: 'UPLOAD_FAILED',
        );
        await _store.saveEvidence(next);
        failed.add(next);
      }
    }

    return EvidenceBinaryUploadResult(
      uploaded: uploaded,
      failed: failed,
      conflicts: conflicts,
    );
  }
}

String _uploadErrorCode(ApiError error) {
  return switch (error) {
    ApiUnauthorizedError() => 'UNAUTHORIZED',
    ApiNetworkError() || ApiTimeoutError() => 'NETWORK_ERROR',
    ApiServerError(:final statusCode) when statusCode == 400 =>
      'UPLOAD_VALIDATION',
    ApiServerError(:final statusCode) when statusCode == 413 =>
      'FILE_TOO_LARGE',
    ApiServerError(:final statusCode) when statusCode == 422 =>
      'UPLOAD_REJECTED',
    ApiServerError(:final statusCode) when statusCode == 503 => 'SCAN_FAILED',
    _ => 'UPLOAD_FAILED',
  };
}

bool _isStoredStatus(String status) =>
    status == 'stored' || status == 'uploaded';

String _remoteUploadStatusCode(String status) {
  return switch (status) {
    'rejected' => 'UPLOAD_REJECTED',
    'scan_failed' => 'SCAN_FAILED',
    'pending_review' => 'PENDING_REVIEW',
    _ => 'UPLOAD_FAILED',
  };
}

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

String _requiredString(
  Map<String, dynamic> source,
  String key,
  String fallbackKey, [
  String? secondFallbackKey,
]) {
  final value = source[key] ?? source[fallbackKey] ?? source[secondFallbackKey];
  if (value is String && value.trim().isNotEmpty) return value.trim();
  throw const FormatException('Invalid evidence upload response');
}

int _requiredInt(Map<String, dynamic> source, String key, String fallbackKey) {
  final value = source[key] ?? source[fallbackKey];
  if (value is num) return value.toInt();
  throw const FormatException('Invalid evidence upload response');
}
