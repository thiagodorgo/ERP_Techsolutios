# 04 — Regras de Negócio: ERP Techsolutions

## 1. Visão geral

Este documento consolida as primeiras regras de negócio oficiais do ERP Techsolutions. As regras foram derivadas da análise comparativa do benchmark, mas foram reescritas para o produto Techsolutions com foco em superioridade operacional, rastreabilidade, integração e escalabilidade SaaS.

Convenção:

- **RN-CORE**: regras transversais.
- **RN-CAD**: cadastros e configurações.
- **RN-OS**: ordem de serviço e operação.
- **RN-MOB**: mobile e campo.
- **RN-EST**: estoque.
- **RN-FROTA**: frota e ativos.
- **RN-FIN**: financeiro.
- **RN-REL**: relatórios e indicadores.
- **RN-AUD**: auditoria.
- **RN-INT**: integrações.

## 2. Regras transversais — Core SaaS

| Código | Regra | Prioridade |
|---|---|---|
| RN-CORE-001 | Todo dado operacional deve pertencer a um tenant. | Alta |
| RN-CORE-002 | Todo acesso deve respeitar tenant, papel, filial e escopo operacional. | Alta |
| RN-CORE-003 | Nenhum usuário pode acessar dados de outro tenant. | Alta |
| RN-CORE-004 | Módulos devem ser habilitados por plano, contrato ou feature flag. | Alta |
| RN-CORE-005 | Toda entidade principal deve possuir status ativo/inativo ou equivalente. | Média |
| RN-CORE-006 | Exclusões de entidades críticas devem ser lógicas, não físicas. | Alta |
| RN-CORE-007 | Alterações críticas devem gerar log de auditoria. | Alta |
| RN-CORE-008 | Configurações críticas devem ter data de vigência quando afetarem preço, faturamento, checklist ou SLA. | Alta |
| RN-CORE-009 | O sistema deve suportar múltiplas filiais por tenant. | Alta |
| RN-CORE-010 | Permissões administrativas devem ser separadas de permissões operacionais. | Alta |

## 3. Cadastros e configurações

| Código | Regra | Prioridade |
|---|---|---|
| RN-CAD-001 | Cliente deve possuir identificação única dentro do tenant. | Alta |
| RN-CAD-002 | Fornecedor deve possuir dados mínimos para vínculo com compras, estoque ou financeiro. | Média |
| RN-CAD-003 | Profissional deve poder ser vinculado a usuário, equipe e filial. | Alta |
| RN-CAD-004 | Viatura deve possuir identificação única, status operacional e vínculo com filial. | Alta |
| RN-CAD-005 | Equipe deve permitir composição por profissionais e/ou viaturas. | Alta |
| RN-CAD-006 | Filial deve delimitar operação, estoque, financeiro e permissões quando configurado. | Alta |
| RN-CAD-007 | Checklist deve ser versionado quando estiver associado a serviço, cliente ou tipo de operação. | Alta |
| RN-CAD-008 | Tabela de valores deve ter vigência, versão e status de publicação. | Alta |
| RN-CAD-009 | Tarifas personalizadas devem registrar origem, regra, cliente e validade. | Alta |
| RN-CAD-010 | Tags devem poder ser aplicadas a clientes, serviços, viaturas, profissionais e eventos. | Média |
| RN-CAD-011 | Pontos de interesse devem permitir geolocalização e uso em filtros/mapas. | Média |
| RN-CAD-012 | Parâmetros críticos não podem ser alterados sem registro de usuário, data, motivo e valor anterior. | Alta |
| RN-CAD-013 | A implantação de novo tenant deve possuir checklist de configuração mínima. | Alta |
| RN-CAD-014 | Cadastros duplicados devem ser prevenidos por regras de deduplicação configuráveis. | Média |

## 4. Ordem de serviço e operação

