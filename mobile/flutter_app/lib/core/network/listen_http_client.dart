import 'package:dio/dio.dart';

import 'http_client.dart';

const kListenPaths = <String>{
  '/api/v1/work-orders',
  '/api/v1/commissions/calculations/mine',
  '/api/v1/commissions/statements/my-summary',
};

Dio createListenHttpClient(
  ApiConfig config, {
  required String accessToken,
  Future<void> Function()? onUnauthorized,
}) {
  final client = createExpenseHttpClient(
    ApiConfig(
      baseUrl: config.baseUrl,
      accessToken: accessToken,
      connectTimeoutMs: config.connectTimeoutMs,
      receiveTimeoutMs: config.receiveTimeoutMs,
    ),
  );
  client.interceptors.add(
    InterceptorsWrapper(
      onRequest: (options, handler) {
        if (options.method != 'GET') {
          return handler.reject(_refused(options));
        }
        if (!kListenPaths.contains(options.path)) {
          return handler.reject(_refused(options));
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && onUnauthorized != null) {
          await onUnauthorized();
        }
        handler.next(error);
      },
    ),
  );
  return client;
}

DioException _refused(RequestOptions options) => DioException(
  requestOptions: options,
  type: DioExceptionType.cancel,
  error: const ListenRequestRefused(),
);

class ListenRequestRefused implements Exception {
  const ListenRequestRefused();
}
