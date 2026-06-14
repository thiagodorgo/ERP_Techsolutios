import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../domain/checklist_template_models.dart';

// ---------------------------------------------------------------------------
// Abstract builder contract
// ---------------------------------------------------------------------------

abstract class ChecklistQuestionWidgetBuilder {
  bool supports(ChecklistQuestionType type);

  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  });
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

class ChecklistQuestionRendererRegistry {
  ChecklistQuestionRendererRegistry([
    List<ChecklistQuestionWidgetBuilder>? builders,
  ]) : _builders = builders ?? _defaultBuilders();

  final List<ChecklistQuestionWidgetBuilder> _builders;
  final _UnknownTypeBuilder _fallback = const _UnknownTypeBuilder();

  static List<ChecklistQuestionWidgetBuilder> _defaultBuilders() => [
    const _TextBuilder(),
    const _LongTextBuilder(),
    const _IntegerBuilder(),
    const _DecimalBuilder(),
    const _YesNoBuilder(),
    const _SingleChoiceBuilder(),
    const _MultiChoiceBuilder(),
    const _PhotoBuilder(),
    const _DamageMapBuilder(),
    const _SectionNoteBuilder(),
  ];

  Widget render({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final builder = _builders.where((b) => b.supports(question.type)).firstOrNull
        ?? _fallback;

    return _QuestionShell(
      question: question,
      child: builder.build(
        question: question,
        answer: answer,
        onChanged: onChanged,
        context: context,
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shell (label + help + required indicator)
// ---------------------------------------------------------------------------

class _QuestionShell extends StatelessWidget {
  const _QuestionShell({required this.question, required this.child});

  final ChecklistQuestion question;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          RichText(
            text: TextSpan(
              text: question.label,
              style: DefaultTextStyle.of(context).style.copyWith(
                fontWeight: FontWeight.w600,
                fontSize: 14,
              ),
              children: [
                if (question.required)
                  const TextSpan(
                    text: ' *',
                    style: TextStyle(color: Colors.red),
                  ),
              ],
            ),
          ),
          if (question.helpText != null) ...[
            const SizedBox(height: 2),
            Text(
              question.helpText!,
              style: const TextStyle(fontSize: 12, color: Colors.black54),
            ),
          ],
          const SizedBox(height: 6),
          child,
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Helper: build a ChecklistAnswer for a question
// ---------------------------------------------------------------------------

ChecklistAnswer _answer(
  ChecklistQuestion q,
  ChecklistRunContext ctx, {
  String? text,
  double? number,
  bool? bool_,
  String? choice,
  List<String>? choices,
  List<String>? attachments,
}) => ChecklistAnswer(
  questionId: q.id,
  questionCode: q.code,
  type: q.type,
  answeredAt: DateTime.now().toUtc(),
  textValue: text,
  numberValue: number,
  boolValue: bool_,
  singleChoiceValue: choice,
  multiChoiceValues: choices,
  attachmentIds: attachments,
);

// ---------------------------------------------------------------------------
// Built-in builders
// ---------------------------------------------------------------------------

class _TextBuilder implements ChecklistQuestionWidgetBuilder {
  const _TextBuilder();

  @override
  bool supports(ChecklistQuestionType t) => t == ChecklistQuestionType.text;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return _TextFieldAdapter(
      initialValue: answer?.textValue,
      maxLines: 1,
      keyboardType: TextInputType.text,
      onChanged: (v) => onChanged(_answer(question, context, text: v)),
    );
  }
}

class _LongTextBuilder implements ChecklistQuestionWidgetBuilder {
  const _LongTextBuilder();

  @override
  bool supports(ChecklistQuestionType t) => t == ChecklistQuestionType.longText;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return _TextFieldAdapter(
      initialValue: answer?.textValue,
      maxLines: 4,
      keyboardType: TextInputType.multiline,
      onChanged: (v) => onChanged(_answer(question, context, text: v)),
    );
  }
}

class _IntegerBuilder implements ChecklistQuestionWidgetBuilder {
  const _IntegerBuilder();

  @override
  bool supports(ChecklistQuestionType t) => t == ChecklistQuestionType.integer;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return _TextFieldAdapter(
      initialValue: answer?.numberValue?.toInt().toString(),
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      onChanged: (v) => onChanged(
        _answer(question, context, number: double.tryParse(v)),
      ),
    );
  }
}

class _DecimalBuilder implements ChecklistQuestionWidgetBuilder {
  const _DecimalBuilder();

  @override
  bool supports(ChecklistQuestionType t) =>
      t == ChecklistQuestionType.decimal || t == ChecklistQuestionType.currency;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return _TextFieldAdapter(
      initialValue: answer?.numberValue?.toString(),
      keyboardType: const TextInputType.numberWithOptions(decimal: true),
      inputFormatters: [
        FilteringTextInputFormatter.allow(RegExp(r'^\d*[.,]?\d*')),
      ],
      onChanged: (v) => onChanged(
        _answer(
          question,
          context,
          number: double.tryParse(v.replaceAll(',', '.')),
        ),
      ),
    );
  }
}

class _YesNoBuilder implements ChecklistQuestionWidgetBuilder {
  const _YesNoBuilder();

  @override
  bool supports(ChecklistQuestionType t) => t == ChecklistQuestionType.yesNo;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final current = answer?.textValue;
    return Row(
      children: [
        _ChoiceButton(
          label: 'Sim',
          selected: current == 'yes',
          color: Colors.green,
          onTap: () => onChanged(_answer(question, context, text: 'yes')),
        ),
        const SizedBox(width: 12),
        _ChoiceButton(
          label: 'Nao',
          selected: current == 'no',
          color: Colors.red,
          onTap: () => onChanged(_answer(question, context, text: 'no')),
        ),
        const SizedBox(width: 12),
        _ChoiceButton(
          label: 'N/A',
          selected: current == 'na',
          color: Colors.grey,
          onTap: () => onChanged(_answer(question, context, text: 'na')),
        ),
      ],
    );
  }
}

class _SingleChoiceBuilder implements ChecklistQuestionWidgetBuilder {
  const _SingleChoiceBuilder();

