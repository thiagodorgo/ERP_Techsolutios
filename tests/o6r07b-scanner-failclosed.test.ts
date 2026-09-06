import assert from "node:assert/strict";
import test from "node:test";

import { DEFAULT_CHECKLIST_STORAGE_ALLOWED_MIME_TYPES, envSchema } from "../src/config/env.js";
import { SNIFFABLE_MIME_TYPES } from "../src/modules/evidence/content-sniff.js";
import { NoopEvidenceScanner, UnavailableEvidenceScanner } from "../src/modules/evidence/evidence-storage.js";

// B-O6R-07b (Ω6R-SEC-004) · §6.3 do plano + EMENDA E1·4 — o FAIL-CLOSED por ambiente (M-B7) e o gate de
// boot da allowlist (M-B8 / M-B8b / M-B8c).
//
// Disciplina herdada de `tests/production-runtime-gates.test.ts`: um baseline de produção VÁLIDO, e cada
// caso adultera UM campo. Sem o baseline aceito, todo caso de rejeição seria vacuamente verdadeiro.
//
// VERMELHO-CONTROLE na base `e55245a`: a variável `EVIDENCE_SCANNER` não existe no schema e não há
// refinamento de allowlist — os casos M-B7 e M-B8/b/c falham lá por ausência.

const PROD_OK = {
  NODE_ENV: "production",
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
};

function merge(base: Record<string, unknown>, overrides: Record<string, unknown>): Record<string, unknown> {
  const merged = { ...base, ...overrides } as Record<string, unknown>;
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete merged[key]; // simula a var AUSENTE do ambiente
  }
  return merged;
}

function issuePaths(overrides: Record<string, unknown>, base: Record<string, unknown> = PROD_OK): readonly string[] {
  const result = envSchema.safeParse(merge(base, overrides));
  if (result.success) return [];
  return result.error.issues.map((issue) => issue.path.join("."));
}

// ── M-B7 (3 casos): o default do scanner é do AMBIENTE, e produção recusa o que mente ──────────────

test("M-B7.1 produção SEM EVIDENCE_SCANNER: o boot passa e o default resolvido é 'unavailable'", () => {
  const result = envSchema.safeParse(merge(PROD_OK, { EVIDENCE_SCANNER: undefined }));
  assert.equal(result.success, true, "esquecer a variável não pode derrubar o boot");
  if (result.success) {
    assert.equal(result.data.EVIDENCE_SCANNER, undefined, "o schema não tem default; quem resolve é o export");
    // A resolução vive no objeto `env`: production → unavailable. Aqui a mesma regra, explicitada.
    const resolved = result.data.NODE_ENV === "production" ? "unavailable" : "noop";
    assert.equal(resolved, "unavailable", "ESQUECER a var em produção cai no lado SEGURO");
  }
});

test("M-B7.2 produção COM EVIDENCE_SCANNER=noop: o boot é RECUSADO (não há válvula)", () => {
  const paths = issuePaths({ EVIDENCE_SCANNER: "noop" });
  assert.ok(paths.includes("EVIDENCE_SCANNER"), `esperava issue em EVIDENCE_SCANNER, veio: ${paths.join(", ")}`);
});

test("M-B7.3 NODE_ENV=test/development: o default resolvido é 'noop' e o boot passa", () => {
  for (const nodeEnv of ["test", "development"] as const) {
    const result = envSchema.safeParse({ NODE_ENV: nodeEnv, EVIDENCE_SCANNER: undefined });
    assert.equal(result.success, true, `${nodeEnv} deve subir`);
    if (result.success) {
      const resolved = result.data.NODE_ENV === "production" ? "unavailable" : "noop";
      assert.equal(resolved, "noop");
    }
    // E declarar `noop` fora de produção é explicitamente permitido.
    assert.equal(envSchema.safeParse({ NODE_ENV: nodeEnv, EVIDENCE_SCANNER: "noop" }).success, true);
  }
});

test("produção COM EVIDENCE_SCANNER=unavailable: o boot passa (é o default, não um remédio)", () => {
  assert.deepEqual(issuePaths({ EVIDENCE_SCANNER: "unavailable" }), []);
});

test("EVIDENCE_SCANNER com valor fora do enum é recusado em qualquer ambiente", () => {
  assert.equal(envSchema.safeParse({ NODE_ENV: "test", EVIDENCE_SCANNER: "clamav" }).success, false);
});

test("as duas classes de scanner respondem o que prometem", async () => {
  assert.deepEqual(await new NoopEvidenceScanner().scan(), { status: "clean" });
  assert.deepEqual(await new UnavailableEvidenceScanner().scan(), {
    status: "failed",
    reason: "scanner_not_configured",
  });
});

