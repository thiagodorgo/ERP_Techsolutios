# T-ACESSO — Provisionamento dinâmico de módulos + acesso por papel (Ω-ACESSO)

## META
Consertar a cadeia de acesso ponta a ponta: os 9 papéis demo logam, e o **Mapa Operacional** aparece no
menu para os papéis certos (tenant_admin/manager/operator operam; auditor só leitura; finance/inventory/
support/field_technician não veem no web). Diagnóstico por **login real** antes de qualquer fix.

## DIAGNÓSTICO (login real — fato, não hipótese)
Subi a API (prisma) e loguei os 9 papéis. Achado: **`GET /api/v1/navigation/menu` devolvia 0 itens para
TODOS os papéis** (inclusive admin). Causa: `prisma-core-saas.store.mapTenantFromPrisma` retornava
`modules: []` hardcoded (a tabela `tenants` não tinha coluna `modules`), e `filterNavigationByTenantModules`
remove todo item com `requiredModules` quando os módulos estão vazios (~19/23 itens são module-gated). Login
funciona para todos (sem allowlist). O 2º sintoma certificado ("featureKey operations_map não provisionado")
é este mesmo: sem módulo provisionado, o item some do menu backend.

## TOCADO (rotas · arquivos)
- **Migration aditiva** `prisma/migrations/20260722000000_add_tenant_modules/migration.sql` — coluna
  `tenants.modules TEXT[] NOT NULL DEFAULT '{}'` + provisiona o tenant `demo` (idempotente por slug).
- `prisma/schema.prisma` — `Tenant.modules String[] @default([])`.
- `src/modules/core-saas/store/prisma-core-saas.store.ts` — `mapTenantFromPrisma` lê `tenant.modules`;
  `createTenant` persiste modules.
- `src/modules/core-saas/repositories/tenant.repository.ts` — `create` aceita/grava `modules`.
- `prisma/seed.ts` — provisiona o tenant demo com o conjunto padrão (base para DB nova).
- `src/modules/core-saas/permissions/catalog.ts` — **operator ganha `field_location:read`** (opera o mapa).
- `src/modules/navigation/navigation.service.ts` — `getGovernedNavigationPaths()` (paths governados).
- `src/modules/navigation/navigation.routes.ts` — expõe `governedPaths` nos metadados do menu.
- `frontend/src/modules/navigation/{navigation.types.ts,useNavigationMenu.ts}` — thread `governedPaths`.
- `frontend/src/layouts/AppShell.tsx` — **gating dinâmico**: path governado não-visível entra em `hidden`
  (sidebar esconde). No fallback (backend fora) nada extra é escondido.
- `.claude/agents/inspetor-de-rotas.md` — upgrade: featureKey/moduleKey × provisionamento + login→menu→clique.
- `docs/navigation-matrix.md` (matriz do mapa + eixo de provisionamento), `docs/demo-credentials.md`.

## Screen-element-map — cadeia de acesso
| Elo | Origem | Comportamento |
|---|---|---|
| Login por papel | 9 usuários demo (seed-users) | senha certa → 200 + token; errada → 401 uniforme |
| Módulos do tenant | `tenants.modules` | governa itens com `requiredModules` |
| Menu backend | `GET /navigation/menu` | filtra por permissão + módulo; expõe `governedPaths` |
| Sidebar | AppShell | esconde path governado não-visível (gating dinâmico) |
| Mapa por papel | `field_location:read` + módulo `field_operations` | admin/manager/operator operam; auditor R; demais — |

## RESULTADO TESTÁVEL (login real, validado)
Matriz efetiva do mapa (itens no menu / MAPA presente): plataforma 22/✅ · admin 18/✅ · gestor 11/✅ ·
operador 8/✅ · auditor 10/✅ · financeiro 1/❌ · estoque 1/❌ · suporte 5/❌ · tecnico 4/❌ (web) — **bate com
a matriz**. Gating dinâmico provado: remover `field_operations` do tenant → MAPA some (18→15 itens);
restaurar → volta. Migration up/down/re-up OK. `npm run check` (back e front) verde.

## Aprendizado (registrado no inspetor + master-teste)
Uma junta 5/5 aprovou o Mapa sem validar `login→menu→clique`. O **caminho do usuário com login real** e o
cruzamento **featureKey/moduleKey × provisionamento do tenant** viram etapa obrigatória.
