import 'sync_models.dart';

/// B-APP-SESSAO-RENOVA (D8): a frase da ação que espera o novo login.
const kSyncSessionExpiredMessage =
    'Sua sessão expirou. Este item sai quando você entrar de novo.';

/// B-APP-SESSAO-RENOVA (D8): o lote levou 401 e a renovação foi recusada (a
/// sessão morreu). O 401 é anterior ao handler, então o servidor não aplicou
/// nada: a ação volta a `pending` sem gastar tentativa e sai no novo login.
SyncAction backToPendingSessionExpired(
  SyncAction action, {
  String safeError = kSyncSessionExpiredMessage,
}) {
  return action.copyWith(
    status: SyncStatus.pending,
    // dart format off
      retryCount: action.retryCount, // sessão morta: a tentativa não conta
    // dart format on
    lastErrorCode: 'SESSION_EXPIRED',
    lastSafeError: safeError,
  );
}
