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

## PR-B — countdown honesto no Mapa (frontend, dev-mapas)

### Escopo
`operations-map.adapter`: `formatIncomingCallSlaProxy` emite **"vence em {X}"** (futuro) / **"vencido há {X}"** (passado) SOMENTE
quando `slaDueAt` real e parseável; senão cai no **proxy honesto de Fase 1 INTACTO** (Agendado/Aberto). `formatDuration` extraído
e reusado por `formatLastSeen` (fonte única). `incomingCallSlaProxyTime` = `slaDueAt ?? scheduledFor ?? createdAt` (puro,
determinístico). Tom de urgência via `data-tone` (danger vencido / warning <30min `SLA_DUE_SOON_THRESHOLD_MS` / info futuro /
neutral proxy) + CSS. Propagação de tipos (pin/withoutLocation/incoming). Consumidores: lista + popup de alocação. +10 testes.
`kb-mapas.md` changelog datado. **Landmines respeitados:** mock legado `work-orders/types.ts:25` e `DispatchConsolePage` NÃO tocados.

### Votos
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; check/build/test:smoke verdes (650→660, +10) |
| **avaliador-mapas** (veto — honestidade/espelho/LGPD) | **APROVADO** |
| **analizador** (correção técnica) | **APROVADO** |
| **cognicao-visual** (§11) | **APROVADO** |

**Resultado: 3 APROVADO — 0 REPROVADO, 0 BLOQUEIA/ALTA/MEDIA. MERGE.**

### Confirmações da junta
- D-007: countdown SÓ com `slaDueAt` real e parseável; lista toda-null NUNCA mostra "vence em"/"vencido" (guard de teste #8
  reescrito); null/inválido → proxy sem crash.
- Espelho MapLibre↔Google: `mapMarkers.ts` (canvas/GeoJSON) NÃO tocado; `slaDueAt` fora das `properties` do pin (teste prova).
  LGPD §12: `OperationsIncomingCall` sem lat/lng; `slaDueAt` fora de log.
- Fuso: `slaDueAt` instante completo → `Date.parse` ok, sem `new Date` de date-only.
- BAIXA (avaliador+cognicao-visual): tons em hex cru no `app.css` (rail navy) em vez de token — segue a convenção pervasiva do
  módulo (o TSX não tem hex; aplica via `data-tone`); advisory, follow-up de tokenização se/quando o DS ganhar paleta de rail.

## Rastreabilidade
ID: J-MAPAS-8 · **PR-A** migração+backend (backend 1289→1296, blocks 69→70) · **PR-B** frontend countdown (smoke 650→660).
Migração `20260817000000_add_sla_due_at`. **M-7 SLA real COMPLETO — Fase 2 do Mapa FECHADA.** ETA por rota real (junta-5+PD)
NÃO foi feita — o dono dispensou o serviço pago; distância/tempo seguem por estimativa honesta ("~X km linha reta / ~Y min sem trânsito").
