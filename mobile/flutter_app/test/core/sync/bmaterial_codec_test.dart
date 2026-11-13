// B-MATERIAL-REENVIO, C-F14a — RC4b: o contrato do PEDIDO de material, do Dart ao handler TS (Emenda C2.8,
// E-C28.3 com a E-C28.5 A3/A4/A5).
//
// O pedido sai da cadeia real do app, nunca de um mapa escrito no teste: o enfileiramento do
// `PrestadorRepository` (`addSelection` e `removeMaterial`), o reenvio do `inventorySyncReplayServiceProvider`
// real (que injeta o `work_order_id` do servidor) e o `DioInventorySyncBatchApi` com um adaptador que captura os
// BYTES do corpo enviado. Só os valores voláteis são trocados por valores estáveis (UUIDs, `local_created_at` e o
// número do `client_batch_id`), com a mesma troca em todo lugar onde o mesmo valor aparece: a remoção continua
// apontando a adição. As CHAVES e a forma não são tocadas.
//
// O teste COMPARA o que gera com a fixture versionada `bmaterial_request_payloads.json` e nunca a regrava no CI.
// Regravar só com a chave explícita `BMATERIAL_REGRAVAR_FIXTURE=1`, e a execução que regrava termina vermelha de
// propósito (nunca um verde que acabou de escrever o próprio gabarito). O `tests/b-material-payload-contract.test.ts`
// lê a mesma fixture e roda o handler real sobre ela.
//
// Mutações (uma por vez, restauradas): M-C46 (uma chave do `InventorySyncCodec.encodeRequest` trocada) → este teste
// vermelho; M-C47 (a mesma chave trocada só na fixture) → o teste TS vermelho. A M-C11 fica no RC4 (E-C28.5 A3).
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/inventory_sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_providers.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/domain/prestador_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

const _fixturePath = 'test/core/sync/bmaterial_request_payloads.json';
const _regravarKey = 'BMATERIAL_REGRAVAR_FIXTURE';

const _tenant = 'tenant-bmaterial-contrato';
const _user = 'employee-1';
const _wo = 'wo-contrato';
const _woServer = '6f1e2d3c-4b5a-4987-8a6b-5c4d3e2f1a0b';
const _stableCreatedAt = '2026-11-13T12:00:00.000Z';

const _session = BootstrapSession(
  activeTenant: TenantContext(tenantId: _tenant, displayName: 'Org contrato'),
  enabledModules: [],
  permissions: PermissionSet({'work_orders:read', 'work_orders:update'}),
);

const _catalog = [
  TechnicianStockItem(
    sku: 'ELE-0102',
    name: 'Disjuntor',
    available: 9,
    unit: 'un',
  ),
];

final _uuid = RegExp(
  '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
  caseSensitive: false,
);

void main() {
  test('RC4b · o pedido de material que o app envia é o da fixture '
      'versionada (add e remove, chaves por tipo)', () async {
    final generated = await _generateFromRealChain();

    final add = _singleAction(generated, InventorySyncActionTypes.materialAdd);
    final remove = _singleAction(
      generated,
      InventorySyncActionTypes.materialRemove,
    );

    // Chaves por tipo (E-C28.5 A5). O envelope de cada ação.
    for (final action in [add, remove]) {
      expect(action.keys, containsAll(<String>['client_action_id', 'type']));
    }
    final addPayload = (add['payload'] as Map).cast<String, Object?>();
    final removePayload = (remove['payload'] as Map).cast<String, Object?>();
    expect(
      addPayload.keys,
      containsAll(<String>[
        'work_order_id',
        'sku',
        'quantity',
        'material_local_id',
      ]),
    );
    expect(
      removePayload.keys,
      containsAll(<String>[
        'work_order_id',
        'source_client_action_id',
        'material_local_id',
      ]),
    );
    expect(removePayload.containsKey('sku'), isFalse);
    expect(removePayload.containsKey('quantity'), isFalse);
    // A remoção aponta a adição que desfaz, e as duas falam da mesma peça e da mesma OS.
    expect(removePayload['source_client_action_id'], add['client_action_id']);
    expect(removePayload['material_local_id'], addPayload['material_local_id']);
    expect(removePayload['work_order_id'], addPayload['work_order_id']);

    final file = File(_fixturePath);
    if (Platform.environment[_regravarKey] == '1') {
      await file.writeAsString(
        '${const JsonEncoder.withIndent('  ').convert(<String, Object?>{'contrato': 'B-MATERIAL-REENVIO RC4b: gerado pela cadeia real do app (bmaterial_codec_test.dart); não editar à mão', 'pedidos': generated})}\n',
      );
      fail(
        'fixture regravada em $_fixturePath pela chave $_regravarKey; '
        'rode de novo sem a chave para comparar',
      );
    }

    expect(
      file.existsSync(),
      isTrue,
      reason: 'fixture versionada ausente: $_fixturePath',
    );
    final fixture = jsonDecode(await file.readAsString()) as Map;
    expect(
      generated,
      equals(fixture['pedidos']),
      reason:
          'o pedido gerado pela cadeia real do app diverge da fixture '
          'versionada (o contrato com o handler TS mudou)',
    );
  });
}

