import assert from "node:assert/strict";
import test from "node:test";

import type { Damage } from "../src/modules/fleet/damages/damages.types";

function makeDamage(partial: Partial<Damage> & Pick<Damage, "id" | "vehicleId">): Damage {
  return {
    workOrderId: null,
    data: "2026-06-01",
    gravidade: "leve",
    descricao: "Arranhão no para-choque",
    status: "registrado",
    custoEstimado: null,
    custoReal: null,
    isActive: true,
    attachments: [],
    createdAt: "2026-06-01T10:00:00.000Z",
    updatedAt: "2026-06-01T10:00:00.000Z",
    ...partial,
  };
}

test("damages adapter normaliza envelope de lista, snake_case e paginação", async () => {
  const { adaptDamagesResponse } = await import("../src/modules/fleet/damages/damages.adapter");

  const data = adaptDamagesResponse({
    data: {
      items: [
        {
          id: "dam-1",
          vehicle_id: "veh-1",
          work_order_id: "wo-9",
          data: "2026-05-20",
          gravidade: "grave",
          descricao: "Colisão na traseira",
          status: "em_tratativa",
          custo_estimado: 3200.5,
          custo_real: null,
          is_active: true,
          created_at: "2026-05-20T08:30:00.000Z",
        },
        { id: "", vehicle_id: "veh-x", descricao: "sem id" }, // descartada
        { id: "dam-2", vehicle_id: "veh-2" }, // sem descricao → descartada
      ],
      pagination: { limit: 20, offset: 0, total: 1 },
    },
  });

  assert.equal(data.items.length, 1); // linhas sem id/descricao são descartadas
  assert.equal(data.source, "api");
  const damage = data.items[0];
  assert.equal(damage.vehicleId, "veh-1");
  assert.equal(damage.workOrderId, "wo-9");
  assert.equal(damage.gravidade, "grave");
  assert.equal(damage.status, "em_tratativa");
  assert.equal(damage.custoEstimado, 3200.5);
  assert.equal(damage.custoReal, null);
  assert.equal(damage.data, "2026-05-20");
  assert.equal(data.pagination.total, 1);
});

test("damages adapter: rótulos/tons de situação e gravidade PT-BR + transições válidas", async () => {
  const { getDamageStatusLabel, getDamageStatusTone, getGravidadeLabel, getGravidadeTone, getValidDamageTransitions, DAMAGE_STATUS_OPTIONS, DAMAGE_GRAVIDADE_OPTIONS } =
    await import("../src/modules/fleet/damages/damages.adapter");

  assert.equal(getDamageStatusLabel("registrado"), "Registrado");
  assert.equal(getDamageStatusLabel("em_tratativa"), "Em tratativa");
  assert.equal(getDamageStatusLabel("resolvido"), "Resolvido");
  assert.equal(getDamageStatusTone("registrado"), "default");
  assert.equal(getDamageStatusTone("em_tratativa"), "warning");
  assert.equal(getDamageStatusTone("resolvido"), "success");

  assert.equal(getGravidadeLabel("leve"), "Leve");
  assert.equal(getGravidadeLabel("moderada"), "Moderada");
  assert.equal(getGravidadeLabel("grave"), "Grave");
  assert.equal(getGravidadeTone("leve"), "default");
  assert.equal(getGravidadeTone("moderada"), "warning");
  assert.equal(getGravidadeTone("grave"), "danger");

  // Só a próxima situação válida é oferecida.
  assert.deepEqual(getValidDamageTransitions("registrado").map((t) => t.to), ["em_tratativa"]);
  assert.deepEqual(getValidDamageTransitions("em_tratativa").map((t) => t.to), ["resolvido"]);
  assert.deepEqual(getValidDamageTransitions("resolvido").map((t) => t.to), []);

  assert.equal(DAMAGE_STATUS_OPTIONS.length, 3);
  assert.equal(DAMAGE_GRAVIDADE_OPTIONS.length, 3);
});

