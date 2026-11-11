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

## F4 — contrato, registro e ratchet (08:12–08:17 SP)

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

## F5 — bateria, mutações e custo (iniciada 08:17 SP)

- **Bancos recriados do zero (08:19 SP):** `DROP DATABASE`/`CREATE DATABASE` de `devdesat` e `devdesat_seed` no MEU
  container, `prisma migrate deploy` nos dois e `npm run db:seed` só no `devdesat_seed`; os 4 papéis efêmeros
  deixados pelas execuções mortas da F0 removidos pelo nome (`o6r_b01_*`, 0 restantes).
- **Worktree da base para o E-pg:** `C:/Users/thiag/w-desat-base`, destacado na merge-base `2f8a9a5e` (o #538;
  `git diff --quiet a0979f51 2f8a9a5e -- src tests` → iguais), com `npm ci` e `prisma generate` próprios. Apago no fim.
- `node scripts/migration-transaction-guard.mjs`: `migrações: 131 · violações: 0`, ec 0.
- Escopo: `git diff --name-only $(git merge-base origin/main HEAD)..HEAD` = 27 arquivos, todos no PERMITIDO (com a
  leitura declarada do `API_CONTRACTS.md` na F4); `decisoes.md`, `prisma/**`, `.github/**`, `frontend/**`,
  `src/app.ts`, `src/modules/mobile/**`, `src/modules/platform/**`, `Kpis/*`: intocados.

### E-mem (forma do job `backend`), cabeça `d20ee9cd`, 08:20–08:40 SP

Banco `devdesat` (migrado, sem seed), `REDIS_URL` 56497, `CORE_SAAS_PERSISTENCE=memory` exportado. Logs em
`scratchpad/devdesat/f5/emem-*.log`.
- `npm run check` ec 0 · `npm run lint` ec 0 · `npm run build` ec 0.
- `npm test`: **494 arquivos · 5064 testes · pass 5048 · fail 14 · skipped 2** (ec 1), mais o aviso do piso de
  denominador para `tests/traccar-event-migration-drill-db.test.ts` (o arquivo caiu por `EBUSY … rmdir` do temporário).
  Os 14 `not ok`, em 8 arquivos, classificados por reexecução ISOLADA na cabeça e na base (`w-desat-base`, merge-base
  `2f8a9a5e`), mesma forma de ambiente (`scratchpad/devdesat/f5/emem-reexec-{cabeca,base}/`):

| Arquivo | No `npm test` | Isolado, cabeça | Isolado, base | Classe |
|---|---|---|---|---|
| `ass-03-metering-db` | T-MED-db-14 `57014 statement timeout` | 9/9 | 9/9 | carga (paralelismo da suíte) |
| `ass-04-statement-db` | T-ST-db-1 "Unable to start a transaction" | 9/9 | 9/9 | carga |
| `ass-08-channel-db` | T-OBX-db-9 "2219 ms (teto 2 000)" | 21/21 | 21/21 | carga |
| `cheque-title-link-migration-drill-db` | T-D(f) | 6/6 | 6/6 | carga |
| `traccar-position-ingestion-db` | 2× "tempo esgotado → 503" | 22/22 | 22/22 | carga |
| `san3-05-runtime-role-guard-db` | T14a/b, T14c, T14d, T15 | 8 pass, 4 fail | 8 pass, 4 fail (iguais) | ambiente: `setsid: ausente` (Windows) |
| `san3-09-bootstrap-platform-admin-db` | T2 | 0/2 | 0/2 (igual) | ambiente (a crítica mediu o mesmo) |
| `traccar-event-migration-drill-db` | `EBUSY rmdir` do temporário | 6 pass + o `EBUSY` | 6/6 | ambiente Windows (trava de diretório temporário); reexecutar no fim |

  Nenhum dos 8 arquivos passa pelo portão HTTP do bloco, salvo a ingestão do Traccar, que tem listener próprio. **Nome
  em `not ok` na cabeça que não esteja na base, isolado: nenhum.** O critério "0 `not ok`" do E-mem não se cumpre NESTA
  máquina; a prova vai para o job `backend` da CI, lido pelo resumo TAP depois do push (§C7 item 11(3)).

### Mutações e drills (cabeça, 08:47–09:30 SP)

Uma por vez, aplicada pelo texto literal (âncora `count == 1` antes), medida e revertida para os bytes originais (md5
conferido a cada uma; `git status --porcelain -- src tests` limpo no fim). Ferramenta e TAPs:
`scratchpad/devdesat/tools/mutar.py`, `scratchpad/devdesat/f5/mut/` e `f5/mut2/`.

