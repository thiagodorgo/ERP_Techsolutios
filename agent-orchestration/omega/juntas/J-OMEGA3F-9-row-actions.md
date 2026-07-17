# Junta J-OMEGA3F-9 — Ω3F-9 · Ações de linha na lista de OS (FECHA A FASE 1)

- **Data:** 2026-07-17 · **Branch:** `feat-omega3f-9-row-actions` · **HEAD:** `82320a9` (+ condições da junta)
- **Baseline:** back **995/989/0-fail/6-skip**; front smoke **454 → 481** (+27).

## Escopo
Fecha a **Fase 1** da rodada Ω3F. Ações na própria linha da lista de OS (`/work-orders`), **100% front**,
reusando endpoints/permissões existentes (sem migration, sem backend novo):
- **Dar andamento** (D-Ω3F-9-ANDAMENTO): avanço de status forward-only via `PATCH /status`
  (`work_orders:status`); mapa `QUICK_ADVANCE` (assigned→accepted…paused→in_progress); NUNCA
  cancelled/terminais/open/in_progress (não reabre P-Ω3F6-STATUS-BYPASS). `advanceWorkOrderStatus` não engole 409.
- **Revogar envio** (D-Ω3F-9-REVOGAR): cancela o despacho ATIVO da OS reusando `field_dispatch:cancel`
  (`PATCH /operations/dispatches/:id/status {status:cancelled,reason}`, motivo obrigatório); descoberta LAZY
  do despacho (`findActiveDispatch`), zero GET por linha no render.
- **Badge de atraso** (D-Ω3F-9-BADGE): derivado de `scheduled_for`×status ("Atrasada" âmbar; vermelho >24h);
  reintroduz o sinal de SLA que o React perdeu; sem "Xh restantes" (P-Ω3F-9-SLA-FIELD).
Gates LIGADOS ao JSX (`WorkOrderRowActions`/`WorkOrderRowMenu` extraídos). 27 testes novos.

## Votos
| Agente | Veredito |
|---|---|
| cognicao-visual (veto) | **APROVADO** — provou os gates LIGADOS ao JSX **por mutação**: forçar `{showAdvance` e `{showRevoke` a `true` faz C2/C5 FALHAREM (`not ok`). Menu vivo com `.ui-menu-item` (hover/foco do DS), sem background inline. Sem dado cru. §7 completos (erro `role=alert`, prompt `role=dialog`/`aria-modal`). 3 nits BAIXA (hover inline pré-existente da página — não-regressão; `MoreVertical` sem aria-hidden; duas fontes de rótulo). |
| coordenador-de-acessos (veto) | **APROVADO_CONDICIONADO** — cadeia íntegra. UI nunca mais permissiva que o backend (canAdvanceRow=`work_orders:status`, canRevokeDispatch=`field_dispatch:cancel`, ambos = gate real das rotas). Forward-only nunca envia cancelled (provado pelo QUICK_ADVANCE). Cross-tenant coberto (tenant-scope+RLS). Verificou nos 12 papéis: todo cancel-holder tem `field_dispatch:read` → descoberta nunca dá 403 silencioso. **BAIXA:** falta linha no RBAC_MATRIX (padrão 8a/8b) → **cumprida**. |
| fid-avaliador (veto) | **APROVADO_CONDICIONADO** — rótulos PT-BR corretos; selo fiel sem "Xh restantes" (divergência governada); §3 "envio" nunca "despacho"; §7 ok; forward-only coerente com o hub. **BAIXA C1:** comentário mentiroso ("STATUS_META herda daqui" era falso — duas verdades de rótulo) → **cumprida** (STATUS_META passou a consumir `WORK_ORDER_STATUS_LABEL`, fonte única real). |

## Resultado
**APROVADO por unanimidade (3/3).** Todas as condições BAIXA cumpridas no próprio branch:
- **fid C1:** rótulo agora tem fonte única (`WORK_ORDER_STATUS_LABEL`); comentário corrigido.
- **coordenador BAIXA:** linha no `RBAC_MATRIX.md` documentando `work_orders:status` + `field_dispatch:cancel`/`read` na lista de OS, com a nota de coerência (todo cancel-holder tem read).
- **cognicao nit:** `aria-hidden` no `MoreVertical`.
Sem R-<entrega> (nenhum ciclo de reprovação).

## Cota de teste
27 testes novos (front smoke 454→481): predicados puros (mapa forward-only, badge liga/desliga, revogar),
componentes SSR (gates ligados, prova de mutação C2/C5), service (advanceWorkOrderStatus propaga 409;
findActiveDispatch filtra ativo/terminal/vazio), §3 sem termo técnico.

## KPI
D-Ω3F-KPI-RELATORIO: não toca `Kpis/*` (reconciliação no relatório final Ω3F).

## Pendências registradas
`P-Ω3F-9-SLA-FIELD` (campo de prazo real p/ "Xh restantes") · `P-Ω3F-9-DISPATCH-DTO` (expor envio ativo no DTO da lista).

## Rastreabilidade
**FECHA A FASE 1** da rodada Ω3F (Ω3F-1..9 completos). Próximo: **PÓS-FASE 1** — Ω4 Financeiro (×1,5) +
relatório final Ω/Ω3F + reconciliação KPI (D-Ω3F-KPI-RELATORIO) + descomissionar os 3 agentes fid-*.
