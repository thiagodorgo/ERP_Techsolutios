import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test, { afterEach } from "node:test";

import type { EvidenceScanResult, EvidenceScanner } from "../src/modules/evidence/evidence-storage.js";
import {
  resetEvidenceScannerForTests,
  setEvidenceScannerForTests,
} from "../src/modules/evidence/evidence-scanner.factory.js";
import {
  assertUploadVerification,
  UploadGateError,
  uploadGateStatus,
  type UploadGateVia,
  verifyUploadContent,
} from "../src/modules/evidence/upload-gate.js";
import { PNG_BYTES } from "./helpers/upload-fixtures.js";

const VIAS: readonly UploadGateVia[] = ["V1", "V2", "V3", "V4", "V5"];

afterEach(() => resetEvidenceScannerForTests());

class CountingScanner implements EvidenceScanner {
  calls = 0;

  constructor(private readonly result: EvidenceScanResult) {}

  async scan(): Promise<EvidenceScanResult> {
    this.calls += 1;
    return this.result;
  }
}

async function exercise(via: UploadGateVia, result: EvidenceScanResult) {
  const scanner = new CountingScanner(result);
  setEvidenceScannerForTests(scanner);
  let stores = 0;
  try {
    const mark = await verifyUploadContent({
      via,
      buffer: PNG_BYTES,
      declaredMimeType: "image/png",
      allowedMimeTypes: ["image/png"],
      scan: {
        tenantId: `tenant-${via}`,
        evidenceId: `evidence-${via}`,
        clientEvidenceId: `client-${via}`,
      },
    });
    assertUploadVerification(mark, PNG_BYTES);
    stores += 1;
    return { status: 201 as const, stores, scannerCalls: scanner.calls };
  } catch (error) {
    assert(error instanceof UploadGateError);
    return {
      status: uploadGateStatus(error.kind),
      reason: error.kind,
      stores,
      scannerCalls: scanner.calls,
    };
  }
}

for (const via of VIAS) {
  test(`[${via}] clean libera exatamente uma gravação`, async () => {
    assert.deepEqual(await exercise(via, { status: "clean" }), {
      status: 201,
      stores: 1,
      scannerCalls: 1,
    });
    if (via === "V5") {
      const damageService = await readFile("src/modules/damages/damage.service.ts", "utf8");
      assert.match(damageService, /upload:\s*upload\.file,\s*verification,/);
    }
  });

  test(`[${via}] infected vira 422 e nunca grava`, async () => {
    assert.deepEqual(await exercise(via, { status: "infected", reason: "eicar" }), {
      status: 422,
      reason: "scanner_infected",
      stores: 0,
      scannerCalls: 1,
    });
  });

  test(`[${via}] failed vira 503 e nunca grava`, async () => {
    assert.deepEqual(await exercise(via, { status: "failed", reason: "timeout" }), {
      status: 503,
      reason: "scanner_unavailable",
      stores: 0,
      scannerCalls: 1,
    });
  });
}

test("scan_limit_exceeded permanece terminal em 422 e nunca grava", async () => {
  assert.deepEqual(await exercise("V1", { status: "infected", reason: "scan_limit_exceeded" }), {
    status: 422,
    reason: "scanner_infected",
    stores: 0,
    scannerCalls: 1,
  });
});
