// J484 C1b — ressalva R2: M13 e M16 do driver do dev, medidas no meu terreno; natureza do vermelho por teste.
import fs from "node:fs"; import crypto from "node:crypto"; import { spawnSync } from "node:child_process";
const root = "C:/Users/thiag/w-j484-c1b";
const prismaRepo = "src/modules/cloud-cost-allocation/cloud-cost-allocation-prisma.repository.ts";
const git = (a) => spawnSync("git", ["-C", root, ...a], { encoding: "utf8" });
const hash = (s) => crypto.createHash("sha256").update(s.replace(/\r\n/g, "\n")).digest("hex");
const tests = ["tests/san3-03-derived-basis-db.test.ts"];
function replace(file, before, after) {
  const p = root + "/" + file, raw = fs.readFileSync(p, "utf8"), eol = raw.includes("\r\n") ? "\r\n" : "\n", t = raw.replace(/\r\n/g, "\n");
  const c = t.split(before).length - 1; console.log("  anchor count=" + c); if (c !== 1) throw new Error("anchor " + c);
  fs.writeFileSync(p, t.replace(before, after).replace(/\n/g, eol));
}
function run(id, mutate) {
  console.log("== " + id);
  try {
    if (mutate) mutate();
    const r = spawnSync(process.execPath, ["--test", "--import", "tsx", ...tests], { cwd: root, encoding: "utf8", timeout: 300000, maxBuffer: 32 << 20, env: process.env });
    const out = (r.stdout || "") + "\n" + (r.stderr || "");
    fs.writeFileSync(`C:/Users/thiag/erp-pausa-2026-10-03/revisoes/j484/c1b-r2-${id}.log`, out);
    const lines = out.split(/\r?\n/);
    console.log("  exit=" + r.status + " | " + lines.filter((l) => /^# (tests|pass|fail|skipped)/.test(l)).join(" "));
    // natureza por bloco not ok
    let cur = null;
    for (const l of lines) {
      if (/^not ok /.test(l)) { cur = l; continue; }
      if (cur && /^\s+(name|code|error):/.test(l)) console.log("  " + cur.slice(0, 70) + " || " + l.trim().slice(0, 140));
      if (/^(ok|not ok) /.test(l) && l !== cur) cur = null;
    }
    console.log("  AssertionError presente=" + /AssertionError|ERR_ASSERTION/.test(out) + " | SyntaxError/TransformError=" + /SyntaxError|TransformError/.test(out));
  } catch (e) { console.log("  NAO_APLICAVEL " + e.message); }
  finally {
    git(["checkout", "HEAD", "--", prismaRepo]);
    console.log("  restored=" + (hash(fs.readFileSync(root + "/" + prismaRepo, "utf8")) === hash(git(["show", "HEAD:" + prismaRepo]).stdout)) + " | status=[" + git(["status", "--porcelain"]).stdout.trim() + "]");
  }
}
run("controle", null);
run("M13", () => replace(prismaRepo, "      const storageWhere = { tenant_id: tenantId, created_at: { lte: periodEnd } };", "      const storageWhere = { created_at: { lte: periodEnd } };"));
run("M16", () => replace(prismaRepo, "        tenant_id: tenantId,\n        created_at: { gte: periodStart, lte: periodEnd },", "        created_at: { gte: periodStart, lte: periodEnd },"));
