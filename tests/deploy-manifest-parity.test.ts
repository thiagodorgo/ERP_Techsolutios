import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { envSchema } from "../src/config/env.js";

// B-O6R-05 (Ω6R-DAT-001 + Ω6R-DIN-006) — PARIDADE ENTRE OS MANIFESTOS DE DEPLOY E OS GATES DO env.ts.
//
// O achado: um manifesto pode declarar um ambiente que o `envSchema` REJEITA (o `docker-compose.prod.yml`
// não trazia nenhum `PORTAL_*` e o processo saía com erro antes do `listen`), ou pode declarar um ambiente
// que o schema ACEITA mas que sobe o agregado core-saas em memória e sem worker de jobs. Este guard fecha os
// dois lados: o manifesto tem de satisfazer o schema, e toda chave EXIGIDA em produção tem de aparecer no
// manifesto — como VALOR quando é configuração, e como NOME (cabeçalho de secrets) quando é segredo/ambiente.
//
// A lista de exigidas NÃO é congelada aqui: ela é DERIVADA do próprio `envSchema`, removendo chave a chave de
// um baseline de produção válido e perguntando ao schema se ele passa a rejeitar. Gate novo no `env.ts` entra
// nesta lista sozinho — o guard não precisa ser reeditado para continuar valendo.
//
// ANTI-PASSA-VAZIO (veto do `agente-ci-doutor`): os leitores de YAML/TOML são caseiros e mínimos (ZERO
// dependência nova — §C7). Um leitor quebrado que devolvesse `{}` faria TODA asserção de manifesto passar por
// vacuidade. Por isso, antes de olhar para os manifestos reais, cada leitor é exercitado contra FIXTURES
// INLINE com igualdade EXATA (incluindo comentário de linha, comentário no fim da linha e valor entre aspas),
// o `[env]` do `fly.production.toml` é comparado a um objeto esperado EXPLÍCITO, e o conjunto derivado de
// exigidas é afirmado NÃO-VAZIO e contendo ao menos DATABASE_URL, REDIS_URL e JWT_SECRET.
//
// §2 regra 3 / §2.8: este arquivo não lê, não escreve e não imprime segredo real. Os valores do baseline são
// literais de teste; os do compose são placeholders da classe `local-prod-validation-*-not-a-secret`.

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readRepoFile(relativePath: string): string {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Leitores mínimos (zero dependência) — unit-testados abaixo contra fixtures inline.
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Valor TOML simples: string entre aspas (ignora comentário depois do fechamento) ou literal nu. */
function stripTomlValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"')) {
    const end = trimmed.indexOf('"', 1);
    return end === -1 ? trimmed.slice(1) : trimmed.slice(1, end);
  }
  const commentAt = trimmed.indexOf("#");
  return (commentAt === -1 ? trimmed : trimmed.slice(0, commentAt)).trim();
}

/** Lê UMA tabela TOML de topo (ex.: `[env]`) como mapa chave→valor. Ignora comentários e outras tabelas. */
export function parseTomlTable(tomlText: string, tableName: string): Record<string, string> {
  const table: Record<string, string> = {};
  let inside = false;

  for (const rawLine of tomlText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith("[")) {
      inside = line === `[${tableName}]`;
      continue;
    }
    if (!inside || line === "" || line.startsWith("#")) continue;

    const match = /^([A-Za-z0-9_]+)\s*=\s*(.+)$/.exec(line);
    if (match) table[match[1]] = stripTomlValue(match[2]);
  }

  return table;
}

/**
 * Nomes de variáveis DOCUMENTADAS em comentário, na convenção já usada pelos cabeçalhos dos `fly.*.toml`
 * e pelo `.env.example`: `#   NOME_DA_VAR → explicação`. Só o NOME é capturado — o cabeçalho jamais carrega
 * valor (veto secops #1). Linhas de continuação e prosa em maiúsculas NÃO são capturadas.
 */
export function parseDocumentedEnvNames(text: string): Set<string> {
  const names = new Set<string>();

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line.startsWith("#")) continue;
    const body = line.replace(/^#+\s*/, "");
    const match = /^([A-Z][A-Z0-9_]{2,})\s+→/.exec(body);
    if (match) names.add(match[1]);
  }

  return names;
}

/** Valor YAML simples: string entre aspas ou literal nu (com comentário ` #` opcional no fim). */
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

/**
 * Lê o bloco `environment:` (forma de MAPA `CHAVE: valor`) de UM serviço do compose, por indentação.
 * Serviço inexistente ⇒ `{}` — e é justamente por isso que os pisos de não-vacuidade abaixo existem.
 */
