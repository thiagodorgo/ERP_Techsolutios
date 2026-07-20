# Ata J-MAPAS-7 · Alocação (backend) — agregado índice de conclusão de OS por técnico

- **Data:** 2026-07-19 · **Branch:** `feat/backend-technician-performance` · diretriz do dono: SEM pendência (construir o backend).

## Escopo
Novo módulo `src/modules/technician-performance/` — `GET /api/v1/operations/technician-performance?operatorUserId=&from=&to=`.
Agregado READ-ONLY sobre `work_orders` (assigned_user_id/status/created_at): `completionRate` = concluídas÷atribuídas por técnico
(**null quando 0 — nunca 0 fabricado**; operador sem OS não vira linha falsa), ordenado por índice desc (ranking p/ alocação).
compute PURO compartilhado InMemory↔Prisma; Prisma com `withTenantRls` + `where.tenant_id` (defesa em profundidade, 3 colunas).
**SEM MIGRAÇÃO** (leitura). DTO omite tenant_id (§2.8). Registrado em `src/app.ts`.

## Votos (time novo)
| Papel | Veredito |
|---|---|
| dev backend | implementado; tsc/lint/build verdes; 9 testes + 45 regressão |
| **analizador** (correção técnica) | **APROVADO** |
| **aprovador-de-acessos** (coordenador-de-acessos, veto) | **APROVADO_CONDICIONADO** |
| validador-mestre (regras/DoD/honestidade) | **APROVADO_CONDICIONADO** |

**Resultado: 1 APROVADO + 2 APROVADO_CONDICIONADO — 0 REPROVADO, 0 BLOQUEIA. Sem junta completa. MERGE após sanar.**

## Condição sanada (ALTA — achado de RBAC)
- **ALTA (coordenador-de-acessos):** gatear por `field_dispatch:read` NÃO excluía o técnico de campo — o papel canônico
  `field_technician` TEM `field_dispatch:read` → leria o ranking gerencial tenant-wide de TODOS os técnicos (excede o
  "field-scoped" da RBAC_MATRIX). **CORRIGIDO:** gate = **`field_dispatch:create`** (a permissão de quem ALOCA) — só
  field_dispatcher/manager/tenant_admin veem o ranking; field_technician/operator/auditor/viewer ficam de fora. Comentário da
  rota reescrito (preciso). **Teste adicionado** provando `field_technician` (read, sem create) → **403** (a garantia antes era falsa,
  testava só o alias `technician`).

## Condições DEFERIDAS (não-bloqueantes)
- **BAIXA (analizador) — `parseOptionalUuid` misnome** (só trim, não valida UUID): nit de nomeação, sem risco (id inválido não casa nada).
- **BAIXA — lacunas menores de teste do compute** (igualdade exata na fronteira da janela; desempates da ordenação) — código correto.
- **P-JMAPAS7-PERF-SCALE:** full-scan vs `groupBy` SQL — **otimização futura, NÃO pendência funcional** (o índice está correto e testado; espelha o financial-summary).

## Rastreabilidade
ID: WS-MAPA alloc-backend · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. backend 1259→1268.
Próximo: FRONTEND da alocação (D/E) — consome este agregado + `haversineKm` + `createDispatch` (todos já existem). Sem pendência.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
