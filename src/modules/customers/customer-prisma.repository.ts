import type { Prisma, PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../database/rls.js";
import type {
  Customer,
  CreateCustomerInput,
  ListCustomersInput,
  ListCustomersResult,
  UpdateCustomerInput,
} from "./customer.types.js";
import { CustomerError } from "./customer.types.js";
import type { CustomerRepository } from "./customer.repository.js";

type PrismaExecutor = PrismaClient | Prisma.TransactionClient;

export class PrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly client: PrismaExecutor) {}

  async create(input: CreateCustomerInput): Promise<Customer> {
    try {
      const customer = await this.client.customer.create({
        data: {
          tenant_id: input.tenantId,
          name: input.name,
          document: input.document ?? null,
          phone: input.phone ?? null,
          email: input.email ?? null,
          address: input.address ?? null,
          city: input.city ?? null,
          state: input.state ?? null,
          zip_code: input.zipCode ?? null,
          is_active: input.isActive ?? true,
          notes: input.notes ?? null,
          created_by: input.createdBy ?? null,
          updated_by: input.updatedBy ?? null,
        },
      });

      return mapCustomerRecord(customer);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new CustomerError(409, "CUSTOMER_CONFLICT", "duplicate_document", "A customer with this document already exists.");
      }

      throw error;
    }
  }

  async list(input: ListCustomersInput): Promise<ListCustomersResult> {
    const where = buildWhere(input);
    const [items, total] = await Promise.all([
      this.client.customer.findMany({
        where,
        orderBy: [{ created_at: "desc" }],
        take: input.limit,
        skip: input.offset,
      }),
      this.client.customer.count({ where }),
    ]);

    return {
      items: items.map(mapCustomerRecord),
      total,
      limit: input.limit,
      offset: input.offset,
    };
  }

  async findById(tenantId: string, customerId: string): Promise<Customer | undefined> {
    const customer = await this.client.customer.findFirst({
      where: {
        tenant_id: tenantId,
        id: customerId,
      },
    });

    return customer ? mapCustomerRecord(customer) : undefined;
  }

  async update(input: UpdateCustomerInput): Promise<Customer | undefined> {
    const updated = await this.client.customer.updateManyAndReturn({
      where: {
        tenant_id: input.tenantId,
        id: input.customerId,
      },
      data: compactRecord({
        name: input.name,
        document: nullable(input.document),
        phone: nullable(input.phone),
        email: nullable(input.email),
        address: nullable(input.address),
        city: nullable(input.city),
        state: nullable(input.state),
        zip_code: nullable(input.zipCode),
        is_active: input.isActive,
        notes: nullable(input.notes),
        updated_by: nullable(input.updatedBy),
      }),
    });

    return updated[0] ? mapCustomerRecord(updated[0]) : undefined;
  }
}

export class RlsPrismaCustomerRepository implements CustomerRepository {
  constructor(private readonly prismaClient: PrismaClient) {}

  create(input: CreateCustomerInput): Promise<Customer> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCustomerRepository(tx).create(input));
  }

  list(input: ListCustomersInput): Promise<ListCustomersResult> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCustomerRepository(tx).list(input));
  }

  findById(tenantId: string, customerId: string): Promise<Customer | undefined> {
    return withTenantRls(this.prismaClient, tenantId, (tx) => new PrismaCustomerRepository(tx).findById(tenantId, customerId));
  }

  update(input: UpdateCustomerInput): Promise<Customer | undefined> {
    return withTenantRls(this.prismaClient, input.tenantId, (tx) => new PrismaCustomerRepository(tx).update(input));
  }
}

export async function createPrismaCustomerRepository(): Promise<RlsPrismaCustomerRepository> {
  const { prisma } = await import("../../database/prisma.js");

  return new RlsPrismaCustomerRepository(prisma);
}

function buildWhere(input: ListCustomersInput): Prisma.CustomerWhereInput {
  return {
    tenant_id: input.tenantId,
    ...(input.isActive !== undefined ? { is_active: input.isActive } : {}),
    ...(input.search
      ? {
          OR: [
            { name: { contains: input.search, mode: "insensitive" } },
            { document: { contains: input.search, mode: "insensitive" } },
            { phone: { contains: input.search, mode: "insensitive" } },
            { email: { contains: input.search, mode: "insensitive" } },
            { city: { contains: input.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };
}

function mapCustomerRecord(record: {
  readonly id: string;
  readonly tenant_id: string;
  readonly name: string;
  readonly document: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly zip_code: string | null;
  readonly is_active: boolean;
  readonly notes: string | null;
  readonly created_by: string | null;
  readonly updated_by: string | null;
  readonly created_at: Date;
  readonly updated_at: Date;
}): Customer {
  return {
    id: record.id,
    tenantId: record.tenant_id,
    name: record.name,
    document: record.document ?? undefined,
    phone: record.phone ?? undefined,
    email: record.email ?? undefined,
    address: record.address ?? undefined,
    city: record.city ?? undefined,
    state: record.state ?? undefined,
    zipCode: record.zip_code ?? undefined,
    isActive: record.is_active,
    notes: record.notes ?? undefined,
    createdBy: record.created_by ?? undefined,
    updatedBy: record.updated_by ?? undefined,
    createdAt: record.created_at,
    updatedAt: record.updated_at,
  };
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { readonly code?: unknown }).code === "P2002"
  );
}

function nullable<T>(value: T | undefined): T | null | undefined {
  return value === undefined ? undefined : value ?? null;
}

function compactRecord<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, value]) => value !== undefined)) as Partial<T>;
}
