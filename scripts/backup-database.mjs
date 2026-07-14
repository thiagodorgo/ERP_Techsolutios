// Ω-INFRA-4 — backup do Postgres → S3. `pg_dump -Fc` (custom, comprimido nativamente) → valida com
// `pg_restore -l` (NUNCA sobe dump truncado/corrompido) → PutObject (bucket DEDICADO, privado, SSE) →
// retenção 30d SEGURA (só após upload OK; só chaves do prefixo com timestamp válido; nunca deixa < keepMinimum).
//
// SEGREDO/§2.8: nunca imprime connection string, senha, token nem storage key. As credenciais do Postgres
// vão ao pg_dump via env PG* (NÃO como argv → não vazam no process table). Creds AWS pela cadeia padrão do
// SDK / secrets do Environment. Ativação viva (bucket S3 real, PITR nativo) = hand-off humano.
//
// Reusa @aws-sdk/client-s3 (já instalado; sem nova dep). Formato do artefato = `.dump` (pg_restore), casado
// com scripts/restore-drill.sh. Teto conhecido do PutObject cru = 5GB/objeto (ver runbook; upgrade = multipart).

import { spawn } from "node:child_process";
import { createReadStream } from "node:fs";
import { stat, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";

const BACKUP_SUFFIX = "-erp.dump";
const RETENTION_DAYS = 30;
const KEEP_MINIMUM = 3; // piso de segurança: nunca apagar a ponto de sobrar menos que isto.
const MAX_OBJECT_BYTES = 5 * 1024 * 1024 * 1024; // limite HARD do PutObject cru (sem multipart).

// ---------------- helpers PUROS (testáveis) ----------------

/** `<prefix>/<ISO-UTC-com-ms>-<rand8>-erp.dump` — ordenável lexicograficamente = ordem cronológica. */
export function buildBackupKey(prefix, date, randomToken) {
  const stamp = date.toISOString().replace(/[:.]/g, "-"); // 2026-07-14T06-30-00-123Z
  const token = randomToken ?? "xxxxxxxx";
  const base = normalizePrefix(prefix) || "db-backups";
  return `${base}/${stamp}-${token}${BACKUP_SUFFIX}`;
}

/** Extrai o Date do nome; null se a chave não é um backup nosso (formato/prefixo alheio → nunca apagar). */
export function parseBackupTimestamp(key) {
  const name = key.split("/").pop() ?? "";
  const m = name.match(/^(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z)-[0-9a-f]{8}-erp\.dump$/);
  if (!m) return null;
  const iso = m[1].replace(
    /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z$/,
    "$1T$2:$3:$4.$5Z",
  );
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Retenção SEGURA. Só considera chaves sob o prefixo com timestamp válido (ignora objetos alheios).
 * Expira as mais velhas que retentionDays, MAS nunca as `keepMinimum` mais recentes (guarda anti-destruição)
 * e nunca a `protectKey` recém-enviada. Se sobrarem <= keepMinimum válidas, retorna [] (não apaga nada).
 */
export function selectExpiredKeys(keys, now, retentionDays = RETENTION_DAYS, options = {}) {
  const prefix = options.prefix ? normalizePrefix(options.prefix) : "";
  const keepMinimum = options.keepMinimum ?? KEEP_MINIMUM;
  const protectKey = options.protectKey;

  const valid = keys
    .map((key) => ({ key, at: parseBackupTimestamp(key) }))
    .filter((x) => x.at !== null && (!prefix || x.key.startsWith(`${prefix}/`)))
    .sort((a, b) => b.at.getTime() - a.at.getTime()); // mais recente primeiro

  if (valid.length <= keepMinimum) return [];

  const protectedNewest = new Set(valid.slice(0, keepMinimum).map((x) => x.key));
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;

  return valid
    .filter((x) => x.at.getTime() < cutoff)
    .filter((x) => !protectedNewest.has(x.key) && x.key !== protectKey)
    .map((x) => x.key);
}

/** Config do S3Client espelhando createS3Client do checklist (credentials só se houver key; endpoint '' → undefined). */
export function buildS3Config(env) {
  const config = {
    region: env.BACKUP_S3_REGION || undefined,
    endpoint: env.BACKUP_S3_ENDPOINT || undefined,
    forcePathStyle: strictBool(env.BACKUP_S3_FORCE_PATH_STYLE),
  };
  if (env.AWS_ACCESS_KEY_ID || env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: env.AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? "",
    };
  }
  return config;
}

/** DATABASE_URL → env PG* (para o pg_dump NÃO receber a senha em argv/process table). */
export function parsePgEnvFromUrl(databaseUrl) {
  const u = new URL(databaseUrl);
  const env = {
    PGHOST: decodeURIComponent(u.hostname),
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, "")),
  };
  if (u.password) env.PGPASSWORD = decodeURIComponent(u.password);
  const sslmode = u.searchParams.get("sslmode");
  if (sslmode) env.PGSSLMODE = sslmode;
  return env;
}

