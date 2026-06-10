# Status Geral

## Resumo

Repositorio organizado com base no GitHub oficial e na documentacao v1 enviada nesta sessao.

## Entregas realizadas

- importacao da documentacao de produto v1
- adicionados arquivos-base de governanca
- adicionada estrutura `agent-orchestration/`
- adicionada fundacao tecnica minima em Node.js + TypeScript
- registrada e consolidada divergencia arquitetural entre memoria historica e repositorio atual (baseline vigente: Node.js + TypeScript)

## Riscos e pendencias

- validacao final da stack de backend
- dependencias Node instaladas localmente, incluindo Prisma ORM
- ainda nao ha push remoto desta organizacao pelo bloqueio de rede do container

## Proximo passo objetivo

Iniciar implementacao do core SaaS do MVP competitivo.

## Atualizacao 2026-05-21 - Bloco 02 Core SaaS + RBAC

### Implementado

- criado modulo `src/modules/core-saas/` com separacao por `routes`, `services`, `store`, `types`, `permissions` e `middleware`
- criado catalogo inicial de permissoes: `tenant.manage`, `users.manage`, `users.read`, `roles.manage`, `audit.read`, `os.manage`, `os.read`, `inventory.manage`, `inventory.read`, `finance.manage`, `finance.read`
- definidos roles padrao `super_admin`, `tenant_admin`, `manager`, `technician` e `viewer`
- preservados roles legados ja usados no repositorio para nao quebrar comportamento existente
- implementado `tenantContextMiddleware` baseado em headers de tenant, usuario, role e permissoes
- implementado middleware `requirePermission(permission)` com resposta 403 padronizada
- adicionados endpoints protegidos para `tenants`, `users`, `roles` e leitura inicial de auditoria
- reforcado isolamento multi-tenant nos endpoints: listagens retornam apenas dados do tenant do contexto e acesso cruzado retorna 403
- criada auditoria minima em memoria com `action`, `actor_user_id`, `tenant_id` e `timestamp`
- ampliados testes de Core SaaS/RBAC para acesso permitido, acesso negado, isolamento por tenant, permission mismatch, role sem permissao e cross-tenant denied

### Limitacoes atuais

- store ainda e em memoria, com interface preparada para substituicao futura por PostgreSQL
- autenticacao real ainda nao existe; o contexto de tenant/usuario/role vem de headers internos para viabilizar o bloco de autorizacao
- auditoria ainda nao possui persistencia, retencao, correlacao de request ou trilha imutavel
- permissoes de OS, estoque e financeiro ja existem no catalogo, mas seus modulos de dominio ainda nao foram implementados

### Proximos passos

- substituir contexto por claims autenticadas quando o modulo de auth for iniciado
- criar repositorios PostgreSQL para tenants, users, roles e audit events
- evoluir auditoria com request_id, ip/origem, payload resumido e politica de retencao
- aplicar o mesmo padrao RBAC aos proximos modulos operacionais

## Atualizacao 2026-05-21 - Bloco 03 PostgreSQL + Prisma

### Implementado

- instalado Prisma ORM e Prisma Client para PostgreSQL
- criada configuracao `prisma.config.ts` compativel com Prisma 7
- criado `prisma/schema.prisma` com modelos iniciais `Tenant`, `Branch`, `User`, `Role`, `Permission`, `RolePermission` e `AuditLog`
- criada migration versionada `prisma/migrations/20260521000000_init_core_saas/migration.sql`
- criado seed inicial com tenant demo, filial principal, permissoes, roles padrao, usuario admin demo sem senha e evento de auditoria
- criado singleton `src/database/prisma.ts` usando adapter PostgreSQL
- adicionados repositories Prisma iniciais para tenant, user, role e audit log
- criado `docs/database.md` com decisao tecnica, modelo shared-schema e plano de transicao
- atualizado `.env.example` com `DATABASE_URL` placeholder local
- adicionados scripts `db:generate`, `db:migrate`, `db:seed` e `db:studio`

### Limitacoes atuais

- as rotas continuam usando store em memoria para manter transicao segura e nao quebrar o backend atual
- migrations nao foram aplicadas contra banco real nesta etapa
- `DATABASE_URL` real nao foi criado nem versionado
- o usuario admin demo nao possui senha; autenticacao real sera bloco futuro
- ainda nao ha tabela de atribuicao persistente entre usuarios e roles

### Proximos passos

- aplicar migration em PostgreSQL local ou ambiente de desenvolvimento controlado
- criar atribuicao persistente de roles para usuarios
- trocar gradualmente services/rotas para repositories Prisma
- ampliar testes de repositories com banco isolado de teste

## Atualizacao 2026-05-21 - Hardening de dependencias

### Vulnerabilidades analisadas

- `@hono/node-server < 1.19.13`, severidade moderada, advisory `GHSA-92pp-h63x-v22m`
- cadeia afetada: `prisma` -> `@prisma/dev` -> `@hono/node-server`
- dependencia direta afetada: `prisma`
- dependencia vulneravel direta no grafo: `@hono/node-server`, transitiva
- `npm audit fix` sem `--force` nao corrigiu; o audit sugeria `npm audit fix --force` com downgrade/breaking para `prisma@6.19.3`

### Correcoes aplicadas

- adicionado override seguro de patch para `@hono/node-server@1.19.13`
- movido `prisma` para `devDependencies`, pois e ferramenta de CLI/migrations e nao dependencia runtime do servidor
- mantidos `@prisma/client`, `@prisma/adapter-pg` e `dotenv` em dependencies por uso em runtime/repositories/Prisma Client
- removido `pg` como dependencia direta; ele permanece no lock como dependencia transitiva de `@prisma/adapter-pg`
- `npm audit` passou sem vulnerabilidades

### Avisos restantes

- `npm install` ainda emite `EBADENGINE` para `@prisma/streams-local@0.1.2`, dependencia transitiva de `@prisma/dev`, que declara Node `>=22.0.0`
- nao foi feito downgrade do Prisma nem elevacao do engine do projeto porque o backend atual esta em Node 20 e os comandos `prisma validate`, `prisma generate`, `npm run check` e `npm test` passam nesse ambiente
- remover totalmente esse aviso exige aguardar ajuste upstream do Prisma 7, migrar o projeto para Node 22, ou avaliar downgrade planejado do Prisma com mudancas de schema/config

## Atualizacao 2026-05-26 - Bloco 04A Infra local minima

### Implementado

