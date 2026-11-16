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

// B-APP-SESSAO-RENOVA (D9): cada recusa com a sua frase. A sessão morta, o
// acesso não permitido e a senha errada no login deixam de dizer a mesma coisa.
const kSessionExpiredMessage =
    'Sua sessão expirou. Entre de novo para continuar.';
const kSessionCheckFailedMessage =
    'Não foi possível confirmar a sua sessão agora. Tente de novo.';
const kLoginRefusedMessage =
    'Não foi possível entrar. Confira o e-mail e a senha.';

base class ApiUnauthorizedError extends ApiError {
  const ApiUnauthorizedError([super.safeMessage = kSessionExpiredMessage]);
}

/// 401 de uma rota autenticada: o servidor não aceita mais a sessão.
final class ApiSessionExpiredError extends ApiUnauthorizedError {
  const ApiSessionExpiredError() : super(kSessionExpiredMessage);
}

/// 403: a sessão vale, mas o papel não pode fazer esta ação.
final class ApiForbiddenError extends ApiUnauthorizedError {
  const ApiForbiddenError() : super('Você não tem permissão para esta ação.');
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

/// Thrown by Pending* stubs when the remote integration is not yet active.
/// UIs must catch this and display a controlled, user-friendly message.
final class ApiIntegrationUnavailableError extends ApiError {
  const ApiIntegrationUnavailableError([
    super.safeMessage =
        'Integração remota ainda não disponível. '
        'Seus dados ficam guardados neste aparelho.',
  ]);
}
