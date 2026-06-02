# Log de Execucao

## 2026-05-07

- identificado repositorio oficial `thiagodorgo/ERP_Techsolutios`
- analisado historico recente do GitHub
- detectado conflito entre baseline historico em C e repositorio atual em Node.js + TypeScript
- importada documentacao v1 enviada pelo usuario
- estruturados arquivos-base e trilha operacional
- criado esqueleto tecnico minimo do backend atual do repositorio
- criado commit local com a organizacao desta fase

## 2026-05-21

- evoluido Bloco 02 Core SaaS + RBAC + isolamento multi-tenant
- criado modulo `src/modules/core-saas/` com permissoes, roles, middleware, service, store em memoria, rotas e tipos
- implementado catalogo inicial de permissoes e mapeamento de roles padrao
- mantida compatibilidade com roles legados e com `src/core-saas.ts`
- implementado `tenantContextMiddleware` e `requirePermission(permission)`
- adicionadas rotas protegidas para tenants, users, roles e auditoria inicial
- reforcado isolamento por `tenant_id` em listagens e acesso por id
- criado registro de auditoria minima com `action`, `actor_user_id`, `tenant_id` e `timestamp`
- ampliados testes para acesso permitido, acesso negado, isolamento por tenant, permission mismatch, role sem permissao e acesso cruzado bloqueado
- validado `npm test` com 11 testes passando durante a implementacao
- limitacao registrada: contexto autenticado ainda e simulado por headers e persistencia segue em memoria ate introducao do PostgreSQL

## 2026-05-21 - Bloco 03

- iniciado bloco PostgreSQL + persistencia real com Prisma ORM
- instalados `prisma`, `@prisma/client`, `@prisma/adapter-pg` e `pg`
- criado `prisma.config.ts` porque Prisma 7 removeu `url` do datasource no schema
- criado schema Prisma shared-schema com `tenant_id` nas entidades multi-tenant
- criada migration SQL versionada para tenants, branches, users, roles, permissions, role_permissions e audit_logs
- criado seed inicial idempotente com tenant demo, filial principal, permissoes, roles padrao, admin demo sem senha e audit log
- criado singleton Prisma em `src/database/prisma.ts`
- criados repositories iniciais em `src/modules/core-saas/repositories/`
- mantidos stores em memoria e rotas atuais como transicao segura
- atualizado `.env.example` com `DATABASE_URL` placeholder local
- atualizado `docs/database.md` com decisao PostgreSQL/Prisma, modelo shared-schema e proximos passos
- adicionados testes de integridade do catalogo de permissoes e coerencia das roles RBAC
- validado `npx prisma validate`, `npx prisma generate`, `npm run check` e `npm test`
- migration nao foi executada contra banco real por nao haver `DATABASE_URL` real configurada

## 2026-05-21 - Hardening de dependencias

- executado `npm audit`
- identificadas 3 vulnerabilidades moderadas na cadeia `prisma` -> `@prisma/dev` -> `@hono/node-server`
- vulnerabilidade: `@hono/node-server < 1.19.13`, advisory `GHSA-92pp-h63x-v22m`
- executado `npm audit fix` sem `--force`; comando nao corrigiu e manteve sugestao de downgrade/breaking para `prisma@6.19.3`
- nao executado `npm audit fix --force` para evitar downgrade/breaking do Prisma 7
- aplicado override para `@hono/node-server@1.19.13`
- movido `prisma` de `dependencies` para `devDependencies`
- removido `pg` de `dependencies` diretas por ja ser dependencia transitiva de `@prisma/adapter-pg`
- executado `npm install` para atualizar `package-lock.json`
- confirmado `npm audit` com 0 vulnerabilidades
- aviso residual: `@prisma/streams-local@0.1.2` declara Node `>=22.0.0`, mas e dependencia transitiva de `@prisma/dev`; mantido por compatibilidade atual com Prisma 7 e Node 20 validada pelos comandos do projeto

## 2026-05-31 - Bloco 04B.2B

