import type { PrismaClient } from "@prisma/client";

import { prisma } from "../../../database/prisma.js";

export type AssignUserRoleData = {
  readonly tenant_id: string;
  readonly user_id: string;
  readonly role_id: string;
  readonly branch_id?: string | null;
};

export class UserRoleRepository {
  constructor(private readonly client: PrismaClient = prisma) {}

  listByTenant(tenantId: string) {
    return this.client.userRoleAssignment.findMany({
      where: {
        tenant_id: tenantId,
      },
      include: {
        branch: true,
        role: true,
        user: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  }

  listByUserForTenant(userId: string, tenantId: string) {
    return this.client.userRoleAssignment.findMany({
      where: {
        tenant_id: tenantId,
        user_id: userId,
      },
      include: {
        branch: true,
        role: true,
      },
      orderBy: {
        created_at: "asc",
      },
    });
  }

  findAssignmentByIdForTenant(id: string, tenantId: string) {
    return this.client.userRoleAssignment.findFirst({
      where: {
        id,
        tenant_id: tenantId,
      },
      include: {
        branch: true,
        role: true,
        user: true,
      },
    });
  }

  async assignRole(data: AssignUserRoleData) {
    await this.assertUserBelongsToTenant(data.user_id, data.tenant_id);
    await this.assertRoleIsAssignableToTenant(data.role_id, data.tenant_id);

    if (data.branch_id) {
      await this.assertBranchBelongsToTenant(data.branch_id, data.tenant_id);
    }

    const existingAssignment = await this.client.userRoleAssignment.findFirst({
      where: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        role_id: data.role_id,
        branch_id: data.branch_id ?? null,
      },
    });

    if (existingAssignment) {
      return existingAssignment;
    }

    return this.client.userRoleAssignment.create({
      data: {
        tenant_id: data.tenant_id,
        user_id: data.user_id,
        role_id: data.role_id,
        branch_id: data.branch_id ?? null,
      },
    });
  }

  async removeAssignment(id: string, tenantId: string) {
    const result = await this.client.userRoleAssignment.deleteMany({
      where: {
        id,
        tenant_id: tenantId,
      },
    });

    return result.count > 0;
  }

  private async assertUserBelongsToTenant(userId: string, tenantId: string) {
    const user = await this.client.user.findFirst({
      where: {
        id: userId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("User does not belong to tenant.");
    }
  }

  private async assertRoleIsAssignableToTenant(roleId: string, tenantId: string) {
    const role = await this.client.role.findFirst({
      where: {
        id: roleId,
        OR: [
          {
            tenant_id: null,
          },
          {
            tenant_id: tenantId,
          },
        ],
      },
      select: {
        id: true,
      },
    });

    if (!role) {
      throw new Error("Role is not assignable to tenant.");
    }
  }

  private async assertBranchBelongsToTenant(branchId: string, tenantId: string) {
    const branch = await this.client.branch.findFirst({
      where: {
        id: branchId,
        tenant_id: tenantId,
      },
      select: {
        id: true,
      },
    });

    if (!branch) {
      throw new Error("Branch does not belong to tenant.");
    }
  }
}
