# Gestao de Despesas

## Decisao central

Gestao de Despesas e um modulo oficial do ERP Techsolutions. A chave tecnica do modulo e `expense_management`, Gestor de Despezas (GD) permanece apenas como alias historico e Prestação de Contas e o documento/relatorio gerado pelo fluxo.

O modulo deve operar dentro do ERP SaaS multi-tenant, com backend autorizando todas as acoes por `tenant_id`, papel, permissao e modulo habilitado. O app Flutter deve ser um app tudo-em-um: o binario pode conter varios modulos, mas o login/bootstrap habilita somente o que o tenant, o plano, o papel e as permissoes permitem.

## Fronteiras desta fase

Dentro do escopo:

- planejamento profissional de Gestao de Despesas/Prestação de Contas;
- contratos mobile/backend e eventos assincronos;
- fundacao Flutter modular e local-first;
- modelos e servicos testaveis para calculo, politica, permissao, modulo e sync;
- preparacao para integracao futura com financeiro, auditoria, field operations e comissoes.

Fora do escopo desta fase:

- calculo real de comissoes;
- pagamento real;
- fiscal, tributario e contabilidade;
- cartao corporativo;
- conciliacao bancaria automatica;
- backend completo de Gestao de Despesas;
- UI final refinada;
- Figma final;
- publicacao Android/iOS;
- OCR/PDF final em producao;
- refactors nao relacionados.

Comissoes ficam em stand-by. Gestao de Despesas nao deve acoplar diretamente ao motor de comissoes; deve apenas publicar eventos futuros consumiveis.

## Modelo de dominio

- `ExpenseReport`: agrupador da Prestação de Contas, com funcionario, tenant, periodo, origem, obra/projeto, OS ou centro de custo.
- `ExpenseItem`: linha de despesa com categoria, data, cidade, estabelecimento, valor, moeda, observacao, recibos e flags de politica.
- `Receipt`: evidencia anexada com imagem/PDF, hash, OCR extraido, confianca, origem local/servidor e status de upload.
- `ExpenseAdvance`: adiantamento concedido ao funcionario e abatido contra o total da Prestação de Contas.
- `ExpensePolicy`: regra tenant-scoped com limites, categorias permitidas, exigencia de recibo, aprovacao e excecoes.
- `PolicyViolation`: alerta ou bloqueio gerado pela avaliacao de politica.
- `ApprovalStep`: etapa manager/finance com decisao, ator, motivo e trilha imutavel.
- `AuditEvent`: evento de criacao, edicao, OCR, submissao, aprovacao, rejeicao, pagamento e sincronizacao.

## Status da Prestação de Contas

- `draft`: relatorio local ou servidor ainda editavel.
- `sync_pending`: existe alteracao local ainda nao enviada.
- `ready_to_submit`: campos minimos e comprovantes exigidos foram preenchidos.
- `submitted`: relatorio enviado para aprovacao.
- `under_review`: em analise operacional ou financeira.
- `returned`: devolvido para correcao com motivo obrigatorio.
- `approved_manager`: aprovacao operacional concluida.
- `approved_finance`: validacao financeira concluida.
- `rejected`: rejeitado com justificativa.
- `scheduled_for_payment`: reembolso autorizado e programado.
- `paid`: reembolso pago ou devolucao liquidada.
- `cancelled`: cancelado conforme regra de permissao.

## Cenarios operacionais

### CEN-001 - Tecnico em campo cria Prestação de Contas offline

O tecnico esta sem internet, cria uma Prestação de Contas, adiciona item e recibo, roda OCR local, revisa os campos sugeridos, corrige o que for necessario e salva localmente. A acao entra como pendente de sync e nenhum dado e perdido ao fechar o app.

### CEN-002 - Tecnico volta online e sincroniza

O Sync Engine envia um lote com `client_action_id`. O backend valida tenant, permissao, modulo habilitado e idempotencia. O app recebe `server_id`, atualiza o status local para sincronizado e preserva a trilha local.

### CEN-003 - Manager aprova operacionalmente

O manager recebe pendencias, analisa a Prestação de Contas e aprova, rejeita ou devolve. Devolucao e rejeicao exigem motivo obrigatorio e geram auditoria.

### CEN-004 - Finance valida e agenda pagamento

Finance revisa recibos, valida adiantamento, calcula A Receber, A Devolver ou Sem diferenca e agenda pagamento ou devolucao. O pagamento real permanece futuro.

### CEN-005 - Recibo duplicado

