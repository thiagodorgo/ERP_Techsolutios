// B-SAN3-16 (P5) — nenhuma ação pendente fica invisível na fila do aparelho.
//
// Toda constante de `*SyncActionTypes` tem uma rota declarada aqui:
//   - envio: algum replay a envia (os conjuntos de envio dos replays, mais o material);
//   - aguarda: tipo conhecido ainda sem envio, com a pendência dona nomeada em `syncActionAwaitingOwner`;
//   - sem envio: constante sem produtor no app.
// Tipo fora da tabela é negado (fail-closed): vira "sem envio". A guarda `bsan316_rota_de_toda_acao_test.dart` (R1)
// lê as constantes do `api_contracts.dart` e os conjuntos de envio do código, e fica vermelha se um tipo novo nascer
// sem rota, ou se a rota "envio" deixar de ser exatamente o que os replays enviam.
//
// A cada passe do coordenador, logo depois do resgate, a varredura pega as ações `pending` DO USUÁRIO DA SESSÃO (a
// fila por usuário) que não têm como sair — rota "sem envio", tipo fora da tabela, forma que o servidor recusaria
// sempre (pedido ou "não iniciou" sem motivo) ou pedido órfão (a OS nunca foi enviada) — e as marca como erro visível:
// `failed`, `retryCount = kSyncMaxRetry` e `UNROUTABLE_ACTION`, com uma mensagem por causa. Elas aparecem em "Envio não
// concluído", com "Tentar de novo" e "Descartar". A varredura não toca `failed`, `syncing` nem `conflict`: a
// convergência do B-SAN3-14 (recusa → `failed` reenviável) não muda.
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/api_contracts.dart';
import 'sync_models.dart';
import 'sync_providers.dart';
import 'sync_queue_repository.dart';
import 'sync_replay_service.dart';
import 'sync_stalled_resolver.dart';

enum SyncActionRoute { replay, awaitingBlock, unroutable }

const syncUnroutableErrorCode = 'UNROUTABLE_ACTION';

// Uma mensagem por causa (Emenda 1.1 §7.5): só a primeira fala em atualizar o aplicativo, porque só nela atualizar
// resolve. Nenhuma promete reenvio: "Tentar de novo" devolve o registro à fila, e o passe seguinte o marca de novo.
const syncUnroutableVersionMessage =
    'Esta versão do aplicativo não consegue enviar este registro. '
    'Atualize o aplicativo ou descarte o registro.';
const syncUnroutableStatusMessage =
    'Esta mudança de status não é enviada ao servidor. Descarte o registro. '
    'Para pedir aprovação, use "Solicitar aprovação" na OS.';
const syncUnroutableMissingReasonMessage =
    'Este registro está sem motivo e não pode ser enviado. '
    'Descarte o registro e registre de novo na OS.';
const syncUnroutableOrphanMessage =
    'A OS deste registro não foi enviada ao servidor. '
    'Descarte o registro e registre de novo na OS.';

/// A rota de cada constante de `*SyncActionTypes` (`api_contracts.dart`).
const syncActionRoutes = <String, SyncActionRoute>{
  // Ordens de serviço (`WorkOrderSyncReplayService`, `b107BackendWorkOrderActionTypes`).
  WorkOrderSyncActionTypes.create: SyncActionRoute.replay,
  WorkOrderSyncActionTypes.statusUpdate: SyncActionRoute.replay,
  WorkOrderSyncActionTypes.assign: SyncActionRoute.replay,
  WorkOrderSyncActionTypes.approvalRequest: SyncActionRoute.replay,
  WorkOrderSyncActionTypes.unableToStart: SyncActionRoute.replay,
  // Constante sem produtor no app.
  WorkOrderSyncActionTypes.evidenceAttach: SyncActionRoute.unroutable,
  // Despesas (`ExpenseSyncActionTypes.backendSupported`; o comprovante sai pela rota multipart).
  ExpenseSyncActionTypes.reportCreate: SyncActionRoute.replay,
  ExpenseSyncActionTypes.itemCreate: SyncActionRoute.replay,
  ExpenseSyncActionTypes.reportSubmit: SyncActionRoute.replay,
  ExpenseSyncActionTypes.receiptAttach: SyncActionRoute.replay,
  // Vistorias (`backendChecklistActionTypes`). A execução nasce do despacho: `runCreate` não tem produtor.
  ChecklistSyncActionTypes.runCreate: SyncActionRoute.unroutable,
  ChecklistSyncActionTypes.answerUpsert: SyncActionRoute.replay,
  ChecklistSyncActionTypes.runComplete: SyncActionRoute.replay,
  ChecklistSyncActionTypes.markerCreate: SyncActionRoute.replay,
  ChecklistSyncActionTypes.divergenceCreate: SyncActionRoute.replay,
  ChecklistSyncActionTypes.acknowledgementCreate: SyncActionRoute.replay,
  ChecklistSyncActionTypes.attachmentAttach: SyncActionRoute.replay,
  // Estoque: o material da OS reenvia (`InventorySyncReplayService`, #551); entrada e saída ainda não.
  InventorySyncActionTypes.entryCreate: SyncActionRoute.awaitingBlock,
  InventorySyncActionTypes.exitCreate: SyncActionRoute.awaitingBlock,
  InventorySyncActionTypes.materialAdd: SyncActionRoute.replay,
  InventorySyncActionTypes.materialRemove: SyncActionRoute.replay,
  // Evidências (`EvidenceSyncActionTypes.supported`).
  EvidenceSyncActionTypes.workOrderPhoto: SyncActionRoute.replay,
  EvidenceSyncActionTypes.workOrderSignature: SyncActionRoute.replay,
  EvidenceSyncActionTypes.workOrderObservation: SyncActionRoute.replay,
  EvidenceSyncActionTypes.fieldPhoto: SyncActionRoute.replay,
  EvidenceSyncActionTypes.fieldSignature: SyncActionRoute.replay,
  EvidenceSyncActionTypes.fieldObservation: SyncActionRoute.replay,
};

