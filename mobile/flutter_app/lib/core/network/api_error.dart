sealed class ApiError implements Exception {
  const ApiError(this.safeMessage);

  final String safeMessage;
}

final class ApiNetworkError extends ApiError {
  const ApiNetworkError([super.safeMessage = 'Sem conexao com o servidor.']);
}

final class ApiTimeoutError extends ApiError {
  const ApiTimeoutError([
    super.safeMessage = 'Servidor nao respondeu a tempo. Tente novamente.',
  ]);
}

final class ApiUnauthorizedError extends ApiError {
  const ApiUnauthorizedError([
    super.safeMessage = 'Sessao expirada. Faca login novamente.',
  ]);
}

final class ApiConflictError extends ApiError {
  const ApiConflictError([
    super.safeMessage = 'Conflito de dados. Sincronizacao manual necessaria.',
  ]);
}

final class ApiServerError extends ApiError {
  const ApiServerError({
    required this.statusCode,
    String safeMessage = 'Erro interno do servidor.',
  }) : super(safeMessage);

  final int statusCode;
}
