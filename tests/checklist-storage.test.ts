import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Readable } from "node:stream";
import test from "node:test";

import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

import {
  ChecklistError,
  createChecklistStorageProviderFromConfig,
  LocalChecklistStorageProvider,
  S3ChecklistStorageProvider,
  type ChecklistStorageObjectBody,
} from "../src/modules/checklists/index.js";

const storageRoot = path.join(os.tmpdir(), `erp-checklist-storage-provider-${process.pid}`);

test("local checklist storage saves, reads and deletes tenant-scoped objects", async () => {
  await rm(storageRoot, { recursive: true, force: true });

  const provider = new LocalChecklistStorageProvider(storageRoot);
  const buffer = Buffer.from("local checklist evidence");
  const checksumSha256 = sha256(buffer);

  const stored = await provider.save({
    tenantId: "tenant-a",
    runId: "run-a",
    buffer,
    originalName: "../../Evidence Photo.png",
    safeFileName: "Evidence_Photo.png",
    mimeType: "image/png",
    sizeBytes: buffer.length,
    checksumSha256,
  });

  assert.equal(stored.storageProvider, "local");
  assert.equal(stored.fileUrl.startsWith("local://checklist-attachments/"), true);
  assert.equal(stored.storageKey.includes(".."), false);
  assert.equal(stored.storageKey.includes("\\"), false);
  assert.equal(stored.checksumSha256, checksumSha256);

  const object = await provider.getObject({ storageKey: stored.storageKey });
  assert.deepEqual(await readStorageBody(object.body), buffer);

  await assert.rejects(
    () => provider.getObject({ storageKey: "../outside.png" }),
    (error) => error instanceof ChecklistError && error.reason === "invalid_storage_key",
  );

  await provider.deleteObject({ storageKey: stored.storageKey });
  await assert.rejects(
    () => provider.getObject({ storageKey: stored.storageKey }),
    (error) => error instanceof ChecklistError && error.reason === "attachment_file_not_found",
  );
});

test("checklist storage factory selects local or S3-compatible providers from config", () => {
  assert.equal(
    createChecklistStorageProviderFromConfig({
      provider: "local",
      localDir: storageRoot,
      s3: {
        bucket: "",
        region: "",
        endpoint: "",
        forcePathStyle: true,
        prefix: "checklist-attachments",
      },
    }).name,
    "local",
  );

  assert.equal(
    createChecklistStorageProviderFromConfig({
      provider: "s3",
      localDir: storageRoot,
      s3: {
        bucket: "checklists-test",
        region: "us-east-1",
        endpoint: "http://localhost:9000",
        forcePathStyle: true,
        accessKeyId: "test",
        secretAccessKey: "test",
        prefix: "checklist-attachments",
      },
    }).name,
    "s3",
  );

  assert.throws(
    () =>
      createChecklistStorageProviderFromConfig({
        provider: "s3",
        localDir: storageRoot,
        s3: {
          bucket: "",
          region: "",
          endpoint: "",
          forcePathStyle: true,
          prefix: "checklist-attachments",
        },
      }),
    (error) => error instanceof ChecklistError && error.reason === "s3_storage_config_incomplete",
  );

  assert.throws(
    () =>
      createChecklistStorageProviderFromConfig({
        provider: "memory" as never,
        localDir: storageRoot,
        s3: {
          bucket: "",
          region: "",
          endpoint: "",
          forcePathStyle: true,
          prefix: "checklist-attachments",
        },
      }),
    (error) => error instanceof ChecklistError && error.reason === "storage_provider_invalid",
  );
});

test("S3-compatible checklist storage uses SDK commands without real AWS calls", async () => {
  const commands: Array<PutObjectCommand | GetObjectCommand> = [];
  const client = {
    async send(command: PutObjectCommand | GetObjectCommand) {
      commands.push(command);
      if (command instanceof GetObjectCommand) {
        return {
          Body: Buffer.from("s3-object"),
          ContentType: "image/webp",
          ContentLength: 9,
        };
      }

      return {};
    },
  };
  const provider = new S3ChecklistStorageProvider(
    {
      bucket: "checklists-test",
      region: "us-east-1",
      endpoint: "http://localhost:9000",
      forcePathStyle: true,
      accessKeyId: "test",
      secretAccessKey: "test",
      prefix: "/tenant-checklists/",
    },
    client as never,
  );
  const buffer = Buffer.from("s3 checklist evidence");
  const checksumSha256 = sha256(buffer);

  const stored = await provider.save({
    tenantId: "tenant-a",
    runId: "run-a",
    buffer,
    originalName: "photo.webp",
    safeFileName: "photo.webp",
    mimeType: "image/webp",
    sizeBytes: buffer.length,
    checksumSha256,
  });

  assert.equal(stored.storageProvider, "s3");
  assert.equal(stored.fileUrl.startsWith("s3://checklists-test/tenant-checklists/tenant-a/run-a/"), true);

  const putCommand = commands[0] as PutObjectCommand;
  assert.equal(putCommand.input.Bucket, "checklists-test");
  assert.equal(putCommand.input.Key, stored.storageKey);
  assert.equal(putCommand.input.ContentType, "image/webp");
  assert.equal(putCommand.input.Metadata?.tenant_id, "tenant-a");
  assert.equal(putCommand.input.Metadata?.run_id, "run-a");
  assert.equal(putCommand.input.Metadata?.checksum_sha256, checksumSha256);

  const object = await provider.getObject({ storageKey: stored.storageKey });
  assert.deepEqual(await readStorageBody(object.body), Buffer.from("s3-object"));
  assert.equal(object.mimeType, "image/webp");

  const getCommand = commands[1] as GetObjectCommand;
  assert.equal(getCommand.input.Bucket, "checklists-test");
  assert.equal(getCommand.input.Key, stored.storageKey);
});

test("S3-compatible checklist storage maps missing objects to checklist errors", async () => {
  const provider = new S3ChecklistStorageProvider(
    {
      bucket: "checklists-test",
      region: "us-east-1",
      endpoint: "http://localhost:9000",
      forcePathStyle: true,
      prefix: "checklist-attachments",
    },
    {
      async send() {
        const error = new Error("not found");
        error.name = "NoSuchKey";
        throw error;
      },
    } as never,
  );

  await assert.rejects(
    () => provider.getObject({ storageKey: "tenant-a/run-a/missing.png" }),
    (error) => error instanceof ChecklistError && error.reason === "attachment_file_not_found",
  );
});

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

async function readStorageBody(body: ChecklistStorageObjectBody): Promise<Buffer> {
  if (Buffer.isBuffer(body)) return body;

  const chunks: Buffer[] = [];
  for await (const chunk of body as Readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}
