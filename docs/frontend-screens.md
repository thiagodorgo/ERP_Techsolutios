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
- P04 - Cloud Billing

Rotas MVP:

- `/platform/tenants`
- `/platform/tenants/:tenantId`
- `/platform/tenants/:tenantId/modules`
- `/platform/cloud-billing`

Cloud Billing implementado nesta branch:

- rota `/platform/cloud-billing`;
- abas internas: Visao geral, Uso, Custos AWS, Rateio, Cobranca, Regras e Runs;
- consome `cloud_usage_metering`, `cloud_cost_import`, `cloud_cost_allocation` e `cloud_charge_markup_rules`;
- acoes previstas: importacao manual de CUR, run de rateio, calculo de cobranca e criacao/edicao de regras;
- custo alocado, valor cobravel e margem continuam restritos ao Console da Plataforma e nao aparecem em tela tenant.

## Autenticacao

Tela implementada:

- `W01 · Login`, rota `/login`.

Comportamento:

- em modo real (`VITE_USE_MOCKS=false`), envia `tenantId`, e-mail e senha para `POST /api/v1/auth/login`;
- armazena access token, refresh token, expiracoes e metadados da sessao em `localStorage`;
- o API client passa a enviar `Authorization: Bearer` automaticamente;
- em `401` de rota protegida, tenta refresh unico via `POST /api/v1/auth/refresh` e repete a chamada com o novo access token;
- se o refresh falhar, a sessao local e limpa e o usuario volta ao fluxo de login;
- logout limpa token, sessao local e contexto ativo e chama `POST /api/v1/auth/logout` em best effort;
- em modo mock (`VITE_USE_MOCKS=true`), preserva login/contextos simulados para desenvolvimento.

Cookie httpOnly, storage alternativo, MFA e OAuth/social login ficam fora desta rodada.

Smoke tests frontend:

- comando: `npm --prefix frontend run test:smoke`;
- cobertura inicial: login, auth storage/service, refresh-on-401, logout, API client Bearer, guards/sidebar RBAC, `/login`, W02A Checklists, W03 Configurações, Platform Console, Cloud Billing e anexos de checklist;
- estrategia: testes leves com `node:test`, `tsx` e renderizacao server-side React, sem Playwright/Cypress nesta rodada.

E2E real em navegador:

- comando: `npm run test:e2e`;
- stack: Playwright com Chromium, backend Prisma em `CORE_SAAS_PERSISTENCE=prisma` e frontend Vite em modo real (`VITE_USE_MOCKS=false`);
- pre-requisitos: Docker/PostgreSQL/Redis ativos, migrations aplicadas e Chromium instalado com `npx playwright install chromium`;
- o comando executa o seed demo idempotente antes dos testes, usando `admin.demo@example.com` e `DEMO_ADMIN_PASSWORD` local;
- cobertura inicial: login real, erro de login, guard de rota protegida, sessao com refresh token, logout, sidebar RBAC de tenant admin, W02A, runtime web de checklists, W03, bloqueio do Console da Plataforma para usuario tenant e acesso positivo do Platform Admin a `/platform/tenants` e `/platform/cloud-billing`;
- seed E2E: `platform.admin@erp.local` usa role global `super_admin` e senha local/dev `E2E_PLATFORM_PASSWORD` ou fallback `platform-admin-dev-password`.

## Administrador

Area do administrador do tenant/empresa cliente. Gerencia usuarios, permissoes e configuracoes apenas da propria empresa.

Tela implementada:

- `W03 · Administrador — Configurações`, rota `/administrator/settings`.
- Objetivo: centralizar preferências, acessos, módulos e padrões operacionais da empresa sem duplicar telas especializadas.
- Seções MVP: Geral, Aparência, Usuários e Acesso, Módulos e Checklists.
- Seções planejadas: Notificações, Integrações e Segurança/Auditoria.
- Checklists aponta para W02A em `/administrator/checklists`; W03 não duplica o builder.
- Aparência exibe os temas planejados `enterprise_blue`, `tech_dark` e `green_operations`, sem persistência real nesta rodada.
- RBAC frontend: usa `tenant:manage` enquanto a permissão dedicada `tenant_settings:read` não existir no catálogo backend.
- Decisão oficial: Dashboard/Resumo Financeiro não usa W03.

## Usuarios

Area para listar, convidar, editar e gerenciar usuarios e permissoes do tenant atual.

## Checklists

Area tenant-scoped para configurar e executar checklists publicados pela feature `tenant_checklist`.

Telas implementadas:

- `W02A · Administrador — Checklists`, rota `/administrator/checklists`.
- Integracao atual: W02A usa a API real de `tenant_checklist` como fonte principal para listar templates, carregar componentes, criar, editar, publicar e ativar/inativar checklists. Mock local fica apenas como fallback explicito de desenvolvimento via `VITE_USE_MOCKS=true`.
- Evolucao `FIGMA-CHECKLIST-BUILDER-UX.1`: W02A funciona como builder visual MVP, com lista filtravel, busca por nome, palette de componentes, canvas com ordenacao por botoes, inspector de componente, preview de schema e `pending_changes` apenas como estado visual de UI.
- Integracao de anexos: frontend possui service/adapter/mock para upload multipart e download protegido de evidencias de checklist. W02A nao vira tela operacional; o preview de schema apenas indica que `photo_upload`, `before_after` e `damage_map` suportam evidencias via upload seguro.
- `Checklists Operacionais`, rota `/operations/checklists`.
- `Runtime operacional de checklist`, rota `/operations/checklists/:checklistId/run`.
- O runtime web lista checklists publicados, carrega schema via API, cria execucao, salva respostas, renderiza componentes oficiais, integra upload/lista/download de evidencias, registra marcadores MVP e conclui execucao.
- Os endpoints `/mobile/*` sao usados pelo web como runtime operacional compartilhado web/mobile; o nome pode ser renomeado futuramente com compatibilidade.
- Hardening atual do runtime web:
  - validacao client-side basica por schema bloqueia conclusao quando obrigatorios basicos estao incompletos;
  - progresso, status do run, resumo de preenchimento e mensagens de sucesso/falha ficam visiveis na execucao;
  - `comparison` consulta o endpoint de comparacao quando o schema traz o componente e permite registrar divergencia com observacao e evidencia ja anexada;
  - `acknowledgement` usa texto configuravel do schema e chama o endpoint de ciencia somente quando o backend deixa o run `pending_acknowledgement`;
  - `before_after` separa evidencias por metadata `stage=before` e `stage=after`;
  - `damage_map` envia markers estruturados com tipo/descricao e permite remocao local da lista; exclusao persistente depende de endpoint futuro.
