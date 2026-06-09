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
- `.env.example` recebeu variaveis JWT locais/dev naquele bloco; valores finais atuais foram realinhados depois para `JWT_SECRET="change-me-in-local-development"` e `JWT_EXPIRES_IN="1h"`
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

## 2026-06-02 - Console da Plataforma Foundation

- branch criada: `feature/platform-console-foundation`
- status inicial tinha apenas `frontend/links_Figma.txt` nao rastreado; arquivo preservado e nao alterado
- auditoria confirmou frontend em `frontend/src` com `layouts`, `providers`, `components`, `modules`, `mocks`, `services` e `pages`
- auditoria confirmou backend em `src/modules` com `auth`, `core-saas`, routes, services, repositories, middleware e Prisma separado
- criados `docs/platform-console.md`, `docs/modules.md`, `docs/frontend-screens.md`, `docs/api.md` e `docs/architecture.md`
- `docs/rbac.md` atualizado com escopos platform/tenant e sidebar dinamica
- `docs/09-mapa-telas-frontend.md` atualizado para labels `Usuarios` e `Administrador` e telas P01/P02/P03 da Console da Plataforma
- criado `frontend/src/navigation` com `NavigationItem`, `canShowNavigationItem`, `platformNavigation` e `tenantNavigation`
- criados `frontend/src/guards/PlatformGuard.tsx` e `frontend/src/guards/PermissionGuard.tsx`
- criado `frontend/src/layouts/PlatformLayout.tsx`
- criado modulo `frontend/src/modules/platform` com types, mock, adapter, service e paginas P01/P02/P03
- `frontend/src/App.tsx` atualizado com rotas `/platform/tenants`, `/platform/tenants/:tenantId` e `/platform/tenants/:tenantId/modules`
- `frontend/src/components/erp/index.tsx` passou a usar navegacao dinamica de tenant
- `frontend/src/modules/auth/types.ts` e mock de auth atualizados com permissao de plataforma e label `Administrador`
- criado modulo backend `src/modules/platform` com permissoes, DTOs, validator, service, repository em memoria e routes
- `src/app.ts` monta `/api/v1/platform` antes das rotas Core SaaS
- endpoints iniciais criados: listar/criar/detalhar/atualizar tenants, status, modulos e admin inicial
- criado `tests/platform-routes.test.ts`
- revisao final limitou fallback legacy de `/api/v1/platform/*` a desenvolvimento/teste/local e bloqueou headers simulados em `NODE_ENV=production`
- nenhuma migration ou alteracao de schema Prisma foi feita
- nenhum package file foi alterado

## 2026-06-06 - Plano Checklists Configuraveis por Tenant

- branch criada/usada: `feature/configurable-checklists-backend`
- objetivo: formalizar a Fase 1 documental do modulo `checklists`, cobrindo RF, RNF, arquitetura, API planejada, banco, RBAC, frontend futuro, mobile/offline, riscos e proximos passos.
- arquivos lidos: `docs/05-requisitos-funcionais.md`, `docs/06-requisitos-nao-funcionais.md`, `docs/modules.md`, `docs/api.md`, `docs/database.md`, `docs/rbac.md`, `docs/architecture.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `agent-orchestration/docs/status-geral.md`, `agent-orchestration/codex/log-execucao.md`, `package.json` e `frontend/package.json`.
- arquivos previstos para alteracao: documentos acima quando aplicavel, alem deste log e do status geral.
- arquivos previstos para criacao: nenhum, salvo se a revisao mostrar ausencia real de documento necessario; os documentos alvo ja existem no estado atual do repositorio.
- objetivo de cada alteracao: registrar requisito funcional, requisitos nao funcionais, modelo de dominio, entidades, endpoints planejados, permissoes RBAC, impactos Web/Mobile, decisoes arquiteturais e criterios de aceite do modulo.
- riscos conhecidos: worktree ja continha alteracoes nao commitadas anteriores da Console da Plataforma; por isso o commit desta tarefa deve separar apenas arquivos relevantes de documentacao/log e nao incluir alteracoes frontend/backend nao relacionadas.
- estrategia de testes: executar os scripts existentes `npm run check`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate`, `docker compose config` e `git diff --check` conforme disponibilidade local.
- criterios de aceite: RF registrado, multi-tenancy explicito, componentes definidos pela plataforma, cliente configurando apenas templates/campos, versionamento, auditoria, RBAC, mobile/offline, endpoints planejados e entidades principais documentados.
- comandos que nao serao inventados: nao executar `npm run typecheck`, `npm run test:api`, `npm --prefix frontend run lint` ou `npm --prefix frontend run test` se nao existirem nos `package.json`.
- fora de escopo nesta fase: migration Prisma, rotas backend, service/repository/controller, telas frontend, layout global, auth, Redis, storage de evidencias e qualquer refatoracao ampla.

## 2026-06-06 - Execucao Checklists Configuraveis por Tenant

