# 09 - MAPA DE TELAS FRONTEND

## Visão Geral

Este documento consolida o mapa de telas Web e Mobile do ERP Techsolutions com base em [`README.md`](../README.md), módulos ([`docs/02-mapa-modulos.md`](./02-mapa-modulos.md)), papéis ([`docs/03-atores-papeis.md`](./03-atores-papeis.md)), regras de negócio ([`docs/04-regras-negocio.md`](./04-regras-negocio.md)), requisitos funcionais ([`docs/05-requisitos-funcionais.md`](./05-requisitos-funcionais.md)), backlog ([`docs/07-backlog.md`](./07-backlog.md)), estrutura ([`docs/08-estrutura.md`](./08-estrutura.md)) e diretrizes de design ([`DESIGN_SYSTEM.md`](../DESIGN_SYSTEM.md)).

Princípios adotados:
- plataforma SaaS multi-tenant com isolamento por `tenant_id` e escopo por filial/equipe;
- operação orientada por Ordem de Serviço (OS), timeline e evidências;
- UX técnica/industrial (workspace tipo SCADA, tabelas densas, cards operacionais, alertas claros);
- frontend React único para Web com responsividade, e fluxo Mobile orientado a execução de campo/offline;
- priorização explícita por fase: MVP, Scale e Enterprise.

## Arquitetura UX

### Diretriz estrutural
- **Layout-base Web**: sidebar persistente + header operacional + conteúdo modular.
- **Layout-base Mobile**: navegação simplificada por contexto (Agenda, OS, Evidências, Sync, Pendências).
- **Padrão DeviceDetail/Kryos**: detalhe técnico em bloco único por entidade (identificação, estado, timeline, ações, logs).
- **Sem redundância de tabs**: priorizar uma visão principal com seções dobráveis, drawer e modal contextual.

### Estados semânticos mínimos
- default, loading, empty, erro, sucesso, bloqueado, pendente aprovação, exceção, somente leitura, auditável.

## Estratégia Web

- foco administrativo + operacional + financeiro em densidade alta de informação;
- data grids com filtros avançados, ações em massa e exportação sob permissão;
- dashboards por papel (administrador, gestor, operador, financeiro, estoque, auditor);
- visibilidade explícita de tenant, filial, SLA, risco, bloqueios e pendências.

## Estratégia Mobile

- foco execução de campo, atualização de status, checklist, evidências, assinatura e sync;
- modo offline-first com fila local e resolução de conflitos;
- supervisão mobile com visão da equipe e pendências críticas;
- reflow adaptativo para telas pequenas sem perda de rastreabilidade.

## Navegação Global

### Web — macro navegação
1. Dashboard
2. Operação (OS, painel logístico, mapa, timeline)
3. Cadastros (clientes, fornecedores, profissionais, equipes, viaturas, contratos)
4. Estoque
5. Financeiro
6. Frota e logística
7. Relatórios e analytics
8. Integrações
9. Configurações (tenant, usuários, RBAC, planos/módulos)
10. Auditoria e suporte

### Mobile — macro navegação
1. Agenda / Minhas OS
2. Detalhe da OS
3. Checklist e evidências
4. Consumo de estoque
5. Sincronização e pendências
6. Notificações

### Console da Plataforma — macro navegação
1. Tenants
2. Detalhe do tenant
3. Módulos do tenant
4. Auditoria global
5. Health do sistema
6. Configurações globais

## Telas Console da Plataforma

> Estas telas usam escopo `platform`, layout separado do tenant e permissões `platform:*`. Não fazem parte da administração interna do tenant.

### P01 — Tenants
- **Objetivo:** listar tenants/clientes da plataforma, status, plano, módulos habilitados e resumo de uso.
- **Usuários:** Super Admin / dono do SaaS.
- **Permissões:** `platform:tenants:read`, `platform:tenants:create`, `platform:tenants:update`, `platform:tenants:suspend`.
- **Rota:** `/platform/tenants`.
- **Prioridade:** MVP da Console da Plataforma.

### P02 — Detalhe do Tenant
- **Objetivo:** consultar dados gerais do tenant, administrador principal, atividade recente e ações críticas.
- **Usuários:** Super Admin / dono do SaaS.
- **Permissões:** `platform:tenants:read`, `platform:tenants:update`, `platform:users:create_admin`.
- **Rota:** `/platform/tenants/:tenantId`.
- **Prioridade:** MVP da Console da Plataforma.

