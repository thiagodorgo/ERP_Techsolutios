import 'package:dio/dio.dart';

import 'api_error.dart';
import 'auth_interceptor.dart';

class ApiConfig {
  const ApiConfig({
    this.baseUrl = 'http://10.0.2.2:3000',
    this.accessToken,
    this.connectTimeoutMs = 10000,
    this.receiveTimeoutMs = 15000,
  });

  // 10.0.2.2 is localhost from Android emulator; override for iOS/physical device
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

/// Creates an authenticated Dio client that automatically refreshes the token
/// on 401 responses (via [AuthRefreshInterceptor]) and falls back to clearing
/// the session if refresh fails.
Dio createAuthenticatedHttpClient(
  ApiConfig config, {
  required Future<String?> Function() onRefresh,
  required Future<void> Function() onClearSession,
}) {
  final dio = createExpenseHttpClient(config);
  dio.interceptors.add(
    AuthRefreshInterceptor(
      client: dio,
      onRefresh: onRefresh,
      onClearSession: onClearSession,
    ),
  );
  return dio;
}

// Converts a DioException to a typed ApiError.
// Never includes response body, URLs with private parameters, or tokens.
ApiError mapDioError(DioException e) {
  final status = e.response?.statusCode;
  return switch (e.type) {
    DioExceptionType.connectionTimeout ||
    DioExceptionType.receiveTimeout ||
    DioExceptionType.sendTimeout => const ApiTimeoutError(),
    DioExceptionType.connectionError => const ApiNetworkError(),
    DioExceptionType.badResponse => switch (status) {
      401 || 403 => const ApiUnauthorizedError(),
      409 => const ApiConflictError(),
      _ when status != null && status >= 500 => ApiServerError(
        statusCode: status,
      ),
      _ => ApiServerError(statusCode: status ?? 0),
    },
    _ => const ApiNetworkError(),
  };
}
