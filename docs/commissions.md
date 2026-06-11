# Motor de Comissoes

## Visao Geral

O Motor de Comissoes e uma capacidade transversal do ERP Techsolutions para calcular, revisar, aprovar e preparar comissoes a partir de eventos operacionais, comerciais e financeiros.

Ele deve atender servicos tecnicos em campo na versao inicial, mas nascer preparado para guincho, assistencia veicular, vendas comerciais, representantes, parceiros, logistica, entregas, instalacao, manutencao e industria.

Comissoes sao prioridade comercial do produto e devem ser tratadas como capacidade enterprise multi-tenant. O desenho inicial desta fase e documental e arquitetural: nao cria migrations, nao implementa calculo real, nao cria UI, nao integra pagamento e nao trata fiscal/tributario.

## Principios

- multi-tenant por padrao
- fluxo assincrono por padrao
- operacao principal nunca deve depender do calculo de comissao
- calculo deve ser auditavel
- politica deve ser versionada
- calculo deve ser idempotente
- reprocessamento deve ser controlado
- margem e dados sensiveis devem respeitar RBAC
- backend e a autoridade final
- UI nunca substitui autorizacao backend
- cada tenant pode ter politicas proprias
- plataforma pode definir catalogo global de capacidades, mas nao aprova fluxos de negocio de tenants por padrao

## Arquitetura Assincrona

O Motor de Comissoes deve consumir eventos de dominio de forma assincrona.

Fluxo conceitual:

1. Um evento operacional, comercial ou financeiro ocorre.
2. O modulo de origem publica um domain event tenant-scoped.
3. A operacao principal confirma sua propria transacao e segue.
4. Um consumidor assincrono de comissoes recebe ou registra o evento.
5. O evento e normalizado em `commission_source_event`.
6. O motor avalia elegibilidade e cria `commission_basis`.
7. Um job de calculo gera `commission_calculation`.
8. Calculos aprovaveis entram em demonstrativos.
9. Demonstrativos podem ser aprovados, ajustados, fechados e futuramente liquidados.

Falhas no processamento de comissao nao devem desfazer Work Orders, Dispatches, Checklists, Field Ops Events, Billing ou qualquer operacao de origem.

Regra tecnica:

- operacao principal publica evento e segue
- comissoes consomem eventos depois
- falha no processamento de comissao nao desfaz a operacao de origem

Nenhum calculo de comissao futuro deve bloquear:

- fechamento de Work Order
- criacao ou atualizacao de Dispatch
- evento de Field Ops
- conclusao de checklist
- faturamento futuro
- operacao principal do usuario
- resposta de API operacional critica

O motor deve suportar idempotencia por `source_event_id`, `tenant_id`, `source_type` e `source_entity_id`.

O motor deve suportar replay e backfill futuros, com auditoria de toda recomputacao.

## Modelo Conceitual De Dados

O modelo abaixo e conceitual. Ele nao define schema Prisma real nesta fase.

### commission_policy

Representa uma politica de comissao configuravel por tenant.

Campos conceituais:

- id
- tenant_id
- name
- description
- business_vertical
- commission_type
- applies_to_role
- applies_to_user_id
- applies_to_partner_id
- source_event_types
- status
- current_version_id
- effective_from
- effective_to
- created_by
- created_at
- updated_at

### commission_policy_version

Versiona regras para que calculos antigos continuem rastreaveis.

Campos conceituais:

- id
- tenant_id
- policy_id
- version_number
- rule_definition
- eligibility_definition
- calculation_definition
- approval_definition
- effective_from
- effective_to
- created_by
- created_at

### commission_source_event

Registra o evento de origem consumido pelo motor.

Campos conceituais:

- id
- tenant_id
- source_event_id
- source_event_name
- source_module
- source_entity_type
- source_entity_id
- occurred_at
- received_at
- payload_snapshot
- correlation_id
- idempotency_key
- processing_status

### commission_basis

Representa a base comissionavel extraida do evento.

Campos conceituais:

- id
- tenant_id
- source_event_id
- policy_id
- policy_version_id
- beneficiary_type
- beneficiary_user_id
- beneficiary_partner_id
- basis_type
- basis_amount
- basis_quantity
- basis_distance
- basis_margin
- currency
- eligibility_status
- ineligibility_reason
- created_at

### commission_calculation

Representa o resultado calculado.

Campos conceituais:

- id
- tenant_id
- basis_id
- policy_id
- policy_version_id
- calculation_status
- calculated_amount
- calculation_currency
- calculation_snapshot
- calculated_at
- approved_by
- approved_at
- rejected_by
- rejected_at
- rejection_reason

### commission_split