function normalizePrefix(prefix) {
  return (prefix ?? "")
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean)
    .join("/");
}

function strictBool(raw) {
  if (!raw) return false;
  return ["true", "1", "yes", "on"].includes(String(raw).trim().toLowerCase());
}

// ---------------- execução (impuro) ----------------

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    console.error(`[backup] env obrigatória ausente: ${name}`);
    process.exit(1);
  }
  return value;
}

function run(cmd, args, env, stdout = "inherit") {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { env: { ...process.env, ...env }, stdio: ["ignore", stdout, "inherit"] });
    child.on("error", (e) => resolve({ code: 1, error: e }));
    child.on("close", (code) => resolve({ code }));
  });
}

async function main() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const bucket = requiredEnv("BACKUP_S3_BUCKET");
  const prefix = normalizePrefix(process.env.BACKUP_S3_PREFIX || "db-backups");
  const pgEnv = parsePgEnvFromUrl(databaseUrl);
  const key = buildBackupKey(prefix, new Date(), randomBytes(4).toString("hex"));
  const dumpPath = join(tmpdir(), `erp-backup-${randomBytes(6).toString("hex")}.dump`);

  // 1) pg_dump -Fc (custom, comprimido). Senha via PG* env, nunca argv. Guard: exit!=0 → aborta (sem upload).
  console.log(`[backup] pg_dump -Fc → ${dumpPath}`);
  const dump = await run("pg_dump", ["-Fc", "-f", dumpPath], pgEnv);
  if (dump.code !== 0) {
    console.error(`[backup] FAIL pg_dump (exit ${dump.code}) — NÃO subindo dump truncado.`);
    await safeUnlink(dumpPath);
    process.exit(1);
  }

  // 2) Auto-validação: pg_restore -l lê o índice do dump; falha = artefato corrompido → aborta.
  // stdout descartado (só o exit code importa; o TOC inteiro poluiria o log do Actions).
  const validate = await run("pg_restore", ["-l", dumpPath], pgEnv, "ignore");
  if (validate.code !== 0) {
    console.error(`[backup] FAIL validação (pg_restore -l exit ${validate.code}) — artefato inválido, abortado.`);
    await safeUnlink(dumpPath);
    process.exit(1);
  }

  const { size } = await stat(dumpPath);
  if (size > MAX_OBJECT_BYTES) {
    console.error(`[backup] FAIL dump ${size} bytes > teto de 5GB do PutObject cru. Migrar p/ multipart (ver runbook).`);
    await safeUnlink(dumpPath);
    process.exit(1);
  }

  // 3) Upload (bucket dedicado/privado; SSE em repouso). ContentLength conhecido (evita chunked).
  const s3 = new S3Client(buildS3Config(process.env));
  console.log(`[backup] PutObject s3://${bucket}/${key} (${size} bytes)`);
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(dumpPath),
      ContentLength: size,
      ContentType: "application/octet-stream",
      ServerSideEncryption: "AES256",
    }),
  );
  await safeUnlink(dumpPath);
  console.log(`[backup] OK upload`);

  // 4) Retenção 30d SÓ APÓS upload OK. Nunca apaga a chave recém-enviada nem as keepMinimum mais recentes.
  try {
    const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: `${prefix}/` }));
    // Guarda (secops C5d): lista TRUNCADA não é "todos os objetos" — nunca decidir retenção sobre lista parcial.
    if (listed.IsTruncated) {
      console.error("[backup] aviso: ListObjects truncado (>1000); retenção PULADA para não apagar sobre lista parcial.");
      throw new Error("listagem truncada");
    }
    const keys = (listed.Contents ?? []).map((o) => o.Key).filter(Boolean);
    const expired = selectExpiredKeys(keys, new Date(), RETENTION_DAYS, { prefix, protectKey: key });
    for (const expiredKey of expired) {
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: expiredKey }));
      console.log(`[backup] retenção: removido ${expiredKey}`);
    }
    console.log(`[backup] retenção: ${expired.length} expirado(s), ${keys.length - expired.length} mantido(s)`);
  } catch (e) {
    // Retenção falha NÃO invalida o backup do dia (já subiu). Loga e segue verde.
    console.error(`[backup] aviso: retenção falhou (backup do dia OK): ${e.name ?? "erro"}`);
  }

  console.log("[backup] VERDE — dump validado + enviado + retenção aplicada.");
}

async function safeUnlink(path) {
  try {
    await unlink(path);
  } catch {
    // temp já removido / inexistente
  }
}

// Só executa main() quando rodado como script (não em import de teste).
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("backup-database.mjs")) {
  try {
    await main();
  } catch (error) {
    // §2.8/secops C4: erro SANITIZADO — nunca despejar o objeto de erro cru do SDK (carrega bucket/endpoint/params).
    console.error(`[backup] FAIL: ${error?.name ?? "erro"} (ver Environment/permissões; detalhe omitido por §2.8)`);
    process.exit(1);
  }
}
