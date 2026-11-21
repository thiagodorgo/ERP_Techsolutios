import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/auth/auth_notifier.dart';
import '../../../core/auth/auth_repository.dart';
import '../../../core/auth/listen_sessions.dart';
import '../../../core/auth/session_renewal.dart';
import '../../../core/auth/tenant_switch_orchestrator.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/bootstrap/bootstrap_session.dart';
import '../../../core/bootstrap/bootstrap_session_match.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/connectivity_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/auto_sync_coordinator.dart';
import '../../../core/sync/pending_count_provider.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../core/sync/sync_user_scope.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../../shared/ui/organization_avatar.dart';
import '../data/other_patios_calls.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';

// ---------------------------------------------------------------------------
// B-APP-ORG-2 (A2; Emendas 1.8 §3.3 e §5.2, 1.8.2 §4.3): a seção "Outros
// pátios". Os chamados abertos dos outros pátios em que a pessoa está ativa,
// trazidos pelas sessões de escuta (A1, `otherPatiosCallsProvider`), só de
// leitura. Tocar num chamado ou no bloco troca o pátio pelo ponto único do
// #613 (`tenantSwitchOrchestratorProvider`, que fecha a porta do envio), com a
// confirmação do #613 quando há envio pendente no pátio atual. Sem tela de
// escolha. Os textos da troca são os da Seleção aprovada (opção A, 20/11), com
// "pátio" no lugar de "organização", como no resto do app de guincho.
// ---------------------------------------------------------------------------

/// "1 envio pendente" / "N envios pendentes" (singular e plural, F70-3).
String otherPatiosPendingLabel(int count) =>
    count == 1 ? '1 envio pendente' : '$count envios pendentes';

/// A recusa (403) da troca, depois de "Não foi possível entrar em X.".
const kOtherPatioRefusedDetail =
    'O pátio pode estar suspenso ou o seu acesso foi retirado. Fale com o '
    'administrador dele.';

const kOtherPatioRetryDetail = 'Tente de novo em instantes.';

const kOtherPatiosOfflineMessage =
    'Sem conexão. Os chamados dos outros pátios aparecem quando a internet '
    'voltar; trocar de pátio também precisa dela.';

enum _PendingChoice { sendFirst, switchAnyway }

// ---------------------------------------------------------------------------
// Status group filter
// ---------------------------------------------------------------------------

enum _WoGroup { all, scheduled, field, done }

extension _WoGroupX on _WoGroup {
  String get label => switch (this) {
    _WoGroup.all => 'Todas',
    _WoGroup.scheduled => 'Agendadas',
    _WoGroup.field => 'Em campo',
    _WoGroup.done => 'Concluidas',
  };

  bool matches(WorkOrderStatus s) => switch (this) {
    _WoGroup.all => true,
    _WoGroup.scheduled =>
      s == WorkOrderStatus.scheduled || s == WorkOrderStatus.dispatched,
    _WoGroup.field =>
      s == WorkOrderStatus.enRoute ||
          s == WorkOrderStatus.arrived ||
          s == WorkOrderStatus.inService ||
          s == WorkOrderStatus.paused ||
          s == WorkOrderStatus.pendingApproval ||
          s == WorkOrderStatus.exception,
    _WoGroup.done =>
      s == WorkOrderStatus.completed ||
          s == WorkOrderStatus.approved ||
          s == WorkOrderStatus.rejected ||
          s == WorkOrderStatus.cancelled,
  };
}

// ---------------------------------------------------------------------------
// Screen — alvo visual: screen-refs/mobile/os-lista.png
// ---------------------------------------------------------------------------

class WorkOrderListScreen extends ConsumerStatefulWidget {
  const WorkOrderListScreen({super.key});

  @override
  ConsumerState<WorkOrderListScreen> createState() =>
      _WorkOrderListScreenState();
}

class _WorkOrderListScreenState extends ConsumerState<WorkOrderListScreen> {
  _WoGroup _group = _WoGroup.all;
  WorkOrderPriority? _priority;
  String _query = '';
  final _searchController = TextEditingController();
  WorkOrderRepository? _repo;

  // ── "Outros pátios" (A2) ──
  /// Os blocos do último ciclo; `null` = ainda nenhum ciclo nesta sessão.
  List<OtherPatioBlock>? _others;
  bool _othersLoading = false;
  Future<void>? _othersInFlight;

