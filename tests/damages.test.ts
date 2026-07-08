import assert from "node:assert/strict";
import test from "node:test";

import { toDamageAttachmentDto, toDamageDto } from "../src/modules/damages/damage.dto.js";
import { DamageError, type Damage, type DamageAttachment } from "../src/modules/damages/damage.types.js";
import {
  DAMAGE_STATUS_TRANSITIONS,
  assertDamageStatusTransition,
  parseCusto,
  parseDamageStatus,
  parseGravidade,
} from "../src/modules/damages/damage.validators.js";

test("[R5.1] DAMAGE_STATUS_TRANSITIONS is a strictly linear table", () => {
  assert.deepEqual(DAMAGE_STATUS_TRANSITIONS.registrado, ["em_tratativa"]);
  assert.deepEqual(DAMAGE_STATUS_TRANSITIONS.em_tratativa, ["resolvido"]);
  assert.deepEqual(DAMAGE_STATUS_TRANSITIONS.resolvido, []);
});

test("[R5.1] valid linear transitions never throw (incl. no-op)", () => {
  assert.doesNotThrow(() => assertDamageStatusTransition("registrado", "em_tratativa"));
  assert.doesNotThrow(() => assertDamageStatusTransition("em_tratativa", "resolvido"));
  assert.doesNotThrow(() => assertDamageStatusTransition("registrado", "registrado"));
  assert.doesNotThrow(() => assertDamageStatusTransition("resolvido", "resolvido"));
});

test("[R5.1] invalid transitions throw 422 invalid_status_transition", () => {
  for (const [from, to] of [
    ["registrado", "resolvido"],
    ["em_tratativa", "registrado"],
    ["resolvido", "em_tratativa"],
    ["resolvido", "registrado"],
  ] as const) {
    assert.throws(
      () => assertDamageStatusTransition(from, to),
      (error: unknown) => {
        assert.ok(error instanceof DamageError);
        assert.equal(error.statusCode, 422);
        assert.equal(error.code, "DAMAGE_INVALID");
        assert.equal(error.reason, "invalid_status_transition");
        return true;
      },
    );
  }
});

test("parseGravidade accepts the domain and rejects anything else", () => {
  assert.equal(parseGravidade("leve"), "leve");
  assert.equal(parseGravidade("MODERADA"), "moderada");
  assert.equal(parseGravidade("grave"), "grave");
  assert.throws(() => parseGravidade("catastrofica"), (error: unknown) => {
    assert.ok(error instanceof DamageError);
    assert.equal(error.statusCode, 400);
    assert.equal(error.reason, "invalid_gravidade");
    return true;
  });
  assert.throws(() => parseGravidade(""), (error: unknown) => {
    assert.ok(error instanceof DamageError);
    assert.equal(error.reason, "required_field");
    return true;
  });
});

test("parseDamageStatus rejects unknown status; parseCusto rejects negatives", () => {
  assert.equal(parseDamageStatus("registrado"), "registrado");
  assert.throws(() => parseDamageStatus("arquivado"), /invalid_status|status must be/);
  assert.equal(parseCusto(undefined, "custoEstimado"), undefined);
  assert.equal(parseCusto("120.5", "custoEstimado"), 120.5);
  assert.throws(() => parseCusto(-1, "custoReal"), (error: unknown) => {
    assert.ok(error instanceof DamageError);
    assert.equal(error.statusCode, 400);
    return true;
  });
});

test("toDamageDto never exposes tenant_id and normalizes optionals", () => {
  const damage: Damage = {
    id: "d-1",
    tenantId: "tenant-secret",
    vehicleId: "v-1",
    workOrderId: undefined,
    data: new Date("2026-06-01T00:00:00.000Z"),
    gravidade: "grave",
    descricao: "Para-choque amassado",
    status: "registrado",
    custoEstimado: undefined,
    custoReal: undefined,
    isActive: true,
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
    updatedAt: new Date("2026-06-01T00:00:00.000Z"),
  };

  const dto = toDamageDto(damage) as Record<string, unknown>;

  assert.equal(dto.tenantId, undefined);
  assert.equal(dto.tenant_id, undefined);
  assert.equal(dto.workOrderId, null);
  assert.equal(dto.custoEstimado, null);
  assert.equal(dto.status, "registrado");
});

test("[allowlist 2.8] toDamageAttachmentDto exposes ONLY safe fields + download path", () => {
  const attachment: DamageAttachment = {
    id: "att-1",
    tenantId: "tenant-secret",
    damageId: "d-1",
    fileUrl: "local://checklist-attachments/tenant/d-1/secret.png",
    fileName: "photo.png",
    mimeType: "image/png",
    sizeBytes: 42,
    checksumSha256: "a".repeat(64),
    storageProvider: "local",
    storageKey: "tenant/d-1/secret.png",
    marker: { x: 0.5, y: 0.25, description: "risco" },
    metadata: { note: "ok" },
    createdBy: "usr-1",
    createdAt: new Date("2026-06-01T00:00:00.000Z"),
  };

  const dto = toDamageAttachmentDto(attachment) as Record<string, unknown>;
  const serialized = JSON.stringify(dto);

  // Exposed, safe surface.
  assert.equal(dto.id, "att-1");
  assert.equal(dto.fileName, "photo.png");
  assert.equal(dto.mimeType, "image/png");
  assert.equal(dto.sizeBytes, 42);
  assert.deepEqual(dto.marker, { x: 0.5, y: 0.25, description: "risco" });
  assert.equal(dto.downloadPath, "/api/v1/damages/d-1/attachments/att-1/download");
  assert.ok(typeof dto.createdAt === "string");

  // Never leak storage internals or tenant.
  assert.equal(dto.fileUrl, undefined);
  assert.equal(dto.storageKey, undefined);
  assert.equal(dto.storageProvider, undefined);
  assert.equal(dto.checksumSha256, undefined);
  assert.equal(dto.metadata, undefined);
  assert.equal(dto.tenantId, undefined);
  assert.equal(serialized.includes("storageKey"), false);
  assert.equal(serialized.includes("checklist-attachments"), false);
  assert.equal(serialized.includes("tenant-secret"), false);
  assert.equal(serialized.includes("a".repeat(64)), false);
});
