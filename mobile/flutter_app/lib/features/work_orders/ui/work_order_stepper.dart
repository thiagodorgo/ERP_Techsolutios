import 'package:flutter/material.dart';

import '../../../shared/theme/erp_mobile_theme.dart';
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

    return Semantics(
      container: true,
      label: 'Progresso da execução',
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final step in steps)
            Expanded(
              child: _StepCell(
                step: step,
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
  const _StepCell({required this.step, this.onTap});

  final WorkOrderStepInfo step;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    // Tokens explícitos do protótipo (checklist-coleta.png): etapa concluída
    // = VERDE sólido com check branco; etapa atual = azul sólido com número
    // branco; etapas futuras = cinza claro. Não usar `scheme.tertiary`
    // (de fromSeed(#2563EB) sai ROSA, divergindo do protótipo).
    final Color circleBg;
    final Color circleFg;
    final Color labelColor;
    switch (step.state) {
      case WorkOrderStepState.done:
        circleBg = ErpMobileTheme.success;
        circleFg = Colors.white;
        labelColor = ErpMobileTheme.success;
      case WorkOrderStepState.active:
        circleBg = ErpMobileTheme.primary;
        circleFg = Colors.white;
        labelColor = ErpMobileTheme.primary;
      case WorkOrderStepState.todo:
        circleBg = const Color(0xFFEEF2F7);
        circleFg = ErpMobileTheme.inkFaint;
        labelColor = ErpMobileTheme.inkFaint;
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
