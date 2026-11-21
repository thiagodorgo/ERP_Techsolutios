// B-APP-SESSAO-RENOVA (item 68 do portão) — o ciclo de vida da sessão (D3b: a
// época e a trava) e, na F3b, o bootstrap guardado (D6c).
//
// Cada caso começa por `[ID]` e roda com `--plain-name '[ID]'` (§5.0 do plano).
// O terreno é o de `bsessao_renova_test.dart` (servidor local com o contrato
// novo); clientes, interceptador, repositório e notifier são os reais.
import 'dart:async';

import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/auth/session_renewal.dart';
import 'package:erp_techsolutions_mobile/core/auth/tenant_switch_orchestrator.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_codec.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_repository.dart';
import 'package:erp_techsolutions_mobile/core/bootstrap/bootstrap_session.dart';
import 'package:erp_techsolutions_mobile/core/network/api_error.dart';
import 'package:erp_techsolutions_mobile/core/network/http_client.dart';
import 'package:erp_techsolutions_mobile/core/permissions/permission_resolver.dart';
import 'package:erp_techsolutions_mobile/features/auth/auth_models.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/misc.dart' show Override;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
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

// ── F3b: o bootstrap da sessão (D6c) ─────────────────────────────────────────

/// O bootstrap remoto sobre o terreno (a fábrica do cliente aponta para ele).
DioMobileBootstrapRepository bootstrapRemoto(
  Terreno t,
  AuthTokenStorage storage,
) => DioMobileBootstrapRepository(
  storage,
  createClient: (c) => createExpenseHttpClient(
    ApiConfig(baseUrl: t.base, accessToken: c.accessToken),
  ),
);

Override bootstrapNoTerreno(Terreno t, AuthTokenStorage storage) =>
    mobileBootstrapRepositoryProvider.overrideWithValue(
      bootstrapRemoto(t, storage),
    );

/// O bootstrap de agora. Desde a F5 (D6) o bootstrap segue só a CHAVE da
/// sessão (`selectAsync`), e a troca de sessão chega a ele na microtarefa
/// seguinte: uma leitura na mesma continuação do `login()` ainda vê o valor
/// anterior (medido; registrado no diário do bloco). A leitura espera essa
/// microtarefa.
Future<BootstrapSession> bootstrapDe(ProviderContainer c) async {
  await Future<void>.delayed(Duration.zero);
  return c.read(bootstrapNotifierProvider.future);
}

/// O app local (sem servidor): o repositório e o bootstrap de desenvolvimento.
ProviderContainer appLocal(AuthTokenStorage storage) => ProviderContainer(
  overrides: [
    authTokenStorageProvider.overrideWithValue(storage),
    authRepositoryProvider.overrideWithValue(
      LocalDevAuthRepository(storage: storage),
    ),
    mobileBootstrapRepositoryProvider.overrideWithValue(
      LocalDevBootstrapRepository(storage),
    ),
  ],
);