- revisada a alternancia controlada de persistencia do Core SaaS por `CORE_SAAS_PERSISTENCE`
- mantido `memory` como padrao e preservado `export const app` em memoria para compatibilidade dos testes
- preservado o singleton `coreSaasService` usado pelos testes e pelo adapter de memoria
- extraida a factory configuravel para `src/modules/core-saas/core-saas-runtime.ts`
- extraido o singleton memory para `src/modules/core-saas/core-saas-singleton.ts`
- mantido `PrismaCoreSaasService` fora do barrel principal e carregado apenas via `import()` dinamico no modo `prisma`
- mantidas as rotas Core SaaS usando `ICoreSaasService` async e `handleAsyncRoute`
- frontend, schema Prisma, migrations e dependencias permaneceram intocados

## 2026-06-01 - Bloco 04B.3 Validacao runtime Prisma

- branch usada: `feat/validate-prisma-runtime`
- criado `docs/core-saas-runtime.md` com procedimento operacional para runtime `memory` e `prisma`
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` estavam em execucao
- tentativa inicial de `npm run db:generate` via `cmd` nao repassou `DATABASE_URL` corretamente e falhou com `Cannot resolve environment variable: DATABASE_URL`
- `npm run db:generate` repetido via PowerShell com `DATABASE_URL` local: passou
- `npm run db:migrate` com `DATABASE_URL` local: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed` com `DATABASE_URL` local: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- consultados IDs reais do tenant demo e do admin demo via `docker exec erp-postgres psql`
- servidor em `memory` subiu com `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` vazio e `PORT=3101`
- endpoints testados em `memory`: `GET /api/v1/health` -> 200; `GET /api/v1/users` -> 200 com `data: []`; `GET /api/v1/roles` -> 200
- servidor em `prisma` subiu com `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL` local e `PORT=3102`
- endpoints testados em `prisma`: `GET /api/v1/health` -> 200; `GET /api/v1/users` -> 200 com admin demo; `GET /api/v1/roles` -> 200; `GET /api/v1/audit-events` -> 200
- diferenca observada: `memory` recem-iniciado nao tem seed automatico e retorna lista vazia em `/users`; `prisma` retorna dados persistidos do seed
- diferenca observada: `/audit-events` em `prisma` lista eventos de seeds anteriores porque o seed registra auditoria a cada execucao
- nenhuma correcao de codigo foi necessaria
- frontend, schema Prisma, migrations e dependencias permaneceram intocados

## 2026-06-01 - Bloco 04B.4 Alinhamento memory/prisma

- branch usada: `feat/align-memory-prisma-runtime`
- revisadas diferencas confirmadas entre runtime `memory` e `prisma`
- `memory` mantido volatil e sem seed automatico no startup
- `prisma/seed.ts` ajustado para criar `seed.initialized` apenas se ainda nao existir evento para o tenant demo
- criado `tests/core-saas-contract.test.ts` para validar contrato HTTP DB-free em runtime memory
- `docs/core-saas-runtime.md` atualizado com secao de alinhamento memory vs prisma
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04B.4
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- contagem de `seed.initialized` antes de `npm run db:seed`: 7
- `npm run db:seed`: passou
- contagem de `seed.initialized` depois de `npm run db:seed`: 7
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- servidor real em `memory` subiu em `PORT=3201`; endpoints `health`, `users`, `roles`, `audit-events`, sem tenant e role sem permissao responderam com envelopes esperados
- servidor real em `prisma` subiu em `PORT=3202`; endpoints `health`, `users`, `roles`, `audit-events`, sem tenant e role sem permissao responderam com envelopes esperados
- diferenca confirmada: `memory` sem seed automatico retorna listas vazias em dados volateis; `prisma` retorna dados persistidos do seed demo
- diferenca confirmada: banco local ainda possui 7 eventos historicos `seed.initialized`, mas novas execucoes do seed nao aumentaram a contagem
- pendencias mantidas: auth real, substituicao de headers internos, RBAC real persistido e RLS

## 2026-06-01 - Bloco 04C.1 Auth credentials foundation

