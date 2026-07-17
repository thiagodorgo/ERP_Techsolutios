# Junta J-OMEGA3F-6B — Ω3F-6b · Cancelar/Duplicar/Imprimir (front, fecha Ω3F-6)

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-6b-cancel-dup-print-front`
- **HEADs:** ciclo 0 `1f6de24` · ciclo 1 `176ef82` · ciclo 2 `bdc24b4` (aprovado)
- **Baseline:** front `check` + `test:smoke` **427/427** + `build` ok

## Escopo
Modais de **Cancelar** (3 decisões com rótulos do vídeo, sem pré-seleção), **Duplicar** (comentários/checklist; sem copiar orçamento — Ω3-e) e **Imprimir** (client-side; seções = visibleTabs ∩ imprimíveis ∩ permitidas). ActionBar: Imprimir na barra; Duplicar/Cancelar no ⋮.

## Ciclo 0 (HEAD 1f6de24)
| Agente | Veredito |
|---|---|
| **fid-avaliador** (veto) | **APROVADO** — C2 cumprida nos 3 pontos, **provada por MUTAÇÃO**: injetou vazamento de `keep` → teste quebrou; injetou 3º checkbox "Copiar itens do orçamento" (que driblava o regex) → a contagem exata de 2 pegou. Testes não-vacuosos. |
| **cognicao-visual** (veto) | **REPROVADO** — 3 achados MEDIDOS no app vivo: (1) **print saía fora da folha** (âncora na barra `relative`: calha de 260px, 129px estourando, coluna cortada); (2) **dois vermelhos** (#DC2626 hardcoded × #b42318 do token); (3) **hover morto** no item destrutivo. |
| **coordenador-de-acessos** (veto) | **APROVADO_CONDICIONADO (bloqueante)** — `canCancelWorkOrder` **mais permissivo que o backend** (paused/completed/rejected ofereciam Cancelar → 422); o teste **consagrava** a divergência. + `WorkOrderStatusActions` morto reabriria a porta. Print sem vazamento (o ponto que ele mais checou): limpo. |

## Ciclo 1 (HEAD 176ef82)
`.wo-print-anchor` + `@media print{position:static}`; token `--color-status-danger` promovido a **#DC2626** (protótipo vence §1/J-002) e consumido como token; `.ui-menu-item`; `CANCELLABLE_STATUSES` espelhando a tabela de transições + teste varrendo os 10 status; **`WorkOrderStatusActions`/`updateWorkOrderStatus` REMOVIDOS**; corrigida a afirmação FALSA do plano (:127,:130).
- **coordenador → APROVADO** (espelho 1:1 conferido; morto sumiu; sem outro caminho de cancelamento; print sem vazar).
- **cognicao → REPROVADO de novo**: o `className` era **INERTE** — o inline `background:transparent` vence a classe; hover medido morto. Descobriu que o precedente (Danos/Multas/Manutenção) tem o mesmo defeito.

## Ciclo 2 (HEAD bdc24b4) — remédio B
Regra **base** `.ui-menu-item { background: transparent }` no `app.css` (classe vira auto-suficiente) + **remoção do inline**.
- **cognicao → APROVADO**: hover medido vivo `rgba(0,0,0,0)` → `rgb(248,250,252)` nos 3 itens; repouso sem regressão (sem a base viria o cinza do UA); focus-visible pintando; nenhum consumidor estragado.

## Resultado
**APROVADO por unanimidade (3/3)** após 2 ciclos. **Ω3F-6 COMPLETO** (6a #194 + 6b este PR).

## Pendências registradas
P-Ω3F6B-MENUITEM-INLINE (limpar inline legado de Danos/Multas/Manutenção) · P-Ω3F6B-DS-NITS (CTA navy×azul = junta própria; ⋮ sem Esc/clique-fora; Modal sem trap; aria-hidden; WorkOrderStatusPayload órfão).

## KPI
D-Ω3F-KPI-RELATORIO: não toca Kpis/*.
