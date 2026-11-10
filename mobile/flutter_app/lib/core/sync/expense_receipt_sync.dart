import 'dart:typed_data';

import 'package:dio/dio.dart';

import '../../features/expenses/data/expense_repository.dart';
import '../../features/expenses/domain/expense_models.dart';
import '../evidence/evidence_blob_store.dart';
import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import 'sync_models.dart';
import 'sync_queue_repository.dart';

/// B-RDV-COMPROVANTE (§G.3) — replay MULTIPART do comprovante de despesa, 1 arquivo por
/// requisição. Molde: `evidence_upload.dart` (`EvidenceBinaryUploadService`).
///
/// O comprovante NUNCA viaja no lote JSON (`/mobile/sync/expense-actions` recusa o tipo — 400):
/// a ação `expense_receipt.attach` fica `pending` na fila e sobe por aqui, com o blob local.
/// O blob só é apagado quando o servidor confirma o comprovante guardado (`uploaded`);
/// recusa (409/413/415/422), sessão (401/403), 503 e erro de rede PRESERVAM o blob (§6 do
/// CLAUDE.md — nada se perde antes da confirmação).
class ExpenseReceiptUploadRequest {
  const ExpenseReceiptUploadRequest({
    required this.reportServerId,
    required this.itemServerId,
    required this.clientActionId,
    required this.fileName,
    required this.contentType,
    required this.sizeBytes,
    required this.sha256,
    required this.bytes,
  });

  final String reportServerId;
  final String itemServerId;
  final String clientActionId;
  final String fileName;
  final String contentType;
  final int sizeBytes;
  final String sha256;
  final Uint8List bytes;
}

class ExpenseReceiptUploadResponse {
  const ExpenseReceiptUploadResponse({
    required this.receiptId,
    required this.uploadStatus,
  });

  final String receiptId;
  final String uploadStatus;

  factory ExpenseReceiptUploadResponse.fromBody(Object? body) {
    final outer = _asMap(body);
    final data = _asMap(outer['data'] ?? outer);
    final receiptId = data['receiptId'] ?? data['receipt_id'];
    final uploadStatus = data['uploadStatus'] ?? data['upload_status'];
    if (receiptId is! String || receiptId.isEmpty) {
      throw const FormatException(
        'receiptId ausente na resposta do comprovante',
      );
    }
    if (uploadStatus is! String || uploadStatus.isEmpty) {
      throw const FormatException(
        'uploadStatus ausente na resposta do comprovante',
      );
    }
    return ExpenseReceiptUploadResponse(
      receiptId: receiptId,
      uploadStatus: uploadStatus,
    );
  }
}

Map<String, Object?> _asMap(Object? value) =>
    value is Map ? value.cast<String, Object?>() : <String, Object?>{};

abstract class ExpenseReceiptUploadApi {
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  );
}

/// Sem sessão: nenhum upload sai (a chamada falha como não autenticada e o serviço preserva tudo).
class PendingExpenseReceiptUploadApi implements ExpenseReceiptUploadApi {
  const PendingExpenseReceiptUploadApi();

  @override
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) => Future.error(const ApiUnauthorizedError());
}

class DioExpenseReceiptUploadApi implements ExpenseReceiptUploadApi {
  const DioExpenseReceiptUploadApi(this._client);

  final Dio _client;

