import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  NoSuchKey,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import { ChecklistError } from "../checklist.types.js";
import type {
  ChecklistStorageObject,
  ChecklistStorageProvider,
  GetChecklistStorageObjectInput,
  SaveChecklistStorageObjectInput,
  StoredChecklistStorageObject,
} from "./checklist-storage.types.js";

export type S3ChecklistStorageProviderConfig = {
  bucket: string;
  region: string;
  endpoint?: string;
  forcePathStyle: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
  prefix: string;
};

type S3ClientLike = {
  send(command: PutObjectCommand): Promise<unknown>;
  send(command: GetObjectCommand): Promise<{ Body?: unknown; ContentType?: string; ContentLength?: number }>;
  send(command: DeleteObjectCommand): Promise<unknown>;
};

export class S3ChecklistStorageProvider implements ChecklistStorageProvider {
  readonly name = "s3" as const;

  private readonly normalizedPrefix: string;

  constructor(
    private readonly config: S3ChecklistStorageProviderConfig,
    private readonly client: S3ClientLike = createS3Client(config),
  ) {
    this.normalizedPrefix = normalizePrefix(config.prefix);
  }

  async save(input: SaveChecklistStorageObjectInput): Promise<StoredChecklistStorageObject> {
    const storageKey = this.buildStorageKey(input);

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.config.bucket,
        Key: storageKey,
        Body: input.buffer,
        ContentType: input.mimeType,
        ContentLength: input.sizeBytes,
        ChecksumSHA256: Buffer.from(input.checksumSha256, "hex").toString("base64"),
        Metadata: {
          tenant_id: input.tenantId,
          run_id: input.runId,
          original_filename: input.originalName.slice(0, 240),
          safe_filename: input.safeFileName,
          checksum_sha256: input.checksumSha256,
        },
      }),
    );

    return {
      fileUrl: `s3://${this.config.bucket}/${storageKey}`,
      fileName: input.safeFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      checksumSha256: input.checksumSha256,
      storageProvider: this.name,
      storageKey,
    };
  }

  async getObject(input: GetChecklistStorageObjectInput): Promise<ChecklistStorageObject> {
    try {
      const result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.config.bucket,
          Key: input.storageKey,
        }),
      );

      if (!result.Body) {
        throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
      }

      return {
        body: await toStorageBody(result.Body),
        mimeType: result.ContentType,
        sizeBytes: result.ContentLength,
      };
    } catch (error) {
      if (error instanceof NoSuchKey || (error as { name?: string }).name === "NoSuchKey") {
        throw new ChecklistError(404, "CHECKLIST_ATTACHMENT_NOT_FOUND", "attachment_file_not_found", "Attachment file not found.");
      }

      throw error;
    }
  }

  async deleteObject(input: GetChecklistStorageObjectInput): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.config.bucket,
        Key: input.storageKey,
      }),
    );
  }

  private buildStorageKey(input: SaveChecklistStorageObjectInput): string {
    const objectName = `${randomUUID()}-${input.safeFileName}`;
    const parts = [this.normalizedPrefix, input.tenantId, input.runId, objectName].filter(Boolean);

    return parts.join("/");
  }
}

function createS3Client(config: S3ChecklistStorageProviderConfig): S3Client {
  const clientConfig: S3ClientConfig = {
    region: config.region,
    endpoint: config.endpoint || undefined,
    forcePathStyle: config.forcePathStyle,
  };

  if (config.accessKeyId || config.secretAccessKey) {
    clientConfig.credentials = {
      accessKeyId: config.accessKeyId ?? "",
      secretAccessKey: config.secretAccessKey ?? "",
    };
  }

  return new S3Client(clientConfig);
}

async function toStorageBody(body: unknown): Promise<Buffer | Readable> {
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (body instanceof Readable) return body;
  if (typeof body === "string") return Buffer.from(body);
  if (isWebReadableStream(body)) return Buffer.from(await new Response(body).arrayBuffer());

  throw new ChecklistError(500, "CHECKLIST_ATTACHMENT_STORAGE_UNAVAILABLE", "unsupported_s3_body", "S3 object body is not supported.");
}

function normalizePrefix(prefix: string): string {
  return prefix
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean)
    .join("/");
}

function isWebReadableStream(value: unknown): value is ReadableStream {
  return typeof ReadableStream !== "undefined" && value instanceof ReadableStream;
}
