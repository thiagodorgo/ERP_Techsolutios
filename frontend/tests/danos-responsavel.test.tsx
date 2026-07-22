import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import type { OperatorProfileItem } from "../src/modules/registry/operator-profiles/operator-profiles.types";
import type { Damage } from "../src/modules/fleet/damages/damages.types";
import type { Vehicle } from "../src/modules/registry/vehicles/vehicles.types";
import type { WorkOrderListItem } from "../src/modules/work-orders/work-orders.types";

// Ω4C PR-09 — Danos + Profissional responsável / desconto no extrato / trava (alerta amarelo) / impressão com
// e sem termo de ciência. Recria o COMPORTAMENTO do AutEM (4 seções, desconto parcial → extrato, trava de
// exclusão RN-EXT-01) no visual do ERP. §2.8: o nome do responsável vem da lista de Profissionais (NUNCA a
// CNH). A "Análise interna do dano" NUNCA é impressa. Reusa o rail do extrato do PR-07 (desconto = débito).

const CNH_SECRET = "98765432100";
const ANALISE_SECRET = "SEGREDO_INTERNO_NAO_IMPRIMIR_XYZ";

const VEHICLES: Vehicle[] = [{ id: "veh-1", plate: "ABC1D23", model: "Guincho Pesado", isActive: true } as Vehicle];
const WORK_ORDERS: WorkOrderListItem[] = [];
const PROFILES: OperatorProfileItem[] = [
  {
    id: "op-1",
    userId: "usr-1",
    fullName: "Marcos Guincheiro",
    cnhNumber: CNH_SECRET,
    hasCnh: true,
    cnhCategory: "D",
    cnhExpiresAt: null,
    trackingConsent: true,
    trackingConsentAt: null,
    phone: null,
    notes: null,
    isActive: true,
    createdAt: "2026-06-01T10:00:00.000Z",
  },
];

