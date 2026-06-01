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
