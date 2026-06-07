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
- tenant_checklist
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

- tenant_checklist
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
- A feature `tenant_checklist` e tenant-scoped: a plataforma define o catalogo de componentes permitidos, e cada tenant configura apenas modelos, campos, ordem, obrigatoriedade, regras e publicacao.
- A navegacao deve combinar modulo/feature habilitada com RBAC: sem permissao, o item nao aparece, inclusive no modo de sidebar recolhida.
- Itens planejados ou indisponiveis nao devem aparecer como links desabilitados; devem ficar fora da lista ate serem publicados.
- A filtragem visual do frontend nao substitui autorizacao backend; cada endpoint sensivel deve validar permissao, papel, tenant context e isolamento por `tenant_id`.
- Modelos publicados de checklist devem ser versionados para que execucoes antigas continuem vinculadas a versao original.
- `tenant_checklist` deve suportar os tipos `towing_collection`, `towing_delivery`, `technical_evidence` e `custom`.
- Componentes oficiais do handoff Figma: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`.
- M10/M11 consomem schemas de guincho/reboque configurados pelo tenant; M12 consome schema de evidencia tecnica e nao pertence ao escopo de guincho/reboque.
- Estados oficiais: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.
