import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../../core/bootstrap/bootstrap_repository.dart';
import '../../../core/permissions/permission_resolver.dart';
import '../../../shared/ui/erp_components.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist_models.dart';

class ChecklistAvailableScreen extends ConsumerStatefulWidget {
  const ChecklistAvailableScreen({required this.workOrderId, super.key});

  final String workOrderId;

  @override
  ConsumerState<ChecklistAvailableScreen> createState() =>
      _ChecklistAvailableScreenState();
}

class _ChecklistAvailableScreenState
    extends ConsumerState<ChecklistAvailableScreen> {
  ChecklistRepository? _repo;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final repo = ref.read(checklistRepositoryProvider);
    if (_repo != repo) {
      _repo?.removeListener(_onRepoChanged);
      _repo = repo;
      _repo!.addListener(_onRepoChanged);
    }
  }

  @override
  void dispose() {
    _repo?.removeListener(_onRepoChanged);
    super.dispose();
  }

  void _onRepoChanged() {
    if (mounted) setState(() {});
  }

  @override
  Widget build(BuildContext context) {
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
      body: RefreshIndicator(
        onRefresh: () => repo.refresh(),
        child: FutureBuilder<void>(
          future: repo.load(),
          builder: (context, snapshot) {
            final loading =
                snapshot.connectionState == ConnectionState.waiting ||
                repo.isPulling;

            if (loading && repo.templates.isEmpty) {
              return const Center(child: CircularProgressIndicator());
            }

            return CustomScrollView(
              slivers: [
                // Pull state banners
                if (repo.isPulling)
                  const SliverToBoxAdapter(
                    child: LinearProgressIndicator(),
                  ),
                if (repo.lastPullError != null && !repo.isPulling)
                  SliverToBoxAdapter(
                    child: _ChecklistErrorBanner(
                      message: repo.lastPullError!,
                      onRetry: () => repo.refresh(),
                    ),
                  ),
                if (repo.lastPulledAt != null && !repo.isPulling)
                  SliverToBoxAdapter(
                    child: _LastUpdatedBanner(at: repo.lastPulledAt!),
                  ),
                if (repo.lastPullError != null &&
                    repo.hasCache &&
                    !repo.isPulling)
                  const SliverToBoxAdapter(
                    child: _CacheBanner(),
                  ),

                // Content
                if (repo.activeTemplates.isEmpty && !loading)
                  SliverFillRemaining(
                    child: _EmptyState(
                      hasError: repo.lastPullError != null,
                      onRetry: () => repo.refresh(),
                    ),
                  )
                else
                  SliverPadding(
                    padding: const EdgeInsets.all(16),
                    sliver: _TemplateList(
                      repo: repo,
                      workOrderId: widget.workOrderId,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Template list sliver
// ---------------------------------------------------------------------------

class _TemplateList extends StatelessWidget {
  const _TemplateList({required this.repo, required this.workOrderId});

  final ChecklistRepository repo;
  final String workOrderId;

  @override
  Widget build(BuildContext context) {
    final templates = repo.activeTemplates;
    return FutureBuilder<List<MobileChecklistRun>>(
      future: repo.getRunsForWorkOrder(workOrderId),
      builder: (context, runsSnap) {
        final runs = runsSnap.data ?? [];
        return SliverList.separated(
          itemCount: templates.length,
          separatorBuilder: (_, _) => const SizedBox(height: 8),
          itemBuilder: (context, i) {
            final template = templates[i];
            final run =
                runs.where((r) => r.checklistId == template.id).firstOrNull;
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
  }
}

// ---------------------------------------------------------------------------
// Template card
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// UX state banners
// ---------------------------------------------------------------------------

class _ChecklistErrorBanner extends StatelessWidget {
  const _ChecklistErrorBanner({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Theme.of(context).colorScheme.errorContainer,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          children: [
            Icon(
              Icons.cloud_off_outlined,
              size: 16,
              color: Theme.of(context).colorScheme.onErrorContainer,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                message,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onErrorContainer,
                ),
              ),
            ),
            TextButton(
              onPressed: onRetry,
              child: const Text('Tentar novamente'),
            ),
          ],
        ),
      ),
    );
  }
}

class _LastUpdatedBanner extends StatelessWidget {
  const _LastUpdatedBanner({required this.at});

  final DateTime at;

  @override
  Widget build(BuildContext context) {
    final local = at.toLocal();
    final label =
        '${local.day.toString().padLeft(2, '0')}/'
        '${local.month.toString().padLeft(2, '0')} '
        '${local.hour.toString().padLeft(2, '0')}:'
        '${local.minute.toString().padLeft(2, '0')}';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Text(
        'Atualizado em $label',
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
          color: Theme.of(context).colorScheme.outline,
        ),
      ),
    );
  }
}

class _CacheBanner extends StatelessWidget {
  const _CacheBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      color: Theme.of(
        context,
      ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.7),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: [
          Icon(
            Icons.inventory_2_outlined,
            size: 14,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(width: 6),
          Text(
            'Mostrando modelos salvos neste aparelho.',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.outline,
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.hasError, required this.onRetry});

  final bool hasError;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              hasError ? Icons.cloud_off_outlined : Icons.checklist_outlined,
              size: 48,
              color: Theme.of(context).colorScheme.outline,
            ),
            const SizedBox(height: 16),
            Text(
              hasError
                  ? 'Nao foi possivel atualizar os modelos de checklist agora.'
                  : 'Nenhum checklist disponivel para esta ordem.',
              textAlign: TextAlign.center,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            if (hasError) ...[
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: onRetry,
                icon: const Icon(Icons.refresh_outlined, size: 16),
                label: const Text('Toque para tentar atualizar novamente'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
