# Matriz de navegação — 9 papéis × telas

> Quem VÊ / o que pode em cada tela. Base do teste por papel da F11 (logar como cada papel → itens
> visíveis = esta matriz; rota fora da matriz = guard no front **e** 403 no back). Alinhada a
> `RBAC_MATRIX.md` e às permissões reais do backend (`catalog.ts`). Legenda: **F**=full · **E**=edit/create ·
> **R**=read · **—**=sem acesso · **M**=mobile.
>
> ⚠ **Divergência de vocabulário (recon §4)**: guards do front usam vocabulário mock
> (`dashboard:view`, `inventory:read`, `audit:view`, `tenant:manage`, `logistics:dispatch`) enquanto o
> backend usa (`dashboard:read`, `inventory.read`, `audit:read`, `tenant.manage`, `logistics:read`). **F11
> deve reconciliar**: adotar o vocabulário do **backend** (`catalog.ts`) como autoridade e ajustar os
> guards do front das telas novas/religadas para casar. As telas de cadastro (`customers/vehicles/teams/
> service_catalog:*`) já casam nos dois lados.

> **Ω-ACESSO — gating por PROVISIONAMENTO (novo eixo).** Além da permissão do papel, um item de menu com
> `requiredModules` só aparece se o **módulo estiver provisionado ao tenant** (`tenants.modules`). O Mapa
> Operacional exige o módulo `field_operations`. O backend (`GET /navigation/menu`) filtra por módulo e
> expõe `governedPaths`; o sidebar esconde dinamicamente paths governados não provisionados (remover
> `field_operations` do tenant → o Mapa some de TODOS os papéis). O `operator` passou a ter
> `field_location:read` (opera o mapa). Validado por login real dos 9 papéis — ver `demo-credentials.md`.

| Tela (rota) | permissão backend | plat_admin | tenant_admin | manager | operator | finance | inventory | field_tech | auditor | support |
|---|---|---|---|---|---|---|---|---|---|---|
| Dashboard `/dashboard` | `dashboard:read` | F | F | F | R | R | R | M | R | — |
| Ordens de Serviço `/work-orders` | `work_orders:read` | F | F | F | E | R | R | M | R | — |
| OS detalhe `/work-orders/:id` | `work_orders:read` | F | F | F | E | R | R | M | R | — |
| Despachos `/operations/dispatches` | `field_dispatch:read` | F | F | F | R | — | — | M | R | — |
| Mapa Operacional `/operations/map` (F6, Ω-ACESSO) | `field_location:read` + módulo `field_operations` | F | F | F | E | — | — | M | R | — |
| Aprovações `/approvals` | `work_orders:read` | F | F | F | request | approval | — | — | R | — |
| Checklists `/operations/checklists` | `checklist_runs:read` | F | F | F | E | — | — | M | R | — |
| Clientes `/cadastros/clientes` | `customers:read` | F | F | E | R | — | — | R | R | — |
| Viaturas `/cadastros/viaturas` | `vehicles:read` | F | F | E | R | — | — | R | R | — |
| Equipes `/cadastros/equipes` | `teams:read` | F | F | E | R | — | — | R | R | — |
| Serviços `/cadastros/servicos` | `service_catalog:read` | F | F | E | R | — | — | R | R | — |
| Tabela de Valores `/cadastros/tabelas-valores` (Ω2-a.1) | `price_tables:read` | F | F | E | R | — | — | R | R | — |
| Tarifas `/cadastros/tarifas` (Ω2-a.2) | `tariffs:read` | F | F | E | R | — | — | R | R | — |
| Filiais `/cadastros/filiais` (Ω2-b) | `branches:read` | F | F | E | R | — | — | R | R | — |
| Fornecedores `/cadastros/fornecedores` (Ω2-b) | `suppliers:read` | F | F | E | R | — | — | R | R | — |
| Profissionais `/cadastros/profissionais` (Ω2-c) | `operator_profiles:read` | F | F | E | R | — | — | R | R | — |
| **Abastecimento `/fleet/fuel` (F1)** | `fuel_logs:read` | F | E | E | E | R | — | M/E | R | — |
| **Manutenção `/fleet/maintenance` (F2)** | `maintenance_orders:read` | F | E | E | E | R | — | R | R | — |
| **Multas `/fleet/fines` (F3)** | `fines:read` | F | E | E | R | E | — | — | R | — |
| **Seguros `/fleet/insurance` (F4)** | `insurance_policies:read` | F | E | E | R | E | — | — | R | — |
| **Danos `/fleet/damages` (F5)** | `damages:read` | F | E | E | E | R | — | M/E | R | — |
| **Estoque `/inventory` (F7)** | `inventory_items:read` | F | E | E | E(mov) | R | F | — | R | — |
| Pedidos `/purchase-orders` | `purchase_orders:read`* | F | E | E | R | R | E | — | R | — |
| **Remunerações `/finance/commissions` (F8)** | `commissions:read` / `read_own` | F | F | R | own | F | — | own | R | — |
| Financeiro `/finance` | `finance:read` | F | F | R | — | F | — | — | R | — |
| Relatórios `/reports` | `reports:read`* | F | F | F | R | R | R | — | R | — |
| Usuários `/users` (F9) | `users.read`/`users.manage` | F | F(manage) | R | — | — | — | — | R | limited |
| Notificações `/notifications` | `notifications:read` | F | F | F | R | R | R | M | R | R |
| Configurações `/administrator/settings` | `tenant.manage` | F | F | R | — | — | — | — | R | — |
| Auditoria `/audit` | `audit:read` | F | F | R | — | R | R | — | F | R |

`*` Permissões `fuel_logs:*`, `maintenance_orders:*`, `fines:*`, `insurance_policies:*`, `damages:*`,
`inventory_items:*`, `stock_movements:*`, `cycle_counts:*`, `purchase_orders:read`, `reports:read` são
**novas** — F1–F8/F11 as adicionam ao `PERMISSION_CATALOG` e aos arrays de papel em `catalog.ts`,
espelhando os grants de `vehicles:*` (escrita: super/tenant_admin/manager; leitura: papéis operacionais +
auditor; `support` nenhuma), ajustadas pela coluna acima.

## Regras transversais da matriz
- **support**: nunca acessa Cadastros nem Frota-controle (consistente com A-D). Só Notificações/Auditoria
  limitadas.
- **auditor**: leitura forte em tudo + Auditoria full; nunca executa.
- **operator vê SÓ o próprio extrato** de comissão (F8 `read_own`) — teste obrigatório.
- **finance** ganha de volta o grupo (hoje pruned): Multas, Seguros, Remunerações, Financeiro, Relatórios.
- **inventory** é dono do Estoque (F7) e move; lê o resto operacional pertinente.
- **platform_admin** entra só em fluxos de plataforma; nas telas de tenant aparece como F por herança do
  catálogo, mas opera pela console de plataforma (fora da AppShell).
