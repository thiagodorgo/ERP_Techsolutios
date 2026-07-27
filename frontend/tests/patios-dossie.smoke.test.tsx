import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { IntegritySeal } from "../src/modules/patios/processes/components/IntegritySeal";
import { InspectionSection } from "../src/modules/patios/processes/components/InspectionSection";
import { ProcessTimeline } from "../src/modules/patios/processes/components/ProcessTimeline";
import type { CustodyEventItem, InspectionView, VerifyResult } from "../src/modules/patios/processes/processes.types";

// UUIDs de vaga REAIS (formato do backend) — NUNCA devem aparecer crus no DOM (§allowlist).
const SPOT_UUID_A = "550e8400-e29b-41d4-a716-446655440000";
const SPOT_UUID_B = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

// Payloads REAIS do backend (não amigáveis): STATUS_CHANGE com enum interno + código-motivo; eventos de vaga com
// UUID cru; e um bloqueio judicial com `reason` de TEXTO LIVRE (deve ser preservado).
const EVENTS: CustodyEventItem[] = [
  {
    id: "ev-3",
    seq: 3,
    type: "SPOT_ASSIGNED",
    typeLabel: "Vaga atribuída",
    payload: { spotId: SPOT_UUID_A },
    occurredAt: "2026-07-20T12:00:00.000Z",
    actorId: "user-1",
    prevHash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    hash: "cccccccccccccccccccccccccccccccc",
    createdAt: "2026-07-20T12:00:00.000Z",
  },
  {
    id: "ev-1",
    seq: 1,
    type: "RECEPTION",
    typeLabel: "Recepção",
    payload: null,
    occurredAt: "2026-07-20T10:00:00.000Z",
    actorId: "user-1",
    prevHash: null,
    hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    createdAt: "2026-07-20T10:00:00.000Z",
  },
  {
    id: "ev-2",
    seq: 2,
    type: "STATUS_CHANGE",
    typeLabel: "Mudança de estado",
    payload: { from: "IN_REMOVAL", to: "RECEPTION", reason: "removal_reconciled", tenant_id: "SEGREDO" },
    occurredAt: "2026-07-20T11:00:00.000Z",
    actorId: "user-1",
    prevHash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    hash: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    createdAt: "2026-07-20T11:00:00.000Z",
  },
  {
    id: "ev-4",
    seq: 4,
    type: "SPOT_MOVED",
    typeLabel: "Vaga movida",
    payload: { from: SPOT_UUID_A, to: SPOT_UUID_B },
    occurredAt: "2026-07-20T13:00:00.000Z",
    actorId: "user-1",
    prevHash: "cccccccccccccccccccccccccccccccc",
    hash: "dddddddddddddddddddddddddddddddd",
    createdAt: "2026-07-20T13:00:00.000Z",
  },
  {
    id: "ev-5",
    seq: 5,
    type: "STATUS_CHANGE",
    typeLabel: "Mudança de estado",
    payload: { from: "ACTIVE_CUSTODY", to: "JUDICIAL_HOLD", reason: "Ordem judicial n. 4521/2026 - Vara de Execucoes Fiscais" },
    occurredAt: "2026-07-20T14:00:00.000Z",
    actorId: "user-1",
    prevHash: "dddddddddddddddddddddddddddddddd",
    hash: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    createdAt: "2026-07-20T14:00:00.000Z",
  },
];

test("timeline ordena por seq e traduz enums/motivos p/ PT-BR sem vazar UUID nem enum cru (payloads REAIS)", () => {
  const html = renderToString(<ProcessTimeline events={EVENTS} />);

  // Ordem por seq (marcador inequívoco = aria-label do número do evento).
  const idx = (n: number) => html.indexOf(`Evento número ${n}`);
  assert.ok(idx(1) >= 0 && idx(1) < idx(2) && idx(2) < idx(3) && idx(3) < idx(4) && idx(4) < idx(5), "eventos em ordem crescente de seq");

  // §11.3 — STATUS_CHANGE traduzido: from/to viram rótulo PT-BR (NUNCA o enum em inglês).
  assert.match(html, /Fundamento/);
  assert.match(html, /Em remoção/); // from IN_REMOVAL
  assert.match(html, /Recepção/); // to RECEPTION
  assert.match(html, /Custódia ativa/); // from ACTIVE_CUSTODY (ev-5)
  assert.match(html, /Bloqueio judicial/); // to JUDICIAL_HOLD (ev-5)
  // Código-motivo interno → PT-BR.
  assert.match(html, /Remoção reconciliada/);
  // `reason` de TEXTO LIVRE (fundamento do bloqueio judicial) é PRESERVADO.
  assert.match(html, /Ordem judicial n\. 4521\/2026 - Vara de Execucoes Fiscais/);

  // §allowlist/§2.8 — NENHUM UUID cru de vaga no DOM (SPOT_ASSIGNED/SPOT_MOVED suprimem o valor).
  assert.doesNotMatch(html, UUID_RE);
  assert.doesNotMatch(html, new RegExp(SPOT_UUID_A));
  assert.doesNotMatch(html, new RegExp(SPOT_UUID_B));
  // §11.3 — NENHUM enum interno em inglês vaza.
  assert.doesNotMatch(html, /\bIN_REMOVAL\b|\bRECEPTION\b|\bACTIVE_CUSTODY\b|\bJUDICIAL_HOLD\b/);
  // Código-motivo interno cru também não vaza.
  assert.doesNotMatch(html, /removal_reconciled/);

  // Hash exibido como PROVA, TRUNCADO (não o valor inteiro de 32 chars).
  assert.match(html, /aaaaaaaaaa…/);
  assert.doesNotMatch(html, /aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/);
  // §allowlist: tenant_id do payload NUNCA vaza.
  assert.doesNotMatch(html, /SEGREDO/);
  assert.doesNotMatch(html, /\btenant\b/i);
});

