// Executor das mutações do B-TRC-02 (catálogo em ./mutations.mjs). Uma mutação por vez: aplica com âncora ÚNICA no EOL do
// arquivo, roda `tsc --noEmit` quando a edição toca `.ts` de `src/` ("não compila" = "não mede"), roda os testes indicados,
// restaura os BYTES e confere o sha256 — e PARA a rodada se a restauração falhar. Nada de git aqui.
//
// Uso:  node run-mutations.mjs <raiz> host [IDS]     — as `where: "host"` no worktree (sem banco; Docker do host para a H)
//       node run-mutations.mjs <raiz> db   [IDS]     — as `where: "db"` DENTRO do container Linux do executor (cópia do
//                                                    worktree; DATABASE_URL do container; migração mutada numa base própria)
// Saída: uma linha `MUTRESULT {json}` por mutação no stdout (o executor do container não tem disco persistente) e, no modo
// host, também `results-host.jsonl` ao lado deste arquivo.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ALL } from "./mutations.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(process.argv[2]);
const MODE = process.argv[3];
const ONLY = process.argv[4] ? new Set(process.argv[4].split(",")) : null;
if (MODE !== "host" && MODE !== "db") throw new Error("modo: host | db");

const sha = (buffer) => createHash("sha256").update(buffer).digest("hex");
function run(command, args, env, timeout) {
  const result = spawnSync(command, args, { cwd: ROOT, env: { ...process.env, ...env }, encoding: "utf8", timeout, maxBuffer: 256 * 1024 * 1024 });
  return { status: result.status, signal: result.signal, out: `${result.stdout ?? ""}${result.stderr ?? ""}` };
}

async function adminSql(url, sql) {
  const pg = (await import(path.join(ROOT, "node_modules", "pg", "lib", "index.js"))).default;
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(sql);
  } finally {
    await client.end();
  }
}

const BASE_DB = process.env.DATABASE_URL ?? "";
const mutDbUrl = () => {
  const url = new URL(BASE_DB);
  url.pathname = "/trc02_mut";
  return url.toString();
};

for (const mutation of ALL) {
  if (mutation.where !== MODE) continue;
  if (ONLY && !ONLY.has(mutation.id)) continue;
  const started = Date.now();
  const originals = new Map();
  const record = { id: mutation.id, prop: mutation.prop, tests: mutation.tests, migration: Boolean(mutation.migration), expectGreen: Boolean(mutation.expectGreen) };
  try {
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
      if (count !== 1) throw new Error(`NÃO MEDE: âncora em ${edit.file} aparece ${count} vez(es)`);
      writeFileSync(file, text.split(find).join(replace), "utf8");
    }
    for (const [file, original] of originals) {
      if (sha(readFileSync(file)) === original.hash) throw new Error(`NÃO MEDE: a mutação não mudou ${path.relative(ROOT, file)}`);
    }

    if (mutation.edits.some((edit) => /^src\/.*\.ts$/.test(edit.file))) {
      const tsc = run(process.execPath, [path.join(ROOT, "node_modules", "typescript", "bin", "tsc"), "-p", "tsconfig.json", "--noEmit"], {}, 600_000);
      record.tsc = tsc.status;
      if (tsc.status !== 0) {
        record.tscTail = tsc.out.split(/\r?\n/).filter(Boolean).slice(0, 4).join(" | ");
        throw new Error("NÃO MEDE: a forma mutada não compila");
      }
    }

    let env = {};
    if (MODE === "db") {
      env = { DATABASE_URL: BASE_DB };
      if (mutation.migration) {
        const admin = new URL(BASE_DB);
        admin.pathname = "/postgres";
        await adminSql(admin.toString(), "DROP DATABASE IF EXISTS trc02_mut WITH (FORCE)");
        await adminSql(admin.toString(), "CREATE DATABASE trc02_mut");
        const migrated = run(process.execPath, [path.join(ROOT, "node_modules", "prisma", "build", "index.js"), "migrate", "deploy"], { DATABASE_URL: mutDbUrl() }, 300_000);
        record.migrateStatus = migrated.status;
        if (migrated.status !== 0) record.migrateTail = migrated.out.split(/\r?\n/).filter(Boolean).slice(-4).join(" | ");
        env = { DATABASE_URL: mutDbUrl() };
      }
    } else {
      env = { DATABASE_URL: "" };
    }
    const result = run(process.execPath, ["--test", "--import", "tsx", "--test-reporter=tap", ...mutation.tests], env, 900_000);
    const number = (key) => Number(new RegExp(`^# ${key} (\\d+)`, "m").exec(result.out)?.[1] ?? NaN);
    record.exit = result.status;
    record.tap = { tests: number("tests"), pass: number("pass"), fail: number("fail"), skipped: number("skipped") };
    record.notOk = [...result.out.matchAll(/^\s*not ok \d+ - (.+)$/gm)].map((match) => match[1].trim()).slice(0, 12);
    record.red = result.status !== 0 || record.tap.fail > 0 || Number.isNaN(record.tap.tests);
    record.verdict = mutation.expectGreen ? (record.red ? "INESPERADO (vermelho)" : "verde como esperado") : record.red ? "vermelho" : "VERDE — não morde";
  } catch (error) {
    record.error = error.message;
    record.verdict = error.message.startsWith("NÃO MEDE") ? "não mede" : "erro";
  } finally {
    const restored = [];
    for (const [file, original] of originals) {
      writeFileSync(file, original.buffer);
      const now = sha(readFileSync(file));
      restored.push({ file: path.relative(ROOT, file).split(path.sep).join("/"), ok: now === original.hash });
    }
    record.restoredOk = restored.every((item) => item.ok);
    record.restored = restored;
    if (MODE === "db" && mutation.migration) {
      const admin = new URL(BASE_DB);
      admin.pathname = "/postgres";
      await adminSql(admin.toString(), "DROP DATABASE IF EXISTS trc02_mut WITH (FORCE)").catch(() => undefined);
    }
    record.ms = Date.now() - started;
    console.log(`MUTRESULT ${JSON.stringify(record)}`);
    if (MODE === "host") appendFileSync(path.join(HERE, "results-host.jsonl"), `${JSON.stringify(record)}\n`);
    if (!record.restoredOk) {
      console.log("RESTAURAÇÃO FALHOU — parando a rodada");
      process.exit(2);
    }
  }
}
console.log("MUTFIM");
