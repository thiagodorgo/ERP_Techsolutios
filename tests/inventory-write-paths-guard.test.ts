import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import test from "node:test";

// -----------------------------------------------------------------------------------------------
// B-O6R-04a (Ω6R-DAT-002 / DAT-003 / P-020) — T-D: GUARDS DE ENUMERAÇÃO FAIL-CLOSED (CE-G1), em memória.
//
// Cada guard enumera o seu universo PELO FONTE, gerado do código real (nunca lista curada), com default
// NEGAR para o membro não previsto:
//   D1  todo ESCRITOR de stock_movements (membro de `stockMovement.` fora da allowlist de LEITURA, SQL cru
//       em qualquer grafia) — universo = allowlist literal { insertMovement ×1, semente }.
//   D2  toda via que chega a `insertMovement`/`avg_cost` toma EXATAMENTE UM lock do item, ANTES da primeira
//       leitura que decide e antes de qualquer laço; as versões SEM lock das leituras que decidem não existem.
//   D3  o token `ItemWriteLock` nas assinaturas de `insertMovement` e das leituras `*Locked`.
//   D4  o fechamento só escreve dentro de unidades (`uow.run`), sem `applyClose`, sem `findItemById`, com
//       `abortClose` no `catch` (S-01) e o total vindo do `finishClose` (S-02).
//   D5  toda transição de `cycle_counts.status` é CAS (`status` no `where`).
//   D6  `P2002` tratado FORA da transação (wrappers), nunca dentro das vias que inserem.
//   D7  toda porta pública dos wrappers RLS (e a porta de UoW) mapeia falha transitória para 503.
//   D8  `createSession` serializa pela linha do tenant (`FOR NO KEY UPDATE`) e recusa sobreposição ANTES do
//       `create(` (I9).
//   D9  nenhuma suíte `-db` do bloco faz DDL fora do drill em base própria (T-04).
// A mutação que deixa cada guard vermelho foi executada uma vez pelo dev e está na ata do bloco.
// -----------------------------------------------------------------------------------------------

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");

const INVENTORY_PRISMA = "src/modules/inventory/inventory-prisma.repository.ts";
const CYCLE_COUNT_PRISMA = "src/modules/inventory/cycle-count-prisma.repository.ts";
const CYCLE_COUNT_SERVICE = "src/modules/inventory/cycle-count.service.ts";
const UOW_PRISMA = "src/modules/inventory/inventory-uow-prisma.ts";

function read(relative: string): string {
  return readFileSync(path.join(ROOT, relative), "utf8").replace(/\r\n/g, "\n");
}

function walk(relativeDir: string, extensions: readonly string[]): string[] {
  const out: string[] = [];
  const absolute = path.join(ROOT, relativeDir);
  for (const name of readdirSync(absolute)) {
    if (name === "node_modules" || name === "generated") continue;
    const full = path.join(absolute, name);
    const rel = path.posix.join(relativeDir, name);
    if (statSync(full).isDirectory()) {
      if (rel === "prisma/migrations") continue; // DDL versionada; o censo dela é provado no drill (T-C′)
      out.push(...walk(rel, extensions));
    } else if (extensions.some((extension) => name.endsWith(extension))) {
      out.push(rel);
    }
  }
  return out;
}

/** Remove comentários `//…` e `/*…*\/` fora de string — texto de comentário não conta como código. */
function stripComments(source: string): string {
  let out = "";
  let i = 0;
  let quote: string | null = null;
  while (i < source.length) {
    const ch = source[i]!;
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "/") {
      while (i < source.length && source[i] !== "\n") i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end < 0 ? source.length : end + 2;
      // Preserva as quebras de linha do comentário: o universo publicado cita arquivo:LINHA do fonte real.
      out += source.slice(i, stop).replace(/[^\n]/g, "");
      i = stop;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") quote = ch;
    out += ch;
    i += 1;
  }
  return out;
}

/** Índice do `}` que fecha o `{` em `openIndex` (conta chaves; o fonte já vem sem comentários). */
function matchBrace(source: string, openIndex: number): number {
  let depth = 0;
  for (let i = openIndex; i < source.length; i += 1) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  throw new Error(`chave sem par a partir de ${openIndex}`);
}

