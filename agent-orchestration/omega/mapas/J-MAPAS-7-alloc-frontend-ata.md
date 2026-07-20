# Ata J-MAPAS-7 · Alocação (frontend D/E) — FECHA o feedback do Mapa

- **Data:** 2026-07-19 · **Branch:** `feat/frontend-map-allocation` · feedback do dono (D+E).

## Escopo
- **D (chamados):** click → popup de detalhe honesto + "Alocar técnico" (gated `canCreateDispatch`) → lista RANQUEADA + filtros
  (Disponível / Mais próximo=distância haversine asc / Maior índice=completionRate desc) → "Alocar" = `createDispatch`.
- **E (técnicos):** linha+status; HOVER → tooltip (status/frescor/equipe/OS, NUNCA lat/lng) + realça o pin; CLICK → popup com
  dados + seletor de chamado → distância "~X km (linha reta)" + tempo "~Y min (estimado, sem trânsito)" (÷28km/h, disclaimer) + "Alocar".
- Novos: `technician-performance.service`, `allocation.ts` (helpers PUROS), hooks (`useTechnicianPerformance`/`useAllocateDispatch`),
  `MapAllocationDialog` (a11y glass, reusa a máquina do KpiDetailModal), 2 popups. Alocação REAL via `createDispatch` (404/409/422 traduzidos).

## Votos (time novo — 4 avaliadores)
| Papel | Veredito |
|---|---|
| dev-mapas | implementado; tsc/build verdes; mapa 128/128; smoke 581→597 |
| **analizador** (correção/honestidade) | **APROVADO** |
| **aprovador** (avaliador-mapas, veto) | **APROVADO_CONDICIONADO** |
| **aprovador-de-acessos** (coordenador, veto) | **APROVADO** |
| cognicao-visual (§11/visual) | **APROVADO** |

**Resultado: 3 APROVADO + 1 APROVADO_CONDICIONADO — 0 REPROVADO, 0 BLOQUEIA. Sem junta completa. MERGE após sanar.**

Confirmações: honestidade (haversine "linha reta"; tempo "estimado, sem trânsito"; **nunca "chega às"/ETA fabricado** — testado
`doesNotMatch`; null→"—"; sem coordenada→"indisponível"); **alocação REAL** (createDispatch com payload certa nos 2 lados,
sucesso só após await, 404/422 traduzidos); **LGPD** (zero lat/lng no HTML/tooltip/log — testado); **gating** (Alocar só com
`field_dispatch:create`; hook só busca quando pode alocar — duplo-gate); a11y (popup vidro focus-trap/Esc; ≥44px; foco visível).

## Condições sanadas
- **ALTA (avaliador) — KB desatualizado:** SANADA — changelog J-MAPAS-7 alocação (ETA honesto; null→"—"; technician-performance
  read-only gate create; popup lateral não-modal).
- **ALTA (avaliador) — KPI:** SANADA — `Kpis/*` frontend_smoke 581→597 (+16).
- **BAIXA (analizador) — import morto `operatorUserIdOf`:** removido.
- **BAIXA (avaliador) — painel de detalhe concorrente com o popup:** SUPRIMIDO (detalhe abaixo não renderiza com popup aberto).

## Condições DEFERIDAS (BAIXA, não-bloqueantes)
- teste dedicado de LGPD do tooltip novo + teste do ramo sem-permissão do popup E (as superfícies já são coordenada-free por
  construção + a LGPD/gating são provados nos popups e pelo coordenador); nota de 11px/hex-cru consistente com o padrão existente.

## FEEDBACK DO DONO SOBRE O MAPA — COMPLETO
Polish (A legenda única / B rail-pílula / C fullscreen nativo) + Alocação (D popup+filtros / E lista+hover+popup+seletor+
distância/ETA + Alocar) + backend do índice de conclusão. **SEM pendências funcionais.** Resta só a Fase 2 (M-7 SLA real; ETA
por rota se o dono quiser) — ambos backend/PD.

## Rastreabilidade
ID: WS-MAPA alloc-frontend · PR: (após `gh pr create`) · merge_commit/approved_head null na autoria. smoke 581→597, mapa 112→128.
`.claude/skills/*` untracked EXCLUÍDOS do commit.
