import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/appearance/app_appearance.dart';
import '../../../core/appearance/app_appearance_providers.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/network/connectivity_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../core/sync/sync_providers.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../../checklists/ui/checklist_navigation.dart';
import '../../prestador/domain/prestador_flow.dart';
import '../data/work_order_conflict_resolution_service.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';
import 'aparencias/detalhe_os_shared.dart';
import 'aparencias/detalhe_os_view_a.dart';
import 'aparencias/detalhe_os_view_b.dart';
import 'aparencias/detalhe_os_view_c.dart';
import 'checkin_confirm_dialog.dart';
import 'registry_assignment_section.dart';
import 'work_order_operational_map_screen.dart';

// B-GUI-FID1 — os diálogos do check-in moram em `checkin_confirm_dialog.dart`; quem importava daqui continua importando.
export 'checkin_confirm_dialog.dart'
    show
        ArrivalConfirmation,
        readGpsAvailability,
        showArrivalConfirmationDialog,
        showUnableToStartSheet;

/// B-GUI-FID1 — o detalhe da OS, fiel ao desenho aprovado (`os-detalhe.png`), nas 3 aparências da maquete
/// `os-detalhe-app-3opcoes.reference.html` (chave [kDetalheOsAppearanceKey]).
///
/// A tela decide (permissão, ação, o que aparece); as vistas em `aparencias/` só desenham. O check-in ("Iniciar rota",
/// "Cheguei ao local" com a placa) mora agora na execução: "Iniciar atendimento" abre a execução no passo "Início",
/// sem mudar a situação da OS.
class WorkOrderDetailScreen extends ConsumerStatefulWidget {
  const WorkOrderDetailScreen({
    required this.workOrderId,
    this.clock,
    super.key,
  });

  final String workOrderId;

  /// O relógio do prazo restante; os testes fixam.
  final DateTime Function()? clock;

  @override
  ConsumerState<WorkOrderDetailScreen> createState() =>
      _WorkOrderDetailScreenState();
}

class _WorkOrderDetailScreenState extends ConsumerState<WorkOrderDetailScreen> {
  Future<void>? _load;
  int? _repoKey;
  Future<List<WorkOrderTimelineEvent>>? _historico;
  Future<_VistoriaResumo?>? _vistoria;
  String? _vistoriaDe;

  void _back() => context.go('/work-orders');

  Future<void> _ensureLoad(WorkOrderRepository repo) {
    final key = identityHashCode(repo);
    if (_load == null || _repoKey != key) {
      _repoKey = key;
      _load = repo.load();
      _historico = null;
      _vistoria = null;
      _vistoriaDe = null;
    }
    return _load!;
  }

  Future<_VistoriaResumo?> _loadVistoria(
    String checklistId,
    String woId,
  ) async {
    try {
      final repo = ref.read(checklistRepositoryProvider);
      final runs = await repo.getRunsForWorkOrder(woId);
      final schema = await repo.getCachedSchema(checklistId);
      return _VistoriaResumo(
        title: schema?.title ?? 'Vistoria da OS',
        complete: runs.any(
          (r) => r.status == MobileChecklistRunStatus.completed,
        ),
        started: runs.any(
          (r) => r.status == MobileChecklistRunStatus.inProgress,
        ),
      );
    } catch (_) {
      return const _VistoriaResumo(
        title: 'Vistoria da OS',
        complete: false,
        started: false,
      );
    }
  }

  Future<void> _unableToStart(WorkOrder wo) => showUnableToStartSheet(
    context,
    onSubmit: (reason, note) async {
      final repo = ref.read(workOrderRepositoryProvider);
      await repo.reportUnableToStart(
        localId: wo.localId,
        reason: reason,
        note: note,
      );
      if (!mounted) return;
      context.go('/work-orders');
    },
  );

  @override
  Widget build(BuildContext context) {
    final sessionAsync = ref.watch(bootstrapSessionProvider);
    final session = sessionAsync.maybeWhen(data: (v) => v, orElse: () => null);
    final repo = ref.watch(workOrderRepositoryProvider);
    final appearanceAsync = ref.watch(
      screenAppearanceProvider(kDetalheOsAppearanceKey),
    );

    if (session == null && sessionAsync.isLoading) {
      return _Esqueleto(onBack: _back);
    }

    final canRead = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:read',
          );

    if (!canRead) {
      return ErpScaffold(
        showAppBar: false,
        body: Column(
          children: [
            MobileScreenHeader(title: 'Detalhe da OS', onBack: _back),
            const Expanded(
              child: PermissionBlockedState(
                title: 'Acesso não permitido',
                message:
                    'Seu perfil não tem permissão para ver esta OS. Fale com o administrador da sua organização.',
              ),
            ),
          ],
        ),
      );
    }

