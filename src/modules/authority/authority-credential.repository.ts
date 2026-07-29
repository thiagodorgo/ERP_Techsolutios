import { randomUUID } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import {
  AuthorityCredentialError,
  type AuthorityCredential,
  type AuthorityCredentialStatus,
} from "./authority-credential.types.js";

// Ω5P PR-18a — repositório da AuthorityCredential (memory×prisma pelo mesmo env-gate das demais fatias). A tabela é
// MUTÁVEL (rotação/lockout) — SEM trigger append-only (as escritas de provisionamento são auditadas pelo Ω4C; a
// trilha probatória do ACESSO fica no PortalAccessLog, esse sim append-only). RLS FORCE: o portal/console só
// escreve/lê sob o tenant vinculado.

export type CreateAuthorityCredentialInput = {
  readonly tenantId: string;
  readonly authorityName: string;
  readonly username: string; // já normalizado
  readonly passwordHash: string;
  readonly createdBy: string | null;
};

// Entrada do incremento ATÔMICO de falha de login. O threshold/duração vêm da config do BFF; o relógio é injetado
// (mesma base do serviço → paridade com o clock de teste). A DECISÃO de lockout mora no repo (não no serviço).
export type RegisterFailedLoginInput = {
  readonly tenantId: string;
  readonly id: string;
  readonly threshold: number; // nº de falhas consecutivas que TRAVA a credencial
  readonly lockDurationMs: number; // duração do lockout quando o teto é atingido
  readonly nowMs: number; // relógio injetado
};

// Estado pós-update devolvido pelo incremento atômico — só o que a decisão de lockout do serviço precisa (§2.8:
// contador/locked_until NUNCA vão para a resposta pública do login).
export type FailedLoginState = {
  readonly failedLoginCount: number;
  readonly lockedUntil: Date | null;
};

// Porta ESTREITA que o BFF de login consome (subset do repositório): lookup + bookkeeping de tentativa. NUNCA
// expõe create/rotate/suspend ao BFF público (SoD: o BFF autentica, o console provisiona).
export interface AuthorityCredentialLoginPort {
  findByUsername(tenantId: string, username: string): Promise<AuthorityCredential | undefined>;
  // Contabiliza UMA falha de login de forma ATÔMICA (incremento no banco + decisão de lockout embutida) e RETORNA o
  // estado pós-update. Fecha a race de lost-update: N falhas CONCORRENTES na mesma credencial somam +N — o incremento
  // é AUTO-REFERENTE (Postgres serializa os updaters via row lock/EvalPlanQual; o InMemory soma sobre o valor ATUAL
  // da linha, sem read-modify-write no serviço). MUTÁVEL, sobrevive a restart (linha sob RLS). reset-na-expiração
  // embutido: se um lockout anterior JÁ expirou, esta falha reinicia a contagem em 1.
  registerFailedLogin(input: RegisterFailedLoginInput): Promise<FailedLoginState>;
  // Zera o estado de falha e carimba o último login OK.
  resetLoginState(tenantId: string, id: string, lastLoginAt: Date): Promise<void>;
}

