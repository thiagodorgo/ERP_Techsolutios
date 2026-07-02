import 'checklist_models.dart';

/// Uma divergência entre a coleta e a entrega para um campo do checklist.
class ChecklistDivergence {
  const ChecklistDivergence({
    required this.fieldId,
    required this.label,
    required this.collectionValue,
    required this.deliveryValue,
  });

  final String fieldId;
  final String label;
  final String collectionValue;
  final String deliveryValue;
}

/// Compara as respostas da coleta e da entrega, campo a campo, retornando as
/// divergências (valores que mudaram entre as duas fases).
///
/// Campos de assinatura são ignorados (a assinatura da entrega é
/// naturalmente diferente da coleta). Campos sem valor em ambas as fases
/// não geram divergência.
List<ChecklistDivergence> compareChecklistRuns({
  required MobileChecklistSchema schema,
  required MobileChecklistRun collection,
  required MobileChecklistRun delivery,
}) {
  final divergences = <ChecklistDivergence>[];
  for (final field in schema.sortedFields) {
    if (field.type == MobileChecklistFieldType.signature) continue;

    final c = collection.answers[field.id];
    final d = delivery.answers[field.id];
    final cHas = c?.hasValue ?? false;
    final dHas = d?.hasValue ?? false;
    if (!cHas && !dHas) continue;

    final cValue = cHas ? c!.displayValue : '';
    final dValue = dHas ? d!.displayValue : '';
    if (cValue != dValue) {
      divergences.add(
        ChecklistDivergence(
          fieldId: field.id,
          label: field.label,
          collectionValue: cValue.isEmpty ? '—' : cValue,
          deliveryValue: dValue.isEmpty ? '—' : dValue,
        ),
      );
    }
  }
  return divergences;
}
