import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/app/router.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_notifier.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_repository.dart';
import 'package:erp_techsolutions_mobile/core/auth/auth_token_storage.dart';
import 'package:erp_techsolutions_mobile/core/network/connectivity_repository.dart';
import 'package:erp_techsolutions_mobile/features/auth/change_password_screen.dart';
import 'package:erp_techsolutions_mobile/features/auth/login_screen.dart';
import 'package:erp_techsolutions_mobile/shared/theme/erp_mobile_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';

const _email = 'maria.souza@guinchoexemplo.com.br';
const _provisoria = 'Provisoria#1';
const _nova = 'NovaSenha#2026';

const _loginPath = '/api/v1/auth/login';
const _passwordPath = '/api/v1/auth/password';

Map<String, dynamic> _loginJson({required bool mustChange}) => {
  'data': {
    'authenticated': true,
    'accessToken': 'acc-1',
    'refreshToken': 'ref-1',
    'expiresIn': 900,
    'user': {'id': 'usr-001', 'email': _email, 'tenant_id': 'ten-001'},
    'roles': mustChange
        ? const <Object>[]
        : const [
            {'id': 'r1', 'key': 'field_technician', 'name': 'Técnico'},
          ],
    'permissions': mustChange ? const <Object>[] : const ['work_orders:read'],
    'must_change_password': mustChange,
  },
};

Map<String, dynamic> _erro(String code, {String? reason}) => {
  'error': {'code': code, 'reason': reason},
};

class _Reply {
  const _Reply(this.status, [this.body = const {}]);
  final int status;
  final Map<String, dynamic> body;
}

class _RouteAdapter implements HttpClientAdapter {
  _RouteAdapter(this.replies);

  final Map<String, _Reply> replies;
  final List<RequestOptions> requests = [];

