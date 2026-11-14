import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/permissions/mobile_gates.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

class ModulePlaceholderScreen extends ConsumerWidget {
  const ModulePlaceholderScreen({
    required this.title,
    required this.gate,
    required this.message,
    this.blockedMessage = '',
    super.key,
  }) : assert(gate == null || blockedMessage != '');

  final String title;

  /// A regra de `MobileGates` que decide quem abre a área (B-MOBILE-GATE-CHAVE). `null` = área sem rota de servidor a
  /// espelhar: fica indisponível para TODO perfil, com o estado de indisponível ([message]), nunca o de acesso não
  /// permitido (resposta 2.2 do dono para o Diagnóstico).
  final MobileGate? gate;
  final String message;

  /// Texto do estado de acesso não permitido, em língua de negócio (B-SAN3-19b). Quem chama
  /// escreve o texto verdadeiro para a rota; a chave de permissão nunca aparece na tela.
  final String blockedMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);
    final regra = gate;

    return ErpScaffold(
      title: title,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (session != null) TenantContextBar(session: session),
          const SizedBox(height: 8),
          if (regra == null)
            EmptyState(
              icon: Icons.info_outline,
              title: 'Área indisponível',
              message: message,
            )
          else if (!regra.permite(session))
            PermissionBlockedState(
              title: 'Acesso não permitido',
              message: blockedMessage,
            )
          else
            ApprovalDecisionCard(title: title, message: message),
        ],
      ),
    );
  }
}
