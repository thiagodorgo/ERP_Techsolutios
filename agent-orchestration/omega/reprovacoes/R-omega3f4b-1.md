# R-Ω3F-4b (ciclo 1) — idempotência do approve sob concorrência + origem descartada

- **Data:** 2026-07-15 · **Bloco:** Ω3F-4b · **Branch:** `feat-omega3f-4b-approve-share`
- **HEAD condicionado:** `6cc3b06` · **HEAD corrigido:** (commit desta correção)
- **Junta J-OMEGA3F-4B:** validador-mestre APROVADO · coordenador-de-acessos APROVADO · **critico-adversarial APROVADO_CONDICIONADO (bloqueante)** · **fid-avaliador APROVADO_CONDICIONADO**.

## Condição 1 (critico, BLOQUEANTE) — duplo-faturamento sob concorrência
`approve` era read-then-write sem compare-and-set: dois approve concorrentes (duplo-clique/retry) liam ambos
`created_work_order_id = null`, ambos passavam a guarda de replay e ambos criavam OS → **2 OSs faturáveis**, uma
órfã. A guarda `created_work_order_id` só protegia o replay SEQUENCIAL.

**Correção:** CAS **reserve-before-create**. Novo `repository.claimForApproval(tenant, id)` — transição atômica
`draft→approved` só se ainda `draft` E `created_work_order_id IS NULL` (memory: check+set sem await; Prisma:
`updateMany WHERE status='draft' AND created_work_order_id IS NULL`). O approve reserva ANTES de criar a OS; o
perdedor recebe undefined → **409 quote_already_approved** e NÃO cria OS. Se o create da OS falhar após a
reserva, **compensação** devolve o orçamento a `draft` (evita approved-sem-OS irrecuperável). +1 teste de
concorrência (`Promise.allSettled` de 2 approves ⇒ exatamente 1 OS + 1×409).

## Condição 2 (fid-avaliador) — origem descartada
O approve encaminhava só os campos de DESTINO ao `WorkOrderService.create`; a ORIGEM (`serviceAddress/City/
State/ZipCode/Latitude/Longitude`) do corpo era silenciosamente descartada. **Correção:** encaminhar a origem
junto do destino. +1 teste (origem do corpo chega à OS).

## Não-bloqueantes atendidos
- `activation_mode` ganhou cap de 120 chars (critico, #6).
- `share_token` sem unicidade/índice → registrado em `P-Ω3F4B-SHARE-TOKEN-UNIQUE` (endpoint público adiado).

## Validação pós-correção
tsc/build limpos; suíte **893/887/0-fail/6-skip** (+2). Re-submetido aos 2 agentes que condicionaram
(critico + fid-avaliador).
