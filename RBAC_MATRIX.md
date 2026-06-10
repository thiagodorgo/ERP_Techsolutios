# ERP Techsolutions — RBAC Matrix

## Scope
Baseline authorization matrix for the ERP Techsolutions multi-tenant SaaS ERP. This matrix should support the agent mission of preserving operational clarity, tenant isolation, traceability, and continuity across product, architecture, UX, execution, and audit.

## Roles
- platform_admin
- tenant_admin
- manager
- operator
- finance
- inventory
- field_technician
- auditor
- support

## Permission principles
- Backend is the final authorization authority
- UI may hide or shape access, but never replace backend checks
- tenant_id is mandatory for tenant-scoped actions
- tenant_role and tenant_roles should shape access resolution
- permissions should support fine-grained overrides where needed
- platform-level actions must be isolated from tenant-level actions
- no role should silently cross tenant boundaries
- support access must remain constrained, auditable, and policy-bounded
- the matrix must preserve segregation of responsibility across platform governance, tenant governance, operation, finance, inventory, field execution, audit, and support

## Baseline matrix
| Module / Capability | platform_admin | tenant_admin | manager | operator | finance | inventory | field_technician | auditor | support |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Platform configuration | full | none | none | none | none | none | none | read | limited-support |
| Tenant administration | full | full | read | none | none | none | none | read | limited-support |
| User and role assignment | full | full | limited | none | none | none | none | read | limited-support |
| Dashboard and operational overview | full | full | full | full | scoped | scoped | scoped | read | scoped |
| Backend navigation menu | full | tenant-scoped | scoped | scoped | scoped | scoped | scoped | read | scoped |
| Field operator location | support-audited | full-tenant | read-history | send-own | none | none | send-own | full-read | support-view |
| Master data | full | full | approve/edit | edit-scoped | read | read/edit-scoped | read | read | read-support |
| Configurable checklist templates | support-audited | create/read/update/delete/publish | read | none | read | read | read | read | support-view |
| Checklist executions and answers | support-audited | full-tenant | read/complete-by-scope | create/answer/complete-by-scope | read | read/answer-by-scope | answer-assigned | full-read | support-view |
| Work orders / service orders | full | full | full | create/edit | read | material-view | execute/update-assigned | read | support-view |
| Workflow / approvals | full | full | full | request | approval-by-policy | approval-by-policy | request/ack | read | support-view |
| Inventory movements | full | full | read | request/use | read | full-operational | consume/confirm | read | support-view |
| Purchasing | full | full | request/approve-policy | request | budget-check | stock-driven-request | none | read | support-view |
| Finance | full | tenant-finance-admin | manager-view | none | full | stock-cost-view | none | read | support-view |
| Billing | full | full | read | none | full | none | none | read | support-view |
| Cloud usage metering | full | none | none | none | none | none | none | read | support-view |
| Cloud cost import | full | none | none | none | none | none | none | read | support-view |
| Cloud cost allocation | full | none | none | none | none | none | none | read | support-view |
| Cloud charge markup rules | full | none | none | none | none | none | none | read | support-view |
| Reports and analytics | full | full | full | scoped | finance-scoped | inventory-scoped | field-scoped | audit-full-read | support-scoped |
| Audit logs | full | read | scoped | none | scoped | scoped | none | full-read | support-scoped |
| Cross-tenant support operations | full | none | none | none | none | none | none | read | scoped-support-only |

## Role semantics
- **platform_admin** governs platform-wide configuration, integrity, and cross-tenant controls, but is not the default approver of tenant business flows.
- **tenant_admin** governs the tenant's local configuration, users, policies, and administrative exceptions.
- **manager** coordinates operations, approves within policy, and manages execution tradeoffs.
- **operator** performs operational work and requests approval where required.
- **finance** owns finance-sensitive views, controls, and approvals.
- **inventory** owns stock control, movement integrity, and inventory-sensitive approvals.
- **field_technician** executes field work, records evidence, and updates assigned operational flows.
- **auditor** has strong read and traceability visibility, not execution authority by default.
- **support** operates inside bounded and auditable support policies without breaking segregation of function.

