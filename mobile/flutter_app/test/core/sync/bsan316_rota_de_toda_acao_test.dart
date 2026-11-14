// B-SAN3-16 (P5) — nenhuma ação pendente fica invisível na fila do aparelho.
//
// Toda constante de `*SyncActionTypes` tem rota: envio (algum replay a envia), aguarda (tipo conhecido ainda sem envio,
// com pendência dona nomeada) ou sem envio. A cada passe, a varredura pega as ações `pending` DO USUÁRIO DA SESSÃO
// cuja rota é "sem envio", cujo tipo não está na tabela (fail-closed), cuja forma o servidor recusaria sempre (pedido
// ou "não iniciou" sem motivo) ou que são órfãs (pedido sem OS enviada), e as marca como erro visível: `failed`,
// `retryCount = kSyncMaxRetry`, `UNROUTABLE_ACTION` e uma mensagem por causa. Elas aparecem em "Envio não concluído",
// com "Tentar de novo" e "Descartar". A varredura não toca `failed`, `syncing` nem `conflict`.
//
// Lei: `plano-B-SAN3-16.md` + Emendas 1, 1.1 e 1.1.1 da abertura (fora do repositório).
// CE-G1 (R1): as constantes vêm do `api_contracts.dart` real (a regex do F24 do B-SAN3-13); os conjuntos de envio são
// IMPORTADOS do código, nunca digitados aqui.
//
// VERMELHO-CONTROLE (F1b, em `eeac48a3`): o arquivo não compila (`sync_action_routing.dart` não existe); a sonda S3
// do plano mediu que o tipo desconhecido fica `pending` sem erro depois do resgate e do replay.
import 'dart:io';

import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_blob_store.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_sync.dart';
import 'package:erp_techsolutions_mobile/core/evidence/evidence_upload.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_api.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_service.dart';
import 'package:erp_techsolutions_mobile/core/location/field_location_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/auto_sync_coordinator.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_routing.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_reclaim_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_stalled_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_user_scope.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_api.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_local_store.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_providers.dart';
import 'package:erp_techsolutions_mobile/core/telemetry/telemetry_sync_service.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_local_store.dart';
import 'package:erp_techsolutions_mobile/features/expenses/data/expense_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/shared/ui/sync_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan316-rotas';
const _eu = 'u-bsan316-eu';
const _outro = 'u-bsan316-outro';
const _os = '7d1a3f40-0000-4000-8000-000000000316';

const _msgVersao =
    'Esta versão do aplicativo não consegue enviar este registro. '
    'Atualize o aplicativo ou descarte o registro.';
const _msgSemMotivo =
    'Este registro está sem motivo e não pode ser enviado. '
    'Descarte o registro e registre de novo na OS.';
const _msgOrfao =
    'A OS deste registro não foi enviada ao servidor. '
    'Descarte o registro e registre de novo na OS.';

SyncAction _acao(
  String id,
  String type, {
  Map<String, Object?> payload = const {'local_id': 'wo-local-x'},
  SyncStatus status = SyncStatus.pending,
  String userId = _eu,
  int retry = 0,
  String? code,
}) => SyncAction(
  clientActionId: id,
  tenantId: _tenant,
  userId: userId,
  type: type,
  payload: payload,
  status: status,
  createdAt: DateTime.utc(2026, 11, 14, 15),
  retryCount: retry,
  lastErrorCode: code,
);

Map<String, Object?> _pedido({String? reason = 'Troca de peça'}) => {
  'local_id': 'wo-local-pedido',
  'server_id': _os,
  'reason': ?reason,
  'urgency': 'normal',
};

Map<String, Object?> _naoIniciou({
  String? reason = 'Cliente ausente no local',
}) => {
  'local_id': 'wo-local-nao-iniciou',
  'server_id': _os,
  'reason': ?reason,
  'note': 'Portão fechado.',
};

SyncQueueRepository _filaDoUsuario(InMemorySyncQueueRepository base) =>
    UserScopedSyncQueueRepository(queue: base, currentUserId: () => _eu);

Future<SyncAction> _guardada(SyncQueueRepository queue, String id) async =>
    (await queue.actionsForTenant(
      _tenant,
    )).singleWhere((a) => a.clientActionId == id);