### P03 — Módulos do Tenant
- **Objetivo:** habilitar, bloquear e auditar módulos contratados por tenant e plano.
- **Usuários:** Super Admin / dono do SaaS.
- **Permissões:** `platform:tenants:read`, `platform:modules:manage`.
- **Rota:** `/platform/tenants/:tenantId/modules`.
- **Prioridade:** MVP da Console da Plataforma.

## Telas Web

> Padrão de descrição aplicado a cada tela: objetivo, papéis, permissões, dados/componentes/ações/estados, regras, integrações, UX (responsividade/mobile), offline, indicadores e artefatos (filtros/tabelas/cards/modais/alertas/timeline/logs), navegação e prioridade.

### W01 — Login e seleção de contexto
- **Objetivo:** autenticar usuário e definir contexto (tenant/filial quando aplicável).
- **Usuários:** todos os papéis Web.
- **Permissões:** acesso autenticado; validação de papel ativo.
- **Dados exibidos:** identidade do usuário, tenants/filiais disponíveis, avisos de segurança.
- **Componentes:** formulário, seletor de contexto, alerta de bloqueio, recuperação de acesso.
- **Ações:** entrar, trocar contexto, sair, recuperar senha.
- **Estados:** loading, credencial inválida, usuário inativo, tenant bloqueado.
- **Regras:** AUTH-001/002/003; auditoria de login.
- **Integrações:** provedor auth, logs de auditoria.
- **Responsividade/mobile:** layout colapsado em coluna única.
- **Offline/online:** apenas online.
- **KPIs/cards:** tentativas, bloqueios (somente suporte interno).
- **Filtros/tabelas/modais/logs:** modal de contexto; log de acesso.
- **Navegação:** entrada para dashboard por papel.
- **Prioridade:** MVP.

### W02 — Dashboard Operacional
- **Objetivo:** monitorar serviços por status, atrasos, SLA e gargalos.
- **Usuários:** Gestor Operacional, Operador Logístico, Supervisor, Admin.
- **Permissões:** visualizar painel logístico e OS.
- **Dados:** filas de OS, SLA, pendências, equipe/viatura, alertas.
- **Componentes:** cards KPI, grid de OS, mapa resumido, timeline de eventos recentes.
- **Ações:** abrir OS, redistribuir, filtrar, exportar.
- **Estados:** sem dados, atraso crítico, bloqueado por permissão.
- **Regras:** RN-OS de status/despacho/cancelamento; RF-REL-001.
- **Integrações:** mapas, notificações.
- **Responsividade/mobile:** cards reflow + tabela vira lista técnica.
- **Offline:** não.
- **KPIs:** OS abertas, SLA vencido, tempo médio despacho, retrabalho.
- **Filtros:** período, filial, equipe, status, prioridade, cliente.
- **Tabela/cards/modais:** grid denso, modal de ação rápida, alertas acionáveis.
- **Timeline/logs:** feed operacional.
- **Navegação:** OS listagem/detalhe.
- **Prioridade:** MVP.

### W03 — Dashboard Financeiro
- **Objetivo:** acompanhar caixa, contas, faturamento, margem e inconsistências.
- **Usuários:** Financeiro, Gestor Executivo, Admin.
- **Permissões:** FIN + relatórios.
- **Prioridade:** MVP (base) / Scale (margem e incongruências).

### W04 — Dashboard Executivo/Analytics
- **Objetivo:** visão consolidada multi-filial (receita, custo, produtividade, risco).
- **Usuários:** Gestor Executivo, Admin.
- **Permissões:** leitura consolidada + exportação.
- **Prioridade:** MVP (mínimo) / Enterprise (BI expandido).

### W05 — Administrador
- **Objetivo:** administrar dados do tenant, módulos ativos e feature flags.
- **Usuários:** Administrador, Suporte interno (com autorização).
- **Permissões:** administração do core SaaS.
- **Prioridade:** MVP.

### W06 — Gestão de Filiais
- **Objetivo:** cadastro e escopo operacional por filial.
- **Usuários:** Admin, Gestor.
- **Permissões:** cadastro mestre + escopo.
- **Prioridade:** MVP.

### W07 — Gestão de Usuários
- **Objetivo:** criar, ativar/desativar, vincular usuário a papéis/equipes/filiais.
- **Usuários:** Admin.
- **Permissões:** usuários/permissões C/E/X.
- **Prioridade:** MVP.

### W08 — Gestão de Papéis e Permissões (RBAC)
- **Objetivo:** configurar permissões por recurso/ação e escopo.
- **Usuários:** Admin, Auditor (consulta).
- **Permissões:** RBAC administração.
- **Prioridade:** MVP.