Representa divisao de comissao entre multiplos beneficiarios.

Campos conceituais:

- id
- tenant_id
- calculation_id
- beneficiary_type
- beneficiary_user_id
- beneficiary_partner_id
- split_percentage
- split_amount
- reason
- created_at

### commission_statement

Representa demonstrativo por periodo e beneficiario.

Campos conceituais:

- id
- tenant_id
- beneficiary_type
- beneficiary_user_id
- beneficiary_partner_id
- period_start
- period_end
- status
- gross_amount
- adjustments_amount
- net_amount
- currency
- approved_by
- approved_at
- closed_at

### commission_settlement

Representa preparacao futura de liquidacao/pagamento.

Campos conceituais:

- id
- tenant_id
- statement_id
- status
- scheduled_date
- settled_date
- amount
- currency
- external_reference
- created_at

### commission_adjustment

Representa ajuste manual, bonus, penalidade, correcao ou estorno.

Campos conceituais:

- id
- tenant_id
- statement_id
- calculation_id
- adjustment_type
- amount
- reason
- requested_by
- approved_by
- status
- created_at
- approved_at

### commission_audit_event

Representa trilha especifica de comissao, alem da auditoria transversal do ERP.

Campos conceituais:

- id
- tenant_id
- actor_user_id
- action
- entity_type
- entity_id
- outcome
- metadata
- correlation_id
- created_at

## Status

### Politica

- draft
- active
- paused
- archived

### Evento/Base

- received
- eligible
- ineligible
- pending_review
- superseded

### Calculo

- pending
- calculated
- disputed
- approved
- rejected
- reversed

### Demonstrativo

- open
- closed
- approved
- exported
- settled

### Liquidacao

- pending
- scheduled
- paid
- cancelled
- failed

## Tipos De Comissao

### Valor fixo

Comissao com valor fixo por evento, servico, entrega, OS ou venda.

Exemplos:

- R$ 20 por atendimento concluido
- R$ 50 por instalacao validada
- R$ 15 por entrega confirmada

### Percentual

Comissao baseada em percentual de valor bruto, liquido ou faturado.

Exemplos:

- 5% sobre venda
- 3% sobre servico aprovado
- 2% sobre contrato recorrente

### Por margem

Comissao baseada na margem da operacao.

Exemplos:

- 10% sobre margem bruta
- comissao apenas se margem minima for atingida
- redutor quando margem ficar abaixo do limite

### Por distancia

Comissao baseada em distancia percorrida, raio de atendimento ou deslocamento.

Exemplos:

- valor por km em guincho
- adicional por deslocamento tecnico
- faixa progressiva por distancia

### Por meta

Comissao por atingimento de meta.

Exemplos:

- meta mensal de vendas
- meta de OS concluidas
- meta de produtividade industrial

### Por produtividade

Comissao baseada em volume, tempo, SLA ou desempenho.

Exemplos:

- bonus por conclusao dentro do SLA
- comissao por numero de atendimentos
- penalidade por retrabalho

### Por split

Comissao dividida entre varios participantes.

Exemplos:

- vendedor + tecnico
- representante + parceiro
- operador + equipe de apoio

### Recorrente

Comissao recorrente por contrato, assinatura ou receita repetida.

Exemplos:

- percentual nos primeiros 6 meses
- comissao enquanto contrato estiver ativo
- comissao reduzida apos periodo inicial

### Bonus

Acrescimo positivo por condicao especial.

Exemplos:

- atendimento emergencial
- avaliacao positiva
- venda de item estrategico
- meta superada

### Penalidade ou estorno

Ajuste negativo por cancelamento, disputa, devolucao, retrabalho ou violacao de regra.

Exemplos:

- OS cancelada
- cliente contestou cobranca
- servico refeito sem cobranca
- invoice revertida

### Hibrida

Combinacao de multiplas regras.

Exemplos:

- fixo + percentual
- percentual + meta
- distancia + bonus por SLA

## Verticais Suportadas

### Servicos tecnicos em campo

Comissao por OS concluida, checklist aprovado, SLA cumprido, evidencia validada ou produtividade.

### Guincho e assistencia veicular

Comissao por atendimento, distancia, tipo de ocorrencia, horario, parceiro, patio, rota ou servico adicional.

### Vendas comerciais

Comissao por venda, contrato, margem, recorrencia, upgrade, cross-sell ou meta.

### Representantes e parceiros

Comissao por indicacao, venda intermediada, carteira atendida, regiao, contrato ativo ou split.

### Logistica e entregas

Comissao por entrega, rota, distancia, produtividade, ocorrencia resolvida ou SLA.

### Instalacao e manutencao

