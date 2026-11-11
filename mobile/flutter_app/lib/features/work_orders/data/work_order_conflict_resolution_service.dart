import '../../../core/network/api_contracts.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_queue_repository.dart';
import '../domain/work_order_models.dart';
import 'work_order_local_store.dart';

enum WorkOrderConflictResolution {
  keepLocalAndRetry,
  acceptServer,
  manualReview,

  /// B-SAN3-26 (C26-02) — a chegada foi recusada pelo servidor (placa não conferida): desfaz a chegada otimista e
  /// pede a placa de novo. É a única saída do cartão de check-in ("Manter local" repetiria a recusa; "Aceitar
  /// servidor" não reverte o status).
  redoCheckin,
}

/// B-SAN3-26 — os 3 motivos de recusa do check-in, iguais aos do servidor (`CHECKIN_REFUSAL_REASONS`, em
/// `src/modules/work-orders/work-order.checkin.ts`). Os dois testes conferem a lista literal.
const kCheckinRefusalCodes = <String>{
  'checkin_confirmation_required',
  'checkin_confirmation_mismatch',
  'checkin_reference_missing',
};

/// O código gravado nas ações aposentadas pelo `redoCheckin`: a ação ficou `synced` para sair da fila, mas o servidor
/// a RECUSOU — um relatório que conte `synced` como "enviado" lê este código (risco 10 do plano, declarado).
const kCheckinRedoRequiredCode = 'CHECKIN_REDO_REQUIRED';

/// B-SAN3-26 (decisão B do dono, `D-PORTAO-5-RECOMENDACOES-1111`) — o texto da OS sem placa, igual no diálogo de
/// chegada, no cartão da OS e na tela Sincronização.
const kCheckinMissingReferenceMessage =
    'Esta OS está sem placa cadastrada. Peça à base para cadastrar a placa '
    'ou para registrar a sua chegada.';

/// O motivo da recusa, em português, para o guincheiro (o código técnico nunca aparece na tela).
String checkinRefusalMessage(String? code) => switch (code) {
  'checkin_confirmation_mismatch' =>
    'Os dígitos não conferem com a placa cadastrada.',
  'checkin_confirmation_required' => 'Falta a confirmação da placa.',
  'checkin_reference_missing' => kCheckinMissingReferenceMessage,
  _ => 'O servidor não confirmou a chegada ao local.',
};

/// A ação de chegada (`arrived`) que o servidor recusou por causa da placa e que espera o "Confirmar a placa de novo".
bool isCheckinRefusalAction(SyncAction action) =>
    action.status == SyncStatus.conflict &&
    action.type == WorkOrderSyncActionTypes.statusUpdate &&
    action.payload['new_status'] == WorkOrderStatus.arrived.name &&
    kCheckinRefusalCodes.contains(action.lastErrorCode);

/// As OS (por `local_id`) com chegada recusada à espera do toque. O pull não as sobrescreve (C26R2-01).
Set<String> checkinRedoPendingLocalIds(Iterable<SyncAction> actions) => {
  for (final action in actions)
    if (isCheckinRefusalAction(action))
      if (action.payload['local_id'] case final String localId) localId,
};

/// B-SAN3-26 (C26R2-02) — as ações que uma chegada recusada arrasta: a própria chegada e toda ação de status da mesma
/// OS criada depois dela e ainda não sincronizada. É o que o `redoCheckin` aposenta, e o que a tela Sincronização não
/// pode oferecer como "Minha versão"/"Versão do gestor". Devolve `clientActionId → local_id da OS`.
Map<String, String> checkinRedoAffectedActionIds(Iterable<SyncAction> actions) {
  final all = actions.toList(growable: false);
  final affected = <String, String>{};
  for (final checkinAction in all.where(isCheckinRefusalAction)) {
    final localId = checkinAction.payload['local_id'];
    if (localId is! String) continue;
    for (final action in all) {
      if (!_isLaterStatusActionOf(action, localId, checkinAction)) continue;
      affected[action.clientActionId] = localId;
    }
  }
  return affected;
}

bool _isLaterStatusActionOf(
  SyncAction action,
  String localId,
  SyncAction checkinAction,
) {
  if (action.type != WorkOrderSyncActionTypes.statusUpdate) return false;
  if (action.payload['local_id'] != localId) return false;
  if (action.status == SyncStatus.synced) return false;
  if (action.createdAt.isBefore(checkinAction.createdAt)) return false;
  return true;
}

class WorkOrderConflictResolutionService {
  const WorkOrderConflictResolutionService({
    required SyncQueueRepository queue,
    required WorkOrderLocalStore store,
  }) : _queue = queue,
       _store = store;

  final SyncQueueRepository _queue;
  final WorkOrderLocalStore _store;

  Future<List<SyncAction>> conflictsForWorkOrder({
    required String tenantId,
    required String localId,
  }) async {
    final actions = await _queue.actionsForTenant(tenantId);
    return actions
        .where((action) => action.status == SyncStatus.conflict)
        .where((action) => action.type.startsWith('work_order.'))
        .where((action) => action.payload['local_id'] == localId)
        .toList(growable: false);
  }

