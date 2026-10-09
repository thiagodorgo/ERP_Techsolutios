// B-SAN3-05 (item 9 do gate vendável) — a identidade com que a API fala ao banco em produção não pode
// escapar de FORCE ROW LEVEL SECURITY por nenhuma das três vias medidas: ATRIBUTO (superusuário,
// BYPASSRLS, REPLICATION ou pertença — direta ou por cadeia — a papel assim ou a um dos três papéis de
// servidor), POSSE (dono, ou membro do dono, de tabela FORCE) e VIEW (existe no banco QUALQUER view ou
// matview, de qualquer esquema e de qualquer dono, cuja árvore alcança tabela FORCE — sem olhar dono,
// privilégio de tabela ou de coluna, herança nem pertença: D-405-PROIBIR-VIEWS; a via é do banco, não do
// papel). ATRIBUTO e POSSE são avaliadas para
// `session_user` E `current_user`: um login
// superusuário com `options=-c role=<limpo>` escaparia por `SET ROLE NONE`.
//
// Esta constante é a ÚNICA fonte da propriedade; o md5 do Apêndice E deixou de ser critério no ciclo 2.
// O hash abaixo é regravado quando a SQL muda e serve somente para diagnóstico EOL-neutro: 2ed16571b942efbc8b48231469396786.
export const RUNTIME_ROLE_GUARD_SQL = `WITH RECURSIVE view_walk(root_oid, leaf_oid) AS (
  SELECT v.oid, v.oid FROM pg_class v WHERE v.relkind IN ('v', 'm')
  UNION
  SELECT w.root_oid, dep.oid
  FROM view_walk w
  JOIN pg_rewrite rw ON rw.ev_class = w.leaf_oid
  JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass
  JOIN pg_class dep ON dep.oid = d.refobjid AND dep.relkind IN ('v', 'm')
), view_force AS (
  SELECT DISTINCT w.root_oid
  FROM view_walk w
  JOIN pg_rewrite rw ON rw.ev_class = w.leaf_oid
  JOIN pg_depend d ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid AND d.refclassid = 'pg_class'::regclass
  JOIN pg_class t ON t.oid = d.refobjid AND t.relkind IN ('r', 'p') AND t.relforcerowsecurity
)
SELECT via, rolname, rolsuper, rolbypassrls, is_self, objetos
FROM (
  SELECT 'atributo'::text AS via, r.rolname::text, r.rolsuper, r.rolbypassrls,
         (r.rolname = session_user OR r.rolname = current_user) AS is_self, NULL::int AS objetos
  FROM pg_roles r
  WHERE (r.rolsuper OR r.rolbypassrls OR r.rolreplication
         OR r.rolname IN ('pg_execute_server_program', 'pg_read_server_files', 'pg_write_server_files'))
    AND (pg_has_role(session_user, r.oid, 'MEMBER') OR pg_has_role(current_user, r.oid, 'MEMBER'))
  UNION ALL
  SELECT 'posse', o.rolname::text, o.rolsuper, o.rolbypassrls,
         (o.rolname = session_user OR o.rolname = current_user), count(*)::int
  FROM pg_class c JOIN pg_roles o ON o.oid = c.relowner
  WHERE c.relkind IN ('r', 'p') AND c.relforcerowsecurity
    AND (pg_has_role(session_user, c.relowner, 'MEMBER') OR pg_has_role(current_user, c.relowner, 'MEMBER'))
  GROUP BY o.rolname, o.rolsuper, o.rolbypassrls, (o.rolname = session_user OR o.rolname = current_user)
  UNION ALL
  SELECT 'view', o.rolname::text, o.rolsuper, o.rolbypassrls,
         (o.rolname = session_user OR o.rolname = current_user), count(DISTINCT v.oid)::int
  FROM view_force vf
  JOIN pg_class v ON v.oid = vf.root_oid
  JOIN pg_roles o ON o.oid = v.relowner
  GROUP BY o.rolname, o.rolsuper, o.rolbypassrls, (o.rolname = session_user OR o.rolname = current_user)
) x ORDER BY via, rolname`;

