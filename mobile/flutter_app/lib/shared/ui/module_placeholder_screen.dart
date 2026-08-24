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
    super.key,
  });

  final String title;
  final String requiredPermission;
  final String message;

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
            const PermissionBlockedState(
              title: 'Acesso bloqueado',
              message:
                  'Seu perfil não tem acesso a esta área. Fale com a '
                  'administração da sua organização.',
            )
          else
            ApprovalDecisionCard(title: title, message: message),
        ],
      ),
    );
  }
}