export function parseComposeServiceEnv(yamlText: string, serviceName: string): Record<string, string> {
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

    if (indent <= serviceIndent) break; // saiu do serviço

    if (!insideEnvironment) {
      if (line === "environment:") {
        insideEnvironment = true;
        environmentIndent = indent;
      }
      continue;
    }

    if (indent <= environmentIndent) break; // saiu do bloco environment

    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (match) environment[match[1]] = stripYamlValue(match[2]);
  }

  return environment;
}

/** Nomes declarados no `.env.example`: atribuições (comentadas ou não) ∪ nomes documentados com `→`. */
export function parseEnvExampleDeclaredNames(text: string): Set<string> {
  const names = new Set<string>(parseDocumentedEnvNames(text));

  for (const rawLine of text.split(/\r?\n/)) {
    const match = /^\s*#?\s*([A-Z][A-Z0-9_]*)\s*=/.exec(rawLine);
    if (match) names.add(match[1]);
  }

  return names;
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Fixtures inline — provam que os leitores LEEM (e não devolvem `{}` calado).
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const TOML_FIXTURE = [
  "# Cabeçalho do manifesto.",
  "#   DATABASE_URL          → Postgres gerenciado (NUNCA versionado)",
  "#   JWT_SECRET            → segredo real",
  "# NUNCA versione segredo neste arquivo.",
  "",
  'app = "exemplo"',
  "",
  "[env]",
  '  NODE_ENV = "production"   # comentário no fim da linha',
  '  PORT = "3000"',
  "  # linha só de comentário dentro da tabela",
  '  LOG_LEVEL = "info"',
  "",
  "[[http_service.checks]]",
  '  path = "/api/v1/health"',
].join("\n");

const YAML_FIXTURE = [
  "services:",
  "  postgres:",
  "    environment:",
  "      POSTGRES_PASSWORD: postgres",
  "",
  "  api:",
  "    build:",
  "      context: .",
  "    environment:",
  "      NODE_ENV: production",
  "      # comentário dentro do bloco",
  "      PORT: 3000",
  '      QUOTED: "com aspas"',
  "      CORS_ORIGIN: http://localhost:8080",
  "    ports:",
  '      - "3000:3000"',
  "",
  "  web:",
  "    environment:",
  "      OUTRO: valor",
].join("\n");

test("leitor TOML: lê a tabela [env] com igualdade EXATA (comentário de linha e no fim da linha)", () => {
  assert.deepEqual(parseTomlTable(TOML_FIXTURE, "env"), {
    NODE_ENV: "production",
    PORT: "3000",
    LOG_LEVEL: "info",
  });
});

test("leitor TOML: tabela inexistente ⇒ {} (o leitor SABE devolver vazio; por isso há pisos abaixo)", () => {
  assert.deepEqual(parseTomlTable(TOML_FIXTURE, "nao_existe"), {});
});

test("leitor de cabeçalho: captura só NOMES documentados com '→', nunca prosa nem chaves de [env]", () => {
  const names = parseDocumentedEnvNames(TOML_FIXTURE);
  assert.deepEqual([...names].sort(), ["DATABASE_URL", "JWT_SECRET"]);
  assert.equal(names.has("NUNCA"), false);
  assert.equal(names.has("NODE_ENV"), false);
});

test("leitor YAML: lê o environment do serviço pedido com igualdade EXATA (aspas e comentário)", () => {
  assert.deepEqual(parseComposeServiceEnv(YAML_FIXTURE, "api"), {
    NODE_ENV: "production",
    PORT: "3000",
    QUOTED: "com aspas",
    CORS_ORIGIN: "http://localhost:8080",
  });
});

test("leitor YAML: não vaza environment de serviço vizinho e devolve {} para serviço inexistente", () => {
  assert.deepEqual(parseComposeServiceEnv(YAML_FIXTURE, "redis"), {});
  assert.deepEqual(parseComposeServiceEnv(YAML_FIXTURE, "web"), { OUTRO: "valor" });
});

test("leitor do .env.example: nomes de atribuição (comentada ou não) ∪ nomes documentados com '→'", () => {
  const fixture = [
    "PORT=3000",
    '# JWT_SECRET="nunca-versionar"',
    "#   REDIS_URL → Redis de produção",
    "# texto solto que não declara nada",
  ].join("\n");
  assert.deepEqual([...parseEnvExampleDeclaredNames(fixture)].sort(), [
    "JWT_SECRET",
    "PORT",
    "REDIS_URL",
  ]);
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// Derivação das chaves EXIGIDAS em produção — do próprio envSchema, não de lista congelada.
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const PROD_BASELINE: Record<string, string> = {
  NODE_ENV: "production",
  PORT: "3000",
  LOG_LEVEL: "info",
  CORE_SAAS_PERSISTENCE: "prisma",
  JOBS_WORKER_ENABLED: "true",
  DATABASE_URL: "postgresql://erp:erp@db.interno.exemplo.com:5432/erp?schema=public",
  REDIS_URL: "redis://redis.interno.exemplo.com:6379",
  JWT_SECRET: "a-real-production-secret",
  JWT_REFRESH_SECRET: "a-real-production-refresh-secret",
  JWT_EXPIRES_IN: "15m",
  CORS_ORIGIN: "https://app.exemplo.com",
  PORTAL_SESSION_SECRET: "a-real-production-portal-session-secret",
  PORTAL_LOG_SECRET: "a-real-production-portal-log-secret",
  PORTAL_AUTHORITY_SESSION_SECRET: "a-real-production-authority-session-secret",
  PORTAL_TENANT_ID: "00000000-0000-0000-0000-000000000001",
  PORTAL_CORS_ORIGIN: "https://consulta.exemplo.com",
};

/** Chave a chave: remover do baseline faz o schema REJEITAR? Então ela é EXIGIDA em produção. */
function deriveRequiredInProduction(): string[] {
  assert.equal(
    envSchema.safeParse(PROD_BASELINE).success,
    true,
    "o baseline de produção precisa parsear — sem isso a derivação inteira seria lixo",
  );

  return Object.keys(PROD_BASELINE)
    .filter((key) => {
      const candidate = { ...PROD_BASELINE };
      delete candidate[key];
      return envSchema.safeParse(candidate).success === false;
    })
    .sort();
}

/** Chaves que PODEM aparecer com VALOR num manifesto versionado (veto secops #2: allowlist, não heurística). */
const MANIFEST_VALUE_ALLOWLIST = new Set([
  "NODE_ENV",
  "PORT",
  "CORE_SAAS_PERSISTENCE",
  "JOBS_WORKER_ENABLED",
  "JWT_EXPIRES_IN",
  "LOG_LEVEL",
]);

/** Secrets do compose de VALIDAÇÃO local-prod: placeholders rotulados, jamais segredo real. */
const COMPOSE_PLACEHOLDER_SECRET_KEYS = [
  "JWT_SECRET",
  "JWT_REFRESH_SECRET",
  "PORTAL_SESSION_SECRET",
  "PORTAL_LOG_SECRET",
  "PORTAL_AUTHORITY_SESSION_SECRET",
];

const PLACEHOLDER_PATTERN = /^local-prod-validation-[a-z0-9-]*not-a-secret$/;

test("piso anti-passa-vazio: a lista derivada de exigidas é não-vazia e cobre o núcleo de runtime", () => {
  const required = deriveRequiredInProduction();
  assert.ok(required.length > 0, "derivação vazia = guard inútil");
  for (const key of ["DATABASE_URL", "REDIS_URL", "JWT_SECRET"]) {
    assert.ok(required.includes(key), `${key} deveria ser EXIGIDA em produção, e não é`);
  }
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// docker-compose.prod.yml
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const composeText = readRepoFile("docker-compose.prod.yml");
const composeApiEnv = parseComposeServiceEnv(composeText, "api");

test("piso anti-passa-vazio: o environment do serviço `api` do compose foi realmente lido", () => {
  assert.ok(Object.keys(composeApiEnv).length >= 5, "leitura vazia/rasa do compose");
  assert.equal(composeApiEnv.NODE_ENV, "production");
});

test("compose local-prod: o environment do `api` PARSEIA no envSchema (não sai com erro antes do listen)", () => {
  const result = envSchema.safeParse(composeApiEnv);
  const offenders = result.success ? [] : result.error.issues.map((issue) => issue.path.join("."));
  assert.equal(result.success, true, `o compose declara ambiente REJEITADO pelo env.ts: ${offenders.join(", ")}`);
});

test("Ω6R-DAT-001 — compose local-prod declara CORE_SAAS_PERSISTENCE=prisma", () => {
  assert.equal(composeApiEnv.CORE_SAAS_PERSISTENCE, "prisma");
});

test("Ω6R-DIN-006 — compose local-prod liga o worker de jobs", () => {
  assert.equal(composeApiEnv.JOBS_WORKER_ENABLED, "true");
});

test("compose local-prod: os 5 secrets são placeholders ROTULADOS e DISTINTOS entre si (§2 regra 3)", () => {
  const values: string[] = [];
  for (const key of COMPOSE_PLACEHOLDER_SECRET_KEYS) {
    const value = composeApiEnv[key];
    assert.ok(value, `${key} ausente no compose local-prod`);
    assert.match(value, PLACEHOLDER_PATTERN, `${key} não usa a classe de placeholder rotulada`);
    values.push(value);
  }
  assert.equal(new Set(values).size, values.length, "placeholders repetidos: os gates de isolamento cairiam");
});

test("compose local-prod: o serviço `api` publica uma tag de imagem parametrizada (reuso do artefato)", () => {
  assert.match(composeText, /image:\s*\$\{API_IMAGE:-[^}]+\}/);
});

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// fly.production.toml / fly.staging.toml
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

const flyManifests = [
  { name: "fly.production.toml", text: readRepoFile("fly.production.toml") },
  { name: "fly.staging.toml", text: readRepoFile("fly.staging.toml") },
];

test("piso anti-passa-vazio: o [env] do fly.production.toml bate com um objeto esperado EXPLÍCITO", () => {
  assert.deepEqual(parseTomlTable(flyManifests[0].text, "env"), {
    NODE_ENV: "production",
    PORT: "3000",
    CORE_SAAS_PERSISTENCE: "prisma",
    JOBS_WORKER_ENABLED: "true",
    JWT_EXPIRES_IN: "15m",
    LOG_LEVEL: "info",
  });
});

for (const manifest of flyManifests) {
  test(`Ω6R-DAT-001 — ${manifest.name} declara CORE_SAAS_PERSISTENCE=prisma`, () => {
    assert.equal(parseTomlTable(manifest.text, "env").CORE_SAAS_PERSISTENCE, "prisma");
  });

  test(`Ω6R-DIN-006 — ${manifest.name} liga o worker de jobs`, () => {
    assert.equal(parseTomlTable(manifest.text, "env").JOBS_WORKER_ENABLED, "true");
  });

  test(`${manifest.name}: toda chave EXIGIDA em produção aparece no [env] ou no cabeçalho de secrets`, () => {
    const declared = new Set([
      ...Object.keys(parseTomlTable(manifest.text, "env")),
      ...parseDocumentedEnvNames(manifest.text),
    ]);
    const missing = deriveRequiredInProduction().filter((key) => !declared.has(key));
    assert.deepEqual(missing, [], `exigidas em produção e ausentes do manifesto: ${missing.join(", ")}`);
  });

  test(`${manifest.name}: o [env] só carrega VALOR de chave da allowlist (veto secops #2)`, () => {
    const offenders = Object.keys(parseTomlTable(manifest.text, "env")).filter(
      (key) => !MANIFEST_VALUE_ALLOWLIST.has(key),
    );
    assert.deepEqual(offenders, [], `chaves com valor fora da allowlist: ${offenders.join(", ")}`);
  });

  test(`${manifest.name}: segredo/ambiente aparece só como NOME, nunca com valor (veto secops #1)`, () => {
    const flyEnv = parseTomlTable(manifest.text, "env");
    const leaked = deriveRequiredInProduction().filter(
      (key) => !MANIFEST_VALUE_ALLOWLIST.has(key) && key in flyEnv,
    );
    assert.deepEqual(leaked, [], `chaves designadas segredo/ambiente com VALOR versionado: ${leaked.join(", ")}`);
  });

  test(`${manifest.name}: o cabeçalho nomeia os 5 PORTAL_* (incl. PORTAL_TENANT_ID e PORTAL_CORS_ORIGIN)`, () => {
    const documented = parseDocumentedEnvNames(manifest.text);
    for (const key of [
      "PORTAL_SESSION_SECRET",
      "PORTAL_LOG_SECRET",
      "PORTAL_AUTHORITY_SESSION_SECRET",
      "PORTAL_TENANT_ID",
      "PORTAL_CORS_ORIGIN",
    ]) {
      assert.ok(documented.has(key), `${key} não está nomeada no cabeçalho de ${manifest.name}`);
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────────────────────────────────────
// .env.example e Dockerfile
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────

test(".env.example nomeia toda chave EXIGIDA em produção (documentação, não valor de segredo)", () => {
  const declared = parseEnvExampleDeclaredNames(readRepoFile(".env.example"));
  const missing = deriveRequiredInProduction().filter((key) => !declared.has(key));
  assert.deepEqual(missing, [], `exigidas em produção e não documentadas no .env.example: ${missing.join(", ")}`);
});

test("Dockerfile de runtime mantém ENV NODE_ENV=production (é o que arma os gates no contêiner)", () => {
  assert.match(readRepoFile("Dockerfile"), /^ENV NODE_ENV=production$/m);
});
