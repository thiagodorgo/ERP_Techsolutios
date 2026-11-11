// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(c)4, §2(e), §12.9 e §13.1 item 5 do plano do conserto) — como o app
// classifica o que o servidor responde ao upload do comprovante. Cliente Dio REAL (`createAuthenticatedHttpClient` +
// `AuthRefreshInterceptor`) e upload REAL (`DioExpenseReceiptUploadApi`); o servidor fingido responde com o corpo de
// erro do backend (`{error: {code, reason, message}}`), e o motivo sai do corpo, como no lote.
//
// RR-E.3 — 401 depois de refresh nulo → `pending` sem gastar tentativa, `SESSION_EXPIRED`, blob preservado; 403 →
//          `conflict SESSION_FORBIDDEN`, blob preservado.
// RR-E.4 — 422 por motivo: `report_not_editable` → `conflict RECEIPT_REPORT_LOCKED`; `receipt_rejected` →
//          `RECEIPT_REJECTED`; blob preservado nos dois.
// RR-E.5 — recusas preservam o blob: 409/413/415/404 → blob presente, ação e comprovante em `conflict`, cada um com o
//          seu código.
// RR-E.6 — 400 `sha256_mismatch` → `conflict RECEIPT_INVALID`, blob preservado, `retryCount` inalterado, e o
//          `reportSubmit` não fica preso por ele; 408 e 429 continuam tentando de novo, com custo.
//
// Só APIs que já existiam no objeto (`b9e63ec0`): o arquivo também roda lá, e o vermelho-controle é de comportamento.
// O passe do RR-E.6 é lote → upload → lote com os serviços reais (o que `runExpenseSyncPass` faz quando há recusa).
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_sync_entity_updater.dart';
import 'package:erp_techsolutions_mobile/features/expenses/domain/expense_models.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-demo';
const _lockedText =
    'O relatório já foi enviado; este comprovante ficou no aparelho.';
const _invalidText =
    'O comprovante não pôde ser enviado; anexe de novo pelo item.';
const _expiredText =
    'Sessão expirada; o comprovante sobe quando você entrar de novo.';

/// Faz o papel do servidor do upload: lê o corpo e responde o status com o corpo de erro do backend.
class _UploadServer implements HttpClientAdapter {
  _UploadServer(this.status, {this.reason});

