import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import { envSchema } from "../src/config/env.js";

// B-EVIDENCIA-DURAVEL — a trava de boot `G-STORAGE-DURAVEL` (plano §3.4, §6.1 e Emenda 1 §E1.2).
//
// O defeito (`P-UPLOAD-ARMAZENAMENTO-EFEMERO`, GRAVE): a foto que o app de campo envia era gravada no diretório
// temporário do servidor e sumia no reinício ou na troca de versão — depois que o servidor já tinha respondido
// "guardado" e o app já tinha apagado a cópia dele. Este arquivo prova a TRAVA: com `NODE_ENV=production`, o
// processo só sobe com o armazenamento durável da D-014 (`s3`, bucket, região, o endpoint regional exato da AWS e
// as credenciais estáticas as duas ou nenhuma). Não há válvula. Vale para os 6 tipos de envio de arquivo.
//
// Molde: `tests/production-runtime-gates.test.ts` (um baseline de produção VÁLIDO; cada caso adultera UM campo).
// Os rótulos são `GS<n>` (gate de storage), para não colidir com os `G<n>` do molde (Emenda 1, B5).
// A regra é UMA só (`src/config/storage-durability.ts`): o GS14 prova que ela dá a mesma resposta que o portão do
// comprovante de despesa (#525), linha a linha.
//
// Repositório público: os valores abaixo são literais de teste (bucket `erp-teste-evidencia`, domínio de exemplo).

const PROD_OK: Record<string, string> = {
  NODE_ENV: "production",
  // Gates pré-existentes (segredo, CORS, portal e runtime) satisfeitos, para que a recusa observada seja SÓ a de
  // armazenamento — o mesmo baseline do molde.
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
  CORE_SAAS_PERSISTENCE: "prisma",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  JOBS_WORKER_ENABLED: "true",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
  // As 4 chaves do armazenamento durável que a trava exige (plano §3.4, §4.1).
  CHECKLIST_STORAGE_PROVIDER: "s3",
  CHECKLIST_STORAGE_S3_BUCKET: "erp-teste-evidencia",
  CHECKLIST_STORAGE_S3_REGION: "us-east-1",
  CHECKLIST_STORAGE_S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com",
};

const STORAGE_KEYS = [
  "CHECKLIST_STORAGE_PROVIDER",
  "CHECKLIST_STORAGE_S3_BUCKET",
  "CHECKLIST_STORAGE_S3_REGION",
  "CHECKLIST_STORAGE_S3_ENDPOINT",
  "CHECKLIST_STORAGE_S3_ACCESS_KEY_ID",
  "CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY",
] as const;

/**
 * `CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE` é `z.coerce.boolean()` (F10, pendência `P-STORAGE-FORCE-PATH-STYLE-COERCE`):
 * a string "false" vira `true`. Para o valor FALSO de verdade o ambiente precisa da string vazia.
 */
function forcePathStyleEnv(value: boolean): string {
  return value ? "true" : "";
}

function merge(overrides: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...PROD_OK, ...overrides } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key]; // simula a variável AUSENTE do ambiente
  }
  return merged;
}

function issuePaths(result: ReturnType<typeof envSchema.safeParse>): string[] {
  return result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
}

function rejectsOn(overrides: Record<string, unknown>, key: string, label: string): void {
  const result = envSchema.safeParse(merge(overrides));
  assert.equal(result.success, false, `${label}: esperava REJEITAR em produção, o schema ACEITOU`);
  assert.ok(
    issuePaths(result).some((entry) => entry.split(".").includes(key)),
    `${label}: esperava issue no caminho ${key}, veio: ${issuePaths(result).join(", ")}`,
  );
}

function accepts(overrides: Record<string, unknown>, label: string): void {
  const result = envSchema.safeParse(merge(overrides));
  assert.equal(result.success, true, `${label}: esperava ACEITAR, rejeitou em: ${issuePaths(result).join(", ")}`);
}

type GateCase = { readonly label: string; readonly overrides: Record<string, unknown>; readonly key: string };

