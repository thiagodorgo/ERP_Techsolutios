import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { GateLiberacaoChecklist } from "../src/modules/patios/release/components/GateLiberacaoChecklist";
import { QuitacaoPanel } from "../src/modules/patios/release/components/QuitacaoPanel";
import { ComprovanteLiberacao } from "../src/modules/patios/release/components/ComprovanteLiberacao";
import { AprovacaoAutoridade } from "../src/modules/patios/release/components/AprovacaoAutoridade";
import { DossieLiberacao } from "../src/modules/patios/release/components/DossieLiberacao";
import {
  deriveReleaseGate,
  filterReleasableProcesses,
  isConsumeEnabled,
  releaseActionErrorMessage,
  resolveReleaseStage,
} from "../src/modules/patios/release/release.adapter";
import type { ReleaseCheckDto, ReleaseDto } from "../src/modules/patios/release/release.types";
import type { ChargeStatementView } from "../src/modules/patios/charges/charges.types";
import type { ProcessDetail, ProcessListItem } from "../src/modules/patios/processes/processes.types";

// UUID interno (tenant_id/anexo) — §2.8/allowlist: NUNCA deve vazar no DOM (o documento/CPF de quem retira NÃO é
// UUID — é dado de domínio que SÓ o comprovante art. 24 exibe).
const INTERNAL_UUID = "550e8400-e29b-41d4-a716-446655440000";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

function buildRelease(overrides: Partial<ReleaseDto> = {}): ReleaseDto {
  return {
    id: "rel-1",
    processId: "proc-1",
    kind: "STANDARD",
    kindLabel: "Restituição definitiva",
    status: "IN_PROGRESS",
    statusLabel: "Em andamento",
    authorityApprovedBy: null,
    authorityApprovedAt: null,
    authorityReference: null,
    authorityNote: null,
    recipientName: null,
    recipientDocument: null,
    recipientRelationship: null,
    recipientRelationshipLabel: null,
    releasedAt: null,
    repairDeadline: null,
    repairOverdue: false,
    settledTotal: null,
    createdBy: null,
    updatedBy: null,
    createdAt: "2026-07-27T10:00:00.000Z",
    updatedAt: "2026-07-27T10:00:00.000Z",
    ...overrides,
  };
}

function buildCheck(overrides: Partial<ReleaseCheckDto> = {}): ReleaseCheckDto {
  return {
    id: "chk-1",
    releaseId: "rel-1",
    code: "DOC_OWNER",
    label: "Documento do proprietário",
    required: true,
    satisfied: true,
    note: null,
    attachmentId: null,
    checkedBy: null,
    checkedAt: null,
    createdAt: "2026-07-27T10:00:00.000Z",
    updatedAt: "2026-07-27T10:00:00.000Z",
    ...overrides,
  };
}

function buildStatement(overrides: Partial<ChargeStatementView> = {}): ChargeStatementView {
  return {
    processId: "proc-1",
    currency: "BRL",
    lines: [
      { id: "l-removal", kind: "REMOVAL", kindLabel: "Remoção", periodSeq: null, refDate: null, description: "Remoção", quantity: "1.00", unitAmount: "150.00", totalAmount: "150.00", currency: "BRL", tariffId: null, adjustmentOfChargeId: null, settledAt: null },
    ],
    subtotals: [{ kind: "REMOVAL", kindLabel: "Remoção", total: "150.00" }],
    total: "150.00",
    cap: null,
    asOf: "2026-07-27T12:00:00.000Z",
    reconciliationPending: false,
    overAccruedDailies: 0,
    ...overrides,
  };
}

// Liberação "pronta": quem retira + autoridade + settled + reconciliada + checklist obrigatório atendido.
function readyRelease(): ReleaseDto {
  return buildRelease({
    recipientName: "João da Silva",
    recipientDocument: "123.456.789-00",
    recipientRelationship: "OWNER",
    recipientRelationshipLabel: "Proprietário",
    authorityApprovedAt: "2026-07-27T11:00:00.000Z",
    authorityReference: "Ofício 4521/2026",
  });
}

function settledStatement(): ChargeStatementView {
  return buildStatement({
    lines: [
      { id: "l-removal", kind: "REMOVAL", kindLabel: "Remoção", periodSeq: null, refDate: null, description: "Remoção", quantity: "1.00", unitAmount: "150.00", totalAmount: "150.00", currency: "BRL", tariffId: null, adjustmentOfChargeId: null, settledAt: "2026-07-27T11:30:00.000Z" },
    ],
  });
}

