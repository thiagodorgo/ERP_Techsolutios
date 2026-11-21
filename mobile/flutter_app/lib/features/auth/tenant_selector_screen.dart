import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/auth/auth_notifier.dart';
import '../../core/auth/role_labels.dart';
import '../../core/auth/tenant_switch_orchestrator.dart';
import '../../core/bootstrap/bootstrap_repository.dart';
import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/api_error.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/auto_sync_coordinator.dart';
import '../../core/sync/pending_count_provider.dart';
import '../../shared/theme/erp_mobile_theme.dart';
import '../../shared/ui/mobile_kit.dart';
import '../../shared/ui/organization_avatar.dart';
import '../work_orders/data/work_order_repository.dart';
import '../work_orders/domain/work_order_models.dart';
import 'login_screen.dart' show loginEmailPrefillProvider;

// B-APP-ORG (70) — Seleção de organização, opção A aprovada pelo dono (20/11,
// maquete `app-org-3opcoes`). Tela-modelo: esta mesma tela antes do bloco
// (avatar de iniciais, faixa azul) com os blocos clicáveis e a linha que abre
// o detalhe (`D-PADRAO-BLOCOS-CLICAVEIS`), montados com as peças do kit.
//
// Regra do dono (20/11): a tela só aparece com MAIS de uma organização com
// acesso; com uma só, ela pula para o Início (e o Perfil nem mostra a troca).
// A troca passa SEMPRE pelo ponto único (`tenantSwitchOrchestratorProvider`).

/// O texto verdadeiro da faixa azul (plano §8.1; aceites A5 e A3-a).
const kTenantDataSeparationNotice =
    'Os dados de cada organização ficam separados neste aparelho. Ao trocar, '
    'o app mostra só os da organização escolhida; o que ainda não foi enviado '
    'fica guardado e é enviado quando você voltar a ela.';

const kTenantSwitchOfflineMessage = 'Sem conexão. A troca precisa de internet.';

/// A recusa (403) dita na faixa, depois de "Não foi possível entrar em X."
/// (sem repetir a frase do erro).
const kTenantSwitchRefusedDetail =
    'A organização pode estar suspensa ou o seu acesso foi retirado. Fale com '
    'o administrador dela.';

const kTenantSwitchRetryDetail = 'Tente de novo em instantes.';

/// F70-3: "1 envio pendente" / "N envios pendentes" (singular e plural).
String pendingSendsLabel(int count) =>
    count == 1 ? '1 envio pendente' : '$count envios pendentes';

/// Quantas OS abertas e agendadas para hoje a organização ATUAL tem no
/// aparelho (a mesma regra do "OS hoje" do Início). `null` quando não dá para
/// saber: nada de número inventado. Antes de contar, o mesmo `load()` que o
/// Início faz (já carregado, não faz nada).
final _openTodayInActiveTenantProvider = FutureProvider.autoDispose<int?>((
  ref,
) async {
  try {
    final sessionFuture = ref.watch(bootstrapSessionProvider.future);
    final repo = ref.watch(workOrderRepositoryProvider);
    final session = await sessionFuture;
    await repo.load();
    final today = DateTime.now();
    return repo.workOrders.where((o) {
      final at = o.scheduledAt?.toLocal();
      return o.tenantId == session.activeTenant.tenantId &&
          !o.status.isFinal &&
          at != null &&
          at.year == today.year &&
          at.month == today.month &&
          at.day == today.day;
    }).length;
  } catch (_) {
    return null;
  }
});

enum _Filter { all, pending, today }

enum _PendingChoice { sendFirst, switchAnyway }

class TenantSelectorScreen extends ConsumerStatefulWidget {
  const TenantSelectorScreen({super.key});

  @override
  ConsumerState<TenantSelectorScreen> createState() =>
      _TenantSelectorScreenState();
}

class _TenantSelectorScreenState extends ConsumerState<TenantSelectorScreen> {
  String? _open;
  _Filter _filter = _Filter.all;

  /// O nome da organização para onde a troca está indo (a camada "Entrando").
  String? _switchingTo;

  /// A recusa da última troca: a organização pedida e o texto seguro.
  (String, String)? _failure;
  bool _skipScheduled = false;

