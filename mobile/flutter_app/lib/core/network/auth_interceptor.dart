import 'package:dio/dio.dart';

/// Intercepts 401 responses, refreshes the access token once, then retries.
///
/// Guards against loops with two mechanisms:
///  1. [_refreshing] flag — concurrent requests that get 401 while a refresh is
///     in flight are rejected immediately (not queued for retry).
///  2. `extra['_authRetry']` marker — prevents the retried request from
///     triggering another refresh if it also comes back 401.
class AuthRefreshInterceptor extends Interceptor {
  AuthRefreshInterceptor({
    required this.client,
    required this.onRefresh,
    required this.onClearSession,
  });

  final Dio client;

  /// Called to obtain a new access token. Returns null when refresh fails.
  final Future<String?> Function() onRefresh;

  /// Called when refresh fails — must clear the local session and trigger
  /// the AuthStatus.expired state transition.
  final Future<void> Function() onClearSession;

  bool _refreshing = false;

  static const _skipPaths = {
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
  };

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) return handler.next(err);

    // Never retry auth endpoints — avoids recursive refresh loops
    if (_skipPaths.any((p) => err.requestOptions.path.contains(p))) {
      return handler.next(err);
    }

    // Already retried this request — propagate the 401
    if (err.requestOptions.extra['_authRetry'] == true) {
      return handler.next(err);
    }

    // Another refresh is already in flight — fail fast
    if (_refreshing) return handler.next(err);

    _refreshing = true;
    try {
      final newToken = await onRefresh();
      if (newToken == null) {
        await onClearSession();
        return handler.next(err);
      }

      // Patch default headers so subsequent requests also use the new token.
      client.options.headers['Authorization'] = 'Bearer $newToken';

      // Patch this specific request for the retry
      err.requestOptions.headers['Authorization'] = 'Bearer $newToken';
      err.requestOptions.extra['_authRetry'] = true;

      final response = await client.fetch<dynamic>(err.requestOptions);
      return handler.resolve(response);
    } catch (_) {
      await onClearSession();
      return handler.next(err);
    } finally {
      _refreshing = false;
    }
  }
}
