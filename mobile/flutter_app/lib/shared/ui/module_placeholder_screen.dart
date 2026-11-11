import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/permissions/permission_resolver.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

class ModulePlaceholderScreen extends ConsumerWidget {
  const ModulePlaceholderScreen({
    required this.title,
    required this.requiredPermission,
    required this.message,
    required this.blockedMessage,
    super.key,
  });

  final String title;
  final String requiredPermission;
  final String message;

  /// Texto do estado de acesso não permitido, em língua de negócio (B-SAN3-19b). Quem chama
  /// escreve o texto verdadeiro para a rota; a chave de permissão nunca aparece na tela.
  final String blockedMessage;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);
    final hasPermission =
        session != null &&
        const PermissionResolver().has(session.permissions, requiredPermission);

    return ErpScaffold(
      title: title,
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          if (session != null) TenantContextBar(session: session),
          const SizedBox(height: 8),
          if (!hasPermission)
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
