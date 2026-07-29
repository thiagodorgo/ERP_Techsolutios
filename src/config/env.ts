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
  // P-SAN-CORS (Ω-INFRA-3) — allowlist de origens (CSV). Vazio = permissivo (reflete a origem da
  // requisição) em dev/test; em PRODUÇÃO o gate abaixo exige allowlist explícita sem curinga.
  CORS_ORIGIN: z.string().trim().default(""),
  CORE_SAAS_PERSISTENCE: z.enum(["memory", "prisma"]).default("memory"),
  // Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — liga o worker in-process (job.worker.ts). Default DESLIGADO: com false o
  // loop de jobs NÃO sobe (CI/testes que importam app.ts nunca disparam o scheduler). Só com true ∧
  // persistence=prisma o server.ts inicia o worker + enfileira o 1º `notifications.scan-due`. Usa booleanFlag
  // (parse ESTRITO: só true/1/yes/on → verdadeiro; "false" continua false, sem o footgun do z.coerce.boolean).
  JOBS_WORKER_ENABLED: booleanFlag(false),
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
  // ── Ω5P PR-16 — owner-portal (superfície PÚBLICA ISOLADA) ────────────────────────────────────────────────────
  // D-Ω5P-PORTAL-01/02/05. O portal público é um APP EXPRESS DISTINTO (src/portal-app.ts), porta própria, CORS
  // próprio, sessão própria (jose, secret PRÓPRIO ≠ JWT do ERP), tenant por BINDING de deploy (não por JWT).
  // NENHUM reuso de sessão/cookie/auth do ERP (RN-POR-05). Gates de produção espelham os do core (JWT/CORS) —
  // NÃO afrouxam nada existente; só ADICIONAM exigências para a nova superfície.
  PORTAL_PORT: z.coerce.number().int().positive().default(3100),
  // Allowlist de origens do portal (CSV). Vazio = permissivo em dev/test; em produção o gate abaixo exige
  // allowlist explícita sem curinga (espelha CORS_ORIGIN). Independente do CORS do core.
  PORTAL_CORS_ORIGIN: z.string().trim().default(""),
  // Segredo da SESSÃO de portal (jose) — PRÓPRIO, jamais o JWT_SECRET do ERP. Obrigatório em produção.
  PORTAL_SESSION_SECRET: z.string().trim().min(1).optional(),
  // Ω5P PR-18a — segredo da SESSÃO do authority-portal (jose) — PRÓPRIO e DISTINTO: ≠ JWT_SECRET do ERP E ≠
  // PORTAL_SESSION_SECRET do owner (isolamento authority×owner×ERP; um token não verifica no outro). Obrigatório em
  // produção (gate abaixo espelha o do PORTAL_SESSION_SECRET).
  PORTAL_AUTHORITY_SESSION_SECRET: z.string().trim().min(1).optional(),
  // Segredo do HMAC do PortalAccessLog (query_fingerprint / ip_hash) e da comparação em tempo constante do 2º
  // fator — nunca guarda placa/Renavam/IP crus (I10 §2.8). Obrigatório em produção.
  PORTAL_LOG_SECRET: z.string().trim().min(1).optional(),
  // Binding de tenant do deploy (host→tenant / var). O portal só enxerga ESTE operador → mata a enumeração
  // cross-tenant (D-Ω5P-PORTAL-02). Obrigatório em produção; em dev/test pode vir vazio (injetado por teste).
  PORTAL_TENANT_ID: z.string().trim().default(""),
}).superRefine((value, context) => {
  const developmentOnlySecrets = new Set([
    "dev-only-change-me",
    "dev-only-refresh-change-me",
    "change-me-in-local-development",
    "change-me-refresh-in-local-development",
    // Ω5P PR-16 — defaults de dev do portal público (rejeitados em produção, como os do JWT).
    "dev-only-portal-session-change-me",
    "dev-only-portal-log-change-me",
    // Ω5P PR-18a — default de dev do authority-portal (rejeitado em produção).
    "dev-only-portal-authority-session-change-me",
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

  // P-SAN-CORS (Ω-INFRA-3) — o bare `app.use(cors())` refletia QUALQUER origem ("*"). Em produção o
  // CORS não pode ser wildcard nem vazio: exige allowlist explícita, espelhando o gate do JWT.
  // Qualquer entrada CONTENDO '*' é rejeitada (não só a igual a '*' — ex.: "*.exemplo.com" fecha).
  const corsOrigins = value.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    value.NODE_ENV === "production" &&
    (corsOrigins.length === 0 || corsOrigins.some((origin) => origin.includes("*")))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORS_ORIGIN"],
      message:
        "CORS_ORIGIN deve ser uma allowlist explícita de origens (sem curinga '*') em produção.",
    });
  }

  // Ω5P PR-16 — gates de produção do owner-portal (espelham JWT/CORS; NÃO afrouxam nada existente).
  // Segredos do portal são OBRIGATÓRIOS e ≠ dev-default em produção (mesma disciplina do JWT_SECRET).
  if (
    value.NODE_ENV === "production" &&
    (!value.PORTAL_SESSION_SECRET || developmentOnlySecrets.has(value.PORTAL_SESSION_SECRET))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_SESSION_SECRET"],
      message: "PORTAL_SESSION_SECRET must be set to a production secret (never the ERP JWT secret).",
    });
  }
  if (
    value.NODE_ENV === "production" &&
    (!value.PORTAL_LOG_SECRET || developmentOnlySecrets.has(value.PORTAL_LOG_SECRET))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_LOG_SECRET"],
      message: "PORTAL_LOG_SECRET must be set to a production secret.",
    });
  }
  // Ω5P PR-18a — o segredo da sessão do authority-portal é OBRIGATÓRIO e ≠ dev-default em produção (mesma
  // disciplina do PORTAL_SESSION_SECRET).
  if (
    value.NODE_ENV === "production" &&
    (!value.PORTAL_AUTHORITY_SESSION_SECRET || developmentOnlySecrets.has(value.PORTAL_AUTHORITY_SESSION_SECRET))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_AUTHORITY_SESSION_SECRET"],
      message: "PORTAL_AUTHORITY_SESSION_SECRET must be set to a production secret (never the ERP JWT nor the owner portal secret).",
    });
  }
  // O binding de tenant do portal é obrigatório em produção (sem ele o portal não resolve qual operador serve).
  if (value.NODE_ENV === "production" && !value.PORTAL_TENANT_ID) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_TENANT_ID"],
      message: "PORTAL_TENANT_ID (binding de tenant do deploy) é obrigatório em produção.",
    });
  }
  // CORS do portal: allowlist explícita sem curinga em produção (espelha o gate do CORS_ORIGIN do core).
  const portalCorsOrigins = value.PORTAL_CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (
    value.NODE_ENV === "production" &&
    (portalCorsOrigins.length === 0 || portalCorsOrigins.some((origin) => origin.includes("*")))
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_CORS_ORIGIN"],
      message:
        "PORTAL_CORS_ORIGIN deve ser uma allowlist explícita de origens (sem curinga '*') em produção.",
    });
  }

  // LOW (coordenador-de-acessos, defense-in-depth) — o isolamento portal×ERP não pode depender só de convenção:
  // em produção o segredo de SESSÃO do portal JAMAIS pode ser igual ao JWT do ERP (nem o de LOG igual ao refresh).
  // Se coincidissem, uma sessão do portal poderia ser confundida/forjada com material do ERP. Fecha por CONTRATO.
  if (
    value.NODE_ENV === "production" &&
    value.PORTAL_SESSION_SECRET &&
    value.PORTAL_SESSION_SECRET === value.JWT_SECRET
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_SESSION_SECRET"],
      message: "PORTAL_SESSION_SECRET must not equal JWT_SECRET (isolamento portal×ERP).",
    });
  }
  if (
    value.NODE_ENV === "production" &&
    value.PORTAL_LOG_SECRET &&
    value.PORTAL_LOG_SECRET === value.JWT_REFRESH_SECRET
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_LOG_SECRET"],
      message: "PORTAL_LOG_SECRET must not equal JWT_REFRESH_SECRET (isolamento portal×ERP).",
    });
  }

  // Ω5P PR-18a — isolamento authority×owner×ERP POR CONTRATO: em produção o secret da sessão do authority NÃO pode
  // coincidir com o do ERP (JWT) NEM com o do owner (PORTAL_SESSION_SECRET). Se coincidissem, um token de uma
  // superfície poderia ser forjado/confundido com material da outra. Fecha o isolamento além da audience.
  if (
    value.NODE_ENV === "production" &&
    value.PORTAL_AUTHORITY_SESSION_SECRET &&
    value.PORTAL_AUTHORITY_SESSION_SECRET === value.JWT_SECRET
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_AUTHORITY_SESSION_SECRET"],
      message: "PORTAL_AUTHORITY_SESSION_SECRET must not equal JWT_SECRET (isolamento authority×ERP).",
    });
  }
  if (
    value.NODE_ENV === "production" &&
    value.PORTAL_AUTHORITY_SESSION_SECRET &&
    value.PORTAL_AUTHORITY_SESSION_SECRET === value.PORTAL_SESSION_SECRET
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PORTAL_AUTHORITY_SESSION_SECRET"],
      message: "PORTAL_AUTHORITY_SESSION_SECRET must not equal PORTAL_SESSION_SECRET (isolamento authority×owner).",
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
  // Allowlist derivada (CSV → array). Vazio em dev/test → app.ts usa `origin: true` (permissivo);
  // em produção o superRefine garante array não-vazio e sem curinga.
  CORS_ORIGINS: parsedEnv.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Ω5P PR-16 — allowlist do portal derivada (CSV → array). Vazio em dev/test → portal-app usa `origin: true`;
  // em produção o superRefine garante array não-vazio e sem curinga.
  PORTAL_CORS_ORIGINS: parsedEnv.PORTAL_CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  // Defaults de dev do portal (rejeitados em produção pelo gate acima). Nunca reusa o JWT do ERP.
  PORTAL_SESSION_SECRET: parsedEnv.PORTAL_SESSION_SECRET ?? "dev-only-portal-session-change-me",
  PORTAL_LOG_SECRET: parsedEnv.PORTAL_LOG_SECRET ?? "dev-only-portal-log-change-me",
  // Ω5P PR-18a — default de dev do authority-portal (rejeitado em produção pelo gate acima). ≠ owner ≠ ERP.
  PORTAL_AUTHORITY_SESSION_SECRET:
    parsedEnv.PORTAL_AUTHORITY_SESSION_SECRET ?? "dev-only-portal-authority-session-change-me",
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

