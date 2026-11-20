import '../network/api_error.dart';
import 'sync_models.dart';

/// B-APP-ORG (§A1): o pedido do lote era de outra sessão (a pessoa trocou de
/// organização) e foi recusado sem sair do aparelho (`ApiSessionChangedError`).
/// Nada chegou ao servidor: a ação volta a `pending` sem gastar tentativa e
/// sai quando a pessoa voltar à organização dela.
SyncAction backToPendingSessionChanged(SyncAction action) {
  return action.copyWith(
    status: SyncStatus.pending,
    // dart format off
      retryCount: action.retryCount, // sessão trocou: a tentativa não conta
    // dart format on
    lastErrorCode: 'SESSION_CHANGED',
    lastSafeError: kSessionChangedMessage,
  );
}
