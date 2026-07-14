import assert from "node:assert/strict";
import test from "node:test";

import {
  buildBackupKey,
  parseBackupTimestamp,
  selectExpiredKeys,
  buildS3Config,
  parsePgEnvFromUrl,
} from "../scripts/backup-database.mjs";

// Ω-INFRA-4 — helpers PUROS do backup. Fecha os merge-gates dba/critico/secops: nome do artefato
// (.dump, casado com o restore-drill), retenção SEGURA (piso keepMinimum + prefixo + protectKey), sem
// senha em argv (PG* env), config S3 espelhando o checklist.

const D = (iso: string) => new Date(iso);

test("buildBackupKey: <prefix>/<stamp>-<token>-erp.dump, ordenável cronologicamente", () => {
  const k1 = buildBackupKey("db-backups", D("2026-07-14T06:30:00.123Z"), "aaaaaaaa");
  const k2 = buildBackupKey("db-backups", D("2026-07-15T06:30:00.000Z"), "bbbbbbbb");
  assert.ok(k1.endsWith("-erp.dump"));
  assert.ok(k1.startsWith("db-backups/"));
  assert.ok(k1 < k2, "sort lexicográfico = ordem cronológica");
});

test("buildBackupKey: default 'db-backups' quando prefix vazio", () => {
  const k = buildBackupKey("", D("2026-07-14T06:30:00.000Z"), "cccccccc");
  assert.ok(k.startsWith("db-backups/"));
});

test("parseBackupTimestamp: round-trip do timestamp gerado", () => {
  const date = D("2026-07-14T06:30:00.123Z");
  const key = buildBackupKey("db-backups", date, "deadbeef");
  const parsed = parseBackupTimestamp(key);
  assert.ok(parsed instanceof Date);
  assert.equal(parsed!.getTime(), date.getTime());
});

test("parseBackupTimestamp: null p/ chave fora do formato (nunca apagar objeto alheio)", () => {
  assert.equal(parseBackupTimestamp("db-backups/qualquer-coisa.txt"), null);
  assert.equal(parseBackupTimestamp("db-backups/config.json"), null);
  // Nome bem-formado é reconhecido pelo filename (o prefixo alheio é filtrado no selectExpiredKeys, não aqui):
  assert.notEqual(parseBackupTimestamp("outra-pasta/2026-07-14T06-30-00-123Z-deadbeef-erp.dump"), null);
});

test("selectExpiredKeys: expira mais velhas que 30d, preserva recentes", () => {
  const now = D("2026-08-15T00:00:00.000Z");
  const keys = [
    buildBackupKey("db-backups", D("2026-06-01T06:00:00.000Z"), "00000001"), // ~75d → expira
    buildBackupKey("db-backups", D("2026-07-01T06:00:00.000Z"), "00000002"), // ~45d → expira
    buildBackupKey("db-backups", D("2026-08-10T06:00:00.000Z"), "00000003"), // ~5d → mantém
    buildBackupKey("db-backups", D("2026-08-14T06:00:00.000Z"), "00000004"), // ~1d → mantém
  ];
  const expired = selectExpiredKeys(keys, now, 30, { prefix: "db-backups", keepMinimum: 0 });
  assert.equal(expired.length, 2);
  assert.ok(expired.every((k) => k.includes("00000001") || k.includes("00000002")));
});

test("selectExpiredKeys: guarda keepMinimum nunca apaga os N mais recentes", () => {
  const now = D("2026-12-01T00:00:00.000Z"); // tudo > 30d
  const keys = [
    buildBackupKey("db-backups", D("2026-06-01T06:00:00.000Z"), "00000001"),
    buildBackupKey("db-backups", D("2026-06-02T06:00:00.000Z"), "00000002"),
    buildBackupKey("db-backups", D("2026-06-03T06:00:00.000Z"), "00000003"),
    buildBackupKey("db-backups", D("2026-06-04T06:00:00.000Z"), "00000004"),
  ];
  const expired = selectExpiredKeys(keys, now, 30, { prefix: "db-backups", keepMinimum: 3 });
  // 4 válidas, keepMinimum=3 → só a mais antiga pode expirar (as 3 mais recentes protegidas)
  assert.equal(expired.length, 1);
  assert.ok(expired[0].includes("00000001"));
});

