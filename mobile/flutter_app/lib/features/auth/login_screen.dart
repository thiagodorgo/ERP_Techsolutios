import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/config/app_config.dart';
import '../../core/network/api_error.dart';
import '../../core/network/connectivity_repository.dart';
import '../../shared/theme/erp_mobile_theme.dart';
import '../../shared/ui/mobile_kit.dart';
import '../../shared/ui/organization_avatar.dart';
import 'auth_models.dart';

/// B-APP-ORG (Q4): o e-mail que "Entrar em outra organização" deixa
/// preenchido no Entrar. Só em memória; a tela de entrada o lê uma vez.
final loginEmailPrefillProvider = NotifierProvider<LoginEmailPrefill, String?>(
  LoginEmailPrefill.new,
);

class LoginEmailPrefill extends Notifier<String?> {
  @override
  String? build() => null;

  void set(String? email) => state = email;
}

/// B-APP-ORG: o texto de sem conexão do Entrar (maquete aprovada, opção A).
const kLoginOfflineMessage =
    'Sem conexão. Para entrar, o aparelho precisa de internet.';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  /// B-APP-ORG (69): a lista do 409, guardada pela tela enquanto a pessoa
  /// escolhe e enquanto o 2º login (com a organização) corre. Só memória.
  List<TenantChoice> _choices = const <TenantChoice>[];

  /// A organização escolhida, enquanto o 2º login corre.
  String? _choosingId;

  @override
  void initState() {
    super.initState();
    final prefill = ref.read(loginEmailPrefillProvider);
    if (prefill != null && prefill.isNotEmpty) {
      _emailController.text = prefill;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) ref.read(loginEmailPrefillProvider.notifier).set(null);
      });
    }
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  /// B-APP-ORG (69): o que o login respondeu. A escolha só aparece com MAIS de
  /// uma organização (decisão do dono, 20/11); com uma só, a tela entra nela
  /// direto, sem mostrar a escolha.
  void _onAuthChanged(AsyncValue<AuthState> next) {
    if (next.isLoading || !mounted) return;
    final choices = loginTenantChoicesOf(next);
    if (choices.length == 1 && _choosingId != choices.single.id) {
      _choose(choices.single); // uma organização só: pula a escolha
      return;
    }
    setState(() {
      _choices = choices;
      _choosingId = null;
    });
  }

  @override
  Widget build(BuildContext context) {
    ref.listen<AsyncValue<AuthState>>(
      authStateProvider,
      (_, next) => _onAuthChanged(next),
    );
    final authAsync = ref.watch(authStateProvider);
    final isLoading = authAsync.isLoading;
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;
    final showChoices = _choices.length > 1;

    final safeError = switch (authAsync) {
      AsyncError(error: TenantSelectionRequiredError()) => null,
      AsyncError(error: ApiNetworkError() || ApiTimeoutError()) =>
        kLoginOfflineMessage,
      AsyncError(:final error) =>
        error is ApiError
            ? error.safeMessage
            : 'Não foi possível entrar. Verifique os dados ou tente novamente.',
      AsyncData(:final value)
          when value.status == AuthStatus.expired && value.safeError != null =>
        value.safeError,
      _ => null,
    };

    // B-USERS-ACESSO-SEG (T2): aviso de sucesso da troca de senha (texto fixo).
    final safeNotice = switch (authAsync) {
      AsyncData(:final value)
          when value.status == AuthStatus.unauthenticated &&
              value.safeNotice != null =>
        value.safeNotice,
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
                  if (offline) ...[
                    const MobileNoticeBanner(
                      key: Key('login-sem-conexao'),
                      icon: Icons.wifi_off,
                      message: kLoginOfflineMessage,
                      tone: PillTone.warning,
                    ),
                    const SizedBox(height: 12),
                  ],
                  const _BrandCard(),
                  const SizedBox(height: 16),
                  if (showChoices)
                    _EscolhaCard(
                      choices: _choices,
                      email: _emailController.text.trim(),
                      choosingId: _choosingId,
                      busy: isLoading,
                      onChoose: _choose,
                      onBack: _backToForm,
                    )
                  else
                    _EntrarCard(
                      emailController: _emailController,
                      passwordController: _passwordController,
                      isLoading: isLoading,
                      offline: offline,
                      error: safeError,
                      notice: safeNotice,
                      onSubmit: _doLogin,
                      onForgot: _showForgotPasswordDialog,
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
    setState(() {
      _choices = const <TenantChoice>[];
      _choosingId = null;
    });
    await ref
        .read(authStateProvider.notifier)
        .login(email: email, password: password);
  }

  /// B-APP-ORG (69): o 2º login, direcionado à organização escolhida. Só as
  /// organizações que o 409 trouxe chegam aqui.
  Future<void> _choose(TenantChoice choice) async {
    setState(() => _choosingId = choice.id);
    await ref
        .read(authStateProvider.notifier)
        .login(
          email: _emailController.text.trim(),
          password: _passwordController.text,
          tenantId: choice.id,
        );
  }

  /// B-APP-ORG (69): o "Voltar" da escolha. Nenhum pedido, nada gravado.
  void _backToForm() {
    ref.read(authStateProvider.notifier).dismissTenantChoice();
    setState(() {
      _choices = const <TenantChoice>[];
      _choosingId = null;
    });
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

BoxDecoration _cardDecoration() => BoxDecoration(
  color: Colors.white,
  borderRadius: BorderRadius.circular(16),
  border: Border.all(color: ErpMobileTheme.cardBorder),
);

class _ErrorBox extends StatelessWidget {
  const _ErrorBox(this.message);

  final String message;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        key: const Key('login-erro'),
        width: double.infinity,
        padding: const EdgeInsets.all(11),
        decoration: BoxDecoration(
          color: const Color(0xFFFEF2F2),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: const Color(0xFFFECACA)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(Icons.error_outline, size: 18, color: Color(0xFF991B1B)),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF991B1B),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _EntrarCard extends StatelessWidget {
  const _EntrarCard({
    required this.emailController,
    required this.passwordController,
    required this.isLoading,
    required this.offline,
    required this.error,
    required this.onSubmit,
    required this.onForgot,
    this.notice,
  });

  final TextEditingController emailController;
  final TextEditingController passwordController;
  final bool isLoading;
  final bool offline;
  final String? error;
  final String? notice;
  final Future<void> Function() onSubmit;
  final VoidCallback onForgot;

  @override
  Widget build(BuildContext context) {
    final canSubmit = !isLoading && !offline;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: _cardDecoration(),
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
          if (notice != null) ...[
            // B-USERS-ACESSO-SEG (T2): faixa verde de sucesso, no desenho da
            // faixa de erro (tons da referência aprovada da troca de senha).
            Semantics(
              liveRegion: true,
              container: true,
              child: Container(
                key: const Key('login-aviso'),
                width: double.infinity,
                padding: const EdgeInsets.all(11),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: Text(
                  notice!,
                  style: const TextStyle(
                    fontSize: 12.5,
                    color: Color(0xFF166534),
                  ),
                ),
              ),
            ),
            const SizedBox(height: 14),
          ],
          if (error != null) ...[_ErrorBox(error!), const SizedBox(height: 14)],
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
            onSubmitted: canSubmit ? (_) => onSubmit() : null,
            decoration: _fieldDecoration(
              hint: '••••••••',
              prefix: Icons.lock_outline,
            ),
          ),
          const SizedBox(height: 18),
          SizedBox(
            width: double.infinity,
            height: 48,
            child: FilledButton(
              key: const Key('login-entrar'),
              onPressed: canSubmit ? () => onSubmit() : null,
              child: isLoading
                  ? const SizedBox(
                      height: 20,
                      width: 20,
                      child: CircularProgressIndicator.adaptive(
                        strokeWidth: 2,
                        semanticsLabel: 'Entrando',
                      ),
                    )
                  : const Text('Entrar'),
            ),
          ),
          const SizedBox(height: 4),
          Center(
            child: TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
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

/// B-APP-ORG (69): o passo "Escolha a organização", dentro do mesmo cartão do
/// Entrar (opção A aprovada). Cada linha é uma escolha: o 409 só traz o nome.
class _EscolhaCard extends StatelessWidget {
  const _EscolhaCard({
    required this.choices,
    required this.email,
    required this.choosingId,
    required this.busy,
    required this.onChoose,
    required this.onBack,
  });

  final List<TenantChoice> choices;
  final String email;
  final String? choosingId;
  final bool busy;
  final ValueChanged<TenantChoice> onChoose;
  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('login-escolha'),
      padding: const EdgeInsets.all(18),
      decoration: _cardDecoration(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Escolha a organização',
            style: TextStyle(
              fontSize: 17,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Sua senha vale em ${choices.length} organizações. Toque na '
            'organização em que quer entrar.',
            style: const TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              const Icon(
                Icons.mail_outline,
                size: 16,
                color: ErpMobileTheme.inkFaint,
              ),
              const SizedBox(width: 6),
              const Text(
                'Entrando como ',
                style: TextStyle(fontSize: 12, color: ErpMobileTheme.inkMuted),
              ),
              Flexible(
                child: Text(
                  email,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: ErpMobileTheme.ink,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          for (var i = 0; i < choices.length; i++)
            _ChoiceRow(
              choice: choices[i],
              index: i,
              choosing: choosingId == choices[i].id,
              enabled: !busy,
              onTap: () => onChoose(choices[i]),
            ),
          const SizedBox(height: 4),
          Center(
            child: TextButton.icon(
              key: const Key('login-escolha-voltar'),
              style: TextButton.styleFrom(minimumSize: const Size(48, 48)),
              onPressed: busy ? null : onBack,
              icon: const Icon(Icons.arrow_back, size: 18),
              label: const Text('Voltar'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ChoiceRow extends StatelessWidget {
  const _ChoiceRow({
    required this.choice,
    required this.index,
    required this.choosing,
    required this.enabled,
    required this.onTap,
  });

  final TenantChoice choice;
  final int index;
  final bool choosing;
  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Semantics(
        button: true,
        enabled: enabled,
        label: choosing ? 'Entrando em ${choice.name}' : choice.name,
        excludeSemantics: true,
        child: Material(
          color: choosing
              ? MobilePill.colorsFor(PillTone.info).$1
              : Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
            side: BorderSide(
              color: choosing
                  ? ErpMobileTheme.primary
                  : ErpMobileTheme.cardBorder,
            ),
          ),
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            key: Key('login-escolha-${choice.id}'),
            onTap: enabled ? onTap : null,
            focusColor: ErpMobileTheme.primary.withValues(alpha: 0.16),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 52),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Row(
                  children: [
                    OrganizationAvatar(
                      name: choice.name,
                      index: index,
                      size: 32,
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        choice.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: ErpMobileTheme.ink,
                        ),
                      ),
                    ),
                    if (choosing)
                      const SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    else
                      const Icon(
                        Icons.chevron_right,
                        size: 20,
                        color: ErpMobileTheme.inkFaint,
                      ),
                  ],
                ),
              ),
            ),
          ),
        ),
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
