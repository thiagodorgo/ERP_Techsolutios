// B-APP-SESSAO-RENOVA (D5) — a porta única de toda chamada autenticada do app.
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../network/http_client.dart';
import 'auth_notifier.dart';

/// O cliente Dio de toda chamada autenticada: põe o token vivo da sessão em
/// cada pedido e, num 401, renova pela porta única do notifier (uma renovação
/// por vez no app inteiro) e repete o pedido uma vez.
Dio sessionHttpClient(Ref ref, ApiConfig config) {
  final notifier = ref.read(authStateProvider.notifier);
  return createAuthenticatedHttpClient(
    config,
    renew: notifier.renewAfterUnauthorized,
    expire: notifier.expireSession,
    currentAccessToken: () => notifier.liveAccessToken,
    currentEpoch: () => notifier.epoch,
  );
}
