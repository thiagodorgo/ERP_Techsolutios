import assert from "node:assert/strict";
import test from "node:test";

function caso(id: string, expectativa: string): void {
  test(`${id} · ${expectativa}`, () => {
    assert.fail(`F1_BASE_VERMELHA:${id}:${expectativa}`);
  });
}

caso("DB-1", "closeAuctionAtomic com expectedDailyCount maior e livro sem diária recusa 409 auction_daily_charges_missing");
caso("DB-2", "reclassifyScrapAtomic com shortfall recusa 409 auction_daily_charges_missing");
caso("DB-3", "reclassifyUnrecoverableAtomic com shortfall recusa 409 auction_daily_charges_missing");
caso("DB-4a", "closeAuctionAtomic com base frozenAt divergente recusa 409 concurrent_custody_append");
caso("DB-4b", "reclassifyScrapAtomic com base frozenAt divergente recusa 409 concurrent_custody_append");
caso("DB-4c", "reclassifyUnrecoverableAtomic com base frozenAt divergente recusa 409 concurrent_custody_append");
caso("DB-5", "distributeSettlementAtomic com expectedDailyCount maior recusa 409 settlement_daily_charges_missing");
caso("DB-6", "distributeSettlementAtomic com base divergente recusa 409 concurrent_custody_append");
caso("DB-7a", "closeAuctionAtomic recusa quando nAccrueAtFreeze diverge do expectedDailyCount");
caso("DB-7b", "reclassifyScrapAtomic recusa quando nAccrueAtFreeze diverge do expectedDailyCount");
caso("DB-7c", "reclassifyUnrecoverableAtomic recusa quando nAccrueAtFreeze diverge do expectedDailyCount");
caso("DB-8", "distributeSettlementAtomic recusa quando nAccrueAtFreeze diverge do expectedDailyCount");
caso("DB-9", "distributeSettlementAtomic recusa quando claim travado diverge do removalStorageCents");
caso("DB-10", "lotAuctionAtomic recusa 409 auction_debts_settled com livro quitado");

caso("K1", "accrueProcess e closeAuction em paralelo não duplicam period_seq e preservam crédito 3750.00");
caso("K2", "diária semeada após frozen_at não entra no crédito da liquidação");
caso("K3", "mudança de fuso entre fechamento e trava recusa concurrent_custody_append e reprocessa no fuso novo");
caso("K4", "caso reservado no plano (sem definição explícita), mantido para rastreabilidade");
caso("K5", "createManual ADDITIONAL paralelo à liquidação nunca grava crédito abaixo do livro travado");
caso("K6", "trava FOR SHARE no pátio segura distributeSettlementAtomic até COMMIT de updateYard");
caso("K6b", "processo sem pátio não sofre recusa artificial pela nova trava");
caso("K7", "trava FOR SHARE no pátio segura closeAuctionAtomic até COMMIT de updateYard");
caso("K8", "quitação e lote em paralelo nunca terminam em LOTTED com tudo quitado");