- Limite E2E atual: cobre lista operacional, tela de run e bloqueio de obrigatorios incompletos. Completar fluxo real com upload/ciência depende de seed estavel de evidencias.

Telas planejadas:

- Lista de templates de checklist.
- Builder/editor de checklist.
- Painel de componentes disponiveis.
- Configuracao de campo.
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
- `ChecklistAttachmentUploader.tsx`
- `ChecklistAttachmentList.tsx`
- `ChecklistEvidencePreview.tsx`
- `ChecklistRunsPage.tsx`
- `ChecklistRuntimePage.tsx`
- `ChecklistRuntimeRenderer.tsx`
- `ChecklistRuntimeField.tsx`
- `ChecklistRunStatusBadge.tsx`
- `ChecklistRunSummary.tsx`

Regras de UX:

- o tenant escolhe componentes permitidos pela plataforma, sem criar novos tipos;
- o tenant escolhe o tipo `towing_collection`, `towing_delivery`, `technical_evidence` ou `custom`;
- W02A deve listar checklists do tenant, criar checklist, editar checklist, ativar/inativar, selecionar componentes disponiveis, configurar obrigatoriedade de fotos, observacoes, marcadores e ciencia, e publicar checklist;
- componentes oficiais do handoff Figma: `vehicle_selector`, `damage_map`, `photo_upload`, `observation`, `comparison`, `acknowledgement` e `before_after`;
- campos obrigatorios devem ficar visiveis antes de publicar e antes de concluir execucao;
- builder deve preservar ordem dos campos e status da versao;
- `pending_changes` nao e status backend; ele apenas sinaliza na UI quando um checklist publicado recebeu alteracoes depois da publicacao;
- execucao mobile futura deve priorizar preenchimento rapido, captura de evidencia e sincronizacao offline;
- execucao web operacional deve consumir schema publicado, sem hardcode de M10/M11/M12;
- upload/download de evidencias deve usar os endpoints seguros de `checklist_runs` e preservar `VITE_USE_MOCKS=true` como fallback local;
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

## Notificacoes

Tela implementada:

- `Notificacoes`, rota `/notifications`.

Objetivo:

- exibir a inbox interna do usuario autenticado no tenant ativo;
- mostrar contador de notificacoes nao lidas no AppShell/sidebar;
- listar titulo, mensagem, severidade, status, data e origem operacional;
- filtrar por todas, nao lidas, lidas e arquivadas;
- permitir marcar uma notificacao como lida, marcar todas como lidas e arquivar;
- permitir abrir `actionUrl` apenas quando for rota interna segura iniciada por `/`.

RBAC e visibilidade:

- rota protegida por `notifications:read`;
- acoes de leitura usam `notifications:read`;
- acoes de marcar lida/read-all/arquivar usam `notifications:update`;
- item de menu aparece apenas com modulo `notifications` habilitado e permissao `notifications:read`;
- Platform Admin fora do shell tenant continua no Console da Plataforma, sem item de tenant.

Limites:

- nao ha e-mail, SMS, WhatsApp, push externo, chat ou provider externo nesta rodada;
- nao ha polling agressivo; o contador e atualizado ao montar layout/pagina e apos acoes locais;
- metadata sensivel ou completa nao e renderizada;
- o E2E real valida render/empty state sem depender de seed com notificacoes.

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
- Tenant Admin ve W03 Configurações quando possuir permissao administrativa compatível, atualmente `tenant:manage`;
- Supervisor ve operacao, equipe, tarefas, checklists operacionais, aprovacoes e relatorios permitidos no proprio tenant;
- Operador ve apenas operacao propria, tarefas, OS/atendimentos, checklists operacionais permitidos e notificacoes;
- W02A nao e checklist operacional: operador nao deve ver `/administrator/checklists`.
- W03 nao e tela operacional: operador e supervisor sem permissao administrativa nao devem ver `/administrator/settings`.

Fonte backend oficial:

- `GET /api/v1/navigation/menu` retorna o menu por usuario autenticado;
- o frontend deve resolver os icones por nome (`LayoutDashboard`, `Building2`, `Receipt`, `ClipboardCheck`, `Bell`, `Map`, `Truck`, etc.);
- `group` organiza a navegacao em `platform`, `tenant`, `operations`, `logistics` e `finance`;
- `status` informa maturidade da tela (`implemented`, `partial`, `mock`, `planned`, `backend-ready`, `frontend-ready`, `future`);
- `relatedEndpoints` documenta rastreabilidade com APIs de dominio;
- menus locais continuam apenas como fallback/mock de transicao.
- implementação atual: `AppShell` e `PlatformLayout` consomem `useNavigationMenu`; o adapter mapeia ícones `lucide-react`, normaliza grupos e mantém active state via `NavLink`.
