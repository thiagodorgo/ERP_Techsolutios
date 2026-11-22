import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/connectivity_repository.dart';
import '../../../shared/theme/erp_mobile_theme.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../../../shared/ui/mobile_kit.dart';
import '../../work_orders/domain/work_order_conclusion.dart';
import '../data/commissions_by_patio.dart' as commission;
import '../state/commissions_controller.dart';
import 'finance_section_switch.dart';

/// B-APP-ORG-2 (A3, tela) — a aba Comissões de Finanças: um bloco por pátio,
/// com o valor exato que o servidor manda (Emenda 1.8.3.5 §2; proposta
/// aprovada `painel/lote-comissoes-app.html`). A tela não soma, não arredonda
/// e não converte dinheiro: formata os centavos com [formatBrlCents].
///
/// Tela-modelo: `features/expenses/ui/expense_list_screen.dart`.
class CommissionsScreen extends ConsumerStatefulWidget {
  const CommissionsScreen({super.key});

  @override
  ConsumerState<CommissionsScreen> createState() => _CommissionsScreenState();
}

class _CommissionsScreenState extends ConsumerState<CommissionsScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _open());
  }

  void _open() {
    if (!mounted) return;
    final patios = ref.read(commissionPatiosProvider);
    if (patios == null) return;
    unawaited(
      ref.read(commissionsControllerProvider.notifier).open([
        for (final entry in patios) entry.patio,
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(commissionPatiosProvider, (_, _) => _open());
    ref.listen(networkStatusProvider, (previous, next) {
      if (next == NetworkStatus.online) _open();
    });
    final patios = ref.watch(commissionPatiosProvider);
    final states = ref.watch(commissionsControllerProvider);
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;
    final controller = ref.read(commissionsControllerProvider.notifier);
    final blocks = [
      for (final entry in patios ?? const <CommissionPatioEntry>[])
        CommissionPatioView(entry: entry, state: states[entry.patio.id]),
    ];
    final lastLoaded = _lastLoaded(blocks);

    if (patios == null) {
      return const ErpScaffold(
        showAppBar: false,
        body: _CommissionsFrame(onRefresh: null, children: [_SessionLoading()]),
      );
    }
    if (offline && lastLoaded == null) {
      return ErpScaffold(
        showAppBar: false,
        body: _CommissionsFrame(
          onRefresh: null,
          children: [
            EmptyState(
              icon: Icons.cloud_off_outlined,
              title: 'Sem conexão',
              message:
                  'As comissões aparecem quando o aparelho voltar à internet. '
                  'Elas não ficam guardadas no aparelho.',
              action: OutlinedButton(
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(64, 44),
                ),
                onPressed: () {
                  for (final block in blocks) {
                    unawaited(controller.retry(block.patio));
                  }
                },
                child: const Text('Tentar de novo'),
              ),
            ),
          ],
        ),
      );
    }

    return ErpScaffold(
      showAppBar: false,
      body: _CommissionsFrame(
        onRefresh: offline
            ? null
            : () => unawaited(
                controller.refresh([for (final b in blocks) b.patio]),
              ),
        children: [
          if (offline && lastLoaded != null)
            NetworkStatusBanner(
              status: NetworkStatus.offline,
              offlineMessage:
                  'Sem conexão. Mostrando o que foi carregado às '
                  '${commissionClock(lastLoaded)}.',
            ),
          for (final block in blocks) CommissionPatioBlock(block: block),
        ],
      ),
    );
  }

  static DateTime? _lastLoaded(List<CommissionPatioView> blocks) {
    DateTime? last;
    for (final block in blocks) {
      final at = block.state?.loadedAt;
      if (block.data == null || at == null) continue;
      if (last == null || at.isAfter(last)) last = at;
    }
    return last;
  }
}

/// O cabeçalho de Finanças, a troca "Despesas | Comissões" e a lista.
class _CommissionsFrame extends StatelessWidget {
  const _CommissionsFrame({required this.onRefresh, required this.children});

  final VoidCallback? onRefresh;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: ErpMobileTheme.pageBg,
      child: Column(
        children: [
          MobileScreenHeader(
            title: 'Finanças',
            subtitle: 'Sua comissão em cada pátio',
            trailing: IconButton(
              onPressed: onRefresh,
              icon: const Icon(Icons.refresh),
              tooltip: 'Atualizar as comissões',
            ),
          ),
          const FinanceSectionSwitch(current: FinanceSection.commissions),
          const Divider(height: 1, color: ErpMobileTheme.cardBorder),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 20),
              children: [
                for (var i = 0; i < children.length; i++) ...[
                  if (i > 0) const SizedBox(height: 12),
                  children[i],
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _SessionLoading extends StatelessWidget {
  const _SessionLoading();

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: 'Carregando as comissões',
      child: const Padding(
        padding: EdgeInsets.all(32),
        child: Center(child: CircularProgressIndicator()),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// O bloco de um pátio
// ---------------------------------------------------------------------------

/// O filtro da lista de um bloco: um mês da tendência, vindo do indicador "No
/// mês" ([fromIndicator]) ou de uma barra.
final class _MonthFilter {
  const _MonthFilter(this.index, {required this.fromIndicator});

  final int index;
  final bool fromIndicator;
}

class CommissionPatioBlock extends ConsumerStatefulWidget {
  const CommissionPatioBlock({required this.block, super.key});

  final CommissionPatioView block;

  @override
  ConsumerState<CommissionPatioBlock> createState() =>
      _CommissionPatioBlockState();
}

class _CommissionPatioBlockState extends ConsumerState<CommissionPatioBlock> {
  _MonthFilter? _filter;
  bool _showAll = false;

  String get _patioId => widget.block.patio.id;

  @override
  void didUpdateWidget(covariant CommissionPatioBlock oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.block.patio.id != _patioId) {
      _filter = null;
      _showAll = false;
    }
  }

  void _setFilter(_MonthFilter? next) {
    setState(() => _filter = next);
    ref.read(commissionOpenRowProvider.notifier).closeIn('$_patioId/');
  }

  void _toggleIndicator(int currentIndex) {
    final filter = _filter;
    _setFilter(
      filter != null && filter.fromIndicator
          ? null
          : _MonthFilter(currentIndex, fromIndicator: true),
    );
  }

  void _toggleBar(int index) {
    final filter = _filter;
    _setFilter(
      filter != null && !filter.fromIndicator && filter.index == index
          ? null
          : _MonthFilter(index, fromIndicator: false),
    );
  }

  @override
  Widget build(BuildContext context) {
    final block = widget.block;
    final state = block.state;
    final offline = ref.watch(networkStatusProvider) == NetworkStatus.offline;
    final controller = ref.read(commissionsControllerProvider.notifier);
    final result = state?.block;

    final String subtitle;
    final Widget content;
    if (state == null || (state.loading && result == null)) {
      if (state == null && offline) {
        subtitle = 'Sem conexão';
        content = const _BlockMessage(
          icon: Icons.cloud_off_outlined,
          title: 'Sem conexão',
          message:
              'As comissões deste pátio aparecem quando o aparelho voltar à '
              'internet.',
        );
      } else {
        subtitle = 'Carregando…';
        content = const _BlockLoading();
      }
    } else {
      switch (result!.status) {
        case commission.CommissionPatioBlockStatus.loaded:
          final loadedAt = commissionClock(state.loadedAt!);
          subtitle = state.loading
              ? 'Atualizando…'
              : offline
              ? 'Carregado às $loadedAt'
              : state.stale
              ? 'Última atualização às $loadedAt'
              : 'Atualizado às $loadedAt';
          content = _loadedContent(
            result.data!,
            stale: state.stale,
            staleAt: loadedAt,
            onRefresh: offline || state.loading
                ? null
                : () => unawaited(controller.retry(block.patio)),
          );
        case commission.CommissionPatioBlockStatus.failed:
          subtitle = state.loading
              ? 'Carregando…'
              : 'Falhou às ${commissionClock(state.attemptAt!)}';
          content = _BlockMessage(
            icon: Icons.error_outline,
            title: 'Não foi possível carregar as comissões deste pátio',
            message:
                'Os outros pátios continuam na tela. Tente de novo em '
                'instantes.',
            action: OutlinedButton(
              style: OutlinedButton.styleFrom(minimumSize: const Size(64, 44)),
              onPressed: state.loading
                  ? null
                  : () => unawaited(controller.retry(block.patio)),
              child: const Text('Tentar de novo'),
            ),
          );
        case commission.CommissionPatioBlockStatus.moduleNotEnabled:
          subtitle = 'Atualizado às ${commissionClock(state.loadedAt!)}';
          content = const _BlockMessage(
            icon: Icons.info_outline,
            title: 'Comissões não disponíveis neste pátio.',
            message: 'Este pátio não acompanha comissões pelo sistema.',
          );
        case commission.CommissionPatioBlockStatus.forbidden:
          subtitle = 'Atualizado às ${commissionClock(state.loadedAt!)}';
          // Sem acesso a um pátio (a frase da 1.8.3 §4): o mesmo desenho do
          // PermissionBlockedState, cuja tabela fechada de títulos (T1 do
          // B-SAN3-19b) é das telas inteiras, não de um bloco.
          content = const _BlockMessage(
            icon: Icons.lock_outline,
            title: 'Você não tem acesso às comissões deste pátio.',
            message:
                'Fale com o administrador do pátio se isso estiver errado.',
          );
      }
    }

    return Container(
      key: ValueKey('commission-block-$_patioId'),
      decoration: BoxDecoration(
        color: ErpMobileTheme.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: ErpMobileTheme.cardBorder),
      ),
      clipBehavior: Clip.antiAlias,
      padding: const EdgeInsets.fromLTRB(14, 14, 14, 6),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _PatioHeader(
            name: block.patio.name,
            subtitle: subtitle,
            isCurrent: block.entry.isCurrent,
          ),
          const SizedBox(height: 12),
          content,
        ],
      ),
    );
  }

  Widget _loadedContent(
    commission.CommissionPatioData data, {
    required bool stale,
    required String staleAt,
    required VoidCallback? onRefresh,
  }) {
    final months = data.months;
    final hasAny =
        data.calculations.isNotEmpty || months.any((month) => month.count > 0);
    if (!hasAny) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (stale) ...[
            StaleDataBanner(
              message:
                  'Sem atualização agora. Estes são os dados das $staleAt.',
              onRefresh: onRefresh,
            ),
            const SizedBox(height: 8),
          ],
          const _BlockMessage(
            icon: Icons.receipt_long_outlined,
            title: 'Nenhuma comissão ainda',
            message:
                'Quando um atendimento seu gerar comissão neste pátio, ela '
                'aparece aqui.',
          ),
        ],
      );
    }

    final currentIndex = months.length - 1;
    final filter = _filter;
    final captionIndex = filter?.index ?? currentIndex;
    final calculations = [...data.calculations]
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));
    final filtered = filter == null || months.isEmpty
        ? calculations
        : [
            for (final calculation in calculations)
              if (months[filter.index].month.contains(calculation.createdAt))
                calculation,
          ];
    final visible = filter != null || _showAll
        ? filtered
        : filtered.take(3).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        if (stale) ...[
          StaleDataBanner(
            message: 'Sem atualização agora. Estes são os dados das $staleAt.',
            onRefresh: onRefresh,
          ),
          const SizedBox(height: 12),
        ],
        // O lugar dos indicadores: "A receber" e "Pago no mês" entram aqui
        // quando o servidor mandar (P-APP-ORG-COMISSAO-A-RECEBER).
        Row(
          children: [
            Expanded(
              child: MobileStatTile(
                key: ValueKey('commission-indicator-$_patioId'),
                value: data.formattedTotal,
                label: _indicatorLabel(data),
                color: ErpMobileTheme.primary,
                selected: filter != null && filter.fromIndicator,
                onTap: months.isEmpty
                    ? null
                    : () => _toggleIndicator(currentIndex),
              ),
            ),
          ],
        ),
        if (months.isNotEmpty) ...[
          const SizedBox(height: 12),
          MobileSectionLabel('Últimos ${months.length} meses'),
          _MonthBars(
            patioId: _patioId,
            months: months,
            selectedIndex: filter != null && !filter.fromIndicator
                ? filter.index
                : null,
            onTap: _toggleBar,
          ),
          const SizedBox(height: 4),
          _MonthCaption(summary: months[captionIndex]),
        ],
        const SizedBox(height: 12),
        const MobileSectionLabel('Lançamentos'),
        if (filter != null)
          _FilterChip(
            label: filter.fromIndicator
                ? 'No mês'
                : _monthName(months[filter.index].month.start),
            onClear: () => _setFilter(null),
          ),
        if (visible.isEmpty)
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'Nenhum lançamento neste mês.',
              style: TextStyle(fontSize: 13, color: ErpMobileTheme.inkMuted),
            ),
          )
        else
          for (final calculation in visible)
            _CalculationRow(patioId: _patioId, calculation: calculation),
        if (filter == null && !_showAll && filtered.length > 3)
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              style: TextButton.styleFrom(minimumSize: const Size(64, 44)),
              onPressed: () => setState(() => _showAll = true),
              child: Text('Ver todos os ${filtered.length} lançamentos'),
            ),
          ),
      ],
    );
  }

  static String _indicatorLabel(commission.CommissionPatioData data) {
    final count = data.count == 1
        ? '1 atendimento'
        : '${data.count} atendimentos';
    final months = data.months;
    if (months.length < 2) return 'No mês · $count';
    final now = months[months.length - 1].totalCents;
    final before = months[months.length - 2].totalCents;
    final name = _monthName(
      months[months.length - 2].month.start,
    ).toLowerCase();
    final comparison = now > before
        ? '▲ acima de $name'
        : now < before
        ? '▼ abaixo de $name'
        : 'igual a $name';
    return 'No mês · $count\n$comparison';
  }
}

