import 'package:dio/dio.dart';

import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import '../network/work_order_api_codec.dart';
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

typedef WorkOrderSyncEntityUpdater =
    Future<void> Function(
      SyncAction action,
      SyncActionResult result,
      SyncStatus status,
    );

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
  DioExpenseSyncBatchApi(this._client, {this.batchSize = 1});

  final Dio _client;
  final int batchSize;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    final results = <SyncActionResult>[];
    for (var start = 0; start < actions.length; start += batchSize) {
      final end = (start + batchSize).clamp(0, actions.length);
      final chunk = actions.sublist(start, end);
      results.addAll(await _sendChunk(chunk));
    }
    return results;
  }

  Future<List<SyncActionResult>> _sendChunk(List<SyncAction> actions) async {
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
      final status = e.response?.statusCode;
      final reason = _expenseErrorReason(e.response?.data);
      if (status != null && reason != null && _isExpenseDomainRefusal(status)) {
        throw ExpenseSyncDomainError(status, reason);
      }
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

String? _expenseErrorReason(Object? data) {
  if (data is! Map) return null;
  final error = data['error'];
  if (error is! Map) return null;
  final reason = error['reason'];
  return reason is String && reason.trim().isNotEmpty ? reason.trim() : null;
}

/// Só a recusa de DOMÍNIO (4xx decidido pelo servidor) vira conflito por código.
/// Indisponibilidade (5xx, inclusive o 503 `sync_busy`), sessão (401/403) e
/// limite de transporte (408/429) seguem `mapDioError`: o 503 volta a pendente
/// sem gastar tentativa, 401/403 vira "sessão sem permissão", o resto tenta de novo.
bool _isExpenseDomainRefusal(int status) =>
    status >= 400 &&
    status < 500 &&
    status != 401 &&
    status != 403 &&
    status != 408 &&
    status != 429;

class PendingBackendExpenseSyncBatchApi implements ExpenseSyncBatchApi {
  const PendingBackendExpenseSyncBatchApi();

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async =>
      const [];
}

class SessionlessExpenseSyncBatchApi implements ExpenseSyncBatchApi {
  const SessionlessExpenseSyncBatchApi();

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async =>
      const [];
}

class ExpenseSyncDomainError implements Exception {
  const ExpenseSyncDomainError(this.statusCode, this.reasonCode);

  final int statusCode;
  final String? reasonCode;
}

typedef ExpenseSyncEntityUpdater =
    Future<void> Function(
      SyncAction action,
      SyncActionResult result,
      SyncStatus status,
    );

/// B-RDV-COMPROVANTE (conserto c1 do #525, §12.6 e §13.1) — quais comprovantes deixam de
/// segurar o envio do relatório NESTE passe. A liberação é POR AÇÃO: não existe construtor
/// que solte o tenant inteiro.
class ReceiptRelease {
  const ReceiptRelease.none() : busyIds = const <String>{};
  const ReceiptRelease.busy(this.busyIds);

  /// `clientActionId` dos comprovantes tentados NESTE passe que receberam 503 do servidor.
  final Set<String> busyIds;
}

class SyncReplayService {
  const SyncReplayService({
    required SyncQueueRepository queue,
    required ExpenseSyncBatchApi api,
    this.maxRetry = 5,
    Set<String>? supportedActionTypes,
    ExpenseSyncEntityUpdater? entityUpdater,
    String? Function(String reportLocalId)? serverIdForReport,
  }) : _queue = queue,
       _api = api,
       _supportedActionTypes = supportedActionTypes,
       _entityUpdater = entityUpdater,
       _serverIdForReport = serverIdForReport;

  final SyncQueueRepository _queue;
  final ExpenseSyncBatchApi _api;
  final int maxRetry;
  final Set<String>? _supportedActionTypes;
  final ExpenseSyncEntityUpdater? _entityUpdater;
  final String? Function(String reportLocalId)? _serverIdForReport;

  bool get channelOff => _api is PendingBackendExpenseSyncBatchApi;

  /// O lote de despesa SEM liberação: nenhum comprovante deixa de segurar o envio do
  /// relatório (é o 1º lote do passe, conserto c1 do #525, §12.6 e §13.1).
  Future<SyncReplayResult> replayTenant(String tenantId) =>
      replayTenantReleasing(tenantId, const ReceiptRelease.none());

  /// O lote de despesa com [release]: os comprovantes que, NESTE passe, deixam de segurar
  /// o envio do relatório (o 2º lote de `runExpenseSyncPass`). É um método irmão, e não um
  /// parâmetro nomeado de [replayTenant], porque subclasses de teste sobrescrevem
  /// `replayTenant(String)` e um parâmetro novo quebraria a sobrescrita.
  Future<SyncReplayResult> replayTenantReleasing(
    String tenantId,
    ReceiptRelease release,
  ) async {
    if (channelOff || _api is SessionlessExpenseSyncBatchApi) {
      return const SyncReplayResult(synced: [], failed: [], conflicts: []);
    }

    final first = await _replayPass(tenantId, release);
    final createdReport = first.synced.any(
      (action) => action.type == ExpenseSyncActionTypes.reportCreate,
    );
    if (!createdReport) return first;

    final second = await _replayPass(tenantId, release);
    return SyncReplayResult(
      synced: [...first.synced, ...second.synced],
      failed: [...first.failed, ...second.failed],
      conflicts: [...first.conflicts, ...second.conflicts],
    );
  }

  Future<SyncReplayResult> _replayPass(
    String tenantId,
    ReceiptRelease release,
  ) async {
    final pending = await _queue.pendingForTenant(tenantId);

    final synced = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];
    final eligible = <SyncAction>[];

    for (final action in pending) {
      if (action.status == SyncStatus.conflict) continue;

      if (action.type == ExpenseSyncActionTypes.receiptAttach) {
        // B-RDV-COMPROVANTE: com o canal multipart LIGADO (o conjunto suportado
        // contem o tipo), o comprovante NAO e deste replay — fica pendente para
        // o expense_receipt_sync. Sem o canal (conjunto antigo/nulo), conflito
        // visivel como antes.
        final receiptChannelOn =
            _supportedActionTypes?.contains(
              ExpenseSyncActionTypes.receiptAttach,
            ) ??
            false;
        if (receiptChannelOn) continue;
        final next = action.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: 'UNSUPPORTED_ACTION',
          lastSafeError:
              'Comprovante fica no aparelho até a integração de comprovantes; '
              'Versão do gestor encerra este item.',
        );
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      if (!(_supportedActionTypes?.contains(action.type) ?? true)) continue;
      if (action.retryCount >= maxRetry) continue;

      if (action.type == ExpenseSyncActionTypes.itemCreate &&
          _readString(action.payload['report_local_id']) != null &&
          _readString(action.payload['category_key']) == null) {
        final next = _domainConflict(action, 'LEGACY_ITEM_INCOMPLETE');
        await _queue.update(next);
        conflicts.add(next);
        continue;
      }

      final prepared = await _prepareForBackend(tenantId, action, release);
      if (prepared == null) continue;
      eligible.add(prepared);
    }

    if (eligible.isEmpty) {
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    }

    // Um único lote por passada, na ordem em que as ações vieram da fila.
    final syncing = [
      for (final action in eligible)
        action.copyWith(status: SyncStatus.syncing),
    ];
    for (final action in syncing) {
      await _queue.update(action);
    }

    List<SyncActionResult> results;
    try {
      results = await _api.sendBatch(syncing);
    } on ApiServerError catch (error) {
      if (error.statusCode == 503) {
        for (final action in syncing) {
          final next = action.copyWith(
            status: SyncStatus.pending,
            lastErrorCode: 'SYNC_BUSY',
            lastSafeError: 'Servidor ocupado; o envio será refeito.',
          );
          await _queue.update(next);
        }
        return SyncReplayResult(
          synced: synced,
          failed: failed,
          conflicts: conflicts,
        );
      }
      if (error.statusCode == 422 || error.statusCode == 404) {
        for (final action in syncing) {
          final next = _domainConflict(action, 'EXPENSE_NOT_FOUND');
          await _queue.update(next);
          conflicts.add(next);
        }
        return SyncReplayResult(
          synced: synced,
          failed: failed,
          conflicts: conflicts,
        );
      }
      for (final action in syncing) {
        final next = _failWithRetry(action);
        await _queue.update(next);
        failed.add(next);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    } on ApiUnauthorizedError catch (_) {
      for (final action in syncing) {
        final next = action.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: 'SESSION_FORBIDDEN',
          lastSafeError:
              'Sua sessão não tem permissão para enviar despesas. '
              'Entre de novo e use Minha versão.',
        );
        await _queue.update(next);
        conflicts.add(next);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    } on ApiConflictError catch (_) {
      for (final action in syncing) {
        final next = _domainConflict(action, 'STATUS_NOT_EDITABLE');
        await _queue.update(next);
        conflicts.add(next);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    } on ExpenseSyncDomainError catch (error) {
      for (final action in syncing) {
        final next = _domainConflict(action, error.reasonCode);
        await _queue.update(next);
        conflicts.add(next);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    } on ApiError catch (_) {
      for (final action in syncing) {
        final next = _failWithRetry(action);
        await _queue.update(next);
        failed.add(next);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    }

    final resultMap = {for (final r in results) r.clientActionId: r};

    for (final action in syncing) {
      final result = resultMap[action.clientActionId];
      final SyncAction next;

      if (result == null) {
        next = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          lastErrorCode: 'MISSING_RESULT',
          lastSafeError: 'Ação sem resposta do servidor.',
        );
      } else {
        next = switch (result.status) {
          'processed' => action.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            clearLastErrorCode: true,
            clearLastSafeError: true,
            payload: result.resultRef != null
                ? {...action.payload, 'result_ref': result.resultRef}
                : action.payload,
          ),
          'conflict' => action.copyWith(
            status: SyncStatus.conflict,
            lastErrorCode: result.errorCode ?? 'CONFLICT',
            lastSafeError: _expenseConflictText(result.errorCode),
          ),
          'ignored' => action.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            clearLastErrorCode: true,
            clearLastSafeError: true,
            payload: result.resultRef != null
                ? {...action.payload, 'result_ref': result.resultRef}
                : action.payload,
          ),
          _ => action.copyWith(
            status: SyncStatus.failed,
            retryCount: action.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_ERROR',
            lastSafeError: 'Erro ao processar ação. Tente novamente.',
          ),
        };
      }

      await _queue.update(next);

      if (action.type == ExpenseSyncActionTypes.reportCreate &&
          next.status == SyncStatus.synced &&
          result?.resultRef != null) {
        await _entityUpdater?.call(action, result!, next.status);
        await _mapDependentReportActions(
          tenantId: tenantId,
          reportLocalId: _readString(action.payload['local_id']),
          serverId: result!.resultRef!,
        );
      } else if (action.type == ExpenseSyncActionTypes.itemCreate &&
          next.status == SyncStatus.synced &&
          result?.resultRef != null) {
        await _entityUpdater?.call(action, result!, next.status);
      }

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

  Future<SyncAction?> _prepareForBackend(
    String tenantId,
    SyncAction action,
    ReceiptRelease release,
  ) async {
    if (action.type == ExpenseSyncActionTypes.reportCreate) {
      return action;
    }

    if (action.type != ExpenseSyncActionTypes.itemCreate &&
        action.type != ExpenseSyncActionTypes.reportSubmit) {
      return null;
    }

    final reportLocalId = _readString(action.payload['report_local_id']);
    if (reportLocalId == null) {
      // Ação sintética/legada sem âncora de relatório: preserva o lote antigo.
      return action;
    }

    if (action.type == ExpenseSyncActionTypes.reportSubmit &&
        await _hasUnsyncedDependents(tenantId, reportLocalId, release)) {
      // Adiado: sem gastar tentativa e sem mudar estado (sai num lote seguinte).
      return null;
    }

    final existingReportId = _readString(action.payload['report_id']);
    if (existingReportId != null && !_isLocalExpenseId(existingReportId)) {
      return action;
    }

    final resolved = _serverIdForReport?.call(reportLocalId);
    if (resolved == null || _isLocalExpenseId(resolved)) return null;

    return action.copyWith(payload: {...action.payload, 'report_id': resolved});
  }

  /// O envio do relatório espera os dependentes do MESMO `report_local_id`: todo item que não
  /// esteja `synced` e todo comprovante que segure o envio pelo predicado `_receiptHoldsSubmit`
  /// (B-RDV-COMPROVANTE, conserto c1, §12.6 e §13.1).
  Future<bool> _hasUnsyncedDependents(
    String tenantId,
    String reportLocalId,
    ReceiptRelease release,
  ) async {
    final actions = await _queue.actionsForTenant(tenantId);
    for (final action in actions) {
      if (_readString(action.payload['report_local_id']) != reportLocalId) {
        continue;
      }
      if (action.type == ExpenseSyncActionTypes.itemCreate) {
        if (action.status != SyncStatus.synced) return true;
        continue;
      }
      if (action.type == ExpenseSyncActionTypes.receiptAttach &&
          _receiptHoldsSubmit(action, release)) {
        return true;
      }
    }
    return false;
  }

  /// §13.1 — o comprovante segura o envio do relatório, salvo três saídas. Nenhuma ação da
  /// fila nasce `local`; `pending`, `failed` (esgotado inclusive: só sai pelo "Tentar de
  /// novo") e `syncing` seguram.
  bool _receiptHoldsSubmit(SyncAction r, ReceiptRelease release) {
    // L1 — subiu
    if (r.status == SyncStatus.synced) return false;
    // L2 — recusado: não tem saída no app
    if (r.status == SyncStatus.conflict) return false;
    // L4 — tentado neste passe, terminou em 503
    if (release.busyIds.contains(r.clientActionId)) return false;
    // L5 — não tentado, em curso, falhou, esgotado: segura
    return true;
  }

  bool _isLocalExpenseId(String value) {
    final normalized = value.trim().toLowerCase();
    return normalized.startsWith('pc-local-') ||
        normalized.startsWith('local-') ||
        normalized.startsWith('tmp-');
  }

  SyncAction _failWithRetry(SyncAction action) {
    return action.copyWith(
      status: SyncStatus.failed,
      retryCount: action.retryCount + 1,
      lastErrorCode: 'NETWORK_ERROR',
      lastSafeError: 'Falha de conexão. Tente novamente.',
    );
  }

  SyncAction _domainConflict(SyncAction action, String? reason) {
    return action.copyWith(
      status: SyncStatus.conflict,
      lastErrorCode: reason ?? 'CONFLICT',
      lastSafeError: _domainConflictText(reason),
    );
  }

  Future<void> _mapDependentReportActions({
    required String tenantId,
    required String? reportLocalId,
    required String serverId,
  }) async {
    if (reportLocalId == null || reportLocalId.trim().isEmpty) return;
    if (serverId.trim().isEmpty) return;

    final actions = await _queue.actionsForTenant(tenantId);
    for (final action in actions) {
      if (action.type != ExpenseSyncActionTypes.itemCreate &&
          action.type != ExpenseSyncActionTypes.reportSubmit) {
        continue;
      }
      if (_readString(action.payload['report_local_id']) != reportLocalId) {
        continue;
      }
      if (_readString(action.payload['report_id']) != null) continue;

      await _queue.update(
        action.copyWith(payload: {...action.payload, 'report_id': serverId}),
      );
    }
  }
}

String? _readString(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

String _expenseConflictText(String? code) {
  return switch (code) {
    'action_owned_by_other_actor' =>
      'Este lançamento já foi enviado por outro usuário.',
    'payload_mismatch' => 'Este lançamento já foi recebido com outro conteúdo.',
    'receipt_unverifiable' ||
    'receipt_ambiguous' ||
    'legacy_payload_unverifiable' =>
      'O servidor não consegue confirmar este lançamento antigo; decida manualmente.',
    _ => 'Conflito remoto exige decisão manual.',
  };
}

String _domainConflictText(String? reason) {
  return switch (reason) {
    'status_not_editable' ||
    'locked' => 'Este lançamento não pode mais ser alterado no servidor.',
    'empty_report' =>
      'Este relatório está vazio; adicione um item antes de enviar.',
    'work_order_not_found' =>
      'A ordem de serviço associada não foi encontrada.',
    'unsupported_action' => 'Este tipo de envio ainda não é suportado.',
    'EXPENSE_NOT_FOUND' => 'Este lançamento não foi encontrado no servidor.',
    'LEGACY_ITEM_INCOMPLETE' => 'Lançamento antigo incompleto; refaça o item.',
    _ => 'O servidor recusou este lançamento.',
  };
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
            resultRef: _resultRef(item),
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
    return switch (action.type) {
      WorkOrderSyncActionTypes.create => _createPayload(action.payload),
      WorkOrderSyncActionTypes.statusUpdate => _statusPayload(action.payload),
      WorkOrderSyncActionTypes.assign => _assignPayload(action.payload),
      WorkOrderSyncActionTypes.approvalRequest => _approvalPayload(
        action.payload,
      ),
      WorkOrderSyncActionTypes.unableToStart => _unableToStartPayload(
        action.payload,
      ),
      _ => const {},
    };
  }

  Map<String, Object?> _createPayload(Map<String, Object?> source) {
    final localId = _readNonEmptyString(source['local_id']);
    final title = _readNonEmptyString(source['title']);
    final customerName = _readNonEmptyString(source['customer_name']);
    final serviceAddress = _readNonEmptyString(source['service_address']);
    final scheduledAt = _readNonEmptyString(source['scheduled_at']);
    final description = _readNonEmptyString(source['description']);
    final priority = _readNonEmptyString(source['priority']);

    return Map.unmodifiable(
      <String, Object?>{
        'client_id': localId,
        'title': title,
        'description': description,
        'customer_name': customerName,
        'service_address': serviceAddress,
        'priority': priority == null ? null : _backendPriority(priority),
        'scheduled_at': scheduledAt,
        'metadata': const {'source': 'mobile_local_create'},
      }..removeWhere((_, value) => value == null),
    );
  }

  Map<String, Object?> _statusPayload(Map<String, Object?> source) {
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
    // B-SAN3-26 — os 2 caracteres da placa digitados na chegada; o servidor confere (só `last_digits`, string).
    final checkinConfirmation = _checkinConfirmationPayload(
      source['checkin_confirmation'],
    );
    if (checkinConfirmation != null) {
      payload['checkin_confirmation'] = checkinConfirmation;
    }

    return Map.unmodifiable(payload);
  }

  Map<String, Object?>? _checkinConfirmationPayload(Object? value) {
    if (value is! Map) return null;
    final lastDigits = value['last_digits'];
    if (lastDigits is! String) return null;
    return Map.unmodifiable(<String, Object?>{'last_digits': lastDigits});
  }

  // D1 (seleção viatura/equipe): assign carrega operator_id (obrigatório no
  // backend) + vehicle_id/team_id opcionais. tenant/token/path nunca vão no
  // payload — apenas os campos permitidos.
  //
  // B-O6R-11d (Q1 = A, `D-DONO-TODAS-RECOMENDACOES-1111`) — sem `user_id`, o servidor apagava o usuário atribuído da
  // OS (CL11D-02); e o técnico que a ação carrega é o que o aparelho conhecia QUANDO a enfileirou. Por isso a ação
  // manda `user_id` e DECLARA `expected_technician_id`: se a gestão trocou o técnico antes do envio, o servidor
  // responde conflito (`technician_changed_since_action`), e a ação fica em conflito para decisão manual (B-107).
  // A derivação é na hora do envio, e cobre também as ações já enfileiradas (o repositório não muda).
  Map<String, Object?> _assignPayload(Map<String, Object?> source) {
    final explicitWorkOrderId = _readNonEmptyString(source['work_order_id']);
    final workOrderId =
        _readNonEmptyString(source['server_id']) ??
        (explicitWorkOrderId != null &&
                !_isLocalWorkOrderId(explicitWorkOrderId)
            ? explicitWorkOrderId
            : null);
    final operatorId = _readNonEmptyString(source['operator_id']);
    final userId = _readNonEmptyString(source['user_id']) ?? operatorId;
    final vehicleId = _readNonEmptyString(source['vehicle_id']);
    final teamId = _readNonEmptyString(source['team_id']);
    final message = _readNonEmptyString(source['message']);
    final localId = _readNonEmptyString(source['local_id']);
    final occurredAt = _readNonEmptyString(source['occurred_at']);

    final metadata = <String, Object?>{'source': 'mobile_offline'};
    if (localId != null) metadata['local_id'] = localId;
    if (occurredAt != null) metadata['occurred_at'] = occurredAt;

    final payload = <String, Object?>{'metadata': metadata};
    if (workOrderId != null) payload['work_order_id'] = workOrderId;
    if (operatorId != null) payload['operator_id'] = operatorId;
    if (userId != null) payload['user_id'] = userId;
    if (userId != null) payload['expected_technician_id'] = userId;
    if (vehicleId != null) payload['vehicle_id'] = vehicleId;
    if (teamId != null) payload['team_id'] = teamId;
    if (message != null) payload['message'] = message;

    return Map.unmodifiable(payload);
  }

  // B-SAN3-16 (P1) — o pedido de aprovação sai com a LISTA FECHADA do contrato `2026-11-14.b-san3-16`: a OS, o
  // motivo, o impacto e a urgência, mais os metadados de origem. Nunca `requested_by_user_id`, organização, token ou
  // caminho (§2.8: o ator vem do token). O texto é cortado nos limites do contrato (CRIT16-02 (a)); a linha do tempo
  // local guarda o texto inteiro.
  Map<String, Object?> _approvalPayload(Map<String, Object?> source) {
    final explicitWorkOrderId = _readNonEmptyString(source['work_order_id']);
    final workOrderId =
        _readNonEmptyString(source['server_id']) ??
        (explicitWorkOrderId != null &&
                !_isLocalWorkOrderId(explicitWorkOrderId)
            ? explicitWorkOrderId
            : null);
    final localId = _readNonEmptyString(source['local_id']);
    final requestedAt = _readNonEmptyString(source['requested_at']);

    final metadata = <String, Object?>{'source': 'mobile_offline'};
    if (localId != null) metadata['local_id'] = localId;
    if (requestedAt != null) metadata['requested_at'] = requestedAt;

    return Map.unmodifiable(
      <String, Object?>{
        'work_order_id': workOrderId,
        'reason': _cut(source['reason'], 500),
        'impact': _cut(source['impact'], 1000),
        'urgency': _readNonEmptyString(source['urgency']),
        'metadata': metadata,
      }..removeWhere((_, value) => value == null),
    );
  }

  // B-SAN3-16 (P1) — o "não consegui iniciar" sai com a OS, o motivo e a observação, mais os metadados de origem.
  // Nunca `reported_by_user_id`. Motivo até 200 e observação até 1000.
  Map<String, Object?> _unableToStartPayload(Map<String, Object?> source) {
    final explicitWorkOrderId = _readNonEmptyString(source['work_order_id']);
    final workOrderId =
        _readNonEmptyString(source['server_id']) ??
        (explicitWorkOrderId != null &&
                !_isLocalWorkOrderId(explicitWorkOrderId)
            ? explicitWorkOrderId
            : null);
    final localId = _readNonEmptyString(source['local_id']);
    final occurredAt = _readNonEmptyString(source['occurred_at']);

    final metadata = <String, Object?>{'source': 'mobile_offline'};
    if (localId != null) metadata['local_id'] = localId;
    if (occurredAt != null) metadata['occurred_at'] = occurredAt;

    return Map.unmodifiable(
      <String, Object?>{
        'work_order_id': workOrderId,
        'reason': _cut(source['reason'], 200),
        'note': _cut(source['note'], 1000),
        'metadata': metadata,
      }..removeWhere((_, value) => value == null),
    );
  }

  // B-SAN3-16 — corta o texto no limite do contrato sem partir um par substituto (UTF-16) ao meio. O servidor conta o
  // tamanho na mesma unidade (`String.length`/`length` nos dois lados); vazio não viaja.
  String? _cut(Object? value, int max) {
    final text = _readNonEmptyString(value);
    if (text == null || text.length <= max) return text;
    final last = text.codeUnitAt(max - 1);
    final end = last >= 0xD800 && last <= 0xDBFF ? max - 1 : max;
    return text.substring(0, end);
  }

  String _backendPriority(String priority) {
    return switch (priority) {
      'normal' => 'medium',
      'critical' => 'urgent',
      _ => priority,
    };
  }

  // B-O6R-11d — a fila fala o vocabulário do backend pelo codec único, com o resultado IDÊNTICO ao de d5ec1696 para
  // os 12 status (T10, T10b). O que não tem tradução segue cru (`P-MOBILE-CODEC-FILA-STATUS-CRU`, `B-SAN3-16`).
  String _backendStatus(String status) => workOrderStatusNameToApi(status);

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
    final conflict = _asStringMap(item['conflict']);
    return _readNonEmptyString(item['result_ref']) ??
        _readNonEmptyString(item['resultRef']) ??
        _readNonEmptyString(item['work_order_id']) ??
        _readNonEmptyString(item['workOrderId']) ??
        _readNonEmptyString(conflict['server_id']) ??
        _readNonEmptyString(conflict['serverId']) ??
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

const b107BackendWorkOrderActionTypes = {
  WorkOrderSyncActionTypes.create,
  WorkOrderSyncActionTypes.statusUpdate,
  // D1 (seleção viatura/equipe): assign é replay-elegível (precisa de serverId
  // real + operator_id).
  WorkOrderSyncActionTypes.assign,
  // B-SAN3-16 (item 5) — os 2 pedidos do técnico: dependentes da OS no servidor (saem depois do `create`), com motivo.
  WorkOrderSyncActionTypes.approvalRequest,
  WorkOrderSyncActionTypes.unableToStart,
};

// B-SAN3-16 — o grupo dos dependentes do replay de OS é DERIVADO do conjunto (todo tipo de envio menos a criação): tipo
// novo no conjunto entra no grupo sem uma segunda lista para esquecer.
final _dependentWorkOrderActionTypes = b107BackendWorkOrderActionTypes
    .difference(const {WorkOrderSyncActionTypes.create});

const b103BackendWorkOrderActionTypes = b107BackendWorkOrderActionTypes;

bool b103WorkOrderActionReadyForBackend(SyncAction action) {
  if (!b107BackendWorkOrderActionTypes.contains(action.type)) {
    return false;
  }

  if (action.type == WorkOrderSyncActionTypes.create) {
    return _readBackendWorkOrderId(action.payload['local_id']) != null &&
        _readBackendWorkOrderId(action.payload['title']) != null;
  }

  final serverId = _readBackendWorkOrderId(action.payload['server_id']);
  final workOrderId = _readBackendWorkOrderId(action.payload['work_order_id']);
  final hasRealWorkOrderId =
      serverId != null ||
      (workOrderId != null && !_isLocalWorkOrderId(workOrderId));

  // assign exige o operador atual (operator_id) além do id remoto da OS.
  if (action.type == WorkOrderSyncActionTypes.assign) {
    return hasRealWorkOrderId &&
        _readBackendWorkOrderId(action.payload['operator_id']) != null;
  }

  // B-SAN3-16 — os 2 pedidos do técnico exigem o motivo, além do id remoto da OS.
  if (action.type == WorkOrderSyncActionTypes.approvalRequest ||
      action.type == WorkOrderSyncActionTypes.unableToStart) {
    return hasRealWorkOrderId && workOrderActionHasReason(action);
  }

  return hasRealWorkOrderId;
}

/// B-SAN3-16 (P1, CRIT16-09) — o pedido de aprovação e o "não consegui iniciar" só saem com motivo: sem ele, o servidor
/// recusaria sempre (`required_field`). A varredura de rotas usa a mesma regra para marcá-los como não enviáveis.
bool workOrderActionHasReason(SyncAction action) =>
    _readBackendWorkOrderId(action.payload['reason']) != null;

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
    WorkOrderSyncEntityUpdater? entityUpdater,
  }) : _queue = queue,
       _api = api,
       _entityUpdater = entityUpdater;

  final SyncQueueRepository _queue;
  final WorkOrderSyncBatchApi _api;
  final int maxRetry;
  final WorkOrderSyncEntityUpdater? _entityUpdater;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final createResult = await _replayEligible(
      tenantId,
      actionTypes: const {WorkOrderSyncActionTypes.create},
    );
    final dependentResult = await _replayEligible(
      tenantId,
      actionTypes: _dependentWorkOrderActionTypes,
    );
    return SyncReplayResult(
      synced: [...createResult.synced, ...dependentResult.synced],
      failed: [...createResult.failed, ...dependentResult.failed],
      conflicts: [...createResult.conflicts, ...dependentResult.conflicts],
    );
  }

  Future<SyncReplayResult> _replayEligible(
    String tenantId, {
    required Set<String> actionTypes,
  }) async {
    final eligible = (await _queue.pendingForTenant(tenantId))
        .where((a) => actionTypes.contains(a.type))
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
          lastSafeError: 'Falha de conexão. Tente novamente.',
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
          lastSafeError: 'Ação sem resposta do servidor.',
        );
      } else {
        final createNeedsResultRef =
            a.type == WorkOrderSyncActionTypes.create &&
            (result.status == 'processed' || result.status == 'ignored') &&
            _readBackendWorkOrderId(result.resultRef) == null;
        next = switch (result.status) {
          'processed' when createNeedsResultRef => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: 'MISSING_RESULT_REF',
            lastSafeError: 'Criação sem identificador remoto.',
          ),
          'processed' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            clearLastErrorCode: true,
            clearLastSafeError: true,
            payload: result.resultRef != null
                ? {...a.payload, 'result_ref': result.resultRef}
                : a.payload,
          ),
          'ignored' when createNeedsResultRef => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: 'MISSING_RESULT_REF',
            lastSafeError: 'Criação sem identificador remoto.',
          ),
          'ignored' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
            clearLastErrorCode: true,
            clearLastSafeError: true,
            payload: result.resultRef != null
                ? {...a.payload, 'result_ref': result.resultRef}
                : a.payload,
          ),
          'conflict' => a.copyWith(
            status: SyncStatus.conflict,
            lastErrorCode: result.errorCode ?? 'CONFLICT',
            lastSafeError: 'Conflito remoto exige decisão manual.',
            payload: result.resultRef != null
                ? {...a.payload, 'result_ref': result.resultRef}
                : a.payload,
          ),
          'failed' => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_FAILED',
            lastSafeError: 'Servidor recusou a ação.',
          ),
          _ => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_ERROR',
            lastSafeError: 'Erro ao processar ação. Tente novamente.',
          ),
        };
      }

      await _queue.update(next);
      if (a.type == WorkOrderSyncActionTypes.create &&
          next.status == SyncStatus.synced &&
          result?.resultRef != null) {
        await _mapDependentActions(
          tenantId: tenantId,
          localId: _readBackendWorkOrderId(a.payload['local_id']),
          serverId: result!.resultRef!,
        );
      }
      if (result != null &&
          (next.status == SyncStatus.synced ||
              next.status == SyncStatus.failed ||
              next.status == SyncStatus.conflict)) {
        await _entityUpdater?.call(a, result, next.status);
      }

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

  Future<void> _mapDependentActions({
    required String tenantId,
    required String? localId,
    required String serverId,
  }) async {
    if (localId == null || serverId.trim().isEmpty) return;
    final actions = await _queue.actionsForTenant(tenantId);
    for (final action in actions) {
      if (action.type == WorkOrderSyncActionTypes.create ||
          action.payload['local_id'] != localId ||
          _readBackendWorkOrderId(action.payload['server_id']) != null) {
        continue;
      }
      await _queue.update(
        action.copyWith(payload: {...action.payload, 'server_id': serverId}),
      );
    }
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
      // P0b — CADA tipo do ciclo do guincheiro vira o tipo canônico
      // `checklist.*` que o backend aceita (antes caíam no genérico com o type
      // cru e o efeito se perdia em silêncio).
      ChecklistSyncActionTypes.markerCreate => 'checklist.marker_create',
      ChecklistSyncActionTypes.divergenceCreate =>
        'checklist.divergence_create',
      ChecklistSyncActionTypes.acknowledgementCreate =>
        'checklist.acknowledgement_create',
      ChecklistSyncActionTypes.attachmentAttach =>
        'checklist.attachment_attach',
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
      ChecklistSyncActionTypes.markerCreate => _markerPayload(action.payload),
      ChecklistSyncActionTypes.divergenceCreate => _divergencePayload(
        action.payload,
      ),
      ChecklistSyncActionTypes.acknowledgementCreate => _acknowledgementPayload(
        action.payload,
      ),
      ChecklistSyncActionTypes.attachmentAttach => _attachmentPayload(
        action.payload,
      ),
      _ => _sanitizeMap(action.payload),
    };
  }

  // server_run_id baixado (D-CHK-DISPATCH-CREATE) → run_id do backend. O
  // local_run_id vai como fallback (resolveRunId aceita ambos) e em metadata.
  String? _serverRunId(Map<String, Object?> source) =>
      _readNonEmptyString(source['server_run_id']) ??
      _readNonEmptyString(source['run_id']);

  Map<String, Object?> _syncMetadata(Map<String, Object?> source) {
    final localRunId = _readNonEmptyString(source['local_run_id']);
    return <String, Object?>{
      'source': 'mobile_offline',
      if (localRunId != null && localRunId.isNotEmpty)
        'local_run_id': localRunId,
    };
  }

  Map<String, Object?> _markerPayload(Map<String, Object?> source) {
    final localRunId = _readNonEmptyString(source['local_run_id']);
    return Map.unmodifiable(
      <String, Object?>{
        'run_id': _serverRunId(source),
        'local_run_id': localRunId,
        'component_id':
            _readNonEmptyString(source['component_id']) ??
            _readNonEmptyString(source['field_id']),
        'marker_type':
            _readNonEmptyString(source['marker_type']) ??
            _readNonEmptyString(source['type']) ??
            'damage',
        'description': _readNonEmptyString(source['description']),
        'position_label': _readNonEmptyString(source['position_label']),
        'label': _readNonEmptyString(source['label']),
        'local_marker_id': _readNonEmptyString(source['local_marker_id']),
        'metadata': _syncMetadata(source),
      }..removeWhere((_, value) => value == null),
    );
  }

  Map<String, Object?> _divergencePayload(Map<String, Object?> source) {
    final localRunId = _readNonEmptyString(source['local_run_id']);
    return Map.unmodifiable(
      <String, Object?>{
        'run_id': _serverRunId(source),
        'local_run_id': localRunId,
        'component_id':
            _readNonEmptyString(source['component_id']) ??
            _readNonEmptyString(source['field_id']),
        'observation':
            _readNonEmptyString(source['observation']) ??
            _readNonEmptyString(source['note']),
        'metadata': _syncMetadata(source),
      }..removeWhere((_, value) => value == null),
    );
  }

  Map<String, Object?> _acknowledgementPayload(Map<String, Object?> source) {
    final localRunId = _readNonEmptyString(source['local_run_id']);
    return Map.unmodifiable(
      <String, Object?>{
        'run_id': _serverRunId(source),
        'local_run_id': localRunId,
        'message':
            _readNonEmptyString(source['message']) ??
            _readNonEmptyString(source['observation']),
        'observation': _readNonEmptyString(source['observation']),
        'metadata': _syncMetadata(source),
      }..removeWhere((_, value) => value == null),
    );
  }

  Map<String, Object?> _attachmentPayload(Map<String, Object?> source) {
    final localRunId = _readNonEmptyString(source['local_run_id']);
    final sizeBytes = source['size_bytes'];
    return Map.unmodifiable(
      <String, Object?>{
        'run_id': _serverRunId(source),
        'local_run_id': localRunId,
        'component_id':
            _readNonEmptyString(source['component_id']) ??
            _readNonEmptyString(source['field_id']),
        'local_att_id': _readNonEmptyString(source['local_att_id']),
        'file_name': _readNonEmptyString(source['file_name']),
        'mime_type': _readNonEmptyString(source['mime_type']),
        'size_bytes': sizeBytes is num ? sizeBytes : null,
        'metadata': _syncMetadata(source),
      }..removeWhere((_, value) => value == null),
    );
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

// PR-B (D-CHK-DISPATCH-CREATE) — o ciclo COMPLETO do guincheiro é replay-elegível
// (answer/note/complete/marker/divergence/ack/attachment), MENOS `run.create`
// (a run é criada pelo despacho, não pelo guincheiro). A elegibilidade exige o
// server_run_id baixado (sem ele, a ação fica pendente até o download carimbar).
const backendChecklistActionTypes = {
  ChecklistSyncActionTypes.answerUpsert,
  ChecklistSyncActionTypes.runComplete,
  ChecklistSyncActionTypes.markerCreate,
  ChecklistSyncActionTypes.divergenceCreate,
  ChecklistSyncActionTypes.acknowledgementCreate,
  ChecklistSyncActionTypes.attachmentAttach,
};

bool checklistActionReadyForBackend(SyncAction action) {
  if (!backendChecklistActionTypes.contains(action.type)) {
    return false;
  }

  final serverRunId = _readBackendRunId(action.payload['server_run_id']);
  if (serverRunId != null) return true;

  // Um run_id explícito não-local (uuid do servidor) também é aceito. Ids locais
  // têm prefixo `clrun-` (clrun-c_/clrun-e_/clrun-local-).
  final runId = _readBackendRunId(action.payload['run_id']);
  return runId != null && !runId.startsWith('clrun-');
}

String? _readBackendRunId(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

// Conflitos de checklist que NÃO são terminais: são corridas de ordem que se
// resolvem numa nova tentativa (mapeadas para `failed`, limitado por maxRetry),
// em vez de prender a ação em `conflict` para sempre. O backend envia o código
// no conflict_type (ex.: ACKNOWLEDGEMENT_NOT_REQUIRED / acknowledgement_not_required).
const _retryableChecklistConflictCodes = {'acknowledgement_not_required'};

bool _isRetryableChecklistConflict(String? errorCode) {
  if (errorCode == null) return false;
  return _retryableChecklistConflictCodes.contains(errorCode.toLowerCase());
}

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
        .toList();

    if (eligible.isEmpty) {
      return const SyncReplayResult(synced: [], failed: [], conflicts: []);
    }

    // ORDEM DO LOTE (junta PR-B): o backend processa o batch NA ORDEM do array.
    // Ordenar por created_at garante divergence → ack → complete na sequência em
    // que o guincheiro os produziu — sem isso, o `complete` podia ser processado
    // antes do `divergence`/`ack` (rebaixando pending_acknowledgement→completed)
    // e a ciência 409-perder. Ordenação ESTÁVEL: empates de created_at preservam
    // a ordem do store (que já vem por created_at, rowid).
    final indexed = eligible.asMap().entries.toList()
      ..sort((a, b) {
        final byTime = a.value.createdAt.compareTo(b.value.createdAt);
        return byTime != 0 ? byTime : a.key.compareTo(b.key);
      });
    final ordered = [for (final entry in indexed) entry.value];

    final syncing = [
      for (final a in ordered) a.copyWith(status: SyncStatus.syncing),
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
          lastSafeError: 'Falha de conexão. Tente novamente.',
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
          lastSafeError: 'Ação sem resposta do servidor.',
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
          // NÃO-TERMINAL (junta PR-B): 409 ACKNOWLEDGEMENT_NOT_REQUIRED é uma
          // corrida de ordem (o ack chegou antes de a run virar
          // pending_acknowledgement), não um conflito que exige decisão manual.
          // Marcar `conflict` prenderia a ciência PARA SEMPRE (o replay exclui
          // ações em conflito). Mapeia para `failed` → re-tenta (limitado por
          // maxRetry); no próximo passe o divergence/ordem já foi aplicado.
          'conflict' when _isRetryableChecklistConflict(result.errorCode) =>
            a.copyWith(
              status: SyncStatus.failed,
              retryCount: a.retryCount + 1,
              lastErrorCode: result.errorCode ?? 'CONFLICT',
              lastSafeError:
                  'Aguardando etapa anterior. Nova tentativa em '
                  'breve.',
            ),
          'conflict' => a.copyWith(
            status: SyncStatus.conflict,
            lastErrorCode: result.errorCode ?? 'CONFLICT',
            lastSafeError: 'Conflito remoto exige decisão manual.',
          ),
          'failed' => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_FAILED',
            lastSafeError: 'Servidor recusou a ação.',
          ),
          'ignored' => a.copyWith(
            status: SyncStatus.synced,
            processedAt: DateTime.now().toUtc(),
          ),
          _ => a.copyWith(
            status: SyncStatus.failed,
            retryCount: a.retryCount + 1,
            lastErrorCode: result.errorCode ?? 'SERVER_ERROR',
            lastSafeError: 'Erro ao processar ação. Tente novamente.',
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
