import 'package:dio/dio.dart';
import 'package:uuid/uuid.dart';

import '../network/api_contracts.dart';
import '../network/api_error.dart';
import '../network/http_client.dart';
import '../sync/sync_models.dart';
import '../sync/sync_queue_repository.dart';
import '../sync/sync_replay_service.dart';

const evidenceMaxFileSizeBytes = 10 * 1024 * 1024;

enum EvidenceSyncItemStatus { accepted, rejected, conflict, alreadyApplied }

class EvidenceSyncSummary {
  const EvidenceSyncSummary({
    required this.received,
    required this.accepted,
    required this.rejected,
    required this.conflicts,
    required this.alreadyApplied,
  });

  final int received;
  final int accepted;
  final int rejected;
  final int conflicts;
  final int alreadyApplied;
}

class EvidenceSyncItemResult {
  const EvidenceSyncItemResult({
    required this.clientEvidenceId,
    required this.status,
    this.evidenceId,
    this.errorCode,
  });

  final String clientEvidenceId;
  final EvidenceSyncItemStatus status;
  final String? evidenceId;
  final String? errorCode;

  bool get isIdempotentSuccess =>
      status == EvidenceSyncItemStatus.accepted ||
      status == EvidenceSyncItemStatus.alreadyApplied;
}

class EvidenceSyncBatchResponse {
  const EvidenceSyncBatchResponse({
    required this.clientBatchId,
    required this.summary,
    required this.accepted,
    required this.rejected,
    required this.conflicts,
    required this.alreadyApplied,
  });

  final String? clientBatchId;
  final EvidenceSyncSummary summary;
  final List<EvidenceSyncItemResult> accepted;
  final List<EvidenceSyncItemResult> rejected;
  final List<EvidenceSyncItemResult> conflicts;
  final List<EvidenceSyncItemResult> alreadyApplied;

  List<EvidenceSyncItemResult> get allResults => [
    ...accepted,
    ...rejected,
    ...conflicts,
    ...alreadyApplied,
  ];
}

class EvidenceSyncCodec {
  const EvidenceSyncCodec({String Function()? batchIdFactory})
    : _batchIdFactory = batchIdFactory;

  final String Function()? _batchIdFactory;

  Map<String, Object?> encodeRequest(List<SyncAction> actions) {
    return {
      'client_batch_id':
          _batchIdFactory?.call() ?? 'evidence-batch-${const Uuid().v4()}',
      'actions': actions.map(_encodeAction).toList(growable: false),
    };
  }

  EvidenceSyncBatchResponse decodeResponse(Object? rawBody) {
    final outer = _asMap(rawBody);
    final data = _asMap(outer['data'] ?? outer);
    final summary = _asMap(data['summary']);

    return EvidenceSyncBatchResponse(
      clientBatchId: _readString(data, 'client_batch_id', 'clientBatchId'),
      summary: EvidenceSyncSummary(
        received: _readInt(summary, 'received'),
        accepted: _readInt(summary, 'accepted'),
        rejected: _readInt(summary, 'rejected'),
        conflicts: _readInt(summary, 'conflicts'),
        alreadyApplied: _readInt(
          summary,
          'already_applied',
          fallbackKey: 'alreadyApplied',
        ),
      ),
      accepted: _decodeItems(data['accepted'], EvidenceSyncItemStatus.accepted),
      rejected: _decodeItems(data['rejected'], EvidenceSyncItemStatus.rejected),
      conflicts: _decodeItems(
        data['conflicts'],
        EvidenceSyncItemStatus.conflict,
      ),
      alreadyApplied: _decodeItems(
        data['already_applied'] ?? data['alreadyApplied'],
        EvidenceSyncItemStatus.alreadyApplied,
      ),
    );
  }

  Map<String, Object?> _encodeAction(SyncAction action) {
    if (!EvidenceSyncActionTypes.supported.contains(action.type)) {
      throw ArgumentError.value(
        action.type,
        'type',
        'Unsupported evidence type',
      );
    }

    return {
      'client_evidence_id': action.clientActionId,
      'type': action.type,
      'local_created_at': action.createdAt.toUtc().toIso8601String(),
      'payload': _controlledPayload(action.type, action.payload),
    };
  }