### W09 — Auditoria e Logs
- **Objetivo:** rastreabilidade de ações críticas, exportações e integrações.
- **Usuários:** Auditor, Admin, Suporte autorizado.
- **Permissões:** leitura auditável/export controlado.
- **Prioridade:** MVP.

### W10 — Cadastros: Clientes
- **Objetivo:** manter base de clientes para OS, orçamento e faturamento.
- **Usuários:** Operador, Gestor, Financeiro.
- **Permissões:** cadastro mestre conforme papel.
- **Prioridade:** MVP.

### W11 — Cadastros: Fornecedores
- **Objetivo:** base para compras/suprimentos e custos.
- **Usuários:** Compras, Estoque, Financeiro, Admin.
- **Prioridade:** MVP.

### W12 — Cadastros: Profissionais e Equipes
- **Objetivo:** composição de execução e escala operacional.
- **Usuários:** Gestor, Admin, Operador.
- **Prioridade:** MVP.

### W13 — Cadastros: Viaturas/Frota básica
- **Objetivo:** disponibilidade para despacho e controle operacional.
- **Usuários:** Gestor, Operador, Frota.
- **Prioridade:** MVP (cadastro), Scale (custos/km/manutenção).

### W14 — Cadastros: Contratos
- **Objetivo:** base de faturamento por cliente e regras comerciais.
- **Usuários:** Financeiro, Gestor, Admin.
- **Prioridade:** Scale.

### W15 — Cadastros: Tabelas de preço e tarifas
- **Objetivo:** motor de preços versionado e simulação.
- **Usuários:** Admin, Financeiro.
- **Prioridade:** Scale.

### W16 — Cadastros: Checklists configuraveis
- **Objetivo:** criar, editar, publicar, desativar e versionar modelos de checklist por tenant usando componentes permitidos pela plataforma.
- **Usuários:** Admin, Gestor, Supervisor.
- **Permissões:** `checklists.template.create`, `checklists.template.read`, `checklists.template.update`, `checklists.template.delete`, `checklists.template.publish`.
- **Dados:** nome, descricao, modulo relacionado, status, versao, campos, ordem, obrigatoriedade, configuracao, regras de validacao e visibilidade.
- **Componentes:** lista de templates, builder/editor, paleta de componentes, painel de configuracao de campo, preview de execucao.
- **Ações:** criar template, adicionar campo, reordenar, salvar rascunho, publicar versao, arquivar/inativar.
- **Estados:** draft, published, archived, inactive, blocked por permissao, erro de validacao, auditoria visivel.
- **Regras:** componentes sao definidos pela plataforma; tenant apenas configura templates/campos; toda acao valida `tenant_id`; publicacao preserva versao.
- **Integrações:** RBAC, auditoria, OS, estoque, compras, vendas, manutencao e mobile sync futuro.
- **Responsividade/mobile:** builder Web primeiro; execucao mobile prevista em M05/M06.
- **Offline:** nao para configuracao; execucao offline futura no mobile.
- **Prioridade:** Scale.

### W17 — Ordem de Serviço: Listagem e busca global
- **Objetivo:** consulta massiva de OS com filtros avançados.
- **Usuários:** Operador, Gestor, Financeiro, Auditor.
- **Permissões:** OS visualizar/editar por escopo.
- **Dados:** código, cliente, status, SLA, equipe, viatura, custo/valor.
- **Componentes:** tabela densa, filtros salvos, cards de fila.
- **Ações:** criar OS, despachar, cancelar (com motivo), exportar.
- **Estados:** vazia, atraso, bloqueio por permissão.
- **Regras:** RF-OS-002, F07 backlog, AUTH-004.
- **Integrações:** mapa, notificações, auditoria.
- **Responsividade:** lista por cartões técnicos no breakpoint móvel.
- **Offline:** não.
- **KPIs:** volume, tempo de fila, OS críticas.
- **Timeline/logs:** acesso ao detalhe da timeline.
- **Prioridade:** MVP.

### W18 — Ordem de Serviço: Criação/Edição
- **Objetivo:** abertura rápida de OS com validações obrigatórias.
- **Usuários:** Operador, Gestor.
- **Permissões:** OS criar/editar.
- **Prioridade:** MVP.

