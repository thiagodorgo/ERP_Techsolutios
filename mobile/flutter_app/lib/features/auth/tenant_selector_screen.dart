import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/api_error.dart';
import '../../shared/theme/erp_mobile_theme.dart';
import '../../shared/ui/mobile_kit.dart';

class TenantSelectorScreen extends ConsumerWidget {
  const TenantSelectorScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final bootstrapAsync = ref.watch(bootstrapNotifierProvider);

    return Scaffold(
      body: Column(
        children: [
          MobileScreenHeader(
            title: 'Selecionar organização',
            onBack: () => context.go('/login'),
          ),
          Expanded(
            child: bootstrapAsync.when(
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (error, _) => _BootstrapErrorView(
                error: error,
                onRetry: () =>
                    ref.read(bootstrapNotifierProvider.notifier).retry(),
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
          ),
        ],
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
    final tenants = session.availableTenants;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
      children: [
        Text.rich(
          TextSpan(
            style: const TextStyle(
              fontSize: 13,
              color: ErpMobileTheme.inkMuted,
              height: 1.4,
            ),
            children: [
              const TextSpan(text: 'Você tem acesso a '),
              TextSpan(
                text:
                    '${tenants.length} ${tenants.length == 1 ? 'organização' : 'organizações'}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: ErpMobileTheme.ink,
                ),
              ),
              const TextSpan(
                text: '. Os dados locais não se misturam entre elas.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),
        for (var i = 0; i < tenants.length; i++)
          _TenantCard(
            tenant: tenants[i],
            index: i,
            isActive: tenants[i].tenantId == session.activeTenant.tenantId,
            onSelect: () => onSelect(tenants[i]),
          ),
        const SizedBox(height: 4),
        Container(
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: Row(
            children: [
              const Icon(
                Icons.shield_outlined,
                size: 18,
                color: ErpMobileTheme.info,
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text(
                  'A troca de organização limpa o cache local e revalida suas '
                  'permissões com segurança.',
                  style: TextStyle(
                    fontSize: 12,
                    color: Color(0xFF1E40AF),
                    height: 1.4,
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

// ── Tenant card ───────────────────────────────────────────────────────────────

const _avatarColors = <(Color, Color)>[
  (Color(0xFFEFF6FF), Color(0xFF2563EB)),
  (Color(0xFFECFDF5), Color(0xFF059669)),
  (Color(0xFFFFFBEB), Color(0xFFD97706)),
  (Color(0xFFF5F3FF), Color(0xFF7C3AED)),
];

class _TenantCard extends StatefulWidget {
  const _TenantCard({
    required this.tenant,
    required this.index,
    required this.isActive,
    required this.onSelect,
  });

  final TenantContext tenant;
  final int index;
  final bool isActive;
  final VoidCallback onSelect;

  @override
  State<_TenantCard> createState() => _TenantCardState();
}

class _TenantCardState extends State<_TenantCard> {
  bool _loading = false;

  String get _initials {
    final parts = widget.tenant.displayName.trim().split(RegExp(r'\s+'));
    final first = parts.isNotEmpty && parts[0].isNotEmpty ? parts[0][0] : 'O';
    final second = parts.length > 1 && parts[1].isNotEmpty ? parts[1][0] : '';
    return (first + second).toUpperCase();
  }

  @override
  Widget build(BuildContext context) {
    final (bg, fg) = _avatarColors[widget.index % _avatarColors.length];
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: widget.isActive
              ? ErpMobileTheme.primary
              : ErpMobileTheme.cardBorder,
          width: widget.isActive ? 1.5 : 1,
        ),
      ),
      child: InkWell(
        onTap: _loading ? null : _doSelect,
        borderRadius: BorderRadius.circular(14),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: bg,
                  borderRadius: BorderRadius.circular(11),
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials,
                  style: TextStyle(
                    color: fg,
                    fontWeight: FontWeight.w800,
                    fontSize: 13,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.tenant.displayName,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.w800,
                        color: ErpMobileTheme.ink,
                      ),
                    ),
                    const SizedBox(height: 1),
                    Text(
                      _rolePtLabel(widget.tenant.userRole),
                      style: const TextStyle(
                        fontSize: 12,
                        color: ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
              if (_loading)
                const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              else
                const Icon(Icons.chevron_right, color: ErpMobileTheme.inkFaint),
            ],
          ),
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
      'field_technician' => 'Técnico de Campo',
      'field_dispatcher' => 'Operação de Campo',
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
    return 'Não foi possível carregar os dados da organização. '
        'Verifique sua conexão e tente novamente.';
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF2F2),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFFECACA)),
            ),
            child: Text(
              _safeMessage,
              style: const TextStyle(color: Color(0xFF991B1B)),
            ),
          ),
          const SizedBox(height: 20),
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
