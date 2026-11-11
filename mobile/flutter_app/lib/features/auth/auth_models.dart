import 'package:equatable/equatable.dart';

enum AuthStatus {
  unauthenticated,
  authenticating,
  authenticated,
  expired,
  offlineCached,
  error,

  /// B-USERS-ACESSO-SEG (T2): a pessoa entrou com a senha provisória. A sessão
  /// só serve para trocar a senha: NÃO conta como autenticada, fica só em
  /// memória e não aciona bootstrap, sincronização nem telemetria.
  passwordChangeRequired,
}

class AuthTokens extends Equatable {
  const AuthTokens({
    required this.accessToken,
    required this.expiresAt,
    this.refreshToken,
  });

  final String accessToken;
  final String? refreshToken;
  final DateTime expiresAt;

  bool get isExpired => DateTime.now().toUtc().isAfter(expiresAt);

  @override
  List<Object?> get props => [accessToken, expiresAt, refreshToken];
}

class AuthUser extends Equatable {
  const AuthUser({
    required this.sub,
    required this.email,
    required this.tenantId,
    required this.tenantRole,
    required this.tenantRoles,
    required this.permissions,
    required this.scope,
  });

  final String sub;
  final String email;
  final String tenantId;
  final String tenantRole;
  final List<String> tenantRoles;
  final List<String> permissions;
  final String scope;

  @override
  List<Object?> get props => [
    sub,
    email,
    tenantId,
    tenantRole,
    tenantRoles,
    permissions,
    scope,
  ];
}

class AuthSession extends Equatable {
  const AuthSession({
    required this.tokens,
    required this.user,
    this.mustChangePassword = false,
  });

  final AuthTokens tokens;
  final AuthUser user;

  /// B-USERS-ACESSO-SEG (T2): sessão RESTRITA, aberta com a senha provisória.
  /// Só o `login()` do repositório remoto liga esta marca, e só quando a
  /// resposta do login traz `must_change_password: true` (RQ-2(b)). Sessão
  /// guardada, renovada ou de desenvolvimento nasce inteira (`false`).
  final bool mustChangePassword;

  bool get isExpired => tokens.isExpired;

  @override
  List<Object?> get props => [tokens, user, mustChangePassword];
}

class AuthState extends Equatable {
  const AuthState({
    required this.status,
    this.session,
    this.safeError,
    this.safeNotice,
  });

  final AuthStatus status;
  final AuthSession? session;

  // Safe human-readable message — never contains tokens, passwords, or paths
  final String? safeError;

  /// B-USERS-ACESSO-SEG (T2): aviso de sucesso para o login (texto fixo, ex.:
  /// "Senha alterada. Entre com a nova senha."). Nunca vem do servidor.
  final String? safeNotice;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated || status == AuthStatus.offlineCached;

  /// B-USERS-ACESSO-SEG (T2): a sessão restrita da senha provisória.
  bool get isPasswordChangeRequired =>
      status == AuthStatus.passwordChangeRequired;

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    String? safeError,
    String? safeNotice,
    bool clearSession = false,
    bool clearError = false,
    bool clearNotice = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: clearSession ? null : (session ?? this.session),
      safeError: clearError ? null : (safeError ?? this.safeError),
      safeNotice: clearNotice ? null : (safeNotice ?? this.safeNotice),
    );
  }

  @override
  List<Object?> get props => [status, session, safeError, safeNotice];
}
