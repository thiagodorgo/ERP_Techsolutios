# Status Geral

## Resumo

Repositorio organizado com base no GitHub oficial e na documentacao v1 enviada nesta sessao.

## Entregas realizadas

- importacao da documentacao de produto v1
- adicionados arquivos-base de governanca
- adicionada estrutura `agent-orchestration/`
- adicionada fundacao tecnica minima em Node.js + TypeScript
- registrada divergencia arquitetural entre memoria historica e repositorio atual

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