// ── (1) Predicado PURO do gate: o botão só habilita com as 5 pré-condições satisfeitas ───────────────────────
test("gate I5: isConsumeEnabled só é true com as 5 pré-condições satisfeitas (espelho de guardReleaseGate)", () => {
  const ready = deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement());
  assert.equal(ready.length, 5);
  assert.equal(isConsumeEnabled(ready), true);

  // Cada pré-condição, quebrada isoladamente, DESABILITA a consumação.
  assert.equal(isConsumeEnabled(deriveReleaseGate(readyRelease(), [buildCheck({ satisfied: false })], settledStatement())), false, "checklist obrigatório pendente");
  assert.equal(isConsumeEnabled(deriveReleaseGate(buildRelease({ ...readyRelease(), authorityApprovedAt: null }), [buildCheck()], settledStatement())), false, "autoridade ausente");
  assert.equal(isConsumeEnabled(deriveReleaseGate(buildRelease({ ...readyRelease(), recipientName: null }), [buildCheck()], settledStatement())), false, "quem retira ausente");
  assert.equal(isConsumeEnabled(deriveReleaseGate(readyRelease(), [buildCheck()], buildStatement())), false, "débitos em aberto");
  assert.equal(isConsumeEnabled(deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement().reconciliationPending ? settledStatement() : { ...settledStatement(), reconciliationPending: true })), false, "reconciliação pendente");
  // Sem a guia de débitos (statement null) a UI NÃO afirma que os débitos estão quitados → mantém desabilitado.
  assert.equal(isConsumeEnabled(deriveReleaseGate(readyRelease(), [buildCheck()], null)), false, "guia indisponível");
});

test("gate: a ordem das 5 pré-condições espelha guardReleaseGate (reconciliação→débitos→checklist→autoridade→quem retira)", () => {
  const gate = deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement());
  assert.deepEqual(
    gate.map((precondition) => precondition.key),
    ["reconciliation_pending", "debts_unsettled", "requirement_unmet", "authority_missing", "recipient_missing"],
  );
});

test("GateLiberacaoChecklist: botão 'Consumar liberação' nasce DESABILITADO com pendência; checklist visual mostra o que falta", () => {
  const pending = deriveReleaseGate(buildRelease({ ...readyRelease(), recipientName: null }), [buildCheck()], settledStatement());
  const html = renderToString(<GateLiberacaoChecklist preconditions={pending} canConsume busy={false} error={null} onConsume={() => {}} />);
  assert.match(html, /Consumar liberação/);
  assert.match(html, /disabled/);
  assert.match(html, /Pendente/); // pelo menos uma pré-condição pendente (quem retira)
  assert.match(html, /Quem retira identificado/);
  assert.match(html, /pré-condição pendente|pré-condições pendentes/);

  const ready = renderToString(<GateLiberacaoChecklist preconditions={deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement())} canConsume busy={false} error={null} onConsume={() => {}} />);
  assert.match(ready, /Todas as pré-condições estão satisfeitas/);
  assert.doesNotMatch(ready, /disabled/);
});

// ── (2) Mapa reason→PT-BR: cobre os 5 do consume + repair_deadline_invalid + release_already_in_progress ──────
test("reason→PT-BR: os 5 reasons do gate + repair_deadline_invalid + release_already_in_progress são DISTINTOS e não caem no genérico", () => {
  const generic = releaseActionErrorMessage("qualquer_reason_desconhecido", 409);
  const reasons = [
    "release_reconciliation_pending",
    "release_debts_unsettled",
    "release_requirement_unmet",
    "release_authority_missing",
    "release_recipient_missing",
    "repair_deadline_invalid",
    "release_already_in_progress",
  ];
  const messages = reasons.map((reason) => releaseActionErrorMessage(reason, 409));
  for (const message of messages) {
    assert.notEqual(message, generic, "cada reason específico tem mensagem própria (não genérica)");
    assert.doesNotMatch(message, /\btenant\b/i);
    assert.doesNotMatch(message, /pol[íi]cia/i);
  }
  // Todas distintas entre si (nenhuma colisão de tradução).
  assert.equal(new Set(messages).size, reasons.length);
  // Conteúdo-âncora de alguns (fidelidade dos 5 reasons).
  assert.match(releaseActionErrorMessage("release_debts_unsettled"), /quita[çc][ãa]o/i);
  assert.match(releaseActionErrorMessage("release_recipient_missing"), /quem retira/i);
  assert.match(releaseActionErrorMessage("repair_deadline_invalid"), /60 dias/);
  // Fallback por status (sessão/permissão) quando o reason é ausente.
  assert.match(releaseActionErrorMessage(null, 403), /sem permiss[ãa]o/i);
});

