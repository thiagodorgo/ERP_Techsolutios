import 'package:flutter/material.dart';

import '../../../../core/network/connectivity_repository.dart';
import '../../../../core/sync/sync_models.dart';
import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_components.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'execucao_guincho_aparencias_shared.dart';

/// B-APP-APARENCIA (F2) — a execução do guincho na opção C, "Coleta × Entrega
/// lado a lado" (`execucao-guincho-3opcoes.reference.html`, `telaC`): as duas
/// vistorias em meia largura, com o progresso de cada uma, a prévia da
/// comparação e a lista "Para concluir a OS" logo acima do botão.
///
/// Só desenha: tudo chega pronto em [props].
class ExecucaoGuinchoViewC extends StatelessWidget {
  const ExecucaoGuinchoViewC({required this.props, super.key});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final titleStyle = Theme.of(context).textTheme.titleSmall;
    return ErpScaffold(
      key: const Key('aparencia-execucao-guincho-C'),
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: 'Atendimento',
            subtitle: '${p.code} · ${p.customerName}',
            onBack: p.onBack,
            trailing: MobilePill(label: p.statusLabel, tone: p.statusPillTone),
          ),
          if (p.showOfflineBanner)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: NetworkStatusBanner(
                key: const ValueKey('guincho-c-sem-conexao'),
                status: NetworkStatus.offline,
                offlineMessage: p.offlineMessage,
              ),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if (p.showPendingBanner) ...[
                  SyncStatusBanner(
                    status: SyncStatus.pending,
                    message: p.pendingMessage,
                  ),
                  const SizedBox(height: 8),
                ],
                if (p.safeError != null) ...[
                  SyncStatusBanner(
                    status: SyncStatus.failed,
                    message: p.safeError!,
                  ),
                  const SizedBox(height: 8),
                ],
                Card(
                  margin: EdgeInsets.zero,
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 12,
                    ),
                    child: p.stepper,
                  ),
                ),
                const SizedBox(height: 12),
                if (p.showVistorias) ...[
                  Row(
                    children: [
                      Expanded(
                        child: Text('Coleta × Entrega', style: titleStyle),
                      ),
                      if (p.canCompare && p.compareModelTitle != null)
                        Flexible(
                          child: MobilePill(
                            label: p.compareModelTitle!,
                            tone: PillTone.neutral,
                          ),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (p.showStaleBanner) ...[
                    StaleDataBanner(
                      key: const ValueKey('guincho-c-desatualizado'),
                      message: p.staleMessage,
                      onRefresh: p.onRefresh,
                    ),
                    const SizedBox(height: 6),
                  ],
                  // A largura de cada cartão, medida por fora do
                  // `IntrinsicHeight` (CV2-2: o nome e o selo na mesma linha).
                  LayoutBuilder(
                    builder: (context, constraints) {
                      final cardWidth = (constraints.maxWidth - 10) / 2;
                      return IntrinsicHeight(
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            Expanded(
                              child: _phaseCard(
                                p.collection,
                                const Key('guincho-c-fase-coleta'),
                                cardWidth,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: _phaseCard(
                                p.delivery,
                                const Key('guincho-c-fase-entrega'),
                                cardWidth,
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 8),
                  if (p.canCompare) ...[
                    _CompareCard(props: p),
                    const SizedBox(height: 8),
                  ],
                ] else if (p.notice != null) ...[
                  Card(
                    margin: EdgeInsets.zero,
                    child: ListTile(
                      leading: Icon(p.notice!.icon),
                      title: Text(p.notice!.title),
                      subtitle: Text(p.notice!.subtitle),
                    ),
                  ),
                  const SizedBox(height: 8),
                ],
                if (p.canComplete) ...[
                  _ConcludeCard(props: p),
                  const SizedBox(height: 8),
                ],
                Card(
                  margin: EdgeInsets.zero,
                  child: ListTile(
                    leading: const Icon(Icons.build_outlined),
                    title: Text('${p.code} · ${p.workOrderTitle}'),
                    subtitle: Text(
                      p.vehiclePlate == null
                          ? p.customerName
                          : '${p.customerName} · ${p.vehiclePlate}',
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                p.locationCard,
                if (p.transitions.isNotEmpty) ...[
                  const SizedBox(height: 16),
                  Text('Próxima ação', style: titleStyle),
                  const SizedBox(height: 8),
                  for (final t in p.transitions)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: FilledButton.icon(
                        key: t.key,
                        onPressed: p.busy ? null : t.onPressed,
                        icon: Icon(t.icon),
                        label: Text(t.label),
                        style: FilledButton.styleFrom(backgroundColor: t.color),
                      ),
                    ),
                ],
                const SizedBox(height: 8),
                const Divider(),
                const SizedBox(height: 8),
                Text('Evidências', style: titleStyle),
                const SizedBox(height: 8),
                p.evidenceSection,
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _phaseCard(ExecucaoGuinchoFaseView f, Key key, double width) =>
      MobilePhaseCard(
        key: key,
        width: width,
        label: f.label,
        statusLabel: f.statusLabel,
        statusTone: f.statusTone,
        current: f.current,
        value: f.cardValue,
        valueSuffix: f.cardValue == null ? null : 'obrigatórios',
        progress: f.progress,
        meta: f.cardMeta,
        metaEmphasis: f.cardMetaEmphasis,
        message: f.message,
        actionLabel: f.shortActionLabel,
        actionSemanticLabel: f.actionLabel,
        actionIcon: f.actionIcon,
        onAction: f.onAction,
      );
}

/// "Comparar coleta × entrega", com a prévia do que mudou.
class _CompareCard extends StatelessWidget {
  const _CompareCard({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: EdgeInsets.zero,
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        key: const Key('guincho-c-comparar'),
        onTap: props.onCompare,
        child: ConstrainedBox(
          constraints: const BoxConstraints(minHeight: 64),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 12, 10),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: const BoxDecoration(
                    color: Color(0xFFEFF6FF),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.compare_arrows_outlined,
                    size: 20,
                    color: ErpMobileTheme.primary,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Comparar coleta × entrega',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: ErpMobileTheme.ink,
                        ),
                      ),
                      const SizedBox(height: 1),
                      Text(
                        props.compareText,
                        key: const Key('guincho-c-comparar-texto'),
                        style: const TextStyle(
                          fontSize: 12.5,
                          height: 17 / 12.5,
                          color: Color(0xFF475569),
                        ),
                      ),
                    ],
                  ),
                ),
                const Icon(
                  Icons.chevron_right,
                  size: 22,
                  color: ErpMobileTheme.inkMuted,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// "Para concluir a OS": o que falta, o botão e o porquê da trava.
class _ConcludeCard extends StatelessWidget {
  const _ConcludeCard({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    return Card(
      key: const Key('guincho-c-concluir'),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Para concluir a OS',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: ErpMobileTheme.ink,
              ),
            ),
            if (p.requirements.isNotEmpty) ...[
              const SizedBox(height: 10),
              MobileRequirementList(items: p.requirements),
            ],
            const SizedBox(height: 14),
            FilledButton.icon(
              onPressed: p.busy || !p.canConclude ? null : p.onConclude,
              icon: p.busy
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                    )
                  : const Icon(Icons.check_circle_outline),
              label: const Text('Concluir OS'),
              style: FilledButton.styleFrom(
                backgroundColor: p.canConclude ? ErpMobileTheme.success : null,
              ),
            ),
            if (p.lockMessage != null) ...[
              const SizedBox(height: 8),
              Text.rich(
                TextSpan(
                  children: [
                    const WidgetSpan(
                      alignment: PlaceholderAlignment.middle,
                      child: Padding(
                        padding: EdgeInsets.only(right: 6),
                        child: Icon(
                          Icons.lock_outline,
                          size: 16,
                          color: ErpMobileTheme.warning,
                        ),
                      ),
                    ),
                    TextSpan(text: p.lockMessage),
                  ],
                ),
                key: const Key('guincho-c-trava'),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontSize: 12.5,
                  height: 17 / 12.5,
                  color: ErpMobileTheme.warningInk,
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