  @override
  bool supports(ChecklistQuestionType t) =>
      t == ChecklistQuestionType.singleChoice;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final opts = question.options ?? [];
    final selected = answer?.singleChoiceValue;
    return RadioGroup<String>(
      groupValue: selected,
      onChanged: (v) {
        if (v != null) onChanged(_answer(question, context, choice: v));
      },
      child: Column(
        children: [
          for (final opt in opts)
            RadioListTile<String>(
              dense: true,
              contentPadding: EdgeInsets.zero,
              visualDensity: VisualDensity.compact,
              value: opt.value,
              title: Text(opt.label, style: const TextStyle(fontSize: 14)),
              subtitle: opt.description != null
                  ? Text(
                      opt.description!,
                      style: const TextStyle(fontSize: 12),
                    )
                  : null,
            ),
        ],
      ),
    );
  }
}

class _MultiChoiceBuilder implements ChecklistQuestionWidgetBuilder {
  const _MultiChoiceBuilder();

  @override
  bool supports(ChecklistQuestionType t) =>
      t == ChecklistQuestionType.multiChoice;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final opts = question.options ?? [];
    final selected = List<String>.from(answer?.multiChoiceValues ?? []);
    return Column(
      children: [
        for (final opt in opts)
          CheckboxListTile(
            dense: true,
            contentPadding: EdgeInsets.zero,
            visualDensity: VisualDensity.compact,
            value: selected.contains(opt.value),
            title: Text(opt.label, style: const TextStyle(fontSize: 14)),
            onChanged: (checked) {
              final updated = List<String>.from(selected);
              if (checked == true) {
                updated.add(opt.value);
              } else {
                updated.remove(opt.value);
              }
              onChanged(_answer(question, context, choices: updated));
            },
          ),
      ],
    );
  }
}

class _PhotoBuilder implements ChecklistQuestionWidgetBuilder {
  const _PhotoBuilder();

