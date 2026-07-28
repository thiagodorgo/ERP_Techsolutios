import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { AppraisalForm } from "../src/modules/patios/auction/components/AppraisalForm";
import { AuctionStatePanel } from "../src/modules/patios/auction/components/AuctionStatePanel";
import { ScrapGateChecklist } from "../src/modules/patios/auction/components/ScrapGateChecklist";
import {
  AUCTION_FUNNEL_STATUSES,
  adaptAuctionView,
  auctionActionErrorMessage,
  countAuctionStages,
  deriveScrapGate,
  filterAuctionProcesses,
  isEdictComplete,
  isScrapGateSatisfied,
  resolveAuctionStage,
} from "../src/modules/patios/auction/auction.adapter";
import type { AuctionEdictDto, AuctionView } from "../src/modules/patios/auction/auction.types";
import type { ImpoundStatus, ProcessListItem } from "../src/modules/patios/processes/processes.types";

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function buildEdict(overrides: Partial<AuctionEdictDto> = {}): AuctionEdictDto {
  return {
    id: `edict-${overrides.roundNumber ?? 1}`,
    processId: "proc-1",
    roundNumber: 1,
    classification: "CONSERVED",
    classificationLabel: "Conservado",
    edictReference: "Edital 12/2026",
    edictPlatform: "PNCP",
    publishedAt: "2026-06-01T00:00:00.000Z",
    auctioneerRef: "…4521",
    pncpUrl: null,
    businessDays: 15,
    canSeeAppraisal: false,
    appraisalAmount: null,
    minBidAmount: null,
    status: "DESIGNATED",
    statusLabel: "Designado",
    notes: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function buildView(overrides: Partial<AuctionView> = {}): AuctionView {
  return {
    strikeCount: 0,
    maxAttempts: 2,
    strikesRemaining: 2,
    status: "AUCTION_ELIGIBLE",
    attempts: [],
    edicts: [],
    ...overrides,
  };
}

// Duas rodadas desertas + editais completos = gate de sucata satisfeito (espelho de evaluateScrapEdictGate).
function scrapReadyView(): AuctionView {
  return buildView({
    strikeCount: 2,
    strikesRemaining: 0,
    attempts: [
      { id: "a1", processId: "proc-1", roundNumber: 1, outcome: "DESERTED", outcomeLabel: "Leilão deserto", notes: null, winnerRef: null, soldAmount: null, saleNoteReference: null, defaultedSaleRound: null, createdAt: "2026-06-10T00:00:00.000Z", updatedAt: "2026-06-10T00:00:00.000Z" },
      { id: "a2", processId: "proc-1", roundNumber: 2, outcome: "DESERTED", outcomeLabel: "Leilão deserto", notes: null, winnerRef: null, soldAmount: null, saleNoteReference: null, defaultedSaleRound: null, createdAt: "2026-06-20T00:00:00.000Z", updatedAt: "2026-06-20T00:00:00.000Z" },
    ],
    edicts: [buildEdict({ roundNumber: 1 }), buildEdict({ roundNumber: 2, id: "edict-2" })],
  });
}

// ── (1) SIGILO art. 28 — sem auction:appraise a UI NÃO expõe appraisal/min_bid nem a ação de avaliação ──────────
test("sigilo art. 28: adaptAuctionView com DTO SEM as chaves de avaliação → canSeeAppraisal=false e valores null", () => {
  const withoutAppraisal = adaptAuctionView({
    data: { status: "AUCTION_ELIGIBLE", strikeCount: 0, maxAttempts: 2, strikesRemaining: 2 },
    attempts: [],
    edicts: [{ id: "e1", processId: "proc-1", roundNumber: 1, classification: "CONSERVED", edictReference: "Edital 1", status: "DESIGNATED", statusLabel: "Designado" }],
  });
  assert.ok(withoutAppraisal);
  assert.equal(withoutAppraisal!.edicts[0].canSeeAppraisal, false);
  assert.equal(withoutAppraisal!.edicts[0].appraisalAmount, null);
  assert.equal(withoutAppraisal!.edicts[0].minBidAmount, null);

  const withAppraisal = adaptAuctionView({
    data: { status: "AUCTION_ELIGIBLE", strikeCount: 0, maxAttempts: 2, strikesRemaining: 2 },
    attempts: [],
    edicts: [{ id: "e1", processId: "proc-1", roundNumber: 1, classification: "CONSERVED", edictReference: "Edital 1", status: "DESIGNATED", statusLabel: "Designado", appraisalAmount: "12000.00", minBidAmount: "6000.00" }],
  });
  assert.equal(withAppraisal!.edicts[0].canSeeAppraisal, true);
  assert.equal(withAppraisal!.edicts[0].appraisalAmount, "12000.00");
});

test("sigilo art. 28: AuctionStatePanel sem canAppraise NÃO renderiza coluna/valores de avaliação; com canAppraise renderiza", () => {
  const view = buildView({
    status: "AUCTION_PREP",
    edicts: [buildEdict({ canSeeAppraisal: true, appraisalAmount: "12000.00", minBidAmount: "6000.00" })],
  });

  const denied = renderToString(<AuctionStatePanel view={view} status="AUCTION_PREP" statusLabel="Em preparação de leilão" canAppraise={false} />);
  assert.doesNotMatch(denied, /Avaliação · Lance mínimo/);
  assert.doesNotMatch(denied, /12\.000,00/);
  assert.doesNotMatch(denied, /6\.000,00/);
  assert.doesNotMatch(denied, /Registrar avaliação/); // a ação de avaliação NÃO aparece na superfície de leitura

  const allowed = renderToString(<AuctionStatePanel view={view} status="AUCTION_PREP" statusLabel="Em preparação de leilão" canAppraise />);
  assert.match(allowed, /Avaliação · Lance mínimo/);
  assert.match(allowed, /12\.000,00/);
});

test("sigilo art. 28: o formulário de avaliação existe (e expõe a ação) — só é montado pelo painel com auction:appraise", () => {
  const html = renderToString(<AppraisalForm defaultRound={1} appraisalAmount={null} minBidAmount={null} busy={false} error={null} onSubmit={() => {}} />);
  assert.match(html, /Registrar avaliação/);
  assert.match(html, /Avaliação sigilosa \(art\. 28\)/);
  assert.match(html, /sigilosos/);
});

// ── (2) Predicado PURO do gate de sucata — só habilita com 2 strikes + editais completos ─────────────────────────
test("scrap-gate: isScrapGateSatisfied só é true com 2 rodadas desertas + editais completos por rodada", () => {
  const ready = deriveScrapGate(scrapReadyView());
  assert.equal(ready.length, 3);
  assert.equal(isScrapGateSatisfied(ready), true);

  // Falta um strike (só a rodada 1 deserta).
  const oneStrike = scrapReadyView();
  assert.equal(
    isScrapGateSatisfied(deriveScrapGate({ ...oneStrike, strikeCount: 1, attempts: [oneStrike.attempts[0]] })),
    false,
    "só 1 rodada deserta",
  );

  // Falta o edital de uma rodada deserta.
  assert.equal(
    isScrapGateSatisfied(deriveScrapGate({ ...scrapReadyView(), edicts: [buildEdict({ roundNumber: 1 })] })),
    false,
    "edital ausente na rodada 2",
  );

  // Edital incompleto (business_days < 15).
  assert.equal(
    isScrapGateSatisfied(deriveScrapGate({ ...scrapReadyView(), edicts: [buildEdict({ roundNumber: 1 }), buildEdict({ roundNumber: 2, id: "edict-2", businessDays: 10 })] })),
    false,
    "edital com prazo < 15 d.u.",
  );
});

test("scrap-gate: isEdictComplete exige referência + published_at + business_days >= 15 (espelho do backend)", () => {
  assert.equal(isEdictComplete(buildEdict()), true);
  assert.equal(isEdictComplete(buildEdict({ edictReference: null })), false);
  assert.equal(isEdictComplete(buildEdict({ publishedAt: null })), false);
  assert.equal(isEdictComplete(buildEdict({ businessDays: 14 })), false);
});

test("ScrapGateChecklist: botão IRREVERSÍVEL nasce DESABILITADO com pendência; checklist mostra o que falta", () => {
  const pending = deriveScrapGate(buildView()); // sem strikes → tudo pendente
  const html = renderToString(<ScrapGateChecklist preconditions={pending} canReclassify busy={false} error={null} onReclassify={() => {}} />);
  assert.match(html, /Reciclar a sucata/);
  assert.match(html, /disabled/);
  assert.match(html, /Pendente/);
  assert.match(html, /pré-condição pendente|pré-condições pendentes/);

  const ready = renderToString(<ScrapGateChecklist preconditions={deriveScrapGate(scrapReadyView())} canReclassify busy={false} error={null} onReclassify={() => {}} />);
  assert.doesNotMatch(ready, /disabled/);
  assert.match(ready, /IRREVERSÍVEL/); // com o gate satisfeito, o aviso de irreversibilidade aparece na chamada
});

// ── (3) Mapa reason→PT-BR cobre os 409 reais sem cair no genérico ────────────────────────────────────────────────
test("reason→PT-BR: todos os reasons reais das guardas de leilão têm mensagem própria (distinta, não genérica)", () => {
  const generic = auctionActionErrorMessage("reason_desconhecido_qualquer", 409);
  const reasons = [
    // Elegibilidade (6)
    "auction_scope_not_public",
    "auction_deadline_not_reached",
    "auction_notification_trail_incomplete",
    "auction_owner_initial_missing",
    "auction_chain_broken",
    "auction_release_in_progress",
    // Sucata (3)
    "scrap_strikes_insufficient",
    "scrap_edict_missing_for_round",
    "scrap_edict_incomplete_for_round",
    // Inservibilidade
    "scrap_classification_required",
    "recycling_release_in_progress",
    // Preparo / lote
    "prep_classification_not_conserved",
    "prep_appraisal_missing",
    "lot_edict_incomplete",
    "lot_min_bid_missing",
    // Arremate (6)
    "sale_winner_missing",
    "sale_round_not_lotted",
    "sale_round_not_conserved",
    "sale_round_edict_incomplete",
    "sale_below_min_bid",
    "sale_note_missing",
    // Consumação / inadimplência
    "close_payment_unconfirmed",
    "default_sale_missing",
    // Serviço
    "auction_not_eligible",
    "auction_edict_missing",
  ];
  const messages = reasons.map((reason) => auctionActionErrorMessage(reason, 409));
  for (const [index, message] of messages.entries()) {
    assert.notEqual(message, generic, `${reasons[index]} caiu no genérico`);
    assert.doesNotMatch(message, /\btenant\b/i);
    assert.doesNotMatch(message, /pol[íi]cia/i);
  }
  // Nenhuma colisão de tradução entre reasons de propósito distinto.
  assert.equal(new Set(messages).size, reasons.length);

  // Âncoras de fidelidade.
  assert.match(auctionActionErrorMessage("prep_appraisal_missing"), /art\. 28/);
  assert.match(auctionActionErrorMessage("sale_below_min_bid"), /lance m[íi]nimo/i);
  assert.match(auctionActionErrorMessage("scrap_edict_incomplete_for_round"), /15 dias [úu]teis/i);
  // Fallback por status quando o reason é ausente.
  assert.match(auctionActionErrorMessage(null, 403), /sem permiss[ãa]o/i);
});

// ── (4) Funil agrupa/filtra por estado SEM N+1 (funções puras sobre a lista já buscada) ──────────────────────────
test("funil: countAuctionStages/filterAuctionProcesses agrupam por estado de leilão (sem chamada por linha)", () => {
  const item = (id: string, status: ImpoundStatus): ProcessListItem => ({
    id,
    vehiclePlate: id.toUpperCase(),
    vehicleUnidentified: false,
    yardId: null,
    profileId: "prof-1",
    status,
    statusLabel: status,
    enteredAt: "2026-06-01T00:00:00.000Z",
    frozenAt: null,
    originAuthority: "Autoridade solicitante",
    custodySeqHead: 1,
    createdAt: "2026-06-01T00:00:00.000Z",
  });
  const items = [
    item("a", "AUCTION_ELIGIBLE"),
    item("b", "AUCTION_ELIGIBLE"),
    item("c", "AUCTION_PREP"),
    item("d", "LOTTED"),
    item("e", "AUCTIONED"),
    item("f", "AUCTION_CLOSED"),
    item("g", "DIRECT_RECYCLING"),
    item("h", "ACTIVE_CUSTODY"), // fora do funil
    item("i", "RELEASED"), // fora do funil
  ];

  const counts = countAuctionStages(items);
  assert.equal(counts.AUCTION_ELIGIBLE, 2);
  assert.equal(counts.AUCTION_PREP, 1);
  assert.equal(counts.DIRECT_RECYCLING, 1);

  // O universo do funil = só os 6 estados de leilão (ACTIVE_CUSTODY/RELEASED NUNCA entram).
  assert.deepEqual(filterAuctionProcesses(items, "all").map((process) => process.id), ["a", "b", "c", "d", "e", "f", "g"]);
  // Filtro por etapa clicada.
  assert.deepEqual(filterAuctionProcesses(items, "AUCTION_ELIGIBLE").map((process) => process.id), ["a", "b"]);
  assert.equal(AUCTION_FUNNEL_STATUSES.length, 6);
});

test("resolveAuctionStage (PURO): mapeia process.status para o estágio do painel", () => {
  assert.equal(resolveAuctionStage("ACTIVE_CUSTODY"), "custody");
  assert.equal(resolveAuctionStage("AUCTION_ELIGIBLE"), "eligible");
  assert.equal(resolveAuctionStage("AUCTION_PREP"), "prep");
  assert.equal(resolveAuctionStage("LOTTED"), "lotted");
  assert.equal(resolveAuctionStage("AUCTIONED"), "auctioned");
  assert.equal(resolveAuctionStage("AUCTION_CLOSED"), "closed");
  assert.equal(resolveAuctionStage("DIRECT_RECYCLING"), "recycling");
  assert.equal(resolveAuctionStage("RECEPTION"), "unavailable");
});

// ── (5) §2.8 + white-label + estados ─────────────────────────────────────────────────────────────────────────────
test("§2.8/white-label: o painel de estado renderiza a máscara do arrematante, nunca UUID/tenant; sem 'polícia'", () => {
  const view = buildView({
    status: "AUCTION_CLOSED",
    edicts: [buildEdict({ status: "CLOSED", statusLabel: "Encerrado" })],
    attempts: [
      { id: "550e8400-e29b-41d4-a716-446655440000", processId: "proc-1", roundNumber: 1, outcome: "SOLD", outcomeLabel: "Arrematado", notes: null, winnerRef: "…7788", soldAmount: "8500.00", saleNoteReference: "Nota 9/2026", defaultedSaleRound: null, createdAt: "2026-06-25T00:00:00.000Z", updatedAt: "2026-06-25T00:00:00.000Z" },
    ],
  });
  const html = renderToString(<AuctionStatePanel view={view} status="AUCTION_CLOSED" statusLabel="Leilão encerrado" canAppraise={false} />);
  assert.match(html, /Arrematado/);
  assert.match(html, /…7788/); // máscara do arrematante (§2.8)
  assert.match(html, /8\.500,00/); // valor arrematado (público)
  assert.doesNotMatch(html, UUID_RE); // o id do attempt (UUID) NUNCA é renderizado
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("estados: acesso-negado esconde a ação IRREVERSÍVEL; error → Alert; empty → sem rodadas", () => {
  const gateDenied = renderToString(<ScrapGateChecklist preconditions={deriveScrapGate(scrapReadyView())} canReclassify={false} busy={false} error={null} onReclassify={() => {}} />);
  assert.match(gateDenied, /Somente leitura/);
  assert.doesNotMatch(gateDenied, /Reciclar a sucata/);

  const gateError = renderToString(<ScrapGateChecklist preconditions={deriveScrapGate(scrapReadyView())} canReclassify busy={false} error="Falhou" onReclassify={() => {}} />);
  assert.match(gateError, /Não foi possível reciclar a sucata/);

  const emptyRounds = renderToString(<AuctionStatePanel view={buildView()} status="AUCTION_ELIGIBLE" statusLabel="Elegível a leilão" canAppraise={false} />);
  assert.match(emptyRounds, /Nenhuma rodada registrada/);
});