test("timeline vazia mostra EmptyState honesto (D-007)", () => {
  const html = renderToString(<ProcessTimeline events={[]} />);
  assert.match(html, /Nenhum evento de custódia registrado/);
});

test("selo de integridade: cadeia válida → verde 'Cadeia íntegra (N eventos)'", () => {
  const verify: VerifyResult = { processId: "p1", valid: true, eventCount: 3, headHash: "cccccccccccccccccccccccccccccccc", brokenAt: null, checkedAt: "2026-07-20T12:00:00.000Z" };
  const html = renderToString(<IntegritySeal verify={verify} />);
  assert.match(html, /Cadeia íntegra \(3 eventos\)/);
  assert.doesNotMatch(html, /Adulteração/);
});

test("selo de integridade: cadeia inválida → vermelho 'Adulteração detectada no evento #brokenAt'", () => {
  const verify: VerifyResult = { processId: "p1", valid: false, eventCount: 3, headHash: "cccccccccccccccccccccccccccccccc", brokenAt: 2, checkedAt: "2026-07-20T12:00:00.000Z" };
  const html = renderToString(<IntegritySeal verify={verify} />);
  assert.match(html, /Adulteração detectada no evento #2/);
  assert.doesNotMatch(html, /Cadeia íntegra/);
});

test("vistoria: galeria agrupada por conjunto + selo de completude; fileUrl é o único link de mídia", () => {
  const view: InspectionView = {
    inspection: {
      id: "insp-1",
      processId: "p1",
      inspectedAt: "2026-07-20T10:00:00.000Z",
      agentName: "Agente de recepção",
      bodyworkState: "Riscos na lateral",
      paintState: "Boa",
      tiresState: "Regulares",
      internalObjects: "Nenhum",
      missingEquipment: "Estepe ausente",
      odometerKm: "123456.7",
      observations: "Sem observações adicionais",
      signerName: "Fulano",
      signatureStatus: "SIGNED",
      signatureStatusLabel: "Assinado",
      signedAt: "2026-07-20T10:05:00.000Z",
      completedAt: "2026-07-20T10:10:00.000Z",
    },
    photos: [
      { id: "ph-1", set: "FRONT", fileUrl: "https://media.example/ph-1.jpg", status: "stored", createdAt: "2026-07-20T10:00:00.000Z" },
      { id: "ph-2", set: "PLATE", fileUrl: "https://media.example/ph-2.jpg", status: "stored", createdAt: "2026-07-20T10:00:00.000Z" },
    ],
    requiredSets: ["FRONT", "PLATE", "ODOMETER"],
    complete: false,
  };
  const html = renderToString(<InspectionSection view={view} />);

  assert.match(html, /Conjunto FRONT/);
  assert.match(html, /Conjunto PLATE/);
  assert.match(html, /Vistoria incompleta/);
  // O conjunto exigido sem foto (ODOMETER) aparece como pendente.
  assert.match(html, /ODOMETER/);
  assert.match(html, /pendente/);
  // fileUrl é o único link de mídia (console autenticado).
  assert.match(html, /https:\/\/media\.example\/ph-1\.jpg/);
  assert.match(html, /Estepe ausente/);
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /pol[íi]cia/i);
});

test("vistoria ausente → EmptyState honesto 'Vistoria de recepção ainda não registrada'", () => {
  const html = renderToString(<InspectionSection view={null} />);
  assert.match(html, /Vistoria de recepção ainda não registrada/);
});
