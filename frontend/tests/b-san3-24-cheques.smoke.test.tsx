import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";

import { cashImpactFor } from "../src/modules/finance/cheques/cheque-cash-impact";
import type { Cheque } from "../src/modules/finance/cheques/cheques.types";
import { ChequeClearConfirm } from "../src/modules/finance/cheques/components/ChequeClearConfirm";
import type { ChequesViewModel } from "../src/modules/finance/cheques/components/cheques.shared";
import { ChequesViewA } from "../src/modules/finance/cheques/components/ChequesViewA";
import { ChequesViewB } from "../src/modules/finance/cheques/components/ChequesViewB";
import { ChequesViewC } from "../src/modules/finance/cheques/components/ChequesViewC";
import { EMPTY_FILTER } from "../src/modules/finance/cheques/useCheques";

// B-SAN3-24 (24a, A6c — R-CAIXA na tela) — a confirmação renderizada (SSR, padrão de `finance-baixa.smoke.test.tsx`):
// compensar um EMITIDO diz "Sai R$" e nunca "Entra"; um recebido sem título diz "Entra R$" e "Nenhum título será
// baixado"; um recebido vinculado diz "Baixa o título" com o documento; devolver um emitido compensado diz "Volta R$".
// A confirmação é UMA só para as 3 aparências (o contêiner a abre); o teste vivo das aparências
// (`b-san3-24-cheques-aparencias-live.test.tsx`) a abre a partir da A, da B e da C. Aqui também: as 3 views renderizam
// as mesmas linhas e os estados §7 (vazio, erro, acesso não permitido) a partir do mesmo modelo.

function cheque(over: Partial<Cheque>): Cheque {
  return {
    id: "chq-1",
    accountId: "acc-1",
    titleId: null,
    direction: "received",
    chequeNumber: "004512",
    bank: "Sicredi",
    amount: 7850,
    currency: "BRL",
    dueDate: "2026-11-10",
    status: "deposited",
    clearedEntryId: null,
    bounceEntryId: null,
    bounceReason: null,
    notes: null,
    active: true,
    createdAt: "2026-11-01T12:00:00.000Z",
    ...over,
  };
}

const refs = { accountName: "Banco do Brasil", title: { document: "FAT-2026-0915", amount: 7850, paidAmount: 0 } };

function confirmHtml(target: Cheque, action: "clear" | "bounce"): string {
  const impact = cashImpactFor(target, action, refs);
  return renderToStaticMarkup(
    <ChequeClearConfirm cheque={target} action={action} impact={impact} busy={false} onConfirm={() => undefined} onCancel={() => undefined} />,
  );
}

test("A6c compensar um EMITIDO: 'Sai R$' e nunca 'Entra'", () => {
  const html = confirmHtml(cheque({ direction: "issued" }), "clear");
  assert.match(html, /Sai R\$/);
  assert.doesNotMatch(html, /Entra/);
  assert.match(html, /data-impacto="out"/);
  assert.match(html, /Confirmar compensação/);
});

test("A6c compensar um recebido SEM título: 'Entra R$' e 'Nenhum título será baixado'", () => {
  const html = confirmHtml(cheque({}), "clear");
  assert.match(html, /Entra R\$/);
  assert.match(html, /Nenhum título será baixado/);
  assert.match(html, /data-impacto="in"/);
});

test("A6c compensar um recebido VINCULADO: 'Baixa o título' com o documento", () => {
  const html = confirmHtml(cheque({ titleId: "tit-1" }), "clear");
  assert.match(html, /Entra R\$/);
  assert.match(html, /Baixa o título FAT-2026-0915/);
});

test("A6c devolver um EMITIDO compensado: 'Volta R$' (estorno da compensação)", () => {
  const html = confirmHtml(cheque({ direction: "issued", status: "cleared" }), "bounce");
  assert.match(html, /Volta R\$/);
  assert.match(html, /estorno da compensação/);
  assert.match(html, /Motivo da devolução \(opcional\)/);
});

test("A6c devolver depositado vinculado: nenhum dinheiro se move e o motivo é obrigatório (botão desabilitado sem motivo)", () => {
  const html = confirmHtml(cheque({ titleId: "tit-1" }), "bounce");
  assert.match(html, /Nenhum dinheiro se move/);
  assert.match(html, /Motivo da devolução \(obrigatório\)/);
  assert.match(html, /<button[^>]*disabled=""[^>]*>Confirmar devolução<\/button>/);
});

function model(over: Partial<ChequesViewModel> = {}): ChequesViewModel {
  const items = [cheque({ id: "chq-a" }), cheque({ id: "chq-b", direction: "issued", status: "registered", chequeNumber: "000157" })];
  return {
    summary: { pendingReceivedCount: 1, pendingReceivedAmount: 7850, pendingIssuedCount: 1, pendingIssuedAmount: 7850, linkedPendingCount: 0, linkedPendingAmount: 0 },
    summaryLoading: false,
    list: { items, total: 2, pendingTotals: null, complete: true, loading: false, failed: false, forbidden: false, stale: false, lastUpdatedAt: null },
    filter: EMPTY_FILTER,
    onFilter: () => undefined,
    page: { offset: 0, limit: 20 },
    onPage: () => undefined,
    counts: { registered: 1, deposited: 1, cleared: 0, bounced: 0, cancelled: 0 },
    accounts: [],
    accountCounts: {},
    pending: { items, total: null, pendingTotals: { registered: 1, deposited: 1 }, complete: true, loading: false, failed: false, forbidden: false, stale: false, lastUpdatedAt: null },
    canRegister: true,
    actionsFor: () => [],
    details: {},
    onOpen: () => undefined,
    onAction: () => undefined,
    onRegister: () => undefined,
    onRetry: () => undefined,
    message: null,
    onDismissMessage: () => undefined,
    ...over,
  };
}

const VIEWS = [
  ["A", ChequesViewA],
  ["B", ChequesViewB],
  ["C", ChequesViewC],
] as const;

function render(View: (props: ChequesViewModel) => React.ReactElement, m: ChequesViewModel): string {
  return renderToStaticMarkup(<MemoryRouter>{React.createElement(View, m)}</MemoryRouter>);
}

test("as 3 aparências: a mesma raiz marcada, as mesmas linhas e o mesmo botão de registrar a partir do mesmo modelo", () => {
  for (const [letter, View] of VIEWS) {
    const html = render(View, model());
    assert.match(html, new RegExp(`data-aparencia="${letter}"`), letter);
    assert.match(html, /data-row-key="chq-a"/, letter);
    assert.match(html, /data-row-key="chq-b"/, letter);
    assert.match(html, /Registrar cheque/, letter);
    assert.doesNotMatch(html, /[Tt]enant|TODO|PLANNED/, letter);
  }
});

test("estados §7 nas 3 aparências: vazio, erro e acesso não permitido", () => {
  const empty = { items: [], total: 0, pendingTotals: null, complete: true, loading: false, failed: false, forbidden: false, stale: false, lastUpdatedAt: null };
  for (const [letter, View] of VIEWS) {
    assert.match(render(View, model({ list: empty, pending: { ...empty, total: null } })), /Nenhum cheque registrado ainda\./, letter);
    assert.match(render(View, model({ list: { ...empty, failed: true } })), /Não foi possível carregar os cheques/, letter);
    assert.match(render(View, model({ list: { ...empty, failed: true, forbidden: true } })), /Acesso não permitido/, letter);
    assert.match(render(View, model({ list: { ...model().list, stale: true } })), /Dados desatualizados/, letter);
  }
});