- branch usada: `feat/local-auth-credentials`
- criado model Prisma `LocalAuthCredential` e tabela `local_auth_credentials`
- criada migration `20260528000000_add_local_auth_credentials`
- adicionada FK composta `tenant_id + user_id` para garantir que credencial pertence ao usuario do mesmo tenant
- criado modulo `src/modules/auth/`
- decisao de hash: usar `node:crypto` com `scrypt` em formato versionado `scrypt-v1`, sem adicionar dependencia nova
- criado `LocalAuthCredentialRepository` com queries sempre tenant-scoped
- criado `LocalAuthCredentialService` para normalizar email, validar senha minima, criar/upsert credencial e verificar senha sem emitir token
- `prisma/seed.ts` atualizado para criar/atualizar credencial local do admin demo
- `.env.example` atualizado com `DEMO_ADMIN_PASSWORD` local/dev e aviso de nao uso em producao
- criados `tests/auth-credentials.test.ts` e `tests/auth-prisma.test.ts`
- criado `docs/auth.md`
- `docs/database.md` atualizado com `local_auth_credentials`
- login, JWT, refresh token, middleware authenticated actor, Redis runtime e RLS permaneceram fora do escopo
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou e aplicou `20260528000000_add_local_auth_credentials`
- `npm run db:seed`: passou e criou/atualizou credencial local do admin demo
- verificacao SQL confirmou `password_algorithm=scrypt-v1` e que o hash armazenado nao e a senha pura
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste

## 2026-06-01 - Bloco 04C.2 Login local tenant-scoped

- branch usada: `feat/local-auth-login`
- criado endpoint `POST /api/v1/auth/login`
- criado `src/modules/auth/services/local-auth-login.service.ts`
- criado `src/modules/auth/routes/auth.routes.ts`
- criado `src/modules/auth/auth-runtime.ts` com carregamento preguiçoso de Prisma para nao quebrar import do app em modo memory/teste
- `src/app.ts` atualizado para montar `/api/v1/auth`
- formato escolhido para request body: `tenantId`, `email`, `password`
- decisoes de seguranca: erro generico para credenciais invalidas; nenhuma emissao de JWT/refresh token; nenhuma sessao/cookie; `password_hash` nunca retornado
- roles persistidas retornadas via `UserRoleRepository.listByUserForTenant`
- auditoria de login implementada com `auth.login.success` e `auth.login.failed`, sem senha/hash em metadata
- `src/modules/auth/types/auth.types.ts` atualizado com os tipos do contrato de login local
- criado `tests/auth-login.test.ts`
- primeiro teste de login detectou excesso de campos no objeto `tenant`; response shape foi corrigido para retornar apenas `id` e `name`
- `docs/auth.md` atualizado com a secao de login local tenant-scoped
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.2
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.6 RBAC persistido

- branch usada: `feat/persistent-rbac-authorization`
- worktree inicial estava limpo e a branch esperada ja estava ativa
- abordagem escolhida: A, resolver persistido separado e testado com PostgreSQL, sem plugar no `tenantContextMiddleware`
- justificativa: `tenantContextMiddleware` atual e sincrono e o runtime `memory` deve continuar DB-free sem import estatico de Prisma
- criado `src/modules/core-saas/services/persistent-authorization.service.ts`
- `PersistentAuthorizationService` recebe repositories por injecao, sem importar Prisma estaticamente
- resolver usa `user_role_assignments` por `tenantId/userId`, roles atribuidas e `role_permissions` para retornar roles/permissoes persistidas
- usuario sem role persistida retorna roles e permissions vazias
- `src/modules/core-saas/index.ts` exporta o service persistido sem carregar Prisma
- `tests/actor-aware-routes.test.ts` reforcado para validar que `x-permissions` nao eleva permissao quando ha JWT
- criado `tests/persistent-rbac-authorization.test.ts`
- `docs/auth.md` atualizado com `Persistent RBAC authorization`
- criado `docs/rbac.md`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.6
- JWT continua tendo prioridade sobre headers simulados
- `x-permissions` permanece fallback apenas para legacy headers
- nao foram alterados frontend, schema Prisma, migrations, `package.json` ou `package-lock.json`
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 7 testes
- `node --test --import tsx tests/persistent-rbac-authorization.test.ts`: passou com 1 teste
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- nenhum commit, push, PR ou merge foi criado

## 2026-06-01 - Bloco 04C.3 JWT access token

