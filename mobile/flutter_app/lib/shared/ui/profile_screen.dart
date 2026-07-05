import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/auto_sync_coordinator.dart';
import '../../core/theme/theme_mode_notifier.dart';
import '../../features/auth/auth_models.dart';
import '../theme/erp_mobile_theme.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

/// Perfil do operador — fiel ao protótipo aprovado (screen-refs/mobile/perfil.png).
///
/// Mostra apenas informação com valor operacional: identidade (avatar, nome,
/// papel em PT-BR, organização), Conta e organização, Aparência, Segurança/
/// sessão e Sair. Dados técnicos (token, modo de autenticação, permissões
/// cruas, IDs) NÃO aparecem aqui — diagnóstico técnico fica na tela
/// Diagnóstico (dev-only).
class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authAsync = ref.watch(authStateProvider);
    final bootstrapAsync = ref.watch(bootstrapSessionProvider);
    final networkStatus = ref.watch(networkStatusProvider);
    final autoSync = ref.watch(autoSyncCoordinatorProvider);

    final authState = authAsync.asData?.value;
    final session = bootstrapAsync.asData?.value;

    if (authAsync.isLoading || bootstrapAsync.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    if (bootstrapAsync.hasError) {
      return Scaffold(
        body: ErrorState(message: 'Falha ao carregar sessao. Tente novamente.'),
      );
    }

    if (authState?.status == AuthStatus.expired) {
      return _ExpiredSessionView(
        safeError:
            authState?.safeError ?? 'Sua sessao expirou. Faca login novamente.',
        onLoginPressed: () => ref.read(authStateProvider.notifier).logout(),
      );
    }

    if (session == null || authState == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    final email = session.user.email;
    final displayName = _displayName(email);
    final roleLabel = _rolePtLabel(session.user.tenantRole);
    final orgName = session.activeTenant.displayName;
    final online =
        networkStatus == NetworkStatus.online ||
        networkStatus == NetworkStatus.unknown;

    return ErpScaffold(
      showAppBar: false,
      body: Column(
        children: [
          // Header branco com título centralizado (como no protótipo).
          Container(
            color: Colors.white,
            padding: EdgeInsets.fromLTRB(
              16,
              MediaQuery.of(context).padding.top + 12,
              16,
              12,
            ),
            width: double.infinity,
            child: const Text(
              'Perfil',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.w800,
                color: ErpMobileTheme.ink,
              ),
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.only(bottom: 20),
              children: [
                // ── Hero: avatar + nome + e-mail + papel · organização ──
                // Full-width branco, como no protótipo (perfil.png).
                Container(
                  color: Colors.white,
                  width: double.infinity,
                  padding: const EdgeInsets.fromLTRB(16, 18, 16, 22),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 34,
                        backgroundColor: ErpMobileTheme.primary,
                        child: Text(
                          _initials(email),
                          style: const TextStyle(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                            fontSize: 20,
                          ),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        displayName,
                        style: const TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                          color: ErpMobileTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        email,
                        style: const TextStyle(
                          fontSize: 12.5,
                          color: ErpMobileTheme.inkMuted,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        '$roleLabel · $orgName',
                        textAlign: TextAlign.center,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w700,
                          color: ErpMobileTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ── Conta e organização ──
                      const _SectionLabel('Conta e organização'),
                      _SectionCard(
                        children: [
                          _InfoRow(label: 'Organização', value: orgName),
                          _InfoRow(label: 'Papel', value: roleLabel),
                          _NavRow(
                            label: 'Trocar de organização',
                            onTap: () => context.go('/tenant-select'),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),

                      // ── Aparência ──
                      const _SectionLabel('Aparência'),
                      _AppearanceCard(ref: ref),
                      const SizedBox(height: 16),

                      // ── Segurança e sessão ──
                      const _SectionLabel('Segurança e sessão'),
                      _SectionCard(
                        children: [
                          _InfoRow(
                            label: 'Sessão',
                            value: authState.status == AuthStatus.offlineCached
                                ? 'Ativa (cache offline)'
                                : 'Ativa',
                          ),
                          _InfoRow(
                            label: 'Conectividade',
                            value: online ? 'Online' : 'Offline',
                            valueColor: online
                                ? ErpMobileTheme.success
                                : ErpMobileTheme.danger,
                          ),
                          _InfoRow(
                            label: 'Último sync',
                            value: autoSync.lastSyncAt != null
                                ? _fmtSyncAt(autoSync.lastSyncAt!)
                                : '—',
                          ),
                        ],
                      ),
                      const SizedBox(height: 20),

                      // ── Sair ──
                      FilledButton.icon(
                        onPressed: () =>
                            ref.read(authStateProvider.notifier).logout(),
                        icon: const Icon(Icons.logout),
                        label: const Text('Sair'),
                        style: FilledButton.styleFrom(
                          backgroundColor: ErpMobileTheme.danger,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  String _displayName(String email) {
    final local = email.split('@').first;
    final parts = local
        .split(RegExp(r'[.\-_]'))
        .where((p) => p.isNotEmpty)
        .map((p) => p[0].toUpperCase() + p.substring(1))
        .toList();
    return parts.isEmpty ? local : parts.join(' ');
  }

  String _initials(String email) {
    final name = email.split('@').first;
    final parts = name.split(RegExp(r'[.\-_]'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length.clamp(1, 2)).toUpperCase();
  }

  String _rolePtLabel(String role) {
    return switch (role.toLowerCase()) {
      'field_technician' => 'Técnico de Campo',
      'field_dispatcher' => 'Operação de Campo',
      'manager' => 'Gestor Operacional',
      'tenant_admin' => 'Administrador',
      'finance' => 'Financeiro',
      'auditor' => 'Auditor',
      _ => 'Membro',
    };
  }

  String _fmtSyncAt(DateTime syncAt) {
    final local = syncAt.toLocal();
    String p(int n) => n.toString().padLeft(2, '0');
    return '${p(local.hour)}:${p(local.minute)} ${p(local.day)}/${p(local.month)}/${local.year}';
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8, left: 2),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12.5,
          fontWeight: FontWeight.w800,
          color: ErpMobileTheme.inkMuted,
        ),
      ),
    );
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.children});

  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0)
              const Divider(height: 1, thickness: 1, color: Color(0xFFF1F5F9)),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value, this.valueColor});

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: ErpMobileTheme.inkMuted,
              ),
            ),
          ),
          Text(
            value,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: FontWeight.w700,
              color: valueColor ?? ErpMobileTheme.ink,
            ),
          ),
        ],
      ),
    );
  }
}

