// B-EVIDENCIA-INDICE — F2a: o metadado da evidência pelo repositório EM MEMÓRIA, pela rota real.
// S1 a S11 do plano (corpo §8.1 + Emenda 1 §E1.3/§E1.4/§E1.5). Vermelhos antes, verdes depois.
// Os casos falam com a ROTA real (/api/v1/mobile/sync/evidence-actions) e afirmam comportamento.
// Repositório PÚBLICO: organizações de teste, e-mails @example.com, sem nome de pessoa nem caminho local.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";

import { CoreSaasRegistry } from "../src/modules/core-saas/services/core-saas.service.js";
import { MemoryCoreSaasAdapter } from "../src/modules/core-saas/services/memory-core-saas.adapter.js";
import { InMemoryCoreSaasStore } from "../src/modules/core-saas/store/core-saas.store.js";
import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import * as evidenceSyncModule from "../src/modules/mobile/mobile-evidence-sync.js";

// Os acessores do repositório são API NOVA desta fatia. Acesso por colchete sobre o namespace para o
// arquivo carregar na base (onde ainda não existem) e o vermelho vir do comportamento, não do link ESM.
const syncModule = evidenceSyncModule as unknown as {
  resetMobileEvidenceSyncRuntimeForTests: () => void;
  getMobileEvidenceRepositoryForTests?: () => EvidenceRepositoryLike;
  setMobileEvidenceRepositoryForTests?: (repository: EvidenceRepositoryLike | undefined) => void;
};

type RawRecord = Record<string, unknown>;

type EvidenceRecordLike = {
  id: string;
  tenantId: string;
  actorUserId: string;
  clientEvidenceId: string;
  actionType: string;
  scope: string;
  kind: string;
  workOrderId: string | null;
  metadata: RawRecord;
  fingerprintSha256: string;
  fileStatus: string;
};

type EvidenceRepositoryLike = {
  findByClientEvidenceId: (tenantId: string, userId: string, clientEvidenceId: string) => Promise<EvidenceRecordLike | undefined>;
  createAccepted: (input: unknown) => Promise<unknown>;
  markFileStored: (...args: unknown[]) => Promise<unknown>;
  listByWorkOrder: (tenantId: string, workOrderId: string) => Promise<readonly EvidenceRecordLike[]>;
  findByIdForWorkOrder: (tenantId: string, workOrderId: string, id: string) => Promise<EvidenceRecordLike | undefined>;
};

type Seed = {
  tenantA: Tenant;
  tenantB: Tenant;
  adminA: User;
  adminB: User;
  techA1: User;
  techA2: User;
  techB1: User;
};

type Api = { baseUrl: string; seed: Seed };

const SYNC_ROUTE = "/api/v1/mobile/sync/evidence-actions";

function repository(): EvidenceRepositoryLike {
  const get = syncModule.getMobileEvidenceRepositoryForTests;
  assert.equal(typeof get, "function", "getMobileEvidenceRepositoryForTests deve existir (camada nova da F2a)");
  return (get as () => EvidenceRepositoryLike)();
}

function setRepository(repo: EvidenceRepositoryLike | undefined): void {
  const set = syncModule.setMobileEvidenceRepositoryForTests;
  assert.equal(typeof set, "function", "setMobileEvidenceRepositoryForTests deve existir (costura de teste da F2a)");
  (set as (r: EvidenceRepositoryLike | undefined) => void)(repo);
}

function authHeaders(tenant: Tenant, user: User, role: string): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": user.id, "x-role": role };
}

async function requestJson(baseUrl: string, path: string, options: { method?: string; headers?: Record<string, string>; body?: RawRecord } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers: { "content-type": "application/json", ...options.headers },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  return { status: response.status, body: await response.json() };
}

