// B-ASS-08 — 2º conserto do #522 (plano `B-ASS-08-conserto-c2.md` §3 T-LOCK-1a/1b e §13.3 T-LOCK-2): o GRAVADOR de
// transações. Um Proxy no `PrismaClient` do papel efêmero:
//   - o `$transaction` interativo guarda a pilha de quem ABRIU (`new Error().stack`) e entrega ao `work` um `tx` gravado;
//   - o `tx` grava, NA ORDEM, cada `$queryRaw*`/`$executeRaw*` (o texto do SQL; tagged template com `?` no lugar dos
//     valores) e cada `tx.<model>.<op>` do Prisma;
//   - acesso cru ao cliente FORA de transação vai para `outside` (é o que denuncia "outra conexão").
// Sem gancho no código de produção: o repositório recebe o cliente gravado no construtor, como receberia o real.
// T-LOCK-2 (F6b): mais o CLASSIFICADOR fail-closed (efeitos de trava por evento; regras ORD-0/ORD-1/ORD-2 e UNK) e o CENSO
// das aberturas de transação pelo compilador TypeScript.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

export type RecordedEvent =
  | { readonly kind: "raw"; readonly method: string; readonly sql: string }
  | { readonly kind: "model"; readonly model: string; readonly op: string };

export type RecordedTransaction = { readonly openerStack: string; readonly events: RecordedEvent[] };

export type Recording<C> = {
  readonly client: C;
  readonly transactions: RecordedTransaction[];
  readonly outside: RecordedEvent[];
};

const RAW_METHODS = new Set(["$queryRaw", "$queryRawUnsafe", "$executeRaw", "$executeRawUnsafe"]);

/** O texto do SQL de uma chamada crua: `*Unsafe` recebe a string; o tagged template recebe o `TemplateStringsArray`. */
export function sqlTextOf(method: string, args: readonly unknown[]): string {
  const first = args[0];
  if (method.endsWith("Unsafe")) return String(first);
  if (Array.isArray(first)) return (first as readonly string[]).join("?");
  if (first && typeof first === "object" && Array.isArray((first as { strings?: unknown }).strings)) {
    return ((first as { strings: readonly string[] }).strings).join("?");
  }
  return String(first);
}

