import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/evidence/evidence_blob_store.dart';
import '../../../core/local_db/database_provider.dart';
import '../../../core/local_db/drift_checklist_local_store.dart';
import '../../../core/network/api_contracts.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/http_client.dart';
import '../../../core/sync/sync_models.dart';
import '../domain/checklist_models.dart';
import 'checklist_local_store.dart';

// PR-B (D-CHK-DISPATCH-CREATE) — o BINÁRIO da foto de checklist NÃO cabe no JSON
// de sync: o `attachment.attach` é só o metadado/ordenação. O binário sobe pelo
// multipart POST /mobile/checklist-runs/:runId/attachments, contra o
// server_run_id baixado. Espelha EvidenceBinaryUploadService.

class ChecklistAttachmentUploadRequest {
  const ChecklistAttachmentUploadRequest({
    required this.runServerId,
    required this.componentId,
    required this.fileName,
    required this.mimeType,
    required this.bytes,
  });

  /// server_run_id — o `:runId` do endpoint multipart.
  final String runServerId;
  final String componentId;
  final String fileName;
  final String mimeType;
  final Uint8List bytes;
}

class ChecklistAttachmentUploadResponse {
  const ChecklistAttachmentUploadResponse({
    required this.attachmentId,
    required this.status,
  });

  final String attachmentId;

  /// 'stored' para anexos persistidos (o endpoint responde 201 com o DTO).
  final String status;

  factory ChecklistAttachmentUploadResponse.fromBody(Object? body) {
    final outer = _asMap(body);
    final data = _asMap(outer['data'] ?? outer);
    final id = (data['id'] as String?)?.trim();
    if (id == null || id.isEmpty) {
      throw const FormatException('Invalid checklist attachment response');
    }
    return ChecklistAttachmentUploadResponse(
      attachmentId: id,
      status: (data['status'] as String?)?.trim() ?? 'stored',
    );
  }
}

abstract class ChecklistAttachmentUploadApi {
  Future<ChecklistAttachmentUploadResponse> upload(
    ChecklistAttachmentUploadRequest request,
  );
}

class PendingChecklistAttachmentUploadApi
    implements ChecklistAttachmentUploadApi {
  const PendingChecklistAttachmentUploadApi();

  @override
  Future<ChecklistAttachmentUploadResponse> upload(
    ChecklistAttachmentUploadRequest request,
  ) => Future.error(const ApiUnauthorizedError());
}

class DioChecklistAttachmentUploadApi implements ChecklistAttachmentUploadApi {
  const DioChecklistAttachmentUploadApi(this._client);

  final Dio _client;