test("damages adapter: anexo é SAFE (sem storage_key/file_url) + downloadPath do dano/:id", async () => {
  const { adaptDamageAttachment, adaptDamageResponse, isImageMimeType } = await import("../src/modules/fleet/damages/damages.adapter");

  // DTO cru inclui internos de storage — o adapter NÃO os copia.
  const attachment = adaptDamageAttachment(
    {
      id: "att-1",
      fileName: "para-choque.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 204800,
      marker: { x: 12, y: 34, description: "canto direito" },
      createdAt: "2026-06-01T11:00:00.000Z",
      downloadPath: "/api/v1/damages/dam-1/attachments/att-1/download",
      // campos proibidos que NÃO podem vazar:
      storage_key: "tenants/abc/dam-1/att-1.jpg",
      file_url: "https://bucket.s3/tenants/abc/att-1.jpg",
      bucket: "erp-evidence",
      base64: "data:image/jpeg;base64,AAAA",
    },
    "dam-1",
  );

  assert.ok(attachment);
  assert.equal(attachment?.id, "att-1");
  assert.equal(attachment?.fileName, "para-choque.jpg");
  assert.equal(attachment?.mimeType, "image/jpeg");
  assert.equal(attachment?.sizeBytes, 204800);
  assert.equal(attachment?.downloadPath, "/api/v1/damages/dam-1/attachments/att-1/download");
  assert.deepEqual(attachment?.marker, { x: 12, y: 34, description: "canto direito" });
  assert.equal(isImageMimeType(attachment?.mimeType), true);

  // Allowlist §2.8: nenhum interno de storage no objeto adaptado.
  const serialized = JSON.stringify(attachment);
  for (const forbidden of ["storage_key", "file_url", "bucket", "base64", "storageKey", "fileUrl"]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden), `anexo não pode vazar ${forbidden}`);
  }

  // GET /:id inclui os anexos aninhados; downloadPath é sintetizado quando ausente.
  const damage = adaptDamageResponse({
    data: {
      id: "dam-2",
      vehicle_id: "veh-2",
      descricao: "Amassado na lateral",
      attachments: [{ id: "att-9", mime_type: "image/png" }],
    },
  });
  assert.equal(damage?.attachments.length, 1);
  assert.equal(damage?.attachments[0].downloadPath, "/api/v1/damages/dam-2/attachments/att-9/download");
});

test("damages adapter: custo BRL / data pt-BR e '—' para nulos + parse pt-BR + tamanho de arquivo", async () => {
  const { formatValor, formatDamageDate, parsePtBrNumber, formatFileSize } = await import("../src/modules/fleet/damages/damages.adapter");

  assert.match(formatValor(1200), /R\$/);
  assert.equal(formatValor(null), "—");
  assert.equal(formatValor(undefined), "—");

  assert.match(formatDamageDate("2026-06-01"), /01\/06\/2026/);
  assert.equal(formatDamageDate(null), "—");
  assert.equal(formatDamageDate("not-a-date"), "—");

  assert.equal(parsePtBrNumber("1.200,00"), 1200);
  assert.equal(parsePtBrNumber("3.200,50"), 3200.5);
  assert.equal(parsePtBrNumber(""), undefined);

  assert.equal(formatFileSize(512), "512 B");
  assert.match(formatFileSize(204800), /KB/);
  assert.equal(formatFileSize(null), "");
});

test("damages adapter: lista vazia e fonte fallback preservadas (D-007)", async () => {
  const { adaptDamagesResponse } = await import("../src/modules/fleet/damages/damages.adapter");

  const data = adaptDamagesResponse({ data: { items: [], pagination: { limit: 20, offset: 0, total: 0 } } }, "fallback", "sem dados");
  assert.equal(data.items.length, 0);
  assert.equal(data.pagination.total, 0);
  assert.equal(data.source, "fallback");
  assert.equal(data.fallbackReason, "sem dados");

  // Resposta sem itens/paginação degrada para lista vazia sem lançar.
  const bare = adaptDamagesResponse(null);
  assert.equal(bare.items.length, 0);
  assert.equal(bare.pagination.total, 0);
});

test("damages adapter: filtro por situação, gravidade, viatura, OS, situação lógica e busca", async () => {
  const { filterDamages } = await import("../src/modules/fleet/damages/damages.adapter");

  const items = [
    makeDamage({ id: "1", vehicleId: "A", status: "registrado", gravidade: "leve", descricao: "Risco na porta", workOrderId: "wo-1" }),
    makeDamage({ id: "2", vehicleId: "B", status: "em_tratativa", gravidade: "grave", descricao: "Colisão frontal" }),
    makeDamage({ id: "3", vehicleId: "A", status: "resolvido", gravidade: "moderada", descricao: "Retrovisor quebrado", isActive: false }),
  ];

  assert.deepEqual(filterDamages(items, { search: "", isActive: "all", status: "registrado" }).map((d) => d.id), ["1"]);
  assert.deepEqual(filterDamages(items, { search: "", isActive: "all", gravidade: "grave" }).map((d) => d.id), ["2"]);
  assert.deepEqual(filterDamages(items, { search: "", isActive: "all", vehicleId: "A" }).map((d) => d.id), ["1", "3"]);
  assert.deepEqual(filterDamages(items, { search: "", isActive: "all", workOrderId: "wo-1" }).map((d) => d.id), ["1"]);
  assert.deepEqual(filterDamages(items, { search: "", isActive: "inactive" }).map((d) => d.id), ["3"]);
  assert.deepEqual(filterDamages(items, { search: "colisão", isActive: "all" }).map((d) => d.id), ["2"]);
  // Busca pelo nome resolvido da viatura.
  const resolveVehicleName = (id: string) => (id === "A" ? "ABC-1234 Sprinter" : undefined);
  assert.deepEqual(filterDamages(items, { search: "sprinter", isActive: "all", resolveVehicleName }).map((d) => d.id), ["1", "3"]);
});

