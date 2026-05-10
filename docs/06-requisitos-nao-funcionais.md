# 06 — Requisitos Não Funcionais: ERP Techsolutions

## 1. Visão geral

Os requisitos não funcionais definem a qualidade mínima necessária para que o ERP Techsolutions seja viável como SaaS B2B operacional. Como o produto lida com campo, financeiro, estoque, frota e dados sensíveis, estes requisitos devem ser considerados desde o MVP.

## 2. Arquitetura e escalabilidade

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-ARQ-001 | O sistema deve ser multi-tenant desde o MVP. | Alta | MVP |
| RNF-ARQ-002 | O isolamento lógico por tenant deve ser aplicado em todas as consultas e comandos. | Alta | MVP |
| RNF-ARQ-003 | A arquitetura deve permitir módulos habilitados/desabilitados por plano. | Alta | MVP |
| RNF-ARQ-004 | O backend deve ser modular, com separação clara de domínios. | Alta | MVP |
| RNF-ARQ-005 | O sistema deve permitir evolução para filas/eventos sem reescrita completa. | Média | Scale |
| RNF-ARQ-006 | O sistema deve permitir isolamento premium futuro por schema ou banco dedicado. | Média | Enterprise |
| RNF-ARQ-007 | O sistema deve suportar feature flags para ativação controlada de recursos. | Média | Scale |

## 3. Stack técnica recomendada

| Camada | Recomendação inicial |
|---|---|
| Frontend web | React |
| Mobile | Flutter |
| Backend | Node.js com modular monolith |
| Banco transacional | PostgreSQL |
| Cache / rate limit / coordenação leve | Redis |
| Mensageria | Introdução incremental conforme necessidade |
| Observabilidade | Logs estruturados, métricas e tracing |
| Deploy | Pipeline CI/CD com ambientes separados |

## 4. Performance

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-PERF-001 | Telas críticas devem carregar em tempo aceitável para operação diária. | Alta | MVP |
| RNF-PERF-002 | Busca global deve responder rapidamente em dados recentes e indexados. | Alta | MVP/Scale |
| RNF-PERF-003 | Listagens devem usar paginação, filtros e ordenação no backend. | Alta | MVP |
| RNF-PERF-004 | Dashboard deve evitar consultas pesadas em tempo real quando houver agregações possíveis. | Média | Scale |
| RNF-PERF-005 | O app mobile deve permanecer utilizável com conexão instável. | Alta | MVP |
| RNF-PERF-006 | Operações críticas devem ter feedback visual de carregamento, sucesso ou erro. | Alta | MVP |

## 5. Disponibilidade e continuidade

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-DISP-001 | O sistema deve ter backup automático do banco de dados. | Alta | MVP |
| RNF-DISP-002 | Deve existir procedimento de restauração documentado. | Alta | MVP |
| RNF-DISP-003 | O app mobile deve permitir execução offline das tarefas críticas. | Alta | MVP |
| RNF-DISP-004 | O sistema deve registrar pendências de sincronização para evitar perda de dados. | Alta | MVP |
| RNF-DISP-005 | Serviços críticos devem possuir monitoramento de disponibilidade. | Média | Scale |
| RNF-DISP-006 | O produto deve evoluir para RPO/RTO definidos por plano enterprise. | Média | Enterprise |

## 6. Segurança

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-SEG-001 | Toda comunicação deve usar HTTPS/TLS. | Alta | MVP |
| RNF-SEG-002 | Senhas devem ser armazenadas com hash seguro. | Alta | MVP |
| RNF-SEG-003 | Tokens/sessões devem possuir expiração e política de renovação. | Alta | MVP |
| RNF-SEG-004 | O sistema deve implementar RBAC. | Alta | MVP |
| RNF-SEG-005 | A autorização deve validar tenant, papel, filial e escopo. | Alta | MVP |
| RNF-SEG-006 | Credenciais de integrações devem ser protegidas como segredo. | Alta | Scale |
| RNF-SEG-007 | Ações críticas devem exigir confirmação e motivo quando aplicável. | Alta | MVP |
| RNF-SEG-008 | Exportações devem respeitar permissão e gerar log quando sensíveis. | Média | MVP/Scale |
| RNF-SEG-009 | O sistema deve preparar evolução para MFA. | Média | Scale |
| RNF-SEG-010 | O sistema deve preparar evolução para SSO/federação em tenants enterprise. | Média | Enterprise |

## 7. LGPD, privacidade e retenção

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-LGPD-001 | O sistema deve aplicar princípio de menor privilégio. | Alta | MVP |
| RNF-LGPD-002 | Dados pessoais devem ser acessíveis apenas por papéis autorizados. | Alta | MVP |
| RNF-LGPD-003 | Logs devem registrar acesso e alteração de dados sensíveis quando aplicável. | Média | Scale |
| RNF-LGPD-004 | Deve existir política de retenção de anexos, fotos e documentos. | Média | Scale |
| RNF-LGPD-005 | O sistema deve permitir anonimização/remoção controlada quando legalmente aplicável. | Baixa | Enterprise |

