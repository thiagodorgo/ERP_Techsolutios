# PLANO Ω6R — blocos de correção

Regra: 1 bloco = 1 branch = 1 PR. Ordem abaixo é vinculante por dependência; P0 precede P1. Cada PR atualiza KPIs conforme o contrato do repo e executa junta própria.

| Ordem | Bloco / branch sugerida | Achados | Aceite e testes obrigatórios | Dep. | Esforço |
|---:|---|---|---|---|:---:|
| 1 | B-O6R-01 `fix/identity-authority` | SEC-001, TEN-001 | tenant_admin não atribui papel global; subject global+membership; E2E homônimo e promoção | — | G |
| 2 | B-O6R-02 `fix/financial-uow` | DIN-001..004, DIN-008, QUA-003 | UoW tenant-scoped; locks; pay/reverse/cheque/title/close em PostgreSQL concorrente | 1 | G |
| 3 | B-O6R-03 `fix/expense-sync-atomic` | DIN-009, QUA-001 | efeito+receipt atômico/fingerprint; Flutter autenticado; crash/race/refresh | 1 | G |
| 4 | B-O6R-04 `fix/inventory-consistency` | DAT-002, DAT-003, QUA-002 | lock/CAS saldo, close único, contrato mobile Prisma e restart | 1 | G |
| 5 | B-O6R-05 `fix/production-runtime-gates` | DAT-001, DIN-006 | production exige Prisma+worker; heartbeat/gate; compose/fly smoke persistente | — | M |
| 6 | B-O6R-06 `fix/billing-durability` | DIN-005, DIN-007 | outbox/inbox para usage; SUM/GROUP BY sem truncamento; fault injection e 10.001 itens | 2,5 | G |
| 7 | B-O6R-07 `fix/authorization-and-uploads` | SEC-002, SEC-003, SEC-004 | object-scope/SoD, lockout atômico, scanner fail-closed/magic bytes | 1 | G |
| 8 | B-O6R-08 `fix/durable-jobs-realtime` | ARQ-001..003, PERF-001 | lease/reclaim, singleton schedule, concurrency/deadline, broadcast/replay SSE | 5 | G |
| 9 | B-O6R-09 `fix/dispatch-atomic-timeline` | ARQ-004 | despacho+evento atômicos e idempotentes; fault injection | 8 | M |
| 10 | B-O6R-10 `fix/client-load-shedding` | PERF-002, PERF-003 | single-flight/Abort; pipeline imagem isolado; testes p99/RSS/out-of-order | 5 | G |
| 11 | B-O6R-11 `fix/mobile-work-order-contracts` | QUA-004, QUA-005 | envelope/casing/payload real; enqueueAll durável; testes Dio/Drift/restart | 1 | M |

## Gates transversais

- P0 financeiro/dados: teste PostgreSQL real com duas conexões/barreira e invariantes finais.
- Tenancy/auth: testes negativos cross-tenant, horizontal e vertical; backend é autoridade.
- Mobile: fila local só marca sucesso após persistência e confirmação remota idempotente.
- Jobs: crash entre claim/ack, handler travado, restart e três réplicas.
- Nenhum bloco introduz serviço externo pago sem junta unânime 5/5.