    // A aparência escolhida; carregando, o esqueleto (nunca a A antes da B); erro, a A.
    if (appearanceAsync.asData == null && appearanceAsync.isLoading) {
      return _Esqueleto(onBack: _back);
    }
    final appearance = appearanceAsync.asData?.value ?? AppAppearance.a;

    final permissions = session.permissions;
    const resolver = PermissionResolver();
    final canStatus = resolver.has(permissions, 'work_orders:status');
    final canApproval = resolver.has(permissions, 'work_orders:update');
    final canAssign = resolver.has(permissions, 'work_orders:assign');
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;

    return FutureBuilder<void>(
      future: _ensureLoad(repo),
      builder: (context, loadSnapshot) => ListenableBuilder(
        listenable: repo,
        builder: (context, _) {
          final wo = repo.findById(widget.workOrderId);
          if (wo == null) {
            if (loadSnapshot.connectionState != ConnectionState.done) {
              return _Esqueleto(onBack: _back);
            }
            return ErpScaffold(
              showAppBar: false,
              body: Column(
                children: [
                  MobileScreenHeader(title: 'Detalhe da OS', onBack: _back),
                  Expanded(
                    child: EmptyState(
                      key: const Key('detalhe-os-erro'),
                      icon: Icons.error_outline,
                      title: 'Não foi possível carregar',
                      message:
                          'Esta OS não está no aparelho. Volte à lista e atualize.',
                      action: OutlinedButton.icon(
                        onPressed: _back,
                        icon: const Icon(Icons.arrow_back),
                        label: const Text('Voltar para a lista'),
                      ),
                    ),
                  ),
                ],
              ),
            );
          }

          _historico ??= repo.loadTimeline(wo.localId);
          final checklistId = wo.checklistId;
          if (checklistId != null && _vistoriaDe != checklistId) {
            _vistoriaDe = checklistId;
            _vistoria = _loadVistoria(checklistId, wo.localId);
          }

          return FutureBuilder<List<WorkOrderTimelineEvent>>(
            future: _historico,
            builder: (context, hist) => FutureBuilder<_VistoriaResumo?>(
              future: checklistId == null ? null : _vistoria,
              builder: (context, vist) {
                final props = _props(
                  wo: wo,
                  repo: repo,
                  offline: offline,
                  canStatus: canStatus,
                  canApproval: canApproval,
                  canAssign: canAssign,
                  historico: hist.connectionState == ConnectionState.done
                      ? (hist.data ?? const <WorkOrderTimelineEvent>[])
                      : null,
                  vistoria: vist.data,
                );
                return switch (appearance) {
                  AppAppearance.a => DetalheOsViewA(props: props),
                  AppAppearance.b => DetalheOsViewB(props: props),
                  AppAppearance.c => DetalheOsViewC(props: props),
                };
              },
            ),
          );
        },
      ),
    );
  }

  DetalheOsViewProps _props({
    required WorkOrder wo,
    required WorkOrderRepository repo,
    required bool offline,
    required bool canStatus,
    required bool canApproval,
    required bool canAssign,
    required List<WorkOrderTimelineEvent>? historico,
    required _VistoriaResumo? vistoria,
  }) {
    final status = wo.status;
    final isFinal = status.isFinal;
    final acao = isFinal
        ? DetalheOsAcao.verHistorico
        : !canStatus
        ? DetalheOsAcao.nenhuma
        // No local, o atendimento ainda não começou: "Iniciar atendimento" também (abre a execução no passo "Coleta").
        : (status == WorkOrderStatus.scheduled ||
              status == WorkOrderStatus.dispatched ||
              status == WorkOrderStatus.arrived)
        ? DetalheOsAcao.iniciar
        : DetalheOsAcao.continuar;
    final execute = '/work-orders/${wo.localId}/execute';
    final checklistId = wo.checklistId;
    final session = ref.read(bootstrapSessionProvider).asData?.value;
    return DetalheOsViewProps(
      wo: wo,
      now: (widget.clock ?? DateTime.now)(),
      // O B-GUI-D1 traz o veículo atendido e o prazo; hoje o app não os recebe, e os cartões somem (F2).
      vehicle: null,
      slaDueAt: null,
      offline: offline,
      pendingSync: wo.syncStatus == SyncStatus.pending,
      stale:
          !offline &&
          !repo.isPulling &&
          (repo.lastPullError != null || repo.lastPullIncomplete),
      onRefresh: () => repo.refresh(),
      conflictPanel: wo.syncStatus == SyncStatus.conflict
          ? Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SyncStatusBanner(
                  status: SyncStatus.conflict,
                  message:
                      'Conflito ao enviar esta OS. Os dados do aparelho foram preservados.',
                ),
                const SizedBox(height: 8),
                WorkOrderConflictResolutionPanel(
                  workOrder: wo,
                  repository: repo,
                ),
              ],
            )
          : null,
      onBack: _back,
      onMap: () => context.push('/field-map?workOrderId=${wo.localId}'),
      acao: acao,
      onAcao: switch (acao) {
        DetalheOsAcao.iniciar ||
        DetalheOsAcao.continuar => () => context.go(execute),
        _ => null,
      },
      onUnableToStart: canStatus && status == WorkOrderStatus.enRoute
          ? () => _unableToStart(wo)
          : null,
      onServiceDoor: !isFinal && canStatus && showsProviderServiceDoor(wo)
          ? () => context.go('/work-orders/${wo.localId}/service')
          : null,
      onApprovalRequest: !isFinal && canApproval
          ? () => context.go('/work-orders/${wo.localId}/approval-request')
          : null,
      vistoria: DetalheOsVistoria(
        title: checklistId == null
            ? 'Abrir as vistorias da OS'
            : (vistoria?.title ?? 'Vistoria da OS'),
        statusLabel: checklistId == null
            ? null
            : vistoria == null
            ? 'Carregando'
            : vistoria.complete
            ? 'Concluída'
            : vistoria.started
            ? 'Em andamento'
            : 'Não iniciada',
        tone: vistoria?.complete == true
            ? PillTone.done
            : vistoria?.started == true
            ? PillTone.warning
            : PillTone.info,
        // B-SAN3-14 (P4) — a coleta, explícita, pelo helper; sem vistoria vinculada, a lista de vistorias da OS.
        onOpen: () => context.push(
          checklistId == null
              ? '/work-orders/${wo.localId}/checklists'
              : checklistRunLocation(
                  checklistId: checklistId,
                  workOrderId: wo.localId,
                  kind: MobileChecklistRunKind.collection,
                ),
        ),
      ),
      historico: historico,
      localizacao: session == null
          ? const SizedBox.shrink()
          : OperationalLocationCard(session: session, workOrder: wo),
      atribuicao: canAssign
          ? RegistryAssignmentSection(workOrder: wo, canAssign: canAssign)
          : null,
    );
  }
}

