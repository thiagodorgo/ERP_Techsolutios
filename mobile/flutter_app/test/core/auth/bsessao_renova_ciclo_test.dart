// B-APP-SESSAO-RENOVA (item 68 do portão) — o ciclo de vida da sessão (D3b: a
// época e a trava) e, na F3b, o bootstrap guardado (D6c).
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
// O terreno é o de `bsessao_renova_test.dart` (servidor local com o contrato
// novo); clientes, interceptador, repositório e notifier são os reais.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'bsessao_renova_test.dart' hide main;

/// Espera a condição (o terreno e o armazenamento andam em outro fluxo).
Future<void> ate(bool Function() condicao, {String razao = ''}) async {
  final fim = DateTime.now().add(const Duration(seconds: 5));
  while (!condicao()) {
    if (DateTime.now().isAfter(fim)) fail('não chegou: $razao');
    await Future<void>.delayed(const Duration(milliseconds: 5));
  }
}

/// Os estados publicados (status e usuário) a partir de agora.
List<(AuthStatus, String?)> ouvir(Aparelho app) {
  final estados = <(AuthStatus, String?)>[];
  app.container.listen<AsyncValue<AuthState>>(authStateProvider, (_, n) {
    final s = n.asData?.value;
    if (s != null) estados.add((s.status, s.session?.user.sub));
  });
  return estados;
}

/// Solta o portão da gravação (e o tira, para a gravação seguinte passar).
void soltarGravacao(ArmazenamentoInstavel storage) {
  final portao = storage.portaoGravacao!;
  storage.portaoGravacao = null;
  portao.complete();
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

  Future<SessionRenewalOutcome> renovarComoUmPedidoDeA() =>
      app.notifier.renewAfterUnauthorized('A-vencido', app.notifier.epoch);

  // ── F3a: a época e a trava (D3b) ──────────────────────────────────────────

  test(
    '[T9a] renovação em voo × "Sair": unauthenticated, armazenamento vazio, renovação superada, o R1 nunca gravado, e o servidor revogou',
    () async {
      terreno.portaoResposta = Completer<void>();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => terreno.trocas == 1, razao: 'o servidor trocou');
      await app.notifier.logout();
      terreno.portaoResposta!.complete();
      terreno.portaoResposta = null;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(app.estado?.status, AuthStatus.unauthenticated);
      expect(await app.storage.loadSession(), isNull);
      expect(app.storage.gravados, isNot(contains('R1')));
      expect(terreno.corposSair.single['refreshToken'], 'R0');
      expect(terreno.revogada, isTrue);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9b] renovação de A × "Sair" e login de B: fim B, armazenamento de B',
    () async {
      // A renovação de A começa DURANTE o "Sair" (o estado ainda é o de A) e
      // a resposta chega depois do login de B: só a época do login a supera.
      terreno.portaoSair = Completer<void>();
      terreno.portaoResposta = Completer<void>();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final sair = app.notifier.logout();
      await ate(() => terreno.corposSair.length == 1, razao: 'o "Sair" saiu');
      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => terreno.trocas == 1, razao: 'o servidor trocou');
      terreno.portaoSair!.complete();
      terreno.portaoSair = null;
      await sair;
      await app.notifier.login(email: 'b@t1.test', password: 'senha-b');
      terreno.portaoResposta!.complete();
      terreno.portaoResposta = null;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.user.sub, 'b');
      final guardada = await app.storage.loadSession();
      expect(guardada?.user.sub, 'b');
      expect(guardada?.tokens.refreshToken, 'RL1');
      expect(app.storage.gravados, isNot(contains('R1')));
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9c] renovação × troca de senha concluída: unauthenticated, renovação superada',
    () async {
      terreno.portaoResposta = Completer<void>();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => terreno.trocas == 1, razao: 'o servidor trocou');
      await app.notifier.changePassword(
        currentPassword: 'velha',
        newPassword: 'nova-senha-forte',
      );
      terreno.portaoResposta!.complete();
      terreno.portaoResposta = null;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(terreno.trocasSenha, 1);
      expect(app.estado?.status, AuthStatus.unauthenticated);
      expect(app.estado?.safeNotice, kPasswordChangedNotice);
      expect(await app.storage.loadSession(), isNull);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9d] a gravação de A já começou × "Sair": unauthenticated, armazenamento vazio, o "Sair" entrega o token gravado, e nenhum authenticated de A depois',
    () async {
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final base = app.storage.gravacoes;
      app.storage.portaoGravacao = Completer<void>();

      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => app.storage.gravacoes == base + 1, razao: 'gravando');
      final estados = ouvir(app);
      final sair = app.notifier.logout();
      soltarGravacao(app.storage);
      await sair;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(app.estado?.status, AuthStatus.unauthenticated);
      expect(await app.storage.loadSession(), isNull);
      expect(terreno.corposSair.single['refreshToken'], 'R1');
      expect(terreno.revogada, isTrue);
      expect(
        estados.where((e) => e.$1 == AuthStatus.authenticated),
        isEmpty,
        reason: 'A não é publicada depois que o "Sair" começou',
      );
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9e] a recusa de A chega depois do login de B: B fica',
    () async {
      terreno.portaoRenovacao = Completer<void>();
      terreno.roteiro.add('401');
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => terreno.renovacoes == 1, razao: 'a renovação chegou');
      await app.notifier.login(email: 'b@t1.test', password: 'senha-b');
      terreno.portaoRenovacao!.complete();
      terreno.portaoRenovacao = null;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.user.sub, 'b');
      expect((await app.storage.loadSession())?.user.sub, 'b');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9f] um pedido de A volta 401 depois do "Sair" e do login de B: 0 renovação, 1 GET só',
    () async {
      terreno.portaoLento = Completer<void>();
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();

      final lento = pedir(app.cliente(), '/lento');
      await ate(() => terreno.gets['/lento'] == 1, razao: 'o GET de A saiu');
      await app.notifier.logout();
      await app.notifier.login(email: 'b@t1.test', password: 'senha-b');
      terreno.portaoLento!.complete();
      terreno.portaoLento = null;

      expect(await lento, isA<ApiSessionExpiredError>());
      expect(terreno.renovacoes, 0);
      expect(
        terreno.gets['/lento'],
        1,
        reason: 'nunca repete com o token de B',
      );
      expect(app.estado?.session?.user.sub, 'b');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T9g] a gravação de A presa × login direto de B: fim B, e nenhum authenticated de A depois que o login começou',
    () async {
      await app.storage.saveSession(sessaoGuardada());
      await app.abrir();
      final base = app.storage.gravacoes;
      app.storage.portaoGravacao = Completer<void>();

      final renovacao = renovarComoUmPedidoDeA();
      await ate(() => app.storage.gravacoes == base + 1, razao: 'gravando');
      final estados = ouvir(app);
      final entrar = app.notifier.login(email: 'b@t1.test', password: 'x');
      soltarGravacao(app.storage);
      await entrar;

      expect(await renovacao, isA<SessionSuperseded>());
      expect(app.estado?.status, AuthStatus.authenticated);
      expect(app.estado?.session?.user.sub, 'b');
      expect((await app.storage.loadSession())?.user.sub, 'b');
      expect(
        estados.where((e) => e.$1 == AuthStatus.authenticated && e.$2 != 'b'),
        isEmpty,
        reason: 'A não é publicada depois que o login começou',
      );
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );
}
