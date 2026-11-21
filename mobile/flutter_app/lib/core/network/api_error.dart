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
  const ApiForbiddenError({this.reason})
    : super('Você não tem permissão para esta ação.');

  /// B-APP-ORG-2 (CA182-09): o `error.reason` do 403 (`module_not_enabled`,
  /// `forbidden`…). Só escolhe a frase da tela; nunca é exibido.
  final String? reason;
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

// ── B-APP-ORG (itens 69 e 70): a escolha e a troca de organização ────────────

/// Uma organização que o servidor ofereceu no 409 do login (`error.tenants`).
/// Só o identificador e o nome: nada além do que o servidor mandou.
final class TenantChoice {
  const TenantChoice(this.id, this.name);

  final String id;
  final String name;

  @override
  bool operator ==(Object other) =>
      other is TenantChoice && other.id == id && other.name == name;

  @override
  int get hashCode => Object.hash(id, name);

  @override
  String toString() => 'TenantChoice($id)';
}

const kTenantSelectionRequiredMessage =
    'Sua senha vale em mais de uma organização. Escolha a organização para '
    'entrar.';
const kTenantSwitchRefusedMessage =
    'Não foi possível entrar nessa organização. Fale com o administrador.';
const kTenantSwitchMismatchMessage =
    'Não foi possível trocar de organização agora. Você continua na '
    'organização atual.';

/// 69: o login sem organização recebeu o 409 com a lista. A pessoa escolhe
/// uma das [tenants], e só delas.
final class TenantSelectionRequiredError extends ApiError {
  const TenantSelectionRequiredError(
    this.tenants, [
    super.safeMessage = kTenantSelectionRequiredMessage,
  ]);

  final List<TenantChoice> tenants;
}

/// 70: o servidor recusou a troca (403: sem vínculo, inativo ou suspensa). A
/// sessão atual fica como está. Herda direto de [ApiError]: não é sessão morta.
final class TenantSwitchRefusedError extends ApiError {
  const TenantSwitchRefusedError([
    super.safeMessage = kTenantSwitchRefusedMessage,
  ]);
}

/// 70: a troca respondeu com outra organização que não a pedida. O app recusa
/// e fica na atual (fail-closed).
final class TenantSwitchMismatchError extends ApiError {
  const TenantSwitchMismatchError([
    super.safeMessage = kTenantSwitchMismatchMessage,
  ]);
}

/// §A1 (T-b): o pedido era de outra sessão e foi recusado sem sair do aparelho.
/// "Não tentou": quem recebe volta a ação a pendente sem gastar tentativa.
// dart format off
const kSessionChangedMessage = 'A organização mudou. Nada foi enviado; o que ficou pendente sai quando você voltar a ela.';
// dart format on

/// Herda direto de [ApiError], nunca de [ApiUnauthorizedError]: um
/// `on ApiUnauthorizedError` leva a ação a `conflict` ou manda ao login.
final class ApiSessionChangedError extends ApiError {
  const ApiSessionChangedError() : super(kSessionChangedMessage);
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
