# T-OMEGA2C — Profissionais (OperatorProfile) (Ω2-c)

## META
Cadastro **Profissionais** (dado sensível LGPD): perfil profissional 1-1 com um Usuário (CNH + consentimento
de rastreamento). Novo módulo registry `operator_profiles`, espelhando price-tables/suppliers. Decisão do
usuário: módulo próprio (não inflar core-saas/users).

## Modelagem
`operator_profiles` 1-1 `users` via **FK composta `(tenant_id, user_id)` → users(tenant_id, id) ON DELETE
CASCADE** + **UNIQUE (tenant_id, user_id)** (um perfil por usuário). Campos: full_name?, cnh_number?,
cnh_category?, cnh_expires_at? (timestamptz), tracking_consent (bool default false), tracking_consent_at?,
phone?, notes?, is_active, audit, timestamps. `driver_id` do model Fine é UUID solto não relacionado (não
tocado). Migration aditiva `20260726000000_add_operator_profiles` (RLS ENABLE+FORCE + policy; uniques;
2 FKs) — **up/down/re-up verificados** (`\d`: forced RLS, 2 FKs, policy).

## Regras (LGPD no centro)
- **Auditoria allowlist estrita:** AuditLog de create/update emite SÓ `{userId, hasConsent, hasCnh}` —
  **nunca** cnh_number nem full_name. (O DTO de leitura, sob `operator_profiles:read`, devolve a CNH; a
  restrição é só sobre auditoria.)
- **Máquina de consentimento (no service):** consent true na criação → carimba `tracking_consent_at=now`;
  false→true → carimba; true→true → preserva; →false → limpa (null); ausente → não toca.
- **1-1:** perfil duplicado p/ o mesmo user → 409 `duplicate_profile` (memory check / P2002).
  user inexistente no tenant → 400 `invalid_user_reference` (P2003, espelho do tariffs).
- **user_id imutável** no update (fora do UpdateInput; service descarta body.user_id).

## TOCADO
- **DB:** model OperatorProfile + back-relations (User/Tenant) + migration. Schema diff 33 inserções puras
  (o agente reverteu o ruído de `prisma format`).
- **Backend:** `src/modules/operator-profiles/` (9 arquivos) + router em app.ts.
- **RBAC:** `operator_profiles:read/create/update` espelho + seed + core-saas.test.ts (26/26).
- **Frontend:** `registry/operator-profiles/` (ProfissionaisPage + OperatorProfileFormModal). Colunas:
  Profissional, Usuário (uuid curto mono), CNH (selo **Vencida** âmbar / **Válida até** verde / **Sem CNH**
  cinza), Rastreamento (chip Consentido/Sem consentimento), Situação (Ativo/Inativo — masculino). `userId`
  imutável na edição (disabled+dica+fora do payload). "tenant"→"organização" na UI. Rota `/cadastros/
  profissionais` + menu GESTÃO; cadastros-nav 8→9. Fonte canônica: estudo doutoral §6.1 (julgamento
  pré-computado nos selos) + §4.2/§4.3.

## RESULTADO TESTÁVEL
- Backend: `check`/`lint`/`build` verde · core-saas **26/26** · **operator-profiles 16/16** (+ regressão
  branches/suppliers/price-tables/tariffs 57/57, navigation-provisioning 13/13) · migration up/down/re-up OK
  · `git diff --check` limpo.
- **Live HTTP** (gestor.demo): create+consent **201** (consent_at carimbado) · 1-1 mesmo user **409** ·
  revogar consent → consent_at **null** · filtro `has_consent=false` traz o revogado · user inexistente
  **400** · cross-tenant **404** · finance **403** · **`audit_logs` sem CNH/nome** (LGPD confirmado no banco).
- Frontend: `check`/`build` verde · `test:smoke` **322/322** (+11; nav 8→9).

## Pendência (para o gate humano)
Definir se Profissionais deve aparecer para `dispatcher`/`finance` na sidebar (hoje só GESTÃO completo =
admin/gestor). Fora do escopo desta fatia.