| Código | Regra | Prioridade |
|---|---|---|
| RN-OS-001 | A ordem de serviço é a entidade central da operação. | Alta |
| RN-OS-002 | Toda OS deve possuir identificador único por tenant. | Alta |
| RN-OS-003 | Toda OS deve possuir status atual. | Alta |
| RN-OS-004 | Toda alteração de status deve gerar evento na timeline da OS. | Alta |
| RN-OS-005 | Toda OS deve possuir cliente ou solicitante identificado, salvo regra de atendimento avulso. | Alta |
| RN-OS-006 | OS pode possuir origem, destino, ponto de referência e localização geográfica. | Alta |
| RN-OS-007 | OS pode ser atribuída a equipe, profissional e/ou viatura. | Alta |
| RN-OS-008 | Cancelamento de OS deve exigir motivo e gerar log. | Alta |
| RN-OS-009 | Duplicação ou cópia de OS deve registrar origem e usuário responsável. | Média |
| RN-OS-010 | Impressão/exportação de OS deve respeitar permissões e registrar evento quando configurado. | Média |
| RN-OS-011 | Comentários devem ficar vinculados à OS e ao usuário autor. | Alta |
| RN-OS-012 | Anexos, fotos e documentos devem ficar vinculados à OS e classificados por tipo. | Alta |
| RN-OS-013 | Orçamento pode ser criado antes, durante ou depois da execução, conforme regra do tenant. | Média |
| RN-OS-014 | Estoque consumido em uma OS deve gerar movimentação de estoque. | Alta |
| RN-OS-015 | Toda OS finalizada deve validar pendências obrigatórias: checklist, evidências, status, financeiro ou assinatura, conforme tipo. | Alta |
| RN-OS-016 | Reabertura de OS finalizada deve exigir permissão e justificativa. | Alta |
| RN-OS-017 | A timeline da OS deve consolidar status, comentários, anexos, financeiro, estoque, mapa e auditoria. | Alta |
| RN-OS-018 | O painel logístico deve permitir acompanhamento por status, equipe, filial, período, cliente e prioridade. | Alta |
| RN-OS-019 | O despacho assistido deve considerar disponibilidade, localização, SLA, habilidade e custo quando os dados existirem. | Média |
| RN-OS-020 | OS em atraso deve gerar alerta conforme SLA configurado. | Alta |

## 5. Mobile e campo

| Código | Regra | Prioridade |
|---|---|---|
| RN-MOB-001 | Usuário mobile só deve visualizar OS atribuídas ou autorizadas por escopo. | Alta |
| RN-MOB-002 | O app deve permitir operar OS mesmo sem conexão, dentro dos dados sincronizados. | Alta |
| RN-MOB-003 | Toda atualização offline deve registrar data/hora local, dispositivo e usuário. | Alta |
| RN-MOB-004 | Sincronização deve resolver conflitos de forma rastreável. | Alta |
| RN-MOB-005 | Fotos devem registrar vínculo com OS, checklist, etapa, usuário e data/hora. | Alta |
| RN-MOB-006 | Localização deve ser coletada conforme permissão e política do tenant. | Alta |
| RN-MOB-007 | Checklist obrigatório deve bloquear finalização quando não preenchido. | Alta |
| RN-MOB-008 | Assinatura deve ser armazenada como evidência quando exigida. | Média |
| RN-MOB-009 | O app deve exibir pendências de sincronização. | Alta |
| RN-MOB-010 | Atualizações críticas feitas no app devem aparecer na timeline da OS. | Alta |
| RN-MOB-011 | Sessão mobile deve expirar conforme política de segurança. | Média |
| RN-MOB-012 | Notificações push devem respeitar papel, atribuição e escopo. | Média |

## 6. Estoque

| Código | Regra | Prioridade |
|---|---|---|
| RN-EST-001 | Item de estoque deve possuir código, descrição, unidade e status. | Alta |
| RN-EST-002 | Saldo deve ser controlado por filial/almoxarifado. | Alta |
| RN-EST-003 | O sistema deve permitir estoque por viatura. | Alta |
| RN-EST-004 | Consumo de item em OS deve gerar baixa automática ou pendente de aprovação, conforme regra. | Alta |
| RN-EST-005 | Transferência entre filial e viatura deve gerar movimentação rastreável. | Alta |
| RN-EST-006 | Estoque mínimo deve gerar alerta de reposição. | Média |
| RN-EST-007 | Inventário deve registrar divergência e ajuste com justificativa. | Média |
| RN-EST-008 | Itens críticos podem exigir aprovação para baixa ou ajuste. | Média |
| RN-EST-009 | Custo de item consumido deve compor custo da OS quando configurado. | Alta |
| RN-EST-010 | Histórico de movimentações não pode ser apagado fisicamente. | Alta |

## 7. Frota e ativos

| Código | Regra | Prioridade |
|---|---|---|
| RN-FROTA-001 | Viatura deve possuir status operacional. | Alta |
| RN-FROTA-002 | Viatura indisponível não deve ser sugerida para despacho. | Alta |
| RN-FROTA-003 | Abastecimento deve registrar viatura, motorista/profissional, data, km, quantidade, valor e local quando possível. | Alta |
| RN-FROTA-004 | Abastecimento com consumo anormal deve gerar alerta. | Média |
| RN-FROTA-005 | Manutenção deve permitir tipo preventiva/corretiva. | Alta |
| RN-FROTA-006 | Manutenção preventiva pode ser disparada por km, tempo ou evento. | Média |
| RN-FROTA-007 | Dano deve registrar evidência, responsável, custo estimado, status e vínculo operacional. | Alta |
| RN-FROTA-008 | Multa deve registrar prazo, responsável, valor, status e possibilidade de recurso. | Alta |
| RN-FROTA-009 | Seguro deve gerar alerta de vencimento. | Média |
| RN-FROTA-010 | Quilometragem deve compor custo/km e custo por OS quando possível. | Média |
| RN-FROTA-011 | Evento de frota pode impactar disponibilidade da viatura. | Alta |