function seedCoreSaas(service: CoreSaasRegistry): Seed {
  const modules = ["dashboard", "mobile", "work_orders", "tenant_checklist", "expense_management", "inventory", "notifications", "field_operations"];
  const tenantA = service.createTenant({ name: "Organização Teste A", modules });
  const tenantB = service.createTenant({ name: "Organização Teste B", modules });
  const adminA = service.createUser({ tenantId: tenantA.id, name: "Gestor A", email: "indice-admin-a@example.com", roles: ["tenant_admin"] });
  const adminB = service.createUser({ tenantId: tenantB.id, name: "Gestor B", email: "indice-admin-b@example.com", roles: ["tenant_admin"] });
  const techA1 = service.createUser({ tenantId: tenantA.id, name: "Técnico A1", email: "indice-tech-a1@example.com", roles: ["field_technician"] });
  const techA2 = service.createUser({ tenantId: tenantA.id, name: "Técnico A2", email: "indice-tech-a2@example.com", roles: ["field_technician"] });
  const techB1 = service.createUser({ tenantId: tenantB.id, name: "Técnico B1", email: "indice-tech-b1@example.com", roles: ["field_technician"] });
  return { tenantA, tenantB, adminA, adminB, techA1, techA2, techB1 };
}

async function withApi(callback: (api: Api) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  const { createApp } = await import("../src/app.js");
  const { resetChecklistRuntimeForTests } = await import("../src/modules/checklists/index.js");
  const { resetMobileChecklistSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-checklist-sync.js");
  const { resetMobileWorkOrderSyncRuntimeForTests } = await import("../src/modules/mobile/mobile-work-order-sync.js");
  const { resetFieldLocationRuntimeForTests } = await import("../src/modules/field-location/index.js");
  const { resetWorkOrderRuntimeForTests } = await import("../src/modules/work-orders/index.js");
  const { resetOperatorProfileRuntimeForTests } = await import("../src/modules/operator-profiles/operator-profile.service.js");
  const { configureMobileEvidenceUploadStorageForTests, resetMobileEvidenceUploadRuntimeForTests } = await import("../src/modules/mobile/mobile-evidence-upload.js");

  const registry = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(registry);
  const app = createApp(new MemoryCoreSaasAdapter(registry));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  resetChecklistRuntimeForTests();
  resetMobileChecklistSyncRuntimeForTests();
  syncModule.resetMobileEvidenceSyncRuntimeForTests();
  resetMobileWorkOrderSyncRuntimeForTests();
  resetFieldLocationRuntimeForTests();
  resetWorkOrderRuntimeForTests();
  resetOperatorProfileRuntimeForTests();
  configureMobileEvidenceUploadStorageForTests(`${process.env.TEMP ?? "/tmp"}/erp-indice-upload-${process.pid}-${Date.now()}`);
  await resetMobileEvidenceUploadRuntimeForTests();

  try {
    await callback({ baseUrl, seed });
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    syncModule.resetMobileEvidenceSyncRuntimeForTests();
    resetFieldLocationRuntimeForTests();
    resetOperatorProfileRuntimeForTests();
    await resetMobileEvidenceUploadRuntimeForTests();
  }
}

async function createWorkOrder(api: Api): Promise<string> {
  const created = await requestJson(api.baseUrl, "/api/v1/work-orders", {
    method: "POST",
    headers: authHeaders(api.seed.tenantA, api.seed.adminA, "tenant_admin"),
    body: { title: "OS da evidência índice" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  return created.body.data.id as string;
}

function observationAction(clientEvidenceId: string, note: string, extra: RawRecord = {}): RawRecord {
  return {
    client_evidence_id: clientEvidenceId,
    type: "evidence.field_observation",
    local_created_at: "2026-11-27T12:00:00.000Z",
    payload: { note, ...extra },
  };
}

function photoPayload(workOrderId: string): RawRecord {
  return {
    work_order_id: workOrderId,
    file_name: "panel.jpg",
    content_type: "image/jpeg",
    size_bytes: 2048,
    sha256: createHash("sha256").update("panel").digest("hex"),
  };
}

async function sync(api: Api, user: User, role: string, actions: RawRecord[], tenant: Tenant = api.seed.tenantA) {
  return requestJson(api.baseUrl, SYNC_ROUTE, {
    method: "POST",
    headers: authHeaders(tenant, user, role),
    body: { client_batch_id: `batch-${randomUUID()}`, actions },
  });
}

test("S1 — observação, foto e assinatura aceitas gravam a linha certa no repositório", async () => {
  await withApi(async (api) => {
    const workOrderId = await createWorkOrder(api);
    const headers = authHeaders(api.seed.tenantA, api.seed.adminA, "tenant_admin");
    const response = await requestJson(api.baseUrl, SYNC_ROUTE, {
      method: "POST",
      headers,
      body: {
        client_batch_id: "s1",
        actions: [
          { client_evidence_id: "s1-obs", type: "evidence.work_order_observation", local_created_at: "2026-11-27T12:00:00.000Z", payload: { work_order_id: workOrderId, note: "Portão fechado." } },
          { client_evidence_id: "s1-photo", type: "evidence.work_order_photo", local_created_at: "2026-11-27T12:01:00.000Z", payload: photoPayload(workOrderId) },
          { client_evidence_id: "s1-sign", type: "evidence.work_order_signature", local_created_at: "2026-11-27T12:02:00.000Z", payload: { ...photoPayload(workOrderId), signer_name: "Quem Assinou" } },
        ],
      },
    });
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.summary.accepted, 3);

    const repo = repository();
    const obs = await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, "s1-obs");
    const photo = await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, "s1-photo");
    const sign = await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, "s1-sign");
    assert.ok(obs && photo && sign, "as 3 linhas existem no repositório");
    assert.equal(obs.kind, "observation");
    assert.equal(obs.scope, "work_order");
    assert.equal(obs.workOrderId, workOrderId);
    assert.equal(obs.fileStatus, "none");
    assert.equal(obs.metadata.note, "Portão fechado.");
    assert.equal(photo.kind, "photo");
    assert.equal(photo.fileStatus, "awaiting_file");
    assert.equal(sign.kind, "signature");
    assert.equal(sign.fileStatus, "awaiting_file");
    assert.equal(sign.metadata.signer_name, "Quem Assinou");
  });
});