### W19 — Ordem de Serviço: Detalhe (padrão DeviceDetail)
- **Objetivo:** centralizar contexto completo da OS em visão única.
- **Usuários:** Operação, Financeiro, Estoque, Auditor, Supervisor.
- **Permissões:** leitura/ações por papel.
- **Dados:** dados-base, status, timeline, evidências, checklist, orçamento, consumo, logs.
- **Componentes:** header técnico, cards de estado, timeline, painéis colapsáveis, modais de ação.
- **Ações:** status, anexos, comentário, despacho, cancelamento, reabertura.
- **Estados:** pendente aprovação, bloqueada, em execução, finalizada, cancelada, exceção.
- **Regras:** RN-OS + AUTH-005/006.
- **Integrações:** mapas, estoque, financeiro, mobile sync.
- **Responsividade/mobile:** reflow com seções verticais.
- **Offline:** leitura parcial em cache (opcional futuro).
- **KPIs:** lead time, custo estimado, retrabalho.
- **Prioridade:** MVP.

### W20 — Painel Logístico e Mapa
- **Objetivo:** despacho e acompanhamento em tempo real.
- **Usuários:** Gestor, Operador, Supervisor.
- **Prioridade:** MVP (básico) / Scale (assistido).

### W21 — Estoque: Itens e saldos por filial
- **Objetivo:** cadastro e saldos por almoxarifado.
- **Usuários:** Estoquista, Compras, Gestor.
- **Prioridade:** MVP.

### W22 — Estoque: Movimentações e consumo por OS
- **Objetivo:** rastrear entradas/saídas/ajustes e vínculo com OS.
- **Usuários:** Estoque, Operação, Financeiro (consulta custo).
- **Prioridade:** MVP.

### W23 — Estoque por viatura e reposição
- **Objetivo:** saldo embarcado e reposição automática.
- **Usuários:** Estoquista, Supervisor.
- **Prioridade:** Scale.

### W24 — Financeiro: Orçamento por OS
- **Objetivo:** gerar/aprovar orçamento antes do faturamento.
- **Usuários:** Operador, Financeiro, Gestor.
- **Prioridade:** MVP.

### W25 — Financeiro: Caixa, contas e extrato
- **Objetivo:** gestão de fluxo financeiro operacional.
- **Usuários:** Financeiro.
- **Prioridade:** MVP.

### W26 — Financeiro: Faturamento e fechamento
- **Objetivo:** faturar serviços e executar fechamento com pendências.
- **Usuários:** Financeiro, Gestor.
- **Prioridade:** MVP/Scale.

### W27 — Financeiro: Títulos incongruentes e margem por OS
- **Objetivo:** detectar divergências e apoiar decisão.
- **Usuários:** Financeiro, Gestor Executivo.
- **Prioridade:** Scale.

### W28 — Frota: abastecimento/manutenção/danos/multas/seguros
- **Objetivo:** custo e risco da frota.
- **Usuários:** Gestor Frota, Financeiro, Supervisor.
- **Prioridade:** Scale.

### W29 — Relatórios exportáveis
- **Objetivo:** emissão de relatórios operacionais e financeiros.
- **Usuários:** Gestor, Financeiro, Auditor, Admin.
- **Prioridade:** MVP.

### W30 — Hub de Integrações e logs
- **Objetivo:** configurar integrações, webhooks e monitorar falhas.
- **Usuários:** Admin, Suporte interno.
- **Prioridade:** Scale.

### W31 — Suporte interno e monitoramento de tenants
- **Objetivo:** suporte assistido com autorização explícita e trilha.
- **Usuários:** Suporte interno Techsolutions.
- **Prioridade:** Scale.

## Telas Mobile

### M01 — Login e contexto
- objetivo: autenticar executor/supervisor e baixar escopo autorizado.
- usuários: Executor Campo, Supervisor.
- permissões: escopo mobile (AUTH-007).
- offline: último contexto válido em cache, sem troca de tenant offline.
- prioridade: MVP.

### M02 — Agenda / Minhas OS
- objetivo: listar serviços atribuídos com prioridade e SLA.
- ações: iniciar deslocamento, abrir detalhe, filtrar por hoje/atrasadas.
- componentes: cards técnicos, chips de status, badge de sync.
- prioridade: MVP.

### M03 — Detalhe da OS (mobile)
- objetivo: execução em campo com contexto mínimo completo.
- dados: cliente/local, instruções, checklist, evidências, itens, timeline resumida.
- ações: atualizar status, registrar observação, abrir mapa, ligar contato.
- offline: edição local com fila de sync.
- prioridade: MVP.

### M04 — Atualização de status
- objetivo: transicionar OS conforme fluxo permitido.
- estados: iniciado, em deslocamento, no local, em execução, concluído, exceção.
- regras: validações por etapa e bloqueio por pré-condição.
- prioridade: MVP.