// ── Os casos de recusa, nomeados uma vez e reusados no GS9 (a mensagem) e no GS14 (a paridade) ────────────────

const GS1_CASES: readonly GateCase[] = [
  { label: "GS1 sem CHECKLIST_STORAGE_PROVIDER (cai em local)", overrides: { CHECKLIST_STORAGE_PROVIDER: undefined }, key: "CHECKLIST_STORAGE_PROVIDER" },
];

const GS2_CASES: readonly GateCase[] = [
  {
    label: "GS2 local explícito com CHECKLIST_STORAGE_LOCAL_DIR declarado",
    overrides: { CHECKLIST_STORAGE_PROVIDER: "local", CHECKLIST_STORAGE_LOCAL_DIR: "/var/lib/erp/anexos" },
    key: "CHECKLIST_STORAGE_PROVIDER",
  },
];

const GS3_CASES: readonly GateCase[] = [
  {
    label: "GS3 só o legado CHECKLIST_ATTACHMENT_STORAGE_DRIVER=local",
    overrides: { CHECKLIST_STORAGE_PROVIDER: undefined, CHECKLIST_ATTACHMENT_STORAGE_DRIVER: "local" },
    key: "CHECKLIST_STORAGE_PROVIDER",
  },
];

const GS4_CASES: readonly GateCase[] = [
  { label: "GS4 s3 com bucket vazio", overrides: { CHECKLIST_STORAGE_S3_BUCKET: "" }, key: "CHECKLIST_STORAGE_S3_BUCKET" },
  { label: "GS4 s3 com bucket só de espaços", overrides: { CHECKLIST_STORAGE_S3_BUCKET: "   " }, key: "CHECKLIST_STORAGE_S3_BUCKET" },
];

const GS5_CASES: readonly GateCase[] = [
  { label: "GS5 região vazia", overrides: { CHECKLIST_STORAGE_S3_REGION: "" }, key: "CHECKLIST_STORAGE_S3_REGION" },
  // Zona de disponibilidade no lugar da região: erro realista de operador, fora da forma `xx-xxxx-N`.
  { label: "GS5 região fora da forma (us-east-1a)", overrides: { CHECKLIST_STORAGE_S3_REGION: "us-east-1a" }, key: "CHECKLIST_STORAGE_S3_REGION" },
];

/** As 13 formas recusadas do RR-A.2b do #525 (`tests/b-rdv-comprovante-receipt-storage.test.ts`), os MESMOS literais. */
const RR_A2B_REFUSED: ReadonlyArray<{ endpoint: string; forcePathStyle: boolean; region?: string }> = [
  { endpoint: "http://127.0.0.1:9000", forcePathStyle: true }, //                           1
  { endpoint: "", forcePathStyle: true }, //                                                  2
  { endpoint: "", forcePathStyle: false }, //                                                 3
  { endpoint: "https://[::1]:9000", forcePathStyle: true }, //                                4
  { endpoint: "https://169.254.169.254", forcePathStyle: true }, //                           5
  { endpoint: "https://10.0.0.5", forcePathStyle: true }, //                                  6
  { endpoint: "https://172.16.0.5", forcePathStyle: true }, //                                7
  { endpoint: "https://192.168.0.5", forcePathStyle: true }, //                               8
  { endpoint: "http://s3.us-east-1.amazonaws.com", forcePathStyle: true }, //                 9
  { endpoint: "https://localtest.me", forcePathStyle: true }, //                             10
  { endpoint: "https://s3.us-east-1.amazonaws.com.localtest.me", forcePathStyle: true }, //  11
  { endpoint: "https://s3.us-east-1.amazonaws.com@127.0.0.1", forcePathStyle: true }, //     12
  { endpoint: "https://s3.sa-east-1.amazonaws.com", forcePathStyle: true, region: "us-east-1" }, // 13
];

