import 'package:dio/dio.dart';

import '../../features/work_orders/data/work_order_local_store.dart';
import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import 'sync_models.dart';
import 'sync_queue_repository.dart';
import 'sync_replay_service.dart';

/// 503 do lote: a ação volta a `pending` sem custo, mas pode ter baixado (outra ação do mesmo
/// lote é que esgotou o lock). C2 item 9(c): conta como "já esteve `syncing`".
const inventorySyncBusyErrorCode = 'SYNC_BUSY';

/// S12: a OS nunca chegou ao servidor. Nasce no laço de elegibilidade, antes de qualquer envio.
const inventoryWorkOrderNotOnServerErrorCode = 'work_order_not_on_server';

/// 401/403 no lote (o `mapDioError` não separa os dois).
const inventorySessionForbiddenErrorCode = 'SESSION_FORBIDDEN';

abstract class InventorySyncBatchApi {
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions);
}

class PendingBackendInventorySyncBatchApi implements InventorySyncBatchApi {
  const PendingBackendInventorySyncBatchApi();

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async =>
      const <SyncActionResult>[];
}

class CaptureInventoryBatchApi implements InventorySyncBatchApi {
  CaptureInventoryBatchApi(this._handler);

  final List<SyncActionResult> Function(List<SyncAction> batch) _handler;
  final List<List<SyncAction>> capturedBatches = <List<SyncAction>>[];

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    capturedBatches.add(List<SyncAction>.unmodifiable(actions));
    return _handler(actions);
  }
}

class InventorySyncCodec {
  const InventorySyncCodec({String Function()? batchIdFactory})
    : _batchIdFactory = batchIdFactory;

  final String Function()? _batchIdFactory;

  Map<String, Object?> encodeRequest(List<SyncAction> actions) => {
    'client_batch_id':
        _batchIdFactory?.call() ??
        'inventory-batch-${actions.first.createdAt.toUtc().millisecondsSinceEpoch}-${actions.first.clientActionId}',
    'actions': [
      for (final action in actions)
        {
          'client_action_id': action.clientActionId,
          'type': action.type,
          'local_created_at': action.createdAt.toUtc().toIso8601String(),
          'payload': action.payload,
        },
    ],
  };

  List<SyncActionResult> decodeResponse(Object? rawBody) {
    final outer = _asMap(rawBody);
    final data = _asMap(outer['data'] ?? outer);
    return <SyncActionResult>[
      for (final item in _listOfMaps(data['accepted']))
        if (_id(item) != null)
          SyncActionResult(
            clientActionId: _id(item)!,
            status: 'processed',
            resultRef: _string(item['result_ref'] ?? item['resultRef']),
          ),
      for (final item in _listOfMaps(
        data['already_applied'] ?? data['alreadyApplied'],
      ))
        if (_id(item) != null)
          SyncActionResult(
            clientActionId: _id(item)!,
            status: 'ignored',
            resultRef: _string(item['result_ref'] ?? item['resultRef']),
          ),
      for (final item in _listOfMaps(data['conflicts']))
        if (_id(item) != null)
          SyncActionResult(
            clientActionId: _id(item)!,
            status: 'conflict',
            resultRef: _string(item['result_ref'] ?? item['resultRef']),
            errorCode:
                _string(_asMap(item['conflict'])['conflict_type']) ??
                _string(_asMap(item['error'])['reason']),
          ),
      for (final item in _listOfMaps(data['rejected']))
        if (_id(item) != null)
          SyncActionResult(
            clientActionId: _id(item)!,
            status: 'conflict',
            errorCode: _string(_asMap(item['error'])['reason']),
          ),
    ];
  }

  String? _id(Map<String, dynamic> item) =>
      _string(item['client_action_id'] ?? item['clientActionId']);

  String? _string(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  Map<String, dynamic> _asMap(Object? value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return const <String, dynamic>{};
  }

  List<Map<String, dynamic>> _listOfMaps(Object? value) {
    if (value is! List) return const <Map<String, dynamic>>[];
    return value
        .whereType<Map>()
        .map(Map<String, dynamic>.from)
        .toList(growable: false);
  }
}

class DioInventorySyncBatchApi implements InventorySyncBatchApi {
  DioInventorySyncBatchApi(
    this._client, {
    this.batchSize = 50,
    InventorySyncCodec? codec,
  }) : assert(batchSize > 0 && batchSize <= 50),
       _codec = codec ?? const InventorySyncCodec();

