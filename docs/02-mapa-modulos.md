# 02 — Mapa de Módulos: ERP Techsolutions

## 1. Visão geral

O ERP Techsolutions deve ser organizado como um **core SaaS multi-tenant** com módulos ativáveis por plano. A estrutura precisa permitir começar com um MVP competitivo e evoluir para uma plataforma enterprise sem reescrita.

A separação modular não deve refletir apenas menus. Cada módulo representa um domínio de negócio, com entidades, regras, permissões, eventos e indicadores próprios.

## 2. Mapa macro

```txt
ERP Techsolutions
├── Core SaaS
│   ├── Tenants / empresas
│   ├── Filiais
│   ├── Usuários
│   ├── Papéis e permissões
│   ├── Planos e módulos
│   ├── Auditoria
│   └── Configurações globais
├── Cadastros Mestres
│   ├── Clientes
│   ├── Fornecedores
│   ├── Profissionais
│   ├── Equipes
│   ├── Viaturas
│   ├── Locais / pontos de interesse
│   └── Tags
├── Operação e Serviços
│   ├── Ordem de serviço
│   ├── Status e eventos
│   ├── Painel logístico
│   ├── Mapa e rastreio
│   ├── Orçamento operacional
│   ├── Evidências
│   ├── Comentários
│   └── Impressão/exportação
├── Mobile de Campo
│   ├── Agenda de serviços
│   ├── Execução offline
│   ├── Status
│   ├── Checklist
│   ├── Fotos e anexos
│   ├── Assinatura
│   ├── Localização
│   └── Sincronização
├── Estoque e Suprimentos
│   ├── Itens
│   ├── Almoxarifados
│   ├── Estoque por filial
│   ├── Estoque por viatura
│   ├── Consumo por OS
│   ├── Movimentações
│   ├── Reposição
│   └── Fornecedores
├── Frota e Ativos
│   ├── Viaturas
│   ├── Abastecimento
│   ├── Manutenção
│   ├── Danos
│   ├── Multas
│   ├── Seguros
│   ├── Quilometragem
│   └── Custos por km
├── Financeiro Operacional
│   ├── Orçamentos
│   ├── Contas
│   ├── Caixa
│   ├── Cheques e meios de pagamento
│   ├── Extrato
│   ├── Faturamento
│   ├── Fechamento
│   ├── Títulos incongruentes
│   └── Margem por serviço
├── Relatórios e Analytics
│   ├── Dashboard executivo
│   ├── Dashboard operacional
│   ├── Dashboard financeiro
│   ├── KPIs de frota
│   ├── KPIs de estoque
│   ├── Relatórios exportáveis
│   └── Alertas acionáveis
├── Integrações
│   ├── Mapas
│   ├── Notificações
│   ├── Webhooks
│   ├── APIs externas
│   ├── Financeiro externo
│   ├── Comunicação
│   └── Logs de integração
└── Automação e IA
    ├── Despacho assistido
    ├── Detecção de inconsistências
    ├── Alertas inteligentes
    ├── Manutenção preventiva
    ├── Previsão de demanda
    └── Recomendação operacional
```

## 3. Módulos por fase

### 3.1 MVP competitivo

| Módulo | Justificativa |
|---|---|
| Core SaaS | Necessário para operar como produto multi-tenant. |
| Usuários, papéis e permissões | Segurança e segmentação operacional. |
| Cadastros mestres | Base para operação real. |
| Ordem de Serviço | Núcleo operacional do produto. |
| Painel logístico básico | Controle de serviços, status e equipe. |
| Mobile básico | Execução de campo com status, evidências e checklist. |
| Estoque básico | Controle mínimo de itens e consumo por OS. |
| Financeiro básico | Caixa, contas, orçamento, faturamento e fechamento inicial. |
| Dashboard operacional | Visibilidade mínima para gestão. |
| Auditoria | Rastreabilidade desde o início. |

### 3.2 Scale

