# Ω6R — Inventário e ranking de risco

Data-base: 2026-08-11  
HEAD auditado: `8edfe51a40e2add6d2928f1d54ba631516fe417d`  
Método de LOC: linhas físicas dos arquivos-fonte; dependências, builds e artefatos ignorados foram excluídos.  
Método inicial de endpoints: ocorrências sintáticas de `.get/.post/.put/.patch/.delete(`; a Fase 1 valida o censo rota a rota.

## Resumo

| Superfície | Unidades | Arquivos/LOC |
|---|---:|---:|
| Backend `src/modules` | 65 módulos | 109.231 LOC TS; 791 ocorrências iniciais de rotas |
| Prisma | 110 models | `prisma/schema.prisma` |
| Frontend React | 26 áreas | 103.383 LOC TS/TSX/CSS |
| Flutter | 4 áreas principais | 32.035 LOC Dart |
| Portais públicos | owner + authority | 2.272 LOC TS/TSX/CSS |
| Repositório | — | 2.741 arquivos rastreados; 1.489 arquivos de código de produto |

## Ranking de risco

O ranking ordena as ondas da Fase 2. A prioridade é: (1) dinheiro; (2) tenancy/auth; (3) dados regulatórios e superfícies públicas; (4) operação crítica; (5) apoio/utilitário. LOC serve apenas como desempate dentro da faixa, porque impacto financeiro, vazamento entre organizações e corrupção regulatória dominam volume de código.

