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

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C1 (P6) — A FRONTEIRA DE CONFIANÇA MUDOU DE LADO.
//
// O B-1 do ciclo 2, medido pela junta e re-confirmado por execução no §0.1 do plano do ciclo 3: sob
// o estado D11 (reverse do lançamento de compensação ACEITO), o helper ficava **VERDE nos dois
// checkpoints** — o intermediário (saldo real 0) e o final (saldo real −100). Ele não estava
// errado na conta; ele estava somando o CONJUNTO ERRADO.
//
// A raiz não era a fórmula, era a FRONTEIRA: a assinatura antiga recebia `entries` = "os vivos
// vinculados", e QUEM CARREGA filtrava. O defeito morava exatamente no que o carregador não
// carregava — a contrapartida do estorno nasce SEM vínculo com o cheque (ela se liga ao original
// por `reversal_of`), então nenhum dos dois loaders a via, e o helper somava só a compensação:
// +100, o valor esperado. Verde perfeito sobre metade do razão.
//
// P6 — *o invariante de efeito do cheque soma o FECHO POR ESTORNO dos lançamentos vivos alcançáveis
// a partir das pontas — e a seleção do conjunto acontece DENTRO do helper, nunca em quem carrega.*
// A fronteira nova é mínima e declarada: o chamador só promete a COMPLETUDE do razão da conta
// (vivos E apagados); a seleção é responsabilidade do helper, que é onde a regra mora.
//
// Por que o razão inteiro, e não "os vinculados + os estornos deles": porque descobrir "os estornos
// deles" JÁ É a seleção — devolvê-la ao chamador reconstruiria a mesma fronteira que produziu o
// defeito, só que com um nome mais comprido.
// -----------------------------------------------------------------------------------------------

/**
 * Uma linha do razão da CONTA — vivos e apagados, sem filtro. `reversalOf` é o que costura a cadeia
 * de estorno; `deletedAt` é o que distingue "existe" de "sustenta dinheiro".
 */
export type ChequeLedgerRow = {
  readonly id: string;
  readonly direction: string;
  readonly amount: number;
  readonly reversalOf?: string | null;
  readonly deletedAt?: Date | null;
};

function net(entries: readonly { readonly direction: string; readonly amount: number }[]): number {
  return round(entries.reduce((total, entry) => total + (entry.direction === "in" ? entry.amount : -entry.amount), 0));
}

// Dinheiro em Decimal(12,2): comparar float cru reprova por 1e-13. Duas casas, como o domínio.
function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * FECHO POR ESTORNO: parte das pontas do cheque e agrega, TRANSITIVAMENTE, todo lançamento cujo
 * `reversalOf` aponte para um membro do conjunto. A travessia roda sobre o razão INTEIRO (apagado
 * inclusive) — uma linha apagada continua sendo âncora válida de uma cadeia de estorno, e podá-la
 * antes da hora esconderia justamente o desfazimento que o invariante existe para ver.
 *
 * O filtro de vivos vem DEPOIS, na hora de somar dinheiro.
 */