/// Enfileira pela tela (repositório real), reenvia pelo provider real e captura o corpo enviado pelo cliente HTTP
/// real. Devolve `{tipo: corpo estabilizado}`.
Future<Map<String, Object?>> _generateFromRealChain() async {
  final db = AppDatabase.openInMemory();
  final queue = InMemorySyncQueueRepository();
  final lines = InMemoryPrestadorLocalStore();
  final repo = PrestadorRepository(
    session: _session,
    syncQueue: queue,
    actionFactory: SyncActionFactory(currentUserId: () => _user),
    localStore: lines,
  );
  final adapter = _CaptureAdapter();
  final dio = Dio(BaseOptions(baseUrl: 'https://test.local'))
    ..httpClientAdapter = adapter;
  final container = ProviderContainer(
    overrides: [
      appDatabaseProvider.overrideWithValue(db),
      syncQueueRepositoryProvider.overrideWithValue(queue),
      currentSyncUserIdProvider.overrideWithValue(_user),
      inventorySyncBatchApiProvider.overrideWithValue(
        DioInventorySyncBatchApi(dio),
      ),
      prestadorRepositoryProvider.overrideWithValue(repo),
    ],
  );
  try {
    await DriftWorkOrderLocalStore(db).saveWorkOrder(_order());
    final service = container.read(inventorySyncReplayServiceProvider);

    // 1. A adição: enfileirada pelo repositório, reenviada com o `work_order_id` do servidor.
    final merged = await repo.addSelection(
      workOrderLocalId: _wo,
      selection: const {'ELE-0102': 2},
      catalog: _catalog,
    );
    await service.replayTenant(_tenant);
    final addition = (await queue.actionsForTenant(
      _tenant,
    )).singleWhere((a) => a.type == InventorySyncActionTypes.materialAdd);
    expect(addition.status, SyncStatus.synced);
    expect(addition.payload['result_ref'], 'srv-mov-1');

    // 2. A remoção: a adição já baixada ganha o `remove`, reenviado da mesma forma.
    await repo.removeMaterial(merged.single.localId);
    await service.replayTenant(_tenant);
    expect(adapter.bodies, hasLength(2));

    final stable = _Stabilizer();
    final generated = <String, Object?>{};
    for (final body in adapter.bodies) {
      final actions = (body['actions'] as List).cast<Map>();
      expect(actions, hasLength(1));
      final type = actions.single['type'];
      expect(type, isA<String>());
      generated[type as String] = stable.body(body);
    }
    return generated;
  } finally {
    container.dispose();
    await db.close();
  }
}

Map<String, Object?> _singleAction(
  Map<String, Object?> generated,
  String type,
) {
  final body = generated[type];
  expect(body, isA<Map>(), reason: 'nenhum pedido do tipo $type');
  final actions = ((body as Map)['actions'] as List).cast<Map>();
  return actions.single.cast<String, Object?>();
}

WorkOrder _order() => WorkOrder(
  localId: _wo,
  serverId: _woServer,
  tenantId: _tenant,
  code: 'OS-$_wo',
  title: 'OS $_wo',
  customerName: 'Cliente',
  serviceAddress: 'Rua',
  status: WorkOrderStatus.inService,
  priority: WorkOrderPriority.normal,
  syncStatus: SyncStatus.synced,
  createdAt: DateTime.utc(2026, 11, 13),
);

/// Troca só os valores voláteis, sempre pela mesma regra: cada UUID distinto vira um UUID estável na ordem em que
/// aparece (a mesma troca em todo lugar), o `local_created_at` real (ISO em UTC) vira uma data fixa e o número do
/// `client_batch_id` vira 0. Chave nenhuma é renomeada, criada ou apagada.
class _Stabilizer {
  final Map<String, String> _ids = <String, String>{};

  Map<String, Object?> body(Map raw) =>
      _walk(raw, null) as Map<String, Object?>;

  Object? _walk(Object? value, String? key) {
    if (value is Map) {
      return <String, Object?>{
        for (final entry in value.entries)
          entry.key as String: _walk(entry.value, entry.key as String),
      };
    }
    if (value is List) return [for (final item in value) _walk(item, key)];
    if (value is! String) return value;
    if (key == 'local_created_at') {
      final parsed = DateTime.parse(value);
      expect(parsed.isUtc, isTrue, reason: 'local_created_at fora de UTC');
      return _stableCreatedAt;
    }
    var text = value.replaceAllMapped(_uuid, (m) => _stableId(m.group(0)!));
    if (key == 'client_batch_id') {
      final batch = RegExp(r'^inventory-batch-(\d+)-');
      expect(
        batch.hasMatch(text),
        isTrue,
        reason: 'client_batch_id fora do formato: $value',
      );
      text = text.replaceFirst(batch, 'inventory-batch-0-');
    }
    return text;
  }

  String _stableId(String raw) => _ids.putIfAbsent(
    raw.toLowerCase(),
    () =>
        '00000000-0000-4000-8000-${(_ids.length + 1).toString().padLeft(12, '0')}',
  );
}

/// Captura os bytes do corpo que o `DioInventorySyncBatchApi` envia e responde `accepted` a cada ação, no formato da
/// rota (`syncMobileInventoryActions`).
class _CaptureAdapter implements HttpClientAdapter {
  final List<Map<String, Object?>> bodies = <Map<String, Object?>>[];

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    expect(options.path, InventoryApiEndpoints.sync);
    expect(requestStream, isNotNull, reason: 'corpo do pedido não enviado');
    final bytes = <int>[];
    await for (final chunk in requestStream!) {
      bytes.addAll(chunk);
    }
    final body = (jsonDecode(utf8.decode(bytes)) as Map)
        .cast<String, Object?>();
    bodies.add(body);
    final actions = (body['actions'] as List).cast<Map>();
    return ResponseBody.fromString(
      jsonEncode({
        'data': {
          'accepted': [
            for (final action in actions)
              {
                'client_action_id': action['client_action_id'],
                'status': 'accepted',
                'result_ref': 'srv-mov-${bodies.length}',
              },
          ],
        },
      }),
      200,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}