class _PatioHeader extends StatelessWidget {
  const _PatioHeader({
    required this.name,
    required this.subtitle,
    required this.isCurrent,
  });

  final String name;
  final String subtitle;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    final (bg, _) = MobilePill.colorsFor(PillTone.info);
    return Row(
      children: [
        ExcludeSemantics(
          child: Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
            child: const Icon(
              Icons.home_work_outlined,
              size: 18,
              color: ErpMobileTheme.primary,
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                name,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.w800,
                  color: ErpMobileTheme.ink,
                ),
              ),
              Text(
                subtitle,
                style: const TextStyle(
                  fontSize: 11.5,
                  color: ErpMobileTheme.inkMuted,
                ),
              ),
            ],
          ),
        ),
        if (isCurrent) ...[
          const SizedBox(width: 8),
          const MobilePill(label: 'Pátio atual', tone: PillTone.info),
        ],
      ],
    );
  }
}

class _BlockMessage extends StatelessWidget {
  const _BlockMessage({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: icon,
      title: title,
      message: message,
      action: action,
    );
  }
}

class _BlockLoading extends StatelessWidget {
  const _BlockLoading();

  @override
  Widget build(BuildContext context) {
    // O esqueleto: o indicador, as barras e uma linha.
    final decoration = BoxDecoration(
      color: ErpMobileTheme.cardBorder,
      borderRadius: BorderRadius.circular(8),
    );
    Widget bone(SizedBox size) =>
        DecoratedBox(decoration: decoration, child: size);
    return Semantics(
      container: true,
      label: 'Carregando as comissões deste pátio',
      child: ExcludeSemantics(
        child: Padding(
          padding: const EdgeInsets.only(bottom: 8),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              bone(const SizedBox(height: 84)),
              const SizedBox(height: 12),
              bone(const SizedBox(height: 86)),
              const SizedBox(height: 12),
              bone(const SizedBox(height: 48)),
            ],
          ),
        ),
      ),
    );
  }
}

