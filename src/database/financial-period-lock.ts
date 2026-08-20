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
//     o close que chega com um writer em voo ESPERA o commit dele e o snapshot o INCLUI. Nunca
//     existe commit de writer DEPOIS do snapshot da mesma competência.
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
