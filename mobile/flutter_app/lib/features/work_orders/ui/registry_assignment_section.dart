import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/theme/erp_mobile_theme.dart';
import '../data/registry_options_remote_api.dart';
import '../data/work_order_repository.dart';
import '../domain/registry_options.dart';
import '../domain/work_order_models.dart';

/// D1 (seleção viatura/equipe): seção "Viatura e equipe" na OS.
///
/// Dois seletores (viatura/equipe) alimentados pelas listas de cadastro. Ao
/// confirmar, chama [WorkOrderRepository.assignRegistry] — que salva local
/// (otimista, syncStatus pending) e enfileira `work_order.assign`.
///
/// Se a OS não tem operador atribuído, os seletores ficam desabilitados com uma
/// orientação. Tudo funciona offline: a ação vai para a fila e sincroniza depois.
class RegistryAssignmentSection extends ConsumerStatefulWidget {
  const RegistryAssignmentSection({
    required this.workOrder,
    this.canAssign = true,
    super.key,
  });

  final WorkOrder workOrder;
  final bool canAssign;

  @override
  ConsumerState<RegistryAssignmentSection> createState() =>
      _RegistryAssignmentSectionState();
}

class _RegistryAssignmentSectionState
    extends ConsumerState<RegistryAssignmentSection> {
  String? _vehicleId;
  String? _teamId;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _vehicleId = _emptyToNull(widget.workOrder.vehicleId);
    _teamId = _emptyToNull(widget.workOrder.teamId);
  }

  bool get _hasOperator {
    final id = widget.workOrder.assignedUserId?.trim();
    return id != null && id.isNotEmpty;
  }

  static String? _emptyToNull(String? v) {
    final t = v?.trim();
    return t == null || t.isEmpty ? null : t;
  }

  static VehicleOption? _vehicleById(List<VehicleOption> list, String? id) {
    if (id == null) return null;
    for (final v in list) {
      if (v.id == id) return v;
    }
    return null;
  }

  static TeamOption? _teamById(List<TeamOption> list, String? id) {
    if (id == null) return null;
    for (final t in list) {
      if (t.id == id) return t;
    }
    return null;
  }

  Future<void> _save(RegistryOptions options) async {
    if (_saving) return;
    setState(() => _saving = true);
    try {
      final repo = ref.read(workOrderRepositoryProvider);
      final vehicle = _vehicleById(options.vehicles, _vehicleId);
      final team = _teamById(options.teams, _teamId);
      await repo.assignRegistry(
        widget.workOrder.localId,
        vehicleId: _vehicleId,
        vehiclePlate: vehicle?.plate,
        teamId: _teamId,
        teamName: team?.name,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Atribuição atualizada. Aguardando sincronização.'),
        ),
      );
    } on StateError catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(e.message)));
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Sem permissão de atribuição: a seção não aparece (o backend é a autoridade
    // final; a UI apenas esconde).
    if (!widget.canAssign) return const SizedBox.shrink();

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(
                  Icons.local_shipping_outlined,
                  size: 18,
                  color: ErpMobileTheme.primary,
                ),
                const SizedBox(width: 8),
                Text(
                  'Viatura e equipe',
                  style: Theme.of(context).textTheme.titleSmall,
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (!_hasOperator)
              _OperatorRequiredHint()
            else
              _buildSelectors(context),
          ],
        ),
      ),
    );
  }

  Widget _buildSelectors(BuildContext context) {
    final optionsAsync = ref.watch(registryOptionsControllerProvider);
    return optionsAsync.when(
      loading: () => const Padding(
        key: Key('registry-assignment-loading'),
        padding: EdgeInsets.symmetric(vertical: 12),
        child: Center(child: CircularProgressIndicator.adaptive()),
      ),
      error: (_, _) => _buildForm(context, RegistryOptions.empty),
      data: (options) => _buildForm(context, options),
    );
  }

  Widget _buildForm(BuildContext context, RegistryOptions options) {
    final hasCatalog = options.vehicles.isNotEmpty || options.teams.isNotEmpty;

    // Garante que valores selecionados fora do catálogo atual não quebrem o
    // Dropdown (valor precisa existir entre os itens).
    final vehicleValue = _vehicleById(options.vehicles, _vehicleId)?.id;
    final teamValue = _teamById(options.teams, _teamId)?.id;

    if (!hasCatalog) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Nenhuma viatura ou equipe disponível para seleção no momento.',
            key: Key('registry-assignment-empty'),
            style: TextStyle(fontSize: 12.5, color: ErpMobileTheme.inkMuted),
          ),
          if (widget.workOrder.vehiclePlate != null ||
              widget.workOrder.teamName != null) ...[
            const SizedBox(height: 10),
            _currentSelectionRow(),
          ],
        ],
      );
    }

    final canSave = !_saving && (_vehicleId != null || _teamId != null);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        DropdownButtonFormField<String>(
          key: const Key('registry-assignment-vehicle'),
          initialValue: vehicleValue,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Viatura',
            prefixIcon: Icon(Icons.directions_car_outlined),
            border: OutlineInputBorder(),
          ),
          hint: const Text('Selecione a viatura'),
          items: [
            for (final v in options.vehicles)
              DropdownMenuItem<String>(value: v.id, child: Text(v.label)),
          ],
          onChanged: _saving
              ? null
              : (value) => setState(() => _vehicleId = value),
        ),
        const SizedBox(height: 12),
        DropdownButtonFormField<String>(
          key: const Key('registry-assignment-team'),
          initialValue: teamValue,
          isExpanded: true,
          decoration: const InputDecoration(
            labelText: 'Equipe',
            prefixIcon: Icon(Icons.groups_outlined),
            border: OutlineInputBorder(),
          ),
          hint: const Text('Selecione a equipe'),
          items: [
            for (final t in options.teams)
              DropdownMenuItem<String>(value: t.id, child: Text(t.label)),
          ],
          onChanged: _saving
              ? null
              : (value) => setState(() => _teamId = value),
        ),
        const SizedBox(height: 14),
        SizedBox(
          width: double.infinity,
          child: FilledButton.icon(
            key: const Key('registry-assignment-save'),
            onPressed: canSave ? () => _save(options) : null,
            icon: _saving
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator.adaptive(strokeWidth: 2),
                  )
                : const Icon(Icons.check_outlined),
            label: const Text('Definir viatura e equipe'),
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
            ),
          ),
        ),
      ],
    );
  }

  Widget _currentSelectionRow() {
    final plate = widget.workOrder.vehiclePlate?.trim();
    final team = widget.workOrder.teamName?.trim();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (plate != null && plate.isNotEmpty)
          Text(
            'Viatura atual: $plate',
            style: const TextStyle(
              fontSize: 12.5,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
        if (team != null && team.isNotEmpty)
          Text(
            'Equipe atual: $team',
            style: const TextStyle(
              fontSize: 12.5,
              color: ErpMobileTheme.inkMuted,
            ),
          ),
      ],
    );
  }
}

class _OperatorRequiredHint extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    // Tokens de tema (espelha SyncStatusBanner) — funciona em light/dark/alto contraste.
    return Container(
      key: const Key('registry-assignment-operator-hint'),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: ErpMobileTheme.warning.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: ErpMobileTheme.warning.withValues(alpha: 0.35),
        ),
      ),
      child: Row(
        children: [
          const Icon(
            Icons.info_outline,
            size: 16,
            color: ErpMobileTheme.warning,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Atribua um operador antes de definir viatura/equipe.',
              style: Theme.of(
                context,
              ).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}