  @override
  Widget build(BuildContext context) {
    final bootstrapAsync = ref.watch(bootstrapNotifierProvider);

    return Scaffold(
      backgroundColor: ErpMobileTheme.pageBg,
      body: Stack(
        children: [
          Column(
            children: [
              MobileScreenHeader(
                title: 'Selecionar organização',
                onBack: () => GoRouter.maybeOf(context)?.go('/profile'),
              ),
              Expanded(
                child: bootstrapAsync.when(
                  loading: () => const _LoadingList(),
                  error: (error, _) => _LoadErrorView(
                    onRetry: () =>
                        ref.read(bootstrapNotifierProvider.notifier).retry(),
                  ),
                  data: (session) {
                    if (session.availableTenants.length <= 1) {
                      _skipToHome();
                      return const SizedBox.shrink(key: Key('troca-pulada'));
                    }
                    return _buildList(session);
                  },
                ),
              ),
            ],
          ),
          if (_switchingTo != null)
            _SwitchingOverlay(
              target: _switchingTo!,
              current:
                  bootstrapAsync.asData?.value.activeTenant.displayName ?? '',
            ),
        ],
      ),
    );
  }

  /// Uma organização só: a tela não aparece (regra do dono, 20/11).
  void _skipToHome() {
    if (_skipScheduled || _switchingTo != null) return;
    _skipScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) GoRouter.maybeOf(context)?.go('/');
    });
  }

  Widget _buildList(BootstrapSession session) {
    final tenants = session.availableTenants;
    final active = session.activeTenant;
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;
    final pending = ref
        .watch(pendingCountForActiveSessionProvider)
        .asData
        ?.value;
    final openToday = ref.watch(_openTodayInActiveTenantProvider).asData?.value;

    bool keep(TenantContext t) => switch (_filter) {
      _Filter.all => true,
      _Filter.pending => t.tenantId == active.tenantId && (pending ?? 0) > 0,
      _Filter.today => t.tenantId == active.tenantId && (openToday ?? 0) > 0,
    };

    final visible = [
      for (var i = 0; i < tenants.length; i++)
        if (keep(tenants[i])) (i, tenants[i]),
    ];

    return ListView(
      key: const Key('troca-lista'),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      children: [
        if (offline) ...[
          const MobileNoticeBanner(
            key: Key('troca-sem-conexao'),
            icon: Icons.wifi_off,
            message:
                'Sem conexão. Você vê a lista guardada; trocar de organização '
                'precisa de internet.',
            tone: PillTone.warning,
          ),
          const SizedBox(height: 10),
        ],
        if (_failure != null) ...[
          Semantics(
            liveRegion: true,
            container: true,
            child: MobileNoticeBanner(
              key: const Key('troca-recusada'),
              icon: Icons.block,
              message:
                  'Não foi possível entrar em ${_failure!.$1}. ${_failure!.$2} '
                  'Você continua em ${active.displayName}, sem nada perdido.',
              tone: PillTone.danger,
            ),
          ),
          const SizedBox(height: 10),
        ],
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
                text: '${tenants.length} organizações',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  color: ErpMobileTheme.ink,
                ),
              ),
              const TextSpan(
                text: '. Os dados de cada uma ficam separados neste aparelho.',
              ),
            ],
          ),
        ),
        const SizedBox(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: MobileStatTile(
                key: const Key('troca-bloco-organizacoes'),
                value: '${tenants.length}',
                label: 'Organizações',
                color: ErpMobileTheme.ink,
                selected: _filter == _Filter.all,
                onTap: () => _setFilter(_Filter.all),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: MobileStatTile(
                key: const Key('troca-bloco-pendentes'),
                value: pending == null ? '—' : '$pending',
                label: pending == 1
                    ? 'Envio pendente na atual'
                    : 'Envios pendentes na atual',
                color: (pending ?? 0) > 0
                    ? ErpMobileTheme.warningInk
                    : ErpMobileTheme.ink,
                selected: _filter == _Filter.pending,
                onTap: () => _setFilter(_Filter.pending),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: MobileStatTile(
                key: const Key('troca-bloco-os-hoje'),
                value: openToday == null ? '—' : '$openToday',
                label: 'OS abertas hoje na atual',
                color: ErpMobileTheme.ink,
                selected: _filter == _Filter.today,
                onTap: () => _setFilter(_Filter.today),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        if (_filter != _Filter.all) ...[
          _FilterLine(
            label: _filter == _Filter.pending
                ? 'Com envios pendentes'
                : 'Com OS abertas hoje',
            onClear: () => _setFilter(_Filter.all),
          ),
          const SizedBox(height: 8),
        ],
        if (visible.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Text(
              'Nenhuma organização neste filtro.',
              key: Key('troca-filtro-vazio'),
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: ErpMobileTheme.inkMuted),
            ),
          ),
        for (final (index, tenant) in visible)
          _OrgRow(
            key: Key('troca-org-${tenant.tenantId}'),
            tenant: tenant,
            index: index,
            isActive: tenant.tenantId == active.tenantId,
            expanded: _open == tenant.tenantId,
            onToggle: () => setState(
              () => _open = _open == tenant.tenantId ? null : tenant.tenantId,
            ),
            pending: tenant.tenantId == active.tenantId ? pending : null,
            detail: _OrgDetail(
              tenant: tenant,
              isActive: tenant.tenantId == active.tenantId,
              activeName: active.displayName,
              pending: pending,
              openToday: openToday,
              offline: offline,
              onSelect: () => _onTap(tenant, active),
              onSendNow: _sendNow,
              onOpenSync: () => GoRouter.maybeOf(context)?.go('/sync'),
            ),
          ),
        const SizedBox(height: 4),
        _OtherOrgRow(onTap: () => _confirmOther(active, pending)),
        const SizedBox(height: 12),
        Container(
          key: const Key('troca-aviso-dados'),
          padding: const EdgeInsets.all(13),
          decoration: BoxDecoration(
            color: const Color(0xFFEFF6FF),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFBFDBFE)),
          ),
          child: const Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(Icons.shield_outlined, size: 18, color: ErpMobileTheme.info),
              SizedBox(width: 10),
              Expanded(
                child: Text(
                  kTenantDataSeparationNotice,
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

  void _setFilter(_Filter next) => setState(() {
    _filter = _filter == next ? _Filter.all : next;
    _open = null;
  });

  /// "Entrar nesta organização": com envios pendentes na atual, primeiro o
  /// aviso (Q1: avisa e deixa trocar); depois a troca pelo ponto único.
  Future<void> _onTap(TenantContext tenant, TenantContext active) async {
    final pending = await ref.read(pendingCountForActiveSessionProvider.future);
    if (pending > 0) {
      final choice = await _confirmPending(tenant, active, pending);
      if (choice == null) return;
      if (choice == _PendingChoice.sendFirst) {
        // a passada da atual roda antes da troca
        await ref.read(autoSyncCoordinatorProvider.notifier).triggerManual();
      }
    }
    await _switch(tenant);
  }

  Future<_PendingChoice?> _confirmPending(
    TenantContext tenant,
    TenantContext active,
    int pending,
  ) {
    return showDialog<_PendingChoice>(
      context: context,
      builder: (ctx) => AlertDialog(
        key: const Key('troca-pendencias'),
        icon: const Icon(
          Icons.cloud_upload_outlined,
          color: ErpMobileTheme.warningInk,
        ),
        title: Text(
          '${pending == 1 ? 'Envio pendente' : 'Envios pendentes'} em '
          '${active.displayName}',
        ),
        content: Text(
          pending == 1
              ? 'Você tem ${pendingSendsLabel(pending)} em ${active.displayName}. '
                    'Ele fica guardado neste aparelho e é enviado quando você '
                    'voltar para ${active.displayName}.'
              : 'Você tem ${pendingSendsLabel(pending)} em ${active.displayName}. '
                    'Eles ficam guardados neste aparelho e são enviados quando '
                    'você voltar para ${active.displayName}.',
        ),
        actionsOverflowDirection: VerticalDirection.down,
        actionsOverflowButtonSpacing: 8,
        actions: [
          FilledButton.icon(
            key: const Key('troca-enviar-agora'),
            onPressed: () => Navigator.of(ctx).pop(_PendingChoice.sendFirst),
            icon: const Icon(Icons.cloud_upload_outlined, size: 18),
            label: const Text('Enviar agora'),
          ),
          OutlinedButton(
            key: const Key('troca-assim-mesmo'),
            onPressed: () => Navigator.of(ctx).pop(_PendingChoice.switchAnyway),
            child: Text('Trocar para ${tenant.displayName} assim mesmo'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  Future<void> _switch(TenantContext tenant) async {
    setState(() {
      _switchingTo = tenant.displayName;
      _failure = null;
      _open = null;
    });
    try {
      await ref.read(tenantSwitchOrchestratorProvider).run(tenant.tenantId);
      if (!mounted) return;
      GoRouter.maybeOf(context)?.go('/');
    } on TenantSwitchBusyError catch (e) {
      _fail(tenant, e.safeMessage);
    } on ApiNetworkError {
      _fail(tenant, kTenantSwitchOfflineMessage);
    } on ApiTimeoutError {
      _fail(tenant, kTenantSwitchOfflineMessage);
    } on TenantSwitchRefusedError {
      _fail(tenant, kTenantSwitchRefusedDetail);
    } on TenantSwitchMismatchError {
      _fail(tenant, kTenantSwitchRetryDetail);
    } on ApiError catch (e) {
      _fail(tenant, e.safeMessage);
    } catch (_) {
      _fail(tenant, kTenantSwitchRetryDetail);
    } finally {
      if (mounted) setState(() => _switchingTo = null);
    }
  }

  void _fail(TenantContext tenant, String message) {
    if (!mounted) return;
    setState(() => _failure = (tenant.displayName, message));
  }

  Future<void> _sendNow() async {
    final messenger = ScaffoldMessenger.maybeOf(context);
    await ref.read(autoSyncCoordinatorProvider.notifier).triggerManual();
    ref.invalidate(pendingCountForActiveSessionProvider);
    messenger?.showSnackBar(
      const SnackBar(content: Text('Envio da organização atual iniciado.')),
    );
  }

  /// Q4: "Entrar em outra organização" sai da sessão (nada se apaga) e volta
  /// ao Entrar com o e-mail preenchido.
  Future<void> _confirmOther(TenantContext active, int? pending) async {
    final nothingLost = (pending ?? 0) > 0
        ? pending == 1
              ? 'Nada se apaga: o envio pendente de ${active.displayName} '
                    'fica guardado e sai quando você voltar a ela.'
              : 'Nada se apaga: os ${pendingSendsLabel(pending!)} de '
                    '${active.displayName} ficam guardados e saem quando você '
                    'voltar a ela.'
        : 'Nada se apaga: o que é de ${active.displayName} fica guardado '
              'neste aparelho.';
    final go = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        key: const Key('troca-outra'),
        icon: const Icon(Icons.logout, color: ErpMobileTheme.info),
        title: const Text('Entrar em outra organização'),
        content: Text(
          'Você sai desta sessão e volta à tela Entrar, com o seu e-mail já '
          'preenchido. Depois, é só usar a senha da outra organização.'
          '\n\n$nothingLost',
        ),
        actionsOverflowDirection: VerticalDirection.down,
        actionsOverflowButtonSpacing: 8,
        actions: [
          FilledButton(
            key: const Key('troca-sair-e-entrar'),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Sair e entrar em outra'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
    if (go != true || !mounted) return;
    final email = ref.read(authStateProvider).asData?.value.session?.user.email;
    ref.read(loginEmailPrefillProvider.notifier).set(email);
    final router = GoRouter.maybeOf(context);
    await ref.read(authStateProvider.notifier).logout();
    router?.go('/login');
  }
}

// ── Peças da tela ────────────────────────────────────────────────────────────

class _OrgRow extends StatelessWidget {
  const _OrgRow({
    required this.tenant,
    required this.index,
    required this.isActive,
    required this.expanded,
    required this.onToggle,
    required this.detail,
    required this.pending,
    super.key,
  });

  final TenantContext tenant;
  final int index;
  final bool isActive;
  final bool expanded;
  final VoidCallback onToggle;
  final Widget detail;
  final int? pending;

  @override
  Widget build(BuildContext context) {
    final pending = this.pending ?? 0;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: isActive ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
          width: isActive ? 1.5 : 1,
        ),
      ),
      clipBehavior: Clip.antiAlias,
      child: MobileExpandableRow(
        title: tenant.displayName,
        expanded: expanded,
        onToggle: onToggle,
        leading: OrganizationAvatar(name: tenant.displayName, index: index),
        trailing: (isActive || pending > 0)
            ? Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (isActive)
                    const MobilePill(label: 'Atual', tone: PillTone.info),
                  if (pending > 0) ...[
                    const SizedBox(width: 6),
                    MobilePill(
                      key: const Key('troca-pill-pendentes'),
                      label: pending == 1 ? '1 pendente' : '$pending pendentes',
                      tone: PillTone.warning,
                    ),
                  ],
                ],
              )
            : null,
        detail: detail,
      ),
    );
  }
}

class _OrgDetail extends StatelessWidget {
  const _OrgDetail({
    required this.tenant,
    required this.isActive,
    required this.activeName,
    required this.pending,
    required this.openToday,
    required this.offline,
    required this.onSelect,
    required this.onSendNow,
    required this.onOpenSync,
  });

  final TenantContext tenant;
  final bool isActive;
  final String activeName;
  final int? pending;
  final int? openToday;
  final bool offline;
  final Future<void> Function() onSelect;
  final Future<void> Function() onSendNow;
  final VoidCallback onOpenSync;

  @override
  Widget build(BuildContext context) {
    final pending = this.pending ?? 0;
    final String text;
    final Widget action;
    if (isActive) {
      text = pending > 0
          ? pending == 1
                ? 'Você está nesta organização. 1 envio ainda não saiu deste '
                      'aparelho.'
                : 'Você está nesta organização. $pending envios ainda não '
                      'saíram deste aparelho.'
          : 'Você está nesta organização. Tudo o que você fez aqui já foi '
                'enviado.';
      action = pending > 0
          ? FilledButton.icon(
              key: const Key('troca-enviar-pendentes'),
              onPressed: offline ? null : onSendNow,
              icon: const Icon(Icons.cloud_upload_outlined, size: 18),
              label: Text(
                pending == 1
                    ? 'Enviar 1 pendente agora'
                    : 'Enviar $pending pendentes agora',
              ),
            )
          : OutlinedButton(
              onPressed: onOpenSync,
              child: const Text('Ver sincronização'),
            );
    } else {
      final kept = pending > 0
          ? pending == 1
                ? ' O envio pendente de $activeName fica guardado aqui.'
                : ' Os ${pendingSendsLabel(pending)} de $activeName ficam '
                      'guardados aqui.'
          : '';
      text = offline
          ? 'Trocar de organização precisa de internet. Seus dados continuam '
                'guardados neste aparelho.'
          : 'Ao entrar, o app mostra só os dados de ${tenant.displayName}.'
                '$kept';
      action = _SwitchButton(
        key: Key('troca-entrar-${tenant.tenantId}'),
        enabled: !offline,
        onSelect: onSelect,
      );
    }
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _Prop('Seu perfil', roleLabel(tenant.userRole ?? '')),
          if (isActive) ...[
            _Prop('Envios pendentes', '$pending neste aparelho'),
            _Prop('OS abertas hoje', openToday == null ? '—' : '$openToday'),
          ],
          const SizedBox(height: 8),
          Text(
            text,
            style: const TextStyle(
              fontSize: 12.5,
              height: 1.4,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
          const SizedBox(height: 10),
          SizedBox(height: 48, child: action),
        ],
      ),
    );
  }
}

class _Prop extends StatelessWidget {
  const _Prop(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 12,
                color: ErpMobileTheme.inkMuted,
              ),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.w700,
              color: ErpMobileTheme.ink,
            ),
          ),
        ],
      ),
    );
  }
}

