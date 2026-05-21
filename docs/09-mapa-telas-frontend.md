# 09 - MAPA DE TELAS FRONTEND

## Visão Geral

Este documento consolida o mapa de telas Web e Mobile do ERP Techsolutions com base em `README.md`, módulos (`docs/02`), papéis (`docs/03`), regras de negócio (`docs/04`), requisitos funcionais (`docs/05`), backlog (`docs/07`), estrutura (`docs/08`) e diretrizes de design (`DESIGN_SYSTEM.md`).

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

### W05 — Gestão de Tenant, Planos e Módulos
- **Objetivo:** administrar dados do tenant, módulos ativos e feature flags.
- **Usuários:** Admin Tenant, Suporte interno (com autorização).
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

### W16 — Cadastros: Checklists dinâmicos
- **Objetivo:** definir checklists por tipo de serviço/risco/etapa.
- **Usuários:** Admin, Gestor, Supervisor.
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
- objetivo: garantir conformidade operacional em campo.
- usuários: executor/supervisor.
- offline: obrigatório com sincronização posterior.
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

- Conflito aberto mantido: memória histórica de backend em C vs estado oficial do repositório em Node.js + TypeScript.
- Para execução deste mapa de telas, foi adotado o estado oficial vigente no repositório (Node.js + TypeScript), sem ocultar a divergência documental pendente de validação final.
