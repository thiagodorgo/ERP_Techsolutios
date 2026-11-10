// B-ASS-08 · F11 — numeração durável da DPS (R-NF-8, G10). `billing_invoice_sequences` é GLOBAL (numeração do emissor,
// a plataforma; sem RLS). `nextDpsNumber` lê e incrementa `next_number` com `SELECT … FOR UPDATE` numa transação curta:
// duas emissões concorrentes do MESMO (provider, environment, serie) recebem números DISTINTOS e CONSECUTIVOS, e o
// rollback da transação NÃO consome número (nasce no mesmo tx que grava a linha da nota — F13).

import type { Prisma, PrismaClient } from "@prisma/client";

export type SequenceKey = { readonly provider: string; readonly environment: string; readonly serie: number };

/** Reserva o próximo número da DPS DENTRO da transação `tx` dada (a mesma que grava a linha da nota — assim o rollback
 * não consome número). UPSERT ATÔMICO: `INSERT … ON CONFLICT DO UPDATE SET next_number = next_number + 1 RETURNING`.
 * O lock de linha do `ON CONFLICT DO UPDATE` serializa concorrentes: o número atribuído é `next_number` devolvido − 1
 * (a 1ª emissão cria a série com `next_number = 2` e recebe 1; a seguinte faz `2 → 3` e recebe 2; e assim por diante).
 * A série nunca é editada por outra via; só por aqui. */
export async function nextDpsNumberInTx(tx: Prisma.TransactionClient, key: SequenceKey): Promise<number> {
  const rows = (await tx.$queryRawUnsafe(
    `INSERT INTO billing_invoice_sequences (provider, environment, serie, next_number)
       VALUES ($1, $2, $3, 2)
       ON CONFLICT (provider, environment, serie)
       DO UPDATE SET next_number = billing_invoice_sequences.next_number + 1, updated_at = now()
       RETURNING next_number`,
    key.provider,
    key.environment,
    key.serie,
  )) as Array<{ next_number: number }>;
  return rows[0]!.next_number - 1;
}

/** Transação curta própria (quando não há uma transação de nota em curso). */
export async function nextDpsNumber(client: PrismaClient, key: SequenceKey): Promise<number> {
  return client.$transaction((tx) => nextDpsNumberInTx(tx, key));
}