  Future<void> resolve({
    required String tenantId,
    required String localId,
    required WorkOrderConflictResolution resolution,
  }) async {
    if (resolution == WorkOrderConflictResolution.redoCheckin) {
      await undoRefusedCheckin(tenantId: tenantId, localId: localId);
      return;
    }

    final conflicts = await conflictsForWorkOrder(
      tenantId: tenantId,
      localId: localId,
    );
    if (conflicts.isEmpty) return;

    switch (resolution) {
      case WorkOrderConflictResolution.keepLocalAndRetry:
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              status: SyncStatus.pending,
              clearLastErrorCode: true,
              clearLastSafeError: true,
              clearProcessedAt: true,
            ),
          );
        }
        await _updateOrder(localId, syncStatus: SyncStatus.pending);
        return;

      case WorkOrderConflictResolution.acceptServer:
        final serverId = _serverIdFrom(conflicts);
        if (serverId == null) {
          throw StateError(
            'Estado remoto insuficiente para aceitar com seguranca.',
          );
        }
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              status: SyncStatus.synced,
              processedAt: DateTime.now().toUtc(),
              clearLastErrorCode: true,
              clearLastSafeError: true,
            ),
          );
        }
        await _updateOrder(
          localId,
          syncStatus: SyncStatus.synced,
          serverId: serverId,
        );
        return;

      case WorkOrderConflictResolution.manualReview:
        for (final action in conflicts) {
          await _queue.update(
            action.copyWith(
              lastErrorCode: 'MANUAL_REVIEW_REQUIRED',
              lastSafeError: 'Conflito mantido para revisao manual.',
            ),
          );
        }
        await _updateOrder(localId, syncStatus: SyncStatus.conflict);
        return;

      case WorkOrderConflictResolution.redoCheckin:
        return;
    }
  }

  /// B-SAN3-26 (C26-02, N-02) — desfaz a chegada recusada: a OS volta ao status de antes da chegada (`previous_status`
  /// da ação, `enRoute`), sem `arrivedAt`, e `synced` (o pull volta a atualizá-la); a chegada recusada e toda ação de
  /// status posterior da mesma OS saem da fila com [kCheckinRedoRequiredCode]. A nova chegada é uma ação NOVA (outro
  /// `client_action_id`): o recibo de idempotência do servidor só guarda o que foi aceito. Devolve a OS restaurada,
  /// ou `null` quando não há chegada recusada para desfazer.
  Future<WorkOrder?> undoRefusedCheckin({
    required String tenantId,
    required String localId,
  }) async {
    final actions = await _queue.actionsForTenant(tenantId);
    SyncAction? refused;
    for (final action in actions) {
      if (!isCheckinRefusalAction(action)) continue;
      if (action.payload['local_id'] != localId) continue;
      final earliest = refused;
      if (earliest == null || action.createdAt.isBefore(earliest.createdAt)) {
        refused = action;
      }
    }
    final checkinAction = refused;
    if (checkinAction == null) return null;

    final now = DateTime.now().toUtc();
    var serviceWasStarted = false;
    for (final action in actions) {
      if (action.type != WorkOrderSyncActionTypes.statusUpdate) continue;
      if (action.payload['local_id'] != localId) continue;
      if (action.status == SyncStatus.synced) continue;
      if (action.createdAt.isBefore(checkinAction.createdAt)) continue;
      if (action.payload['new_status'] == WorkOrderStatus.inService.name) {
        serviceWasStarted = true;
      }
      await _queue.update(
        action.copyWith(
          status: SyncStatus.synced,
          processedAt: now,
          lastErrorCode: kCheckinRedoRequiredCode,
          lastSafeError: 'Chegada recusada; confirme a placa de novo.',
        ),
      );
    }

    final orders = await _store.loadWorkOrders();
    for (final current in orders) {
      if (current.localId != localId) continue;
      final restored = _restoreBeforeCheckin(
        current,
        checkinAction,
        serviceWasStarted,
        now,
      );
      await _store.saveWorkOrder(restored);
      return restored;
    }
    return null;
  }

  WorkOrder _restoreBeforeCheckin(
    WorkOrder current,
    SyncAction checkinAction,
    bool serviceWasStarted,
    DateTime now,
  ) {
    final previous = WorkOrderStatus.values.firstWhere(
      (status) => status.name == checkinAction.payload['previous_status'],
      orElse: () => WorkOrderStatus.enRoute,
    );
    return current.copyWith(
      status: previous,
      syncStatus: SyncStatus.synced,
      updatedAt: now,
      clearArrivedAt: true,
      // O `startedAt` só pode ter sido preenchido pelo "Iniciar atendimento" posterior, que acabou de ser aposentado.
      clearStartedAt: serviceWasStarted,
    );
  }

  String? _serverIdFrom(List<SyncAction> conflicts) {
    for (final action in conflicts) {
      for (final key in const ['result_ref', 'server_id', 'work_order_id']) {
        final value = action.payload[key];
        if (value is String &&
            value.trim().isNotEmpty &&
            !value.toLowerCase().startsWith('wo-local-')) {
          return value.trim();
        }
      }
    }
    return null;
  }

  Future<void> _updateOrder(
    String localId, {
    required SyncStatus syncStatus,
    String? serverId,
  }) async {
    final orders = await _store.loadWorkOrders();
    for (final current in orders) {
      if (current.localId != localId) continue;
      final WorkOrder next = current.copyWith(
        syncStatus: syncStatus,
        serverId: serverId,
      );
      await _store.saveWorkOrder(next);
      return;
    }
  }
}
