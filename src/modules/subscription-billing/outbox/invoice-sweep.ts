// B-ASS-08c2 (item 60, plano de abertura §4.5; Emenda 1 §3.1) — o laço PURO da varredura de recuperação da nota. Para cada
// organização, pede à organização as intenções de nota que faltam (a regra e a trava ficam no serviço do demonstrativo) e
// isola a falha de cada uma: a falha de uma vira `failures` e o laço segue, para o diagnóstico mostrar todas (o padrão do
// `closeTenantsSequentially`). `ok` = nenhuma falha; a falha da própria enumeração também dá `ok = false`. O despacho, com
// `ok = false`, segura só as EMISSÕES não órfãs da rodada (`[SWEEP-FAILCLOSED]`). Sem rede, sem banco, sem relógio próprio.

export type InvoiceSweepFailure = {
  /** A organização que falhou; `null` quando a falha foi na enumeração das organizações. */
  readonly tenantId: string | null;
  /** Só o código do erro, nunca a mensagem (§2.8). */
  readonly code: string;
};

export type InvoiceSweepResult = {
  readonly ok: boolean;
  readonly failures: readonly InvoiceSweepFailure[];
  /** Intenções de emissão criadas nesta rodada, somadas em todas as organizações. */
  readonly inserted: number;
};

export type InvoiceRecoverySweepInput = {
  readonly listTenantIds: () => Promise<readonly string[]>;
  readonly sweepTenant: (tenantId: string, now: Date) => Promise<{ readonly inserted: number }>;
  readonly now: Date;
};

function sweepFailureCode(error: unknown): string {
  if (error && typeof error === "object") {
    const candidate = error as { code?: unknown; name?: unknown };
    if (typeof candidate.code === "string" && candidate.code) return candidate.code;
    if (typeof candidate.name === "string" && candidate.name) return candidate.name;
  }
  return "unknown_error";
}

export async function runInvoiceRecoverySweep(input: InvoiceRecoverySweepInput): Promise<InvoiceSweepResult> {
  let tenantIds: readonly string[];
  try {
    tenantIds = await input.listTenantIds();
  } catch (error) {
    return { ok: false, failures: [{ tenantId: null, code: sweepFailureCode(error) }], inserted: 0 };
  }
  const failures: InvoiceSweepFailure[] = [];
  let inserted = 0;
  for (const tenantId of tenantIds) {
    try {
      inserted += (await input.sweepTenant(tenantId, input.now)).inserted;
    } catch (error) {
      failures.push({ tenantId, code: sweepFailureCode(error) });
    }
  }
  return { ok: failures.length === 0, failures, inserted };
}
