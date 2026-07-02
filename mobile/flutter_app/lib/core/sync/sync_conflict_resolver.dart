import 'sync_models.dart';

/// Escolha manual do usuário para resolver um conflito de sincronização.
enum ConflictChoice {
  /// Mantém a versão local e reenfileira para reenvio.
  keepMine,

  /// Aceita a versão do servidor (do gestor) e marca como sincronizado.
  useServer,
}

/// Aplica a escolha manual a uma ação em conflito, retornando a ação
/// atualizada. Função pura (não persiste). Ações que não estão em conflito
/// são retornadas inalteradas.
SyncAction resolveConflictAction(
  SyncAction action,
  ConflictChoice choice, {
  DateTime? resolvedAt,
}) {
  if (action.status != SyncStatus.conflict) return action;
  return switch (choice) {
    ConflictChoice.keepMine => action.copyWith(
      status: SyncStatus.pending,
      retryCount: 0,
      clearLastErrorCode: true,
      clearLastSafeError: true,
      clearProcessedAt: true,
    ),
    ConflictChoice.useServer => action.copyWith(
      status: SyncStatus.synced,
      processedAt: resolvedAt ?? action.processedAt,
      clearLastErrorCode: true,
      clearLastSafeError: true,
    ),
  };
}
