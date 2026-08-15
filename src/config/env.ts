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

/**
 * G5 (Ω6R-DAT-001) — NOMES que, em PRODUÇÃO, significam "a fila de jobs vive dentro deste
 * contêiner/máquina". Todos causam o mesmo dano: fila por instância, não compartilhada, e o que
 * estiver enfileirado morre no restart.
 *
 * Esta lista cobre a metade do problema que é NOME, e só ela: `localhost`, o loopback IPv6 `::1`,
 * o não-especificado IPv6 `::` (gêmeo do `0.0.0.0` — como destino de conexão cai no loopback) e os
 * nomes que o Docker Desktop resolve para a máquina do desenvolvedor (no compose local isso aponta
 * a fila de "produção" para o laptop de quem subiu). `127.0.0.1` e `0.0.0.0` ficam aqui por serem o
 * par original do gate, embora hoje sejam redundantes: a decisão por ENDEREÇO abaixo já os recusa.
 *
 * A comparação acontece DEPOIS da normalização (`normalizeHostname`), então `LOCALHOST.` e
 * `localhost.` — mesmo destino, com o ponto da raiz do FQDN — caem aqui também.
 *
 * O que NÃO entra: nome de serviço (`redis://redis:6379`) e host interno — é assim que se declara um
 * Redis compartilhado, e recusá-lo transformaria o gate num impedimento a deploy legítimo.
 */
const PRODUCTION_FORBIDDEN_REDIS_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "::",
  "host.docker.internal",
  "gateway.docker.internal",
]);

/** Rótulo com FORMA numérica aceita pelo `inet_aton`: decimal, octal (`0` à frente) ou hex (`0x`). */
const IPV4_NUMERIC_LABEL = /^(?:0x[0-9a-f]+|[0-9]+)$/i;

type IPv4Parse =
  /** Rótulos numéricos que FORMAM endereço: `value` são os 32 bits. */
  | { kind: "address"; value: number }
  /** Rótulos TODOS numéricos que NÃO formam endereço (`127.0.0.256`, `1.2.3.4.5`, `127.09`). */
  | { kind: "malformed" }
  /** Tem rótulo não-numérico: é NOME (`redis`, `127-cache.interno.exemplo.com`), não literal IPv4. */
  | { kind: "not-numeric" };

/** Um rótulo numérico → seu valor, ou `null` quando a forma é inválida (ex.: octal com 8/9). */
function parseIPv4Label(label: string): number | null {
  let value: number;
  if (/^0x[0-9a-f]+$/i.test(label)) value = Number.parseInt(label.slice(2), 16);
  else if (/^0[0-9]+$/.test(label)) {
    if (!/^0[0-7]+$/.test(label)) return null; // `09` não é octal — o inet_aton também recusa
    value = Number.parseInt(label.slice(1), 8);
  } else if (/^[0-9]+$/.test(label)) value = Number.parseInt(label, 10);
  else return null;

  return Number.isSafeInteger(value) && value >= 0 && value <= 0xffffffff ? value : null;
}

/**
 * Literal IPv4 nas QUATRO formas legais do `inet_aton` — `a`, `a.b`, `a.b.c`, `a.b.c.d` — com cada
 * parte em decimal, octal ou hexadecimal. Decidir por LITERAL DE QUATRO OCTETOS (o que o gate fazia)
 * deixava passar `127.1`, `127.0.1`, `2130706433`, `0177.0.0.1` e `0x7f000001`: todas notações que o
 * resolvedor do sistema traduz para 127.0.0.1. Aqui elas viram o mesmo inteiro de 32 bits e são
 * decididas por ENDEREÇO, uma vez só.
 */
function parseIPv4(host: string): IPv4Parse {
  const labels = host.split(".");
  if (!labels.every((label) => IPV4_NUMERIC_LABEL.test(label))) return { kind: "not-numeric" };
  if (labels.length > 4) return { kind: "malformed" };

  const values: number[] = [];
  for (const label of labels) {
    const value = parseIPv4Label(label);
    if (value === null) return { kind: "malformed" };
    values.push(value);
  }

  // A última parte absorve os octetos que não foram escritos (`127.1` = 127.0.0.1); as anteriores
  // são um octeto cada.
  const leading = values.slice(0, -1);
  const last = values[values.length - 1];
  if (leading.some((value) => value > 255)) return { kind: "malformed" };
  if (last >= 256 ** (4 - leading.length)) return { kind: "malformed" };

  const address = leading.reduce((total, value, index) => total + value * 256 ** (3 - index), last);
  return { kind: "address", value: address >>> 0 };
}

