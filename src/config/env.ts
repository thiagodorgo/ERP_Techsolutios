import { config } from "dotenv";
import { z } from "zod";

config();

/**
 * Flag booleana de ambiente parseada de forma ESTRITA. `z.coerce.boolean()` usa `Boolean(value)`,
 * então a string `"false"` (não-vazia) vira `true` — um footgun que já ligou geocoding por engano.
 * Aqui só `true`/`1`/`yes`/`on` (case-insensitive) contam como verdadeiro; qualquer outra coisa é falso.
 */
export function booleanFlag(defaultValue: boolean) {
  return z
    .union([z.boolean(), z.string()])
    .default(defaultValue)
    .transform((value) => {
      if (typeof value === "boolean") return value;
      return ["true", "1", "yes", "on"].includes(value.trim().toLowerCase());
    });
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  CORE_SAAS_PERSISTENCE: z.enum(["memory", "prisma"]).default("memory"),
  REDIS_URL: z.string().trim().url().default("redis://localhost:6379"),
  JWT_SECRET: z.string().trim().min(1).optional(),
  JWT_EXPIRES_IN: z
    .string()
    .trim()
    .regex(/^\d+(s|m|h|d)?$/, "JWT_EXPIRES_IN must use seconds, minutes, hours or days.")
    .default("15m"),
  JWT_REFRESH_SECRET: z.string().trim().min(1).optional(),
  JWT_REFRESH_EXPIRES_IN: z
    .string()
    .trim()
    .regex(/^\d+(s|m|h|d)?$/, "JWT_REFRESH_EXPIRES_IN must use seconds, minutes, hours or days.")
    .default("7d"),
  CHECKLIST_STORAGE_PROVIDER: z.enum(["local", "s3"]).optional(),
  CHECKLIST_STORAGE_LOCAL_DIR: z.string().trim().min(1).optional(),
  CHECKLIST_STORAGE_S3_BUCKET: z.string().trim().optional().default(""),
  CHECKLIST_STORAGE_S3_REGION: z.string().trim().optional().default(""),
  CHECKLIST_STORAGE_S3_ENDPOINT: z.string().trim().optional().default(""),
  CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE: z.coerce.boolean().default(true),
  CHECKLIST_STORAGE_S3_ACCESS_KEY_ID: z.string().trim().optional().default(""),
  CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY: z.string().trim().optional().default(""),
  CHECKLIST_STORAGE_S3_PREFIX: z.string().trim().default("checklist-attachments"),
  CHECKLIST_STORAGE_MAX_FILE_SIZE_MB: z.coerce.number().positive().max(100).optional(),
  CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: z.string().trim().min(1).optional(),
  CHECKLIST_ATTACHMENT_STORAGE_DRIVER: z.enum(["local"]).optional(),
  CHECKLIST_ATTACHMENT_STORAGE_PATH: z.string().trim().min(1).optional(),
  CHECKLIST_ATTACHMENT_MAX_SIZE_MB: z.coerce.number().positive().max(100).optional(),
  CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: z.string().trim().min(1).optional(),
  AWS_CUR_IMPORT_ENABLED: z.coerce.boolean().default(false),
  AWS_CUR_S3_BUCKET: z.string().trim().optional().default(""),
  AWS_CUR_S3_PREFIX: z.string().trim().optional().default(""),
  AWS_CUR_S3_REGION: z.string().trim().optional().default(""),
  AWS_CUR_ATHENA_DATABASE: z.string().trim().optional().default(""),
  AWS_CUR_ATHENA_WORKGROUP: z.string().trim().optional().default(""),
  AWS_CUR_ATHENA_OUTPUT_LOCATION: z.string().trim().optional().default(""),
  // Ω1b-2 — Geocodificação de endereços de OS (dev-only). Master switch DESLIGADO por default:
  // com false o backend usa o NoopGeocoder (nenhuma chamada externa) — CI e prod ficam seguros.
  GEOCODING_ENABLED: booleanFlag(false),
  GEOCODING_PROVIDER: z.enum(["nominatim"]).default("nominatim"),
  NOMINATIM_BASE_URL: z.string().trim().url().default("https://nominatim.openstreetmap.org/search"),
  NOMINATIM_USER_AGENT: z.string().trim().min(1).default("ERP-Techsolutions/1.0 (+contato-do-operador)"),
  NOMINATIM_COUNTRY_CODES: z.string().trim().default("br"),
  NOMINATIM_MIN_INTERVAL_MS: z.coerce.number().int().nonnegative().default(1100),
  NOMINATIM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
}).superRefine((value, context) => {
  const developmentOnlySecrets = new Set([
    "dev-only-change-me",
    "dev-only-refresh-change-me",
    "change-me-in-local-development",
    "change-me-refresh-in-local-development",
  ]);

  if (
    value.NODE_ENV === "production" &&
    (!value.JWT_SECRET || developmentOnlySecrets.has(value.JWT_SECRET))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_SECRET"],
      message: "JWT_SECRET must be set to a production secret.",
    });
  }

  if (
    value.NODE_ENV === "production" &&
    (!value.JWT_REFRESH_SECRET || developmentOnlySecrets.has(value.JWT_REFRESH_SECRET))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JWT_REFRESH_SECRET"],
      message: "JWT_REFRESH_SECRET must be set to a production secret.",
    });
  }

  // Ω1b-2 (R11) — o uso sistemático da instância PÚBLICA do Nominatim é proibido pela política de uso
  // (banimento de IP). Em produção, geocodificação só é permitida contra um provedor próprio/self-host.
  if (
    value.NODE_ENV === "production" &&
    value.GEOCODING_ENABLED &&
    /nominatim\.openstreetmap\.org/i.test(value.NOMINATIM_BASE_URL)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["GEOCODING_ENABLED"],
      message:
        "Geocodificação com a instância pública do Nominatim é proibida em produção (política de uso). Use um provedor próprio ou mantenha GEOCODING_ENABLED=false.",
    });
  }
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET ?? "dev-only-change-me",
  JWT_REFRESH_SECRET: parsedEnv.JWT_REFRESH_SECRET ?? "dev-only-refresh-change-me",
  CHECKLIST_STORAGE_PROVIDER: parsedEnv.CHECKLIST_STORAGE_PROVIDER ?? parsedEnv.CHECKLIST_ATTACHMENT_STORAGE_DRIVER ?? "local",
  CHECKLIST_STORAGE_LOCAL_DIR: parsedEnv.CHECKLIST_STORAGE_LOCAL_DIR ?? parsedEnv.CHECKLIST_ATTACHMENT_STORAGE_PATH ?? "storage/checklist-attachments",
  CHECKLIST_STORAGE_MAX_FILE_SIZE_MB: parsedEnv.CHECKLIST_STORAGE_MAX_FILE_SIZE_MB ?? parsedEnv.CHECKLIST_ATTACHMENT_MAX_SIZE_MB ?? 10,
  CHECKLIST_STORAGE_ALLOWED_MIME_TYPES:
    parsedEnv.CHECKLIST_STORAGE_ALLOWED_MIME_TYPES ??
    parsedEnv.CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES ??
    "image/jpeg,image/png,image/webp,application/pdf",
};

