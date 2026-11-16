import 'package:flutter/material.dart';

import '../../../../core/network/connectivity_repository.dart';
import '../../../../core/sync/sync_models.dart';
import '../../../../shared/theme/erp_mobile_theme.dart';
import '../../../../shared/ui/erp_components.dart';
import '../../../../shared/ui/erp_scaffold.dart';
import '../../../../shared/ui/mobile_kit.dart';
import 'execucao_guincho_aparencias_shared.dart';

/// B-APP-APARENCIA (F2) — a execução do guincho na opção B, "Guiada por
/// fases" (`execucao-guincho-3opcoes.reference.html`, `telaB`): o título diz a
/// fase, os passos ficam presos no topo, a linha do tempo mostra coleta →
/// comparação → entrega → conclusão, e a próxima ação mora numa barra fixa.
/// Pausar, aprovação e exceção vão para "Mais ações".
///
/// Só desenha: tudo chega pronto em [props].
class ExecucaoGuinchoViewB extends StatelessWidget {
  const ExecucaoGuinchoViewB({required this.props, super.key});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final (title, subtitle) = execucaoGuinchoTituloB(p);
    return ErpScaffold(
      key: const Key('aparencia-execucao-guincho-B'),
      showAppBar: false,
      body: Column(
        children: [
          MobileScreenHeader(
            title: title,
            subtitle: subtitle,
            onBack: p.onBack,
            trailing: _HeaderTrailing(props: p),
          ),
          Container(
            key: const Key('guincho-b-passos'),
            padding: const EdgeInsets.fromLTRB(8, 6, 8, 8),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                bottom: BorderSide(color: ErpMobileTheme.cardBorder),
              ),
            ),
            child: p.stepper,
          ),
          if (p.showOfflineBanner)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
              child: NetworkStatusBanner(
                key: const ValueKey('guincho-b-sem-conexao'),
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
                if (p.showStaleBanner) ...[
                  StaleDataBanner(
                    key: const ValueKey('guincho-b-desatualizado'),
                    message: p.staleMessage,
                    onRefresh: p.onRefresh,
                  ),
                  const SizedBox(height: 6),
                ],
                if (p.showVistorias)
                  Card(
                    key: const Key('guincho-b-linha-do-tempo'),
                    margin: EdgeInsets.zero,
                    child: _Timeline(props: p),
                  )
                else if (p.notice != null)
                  Card(
                    margin: EdgeInsets.zero,
                    child: ListTile(
                      leading: Icon(p.notice!.icon),
                      title: Text(p.notice!.title),
                      subtitle: Text(p.notice!.subtitle),
                    ),
                  ),
                for (final notice in [p.deliveryQueueNotice, p.queueNotice])
                  if (notice != null) ...[
                    const SizedBox(height: 8),
                    SyncStatusBanner(
                      key: const ValueKey('guincho-b-aviso-fila'),
                      status: SyncStatus.pending,
                      message: notice,
                    ),
                  ],
                const SizedBox(height: 8),
                _OsCard(props: p),
                const SizedBox(height: 8),
                p.locationCard,
                const SizedBox(height: 16),
                Text(
                  'Evidências',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
                const SizedBox(height: 8),
                p.evidenceSection,
              ],
            ),
          ),
          if (p.nextAction != null) _NextActionBar(props: p),
        ],
      ),
    );
  }
}

