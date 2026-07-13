# D-OMEGA3B — Decisão: alvo de despacho é técnico DE CAMPO (não operador-web)

## Contexto (conflito fixture × domínio — A2)
Os fixtures de teste de `field-dispatch` despachavam para usuários com papel **`operator`**. Pela nota
de domínio ([[project-domain-operadores]]), existem **2 operadores**: o **operador web/despacho**
(`operator` — opera o Mapa Operacional, direciona chamados) e o **operador de campo** (guincheiro/técnico
— `field_technician`/`technician`, faz atendimento presencial). Um despacho (`FieldDispatch`) é enviado
ao operador **de campo**; o operador-web é o ATOR que despacha, nunca o alvo.

## Decisão (Ω3-b, R1 do crítico-adversarial)
- `FIELD_DISPATCH_TARGET_ROLES = ["field_technician", "technician"]` — o alvo (`operatorUserId`) deve ter
  ao menos um papel de campo; senão **422 `target_not_field_technician`** (existência checada antes → 404).
- Guard único em `assertOperatorBelongsToTenant` cobre **create E reassign** (reassign não burla).
- A checagem incide sobre o **alvo** (`operatorUserId`), nunca sobre o ator-despachante (D3).
- Fixtures corrigidos: alvos `operator` → `technician` em `tests/field-dispatch*.test.ts`.

## Ratificação humana pendente
Confirmar se `technician` (STANDARD) e `field_technician` (LEGACY) são ambos alvos válidos, ou só um.
A const é aditiva/extensível sem migration. `operator` permanece FORA do conjunto de alvos por decisão
de domínio. Não reabrir sem nova evidência.
