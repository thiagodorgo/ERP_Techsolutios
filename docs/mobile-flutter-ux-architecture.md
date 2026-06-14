# Flutter Mobile UX Architecture

## Status da Proposta

Esta proposta pertence a fase B-076. Ela mapeia a experiencia mobile Flutter tela por tela e entrega prototipos HTML estaticos para validacao de UX. Nao aprova implementacao Flutter, nao substitui Figma, nao altera backend e nao muda contratos em producao.

## Fontes Lidas

- `PRODUCT_CONTEXT.md`
- `DESIGN_SYSTEM.md`
- `COMPONENT_LIBRARY.md`
- `RBAC_MATRIX.md`
- `APPROVAL_LIMITS.md`
- `docs/modules.md`
- `docs/expense-management.md`
- `docs/mobile-flutter-app.md`
- `docs/mobile-sync-contracts.md`
- `agent-orchestration/docs/status-geral.md`
- `agent-orchestration/codex/log-execucao.md`
- `mobile/flutter_app/**`
- `frontend/links_Figma.md`

## Referencia Figma Encontrada

O repositorio possui `frontend/links_Figma.md` com o arquivo base `Figma - ERP Techsolutions` e links diretos para telas mobile M01 a M12:

- M01 Mobile Login
- M02 Mobile Home
- M03 Mobile Lista de OS
- M04 Mobile Detalhe de OS
- M05 Mobile Formulario de OS
- M06 Mobile Aprovacoes
- M07 Mobile Notificacoes
- M08 Mobile Estoque
- M09 Mobile Mapa / Logistica
- M10 Checklist Coleta
- M11 Checklist Entrega
- M12 Checklist Evidencia

Esses links foram usados apenas como referencia documental existente. Nenhum arquivo Figma foi aberto, editado ou tratado como fonte visual final nesta fase.

## Mapa Atual do Flutter

### Estrutura Real

```txt
mobile/flutter_app/lib/
  main.dart
  app/
    app.dart
    router.dart
  core/
    bootstrap/bootstrap_session.dart
    diagnostics/diagnostics_screen.dart
    modules/module_resolver.dart
    network/api_contracts.dart
    permissions/permission_resolver.dart
    sync/
      sync_action_factory.dart
      sync_engine.dart
      sync_models.dart
      sync_queue_repository.dart
  features/
    expenses/
      domain/expense_models.dart
      services/expense_policy_evaluator.dart
      services/expense_totals_calculator.dart
      ui/expense_list_screen.dart
      ui/new_expense_report_screen.dart
  shared/ui/home_screen.dart
```

### Rotas Atuais

| Rota | Tela atual | Observacao |
| --- | --- | --- |
| `/` | `HomeScreen` | Usa `devBootstrapSession` e filtra modulos via `ModuleResolver` e `PermissionResolver`. |
| `/expenses` | `ExpenseListScreen` | Lista demonstrativa de RDV local, calculo de total e violacao de politica. |
| `/expenses/new` | `NewExpenseReportScreen` | Formulario minimo com valor, adiantamento e resumo. |
| `/diagnostics` | `DiagnosticsScreen` | Mostra fila de sync, tenant ativo e logs sanitizados. |

### Dependencias Relevantes

- `go_router`: navegacao declarativa.
- `flutter_riverpod`: estado planejado para bootstrap, sessao, modulos e dados locais.
- `dio`: HTTP planejado.
- `flutter_secure_storage`: tokens e segredos.
- `drift`, `sqlite3_flutter_libs`, `path_provider`: persistencia local planejada.
- `uuid`, `crypto`, `equatable`: idempotencia, hashes e modelos testaveis.

## Recomendacao de Arquitetura UX Flutter

### Navegacao

