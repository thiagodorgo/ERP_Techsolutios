// Limpeza escopada à organização de um teste `-db` (nunca mass-delete). Extraída de
// `tests/san3-08-financeiro-cria-orcamento-db.test.ts` (P-SAN3-08-LIMPEZA-VARRE-TABELAS-ALHEIAS).
//
// Apaga as concessões dos papéis criados pelo teste e depois toda linha com `tenant_id` desta organização, em passadas,
// até a ordem das chaves estrangeiras deixar; por fim, a organização. Lança se sobrar linha, para o resíduo nunca passar calado.
//
// A lista de tabelas vem do catálogo NA HORA da limpeza. Sob `node --test`, suítes irmãs rodam em paralelo e algumas criam e
// derrubam tabelas próprias com `tenant_id` (ex.: as `s305_c4_*` do san3-05). Uma tabela que SUMIU entre a leitura do
// catálogo e o DELETE (SQLSTATE 42P01, undefined_table) não pode guardar linha desta organização: sai da fila sem erro.
// Qualquer outro erro continua contando e, se persistir até a última passada, reprova a limpeza.

export type SweepAdminClient = {
  $queryRawUnsafe<T>(query: string, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(query: string, ...values: unknown[]): Promise<number>;
};

export const SWEEP_MAX_PASSES = 12;

const UNDEFINED_TABLE = "42P01";

/** SQLSTATE de um erro do Prisma (driver adapter ou motor) ou do `pg`; `undefined` se não houver. */
export function sqlStateOf(error: unknown): string | undefined {
  const e = error as {
    code?: unknown;
    meta?: { code?: unknown; driverAdapterError?: { cause?: { originalCode?: unknown; code?: unknown } } };
  } | null;
  const candidates = [
    e?.meta?.driverAdapterError?.cause?.originalCode,
    e?.meta?.driverAdapterError?.cause?.code,
    e?.meta?.code,
    e?.code,
  ];
  for (const candidate of candidates) {
    // Código do Prisma (P1xxx a P6xxx, ex.: P2010) não é SQLSTATE; o P0xxx do PL/pgSQL é.
    if (typeof candidate === "string" && /^[0-9A-Z]{5}$/.test(candidate) && !/^P[1-9][0-9]{3}$/.test(candidate)) {
      return candidate;
    }
  }
  return undefined;
}

/** A tabela deixou de existir? Pelo SQLSTATE; na falta dele, pela mensagem padrão do Postgres. */
export function isUndefinedTable(error: unknown): boolean {
  if (sqlStateOf(error) === UNDEFINED_TABLE) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return /relation "[^"]+" does not exist/.test(message);
}

export async function sweepTenant(
  client: SweepAdminClient,
  tenantId: string,
  createdRoleIds: readonly string[],
): Promise<void> {
  for (const roleId of createdRoleIds) {
    await client.$executeRawUnsafe("DELETE FROM role_permissions WHERE role_id = $1::uuid", roleId);
  }
  const tables = await client.$queryRawUnsafe<Array<{ table_name: string }>>(
    `SELECT c.table_name FROM information_schema.columns c
       JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name
      WHERE c.table_schema = 'public' AND c.column_name = 'tenant_id' AND t.table_type = 'BASE TABLE' AND c.table_name <> 'tenants'`,
  );
  let pending = tables.map((row) => row.table_name);
  let lastErrors: string[] = [];
  for (let pass = 0; pass < SWEEP_MAX_PASSES && pending.length > 0; pass += 1) {
    const failed: string[] = [];
    lastErrors = [];
    for (const table of pending) {
      try {
        await client.$executeRawUnsafe(`DELETE FROM "${table}" WHERE tenant_id = $1::uuid`, tenantId);
      } catch (error) {
        if (isUndefinedTable(error)) {
          continue; // a tabela de uma suíte irmã sumiu no meio da limpeza: não há linha desta organização nela.
        }
        failed.push(table);
        lastErrors.push(`${table}: ${(error as Error).message.split("\n")[0].slice(0, 160)}`);
      }
    }
    pending = failed;
  }
  if (lastErrors.length > 0) {
    throw new Error(`limpeza da organização do teste não terminou: ${JSON.stringify(lastErrors)}`);
  }
  await client.$executeRawUnsafe("DELETE FROM tenants WHERE id = $1::uuid", tenantId);
}