/** Normaliza espaços (o SQL dos repositórios é multilinha). */
export function oneLine(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

// ---------------------------------------------------------------- leitura das cláusulas de trava (T-LOCK-1b; T-LOCK-2)

export type LockStrength = "update" | "no key update" | "share" | "key share";
export type LockClause = {
  readonly strength: LockStrength;
  /** Os aliases do `OF …`; `null` quando a cláusula não tem `OF` (trava todas as tabelas do FROM). */
  readonly of: readonly string[] | null;
  readonly waitPolicy: "skip locked" | "nowait" | "wait";
  /** Posição no texto normalizado: a ordem das cláusulas é a ordem em que o LockRows trava. */
  readonly position: number;
};

const NOT_AN_ALIAS = new Set([
  "where", "join", "on", "left", "right", "inner", "outer", "full", "cross", "natural", "using", "order", "group", "having",
  "for", "limit", "offset", "set", "values", "returning", "union", "as", "lateral", "with", "and", "or", "select",
]);

/** O SQL em minúsculas, uma linha, sem aspas de identificador e sem o prefixo `public.`. */
export function normalizedSql(sql: string): string {
  return oneLine(sql).toLowerCase().replace(/"/g, "").replace(/\bpublic\./g, "");
}

/** Todas as cláusulas `FOR … [OF …] [SKIP LOCKED|NOWAIT]` de UMA instrução, na ordem do texto. */
export function lockClauses(sql: string): LockClause[] {
  const text = normalizedSql(sql);
  const clauses: LockClause[] = [];
  const pattern = /\bfor (no key update|key share|update|share)\b(?: of ([a-z_][a-z0-9_]*(?: ?, ?[a-z_][a-z0-9_]*)*))?(?: (skip locked|nowait))?/g;
  for (const match of text.matchAll(pattern)) {
    clauses.push({
      strength: match[1] as LockStrength,
      of: match[2] ? match[2].split(",").map((alias) => alias.trim()) : null,
      waitPolicy: (match[3] as "skip locked" | "nowait" | undefined) ?? "wait",
      position: match.index ?? 0,
    });
  }
  return clauses;
}

/** `alias → tabela` de `FROM t [AS] a` / `JOIN t [AS] a` (a própria tabela também é alias de si). */
export function tableAliases(sql: string): Map<string, string> {
  const text = normalizedSql(sql);
  const aliases = new Map<string, string>();
  for (const match of text.matchAll(/\b(?:from|join) ([a-z_][a-z0-9_]*)(?: (?:as )?([a-z_][a-z0-9_]*))?/g)) {
    const table = match[1]!;
    aliases.set(table, table);
    const alias = match[2];
    if (alias && !NOT_AN_ALIAS.has(alias)) aliases.set(alias, table);
  }
  return aliases;
}

/** As tabelas que uma cláusula trava: pelo `OF`, ou todas as citadas em FROM/JOIN quando não há `OF` (por excesso, que é o
 * lado seguro para um guarda). */
export function clauseTables(sql: string, clause: LockClause): string[] {
  const aliases = tableAliases(sql);
  if (clause.of) return clause.of.map((alias) => aliases.get(alias) ?? alias);
  return [...new Set(aliases.values())];
}

function recordingTx(tx: object, events: RecordedEvent[]): object {
  return new Proxy(tx, {
    get(target, prop) {
      const value = (target as Record<PropertyKey, unknown>)[prop];
      if (typeof prop === "string" && RAW_METHODS.has(prop) && typeof value === "function") {
        return (...args: unknown[]) => {
          events.push({ kind: "raw", method: prop, sql: sqlTextOf(prop, args) });
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      if (typeof prop === "string" && !prop.startsWith("$") && !prop.startsWith("_") && value && typeof value === "object") {
        const delegate = value as Record<PropertyKey, unknown>;
        return new Proxy(delegate, {
          get(d, op) {
            const fn = d[op];
            if (typeof op === "string" && typeof fn === "function") {
              return (...args: unknown[]) => {
                events.push({ kind: "model", model: prop, op });
                return (fn as (...a: unknown[]) => unknown).apply(d, args);
              };
            }
            return fn;
          },
        });
      }
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
}

/** Envolve o cliente: toda transação interativa aberta por ele é gravada, com a pilha de quem a abriu. */
export function recordingClient<C extends object>(client: C): Recording<C> {
  const transactions: RecordedTransaction[] = [];
  const outside: RecordedEvent[] = [];
  const proxied = new Proxy(client, {
    get(target, prop) {
      const value = (target as Record<PropertyKey, unknown>)[prop];
      if (prop === "$transaction" && typeof value === "function") {
        return (work: unknown, options?: unknown) => {
          if (typeof work !== "function") return (value as (...a: unknown[]) => unknown).call(target, work, options);
          // pilha LONGA: o limite padrão (10 quadros) pode cortar a linha da chamada que abriu a transação
          const previousLimit = Error.stackTraceLimit;
          Error.stackTraceLimit = 60;
          const openerStack = new Error().stack ?? "";
          Error.stackTraceLimit = previousLimit;
          const recorded: RecordedTransaction = { openerStack, events: [] };
          transactions.push(recorded);
          return (value as (...a: unknown[]) => unknown).call(
            target,
            (tx: object) => (work as (tx: object) => unknown)(recordingTx(tx, recorded.events)),
            options,
          );
        };
      }
      if (typeof prop === "string" && RAW_METHODS.has(prop) && typeof value === "function") {
        return (...args: unknown[]) => {
          outside.push({ kind: "raw", method: prop, sql: sqlTextOf(prop, args) });
          return (value as (...a: unknown[]) => unknown).apply(target, args);
        };
      }
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(target) : value;
    },
  });
  return { client: proxied, transactions, outside };
}
// ---------------------------------------------------------------- o classificador (fail-closed)

/** Uma trava que um evento toma: tabela, forte (FOR UPDATE / NO KEY UPDATE / escrita) ou fraca (SHARE / KEY SHARE), e se
 * PODE ESPERAR (sem SKIP LOCKED/NOWAIT). `implicit` = a KEY SHARE que o INSERT numa filha toma no pai pela FK. */
export type LockEffect = { readonly table: string; readonly strong: boolean; readonly wait: boolean; readonly implicit?: boolean; readonly explicit?: boolean };

export type ClassifierContext = {
  /** `delegate do Prisma` → tabela (de `prisma/schema.prisma`, `@@map`). */
  readonly modelTable: ReadonlyMap<string, string>;
  /** Filhas de `subscription_statements` pela FK (do catálogo `pg_constraint`, não de literal). */
  readonly statementChildren: ReadonlySet<string>;
};

export const STATEMENTS = "subscription_statements";
/** As linhas cuja 1ª trava abre a janela do ORD-1. */
export const QUEUE_TABLES: ReadonlySet<string> = new Set(["billing_outbox", "subscription_statement_charges"]);
/** SQL que cita estas tabelas e o classificador não sabe ler é UNK (vermelho). */
const WATCHED = /\b(billing_outbox|subscription_statements|subscription_statement_charges)\b/;

export function effectsOf(event: RecordedEvent, context: ClassifierContext): LockEffect[] | "unknown" {
  if (event.kind === "model") {
    const table = context.modelTable.get(event.model);
    if (!table) return "unknown"; // delegate que o mapa do schema não conhece: fail-closed
    if (/^(find|count|aggregate|groupBy)/.test(event.op)) return [];
    if (event.op === "create" || event.op === "createMany" || event.op === "createManyAndReturn") {
      // a linha NOVA é exclusiva de quem a cria; no próprio demonstrativo ela não é "trava fraca antes da forte" (ORD-0)
      return [...(context.statementChildren.has(table) ? [{ table: STATEMENTS, strong: false, wait: true, implicit: true }] : []), { table, strong: table === STATEMENTS, wait: false }];
    }
    if (event.op === "upsert") {
      return [...(context.statementChildren.has(table) ? [{ table: STATEMENTS, strong: false, wait: true, implicit: true }] : []), { table, strong: true, wait: true }];
    }
    if (/^(update|updateMany|updateManyAndReturn|delete|deleteMany)$/.test(event.op)) return [{ table, strong: true, wait: true }];
    return "unknown";
  }
  const sql = normalizedSql(event.sql);
  if (/^select set_config\(/.test(sql) || /^set /.test(sql)) return [];
  let match = /^insert into ([a-z_][a-z0-9_]*)/.exec(sql);
  if (match) {
    const table = match[1]!;
    const effects: LockEffect[] = [];
    if (context.statementChildren.has(table)) effects.push({ table: STATEMENTS, strong: false, wait: true, implicit: true });
    effects.push({ table, strong: table === STATEMENTS, wait: false });
    if (/ on conflict .* do update /.test(` ${sql} `)) effects.push({ table, strong: true, wait: true });
    return effects;
  }
  match = /^update ([a-z_][a-z0-9_]*)/.exec(sql);
  if (match) return [{ table: match[1]!, strong: true, wait: true }];
  match = /^delete from ([a-z_][a-z0-9_]*)/.exec(sql);
  if (match) return [{ table: match[1]!, strong: true, wait: true }];
  if (/^(select|with) /.test(sql)) {
    // escrita escondida num SELECT/CTE (`WITH x AS (UPDATE …)`) o classificador não lê → UNK (fail-closed)
    const withoutLockWords = sql.replace(/\bfor (no key update|update)\b/g, " ").replace(/\bdo update\b/g, " ");
    if (/\b(update|delete|insert)\b/.test(withoutLockWords)) return WATCHED.test(sql) ? "unknown" : [];
    return lockClauses(sql).flatMap((clause) =>
      clauseTables(sql, clause).map((table) => ({
        table,
        strong: clause.strength === "update" || clause.strength === "no key update",
        wait: clause.waitPolicy === "wait",
        explicit: true,
      })),
    );
  }
  return WATCHED.test(sql) ? "unknown" : [];
}

export type Violation = { readonly rule: "ORD-0" | "ORD-1" | "ORD-2" | "UNK"; readonly at: number; readonly detail: string };

/** A letra do §2.1, aplicada a UMA transação gravada. `claim` liga a ORD-2 (toda trava explícita SKIP LOCKED/NOWAIT). */
export function lockOrderViolations(transaction: RecordedTransaction, context: ClassifierContext, options: { readonly claim?: boolean } = {}): Violation[] {
  const violations: Violation[] = [];
  let firstQueue = -1;
  let firstStrongStatement = -1;
  let weakStatementBefore = false;
  transaction.events.forEach((event, index) => {
    const effects = effectsOf(event, context);
    const detail = event.kind === "raw" ? oneLine(event.sql).slice(0, 140) : `${event.model}.${event.op}`;
    if (effects === "unknown") {
      violations.push({ rule: "UNK", at: index, detail });
      return;
    }
    for (const effect of effects) {
      if (options.claim && effect.explicit && effect.wait) violations.push({ rule: "ORD-2", at: index, detail });
      if (effect.table === STATEMENTS) {
        if (effect.strong && effect.wait && firstStrongStatement === -1 && weakStatementBefore) violations.push({ rule: "ORD-0", at: index, detail });
        if (effect.wait && firstQueue !== -1 && !(firstStrongStatement !== -1 && firstStrongStatement < firstQueue)) violations.push({ rule: "ORD-1", at: index, detail });
        if (effect.strong && firstStrongStatement === -1) firstStrongStatement = index;
        if (!effect.strong && firstStrongStatement === -1) weakStatementBefore = true;
      } else if (QUEUE_TABLES.has(effect.table) && firstQueue === -1) {
        firstQueue = index;
      }
    }
  });
  return violations;
}

// ---------------------------------------------------------------- o censo das aberturas de transação (AST)

export type Opening = { readonly key: string; readonly file: string; readonly line: number };

const OPENERS = new Set(["withTenantRls", "withTenantRlsBudget", "forEachTenantRls", "findFirstTenantRls"]);

/** Toda chamada que ABRE transação no módulo (`withTenantRls*`, `forEachTenantRls`, `findFirstTenantRls`, `.$transaction`,
 * `.transaction`), pelo compilador TypeScript (AST, não regex). Chave = `arquivo#Classe.metodo#chamada` (sem número de
 * linha; repetição ganha `#n`); `line` = a linha do nome chamado, a mesma que a pilha gravada mostra. */
export function transactionOpenings(ts: typeof import("typescript"), repoRoot: string, prefix: string): Opening[] {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) files.push(full);
    }
  };
  walk(path.join(repoRoot, prefix));
  files.sort();
  const openings: Opening[] = [];
  for (const full of files) {
    const file = path.relative(repoRoot, full).replace(/\\/g, "/");
    const source = ts.createSourceFile(file, readFileSync(full, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    const enclosingName = (node: import("typescript").Node): string => {
      const parts: string[] = [];
      for (let current = node.parent; current; current = current.parent) {
        if ((ts.isMethodDeclaration(current) || ts.isFunctionDeclaration(current) || ts.isGetAccessor(current)) && current.name) parts.unshift(current.name.getText(source));
        else if (ts.isVariableDeclaration(current) && current.initializer && (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))) parts.unshift(current.name.getText(source));
        else if (ts.isPropertyAssignment(current) && (ts.isArrowFunction(current.initializer) || ts.isFunctionExpression(current.initializer))) parts.unshift(current.name.getText(source));
        else if (ts.isClassDeclaration(current) && current.name) parts.unshift(current.name.getText(source));
      }
      return parts.join(".") || "<módulo>";
    };
    const seen = new Map<string, number>();
    const visit = (node: import("typescript").Node): void => {
      if (ts.isCallExpression(node)) {
        const callee = node.expression;
        let name: import("typescript").Node | null = null;
        let label = "";
        if (ts.isIdentifier(callee) && OPENERS.has(callee.text)) {
          name = callee;
          label = callee.text;
        } else if (ts.isPropertyAccessExpression(callee) && (callee.name.text === "$transaction" || callee.name.text === "transaction")) {
          name = callee.name;
          label = `.${callee.name.text}`;
        }
        if (name) {
          const base = `${file}#${enclosingName(node)}#${label}`;
          const count = (seen.get(base) ?? 0) + 1;
          seen.set(base, count);
          const line = source.getLineAndCharacterOfPosition(name.getStart(source)).line + 1;
          openings.push({ key: count > 1 ? `${base}#${count}` : base, file, line });
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return openings;
}

/** As linhas `src/…:<n>` de uma pilha (com barra normal), na ordem. */
export function stackFrames(stack: string): string[] {
  const frames: string[] = [];
  for (const match of stack.matchAll(/(src[\\/][^:()\s]+\.ts):(\d+)/g)) frames.push(`${match[1]!.replace(/\\/g, "/")}:${match[2]}`);
  return frames;
}

/** `delegate do Prisma → tabela`, lido de `prisma/schema.prisma` (`model X { … @@map("y") }`; sem `@@map`, a tabela é X). */
export function modelTablesFromSchema(schemaText: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const match of schemaText.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{([\s\S]*?)^\}/gm)) {
    const model = match[1]!;
    const mapped = /@@map\("([^"]+)"\)/.exec(match[2]!)?.[1] ?? model;
    map.set(model.charAt(0).toLowerCase() + model.slice(1), mapped);
  }
  return map;
}
