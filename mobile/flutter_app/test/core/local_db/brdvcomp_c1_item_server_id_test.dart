// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(d)2–3 do plano do conserto) — o `ExpenseItem.serverId`
// PERSISTE: sem ele, depois de o app reiniciar, o upload do comprovante nunca monta a URL e fica `pending`
// para sempre (C2-DP-03; sonda `TOPO_SERVERID drift_item=null codec_item_has_server_id=false`).
//
// RR-D.1 — Drift real: o id do item gravado por `markItemSynced` sobrevive a um repositório NOVO sobre o
//          mesmo banco (o "reinício").
// RR-D.2 — codec: `ExpenseReportCodec.toJson`/`fromJson` preserva o `server_id` do item; JSON antigo, sem
//          a chave, dá `serverId == null` sem erro.
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_expense_local_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test(
    'RR-D.1 o id do item no servidor sobrevive ao reinício (Drift real, repositório NOVO sobre o mesmo banco)',
    () async {
      final db = AppDatabase.openInMemory();
      addTearDown(db.close);
      final store = DriftExpenseLocalStore(db);
      final queue = InMemorySyncQueueRepository();
      LocalExpenseRepository repository() => LocalExpenseRepository(
        session: _session(),
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: store,
        blobStore: InMemoryEvidenceBlobStore(),
      );

      final first = repository();
      final created = await first.createReport(
        title: 'Viagem',
        advanceAmount: 0,
      );
      final reportLocalId = created.report.localId;
      final added = await first.addItem(
        reportId: reportLocalId,
        categoryId: 'fuel',
        amount: 50,
        city: 'Campinas',
        vendorName: 'Posto',
      );
      final itemLocalId = added.report.items.last.localId;
      await first.markReportSynced(reportLocalId, 'report-server-1');
      await first.markItemSynced(reportLocalId, itemLocalId, 'item-server-1');

      // "Reinício": um repositório NOVO lê o mesmo banco.
      final restarted = repository();
      await restarted.load();
      expect(restarted.serverIdForReport(reportLocalId), 'report-server-1');
      expect(
        restarted.serverIdForItem(reportLocalId, itemLocalId),
        'item-server-1',
        reason: 'o id do item no servidor não sobreviveu ao reinício',
      );
    },
  );

  test(
    'RR-D.2 o codec preserva o server_id do item; JSON antigo sem a chave dá serverId nulo, sem erro',
    () {
      final report = ExpenseReport(
        localId: 'PC-local-11',
        serverId: 'report-server-11',
        title: 'Viagem',
        tenantId: 'tenant-demo',
        employeeId: 'employee-1',
        policyVersion: 'v1',
        status: ExpenseReportStatus.syncPending,
        items: [
          ExpenseItem(
            localId: 'item-local-11',
            tenantId: 'tenant-demo',
            categoryId: 'fuel',
            amount: 50,
            date: DateTime.utc(2026, 11, 2),
            serverId: 'item-server-11',
          ),
        ],
      );

      final json = ExpenseReportCodec.toJson(report);
      final itemJson =
          (json['items'] as List<Object?>).single as Map<String, Object?>;
      expect(
        itemJson['server_id'],
        'item-server-11',
        reason: 'o codec não grava o server_id do item',
      );
      final decoded = ExpenseReportCodec.fromJson(json.cast<String, dynamic>());
      expect(decoded.items.single.serverId, 'item-server-11');

      // JSON de antes do conserto: o item não tem a chave `server_id`.
      final legacy = Map<String, dynamic>.from(json);
      legacy['items'] = [
        Map<String, dynamic>.from(itemJson)..remove('server_id'),
      ];
      final decodedLegacy = ExpenseReportCodec.fromJson(legacy);
      expect(decodedLegacy.items.single.serverId, isNull);
      expect(decodedLegacy.items.single.localId, 'item-local-11');
    },
  );
}

BootstrapSession _session() {
  return const BootstrapSession(
    activeTenant: TenantContext(
      tenantId: 'tenant-demo',
      displayName: 'Tenant Demo',
    ),
    user: AuthenticatedUser(
      userId: 'employee-1',
      email: 'tecnico@demo.com',
      tenantRole: 'field_technician',
      tenantRoles: ['field_technician'],
      scope: 'tenant',
    ),
    enabledModules: [],
    permissions: PermissionSet({
      'expense_report:create',
      'expense_report:read',
      'expense_report:update',
      'expense_report:submit',
    }),
    expensePolicy: ExpensePolicySnapshot(
      version: 'v1',
      categoryLimits: {'fuel': 150, 'meal': 80},
      receiptRequiredCategories: {'fuel'},
    ),
  );
}
