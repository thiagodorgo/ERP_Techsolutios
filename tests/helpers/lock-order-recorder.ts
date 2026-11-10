// B-ASS-08 — 2º conserto do #522 (plano `B-ASS-08-conserto-c2.md` §3 T-LOCK-1a/1b e §13.3 T-LOCK-2): o GRAVADOR de
// transações. Um Proxy no `PrismaClient` do papel efêmero:
//   - o `$transaction` interativo guarda a pilha de quem ABRIU (`new Error().stack`) e entrega ao `work` um `tx` gravado;
//   - o `tx` grava, NA ORDEM, cada `$queryRaw*`/`$executeRaw*` (o texto do SQL; tagged template com `?` no lugar dos
//     valores) e cada `tx.<model>.<op>` do Prisma;
//   - acesso cru ao cliente FORA de transação vai para `outside` (é o que denuncia "outra conexão").
// Sem gancho no código de produção: o repositório recebe o cliente gravado no construtor, como receberia o real.

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
          const recorded: RecordedTransaction = { openerStack: new Error().stack ?? "", events: [] };
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
