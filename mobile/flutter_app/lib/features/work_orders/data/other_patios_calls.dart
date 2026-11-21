// B-APP-ORG-2 (A1; Emendas 1.8 §5.2, 1.8.1 §7.3 e 1.8.3 §4): os chamados dos
// outros pátios, só de leitura. Cada pátio é lido pelo cliente da sessão de
// escuta DELE, e o bloco é indexado pelo pátio da sessão que buscou, nunca por
// um campo da resposta (L9b). Nada é gravado no banco local (L10): a seção
// "Outros pátios" (A2) só mostra estes blocos.
import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/auth/listen_sessions.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/network/api_error.dart';
import '../../auth/auth_models.dart';
import '../domain/work_order_models.dart';
import 'work_order_remote_api.dart';

final otherPatiosCallsProvider = Provider<OtherPatiosCalls>((ref) {
  return OtherPatiosCalls(listen: ref.watch(listenSessionsProvider));
});

/// `ready`: os chamados do ciclo. `stale`: "Sem atualização agora", com os
/// dados que o bloco já tinha. `failed`: erro só neste bloco, sem dado antigo.
enum OtherPatioState { ready, stale, failed }

class OtherPatioBlock {
  const OtherPatioBlock({
    required this.tenantId,
    required this.tenantName,
    required this.orders,
    required this.state,
  });

  final String tenantId;
  final String tenantName;
  final List<WorkOrder> orders;
  final OtherPatioState state;
}

class OtherPatiosCalls {
  OtherPatiosCalls({
    required ListenSessions listen,
    WorkOrderRemoteApi Function(Dio client)? api,
  }) : _listen = listen,
       _api = api ?? DioWorkOrderRemoteApi.new;

  final ListenSessions _listen;
  final WorkOrderRemoteApi Function(Dio client) _api;

  /// O último bloco bom de cada pátio, para o "Sem atualização agora".
  final Map<String, OtherPatioBlock> _last = {};

  /// Um ciclo: um bloco por pátio da lista que não é o da sessão viva, na ordem
  /// da lista. O pátio que recusa a escuta (403) sai; os outros ficam (L6).
  Future<List<OtherPatioBlock>> load({
    required AuthSession current,
    required List<TenantContext> tenants,
  }) async {
    // Sessão restrita (troca de senha obrigatória): nenhuma escuta é pedida.
    if (current.mustChangePassword) return const [];
    final others = [
      for (final tenant in tenants)
        if (tenant.tenantId != current.user.tenantId) tenant,
    ];
    final names = {
      for (final tenant in others) tenant.tenantId: tenant.displayName,
    };
    await _listen.retainTenants(names.keys.toSet());
    _last.removeWhere((tenantId, _) => !names.containsKey(tenantId));
    final blocks = <String, OtherPatioBlock>{};
    final sessions = <AuthSession>[];
    for (final tenant in others) {
      try {
        final session = await _listen.acquire(tenant.tenantId, current);
        if (session == null) {
          // A revogação anterior ficou sem resposta: nenhuma sessão nova.
          blocks[tenant.tenantId] = _noUpdate(
            tenant.tenantId,
            tenant.displayName,
          );
        } else {
          sessions.add(session);
        }
      } on TenantSwitchRefusedError {
        _last.remove(tenant.tenantId);
      } catch (_) {
        blocks[tenant.tenantId] = _failed(tenant.tenantId, tenant.displayName);
      }
    }
    for (final session in sessions) {
      final calls = await _fetch(session, names[session.tenantId] ?? '');
      blocks[session.tenantId] = calls;
    }
    return [for (final tenant in others) ?blocks[tenant.tenantId]];
  }

  Future<OtherPatioBlock> _fetch(AuthSession session, String tenantName) async {
    final tenantId = session.tenantId;
    try {
      final orders = await _api(
        _listen.clientFor(tenantId),
      ).fetchWorkOrders(tenantId: tenantId);
      return _last[tenantId] = OtherPatioBlock(
        tenantId: tenantId,
        tenantName: tenantName,
        orders: List.unmodifiable(orders),
        state: OtherPatioState.ready,
      );
    } catch (_) {
      return _failed(tenantId, tenantName);
    }
  }

  /// "Sem atualização agora", com os dados que o bloco já tinha.
  OtherPatioBlock _noUpdate(String tenantId, String tenantName) =>
      OtherPatioBlock(
        tenantId: tenantId,
        tenantName: tenantName,
        orders: _last[tenantId]?.orders ?? const [],
        state: OtherPatioState.stale,
      );

  /// A falha do ciclo: com dado antigo, "Sem atualização agora"; sem, o erro
  /// só neste bloco.
  OtherPatioBlock _failed(String tenantId, String tenantName) {
    if (_last.containsKey(tenantId)) return _noUpdate(tenantId, tenantName);
    return OtherPatioBlock(
      tenantId: tenantId,
      tenantName: tenantName,
      orders: const [],
      state: OtherPatioState.failed,
    );
  }
}
