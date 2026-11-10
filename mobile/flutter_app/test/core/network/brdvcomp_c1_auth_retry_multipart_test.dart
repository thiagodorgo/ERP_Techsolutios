// B-RDV-COMPROVANTE · conserto c1 do #525 (§2(e) C2-DP-01, F6a do plano do conserto) — o retry do 401 com corpo
// multipart. O cliente é o REAL (`createAuthenticatedHttpClient` + `AuthRefreshInterceptor`) e o upload é o REAL
// (`DioExpenseReceiptUploadApi`); só o adaptador HTTP é fingido, e ele CONSOME o corpo, como um servidor.
//
// RR-E.1 — 401 e depois 201: 2 chamadas com o mesmo tamanho de corpo, 0 limpeza de sessão, resposta `uploaded`.
// RR-E.2 — depois do refresh, o retry volta 503: 0 limpeza de sessão, o erro que sobe é o 503 e o comprovante volta a
//          `pending` sem gastar tentativa. O retry que volta 401 limpa a sessão, como hoje.
//
// Só APIs que já existiam no objeto (`b9e63ec0`): o arquivo também roda lá, e o vermelho-controle é de comportamento.
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/expense_receipt_sync.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:flutter_test/flutter_test.dart';

const _tenant = 'tenant-demo';

/// Faz o papel do servidor: LÊ o corpo inteiro da requisição e responde o próximo status do roteiro.
class _Server implements HttpClientAdapter {
  _Server(this._statuses);

  final List<int> _statuses;
  final List<int> bodyBytes = [];
  final List<String> authHeaders = [];

