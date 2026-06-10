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
- field_operations
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
- cloud_usage_metering
- cloud_cost_import
- cloud_cost_allocation
- cloud_charge_markup_rules
- platform_cloud_billing_ui
- backend_navigation_menu
- field_operator_location

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
- Anexos de checklist usam storage configuravel por ambiente: provider `local` em desenvolvimento e provider `s3` para storage S3-compatible, com metadados internos persistidos em `checklist_attachments`, download protegido, RBAC/RLS por tenant e sem expor bucket/storage key/path privado na API.
- O frontend possui service, adapter, mock fallback e componentes reutilizaveis para upload/lista/preview de evidencias; W02A mostra suporte no preview sem assumir papel de tela operacional.
- O runtime web operacional usa `/operations/checklists` e `/operations/checklists/:checklistId/run`, consome schemas publicados via endpoints compartilhados `/mobile/*`, renderiza componentes oficiais e mantem W02A como builder administrativo.
- Hardening do runtime web: validacao client-side por schema, progresso de obrigatorios, resumo/status do run, comparacao/divergencia/ciencia e separacao `before_after` por metadata, sem hardcode de M10/M11/M12.
- Limites mantidos: canvas visual avancado para avarias, drag-and-drop, offline e exclusao persistente de markers dependem de proximas fases.
- `messaging_jobs` e uma fundacao transversal backend: Redis enfileira jobs/eventos internos, mas nao aparece como modulo de tenant nem como item de sidebar.
- O fluxo inicial de mensageria publica `checklist_run.attachment_uploaded` apos upload de anexo e enfileira `checklist-attachment-postprocess` sem tornar o upload critico dependente do Redis.
- `audit` e uma capacidade transversal tenant-scoped: acoes criticas gravam `audit_logs` de forma sincronica, com contrato enterprise em `docs/audit.md`, RLS por tenant, RBAC `audit.read` para consulta e fanout complementar `audit_log.created` via Redis.
- `notifications` e uma capacidade transversal tenant-scoped: eventos operacionais de checklist podem gerar inbox interna por usuario via job Redis, com RBAC `notifications:read`/`notifications:update`, RLS por tenant e sem integracao externa nesta fase.
- O frontend web expõe `notifications` em `/notifications` como inbox interna do usuario, com contador de nao lidas no AppShell/sidebar, filtros simples, marcar como lida/read-all, arquivar e navegacao segura apenas para `actionUrl` interna.
- `cloud_usage_metering` e uma capacidade transversal de plataforma: registra uso interno por tenant em `cloud_usage_events`, agrega diariamente em `cloud_usage_daily_aggregates` e prepara a ponte futura para custo AWS real, rateio, markup e cobranca cloud com lucro.
- Nesta branch `cloud_usage_metering` mede uso, nao custo: AWS CUR, Cost Explorer, Billing Conductor, preco, margem, fatura e pagamento ficam fora do escopo.
- `cloud_cost_import` e uma capacidade transversal de plataforma: importa custo AWS bruto em `cloud_cost_imports` e `cloud_cost_line_items`, sem fatura, pagamento ou exposicao tenant-scoped.
- `cloud_cost_allocation` e uma capacidade transversal de plataforma: cruza `cloud_cost_line_items` com `cloud_usage_daily_aggregates`, cria runs em `cloud_cost_allocation_runs` e grava custo por tenant em `tenant_cloud_cost_allocations`, sem fatura, pagamento ou exposicao tenant-scoped.
- Custo sem metrica confiavel deve permanecer como `total_unallocated_cost`; o sistema nao deve distribuir arbitrariamente para simular precisao.
- `cloud_charge_markup_rules` e uma capacidade transversal de plataforma: consome `tenant_cloud_cost_allocations`, aplica regra comercial de markup/minimo/franquia/arredondamento e grava `tenant_cloud_charges`, sem fatura, pagamento ou emissao fiscal nesta branch.
- `platform_cloud_billing_ui` e a tela `/platform/cloud-billing` no Console da Plataforma. Ela consome uso, custos AWS, rateio, charges e regras via API Platform, com abas Visao geral, Uso, Custos AWS, Rateio, Cobranca, Regras e Runs. Permanece fora do tenant e nao expõe custo, preco ou margem para usuario comum.
- `backend_navigation_menu` e a fonte oficial de navegacao do ERP via `GET /api/v1/navigation/menu`. O registry fica versionado em codigo nesta primeira versao, filtra itens por usuario, boundary, RBAC e modulos habilitados, e retorna grupos `platform`, `tenant`, `operations`, `logistics` e `finance` com icones e status de tela. O menu nao substitui a autorizacao real dos endpoints.
- `frontend_navigation_menu_consumer` e o consumidor web do menu backend: service, adapter, hook e fallback local em `frontend/src/modules/navigation`, integrado ao `PlatformLayout`, `AppShell` e `Sidebar`.
- `field_operator_location` e a fundacao backend tenant-scoped para localizacao de operadores em campo. Ela cria `field_operator_locations`, aplica RBAC/RLS, recebe coordenadas via `/api/v1/mobile/field-locations` e expõe ultimas posicoes/historico para o Mapa Operacional, sem implementar Google Maps real, Flutter, roteirizacao ou despacho completo.
- `field_dispatch` e a fundacao backend tenant-scoped para despacho operacional. Ela cria `field_dispatches` e `field_dispatch_events`, vincula despacho a `work_order_id` e `operator_user_id`, aplica RBAC/RLS, valida OS e operador no mesmo tenant, registra eventos/auditoria best-effort e expoe endpoints `/api/v1/operations/dispatches`. UI completa de despacho, roteirizacao, algoritmo de rota, WebSocket e app Flutter permanecem fora desta branch.
- `field_operations` e o modulo habilitavel por tenant para mapa operacional, operadores em campo e despachos. Nesta branch ele sustenta a rota `/operations/map` no frontend e o item `operations.dispatches` como `backend-ready`, sem implementar a tela completa `/operations/dispatches`.
- `work_orders` e a capacidade tenant-scoped para Ordens de Servico. O backend cria `work_orders`, `work_order_events` e `work_order_assignments`, aplica RBAC/RLS e expoe CRUD/status/assign/timeline por API. O frontend implementa `/work-orders`, `/work-orders/new` e `/work-orders/:workOrderId` com filtros, KPIs, criacao, detalhe, timeline, status, atribuicao simples e fallback/mock seguro. A integracao com `/operations/map` exibe codigo/status da OS atribuida ao operador. `field_dispatch` agora prepara o despacho operacional inicial; despacho avancado, roteirizacao, pagamentos, comissoes e estoque permanecem futuros.
