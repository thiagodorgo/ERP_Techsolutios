import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/api_error.dart';
import '../../core/sync/sync_models.dart';
import '../../shared/ui/erp_components.dart';

class TenantSelectorScreen extends ConsumerWidget {
  const TenantSelectorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrapAsync = ref.watch(bootstrapNotifierProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Selecionar empresa')),
      body: bootstrapAsync.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, _) => _BootstrapErrorView(
          error: error,
          onRetry: () => ref.read(bootstrapNotifierProvider.notifier).retry(),
        ),
        data: (session) => _TenantList(
          session: session,
          onSelect: (tenant) async {
            await ref
                .read(bootstrapNotifierProvider.notifier)
                .switchTenant(tenant);
            if (context.mounted) context.go('/');
          },
        ),
      ),
    );
  }
}

// ── Tenant list ───────────────────────────────────────────────────────────────

class _TenantList extends StatelessWidget {
  const _TenantList({required this.session, required this.onSelect});

  final BootstrapSession session;
  final Future<void> Function(TenantContext tenant) onSelect;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        const SizedBox(height: 8),
        Text(
          'Sua conta tem acesso a mais de uma empresa.',
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 4),
        Text(
          'Selecione com qual empresa deseja trabalhar agora.',
          style: Theme.of(
            context,
          ).textTheme.bodySmall?.copyWith(color: Colors.black54),
        ),
        const SizedBox(height: 20),
        for (final tenant in session.availableTenants)
          _TenantCard(
            tenant: tenant,
            isActive: tenant.tenantId == session.activeTenant.tenantId,
            onSelect: () => onSelect(tenant),
          ),
      ],
    );
  }
}

// ── Tenant card ───────────────────────────────────────────────────────────────

class _TenantCard extends StatefulWidget {
  const _TenantCard({
    required this.tenant,
    required this.isActive,
    required this.onSelect,
  });

  final TenantContext tenant;
  final bool isActive;
  final VoidCallback onSelect;

  @override
  State<_TenantCard> createState() => _TenantCardState();
}

class _TenantCardState extends State<_TenantCard> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: Theme.of(context).colorScheme.primaryContainer,
          child: Text(
            widget.tenant.displayName.isNotEmpty
                ? widget.tenant.displayName[0].toUpperCase()
                : 'E',
            style: TextStyle(
              color: Theme.of(context).colorScheme.primary,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
        title: Text(widget.tenant.displayName),
        subtitle: Text(_rolePtLabel(widget.tenant.userRole)),
        trailing: _loading
            ? const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : FilledButton(
                onPressed: _loading ? null : _doSelect,
                child: const Text('Acessar'),
              ),
      ),
    );
  }

  Future<void> _doSelect() async {
    setState(() => _loading = true);
    try {
      widget.onSelect();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String _rolePtLabel(String? role) {
    return switch (role?.toLowerCase()) {
      'field_technician' => 'Tecnico de Campo',
      'field_dispatcher' => 'Operacao de Campo',
      'manager' => 'Gestor Operacional',
      'tenant_admin' => 'Administrador',
      'finance' => 'Financeiro',
      'auditor' => 'Auditor',
      _ => 'Membro',
    };
  }
}

// ── Bootstrap error view ──────────────────────────────────────────────────────

class _BootstrapErrorView extends StatelessWidget {
  const _BootstrapErrorView({required this.error, required this.onRetry});

  final Object error;
  final VoidCallback onRetry;

  String get _safeMessage {
    if (error is ApiError) return (error as ApiError).safeMessage;
    return 'Nao foi possivel carregar os dados da empresa. Verifique sua conexao e tente novamente.';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          SyncStatusBanner(status: SyncStatus.failed, message: _safeMessage),
          const SizedBox(height: 24),
          FilledButton.icon(
            onPressed: onRetry,
            icon: const Icon(Icons.refresh),
            label: const Text('Tentar novamente'),
          ),
        ],
      ),
    );
  }
}