void _confereNaoEnviavel(SyncAction acao, String mensagem) {
  expect(acao.status, SyncStatus.failed, reason: acao.clientActionId);
  expect(acao.retryCount, kSyncMaxRetry, reason: acao.clientActionId);
  expect(acao.lastErrorCode, syncUnroutableErrorCode);
  expect(acao.lastSafeError, mensagem, reason: acao.clientActionId);
  expect(
    isStalledAction(acao),
    isTrue,
    reason: 'aparece em Envio não concluído',
  );
}

Set<String> _constantesDeclaradas() {
  final source = File('lib/core/network/api_contracts.dart').readAsStringSync();
  final declared = <String>{};
  for (final match in RegExp(
    r'class (\w+SyncActionTypes)\s*\{([\s\S]*?)\n\}',
  ).allMatches(source)) {
    for (final constant in RegExp(
      r"static const \w+ = '([^']+)'",
    ).allMatches(match.group(2)!)) {
      declared.add(constant.group(1)!);
    }
  }
  return declared;
}

// ── arnês do coordenador (o do `bo6r11_resgate_antes_do_primeiro_servico_test.dart`) ─────────────────────────────

const _vazio = SyncReplayResult(synced: [], failed: [], conflicts: []);

class _SemReplayDeOs extends WorkOrderSyncReplayService {
  _SemReplayDeOs(SyncQueueRepository queue)
    : super(queue: queue, api: MockWorkOrderSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async => _vazio;
}

class _SemReplayDeVistoria extends ChecklistSyncReplayService {
  _SemReplayDeVistoria(SyncQueueRepository queue)
    : super(queue: queue, api: MockChecklistSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async => _vazio;
}

class _SemReplayDeEvidencia extends EvidenceSyncReplayService {
  _SemReplayDeEvidencia(SyncQueueRepository queue)
    : super(queue: queue, api: const PendingEvidenceSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async => _vazio;
}

class _SemReplayDeDespesa extends SyncReplayService {
  _SemReplayDeDespesa(SyncQueueRepository queue)
    : super(queue: queue, api: MockExpenseSyncBatchApi());