/// As barras dos últimos meses. A altura de cada barra é uma proporção em
/// `flex` inteiro (o mês × o maior mês): geometria, nenhum valor sai dela. O
/// valor do mês aparece exato, no texto abaixo, ao tocar.
class _MonthBars extends StatelessWidget {
  const _MonthBars({
    required this.patioId,
    required this.months,
    required this.selectedIndex,
    required this.onTap,
  });

  final String patioId;
  final List<commission.CommissionMonthSummary> months;
  final int? selectedIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    var maxCents = 0;
    for (final month in months) {
      if (month.totalCents > maxCents) maxCents = month.totalCents;
    }
    final last = months.length - 1;
    return SizedBox(
      height: 92,
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          for (var i = 0; i < months.length; i++)
            Expanded(
              child: _MonthBar(
                key: ValueKey('commission-bar-$patioId-$i'),
                summary: months[i],
                maxCents: maxCents,
                current: i == last,
                selected: i == selectedIndex,
                onTap: () => onTap(i),
              ),
            ),
        ],
      ),
    );
  }
}

class _MonthBar extends StatelessWidget {
  const _MonthBar({
    required this.summary,
    required this.maxCents,
    required this.current,
    required this.selected,
    required this.onTap,
    super.key,
  });

  final commission.CommissionMonthSummary summary;
  final int maxCents;
  final bool current;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final cents = summary.totalCents;
    final color = selected
        ? ErpMobileTheme.primaryDark
        : current
        ? ErpMobileTheme.primary
        : ErpMobileTheme.primary.withValues(alpha: 0.30);
    final start = summary.month.start;
    final rest = maxCents - cents;
    return Semantics(
      button: true,
      selected: selected,
      label:
          '${_monthName(start)}: ${summary.formattedTotal}, '
          '${_attendances(summary.count)}',
      excludeSemantics: true,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        focusColor: ErpMobileTheme.primary.withValues(alpha: 0.16),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 6),
          child: Column(
            children: [
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.end,
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    if (cents > 0 && rest > 0) Spacer(flex: rest),
                    if (cents > 0) ...[
                      Expanded(
                        flex: cents,
                        child: ColoredBox(color: color),
                      ),
                      SizedBox(height: 3, child: ColoredBox(color: color)),
                    ],
                  ],
                ),
              ),
              const SizedBox(height: 4),
              Text(
                _monthShort(start),
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: current || selected
                      ? ErpMobileTheme.primary
                      : ErpMobileTheme.inkMuted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _MonthCaption extends StatelessWidget {
  const _MonthCaption({required this.summary});

  final commission.CommissionMonthSummary summary;

  @override
  Widget build(BuildContext context) {
    return Text.rich(
      TextSpan(
        style: const TextStyle(fontSize: 12, color: ErpMobileTheme.inkMuted),
        children: [
          TextSpan(text: '${_monthName(summary.month.start)}: '),
          TextSpan(
            text: summary.formattedTotal,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
              color: ErpMobileTheme.ink,
            ),
          ),
          TextSpan(text: ' · ${_attendances(summary.count)}'),
        ],
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.onClear});

  final String label;
  final VoidCallback onClear;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Text(
          'Filtrando:',
          style: TextStyle(fontSize: 12, color: ErpMobileTheme.inkMuted),
        ),
        const SizedBox(width: 6),
        InputChip(
          label: Text(label),
          onPressed: onClear,
          onDeleted: onClear,
          deleteButtonTooltipMessage: 'Tirar o filtro',
          tooltip: 'Tirar o filtro',
        ),
      ],
    );
  }
}