  /// A sessão viva e os pátios para os quais [_others] vale.
  String? _othersFor;
  DateTime? _othersPulledAt;

  /// Envios pendentes de cada outro pátio, da pessoa daquele pátio (o `sub`
  /// da sessão de escuta). Sem sessão de escuta, sem número.
  Map<String, int> _othersPending = const {};

  /// A troca em curso (o nome do pátio) e a última que não deu.
  String? _switchingTo;
  bool _switchBusy = false;
  (String, String)? _switchFailure;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final repo = ref.read(workOrderRepositoryProvider);
    if (_repo != repo) {
      _repo?.removeListener(_onRepoChanged);
      _repo = repo;
      _repo!.addListener(_onRepoChanged);
    }
  }

  @override
  void dispose() {
    _repo?.removeListener(_onRepoChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onRepoChanged() {
    if (!mounted) return;
    setState(() {});
    // "Outros pátios" atualiza nas mesmas ocasiões da lista (1.8 §3.3): a
    // lista acabou de baixar do servidor (abrir, puxar, sincronizar).
    final pulledAt = _repo?.lastPulledAt;
    if (pulledAt != null && pulledAt != _othersPulledAt) {
      _othersPulledAt = pulledAt;
      _loadOthers();
    }
  }

  // ── "Outros pátios" ───────────────────────────────────────────────────────

  /// Os outros pátios da sessão viva, na ordem do bootstrap. Vazio sem sessão
  /// ou com o bootstrap de outra sessão (a troca acabou de acontecer).
  List<TenantContext> _otherTenants(BootstrapSession? boot) {
    final live = ref.read(authStateProvider).asData?.value;
    final current = live?.session;
    if (current == null || boot == null) return const [];
    if (!bootstrapMatchesLiveSession(boot, live)) return const [];
    return [
      for (final t in boot.availableTenants)
        if (t.tenantId != current.user.tenantId) t,
    ];
  }

  String? _othersKeyOf(BootstrapSession? boot) {
    final current = ref.read(authStateProvider).asData?.value.session;
    if (current == null) return null;
    final ids = _otherTenants(boot).map((t) => t.tenantId).join(',');
    return '${sessionKeyOf(current)}|$ids';
  }

  /// A sessão viva ou os pátios mudaram: os blocos de antes não valem mais, e
  /// um ciclo novo começa depois deste quadro.
  void _syncOthersKey(BootstrapSession? boot) {
    final key = _othersKeyOf(boot);
    if (key == _othersFor) return;
    _othersFor = key;
    _others = null;
    _othersPending = const {};
    _switchFailure = null;
    if (key == null) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) _loadOthers();
    });
  }

  /// Um ciclo da escuta. Pedidos simultâneos viram um só; o resultado de uma
  /// sessão que já mudou é descartado.
  Future<void> _loadOthers() => _othersInFlight ??= _doLoadOthers()
      .whenComplete(() => _othersInFlight = null);

  Future<void> _doLoadOthers() async {
    final boot = ref.read(bootstrapSessionProvider).asData?.value;
    final current = ref.read(authStateProvider).asData?.value.session;
    final key = _othersKeyOf(boot);
    if (current == null || boot == null || key == null) return;
    if (_otherTenants(boot).isEmpty) {
      if (mounted && _othersFor == key) setState(() => _others = const []);
      return;
    }
    // Sem internet, nada é pedido: os blocos que já havia ficam.
    if (ref.read(networkStatusProvider) == NetworkStatus.offline) return;
    if (mounted) setState(() => _othersLoading = true);
    try {
      final blocks = await ref
          .read(otherPatiosCallsProvider)
          .load(current: current, tenants: boot.availableTenants);
      final pending = await _pendingOf(blocks);
      if (!mounted || _othersFor != key) return;
      setState(() {
        _others = blocks;
        _othersPending = pending;
      });
    } catch (_) {
      // Cada bloco já falha sozinho dentro do `load`; aqui só sobra o que nem
      // chegou a ele. Os blocos que havia ficam.
    } finally {
      if (mounted) setState(() => _othersLoading = false);
    }
  }

  /// "N envios pendentes" de cada outro pátio: a fila guarda a pessoa de cada
  /// pátio, e a sessão de escuta diz quem ela é lá. Só leitura; erro = sem
  /// número (nada inventado).
  Future<Map<String, int>> _pendingOf(List<OtherPatioBlock> blocks) async {
    try {
      final queue = ref.read(syncQueueRepositoryProvider);
      final people = {
        for (final s in ref.read(listenSessionsProvider).sessions)
          s.tenantId: s.user.sub,
      };
      final counts = <String, int>{};
      for (final block in blocks) {
        final person = people[block.tenantId];
        if (person == null) continue;
        final pending = await queue.pendingForTenant(block.tenantId);
        final mine = partitionByUser(pending, person).mine.length;
        if (mine > 0) counts[block.tenantId] = mine;
      }
      return counts;
    } catch (_) {
      return const {};
    }
  }

  /// Tocar num chamado ou no bloco de outro pátio: com envio pendente no pátio
  /// atual, primeiro a confirmação do #613; depois a troca pelo ponto único.
  Future<void> _openOther(
    OtherPatioBlock block, {
    WorkOrder? order,
    required String activeName,
  }) async {
    if (_switchBusy) return; // dois toques fazem UM pedido
    if (ref.read(networkStatusProvider) == NetworkStatus.offline) {
      setState(
        () => _switchFailure = (block.tenantName, kTenantSwitchOfflineMessage),
      );
      return;
    }
    _switchBusy = true;
    try {
      final pending = await ref.read(
        pendingCountForActiveSessionProvider.future,
      );
      if (!mounted) return;
      if (pending > 0) {
        final choice = await _confirmPending(
          block.tenantName,
          activeName,
          pending,
        );
        if (choice == null || !mounted) return;
        if (choice == _PendingChoice.sendFirst) {
          // a passada do pátio atual roda antes da troca
          await ref.read(autoSyncCoordinatorProvider.notifier).triggerManual();
          if (!mounted) return;
        }
      }
      await _switchToOther(block, order: order);
    } finally {
      _switchBusy = false;
    }
  }

  Future<_PendingChoice?> _confirmPending(
    String targetName,
    String activeName,
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
          '$activeName',
        ),
        content: Text(
          pending == 1
              ? 'Você tem ${otherPatiosPendingLabel(pending)} em $activeName. '
                    'Ele fica guardado neste aparelho e é enviado quando você '
                    'voltar para $activeName.'
              : 'Você tem ${otherPatiosPendingLabel(pending)} em $activeName. '
                    'Eles ficam guardados neste aparelho e são enviados quando '
                    'você voltar para $activeName.',
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
            child: Text('Trocar para $targetName assim mesmo'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar'),
          ),
        ],
      ),
    );
  }

  Future<void> _switchToOther(OtherPatioBlock block, {WorkOrder? order}) async {
    final tenantId = block.tenantId;
    final router = GoRouter.maybeOf(context);
    final messenger = ScaffoldMessenger.maybeOf(context);
    setState(() {
      _switchingTo = block.tenantName;
      _switchFailure = null;
    });
    try {
      // O pátio ainda está na seção (pode ter saído enquanto a confirmação
      // estava aberta): só então a troca, SEMPRE pelo ponto único (G-ORQ).
      if (!(_others ?? const []).any((b) => b.tenantId == tenantId)) {
        throw const TenantSwitchRefusedError();
      } else {
        await ref.read(tenantSwitchOrchestratorProvider).run(tenantId);
      }
      if (!mounted) return;
      messenger?.showSnackBar(
        SnackBar(content: Text('Agora você está em ${block.tenantName}.')),
      );
      if (order != null) await _openSwitchedOrder(order, router);
    } on TenantSwitchBusyError catch (e) {
      _failSwitch(block, e.safeMessage);
    } on ApiNetworkError {
      _failSwitch(block, kTenantSwitchOfflineMessage);
    } on ApiTimeoutError {
      _failSwitch(block, kTenantSwitchOfflineMessage);
    } on TenantSwitchRefusedError {
      _failSwitch(block, kOtherPatioRefusedDetail);
    } on TenantSwitchMismatchError {
      _failSwitch(block, kOtherPatioRetryDetail);
    } on ApiError catch (e) {
      _failSwitch(block, e.safeMessage);
    } catch (_) {
      _failSwitch(block, kOtherPatioRetryDetail);
    } finally {
      if (mounted) setState(() => _switchingTo = null);
    }
  }

  /// Depois da troca, o chamado tocado abre, se já estiver no aparelho no pátio
  /// novo (o servidor manda o mesmo id). Se não estiver, fica a lista do pátio
  /// novo.
  Future<void> _openSwitchedOrder(WorkOrder order, GoRouter? router) async {
    final serverId = order.serverId;
    if (serverId == null || router == null) return;
    try {
      final live = ref.read(authStateProvider).asData?.value.session;
      // o bootstrap e o repositório do pátio novo (não os da sessão anterior)
      final boot = await ref.read(bootstrapSessionProvider.future);
      if (!mounted || boot.activeTenant.tenantId != live?.user.tenantId) return;
      final repo = ref.read(workOrderRepositoryProvider);
      await repo.load();
      if (repo.hasRemote) await repo.refresh();
      for (final local in repo.workOrders) {
        if (local.serverId == serverId &&
            local.tenantId == live?.user.tenantId) {
          router.go('/work-orders/${local.localId}');
          return;
        }
      }
    } catch (_) {
      // fica a lista do pátio novo
    }
  }

  void _failSwitch(OtherPatioBlock block, String message) {
    if (!mounted) return;
    setState(() => _switchFailure = (block.tenantName, message));
  }

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final repo = ref.watch(workOrderRepositoryProvider);
    // "Outros pátios": a sessão viva e a rede decidem a seção.
    ref.watch(authStateProvider);
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;

    final canRead = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:read',
          );
    final canCreate = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:create',
          );

    if (!canRead) {
      return ErpScaffold(
        showAppBar: false,
        body: Column(
          children: [
            const _ListHeader(),
            const Expanded(
              child: PermissionBlockedState(
                title: 'Acesso não permitido',
                message:
                    'Seu perfil não tem permissão para ver ordens de serviço. Fale com o administrador da sua organização.',
              ),
            ),
          ],
        ),
      );
    }

    _syncOthersKey(session);
    final others = _buildOthers(session, offline);

    return ErpScaffold(
      showAppBar: false,
      floatingActionButton: canCreate
          ? FloatingActionButton.extended(
              onPressed: () => context.go('/work-orders/new'),
              backgroundColor: ErpMobileTheme.primary,
              foregroundColor: Colors.white,
              icon: const Icon(Icons.add),
              label: const Text('Nova OS'),
            )
          : null,
      body: FutureBuilder<void>(
        future: repo.load(),
        builder: (context, _) {
          final filtered = _applyFilters(repo.workOrders);
          return RefreshIndicator(
            onRefresh: () async {
              await Future.wait<void>([repo.refresh(), _loadOthers()]);
            },
            child: Column(
              children: [
                const _ListHeader(),
                // Pull state banners
                if (repo.isPulling) const LinearProgressIndicator(),
                if ((repo.lastPullError != null || repo.lastPullIncomplete) &&
                    !repo.isPulling)
                  _PullErrorBanner(
                    message:
                        repo.lastPullError ??
                        'Não foi possível baixar todas as suas OS agora. '
                            'Os dados podem estar desatualizados.',
                    onRetry: () => repo.refresh(),
                  ),
                if (repo.lastPulledAt != null && !repo.isPulling)
                  _LastUpdatedBanner(at: repo.lastPulledAt!),
                if (repo.hasRemote &&
                    repo.lastPulledAt == null &&
                    !repo.isPulling &&
                    repo.lastPullError == null)
                  const _LocalCacheBanner(),

                // Filtros de estado (chips fieis ao prototipo)
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.fromLTRB(16, 10, 16, 2),
                  child: Row(
                    children: [
                      for (final g in _WoGroup.values) ...[
                        if (g != _WoGroup.values.first)
                          const SizedBox(width: 8),
                        _FilterChip(
                          label: g.label,
                          active: _group == g,
                          onTap: () => setState(() => _group = g),
                        ),
                      ],
                    ],
                  ),
                ),

                // Busca
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                  child: TextField(
                    controller: _searchController,
                    onChanged: (v) => setState(() => _query = v),
                    style: const TextStyle(
                      fontSize: 13.5,
                      color: ErpMobileTheme.ink,
                    ),
                    decoration: InputDecoration(
                      hintText: 'Buscar OS, cliente ou endereco...',
                      hintStyle: const TextStyle(
                        color: ErpMobileTheme.inkFaint,
                        fontSize: 13.5,
                      ),
                      prefixIcon: const Icon(
                        Icons.search_outlined,
                        size: 19,
                        color: ErpMobileTheme.inkFaint,
                      ),
                      suffixIcon: _query.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, size: 18),
                              color: ErpMobileTheme.inkFaint,
                              onPressed: () {
                                _searchController.clear();
                                setState(() => _query = '');
                              },
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.white,
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: ErpMobileTheme.cardBorder,
                        ),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: const BorderSide(
                          color: ErpMobileTheme.cardBorder,
                        ),
                      ),
                      contentPadding: const EdgeInsets.symmetric(vertical: 10),
                      isDense: true,
                    ),
                  ),
                ),

                // Filtro de prioridade (mantido; estilo discreto)
                Padding(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 2,
                  ),
                  child: Row(
                    children: [
                      const Text(
                        'Prioridade:',
                        style: TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: ErpMobileTheme.inkMuted,
                        ),
                      ),
                      const SizedBox(width: 8),
                      DropdownButton<WorkOrderPriority?>(
                        value: _priority,
                        hint: const Text('Todas'),
                        isDense: true,
                        style: const TextStyle(
                          fontSize: 12.5,
                          fontWeight: FontWeight.w600,
                          color: ErpMobileTheme.ink,
                        ),
                        underline: const SizedBox.shrink(),
                        items: [
                          const DropdownMenuItem(
                            value: null,
                            child: Text('Todas'),
                          ),
                          for (final p in WorkOrderPriority.values)
                            DropdownMenuItem(value: p, child: Text(p.label)),
                        ],
                        onChanged: (p) => setState(() => _priority = p),
                      ),
                      if (_priority != null) ...[
                        const SizedBox(width: 4),
                        TextButton(
                          onPressed: () => setState(() => _priority = null),
                          child: const Text('Limpar'),
                        ),
                      ],
                    ],
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? ListView(
                          children: [
                            if (repo.lastPullError != null &&
                                repo.workOrders.isEmpty)
                              EmptyState(
                                icon: Icons.cloud_off_outlined,
                                title: 'Nao foi possivel carregar ordens',
                                message: repo.lastPullError!,
                                action: TextButton.icon(
                                  onPressed: () => repo.refresh(),
                                  icon: const Icon(Icons.refresh),
                                  label: const Text('Tentar novamente'),
                                ),
                              )
                            else if (_group == _WoGroup.done &&
                                _query.isEmpty &&
                                _priority == null)
                              // B-SAN3-13 (E1, "Só as abertas") — a OS concluída e sincronizada sai do aparelho; a aba
                              // mostra só as que ainda esperam envio, e diz onde está o histórico.
                              const EmptyState(
                                icon: Icons.check_circle_outline,
                                title: 'Nenhuma OS concluída no aparelho',
                                message:
                                    'As OS concluídas saem do aparelho depois de sincronizar. '
                                    'O histórico fica no portal.',
                              )
                            else
                              EmptyState(
                                icon: Icons.build_outlined,
                                title: 'Nenhuma OS encontrada',
                                message:
                                    _query.isNotEmpty ||
                                        _group != _WoGroup.all ||
                                        _priority != null
                                    ? 'Nenhuma OS corresponde aos filtros selecionados.'
                                    : 'Voce ainda nao possui ordens atribuidas.',
                              ),
                            if (others != null)
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  16,
                                  0,
                                  16,
                                  16,
                                ),
                                child: others,
                              ),
                          ],
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                          itemCount: filtered.length + (others == null ? 0 : 1),
                          itemBuilder: (context, i) {
                            if (i == filtered.length) return others!;
                            final wo = filtered[i];
                            return MobileOsCard(
                              key: ValueKey(wo.localId),
                              code: wo.code,
                              title: wo.title,
                              customerLine: wo.customerName,
                              accentColor: _accentForTone(
                                wo.priority.statusTone,
                              ),
                              priorityLabel: wo.priority.label,
                              priorityTone: pillToneFromStatus(
                                wo.priority.statusTone,
                              ),
                              statusLabel: wo.status.label,
                              statusTone: pillToneFromStatus(
                                wo.status.statusTone,
                              ),
                              address: wo.serviceAddress,
                              time: wo.scheduledAt != null
                                  ? _fmtDate(wo.scheduledAt!)
                                  : null,
                              vehicleLabel: wo.serviceType?.label,
                              pendingChips: _pendingChips(wo.syncStatus),
                              onTap: () =>
                                  context.go('/work-orders/${wo.localId}'),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // ── "Outros pátios": a seção ──────────────────────────────────────────────

  /// A seção, ou `null` quando a pessoa não tem outro pátio (nada a mostrar).
  Widget? _buildOthers(BootstrapSession? boot, bool offline) {
    if (_otherTenants(boot).isEmpty) return null;
    final blocks = _others;
    final activeName = boot?.activeTenant.displayName ?? '';
    final loadingFirst = blocks == null && !offline;
    // Todos os outros pátios recusaram a escuta (403): a seção sai.
    if (blocks != null && blocks.isEmpty && !offline) return null;
    final failure = _switchFailure;
    return Column(
      key: const Key('outros-patios'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const MobileSectionLabel(
          'Outros pátios',
          padding: EdgeInsets.only(top: 8, bottom: 8),
        ),
        if (offline) ...[
          const MobileNoticeBanner(
            key: Key('outros-sem-conexao'),
            icon: Icons.wifi_off,
            message: kOtherPatiosOfflineMessage,
            tone: PillTone.warning,
          ),
          const SizedBox(height: 10),
        ],
        if (failure != null) ...[
          Semantics(
            liveRegion: true,
            container: true,
            child: MobileNoticeBanner(
              key: const Key('outros-troca-recusada'),
              icon: Icons.block,
              message:
                  'Não foi possível entrar em ${failure.$1}. ${failure.$2} '
                  'Você continua em $activeName, sem nada perdido.',
              tone: PillTone.danger,
            ),
          ),
          const SizedBox(height: 10),
        ],
        if (_switchingTo != null) ...[
          _OtherPatioSwitching(target: _switchingTo!, current: activeName),
          const SizedBox(height: 10),
        ],
        if (loadingFirst || (_othersLoading && (blocks ?? const []).isEmpty))
          const _OtherPatiosLoading()
        else
          for (final (index, block)
              in (blocks ?? const <OtherPatioBlock>[]).indexed)
            _otherBlock(block, index + 1, activeName),
      ],
    );
  }

  Widget _otherBlock(OtherPatioBlock block, int index, String activeName) {
    final id = block.tenantId;
    final pending = _othersPending[id] ?? 0;
    final enabled = _switchingTo == null;
    void open([WorkOrder? order]) =>
        _openOther(block, order: order, activeName: activeName);
    final count = block.orders.length;
    final summary = switch (block.state) {
      OtherPatioState.failed => 'Chamados indisponíveis agora',
      _ when count == 0 => 'Nenhum chamado aberto',
      _ => count == 1 ? '1 chamado aberto' : '$count chamados abertos',
    };
    return Column(
      key: Key('outros-bloco-$id'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          margin: const EdgeInsets.only(bottom: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: ErpMobileTheme.cardBorder),
          ),
          clipBehavior: Clip.antiAlias,
          child: Semantics(
            button: true,
            label: 'Entrar em ${block.tenantName}',
            excludeSemantics: true,
            child: InkWell(
              key: Key('outros-abrir-$id'),
              onTap: enabled ? open : null,
              child: ConstrainedBox(
                constraints: const BoxConstraints(minHeight: 56),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(12, 10, 8, 10),
                  child: Row(
                    children: [
                      OrganizationAvatar(
                        name: block.tenantName,
                        index: index,
                        size: 34,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              block.tenantName,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.w800,
                                color: ErpMobileTheme.ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              summary,
                              style: const TextStyle(
                                fontSize: 12,
                                color: ErpMobileTheme.inkMuted,
                              ),
                            ),
                            if (pending > 0 ||
                                block.state == OtherPatioState.stale) ...[
                              const SizedBox(height: 6),
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: [
                                  if (pending > 0)
                                    MobilePill(
                                      key: Key('outros-pendentes-$id'),
                                      label: otherPatiosPendingLabel(pending),
                                      tone: PillTone.warning,
                                    ),
                                  if (block.state == OtherPatioState.stale)
                                    MobilePill(
                                      key: Key('outros-sem-atualizacao-$id'),
                                      label: 'Sem atualização agora',
                                      tone: PillTone.neutral,
                                    ),
                                ],
                              ),
                            ],
                          ],
                        ),
                      ),
                      const Icon(
                        Icons.chevron_right,
                        color: ErpMobileTheme.inkFaint,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
        if (block.state == OtherPatioState.failed)
          _OtherPatioFailed(
            key: Key('outros-erro-$id'),
            onRetry: enabled ? _loadOthers : null,
          )
        else if (count == 0)
          Padding(
            key: Key('outros-vazio-$id'),
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 12),
            child: Text(
              'Nenhum chamado aberto em ${block.tenantName} para você.',
              style: const TextStyle(
                fontSize: 12.5,
                color: ErpMobileTheme.inkMuted,
              ),
            ),
          )
        else
          for (final wo in block.orders)
            MobileOsCard(
              key: ValueKey('outros-os-$id-${wo.serverId ?? wo.localId}'),
              code: wo.code,
              title: wo.title,
              customerLine: wo.customerName.isEmpty
                  ? block.tenantName
                  : wo.customerName,
              accentColor: _accentForTone(wo.priority.statusTone),
              priorityLabel: wo.priority.label,
              priorityTone: pillToneFromStatus(wo.priority.statusTone),
              statusLabel: wo.status.label,
              statusTone: pillToneFromStatus(wo.status.statusTone),
              address: wo.serviceAddress.isEmpty ? null : wo.serviceAddress,
              time: wo.scheduledAt != null ? _fmtDate(wo.scheduledAt!) : null,
              vehicleLabel: wo.serviceType?.label,
              pendingChips: [(block.tenantName, PillTone.purple)],
              onTap: enabled ? () => open(wo) : null,
            ),
      ],
    );
  }

  List<WorkOrder> _applyFilters(List<WorkOrder> orders) {
    return orders.where((o) {
      if (!_group.matches(o.status)) return false;
      if (_priority != null && o.priority != _priority) return false;
      if (_query.isNotEmpty) {
        final q = _query.toLowerCase();
        if (!o.code.toLowerCase().contains(q) &&
            !o.title.toLowerCase().contains(q) &&
            !o.customerName.toLowerCase().contains(q) &&
            !o.serviceAddress.toLowerCase().contains(q)) {
          return false;
        }
      }
      return true;
    }).toList();
  }

  List<(String, PillTone)> _pendingChips(SyncStatus status) {
    return switch (status) {
      SyncStatus.pending => const [('Sync pendente', PillTone.scheduled)],
      SyncStatus.failed => const [('Falha sync', PillTone.danger)],
      SyncStatus.conflict => const [('Conflito', PillTone.danger)],
      _ => const <(String, PillTone)>[],
    };
  }

  Color _accentForTone(String tone) => switch (tone) {
    'danger' => ErpMobileTheme.danger,
    'warning' => ErpMobileTheme.warning,
    'success' => ErpMobileTheme.success,
    'info' => ErpMobileTheme.info,
    _ => ErpMobileTheme.inkFaint,
  };

  String _fmtDate(DateTime dt) =>
      '${dt.day.toString().padLeft(2, '0')}/'
      '${dt.month.toString().padLeft(2, '0')} '
      '${dt.hour.toString().padLeft(2, '0')}:'
      '${dt.minute.toString().padLeft(2, '0')}';
}

// ---------------------------------------------------------------------------
// Header branco com título bold (os-lista.png)
// ---------------------------------------------------------------------------

class _ListHeader extends StatelessWidget {
  const _ListHeader();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Colors.white,
      width: double.infinity,
      padding: EdgeInsets.fromLTRB(
        16,
        MediaQuery.of(context).padding.top + 14,
        16,
        12,
      ),
      child: const Text(
        'Ordens de Servico',
        style: TextStyle(
          fontSize: 20,
          fontWeight: FontWeight.w800,
          color: ErpMobileTheme.ink,
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Chip de filtro (ativo azul sólido, como no protótipo)
// ---------------------------------------------------------------------------

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.active,
    required this.onTap,
  });

  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(99),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        decoration: BoxDecoration(
          color: active ? ErpMobileTheme.primary : Colors.white,
          borderRadius: BorderRadius.circular(99),
          border: Border.all(
            color: active ? ErpMobileTheme.primary : ErpMobileTheme.cardBorder,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12.5,
            fontWeight: active ? FontWeight.w700 : FontWeight.w600,
            color: active ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Pull state banners (tokens do protótipo)
// ---------------------------------------------------------------------------

class _PullErrorBanner extends StatelessWidget {
  const _PullErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.all(11),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            size: 18,
            color: ErpMobileTheme.danger,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(fontSize: 12.5, color: Color(0xFF991B1B)),
            ),
          ),
          TextButton(onPressed: onRetry, child: const Text('Tentar novamente')),
        ],
      ),
    );
  }
}

