# Junta J-OMEGA3F-7B — Ω3F-7b · Abas Mobile e Quilometragem (front, fecha Ω3F-7)

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-7b-mobile-mileage-front` · **HEAD:** `cbbde1c` (+ fix C1)
- **Baseline:** front `check` + `test:smoke` **440/440** + `build` ok

## Escopo
MileageTab (km + distância + origem app/base + form de correção gated por work_orders:mileage_correct) + MobileTab (timeline de etapas do despacho com hora + preview do checklist congelado). Mapa de posição por etapa DIFERIDO (D-Ω3F-7B-MAPA/P-Ω3F7B-MAPA-ETAPA — sem fonte de dados; Junta de Mapas/Ω3F-8). flip C2 → hub com 7 abas.

## Votos
| Agente | Veredito |
|---|---|
| fid-avaliador (veto) | **APROVADO** — #12/#13/#15 fiéis; mapa diferido é legítimo (confirmou no schema que FieldDispatchEvent não tem lat/lng e FieldOperatorLocation é ao vivo — "posição por etapa" exige backend novo), sem andaime na tela. |
| cognicao-visual (veto) | **APROVADO_CONDICIONADO** — tela viva, §11 ok, mapa sem andaime. C1: coerceValue caía em JSON.stringify p/ objeto aninhado → **CORRIGIDO** ('—'). N1 (hover inline) = dívida pré-existente do DS (mesmo padrão do FinancialTab). |
| coordenador-de-acessos (veto) | **APROVADO** — abas governadas (work_orders:read); form de correção gated por mileage_correct (bate com o backend); MobileTab read-only; sem órfão. |

## Resultado
**APROVADO por unanimidade (3/3).** C1 corrigido no PR. **Ω3F-7 COMPLETO** (7a #197 + 7b este PR).

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.

## Rastreabilidade
- Próximo: **Ω3F-8** (aba Mapa da OS + aba Logs; JUNTA DE MAPAS obrigatória — absorve o mapa de posição por etapa diferido do -7b [P-Ω3F7B-MAPA-ETAPA] + o geocode do destino).
