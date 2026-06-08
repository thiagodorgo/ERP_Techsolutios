import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";
import { setTenantRlsContext, withTenantRls } from "../../../database/rls.js";
import { EnterpriseAuditLogService } from "../audit/audit-log.service.js";
import {
  AuditLogRepository,
  RoleRepository,
  TenantRepository,
  UserRepository,
  UserRoleRepository,
} from "../repositories/index.js";
import { isValidRole, validateRole, type Role } from "../permissions/catalog.js";
import type {
  AuditEvent,
  CreateTenantInput,
  CreateUserInput,
  ListTenantOptions,
  Tenant,
  TenantStatus,
  User,
  UserStatus,
} from "../types/core-saas.types.js";
import type { AsyncCoreSaasStore, CreatePersistentAuditEventInput } from "./async-core-saas.store.js";

type PrismaTenant = Awaited<ReturnType<TenantRepository["create"]>>;
type PrismaUser = NonNullable<Awaited<ReturnType<UserRepository["findByIdForTenant"]>>>;
type PrismaAuditLog = Awaited<ReturnType<AuditLogRepository["create"]>>;

export class PrismaCoreSaasStore implements AsyncCoreSaasStore {
  constructor(
    private readonly prismaClient: PrismaClient = prisma,
    private readonly tenants = new TenantRepository(),
    private readonly users = new UserRepository(),
    private readonly roles = new RoleRepository(),
    private readonly userRoles = new UserRoleRepository(),
    private readonly auditLogs = new AuditLogRepository(),
  ) {}

  async createTenant(input: CreateTenantInput): Promise<Tenant> {
    return this.prismaClient.$transaction(async (tx) => {
      const txTenants = new TenantRepository(tx);
      const txAudit = new AuditLogRepository(tx);

      const tenant = await txTenants.create({
        name: input.name,
        slug: createTenantSlug(input.name),
        status: input.status ?? "active",
      });

      await setTenantRlsContext(tx, tenant.id);

      // Audit recorded inside the same transaction — if audit fails, tenant creation rolls back.
      // actor_user_id is null because tenant creation precedes any user-based auth.
      await new EnterpriseAuditLogService(txAudit).record({
        tenantId: tenant.id,
        actorId: null,
        actorType: "system",
        action: "tenant.created",
        resourceType: "tenant",
        resourceId: tenant.id,
        outcome: "success",
        severity: "info",
      });

      return mapTenantFromPrisma(tenant);
    });
  }

  async findTenantById(tenantId: string): Promise<Tenant | undefined> {
    const tenant = await this.tenants.findById(tenantId);

    return tenant ? mapTenantFromPrisma(tenant) : undefined;
  }

  async listTenants(options: ListTenantOptions = {}): Promise<Tenant[]> {
    const tenants = options.status
      ? await this.tenants.listByStatus(options.status)
      : await this.tenants.listAll();

    return tenants.map(mapTenantFromPrisma);
  }

  async listTenantsForTenant(
    tenantId: string,
    options: ListTenantOptions = {},
  ): Promise<Tenant[]> {
    const tenants = await this.tenants.listForTenant(tenantId);

    return tenants
      .filter((tenant) => !options.status || tenant.status === options.status)
      .map(mapTenantFromPrisma);
  }