  final Dio _client;
  final int batchSize;
  final InventorySyncCodec _codec;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    final results = <SyncActionResult>[];
    for (var start = 0; start < actions.length; start += batchSize) {
      final end = (start + batchSize).clamp(0, actions.length);
      final chunk = actions.sublist(start, end);
      try {
        final response = await _client.post(
          InventoryApiEndpoints.sync,
          data: _codec.encodeRequest(chunk),
        );
        results.addAll(_codec.decodeResponse(response.data));
      } on DioException catch (error) {
        throw mapDioError(error);
      }
    }
    return results;
  }
}

typedef InventorySyncEntityUpdater =
    Future<void> Function(
      SyncAction action,
      SyncActionResult result,
      SyncStatus status,
    );

class InventorySyncReplayService {
  const InventorySyncReplayService({
    required SyncQueueRepository queue,
    required InventorySyncBatchApi api,
    required WorkOrderLocalStore workOrders,
    this.maxRetry = 5,
    InventorySyncEntityUpdater? entityUpdater,
  }) : _queue = queue,
       _api = api,
       _workOrders = workOrders,
       _entityUpdater = entityUpdater;

  final SyncQueueRepository _queue;
  final InventorySyncBatchApi _api;
  final WorkOrderLocalStore _workOrders;
  final int maxRetry;
  final InventorySyncEntityUpdater? _entityUpdater;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final synced = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];
    final pending = await _queue.pendingForTenant(tenantId);
    final allActions = await _queue.actionsForTenant(tenantId);
    final orders = {
      for (final order in await _workOrders.loadWorkOrders())
        order.localId: order,
    };
    final eligible = <SyncAction>[];

    for (final action in pending) {
      if (action.type != InventorySyncActionTypes.materialAdd &&
          action.type != InventorySyncActionTypes.materialRemove) {
        continue;
      }
      if (action.status == SyncStatus.conflict ||
          action.retryCount >= maxRetry) {
        continue;
      }
      final localId = _string(action.payload['work_order_local_id']);
      final order = localId == null ? null : orders[localId];
      final serverId = _string(order?.serverId);
      if (serverId != null) {
        eligible.add(
          action.copyWith(
            payload: <String, Object?>{
              ...action.payload,
              'work_order_id': serverId,
            },
          ),
        );
        continue;
      }

      final createStillPending =
          localId != null &&
          allActions.any(
            (candidate) =>
                candidate.type == WorkOrderSyncActionTypes.create &&
                _string(candidate.payload['local_id']) == localId &&
                candidate.status != SyncStatus.synced,
          );
      if (createStillPending) continue;

      final conflict = action.copyWith(
        status: SyncStatus.conflict,
        lastErrorCode: inventoryWorkOrderNotOnServerErrorCode,
        lastSafeError:
            'A ordem de serviço não foi criada no servidor; '
            'Versao do gestor descarta a peça',
      );
      await _queue.update(conflict);
      conflicts.add(conflict);
      await _updateEntityForLocalConflict(conflict);
    }

    if (eligible.isEmpty || _api is PendingBackendInventorySyncBatchApi) {
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    }

    final syncing = [
      for (final action in eligible)
        action.copyWith(status: SyncStatus.syncing),
    ];
    for (final action in syncing) {
      await _queue.update(action);
    }

    List<SyncActionResult> results;
    try {
      results = <SyncActionResult>[];
      for (var start = 0; start < syncing.length; start += 50) {
        final end = (start + 50).clamp(0, syncing.length);
        results.addAll(await _api.sendBatch(syncing.sublist(start, end)));
      }
    } on ApiServerError catch (error) {
      if (error.statusCode == 503) {
        for (final action in syncing) {
          await _queue.update(
            action.copyWith(
              status: SyncStatus.pending,
              lastErrorCode: inventorySyncBusyErrorCode,
              lastSafeError: 'Servidor ocupado; o envio será refeito.',
            ),
          );
        }
        return SyncReplayResult(
          synced: synced,
          failed: failed,
          conflicts: conflicts,
        );
      }
      return _failBatch(syncing, synced, conflicts);
    } on ApiUnauthorizedError {
      for (final action in syncing) {
        final conflict = action.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: inventorySessionForbiddenErrorCode,
          lastSafeError:
              'O servidor não aceitou o envio de material. Entre de novo no app '
              'ou peça ao administrador para ativar o estoque na sua organização.',
        );
        await _queue.update(conflict);
        conflicts.add(conflict);
        await _updateEntityForLocalConflict(conflict);
      }
      return SyncReplayResult(
        synced: synced,
        failed: failed,
        conflicts: conflicts,
      );
    } catch (_) {
      return _failBatch(syncing, synced, conflicts);
    }

    final byId = {for (final result in results) result.clientActionId: result};
    for (final action in syncing) {
      final result = byId[action.clientActionId];
      if (result == null) {
        final next = _failed(
          action,
          'MISSING_RESULT',
          'Ação sem resposta do servidor.',
        );
        await _queue.update(next);
        failed.add(next);
        continue;
      }

      final SyncAction next;
      final SyncStatus entityStatus;
      if (result.status == 'processed' || result.status == 'ignored') {
        next = action.copyWith(
          status: SyncStatus.synced,
          processedAt: DateTime.now().toUtc(),
          clearLastErrorCode: true,
          clearLastSafeError: true,
          payload: result.resultRef == null
              ? action.payload
              : <String, Object?>{
                  ...action.payload,
                  'result_ref': result.resultRef,
                },
        );
        entityStatus = SyncStatus.synced;
        synced.add(next);
      } else if (result.status == 'conflict') {
        next = action.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: result.errorCode ?? 'CONFLICT',
          lastSafeError: _conflictText(result.errorCode, action),
        );
        entityStatus = SyncStatus.conflict;
        conflicts.add(next);
      } else {
        next = _failed(
          action,
          result.errorCode ?? 'SERVER_ERROR',
          'Erro ao processar material. Tente novamente.',
        );
        entityStatus = SyncStatus.failed;
        failed.add(next);
      }
      await _queue.update(next);
      await _entityUpdater?.call(next, result, entityStatus);
    }

    return SyncReplayResult(
      synced: synced,
      failed: failed,
      conflicts: conflicts,
    );
  }

  Future<SyncReplayResult> _failBatch(
    List<SyncAction> actions,
    List<SyncAction> synced,
    List<SyncAction> conflicts,
  ) async {
    final failed = <SyncAction>[];
    for (final action in actions) {
      final next = _failed(
        action,
        'NETWORK_ERROR',
        'Falha de conexão. Tente novamente.',
      );
      await _queue.update(next);
      failed.add(next);
    }
    return SyncReplayResult(
      synced: synced,
      failed: failed,
      conflicts: conflicts,
    );
  }

  /// PC5: a linha segue a ação também nos conflitos que não vêm de uma resposta do servidor
  /// (S12 e 401/403 no lote).
  Future<void> _updateEntityForLocalConflict(SyncAction conflict) async {
    await _entityUpdater?.call(
      conflict,
      SyncActionResult(
        clientActionId: conflict.clientActionId,
        status: 'conflict',
        errorCode: conflict.lastErrorCode,
      ),
      SyncStatus.conflict,
    );
  }

  SyncAction _failed(SyncAction action, String code, String text) =>
      action.copyWith(
        status: SyncStatus.failed,
        retryCount: action.retryCount + 1,
        lastErrorCode: code,
        lastSafeError: text,
      );

  String? _string(Object? value) =>
      value is String && value.trim().isNotEmpty ? value.trim() : null;

  String _conflictText(String? reason, SyncAction action) {
    final sku = _string(action.payload['sku']) ?? 'informado';
    return switch (reason) {
      'inventory_item_not_found' =>
        'Peça não cadastrada no estoque da organização (SKU $sku). '
            'Versao do gestor tira a peça da OS.',
      'insufficient_balance' =>
        'Sem saldo suficiente desta peça no estoque usado no lançamento.',
      'operator_profile_required' =>
        'Você não tem cadastro de profissional. Peça ao administrador da sua '
            'organização para cadastrar você.',
      'not_assigned_to_actor' =>
        'Esta ordem de serviço não está atribuída a você.',
      'assignment_changed_pending_review' =>
        'Você deixou de ser o técnico desta OS; um supervisor vai decidir.',
      'action_owned_by_other_actor' =>
        'Esta peça já foi lançada por outro usuário.',
      'idempotency_payload_mismatch' =>
        'Este lançamento já foi recebido com outra quantidade.',
      'stock_baixa_reversed' => 'Esta baixa foi estornada no servidor.',
      'work_order_id_required' ||
      'not_found' => 'A ordem de serviço não existe no servidor.',
      'permission_required' => 'Seu perfil não pode lançar material.',
      _ => 'O servidor recusou este material.',
    };
  }
}
