import '../network/api_contracts.dart';
import 'sync_models.dart';

const syncInterruptedErrorCode = 'SYNC_INTERRUPTED';
const syncInterruptedManualSafeError =
    'O envio foi interrompido antes da confirmação. Minha versao reenvia; '
    'Versao do gestor encerra este item.';
const syncInterruptedAutoSafeError =
    'O envio foi interrompido antes da confirmação. Este item voltou para a '
    'fila de envio.';

// Estes tres tipos possuem recibo duravel/idempotente confirmado pelo backend
// e, por isso, podem voltar automaticamente para pending. Anexo de recibo,
// material, OS, checklist, evidencia e tipo desconhecido ficam fora por
// seguranca (fail-closed) e exigem decisao manual.
const kAutoResendAfterInterruption = <String>{
  ExpenseSyncActionTypes.reportCreate,
  ExpenseSyncActionTypes.itemCreate,
  ExpenseSyncActionTypes.reportSubmit,
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