/// A pílula da fase e o menu "Mais ações" no cabeçalho.
class _HeaderTrailing extends StatelessWidget {
  const _HeaderTrailing({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final pill = switch (p.fase) {
      ExecucaoGuinchoFase.coleta => const MobilePill(
        label: 'Coleta',
        tone: PillTone.info,
      ),
      ExecucaoGuinchoFase.semFase => MobilePill(
        label: p.statusLabel,
        tone: p.statusPillTone,
      ),
      _ => const MobilePill(label: 'Entrega', tone: PillTone.info),
    };
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        pill,
        if (p.transitions.isNotEmpty)
          PopupMenuButton<int>(
            key: const Key('guincho-b-mais-acoes'),
            tooltip: 'Mais ações',
            enabled: !p.busy,
            icon: const Icon(Icons.more_vert, color: ErpMobileTheme.ink),
            onSelected: (i) => p.transitions[i].onPressed(),
            itemBuilder: (_) => [
              for (var i = 0; i < p.transitions.length; i++)
                PopupMenuItem<int>(
                  value: i,
                  child: Row(
                    children: [
                      Icon(
                        p.transitions[i].icon,
                        color: p.transitions[i].color,
                      ),
                      const SizedBox(width: 12),
                      Flexible(
                        child: Text(
                          p.transitions[i].menuLabel,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          )
        else
          const SizedBox(width: 4),
      ],
    );
  }
}

/// A linha do tempo das vistorias: coleta, a comparação, a entrega e a
/// conclusão da OS.
class _Timeline extends StatelessWidget {
  const _Timeline({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final col = p.collection;
    final ent = p.delivery;
    final locked = p.lockTitle != null;
    return MobilePhaseTimeline(
      title: 'Vistorias do guincho',
      titleTrailing: p.canCompare
          ? const MobilePill(label: 'Mesmo modelo', tone: PillTone.neutral)
          : null,
      nodes: [
        MobilePhaseNode(
          key: const Key('guincho-b-no-coleta'),
          title: 'Vistoria de coleta',
          state: col.nodeState,
          marker: col.marker,
          pills: _pills(col),
          meta: col.timelineMeta,
          progress: col.nodeState == MobilePhaseState.active
              ? col.progress
              : null,
          progressLabel: 'Coleta',
          footer: _footer(
            col,
            compare: p.canCompare ? _CompareRow(props: p) : null,
          ),
        ),
        MobilePhaseNode(
          key: const Key('guincho-b-no-entrega'),
          title: 'Vistoria de entrega',
          state: ent.nodeState,
          marker: ent.marker,
          pills: _pills(ent),
          meta: ent.message ?? ent.timelineMeta,
          progress: ent.nodeState == MobilePhaseState.active
              ? ent.progress
              : null,
          progressLabel: 'Entrega',
          footer: _footer(ent),
        ),
        if (p.canComplete)
          MobilePhaseNode(
            key: const Key('guincho-b-no-conclusao'),
            title: 'Conclusão da OS',
            state: locked ? MobilePhaseState.locked : MobilePhaseState.active,
            marker: locked ? Icons.lock_outline : Icons.flag_outlined,
            pills: [
              MobilePill(
                label: locked ? 'Travada' : 'Liberada',
                tone: locked ? PillTone.warning : PillTone.done,
              ),
            ],
            meta: locked ? p.lockMessage : p.conclusionMeta,
          ),
      ],
    );
  }

  List<Widget> _pills(ExecucaoGuinchoFaseView f) => [
    MobilePill(label: f.statusLabel, tone: f.statusTone),
    if (f.queuePill != null)
      MobilePill(label: f.queuePill!.$1, tone: f.queuePill!.$2),
  ];

  Widget? _footer(ExecucaoGuinchoFaseView f, {Widget? compare}) {
    final action = f.nodeAction && f.actionLabel != null
        ? Align(
            alignment: Alignment.centerLeft,
            // CV2-3: "Ver vistoria de …" é link de texto; só "Atualizar" leva
            // o ícone, como na referência.
            child: TextButton.icon(
              onPressed: f.onAction,
              style: TextButton.styleFrom(
                minimumSize: const Size(64, 44),
                padding: const EdgeInsets.symmetric(horizontal: 8),
              ),
              icon: f.nodeActionIcon == null
                  ? null
                  : Icon(f.nodeActionIcon, size: 18),
              label: Text(f.actionLabel!),
            ),
          )
        : null;
    if (action == null && compare == null) return null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ?action,
        if (compare != null) ...[const SizedBox(height: 6), compare],
      ],
    );
  }
}

/// A linha "Comparar coleta × entrega" entre a coleta e a entrega.
class _CompareRow extends StatelessWidget {
  const _CompareRow({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    // CV2-4: a borda tracejada da referência (`m-row`).
    return MobileDashedBorder(
      child: Material(
        color: const Color(0xFFF8FAFF),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        child: InkWell(
          key: const Key('guincho-b-comparar'),
          onTap: props.onCompare,
          borderRadius: BorderRadius.circular(10),
          child: ConstrainedBox(
            constraints: const BoxConstraints(minHeight: 48),
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 8, 6),
              child: Row(
                children: [
                  const Icon(
                    Icons.compare_arrows_outlined,
                    size: 20,
                    color: ErpMobileTheme.primary,
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
                            fontWeight: FontWeight.w600,
                            color: ErpMobileTheme.primary,
                          ),
                        ),
                        Text(
                          props.timelineCompareText,
                          style: const TextStyle(
                            fontSize: 12,
                            height: 16 / 12,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                      ],
                    ),
                  ),
                  const Icon(
                    Icons.chevron_right,
                    size: 20,
                    color: ErpMobileTheme.inkMuted,
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

/// O cartão da OS: código, tipo, cliente, serviço e endereço.
class _OsCard extends StatelessWidget {
  const _OsCard({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final grid = <(String, String)>[
      ('Serviço', p.workOrderTitle),
      if (p.vehiclePlate != null) ('Viatura', p.vehiclePlate!),
      if (p.teamName != null) ('Equipe', p.teamName!),
    ];
    return Card(
      key: const Key('guincho-b-cartao-os'),
      margin: EdgeInsets.zero,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    p.code,
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: ErpMobileTheme.primary,
                    ),
                  ),
                ),
                MobilePill(label: p.serviceTypeLabel, tone: PillTone.info),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              p.customerName,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.w800,
                color: ErpMobileTheme.ink,
              ),
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: ErpMobileTheme.pageBg),
            const SizedBox(height: 10),
            Wrap(
              spacing: 12,
              runSpacing: 8,
              children: [
                for (final (label, value) in grid)
                  SizedBox(
                    width: 140,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label.toUpperCase(),
                          style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w700,
                            letterSpacing: 0.5,
                            color: ErpMobileTheme.inkMuted,
                          ),
                        ),
                        Text(
                          value,
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: ErpMobileTheme.ink,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.place_outlined,
                  size: 16,
                  color: ErpMobileTheme.inkMuted,
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    p.address,
                    style: const TextStyle(
                      fontSize: 12.5,
                      height: 1.4,
                      color: Color(0xFF475569),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// A barra fixa: o texto de apoio e a próxima ação.
class _NextActionBar extends StatelessWidget {
  const _NextActionBar({required this.props});

  final ExecucaoGuinchoViewProps props;

  @override
  Widget build(BuildContext context) {
    final p = props;
    final next = p.nextAction!;
    final Widget button = switch (next.kind) {
      ExecucaoGuinchoAcao.abrirColeta => _open(p.collection),
      ExecucaoGuinchoAcao.abrirEntrega => _open(p.delivery),
      ExecucaoGuinchoAcao.concluir => FilledButton.icon(
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
    };
    return MobileStickyBar(
      key: const Key('guincho-b-barra'),
      supportingText: next.supportingText.isEmpty ? null : next.supportingText,
      supportingTextColor: next.locked ? ErpMobileTheme.warningInk : null,
      children: [
        Expanded(
          child: KeyedSubtree(
            key: const Key('guincho-b-proxima-acao'),
            child: button,
          ),
        ),
      ],
    );
  }

  Widget _open(ExecucaoGuinchoFaseView f) => FilledButton.icon(
    onPressed: f.onAction,
    icon: Icon(f.actionIcon),
    label: Text(f.actionLabel ?? ''),
  );
}
