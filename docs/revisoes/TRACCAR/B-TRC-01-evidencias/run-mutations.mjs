// Rodada de mutações do B-TRC-01 (plano v2.1 §8.9), no worktree do dev, com restauração por BYTES e conferência de
// sha256 (o ramo tem trabalho não commitado: `git checkout --` apagaria o trabalho; por isso nada de git aqui).
// Uso: node run-mutations.mjs <worktree> [MUT-01,MUT-05,...]
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { MUTATIONS } from "./mutations.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2]);
const ONLY = process.argv[3] ? new Set(process.argv[3].split(",")) : null;
const BASE_DB = "postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/erp_techsolutions?schema=public";
const MUT_DB_NAME = "trc01_mut";
const MUT_DB = `postgresql://postgres:trc01-local-not-a-secret@127.0.0.1:47432/${MUT_DB_NAME}?schema=public`;
const REDIS = "redis://127.0.0.1:56379";
const RESULTS = path.join(HERE, "results.jsonl");
const LOG = path.join(HERE, "progress.log");

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
const log = (line) => appendFileSync(LOG, `${new Date().toISOString()} ${line}\n`);

function run(command, args, env, timeout) {
  const result = spawnSync(command, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  return { status: result.status, signal: result.signal, out: `${result.stdout ?? ""}${result.stderr ?? ""}`, error: result.error?.message };
}

function psqlAdmin(sql) {
  return run("docker", ["exec", "trc01-pg", "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-c", sql], {}, 120_000);
}

for (const mutation of MUTATIONS) {
  if (ONLY && !ONLY.has(mutation.id)) continue;
  const started = Date.now();
  const originals = new Map();
  const record = { id: mutation.id, prop: mutation.prop, tests: mutation.tests, migration: Boolean(mutation.migration) };
  try {
    // 1. aplica (âncora ÚNICA, no EOL do arquivo)
    for (const edit of mutation.edits) {
      const file = path.join(ROOT, edit.file);
      if (!originals.has(file)) {
        const buffer = readFileSync(file);
        originals.set(file, { buffer, hash: sha(buffer) });
      }
      const text = readFileSync(file, "utf8");
      const eol = text.includes("\r\n") ? "\r\n" : "\n";
      const find = edit.find.replace(/\r?\n/g, eol);
      const replace = edit.replace.replace(/\r?\n/g, eol);
      const count = text.split(find).length - 1;
      if (count !== 1) throw new Error(`âncora em ${edit.file} aparece ${count} vez(es)`);
      writeFileSync(file, text.replace(find, replace), "utf8");
    }
    record.applied = mutation.edits.map((edit) => edit.file);
    for (const [file, original] of originals) {
      if (sha(readFileSync(file)) === original.hash) throw new Error(`a mutação não mudou ${path.relative(ROOT, file)}`);
    }

    // 2. banco próprio para mutação de migração
    let dbUrl = BASE_DB;
    if (mutation.migration) {
      psqlAdmin(`DROP DATABASE IF EXISTS ${MUT_DB_NAME} WITH (FORCE)`);
      const created = psqlAdmin(`CREATE DATABASE ${MUT_DB_NAME}`);
      if (created.status !== 0) throw new Error(`CREATE DATABASE falhou: ${created.out.slice(-300)}`);
      const migrated = run(process.execPath, [path.join(ROOT, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], { DATABASE_URL: MUT_DB }, 300_000);
      record.migrateStatus = migrated.status;
      if (migrated.status !== 0) record.migrateTail = migrated.out.split(/\r?\n/).slice(-6).join(" | ");
      dbUrl = MUT_DB;
    }

    // 3. o teste indicado
    const needsDb = mutation.tests.some((file) => file.endsWith("-db.test.ts"));
    const env = { REDIS_URL: REDIS, ...(needsDb ? { DATABASE_URL: dbUrl } : {}) };
    if (!needsDb) env.DATABASE_URL = "";
    const result = run(process.execPath, [path.join(ROOT, "scripts", "run-backend-tests.mjs"), ...mutation.tests], env, 900_000);
    const number = (key) => Number(new RegExp(`^# ${key} (\\d+)`, "m").exec(result.out)?.[1] ?? NaN);
    record.exit = result.status;
    record.signal = result.signal;
    record.tap = { tests: number("tests"), pass: number("pass"), fail: number("fail"), skipped: number("skipped") };
    record.notOk = [...result.out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((match) => match[1].trim()).slice(0, 12);
    record.red = result.status !== 0 || record.tap.fail > 0 || Number.isNaN(record.tap.tests);
    if (!record.red) record.tail = result.out.split(/\r?\n/).filter((line) => /^# (tests|pass|fail)/.test(line)).join(" | ");
  } catch (error) {
    record.error = error.message;
  } finally {
    // 4. restaura os BYTES e confere o sha256
    const restored = [];
    for (const [file, original] of originals) {
      writeFileSync(file, original.buffer);
      const now = sha(readFileSync(file));
      restored.push({ file: path.relative(ROOT, file), sha256: now, ok: now === original.hash });
    }
    record.restored = restored;
    record.restoredOk = restored.every((item) => item.ok);
    if (mutation.migration) psqlAdmin(`DROP DATABASE IF EXISTS ${MUT_DB_NAME} WITH (FORCE)`);
    record.ms = Date.now() - started;
    appendFileSync(RESULTS, `${JSON.stringify(record)}\n`);
    log(`${mutation.id} red=${record.red} restoredOk=${record.restoredOk} ${record.error ? "ERRO " + record.error : ""} (${record.ms} ms)`);
    if (!record.restoredOk) {
      log("RESTAURAÇÃO FALHOU — parando a rodada");
      process.exit(2);
    }
  }
}
log("FIM");