  Map<String, Object?> _controlledPayload(
    String type,
    Map<String, Object?> source,
  ) {
    final isWorkOrder = type.startsWith('evidence.work_order_');
    final isObservation = type.endsWith('_observation');
    final isSignature = type.endsWith('_signature');
    final result = <String, Object?>{};

    if (isWorkOrder) {
      result['work_order_id'] = _requiredString(
        source['work_order_id'],
        'work_order_id',
      );
    }

    result['kind'] = isObservation
        ? 'observation'
        : isSignature
        ? 'signature'
        : 'photo';

    if (isObservation) {
      result['note'] = _requiredString(
        source['note'] ?? source['caption'],
        'note',
      );
    } else {
      final sizeBytes = source['size_bytes'];
      if (sizeBytes is! int || sizeBytes <= 0) {
        throw ArgumentError.value(sizeBytes, 'size_bytes', 'Must be positive');
      }
      if (sizeBytes > evidenceMaxFileSizeBytes) {
        throw ArgumentError.value(
          sizeBytes,
          'size_bytes',
          'Evidence exceeds the declared 10 MB limit',
        );
      }

      result.addAll({
        'file_name': _safeFileName(source['file_name']),
        'content_type': _safeContentType(source['content_type']),
        'size_bytes': sizeBytes,
      });
      _copyOptionalString(source, result, 'sha256');
      if (isSignature) {
        result['signer_name'] = _requiredString(
          source['signer_name'],
          'signer_name',
        );
      }
    }

    _copyOptionalString(source, result, 'caption');
    final gps = _controlledGps(source['gps']);
    if (gps != null) result['gps'] = gps;
    return Map.unmodifiable(result);
  }

  List<EvidenceSyncItemResult> _decodeItems(
    Object? raw,
    EvidenceSyncItemStatus fallbackStatus,
  ) {
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map(
          (item) =>
              _decodeItem(Map<String, dynamic>.from(item), fallbackStatus),
        )
        .toList(growable: false);
  }

  EvidenceSyncItemResult _decodeItem(
    Map<String, dynamic> item,
    EvidenceSyncItemStatus fallbackStatus,
  ) {
    final error = _asMap(item['error']);
    final conflict = _asMap(item['conflict']);
    final state = _asMap(item['server_state'] ?? item['serverState']);

    return EvidenceSyncItemResult(
      clientEvidenceId:
          _readString(item, 'client_evidence_id', 'clientEvidenceId') ??
          _readString(item, 'client_action_id', 'clientActionId') ??
          '',
      status: _parseStatus(item['status'], fallbackStatus),
      evidenceId:
          _readString(item, 'evidence_id', 'evidenceId') ??
          _readString(state, 'evidence_id', 'evidenceId'),
      errorCode:
          _readString(error, 'reason', 'code') ??
          _readString(conflict, 'conflict_type', 'conflictType'),
    );
  }
}

abstract class EvidenceSyncBatchApi {
  Future<EvidenceSyncBatchResponse> sendBatch(List<SyncAction> actions);
}

class PendingEvidenceSyncBatchApi implements EvidenceSyncBatchApi {
  const PendingEvidenceSyncBatchApi();

  @override
  Future<EvidenceSyncBatchResponse> sendBatch(List<SyncAction> actions) =>
      Future.error(const ApiUnauthorizedError());
}

class DioEvidenceSyncBatchApi implements EvidenceSyncBatchApi {
  DioEvidenceSyncBatchApi(this._client, {EvidenceSyncCodec? codec})
    : _codec = codec ?? const EvidenceSyncCodec();

  final Dio _client;
  final EvidenceSyncCodec _codec;

  @override
  Future<EvidenceSyncBatchResponse> sendBatch(List<SyncAction> actions) async {
    try {
      final response = await _client.post(
        EvidenceApiEndpoints.sync,
        data: _codec.encodeRequest(actions),
      );
      return _codec.decodeResponse(response.data);
    } on DioException catch (error) {
      throw mapDioError(error);
    }
  }
}

class EvidenceSyncReplayService {
  const EvidenceSyncReplayService({
    required SyncQueueRepository queue,
    required EvidenceSyncBatchApi api,
    this.maxRetry = 5,
  }) : _queue = queue,
       _api = api;

  final SyncQueueRepository _queue;
  final EvidenceSyncBatchApi _api;
  final int maxRetry;