  final int status;
  final String? reason;
  int calls = 0;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    calls++;
    if (requestStream != null) {
      await requestStream.drain<void>();
    }
    final body = {
      'error': {
        'code': 'HTTP_$status',
        if (reason != null) 'reason': reason,
        'message': 'mensagem crua do servidor',
      },
    };
    return ResponseBody.fromString(
      jsonEncode(body),
      status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _Session {
  int clears = 0;
}

/// O cliente de produção. `refreshTo` nulo = o refresh falhou (o interceptor limpa a sessão e o 401 sobe).
Dio _client(_UploadServer server, _Session session, {String? refreshTo}) {
  final dio = createAuthenticatedHttpClient(
    const ApiConfig(baseUrl: 'https://test.local', accessToken: 'token-velho'),
    onRefresh: () async => refreshTo,
    onClearSession: () async {
      session.clears++;
    },
  );
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = server;
  return dio;
}

class _Scene {
  _Scene(this.queue, this.repository, this.blobs);

  final InMemorySyncQueueRepository queue;
  final LocalExpenseRepository repository;
  final InMemoryEvidenceBlobStore blobs;
  final List<List<String>> batches = [];
  late String reportLocalId;
  late String itemLocalId;
  late String receiptAction;
  late String blobRef;
  String? submitAction;

  Future<SyncAction> action(String clientActionId) async =>
      (await queue.actionsForTenant(
        _tenant,
      )).singleWhere((a) => a.clientActionId == clientActionId);

  Receipt get receipt =>
      repository.receiptsForItem(reportLocalId, itemLocalId).single;

  ExpenseReceiptSyncService receipts(Dio client) => ExpenseReceiptSyncService(
    queue: queue,
    repository: repository,
    blobStore: blobs,
    api: DioExpenseReceiptUploadApi(client),
  );

  List<SyncActionResult> _batch(List<SyncAction> actions) {
    batches.add([for (final a in actions) a.type]);
    return [
      for (final a in actions)
        SyncActionResult(
          clientActionId: a.clientActionId,
          status: 'processed',
          resultRef: a.payload['report_id'] as String? ?? 'srv-${a.type}',
        ),
    ];
  }

  /// Lote → upload → lote, com os serviços reais.
  Future<void> pass(Dio client) async {
    final replay = SyncReplayService(
      queue: queue,
      api: CaptureBatchApi(_batch),
      supportedActionTypes: ExpenseSyncActionTypes.backendSupported,
      entityUpdater: buildExpenseSyncEntityUpdater(repository),
      serverIdForReport: repository.serverIdForReport,
    );
    await replay.replayTenant(_tenant);
    try {
      await receipts(client).uploadTenant(_tenant);
    } catch (_) {}
    await replay.replayTenant(_tenant);
  }

  bool get sentSubmit =>
      batches.any((b) => b.contains(ExpenseSyncActionTypes.reportSubmit));
}

/// Relatório e item já no servidor (as ações de criação `synced`); comprovante anexado; envio opcional.
Future<_Scene> _scene({bool submit = false}) async {
  final queue = InMemorySyncQueueRepository();
  final blobs = InMemoryEvidenceBlobStore();
  final repository = LocalExpenseRepository(
    session: _bootstrap(),
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryExpenseLocalStore(),
    blobStore: blobs,
  );
  final s = _Scene(queue, repository, blobs);
  final created = await repository.createReport(
    title: 'Viagem',
    advanceAmount: 0,
  );
  s.reportLocalId = created.report.localId;
  final added = await repository.addItem(
    reportId: s.reportLocalId,
    categoryId: 'fuel',
    amount: 50,
    city: 'Campinas',
    vendorName: 'Posto',
  );
  s.itemLocalId = added.report.items.last.localId;
  final attach = await repository.attachReceiptPlaceholder(
    reportLocalId: s.reportLocalId,
    itemLocalId: s.itemLocalId,
    fileName: 'nota.jpg',
    mimeType: 'image/jpeg',
    bytes: Uint8List.fromList(List<int>.filled(32, 7)),
    sha256: 'a' * 64,
  );
  s.receiptAction = attach!.clientActionId;
  s.blobRef = s.receipt.localReference!;
  await repository.markReportSynced(s.reportLocalId, 'rep-srv-1');
  await repository.markItemSynced(s.reportLocalId, s.itemLocalId, 'item-srv-1');
  for (final a in await queue.actionsForTenant(_tenant)) {
    final ref = switch (a.type) {
      ExpenseSyncActionTypes.reportCreate => 'rep-srv-1',
      ExpenseSyncActionTypes.itemCreate => 'item-srv-1',
      _ => null,
    };
    if (ref == null) continue;
    await queue.update(
      a.copyWith(
        status: SyncStatus.synced,
        payload: {...a.payload, 'result_ref': ref},
      ),
    );
  }
  if (submit) {
    final submitted = await repository.submitReport(s.reportLocalId);
    s.submitAction = submitted.action.clientActionId;
  }
  return s;
}

String _line(SyncAction a, _Scene s) =>
    'status=${a.status.name} retry=${a.retryCount} code=${a.lastErrorCode} '
    'receipt=${s.receipt.uploadStatus.name}';

BootstrapSession _bootstrap() => const BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Tenant Demo'),
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

void main() {
  test(
    'RR-E.3 401 × 403: 401 depois de refresh nulo → `pending` sem gastar tentativa, SESSION_EXPIRED, blob '
    'preservado; 403 → `conflict SESSION_FORBIDDEN`, blob preservado',
    () async {
      // 401: o refresh falha, o interceptor limpa a sessão e o 401 chega ao serviço.
      final expired = await _scene();
      final expiredServer = _UploadServer(401, reason: 'missing_actor');
      final expiredSession = _Session();
      await expired
          .receipts(_client(expiredServer, expiredSession))
          .uploadTenant(_tenant);
      final a = await expired.action(expired.receiptAction);
      final lineA = _line(a, expired);
      expect(expiredSession.clears, 1, reason: lineA);
      expect(a.status, SyncStatus.pending, reason: lineA);
      expect(a.retryCount, 0, reason: lineA);
      expect(a.lastErrorCode, 'SESSION_EXPIRED', reason: lineA);
      expect(a.lastSafeError, _expiredText, reason: lineA);
      expect(await expired.blobs.load(expired.blobRef), isNotNull);

      // 403: a sessão vale, mas não tem permissão — não tenta refresh, não limpa a sessão.
      final forbidden = await _scene();
      final forbiddenServer = _UploadServer(403, reason: 'permission_required');
      final forbiddenSession = _Session();
      await forbidden
          .receipts(
            _client(forbiddenServer, forbiddenSession, refreshTo: 'novo'),
          )
          .uploadTenant(_tenant);
      final b = await forbidden.action(forbidden.receiptAction);
      final lineB = _line(b, forbidden);
      expect(forbiddenServer.calls, 1, reason: lineB);
      expect(forbiddenSession.clears, 0, reason: lineB);
      expect(b.status, SyncStatus.conflict, reason: lineB);
      expect(b.lastErrorCode, 'SESSION_FORBIDDEN', reason: lineB);
      expect(await forbidden.blobs.load(forbidden.blobRef), isNotNull);
    },
  );

  test(
    'RR-E.4 422 por motivo: report_not_editable → RECEIPT_REPORT_LOCKED; receipt_rejected → RECEIPT_REJECTED; '
    'blob preservado nos dois',
    () async {
      final locked = await _scene();
      await locked
          .receipts(
            _client(
              _UploadServer(422, reason: 'report_not_editable'),
              _Session(),
            ),
          )
          .uploadTenant(_tenant);
      final a = await locked.action(locked.receiptAction);
      final lineA = _line(a, locked);
      expect(a.status, SyncStatus.conflict, reason: lineA);
      expect(a.lastErrorCode, 'RECEIPT_REPORT_LOCKED', reason: lineA);
      expect(a.lastSafeError, _lockedText, reason: lineA);
      expect(locked.receipt.uploadStatus, ReceiptUploadStatus.conflict);
      expect(await locked.blobs.load(locked.blobRef), isNotNull);

      final rejected = await _scene();
      await rejected
          .receipts(
            _client(_UploadServer(422, reason: 'receipt_rejected'), _Session()),
          )
          .uploadTenant(_tenant);
      final b = await rejected.action(rejected.receiptAction);
      final lineB = _line(b, rejected);
      expect(b.status, SyncStatus.conflict, reason: lineB);
      expect(b.lastErrorCode, 'RECEIPT_REJECTED', reason: lineB);
      expect(rejected.receipt.uploadStatus, ReceiptUploadStatus.conflict);
      expect(await rejected.blobs.load(rejected.blobRef), isNotNull);
    },
  );

  test(
    'RR-E.5 recusas preservam o blob: 409/413/415/404 → blob presente, ação e comprovante em `conflict`, cada um com '
    'o seu código',
    () async {
      const cases = <(int, String, String)>[
        (409, 'payload_mismatch', 'RECEIPT_PAYLOAD_MISMATCH'),
        (413, 'file_too_large', 'RECEIPT_FILE_TOO_LARGE'),
        (415, 'unsupported_media_type', 'RECEIPT_UNSUPPORTED_TYPE'),
        (404, 'expense_not_found', 'EXPENSE_NOT_FOUND'),
      ];
      for (final (status, reason, code) in cases) {
        final s = await _scene();
        await s
            .receipts(
              _client(_UploadServer(status, reason: reason), _Session()),
            )
            .uploadTenant(_tenant);
        final a = await s.action(s.receiptAction);
        final line = '$status: ${_line(a, s)}';
        expect(a.status, SyncStatus.conflict, reason: line);
        expect(a.lastErrorCode, code, reason: line);
        expect(s.receipt.uploadStatus, ReceiptUploadStatus.conflict);
        expect(await s.blobs.load(s.blobRef), isNotNull, reason: line);
      }
    },
  );

  test(
    'RR-E.6 400 sha256_mismatch → `conflict RECEIPT_INVALID`, blob preservado, retryCount inalterado, e o envio do '
    'relatório não fica preso; 408 e 429 continuam tentando de novo, com custo',
    () async {
      final s = await _scene(submit: true);
      await s.pass(
        _client(_UploadServer(400, reason: 'sha256_mismatch'), _Session()),
      );
      final a = await s.action(s.receiptAction);
      final line = _line(a, s);
      expect(a.status, SyncStatus.conflict, reason: line);
      expect(a.lastErrorCode, 'RECEIPT_INVALID', reason: line);
      expect(a.lastSafeError, _invalidText, reason: line);
      expect(a.retryCount, 0, reason: line);
      expect(await s.blobs.load(s.blobRef), isNotNull, reason: line);
      expect(s.sentSubmit, isTrue, reason: 'o envio ficou preso: $line');
      expect((await s.action(s.submitAction!)).status, SyncStatus.synced);

      for (final status in const [408, 429]) {
        final t = await _scene();
        await t
            .receipts(_client(_UploadServer(status), _Session()))
            .uploadTenant(_tenant);
        final b = await t.action(t.receiptAction);
        final lineB = '$status: ${_line(b, t)}';
        expect(b.status, SyncStatus.failed, reason: lineB);
        expect(b.retryCount, 1, reason: lineB);
        expect(await t.blobs.load(t.blobRef), isNotNull, reason: lineB);
      }
    },
  );
}