const GS6_CASES: readonly GateCase[] = RR_A2B_REFUSED.map((form, index) => ({
  label: `GS6 forma ${index + 1} (${form.endpoint || "vazio"}, forcePathStyle=${form.forcePathStyle})`,
  overrides: {
    CHECKLIST_STORAGE_S3_ENDPOINT: form.endpoint,
    CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE: forcePathStyleEnv(form.forcePathStyle),
    CHECKLIST_STORAGE_S3_REGION: form.region ?? "us-east-1",
  },
  key: "CHECKLIST_STORAGE_S3_ENDPOINT",
}));

/** Emenda 1, A1: host que TERMINA no host aprovado — a forma que a comparação por `endsWith` deixaria passar. */
const GS6B_ENDPOINTS = [
  "https://evil-s3.us-east-1.amazonaws.com",
  "https://xs3.us-east-1.amazonaws.com",
  // "bucket na frente" (estilo virtual-host): erro realista de operador.
  "https://erp-teste-evidencia.s3.us-east-1.amazonaws.com",
] as const;

const GS6B_CASES: readonly GateCase[] = GS6B_ENDPOINTS.map((endpoint) => ({
  label: `GS6b host que termina no host aprovado (${endpoint})`,
  overrides: { CHECKLIST_STORAGE_S3_ENDPOINT: endpoint },
  key: "CHECKLIST_STORAGE_S3_ENDPOINT",
}));

const GS7_CASES: readonly GateCase[] = [
  {
    label: "GS7 endpoint regional de outra região (região sa-east-1, endpoint de us-east-1)",
    overrides: { CHECKLIST_STORAGE_S3_REGION: "sa-east-1", CHECKLIST_STORAGE_S3_ENDPOINT: "https://s3.us-east-1.amazonaws.com" },
    key: "CHECKLIST_STORAGE_S3_ENDPOINT",
  },
];

const GS8_CASES: readonly GateCase[] = [
  {
    label: "GS8 só a chave de acesso",
    overrides: { CHECKLIST_STORAGE_S3_ACCESS_KEY_ID: "chave-de-acesso-de-teste" },
    key: "CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY",
  },
  {
    label: "GS8 só o segredo",
    overrides: { CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY: "segredo-de-teste-nao-e-segredo" },
    key: "CHECKLIST_STORAGE_S3_ACCESS_KEY_ID",
  },
];

const GS10_CASES: ReadonlyArray<{ readonly label: string; readonly overrides: Record<string, unknown> }> = [
  {
    label: "GS10 as duas credenciais estáticas",
    overrides: {
      CHECKLIST_STORAGE_S3_ACCESS_KEY_ID: "chave-de-acesso-de-teste",
      CHECKLIST_STORAGE_S3_SECRET_ACCESS_KEY: "segredo-de-teste-nao-e-segredo",
    },
  },
  { label: "GS10 nenhuma credencial (papel da tarefa)", overrides: {} },
  { label: "GS10 forcePathStyle verdadeiro", overrides: { CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE: forcePathStyleEnv(true) } },
  { label: "GS10 forcePathStyle falso", overrides: { CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE: forcePathStyleEnv(false) } },
  {
    label: "GS10 região sa-east-1 com o endpoint dela",
    overrides: { CHECKLIST_STORAGE_S3_REGION: "sa-east-1", CHECKLIST_STORAGE_S3_ENDPOINT: "https://s3.sa-east-1.amazonaws.com" },
  },
];

// ── GS0 · o baseline é aceito (sem ele, toda recusa abaixo passaria por vacuidade) ─────────────────────────────

test("GS0 base de produção completa, com o armazenamento durável → ACEITA (controle)", () => {
  accepts({}, "GS0");
});

// ── GS1 a GS8 · falha fechada ─────────────────────────────────────────────────────────────────────────────────