  Future<SyncReplayResult> replayTenant(String tenantId) async {
    final eligible = (await _queue.pendingForTenant(tenantId))
        .where(
          (action) => EvidenceSyncActionTypes.supported.contains(action.type),
        )
        .where((action) => action.status != SyncStatus.conflict)
        .where((action) => action.retryCount < maxRetry)
        .toList(growable: false);

    if (eligible.isEmpty) {
      return const SyncReplayResult(synced: [], failed: [], conflicts: []);
    }

    final syncing = [
      for (final action in eligible)
        action.copyWith(status: SyncStatus.syncing),
    ];
    for (final action in syncing) {
      await _queue.update(action);
    }

    EvidenceSyncBatchResponse response;
    try {
      response = await _api.sendBatch(syncing);
    } catch (_) {
      final failed = <SyncAction>[];
      for (final action in syncing) {
        final next = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          lastErrorCode: 'NETWORK_ERROR',
          lastSafeError: 'Falha de conexao. Tente novamente.',
        );
        await _queue.update(next);
        failed.add(next);
      }
      return SyncReplayResult(
        synced: const [],
        failed: failed,
        conflicts: const [],
      );
    }

    final results = {
      for (final item in response.allResults) item.clientEvidenceId: item,
    };
    final synced = <SyncAction>[];
    final failed = <SyncAction>[];
    final conflicts = <SyncAction>[];

    for (final action in syncing) {
      final result = results[action.clientActionId];
      final SyncAction next;
      if (result == null) {
        next = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          lastErrorCode: 'MISSING_RESULT',
          lastSafeError: 'Evidencia sem resposta do servidor.',
        );
      } else if (result.isIdempotentSuccess) {
        next = action.copyWith(
          status: SyncStatus.synced,
          processedAt: DateTime.now().toUtc(),
          lastErrorCode: null,
          lastSafeError: null,
          payload: result.evidenceId == null
              ? action.payload
              : {...action.payload, 'evidence_id': result.evidenceId},
        );
      } else if (result.status == EvidenceSyncItemStatus.conflict) {
        next = action.copyWith(
          status: SyncStatus.conflict,
          lastErrorCode: result.errorCode ?? 'EVIDENCE_CONFLICT',
          lastSafeError: 'Conflito de evidencia exige decisao manual.',
        );
      } else {
        next = action.copyWith(
          status: SyncStatus.failed,
          retryCount: action.retryCount + 1,
          lastErrorCode: result.errorCode ?? 'EVIDENCE_REJECTED',
          lastSafeError: 'Servidor recusou os metadados da evidencia.',
        );
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

Map<String, dynamic> _asMap(Object? value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return const {};
}

String? _readString(
  Map<String, dynamic> source,
  String key,
  String fallbackKey,
) {
  final value = source[key] ?? source[fallbackKey];
  return value is String && value.trim().isNotEmpty ? value.trim() : null;
}

int _readInt(Map<String, dynamic> source, String key, {String? fallbackKey}) {
  final value =
      source[key] ?? (fallbackKey == null ? null : source[fallbackKey]);
  return value is num ? value.toInt() : 0;
}

EvidenceSyncItemStatus _parseStatus(
  Object? value,
  EvidenceSyncItemStatus fallback,
) {
  return switch (value) {
    'accepted' => EvidenceSyncItemStatus.accepted,
    'rejected' => EvidenceSyncItemStatus.rejected,
    'conflict' => EvidenceSyncItemStatus.conflict,
    'already_applied' ||
    'alreadyApplied' => EvidenceSyncItemStatus.alreadyApplied,
    _ => fallback,
  };
}

String _requiredString(Object? value, String field) {
  if (value is String && value.trim().isNotEmpty) return value.trim();
  throw ArgumentError.value(value, field, '$field is required');
}

String _safeFileName(Object? value) {
  final fileName = _requiredString(value, 'file_name');
  if (fileName.contains('/') || fileName.contains('\\')) {
    throw ArgumentError.value(value, 'file_name', 'Paths are not allowed');
  }
  return fileName;
}

String _safeContentType(Object? value) {
  final contentType = _requiredString(value, 'content_type').toLowerCase();
  if (contentType != 'image/jpeg' && contentType != 'image/png') {
    throw ArgumentError.value(value, 'content_type', 'Unsupported image type');
  }
  return contentType;
}

void _copyOptionalString(
  Map<String, Object?> source,
  Map<String, Object?> target,
  String key,
) {
  final value = source[key];
  if (value is String && value.trim().isNotEmpty) target[key] = value.trim();
}

Map<String, Object?>? _controlledGps(Object? value) {
  if (value is! Map) return null;
  final source = Map<String, Object?>.from(value);
  final lat = source['lat'];
  final lng = source['lng'];
  if (lat is! num || lng is! num) return null;
  return {
    'lat': lat.toDouble(),
    'lng': lng.toDouble(),
    if (source['accuracy_m'] is num)
      'accuracy_m': (source['accuracy_m'] as num).toDouble(),
  };
}
