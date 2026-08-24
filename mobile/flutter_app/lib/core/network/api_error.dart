sealed class ApiError implements Exception {
  const ApiError(this.safeMessage);

  final String safeMessage;
}

final class ApiNetworkError extends ApiError {
  const ApiNetworkError([super.safeMessage = 'Sem conexão com o servidor.']);
}

final class ApiTimeoutError extends ApiError {
  const ApiTimeoutError([
    super.safeMessage = 'Servidor não respondeu a tempo. Tente novamente.',
  ]);
}

final class ApiUnauthorizedError extends ApiError {
  const ApiUnauthorizedError([
    super.safeMessage = 'Sessão expirada. Faça login novamente.',
  ]);
}

final class ApiConflictError extends ApiError {
  const ApiConflictError([
    super.safeMessage = 'Conflito de dados. Sincronização manual necessária.',
  ]);
}

final class ApiServerError extends ApiError {
  const ApiServerError({
    required this.statusCode,
    String safeMessage = 'Erro interno do servidor.',
  }) : super(safeMessage);

  final int statusCode;
}

/// Thrown by Pending* stubs when the remote integration is not yet active.
/// UIs must catch this and display a controlled, user-friendly message.
final class ApiIntegrationUnavailableError extends ApiError {
  const ApiIntegrationUnavailableError([
    super.safeMessage =
        'Integração remota ainda não disponível. '
        'Seus dados foram mantidos localmente e serão sincronizados quando a integração estiver ativa.',
  ]);
}
