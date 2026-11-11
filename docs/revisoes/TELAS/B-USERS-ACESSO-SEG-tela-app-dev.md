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
