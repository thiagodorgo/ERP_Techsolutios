import 'package:dio/dio.dart';

import '../auth/session_renewal.dart';
import 'api_error.dart';
import 'auth_interceptor.dart';

/// Base URL padrão — configurável em build/CI via
/// `--dart-define=API_BASE_URL=https://api.exemplo.com.br/api/v1`.
/// Sem o define, mantém o localhost do emulador Android (dev/test), então
/// testes nunca dependem de rede real.
const String kDefaultApiBaseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3000',
);

class ApiConfig {
  const ApiConfig({
    this.baseUrl = kDefaultApiBaseUrl,
    this.accessToken,
    this.connectTimeoutMs = 10000,
    this.receiveTimeoutMs = 15000,
  });

  // Default vem de --dart-define=API_BASE_URL (fallback: localhost do emulador).
  final String baseUrl;

  // Injected at runtime after authentication — never hardcoded
  final String? accessToken;

  final int connectTimeoutMs;
  final int receiveTimeoutMs;
}

Dio createExpenseHttpClient(ApiConfig config) {
  final dio = Dio(
    BaseOptions(
      baseUrl: config.baseUrl,
      connectTimeout: Duration(milliseconds: config.connectTimeoutMs),
      receiveTimeout: Duration(milliseconds: config.receiveTimeoutMs),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        if (config.accessToken != null)
          'Authorization': 'Bearer ${config.accessToken}',
      },
    ),
  );
  return dio;
}

/// B-APP-SESSAO-RENOVA (D4, D5) — o cliente autenticado: põe o token vivo da
/// sessão em cada pedido e, num 401, pede a renovação à porta única do app
/// (o notifier). Só o `sessionHttpClient` monta este cliente.
///
/// B-APP-ORG (T-b): [boundSessionKey] é a chave da sessão de quando o cliente
/// nasceu, e [currentSessionKey] lê a da sessão viva. Sem os dois (só os
/// testes antigos), o cliente nunca recusa, como antes.
Dio createAuthenticatedHttpClient(
  ApiConfig config, {
  required Future<SessionRenewalOutcome> Function(
    String? failedAccessToken,
    int requestEpoch,
  )
  renew,
  required Future<void> Function(int requestEpoch) expire,
  required String? Function() currentAccessToken,
  required int Function() currentEpoch,
  String? boundSessionKey,
  String? Function()? currentSessionKey,
}) {
  final dio = createExpenseHttpClient(config);
  dio.interceptors.add(
    AuthRefreshInterceptor(
      client: dio,
      renew: renew,
      expire: expire,
      currentAccessToken: currentAccessToken,
      currentEpoch: currentEpoch,
      boundSessionKey: boundSessionKey,
      currentSessionKey: currentSessionKey ?? _noLiveSessionKey,
    ),
  );
  return dio;
}

String? _noLiveSessionKey() => null;

// Converts a DioException to a typed ApiError.
// Never includes response body, URLs with private parameters, or tokens.
ApiError mapDioError(DioException e) {
  // dart format off
  if (e.error is SessionChangedLocalError) return const ApiSessionChangedError(); // T-b: não tentou
  if (e.error is SessionRenewalLocalError) return const ApiServerError(statusCode: 0, safeMessage: kSessionCheckFailedMessage);
  // dart format on
  final status = e.response?.statusCode;
  return switch (e.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.sendTimeout => const ApiTimeoutError(),
    DioExceptionType.connectionError => const ApiNetworkError(),
    DioExceptionType.badResponse => switch (status) {
      401 => const ApiSessionExpiredError(),
      403 => const ApiForbiddenError(),
      409 => const ApiConflictError(),
      _ when status != null && status >= 500 => ApiServerError(
        statusCode: status,
      ),
      _ => ApiServerError(statusCode: status ?? 0),
    },
    _ => const ApiNetworkError(),
  };
}
