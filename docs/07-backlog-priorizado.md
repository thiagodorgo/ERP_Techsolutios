# 07 — Backlog Priorizado: ERP Techsolutions

## 1. Visão geral

Este backlog organiza a construção do ERP Techsolutions em épicos, features e histórias de usuário. A priorização considera a necessidade de nascer competitivo frente ao benchmark, mas com arquitetura e produto superiores.

Fases:

- **MVP competitivo**: base vendável e operacional.
- **Scale**: automações, regras avançadas e diferenciação clara.
- **Enterprise**: IA, governança avançada e grandes contas.

## 2. Épicos do produto

| Código | Épico | Fase inicial |
|---|---|---|
| EP-01 | Core SaaS, Tenancy e Segurança | MVP |
| EP-02 | Cadastros Mestres e Configuração Guiada | MVP |
| EP-03 | Ordem de Serviço e Painel Logístico | MVP |
| EP-04 | Mobile de Campo Offline-First | MVP |
| EP-05 | Estoque Operacional | MVP |
| EP-06 | Financeiro Operacional | MVP |
| EP-07 | Frota e Ativos | Scale |
| EP-08 | Relatórios, KPIs e Alertas | MVP/Scale |
| EP-09 | Integrações | Scale |
| EP-10 | Automação e IA | Scale/Enterprise |
| EP-11 | Governança Enterprise | Enterprise |

## 3. MVP competitivo

### EP-01 — Core SaaS, Tenancy e Segurança

#### Feature F01 — Gestão de tenant

**Objetivo:** permitir operar múltiplas empresas com isolamento lógico.

Histórias:

- Como administrador interno, quero criar um tenant para iniciar a implantação de uma empresa.
- Como administrador do tenant, quero configurar os dados básicos da empresa.
- Como sistema, quero garantir que todas as consultas sejam filtradas por tenant.

Critérios de pronto:

- Tenant criado com status.
- Dados isolados por tenant_id.
- Testes de isolamento multi-tenant.

#### Feature F02 — Usuários e papéis

Histórias:

- Como admin, quero cadastrar usuários para liberar acesso ao sistema.
- Como admin, quero atribuir papéis para controlar permissões.
- Como usuário, quero acessar apenas recursos permitidos.

Critérios de pronto:

- Papéis padrão criados.
- Permissões aplicadas no backend.
- Logs de alteração de permissão.

### EP-02 — Cadastros Mestres e Configuração Guiada

#### Feature F03 — Clientes, fornecedores e profissionais

Histórias:

- Como operador, quero cadastrar cliente para criar serviços.
- Como gestor, quero manter fornecedores para compras e manutenção.
- Como admin, quero cadastrar profissionais e vincular usuário/equipe.

#### Feature F04 — Filiais, equipes e viaturas

Histórias:

- Como admin, quero cadastrar filiais para separar operação.
- Como gestor, quero montar equipes com profissionais e viaturas.
- Como operador, quero visualizar viaturas disponíveis para despacho.

#### Feature F05 — Configuração inicial assistida

Histórias:

- Como admin, quero um checklist de implantação para saber o que falta configurar.
- Como admin, quero importar cadastros iniciais por planilha em versão futura.
- Como admin, quero ser avisado sobre configurações inconsistentes.

### EP-03 — Ordem de Serviço e Painel Logístico

#### Feature F06 — Criar OS

Histórias:

- Como operador logístico, quero criar uma OS rapidamente.
- Como operador, quero selecionar cliente, tipo de serviço, origem, destino e prioridade.
- Como sistema, quero gerar número único por tenant.

Critérios de pronto:

- OS criada com status inicial.
- Validações obrigatórias.
- Evento de criação na timeline.

#### Feature F07 — Consultar e filtrar OS

Histórias:

- Como operador, quero buscar OS por código, cliente, placa/ativo ou palavra-chave.
- Como gestor, quero filtrar OS por status, período, equipe, filial e SLA.

#### Feature F08 — Detalhe da OS em timeline

Histórias:

- Como operador, quero ver todos os eventos da OS em uma timeline.
- Como financeiro, quero ver orçamento e faturamento vinculados à OS.
- Como estoquista, quero ver itens consumidos pela OS.
- Como auditor, quero ver logs e evidências da OS.

#### Feature F09 — Status, despacho e cancelamento

Histórias:

- Como operador, quero atribuir equipe/viatura a uma OS.
- Como operador, quero alterar status conforme fluxo permitido.
- Como gestor, quero cancelar OS com motivo obrigatório.