  int count(String path) => requests.where((r) => r.path == path).length;

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    requests.add(options);
    final reply = replies[options.path] ?? const _Reply(404);
    return ResponseBody.fromString(
      jsonEncode(reply.body),
      reply.status,
      headers: {
        Headers.contentTypeHeader: ['application/json; charset=utf-8'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

class _Harness {
  _Harness({
    required this.container,
    required this.adapter,
    required this.repo,
  });

  final ProviderContainer container;
  final _RouteAdapter adapter;
  final DioAuthRepository repo;

  GoRouter get router => container.read(appRouterProvider);
  String get path => router.routerDelegate.currentConfiguration.uri.path;
}

Future<_Harness> _pumpApp(
  WidgetTester tester,
  Map<String, _Reply> replies,
) async {
  tester.view.physicalSize = const Size(1170, 2436);
  tester.view.devicePixelRatio = 3;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);

  final adapter = _RouteAdapter(replies);
  final storage = InMemoryAuthTokenStorage();
  final repo = DioAuthRepository(
    client: Dio(BaseOptions(baseUrl: 'https://teste.local'))
      ..httpClientAdapter = adapter,
    storage: storage,
  );
  final container = ProviderContainer(
    overrides: [
      authTokenStorageProvider.overrideWithValue(storage),
      authRepositoryProvider.overrideWithValue(repo),
    ],
  );

  addTearDown(container.dispose);

  final h = _Harness(container: container, adapter: adapter, repo: repo);
  await tester.pumpWidget(
    UncontrolledProviderScope(
      container: container,
      child: MaterialApp.router(
        theme: ErpMobileTheme.light(),
        routerConfig: h.router,
      ),
    ),
  );
  await tester.pump(const Duration(milliseconds: 2300));
  await tester.pumpAndSettle();
  expect(find.byType(LoginScreen), findsOneWidget);
  return h;
}

Future<void> _loginPelaTela(WidgetTester tester) async {
  final campos = find.byType(TextField);
  await tester.enterText(campos.at(0), _email);
  await tester.enterText(campos.at(1), _provisoria);
  await tester.tap(find.widgetWithText(FilledButton, 'Entrar'));
  await tester.pumpAndSettle();
}

Future<void> _preencherTroca(WidgetTester tester) async {
  await tester.enterText(
    find.byKey(ChangePasswordScreen.currentFieldKey),
    _provisoria,
  );
  await tester.enterText(find.byKey(ChangePasswordScreen.newFieldKey), _nova);
  await tester.enterText(
    find.byKey(ChangePasswordScreen.confirmFieldKey),
    _nova,
  );
}

void main() {
  testWidgets(
    'TP1 — 409 temporary_password_expired mostra a frase e deixa só o botão de sair',
    (tester) async {
      final h = await _pumpApp(tester, {
        _loginPath: _Reply(200, _loginJson(mustChange: true)),
        _passwordPath: _Reply(
          409,
          _erro('CONFLICT', reason: 'temporary_password_expired'),
        ),
      });

      await _loginPelaTela(tester);
      await _preencherTroca(tester);
      await tester.tap(find.byKey(ChangePasswordScreen.saveButtonKey));
      await tester.pumpAndSettle();

      expect(h.path, '/change-password');
      expect(
        find.text('Sua senha provisória venceu. Peça uma nova ao seu pátio.'),
        findsOneWidget,
      );
      // C4-04: o título e o subtítulo não mandam mais trocar a senha.
      expect(find.text('Senha provisória vencida'), findsOneWidget);
      expect(
        find.text('Para continuar, saia e entre com a nova senha provisória.'),
        findsOneWidget,
      );
      expect(find.text('Crie sua nova senha'), findsNothing);
      expect(
        find.text(
          'Por segurança, troque a senha provisória antes de continuar.',
        ),
        findsNothing,
      );
      expect(find.byKey(ChangePasswordScreen.exitButtonKey), findsOneWidget);
      expect(find.byKey(ChangePasswordScreen.saveButtonKey), findsNothing);
      expect(find.byType(TextField), findsNothing);

      // C4-02: "Sair" é a ÚNICA ação da tela — conta todo botão, todo alvo de
      // toque e todo campo, com ou sem a key canônica.
      Finder naTela(bool Function(Widget w) p) => find.descendant(
        of: find.byType(ChangePasswordScreen),
        matching: find.byWidgetPredicate(p),
      );
      final botoes = naTela(
        (w) =>
            w is ButtonStyleButton ||
            w is IconButton ||
            w is FloatingActionButton,
      );
      expect(botoes, findsOneWidget, reason: 'só o botão de sair');
      expect(
        tester.widget(botoes),
        isA<TextButton>().having(
          (b) => b.key,
          'key',
          ChangePasswordScreen.exitButtonKey,
        ),
      );
      expect(
        find.descendant(of: botoes, matching: find.text('Sair')),
        findsOneWidget,
      );
      expect(
        naTela((w) => w is InkWell && w.onTap != null),
        findsOneWidget,
        reason: 'nenhum outro alvo de toque além do Sair',
      );
      expect(naTela((w) => w is EditableText), findsNothing);
    },
  );

  testWidgets(
    'TP3 — a frase da senha vencida continua na tela depois que a rede cai',
    (tester) async {
      final h = await _pumpApp(tester, {
        _loginPath: _Reply(200, _loginJson(mustChange: true)),
        _passwordPath: _Reply(
          409,
          _erro('CONFLICT', reason: 'temporary_password_expired'),
        ),
      });

      await _loginPelaTela(tester);
      await _preencherTroca(tester);
      await tester.tap(find.byKey(ChangePasswordScreen.saveButtonKey));
      await tester.pumpAndSettle();
      expect(
        find.text('Sua senha provisória venceu. Peça uma nova ao seu pátio.'),
        findsOneWidget,
      );

      h.container.read(networkStatusProvider.notifier).setOffline();
      await tester.pumpAndSettle();

      expect(h.path, '/change-password');
      expect(
        find.text('Sua senha provisória venceu. Peça uma nova ao seu pátio.'),
        findsOneWidget,
        reason: 'a queda da rede não esconde a instrução de saída',
      );
      expect(find.byKey(ChangePasswordScreen.exitButtonKey), findsOneWidget);
    },
  );

  testWidgets(
    'TP2 — sessão restrita do par de concessão volta toda rota para a troca e não pede sessão de escuta',
    (tester) async {
      final h = await _pumpApp(tester, {
        _loginPath: _Reply(200, _loginJson(mustChange: true)),
      });

      await _loginPelaTela(tester);

      for (final destino in ['/work-orders', '/sync', '/', '/profile']) {
        h.router.go(destino);
        await tester.pumpAndSettle();
        expect(h.path, '/change-password', reason: destino);
      }

      expect(h.adapter.count(kActiveTenantPath), 0);
      expect(h.repo.currentSession()?.mustChangePassword, isTrue);
    },
  );
}
