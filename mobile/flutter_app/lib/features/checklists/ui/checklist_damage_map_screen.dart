import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist_models.dart';
import 'vehicle_asset_helper.dart';

class ChecklistDamageMapScreen extends ConsumerStatefulWidget {
  const ChecklistDamageMapScreen({
    required this.checklistId,
    required this.runId,
    this.vehicleType = 'sedan',
    super.key,
  });

  final String checklistId;
  final String runId;
  final String vehicleType;

  @override
  ConsumerState<ChecklistDamageMapScreen> createState() =>
      _ChecklistDamageMapScreenState();
}

class _ChecklistDamageMapScreenState
    extends ConsumerState<ChecklistDamageMapScreen> {
  List<MobileChecklistMarker> _markers = [];
  bool _loading = true;
  String _activeView = 'left';

  @override
  void initState() {
    super.initState();
    _loadMarkers();
  }

  Future<void> _loadMarkers() async {
    final repo = ref.read(checklistRepositoryProvider);
    final markers = await repo.getMarkers(widget.runId);
    if (mounted) {
      setState(() {
        _markers = markers;
        _loading = false;
      });
    }
  }

  Future<void> _addMarker() async {
    final result = await showDialog<_MarkerInput>(
      context: context,
      builder: (ctx) => const _AddMarkerDialog(),
    );
    if (result == null || !mounted) return;

    final repo = ref.read(checklistRepositoryProvider);
    final marker = await repo.addMarker(
      runId: widget.runId,
      type: result.type,
      label: result.label.isEmpty ? null : result.label,
      description: result.description.isEmpty ? null : result.description,
      positionLabel: result.positionLabel.isEmpty ? null : result.positionLabel,
    );
    setState(() => _markers = [..._markers, marker]);
  }

  @override
  Widget build(BuildContext context) {
    return ErpScaffold(
      title: 'Mapa de danos',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                _VehicleViewSelector(
                  vehicleType: widget.vehicleType,
                  activeView: _activeView,
                  onViewChanged: (v) => setState(() => _activeView = v),
                ),
                _VehicleImage(
                  vehicleType: widget.vehicleType,
                  view: _activeView,
                ),
                Expanded(
                  child: Stack(
                    children: [
                      _markers.isEmpty
                          ? const Center(
                              child: Text(
                                'Nenhum dano registrado. Use + para adicionar.',
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.all(16),
                              itemCount: _markers.length,
                              separatorBuilder: (_, _) =>
                                  const SizedBox(height: 8),
                              itemBuilder: (_, i) =>
                                  _MarkerCard(marker: _markers[i]),
                            ),
                      Positioned(
                        bottom: 24,
                        right: 24,
                        child: FloatingActionButton(
                          onPressed: _addMarker,
                          tooltip: 'Adicionar dano',
                          child: const Icon(Icons.add),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }
}

// ---------------------------------------------------------------------------
// Vehicle view selector (4 thumbnails)
// ---------------------------------------------------------------------------

class _VehicleViewSelector extends StatelessWidget {
  const _VehicleViewSelector({
    required this.vehicleType,
    required this.activeView,
    required this.onViewChanged,
  });

  final String vehicleType;
  final String activeView;
  final void Function(String) onViewChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
        children: VehicleAssetHelper.views.map((view) {
          final selected = activeView == view;
          return GestureDetector(
            onTap: () => onViewChanged(view),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                border: Border.all(
                  color: selected
                      ? Theme.of(context).colorScheme.primary
                      : Colors.grey.shade300,
                  width: selected ? 2 : 1,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  SizedBox(
                    width: 52,
                    height: 38,
                    child: Image.asset(
                      VehicleAssetHelper.assetPath(vehicleType, view),
                      fit: BoxFit.contain,
                      errorBuilder: (_, _, _) => Icon(
                        Icons.directions_car_outlined,
                        color: Colors.grey.shade400,
                        size: 20,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    VehicleAssetHelper.viewLabels[view] ?? view,
                    style: TextStyle(
                      fontSize: 9,
                      color: selected
                          ? Theme.of(context).colorScheme.primary
                          : Colors.grey.shade600,
                      fontWeight: selected
                          ? FontWeight.w700
                          : FontWeight.normal,
                    ),
                  ),
                ],
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Vehicle image (main view)
// ---------------------------------------------------------------------------

class _VehicleImage extends StatelessWidget {
  const _VehicleImage({required this.vehicleType, required this.view});

  final String vehicleType;
  final String view;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.asset(
          VehicleAssetHelper.assetPath(vehicleType, view),
          width: double.infinity,
          height: 120,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => Container(
            height: 120,
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            child: Center(
              child: Icon(
                Icons.directions_car_outlined,
                size: 48,
                color: Theme.of(context).colorScheme.outline,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Marker card
// ---------------------------------------------------------------------------

class _MarkerCard extends StatelessWidget {
  const _MarkerCard({required this.marker});

  final MobileChecklistMarker marker;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        leading: const Icon(Icons.warning_amber_outlined),
        title: Text(marker.label ?? marker.type),
        subtitle: marker.description != null ? Text(marker.description!) : null,
        trailing: marker.positionLabel != null
            ? Chip(label: Text(marker.positionLabel!))
            : null,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Dialog for adding a marker
// ---------------------------------------------------------------------------

class _MarkerInput {
  const _MarkerInput({
    required this.type,
    required this.label,
    required this.description,
    required this.positionLabel,
  });

  final String type;
  final String label;
  final String description;
  final String positionLabel;
}

class _AddMarkerDialog extends StatefulWidget {
  const _AddMarkerDialog();

  @override
  State<_AddMarkerDialog> createState() => _AddMarkerDialogState();
}

class _AddMarkerDialogState extends State<_AddMarkerDialog> {
  String _type = 'damage';
  final _labelCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _posCtrl = TextEditingController();

  @override
  void dispose() {
    _labelCtrl.dispose();
    _descCtrl.dispose();
    _posCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Registrar dano'),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            InputDecorator(
              decoration: const InputDecoration(
                labelText: 'Tipo',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 4,
                ),
              ),
              child: DropdownButton<String>(
                value: _type,
                isExpanded: true,
                underline: const SizedBox.shrink(),
                items: const [
                  DropdownMenuItem(value: 'damage', child: Text('Dano')),
                  DropdownMenuItem(value: 'wear', child: Text('Desgaste')),
                  DropdownMenuItem(value: 'missing', child: Text('Faltando')),
                  DropdownMenuItem(value: 'other', child: Text('Outro')),
                ],
                onChanged: (v) => setState(() => _type = v ?? 'damage'),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _labelCtrl,
              decoration: const InputDecoration(
                labelText: 'Identificacao',
                border: OutlineInputBorder(),
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _descCtrl,
              decoration: const InputDecoration(
                labelText: 'Descricao',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _posCtrl,
              decoration: const InputDecoration(
                labelText: 'Posicao (ex: frente-esquerda)',
                border: OutlineInputBorder(),
              ),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancelar'),
        ),
        FilledButton(
          onPressed: () => Navigator.of(context).pop(
            _MarkerInput(
              type: _type,
              label: _labelCtrl.text,
              description: _descCtrl.text,
              positionLabel: _posCtrl.text,
            ),
          ),
          child: const Text('Registrar'),
        ),
      ],
    );
  }
}
