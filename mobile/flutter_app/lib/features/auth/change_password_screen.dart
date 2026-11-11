import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/auth/auth_repository.dart';
import '../../core/network/connectivity_repository.dart';
import '../../shared/theme/erp_mobile_theme.dart';

// B-USERS-ACESSO-SEG (T2) — troca da senha provisória no app de campo, OPÇÃO A
// ("Padrão fiel": o cartão do login com outro título). Referência aprovada:
// screen-refs/troca-senha-3opcoes.reference.html (plataforma "App de campo",
// opção A). Tela-modelo: login_screen.dart — marca (:167), cartão de entrada
// (:219), rótulo (:346), FilledButton (:300) e faixa de erro (:257-275).
//
// Regras (plano B-USERS-ACESSO-SEG-conserto-c1.md, A-04, T.1 e T.3):
// - a senha só vive nos campos: nunca vai para armazenamento, fila offline,
//   log ou telemetria;
// - a mensagem do servidor nunca aparece: o texto vem do mapa fixo do
//   repositório (`passwordChangeMessage`);
// - sem conexão, o botão não envia e a troca NUNCA entra na fila offline.
//
// Os blocos de marca, rótulo e faixa repetem os do login porque lá são privados
// e o escopo do bloco só deixa o login ganhar o aviso "Senha alterada"
// (declarado no diário do dev, com pendência para extrair à biblioteca).

class ChangePasswordScreen extends ConsumerStatefulWidget {
  const ChangePasswordScreen({super.key});

  static const currentFieldKey = Key('troca-senha-provisoria');
  static const newFieldKey = Key('troca-senha-nova');
  static const confirmFieldKey = Key('troca-senha-confirmacao');
  static const saveButtonKey = Key('troca-senha-salvar');
  static const exitButtonKey = Key('troca-senha-sair');
  static const accountLineKey = Key('troca-senha-conta');
  static const bannerKey = Key('troca-senha-faixa');

  @override
  ConsumerState<ChangePasswordScreen> createState() =>
      _ChangePasswordScreenState();
}

class _ChangePasswordScreenState extends ConsumerState<ChangePasswordScreen> {
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();
  final _currentFocus = FocusNode();

  bool _submitting = false;