function classSource(source: string, className: string): string {
  const header = source.indexOf(`export class ${className} `);
  assert.ok(header >= 0, `classe ${className} não encontrada`);
  const open = source.indexOf("{", source.indexOf(" {\n", header));
  return source.slice(open, matchBrace(source, open) + 1);
}

/**
 * Membros de uma classe (indentação de 2 espaços), do cabeçalho ao próximo cabeçalho. O texto inclui a
 * assinatura; a análise de ORDEM usa a posição a partir do corpo.
 */
function membersOf(classText: string): Map<string, { readonly isPrivate: boolean; readonly text: string }> {
  const header = /^ {2}(private\s+|public\s+)?(?:async\s+)?(\w+)\s*(?:<[^>\n]*>)?\(/gm;
  const found: { name: string; isPrivate: boolean; index: number }[] = [];
  let match: RegExpExecArray | null;
  while ((match = header.exec(classText))) {
    if (match[2] === "constructor") continue;
    found.push({ name: match[2]!, isPrivate: Boolean(match[1]?.startsWith("private")), index: match.index });
  }
  const members = new Map<string, { isPrivate: boolean; text: string }>();
  found.forEach((member, position) => {
    const end = position + 1 < found.length ? found[position + 1]!.index : classText.length;
    members.set(member.name, { isPrivate: member.isPrivate, text: classText.slice(member.index, end) });
  });
  return members;
}

/** Fim da assinatura: o `{` de fim de linha precedido de `)` (com tipo de retorno opcional) — pula tipo-objeto em parâmetro. */
function signatureEnd(memberText: string): number {
  const match = /\)(?:\s*:\s*[^\n]+?)?\s*\{\n/.exec(memberText);
  return match ? match.index + match[0].length - 2 : -1;
}

/** O corpo: a partir do `{` que abre o método. */
function bodyOf(memberText: string): string {
  const open = signatureEnd(memberText);
  return open < 0 ? memberText : memberText.slice(open);
}

const READ_MEMBERS = new Set(["findMany", "findFirst", "findUnique", "findFirstOrThrow", "findUniqueOrThrow", "count", "aggregate", "groupBy"]);
const ORM_MEMBER = /\bstockMovement\.(\w+)\(/g;
const RAW_WRITER = /\b(insert\s+into|update|delete\s+from|truncate(?:\s+table)?|copy|merge\s+into)\s+(?:"?public"?\s*\.\s*)?"?stock_movements"?\b/i;

/** D1 — a linha escreve em stock_movements? Membro fora da allowlist de leitura = escritor (default NEGAR). */
export function isStockMovementWriter(line: string): boolean {
  ORM_MEMBER.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ORM_MEMBER.exec(line))) {
    if (!READ_MEMBERS.has(match[1]!)) return true;
  }
  return RAW_WRITER.test(line);
}