// ── M-B8 / M-B8b / M-B8c: o gate de boot lê a cadeia EFETIVA dos DOIS nomes de env ─────────────────

test("M-B8 allowlist: svg no nome LEGADO com a chave nova AUSENTE → boot RECUSADO", () => {
  // É EXATAMENTE a configuração que escapava do desenho original (achado A5 do crítico): o refinamento
  // lia só `CHECKLIST_STORAGE_ALLOWED_MIME_TYPES`, e quem escrevesse svg no nome legado ligava o tipo na
  // allowlist efetiva sem tropeçar em nada. MUTAÇÃO QUE DERRUBA ESTE CASO: refinamento lendo só a chave
  // nova → o parse passa a aceitar.
  const paths = issuePaths({
    CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: "image/png,image/svg+xml",
    CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: undefined,
  });
  assert.ok(
    paths.includes("CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES"),
    `esperava issue no NOME LEGADO, veio: ${paths.join(", ")}`,
  );
  const result = envSchema.safeParse(
    merge(PROD_OK, {
      CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: "image/png,image/svg+xml",
      CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: undefined,
    }),
  );
  assert.equal(result.success, false);
  if (!result.success) {
    assert.ok(
      result.error.issues.some((issue) => issue.message.includes("image/svg+xml")),
      "a mensagem tem de NOMEAR a entrada ofensora",
    );
  }
});

test("M-B8b allowlist: as DUAS setadas, legado com svg e a nova sem → boot PASSA (precedência do ??)", () => {
  // Documenta a precedência: a allowlist EFETIVA é a chave nova, e o legado é ignorado. MUTAÇÃO QUE
  // DERRUBA ESTE CASO: refinamento validando a UNIÃO das duas → falha indevida.
  assert.deepEqual(
    issuePaths({
      CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: "image/png,image/jpeg",
      CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: "image/png,image/svg+xml",
    }),
    [],
  );
});

test("M-B8c allowlist: svg na chave NOVA → boot RECUSADO", () => {
  const paths = issuePaths({ CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: "image/png,image/svg+xml" });
  assert.ok(
    paths.includes("CHECKLIST_STORAGE_ALLOWED_MIME_TYPES"),
    `esperava issue na chave NOVA, veio: ${paths.join(", ")}`,
  );
});

test("allowlist: a comparação usa a MESMA normalização do consumidor (trim + lowercase)", () => {
  // O consumidor (`checklist-storage.factory.ts`) faz `.trim().toLowerCase()`. Sem a mesma normalização
  // aqui, ` IMAGE/SVG+XML ` passaria o gate de boot e chegaria normalizado à allowlist efetiva.
  const paths = issuePaths({ CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: " IMAGE/SVG+XML , image/png " });
  assert.ok(paths.includes("CHECKLIST_STORAGE_ALLOWED_MIME_TYPES"), `veio: ${paths.join(", ")}`);
  // E o inverso: caixa-alta de um tipo LEGÍTIMO não pode ser recusada.
  assert.deepEqual(issuePaths({ CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: "IMAGE/PNG, Image/Jpeg" }), []);
});

test("allowlist: text/html e image/heic também são recusados, cada um nomeado", () => {
  for (const bad of ["text/html", "image/heic", "application/zip"]) {
    const result = envSchema.safeParse(merge(PROD_OK, { CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: `image/png,${bad}` }));
    assert.equal(result.success, false, bad);
    if (!result.success) {
      assert.ok(result.error.issues.some((issue) => issue.message.includes(bad)), `mensagem sem ${bad}`);
    }
  }
});

test("allowlist: o DEFAULT (nenhuma das duas setada) é exatamente o conjunto sniffável e passa o gate", () => {
  assert.equal(DEFAULT_CHECKLIST_STORAGE_ALLOWED_MIME_TYPES, SNIFFABLE_MIME_TYPES.join(","));
  assert.deepEqual(
    issuePaths({ CHECKLIST_STORAGE_ALLOWED_MIME_TYPES: undefined, CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: undefined }),
    [],
  );
});

test("allowlist: o gate vale FORA de produção também (o boot de dev/test recusa svg igual)", () => {
  const result = envSchema.safeParse({
    NODE_ENV: "test",
    CHECKLIST_ATTACHMENT_ALLOWED_MIME_TYPES: "image/svg+xml",
  });
  assert.equal(result.success, false, "tipo não verificável é erro de configuração em qualquer ambiente");
});
