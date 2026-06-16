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
      final data = body['data'];
      final dataBody = data is Map<String, dynamic> ? data : null;
      final rawResults =
          dataBody?['results'] as List<dynamic>? ??
          body['results'] as List<dynamic>? ??
          const [];
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
    Set<String>? supportedActionTypes,
  }) : _queue = queue,
       _api = api,
       _supportedActionTypes = supportedActionTypes;

  final SyncQueueRepository _queue;
  final ExpenseSyncBatchApi _api;
  final int maxRetry;
  final Set<String>? _supportedActionTypes;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final eligible = (await _queue.pendingForTenant(tenantId))
        .where((a) => _supportedActionTypes?.contains(a.type) ?? true)
        .where((a) => a.retryCount < maxRetry)
        .toList(growable: false);

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

// ── Work order batch API ─────────────────────────────────────────────────────

abstract class WorkOrderSyncBatchApi {
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions);
}

class MockWorkOrderSyncBatchApi implements WorkOrderSyncBatchApi {
  MockWorkOrderSyncBatchApi({
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

class CaptureWorkOrderBatchApi implements WorkOrderSyncBatchApi {
  CaptureWorkOrderBatchApi(this._handler);

  final List<SyncActionResult> Function(List<SyncAction> batch) _handler;
  List<SyncAction>? captured;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    captured = actions;
    return _handler(actions);
  }
}

class PendingBackendWorkOrderSyncBatchApi implements WorkOrderSyncBatchApi {
  const PendingBackendWorkOrderSyncBatchApi();

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async =>
      const <SyncActionResult>[];
}

class WorkOrderSyncCodec {
  const WorkOrderSyncCodec({String Function()? batchIdFactory})
    : _batchIdFactory = batchIdFactory;

  final String Function()? _batchIdFactory;

  Map<String, Object?> encodeRequest(List<SyncAction> actions) {
    return {
      'client_batch_id': _batchIdFactory?.call() ?? _buildBatchId(actions),
      'actions': actions.map(_encodeAction).toList(growable: false),
    };
  }

  List<SyncActionResult> decodeResponse(Object? rawBody) {
    final outer = _asStringMap(rawBody);
    final data = _asStringMap(outer['data'] ?? outer);
    final results = <SyncActionResult>[
      for (final item in _listOfMaps(data['accepted']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'processed',
            resultRef: _resultRef(item),
          ),
      for (final item in _listOfMaps(
        data['already_applied'] ?? data['alreadyApplied'],
      ))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'ignored',
            resultRef: _resultRef(item),
          ),
      for (final item in _listOfMaps(data['rejected']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'failed',
            errorCode: _errorCode(item) ?? 'WORK_ORDER_REJECTED',
          ),
      for (final item in _listOfMaps(data['conflicts']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'conflict',
            errorCode: _conflictCode(item) ?? 'WORK_ORDER_CONFLICT',
          ),
    ];

    if (results.isNotEmpty) return results;

    final legacy = data['results'] ?? outer['results'];
    return _listOfMaps(legacy)
        .where((item) => _clientActionId(item) != null)
        .map(_legacyResultFromJson)
        .toList(growable: false);
  }

  String _buildBatchId(List<SyncAction> actions) {
    if (actions.isEmpty) return 'work-order-batch-empty';
    final first = actions.first;
    return 'work-order-batch-${first.createdAt.toUtc().millisecondsSinceEpoch}-${first.clientActionId}';
  }

  Map<String, Object?> _encodeAction(SyncAction action) => {
    'client_action_id': action.clientActionId,
    'type': _backendActionType(action),
    'local_created_at': action.createdAt.toUtc().toIso8601String(),
    'payload': _backendPayload(action),
  };

  String _backendActionType(SyncAction action) {
    return switch (action.type) {
      WorkOrderSyncActionTypes.statusUpdate => 'work_order.status_change',
      _ => action.type,
    };
  }

  Map<String, Object?> _backendPayload(SyncAction action) {
    if (action.type != WorkOrderSyncActionTypes.statusUpdate) {
      return const {};
    }

    final source = action.payload;
    final explicitWorkOrderId = _readNonEmptyString(source['work_order_id']);
    final workOrderId =
        _readNonEmptyString(source['server_id']) ??
        (explicitWorkOrderId != null &&
                !_isLocalWorkOrderId(explicitWorkOrderId)
            ? explicitWorkOrderId
            : null);
    final status = _readNonEmptyString(source['new_status']);
    final previousStatus = _readNonEmptyString(source['previous_status']);
    final occurredAt = _readNonEmptyString(source['occurred_at']);
    final localId = _readNonEmptyString(source['local_id']);
    final message = _readNonEmptyString(source['message']);

    final metadata = <String, Object?>{'source': 'mobile_offline'};
    if (localId != null) metadata['local_id'] = localId;
    if (previousStatus != null) {
      metadata['previous_status'] = _backendStatus(previousStatus);
    }
    if (occurredAt != null) metadata['occurred_at'] = occurredAt;

    final payload = <String, Object?>{'metadata': metadata};
    if (workOrderId != null) payload['work_order_id'] = workOrderId;
    if (status != null) payload['status'] = _backendStatus(status);
    if (message != null) payload['message'] = message;

    return Map.unmodifiable(payload);
  }

  String _backendStatus(String status) {
    return switch (status) {
      'scheduled' => 'open',
      'dispatched' => 'assigned',
      'enRoute' => 'on_route',
      'arrived' => 'on_site',
      'inService' => 'in_progress',
      _ => status,
    };
  }

  String? _readNonEmptyString(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  Map<String, dynamic> _asStringMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return const {};
  }

  List<Map<String, dynamic>> _listOfMaps(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  SyncActionResult _legacyResultFromJson(Map<String, dynamic> json) {
    final status = _readNonEmptyString(json['status']) ?? 'failed';
    return SyncActionResult(
      clientActionId: _clientActionId(json)!,
      status: switch (status) {
        'accepted' => 'processed',
        'already_applied' || 'alreadyApplied' => 'ignored',
        'rejected' => 'failed',
        _ => status,
      },
      resultRef:
          _readNonEmptyString(json['resultRef']) ??
          _readNonEmptyString(json['result_ref']),
      errorCode:
          _readNonEmptyString(json['errorCode']) ??
          _readNonEmptyString(json['error_code']),
    );
  }

  String? _clientActionId(Map<String, dynamic> item) =>
      _readNonEmptyString(item['client_action_id']) ??
      _readNonEmptyString(item['clientActionId']);

  String? _resultRef(Map<String, dynamic> item) {
    final serverState = _asStringMap(
      item['server_state'] ?? item['serverState'],
    );
    final workOrder = _asStringMap(
      serverState['work_order'] ?? serverState['workOrder'],
    );
    return _readNonEmptyString(item['result_ref']) ??
        _readNonEmptyString(item['resultRef']) ??
        _readNonEmptyString(serverState['id']) ??
        _readNonEmptyString(serverState['work_order_id']) ??
        _readNonEmptyString(serverState['workOrderId']) ??
        _readNonEmptyString(workOrder['id']);
  }

  String? _errorCode(Map<String, dynamic> item) {
    final error = _asStringMap(item['error']);
    return _readNonEmptyString(error['reason']) ??
        _readNonEmptyString(error['code']) ??
        _readNonEmptyString(item['error_code']) ??
        _readNonEmptyString(item['errorCode']);
  }

  String? _conflictCode(Map<String, dynamic> item) {
    final conflict = _asStringMap(item['conflict']);
    return _readNonEmptyString(conflict['conflict_type']) ??
        _readNonEmptyString(conflict['conflictType']) ??
        _errorCode(item);
  }
}

class DioWorkOrderSyncBatchApi implements WorkOrderSyncBatchApi {
  DioWorkOrderSyncBatchApi(this._client, {WorkOrderSyncCodec? codec})
    : _codec = codec ?? const WorkOrderSyncCodec();

  final Dio _client;
  final WorkOrderSyncCodec _codec;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    try {
      final response = await _client.post(
        WorkOrderApiEndpoints.mobileWorkOrderSync,
        data: _codec.encodeRequest(actions),
      );
      return _codec.decodeResponse(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
}

const b103BackendWorkOrderActionTypes = {WorkOrderSyncActionTypes.statusUpdate};

bool b103WorkOrderActionReadyForBackend(SyncAction action) {
  if (!b103BackendWorkOrderActionTypes.contains(action.type)) {
    return false;
  }

  final serverId = _readBackendWorkOrderId(action.payload['server_id']);
  if (serverId != null) return true;

  final workOrderId = _readBackendWorkOrderId(action.payload['work_order_id']);
  return workOrderId != null && !_isLocalWorkOrderId(workOrderId);
}

String? _readBackendWorkOrderId(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

bool _isLocalWorkOrderId(String value) {
  final normalized = value.trim().toLowerCase();
  return normalized.startsWith('wo-local-') ||
      normalized.startsWith('local-') ||
      normalized.startsWith('tmp-');
}

class WorkOrderSyncReplayService {
  const WorkOrderSyncReplayService({
    required SyncQueueRepository queue,
    required WorkOrderSyncBatchApi api,
    this.maxRetry = 5,
  }) : _queue = queue,
       _api = api;

  final SyncQueueRepository _queue;
  final WorkOrderSyncBatchApi _api;
  final int maxRetry;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final all = await _queue.pendingForTenant(tenantId);
    final eligible = all
        .where((a) => b103BackendWorkOrderActionTypes.contains(a.type))
        .where((a) => a.status != SyncStatus.conflict)
        .where((a) => a.retryCount < maxRetry)
        .where(b103WorkOrderActionReadyForBackend)
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
          'ignored' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            lastErrorCode: null,
            lastSafeError: null,
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

class ChecklistSyncCodec {
  const ChecklistSyncCodec({String Function()? batchIdFactory})
    : _batchIdFactory = batchIdFactory;

  final String Function()? _batchIdFactory;

  Map<String, Object?> encodeRequest(List<SyncAction> actions) {
    return {
      'client_batch_id': _batchIdFactory?.call() ?? _buildBatchId(actions),
      'actions': actions.map(_encodeAction).toList(growable: false),
    };
  }

  List<SyncActionResult> decodeResponse(Object? rawBody) {
    final outer = _asStringMap(rawBody);
    final data = _asStringMap(outer['data'] ?? outer);
    final results = <SyncActionResult>[
      for (final item in _listOfMaps(data['accepted']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'processed',
            resultRef: _resultRef(item),
          ),
      for (final item in _listOfMaps(
        data['already_applied'] ?? data['alreadyApplied'],
      ))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'ignored',
            resultRef: _resultRef(item),
          ),
      for (final item in _listOfMaps(data['rejected']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'failed',
            errorCode: _errorCode(item) ?? 'CHECKLIST_REJECTED',
          ),
      for (final item in _listOfMaps(data['conflicts']))
        if (_clientActionId(item) != null)
          SyncActionResult(
            clientActionId: _clientActionId(item)!,
            status: 'conflict',
            errorCode: _conflictCode(item) ?? 'CHECKLIST_CONFLICT',
          ),
    ];

    if (results.isNotEmpty) return results;

    final legacy = data['results'] ?? outer['results'];
    return _listOfMaps(legacy)
        .where((item) => _clientActionId(item) != null)
        .map(_legacyResultFromJson)
        .toList(growable: false);
  }

  String _buildBatchId(List<SyncAction> actions) {
    if (actions.isEmpty) return 'checklist-batch-empty';
    final first = actions.first;
    return 'checklist-batch-${first.createdAt.toUtc().millisecondsSinceEpoch}-${first.clientActionId}';
  }

  Map<String, Object?> _encodeAction(SyncAction action) => {
    'client_action_id': action.clientActionId,
    'type': _backendActionType(action),
    'local_created_at': action.createdAt.toUtc().toIso8601String(),
    'payload': _backendPayload(action),
  };

  String _backendActionType(SyncAction action) {
    return switch (action.type) {
      ChecklistSyncActionTypes.answerUpsert =>
        _hasAnswerValue(action.payload)
            ? 'checklist.item_answer'
            : _noteOnly(action.payload)
            ? 'checklist.item_note'
            : 'checklist.item_answer',
      ChecklistSyncActionTypes.runComplete => 'checklist.complete',
      _ => action.type,
    };
  }

  Map<String, Object?> _backendPayload(SyncAction action) {
    return switch (action.type) {
      ChecklistSyncActionTypes.answerUpsert => _answerPayload(
        action.payload,
        noteOnly: _noteOnly(action.payload),
      ),
      ChecklistSyncActionTypes.runComplete => _completePayload(action.payload),
      _ => _sanitizeMap(action.payload),
    };
  }

  Map<String, Object?> _answerPayload(
    Map<String, Object?> source, {
    required bool noteOnly,
  }) {
    final metadata = <String, Object?>{
      'source': 'mobile_offline',
      if (_readNonEmptyString(source['answered_at']) != null)
        'answered_at': _readNonEmptyString(source['answered_at']),
      if (_readNonEmptyString(source['local_run_id']) != null)
        'local_run_id': _readNonEmptyString(source['local_run_id']),
    };
    final observation = _readNonEmptyString(source['observation_text']);
    if (!noteOnly && observation != null) {
      metadata['note'] = observation;
    }

    final payload = <String, Object?>{
      'run_id':
          _readNonEmptyString(source['server_run_id']) ??
          _readNonEmptyString(source['run_id']),
      'component_id':
          _readNonEmptyString(source['component_id']) ??
          _readNonEmptyString(source['field_id']),
      'metadata': metadata,
    };

    if (noteOnly) {
      payload['note'] = observation;
    } else {
      payload['value'] = _extractAnswerValue(source);
    }

    return Map.unmodifiable(payload..removeWhere((_, value) => value == null));
  }

  Map<String, Object?> _completePayload(Map<String, Object?> source) {
    final metadata = <String, Object?>{
      if (_readNonEmptyString(source['completed_at']) != null)
        'completed_at': _readNonEmptyString(source['completed_at']),
      if (source['answer_count'] is num) 'answer_count': source['answer_count'],
      if (_readNonEmptyString(source['local_run_id']) != null)
        'local_run_id': _readNonEmptyString(source['local_run_id']),
    };

    return Map.unmodifiable(
      {
        'run_id':
            _readNonEmptyString(source['server_run_id']) ??
            _readNonEmptyString(source['run_id']),
        'has_divergence': source['has_divergence'] == true,
        'metadata': metadata,
      }..removeWhere((_, value) => value == null),
    );
  }

  bool _noteOnly(Map<String, Object?> payload) {
    return !_hasAnswerValue(payload) &&
        _readNonEmptyString(payload['observation_text']) != null;
  }

  bool _hasAnswerValue(Map<String, Object?> payload) =>
      _extractAnswerValue(payload) != null;

  Object? _extractAnswerValue(Map<String, Object?> payload) {
    if (payload.containsKey('bool_value')) return payload['bool_value'];
    if (payload.containsKey('number_value')) return payload['number_value'];
    if (_readNonEmptyString(payload['choice_value']) != null) {
      return _readNonEmptyString(payload['choice_value']);
    }
    final multi = payload['multi_choice_values'];
    if (multi is List && multi.isNotEmpty) return List<Object?>.from(multi);
    if (_readNonEmptyString(payload['text_value']) != null) {
      return _readNonEmptyString(payload['text_value']);
    }
    return null;
  }

  Map<String, Object?> _sanitizeMap(Map<String, Object?> source) {
    final result = <String, Object?>{};
    for (final entry in source.entries) {
      if (_isForbiddenKey(entry.key)) continue;
      final value = _sanitizeValue(entry.value);
      if (value != null) result[entry.key] = value;
    }
    return Map.unmodifiable(result);
  }

  Object? _sanitizeValue(Object? value) {
    if (value is Map) {
      return _sanitizeMap(Map<String, Object?>.from(value));
    }
    if (value is List) {
      return value.map(_sanitizeValue).whereType<Object>().toList();
    }
    return value;
  }

  bool _isForbiddenKey(String key) {
    final normalized = key.toLowerCase();
    return normalized == 'tenantid' ||
        normalized == 'tenant_id' ||
        normalized == 'accesstoken' ||
        normalized == 'authorization' ||
        normalized == 'token' ||
        normalized == 'path' ||
        normalized == 'local_path' ||
        normalized == 'base64' ||
        normalized == 'file_data' ||
        normalized == 'binary' ||
        normalized == 'bearer';
  }

  String? _readNonEmptyString(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  Map<String, dynamic> _asStringMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return const {};
  }

  List<Map<String, dynamic>> _listOfMaps(Object? value) {
    if (value is! List) return const [];
    return value
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList(growable: false);
  }

  SyncActionResult _legacyResultFromJson(Map<String, dynamic> json) {
    return SyncActionResult(
      clientActionId: _clientActionId(json)!,
      status: _readNonEmptyString(json['status']) ?? 'failed',
      resultRef:
          _readNonEmptyString(json['resultRef']) ??
          _readNonEmptyString(json['result_ref']),
      errorCode:
          _readNonEmptyString(json['errorCode']) ??
          _readNonEmptyString(json['error_code']),
    );
  }

  String? _clientActionId(Map<String, dynamic> item) =>
      _readNonEmptyString(item['client_action_id']) ??
      _readNonEmptyString(item['clientActionId']);

  String? _resultRef(Map<String, dynamic> item) {
    final serverState = _asStringMap(
      item['server_state'] ?? item['serverState'],
    );
    final run = _asStringMap(serverState['run']);
    return _readNonEmptyString(item['result_ref']) ??
        _readNonEmptyString(item['resultRef']) ??
        _readNonEmptyString(serverState['id']) ??
        _readNonEmptyString(run['id']);
  }

  String? _errorCode(Map<String, dynamic> item) {
    final error = _asStringMap(item['error']);
    return _readNonEmptyString(error['reason']) ??
        _readNonEmptyString(error['code']) ??
        _readNonEmptyString(item['error_code']) ??
        _readNonEmptyString(item['errorCode']);
  }

  String? _conflictCode(Map<String, dynamic> item) {
    final conflict = _asStringMap(item['conflict']);
    return _readNonEmptyString(conflict['conflict_type']) ??
        _readNonEmptyString(conflict['conflictType']) ??
        _errorCode(item);
  }
}

class DioChecklistSyncBatchApi implements ChecklistSyncBatchApi {
  DioChecklistSyncBatchApi(this._client, {ChecklistSyncCodec? codec})
    : _codec = codec ?? const ChecklistSyncCodec();

  final Dio _client;
  final ChecklistSyncCodec _codec;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    try {
      final response = await _client.post(
        ChecklistApiEndpoints.mobileChecklistSync,
        data: _codec.encodeRequest(actions),
      );
      return _codec.decodeResponse(response.data);
    } on DioException catch (e) {
      throw mapDioError(e);
    }
  }
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

const b102BackendChecklistActionTypes = {
  ChecklistSyncActionTypes.answerUpsert,
  ChecklistSyncActionTypes.runComplete,
};

bool b102ChecklistActionReadyForBackend(SyncAction action) {
  if (!b102BackendChecklistActionTypes.contains(action.type)) {
    return false;
  }

  final serverRunId = _readBackendRunId(action.payload['server_run_id']);
  if (serverRunId != null) return true;

  final runId = _readBackendRunId(action.payload['run_id']);
  return runId != null && !runId.startsWith('clrun-local-');
}

String? _readBackendRunId(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

class ChecklistSyncReplayService {
  const ChecklistSyncReplayService({
    required SyncQueueRepository queue,
    required ChecklistSyncBatchApi api,
    this.maxRetry = 5,
    Set<String>? supportedActionTypes,
    bool Function(SyncAction action)? extraEligibility,
  }) : _queue = queue,
       _api = api,
       _supportedActionTypes = supportedActionTypes ?? _checklistActionTypes,
       _extraEligibility = extraEligibility;

  final SyncQueueRepository _queue;
  final ChecklistSyncBatchApi _api;
  final int maxRetry;
  final Set<String> _supportedActionTypes;
  final bool Function(SyncAction action)? _extraEligibility;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final all = await _queue.pendingForTenant(tenantId);
    final eligible = all
        .where((a) => _supportedActionTypes.contains(a.type))
        .where((a) => a.status != SyncStatus.conflict)
        .where((a) => a.retryCount < maxRetry)
        .where((a) => _extraEligibility?.call(a) ?? true)
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