- branch usada: `feat/jwt-access-token`
- adicionado `jose` como dependencia runtime para assinatura/verificacao JWT em ESM/TypeScript, sem implementacao manual com `crypto`
- `src/config/env.ts` atualizado com `JWT_SECRET` e `JWT_EXPIRES_IN`
- `JWT_SECRET` passa a falhar claramente em `NODE_ENV=production` quando ausente ou com segredo local/dev conhecido
- `.env.example` atualizado com `JWT_SECRET="dev-only-change-me"` e `JWT_EXPIRES_IN="15m"` apenas para local/dev
- criado `src/modules/auth/services/jwt.service.ts`
- `src/modules/auth/types/auth.types.ts` atualizado com `SignAccessTokenInput` e `AuthenticatedTokenPayload`
- `POST /api/v1/auth/login` atualizado para retornar `access_token`, `token_type: Bearer` e `expires_in`
- payload JWT minimo: `sub`, `tenant_id`, `email`, `roles`, `type=access`, `iat`, `exp`, `iss` e `aud`
- resposta de login nao retorna `password_hash`, `refresh_token`, cookie ou sessao
- falha de login continua sem token e com erro generico `INVALID_CREDENTIALS`
- auditoria de login mantida sem registrar token, segredo, senha ou hash
- headers simulados `x-tenant-id`, `x-user-id`, `x-role` e `x-permissions` continuam ativos
- middleware JWT obrigatorio nao foi criado nem plugado nesta rodada
- criado `tests/auth-jwt.test.ts`
- `tests/auth-login.test.ts` atualizado para validar token emitido e payload
- `docs/auth.md` atualizado com secao `JWT access token`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.3
- `docs/api.md` nao existe neste repositorio, portanto nao foi atualizado
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma e migrations permaneceram intocados
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.4 Middleware authenticated actor

- branch usada: `feat/authenticated-actor-middleware`
- criado `src/modules/auth/middleware/authenticated-actor.middleware.ts`
- middleware escolhido: opcional e exportado pelo modulo auth, sem montagem global em `src/app.ts`
- `request.actor` tipado via module augmentation do Express
- formato de actor JWT: `userId`, `tenantId`, `email`, `roles` e `authType: "jwt"`
- sem `Authorization`, o middleware chama `next()` e nao define `request.actor`
- `Authorization` sem Bearer, token invalido ou token expirado retorna `401 INVALID_TOKEN`
- token valido e verificado com `verifyAccessToken` e popula `request.actor`
- criado helper `resolveRequestActor` para retornar actor JWT ou fallback de headers simulados
- fallback legado le `x-tenant-id`, `x-user-id`/`x-actor-user-id`, `x-role`/`x-roles` e `x-permissions`
- headers simulados foram preservados e rotas Core SaaS nao foram migradas nesta rodada
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- `src/modules/auth/types/auth.types.ts` atualizado com tipos de actor
- `src/modules/auth/index.ts` atualizado para exportar middleware/helper
- criado `tests/auth-actor-middleware.test.ts`
- `docs/auth.md` atualizado com secao `Authenticated actor middleware`
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.4
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.5 Rotas protegidas actor-aware

- branch usada: `feat/actor-aware-protected-routes`
- `attachAuthenticatedActor()` montado em `src/app.ts` antes de `createCoreSaasRouter(service)`
- montagem escolhida: somente para rotas Core SaaS sob `/api/v1`, preservando health e auth sem middleware JWT
- `src/modules/core-saas/middleware/tenant-context.middleware.ts` atualizado para resolver actor via `resolveRequestActor`
- `request.actor` JWT tem prioridade sobre headers simulados
- fallback legado preservado para `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` e `x-permissions`
- token invalido, malformado ou expirado retorna `401 INVALID_TOKEN`
- sem JWT, as rotas protegidas continuam funcionando com headers simulados
- sem JWT e sem headers, envelope de erro atual `403 tenant_required` foi preservado
- response shape de sucesso das rotas protegidas foi preservado
- logger HTTP passou a redigir `req.headers.authorization`
- criado `tests/actor-aware-routes.test.ts`
- `docs/auth.md` atualizado com secao de rotas protegidas actor-aware
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.5
- nao foram feitas consultas de roles no banco, RBAC real persistido, refresh token, logout, sessao/cookie, Redis runtime ou RLS
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 6 testes
- `git diff --check`: passou, com avisos LF/CRLF do Windows e sem erro de whitespace
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- nenhum commit, push ou PR foi criado

## 2026-06-01 - Bloco 04C.7 Middleware RBAC persistido para JWT

