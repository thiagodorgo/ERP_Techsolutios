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
