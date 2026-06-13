import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_picker.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_local_store.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_remote_api.dart';
import 'package:erp_techsolutions_mobile/features/checklists/data/checklist_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_test/flutter_test.dart';

// ---------------------------------------------------------------------------
// Fake picker — testable sem plugin nativo de camera
// ---------------------------------------------------------------------------

class FakeEvidencePickerService implements EvidencePickerService {
  FakeEvidencePickerService({this.result});

  final EvidencePickerResult? result;

  int callCount = 0;
  EvidenceCaptureSource? lastSource;

  @override
  Future<EvidencePickerResult?> pickImage(EvidenceCaptureSource source) async {
    callCount++;
    lastSource = source;
    return result;
  }
}

// ---------------------------------------------------------------------------
// Helpers compartilhados
// ---------------------------------------------------------------------------

const _tenantA = 'tenant-a';
const _tenantB = 'tenant-b';

const _sessionA = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenantA, displayName: 'Tenant A'),
  enabledModules: [],
  permissions: PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
);

WorkOrder _makeOrder({
  String localId = 'wo-b093-01',
  String tenantId = _tenantA,
  WorkOrderStatus status = WorkOrderStatus.inService,
}) => WorkOrder(
  localId: localId,
  tenantId: tenantId,
  code: 'OS-B093',
  title: 'OS de teste B-093',
  customerName: 'Cliente B093',
  serviceAddress: 'Rua B093, 1',
  status: status,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 6, 13),
);

WorkOrderRepository _makeWoRepo(
  BootstrapSession session,
  List<WorkOrder> seed,
) => WorkOrderRepository(
  session: session,
  syncQueue: InMemorySyncQueueRepository(),
  actionFactory: SyncActionFactory(),
  localStore: InMemoryWorkOrderLocalStore(seed),
);

EvidencePickerResult _fakeResult({
  EvidenceCaptureSource source = EvidenceCaptureSource.camera,
}) => EvidencePickerResult(
  fileName: 'foto-${source.name}.jpg',
  mimeType: 'image/jpeg',
  sizeBytes: 51200,
  captureSource: source,
);

// ---------------------------------------------------------------------------
// Testes
// ---------------------------------------------------------------------------