test("S2 — o mesmo lote de novo devolve already_applied igual ao accepted, menos o status", async () => {
  await withApi(async (api) => {
    const workOrderId = await createWorkOrder(api);
    const actions = [
      { client_evidence_id: "s2-obs", type: "evidence.work_order_observation", local_created_at: "2026-11-27T12:00:00.000Z", payload: { work_order_id: workOrderId, note: "Nota estável." } },
      { client_evidence_id: "s2-photo", type: "evidence.work_order_photo", local_created_at: "2026-11-27T12:01:00.000Z", payload: photoPayload(workOrderId) },
    ];
    const first = await sync(api, api.seed.adminA, "tenant_admin", actions);
    const replay = await sync(api, api.seed.adminA, "tenant_admin", actions);
    assert.equal(first.status, 200);
    assert.equal(replay.status, 200);
    assert.equal(first.body.data.summary.accepted, 2);
    assert.equal(replay.body.data.summary.already_applied, 2);
    assert.equal(replay.body.data.summary.accepted, 0);
    for (let index = 0; index < first.body.data.accepted.length; index += 1) {
      assert.deepEqual(replay.body.data.already_applied[index], { ...first.body.data.accepted[index], status: "already_applied" });
    }
  });
});

test("S3 — mesmo código com payload diferente vira conflict e a linha não muda", async () => {
  await withApi(async (api) => {
    const first = await sync(api, api.seed.techA1, "field_technician", [observationAction("s3-code", "Primeira nota.")]);
    assert.equal(first.body.data.summary.accepted, 1);
    const before = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s3-code");
    assert.ok(before);
    const second = await sync(api, api.seed.techA1, "field_technician", [observationAction("s3-code", "Nota diferente.")]);
    assert.equal(second.body.data.summary.conflicts, 1);
    assert.equal(second.body.data.conflicts[0].error.reason, "idempotency_payload_mismatch");
    const after = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s3-code");
    assert.deepEqual(after, before);
  });
});