class _VistoriaResumo {
  const _VistoriaResumo({
    required this.title,
    required this.complete,
    required this.started,
  });

  final String title;
  final bool complete;
  final bool started;
}

/// O carregamento (§7): o esqueleto do bloco branco e dos cartões.
class _Esqueleto extends StatelessWidget {
  const _Esqueleto({required this.onBack});

  final VoidCallback onBack;

  @override
  Widget build(BuildContext context) {
    Widget caixa(double h, {double? w, double r = 8}) => Container(
      width: w,
      height: h,
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: ErpMobileTheme.cardBorder,
        borderRadius: BorderRadius.circular(r),
      ),
    );
    return ErpScaffold(
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: 'Detalhe da OS',
            subtitle: 'Somente leitura',
            onBack: onBack,
          ),
          Expanded(
            child: Semantics(
              key: const Key('detalhe-os-carregando'),
              label: 'Carregando a OS',
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Align(
                    alignment: Alignment.centerLeft,
                    child: caixa(16, w: 84),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: caixa(24, w: 190, r: 99),
                  ),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: caixa(20, w: 150),
                  ),
                  caixa(76, r: 14),
                  caixa(150, r: 14),
                  caixa(58, r: 12),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// O cartão de conflito (o de hoje, com as 3 saídas; B-SAN3-26: "Chegada não confirmada")
// ---------------------------------------------------------------------------

class WorkOrderConflictResolutionPanel extends ConsumerStatefulWidget {
  const WorkOrderConflictResolutionPanel({
    required this.workOrder,
    required this.repository,
    super.key,
  });

  final WorkOrder workOrder;
  final WorkOrderRepository repository;

  @override
  ConsumerState<WorkOrderConflictResolutionPanel> createState() =>
      _WorkOrderConflictResolutionPanelState();
}

class _WorkOrderConflictResolutionPanelState
    extends ConsumerState<WorkOrderConflictResolutionPanel> {
  bool _resolving = false;

  @override
  Widget build(BuildContext context) {
    final service = ref.watch(workOrderConflictResolutionServiceProvider);
    return FutureBuilder<List<SyncAction>>(
      future: service.conflictsForWorkOrder(
        tenantId: widget.workOrder.tenantId,
        localId: widget.workOrder.localId,
      ),
      builder: (context, snapshot) {
        final conflicts = snapshot.data ?? const <SyncAction>[];
        // B-SAN3-26 (C26-02, N-02) — chegada recusada pela placa: o cartão mostra o motivo e UMA saída.
        final checkinRedo = conflicts.any(isCheckinRefusalAction);
        if (checkinRedo) return _checkinRedoCard(context, service, conflicts);
        final safeMessage = _firstSafeMessage(conflicts);
        final canAcceptServer = conflicts.any(_hasRemoteReference);

        return Card(
          key: const Key('work-order-conflict-resolution-card'),
          color: Theme.of(context).colorScheme.errorContainer,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  children: [
                    const Icon(Icons.warning_amber_outlined),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Resolução manual de conflito',
                        style: Theme.of(context).textTheme.titleSmall,
                      ),
                    ),
                    const OperationalStatusChip(
                      label: 'Conflito',
                      status: 'danger',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  'Situação no aparelho: ${detalheOsSituacao(widget.workOrder.status)}',
                ),
                Text(safeMessage ?? 'O servidor retornou um conflito seguro.'),
                const SizedBox(height: 12),
                FilledButton.icon(
                  key: const Key('work-order-conflict-keep-local'),
                  onPressed: _resolving
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.keepLocalAndRetry,
                        ),
                  icon: const Icon(Icons.refresh),
                  label: const Text('Manter local e tentar novamente'),
                ),
                const SizedBox(height: 8),
                OutlinedButton.icon(
                  key: const Key('work-order-conflict-accept-server'),
                  onPressed: _resolving || !canAcceptServer
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.acceptServer,
                        ),
                  icon: const Icon(Icons.cloud_download_outlined),
                  label: const Text('Aceitar estado do servidor'),
                ),
                const SizedBox(height: 8),
                TextButton.icon(
                  key: const Key('work-order-conflict-manual-review'),
                  onPressed: _resolving
                      ? null
                      : () => _resolve(
                          service,
                          WorkOrderConflictResolution.manualReview,
                        ),
                  icon: const Icon(Icons.fact_check_outlined),
                  label: const Text('Marcar para revisão manual'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _checkinRedoCard(
    BuildContext context,
    WorkOrderConflictResolutionService service,
    List<SyncAction> conflicts,
  ) {
    final refused = conflicts.firstWhere(isCheckinRefusalAction);
    return Card(
      key: const Key('work-order-checkin-redo-card'),
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.warning_amber_outlined),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Chegada não confirmada',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                const OperationalStatusChip(
                  label: 'Conflito',
                  status: 'danger',
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              checkinRefusalMessage(refused.lastErrorCode),
              key: const Key('work-order-checkin-redo-reason'),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              key: const Key('work-order-checkin-redo'),
              onPressed: _resolving ? null : () => _redoCheckin(service),
              icon: const Icon(Icons.pin_outlined),
              label: const Text('Confirmar a placa de novo'),
            ),
          ],
        ),
      ),
    );
  }

