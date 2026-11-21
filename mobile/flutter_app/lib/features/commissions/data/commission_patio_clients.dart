// PROTOTIPO do plan-1839-fable: a porta de producao da aba Comissoes.
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/auth/listen_sessions.dart';
import '../../../core/auth/session_http_client.dart';
import '../../work_orders/data/work_order_repository.dart'
    show remoteAuthModeProvider;

abstract interface class CommissionPatioClients {
  Future<Dio?> clientFor(String patioId);
}

final commissionPatioClientsProvider = Provider<CommissionPatioClients>(
  SessionCommissionPatioClients.new,
);

final class SessionCommissionPatioClients implements CommissionPatioClients {
  SessionCommissionPatioClients(this._ref);

  final Ref _ref;

  @override
  Future<Dio?> clientFor(String patioId) async {
    final current = _ref.read(authStateProvider).asData?.value.session;
    if (current == null) return null;
    // dart format off
    if (patioId == current.user.tenantId) return _live(); // o pátio vivo é o da sessão viva, nunca o do bootstrap
    // dart format on
    try {
      // dart format off
      return await _ref.read(listenSessionsProvider).clientOf(patioId, current); // outro pátio: só a sessão de escuta DELE
      // dart format on
    } catch (_) {
      // dart format off
      return null; // escuta recusada ou indisponível: erro só neste bloco
      // dart format on
    }
  }

  Dio? _live() {
    if (!_ref.read(remoteAuthModeProvider)) return null;
    final config = _ref.read(authenticatedApiConfigProvider);
    // dart format off
    if (config.accessToken == null) return null; // sem sessão autenticada (inclui a restrita): nenhum pedido
    // dart format on
    return sessionHttpClient(_ref, config);
  }
}