  @override
  Future<ExpenseReceiptUploadResponse> upload(
    ExpenseReceiptUploadRequest request,
  ) async {
    try {
      final form = FormData.fromMap({
        'client_action_id': request.clientActionId,
        'sha256': request.sha256,
        'size_bytes': request.sizeBytes.toString(),
        'content_type': request.contentType,
        'file': MultipartFile.fromBytes(
          request.bytes,
          filename: request.fileName,
        ),
      });
      final response = await _client.post(
        ExpenseApiEndpoints.receiptUpload(
          request.reportServerId,
          request.itemServerId,
        ),
        data: form,
        options: Options(contentType: 'multipart/form-data'),
      );
      return ExpenseReceiptUploadResponse.fromBody(response.data);
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}

class ExpenseReceiptSyncResult {
  const ExpenseReceiptSyncResult({
    required this.uploaded,
    required this.failed,
    required this.conflicts,
    this.busy = const <SyncAction>[],
  });

  final List<SyncAction> uploaded;
  final List<SyncAction> failed;
  final List<SyncAction> conflicts;

  /// B-RDV-COMPROVANTE (conserto c1, §12.6 e §13.1) — as ações que receberam 503 do servidor
  /// NESTE passe (também estão em [failed], que mantém o significado de sempre). É o que solta o
  /// envio do relatório no 2º lote do passe; nenhum outro desfecho entra aqui.
  final List<SyncAction> busy;
}

class ExpenseReceiptSyncService {
  const ExpenseReceiptSyncService({
    required SyncQueueRepository queue,
    required LocalExpenseRepository repository,
    required EvidenceBlobStore blobStore,
    required ExpenseReceiptUploadApi api,
    this.maxRetry = 5,
  }) : _queue = queue,
       _repository = repository,
       _blobStore = blobStore,
       _api = api;

  final SyncQueueRepository _queue;
  final LocalExpenseRepository _repository;
  final EvidenceBlobStore _blobStore;
  final ExpenseReceiptUploadApi _api;
  final int maxRetry;

  Future<ExpenseReceiptSyncResult> uploadTenant(String tenantId) async {
    final uploaded = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];
    final busy = <SyncAction>[];

    // Sem sessão o Pending falharia cada ação com custo: não toca a fila.
    if (_api is PendingExpenseReceiptUploadApi) {
      return ExpenseReceiptSyncResult(
        uploaded: uploaded,
        failed: failed,
        conflicts: conflicts,
        busy: busy,
      );
    }

    await _repository.load();
    final pending = await _queue.pendingForTenant(tenantId);

    for (final action in pending) {
      if (action.type != ExpenseSyncActionTypes.receiptAttach) continue;
      if (action.status == SyncStatus.conflict) continue;
      if (action.retryCount >= maxRetry) continue;

      final reportLocalId = _readString(action.payload['report_local_id']);
      final itemLocalId = _readString(action.payload['item_local_id']);
      final receiptLocalId = _readString(action.payload['receipt_local_id']);
      if (reportLocalId == null ||
          itemLocalId == null ||
          receiptLocalId == null) {
        final next = _conflict(
          action,
          'RECEIPT_ACTION_INCOMPLETE',
          'Comprovante antigo incompleto; anexe de novo pelo item.',
        );
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      // Prontidão: o relatório E o item precisam do id de servidor (nascem no lote JSON).
      // Sem o do relatório, nada muda: o relatório ainda não sincronizado já segura tudo.
      final reportServerId = _repository.serverIdForReport(reportLocalId);
      if (reportServerId == null) continue;
      var itemServerId = _repository.serverIdForItem(
        reportLocalId,
        itemLocalId,
      );
      if (itemServerId == null) {
        // Conserto c1 do #525 (§12.7) — o id do item volta pelo `result_ref` que o LOTE gravou
        // na ação `itemCreate`, aqui no aparelho e sem reenvio (reenviar criaria o item no
        // servidor e mudaria o total do relatório).
        final itemAction = await _itemCreateFor(
          tenantId,
          action,
          reportLocalId,
          itemLocalId,
        );
        if (itemAction == null || itemAction.status == SyncStatus.conflict) {
          // §2(d)5 — sem saída: o item nunca chega ao servidor por esta fila.
          final next = _conflict(
            action,
            'RECEIPT_ITEM_NOT_SYNCED',
            'O item deste comprovante não chegou ao servidor; o comprovante ficou no aparelho.',
          );
          await _queue.update(next);
          conflicts.add(next);
          continue;
        }
        // `pending`, `failed` ou `syncing`: o comprovante espera o lote (o item já segura o envio).
        if (itemAction.status != SyncStatus.synced) continue;
        final resultRef = _readString(itemAction.payload['result_ref']);
        if (resultRef != null && !_isLocalExpenseId(resultRef)) {
          // `synced` COM `result_ref`: o servidor criou o item, e o id persiste no aparelho.
          await _repository.markItemSynced(
            reportLocalId,
            itemLocalId,
            resultRef,
          );
        }
        itemServerId = _repository.serverIdForItem(reportLocalId, itemLocalId);
        if (itemServerId == null) {
          // `synced` SEM `result_ref` ("Versão do gestor" ou a cascata `SUPERSEDED_BY_SERVER`):
          // o servidor nunca criou o item.
          final next = _conflict(
            action,
            'RECEIPT_ITEM_NOT_SYNCED',
            'O item deste comprovante não chegou ao servidor; o comprovante ficou no aparelho.',
          );
          await _queue.update(next);
          conflicts.add(next);
          continue;
        }
      }

      final receipt = _repository.receiptByLocalId(
        reportLocalId,
        itemLocalId,
        receiptLocalId,
      );
      if (receipt == null) {
        final next = _conflict(
          action,
          'RECEIPT_NOT_FOUND',
          'Comprovante não encontrado no aparelho; anexe de novo pelo item.',
        );
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      final blobRef = receipt.localReference;
      final sha256 = receipt.sha256Hash;
      if (blobRef == null || sha256 == null) {
        final next = _conflict(
          action,
          'LOCAL_BLOB_MISSING',
          'Comprovante sem arquivo local; anexe de novo pelo item.',
        );
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      final bytes = await _blobStore.load(blobRef);
      if (bytes == null || bytes.isEmpty || bytes.length != receipt.sizeBytes) {
        final next = _conflict(
          action,
          'LOCAL_BLOB_MISSING',
          'Arquivo do comprovante não pôde ser lido; anexe de novo pelo item.',
        );
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      final syncing = action.copyWith(status: SyncStatus.syncing);
      await _queue.update(syncing);
      await _repository.markReceiptUploadStatus(
        reportLocalId,
        receiptLocalId,
        ReceiptUploadStatus.uploading,
      );

      try {
        final response = await _api.upload(
          ExpenseReceiptUploadRequest(
            reportServerId: reportServerId,
            itemServerId: itemServerId,
            clientActionId: action.clientActionId,
            fileName: receipt.fileName,
            contentType: receipt.mimeType,
            sizeBytes: receipt.sizeBytes,
            sha256: sha256,
            bytes: bytes,
          ),
        );

        if (response.uploadStatus == 'uploaded') {
          final next = syncing.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
          );
          await _queue.update(next);
          await _repository.markReceiptUploaded(
            reportLocalId,
            receiptLocalId,
            serverId: response.receiptId,
          );
          // ÚNICO ponto em que o blob morre: o servidor confirmou o comprovante guardado.
          await _blobStore.delete(blobRef);
          uploaded.add(next);
        } else {
          // Estado que não confirma guarda (ex.: revisão pendente) preserva o blob.
          final next = _conflict(
            action,
            'RECEIPT_STATUS_${response.uploadStatus.toUpperCase()}',
            'O servidor ainda não confirmou este comprovante; ele fica no aparelho.',
          );
          await _queue.update(next);
          await _repository.markReceiptUploadStatus(
            reportLocalId,
            receiptLocalId,
            ReceiptUploadStatus.conflict,
          );
          conflicts.add(next);
        }
      } on ApiServerError catch (error) {
        if (error.statusCode == 503) {
          // Servidor ocupado/scanner indisponível: volta a pendente SEM consumir tentativa.
          final next = syncing.copyWith(
            status: SyncStatus.pending,
            lastErrorCode: 'SYNC_BUSY',
            lastSafeError: 'Servidor ocupado; o envio será refeito.',
          );
          await _queue.update(next);
          await _repository.markReceiptUploadStatus(
            reportLocalId,
            receiptLocalId,
            ReceiptUploadStatus.pending,
          );
          failed.add(next);
          // §13.1 — tentado NESTE passe, terminou no 503 do servidor (e o `pending` já foi
          // gravado): é o único desfecho que solta o envio do relatório no 2º lote.
          busy.add(next);
        } else if (error.statusCode == 413 ||
            error.statusCode == 415 ||
            error.statusCode == 422 ||
            error.statusCode == 404) {
          final next = _conflict(
            action,
            _domainCode(error.statusCode),
            _domainText(error.statusCode),
          );
          await _queue.update(next);
          await _repository.markReceiptUploadStatus(
            reportLocalId,
            receiptLocalId,
            ReceiptUploadStatus.conflict,
          );
          conflicts.add(next);
        } else {
          final next = _failWithRetry(syncing);
          await _queue.update(next);
          await _repository.markReceiptUploadFailed(
            reportLocalId,
            receiptLocalId,
          );
          failed.add(next);
        }
      } on ApiConflictError {
        final next = _conflict(
          action,
          'RECEIPT_PAYLOAD_MISMATCH',
          'Este comprovante já foi recebido com outro conteúdo.',
        );
        await _queue.update(next);
        await _repository.markReceiptUploadStatus(
          reportLocalId,
          receiptLocalId,
          ReceiptUploadStatus.conflict,
        );
        conflicts.add(next);
      } on ApiUnauthorizedError {
        final next = _conflict(
          action,
          'SESSION_FORBIDDEN',
          'Sua sessão não tem permissão para enviar comprovantes. Entre de novo.',
        );
        await _queue.update(next);
        await _repository.markReceiptUploadStatus(
          reportLocalId,
          receiptLocalId,
          ReceiptUploadStatus.conflict,
        );
        conflicts.add(next);
      } on ApiError {
        final next = _failWithRetry(syncing);
        await _queue.update(next);
        await _repository.markReceiptUploadFailed(
          reportLocalId,
          receiptLocalId,
        );
        failed.add(next);
      }
    }

    return ExpenseReceiptSyncResult(
      uploaded: uploaded,
      failed: failed,
      conflicts: conflicts,
      busy: busy,
    );
  }

  SyncAction _conflict(SyncAction action, String code, String text) =>
      action.copyWith(
        status: SyncStatus.conflict,
        lastErrorCode: code,
        lastSafeError: text,
      );

  SyncAction _failWithRetry(SyncAction action) => action.copyWith(
    status: SyncStatus.failed,
    retryCount: action.retryCount + 1,
    lastErrorCode: 'NETWORK_ERROR',
    lastSafeError:
        'Falha de rede no envio do comprovante; será tentado de novo.',
  );

  String _domainCode(int statusCode) => switch (statusCode) {
    413 => 'RECEIPT_FILE_TOO_LARGE',
    415 => 'RECEIPT_UNSUPPORTED_TYPE',
    422 => 'RECEIPT_REJECTED',
    _ => 'EXPENSE_NOT_FOUND',
  };

  String _domainText(int statusCode) => switch (statusCode) {
    413 => 'O arquivo passa de 10 MB; tire a foto de novo em qualidade menor.',
    415 => 'Tipo de arquivo não aceito; use foto (JPEG, PNG, WebP) ou PDF.',
    422 => 'O comprovante foi recusado pela verificação de segurança.',
    _ => 'O relatório deste comprovante não existe mais no servidor.',
  };

  String? _readString(Object? value) {
    if (value is! String) return null;
    final trimmed = value.trim();
    return trimmed.isEmpty ? null : trimmed;
  }

  /// A ação `itemCreate` do item deste comprovante: mesmo relatório, mesmo item e mesmo
  /// usuário da ação do comprovante (§12.7).
  Future<SyncAction?> _itemCreateFor(
    String tenantId,
    SyncAction receiptAction,
    String reportLocalId,
    String itemLocalId,
  ) async {
    for (final candidate in await _queue.actionsForTenant(tenantId)) {
      if (candidate.type != ExpenseSyncActionTypes.itemCreate) continue;
      if (_readString(candidate.payload['report_local_id']) != reportLocalId) {
        continue;
      }
      if (_readString(candidate.payload['local_id']) != itemLocalId) continue;
      if (candidate.userId != receiptAction.userId) continue;
      return candidate;
    }
    return null;
  }

  /// Id local do app (`pc-local-`, `local-`, `tmp-`) não é id de servidor.
  bool _isLocalExpenseId(String value) {
    final normalized = value.trim().toLowerCase();
    return normalized.startsWith('pc-local-') ||
        normalized.startsWith('local-') ||
        normalized.startsWith('tmp-');
  }
}