  @override
  Future<SyncReplayResult> replayTenant(String tenantId) async => _vazio;
}

ProviderContainer _coordenador(InMemorySyncQueueRepository queue) {
  return ProviderContainer(
    overrides: [
      bootstrapSessionProvider.overrideWith(
        (ref) async => const BootstrapSession(
          activeTenant: TenantContext(
            tenantId: _tenant,
            displayName: 'B-SAN3-16 rotas',
          ),
          enabledModules: [],
          permissions: PermissionSet({'dashboard:read'}),
        ),
      ),
      currentSyncUserIdProvider.overrideWithValue(_eu),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      syncQueueReclaimServiceProvider.overrideWithValue(
        SyncQueueReclaimService(queue: queue, expenseChannelOff: () => true),
      ),
      fieldLocationSyncServiceProvider.overrideWithValue(
        FieldLocationSyncService(
          store: InMemoryFieldLocationStore(),
          api: const PendingFieldLocationApi(),
        ),
      ),
      telemetrySyncServiceProvider.overrideWithValue(
        TelemetrySyncService(
          store: InMemoryTelemetryLocalStore(),
          api: const PendingTelemetryApi(),
        ),
      ),
      workOrderSyncReplayServiceProvider.overrideWithValue(
        _SemReplayDeOs(queue),
      ),
      checklistSyncReplayServiceProvider.overrideWithValue(
        _SemReplayDeVistoria(queue),
      ),
      evidenceSyncReplayServiceProvider.overrideWithValue(
        _SemReplayDeEvidencia(queue),
      ),
      syncReplayServiceProvider.overrideWithValue(_SemReplayDeDespesa(queue)),
      evidenceBinaryUploadServiceProvider.overrideWithValue(
        EvidenceBinaryUploadService(
          store: InMemoryWorkOrderLocalStore(),
          blobStore: InMemoryEvidenceBlobStore(),
          api: const PendingEvidenceUploadApi(),
        ),
      ),
    ],
  );
}

// ── arnês da tela de sincronização (o do `bo6r11_sync_screen_despesa_e_saida_test.dart`) ─────────────────────────

Widget _tela(InMemorySyncActionStore store) {
  final router = GoRouter(
    initialLocation: '/sync',
    routes: [GoRoute(path: '/sync', builder: (_, _) => const SyncScreen())],
  );
  return ProviderScope(
    overrides: [
      syncActionStoreProvider.overrideWithValue(store),
      currentSyncUserIdProvider.overrideWithValue(_eu),
      expenseLocalStoreProvider.overrideWithValue(InMemoryExpenseLocalStore()),
      workOrderLocalStoreProvider.overrideWithValue(
        InMemoryWorkOrderLocalStore(),
      ),
      bootstrapSessionProvider.overrideWith((_) async => devBootstrapSession),
    ],
    child: MaterialApp.router(routerConfig: router),
  );
}

Future<void> _abrirTela(WidgetTester t, InMemorySyncActionStore store) async {
  t.view.physicalSize = const Size(1080, 4000);
  t.view.devicePixelRatio = 1;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
  await t.pumpWidget(_tela(store));
  await t.pumpAndSettle();
}

void main() {
  test('R1. toda constante de *SyncActionTypes tem rota; toda rota é de '
      'constante viva; a rota envio é a união dos conjuntos de replay '
      'importados (mais o material, que o R1b prova)', () {
    final declaradas = _constantesDeclaradas();
    expect(declaradas, isNotEmpty);
    expect(
      declaradas.difference(syncActionRoutes.keys.toSet()),
      isEmpty,
      reason: 'tipo de ação sem rota declarada',
    );
    expect(
      syncActionRoutes.keys.toSet().difference(declaradas),
      isEmpty,
      reason: 'rota de tipo que não existe mais',
    );

    final envio = {
      for (final e in syncActionRoutes.entries)
        if (e.value == SyncActionRoute.replay) e.key,
    };
    final conjuntosDeReplay = {
      ...b107BackendWorkOrderActionTypes,
      ...backendChecklistActionTypes,
      ...EvidenceSyncActionTypes.supported,
      ...ExpenseSyncActionTypes.backendSupported,
    };
    expect(envio, {
      ...conjuntosDeReplay,
      InventorySyncActionTypes.materialAdd,
      InventorySyncActionTypes.materialRemove,
    }, reason: 'a rota envio tem de ser exatamente o que algum replay envia');
    expect(envio.containsAll(conjuntosDeReplay), isTrue);

    final aguarda = {
      for (final e in syncActionRoutes.entries)
        if (e.value == SyncActionRoute.awaitingBlock) e.key,
    };
    expect(aguarda, syncActionAwaitingOwner.keys.toSet());
    for (final dono in syncActionAwaitingOwner.values) {
      expect(dono.trim(), isNotEmpty, reason: 'rota aguarda sem dono');
    }

    final semEnvio = {
      for (final e in syncActionRoutes.entries)
        if (e.value == SyncActionRoute.unroutable) e.key,
    };
    expect(semEnvio, {
      WorkOrderSyncActionTypes.evidenceAttach,
      ChecklistSyncActionTypes.runCreate,
    }, reason: 'só as constantes sem produtor ficam sem envio');
  });

  test('R1b. material pendente de OS com id de servidor é capturado pelo '
      'replay de material', () async {
    final queue = InMemorySyncQueueRepository();
    final material = _acao(
      'r1b-material',
      InventorySyncActionTypes.materialAdd,
      payload: const {
        'work_order_local_id': 'wo-local-material',
        'material_local_id': 'mat-1',
        'sku': 'ELE-0102',
        'quantity': 1,
      },
    );
    await queue.enqueue(material);
    expect(routeOf(material), SyncActionRoute.replay);
    final api = CaptureInventoryBatchApi(
      (batch) => [
        for (final a in batch)
          SyncActionResult(
            clientActionId: a.clientActionId,
            status: 'processed',
          ),
      ],
    );
    final replay = InventorySyncReplayService(
      queue: queue,
      api: api,
      workOrders: InMemoryWorkOrderLocalStore([
        WorkOrder(
          localId: 'wo-local-material',
          serverId: _os,
          tenantId: _tenant,
          code: 'OS-MAT',
          title: 'OS do material',
          customerName: 'Cliente',
          serviceAddress: 'Rua',
          status: WorkOrderStatus.inService,
          priority: WorkOrderPriority.normal,
          syncStatus: SyncStatus.synced,
          createdAt: DateTime.utc(2026, 11, 14),
        ),
      ]),
    );

    await replay.replayTenant(_tenant);

    expect(api.capturedBatches, hasLength(1));
    expect(api.capturedBatches.single.single.clientActionId, 'r1b-material');
  });

  test('R2. tipo desconhecido, tipo sem envio, pedido sem motivo e não iniciou '
      'sem motivo, em pending, viram failed com UNROUTABLE_ACTION, retry 5 e a '
      'mensagem da causa depois de uma varredura', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    for (final a in [
      _acao('r2-desconhecido', 'work_order.tipo_inexistente'),
      _acao('r2-evidencia', WorkOrderSyncActionTypes.evidenceAttach),
      _acao('r2-run', ChecklistSyncActionTypes.runCreate),
      _acao(
        'r2-pedido',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: _pedido(reason: null),
      ),
      _acao(
        'r2-pedido-branco',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: _pedido(reason: '  '),
      ),
      _acao(
        'r2-nao-iniciou',
        WorkOrderSyncActionTypes.unableToStart,
        payload: _naoIniciou(reason: null),
      ),
      _acao(
        'r2-pedido-ok',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: _pedido(),
      ),
    ]) {
      await queue.enqueue(a);
    }

    await SyncActionRoutingSweep(queue: queue).sweepTenant(_tenant);

    for (final id in ['r2-desconhecido', 'r2-evidencia', 'r2-run']) {
      _confereNaoEnviavel(await _guardada(queue, id), _msgVersao);
    }
    for (final id in ['r2-pedido', 'r2-pedido-branco', 'r2-nao-iniciou']) {
      _confereNaoEnviavel(await _guardada(queue, id), _msgSemMotivo);
    }
    final ok = await _guardada(queue, 'r2-pedido-ok');
    expect(ok.status, SyncStatus.pending, reason: 'o pedido com motivo sai');
    expect(ok.lastErrorCode, isNull);
  });