O mesmo hash ou dados similares geram candidato de duplicidade. O sistema sinaliza a suspeita, nao bloqueia silenciosamente e exige revisao.

### CEN-006 - Multiplos tenants

Usuario troca de tenant, dados locais nao se misturam e modulos/permissoes mudam conforme bootstrap do tenant ativo.

### CEN-007 - Conflito local/remoto

Uma Prestação de Contas editado localmente e devolvido remotamente entra em conflito explicito. O app mostra comparacao e decisao do usuario, sem sobrescrever ou descartar alteracao silenciosamente.

### CEN-008 - Policy alterada no meio da Prestação de Contas

Prestação de Contas criada com `policy_version` A continua auditavel por essa versao. Novas Prestações de Contas usam `policy_version` B apos alteracao pelo tenant admin.

### CEN-009 - Sem permissao

Usuario sem `expense_report:submit` nao ve a acao no app. O backend continua bloqueando a submissao se a chamada for feita diretamente.

### CEN-010 - Diagnostico de suporte

Support/admin visualiza fila, ultimo sync, versao, tenant e logs sanitizados. Recibos sensiveis e tokens nunca aparecem no diagnostico.

## RF - Requisitos funcionais

- RF-001: modulo habilitavel por tenant, plano, papel e permissao.
- RF-002: bootstrap mobile retorna tenants, modulos, permissoes, flags, politicas e catalogos.
- RF-003: login estabelece sessao e tenant context.
- RF-004: criar Prestação de Contas offline.
- RF-005: editar Prestação de Contas em `draft` ou `returned`.
- RF-006: adicionar item de despesa.
- RF-007: anexar recibo.
- RF-008: executar OCR local quando disponivel.
- RF-009: exigir revisao humana dos campos de OCR.
- RF-010: calcular totais.
- RF-011: registrar adiantamento.
- RF-012: calcular A Receber, A Devolver ou Sem diferenca.
- RF-013: aplicar policy engine local.
- RF-014: submeter Prestação de Contas.
- RF-015: aprovar operacionalmente como manager.
- RF-016: validar financeiramente.
- RF-017: devolver ou rejeitar com motivo obrigatorio.
- RF-018: gerar PDF local com marca d'agua quando nao sincronizado.
- RF-019: preparar PDF oficial futuro no backend.
- RF-020: manter sync queue idempotente.
- RF-021: tratar conflito explicitamente.
- RF-022: registrar auditoria.
- RF-023: preparar notificacoes futuras.
- RF-024: expor diagnostico local sanitizado.
- RF-025: operar dentro do app Flutter modular tudo-em-um.

## RNF - Requisitos nao funcionais

- RNF-001: offline real para cadastro, anexos, OCR planejado e fila de sync.
- RNF-002: idempotencia por `client_action_id`.
- RNF-003: isolamento local e remoto por `tenant_id`.
- RNF-004: tokens somente em secure storage.
- RNF-005: recibos com criptografia/retenção quando aplicavel e sem logs sensiveis.
- RNF-006: LGPD por minimizacao de dados e logs sanitizados.
- RNF-007: performance local em listas e home com historico grande.
- RNF-008: resiliencia de sync, upload e OCR.
- RNF-009: auditabilidade de decisoes e status.
- RNF-010: acessibilidade em campo.
- RNF-011: Android primeiro, iOS preparado.
- RNF-012: testabilidade de policy, sync, calculos, permissoes e modulos.
- RNF-013: versionamento de politicas por `policy_version`.
- RNF-014: integridade de PDF, recibos e totais.
- RNF-015: logs sanitizados.

## RBAC inicial

- `expense_report:create`: cria Prestação de Contas própria.
- `expense_report:read`: le Prestações de Contas permitidas.
- `expense_report:read_all`: le Prestações de Contas do tenant conforme papel.
- `expense_report:update`: edita Prestação de Contas permitida.
- `expense_report:submit`: submete Prestação de Contas.
- `expense_report:approve_operational`: aprova como manager.
- `expense_report:approve_finance`: valida como finance.
- `expense_report:return`: devolve para correcao.
- `expense_report:reject`: rejeita com motivo.
- `expense_report:pay`: agenda ou marca pagamento futuro.
- `receipt:attach`: anexa recibo.
- `receipt:read_metadata`: le metadados de recibo.
- `ocr:run_local`: habilita OCR local.
- `expense_policy:manage`: gerencia categorias, limites e regras.
- `sync_diagnostics:read`: le diagnostico local/servidor sanitizado.

## Plano de testes

