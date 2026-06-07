import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  CORE_SAAS_PERSISTENCE: z.enum(["memory", "prisma"]).default("memory"),
  JWT_SECRET: z.string().trim().min(1).optional(),
  JWT_EXPIRES_IN: z
    .string()
    .trim()
    .regex(/^\d+(s|m|h|d)?$/, "JWT_EXPIRES_IN must use seconds, minutes, hours or days.")
    .default("15m"),
  CHECKLIST_ATTACHMENT_STORAGE_DRIVER: z.enum(["local"]).default("local"),
  CHECKLIST_ATTACHMENT_STORAGE_PATH: z.string().trim().min(1).default("storage/checklist-attachments"),
  CHECKLIST_ATTACHMENT_MAX_SIZE_MB: z.coerce.number().positive().max(100).default(10),
  CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: z.string().trim().min(1).default("image/jpeg,image/png,image/webp,application/pdf"),
}).superRefine((value, context) => {
  const developmentOnlySecrets = new Set([
    "dev-only-change-me",
    "change-me-in-local-development",
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
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_SECRET: parsedEnv.JWT_SECRET ?? "dev-only-change-me",
};

