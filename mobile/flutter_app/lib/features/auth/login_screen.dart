import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_error.dart';
import '../../shared/theme/erp_mobile_theme.dart';
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
            : 'Não foi possível entrar. Verifique os dados ou tente novamente.',
      AsyncData(:final value)
          when value.status == AuthStatus.expired && value.safeError != null =>
        value.safeError,
      _ => null,
    };

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const _BrandCard(),
                  const SizedBox(height: 16),
                  _EntrarCard(
                    emailController: _emailController,
                    passwordController: _passwordController,
                    isLoading: isLoading,
                    error: safeError,
                    onSubmit: _doLogin,
                    onForgot: _showForgotPasswordDialog,
                  ),
                  const SizedBox(height: 14),
                  _GoogleButton(
                    onPressed: isLoading ? null : _showGoogleMockDialog,
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(
                        Icons.lock_outline,
                        size: 13,
                        color: ErpMobileTheme.inkFaint,
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Conexão segura · TLS 1.3',
                        style: TextStyle(
                          fontSize: 11,
                          color: ErpMobileTheme.inkFaint,
                        ),
                      ),
                    ],
                  ),
                  if (kIsDevMode) ...[
                    const SizedBox(height: 24),
                    OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        side: BorderSide(color: Colors.orange.shade300),
                        foregroundColor: Colors.orange.shade800,
                      ),
                      onPressed: isLoading ? null : _doDevLogin,
                      icon: const Icon(Icons.developer_mode),
                      label: const Text('Sessão de desenvolvimento'),
                    ),
                  ],
                ],
              ),
            ),
          ),
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
        .login(
          email: 'tecnico@tenant.demo',
          password: '123456',
          tenantId: 'tenant-demo',
        );
  }

  void _showForgotPasswordDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Esqueci minha senha'),
        content: const Text(
          'Solicite ao administrador da sua organização a redefinição de senha.',
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

  void _showGoogleMockDialog() {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Entrar com Google'),
        content: const Text(
          'Entrar com Google não está disponível nesta versão.',
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

// ---------------------------------------------------------------------------

class _BrandCard extends StatelessWidget {
  const _BrandCard();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: const BoxDecoration(
              color: Color(0xFFECFDF5),
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.eco, color: Color(0xFF059669), size: 24),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'TechSolutions ERP',
                  style: TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w800,
                    color: ErpMobileTheme.ink,
                  ),
                ),
                Text(
                  'Plataforma de operação em campo',
                  style: TextStyle(
                    fontSize: 12.5,
                    color: ErpMobileTheme.inkMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _EntrarCard extends StatelessWidget {
  const _EntrarCard({
    required this.emailController,
    required this.passwordController,
    required this.isLoading,
    required this.error,
    required this.onSubmit,
    required this.onForgot,
  });

  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool isLoading;
  final String? error;
  final Future<void> Function() onSubmit;
  final VoidCallback onForgot;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Entrar',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 14),
          if (error != null) ...[
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(11),
              decoration: BoxDecoration(
                color: const Color(0xFFFEF2F2),
                borderRadius: BorderRadius.circular(10),
                border: Border.all(color: const Color(0xFFFECACA)),
              ),
              child: Text(
                error!,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF991B1B),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],
          const _FieldLabel('E-mail'),
          TextField(
            controller: emailController,
            keyboardType: TextInputType.emailAddress,
            textInputAction: TextInputAction.next,
            enabled: !isLoading,
            decoration: _fieldDecoration(hint: 'voce@empresa.com.br'),
          ),
          const SizedBox(height: 12),
          const _FieldLabel('Senha'),
          TextField(
            controller: passwordController,
            obscureText: true,
            textInputAction: TextInputAction.done,
            enabled: !isLoading,
            onSubmitted: isLoading ? null : (_) => onSubmit(),
            decoration: _fieldDecoration(
              hint: '••••••••',
              prefix: Icons.lock_outline,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            child: FilledButton(
              onPressed: isLoading ? null : () => onSubmit(),
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Text('Entrar'),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: TextButton(
              onPressed: isLoading ? null : onForgot,
              child: const Text('Esqueci minha senha'),
            ),
          ),
        ],
      ),
    );
  }

  InputDecoration _fieldDecoration({required String hint, IconData? prefix}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: const TextStyle(color: ErpMobileTheme.inkFaint),
      prefixIcon: prefix != null
          ? Icon(prefix, size: 18, color: ErpMobileTheme.inkFaint)
          : null,
      filled: true,
      fillColor: const Color(0xFFF1F5F9),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(10),
        borderSide: const BorderSide(color: ErpMobileTheme.cardBorder),
      ),
    );
  }
}

class _FieldLabel extends StatelessWidget {
  const _FieldLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Text(
        text,
        style: const TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: ErpMobileTheme.inkMuted,
        ),
      ),
    );
  }
}

class _GoogleButton extends StatelessWidget {
  const _GoogleButton({required this.onPressed});

  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: double.infinity,
      child: OutlinedButton(
        onPressed: onPressed,
        style: OutlinedButton.styleFrom(
          backgroundColor: Colors.white,
          foregroundColor: ErpMobileTheme.ink,
          side: const BorderSide(color: ErpMobileTheme.cardBorder),
          padding: const EdgeInsets.symmetric(vertical: 12),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'G',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: Color(0xFF4285F4),
              ),
            ),
            SizedBox(width: 10),
            Text(
              'Entrar com Google',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
          ],
        ),
      ),
    );
  }
}
