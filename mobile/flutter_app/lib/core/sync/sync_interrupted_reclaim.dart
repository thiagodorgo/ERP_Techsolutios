import '../network/api_contracts.dart';
import 'sync_models.dart';

const syncInterruptedErrorCode = 'SYNC_INTERRUPTED';
const syncInterruptedManualSafeError =
    'O envio foi interrompido antes da confirmação. Minha versão reenvia; '
    'Versão do gestor encerra este item.';
const syncInterruptedAutoSafeError =
    'O envio foi interrompido antes da confirmação. Este item voltou para a '
    'fila de envio.';

// Estes tipos possuem recibo duravel/idempotente confirmado pelo backend e, por
// isso, podem voltar automaticamente para pending:
// - os quatro de RDV (`ExpenseSyncActionTypes.backendSupported`);
// - o material da OS (B-MATERIAL-REENVIO, C2 item 16, S10): o servidor baixa por
//   origem, com indice unico (organizacao, `work_order_material`, `client_action_id`)
//   e fast-path em `createExitForSource`; o reenvio do mesmo `client_action_id`
//   pelo mesmo ator volta `already_applied`, e o `remove` sem baixa ativa tambem
//   (`removeExitForSource` idempotente). Testes: `tests/b-material-sync.test.ts`
//   RC2(2)/(14) e `tests/b-material-sync-db.test.ts` RC3(2).
// OS, checklist, evidencia e tipo desconhecido ficam fora por seguranca
// (fail-closed) e exigem decisao manual.
const kAutoResendAfterInterruption = <String>{
  ...ExpenseSyncActionTypes.backendSupported,
  InventorySyncActionTypes.materialAdd,
  InventorySyncActionTypes.materialRemove,
};

List<SyncAction> reclaimInterruptedSyncing(
  Iterable<SyncAction> actions, {
  Set<String> autoResendTypes = kAutoResendAfterInterruption,
}) {
  return actions
      .where((action) => action.status == SyncStatus.syncing)
      .map((action) {
        final canAutoResend = autoResendTypes.contains(action.type);
        return action.copyWith(
          status: canAutoResend ? SyncStatus.pending : SyncStatus.conflict,
          lastErrorCode: syncInterruptedErrorCode,
          lastSafeError: canAutoResend
              ? syncInterruptedAutoSafeError
              : syncInterruptedManualSafeError,
          clearProcessedAt: true,
        );
      })
      .toList(growable: false);
}

List<SyncAction> reclaimExpensesAwaitingBackend(Iterable<SyncAction> actions) {
  return actions
      .where(
        (action) =>
            ExpenseSyncActionTypes.supported.contains(action.type) &&
            (action.status == SyncStatus.failed ||
                action.status == SyncStatus.syncing),
      )
      .map(
        (action) => action.copyWith(
          status: SyncStatus.pending,
          retryCount: 0,
          clearLastErrorCode: true,
          clearLastSafeError: true,
          clearProcessedAt: true,
        ),
      )
      .toList(growable: false);
}

List<SyncAction> reclaimQueueAtPassStart(
  Iterable<SyncAction> actions, {
  required bool expenseChannelOff,
}) {
  if (!expenseChannelOff) return reclaimInterruptedSyncing(actions);

  final reclaimed = <SyncAction>[];
  for (final action in actions) {
    final isExpense = ExpenseSyncActionTypes.supported.contains(action.type);
    if (isExpense &&
        (action.status == SyncStatus.failed ||
            action.status == SyncStatus.syncing)) {
      reclaimed.addAll(reclaimExpensesAwaitingBackend([action]));
      continue;
    }
    if (action.status == SyncStatus.syncing) {
      reclaimed.add(reclaimInterruptedSyncing([action]).single);
    }
  }
  return List.unmodifiable(reclaimed);
}
