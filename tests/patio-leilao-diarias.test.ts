import assert from "node:assert/strict";
import test from "node:test";

function caso(id: string, expectativa: string): void {
  test(`${id} · ${expectativa}`, () => {
    assert.fail(`F1_BASE_VERMELHA:${id}:${expectativa}`);
  });
}

caso("L1", "recordSale lança 90 diárias; livro 91 linhas antes do closeAuction; liquidação REMOVAL_STORAGE=3750.00 OWNER_BALANCE=4250.00");
caso("L1b", "com 89 diárias prévias, lança 1 diária e liquida 3750.00/4250.00");
caso("L2", "reciclagem por 2 leilões desertos com 90 diárias e total 3750.00");
caso("L3", "reciclagem por inservibilidade com 90 diárias e total 3750.00");
caso("L4", "sem serviço de diária, arremate recusa 409 auction_daily_charges_unpostable");
caso("L4r", "sem serviço de diária, reciclagens recusam 409 auction_daily_charges_unpostable");
caso("L5", "crédito do pátio calcula só em aberto (3600.00), saldo 4400.00");
caso("L6", "legado AUCTION_CLOSED congela e distribute fecha até frozen_at com crédito 3750.00");
caso("L6b", "legado sem tarifa recusa 409 settlement_daily_charges_unpostable");
caso("L7", "teto de 30 diárias lança exatamente 30; crédito 1350.00 saldo 6650.00");
caso("L8", "inadimplência e revenda: frozen_at só no closeAuction; livro inclui período até pagamento");
caso("L9", "recordSale repetido retorna created=false e contagem de diárias não duplica");
caso("L10", "lance 1000.00 gera shortfall 2750.00, owner balance 0.00");
caso("L11", "script de cura lista sem aplicar e aplica 90 diárias com --aplicar");
caso("L11a", "cura aplica só congelados sem liquidação");
caso("L11b", "cura não toca processo com liquidação gravada");
caso("L11c", "cura não toca estado fora de DIRECT_RECYCLING");
caso("L11d", "cura é idempotente na segunda execução");
caso("L11e", "cura ignora DIRECT_RECYCLING com liquidação semeada manualmente");
caso("L12", "congelamento no closeAuction soma dias entre arremate e pagamento (93 diárias)");

caso("E1", "markEligible sem serviço diário recusa 409 auction_daily_charges_unpostable");
caso("E2", "markEligible com tarifa lança diárias, passa e mantém frozen_at nulo");
caso("E3", "markEligible com closeDailies sem lançamento recusa 409 auction_daily_charges_missing");
caso("E4", "ordem de guardas preserva auction_deadline_not_reached antes da cobrança");

caso("Q1", "quitado em AUCTION_PREP recusa lote com 409 auction_debts_settled");
caso("Q2", "quitação em LOTTED recusa 409 settle_after_auction_list");
caso("Q2b", "quitação em AUCTIONED e AUCTION_CLOSED recusa 409 settle_after_auction_list");
caso("Q2c", "criação de cobrança online em LOTTED recusa 409 settle_after_auction_list");
caso("Q3", "quitação em elegível e preparação segue permitida");
caso("Q4", "elegível quitado recusa preparação com 409 auction_debts_settled");
caso("Q5", "withdraw-settled com débito em aberto recusa 409 auction_withdraw_not_settled");
caso("Q6", "pagamento parcial antes da lista não duplica crédito de pátio");
caso("Q7", "withdraw-settled em LOTTED recusa por transição inválida");
caso("Q8", "lot com cobrança on-line viva recusa 409 lot_payment_pending");

caso("C1", "custódia documentada completa torna processo elegível");
caso("C2", "sem vistoria completa recusa 409 auction_custody_inspection_incomplete");
caso("C3", "sem pátio recusa 409 auction_custody_yard_missing");
caso("C4", "sem remoção lançada recusa 409 auction_custody_removal_charge_missing");
caso("C5", "ordem de recusa prioriza vistoria quando múltiplas faltas coexistem");
caso("C6", "lot em AUCTION_PREP sem pátio recusa 409 auction_custody_yard_missing");
caso("C7", "função pura custodyDocumentationGap retorna razão correta nas 8 combinações");