// ── (3) Honestidade de dinheiro: exibe settledTotal/total sem afirmar "quitado" com débito em aberto ─────────
test("QuitacaoPanel: com débito em aberto exibe o Total apurado, mas NÃO afirma que foi quitado", () => {
  const html = renderToString(<QuitacaoPanel statement={buildStatement()} settleResult={null} canSettle busy={false} error={null} onSettle={() => {}} />);
  assert.match(html, /Total devido/); // sem reconciliação pendente → "Total devido"
  assert.match(html, /R\$/);
  assert.match(html, /150,00/);
  assert.match(html, /Registrar quitação/);
  // Honestidade: nada de "quitação registrada"/"total quitado" antes de existir um resultado de settle.
  assert.doesNotMatch(html, /Quitação registrada/);
  assert.doesNotMatch(html, /Total quitado/);
});

test("QuitacaoPanel: sob reconciliação pendente o total é 'apurado' (memória de cálculo), não 'devido'", () => {
  const html = renderToString(<QuitacaoPanel statement={buildStatement({ reconciliationPending: true, overAccruedDailies: 2 })} settleResult={null} canSettle busy={false} error={null} onSettle={() => {}} />);
  assert.match(html, /Total apurado \(memória de cálculo\)/);
  assert.doesNotMatch(html, /Total devido/);
});

test("QuitacaoPanel: após o settle exibe settledTotal + estornoCount REAIS do backend (BRL, sem float cru)", () => {
  const html = renderToString(
    <QuitacaoPanel
      statement={settledStatement()}
      settleResult={{ settledTotal: "150.00", settledCount: 1, estornoCount: 2, chargeIds: ["c1"] }}
      canSettle
      busy={false}
      error={null}
      onSettle={() => {}}
    />,
  );
  assert.match(html, /Quitação registrada/);
  assert.match(html, /Total quitado/);
  assert.match(html, /150,00/);
  assert.match(html, /2 estornos de reconciliação lançados/);
});

// ── (4) Estados: empty / denied / error ──────────────────────────────────────────────────────────────────────
test("estados: acesso-negado (sem permissão) esconde os botões de escrita; error → Alert", () => {
  // Gate sem impound:transition → somente leitura (sem botão de consumir).
  const gateDenied = renderToString(<GateLiberacaoChecklist preconditions={deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement())} canConsume={false} busy={false} error={null} onConsume={() => {}} />);
  assert.match(gateDenied, /Somente leitura/);
  assert.doesNotMatch(gateDenied, /Consumar liberação/);

  // Quitação sem charging:settle → sem botão de quitar.
  const settleDenied = renderToString(<QuitacaoPanel statement={buildStatement()} settleResult={null} canSettle={false} busy={false} error={null} onSettle={() => {}} />);
  assert.match(settleDenied, /não tem permissão para registrar a quitação/);
  assert.doesNotMatch(settleDenied, /Registrar quitação/);

  // Quitação sem guia (empty honesto).
  const noStatement = renderToString(<QuitacaoPanel statement={null} settleResult={null} canSettle busy={false} error={null} onSettle={() => {}} />);
  assert.match(noStatement, /Guia de débitos indisponível/);

  // Error → Alert de falha.
  const gateError = renderToString(<GateLiberacaoChecklist preconditions={deriveReleaseGate(readyRelease(), [buildCheck()], settledStatement())} canConsume busy={false} error="Falhou" onConsume={() => {}} />);
  assert.match(gateError, /Não foi possível consumar a liberação/);
});

