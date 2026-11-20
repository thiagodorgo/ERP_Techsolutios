// B-APP-ORG (70), Emenda 1.3 e 1.3.1 — o ponto ÚNICO de entrada da troca de
// organização.
//
// A porta da sincronização (T-a) é fechada AQUI, e não no `AuthNotifier`: o
// coordenador de sincronização ouve o `authStateProvider`, e o Riverpod 3
// recusa (`CircularDependencyError`, em modo debug) que o notifier leia de
// volta quem o ouve (D-A2-3). Este provider fica acima dos dois: ninguém que o
// coordenador ouve lê o coordenador.
//
// Nenhum código de `lib/` fora deste arquivo chama `switchTenant(` do
// `AuthNotifier` (guarda G-ORQ, em `bapporg_troca_test.dart`).

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../sync/auto_sync_coordinator.dart';
import 'auth_notifier.dart';

/// T-a: o envio da organização atual não terminou no prazo; a troca não
/// acontece. Não é `ApiError` (a classe é selada em `api_error.dart`): a tela
/// lê o [safeMessage].
const kTenantSwitchBusyMessage =
    'O envio ainda está em andamento. Tente de novo em instantes.';

final class TenantSwitchBusyError implements Exception {
  const TenantSwitchBusyError();

  String get safeMessage => kTenantSwitchBusyMessage;

  @override
  String toString() => 'TenantSwitchBusyError()';
}

class TenantSwitchOrchestrator {
  const TenantSwitchOrchestrator(this._ref);

  final Ref _ref;

  /// Troca a sessão para a organização [tenantId], na ordem do plano §4.2:
  /// 1. fecha a porta da sincronização e espera a passada em curso (com o
  ///    prazo estourado, lança [TenantSwitchBusyError] e não troca);
  /// 2. o `AuthNotifier` troca a sessão (o pedido, a trava, a época, a
  ///    revogação da anterior e a telemetria);
  /// 3. reabre a porta, em qualquer desfecho.
  /// Para a organização atual, não faz nada. Qualquer falha sobe para quem
  /// pediu, e a sessão atual fica como está.
  Future<void> run(String tenantId) async {
    final current = _ref.read(authStateProvider).asData?.value.session;
    if (current?.user.tenantId == tenantId) return;
    final port = _ref.read(autoSyncCoordinatorProvider.notifier);
    // dart format off
    final drained = await port.holdForSessionChange(); // T-a: a porta fecha e a passada em curso esvazia; false = o prazo estourou
    // dart format on
    try {
      if (!drained) throw const TenantSwitchBusyError();
      await _ref.read(authStateProvider.notifier).switchTenant(tenantId);
    } finally {
      // dart format off
      port.releaseAfterSessionChange(); // T-a: a porta reabre em qualquer desfecho
      // dart format on
    }
  }
}

/// O ponto único de entrada da troca (Emenda 1.3.1, E1.3.1-1).
final tenantSwitchOrchestratorProvider = Provider<TenantSwitchOrchestrator>(
  TenantSwitchOrchestrator.new,
);
