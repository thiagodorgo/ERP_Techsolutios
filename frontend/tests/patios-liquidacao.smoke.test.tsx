import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { CascataTable } from "../src/modules/patios/settlement/components/CascataTable";
import { ComprovanteLeilao } from "../src/modules/patios/settlement/components/ComprovanteLeilao";
import { SaldoCiclo } from "../src/modules/patios/settlement/components/SaldoCiclo";
import {
  adaptSettlementView,
  canClaimBalance,
  canRevertToFunset,
  hasOwnerBalance,
  hasShortfall,
  resolveSettlementStage,
  settlementActionErrorMessage,
  splitCascade,
} from "../src/modules/patios/settlement/settlement.adapter";
import type { SettlementAllocationDto, SettlementDto } from "../src/modules/patios/settlement/settlement.types";
import type { ProcessDetail } from "../src/modules/patios/processes/processes.types";

const INTERNAL_UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function buildSettlement(overrides: Partial<SettlementDto> = {}): SettlementDto {
  return {
    id: "settle-1",
    processId: "proc-1",
    soldRound: 1,
    hammerAmount: "8500.00",
    auctionCostAmount: "500.00",
    removalStorageClaim: "1500.00",
    ownerBalanceAmount: "6500.00",
    shortfallAmount: "0.00",
    currency: "BRL",
    status: "DISTRIBUTED",
    statusLabel: "Distribuído",
    ownerNotifyDueAt: "2026-08-27T00:00:00.000Z",
    ownerClaimExpiresAt: "2099-01-01T00:00:00.000Z",
    claimedAt: null,
    claimRecipientRef: null,
    revertedAt: null,
    createdAt: "2026-07-28T10:00:00.000Z",
    updatedAt: "2026-07-28T10:00:00.000Z",
    ...overrides,
  };
}

function buildAllocation(overrides: Partial<SettlementAllocationDto> = {}): SettlementAllocationDto {
  return {
    id: `alloc-${overrides.orderSeq ?? 1}`,
    orderSeq: 1,
    beneficiaryKind: "AUCTION_COST",
    beneficiaryLabel: "Custeio do leilão",
    amount: "0.00",
    claimAmount: "0.00",
    reference: null,
    ...overrides,
  };
}

