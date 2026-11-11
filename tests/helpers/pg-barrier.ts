import assert from "node:assert/strict";

// -----------------------------------------------------------------------------------------------
// B-O6R-02 ciclo 2 · C3 (fecha B-5 da J-B-O6R-02-ciclo1) — BARREIRA ESCOPADA À PRÓPRIA SUÍTE.
//
// O defeito medido pela junta: quatro das cinco suítes `-db` esperavam por um statement bloqueado
// consultando `pg_stat_activity` CLUSTER-WIDE (`pid <> pg_backend_pid() AND wait_event_type='Lock'`),
// e se autodenominavam "barreira DETERMINÍSTICA". O job da CI roda `node --test` sobre 29 arquivos, e
// o runner paraleliza arquivos em PROCESSOS — logo um backend de OUTRA suíte, bloqueado por motivo
// nenhum relacionado, satisfaz a barreira e o teste segue achando que o seu perdedor travou.
//
// P4 (a propriedade que faltava): *a barreira de uma suíte só é satisfeita por statement de conexões
// da PRÓPRIA suíte*. O escopo é o `application_name`: cada suíte carimba um nome único
// (`o6r-<slug>-<pid>`) na `DATABASE_URL` ANTES de qualquer import da aplicação — medido em runtime:
// `src/database/prisma.ts` lê `process.env.DATABASE_URL` no import e repassa ao `PrismaPg`/node-pg,
// que honra `application_name` da URL; `node --test` dá um processo por arquivo, então tag por
// processo = tag por suíte. `assertApplicationNamePropagated` prova isso na 1ª execução, dentro da
// própria suíte — a barreira nunca depende de uma promessa não verificada.
//
// O controle negativo permanente vive em `tests/pg-barrier-scoped-db.test.ts`: duas conexões CRUAS
// (sem a tag) criam um statement realmente bloqueado, e a barreira escopada RECUSA-O. Remover o
// filtro `application_name` daqui (drill D14) põe esse controle no vermelho.
// -----------------------------------------------------------------------------------------------

export type PgQueryClient = {
  $queryRaw: (query: TemplateStringsArray, ...values: unknown[]) => Promise<unknown>;
};

const DEFAULT_TIMEOUT_MS = 15000;
const POLL_INTERVAL_MS = 25;

/** Nome único por PROCESSO — `node --test` roda um processo por arquivo, logo é único por suíte. */
export function buildApplicationName(slug: string): string {
  return `o6r-${slug}-${process.pid}`;
}

/**
 * Carimba `application_name` na connection string. Preserva os demais parâmetros (`schema`, etc.):
 * a URL do repositório já traz `?schema=public`, e sobrescrevê-la quebraria o cliente.
 */
export function withApplicationName(connectionString: string, applicationName: string): string {
  const url = new URL(connectionString);
  url.searchParams.set("application_name", applicationName);
  return url.toString();
}

/**
 * Prova, contra o backend de verdade, que a tag CHEGOU. Sem isto a barreira escopada poderia ficar
 * verde por nunca casar nada — um "determinístico" que é só um timeout que não aconteceu.
 */
export async function assertApplicationNamePropagated(client: PgQueryClient, applicationName: string): Promise<void> {
  const rows = (await client.$queryRaw`
    SELECT application_name AS name FROM pg_stat_activity WHERE pid = pg_backend_pid()
  `) as Array<{ name: string }>;
  assert.equal(
    rows[0]?.name,
    applicationName,
    `o application_name da suíte não chegou ao backend (observado: ${JSON.stringify(rows[0]?.name)}). ` +
      "Sem ele a barreira escopada não tem como distinguir a própria fila da fila alheia.",
  );
}

/**
 * Quantos statements estão BLOQUEADOS num lock, com o texto tocando `fragment`. Quando
 * `applicationName` é passado, conta só as conexões daquela suíte; sem ele, conta o cluster inteiro
 * (é assim que o controle negativo prova que o decoy existe de fato antes de exigir que a barreira
 * escopada o recuse).
 */
