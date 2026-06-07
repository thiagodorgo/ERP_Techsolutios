# 05 — Requisitos Funcionais: ERP Techsolutions

## 1. Convenção

Cada requisito possui:

- **Código**: identificador único.
- **Prioridade**: Alta, Média ou Baixa.
- **Fase**: MVP, Scale ou Enterprise.
- **Tipo**: Core, Operação, Mobile, Estoque, Frota, Financeiro, Relatórios, Integrações ou IA.

## 2. Core SaaS, usuários e permissões

### RF-CORE-001 — Gerenciar tenants/empresas

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar e administrar empresas/tenants, com dados cadastrais, status, plano contratado e módulos habilitados.

**Critérios de aceite:**

- Deve permitir criar tenant.
- Deve permitir ativar/inativar tenant.
- Deve permitir associar módulos ao tenant.
- Deve isolar dados por tenant.
- Deve registrar log de criação e alteração.

### RF-CORE-002 — Gerenciar filiais

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar filiais vinculadas a um tenant.

**Critérios de aceite:**

- Deve permitir criar, editar e inativar filial.
- Deve permitir vincular usuários, estoque, serviços e financeiro à filial.
- Deve permitir filtros por filial.

### RF-CORE-003 — Gerenciar usuários

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir criar usuários com acesso web e/ou mobile.

**Critérios de aceite:**

- Deve permitir criar usuário.
- Deve permitir definir papel.
- Deve permitir definir filial/escopo.
- Deve permitir ativar/inativar usuário.
- Deve registrar último acesso.

### RF-CORE-004 — Gerenciar papéis e permissões

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir atribuir permissões por papel e escopo.

**Critérios de aceite:**

- Deve possuir papéis padrão.
- Deve permitir customização por tenant.
- Deve bloquear ações não autorizadas.
- Deve registrar logs de alterações de permissão.

### RF-CORE-005 — Habilitar módulos por plano

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir ativar/desativar módulos conforme plano comercial ou contrato.

**Critérios de aceite:**

- Usuário não deve acessar módulo desabilitado.
- Admin deve visualizar módulos disponíveis.
- Alteração deve gerar log.

## 3. Cadastros mestres e configurações

### RF-CAD-001 — Cadastrar clientes

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar clientes usados em OS, faturamento e relatórios.

**Critérios de aceite:**

- Deve permitir dados cadastrais básicos.
- Deve validar duplicidade configurável.
- Deve permitir status ativo/inativo.
- Deve vincular tabela de valores quando aplicável.

### RF-CAD-002 — Cadastrar fornecedores

**Prioridade:** Média  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar fornecedores vinculáveis a compras, estoque e manutenção.

### RF-CAD-003 — Cadastrar profissionais

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar profissionais, vinculando-os a usuário, equipe, filial e função.

### RF-CAD-004 — Cadastrar equipes

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir montar equipes com profissionais e viaturas.

### RF-CAD-005 — Cadastrar viaturas

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar viaturas com status, identificação, filial, km e disponibilidade.

### RF-CAD-006 — Checklists configuraveis por tenant

**Prioridade:** Alta  
**Fase:** Scale  
**Tipo:** Cadastros / Operacao / Mobile
**Modulo:** `checklists`
**Descricao:** O sistema deve permitir que usuarios autorizados de cada tenant criem, editem, publiquem, desativem e versionem modelos de checklist personalizados, usando apenas componentes/campos previamente disponibilizados pela plataforma ERP Techsolutions.

Cada modelo de checklist deve pertencer a um tenant especifico e pode ser associado a processos operacionais, administrativos ou comerciais, como ordens de servico, recebimento de mercadoria, entrega, manutencao, auditoria, vistoria, estoque, compras, vendas ou modulos futuros.

O cliente nao cria novos tipos de componentes em codigo. O cliente apenas escolhe, ordena e configura tipos permitidos pela plataforma.

**Componentes/campos iniciais permitidos pela plataforma:**

- `text`
- `textarea`
- `number`
- `currency`
- `date`
- `datetime`
- `select`
- `multi_select`
- `checkbox`
- `radio`
- `boolean`
- `photo`
- `file`
- `signature`
- `barcode`
- `qr_code`
- `location`
- `rating`

**Critérios de aceite:**

- Deve permitir criar modelos de checklist por tenant.
- Deve permitir definir nome, descricao, status, modulo relacionado e versao.
- Deve permitir adicionar campos configuraveis ao checklist.
- Deve permitir usar apenas tipos de componentes autorizados pela plataforma.
- Deve permitir marcar campos como obrigatorios.
- Deve permitir definir ordem dos campos.
- Deve permitir configuracoes especificas por tipo de campo.
- Deve permitir publicar uma versao do checklist.
- Deve preservar historico/versionamento dos modelos.
- Deve permitir executar/preencher checklists publicados.
- Deve registrar respostas dos campos.
- Deve permitir associar uma execucao de checklist a uma entidade do ERP.
- Deve garantir isolamento por `tenant_id` em modelos, campos, execucoes e respostas.
- Deve registrar auditoria em criacao, edicao, publicacao, desativacao, execucao e conclusao.
- Deve controlar acesso por permissoes/RBAC.
- Deve bloquear conclusao quando campos obrigatorios ou evidencias exigidas nao forem preenchidos.
- Deve ser preparado para execucao no mobile Flutter, inclusive em fluxo offline-first futuro.