export interface AuthorityCredentialRepository extends AuthorityCredentialLoginPort {
  create(input: CreateAuthorityCredentialInput): Promise<AuthorityCredential>;
  findById(tenantId: string, id: string): Promise<AuthorityCredential | undefined>;
  list(tenantId: string): Promise<readonly AuthorityCredential[]>;
  // Setter ABSOLUTO do estado de falha (last-write-wins) — provisionamento/seed administrativo e testes; NÃO é o
  // caminho contendível do login (esse usa registerFailedLogin, incremento atômico).
  applyFailedLogin(tenantId: string, id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void>;
  // Rotação de senha: troca o hash E zera o lockout (senha nova = conta destravada). undefined se não existir.
  rotatePassword(tenantId: string, id: string, passwordHash: string): Promise<AuthorityCredential | undefined>;
  // Suspender/revogar: muda o status. undefined se não existir.
  updateStatus(tenantId: string, id: string, status: AuthorityCredentialStatus): Promise<AuthorityCredential | undefined>;
}

// ── InMemory (dev/test) ─────────────────────────────────────────────────────────────────────────────────────────
type Row = {
  id: string;
  tenantId: string;
  authorityName: string;
  username: string;
  passwordHash: string;
  status: AuthorityCredentialStatus;
  failedLoginCount: number;
  lockedUntil: Date | null;
  lastLoginAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toEntity(row: Row): AuthorityCredential {
  return { ...row };
}

export class InMemoryAuthorityCredentialRepository implements AuthorityCredentialRepository {
  private readonly rows: Row[] = [];

  async create(input: CreateAuthorityCredentialInput): Promise<AuthorityCredential> {
    // Espelha o UNIQUE(tenant_id, username) — a 2ª credencial com o mesmo username no tenant é 409.
    const clash = this.rows.some((row) => row.tenantId === input.tenantId && row.username === input.username);
    if (clash) {
      throw new AuthorityCredentialError(409, "AUTHORITY_USERNAME_CONFLICT", "duplicate_username", "A credential with this username already exists.");
    }
    const now = new Date();
    const row: Row = {
      id: randomUUID(),
      tenantId: input.tenantId,
      authorityName: input.authorityName,
      username: input.username,
      passwordHash: input.passwordHash,
      status: "ACTIVE",
      failedLoginCount: 0,
      lockedUntil: null,
      lastLoginAt: null,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
    };
    this.rows.push(row);
    return toEntity(row);
  }

  async findByUsername(tenantId: string, username: string): Promise<AuthorityCredential | undefined> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.username === username);
    return row ? toEntity(row) : undefined;
  }

  async findById(tenantId: string, id: string): Promise<AuthorityCredential | undefined> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.id === id);
    return row ? toEntity(row) : undefined;
  }

  async list(tenantId: string): Promise<readonly AuthorityCredential[]> {
    return this.rows.filter((r) => r.tenantId === tenantId).map(toEntity);
  }

  async applyFailedLogin(tenantId: string, id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.id === id);
    if (!row) return;
    row.failedLoginCount = failedLoginCount;
    row.lockedUntil = lockedUntil;
    row.updatedAt = new Date();
  }

  async registerFailedLogin(input: RegisterFailedLoginInput): Promise<FailedLoginState> {
    // JS é single-threaded e ESTE corpo é 100% síncrono (sem await entre a leitura e a escrita) → chamadas via
    // Promise.all serializam naturalmente: cada uma soma sobre o `failedLoginCount` ATUAL da linha (não sobre um
    // valor lido antes do await do scrypt no serviço). Espelha a serialização do UPDATE atômico do Postgres.
    const row = this.rows.find((r) => r.tenantId === input.tenantId && r.id === input.id);
    if (!row) return { failedLoginCount: 0, lockedUntil: null };
    // reset-na-expiração: se um lockout anterior JÁ expirou, esta falha reinicia a contagem em 1.
    const expired = row.lockedUntil !== null && row.lockedUntil.getTime() <= input.nowMs;
    const failedLoginCount = expired ? 1 : row.failedLoginCount + 1;
    const lockedUntil = failedLoginCount >= input.threshold ? new Date(input.nowMs + input.lockDurationMs) : null;
    row.failedLoginCount = failedLoginCount;
    row.lockedUntil = lockedUntil;
    row.updatedAt = new Date();
    return { failedLoginCount, lockedUntil };
  }

  async resetLoginState(tenantId: string, id: string, lastLoginAt: Date): Promise<void> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.id === id);
    if (!row) return;
    row.failedLoginCount = 0;
    row.lockedUntil = null;
    row.lastLoginAt = lastLoginAt;
    row.updatedAt = new Date();
  }

  async rotatePassword(tenantId: string, id: string, passwordHash: string): Promise<AuthorityCredential | undefined> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.id === id);
    if (!row) return undefined;
    row.passwordHash = passwordHash;
    row.failedLoginCount = 0;
    row.lockedUntil = null;
    row.updatedAt = new Date();
    return toEntity(row);
  }

  async updateStatus(tenantId: string, id: string, status: AuthorityCredentialStatus): Promise<AuthorityCredential | undefined> {
    const row = this.rows.find((r) => r.tenantId === tenantId && r.id === id);
    if (!row) return undefined;
    row.status = status;
    row.updatedAt = new Date();
    return toEntity(row);
  }

  reset(): void {
    this.rows.length = 0;
  }
}