/// O botão "Entrar nesta organização": espera a troca (`await`), e um segundo
/// toque durante ela não faz um segundo pedido (T14).
class _SwitchButton extends StatefulWidget {
  const _SwitchButton({
    required this.enabled,
    required this.onSelect,
    super.key,
  });

  final bool enabled;
  final Future<void> Function() onSelect;

  @override
  State<_SwitchButton> createState() => _SwitchButtonState();
}

class _SwitchButtonState extends State<_SwitchButton> {
  bool _loading = false;

  @override
  Widget build(BuildContext context) {
    // O progresso da troca é a camada "Entrando em …" da tela; enquanto o
    // aviso de pendências está aberto, o botão só fica travado.
    return FilledButton(
      onPressed: widget.enabled && !_loading ? _doSelect : null,
      child: const Text('Entrar nesta organização'),
    );
  }

  Future<void> _doSelect() async {
    if (_loading) return;
    setState(() => _loading = true);
    try {
      await widget.onSelect();
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }
}

class _FilterLine extends StatelessWidget {
  const _FilterLine({required this.label, required this.onClear});

  final String label;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        const Text(
          'Filtro:',
          style: TextStyle(fontSize: 12, color: ErpMobileTheme.inkMuted),
        ),
        const SizedBox(width: 6),
        Flexible(
          child: Semantics(
            button: true,
            label: 'Tirar o filtro $label',
            excludeSemantics: true,
            child: InputChip(
              key: const Key('troca-filtro-limpar'),
              label: Text(label),
              onDeleted: onClear,
              onPressed: onClear,
              deleteIcon: const Icon(Icons.close, size: 16),
            ),
          ),
        ),
      ],
    );
  }
}