  @override
  bool supports(ChecklistQuestionType t) => t == ChecklistQuestionType.photo;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final count = answer?.attachmentIds?.length ?? 0;
    return OutlinedButton.icon(
      onPressed: null, // photo capture not yet wired — NÃO fazer upload real
      icon: const Icon(Icons.camera_alt_outlined),
      label: Text(
        count > 0 ? '$count foto(s) anexada(s)' : 'Tirar foto',
      ),
    );
  }
}

class _DamageMapBuilder implements ChecklistQuestionWidgetBuilder {
  const _DamageMapBuilder();

  @override
  bool supports(ChecklistQuestionType t) =>
      t == ChecklistQuestionType.damageMap;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    final hasData = answer?.textValue != null;
    return OutlinedButton.icon(
      onPressed: null, // navigates to DamageMapScreen — wire-up pending
      icon: const Icon(Icons.car_crash_outlined),
      label: Text(hasData ? 'Mapa de danos registrado' : 'Abrir mapa de danos'),
    );
  }
}

class _SectionNoteBuilder implements ChecklistQuestionWidgetBuilder {
  const _SectionNoteBuilder();

  @override
  bool supports(ChecklistQuestionType t) =>
      t == ChecklistQuestionType.sectionNote;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: Colors.blue.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.blue.shade200),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.info_outline, size: 16, color: Colors.blue.shade700),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              question.label,
              style: TextStyle(fontSize: 13, color: Colors.blue.shade900),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Fallback for unsupported types
// ---------------------------------------------------------------------------

class _UnknownTypeBuilder implements ChecklistQuestionWidgetBuilder {
  const _UnknownTypeBuilder();

  @override
  bool supports(ChecklistQuestionType t) => true;

  @override
  Widget build({
    required ChecklistQuestion question,
    required ChecklistAnswer? answer,
    required ValueChanged<ChecklistAnswer> onChanged,
    required ChecklistRunContext context,
  }) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.amber.shade50,
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: Colors.amber.shade300),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(
            Icons.warning_amber_outlined,
            size: 16,
            color: Colors.amber.shade700,
          ),
          const SizedBox(width: 8),
          const Expanded(
            child: Text(
              'Este tipo de pergunta ainda nao e suportado nesta versao do app.',
              style: TextStyle(fontSize: 13),
            ),
          ),
        ],
      ),
    );
  }
}

// ---------------------------------------------------------------------------
// Shared sub-widgets
// ---------------------------------------------------------------------------

class _TextFieldAdapter extends StatefulWidget {
  const _TextFieldAdapter({
    required this.onChanged,
    this.initialValue,
    this.maxLines = 1,
    this.keyboardType,
    this.inputFormatters,
  });

  final String? initialValue;
  final ValueChanged<String> onChanged;
  final int maxLines;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;

  @override
  State<_TextFieldAdapter> createState() => _TextFieldAdapterState();
}

class _TextFieldAdapterState extends State<_TextFieldAdapter> {
  late final TextEditingController _ctrl;

  @override
  void initState() {
    super.initState();
    _ctrl = TextEditingController(text: widget.initialValue ?? '');
  }

  @override
  void dispose() {
    _ctrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: _ctrl,
      maxLines: widget.maxLines,
      minLines: 1,
      keyboardType: widget.keyboardType,
      inputFormatters: widget.inputFormatters,
      decoration: const InputDecoration(
        border: OutlineInputBorder(),
        isDense: true,
        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      ),
      onChanged: widget.onChanged,
    );
  }
}

class _ChoiceButton extends StatelessWidget {
  const _ChoiceButton({
    required this.label,
    required this.selected,
    required this.color,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final MaterialColor color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return OutlinedButton(
      style: OutlinedButton.styleFrom(
        backgroundColor: selected ? color.shade100 : null,
        side: BorderSide(
          color: selected ? color.shade700 : Colors.grey.shade400,
          width: selected ? 2 : 1,
        ),
        foregroundColor: selected ? color.shade800 : Colors.grey.shade700,
        minimumSize: const Size(68, 40),
        padding: EdgeInsets.zero,
      ),
      onPressed: onTap,
      child: Text(label, style: const TextStyle(fontSize: 13)),
    );
  }
}
