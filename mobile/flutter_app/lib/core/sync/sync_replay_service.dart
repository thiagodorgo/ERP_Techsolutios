import 'package:dio/dio.dart';

import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import 'sync_models.dart';
import 'sync_queue_repository.dart';

// ── Result model ──────────────────────────────────────────────────────────────

class SyncActionResult {
  const SyncActionResult({
    required this.clientActionId,
    required this.status,
    this.resultRef,
    this.errorCode,
  });

  final String clientActionId;

  // 'processed' | 'conflict' | 'error'
  final String status;

  // Server-assigned ID for the created/updated entity (present when processed)
  final String? resultRef;

  final String? errorCode;
}

class SyncReplayResult {
  const SyncReplayResult({
    required this.synced,
    required this.failed,
    required this.conflicts,
  });

  final List<SyncAction> synced;
  final List<SyncAction> failed;
  final List<SyncAction> conflicts;
}

// ── Batch API interface + implementations ────────────────────────────────────

abstract class ExpenseSyncBatchApi {
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions);
}

class MockExpenseSyncBatchApi implements ExpenseSyncBatchApi {
  MockExpenseSyncBatchApi({this.results = const [], this.shouldThrow = false});

  final List<SyncActionResult> results;
  final bool shouldThrow;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    if (shouldThrow) throw const ApiNetworkError();
    return results;
  }
}

// Captures the batch passed to sendBatch — useful in tests.
class CaptureBatchApi implements ExpenseSyncBatchApi {
  CaptureBatchApi(this._handler);

  final List<SyncActionResult> Function(List<SyncAction> batch) _handler;
  List<SyncAction>? captured;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    captured = actions;
    return _handler(actions);
  }
}

class DioExpenseSyncBatchApi implements ExpenseSyncBatchApi {
  DioExpenseSyncBatchApi(this._client);

  final Dio _client;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    try {
      final response = await _client.post(
        ExpenseApiEndpoints.mobileExpenseSync,
        data: {'actions': actions.map(_actionToJson).toList()},
      );
      final body = response.data as Map<String, dynamic>;
      final rawResults = body['results'] as List<dynamic>? ?? const [];
      return rawResults
          .map((r) => _resultFromJson(r as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Map<String, Object?> _actionToJson(SyncAction action) {
    return {
      'clientActionId': action.clientActionId,
      'tenantId': action.tenantId,
      'type': action.type,
      'payload': action.payload, // already filtered by _safeReceiptPayload
      'retryCount': action.retryCount,
      'createdAt': action.createdAt.toIso8601String(),
    };
  }

  SyncActionResult _resultFromJson(Map<String, dynamic> json) {
    return SyncActionResult(
      clientActionId: json['clientActionId'] as String,
      status: json['status'] as String,
      resultRef: json['resultRef'] as String?,
      errorCode: json['errorCode'] as String?,
    );
  }
}

// ── Replay service ────────────────────────────────────────────────────────────

class SyncReplayService {
  const SyncReplayService({
    required SyncQueueRepository queue,
    required ExpenseSyncBatchApi api,
    this.maxRetry = 5,
  }) : _queue = queue,
       _api = api;

  final SyncQueueRepository _queue;
  final ExpenseSyncBatchApi _api;
  final int maxRetry;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final eligible = (await _queue.pendingForTenant(
      tenantId,
    )).where((a) => a.retryCount < maxRetry).toList(growable: false);

    if (eligible.isEmpty) {
      return const SyncReplayResult(synced: [], failed: [], conflicts: []);
    }

    // Mark all eligible actions as syncing before the network call
    final syncing = [
      for (final a in eligible) a.copyWith(status: SyncStatus.syncing),
    ];
    for (final a in syncing) {
      await _queue.update(a);
    }

    // Send batch — on any network/server error, fail all actions
    List<SyncActionResult> results;
    try {
      results = await _api.sendBatch(syncing);
    } catch (_) {
      final failed = <SyncAction>[];
      for (final a in syncing) {
        final f = a.copyWith(
          status: SyncStatus.failed,
          retryCount: a.retryCount + 1,
          lastErrorCode: 'NETWORK_ERROR',
          lastSafeError: 'Falha de conexao. Tente novamente.',
        );
        await _queue.update(f);
        failed.add(f);
      }
      return SyncReplayResult(
        synced: const [],
        failed: failed,
        conflicts: const [],
      );
    }

    final resultMap = {for (final r in results) r.clientActionId: r};
    final synced = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];

    for (final a in syncing) {
      final result = resultMap[a.clientActionId];
      final SyncAction next;

      if (result == null) {
        next = a.copyWith(
          status: SyncStatus.failed,
          retryCount: a.retryCount + 1,
          lastErrorCode: 'MISSING_RESULT',
          lastSafeError: 'Acao sem resposta do servidor.',
        );
      } else {
        next = switch (result.status) {
          'processed' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            lastErrorCode: null,
            lastSafeError: null,
            payload: result.resultRef != null
                ? {...a.payload, 'result_ref': result.resultRef}
                : a.payload,
          ),
          'conflict' => a.copyWith(
            status: SyncStatus.conflict,
            lastErrorCode: result.errorCode ?? 'CONFLICT',
            lastSafeError: 'Conflito remoto exige decisao manual.',
          ),
          _ => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_ERROR',
            lastSafeError: 'Erro ao processar acao. Tente novamente.',
          ),
        };
      }

      await _queue.update(next);

      switch (next.status) {
        case SyncStatus.synced:
          synced.add(next);
        case SyncStatus.conflict:
          conflicts.add(next);
        default:
          failed.add(next);
      }
    }

    return SyncReplayResult(
      synced: synced,
      failed: failed,
      conflicts: conflicts,
    );
  }
}

