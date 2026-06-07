# Modulos

Este documento separa os conceitos de modulos globais da plataforma e modulos habilitados por tenant.

## Modulos globais da plataforma

Sao capacidades conhecidas pelo produto e controladas pelo dono da plataforma. Eles definem o catalogo disponivel para planos e tenants.

Exemplos:

- dashboard
- users
- tenant-admin
- inventory
- approvals
- finance
- notifications
- mobile
- checklists
- purchasing
- suppliers
- customers
- technicians
- vehicles
- reports
- audit
- integrations
- analytics

## Modulos habilitados por tenant

Sao os modulos efetivamente ativos para um tenant especifico. A visibilidade no frontend deve considerar:

- tenant ativo;
- plano contratado;
- modulos habilitados para o tenant;
- papel do usuario;
- permissoes RBAC.

## Modulos do MVP

- dashboard
- users
- tenant-admin
- inventory
- approvals
- finance
- notifications
- mobile

## Modulos Fase 2

- checklists
- purchasing
- suppliers
- customers
- technicians
- vehicles
- reports
- audit

## Modulos Enterprise

- integrations
- analytics

## Regras

- Um modulo pode existir no catalogo global e ainda nao estar habilitado para um tenant.
- Um modulo pode estar bloqueado por plano mesmo quando aparece no Console da Plataforma.
- A sidebar do tenant nao deve mostrar todos os modulos para todos os usuarios.
- O Console da Plataforma gerencia habilitacao por tenant; o Administrador gerencia configuracoes internas do tenant.
- O modulo `checklists` e tenant-scoped: a plataforma define o catalogo de componentes permitidos, e cada tenant configura apenas modelos, campos, ordem, obrigatoriedade, regras e publicacao.
- Modelos publicados de checklist devem ser versionados para que execucoes antigas continuem vinculadas a versao original.
