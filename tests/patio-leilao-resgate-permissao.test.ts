import assert from "node:assert/strict";
import test from "node:test";

function caso(id: string, expectativa: string): void {
  test(`${id} · ${expectativa}`, () => {
    assert.fail(`F1_BASE_VERMELHA:${id}:${expectativa}`);
  });
}

caso("P1", "ator com impound:transition e sem auction:reclaim recebe 403 no reclaim em LOTTED");
caso("P1b", "manager com permissões de catálogo consegue reclaim com motivo e volta para ACTIVE_CUSTODY");
caso("P2", "tenant_admin consegue reclaim com motivo e grava código na cadeia");
caso("P3", "tenant_admin de outra organização recebe 404");
caso("P4", "catálogo concede auction:reclaim para tenant_admin/manager/super_admin/platform_admin e nega aos demais");
caso("P5", "manager mantém acesso ao withdraw-settled antes da lista com processo quitado");
caso("P6", "reclaim sem motivo recusa 409 reason_required e mantém LOTTED");