| Módulo | Evolução |
|---|---|
| Motor de preço e tarifas | Tabelas versionadas, simulação e aprovação. |
| tenant_checklist | Modelos versionados por tenant, campos configuráveis a partir de componentes permitidos pela plataforma e execução Web/Mobile. |
| field_operations | Fundação para Mapa Operacional, operadores em campo, localizacao e despachos futuros. |
| Estoque por viatura | Controle móvel e reposição automática. |
| Frota avançada | Abastecimento, manutenção, danos, multas e seguros. |
| Pré-faturamento | Validação antes do fechamento. |
| Inconsistências | Detecção e correção assistida. |
| Notificações automáticas | SLA, vencimentos, pendências e alertas. |
| Integrações | Mapas, comunicação, financeiro e APIs externas. |

### 3.3 Enterprise

| Módulo | Evolução |
|---|---|
| Despacho inteligente | Recomendação por distância, SLA, custo e habilidade. |
| BI/Data warehouse | Análises históricas e executivas. |
| SSO/federação | Clientes maiores e governança corporativa. |
| Multi-tenant premium | Isolamento avançado por schema ou banco. |
| ESG/carbono | Km evitado, emissão estimada e eficiência ambiental. |
| IA operacional | Previsão de demanda, risco, retrabalho e manutenção. |
| Telemetria | Integração com rastreadores e sensores. |

## 4. Detalhamento dos módulos

### 4.1 Core SaaS

**Objetivo:** sustentar a plataforma como produto vendável, multi-tenant e governável.

**Submódulos:**

- tenant/empresa;
- filiais;
- usuários;
- papéis e permissões;
- planos e módulos;
- feature flags;
- auditoria;
- configurações globais;
- sessão e segurança.

**Diferencial:** permitir que cada cliente configure sua operação sem afetar outros tenants.

### 4.2 Cadastros Mestres

**Objetivo:** centralizar os dados estruturantes da operação.

**Entidades principais:**

- cliente;
- fornecedor;
- profissional;
- equipe;
- filial;
- viatura;
- ponto de interesse;
- tag;
- tabela de valor;
- tarifa;
- checklist configuravel por tenant.

**Diferencial:** deduplicação, validações, histórico e assistentes de implantação.

### 4.2.1 tenant_checklist

**Objetivo:** permitir que cada tenant configure modelos de checklist para processos operacionais, administrativos ou comerciais sem criar novos tipos de componente em codigo.

**Entidades principais:**

- `checklist_templates`;
- `checklist_template_fields`;
- `checklist_runs`;
- `checklist_run_answers`.

**Regras principais:**

- todo registro principal deve possuir `tenant_id`;
- consultas e comandos devem validar `tenant_id` junto com `id`;
- a plataforma define o catalogo de componentes permitidos;
- o tenant configura nome, descricao, modulo relacionado, campos, ordem, obrigatoriedade, regras e status;
- publicacao gera versao imutavel para execucoes futuras;
- execucoes antigas preservam `template_version`;
- acoes criticas geram auditoria;
- preenchimento mobile/offline deve ser suportado em fase futura.

**Componentes iniciais previstos:** `text`, `textarea`, `number`, `currency`, `date`, `datetime`, `select`, `multi_select`, `checkbox`, `radio`, `boolean`, `photo`, `file`, `signature`, `barcode`, `qr_code`, `location` e `rating`.

### 4.2.2 field_operations

**Objetivo:** preparar a operacao em campo para mapa operacional, operadores em campo e despacho futuro.

**Fundacao backend atual:**

- tabela `field_operator_locations`;
- RLS por `tenant_id`;
- envio mobile em `POST /api/v1/mobile/field-locations`;
- consulta web futura em `GET /api/v1/field-locations/latest` e `GET /api/v1/field-locations/history`;
- RBAC `field_location:send`, `field_location:read` e `field_location:history`.

**Fora do escopo desta rodada:** Google Maps, app Flutter, roteirizacao avancada e despacho completo. A integracao visual posterior com `work_orders` usa endpoints existentes e RBAC separado.

### 4.3 Operação e Serviços

**Objetivo:** gerenciar a vida completa da ordem de serviço.

**Capacidades:**