  async createUser(input: CreateUserInput): Promise<User> {
    return withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const txAudit = new AuditLogRepository(tx);

      // Step 1: create user record
      const user = await txUsers.createWithRoleAssignments({
        tenant_id: input.tenantId,
        branch_id: input.branchIds?.[0] ?? null,
        name: input.name,
        email: input.email,
        status: input.status ?? "active",
      });

      // Step 2: assign roles — if any fail, the whole transaction rolls back (no orphaned user)
      for (const role of input.roles.map((value) => validateRole(value))) {
        const roleRecord = await txRoles.findByKeyForTenant(role, input.tenantId);

        if (!roleRecord) {
          throw new Error(`Role is not assignable to tenant: ${role}`);
        }

        await txUserRoles.assignRole({
          tenant_id: input.tenantId,
          user_id: user.id,
          role_id: roleRecord.id,
          branch_id: input.branchIds?.[0] ?? null,
        });
      }

      // Step 3: resolve actor within the same transaction (sees the user created above)
      const actorId = isUuid(input.actorUserId ?? "")
        ? (
            await tx.user.findFirst({
              where: { id: input.actorUserId!, tenant_id: input.tenantId },
              select: { id: true },
            })
          )?.id ?? null
        : null;

      // Step 4: audit inside the transaction — if audit fails, user and roles roll back
      await new EnterpriseAuditLogService(txAudit).record({
        tenantId: input.tenantId,
        actorId,
        actorType: actorId ? "user" : "system",
        action: "user.created",
        resourceType: "user",
        resourceId: user.id,
        outcome: "success",
        severity: "info",
        metadata: {
          email: user.email,
          roleCount: input.roles.length,
          branchCount: input.branchIds?.length ?? 0,
        },
      });

      const savedUser = await txUsers.findByIdForTenant(user.id, input.tenantId);

      return mapUserFromPrisma(savedUser ?? user);
    });
  }

  async findUserByIdForTenant(
    userId: string,
    tenantId: string,
  ): Promise<User | undefined> {
    const user = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);

      return txUsers.findByIdForTenant(userId, tenantId);
    });

    return user ? mapUserFromPrisma(user) : undefined;
  }

  async listUsersByTenant(tenantId: string): Promise<User[]> {
    const users = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUsers = new UserRepository(tx);

      return txUsers.listByTenant(tenantId);
    });

    return users.map(mapUserFromPrisma);
  }

  async listRolesByUserForTenant(userId: string, tenantId: string): Promise<Role[]> {
    const assignments = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txUserRoles = new UserRoleRepository(tx);

      return txUserRoles.listByUserForTenant(userId, tenantId);
    });

    return mapRoleAssignmentsFromPrisma(assignments);
  }

  async assignRoleToUser(input: {
    readonly tenantId: string;
    readonly userId: string;
    readonly role: Role;
    readonly branchId?: string | null;
  }): Promise<void> {
    await withTenantRls(this.prismaClient, input.tenantId, async (tx) => {
      const txRoles = new RoleRepository(tx);
      const txUserRoles = new UserRoleRepository(tx);
      const role = await txRoles.findByKeyForTenant(input.role, input.tenantId);

      if (!role) {
        throw new Error(`Role is not assignable to tenant: ${input.role}`);
      }

      await txUserRoles.assignRole({
        tenant_id: input.tenantId,
        user_id: input.userId,
        role_id: role.id,
        branch_id: input.branchId ?? null,
      });
    });
  }

  async saveAuditEvent(input: CreatePersistentAuditEventInput): Promise<AuditEvent> {
    const event = await withTenantRls(this.prismaClient, input.tenant_id, async (tx) => {
      const txUsers = new UserRepository(tx);
      const txAuditLogs = new AuditLogRepository(tx);
      const actorUserId = await this.resolveActorUserId(
        txUsers,
        input.actor_user_id,
        input.tenant_id,
      );

      return new EnterpriseAuditLogService(txAuditLogs).record({
        tenantId: input.tenant_id,
        actorId: actorUserId,
        action: input.action,
        resourceType: String(input.metadata?.entity ?? "core_saas"),
        resourceId: readOptionalString(input.metadata?.entity_id),
        outcome: readAuditOutcome(input.metadata?.outcome),
        severity: readAuditSeverity(input.metadata?.severity),
        metadata: toJsonObject(input.metadata),
      });
    });

    return {
      id: event.id,
      action: event.action,
      actor_user_id: event.actorId ?? input.actor_user_id,
      tenant_id: event.tenantId,
      timestamp: event.createdAt,
      metadata: input.metadata,
    };
  }

  async listAuditEventsByTenant(tenantId: string): Promise<AuditEvent[]> {
    const events = await withTenantRls(this.prismaClient, tenantId, async (tx) => {
      const txAuditLogs = new AuditLogRepository(tx);

      return txAuditLogs.listByTenant(tenantId);
    });

    return events.map((event) => mapAuditLogFromPrisma(event));
  }

  private async resolveActorUserId(
    users: UserRepository,
    actorUserId: string,
    tenantId: string,
  ): Promise<string | null> {
    if (!isUuid(actorUserId)) {
      return null;
    }

    const actor = await users.findByIdForTenant(actorUserId, tenantId);

    return actor ? actor.id : null;
  }
}

export function mapTenantFromPrisma(tenant: PrismaTenant): Tenant {
  return {
    id: tenant.id,
    name: tenant.name,
    status: mapTenantStatus(tenant.status),
    modules: [],
    createdAt: tenant.created_at,
  };
}

export function mapUserFromPrisma(user: PrismaUser): User {
  return {
    id: user.id,
    tenantId: user.tenant_id,
    name: user.name,
    email: user.email,
    roles: mapRoleAssignmentsFromPrisma(user.role_assignments ?? []),
    branchIds: uniqueStrings([
      user.branch_id,
      ...(user.role_assignments ?? []).map((assignment) => assignment.branch_id),
    ]),
    status: mapUserStatus(user.status),
    createdAt: user.created_at,
  };
}

export function mapAuditLogFromPrisma(
  event: PrismaAuditLog,
  actorUserId = event.actor_user_id ?? "system",
): AuditEvent {
  return {
    id: event.id,
    action: event.action,
    actor_user_id: actorUserId,
    tenant_id: event.tenant_id,
    timestamp: event.created_at,
    metadata: isRecord(event.metadata) ? event.metadata : undefined,
  };
}

export function mapRoleAssignmentsFromPrisma(
  assignments: ReadonlyArray<{ readonly role: { readonly key: string } }>,
): Role[] {
  return uniqueRoles(
    assignments
      .map((assignment) => assignment.role.key)
      .filter(isValidRole)
      .map((role) => validateRole(role)),
  );
}

function createTenantSlug(name: string): string {
  const baseSlug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return `${baseSlug || "tenant"}-${Date.now().toString(36)}`;
}

function mapTenantStatus(status: string): TenantStatus {
  return status === "inactive" ? "inactive" : "active";
}

function mapUserStatus(status: string): UserStatus {
  return status === "inactive" ? "inactive" : "active";
}

function uniqueStrings(values: ReadonlyArray<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function uniqueRoles(values: readonly Role[]): Role[] {
  return [...new Set(values)];
}

function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function readAuditOutcome(value: unknown): "success" | "failure" | "denied" | undefined {
  if (value === "success" || value === "failure" || value === "denied") {
    return value;
  }

  return undefined;
}

function readAuditSeverity(value: unknown): "info" | "warning" | "critical" | undefined {
  if (value === "info" || value === "warning" || value === "critical") {
    return value;
  }

  return undefined;
}

function toJsonObject(
  value: Readonly<Record<string, unknown>> | undefined,
): Prisma.InputJsonObject | undefined {
  if (!value) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== undefined),
  ) as Prisma.InputJsonObject;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
