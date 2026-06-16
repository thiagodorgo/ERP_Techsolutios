import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:flutter_test/flutter_test.dart';

SyncAction _action({
  required String id,
  required String type,
  Map<String, Object?>? payload,
}) {
  return SyncAction(
    clientActionId: id,
    tenantId: 'tenant-local-only',
    type: type,
    payload:
        payload ??
        {
          'work_order_id': 'wo-server-1',
          'file_name': 'panel.jpg',
          'content_type': 'image/jpeg',
          'size_bytes': 2048,
          'sha256': 'abc123',
        },
    status: SyncStatus.pending,
    createdAt: DateTime.utc(2026, 6, 15, 12),
  );
}

EvidenceSyncBatchResponse _response({
  List<EvidenceSyncItemResult> accepted = const [],
  List<EvidenceSyncItemResult> rejected = const [],
  List<EvidenceSyncItemResult> conflicts = const [],
  List<EvidenceSyncItemResult> alreadyApplied = const [],
}) {
  return EvidenceSyncBatchResponse(
    clientBatchId: 'batch-test',
    summary: EvidenceSyncSummary(
      received:
          accepted.length +
          rejected.length +
          conflicts.length +
          alreadyApplied.length,
      accepted: accepted.length,
      rejected: rejected.length,
      conflicts: conflicts.length,
      alreadyApplied: alreadyApplied.length,
    ),
    accepted: accepted,
    rejected: rejected,
    conflicts: conflicts,
    alreadyApplied: alreadyApplied,
  );
}

class _FakeEvidenceApi implements EvidenceSyncBatchApi {
  _FakeEvidenceApi(this.response);

  final EvidenceSyncBatchResponse response;
  List<SyncAction>? captured;

  @override
  Future<EvidenceSyncBatchResponse> sendBatch(List<SyncAction> actions) async {
    captured = actions;
    return response;
  }
}

