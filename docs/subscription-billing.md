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
