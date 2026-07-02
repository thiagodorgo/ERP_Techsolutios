import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/evidence/evidence_picker.dart';
import '../../../shared/ui/erp_scaffold.dart';
import '../data/checklist_repository.dart';
import '../domain/checklist_models.dart';
import '../domain/signature_strokes.dart';
import 'signature_pad.dart';
import 'vehicle_asset_helper.dart';

class ChecklistRunScreen extends ConsumerStatefulWidget {
  const ChecklistRunScreen({
    required this.checklistId,
    required this.workOrderId,
    super.key,
  });

  final String checklistId;
  final String workOrderId;

  @override
  ConsumerState<ChecklistRunScreen> createState() => _ChecklistRunScreenState();
}

class _ChecklistRunScreenState extends ConsumerState<ChecklistRunScreen> {
  Map<String, MobileChecklistAnswer> _answers = {};
  final Map<String, TextEditingController> _controllers = {};
  bool _completing = false;

  ChecklistRepository? _lastRepo;
  Future<_RunData>? _runFuture;

  @override
  void dispose() {
    for (final c in _controllers.values) {
      c.dispose();
    }
    super.dispose();
  }

  Future<_RunData> _ensureFuture(ChecklistRepository repo) {
    if (_lastRepo != repo) {
      _lastRepo = repo;
      _answers = {};
      _runFuture = _doLoad(repo);
    }
    return _runFuture!;
  }

  Future<_RunData> _doLoad(ChecklistRepository repo) async {
    await repo.load();
    final schema = await repo.getSchema(widget.checklistId);
    if (schema == null) {
      throw Exception('Schema nao encontrado: ${widget.checklistId}');
    }
    final run = await repo.getOrStartRun(
      checklistId: widget.checklistId,
      workOrderId: widget.workOrderId,
      schemaVersion: schema.version,
    );
    if (run.answers.isNotEmpty) {
      _answers = Map.from(run.answers);
      for (final e in run.answers.entries) {
        final ctrl = TextEditingController();
        if (e.value.textValue != null) ctrl.text = e.value.textValue!;
        if (e.value.numberValue != null) {
          ctrl.text = e.value.numberValue!.toString();
        }
        if (e.value.observationText != null) {
          ctrl.text = e.value.observationText!;
        }
        _controllers[e.key] = ctrl;
      }
    }
    return _RunData(schema: schema, runId: run.localId);
  }

  void _onAnswer(
    ChecklistRepository repo,
    String runId,
    MobileChecklistAnswer answer,
  ) {
    setState(() {
      _answers = Map.from(_answers)..[answer.fieldId] = answer;
    });
    repo.saveAnswer(runId: runId, answer: answer);
  }

  bool _canComplete(MobileChecklistSchema schema) =>
      schema.requiredFields.every((f) => _answers[f.id]?.hasValue ?? false);