- Unit tests: calculos, policy engine, permission resolver, module resolver e sync action factory.
- Widget tests: home modular, permissoes, lista/detalhe Prestação de Contas e banners de politica.
- Repository tests: isolamento por tenant e persistencia local futura.
- Sync tests: fila, replay idempotente, retry, conflito e sucesso.
- Offline tests: criar Prestação de Contas, anexar recibo e fechar/reabrir app sem perda.
- Permission tests: acao escondida no app e bloqueada no backend.
- Tenant isolation tests: nenhum dado local ou remoto mistura tenants.
- Contract tests: payloads de bootstrap, sync e workflow.
- Golden tests futuros: componentes principais do modulo.
- E2E/mobile integration futuro: tecnico offline, sync, manager aprova e finance valida.

## Sequencia de implementacao

1. Documentar decisao, cenarios, RF/RNF, contratos, eventos e arquitetura mobile.
2. Criar fundacao Flutter em `mobile/flutter_app`.
3. Implementar app shell, module resolver, permission resolver e mocks locais.
4. Implementar modelos Dart e servicos testaveis.
5. Implementar UI funcional minima para Prestação de Contas.
6. Implementar sync local-first minimo com fila e idempotencia.
7. Integrar backend real em PRs posteriores.
8. Adicionar OCR, PDF, camera e storage seguro em blocos separados.

## Backend Foundation - GD-002

GD-002 transforma a fundacao documental/mobile em backend inicial real para `expense_management`, mantendo o modulo tenant-scoped, RBAC-driven, auditavel e preparado para sync mobile idempotente.

### Entidades iniciais

- `expense_reports`: Prestação de Contas principal com funcionario, periodo, origem, OS/projeto/centro de custo opcionais, cidade, valores, moeda, `policy_version`, criador e timestamps de submissao.
- `expense_items`: itens da Prestação de Contas com categoria, data, cidade, fornecedor, valor, moeda, quilometragem opcional, notas e flags de politica.
- `expense_receipts`: metadados de recibos, hash local, mime type, OCR revisado/futuro, confianca e status de upload.
- `expense_advances`: adiantamentos vinculaveis a funcionario/Prestação de Contas em fase futura; nesta fundacao o valor agregado fica em `expense_reports.advance_amount`.
- `expense_policies`: politicas versionadas com regras de categoria, limites, aprovacao e recibos.
- `expense_approval_steps`: trilha de decisoes manager/finance.
- `expense_events`: eventos auditaveis tenant-scoped com hash de payload sanitizado.
- `mobile_action_receipts`: recibos de processamento idempotente por `tenant_id` + `client_action_id`.

### Status oficiais

- `draft`
- `sync_pending`
- `ready_to_submit`
- `submitted`
- `under_review`
- `returned`
- `approved_manager`
- `approved_finance`
- `rejected`
- `scheduled_for_payment`
- `paid`
- `cancelled`

### Eventos iniciais

- `expense_report.created`
- `expense_item.created`
- `expense_item.receipt_attached`
- `expense_report.submitted`
- `expense_report.returned`
- `expense_report.approved_manager`
- `expense_report.approved_finance`
- `expense_report.rejected`
- `expense_report.payment_scheduled`
- `expense_report.paid`
- `expense_report.synced_from_mobile`

### Permissoes minimas

- `expense_report:read`
- `expense_report:read_own`
- `expense_report:create`
- `expense_report:update`
- `expense_report:submit`
- `expense_report:approve_manager`
- `expense_report:approve_finance`
- `expense_report:return`
- `expense_report:reject`
- `expense_report:pay`
- `expense_policy:read`
- `expense_policy:manage`
- `expense_receipt:attach`
- `expense_sync:write`
- `expense_audit:read`

### Endpoints MVP

- `GET /api/v1/expense-policies`
- `GET /api/v1/expense-categories`
- `GET /api/v1/expense-reports`
- `POST /api/v1/expense-reports`
- `GET /api/v1/expense-reports/:reportId`
- `PATCH /api/v1/expense-reports/:reportId`
- `POST /api/v1/expense-reports/:reportId/items`
- `POST /api/v1/expense-reports/:reportId/submit`
- `POST /api/v1/mobile/sync/expense-actions`

### Fora de escopo backend desta fase

- OCR real;
- upload real de arquivos;
- PDF oficial;
- pagamento real;
- fiscal/contabil;
- conciliacao bancaria/cartao;
- UI web;
- approval completo avancado;
- integracao direta com comissoes.
