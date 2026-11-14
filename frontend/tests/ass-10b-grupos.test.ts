import assert from "node:assert/strict";
import test from "node:test";

import { buildMembersPut, initiallyCheckedMembers, isScheduledMember, membersChanged, membersPostconditionHolds, toggleMember } from "../src/modules/platform/cloud-billing/cloud-billing.groups";
import type { GroupMember } from "../src/modules/platform/cloud-billing/cloud-billing.types";

// B-ASS-10b (T5) · R-GRP (plano v2 §6.4.2; Emenda 1, A1-r2) — o conjunto do `PUT /economic-groups/:id/members`. O servidor
// troca o conjunto INTEIRO: um conjunto montado errado tira organização do grupo e muda a margem por grupo.

const member = (tenantId: string, validFrom: string, validTo: string | null, scheduled = false): GroupMember => ({ tenantId, tenantName: tenantId.toUpperCase(), validFrom, validTo, scheduled });
const G: GroupMember[] = [member("a", "2026-11-14", null), member("b", "2026-11-14", null), member("d", "2026-12-05", null, true), member("i", "2026-11-14", "2026-12-01")];

test("T-GRP-1 o corpo do PUT nunca perde membro vigente ou agendado que o usuário não desmarcou", () => {
  const plan = buildMembersPut(G, { add: ["k"], remove: [] }, "2026-12-01", "2026-11-20");
  assert.deepEqual(plan, { ok: true, body: { tenantIds: ["a", "b", "d", "k"], validFrom: "2026-12-01" }, added: ["k"], removed: [] });
  // propriedade, em todas as combinações de marcar e desmarcar
  const open = ["a", "b", "d"];
  for (let mask = 0; mask < 8; mask++) {
    const remove = open.filter((_, index) => mask & (1 << index));
    for (const add of [[], ["k"], ["k", "a"]]) {
      const result = buildMembersPut(G, { add, remove }, "2026-12-01", "2026-11-20");
      if (!result.ok) {
        assert.equal(remove.length === 0 && add.every((id) => open.includes(id)), true);
        continue;
      }
      for (const id of open) assert.equal(result.body.tenantIds.includes(id), !remove.includes(id), `${id} com remove=${remove}`);
      assert.equal(result.body.tenantIds.includes("i"), false, "quem tem saída marcada não vai no conjunto");
    }
  }
});

test("T-GRP-2 saída marcada depois da data escolhida: a janela não escreve e pede a data mínima", () => {
  assert.deepEqual(buildMembersPut(G, { add: ["k"], remove: [] }, "2026-11-20", "2026-11-20"), { ok: false, reason: "saida_marcada", tenantId: "i", minDate: "2026-12-01" });
  assert.deepEqual(buildMembersPut(G, { add: ["k"], remove: [] }, "2026-11-19", "2026-11-20"), { ok: false, reason: "data_passada" });
  assert.deepEqual(buildMembersPut(G, { add: [], remove: [] }, "2026-12-01", "2026-11-20"), { ok: false, reason: "sem_mudanca" });
});

test("T-GRP-1 (A1-r2) a caixa abre com todo membro sem fim marcado e o change vem das ações, nunca do estado final", () => {
  assert.deepEqual(initiallyCheckedMembers(G).sort(), ["a", "b", "d"]);
  assert.equal(isScheduledMember(G, "d"), true);
  assert.equal(isScheduledMember(G, "a"), false);
  let change = toggleMember({ add: [], remove: [] }, "k", true, false);
  change = toggleMember(change, "a", false, true);
  change = toggleMember(change, "a", true, true); // remarcou: a ação se anula
  assert.deepEqual(change, { add: ["k"], remove: [] });
});

test("T-GRP-4 (função) edição simultânea e pós-condição", () => {
  assert.equal(membersChanged(G, [...G].reverse()), false);
  assert.equal(membersChanged(G, G.slice(1)), true);
  assert.equal(membersChanged(G, [...G.slice(0, 3), member("i", "2026-11-14", "2026-12-02")]), true);
  assert.equal(membersPostconditionHolds(["a", "k"], [member("a", "2026-11-14", null), member("k", "2026-12-01", null, true)]), true);
  assert.equal(membersPostconditionHolds(["a", "k"], [member("a", "2026-11-14", null)]), false);
  assert.equal(membersPostconditionHolds(["a"], [member("a", "2026-11-14", "2026-12-01")]), false);
});
