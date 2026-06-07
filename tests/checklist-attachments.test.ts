import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { rm } from "node:fs/promises";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test, { after, before } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";

const storagePath = path.join(os.tmpdir(), `erp-checklist-attachments-${process.pid}`);
const tinyPdf = Buffer.from("%PDF-1.4\n%checklist attachment test\n");
const tinyPng = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d,
]);

before(removeStoragePath);
after(async () => {
  await removeStoragePath({ throwOnFailure: false });
});

test("checklist attachment multipart upload stores local file, metadata and secure download", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const { runId, componentId } = await createPublishedRun(baseUrl, seed.tenantA, seed.adminA);
    const upload = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
      componentId,
      fileName: "../../evidence photo.png",
      mimeType: "image/png",
      content: tinyPng,
      metadata: {
        source: "test-suite",
      },
    });

    assert.equal(upload.status, 201);
    assert.equal(upload.body.data.tenantId, seed.tenantA.id);
    assert.equal(upload.body.data.runId, runId);
    assert.equal(upload.body.data.componentId, componentId);
    assert.equal(upload.body.data.fileName, "evidence_photo.png");
    assert.equal(upload.body.data.mimeType, "image/png");
    assert.equal(upload.body.data.sizeBytes, tinyPng.length);
    assert.match(upload.body.data.fileUrl, /^local:\/\/checklist-attachments\//);
    assert.equal(upload.body.data.metadata.storageDriver, "local");
    assert.equal(typeof upload.body.data.metadata.storageKey, "string");
    assert.equal(upload.body.data.metadata.source, "test-suite");
    assert.equal(upload.body.data.metadata.checksumSha256.length, 64);
    assert.equal(JSON.stringify(upload.body.data).includes(storagePath), false);

    const storageKey = upload.body.data.metadata.storageKey as string;
    assert.equal(storageKey.includes(".."), false);
    assert.equal(storageKey.includes("\\"), false);
    assert.equal(existsSync(path.resolve(storagePath, ...storageKey.split("/"))), true);

    const download = await fetch(
      `${baseUrl}/api/v1/mobile/checklist-runs/${runId}/attachments/${upload.body.data.id}/download`,
      {
        headers: authHeaders(seed.tenantA, seed.adminA),
      },
    );

    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-type"), "image/png");
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), tinyPng);
  });
});

test("checklist attachment upload and download enforce tenant and permission boundaries", async () => {
  await withChecklistApi(async ({ baseUrl, seed }) => {
    const { runId, componentId } = await createPublishedRun(baseUrl, seed.tenantA, seed.adminA);
    const created = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
      componentId,
      fileName: "valid.pdf",
      mimeType: "application/pdf",
      content: tinyPdf,
    });
    assert.equal(created.status, 201);

    const withoutTenant = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: {
        "x-user-id": seed.adminA.id,
        "x-role": "tenant_admin",
      },
      componentId,
      fileName: "valid.pdf",
      mimeType: "application/pdf",
      content: tinyPdf,
    });
    const withoutUpdatePermission = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin", ["checklist_runs:read"]),
      componentId,
      fileName: "valid.pdf",
      mimeType: "application/pdf",
      content: tinyPdf,
    });
    const crossTenantUpload = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantB, seed.adminB),
      componentId,
      fileName: "valid.pdf",
      mimeType: "application/pdf",
      content: tinyPdf,
    });
    const invalidMime = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
      componentId,
      fileName: "notes.txt",
      mimeType: "text/plain",
      content: Buffer.from("plain text is not allowed"),
    });
    const tooLarge = await requestMultipart(baseUrl, `/api/v1/mobile/checklist-runs/${runId}/attachments`, {
      headers: authHeaders(seed.tenantA, seed.adminA),
      componentId,
      fileName: "large.pdf",
      mimeType: "application/pdf",
      content: Buffer.alloc(2048, "a"),
    });
    const downloadWithoutReadPermission = await requestRaw(
      baseUrl,
      `/api/v1/mobile/checklist-runs/${runId}/attachments/${created.body.data.id}/download`,
      {
        headers: authHeaders(seed.tenantA, seed.adminA, "tenant_admin", ["checklist_runs:update"]),
      },
    );
    const crossTenantDownload = await requestRaw(
      baseUrl,
      `/api/v1/mobile/checklist-runs/${runId}/attachments/${created.body.data.id}/download`,
      {
        headers: authHeaders(seed.tenantB, seed.adminB),
      },
    );

    assert.equal(withoutTenant.status, 403);
    assert.equal(withoutTenant.body.error.reason, "tenant_required");
    assert.equal(withoutUpdatePermission.status, 403);
    assert.equal(withoutUpdatePermission.body.error.reason, "permission_required");
    assert.equal(crossTenantUpload.status, 404);
    assert.equal(crossTenantUpload.body.error.reason, "checklist_run_not_found");
    assert.equal(invalidMime.status, 400);
    assert.equal(invalidMime.body.error.reason, "mime_type_not_allowed");
    assert.equal(tooLarge.status, 400);
    assert.equal(tooLarge.body.error.reason, "file_too_large");
    assert.equal(downloadWithoutReadPermission.status, 403);
    assert.equal(downloadWithoutReadPermission.body.error.reason, "permission_required");
    assert.equal(crossTenantDownload.status, 404);
    assert.equal(crossTenantDownload.body.error.reason, "checklist_run_not_found");
  });
});

