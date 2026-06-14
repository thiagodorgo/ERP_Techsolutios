import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_error.dart';
import '../../core/sync/sync_models.dart';
import '../../shared/ui/erp_components.dart';
import 'auth_models.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authAsync = ref.watch(authStateProvider);
    final isLoading = authAsync.isLoading;

    final safeError = switch (authAsync) {
      AsyncError(:final error) =>
        error is ApiError
            ? error.safeMessage
            : 'Nao foi possivel entrar. Verifique os dados ou tente novamente.',
      AsyncData(:final value)
          when value.status == AuthStatus.expired && value.safeError != null =>
        value.safeError,
      _ => null,
    };

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const SizedBox(height: 40),
            Text(
              'ERP Techsolutions',
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Acesse suas ordens de servico, checklists e despesas de campo.',
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 32),
            if (safeError != null) ...[
              SyncStatusBanner(status: SyncStatus.failed, message: safeError),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              decoration: const InputDecoration(
                labelText: 'E-mail',
                border: OutlineInputBorder(),
              ),
              enabled: !isLoading,
            ),
            const SizedBox(height: 14),
            TextField(
              controller: _passwordController,
              obscureText: true,
              textInputAction: TextInputAction.done,
              decoration: const InputDecoration(
                labelText: 'Senha',
                border: OutlineInputBorder(),
              ),
              enabled: !isLoading,
              onSubmitted: isLoading ? null : (_) => _doLogin(),
            ),
            const SizedBox(height: 24),
            FilledButton(
              onPressed: isLoading ? null : _doLogin,
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Text('Entrar'),
            ),
            const SizedBox(height: 10),
            OutlinedButton(
              onPressed: isLoading ? null : _showSupportDialog,
              child: const Text('Suporte de acesso'),
            ),
            // Dev-only quick-access — never visible in production builds.
            if (kIsDevMode) ...[
              const SizedBox(height: 20),
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Ambiente de desenvolvimento',
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: Colors.orange.shade700,
                  fontWeight: FontWeight.w600,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: Colors.orange.shade400),
                ),
                onPressed: isLoading ? null : _doDevLogin,
                icon: Icon(Icons.developer_mode, color: Colors.orange.shade700),
                label: Text(
                  'Usar sessao de desenvolvimento',
                  style: TextStyle(color: Colors.orange.shade700),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Future<void> _doLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text;
    if (email.isEmpty || password.isEmpty) return;
    await ref
        .read(authStateProvider.notifier)
        .login(email: email, password: password);
  }

  /// Only available when kIsDevMode is true (--dart-define=ERP_ENV=dev).
  Future<void> _doDevLogin() async {
    await ref
        .read(authStateProvider.notifier)
        .login(email: 'tecnico@tenant.demo', password: '123456');
  }

  void _showSupportDialog() {
    final tenantHint = _emailController.text.trim();
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Suporte de acesso'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Fale com o administrador da sua organizacao para recuperar o acesso.',
            ),
            if (tenantHint.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text(
                'E-mail informado:',
                style: Theme.of(ctx).textTheme.labelSmall,
              ),
              SelectableText(tenantHint),
            ],
            const SizedBox(height: 12),
            const Text(
              'Se voce e o administrador, acesse o portal web do ERP Techsolutions para redefinir credenciais.',
              style: TextStyle(color: Colors.black54, fontSize: 13),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Fechar'),
          ),
        ],
      ),
    );
  }
}