### M05 — Checklist de execução
- objetivo: garantir conformidade operacional em campo executando checklist publicado e versionado.
- usuários: executor/supervisor.
- permissões: `checklists.run.create`, `checklists.run.read`, `checklists.run.answer`, `checklists.run.complete`, `checklists.run.cancel`.
- dados: template publicado, versao usada, campos obrigatorios, respostas, evidencias, entidade relacionada e estado de sync.
- componentes: renderer de campos, captura de foto/arquivo, assinatura, QR Code, codigo de barras, localizacao, validacao de obrigatorios.
- regras: execucao pertence ao `tenant_id`; alteracao posterior do template nao altera execucao antiga; conclusao bloqueia obrigatorios pendentes.
- offline: obrigatorio com fila local e sincronização posterior.
- prioridade: MVP (básico) / Scale (dinâmico).

### M06 — Evidências: fotos, anexos e observações
- objetivo: comprovação da execução.
- componentes: câmera, galeria, comentários, metadados de hora/local.
- prioridade: MVP.

### M07 — Assinatura digital
- objetivo: confirmação do atendimento quando exigida.
- regras: vinculada a tipo de serviço/cliente.
- prioridade: Scale.

### M08 — Consumo de estoque em campo
- objetivo: registrar itens usados na OS/viatura.
- prioridade: MVP (consumo básico) / Scale (estoque viatura completo).

### M09 — Geolocalização e rota
- objetivo: apoiar deslocamento e registro operacional.
- prioridade: Scale.

### M10 — Sincronização offline e conflitos
- objetivo: visualizar fila local, status de envio e conflitos.
- ações: sincronizar agora, reenviar, abrir conflito.
- prioridade: MVP.

### M11 — Pendências e exceções
- objetivo: exibir bloqueios que impedem finalização/sync.
- prioridade: MVP.

### M12 — Notificações operacionais
- objetivo: alertar novas OS, reatribuições, SLA crítico.
- prioridade: Scale.

### M13 — Visão Supervisor Mobile
- objetivo: acompanhar equipe, pendências e evidências críticas.
- prioridade: Scale.

## Matriz Tela x Papel

| Tela | Admin | Gestor Exec | Gestor Op | Operador | Supervisor | Executor | Estoque | Financeiro | Auditor | Suporte |
|---|---|---|---|---|---|---|---|---|---|---|
| W02 Dashboard Operacional | V | V | V/E | V/E | V | - | V | V | V | V |
| W03 Dashboard Financeiro | V | V | V | - | - | - | V | V/E | V | V |
| W05 Tenant/Módulos | C/E | - | - | - | - | - | - | - | V | C/E |
| W07 Usuários | C/E | - | - | - | - | - | - | - | V | V |
| W08 RBAC | C/E | - | - | - | - | - | - | - | V | V |
| W17/W19 OS | V/E | V | V/E/A | V/C/E | V/E | - | V | V | V | V |
| W21/W22 Estoque | V | V | V | V parcial | V parcial | baixa | V/C/E | V custo | V | - |
| W24-W27 Financeiro | V | V | V | orçamento parcial | - | - | V custo | V/C/E/A | V | - |
| M02-M06 Execução mobile | - | - | V | - | V | V/E | V parcial | - | V | - |
| W09 Auditoria | V | V | V | V parcial | V parcial | V próprio | V parcial | V | V/R | V |

## Matriz Tela x Prioridade

| Prioridade | Telas |
|---|---|
| MVP | W01, W02, W05, W06, W07, W08, W09, W10, W11, W12, W13, W17, W18, W19, W20 (básico), W21, W22, W24, W25, W26 (inicial), W29, M01, M02, M03, M04, M05 (básico), M06, M08 (básico), M10, M11 |
| Scale | W03 (expandido), W14, W15, W16, W23, W26 (avançado), W27, W28, W30, W31, M05 (dinâmico), M07, M09, M12, M13 |
| Enterprise | W04 (BI/governança ampliada), extensões IA/despacho inteligente em W20 e analytics avançado |

## Fluxos Críticos

1. **Ciclo operacional ponta a ponta**: W17 → W18 → W19 → M03/M04/M05/M06 → W26.
2. **Ciclo de estoque por OS**: W21/W22 → M08 → W27.
3. **Ciclo de governança**: W05/W07/W08 → W09.
4. **Ciclo de integração**: eventos OS/financeiro/estoque → W30.
5. **Ciclo de exceção**: alerta (W02/M11) → tratamento (W19/W26) → log (W09).

## Dependências Técnicas