Comissao por instalacao concluida, manutencao preventiva, corretiva, evidencia tecnica ou aprovacao do cliente.

### Industria e producao por meta

Comissao por produtividade, lote, meta, eficiencia, qualidade ou reducao de retrabalho.

## Eventos De Origem

Comissoes consomem eventos. Elas nao devem chamar diretamente operacoes de origem para decidir ou bloquear o fluxo principal.

Eventos iniciais candidatos:

- work_order.created
- work_order.status_changed
- work_order.completed
- field_dispatch.created
- field_dispatch.status_changed
- field_dispatch.cancelled
- field_dispatch.reassigned
- checklist_run.completed
- checklist_run.attachment_uploaded
- checklist_run.divergence_reported
- billing.invoice_issued futuro
- billing.invoice_paid futuro
- sales.order_won futuro
- contract.activated futuro
- manual_adjustment.created futuro

Observacao importante:

`field_location.updated` pode servir como evidencia operacional, contexto de deslocamento ou base futura para distancia, mas nao deve ser gatilho financeiro direto sem regra explicita. Localizacao e sensivel e deve ser tratada com cuidado, minimizacao de dados e RBAC.

## RBAC Proposto

Permissoes:

- commission.policy.read
- commission.policy.manage
- commission.basis.read
- commission.calculation.read
- commission.calculation.run
- commission.statement.read
- commission.statement.approve
- commission.adjustment.create
- commission.adjustment.approve
- commission.settlement.read
- commission.settlement.manage
- commission.audit.read

Papeis sugeridos:

### platform_admin

Pode governar catalogo global e integridade da plataforma.
Nao deve ser aprovador padrao de comissao de tenant.

### tenant_admin

Pode configurar politicas do tenant e governar excecoes administrativas.

### manager

Pode acompanhar bases, calculos e aprovar conforme politica operacional.

### finance

Pode validar valores, aprovar demonstrativos, ajustes financeiros e settlement futuro.

### operator

Pode visualizar dados operacionais permitidos, mas nao deve gerir politicas.

### inventory

Normalmente sem autoridade direta em comissao, exceto quando regras envolverem consumo/material e margem.

### field_technician

Futuramente pode visualizar suas proprias comissoes, sem gerir politica, calculo ou aprovacao.

### auditor

Pode ler trilha, calculos, politicas versionadas, ajustes e aprovacoes.

### support

Pode atuar de forma limitada, tenant-scoped e auditavel, sem aprovar ou alterar valores.

## Seguranca E Isolamento

- Todo dado de comissao deve ser tenant-scoped.
- `tenant_id` e obrigatorio nas entidades principais.
- Backend e a autoridade final de autorizacao.
- UI pode ocultar acoes, mas nao substitui validacao backend.
- Margem, custo e regra comercial sensivel devem respeitar RBAC.
- Ajustes manuais exigem auditoria.
- Reprocessamento exige auditoria.
- Reversao exige justificativa.
- Politica versionada nao deve ser sobrescrita de modo destrutivo.
- Calculos antigos devem manter snapshot da regra usada.
- Falhas de job nao devem vazar dados entre tenants.
- Logs nao devem expor segredos, tokens, margem indevida ou payload sensivel alem do necessario.

## Idempotencia, Replay E Reprocessamento

O motor deve evitar duplicidade de comissao.

Chaves conceituais:

- tenant_id
- source_event_id
- source_event_name
- source_entity_type
- source_entity_id
- policy_version_id
- beneficiary identifier

Regras:

- o mesmo evento nao deve gerar bases duplicadas
- retry de job deve ser seguro
- replay deve ser explicito e auditado
- recomputacao deve preservar calculo anterior como superseded, reversed ou nova versao rastreavel
- mudanca de politica nao deve alterar retroativamente calculos ja aprovados sem acao explicita
- backfill historico deve ter lote, operador, periodo e justificativa

## Auditoria

O Motor de Comissoes deve manter trilha propria alem da auditoria transversal do ERP.

Eventos auditaveis minimos:

- criacao, pausa, ativacao e arquivamento de politica
- criacao de nova versao de politica
- ingestao e descarte de evento de origem
- decisao de elegibilidade
- calculo, aprovacao, rejeicao, disputa e reversao
- ajuste manual, aprovacao de ajuste e rejeicao de ajuste
- fechamento, aprovacao, exportacao e liquidacao futura de demonstrativo
- replay, backfill e recomputacao

Cada evento de auditoria deve ser tenant-scoped, conter ator quando houver acao humana, `correlation_id` quando disponivel e metadata minimizada.

## Plano De Implementacao B-074 Em Diante

### B-074 - Commission Schema Foundation

