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
- messaging_jobs

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
- W03 `Administrador — Configurações` centraliza categorias de configuracao do tenant sem criar persistencia nova nesta rodada; Dashboard/Resumo Financeiro nao usa W03.
- A feature `tenant_checklist` e tenant-scoped: a plataforma define o catalogo de componentes permitidos, e cada tenant configura apenas modelos, campos, ordem, obrigatoriedade, regras e publicacao.
- A navegacao deve combinar modulo/feature habilitada com RBAC: sem permissao, o item nao aparece, inclusive no modo de sidebar recolhida.
- Itens planejados ou indisponiveis nao devem aparecer como links desabilitados; devem ficar fora da lista ate serem publicados.
- A filtragem visual do frontend nao substitui autorizacao backend; cada endpoint sensivel deve validar permissao, papel, tenant context e isolamento por `tenant_id`.
- Endpoints sensiveis devem usar `Authorization: Bearer` como caminho principal; headers legados ficam restritos a desenvolvimento/teste e nao autenticam em producao.
- Modelos publicados de checklist devem ser versionados para que execucoes antigas continuem vinculadas a versao original.
- `tenant_checklist` deve suportar os tipos `towing_collection`, `towing_delivery`, `technical_evidence` e `custom`.
- Componentes oficiais do handoff Figma: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`.
- M10/M11 consomem schemas de guincho/reboque configurados pelo tenant; M12 consome schema de evidencia tecnica e nao pertence ao escopo de guincho/reboque.
- Estados oficiais: checklist rascunho, checklist publicado, checklist inativo, execucao em andamento, execucao concluida, execucao com divergencia e execucao pendente de ciencia.
- Anexos de checklist usam upload local real em desenvolvimento, com `fileUrl` logico, metadados persistidos em `checklist_attachments`, RBAC/RLS por tenant e caminho preparado para S3-compatible futuro.
- O frontend possui service, adapter, mock fallback e componentes reutilizaveis para upload/lista/preview de evidencias; W02A mostra suporte no preview sem assumir papel de tela operacional.
- O runtime web operacional usa `/operations/checklists` e `/operations/checklists/:checklistId/run`, consome schemas publicados via endpoints compartilhados `/mobile/*`, renderiza componentes oficiais e mantem W02A como builder administrativo.
- Hardening do runtime web: validacao client-side por schema, progresso de obrigatorios, resumo/status do run, comparacao/divergencia/ciencia e separacao `before_after` por metadata, sem hardcode de M10/M11/M12.
- Limites mantidos: canvas visual avancado para avarias, drag-and-drop, offline e exclusao persistente de markers dependem de proximas fases.
- `messaging_jobs` e uma fundacao transversal backend: Redis enfileira jobs/eventos internos, mas nao aparece como modulo de tenant nem como item de sidebar.
- O fluxo inicial de mensageria publica `checklist_run.attachment_uploaded` apos upload de anexo e enfileira `checklist-attachment-postprocess` sem tornar o upload critico dependente do Redis.
- `audit` e uma capacidade transversal tenant-scoped: acoes criticas gravam `audit_logs` de forma sincronica, com contrato enterprise em `docs/audit.md`, RLS por tenant, RBAC `audit.read` para consulta e fanout complementar `audit_log.created` via Redis.
