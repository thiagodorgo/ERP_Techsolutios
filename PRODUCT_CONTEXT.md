# ERP Techsolutions — Product Context

## Company name
Techsolutions

## Product identity
- Official system name: ERP Techsolutions
- Type: Multi-tenant SaaS ERP
- Initial version: V-0.01
- Primary objective: deliver a production-ready, operational, tested, and sellable ERP, not an incomplete prototype

## Mission of this agent in the project
This agent is the persistent operational base of ERP Techsolutions. It exists to support planning, discovery, requirements, business rules, architecture, UX, security, documentation, and technical execution without treating the project as a prototype or relying only on chat history.

### Core mission areas
#### Structure the project
- transform dispersed context into a formal working base
- consolidate decisions into persistent files
- preserve continuity across sessions
- preserve technical, functional, and operational traceability

#### Drive discovery and definition
- organize the project in validated blocks
- separate fact, hypothesis, risk, and recommendation
- use files, Memory, strong references, and explicit user approval

#### Design the ERP
- define domain, modules, roles, flows, permissions, and approvals
- structure real multi-tenant architecture
- keep backend, web, mobile, cloud, auth, and contracts aligned

#### Raise technical quality
- use real security, not generic security language
- guide backend C decisions with rigor on memory, performance, and robustness
- preserve consistency across React, Flutter, Figma, design system, and component library
- escalate to specialized skills when depth is required

#### Orchestrate execution
- break work into small executable blocks
- maintain schedule, decisions, task history, and execution evidence
- use GitHub as technical source of truth when needed
- continue autonomously after validated blocks until the next real blocker or approval point

## Business focus
- Initial commercial focus: field technical services
- Future expansion: industry, additional ERP modules, and new verticals
- Primary benchmark: AutEM
- Competitive directive: every material product and architecture decision should seek perceptible advantage over the benchmark in clarity, efficiency, control, security, and user experience

## Product surface
The platform should start with a strong field-service core and an architecture capable of expanding into a broader ERP. The initial scope should support service operations, work orders, identity and access, approvals, inventory interactions, finance dependencies, auditability, and tenant administration without blocking future manufacturing and industry-oriented modules.

## Target outcomes
- Sellable first release
- Strong multi-tenant isolation and operational control
- Clear workflow support for field operation, coordination, approvals, and traceability
- Shared documentation and skill-driven execution that survives across sessions
- Operational continuity independent of chat history alone

## Technical stack
- Cloud: AWS
- Backend recorded in historical agent baseline: C
- Backend currently reflected by the official repository and imported documentation: Node.js + TypeScript
- Frontend web: React
- Mobile: Flutter
- Production authentication: Amazon Cognito
- Development authentication: local auth compatible with the Cognito logical contract
- Module integration: asynchronous by default
- Official GitHub repository: https://github.com/thiagodorgo/ERP_Techsolutios

## Open architecture conflict
- There is an explicit conflict between the historical agent baseline and the current repository state.
- This repository organization was aligned provisionally with the current GitHub repository and the documentation package imported on 2026-05-07.
- Final validation is still needed before this conflict can be considered closed.

## Auth and authorization baseline
- Production auth provider: Amazon Cognito
- Development auth mode: local, but contract-compatible with Cognito
- Required claims baseline:
  - sub
  - tenant_id
  - tenant_role
  - tenant_roles
  - permissions
  - email
  - scope
- tenant_id and tenant_role are mandatory for authenticated access
- React and Flutter should use claims for UX context and state shaping
- Final authorization always happens in the backend
- Explicit support for multi-tenant access
- If a user belongs to multiple tenants, the active tenant must be clearly resolved

## Standard roles
- platform_admin
- tenant_admin
- manager
- operator
- finance
- inventory
- field_technician
- auditor
- support

## Functional scope baseline
The ERP should be able to cover and evolve these functional areas:
- identity and access
- dashboard
- master data
- purchasing
- inventory
- finance
- billing
- work orders
- workflow and approvals
- reports and audit
- tenant administration

## Documentation priority order
1. Explicit user-approved decisions
2. This file
3. RBAC_MATRIX.md
4. APPROVAL_LIMITS.md
5. DESIGN_SYSTEM.md
6. COMPONENT_LIBRARY.md
7. agent-orchestration files
8. Attached analytical PDF and other attached reference documents
9. Official documentation and strong web references
10. Clearly marked agent hypotheses when nothing else is available

## Metrics and goals
- Release a first version that is operational, testable, and commercially presentable
- Reduce ambiguity in requirements, architecture, and delivery sequencing
- Preserve traceability across requirements, design, code, validation, and release readiness
- Establish a reusable operational base for future module and vertical expansion

## Source preferences
1. Explicit user-approved decisions
2. Attached agent files and structured project documentation
3. Memory when prior decisions have already been validated
4. Official vendor documentation (AWS, Cognito, React, Flutter, C toolchain)
5. Strong market and benchmark references, especially AutEM and adjacent ERP/field-service products
6. Agent inference only when necessary and always marked as hypothesis

## Working rules for specialized skills
- Start with existing files
- Then check Memory
- Then use strong web references
- Then ask for direct validation only when needed
- Validate block by block
- Separate evidence from hypothesis
- Never treat a block as final without explicit user approval
- Continue automatically after a block is approved
- Escalate to a more specialized skill instead of improvising low-quality work

## Operational phases
- Discovery
- Definition
- Architecture
- Execution
- Validation
- Persistence

## Persistence rule
Anything materially relevant to product, architecture, permissions, approvals, UX, execution, or traceability should be written into agent files or the operational structure, not left only in chat.
