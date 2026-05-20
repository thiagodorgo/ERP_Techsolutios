# 03 — Atores, Papéis e Responsabilidades

## 1. Visão geral

O ERP Techsolutions deve ser desenhado por papéis operacionais. Isso reduz treinamento, evita excesso de menus e melhora produtividade. Cada papel precisa ter dashboard, permissões, ações rápidas e indicadores adequados à sua responsabilidade.

## 2. Atores principais

| Ator | Descrição | Ambiente principal |
|---|---|---|
| Administrador do tenant | Configura empresa, filiais, usuários, planos, módulos e permissões. | Web |
| Gestor executivo | Acompanha indicadores, custos, margem, crescimento e riscos. | Web |
| Gestor operacional | Controla operação, equipes, SLA, produtividade e gargalos. | Web |
| Operador logístico | Cria, despacha, acompanha, altera e finaliza serviços. | Web |
| Supervisor de campo | Acompanha execução, valida evidências e apoia equipes. | Web/Mobile |
| Motorista/guincheiro/técnico | Executa ordens de serviço em campo. | Mobile |
| Operador de pátio | Controla entrada, localização, vistoria e saída de veículos/ativos. | Web/Mobile |
| Estoquista | Controla itens, saldos, movimentações, consumo e reposição. | Web |
| Financeiro | Controla caixa, contas, faturamento, fechamento e inconsistências. | Web |
| Compras/suprimentos | Gerencia fornecedores e reposição de itens. | Web |
| Auditor/consulta | Acessa logs, histórico, relatórios e evidências. | Web |
| Suporte interno Techsolutions | Apoia tenants, investiga incidentes e monitora uso conforme permissão. | Admin interno |

## 3. Papéis oficiais sugeridos

### 3.1 ADMIN_TENANT — Administrador do tenant

**Responsabilidades:**

- configurar dados da empresa;
- criar filiais;
- cadastrar usuários;
- atribuir papéis;
- ativar módulos contratados;
- configurar parâmetros;
- acompanhar logs sensíveis;
- gerenciar integrações.

**Permissões típicas:**

- acesso total ao tenant;
- configuração de usuários e permissões;
- parametrizações avançadas;
- consulta a auditoria;
- gestão de integrações.

**Restrições recomendadas:**

- não pode acessar tenants de outras empresas;
- alterações críticas devem exigir log e, em alguns casos, dupla confirmação.

### 3.2 GESTOR_EXECUTIVO

**Responsabilidades:**

- acompanhar resultados;
- analisar custo e margem;
- avaliar produtividade;
- acompanhar indicadores de operação e financeiro;
- tomar decisão estratégica.

**Permissões típicas:**

- dashboards executivos;
- relatórios consolidados;
- exportações autorizadas;
- visualização de indicadores por filial, cliente e período.

**Restrições recomendadas:**

- não precisa editar cadastros operacionais;
- não deve executar ações de campo ou fechamento sem papel adicional.

### 3.3 GESTOR_OPERACIONAL

**Responsabilidades:**

- monitorar serviços em andamento;
- priorizar atendimentos;
- acompanhar SLA;
- redistribuir equipes;
- resolver gargalos;
- validar cancelamentos e ocorrências.

**Permissões típicas:**

- visualizar painel logístico;
- alterar responsáveis;
- aprovar exceções operacionais;
- cancelar com motivo;
- visualizar mapa e status;
- acessar indicadores operacionais.

### 3.4 OPERADOR_LOGISTICO

**Responsabilidades:**

- cadastrar serviços;
- consultar clientes;
- atribuir equipe/viatura;
- acompanhar status;
- registrar observações;
- emitir orçamento inicial;
- imprimir ou compartilhar informações operacionais.

**Permissões típicas:**

- criar e editar OS dentro de escopo;
- despachar serviço;
- atualizar dados operacionais;
- anexar arquivos;
- visualizar histórico.

**Diferencial de interface:**

- busca global;
- ações rápidas;
- formulário progressivo;
- painel com filas por status.

### 3.5 SUPERVISOR_CAMPO

**Responsabilidades:**

- apoiar equipes;
- acompanhar execução;
- validar evidências;
- tratar exceções;
- monitorar rotas e atrasos.

**Permissões típicas:**

- visualizar serviços da equipe;
- validar fotos/checklists;
- reabrir etapa com justificativa;
- registrar ocorrência;
- aprovar alterações controladas.

### 3.6 EXECUTOR_CAMPO

**Responsabilidades:**

- receber OS;
- iniciar deslocamento;
- chegar ao local;
- executar serviço;
- preencher checklist;
- coletar fotos/assinatura;
- registrar consumo de estoque;
- finalizar atendimento.

**Permissões típicas:**

- visualizar apenas serviços atribuídos;
- atualizar status permitidos;
- anexar evidências;
- operar offline;
- sincronizar dados.

**Restrições:**

- não altera faturamento;
- não altera tabela de preço;
- não acessa relatórios administrativos.

### 3.7 OPERADOR_PATIO

**Responsabilidades:**

- registrar entrada;
- localizar veículo/ativo;
- fazer vistoria;
- registrar fotos;
- controlar permanência;
- liberar saída;
- comunicar pendências financeiras ou documentais.

**Permissões típicas:**

- criar evento de pátio;
- atualizar localização;
- anexar vistoria;
- visualizar histórico do ativo;
- bloquear/liberar conforme regra.

