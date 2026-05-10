# ERP Techsolutions — Approval Limits

## Purpose
Define baseline approval, escalation, and exception patterns for the ERP Techsolutions ERP in a way that is explicit, auditable, tenant-aware, and consistent with the agent's operational mission.

## Principles
- Approval rules are explicit, auditable, and tenant-aware
- Approval chains must be visible to the user
- Escalations should be deterministic when thresholds are exceeded
- Emergency overrides must be rare, logged, and permission-bounded
- Approval flow must preserve segregation of responsibility
- Approval visibility should help operation, not create hidden governance
- Every approval model must remain compatible with strong auditability and future module expansion

## Approval dimensions
- financial amount
- operational risk
- inventory impact
- service interruption impact
- tenant policy sensitivity
- security sensitivity
- customer-impact severity
- cross-tenant or platform integrity impact

## Baseline by role
### platform_admin
- Can define global policy templates
- Can intervene only in platform-level or support-governed cases
- Must not be the silent default approver for tenant business flows
- Should only enter tenant business approval paths when platform integrity, cross-tenant risk, or exceptional support governance requires it

### tenant_admin
- Can define tenant approval policies
- Can approve tenant-level administrative exceptions
- Can escalate to platform_admin when platform-wide impact exists
- Should act as the highest normal approver for tenant governance matters that do not require platform intervention

### manager
- Can approve operational and service workflow actions within policy limits
- Can approve scheduling, assignment, and scoped delivery tradeoffs
- Escalates finance-sensitive or policy-breaking actions
- Should be the default business approver for routine operational decisions inside the tenant when policy allows

### operator
- Can request approval and execute approved operational work
- Cannot define approval rules
- Cannot silently bypass approval paths through status changes or operational shortcuts

### finance
- Can approve finance-sensitive flows within tenant policy
- Can reject or return requests that violate cost, billing, or budget controls
- Should be involved whenever approval depends on financial exposure, billing consequence, or budget breach

### inventory
- Can approve stock-related actions within stock policy and thresholds
- Must escalate exceptional losses, adjustments, or emergency stock actions
- Should control approval of inventory-sensitive exceptions where material traceability matters

### field_technician
- Can acknowledge, execute, and report field work
- Can request exceptions but should not approve policy-bound business actions by default
- May confirm execution facts and evidence, but not act as default approver of administrative, financial, or policy exceptions

### auditor
- Read-only visibility into approval trails and exceptions
- No operational approval power by default
- Must be able to inspect requester, approver, justification, timestamp, and affected scope

### support
- Support-scoped actions only, never default business approvals
- Exceptions require explicit bounded support policy
- Support involvement must remain visible, bounded, and reviewable

## Escalation triggers
Escalate when any of the following are true:
- action exceeds tenant financial limit
- action affects multiple tenants or platform integrity
- action changes auth, tenant isolation, or critical security behavior
- action bypasses standard workflow or approval order
- action creates irreversible financial, compliance, or data impact
- action creates high customer-impact risk or service continuity risk
- evidence is insufficient to justify safe approval at the current level

## Exception handling
- Every exception must record requester, approver, justification, timestamp, and affected tenant
- Temporary exceptions should have expiry and review rules
- Emergency exceptions should be separately queryable in audit views
- Exception handling should preserve traceability across product, operations, security, and audit
- No exception path should become a hidden permanent policy

## Operational guidance
- Approval patterns should remain understandable to end users and operators
- Approval burden should scale with impact, not with unnecessary bureaucracy
- UX should show blocked, pending, escalated, approved, rejected, and exception states clearly
- Approval logic must stay aligned with RBAC_MATRIX.md and any future module-specific rules

## Follow-up work
This file is the baseline and must later be decomposed into module-specific approval policies and project release documentation. It should also remain aligned with DESIGN_SYSTEM.md for approval-state semantics and with agent-orchestration/docs/regras-de-negocio.md for approved business rules.