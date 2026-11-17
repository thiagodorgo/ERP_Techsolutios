import 'package:dio/dio.dart';

import '../auth/session_renewal.dart';

/// B-APP-SESSAO-RENOVA (D4) — a porta da renovação em cada cliente autenticado.
///
/// - `onRequest`: fora dos caminhos de autenticação, põe o token VIVO da sessão
///   (salvo na repetição, que já leva o token novo) e carimba a época da sessão
///   no pedido (`extra['_authEpoch']`, só na primeira vez).
/// - `onError`, num 401 de pedido comum: o pedido já repetido expira pela época
///   dele; senão pede a renovação (uma só no app inteiro, no notifier) com o
///   token que falhou e a época do pedido, e decide pelo desfecho.
class AuthRefreshInterceptor extends Interceptor {
  AuthRefreshInterceptor({
    required this.client,
    required this.renew,
    required this.expire,
    required this.currentAccessToken,
    required this.currentEpoch,
  });

  final Dio client;

  /// Pede a renovação depois de um 401 (`AuthNotifier.renewAfterUnauthorized`).
  final Future<SessionRenewalOutcome> Function(
    String? failedAccessToken,
    int requestEpoch,
  )
  renew;

  /// Expira a sessão da época dada (o pedido repetido também levou 401).
  final Future<void> Function(int requestEpoch) expire;

  /// O token de acesso da sessão autenticada de agora (`null` sem sessão).
  final String? Function() currentAccessToken;

  /// A época da sessão de agora.
  final int Function() currentEpoch;

  static const _skipPaths = {
    '/api/v1/auth/login',
    '/api/v1/auth/refresh',
    '/api/v1/auth/logout',
  };

  static bool _isAuthPath(String path) => _skipPaths.any(path.contains);

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    if (!_isAuthPath(options.path)) {
      options.extra.putIfAbsent('_authEpoch', currentEpoch);
      if (options.extra['_authRetry'] != true) {
        final token = currentAccessToken();
        if (token != null) options.headers['Authorization'] = 'Bearer $token';
      }
    }
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException err,
    ErrorInterceptorHandler handler,
  ) async {
    if (err.response?.statusCode != 401) return handler.next(err);
    if (_isAuthPath(err.requestOptions.path)) return handler.next(err);

    final epoch = err.requestOptions.extra['_authEpoch'] as int? ?? -1;
    // dart format off
    if (err.requestOptions.extra['_authRetry'] == true) { // repetido: não renova de novo
      // dart format on
      await expire(epoch);
      return handler.next(err);
    }

    final outcome = await renew(_bearer(err.requestOptions), epoch);
    switch (outcome) {
      case SessionRenewed(:final accessToken):
        final options = err.requestOptions;
        options.headers['Authorization'] = 'Bearer $accessToken';
        options.extra['_authRetry'] = true;
        // B-RDV-COMPROVANTE (conserto c1 do #525, C2-DP-01): o Dio só finaliza
        // um `FormData` uma vez, e o 1º envio já o finalizou. A repetição leva
        // uma CÓPIA; sem ela, a repetição nem chega ao servidor.
        final body = options.data;
        if (body is FormData) options.data = body.clone();
        try {
          final response = await client.fetch<dynamic>(options);
          return handler.resolve(response);
        } on DioException catch (retryError) {
          return handler.next(retryError);
        }
      case SessionDead():
      case SessionSuperseded():
        return handler.next(err);
      // dart format off
      case SessionUnreachable(): return handler.next(_semConexao(err)); // renovação sem resposta
      // dart format on
      case SessionRenewalFailed():
        return handler.next(
          DioException(
            requestOptions: err.requestOptions,
            type: DioExceptionType.unknown,
            error: const SessionRenewalLocalError(),
          ),
        );
    }
  }

  static String? _bearer(RequestOptions options) {
    final header = options.headers['Authorization'];
    if (header is! String || !header.startsWith('Bearer ')) return null;
    return header.substring('Bearer '.length);
  }

  /// A renovação não teve resposta: o pedido falha como "sem conexão" (D7),
  /// sem mandar o técnico para o login.
  static DioException _semConexao(DioException err) => DioException(
    requestOptions: err.requestOptions,
    type: DioExceptionType.connectionError,
    error: err.error,
  );
}
