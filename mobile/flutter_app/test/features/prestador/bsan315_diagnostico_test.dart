// B-SAN3-15b (P9, itens 35 e 36 do portão) — o diagnóstico e o serviço executado ficam no aparelho, por usuário, e
// viajam na conclusão.
//
// Plano: `plano-B-SAN3-15-v2.md` §3.3 (T-D1, T-D5 e T-D6; T-D2 a T-D4 iguais ao v1 §3.3) e a Emenda 1 (N-11):
//   T-D1 — o diagnóstico e a execução digitados sobrevivem a reinício (o banco do aparelho fechado e reaberto);
//   T-D2 — a conclusão enfileira o `status_change` com "Diagnóstico: …" e, na linha seguinte, "Serviço executado: …",
//          e o codec do replay (`WorkOrderSyncCodec`, só leitura) leva o texto ao corpo do lote;
//   T-D3 — texto acima de 2.000 caracteres sai cortado com "…";
//   T-D4 — OS de guincho, sem notas: a mensagem padrão de hoje;
//   T-D5 — a purga da OS (B-SAN3-13, os dois caminhos) apaga as notas dela, de todos os usuários;
//   T-D6 — u1 salva notas na OS; u2 no mesmo aparelho vê os campos vazios; u1 volta e vê as dele.
//
// Os testes são de caixa-preta pela tela: digitam no Atendimento (`PrestadorServiceScreen`), reabrem a tela sobre o
// mesmo banco do aparelho e leem os campos, ou concluem pela tela de Conclusão e leem a fila. Assim não dependem do
// nome do store novo.
//
// LEITURA do dev, declarada (§A6): "corte em 2.000 caracteres, com '…'" é lido como a MENSAGEM inteira com no máximo
// 2.000 caracteres, terminando em "…" (o texto do diagnóstico vem primeiro e é o que se corta).
//
// VERMELHO-CONTROLE (F0b, `main` d2737339): o texto vive só no controlador da tela (T-D1, T-D5 e T-D6 ficam
// vermelhos na releitura) e a mensagem da conclusão é fixa (T-D2, T-D3). O T-D4 é verde hoje e continua verde.
import 'dart:io';

import 'package:drift/native.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/local_db/app_database.dart';
import 'package:erp_techsolutions_mobile/core/local_db/database_provider.dart';
import 'package:erp_techsolutions_mobile/core/local_db/drift_work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_local_store.dart';
import 'package:erp_techsolutions_mobile/features/prestador/data/prestador_repository.dart';
import 'package:erp_techsolutions_mobile/features/prestador/ui/prestador_service_screen.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_local_store.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/data/work_order_repository.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/domain/work_order_models.dart';
import 'package:erp_techsolutions_mobile/features/work_orders/ui/work_order_conclusion_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _tenant = 'tenant-bsan315-diag';
const _woId = 'wo-bsan315-diag';
const _padrao = 'Mobile completed work order.';

BootstrapSession _sessao(String userId) => BootstrapSession(
  activeTenant: const TenantContext(
    tenantId: _tenant,
    displayName: 'Organização',
  ),
  enabledModules: const [],
  permissions: const PermissionSet({
    'work_orders:read',
    'work_orders:status',
    'work_orders:update',
  }),
  user: AuthenticatedUser(
    userId: userId,
    email: '$userId@bsan315.demo',
    tenantRole: 'field_technician',
    tenantRoles: const ['field_technician'],
    scope: 'tenant',
  ),
);

final _u1 = _sessao('user-diag-1');
final _u2 = _sessao('user-diag-2');

WorkOrder _wo({WorkOrderServiceType type = WorkOrderServiceType.provider}) =>
    WorkOrder(
      localId: _woId,
      serverId: 'srv-$_woId',
      tenantId: _tenant,
      code: 'OS-1590',
      title: 'Troca de disjuntor',
      customerName: 'Cliente 15b',
      serviceAddress: 'Rua do Diagnóstico, 9',
      status: WorkOrderStatus.inService,
      priority: WorkOrderPriority.normal,
      syncStatus: SyncStatus.synced,
      createdAt: DateTime.utc(2026, 11, 14),
      serviceType: type,
    );