class _NavRow extends StatelessWidget {
  const _NavRow({required this.label, required this.onTap});

  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
        child: Row(
          children: [
            Expanded(
              child: Text(
                label,
                style: const TextStyle(
                  fontSize: 13.5,
                  fontWeight: FontWeight.w700,
                  color: ErpMobileTheme.ink,
                ),
              ),
            ),
            const Icon(
              Icons.chevron_right,
              size: 20,
              color: ErpMobileTheme.inkFaint,
            ),
          ],
        ),
      ),
    );
  }
}

/// Seletor de aparência — cards Sistema/Claro/Escuro/Contraste, fiel ao
/// padrão de cartões do protótipo. Mantém o AppThemeMode existente.
class _AppearanceCard extends ConsumerWidget {
  const _AppearanceCard({required this.ref});

  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef watchRef) {
    final appTheme =
        watchRef.watch(themeModeProvider).asData?.value ?? AppThemeMode.system;

    IconData iconFor(AppThemeMode mode) => switch (mode) {
      AppThemeMode.system => Icons.settings_suggest_outlined,
      AppThemeMode.light => Icons.light_mode_outlined,
      AppThemeMode.dark => Icons.dark_mode_outlined,
      AppThemeMode.highContrast => Icons.contrast_outlined,
    };

    return Row(
      children: [
        for (final mode in AppThemeMode.values) ...[
          if (mode != AppThemeMode.values.first) const SizedBox(width: 8),
          Expanded(
            child: InkWell(
              onTap: () =>
                  watchRef.read(themeModeProvider.notifier).setMode(mode),
              borderRadius: BorderRadius.circular(12),
              child: Container(
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: appTheme == mode
                        ? ErpMobileTheme.primary
                        : ErpMobileTheme.cardBorder,
                    width: appTheme == mode ? 1.5 : 1,
                  ),
                ),
                child: Column(
                  children: [
                    Icon(
                      iconFor(mode),
                      size: 18,
                      color: appTheme == mode
                          ? ErpMobileTheme.primary
                          : ErpMobileTheme.inkMuted,
                    ),
                    const SizedBox(height: 5),
                    Text(
                      mode.label,
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.w700,
                        color: appTheme == mode
                            ? ErpMobileTheme.primary
                            : ErpMobileTheme.inkMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

class _ExpiredSessionView extends StatelessWidget {
  const _ExpiredSessionView({
    required this.safeError,
    required this.onLoginPressed,
  });

  final String safeError;
  final VoidCallback onLoginPressed;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.lock_clock_outlined, size: 48),
              const SizedBox(height: 16),
              Text(
                'Sessao expirada',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 8),
              Text(safeError, textAlign: TextAlign.center),
              const SizedBox(height: 24),
              FilledButton.icon(
                onPressed: onLoginPressed,
                icon: const Icon(Icons.login),
                label: const Text('Fazer login novamente'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