// Cascata normal: Σ tiers + saldo == arremate (8.500,00). Saldo ao proprietário = resíduo 6.500,00.
function normalAllocations(): SettlementAllocationDto[] {
  return [
    buildAllocation({ orderSeq: 1, beneficiaryKind: "AUCTION_COST", beneficiaryLabel: "Custeio do leilão", claimAmount: "500.00", amount: "500.00" }),
    buildAllocation({ orderSeq: 2, beneficiaryKind: "REMOVAL_STORAGE", beneficiaryLabel: "Remoção e estada", claimAmount: "1500.00", amount: "1500.00" }),
    buildAllocation({ orderSeq: 3, beneficiaryKind: "VEHICLE_TAXES", beneficiaryLabel: "Tributos do veículo", claimAmount: "0.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 4, beneficiaryKind: "PRIORITY_CREDITORS", beneficiaryLabel: "Credores preferenciais", claimAmount: "0.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 5, beneficiaryKind: "REALIZING_AGENCY_FINES", beneficiaryLabel: "Multas do órgão realizador", claimAmount: "0.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 6, beneficiaryKind: "OTHER_SNT_FINES", beneficiaryLabel: "Demais multas do SNT", claimAmount: "0.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 7, beneficiaryKind: "OTHER_DEBITS", beneficiaryLabel: "Demais débitos", claimAmount: "0.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 8, beneficiaryKind: "OWNER_BALANCE", beneficiaryLabel: "Saldo ao proprietário", claimAmount: null, amount: "6500.00" }),
  ];
}

// Cascata com SHORTFALL: arremate 1.000,00 < Σ despesas 1.600,00 → tiers inferiores e saldo ficam 0.
function shortfallSettlement(): SettlementDto {
  return buildSettlement({ hammerAmount: "1000.00", ownerBalanceAmount: "0.00", shortfallAmount: "600.00", removalStorageClaim: "800.00" });
}
function shortfallAllocations(): SettlementAllocationDto[] {
  return [
    buildAllocation({ orderSeq: 1, beneficiaryKind: "AUCTION_COST", beneficiaryLabel: "Custeio do leilão", claimAmount: "500.00", amount: "500.00" }),
    buildAllocation({ orderSeq: 2, beneficiaryKind: "REMOVAL_STORAGE", beneficiaryLabel: "Remoção e estada", claimAmount: "800.00", amount: "500.00" }),
    buildAllocation({ orderSeq: 3, beneficiaryKind: "VEHICLE_TAXES", beneficiaryLabel: "Tributos do veículo", claimAmount: "300.00", amount: "0.00" }),
    buildAllocation({ orderSeq: 8, beneficiaryKind: "OWNER_BALANCE", beneficiaryLabel: "Saldo ao proprietário", claimAmount: null, amount: "0.00" }),
  ];
}

function buttonDisabled(html: string, ariaLabel: string): boolean | null {
  const match = new RegExp(`<button[^>]*aria-label="${ariaLabel}"[^>]*>`).exec(html);
  return match ? /disabled/.test(match[0]) : null;
}

// ── (1) HONESTIDADE DE DINHEIRO — o Σ exibido = hammerAmount; nunca calculado no cliente ─────────────────────────────
test("honestidade: o rodapé da cascata exibe o hammerAmount CRU do DTO como Σ = arremate (I7); saldo = resíduo", () => {
  const html = renderToString(<CascataTable settlement={buildSettlement()} allocations={normalAllocations()} />);
  assert.match(html, /Σ das alocações = arremate/);
  assert.match(html, /8\.500,00/); // hammerAmount do DTO no rodapé
  assert.match(html, /Custeio do leilão/);
  assert.match(html, /Remoção e estada/);
  assert.match(html, /Saldo ao proprietário/);
  assert.match(html, /6\.500,00/); // resíduo (owner_balance)
  assert.match(html, /Distribuído/); // chip de status
  assert.match(html, /invariante I7/i); // a prova é atribuída ao backend, não a uma soma do cliente
});

test("honestidade: no shortfall os tiers inferiores e o saldo mostram R$ 0,00, com nota clara — sem implicar pagamento integral", () => {
  const html = renderToString(<CascataTable settlement={shortfallSettlement()} allocations={shortfallAllocations()} />);
  assert.match(html, /1\.000,00/); // Σ = arremate (hammer), não a soma das reclamações
  assert.match(html, /0,00/); // tributos (tier inferior) e saldo zerados honestamente
  assert.match(html, /As despesas superaram o valor arrematado em/);
  assert.match(html, /600,00/); // shortfall informativo
  assert.match(html, /zerados/); // deixa explícito que os níveis seguintes e o saldo ficaram 0
  assert.equal(hasShortfall(shortfallSettlement()), true);
});

test("splitCascade separa os tiers (ordem §6º) do resíduo OWNER_BALANCE", () => {
  const split = splitCascade(normalAllocations());
  assert.equal(split.tiers.length, 7);
  assert.equal(split.tiers[0].beneficiaryKind, "AUCTION_COST");
  assert.ok(split.tiers.every((tier) => tier.beneficiaryKind !== "OWNER_BALANCE"));
  assert.equal(split.ownerBalance?.beneficiaryKind, "OWNER_BALANCE");
  assert.equal(split.ownerBalance?.amount, "6500.00");
});

// ── (2) claim/revert habilitam SÓ no estado + prazo certos ───────────────────────────────────────────────────────────
test("ciclo do saldo: canClaimBalance/canRevertToFunset só habilitam no estado DISTRIBUTED + prazo correto", () => {
  const now = new Date("2026-08-01T00:00:00.000Z");
  const withinWindow = buildSettlement({ ownerClaimExpiresAt: "2031-01-01T00:00:00.000Z" });
  const expired = buildSettlement({ ownerClaimExpiresAt: "2020-01-01T00:00:00.000Z" });

  // Dentro do prazo → retirada habilita, reversão NÃO (mutuamente exclusivas).
  assert.equal(canClaimBalance(withinWindow, now), true);
  assert.equal(canRevertToFunset(withinWindow, now), false);

  // Após o prazo → reversão habilita, retirada NÃO.
  assert.equal(canClaimBalance(expired, now), false);
  assert.equal(canRevertToFunset(expired, now), true);

  // Estado errado (já reclamado) → nenhuma.
  assert.equal(canClaimBalance(buildSettlement({ status: "BALANCE_CLAIMED" }), now), false);
  assert.equal(canRevertToFunset(buildSettlement({ status: "BALANCE_CLAIMED" }), now), false);

  // Sem saldo → nenhuma (o backend também barra com balance_zero).
  assert.equal(canClaimBalance(buildSettlement({ ownerBalanceAmount: "0.00" }), now), false);
  assert.equal(canRevertToFunset(buildSettlement({ ownerBalanceAmount: "0.00" }), now), false);
  assert.equal(hasOwnerBalance(buildSettlement({ ownerBalanceAmount: "0.00" })), false);
});

test("SaldoCiclo: dentro do prazo a retirada habilita e a reversão fica DESABILITADA (mutuamente exclusivas)", () => {
  const html = renderToString(
    <SaldoCiclo settlement={buildSettlement({ ownerClaimExpiresAt: "2099-01-01T00:00:00.000Z" })} canTransition busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.match(html, /Registrar retirada do saldo/);
  assert.match(html, /Reverter saldo ao Funset/);
  assert.equal(buttonDisabled(html, "Registrar retirada do saldo pelo proprietário"), false);
  assert.equal(buttonDisabled(html, "Reverter saldo ao Funset"), true);
  assert.match(html, /a reversão ao Funset só fica disponível após o prazo/);
  // D-Ω5P-07: o sistema REGISTRA a retirada, não movimenta dinheiro.
  assert.match(html, /o sistema apenas REGISTRA a retirada/);
});

test("SaldoCiclo: após o prazo a reversão habilita e a retirada fica DESABILITADA", () => {
  const html = renderToString(
    <SaldoCiclo settlement={buildSettlement({ ownerClaimExpiresAt: "2000-01-01T00:00:00.000Z" })} canTransition busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.equal(buttonDisabled(html, "Registrar retirada do saldo pelo proprietário"), true);
  assert.equal(buttonDisabled(html, "Reverter saldo ao Funset"), false);
  assert.match(html, /a retirada pelo proprietário não está mais disponível/);
});

// ── (3) mutuamente exclusivo nos estados terminais ───────────────────────────────────────────────────────────────────
test("SaldoCiclo: BALANCE_CLAIMED é terminal — mostra o desfecho (data + ref mascarada) e NENHUMA ação", () => {
  const html = renderToString(
    <SaldoCiclo settlement={buildSettlement({ status: "BALANCE_CLAIMED", statusLabel: "Saldo reclamado", claimedAt: "2026-09-01T12:00:00.000Z", claimRecipientRef: "J.S. …900" })} canTransition busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.match(html, /Saldo retirado pelo proprietário/);
  assert.match(html, /J\.S\. …900/); // referência MASCARADA (§2.8)
  assert.doesNotMatch(html, /Reverter saldo ao Funset/); // sem ação de reversão
  assert.doesNotMatch(html, /Registrar retirada do saldo/); // sem ação de retirada
});

test("SaldoCiclo: BALANCE_REVERTED_FUNSET é terminal — mostra a reversão e NENHUMA ação de retirada", () => {
  const html = renderToString(
    <SaldoCiclo settlement={buildSettlement({ status: "BALANCE_REVERTED_FUNSET", statusLabel: "Saldo revertido ao Funset", revertedAt: "2031-02-01T09:00:00.000Z" })} canTransition busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.match(html, /Saldo revertido ao Funset/);
  assert.doesNotMatch(html, /Registrar retirada do saldo/);
  assert.doesNotMatch(html, /Reverter saldo ao Funset<\/button>|aria-label="Reverter saldo ao Funset"/); // sem botão de ação
});

test("SaldoCiclo: sem saldo (resíduo 0) não oferece ciclo; sem permissão mostra somente leitura", () => {
  const noBalance = renderToString(
    <SaldoCiclo settlement={buildSettlement({ ownerBalanceAmount: "0.00" })} canTransition busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.match(noBalance, /Sem saldo ao proprietário/);
  assert.doesNotMatch(noBalance, /Registrar retirada do saldo/);

  const readOnly = renderToString(
    <SaldoCiclo settlement={buildSettlement()} canTransition={false} busy={false} error={null} onClaim={() => {}} onRevert={() => {}} />,
  );
  assert.match(readOnly, /Somente leitura/);
  assert.doesNotMatch(readOnly, /aria-label="Registrar retirada do saldo pelo proprietário"/);
});

// ── (4) mapa reason→PT-BR cobre os 409 reais sem genérico ────────────────────────────────────────────────────────────
test("reason→PT-BR: todos os reasons reais da liquidação têm mensagem própria (distinta, não genérica)", () => {
  const generic = settlementActionErrorMessage("reason_desconhecido_qualquer", 409);
  const reasons = [
    // Distribuição (409)
    "settlement_wrong_state",
    "settlement_sale_missing",
    // Ciclo do saldo (409)
    "balance_claim_wrong_state",
    "balance_zero",
    "balance_claim_expired",
    "funset_wrong_state",
    "funset_not_yet_due",
    // Validação (400)
    "claim_recipient_ref_too_long",
    "auction_cost_invalid",
  ];
  const messages = reasons.map((reason) => settlementActionErrorMessage(reason, reason.endsWith("_invalid") || reason.endsWith("_too_long") ? 400 : 409));
  for (const [index, message] of messages.entries()) {
    assert.notEqual(message, generic, `${reasons[index]} caiu no genérico`);
    assert.doesNotMatch(message, /\btenant\b/i);
    assert.doesNotMatch(message, /pol[íi]cia/i);
  }
  // Os 7 reasons de 409 (distribuição + ciclo) têm traduções DISTINTAS entre si.
  const conflictMessages = messages.slice(0, 7);
  assert.equal(new Set(conflictMessages).size, 7);

  // Âncoras de fidelidade.
  assert.match(settlementActionErrorMessage("balance_claim_expired", 409), /prazo/i);
  assert.match(settlementActionErrorMessage("funset_not_yet_due", 409), /Funset/);
  assert.match(settlementActionErrorMessage("settlement_sale_missing", 409), /venda efetiva/i);
  // Fallback por status quando o reason é ausente.
  assert.match(settlementActionErrorMessage(null, 403), /sem permiss[ãa]o/i);
});

// ── (5) §2.8 — sem tenant_id/UUID de ator; refs mascaradas ──────────────────────────────────────────────────────────
test("§2.8: adaptSettlementView SUPRIME distributedBy/claimedBy (UUID de ator) e preserva a ref mascarada", () => {
  const view = adaptSettlementView({
    data: {
      settlement: {
        id: "settle-1",
        processId: "proc-1",
        soldRound: 1,
        hammerAmount: "8500.00",
        ownerBalanceAmount: "6500.00",
        shortfallAmount: "0.00",
        currency: "BRL",
        status: "BALANCE_CLAIMED",
        statusLabel: "Saldo reclamado",
        ownerNotifyDueAt: "2026-08-27T00:00:00.000Z",
        ownerClaimExpiresAt: "2031-07-28T00:00:00.000Z",
        // §2.8 — estes UUID de ator NÃO devem sobreviver à adaptação.
        distributedBy: INTERNAL_UUID,
        claimedBy: INTERNAL_UUID,
        claimedAt: "2026-09-01T12:00:00.000Z",
        claimRecipientRef: "J.S. …900",
        createdAt: "2026-07-28T10:00:00.000Z",
        updatedAt: "2026-09-01T12:00:00.000Z",
      },
      allocations: [
        { id: "a1", orderSeq: 1, beneficiaryKind: "AUCTION_COST", beneficiaryLabel: "Custeio do leilão", amount: "500.00", claimAmount: "500.00" },
        { id: "a8", orderSeq: 8, beneficiaryKind: "OWNER_BALANCE", beneficiaryLabel: "Saldo ao proprietário", amount: "6500.00", claimAmount: null },
      ],
    },
  });
  assert.ok(view);
  assert.equal(view!.settlement.claimRecipientRef, "J.S. …900");
  assert.equal(view!.allocations.length, 2);
  // O UUID de ator não está em lugar nenhum da view adaptada.
  assert.doesNotMatch(JSON.stringify(view), UUID_RE);
});

test("§2.8/white-label: o comprovante exibe arremate/cascata/saldo + arrematante mascarado; sem tenant_id/UUID/'polícia'", () => {
  const process: ProcessDetail = {
    id: "proc-1",
    vehiclePlate: "ABC1D23",
    vehicleUnidentified: false,
    yardId: "yard-1",
    profileId: "prof-1",
    status: "AUCTION_CLOSED",
    statusLabel: "Leilão encerrado",
    enteredAt: "2026-06-01T08:00:00.000Z",
    frozenAt: null,
    originAuthority: "Autoridade solicitante municipal",
    custodySeqHead: 9,
    createdAt: "2026-06-01T08:00:00.000Z",
    vehicleChassis: null,
    vehicleRenavam: null,
    vehicleBrand: "Fiat",
    vehicleModel: "Uno",
    vehicleColor: null,
    vehicleYear: null,
    unidentifiedReason: null,
    originAgentName: null,
    authorityCaseNumber: null,
    incidentReportNumber: null,
    legalBasis: null,
    serviceOrderId: null,
    custodyHashHead: null,
    updatedAt: "2026-07-28T12:00:00.000Z",
  };
  const html = renderToString(
    <ComprovanteLeilao
      process={process}
      settlement={buildSettlement()}
      allocations={normalAllocations()}
      certame={{ roundNumber: 1, winnerRef: "…7788", soldAmount: "8500.00", saleNoteReference: "Nota 9/2026" }}
      onClose={() => {}}
    />,
  );
  assert.match(html, /Comprovante de liquidação do leilão/);
  assert.match(html, /ABC1D23/);
  assert.match(html, /Valor arrematado/);
  assert.match(html, /8\.500,00/);
  assert.match(html, /…7788/); // arrematante MASCARADO
  assert.match(html, /Nota 9\/2026/);
  assert.match(html, /Σ das alocações = arremate/); // a cascata entra no comprovante
  assert.match(html, /6\.500,00/); // saldo ao proprietário
  assert.match(html, /Imprimir \/ Salvar PDF/);
  assert.doesNotMatch(html, new RegExp(INTERNAL_UUID));
  assert.doesNotMatch(html, UUID_RE);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

// ── (6) estados / estágio ────────────────────────────────────────────────────────────────────────────────────────────
test("resolveSettlementStage (PURO): distribui em AUCTION_CLOSED sem liquidação; settled com liquidação; senão silencioso", () => {
  assert.equal(resolveSettlementStage("AUCTION_CLOSED", null), "distribute");
  assert.equal(resolveSettlementStage("AUCTION_CLOSED", { settlement: buildSettlement(), allocations: normalAllocations() }), "settled");
  // Mesmo fora de AUCTION_CLOSED, se houver liquidação registrada, mostra a liquidação.
  assert.equal(resolveSettlementStage("ACTIVE_CUSTODY", { settlement: buildSettlement(), allocations: [] }), "settled");
  // Sem liquidação e fora do estado → o painel não se renderiza.
  assert.equal(resolveSettlementStage("ACTIVE_CUSTODY", null), "unavailable");
  assert.equal(resolveSettlementStage("RELEASED", null), "unavailable");
});