- React web com design tokens do `DESIGN_SYSTEM.md`.
- Flutter mobile com semântica visual equivalente.
- Backend Node.js + TypeScript com API versionada e filtros por `tenant_id`.
- PostgreSQL (transacional), Redis (cache/sync coordenação), mensageria assíncrona.
- Observabilidade com logs estruturados, métricas e trilhas auditáveis.

## Observações de UX

- Priorizar legibilidade operacional sobre estética decorativa.
- Manter cabeçalho técnico com tenant/filial/contexto sempre visível.
- Evitar múltiplas tabs paralelas para mesma informação.
- Usar modais somente para ações críticas e confirmação.
- Destacar claramente estados: bloqueado, pendente aprovação, exceção e escalado.

## Roadmap de Implementação

### Fase 1 — MVP competitivo
- Entregar núcleo Web (OS, cadastros, tenant, RBAC, auditoria, estoque básico, financeiro básico).
- Entregar núcleo Mobile offline-first (agenda, detalhe OS, status, checklist básico, evidências, sync).

### Fase 2 — Scale
- Expandir financeiro (incongruências, margem), estoque por viatura, frota avançada, integrações e suporte interno.
- Adicionar checklists dinâmicos, assinatura, geolocalização refinada e notificações.

### Fase 3 — Enterprise
- Expandir analytics/BI, governança avançada (SSO/isolamento premium) e automação inteligente.

## Registro de alinhamento e conflito arquitetural

- Histórico preservado: havia divergência entre memória histórica (backend em C) e estado oficial do repositório (Node.js + TypeScript).
- Leitura vigente deste documento: backend oficial do ERP Techsolutions neste repositório é Node.js + TypeScript para execução Web/Mobile/API.
- A referência histórica em C permanece somente para rastreabilidade e não representa stack atual.

## Pacote Figma MVP (Estrutura de Páginas e Handoff)

> **Objetivo desta seção:** detalhar a organização operacional no Figma para execução imediata de UX/UI e handoff React/Flutter, sem alterar estratégia de produto.

### Páginas Figma (nomenclatura proposta)

1. `00_COVER_README`
2. `01_FOUNDATIONS_TOKENS`
3. `02_COMPONENTS_WEB_MOBILE`
4. `03_NAVIGATION_MAP_WEB`
5. `04_NAVIGATION_MAP_MOBILE`
6. `05_FLOWS_CRITICAL_MVP`
7. `10_WEB_MVP_SCREENS`
8. `20_MOBILE_MVP_SCREENS`
9. `90_APPENDIX_RBAC_STATES_AUDIT`

### Estrutura de tokens (01_FOUNDATIONS_TOKENS)
- **Cor:** `color/core/*`, `color/neutral/*`, `color/status/*`.
- **Tipografia:** `type/title/*`, `type/body/*`, `type/label/*`, `type/mono/*`.
- **Espaçamento:** `space/2,4,8,12,16,24,32`.
- **Semântica crítica:** `status/pending-approval`, `status/blocked`, `status/exception`, `status/audit-visible`.
- **Elevação/contorno:** `elevation/surface/*`, `border/subtle|strong|critical`.

### Biblioteca base de componentes (02_COMPONENTS_WEB_MOBILE)
- `button`, `icon-button`, `input`, `select`, `date-picker`
- `table-data-grid`, `filter-bar`, `kpi-card`, `status-chip`
- `drawer`, `modal`, `timeline-row`, `approval-panel`, `audit-row`
- `tenant-switcher`, `evidence-attachment-block`, `blocked-state-banner`

## Especificação de Telas MVP para Figma

### Telas Web prioritárias (MVP)

#### W01 — Login e seleção de contexto
- **Papel principal:** todos os usuários Web.
- **Permissões:** autenticação válida + papel ativo.
- **Dados exibidos:** usuário, tenants disponíveis, filiais por tenant.
- **Ações primárias:** entrar, selecionar tenant/filial, recuperar acesso.
- **Estados:** default/loading/empty(error sem tenant)/error/blocked/read-only/audit-visible.
- **Alertas e bloqueios:** conta inativa, tenant suspenso, contexto inválido.
- **Integrações:** auth, auditoria de acesso.
- **Responsividade:** painel central único em breakpoints menores.

#### W02 — Dashboard Operacional
- **Papel principal:** Gestor Operacional.
- **Permissões:** leitura/escrita operacional por escopo filial/equipe.
- **Dados exibidos:** KPIs OS, SLA, fila crítica, eventos recentes, mapa resumido.
- **Ações primárias:** abrir OS crítica, redistribuir, aplicar filtros, exportar.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas e bloqueios:** SLA vencido, OS sem equipe, OS bloqueada por aprovação.
- **Integrações:** mapa, notificações, feed de eventos.
- **Responsividade:** KPI em cards reflow; tabela vira lista densa.