- branch usada: `feature/configurable-checklists-backend`
- implementada Fase 1 documental do modulo `checklists`
- arquivos alterados nesta tarefa: `docs/05-requisitos-funcionais.md`, `docs/06-requisitos-nao-funcionais.md`, `docs/modules.md`, `docs/02-mapa-modulos.md`, `docs/api.md`, `docs/database.md`, `docs/rbac.md`, `RBAC_MATRIX.md`, `docs/architecture.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `agent-orchestration/docs/requisitos.md`, `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md`
- nenhum arquivo novo foi criado por esta tarefa; alguns documentos editados ja estavam nao rastreados antes da execucao por trabalho anterior da Console da Plataforma
- documentados RF, RNF, entidades, endpoints planejados, permissoes RBAC, impacto frontend, impacto backend, impacto banco, impacto mobile/offline, decisoes, riscos e proximos passos
- nenhuma migration Prisma foi criada
- nenhum backend `src/modules/checklists` foi criado
- nenhuma tela frontend foi criada
- `npm run check`: passou
- `npm run lint`: passou, executando `npm run check`
- `npm test`: passou com 13 testes
- `npm run build`: passou
- `npm --prefix frontend run check`: passou
- `npm --prefix frontend run build`: passou
- `npx prisma validate`: falhou inicialmente sem `DATABASE_URL`, depois passou com a URL local placeholder do `.env.example`
- `npx prisma generate`: passou com a URL local placeholder do `.env.example`
- `docker compose config`: passou
- `docker compose up -d`: falhou porque o Docker daemon/Desktop nao estava ativo (`dockerDesktopLinuxEngine` indisponivel)
- `npx prisma migrate status`: falhou porque o PostgreSQL local nao estava acessivel, coerente com Docker indisponivel
- `git diff --check`: falhou inicialmente por dois trailing spaces em `docs/05-requisitos-funcionais.md`; corrigido e passou na repeticao
- commit nao realizado: o worktree ja continha alteracoes e arquivos nao rastreados anteriores da Console da Plataforma, incluindo frontend/backend, e um commit desta tarefa arrastaria escopo nao relacionado
- push nao realizado porque nao houve commit seguro
- mensagem de commit sugerida quando o escopo for separado: `feat: document configurable checklists module`

## 2026-06-06 - Validacao e publicacao solicitada

- usuario solicitou validar o que foi feito e subir para o GitHub todas as mudancas
- escopo confirmado pelo pedido: worktree completo da branch `feature/configurable-checklists-backend`
- `frontend/links_Figma.md` classificado como mapa de links Figma do projeto, nao como temporario local
- `gh --version`: disponivel
- `gh auth status`: autenticado em `github.com` como `thiagodorgo`
- `npm run check`: passou
- `npm run lint`: passou
- `npm test`: passou com 13 testes
- `node --test --import tsx tests/platform-routes.test.ts`: passou com 3 testes
- `npm run build`: passou
- `npm --prefix frontend run check`: passou
- `npm --prefix frontend run build`: passou
- `npx prisma validate`: passou com `DATABASE_URL` local placeholder do `.env.example`
- `npx prisma generate`: passou com `DATABASE_URL` local placeholder do `.env.example`
- `docker compose config`: passou
- `git diff --check`: passou
- `docker compose up -d`: falhou porque o Docker daemon/Desktop nao esta ativo (`dockerDesktopLinuxEngine` indisponivel)
- `npx prisma migrate status`: falhou porque o PostgreSQL local nao esta acessivel, coerente com Docker indisponivel
- varredura simples de segredos confirmou que a nova alteracao em `.env.example` e apenas `VITE_USE_MOCKS="true"`; os demais valores encontrados sao placeholders locais ja documentados

## 2026-06-06 - tenant_checklist W02A e Mobile schema-driven

- objetivo: atualizar documentacao e frontend para prever a feature `tenant_checklist`
- arquivos alterados: `docs/modules.md`, `docs/rbac.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/platform-console.md`, `docs/api.md`, `docs/05-requisitos-funcionais.md`, `docs/09-mapa-telas-frontend.md`, `docs/02-mapa-modulos.md`, `RBAC_MATRIX.md`, `frontend/src/App.tsx`, `frontend/src/navigation/tenantNavigation.ts`, `frontend/src/components/erp/index.tsx`, `frontend/src/mocks/auth/context.ts`, `frontend/src/styles/app.css`, `frontend/src/modules/checklists/*`, `frontend/src/modules/platform/platform.mock.ts`, `src/modules/platform/platform-modules.service.ts`, `agent-orchestration/docs/status-geral.md` e este log
- criado `docs/api-screen-endpoints.md` para mapear W02A/M10/M11/M12 aos endpoints esperados
- criada tela frontend `TenantChecklistsPage` para W02A em `/administrator/checklists`
- criados tipos frontend `TenantChecklist`, `TenantChecklistComponent`, `ChecklistRun`, `ChecklistMarker`, `ChecklistAttachment` e `ChecklistAcknowledgement`
- atualizado catalogo de modulos para incluir `tenant_checklist`
- atualizado RBAC com `tenant_checklists:read`, `tenant_checklists:create`, `tenant_checklists:update`, `tenant_checklists:publish`, `checklist_runs:read`, `checklist_runs:create`, `checklist_runs:update` e `checklist_runs:complete`
- decisao registrada: M10 e `towing_collection`, M11 e `towing_delivery`, M12 e `technical_evidence`
- decisao registrada: M10/M11/M12 devem consumir schema da API e evitar hardcode de campos quando possivel
- backend real de `tenant_checklist` nao implementado nesta rodada

## 2026-06-07 - FIGMA-CHECKLIST-HANDOFF.1

- objetivo: sincronizar documentacao do repositorio com as decisoes finais Figma sobre `tenant_checklist`, W02A, M10, M11 e M12
- arquivos alvo atualizados: `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/platform-console.md`, `docs/modules.md`, `docs/api-screen-endpoints.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- W02A registrada como tela oficial de configuracao de `tenant_checklist`
- componentes oficiais registrados: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`
- M10 registrado como coleta/reboque com selecao de tipo de veiculo, imagem dinamica por tipo, marcacao de avarias, fotos obrigatorias conforme template e schema vindo da API
- M11 registrado como entrega/reboque com comparacao com coleta; divergencia exige foto, observacao obrigatoria e ciencia de responsabilidade
- M12 registrado como evidencia tecnica antes/depois fora do escopo de guincho/reboque
- estados registrados: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia
- backend, migrations e arquitetura fora do escopo nao foram alterados

## 2026-06-07 - Backend real tenant_checklist

- branch usada: `feature/tenant-checklists-backend`
- objetivo: implementar backend real de `tenant_checklist` com migrations, models Prisma, rotas, service, repository, validators, RBAC, auditoria e testes
- migration criada: `prisma/migrations/20260607000000_add_tenant_checklists/migration.sql`
- schema Prisma atualizado com `ChecklistTemplate`, `ChecklistTemplateComponent`, `ChecklistRun`, `ChecklistRunAnswer`, `ChecklistAttachment`, `ChecklistMarker` e `ChecklistAcknowledgement`
- modulo criado: `src/modules/checklists`
- rotas registradas em `src/app.ts` sob `/api/v1`
- RBAC atualizado com `tenant_checklists:read`, `tenant_checklists:create`, `tenant_checklists:update`, `tenant_checklists:publish`, `checklist_runs:read`, `checklist_runs:create`, `checklist_runs:update`, `checklist_runs:complete` e `checklist_runs:acknowledge`
- testes criados em `tests/checklist-routes.test.ts`
- decisao tecnica: manter repository em memoria para runtime/testes sem `DATABASE_URL` e adapter Prisma carregado dinamicamente quando `CORE_SAAS_PERSISTENCE=prisma`
- limite conhecido: anexos usam `fileUrl` logico; upload/storage real fica para rodada futura

## 2026-06-07 - W02A integrada a API tenant_checklist

- branch usada: `feature/tenant-checklists-frontend-api`
- objetivo: substituir mocks principais da W02A por chamadas reais aos endpoints backend de `tenant_checklist`
- criados `frontend/src/modules/checklists/checklist.adapter.ts`, `checklist.service.ts`, `checklist.mock.ts` e `index.ts`
- `TenantChecklistsPage.tsx` passou a carregar checklists e componentes via service, com loading, erro e estado vazio
- implementado fluxo basico de criar, editar, publicar e ativar/inativar checklist
- `frontend/src/services/api/client.ts` passou a aceitar headers `X-Role` e `X-Permissions`, preservando o padrao atual de tenant via headers enquanto JWT real nao e obrigatorio
- mocks ficam como fallback explicito de desenvolvimento quando `VITE_USE_MOCKS=true`
- mobile Flutter, Figma e backend nao foram alterados nesta rodada

## 2026-06-07 - W02A builder UI

- branch usada: `feature/tenant-checklists-builder-ui`
- objetivo: evoluir W02A para builder visual MVP conforme `FIGMA-CHECKLIST-BUILDER-UX.1`
- arquivos criados em `frontend/src/modules/checklists/components`: `ChecklistComponentPalette.tsx`, `ChecklistCanvas.tsx`, `ChecklistInspector.tsx`, `ChecklistSchemaPreview.tsx`, `ChecklistStatusBadge.tsx` e `NewChecklistForm.tsx`
- criados helpers `checklist.builder.ts` e `checklist.constants.ts`
- `TenantChecklistsPage.tsx` reorganizada para lista administrativa com busca/filtro, builder visual, preview de schema e publicacao
- ordenacao de componentes implementada por botoes subir/descer, sem drag-and-drop
- `pending_changes` e apenas estado visual derivado de checklist publicado alterado apos `publishedAt`; nao altera contrato backend
- backend, Prisma/migrations, Figma e mobile Flutter nao foram alterados
## 2026-06-07 - Padronizacao de navegacao RBAC

- branch usada: `feature/navigation-rbac-sidebar-standardization`
- objetivo: padronizar sidebar/navegacao por RBAC sem alterar backend, Prisma, migrations, API contracts, Figma ou mobile
- criado modelo unificado de navegacao com escopo, modo, permissoes, roles, status, icone, modulo/feature e filhos
- implementado filtro `canAccessNavigationItem`/`filterNavigationItems`
- sidebar tenant e Platform Console passaram a usar a mesma lista filtrada nos modos expandido e recolhido
- removida renderizacao de links planejados/desabilitados; usuario sem permissao nao ve item nem grupo vazio
- `PermissionProvider`, `PermissionGuard` e `PlatformGuard` alinhados ao contexto de roles/permissoes
- rotas Web operacionais receberam guards para impedir renderizacao por acesso direto sem permissao
- W02A mantida como rota administrativa dependente de `tenant_checklists:read`; operador nao ve W02A
- documentacao atualizada em `docs/rbac.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log

## 2026-06-07 - Hardening backend RBAC

- branch usada: `feature/backend-rbac-hardening`
- objetivo: reforcar autorizacao backend para Core SaaS, Platform Console e `tenant_checklist`, sem alterar frontend, Figma, Prisma/migrations, contratos API desnecessariamente, RLS, upload/storage ou mobile
- mapeamento inicial: Core SaaS ja usava `requirePermission` em tenants/users/roles/audit; Platform ja usava `requirePlatformPermission`; checklists ja exigiam permissoes por rota
- adicionado `requireAnyPermission([...])` no middleware RBAC existente, reaproveitando a resposta 403 padronizada
- adicionado `requirePlatformAdmin()` como helper semantico sobre `requirePlatformPermission("platform:tenants:read")`
- rotas `GET /api/v1/mobile/checklists/available` e `GET /api/v1/mobile/checklists/:checklistId/render` passaram a aceitar `checklist_runs:read` ou `checklist_runs:create`
- `POST /api/v1/users` deixou de aceitar `tenantId` do body como fonte de escopo e usa sempre o `tenantId` do contexto autenticado
- testes ampliados em `tests/core-saas.test.ts` e `tests/checklist-routes.test.ts`
- testes especificos executados durante a implementacao: `npm test`, `node --test --import tsx tests/checklist-routes.test.ts` e `node --test --import tsx tests/platform-routes.test.ts`
- documentacao atualizada em `docs/rbac.md`, `docs/api.md`, `docs/modules.md`, `agent-orchestration/docs/status-geral.md` e este log

## 2026-06-07 - PostgreSQL RLS tenant isolation

- branch usada: `feature/postgres-rls-tenant-isolation`
- objetivo: adicionar Row Level Security PostgreSQL como camada de defesa contra vazamento cross-tenant
- migration criada: `prisma/migrations/20260608000000_enable_tenant_rls/migration.sql`
- tabelas protegidas por RLS: `branches`, `users`, `local_auth_credentials`, `roles`, `user_role_assignments`, `audit_logs`, `checklist_templates`, `checklist_template_components`, `checklist_runs`, `checklist_run_answers`, `checklist_attachments`, `checklist_markers` e `checklist_acknowledgements`
- policies usam `current_setting('app.current_tenant_id', true)`
- policy de `roles` permite roles globais com `tenant_id IS NULL` e roles do tenant atual
- `FORCE ROW LEVEL SECURITY` aplicado para que os testes com usuario da aplicacao/owner provem isolamento real
- criado helper `src/database/rls.ts` com `setTenantRlsContext` e `withTenantRls`
- integrados contextos RLS em Core SaaS Prisma, auth local, RBAC persistido, repository Prisma de checklists e seed
- criado teste especifico `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/database.md`, `docs/architecture.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: frontend, Figma, contratos API desnecessarios, upload/storage, mobile e refatoracao ampla
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `git diff --check`
- observacao de validacao: o primeiro `npx prisma migrate status` antes do deploy apontou a nova migration pendente, como esperado; apos `npx prisma migrate deploy`, o status ficou atualizado
- observacao de teste: `DATABASE_URL` local usa `postgres`, que e superuser e bypassa RLS; por isso o teste especifico cria um papel temporario nao-superuser, concede acesso minimo, valida isolamento e remove o papel ao final

## 2026-06-07 - checklist attachments storage local

- branch usada: `feature/checklist-attachments-storage`
- objetivo: substituir anexos apenas logicos por upload/storage local real para evidencias de checklist, preservando tenant, RBAC, RLS e auditoria
- dependencia adicionada: `busboy` para parsing de `multipart/form-data`; dependencia dev adicionada: `@types/busboy`
- criado `src/modules/checklists/checklist-attachment.storage.ts`
- criado `storage/checklist-attachments/.gitkeep` e atualizado `.gitignore` para nao versionar arquivos enviados
- `.env.example` atualizado com `CHECKLIST_ATTACHMENT_STORAGE_DRIVER`, `CHECKLIST_ATTACHMENT_STORAGE_PATH`, `CHECKLIST_ATTACHMENT_MAX_SIZE_MB` e `CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES`
- `POST /api/v1/mobile/checklist-runs/:runId/attachments` agora aceita multipart com campo `file`, `componentId` e `metadata` opcional, mantendo o JSON legado com `fileUrl`
- criada rota `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download`
- arquivos locais recebem nome sanitizado, isolamento fisico por tenant/run, checksum SHA-256 e storage key logico; path absoluto nao e retornado na API
- auditoria adicionada: `checklist_run.attachment_uploaded`
- testes criados/alterados: `tests/checklist-attachments.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/api.md`, `docs/database.md`, `docs/architecture.md`, `docs/modules.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend, Figma, mobile Flutter e S3-compatible real

## 2026-06-07 - checklist attachments frontend integration

- branch usada: `feature/checklist-attachments-frontend-integration`
- objetivo: integrar o frontend ao upload/download real de anexos de checklist, preservando mocks e sem alterar backend
- arquivos criados: `frontend/src/modules/checklists/checklist-attachments.adapter.ts`, `checklist-attachments.service.ts`, `checklist-attachments.mock.ts`, `components/ChecklistAttachmentUploader.tsx`, `components/ChecklistAttachmentList.tsx` e `components/ChecklistEvidencePreview.tsx`
- `frontend/src/services/api/client.ts` atualizado para `FormData` multipart e download protegido via `Blob`
- `frontend/src/modules/checklists/types.ts` atualizado com tipos reais de `ChecklistAttachment`, upload, download e metadata
- `ChecklistSchemaPreview` agora sinaliza evidencias para componentes `photo_upload`, `before_after` e `damage_map`, sem transformar W02A em tela operacional
- `frontend/src/styles/app.css` atualizado para os novos componentes
- documentacao atualizada em `docs/api.md`, `docs/frontend-screens.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend, Prisma/migrations, Figma, mobile Flutter, S3-compatible real e fluxo operacional completo M10/M11/M12

## 2026-06-07 - W03 tenant settings menu UI

- branch usada: `feature/tenant-settings-menu-ui`
- objetivo: criar central visual de configurações do tenant em W03 sem alterar backend ou contratos
- criado modulo `frontend/src/modules/settings` com page, types, mock de categorias e barrel
- rota criada: `/administrator/settings`
- sidebar recebeu item `Configuracoes` com permissao frontend `tenant:manage`, modulo `tenant-admin` e roles administrativas
- pendencia documentada: `tenant_settings:read` ainda nao existe no catalogo backend
- categorias MVP: Geral, Aparência, Usuários e Acesso, Módulos e Checklists
- categorias planejadas: Notificações, Integrações e Segurança/Auditoria
- card Checklists aponta para W02A `/administrator/checklists`; W03 nao duplica builder
- temas exibidos como opções visuais planejadas: `enterprise_blue`, `tech_dark` e `green_operations`
- fora de escopo mantido: backend, Prisma/migrations, contratos API, Figma, mobile Flutter, tenant_checklist backend e persistência real de tema

## 2026-06-07 - alinhamento numeracao W03

- objetivo: corrigir referencias documentais conflitantes antes de PR/merge da branch `feature/tenant-settings-menu-ui`
- decisao oficial registrada: W03 e `Administrador — Configurações` em `/administrator/settings`
- W02A permanece `Administrador — Checklists`
- Dashboard/Resumo Financeiro nao usa W03; a entrada financeira foi renomeada no mapa para evitar conflito de numeracao
- documentos/logs revisados: `docs/09-mapa-telas-frontend.md`, `docs/frontend-screens.md`, `docs/modules.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, API, Figma, mobile e rota `/administrator/settings`

## 2026-06-07 - hardening JWT/session auth context

- objetivo: reduzir dependencia de headers legacy e consolidar JWT/Bearer como fonte principal do contexto autenticado
- branch usada: `feature/auth-jwt-session-hardening`
- mapeamento inicial confirmou login local tenant-scoped com JWT via `jose`, `JWT_SECRET`/`JWT_EXPIRES_IN`, middleware `attachAuthenticatedActor()` e fallback legacy via `resolveRequestActor()`
- `tenantContextMiddleware` passou a rejeitar actor `legacy_headers` em `NODE_ENV=production` com `403 FORBIDDEN` e reason `legacy_headers_disabled`
- regra preservada: Bearer token invalido, malformado ou expirado retorna `401 INVALID_TOKEN` antes de qualquer fallback
- fallback legacy segue ativo em desenvolvimento/teste para chamadas internas e testes existentes
- `tests/platform-routes.test.ts` cobre JWT com role de plataforma real e rejeicao de JWT tenant comum no boundary platform
- `tests/checklist-routes.test.ts` cobre bloqueio de headers legacy em producao para rota sensivel tenant-scoped
- `.env.example` atualizado para `JWT_SECRET="change-me-in-local-development"` e `JWT_EXPIRES_IN="1h"` sem segredo real
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/rbac.md`, `docs/architecture.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend amplo, Figma, mobile, OAuth/social login, refresh token complexo, Prisma/migrations e contratos API destrutivos

## 2026-06-07 - frontend login JWT

- branch usada: `feature/auth-frontend-login-integration`
- objetivo: integrar o frontend ao fluxo real `login -> Bearer token -> RBAC backend -> RLS PostgreSQL`, preservando mocks de desenvolvimento
- endpoint usado: `POST /api/v1/auth/login`
- criados `frontend/src/modules/auth/auth.adapter.ts`, `auth.service.ts` e `auth.storage.ts`
- `AuthProvider` passou a usar sessao armazenada, estado de autenticacao e logout simples
- `LoginPage` passa a enviar `tenantId`, e-mail e senha em modo real; em mock preserva dados demo
- `apiRequest`, `apiFormDataRequest` e `apiBlobRequest` enviam `Authorization: Bearer` automaticamente a partir do token armazenado
- headers legados sao enviados pelo API client apenas quando `VITE_USE_MOCKS=true`
- resposta `401` limpa a sessao local
- `ContextSelectionPage` e repository de contexto usam tenant/roles/permissoes derivados da sessao real quando mocks estao desativados
- `PermissionGuard`, `PlatformGuard`, `AppShell`, `Topbar` e `PlatformLayout` ajustados para auth state e logout simples
- `.env.example` recebeu `VITE_DEFAULT_TENANT_ID=""` como placeholder opcional, sem segredo
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, Figma, mobile Flutter, refresh token, revogacao remota e remocao brusca de mocks
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npx prisma validate`, `npx prisma generate` e `git diff --check`

## 2026-06-07 - frontend smoke flow tests

- branch usada: `feature/frontend-smoke-flow-tests`
- objetivo: adicionar cobertura smoke inicial para fluxo principal do frontend sem criar features novas
- estrategia verificada: frontend nao tinha Vitest, Testing Library, Playwright ou Cypress; escolhido `node:test` + `tsx` + `react-dom/server` para evitar dependencia pesada nesta rodada
- dependencia nova: nenhuma
- script criado em `frontend/package.json`: `test:smoke`
- helper criado: `frontend/src/config/env.ts` para leitura testavel de `VITE_API_BASE_URL`, `VITE_DEFAULT_TENANT_ID` e `VITE_USE_MOCKS`
- teste criado: `frontend/tests/smoke-flow.test.tsx`
- cobertura: auth.storage, auth.service real/mock, API client Bearer, ausencia de headers legacy em modo real, preservacao de FormData, sidebar/guards RBAC para W02A/W03/Platform, smoke render de `/login`, W02A, W03 e Platform Console, e anexos frontend
- documentacao atualizada em `docs/auth.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: backend, Prisma/migrations, contratos API, Figma, mobile Flutter e redesign

## 2026-06-07 - E2E critical flows

- branch usada: `feature/e2e-critical-flows`
- objetivo: adicionar testes E2E reais em navegador para fluxos criticos do ERP Techsolutions
- verificacao inicial: nao havia Playwright/Cypress nem script E2E no repositorio
- dependencia adicionada: `@playwright/test` na raiz do repositorio
- script criado: `npm run test:e2e`
- configuracao criada: `playwright.config.ts`
- seed usado: seed demo existente, idempotente, executado via `npm run db:seed` antes do Playwright
- spec criada: `tests/e2e/critical-flows.spec.ts`
- cobertura: login real/JWT, credenciais invalidas, guard de rota protegida, sessao em `localStorage`, sidebar RBAC tenant admin, W02A Checklists, W03 Configuracoes e bloqueio de Platform Console para usuario tenant
- artifacts ignorados: `playwright-report/`, `test-results/`, `frontend/playwright-report/` e `frontend/test-results/`
- pendencia registrada: acesso positivo ao Platform Console aguarda seed estavel de usuario platform
- fora de escopo mantido: backend funcional, Prisma/migrations, contratos API, Figma, mobile Flutter, redesign e remocao de mocks
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-07 - auth refresh/logout sessions

- branch usada: `feature/auth-session-refresh-logout`
- objetivo: implementar refresh token, rotacao, logout/revogacao backend, refresh-on-401 no frontend e cobertura de testes/documentacao
- migration criada: `prisma/migrations/20260609000000_add_auth_sessions/migration.sql`
- modelo Prisma criado: `AuthSession`, mapeado para `auth_sessions`, com FKs tenant/user, hash unico do refresh token, expiracao, revogacao, indices e RLS
- servicos criados: `src/modules/auth/repositories/auth-session.repository.ts` e `src/modules/auth/services/auth-session.service.ts`
- `src/modules/auth/services/jwt.service.ts` passou a assinar/verificar refresh token com secret/audience separados do access token
- `src/modules/auth/routes/auth.routes.ts` adicionou `POST /api/v1/auth/refresh` e `POST /api/v1/auth/logout`; login manteve compatibilidade e passou a retornar refresh/session aliases
- `.env.example` recebeu `JWT_REFRESH_SECRET` e `JWT_REFRESH_EXPIRES_IN`
- frontend atualizado em auth adapter/service/storage/types e API client para armazenar refresh token, renovar access token uma vez em `401` e chamar logout backend em best effort
- E2E passou a validar sessao com `refreshToken` e logout de usuario tenant
- testes criados/alterados: `tests/auth-session.test.ts`, `tests/auth-jwt.test.ts`, `tests/auth-login.test.ts`, `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/architecture.md`, `docs/database.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- decisoes: refresh token nunca e persistido em texto puro; refresh rotaciona token; logout e idempotente; frontend tenta refresh unico fora dos endpoints de auth; access tokens ja emitidos continuam validos ate expirarem
- fora de escopo mantido: cookie httpOnly, MFA, OAuth/social login, recuperacao de senha, Redis runtime, remocao definitiva dos headers legacy e revogacao imediata de access token ja emitido
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/platform-routes.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/auth-jwt.test.ts`, `node --test --import tsx tests/auth-session.test.ts` com `DATABASE_URL` local, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - platform admin seed E2E

- branch usada: `feature/platform-admin-seed-e2e`
- objetivo: criar seed local/dev estavel de Platform Admin e cobrir acesso positivo ao Console da Plataforma no Playwright
- mapeamento inicial: seed criava tenant demo, branch MAIN, admin demo, roles globais e credencial local apenas para `admin.demo@example.com`; nao havia usuario platform estavel
- `prisma/seed.ts` atualizado para criar/atualizar `platform.admin@erp.local` no tenant demo com role global `super_admin`
- senha local/dev do Platform Admin configurada por `E2E_PLATFORM_PASSWORD`, com fallback `platform-admin-dev-password`
- decisao: sem migration; o modelo atual exige `tenantId` no login local, entao o Platform Admin local pertence ao tenant demo apenas para autenticacao e usa role global `super_admin` para escopo platform
- `tests/e2e/critical-flows.spec.ts` passou a validar login Platform Admin, sessao com refresh token, shell `Console da Plataforma`, link `Tenants` e pagina P01 `/platform/tenants`
- teste existente de Tenant Admin bloqueado na Platform Console foi preservado
- documentacao atualizada em `.env.example`, `docs/auth.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `docs/github-workflow.md`, `agent-orchestration/docs/status-geral.md` e este log
- fora de escopo mantido: Figma, mobile Flutter, API contracts, Prisma migrations, refatoracao de auth e features novas de produto
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run db:seed`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - Redis job queue foundation

- branch usada: `feature/redis-job-queue-foundation`
- objetivo: criar fundacao inicial de mensageria interna com Redis para jobs, eventos, retry/backoff e dead-letter
- verificacao inicial: nao havia cliente Redis nem dependencia de filas; `docker-compose.yml` ja possuia `erp-redis` e `.env.example` ja possuia `REDIS_URL`
- dependencia nova: nenhuma; criado cliente Redis minimo sobre `node:net`
- criados `src/infra/redis/redis.client.ts`, `src/infra/jobs/job.types.ts`, `src/infra/jobs/job.queue.ts`, `src/infra/jobs/job.registry.ts`, `src/infra/jobs/job.worker.ts`, `src/infra/events/domain-event.types.ts` e `src/infra/events/domain-event.publisher.ts`
- jobs iniciais: `checklist-attachment-postprocess`, `notification-dispatch` e `audit-log-fanout`
- eventos iniciais: `auth.session.created`, `auth.session.revoked`, `checklist_run.created`, `checklist_run.completed`, `checklist_run.attachment_uploaded`, `checklist_run.divergence_reported`, `notification.requested` e `audit_log.created`
- integracao real escolhida: upload de anexo de checklist publica `checklist_run.attachment_uploaded` apos storage, banco e auditoria sincronicos
- falha de Redis no publish nao quebra upload critico no MVP; warning e registrado
- worker exposto por `JobWorker`/`startWorker`, sem inicializacao automatica no servidor
- documentacao criada: `docs/messaging.md`
- documentacao atualizada em `docs/architecture.md`, `docs/modules.md`, `docs/deployment.md`, `docs/github-workflow.md` e `agent-orchestration/docs/status-geral.md`
- testes criados: `tests/job-queue.test.ts` e `tests/domain-events.test.ts`
- fora de escopo mantido: Kafka, RabbitMQ, cloud queue, notificacoes reais, webhooks reais, frontend, Figma, mobile Flutter, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - audit log enhancements

- branch usada: `feature/audit-log-enhancements`
- objetivo: implementar melhorias enterprise no audit log sem alterar frontend amplo, Figma, mobile ou contratos destrutivos
- mapeamento inicial: `audit_logs` ja possuia `tenant_id`, `actor_user_id`, `action`, `entity`, `entity_id`, `metadata` e `created_at`; RLS ja estava habilitado na tabela
- decisao: nenhuma migration criada; campos enterprise adicionais ficam em `metadata`
- criado contrato em `src/modules/core-saas/audit/audit-log.types.ts`
- criado `EnterpriseAuditLogService` em `src/modules/core-saas/audit/audit-log.service.ts`
- criado helper `src/modules/core-saas/audit/audit-request-context.ts` para requestId/correlationId/IP/user-agent e auditoria best-effort de rotas
- sanitizacao recursiva redige tokens, refresh tokens, senhas, hashes, secrets, API keys e Authorization
- fluxos integrados: auth login/refresh/logout/sessao, `user.created`, `tenant.created`, `permission.denied` centralizado e auditoria de checklists
- nomes de checklists padronizados para `checklist_template.*`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`
- Redis/events: audit log persistido publica `audit_log.created` para `audit-log-fanout`; falha de Redis nao desfaz operacao principal
- documentacao criada: `docs/audit.md`
- documentacao atualizada em `docs/architecture.md`, `docs/database.md`, `docs/rbac.md`, `docs/modules.md`, `docs/messaging.md`, `docs/api.md` e `agent-orchestration/docs/status-geral.md`
- testes criados: `tests/audit-log.test.ts` e `tests/audit-security.test.ts`
- fora de escopo mantido: SIEM externo, exportacao, painel visual completo de auditoria, migrations, frontend amplo, Figma, mobile Flutter e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/audit-security.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `git diff --check`

## 2026-06-08 - checklist runtime web

- branch usada: `feature/checklist-runtime-web`
- objetivo: implementar runtime web operacional de execucao de checklists publicados usando schema vindo da API
- decisao de rota: `/operations/checklists` para lista operacional e `/operations/checklists/:checklistId/run` para execucao
- W02A `/administrator/checklists` preservada como builder/admin de templates
- endpoints `/mobile/*` reutilizados no web como runtime compartilhado web/mobile
- criados `frontend/src/modules/checklists/checklist-runtime.adapter.ts`, `checklist-runtime.service.ts` e `checklist-runtime.mock.ts`
- criadas paginas `ChecklistRunsPage.tsx` e `ChecklistRuntimePage.tsx`
- criados componentes `ChecklistRuntimeRenderer.tsx`, `ChecklistRuntimeField.tsx`, `ChecklistRunStatusBadge.tsx` e `ChecklistRunSummary.tsx`
- renderer MVP cobre `observation`, `vehicle_selector`, `acknowledgement`, `photo_upload`, `before_after`, `damage_map` e fallback para `comparison`
- anexos/evidencias reutilizam services/componentes existentes de upload/lista/download
- navegacao tenant adiciona `Checklists Operacionais` com `checklist_runs:read` ou `checklist_runs:create`; operador nao ve W02A sem `tenant_checklists:read`
- testes atualizados em `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend novo, migrations, Figma, mobile Flutter, offline, drag-and-drop, redesign amplo e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - checklist runtime web hardening

- branch usada: `feature/checklist-runtime-web-hardening`
- objetivo: endurecer o runtime web operacional sem redesign, sem backend novo e sem alterar contratos `/mobile/*`
- criada validacao client-side por schema em `frontend/src/modules/checklists/checklist-runtime.validation.ts`
- validacao bloqueia conclusao quando faltam campos obrigatorios, observacao, fotos, antes/depois, ciencia, seletor de veiculo ou markers exigidos
- UX aprimorada com progresso de obrigatorios, status do run, resumo lateral e mensagens de sucesso/falha
- `comparison` consulta endpoint de comparacao quando presente no schema e permite registrar divergencia com observacao obrigatoria e evidencia anexada
- `acknowledgement` usa texto configuravel do schema e chama endpoint de ciencia apenas quando o run esta `pending_acknowledgement`
- `before_after` separa evidencias por metadata `stage=before` e `stage=after`
- `damage_map` exige marker com tipo/descricao, envia marker ao endpoint real e permite remocao local da lista; exclusao persistente fica pendente de endpoint futuro
- mocks foram ajustados para publicar M11 de entrega/reboque e exercitar ciencia configuravel
- smoke e E2E ampliados para validar endpoints runtime, validacao por schema, tela de run e bloqueio de obrigatorios incompletos
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: mobile Flutter, Figma, offline, drag-and-drop, redesign amplo, backend novo, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - checklist attachments S3-compatible storage

- branch usada: `feature/checklist-attachments-s3-storage`
- objetivo: implementar storage configuravel local/S3-compatible para anexos de checklist, sem expor bucket, storage key, path privado ou URL interna na API
- dependencia adicionada: `@aws-sdk/client-s3`
- criados providers em `src/modules/checklists/storage`
- `checklist-attachment.storage.ts` passou a usar factory/provider e preserva aliases locais antigos
- DTO publico de attachment passa a retornar rota protegida de download para uploads gerenciados
- `.env.example` atualizado com `CHECKLIST_STORAGE_*`; valores S3 ficam vazios como placeholders
- documentacao atualizada em `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/storage.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md` e `agent-orchestration/docs/status-geral.md`
- testes adicionados/alterados: `tests/checklist-storage.test.ts` e `tests/checklist-attachments.test.ts`
- migration: nao criada; metadados internos continuam em `checklist_attachments.metadata`
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/checklist-storage.test.ts`, `node --test --import tsx tests/checklist-attachments.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/domain-events.test.ts` e `git diff --check`

## 2026-06-08 - notification foundation

- branch usada: `feature/notification-foundation`
- objetivo: implementar fundacao backend de notificacoes internas usando domain events e Redis/jobs
- criado modelo Prisma `Notification` e migration `20260610000000_add_notifications`
- RLS aplicada na tabela `notifications`
- criados service, repository memory/prisma, resolver de recipients, routes, controller, DTO e job handler em `src/modules/notifications`
- endpoint minimo criado para listar inbox propria, contar nao lidas, marcar uma/todas como lidas e arquivar
- RBAC atualizado com `notifications:read` e `notifications:update`
- `notification-dispatch` passou a criar notificacoes para `checklist_run.completed`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`
- `checklist_run.attachment_uploaded` permanece apenas com postprocess para evitar spam no MVP
- frontend completo, e-mail, SMS, WhatsApp, push externo e providers externos ficaram fora do escopo
- testes criados/alterados: `tests/notifications.test.ts`, `tests/notification-routes.test.ts`, `tests/domain-events.test.ts`, `tests/rls-tenant-isolation.test.ts` e `tests/core-saas.test.ts`
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/audit.md`, `docs/deployment.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/notifications.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - notifications UI

- branch usada: `feature/notifications-ui`
- objetivo: implementar interface web de notificacoes internas a partir da API backend ja existente
- criados `frontend/src/modules/notifications/notification.types.ts`, `notification.adapter.ts`, `notification.service.ts`, `notification.mock.ts` e `index.ts`
- criados componentes `NotificationList`, `NotificationCard`, `NotificationStatusBadge`, `NotificationSeverityBadge` e `NotificationUnreadBadge`
- criada pagina `NotificationsPage` em `/notifications`
- `frontend/src/App.tsx`, `AppShell`, `tenantNavigation`, mocks de auth/contexto, auth adapter, resolvedor de modulos e CSS foram atualizados
- sidebar e topbar exibem badge de nao lidas; contador atualiza ao montar e apos mark/read-all/archive, sem polling agressivo
- acoes implementadas: listar, filtrar, marcar uma como lida, marcar todas como lidas, arquivar e abrir `actionUrl` interna segura
- seguranca de UI: metadata completa, recipient, ids internos sensiveis, tokens/storage keys e URLs externas nao sao exibidos/navegados
- testes atualizados em `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/frontend-screens.md`, `docs/modules.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend amplo, migrations, e-mail, SMS, WhatsApp, push externo, chat, provider externo, polling agressivo, Figma e mobile Flutter
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## 2026-06-08 - cloud usage metering foundation

- branch usada: `feature/cloud-usage-metering-foundation`
- objetivo: implementar a fundacao de metering interno de uso cloud por tenant, preparando a ponte futura para custo AWS real, rateio, markup e cobranca cloud com lucro
- decisao registrada: Opcao B, metering interno por tenant + margem futura; esta branch mede uso, nao custo
- migration criada: `20260611000000_add_cloud_usage_metering`
- models Prisma adicionados: `CloudUsageEvent` e `CloudUsageDailyAggregate`
- tabelas criadas: `cloud_usage_events` e `cloud_usage_daily_aggregates`
- RLS aplicada nas duas tabelas por `tenant_id`, com checks de unidade/quantidade, indices por tenant/metrica/data e idempotencia MVP por `tenant_id + idempotency_key`
- modulo criado: `src/modules/cloud-usage`
- funcoes entregues: `recordUsageEvent`, `recordManyUsageEvents`, `aggregateDailyUsage`, `getTenantUsageSummary`, `getTenantUsageDaily` e `getPlatformUsageSummary`
- job criado: `cloud-usage.aggregate-daily`, idempotente por tenant/dia/metrica/unidade/origem, sem scheduler automatico nesta branch
- API Platform criada: `GET /api/v1/platform/cloud-usage/summary`, `GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary` e `GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily`
- RBAC atualizado com `platform:cloud-usage:read`; `tenant_admin` foi mantido sem permissao `platform:*`
- eventos integrados: checklist run created/completed/divergence/acknowledgement, attachment uploaded/downloaded, notification created e job executed
- metadata de metering sanitiza tokens, senhas, secrets, Authorization, storage key, bucket, path privado, body, payload e query sensivel
- documentacao criada/atualizada: `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/storage.md`, `docs/notifications.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: AWS CUR, AWS Cost Explorer, AWS Billing Conductor, custo monetario real, rateio de custo AWS, markup, fatura, pagamento, credenciais AWS reais e tela complexa
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/cloud-usage-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - AWS CUR cost import foundation

- branch usada: `feature/aws-cur-cost-import`
- objetivo: implementar a foundation para importar custo AWS CUR bruto, sem rateio, markup, fatura, pagamento, UI completa ou credenciais AWS reais
- migration criada: `20260612000000_add_aws_cur_cost_import`
- models Prisma adicionados: `CloudCostImport` e `CloudCostLineItem`
- tabelas criadas: `cloud_cost_imports` e `cloud_cost_line_items`
- decisao de isolamento: tabelas globais de plataforma, sem `tenant_id` e sem RLS por tenant; acesso protegido por `platform:cloud-costs:*`
- modulo criado: `src/modules/cloud-costs`
- parser criado para CSV simplificado de AWS CUR com fixture `tests/fixtures/aws-cur-sample.csv`
- importer deduplica linhas por `raw_line_hash` dentro do import, calcula `total_unblended_cost`, salva tags `Project`, `Environment`, `Tenant` e `Module`, e sanitiza metadata/error_message
- job criado: `aws-cur.import-cost-file`
- API Platform criada: `GET /api/v1/platform/cloud-costs/imports`, `GET /api/v1/platform/cloud-costs/imports/:importId`, `GET /api/v1/platform/cloud-costs/line-items`, `GET /api/v1/platform/cloud-costs/summary` e `POST /api/v1/platform/cloud-costs/imports/manual-csv`
- RBAC atualizado com `platform:cloud-costs:read` e `platform:cloud-costs:import`; `tenant_admin` permanece sem permissoes `platform:*`
- `.env.example` atualizado com variaveis passivas `AWS_CUR_*`, sem credenciais AWS
- documentacao criada/atualizada: `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: allocation/rateio, markup/margem, cobranca, fatura, gateway, UI completa, S3/Athena real obrigatorio, Cost Explorer, Billing Conductor e secrets reais
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/aws-cur-cost-routes.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - cloud cost allocation engine

- branch usada: `feature/cloud-cost-allocation-engine`
- objetivo: implementar motor de alocacao/rateio de custo cloud por tenant, sem markup, fatura, pagamento, UI completa ou AWS real adicional
- migration criada: `20260613000000_add_cloud_cost_allocation`
- models Prisma adicionados: `CloudCostAllocationRun` e `TenantCloudCostAllocation`
- tabelas criadas: `cloud_cost_allocation_runs` e `tenant_cloud_cost_allocations`
- decisao de isolamento: runs sao globais de plataforma; allocations possuem `tenant_id`, RLS por `app.current_tenant_id` e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-cost-allocation`
- engine cruza `cloud_cost_line_items`, `cloud_usage_daily_aggregates` e tenants conhecidos
- metodos entregues: `direct_tenant_tag`, `storage_usage_weight`, `download_usage_weight`, `api_request_weight`, `job_execution_weight`, `checklist_run_weight`; `equal_split` fica reservado e custo sem base confiavel fica em `total_unallocated_cost`
- API Platform criada: `GET /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId`, `POST /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations` e `GET /api/v1/platform/cloud-cost-allocations/summary`
- RBAC atualizado com `platform:cloud-cost-allocation:read` e `platform:cloud-cost-allocation:run`; `tenant_admin` permanece sem permissoes `platform:*`
- job criado: `cloud-cost-allocation.run`
- testes criados: `tests/cloud-cost-allocation.test.ts` e `tests/cloud-cost-allocation-routes.test.ts`
- testes atualizados: `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao criada/atualizada: `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - cloud charge markup rules

- branch usada: `feature/cloud-charge-markup-rules`
- objetivo: implementar motor de regras comerciais de cobranca cloud com markup/margem, sem fatura, pagamento, checkout, emissao fiscal, UI completa ou AWS real adicional
- migration criada: `20260614000000_add_cloud_charge_markup_rules`
- models Prisma adicionados: `CloudChargeRule`, `CloudChargeCalculationRun` e `TenantCloudCharge`
- tabelas criadas: `cloud_charge_rules`, `cloud_charge_calculation_runs` e `tenant_cloud_charges`
- decisao de isolamento: regras e runs sao globais de plataforma; charges possuem `tenant_id`, RLS por `app.current_tenant_id` e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-charges`
- engine consome `tenant_cloud_cost_allocations`, agrupa por tenant, seleciona regra comercial ativa e calcula `billable_cost`, markup, minimo mensal, arredondamento, `final_charge_amount`, `margin_amount` e `margin_percentage`
- metodos entregues: `percentage`, `fixed_multiplier`, `fixed_amount`, `minimum_monthly_charge`, `included_cloud_cost`, `nearest_cent`, `nearest_10_cents`, `nearest_real` e `ceil_real`
- API Platform criada: `GET/POST /api/v1/platform/cloud-charge-rules`, `GET/PATCH /api/v1/platform/cloud-charge-rules/:ruleId`, `GET/POST /api/v1/platform/cloud-charges/calculation-runs`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges` e `GET /api/v1/platform/cloud-charges/summary`
- RBAC atualizado com `platform:cloud-charge-rules:read`, `platform:cloud-charge-rules:write`, `platform:cloud-charges:read` e `platform:cloud-charges:calculate`; `tenant_admin` permanece sem permissoes `platform:*`
- job criado: `cloud-charges.calculate`
- testes criados: `tests/cloud-charge-markup-rules.test.ts` e `tests/cloud-charge-routes.test.ts`
- testes atualizados: `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao criada/atualizada: `docs/cloud-charge-markup-rules.md`, `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/cloud-charge-routes.test.ts`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## 2026-06-08 - platform cloud billing UI

- branch usada: `feature/platform-cloud-billing-ui`
- objetivo: implementar a interface web Platform Cloud Billing sem backend novo
- rota criada: `/platform/cloud-billing`
- abas criadas: Visao geral, Uso, Custos AWS, Rateio, Cobranca, Regras e Runs
- modulo frontend criado em `frontend/src/modules/platform/cloud-billing`
- menu Platform, `App.tsx`, mocks/auth e auth adapter atualizados para permissoes cloud
- CSS atualizado para layout responsivo da tela e tabela visivel em mobile dentro da pagina
- smoke test atualizado para navegacao RBAC, adapter/endpoints e render SSR da tela
- E2E atualizado para Platform Admin acessar o menu e a rota Cloud Billing
- documentacao atualizada em `docs/platform-cloud-billing-ui.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/platform-console.md`, `docs/modules.md`, `docs/api-screen-endpoints.md`, `docs/api.md`, `docs/rbac.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: backend, migrations, fatura, pagamento, checkout, emissao fiscal, mobile Flutter, Figma e exposicao tenant de custo/preco/margem
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts` e `git diff --check`

## 2026-06-09 - backend navigation menu registry

- branch usada: `feature/backend-navigation-menu-registry`
- objetivo: implementar registry backend de navegacao para o frontend consumir via API, mantendo o menu como UX e nao como autorizacao real
- comandos iniciais executados: `git branch --show-current`, `git status` e `git log --oneline --decorate -5`
- branch confirmada: `feature/backend-navigation-menu-registry`
- worktree inicial confirmado limpo
- modulo criado: `src/modules/navigation`
- endpoint criado: `GET /api/v1/navigation/menu`
- app atualizado para registrar `/api/v1/navigation` com `attachAuthenticatedActor()`
- filtros implementados: permissoes, boundary Platform/Tenant, modulos habilitados do tenant e `scope`
- registry inicial criado com grupos `platform`, `tenant`, `operations`, `logistics` e `finance`
- permissoes planejadas adicionadas ao catalogo central para sustentar itens de navegacao sem ids inexistentes
- seed Prisma atualizado com descricoes das permissoes planejadas para manter `npm run db:seed` e E2E consistentes com o catalogo
- testes criados: `tests/navigation-menu.test.ts` e `tests/navigation-menu-routes.test.ts`
- documentacao criada/atualizada: `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/iconography-and-tags.md`, `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: frontend novo, Google Maps real, localizacao de operador, Work Orders backend, logistica backend, billing/payment/fiscal tenant-scoped, CRUD persistido de menu e remocao dos menus atuais do frontend
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## 2026-06-09 - frontend navigation menu consumer

- branch usada: `feature/frontend-navigation-menu-consumer`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada: `feature/frontend-navigation-menu-consumer`
- worktree inicial confirmado limpo
- modulo criado: `frontend/src/modules/navigation`
- service criado para `GET /api/v1/navigation/menu`
- adapter criado para normalizar resposta backend, ordenar itens, mapear icones `lucide-react`, preservar status/permissoes/children e usar fallback `Circle`
- hook criado: `useNavigationMenu`
- fallback local criado com `navigation.mock.ts`, reutilizando menus locais apenas como fallback/mock
- fallback local tambem cobre resposta backend vazia enquanto a persistencia de modulos do tenant nao estiver completa em seeds/ambientes locais
- `PlatformLayout` atualizado para consumir `scope=platform`
- `AppShell` e `Sidebar` atualizados para consumir o menu backend/fallback e renderizar grupos `platform`, `tenant`, `operations`, `logistics` e `finance`
- smoke test atualizado para adapter/service; E2E atualizado para aguardar chamadas reais ao endpoint de navegacao
- documentacao atualizada em `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/iconography-and-tags.md`, `docs/platform-console.md`, `docs/modules.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: novas telas, Google Maps, localizacao, backend, novos endpoints e remocao completa do fallback local
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## 2026-06-09 - field operator location foundation

- branch usada: `feature/field-operator-location-foundation`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada e worktree inicial limpo
- migration criada: `prisma/migrations/20260615000000_add_field_operator_locations/migration.sql`
- schema Prisma atualizado com `FieldOperatorLocation` e relacoes em `Tenant`/`User`
- modulo criado: `src/modules/field-location`
- app atualizado para montar `createFieldLocationRouter()`
- endpoints implementados: `POST /api/v1/mobile/field-locations`, `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- validacoes de entrada implementadas: coordenadas, precisao, heading, velocidade, bateria, data e source
- DTO publico nao retorna metadata bruta de localizacao
- auditoria best-effort adicionada para envio e consulta de historico
- RBAC atualizado para distribuir permissao de envio/leitura/historico aos papeis operacionais adequados
- registry de navegacao atualizado para marcar `/operations/map` como `backend-ready` e registrar endpoints relacionados
- catalogo de modulos Platform atualizado com `field_operations`
- teste focado `tests/field-location-routes.test.ts` criado e executado com sucesso durante a implementacao
- teste RLS atualizado para incluir `field_operator_locations`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/database.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/02-mapa-modulos.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: Google Maps, tela `/operations/map`, app Flutter, roteirizacao avancada, Work Orders completas, despacho completo e coleta real mobile

## 2026-06-09 - operations map UI

- branch usada: `feature/operations-map-ui`
- comandos iniciais executados: `git branch --show-current`, `git status --short --branch` e `git log --oneline --decorate -5`
- branch confirmada: `feature/operations-map-ui`
- modulo frontend criado em `frontend/src/modules/operations/map`
- pagina criada: `OperationsMapPage`, rota `/operations/map`, guard `field_location:read`
- service criado para consumir somente `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- adapter criado para normalizar DTO snake_case/camelCase, descartar coordenadas invalidas e marcar stale acima de 15 minutos
- mock/fallback criado para `VITE_USE_MOCKS=true`, API vazia ou falha de rede/autorizacao
- componentes criados: filtros, KPIs, mapa placeholder, status badge, lista de operadores e detalhe
- menu local/fallback atualizado com `field_operations`; contexto mock recebeu `field_location:read`, `field_location:history` e modulo `field_operations`
- `.env.example` atualizado com placeholder vazio `VITE_GOOGLE_MAPS_API_KEY=""`, sem credencial real
- smoke test atualizado para navegacao, adapter, service e renderizacao SSR da tela
- E2E atualizado com fluxo direto em `/operations/map`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/backend-navigation-menu.md`, `docs/platform-console.md`, `docs/09-mapa-telas-frontend.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: Google Maps real, app Flutter, WebSocket, Work Orders completas, despacho completo, roteirizacao avancada, novos endpoints e backend novo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## 2026-06-09 - work orders foundation

- branch usada: `feature/work-orders-foundation`
- comandos iniciais executados: `git branch --show-current`, `git status` e `git log --oneline --decorate -5`
- branch confirmada e worktree inicial limpo
- migration criada: `prisma/migrations/20260616000000_add_work_orders/migration.sql`
- schema Prisma atualizado com `WorkOrder`, `WorkOrderEvent` e `WorkOrderAssignment`
- modulo criado: `src/modules/work-orders`
- rotas registradas em `src/app.ts`
- endpoints implementados: `GET /api/v1/work-orders`, `POST /api/v1/work-orders`, `GET /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId/status`, `POST /api/v1/work-orders/:workOrderId/assign` e `GET /api/v1/work-orders/:workOrderId/timeline`
- validators implementados para titulo, prioridade, status, transicoes, coordenadas, datas, UUIDs, limit/offset e busca
- RBAC atualizado com `work_orders:read`, `work_orders:create`, `work_orders:update`, `work_orders:assign`, `work_orders:status`, `work_orders:cancel` e `work_orders:delete`
- eventos/timeline implementados: `work_order_created`, `work_order_updated`, `work_order_assigned`, `work_order_status_changed`, `work_order_cancelled` e `work_order_completed`
- auditoria best-effort adicionada para criacao, atualizacao, atribuicao, mudanca de status, cancelamento e conclusao
- navigation registry atualizado para `operations.workOrders` como `backend-ready`
- testes criados/atualizados: `tests/work-orders.test.ts`, `tests/work-orders-routes.test.ts`, `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/work-orders.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/backend-navigation-menu.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `RBAC_MATRIX.md` e `agent-orchestration/docs/status-geral.md`
- fora de escopo mantido: UI completa de Work Orders, despacho avancado, roteirizacao, comissao, pagamento de prestador, app Flutter, Google Maps real, fotos/assinaturas especificas de OS, estoque/pecas e integracao externa
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/work-orders.test.ts`, `node --test --import tsx tests/work-orders-routes.test.ts`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`
