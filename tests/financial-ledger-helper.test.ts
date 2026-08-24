import assert from "node:assert/strict";
import test from "node:test";

import { expectChequeLedgerCoherent, type ChequeLedgerRow } from "./helpers/financial-ledger.js";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 3 · C1 (P6) — A SUÍTE DO PRÓPRIO HELPER.
//
// O erro do ciclo 2 não foi ter escrito um helper fraco; foi NUNCA TER EXECUTADO O HELPER contra o
// estado que ele existia para pegar. O plano do ciclo 2 afirmou "o helper de efeito acusa net =
// −100" sem rodar; a junta rodou e ele estava VERDE nos dois checkpoints do D11. Uma afirmação não
// executada virou o agravante do B-1.
//
// Esta suíte é o discriminador PERMANENTE: o helper é uma função pura, então os estados podem ser
// sintéticos, e qualquer regressão da regra fica vermelha aqui sem depender de drill, de banco, de
// serviço ou da ordem de um `assert.rejects`. Cobre os 8 estados que o planejador executou em
// protótipo (§0.2 do plano) — os DOIS checkpoints do D11 e o mecanismo do B-1 do ciclo 1 inclusive —
// mais os controles saudáveis nas duas direções.
// -----------------------------------------------------------------------------------------------

const CLEAR = "entry-clear";
const COUNTER = "entry-counter";
const BOUNCE = "entry-bounce";

/** Compensação de cheque `received` de 100: entra +100 e é a ponta `cleared_entry_id`. */
function clearRow(overrides: Partial<ChequeLedgerRow> = {}): ChequeLedgerRow {
  return { id: CLEAR, direction: "in", amount: 100, ...overrides };
}

/**
 * Contrapartida de ESTORNO da compensação. O ponto do B-1 vive nesta linha: ela nasce ligada ao
 * lançamento original por `reversalOf` e **não** a nenhuma ponta do cheque — logo nenhum carregador
 * que filtre "vinculados ao cheque" jamais a enxerga.
 */
function counterRow(overrides: Partial<ChequeLedgerRow> = {}): ChequeLedgerRow {
  return { id: COUNTER, direction: "out", amount: 100, reversalOf: CLEAR, ...overrides };
}

/** Contra-lançamento do bounce: ponta `bounce_entry_id`, SEM `reversalOf` (não é reverse()). */
function bounceRow(overrides: Partial<ChequeLedgerRow> = {}): ChequeLedgerRow {
  return { id: BOUNCE, direction: "out", amount: 100, ...overrides };
}

function expectRed(
  input: Parameters<typeof expectChequeLedgerCoherent>[0],
  fragment: string,
  porque: string,
): void {
  assert.throws(
    () => expectChequeLedgerCoherent(input),
    (error: unknown) => {
      assert.ok(error instanceof assert.AssertionError, `${porque}: o helper tem de reprovar por asserção`);
      assert.ok(
        String((error as Error).message).includes(fragment),
        `${porque}: a mensagem tem de nomear o problema (esperava conter ${JSON.stringify(fragment)}), e diz: ${(error as Error).message}`,
      );
      return true;
    },
    porque,
  );
}

// ------------------------------------------------------------------ os dois checkpoints do D11

test("[P6] D11 intermediário — reverse do lançamento de compensação ACEITO, cheque ainda 'cleared': VERMELHO", () => {
  // O estado exato que a junta mediu e no qual o helper do ciclo 2 ficava VERDE: a compensação
  // continua viva e vinculada, mas a contrapartida do estorno já devolveu o dinheiro. Saldo real 0.
  expectRed(
    {
      status: "cleared",
      direction: "received",
      amount: 100,
      linkedIds: [CLEAR],
      ledger: [clearRow(), counterRow()],
      label: "D11 intermediário",
    },
    "e vale 0",
    "cheque 'cleared' cujo lançamento já foi estornado vale ZERO, não 100",
  );
});

test("[P6] D11 final — bounce depois do reverse aceito, devolução em DOBRO (saldo −100): VERMELHO", () => {
  // O desfecho do ataque Ω6R-DIN-011: 200 devolvidos num cheque de 100.
  expectRed(
    {
      status: "bounced",
      direction: "received",
      amount: 100,
      linkedIds: [CLEAR, BOUNCE],
      ledger: [clearRow(), counterRow(), bounceRow()],
      label: "D11 final",
    },
    "e vale -100",
    "cheque 'bounced' com estorno E contra-lançamento vale −100, não zero",
  );
});

// ------------------------------------------------------------------ o mecanismo do B-1 do ciclo 1

test("[P6] compensação APAGADA (delete do lançamento vinculado): VERMELHO", () => {
  // O outro jeito de desfazer por fora da máquina de estados — a linha some, o cheque segue cleared.
  expectRed(
    {
      status: "cleared",
      direction: "received",
      amount: 100,
      linkedIds: [CLEAR],
      ledger: [clearRow({ deletedAt: new Date() })],
      label: "compensação apagada",
    },
    "e vale 0",
    "lançamento apagado não sustenta dinheiro nenhum",
  );
});