  int get calls => bodyBytes.length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    var size = 0;
    if (requestStream != null) {
      await for (final chunk in requestStream) {
        size += chunk.length;
      }
    }
    bodyBytes.add(size);
    authHeaders.add(options.headers['Authorization'] as String? ?? '');
    final index = bodyBytes.length - 1;
    final status = index < _statuses.length ? _statuses[index] : 500;
    final body = status == 201
        ? {
            'data': {'receiptId': 'receipt-srv-1', 'uploadStatus': 'uploaded'},
          }
        : {
            'error': {'code': 'HTTP_$status'},
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
  int refreshes = 0;
  int clears = 0;
}

/// O cliente de produção: o mesmo `createAuthenticatedHttpClient` dos providers, com o interceptor real.
Dio _client(_Server server, _Session session) {
  final dio = createAuthenticatedHttpClient(
    const ApiConfig(baseUrl: 'https://test.local', accessToken: 'token-velho'),
    onRefresh: () async {
      session.refreshes++;
      return 'token-novo';
    },
    onClearSession: () async {
      session.clears++;
    },
  );
  dio.transformer = SyncTransformer();
  dio.httpClientAdapter = server;
  return dio;
}

ExpenseReceiptUploadRequest _request() => ExpenseReceiptUploadRequest(
  reportServerId: 'rep-srv-1',
  itemServerId: 'item-srv-1',
  clientActionId: 'act-receipt-1',
  fileName: 'nota.jpg',
  contentType: 'image/jpeg',
  sizeBytes: 32,
  sha256: 'a' * 64,
  bytes: Uint8List.fromList(List<int>.filled(32, 7)),
);

/// Sobe o comprovante e devolve o que aconteceu, no formato da coluna "objeto" do plano.
Future<(ExpenseReceiptUploadResponse?, Object?, String)> _upload(
  _Server server,
  _Session session,
) async {
  final api = DioExpenseReceiptUploadApi(_client(server, session));
  ExpenseReceiptUploadResponse? response;
  Object? failure;
  try {
    response = await api.upload(_request());
  } catch (error) {
    failure = error;
  }
  final outcome = failure == null
      ? response!.uploadStatus
      : failure is ApiServerError
      ? 'ApiServerError(${failure.statusCode})'
      : failure.runtimeType.toString();
  final measured =
      'calls=${server.calls} bytes=${server.bodyBytes} '
      'clears=${session.clears} outcome=$outcome';
  return (response, failure, measured);
}

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
    'RR-E.1 retry multipart: 401 e depois 201 → 2 chamadas com o MESMO tamanho de corpo, 0 limpeza de sessão, '
    'resposta `uploaded`',
    () async {
      final server = _Server([401, 201]);
      final session = _Session();

      final (response, failure, measured) = await _upload(server, session);

      expect(server.calls, 2, reason: measured);
      expect(server.bodyBytes.first, greaterThan(32), reason: measured);
      expect(server.bodyBytes.last, server.bodyBytes.first, reason: measured);
      expect(server.authHeaders.last, 'Bearer token-novo', reason: measured);
      expect(session.refreshes, 1, reason: measured);
      expect(session.clears, 0, reason: measured);
      expect(failure, isNull, reason: measured);
      expect(response?.uploadStatus, 'uploaded', reason: measured);
    },
  );

  test('RR-E.2 o retry volta 503: 0 limpeza de sessão, sobe o 503 e o comprovante volta a `pending` sem gastar '
      'tentativa; o retry que volta 401 limpa a sessão, como hoje', () async {
    // (a) No upload: o erro que sobe é o 503 do retry, não o 401 original.
    final busyServer = _Server([401, 503]);
    final busySession = _Session();
    final (_, busyFailure, busyMeasured) = await _upload(
      busyServer,
      busySession,
    );
    expect(busyServer.calls, 2, reason: busyMeasured);
    expect(busySession.clears, 0, reason: busyMeasured);
    expect(
      busyFailure,
      isA<ApiServerError>().having((e) => e.statusCode, 'statusCode', 503),
      reason: busyMeasured,
    );

    // (a) No serviço: o comprovante volta a `pending`, sem gastar tentativa, com o blob.
    final queue = InMemorySyncQueueRepository();
    final blobs = InMemoryEvidenceBlobStore();
    final repository = LocalExpenseRepository(
      session: _bootstrap(),
      syncQueue: queue,
      actionFactory: SyncActionFactory(),
      localStore: InMemoryExpenseLocalStore(),
      blobStore: blobs,
    );
    final created = await repository.createReport(
      title: 'Viagem',
      advanceAmount: 0,
    );
    final reportLocalId = created.report.localId;
    final added = await repository.addItem(
      reportId: reportLocalId,
      categoryId: 'fuel',
      amount: 50,
      city: 'Campinas',
      vendorName: 'Posto',
    );
    final itemLocalId = added.report.items.last.localId;
    final attach = await repository.attachReceiptPlaceholder(
      reportLocalId: reportLocalId,
      itemLocalId: itemLocalId,
      fileName: 'nota.jpg',
      mimeType: 'image/jpeg',
      bytes: Uint8List.fromList(List<int>.filled(32, 7)),
      sha256: 'a' * 64,
    );
    final blobRef = repository
        .receiptsForItem(reportLocalId, itemLocalId)
        .single
        .localReference!;
    await repository.markReportSynced(reportLocalId, 'rep-srv-1');
    await repository.markItemSynced(reportLocalId, itemLocalId, 'item-srv-1');

    final serviceServer = _Server([401, 503]);
    final serviceSession = _Session();
    final service = ExpenseReceiptSyncService(
      queue: queue,
      repository: repository,
      blobStore: blobs,
      api: DioExpenseReceiptUploadApi(_client(serviceServer, serviceSession)),
    );
    await service.uploadTenant(_tenant);

    final receipt = (await queue.actionsForTenant(
      _tenant,
    )).singleWhere((a) => a.clientActionId == attach!.clientActionId);
    final serviceMeasured =
        'calls=${serviceServer.calls} clears=${serviceSession.clears} '
        'status=${receipt.status.name} retry=${receipt.retryCount} '
        'code=${receipt.lastErrorCode}';
    expect(receipt.type, ExpenseSyncActionTypes.receiptAttach);
    expect(serviceServer.calls, 2, reason: serviceMeasured);
    expect(serviceSession.clears, 0, reason: serviceMeasured);
    expect(receipt.status, SyncStatus.pending, reason: serviceMeasured);
    expect(receipt.retryCount, 0, reason: serviceMeasured);
    expect(receipt.lastErrorCode, 'SYNC_BUSY', reason: serviceMeasured);
    expect(await blobs.load(blobRef), isNotNull, reason: serviceMeasured);

    // (b) O retry volta 401: o token novo também foi recusado → limpa a sessão, como hoje.
    final deniedServer = _Server([401, 401]);
    final deniedSession = _Session();
    final (_, deniedFailure, deniedMeasured) = await _upload(
      deniedServer,
      deniedSession,
    );
    expect(deniedSession.clears, 1, reason: deniedMeasured);
    expect(deniedFailure, isA<ApiUnauthorizedError>(), reason: deniedMeasured);
  });
}
