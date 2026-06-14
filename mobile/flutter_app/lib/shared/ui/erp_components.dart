import 'package:flutter/material.dart';

import '../../core/bootstrap/bootstrap_session.dart';
import '../../core/network/connectivity_repository.dart';
import '../../core/sync/sync_models.dart';
import '../../features/expenses/domain/expense_models.dart';
import '../../features/expenses/services/expense_totals_calculator.dart';
import '../theme/erp_mobile_theme.dart';

class TenantContextBar extends StatelessWidget {
  const TenantContextBar({required this.session, super.key});

  final BootstrapSession session;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.business_outlined),
        title: Text(session.activeTenant.displayName),
        subtitle: Text('${session.user.tenantRole} · ${session.user.email}'),
        trailing: const Icon(Icons.verified_user_outlined),
      ),
    );
  }
}

class SyncStatusBanner extends StatelessWidget {
  const SyncStatusBanner({
    required this.status,
    required this.message,
    super.key,
  });

  final SyncStatus status;
  final String message;

  @override
  Widget build(BuildContext context) {
    final color = _statusColor(status);
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Row(
        children: [
          Icon(Icons.sync_outlined, color: color),
          const SizedBox(width: 8),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class OperationalStatusChip extends StatelessWidget {
  const OperationalStatusChip({
    required this.label,
    required this.status,
    super.key,
  });

  final String label;
  final String status;

  @override
  Widget build(BuildContext context) {
    final color = switch (status) {
      'success' => ErpMobileTheme.success,
      'warning' => ErpMobileTheme.warning,
      'danger' => ErpMobileTheme.danger,
      'info' => ErpMobileTheme.info,
      _ => ErpMobileTheme.pending,
    };

    return Chip(
      label: Text(label),
      side: BorderSide(color: color.withValues(alpha: 0.45)),
      backgroundColor: color.withValues(alpha: 0.12),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.w800),
    );
  }
}

class PermissionBlockedState extends StatelessWidget {
  const PermissionBlockedState({
    required this.title,
    required this.message,
    super.key,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return EmptyState(icon: Icons.lock_outline, title: title, message: message);
  }
}

class EmptyState extends StatelessWidget {
  const EmptyState({
    required this.icon,
    required this.title,
    required this.message,
    this.action,
    super.key,
  });

  final IconData icon;
  final String title;
  final String message;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 44, color: Theme.of(context).colorScheme.primary),
            const SizedBox(height: 12),
            Text(title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center),
            if (action != null) ...[const SizedBox(height: 16), action!],
          ],
        ),
      ),
    );
  }
}

class ErrorState extends StatelessWidget {
  const ErrorState({required this.message, super.key});

  final String message;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: Icons.error_outline,
      title: 'Nao foi possivel carregar',
      message: message,
    );
  }
}

class OfflineState extends StatelessWidget {
  const OfflineState({super.key});

  @override
  Widget build(BuildContext context) {
    return const EmptyState(
      icon: Icons.cloud_off_outlined,
      title: 'Modo offline',
      message:
          'Os dados locais continuam disponiveis e a fila sera sincronizada depois.',
    );
  }
}

/// Inline banner showing network connectivity status.
/// Hidden when [status] is [NetworkStatus.online] or [NetworkStatus.unknown].
/// Pass the value of [networkStatusProvider] from the parent widget.
class NetworkStatusBanner extends StatelessWidget {
  const NetworkStatusBanner({required this.status, super.key});

  final NetworkStatus status;

  @override
  Widget build(BuildContext context) {
    final (Color color, IconData icon, String message) = switch (status) {
      NetworkStatus.offline => (
        ErpMobileTheme.danger,
        Icons.wifi_off_outlined,
        'Modo offline — alteracoes serao sincronizadas ao reconectar.',
      ),
      NetworkStatus.checking => (
        ErpMobileTheme.warning,
        Icons.sync_outlined,
        'Verificando conexao...',
      ),
      NetworkStatus.online ||
      NetworkStatus.unknown => (Colors.transparent, Icons.wifi, ''),
    };

    if (status == NetworkStatus.online || status == NetworkStatus.unknown) {
      return const SizedBox.shrink();
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.30)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 18),
          const SizedBox(width: 8),
          Expanded(
            child: Text(message, style: TextStyle(color: color)),
          ),
        ],
      ),
    );
  }
}

class PolicyViolationBanner extends StatelessWidget {
  const PolicyViolationBanner({required this.violations, super.key});

  final List<PolicyViolation> violations;

  @override
  Widget build(BuildContext context) {
    if (violations.isEmpty) {
      return const SizedBox.shrink();
    }

    return Card(
      color: ErpMobileTheme.danger.withValues(alpha: 0.10),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Icon(Icons.policy_outlined, color: ErpMobileTheme.danger),
                SizedBox(width: 8),
                Text(
                  'Violacao de politica',
                  style: TextStyle(fontWeight: FontWeight.w800),
                ),
              ],
            ),
            const SizedBox(height: 8),
            for (final violation in violations)
              Text('- ${violation.message} (${violation.code})'),
          ],
        ),
      ),
    );
  }
}

class ExpenseReportCard extends StatelessWidget {
  const ExpenseReportCard({
    required this.report,
    required this.totals,
    required this.onTap,
    super.key,
  });

  final ExpenseReport report;
  final ExpenseTotals totals;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        leading: const Icon(Icons.receipt_long_outlined),
        title: Text(report.title),
        subtitle: Text(
          'Total ${formatCurrency(totals.total)} · ${settlementLabel(totals)}',
        ),
        trailing: OperationalStatusChip(
          label: report.status.label,
          status: report.status.statusTone,
        ),
      ),
    );
  }
}

class ApprovalDecisionCard extends StatelessWidget {
  const ApprovalDecisionCard({
    required this.title,
    required this.message,
    super.key,
  });

  final String title;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.rule_folder_outlined),
        title: Text(title),
        subtitle: Text(message),
        trailing: const OperationalStatusChip(
          label: 'Preparacao',
          status: 'info',
        ),
      ),
    );
  }
}

Color _statusColor(SyncStatus status) {
  return switch (status) {
    SyncStatus.synced => ErpMobileTheme.success,
    SyncStatus.failed => ErpMobileTheme.danger,
    SyncStatus.conflict => ErpMobileTheme.danger,
    SyncStatus.syncing => ErpMobileTheme.info,
    SyncStatus.pending => ErpMobileTheme.warning,
    SyncStatus.local => ErpMobileTheme.pending,
  };
}

String formatCurrency(double value) {
  return 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
}

String settlementLabel(ExpenseTotals totals) {
  return switch (totals.kind) {
    ExpenseSettlementKind.receivable =>
      'A receber ${formatCurrency(totals.difference)}',
    ExpenseSettlementKind.refundable =>
      'A devolver ${formatCurrency(totals.difference)}',
    ExpenseSettlementKind.zero => 'Sem diferenca',
  };
}
