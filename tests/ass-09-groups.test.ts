import assert from "node:assert/strict";
import test from "node:test";

import {
  MembershipOverlapError,
  groupOfTenantOn,
  isMemberOn,
  type MemberRow,
} from "../src/modules/subscription-billing/economic-groups/membership.rules.js";

// B-ASS-09 · F2 — grupo econômico: vigência e falha fechada (plano v2 §3 P5; §6 C3: R-GRP-1, R-GRP-2 e R-GRP-7).
// Só os casos da F2 (Emenda 2 §1.6): os testes em memória do serviço de grupos (F5b) nascem em
// `tests/ass-09-groups-service.test.ts`. O R-GRP-7 é sem HTTP (o 500 da rota é da F6). Valores sintéticos (plano §15).
//
// MUTAÇÕES LITERAIS QUE ESTE ARQUIVO MATA:
//   M-GRP-1   `day < row.validTo` → `day <= row.validTo`                                          → T-GRP-1
//   M-GRP-10  apagar `if (hits.length > 1) throw new MembershipOverlapError(tenantId);`           → T-GRP-12
// (F2a: as regras; a parte do motor — M-GRP-2, M-GRP-3 e o R-GRP-7 pela visão — entra na F2b.)

const P_LAST_DAY = "2026-10-31";

function row(tenantId: string, groupId: string, validFrom: string, validTo: string | null): MemberRow {
  return { tenantId, groupId, validFrom, validTo };
}

test("T-GRP-1..3 (regra) · membro em P ⇔ vínculo vigente no ÚLTIMO dia de P, com o fim exclusivo", () => {
  // T-GRP-1 · fechado NO último dia de P: o fim é exclusivo, então no último dia ele já não é membro.
  assert.equal(isMemberOn(row("c", "g1", "2026-09-01", P_LAST_DAY), P_LAST_DAY), false);
  assert.equal(isMemberOn(row("c", "g1", "2026-09-01", P_LAST_DAY), "2026-10-30"), true);
  // T-GRP-2 · entrou no dia 20 de P, aberto: é membro no último dia.
  assert.equal(isMemberOn(row("c", "g1", "2026-10-20", null), P_LAST_DAY), true);
  // T-GRP-3 · começa no 1º dia de P+1: não é membro em P.
  assert.equal(isMemberOn(row("c", "g1", "2026-11-01", null), P_LAST_DAY), false);
  // O início é inclusivo.
  assert.equal(isMemberOn(row("c", "g1", P_LAST_DAY, null), P_LAST_DAY), true);
});

test("T-GRP-12 (regra) · dois vínculos da mesma organização no mesmo dia → MembershipOverlapError, sem escolher um", () => {
  const rows = [row("c", "g1", "2026-11-01", null), row("c", "g2", "2026-11-15", null), row("d", "g2", "2026-11-01", null)];
  assert.throws(
    () => groupOfTenantOn(rows, "c", "2026-11-30"),
    (error: unknown) =>
      error instanceof MembershipOverlapError && error.code === "membership_integrity_violation" && error.tenantId === "c",
  );
  // Antes do 2º vínculo começar, um só: o grupo sai.
  assert.equal(groupOfTenantOn(rows, "c", "2026-11-14"), "g1");
  // As outras organizações não são afetadas; sem vínculo no dia, `null`.
  assert.equal(groupOfTenantOn(rows, "d", "2026-11-30"), "g2");
  assert.equal(groupOfTenantOn(rows, "e", "2026-11-30"), null);
});