test("GS1 produção SEM CHECKLIST_STORAGE_PROVIDER (o efetivo cai em `local`) → REJEITA em CHECKLIST_STORAGE_PROVIDER", () => {
  for (const item of GS1_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS2 produção com `local` explícito E CHECKLIST_STORAGE_LOCAL_DIR declarado → REJEITA (não há válvula)", () => {
  for (const item of GS2_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS3 produção só com o legado CHECKLIST_ATTACHMENT_STORAGE_DRIVER=local → REJEITA", () => {
  for (const item of GS3_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS4 produção com `s3` e bucket vazio, e com bucket só de espaços → REJEITA em CHECKLIST_STORAGE_S3_BUCKET", () => {
  for (const item of GS4_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS5 produção com região vazia, e com região fora da forma → REJEITA em CHECKLIST_STORAGE_S3_REGION", () => {
  for (const item of GS5_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS6 produção com as 13 formas de endpoint recusadas do RR-A.2b do #525 → REJEITA em CHECKLIST_STORAGE_S3_ENDPOINT, as 13", () => {
  assert.equal(GS6_CASES.length, 13);
  for (const item of GS6_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS6b produção com endpoint cujo host TERMINA no host aprovado (3 literais) → REJEITA em CHECKLIST_STORAGE_S3_ENDPOINT, os 3", () => {
  assert.equal(GS6B_CASES.length, 3);
  for (const item of GS6B_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS7 produção com o endpoint regional de outra região que não a configurada → REJEITA", () => {
  for (const item of GS7_CASES) rejectsOn(item.overrides, item.key, item.label);
});

test("GS8 produção com só a chave de acesso, ou só o segredo → REJEITA, com issue na que falta", () => {
  for (const item of GS8_CASES) rejectsOn(item.overrides, item.key, item.label);
});

// ── GS9 · a mensagem de cada recusa não repete o valor recebido (o nome do bucket não vai para o log de boot) ────

test("GS9 a mensagem de cada issue de GS1 a GS8 não contém o valor do bucket nem do endpoint enviados", () => {
  const cases = [...GS1_CASES, ...GS2_CASES, ...GS3_CASES, ...GS4_CASES, ...GS5_CASES, ...GS6_CASES, ...GS6B_CASES, ...GS7_CASES, ...GS8_CASES];
  for (const item of cases) {
    const input = merge(item.overrides);
    const result = envSchema.safeParse(input);
    // Não-vacuidade: sem recusa de armazenamento não há mensagem para conferir.
    assert.equal(result.success, false, `${item.label}: esperava REJEITAR (sem recusa, não há mensagem a conferir)`);
    if (result.success) continue;
    assert.ok(
      result.error.issues.some((issue) => STORAGE_KEYS.some((key) => issue.path.includes(key))),
      `${item.label}: nenhuma issue de armazenamento, veio: ${issuePaths(result).join(", ")}`,
    );
    const sent = [input.CHECKLIST_STORAGE_S3_BUCKET, input.CHECKLIST_STORAGE_S3_ENDPOINT]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter((value) => value !== "");
    for (const issue of result.error.issues) {
      for (const value of sent) {
        assert.ok(!issue.message.includes(value), `${item.label}: a mensagem da issue em ${issue.path.join(".")} repete o valor "${value}"`);
      }
    }
  }
});

// ── GS10 e GS11 · a trava não é larga demais ────────────────────────────────────────────────────────────────────

test("GS10 produção com as duas credenciais; sem nenhuma; forcePathStyle verdadeiro e falso; região sa-east-1 com o endpoint dela → ACEITA nos 5 (controle)", () => {
  assert.equal(GS10_CASES.length, 5);
  for (const item of GS10_CASES) accepts(item.overrides, item.label);
});

test("GS11 desenvolvimento e teste com `local` → ACEITA (a trava não morde fora de produção) (controle)", () => {
  for (const nodeEnv of ["development", "test"]) {
    const result = envSchema.safeParse({ NODE_ENV: nodeEnv, CHECKLIST_STORAGE_PROVIDER: "local" });
    assert.equal(result.success, true, `${nodeEnv} + local: rejeitou em ${issuePaths(result).join(", ")}`);
  }
});

// ── GS12 e GS13 · o processo de verdade ──────────────────────────────────────────────────────────────────────────
//
// Um PROCESSO FILHO importa o `src/config/env.ts` real (que faz `envSchema.parse(process.env)` no import), sem
// capturar o erro: a saída é a que o operador veria no log de boot. O cwd é um diretório temporário vazio, porque
// o `dotenv` do topo do `env.ts` lê o `.env` do cwd (mesma razão de `tests/san3-05-runtime-role-bootstrap.test.ts`).

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TSX_LOADER = pathToFileURL(createRequire(import.meta.url).resolve("tsx")).href;
const ENV_MODULE = pathToFileURL(path.join(REPO_ROOT, "src/config/env.ts")).href;

function bootEnvModule(childEnv: Record<string, string>): { status: number | null; output: string } {
  const cwd = mkdtempSync(path.join(tmpdir(), "evdur-boot-"));
  try {
    const inherited: Record<string, string> = {};
    for (const key of ["PATH", "HOME", "SystemRoot", "TEMP", "TMP"]) {
      const value = process.env[key];
      if (value !== undefined) inherited[key] = value;
    }
    const result = spawnSync(
      process.execPath,
      ["--import", TSX_LOADER, "-e", `import(${JSON.stringify(ENV_MODULE)}).then(() => console.log("BOOT-ENV-OK"))`],
      { cwd, env: { ...inherited, ...childEnv }, encoding: "utf8", timeout: 60_000 },
    );
    return { status: result.status, output: `${result.stdout ?? ""}\n${result.stderr ?? ""}` };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("GS12 o processo de verdade, em produção com `local` e valores-sentinela no bucket e no endpoint: sai com erro, cita CHECKLIST_STORAGE_PROVIDER e não repete a sentinela", () => {
  const run = bootEnvModule({
    ...PROD_OK,
    CHECKLIST_STORAGE_PROVIDER: "local",
    CHECKLIST_STORAGE_S3_BUCKET: "erp-sentinela-nao-pode-vazar",
    CHECKLIST_STORAGE_S3_ENDPOINT: "https://sentinela-nao-pode-vazar.example.com",
  });
  assert.notEqual(run.status, 0, `o processo de produção sem armazenamento durável SUBIU: ${run.output}`);
  assert.doesNotMatch(run.output, /BOOT-ENV-OK/, "o import do env.ts terminou sem erro");
  assert.match(run.output, /CHECKLIST_STORAGE_PROVIDER/, `a saída não cita a chave que falta: ${run.output}`);
  assert.ok(!run.output.includes("sentinela-nao-pode-vazar"), `a saída do boot repete a sentinela: ${run.output}`);
});

test("GS13 o mesmo processo com a base completa sai com 0 (controle)", () => {
  const run = bootEnvModule(PROD_OK);
  assert.equal(run.status, 0, run.output);
  assert.match(run.output, /BOOT-ENV-OK/);
});

// ── GS14 · uma regra só: a trava, o portão do comprovante e o portão da evidência dão a mesma resposta ───────────

test("GS14 paridade da regra única: para cada linha de GS1 a GS8, GS6b, GS7 e GS10, isDurableStorageConfig e o portão do comprovante (assertReceiptStorageDurable, produção) dão a mesma resposta", async () => {
  const { isDurableStorageConfig } = await import("../src/config/storage-durability.js");
  const { assertReceiptStorageDurable } = await import("../src/modules/expense-management/expense-receipt.service.js");

  const rows = [
    ...GS1_CASES,
    ...GS2_CASES,
    ...GS3_CASES,
    ...GS4_CASES,
    ...GS5_CASES,
    ...GS6_CASES,
    ...GS6B_CASES,
    ...GS7_CASES,
    ...GS8_CASES,
    ...GS10_CASES,
  ];
  const answers = new Set<boolean>();
  for (const row of rows) {
    // Os valores EFETIVOS, normalizados pelo próprio schema (trim, defaults) e pela mesma cadeia do provedor do
    // objeto exportado (`CHECKLIST_STORAGE_PROVIDER ?? CHECKLIST_ATTACHMENT_STORAGE_DRIVER ?? "local"`). O parse é em
    // `development`, para que nenhum gate de produção recuse a linha antes da comparação.
    const parsed = envSchema.parse({ ...merge(row.overrides), NODE_ENV: "development" });
    const provider = parsed.CHECKLIST_STORAGE_PROVIDER ?? parsed.CHECKLIST_ATTACHMENT_STORAGE_DRIVER ?? "local";
    const s3 = {
      bucket: parsed.CHECKLIST_STORAGE_S3_BUCKET,
      region: parsed.CHECKLIST_STORAGE_S3_REGION,
      endpoint: parsed.CHECKLIST_STORAGE_S3_ENDPOINT,
      forcePathStyle: parsed.CHECKLIST_STORAGE_S3_FORCE_PATH_STYLE,
      prefix: parsed.CHECKLIST_STORAGE_S3_PREFIX,
    };
    const unique = isDurableStorageConfig({ provider, bucket: s3.bucket, region: s3.region, endpoint: s3.endpoint });
    let receipt = true;
    try {
      assertReceiptStorageDurable({ nodeEnv: "production", provider, s3 });
    } catch {
      receipt = false;
    }
    assert.equal(unique, receipt, `${row.label}: a regra única diz ${unique}, o portão do comprovante diz ${receipt}`);
    answers.add(unique);
  }
  // Não-vacuidade: a tabela tem linhas duráveis E não duráveis.
  assert.deepEqual([...answers].sort(), [false, true]);
});

// ── GS15 · o compose de validação de produção sobe com a trava ───────────────────────────────────────────────────
//
// Leitor mínimo do `environment:` de UM serviço do compose, copiado de `tests/deploy-manifest-parity.test.ts`
// (`parseComposeServiceEnv` e `stripYamlValue`, zero dependência). Copiado, e não importado, para não registrar os
// testes daquele arquivo dentro deste processo.

function stripYamlValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
    const quote = trimmed[0];
    const end = trimmed.indexOf(quote, 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  const commentAt = trimmed.indexOf(" #");
  return (commentAt === -1 ? trimmed : trimmed.slice(0, commentAt)).trim();
}

function parseComposeServiceEnv(yamlText: string, serviceName: string): Record<string, string> {
  const environment: Record<string, string> = {};
  let serviceIndent = -1;
  let environmentIndent = -1;
  let insideService = false;
  let insideEnvironment = false;

  for (const rawLine of yamlText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const indent = rawLine.length - rawLine.trimStart().length;

    if (!insideService) {
      if (line === `${serviceName}:`) {
        insideService = true;
        serviceIndent = indent;
      }
      continue;
    }

    if (indent <= serviceIndent) break;

    if (!insideEnvironment) {
      if (line === "environment:") {
        insideEnvironment = true;
        environmentIndent = indent;
      }
      continue;
    }

    if (indent <= environmentIndent) break;

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (match) environment[match[1]] = stripYamlValue(match[2]);
  }

  return environment;
}

test("GS15 o environment do serviço `api` do docker-compose.prod.yml real parseia no envSchema e declara as 4 chaves de armazenamento", () => {
  const composeApiEnv = parseComposeServiceEnv(readFileSync(path.join(REPO_ROOT, "docker-compose.prod.yml"), "utf8"), "api");
  // Piso anti-passa-vazio: o leitor leu o serviço de verdade.
  assert.ok(Object.keys(composeApiEnv).length >= 5, "leitura vazia/rasa do compose");
  assert.equal(composeApiEnv.NODE_ENV, "production");

  for (const key of ["CHECKLIST_STORAGE_PROVIDER", "CHECKLIST_STORAGE_S3_BUCKET", "CHECKLIST_STORAGE_S3_REGION", "CHECKLIST_STORAGE_S3_ENDPOINT"]) {
    assert.ok((composeApiEnv[key] ?? "").trim() !== "", `o compose de validação de produção não declara ${key}`);
  }
  const result = envSchema.safeParse(composeApiEnv);
  assert.equal(result.success, true, `o compose declara ambiente REJEITADO pelo env.ts: ${issuePaths(result).join(", ")}`);
});
