import 'package:flutter/material.dart';

import '../domain/work_order_models.dart';
import '../domain/work_order_steps.dart';

/// Cabeçalho de progresso da execução da OS.
///
/// Renderiza os passos por tipo de serviço (guincho 6 / prestador 4) com
/// estado visual done/active/todo. Cada passo já concluído é navegável quando
/// [onStepTap] é fornecido.
class WorkOrderStepper extends StatelessWidget {
  const WorkOrderStepper({
    required this.serviceType,
    required this.status,
    this.onStepTap,
    super.key,
  });

  final WorkOrderServiceType? serviceType;
  final WorkOrderStatus status;
  final void Function(WorkOrderStepInfo step)? onStepTap;

  @override
  Widget build(BuildContext context) {
    final steps = buildWorkOrderSteps(serviceType, status);
    final scheme = Theme.of(context).colorScheme;

    return Semantics(
      container: true,
      label: 'Progresso da execucao',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final step in steps)
            Expanded(
              child: _StepCell(
                step: step,
                scheme: scheme,
                onTap: (onStepTap != null && step.isDone)
                    ? () => onStepTap!(step)
                    : null,
              ),
            ),
        ],
      ),
    );
  }
}

class _StepCell extends StatelessWidget {
  const _StepCell({required this.step, required this.scheme, this.onTap});

  final WorkOrderStepInfo step;
  final ColorScheme scheme;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    final Color circleBg;
    final Color circleFg;
    final Color labelColor;
    switch (step.state) {
      case WorkOrderStepState.done:
        circleBg = scheme.tertiary;
        circleFg = scheme.onTertiary;
        labelColor = scheme.tertiary;
      case WorkOrderStepState.active:
        circleBg = scheme.primary;
        circleFg = scheme.onPrimary;
        labelColor = scheme.primary;
      case WorkOrderStepState.todo:
        circleBg = scheme.surfaceContainerHighest;
        circleFg = scheme.onSurfaceVariant;
        labelColor = scheme.onSurfaceVariant;
    }

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        key: Key('wo-step-${step.index}'),
        padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 2),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 26,
              height: 26,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: circleBg,
                shape: BoxShape.circle,
              ),
              child: step.isDone
                  ? Icon(Icons.check, size: 15, color: circleFg)
                  : Text(
                      '${step.index + 1}',
                      style: TextStyle(
                        color: circleFg,
                        fontSize: 11,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
            ),
            const SizedBox(height: 4),
            Text(
              step.label,
              textAlign: TextAlign.center,
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: labelColor,
                fontWeight: step.isActive ? FontWeight.w700 : FontWeight.w600,
                fontSize: 9,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
