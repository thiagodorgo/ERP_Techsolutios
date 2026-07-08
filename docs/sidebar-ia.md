# Arquitetura de Informação da Sidebar (proposta F0 — requer aprovação)

> **Proposta** para aprovação humana (a F0 para aqui). Fonte de verdade do que renderiza hoje =
> `frontend/src/layouts/AppShell.tsx` `NAV_BY_ROLE` + allowlist `MVP_NAV_PATHS` (recon §3). A rodada F
> aplica esta IA em `NAV_BY_ROLE`, **expandindo `MVP_NAV_PATHS`** para os itens novos renderizarem.
> **Intocáveis:** estilo (navy `#0D1B2A`, ativo `#2563EB`), colapso 236↔74, família de ícones (lucide),
> tokens. Só muda a **estrutura de grupos/itens** e os **badges** (passam a ser reais).

## Estado atual (a corrigir)
- 4 RoleKinds (`gestor|dispatcher|admin|finance`) resolvidos por `roleKindFor`. Grupo **FINANCEIRO todo
  oculto** (finance só vê Aprovações). Vários itens roteados **sem entrada na sidebar** (`/inventory`,
  `/reports`, `/users`, `/audit`, `/finance/*`, `/field-operators`, `/dispatch/console`).
- **Badges hardcoded** (Aprovações=3, Notificações=4) → **P-011**. F11/F10 substituem por contagem real
  (`getUnreadNotificationCount` já existe; aprovações pendentes = contagem real).

## IA proposta (5 grupos)

| Grupo | Itens (rótulo → rota) | Fonte |
|---|---|---|
| **VISÃO GERAL** | Dashboard → `/dashboard` | existe |
| **OPERAÇÃO** | Ordens de Serviço → `/work-orders` · Despachos → `/operations/dispatches` · Mapa Operacional → `/operations/map` (F6 real) · Aprovações → `/approvals` `[badge real]` · Checklists → `/operations/checklists` | existe |
| **FROTA** | Viaturas → `/cadastros/viaturas` · Abastecimento → `/fleet/fuel` (F1) · Manutenção → `/fleet/maintenance` (F2) `[badge: vencendo]` · Multas → `/fleet/fines` (F3) `[badge: a vencer]` · Seguros → `/fleet/insurance` (F4) · Danos → `/fleet/damages` (F5) | F1–F5 novos |
| **GESTÃO** | Clientes → `/cadastros/clientes` · Equipes → `/cadastros/equipes` · Serviços → `/cadastros/servicos` · Estoque → `/inventory` (F7 real) `[badge: reposição]` · Pedidos → `/purchase-orders` · Remunerações → `/finance/commissions` (F8) · Relatórios → `/reports` · Financeiro → `/finance` | mix |
| **ADMINISTRAÇÃO** | Usuários → `/users` (F9) · Notificações → `/notifications` `[badge: sino real]` · Configurações → `/administrator/settings` · Auditoria → `/audit` | existe |

> Rotas `/fleet/*` são novas (F1–F5) — mesmo padrão de `/cadastros/*`. Nomear FROTA agrupa
> viatura+controle; Clientes/Equipes/Serviços ficam em GESTÃO (cadastros de negócio). Alternativa
> discutível: manter um grupo CADASTROS separado — **decisão do gate**.

## Visibilidade por papel (resumo; matriz completa em `navigation-matrix.md`)

| Grupo | tenant_admin | manager | field_dispatcher | operator | finance | inventory | field_technician | auditor | support |
|---|---|---|---|---|---|---|---|---|---|
| VISÃO GERAL | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓(mobile) | ✓ | — |
| OPERAÇÃO | ✓ | ✓ | ✓ | parcial | — | — | mobile | leitura | — |
| FROTA | ✓ | ✓ | leitura | parcial(F1) | leitura(F3/F4) | — | mobile(F1/F5) | leitura | — |
| GESTÃO | ✓ | ✓ | — | leitura cad. | ✓(fin.) | ✓(estoque) | — | leitura | — |
| ADMINISTRAÇÃO | ✓ | parcial | — | — | — | — | — | Auditoria | limitado |

## Badges reais (mata P-011)
- **Aprovações** = contagem de aprovações pendentes do tenant (endpoint real `/approvals/pending`).
- **Notificações / sino** = `getUnreadNotificationCount` (já existe, real; topbar).
- **Manutenção / Multas / Estoque** = contagem derivada dos agregados (vencendo/a vencer/em reposição),
  do mesmo padrão de agregação por tenant do dashboard (C3). Sem número inventado.

## Implementação (F11) — escopo cirúrgico
1. Reestruturar `NAV_BY_ROLE` (grupos/itens acima) por RoleKind — só conteúdo do menu.
2. Expandir `MVP_NAV_PATHS` com `/fleet/fuel|maintenance|fines|insurance|damages`, `/inventory`,
   `/purchase-orders`, `/reports`, `/finance`, `/finance/commissions`, `/users`, `/audit`.
3. Restaurar o RoleKind/grupo do **finance** (hoje pruned).
4. Badges reais (substituir os hardcoded). Estilo/colapso/tokens **inalterados**.
5. `tenantNavigation.ts` + `navigation.adapter.ts`: adicionar escopo/label **FROTA** (`fleet`) e itens
   novos com `requiredPermissions`/`allowedRoles`, para o teste de RBAC por papel (F11) e o menu backend.