class _LastUpdatedBanner extends StatelessWidget {
  const _LastUpdatedBanner({required this.at});

  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final h = at.toLocal().hour.toString().padLeft(2, '0');
    final m = at.toLocal().minute.toString().padLeft(2, '0');
    return Container(
      width: double.infinity,
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      child: Row(
        children: [
          const Icon(
            Icons.sync_outlined,
            size: 14,
            color: ErpMobileTheme.success,
          ),
          const SizedBox(width: 6),
          Text(
            'Atualizado as $h:$m',
            style: const TextStyle(
              fontSize: 11,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
        ],
      ),
    );
  }
}

class _LocalCacheBanner extends StatelessWidget {
  const _LocalCacheBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      margin: const EdgeInsets.fromLTRB(16, 10, 16, 0),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: const Color(0xFFEFF6FF),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFBFDBFE)),
      ),
      child: const Row(
        children: [
          Icon(Icons.storage_outlined, size: 14, color: ErpMobileTheme.info),
          SizedBox(width: 6),
          Text(
            'Mostrando dados salvos neste aparelho.',
            style: TextStyle(fontSize: 11.5, color: Color(0xFF1E40AF)),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// B-APP-ORG-2 (A2) — peças da seção "Outros pátios" (tokens do kit; o cartão
// branco de borda fina é o mesmo do `MobileOsCard`)
// ---------------------------------------------------------------------------

class _OtherPatiosLoading extends StatelessWidget {
  const _OtherPatiosLoading();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Carregando os chamados dos outros pátios',
      excludeSemantics: true,
      child: Container(
        key: const Key('outros-carregando'),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ErpMobileTheme.cardBorder),
        ),
        child: const Row(
          children: [
            SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            SizedBox(width: 10),
            Expanded(
              child: Text(
                'Buscando os chamados dos outros pátios…',
                style: TextStyle(
                  fontSize: 12.5,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OtherPatioFailed extends StatelessWidget {
  const _OtherPatioFailed({required this.onRetry, super.key});

  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.fromLTRB(11, 4, 4, 4),
      decoration: BoxDecoration(
        color: const Color(0xFFFEF2F2),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFFECACA)),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.cloud_off_outlined,
            size: 18,
            color: ErpMobileTheme.danger,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Não foi possível carregar os chamados deste pátio agora.',
              style: TextStyle(fontSize: 12.5, color: Color(0xFF991B1B)),
            ),
          ),
          ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 44),
            child: TextButton(
              onPressed: onRetry,
              child: const Text('Tentar novamente'),
            ),
          ),
        ],
      ),
    );
  }
}

class _OtherPatioSwitching extends StatelessWidget {
  const _OtherPatioSwitching({required this.target, required this.current});

  final String target;
  final String current;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      liveRegion: true,
      container: true,
      child: Container(
        key: const Key('outros-entrando'),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(14),
          border: Border.all(color: ErpMobileTheme.cardBorder),
        ),
        child: Row(
          children: [
            const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Entrando em $target',
                    style: const TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      color: ErpMobileTheme.ink,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    current.isEmpty
                        ? 'Conferindo o seu acesso.'
                        : 'Conferindo o seu acesso. O que é de $current '
                              'continua guardado neste aparelho.',
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: ErpMobileTheme.inkMuted,
                    ),
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