export async function countBlockedStatements(
  client: PgQueryClient,
  options: { readonly fragment: string; readonly applicationName?: string },
): Promise<number> {
  const like = `%${options.fragment}%`;
  const rows = (await client.$queryRaw`
    SELECT count(*)::int AS waiting
    FROM pg_stat_activity
    WHERE pid <> pg_backend_pid()
      AND wait_event_type = 'Lock'
      AND state = 'active'
      AND query ILIKE ${like}
      AND (${options.applicationName ?? null}::text IS NULL OR application_name = ${options.applicationName ?? null}::text)
  `) as Array<{ waiting: number }>;
  return rows[0]?.waiting ?? 0;
}

/**
 * Espera um statement bloqueado DA PRÓPRIA SUÍTE (mesmo `application_name`, pid distinto do meu).
 * O timeout reporta quantos bloqueios existiam no cluster — assim "ninguém bloqueou" e "bloqueou
 * gente que não é minha" chegam com diagnósticos diferentes ao lugar de falha.
 */
export async function waitForOwnBlockedStatement(
  client: PgQueryClient,
  options: {
    readonly applicationName: string;
    readonly fragment: string;
    readonly label: string;
    readonly timeoutMs?: number;
  },
): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  for (;;) {
    const own = await countBlockedStatements(client, { fragment: options.fragment, applicationName: options.applicationName });
    if (own >= 1) return;
    if (Date.now() > deadline) {
      const clusterWide = await countBlockedStatements(client, { fragment: options.fragment });
      assert.fail(
        `timeout esperando statement bloqueado em ${options.fragment} para ${options.applicationName} — ${options.label} ` +
          `(bloqueios no cluster inteiro com esse texto: ${clusterWide})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * Espera `minWaiters` na FILA do advisory lock `hashtext(lockKey)` (int8 → classid = 32 bits altos,
 * objid = 32 baixos, objsubid = 1), contando SÓ as conexões da própria suíte. A chave já é
 * tenant+competência, mas `hashtext` colide entre pares distintos — o escopo por `application_name`
 * fecha também essa porta, e de graça.
 */
export async function waitForOwnAdvisoryWaiters(
  client: PgQueryClient,
  options: {
    readonly applicationName: string;
    readonly lockKey: string;
    readonly minWaiters: number;
    readonly label: string;
    readonly timeoutMs?: number;
  },
): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  for (;;) {
    const rows = (await client.$queryRaw`
      SELECT count(*)::int AS waiting
      FROM pg_locks l
      JOIN pg_stat_activity a ON a.pid = l.pid
      WHERE l.locktype = 'advisory'
        AND l.granted = false
        AND l.objsubid = 1
        AND l.classid::bigint = ((hashtext(${options.lockKey})::bigint >> 32) & 4294967295)
        AND l.objid::bigint = (hashtext(${options.lockKey})::bigint & 4294967295)
        AND a.application_name = ${options.applicationName}
    `) as Array<{ waiting: number }>;
    if ((rows[0]?.waiting ?? 0) >= options.minWaiters) return;
    if (Date.now() > deadline) {
      assert.fail(
        `timeout esperando ${options.minWaiters} waiter(s) na trava de período para ${options.applicationName} — ${options.label}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

/**
 * CAPTURA-LIQUIDADA (o outro lado do B-5). Uma promessa segurada através de `await`s pode liquidar
 * ANTES de o teste anexar o handler de rejeição — e nada ordena os dois eventos; foi assim que
 * `financial-entry-reverse-restore-db` derrubou o lote com `unhandledRejection`. Aqui o handler é
 * anexado NA CRIAÇÃO: a promessa devolvida NUNCA rejeita, e a razão exata continua exigida, agora
 * lida do outcome capturado.
 */
export type SettledOutcome<T> = { readonly status: "fulfilled"; readonly value: T } | { readonly status: "rejected"; readonly reason: unknown };

export function captureSettled<T>(promise: Promise<T>): Promise<SettledOutcome<T>> {
  return promise.then(
    (value) => ({ status: "fulfilled", value }) as const,
    (reason: unknown) => ({ status: "rejected", reason }) as const,
  );
}

/** A razão exata do lado que PERDEU — falha com diagnóstico se ele tiver vencido. */
export function expectRejected<T>(outcome: SettledOutcome<T>, label: string): unknown {
  assert.equal(outcome.status, "rejected", `${label}: era para ter falhado e passou`);
  return (outcome as { readonly status: "rejected"; readonly reason: unknown }).reason;
}

/**
 * O outro lado: o que tinha de liquidar limpo liquidou. Carrega a RAZÃO na mensagem — um
 * `expected 'fulfilled', actual 'rejected'` sem o erro original manda o leitor caçar às cegas.
 */
export function expectAllFulfilled(outcomes: ReadonlyArray<SettledOutcome<unknown>>, label: string): void {
  const rejected = outcomes.filter((outcome): outcome is { status: "rejected"; reason: unknown } => outcome.status === "rejected");
  assert.deepEqual(
    rejected.map((outcome) => String((outcome.reason as { message?: unknown })?.message ?? outcome.reason)),
    [],
    `${label}: promessa(s) que deveriam liquidar limpo rejeitaram`,
  );
}

/**
 * B-SAN3-23 (R-03) — barreira SEM filtro de texto. Espera "o perdedor está bloqueado atrás de quem eu digo"
 * OU "o perdedor resolveu", o que vier primeiro.
 *
 * Por que sem texto: o statement que bloqueia muda de forma entre o código de hoje e o conserto (hoje o
 * `INSERT` do item espera a chave estrangeira; depois, a trava compartilhada da OS). Uma barreira por
 * fragmento vira timeout de um dos lados e o vermelho deixa de ser da asserção. Aqui o critério é o grafo de
 * espera do próprio Postgres: conexões da PRÓPRIA suíte (`application_name`), esperando trava, cujo bloqueador
 * é o `blockedBy` informado (o pid do vencedor). Sem `blockedBy`, basta estar bloqueado por alguém. O texto do
 * statement só vai para o retorno, como evidência.
 *
 * Resolve com `"bloqueado: <statement>"` ou `"resolvido"`; nunca usa relógio para sincronizar (o prazo só
 * transforma espera sem fim em falha com diagnóstico).
 */
export async function waitForOwnBlockedOrSettled(
  client: PgQueryClient,
  options: {
    readonly applicationName: string;
    readonly blockedBy?: number;
    readonly minBlocked?: number;
    readonly loser: Promise<unknown>;
    readonly label: string;
    readonly timeoutMs?: number;
  },
): Promise<string> {
  let settled = false;
  void options.loser.then(
    () => {
      settled = true;
    },
    () => {
      settled = true;
    },
  );
  const minBlocked = options.minBlocked ?? 1;
  const blockedBy = options.blockedBy ?? null;
  const deadline = Date.now() + (options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  for (;;) {
    const rows = (await client.$queryRaw`
      SELECT left(a.query, 160) AS query
      FROM pg_stat_activity a
      WHERE a.pid <> pg_backend_pid()
        AND a.application_name = ${options.applicationName}
        AND a.state = 'active'
        AND a.wait_event_type = 'Lock'
        AND (
          (${blockedBy}::int IS NULL AND cardinality(pg_blocking_pids(a.pid)) > 0)
          OR (${blockedBy}::int = ANY(pg_blocking_pids(a.pid)))
        )
    `) as Array<{ query: string }>;
    if (rows.length >= minBlocked) {
      return `bloqueado: ${rows.map((row) => row.query.replace(/\s+/g, " ").trim()).join(" | ")}`;
    }
    if (settled) return "resolvido";
    if (Date.now() > deadline) {
      assert.fail(
        `timeout esperando bloqueio da própria suíte para ${options.applicationName} — ${options.label} ` +
          `(bloqueados vistos: ${rows.length} de ${minBlocked}; bloqueador exigido: ${blockedBy ?? "qualquer"})`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}

// -----------------------------------------------------------------------------------------------
// B-O6R-09 · Emenda 4 (R-ARN-1, requisito C09-04; Emenda 4.1, C4E-02 e C4E-04) — DDL DO ARNÊS QUE NÃO FICA NA FILA.
//
// Um `CREATE`/`DROP TRIGGER` de uma suíte pede trava forte na tabela (SHARE ROW EXCLUSIVE / ACCESS EXCLUSIVE). Se outra
// suíte segura uma transação aberta nessa tabela (a barreira de um teste), o DDL entra na fila atrás dela, e todo acesso
// à tabela entra na fila atrás do DDL — inclusive a 2ª conexão que aquela barreira espera: um ciclo que o Postgres não
// vê, porque passa pelo JavaScript (`P-B-O6R-09-ARNES-DDL-CICLO-ENTRE-SUITES`). Aqui o DDL espera no máximo
// `HARNESS_DDL_LOCK_TIMEOUT_MS`, sai da fila (55P03) e tenta de novo.
//
// A forma (decisão `D-B-O6R-09-ARNES-SEM-PG-DIRETO`, revista pela C4E-02): cada tentativa é uma transação NOVA do cliente
// dado (a conexão física pode ser a mesma), e a 1ª instrução dela põe o `lock_timeout` LOCAL. O `SET LOCAL` morre com a
// transação e não vaza para o pool; a nova tentativa nunca reaproveita a transação abortada (sem 25P02); só 55P03 se
// repete, lido da forma que o adapter-pg entrega (P2010 → `meta.driverAdapterError.cause.originalCode`); erro de outro
// código atravessa na hora. O teto é `HARNESS_DDL_MAX_ATTEMPTS` tentativas e `HARNESS_DDL_MAX_TOTAL_MS` de parede, e o
// arnês PARA quando não cabe mais uma tentativa inteira no teto (C4E-04): o esgotamento lança, nunca vira `skip`.
// -----------------------------------------------------------------------------------------------

// Abaixo do menor orçamento de trava de quem roda no mesmo banco: TENANT_RLS_BUDGET_LOCK_TIMEOUT_MS = 1_000 (src/database/rls.ts).
export const HARNESS_DDL_LOCK_TIMEOUT_MS = 300;
export const HARNESS_DDL_MAX_ATTEMPTS = 100;
export const HARNESS_DDL_MAX_TOTAL_MS = 30_000;

export type HarnessDdlClient = {
  $transaction<T>(fn: (tx: { $executeRawUnsafe(sql: string, ...values: unknown[]): Promise<number> }) => Promise<T>): Promise<T>;
};

function isLockTimeout(error: unknown): boolean {
  const err = error as { code?: unknown; meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } } } | undefined;
  return err?.code === "55P03" || (err?.code === "P2010" && err?.meta?.driverAdapterError?.cause?.originalCode === "55P03");
}

export async function runHarnessDdl(
  admin: HarnessDdlClient,
  sql: string,
  options?: { readonly maxTotalMs?: number },
): Promise<{ readonly attempts: number }> {
  const maxTotalMs = options?.maxTotalMs ?? HARNESS_DDL_MAX_TOTAL_MS;
  const start = Date.now();
  let attempts = 0;
  for (;;) {
    attempts += 1;
    try {
      await admin.$transaction(async (tx) => {
        await tx.$executeRawUnsafe(`SET LOCAL lock_timeout = '${HARNESS_DDL_LOCK_TIMEOUT_MS}ms'`);
        await tx.$executeRawUnsafe(sql);
      });
      return { attempts };
    } catch (error) {
      if (!isLockTimeout(error)) throw error;
    }
    const backoffMs = Math.min(25 * attempts, 250);
    const elapsed = Date.now() - start;
    if (attempts >= HARNESS_DDL_MAX_ATTEMPTS || elapsed + backoffMs + HARNESS_DDL_LOCK_TIMEOUT_MS > maxTotalMs) {
      throw new Error(`DDL do arnês não obteve a trava em ${attempts} tentativas (${elapsed} ms; teto ${maxTotalMs} ms): ${sql.slice(0, 120)}`);
    }
    await new Promise((resolve) => setTimeout(resolve, backoffMs));
  }
}

/**
 * R-ARN-3 — o `DROP` do `finally`: um esgotamento falha o caso e PRESERVA o erro do corpo. Recebe o erro do corpo (ou
 * `undefined` se o corpo passou) e os `DROP`s, na ordem; nunca engole um erro (`.catch(() => undefined)` é proibido).
 */
export async function dropHarnessObjects(admin: HarnessDdlClient, bodyError: unknown, statements: readonly string[]): Promise<void> {
  const errors: unknown[] = [];
  for (const statement of statements) {
    try {
      await runHarnessDdl(admin, statement);
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 0) return;
  if (bodyError !== undefined) throw new AggregateError([bodyError, ...errors], "o corpo falhou, e o DROP do arnês também");
  throw errors.length === 1 ? errors[0] : new AggregateError(errors, "o DROP do arnês falhou");
}