/// A pendência dona de cada tipo da rota "aguarda": quem fechá-la dá a rota "envio" ao tipo.
const syncActionAwaitingOwner = <String, String>{
  InventorySyncActionTypes.entryCreate: 'P-MOBILE-SYNC-ESTOQUE-TIPOS',
  InventorySyncActionTypes.exitCreate: 'P-MOBILE-SYNC-ESTOQUE-TIPOS',
};

/// Status do app sem equivalente no servidor (o lote os recusa com `invalid_status`, E18 do plano).
const kStatusSemEquivalenteNoServidor = <String>{
  'pendingApproval',
  'approved',
  'exception',
};

const _fieldRequestTypes = <String>{
  WorkOrderSyncActionTypes.approvalRequest,
  WorkOrderSyncActionTypes.unableToStart,
};

/// A rota desta ação: a do tipo, salvo quando a forma dela o servidor recusaria sempre.
SyncActionRoute routeOf(SyncAction action) {
  final route = syncActionRoutes[action.type] ?? SyncActionRoute.unroutable;
  if (route != SyncActionRoute.replay) return route;
  if (_fieldRequestTypes.contains(action.type)) {
    if (!workOrderActionHasReason(action)) return SyncActionRoute.unroutable;
  }
  return route;
}

/// A mensagem do erro visível de uma ação cuja rota é "sem envio".
String syncUnroutableMessageFor(SyncAction action) {
  if (_fieldRequestTypes.contains(action.type) &&
      !workOrderActionHasReason(action)) {
    return syncUnroutableMissingReasonMessage;
  }
  return syncUnroutableVersionMessage;
}

/// Pedido do técnico (aprovação ou "não iniciou") que espera o id de servidor de uma OS que nunca vai subir: a fila
/// da organização não tem `work_order.create` com o mesmo `local_id`, ou toda criação com ele foi descartada. Criação
/// ainda viva (`pending`, `syncing`, `failed`, `conflict`) ou enviada com sucesso → não é órfão.
bool isOrphanFieldRequest(SyncAction action, Iterable<SyncAction> all) {
  if (!_fieldRequestTypes.contains(action.type)) return false;
  if (b103WorkOrderActionReadyForBackend(action)) return false;
  final localId = _nonEmpty(action.payload['local_id']);
  if (localId == null) return true;
  final creates = all.where(
    (candidate) =>
        candidate.type == WorkOrderSyncActionTypes.create &&
        _nonEmpty(candidate.payload['local_id']) == localId,
  );
  return creates.every(
    (create) =>
        create.status == SyncStatus.synced &&
        create.lastErrorCode == syncDiscardedErrorCode,
  );
}

String? _nonEmpty(Object? value) =>
    value is String && value.trim().isNotEmpty ? value.trim() : null;

/// A varredura do passe: marca como erro visível o que não tem como sair.
class SyncActionRoutingSweep {
  const SyncActionRoutingSweep({required SyncQueueRepository queue})
    : _queue = queue;

  final SyncQueueRepository _queue;

  /// Devolve as ações marcadas nesta varredura.
  Future<List<SyncAction>> sweepTenant(String tenantId) async {
    final all = await _queue.actionsForTenant(tenantId);
    final marked = <SyncAction>[];
    for (final action in await _queue.pendingForTenant(tenantId)) {
      if (action.status != SyncStatus.pending) continue;
      if (routeOf(action) == SyncActionRoute.unroutable) {
        marked.add(await _mark(action, syncUnroutableMessageFor(action)));
        continue;
      }
      if (isOrphanFieldRequest(action, all)) {
        marked.add(await _mark(action, syncUnroutableOrphanMessage));
      }
    }
    return marked;
  }

  Future<SyncAction> _mark(SyncAction action, String message) async {
    final next = action.copyWith(
      status: SyncStatus.failed,
      retryCount: kSyncMaxRetry,
      lastErrorCode: syncUnroutableErrorCode,
      lastSafeError: message,
    );
    await _queue.update(next);
    return next;
  }
}

/// Sobre a fila POR USUÁRIO: a varredura nunca toca a ação de outro usuário do aparelho.
final syncActionRoutingSweepProvider = Provider<SyncActionRoutingSweep>(
  (ref) => SyncActionRoutingSweep(
    queue: ref.watch(replaySyncQueueRepositoryProvider),
  ),
);
