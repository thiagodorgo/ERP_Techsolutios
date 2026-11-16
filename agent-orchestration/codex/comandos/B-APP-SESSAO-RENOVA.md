# B-APP-SESSAO-RENOVA — a sessão do app se renova sozinha, e o servidor é quem revoga (item 68 do portão)

> **Plano:** v3 e as emendas 3.1, 3.2, 3.3 e 3.4 (a mais nova prevalece), escritas fora do repositório pelo topo em
> Opus, declarado (`plano-68-cl`, `plano-68-v33-cx1`, `plano-68-v34-cl`), e conferidas por outra casa
> (`dp-ver-68-v34`: CONFERIDO COM AJUSTES; o único achado é texto do plano). Este comando resume o que o dev
> executa; onde ele e o plano divergirem, vale o plano.
> **Dev:** `dev-68-cl` (Claude Opus 5.5), identidade nova. **Verificador:** outra casa, na pré-revisão; depois junta completa.
> **Ramo:** `feat/app-sessao-renova`, a partir da `origin/main` `60b4b122` (16/11).

## Objetivo

O item 68 (`P-APP-SEM-RENOVACAO-DE-TOKEN`, ALTA; `D-PORTAO-ITEM-68-SESSAO-APP`): com o token de acesso vencido e o
de renovação válido, o app renova sozinho e a ação segue, sem "Sessão expirada"; teste no app e prova no emulador.
Fecha junto a `P-APP-401-FICA-SINCRONIZANDO`.

**No app:** toda chamada autenticada passa por uma porta só, que renova uma vez no app inteiro e repete o pedido uma
vez; só a recusa do servidor expira; renovação de outra época nunca mexe na sessão atual; o cache do bootstrap é da
sessão que o gravou; a fila de sincronização não trava; o "Sair" sem servidor espera numa fila mínima; a renovação
sem resposta é reenviada com o mesmo token e a prova de posse.

**No servidor:** o `/auth/logout` diz a verdade e revoga a sessão inteira com qualquer token dela (S1, S2); o
`/auth/refresh` devolve o mesmo sucessor ao antecessor imediato dentro da janela (60 s com prova, 10 s sem prova),
com o domínio da ordem `commit:`/`proof:` (S4, S5, S6) e a troca condicional; e derruba a sessão quando um token já
trocado volta fora disso (S3). Sem migração e sem `prisma/**`.

## O que cada devolução virou (o quadro do §0.1 da v3, com as emendas)

| devolução | achado | vira |
|---|---|---|
| crítica r1 | CRIT68-01 a 05 | época, trava e época carimbada no pedido; o dono do cache é a sessão; só a recusa do servidor expira; linhas literais e mutações; heads medidos |
| crítica r2 | CRIT68R2-01 a 03 | o servidor revoga a sessão inteira pelo "Sair" (S2); a recusa do bootstrap é na leitura; cada linha uma vez |
| conferência e21 | VER68E21-01, 02 | o servidor derruba a família (S2, S3); o `sessionNonce` entra na chave do cache |
| conferência e22 | VER68E22-01 a 03 | o "Sair" diz a verdade (S1); fila sem teto; uma trava para toda leitura e escrita da fila |
| conferência v3 | VER68V3-01 | S4: o antecessor imediato em até 60 s recebe o mesmo sucessor; troca condicional; D1b no app |
| conferência v3.1 | VER68V31CL-01 a 03 | S5 e D1c (compromisso e prova); janela exata em ms; a web dita como é |
| conferência v3.2 | VER68V32CL-01 a 04 | S6: o domínio da ordem no sucessor; borda com relógio controlado |
| conferência v3.3 | VER68V33CL-01 a 03 | o resíduo R-3c escrito e preso pelo SV20; linhas reproduzíveis; `P-68-PERDEDOR-RELE-401` (FS3c) |

## As respostas do dono (§10 da v3)

- **P1** (sem sinal, a sessão de 15 min vence: o técnico continua?) e **P2** (7 dias sem falar com o servidor): valem
  pela recomendação, (a) nas duas, até o dono dizer o contrário.