#### W05 — Gestão de Tenant, Planos e Módulos
- **Papel principal:** Administrador.
- **Permissões:** gestão core SaaS e feature flags.
- **Dados exibidos:** dados do tenant, módulos ativos, plano, limites.
- **Ações primárias:** ativar/desativar módulo, editar parâmetros, salvar versão.
- **Estados:** default/loading/empty/error/blocked/pending approval/read-only/audit-visible.
- **Alertas e bloqueios:** limite de plano, ação crítica com aprovação.
- **Integrações:** billing/plano, logs de auditoria.
- **Responsividade:** tabela de módulos com colapso por accordion.

#### W07/W08 — Usuários
- **Papel principal:** Administrador.
- **Permissões:** C/E/X em usuários e papéis.
- **Dados exibidos:** usuários, status, vínculos, matriz de permissões por recurso.
- **Ações primárias:** criar usuário, associar papel, restringir por filial/equipe.
- **Estados:** default/loading/empty/error/blocked/pending approval/read-only/audit-visible.
- **Alertas e bloqueios:** conflito de permissão, papel sem escopo, ação fora de limite.
- **Integrações:** auth/identidade, trilha de alteração.
- **Responsividade:** edição em drawer para preservar contexto.

#### W09 — Auditoria e Logs
- **Papel principal:** Auditor.
- **Permissões:** leitura auditável e exportação controlada.
- **Dados exibidos:** ação, ator, timestamp, recurso, antes/depois, motivo.
- **Ações primárias:** filtrar, comparar versões, exportar trilha.
- **Estados:** default/loading/empty/error/blocked/read-only/audit-visible.
- **Alertas e bloqueios:** dado sensível mascarado sem permissão.
- **Integrações:** log de domínio, integração, autenticação.
- **Responsividade:** grid técnico com colunas fixas prioritárias.

#### W17/W18/W19 — OS (Lista, Criação, Detalhe)
- **Papel principal:** Operador Logístico.
- **Permissões:** C/E OS por escopo + aprovações por papel.
- **Dados exibidos:** identificação OS, cliente, SLA, equipe, viatura, timeline, evidências.
- **Ações primárias:** criar, editar, despachar, atualizar status, cancelar com motivo.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas e bloqueios:** SLA crítico, checklist pendente, evidência obrigatória ausente.
- **Integrações:** mapa, estoque, financeiro, mobile sync.
- **Responsividade:** DeviceDetail em seções verticais + drawers de ação.

#### W21/W22 — Estoque (Itens, Saldos, Movimentações, Consumo OS)
- **Papel principal:** Estoquista.
- **Permissões:** C/E movimentações e itens por filial.
- **Dados exibidos:** item, saldo, custo médio, mínimo, movimentos, vínculo OS.
- **Ações primárias:** entrada/saída/ajuste/transferência e baixa por OS.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas e bloqueios:** saldo insuficiente, item inativo, divergência de custo.
- **Integrações:** OS, compras/suprimentos, financeiro (custo).
- **Responsividade:** linhas técnicas com expansão inline.

#### W24/W25/W26 — Financeiro (Orçamento, Caixa/Contas, Faturamento/Fechamento)
- **Papel principal:** Financeiro.
- **Permissões:** C/E/A conforme limites e approvals.
- **Dados exibidos:** orçamento por OS, contas, extrato, lote de faturamento, pendências fechamento.
- **Ações primárias:** aprovar orçamento, registrar movimento, faturar, fechar período.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas e bloqueios:** OS sem evidência para faturar, divergência de valor, fechamento travado.
- **Integrações:** OS, contratos/tabelas, auditoria.
- **Responsividade:** visão principal por período + drawer de conciliação.

#### W29 — Relatórios exportáveis
- **Papel principal:** Gestor/Financeiro/Auditor.
- **Permissões:** exportar sob política RBAC.
- **Dados exibidos:** catálogo de relatórios, parâmetros, histórico de exportação.
- **Ações primárias:** configurar filtro, gerar, exportar, agendar (fase posterior).
- **Estados:** default/loading/empty/error/blocked/read-only/audit-visible.
- **Alertas e bloqueios:** exportação negada por papel/escopo.
- **Integrações:** módulo analytics, auditoria de export.
- **Responsividade:** filtros em drawer para preservar grade.