- criar OS;
- consultar OS;
- visualizar detalhes;
- atualizar status;
- duplicar/copiar;
- cancelar com motivo;
- imprimir/exportar;
- anexar arquivos;
- comentar;
- registrar logs;
- vincular orçamento;
- vincular estoque;
- vincular financeiro;
- acompanhar no mapa.

**Diferencial:** timeline operacional unificada.

### 4.4 Mobile de Campo

**Objetivo:** permitir execução real dos serviços fora do escritório.

**Capacidades:**

- login seguro;
- lista de serviços atribuídos;
- detalhes da OS;
- atualizar status;
- checklist;
- fotos;
- assinatura;
- observações;
- localização;
- sincronização offline;
- notificações push.

**Diferencial:** offline-first desde a base.

### 4.5 Estoque e Suprimentos

**Objetivo:** controlar itens, movimentações e consumo operacional.

**Capacidades:**

- item de estoque;
- saldo por filial;
- saldo por viatura;
- movimentação;
- baixa por OS;
- reserva;
- reposição;
- fornecedor;
- custo médio;
- alerta de estoque mínimo.

**Diferencial:** estoque conectado à execução, não apenas à administração.

### 4.6 Frota e Ativos

**Objetivo:** controlar custos, disponibilidade e riscos da frota.

**Capacidades:**

- viaturas;
- quilometragem;
- abastecimento;
- manutenção;
- danos;
- multas;
- seguros;
- documentos;
- alertas;
- custo/km;
- disponibilidade.

**Diferencial:** custo por serviço e manutenção preventiva.

### 4.7 Financeiro Operacional

**Objetivo:** conectar receita, custo, faturamento e fechamento à operação.

**Capacidades:**

- orçamento;
- contas/títulos;
- movimento de caixa;
- extrato;
- faturamento;
- fechamento;
- cheques e meios de pagamento;
- inconsistências;
- margem por OS;
- repasses/remunerações.

**Diferencial:** saber se a operação deu lucro e onde há divergência.

### 4.8 Relatórios e Analytics

**Objetivo:** transformar operação em decisão.

**Dashboards mínimos:**

- operacional;
- financeiro;
- frota;
- estoque;
- equipe;
- SLA;
- produtividade;
- margem.

**Diferencial:** alertas e ações rápidas integradas aos indicadores.

### 4.9 Integrações

**Objetivo:** permitir que o ERP Techsolutions converse com o ecossistema externo.

**Capacidades:**

- APIs;
- webhooks;
- mapas;
- mensageria;
- financeiro;
- notificações;
- logs;
- retries;
- credenciais seguras.

**Diferencial:** hub de integrações com monitoramento e rastreabilidade.

### 4.10 Automação e IA

**Objetivo:** reduzir decisão manual e antecipar problemas.

**Capacidades progressivas:**

- alerta de SLA;
- sugestão de despacho;
- detecção de inconsistências;
- previsão de manutenção;
- previsão de demanda;
- recomendação de rota/equipe;
- análise de margem;
- assistente de configuração.

## 5. Módulos e planos comerciais

| Plano | Módulos sugeridos |
|---|---|
| Starter | Core, cadastros, OS, painel básico, financeiro básico, relatórios básicos. |
| Professional | Mobile, estoque, frota, checklists, orçamento, faturamento, alertas. |
| Business | Estoque por viatura, manutenção, multas, remunerações, pré-faturamento, integrações. |
| Enterprise | IA, SSO, auditoria avançada, BI, isolamento premium, regras complexas, ESG. |

## 6. Decisões de modularidade

| Código | Decisão |
|---|---|
| DM-001 | A OS pertence ao módulo Operação, mas expõe eventos para financeiro, estoque e frota. |
| DM-002 | O financeiro não deve ser isolado: deve consumir dados operacionais. |
| DM-003 | Estoque por viatura deve ser tratado como extensão natural de estoque. |
| DM-004 | Mobile deve consumir o mesmo core de OS, mas com interface e sincronização próprias. |
| DM-005 | Configurações devem ser versionadas quando afetarem preço, checklist, SLA ou faturamento. |
| DM-006 | Relatórios devem ser resultado de eventos e entidades consistentes, não consultas improvisadas. |