### EP-04 — Mobile de Campo Offline-First

#### Feature F10 — Execução básica mobile

Histórias:

- Como executor de campo, quero ver minhas OS atribuídas.
- Como executor, quero atualizar status da OS pelo app.
- Como executor, quero registrar fotos e observações.
- Como sistema, quero sincronizar atualizações com a web.

#### Feature F11 — Offline controlado

Histórias:

- Como executor, quero continuar trabalhando sem internet.
- Como sistema, quero guardar alterações locais até sincronizar.
- Como executor, quero ver pendências de sincronização.

### EP-05 — Estoque Operacional

#### Feature F12 — Itens e saldos

Histórias:

- Como estoquista, quero cadastrar itens.
- Como estoquista, quero controlar saldo por filial.
- Como gestor, quero consultar saldos disponíveis.

#### Feature F13 — Consumo por OS

Histórias:

- Como operador, quero vincular item consumido à OS.
- Como sistema, quero baixar estoque ao registrar consumo.
- Como financeiro, quero considerar custo de item na margem da OS.

### EP-06 — Financeiro Operacional

#### Feature F14 — Orçamento por OS

Histórias:

- Como operador, quero gerar orçamento para uma OS.
- Como financeiro, quero aprovar orçamento antes do faturamento.

#### Feature F15 — Caixa, contas e extrato

Histórias:

- Como financeiro, quero registrar movimentos de caixa.
- Como financeiro, quero controlar contas/títulos.
- Como financeiro, quero visualizar extrato por período e conta.

#### Feature F16 — Faturamento e fechamento inicial

Histórias:

- Como financeiro, quero faturar serviços finalizados.
- Como financeiro, quero executar fechamento com pendências visíveis.
- Como gestor, quero consultar receita por cliente e período.

### EP-08 — Relatórios, KPIs e Alertas

#### Feature F17 — Dashboard operacional MVP

Histórias:

- Como gestor, quero ver serviços por status.
- Como gestor, quero ver atrasos e pendências.
- Como operador, quero acessar rapidamente OS que precisam de ação.

#### Feature F18 — Dashboard financeiro MVP

Histórias:

- Como financeiro, quero ver contas vencidas.
- Como financeiro, quero ver faturamento do período.
- Como gestor, quero ver margem estimada por operação em versão inicial.

## 4. Scale

### EP-02 — Configuração avançada

#### Feature F19 — Motor de preços e tarifas

Histórias:

- Como admin, quero criar tabela de valores com vigência.
- Como admin, quero simular preço antes de publicar.
- Como financeiro, quero aplicar tarifas por cliente, serviço e condição.

#### Feature F20 — Checklist dinâmico

Histórias:

- Como admin, quero criar checklist por tipo de serviço.
- Como gestor, quero exigir evidências por etapa.
- Como executor, quero preencher checklist no mobile.

### EP-07 — Frota e Ativos

#### Feature F21 — Abastecimento e quilometragem

Histórias:

- Como gestor de frota, quero registrar abastecimento.
- Como gestor, quero calcular custo/km.
- Como sistema, quero alertar consumo anormal.

#### Feature F22 — Manutenção, danos, multas e seguros

Histórias:

- Como gestor, quero registrar manutenção preventiva e corretiva.
- Como supervisor, quero registrar dano com evidência.
- Como financeiro, quero acompanhar multas e custos.
- Como sistema, quero alertar vencimento de seguro/documentos.

### EP-05 — Estoque avançado

#### Feature F23 — Estoque por viatura

Histórias:

- Como estoquista, quero transferir itens para viatura.
- Como executor, quero consumir item do estoque da viatura.
- Como gestor, quero saber saldo embarcado por equipe.

#### Feature F24 — Reposição automática

Histórias:

- Como estoquista, quero alerta de estoque mínimo.
- Como compras, quero gerar solicitação de compra a partir de estoque mínimo.

### EP-06 — Financeiro avançado

#### Feature F25 — Pré-faturamento e inconsistências

Histórias:

- Como financeiro, quero identificar OS pendentes para faturar.
- Como financeiro, quero ver divergências de valor, status e evidência.
- Como sistema, quero classificar inconsistências por severidade.

#### Feature F26 — Margem por OS

Histórias:

- Como gestor, quero saber receita, custo e margem por OS.
- Como gestor, quero comparar margem por cliente, viatura e filial.

