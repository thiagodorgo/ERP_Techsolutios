# B-093 — Evidencia Real Camera/Galeria + Upload Metadata Seguro

**Data:** 2026-06-13
**Status:** Concluido
**Testes:** 12/12 novos (280/280 total)

## Objetivo

Conectar camera/galeria real ao fluxo de evidencias do app mobile:
- Checklist `photoUpload` e `beforeAfter` usam picker real
- OS (work_order_execute_screen) registra evidencias com metadados seguros
- RDV (expense_item_receipts_screen) conecta picker real ao comprovante
- Sync payload inclui apenas metadados seguros — sem token, path, base64 ou bytes

## Mudancas por arquivo

### `pubspec.yaml`

```yaml
image_picker: ^1.1.2
```

### `lib/core/evidence/evidence_picker.dart` (novo)

```dart
enum EvidenceCaptureSource { camera, gallery }

class EvidencePickerResult {
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final EvidenceCaptureSource captureSource;
  // SEM: path, bytes, base64, token
}

abstract class EvidencePickerService {
  Future<EvidencePickerResult?> pickImage(EvidenceCaptureSource source);
}

class ImagePickerEvidenceService implements EvidencePickerService { ... }

final evidencePickerProvider = Provider<EvidencePickerService>(...);

Future<EvidenceCaptureSource?> showEvidenceSourcePicker(BuildContext context) { ... }
```

**FakeEvidencePickerService** existe APENAS em arquivos de teste — sem codigo de teste em producao.

### `checklist_models.dart`

`MobileChecklistAttachmentMetadata` ganhou `captureSource: String?` nullable.
Drift nao tem coluna `capture_source` em `checklist_attachments` — campo nao persistido localmente mas incluido no sync payload.

### `checklist_repository.dart`

`addAttachment()` ganhou `captureSource: String?` e inclui `'capture_source': captureSource` no payload de `checklist_attachment.attach`.

### `checklist_run_screen.dart`

- `onAddAttachment: Future<Metadata> Function(String)` renomeado para `pickAndAttach: Future<Metadata?> Function(String fieldId, EvidenceCaptureSource source)`
- `_doPickAndAttach` helper no state: `ref.read(evidencePickerProvider).pickImage(source)` → `repo.addAttachment(..., captureSource: result.captureSource.name)`
- `_PhotoUploadField._add()`: chama `showEvidenceSourcePicker(context)` antes do picker; cancela se source == null
- `_BeforeAfterField._addBefore()/_addAfter()`: mesmo padrao

### `work_order_models.dart`

```dart
class WorkOrderEvidence {
  final String localId;
  final String workOrderLocalId;
  final String tenantId;
  final String fileName;
  final String mimeType;
  final int sizeBytes;
  final String captureSource; // 'camera' | 'gallery'
  final String? checksum;
  final SyncStatus syncStatus;
  final DateTime createdAt;
}
```

### `work_order_local_store.dart`

Interface `WorkOrderLocalStore` ganhou `saveEvidence` e `loadEvidence`.
`InMemoryWorkOrderLocalStore` implementa com `Map<String, WorkOrderEvidence> _evidence`; `clearAll` inclui `_evidence.clear()`.

### `work_order_repository.dart`

**`attachEvidence()`**: valida WO existe e pertence ao tenant; cria `WorkOrderEvidence`; salva na store; enfileira `work_order.evidence_attach`:

```
payload: {
  local_evidence_id, work_order_local_id, work_order_server_id,
  file_name, mime_type, size_bytes, capture_source, created_at, checksum?
}
```

Sem: `access_token`, `refresh_token`, `bearer`, `password`, `base64`, path absoluto.

**`loadEvidence(String workOrderLocalId)`**: delega a store.

### `work_order_execute_screen.dart`

- `_ExecData` ganhou `evidences: List<WorkOrderEvidence>`
- `_loadData` chama `woRepo.loadEvidence(widget.workOrderId)`
- Placeholder `OutlinedButton 'Registrar evidencia (futuro)'` substituido por `_EvidenceSection`
- `_attachEvidence`: `showEvidenceSourcePicker → picker.pickImage → woRepo.attachEvidence → setState(() => _dataFuture = null)`
- `_EvidenceSection`: lista de evidencias existentes + botao "Registrar evidencia"

### `expense_item_receipts_screen.dart`

Convertido de `ConsumerWidget` para `ConsumerStatefulWidget`.
`_addReceipt()`: `showEvidenceSourcePicker → picker.pickImage → expenseRepo.attachReceiptPlaceholder(captureSource: camera | gallery)`.
Botoes usam `_adding` como guard (desabilitados durante operacao).

## Testes

| # | Escopo | Descricao |
|---|---|---|
| t01 | Unit | FakeEvidencePickerService — camera source propagado |
| t02 | Unit | EvidencePickerResult — sem token/path/bearer/base64 |
| t03 | Unit | picker cancelado (null) — nenhuma evidencia registrada |
| t04 | Unit | addAttachment — captureSource no modelo e sync queue |
| t05 | Unit | WorkOrderEvidence — modelo correto sem dados sensiveis |
| t06 | Unit | attachEvidence — salva e enfileira sync action |
| t07 | Unit | evidenceAttach payload — sem token/path/base64 |
| t08 | Unit | attachEvidence — WO de outro tenant lanca StateError |
| t09 | Unit | loadEvidence — isolamento por workOrderLocalId |
| t10 | Unit | EvidenceCaptureSource.name — 'camera' e 'gallery' |
| t11 | Unit | FakeEvidencePickerService — gallery source propagado |
| t12 | Unit | attachReceiptPlaceholder — captureSource camera registrado |

## Decisoes tecnicas

**`FakeEvidencePickerService` apenas em test/**: a implementacao fake nao existe em `lib/` para nao shipar codigo de teste em producao. A interface abstrata em `lib/core/evidence/evidence_picker.dart` permite substituicao completa.

**`captureSource: String?` nullable no modelo**: Drift nao tem coluna `capture_source` em `checklist_attachments` — backward compatible, sem migracao. O payload de sync captura o valor imediatamente no `addAttachment()`, antes do roundtrip pelo Drift.

**Sem migracao Drift para evidencias de OS**: `InMemoryWorkOrderLocalStore` e o store atual — nenhum schema Drift tocado.

**`showEvidenceSourcePicker` compartilhado**: funcao top-level reutilizada por checklist, OS e RDV. Ponto unico de UX de selecao de fonte.

**Cancellation-safe**: `pickImage` retorna null quando usuario cancela; todos os fluxos verificam `result == null` e `source == null` antes de prosseguir — sem efeitos colaterais em caso de cancelamento.

## Constraints mantidos

- sem commit, sem push, sem PR
- sem alteracoes em backend, frontend React, migrations, pagamentos, fiscal, comissoes
- `experiments/` nao tocado
- payload de sync sem token/path/base64/bytes