async function createPublishedRun(
  baseUrl: string,
  tenant: Tenant,
  user: User,
): Promise<{ readonly runId: string; readonly componentId: string }> {
  const create = await requestJson(baseUrl, "/api/v1/tenant/checklists", {
    method: "POST",
    headers: authHeaders(tenant, user),
    body: {
      name: "Checklist com anexos",
      type: "technical_evidence",
      schema: {
        source: "attachment-test",
      },
      components: [
        {
          componentKey: "photos",
          type: "photo_upload",
          label: "Fotos",
          required: true,
        },
      ],
    },
  });
  assert.equal(create.status, 201);

  const componentId = create.body.data.components[0].id as string;
  const publish = await requestJson(baseUrl, `/api/v1/tenant/checklists/${create.body.data.id}/publish`, {
    method: "POST",
    headers: authHeaders(tenant, user),
  });
  assert.equal(publish.status, 200);

  const run = await requestJson(baseUrl, "/api/v1/mobile/checklist-runs", {
    method: "POST",
    headers: authHeaders(tenant, user),
    body: {
      checklistId: publish.body.data.id,
    },
  });
  assert.equal(run.status, 201);

  return {
    runId: run.body.data.id as string,
    componentId,
  };
}

type SeedData = {
  readonly tenantA: Tenant;
  readonly tenantB: Tenant;
  readonly adminA: User;
  readonly adminB: User;
};

type ChecklistApiContext = {
  readonly baseUrl: string;
  readonly seed: SeedData;
};

async function withChecklistApi(callback: (context: ChecklistApiContext) => Promise<void>): Promise<void> {
  process.env.LOG_LEVEL = "silent";
  process.env.CORE_SAAS_PERSISTENCE = "memory";
  process.env.CHECKLIST_ATTACHMENT_STORAGE_DRIVER = "local";
  process.env.CHECKLIST_ATTACHMENT_STORAGE_PATH = storagePath;
  process.env.CHECKLIST_ATTACHMENT_MAX_SIZE_MB = "0.001";
  process.env.CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES = "image/jpeg,image/png,image/webp,application/pdf";

  const [
    { createApp },
    { resetChecklistRuntimeForTests },
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/checklists/index.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);

  resetChecklistRuntimeForTests();

  const core = new CoreSaasRegistry(new InMemoryCoreSaasStore());
  const seed = seedCoreSaas(core);
  const app = createApp(new MemoryCoreSaasAdapter(core));
  const server = app.listen(0);
  const baseUrl = await getBaseUrl(server);

  try {
    await callback({
      baseUrl,
      seed,
    });
  } finally {
    await closeServer(server);
    resetChecklistRuntimeForTests();
  }
}

function seedCoreSaas(service: {
  createTenant(input: { readonly name: string }): Tenant;
  createUser(input: { readonly tenantId: string; readonly name: string; readonly email: string; readonly roles: readonly string[] }): User;
}): SeedData {
  const tenantA = service.createTenant({
    name: "Tenant Attachment A",
  });
  const tenantB = service.createTenant({
    name: "Tenant Attachment B",
  });
  const adminA = service.createUser({
    tenantId: tenantA.id,
    name: "Admin A",
    email: "attachment-admin-a@example.com",
    roles: ["tenant_admin"],
  });
  const adminB = service.createUser({
    tenantId: tenantB.id,
    name: "Admin B",
    email: "attachment-admin-b@example.com",
    roles: ["tenant_admin"],
  });

  return {
    tenantA,
    tenantB,
    adminA,
    adminB,
  };
}

function authHeaders(
  tenant: Tenant,
  user: User,
  role = "tenant_admin",
  permissions?: readonly string[],
): Record<string, string> {
  return {
    "x-tenant-id": tenant.id,
    "x-user-id": user.id,
    "x-role": role,
    ...(permissions ? { "x-permissions": permissions.join(",") } : {}),
  };
}

async function requestMultipart(
  baseUrl: string,
  routePath: string,
  options: {
    readonly headers: Record<string, string>;
    readonly componentId: string;
    readonly fileName: string;
    readonly mimeType: string;
    readonly content: Buffer;
    readonly metadata?: Record<string, unknown>;
  },
) {
  const form = new FormData();
  form.set("componentId", options.componentId);

  if (options.metadata) {
    form.set("metadata", JSON.stringify(options.metadata));
  }

  form.set("file", new Blob([options.content], { type: options.mimeType }), options.fileName);

  return requestRaw(baseUrl, routePath, {
    method: "POST",
    headers: options.headers,
    body: form,
  });
}

async function requestJson(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: unknown;
  } = {},
) {
  return requestRaw(baseUrl, routePath, {
    method: options.method,
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
}

async function requestRaw(
  baseUrl: string,
  routePath: string,
  options: {
    readonly method?: string;
    readonly headers?: Record<string, string>;
    readonly body?: BodyInit;
  } = {},
) {
  const response = await fetch(`${baseUrl}${routePath}`, {
    method: options.method ?? "GET",
    headers: options.headers,
    body: options.body,
  });
  const text = await response.text();

  return {
    status: response.status,
    body: text ? JSON.parse(text) : null,
    headers: response.headers,
  };
}

async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => {
    server.once("listening", resolve);
  });

  const address = server.address();

  assert.notEqual(address, null);
  assert.notEqual(typeof address, "string");

  return `http://127.0.0.1:${(address as AddressInfo).port}`;
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function removeStoragePath(options: { readonly throwOnFailure?: boolean } = {}): Promise<void> {
  for (let attempt = 1; attempt <= 10; attempt += 1) {
    try {
      await rm(storagePath, { recursive: true, force: true });
      return;
    } catch (error) {
      if (attempt === 10 || !["ENOTEMPTY", "EPERM", "EBUSY"].includes((error as NodeJS.ErrnoException).code ?? "")) {
        if (options.throwOnFailure === false) {
          return;
        }

        throw error;
      }

      await delay(100);
    }
  }
}