test("damages adapter: totais agregados da janela (total, registrados, em tratativa, resolvidos)", async () => {
  const { computeDamageTotals } = await import("../src/modules/fleet/damages/damages.adapter");

  const items = [
    makeDamage({ id: "1", vehicleId: "A", status: "registrado" }),
    makeDamage({ id: "2", vehicleId: "B", status: "registrado" }),
    makeDamage({ id: "3", vehicleId: "C", status: "em_tratativa" }),
    makeDamage({ id: "4", vehicleId: "D", status: "resolvido" }),
  ];

  const totals = computeDamageTotals(items);
  assert.equal(totals.count, 4);
  assert.equal(totals.registradoCount, 2);
  assert.equal(totals.emTratativaCount, 1);
  assert.equal(totals.resolvidoCount, 1);
});

test("damages adapter: interpreta motivos de domínio (422/400) + erro de upload (415)", async () => {
  const { interpretDamageSubmitError, interpretDamageUploadError } = await import("../src/modules/fleet/damages/damages.adapter");

  // 422 invalid_status_transition → só Alerta (sem campo).
  const badTransition = interpretDamageSubmitError({ status: 422, error: { reason: "invalid_status_transition" } }, "transition");
  assert.equal(badTransition.reason, "invalid_status_transition");
  assert.equal(badTransition.field, undefined);

  // 400 invalid_vehicle_reference → sob a Viatura.
  const invalidVehicle = interpretDamageSubmitError({ status: 400, reason: "invalid_vehicle_reference" }, "form");
  assert.equal(invalidVehicle.field, "vehicleId");

  // 400 invalid_work_order_reference → sob a OS de origem.
  const invalidWorkOrder = interpretDamageSubmitError({ status: 400, error: { reason: "invalid_work_order_reference" } }, "form");
  assert.equal(invalidWorkOrder.field, "workOrderId");

  // Sem motivo explícito, infere pelo status.
  assert.equal(interpretDamageSubmitError({ status: 422 }, "transition").reason, "invalid_status_transition");

  // Erro genérico preserva a mensagem.
  assert.equal(interpretDamageSubmitError(new Error("Falha genérica")).message, "Falha genérica");

  // Upload: 415/400 unsupported_media_type → formato não suportado.
  assert.match(interpretDamageUploadError({ status: 415, error: { reason: "unsupported_media_type" } }), /Formato de imagem não suportado/);
  assert.match(interpretDamageUploadError({ status: 400, reason: "unsupported_media_type" }), /Formato de imagem não suportado/);
});

test("damages adapter: validação de campos obrigatórios e custos ≥ 0", async () => {
  const { validateDamage } = await import("../src/modules/fleet/damages/damages.adapter");

  const errors = validateDamage({ vehicleId: "", gravidade: "", data: "", descricao: "" });
  const fields = errors.map((e) => e.field);
  assert.ok(fields.includes("vehicleId"));
  assert.ok(fields.includes("gravidade"));
  assert.ok(fields.includes("data"));
  assert.ok(fields.includes("descricao"));

  // Custo negativo é rejeitado.
  const negative = validateDamage({ vehicleId: "veh-1", gravidade: "leve", data: "2026-06-01", descricao: "ok", custoEstimado: -5 });
  assert.ok(negative.some((e) => e.field === "custoEstimado"));

  // Rascunho completo e válido (custos opcionais) não gera erros.
  assert.equal(
    validateDamage({ vehicleId: "veh-1", gravidade: "moderada", data: "2026-06-01", descricao: "Amassado", custoEstimado: 1200, custoReal: 900 }).length,
    0,
  );
});
