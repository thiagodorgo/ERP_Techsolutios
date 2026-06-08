import path from "node:path";

import { env } from "../../../config/env.js";
import { ChecklistError } from "../checklist.types.js";
import type { ChecklistStorageProvider, ChecklistStorageProviderName } from "./checklist-storage.types.js";
import { LocalChecklistStorageProvider } from "./local-checklist-storage.provider.js";
import { S3ChecklistStorageProvider, type S3ChecklistStorageProviderConfig } from "./s3-checklist-storage.provider.js";

let defaultProvider: ChecklistStorageProvider | undefined;

export function createChecklistStorageProvider(): ChecklistStorageProvider {
  return createChecklistStorageProviderFromConfig(readChecklistStorageConfig());
}

export function getDefaultChecklistStorageProvider(): ChecklistStorageProvider {
  defaultProvider ??= createChecklistStorageProvider();
  return defaultProvider;
}

export function resetChecklistStorageProviderForTests(): void {
  defaultProvider = undefined;
}

export function readChecklistStorageConfig() {
  return {
    provider: env.CHECKLIST_STORAGE_PROVIDER,
    localDir: path.resolve(process.cwd(), env.CHECKLIST_STORAGE_LOCAL_DIR),
    maxSizeBytes: Math.floor(env.CHECKLIST_STORAGE_MAX_FILE_SIZE_MB * 1024 * 1024),
    allowedMimeTypes: env.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
    s3: {
      bucket: env.CHECKLIST_STORAGE_S3_BUCKET,
      region: env.CHECKLIST_STORAGE_S3_REGION,
      endpoint: env.CHECKLIST_STORAGE_S3_ENDPOINT,
      forcePathStyle: env.CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE,
      accessKeyId: env.CHECKLIST_STORAGE_S3_ACCESS_KEY_ID,
      secretAccessKey: env.CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY,
      prefix: env.CHECKLIST_STORAGE_S3_PREFIX,
    },
  } as const;
}

export function createChecklistStorageProviderFromConfig(config: {
  readonly provider: ChecklistStorageProviderName;
  readonly localDir: string;
  readonly s3: S3ChecklistStorageProviderConfig;
}): ChecklistStorageProvider {
  if (config.provider === "local") {
    return new LocalChecklistStorageProvider(config.localDir);
  }

  if (config.provider === "s3") {
    assertS3Config(config.s3);
    return new S3ChecklistStorageProvider(config.s3);
  }

  throw new ChecklistError(500, "CHECKLIST_ATTACHMENT_STORAGE_UNAVAILABLE", "storage_provider_invalid", "Checklist attachment storage provider is invalid.");
}

export function createChecklistStorageProviderByName(provider: ChecklistStorageProviderName): ChecklistStorageProvider {
  const config = readChecklistStorageConfig();
  return createChecklistStorageProviderFromConfig({
    ...config,
    provider,
  });
}

function assertS3Config(config: S3ChecklistStorageProviderConfig): void {
  const missing = [
    ["CHECKLIST_STORAGE_S3_BUCKET", config.bucket],
    ["CHECKLIST_STORAGE_S3_REGION", config.region],
  ].filter(([, value]) => !String(value ?? "").trim());

  if (missing.length > 0) {
    throw new ChecklistError(
      500,
      "CHECKLIST_ATTACHMENT_STORAGE_UNAVAILABLE",
      "s3_storage_config_incomplete",
      `Checklist S3 storage config is incomplete: ${missing.map(([key]) => key).join(", ")}.`,
    );
  }
}