| Ordem | Módulo | Arquivos TS | LOC | Rotas* | Risco |
|---:|---|---:|---:|---:|---|
| 1 | auction | 17 | 4629 | 23 | 1 — dinheiro |
| 2 | commissions | 10 | 2445 | 16 | 1 — dinheiro |
| 3 | charging | 12 | 2050 | 8 | 1 — dinheiro |
| 4 | release | 9 | 1990 | 14 | 1 — dinheiro |
| 5 | cloud-charges | 10 | 1933 | 12 | 1 — dinheiro |
| 6 | financial-titles | 10 | 1921 | 19 | 1 — dinheiro |
| 7 | expense-management | 9 | 1698 | 11 | 1 — dinheiro |
| 8 | financial-entries | 9 | 1587 | 14 | 1 — dinheiro |
| 9 | cloud-cost-allocation | 9 | 1427 | 12 | 1 — dinheiro |
| 10 | professional-statements | 9 | 1374 | 7 | 1 — dinheiro |
| 11 | cheques | 9 | 1350 | 16 | 1 — dinheiro |
| 12 | work-order-financials | 9 | 1336 | 10 | 1 — dinheiro |
| 13 | cloud-costs | 9 | 1231 | 6 | 1 — dinheiro |
| 14 | cloud-usage | 9 | 1076 | 6 | 1 — dinheiro |
| 15 | financial-period-closes | 10 | 993 | 6 | 1 — dinheiro |
| 16 | financial-accounts | 9 | 921 | 10 | 1 — dinheiro |
| 17 | financial-summary | 9 | 525 | 6 | 1 — dinheiro |
| 18 | core-saas | 32 | 4394 | 11 | 2 — tenancy/auth |
| 19 | auth | 15 | 2694 | 11 | 2 — tenancy/auth |
| 20 | platform | 19 | 1373 | 10 | 2 — tenancy/auth |
| 21 | teams | 9 | 1091 | 14 | 2 — tenancy/auth |
| 22 | navigation | 5 | 944 | 1 | 2 — tenancy/auth |
| 23 | branches | 9 | 624 | 7 | 2 — tenancy/auth |
| 24 | tenant-settings | 9 | 509 | 5 | 2 — tenancy/auth |
| 25 | impound | 41 | 6805 | 44 | 3 — regulatório |
| 26 | authority | 27 | 2787 | 10 | 3 — regulatório |
| 27 | yard | 9 | 2008 | 22 | 3 — regulatório |
| 28 | vehicle-identities | 9 | 1889 | 15 | 3 — regulatório |
| 29 | owner-portal | 14 | 1734 | 12 | 3 — regulatório |
| 30 | jurisdiction | 10 | 1112 | 9 | 3 — regulatório |
| 31 | portal-shared | 8 | 735 | 13 | 3 — regulatório |
| 32 | checklists | 22 | 6331 | 37 | 4 — operação crítica |
| 33 | work-orders | 24 | 5329 | 49 | 4 — operação crítica |
| 34 | inventory | 20 | 5116 | 40 | 4 — operação crítica |
| 35 | mobile | 8 | 3765 | 19 | 4 — operação crítica |
| 36 | notifications | 19 | 2704 | 22 | 4 — operação crítica |
| 37 | field-dispatch | 10 | 1604 | 14 | 4 — operação crítica |
| 38 | telemetry | 11 | 1286 | 7 | 4 — operação crítica |
| 39 | attachments | 11 | 1207 | 20 | 4 — operação crítica |
| 40 | field-location | 8 | 745 | 3 | 4 — operação crítica |
| 41 | field-ops-realtime | 3 | 209 | 8 | 4 — operação crítica |
| 42 | evidence | 1 | 177 | 0 | 4 — operação crítica |
| 43 | maintenance-orders | 14 | 2465 | 19 | 5 — apoio/utilitário |
| 44 | damages | 10 | 2433 | 18 | 5 — apoio/utilitário |
| 45 | fines | 10 | 1702 | 9 | 5 — apoio/utilitário |
| 46 | fuel-logs | 10 | 1663 | 15 | 5 — apoio/utilitário |
| 47 | insurance-policies | 10 | 1424 | 10 | 5 — apoio/utilitário |
| 48 | service-quotes | 9 | 1344 | 15 | 5 — apoio/utilitário |
| 49 | tariffs | 11 | 1207 | 8 | 5 — apoio/utilitário |
| 50 | price-tables | 10 | 1175 | 8 | 5 — apoio/utilitário |
| 51 | service-quote-items | 9 | 972 | 8 | 5 — apoio/utilitário |
| 52 | customers | 9 | 870 | 8 | 5 — apoio/utilitário |
| 53 | service-catalog | 9 | 867 | 8 | 5 — apoio/utilitário |
| 54 | operator-profiles | 9 | 842 | 8 | 5 — apoio/utilitário |
| 55 | vehicles | 9 | 821 | 8 | 5 — apoio/utilitário |
| 56 | pois | 9 | 776 | 7 | 5 — apoio/utilitário |
| 57 | suppliers | 9 | 761 | 7 | 5 — apoio/utilitário |
| 58 | work-order-comments | 9 | 724 | 10 | 5 — apoio/utilitário |
| 59 | tags | 9 | 685 | 7 | 5 — apoio/utilitário |
| 60 | dashboard | 8 | 641 | 1 | 5 — apoio/utilitário |
| 61 | patios-dashboard | 9 | 624 | 4 | 5 — apoio/utilitário |
| 62 | work-order-timeseries | 10 | 447 | 5 | 5 — apoio/utilitário |
| 63 | technician-performance | 10 | 418 | 2 | 5 — apoio/utilitário |
| 64 | work-order-audit-logs | 8 | 373 | 3 | 5 — apoio/utilitário |
| 65 | tag-assignments | 5 | 339 | 4 | 5 — apoio/utilitário |

\* Contagem sintática preliminar, não o KPI final de endpoints.

## Modelos Prisma

