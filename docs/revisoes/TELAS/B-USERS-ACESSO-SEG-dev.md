# B-USERS-ACESSO-SEG — diário do dev

- **Dev:** `dev-users-seg`, identidade nova e exclusiva de dev. **Modelo:** Claude Opus 5.5, nível menor DECLARADO (§C7.6). Não julga a própria entrega: a pré-revisão e a junta são de OUTRO modelo (`D-UM-FAZ-OUTRO-VERIFICA`).
- **Autorização:** o dono, em 10/11 às 00:40 SP: *"pode abrir B-USERS-ACESSO-SEG"* (hora corrigida pelo orquestrador a partir do registro). Decisões que regem o bloco, na `origin/main`, `agent-orchestration/controle/decisoes.md:3687` (`D-USERS-ACESSO-RESPOSTAS`) e `:3689` (`D-USERS-ACESSO-REPLANO-RESPOSTAS`).
- **Plano (fonte):** `C:/Users/thiag/erp-pausa-2026-10-03/planos/B-USERS-ACESSO-plano.md`, da linha 47 ao fim (as seções do topo com "EM APURAÇÃO" são esqueleto antigo e ficam de fora). Crítica que o replano dobrou: `origin/main:docs/revisoes/TELAS/B-USERS-ACESSO-critica.md`. Plano original citado pela crítica: `origin/main:docs/revisoes/TELAS/B-USERS-ACESSO-plano.md`.
- **Terreno:** worktree próprio `C:/Users/thiag/w-users-seg`, ramo `fix/users-acesso-seg`, criado de `origin/main` = `75572269`. `npm ci` próprio (pasta real, sem junction) e `prisma generate` próprio. Postgres 16.15 próprio: container `users-seg-pg`, `127.0.0.1:5491`, banco `erp_users_seg`, migrado com `prisma migrate deploy`.

Formato das linhas: comando → saída → veredito.

## F0 — a ref de agora contra a base do plano