  @override
  Future<ChecklistAttachmentUploadResponse> upload(
    ChecklistAttachmentUploadRequest request,
  ) async {
    try {
      final form = FormData.fromMap({
        // O backend (busboy) exige o campo `componentId` + o arquivo `file`.
        'componentId': request.componentId,
        'file': MultipartFile.fromBytes(
          request.bytes,
          filename: request.fileName,
        ),
      });
      final response = await _client.post(
        ChecklistApiEndpoints.attachments(request.runServerId),
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      return ChecklistAttachmentUploadResponse.fromBody(response.data);
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}

class ChecklistAttachmentUploadResult {
  const ChecklistAttachmentUploadResult({
    required this.uploaded,
    required this.failed,
    required this.conflicts,
  });

  final List<MobileChecklistAttachmentMetadata> uploaded;
  final List<MobileChecklistAttachmentMetadata> failed;
  final List<MobileChecklistAttachmentMetadata> conflicts;
}

class ChecklistAttachmentUploadService {
  const ChecklistAttachmentUploadService({
    required ChecklistLocalStore store,
    required EvidenceBlobStore blobStore,
    required ChecklistAttachmentUploadApi api,
  }) : _store = store,
       _blobStore = blobStore,
       _api = api;

  final ChecklistLocalStore _store;
  final EvidenceBlobStore _blobStore;
  final ChecklistAttachmentUploadApi _api;

  Future<ChecklistAttachmentUploadResult> uploadTenant(String tenantId) async {
    final uploaded = <MobileChecklistAttachmentMetadata>[];
    final failed = <MobileChecklistAttachmentMetadata>[];
    final conflicts = <MobileChecklistAttachmentMetadata>[];

    for (final att in await _store.loadAttachmentsPendingUpload()) {
      final blobRef = att.localBlobRef;
      if (blobRef == null) continue;

      // Resolve a run (tenant + server_run_id). Sem server_run_id ainda não há
      // alvo de upload (o download vai carimbá-lo depois) → deixa pendente.
      final run = await _store.loadRun(att.runId);
      if (run == null || run.tenantId != tenantId) continue;
      final runServerId = run.serverId?.trim();
      if (runServerId == null || runServerId.isEmpty) continue;

      final bytes = await _blobStore.load(blobRef);
      if (bytes == null) {
        final next = att.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: 'LOCAL_BLOB_MISSING',
        );
        await _store.saveAttachment(next);
        failed.add(next);
        continue;
      }

      try {
        final response = await _api.upload(
          ChecklistAttachmentUploadRequest(
            runServerId: runServerId,
            componentId: att.fieldId,
            fileName: att.fileName,
            mimeType: att.mimeType,
            bytes: bytes,
          ),
        );
        if (_isStoredStatus(response.status)) {
          final next = att.copyWith(
            serverId: response.attachmentId,
            uploadStatus: SyncStatus.synced,
            uploadedAt: DateTime.now().toUtc(),
            clearUploadErrorCode: true,
            clearLocalBlobRef: true,
          );
          await _store.saveAttachment(next);
          // §B-108: o blob opaco só é apagado após `stored`. Só aqui, portanto.
          await _blobStore.delete(blobRef);
          uploaded.add(next);
        } else {
          // rejected / scan_failed / pending_review → PRESERVA o blob (não apaga,
          // não limpa a ref) para não perder a foto. pending_review re-tenta;
          // rejected/scan_failed ficam visíveis para revisão. Espelha B-108.
          final next = att.copyWith(
            serverId: response.attachmentId,
            uploadStatus: response.status == 'pending_review'
                ? SyncStatus.pending
                : SyncStatus.failed,
            uploadErrorCode: _remoteUploadStatusCode(response.status),
          );
          await _store.saveAttachment(next);
          failed.add(next);
        }
      } on ApiConflictError {
        final next = att.copyWith(
          uploadStatus: SyncStatus.conflict,
          uploadErrorCode: 'UPLOAD_CONFLICT',
        );
        await _store.saveAttachment(next);
        conflicts.add(next);
      } on ApiError catch (error) {
        final next = att.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: _uploadErrorCode(error),
        );
        await _store.saveAttachment(next);
        failed.add(next);
      } catch (_) {
        final next = att.copyWith(
          uploadStatus: SyncStatus.failed,
          uploadErrorCode: 'UPLOAD_FAILED',
        );
        await _store.saveAttachment(next);
        failed.add(next);
      }
    }

    return ChecklistAttachmentUploadResult(
      uploaded: uploaded,
      failed: failed,
      conflicts: conflicts,
    );
  }
}

// §B-108: o binário só pode ser apagado quando o servidor confirma `stored`
// (ou `uploaded`). Qualquer outro status (rejected/scan_failed/pending_review)
// PRESERVA o blob local.
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
    _ => 'UPLOAD_FAILED',
  };
}

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

// ---------------------------------------------------------------------------
// Providers
// ---------------------------------------------------------------------------

final checklistAttachmentUploadApiProvider =
    Provider<ChecklistAttachmentUploadApi>((ref) {
      final config = ref.watch(authenticatedApiConfigProvider);
      if (config.accessToken == null) {
        return const PendingChecklistAttachmentUploadApi();
      }
      return DioChecklistAttachmentUploadApi(
        createAuthenticatedHttpClient(
          config,
          onRefresh: () async {
            await ref.read(authStateProvider.notifier).tryRefresh();
            return ref
                .read(authStateProvider)
                .maybeWhen(
                  data: (s) => s.session?.tokens.accessToken,
                  orElse: () => null,
                );
          },
          onClearSession: () => ref.read(authStateProvider.notifier).logout(),
        ),
      );
    });

final checklistAttachmentUploadServiceProvider =
    Provider<ChecklistAttachmentUploadService>(
      (ref) => ChecklistAttachmentUploadService(
        store: DriftChecklistLocalStore(ref.watch(appDatabaseProvider)),
        blobStore: ref.watch(evidenceBlobStoreProvider),
        api: ref.watch(checklistAttachmentUploadApiProvider),
      ),
    );