## 8. Auditoria e rastreabilidade

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-AUD-001 | Toda alteração crítica deve gerar log estruturado. | Alta | MVP |
| RNF-AUD-002 | Logs devem registrar usuário, entidade, ação, origem e data/hora. | Alta | MVP |
| RNF-AUD-003 | Timeline da OS deve exibir eventos de negócio compreensíveis. | Alta | MVP |
| RNF-AUD-004 | Logs técnicos devem ser separados de logs de negócio. | Média | Scale |
| RNF-AUD-005 | Logs de auditoria não devem ser editáveis por usuários comuns. | Alta | MVP |
| RNF-AUD-006 | Suporte interno deve operar com trilha de auditoria separada. | Média | Enterprise |

## 9. Observabilidade

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-OBS-001 | Backend deve gerar logs estruturados por request, tenant e usuário quando possível. | Alta | MVP |
| RNF-OBS-002 | Erros críticos devem ser rastreáveis por correlação. | Alta | MVP |
| RNF-OBS-003 | Jobs, integrações e sincronizações mobile devem ter logs consultáveis. | Média | Scale |
| RNF-OBS-004 | Métricas de performance e erro devem ser monitoradas. | Média | Scale |
| RNF-OBS-005 | Sistema deve registrar falhas de integração com possibilidade de diagnóstico. | Média | Scale |

## 10. Usabilidade e UX

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-UX-001 | Telas devem ser organizadas por papel e tarefa. | Alta | MVP |
| RNF-UX-002 | OS deve ser acessível por busca global. | Alta | MVP |
| RNF-UX-003 | Fluxos críticos devem reduzir cliques e navegação lateral. | Alta | MVP |
| RNF-UX-004 | Formulários longos devem ser progressivos ou agrupados por etapas. | Média | MVP |
| RNF-UX-005 | Mensagens de erro devem indicar causa e ação recomendada. | Alta | MVP |
| RNF-UX-006 | Dashboard deve priorizar ações pendentes e alertas. | Alta | MVP |
| RNF-UX-007 | Mobile deve ser simples, com foco em próxima ação. | Alta | MVP |
| RNF-UX-008 | O sistema deve permitir favoritos ou atalhos por usuário. | Média | Scale |

## 11. Mobile offline-first

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-MOB-001 | O app deve manter base local para tarefas atribuídas. | Alta | MVP |
| RNF-MOB-002 | O app deve exibir estado de sincronização. | Alta | MVP |
| RNF-MOB-003 | O app deve enfileirar alterações offline. | Alta | MVP |
| RNF-MOB-004 | O app deve tratar conflito de dados de forma segura. | Alta | MVP/Scale |
| RNF-MOB-005 | Fotos e anexos devem ser sincronizados com controle de falha/retry. | Alta | MVP/Scale |
| RNF-MOB-006 | O app deve registrar origem do dado: web, mobile online ou mobile offline. | Média | Scale |

## 12. Integrações

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-INT-001 | Integrações devem ser isoladas por tenant. | Alta | Scale |
| RNF-INT-002 | Credenciais devem ser criptografadas ou armazenadas em mecanismo seguro. | Alta | Scale |
| RNF-INT-003 | Integrações devem ter logs de envio, resposta, erro e retry. | Média | Scale |
| RNF-INT-004 | Webhooks devem possuir assinatura ou mecanismo de autenticação. | Média | Scale |
| RNF-INT-005 | Falhas não devem bloquear fluxo principal quando puderem ser processadas depois. | Média | Scale |

## 13. Manutenibilidade

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-MAN-001 | Código deve ser organizado por módulos de domínio. | Alta | MVP |
| RNF-MAN-002 | Regras de negócio críticas devem possuir testes automatizados. | Alta | MVP/Scale |
| RNF-MAN-003 | Migrações de banco devem ser versionadas. | Alta | MVP |
| RNF-MAN-004 | APIs devem seguir padrão consistente de erros e validações. | Alta | MVP |
| RNF-MAN-005 | Documentação de endpoints críticos deve ser mantida. | Média | Scale |
| RNF-MAN-006 | Feature flags devem reduzir risco de deploy de recursos novos. | Média | Scale |

## 14. Qualidade e testes

| Código | Requisito | Prioridade | Fase |
|---|---|---|---|
| RNF-TEST-001 | Fluxos críticos de OS devem ter testes automatizados. | Alta | MVP |
| RNF-TEST-002 | Autorização multi-tenant deve ter testes específicos. | Alta | MVP |
| RNF-TEST-003 | Cálculos financeiros devem ter testes unitários e de integração. | Alta | MVP/Scale |
| RNF-TEST-004 | Sincronização mobile deve ter testes de conflito e retry. | Média | Scale |
| RNF-TEST-005 | Regras de estoque devem ter testes de movimentação e saldo. | Alta | MVP/Scale |
| RNF-TEST-006 | Pipelines devem executar testes antes de deploy. | Média | MVP |

## 15. Critérios de aceitação não funcional para MVP

Para considerar o MVP tecnicamente aceitável:

- nenhum endpoint operacional deve vazar dados entre tenants;
- OS deve registrar timeline de eventos;
- ações críticas devem gerar log;
- app deve executar pelo menos atualização de status e evidências em condição offline controlada;
- financeiro básico deve vincular faturamento à OS;
- estoque consumido na OS deve gerar movimentação;
- permissões por papel devem bloquear ações indevidas;
- backup e restauração devem estar documentados;
- deploy deve ser reproduzível por pipeline;
- erros críticos devem ser rastreáveis em logs.