### Telas Mobile prioritárias (MVP)

#### M01 — Login e contexto
- **Papel principal:** Executor de Campo.
- **Permissões:** acesso mobile por usuário/equipe.
- **Dados exibidos:** usuário, tenant, filial, equipe ativa.
- **Ações primárias:** autenticar, confirmar contexto, entrar offline com sessão válida.
- **Estados:** default/loading/error/blocked/read-only/audit-visible.
- **Alertas/bloqueios:** sessão expirada, tenant suspenso.
- **Integrações:** auth + sync inicial.
- **Offline:** somente com sessão/contexto previamente sincronizados.

#### M02/M03/M04 — Agenda, Detalhe OS e Atualização de Status
- **Papel principal:** Executor de Campo.
- **Permissões:** leitura/escrita em OS atribuída.
- **Dados exibidos:** agenda, SLA, instruções, status atual, timeline curta.
- **Ações primárias:** iniciar deslocamento, chegar local, executar, concluir, reportar exceção.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas/bloqueios:** pré-condição não cumprida para mudança de status.
- **Integrações:** mapa, notificações, sync.
- **Offline:** fila local de eventos com reconciliação.

#### M05/M06 — Checklist e Evidências
- **Papel principal:** Executor/Supervisor.
- **Permissões:** preenchimento e anexo conforme tipo OS.
- **Dados exibidos:** itens checklist, evidências obrigatórias, histórico anexos.
- **Ações primárias:** marcar item, anexar foto/arquivo, comentar.
- **Estados:** default/loading/empty/error/blocked/pending approval/exception/read-only/audit-visible.
- **Alertas/bloqueios:** não permite concluir OS sem obrigatórios.
- **Integrações:** câmera/galeria, storage, auditoria.
- **Offline:** captura local com envio posterior.

#### M08 — Consumo de estoque em campo
- **Papel principal:** Executor de Campo.
- **Permissões:** baixa permitida por OS/viatura.
- **Dados exibidos:** item, quantidade disponível, consumo já lançado.
- **Ações primárias:** adicionar item, ajustar quantidade, confirmar baixa.
- **Estados:** default/loading/empty/error/blocked/exception/read-only/audit-visible.
- **Alertas/bloqueios:** saldo insuficiente, item não autorizado.
- **Integrações:** estoque central + OS.
- **Offline:** registro local com validação final na sincronização.

#### M10/M11 — Sincronização e Pendências/Exceções
- **Papel principal:** Executor/Supervisor.
- **Permissões:** leitura da fila + resolução de conflito permitido.
- **Dados exibidos:** itens pendentes, falhas, conflitos, bloqueios de envio.
- **Ações primárias:** sincronizar agora, reenviar item, abrir detalhe de conflito.
- **Estados:** default/loading/empty/error/blocked/exception/read-only/audit-visible.
- **Alertas/bloqueios:** conflito de versão, erro de permissão, dependência faltante.
- **Integrações:** motor de sync, API OS/estoque/evidência.
- **Offline:** tela funcional para gestão de fila local.

## Fluxos Críticos no Protótipo Navegável (05_FLOWS_CRITICAL_MVP)

1. **F01 Auth e contexto:** W01 → seleção tenant/filial → W02.
2. **F02 Ciclo OS Web:** W18 criar → W17 listar/filtrar → W19 detalhe → despacho/acompanhar.
3. **F03 Execução Mobile:** M02 → M03 → M04 → M05 → M06 → M10.
4. **F04 Estoque por OS:** W22 e/ou M08 vinculando consumo à OS.
5. **F05 Governança de exceção:** bloqueio/aprovação na W19/W26 com registro em W09.
6. **F06 Trilha de auditoria:** ação crítica em usuário/permissão/financeiro com verificação em W09.
7. **F07 Financeiro operacional:** W24 orçamento → W26 faturamento → fechamento inicial.
8. **F08 Plataforma:** P01 tenants → P02 detalhe → P03 módulos do tenant.

## Registro de mudança desta versão do documento

- **O que mudou:** inclusão de seção específica para pacote Figma MVP (estrutura de páginas, tokens, componentes, detalhamento de telas prioritárias e fluxos prototipáveis).
- **Por que mudou:** versão anterior não detalhava com profundidade suficiente os entregáveis de Figma e o nível de especificação esperado por tela.
- **Leitura vigente:** este documento passa a ser base de design operacional para montagem de arquivo Figma e handoff.
- **Histórico preservado:** as seções anteriores (mapa geral de telas e matrizes) foram mantidas para rastreabilidade.
