# B-USERS-ACESSO-SEG — T2, tela de troca de senha do app de campo (diário do dev)

> **Identidade:** `dev-527-tela-app-cl`, nova (não achou, não planejou, não criticou nada no #527).
> **Modelo:** Claude Opus 5.5, o da sessão ("telas no Claude", `D-CODEX-PRIMEIRO-TELAS-E-PLANOS-NO-CLAUDE`).
> **Ramo:** `feat/users-seg-tela-app`, criado de `e09e9667` (F1 do backend), worktree `C:/Users/thiag/w-tela527app`.
> **Plano:** `planos/B-USERS-ACESSO-SEG-conserto-c1.md`, seção A-04 (T.1, T.3, T.4) e emendas 3, 4 e 5 (prevalecem
> nessa ordem). Só a opção A no app (Emenda 4, item 2). Programado pelo CONTRATO, com dublês (Emenda 5 aplicada ao
> app); o orquestrador integra depois da F2 do backend.
> **Este diário** é o caminho que o mandato do orquestrador nomeou (P1). Nenhuma senha de teste, token ou hash aparece
> aqui: os testes usam valores fictícios e o diário só registra nomes de teste e resumos.
> Toda hora vem de `date` (São Paulo, salvo quando marcada UTC).

## T2.0 — leitura e retomada

- 21:39 SP: leitura do plano inteiro (973 linhas), da referência `telas-3opcoes/troca-senha-claude.html` (opção A do
  app, `trocaApp('a')`, `faixaM`, `loginApp`) e da captura `troca-senha-app-a.png`.
- **RETOMADA (P8), 21:54 SP:** a sessão do orquestrador caiu às ~21:45. Parcial medido antes de seguir:
  `git status` limpo, `git log -1` = `e09e9667`, nenhum arquivo meio-escrito. Nada tinha sido escrito; só leitura.
  Recursos: `VERDE`, commit livre 23432 MB.
- Janela do teste de carga estendida pelo orquestrador até 22:45 (AMARELO libera, só VERMELHO para).

### Medido no objeto (`e09e9667`), antes do código

| O quê | Onde | Leitura |
|---|---|---|
| Login grava a sessão | `auth_repository.dart:190-193` | `_sessionFromJson` + `saveSession` sempre |
| Refresh usa o mesmo parser | `auth_repository.dart:201-213` | por isso a regra do campo NÃO entra no `_sessionFromJson` (RQ-2(b)) |
| Cliente do repositório de auth | `auth_notifier.dart:24` | `createExpenseHttpClient(const ApiConfig())`, sem `AuthRefreshInterceptor`: 401 não repete (RQ-6 não precisa de conserto no app; fica um teste que o fixa) |
| Interceptor de refresh | `auth_interceptor.dart:28-32` | `_skipPaths` NÃO inclui `/api/v1/auth/password`: se a troca passasse por um cliente autenticado, o 401 repetiria |
| Token para o resto do app | `auth_notifier.dart:154-161` (`authenticatedApiConfigProvider`) | devolve o token de QUALQUER sessão no estado, sem olhar o status. 11 consumidores (sync, localização, telemetria, checklists, OS, cadastros) |
| Bootstrap | `bootstrap_repository.dart:519-530` e `:550-561` | só busca com `isAuthenticated`; senão `repo.fetch(null)`, que no remoto lança `ApiUnauthorizedError` sem rede (`:442`) |
| Sincronização automática | `auto_sync_coordinator.dart:71-76` | só roda com `bootstrapSessionProvider` com valor; sem bootstrap, sai em silêncio |
| Usuário da fila | `sync_providers.dart:48-56` | `currentSyncUserIdProvider` já devolve nulo sem `isAuthenticated` |
| Telemetria de conexão | `auth_notifier.dart:79-83` (APP_CONNECT no `login()`), `:89-97` (APP_DISCONNECT no `logout()`), `app.dart:60-67` (retomada só com `isAuthenticated`) | o `login()` e o `logout()` registram pela presença da sessão, não pelo status |
| Redirecionamento | `router.dart:47-80` | sem regra para sessão restrita |
| Formato de erro do backend | `identity-links.routes.ts:203-211`, `http.ts:28-48`, `authenticated-actor.middleware.ts:120-127` | `{error:{code, reason, message}}`; o token inválido vem como `{error:{code:"INVALID_TOKEN"}}`, sem `reason` |
| Campo da marca no login | `auth.routes.ts:313-333` (corpo) + plano 2.2 | `data.must_change_password`, irmão de `roles` e `permissions` (ainda não emitido em `e09e9667`; F2) |
| Implementações de `AuthRepository` | `git grep "implements AuthRepository"` | só as 2 de `lib/` (nenhuma em `test/`): acrescentar `changePassword` à interface não quebra dublê |
| `switch` exaustivo sobre `AuthStatus` | `git grep "case AuthStatus"` | nenhum: acrescentar `passwordChangeRequired` não quebra nada |

## T2.1 — código (modelos, repositório, notificador, roteador, tela, aviso no login)

Arquivos, todos do PERMITIDO de T.3: `auth_models.dart`, `auth_repository.dart`, `auth_notifier.dart`, `router.dart`,
`change_password_screen.dart` (novo), `login_screen.dart` (só o aviso). `pubspec.yaml`/`pubspec.lock`,
`auth_token_storage.dart`, fila offline e sincronização: intocados (`git status` só lista os 6 + este diário).

- **RQ-2(b):** `login()` do `DioAuthRepository` lê `must_change_password` do corpo da resposta do LOGIN (mesmo envelope
  `data`) com `== true`. `_sessionFromJson` NÃO mudou: o `refresh()` mantém a sessão inteira.
- **Sessão restrita só em memória:** no ramo restrito, `_current = sessão` e `_storage.clearSession()` (uma sessão antiga
  guardada também sai); nada é gravado.
- **Troca:** `changePassword` no repositório, `POST /api/v1/auth/password` com `{currentPassword, newPassword}` pelo
  MESMO cliente do login (sem `AuthRefreshInterceptor`), com o `Authorization` do token em memória por requisição. 200 →
  `_current = null` e armazenamento limpo. Mapa fixo por `status` + `reason` (`mapPasswordChangeError`, no molde do
  `mapLoginError`); o `message` do servidor nunca é lido. Sessão vencida (401 `jwt_required`/`INVALID_TOKEN`) também
  limpa a memória.
- **Notificador:** `login()` com sessão restrita → `AuthStatus.passwordChangeRequired`, sem APP_CONNECT.
  `changePassword()` → sucesso: `unauthenticated` com `safeNotice` "Senha alterada. Entre com a nova senha."; sessão
  vencida: `expired` com "Sua sessão expirou. Entre de novo com a senha provisória."; demais erros sobem para a tela.
  `logout()` só registra APP_DISCONNECT com sessão autenticada (o "Sair" da restrita não registra).
- **Leitura do dev, declarada (§A6):** `authenticatedApiConfigProvider` passa a entregar o token só com
  `isAuthenticated`. Medido em T2.0: ele entregava o token de qualquer sessão no estado aos 11 consumidores (sync,
  localização, telemetria, checklists, OS, cadastros). Sem isso, o token restrito chegaria a eles; com isso, a sessão
  restrita não aciona sincronização nem telemetria. Comportamento igual para os estados que já existiam (nenhum deles
  tinha sessão sem estar autenticado: medido em `auth_notifier.dart`).
- **Bootstrap e sincronização, medido (o plano pediu):** o bootstrap só busca com `isAuthenticated`
  (`bootstrap_repository.dart:519-530`, `:550-561`); na restrita cai em `fetch(null)`, que lança sem rede (`:442`). O
  auto-sync só roda com bootstrap (`auto_sync_coordinator.dart:71-76`). A retomada do app só liga telemetria com
  `isAuthenticated` (`app.dart:60-62`). Com o roteador, nenhuma tela além da troca abre.
- **Roteador:** uma regra antes das outras: restrita → toda rota que não seja `/change-password` vai para ela; em
  `/change-password` sem restrita: sessão inteira → `/`, sem sessão → `/login`. A rota também entrou no `appRouter` de
  teste (espelho).
- **Tela (opção A):** marca, cartão, título, apoio, "Entrando como <e-mail>" (e-mail da própria sessão, texto simples,
  estilo do rótulo, quebra em vez de cortar), faixa, 3 campos com cadeado e botão mostrar/ocultar (44 × 44, rótulo
  "Mostrar …"/"Ocultar …"), dica, "Salvar nova senha", "Sair". Sem o rodapé "Conexão segura · TLS 1.3" (referência).
  Estados: carregando (indicador no botão, campos, olhos e "Sair" travados, sem duplo envio); erro (faixa do mapa);
  `invalid_credentials` limpa e marca a provisória e devolve o foco; acesso não permitido (403 `user_inactive` e
  `credential_unavailable`) trava o formulário e deixa só "Sair"; sem conexão: faixa com ícone, botão travado, nenhuma
  chamada; sessão vencida: volta ao login com o texto.
- **Leituras do dev, declaradas (§A6):** (1) a referência trava o formulário só em "Acesso desativado"; o plano agrupa
  `user_inactive` e `credential_unavailable` como "acesso não permitido" (§7), e tentar de novo não resolve nenhum dos
  dois, então os dois travam. (2) O texto de confirmação diferente ("A confirmação não é igual à nova senha.") vem da
  referência aprovada (`T.confere`); o plano só diz que a validação local "confere a confirmação". (3) `_BrandCard`,
  `_FieldLabel` e a faixa do login são privados em `login_screen.dart`, e o PERMITIDO só deixa o login ganhar o aviso:
  ficam repetidos em `change_password_screen.dart`. Pendência proposta ao orquestrador:
  `P-APP-AUTH-BLOCOS-COMPARTILHADOS` (extrair marca, rótulo e faixa do login para a biblioteca, no próximo bloco que
  puder tocar o login). (4) Campo focado com borda azul de 2 px e campo inválido com borda vermelha: divergências
  conscientes já registradas na referência aprovada.
- `dart format` (1 arquivo reformatado, o novo) e `flutter analyze`: **No issues found** (21:59 SP).

## T2.2 — testes (`test/features/busers_seg_troca_senha_test.dart`) e mutações

**Teste novo, verde no head de código `b46bc5ca`** (22:04 SP): `flutter test test/features/busers_seg_troca_senha_test.dart
--reporter compact` → **`00:13 +32: All tests passed!`** (32 testes). Dublês: adaptador HTTP falso por caminho (contrato
da Emenda 5: resposta do login com `must_change_password` e `user.email`; `POST /api/v1/auth/password` com o envelope
`{error:{code, reason, message}}`), `InMemoryAuthTokenStorage`, fila que registra todo `enqueue` e espião de
telemetria. Os casos de tela abrem o roteador REAL (`appRouterProvider`, com o redirect) num aparelho de 390 × 812.

| Caso | Teste(s) |
|---|---|
| F1 | `F1 — login com must_change_password:true abre a troca de senha, não o início` |
| F2 | `F2 — login restrito: o armazenamento fica VAZIO e o restoreSession devolve nulo` (com sessão antiga guardada antes) |
| F3 | `F3 — com sessão restrita, /work-orders e /sync terminam na troca de senha` (também `/` e `/profile`); `sem sessão, /change-password vai para o login` |
| F4 | `F4 — 200: memória apagada e volta ao login com o aviso "Senha alterada"`; `F4 — 401 invalid_credentials: texto fixo, a tela fica e a provisória volta vazia` |
| F5 | 13 casos `F5 — <status/motivo> vira o texto fixo` (cada um asserta o texto e a ausência do `message` do servidor) + `F5 — nenhum texto do mapa tem termo técnico` |
| F6 | `F6 — sem conexão: texto de offline, botão travado, nenhuma chamada e nada na fila` |
| F7 (RQ-2(b)) | `F7 — login sem o campo dá sessão INTEIRA e gravada; o refresh dela continua inteiro e gravado`; `F7 — login com o campo false dá sessão inteira e gravada` |
| Emenda 4 | `Emenda 4 — a linha mostra o e-mail da própria sessão e nenhum outro texto` |
| RQ-6 no app | `RQ-6 no app — 401 invalid_credentials: UMA requisição à troca e nenhuma ao refresh` |
| Estados §7 | sessão vencida (401 `jwt_required`) → login com o texto; acesso não permitido (403 `user_inactive`) → trava e só "Sair"; validação local; a11y (rótulos e alvos ≥ 44 px) |
| Sessão restrita fora do resto do app | `login restrito: sem APP_CONNECT, sem token para o resto do app, sem usuário de fila; "Sair" sem APP_DISCONNECT` + controle `login inteiro registra APP_CONNECT e entrega o token` |

**Vermelho-controle no objeto (`e09e9667`), declarado:** o arquivo novo não compila no objeto (não existem
`ChangePasswordScreen`, `changePassword` nem `mustChangePassword`), então o vermelho por execução no objeto não se
mede. As mutações M-F1 (o login ignora o campo, como no objeto), M-F2 (grava a sessão, como `auth_repository.dart:193`
no objeto) e M-F3 (sem a regra do redirect, como no objeto) reproduzem o comportamento do objeto e ficaram vermelhas.

**Mutações literais**, uma por vez, aplicadas e revertidas por edição inversa com âncora única
(`mut.py apply|revert`, no scratchpad), com `git diff --quiet -- lib` depois de cada reversão. `not ok` = os testes que
ficaram vermelhos (`[E]` do reporter `expanded`).

| ID | Mutação literal | Resultado | Vermelhos que provam |
|---|---|---|---|
| M-F1 (RQ-2 (a)) | `auth_repository.dart`, `login()`: `mustChangePassword: _loginBody(json)['must_change_password'] == true,` → `mustChangePassword: false,` | `+19 -13: Some tests failed.` | **F1**, F2, F3, F4 (×2), F6, Emenda 4, RQ-6 e mais 5 |
| M-F2 | `login()`, ramo restrito: `await _storage.saveSession(session);` logo depois do `clearSession()` | `+30 -2` | **F2**, F6 (armazenamento não vazio) |
| M-F3 | `router.dart`: o bloco `if (authState.isPasswordChangeRequired) {...}` trocado pelo marcador `// MUTACAO-M-F3` | `+22 -10` | **F3**, F1, F4 (×2), F6, Emenda 4 e mais 4 |
| M-F4 | `changePassword()`: apagar `_current = null;` e `await _storage.clearSession();` depois do 200 | `+31 -1` | **F4 (200)** |
| M-F5 | `PasswordChangeError.safeMessage` devolve o `message` do corpo (`_ecoDoServidor ?? passwordChangeMessage(failure)`, com `_ecoDoServidor` lido em `mapPasswordChangeError`) | `+16 -16` | os 13 casos **F5**, F4 (401), acesso não permitido, sessão vencida |
| M-F6 | `change_password_screen.dart`: `canSubmit = fieldsEnabled` (botão ativo sem conexão) e, no ramo offline do `_submit`, `enqueue(SyncAction(type: 'password_change', ...))` na `syncQueueRepositoryProvider` | `+31 -1` | **F6** |
| M-F7b (RQ-2 (b)) | `_sessionFromJson`: `mustChangePassword: body['must_change_password'] != false,` no `AuthSession` | `+31 -1` | **F7** (o refresh vira restrito) |
| M-F7c (RQ-2 (c)) | `login()`: `== true` → `!= false` | `+30 -2` | **F7** (login sem o campo deixa de gravar), controle de APP_CONNECT |

Nota de procedimento: a 1ª tentativa da M-F3 trocava o bloco por texto vazio, e a reversão por edição inversa recusou a
âncora vazia (`ANCORA revert encontrada 17235 vezes`). O `router.dart` foi restaurado do commit `b46bc5ca`
(`git checkout -- lib/app/router.dart`; `git diff --quiet -- lib` limpo) e a M-F3 foi refeita com o marcador, com o
mesmo resultado (`+22 -10`).

Sobre a M-F7b: o plano previa que ela também deixasse vermelhos `b090` t08 e `b098` 1.1. Aqui o `login()` monta a sessão
de novo a partir do `_sessionFromJson` e decide o campo por conta própria, então a mutação no parser só alcança o
`refresh()`. O F7 morre por ela; as duas regressões não precisam morrer (são do caminho do login).

## T2.3 — recursos e revisão de UI (`ui-ux-pro-max`)

- **22:08 SP: VERMELHO** (`01:08:49Z ram_livre=0,7GB commit=77%`; commit livre 15832 MB). Regra do mandato: só o
  VERMELHO para; espero 5 min e meço de novo. Nenhum passo pesado (Flutter) até lá; só edição e diário.
- **Revisão pela skill `ui-ux-pro-max`** (sobre a minha própria tela, antes da conferência), três achados, corrigidos:
  1. os rótulos visíveis não estavam ligados aos campos para o leitor de tela (o campo seria lido pela dica
     "••••••••"): cada campo agora tem o rótulo semântico ("Senha provisória", "Nova senha", "Confirme a nova senha"),
     e o rótulo visual fica fora da árvore de semântica para não ser lido duas vezes;
  2. depois de erro da validação local, o foco não ia para o campo a corrigir: agora vai (primeiro vazio; nova senha
     fora da regra; confirmação diferente);
  3. o "próximo" do teclado podia cair no botão do olho: agora leva ao campo seguinte.
  O alvo de toque fica em 44 px, como o plano manda (T.1 e §10); a skill fala em 48 dp genéricos, e o plano prevalece
  sobre ela (precedência da própria skill).
- Asserções novas no teste: os 3 rótulos semânticos (`find.bySemanticsLabel`) e o foco na confirmação depois do erro de
  confirmação diferente.
- **22:14 SP: VERMELHO de novo** (`01:14:33Z ram_livre=0,3GB commit=77%`; commit livre 14798 MB). Nova espera de 5 min.
- **22:19 SP: VERMELHO** (`01:19:53Z ram_livre=1,2GB commit=74%`; commit livre 17016 MB). Nova espera de 5 min.
- **22:25 SP: VERMELHO** (`01:24:53Z ram_livre=0,4GB commit=74%`; commit livre 16704 MB). Nova espera de 5 min.
- **22:30 SP: VERMELHO** (`01:30:10Z ram_livre=1,0GB commit=72%`; commit livre 17985 MB).

## PAUSA 01:30 UTC (22:30 SP) — ordem do dono (reiniciar o PC), repassada pelo orquestrador (P7)

**Head do ramo `feat/users-seg-tela-app`:** o commit desta pausa, logo acima de `b46bc5ca` (código da T2). **Sem push**: a
bateria do §9 não fechou.

**Feito (comando → saída):**
- T2.1, código: commit `b46bc5ca`; `flutter analyze` → `No issues found! (ran in 11.2s)` (21:59 SP).
- T2.2, teste novo, versão sem as asserções de a11y da T2.3: `flutter test test/features/busers_seg_troca_senha_test.dart
  --reporter compact` → `00:13 +32: All tests passed!` (22:04 SP); depois da volta à sintaxe `?` nos mapas,
  `flutter analyze` → `No issues found! (ran in 7.5s)`.
- Mutações vermelhas, revertidas, `lib/` limpo depois de cada uma: M-F1 (`+19 -13`), M-F2 (`+30 -2`), M-F3 (`+22 -10`),
  M-F4 (`+31 -1`), M-F5 (`+16 -16`), M-F6 (`+31 -1`), M-F7b (`+31 -1`), M-F7c (`+30 -2`). Detalhe na T2.2.

**NÃO medido (commitado nesta pausa para não ficar solto, a medir na retomada):**
- as 3 correções de a11y da T2.3 em `change_password_screen.dart` (rótulo semântico no campo, foco no campo a corrigir,
  "próximo" leva ao campo seguinte): só `dart format` rodou; `flutter analyze` e os testes NÃO rodaram depois delas;
- as 2 asserções novas no teste (rótulos semânticos e foco na confirmação): não rodaram.
Motivo: recursos em VERMELHO desde 22:08 SP (5 medições, a cada 5 min); nenhum passo pesado foi feito.

**Falta:**
1. `flutter analyze` + o teste novo (verde) com as mudanças da T2.3;
2. mutações pendentes: **M-EMAIL** (`change_password_screen.dart`: `final email = authState?.session?.user.email ?? '';`
   → `final email = '';`, esperado vermelho: `Emenda 4 — ...`); **M-RQ6** (`auth_repository.dart`, em `changePassword()`
   antes do `try`: `_client.interceptors.add(AuthRefreshInterceptor(client: _client, onRefresh: () async =>
   'outro-token', onClearSession: () async {}));` + `import '../network/auth_interceptor.dart';`, esperado vermelho:
   `RQ-6 no app — ...`); **M-TOKEN** (`auth_notifier.dart`: `state.isAuthenticated ? state.session?.tokens.accessToken :
   null,` → `state.session?.tokens.accessToken,`, esperado vermelho: `login restrito: sem APP_CONNECT, sem token ...`);
   e **refazer M-F6** (a tela mudou na T2.3; mesmas 3 trocas da T2.2);
3. bateria do §9: `flutter pub get` → `dart format --output=none --set-exit-if-changed lib test` → `flutter analyze` →
   o teste novo → as 5 regressões (`bo6r01_login_sem_org_erros_test.dart`, `b098_real_auth_bootstrap_test.dart`,
   `b089_auth_http_checklist_test.dart`, `b090_auth_production_token_refresh_test.dart`,
   `test/core/auth/auth_repository_test.dart`) → `flutter test --reporter compact`;
4. registrar os resumos aqui, commitar e dar push no ramo (sem PR).

**Próximo comando exato** (só com recursos liberados: depois das 22:45, só VERDE; commit livre ≥ 2048 MB):
```
cd C:/Users/thiag/w-tela527app/mobile/flutter_app && flutter analyze && flutter test test/features/busers_seg_troca_senha_test.dart --reporter compact
```
As mutações rodam com `bash <scratchpad>/t2/run-mut.sh <ID>` (aplica, roda o teste novo, lista os `[E]`, reverte por
edição inversa e confere `git diff --quiet -- lib`); se o scratchpad sumir no reinício, as trocas literais estão acima e
na T2.2.

**Arquivos meio-escritos:** nenhum. Os 3 arquivos desta pausa estão completos e formatados; só não foram medidos.

## RETOMADA depois da PAUSA (23:06 SP, 02:06 UTC)

- **Parcial medido (P3/P7):** `git status` limpo, head `49733a24`, scratchpad das mutações intacto; recursos `VERDE`
  (`02:06:38Z ram_livre=11,2GB commit=36%`), commit livre 40144 MB.
- **Contrato do backend medido na ref `a5b56555`** (`fix/users-acesso-seg`, F2 a F5; §A7, `git show`): o login manda
  `data.must_change_password` (booleano, sempre presente) e, com `true`, `roles: []` e `permissions: []`, com
  `data.user` (tipo com `email`) — exatamente o que o app consome (`auth.routes.ts:298-339`; `API_CONTRACTS.md:191`).
  `identity-links.routes.ts` sem diff entre `e09e9667` e `a5b56555`, e a linha do `POST /auth/password` no contrato tem os
  mesmos códigos do mapa. **Nada a ajustar no app.**
- **Observação, fora do escopo (proposta de pendência):** a resposta do `POST /auth/refresh` não traz `user` (`origin/main`
  e `a5b56555`: só tokens e sessão), e o `_sessionFromJson` do app exige `body['user']`. O `refresh()` do app quebraria
  contra o backend real (o `tryRefresh` captura e manda ao login). É anterior ao bloco e o RQ-2 proíbe mexer no
  `_sessionFromJson` aqui. Proposta: `P-APP-REFRESH-SEM-USER` (bloco dono: o próximo que tocar o refresh do app). Os
  testes de refresh do app (os de antes e o F7) usam um dublê com `user`.
- `flutter analyze` → `No issues found! (ran in 9.1s)`. Teste novo com a T2.3: **`+31 -1`**: o caso de a11y achou 0 nós
  com o rótulo "Senha provisória". Medido (`tester.getSemantics`): o rótulo do nó era `"Senha provisória\n••••••••"`, ou
  seja, o leitor de tela lia também a dica decorativa. **Defeito da tela, corrigido:** a dica passou para
  `InputDecoration.hint` dentro de `ExcludeSemantics` (mesmo texto e cor). Depois: `flutter analyze` → `No issues
  found!`; teste novo → **`00:09 +32: All tests passed!`**.

## T2.4 — mutações sobre o código final (`bcfd3528`), 23:10–23:13 SP

As 12, uma por vez, aplicadas e revertidas por edição inversa com âncora única, `git diff --quiet -- lib` limpo depois de
cada uma (`run-mut.sh`). Literal de cada uma: tabela da T2.2 e roteiro da PAUSA. **Todas vermelhas.**

| ID | Resumo | Vermelho que prova |
|---|---|---|
| M-EMAIL (Emenda 4) | `+31 -1` | `Emenda 4 — a linha mostra o e-mail da própria sessão e nenhum outro texto` |
| M-RQ6 (RQ-6 no app) | `+31 -1` | `RQ-6 no app — 401 invalid_credentials: UMA requisição à troca e nenhuma ao refresh` |
| M-TOKEN (token fora do resto do app) | `+31 -1` | `login restrito: sem APP_CONNECT, sem token para o resto do app, ...` |
| M-F6 (refeita: a tela mudou na T2.3) | `+31 -1` | `F6 — sem conexão: ...` |
| M-F1 (RQ-2 (a)) | `+19 -13` | `F1 — ...` e mais 12 |
| M-F2 | `+30 -2` | `F2 — ...`, `F6 — ...` |
| M-F3 | `+22 -10` | `F3 — ...`, F4 (×2) e mais 7 |
| M-F4 | `+31 -1` | `F4 — 200: ...` |
| M-F5 | `+16 -16` | os 13 `F5 — ...` e mais 3 |
| M-F7b (RQ-2 (b)) | `+31 -1` | `F7 — login sem o campo dá sessão INTEIRA e gravada; o refresh ...` |
| M-F7c (RQ-2 (c)) | `+30 -2` | `F7 — login sem o campo ...` e o controle de APP_CONNECT |

Nota: a 1ª chamada do roteiro na retomada parou em `ARVORE SUJA DEPOIS DA REVERSAO` porque a correção da dica ainda não
estava commitada (a conferência compara `lib/` com o HEAD). A reversão da M-EMAIL foi exata (`git diff` só mostrava a
correção da dica); a correção foi commitada (`bcfd3528`) e as 12 rodaram de novo do zero.

## T2.5 — bateria do §9 (`cd mobile/flutter_app`), 23:13 SP em diante

| Passo | Resultado |
|---|---|
| `flutter pub get` | `Got dependencies!` (sem mudança em `pubspec.lock`) |
| `dart format --output=none --set-exit-if-changed lib test` | **exit 1, ANTERIOR AO BLOCO:** `Changed test\features\bsan313_minhas_os_escopo_test.dart` (243 arquivos, 1 mudaria). O arquivo não está no diff do bloco (`git diff --name-only e09e9667..HEAD`), é igual na `origin/main` `d5ec1696` e o blob dele já falha no formatador do Dart 3.11.4 (veio do #460, `d6399294`). Os 7 arquivos do bloco: `dart format --output=none --set-exit-if-changed <os 7>` → `Formatted 7 files (0 changed)`, exit 0. Pendência proposta: `P-FLUTTER-FORMAT-BSAN313` (escopo do bloco proíbe "qualquer outra feature") |
| `flutter analyze` | `No issues found! (ran in 3.8s)` |
| `flutter test test/features/busers_seg_troca_senha_test.dart --reporter compact` | `00:07 +32: All tests passed!` |
| `bo6r01_login_sem_org_erros_test.dart` | `00:02 +4: All tests passed!` |
| `b098_real_auth_bootstrap_test.dart` | `00:04 +37: All tests passed!` (37/37, a contagem da crítica no objeto) |
| `b089_auth_http_checklist_test.dart` | `00:02 +18: All tests passed!` |
| `b090_auth_production_token_refresh_test.dart` | `00:02 +18: All tests passed!` (18/18, idem) |
| `test/core/auth/auth_repository_test.dart` | `00:02 +11: All tests passed!` |
| `flutter test --reporter compact` (suíte inteira, 23:16 SP) | **`00:46 +1098 -1: Some tests failed.`** — o único vermelho é DO BLOCO: `test/core/sync/bo6r11_guard_fila_await_ast_test.dart`, teste 21 (`P-FILA-AWAIT`), `VIOLACOES(1): lib/features/auth/change_password_screen.dart: FRONTEIRA widget declarado fora dos caminhos de UI e não declarado em _uiPorHerancaDeclarada` ("a fronteira de UI mudou: ... precisa de decisão explícita") |

### O vermelho da suíte: precisa de EMENDA de escopo (não commitado)

- **Causa, medida:** o guard `P-FILA-AWAIT` lista os widgets fora dos caminhos `ui/` e exige que cada um esteja
  declarado em `_uiPorHerancaDeclarada` (`bo6r11_guard_fila_await_ast_test.dart:76-81`; hoje: diagnóstico, login,
  abertura e seletor de organização). A tela nova mora em `lib/features/auth/`, ao lado do login, porque o PERMITIDO
  fixa esse caminho.
- **Medição (aplicada só no worktree, revertida, sem commit):** acrescentar a linha
  `'lib/features/auth/change_password_screen.dart',` em `_uiPorHerancaDeclarada` → o arquivo do guard fica
  `00:03 +12: All tests passed!`; e a saída do guard não aponta nenhuma outra violação (a tela não descarta nenhuma
  gravação na fila). Revertido: `git diff --quiet -- test` limpo.
- **Por que não commitei:** `test/core/sync/bo6r11_guard_fila_await_ast_test.dart` NÃO está no PERMITIDO de T.3, e o
  próprio guard pede "decisão explícita" para mudar a fronteira. Pela `D-EMENDA-ANTES-DO-CODIGO` e pelo §C4, é emenda do
  plano antes do código, não decisão do dev.
- **Pedido ao orquestrador:** emenda `PERMITIDO += test/core/sync/bo6r11_guard_fila_await_ast_test.dart, só a linha da
  tela nova em _uiPorHerancaDeclarada`. Com ela, o dev aplica a linha, roda a suíte inteira, commita e faz push.
- **Sem push** por enquanto: a bateria não fechou (regra da PAUSA, "SEM push se a bateria não fechou"; e "dev com CI
  vermelho não escreve pronto").

### Limpeza (§C5)

Removidos: `mobile/flutter_app/build/` (73 MB, criado pelos meus testes às 22:04) e os temporários que criei em `/tmp`.
Mantidos: `.dart_tool/` e os gerados do `flutter pub get` (refazer custa e a conferência vai rodar de novo) e o
scratchpad das mutações (`<scratchpad>/t2/`: `mut.py`, `run-mut.sh` e as 12 especificações), para a conferência
reexecutar. Nada rastreado foi apagado.

### Pendências propostas (para o orquestrador registrar; não são deste ramo)

- `P-APP-AUTH-BLOCOS-COMPARTILHADOS`: extrair marca, rótulo e faixa do login para a biblioteca (hoje repetidos na tela
  de troca, porque são privados no login e o escopo não deixava mexer nele).
- `P-APP-REFRESH-SEM-USER`: o refresh do backend não manda `user`, e o `_sessionFromJson` do app exige (anterior ao bloco).
- `P-FLUTTER-FORMAT-BSAN313`: `test/features/bsan313_minhas_os_escopo_test.dart` fora do formato do Dart 3.11.4 na
  `main` (anterior ao bloco; o §9 do `dart format ... lib test` falha por ele).

## T2.6 — Emenda 6 (item 3) e Emenda 6.1 (E6-R06) aplicadas; bateria fechada (23:25–23:37 SP)

- **Emenda medida no plano** (`planos/B-USERS-ACESSO-SEG-conserto-c1.md:975-1002`): o PERMITIDO ganha
  `mobile/flutter_app/test/core/sync/bo6r11_guard_fila_await_ast_test.dart` SÓ para a linha da tela nova em
  `_uiPorHerancaDeclarada` e o comentário "quatro" → "cinco" (E6-R06).
- **Aplicada, commit `e7ba2561`:** `git diff --numstat` do arquivo = `2 1` (1 linha adicionada,
  `'lib/features/auth/change_password_screen.dart',`; 1 linha mudada, `/// quatro). ...` → `/// cinco). ...`; o comentário
  quebra em duas linhas, "exatamente estes" / "quatro).", e só a segunda muda). `dart format` do arquivo: `0 changed`.
- `flutter analyze` → `No issues found! (ran in 22.9s)`; guard → `00:30 +12: All tests passed!`.
- **Suíte inteira, 1ª rodada (23:26):** `01:41 +1098 -1`. O vermelho foi `test/features/telemetry/telemetry_test.dart`,
  caso 16 ("foreground-only: stop interrompe a captura"), `Expected: <4> Actual: <5>`. **Anterior ao bloco, medido:** o
  caso usa relógio real (tique de 25 ms, esperas de 120 ms) e só o serviço de captura; o bloco não toca
  `lib/core/telemetry` nem `test/features/telemetry` (`git diff --name-only e09e9667..HEAD` → 0). Isolado no head: 2 de 3
  rodadas vermelhas. Com o `lib/` do objeto `e09e9667` posto temporariamente no worktree (`git checkout e09e9667 --
  mobile/flutter_app/lib`, depois `git checkout HEAD -- mobile/flutter_app/lib`, `git diff --quiet` limpo): **3 de 3
  vermelhas**, o mesmo caso 16 (`Expected: <3> Actual: <4>`). É corrida de tempo sob carga (um tique em voo grava depois
  da leitura do `stop()`). Pendência proposta: `P-FLUTTER-TELEMETRIA-16-INSTAVEL` (bloco dono: o próximo que tocar a
  telemetria do app).
- **Suíte inteira, 2ª rodada (23:33):** **`01:32 +1099: All tests passed!`** (exit 0).
- **Teste novo e regressões no head final:** `busers_seg_troca_senha_test.dart` `00:10 +32: All tests passed!` ·
  `bo6r01_login_sem_org_erros_test.dart` `+4` · `b098_real_auth_bootstrap_test.dart` `+37` ·
  `b089_auth_http_checklist_test.dart` `+18` · `b090_auth_production_token_refresh_test.dart` `+18` ·
  `test/core/auth/auth_repository_test.dart` `+11` (todos `All tests passed!`).
- `dart format --output=none --set-exit-if-changed lib test`: segue exit 1 só por `bsan313_minhas_os_escopo_test.dart`
  (anterior ao bloco, ver T2.5); os arquivos do bloco não mudam.
- **Escopo:** `git diff --name-only e09e9667..HEAD` = os 6 de `lib/` de T.3, o teste novo, o guard (Emenda 6) e este
  diário (nomeado no mandato). `pubspec.yaml`, `pubspec.lock`, `auth_token_storage.dart` e `lib/core/sync/**`: 0 arquivos.
- **Limpeza (§C5):** `mobile/flutter_app/build/` removido de novo e os logs temporários em `/tmp`; mantidos `.dart_tool/`,
  os gerados do `flutter pub get` e o scratchpad das mutações (para a conferência).
- **Push** no `feat/users-seg-tela-app`, sem PR (Emenda 5: o orquestrador integra depois da F2).