test("selectExpiredKeys: <= keepMinimum válidas → não apaga nada (anti-destruição)", () => {
  const now = D("2026-12-01T00:00:00.000Z");
  const keys = [
    buildBackupKey("db-backups", D("2026-06-01T06:00:00.000Z"), "00000001"),
    buildBackupKey("db-backups", D("2026-06-02T06:00:00.000Z"), "00000002"),
  ];
  assert.deepEqual(selectExpiredKeys(keys, now, 30, { prefix: "db-backups", keepMinimum: 3 }), []);
});

test("selectExpiredKeys: lista vazia → []", () => {
  assert.deepEqual(selectExpiredKeys([], new Date(), 30, { prefix: "db-backups" }), []);
});

test("selectExpiredKeys: ignora prefixo/formato alheio (não apaga o que não é backup)", () => {
  const now = D("2026-12-01T00:00:00.000Z");
  const keys = [
    "outra-pasta/2026-06-01T06-00-00-000Z-00000001-erp.dump", // prefixo alheio
    "db-backups/config.json", // formato alheio
    buildBackupKey("db-backups", D("2026-06-01T06:00:00.000Z"), "00000009"),
    buildBackupKey("db-backups", D("2026-06-02T06:00:00.000Z"), "0000000a"),
    buildBackupKey("db-backups", D("2026-06-03T06:00:00.000Z"), "0000000b"),
    buildBackupKey("db-backups", D("2026-06-04T06:00:00.000Z"), "0000000c"),
  ];
  const expired = selectExpiredKeys(keys, now, 30, { prefix: "db-backups", keepMinimum: 0 });
  assert.ok(expired.every((k) => k.startsWith("db-backups/") && k.endsWith("-erp.dump")));
  assert.ok(!expired.some((k) => k.startsWith("outra-pasta/") || k.endsWith(".json")));
});

test("selectExpiredKeys: protectKey (recém-enviada) nunca é apagada", () => {
  const now = D("2026-12-01T00:00:00.000Z");
  const fresh = buildBackupKey("db-backups", D("2026-06-01T06:00:00.000Z"), "00000001");
  const keys = [
    fresh,
    buildBackupKey("db-backups", D("2026-06-02T06:00:00.000Z"), "00000002"),
    buildBackupKey("db-backups", D("2026-06-03T06:00:00.000Z"), "00000003"),
    buildBackupKey("db-backups", D("2026-06-04T06:00:00.000Z"), "00000004"),
  ];
  const expired = selectExpiredKeys(keys, now, 30, { prefix: "db-backups", keepMinimum: 0, protectKey: fresh });
  assert.ok(!expired.includes(fresh));
});

test("buildS3Config: OMITE credentials sem keys (cadeia padrão do SDK)", () => {
  const cfg = buildS3Config({ BACKUP_S3_REGION: "sa-east-1" });
  assert.equal(cfg.credentials, undefined);
  assert.equal(cfg.region, "sa-east-1");
});

test("buildS3Config: define credentials quando ambas presentes; endpoint '' → undefined; forcePathStyle da env", () => {
  const cfg = buildS3Config({
    BACKUP_S3_REGION: "us-east-1",
    BACKUP_S3_ENDPOINT: "",
    BACKUP_S3_FORCE_PATH_STYLE: "true",
    AWS_ACCESS_KEY_ID: "AKIA",
    AWS_SECRET_ACCESS_KEY: "secret",
  });
  assert.equal(cfg.endpoint, undefined);
  assert.equal(cfg.forcePathStyle, true);
  assert.deepEqual(cfg.credentials, { accessKeyId: "AKIA", secretAccessKey: "secret" });
});

test("parsePgEnvFromUrl: mapeia PG* sem senha em argv; sslmode preservado", () => {
  const env = parsePgEnvFromUrl("postgresql://usr:p%40ss@db.example.com:6543/erp?sslmode=require");
  assert.equal(env.PGHOST, "db.example.com");
  assert.equal(env.PGPORT, "6543");
  assert.equal(env.PGUSER, "usr");
  assert.equal(env.PGPASSWORD, "p@ss"); // decodifica %40
  assert.equal(env.PGDATABASE, "erp");
  assert.equal(env.PGSSLMODE, "require");
});

test("parsePgEnvFromUrl: sem senha → sem PGPASSWORD", () => {
  const env = parsePgEnvFromUrl("postgresql://usr@localhost:5432/erp");
  assert.equal("PGPASSWORD" in env, false);
});
