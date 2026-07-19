# Ata J-MAPAS-6 · M-5 — Alerta de OS nova (FECHA a Fase 1)

- **Data:** 2026-07-19 · **Branch:** `feat/frontend-map-m5-alert` · req. 3 do dono. **Último bloco da Fase 1.**

## Escopo
`useNewWorkOrderAlert` (hook + núcleo puro `reduceNewWorkOrders`/`resolvePulseIds`): diff client-side dos ids de `incomingCalls`
entre refreshes → alerta em **3 camadas**: TOAST (`role=status`/`aria-live=polite`, PT-BR, cor por prioridade/token, sem
coordenada), BADGE `--new` no rail de chamados, PULSO no pin novo (reusa `wo-pulse`; halo por `priorityColor`). Anti-alert-fatigue.
Touch-up de terminologia (header/empty-states → "técnicos"). Feedback honesto de seleção sem-GPS.

## Votos
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; bateria verde (tsc; mapa 112/112 — meta ≥110; smoke 565→581; build OK) |
| **avaliador-mapas** | **APROVADO_CONDICIONADO** (8/8 itens de veto + lentes a-h PASS; 0 BLOQUEIA; sem R-MAPAS) |

Checklist (todos PASS): (a) sem SKU/provider intacto; (b) **anti-alert-fatigue** (não alerta no mount; dedup por Set incl.
overflow; teto por ciclo; toast TTL auto-expira/dispensável); (c) **LGPD** (item de alerta só `{id,code,priority}`, sem lat/lng;
HTML não vaza coordenada); (d) **pulso** (halo por `priorityColor` honesto — urgente vermelho, novo não-urgente na própria cor;
parada garantida por `cancelAnimationFrame`; Google degrada sem quebrar); (e) a11y (toast não rouba foco; `prefers-reduced-motion`
zera pulso, realce estático permanece); (f) §11/PT-BR (toast coeso; terminologia reconciliada; sem hex solto); (g) honestidade
(sem-GPS com feedback honesto, nada fabricado); (h) escopo (sem backend/SLA-real/provider/SKU; **zero dependência nova**; +16 testes).

## Condição sanada
- **BINDING (item 8) — KB M-5 + fechar RESÍDUO(M-5):** SANADA — `docs/maps/kb-mapas.md` ganhou o changelog M-5 (halo por
  prioridade; padrão anti-alert-fatigue) e marcou RESOLVIDOS o feedback sem-GPS e `P-MAPA-TERM-OPERADORES-HEADER`.

## FASE 1 DO REDESIGN DO MAPA — FECHADA
Os **6 requisitos do dono** cobertos (frontend/US$ 0):
1. Lista de chamados + prioridade + SLA-proxy → **M-4**.
2. Técnicos posição + status/disponibilidade → **M-3**.
3. Alerta visual de OS nova → **M-5 (este PR)**.
4. Mapa ≥2× / full-bleed dominante → **M-1 + redesign de layout (#238)**.
5. Maximizar + lista translúcida no 4º quadrante (Esc + focus-trap) → **OperationsMapStage (redesign de layout)**.
6. Rodapé de legenda unificado → **M-2**.

Resta apenas a **Fase 2 = M-7 (SLA real, migration aditiva `sla_due_at` tenant-scoped)** — fora da Fase 1.

## Rastreabilidade
ID: WS-MAPA M-5 · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. KPI smoke 565→581. Baseline mapa 96→112.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
