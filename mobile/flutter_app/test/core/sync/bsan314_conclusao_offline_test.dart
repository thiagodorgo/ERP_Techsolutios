import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

// B-SAN3-14 (R-R2-01, linha 32 da emenda 1) — A CONCLUSÃO OFFLINE CONVERGE.
//
// Sem sinal, o técnico conclui a entrega e depois a OS: as duas ações ficam na
// fila. No passe de sync, o replay da OS roda ANTES do da vistoria, então a
// conclusão da OS chega ao servidor com a entrega ainda em andamento e é
// recusada (`rejected`, `delivery_checklist_pending`, a trava 422 do
// servidor). O app trata `rejected` como `failed`, que volta no passe seguinte
// com o MESMO `client_action_id`. Resultado esperado: em até 2 passes a OS está
// concluída no servidor e nenhuma ação fica em conflito (parada).
//
// O caso é verde hoje por desenho (o app já reenvia `failed`); a prova é a
// mutação do `sync_replay_service.dart` (`failed` → `conflict`), aplicada e
// revertida na evidência, nunca commitada (o arquivo é do B-SAN3-16).

const _tenant = 'tenant-bsan314-off';
const _woServerId = '11111111-2222-4333-8444-555555555555';
const _deliveryServerId = '66666666-7777-4888-8999-aaaaaaaaaaaa';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Guincho'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:status'}),
);

// O "servidor": a entrega em andamento até chegar a conclusão dela.
class _Servidor {
  bool entregaConcluida = false;
  final List<String> statusRecebidos = [];
}

// Adaptador Dio que responde no formato de `POST /mobile/work-orders/sync`.
class _WorkOrderSyncAdapter implements HttpClientAdapter {
  _WorkOrderSyncAdapter(this.servidor);

  final _Servidor servidor;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<List<int>>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    final body = options.data as Map<String, Object?>;
    final accepted = <Map<String, Object?>>[];
    final rejected = <Map<String, Object?>>[];
    for (final action in (body['actions'] as List).cast<Map>()) {
      final id = action['client_action_id'] as String;
      servidor.statusRecebidos.add(
        servidor.entregaConcluida ? 'aceita' : 'recusada',
      );
      if (servidor.entregaConcluida) {
        accepted.add({'client_action_id': id, 'status': 'accepted'});
      } else {
        rejected.add({
          'client_action_id': id,
          'status': 'rejected',
          'error': {
            'code': 'WORK_ORDER_UNPROCESSABLE',
            'reason': 'delivery_checklist_pending',
            'message': 'Conclua a vistoria de entrega antes de concluir a OS.',
          },
        });
      }
    }
    final json = <String, Object?>{
      'data': {
        'accepted': accepted,
        'already_applied': const [],
        'rejected': rejected,
        'conflicts': const [],
      },
    };
    return ResponseBody.fromString(
      _encode(json),
      200,
      headers: {
        Headers.contentTypeHeader: [Headers.jsonContentType],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

String _encode(Object? value) {
  if (value is Map) {
    return '{${value.entries.map((e) => '"${e.key}":${_encode(e.value)}').join(',')}}';
  }
  if (value is List) return '[${value.map(_encode).join(',')}]';
  if (value is String) return '"$value"';
  return '$value';
}

// A vistoria: concluir a entrega no servidor (não espera foto).
class _ChecklistApi implements ChecklistSyncBatchApi {
  _ChecklistApi(this.servidor);

  final _Servidor servidor;

  @override
  Future<List<SyncActionResult>> sendBatch(List<SyncAction> actions) async {
    return [
      for (final action in actions)
        if (action.type == ChecklistSyncActionTypes.runComplete) ...[
          () {
            servidor.entregaConcluida = true;
            return SyncActionResult(
              clientActionId: action.clientActionId,
              status: 'processed',
            );
          }(),
        ],
    ];
  }
}

class _NoopExpenseReplay extends SyncReplayService {
  _NoopExpenseReplay()
    : super(
        queue: InMemorySyncQueueRepository(),
        api: MockExpenseSyncBatchApi(),
      );

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

class _NoopEvidenceReplay extends EvidenceSyncReplayService {
  _NoopEvidenceReplay()
    : super(
        queue: InMemorySyncQueueRepository(),
        api: const PendingEvidenceSyncBatchApi(),
      );

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async =>
      const SyncReplayResult(synced: [], failed: [], conflicts: []);
}

void main() {
  test('conclusão offline: entrega e OS na fila, o servidor recusa a OS '
      'enquanto a entrega está em andamento; em até 2 passes a OS está '
      'concluída e nenhuma ação fica em conflito', () async {
    final servidor = _Servidor();
    final queue = InMemorySyncQueueRepository();
    final factory = SyncActionFactory();
    final dio = Dio(BaseOptions(baseUrl: 'https://erp.invalid/api/v1'))
      ..httpClientAdapter = _WorkOrderSyncAdapter(servidor);

    // Sem sinal: o técnico conclui a entrega e, logo depois, a OS.
    final entrega = factory.create(
      tenantId: _tenant,
      type: ChecklistSyncActionTypes.runComplete,
      payload: {
        'local_run_id': 'clrun-e_bsan314',
        'server_run_id': _deliveryServerId,
        'has_divergence': false,
      },
    );
    final os = factory.create(
      tenantId: _tenant,
      type: WorkOrderSyncActionTypes.statusUpdate,
      payload: {
        'local_id': _woServerId,
        'server_id': _woServerId,
        'new_status': 'completed',
      },
    );
    await queue.enqueue(entrega);
    await queue.enqueue(os);

    final container = ProviderContainer(
      overrides: [
        bootstrapSessionProvider.overrideWith((ref) async => _session),
        syncReplayServiceProvider.overrideWithValue(_NoopExpenseReplay()),
        workOrderSyncReplayServiceProvider.overrideWithValue(
          WorkOrderSyncReplayService(
            queue: queue,
            api: DioWorkOrderSyncBatchApi(dio),
          ),
        ),
        checklistSyncReplayServiceProvider.overrideWithValue(
          ChecklistSyncReplayService(
            queue: queue,
            api: _ChecklistApi(servidor),
            supportedActionTypes: backendChecklistActionTypes,
            extraEligibility: checklistActionReadyForBackend,
          ),
        ),
        evidenceSyncReplayServiceProvider.overrideWithValue(
          _NoopEvidenceReplay(),
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
    addTearDown(container.dispose);
    await container.read(bootstrapSessionProvider.future);
    container.read(autoSyncCoordinatorProvider);
    final coordinator = container.read(autoSyncCoordinatorProvider.notifier);

    Future<SyncAction> estado(SyncAction a) async =>
        (await queue.actionsForTenant(
          _tenant,
        )).singleWhere((x) => x.clientActionId == a.clientActionId);

    // Passada 1: a OS é recusada (tente de novo) e a entrega sobe.
    await coordinator.triggerManual();
    expect((await estado(os)).status, SyncStatus.failed);
    expect((await estado(entrega)).status, SyncStatus.synced);

    // Passada 2: a MESMA ação da OS é aceita.
    await coordinator.triggerManual();
    expect((await estado(os)).status, SyncStatus.synced);
    expect(servidor.statusRecebidos, ['recusada', 'aceita']);

    final conflitos = (await queue.actionsForTenant(
      _tenant,
    )).where((a) => a.status == SyncStatus.conflict);
    expect(conflitos, isEmpty);
  });
}