- **P3** (token antigo que volta derruba a sessão; rede fora de ordem desloga?): **respondida pelo dono**,
  `D-DONO-1511-68-NAO-DESLOGAR` — fica a v3.3: o técnico não é deslogado quando a rede entrega fora de ordem, e o
  resíduo R-3c fica aceito (até 60 s para usar a cópia do 1º envio; o acesso dela dura até expirar, ≤ 15 min).

Os textos das decisões e das pendências novas (`D-PORTAO-ITEM-68-SESSAO-APP`, `D-DONO-1511-68-NAO-DESLOGAR`,
`P-68-PERDEDOR-RELE-401`) e a linha do item 68 no `PLANO_SAN3.md` vão no PR de registro #585; este bloco os
referencia e não os duplica (medido na F0: 0 ocorrência na `main` `60b4b122`, e presentes no ramo do #585).

## Fatias (um commit cada)

F0 → F1 → FS1 → FS2a → FS2b → FS3 → FS2c → FS3b → FS3c → F2 → F2b → F3a → F3b → F3c → F4 → F5 → F6 → F7.

**Execução (16/11):** as 18 fatias feitas no PR #588, com a prova no emulador (§5.8) na pilha do 44-B3 (Emenda 3.6), por `dev-68-cl`, `dev-68-e1-cl` e `dev-68-e2-cl` (sucessores pelo
diário, P3), mais a linha de `SUITES` do `ci.yml` (`D-DONO-1611-SUITES-REGRA-FIXA`) e dois merges da `main`. A Emenda 3.5
ratifica as mudanças em `busers_seg_troca_senha_test.dart` e `b098_real_auth_bootstrap_test.dart` (nenhuma asserção
removida). Os commits de cada fatia estão no `agent-orchestration/codex/log-execucao.md` (16/11).

## PERMITIDO (só o quê, por arquivo)

- **Servidor:** `src/modules/auth/routes/auth.routes.ts` (o `POST /logout`; no `POST /refresh`, só a passagem do
  vínculo, o tipo do corpo, o `import` e `parseRenewalBinding`); `src/modules/auth/services/auth-session.service.ts`
  (`logout`, `refreshSession`, o construtor e as janelas, `RenewalBinding`, `ReplayCandidate`, `proofCommit`,
  `deriveSuccessor`, `successorReplay`, a linha S34M); `src/modules/auth/services/jwt.service.ts` (só `jti` e
  `issuedAt` do `signRefreshToken`); `src/modules/auth/repositories/auth-session.repository.ts` (só o
  `rotateRefreshToken`); `tests/auth-session.test.ts` (só a asserção do token anterior); `tests/app-sessao-renova-contrato.test.ts`
  e `tests/app-sessao-revogacao-db.test.ts` (novos); `.github/workflows/ci.yml` (só a linha da suíte na lista
  `SUITES`, **pendente de autorização** do dono para `.github/**` neste bloco); `API_CONTRACTS.md` (as linhas de
  `/auth/logout` e `/auth/refresh`); `docs/audit.md` (as razões `reuse_detected` e `retry_within_window`).