function makeDamage(partial: Partial<Damage> & Pick<Damage, "id">): Damage {
  return {
    vehicleId: "veh-1",
    workOrderId: null,
    responsibleOperatorProfileId: null,
    disposition: "none",
    data: "2026-06-01",
    gravidade: "moderada",
    descricao: "Amassado no para-choque traseiro",
    status: "registrado",
    tipo: "internal",
    origem: "Acidente",
    objeto: "Para-choque",
    identificacaoObjeto: "PC-9",
    analiseInterna: null,
    custoEstimado: null,
    custoReal: 500,
    statementDebit: null,
    isActive: true,
    attachments: [],
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

async function renderDamageModal(damage: Damage | null): Promise<string> {
  process.env.VITE_USE_MOCKS = "true";
  const { DamageFormModal } = await import("../src/modules/fleet/damages/components/DamageFormModal");
  return renderToString(
    <DamageFormModal
      damage={damage}
      vehicles={VEHICLES}
      workOrders={WORK_ORDERS}
      operatorProfiles={PROFILES}
      context={{ tenantId: "ten-industrial-01" }}
      onClose={() => {}}
      onSaved={() => {}}
    />,
  );
}

// ── 1. Create: 4 seções tituladas + select de responsável + rótulos PT-BR + §2.8 ─
test("registrar dano: 4 seções (Identificação/Responsável/Custos/Análise) + select de Profissional, sem CNH", async () => {
  const html = await renderDamageModal(null);

  // As 4 seções do AutEM, recriadas com títulos claros (não um formulário achatado).
  assert.match(html, /Identificação do dano/);
  assert.match(html, /Responsável/);
  assert.match(html, /Custos e desconto/);
  assert.match(html, /Análise interna/);

  // §3 PT-BR — rótulos de negócio.
  assert.match(html, /Valor Total do dano/);
  assert.match(html, /Gravidade/);
  assert.match(html, /Tipo de dano/);

  // Select de responsável reusa a lista de Profissionais (nome como label).
  assert.match(html, /Marcos Guincheiro/);
  assert.match(html, /Sem responsável \(empresa absorve\)/);

  // §2.8: a CNH do profissional NUNCA aparece no HTML (o nome vem da lista, a CNH jamais).
  assert.doesNotMatch(html, new RegExp(CNH_SECRET));
});

// ── 2. Edit com débito ativo: alerta amarelo + badge lançado + trava + Imprimir ─
test("editar dano com desconto ativo: alerta amarelo (trava) + badge 'Lançado no extrato' + Imprimir dano", async () => {
  const damage = makeDamage({
    id: "dam-1",
    responsibleOperatorProfileId: "op-1",
    disposition: "statement",
    statementDebit: { totalAmount: 250, installmentTotal: 3, firstDueDate: "2026-07-01T00:00:00.000Z", hasSettled: false },
  });
  const html = await renderDamageModal(damage);

  // Alerta amarelo honesto (espelha o alerta AutEM): valor já no extrato, exclusão/alterações travadas.
  assert.match(html, /já se encontra no extrato/i);
  assert.match(html, /ui-alert--warning/);
  // Campo financeiro travado -> texto de ajuda "Travado…".
  assert.match(html, /Travado enquanto há desconto no extrato/);

  // Badge derivado do débito ativo.
  assert.match(html, /Lançado no extrato/);
  assert.match(html, /ui-tone-success/);

  // Impressão client-side disponível na edição.
  assert.match(html, /Imprimir dano/);

  // §2.8: nunca CNH.
  assert.doesNotMatch(html, new RegExp(CNH_SECRET));
});

// ── 3. Edit com parcela liquidada: alerta reforça reversão só por ajuste ─────────
test("editar dano com parcela liquidada: alerta indica reversão só por ajuste", async () => {
  const damage = makeDamage({
    id: "dam-2",
    responsibleOperatorProfileId: "op-1",
    disposition: "statement",
    statementDebit: { totalAmount: 250, installmentTotal: 3, firstDueDate: "2026-07-01T00:00:00.000Z", hasSettled: true },
  });
  const html = await renderDamageModal(damage);

  assert.match(html, /já se encontra no extrato/i);
  assert.match(html, /parcela já liquidada|reversão só é possível por ajuste/i);
});

// ── 4. Validação: desconto parcial permitido; guards de dinheiro honestos ────────
test("validação do desconto: parcial (amount<total) OK; excede total / ≤0 / sem Valor Total → erro", async () => {
  const { validateDamage } = await import("../src/modules/fleet/damages/damages.adapter");
  const base = { vehicleId: "veh-1", gravidade: "moderada" as const, data: "2026-06-01", descricao: "Amassado" };

  // Desconto PARCIAL (250 de 500) — permitido (ANALISE:124).
  const partial = validateDamage({ ...base, responsibleOperatorProfileId: "op-1", responsibleAmount: 250, custoReal: 500 });
  assert.equal(partial.length, 0);

  // Excede o Valor Total → erro sob "Profissional (R$)".
  const exceeds = validateDamage({ ...base, responsibleOperatorProfileId: "op-1", responsibleAmount: 600, custoReal: 500 });
  assert.ok(exceeds.some((e) => e.field === "responsibleAmount"));

  // Valor ≤ 0 → erro.
  const zero = validateDamage({ ...base, responsibleOperatorProfileId: "op-1", responsibleAmount: 0, custoReal: 500 });
  assert.ok(zero.some((e) => e.field === "responsibleAmount"));

  // Cobrar sem Valor Total → erro sob "Valor Total".
  const noTotal = validateDamage({ ...base, responsibleOperatorProfileId: "op-1", responsibleAmount: 250 });
  assert.ok(noTotal.some((e) => e.field === "custoReal"));

  // Parcelas inválidas com responsável → erro; sem responsável → ignorado.
  const badInst = validateDamage({ ...base, responsibleOperatorProfileId: "op-1", responsibleInstallmentTotal: 0 });
  assert.ok(badInst.some((e) => e.field === "responsibleInstallmentTotal"));
  const ignoredInst = validateDamage({ ...base, responsibleInstallmentTotal: 999 });
  assert.equal(ignoredInst.length, 0);
});

// ── 5. Erros de domínio: 409 travas honestas + 400 responsável + 422 money guards ─
test("interpreta 409 damage_statement_locked / statement_entry_locked + 400 responsável + 422 money", async () => {
  const { interpretDamageSubmitError } = await import("../src/modules/fleet/damages/damages.adapter");

  // 409 com motivo explícito → mensagem do AutEM (trava do dano).
  const lockedExplicit = interpretDamageSubmitError({ status: 409, error: { reason: "damage_statement_locked" } }, "form");
  assert.equal(lockedExplicit.reason, "damage_statement_locked");
  assert.match(lockedExplicit.message, /já se encontra no extrato/i);

  // Desativar com débito ativo (sem corpo) → trava do dano.
  assert.equal(interpretDamageSubmitError({ status: 409 }, "toggle-active").reason, "damage_statement_locked");

  // Mudar/limpar responsável com parcela liquidada (409 sem corpo) → trava do extrato.
  assert.equal(interpretDamageSubmitError({ status: 409 }, "form", "clear").reason, "statement_entry_locked");
  assert.equal(interpretDamageSubmitError({ status: 409 }, "form", "set").reason, "statement_entry_locked");
  assert.match(interpretDamageSubmitError({ status: 409 }, "form", "clear").message, /liquidada|ajuste/i);

  // 409 sem intenção de disposição → trava do dano (Valor Total travado).
  assert.equal(interpretDamageSubmitError({ status: 409 }, "form").reason, "damage_statement_locked");

  // 400 Profissional inválido → sob o campo do responsável.
  const invalidRef = interpretDamageSubmitError({ status: 400, reason: "invalid_operator_profile_reference" });
  assert.equal(invalidRef.field, "responsibleOperatorProfileId");

  // 422 money guards → sob os campos corretos.
  assert.equal(interpretDamageSubmitError({ status: 422, error: { reason: "responsible_amount_exceeds_total" } }).field, "responsibleAmount");
  assert.equal(interpretDamageSubmitError({ status: 422, error: { reason: "damage_total_required" } }).field, "custoReal");
});

// ── 6. Adapter: DTO traz responsável/disposição/tipo (lista) e statementDebit (detalhe) ─
test("adaptDamage normaliza responsibleOperatorProfileId, disposition, tipo (snake/camel) e statementDebit derivado", async () => {
  const { adaptDamagesResponse, adaptDamageResponse } = await import("../src/modules/fleet/damages/damages.adapter");

  const list = adaptDamagesResponse({
    data: {
      items: [
        { id: "dam-1", vehicle_id: "veh-1", descricao: "Colisão", responsible_operator_profile_id: "op-1", disposition: "statement", tipo: "external" },
        { id: "dam-2", vehicle_id: "veh-2", descricao: "Risco", responsible_operator_profile_id: null, disposition: "none", tipo: null },
      ],
      pagination: { limit: 20, offset: 0, total: 2 },
    },
  });
  assert.equal(list.items[0].responsibleOperatorProfileId, "op-1");
  assert.equal(list.items[0].disposition, "statement");
  assert.equal(list.items[0].tipo, "external");
  // §2.8: a lista NÃO carrega o débito individual (statementDebit só no detalhe).
  assert.equal(list.items[0].statementDebit, null);
  assert.equal(list.items[1].responsibleOperatorProfileId, null);
  assert.equal(list.items[1].disposition, "none");

  const detail = adaptDamageResponse({
    data: {
      id: "dam-1",
      vehicle_id: "veh-1",
      descricao: "Colisão",
      disposition: "statement",
      statementDebit: { totalAmount: 250, installmentTotal: 3, firstDueDate: "2026-07-01T00:00:00.000Z", hasSettled: false },
    },
  });
  assert.equal(detail?.statementDebit?.totalAmount, 250);
  assert.equal(detail?.statementDebit?.installmentTotal, 3);
  assert.equal(detail?.statementDebit?.hasSettled, false);
});

// ── 7. Adapter: rótulos/tons de disposição e tipo em PT-BR ───────────────────────
test("adapter: disposição 'Lançado no extrato' (verde) / '—'; tipo Interno/Externo/Ambos", async () => {
  const { getDamageDispositionLabel, getDamageDispositionTone, getDamageTipoLabel } = await import(
    "../src/modules/fleet/damages/damages.adapter"
  );

  assert.equal(getDamageDispositionLabel("statement"), "Lançado no extrato");
  assert.equal(getDamageDispositionLabel("none"), "—");
  assert.equal(getDamageDispositionTone("statement"), "success");
  assert.equal(getDamageDispositionTone("none"), "default");

  assert.equal(getDamageTipoLabel("internal"), "Interno");
  assert.equal(getDamageTipoLabel("external"), "Externo");
  assert.equal(getDamageTipoLabel("both"), "Ambos");
  assert.equal(getDamageTipoLabel(null), "—");
});

// ── 8. Impressão: com/sem termo de ciência; Análise interna NUNCA impressa ───────
test("PrintDamageModal: variante SEM termo de ciência não imprime o parágrafo nem a análise interna", async () => {
  const { PrintDamageModal } = await import("../src/modules/fleet/damages/components/PrintDamageModal");
  const damage = makeDamage({ id: "dam-1", analiseInterna: ANALISE_SECRET });

  const html = renderToString(
    <PrintDamageModal damage={damage} vehicleLabel="ABC1D23 — Guincho Pesado" responsibleName="Marcos Guincheiro" onClose={() => {}} />,
  );

  // Corpo imprimível com os dados carregados.
  assert.match(html, /Valor Total do dano/);
  assert.match(html, /Imprimir dano/);
  assert.match(html, /Incluir termo de ciência/);
  // SEM o parágrafo-padrão (toggle desligado por padrão).
  assert.doesNotMatch(html, /Declaro estar ciente/);
  // Análise interna NUNCA é impressa (ANALISE:126).
  assert.doesNotMatch(html, new RegExp(ANALISE_SECRET));
  // §2.8: sem CNH.
  assert.doesNotMatch(html, new RegExp(CNH_SECRET));
});

test("PrintDamageModal: variante COM termo de ciência imprime o parágrafo, mas nunca a análise interna", async () => {
  const { PrintDamageModal } = await import("../src/modules/fleet/damages/components/PrintDamageModal");
  const damage = makeDamage({ id: "dam-1", analiseInterna: ANALISE_SECRET });

  const html = renderToString(
    <PrintDamageModal
      damage={damage}
      vehicleLabel="ABC1D23 — Guincho Pesado"
      responsibleName="Marcos Guincheiro"
      initialIncludeStatement
      onClose={() => {}}
    />,
  );

  // COM o termo de ciência (parágrafo-padrão de reconhecimento).
  assert.match(html, /Termo de ciência/);
  assert.match(html, /Declaro estar ciente/);
  assert.match(html, /Assinatura do profissional/);
  // Ainda assim, a análise interna NUNCA sai na impressão.
  assert.doesNotMatch(html, new RegExp(ANALISE_SECRET));
});