- `git diff --stat 4cd1889d..75572269 -- src/modules/auth src/modules/core-saas frontend/src/modules/users prisma/schema.prisma src/database/rls.ts` → só `src/modules/core-saas/permissions/catalog.ts | 5 +++++` → igual à medição do orquestrador.
- `git diff 4cd1889d..75572269 -- src/modules/core-saas/permissions/catalog.ts` → +5 linhas no bloco `field_technician` (`catalog.ts:935`): `expense_report:read_own`, `expense_report:create`, `expense_report:update`, `expense_report:submit`, `expense_sync:write` (vem do B-O6R-03b, #520) → **não afeta fatia nenhuma**: S1–S8 não dependem do conjunto de permissões do `field_technician`; o formulário com `field_technician` é do `B-USERS-TELA` e está fora (ajuste 7, PROIBIDO `frontend/**`).
- `git diff --stat 4fe7524e..75572269` (base da crítica) nas mesmas áreas → `schema.prisma` (+581: só modelos novos de Traccar e cobrança, nenhum de `User`, `LocalAuthCredential`, `AuthIdentity*`, `AuthSession`, `UserRoleAssignment`), `rls.ts` (+81: `withTenantRlsBudget` e `findFirstTenantRls` do Traccar), `auth.routes.ts` (+1: `permissions` na resposta do `active-tenant`), `catalog.ts` → nenhuma premissa da crítica cai.

## Linha de base N (os testes que as fatias tocam)

- `DATABASE_URL=<o meu cluster> JWT_SECRET=dev-only-change-me node scripts/run-backend-tests.mjs` sobre 17 arquivos (`core-saas`, `core-saas-prisma`, `core-saas-role-authority`, `core-saas-role-authority-db`, `core-saas-contract`, `persistent-rbac-authorization`, `persistent-rbac-middleware`, `auth-session`, `auth-credentials`, `auth-login`, `auth-prisma`, `auth-identity-revocation-db`, `auth-identity-links-db`, `auth-identity-role-real-db`, `auth-invariant-guards`, `sessions-admin`, `auth-active-tenant-permissions`) → `# tests 122 · pass 122 · fail 0 · skipped 0`, modo `memory` pelo runner, banco presente → **N = 122**, verde, na `75572269`.

## Divergências plano × ref, medidas antes de codar (§A2)

- **D1 — caminho de dois arquivos do PERMITIDO.** O plano diz `src/modules/core-saas/repositories/local-auth-credential.repository.*` e `identity-link.service.*`. `git ls-files | grep -E 'local-auth-credential.repository|identity-link.service'` → `src/modules/auth/repositories/local-auth-credential.repository.ts` e `src/modules/auth/services/identity-link.service.ts`, os únicos com esse nome. Leitura: são esses dois (a crítica, ajuste 6, os nomeia sem pasta).
- **D2 — `createUser`/`updateUser` não vivem só em `services/**`.** O PERMITIDO põe a credencial no create, o antes/depois da auditoria e a trava do último admin em `src/modules/core-saas/services/**`. Na ref, a transação Prisma das duas funções é `src/modules/core-saas/store/prisma-core-saas.store.ts:101-240`; o contrato dela é `store/async-core-saas.store.ts:16-31`; os tipos de entrada e saída são `types/core-saas.types.ts:51-67`. A trava "sob trava na mesma transação" (plano original, passo 1) e a auditoria antes/depois só cabem dentro da transação do store. **Leitura do dev, declarada (§A6), a ratificar:** o PERMITIDO nomeia as funções; entram os três arquivos que as implementam (`store/prisma-core-saas.store.ts`, `store/async-core-saas.store.ts`, `types/core-saas.types.ts`) e nenhum outro.
- **D3 — trava de advisory proibida em `src/**`.** `tests/financial-period-lock-guard.test.ts:67` reprova `pg_advisory` fora de `src/database/financial-period-lock.ts`. A trava do último admin não pode ser advisory: será trava de LINHA (mutex por organização), ver S3.
- **D4 — a contagem de vínculos da identidade do ALVO não cabe no braço de tenant (bloqueia S1).** A regra do dono (`D-USERS-1`: o admin não redefine a senha de quem tem vínculo em 2+ organizações) precisa contar os vínculos da identidade do usuário-alvo em TODAS as organizações. Na ref: a política de `auth_identity_links` é `tenant_id = GUC de tenant OR identity_id = GUC de identidade` (`prisma/migrations/20260868000000_add_auth_identities/migration.sql`, política `auth_identity_links_tenant_or_identity`); sob o GUC de tenant da organização do admin só aparece o vínculo DELA. O braço de identidade só se liga por `setIdentityRlsContext(tx, actor)` (`src/database/rls.ts:184-199`), que aceita SOMENTE o ator do JWT; o guard 9 (`tests/auth-invariant-guards.test.ts:191`) trava a forma da chamada e o guard 6 trava o literal `authType: "jwt"` fora do middleware; e o próprio código diz que o reset "REABRE o contrato do setter em junta" (`src/modules/auth/services/local-auth-credential.service.ts:128-130`). Sob o papel real (`NOSUPERUSER NOBYPASSRLS`), contar pelo braço de tenant devolve sempre 1 e a recusa nunca dispararia; sob o superusuário da CI o mesmo código passaria verde. **É decisão nova** → PAUSA da S1 com a pergunta (ver `## PAUSA`).
- **D5 — o que `must_change_password` obriga não está escrito (bloqueia S1 e S2).** O plano original diz "para obrigar a troca, é preciso a coluna" e a P1 autoriza a coluna, mas não diz o que a senha provisória deixa fazer. Medido: a S2 sozinha abre uma janela nova de tomada de conta. O admin cria o usuário U em A e vê a senha provisória; U entra em A com ela e religa a conta dele de B (`POST /auth/identity-links`); o admin, que ainda sabe a provisória, entra em A e troca para B (`POST /auth/active-tenant`, `auth.routes.ts:380-475`, via `findMembershipForIdentity`). Hoje isso não existe porque usuário criado não tem senha nenhuma. **É decisão nova** → PAUSA da S2 com a pergunta.
- **D6 — o vermelho-controle da S1 ("hoje passa").** Não há rota de reset hoje (`grep -rn "reset" src/modules/auth/routes src/modules/core-saas/routes` → nada). O vermelho só se mede contra o reset ingênuo (o passo 4 do plano original, sem a recusa). Fica para a S1.
- **D7 — o Achado 3 (sessões na desativação) não tem fatia própria.** O PERMITIDO o cita ("revogação de sessão na desativação"). Leitura declarada: entra na S4, porque é a mesma desativação (permissão negada na hora + sessões revogadas na mesma transação do `updateUser`).

## Ordem desta sessão

As fatias que não dependem de D4/D5 vêm primeiro: S4 (com o Achado 3), S6, S3, S5, S8 (parte do antes/depois), S7 (com a coluna da P1). S1, S2 e a parte da S8 sobre a senha provisória ficam paradas até a resposta da `## PAUSA`.

## S4 — status no RBAC persistente (ajuste 2, D-USERS-3) + Achado 3 (sessões na desativação)

- Teste escrito antes: `tests/users-acesso-seg-desativacao-db.test.ts` (5 testes; o código sob teste conecta como papel efêmero do arnês, atributos medidos no S4·0).
- Vermelho-controle na base (`75572269` + só o teste) → `node scripts/run-backend-tests.mjs tests/users-acesso-seg-desativacao-db.test.ts` → `# tests 5 · pass 1 · fail 4`: `not ok 2 S4·a` ("desativado: nenhum papel", actual `['viewer']` — o desativado ainda autoriza); `not ok 3 S4·b` e `not ok 4 S4·c` (`createPersistentAuthorizationResolver is not a function` — a fiação não existe); `not ok 5 A3` (`2 !== 0`, as sessões do desativado seguem vivas) → vermelho medido.
- Código: `persistent-authorization.service.ts` (3º argumento obrigatório `findStatusForTenant`; inativo ou fora da organização → papéis e permissões vazios, antes de ler papéis); `persistent-rbac-context.middleware.ts` (exporta `createPersistentAuthorizationResolver(client)`, o padrão de produção é ele com o cliente global; imports preguiçosos carregados uma vez); `prisma-core-saas.store.ts` `updateUser` (status `inactive` → `revokeAllActiveByUserForTenant` na mesma transação RLS; `revoked_sessions` na auditoria); `tests/persistent-rbac-authorization.test.ts` (passa o 3º argumento; os 3 casos não mudam).
- Verde → mesmo comando + `persistent-rbac-authorization` + `persistent-rbac-middleware` → `# tests 8 · pass 8 · fail 0`; `npx tsc -p tsconfig.json --noEmit` → sem saída.
- Mutação M-S4a (a do plano: remover o filtro de status, `if (!user || …) return vazio` → `void user`) → `pass 2 · fail 3` (S4·a, S4·b, S4·c vermelhos) → revertida por edição inversa → `git diff --exit-code` limpo.
- Mutação M-S4b (fiação: o resolvedor de produção responde sempre `active`) → `pass 3 · fail 2` (S4·b, S4·c vermelhos; S4·a verde, porque monta a própria leitura) → revertida → limpo. Prova que o S4·b/c medem a fiação de produção, não só o serviço.
- Mutação M-A3 (sem a revogação na desativação) → `pass 4 · fail 1` (A3 vermelho) → revertida → limpo.
- Commit `bec18cf7`.
- Nota (ambiente, não do bloco): o log mostra `Domain event was not enqueued` (sem Redis local); a auditoria grava, só a fila do evento falha. Igual na base.

## RETOMADA 1

Feito: F0, linha de base N = 122, divergências D1–D7, S4 (com o Achado 3) verde com 3 mutações provadas. Próximo comando: escrever `tests/users-acesso-seg-email-duplicado.test.ts` (S6) e rodá-lo na base para o vermelho-controle.

## S6 — e-mail duplicado (ajuste 9, REQUISITO)

- Testes escritos antes: `tests/users-acesso-seg-usuarios.test.ts` (memória, rota real) e `tests/users-acesso-seg-usuarios-db.test.ts` (Prisma pela rota real, serviço ligado ao papel efêmero; arnês com `application_name` próprio para a barreira da S5).
- Vermelho-controle (ramo com a S4, sem o código da S6) → `node scripts/run-backend-tests.mjs` nos dois arquivos → `# tests 4 · pass 1 · fail 3`: `S6·a (Prisma)` 400 ≠ 409 (o P2002 caía no 400 genérico com o texto do Prisma no corpo); `S6·b (Prisma)` `[201, 400]` ≠ `[201, 409]`; `S6 (memória)` 201 ≠ 409 (a memória criava o duplicado) → vermelho medido.
- Primeiro verde parcial, e o achado que ele deu: com o mapeamento só pelos campos do adaptador, o Prisma seguiu 400. Sondas (scripts temporários na raiz do worktree, apagados) → sob o SUPERUSUÁRIO o P2002 traz `meta.driverAdapterError.cause.constraint.fields = ["tenant_id","email"]`; sob o papel efêmero NOSUPERUSER NOBYPASSRLS o mesmo erro vem SEM `constraint` (com RLS ligado o Postgres omite o DETAIL com a chave), só com `originalMessage` nomeando `users_tenant_id_email_key`. Um teste só com o superusuário da CI passaria com o código que falha em produção.
- Código: `prisma-core-saas.service.ts` (`createUser` captura o P2002 de `User` com `email` nos campos OU com o nome do índice na mensagem → `CoreSaasError(409, "CONFLICT", "user_email_conflict")`; a transação do store volta inteira); `core-saas.service.ts` (memória: o mesmo 409 antes de gravar).
- Verde → os dois arquivos + `core-saas`, `core-saas-prisma`, `core-saas-role-authority`, `core-saas-role-authority-db` → `# tests 53 · pass 53 · fail 0`. Commit `8ffde055`.
- Mutação M-S6a (sem o mapeamento) → `pass 2 · fail 2` (S6·a, S6·b) → revertida → limpo.
- Mutação M-S6b (sem a leitura pelo nome do índice, só os campos) → `pass 1 · fail 2` sob o papel efêmero (S6·a, S6·b) → revertida → limpo. Prova que o teste mede o caminho de produção (RLS), não o do superusuário.
- Mutação M-S6c (memória sem a checagem) → `pass 0 · fail 1` → revertida → limpo.

## RETOMADA 2

Feito: S4 e S6. Próximo comando: escrever os testes da S3 (autodesativação, auto-rebaixamento, último admin) nos dois arquivos `users-acesso-seg-usuarios*` e rodá-los para o vermelho-controle.
