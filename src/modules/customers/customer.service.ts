import { env } from "../../config/env.js";
import {
  InMemoryCustomerRepository,
  type CustomerRepository,
} from "./customer.repository.js";
import type {
  Customer,
  CustomerActorContext,
  ListCustomersInput,
  ListCustomersResult,
  UpdateCustomerInput,
} from "./customer.types.js";
import { CustomerError } from "./customer.types.js";
import {
  assertNonEmptyString,
  parseLimit,
  parseOffset,
  parseOptionalAddress,
  parseOptionalCity,
  parseOptionalDocument,
  parseOptionalEmail,
  parseOptionalNotes,
  parseOptionalPhone,
  parseOptionalSearch,
  parseOptionalState,
  parseOptionalZipCode,
  parseRequiredUuid,
  readOptionalBoolean,
} from "./customer.validators.js";

type RawRecord = Record<string, unknown>;

export class CustomerService {
  constructor(private readonly repository: CustomerRepository) {}

  async list(actor: CustomerActorContext, query: RawRecord): Promise<ListCustomersResult> {
    const input: ListCustomersInput = {
      tenantId: actor.tenantId,
      isActive: readOptionalBoolean(query.is_active ?? query.isActive),
      search: parseOptionalSearch(query.search),
      limit: parseLimit(query.limit),
      offset: parseOffset(query.offset),
    };

    return this.repository.list(input);
  }

  async create(actor: CustomerActorContext, body: RawRecord): Promise<Customer> {
    const customer = await this.repository.create({
      tenantId: actor.tenantId,
      name: assertNonEmptyString(body.name, "name"),
      document: parseOptionalDocument(body.document),
      phone: parseOptionalPhone(body.phone),
      email: parseOptionalEmail(body.email),
      address: parseOptionalAddress(body.address),
      city: parseOptionalCity(body.city),
      state: parseOptionalState(body.state),
      zipCode: parseOptionalZipCode(body.zip_code ?? body.zipCode),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive) ?? true,
      notes: parseOptionalNotes(body.notes),
      createdBy: actor.userId,
      updatedBy: actor.userId,
    });

    return customer;
  }

  async get(actor: CustomerActorContext, customerId: string): Promise<Customer> {
    const customer = await this.repository.findById(actor.tenantId, parseRequiredUuid(customerId, "customerId"));

    if (!customer) {
      throw new CustomerError(404, "CUSTOMER_NOT_FOUND", "not_found", "Customer was not found.");
    }

    return customer;
  }

  async update(actor: CustomerActorContext, customerId: string, body: RawRecord): Promise<Customer> {
    await this.get(actor, customerId);
    const input: UpdateCustomerInput = {
      tenantId: actor.tenantId,
      customerId: parseRequiredUuid(customerId, "customerId"),
      name: body.name === undefined ? undefined : assertNonEmptyString(body.name, "name"),
      document: parseOptionalDocument(body.document),
      phone: parseOptionalPhone(body.phone),
      email: parseOptionalEmail(body.email),
      address: parseOptionalAddress(body.address),
      city: parseOptionalCity(body.city),
      state: parseOptionalState(body.state),
      zipCode: parseOptionalZipCode(body.zip_code ?? body.zipCode),
      isActive: readOptionalBoolean(body.is_active ?? body.isActive),
      notes: parseOptionalNotes(body.notes),
      updatedBy: actor.userId,
    };
    const updated = await this.repository.update(input);

    if (!updated) {
      throw new CustomerError(404, "CUSTOMER_NOT_FOUND", "not_found", "Customer was not found.");
    }

    return updated;
  }
}

const memoryRepository = new InMemoryCustomerRepository();
let defaultServicePromise: Promise<CustomerService> | undefined;

export function createMemoryCustomerService(): CustomerService {
  return new CustomerService(memoryRepository);
}

export function getMemoryCustomerRepositoryForTests(): InMemoryCustomerRepository {
  return memoryRepository;
}

export async function createDefaultCustomerService(): Promise<CustomerService> {
  if (env.CORE_SAAS_PERSISTENCE !== "prisma") {
    return createMemoryCustomerService();
  }

  defaultServicePromise ??= createPrismaCustomerService();

  return defaultServicePromise;
}

export function resetCustomerRuntimeForTests(): void {
  memoryRepository.reset();
  defaultServicePromise = undefined;
}

async function createPrismaCustomerService(): Promise<CustomerService> {
  const { createPrismaCustomerRepository } = await import("./customer-prisma.repository.js");
  const repository = await createPrismaCustomerRepository();

  return new CustomerService(repository);
}