### RF-CAD-007 — Configurar tabela de valores

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** O sistema deve permitir criar tabelas de valores com vigência e versionamento.

**Critérios de aceite:**

- Deve permitir itens de preço.
- Deve permitir associação a cliente/contrato.
- Deve permitir simulação antes de publicar.
- Deve preservar histórico de versões.

### RF-CAD-008 — Configurar tarifas personalizadas

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O sistema deve permitir tarifas por cliente, serviço, distância, horário, região ou condição operacional.

### RF-CAD-009 — Configurar tags

**Prioridade:** Baixa  
**Fase:** Scale  
**Descrição:** O sistema deve permitir criar tags para classificar registros e acionar filtros/automações.

### RF-CAD-010 — Configurar pontos de interesse

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O sistema deve permitir cadastrar pontos geográficos para uso em mapas, rotas, clientes e alertas.

## 4. Operação e ordem de serviço

### RF-OS-001 — Criar ordem de serviço

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir criar OS por formulário guiado.

**Critérios de aceite:**

- Deve permitir selecionar cliente.
- Deve permitir informar tipo de serviço.
- Deve permitir origem/destino/local.
- Deve permitir prioridade/SLA quando configurado.
- Deve permitir atribuição inicial ou posterior.
- Deve gerar número único.

### RF-OS-002 — Consultar ordens de serviço

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir pesquisar OS por busca global e filtros.

**Critérios de aceite:**

- Busca por código, cliente, placa/ativo, profissional, viatura ou palavra-chave.
- Filtros por status, período, filial, equipe e prioridade.
- Paginação e ordenação.

### RF-OS-003 — Visualizar detalhe da OS em timeline

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve exibir a OS como central operacional com timeline de eventos.

**Critérios de aceite:**

- Deve mostrar dados gerais.
- Deve mostrar status atual.
- Deve mostrar histórico.
- Deve mostrar comentários, anexos, checklist, estoque, financeiro e logs.

### RF-OS-004 — Atualizar status da OS

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir transições de status conforme fluxo configurado.

**Critérios de aceite:**

- Deve validar transição permitida.
- Deve registrar evento.
- Deve identificar usuário e origem.
- Deve disparar notificações quando configurado.

### RF-OS-005 — Despachar serviço

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O operador deve poder atribuir equipe, viatura ou profissional a uma OS.

**Critérios de aceite:**

- Deve listar recursos disponíveis.
- Deve bloquear recursos indisponíveis.
- Deve registrar alteração na timeline.

### RF-OS-006 — Despacho assistido

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O sistema deve sugerir equipe/viatura com base em disponibilidade, distância, SLA, habilidade e custo.

### RF-OS-007 — Cancelar OS com motivo

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cancelar OS mediante permissão e motivo obrigatório.

### RF-OS-008 — Duplicar ou copiar OS

**Prioridade:** Média  
**Fase:** MVP  
**Descrição:** O sistema deve permitir duplicar/copy uma OS mantendo rastreio da origem.

### RF-OS-009 — Imprimir ou exportar OS

**Prioridade:** Média  
**Fase:** MVP  
**Descrição:** O sistema deve permitir gerar impressão ou PDF com dados controlados por permissão.

### RF-OS-010 — Gerenciar comentários e arquivos

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir comentários, anexos e evidências vinculadas à OS.

### RF-OS-011 — Gerenciar orçamento da OS

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir criar orçamento vinculado à OS e converter para faturamento quando aprovado.

### RF-OS-012 — Painel logístico

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve oferecer painel para acompanhamento de serviços por status, mapa, equipe e SLA.

### RF-OS-013 — Mapa operacional

**Prioridade:** Média  
**Fase:** MVP/Scale  
**Descrição:** O sistema deve exibir serviços, pontos de interesse, viaturas/equipes e rotas quando disponíveis.

## 5. Mobile de campo

### RF-MOB-001 — Login mobile

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O usuário de campo deve acessar o app com credenciais seguras.

### RF-MOB-002 — Lista de serviços atribuídos

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O app deve exibir serviços atribuídos ao usuário/equipe.

### RF-MOB-003 — Atualização de status pelo app

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O usuário mobile deve atualizar status conforme permissões e fluxo.

### RF-MOB-004 — Preenchimento de checklist

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** O app deve permitir preencher checklists vinculados à OS.

### RF-MOB-005 — Coleta de fotos e evidências

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O app deve permitir anexar fotos, arquivos e observações.

### RF-MOB-006 — Operação offline-first

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O app deve permitir executar tarefas críticas sem conexão.