- docker-compose local adicionado com PostgreSQL 16 e Redis 7
- volumes nomeados, healthchecks e network propria configurados para desenvolvimento local
- `.env.example` ampliado com `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, expiracao JWT e CORS local
- CI inicial criado em `.github/workflows/ci.yml` com geracao do Prisma Client, `check`, `test` e `build`
- criado `docs/deployment.md` com fluxo local de infraestrutura, migrations, seed e validacao
- criado `docs/github-workflow.md` com padrao de branches, commits, PR e checklists
- README atualizado com instrucoes locais de Docker Compose, backend, banco e frontend existente

### Limitacoes

- auth real ainda nao implementada
- rotas ainda podem usar store em memoria
- Redis ainda pode nao estar integrado ao runtime
- deploy produtivo ainda nao configurado

### Proximos passos

- criar UserRole persistente
- aplicar migrations em banco local
- trocar gradualmente Core SaaS para repositories Prisma
- iniciar auth local tenant-scoped

## Atualizacao 2026-05-27 - Bloco 04B.1 UserRole persistente

### Implementado

- criado vinculo persistente entre usuarios e papeis via `user_role_assignments`
- adicionada migration `user_role_assignments` com FKs, indices tenant-scoped e indice unico parcial para atribuicoes globais
- seed atualizado para atribuir o papel `tenant_admin` ao admin demo sem criar senha ou auth real
- criado repository de atribuicao de papeis com filtros obrigatorios por `tenant_id`
- atualizados repositories de usuario e papel com consultas auxiliares de assignments persistidos
- documentacao do banco atualizada com regras de RBAC persistente e escopo opcional por filial
- criado teste manual de repository Prisma dependente de `DATABASE_URL` local migrado

### Limitacoes

- rotas ainda podem usar store em memoria
- auth real ainda nao implementada
- `PrismaCoreSaasStore` completo ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- criar `PrismaCoreSaasStore`
- trocar `CoreSaasRegistry` gradualmente para Prisma
- manter isolamento multi-tenant em todas as queries
- iniciar auth local tenant-scoped depois da persistencia do core

## Atualizacao 2026-05-27 - Bloco 04B.2 Prisma Core SaaS Store

### Implementado

- criada base Prisma assíncrona para Core SaaS
- criada interface `AsyncCoreSaasStore`
- criado `PrismaCoreSaasStore` baseado nos repositories Prisma existentes
- criado `PrismaCoreSaasService` paralelo ao `CoreSaasRegistry`
- mantido `InMemoryCoreSaasStore` para compatibilidade dos testes unitarios e runtime atual
- reforçado isolamento por tenant em listagens de usuarios, auditoria e atribuicoes de papeis
- ampliado teste Prisma separado com PostgreSQL local para cobrir service persistente
- documentacao do banco atualizada com a diferenca entre store em memoria e camada Prisma async

### Limitacoes

- rotas ainda podem usar store em memoria
- auth real ainda nao implementada
- RLS ainda nao implementado
- teste Prisma ainda depende de PostgreSQL local fora do `npm test`
- alternancia por variavel de ambiente ainda nao implementada

### Proximos passos

- criar alternancia controlada por variavel de ambiente
- migrar rotas core para Prisma gradualmente
- iniciar auth local tenant-scoped depois da persistencia do core
- planejar RLS como safety net posterior

## Atualizacao 2026-05-27 - Bloco 04B.2A Transacoes Core SaaS Prisma

### Implementado

- operacoes compostas do `PrismaCoreSaasStore` endurecidas com `prisma.$transaction`
- `createUser` + role assignments + audit log agora sao atomicos: se qualquer etapa falhar, nada persiste
- `createTenant` + audit log agora sao atomicos: tenant e auditoria criados na mesma transacao
- todos os repositories atualizados para aceitar `PrismaClient | Prisma.TransactionClient` (`PrismaExecutor`)
- `PrismaCoreSaasStore` recebe `prismaClient: PrismaClient` como primeiro parametro para suporte a `$transaction`
- dentro das transacoes, repositories sao instanciados com o `tx` client — sem criar novo `PrismaClient`
- `saveAuditEvent` isolado continua funcionando fora de transacao (sem alteracao de comportamento)
- `PrismaCoreSaasService` passa `actorUserId` para as operacoes compostas e nao chama mais `recordAudit` standalone apos creates
- testes Prisma atualizados: instanciacao do store corrigida, novos testes de rollback e atomicidade adicionados
- `docs/database.md` atualizado com decisao tecnica de transacoes, operacoes atomicas e limitacoes

### Testes adicionados

- `createUser rolls back when branch belongs to another tenant` — verifica que nenhum usuario persiste se branch assignment falhar
- `createUser rolls back when role belongs to another tenant` — verifica rollback quando role nao e acessivel ao tenant
- `createTenant creates tenant and audit atomically` — verifica que audit log existe apos criacao de tenant
- `createUser creates user.created audit with actor when actor is valid` — verifica rastreabilidade de ator e role global

### Limitacoes

- rotas REST ainda podem usar store em memoria
- alternancia por variavel de ambiente (`CORE_SAAS_PERSISTENCE`) ainda nao implementada
- `actor_user_id` em `createTenant` e sempre `null` ate que auth real seja implementada
- auth real ainda nao implementada
- RLS ainda nao implementado
- teste Prisma ainda roda separado do `npm test`

### Proximos passos

- criar alternancia controlada por `CORE_SAAS_PERSISTENCE` [CONCLUIDO no Bloco 04B.2B]
- migrar rotas core gradualmente para Prisma
- planejar auth local tenant-scoped
- planejar RLS como safety net posterior

## Atualizacao 2026-05-27 - Bloco 04B.2B Alternancia de persistencia Core SaaS

### Implementado

- adicionada variavel `CORE_SAAS_PERSISTENCE` ao schema Zod de env (memory | prisma, padrao: memory)
- documentado `CORE_SAAS_PERSISTENCE=memory` no `.env.example`
- criada interface async unificada `ICoreSaasService` em `src/modules/core-saas/services/core-saas-service.interface.ts`
- criado `MemoryCoreSaasAdapter` em `src/modules/core-saas/services/memory-core-saas.adapter.ts` encapsulando `CoreSaasRegistry` com assinaturas async
- criada factory `createCoreSaasService()` em `src/modules/core-saas/core-saas-runtime.ts`, reexportada pelo barrel `src/modules/core-saas/index.ts`, controlada por `CORE_SAAS_PERSISTENCE`
- `PrismaCoreSaasService` carregado via `import()` dinamico apenas no modo `prisma` — nunca carregado no caminho memory
- rotas Core SaaS (`tenants`, `users`, `audit`, `roles`) convertidas para async usando `handleAsyncRoute` e tipadas com `ICoreSaasService`
- adicionado `handleAsyncRoute` em `routes/http.ts` sem remover `handleRoute` sincrono existente
- `src/app.ts` refatorado: `createApp(service: ICoreSaasService)` criado; `export const app` preservado em modo memory usando o mesmo singleton `coreSaasService` dos testes
- `src/server.ts` atualizado: `async function main()` inicializa o service via factory antes de criar o app; `coreSaasPersistence` registrado no log de startup
- `PrismaCoreSaasService.listRoles` e `getRoleDefinition` convertidos para `async` para implementar `ICoreSaasService`
- criado `tests/core-saas-runtime.test.ts` unitario sem dependencia de PostgreSQL
- `docs/database.md` atualizado com secao de alternancia, arquitetura e decisoes tecnicas
- frontend intocado

### Limitacoes

- Prisma ainda nao e default
- auth real ainda nao implementada
- RLS ainda nao implementado
- Redis runtime ainda nao implementado
- teste Prisma segue separado do `npm test`
- modo `prisma` deve ser validado em ambiente controlado antes de producao

### Proximos passos

- testar servidor real com `CORE_SAAS_PERSISTENCE=prisma` em ambiente com PostgreSQL migrado
- corrigir eventuais diferencas de comportamento entre os modos
- iniciar auth local tenant-scoped
- planejar RLS como safety net posterior

## Atualizacao 2026-05-28 - Bloco 04B.3 Validacao runtime Prisma

### Implementado

- criada documentacao operacional em `docs/core-saas-runtime.md`
- documentados comandos para preparar PostgreSQL local, gerar Prisma Client, aplicar migrations e executar seed
- documentados comandos para iniciar servidor real em `memory` e `prisma`
- documentados headers minimos para testar rotas protegidas
- runtime `memory` validado localmente em 2026-06-01 com `CORE_SAAS_PERSISTENCE=memory`, `DATABASE_URL` vazio e `PORT=3101`
- runtime `prisma` validado localmente em 2026-06-01 com `CORE_SAAS_PERSISTENCE=prisma`, `DATABASE_URL` local e `PORT=3102`
- endpoints validados em `memory`: `GET /api/v1/health`, `GET /api/v1/users`, `GET /api/v1/roles`
- endpoints validados em `prisma`: `GET /api/v1/health`, `GET /api/v1/users`, `GET /api/v1/roles`, `GET /api/v1/audit-events`
- Prisma continua modo controlado
- `memory` continua default
- frontend intocado

### Diferencas observadas

- `/users` em `memory` retornou lista vazia em servidor recem-iniciado, pois nao ha seed automatico em memoria
- `/users` em `prisma` retornou o admin demo persistido pelo seed
- `/audit-events` em `prisma` retornou eventos persistidos de execucoes anteriores do seed
- nenhuma diferenca observada exigiu correcao de codigo nesta etapa

### Limitacoes

- auth real ainda nao implementada
- Redis runtime ainda nao implementado
- RLS ainda nao implementado
- Prisma ainda nao e default
- RBAC real ainda usa headers internos para simular contexto autenticado

### Proximos passos

- corrigir diferencas entre memory e prisma que forem classificadas como bugs
- iniciar auth local tenant-scoped
- planejar RBAC real usando roles persistidas
- planejar RLS como safety net

## Atualizacao 2026-05-28 - Bloco 04B.4 Alinhamento memory/prisma

### Implementado

- diferencas entre `memory` e `prisma` revisadas
- contrato HTTP documentado em `docs/core-saas-runtime.md`
- criado teste DB-free `tests/core-saas-contract.test.ts` para validar envelopes HTTP em runtime memory
- `seed.initialized` avaliado em `prisma/seed.ts`
- seed ajustado para nao criar novo `seed.initialized` quando ja existir evento para o tenant demo
- `memory` mantido volatil por padrao, sem seed automatico no startup
- Prisma continua modo controlado por `CORE_SAAS_PERSISTENCE=prisma`
- `memory` continua default
- validacao manual com servidor real confirmou envelopes compativeis em `memory` e `prisma`
- contagem local de `seed.initialized` permaneceu 7 antes/depois de `npm run db:seed`, confirmando idempotencia para novas execucoes
- frontend intocado

### Diferencas confirmadas

- `memory` recem-iniciado pode retornar `data: []` em `/users`
- `prisma` retorna usuarios persistidos pelo seed demo
- bancos locais que ja tiveram seeds anteriores podem conter multiplos `seed.initialized` historicos
- apos o ajuste, novas execucoes do seed nao devem criar duplicidade de `seed.initialized` para o tenant demo
- os dados nao precisam ser iguais entre runtimes; o contrato HTTP deve ser compativel

### Limitacoes

- auth real ainda nao implementada
- headers internos ainda simulam autenticacao
- Redis runtime ainda nao implementado
- RLS ainda nao implementado
- Prisma ainda nao e default

### Proximos passos

- iniciar auth local tenant-scoped
- substituir headers internos por sessao/token
- aplicar RBAC real usando roles persistidas
- planejar RLS como safety net

## Atualizacao 2026-05-28 - Bloco 04C.1 Auth credentials foundation

### Implementado

- criada base persistente `local_auth_credentials`
- adicionada migration versionada para credenciais locais
- senha armazenada apenas como hash versionado `scrypt-v1`
- credenciais vinculadas a `tenant_id` e `user_id`
- FK composta `tenant_id + user_id` garante que a credencial pertence a usuario do mesmo tenant
- criado modulo `src/modules/auth/` com repository, service, tipos e password service
- seed admin demo atualizado para criar/atualizar credencial local
- `.env.example` documenta `DEMO_ADMIN_PASSWORD` apenas para desenvolvimento local
- criados testes unitarios de hash, verificacao, validacao minima e normalizacao de email
- criado teste Prisma separado para isolamento tenant-scoped, duplicidade e verificacao de senha
- login/JWT ainda nao implementados
- headers internos ainda temporarios

### Limitacoes

- ainda nao existe endpoint de login
- ainda nao existe JWT
- headers simulados continuam
- RBAC real ainda nao substituiu `x-role`/`x-permissions`
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- implementar login local tenant-scoped
- emitir access token
- criar middleware authenticated actor
- usar roles persistidas para RBAC

## Atualizacao 2026-05-28 - Bloco 04C.2 Login local tenant-scoped

### Implementado

- criado endpoint `POST /api/v1/auth/login`
- endpoint valida `tenantId`, `email` e `password`
- login usa credenciais locais persistidas por tenant
- senha e verificada pelo `PasswordService` existente (`scrypt-v1`)
- resposta de sucesso nao inclui `password_hash`
- resposta de sucesso nao inclui `access_token` nem `refresh_token`
- credenciais invalidas retornam erro publico generico `INVALID_CREDENTIALS`
- body invalido retorna `400 Bad Request`
- roles persistidas do usuario sao retornadas na resposta
- auditoria simples de login implementada com `auth.login.success` e `auth.login.failed`
- headers simulados continuam ativos e nao foram substituidos

### Limitacoes

- JWT ainda nao implementado
- refresh token ainda nao implementado
- sessao persistente ainda nao implementada
- headers simulados continuam
- RBAC real ainda nao substitui `x-role`/`x-permissions`
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- emitir JWT access token
- criar middleware authenticated actor
- substituir headers simulados gradualmente
- usar roles persistidas para RBAC

## Atualizacao 2026-06-01 - Bloco 04C.3 JWT access token

### Implementado

- login local tenant-scoped passa a emitir `access_token` JWT assinado
- resposta de sucesso inclui `token_type: Bearer` e `expires_in` em segundos
- criado service utilitario para assinar e verificar access tokens
- adicionadas variaveis `JWT_SECRET` e `JWT_EXPIRES_IN` ao schema de env
- `JWT_SECRET` e obrigatorio em `NODE_ENV=production` e nao usa segredo real versionado
- payload minimo contem `sub`, `tenant_id`, `email`, `roles`, `type`, `iat`, `exp`, `iss` e `aud`
- resposta e payload continuam sem `password_hash`, senha ou `refresh_token`
- headers simulados continuam ativos e nao foram substituidos
- middleware JWT obrigatorio ainda nao foi plugado nas rotas protegidas
- frontend intocado

### Limitacoes

- refresh token ainda nao implementado
- sessao/cookie ainda nao implementados
- logout ainda nao implementado
- rotacao/revogacao de token ainda nao implementadas
- Redis runtime ainda nao implementado
- RLS ainda nao implementado
- headers simulados ainda existem

### Proximos passos

- criar middleware authenticated actor
- validar `Authorization: Bearer`
- substituir headers simulados gradualmente
- implementar refresh token em bloco separado
- usar roles persistidas para RBAC real

## Atualizacao 2026-06-01 - Bloco 04C.4 Middleware authenticated actor

### Implementado

- criado middleware opcional para resolver `Authorization: Bearer`
- `request.actor` preparado para actor autenticado por JWT
- actor JWT contem `userId`, `tenantId`, `email`, `roles` e `authType: jwt`
- token valido popula `request.actor`
- token invalido, malformado ou expirado retorna `401 INVALID_TOKEN` quando o middleware e usado
- ausencia de `Authorization` nao bloqueia o fluxo opcional
- criado helper preparatorio para resolver actor JWT ou fallback de headers simulados
- headers simulados foram preservados
- JWT ainda nao e obrigatorio globalmente
- rotas Core SaaS nao foram migradas massivamente nesta rodada
- frontend intocado

### Limitacoes

- middleware ainda e preparatorio e apenas exportado pelo modulo auth
- rotas Core SaaS ainda podem usar headers simulados
- RBAC real ainda nao substituiu `x-role`/`x-permissions`
- refresh token, logout e revogacao ainda fora do escopo
- sessao/cookie ainda nao implementados
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- plugar actor middleware em rotas protegidas
- migrar autorizacao para actor JWT
- implementar RBAC real persistido
- planejar refresh token/logout em blocos separados

## Atualizacao 2026-06-01 - Bloco 04C.5 Rotas protegidas actor-aware

### Implementado

- `attachAuthenticatedActor()` montado antes das rotas protegidas Core SaaS
- rotas protegidas passam a aceitar `Authorization: Bearer` valido
- `tenantContextMiddleware` passa a priorizar `request.actor`
- fallback por headers simulados foi preservado
- quando JWT e headers simulados chegam juntos, JWT tem prioridade
- token invalido, malformado ou expirado retorna `401 INVALID_TOKEN`
- ausencia de JWT e ausencia de headers preserva erro atual de tenant/contexto ausente
- response shape de sucesso das rotas protegidas foi preservado
- logger HTTP redige `req.headers.authorization`
- frontend intocado

### Limitacoes

- headers simulados ainda existem como fallback temporario
- RBAC real persistido ainda nao substituiu `x-role`/`x-permissions`
- roles do JWT ainda passam pelo catalogo atual do backend
- refresh token, logout, sessao/cookie e revogacao continuam fora do escopo
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- substituir headers simulados gradualmente
- migrar autorizacao para RBAC real persistido
- registrar auditoria com actor real
- planejar refresh token/logout em blocos separados

## Atualizacao 2026-06-01 - Bloco 04C.6 RBAC persistido

### Implementado

- iniciada a autorizacao por roles/permissions persistidas
- criado resolver persistido isolado para `user_role_assignments`, `roles`, `role_permissions` e `permissions`
- resolver recebe `tenantId` e `userId` e retorna roles, permissions e source `persistent_rbac`
- usuario sem roles persistidas resolve roles e permissions vazias
- JWT actor segue priorizado sobre headers simulados
- `x-permissions` permanece apenas como fallback legacy
- teste actor-aware reforcado para garantir que `x-permissions` nao eleva permissao quando ha JWT
- runtime `memory` preservado sem import estatico de Prisma
- headers simulados ainda existem
- frontend intocado

### Limitacoes

- resolver persistido ainda nao esta plugado no `tenantContextMiddleware`
- integracao com rotas protegidas exige middleware async seguro em bloco seguinte
- headers simulados ainda existem como fallback temporario
- refresh token, logout, sessao/cookie e revogacao continuam fora do escopo
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- plugar resolver persistido em middleware async seguro quando houver JWT actor
- substituir headers simulados gradualmente
- usar roles/permissoes persistidas como fonte principal de autorizacao
- registrar auditoria com actor real

## Atualizacao 2026-06-01 - Bloco 04C.7 Middleware RBAC persistido para JWT

### Implementado

- criado middleware async `persistent-rbac-context.middleware.ts`
- middleware montado depois do `tenantContextMiddleware` nas rotas Core SaaS
- quando existe actor JWT e `CORE_SAAS_PERSISTENCE=prisma`, roles/permissoes efetivas passam a vir do RBAC persistido
- repositories Prisma sao carregados por `import()` dinamico apenas no modo Prisma
- runtime `memory` continua DB-free e nao exige `DATABASE_URL`
- `tenantContextMiddleware` permanece sincronico como fallback/base
- fallback legacy por headers simulados foi preservado
- `x-permissions` continua valido apenas sem JWT e nao eleva actor JWT
- usuario JWT sem permissao persistida recebe 403 em rota protegida
- response shape de sucesso foi preservado
- criado `tests/persistent-rbac-middleware.test.ts`
- frontend, schema Prisma, migrations, `package.json` e `package-lock.json` permaneceram intocados

### Limitacoes

- headers simulados ainda existem como fallback temporario
- refresh token, logout, sessao/cookie e revogacao continuam fora do escopo
- Redis runtime ainda nao implementado
- RLS ainda nao implementado
- Prisma segue controlado por `CORE_SAAS_PERSISTENCE=prisma` e nao virou default

### Proximos passos

- substituir headers simulados gradualmente
- ampliar auditoria com actor real
- planejar refresh/logout em blocos separados
- planejar Redis/RLS em blocos especificos

## Atualizacao 2026-06-02 - Bloco 04C.8 RBAC hardening e headers legados

### Implementado

- documentado plano de deprecacao dos headers legados em `docs/auth.md`
- `docs/auth.md` agora lista explicitamente `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` e `x-permissions`
- reforcado que `Authorization: Bearer` e a fonte preferencial para novas chamadas
- documentado que headers legados nao podem alterar tenant, usuario, roles ou permissoes quando JWT valido existe
- documentado que `x-permissions` vale apenas no fluxo legacy
- `docs/rbac.md` atualizado com estado atual JWT + `request.actor` + `tenantContext` + RBAC persistido
- `docs/rbac.md` atualizado com riscos temporarios de manter headers simulados
- documentado plano futuro para feature flag ou modo strict antes da reducao/remocao dos headers legados
- nao houve mudanca de comportamento em middleware, rotas, schema, migrations ou dependencias

### Limitacoes

- registro historico: headers simulados continuavam aceitos temporariamente naquele bloco; na branch `feature/auth-jwt-session-hardening`, producao passou a bloquear fallback legacy em rotas sensiveis
- registro historico: modo strict ainda nao havia sido implementado naquele bloco; a restricao atual por ambiente foi aplicada sem remover o codigo legacy
- refresh token, logout, sessao/cookie e revogacao continuam fora do escopo
- Redis runtime ainda nao implementado
- RLS ainda nao implementado

### Proximos passos

- planejar feature flag ou modo strict para reduzir headers simulados
- migrar chamadas internas para `Authorization: Bearer`
- registrar auditoria com actor real
- tratar refresh/logout, Redis e RLS em blocos separados

## Atualizacao 2026-06-02 - Console da Plataforma Foundation

### Implementado

- criado `docs/platform-console.md`
- criado `docs/modules.md`
- criado `docs/frontend-screens.md`
- criado `docs/api.md`
- criado `docs/architecture.md`
- `docs/rbac.md` atualizado com sidebar dinamica, escopo platform e escopo tenant
- `docs/09-mapa-telas-frontend.md` atualizado com labels `Usuarios`, `Administrador` e telas P01/P02/P03 da Console da Plataforma
- criado modulo frontend `frontend/src/modules/platform`
- criado layout separado `PlatformLayout`
- criadas telas frontend P01 Tenants, P02 Detalhe do Tenant e P03 Modulos do Tenant
- criada navegacao dinamica preparada para `scope: platform` e `scope: tenant`
- criados guards `PlatformGuard` e `PermissionGuard`
- mock de sessao atualizado com permissoes de plataforma para desenvolvimento
- criado modulo backend `src/modules/platform`
- criados endpoints iniciais `/api/v1/platform/tenants`
- endpoints backend usam service/repository em memoria, sem schema ou migration nesta fundacao
- criado teste `tests/platform-routes.test.ts`
- revisao final limitou fallback legacy de `/api/v1/platform/*` a desenvolvimento/teste/local e bloqueou headers simulados em `NODE_ENV=production`
- `frontend/links_Figma.txt` permaneceu intocado como arquivo nao rastreado existente

### Limitacoes

- persistencia real de `tenant_modules` ainda pendente
- auditoria global de plataforma ainda pendente
- endpoints de plataforma estao preparados com service em memoria para MVP inicial
- rotas frontend de Visao Geral, Planos e Modulos, Auditoria Global, Health e Configuracoes aparecem como itens desabilitados

### Proximos passos

- versionar persistencia de modulos por tenant quando o modelo for aprovado
- conectar o frontend ao backend real com `VITE_USE_MOCKS=false`
- expandir auditoria global para operacoes criticas
- definir plano de suporte auditado para acesso operacional a dados de tenant

## Atualizacao 2026-06-06 - Checklists Configuraveis por Tenant

### Implementado

- branch criada/usada: `feature/configurable-checklists-backend`
- formalizada a Fase 1 documental do modulo `checklists`
- `RF-CAD-006` atualizado para checklists configuraveis por tenant
- documentado que a plataforma define os componentes permitidos e o tenant apenas configura templates/campos
- documentados componentes iniciais: `text`, `textarea`, `number`, `currency`, `date`, `datetime`, `select`, `multi_select`, `checkbox`, `radio`, `boolean`, `photo`, `file`, `signature`, `barcode`, `qr_code`, `location`, `rating`
- documentado modelo conceitual com `checklist_templates`, `checklist_template_fields`, `checklist_runs` e `checklist_run_answers`
- documentados endpoints planejados para componentes, templates, campos, execucoes e respostas
- documentadas permissoes RBAC `checklists.template.*` e `checklists.run.*`
- documentados impactos futuros em frontend Web, mobile Flutter/offline, banco, auditoria e versionamento

### Decisoes

- nenhuma migration Prisma foi criada nesta fase
- nenhum modulo backend foi implementado nesta fase
- nenhuma tela frontend foi criada nesta fase
- a implementacao sera dividida em fases para evitar backend incompleto e preservar a arquitetura atual

### Limitacoes

- modulo `checklists` ainda esta documentado, nao executavel
- storage de evidencias, assinatura, QR Code, codigo de barras, localizacao e sincronizacao offline ainda dependem de desenho tecnico especifico
- auditoria real do modulo dependera da implementacao backend futura

### Proximos passos

- criar migration versionada quando o modelo for aprovado
- implementar modulo backend `src/modules/checklists` seguindo controller/service/repository/schemas/types/permissions
- adicionar testes tenant-scoped para templates, campos, execucoes e respostas
- planejar telas Web e fluxo mobile/offline apos contratos backend estabilizados

## Atualizacao 2026-06-06 - tenant_checklist W02A e Mobile schema-driven

### Implementado

- feature documentada como `tenant_checklist`
- adicionada tela frontend prevista `W02A · Administrador — Checklists` em `/administrator/checklists`
- criados tipos frontend `TenantChecklist`, `TenantChecklistComponent`, `ChecklistRun`, `ChecklistMarker`, `ChecklistAttachment` e `ChecklistAcknowledgement`
- catalogo de modulos da plataforma atualizado para expor `tenant_checklist` como Fase 2
- documentado que M10/M11 sao checklists de guincho/reboque e devem consumir schema da API
- documentado que M10 e coleta (`towing_collection`), com selecao de tipo de veiculo e marcacao de avarias
- documentado que M11 e entrega (`towing_delivery`), com nova vistoria e comparacao com coleta
- documentado que divergencia em M11 exige observacao obrigatoria e ciencia de responsabilidade
- documentado que M12 e evidencia tecnica (`technical_evidence`) antes/depois para reparo, construcao, manutencao ou servicos internos/externos
- criado `docs/api-screen-endpoints.md` com endpoints esperados para Web tenant e Mobile
- RBAC atualizado com `tenant_checklists:*` e `checklist_runs:*`

### Limitacoes

- endpoints `tenant_checklist` ainda nao foram implementados no backend
- tela W02A usa dados mockados locais para prever o fluxo e tipos
- storage/anexos/assinatura/localizacao ainda dependem de desenho tecnico e backend futuro

### Proximos passos

- implementar backend tenant-scoped para `/tenant/checklists` e `/mobile/checklist-runs`
- criar migration versionada para modelos, componentes, execucoes, marcadores, anexos e ciencia
- substituir mocks da W02A por service/API real quando os contratos existirem

## Atualizacao 2026-06-07 - FIGMA-CHECKLIST-HANDOFF.1

### Implementado

- documentacao sincronizada com a rodada `FIGMA-CHECKLIST-HANDOFF.1`
- W02A reafirmada como tela oficial de configuracao de `tenant_checklist`
- componentes oficiais registrados: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`
- M10 documentado como coleta/reboque com selecao de tipo de veiculo, imagem dinamica por tipo, marcacao de avarias, fotos obrigatorias conforme template e schema vindo da API
- M11 documentado como entrega/reboque com comparacao com coleta; divergencia exige foto, observacao obrigatoria e ciencia de responsabilidade
- M12 documentado fora do escopo de guincho/reboque como evidencia tecnica antes/depois para reparo, manutencao, construcao ou servico tecnico
- estados oficiais registrados: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia

### Decisoes

- M10/M11/M12 continuam schema-driven e nao devem ser implementados como telas hardcoded
- `tenant_checklist` continua feature configuravel por tenant
- backend, migrations e arquitetura fora do escopo nao foram alterados nesta rodada

### Proximos passos

- implementar backend apenas em rodada propria
- conectar W02A e mobile aos schemas reais quando os endpoints estiverem prontos

## Atualizacao 2026-06-07 - tenant_checklist backend

### Implementado

- branch usada: `feature/tenant-checklists-backend`
- criada migration `20260607000000_add_tenant_checklists`
- `prisma/schema.prisma` atualizado com templates, componentes, execucoes, respostas, anexos, marcadores e ciencia
- modulo `src/modules/checklists` criado com routes, controller, service, repository, adapter Prisma, validators, DTOs, permissoes, catalogo de componentes e auditoria
- endpoints `/api/v1/tenant/checklists`, `/api/v1/tenant/checklist-components`, `/api/v1/tenant/checklists/templates` e `/api/v1/mobile/checklists/*` registrados no backend
- queries e repositories filtram por `tenantId`; `tenant_id` do body nao e aceito como fonte de contexto
- RBAC de `tenant_checklists:*` e `checklist_runs:*` adicionado ao catalogo de permissoes
- auditoria tenant-scoped considerada nas operacoes criticas do modulo
- testes de rota adicionados em `tests/checklist-routes.test.ts`

### Limitacoes

- upload real de arquivos ainda nao foi implementado; anexos usam `fileUrl` logico
- runtime padrao continua em memoria quando `CORE_SAAS_PERSISTENCE=memory`; adapter Prisma e carregado dinamicamente quando o runtime esta em modo Prisma
- RLS e Redis continuam fora desta rodada

## Atualizacao 2026-06-07 - W02A integrada a API tenant_checklist

### Implementado

- branch usada: `feature/tenant-checklists-frontend-api`
- W02A passou a usar API real de `tenant_checklist` como fonte principal
- criados adapter, service, mock explicito e barrel frontend para `frontend/src/modules/checklists`
- integrados endpoints de listar checklists, carregar componentes, criar checklist, editar checklist e publicar checklist
- acao de ativar/inativar preparada via `PATCH /api/v1/tenant/checklists/:checklistId`
- pagina passou a tratar loading, erro e estado vazio
- tipos frontend alinhados ao contrato real do backend e aos componentes oficiais do handoff Figma
- fallback mock mantido apenas quando `VITE_USE_MOCKS=true`

### Limitacoes

- upload/storage real continua fora desta rodada
- mobile Flutter nao foi alterado

## Atualizacao 2026-06-07 - W02A builder UI

### Implementado

- branch usada: `feature/tenant-checklists-builder-ui`
- W02A refinada conforme `FIGMA-CHECKLIST-BUILDER-UX.1`
- tela reorganizada como builder visual MVP com lista filtravel, busca por nome, palette, canvas, inspector e preview de schema
- componentes do builder extraidos para `frontend/src/modules/checklists/components`
- ordenacao de componentes implementada por botoes subir/descer, sem drag-and-drop obrigatorio
- `pending_changes` implementado apenas como estado visual derivado da UI, sem alterar contrato ou status backend
- publicacao continua usando o endpoint real ja integrado
- M10/M11/M12 continuam schema-driven e nao foram hardcoded

### Limitacoes

- backend, Prisma/migrations, Figma e mobile Flutter nao foram alterados
- drag-and-drop fica fora desta versao MVP
## Atualizacao 2026-06-07 - Padronizacao de navegacao RBAC

### Implementado

- branch usada: `feature/navigation-rbac-sidebar-standardization`
- criado modelo unificado de item de navegacao com `id`, `label`, `path`, `scope`, `mode`, `requiredPermissions`, `allowedRoles`, `children`, `status`, `icon`, `moduleKey` e `featureKey`
- sidebar tenant e Platform Console passaram a filtrar itens por escopo, modo, tenant ativo, modulos/features habilitados, role, permissoes e status
- removida exibicao de links desabilitados/planejados na navegacao
- sidebar recolhida usa a mesma lista filtrada da sidebar expandida
- guards de rota foram preservados e rotas operacionais Web receberam `PermissionGuard` para acesso direto por URL
- W02A permanece visivel apenas para perfil com `tenant_checklists:read` ou Platform Admin em contexto autorizado

### Decisoes

- esconder link nao substitui autorizacao de rota
- Platform Admin ve Console da Plataforma; Tenant Admin, Supervisor e Operador nao veem itens fora do seu escopo/permissao
- Operador nao ve W02A administrativa; checklists de operador pertencem a rotas operacionais quando existirem
- backend, Prisma, migrations, API contracts, Figma e mobile nao foram alterados nesta rodada

## Atualizacao 2026-06-07 - Hardening backend RBAC

### Implementado

- branch usada: `feature/backend-rbac-hardening`
- mapeadas rotas atuais de Core SaaS, Platform Console e `tenant_checklist`
- `requirePermission(permission)` preservado como helper padrao
- adicionado `requireAnyPermission([...])` para rotas que aceitam mais de uma permissao operacional
- adicionado helper semantico `requirePlatformAdmin()`
- rotas mobile de render/listagem de checklists aceitam `checklist_runs:read` ou `checklist_runs:create`
- criacao de usuario Core SaaS passou a usar sempre `tenantId` do contexto autenticado, ignorando `tenantId` recebido no body
- testes de Core SaaS ampliados para tenant isolation no create user, Supervisor/manager bloqueado em RBAC avancado e operador bloqueado em administracao
- testes de checklist ampliados para tenant ausente, permissao ausente, operador sem acesso administrativo, supervisor sem create/publish, operador executando run, cross-tenant e acknowledgement sem permissao

### Decisoes

- frontend filtra sidebar e rotas visuais, mas backend continua sendo a autorizacao final
- `tenant_id` do body nao e fonte de verdade para rotas tenant-scoped
- Platform Admin permanece no boundary `/api/v1/platform/*`; tenant comum continua bloqueado
- RLS, upload/storage, Figma, frontend e mobile ficaram fora desta rodada

## Atualizacao 2026-06-07 - PostgreSQL RLS tenant isolation

### Implementado

- branch usada: `feature/postgres-rls-tenant-isolation`
- criada migration `20260608000000_enable_tenant_rls`
- habilitado Row Level Security nas tabelas tenant-scoped principais do Core SaaS, auth local, RBAC e `tenant_checklist`
- policies usam `current_setting('app.current_tenant_id', true)` como fonte de tenant da transacao
- `roles` recebeu policy especifica para permitir roles globais (`tenant_id IS NULL`) e roles do tenant atual
- `FORCE ROW LEVEL SECURITY` aplicado para que o usuario da aplicacao/owner tambem seja validado pelas policies
- criado helper `src/database/rls.ts` com `setTenantRlsContext` e `withTenantRls`
- paths Prisma tenant-scoped ajustados para executar com contexto RLS no Core SaaS, auth local, RBAC persistido e checklists
- `prisma/seed.ts` ajustado para executar dados tenant-scoped dentro de `withTenantRls`
- criado teste especifico `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/database.md`, `docs/architecture.md` e `docs/rbac.md`

### Decisoes

- `tenants` permanece global para o boundary de plataforma
- `permissions` permanece catalogo global
- Platform Admin nao recebe bypass amplo de RLS; dados tenant-scoped devem ser acessados com tenant selecionado e contexto RLS explicito
- RLS e defesa adicional e nao substitui filtros por `tenant_id`, RBAC ou auditoria no backend

### Limitacoes

- rotas que ainda usam runtime `memory` seguem DB-free e nao exercitam RLS
- testes RLS exigem `DATABASE_URL`, PostgreSQL ativo e migrations aplicadas

## Atualizacao 2026-06-07 - checklist attachments storage local

- branch usada: `feature/checklist-attachments-storage`
- implementado upload real local para `POST /api/v1/mobile/checklist-runs/:runId/attachments` via `multipart/form-data`
- preservado contrato JSON legado com `fileUrl`
- criada camada `src/modules/checklists/checklist-attachment.storage.ts` para driver local, validacao de MIME/tamanho, nome sanitizado, checksum, storage key e download seguro
- criada rota `GET /api/v1/mobile/checklist-runs/:runId/attachments/:attachmentId/download` com permissao `checklist_runs:read`
- storage local configurado por `.env.example` e ignorado no Git em `storage/checklist-attachments/**`, mantendo apenas `.gitkeep`
- metadados persistidos em `checklist_attachments.metadata`: `storageDriver`, `storageKey` e `checksumSha256`
- RLS continua protegendo `checklist_attachments`; teste RLS foi ampliado para anexos
- fora de escopo mantido: frontend, Figma, mobile Flutter e storage S3-compatible real

## Atualizacao 2026-06-07 - checklist attachments frontend integration

- branch usada: `feature/checklist-attachments-frontend-integration`
- implementada integracao frontend para anexos de checklist sem alterar backend, Prisma ou migrations
- criados service, adapter e mock fallback em `frontend/src/modules/checklists/checklist-attachments.*`
- `frontend/src/services/api/client.ts` passou a suportar requests multipart sem setar `Content-Type` manualmente e download protegido como `Blob`
- tipos frontend de `ChecklistAttachment`, upload, download e metadata foram alinhados ao contrato real
- componentes criados: `ChecklistAttachmentUploader`, `ChecklistAttachmentList` e `ChecklistEvidencePreview`
- W02A continua administrativa; o preview de schema apenas indica suporte a evidencias para `photo_upload`, `before_after` e `damage_map`
- `VITE_USE_MOCKS=true` preservado com upload/download simulados
- M10/M11/M12 permanecem pendentes e deverao consumir os services/componentes em telas operacionais futuras

## Atualizacao 2026-06-07 - W03 tenant settings menu UI

- branch usada: `feature/tenant-settings-menu-ui`
- criada tela `W03 · Administrador — Configurações` na rota `/administrator/settings`
- criado modulo frontend `frontend/src/modules/settings`
- sidebar do tenant recebeu item `Configuracoes` filtrado por `tenant:manage`, role administrativa e modulo `tenant-admin`
- pendencia documentada: criar permissao backend dedicada `tenant_settings:read` em bloco futuro
- W03 organiza Geral, Aparência, Usuários e Acesso, Módulos e Checklists
- Notificações, Integrações e Segurança/Auditoria aparecem como planejados
- Checklists aponta para W02A em `/administrator/checklists`, sem duplicar builder
- temas exibidos apenas como opções visuais planejadas: `enterprise_blue`, `tech_dark` e `green_operations`
- fora de escopo mantido: backend, Prisma/migrations, contratos API, Figma, mobile Flutter e persistência real de tema

## Atualizacao 2026-06-07 - alinhamento numeracao W03

- decisao oficial consolidada: W03 e `Administrador — Configurações`
- rota oficial mantida: `/administrator/settings`
- W02A permanece `Administrador — Checklists`
- Dashboard/Resumo Financeiro deixou de usar W03 na documentacao e permanece sem numeracao conflitante ate consolidacao propria
- nao houve alteracao de backend, Prisma/migrations, API, Figma ou mobile
- qualquer consulta platform futura que consolide multiplos tenants deve iterar por tenant ou ganhar repository auditado proprio

## Atualizacao 2026-06-07 - hardening JWT/session auth context

- branch usada: `feature/auth-jwt-session-hardening`
- `Authorization: Bearer` permanece fonte principal para `userId`, `tenantId`, roles e permissoes efetivas
- Bearer token invalido, malformado ou expirado continua retornando `401 INVALID_TOKEN` antes de qualquer fallback legacy
- rotas sensiveis tenant-scoped via `tenantContextMiddleware` agora rejeitam actor por headers legacy em `NODE_ENV=production`
- fallback por `x-tenant-id`, `x-user-id`, `x-actor-user-id`, `x-role`, `x-roles` e `x-permissions` permanece apenas para desenvolvimento/teste/transicao
- Platform routes ja bloqueavam legacy headers em producao e ganharam cobertura com JWT de plataforma real
- `.env.example` alinhado para `JWT_SECRET="change-me-in-local-development"` e `JWT_EXPIRES_IN="1h"`, sem segredo real versionado
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/rbac.md`, `docs/architecture.md` e `docs/modules.md`
- testes ajustados em `tests/platform-routes.test.ts` e `tests/checklist-routes.test.ts`
- fora de escopo mantido: frontend amplo, Figma, mobile, OAuth/social login, refresh token complexo, Prisma/migrations e contratos API destrutivos

## Atualizacao 2026-06-07 - frontend login JWT

- branch usada: `feature/auth-frontend-login-integration`
- tela `W01 Login` integrada ao endpoint real `POST /api/v1/auth/login`
- login real envia `tenantId`, e-mail e senha
- criada camada frontend de auth com adapter, service e storage controlado
- sessao JWT armazenada em `localStorage` como MVP
- API client envia `Authorization: Bearer` automaticamente em chamadas JSON, FormData e blob/download
- headers legados deixam de ser enviados pelo API client quando `VITE_USE_MOCKS=false`
- fluxo mock permanece quando `VITE_USE_MOCKS=true`
- guards e layouts protegidos respeitam estado autenticado antes de renderizar telas
- logout simples limpa sessao/token/contexto local e redireciona para `/login`
- selecao de contexto em modo real usa tenant/roles/permissoes derivados da sessao de login
- backend continua autoridade final de RBAC e RLS; permissoes derivadas no frontend servem apenas para UX/sidebar/guards visuais
- refresh token, revogacao remota, cookie/sessao avancada e logout backend ficaram fora do escopo
- backend, Prisma, migrations, Figma e mobile Flutter nao foram alterados

## Atualizacao 2026-06-07 - frontend smoke flow tests

- branch usada: `feature/frontend-smoke-flow-tests`
- estrategia escolhida: smoke tests leves com `node:test`, `tsx` e `react-dom/server`, sem instalar Vitest, Testing Library, Playwright ou Cypress nesta rodada
- script criado: `npm --prefix frontend run test:smoke`
- criado helper `frontend/src/config/env.ts` para permitir testes Node e runtime Vite lerem as mesmas variaveis `VITE_*`
- testes criados em `frontend/tests/smoke-flow.test.tsx`
- cobertura inicial: auth storage/service, login real vs mock, API client com Bearer, bloqueio de headers legados no modo real, preservacao de FormData, filtro RBAC de W02A/W03/Platform, smoke render de `/login`, W02A, W03 e Platform Console, e componentes/adapter de anexos
- documentacao atualizada em `docs/auth.md`, `docs/frontend-screens.md` e `docs/rbac.md`
- backend, Prisma/migrations, contratos API, Figma e mobile Flutter nao foram alterados
- proximo passo recomendado: E2E real em navegador com Playwright/Cypress quando ambientes e dados de teste estiverem estabilizados

## Atualizacao 2026-06-07 - E2E critical flows

- branch usada: `feature/e2e-critical-flows`
- objetivo: adicionar camada inicial de E2E real em navegador para fluxos criticos do frontend com backend Prisma em execucao
- ferramenta escolhida: Playwright na raiz do repositorio, por depender simultaneamente de frontend, backend, seed e banco local
- script criado: `npm run test:e2e`
- configuracao criada: `playwright.config.ts`, com backend local em `CORE_SAAS_PERSISTENCE=prisma`, frontend Vite em `VITE_USE_MOCKS=false`, videos desativados e trace apenas em falha
- seed usado: seed demo existente, idempotente, executado via `npm run db:seed` antes do Playwright
- testes criados: `tests/e2e/critical-flows.spec.ts`
- cobertura inicial: login real/JWT, erro de login, guard de rota protegida, sessao local, sidebar RBAC tenant admin, W02A Checklists, W03 Configuracoes e bloqueio do Console da Plataforma para usuario tenant
- pendencia documentada: acesso positivo ao Console da Plataforma depende de usuario platform estavel no seed
- fora de escopo mantido: backend funcional, Prisma/migrations, contratos API, Figma, mobile Flutter, redesign e remocao de mocks
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-07 - auth refresh/logout sessions

- branch usada: `feature/auth-session-refresh-logout`
- objetivo: adicionar refresh token, rotacao, logout/revogacao backend e refresh-on-401 no frontend, preservando login JWT existente
- migration criada: `prisma/migrations/20260609000000_add_auth_sessions/migration.sql`
- modelo criado: `AuthSession` / tabela `auth_sessions`, tenant-scoped, com RLS, `refresh_token_hash`, expiracao e `revoked_at`
- refresh token e persistido apenas como hash HMAC-SHA256; token puro existe apenas no cliente e no corpo da requisicao
- `.env.example` recebeu `JWT_REFRESH_SECRET` e `JWT_REFRESH_EXPIRES_IN`, sem segredo real
- `POST /api/v1/auth/login` passa a retornar access token, refresh token rotacionavel, expiracoes e `sessionId`, mantendo aliases snake_case/camelCase
- endpoints adicionados: `POST /api/v1/auth/refresh` e `POST /api/v1/auth/logout`
- refresh bem-sucedido valida sessao ativa, compara hash, resolve usuario/roles persistidos e rotaciona o refresh token
- logout e idempotente e marca `revoked_at` quando a sessao existe
- frontend armazena access/refresh/expires/session, tenta refresh unico em `401` de rota protegida e chama logout backend em best effort
- cobertura adicionada: `tests/auth-session.test.ts`, ampliacao de `tests/auth-jwt.test.ts`, `tests/auth-login.test.ts`, `frontend/tests/smoke-flow.test.tsx` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/auth.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/architecture.md`, `docs/database.md`, `docs/rbac.md` e este status
- fora de escopo mantido: cookie httpOnly, MFA, OAuth/social login, recuperacao de senha, Redis runtime, remocao definitiva dos headers legacy e revogacao imediata de access token ja emitido
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/platform-routes.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/auth-jwt.test.ts`, `node --test --import tsx tests/auth-session.test.ts` com `DATABASE_URL` local, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - platform admin seed E2E

- branch usada: `feature/platform-admin-seed-e2e`
- objetivo: remover a pendencia do acesso positivo ao Console da Plataforma no E2E
- `prisma/seed.ts` passou a garantir usuario local/dev `platform.admin@erp.local` com role global `super_admin`
- estrategia documentada: o usuario Platform Admin pertence ao tenant demo apenas porque o login local atual exige `tenantId`; o escopo de plataforma vem da role global `super_admin`
- senha local/dev configuravel por `E2E_PLATFORM_PASSWORD`, com fallback `platform-admin-dev-password`; nao e segredo real
- seed continua idempotente e preserva `admin.demo@example.com`
- `.env.example` documenta `E2E_PLATFORM_EMAIL` e `E2E_PLATFORM_PASSWORD`
- E2E passou a cobrir login Platform Admin, sessao com refresh token e acesso positivo a `/platform/tenants`
- E2E manteve o bloqueio do Console da Plataforma para Tenant Admin
- documentacao atualizada em `docs/auth.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/rbac.md`, `docs/github-workflow.md` e este status
- fora de escopo mantido: Figma, mobile Flutter, contratos API, migrations, refatoracao de auth e features novas de produto
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run db:seed`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - Redis job queue foundation

- branch usada: `feature/redis-job-queue-foundation`
- objetivo: criar fundacao inicial de Redis para jobs, eventos internos, retry/backoff e dead-letter sem trocar arquitetura do backend
- verificado: nao havia cliente Redis nem dependencia de fila no projeto; `docker-compose.yml` ja subia `erp-redis` e `.env.example` ja documentava `REDIS_URL`
- decisao tecnica: criado cliente Redis minimo em Node (`node:net`) para evitar dependencia externa nesta rodada
- criado `src/infra/redis/redis.client.ts`
- criados `src/infra/jobs/job.types.ts`, `job.queue.ts`, `job.registry.ts` e `job.worker.ts`
- criados `src/infra/events/domain-event.types.ts` e `domain-event.publisher.ts`
- eventos iniciais documentados: `auth.session.created`, `auth.session.revoked`, `checklist_run.created`, `checklist_run.completed`, `checklist_run.attachment_uploaded`, `checklist_run.divergence_reported`, `notification.requested` e `audit_log.created`
- jobs iniciais: `checklist-attachment-postprocess`, `notification-dispatch` e `audit-log-fanout`
- integracao real: upload de anexo de checklist publica `checklist_run.attachment_uploaded` depois de salvar arquivo, registro e auditoria
- falha de Redis no publish nao quebra o upload critico no MVP; o publisher registra warning e retorna falha controlada
- worker nao inicia automaticamente no servidor
- documentacao criada em `docs/messaging.md`
- testes criados: `tests/job-queue.test.ts` e `tests/domain-events.test.ts`
- fora de escopo mantido: Kafka, RabbitMQ, cloud queue, notificacoes reais, webhooks reais, frontend, Figma, mobile Flutter, migrations e mudancas destrutivas de contrato API
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - audit log enhancements

- branch usada: `feature/audit-log-enhancements`
- objetivo: fortalecer auditoria enterprise com contrato padronizado, metadata sanitizado, RLS/RBAC e fanout seguro via Redis
- migration criada: nenhuma; `audit_logs.metadata` suporta os campos complementares do contrato
- criado `src/modules/core-saas/audit/` com tipos, `EnterpriseAuditLogService`, sanitizacao recursiva e helper de contexto HTTP
- auditoria critica continua sincronica no PostgreSQL; `audit_log.created` e publicado como evento complementar para `audit-log-fanout`
- dados sensiveis como access token, refresh token, senha, hashes, secrets e Authorization sao redigidos antes da persistencia
- fluxos cobertos: `tenant.created`, `user.created`, `permission.denied`, login, refresh, logout, sessao revogada/criada e eventos de checklists/templates/execucoes/anexos/divergencia/ciencia
- `requirePermission` registra `permission.denied` em modo Prisma de forma best-effort sem alterar a resposta 403
- checklists passaram a usar nomes canonicos `checklist_template.*`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created`
- documentacao criada em `docs/audit.md`
- documentacao atualizada em `docs/architecture.md`, `docs/database.md`, `docs/rbac.md`, `docs/modules.md`, `docs/messaging.md`, `docs/api.md` e este status
- testes criados: `tests/audit-log.test.ts` e `tests/audit-security.test.ts`
- fora de escopo mantido: frontend amplo, Figma, mobile Flutter, SIEM externo, exportacao de logs, painel visual completo de auditoria, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/audit-security.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - checklist runtime web

- branch usada: `feature/checklist-runtime-web`
- objetivo: criar runtime web operacional para executar checklists publicados sem transformar W02A em tela operacional
- W02A permanece builder/admin em `/administrator/checklists`
- rotas web criadas: `/operations/checklists` e `/operations/checklists/:checklistId/run`
- runtime web consome endpoints `/mobile/*` como runtime operacional compartilhado web/mobile, com possibilidade de alias/rename futuro sem quebra
- criados `checklist-runtime.adapter.ts`, `checklist-runtime.service.ts` e `checklist-runtime.mock.ts`
- criadas paginas `ChecklistRunsPage.tsx` e `ChecklistRuntimePage.tsx`
- criados componentes `ChecklistRuntimeRenderer`, `ChecklistRuntimeField`, `ChecklistRunStatusBadge` e `ChecklistRunSummary`
- componentes MVP renderizados por schema: `observation`, `vehicle_selector`, `acknowledgement`, `photo_upload`, `before_after`, `damage_map` e fallback informativo para `comparison`
- anexos/evidencias reutilizam `ChecklistAttachmentUploader` e `ChecklistAttachmentList`
- navegacao adiciona `Checklists Operacionais` apenas para usuarios com `checklist_runs:read` ou `checklist_runs:create`
- smoke test cobre service runtime, renderizacao inicial e separacao RBAC operador/W02A
- E2E cobre renderizacao da lista operacional sem completar fluxo inteiro
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e este status
- fora de escopo mantido: mobile Flutter, Figma, offline, drag-and-drop, redesign amplo, backend novo, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - checklist runtime web hardening

- branch usada: `feature/checklist-runtime-web-hardening`
- objetivo: polir o runtime web operacional de checklists sem transformar W02A em runtime e sem alterar contratos backend
- criada validacao frontend por schema para obrigatorios basicos, anexos, `before_after`, `acknowledgement`, `vehicle_selector` e `damage_map`
- runtime passou a mostrar progresso, status, resumo lateral e mensagens amigaveis
- `comparison` usa endpoint de comparacao quando disponivel e registra divergencia com observacao e evidencia
- `acknowledgement` usa texto configuravel e chama endpoint de ciencia apenas para run `pending_acknowledgement`
- `damage_map` exige tipo/descricao, envia marker ao backend e suporta remocao local da lista; delete persistente de marker segue como proxima fase
- E2E cobre tela de run e bloqueio de conclusao com obrigatorios incompletos
- documentacao atualizada em `docs/frontend-screens.md`, `docs/api.md`, `docs/modules.md`, `docs/audit.md`, `docs/messaging.md`, `docs/rbac.md` e este status
- fora de escopo mantido: mobile Flutter, Figma, offline, drag-and-drop, redesign amplo, backend novo, migrations e contratos API destrutivos
- validacoes finais executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - checklist attachments S3-compatible storage

- branch usada: `feature/checklist-attachments-s3-storage`
- objetivo: adicionar provider S3-compatible para anexos/evidencias de checklist preservando o provider local
- criada interface `ChecklistStorageProvider` com implementacoes `local` e `s3`
- provider escolhido por `CHECKLIST_STORAGE_PROVIDER`, com aliases legados `CHECKLIST_ATTACHMENT_*` mantidos
- API publica de anexos usa rota protegida de download e nao expõe `storageKey`, bucket, path privado, `local://` ou `s3://`
- `.env.example` e documentacao atualizados com variaveis `CHECKLIST_STORAGE_*`
- sem migration: provider, chave e checksum permanecem em `checklist_attachments.metadata`
- testes adicionados para local, factory, S3 mockado e contrato publico de anexos
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/checklist-storage.test.ts`, `node --test --import tsx tests/checklist-attachments.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts`, `node --test --import tsx tests/domain-events.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - notification foundation

- branch usada: `feature/notification-foundation`
- objetivo: criar fundacao backend de notificacoes internas tenant-scoped sem e-mail, SMS, WhatsApp, push externo, chat ou UI completa
- migration criada: `20260610000000_add_notifications`
- tabela criada: `notifications`, com RLS por `tenant_id`, status `unread/read/archived`, severity `info/success/warning/critical` e deduplicacao por `idempotency_key`
- modulo criado: `src/modules/notifications`
- API criada: `GET /api/v1/notifications`, `GET /api/v1/notifications/unread-count`, `POST /api/v1/notifications/:notificationId/read`, `POST /api/v1/notifications/read-all` e `POST /api/v1/notifications/:notificationId/archive`
- RBAC atualizado com `notifications:read` e `notifications:update`
- eventos `checklist_run.completed`, `checklist_run.divergence_reported` e `checklist_run.acknowledgement_created` passam a enfileirar `notification-dispatch`
- resolver inicial notifica usuarios ativos do tenant por regras conservadoras de roles/permissoes e nao notifica o ator do evento
- frontend completo ficou fora desta rodada
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/audit.md`, `docs/deployment.md`, `RBAC_MATRIX.md` e este status
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/notifications.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - notifications UI

- branch usada: `feature/notifications-ui`
- objetivo: criar interface web de notificacoes internas usando a notification foundation existente, sem backend amplo novo
- rota criada: `/notifications`
- criados service, adapter, mock, tipos, pagina e componentes frontend em `frontend/src/modules/notifications`
- AppShell passou a buscar contador de nao lidas ao montar/apos acoes locais, sem polling agressivo
- sidebar/topbar exibem badge de nao lidas quando o modulo/permissao permitem
- menu tenant adiciona `Notificacoes` com `notifications:read` e modulo `notifications`
- a pagina lista inbox, filtra por todas/nao lidas/lidas/arquivadas, marca uma/todas como lidas, arquiva e abre apenas `actionUrl` interna segura
- metadata completa, ids internos de destinatario, tokens, storage keys e URLs externas nao sao exibidos/navegados
- smoke e E2E atualizados para RBAC visual, adapter, mocks, renderizacao e rota real sem depender de seed com notificacoes
- documentacao atualizada em `docs/notifications.md`, `docs/api.md`, `docs/frontend-screens.md`, `docs/modules.md`, `docs/rbac.md` e este status
- fora de escopo mantido: e-mail, SMS, WhatsApp, push externo, chat, provider externo, polling agressivo, Figma, mobile Flutter e backend amplo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-08 - cloud usage metering foundation

- branch usada: `feature/cloud-usage-metering-foundation`
- objetivo: criar a fundacao de medicao interna de uso cloud por tenant para futura cobranca com margem
- decisao arquitetural registrada: Opcao B, metering interno por tenant + margem futura
- migration criada: `20260611000000_add_cloud_usage_metering`
- tabelas criadas: `cloud_usage_events` e `cloud_usage_daily_aggregates`, ambas com `tenant_id` obrigatorio, indices por tenant/metrica/data, checks de unidade/quantidade e RLS por tenant
- modulo criado: `src/modules/cloud-usage`, com service, repository em memoria, repository Prisma, aggregator, eventos, jobs e rotas de plataforma
- API Platform criada: `GET /api/v1/platform/cloud-usage/summary`, `GET /api/v1/platform/cloud-usage/tenants/:tenantId/summary` e `GET /api/v1/platform/cloud-usage/tenants/:tenantId/daily`
- RBAC atualizado com `platform:cloud-usage:read`; roles de tenant nao recebem acesso cross-tenant por padrao
- eventos integrados: `checklist_run.created`, `checklist_run.completed`, `checklist_run.attachment_uploaded`, `checklist_run.attachment_downloaded`, `checklist_run.divergence_reported`, `checklist_run.acknowledgement_created`, `notification.created` e `job.executed`
- metricas aceitas pelo catalogo incluem storage, S3-compatible requests, checklists, notificacoes, jobs, API e usuarios ativos; middleware de API e calculo de usuarios ativos ficam planejados para rodada propria
- documentacao criada/atualizada em `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/messaging.md`, `docs/modules.md`, `docs/rbac.md`, `docs/storage.md`, `docs/notifications.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: AWS CUR, Cost Explorer, Billing Conductor, custo monetario real, rateio AWS, markup, fatura, pagamento e tela complexa
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/cloud-usage-routes.test.ts`, `node --test --import tsx tests/domain-events.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/checklist-routes.test.ts`, `node --test --import tsx tests/notification-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts` e `node --test --import tsx tests/audit-log.test.ts`

## Atualizacao 2026-06-08 - AWS CUR cost import foundation

- branch usada: `feature/aws-cur-cost-import`
- objetivo: criar a foundation de importacao de custo AWS CUR bruto, preparando a futura alocacao/rateio por tenant
- migration criada: `20260612000000_add_aws_cur_cost_import`
- tabelas criadas: `cloud_cost_imports` e `cloud_cost_line_items`, globais da plataforma, sem RLS por tenant e protegidas por RBAC platform
- modulo criado: `src/modules/cloud-costs`, com parser CSV, importer, repository em memoria, repository Prisma, service, job e rotas de plataforma
- API Platform criada: `GET /api/v1/platform/cloud-costs/imports`, `GET /api/v1/platform/cloud-costs/imports/:importId`, `GET /api/v1/platform/cloud-costs/line-items`, `GET /api/v1/platform/cloud-costs/summary` e `POST /api/v1/platform/cloud-costs/imports/manual-csv`
- RBAC atualizado com `platform:cloud-costs:read` e `platform:cloud-costs:import`; roles de tenant nao recebem acesso a custo bruto por padrao
- job criado: `aws-cur.import-cost-file`, para CSV mockado ou `sourceUri` local, sem dependencia de AWS real
- fixture criada: `tests/fixtures/aws-cur-sample.csv`
- relacao documentada: `cloud_usage_*` mede uso interno por tenant, `cloud_cost_*` importa custo AWS bruto e a proxima branch `feature/cloud-cost-allocation-engine` fara o cruzamento
- documentacao criada/atualizada em `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: rateio por tenant, markup, cobranca, fatura, gateway, UI completa, AWS real obrigatoria, Cost Explorer, Billing Conductor e credenciais AWS reais
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/aws-cur-cost-routes.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - cloud cost allocation engine

- branch usada: `feature/cloud-cost-allocation-engine`
- objetivo: criar o motor de rateio de custo cloud por tenant usando `cloud_usage_*` e `cloud_cost_*`
- migration criada: `20260613000000_add_cloud_cost_allocation`
- tabelas criadas: `cloud_cost_allocation_runs` e `tenant_cloud_cost_allocations`
- decisao de isolamento: `cloud_cost_allocation_runs` e platform-scoped; `tenant_cloud_cost_allocations` possui `tenant_id`, RLS e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-cost-allocation`
- regras MVP em codigo: `direct_tenant_tag`, `storage_usage_weight`, `download_usage_weight`, `api_request_weight`, `job_execution_weight`, `checklist_run_weight` e custo nao alocado quando nao houver base confiavel
- API Platform criada: `GET /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId`, `POST /api/v1/platform/cloud-cost-allocations/runs`, `GET /api/v1/platform/cloud-cost-allocations/runs/:runId/tenant-allocations` e `GET /api/v1/platform/cloud-cost-allocations/summary`
- RBAC atualizado com `platform:cloud-cost-allocation:read` e `platform:cloud-cost-allocation:run`; roles de tenant nao recebem acesso a custo alocado nesta branch
- job criado: `cloud-cost-allocation.run`, para processar run existente ou criar/processar run por periodo, sem dependencia de AWS real
- documentacao criada/atualizada em `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: markup/margem, fatura, cobranca final, gateway de pagamento, UI completa, provider externo, AWS real adicional e secrets reais
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-cost-allocation-routes.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - cloud charge markup rules

- branch usada: `feature/cloud-charge-markup-rules`
- objetivo: criar motor de regras comerciais para calcular valor cobrável cloud com margem a partir de `tenant_cloud_cost_allocations`
- migration criada: `20260614000000_add_cloud_charge_markup_rules`
- tabelas criadas: `cloud_charge_rules`, `cloud_charge_calculation_runs` e `tenant_cloud_charges`
- decisao de isolamento: regras e runs sao platform-scoped; `tenant_cloud_charges` possui `tenant_id`, RLS e `FORCE ROW LEVEL SECURITY`
- modulo criado: `src/modules/cloud-charges`
- regras comerciais MVP: markup `percentage`, `fixed_multiplier` e `fixed_amount`; minimo mensal; custo cloud incluso; arredondamento `none`, `nearest_cent`, `nearest_10_cents`, `nearest_real` e `ceil_real`; margem absoluta e percentual
- API Platform criada: `GET/POST /api/v1/platform/cloud-charge-rules`, `GET/PATCH /api/v1/platform/cloud-charge-rules/:ruleId`, `GET/POST /api/v1/platform/cloud-charges/calculation-runs`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId`, `GET /api/v1/platform/cloud-charges/calculation-runs/:runId/tenant-charges` e `GET /api/v1/platform/cloud-charges/summary`
- RBAC atualizado com `platform:cloud-charge-rules:read`, `platform:cloud-charge-rules:write`, `platform:cloud-charges:read` e `platform:cloud-charges:calculate`; roles de tenant nao recebem acesso a preco/margem nesta branch
- job criado: `cloud-charges.calculate`, para processar run existente ou criar/processar run por allocation run e periodo, sem dependencia de AWS real
- documentacao criada/atualizada em `docs/cloud-charge-markup-rules.md`, `docs/cloud-cost-allocation.md`, `docs/aws-cur-cost-import.md`, `docs/cloud-usage-metering.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/architecture.md`, `docs/database.md`, `docs/deployment.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/messaging.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: fatura, pagamento, checkout, gateway, emissao fiscal, UI completa, AWS real adicional, credenciais e secrets reais
- observacao de validacao: `tests/rls-tenant-isolation.test.ts` falhou inicialmente porque a migration nova ainda nao estava aplicada no banco local; apos `npx prisma migrate deploy`, o teste passou
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/cloud-charge-routes.test.ts`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/job-queue.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/audit-log.test.ts` e `git diff --check`

## Atualizacao 2026-06-08 - platform cloud billing UI

- branch usada: `feature/platform-cloud-billing-ui`
- objetivo: criar a UI web de Cloud Billing no Console da Plataforma consumindo as APIs existentes de uso, custos AWS, rateio, cobranca e regras
- rota criada: `/platform/cloud-billing`
- abas implementadas: Visao geral, Uso, Custos AWS, Rateio, Cobranca, Regras e Runs
- criados types, adapter, service, mock e pagina em `frontend/src/modules/platform/cloud-billing`
- menu Platform atualizado com item `Cloud Billing`; rota protegida por permissoes `platform:cloud-*`
- mocks representam tenant com margem saudavel, tenant com custo alto, tenant sem regra/custo nao rateado e runs completed/failed
- acoes de UI: atualizar dados, importar CUR manual, rodar rateio, calcular cobranca, criar regra e editar regra
- adapter normaliza DTOs reais do backend para os modelos de tela e preserva `VITE_USE_MOCKS=true` como fallback local
- documentacao criada/atualizada em `docs/platform-cloud-billing-ui.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/platform-console.md`, `docs/modules.md`, `docs/api-screen-endpoints.md`, `docs/api.md`, `docs/rbac.md` e este status
- fora de escopo mantido: backend novo, migrations, scheduler, fatura, pagamento, checkout, emissao fiscal, mobile Flutter e exposicao tenant de custo/preco/margem
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/cloud-cost-allocation.test.ts`, `node --test --import tsx tests/cloud-charge-markup-rules.test.ts`, `node --test --import tsx tests/aws-cur-cost-import.test.ts`, `node --test --import tsx tests/cloud-usage.test.ts` e `git diff --check`

## Atualizacao 2026-06-09 - backend navigation menu registry

- branch usada: `feature/backend-navigation-menu-registry`
- objetivo: criar fonte oficial backend de menu/navegacao para o frontend consumir sem duplicar hardcode sensivel
- modulo criado: `src/modules/navigation`
- endpoint criado: `GET /api/v1/navigation/menu`
- filtros opcionais implementados: `scope=platform`, `scope=tenant`, `scope=operations`, `scope=logistics` e `scope=finance`
- registry inicial cobre grupos `platform`, `tenant`, `operations`, `logistics` e `finance`, com rotas frontend, icones, status, permissoes, modulos requeridos e endpoints relacionados
- RBAC atualizado com permissoes planejadas para navegacao, incluindo `platform:dashboard:read`, `platform:tenants:read`, `platform:audit:read`, `dashboard:read`, `tenant_settings:read`, `users:read`, `work_orders:*`, `field_location:*`, `field_operator:*`, `field_dispatch:*`, `logistics:*`, `finance:read`, `billing:read`, `invoices:read` e `payments:read`
- seed Prisma atualizado com descricoes das permissoes planejadas para manter `npm run db:seed` e E2E consistentes com o catalogo
- regras aplicadas: tenant comum nao recebe menu Platform; item sem permissao ou modulo habilitado e removido; metadata sensivel e sanitizada; grupos vazios nao devem ser renderizados
- documentacao criada/atualizada em `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/iconography-and-tags.md`, `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/rbac.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: telas frontend novas, Google Maps real, localizacao de operador, Work Orders backend, logistica backend, billing/payment/fiscal tenant-scoped, CRUD persistido de menu e remocao dos menus frontend atuais
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## Atualizacao 2026-06-09 - frontend navigation menu consumer

- branch usada: `feature/frontend-navigation-menu-consumer`
- objetivo: fazer o frontend consumir o menu oficial do backend via `GET /api/v1/navigation/menu`
- modulo criado: `frontend/src/modules/navigation`
- service criado: `getNavigationMenu(scope?)`, com suporte a `scope=platform|tenant|operations|logistics|finance`
- adapter criado para ordenar por `order`, remover itens invalidos, preservar children/status/permissoes/endpoints relacionados e mapear icones `lucide-react`
- hook criado: `useNavigationMenu`, com estados `loading`, `error`, `items`, `refetch` e `isFallback`
- fallback local mantido via `navigation.mock.ts`, usando `platformNavigation` e `tenantNavigation` apenas para mock/transicao e falha segura da API
- fallback local tambem cobre resposta backend vazia enquanto a persistencia de modulos do tenant nao estiver completa em seeds/ambientes locais
- `PlatformLayout` passou a consumir `scope=platform`
- `AppShell` e `Sidebar` passaram a consumir o menu tenant/operations/logistics/finance e renderizar grupos
- icone desconhecido usa fallback `Circle`; nao ha emojis como icones
- testes smoke atualizados para adapter/service; E2E atualizado para aguardar resposta real de `/api/v1/navigation/menu`
- documentacao atualizada em `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/iconography-and-tags.md`, `docs/platform-console.md`, `docs/modules.md` e este status
- fora de escopo mantido: novas telas de negocio, Google Maps, localizacao de operador, backend novo, endpoints novos e remocao completa do fallback local
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## Atualizacao 2026-06-09 - field operator location foundation

- branch usada: `feature/field-operator-location-foundation`
- objetivo: implementar a fundacao backend de localizacao de operadores em campo para futuro app mobile e Mapa Operacional web
- migration criada: `20260615000000_add_field_operator_locations`
- model Prisma adicionado: `FieldOperatorLocation`
- tabela criada: `field_operator_locations`, tenant-scoped, com `operator_user_id`, coordenadas, precisao, heading, velocidade, bateria, timestamps, source e metadata sanitizada
- RLS aplicada com `FORCE ROW LEVEL SECURITY` e policy baseada em `app.current_tenant_id`
- modulo criado: `src/modules/field-location`
- endpoints criados: `POST /api/v1/mobile/field-locations`, `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- RBAC aplicado: `field_location:send`, `field_location:read` e `field_location:history`
- roles atualizadas: manager/auditor recebem leitura e historico, viewer recebe leitura, operator/field_technician recebem envio proprio
- auditoria best-effort adicionada para `field_location.recorded` e `field_location.history_viewed`
- navegacao atualizada: `/operations/map` passa a `backend-ready` com endpoints relacionados, sem tela web nova
- catalogo de modulos Platform atualizado com `field_operations`
- testes criados/atualizados: `tests/field-location-routes.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/database.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/02-mapa-modulos.md`, `docs/platform-console.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: Google Maps, tela `/operations/map`, app Flutter, roteirizacao avancada, Work Orders completas e despacho completo

## Atualizacao 2026-06-09 - operations map UI

- branch usada: `feature/operations-map-ui`
- objetivo: implementar a UI inicial do Mapa Operacional em `/operations/map` consumindo a fundacao backend de localizacao de operadores em campo
- rota criada no frontend: `/operations/map`, protegida por `field_location:read`
- modulo frontend criado em `frontend/src/modules/operations/map` com types, adapter, service, mock, hook, pagina e componentes
- endpoints consumidos: `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`
- fallback seguro: `VITE_USE_MOCKS=true`, falha da API ou resposta vazia usam dados mockados sem expor coordenadas em logs
- tela inclui cabecalho, KPIs, filtros, mapa placeholder com marcadores proporcionais por latitude/longitude, lista de operadores, painel de detalhe e estados loading/erro/vazio/fallback
- `.env.example` recebeu placeholder `VITE_GOOGLE_MAPS_API_KEY=""`, sem uso de chave real
- menu/fallback local atualizado para `field_operations` e `/operations/map`
- smoke test atualizado para adapter/service/render da tela; E2E atualizado para validar a rota inicial
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/frontend-menu-navigation.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/backend-navigation-menu.md`, `docs/platform-console.md`, `docs/09-mapa-telas-frontend.md` e este status
- fora de escopo mantido: Google Maps real, app Flutter, WebSocket, Work Orders completas, despacho completo, roteirizacao avancada, novos endpoints e backend novo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts` e `git diff --check`

## Atualizacao 2026-06-09 - work orders foundation

- branch usada: `feature/work-orders-foundation`
- objetivo: implementar fundacao backend tenant-scoped de Ordens de Servico
- migration criada: `20260616000000_add_work_orders`
- tabelas criadas: `work_orders`, `work_order_events` e `work_order_assignments`
- RLS aplicado com `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e policy por `app.current_tenant_id`
- modulo criado: `src/modules/work-orders`
- endpoints criados: `GET /api/v1/work-orders`, `POST /api/v1/work-orders`, `GET /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId/status`, `POST /api/v1/work-orders/:workOrderId/assign` e `GET /api/v1/work-orders/:workOrderId/timeline`
- RBAC atualizado com `work_orders:read`, `work_orders:create`, `work_orders:update`, `work_orders:assign`, `work_orders:status`, `work_orders:cancel` e `work_orders:delete`
- timeline/eventos implementados: created, updated, assigned, status_changed, cancelled e completed
- auditoria best-effort adicionada para criacao, atualizacao, atribuicao, status, cancelamento e conclusao
- navigation registry atualizado: `operations.workOrders` passa a `backend-ready`
- testes criados/atualizados: `tests/work-orders.test.ts`, `tests/work-orders-routes.test.ts`, `tests/core-saas.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/work-orders.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/backend-navigation-menu.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: UI completa de Work Orders, despacho avancado, roteirizacao, comissao, pagamento de prestador, app Flutter, Google Maps real, fotos/assinaturas especificas de OS, estoque/pecas e integracao externa
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/work-orders.test.ts`, `node --test --import tsx tests/work-orders-routes.test.ts`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## Atualizacao 2026-06-09 - work orders UI

- branch usada: `feature/work-orders-ui`
- objetivo: implementar UI web de Ordens de Servico consumindo a API real de `work_orders`
- rotas implementadas: `/work-orders`, `/work-orders/new` e `/work-orders/:workOrderId`
- modulo frontend criado em `frontend/src/modules/work-orders` com types, adapter, service, hooks, mocks, paginas e componentes
- endpoints consumidos: `GET /api/v1/work-orders`, `POST /api/v1/work-orders`, `GET /api/v1/work-orders/:workOrderId`, `PATCH /api/v1/work-orders/:workOrderId/status`, `POST /api/v1/work-orders/:workOrderId/assign` e `GET /api/v1/work-orders/:workOrderId/timeline`
- lista implementada com KPIs, busca, filtros por status/prioridade/operador/periodo, tabela responsiva e estados loading/empty/error/fallback
- criacao implementada com validacao frontend de titulo, prioridade, latitude, longitude e agendamento
- detalhe implementado com dados de cliente/endereco/coordenadas/datas, timeline, alteracao de status, atribuicao manual por UUID e link para `/operations/map`
- RBAC frontend alinhado para `work_orders:read`, `work_orders:create`, `work_orders:update`, `work_orders:assign`, `work_orders:status` e `work_orders:cancel`
- fallback/mock seguro implementado para `VITE_USE_MOCKS=true`, API vazia, falha de API ou erro local de autorizacao
- navigation registry atualizado para `operations.workOrders` como `implemented`
- fora de escopo mantido: despacho avancado, roteirizacao, comissao de guincheiro/prestador, pagamento, Flutter/mobile, Google Maps real, upload de evidencias especificas de OS, estoque/pecas e novos endpoints backend
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate status`, `npm run test:e2e`, `node --test --import tsx tests/work-orders.test.ts`, `node --test --import tsx tests/work-orders-routes.test.ts`, `node --test --import tsx tests/field-location-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/core-saas.test.ts` e `git diff --check`

## Atualizacao 2026-06-10 - operations map + work orders integration

- branch usada: `feature/operations-map-work-orders-integration`
- objetivo: integrar a UI de Mapa Operacional com Ordens de Servico sem backend novo, migrations ou endpoints adicionais
- diagnostico inicial: PRs #52, #53 e #54 confirmadas como merged; `origin/HEAD` apontando para `origin/main`; worktree limpo antes da alteracao; branch criada a partir de `main` atualizado
- `operations.map` atualizado no registry para status `implemented` e endpoints relacionados de `work_orders`
- mapa passa a enriquecer operadores com OS ativa/atribuida quando o contexto possui `work_orders:read`; sem essa permissao, a tela continua funcionando apenas com `field_location:read`
- UI atualizada: marcador, lista e detalhe mostram codigo/status/prioridade da OS vinculada e link para `/work-orders/:workOrderId`
- services/adapters preservam fallback/mock seguro, nao registram coordenadas em logs e nao fazem `fetch` direto em componentes
- testes atualizados: smoke cobre correlacao adapter/service e E2E valida link de OS no mapa quando RBAC permite
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/09-mapa-telas-frontend.md`, `docs/modules.md`, `docs/api.md`, `docs/02-mapa-modulos.md` e este status
- fora de escopo mantido: Google Maps real, WebSocket/tempo real, despacho avancado, roteirizacao, Flutter/mobile, comissoes, estoque, backend novo e migrations

## Atualizacao 2026-06-10 - field dispatch routing foundation

- branch usada: `feature/field-dispatch-routing-foundation`
- objetivo: implementar a fundacao backend tenant-scoped de despacho operacional conectando Work Orders, operadores de campo e futuro Mapa Operacional
- diagnostico inicial: PRs #53, #54 e #55 confirmadas como merged; `origin/HEAD` apontando para `origin/main`; worktree limpo antes da alteracao; branch criada a partir de `main` atualizado
- migration criada: `20260617000000_add_field_dispatches`
- tabelas criadas: `field_dispatches` e `field_dispatch_events`
- RLS aplicado com `ENABLE ROW LEVEL SECURITY`, `FORCE ROW LEVEL SECURITY` e policy por `app.current_tenant_id`
- modulo criado: `src/modules/field-dispatch`
- endpoints criados: `GET /api/v1/operations/dispatches`, `POST /api/v1/operations/dispatches`, `GET /api/v1/operations/dispatches/:dispatchId`, `PATCH /api/v1/operations/dispatches/:dispatchId/status` e `PATCH /api/v1/operations/dispatches/:dispatchId/reassign`
- RBAC atualizado com `field_dispatch:read`, `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`
- regras implementadas: OS e operador precisam pertencer ao tenant do actor; cancelamento exige motivo; reatribuicao valida novo operador no mesmo tenant
- eventos/timeline implementados: `field_dispatch_created`, `field_dispatch_status_changed`, `field_dispatch_reassigned` e `field_dispatch_cancelled`
- auditoria best-effort adicionada para `field_dispatch.created`, `field_dispatch.status_changed`, `field_dispatch.reassigned` e `field_dispatch.cancelled`
- navigation registry atualizado: `operations.dispatches` passa a `backend-ready` com endpoints relacionados
- testes criados/atualizados: `tests/field-dispatch.test.ts`, `tests/field-dispatch-routes.test.ts` e `tests/rls-tenant-isolation.test.ts`
- documentacao atualizada em `docs/modules.md`, `docs/rbac.md`, `docs/api.md`, `docs/api-screen-endpoints.md`, `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/database.md`, `docs/02-mapa-modulos.md`, `docs/05-requisitos-funcionais.md`, `RBAC_MATRIX.md` e este status
- fora de escopo mantido: UI completa de despacho, Google Maps real, roteirizacao/otimizacao, WebSocket/tempo real, Flutter/mobile, comissoes, pagamentos e despacho completo
- validacoes executadas com sucesso: `npm run check`, `npm run lint`, `npm test`, `npm run build`, `npm --prefix frontend run check`, `npm --prefix frontend run build`, `npm --prefix frontend run test:smoke`, `npx prisma validate`, `npx prisma generate`, `docker compose config`, `docker compose up -d`, `docker compose ps`, `npx prisma migrate deploy`, `npx prisma migrate status`, `node --test --import tsx tests/field-dispatch.test.ts`, `node --test --import tsx tests/field-dispatch-routes.test.ts`, `node --test --import tsx tests/navigation-menu.test.ts`, `node --test --import tsx tests/navigation-menu-routes.test.ts`, `node --test --import tsx tests/rls-tenant-isolation.test.ts`, `npm run test:e2e` e `git diff --check`

## Atualizacao 2026-06-10 - field dispatch UI

- branch usada: `feature/field-dispatch-ui`
- objetivo: implementar a primeira UI web de Despachos Operacionais consumindo a fundacao backend de `field_dispatch`
- rota implementada: `/operations/dispatches`
- modulo frontend criado em `frontend/src/modules/operations/dispatches` com types, adapter, service, hook, mocks, pagina e componentes
- endpoints consumidos: `GET /api/v1/operations/dispatches`, `POST /api/v1/operations/dispatches`, `GET /api/v1/operations/dispatches/:dispatchId`, `PATCH /api/v1/operations/dispatches/:dispatchId/status`, `PATCH /api/v1/operations/dispatches/:dispatchId/reassign` e `GET /api/v1/work-orders` quando `work_orders:read` estiver disponivel para enriquecer codigo/titulo/prioridade da OS
- UI entregue: listagem, filtros por status/prioridade/operador/busca por OS, KPIs, detalhe, criacao simples, alteracao de status, cancelamento quando permitido, reatribuicao, badges, loading, vazio, erro e fallback/mock seguro
- RBAC frontend aplicado: `field_dispatch:read`, `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` e `field_dispatch:reassign`
- navigation registry atualizado: `operations.dispatches` passa a `implemented`
- testes atualizados/criados: `frontend/tests/smoke-flow.test.tsx`, `frontend/tests/dispatches.adapter.test.ts` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/frontend-screens.md`, `docs/09-mapa-telas-frontend.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/rbac.md`, `docs/api.md`, `docs/backend-navigation-menu.md`, `docs/frontend-menu-navigation.md`, `docs/field-operator-location-map.md`, `docs/work-orders.md`, `docs/02-mapa-modulos.md`, `docs/platform-console.md` e este status
- fora de escopo mantido: backend novo, migrations, Google Maps real, app Flutter/mobile, roteirizacao avancada, WebSocket/tempo real, despacho completo, comissoes e pagamentos

## Atualizacao 2026-06-10 - operations map dispatch integration

- branch usada: `feature/operations-map-dispatch-integration`
- objetivo: integrar o Mapa Operacional com Despachos Operacionais sem backend novo, migrations ou endpoints adicionais
- `/operations/map` continua protegido por `field_location:read` e funcionando sem `field_dispatch:read`

## Atualizacao 2026-06-10 - operations map dispatch actions

- branch usada: `feature/operations-map-dispatch-actions`
- objetivo: habilitar acoes diretas de despacho no detalhe do operador em `/operations/map`, reutilizando a fundacao `field_dispatch` existente
- escopo mantido em frontend, documentacao e testes; sem backend novo, migrations, endpoints novos, Google Maps, WebSocket, Flutter, roteirizacao ou despacho completo
- acoes entregues: alterar status com `field_dispatch:update`, cancelar com `field_dispatch:cancel` e motivo obrigatorio, reatribuir com `field_dispatch:reassign`
- endpoints consumidos pela tela: `GET /api/v1/operations/dispatches`, `PATCH /api/v1/operations/dispatches/:dispatchId/status` e `PATCH /api/v1/operations/dispatches/:dispatchId/reassign`
- registro de navegacao `operations.map` atualizado para documentar endpoints de despacho consumidos condicionalmente
- quando `field_dispatch:read` esta presente, o mapa consome `GET /api/v1/operations/dispatches` e mostra despacho vinculado no marcador/lista/painel de detalhe
- quando `field_dispatch:create` tambem esta presente e existe OS atual, o painel abre `/operations/dispatches?workOrderId=...&operatorUserId=...` para criacao contextual
- `/operations/dispatches` passa a aceitar contexto por query string (`workOrderId`, `operatorUserId` e `dispatchId`) para filtro, acompanhamento e pre-preenchimento de criacao
- fallback/mock atualizado para cobrir operador com OS e despacho vinculado
- testes atualizados: `frontend/tests/dispatches.adapter.test.ts` e `tests/e2e/critical-flows.spec.ts`
- documentacao atualizada em `docs/field-operator-location-map.md`, `docs/frontend-screens.md`, `docs/api-screen-endpoints.md`, `docs/modules.md`, `docs/work-orders.md`, `docs/rbac.md` e este status
- fora de escopo mantido: backend novo, migrations, Google Maps real, WebSocket/tempo real, Flutter/mobile, roteirizacao avancada, despacho completo, comissoes, pagamentos e fiscal
