# Relatório final — Rodada BLOCO-AUTO A→D

> Rodada executada em **2026-07-07** a partir de `main@ebc3e82` (B-124K). **13 PRs abertas,
> validadas e mergeadas** (#127–#139), todas com CI 3/3 verde (backend/frontend/flutter),
> squash merge + branch deletada. **KPIs NÃO publicados** — propostos abaixo, publicação só
> após avaliação humana (CLAUDE.md §C3). Checklist vivo: `lista-execucao.md`.

## 1. Resumo por bloco (PR · merge · gates · testes N/M · skills)

| # | Bloco | PR | Merge | Testes (entregues) | Skills/Agents |
|---|---|---|---|---|---|
| 0 | A0 Plano+skills | #127 | `bb35341` | documental | (documental) |
| 1 | A1 Cliente | #128 | `4a9b4de` | 12 backend + 7 web (baseline 6) | saas-mt, ts-ff, ui-ux, pixel-master |
| 2 | A2 Viatura | #129 | `3ee4af3` | 13 backend + 7 web (baseline 6) | idem |
| 3 | A3 Equipe | #130 | `9b9ab52` | 18 backend + 7 web (baseline ~8) | idem |
| 4 | A4 Catálogo | #131 | `67e47ee` | 15 backend + 7 web (baseline 7) | idem |
| 5 | A5 Menu Cadastros | #132 | `9461e1f` | 5 nav RBAC | ts-ff, ui-ux, pixel-master |
| 6 | B1 OS+snapshot | #133 | `842cd58` | 10 backend + 3 web + regressão 6/6 | saas-mt, ts-ff, ui-ux, pixel-master |
| 7 | B2 Cadastro rápido | #134 | `1b683da` | 2 web (+gating) | ts-ff, ui-ux, pixel-master |
| 8 | C1 Listas densas | #135 | `34500f6` | 9 lógica pura | ts-ff, ui-ux, pixel-master |
| 9 | C2 Detalhe OS | #136 | `13b1fcb` | 5 backend + 6 web + regressão 16/16 | saas-mt, ts-ff, ui-ux, pixel-master |
| 10 | C3 Dashboard | #137 | `6d060e7` | 8 backend + 4 web | saas-mt, ts-ff, ui-ux, pixel-master |
| 11 | D2 Cliente mobile | #138 | `5d3b5f9` | 6 flutter (Drift v10) | flutter-expert, flutter-ai-architect |
| 12 | D1 Viatura/equipe mobile | #139 | `f5d9770` | 5 backend + 12 flutter + regressão 39/39 (Drift v11) | flutter-*, saas-mt, pixel-master |

Cota 150% cumprida em todos os blocos com código (os 5 testes de isolamento da skill
saas-multi-tenant presentes em toda entidade nova). Todo bloco com tela passou pela revisão do
**frontend-pixel-master** ANTES do push — 8 revisões, com correções reais aplicadas em 7 delas
(ex.: token "active" cru na UI, colisão de rótulos Status×Situação, grid desbalanceado do form
de OS, parser de moeda pt-BR, gating por permissão do cadastro rápido, tokens de tema no mobile).

## 2. Entidades e módulos backend criados

| Entidade | Tabela | Módulo | Rotas |
|---|---|---|---|
| Customer | `customers` | `src/modules/customers/` | `POST/GET/GET:id/PATCH /api/v1/customers` |
| Vehicle | `vehicles` | `src/modules/vehicles/` | `POST/GET/GET:id/PATCH /api/v1/vehicles` |
| Team + TeamMember | `teams`, `team_members` | `src/modules/teams/` | CRUD + `POST/DELETE /teams/:id/members` |
| ServiceCatalog | `service_catalog` | `src/modules/service-catalog/` | CRUD `/api/v1/service-catalog` |
| Dashboard (agregados) | — (read-only) | `src/modules/dashboard/` | `GET /api/v1/dashboard/summary` |

Padrões: tenant da claim (nunca do body), `@@unique([tenant_id, id])` + chave de negócio composta,
RLS (`ENABLE`+`FORCE` + policy `app.current_tenant_id`), desativação lógica via `is_active`
(nunca delete físico), auditoria best-effort, envelope de erro `{error:{code,reason,message}}`,
404 cross-tenant, 409 duplicado no mesmo tenant / 201 em outro.

## 3. Migrations (todas aditivas; up E down testados no `erp-postgres` local)

| Migration | Rollback manual (P-007) |
|---|---|
| `20260707000000_add_customers` | `DROP TABLE customers` |
| `20260708000000_add_vehicles` | `DROP TABLE vehicles` |
| `20260709000000_add_teams` | `DROP TABLE team_members; DROP TABLE teams` (ordem FK) |
| `20260710000000_add_service_catalog` | `DROP TABLE service_catalog` |
| `20260711000000_add_work_order_registry_fks` | drop 4 constraints + 4 índices + 4 colunas (header da migration) |

Drift (mobile): schemaVersion 9→10 (D2: `customer_document`/`customer_phone`) →11 (D1:
`vehicle_id`/`vehicle_plate`/`team_id`/`team_name`), `ADD COLUMN` guardado, não-destrutivo.

## 4. Contratos criados/alterados

- **B1:** `POST /work-orders` aceita `customer_id`/`vehicle_id`/`team_id`/`service_catalog_id`
  opcionais; snapshot de cliente **derivado no servidor** e congelado (teste obrigatório verde:
  renomear cadastro não altera OS antiga).
- **C2:** `GET /work-orders/:id` ganha `links{customer,vehicle,team,serviceCatalog}` (só detalhe).
- **C3:** novo `GET /dashboard/summary` (permissão `dashboard:read` existente).
- **D1:** `work_order.assign` (mobile sync + REST) ganha `vehicle_id?`/`team_id?` — **aditivo**;
  versão `mobile_work_order_actions_sync` `2026-06-14.b098b → 2026-07-07.d1`. Idempotência/
  tenant/lote/conflitos inalterados (dentro do limite "campo aditivo opcional").

## 5. Rollback por PR

Todas squash-merged: `git revert <merge>` desfaz o bloco. Para blocos com migration, somar o
DROP manual da tabela (§3) + `npx prisma migrate resolve --rolled-back <migration>`. Blocos
frontend-only (A5, B2, C1) e de enriquecimento (C2, C3, D1 backend) revertessem limpo sem schema.

## 6. Testes — antes → depois

| Suíte | Antes | Depois |
|---|---|---|
| Backend CI (`npm test`, core-saas) | 15/15 | 15/15 (inalterado; catálogo de permissões sincronizado) |
| Backend novos desta rodada (12 arquivos) | — | **86/86** |
| Frontend `test:smoke` | 44/44 | **101/101** (+57) |
| Flutter (suíte completa) | 764/764 | **782/782** (+18) |
| Regressões monitoradas (WO/FD/snapshot/links/mobile-contracts) | — | 39/39 inalteradas em todo bloco que tocou OS |

Baseline conhecida (P-003): 2 testes fora do CI já vermelhos na `main` antes da rodada —
sem NOVAS falhas introduzidas.

## 7. Governança e rastreabilidade

- `git branch -a` sem nenhuma branch `bloco-*` (todas deletadas pós-merge). As ~120 branches
  legadas pré-rodada não foram tocadas (fora de escopo).
- Decisões registradas: D-005 (rodada auto-merge), D-006 (layout de skills), D-007 (sem dado
  fabricado nas telas novas), D-008 (dashboard híbrido/paineis — **confirmar**), D-009 (viatura/
  equipe via `work_orders:assign`, despachante seleciona — **confirmar**; técnico selecionar
  exigiria RBAC novo).
- Pendências abertas: P-003 (2 testes vermelhos pré-existentes), P-004 (código morto/sidebar dupla),
  P-005 (search.py da skill), P-006 (RLS ampliada — proposta), P-007 (rollback manual Prisma),
  P-008 (fallback mock do work-orders), P-009 (contraste muted do DS), P-010 (código morto do
  adapter de dashboard), P-011 (badge de aprovações hardcoded).
- `RBAC_MATRIX.md` atualizado a cada entidade/rota nova. Validações de formato de documento/placa
  = só tamanho/charset (dígito verificador CPF/CNPJ e formato oficial de placa: fora desta fase).

## 8. KPIs propostos (NÃO publicados — aguardam avaliação humana, §C3)

- Flutter **782/782** · Frontend smoke **101/101** · Backend core-saas **15/15** + **86** testes
  novos de módulo · 13 PRs mergeadas · contrato `mobile_work_order_actions_sync@2026-07-07.d1`.
- Publicação em bloco `…K` separado, com PR #, merge commit e approved head reais, após gate humano.