  test('R3. ação desconhecida de outro usuário não é tocada (fila por '
      'usuário)', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    await base.enqueue(_acao('r3-meu', 'work_order.tipo_inexistente'));
    await base.enqueue(
      _acao('r3-alheio', 'work_order.tipo_inexistente', userId: _outro),
    );

    await expectLater(
      SyncActionRoutingSweep(queue: queue).sweepTenant(_tenant),
      completes,
      reason: 'a varredura só lê a fila do usuário da sessão',
    );

    _confereNaoEnviavel(await _guardada(base, 'r3-meu'), _msgVersao);
    final alheio = await _guardada(base, 'r3-alheio');
    expect(alheio.status, SyncStatus.pending);
    expect(alheio.retryCount, 0);
    expect(alheio.lastErrorCode, isNull);
  });

  test('R4. material (envio) e estoque (aguarda) continuam pending, sem '
      'erro', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    final ids = {
      'r4-material': InventorySyncActionTypes.materialAdd,
      'r4-remocao': InventorySyncActionTypes.materialRemove,
      'r4-entrada': InventorySyncActionTypes.entryCreate,
      'r4-saida': InventorySyncActionTypes.exitCreate,
    };
    for (final e in ids.entries) {
      await queue.enqueue(_acao(e.key, e.value));
    }

    await SyncActionRoutingSweep(queue: queue).sweepTenant(_tenant);

    for (final id in ids.keys) {
      final a = await _guardada(queue, id);
      expect(a.status, SyncStatus.pending, reason: id);
      expect(a.lastErrorCode, isNull, reason: id);
      expect(a.retryCount, 0, reason: id);
    }
  });