- branch usada: `feat/persistent-rbac-middleware`
- worktree inicial estava limpo e a branch esperada ja estava ativa
- criado `src/modules/core-saas/middleware/persistent-rbac-context.middleware.ts`
- novo middleware roda depois do `tenantContextMiddleware`
- `tenantContextMiddleware` permaneceu sincronico como fallback/base
- com actor JWT e `CORE_SAAS_PERSISTENCE=prisma`, o middleware usa `PersistentAuthorizationService` para substituir roles/permissoes por RBAC persistido
- repositories Prisma sao carregados por `import()` dinamico apenas no modo Prisma
- com runtime `memory`, o middleware chama `next()` sem abrir Prisma nem exigir `DATABASE_URL`
- `src/modules/core-saas/routes/index.ts` atualizado para montar o middleware persistido antes das rotas protegidas
- `src/modules/core-saas/index.ts` exporta o middleware sem expor repositories Prisma no barrel principal
- criado `tests/persistent-rbac-middleware.test.ts`
- teste novo cobre legacy sem JWT, JWT com role persistida, JWT sem permissao persistida, `x-permissions` sem elevacao, headers conflitantes ignorados, token invalido 401, memory DB-free e response shape preservado
- `docs/auth.md` atualizado com o middleware async de RBAC persistido
- `docs/rbac.md` atualizado com fluxo JWT/Prisma, fallback legacy e preservacao do runtime memory
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.7
- `docker compose up -d`: passou; containers `erp-postgres` e `erp-redis` ja estavam em execucao
- `npm ci`: passou com 0 vulnerabilidades; manteve aviso conhecido `EBADENGINE` de `@prisma/streams-local@0.1.2` em Node 20
- `npm run db:generate`: passou
- `npm run db:migrate`: passou; banco ja estava sincronizado, sem migration pendente
- `npm run db:seed`: passou
- `npm run check`: passou
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `node --test --import tsx tests/core-saas-runtime.test.ts`: passou com 7 testes
- `node --test --import tsx tests/core-saas-prisma.test.ts`: passou com 6 testes
- `node --test --import tsx tests/core-saas-contract.test.ts`: passou com 3 testes
- `node --test --import tsx tests/auth-credentials.test.ts`: passou com 7 testes
- `node --test --import tsx tests/auth-prisma.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-login.test.ts`: passou com 1 teste
- `node --test --import tsx tests/auth-jwt.test.ts`: passou com 5 testes
- `node --test --import tsx tests/auth-actor-middleware.test.ts`: passou com 6 testes
- `node --test --import tsx tests/actor-aware-routes.test.ts`: passou com 7 testes
- `node --test --import tsx tests/persistent-rbac-authorization.test.ts`: passou com 1 teste
- `node --test --import tsx tests/persistent-rbac-middleware.test.ts`: passou com 2 testes
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados nesta rodada
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- nenhum commit, push, PR ou merge foi criado

## 2026-06-02 - Bloco 04C.8 RBAC hardening e headers legados

- branch usada: `chore/rbac-hardening-legacy-headers`
- worktree inicial estava limpo e a branch esperada estava ativa
- leitura rapida confirmou `attachAuthenticatedActor()`, `tenantContextMiddleware`, `persistent-rbac-context.middleware.ts`, rotas Core SaaS e testes atuais
- cobertura existente ja validava JWT vencendo headers conflitantes, `x-permissions` sem elevacao de JWT, token invalido com headers retornando 401, legacy sem JWT, ausencia de contexto retornando 403, response shape preservado e runtime memory DB-free
- nenhum teste novo foi criado para evitar duplicacao de cobertura
- `docs/auth.md` atualizado com `Legacy headers deprecation plan`
- `docs/auth.md` passou a listar explicitamente `x-actor-user-id` e `x-roles` junto dos demais headers legados
- `docs/auth.md` documenta `Authorization: Bearer` como fonte preferencial e `x-permissions` apenas como fluxo legacy
- `docs/rbac.md` atualizado com estado atual JWT + `request.actor` + `tenantContext` + RBAC persistido
- `docs/rbac.md` documenta riscos temporarios dos headers simulados e plano futuro para feature flag ou modo strict
- `agent-orchestration/docs/status-geral.md` atualizado com o Bloco 04C.8
- nao houve alteracao de middleware, rotas, schema Prisma, migrations, package files ou contratos HTTP
- headers legados foram preservados
- refresh token, logout, sessao/cookie, Redis runtime e RLS permaneceram fora do escopo
- nenhum commit, push, PR ou merge foi criado
