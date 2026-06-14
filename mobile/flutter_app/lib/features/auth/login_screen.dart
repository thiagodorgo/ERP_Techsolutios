import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/network/api_error.dart';
import 'auth_models.dart';
import '../../core/sync/sync_models.dart';
import '../../shared/ui/erp_components.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController(text: 'tecnico@tenant.demo');
  final _passwordController = TextEditingController(text: '123456');

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

    // Derive a safe error message — never expose token, path, or raw exception.
    // Checks both AsyncError (login failure) and authState.safeError (expired session).
    final safeError = switch (authAsync) {
      AsyncError(:final error) =>
        error is ApiError
            ? error.safeMessage
            : 'Nao foi possivel entrar. Verifique suas credenciais.',
      AsyncData(:final value)
          when value.status == AuthStatus.expired && value.safeError != null =>
        value.safeError,
      _ => null,
    };

    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            const SizedBox(height: 32),
            Text(
              'ERP Techsolutions',
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 8),
            const Text('Acesso seguro. Compativel com Cognito e auth local.'),
            const SizedBox(height: 24),
            if (safeError != null) ...[
              SyncStatusBanner(status: SyncStatus.failed, message: safeError),
              const SizedBox(height: 16),
            ],
            TextField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: const InputDecoration(labelText: 'E-mail'),
              enabled: !isLoading,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _passwordController,
              obscureText: true,
              decoration: const InputDecoration(labelText: 'Senha'),
              enabled: !isLoading,
            ),
            const SizedBox(height: 20),
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
            const SizedBox(height: 8),
            OutlinedButton(
              onPressed: isLoading ? null : () {},
              child: const Text('Suporte de acesso'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _doLogin() async {
    await ref
        .read(authStateProvider.notifier)
        .login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
        );
    // Navigation is handled by the router redirect when authState becomes authenticated
  }
}