test("S4 — o mesmo código por dois usuários e duas organizações gera 3 linhas distintas", async () => {
  await withApi(async (api) => {
    const code = "s4-shared";
    const r1 = await sync(api, api.seed.techA1, "field_technician", [observationAction(code, "Nota do A1.")]);
    const r2 = await sync(api, api.seed.techA2, "field_technician", [observationAction(code, "Nota do A2.")]);
    const r3 = await sync(api, api.seed.techB1, "field_technician", [observationAction(code, "Nota do B1.")], api.seed.tenantB);
    assert.equal(r1.body.data.summary.accepted, 1);
    assert.equal(r2.body.data.summary.accepted, 1);
    assert.equal(r3.body.data.summary.accepted, 1);
    const repo = repository();
    const a1 = await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, code);
    const a2 = await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA2.id, code);
    const b1 = await repo.findByClientEvidenceId(api.seed.tenantB.id, api.seed.techB1.id, code);
    assert.ok(a1 && a2 && b1);
    assert.notEqual(a1.id, a2.id);
    assert.notEqual(a1.id, b1.id);
    assert.equal(a1.metadata.note, "Nota do A1.");
    assert.equal(a2.metadata.note, "Nota do A2.");
    assert.equal(b1.metadata.note, "Nota do B1.");
    assert.equal(b1.tenantId, api.seed.tenantB.id);
  });
});

test("S5 — tenant_id, TENANT_ID e tenantid de fora são retirados; a linha nasce na organização do ator", async () => {
  await withApi(async (api) => {
    const workOrderId = await createWorkOrder(api);
    const response = await sync(api, api.seed.adminA, "tenant_admin", [
      {
        client_evidence_id: "s5-spoof",
        type: "evidence.work_order_observation",
        local_created_at: "2026-11-27T12:00:00.000Z",
        payload: {
          work_order_id: workOrderId,
          note: "Nota legítima.",
          tenant_id: api.seed.tenantB.id,
          TENANT_ID: api.seed.tenantB.id,
          tenantid: api.seed.tenantB.id,
          "tenant-id": api.seed.tenantB.id,
          metadata: { tenant_id: api.seed.tenantB.id, TENANT_ID: api.seed.tenantB.id, source: "offline" },
          items: [{ tenantid: api.seed.tenantB.id, ok: true }],
        },
      },
    ]);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.summary.accepted, 1);
    assert.equal(response.body.data.tenant_id, api.seed.tenantA.id);
    assert.equal(JSON.stringify(response.body).includes(api.seed.tenantB.id), false);
    const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.adminA.id, "s5-spoof");
    assert.ok(record);
    assert.equal(record.tenantId, api.seed.tenantA.id);
    const serialized = JSON.stringify(record.metadata);
    assert.equal(serialized.includes(api.seed.tenantB.id), false);
    assert.equal(/tenant[_-]?id/i.test(serialized), false);
  });
});

test("S6 — cada nome recusado, no topo e aninhado em array, vira rejected unsafe_payload; 0 linha", async () => {
  await withApi(async (api) => {
    const names = [
      "token", "access_token", "accesstoken", "refresh_token", "refreshToken", "authorization", "Bearer",
      "password", "secret", "bucket", "storage_key", "storagekey", "storage-key", "file_url", "fileUrl",
      "absolute_path", "absolutePath", "local_path", "localpath", "path", "PATH", "base64", "file_data",
    ];
    const actions: RawRecord[] = [];
    for (const name of names) {
      actions.push(observationAction(`s6-top-${name}`, "Nota.", { [name]: "valor proibido" }));
      actions.push(observationAction(`s6-nested-${name}`, "Nota.", { items: [{ [name]: "valor proibido" }] }));
    }
    const response = await sync(api, api.seed.techA1, "field_technician", actions);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.summary.received, names.length * 2);
    assert.equal(response.body.data.summary.rejected, names.length * 2);
    assert.equal(response.body.data.summary.accepted, 0);
    for (const result of response.body.data.rejected) {
      assert.equal(result.error.reason, "unsafe_payload", `reason de ${result.client_evidence_id}`);
    }
    const repo = repository();
    for (const name of names) {
      assert.equal(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, `s6-top-${name}`), undefined);
      assert.equal(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, `s6-nested-${name}`), undefined);
    }
  });
});

// O metadado normalizado de uma observação de campo é {kind:"observation", note}. Mede o JSON compacto
// e ajusta o comprimento da nota para bater o alvo exato em bytes (ASCII).
function observationWithMetadataBytes(targetBytes: number, clientEvidenceId: string): RawRecord {
  const base = Buffer.byteLength(JSON.stringify({ kind: "observation", note: "" }), "utf8");
  const noteLength = targetBytes - base;
  assert.ok(noteLength >= 0);
  return observationAction(clientEvidenceId, "a".repeat(noteLength));
}