// ------------------------------------------------------------------ estados saudáveis (controles)

test("[P6] saudável: 'cleared' com a compensação viva e intacta — VERDE", () => {
  expectChequeLedgerCoherent({
    status: "cleared",
    direction: "received",
    amount: 100,
    linkedIds: [CLEAR],
    ledger: [clearRow()],
    label: "cleared saudável",
  });
});

test("[P6] saudável: 'bounced' após compensar (par completo, líquido zero) — VERDE", () => {
  expectChequeLedgerCoherent({
    status: "bounced",
    direction: "received",
    amount: 100,
    linkedIds: [CLEAR, BOUNCE],
    ledger: [clearRow(), bounceRow()],
    label: "bounced com par completo",
  });
});

test("[P6] saudável: 'bounced' sem nunca ter compensado (zero lançamento) — VERDE", () => {
  expectChequeLedgerCoherent({
    status: "bounced",
    direction: "received",
    amount: 100,
    linkedIds: [],
    ledger: [],
    label: "bounced antes de compensar",
  });
});

test("[P6] saudável: cheque 'issued' compensado sai −valor (o sinal vem da direção do cheque) — VERDE", () => {
  expectChequeLedgerCoherent({
    status: "cleared",
    direction: "issued",
    amount: 100,
    linkedIds: [CLEAR],
    ledger: [clearRow({ direction: "out" })],
    label: "issued saudável",
  });
});

// ------------------------------------------------------------------ a terceira perna do invariante

test("[P6] 'registered' com lançamento vivo vinculado: VERMELHO (cheque que não compensou não move caixa)", () => {
  expectRed(
    {
      status: "registered",
      direction: "received",
      amount: 100,
      linkedIds: [CLEAR],
      ledger: [clearRow()],
      label: "registered com vínculo",
    },
    "não pode ter lançamento vivo no fecho por estorno",
    "cheque em estado sem caixa não pode ter lançamento vivo",
  );
});

// ------------------------------------------------------------------ propriedades do FECHO

test("[P6] o fecho é TRANSITIVO: estorno do estorno volta a mover o caixa e é visto", () => {
  // reverse(counter) → +100 de novo. Um fecho que parasse no 1º nível somaria 0 e ficaria verde.
  const reReverse: ChequeLedgerRow = { id: "entry-re-reverse", direction: "in", amount: 100, reversalOf: COUNTER };
  expectRed(
    {
      status: "cleared",
      direction: "received",
      amount: 100,
      linkedIds: [CLEAR],
      ledger: [clearRow(), counterRow(), reReverse],
      label: "estorno do estorno",
    },
    "tem exatamente UM lançamento vivo no fecho, e tem 3",
    "o fecho tem de alcançar a cadeia inteira, não só o primeiro nível",
  );
});

test("[P6] o fecho é ESTREITO: lançamento avulso da mesma conta não entra na conta do cheque", () => {
  // A contraprova do teste acima: se o fecho fosse "tudo da conta", este avulso o envenenaria.
  const avulso: ChequeLedgerRow = { id: "entry-avulso", direction: "in", amount: 15 };
  expectChequeLedgerCoherent({
    status: "cleared",
    direction: "received",
    amount: 100,
    linkedIds: [CLEAR],
    ledger: [clearRow(), avulso],
    label: "avulso na mesma conta",
  });
});

test("[P6] contrapartida APAGADA não ressuscita o dinheiro: o par estornado-e-apagado segue vermelho como 'cleared'", () => {
  // Apagar a contrapartida do estorno deixaria o razão parecendo saudável para quem só soma vivos
  // SEM o fecho; com o fecho, `cleared` volta a exigir exatamente 1 linha viva — e aqui há 1: a
  // compensação. Este é o único caminho em que o estado REALMENTE volta a ser coerente, e o helper
  // tem de aceitá-lo (senão viraria um detector que nunca perdoa, e ninguém confiaria nele).
  expectChequeLedgerCoherent({
    status: "cleared",
    direction: "received",
    amount: 100,
    linkedIds: [CLEAR],
    ledger: [clearRow(), counterRow({ deletedAt: new Date() })],
    label: "contrapartida apagada",
  });
});

test("[P6] ponta declarada que não existe no razão não inventa membro nem quebra a travessia", () => {
  // Robustez da fronteira: o chamador promete completude, mas um id órfão não pode virar exceção
  // de runtime — tem de virar o vermelho de REGRA (cleared sem lançamento vivo vale 0, não 100).
  expectRed(
    {
      status: "cleared",
      direction: "received",
      amount: 100,
      linkedIds: ["entry-que-nao-existe"],
      ledger: [],
      label: "ponta órfã",
    },
    "e vale 0",
    "ponta sem linha no razão é ausência de dinheiro, não erro de programa",
  );
});