- Usar `ShellRoute` ou estrutura equivalente para app autenticado.
- Manter `GoRouter` como roteador principal.
- Separar rotas publicas: splash, login, tenant selection.
- Separar rotas autenticadas por modulo: home, field ops, work orders, checklists, expenses, inventory, approvals, finance, notifications, diagnostics.
- Usar bottom navigation com no maximo 5 destinos para perfis de campo:
  - Home
  - OS
  - Mapa
  - Evidencias
  - Sync
- Exibir modulos extras em menu secundario ou "Mais", condicionado por `enabled_modules` e permissoes.

### Tema e Tokens

- Criar `shared/theme/erp_mobile_theme.dart` com tokens derivados de `DESIGN_SYSTEM.md`.
- Preservar semantica de estados: success, warning, danger, info, pending, escalated, draft, scheduled, in_service, reconciled, audit, exception.
- Definir componentes de status reutilizaveis em vez de repetir cores em telas.
- Usar tipografia compacta e legivel para campo: titulos curtos, numeros tabulares em financeiro/despesas, labels claros em checklists.

### Widgets Reutilizaveis

- `TenantContextBar`: tenant ativo, papel e indicador de permissao/ambiente.
- `SyncStatusBanner`: online, offline, sync pendente, erro e conflito.
- `PermissionBlockedState`: sem permissao, com motivo e acao segura.
- `OperationalStatusChip`: OS, checklist, RDV, aprovacao, estoque e sync.
- `WorkOrderPriorityCard`: SLA, distancia, status, cliente e proxima acao.
- `ChecklistStepCard`: progresso, obrigatorios, divergencia e evidencia.
- `EvidenceCaptureBlock`: foto, recibo, hash, upload pendente e revisao.
- `ApprovalDecisionPanel`: aprovador, limite, impacto, aprovar/devolver/rejeitar.
- `AuditTimeline`: eventos com ator, horario, fonte e payload resumido seguro.
- `OfflineConflictPanel`: comparacao local/remoto e decisao explicita.

### Estado, Dados e Offline

- Usar `BootstrapSession` como fonte inicial de tenant, modulos, permissoes, flags, politicas e catalogos.
- Persistir dados tenant-scoped com `tenant_id` em todas as entidades locais.
- Guardar tokens somente em secure storage.
- Manter fila idempotente com `client_action_id` obrigatorio.
- Separar cache de leitura, fila de mutacao e tabela de conflitos.
- Nunca resolver conflito silenciosamente.
- Mostrar frescor dos dados: local, sincronizando, sincronizado, expirado, conflito.

### Claims e Permissoes

- Claims esperadas: `sub`, `tenant_id`, `tenant_role`, `tenant_roles`, `permissions`, `email`, `scope`.
- O app pode esconder ou bloquear acoes, mas a autorizacao final permanece no backend.
- Troca de tenant deve limpar contexto visual e recarregar bootstrap.
- Acao bloqueada deve explicar o motivo sem revelar informacao sensivel.

### Testes Recomendados

- Widget tests para tenant context, permission gates, sync banner e estados vazios.
- Golden tests futuros para telas principais depois de aprovar design.
- Tests de repositorio local para isolamento por tenant.
- Tests de sync para sucesso, retry, idempotencia, falha e conflito.
- Tests de navegacao para rotas permitidas e bloqueadas por modulo/permissao.

## Proposta Tela por Tela

