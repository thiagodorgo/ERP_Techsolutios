// B-O6R-11 — sonda P4 (plano §5 R4; emenda 4 F5): retrato velho na tela de Sincronização.
//
// Resultado B — NÃO REPRODUZ. O par de produção (`_mapDependentActions` grava `server_id` numa ação em `conflict`
// enquanto a tela segura o retrato velho dela) exige uma ação dependente de OS em `conflict` SEM `server_id`. Pela API
// pública esse estado é inalcançável: a dependente sem `server_id` não é elegível ao envio, logo nunca recebe
// `conflict` do servidor nem fica `syncing` para o resgate da interrupção; e a que tem `server_id` é pulada pelo
// mapeamento. Pendência BAIXA `P-MOBILE-SYNC-SCREEN-RETRATO-VELHO`. `_resolveStalled` já relê (D7.5, w11).
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_interrupted_reclaim.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenantId = 'tenant-bo6r11-sonda-p4';
const _localId = 'wo-local-sonda-p4';
const _serverId = 'srv-sonda-p4';

SyncAction _seed(String id, String type, Map<String, Object?> payload) =>
    SyncAction(
      clientActionId: id,
      tenantId: _tenantId,
      type: type,
      payload: payload,
      status: SyncStatus.pending,
      createdAt: DateTime.utc(2026, 11, 2, 9, 0, int.parse(id.substring(2))),
    );

bool _isDependent(SyncAction a) =>
    a.type == WorkOrderSyncActionTypes.statusUpdate ||
    a.type == WorkOrderSyncActionTypes.assign;

bool _hasServerId(SyncAction a) {
  final v = a.payload['server_id'];
  return v is String && v.trim().isNotEmpty;
}

/// O estado que o par de produção exige: dependente de OS em `conflict` sem `server_id`.
List<SyncAction> _probeState(List<SyncAction> actions) => [
  for (final a in actions)
    if (_isDependent(a) && a.status == SyncStatus.conflict && !_hasServerId(a))
      a,
];

SyncAction _byId(List<SyncAction> actions, String id) =>
    actions.singleWhere((a) => a.clientActionId == id);

void main() {
  test('sonda P4: dependente de OS em conflict sem server_id é inalcançável '
      'pela API pública; o retrato velho da tela não apaga o server_id '
      '(resultado B, não reproduz)', () async {
    final queue = InMemorySyncQueueRepository();
    // Formas de produção (`work_order_repository.dart`): dependentes levam `local_id` e só levam `server_id`
    // quando a OS já tem um.
    final create = _seed('a-1', WorkOrderSyncActionTypes.create, {
      'local_id': _localId,
      'title': 'OS da sonda',
    });
    final status = _seed('a-2', WorkOrderSyncActionTypes.statusUpdate, {
      'local_id': _localId,
      'new_status': 'inService',
    });
    final assign = _seed('a-3', WorkOrderSyncActionTypes.assign, {
      'local_id': _localId,
      'operator_id': 'op-1',
    });
    for (final a in [create, status, assign]) {
      await queue.enqueue(a);
    }
    final observations = <List<SyncAction>>[];
    Future<List<SyncAction>> observe() async {
      final now = await queue.actionsForTenant(_tenantId);
      observations.add(now);
      return now;
    }

    // Sem `server_id` a dependente não é elegível ao envio.
    expect(b103WorkOrderActionReadyForBackend(status), isFalse);
    expect(b103WorkOrderActionReadyForBackend(assign), isFalse);

    // Passada 1: o servidor devolve conflito para tudo o que recebe.
    final allConflict = CaptureWorkOrderBatchApi(
      (batch) => [
        for (final a in batch)
          SyncActionResult(
            clientActionId: a.clientActionId,
            status: 'conflict',
          ),
      ],
    );
    await WorkOrderSyncReplayService(
      queue: queue,
      api: allConflict,
    ).replayTenant(_tenantId);
    var now = await observe();
    expect(_probeState(now), isEmpty);
    expect(allConflict.captured!.map((a) => a.clientActionId), ['a-1']);
    expect(_byId(now, 'a-1').status, SyncStatus.conflict);
    expect(_byId(now, 'a-2').status, SyncStatus.pending);
    expect(_byId(now, 'a-3').status, SyncStatus.pending);

    // Resgate do início da passada: só toca `syncing`, que exige ter sido enviada.
    for (final expenseChannelOff in [true, false]) {
      expect(
        reclaimQueueAtPassStart(
          now,
          expenseChannelOff: expenseChannelOff,
        ).where(_isDependent),
        isEmpty,
      );
    }

    // O técnico mantém a versão dele na criação; a passada 2 cria a OS e o mapeamento grava o `server_id` nas
    // dependentes ainda `pending`, que então vão ao servidor e voltam em conflito JÁ com o `server_id`.
    await queue.update(
      resolveConflictAction(_byId(now, 'a-1'), ConflictChoice.keepMine),
    );
    final createThenConflict = CaptureWorkOrderBatchApi(
      (batch) => [
        for (final a in batch)
          a.type == WorkOrderSyncActionTypes.create
              ? SyncActionResult(
                  clientActionId: a.clientActionId,
                  status: 'processed',
                  resultRef: _serverId,
                )
              : SyncActionResult(
                  clientActionId: a.clientActionId,
                  status: 'conflict',
                ),
      ],
    );
    await WorkOrderSyncReplayService(
      queue: queue,
      api: createThenConflict,
    ).replayTenant(_tenantId);
    now = await observe();
    expect(_byId(now, 'a-1').status, SyncStatus.synced);
    for (final id in ['a-2', 'a-3']) {
      expect(_byId(now, id).status, SyncStatus.conflict);
      expect(_byId(now, id).payload['server_id'], _serverId);
    }

    // O estado exigido pelo par de produção não apareceu em nenhuma observação.
    for (final snapshot in observations) {
      expect(_probeState(snapshot), isEmpty);
    }

    // O retrato velho da tela já carrega o `server_id`: "Minha versão" sobre ele não o apaga, e uma passada
    // posterior não reescreve a ação em conflito (o mapeamento pula quem já tem `server_id`).
    final staleSnapshot = _byId(now, 'a-2');
    await WorkOrderSyncReplayService(
      queue: queue,
      api: createThenConflict,
    ).replayTenant(_tenantId);
    await queue.update(
      resolveConflictAction(staleSnapshot, ConflictChoice.keepMine),
    );
    now = await observe();
    expect(_byId(now, 'a-2').status, SyncStatus.pending);
    expect(_byId(now, 'a-2').payload['server_id'], _serverId);
  });
}
