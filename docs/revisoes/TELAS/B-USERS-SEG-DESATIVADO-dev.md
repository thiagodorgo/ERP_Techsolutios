# B-USERS-SEG-DESATIVADO — diário do dev

> **Identidade:** `dev-users-desat-cl`, identidade de dev DECLARADA: Claude Opus 5.5 (subagente da sessão), nível menor.
> Exceção declarada (§C7 itens 6 e 11(6)): o Codex 1 está sem cota semanal até 16/11, o Codex 2 ocupa uma cadeira de
> junta e a API está no limite do dia até 21:00. A pré-revisão e a conferência ficam com outro modelo. Não escrevi o
> plano nem o critiquei.
> **Plano:** `erp-pausa-2026-10-03/planos/B-USERS-SEG-DESATIVADO-plano.md`, com a Emenda 1 (A1 a A13), que prevalece.
> **Respostas do dono seguidas (ainda abertas):** P1 = (a), P2 = (a). O PR nasce em rascunho.
> **Terreno:** worktree `C:/Users/thiag/w-desat`, ramo `fix/users-seg-desativado`, base `origin/main` =
> `a0979f513b1554f776b1eab1cbeae43ecffd9dd2` (#530). `npm ci` próprio (sem junction) e `prisma generate`.
> Postgres 16 `devdesat-pg` em 127.0.0.1:55497 (bancos `devdesat`, migrado sem seed, para E-mem; `devdesat_seed`,
> migrado com seed, para E-pg). Redis 7 `devdesat-redis` em 127.0.0.1:56497. Portas conferidas livres antes de subir.
> Toda hora vem de `date` (relógio local, SP).

---

## F0 — testes primeiro (iniciada 07:16 SP)

### Censo da base de novo (E1.1-1, HIPÓTESE 444/74)

- Comando: `./node_modules/.bin/tsx <censo>/censo-desativado.mts base-sonda1.tsv` e `censo-desativado-fake.mts
  base-sonda2.tsv`, cwd `w-desat` em `a0979f51`, 07:23–07:25 SP. md5 `4fe27440dd6c9fca622fbf99cbbbfdbf` (sonda 1) e
  `e46d0ed3cf05796a97c06bf1d93ec08f` (sonda 2), no scratchpad (`devdesat/censo/`).
- **FATO:** universo = **444 rotas e 73 camadas** com caminho, 0 sem caminho. A HIPÓTESE da emenda (444/74) acertou as
  rotas e errou as camadas: a rota nova do #530 (`POST /api/v1/webhooks/billing/:provider`) não trouxe camada nova.
  Piso do T9-db: 444 rotas e 73 camadas.
- Sonda 1: 372 rotas e 72 camadas passam pelo RBAC persistente (a rota do webhook dá `500 AUTHORIZATION_CONTEXT_ERROR`,
  porque com o canal desligado ela segue para as montagens seguintes). Sonda 2: 364 rotas e 7 camadas dão
  `403 role_required`; o webhook dá `404 route_not_found` (passou por 56 resoluções do RBAC).
- **As 4 rotas de `/attachments` (HIPÓTESE da 1.2):** com o corpo da sonda, `GET` 422 `entity_type_required`, `POST`
  400 `multipart_required`, `GET …/download` e `DELETE` 404 `attachment_not_found`. **LEITURA:** a permissão é
  conferida no serviço depois de resolver a entidade (`attachment.service.ts:36`, `:56`, `:162`, `:175-177`), então
  com corpo e entidade válidos o conjunto vazio de permissões do desativado dá `403 ATTACHMENT_FORBIDDEN`. Não medi com
  entidade real (exigiria anexo no banco); com o portão, as 4 caem no 401 antes (o T9-db cobre).

### Testes escritos (sem `src/`) e o vermelho-controle NA BASE (`a0979f51`, estágio declarado: base)

Comando por arquivo: `node --test --test-reporter=tap --import tsx <arquivo>`; os `-db` com
`DATABASE_URL=postgresql://postgres:dev@127.0.0.1:55497/devdesat` (migrado, sem seed), os de memória com
`CORE_SAAS_PERSISTENCE=memory` e sem `DATABASE_URL`. TAPs em `scratchpad/devdesat/f0/`. 07:30–07:58 SP.

| Teste | Arquivo | Na base | Forma do vermelho |
|---|---|---|---|
| PT·0 | `users-seg-desativado-portao-db` | ok | (atributos do papel; não é teste do portão) |
| T1 | idem | not ok | `200 !== 401`; **1 OS no banco** criada pelo desativado (FATO: o C2CL-02 reproduzido, `accepted` pela API) |
| T1b | idem | not ok | `/me/tenants` `200 !== 401` |
| T2 | idem | not ok | `super_admin: 200 !== 401` (o 1º papel do catálogo; o laço para nele) |
| T3 | idem | not ok | token de B em `/me/tenants` `200 !== 401` (HIPÓTESE da 1.2 confirmada: o par de B segue com acesso) |
| T4 | idem | not ok | `/mobile/bootstrap` `200 !== 401` depois do reset |
| T5, T5b, T6, T6b, T7, T8, T11, T12 | idem | not ok | `200 !== 401` (a sessão encerrada segue aceita) |
| T19 (a) | idem | not ok | `200 !== 401` |
| T19 (b) | idem | **ok** | controle: verde nas duas pontas (o esperado da E1.7) |
| T9-db | `users-seg-desativado-varredura-db` | not ok | `rotas=444 mwComCaminho=73 fora=511` (todas as 438 rotas que leem o token e as 73 camadas aceitam o desativado de algum jeito; 4 min, porque cada uma atravessa até 56 resoluções do RBAC) |
| T9-mem | `users-seg-desativado-varredura` | not ok | `ERR_MODULE_NOT_FOUND` (`session-liveness.service.js` não existe) |
| T10a, c, d | `users-seg-desativado-emissao-db` | not ok | `sid` ausente ≠ `session_id` |
| T10b | idem | not ok | idem, depois do ajuste de fixture abaixo (antes dele: `login 401`, a forma ERRADA) |
| T13, T14, T15b | `users-seg-desativado-portao` | not ok | `ERR_MODULE_NOT_FOUND` |
| T15 | idem | not ok | `sid 123: 200 !== 401` |
| T13b | `users-seg-desativado-orcamento-db` | not ok | `200` em 271 ms (`503` esperado) |
| T16 | `users-seg-desativado-sse-db` | not ok | o stream segue aberto 32,0 s depois da desativação, só com `event: ready` |
| T16b-1 a 6 | `users-seg-desativado-sse` | not ok | `ERR_MODULE_NOT_FOUND` |
| T17 | `users-acesso-seg-portao-estatico` | not ok | `(d')` a lista fechada de imports do portão (a 1ª asserção; o G2 antigo segue `ok`) |
| S4·c | `users-acesso-seg-desativacao-db` | not ok | `expected 401, actual 403` (o inverso do que a crítica mediu, como a E1.6 prevê); S4·0, S4·a, S4·b e A3 `ok` com o modo forçado |

**Desvios e achados de fixture desta fatia (declarados):**
1. **T10b — o login sem organização não roda sob o papel efêmero.** A função elevada `auth_login_candidates` sai da
   migração sem nenhum privilégio de execução (`20260868000000_add_auth_identities/migration.sql:257`); a ativação é ato
   humano do runbook. Sob o papel efêmero o login anônimo responde `401` (medido). Conceder o privilégio no teste
   escreveria catálogo (o `db-catalog-write-guard` é lexical e vetaria o arquivo novo). Ajuste: o arnês ganhou a opção
   `candidatosPeloAdministrador`, que SÓ a `-emissao-db` usa: a listagem de candidatos atravessa a função pela conexão
   do administrador; a verificação da credencial, a criação da sessão e a assinatura seguem no papel efêmero. O que o
   T10b prova (a assinatura do caminho sem organização leva o `sid`) não depende do privilégio da função.
2. **Helper novo** `tests/helpers/users-seg-desativado-sessao.ts` (PERMITIDO: "um helper novo em `tests/helpers/` para
   sessão real"): monta o app real com o Prisma global no papel efêmero, cria organização, usuário, administrador e
   papéis globais que faltarem (sem seed), e desmonta escopado aos ids da fixture.
3. **S4·c: os asserts do modo e do A9 ficam ANTES do `app.listen`**, não depois. Medido: com eles entre o `listen` e o
   `getBaseUrl`, o evento `listening` já tinha passado e o teste travava até o `timeout` (ec 124). Continuam antes da
   primeira requisição, como a E1.6 item 3 pede.
4. **`users-seg-desativado-portao.test.ts`:** o `import()` da conferência vem ANTES de montar o servidor. Na base, com
   o módulo ausente, o servidor montado antes ficava aberto e o processo não saía (ec 124, medido).
5. **Orquestrador, 07:45 SP:** a `P-ORG-SUSPENSA-NAO-CORTA-ACESSO` (A8) já nasce no PR de registro #538. Na F4 eu só a
   referencio (e apenso nota, se couber), sem criar outra com o mesmo ID, e atualizo o ramo com a `main` antes do PR.

**Contagem:** 12 arquivos de teste tocados (9 novos, contando o helper; 3 estendidos). Testes novos da P-SESSAO-VIVA:
16 (`portao-db`, PT·0 incluso) + 1 (`varredura-db`) + 1 (`varredura`) + 4 (`emissao-db`) + 4 (`portao`) + 1
(`orcamento-db`) + 1 (`sse-db`) + 6 (`sse`) + 1 (T17) = **35**, mais o S4·c reescrito. Meta do plano: ≥ 10.

## F1 — claim `sid` e os 3 assinadores (07:58–08:01 SP)

- `auth.types.ts`: `SignAccessTokenInput.session_id?`, `AuthenticatedTokenPayload.sid?`, `AuthenticatedActor.sessionId?`.
- `jwt.service.ts`: `signAccessToken` emite `sid` quando recebe `session_id`; `parseAccessTokenPayload` aceita `sid`
  ausente ou UUID e LANÇA (`Invalid access token session.`) para qualquer outro valor; o resultado só leva `sid` se for
  UUID (a mutação do T15, "tratar sid não-UUID como ausente", é apagar a linha do `throw`).
- `auth.routes.ts`: login e troca de organização criam a sessão ANTES do token (`loginSession`,
  `tenantSwitchSession`) e assinam com `session_id: loginSession.sessionId,` / `session_id: tenantSwitchSession.sessionId,`.
- `auth-session.service.ts` (refresh): `const refreshedSessionId = payload.session_id;` e `session_id: refreshedSessionId,`.
- **Desvio de forma, declarado:** o corpo da resposta do login e da troca também tinha `session_id: <sessão>.sessionId,`,
  o que deixaria a âncora da M9 com 2 ocorrências. O corpo passou a ler de uma constante (`const { sessionId:
  loginSessionId } = loginSession;`, idem `tenantSwitchSessionId`), com o mesmo valor. Medido: `grep -c -F` das três
  âncoras da M9 = 1, 1 e 1 (`auth.routes.ts` ×2, `auth-session.service.ts`).
- `npx tsc --noEmit`: verde.
- **Verdes ao fim (TAP, `scratchpad/devdesat/f1/`):** `users-seg-desativado-emissao-db` 4/4 (T10a–d), `# fail 0`;
  `users-seg-desativado-portao` T15 `ok` (os outros do arquivo dependem da F2).

## F2 — o portão confere a sessão (08:01–08:03 SP)

- **`src/modules/auth/services/session-liveness.service.ts` (novo):** `export const sessionLiveness = { check }`.
  Primeira instrução: `if (env.CORE_SAAS_PERSISTENCE !== "prisma") {` → `"skipped"` (A10). Depois o formato UUID
  (`UUID_PATTERN`) de `userId`, `tenantId` e `sessionId` → `"inactive"` sem consultar. `prisma.js` e `rls.js` só por
  `import()` dentro de `check`. Uma transação `withTenantRlsBudget` sob o GUC da organização do token, com o orçamento
  literal da E1.4 (`SESSION_LIVENESS_BUDGET`, uma linha). Com `sid`: o `$queryRaw` da E1.3, literal (`WHERE
  s.tenant_id …`, `AND s.id …`, `AND s.user_id …`, `AND s.revoked_at IS NULL`, `AND s.expires_at > now()`, `AND
  u.status = 'active'`, `LIMIT 1`). Sem `sid`: `tx.user.findFirst({ where: { id, tenant_id, status: "active" } })`.
- **Portão (`authenticated-actor.middleware.ts`):** memo `livenessByRequest` (WeakMap por requisição, com a linha
  literal `const cached = livenessByRequest.get(request);`), conferência logo depois de `verifyAccessToken` e ANTES do
  escopo restrito; `if (verdict === "inactive") {` → `sendSessionInactive` (401 `INVALID_TOKEN`/`session_inactive`,
  mensagem fixa de hoje), sem `next()` e sem `request.actor`; falha da conferência → `sendSessionCheckUnavailable(response);`
  (503 `SERVICE_UNAVAILABLE`/`session_check_unavailable`). O ator ganha `sessionId` quando o token traz `sid`.
- **Âncoras das mutações, `grep -c -F` = 1 cada (medido 08:02):** M1 a M4, M10, M11, M16, M17 no serviço; M5, M6, M8 no
  portão.
- **Verdes ao fim (TAP, `scratchpad/devdesat/f2/`, memória):** `users-seg-desativado-portao` 4/4 (T13, T14, T15, T15b);
  `users-seg-desativado-varredura` 1/1 (T9-mem); `users-acesso-seg-portao-estatico` 2/2 (G2 e T17); regressão
  `users-acesso-seg-portao-varredura` (G1 do #527) 1/1.
- **Vermelho-controle do T16b no estágio "cabeça da F2"** (o serviço existe e o tique ainda não confere): os 6 casos
  `not ok`. 16b-1 `expected 1, actual 0` chamadas; 16b-2 e 16b-5 "a leitura termina (done)" `false`; 16b-3 `expected 3,
  actual 0`; 16b-4 e 16b-6 `expected 1, actual 0`. A E1.2 previa 16b-1, 16b-2 e 16b-5; os outros três também ficam
  vermelhos, porque contam chamadas.

## F3 — provas `-db`, P2 = (a) e a fixture do san3-05 (08:03–08:11 SP)

- **P2 = (a), A6 (`prisma-core-saas.store.ts`, só o Step 1b e `hasSameRoleKeys`):** logo antes do `const revokedSessions =`,
  `const rolesChanged = input.roles !== undefined && !hasSameRoleKeys(currentRoles, input.roles);`, e a condição passa a
  `input.status === "inactive" || rolesChanged`. `hasSameRoleKeys(current, next)` no nível do módulo compara os
  conjuntos sem ordem e sem repetição. Âncoras M18 e M19: `grep -c -F` = 1 e 1. Consequência declarada: a auditoria
  `user.updated` passa a levar `revoked_sessions` também na troca de papéis (o campo já existia; antes só na desativação).
- **Fixture do `san3-05-leituras-de-plataforma-db` (regra dos 5: 1 arquivo):** antes do `signAccessToken` da plataforma,
  `admin.user.create(...)` do ator de plataforma (a forma da E1.6) e `user_id: atorPlataforma.id,`. **Desvio declarado:**
  a E1.6 não previa a remoção, e sem ela o teardown do arquivo falhou (medido: `admin.tenant.deleteMany` →
  `users_tenant_id_fkey`). Entrou uma linha no `finally`, antes do `limpar`: `admin.user.deleteMany` do ator, pelo
  e-mail da fixture. A HIPÓTESE da E1.6 (o token nasce uma vez só, fora do laço por papel) se confirmou: sem colisão de
  e-mail.
- **Verdes (TAP, `scratchpad/devdesat/f3/`, banco `devdesat` sem seed, cada suíte força e confere `prisma`):**
  `users-seg-desativado-portao-db` 16/16 · `-varredura-db` 1/1 (`fora=0`) · `-orcamento-db` 1/1 · `-emissao-db` 4/4 ·
  `users-acesso-seg-desativacao-db` 5/5 (S4·c `401 session_inactive`) · `users-acesso-seg-troca-senha-db` 4/4 ·
  `san3-05-leituras-de-plataforma-db` 12/12 (antes da fixture: 11/12, `401 session_inactive`, a forma que a crítica mediu).
- **Resíduo no banco descartável:** as execuções da F0 mortas pelo `timeout` (S4·c e o `portao` em memória) e o teardown
  falho do san3-05 deixaram 7 organizações e 4 papéis efêmeros no `devdesat`. É o meu banco; antes da F5 eu recrio os
  dois bancos do zero, para a bateria medir num banco limpo.

## F3b — o tique do stream do mapa (08:07–08:11 SP)

- `field-ops-realtime.routes.ts`: a forma literal da E1.2 (constante `SSE_LIVENESS_MAX_FAILURES = 2`, `livenessInFlight`,
  `livenessFailures`, `runLivenessTick` com o `await` dentro do `try`, a trava de sobreposição no tique) e a função
  `endSseStream` (evento com corpo `{}` pelo `writeSseEvent` e `response.end()`). Imports: `sessionLiveness` e o tipo
  `AuthenticatedActor` de `auth.types.ts`.
- Âncoras, `grep -c -F` = 1: `} catch {` (M12), `if (!actor || livenessInFlight || response.writableEnded) {` (M13),
  `const SSE_LIVENESS_MAX_FAILURES = 2;` (M14); `grep -cE '^\s+livenessFailures = 0;$'` = 1 (M15).
- **Verdes (TAP, `scratchpad/devdesat/f3b/`):** `users-seg-desativado-sse` 6/6 (T16b-1 a 6, memória) · regressão
  `field-ops-realtime` 4/4 · `users-seg-desativado-sse-db` 1/1 (T16, relógio real: o stream fechou com
  `event: session_inactive` e 0 assinantes; a suíte levou 38 s).

## F4 — contrato, registro e ratchet (08:12–08:21 SP)

- **Merge da `main` (`7f47aca6`):** o #538 entrou às 08:05 SP. Atualizei o ramo ANTES de mexer nos registros, como o
  orquestrador pediu (sem conflito: o #538 só toca `agent-orchestration/`).
- **T18 (`san3-05-acessos-de-plataforma-guard`, só o CONGELADO):** o gerador na cabeça da F3b acusou 3 chaves novas,
  todas de `session-liveness.service.ts` (`auth_sessions` e `users` pelo `$queryRaw`, e `user.findFirst` da via sem
  `sid`), todas `PARAMETRO(tx de callback de withTenantRlsBudget)`. Coladas em `NOVAS` com uma linha de motivo cada.
  Saída do gerador: `scratchpad/devdesat/f4/gerador-cabeca.txt` (142 linhas, `stderr` vazio). TAP: 35/35.
- **`API_CONTRACTS.md`:** nota nova da P-SESSAO-VIVA (401 `session_inactive`, 503 `session_check_unavailable`, o stream,
  os residuais 1 a 6 da 2.5 e a referência à `P-ORG-SUSPENSA-NAO-CORTA-ACESSO`); a nota antiga do desativado fica como
  histórico, marcada SUPERADA; o residual do token anterior à marca, riscado com o motivo.
  **Leitura do dev, declarada (§A6):** o PERMITIDO diz "as notas de `:200-218` … e a frase da revogação de sessão". Li
  "a frase da revogação de sessão" como as frases que a P-SESSAO-VIVA torna falsas no MESMO arquivo: a linha de
  `POST /sessions/:id/revoke` (`:235`), a "Janela do I3" do `DELETE /auth/identity-links/:id` (`:197`) e o parêntese do
  `POST /auth/password` (`:198`), que diziam que o access token sobrevive. Mudei as três (riscado + texto novo). Se o
  orquestrador ler mais estreito, as duas da tabela (`:197`, `:198`) voltam numa linha cada.
- **`RBAC_MATRIX.md`:** só a frase do "Caveat honesto" da linha 128 (riscada + texto novo, citando a P1 = (a) seguida e
  a resposta do dono pendente).
- **`pendencias.md`:** fechadas, com teste-dono, "vale no merge": `P-USERS-DESATIVADO-TOKEN-MOBILE` (e o complemento) e
  `P-USERS-SEG-TOKEN-ANTERIOR-A-TROCA`. Novas: `P-RBAC-PERSISTENTE-LEITURA-POR-MONTAGEM`, `P-SESSOES-TEXTO-15MIN`,
  `P-SSE-SEGUE-APOS-VENCER-TOKEN`, `P-SID-OBRIGATORIO`, `P-CI-LISTA-CURADA-USERS-SEG-DB`. A
  `P-ORG-SUSPENSA-NAO-CORTA-ACESSO` NÃO foi criada (nasceu no #538): ganhou uma nota apensa. A
  `P-USERS-REBAIXAMENTO-TOKEN-JWT` não nasce (P2 = (a)). Índice regenerado pelo `gerar-indice-pendencias.py`: 861
  cabeçalhos, 850 IDs, ABERTAS 656 → 659 (+5 −2), 0 contraditórias, as duas fechadas no balde FECHADAS.
- **`decisoes.md`: NÃO tocado.** O PERMITIDO só admite "a entrada com as respostas do dono à P1 e à P2", e o dono ainda
  não respondeu. O orquestrador escreve a entrada quando ele responder.
