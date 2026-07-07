import type { Request } from "express";

import { recordRequestAuditBestEffort } from "../core-saas/audit/audit-request-context.js";
import { requireTenantContext } from "../core-saas/middleware/rbac.middleware.js";
import { readRouteParam } from "../core-saas/routes/http.js";
import { toCustomerDto, toCustomerListDto } from "./customer.dto.js";
import type { CustomerService } from "./customer.service.js";

export type CustomerServiceResolver = () => Promise<CustomerService>;

export class CustomerController {
  constructor(private readonly resolveService: CustomerServiceResolver) {}

  async list(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const result = await service.list(actor, request.query as Record<string, unknown>);

    return {
      body: toCustomerListDto(result),
    };
  }

  async create(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const customer = await service.create(actor, request.body ?? {});

    await recordRequestAuditBestEffort(request, {
      action: "customer.created",
      resourceType: "customer",
      resourceId: customer.id,
      outcome: "success",
      severity: "info",
      metadata: {
        name: customer.name,
      },
    });

    return {
      status: 201,
      data: toCustomerDto(customer),
    };
  }

  async get(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const customer = await service.get(actor, readRouteParam(request.params.customerId));

    return {
      data: toCustomerDto(customer),
    };
  }

  async update(request: Request) {
    const [service, actor] = await this.resolveServiceWithActor(request);
    const body = (request.body ?? {}) as Record<string, unknown>;
    const customer = await service.update(actor, readRouteParam(request.params.customerId), body);

    const deactivating = body.is_active === false || body.isActive === false;

    await recordRequestAuditBestEffort(request, {
      action: deactivating ? "customer.deactivated" : "customer.updated",
      resourceType: "customer",
      resourceId: customer.id,
      outcome: "success",
      severity: "info",
      metadata: deactivating
        ? {
            name: customer.name,
            isActive: customer.isActive,
          }
        : {
            name: customer.name,
          },
    });

    return {
      data: toCustomerDto(customer),
    };
  }

  private async resolveServiceWithActor(request: Request) {
    return [await this.resolveService(), requireTenantContext(request)] as const;
  }
}