test("S7 — 16385 bytes recusa metadata_too_large; 16384 aceita; código de 256 caracteres recusa", async () => {
  await withApi(async (api) => {
    const tooLarge = observationWithMetadataBytes(16385, "s7-large");
    const control = observationWithMetadataBytes(16384, "s7-control");
    const longCode = observationAction("c".repeat(256), "Nota.");
    const response = await sync(api, api.seed.techA1, "field_technician", [tooLarge, control, longCode]);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.summary.accepted, 1);
    assert.equal(response.body.data.summary.rejected, 2);
    const byCode = new Map(response.body.data.rejected.map((item: RawRecord) => [item.client_evidence_id, item]));
    assert.equal((byCode.get("s7-large") as RawRecord).error.reason, "metadata_too_large");
    assert.equal((byCode.get("c".repeat(256)) as RawRecord).error.reason, "invalid_client_evidence_id");
    const repo = repository();
    assert.ok(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s7-control"));
    assert.equal(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s7-large"), undefined);
    assert.equal(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "c".repeat(256)), undefined);
  });
});

test("S8 — repositório que falha no createAccepted dá 503; o reenvio com repositório sadio aceita", async () => {
  await withApi(async (api) => {
    const failing: EvidenceRepositoryLike = {
      async findByClientEvidenceId() { return undefined; },
      async createAccepted() { throw new Error("connection refused"); },
      async markFileStored() { throw new Error("unused"); },
      async listByWorkOrder() { return []; },
      async findByIdForWorkOrder() { return undefined; },
    };
    const actions = [observationAction("s8-a", "Nota A."), observationAction("s8-b", "Nota B.")];
    setRepository(failing);
    const failed = await sync(api, api.seed.techA1, "field_technician", actions);
    assert.equal(failed.status, 503, JSON.stringify(failed.body));
    assert.equal(failed.body.error.reason, "evidence_index_unavailable");
    setRepository(undefined);
    const healthy = await sync(api, api.seed.techA1, "field_technician", actions);
    assert.equal(healthy.status, 200, JSON.stringify(healthy.body));
    assert.equal(healthy.body.data.summary.accepted, 2);
    const repo = repository();
    assert.ok(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s8-a"));
    assert.ok(await repo.findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s8-b"));
  });
});

test("S9 — evidência field com work_order_id de rótulo: coluna nula, rótulo no eco", async () => {
  await withApi(async (api) => {
    const label = randomUUID();
    const response = await sync(api, api.seed.techA1, "field_technician", [observationAction("s9-field", "Nota de campo.", { work_order_id: label })]);
    assert.equal(response.status, 200, JSON.stringify(response.body));
    assert.equal(response.body.data.summary.accepted, 1);
    const result = response.body.data.accepted[0];
    assert.equal(result.work_order_id, label);
    assert.equal(result.server_state.metadata.work_order_id, label);
    const record = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s9-field");
    assert.ok(record);
    assert.equal(record.workOrderId, null);
    assert.equal(record.scope, "field");
    assert.equal(record.metadata.work_order_id, label);
  });
});

test("S10 — posição sem consentimento não grava gps; com consentimento grava", async () => {
  await withApi(async (api) => {
    const gps = { lat: -23.55052, lng: -46.633308 };
    // O perfil de operador exige user_id UUID; o técnico de campo aqui é uma identidade UUID no cabeçalho
    // (mesmo padrão do bsan317). O sync não exige linha em users; o consentimento é lido pelo id do ator.
    const techId = randomUUID();
    const techHeaders = { "x-tenant-id": api.seed.tenantA.id, "x-user-id": techId, "x-role": "field_technician" };
    const syncAsTech = (actions: RawRecord[]) => requestJson(api.baseUrl, SYNC_ROUTE, { method: "POST", headers: techHeaders, body: { client_batch_id: `batch-${randomUUID()}`, actions } });
    const without = await syncAsTech([observationAction("s10-no", "Sem consentimento.", { gps })]);
    assert.equal(without.body.data.summary.accepted, 1);
    const noRecord = await repository().findByClientEvidenceId(api.seed.tenantA.id, techId, "s10-no");
    assert.ok(noRecord);
    assert.equal(noRecord.metadata.gps, undefined);

    const profile = await requestJson(api.baseUrl, "/api/v1/operator-profiles", {
      method: "POST",
      headers: authHeaders(api.seed.tenantA, api.seed.adminA, "tenant_admin"),
      body: { user_id: techId, tracking_consent: true },
    });
    assert.equal(profile.status, 201, JSON.stringify(profile.body));

    const withConsent = await syncAsTech([observationAction("s10-yes", "Com consentimento.", { gps })]);
    assert.equal(withConsent.body.data.summary.accepted, 1);
    const yesRecord = await repository().findByClientEvidenceId(api.seed.tenantA.id, techId, "s10-yes");
    assert.ok(yesRecord);
    assert.deepEqual(yesRecord.metadata.gps, gps);
  });
});

// Costura da corrida (§E1.5): a 1ª busca não acha, o createAccepted devolve duplicate, a releitura devolve
// a linha do outro lote. A ação mutada (accepted antes do create) entraria em DUAS listas; a certa, em UMA.
function raceRepository(winner: EvidenceRecordLike): EvidenceRepositoryLike {
  let findCalls = 0;
  return {
    async findByClientEvidenceId() {
      findCalls += 1;
      return findCalls === 1 ? undefined : winner;
    },
    async createAccepted() { return { outcome: "duplicate" }; },
    async markFileStored() { throw new Error("unused"); },
    async listByWorkOrder() { return []; },
    async findByIdForWorkOrder() { return undefined; },
  };
}

function countInLists(body: RawRecord, code: string): number {
  const data = body.data as RawRecord;
  let total = 0;
  for (const list of ["accepted", "rejected", "conflicts", "already_applied"]) {
    total += (data[list] as RawRecord[]).filter((item) => item.client_evidence_id === code).length;
  }
  return total;
}

test("S11a — corrida com mesma impressão: a ação aparece SÓ em already_applied", async () => {
  await withApi(async (api) => {
    const action = observationAction("s11-a", "Nota da corrida.");
    const accepted = await sync(api, api.seed.techA1, "field_technician", [action]);
    assert.equal(accepted.body.data.summary.accepted, 1);
    const winner = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s11-a");
    assert.ok(winner);
    setRepository(raceRepository(winner));
    const raced = await sync(api, api.seed.techA1, "field_technician", [action]);
    assert.equal(raced.status, 200, JSON.stringify(raced.body));
    assert.equal(raced.body.data.summary.accepted, 0);
    assert.equal(raced.body.data.summary.already_applied, 1);
    assert.equal(raced.body.data.summary.conflicts, 0);
    assert.equal(countInLists(raced.body, "s11-a"), 1);
    assert.equal(raced.body.data.already_applied[0].client_evidence_id, "s11-a");
  });
});

test("S11b — corrida com impressão diferente: a ação aparece SÓ em conflicts", async () => {
  await withApi(async (api) => {
    const winnerSync = await sync(api, api.seed.techA1, "field_technician", [observationAction("s11-b", "Nota do outro lote.")]);
    assert.equal(winnerSync.body.data.summary.accepted, 1);
    const winner = await repository().findByClientEvidenceId(api.seed.tenantA.id, api.seed.techA1.id, "s11-b");
    assert.ok(winner);
    setRepository(raceRepository(winner));
    const raced = await sync(api, api.seed.techA1, "field_technician", [observationAction("s11-b", "Nota diferente deste lote.")]);
    assert.equal(raced.status, 200, JSON.stringify(raced.body));
    assert.equal(raced.body.data.summary.accepted, 0);
    assert.equal(raced.body.data.summary.conflicts, 1);
    assert.equal(raced.body.data.summary.already_applied, 0);
    assert.equal(raced.body.data.conflicts[0].error.reason, "idempotency_payload_mismatch");
    assert.equal(countInLists(raced.body, "s11-b"), 1);
  });
});