| Tela | Papel alvo | Objetivo e momento real | Hierarquia visual | Componentes Flutter | Acoes | Reducao cognitiva e inteligencia contextual | Offline/sync | Permissoes/claims | Criterios UX | Notas Codex |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 01. Splash / bootstrap | todos | Abrir app, validar sessao, recuperar tenant ativo e bootstrap. | Marca, estado de carregamento, status de rede, erro recuperavel. | `Scaffold`, `FutureProvider`, `LinearProgressIndicator`, `SyncStatusBanner`. | Principal: continuar automatico. Secundaria: tentar novamente. | Explica apenas o estado necessario: carregando, offline com cache ou sessao expirada. | Pode abrir cache valido offline; bloqueia se nao houver sessao/cache seguro. | `sub`, `tenant_id`, bootstrap autenticado. | Nao deixa tela em branco; erro tem retry; tokens nao aparecem. | Implementar antes do login final; substituir `devBootstrapSession`. |
| 02. Login | todos | Entrar no app em inicio de turno ou apos sessao expirada. | Tenant/ambiente, campos, entrar, ajuda segura. | `Form`, `TextFormField`, `FilledButton`, `InputDecorator`. | Principal: entrar. Secundaria: limpar, suporte. | Campos minimos, mensagens curtas, keyboard correto. | Login exige online, mas pode explicar modo offline indisponivel sem sessao. | Cognito/local auth; sem `tenant_id` confiavel ainda. | Valida erro sem expor detalhes; foco vai ao primeiro campo invalido. | Futuro: Cognito real; atual prototipo mostra tenant context. |
| 03. Selecao de tenant | usuario multi-tenant | Escolher tenant apos login ou troca de cliente. | Tenant atual, lista de tenants, modulos habilitados resumidos. | `ListView`, `RadioListTile`, `TenantContextBar`, `StatusChip`. | Principal: ativar tenant. Secundaria: sair. | Mostra impacto da troca: modulos e permissoes mudam. | Troca exige bootstrap online; cache por tenant pode ser exibido como somente leitura. | `tenant_roles`, `permissions`, tenant list. | Nunca mistura dados locais; confirma tenant ativo. | Criar cache separado por tenant. |
| 04. Home operacional | field_technician, operator | Iniciar turno e ver proximas prioridades. | Tenant, alerta sync, OS prioritarias, atalhos permitidos, bottom nav. | `CustomScrollView`, `Card`, `NavigationBar`, `Badge`. | Principal: abrir OS prioritaria. Secundarias: mapa, checklist, sync. | Mostra "proxima melhor acao" por SLA, distancia e bloqueios. | Lista usa cache; novas acoes entram na fila. | `field_location:send`, `work_orders:read`, modulos habilitados. | Home cabe em uma tela; nao mostra modulo sem permissao. | Evoluir `HomeScreen`; evitar cards genericos por modulo. |
| 05. Dashboard mobile | manager, field_technician, finance | Ver resumo rapido de operacao ou carteira propria. | KPIs compactos, pendencias, excecoes, tendencia curta. | `GridView`, `KpiCard`, `StatusChip`, `RefreshIndicator`. | Principal: abrir pendencia. Secundaria: atualizar. | KPIs variam por papel; tecnico ve proprio turno, manager ve equipe. | Dados podem ficar stale com selo de horario. | `dashboard:read`, papeis. | Sem graficos pesados; cada KPI tem destino claro. | Compartilhar semantica com web, nao densidade web. |
| 06. Lista de OS | field_technician, operator, manager | Escolher OS priorizada para executar ou coordenar. | Filtros, fila ordenada, SLA, distancia, status, bloqueios. | `SearchBar`, `FilterChip`, `WorkOrderPriorityCard`, `RefreshIndicator`. | Principal: abrir detalhe. Secundarias: ligar, rota, filtrar. | Ordena por urgencia; chips reduzem leitura extensa. | Cache local com frescor; status mudado offline fica pendente. | `work_orders:read`, escopo por usuario. | Prioridade visivel; empty state orienta proximo passo. | Futura feature `features/work_orders`. |
| 07. Detalhe da OS | field_technician, manager | Confirmar escopo, cliente, local, SLA, checklist e materiais. | Header da OS, cliente/local, status, checklist, evidencias, timeline. | `SliverAppBar`, `ListTile`, `Timeline`, `ActionBar`. | Principal: iniciar/continuar execucao. Secundarias: rota, contato, evidencias. | Agrupa decisao por momento: antes, durante, fechamento. | Alteracoes offline marcadas por secao. | `work_orders:update`, `field_dispatch:*` conforme acao. | Nao oculta bloqueio; mostra por que nao pode concluir. | Usar timeline comum com audit. |
| 08. Execucao em campo | field_technician | Executar OS no local com pouco tempo e possivel rede ruim. | Passo atual, obrigatorios, status, evidencia, proxima acao fixa. | `Stepper`, `ChecklistStepCard`, `BottomAppBar`, `SyncStatusBanner`. | Principal: salvar passo. Secundarias: anexar, pausar, reportar problema. | Exibe uma decisao por vez; alerta so quando bloqueante. | Primeiro local; sincroniza em lote. | `checklist_runs:create/update`, `work_orders:status`. | Pode fechar e reabrir sem perda; progresso claro. | Separar fluxo operacional do formulario de OS. |
| 09. Checklist dinamico | field_technician, operator | Preencher M10/M11/M12 ou checklist custom publicado. | Progresso, campos obrigatorios, divergencias, anexos. | Renderizador por schema, `FormField`, `CheckboxListTile`, `EvidenceCaptureBlock`. | Principal: salvar/concluir. Secundarias: pular permitido, observacao. | Renderiza schema do backend; evita hardcode de M10/M11/M12. | Respostas ficam locais com `client_action_id`. | `checklist_runs:*`, `tenant_checklist` habilitado. | Obrigatorios claros; divergencia exige observacao. | Seguir regra RBAC: M10/M11/M12 via API, nao campos fixos. |
| 10. Captura de evidencia | field_technician, auditor | Registrar foto, recibo, assinatura ou prova tecnica. | Captura, preview, metadados, hash/upload, vinculo ao item. | `ImagePicker` futuro, `AttachmentBlock`, `ProgressIndicator`, `AuditBadge`. | Principal: capturar/anexar. Secundarias: revisar, remover antes de envio. | Mostra qualidade minima e status de upload sem termos tecnicos demais. | Arquivo local ate upload; metadados entram na fila; sem path privado em log. | `receipt:attach`, `checklist_runs:update`, permissao de evidencia. | Nao perde arquivo offline; duplicidade vira revisao, nao silencio. | Camera/upload fora desta fase; prototipo apenas proposta. |
| 11. Mapa / rota / localizacao | field_technician, manager | Ver rota, posicao propria, destino e despacho. | Mapa, OS ativa, ETA/distancia, botao rota, status GPS. | `Stack`, map provider futuro, `PermissionPrompt`, `BottomSheet`. | Principal: iniciar rota/enviar posicao. Secundarias: abrir OS, reportar atraso. | Prioriza ETA e proxima parada; fallback sem mapa real. | Envia pontos quando online; fila ou descarte controlado conforme politica. | `field_location:send/read/history`, `field_dispatch:read`. | Sem permissao/GPS tem estado claro; coordenadas nao aparecem em logs. | Google Maps real fora do prototipo; usar provider futuro plugavel. |
| 12. Estoque do tecnico | field_technician, inventory | Conferir pecas no veiculo e consumir material na OS. | Saldo critico, itens no veiculo, consumo por OS, requisicao. | `ListView`, `InventoryMovementCard`, `Stepper`, `StatusChip`. | Principal: registrar consumo. Secundaria: solicitar material. | Mostra apenas estoque relevante ao tecnico e OS ativa. | Consumo offline fica pendente e pode exigir aprovacao depois. | `inventory:read/use`, `work_orders:update`. | Alerta saldo insuficiente; nao permite consumo invisivel. | Integrar futuro com inventory module. |
| 13. Solicitacao de material | field_technician, inventory, manager | Pedir peca/material quando falta no atendimento. | Item, quantidade, motivo, impacto SLA, aprovacao. | `Form`, `Autocomplete`, `ApprovalDecisionPanel`, `StatusChip`. | Principal: solicitar. Secundaria: salvar rascunho. | Sugere itens frequentes por tipo de OS. | Rascunho offline permitido; envio depende sync. | `inventory:request`, `workflow:request`. | Motivo obrigatorio quando urgente; status de aprovacao visivel. | Permissao ainda planejada; documentar antes de implementar. |
| 14. Aprovacoes | manager, finance, inventory | Decidir pendencias operacionais, estoque ou despesas. | Fila, impacto, limite, requester, SLA, decisao. | `ApprovalDecisionCard`, `SegmentedButton`, `Dialog`. | Principal: aprovar. Secundarias: devolver, rejeitar, pedir info. | Mostra impacto e proximo dono; motivo obrigatorio em devolucao/rejeicao. | Normalmente online; offline apenas leitura/cache ou rascunho de decisao se politica permitir. | `workflow:*`, `expense_report:approve_*`, role limits. | Decisao sempre auditavel; bloqueio por limite claro. | Nao misturar aprovacao finance sensivel com tecnico sem papel. |
| 15. Financeiro basico | finance, manager | Consultar resumo financeiro operacional mobile. | Saldo/pendencias, RDVs, glosas, pagamentos futuros. | `KpiCard`, `ListTile`, `StatusChip`, `FilterChip`. | Principal: abrir pendencia. Secundaria: filtrar. | Reduz a financeiro de campo; nao replica web completo. | Leitura cacheada; decisao finance exige online. | `finance:read`, `expense_report:approve_finance`. | Dados sensiveis nao aparecem para tecnico sem permissao. | Pagamento real fora de escopo. |
| 16. Gestao de Despesas mobile | field_technician, manager, finance | Criar, revisar, submeter, aprovar ou validar RDV. | Lista por status, total, violacoes, recibos, timeline. | `ExpenseReportCard`, `EvidenceCaptureBlock`, `PolicyBanner`, `ApprovalPanel`. | Principal: novo/submeter/aprovar conforme papel. Secundarias: anexar, devolver. | Explica violacao de politica e diferenca de adiantamento. | RDV draft/returned offline; submit entra em fila e backend revalida. | `expense_report:*`, `receipt:attach`, `ocr:run_local`. | Recibo obrigatorio visivel; conflito local/remoto explicito. | Evoluir telas existentes sem implementar nesta fase. |
| 17. Notificacoes | todos | Receber alertas de OS, aprovacao, sync, devolucao e politica. | Lista por prioridade, origem, tempo, acao. | `ListView`, `Badge`, `Dismissible`, `StatusChip`. | Principal: abrir item. Secundaria: marcar lida/arquivar. | Agrupa por origem e severidade; evita ruído operacional. | Cache local; marcar lida sincroniza quando online. | `notifications:read/update`. | Notificacao sempre leva a destino permitido. | Push externo fora do escopo. |
| 18. Sync / offline / conflitos | todos, support | Ver fila, erros, conflitos e diagnostico seguro. | Estado geral, fila, conflito, retry, logs sanitizados. | `DiagnosticsScreen`, `ConflictPanel`, `ExpansionTile`, `RetryButton`. | Principal: sincronizar/tentar novamente. Secundaria: exportar diagnostico sanitizado futuro. | Traduz erros em acoes: aguardar, corrigir, resolver conflito. | Tela central do modo local-first. | `sync_diagnostics:read`, `expense_sync:write`. | Conflito exige decisao; logs sem token/recibo bruto. | Expandir `DiagnosticsScreen`. |
| 19. Perfil / tenant / permissoes | todos | Revisar usuario, tenant ativo, papel, modulos e sair. | Perfil, tenant, papeis, permissoes resumidas, logout. | `TenantSwitcher`, `RoleBadge`, `PermissionSummary`, `ListTile`. | Principal: trocar tenant/sair. Secundaria: ver permissoes. | Mostra por que telas aparecem ou nao aparecem. | Troca de tenant exige bootstrap; perfil cacheado somente leitura. | `tenant_id`, `tenant_role`, `tenant_roles`, `permissions`. | Permissao bloqueada deve ser rastreavel para suporte. | Importante para multi-tenant. |
| 20. Auditoria / timeline | auditor, manager, support | Ver trilha de OS, checklist, RDV ou aprovacao. | Linha do tempo, ator, origem, status, evento seguro. | `Timeline`, `AuditRow`, `FilterChip`, `ReadOnlyBanner`. | Principal: filtrar/abrir evento. Secundaria: copiar id futuro. | Eventos resumidos sem payload sensivel. | Cache leitura; auditoria real vem do backend. | `audit:read`, `expense_audit:read`, auditor/support scoping. | Sem acao mutavel; leitura clara e rastreavel. | Usar como secao em detalhe e tela dedicada. |
| 21. Estados erro/vazio/bloqueado | todos | Dar resposta clara quando nao ha dados, internet, permissao ou ha conflito. | Ilustracao simples ou icone, motivo, proxima acao. | `EmptyState`, `BlockedState`, `NoInternetState`, `SyncConflictState`. | Principal: tentar novamente/voltar/resolver. Secundaria: suporte. | Mensagem curta, sem culpar usuario; acao realista. | Distingue offline, cache vazio, falha de sync e conflito. | Depende do contexto; nunca vaza modulo oculto. | Cada tela principal deve ter esses estados. | Criar pacote compartilhado antes de multiplicar telas. |