  /// Acesso não permitido (403): só "Sair" continua ativo.
  bool _locked = false;
  bool _currentInvalid = false;
  String? _error;

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    _currentFocus.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authStateProvider).asData?.value;
    final email = authState?.session?.user.email ?? '';
    final isOffline = ref.watch(networkStatusProvider) == NetworkStatus.offline;

    final banner = isOffline
        ? const _Banner(
            text: kPasswordChangeOfflineMessage,
            icon: Icons.wifi_off,
          )
        : (_error != null ? _Banner(text: _error!) : null);

    final fieldsEnabled = !_submitting && !_locked;
    final canSubmit = fieldsEnabled && !isOffline;

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
                  Container(
                    padding: const EdgeInsets.all(18),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: ErpMobileTheme.cardBorder),
                    ),
                    child: AutofillGroup(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Semantics(
                            header: true,
                            child: const Text(
                              'Crie sua nova senha',
                              style: TextStyle(
                                fontSize: 17,
                                fontWeight: FontWeight.w800,
                                color: ErpMobileTheme.ink,
                                height: 1.25,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          const Text(
                            'Por segurança, troque a senha provisória antes de continuar.',
                            style: TextStyle(
                              fontSize: 13,
                              color: ErpMobileTheme.inkMuted,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 6),
                          // Decisão do dono (Emenda 4): o e-mail da PRÓPRIA
                          // sessão, texto simples (não é campo nem link), no
                          // estilo do rótulo; e-mail longo quebra, não corta.
                          Text(
                            'Entrando como $email',
                            key: ChangePasswordScreen.accountLineKey,
                            softWrap: true,
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: ErpMobileTheme.inkMuted,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 14),
                          if (banner != null) ...[
                            banner,
                            const SizedBox(height: 14),
                          ],
                          const _FieldLabel('Senha provisória'),
                          _PasswordField(
                            fieldKey: ChangePasswordScreen.currentFieldKey,
                            controller: _currentController,
                            focusNode: _currentFocus,
                            revealLabel: 'Mostrar senha provisória',
                            hideLabel: 'Ocultar senha provisória',
                            autofillHint: AutofillHints.password,
                            enabled: fieldsEnabled,
                            invalid: _currentInvalid,
                            textInputAction: TextInputAction.next,
                            onChanged: (_) {
                              if (_currentInvalid) {
                                setState(() => _currentInvalid = false);
                              }
                            },
                          ),
                          const SizedBox(height: 12),
                          const _FieldLabel('Nova senha'),
                          _PasswordField(
                            fieldKey: ChangePasswordScreen.newFieldKey,
                            controller: _newController,
                            revealLabel: 'Mostrar nova senha',
                            hideLabel: 'Ocultar nova senha',
                            autofillHint: AutofillHints.newPassword,
                            enabled: fieldsEnabled,
                            textInputAction: TextInputAction.next,
                          ),
                          const SizedBox(height: 12),
                          const _FieldLabel('Confirme a nova senha'),
                          _PasswordField(
                            fieldKey: ChangePasswordScreen.confirmFieldKey,
                            controller: _confirmController,
                            revealLabel: 'Mostrar confirmação da nova senha',
                            hideLabel: 'Ocultar confirmação da nova senha',
                            autofillHint: AutofillHints.newPassword,
                            enabled: fieldsEnabled,
                            textInputAction: TextInputAction.done,
                            onSubmitted: canSubmit ? (_) => _submit() : null,
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Use pelo menos 8 caracteres, diferente do seu e-mail e da senha provisória.',
                            style: TextStyle(
                              fontSize: 12,
                              color: ErpMobileTheme.inkMuted,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 18),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              key: ChangePasswordScreen.saveButtonKey,
                              onPressed: canSubmit ? _submit : null,
                              child: _submitting
                                  ? Semantics(
                                      label: 'Salvando…',
                                      child: const SizedBox(
                                        height: 20,
                                        width: 20,
                                        child:
                                            CircularProgressIndicator.adaptive(
                                              strokeWidth: 2,
                                            ),
                                      ),
                                    )
                                  : const Text('Salvar nova senha'),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Center(
                            child: TextButton(
                              key: ChangePasswordScreen.exitButtonKey,
                              style: TextButton.styleFrom(
                                minimumSize: const Size(64, 44),
                              ),
                              onPressed: _submitting ? null : _exit,
                              child: const Text('Sair'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    if (_submitting || _locked) return; // nada de duplo envio

    // Sem conexão: a troca precisa de internet e NUNCA vai para a fila.
    if (ref.read(networkStatusProvider) == NetworkStatus.offline) {
      setState(() => _error = kPasswordChangeOfflineMessage);
      return;
    }

    final current = _currentController.text;
    final next = _newController.text;
    final confirm = _confirmController.text;
    final email =
        ref.read(authStateProvider).asData?.value.session?.user.email ?? '';

    // A validação local espelha a regra do servidor; quem decide é o backend.
    final localError = _validateLocally(
      current: current,
      next: next,
      confirm: confirm,
      email: email,
    );
    if (localError != null) {
      setState(() => _error = localError);
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
      _currentInvalid = false;
    });

    try {
      await ref
          .read(authStateProvider.notifier)
          .changePassword(currentPassword: current, newPassword: next);
      // Sucesso: o estado vai para "sem sessão" com o aviso, e o roteador leva
      // ao login. Nada a fazer aqui.
    } on PasswordChangeError catch (e) {
      if (!mounted) return;
      if (e.failure == PasswordChangeFailure.sessionExpired) {
        return; // o estado já voltou ao login com o texto de sessão expirada
      }
      setState(() {
        _submitting = false;
        _error = e.safeMessage;
        _locked = e.locksForm;
        if (e.failure == PasswordChangeFailure.wrongCurrentPassword) {
          _currentInvalid = true;
          _currentController.clear();
        }
      });
      if (e.failure == PasswordChangeFailure.wrongCurrentPassword) {
        _currentFocus.requestFocus();
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _error = passwordChangeMessage(PasswordChangeFailure.unavailable);
      });
    }
  }

  String? _validateLocally({
    required String current,
    required String next,
    required String confirm,
    required String email,
  }) {
    if (current.isEmpty || next.isEmpty || confirm.isEmpty) {
      return passwordChangeMessage(PasswordChangeFailure.incomplete);
    }
    final sameAsEmail =
        email.isNotEmpty && next.trim().toLowerCase() == email.toLowerCase();
    if (next.length < 8 || sameAsEmail || next == current) {
      return passwordChangeMessage(PasswordChangeFailure.invalidNewPassword);
    }
    if (confirm != next) return kPasswordChangeConfirmMismatch;
    return null;
  }

  Future<void> _exit() async {
    await ref.read(authStateProvider.notifier).logout();
  }
}

// ---------------------------------------------------------------------------
// Blocos do login (login_screen.dart), repetidos aqui pelo escopo (ver topo).

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
          const Expanded(
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

/// Faixa do login (login_screen.dart:257-275), com ícone opcional (sem
/// conexão). Região viva: o leitor de tela anuncia o texto quando ele aparece.
class _Banner extends StatelessWidget {
  const _Banner({required this.text, this.icon});

  final String text;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        key: ChangePasswordScreen.bannerKey,
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
            if (icon != null) ...[
              Icon(icon, size: 18, color: ErpMobileTheme.danger),
              const SizedBox(width: 8),
            ],
            Expanded(
              child: Text(
                text,
                style: const TextStyle(
                  fontSize: 12.5,
                  color: Color(0xFF991B1B),
                  height: 1.35,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Campo de senha da referência (opção A do app): 52 px, cadeado decorativo,
/// botão de mostrar/ocultar de 44 × 44 px com rótulo acessível e borda azul de
/// 2 px no foco (o campo do login perde a borda no foco; divergência
/// consciente da referência aprovada).
class _PasswordField extends StatefulWidget {
  const _PasswordField({
    required this.fieldKey,
    required this.controller,
    required this.revealLabel,
    required this.hideLabel,
    required this.autofillHint,
    required this.enabled,
    required this.textInputAction,
    this.focusNode,
    this.invalid = false,
    this.onChanged,
    this.onSubmitted,
  });

  final Key fieldKey;
  final TextEditingController controller;
  final FocusNode? focusNode;
  final String revealLabel;
  final String hideLabel;
  final String autofillHint;
  final bool enabled;
  final bool invalid;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;

  @override
  State<_PasswordField> createState() => _PasswordFieldState();
}

class _PasswordFieldState extends State<_PasswordField> {
  bool _visible = false;

  @override
  Widget build(BuildContext context) {
    final borderColor = widget.invalid
        ? ErpMobileTheme.danger
        : ErpMobileTheme.cardBorder;

    return TextField(
      key: widget.fieldKey,
      controller: widget.controller,
      focusNode: widget.focusNode,
      obscureText: !_visible,
      enableSuggestions: false,
      autocorrect: false,
      enabled: widget.enabled,
      textInputAction: widget.textInputAction,
      autofillHints: [widget.autofillHint],
      keyboardType: TextInputType.visiblePassword,
      inputFormatters: [FilteringTextInputFormatter.deny(RegExp(r'[\n\r]'))],
      onChanged: widget.onChanged,
      onSubmitted: widget.onSubmitted,
      style: const TextStyle(fontSize: 16, color: ErpMobileTheme.ink),
      decoration: InputDecoration(
        hintText: '••••••••',
        hintStyle: const TextStyle(color: ErpMobileTheme.inkFaint),
        prefixIcon: const ExcludeSemantics(
          child: Icon(
            Icons.lock_outline,
            size: 18,
            color: ErpMobileTheme.inkFaint,
          ),
        ),
        suffixIcon: IconButton(
          tooltip: _visible ? widget.hideLabel : widget.revealLabel,
          isSelected: _visible,
          constraints: const BoxConstraints(minWidth: 44, minHeight: 44),
          color: ErpMobileTheme.inkMuted,
          selectedIcon: const Icon(
            Icons.visibility_off_outlined,
            color: ErpMobileTheme.primary,
          ),
          icon: const Icon(Icons.visibility_outlined),
          onPressed: widget.enabled
              ? () => setState(() => _visible = !_visible)
              : null,
        ),
        filled: true,
        fillColor: const Color(0xFFF1F5F9),
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(
          horizontal: 14,
          vertical: 16,
        ),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(color: borderColor),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: borderColor,
            width: widget.invalid ? 2 : 1,
          ),
        ),
        disabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: const BorderSide(color: ErpMobileTheme.cardBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(10),
          borderSide: BorderSide(
            color: widget.invalid
                ? ErpMobileTheme.danger
                : ErpMobileTheme.primary,
            width: 2,
          ),
        ),
      ),
    );
  }
}