Objetivo:
Criar migrations e modelos persistentes para o Motor de Comissoes.

Escopo:

- schema Prisma
- migrations
- tabelas tenant-scoped
- indices
- constraints de idempotencia
- RLS/isolamento quando aplicavel
- seed minimo de permissoes RBAC
- documentacao tecnica complementar

Entidades provaveis:

- commission_policies
- commission_policy_versions
- commission_source_events
- commission_bases
- commission_calculations
- commission_splits
- commission_statements
- commission_settlements
- commission_adjustments
- commission_audit_events

Fora de escopo:

- calculo real
- UI
- pagamento
- fiscal
- Flutter

Criterio de aceite:

- migrations aplicam limpas
- `npm run check` passa
- testes de isolamento tenant/idempotencia adicionados ou planejados
- `git diff --check` passa

### B-075 - Async Commission Event Ingestion

Objetivo:
Implementar ingestao assincrona de eventos para comissoes.

Escopo:

- job/fila consumidor de eventos relevantes
- persistencia de `commission_source_event`
- idempotencia por evento
- criacao inicial de `commission_basis`
- fail-open em relacao a operacao principal
- logs e auditoria tecnica

Eventos iniciais:

- work_order.status_changed
- field_dispatch.status_changed
- checklist_run.completed
- billing events futuros apenas como contrato

Fora de escopo:

- calculo final
- UI
- settlement
- pagamento

Criterio de aceite:

- retry seguro
- evento duplicado nao gera base duplicada
- falha no job nao quebra fluxo de origem
- testes cobrem idempotencia e tenant isolation

### B-076 - Commission Calculation Engine Skeleton

Objetivo:
Criar o esqueleto do motor de calculo, ainda sem cobrir todos os casos comerciais definitivos.

Escopo:

- contratos internos de calculo
- resolucao de politica ativa
- uso de `commission_policy_version`
- calculo dry-run
- calculo persistido simples
- snapshots de regra e resultado
- suporte inicial a fixo e percentual

Fora de escopo:

- margem real se financeiro ainda nao estiver pronto
- pagamento
- fiscal
- UI completa

Criterio de aceite:

- calculo usa versao de politica
- calculo e auditavel
- calculo pode ser reprocessado de forma controlada
- testes cobrem fixo, percentual, politica inativa e duplicidade

### B-077 - Commission Approval, Adjustment And Statement Foundation

Objetivo:
Criar fluxo de revisao, aprovacao, ajuste e demonstrativo.

Escopo:

- statement por periodo e beneficiario
- inclusao de calculos aprovaveis
- ajuste manual
- aprovacao por manager/finance conforme RBAC
- rejeicao e disputa
- auditoria de alteracoes

Fora de escopo:

- pagamento real
- fiscal
- integracao bancaria
- Flutter

Criterio de aceite:

- demonstrativo consolida calculos
- ajuste exige permissao
- aprovacao exige permissao
- auditoria registra alteracao, ator e justificativa

### B-078 - Finance Settlement Handoff

Objetivo:
Preparar liquidacao financeira conceitual sem pagamento real.

Escopo:

- settlement planejado
- status de liquidacao
- export/handoff interno
- vinculo com statement aprovado
- trilha de auditoria

Fora de escopo:

- gateway de pagamento
- fiscal
- emissao de nota
- folha de pagamento
- contabilidade avancada

Criterio de aceite:

- settlement nasce apenas de statement aprovado
- valores ficam rastreaveis
- cancelamento/falha possuem status e motivo

### B-079 - Web Admin And Visibility

Objetivo:
Criar UI web para administracao e acompanhamento de comissoes.

Escopo:

- listagem de politicas
- leitura de bases
- leitura de calculos
- demonstrativos
- aprovacao conforme RBAC
- visibilidade limitada por papel

Fora de escopo:

- Flutter
- pagamento real
- fiscal
- edicao avancada de formulas complexas se ainda nao validada

Criterio de aceite:

- UI respeita RBAC
- margem/custo nao aparecem para papel indevido
- backend continua autoridade final
- smoke tests atualizados

### B-080 - Observability, Replay And Hardening

Objetivo:
Endurecer operacao enterprise do Motor de Comissoes.

Escopo:

- metricas
- logs estruturados
- replay controlado
- backfill historico
- alertas de falha de job
- auditoria reforcada
- testes de concorrencia
- testes de isolamento tenant
- testes de idempotencia

Fora de escopo:

- novas regras comerciais grandes
- redesign UI
- integracoes externas sem decisao aprovada

Criterio de aceite:

- replay e auditavel
- backfill exige justificativa
- falhas assincronas ficam visiveis
- job duplicado nao duplica comissao
