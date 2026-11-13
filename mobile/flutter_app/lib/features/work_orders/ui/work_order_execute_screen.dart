import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/evidence/evidence_picker.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/connectivity_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../core/sync/sync_models.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../checklists/data/checklist_repository.dart';
import '../../checklists/domain/checklist_models.dart';
import '../../checklists/ui/checklist_navigation.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_models.dart';
import '../domain/work_order_steps.dart';
import 'work_order_operational_map_screen.dart';
import 'work_order_stepper.dart';

// ---------------------------------------------------------------------------
// Data container for OS + checklist runs
// ---------------------------------------------------------------------------

/// B-SAN3-14 — a pré-carga das vistorias ao abrir a tela. Ela corre AO LADO da
/// leitura local (J-546, C3-F8): a tela abre com o que está no aparelho, e a
/// resposta do servidor chega depois.
enum _Refresh {
  /// O aparelho está perguntando ao servidor.
  checking,

  /// O servidor respondeu.
  done,

  /// Sem conexão: a rede estava fora ou a pergunta não saiu do aparelho.
  offline,

  /// Com conexão, a pergunta falhou (tempo esgotado, recusa): estado 10.
  failed,
}

class _ExecData {
  const _ExecData({
    required this.wo,
    required this.runs,
    required this.evidences,
    this.schemas = const {},
    this.queuedRunIds = const {},
    this.refresh = _Refresh.done,
  });

  final WorkOrder wo;
  final List<MobileChecklistRun> runs;
  final List<WorkOrderEvidence> evidences;

  /// C3-F1 — os modelos em cache no aparelho, por checklistId: o nome e os
  /// campos obrigatórios do subtítulo de cada cartão.
  final Map<String, MobileChecklistSchema> schemas;

  /// C3-F2 — as execuções com ação de vistoria ainda na fila do aparelho.
  final Set<String> queuedRunIds;

  final _Refresh refresh;

  bool get checking => refresh == _Refresh.checking;

  /// A pré-carga falhou COM conexão: os dados podem estar desatualizados.
  bool get refreshFailed => refresh == _Refresh.failed;

  /// O servidor não confirmou as vistorias (sem sinal ou falha).
  bool get deliveryUnverified =>
      refresh == _Refresh.offline || refresh == _Refresh.failed;

  bool isQueued(MobileChecklistRun? run) =>
      run != null && queuedRunIds.contains(run.localId);

  bool get hasQueuedTowRuns =>
      isTow && (isQueued(collectionRun) || isQueued(confirmedDelivery));

  /// Estado 8 da opção A: a entrega local que o servidor ainda não liberou
  /// tem "Atualizar" (depois de o servidor responder).
  bool get canRefreshAwaiting =>
      deliveryRun != null && refresh == _Refresh.done;

  bool get isTow => wo.serviceType == WorkOrderServiceType.tow;

  bool get isChecklistComplete =>
      runs.any((r) => r.status == MobileChecklistRunStatus.completed);

  bool get isChecklistStarted =>
      runs.any((r) => r.status == MobileChecklistRunStatus.inProgress);

  // B-SAN3-14 — as duas fases. Entre runs da mesma fase, vale a primeira
  // com serverId (R-R2-02(iv)).
  MobileChecklistRun? _pick(MobileChecklistRunKind kind) {
    final ofKind = runs.where((r) => r.kind == kind);
    return ofKind.where(_hasServerRunId).firstOrNull ?? ofKind.firstOrNull;
  }

  MobileChecklistRun? get collectionRun =>
      _pick(MobileChecklistRunKind.collection);

  MobileChecklistRun? get deliveryRun => _pick(MobileChecklistRunKind.delivery);

  /// R-R2-02(ii) — só a entrega que o SERVIDOR confirmou (com serverId)
  /// exige, trava, acende passo e libera a comparação.
  MobileChecklistRun? get confirmedDelivery =>
      _hasServerRunId(deliveryRun) ? deliveryRun : null;

  bool get isCollectionComplete => runs.any(
    (r) =>
        r.kind == MobileChecklistRunKind.collection &&
        r.status == MobileChecklistRunStatus.completed,
  );

  bool get isDeliveryComplete =>
      confirmedDelivery?.status == MobileChecklistRunStatus.completed;

  // P5 + Pergunta 2 (a): a entrega só é exigida quando existe.
  bool get deliveryRequired => confirmedDelivery != null;

  bool get deliveryGateOpen => !deliveryRequired || isDeliveryComplete;

  bool get canConclude =>
      wo.checklistId == null || (isCollectionComplete && deliveryGateOpen);

  // R-D1 — a comparação usa UM schema: só com as duas do mesmo modelo.
  bool get bothPhasesKnown =>
      collectionRun != null && confirmedDelivery != null;

  bool get sameModel =>
      collectionRun?.checklistId == confirmedDelivery?.checklistId;

