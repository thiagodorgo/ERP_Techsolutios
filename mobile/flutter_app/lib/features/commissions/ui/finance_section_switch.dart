import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/theme/erp_mobile_theme.dart';

/// B-APP-ORG-2 (A3, tela) — a troca "Despesas | Comissões" no topo de
/// Finanças (decisão do dono `D-DONO-2111-TELA-COMISSOES`, item 1). A barra de
/// baixo não muda: as duas rotas ficam sob `/expenses`, que acende Finanças.
const commissionsRoutePath = '/expenses/commissions';

enum FinanceSection { expenses, commissions }

class FinanceSectionSwitch extends StatelessWidget {
  const FinanceSectionSwitch({required this.current, super.key});

  final FinanceSection current;

  static String pathFor(FinanceSection section) => switch (section) {
    FinanceSection.expenses => '/expenses',
    FinanceSection.commissions => commissionsRoutePath,
  };

  @override
  Widget build(BuildContext context) {
    return Container(
      color: ErpMobileTheme.surface,
      padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
      child: SegmentedButton<FinanceSection>(
        segments: const [
          ButtonSegment(
            value: FinanceSection.expenses,
            label: Text('Despesas'),
          ),
          ButtonSegment(
            value: FinanceSection.commissions,
            label: Text('Comissões'),
          ),
        ],
        selected: {current},
        showSelectedIcon: false,
        expandedInsets: EdgeInsets.zero,
        onSelectionChanged: (selection) {
          final next = selection.single;
          if (next != current) context.go(pathFor(next));
        },
        style: ButtonStyle(
          minimumSize: const WidgetStatePropertyAll(Size(0, 44)),
          tapTargetSize: MaterialTapTargetSize.padded,
          backgroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? ErpMobileTheme.surface
                : ErpMobileTheme.pageBg,
          ),
          foregroundColor: WidgetStateProperty.resolveWith(
            (states) => states.contains(WidgetState.selected)
                ? ErpMobileTheme.primary
                : ErpMobileTheme.inkMuted,
          ),
          side: const WidgetStatePropertyAll(
            BorderSide(color: ErpMobileTheme.cardBorder),
          ),
          textStyle: const WidgetStatePropertyAll(
            TextStyle(fontSize: 13.5, fontWeight: FontWeight.w700),
          ),
        ),
      ),
    );
  }
}
