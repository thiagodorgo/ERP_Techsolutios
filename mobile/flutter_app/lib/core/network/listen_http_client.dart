// B-APP-ORG-2 (A1; Emendas 1.8 §5.2, 1.8.2 §4.3 e 1.8.3 §4): o cliente de
// escuta. Só lê os outros pátios: cada pedido sai com o token da sessão de
// escuta daquele pátio, só `GET` e só os caminhos da lista. Não renova (não há
// porta de renovação aqui) e nunca usa o cliente da sessão viva.
import 'package:dio/dio.dart';

import 'http_client.dart';

// dart format off
const kListenPaths = <String>{'/api/v1/work-orders', '/api/v1/commissions/calculations/mine', '/api/v1/commissions/statements/my-summary'};
// dart format on

/// Só `listen_sessions.dart` monta este cliente (o censo G-ESCUTA).
Dio createListenHttpClient(ApiConfig config, {required String accessToken}) {
  final client = createExpenseHttpClient(
    ApiConfig(
      baseUrl: config.baseUrl,
      accessToken: accessToken,
      connectTimeoutMs: config.connectTimeoutMs,
      receiveTimeoutMs: config.receiveTimeoutMs,
    ),
  );
  client.interceptors.add(_ListenGuard());
  return client;
}

/// A recusa local: o pedido recusado não sai do aparelho.
class _ListenGuard extends Interceptor {
  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    // dart format off
    if (options.method != 'GET') return handler.reject(_refused(options));
    if (!kListenPaths.contains(options.path)) return handler.reject(_refused(options));
    // dart format on
    handler.next(options);
  }
}

DioException _refused(RequestOptions options) => DioException(
  requestOptions: options,
  type: DioExceptionType.cancel,
  error: const ListenRequestRefused(),
);

class ListenRequestRefused implements Exception {
  const ListenRequestRefused();
}
