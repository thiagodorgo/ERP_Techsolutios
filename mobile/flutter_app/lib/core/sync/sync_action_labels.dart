String syncDomainLabel(String type) {
  if (type.startsWith('checklist_') || type.startsWith('checklist.')) {
    return 'Checklists';
  }
  if (type.startsWith('expense_') || type.startsWith('rdv_')) {
    return 'Despesas (RDV)';
  }
  if (type.startsWith('work_order') || type.startsWith('work-order')) {
    return 'Ordens de Serviço';
  }
  if (type.startsWith('inventory_')) return 'Estoque';
  return 'Outros';
}

const _actionLabels = <String, String>{
  'work_order.status_update': 'Atualização de status da OS',
  'work_order.create': 'Criação de OS',
  'work_order.approval_request': 'Pedido de aprovação da OS',
  'work_order.evidence_attach': 'Evidência anexada à OS',
  'work_order.unable_to_start': 'OS não pôde ser iniciada',
  'work_order.assign': 'Atribuição da OS',
  'expense_report.create': 'Novo relatório de despesas',
  'expense_item.create': 'Lançamento de despesa',
  'expense_report.submit': 'Envio do relatório de despesas',
  'expense_receipt.attach': 'Comprovante de despesa',
  'checklist_run.create': 'Abertura de checklist',
  'checklist_answer.upsert': 'Resposta do checklist',
  'checklist_run.complete': 'Conclusão do checklist',
  'checklist_marker.create': 'Marcação no checklist',
  'checklist_divergence.create': 'Divergência no checklist',
  'checklist_acknowledgement.create': 'Ciência do checklist',
  'checklist_attachment.attach': 'Foto do checklist',
  'inventory_entry.create': 'Entrada de estoque',
  'inventory_exit.create': 'Saída de estoque',
  'work_order_material.add': 'Material aplicado na OS',
  'evidence.work_order_photo': 'Foto da OS',
  'evidence.work_order_signature': 'Assinatura da OS',
  'evidence.work_order_observation': 'Observação da OS',
  'evidence.field_photo': 'Foto de campo',
  'evidence.field_signature': 'Assinatura de campo',
  'evidence.field_observation': 'Observação de campo',
};

String syncActionLabel(String type) {
  final exact = _actionLabels[type];
  if (exact != null) return exact;
  final domain = syncDomainLabel(type);
  return domain == 'Outros' ? 'Ação de sincronização' : 'Ação de $domain';
}