const DECISION = /\b(saldoOf\w*|hasReversalOf\w*|isExitReversed\w*|movementsInGroup\w*|aggregate|wouldOverdraw|computeMovingAverage|avg_cost)\b|\baggregate\(/;
const LOOP = /\bfor \(|\bwhile \(|\.map\(|\.forEach\(/;

test("D1 — todo escritor de stock_movements (ORM fora da allowlist de leitura + SQL cru em qualquer grafia) está na allowlist", () => {
  const files = [
    ...walk("src", [".ts"]),
    ...walk("prisma", [".ts"]),
    ...walk("scripts", [".ts", ".mts", ".mjs", ".cjs", ".sql"]),
  ];
  const writers: string[] = [];
  for (const file of files) {
    const lines = stripComments(read(file)).split("\n");
    lines.forEach((line, index) => {
      if (isStockMovementWriter(line)) writers.push(`${file}:${index + 1}: ${line.trim()}`);
    });
  }

  const inRepository = writers.filter((writer) => writer.startsWith(`${INVENTORY_PRISMA}:`));
  const inSeed = writers.filter((writer) => writer.startsWith("prisma/seed-fleet.ts:"));
  const outside = writers.filter((writer) => !inRepository.includes(writer) && !inSeed.includes(writer));

  // Universo publicado (a junta confere contra o gerador do plano §2.1).
  console.log(`[D1] universo de escritores de stock_movements (${writers.length}):\n  ${writers.join("\n  ")}`);

  assert.deepEqual(outside, [], "escritor de stock_movements fora da allowlist — via nova sem classificação");
  assert.equal(inRepository.length, 1, "o repositório tem UM escritor (insertMovement)");
  const repositoryMembers = membersOf(classSource(stripComments(read(INVENTORY_PRISMA)), "PrismaInventoryRepository"));
  const owner = [...repositoryMembers].filter(([, member]) => isStockMovementWriter(member.text)).map(([name]) => name);
  assert.deepEqual(owner, ["insertMovement"], "o único escritor do repositório é insertMovement");
  assert.ok(inSeed.length >= 1, "a semente (prisma/seed-fleet.ts) é o outro escritor conhecido");
});

test("D2 — V1..V5: exatamente 1 lock do item, antes da 1ª leitura que decide e antes de laço; sem versão SEM lock", () => {
  const classText = classSource(stripComments(read(INVENTORY_PRISMA)), "PrismaInventoryRepository");
  const members = membersOf(classText);
  // Universo: quem chega a insertMovement OU ESCREVE avg_cost (`data: { … avg_cost: … }`). Ler avg_cost num `select`
  // (getConsumptionValues, ABC) não decide escrita de movimento.
  const universe = [...members].filter(([, member]) => /this\.insertMovement\(|data:\s*\{[^}]*\bavg_cost:/.test(member.text));
  const names = universe.map(([name]) => name).sort();

  console.log(`[D2] universo (vias que chegam a insertMovement/avg_cost): ${names.join(", ")}`);
  for (const via of ["createMovement", "createTransfer", "reverseMovement", "createExitForSource", "removeExitForSource"]) {
    assert.ok(names.includes(via), `via ${via} ausente do universo`);
  }

  for (const [name, member] of universe) {
    const body = bodyOf(member.text);
    const locks = body.split("this.lockItemForUpdate(").length - 1;
    assert.equal(locks, 1, `${name}: exatamente 1 lockItemForUpdate (I7) — achei ${locks}`);
    const lockAt = body.indexOf("this.lockItemForUpdate(");
    const decisionAt = body.search(DECISION);
    assert.ok(decisionAt < 0 || lockAt < decisionAt, `${name}: leitura que DECIDE antes do lock (${body.match(DECISION)?.[0]})`);
    const loopAt = body.search(LOOP);
    assert.ok(loopAt < 0 || lockAt < loopAt, `${name}: lock depois/dentro de laço`);
  }

  // As versões SEM lock das leituras que decidem não existem mais. `isExitReversed` público é membro de LEITURA da
  // interface (InventoryService.findExitBySource) e nenhuma via o chama.
  const unlocked = [...members.keys()].filter((name) => /^(saldoOf|saldoOfCustody|hasReversalOf|movementsInGroup|isExitReversed)$/.test(name));
  assert.deepEqual(unlocked.filter((name) => name !== "isExitReversed"), [], "versão SEM lock de leitura que decide");
  const isExitReversed = members.get("isExitReversed");
  assert.ok(isExitReversed && !isExitReversed.isPrivate, "isExitReversed só existe como membro público de leitura da interface");
  assert.equal(/this\.isExitReversed\(/.test(classText), false, "nenhuma via chama o isExitReversed sem lock");
});

test("D3 — o token ItemWriteLock está na assinatura de insertMovement e de toda leitura *Locked", () => {
  const members = membersOf(classSource(stripComments(read(INVENTORY_PRISMA)), "PrismaInventoryRepository"));
  const lockedReaders = [...members.keys()].filter((name) => name.endsWith("Locked"));
  assert.ok(lockedReaders.length >= 5, `leituras *Locked: ${lockedReaders.join(", ")}`);
  for (const name of ["insertMovement", ...lockedReaders]) {
    const text = members.get(name)!.text;
    const signature = text.slice(0, signatureEnd(text));
    assert.match(signature, /\bItemWriteLock\b/, `${name}: assinatura sem o token ItemWriteLock`);
  }
  const lock = members.get("lockItemForUpdate");
  assert.ok(lock?.isPrivate, "lockItemForUpdate é o produtor privado do token");
});

test("D4 — o fechamento escreve só por unidades (uow.run), com abortClose no catch e total do finishClose", () => {
  const source = stripComments(read(CYCLE_COUNT_SERVICE));
  const close = bodyOf(membersOf(classSource(source, "CycleCountService")).get("close")!.text);

  const runAt = close.indexOf("this.uow.run(");
  assert.ok(runAt > 0, "close sem uow.run");
  const loopAt = close.search(/\bfor \(/);
  assert.ok(loopAt >= 0 && loopAt < runAt, "a unidade tem de ser UMA por item (uow.run DENTRO do laço)");
  const callbackOpen = close.indexOf("{", close.indexOf("=>", runAt));
  const callbackEnd = matchBrace(close, callbackOpen);
  const inside = (index: number) => index > callbackOpen && index < callbackEnd;

  for (const writer of [".createMovement(", ".stampEntry("]) {
    const at = close.indexOf(writer);
    assert.ok(at >= 0 && inside(at), `${writer} tem de estar DENTRO da unidade`);
  }
  for (const outer of ["beginClose(", "finishClose(", "abortClose("]) {
    const at = close.indexOf(outer);
    assert.ok(at >= 0, `close não chama ${outer}`);
    assert.ok(!inside(at), `${outer} tem de estar FORA da unidade`);
  }
  assert.equal(close.includes("findItemById("), false, "close não lê avg_cost por item (S-02: o total vem do finishClose)");
  assert.equal(/avgCost/.test(close), false, "close não acumula avgCost");
  const catchAt = close.indexOf("catch (", callbackEnd);
  assert.ok(catchAt > 0, "o laço tem catch");
  const catchBody = close.slice(catchAt, matchBrace(close, close.indexOf("{", catchAt)) + 1);
  assert.match(catchBody, /abortClose\(/, "o catch do laço chama abortClose (S-01)");
  assert.match(catchBody, /throw error/, "o catch propaga o erro original");

  const everywhere = walk("src", [".ts"]).filter((file) => /\bapplyClose\b/.test(stripComments(read(file))));
  assert.deepEqual(everywhere, [], "applyClose (status sem condição) não existe mais");
});

test("D5 — toda transição de cycle_counts.status é CAS (status no where); universo = 4 transições", () => {
  const classText = classSource(stripComments(read(CYCLE_COUNT_PRISMA)), "PrismaCycleCountRepository");
  const members = membersOf(classText);
  const transitions: string[] = [];
  for (const [name, member] of members) {
    const calls = [...member.text.matchAll(/cycleCount\.(update\w*)\(\{/g)];
    for (const call of calls) {
      const open = member.text.indexOf("{", call.index!);
      const argument = member.text.slice(open, matchBrace(member.text, open) + 1);
      const where = argument.slice(argument.indexOf("where:"));
      const whereObject = where.slice(where.indexOf("{"), matchBrace(where, where.indexOf("{")) + 1);
      assert.match(whereObject, /\bstatus:/, `${name}: ${call[1]} de cycle_counts sem status no where (não é CAS)`);
      transitions.push(name);
    }
    assert.equal(/UPDATE\s+"?cycle_counts"?/i.test(member.text), false, `${name}: UPDATE cru de cycle_counts`);
  }
  const universe = [...new Set(transitions)].sort();
  console.log(`[D5] universo de transições de status: ${universe.join(", ")}`);
  assert.deepEqual(universe, ["abortClose", "beginClose", "cancelSession", "finishClose"]);
});

test("D6 — P2002 tratado FORA da transação: nunca nas vias que inserem; sempre nos wrappers de V3/V4/V5", () => {
  const source = stripComments(read(INVENTORY_PRISMA));
  const inner = membersOf(classSource(source, "PrismaInventoryRepository"));
  for (const [name, member] of inner) {
    if (!/this\.insertMovement\(/.test(member.text)) continue;
    assert.equal(/isUniqueViolation\(/.test(member.text), false, `${name}: catch de P2002 DENTRO da transação (25P02)`);
  }
  const wrapper = membersOf(classSource(source, "RlsPrismaInventoryRepository"));
  for (const name of ["reverseMovement", "createExitForSource", "removeExitForSource"]) {
    assert.match(wrapper.get(name)!.text, /isUniqueViolation\(/, `wrapper ${name} sem o mapeamento de P2002`);
  }
});

test("D7 — toda porta pública dos wrappers RLS e a porta de UoW passam pelo mapeamento de falha transitória (503)", () => {
  for (const [file, className] of [
    [INVENTORY_PRISMA, "RlsPrismaInventoryRepository"],
    [CYCLE_COUNT_PRISMA, "RlsPrismaCycleCountRepository"],
  ] as const) {
    const members = membersOf(classSource(stripComments(read(file)), className));
    const publicMembers = [...members].filter(([, member]) => !member.isPrivate);
    const mapped = publicMembers.filter(([, member]) => /this\.tx\(/.test(member.text));
    console.log(`[D7] ${className}: ${mapped.length}/${publicMembers.length} portas públicas por this.tx`);
    assert.deepEqual(
      publicMembers.filter(([, member]) => !/this\.tx\(/.test(member.text)).map(([name]) => name),
      [],
      `${className}: porta pública sem this.tx (sem o mapeamento 503)`,
    );
    const tx = members.get("tx");
    assert.ok(tx?.isPrivate, `${className}: tx privado`);
    assert.match(tx!.text, /mapTransientDbFailure\(/, `${className}.tx sem mapTransientDbFailure`);
    const rawCalls = [...members].filter(([name, member]) => name !== "tx" && /withTenantRls\(/.test(member.text));
    assert.deepEqual(rawCalls.map(([name]) => name), [], `${className}: withTenantRls fora de tx`);
  }
  const uow = membersOf(classSource(stripComments(read(UOW_PRISMA)), "PrismaInventoryUnitOfWork"));
  assert.match(uow.get("run")!.text, /mapTransientDbFailure\(/, "PrismaInventoryUnitOfWork.run sem o mapeamento 503");
});

test("D8 — open serializado: createSession trava a linha do tenant (NO KEY UPDATE) e recusa sobreposição ANTES do create", () => {
  const classText = classSource(stripComments(read(CYCLE_COUNT_PRISMA)), "PrismaCycleCountRepository");
  const members = membersOf(classText);
  const creators = [...members].filter(([, member]) => /cycleCount\.create\(/.test(member.text)).map(([name]) => name);
  assert.deepEqual(creators, ["createSession"], "o único cycleCount.create é o de createSession");

  const body = bodyOf(members.get("createSession")!.text);
  const createAt = body.indexOf("cycleCount.create(");
  const tenantLockAt = body.search(/FROM "tenants"[^`]*FOR NO KEY UPDATE/);
  assert.ok(tenantLockAt >= 0 && tenantLockAt < createAt, "lock NO KEY UPDATE da linha do tenant antes do create");
  assert.equal(/FROM "?tenants"?[^`]*FOR UPDATE/.test(body.replace(/FOR NO KEY UPDATE/g, "")), false, "FOR UPDATE na linha do tenant conflitaria com todo INSERT do tenant (KEY SHARE)");
  const overlapAt = body.search(/status IN \('aberta', 'fechando'\)[^`]*item_id = ANY\(/);
  assert.ok(overlapAt >= 0 && overlapAt < createAt, "consulta de sobreposição (I9) antes do create");
  assert.ok(tenantLockAt < overlapAt, "a sobreposição é lida DEPOIS do lock do tenant");
});

test("D9 — nenhuma suíte -db do bloco faz DDL fora do drill em base própria", () => {
  const suites = readdirSync(path.join(ROOT, "tests")).filter(
    (name) => /^inventory-.*-db\.test\.ts$/.test(name) && name !== "inventory-migration-drill-db.test.ts",
  );
  console.log(`[D9] suítes -db do bloco sem DDL: ${suites.join(", ")}`);
  assert.ok(suites.length >= 3, "as três suítes -db de base compartilhada");
  for (const suite of suites) {
    const text = read(`tests/${suite}`);
    assert.equal(/DROP\s+INDEX|CREATE\s+(UNIQUE\s+)?INDEX|ALTER\s+TABLE/i.test(text), false, `${suite} faz DDL na base compartilhada`);
  }
});