/**
 * IPv4 embutido num IPv6 IPv4-MAPEADO (`::ffff:a.b.c.d`). ATENÇÃO ao que o parser de URL devolve:
 * `new URL("redis://[::ffff:127.0.0.1]:6379").hostname` é `[::ffff:7f00:1]` — a forma COMPRIMIDA,
 * com os 32 bits do IPv4 já convertidos em dois grupos hexadecimais. Por isso a leitura é feita a
 * partir dela, e não da string original.
 *
 * NÃO cobre IPv4 embutido sob OUTROS prefixos — IPv4-translated (`::ffff:0:7f00:1`) e NAT64
 * (`64:ff9b::7f00:1`), ambos medidos ACEITOS. Ficam de fora por decisão consciente: nenhum deles
 * chega a um destino sem um tradutor SIIT/NAT64 na frente, que não é o caso do loopback de um
 * contêiner. Registrado como pendência, não como cobertura.
 */
function parseIPv4MappedIPv6(host: string): number | null {
  const mapped = /^::ffff:(.+)$/i.exec(host);
  if (!mapped) return null;

  const compressed = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(mapped[1]);
  if (compressed) {
    return ((Number.parseInt(compressed[1], 16) << 16) | Number.parseInt(compressed[2], 16)) >>> 0;
  }

  const dotted = parseIPv4(mapped[1]);
  return dotted.kind === "address" ? dotted.value : null;
}

/** 127.0.0.0/8 (o bloco INTEIRO, decidido pelo primeiro octeto) e o não-especificado 0.0.0.0. */
function isLoopbackOrUnspecified(address: number): boolean {
  return address >>> 24 === 127 || address === 0;
}

/**
 * Hostname como o `new URL(...)` o devolve → forma comparável. Três normalizações, cada uma fechando
 * uma fuga MEDIDA: colchetes de IPv6 (`[::1]`), o ponto final da raiz do FQDN (`localhost.` e
 * `127.0.0.1.` são o MESMO destino que sem ele) e escape percentual (`127%2E0%2E0%2E1` — host algum
 * legítimo traz `%`).
 */
function normalizeHostname(hostname: string): string {
  let host = hostname.trim().toLowerCase();
  if (host.includes("%")) {
    try {
      host = decodeURIComponent(host).toLowerCase();
    } catch {
      /* escape inválido: segue com a forma crua, que não casa com nada legítimo */
    }
  }
  return host
    .replace(/^\[/, "")
    .replace(/\]$/, "")
    .replace(/\.+$/, "");
}

/**
 * Hostname que o gate recusa em produção. A decisão é por ENDEREÇO, não por literal escrito:
 *
 * 1. host VAZIO → recusa. É o que fazia o gate falhar ABERTO: sobra quando `new URL(...)` lança (URL
 *    malformada) e também quando a URL é válida mas NÃO TEM HOST — `redis:6379` passa por `.url()` e
 *    foi medido ACEITO. Nunca é destino legítimo; é "não sei para onde isto aponta", e não-sei é recusa.
 * 2. NOME na lista acima (já normalizado) → recusa.
 * 3. IPv6 IPv4-mapeado (`::ffff:…`) → decide pelo IPv4 embutido.
 * 4. host todo formado por rótulos NUMÉRICOS → recusa se o endereço cair em 127.0.0.0/8 ou for
 *    0.0.0.0, em QUALQUER notação do `inet_aton`; e recusa também quando os rótulos são todos
 *    numéricos mas não formam endereço válido (`127.0.0.256`) — nome DNS legítimo não é só dígitos e
 *    pontos, então vale a mesma doutrina do host vazio.
 * 5. qualquer outro NOME → ACEITA. É assim que se declara um Redis compartilhado (`redis://redis:6379`,
 *    `redis://cache.interno.exemplo.com:6379`), inclusive nomes que só PARECEM loopback
 *    (`127-cache.interno.exemplo.com`).
 *
 * O que este predicado NÃO decide, e não afirma decidir: host que só se revela loopback na RESOLUÇÃO
 * (alias de `/etc/hosts` como `localhost.localdomain`, DNS curinga como `127.0.0.1.nip.io`) — exigiria
 * resolver DNS no boot, que este gate não faz; e o IPv4 embutido sob prefixo diferente de `::ffff:`
 * (ver `parseIPv4MappedIPv6`). Ambos ficam como pendência declarada.
 */
