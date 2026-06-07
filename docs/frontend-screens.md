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
- Integracao atual: W02A usa a API real de `tenant_checklist` como fonte principal para listar templates, carregar componentes, criar, editar, publicar e ativar/inativar checklists. Mock local fica apenas como fallback explicito de desenvolvimento via `VITE_USE_MOCKS=true`.
- Evolucao `FIGMA-CHECKLIST-BUILDER-UX.1`: W02A funciona como builder visual MVP, com lista filtravel, busca por nome, palette de componentes, canvas com ordenacao por botoes, inspector de componente, preview de schema e `pending_changes` apenas como estado visual de UI.
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
- componentes oficiais do handoff Figma: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`;
- campos obrigatorios devem ficar visiveis antes de publicar e antes de concluir execucao;
- builder deve preservar ordem dos campos e status da versao;
- `pending_changes` nao e status backend; ele apenas sinaliza na UI quando um checklist publicado recebeu alteracoes depois da publicacao;
- execucao mobile futura deve priorizar preenchimento rapido, captura de evidencia e sincronizacao offline;
- telas devem respeitar modulos habilitados e permissoes `tenant_checklists:*` e `checklist_runs:*`.

Estados oficiais:

- checklist rascunho;
- checklist publicado;
- checklist inativo;
- execucao em andamento;
- execucao concluida;
- execucao com divergencia;
- execucao pendente de ciencia.

## Checklists Mobile

M10, M11 e M12 nao devem ser tratados como telas hardcoded. Eles devem renderizar componentes a partir do schema retornado pela API.

- M10: checklist de guincho/reboque para coleta (`towing_collection`), selecao de tipo de veiculo, imagem dinamica por tipo de veiculo, marcacao de avarias e fotos obrigatorias conforme template.
- M11: checklist de guincho/reboque para entrega (`towing_delivery`), nova vistoria e comparacao com coleta.
- Divergencia em M11: exigir foto, observacao obrigatoria e ciencia de responsabilidade.
- M12: evidencia tecnica antes/depois (`technical_evidence`) para reparo, manutencao, construcao ou servico tecnico; exige foto antes, foto depois e observacoes conforme template; nao pertence ao escopo de guincho/reboque.

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

Padrao oficial:

- usuario sem permissao nao ve o link;
- nao renderizar links desabilitados, grupos vazios, placeholders ou icones recolhidos sem permissao;
- sidebar recolhida e expandida usam a mesma lista filtrada;
- Platform Admin ve Console da Plataforma e pode alternar para contexto tenant/admin/operacao autorizado;
- Tenant Admin ve apenas administracao do proprio tenant/empresa cliente, incluindo W02A quando possuir `tenant_checklists:read`;
- Supervisor ve operacao, equipe, tarefas, checklists operacionais, aprovacoes e relatorios permitidos no proprio tenant;
- Operador ve apenas operacao propria, tarefas, OS/atendimentos, checklists operacionais permitidos e notificacoes;
- W02A nao e checklist operacional: operador nao deve ver `/administrator/checklists`.
