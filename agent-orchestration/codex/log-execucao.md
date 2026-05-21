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