/// O banco do aparelho num arquivo, para o reinício ser de verdade (fechar e reabrir).
class _Aparelho {
  _Aparelho(this.path);

  final String path;
  AppDatabase? _db;

  AppDatabase abrir() => _db ??= AppDatabase(NativeDatabase(File(path)));

  Future<void> reiniciar(WidgetTester t) async {
    final db = _db;
    _db = null;
    if (db != null) await t.runAsync(db.close);
  }
}

Future<_Aparelho> _novoAparelho(WidgetTester t) async {
  final dir = (await t.runAsync(
    () => Directory.systemTemp.createTemp('erp_bsan315_diag'),
  ))!;
  final aparelho = _Aparelho('${dir.path}/erp_mobile.db');
  addTearDown(() async {
    await aparelho.reiniciar(t);
    await t.runAsync(() async {
      if (await dir.exists()) await dir.delete(recursive: true);
    });
  });
  return aparelho;
}

void _telaAlta(WidgetTester t) {
  t.view.physicalSize = const Size(800, 4000);
  t.view.devicePixelRatio = 1.0;
  addTearDown(t.view.resetPhysicalSize);
  addTearDown(t.view.resetDevicePixelRatio);
}

/// Abre o Atendimento do prestador sobre o banco do aparelho, com a sessão dada.
Future<void> _abrirAtendimento(
  WidgetTester t,
  _Aparelho aparelho,
  BootstrapSession sessao,
) async {
  _telaAlta(t);
  final prestRepo = PrestadorRepository(
    session: sessao,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryPrestadorLocalStore(),
  );
  await t.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        appDatabaseProvider.overrideWithValue(aparelho.abrir()),
        bootstrapSessionProvider.overrideWith((_) async => sessao),
        prestadorRepositoryProvider.overrideWithValue(prestRepo),
      ],
      child: MaterialApp.router(
        routerConfig: GoRouter(
          initialLocation: '/work-orders/$_woId/service',
          routes: [
            GoRoute(
              path: '/work-orders/:id/service',
              builder: (_, s) =>
                  PrestadorServiceScreen(workOrderId: s.pathParameters['id']!),
            ),
            GoRoute(
              path: '/work-orders/:id/conclusion',
              builder: (_, s) => Scaffold(
                body: Text('Destino conclusion ${s.pathParameters['id']}'),
              ),
            ),
            GoRoute(
              path: '/work-orders/:id/execute',
              builder: (_, s) => Scaffold(
                body: Text('Destino execute ${s.pathParameters['id']}'),
              ),
            ),
          ],
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
}

/// Fecha a tela (desmonta tudo) e deixa o que estiver pendente terminar.
Future<void> _fecharTela(WidgetTester t) async {
  await t.pumpWidget(const SizedBox.shrink());
  await t.pumpAndSettle();
}

Future<void> _digitarNotas(
  WidgetTester t, {
  required String diagnostico,
  required String execucao,
}) async {
  await t.enterText(find.byKey(const Key('diagnosis-text')), diagnostico);
  await t.pumpAndSettle();
  await t.tap(find.byKey(const Key('diagnosis-next')));
  await t.pumpAndSettle();
  await t.enterText(find.byKey(const Key('execution-text')), execucao);
  await t.pumpAndSettle();
}

String _texto(WidgetTester t, String key) =>
    t.widget<TextField>(find.byKey(Key(key))).controller!.text;

/// Lê os dois campos do Atendimento recém-aberto (o diagnóstico na 1ª fase, a execução na 2ª).
Future<(String, String)> _lerNotas(WidgetTester t) async {
  final diagnostico = _texto(t, 'diagnosis-text');
  if (find.byKey(const Key('diagnosis-next')).evaluate().isNotEmpty &&
      t
              .widget<FilledButton>(find.byKey(const Key('diagnosis-next')))
              .onPressed !=
          null) {
    await t.tap(find.byKey(const Key('diagnosis-next')));
    await t.pumpAndSettle();
    return (diagnostico, _texto(t, 'execution-text'));
  }
  return (diagnostico, '');
}

/// Conclui pela tela de Conclusão, sobre o mesmo banco do aparelho, e devolve a ação de conclusão enfileirada.
Future<SyncAction> _concluir(
  WidgetTester t,
  _Aparelho aparelho,
  BootstrapSession sessao,
  WorkOrder wo,
) async {
  _telaAlta(t);
  final queue = InMemorySyncQueueRepository();
  final woRepo = WorkOrderRepository(
    session: sessao,
    syncQueue: queue,
    actionFactory: SyncActionFactory(),
    localStore: InMemoryWorkOrderLocalStore([wo]),
  );
  final prestRepo = PrestadorRepository(
    session: sessao,
    syncQueue: InMemorySyncQueueRepository(),
    actionFactory: SyncActionFactory(),
    localStore: InMemoryPrestadorLocalStore(),
  );
  await t.pumpWidget(
    ProviderScope(
      key: UniqueKey(),
      overrides: [
        appDatabaseProvider.overrideWithValue(aparelho.abrir()),
        bootstrapSessionProvider.overrideWith((_) async => sessao),
        workOrderRepositoryProvider.overrideWithValue(woRepo),
        prestadorRepositoryProvider.overrideWithValue(prestRepo),
      ],
      child: MaterialApp.router(
        routerConfig: GoRouter(
          initialLocation: '/work-orders/${wo.localId}/conclusion',
          routes: [
            GoRoute(
              path: '/work-orders/:id/conclusion',
              builder: (_, s) => WorkOrderConclusionScreen(
                workOrderId: s.pathParameters['id']!,
              ),
            ),
          ],
        ),
      ),
    ),
  );
  await t.pumpAndSettle();
  await t.tap(find.byKey(const Key('conclude-button')));
  await t.pumpAndSettle();
  expect(find.byKey(const Key('conclusion-synced')), findsOneWidget);
  final conclusoes = [
    for (final a in await queue.actionsForTenant(_tenant))
      if (a.payload['new_status'] == WorkOrderStatus.completed.name) a,
  ];
  expect(conclusoes, hasLength(1));
  return conclusoes.single;
}

const _diag = 'Disjuntor do quadro geral queimado';
const _exec = 'Troca do disjuntor de 25 A e teste de carga';

void main() {
  group('B-SAN3-15b T-D1 — as notas sobrevivem a reinício', () {
    testWidgets(
      'digita, fecha a tela, reinicia o banco, reabre: os dois textos',
      (t) async {
        final aparelho = await _novoAparelho(t);
        await _abrirAtendimento(t, aparelho, _u1);
        await _digitarNotas(t, diagnostico: _diag, execucao: _exec);
        await _fecharTela(t);
        await aparelho.reiniciar(t);

        await _abrirAtendimento(t, aparelho, _u1);
        final (diagnostico, execucao) = await _lerNotas(t);
        expect(diagnostico, _diag);
        expect(execucao, _exec);
      },
    );
  });

  group('B-SAN3-15b T-D2 — a conclusão leva as notas na mensagem', () {
    testWidgets(
      '"Diagnóstico: …" e "Serviço executado: …" na ação e no corpo do lote',
      (t) async {
        final aparelho = await _novoAparelho(t);
        await _abrirAtendimento(t, aparelho, _u1);
        await _digitarNotas(t, diagnostico: _diag, execucao: _exec);
        await _fecharTela(t);

        final acao = await _concluir(t, aparelho, _u1, _wo());
        const esperado = 'Diagnóstico: $_diag\nServiço executado: $_exec';
        expect(acao.payload['message'], esperado);

        // O codec do replay (só leitura) leva o texto ao lote.
        final request = const WorkOrderSyncCodec(
          batchIdFactory: _lote,
        ).encodeRequest([acao]);
        final enviadas = request['actions']! as List<Object?>;
        final payload =
            (enviadas.single! as Map<String, Object?>)['payload']!
                as Map<String, Object?>;
        expect(payload['message'], esperado);
      },
    );
  });

  group('B-SAN3-15b T-D3 — texto longo sai cortado com "…"', () {
    testWidgets(
      'diagnóstico de 2.100 caracteres: a mensagem tem até 2.000 e termina em "…"',
      (t) async {
        final aparelho = await _novoAparelho(t);
        await _abrirAtendimento(t, aparelho, _u1);
        final longo = List.filled(2100, 'a').join();
        await _digitarNotas(t, diagnostico: longo, execucao: _exec);
        await _fecharTela(t);

        final acao = await _concluir(t, aparelho, _u1, _wo());
        final mensagem = acao.payload['message']! as String;
        expect(
          mensagem.startsWith('Diagnóstico: aaa'),
          isTrue,
          reason: mensagem.substring(0, 40),
        );
        expect(mensagem.endsWith('…'), isTrue);
        expect(mensagem.length, lessThanOrEqualTo(2000));
      },
    );
  });

  group('B-SAN3-15b T-D4 — guincho sem notas: a mensagem padrão', () {
    testWidgets('a conclusão do guincho enfileira "$_padrao"', (t) async {
      final aparelho = await _novoAparelho(t);
      final acao = await _concluir(
        t,
        aparelho,
        _u1,
        _wo(type: WorkOrderServiceType.tow),
      );
      expect(acao.payload['message'], _padrao);
    });
  });

  group('B-SAN3-15b T-D5 — a purga da OS leva as notas de todos os usuários', () {
    for (final caminho in ['deleteWorkOrder', 'deleteWorkOrderUnlessPending']) {
      testWidgets('pelo $caminho', (t) async {
        final aparelho = await _novoAparelho(t);
        final store = DriftWorkOrderLocalStore(aparelho.abrir());
        await t.runAsync(() => store.saveWorkOrder(_wo()));

        for (final sessao in [_u1, _u2]) {
          await _abrirAtendimento(t, aparelho, sessao);
          await _digitarNotas(
            t,
            diagnostico: '$_diag (${sessao.user.userId})',
            execucao: _exec,
          );
          await _fecharTela(t);
        }

        // Pré-condição: as notas estão no aparelho antes da purga (sem isto o teste não mediria nada).
        await _abrirAtendimento(t, aparelho, _u1);
        expect(_texto(t, 'diagnosis-text'), '$_diag (${_u1.user.userId})');
        await _fecharTela(t);

        await t.runAsync(() async {
          if (caminho == 'deleteWorkOrder') {
            await store.deleteWorkOrder(_woId);
          } else {
            expect(await store.deleteWorkOrderUnlessPending(_woId), isTrue);
          }
        });

        for (final sessao in [_u1, _u2]) {
          await _abrirAtendimento(t, aparelho, sessao);
          expect(
            _texto(t, 'diagnosis-text'),
            isEmpty,
            reason: sessao.user.userId,
          );
          await _fecharTela(t);
        }
      });
    }
  });

  group('B-SAN3-15b T-D6 — as notas são de cada usuário', () {
    testWidgets('u1 salva; u2 vê vazio; u1 volta e vê as dele', (t) async {
      final aparelho = await _novoAparelho(t);
      await _abrirAtendimento(t, aparelho, _u1);
      await _digitarNotas(t, diagnostico: _diag, execucao: _exec);
      await _fecharTela(t);

      await _abrirAtendimento(t, aparelho, _u2);
      expect(_texto(t, 'diagnosis-text'), isEmpty);
      await _fecharTela(t);

      await _abrirAtendimento(t, aparelho, _u1);
      final (diagnostico, execucao) = await _lerNotas(t);
      expect(diagnostico, _diag);
      expect(execucao, _exec);
    });
  });
}

String _lote() => 'batch-bsan315-diag';