### EP-08 — KPIs e alertas acionáveis

#### Feature F27 — Alertas inteligentes básicos

Histórias:

- Como gestor, quero receber alerta de atraso de SLA.
- Como financeiro, quero receber alerta de fechamento com pendências.
- Como estoque, quero receber alerta de saldo mínimo.

### EP-09 — Integrações

#### Feature F28 — Hub de integrações

Histórias:

- Como admin, quero configurar integrações por tenant.
- Como suporte, quero ver logs de integração.
- Como sistema, quero reprocessar falhas quando possível.

## 5. Enterprise

### EP-10 — Automação e IA

#### Feature F29 — Despacho inteligente

Histórias:

- Como operador, quero receber sugestão de melhor equipe/viatura.
- Como gestor, quero entender por que o sistema sugeriu aquela equipe.
- Como sistema, quero considerar distância, SLA, custo e disponibilidade.

#### Feature F30 — Previsão de demanda

Histórias:

- Como gestor, quero prever picos de demanda.
- Como gestor, quero dimensionar equipe por período.

#### Feature F31 — Manutenção preditiva

Histórias:

- Como gestor de frota, quero prever necessidade de manutenção.
- Como sistema, quero cruzar km, histórico e eventos.

### EP-11 — Governança Enterprise

#### Feature F32 — SSO e federação

Histórias:

- Como cliente enterprise, quero autenticação via provedor corporativo.

#### Feature F33 — Isolamento premium

Histórias:

- Como cliente enterprise, quero isolamento de dados reforçado.

#### Feature F34 — BI e data warehouse

Histórias:

- Como gestor executivo, quero análises históricas avançadas.

#### Feature F35 — ESG e carbono

Histórias:

- Como gestor, quero medir km evitado e emissão estimada.
- Como gestor, quero comparar eficiência ambiental por rota, equipe e operação.

## 6. Priorização MoSCoW do MVP

### Must have

- Multi-tenant básico.
- Login e usuários.
- Papéis e permissões.
- Clientes, profissionais, equipes, filiais e viaturas.
- Ordem de serviço.
- Painel logístico básico.
- Timeline da OS.
- Status e logs.
- Comentários e anexos.
- Mobile básico com status e evidências.
- Estoque básico e consumo por OS.
- Orçamento básico.
- Caixa, contas, faturamento e fechamento inicial.
- Dashboard operacional.

### Should have

- Busca global.
- Checklist básico.
- Impressão/PDF da OS.
- Extrato financeiro.
- Relatórios exportáveis.
- Alertas básicos de pendência.

### Could have

- Tags.
- Pontos de interesse.
- Cheques.
- Favoritos por usuário.
- Importação inicial por planilha.

### Won't have no MVP inicial

- IA avançada.
- Telemetria.
- SSO.
- Data warehouse.
- ESG/carbono.
- Isolamento por banco por tenant.

## 7. Roadmap sugerido

### Ciclo 1 — Fundação

- Tenancy.
- Login.
- Usuários e papéis.
- Filiais.
- Cadastros base.
- Estrutura de auditoria.

### Ciclo 2 — Operação

- OS.
- Status.
- Timeline.
- Painel logístico.
- Comentários e anexos.
- Busca e filtros.

### Ciclo 3 — Campo e estoque

- App mobile básico.
- Offline inicial.
- Checklist/evidências.
- Itens de estoque.
- Baixa por OS.

### Ciclo 4 — Financeiro

- Orçamento.
- Caixa.
- Contas.
- Faturamento.
- Fechamento inicial.

### Ciclo 5 — Diferenciação

- Motor de preços.
- Estoque por viatura.
- Frota/eventos.
- Inconsistências.
- Alertas acionáveis.

### Ciclo 6 — Escala

- Integrações.
- Dashboards avançados.
- Despacho assistido.
- BI inicial.
- Governança avançada.

## 8. Critérios de corte para MVP vendável

O MVP só deve ser considerado vendável quando:

- uma empresa conseguir cadastrar sua operação básica;
- um operador conseguir criar, despachar e acompanhar OS;
- um executor conseguir atualizar OS pelo mobile;
- uma OS conseguir reunir histórico, evidências e comentários;
- estoque consumido puder ser vinculado à OS;
- financeiro conseguir faturar e fechar minimamente;
- gestor conseguir ver status da operação;
- permissões e tenant estiverem seguros;
- auditoria básica estiver ativa.