### 3.8 ESTOQUISTA

**Responsabilidades:**

- controlar saldo;
- registrar entradas e saídas;
- transferir itens;
- abastecer viaturas;
- acompanhar estoque mínimo;
- apoiar compras.

**Permissões típicas:**

- gerenciar itens;
- movimentar estoque;
- consultar consumo por OS;
- emitir alertas de reposição;
- inventariar saldos.

### 3.9 FINANCEIRO

**Responsabilidades:**

- controlar contas;
- lançar movimentos;
- acompanhar caixa;
- validar orçamento/faturamento;
- executar fechamento;
- tratar títulos incongruentes;
- analisar margem.

**Permissões típicas:**

- contas a pagar/receber;
- caixa;
- extrato;
- faturamento;
- fechamento;
- inconsistências;
- relatórios financeiros.

### 3.10 COMPRAS_SUPRIMENTOS

**Responsabilidades:**

- controlar fornecedores;
- gerar pedidos de compra;
- acompanhar reposição;
- analisar consumo;
- negociar itens recorrentes.

**Permissões típicas:**

- fornecedores;
- solicitações de compra;
- entrada de mercadorias;
- alertas de reposição;
- histórico de preço.

### 3.11 AUDITOR_CONSULTA

**Responsabilidades:**

- consultar logs;
- verificar evidências;
- auditar alterações;
- validar conformidade.

**Permissões típicas:**

- visualização sem edição;
- exportação restrita;
- acesso a histórico e trilhas.

## 4. Matriz inicial de permissões

Legenda: V = visualizar, C = criar, E = editar, A = aprovar, X = excluir/cancelar, R = relatório/exportar.

| Recurso | Admin | Gestor Op. | Operador | Campo | Pátio | Estoque | Financeiro | Auditor |
|---|---|---|---|---|---|---|---|---|
| Usuários/permissões | V/C/E/X | V | - | - | - | - | - | V |
| Cadastros mestres | V/C/E/X | V/E | V | - | V | V | V | V |
| Ordem de serviço | V/C/E/X | V/E/A/X | V/C/E | V/E parcial | V/E parcial | V | V | V |
| Painel logístico | V | V/E/A | V/E | V parcial | V parcial | - | V | V |
| Mobile execução | Config | V | V | V/E | V/E | V parcial | - | V |
| Estoque | V/C/E/X | V | V parcial | Baixa permitida | V parcial | V/C/E/X | V custo | V |
| Frota | V/C/E/X | V/E/A | V | V parcial | V | V itens | V custo | V |
| Financeiro | V/C/E/X | V | V orçamento | - | V pendência | V custo | V/C/E/A/X/R | V |
| Faturamento | V/C/E/X | V/A | V parcial | - | - | - | V/C/E/A/R | V |
| Fechamento | V/C/E/X | V | - | - | - | - | V/C/E/A/R | V |
| Relatórios | V/R | V/R | V parcial | - | V parcial | V/R | V/R | V/R |
| Auditoria/logs | V/R | V | V parcial | V próprio | V parcial | V parcial | V | V/R |
| Integrações | V/C/E/X | V | - | - | - | - | V parcial | V |

## 5. Regras de autorização

| Código | Regra |
|---|---|
| AUTH-001 | Todo usuário pertence a um tenant. |
| AUTH-002 | Todo acesso a dados operacionais deve ser filtrado por tenant_id. |
| AUTH-003 | Permissões podem ser restringidas por filial. |
| AUTH-004 | Permissões podem ser restringidas por equipe ou escopo operacional. |
| AUTH-005 | Ações críticas exigem motivo e log. |
| AUTH-006 | Cancelamento, reabertura, fechamento e exclusão lógica exigem permissão explícita. |
| AUTH-007 | Usuário mobile só acessa serviços atribuídos ou autorizados por escopo. |
| AUTH-008 | Exportações devem ser auditadas. |
| AUTH-009 | Dados financeiros sensíveis exigem papel financeiro ou gestor autorizado. |
| AUTH-010 | Suporte interno só acessa tenant com autorização e log administrativo. |

## 6. Dashboards por papel

| Papel | Dashboard padrão |
|---|---|
| Administrador | Saúde do tenant, usuários, módulos, integrações, pendências de configuração. |
| Gestor executivo | Receita, margem, custo, SLA, produtividade, ranking de clientes e filiais. |
| Gestor operacional | Serviços por status, mapa, atrasos, equipe, SLA, gargalos. |
| Operador logístico | Fila de atendimento, serviços pendentes, ações rápidas, busca global. |
| Executor campo | Minhas OS, próxima ação, rota, checklist pendente, sincronização. |
| Financeiro | Pré-faturamento, contas vencidas, caixa, fechamento, inconsistências. |
| Estoque | Estoque mínimo, consumo por OS, transferências, inventário, reposição. |
| Auditor | Logs críticos, alterações recentes, exportações e evidências. |

## 7. Decisão de produto

O ERP Techsolutions deve implementar RBAC inicialmente, com evolução para ABAC em regras avançadas. Em termos práticos:

- **RBAC**: papel define permissões base.
- **Escopo**: filial, equipe, módulo e tenant limitam acesso.
- **Atributos futuros**: valor financeiro, status, horário, dispositivo e origem podem restringir ações críticas.
