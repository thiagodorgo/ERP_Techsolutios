# R-Ω2c — ciclo 1 (reprovação da junta de gate de Profissionais)

Junta de 5: inspetor/master-teste/frontend-pixel **APROVADO**; **validador-mestre (ALTA)** e
**cognicao-visual** REPROVARAM — mesma raiz (lição B1). Ciclo 1 do protocolo v3.

## Blocker (ALTA, provado ao vivo)
`toOperatorProfileListDto` não emitia `cnhNumber` (correto por LGPD) **nem `trackingConsentAt`**, mas o
frontend derivava o selo de CNH de `cnhNumber` → toda linha mostrava "Sem CNH" mesmo com CNH válida, e o
selo de consentimento perdia a data. O selo "pré-computado" (§6.1) ficou desonesto.

## Correção (LGPD-consciente)
- **List DTO** passa a emitir **`hasCnh` (boolean)** + `trackingConsentAt` — **nunca o número da CNH em massa**.
- **Adapter** `formatCnhStatus(hasCnh, cnhExpiresAt)` deriva o selo do sinal, não do número. `adaptOperatorProfile`
  lê `hasCnh` (fallback: presença de cnhNumber no detalhe). Busca client-side não cobre mais o número (é
  server-side — o validator `search` do backend cobre cnhNumber).
- **Lista** mostra só **categoria + selo** (sem o número cru). **Edição** busca o DETALHE (`GET /:id`, que traz
  cnhNumber) antes de abrir o modal — CNH acessada por-registro sob demanda, não em massa.
- **Consentimento**: `trackingConsentAt` agora no list DTO → selo "Consentido em dd/mm/aaaa" correto.

## Testes travando a regressão
- Frontend: teste que renderiza a lista a partir do **payload REAL do list DTO** (hasCnh, sem cnhNumber) e
  confere Válida/Sem CNH + consentimento; `formatCnhStatus` reescrito p/ hasCnh; teste de busca ajustado
  (CNH não é buscável client-side).
- Backend: teste do list DTO (hasCnh presente, **cnhNumber ausente**, trackingConsentAt presente) + detail DTO
  expõe cnhNumber.

## Achados secundários registrados (não-bloqueantes)
- MÉDIA: userId cru na UI (mitigado por fullName; pendência de seletor de usuário) — registrado.
- BAIXA: sem teste da allowlist de auditoria LGPD → **adicionado indiretamente**; resíduo "Nome Alterado" no
  banco era artefato de teste (limpo por re-seed).

**Pós-correção:** backend operator-profiles **17/17** · core-saas 26/26 · frontend **323/323** · live: list DTO
hasCnh sem cnhNumber, detail com cnhNumber. **Ciclo 2:** re-verificação pelo validador-mestre (autor do veto).
