import assert from "node:assert/strict";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 2 · C2 — INVARIANTE DE EFEITO, não de existência.
//
// A raiz que a junta nomeou no B-3: a suíte do ciclo 1 afirmava a invariante do cheque pela
// EXISTÊNCIA do lançamento vinculado ("cleared ⇔ cleared_entry_id ⇔ a linha existe") — e o ataque
// passou por baixo dela: o lançamento continuava existindo, mas já tinha sido ESTORNADO, e o
// dinheiro já havia voltado. Uma linha viva não é dinheiro parado.
//
// Estes helpers asseveram o SALDO LÍQUIDO dos lançamentos vivos, que é a grandeza que o defeito
// movia. Ficam fora do glob `*.test.ts` de propósito (são arnês, não suíte) e são PUROS: recebem as
// linhas já carregadas, então servem igual às provas em memória e às provas contra o Postgres.
// -----------------------------------------------------------------------------------------------

/** O mínimo para computar efeito: direção e valor de um lançamento VIVO. */
export type LedgerEntry = {
  readonly direction: string;
  readonly amount: number;
};

function net(entries: readonly LedgerEntry[]): number {
  return round(entries.reduce((total, entry) => total + (entry.direction === "in" ? entry.amount : -entry.amount), 0));
}

// Dinheiro em Decimal(12,2): comparar float cru reprova por 1e-13. Duas casas, como o domínio.
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * P3 — `net(lançamentos vivos do cheque) ∈ { ±valor (cleared), 0 (bounced), sem lançamento (demais) }`,
 * com o SINAL vindo da direção do cheque: `received` compensa entrando (+), `issued` saindo (−); o
 * bounce inverte e zera.
 *
 * `entries` são SÓ os lançamentos vivos vinculados ao cheque (as duas pontas). Passar os deletados
 * junto mascararia exatamente o defeito, então quem carrega filtra por `deleted_at IS NULL`.
 */
export function expectChequeLedgerCoherent(input: {
  readonly status: string;
  readonly direction: string;
  readonly amount: number;
  readonly entries: readonly LedgerEntry[];
  readonly label?: string;
}): void {
  const label = input.label ?? "cheque";
  const signed = input.direction === "received" ? round(input.amount) : round(-input.amount);
  const observed = net(input.entries);

  if (input.status === "cleared") {
    assert.equal(
      observed,
      signed,
      `${label}: cheque 'cleared' tem de valer exatamente ${signed} em lançamentos vivos, e vale ${observed}. ` +
        "Se deu 0, o movimento foi desfeito por fora da máquina de estados (Ω6R-DIN-011).",
    );
    assert.equal(input.entries.length, 1, `${label}: 'cleared' tem exatamente UM lançamento vivo`);
    return;
  }

  if (input.status === "bounced") {
    assert.equal(
      observed,
      0,
      `${label}: cheque 'bounced' tem de valer LÍQUIDO ZERO, e vale ${observed}. ` +
        `Se deu ${round(-signed)}, o dinheiro voltou DUAS vezes — é a devolução em dobro do Ω6R-DIN-011.`,
    );
    // 0 lançamentos = devolvido sem nunca ter compensado; 2 = compensou e devolveu (par completo).
    assert.ok(
      input.entries.length === 0 || input.entries.length === 2,
      `${label}: 'bounced' tem 0 lançamentos (nunca compensou) ou 2 (compensou e devolveu), e tem ${input.entries.length}`,
    );
    return;
  }

  assert.equal(
    input.entries.length,
    0,
    `${label}: cheque em '${input.status}' não move caixa — não pode ter lançamento vivo vinculado`,
  );
}

/**
 * P2 — `paid_amount == Σ(liquidações vivas) − Σ(contrapartidas vivas dessas liquidações)`.
 *
 * As contrapartidas do estorno nascem SEM `title_id` (para não duplicar a contagem), então elas se
 * ligam ao título pelo `reversal_of` — só contam as que apontam para uma liquidação DESTE título.
 */
export function expectTitleLedgerCoherent(input: {
  readonly paidAmount: number;
  readonly settlements: readonly { readonly id: string; readonly amount: number }[];
  readonly counterEntries: readonly { readonly reversalOf: string; readonly amount: number }[];
  readonly label?: string;
}): void {
  const label = input.label ?? "título";
  const settlementIds = new Set(input.settlements.map((entry) => entry.id));
  const paid = round(input.settlements.reduce((total, entry) => total + entry.amount, 0));
  const returned = round(
    input.counterEntries
      .filter((entry) => settlementIds.has(entry.reversalOf))
      .reduce((total, entry) => total + entry.amount, 0),
  );

  assert.equal(
    round(input.paidAmount),
    round(paid - returned),
    `${label}: paid_amount=${input.paidAmount} não é sustentado pelo razão ` +
      `(liquidações vivas ${paid} − contrapartidas vivas ${returned} = ${round(paid - returned)}). ` +
      "Um título pago sem lançamento que o sustente é o Ω6R-DIN-002/010.",
  );
}