  bool get canCompare => bothPhasesKnown && sameModel;

  bool get _deliveryStarted {
    final delivery = confirmedDelivery;
    if (delivery == null) return false;
    return _hasAnswers(delivery) ||
        delivery.status == MobileChecklistRunStatus.completed;
  }

  // P3 — a perna do guincho, função pura das vistorias confirmadas.
  TowLeg get towLeg => isTow
      ? deriveTowLeg(
          deliveryConfirmed: confirmedDelivery != null,
          collectionComplete: isCollectionComplete,
          deliveryStarted: _deliveryStarted,
        )
      : TowLeg.none;
}

bool _hasServerRunId(MobileChecklistRun? run) =>
    (run?.serverId?.trim() ?? '').isNotEmpty;

// R-A5 — a run pré-carregada sem resposta é "não iniciada", não "em andamento".
bool _hasAnswers(MobileChecklistRun r) => r.answers.isNotEmpty;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class WorkOrderExecuteScreen extends ConsumerStatefulWidget {
  const WorkOrderExecuteScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderExecuteScreen> createState() =>
      _WorkOrderExecuteScreenState();
}

class _WorkOrderExecuteScreenState
    extends ConsumerState<WorkOrderExecuteScreen> {
  bool _isLoading = false;
  String? _safeError;
  Future<_ExecData>? _dataFuture;
  int? _repoKey;

  // B-SAN3-14 (R-A5; J-546, C3-F8) — a pré-carga roda uma vez ao abrir a tela,
  // e de novo em "Atualizar" ou quando o sinal volta. Ela nunca segura a
  // leitura do aparelho: quando responde, a tela relê o aparelho.
  _Refresh _refresh = _Refresh.done;
  bool _refreshStarted = false;
  int _refreshRound = 0;

  Future<_ExecData> _ensureFuture(
    WorkOrderRepository woRepo,
    ChecklistRepository clRepo,
  ) {
    final key = identityHashCode(woRepo) ^ identityHashCode(clRepo);
    if (_dataFuture == null || _repoKey != key) {
      if (_repoKey != key) _refreshStarted = false;
      _repoKey = key;
      _dataFuture = _loadData(woRepo, clRepo);
    }
    return _dataFuture!;
  }

  Future<_ExecData> _loadData(
    WorkOrderRepository woRepo,
    ChecklistRepository clRepo,
  ) async {
    await woRepo.load();
    final wo = woRepo.findById(widget.workOrderId);
    if (wo == null) throw StateError('Ordem de serviço não encontrada.');
    final towWithChecklist =
        wo.checklistId != null && wo.serviceType == WorkOrderServiceType.tow;
    if (towWithChecklist && !_refreshStarted) {
      _refreshStarted = true;
      _startRefresh(clRepo, wo);
    }
    final runs = wo.checklistId != null
        ? await clRepo.getRunsForWorkOrder(widget.workOrderId)
        : <MobileChecklistRun>[];
    final evidences = await woRepo.loadEvidence(widget.workOrderId);
    final schemas = <String, MobileChecklistSchema>{};
    var queued = const <String>{};
    if (towWithChecklist) {
      for (final id in {wo.checklistId!, for (final r in runs) r.checklistId}) {
        final schema = await clRepo.getCachedSchema(id);
        if (schema != null) schemas[id] = schema;
      }
      queued = await clRepo.localRunIdsWithPendingActions(widget.workOrderId);
    }
    return _ExecData(
      wo: wo,
      runs: runs,
      evidences: evidences,
      schemas: schemas,
      queuedRunIds: queued,
      refresh: towWithChecklist ? _refresh : _Refresh.done,
    );
  }

  // Sem conexão conhecida, nem pergunta; com conexão, pergunta em segundo
  // plano. A resposta mais nova é a que vale.
  void _startRefresh(ChecklistRepository clRepo, WorkOrder wo) {
    final round = ++_refreshRound;
    if (ref.read(networkStatusProvider) == NetworkStatus.offline) {
      _refresh = _Refresh.offline;
      return;
    }
    _refresh = _Refresh.checking;
    unawaited(_runRefresh(clRepo, wo, round));
  }

  Future<void> _runRefresh(
    ChecklistRepository clRepo,
    WorkOrder wo,
    int round,
  ) async {
    _Refresh outcome;
    try {
      await clRepo.prefetchRunsForWorkOrder(
        wo.localId,
        serverWorkOrderId: wo.serverId,
      );
      outcome = _Refresh.done;
    } on ApiNetworkError {
      outcome = _Refresh.offline;
    } catch (_) {
      outcome = _Refresh.failed;
    }
    if (!mounted || round != _refreshRound) return;
    // Relê o aparelho; o FutureBuilder mantém o dado anterior enquanto isso.
    setState(() {
      _refresh = outcome;
      _dataFuture = null;
    });
  }

  // "Atualizar" e a volta do sinal: pergunta de novo ao servidor.
  void _refreshNow() => setState(() {
    _refreshStarted = false;
    _dataFuture = null;
  });

  void _openChecklist(WorkOrder wo) =>
      _openRun(wo.checklistId!, wo.localId, MobileChecklistRunKind.collection);

  void _openRun(
    String checklistId,
    String workOrderId,
    MobileChecklistRunKind kind,
  ) {
    setState(() => _dataFuture = null);
    context.push(
      checklistRunLocation(
        checklistId: checklistId,
        workOrderId: workOrderId,
        kind: kind,
      ),
    );
  }

  void _openComparison(_ExecData data) {
    context.push(
      checklistComparisonLocation(
        checklistId: data.collectionRun!.checklistId,
        workOrderId: data.wo.localId,
      ),
    );
  }

  Future<void> _doTransition(
    WorkOrderRepository repo,
    WorkOrder wo,
    WorkOrderStatus next,
  ) async {
    setState(() {
      _isLoading = true;
      _safeError = null;
    });
    try {
      await repo.updateStatus(wo.localId, next);
      if (mounted) context.go('/work-orders/${widget.workOrderId}');
    } on StateError catch (e) {
      setState(() => _safeError = e.message);
    } on ApiError catch (e) {
      setState(() => _safeError = e.safeMessage);
    } catch (_) {
      setState(
        () =>
            _safeError = 'Não foi possível alterar o status. Tente novamente.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _attachEvidence(WorkOrderRepository woRepo) async {
    if (!mounted) return;
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    final picker = ref.read(evidencePickerProvider);
    final result = await picker.pickImage(source);
    if (result == null || !mounted) return;
    try {
      await woRepo.attachEvidence(
        workOrderLocalId: widget.workOrderId,
        fileName: result.fileName,
        mimeType: result.mimeType,
        sizeBytes: result.sizeBytes,
        captureSource: result.captureSource.name,
        checksum: result.sha256,
        bytes: result.bytes,
      );
      setState(() => _dataFuture = null);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro ao registrar evidência: $e')),
        );
      }
    }
  }

  Future<void> _doComplete(WorkOrderRepository repo, _ExecData data) async {
    setState(() {
      _isLoading = true;
      _safeError = null;
    });
    try {
      await repo.completeWorkOrder(
        data.wo.localId,
        checklistComplete: data.isCollectionComplete,
        deliveryComplete: data.deliveryGateOpen,
      );
      if (mounted) context.go('/work-orders/${widget.workOrderId}');
    } on StateError catch (e) {
      setState(() => _safeError = e.message);
    } on ApiError catch (e) {
      setState(() => _safeError = e.safeMessage);
    } catch (_) {
      setState(
        () => _safeError = 'Não foi possível concluir a OS. Tente novamente.',
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);
    final woRepo = ref.watch(workOrderRepositoryProvider);
    final clRepo = ref.watch(checklistRepositoryProvider);
    final networkOffline =
        ref.watch(networkStatusProvider) == NetworkStatus.offline;
    // Quando o sinal volta, a seção pergunta de novo ao servidor.
    ref.listen<NetworkStatus>(networkStatusProvider, (prev, next) {
      final waiting =
          _refresh == _Refresh.offline || _refresh == _Refresh.failed;
      if (next == NetworkStatus.online && _refreshStarted && waiting) {
        _refreshNow();
      }
    });

    final canStatus = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'work_orders:status',
          );

    if (!canStatus) {
      return ErpScaffold(
        showAppBar: false,
        body: Column(
          children: [
            MobileScreenHeader(
              title: 'Atendimento',
              onBack: () => context.go('/work-orders/${widget.workOrderId}'),
            ),
            const Expanded(
              child: PermissionBlockedState(
                title: 'Ação não permitida',
                message:
                    'Seu perfil não tem permissão para alterar o status desta OS. Fale com o administrador da sua organização.',
              ),
            ),
          ],
        ),
      );
    }

    return FutureBuilder<_ExecData>(
      future: _ensureFuture(woRepo, clRepo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          final msg = snapshot.error is StateError
              ? (snapshot.error as StateError).message
              : 'Erro ao carregar OS.';
          return ErpScaffold(
            showAppBar: false,
            body: Column(
              children: [
                MobileScreenHeader(
                  title: 'Atendimento',
                  onBack: () =>
                      context.go('/work-orders/${widget.workOrderId}'),
                ),
                Expanded(child: ErrorState(message: msg)),
              ],
            ),
          );
        }

        if (!snapshot.hasData) {
          return const ErpScaffold(
            showAppBar: false,
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }

        final data = snapshot.data!;
        final wo = data.wo;
        final allTransitions = wo.status.allowedTransitions.toList();
        final regularTransitions = allTransitions
            .where((t) => t != WorkOrderStatus.completed)
            .toList();
        final canComplete = allTransitions.contains(WorkOrderStatus.completed);
        // C3-F2 — sem conexão: a rede está fora, ou a pré-carga não saiu.
        final offline = networkOffline || data.refresh == _Refresh.offline;

        return ErpScaffold(
          showAppBar: false,
          body: Column(
            children: [
              MobileScreenHeader(
                title: 'Atendimento',
                subtitle: '${wo.code} · ${wo.customerName}',
                onBack: () => context.go('/work-orders/${widget.workOrderId}'),
                trailing: MobilePill(
                  label: wo.status.label,
                  tone: pillToneFromStatus(wo.status.statusTone),
                ),
              ),
              if (offline)
                const Padding(
                  padding: EdgeInsets.fromLTRB(16, 8, 16, 0),
                  child: NetworkStatusBanner(
                    key: ValueKey('bsan314-sem-conexao'),
                    status: NetworkStatus.offline,
                    offlineMessage: _kSemConexao,
                  ),
                ),
              Expanded(
                child: ListView(
                  padding: const EdgeInsets.all(16),
                  children: [
                    if (wo.syncStatus == SyncStatus.pending ||
                        data.hasQueuedTowRuns)
                      const SyncStatusBanner(
                        status: SyncStatus.pending,
                        message:
                            'Alterações locais aguardando sincronização com o servidor.',
                      ),
                    const SizedBox(height: 8),
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.build_outlined),
                        title: Text('${wo.code} · ${wo.title}'),
                        subtitle: Text(wo.customerName),
                        trailing: OperationalStatusChip(
                          label: wo.status.label,
                          status: wo.status.statusTone,
                        ),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 8,
                          vertical: 12,
                        ),
                        child: WorkOrderStepper(
                          serviceType: wo.serviceType,
                          status: wo.status,
                          towLeg: data.towLeg,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    OperationalLocationCard(session: session, workOrder: wo),
                    const SizedBox(height: 8),
                    if (_safeError != null)
                      SyncStatusBanner(
                        status: SyncStatus.failed,
                        message: _safeError!,
                      ),
                    const SizedBox(height: 8),
                    if (wo.status.isFinal)
                      Card(
                        child: ListTile(
                          leading: const Icon(Icons.check_circle_outline),
                          title: Text('OS ${wo.status.label.toLowerCase()}'),
                          subtitle: const Text(
                            'Status final — sem transições possíveis.',
                          ),
                        ),
                      )
                    else if (allTransitions.isEmpty)
                      const Card(
                        child: ListTile(
                          leading: Icon(Icons.block_outlined),
                          title: Text('Nenhuma transição disponível'),
                          subtitle: Text(
                            'Este status não permite alterações no momento.',
                          ),
                        ),
                      )
                    else ...[
                      if (wo.checklistId != null && data.isTow) ...[
                        _TowChecklistSection(
                          data: data,
                          offline: offline,
                          onOpenCollection: () => _openRun(
                            data.collectionRun?.checklistId ?? wo.checklistId!,
                            wo.localId,
                            MobileChecklistRunKind.collection,
                          ),
                          onOpenDelivery: () => _openRun(
                            data.confirmedDelivery!.checklistId,
                            wo.localId,
                            MobileChecklistRunKind.delivery,
                          ),
                          onCompare: () => _openComparison(data),
                          onRefresh: _refreshNow,
                        ),
                        // C3-F11 — com a seção, o vão até "Próxima ação" é o
                        // da opção A (28 px do botão Comparar, 30 do cartão).
                        const SizedBox(height: 26),
                      ] else if (wo.checklistId != null) ...[
                        Text(
                          'Checklist',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 8),
                        _ChecklistStatusCard(
                          data: data,
                          onOpen: () => _openChecklist(wo),
                        ),
                        const SizedBox(height: 16),
                      ],
                      if (regularTransitions.isNotEmpty) ...[
                        Text(
                          'Próxima ação',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 8),
                        for (final next in regularTransitions)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: _TransitionButton(
                              workOrder: wo,
                              targetStatus: next,
                              isLoading: _isLoading,
                              onPressed: () => _doTransition(woRepo, wo, next),
                            ),
                          ),
                        const SizedBox(height: 8),
                      ],
                      if (canComplete) ...[
                        const Divider(),
                        const SizedBox(height: 8),
                        Text(
                          'Concluir OS',
                          style: Theme.of(context).textTheme.titleSmall,
                        ),
                        const SizedBox(height: 8),
                        if (!data.canConclude) ...[
                          Card(
                            color: Theme.of(context).colorScheme.errorContainer,
                            child: ListTile(
                              leading: Icon(
                                Icons.warning_amber_outlined,
                                color: Theme.of(context).colorScheme.error,
                              ),
                              title: Text(
                                _lockTitle(data),
                                style: TextStyle(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onErrorContainer,
                                ),
                              ),
                              subtitle: Text(
                                _lockMessage(data),
                                style: TextStyle(
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onErrorContainer,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                        ],
                        // Estado 7 da opção A: sem a resposta do servidor e sem
                        // entrega no aparelho, a conclusão pode ser recusada.
                        if (data.isTow &&
                            data.deliveryUnverified &&
                            data.confirmedDelivery == null) ...[
                          const SyncStatusBanner(
                            key: ValueKey('bsan314-aviso-nao-verificada'),
                            status: SyncStatus.pending,
                            icon: Icons.info_outline,
                            message: _kAvisoNaoVerificada,
                          ),
                          const SizedBox(height: 8),
                        ],
                        // Estado 6 (C3-F2): sem sinal, entrega concluída e na
                        // fila; a OS conclui depois que a entrega subir.
                        if (data.isTow &&
                            offline &&
                            data.isDeliveryComplete &&
                            data.isQueued(data.confirmedDelivery)) ...[
                          const SyncStatusBanner(
                            key: ValueKey('bsan314-aviso-fila'),
                            status: SyncStatus.pending,
                            message: _kAvisoFilaConclusao,
                          ),
                          const SizedBox(height: 8),
                        ],
                        SizedBox(
                          width: double.infinity,
                          child: FilledButton.icon(
                            onPressed: _isLoading || !data.canConclude
                                ? null
                                : () => _doComplete(woRepo, data),
                            icon: _isLoading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator.adaptive(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.check_circle_outline),
                            label: const Text('Concluir OS'),
                            style: FilledButton.styleFrom(
                              backgroundColor: data.canConclude
                                  ? ErpMobileTheme.success
                                  : null,
                            ),
                          ),
                        ),
                      ],
                    ],
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 8),
                    Text(
                      'Evidências',
                      style: Theme.of(context).textTheme.titleSmall,
                    ),
                    const SizedBox(height: 8),
                    _EvidenceSection(
                      evidences: data.evidences,
                      isLoading: _isLoading,
                      onAdd: () => _attachEvidence(woRepo),
                    ),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// B-SAN3-14 — textos da opção A aprovada
// (docs/claude-code-handoff/screen-refs/execucao-guincho-3opcoes.reference.html).
const _kSemConexao =
    'Sem conexão. O que você fizer fica salvo no aparelho e é enviado quando '
    'o sinal voltar.';
const _kAvisoNaoVerificada =
    'Sem sinal, o aparelho não confirma se esta OS tem vistoria de entrega. '
    'Se tiver, a conclusão só é aceita depois dela.';
const _kAvisoFilaConclusao =
    'A vistoria de entrega e a conclusão da OS ficam na fila. Quando o sinal '
    'voltar, a entrega é enviada primeiro e a OS conclui logo depois.';
const _kDadosDesatualizados =
    'Não foi possível atualizar as vistorias agora. Os dados podem estar '
    'desatualizados.';

// B-SAN3-14 — o aviso da trava diz qual vistoria falta (guincho); o fluxo do
// prestador mantém o texto de hoje.
String _lockTitle(_ExecData data) {
  if (!data.isTow) return 'Checklist obrigatorio pendente';
  return data.isCollectionComplete
      ? 'Vistoria de entrega pendente'
      : 'Vistoria de coleta pendente';
}

String _lockMessage(_ExecData data) {
  if (!data.isTow) {
    return 'Conclua o checklist obrigatorio antes de finalizar a OS.';
  }
  return data.isCollectionComplete
      ? 'Conclua a vistoria de entrega antes de concluir a OS.'
      : 'Conclua a vistoria de coleta antes de concluir a OS.';
}

// ---------------------------------------------------------------------------
// B-SAN3-14 — Vistorias do guincho (opção A aprovada: os cartões de hoje, um
// por fase, a comparação e a trava no lugar de sempre). Maquete:
// docs/claude-code-handoff/screen-refs/execucao-guincho-3opcoes.reference.html
// ---------------------------------------------------------------------------

class _TowChecklistSection extends StatelessWidget {
  const _TowChecklistSection({
    required this.data,
    required this.offline,
    required this.onOpenCollection,
    required this.onOpenDelivery,
    required this.onCompare,
    required this.onRefresh,
  });

  final _ExecData data;
  final bool offline;
  final VoidCallback onOpenCollection;
  final VoidCallback onOpenDelivery;
  final VoidCallback onCompare;
  final VoidCallback onRefresh;

  @override
  Widget build(BuildContext context) {
    final collection = data.collectionRun;
    final delivery = data.confirmedDelivery;
    final refresh = offline ? null : onRefresh;
    // C3-F11 — os vãos são os da opção A: 8 px do título ao primeiro bloco, 6
    // entre os cartões e 6 até o "Comparar" (o botão tem 2 px de área de toque
    // em cima e embaixo); os cartões da seção não levam a margem do tema.
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Vistorias', style: Theme.of(context).textTheme.titleSmall),
        const SizedBox(height: 8),
        if (data.refreshFailed && delivery != null) ...[
          StaleDataBanner(
            key: const ValueKey('bsan314-desatualizado'),
            message: _kDadosDesatualizados,
            onRefresh: refresh,
          ),
          const SizedBox(height: 6),
        ],
        _PhaseCard(
          key: const ValueKey('bsan314-fase-coleta'),
          title: 'Coleta',
          subtitle: _phaseSubtitle(
            collection,
            collection?.checklistId ?? data.wo.checklistId!,
            data,
          ),
          pill: _queuePill(collection, data),
          status: _phaseStatus(collection),
          actionLabel: _phaseAction(collection, 'coleta'),
          actionIcon: _phaseActionIcon(collection),
          onAction: onOpenCollection,
        ),
        const SizedBox(height: 6),
        if (delivery != null)
          _PhaseCard(
            key: const ValueKey('bsan314-fase-entrega'),
            title: 'Entrega',
            subtitle: _phaseSubtitle(delivery, delivery.checklistId, data),
            pill: _queuePill(delivery, data),
            status: _phaseStatus(delivery),
            actionLabel: _phaseAction(delivery, 'entrega'),
            actionIcon: _phaseActionIcon(delivery),
            onAction: onOpenDelivery,
            note: data.isDeliveryComplete
                ? null
                : 'Obrigatória para concluir a OS',
          )
        else
          _PhaseCard(
            key: const ValueKey('bsan314-fase-entrega'),
            title: 'Entrega',
            icon: _unconfirmedDeliveryIcon(data),
            status: _unconfirmedDeliveryStatus(data),
            subtitle: _unconfirmedDeliveryMessage(data),
            actionLabel: data.canRefreshAwaiting ? 'Atualizar' : null,
            actionIcon: Icons.refresh_outlined,
            onAction: refresh,
          ),
        if (data.canCompare) ...[
          const SizedBox(height: 4),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton.icon(
              key: const ValueKey('bsan314-comparar'),
              onPressed: onCompare,
              icon: const Icon(Icons.compare_arrows_outlined),
              label: const Text('Comparar coleta × entrega'),
            ),
          ),
        ] else
          const SizedBox(height: 4),
      ],
    );
  }
}

typedef _PhaseStatus = (String label, String tone);

_PhaseStatus _phaseStatus(MobileChecklistRun? run) {
  if (run == null) return ('Não iniciada', 'info');
  if (run.status == MobileChecklistRunStatus.completed) {
    return ('Concluída', 'success');
  }
  if (run.status == MobileChecklistRunStatus.inProgress && _hasAnswers(run)) {
    return ('Em andamento', 'warning');
  }
  return ('Não iniciada', 'info');
}

String _phaseAction(MobileChecklistRun? run, String phase) {
  final (label, _) = _phaseStatus(run);
  return switch (label) {
    'Concluída' => 'Ver vistoria de $phase',
    'Em andamento' => 'Continuar vistoria de $phase',
    _ => 'Abrir vistoria de $phase',
  };
}

// C3-F4 — o ícone diz a ação, como na opção A: ver (concluída), continuar
// (lápis) e abrir (lista).
IconData _phaseActionIcon(MobileChecklistRun? run) {
  final (label, _) = _phaseStatus(run);
  return switch (label) {
    'Concluída' => Icons.check_circle_outline,
    'Em andamento' => Icons.edit_outlined,
    _ => Icons.checklist_outlined,
  };
}

// C3-F1 — o subtítulo da opção A: o nome do modelo e "N de M obrigatórios",
// do modelo em cache no aparelho. Sem o modelo em cache, sem subtítulo.
String? _phaseSubtitle(
  MobileChecklistRun? run,
  String checklistId,
  _ExecData data,
) {
  final schema = data.schemas[checklistId];
  if (schema == null) return null;
  final required = schema.requiredFields;
  if (required.isEmpty) return schema.title;
  final answered = run == null
      ? 0
      : required.where((f) => run.answers[f.id]?.hasValue ?? false).length;
  return '${schema.title}\n$answered de ${required.length} obrigatórios';
}

// C3-F2 — a vistoria com ação ainda na fila do aparelho: "Na fila" quando
// concluída, "Salvo no aparelho" quando em andamento.
(String, PillTone)? _queuePill(MobileChecklistRun? run, _ExecData data) {
  if (!data.isQueued(run)) return null;
  return run!.status == MobileChecklistRunStatus.completed
      ? ('Na fila', PillTone.warning)
      : ('Salvo no aparelho', PillTone.info);
}

// C3-F8 — enquanto o aparelho pergunta ao servidor, a entrega que ele ainda
// não tem é "verificando", nunca "sem entrega".
_PhaseStatus _unconfirmedDeliveryStatus(_ExecData data) {
  if (data.checking) return ('Verificando', 'pending');
  if (data.deliveryUnverified) return ('Não verificada', 'pending');
  if (data.deliveryRun != null) return ('Aguardando despacho', 'pending');
  return ('Sem entrega', 'info');
}

String _unconfirmedDeliveryMessage(_ExecData data) {
  if (data.checking) {
    return 'Verificando com o servidor se esta OS tem vistoria de entrega.';
  }
  if (data.deliveryUnverified) {
    return 'Entrega não verificada — conecte-se para atualizar.';
  }
  if (data.deliveryRun != null) {
    return 'A central ainda não liberou a vistoria de entrega desta OS. '
        'Ela não impede concluir a OS.';
  }
  return 'Esta OS não tem vistoria de entrega e conclui só com a coleta, '
      'como antes.';
}

// C3-F4 — o ícone do cartão da entrega sem confirmação, como na opção A.
IconData _unconfirmedDeliveryIcon(_ExecData data) {
  if (data.checking) return Icons.sync_outlined;
  if (data.deliveryUnverified) return Icons.cloud_off_outlined;
  if (data.deliveryRun != null) return Icons.schedule_outlined;
  return Icons.info_outline;
}

class _PhaseCard extends StatelessWidget {
  const _PhaseCard({
    required this.title,
    required this.status,
    required this.onAction,
    this.icon = Icons.checklist_outlined,
    this.subtitle,
    this.pill,
    this.actionLabel,
    this.actionIcon = Icons.checklist_outlined,
    this.note,
    super.key,
  });

  final String title;
  final _PhaseStatus status;
  final IconData icon;
  final String? subtitle;
  final (String, PillTone)? pill;
  final String? actionLabel;
  final IconData actionIcon;

  /// Nulo desabilita a ação (por exemplo, "Atualizar" sem conexão).
  final VoidCallback? onAction;
  final String? note;

  @override
  Widget build(BuildContext context) {
    final (label, tone) = status;
    final queue = pill;
    return Card(
      margin: EdgeInsets.zero,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            titleAlignment: ListTileTitleAlignment.top,
            leading: Icon(icon),
            title: Text(title),
            subtitle: subtitle == null && queue == null
                ? null
                : Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (subtitle != null)
                        Text(
                          subtitle!,
                          style: const TextStyle(
                            fontSize: 13.5,
                            height: 19 / 13.5,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                      if (queue != null) ...[
                        const SizedBox(height: 4),
                        MobilePill(label: queue.$1, tone: queue.$2),
                      ],
                    ],
                  ),
            trailing: OperationalStatusChip(label: label, status: tone),
          ),
          if (note != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
              child: Row(
                children: [
                  // C3-F3 — a nota da trava nos tokens de atenção da opção A.
                  const Icon(
                    Icons.lock_outline,
                    size: 16,
                    color: ErpMobileTheme.warning,
                  ),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      note!,
                      style: const TextStyle(
                        fontSize: 12.5,
                        height: 17 / 12.5,
                        color: ErpMobileTheme.warningInk,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          if (actionLabel != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: onAction,
                  icon: Icon(actionIcon),
                  label: Text(actionLabel!),
                ),
              ),
            ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Checklist status card
// ---------------------------------------------------------------------------

class _ChecklistStatusCard extends StatelessWidget {
  const _ChecklistStatusCard({required this.data, required this.onOpen});

  final _ExecData data;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final isComplete = data.isChecklistComplete;
    final isStarted = data.isChecklistStarted;
    final statusLabel = isComplete
        ? 'Concluído'
        : isStarted
        ? 'Em andamento'
        : 'Não iniciado';
    final statusTone = isComplete
        ? 'success'
        : isStarted
        ? 'warning'
        : 'info';
    final buttonLabel = isComplete
        ? 'Ver checklist'
        : isStarted
        ? 'Continuar checklist'
        : 'Abrir checklist';

    return Card(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ListTile(
            leading: const Icon(Icons.checklist_outlined),
            title: Text('Checklist: ${data.wo.checklistId}'),
            trailing: OperationalStatusChip(
              label: statusLabel,
              status: statusTone,
            ),
          ),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: onOpen,
                icon: Icon(
                  isComplete
                      ? Icons.check_circle_outline
                      : Icons.checklist_outlined,
                ),
                label: Text(buttonLabel),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Transition button
// ---------------------------------------------------------------------------

class _TransitionButton extends StatelessWidget {
  const _TransitionButton({
    required this.workOrder,
    required this.targetStatus,
    required this.isLoading,
    required this.onPressed,
  });

  final WorkOrder workOrder;
  final WorkOrderStatus targetStatus;
  final bool isLoading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final icon = _iconFor(targetStatus);
    return FilledButton.icon(
      onPressed: isLoading ? null : onPressed,
      icon: isLoading
          ? const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator.adaptive(strokeWidth: 2),
            )
          : Icon(icon),
      label: Text(targetStatus.label),
      style: FilledButton.styleFrom(
        backgroundColor: _colorFor(targetStatus, context),
      ),
    );
  }

  IconData _iconFor(WorkOrderStatus s) => switch (s) {
    WorkOrderStatus.dispatched => Icons.send_outlined,
    WorkOrderStatus.enRoute => Icons.directions_car_outlined,
    WorkOrderStatus.arrived => Icons.location_on_outlined,
    WorkOrderStatus.inService => Icons.build_outlined,
    WorkOrderStatus.paused => Icons.pause_outlined,
    WorkOrderStatus.completed => Icons.check_circle_outline,
    WorkOrderStatus.pendingApproval => Icons.approval_outlined,
    WorkOrderStatus.cancelled => Icons.cancel_outlined,
    WorkOrderStatus.exception => Icons.warning_amber_outlined,
    _ => Icons.arrow_forward_outlined,
  };

  Color _colorFor(WorkOrderStatus s, BuildContext context) => switch (s) {
    WorkOrderStatus.completed ||
    WorkOrderStatus.approved => ErpMobileTheme.success,
    WorkOrderStatus.cancelled ||
    WorkOrderStatus.exception => ErpMobileTheme.danger,
    _ => ErpMobileTheme.primary,
  };
}

// ---------------------------------------------------------------------------
// Evidence section
// ---------------------------------------------------------------------------

class _EvidenceSection extends StatelessWidget {
  const _EvidenceSection({
    required this.evidences,
    required this.isLoading,
    required this.onAdd,
  });

  final List<WorkOrderEvidence> evidences;
  final bool isLoading;
  final VoidCallback onAdd;

  // Mapeia o estado real da evidência para o pill/faixa semânticos do
  // protótipo (evidencias.png): Armazenado verde, Pendente sync âmbar,
  // Salvo no aparelho azul, Falha/Conflito vermelho.
  (String, PillTone, Color) _stateFor(WorkOrderEvidence e) {
    if (e.uploadStatus == SyncStatus.synced) {
      return ('Armazenado', PillTone.done, ErpMobileTheme.success);
    }
    return switch (e.syncStatus) {
      SyncStatus.synced => ('Enviando', PillTone.purple, ErpMobileTheme.purple),
      SyncStatus.failed => (
        'Falha no envio',
        PillTone.danger,
        ErpMobileTheme.danger,
      ),
      SyncStatus.conflict => (
        'Conflito',
        PillTone.danger,
        ErpMobileTheme.danger,
      ),
      SyncStatus.local => (
        'Salvo no aparelho',
        PillTone.info,
        ErpMobileTheme.info,
      ),
      _ => ('Pendente sync', PillTone.scheduled, ErpMobileTheme.warning),
    };
  }

  String _sizeLabel(int bytes) {
    if (bytes >= 1024 * 1024) {
      return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
    }
    if (bytes >= 1024) return '${(bytes / 1024).toStringAsFixed(0)} KB';
    return '$bytes B';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (final e in evidences)
          Builder(
            builder: (context) {
              final (label, tone, accent) = _stateFor(e);
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: ErpMobileTheme.cardBorder),
                ),
                clipBehavior: Clip.antiAlias,
                child: IntrinsicHeight(
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Container(width: 4, color: accent),
                      Expanded(
                        child: Padding(
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
                          child: Row(
                            children: [
                              Container(
                                width: 36,
                                height: 36,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF1F5F9),
                                  shape: BoxShape.circle,
                                ),
                                child: Icon(
                                  e.captureSource == 'camera'
                                      ? Icons.camera_alt_outlined
                                      : Icons.photo_library_outlined,
                                  size: 17,
                                  color: const Color(0xFF475569),
                                ),
                              ),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      e.fileName,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: const TextStyle(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: ErpMobileTheme.ink,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      '${e.captureSource == 'camera' ? 'Câmera' : 'Galeria'}'
                                      ' · ${_sizeLabel(e.sizeBytes)}',
                                      style: const TextStyle(
                                        fontSize: 11,
                                        color: ErpMobileTheme.inkMuted,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8),
                              MobilePill(label: label, tone: tone),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        if (evidences.isNotEmpty) const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          child: OutlinedButton.icon(
            onPressed: isLoading ? null : onAdd,
            icon: const Icon(Icons.camera_alt_outlined),
            label: const Text('Registrar evidência'),
          ),
        ),
      ],
    );
  }
}
