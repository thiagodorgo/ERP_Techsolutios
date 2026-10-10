// Mutacoes D1..D9 do T-D (tests/inventory-write-paths-guard.test.ts), uma por guard, executadas e
// revertidas UMA A UMA. Ancora unica com assercao; CRLF da arvore preservado; restauracao pelos BYTES
// originais (ou remocao do arquivo novo); `git status --short` antes = depois de cada uma.
// Integracao 2 (emenda 1 a retomada, D5 item 6): + D1-r1 e D1-r2, que mutam o GUARD (nao src/) e rodam
// D1, D1' e D1'' (padrao ^D1); `expectAll` = todos os vermelhos previstos; md5 do arquivo antes = depois;
// `anchorAfter` = ocorrencias da ancora depois da mutacao (0 = a substituicao aconteceu).
// Uso: node mutations.mjs <worktree> <saida.json> [id,id,...]
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import path from "node:path";

const ROOT = process.argv[2];
const OUT = process.argv[3];
const ONLY = process.argv[4] ? new Set(process.argv[4].split(",")) : undefined;
const P = (f) => path.join(ROOT, f);
const md5 = (f) => (existsSync(P(f)) ? createHash("md5").update(readFileSync(P(f))).digest("hex") : "<ausente>");
const INV = "src/modules/inventory/inventory-prisma.repository.ts";
const SVC = "src/modules/inventory/cycle-count.service.ts";
const CCP = "src/modules/inventory/cycle-count-prisma.repository.ts";
const BACK = "tests/inventory-unique-backstops-db.test.ts";
const GUARD = "tests/inventory-write-paths-guard.test.ts";

