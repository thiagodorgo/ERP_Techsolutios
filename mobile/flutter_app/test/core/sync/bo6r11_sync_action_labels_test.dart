import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_labels.dart';
import 'package:flutter_test/flutter_test.dart';

const _allTypes = <String>{
  WorkOrderSyncActionTypes.statusUpdate,
  WorkOrderSyncActionTypes.create,
  WorkOrderSyncActionTypes.approvalRequest,
  WorkOrderSyncActionTypes.evidenceAttach,
  WorkOrderSyncActionTypes.unableToStart,
  WorkOrderSyncActionTypes.assign,
  ...ExpenseSyncActionTypes.supported,
  ChecklistSyncActionTypes.runCreate,
  ChecklistSyncActionTypes.answerUpsert,
  ChecklistSyncActionTypes.runComplete,
  ChecklistSyncActionTypes.markerCreate,
  ChecklistSyncActionTypes.divergenceCreate,
  ChecklistSyncActionTypes.acknowledgementCreate,
  ChecklistSyncActionTypes.attachmentAttach,
  InventorySyncActionTypes.entryCreate,
  InventorySyncActionTypes.exitCreate,
  InventorySyncActionTypes.materialAdd,
  InventorySyncActionTypes.materialRemove,
  ...EvidenceSyncActionTypes.supported,
};

String _humanize(String type) => type
    .replaceAll('.', '_')
    .split('_')
    .map(
      (part) =>
          part.isEmpty ? '' : '${part[0].toUpperCase()}${part.substring(1)}',
    )
    .join(' ');

void main() {
  test('l1 os 27 tipos têm rótulo próprio sem verbos técnicos em inglês', () {
    expect(_allTypes, hasLength(27));
    for (final type in _allTypes) {
      final label = syncActionLabel(type);
      expect(label, isNot(_humanize(type)), reason: type);
      expect(label, isNot(startsWith('Ação de ')), reason: type);
      for (final technical in [
        'Create',
        'Update',
        'Upsert',
        'Attach',
        'Submit',
        'Add',
        'Complete',
      ]) {
        expect(label, isNot(contains(technical)), reason: '$type: $technical');
      }
    }
  });

  test('l2 rótulos críticos são PT-BR exato', () {
    expect(
      syncActionLabel(ExpenseSyncActionTypes.reportCreate),
      'Novo relatório de despesas',
    );
    expect(
      syncActionLabel(WorkOrderSyncActionTypes.statusUpdate),
      'Atualização de status da OS',
    );
    expect(
      syncActionLabel(ChecklistSyncActionTypes.runCreate),
      'Abertura de checklist',
    );
    expect(
      syncActionLabel(InventorySyncActionTypes.materialAdd),
      'Material aplicado na OS',
    );
  });

  test('l3 fallback usa domínio conhecido ou sincronização', () {
    expect(syncActionLabel('foo.bar'), 'Ação de sincronização');
    expect(syncActionLabel('work_order.xyz'), 'Ação de Ordens de Serviço');
  });

  test('l3 material tem domínio e remoção próprios', () {
    expect(
      syncDomainLabel(InventorySyncActionTypes.materialAdd),
      'Materiais da OS',
    );
    expect(
      syncActionLabel(InventorySyncActionTypes.materialRemove),
      'Peça retirada da OS',
    );
    expect(
      syncActionLabel('work_order_material.xyz'),
      'Ação de Materiais da OS',
    );
  });
}
