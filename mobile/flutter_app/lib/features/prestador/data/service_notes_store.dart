/// B-SAN3-15b (P9) — o diagnóstico e o serviço executado do atendimento do prestador, guardados no aparelho por
/// (organização, usuário, OS): outro usuário no mesmo aparelho vê os campos vazios. Na conclusão, o texto vai na
/// mensagem da ação de conclusão (`serviceConclusionMessage`).
class ServiceNotesScope {
  const ServiceNotesScope({
    required this.tenantId,
    required this.userId,
    required this.workOrderLocalId,
  });

  final String tenantId;
  final String userId;
  final String workOrderLocalId;
}

class ServiceNotes {
  const ServiceNotes({required this.diagnosis, required this.execution});

  static const empty = ServiceNotes(diagnosis: '', execution: '');

  final String diagnosis;
  final String execution;

  bool get isEmpty => diagnosis.trim().isEmpty && execution.trim().isEmpty;
}

abstract class ServiceNotesStore {
  Future<ServiceNotes?> load(ServiceNotesScope scope);
  Future<void> save(ServiceNotesScope scope, ServiceNotes notes);
}

/// Os testes e o app sem banco: vive enquanto a instância vive.
class InMemoryServiceNotesStore implements ServiceNotesStore {
  final Map<String, ServiceNotes> _notes = {};

  String _key(ServiceNotesScope scope) =>
      '${scope.tenantId}\u0000${scope.userId}\u0000${scope.workOrderLocalId}';

  @override
  Future<ServiceNotes?> load(ServiceNotesScope scope) async =>
      _notes[_key(scope)];

  @override
  Future<void> save(ServiceNotesScope scope, ServiceNotes notes) async {
    _notes[_key(scope)] = notes;
  }
}

/// Teto da mensagem de conclusão, com o "…" do corte incluído.
const serviceConclusionMessageMaxLength = 2000;

/// A mensagem que a conclusão envia: "Diagnóstico: …" e, na linha seguinte, "Serviço executado: …".
/// Campo vazio sai da mensagem; sem nenhum texto, `null` (a conclusão usa a mensagem padrão). Acima do teto, o texto
/// é cortado e termina em "…", com no máximo [serviceConclusionMessageMaxLength] caracteres no total.
String? serviceConclusionMessage(ServiceNotes? notes) {
  if (notes == null) return null;
  final diagnosis = notes.diagnosis.trim();
  final execution = notes.execution.trim();
  final parts = [
    if (diagnosis.isNotEmpty) 'Diagnóstico: $diagnosis',
    if (execution.isNotEmpty) 'Serviço executado: $execution',
  ];
  if (parts.isEmpty) return null;
  final full = parts.join('\n');
  if (full.length <= serviceConclusionMessageMaxLength) return full;
  var cut = serviceConclusionMessageMaxLength - 1;
  // Não parte um par substituto (emoji) ao meio.
  final last = full.codeUnitAt(cut - 1);
  if (last >= 0xD800 && last <= 0xDBFF) cut -= 1;
  return '${full.substring(0, cut)}…';
}