| Mutação | Âncora | Vermelho (not ok) |
|---|---|---|
| M1 (sem `AND s.revoked_at IS NULL`) | 1 | `portao-db`: T3, T4, T5, T5b, T6, T6b, T7, T19(a) (8) |
| M2 (sem `AND u.status = 'active'`) | 1 | T1b |
| M3 (sem `AND s.expires_at > now()`) | 1 | T8 |
| M4 (sem `AND s.user_id = …`) | 1 | T11 |
| M5 (`&& false`) | 1 | `portao-db` 14 de 16 (só PT·0 e T19(b) verdes); T9-db (`fora=511`); T9-mem; S4·c |
| M6 (`const cached = undefined;`) | 1 | T14 |
| M8 (503 → `sendInvalidToken`) | 1 | T13 (memória) e T13b (`-db`) |
| M9 login / refresh / troca | 1 / 1 / 1 | T10a+T10b / T10c / T10d, e T17 nas três |
| M10 (sem `status: "active"`) | 1 | T12 |
| M11 (sem `AND s.id = …`) | 1 | T5b, T6b e também T11 (X tem sessão viva própria: o A2 (iv) morde) |
| M12 (`catch` que relança) | 1 | 16b-1 (`failureType: 'unhandledRejection'`), 16b-2, 16b-3, 16b-4, 16b-6 |
| M13 (sem a trava de sobreposição) | 1 | 16b-4 |
| M14 (`MAX_FAILURES = 1`) | 1 | 16b-1, 16b-2, 16b-3, 16b-6 |
| M15 (sem `livenessFailures = 0;`) | 1 | 16b-3 |
| M16 (memória só com UUID) | 1 | T15b, e T15 (o controle com usuário não-UUID cai no formato) |
| M17 (orçamento de 60 s) | 1 | T13b: `200 !== 503` depois de 5 355 ms (a forma do plano; ver o ajuste do dublê abaixo) |
| M18 (`rolesChanged = input.roles !== undefined`) | 1 | T19(b) |
| M19 (sem `\|\| rolesChanged`) | 1 | T19(a) |
| T15 (sem o `throw` do `sid` inválido) | 1 | T15 |
| T16 (sem a chamada da conferência no tique) | 1 | T16 (`-db`) e os 6 do T16b |
| T17 (d'): `import "@prisma/client"` no portão | 1 | G2 e T17 |
| T17 (d''): import estático de `database/prisma.js` na conferência | 1 | T17 |
| T17 (f): `sessionLiveness.check = …` no `src/` (extra, não estava no plano) | 1 | T17 |
| T18 (apagar uma chave nova do CONGELADO) | 1 | T13 do ratchet ("o inventário do head == congelado") |
| D-A9 (sem `globalThis.prisma = …` no arnês) | 1 | as 5 `-db` novas, todas pelo assert "A9: o portão usa o papel" |
| D-A9 na `desativacao-db` | 1 | S4·c (A9) |
| D-A4 (sem forçar `prisma`, `memory` exportado), nas 5 novas e na `desativacao-db` | 1 cada | todas pelo assert "E1.5: a suíte roda em prisma" |

**Achados do próprio teste nesta fatia (consertados, declarados):**
1. **Os drills D-A4/D-A9 travavam o processo:** com o assert do arnês falhando, o servidor do app ficava aberto e o
   `node --test` não terminava (medido: 900 s de teto; eu matei os filhos pendurados pelo PID, um a um, depois de o TAP
   já ter os `not ok`, `scratchpad/devdesat/f5/mata-pendurados.log`). Conserto nas 5 `-db` novas: se o assert falha, o
   arnês desmonta antes de propagar, e o `after` não desmonta de novo. Reexecutados (`f5/mut2/`): os mesmos vermelhos,
   e cada processo termina em 10–20 s.
2. **O dublê do T13b usava `SELECT pg_sleep(5)`:** o Prisma não desserializa a coluna `void`, então sob a M17 a
   requisição dava 503 por ERRO depois de 5 s, e não 200. Troquei por `SELECT 1 AS dormiu FROM pg_sleep(5)`; sem a
   mutação o corte do `statement_timeout` segue em ~1,5 s, e com a M17 a forma passou a ser a do plano (200 em 5 355 ms).
3. **A M12 também deixou o processo pendurado** (o mutante solta rejeições); o TAP já tinha os vermelhos e eu matei o
   filho (PID 7644).

### E-pg (forma do job `backend-postgres`), 08:59–09:44 SP

Banco `devdesat_seed` (migrado COM seed), `CORE_SAAS_PERSISTENCE=prisma`, `JWT_SECRET=dev-only-change-me`,
`JWT_EXPIRES_IN=15m`, `LOG_LEVEL=silent`, `NODE_ENV=test` exportados; uma suíte por processo, TAP
(`scratchpad/devdesat/tools/roda-epg.sh`; resumos em `f5/epg-base/` e `f5/epg-cabeca/`). As 24 da E1.1-3 (lista gerada
por `git grep -l -E 'Bearer|signAccessToken' 2f8a9a5e -- 'tests/*-db.test.ts'` + `persistent-rbac-middleware` +
`auth-identity-exposure-scan`) na merge-base (`w-desat-base`) e na cabeça; as 5 novas só na cabeça.
- **Base:** 23 de 24 verdes; `san3-09-bootstrap-platform-admin-db` 0/2 (T2, drill).
- **Cabeça:** as mesmas 23 verdes, com as MESMAS contagens (por exemplo `users-acesso-seg-desativacao-db` 5/5,
  `san3-05-leituras-de-plataforma-db` 12/12, `auth-identity-revocation-db` 10/10); `san3-09` 0/2 igual à base
  (ambiente: a crítica mediu o mesmo). As 5 novas: `portao-db` 16/16, `varredura-db` 1/1, `emissao-db` 4/4, `sse-db` 1/1,
  `orcamento-db` 1/1.
- **Nome em `not ok` na cabeça que não estava na base: nenhum.** Regressão: nenhuma.
- Depois do conserto do arnês (desmonta no assert que falha) e do dublê do `pg_sleep`, as 5 novas rodaram de novo na
  forma do E-mem (`memory` exportado; elas forçam `prisma`): 16/16, 1/1, 4/4, 1/1, 1/1 (`f5/emem-final/`).

### Custo (E1.4), 09:44–10:16 SP

Banco `devdesat`, papel efêmero sem bypass (atributos conferidos: `rolsuper false, rolbypassrls false`), `prisma`,
`LOG_LEVEL=silent`, `NODE_ENV=test`. Ferramentas `scratchpad/devdesat/tools/custo-micro.mts` e `custo-rota.mts`;
saídas em `f5/custo/`. A máquina estava carregada (outros contêineres e juntas em paralelo): a variação entre rodadas é
maior que a diferença medida.
- **Micro (cabeça, n = 500 depois de 30, alternando):** conferência p50 12,48 · p95 36,36 · p99 59,10 ms; 1 resolução do
  RBAC persistente p50 19,94 · p95 56,83 · p99 84,48 ms. **Critério "p95 da conferência ≤ p95 de 1 resolução": cumprido**
  (36,36 ≤ 56,83).
- **Por rota (4 rodadas alternadas, base = `git checkout 2f8a9a5e -- src` no mesmo worktree, cabeça = `git checkout HEAD --
  src`; 30 de aquecimento e 500 sequenciais; toda resposta 200; `git status --porcelain -- src` vazio no fim):**

| Rodada | `/mobile/bootstrap` p50 · p95 · p99 | `/work-orders` p50 · p95 · p99 | `/users` (só relato) p50 · p95 · p99 |
|---|---|---|---|
| 1 base | 50,65 · 132,91 · 250,44 | 111,36 · 204,87 · 270,69 | 875,43 · 1497,08 · 2102,06 |
| 2 cabeça | 30,36 · 42,66 · 63,71 | 69,70 · 94,23 · 120,65 | 605,18 · 854,69 · 1070,59 |
| 3 base | 22,41 · 31,78 · 37,14 | 64,81 · 89,41 · 108,02 | 613,13 · 878,25 · 1116,32 |
| 4 cabeça | 28,21 · 36,36 · 47,28 | 63,63 · 83,27 · 95,98 | 612,87 · 753,30 · 839,07 |

  **Critério "mediana da cabeça (média das 2) − mediana da base (média das 2) ≤ mediana de 1 resolução (19,94 ms)":**
  `/mobile/bootstrap` 29,29 − 36,53 = −7,25 ms; `/work-orders` 66,67 − 88,09 = −21,42 ms. **Cumprido.** A rodada 1 saiu
  sob carga e puxa a base para cima; lido só o par mais próximo no tempo (rodadas 3 e 4): `/mobile/bootstrap` +5,80 ms,
  `/work-orders` −1,18 ms, os dois abaixo de 19,94 ms. Declaro as duas leituras; nenhuma passa do limite.