110 models: `Tenant`, `Branch`, `User`, `LocalAuthCredential`, `AuthSession`, `Role`, `Permission`, `RolePermission`, `UserRoleAssignment`, `AuditLog`, `Notification`, `ScheduledNotification`, `CloudUsageEvent`, `CloudUsageDailyAggregate`, `CloudCostImport`, `CloudCostLineItem`, `CloudCostAllocationRun`, `CloudChargeRule`, `CloudChargeCalculationRun`, `TenantCloudCharge`, `TenantCloudCostAllocation`, `ChecklistTemplate`, `ChecklistApplicabilityRule`, `ChecklistTemplateComponent`, `ChecklistRun`, `ChecklistRunAnswer`, `ChecklistAttachment`, `ChecklistMarker`, `ChecklistAcknowledgement`, `FieldOperatorLocation`, `Customer`, `Vehicle`, `FuelLog`, `MaintenanceOrder`, `MaintenanceOrderItem`, `Fine`, `InsurancePolicy`, `Damage`, `WorkOrderAttachment`, `Attachment`, `DamageAttachment`, `InventoryItem`, `StockMovement`, `CycleCount`, `CycleCountEntry`, `ServiceCatalog`, `PriceTable`, `Tariff`, `ServiceQuote`, `ServiceQuoteItem`, `WorkOrderFinancialItem`, `WorkOrderComment`, `TagAssignment`, `Supplier`, `FinancialAccount`, `FinancialTitle`, `FinancialPeriodClose`, `FinancialEntry`, `Cheque`, `Tag`, `Poi`, `TenantSetting`, `OperatorProfile`, `TelemetryEvent`, `ProfessionalStatementEntry`, `Team`, `TeamMember`, `WorkOrder`, `WorkOrderEvent`, `WorkOrderAssignment`, `FieldDispatch`, `FieldDispatchEvent`, `CommissionPolicy`, `CommissionPolicyRule`, `CommissionBasisEvent`, `CommissionCalculation`, `CommissionStatement`, `ExpensePolicy`, `ExpenseReport`, `ExpenseItem`, `ExpenseReceipt`, `ExpenseAdvance`, `ExpenseApprovalStep`, `ExpenseEvent`, `MobileActionReceipt`, `Yard`, `YardArea`, `YardSpot`, `JurisdictionProfile`, `ThirdPartyVehicleIdentity`, `ThirdPartyVehicleIdentityMergeEvent`, `ImpoundProcess`, `ImpoundProcessChecklistLink`, `PortalAccessLog`, `PortalReleaseRequest`, `AuthorityCredential`, `AuthorityRemovalRequest`, `CustodyEvent`, `IntakeInspection`, `ProcessCharge`, `DailyAccrualRun`, `ProcessNotification`, `ImpoundRelease`, `ReleaseAuthorityDecision`, `ReleaseRequirementCheck`, `AuctionAttempt`, `AuctionEdict`, `Settlement`, `SettlementAllocation`, `ImpoundOutboxEvent`.

## Áreas React

| Área | Arquivos | LOC |
|---|---:|---:|
| patios | 86 | 13.499 |
| fleet | 47 | 12.567 |
| registry | 74 | 11.743 |
| work-orders | 61 | 9.175 |
| operations | 48 | 7.728 |
| checklists | 33 | 7.276 |
| inventory | 25 | 6.214 |
| finance | 31 | 4.810 |
| platform | 26 | 3.024 |
| notifications | 16 | 2.306 |
| telemetry | 18 | 1.836 |
| dashboard | 9 | 1.387 |
| users | 6 | 1.267 |
| audit | 7 | 995 |
| sessions | 8 | 814 |
| attachments | 6 | 781 |
| settings | 9 | 629 |
| auth | 5 | 593 |
| dispatch | 5 | 559 |
| navigation | 6 | 359 |
| context | 2 | 204 |
| purchase-orders | 1 | 84 |
| events | 1 | 36 |
| reports | 1 | 32 |
| logistics | 2 | 28 |
| approvals | 1 | 10 |

## Áreas Flutter

| Área | Arquivos | LOC |
|---|---:|---:|
| features | 62 | 18.319 |
| core | 57 | 9.876 |
| shared | 8 | 3.262 |
| app | 2 | 561 |

## Scripts, workers e jobs

- Infra: `src/infra/jobs/{job.worker,job.registry,job.queue,job.types}.ts`.
- Jobs de domínio: charging, cloud-charges, cloud-costs, cloud-cost-allocation, cloud-usage, field-dispatch, impound e notifications.
- Runners: `src/modules/notifications/fleet-alerts.runner.ts`.
- Scripts operacionais: backup/restore, RBAC provision/drill, smoke staging/production, uptime, backfill de identidade veicular e sincronização de agentes/skills.
- Workers browser: PoW nos portais owner e authority.

## Ondas planejadas

- Onda 1: auction, commissions, charging, release, cloud-charges.
- Onda 2: financial-titles, expense-management, financial-entries, cloud-cost-allocation, professional-statements, cheques.
- Onda 3: work-order-financials, cloud-costs, cloud-usage, financial-period-closes, financial-accounts, financial-summary.
- Onda 4: core-saas, auth, platform, teams, navigation, branches.
- Onda 5: tenant-settings, impound, authority, yard, vehicle-identities, owner-portal.
- Onda 6: portal-shared, checklists, work-orders, inventory, mobile, notifications.
- Onda 7: field-dispatch, telemetry, attachments, field-location, field-ops-realtime, evidence.
- Ondas 8–11: módulos de apoio/utilitários, frontend, Flutter, portais e infra/jobs.

