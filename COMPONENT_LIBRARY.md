# ERP Techsolutions — Component Library

## Purpose
Initial shared component library for React and Flutter, aligned with the ERP Techsolutions design system and the operational mission of preserving clarity, execution speed, traceability, and continuity across modules.

## Layers
### Tokens
- color tokens
- typography tokens
- spacing tokens
- border radius tokens
- elevation tokens
- status tokens
- approval-state tokens
- audit and exception tokens

### Primitives
- text
- icon
- button
- input
- checkbox
- radio
- switch
- select
- date picker
- time picker
- divider
- avatar
- tooltip

### Composites
- search bar
- filter bar
- data table
- summary card
- KPI card
- timeline row
- approval panel
- audit row
- tenant switcher
- role badge
- permission summary
- attachment block
- evidence capture block
- blocked-state banner
- escalation summary panel

### Domain components
- work order header
- work order execution checklist
- field visit timeline
- inventory movement card
- approval chain panel
- billing status panel
- tenant policy summary
- authentication context banner
- exception / escalation card
- service SLA indicator
- approval decision card
- evidence review panel
- active-tenant context bar

### Page sections
- dashboard overview section
- module header with contextual actions
- list-detail layout
- approval inbox section
- audit explorer section
- field execution section
- finance summary section
- tenant administration section
- blocked or pending resolution section

## React priorities
1. app shell and navigation
2. auth context wrappers
3. dashboard and module layout primitives
4. table, filters, and status components
5. approval and audit components
6. work-order and field-service domain components
7. tenant context, permission, and exception surfaces

## Flutter priorities
1. app shell and auth context
2. offline-aware list and detail screens
3. work-order execution widgets
4. media/evidence capture widgets
5. status, approval, and sync-state widgets
6. tenant and role-aware navigation blocks
7. blocked-state, retry, and escalation widgets for field execution

## Cross-platform rules
- token names should map cleanly across React, Flutter, and Figma
- semantic state names must remain identical
- domain components should preserve the same business meaning even when UI structure differs by platform
- mobile should optimize field execution; web should optimize coordination, administration, and dense operational control
- permission, approval, exception, and audit semantics must remain consistent across platforms
- component naming should make traceability between design, requirements, and implementation easier

## Operational guidance
- component choices should reduce ambiguity in approval, ownership, and next action
- field-service components must support speed, evidence capture, and weak-connectivity realities
- admin and finance components must support dense data, clear states, and audit readiness
- tenant-sensitive and permission-sensitive context should be surfaced explicitly in relevant components

## Follow-up
This library is the baseline. Detailed per-module page/component mapping should be extended by the React and Flutter specialized skills and later decomposed into project documentation when module-level definition matures.