class _CalculationRow extends ConsumerWidget {
  const _CalculationRow({required this.patioId, required this.calculation});

  final String patioId;
  final commission.CommissionCalculation calculation;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final key = '$patioId/${calculation.id}';
    final expanded = ref.watch(commissionOpenRowProvider) == key;
    final (label, tone) = commissionStatusLabel(calculation);
    final settledAt = calculation.settledAt;
    return MobileExpandableRow(
      key: ValueKey('commission-row-$key'),
      title: calculation.formattedAmount,
      meta: ' · ${_dayShort(calculation.createdAt)}',
      trailing: MobilePill(label: label, tone: tone),
      expanded: expanded,
      onToggle: () => ref.read(commissionOpenRowProvider.notifier).toggle(key),
      detail: Padding(
        padding: const EdgeInsets.fromLTRB(14, 10, 14, 12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _DetailLine('Valor', calculation.formattedAmount),
            _DetailLine('Situação', commissionSituation(calculation.status)),
            _DetailLine('Gerada em', _dateTimeLong(calculation.createdAt)),
            _DetailLine(
              'Paga em',
              settledAt == null ? 'Ainda não paga' : _dateLong(settledAt),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailLine extends StatelessWidget {
  const _DetailLine(this.label, this.value);

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 96,
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 13,
                color: ErpMobileTheme.inkMuted,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13,
                fontWeight: FontWeight.w700,
                color: ErpMobileTheme.ink,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Textos (PT-BR, sem termo técnico)
// ---------------------------------------------------------------------------

/// A situação de um lançamento, como o guincheiro lê.
String commissionSituation(String status) => switch (status) {
  'pending' => 'Pendente',
  'calculated' => 'Calculada',
  'approved' => 'Aprovada',
  'disputed' => 'Em contestação',
  'rejected' => 'Recusada',
  'reversed' => 'Estornada',
  _ => 'Em análise',
};

/// A pílula da linha: "Paga" quando o servidor diz que foi paga; senão, a
/// situação.
(String, PillTone) commissionStatusLabel(
  commission.CommissionCalculation calculation,
) {
  if (calculation.settledAt != null) return ('Paga', PillTone.done);
  final tone = switch (calculation.status) {
    'calculated' => PillTone.info,
    'approved' => PillTone.purple,
    'disputed' => PillTone.warning,
    'rejected' || 'reversed' => PillTone.danger,
    _ => PillTone.neutral,
  };
  return (commissionSituation(calculation.status), tone);
}

const _monthNames = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

String _monthName(DateTime day) => _monthNames[day.month - 1];

String _monthShort(DateTime day) => _monthName(day).substring(0, 3);

String _two(int value) => value.toString().padLeft(2, '0');

/// "14:32", no fuso do aparelho.
String commissionClock(DateTime moment) {
  final local = moment.toLocal();
  return '${_two(local.hour)}:${_two(local.minute)}';
}

String _dayShort(DateTime moment) {
  final local = moment.toLocal();
  return '${_two(local.day)} ${_monthShort(local).toLowerCase()}';
}

String _dateLong(DateTime moment) {
  final local = moment.toLocal();
  return '${_two(local.day)}/${_two(local.month)}/${local.year}';
}

String _dateTimeLong(DateTime moment) =>
    '${_dateLong(moment)} às ${commissionClock(moment)}';

String _attendances(int count) =>
    count == 1 ? '1 atendimento' : '$count atendimentos';
