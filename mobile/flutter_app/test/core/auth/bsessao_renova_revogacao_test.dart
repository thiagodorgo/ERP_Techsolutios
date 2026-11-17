// B-APP-SESSAO-RENOVA (item 68 do portão) — a fila do "Sair" sem servidor (D11,
// F3c).
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
// O terreno é o de `bsessao_renova_test.dart`; o repositório, o notifier e a
// fila são os reais.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/pending_revocations.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bsessao_renova_ciclo_test.dart' show ate;
import 'bsessao_renova_test.dart' hide main;

Future<List<String>> tokensNaFila(PendingRevocations fila) async =>
    (await fila.pending()).map((e) => e.token).toList();

/// Espera a fila esvaziar (a remoção corre depois da resposta do servidor).
Future<void> ateVazia(Future<List<Object>> Function() fila) async {
  final fim = DateTime.now().add(const Duration(seconds: 5));
  while ((await fila()).isNotEmpty) {
    if (DateTime.now().isAfter(fim)) fail('a fila não esvaziou');
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

/// A fila sobre o terreno, sem o notifier (T9p, T9q, T9r).
(PendingRevocations, List<String>) filaSobre(
  Terreno t,
  AuthTokenStorage storage,
) {
  final reportes = <String>[];
  final dio = createExpenseHttpClient(
    ApiConfig(baseUrl: t.base, connectTimeoutMs: 1000, receiveTimeoutMs: 500),
  );
  return (
    PendingRevocations(
      repository: repositorioRemoto(dio, storage),
      storage: storage,
      report: reportes.add,
    ),
    reportes,
  );
}

void main() {
  late Terreno terreno;
  late Aparelho app;

  setUp(() async {
    terreno = Terreno();
    await terreno.start();
    app = Aparelho(terreno);
  });

  tearDown(() async {
    try {
      app.fechar();
    } catch (_) {}
    await terreno.stop();
  });

  PendingRevocations filaDoApp() =>
      app.container.read(pendingRevocationsProvider);

  test(
    '[T9h] "Sair" com o servidor em 503: o token na fila; o drain com o servidor fora o mantém; o servidor volta e uma renovação dá certo: o drain dela revoga e a fila esvazia',
    () async {
      terreno.sairModo = '503';
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      await app.notifier.logout();
      expect(await tokensNaFila(filaDoApp()), ['R0']);
      await filaDoApp().drain();
      expect(await tokensNaFila(filaDoApp()), ['R0'], reason: 'ainda fora');

      await app.notifier.login(email: 'b@t1.test', password: 'senha');
      await ate(
        () => terreno.corposSair.length >= 3,
        razao: 'o drain do login',
      );
      expect(await tokensNaFila(filaDoApp()), ['R0']);

      terreno.sairModo = 'ok';
      terreno.acesso = 'trocado-no-servidor';
      expect(await pedir(app.cliente()), 200, reason: 'renovou');
      await ate(() => terreno.revogadosSair.contains('R0'), razao: 'revogou');
      await ateVazia(() => tokensNaFila(filaDoApp()));
    },
    timeout: const Timeout(Duration(seconds: 30)),
  );

  test(
    '[T9i] "Sair" sem servidor, com SecureAuthTokenStorage; o app reaberto e o servidor de volta: a abertura esvazia a fila e a sessão é revogada',
    () async {
      FlutterSecureStorage.setMockInitialValues({});
      const storage = SecureAuthTokenStorage(FlutterSecureStorage());
      await storage.saveSession(sessaoGuardada());
      final authDio = createExpenseHttpClient(
        ApiConfig(
          baseUrl: terreno.base,
          connectTimeoutMs: 1000,
          receiveTimeoutMs: 500,
        ),
      );
      ProviderContainer abrirApp() => ProviderContainer(
        overrides: [
          authTokenStorageProvider.overrideWithValue(storage),
          authRepositoryProvider.overrideWithValue(
            repositorioRemoto(authDio, storage),
          ),
        ],
      );

      terreno.sairModo = '503';
      final c1 = abrirApp();
      await c1.read(authStateProvider.future);
      await c1.read(authStateProvider.notifier).logout();
      expect((await storage.loadPendingRevocations()).map((e) => e.token), [
        'R0',
      ]);
      c1.dispose();

      terreno.sairModo = 'ok';
      final c2 = abrirApp();
      addTearDown(c2.dispose);
      final s = await c2.read(authStateProvider.future);

      expect(s.status, AuthStatus.unauthenticated);
      await ate(() => terreno.revogada, razao: 'a sessão revogada');
      expect(terreno.revogadosSair, ['R0']);
      await ateVazia(storage.loadPendingRevocations);
      expect(terreno.corposSair, hasLength(2));
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9j] o armazenamento lança na gravação da fila e o servidor está em 503: relato, fila na memória; o servidor volta: revogado na mesma execução',
    () async {
      app.storage.lancaAoGravarFila = true;
      terreno.sairModo = '503';
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      await app.notifier.logout();

      expect(app.reportes, contains('StateError'));
      expect(await tokensNaFila(filaDoApp()), ['R0'], reason: 'na memória');

      terreno.sairModo = 'ok';
      await filaDoApp().drain();
      expect(terreno.revogadosSair, ['R0']);
      expect(terreno.revogada, isTrue);
      expect(await tokensNaFila(filaDoApp()), isEmpty);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9l] "Sair" sem servidor, depois o login de B com o servidor de volta, na mesma execução: o drain do login revoga',
    () async {
      terreno.sairModo = '503';
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      await app.notifier.logout();
      expect(await tokensNaFila(filaDoApp()), ['R0']);

      terreno.sairModo = 'ok';
      await app.notifier.login(email: 'b@t1.test', password: 'senha');

      await ate(() => terreno.revogadosSair.contains('R0'), razao: 'revogou');
      await ateVazia(() => tokensNaFila(filaDoApp()));
      expect(terreno.corposSair, hasLength(2));
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9o] 25 "Sair" sem servidor: 25 itens na fila (sem teto); o servidor volta: os 25 revogados',
    () async {
      terreno.sairModo = '503';
      await app.abrir();
      final esperados = <String>[];
      for (var i = 1; i <= 25; i++) {
        await app.notifier.login(email: 'u$i@t1.test', password: 'senha');
        esperados.add('RL$i');
        await app.notifier.logout();
      }
      expect(await tokensNaFila(filaDoApp()), esperados);

      terreno.sairModo = 'ok';
      await filaDoApp().drain();

      expect(await tokensNaFila(filaDoApp()), isEmpty);
      expect(terreno.revogadosSair.toSet(), esperados.toSet());
    },
    timeout: const Timeout(Duration(seconds: 60)),
  );

  test(
    '[T9p] o drain lê R-OLD e espera a resposta; R-NEW recebe 503 e entra; R-OLD recebe 200: a fila final é [R-NEW]',
    () async {
      final storage = ArmazenamentoInstavel();
      final (fila, _) = filaSobre(terreno, storage);
      terreno.sairModo = '503';
      await fila.revokeOrQueue('R-OLD');
      expect(await tokensNaFila(fila), ['R-OLD']);

      terreno.sairModo = 'ok';
      terreno.sairPorToken['R-NEW'] = '503';
      final portao = Completer<void>();
      terreno.portaoSairPorToken['R-OLD'] = portao;
      final drenagem = fila.drain();
      await ate(
        () => terreno.corposSair.length == 2,
        razao: 'R-OLD no servidor',
      );
      await fila.revokeOrQueue('R-NEW');
      expect(await tokensNaFila(fila), ['R-OLD', 'R-NEW']);
      portao.complete();
      await drenagem;

      expect(await tokensNaFila(fila), ['R-NEW']);
      expect(terreno.revogadosSair, ['R-OLD']);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9q] servidor em 503: fica; em 400: sai, com relato; em 200: sai',
    () async {
      final storage = ArmazenamentoInstavel();
      final (fila, reportes) = filaSobre(terreno, storage);

      terreno.sairModo = '503';
      await fila.revokeOrQueue('R-X');
      await fila.drain();
      expect(await tokensNaFila(fila), ['R-X'], reason: '503 fica');

      terreno.sairModo = '400';
      await fila.drain();
      expect(await tokensNaFila(fila), isEmpty, reason: '400 sai');
      expect(reportes, ['RevocationDiscarded']);

      terreno.sairModo = '503';
      await fila.revokeOrQueue('R-Y');
      terreno.sairModo = 'ok';
      await fila.drain();
      expect(await tokensNaFila(fila), isEmpty, reason: '200 sai');
      expect(terreno.revogadosSair, ['R-Y']);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9r] a escrita da remoção é lenta e um revokeOrQueue(R-NEW) com 503 começa no meio: espera a trava, e a fila final é [R-NEW]',
    () async {
      final storage = ArmazenamentoInstavel();
      final (fila, _) = filaSobre(terreno, storage);
      terreno.sairModo = '503';
      await fila.revokeOrQueue('R-OLD');

      terreno.sairModo = 'ok';
      terreno.sairPorToken['R-NEW'] = '503';
      final portao = Completer<void>();
      storage.portaoFila = portao;
      final drenagem = fila.drain();
      await ate(() => storage.filaNoPortao, razao: 'a remoção gravando');
      final novo = fila.revokeOrQueue('R-NEW');
      await ate(
        () => terreno.corposSair.any((c) => c['refreshToken'] == 'R-NEW'),
        razao: 'R-NEW no servidor',
      );
      await Future<void>.delayed(const Duration(milliseconds: 200));
      portao.complete();
      await drenagem;
      await novo;

      expect(await tokensNaFila(fila), ['R-NEW']);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );
}