const MUTATIONS = [
  { id: "D1", desc: "escritor novo de stock_movements num arquivo novo de src/", newFile: "src/modules/inventory/zz-mutante-d1.ts",
    content: 'import type { PrismaClient } from "@prisma/client";\nexport async function mutanteD1(client: PrismaClient): Promise<void> {\n  await client.stockMovement.create({ data: {} as never });\n}\n',
    expect: /escritor de stock_movements fora da allowlist/ },
  { id: "D2", desc: "segundo lockItemForUpdate em createTransfer (2 locks por transacao)", file: INV,
    anchor: "async createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {\n    const lock = await this.lockItemForUpdate(input.tenantId, input.itemId);\n",
    replace: "async createTransfer(input: CreateTransferInput): Promise<StockTransferResult | undefined> {\n    const lock = await this.lockItemForUpdate(input.tenantId, input.itemId);\n    await this.lockItemForUpdate(input.tenantId, input.itemId);\n",
    expect: /R1 locks por transação = 2/ },
  { id: "D3", desc: "saldoOfLocked(lock: any) — leitura *Locked sem o token", file: INV,
    anchor: "private async saldoOfLocked(lock: ItemWriteLock): Promise<number> {",
    replace: "private async saldoOfLocked(lock: any): Promise<number> {",
    expect: /saldoOfLocked: assinatura sem o token ItemWriteLock/ },
  { id: "D4", desc: "remove o abortClose do catch do close", file: SVC,
    anchor: "await this.repository.abortClose(actor.tenantId, id);",
    replace: "void 0;",
    expect: /close não chama abortClose\(/ },
  { id: "D5", desc: "abortClose sem status no where (deixa de ser CAS)", file: CCP,
    anchor: 'where: { tenant_id: tenantId, id: cycleCountId, status: "fechando" },\n      data: { status: "aberta" },',
    replace: 'where: { tenant_id: tenantId, id: cycleCountId },\n      data: { status: "aberta" },',
    expect: /abortClose: updateMany de cycle_counts sem status no where \(não é CAS\)/ },
  { id: "D6", desc: "catch do wrapper createExitForSource pelo codigo generico", file: INV,
    anchor: "isUniqueViolationOf(error, STOCK_MOVEMENT_UNIQUE_INDEXES.sourceActive)",
    replace: "isUniqueViolation(error)",
    expect: /wrapper createExitForSource: catch sem a identidade do índice/ },
  { id: "D7", desc: "porta publica nova no RlsPrismaInventoryRepository sem this.tx", file: INV,
    anchor: "export class RlsPrismaInventoryRepository implements InventoryRepository {\n  constructor(private readonly prismaClient: PrismaClient) {}\n",
    replace: "export class RlsPrismaInventoryRepository implements InventoryRepository {\n  constructor(private readonly prismaClient: PrismaClient) {}\n\n  mutanteD7(): number {\n    return 1;\n  }\n",
    expect: /RlsPrismaInventoryRepository: porta pública sem this\.tx/ },
  { id: "D8", desc: "copia da classificacao de status (new Set) no repositorio prisma da contagem", file: CCP, append: true,
    replace: '\nexport const MUTANTE_D8 = new Set(["aberta", "fechando"]);\n',
    expect: /cópia da classificação de status fora de cycle-count\.types\.ts/ },
  { id: "D9", desc: "DROP INDEX numa suite -db de base compartilhada", file: BACK, append: true,
    replace: '\nexport const MUTANTE_D9 = "DROP INDEX mutante";\n',
    expect: /inventory-unique-backstops-db\.test\.ts faz DDL na base compartilhada/ },
  // D5, item 6 da emenda 1 a retomada — mutam o GUARD. D1-r1: porta fechada demais (= o estado de HC).
  { id: "D1-r1", desc: "resolvedSqlText nao segue a const (porta fechada demais = o estado de HC)", file: GUARD, pattern: "^D1",
    anchor: "return resolvedSqlText(declaration.initializer, checker, depth + 1);",
    replace: "return undefined;",
    expect: /^not ok \d+ - D1 /m,
    expectAll: [/^not ok \d+ - D1 /m, /<sql dinâmico> src\/database\/runtime-role\.ts:119 /, /<sql dinâmico> src\/database\/runtime-role\.ts:122 /,
      /^not ok \d+ - D1′ /m, /\[D1′\][^\n]*flagradas:[^\n]*zz-fixture-d1-ctl-const-catalogo\.ts/, /\[D1′\][^\n]*flagradas:[^\n]*zz-fixture-d1-ctl-const-template-catalogo\.ts/,
      /\[D1′\][^\n]*flagradas:[^\n]*zz-fixture-d1-ctl-const-select-stock\.ts/, /leitura flagrada por engano \(falso positivo\): ctl-const-/,
      /^not ok \d+ - D1″ /m, /\[D1″\][^\n]*flagradas:[^\n]*zz-fixture-d1-import-catalogo\.ts/] },
  // D1-r2: porta aberta demais — `let` deixa de ser negado.
  { id: "D1-r2", desc: "resolvedSqlText aceita let/var (porta aberta demais)", file: GUARD, pattern: "^D1",
    anchor: "if (!(ts.getCombinedNodeFlags(declaration) & ts.NodeFlags.Const)) return undefined;",
    replace: "/* mutante D1-r2 */",
    expect: /forma NÃO flagrada \(escritor passaria\): let-reatribuido/,
    expectAll: [/^not ok \d+ - D1′ /m, /forma NÃO flagrada \(escritor passaria\): let-reatribuido/] },
];

const git = (args) => spawnSync("git", ["-C", ROOT, ...args], { encoding: "utf8" }).stdout;
const results = [];
for (const m of MUTATIONS) {
  if (ONLY && !ONLY.has(m.id)) continue;
  const statusBefore = git(["status", "--short"]);
  const target = m.file ?? m.newFile;
  const md5Before = md5(target);
  let original = null;
  let applied = false;
  let anchorAfter;
  try {
    if (m.newFile) {
      if (existsSync(P(m.newFile))) throw new Error(`${m.newFile} ja existe`);
      writeFileSync(P(m.newFile), m.content);
      applied = existsSync(P(m.newFile));
    } else {
      original = readFileSync(P(m.file));
      const text = original.toString("utf8");
      const crlf = text.includes("\r\n");
      const lf = text.replace(/\r\n/g, "\n");
      let mutated;
      if (m.append) {
        mutated = lf + m.replace;
      } else {
        const count = lf.split(m.anchor).length - 1;
        if (count !== 1) throw new Error(`ancora de ${m.id} ocorre ${count}x (precisa 1)`);
        mutated = lf.replace(m.anchor, m.replace);
      }
      writeFileSync(P(m.file), crlf ? mutated.replace(/\n/g, "\r\n") : mutated);
      // Prova de que a substituicao ACONTECEU (licao: ancora em CRLF que nao substitui nada fica verde por engano).
      const after = readFileSync(P(m.file)).toString("utf8").replace(/\r\n/g, "\n");
      applied = after.includes(m.replace.trim());
      if (!m.append) {
        anchorAfter = after.split(m.anchor).length - 1;
        if (!m.replace.includes(m.anchor) && anchorAfter !== 0) applied = false;
      }
      if (!applied) throw new Error(`mutacao ${m.id} nao aplicou`);
    }
    const t0 = Date.now();
    const run = spawnSync(process.execPath, ["--test", "--import", "tsx", `--test-name-pattern=${m.pattern ?? `^${m.id} `}`, "tests/inventory-write-paths-guard.test.ts"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    const out = (run.stdout ?? "") + (run.stderr ?? "");
    const pick = (re) => (out.match(re) ?? [])[1];
    const all = m.expectAll ? m.expectAll.map((re) => ({ re: String(re), found: re.test(out) })) : undefined;
    const red = m.expect.test(out) && (all ? all.every((x) => x.found) : true);
    results.push({ id: m.id, desc: m.desc, applied, anchorAfter, exit: run.status, ms: Date.now() - t0,
      tests: pick(/# tests (\d+)/), pass: pick(/# pass (\d+)/), fail: pick(/# fail (\d+)/),
      expectedMessageFound: red, expectAll: all,
      tap: out.split("\n").filter((l) => /^(not )?ok \d+ - /.test(l)).map((l) => l.slice(0, 120)),
      line: (out.split("\n").find((l) => m.expect.test(l)) ?? "").trim().slice(0, 220) });
  } catch (error) {
    results.push({ id: m.id, desc: m.desc, applied, error: String(error) });
  } finally {
    if (m.newFile) { if (existsSync(P(m.newFile))) unlinkSync(P(m.newFile)); }
    else if (original) writeFileSync(P(m.file), original);
    const statusAfter = git(["status", "--short"]);
    results[results.length - 1].statusIgual = statusAfter === statusBefore;
    results[results.length - 1].md5Before = md5Before;
    results[results.length - 1].md5After = md5(target);
    results[results.length - 1].md5Igual = md5Before === results[results.length - 1].md5After;
  }
  console.log(JSON.stringify(results[results.length - 1]));
}
writeFileSync(OUT, JSON.stringify(results, null, 2));
