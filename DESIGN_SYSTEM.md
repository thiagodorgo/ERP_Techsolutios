# ERP Techsolutions — Design System

## Purpose
Shared design system baseline for React, Flutter, and Figma. It should support the operational mission of ERP Techsolutions by increasing clarity, confidence, speed, traceability, and decision support across the platform.

## Product qualities
- operational clarity
- trust and control
- speed for repetitive work
- strong state visibility
- low ambiguity in approvals, status, and exceptions
- continuity across web, mobile, and future module expansion

## Design principles
- prioritize operational readability over visual ornament
- make tenant, status, risk, approval, and blockage states unmistakable
- optimize for daily ERP usage with dense but structured screens
- keep web and mobile behavior aligned, with platform-appropriate adaptation
- support field operation as seriously as administrative coordination
- reinforce auditability, approval visibility, and exception awareness through interface semantics

## Color system
### Core
- Primary: deep industrial blue for trust and command actions
- Secondary: slate / steel neutrals for structure and dense interfaces
- Accent: focused cyan or electric blue for active workflow emphasis

### Semantic ERP states
- Success / completed
- Warning / attention needed
- Danger / blocked or critical error
- Info / informational status
- Pending / waiting approval or execution
- Escalated / higher-level intervention required
- Draft / not yet committed
- Scheduled / planned future action
- In service / field execution in progress
- Reconciled / financially or operationally validated
- Audit / traceability view state
- Exception / policy deviation under review

## Typography
- Sans-serif UI family for clarity and density
- Strong hierarchy for page title, section title, table emphasis, labels, helper text
- Numeric and tabular readability for finance, inventory, and operational grids
- Clear distinction between command actions, evidence text, audit text, and helper text

## Spacing
- consistent spacing scale for tokens
- compact mode support for dense ERP tables and forms
- larger spacing only for summaries, empty states, and high-level dashboards
- preserve scanning efficiency for operational users under time pressure

## Core components
- buttons
- icon buttons
- inputs
- selects
- date/time pickers
- tables and data grids
- cards
- tabs
- side navigation
- top bars
- badges
- status chips
- drawers
- modals
- confirmation panels
- timeline / activity log
- approval stepper
- audit log row patterns

## States
Every major component should define:
- default
- hover / focus (web)
- active
- disabled
- loading
- empty
- error
- success
- blocked
- escalated
- read-only
- pending approval
- exception
- audit-visible

## Approval and control patterns
- approval cards should show requester, impact, threshold, urgency, and next approver
- blocked states should explain why the action is blocked and what resolves it
- escalation states should show who now owns the decision
- destructive actions should be visually distinct and confirmation-bounded
- audit and exception-related UI should make traceability visible without overwhelming primary workflows

## Figma alignment
- Figma should use the same naming for tokens, semantic states, and component families
- Web and mobile libraries should inherit from the same semantic model, even when implementation differs
- Figma artifacts should help preserve consistency between strategy, UX, and implementation rather than becoming a disconnected design layer
- The current repository technical implementation is being organized around React, Flutter, and a Node.js + TypeScript backend baseline, pending final architectural validation

## Operational alignment
- design should support both administrative precision and field execution speed
- tenant context should be visible where it affects decisions or risk
- permission-sensitive actions should present state clearly before the user attempts the action
- approval, blocked, escalated, reconciled, and evidence-capture moments should be treated as first-class design situations

## Implementation note
This file is the semantic source of truth. Detailed tokens and component mappings belong in COMPONENT_LIBRARY.md and later project documentation.