- **App:** os arquivos do §4 da v3 (porta, notifier, repositório, interceptador, armazenamento, modelos, bootstrap,
  sync, os sítios de cliente, inclusive o `location_consent_providers.dart` do #568, que já está na `main`), e os
  testes novos e os alterados declarados ali.
- **Registro:** este comando, `docs/mobile-flutter-app.md` (Auth), `agent-orchestration/controle/*` (pendências
  pelo gerador do índice), `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`.

## PROIBIDO

`prisma/**`, `migrations/**`, `frontend/**`, `infra/**`, `.env`, lockfiles, `pubspec.yaml`, `pubspec.lock`,
dependência nova, `Kpis/**` (congelado); o resto de `src/**`; `.github/workflows/**` salvo a linha de `SUITES`;
`core/sync/sync_user_scope.dart`, `sync_queue_repository.dart`, `sync_interrupted_reclaim.dart`,
`sync_action_factory.dart`, `sync_action_routing.dart`, o `currentSyncUserIdProvider`; `core/location/**` salvo o
sítio do cliente; `lib/shared/ui/**`, `features/auth/login_screen.dart`, `core/telemetry/telemetry_sync_service.dart`.

## Bateria (resumo; a lista exata é o §11 da v3 com as emendas)

Servidor: `npm run check`, `npm run lint`, a suíte de contrato sem banco, a suíte `-db` com banco descartável,
as 12 suítes de autenticação nas duas formas, `npm test`, `npm run build`. App: `flutter pub get`,
`dart format --output=none --set-exit-if-changed lib test`, `flutter analyze`, os testes do bloco, as regressões
declaradas, `flutter test`. Mutações: todas, uma por vez, com âncora 1 e restauro. Fechamento: `git diff --check`,
o diff vazio em `prisma`/`pubspec`/`frontend`, a guarda de caminho local, o gerador do índice sem diff residual e o
resumo TAP de cada job da CI.

## As linhas literais vigentes (contagem 1 no arquivo, na fatia indicada)

Consolidadas do §6.1 da v3 (sem a SA5), do §6.1 da v3.2 (sem as 7 aposentadas pela v3.4: SP9, SP10, SR3P, SP12,
SR7P, SR11P, SR12) e do §4.1 da v3.4. As fatias `FS2` da v3.2 são a `FS2a` da v3.3. A `S1` já existe na `main`.

**`mobile/flutter_app/lib/core/auth/auth_notifier.dart`**

```text
# N2 (F2)
    if (inFlight != null) return inFlight; // uma renovação por vez
# N3 (F2)
    if (failedAccessToken != null && current != failedAccessToken) { // outro pedido já renovou
# N11 (F2)
        await ref.read(authTokenStorageProvider).clearBootstrap(); // expirou: o cache morre com a sessão
# N12 (F2)
      return const SessionRenewalFailed(); // falha local: a sessão fica
# N13 (F2)
        return AuthState(status: AuthStatus.offlineCached, session: restored); // abrir sem rede: a sessão fica
# N4 (F3a)
    if (requestEpoch != _epoch) return Future.value(const SessionSuperseded()); // pedido de outra sessão nunca usa o token desta
# N5 (F3a)
      if (epoch != _epoch) return const SessionSuperseded(); // gravação: a época ainda vale?
# N6 (F3a)
    if (epoch != _epoch) return const SessionSuperseded(); // expirar só a própria época
# N7 (F3a)
    _bumpEpoch(); // ciclo: login
# N8 (F3a)
    _bumpEpoch(); // ciclo: logout
# N9 (F3a)
    _bumpEpoch(); // ciclo: troca de senha
# N21 (F3a)
      if (epoch != _epoch) return const SessionSuperseded(); // superada depois de gravar: quem mudou a época limpa
# N22 (F3a)
        return const SessionRenewalFailed(); // gravação falhou: a sessão em memória não muda
# V8 (F3c)
    unawaited(ref.read(pendingRevocationsProvider).drain()); // na abertura: esvazia a fila de revogação
# V9 (F3c)
      unawaited(ref.read(pendingRevocationsProvider).drain()); // renovou: o servidor responde, esvazia a fila
# V10 (F3c)
      await _revocations.revokeOrQueue(storedRefreshToken); // Sair: revoga ou fica na fila
# V12 (F3c)
      unawaited(ref.read(pendingRevocationsProvider).drain()); // entrou: o servidor responde, esvazia a fila
# N14 (F5)
  final key = ref.watch(sessionKeyProvider); // só a identidade, nunca o token
```

**`mobile/flutter_app/lib/core/auth/auth_repository.dart`**

```text
# L2 (F1)
      throw const SessionRenewalLocalError(); // 200 ilegível: falha local
# L3 (F1)
      await _client.post('/api/v1/auth/logout', data: {'refreshToken': refreshToken}); // Sair revoga
# L4 (F1)
  if (status == 401) return const ApiUnauthorizedError(kLoginRefusedMessage); // senha errada não é sessão expirada
# L5 (F1)
    if (refreshToken == null) throw const ApiSessionExpiredError(); // sem credencial: o 401 do servidor fica
# L6 (F1)
      final session = AuthSession(tokens: tokens, user: stored.user, sessionNonce: stored.sessionNonce); // o refresh mantém a sessão que renova
# K2 (F3b)
        sessionNonce: const Uuid().v4(), // cada login é uma sessão nova (remoto)
# K3 (F3b)
      sessionNonce: const Uuid().v4(), // cada login é uma sessão nova (local)
# V1 (F3c)
      return RevocationOutcome.revoked; // 2xx: o servidor garante que o token não renova mais
# V2 (F3c)
      if (e.response?.statusCode == 400) return RevocationOutcome.discard; // pedido sem token: tentar de novo não resolve
# RA1 (F2b)
  static const kRenewalRetryDelays = <Duration>[Duration(seconds: 1), Duration(seconds: 3)]; // reenvio do mesmo token
# RA2 (F2b)
  static const kRenewalRetryDeadline = Duration(seconds: 20); // nenhuma tentativa começa depois disto; a janela do servidor é 60 s
# RA3 (F2b)
  if (attempt >= delays.length || elapsed + delays[attempt] > deadline) return false; // o prazo cabe na janela do servidor
# RA4 (F2b)
  if (status != null) return status >= 500; // com resposta, só o 5xx se repete; a recusa (4xx) não
# RA5 (F2b)
  return e.type != DioExceptionType.cancel && e.type != DioExceptionType.badCertificate; // sem resposta, inclusive unknown: pode ter trocado no servidor
# RA6 (F2b)
        if (renewalCanRetry(e, attempt, clock.elapsed, _renewalRetryDelays, _renewalRetryDeadline)) { // o mesmo token: o servidor devolve o mesmo sucessor (S4)
# RB1 (F2b)
  ({String token, List<int> nonce, bool sent})? _renewalBinding; // a prova do reenvio: só em memória, nunca gravada
# RB2 (F2b)
    final binding = _renewalBinding?.token == refreshToken ? _renewalBinding! : (token: refreshToken, nonce: renewalNonce(), sent: false); // um nonce por token
# RB3 (F2b)
      final fields = renewalBindingFields(binding.nonce, firstSend: attempt == 0 && !binding.sent);
# RB4 (F2b)
      _renewalBinding = (token: refreshToken, nonce: binding.nonce, sent: true); // daqui em diante, só a prova
# RB5 (F2b)
  return List<int>.generate(32, (_) => random.nextInt(256)); // 32 bytes do gerador seguro
# RB6 (F2b)
    ? {'renewalCommit': base64Url.encode(sha256.convert(nonce).bytes).replaceAll('=', '')} // o 1º envio só compromete
# RB7 (F2b)
    : {'renewalProof': base64Url.encode(nonce).replaceAll('=', '')}; // o reenvio prova a posse
# RB8 (F2b)
        final response = await _client.post('/api/v1/auth/refresh', data: {'refreshToken': refreshToken, ...fields}); // o token e a prova
```

**`mobile/flutter_app/lib/core/auth/auth_token_storage.dart`**

```text
# K4 (F3b)
    if (session.sessionNonce != null) await _storage.write(key: _K.sessionNonce, value: session.sessionNonce); // a sessão guardada leva o identificador
# K5 (F3b)
      final sessionNonce = await _storage.read(key: _K.sessionNonce); // o identificador volta com a sessão
# V11 (F3c)
    await _storage.write(key: _K.pendingRevocations, value: jsonEncode(entries.map((e) => e.toJson()).toList())); // a fila sobrevive ao fechar o app
```

**`mobile/flutter_app/lib/core/auth/pending_revocations.dart`**

```text
# V3 (F3c)
    if (outcome == RevocationOutcome.retry) await _enqueue(token); // sem resposta definitiva: fica na fila
# V4 (F3c)
      if (outcome == RevocationOutcome.retry) continue; // só sai da fila com resposta definitiva
# V5 (F3c)
      await _lock.run(() => _removeFromCurrent(entry)); // tira só este item, da fila de agora
# V6 (F3c)
    await _lock.run(() => _append(entry)); // toda escrita da fila passa pela trava
# V7 (F3c)
      _memory.add(entry); // o armazenamento falhou: a fila fica na memória até fechar o app
```

**`mobile/flutter_app/lib/core/auth/session_renewal.dart`**

```text
# K1 (F3b)
String sessionKeyOf(AuthSession s) => '${s.user.sub}|${s.user.tenantId}|${s.sessionNonce ?? ''}'; // a chave é da sessão, não só da pessoa
```

**`mobile/flutter_app/lib/core/bootstrap/bootstrap_codec.dart`**

```text
# B7 (F3b)
    'ownerKey': s.ownerKey,
```

**`mobile/flutter_app/lib/core/bootstrap/bootstrap_repository.dart`**

```text
# B1 (F3b)
    if (owner != null) return owner == sessionKeyOf(session); // dono gravado: tem de ser esta sessão
# B3 (F3b)
      final bootstrap = bootstrapSessionFromJson(response.data as Map<String, dynamic>).withOwnerKey(sessionKeyOf(session)); // dono: fetch remoto
# B4 (F3b)
      final bootstrap = bootstrapSessionFromJson(response.data as Map<String, dynamic>).withOwnerKey(sessionKeyOf(session)); // dono: troca remota
# B5 (F3b)
    return result.withOwnerKey(sessionKeyOf(session)); // dono: troca local
# B6 (F3b)
    return result.withOwnerKey(sessionKeyOf(session)); // dono: fetch local
# B8 (F3b)
    return session.sessionNonce == null && cached.user.userId == session.user.sub && cached.activeTenant.tenantId == session.user.tenantId; // cache antigo, sem dono
```

**`mobile/flutter_app/lib/core/evidence/evidence_sync.dart`**

```text
# Q6 (F6)
    } on ApiSessionExpiredError { // sessão morta: lote de evidência
```

**`mobile/flutter_app/lib/core/network/auth_interceptor.dart`**

```text
# I1 (F2)
    if (err.requestOptions.extra['_authRetry'] == true) { // repetido: não renova de novo
# I2 (F2)
      case SessionUnreachable(): return handler.next(_semConexao(err)); // renovação sem resposta
```

**`mobile/flutter_app/lib/core/network/http_client.dart`**

```text
# H1 (F1)
      401 => const ApiSessionExpiredError(),
# H2 (F1)
      403 => const ApiForbiddenError(),
# H3 (F2)
  if (e.error is SessionRenewalLocalError) return const ApiServerError(statusCode: 0, safeMessage: kSessionCheckFailedMessage);
```

**`mobile/flutter_app/lib/core/sync/auto_sync_coordinator.dart`**

```text
# C1 (F6)
  bool _passStillValid(int epoch) => epoch == _currentEpoch(); // a passada é da sessão que a começou
# C2 (F6)
      if (_sessionDiedThisRun && next == AuthStatus.authenticated) _triggerAfterRelogin(); // novo login depois de sessão morta
```

**`mobile/flutter_app/lib/core/sync/inventory_sync_replay_service.dart`**

```text
# Q5 (F6)
    } on ApiSessionExpiredError { // sessão morta: lote de estoque
```

**`mobile/flutter_app/lib/core/sync/sync_replay_service.dart`**

```text
# Q2 (F6)
    } on ApiSessionExpiredError { // sessão morta: lote de despesa
# Q3 (F6)
    } on ApiSessionExpiredError { // sessão morta: lote de OS
# Q4 (F6)
    } on ApiSessionExpiredError { // sessão morta: lote de checklist
```

**`mobile/flutter_app/lib/core/sync/sync_session_expired.dart`**

```text
# Q1 (F6)
      retryCount: action.retryCount, // sessão morta: a tentativa não conta
```

**`mobile/flutter_app/lib/features/work_orders/data/work_order_repository.dart`**

```text
# W1 (F4)
  return DioWorkOrderRemoteApi(sessionHttpClient(ref, config));
```

**`mobile/flutter_app/test/fixtures/auth_refresh_resposta.json`**

```text
# X1 (F1)
    "sessionId": "s-contrato"
```

**`src/modules/auth/repositories/auth-session.repository.ts`**

```text
# SR17 (FS2)
        refresh_token_hash: expectedHash, // troca condicional: só o vigente
# SR18 (FS2)
  rotateRefreshToken(sessionId: string, tenantId: string, expectedHash: string, refreshTokenHash: string, expiresAt: Date) {
```

**`src/modules/auth/routes/auth.routes.ts`**

```text
# S1 (main)
          sessionId: refreshResult.sessionId,
# SA1 (FS1)
    if (!refreshToken) { // sem token não há o que revogar
# SA2 (FS1)
      response.status(503).json({ // a falha interna não vira 200
# SP1 (FS2b)
import type { AuthSessionService, RenewalBinding } from "../services/auth-session.service.js";
# SP2 (FS2b)
  readonly renewalCommit?: unknown;
# SP3 (FS2b)
  readonly renewalProof?: unknown;
# SP4 (FS2b)
      const refreshResult = await (await resolveSessionService()).refreshSession(refreshToken, parseRenewalBinding(request.body)); // a prova do reenvio, se veio
# SP5 (FS2b)
  const valid = (value: unknown) => (typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined); // 32 bytes em base64url; o resto é ignorado
# SP6 (FS2b)
  return { commit: valid(input.renewalCommit), proof: valid(input.renewalProof) };
```

**`src/modules/auth/services/auth-session.service.ts`**

```text
# SA3 (FS1)
          ? await repository.revokeByIdForTenant(payload.session_id, payload.tenant_id) // a sessão inteira, mesmo com o token já trocado
# SA6 (FS2)
        await repository.revokeByIdForTenant(session.id, payload.tenant_id); // reuso detectado
# SA7 (FS2)
          metadata: { reason: "reuse_detected" },
# SR0P (FS2)
export const REFRESH_REPLAY_WINDOW_SECONDS = 60; // o reenvio com prova de posse: a resposta que se perdeu
# SC0 (FS2)
export const REFRESH_RACE_WINDOW_SECONDS = 10; // o reenvio sem prova: só a corrida de renovações em voo
# SR1P (FS2)
import { createHash, createHmac, hkdfSync, randomUUID, timingSafeEqual } from "node:crypto";
# SR2P (FS2)
    private readonly options: AuthSessionServiceOptions = {}, // as janelas, para os testes
# SP7 (FS2)
export type RenewalBinding = { readonly commit?: string; readonly proof?: string };
# SP8 (FS2)
  async refreshSession(refreshToken: string, binding: RenewalBinding = {}): Promise<RefreshSessionResult> {
# SR15 (FS2)
      if (!session || (!replay && (session.user_id !== payload.user_id || !safeEqual(session.refresh_token_hash, refreshTokenHash)))) {
# SR16 (FS2)
        nextRefreshToken = replay.token; // o MESMO sucessor; nada troca
# SP11 (FS2)
        const rotatedAtMs = Date.now();
# SR5P (FS2)
        refreshTokenExpiresAt = new Date(rotatedAtMs + refreshTokenExpiresIn * 1000); // o instante da troca, em ms, fica recuperável
# SR6P (FS2)
        nextRefreshToken = await deriveSuccessor(payload, refreshToken, rotationBinding, Math.floor(rotatedAtMs / 1000)); // o sucessor é refeito, nunca guardado
# SR4 (FS2)
        updated = await repository.rotateRefreshToken(payload.session_id, payload.tenant_id, refreshTokenHash, hashRefreshToken(nextRefreshToken), refreshTokenExpiresAt); // troca condicional
# SR8 (FS2)
          ...(replay ? { reason: "retry_within_window" } : {}),
# SR9 (FS2)
const successorKey = hkdfSync("sha256", env.JWT_REFRESH_SECRET, "", "erp-refresh-sucessor-v1", 32); // chave só para o sucessor
# SP13 (FS2)
export function proofCommit(proof: string): string {
# SP14 (FS2)
  return createHash("sha256").update(Buffer.from(proof, "base64url")).digest("base64url"); // o compromisso que a prova abre
# SR10P (FS2)
  const jti = createHmac("sha256", Buffer.from(successorKey)).update(presentedToken + "\n" + binding).digest("hex"); // o jti do sucessor, preso à prova
# SR13 (FS2)
  if (!row || row.user_id !== payload.user_id || row.revoked_at || safeEqual(row.refresh_token_hash, presentedHash)) return null; // só o antecessor, numa sessão viva do mesmo usuário
# SR14P (FS2)
  const rotatedAtMs = row.expires_at.getTime() - getRefreshTokenExpiresInSeconds() * 1000; // o instante da última troca, em ms
# SA5R (FS3)
      if (!replay && session && session.user_id === payload.user_id && !session.revoked_at && !safeEqual(session.refresh_token_hash, refreshTokenHash)) { // reuso: derruba a família
# S34A (FS2a)
      const openedCommit = binding.proof ? proofCommit(binding.proof) : ""; // só a prova abre o reenvio longo
# S34B (FS2a)
      const longWindow = this.options.replayWindowSeconds ?? REFRESH_REPLAY_WINDOW_SECONDS;
# S34C (FS2a)
      const shortWindow = this.options.raceWindowSeconds ?? REFRESH_RACE_WINDOW_SECONDS;
# S34D (FS2a)
      const candidates: ReplayCandidate[] = [];
# S33B (FS2a)
      if (openedCommit) candidates.push({ binding: `commit:${openedCommit}`, windowSeconds: longWindow }); // S33B
# S33C (FS2a)
      if (openedCommit) candidates.push({ binding: `proof:${openedCommit}`, windowSeconds: longWindow }); // S33C
# S33D (FS2a)
      if (!openedCommit && binding.commit) candidates.push({ binding: `proof:${binding.commit}`, windowSeconds: longWindow }); // S33D
# S33E (FS2a)
      if (!openedCommit) candidates.push({ binding: "", windowSeconds: shortWindow }); // S33E
# S34E (FS2a)
      let replay = await successorReplay(session, payload, refreshToken, refreshTokenHash, candidates); // o antecessor imediato, dentro da janela do candidato
# S33A (FS2a)
        const rotationBinding = binding.commit ? `commit:${binding.commit}` : openedCommit ? `proof:${openedCommit}` : ""; // S33A: qual envio trocou primeiro
# S34F (FS2a)
          replay = await successorReplay(current, payload, refreshToken, refreshTokenHash, candidates); // outra renovação trocou primeiro: o mesmo sucessor
# S34G (FS2a)
type ReplayCandidate = { readonly binding: string; readonly windowSeconds: number };
# S34H (FS2a)
  candidates: readonly ReplayCandidate[],
# S34I (FS2a)
  for (const item of candidates) {
# S33F (FS2a)
    if (Date.now() - rotatedAtMs > item.windowSeconds * 1000) continue; // S33F: borda exata por candidato
# S34J (FS2a)
    const candidate = await deriveSuccessor(payload, presentedToken, item.binding, Math.floor(rotatedAtMs / 1000));
# S34K (FS2a)
    if (safeEqual(row.refresh_token_hash, hashRefreshToken(candidate))) return { token: candidate, expiresAt: row.expires_at }; // o sucessor ainda não foi usado
# S34L (FS2a)
  return null; // nenhum candidato: reuso
```

**`src/modules/auth/services/jwt.service.ts`**

```text
# SR19 (FS2)
  readonly jti?: string; // o sucessor do token tem jti derivado
# SR20 (FS2)
  readonly issuedAt?: number; // e o instante da troca
# SR21 (FS2)
  const issuedAt = options.issuedAt ?? Math.floor(Date.now() / 1000);
# SR22 (FS2)
    .setJti(options.jti ?? randomUUID())
```

**`tests/auth-session.test.ts`**

```text
# AS1P (FS2)
      assert.equal(oldRefresh.status, 200); // o antecessor imediato, sem prova, dentro da corrida: o mesmo sucessor (S4)
# AS2 (FS2)
      assert.equal(oldRefresh.body.data.refresh_token, refresh.body.data.refresh_token);
```