class _OtherOrgRow extends StatelessWidget {
  const _OtherOrgRow({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      button: true,
      child: Material(
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: const BorderSide(color: Color(0xFFBFDBFE)),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          key: const Key('troca-entrar-em-outra'),
          onTap: onTap,
          focusColor: ErpMobileTheme.primary.withValues(alpha: 0.16),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 52),
            child: const Padding(
              padding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Icon(Icons.logout, size: 20, color: ErpMobileTheme.primary),
                  SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Entrar em outra organização',
                          style: TextStyle(
                            fontSize: 13.5,
                            fontWeight: FontWeight.w700,
                            color: ErpMobileTheme.primary,
                          ),
                        ),
                        Text(
                          'Para uma organização que não aparece aqui',
                          style: TextStyle(
                            fontSize: 11.5,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Icon(Icons.chevron_right, color: ErpMobileTheme.inkFaint),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SwitchingOverlay extends StatelessWidget {
  const _SwitchingOverlay({required this.target, required this.current});

  final String target;
  final String current;

  @override
  Widget build(BuildContext context) {
    return Positioned.fill(
      child: ColoredBox(
        color: const Color(0xCCF1F5F9),
        child: Center(
          child: Semantics(
            liveRegion: true,
            container: true,
            child: Container(
              key: const Key('troca-entrando'),
              margin: const EdgeInsets.all(24),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: ErpMobileTheme.cardBorder),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(),
                  const SizedBox(height: 14),
                  Text(
                    'Entrando em $target',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                      color: ErpMobileTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    current.isEmpty
                        ? 'Conferindo o seu acesso.'
                        : 'Conferindo o seu acesso. O que é de $current '
                              'continua guardado neste aparelho.',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: ErpMobileTheme.inkMuted,
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
}

class _LoadingList extends StatelessWidget {
  const _LoadingList();

  @override
  Widget build(BuildContext context) {
    Widget bar(double w, double h) => Container(
      width: w,
      height: h,
      decoration: BoxDecoration(
        color: const Color(0xFFE2E8F0),
        borderRadius: BorderRadius.circular(6),
      ),
    );
    return Semantics(
      label: 'Carregando suas organizações',
      container: true,
      child: ExcludeSemantics(
        child: ListView(
          key: const Key('troca-carregando'),
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          children: [
            bar(260, 13),
            const SizedBox(height: 14),
            for (var i = 0; i < 5; i++)
              Container(
                height: 48,
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.symmetric(horizontal: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: ErpMobileTheme.cardBorder),
                ),
                child: Row(
                  children: [
                    bar(28, 28),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Align(
                        alignment: Alignment.centerLeft,
                        child: bar(170, 12),
                      ),
                    ),
                    bar(36, 12),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _LoadErrorView extends StatelessWidget {
  const _LoadErrorView({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Padding(
        key: const Key('troca-erro'),
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(
              Icons.error_outline,
              size: 48,
              color: ErpMobileTheme.danger,
            ),
            const SizedBox(height: 12),
            const Text(
              'Não foi possível carregar suas organizações',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: ErpMobileTheme.ink,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Confira a sua conexão e tente de novo. Você continua na '
              'organização atual.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 13, color: ErpMobileTheme.inkMuted),
            ),
            const SizedBox(height: 18),
            FilledButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}
