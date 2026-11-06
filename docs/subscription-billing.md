# Assinaturas e catálogo de planos

O B-ASS-02 entrega o catálogo persistido de quatro planos-base e dois add-ons, versões imutáveis
com vigência e uma assinatura vigente por organização. O catálogo nasce sem versão e sem preço:
valores comerciais são cadastrados fora do repositório público por um administrador de plataforma.

## Contratos e autoridade

- As rotas ficam em `/api/v1/platform/billing` e exigem `platform:billing:read` ou
  `platform:billing:manage` de um ator de plataforma.
- `subscription_plans` e `subscription_plan_versions` são catálogo global.
- `tenant_subscriptions` e `tenant_subscription_addons` são escopadas por organização, com RLS
  `ENABLE` + `FORCE`; toda leitura ou escrita usa o contexto da organização.
- Uma versão existente nunca é editada. Alterações comerciais criam uma versão posterior e fecham
  a vigência da anterior.
- O `PUT` de assinatura e a entrada em vigor de uma versão gravam em `tenants.modules` a união dos
  módulos do plano-base com os módulos dos add-ons. Encerrar a assinatura não apaga os módulos.

Os seis códigos iniciais são `starter`, `professional`, `business`, `enterprise`,
`tracking_basic` e `tracking_plus`. Em produção eles são criados pela migração M1-d; o seed de
desenvolvimento consome `SUBSCRIPTION_PLAN_SEEDS`, em
`src/modules/subscription-billing/plans/plan-catalog.ts`.

## Reconciliação do mapa de módulos

“Sem chave” é uma lacuna declarada: o item não recebe chave inventada e aguarda o gate
`B-SAN3-18`.

| Plano | Item do mapa | Chave do catálogo ou estado |
|---|---|---|
| Starter | Core | `dashboard`, `users`, `tenant-admin` |
| Starter | Cadastros | `customers`, `vehicles`, `suppliers`, `technicians` |
| Starter | Ordens de serviço | sem chave — núcleo; gate pendente (`B-SAN3-18`) |
| Starter | Painel básico | `dashboard` |
| Starter | Financeiro básico | `finance` |
| Starter | Relatórios básicos | `reports` |
| Professional | Mobile | `mobile` |
| Professional | Estoque | `inventory` |
| Professional | Frota | `vehicles` |
| Professional | Checklists | `tenant_checklist` |
| Professional | Orçamento | `approvals` |
| Professional | Faturamento | `finance` |
| Professional | Alertas | `notifications` |
| Business | Estoque por viatura | `inventory` — sem chave própria |
| Business | Manutenção | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Multas | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Remunerações | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Pré-faturamento | sem chave — gate pendente (`B-SAN3-18`) |
| Business | Integrações | `integrations` |
| Enterprise | Auditoria avançada | `audit` |
| Enterprise | BI | `analytics` |
| Enterprise | IA | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | SSO | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | Isolamento premium | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | Regras complexas | sem chave — gate pendente (`B-SAN3-18`) |
| Enterprise | ESG | sem chave — gate pendente (`B-SAN3-18`) |

Os add-ons de rastreamento usam `tracking`; apenas um add-on de rastreamento pode estar vigente por
assinatura.

## Migrações e rollback

M1 cria as quatro tabelas; M1b provisiona as duas permissões; M1-d cria somente os códigos iniciais.
Todas têm transação explícita. O rollback é manual e escopado nos próprios arquivos. M1-d nunca
remove um plano que já tenha versão.

## Medição diária da franquia (B-ASS-03)

O job `subscription.measure-daily` mede cada organização duas vezes ao dia, às 12:00 e às 23:30, no horário de São Paulo. O resultado vai para `tenant_usage_daily`, que tem uma linha por organização e por dia e é guardada com ENABLE+FORCE RLS. O demonstrativo (B-ASS-04) lê o maior valor do mês.

| Medida | Como se mede | O que não mede (declarado) |
|---|---|---|
| `active_users` | `count(*)` de `users` ativos sob o GUC da organização, sem filtro de papel: o técnico de campo conta. Das duas amostras do dia, fica a maior (`GREATEST`) | dia sem amostra fica sem linha (gap), nunca preenchido depois |
| `files_bytes` / `files_without_size` | soma de `size_bytes` dos anexos guardados (`attachments` e `work_order_attachments` sem `deleted_at` e com `status = stored`; `checklist_attachments` e `damage_attachments` sem esses filtros, porque não têm as colunas) | anexo rejeitado ou em quarentena não conta |
| `db_bytes_estimated` (método 2) | soma de `pg_column_size` das linhas vivas da organização em cada tabela da lista censurada (`relforcerowsecurity` ∩ `tenant_id NOT NULL`, menos `cloud_charge_rules`, `roles` e `platform_audit_logs`), sob RLS. Outra organização apagar ou crescer não muda a medida desta | índices e espaço morto; o TOAST externo conta. Por isso o nome é "estimativa", com `method_version` gravado |
| `tracked_vehicles` | veículos distintos com vínculo de rastreamento ativo no dia | a cobrança usa a contagem do mês, feita no fechamento |

**Segurança.** Cada organização é medida numa transação própria (`withTenantRlsBudget`), sob o papel de runtime sem bypass. Antes de gravar, o medidor confere que o GUC é o da organização e passa uma leitura-canário. Se o contexto estiver ausente ou trocado, ele lança `tenant_context_missing`: o dia fica sem linha, nunca com zero. Cada tabela tem orçamento de 30 s (`statement_timeout`, sob `SAVEPOINT`). Tabela que estoura vai para `metadata.tables_timed_out[]`, e o banco do dia fica sem medida.

**Leitura.** A rota é `GET /api/v1/platform/billing/tenants/:tenantId/usage?from&to`, com permissão `platform:billing:read`. Ela lê sob o GUC da organização e devolve `dbBytesEstimated` como texto, porque é BigInt.

**Rateio do custo de nuvem (R-MED-8).** A linha `AmazonRDS` da conta da AWS é rateada pelo `db_bytes_estimated` do último dia medido até o fim do período (método `storage_usage_weight`), com o rótulo de estimativa. Sem medição, o rateio continua pelas ações auditadas. A chave nasce só dessa derivação e fica fora da lista de métricas que os eventos de uso aceitam.

**Rollback.** Retire o job do bootstrap e reverta o PR. A tabela fica.
