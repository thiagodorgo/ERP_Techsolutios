import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/config/app_config.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/auto_sync_coordinator.dart';
import '../../core/theme/theme_mode_notifier.dart';
import '../../features/auth/auth_models.dart';
import '../../shared/theme/erp_mobile_theme.dart';
import 'erp_components.dart';
import 'erp_scaffold.dart';

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

    // Loading state
    if (authAsync.isLoading || bootstrapAsync.isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    // Error state
    if (bootstrapAsync.hasError) {
      return Scaffold(
        body: ErrorState(message: 'Falha ao carregar sessao. Tente novamente.'),
      );
    }

    // Expired session — show clear action
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

    final initials = _initials(session.user.email);

    return ErpScaffold(
      title: 'Perfil e sessao',
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar + identity
          _AvatarCard(initials: initials, email: session.user.email),
          const SizedBox(height: 8),

          TenantContextBar(session: session),
          const SizedBox(height: 8),

          // Tenant role
          Card(
            child: ListTile(
              leading: const Icon(Icons.badge_outlined),
              title: const Text('Funcao'),
              subtitle: Text(
                '${session.user.tenantRole}'
                '${session.user.tenantRoles.length > 1 ? ' · ${session.user.tenantRoles.skip(1).join(", ")}' : ''}',
              ),
            ),
          ),

          // Auth mode — safe to show (just "local" or "remoto", no token)
          Card(
            child: ListTile(
              leading: const Icon(Icons.cloud_sync_outlined),
              title: const Text('Modo de autenticacao'),
              subtitle: Text(
                kIsRemoteAuth ? 'Remoto (producao)' : 'Local (desenvolvimento)',
              ),
            ),
          ),

          // Session status
          Card(
            child: ListTile(
              leading: Icon(
                authState.status == AuthStatus.authenticated
                    ? Icons.verified_outlined
                    : authState.status == AuthStatus.offlineCached
                    ? Icons.cloud_off_outlined
                    : Icons.warning_amber_outlined,
              ),
              title: const Text('Status da sessao'),
              subtitle: Text(_sessionStatusLabel(authState)),
            ),
          ),

          // Token expiry — only when authenticated (no token value shown)
          if (authState.session != null)
            Card(
              child: ListTile(
                leading: const Icon(Icons.timer_outlined),
                title: const Text('Token expira'),
                subtitle: Text(
                  _formatExpiry(authState.session!.tokens.expiresAt),
                ),
              ),
            ),

          // Connectivity status
          Card(
            child: ListTile(
              leading: Icon(_networkIcon(networkStatus)),
              title: const Text('Conectividade'),
              subtitle: Text(_networkLabel(networkStatus)),
            ),
          ),

          // Last sync
          if (autoSync.lastSyncAt != null || autoSync.hasError)
            Card(
              child: ListTile(
                leading: Icon(
                  autoSync.hasError
                      ? Icons.sync_problem_outlined
                      : Icons.cloud_done_outlined,
                ),
                title: const Text('Ultimo sync'),
                subtitle: Text(
                  autoSync.hasError
                      ? autoSync.lastSafeError!
                      : _formatSyncAt(autoSync.lastSyncAt!),
                ),
              ),
            ),

          // Permissions
          Card(
            child: ListTile(
              leading: const Icon(Icons.security_outlined),
              title: const Text('Permissoes'),
              subtitle: Text(
                session.permissions.permissions.isEmpty
                    ? 'Nenhuma permissao ativa'
                    : session.permissions.permissions.join(', '),
              ),
            ),
          ),

          // Modules
          if (session.enabledModules.isNotEmpty)
            Card(
              child: ListTile(
                leading: const Icon(Icons.apps_outlined),
                title: const Text('Modulos habilitados'),
                subtitle: Text(
                  session.enabledModules.map((m) => m.title).join(', '),
                ),
              ),
            ),

          // Available tenants
          if (session.availableTenants.isNotEmpty)
            Card(
              child: ListTile(
                leading: const Icon(Icons.domain_outlined),
                title: const Text('Tenants disponiveis'),
                subtitle: Text(
                  session.availableTenants.map((t) => t.displayName).join(', '),
                ),
              ),
            ),

          const SizedBox(height: 8),
          _ThemeSwitcherCard(ref: ref),

          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: () => _logout(ref),
            icon: const Icon(Icons.logout),
            label: const Text('Sair'),
            style: FilledButton.styleFrom(
              backgroundColor: Theme.of(context).colorScheme.error,
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _logout(WidgetRef ref) async {
    await ref.read(authStateProvider.notifier).logout();
  }

  String _initials(String email) {
    final name = email.split('@').first;
    final parts = name.split(RegExp(r'[.\-_]'));
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.substring(0, name.length.clamp(1, 2)).toUpperCase();
  }

  String _formatExpiry(DateTime expiresAt) {
    final diff = expiresAt.difference(DateTime.now().toUtc());
    if (diff.isNegative) return 'Expirada';
    if (diff.inHours > 0) {
      return 'em ${diff.inHours}h ${diff.inMinutes.remainder(60)}min';
    }
    return 'em ${diff.inMinutes}min';
  }

  String _formatSyncAt(DateTime syncAt) {
    final local = syncAt.toLocal();
    return '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')} '
        '${local.day}/${local.month}/${local.year}';
  }

  String _sessionStatusLabel(AuthState state) {
    return switch (state.status) {
      AuthStatus.authenticated => 'Autenticado',
      AuthStatus.offlineCached => 'Cache offline',
      AuthStatus.expired => 'Expirada',
      AuthStatus.unauthenticated => 'Nao autenticado',
      AuthStatus.authenticating => 'Autenticando...',
      AuthStatus.error => state.safeError ?? 'Erro de autenticacao',
    };
  }

  IconData _networkIcon(NetworkStatus status) {
    return switch (status) {
      NetworkStatus.online => Icons.wifi_outlined,
      NetworkStatus.offline => Icons.wifi_off_outlined,
      NetworkStatus.checking => Icons.sync_outlined,
      NetworkStatus.unknown => Icons.help_outline,
    };
  }

  String _networkLabel(NetworkStatus status) {
    return switch (status) {
      NetworkStatus.online => 'Online',
      NetworkStatus.offline => 'Offline',
      NetworkStatus.checking => 'Verificando...',
      NetworkStatus.unknown => 'Desconhecido',
    };
  }
}

// ── Sub-widgets ───────────────────────────────────────────────────────────────

class _AvatarCard extends StatelessWidget {
  const _AvatarCard({required this.initials, required this.email});

  final String initials;
  final String email;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: Theme.of(context).colorScheme.primary,
              child: Text(
                initials,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    email,
                    style: Theme.of(context).textTheme.titleMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'ERP Techsolutions',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ThemeSwitcherCard extends ConsumerWidget {
  const _ThemeSwitcherCard({required this.ref});

  final WidgetRef ref;

  @override
  Widget build(BuildContext context, WidgetRef watchRef) {
    final appTheme = watchRef.watch(themeModeProvider).asData?.value ?? AppThemeMode.system;

    return Card(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ListTile(
              contentPadding: EdgeInsets.zero,
              leading: const Icon(Icons.palette_outlined),
              title: const Text('Aparencia'),
              subtitle: Text(appTheme.label),
            ),
            Wrap(
              spacing: 8,
              children: AppThemeMode.values.map((mode) {
                return ChoiceChip(
                  label: Text(mode.label),
                  selected: appTheme == mode,
                  onSelected: (_) => watchRef
                      .read(themeModeProvider.notifier)
                      .setMode(mode),
                );
              }).toList(),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
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