function reversalClosure(ledger: readonly ChequeLedgerRow[], linkedIds: readonly string[]): ChequeLedgerRow[] {
  const byId = new Map(ledger.map((row) => [row.id, row]));
  const members = new Map<string, ChequeLedgerRow>();
  const frontier: string[] = [];

  for (const id of linkedIds) {
    const row = byId.get(id);
    // B-O6R-02 ciclo 4 · C4 (P6-v2, fecha B-4) — PONTA DECLARADA AUSENTE É ERRO, nos 5 status. Até o
    // ciclo 3 o `if (row && ...)` PULAVA em silêncio a ponta que não estava no razão; medido, isso
    // passava em 4 dos 5 status (só `cleared` acusava, por regra). As duas causas são defeito, não
    // "ausência de dinheiro": (a) razão INCOMPLETO — quem carregou filtrou (deleted_at, vínculo,
    // paginação); (b) ponta FANTASMA — o cheque aponta um lançamento que não existe. Continua sendo
    // AssertionError (não crash de runtime), então o espírito do ciclo 3 é preservado; o que muda é
    // que a ausência vira vermelho NOMEADO em vez de silêncio. (Divergência D-DIVERGENCIA-C4-PONTA-AUSENTE
    // registrada em controle/pendencias.md: reabre o teste "ponta órfã" do ciclo 3.)
    assert.ok(
      row,
      `ponta declarada '${id}' ausente do razão carregado — e isso é DEFEITO, não ausência de dinheiro: ` +
        "(a) razão INCOMPLETO (quem carregou filtrou deleted_at/vínculo/paginação) ou (b) ponta FANTASMA " +
        "(o cheque aponta um lançamento que não existe). O fecho por estorno não pode partir de uma âncora " +
        "que não está no razão.",
    );
    if (!members.has(id)) {
      members.set(id, row);
      frontier.push(id);
    }
  }

  while (frontier.length > 0) {
    const current = frontier.pop()!;
    for (const row of ledger) {
      if (row.reversalOf === current && !members.has(row.id)) {
        members.set(row.id, row);
        frontier.push(row.id);
      }
    }
  }

  return [...members.values()];
}

/**
 * P6 — `net(FECHO POR ESTORNO dos lançamentos vivos alcançáveis pelas pontas) ∈ { ±valor (cleared),
 * 0 (bounced), sem lançamento (demais) }`, com o SINAL vindo da direção do cheque: `received`
 * compensa entrando (+), `issued` saindo (−); o bounce inverte e zera.
 *
 * @param linkedIds as DUAS pontas do cheque (`cleared_entry_id`, `bounce_entry_id`), direto da linha
 *        do cheque — só as que existem.
 * @param ledger o razão COMPLETO da conta: vivos e apagados. Quem carrega promete completude, e nada
 *        além disso — nenhum filtro, nenhuma seleção. Essa é a única promessa do chamador.
 */
export function expectChequeLedgerCoherent(input: {
  readonly status: string;
  readonly direction: string;
  readonly amount: number;
  readonly linkedIds: readonly string[];
  readonly ledger: readonly ChequeLedgerRow[];
  readonly label?: string;
}): void {
  const label = input.label ?? "cheque";
  const signed = input.direction === "received" ? round(input.amount) : round(-input.amount);
  const relevant = reversalClosure(input.ledger, input.linkedIds);
  const live = relevant.filter((row) => row.deletedAt == null);
  const observed = net(live);

  if (input.status === "cleared") {
    assert.equal(
      observed,
      signed,
      `${label}: cheque 'cleared' tem de valer exatamente ${signed} no FECHO POR ESTORNO dos lançamentos vivos, ` +
        `e vale ${observed}. Se deu 0, o movimento foi desfeito por fora da máquina de estados — por estorno ` +
        "(contrapartida viva, que NÃO é vinculada ao cheque) ou por delete (Ω6R-DIN-011).",
    );
    assert.equal(
      live.length,
      1,
      `${label}: 'cleared' tem exatamente UM lançamento vivo no fecho, e tem ${live.length}. ` +
        "Mais de um = a compensação ganhou contrapartida de estorno; zero = ela foi apagada.",
    );
    return;
  }

  if (input.status === "bounced") {
    assert.equal(
      observed,
      0,
      `${label}: cheque 'bounced' tem de valer LÍQUIDO ZERO no fecho por estorno, e vale ${observed}. ` +
        `Se deu ${round(-signed)}, o dinheiro voltou DUAS vezes — é a devolução em dobro do Ω6R-DIN-011.`,
    );
    // 0 lançamentos = devolvido sem nunca ter compensado; 2 = compensou e devolveu (par completo).
    assert.ok(
      live.length === 0 || live.length === 2,
      `${label}: 'bounced' tem 0 lançamentos vivos no fecho (nunca compensou) ou 2 (compensou e devolveu), ` +
        `e tem ${live.length}`,
    );
    return;
  }

  assert.equal(
    live.length,
    0,
    `${label}: cheque em '${input.status}' não move caixa — não pode ter lançamento vivo no fecho por estorno ` +
      `das suas pontas, e tem ${live.length}`,
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