/// Um cache gravado antes do dono existir (sem `ownerKey`).
BootstrapSession cacheAntigo({String sub = 'u1', String tenant = 't1'}) =>
    BootstrapSession(
      activeTenant: TenantContext(tenantId: tenant, displayName: 'Antiga'),
      enabledModules: const [],
      permissions: const PermissionSet({'velha'}),
      user: AuthenticatedUser(
        userId: sub,
        email: '$sub@$tenant.test',
        tenantRole: 'field_technician',
        tenantRoles: const ['field_technician'],
        scope: 'tenant',
      ),
    );

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

  test('[T9e] a recusa de A chega depois do login de B: B fica', () async {
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
  }, timeout: const Timeout(Duration(seconds: 20)));

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

  // ── F3b: o bootstrap guardado é da sessão que o gravou (D6c) ──────────────

  test(
    '[T3b] outra pessoa, com o cache da sessão anterior no disco: bootstrap novo',
    () async {
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');
      expect((await bootstrapDe(app.container)).user.userId, 'u1');
      expect(await app.storage.loadBootstrapJson(), isNotNull);

      await app.notifier.login(email: 'b@t1.test', password: 'senha');
      final b = await bootstrapDe(app.container);

      expect(b.user.userId, 'b');
      expect(b.ownerKey, sessionKeyOf(app.estado!.session!));
      expect(terreno.bootstraps, 2);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3d] a mesma pessoa em outra organização, com o cache da anterior no disco: bootstrap novo',
    () async {
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');
      expect((await bootstrapDe(app.container)).activeTenant.tenantId, 't1');

      await app.notifier.login(
        email: 'u1@t1.test',
        password: 'senha',
        tenantId: 't2',
      );
      final b = await bootstrapDe(app.container);

      expect(b.user.userId, 'u1');
      expect(b.activeTenant.tenantId, 't2');
      expect(terreno.bootstraps, 2);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3e] o clearBootstrap lança na expiração: expired mesmo assim, com relato; a mesma pessoa em t2 recebe t2',
    () async {
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');
      expect((await bootstrapDe(app.container)).activeTenant.tenantId, 't1');
      app.storage.lancaAoLimparBootstrap = true;
      terreno.recusaTodoGet = true;
      terreno.roteiro.add('401');

      expect(await pedir(app.cliente()), isA<ApiSessionExpiredError>());
      expect(app.estado?.status, AuthStatus.expired);
      expect(app.reportes, contains('StateError'));
      expect(
        await app.storage.loadBootstrapJson(),
        isNotNull,
        reason: 'a limpeza falhou: o cache de t1 ficou no disco',
      );

      app.storage.lancaAoLimparBootstrap = false;
      terreno.recusaTodoGet = false;
      await app.notifier.login(
        email: 'u1@t1.test',
        password: 'senha',
        tenantId: 't2',
      );
      expect((await bootstrapDe(app.container)).activeTenant.tenantId, 't2');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3f] cache antigo sem dono: aceito na sessão antiga restaurada, recusado em outra organização',
    () async {
      await app.storage.saveSession(sessaoGuardada());
      await app.storage.saveBootstrapJson(
        BootstrapSessionCodec.encode(cacheAntigo()),
      );
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      final aceito = await bootstrapDe(app.container);
      expect(aceito.ownerKey, isNull);
      expect(aceito.permissions.contains('velha'), isTrue);
      expect(terreno.bootstraps, 0);

      // a sessão antiga (sem identificador) da mesma pessoa em outra organização
      final t2 = Terreno();
      await t2.start();
      addTearDown(t2.stop);
      final outra = Aparelho(t2);
      addTearDown(outra.fechar);
      const u1EmT2 = AuthUser(
        sub: 'u1',
        email: 'tecnico@t1.test',
        tenantId: 't2',
        tenantRole: 'field_technician',
        tenantRoles: ['field_technician'],
        permissions: ['work_orders:read'],
        scope: 'tenant',
      );
      await outra.storage.saveSession(sessaoGuardada(user: u1EmT2));
      await outra.storage.saveBootstrapJson(
        BootstrapSessionCodec.encode(cacheAntigo()),
      );
      await outra.abrir(extras: [bootstrapNoTerreno(t2, outra.storage)]);
      final recusado = await bootstrapDe(outra.container);
      expect(recusado.permissions.contains('velha'), isFalse);
      expect(t2.bootstraps, 1);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3g] troca local de organização e o app reaberto: a organização escolhida continua',
    () async {
      final storage = InMemoryAuthTokenStorage();
      final c1 = appLocal(storage);
      await c1.read(authStateProvider.future);
      await c1
          .read(authStateProvider.notifier)
          .login(email: 'tecnico@demo.test', password: 'senha');
      expect((await bootstrapDe(c1)).activeTenant.tenantId, 'tenant-demo');
      // B-APP-ORG (§5.4): a troca é da sessão, pelo orquestrador; a sessão
      // gravada passa a ser a de tenant-field.
      await c1.read(tenantSwitchOrchestratorProvider).run('tenant-field');
      expect((await storage.loadSession())!.user.tenantId, 'tenant-field');
      expect((await bootstrapDe(c1)).activeTenant.tenantId, 'tenant-field');
      c1.dispose();

      final c2 = appLocal(storage);
      addTearDown(c2.dispose);
      await c2.read(authStateProvider.future);
      expect((await bootstrapDe(c2)).activeTenant.tenantId, 'tenant-field');
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  // B-APP-ORG (§5.4): o `fetchForTenant` saiu; ficam os 2 fetch.
  test('[T3h] os 2 fetch gravam ownerKey == sessionKeyOf(session)', () async {
    final s = sessaoGuardada(acesso: 'A0', sessionNonce: 'n-t3h');
    final key = sessionKeyOf(s);
    expect(key, 'u1|t1|n-t3h');

    final local = LocalDevBootstrapRepository(InMemoryAuthTokenStorage());
    final fl = await local.fetch(s);
    expect(fl.ownerKey, key, reason: 'fetch local');
    await local.cache(fl);
    expect((await local.restoreCached())?.ownerKey, key);

    final remoto = bootstrapRemoto(terreno, InMemoryAuthTokenStorage());
    final fr = await remoto.fetch(s);
    expect(fr.ownerKey, key, reason: 'fetch remoto');
    expect((await remoto.restoreCached())?.ownerKey, key);
  }, timeout: const Timeout(Duration(seconds: 20)));

  test(
    '[T3i] remoto e local: a mesma pessoa entra duas vezes na mesma organização; identificadores diferentes, o cache da 1ª recusado, as permissões novas aparecem',
    () async {
      // remoto
      terreno.permissoesBootstrap = const ['velha'];
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');
      final n1 = app.estado?.session?.sessionNonce;
      expect(
        (await bootstrapDe(app.container)).permissions.contains('velha'),
        isTrue,
      );
      terreno.permissoesBootstrap = const ['nova'];
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');
      final n2 = app.estado?.session?.sessionNonce;
      expect(n1, isNotNull);
      expect(n2, isNotNull);
      expect(n2, isNot(n1), reason: 'remoto: cada login é uma sessão nova');
      final remoto = await bootstrapDe(app.container);
      expect(remoto.permissions.contains('nova'), isTrue, reason: 'remoto');
      expect(remoto.permissions.contains('velha'), isFalse, reason: 'remoto');

      // local
      final storage = InMemoryAuthTokenStorage();
      final c = appLocal(storage);
      addTearDown(c.dispose);
      await c.read(authStateProvider.future);
      final notifier = c.read(authStateProvider.notifier);
      await notifier.login(email: 'tecnico@demo.test', password: 'senha');
      final l1 = c.read(authStateProvider).asData?.value.session?.sessionNonce;
      final b1 = await bootstrapDe(c);
      await storage.saveBootstrapJson(
        BootstrapSessionCodec.encode(
          BootstrapSession(
            activeTenant: b1.activeTenant,
            availableTenants: b1.availableTenants,
            user: b1.user,
            enabledModules: b1.enabledModules,
            permissions: const PermissionSet({'velha'}),
          ).withOwnerKey(b1.ownerKey!),
        ),
      );
      await notifier.login(email: 'tecnico@demo.test', password: 'senha');
      final l2 = c.read(authStateProvider).asData?.value.session?.sessionNonce;
      expect(l1, isNotNull);
      expect(l2, isNot(l1), reason: 'local: cada login é uma sessão nova');
      final novo = await bootstrapDe(c);
      expect(novo.permissions.contains('velha'), isFalse, reason: 'local');
      expect(novo.permissions.contains('work_orders:read'), isTrue);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3j] cache antigo sem dono e um login novo da mesma pessoa e organização: recusado',
    () async {
      await app.storage.saveBootstrapJson(
        BootstrapSessionCodec.encode(cacheAntigo()),
      );
      await app.abrir(extras: [bootstrapNoTerreno(terreno, app.storage)]);
      await app.notifier.login(email: 'u1@t1.test', password: 'senha');

      final b = await bootstrapDe(app.container);

      expect(b.permissions.contains('velha'), isFalse);
      expect(b.ownerKey, sessionKeyOf(app.estado!.session!));
      expect(terreno.bootstraps, 1);
    },
    timeout: const Timeout(Duration(seconds: 20)),
  );

  test(
    '[T3k] SecureAuthTokenStorage: o identificador vai e volta, e o clearSession o apaga',
    () async {
      FlutterSecureStorage.setMockInitialValues({});
      const raw = FlutterSecureStorage();
      const storage = SecureAuthTokenStorage(raw);

      await storage.saveSession(sessaoGuardada(sessionNonce: 'n-t3k'));
      expect((await storage.loadSession())?.sessionNonce, 'n-t3k');
      expect(await raw.read(key: 'erp.session_nonce'), 'n-t3k');

      await storage.clearSession();
      expect(await storage.loadSession(), isNull);
      expect(await raw.read(key: 'erp.session_nonce'), isNull);
    },
  );
}
