import 'package:equatable/equatable.dart';

enum AuthStatus {
  unauthenticated,
  authenticating,
  authenticated,
  expired,
  offlineCached,
  error,
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
  const AuthSession({required this.tokens, required this.user});

  final AuthTokens tokens;
  final AuthUser user;

  bool get isExpired => tokens.isExpired;

  @override
  List<Object?> get props => [tokens, user];
}

class AuthState extends Equatable {
  const AuthState({required this.status, this.session, this.safeError});

  final AuthStatus status;
  final AuthSession? session;

  // Safe human-readable message — never contains tokens, passwords, or paths
  final String? safeError;

  bool get isAuthenticated =>
      status == AuthStatus.authenticated || status == AuthStatus.offlineCached;

  AuthState copyWith({
    AuthStatus? status,
    AuthSession? session,
    String? safeError,
    bool clearSession = false,
    bool clearError = false,
  }) {
    return AuthState(
      status: status ?? this.status,
      session: clearSession ? null : (session ?? this.session),
      safeError: clearError ? null : (safeError ?? this.safeError),
    );
  }

  @override
  List<Object?> get props => [status, session, safeError];
}