  test('R5. failed, syncing e conflict não são tocados', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    final antes = [
      _acao(
        'r5-failed',
        'work_order.tipo_inexistente',
        status: SyncStatus.failed,
        retry: 2,
        code: 'NETWORK_ERROR',
      ),
      _acao(
        'r5-syncing',
        'work_order.tipo_inexistente',
        status: SyncStatus.syncing,
      ),
      _acao(
        'r5-conflict',
        'work_order.tipo_inexistente',
        status: SyncStatus.conflict,
        code: 'CONFLICT',
      ),
    ];
    for (final a in antes) {
      await base.enqueue(a);
    }

    await SyncActionRoutingSweep(queue: queue).sweepTenant(_tenant);

    for (final a in antes) {
      expect(await _guardada(base, a.clientActionId), a);
    }
  });

  test('R6. o passe do coordenador roda a varredura', () async {
    final queue = InMemorySyncQueueRepository();
    await queue.enqueue(
      _acao('r6-desconhecido', 'work_order.tipo_inexistente'),
    );
    final container = _coordenador(queue);
    addTearDown(container.dispose);

    await container.read(bootstrapSessionProvider.future);
    container.read(autoSyncCoordinatorProvider);
    await container.read(autoSyncCoordinatorProvider.notifier).triggerManual();

    _confereNaoEnviavel(await _guardada(queue, 'r6-desconhecido'), _msgVersao);
  });

  testWidgets('R7. o cartão do não enviável mostra a mensagem do erro, não '
      '"N tentativas"; tem Tentar de novo e Descartar; Tentar de novo, '
      'passe, e o cartão volta com a mesma mensagem', (t) async {
    final store = InMemorySyncActionStore([
      _acao('r7', 'work_order.tipo_inexistente'),
    ]);
    final fila = UserScopedSyncQueueRepository(
      queue: PersistentSyncQueueRepository(store),
      currentUserId: () => _eu,
    );
    await t.runAsync(
      () => SyncActionRoutingSweep(queue: fila).sweepTenant(_tenant),
    );
    await _abrirTela(t, store);

    final cartao = find.byKey(const Key('stalled-card-r7'));
    expect(cartao, findsOneWidget);
    expect(
      find.descendant(of: cartao, matching: find.textContaining(_msgVersao)),
      findsOneWidget,
    );
    expect(
      find.descendant(of: cartao, matching: find.textContaining('tentativas')),
      findsNothing,
      reason: 'o texto não promete o que não aconteceu',
    );
    expect(find.byKey(const Key('stalled-discard-r7')), findsOneWidget);
    expect(find.byKey(const Key('stalled-retry-r7')), findsOneWidget);

    await t.tap(find.byKey(const Key('stalled-retry-r7')));
    await t.pumpAndSettle();
    expect(find.byKey(const Key('stalled-card-r7')), findsNothing);
    final devolvida = (await t.runAsync(() => store.load()))!.single;
    expect(devolvida.status, SyncStatus.pending);

    await t.runAsync(
      () => SyncActionRoutingSweep(queue: fila).sweepTenant(_tenant),
    );
    await t.pumpWidget(const SizedBox.shrink());
    await _abrirTela(t, store);
    expect(
      find.descendant(
        of: find.byKey(const Key('stalled-card-r7')),
        matching: find.textContaining(_msgVersao),
      ),
      findsOneWidget,
      reason: 'o próximo passe marca de novo, com a mesma mensagem',
    );
  });

  test('R8. pedido sem OS enviada: sem criação na fila ou com a criação '
      'descartada → não enviável; criação failed ou enviada → continua '
      'pending', () async {
    final base = InMemorySyncQueueRepository();
    final queue = _filaDoUsuario(base);
    Map<String, Object?> orfao(String local) => {
      'local_id': local,
      'reason': 'Troca de peça',
      'urgency': 'normal',
    };
    SyncAction criacao(String local, SyncStatus status, {String? code}) =>
        _acao(
          'create-$local',
          WorkOrderSyncActionTypes.create,
          payload: {'local_id': local, 'title': 'OS $local'},
          status: status,
          code: code,
        );

    // (a) sem criação na fila
    await queue.enqueue(
      _acao(
        'r8a',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: orfao('wo-local-a'),
      ),
    );
    // (b) com a criação descartada
    await base.enqueue(
      criacao('wo-local-b', SyncStatus.synced, code: syncDiscardedErrorCode),
    );
    await queue.enqueue(
      _acao(
        'r8b',
        WorkOrderSyncActionTypes.unableToStart,
        payload: {...orfao('wo-local-b'), 'note': 'Sem acesso.'},
      ),
    );
    // (c) com a criação failed
    await base.enqueue(criacao('wo-local-c', SyncStatus.failed));
    await queue.enqueue(
      _acao(
        'r8c',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: orfao('wo-local-c'),
      ),
    );
    // (d) com a criação enviada
    await base.enqueue(criacao('wo-local-d', SyncStatus.synced));
    await queue.enqueue(
      _acao(
        'r8d',
        WorkOrderSyncActionTypes.approvalRequest,
        payload: orfao('wo-local-d'),
      ),
    );

    await SyncActionRoutingSweep(queue: queue).sweepTenant(_tenant);

    _confereNaoEnviavel(await _guardada(queue, 'r8a'), _msgOrfao);
    _confereNaoEnviavel(await _guardada(queue, 'r8b'), _msgOrfao);
    for (final id in ['r8c', 'r8d']) {
      final a = await _guardada(queue, id);
      expect(a.status, SyncStatus.pending, reason: id);
      expect(a.lastErrorCode, isNull, reason: id);
    }
  });
}
