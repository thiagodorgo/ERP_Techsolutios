import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist_models.dart';

class ChecklistAvailableScreen extends ConsumerWidget {
  const ChecklistAvailableScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final session = ref
        .watch(bootstrapSessionProvider)
        .maybeWhen(data: (v) => v, orElse: () => null);

    final canExecute =
        session != null &&
        const PermissionResolver().has(
          session.permissions,
          'checklist_run:execute',
        );

    if (!canExecute) {
      return const ErpScaffold(
        title: 'Checklists',
        body: PermissionBlockedState(
          title: 'Acesso nao autorizado',
          message: 'checklist_run:execute necessario para executar checklists.',
        ),
      );
    }

    final repo = ref.watch(checklistRepositoryProvider);

    return ErpScaffold(
      title: 'Checklists da OS',
      body: FutureBuilder<void>(
        future: repo.load(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting &&
              repo.templates.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          return FutureBuilder<List<MobileChecklistRun>>(
            future: repo.getRunsForWorkOrder(workOrderId),
            builder: (context, runsSnap) {
              final runs = runsSnap.data ?? [];
              final templates = repo.activeTemplates;

              if (templates.isEmpty) {
                return const Center(
                  child: Text('Nenhum checklist disponivel para esta OS.'),
                );
              }

              return ListView.separated(
                padding: const EdgeInsets.all(16),
                itemCount: templates.length,
                separatorBuilder: (_, _) => const SizedBox(height: 8),
                itemBuilder: (context, i) {
                  final template = templates[i];
                  final run = runs
                      .where((r) => r.checklistId == template.id)
                      .firstOrNull;
                  return _TemplateCard(
                    template: template,
                    run: run,
                    onStart: () => context.push(
                      '/checklists/${template.id}/run'
                      '?workOrderId=$workOrderId',
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

class _TemplateCard extends StatelessWidget {
  const _TemplateCard({
    required this.template,
    required this.onStart,
    this.run,
  });

  final MobileChecklistTemplate template;
  final MobileChecklistRun? run;
  final VoidCallback onStart;

  @override
  Widget build(BuildContext context) {
    final status = run?.status;
    final isDone = status == MobileChecklistRunStatus.completed;
    final isInProgress = status == MobileChecklistRunStatus.inProgress;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    template.title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (template.isRequired)
                  OperationalStatusChip(label: 'Obrigatorio', status: 'danger'),
              ],
            ),
            if (template.description != null) ...[
              const SizedBox(height: 4),
              Text(
                template.description!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            Row(
              children: [
                if (status != null) ...[
                  OperationalStatusChip(
                    label: status.label,
                    status: isDone ? 'success' : 'warning',
                  ),
                  const Spacer(),
                ] else
                  const Spacer(),
                FilledButton.tonal(
                  onPressed: isDone ? null : onStart,
                  child: Text(
                    isDone
                        ? 'Concluido'
                        : isInProgress
                        ? 'Continuar'
                        : 'Iniciar',
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