// Singleton in-memory COMPARTILHADO entre o serviço de provisionamento (/api/v1) e a porta de login do BFF, para
// que em dev/memory uma credencial provisionada seja vista pelo login (paridade com o Prisma, que é 1 tabela só).
const memoryRepository = new InMemoryAuthorityCredentialRepository();

export function getMemoryAuthorityCredentialRepository(): InMemoryAuthorityCredentialRepository {
  return memoryRepository;
}

// ── Prisma (produção) ───────────────────────────────────────────────────────────────────────────────────────────
type PrismaRow = {
  id: string;
  tenant_id: string;
  authority_name: string;
  username: string;
  password_hash: string;
  status: string;
  failed_login_count: number;
  locked_until: Date | null;
  last_login_at: Date | null;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

function fromPrisma(row: PrismaRow): AuthorityCredential {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    authorityName: row.authority_name,
    username: row.username,
    passwordHash: row.password_hash,
    status: row.status as AuthorityCredentialStatus,
    failedLoginCount: Number(row.failed_login_count),
    lockedUntil: row.locked_until,
    lastLoginAt: row.last_login_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isUsernameUniqueViolation(error: unknown): boolean {
  const text = error instanceof Error ? error.message : String(error);
  return text.includes("authority_credentials_tenant_id_username_key") || text.includes("23505");
}

// Todas as operações passam por withTenantRls(tenant vinculado) — RLS FORCE garante que o console/BFF jamais lê ou
// escreve a credencial de OUTRO tenant (mata a enumeração cross-tenant no login e no provisionamento).
export class PrismaAuthorityCredentialRepository implements AuthorityCredentialRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  async create(input: CreateAuthorityCredentialInput): Promise<AuthorityCredential> {
    try {
      return await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
        const rows = await tx.$queryRaw<PrismaRow[]>`
          INSERT INTO authority_credentials (tenant_id, authority_name, username, password_hash, created_by)
          VALUES (${input.tenantId}::uuid, ${input.authorityName}, ${input.username}, ${input.passwordHash}, ${input.createdBy}::uuid)
          RETURNING *
        `;
        return fromPrisma(rows[0]);
      });
    } catch (error) {
      if (isUsernameUniqueViolation(error)) {
        throw new AuthorityCredentialError(409, "AUTHORITY_USERNAME_CONFLICT", "duplicate_username", "A credential with this username already exists.");
      }
      throw error;
    }
  }

  async findByUsername(tenantId: string, username: string): Promise<AuthorityCredential | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<PrismaRow[]>`
        SELECT * FROM authority_credentials WHERE tenant_id = ${tenantId}::uuid AND username = ${username} LIMIT 1
      `;
      return rows[0] ? fromPrisma(rows[0]) : undefined;
    });
  }

  async findById(tenantId: string, id: string): Promise<AuthorityCredential | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<PrismaRow[]>`
        SELECT * FROM authority_credentials WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid LIMIT 1
      `;
      return rows[0] ? fromPrisma(rows[0]) : undefined;
    });
  }

  async list(tenantId: string): Promise<readonly AuthorityCredential[]> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<PrismaRow[]>`
        SELECT * FROM authority_credentials WHERE tenant_id = ${tenantId}::uuid ORDER BY created_at DESC
      `;
      return rows.map(fromPrisma);
    });
  }

  async applyFailedLogin(tenantId: string, id: string, failedLoginCount: number, lockedUntil: Date | null): Promise<void> {
    await withTenantRls(this.prismaClient, tenantId, (tx) =>
      tx.$executeRaw`
        UPDATE authority_credentials
        SET failed_login_count = ${failedLoginCount}, locked_until = ${lockedUntil}, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      `,
    );
  }

  async registerFailedLogin(input: RegisterFailedLoginInput): Promise<FailedLoginState> {
    const now = new Date(input.nowMs);
    // O timestamp do lockout é pré-computado em JS e passado como parâmetro Date (timestamptz), como no applyFailedLogin.
    // NÃO usar `${now} + make_interval(...)` no SQL: no CASE, o Postgres infere o parâmetro como `interval` e o resultado
    // vira interval, quebrando a atribuição a locked_until (timestamptz) — 42804. O CASE com um THEN timestamptz + ELSE
    // NULL resolve limpo para timestamptz.
    const lockCandidate = new Date(input.nowMs + input.lockDurationMs);
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      // UM ÚNICO UPDATE atômico: o incremento `failed_login_count + 1` é AUTO-REFERENTE → sob N updaters concorrentes
      // na MESMA linha o Postgres pega o row lock e (via EvalPlanQual) re-lê a versão commitada de cada um, somando
      // +1 determinístico por falha (fecha o lost-update). reset-na-expiração e decisão de lockout embutidos no MESMO
      // statement; READ COMMITTED basta. tenant-scoped sob RLS (não muda tenant_id → RLS intacta).
      const rows = await tx.$queryRaw<Array<{ failed_login_count: number | bigint; locked_until: Date | null }>>`
        UPDATE authority_credentials
        SET failed_login_count = CASE
              WHEN locked_until IS NOT NULL AND locked_until <= ${now} THEN 1
              ELSE failed_login_count + 1 END,
            locked_until = CASE
              WHEN (CASE WHEN locked_until IS NOT NULL AND locked_until <= ${now} THEN 1
                         ELSE failed_login_count + 1 END) >= ${input.threshold}
                THEN ${lockCandidate}::timestamptz
              ELSE NULL END,
            updated_at = now()
        WHERE tenant_id = ${input.tenantId}::uuid AND id = ${input.id}::uuid
        RETURNING failed_login_count, locked_until
      `;
      const row = rows[0];
      // Linha ausente (credencial sumiu entre o lookup e o update — só teórico): trata como não-travado (o login já
      // é `invalid` por senha errada; o serviço não revela nada). Nunca acontece no fluxo real (credencial existe).
      if (!row) return { failedLoginCount: 0, lockedUntil: null };
      return { failedLoginCount: Number(row.failed_login_count), lockedUntil: row.locked_until };
    });
  }

  async resetLoginState(tenantId: string, id: string, lastLoginAt: Date): Promise<void> {
    await withTenantRls(this.prismaClient, tenantId, (tx) =>
      tx.$executeRaw`
        UPDATE authority_credentials
        SET failed_login_count = 0, locked_until = NULL, last_login_at = ${lastLoginAt}, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
      `,
    );
  }

  async rotatePassword(tenantId: string, id: string, passwordHash: string): Promise<AuthorityCredential | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<PrismaRow[]>`
        UPDATE authority_credentials
        SET password_hash = ${passwordHash}, failed_login_count = 0, locked_until = NULL, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
        RETURNING *
      `;
      return rows[0] ? fromPrisma(rows[0]) : undefined;
    });
  }

  async updateStatus(tenantId: string, id: string, status: AuthorityCredentialStatus): Promise<AuthorityCredential | undefined> {
    return withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const rows = await tx.$queryRaw<PrismaRow[]>`
        UPDATE authority_credentials
        SET status = ${status}, updated_at = now()
        WHERE tenant_id = ${tenantId}::uuid AND id = ${id}::uuid
        RETURNING *
      `;
      return rows[0] ? fromPrisma(rows[0]) : undefined;
    });
  }
}

export async function createPrismaAuthorityCredentialRepository(): Promise<PrismaAuthorityCredentialRepository> {
  const { prisma } = await import("../../database/prisma.js");
  return new PrismaAuthorityCredentialRepository(prisma);
}