  /// B-SAN3-26 — desfaz a chegada recusada e reabre o diálogo da placa. O GPS é lido e o diálogo é aberto ANTES de o
  /// repositório recarregar: ao recarregar, a OS deixa de estar em conflito e este cartão sai da tela.
  Future<void> _redoCheckin(WorkOrderConflictResolutionService service) async {
    final repository = widget.repository;
    final gps = readGpsAvailability(ref);
    setState(() => _resolving = true);
    try {
      final restored = await service.undoRefusedCheckin(
        tenantId: widget.workOrder.tenantId,
        localId: widget.workOrder.localId,
      );
      final gpsOk = await gps;
      if (restored == null || !mounted) {
        await repository.refreshLocalState();
        return;
      }
      final dialog = showArrivalConfirmationDialog(
        context,
        restored,
        gpsOk: gpsOk,
      );
      await repository.refreshLocalState();
      final confirmation = await dialog;
      if (confirmation == null) return;
      await repository.updateStatus(
        restored.localId,
        WorkOrderStatus.arrived,
        lastDigits: confirmation.lastDigits,
      );
    } on StateError catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message.toString())));
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }

  bool _hasRemoteReference(SyncAction action) {
    for (final key in const ['result_ref', 'server_id', 'work_order_id']) {
      final value = action.payload[key];
      if (value is String &&
          value.trim().isNotEmpty &&
          !value.toLowerCase().startsWith('wo-local-')) {
        return true;
      }
    }
    return false;
  }

  String? _firstSafeMessage(List<SyncAction> conflicts) {
    for (final action in conflicts) {
      final message = action.lastSafeError;
      if (message != null && message.trim().isNotEmpty) return message;
    }
    return null;
  }

  Future<void> _resolve(
    WorkOrderConflictResolutionService service,
    WorkOrderConflictResolution resolution,
  ) async {
    setState(() => _resolving = true);
    try {
      await service.resolve(
        tenantId: widget.workOrder.tenantId,
        localId: widget.workOrder.localId,
        resolution: resolution,
      );
      await widget.repository.refreshLocalState();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Decisão de conflito registrada.')),
      );
    } on StateError catch (error) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.message.toString())));
    } finally {
      if (mounted) setState(() => _resolving = false);
    }
  }
}