void main() {
  group('B-098F evidence request contract', () {
    const codec = EvidenceSyncCodec(batchIdFactory: _fixedBatchId);

    test('serializes snake_case envelope expected by backend', () {
      final request = codec.encodeRequest([
        _action(id: 'evidence-1', type: EvidenceSyncActionTypes.workOrderPhoto),
      ]);
      final actions = request['actions'] as List<Object?>;
      final action = actions.single as Map<String, Object?>;

      expect(request['client_batch_id'], 'batch-fixed');
      expect(action['client_evidence_id'], 'evidence-1');
      expect(action['type'], EvidenceSyncActionTypes.workOrderPhoto);
      expect(action['local_created_at'], '2026-06-15T12:00:00.000Z');
      expect(action['payload'], isA<Map<String, Object?>>());
    });

    test('supports all six B-098F action types', () {
      final actions = [
        _action(id: 'wo-photo', type: EvidenceSyncActionTypes.workOrderPhoto),
        _action(
          id: 'wo-signature',
          type: EvidenceSyncActionTypes.workOrderSignature,
          payload: {
            'work_order_id': 'wo-1',
            'file_name': 'signature.png',
            'content_type': 'image/png',
            'size_bytes': 1024,
            'sha256': 'signature-hash',
            'signer_name': 'Cliente',
          },
        ),
        _action(
          id: 'wo-note',
          type: EvidenceSyncActionTypes.workOrderObservation,
          payload: {'work_order_id': 'wo-1', 'note': 'Painel isolado.'},
        ),
        _action(
          id: 'field-photo',
          type: EvidenceSyncActionTypes.fieldPhoto,
          payload: {
            'file_name': 'field.jpg',
            'content_type': 'image/jpeg',
            'size_bytes': 2048,
            'sha256': 'field-hash',
          },
        ),
        _action(
          id: 'field-signature',
          type: EvidenceSyncActionTypes.fieldSignature,
          payload: {
            'file_name': 'field-signature.png',
            'content_type': 'image/png',
            'size_bytes': 1024,
            'signer_name': 'Responsavel local',
          },
        ),
        _action(
          id: 'field-note',
          type: EvidenceSyncActionTypes.fieldObservation,
          payload: {'caption': 'Portao fechado.'},
        ),
      ];

      final request = codec.encodeRequest(actions);
      expect(request['actions'], hasLength(6));
    });

    test('allowlist removes tenant, binary, base64 and local paths', () {
      final request = codec.encodeRequest([
        _action(
          id: 'safe-evidence',
          type: EvidenceSyncActionTypes.workOrderPhoto,
          payload: {
            'tenant_id': 'spoofed',
            'tenantId': 'spoofed',
            'work_order_id': 'wo-1',
            'file_name': 'safe.jpg',
            'content_type': 'image/jpeg',
            'size_bytes': 2048,
            'sha256': 'safe-hash',
            'base64': 'forbidden',
            'file_data': [1, 2, 3],
            'local_path': r'C:\private\safe.jpg',
            'path': '/private/safe.jpg',
            'caption': 'Antes da manutencao',
            'gps': {'lat': -23.55, 'lng': -46.63, 'token': 'forbidden'},
          },
        ),
      ]);
      final action = (request['actions'] as List).single as Map;
      final payload = Map<String, Object?>.from(action['payload'] as Map);
      final serialized = payload.toString();

      expect(payload['work_order_id'], 'wo-1');
      expect(payload['caption'], 'Antes da manutencao');
      expect(serialized, isNot(contains('tenant')));
      expect(serialized, isNot(contains('base64')));
      expect(serialized, isNot(contains('file_data')));
      expect(serialized, isNot(contains('local_path')));
      expect(serialized, isNot(contains('private')));
      expect(serialized, isNot(contains('token')));
    });

    test('rejects photo metadata above 10 MB', () {
      expect(
        () => codec.encodeRequest([
          _action(
            id: 'large-evidence',
            type: EvidenceSyncActionTypes.fieldPhoto,
            payload: {
              'file_name': 'large.jpg',
              'content_type': 'image/jpeg',
              'size_bytes': evidenceMaxFileSizeBytes + 1,
            },
          ),
        ]),
        throwsArgumentError,
      );
    });
  });

  group('B-098F evidence response parser', () {
    const codec = EvidenceSyncCodec();

    test('reads body.data summary and all result buckets', () {
      final response = codec.decodeResponse({
        'data': {
          'client_batch_id': 'batch-1',
          'summary': {
            'received': 4,
            'accepted': 1,
            'rejected': 1,
            'conflicts': 1,
            'already_applied': 1,
          },
          'accepted': [
            {
              'client_evidence_id': 'accepted-1',
              'status': 'accepted',
              'evidence_id': 'server-evidence-1',
            },
          ],
          'rejected': [
            {
              'client_evidence_id': 'rejected-1',
              'status': 'rejected',
              'error': {'reason': 'required_field'},
            },
          ],
          'conflicts': [
            {
              'client_evidence_id': 'conflict-1',
              'status': 'conflict',
              'conflict': {'conflict_type': 'idempotency_payload_mismatch'},
            },
          ],
          'already_applied': [
            {
              'client_evidence_id': 'applied-1',
              'status': 'already_applied',
              'server_state': {'evidence_id': 'server-evidence-2'},
            },
          ],
        },
      });

      expect(response.clientBatchId, 'batch-1');
      expect(response.summary.received, 4);
      expect(response.accepted.single.evidenceId, 'server-evidence-1');
      expect(response.rejected.single.errorCode, 'required_field');
      expect(
        response.conflicts.single.errorCode,
        'idempotency_payload_mismatch',
      );
      expect(response.alreadyApplied.single.evidenceId, 'server-evidence-2');
    });

    test('tolerates camelCase result fields', () {
      final response = codec.decodeResponse({
        'data': {
          'clientBatchId': 'batch-camel',
          'summary': {'received': 1, 'alreadyApplied': 1},
          'alreadyApplied': [
            {
              'clientEvidenceId': 'camel-1',
              'status': 'alreadyApplied',
              'evidenceId': 'server-camel',
            },
          ],
        },
      });

      expect(response.clientBatchId, 'batch-camel');
      expect(response.summary.alreadyApplied, 1);
      expect(response.alreadyApplied.single.clientEvidenceId, 'camel-1');
    });
  });

  group('B-098F evidence replay', () {
    test('accepted and already_applied are idempotent success', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'accepted-1', type: EvidenceSyncActionTypes.workOrderPhoto),
      );
      await queue.enqueue(
        _action(id: 'applied-1', type: EvidenceSyncActionTypes.fieldPhoto),
      );
      final api = _FakeEvidenceApi(
        _response(
          accepted: const [
            EvidenceSyncItemResult(
              clientEvidenceId: 'accepted-1',
              status: EvidenceSyncItemStatus.accepted,
              evidenceId: 'server-1',
            ),
          ],
          alreadyApplied: const [
            EvidenceSyncItemResult(
              clientEvidenceId: 'applied-1',
              status: EvidenceSyncItemStatus.alreadyApplied,
              evidenceId: 'server-2',
            ),
          ],
        ),
      );

      final result = await EvidenceSyncReplayService(
        queue: queue,
        api: api,
      ).replayTenant('tenant-local-only');

      expect(result.synced, hasLength(2));
      expect(result.failed, isEmpty);
      expect(result.conflicts, isEmpty);
      expect(
        result.synced.every((action) => action.processedAt != null),
        isTrue,
      );
    });

    test('conflict remains manual and is not retried automatically', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'conflict-1', type: EvidenceSyncActionTypes.fieldPhoto),
      );
      final firstApi = _FakeEvidenceApi(
        _response(
          conflicts: const [
            EvidenceSyncItemResult(
              clientEvidenceId: 'conflict-1',
              status: EvidenceSyncItemStatus.conflict,
              errorCode: 'idempotency_payload_mismatch',
            ),
          ],
        ),
      );
      final service = EvidenceSyncReplayService(queue: queue, api: firstApi);

      final first = await service.replayTenant('tenant-local-only');
      expect(first.conflicts.single.status, SyncStatus.conflict);
      expect(first.conflicts.single.lastSafeError, contains('decisao manual'));

      final secondApi = _FakeEvidenceApi(_response());
      final second = await EvidenceSyncReplayService(
        queue: queue,
        api: secondApi,
      ).replayTenant('tenant-local-only');
      expect(secondApi.captured, isNull);
      expect(second.conflicts, isEmpty);
    });

    test('rejected action becomes failed with safe error', () async {
      final queue = InMemorySyncQueueRepository();
      await queue.enqueue(
        _action(id: 'rejected-1', type: EvidenceSyncActionTypes.fieldPhoto),
      );
      final api = _FakeEvidenceApi(
        _response(
          rejected: const [
            EvidenceSyncItemResult(
              clientEvidenceId: 'rejected-1',
              status: EvidenceSyncItemStatus.rejected,
              errorCode: 'required_field',
            ),
          ],
        ),
      );

      final result = await EvidenceSyncReplayService(
        queue: queue,
        api: api,
      ).replayTenant('tenant-local-only');

      expect(result.failed.single.status, SyncStatus.failed);
      expect(result.failed.single.retryCount, 1);
      expect(result.failed.single.lastErrorCode, 'required_field');
      expect(result.failed.single.lastSafeError, isNot(contains('token')));
    });
  });

  test('evidence endpoint matches B-098E backend contract', () {
    expect(EvidenceApiEndpoints.sync, '/api/v1/mobile/sync/evidence-actions');
  });
}

String _fixedBatchId() => 'batch-fixed';