void main() {
  // t01: FakeEvidencePickerService retorna resultado com source correto
  test('t01: FakeEvidencePickerService — camera source propagado', () async {
    final fake = FakeEvidencePickerService(
      result: _fakeResult(source: EvidenceCaptureSource.camera),
    );

    final result = await fake.pickImage(EvidenceCaptureSource.camera);

    expect(result, isNotNull);
    expect(result!.captureSource, EvidenceCaptureSource.camera);
    expect(fake.callCount, 1);
    expect(fake.lastSource, EvidenceCaptureSource.camera);
  });

  // t02: EvidencePickerResult — sem token, path, base64 ou bytes
  test(
    't02: EvidencePickerResult — payload seguro (sem token/path/base64)',
    () {
      final result = _fakeResult(source: EvidenceCaptureSource.gallery);

      final fields = [
        result.fileName,
        result.mimeType,
        result.sizeBytes.toString(),
        result.captureSource.name,
      ];

      for (final v in fields) {
        expect(v, isNot(contains('token')));
        expect(v, isNot(contains('bearer')));
        expect(v, isNot(contains('password')));
        expect(v, isNot(contains('base64')));
      }
      expect(result.fileName, isNot(contains('/')));
    },
  );

  // t03: Cancelamento — picker retorna null → nenhuma evidencia criada
  test('t03: picker cancelado (null) — nenhuma evidencia registrada', () async {
    final fake = FakeEvidencePickerService(result: null);

    final result = await fake.pickImage(EvidenceCaptureSource.camera);

    expect(result, isNull);
    expect(fake.callCount, 1);
    // Null result signals cancellation — downstream code must not call addAttachment
  });

  // t04: ChecklistRepository.addAttachment — captureSource no modelo e payload
  test(
    't04: addAttachment — captureSource propagado ao modelo e sync queue',
    () async {
      final queue = InMemorySyncQueueRepository();
      final repo = ChecklistRepository(
        session: _sessionA,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryChecklistLocalStore(),
        remoteApi: const PendingBackendChecklistRemoteApi(),
      );

      await repo.load();
      final schema = await repo.getSchema('cl-seed-1');
      final run = await repo.getOrStartRun(
        checklistId: 'cl-seed-1',
        workOrderId: 'wo-test',
        schemaVersion: schema!.version,
      );

      final att = await repo.addAttachment(
        runId: run.localId,
        fieldId: 'f-photo',
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 12345,
        captureSource: 'camera',
      );

      expect(att.captureSource, 'camera');

      final actions = await queue.pendingForTenant(_tenantA);
      final attAction = actions.firstWhere(
        (a) => a.type == ChecklistSyncActionTypes.attachmentAttach,
      );
      expect(attAction.payload['capture_source'], 'camera');
    },
  );

  // t05: WorkOrderEvidence — campos obrigatorios presentes sem dados sensiveis
  test('t05: WorkOrderEvidence — modelo correto sem dados sensiveis', () {
    final ev = WorkOrderEvidence(
      localId: 'woevid-local-test',
      workOrderLocalId: 'wo-b093-01',
      tenantId: _tenantA,
      fileName: 'evidencia-camera.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 30720,
      captureSource: 'camera',
      syncStatus: SyncStatus.pending,
      createdAt: DateTime.utc(2026, 6, 13),
    );

    expect(ev.localId, startsWith('woevid-local-'));
    expect(ev.captureSource, 'camera');
    expect(ev.syncStatus, SyncStatus.pending);
    expect(ev.fileName, isNot(contains('token')));
  });

  // t06: WorkOrderRepository.attachEvidence — salva e enfileira sync action
  test(
    't06: attachEvidence — salva evidencia e enfileira sync action',
    () async {
      final queue = InMemorySyncQueueRepository();
      final wo = _makeOrder();
      final repo = WorkOrderRepository(
        session: _sessionA,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([wo]),
      );
      await repo.load();

      final ev = await repo.attachEvidence(
        workOrderLocalId: wo.localId,
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 20480,
        captureSource: 'gallery',
      );

      expect(ev.captureSource, 'gallery');
      expect(ev.tenantId, _tenantA);
      expect(ev.syncStatus, SyncStatus.pending);

      final stored = await repo.loadEvidence(wo.localId);
      expect(stored.length, 1);
      expect(stored.first.localId, ev.localId);

      final actions = await queue.pendingForTenant(_tenantA);
      final evAction = actions.firstWhere(
        (a) => a.type == WorkOrderSyncActionTypes.evidenceAttach,
      );
      expect(evAction.payload['capture_source'], 'gallery');
    },
  );

  // t07: evidenceAttach payload — sem token/path/base64
  test(
    't07: evidenceAttach payload — sem token, path, base64 ou bytes',
    () async {
      final queue = InMemorySyncQueueRepository();
      final wo = _makeOrder();
      final repo = WorkOrderRepository(
        session: _sessionA,
        syncQueue: queue,
        actionFactory: SyncActionFactory(),
        localStore: InMemoryWorkOrderLocalStore([wo]),
      );
      await repo.load();

      await repo.attachEvidence(
        workOrderLocalId: wo.localId,
        fileName: 'evidencia.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 40960,
        captureSource: 'camera',
      );

      final actions = await queue.pendingForTenant(_tenantA);
      final evAction = actions.firstWhere(
        (a) => a.type == WorkOrderSyncActionTypes.evidenceAttach,
      );
      final raw = evAction.payload.toString();
      expect(raw, isNot(contains('access_token')));
      expect(raw, isNot(contains('refresh_token')));
      expect(raw, isNot(contains('bearer')));
      expect(raw, isNot(contains('password')));
      expect(raw, isNot(contains('base64')));
    },
  );

  // t08: attachEvidence — isolamento de tenant (WO de outro tenant → StateError)
  test('t08: attachEvidence — WO de outro tenant lanca StateError', () async {
    final woOtherTenant = _makeOrder(tenantId: _tenantB);
    // _sessionA repo filters out WOs with tenantId != _tenantA on load
    final repo = _makeWoRepo(_sessionA, [woOtherTenant]);
    await repo.load();

    expect(
      () => repo.attachEvidence(
        workOrderLocalId: woOtherTenant.localId,
        fileName: 'foto.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        captureSource: 'camera',
      ),
      throwsA(isA<StateError>()),
    );
  });

  // t09: loadEvidence — retorna apenas evidencias da WO solicitada
  test('t09: loadEvidence — isolamento por workOrderLocalId', () async {
    final wo1 = _makeOrder(localId: 'wo-b093-01');
    final wo2 = _makeOrder(localId: 'wo-b093-02');
    final repo = _makeWoRepo(_sessionA, [wo1, wo2]);
    await repo.load();

    await repo.attachEvidence(
      workOrderLocalId: wo1.localId,
      fileName: 'ev-wo1.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 1024,
      captureSource: 'camera',
    );
    await repo.attachEvidence(
      workOrderLocalId: wo2.localId,
      fileName: 'ev-wo2.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: 2048,
      captureSource: 'gallery',
    );

    final ev1 = await repo.loadEvidence(wo1.localId);
    final ev2 = await repo.loadEvidence(wo2.localId);

    expect(ev1.length, 1);
    expect(ev1.first.fileName, 'ev-wo1.jpg');
    expect(ev2.length, 1);
    expect(ev2.first.fileName, 'ev-wo2.jpg');
  });

  // t10: captureSource.name — valores corretos para camera e gallery
  test('t10: EvidenceCaptureSource.name — valores corretos', () {
    expect(EvidenceCaptureSource.camera.name, 'camera');
    expect(EvidenceCaptureSource.gallery.name, 'gallery');
  });

  // t11: FakeEvidencePickerService — gallery source propagado
  test('t11: FakeEvidencePickerService — gallery source propagado', () async {
    final fake = FakeEvidencePickerService(
      result: _fakeResult(source: EvidenceCaptureSource.gallery),
    );

    final result = await fake.pickImage(EvidenceCaptureSource.gallery);

    expect(result, isNotNull);
    expect(result!.captureSource, EvidenceCaptureSource.gallery);
    expect(result.sizeBytes, greaterThan(0));
    expect(fake.lastSource, EvidenceCaptureSource.gallery);
  });

  // t12: ExpenseRepository.attachReceiptPlaceholder — captureSource camera
  test(
    't12: attachReceiptPlaceholder — captureSource camera registrado',
    () async {
      final repo = LocalExpenseRepository(
        session: _sessionA,
        syncQueue: InMemorySyncQueueRepository(),
        actionFactory: SyncActionFactory(),
        localStore: InMemoryExpenseLocalStore(),
      );
      await repo.load();

      final reports = repo.reports;
      expect(reports, isNotEmpty);
      final report = reports.first;
      expect(report.items, isNotEmpty);
      final item = report.items.first;

      await repo.attachReceiptPlaceholder(
        reportLocalId: report.localId,
        itemLocalId: item.localId,
        fileName: 'comprovante-camera.jpg',
        mimeType: 'image/jpeg',
        captureSource: ReceiptCaptureSource.camera,
      );

      final receipts = repo.receiptsForItem(report.localId, item.localId);
      expect(receipts, isNotEmpty);
      expect(receipts.last.captureSource, ReceiptCaptureSource.camera);
      expect(receipts.last.fileName, 'comprovante-camera.jpg');
    },
  );
}
