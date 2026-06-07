# Telas Frontend

Este documento consolida os nomes atuais de telas e boundaries visuais do produto.

## Nomenclatura

- "Usuarios & RBAC" passa a ser exibido como "Usuarios".
- "Admin de Tenant" passa a ser exibido como "Administrador".
- "Console da Plataforma" e a area global do dono do SaaS/Super Admin.

Se algum nome tecnico interno antigo permanecer para evitar refatoracao destrutiva, a pendencia deve ser tratada em bloco proprio. Labels visiveis devem usar a nomenclatura atual.

## Console da Plataforma

Usa layout separado do tenant e deve ficar reservado ao escopo `platform`.

- P01 - Tenants
- P02 - Detalhe do Tenant
- P03 - Modulos do Tenant

Rotas MVP:

- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/tenants/:tenantId/modules`

## Administrador

Area do administrador do tenant/empresa cliente. Gerencia usuarios, permissoes e configuracoes apenas da propria empresa.

## Usuarios

Area para listar, convidar, editar e gerenciar usuarios e permissoes do tenant atual.

## Checklists

Area tenant-scoped para configurar e executar checklists publicados pela feature `tenant_checklist`.

Telas planejadas:

- `W02A · Administrador — Checklists`, rota `/administrator/checklists`.
- Lista de templates de checklist.
- Builder/editor de checklist.
- Painel de componentes disponiveis.
- Configuracao de campo.
- Execucao/preenchimento de checklist.
- Historico de execucoes.
- Detalhe de execucao com respostas/evidencias.

Componentes planejados:

- `ChecklistTemplateListPage.tsx`
- `ChecklistBuilderPage.tsx`
- `ChecklistExecutionPage.tsx`
- `ChecklistRunDetailPage.tsx`
- `ChecklistFieldRenderer.tsx`
- `ChecklistComponentPalette.tsx`
- `ChecklistFieldConfigPanel.tsx`

Regras de UX:

- o tenant escolhe componentes permitidos pela plataforma, sem criar novos tipos;
- o tenant escolhe o tipo `towing_collection`, `towing_delivery`, `technical_evidence` ou `custom`;
- W02A deve listar checklists do tenant, criar checklist, editar checklist, ativar/inativar, selecionar componentes disponiveis, configurar obrigatoriedade de fotos, observacoes, marcadores e ciencia, e publicar checklist;
- campos obrigatorios devem ficar visiveis antes de publicar e antes de concluir execucao;
- builder deve preservar ordem dos campos e status da versao;
- execucao mobile futura deve priorizar preenchimento rapido, captura de evidencia e sincronizacao offline;
- telas devem respeitar modulos habilitados e permissoes `tenant_checklists:*` e `checklist_runs:*`.

## Checklists Mobile

M10, M11 e M12 nao devem ser tratados como telas hardcoded. Eles devem renderizar componentes a partir do schema retornado pela API.

- M10: checklist de guincho/reboque para coleta (`towing_collection`), selecao de tipo de veiculo e marcacao de avarias.
- M11: checklist de guincho/reboque para entrega (`towing_delivery`), nova vistoria e comparacao com coleta.
- Divergencia em M11: exigir observacao obrigatoria e ciencia de responsabilidade.
- M12: evidencia tecnica antes/depois (`technical_evidence`) para reparo, construcao, manutencao ou servicos internos/externos; nao pertence ao escopo de guincho/reboque.

Tipos frontend previstos:

- `TenantChecklist`
- `TenantChecklistComponent`
- `ChecklistRun`
- `ChecklistMarker`
- `ChecklistAttachment`
- `ChecklistAcknowledgement`

## Sidebar dinamica

A sidebar completa representada no Figma e referencia para Admin/Tenant Owner, nao para usuario comum. A sidebar real deve ser filtrada por:

- tenant ativo;
- plano contratado;
- modulos habilitados;
- papel do usuario;
- permissoes RBAC.