### RF-MOB-007 — Sincronização e conflitos

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** O app deve sincronizar alterações e tratar conflitos de forma rastreável.

### RF-MOB-008 — Assinatura digital simples

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O app deve coletar assinatura quando o tipo de serviço exigir.

### RF-MOB-009 — Localização e quilometragem

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O app deve registrar localização e apoiar cálculo de km conforme política do tenant.

## 6. Estoque

### RF-EST-001 — Gerenciar itens de estoque

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve permitir cadastrar itens, unidade, categoria, custo e status.

### RF-EST-002 — Controlar saldo por filial

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve controlar saldos por filial/almoxarifado.

### RF-EST-003 — Movimentar estoque

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O sistema deve registrar entrada, saída, ajuste e transferência.

### RF-EST-004 — Baixar estoque por OS

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** O consumo de itens em uma OS deve gerar movimentação.

### RF-EST-005 — Controlar estoque por viatura

**Prioridade:** Alta  
**Fase:** Scale  
**Descrição:** O sistema deve permitir saldo embarcado em viaturas.

### RF-EST-006 — Alertar estoque mínimo

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** O sistema deve alertar quando item atingir saldo mínimo.

## 7. Frota e ativos

### RF-FROTA-001 — Controlar abastecimento

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Registrar abastecimento por viatura, km, valor, quantidade e responsável.

### RF-FROTA-002 — Controlar manutenção

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Registrar manutenções preventivas e corretivas.

### RF-FROTA-003 — Controlar danos

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Registrar danos com fotos, custo, responsável e status.

### RF-FROTA-004 — Controlar multas

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Registrar multas, prazos, responsáveis, status e valores.

### RF-FROTA-005 — Controlar seguros e notificações

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Registrar apólices, vencimentos e alertas.

### RF-FROTA-006 — Calcular custo por km

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Calcular custo por km usando abastecimento, manutenção e quilometragem.

## 8. Financeiro operacional

### RF-FIN-001 — Movimento de caixa

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** Controlar entradas e saídas de caixa vinculadas a origem, conta, filial e usuário.

### RF-FIN-002 — Contas e títulos

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** Gerenciar contas a pagar/receber e títulos operacionais.

### RF-FIN-003 — Extrato financeiro

**Prioridade:** Média  
**Fase:** MVP  
**Descrição:** Exibir extrato por conta, filial, período e categoria.

### RF-FIN-004 — Faturamento

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** Gerar faturamento a partir de OS, orçamento, cliente, contrato ou período.

### RF-FIN-005 — Fechamento financeiro

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** Executar fechamento com checklist de pendências e logs.

### RF-FIN-006 — Títulos incongruentes

**Prioridade:** Alta  
**Fase:** Scale  
**Descrição:** Detectar divergências entre operação, orçamento, faturamento e contas.

### RF-FIN-007 — Cheques e meios de pagamento

**Prioridade:** Baixa  
**Fase:** Scale  
**Descrição:** Controlar cheques e outros meios de pagamento quando habilitados.

### RF-FIN-008 — Margem por serviço

**Prioridade:** Alta  
**Fase:** Scale  
**Descrição:** Calcular receita, custo e margem por OS.

## 9. Relatórios, indicadores e alertas

### RF-REL-001 — Dashboard operacional

**Prioridade:** Alta  
**Fase:** MVP  
**Descrição:** Exibir serviços por status, atrasos, SLA, equipe e fila.

### RF-REL-002 — Dashboard financeiro

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** Exibir faturamento, caixa, pendências, contas, margem e inconsistências.

### RF-REL-003 — Relatórios exportáveis

**Prioridade:** Média  
**Fase:** MVP  
**Descrição:** Permitir exportar relatórios conforme permissão.

### RF-REL-004 — Alertas acionáveis

**Prioridade:** Alta  
**Fase:** Scale  
**Descrição:** Alertas devem permitir abrir o item relacionado e resolver pendência.

### RF-REL-005 — KPIs de superioridade

**Prioridade:** Alta  
**Fase:** MVP/Scale  
**Descrição:** Medir tempo de despacho, cliques, custo, retrabalho, pendências e margem.

## 10. Integrações e automações

### RF-INT-001 — Hub de integrações

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Gerenciar integrações, status, credenciais e logs.

### RF-INT-002 — Webhooks

**Prioridade:** Média  
**Fase:** Scale  
**Descrição:** Permitir emitir eventos para sistemas externos.

### RF-IA-001 — Motor de inconsistências

**Prioridade:** Alta  
**Fase:** Scale  
**Descrição:** Detectar divergências operacionais e financeiras.

### RF-IA-002 — Despacho inteligente

**Prioridade:** Média  
**Fase:** Enterprise  
**Descrição:** Recomendar despacho com base em dados históricos e contexto operacional.

### RF-IA-003 — Assistente de configuração

**Prioridade:** Média  
**Fase:** Enterprise  
**Descrição:** Sugerir parâmetros e detectar configuração incompleta.
