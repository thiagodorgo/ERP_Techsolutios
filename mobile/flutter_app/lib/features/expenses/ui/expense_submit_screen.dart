import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/expense_repository.dart';
import '../domain/expense_models.dart';
import '../services/expense_policy_evaluator.dart';
import '../services/expense_totals_calculator.dart';

class ExpenseSubmitScreen extends ConsumerWidget {
  const ExpenseSubmitScreen({required this.reportId, super.key});

  final String reportId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final repository = ref.watch(expenseRepositoryProvider);
    return FutureBuilder<void>(
      future: repository.load(),
      builder: (context, snapshot) {
        final report = _findReport(repository.reports, reportId);

        if (report == null) {
          return ErpScaffold(
            title: 'Submissao',
            body: SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const ErrorState(
                    message: 'Prestação de Contas nao encontrada.',
                  ),
                  const SizedBox(height: 12),
                  FilledButton.icon(
                    onPressed: null,
                    icon: const Icon(Icons.send_outlined),
                    label: const Text('Submeter localmente'),
                  ),
                ],
              ),
            ),
          );
        }

        final totals = const ExpenseTotalsCalculator().calculate(report);
        final violations = const ExpensePolicyEvaluator().evaluate(
          report: report,
          policy: repository.activePolicy,
        );
        final hasBlockingViolation = violations.any(
          (v) => v.severity == PolicyViolationSeverity.blocking,
        );

        final checks = _buildChecklist(report, violations);
        final allGreen = checks.every((c) => c.ok);

        return ErpScaffold(
          title: 'Resumo de submissao',
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ExpenseReportCard(
                  report: report,
                  totals: totals,
                  onTap: () => context.go('/expenses/$reportId'),
                ),
                const SizedBox(height: 8),
                Text(
                  'Checagem de submissao',
                  style: Theme.of(context).textTheme.titleMedium,
                ),
                const SizedBox(height: 8),
                _SubmissionChecklist(checks: checks),
                const SizedBox(height: 8),
                PolicyViolationBanner(violations: violations),
                const SizedBox(height: 8),
                _ItemSummary(report: report, totals: totals),
                const SizedBox(height: 12),
                FilledButton.icon(
                  onPressed: (hasBlockingViolation || !allGreen)
                      ? null
                      : () async {
                          await ref
                              .read(expenseRepositoryProvider)
                              .submitReport(reportId);
                          if (context.mounted) {
                            context.go('/sync');
                          }
                        },
                  icon: const Icon(Icons.send_outlined),
                  label: const Text('Submeter localmente'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  List<_CheckItem> _buildChecklist(
    ExpenseReport report,
    List<PolicyViolation> violations,
  ) {
    final hasTitle = report.title.trim().isNotEmpty;
    final hasItems = report.items.isNotEmpty;
    final receiptViolations = violations
        .where((v) => v.code == 'receipt_required')
        .toList();
    final limitViolations = violations
        .where((v) => v.code == 'category_limit_exceeded')
        .toList();
    final alreadySubmitted =
        report.status == ExpenseReportStatus.submitted ||
        report.status == ExpenseReportStatus.underReview ||
        report.status == ExpenseReportStatus.approvedManager ||
        report.status == ExpenseReportStatus.approvedFinance;

    return [
      _CheckItem(
        label: 'Relatorio preenchido',
        ok: hasTitle,
        detail: hasTitle ? null : 'Titulo obrigatorio',
      ),
      _CheckItem(
        label: 'Itens adicionados',
        ok: hasItems,
        detail: hasItems
            ? '${report.items.length} item(ns)'
            : 'Adicione ao menos um item',
      ),
      _CheckItem(
        label: 'Recibos obrigatorios',
        ok: receiptViolations.isEmpty,
        detail: receiptViolations.isEmpty
            ? 'Todos os recibos presentes'
            : '${receiptViolations.length} recibo(s) pendente(s)',
      ),
      _CheckItem(
        label: 'Dentro da politica',
        ok: limitViolations.isEmpty,
        detail: limitViolations.isEmpty
            ? 'Nenhum limite excedido'
            : '${limitViolations.length} limite(s) excedido(s)',
      ),
      _CheckItem(
        label: 'Status valido para envio',
        ok: !alreadySubmitted,
        detail: alreadySubmitted ? 'Relatorio ja submetido' : null,
      ),
    ];
  }
}

// ---------------------------------------------------------------------------
// Checklist widget
// ---------------------------------------------------------------------------

class _CheckItem {
  const _CheckItem({required this.label, required this.ok, this.detail});

  final String label;
  final bool ok;
  final String? detail;
}

class _SubmissionChecklist extends StatelessWidget {
  const _SubmissionChecklist({required this.checks});

  final List<_CheckItem> checks;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Column(
        children: [
          for (int i = 0; i < checks.length; i++) ...[
            if (i > 0) const Divider(height: 1, indent: 16, endIndent: 16),
            _CheckRow(item: checks[i]),
          ],
        ],
      ),
    );
  }
}

class _CheckRow extends StatelessWidget {
  const _CheckRow({required this.item});

  final _CheckItem item;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      dense: true,
      leading: Icon(
        item.ok ? Icons.check_circle_outline : Icons.error_outline,
        color: item.ok ? const Color(0xFF127A55) : const Color(0xFFB33333),
        size: 22,
      ),
      title: Text(item.label),
      subtitle: item.detail != null ? Text(item.detail!) : null,
    );
  }
}

// ---------------------------------------------------------------------------
// Item summary
// ---------------------------------------------------------------------------

class _ItemSummary extends StatelessWidget {
  const _ItemSummary({required this.report, required this.totals});

  final ExpenseReport report;
  final ExpenseTotals totals;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Resumo dos itens',
              style: Theme.of(context).textTheme.titleSmall,
            ),
            const SizedBox(height: 8),
            for (final item in report.items)
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 2),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        '${item.categoryId}'
                        '${item.vendorName != null ? ' · ${item.vendorName}' : ''}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                    Text(
                      formatCurrency(item.amount),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            const Divider(),
            Row(
              children: [
                Expanded(
                  child: Text(
                    'Total',
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                Text(
                  formatCurrency(totals.total),
                  style: Theme.of(
                    context,
                  ).textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            Row(
              children: [
                Expanded(
                  child: Text(
                    settlementLabel(totals),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ),
                Text(
                  formatCurrency(totals.difference),
                  style: Theme.of(
                    context,
                  ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ],
        ),
      ),
    );
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