// ── §2.8 + white-label ───────────────────────────────────────────────────────────────────────────────────────
test("§2.8: documento/referência do ato renderizam SÓ no comprovante — no dossiê o resumo mostra só nome + relação", () => {
  const html = renderToString(
    <DossieLiberacao release={readyRelease()} checks={[buildCheck()]} canProcess busy={false} error={null} onRecipient={() => {}} onCheck={() => {}} />,
  );
  assert.match(html, /João da Silva/);
  assert.match(html, /Proprietário/);
  // O documento (CPF) e a referência do ato NÃO aparecem fora do comprovante.
  assert.doesNotMatch(html, /123\.456\.789-00/);
  assert.doesNotMatch(html, /Ofício 4521\/2026/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("selo da autoridade mostra SÓ o instante do ato (nunca o id interno do aprovador nem a referência)", () => {
  const html = renderToString(<AprovacaoAutoridade release={readyRelease()} canApprove busy={false} error={null} onApprove={() => {}} />);
  assert.match(html, /Autorização registrada/);
  assert.match(html, /Autorizada pela autoridade solicitante em/);
  assert.doesNotMatch(html, /Ofício 4521\/2026/); // referência do ato só no comprovante
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("Comprovante art. 24: exibe entrada/saída/quem retira/kindLabel/settledTotal e documento+referência (única superfície §2.8); sem tenant_id cru", () => {
  const process: ProcessDetail = {
    id: "proc-1",
    vehiclePlate: "ABC1D23",
    vehicleUnidentified: false,
    yardId: "yard-1",
    profileId: "prof-1",
    status: "RELEASED",
    statusLabel: "Liberado",
    enteredAt: "2026-07-20T08:00:00.000Z",
    frozenAt: "2026-07-27T10:00:00.000Z",
    originAuthority: "Autoridade solicitante municipal",
    custodySeqHead: 9,
    createdAt: "2026-07-20T08:00:00.000Z",
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
    updatedAt: "2026-07-27T12:00:00.000Z",
  };
  const release = buildRelease({ ...readyRelease(), status: "COMPLETED", statusLabel: "Concluída", releasedAt: "2026-07-27T12:00:00.000Z", settledTotal: "150.00" });
  const html = renderToString(<ComprovanteLiberacao release={release} process={process} onClose={() => {}} />);

  assert.match(html, /Comprovante de liberação/);
  assert.match(html, /Restituição definitiva/); // kindLabel
  assert.match(html, /ABC1D23/);
  assert.match(html, /Entrada no pátio/);
  assert.match(html, /João da Silva/);
  // §2.8 — documento e referência do ato SÓ AQUI.
  assert.match(html, /123\.456\.789-00/);
  assert.match(html, /Ofício 4521\/2026/);
  assert.match(html, /150,00/); // settledTotal em BRL
  // Nunca vaza tenant_id/UUID interno; nunca "tenant"/"polícia".
  assert.doesNotMatch(html, new RegExp(INTERNAL_UUID));
  assert.doesNotMatch(html, UUID_RE);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

// ── (5) Fila filtra SÓ os liberáveis ─────────────────────────────────────────────────────────────────────────
test("fila: filterReleasableProcesses inclui só as liberações em andamento (e elegíveis quando pedido)", () => {
  const item = (id: string, status: ProcessListItem["status"]): ProcessListItem => ({
    id,
    vehiclePlate: id.toUpperCase(),
    vehicleUnidentified: false,
    yardId: null,
    profileId: "prof-1",
    status,
    statusLabel: status,
    enteredAt: "2026-07-20T08:00:00.000Z",
    frozenAt: null,
    originAuthority: "Autoridade",
    custodySeqHead: 1,
    createdAt: "2026-07-20T08:00:00.000Z",
  });
  const items = [
    item("a", "RELEASE_IN_PROGRESS"),
    item("b", "RELEASED_FOR_REPAIR"),
    item("c", "ACTIVE_CUSTODY"),
    item("d", "RELEASED"),
    item("e", "AUCTION_ELIGIBLE"),
    item("f", "CLOSED"),
    item("g", "RECEPTION"),
  ];

  // Padrão (em andamento): só RELEASE_IN_PROGRESS + RELEASED_FOR_REPAIR.
  assert.deepEqual(filterReleasableProcesses(items).map((process) => process.id), ["a", "b"]);
  // Com elegíveis: soma ACTIVE_CUSTODY (nunca RELEASED/leilão/encerrado/recepção).
  assert.deepEqual(filterReleasableProcesses(items, true).map((process) => process.id), ["a", "b", "c"]);
});

test("resolveReleaseStage (PURO): mapeia estado × liberação em curso para o estágio do painel", () => {
  assert.equal(resolveReleaseStage("ACTIVE_CUSTODY", null), "start");
  assert.equal(resolveReleaseStage("ACTIVE_CUSTODY", buildRelease({ kind: "FOR_REPAIR" })), "for_repair_prep");
  assert.equal(resolveReleaseStage("RELEASE_IN_PROGRESS", buildRelease()), "standard");
  assert.equal(resolveReleaseStage("RELEASED_FOR_REPAIR", buildRelease({ kind: "FOR_REPAIR" })), "for_repair_out");
  assert.equal(resolveReleaseStage("RELEASED", buildRelease()), "completed");
  assert.equal(resolveReleaseStage("RECEPTION", null), "unavailable");
});
