# Junta J-MAPAS-8 — M-7 SLA real (`sla_due_at`)

- **Data:** 2026-07-21 · Autorização EXPLÍCITA do dono: "autorizo a migração aditiva (sla_due_at), pode construir (testada up/down via dba-guardião)."
- **Plano:** planejador-mapas (J-MAPAS-8) — 2 PRs: **PR-A** (migração + backend) → **PR-B** (frontend countdown). Sem API geo/SKU → junta normal (≥3), NÃO junta-5.

## PR-A — migração aditiva `sla_due_at` + backend

### Escopo
- **Migração** `prisma/migrations/20260817000000_add_sla_due_at/migration.sql`: `ALTER TABLE "work_orders" ADD COLUMN "sla_due_at" TIMESTAMPTZ(6);` — aditiva/nullable, sem backfill, sem índice, RLS herdada. `prisma/schema.prisma` WorkOrder ganhou `sla_due_at DateTime? @db.Timestamptz(6)`.
- **Backend:** `slaDueAt` setável no create/update (reusa `parseOptionalDate` → 400 `invalid_date`; SEM regra de futuro/campo-cruzado — OS pode nascer vencida, evita fabricação) → prisma repo (create/update/record/map) → **`toWorkOrderListDto` + `toWorkOrderDto` expõem `slaDueAt: string|null`** (ISO). §2.8: dado funcional, `changedFields` só a chave sem valor.
- Teste `tests/work-order-sla.test.ts` (7): set-via-create/update, expose lista+detalhe, cross-tenant 404 (read+write), 400 invalid_date, null-safe.

### Votos (junta ≥3, maioria simples — não-crítica)
| Papel | Veredito |
|---|---|
| planejador-mapas | plano J-MAPAS-8 (2 PRs; countdown honesto sobre proxy; guard de teste anti-fabricação) |
| dev backend | implementado; migração provada up/down/re-up no Postgres vivo; 7/7; suíte memória 1302/1296 pass/0 fail |
| **agente-dba-guardião** (veto migração) | **APROVADO** |
| **analizador** (correção técnica) | **APROVADO** |
| **coordenador-de-acessos** (RLS/§2.8/tenant) | **APROVADO** |

**Resultado: 3 APROVADO — 0 REPROVADO, 0 BLOQUEIA/ALTA/MEDIA. MERGE.**

### Prova do dba-guardião (migração up/down)
UP (`prisma migrate deploy`) → coluna `sla_due_at | timestamp with time zone | nullable YES`; RLS `relrowsecurity=t, relforcerowsecurity=t`, policy `work_orders_tenant_isolation` presente. DOWN (`DROP COLUMN IF EXISTS`) → coluna some, **17 linhas + data_md5 `07f66c3...` INTACTOS**, RLS t/t. RE-UP → coluna volta idêntica, idempotente. **Aditiva não-destrutiva, reversível, RLS herdada — provado no `erp-postgres` vivo.**

### Confirmações
- D-007: migração sem CHECK/default; sem regra que force prazo → nenhuma fabricação. O countdown honesto (só com `sla_due_at` real) é do PR-B; PR-A só habilita o dado.
- Isolamento: `slaDueAt` tenant-scoped (findById/update `where tenant_id+id` sob `withTenantRls`; 404 cross-tenant provado). Coluna nova herda RLS ENABLE+FORCE+policy sem re-policy.
- §2.8: `sla_due_at` funcional (prazo), não sensível; DTO não vaza tenant_id; changedFields só a chave.
- Permissão: reusa `work_orders:create/update` (nenhuma nova). Backend é a autoridade.

### BAIXA (registrada, já coberta)
- dba: "runbook de rollback no docs/deployment.md" → **já existe** (Runbook A forward-only, P-007, linhas 61-72) + o header da migração documenta o `DROP COLUMN`. Sem ação nova.

## Rastreabilidade
ID: J-MAPAS-8 / PR-A · PR: (após `gh pr create`) · migração `20260817000000_add_sla_due_at`. backend 1289→1296 (+7 work-order-sla), blocks 69→70.
**Próximo: PR-B (dev-mapas)** — countdown honesto no `operations-map.adapter` ("vence em X"/"vencido há X" com `sla_due_at`; proxy quando null) + propagação de tipos + consumidores (lista + popup) + testes + changelog em `kb-mapas.md`. Landmines: NÃO confundir com o mock legado `work-orders/types.ts:25` nem tocar o `DispatchConsolePage` estático ("vence em 28 min" mock, fora do escopo).