  Future<void> _doComplete(
    ChecklistRepository repo,
    String runId,
    MobileChecklistSchema schema,
  ) async {
    setState(() => _completing = true);
    try {
      for (final answer in _answers.values) {
        await repo.saveAnswer(runId: runId, answer: answer);
      }
      await repo.completeRun(runId: runId, schema: schema);
      if (mounted) {
        context.pop();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Checklist concluido com sucesso.')),
        );
      }
    } catch (e) {
      if (mounted) {
        setState(() => _completing = false);
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text('Erro ao concluir: $e')));
      }
    }
  }

  Future<MobileChecklistAttachmentMetadata?> _doPickAndAttach(
    ChecklistRepository repo,
    String runId,
    String fieldId,
    EvidenceCaptureSource source,
  ) async {
    final picker = ref.read(evidencePickerProvider);
    final result = await picker.pickImage(source);
    if (result == null) return null;
    return repo.addAttachment(
      runId: runId,
      fieldId: fieldId,
      fileName: result.fileName,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      captureSource: result.captureSource.name,
    );
  }

  TextEditingController _ctrl(String fieldId) =>
      _controllers.putIfAbsent(fieldId, () => TextEditingController());

  String? _vehicleTypeFromAnswers(MobileChecklistSchema schema) {
    for (final f in schema.fields) {
      if (f.type == MobileChecklistFieldType.vehicleSelector) {
        return _answers[f.id]?.choiceValue;
      }
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final repo = ref.watch(checklistRepositoryProvider);

    return FutureBuilder<_RunData>(
      future: _ensureFuture(repo),
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return ErpScaffold(
            title: 'Checklist',
            body: Center(child: Text(snapshot.error!.toString())),
          );
        }
        if (!snapshot.hasData) {
          return const ErpScaffold(
            title: 'Checklist',
            body: Center(child: CircularProgressIndicator()),
          );
        }

        final data = snapshot.data!;
        final schema = data.schema;
        final runId = data.runId;
        final fields = schema.sortedFields;
        final totalRequired = schema.requiredFields.length;
        final answeredRequired = totalRequired == 0
            ? 0
            : schema.requiredFields
                  .where((f) => _answers[f.id]?.hasValue ?? false)
                  .length;
        final vehicleType = _vehicleTypeFromAnswers(schema);

        return ErpScaffold(
          title: schema.title,
          body: Column(
            children: [
              if (totalRequired > 0)
                LinearProgressIndicator(
                  value: answeredRequired / totalRequired,
                  semanticsLabel: 'Progresso dos campos obrigatorios',
                ),
              Expanded(
                child: ListView.separated(
                  padding: const EdgeInsets.all(16),
                  itemCount: fields.length + 1,
                  separatorBuilder: (_, _) => const SizedBox(height: 8),
                  itemBuilder: (context, i) {
                    if (i == fields.length) {
                      return Padding(
                        padding: const EdgeInsets.only(top: 8),
                        child: FilledButton(
                          onPressed: _canComplete(schema) && !_completing
                              ? () => _doComplete(repo, runId, schema)
                              : null,
                          child: Text(
                            _completing
                                ? 'Concluindo...'
                                : 'Concluir checklist',
                          ),
                        ),
                      );
                    }
                    final field = fields[i];
                    return _FieldCard(
                      field: field,
                      answer: _answers[field.id],
                      ctrl: _ctrl(field.id),
                      checklistId: widget.checklistId,
                      runId: runId,
                      vehicleType: vehicleType,
                      onAnswer: (answer) => _onAnswer(repo, runId, answer),
                      pickAndAttach: (fieldId, source) =>
                          _doPickAndAttach(repo, runId, fieldId, source),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

// ---------------------------------------------------------------------------
// Loaded data record
// ---------------------------------------------------------------------------

class _RunData {
  const _RunData({required this.schema, required this.runId});

  final MobileChecklistSchema schema;
  final String runId;
}

// ---------------------------------------------------------------------------
// Field card
// ---------------------------------------------------------------------------

class _FieldCard extends StatelessWidget {
  const _FieldCard({
    required this.field,
    required this.ctrl,
    required this.checklistId,
    required this.runId,
    required this.onAnswer,
    required this.pickAndAttach,
    this.answer,
    this.vehicleType,
  });

  final MobileChecklistField field;
  final MobileChecklistAnswer? answer;
  final TextEditingController ctrl;
  final String checklistId;
  final String runId;
  final String? vehicleType;
  final void Function(MobileChecklistAnswer) onAnswer;
  final Future<MobileChecklistAttachmentMetadata?> Function(
    String fieldId,
    EvidenceCaptureSource source,
  )
  pickAndAttach;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Text(
                    field.label,
                    style: Theme.of(context).textTheme.titleSmall,
                  ),
                ),
                if (field.required)
                  const Text(' *', style: TextStyle(color: Colors.red)),
              ],
            ),
            if (field.description != null) ...[
              const SizedBox(height: 4),
              Text(
                field.description!,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
            const SizedBox(height: 12),
            _buildInput(context),
          ],
        ),
      ),
    );
  }

  Widget _buildInput(BuildContext context) {
    return switch (field.type) {
      MobileChecklistFieldType.text => TextField(
        controller: ctrl,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText: 'Digite o valor',
        ),
        onChanged: (v) => onAnswer(
          MobileChecklistAnswer(
            fieldId: field.id,
            textValue: v.trim().isEmpty ? null : v,
            answeredAt: DateTime.now(),
          ),
        ),
      ),
      MobileChecklistFieldType.number => TextField(
        controller: ctrl,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText: 'Digite o numero',
        ),
        keyboardType: const TextInputType.numberWithOptions(decimal: true),
        onChanged: (v) => onAnswer(
          MobileChecklistAnswer(
            fieldId: field.id,
            numberValue: double.tryParse(v),
            answeredAt: DateTime.now(),
          ),
        ),
      ),
      MobileChecklistFieldType.boolean => SwitchListTile(
        title: Text(answer?.boolValue == true ? 'Sim' : 'Nao'),
        value: answer?.boolValue ?? false,
        contentPadding: EdgeInsets.zero,
        onChanged: (v) => onAnswer(
          MobileChecklistAnswer(
            fieldId: field.id,
            boolValue: v,
            answeredAt: DateTime.now(),
          ),
        ),
      ),
      MobileChecklistFieldType.singleChoice when field.options != null =>
        RadioGroup<String>(
          groupValue: answer?.choiceValue,
          onChanged: (v) {
            if (v == null) return;
            onAnswer(
              MobileChecklistAnswer(
                fieldId: field.id,
                choiceValue: v,
                answeredAt: DateTime.now(),
              ),
            );
          },
          child: Column(
            children: [
              for (final opt in field.options!)
                RadioListTile<String>(
                  title: Text(opt.label),
                  value: opt.value,
                  contentPadding: EdgeInsets.zero,
                ),
            ],
          ),
        ),
      MobileChecklistFieldType.multiChoice when field.options != null =>
        _buildMultiChoice(),
      MobileChecklistFieldType.vehicleSelector => _VehicleSelectorField(
        field: field,
        answer: answer,
        onAnswer: onAnswer,
      ),
      MobileChecklistFieldType.photoUpload => _PhotoUploadField(
        field: field,
        answer: answer,
        onAnswer: onAnswer,
        pickAndAttach: pickAndAttach,
      ),
      MobileChecklistFieldType.beforeAfter => _BeforeAfterField(
        field: field,
        answer: answer,
        onAnswer: onAnswer,
        pickAndAttach: pickAndAttach,
      ),
      MobileChecklistFieldType.observation => TextField(
        controller: ctrl,
        decoration: const InputDecoration(
          border: OutlineInputBorder(),
          hintText: 'Adicione observacoes',
        ),
        maxLines: 4,
        onChanged: (v) => onAnswer(
          MobileChecklistAnswer(
            fieldId: field.id,
            observationText: v.trim().isEmpty ? null : v,
            answeredAt: DateTime.now(),
          ),
        ),
      ),
      MobileChecklistFieldType.damageMap => OutlinedButton.icon(
        onPressed: () {
          final vt = vehicleType ?? 'sedan';
          context.push(
            '/checklists/$checklistId/run/damage-map'
            '?runId=$runId&vehicleType=$vt',
          );
        },
        icon: const Icon(Icons.car_repair_outlined),
        label: const Text('Abrir mapa de danos'),
      ),
      MobileChecklistFieldType.acknowledgement => OutlinedButton.icon(
        onPressed: () => context.push(
          '/checklists/$checklistId/run/acknowledgement?runId=$runId',
        ),
        icon: const Icon(Icons.verified_user_outlined),
        label: const Text('Registrar ciencia'),
      ),
      MobileChecklistFieldType.signature => _SignatureField(
        field: field,
        answer: answer,
        onAnswer: onAnswer,
      ),
      _ => Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          '${field.type.apiValue} — disponivel em bloco futuro',
          style: Theme.of(context).textTheme.bodySmall,
        ),
      ),
    };
  }

  Widget _buildMultiChoice() {
    final selected = answer?.multiChoiceValues?.toSet() ?? <String>{};
    return Column(
      children: [
        for (final opt in field.options!)
          CheckboxListTile(
            value: selected.contains(opt.value),
            title: Text(opt.label),
            dense: true,
            contentPadding: EdgeInsets.zero,
            onChanged: (v) {
              final updated = Set<String>.from(selected);
              if (v == true) {
                updated.add(opt.value);
              } else {
                updated.remove(opt.value);
              }
              onAnswer(
                MobileChecklistAnswer(
                  fieldId: field.id,
                  multiChoiceValues: updated.isEmpty ? null : updated.toList(),
                  answeredAt: DateTime.now(),
                ),
              );
            },
          ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// vehicleSelector — StatefulWidget (tracks active view tab locally)
// ---------------------------------------------------------------------------

class _VehicleSelectorField extends StatefulWidget {
  const _VehicleSelectorField({
    required this.field,
    required this.onAnswer,
    this.answer,
  });

  final MobileChecklistField field;
  final MobileChecklistAnswer? answer;
  final void Function(MobileChecklistAnswer) onAnswer;

  @override
  State<_VehicleSelectorField> createState() => _VehicleSelectorFieldState();
}

class _VehicleSelectorFieldState extends State<_VehicleSelectorField> {
  String _activeView = 'left';

  @override
  Widget build(BuildContext context) {
    final options = widget.field.options?.isNotEmpty == true
        ? widget.field.options!
        : VehicleAssetHelper.defaultOptions;
    final vehicleType = widget.answer?.choiceValue ?? options.first.value;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        InputDecorator(
          decoration: const InputDecoration(
            labelText: 'Tipo de veiculo',
            border: OutlineInputBorder(),
            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 4),
          ),
          child: DropdownButton<String>(
            value: widget.answer?.choiceValue,
            isExpanded: true,
            underline: const SizedBox.shrink(),
            hint: const Text('Selecione'),
            items: options
                .map(
                  (opt) => DropdownMenuItem<String>(
                    value: opt.value,
                    child: Text(opt.label),
                  ),
                )
                .toList(),
            onChanged: (v) {
              if (v == null) return;
              widget.onAnswer(
                MobileChecklistAnswer(
                  fieldId: widget.field.id,
                  choiceValue: v,
                  answeredAt: DateTime.now(),
                ),
              );
            },
          ),
        ),
        const SizedBox(height: 12),
        Text(
          'Vista do veiculo',
          style: Theme.of(
            context,
          ).textTheme.labelMedium?.copyWith(fontWeight: FontWeight.w600),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceEvenly,
          children: VehicleAssetHelper.views.map((view) {
            final selected = _activeView == view;
            return GestureDetector(
              onTap: () => setState(() => _activeView = view),
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
                      width: 56,
                      height: 42,
                      child: Image.asset(
                        VehicleAssetHelper.assetPath(vehicleType, view),
                        fit: BoxFit.contain,
                        errorBuilder: (_, _, _) => Icon(
                          Icons.directions_car_outlined,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      VehicleAssetHelper.viewLabels[view] ?? view,
                      style: TextStyle(
                        fontSize: 10,
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
        const SizedBox(height: 12),
        ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Image.asset(
            VehicleAssetHelper.assetPath(vehicleType, _activeView),
            width: double.infinity,
            height: 140,
            fit: BoxFit.contain,
            errorBuilder: (_, _, _) => Container(
              height: 140,
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
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// photoUpload — StatefulWidget (tracks adding state)
// ---------------------------------------------------------------------------

class _PhotoUploadField extends StatefulWidget {
  const _PhotoUploadField({
    required this.field,
    required this.onAnswer,
    required this.pickAndAttach,
    this.answer,
  });

  final MobileChecklistField field;
  final MobileChecklistAnswer? answer;
  final void Function(MobileChecklistAnswer) onAnswer;
  final Future<MobileChecklistAttachmentMetadata?> Function(
    String fieldId,
    EvidenceCaptureSource source,
  )
  pickAndAttach;

  @override
  State<_PhotoUploadField> createState() => _PhotoUploadFieldState();
}

class _PhotoUploadFieldState extends State<_PhotoUploadField> {
  bool _adding = false;

  Future<void> _add() async {
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    setState(() => _adding = true);
    try {
      final att = await widget.pickAndAttach(widget.field.id, source);
      if (att == null) return;
      widget.onAnswer(
        MobileChecklistAnswer(
          fieldId: widget.field.id,
          textValue: att.localId,
          answeredAt: DateTime.now(),
        ),
      );
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final hasAtt = widget.answer?.textValue != null;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        OutlinedButton.icon(
          onPressed: _adding ? null : _add,
          icon: Icon(
            _adding ? Icons.hourglass_empty : Icons.add_a_photo_outlined,
          ),
          label: Text(
            _adding
                ? 'Registrando...'
                : hasAtt
                ? 'Substituir evidencia'
                : 'Adicionar evidencia',
          ),
        ),
        if (hasAtt) ...[
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                color: Colors.green.shade600,
                size: 16,
              ),
              const SizedBox(width: 4),
              Text(
                'Evidencia registrada',
                style: TextStyle(color: Colors.green.shade600, fontSize: 13),
              ),
              const SizedBox(width: 8),
              const Chip(label: Text('Pendente sync')),
            ],
          ),
        ],
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// beforeAfter — StatefulWidget (tracks adding state for each side)
// ---------------------------------------------------------------------------

class _BeforeAfterField extends StatefulWidget {
  const _BeforeAfterField({
    required this.field,
    required this.onAnswer,
    required this.pickAndAttach,
    this.answer,
  });

  final MobileChecklistField field;
  final MobileChecklistAnswer? answer;
  final void Function(MobileChecklistAnswer) onAnswer;
  final Future<MobileChecklistAttachmentMetadata?> Function(
    String fieldId,
    EvidenceCaptureSource source,
  )
  pickAndAttach;

  @override
  State<_BeforeAfterField> createState() => _BeforeAfterFieldState();
}

class _BeforeAfterFieldState extends State<_BeforeAfterField> {
  bool _addingBefore = false;
  bool _addingAfter = false;

  String? _extractId(String tag) {
    final prefix = '$tag:';
    return widget.answer?.multiChoiceValues
        ?.where((v) => v.startsWith(prefix))
        .map((v) => v.substring(prefix.length))
        .firstOrNull;
  }

  void _updateAnswer(String? beforeId, String? afterId) {
    final values = <String>[
      if (beforeId != null) 'before:$beforeId',
      if (afterId != null) 'after:$afterId',
    ];
    widget.onAnswer(
      MobileChecklistAnswer(
        fieldId: widget.field.id,
        multiChoiceValues: values.isEmpty ? null : values,
        answeredAt: DateTime.now(),
      ),
    );
  }

  Future<void> _addBefore() async {
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    final afterId = _extractId('after');
    setState(() => _addingBefore = true);
    try {
      final att = await widget.pickAndAttach(
        '${widget.field.id}_before',
        source,
      );
      if (att == null) return;
      _updateAnswer(att.localId, afterId);
    } finally {
      if (mounted) setState(() => _addingBefore = false);
    }
  }

  Future<void> _addAfter() async {
    final source = await showEvidenceSourcePicker(context);
    if (source == null || !mounted) return;
    final beforeId = _extractId('before');
    setState(() => _addingAfter = true);
    try {
      final att = await widget.pickAndAttach(
        '${widget.field.id}_after',
        source,
      );
      if (att == null) return;
      _updateAnswer(beforeId, att.localId);
    } finally {
      if (mounted) setState(() => _addingAfter = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final beforeId = _extractId('before');
    final afterId = _extractId('after');
    return Column(
      children: [
        _PhotoRow(
          label: 'Antes',
          hasAttachment: beforeId != null,
          adding: _addingBefore,
          onTap: _addBefore,
        ),
        const SizedBox(height: 10),
        _PhotoRow(
          label: 'Depois',
          hasAttachment: afterId != null,
          adding: _addingAfter,
          onTap: _addAfter,
        ),
      ],
    );
  }
}

// ---------------------------------------------------------------------------
// signature — assinatura persistida (traços salvos no answer.textValue)
// ---------------------------------------------------------------------------

class _SignatureField extends StatelessWidget {
  const _SignatureField({
    required this.field,
    required this.onAnswer,
    this.answer,
  });

  final MobileChecklistField field;
  final MobileChecklistAnswer? answer;
  final void Function(MobileChecklistAnswer) onAnswer;

  Future<void> _capture(BuildContext context) async {
    final encoded = await showSignatureCaptureSheet(
      context,
      title: field.label,
      initial: answer?.textValue,
    );
    if (encoded == null) return;
    onAnswer(
      MobileChecklistAnswer(
        fieldId: field.id,
        textValue: encoded.isEmpty ? null : encoded,
        answeredAt: DateTime.now(),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final hasInk = SignatureStrokes.hasInk(answer?.textValue);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (hasInk) ...[
          SignaturePad(
            key: const Key('signature-preview'),
            controller: SignaturePadController(initial: answer!.textValue),
            height: 120,
            readOnly: true,
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Icon(
                Icons.check_circle_outline,
                color: Colors.green.shade600,
                size: 16,
              ),
              const SizedBox(width: 4),
              Text(
                'Assinatura registrada',
                style: TextStyle(color: Colors.green.shade600, fontSize: 13),
              ),
            ],
          ),
          const SizedBox(height: 8),
        ],
        OutlinedButton.icon(
          key: const Key('signature-open'),
          onPressed: () => _capture(context),
          icon: const Icon(Icons.draw_outlined),
          label: Text(hasInk ? 'Refazer assinatura' : 'Assinar'),
        ),
      ],
    );
  }
}

class _PhotoRow extends StatelessWidget {
  const _PhotoRow({
    required this.label,
    required this.hasAttachment,
    required this.adding,
    required this.onTap,
  });

  final String label;
  final bool hasAttachment;
  final bool adding;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 56,
          height: 48,
          decoration: BoxDecoration(
            color: hasAttachment ? Colors.green.shade50 : Colors.grey.shade100,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: hasAttachment
                  ? Colors.green.shade300
                  : Colors.grey.shade300,
            ),
          ),
          child: Icon(
            hasAttachment
                ? Icons.check_circle_outline
                : Icons.add_a_photo_outlined,
            color: hasAttachment ? Colors.green.shade600 : Colors.grey,
            size: 24,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontWeight: FontWeight.w600)),
              Text(
                hasAttachment ? 'Evidencia registrada' : 'Sem evidencia',
                style: TextStyle(
                  color: hasAttachment ? Colors.green.shade600 : Colors.grey,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        OutlinedButton(
          onPressed: adding ? null : onTap,
          child: Text(
            adding
                ? '...'
                : hasAttachment
                ? 'Substituir'
                : 'Adicionar',
          ),
        ),
      ],
    );
  }
}