## 8. Financeiro operacional

| Código | Regra | Prioridade |
|---|---|---|
| RN-FIN-001 | Orçamento deve estar vinculado a cliente e/ou OS. | Alta |
| RN-FIN-002 | Orçamento aprovado pode ser convertido em valor previsto da OS. | Média |
| RN-FIN-003 | Faturamento deve poder agrupar OS por cliente, contrato, período ou regra. | Alta |
| RN-FIN-004 | Pré-faturamento deve validar pendências antes da emissão/fechamento. | Alta |
| RN-FIN-005 | Movimento de caixa deve registrar origem, conta, forma de pagamento, usuário, data e valor. | Alta |
| RN-FIN-006 | Conta/título deve possuir vencimento, valor, status e categoria. | Alta |
| RN-FIN-007 | Título incongruente deve ser classificado por tipo de divergência. | Alta |
| RN-FIN-008 | Fechamento financeiro deve possuir checklist de pendências. | Alta |
| RN-FIN-009 | Reabertura de fechamento deve exigir permissão e justificativa. | Alta |
| RN-FIN-010 | Receita e custo devem permitir cálculo de margem por OS. | Alta |
| RN-FIN-011 | Repasse/remuneração deve ser calculado por regra configurável. | Média |
| RN-FIN-012 | Alteração de valor financeiro deve gerar log com valor anterior e novo. | Alta |
| RN-FIN-013 | Cheques devem ser tratados como meio de pagamento com status próprio quando habilitados. | Baixa |
| RN-FIN-014 | Extrato deve consolidar movimentos por conta, filial, período, categoria e origem. | Média |

## 9. Relatórios e indicadores

| Código | Regra | Prioridade |
|---|---|---|
| RN-REL-001 | Dashboard deve ser filtrável por tenant, filial e período. | Alta |
| RN-REL-002 | Indicadores devem respeitar permissões do usuário. | Alta |
| RN-REL-003 | Relatórios financeiros só devem ser exibidos a papéis autorizados. | Alta |
| RN-REL-004 | Exportações devem ser auditadas quando contiverem dados sensíveis. | Média |
| RN-REL-005 | Indicadores operacionais devem permitir navegação para registros de origem. | Média |
| RN-REL-006 | Alertas devem ser acionáveis, permitindo abrir OS, conta, viatura ou pendência correspondente. | Alta |
| RN-REL-007 | O sistema deve medir tempo de despacho, tempo de execução, atraso, custo e margem. | Alta |
| RN-REL-008 | Relatórios devem diferenciar dados observados, estimados e calculados. | Média |

## 10. Auditoria e logs

| Código | Regra | Prioridade |
|---|---|---|
| RN-AUD-001 | Toda ação crítica deve gerar evento de auditoria. | Alta |
| RN-AUD-002 | Evento de auditoria deve registrar usuário, tenant, entidade, ação, data/hora, origem e valores relevantes. | Alta |
| RN-AUD-003 | Eventos de OS devem aparecer em timeline de negócio. | Alta |
| RN-AUD-004 | Logs técnicos e logs de negócio devem ser distinguíveis. | Média |
| RN-AUD-005 | Exportação, cancelamento, reabertura, fechamento e alteração financeira devem ser auditados. | Alta |
| RN-AUD-006 | Auditoria não deve ser alterável por usuários comuns. | Alta |
| RN-AUD-007 | Suporte interno deve gerar log separado quando acessar tenant. | Alta |

## 11. Integrações

| Código | Regra | Prioridade |
|---|---|---|
| RN-INT-001 | Integração deve possuir status ativo/inativo. | Alta |
| RN-INT-002 | Credenciais de integração devem ser armazenadas de forma segura. | Alta |
| RN-INT-003 | Falha de integração deve gerar log e permitir reprocessamento quando possível. | Média |
| RN-INT-004 | Webhooks devem possuir autenticação/assinatura. | Média |
| RN-INT-005 | Eventos enviados para terceiros devem respeitar tenant e permissões. | Alta |
| RN-INT-006 | Integrações críticas devem possuir monitoramento de saúde. | Média |

## 12. Regras de superioridade

Estas regras garantem que o ERP Techsolutions não seja apenas equivalente ao benchmark.

| Código | Regra |
|---|---|
| RS-001 | Todo fluxo crítico deve ser medido por tempo, cliques e taxa de erro. |
| RS-002 | Toda tela densa deve ter alternativa de busca, filtro ou ação rápida. |
| RS-003 | Todo relatório relevante deve indicar ação ou origem do problema. |
| RS-004 | Toda configuração crítica deve possuir explicação e validação. |
| RS-005 | Todo módulo operacional deve contribuir para custo, margem, SLA ou rastreabilidade. |
| RS-006 | Toda funcionalidade mobile crítica deve considerar internet instável. |
| RS-007 | Toda recomendação automática deve explicar a razão da sugestão. |