// ── Checklist batch API ───────────────────────────────────────────────────────

abstract class ChecklistSyncBatchApi {
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions);
}

class MockChecklistSyncBatchApi implements ChecklistSyncBatchApi {
  MockChecklistSyncBatchApi({
    this.results = const [],
    this.shouldThrow = false,
  });

  final List<SyncActionResult> results;
  final bool shouldThrow;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    if (shouldThrow) throw const ApiNetworkError();
    return results;
  }
}

// Captures the batch passed to sendBatch — useful in tests.
class CaptureChecklistBatchApi implements ChecklistSyncBatchApi {
  CaptureChecklistBatchApi(this._handler);

  final List<SyncActionResult> Function(List<SyncAction>) _handler;
  List<SyncAction>? captured;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    captured = actions;
    return _handler(actions);
  }
}

// Safe stub: returns empty results until the backend endpoint is available.
class PendingBackendChecklistSyncBatchApi implements ChecklistSyncBatchApi {
  const PendingBackendChecklistSyncBatchApi();

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async =>
      const <SyncActionResult>[];
}

class DioChecklistSyncBatchApi implements ChecklistSyncBatchApi {
  DioChecklistSyncBatchApi(this._client);

  final Dio _client;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    try {
      final response = await _client.post(
        ChecklistApiEndpoints.mobileChecklistSync,
        data: {'actions': actions.map(_checklistActionToJson).toList()},
      );
      final body = response.data as Map<String, dynamic>;
      final rawResults = body['results'] as List<dynamic>? ?? const [];
      return rawResults
          .map((r) => _checklistResultFromJson(r as Map<String, dynamic>))
          .toList(growable: false);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }

  Map<String, Object?> _checklistActionToJson(SyncAction action) => {
    'clientActionId': action.clientActionId,
    'tenantId': action.tenantId,
    'type': action.type,
    'payload': action.payload,
    'retryCount': action.retryCount,
    'createdAt': action.createdAt.toIso8601String(),
  };

  SyncActionResult _checklistResultFromJson(Map<String, dynamic> json) =>
      SyncActionResult(
        clientActionId: json['clientActionId'] as String,
        status: json['status'] as String,
        resultRef: json['resultRef'] as String?,
        errorCode: json['errorCode'] as String?,
      );
}

// ── Checklist replay service ──────────────────────────────────────────────────

const _checklistActionTypes = {
  ChecklistSyncActionTypes.runCreate,
  ChecklistSyncActionTypes.answerUpsert,
  ChecklistSyncActionTypes.runComplete,
  ChecklistSyncActionTypes.markerCreate,
  ChecklistSyncActionTypes.divergenceCreate,
  ChecklistSyncActionTypes.acknowledgementCreate,
  ChecklistSyncActionTypes.attachmentAttach,
};

class ChecklistSyncReplayService {
  const ChecklistSyncReplayService({
    required SyncQueueRepository queue,
    required ChecklistSyncBatchApi api,
    this.maxRetry = 5,
  }) : _queue = queue,
       _api = api;

  final SyncQueueRepository _queue;
  final ChecklistSyncBatchApi _api;
  final int maxRetry;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final all = await _queue.pendingForTenant(tenantId);
    final eligible = all
        .where((a) => _checklistActionTypes.contains(a.type))
        .where((a) => a.retryCount < maxRetry)
        .toList(growable: false);

    if (eligible.isEmpty) {
      return const SyncReplayResult(synced: [], failed: [], conflicts: []);
    }

    final syncing = [
      for (final a in eligible) a.copyWith(status: SyncStatus.syncing),
    ];
    for (final a in syncing) {
      await _queue.update(a);
    }

    List<SyncActionResult> results;
    try {
      results = await _api.sendBatch(syncing);
    } catch (_) {
      final failed = <SyncAction>[];
      for (final a in syncing) {
        final f = a.copyWith(
          status: SyncStatus.failed,
          retryCount: a.retryCount + 1,
          lastErrorCode: 'NETWORK_ERROR',
          lastSafeError: 'Falha de conexao. Tente novamente.',
        );
        await _queue.update(f);
        failed.add(f);
      }
      return SyncReplayResult(
        synced: const [],
        failed: failed,
        conflicts: const [],
      );
    }

    final resultMap = {for (final r in results) r.clientActionId: r};
    final synced = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];

    for (final a in syncing) {
      final result = resultMap[a.clientActionId];
      final SyncAction next;

      if (result == null) {
        next = a.copyWith(
          status: SyncStatus.failed,
          retryCount: a.retryCount + 1,
          lastErrorCode: 'MISSING_RESULT',
          lastSafeError: 'Acao sem resposta do servidor.',
        );
      } else {
        next = switch (result.status) {
          'processed' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            lastErrorCode: null,
            lastSafeError: null,
            payload: result.resultRef != null
                ? {...a.payload, 'result_ref': result.resultRef}
                : a.payload,
          ),
          'conflict' => a.copyWith(
            status: SyncStatus.conflict,
            lastErrorCode: result.errorCode ?? 'CONFLICT',
            lastSafeError: 'Conflito remoto exige decisao manual.',
          ),
          'failed' => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_FAILED',
            lastSafeError: 'Servidor recusou a acao.',
          ),
          'ignored' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
          ),
          _ => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_ERROR',
            lastSafeError: 'Erro ao processar acao. Tente novamente.',
          ),
        };
      }

      await _queue.update(next);

      switch (next.status) {
        case SyncStatus.synced:
          synced.add(next);
        case SyncStatus.conflict:
          conflicts.add(next);
        default:
          failed.add(next);
      }
    }

    return SyncReplayResult(
      synced: synced,
      failed: failed,
      conflicts: conflicts,
    );
  }
}