function isRedisHostRefusedInProduction(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (host === "") return true;
  if (PRODUCTION_FORBIDDEN_REDIS_HOSTS.has(host)) return true;

  const mapped = parseIPv4MappedIPv6(host);
  if (mapped !== null) return isLoopbackOrUnspecified(mapped);

  const parsed = parseIPv4(host);
  if (parsed.kind === "address") return isLoopbackOrUnspecified(parsed.value);
  return parsed.kind === "malformed";
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.string().default("info"),
  // P-SAN-CORS (Ω-INFRA-3) — allowlist de origens (CSV). Vazio = permissivo (reflete a origem da
  // requisição) em dev/test; em PRODUÇÃO o gate abaixo exige allowlist explícita sem curinga.
  CORS_ORIGIN: z.string().trim().default(""),
  CORE_SAAS_PERSISTENCE: z.enum(["memory", "prisma"]).default("memory"),
  // B-O6R-05 (Ω6R-DAT-001) — a URL do Postgres entra no schema para que o gate de produção possa EXIGIR SUA
  // PRESENÇA. Antes ela só era lida direto de `process.env` em `src/database/prisma.ts`, então o boot em
  // produção aceitava CORE_SAAS_PERSISTENCE=prisma com a URL vazia e só quebrava no primeiro acesso ao banco.
  //
  // O QUE ESTE CAMPO **NÃO** FAZ, dito porque a junta do PR pediu (ressalva do `agente-dba-guardiao`): ele
  // valida apenas **presença não-vazia** — não a forma da URL nem o host. Em produção, `DATABASE_URL=x` ou uma
  // URL apontando para o loopback do contêiner PASSAM no boot. É assimetria consciente com o `REDIS_URL`
  // vizinho, que recebe forma **e** endereço: o P0 aqui era a perda SILENCIOSA de identidade, e essa fecha com
  // presença (o G1 impede memória, o gate abaixo impede vazio); URL malformada quebra alto no primeiro acesso,
  // que é ruído, não perda de dado. Fechar a assimetria é `P-O6R-B05-DATABASE-URL-SEM-FORMA-NEM-HOST`.
  //
  // Default "" (e não `.optional()`) porque dev/test em modo memory legitimamente não têm banco.
  // `src/database/prisma.ts` segue lendo `process.env` — nenhum consumidor muda.
  DATABASE_URL: z.string().trim().default(""),
  // Ω4C PR-04 (D-Ω4C-NOTIF-SCHEDULER) — liga o worker in-process (job.worker.ts). Default DESLIGADO: com false o
  // loop de jobs NÃO sobe (CI/testes que importam app.ts nunca disparam o scheduler). Só com true ∧
  // persistence=prisma o server.ts inicia o worker + enfileira o 1º `notifications.scan-due`. Usa booleanFlag
  // (parse ESTRITO: só true/1/yes/on → verdadeiro; "false" continua false, sem o footgun do z.coerce.boolean).
  JOBS_WORKER_ENABLED: booleanFlag(false),
  // B-O6R-05 (Ω6R-DAT-001) — o default `redis://localhost:6379` NO SCHEMA tornava indistinguíveis "o operador
  // escolheu localhost" e "ninguém declarou nada": produção que omitisse REDIS_URL parseava e apontava a fila
  // (e o heartbeat do worker) para o próprio contêiner. Agora o campo é `.optional()` e o default de dev vive
  // no EXPORT — espelho exato do padrão do JWT_SECRET (optional no schema, `??` no export). O tipo exportado
  // continua `string`, então `src/infra/redis/redis.client.ts` fica intocado.
  REDIS_URL: z.string().trim().url().optional(),
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

  // ── B-O6R-05 — gates de RUNTIME de produção (Ω6R-DAT-001 + Ω6R-DIN-006) ─────────────────────────────────
  // Até aqui os treze gates acima cuidavam de SEGREDO e de CORS. Faltava o que o processo FAZ com os dados:
  // produção podia subir com o agregado core-saas em memória (perdendo organizações, usuários, vínculos e a
  // auditoria a cada restart) e sem o worker de jobs (nunca materializando diária de pátio, reconciliação de
  // custódia e notificação legal). Os quatro gates abaixo fecham isso ANTES do listen, na mesma forma
  // fail-closed dos anteriores: em produção o boot falha com mensagem, em vez de degradar em silêncio.

  // G1 (Ω6R-DAT-001) — o agregado core-saas em memória some no restart. Em produção só o caminho prisma vale.
  if (value.NODE_ENV === "production" && value.CORE_SAAS_PERSISTENCE !== "prisma") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["CORE_SAAS_PERSISTENCE"],
      message:
        "Ω6R-DAT-001: CORE_SAAS_PERSISTENCE deve ser \"prisma\" em produção. Com \"memory\" o agregado core-saas (organizações, usuários, papéis/vínculos e a auditoria desse agregado) vive só na RAM do processo e é perdido a cada restart.",
    });
  }

  // G2 (Ω6R-DAT-001) — persistência declarada sem banco declarado é a mesma perda, adiada para o 1º acesso.
  if (value.NODE_ENV === "production" && !value.DATABASE_URL) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["DATABASE_URL"],
      message:
        "Ω6R-DAT-001: DATABASE_URL é obrigatória em produção (sem ela o caminho prisma não tem onde persistir).",
    });
  }

  // G3 (Ω6R-DIN-006) — INCONDICIONAL em produção. Hoje o worker é in-process (não existe entrypoint dedicado
  // além de src/server.ts), então "worker externo" não seria verificável no boot: seria satisfeito só no nome.
  // A topologia com processo próprio, e a flag que a torne verificável, são aceite do B-O6R-08.
  if (value.NODE_ENV === "production" && value.JOBS_WORKER_ENABLED !== true) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["JOBS_WORKER_ENABLED"],
      message:
        "Ω6R-DIN-006: JOBS_WORKER_ENABLED deve ser true em produção. Sem o worker in-process nenhum job é materializado — diária de pátio, reconciliação de custódia e notificação legal simplesmente não acontecem.",
    });
  }

  // G5 (Ω6R-DAT-001) — a fila de jobs (e o sinal de vida do worker) vivem no Redis. Apontar para o loopback
  // em produção significa uma fila por contêiner, isolada e volátil: os jobs enfileirados morrem no restart.
  const redisHost = (() => {
    if (!value.REDIS_URL) return "";
    try {
      return new URL(value.REDIS_URL).hostname.toLowerCase();
    } catch {
      return "";
    }
  })();
  if (value.NODE_ENV === "production" && (!value.REDIS_URL || isRedisHostRefusedInProduction(redisHost))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["REDIS_URL"],
      message:
        "Ω6R-DAT-001: REDIS_URL é obrigatória em produção, precisa declarar um host e não pode apontar para um host local — a fila de jobs ficaria isolada dentro do contêiner e o que estivesse enfileirado se perderia no restart. A recusa é por ENDEREÇO (qualquer notação do inet_aton que caia em 127.0.0.0/8 ou em 0.0.0.0 — inclusive as formas curtas 127.1/127.0.1, o inteiro 2130706433 e as formas octal/hex — mais o IPv4-mapeado ::ffff:) e por NOME conhecido (localhost, ::1, ::, host.docker.internal, gateway.docker.internal). Nome que só se revela local na resolução de DNS não é verificado aqui.",
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
  // B-O6R-05 — default de DEV do Redis (em produção o gate G5 exige a URL declarada e fora do loopback).
  // Mesma mecânica dos secrets: optional no schema, `??` aqui. O tipo exportado continua `string`.
  REDIS_URL: parsedEnv.REDIS_URL ?? "redis://localhost:6379",
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