## Prototipos HTML Entregues

Os prototipos estaticos ficam em:

```txt
docs/prototypes/flutter-mobile/index.html
docs/prototypes/flutter-mobile/styles.css
```

Telas incluidas no prototipo:

1. Login + tenant context
2. Home operacional field_technician
3. Lista priorizada de OS
4. Detalhe de OS
5. Execucao/checklist
6. Captura de evidencia
7. Mapa/rota/localizacao
8. Sync/offline/conflito
9. Aprovacoes manager
10. Gestao de Despesas mobile
11. Estoque do tecnico
12. Perfil/permissoes

## Gaps e Riscos

- `devBootstrapSession` ainda e mock; UX final depende de bootstrap real.
- Nao existe feature Flutter real para work orders, field ops, inventory, approvals, notifications ou profile.
- Offline com Drift esta planejado, mas ainda nao implementado.
- Camera, upload real, OCR, PDF e mapa real estao fora desta fase.
- Permissoes para estoque/solicitacao de material precisam de refinamento antes de implementar.
- Figma existente tem referencias mobile, mas esta fase nao valida pixel-perfect nem atualiza Figma.
- Conflitos precisam de contrato visual e armazenamento local proprio para nao virar erro generico.

## Proximos Blocos Recomendados

1. B-077: aprovar ou ajustar arquitetura UX e prototipos HTML.
2. B-078: criar design tokens Flutter e componentes compartilhados sem telas finais.
3. B-079: substituir `devBootstrapSession` por bootstrap local/mock estruturado com repository boundary.
4. B-080: implementar app shell autenticado, tenant switcher e permission gates.
5. B-081: implementar work orders mobile local-first em bloco separado.
6. B-082: implementar checklist renderer mobile por schema publicado.
7. B-083: implementar evidence capture real com upload/queue em bloco proprio.
8. B-084: evoluir Gestao de Despesas mobile com detalhe, item, recibo e submit.

## Fora de Escopo Confirmado

- Implementar telas Flutter finais.
- Alterar backend, migrations, APIs ou contratos.
- Implementar mapa real, roteirizacao, Field Ops realtime ou provider Google Maps.
- Implementar OCR, PDF, upload real, pagamento, fiscal, contabil ou comissoes.
- Criar ou editar Figma automaticamente.
- Refactors nao relacionados.
- Alterar `experiments/`.
