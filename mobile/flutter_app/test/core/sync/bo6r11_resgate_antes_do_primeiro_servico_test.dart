// B-O6R-11, conserto pós-junta do PR #483 (achado A-C1-01): o resgate da
// fila (`reclaimTenant`) roda ANTES do primeiro serviço da passada do
// coordenador. Mutação de controle N1 da C1: mover o bloco
// `try { reclaimTenant } catch` para depois do replay de OS deixa os dois
// casos vermelhos.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenantId = 'tenant-bo6r11-ordem';

const _empty = SyncReplayResult(synced: [], failed: [], conflicts: []);

class _RecordingReclaim extends SyncQueueReclaimService {
  _RecordingReclaim(this.calls, SyncQueueRepository queue)
    : super(queue: queue, expenseChannelOff: () => true);

  final List<String> calls;

  @override
  Future<void> reclaimTenant(String tenantId) {
    calls.add('reclaim');
    return super.reclaimTenant(tenantId);
  }
}

class _RecordingFieldLocation extends FieldLocationSyncService {
  _RecordingFieldLocation(this.calls)
    : super(
        store: InMemoryFieldLocationStore(),
        api: const PendingFieldLocationApi(),
      );

  final List<String> calls;

  @override
  Future<FieldLocationSyncResult> syncTenant(String tenantId) {
    calls.add('field_location');
    return super.syncTenant(tenantId);
  }
}

class _RecordingTelemetry extends TelemetrySyncService {
  _RecordingTelemetry(this.calls)
    : super(
        store: InMemoryTelemetryLocalStore(),
        api: const PendingTelemetryApi(),
      );

  final List<String> calls;

  @override
  Future<TelemetryFlushSummary> flushTenant(String tenantId) {
    calls.add('telemetry');
    return super.flushTenant(tenantId);
  }
}

class _RecordingWorkOrderReplay extends WorkOrderSyncReplayService {
  _RecordingWorkOrderReplay(this.calls, SyncQueueRepository queue, {this.fail})
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  final List<String> calls;
  final ApiError? fail;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('work_order');
    final error = fail;
    if (error != null) throw error;
    return _empty;
  }
}

class _RecordingChecklistReplay extends ChecklistSyncReplayService {
  _RecordingChecklistReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('checklist');
    return _empty;
  }
}

class _RecordingEvidenceReplay extends EvidenceSyncReplayService {
  _RecordingEvidenceReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('evidence');
    return _empty;
  }
}

class _RecordingExpenseReplay extends SyncReplayService {
  _RecordingExpenseReplay(this.calls, SyncQueueRepository queue)
    : super(queue: queue, api: MockExpenseSyncBatchApi());

  final List<String> calls;

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async {
    calls.add('expense');
    return _empty;
  }
}

BootstrapSession _session() => const BootstrapSession(
  activeTenant: TenantContext(
    tenantId: _tenantId,
    displayName: 'B-O6R-11 ordem do resgate',
  ),
  enabledModules: [],
  permissions: PermissionSet({'dashboard:read'}),
);

ProviderContainer _container(
  List<String> calls,
  SyncQueueRepository queue, {
  ApiError? workOrderFails,
}) {
  return ProviderContainer(
    overrides: [
      bootstrapSessionProvider.overrideWith((ref) async => _session()),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      syncQueueReclaimServiceProvider.overrideWithValue(
        _RecordingReclaim(calls, queue),
      ),
      fieldLocationSyncServiceProvider.overrideWithValue(
        _RecordingFieldLocation(calls),
      ),
      telemetrySyncServiceProvider.overrideWithValue(
        _RecordingTelemetry(calls),
      ),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _RecordingWorkOrderReplay(calls, queue, fail: workOrderFails),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _RecordingChecklistReplay(calls, queue),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _RecordingEvidenceReplay(calls, queue),
      ),
      syncReplayServiceProvider.overrideWithValue(
        _RecordingExpenseReplay(calls, queue),
      ),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
    ],
  );
}

Future<void> _runPass(ProviderContainer container) async {
  await container.read(bootstrapSessionProvider.future);
  container.read(autoSyncCoordinatorProvider);
  await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();
}

void main() {
  test('o1. o resgate é a primeira chamada da passada, antes de todo '
      'serviço', () async {
    final calls = <String>[];
    final queue = InMemorySyncQueueRepository();
    final container = _container(calls, queue);
    addTearDown(container.dispose);

    await _runPass(container);

    expect(calls, isNotEmpty);
    expect(calls.first, 'reclaim');
    expect(calls.where((c) => c == 'reclaim'), hasLength(1));
    for (final service in [
      'field_location',
      'telemetry',
      'work_order',
      'checklist',
      'evidence',
      'expense',
    ]) {
      expect(
        calls.indexOf('reclaim'),
        lessThan(calls.indexOf(service)),
        reason: 'o resgate tem de vir antes de $service',
      );
    }
  });

  test('o2. replay de OS que lança não impede o resgate da mesma '
      'passada', () async {
    final calls = <String>[];
    final queue = InMemorySyncQueueRepository();
    final interrupted = SyncAction(
      clientActionId: 'chk-1',
      tenantId: _tenantId,
      type: ChecklistSyncActionTypes.answerUpsert,
      payload: const {'local_run_id': 'r1'},
      status: SyncStatus.syncing,
      createdAt: DateTime.utc(2026, 11, 2, 12),
    );
    await queue.enqueue(interrupted);
    final container = _container(
      calls,
      queue,
      workOrderFails: const ApiNetworkError(),
    );
    addTearDown(container.dispose);

    await _runPass(container);

    expect(calls, contains('reclaim'));
    final after = (await queue.actionsForTenant(_tenantId)).single;
    expect(after.status, SyncStatus.conflict);
    expect(after.lastErrorCode, syncInterruptedErrorCode);
    expect(after.payload, interrupted.payload);
    expect(container.read(autoSyncCoordinatorProvider).hasError, isTrue);
  });
}
