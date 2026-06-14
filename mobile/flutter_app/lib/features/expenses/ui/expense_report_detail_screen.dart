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

class ExpenseReportDetailScreen extends ConsumerWidget {
  const ExpenseReportDetailScreen({required this.reportId, super.key});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repository = ref.watch(expenseRepositoryProvider);
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (value) => value, orElse: () => null);

    return FutureBuilder<void>(
      future: repository.load(),
      builder: (context, snapshot) {
        final report = _findReport(repository.reports, reportId);

        if (report == null) {
          return const ErpScaffold(
            title: 'Prestação de Contas',
            body: EmptyState(
              icon: Icons.search_off_outlined,
              title: 'Prestação de Contas nao encontrada',
              message: 'O relatorio nao existe no cache local deste tenant.',
            ),
          );
        }

        final totals = const ExpenseTotalsCalculator().calculate(report);
        final violations = const ExpensePolicyEvaluator().evaluate(
          report: report,
          policy: repository.activePolicy,
        );
        final canSubmit = const PermissionResolver().has(
          session?.permissions ?? const PermissionSet(<String>{}),
          'expense_report:submit',
        );

        return ErpScaffold(
          title: report.title,
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Status + totals header
              _TotalsHeader(report: report, totals: totals),
              const SizedBox(height: 8),
              PolicyViolationBanner(violations: violations),
              const SizedBox(height: 8),
              Text('Itens', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 8),
              if (report.items.isEmpty)
                EmptyState(
                  icon: Icons.add_card_outlined,
                  title: 'Sem itens',
                  message:
                      'Adicione uma despesa para calcular totais e politica.',
                  action: FilledButton(
                    onPressed: () =>
                        context.go('/expenses/$reportId/items/new'),
                    child: const Text('Adicionar item'),
                  ),
                ),
              for (final item in report.items)
                _ExpenseItemCard(
                  key: ValueKey(item.localId),
                  item: item,
                  violations: violations
                      .where((v) => v.itemLocalId == item.localId)
                      .toList(),
                  onTap: () => context.go(
                    '/expenses/$reportId/items/${item.localId}/receipts',
                  ),
                ),
              const ApprovalDecisionCard(
                title: 'Aprovacao futura',
                message:
                    'Manager/finance poderao devolver, rejeitar ou aprovar quando o backend workflow estiver conectado.',
              ),
              const SizedBox(height: 12),
              FilledButton.icon(
                onPressed: () => context.go('/expenses/$reportId/items/new'),
                icon: const Icon(Icons.add),
                label: const Text('Adicionar item'),
              ),
              const SizedBox(height: 8),
              OutlinedButton.icon(
                onPressed: canSubmit
                    ? () => context.go('/expenses/$reportId/submit')
                    : null,
                icon: const Icon(Icons.send_outlined),
                label: const Text('Resumo e submissao'),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Totals header
// ---------------------------------------------------------------------------

class _TotalsHeader extends StatelessWidget {
  const _TotalsHeader({required this.report, required this.totals});

  final ExpenseReport report;
  final ExpenseTotals totals;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Align(
              alignment: Alignment.centerRight,
              child: OperationalStatusChip(
                label: report.status.label,
                status: report.status.statusTone,
              ),
            ),
            const SizedBox(height: 8),
            Row(
              children: [
                Expanded(
                  child: _AmountCell(
                    label: 'Total',
                    value: formatCurrency(totals.total),
                  ),
                ),
                Expanded(
                  child: _AmountCell(
                    label: 'Adiantamento',
                    value: formatCurrency(totals.advance),
                  ),
                ),
                Expanded(
                  child: _AmountCell(
                    label: settlementLabel(totals),
                    value: formatCurrency(totals.difference),
                    highlight: totals.kind == ExpenseSettlementKind.receivable
                        ? const Color(0xFF127A55)
                        : totals.kind == ExpenseSettlementKind.refundable
                        ? const Color(0xFFB33333)
                        : null,
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

class _AmountCell extends StatelessWidget {
  const _AmountCell({required this.label, required this.value, this.highlight});

  final String label;
  final String value;
  final Color? highlight;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelSmall),
        Text(
          value,
          style: Theme.of(context).textTheme.titleSmall?.copyWith(
            color: highlight,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// Item card with inline policy tags
// ---------------------------------------------------------------------------

class _ExpenseItemCard extends StatelessWidget {
  const _ExpenseItemCard({
    required this.item,
    required this.violations,
    required this.onTap,
    super.key,
  });

  final ExpenseItem item;
  final List<PolicyViolation> violations;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasBlocking = violations.any(
      (v) => v.severity == PolicyViolationSeverity.blocking,
    );
    final hasReceipt = item.receipts.isNotEmpty;

    return Card(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(
                    Icons.payments_outlined,
                    color: hasBlocking
                        ? const Color(0xFFB33333)
                        : Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          formatCurrency(item.amount),
                          style: Theme.of(context).textTheme.titleSmall
                              ?.copyWith(fontWeight: FontWeight.w700),
                        ),
                        Text(
                          '${item.categoryId}'
                          '${item.vendorName != null ? ' · ${item.vendorName}' : ''}',
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ],
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 18),
                ],
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 6,
                runSpacing: 4,
                children: [
                  if (!hasReceipt)
                    _PolicyTag(
                      label: 'Recibo pendente',
                      status: 'warning',
                      icon: Icons.warning_amber_outlined,
                    )
                  else
                    _PolicyTag(
                      label: 'Recibo OK',
                      status: 'success',
                      icon: Icons.check_circle_outline,
                    ),
                  for (final v in violations)
                    _PolicyTag(
                      label: _violationLabel(v.code),
                      status: v.severity == PolicyViolationSeverity.blocking
                          ? 'danger'
                          : 'warning',
                      icon: v.severity == PolicyViolationSeverity.blocking
                          ? Icons.block_outlined
                          : Icons.warning_amber_outlined,
                    ),
                  if (violations.isEmpty && hasReceipt)
                    const _PolicyTag(
                      label: 'Dentro do limite',
                      status: 'success',
                      icon: Icons.verified_outlined,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _violationLabel(String code) => switch (code) {
    'category_limit_exceeded' => 'Acima do limite',
    'receipt_required' => 'Recibo obrigatorio',
    _ => 'Violacao de politica',
  };
}

class _PolicyTag extends StatelessWidget {
  const _PolicyTag({
    required this.label,
    required this.status,
    required this.icon,
  });

  final String label;
  final String status;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return OperationalStatusChip(label: label, status: status);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

ExpenseReport? _findReport(List<ExpenseReport> reports, String reportId) {
  for (final report in reports) {
    if (report.localId == reportId) return report;
  }
  return null;
}
