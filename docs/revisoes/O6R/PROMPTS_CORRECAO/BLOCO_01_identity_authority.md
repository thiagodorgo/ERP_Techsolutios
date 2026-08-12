# Prompt — B-O6R-01 Identidade e autoridade

Corrija Ω6R-SEC-001 e Ω6R-TEN-001. Leia CLAUDE.md, PROJECT_MEMORY.md, RBAC_MATRIX.md e o registro Ω6R. Escopo primário: core-saas users/roles, auth active-tenant/me/bootstrap, schema/migrations e platform guard.

Restrições: não correlacionar autorização por e-mail; tenant_admin jamais atribui `super_admin/platform_admin`; identidade global usa subject imutável e membership explícito; migração apenas aditiva/backfill seguro, sem destruição.

Done-when: PATCH tenant-scoped recusa papéis globais; duas identidades homônimas não atravessam tenant; membership real multi-org funciona; JWT usa subject/membership comprovado. Testes E2E de promoção self/other, homônimo A/B, token renovado e RLS com role non-BYPASSRLS. Atualize contrato/API/KPIs e submeta à junta.
