import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/sync/sync_models.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../prestador/data/prestador_repository.dart';
import '../data/work_order_repository.dart';
import '../domain/work_order_conclusion.dart';
import '../domain/work_order_models.dart';

/// Conclusão do atendimento: comissão, resumo e sincronização silenciosa.
///
/// Fiel a `screen-refs/mobile/conclusao-guincho.png`: selo verde de conclusão
/// no cabeçalho, cartão de comissão VERDE em destaque, cards de métrica,
/// bloco "Resumo do atendimento" e barra fixa de ação (verde) no rodapé.
class WorkOrderConclusionScreen extends ConsumerStatefulWidget {
  const WorkOrderConclusionScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<WorkOrderConclusionScreen> createState() =>
      _WorkOrderConclusionScreenState();
}

class _ConclusionData {
  const _ConclusionData({
    required this.summary,
    required this.code,
    required this.isTow,
    required this.completedAt,
    required this.baseValueCents,
    required this.ratePercent,
  });

  final WorkOrderConclusionSummary summary;
  final String code;
  final bool isTow;
  final DateTime? completedAt;
  final int baseValueCents;
  final double ratePercent;
}

class _WorkOrderConclusionScreenState
    extends ConsumerState<WorkOrderConclusionScreen> {
  Future<_ConclusionData>? _future;
  WorkOrderRepository? _repo;
  bool _completing = false;
  bool _done = false;
  String? _error;

  static const double _ratePercent = 10;

  Future<_ConclusionData> _ensure(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) {
    if (_repo != woRepo) {
      _repo = woRepo;
      _future = _load(woRepo, prestRepo);
    }
    return _future!;
  }

  Future<_ConclusionData> _load(
    WorkOrderRepository woRepo,
    PrestadorRepository prestRepo,
  ) async {
    await woRepo.load();
    final wo = woRepo.findById(widget.workOrderId);
    if (wo == null) throw StateError('Ordem de serviço não encontrada.');
    final materials = await prestRepo.loadMaterials(widget.workOrderId);
    final baseValueCents = _baseValueFor(wo.priority);
    return _ConclusionData(
      summary: WorkOrderConclusionSummary.fromWorkOrder(
        wo,
        materialsCount: materials.length,
        baseValueCents: baseValueCents,
        ratePercent: _ratePercent,
      ),
      code: wo.code,
      isTow: wo.serviceType == WorkOrderServiceType.tow,
      completedAt: wo.completedAt,
      baseValueCents: baseValueCents,
      ratePercent: _ratePercent,
    );
  }

  int _baseValueFor(WorkOrderPriority p) => switch (p) {
    WorkOrderPriority.critical => 200000,
    WorkOrderPriority.high => 150000,
    WorkOrderPriority.normal => 100000,
    WorkOrderPriority.low => 80000,
  };

  /// Sincronização silenciosa: enfileira a conclusão sem bloquear a UI.
  Future<void> _conclude() async {
    setState(() {
      _completing = true;
      _error = null;
    });
    try {
      final wo = _repo!.findById(widget.workOrderId);
      final checklistComplete = wo?.checklistId == null;
      await _repo!.completeWorkOrder(
        widget.workOrderId,
        checklistComplete: checklistComplete,
      );
      if (mounted) setState(() => _done = true);
    } on StateError catch (e) {
      if (mounted) setState(() => _error = e.message);
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Não foi possível concluir. Tente novamente.');
      }
    } finally {
      if (mounted) setState(() => _completing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final woRepo = ref.watch(workOrderRepositoryProvider);
    final prestRepo = ref.watch(prestadorRepositoryProvider);
    return FutureBuilder<_ConclusionData>(
      future: _ensure(woRepo, prestRepo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ErpScaffold(
            showAppBar: false,
            showBottomNav: false,
            body: Column(
              children: [
                MobileScreenHeader(
                  title: 'Conclusão',
                  onBack: () => context.go('/work-orders'),
                ),
                Expanded(child: ErrorState(message: snapshot.error.toString())),
              ],
            ),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            showAppBar: false,
            showBottomNav: false,
            body: Center(child: CircularProgressIndicator.adaptive()),
          );
        }
        final data = snapshot.data!;
        return ErpScaffold(
          showAppBar: false,
          // Tela de fluxo: rodapé é a ação seguinte, não a navegação
          // (conclusao-guincho.png).
          stickyBar: _stickyBar(context),
          body: Column(
            children: [
              _Header(data: data),
              Expanded(child: _body(context, data)),
            ],
          ),
        );
      },
    );
  }

  Widget _body(BuildContext context, _ConclusionData data) {
    final s = data.summary;
    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _CommissionCard(
            value: s.commissionLabel,
            ratePercent: data.ratePercent,
            ticketLabel: formatBrlCents(data.baseValueCents),
          ),
          const SizedBox(height: 12),
          IntrinsicHeight(
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Expanded(
                  child: _MetricCard(
                    icon: Icons.timer_outlined,
                    caption: 'Tempo',
                    value: s.elapsedLabel,
                    foot: 'porta a porta',
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _MetricCard(
                    icon: Icons.inventory_2_outlined,
                    caption: 'Materiais',
                    value: '${s.materialsCount}',
                    foot: s.materialsCount == 1
                        ? 'item aplicado'
                        : 'itens aplicados',
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          const MobileSectionLabel('Resumo do atendimento'),
          Container(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: ErpMobileTheme.cardBorder),
            ),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Column(
              children: [
                _SummaryRow(
                  icon: Icons.handyman_outlined,
                  label: 'Serviço',
                  value: s.service,
                ),
                const _RowDivider(),
                _SummaryRow(
                  icon: Icons.apartment_outlined,
                  label: 'Cliente',
                  value: s.customer,
                ),
                const _RowDivider(),
                _SummaryRow(
                  icon: data.isTow
                      ? Icons.directions_car_outlined
                      : Icons.build_outlined,
                  label: s.assetLabel,
                  value: s.assetValue,
                ),
                if (data.completedAt != null) ...[
                  const _RowDivider(),
                  _SummaryRow(
                    icon: Icons.schedule_outlined,
                    label: 'Finalizado em',
                    value: _fmtDayMonthTime(data.completedAt!),
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 14),
          if (_error != null)
            SyncStatusBanner(status: SyncStatus.failed, message: _error!),
          if (_done)
            Container(
              key: const Key('conclusion-synced'),
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: const Color(0xFFECFDF5),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFA7F3D0)),
              ),
              child: Row(
                children: const [
                  Icon(
                    Icons.cloud_done_outlined,
                    color: ErpMobileTheme.success,
                  ),
                  SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Atendimento concluído · sincronização em segundo plano.',
                      style: TextStyle(
                        fontSize: 12.5,
                        fontWeight: FontWeight.w600,
                        color: Color(0xFF065F46),
                      ),
                    ),
                  ),
                ],
              ),
            ),
        ],
      ),
    );
  }

  /// Barra fixa de ação do rodapé (conclusao-guincho.png): "Concluir
  /// atendimento" e, depois de concluído, "OK" verde de volta para a lista.
  Widget _stickyBar(BuildContext context) {
    return MobileStickyBar(
      children: [
        Expanded(
          child: _done
              ? SizedBox(
                  height: 50,
                  child: FilledButton(
                    key: const Key('conclusion-ok'),
                    onPressed: () => context.go('/work-orders'),
                    style: FilledButton.styleFrom(
                      backgroundColor: ErpMobileTheme.success,
                    ),
                    child: const Text(
                      'OK',
                      style: TextStyle(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                )
              : SizedBox(
                  height: 50,
                  child: FilledButton.icon(
                    key: const Key('conclude-button'),
                    onPressed: _completing ? null : _conclude,
                    style: FilledButton.styleFrom(
                      backgroundColor: ErpMobileTheme.success,
                    ),
                    icon: _completing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator.adaptive(
                              strokeWidth: 2,
                            ),
                          )
                        : const Icon(Icons.check_circle_outline),
                    label: const Text('Concluir atendimento'),
                  ),
                ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Cabeçalho com selo verde de conclusão
// ---------------------------------------------------------------------------

class _Header extends StatelessWidget {
  const _Header({required this.data});

  final _ConclusionData data;

  @override
  Widget build(BuildContext context) {
    final finished = data.completedAt != null
        ? ' · finalizado ${_fmtDayMonthTime(data.completedAt!)}'
        : '';
    return MobileScreenHeader(
      title: 'Atendimento concluído',
      subtitle: '${data.code}$finished',
      leading: Container(
        width: 34,
        height: 34,
        decoration: const BoxDecoration(
          color: Color(0xFFECFDF5),
          shape: BoxShape.circle,
        ),
        child: const Icon(Icons.check, color: ErpMobileTheme.success, size: 20),
      ),
      trailing: MobilePill(
        label: data.isTow ? 'Guincho' : 'Prestador',
        tone: PillTone.info,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cartão de comissão (verde, destaque)
// ---------------------------------------------------------------------------

class _CommissionCard extends StatelessWidget {
  const _CommissionCard({
    required this.value,
    required this.ratePercent,
    required this.ticketLabel,
  });

  final String value;
  final double ratePercent;
  final String ticketLabel;

  String get _rateLabel {
    final r = ratePercent;
    final asInt = r.truncateToDouble() == r;
    return asInt ? '${r.toInt()}%' : '$r%';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      key: const Key('commission-card'),
      padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
          colors: [Color(0xFF059669), Color(0xFF10B981)],
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x2610B981),
            blurRadius: 18,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: const [
              Icon(Icons.payments_outlined, color: Colors.white, size: 16),
              SizedBox(width: 6),
              Text(
                'Sua comissão',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 12.5,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 34,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'A receber · $_rateLabel do ticket $ticketLabel',
            style: const TextStyle(
              color: Color(0xFFD1FAE5),
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Cartão de métrica (Tempo / Materiais)
// ---------------------------------------------------------------------------

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.caption,
    required this.value,
    required this.foot,
  });

  final IconData icon;
  final String caption;
  final String value;
  final String foot;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 14, color: ErpMobileTheme.inkFaint),
              const SizedBox(width: 6),
              Text(
                caption,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            value,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: ErpMobileTheme.ink,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            foot,
            style: const TextStyle(
              fontSize: 11,
              color: ErpMobileTheme.inkFaint,
            ),
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 11),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Icon(icon, size: 18, color: ErpMobileTheme.inkFaint),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label.toUpperCase(),
                  style: const TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.4,
                    color: ErpMobileTheme.inkFaint,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: ErpMobileTheme.ink,
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

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, color: ErpMobileTheme.cardBorder);
}

String _fmtDayMonthTime(DateTime dt) =>
    '${dt.day.toString().padLeft(2, '0')}/'
    '${dt.month.toString().padLeft(2, '0')} · '
    '${dt.hour.toString().padLeft(2, '0')}:'
    '${dt.minute.toString().padLeft(2, '0')}';
