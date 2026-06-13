import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/expense_repository.dart';
import '../domain/expense_models.dart';
import '../services/expense_policy_evaluator.dart';
import '../services/expense_totals_calculator.dart';

// ---------------------------------------------------------------------------
// Status group filter
// ---------------------------------------------------------------------------

enum _PcGroup { all, draft, submitted, approved, returned }

extension _PcGroupX on _PcGroup {
  String get label => switch (this) {
    _PcGroup.all => 'Todos',
    _PcGroup.draft => 'Rascunho',
    _PcGroup.submitted => 'Enviados',
    _PcGroup.approved => 'Aprovados',
    _PcGroup.returned => 'Devolvidos',
  };

  bool matches(ExpenseReportStatus s) => switch (this) {
    _PcGroup.all => true,
    _PcGroup.draft =>
      s == ExpenseReportStatus.draft ||
          s == ExpenseReportStatus.syncPending ||
          s == ExpenseReportStatus.readyToSubmit,
    _PcGroup.submitted =>
      s == ExpenseReportStatus.submitted ||
          s == ExpenseReportStatus.underReview,
    _PcGroup.approved =>
      s == ExpenseReportStatus.approvedManager ||
          s == ExpenseReportStatus.approvedFinance ||
          s == ExpenseReportStatus.scheduledForPayment ||
          s == ExpenseReportStatus.paid,
    _PcGroup.returned =>
      s == ExpenseReportStatus.returned || s == ExpenseReportStatus.rejected,
  };
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

class ExpenseListScreen extends ConsumerStatefulWidget {
  const ExpenseListScreen({super.key});

  @override
  ConsumerState<ExpenseListScreen> createState() => _ExpenseListScreenState();
}

class _ExpenseListScreenState extends ConsumerState<ExpenseListScreen> {
  _PcGroup _group = _PcGroup.all;

  @override
  Widget build(BuildContext context) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);
    final repository = ref.watch(expenseRepositoryProvider);
    final canCreate = session == null
        ? false
        : const PermissionResolver().has(
            session.permissions,
            'expense_report:create',
          );

    return ErpScaffold(
      title: 'Gestao de Despesas',
      floatingActionButton: FloatingActionButton.extended(
        onPressed: canCreate ? () => context.go('/expenses/new') : null,
        icon: const Icon(Icons.add),
        label: const Text('Nova Prestação de Contas'),
      ),
      body: FutureBuilder<void>(
        future: repository.load(),
        builder: (context, snapshot) {
          final all = repository.reports;
          final filtered = all.where((r) => _group.matches(r.status)).toList();

          final aggTotal = all.fold<double>(
            0,
            (s, r) => s + const ExpenseTotalsCalculator().calculate(r).total,
          );
          final aggAdvance = all.fold<double>(
            0,
            (s, r) => s + (r.advance?.amount ?? 0),
          );
          final aggDiff = aggTotal - aggAdvance;
          final isReceivable = aggDiff >= 0;

          return Column(
            children: [
              if (session != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
                  child: TenantContextBar(session: session),
                ),
              if (all.isNotEmpty)
                _SummaryHeader(
                  total: aggTotal,
                  advance: aggAdvance,
                  difference: aggDiff.abs(),
                  isReceivable: isReceivable,
                ),
              if (!canCreate && session != null)
                const Padding(
                  padding: EdgeInsets.symmetric(horizontal: 16),
                  child: PermissionBlockedState(
                    title: 'Criacao bloqueada',
                    message:
                        'O bootstrap atual nao possui expense_report:create.',
                  ),
                ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
                child: Row(
                  children: [
                    for (final g in _PcGroup.values)
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(g.label),
                          selected: _group == g,
                          onSelected: (_) => setState(() => _group = g),
                        ),
                      ),
                  ],
                ),
              ),
              Expanded(
                child: filtered.isEmpty
                    ? ListView(
                        children: [
                          EmptyState(
                            icon: Icons.receipt_long_outlined,
                            title: _group == _PcGroup.all
                                ? 'Nenhuma Prestação de Contas local'
                                : 'Nenhum relatorio nesta categoria',
                            message: _group == _PcGroup.all
                                ? 'Crie uma Prestação de Contas para iniciar a fila local-first.'
                                : 'Nenhum relatorio corresponde ao filtro selecionado.',
                            action: _group == _PcGroup.all && canCreate
                                ? FilledButton(
                                    onPressed: () =>
                                        context.go('/expenses/new'),
                                    child: const Text(
                                      'Nova Prestação de Contas',
                                    ),
                                  )
                                : null,
                          ),
                        ],
                      )
                    : ListView.builder(
                        padding: const EdgeInsets.fromLTRB(16, 4, 16, 16),
                        itemCount: filtered.length,
                        itemBuilder: (context, i) {
                          final report = filtered[i];
                          final totals = const ExpenseTotalsCalculator()
                              .calculate(report);
                          final violations = const ExpensePolicyEvaluator()
                              .evaluate(
                                report: report,
                                policy: repository.activePolicy,
                              );
                          return Column(
                            key: ValueKey(report.localId),
                            children: [
                              ExpenseReportCard(
                                report: report,
                                totals: totals,
                                onTap: () =>
                                    context.go('/expenses/${report.localId}'),
                              ),
                              PolicyViolationBanner(violations: violations),
                            ],
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Summary header
// ---------------------------------------------------------------------------

class _SummaryHeader extends StatelessWidget {
  const _SummaryHeader({
    required this.total,
    required this.advance,
    required this.difference,
    required this.isReceivable,
  });

  final double total;
  final double advance;
  final double difference;
  final bool isReceivable;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Card(
      margin: const EdgeInsets.fromLTRB(16, 8, 16, 0),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Total acumulado', style: theme.textTheme.labelSmall),
            Text(
              formatCurrency(total),
              style: theme.textTheme.headlineSmall?.copyWith(
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Adiantamento: ${formatCurrency(advance)}',
              style: theme.textTheme.bodySmall,
            ),
            const Divider(height: 16),
            Row(
              children: [
                Expanded(
                  child: _AmountTile(
                    label: isReceivable ? 'A receber' : 'A devolver',
                    value: difference,
                    isPositive: isReceivable,
                  ),
                ),
                Expanded(
                  child: _AmountTile(
                    label: 'Adiantamento',
                    value: advance,
                    isPositive: null,
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

class _AmountTile extends StatelessWidget {
  const _AmountTile({
    required this.label,
    required this.value,
    required this.isPositive,
  });

  final String label;
  final double value;
  final bool? isPositive;

  @override
  Widget build(BuildContext context) {
    final color = isPositive == null
        ? Theme.of(context).colorScheme.onSurface
        : isPositive!
        ? const Color(0xFF127A55)
        : const Color(0xFFB33333);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        Text(
          formatCurrency(value),
          style: Theme.of(context).textTheme.titleMedium?.copyWith(
            color: color,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}
