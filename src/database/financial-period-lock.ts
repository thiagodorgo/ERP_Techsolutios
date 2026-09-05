import type { Prisma } from "@prisma/client";

// B-O6R-02 (Ω6R-DIN-008) — LAR ÚNICO da trava de período financeiro (tenant, period='YYYY-MM').
// A expressão da chave é BYTE-IDÊNTICA à que o fechamento usava inline até este bloco
// (`hashtext(`${tenantId}:${period}`)`): mudar a expressão AQUI muda a chave para todos de uma
// vez — close, reopen e writers — que é o ponto de existir um lar único. O guard de varredura
// (tests/financial-period-lock-guard.test.ts) reprova `pg_advisory` em qualquer outro arquivo de
// src/**: uma segunda emissão da chave em outro lugar é exatamente o drift que reabriria o DIN-008.
//
// Modos:
//   · EXCLUSIVO — só o fechamento/reabertura (serializa close×close e close×writer).
//   · SHARED — todo writer financeiro (título/lançamento). Shared NÃO serializa writer×writer:
//     pagar dois títulos do mesmo mês não enfileira — quem serializa writers entre si é o row lock
//     da própria linha. Mas shared CONFLITA com o exclusivo do close: o writer que chega com o
//     close em curso ESPERA e re-valida isPeriodClosed DENTRO da própria transação (422 se fechou);
//     o close que chega com um writer em voo ESPERA o commit dele e o snapshot o INCLUI.
//
// O ALCANCE EXATO DA GARANTIA (M2, ciclo 2 · C4 — o texto anterior prometia mais do que o código
// entrega). A garantia é: nunca existe commit de writer DEPOIS do snapshot da competência CUJA
// TRAVA ELE TOMOU. E cada writer toma a trava de UMA competência — a do LANÇAMENTO que está
// gravando (server-now no estorno/cheque; `occurred_at` na liquidação), nunca a do título envolvido.
// Decisão explícita e registrada (§12.1 do plano do bloco): `payTitle` de um título de competência X
// com lançamento em Y toma a trava de Y, não a de X. Fechar X, portanto, não serializa contra esse
// pagamento — o que o fechamento de X protege é o conjunto de linhas de X no snapshot dele, e o
// `paid_amount` do título é mutado dentro da unidade do lançamento de Y. Resíduo declarado, não
// defeito silencioso: quem quiser a trava das DUAS competências precisa tomá-las em ordem total
// (senão inverte a ordem global de locks e volta o deadlock que esta seção existe para evitar).
//
// Ordem global de locks: advisory SEMPRE antes de row locks (os chamadores tomam a trava antes de
// qualquer INSERT/UPDATE) → sem inversão de ordem, sem deadlock entre close e writers.
//
// Colisão de hashtext entre pares (tenant,period) distintos: dois pares diferentes podem cair na
// mesma chave int4 → serialização espúria = custo de LIVENESS (uma espera a mais), nunca de
// corretude (o re-check decide pelo estado real de financial_period_closes, não pela chave).

export async function acquirePeriodLockShared(
  tx: Prisma.TransactionClient,
  tenantId: string,
  period: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(hashtext(${`${tenantId}:${period}`}))`;
}

export async function acquirePeriodLockExclusive(
  tx: Prisma.TransactionClient,
  tenantId: string,
  period: string,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${tenantId}:${period}`}))`;
}
