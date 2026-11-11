// B-ASS-08b · G12 — o armazém Prisma do cliente no provedor: as colunas `asaas_customer_id`/`mp_customer_id` do perfil de
// cobrança (FORCE RLS), sob `withTenantRls(tenantId)`. SQL LITERAL por provedor (o guard de escritores lê só literal); um
// provedor fora da lista fechada não lê nem grava nada. Só grava quando o valor muda (`IS DISTINCT FROM`), e o perfil
// ausente não é criado aqui — quem cria o perfil é a rota `PUT …/billing-profile`.

import type { PrismaClient } from "@prisma/client";

import { withTenantRls } from "../../../database/rls.js";
import type { ProviderCustomerStore } from "./provider-customer.store.js";

export class PrismaProviderCustomerStore implements ProviderCustomerStore {
  constructor(private readonly client: PrismaClient) {}

  async get(tenantId: string, provider: string): Promise<string | null> {
    if (provider !== "asaas" && provider !== "mercadopago") return null;
    return withTenantRls(this.client, tenantId, async (tx) => {
      const rows =
        provider === "asaas"
          ? ((await tx.$queryRawUnsafe(`SELECT asaas_customer_id AS customer_id FROM tenant_billing_profiles WHERE tenant_id = $1::uuid`, tenantId)) as Array<{ customer_id: string | null }>)
          : ((await tx.$queryRawUnsafe(`SELECT mp_customer_id AS customer_id FROM tenant_billing_profiles WHERE tenant_id = $1::uuid`, tenantId)) as Array<{ customer_id: string | null }>);
      return rows[0]?.customer_id ?? null;
    });
  }

  async set(tenantId: string, provider: string, customerId: string, now: Date): Promise<void> {
    if (provider !== "asaas" && provider !== "mercadopago") return;
    await withTenantRls(this.client, tenantId, async (tx) => {
      if (provider === "asaas") {
        await tx.$executeRawUnsafe(
          `UPDATE tenant_billing_profiles SET asaas_customer_id = $2, updated_at = $3 WHERE tenant_id = $1::uuid AND asaas_customer_id IS DISTINCT FROM $2`,
          tenantId,
          customerId,
          now,
        );
      } else {
        await tx.$executeRawUnsafe(
          `UPDATE tenant_billing_profiles SET mp_customer_id = $2, updated_at = $3 WHERE tenant_id = $1::uuid AND mp_customer_id IS DISTINCT FROM $2`,
          tenantId,
          customerId,
          now,
        );
      }
    });
  }
}
