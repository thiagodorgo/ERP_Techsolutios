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
- ainda nao ha dependencia instalada no ambiente local
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