## Auth and claim alignment
This matrix assumes the authenticated context includes:
- sub
- tenant_id
- tenant_role
- tenant_roles
- permissions
- email
- scope

Operational rules:
- tenant_id and tenant_role are mandatory for authenticated tenant access
- React and Flutter may shape the interface from claims, but claims do not replace backend enforcement
- permissions may narrow or extend role behavior only within backend-authorized limits
- active tenant resolution must be explicit when a user belongs to more than one tenant
- configurable checklist permissions are tenant-scoped and must include `tenant_checklists:*` and `checklist_runs:*` checks in backend routes/services
- internal notifications are tenant-scoped and must keep `notifications:read`/`notifications:update` limited to the authenticated user's own inbox unless a future admin endpoint is explicitly designed
- cloud usage metering is platform-scoped and must require `platform:cloud-usage:read`; tenant roles do not receive cross-tenant cloud usage access
- cloud cost import is platform-scoped and must require `platform:cloud-costs:read` or `platform:cloud-costs:import`; tenant roles do not receive raw cloud cost access
- cloud cost allocation is platform-scoped at API level and must require `platform:cloud-cost-allocation:read` or `platform:cloud-cost-allocation:run`; tenant roles do not receive allocated cloud cost access in this branch
- `tenant_cloud_cost_allocations` remains tenant-scoped at database level with RLS, even though HTTP access is restricted to the Platform boundary in this branch
- cloud charge markup rules are platform-scoped at API level and must require `platform:cloud-charge-rules:read`, `platform:cloud-charge-rules:write`, `platform:cloud-charges:read`, or `platform:cloud-charges:calculate`; tenant roles do not receive cloud price or margin access in this branch
- `tenant_cloud_charges` remains tenant-scoped at database level with RLS, even though HTTP access is restricted to the Platform boundary in this branch
- backend navigation menu is exposed by `GET /api/v1/navigation/menu`, filters by resolved roles, permissions, tenant modules and scope, and never replaces backend authorization on domain endpoints
- navigation platform items use `platform:dashboard:read`, `platform:tenants:read`, `platform:cloud-charges:read` and `platform:audit:read`
- navigation tenant/operations/logistics/finance items use planned permissions including `dashboard:read`, `tenant_settings:read`, `users:read`, `audit:read`, `work_orders:*`, `field_location:*`, `field_operator:*`, `field_dispatch:*`, `logistics:*`, `finance:read`, `billing:read`, `invoices:read` and `payments:read`
- work orders foundation uses `work_orders:read`, `work_orders:create`, `work_orders:update`, `work_orders:assign`, `work_orders:status`, `work_orders:cancel` and reserved `work_orders:delete`; all routes derive `tenant_id` from authenticated context and protect `work_orders`, `work_order_events` and `work_order_assignments` with RLS
- field operator location uses `field_location:send` for mobile self-location, `field_location:read` for latest tenant positions, and `field_location:history` for historical queries; the backend must derive `tenant_id` and `operator_user_id` from the authenticated context and protect `field_operator_locations` with RLS
- field dispatch foundation uses `field_dispatch:read`, `field_dispatch:create`, `field_dispatch:update`, `field_dispatch:cancel` and `field_dispatch:reassign`; dispatches are tenant-scoped, must link only to Work Orders and operators from the same tenant, and protect `field_dispatches` and `field_dispatch_events` with RLS
- checklist reads and writes must validate `tenant_id` together with template, field, run and answer identifiers
- M10/M11/M12 must render checklist schemas from API data rather than hardcoded mobile field definitions

## Notes
- "limited-support" means support actions must be constrained, logged, and never silently exceed tenant-scoped support permissions.
- Approval-related permissions should be refined together with APPROVAL_LIMITS.md.
- This matrix must stay consistent with the operational mission in PRODUCT_CONTEXT.md and the rules consolidated in agent-orchestration/docs/regras-de-negocio.md.
- This matrix is the baseline and should be decomposed later into project documentation under the standard structure.