export const RUNTIME_ROLE_CAN_BYPASS_RLS = "RUNTIME_ROLE_CAN_BYPASS_RLS";

const RUNTIME_ROLE_IDENTITY_SQL =
  "SELECT session_user::text AS session_user_name, current_user::text AS current_user_name";

const PROBE_TIMEOUT_MS = 10_000;
const PROBE_TIMEOUT_MESSAGE = "runtime_role_probe_timeout";

export type RuntimeRoleEscapeVia = "atributo" | "posse" | "view";

export type RuntimeRoleEscape = {
  readonly via: RuntimeRoleEscapeVia;
  readonly rolname: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly is_self: boolean;
  readonly objetos: number | null;
};

export type RuntimeRolePosture = {
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly escapes: readonly RuntimeRoleEscape[];
};

export type RuntimeRoleProbeClient = {
  $queryRawUnsafe<T = unknown>(query: string, ...values: unknown[]): PromiseLike<T> | Promise<T>;
};

type GuardRow = {
  readonly via: string;
  readonly rolname: string;
  readonly rolsuper: boolean;
  readonly rolbypassrls: boolean;
  readonly is_self: boolean;
  readonly objetos: number | bigint | null;
};

export class RuntimeRoleGuardError extends Error {
  readonly code = RUNTIME_ROLE_CAN_BYPASS_RLS;
  readonly sessionUser: string;
  readonly currentUser: string;
  readonly escapes: readonly RuntimeRoleEscape[];

  constructor(posture: RuntimeRolePosture) {
    super(
      `${RUNTIME_ROLE_CAN_BYPASS_RLS}: a identidade de banco do processo (session_user=${posture.sessionUser}, ` +
        `current_user=${posture.currentUser}) escapa de FORCE ROW LEVEL SECURITY por ${posture.escapes.length} via(s): ` +
        posture.escapes.map((escape) => `${escape.via}:${escape.rolname}`).join(", ") +
        ". Use um papel NOSUPERUSER NOBYPASSRLS sem posse de tabela FORCE e nenhuma view/matview sobre tabela FORCE (scripts/db-runtime-role.sh; docs/deployment.md).",
    );
    this.name = "RuntimeRoleGuardError";
    this.sessionUser = posture.sessionUser;
    this.currentUser = posture.currentUser;
    this.escapes = posture.escapes;
  }
}

export function isRuntimeRoleProbeTimeout(error: unknown): boolean {
  return error instanceof Error && error.message === PROBE_TIMEOUT_MESSAGE;
}

export async function probeRuntimeRolePosture(
  client: RuntimeRoleProbeClient,
  timeoutMs: number = PROBE_TIMEOUT_MS,
): Promise<RuntimeRolePosture> {
  const identity = await withTimeout(
    client.$queryRawUnsafe<Array<{ session_user_name: string; current_user_name: string }>>(RUNTIME_ROLE_IDENTITY_SQL),
    timeoutMs,
  );
  const rows = await withTimeout(client.$queryRawUnsafe<GuardRow[]>(RUNTIME_ROLE_GUARD_SQL), timeoutMs);

  return {
    sessionUser: identity[0]?.session_user_name ?? "",
    currentUser: identity[0]?.current_user_name ?? "",
    escapes: rows.map(toEscape),
  };
}

export function assertRuntimeRolePosture(posture: RuntimeRolePosture): void {
  if (posture.escapes.length > 0) {
    throw new RuntimeRoleGuardError(posture);
  }
}

function toEscape(row: GuardRow): RuntimeRoleEscape {
  return {
    via: row.via as RuntimeRoleEscapeVia,
    rolname: String(row.rolname),
    rolsuper: row.rolsuper === true,
    rolbypassrls: row.rolbypassrls === true,
    is_self: row.is_self === true,
    objetos: row.objetos === null || row.objetos === undefined ? null : Number(row.objetos),
  };
}

async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(PROBE_TIMEOUT_MESSAGE)), ms);
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}
