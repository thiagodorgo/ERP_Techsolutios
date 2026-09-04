import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

import {
  dropEphemeralRoleResilient,
  sweepOrphanEphemeralRoles,
  withRoleCatalogLock,
} from "./helpers/auth-identity-fixture.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("PostgreSQL RLS isolation requires DATABASE_URL and a migrated database", {
    skip: "Set DATABASE_URL, start PostgreSQL and run migrations to execute this test.",
  });
} else {
  test("PostgreSQL RLS isolates users and checklists by app.current_tenant_id", async () => {
    const [{ PrismaPg }, { PrismaClient }, { withTenantRls }] = await Promise.all([
      import("@prisma/adapter-pg"),
      import("@prisma/client"),
      import("../src/database/rls.js"),
    ]);

    const adminClient = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    const roleName = `rls_test_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const rolePassword = `rls-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    // B-O6R-01 ciclo 2 (A-1/B-5): este arquivo é o QUARTO escritor de catálogo do batch -db —
    // CREATE ROLE/GRANT disputam pg_authid/pg_auth_members sob o paralelismo do node --test.
    // Toma o MESMO advisory lock do arnês de identidade (helper exportado); os grants não mudam.
    //
    // SAN2-4b, C3 (porta 2): o criador da família `rls_test_` passa a VARRER antes de criar, no
    // mesmo desenho de `createEphemeralRole` (sweep e criação sob o MESMO lock). Antes disto o
    // varredor tinha um chamador único que não era este arquivo, e rodar esta suíte sozinha não
    // recolhia nada — medido 2/2 no vermelho-controle do bloco. O corte de 60 min do varredor
    // protege as roles das execuções irmãs em paralelo; só órfã velha é alcançada.
    await withRoleCatalogLock(adminClient, async (tx) => {
      await sweepOrphanEphemeralRoles(tx);
      await tx.$executeRawUnsafe(
        `CREATE ROLE "${roleName}" LOGIN PASSWORD '${escapeSqlLiteral(rolePassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
      );
      await tx.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
      await tx.$executeRawUnsafe(
        `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
      );
      await tx.$executeRawUnsafe(
        `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
      );
    });

    const client = new PrismaClient({
      adapter: new PrismaPg({
        connectionString: buildConnectionStringForRole(
          connectionString,
          roleName,
          rolePassword,
        ),
      }),
    });
    const suffix = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const tenantIds: string[] = [];
    let allocationRunId: string | undefined;
    let chargeCalculationRunId: string | undefined;
    let chargeRuleId: string | undefined;

    try {
      const tenantA = await client.tenant.create({
        data: {
          name: `RLS Tenant A ${suffix}`,
          slug: `rls-tenant-a-${suffix}`,
        },
      });
      const tenantB = await client.tenant.create({
        data: {
          name: `RLS Tenant B ${suffix}`,
          slug: `rls-tenant-b-${suffix}`,
        },
      });
      // Ω4C PR-01 / D-Ω4C-RECON-07 — 3º tenant EFÊMERO (nunca seed) para provar isolamento de
      // `attachments` (anexos genéricos polimórficos) com 3 tenants distintos.
      const tenantC = await client.tenant.create({
        data: {
          name: `RLS Tenant C ${suffix}`,
          slug: `rls-tenant-c-${suffix}`,
        },
      });
      tenantIds.push(tenantA.id, tenantB.id, tenantC.id);

      const [allocationRun] = await client.$queryRaw<Array<{ id: string }>>`
        INSERT INTO cloud_cost_allocation_runs (
          provider,
          status,
          period_start,
          period_end,
          strategy,
          total_imported_cost,
          total_allocated_cost,
          total_unallocated_cost,
          currency,
          metadata
        )
        VALUES (
          'aws',
          'completed',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 day',
          'usage_weighted_v1',
          30,
          30,
          0,
          'USD',
          '{"source":"rls-test"}'::jsonb
        )
        RETURNING id
      `;
      allocationRunId = allocationRun.id;
      const [chargeRule] = await client.$queryRaw<Array<{ id: string }>>`
        INSERT INTO cloud_charge_rules (
          plan_code,
          name,
          is_active,
          priority,
          effective_from,
          currency,
          markup_type,
          markup_value,
          minimum_monthly_charge,
          included_cloud_cost,
          rounding_mode,
          metadata
        )
        VALUES (
          'default',
          'RLS Default Cloud Charge Rule',
          true,
          100,
          CURRENT_DATE,
          'BRL',
          'percentage',
          60,
          0,
          0,
          'nearest_cent',
          '{"source":"rls-test"}'::jsonb
        )
        RETURNING id
      `;
      chargeRuleId = chargeRule.id;
      const [chargeCalculationRun] = await client.$queryRaw<Array<{ id: string }>>`
        INSERT INTO cloud_charge_calculation_runs (
          status,
          period_start,
          period_end,
          source_allocation_run_id,
          strategy,
          total_allocated_cost,
          total_charge_amount,
          total_margin_amount,
          total_discount_amount,
          currency,
          metadata
        )
        VALUES (
          'completed',
          CURRENT_DATE,
          CURRENT_DATE + INTERVAL '1 day',
          ${allocationRunId}::uuid,
          'markup_rules_v1',
          30,
          48,
          18,
          0,
          'BRL',
          '{"source":"rls-test"}'::jsonb
        )
        RETURNING id
      `;
      chargeCalculationRunId = chargeCalculationRun.id;

      const tenantAData = await withTenantRls(client, tenantA.id, async (tx) => {
        const branch = await tx.branch.create({
          data: {
            tenant_id: tenantA.id,
            name: "RLS Branch A",
            code: `RLS-A-${suffix}`,
          },
        });
        const user = await tx.user.create({
          data: {
            tenant_id: tenantA.id,
            branch_id: branch.id,
            name: "RLS User A",
            email: `rls-a-${suffix}@example.com`,
          },
        });
        const [fieldLocation] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_operator_locations (
            tenant_id,
            operator_user_id,
            source,
            latitude,
            longitude,
            accuracy_meters,
            recorded_at,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${user.id}::uuid,
            'mobile',
            -23.550520,
            -46.633308,
            8,
            now(),
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;
        const [workOrder] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_orders (
            tenant_id,
            code,
            title,
            priority,
            status,
            assigned_operator_id,
            assigned_user_id,
            created_by,
            updated_by
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${`RLS-A-${suffix}`},
            'RLS Work Order A',
            'medium',
            'assigned',
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid
          )
          RETURNING id
        `;
        const [workOrderEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_order_events (
            tenant_id,
            work_order_id,
            event_type,
            to_status,
            actor_user_id,
            message,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${workOrder.id}::uuid,
            'work_order_created',
            'open',
            ${user.id}::uuid,
            'RLS work order A created',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [workOrderAssignment] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_order_assignments (
            tenant_id,
            work_order_id,
            operator_id,
            user_id,
            assigned_by,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${workOrder.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [fieldDispatch] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_dispatches (
            tenant_id,
            work_order_id,
            operator_user_id,
            status,
            observation,
            created_by,
            updated_by,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${workOrder.id}::uuid,
            ${user.id}::uuid,
            'assigned',
            'RLS field dispatch A',
            ${user.id}::uuid,
            ${user.id}::uuid,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [fieldDispatchEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_dispatch_events (
            tenant_id,
            dispatch_id,
            work_order_id,
            event_type,
            to_status,
            actor_user_id,
            message,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${fieldDispatch.id}::uuid,
            ${workOrder.id}::uuid,
            'field_dispatch_created',
            'assigned',
            ${user.id}::uuid,
            'RLS field dispatch A created',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [template] = await tx.$queryRaw<Array<{ id: string; version: number }>>`
          INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema)
          VALUES (${tenantA.id}::uuid, 'RLS Checklist A', 'custom', 'published', 1, ${JSON.stringify({ source: "rls-test" })}::jsonb)
          RETURNING id, version
        `;
        const [component] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_template_components (
            tenant_id,
            template_id,
            component_key,
            type,
            label,
            required,
            order_index,
            config,
            validation_rules,
            visibility_rules
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${template.id}::uuid,
            'observation',
            'observation',
            'Observation',
            true,
            0,
            '{}'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [run] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_runs (tenant_id, template_id, template_version, status)
          VALUES (${tenantA.id}::uuid, ${template.id}::uuid, ${template.version}, 'in_progress')
          RETURNING id
        `;
        await tx.$executeRaw`
          INSERT INTO checklist_run_answers (tenant_id, run_id, component_id, value, metadata)
          VALUES (
            ${tenantA.id}::uuid,
            ${run.id}::uuid,
            ${component.id}::uuid,
            ${JSON.stringify({ text: "Tenant A answer" })}::jsonb,
            '{}'::jsonb
          )
        `;
        const [attachment] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_attachments (
            tenant_id,
            run_id,
            component_id,
            file_url,
            file_name,
            mime_type,
            size_bytes,
            metadata,
            created_by
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${run.id}::uuid,
            ${component.id}::uuid,
            'local://checklist-attachments/tenant-a/evidence-a.pdf',
            'evidence-a.pdf',
            'application/pdf',
            128,
            '{"storageDriver":"local","storageKey":"tenant-a/evidence-a.pdf"}'::jsonb,
            ${user.id}::uuid
          )
          RETURNING id
        `;
        const [notification] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO notifications (
            tenant_id,
            recipient_user_id,
            type,
            title,
            message,
            severity,
            status,
            source_type,
            source_id,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            ${user.id}::uuid,
            'checklist_run.completed',
            'RLS Notification A',
            'Tenant A notification',
            'success',
            'unread',
            'checklist_run',
            ${run.id},
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [usageEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO cloud_usage_events (
            tenant_id,
            source_type,
            source_id,
            metric_key,
            quantity,
            unit,
            occurred_at,
            idempotency_key,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            'checklist_run',
            ${run.id},
            'checklist_run.completed',
            1,
            'count',
            now(),
            ${`rls-${suffix}-tenant-a-usage-event`},
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [usageAggregate] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO cloud_usage_daily_aggregates (
            tenant_id,
            date,
            metric_key,
            quantity,
            unit,
            source_type,
            metadata
          )
          VALUES (
            ${tenantA.id}::uuid,
            CURRENT_DATE,
            'checklist_run.completed',
            1,
            'count',
            'checklist_run',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [cloudCostAllocation] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO tenant_cloud_cost_allocations (
            allocation_run_id,
            tenant_id,
            provider,
            period_start,
            period_end,
            service_code,
            usage_type,
            cost_category,
            allocation_method,
            allocation_basis_metric_key,
            allocation_basis_quantity,
            allocation_ratio,
            allocated_cost,
            currency,
            source_cost_line_item_ids,
            metadata
          )
          VALUES (
            ${allocationRunId}::uuid,
            ${tenantA.id}::uuid,
            'aws',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '1 day',
            'AmazonS3',
            'TimedStorage-ByteHrs',
            'storage',
            'storage_usage_weight',
            'storage.bytes',
            10,
            0.333333333333,
            10,
            'USD',
            '[]'::jsonb,
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;
        const [tenantCloudCharge] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO tenant_cloud_charges (
            calculation_run_id,
            tenant_id,
            source_allocation_run_id,
            cloud_charge_rule_id,
            period_start,
            period_end,
            allocated_cost,
            included_cloud_cost,
            billable_cost,
            markup_type,
            markup_value,
            minimum_monthly_charge,
            gross_charge_amount,
            discount_amount,
            final_charge_amount,
            margin_amount,
            margin_percentage,
            currency,
            status,
            metadata
          )
          VALUES (
            ${chargeCalculationRunId}::uuid,
            ${tenantA.id}::uuid,
            ${allocationRunId}::uuid,
            ${chargeRuleId}::uuid,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '1 day',
            10,
            0,
            10,
            'percentage',
            60,
            0,
            16,
            0,
            16,
            6,
            60,
            'BRL',
            'draft',
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;

        return {
          branchId: branch.id,
          userId: user.id,
          templateId: template.id,
          runId: run.id,
          attachmentId: attachment.id,
          notificationId: notification.id,
          usageAggregateId: usageAggregate.id,
          usageEventId: usageEvent.id,
          cloudCostAllocationId: cloudCostAllocation.id,
          fieldLocationId: fieldLocation.id,
          fieldDispatchEventId: fieldDispatchEvent.id,
          fieldDispatchId: fieldDispatch.id,
          tenantCloudChargeId: tenantCloudCharge.id,
          workOrderAssignmentId: workOrderAssignment.id,
          workOrderEventId: workOrderEvent.id,
          workOrderId: workOrder.id,
        };
      });

      const tenantBData = await withTenantRls(client, tenantB.id, async (tx) => {
        const branch = await tx.branch.create({
          data: {
            tenant_id: tenantB.id,
            name: "RLS Branch B",
            code: `RLS-B-${suffix}`,
          },
        });
        const user = await tx.user.create({
          data: {
            tenant_id: tenantB.id,
            branch_id: branch.id,
            name: "RLS User B",
            email: `rls-b-${suffix}@example.com`,
          },
        });
        const [fieldLocation] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_operator_locations (
            tenant_id,
            operator_user_id,
            source,
            latitude,
            longitude,
            accuracy_meters,
            recorded_at,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${user.id}::uuid,
            'mobile',
            -22.906847,
            -43.172897,
            10,
            now(),
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;
        const [workOrder] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_orders (
            tenant_id,
            code,
            title,
            priority,
            status,
            assigned_operator_id,
            assigned_user_id,
            created_by,
            updated_by
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${`RLS-B-${suffix}`},
            'RLS Work Order B',
            'medium',
            'assigned',
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid
          )
          RETURNING id
        `;
        const [workOrderEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_order_events (
            tenant_id,
            work_order_id,
            event_type,
            to_status,
            actor_user_id,
            message,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${workOrder.id}::uuid,
            'work_order_created',
            'open',
            ${user.id}::uuid,
            'RLS work order B created',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [workOrderAssignment] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO work_order_assignments (
            tenant_id,
            work_order_id,
            operator_id,
            user_id,
            assigned_by,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${workOrder.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            ${user.id}::uuid,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [fieldDispatch] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_dispatches (
            tenant_id,
            work_order_id,
            operator_user_id,
            status,
            observation,
            created_by,
            updated_by,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${workOrder.id}::uuid,
            ${user.id}::uuid,
            'assigned',
            'RLS field dispatch B',
            ${user.id}::uuid,
            ${user.id}::uuid,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [fieldDispatchEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO field_dispatch_events (
            tenant_id,
            dispatch_id,
            work_order_id,
            event_type,
            to_status,
            actor_user_id,
            message,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${fieldDispatch.id}::uuid,
            ${workOrder.id}::uuid,
            'field_dispatch_created',
            'assigned',
            ${user.id}::uuid,
            'RLS field dispatch B created',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [template] = await tx.$queryRaw<Array<{ id: string; version: number }>>`
          INSERT INTO checklist_templates (tenant_id, name, type, status, version, schema)
          VALUES (${tenantB.id}::uuid, 'RLS Checklist B', 'custom', 'published', 1, ${JSON.stringify({ source: "rls-test" })}::jsonb)
          RETURNING id, version
        `;
        const [component] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_template_components (
            tenant_id,
            template_id,
            component_key,
            type,
            label,
            required,
            order_index,
            config,
            validation_rules,
            visibility_rules
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${template.id}::uuid,
            'observation',
            'observation',
            'Observation',
            true,
            0,
            '{}'::jsonb,
            '{}'::jsonb,
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [run] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_runs (tenant_id, template_id, template_version, status)
          VALUES (${tenantB.id}::uuid, ${template.id}::uuid, ${template.version}, 'in_progress')
          RETURNING id
        `;
        await tx.$executeRaw`
          INSERT INTO checklist_run_answers (tenant_id, run_id, component_id, value, metadata)
          VALUES (
            ${tenantB.id}::uuid,
            ${run.id}::uuid,
            ${component.id}::uuid,
            ${JSON.stringify({ text: "Tenant B answer" })}::jsonb,
            '{}'::jsonb
          )
        `;
        const [attachment] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO checklist_attachments (
            tenant_id,
            run_id,
            component_id,
            file_url,
            file_name,
            mime_type,
            size_bytes,
            metadata,
            created_by
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${run.id}::uuid,
            ${component.id}::uuid,
            'local://checklist-attachments/tenant-b/evidence-b.pdf',
            'evidence-b.pdf',
            'application/pdf',
            128,
            '{"storageDriver":"local","storageKey":"tenant-b/evidence-b.pdf"}'::jsonb,
            ${user.id}::uuid
          )
          RETURNING id
        `;
        const [notification] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO notifications (
            tenant_id,
            recipient_user_id,
            type,
            title,
            message,
            severity,
            status,
            source_type,
            source_id,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            ${user.id}::uuid,
            'checklist_run.completed',
            'RLS Notification B',
            'Tenant B notification',
            'success',
            'unread',
            'checklist_run',
            ${run.id},
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [usageEvent] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO cloud_usage_events (
            tenant_id,
            source_type,
            source_id,
            metric_key,
            quantity,
            unit,
            occurred_at,
            idempotency_key,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            'checklist_run',
            ${run.id},
            'checklist_run.completed',
            1,
            'count',
            now(),
            ${`rls-${suffix}-tenant-b-usage-event`},
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [usageAggregate] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO cloud_usage_daily_aggregates (
            tenant_id,
            date,
            metric_key,
            quantity,
            unit,
            source_type,
            metadata
          )
          VALUES (
            ${tenantB.id}::uuid,
            CURRENT_DATE,
            'checklist_run.completed',
            1,
            'count',
            'checklist_run',
            '{}'::jsonb
          )
          RETURNING id
        `;
        const [cloudCostAllocation] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO tenant_cloud_cost_allocations (
            allocation_run_id,
            tenant_id,
            provider,
            period_start,
            period_end,
            service_code,
            usage_type,
            cost_category,
            allocation_method,
            allocation_basis_metric_key,
            allocation_basis_quantity,
            allocation_ratio,
            allocated_cost,
            currency,
            source_cost_line_item_ids,
            metadata
          )
          VALUES (
            ${allocationRunId}::uuid,
            ${tenantB.id}::uuid,
            'aws',
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '1 day',
            'AmazonS3',
            'TimedStorage-ByteHrs',
            'storage',
            'storage_usage_weight',
            'storage.bytes',
            20,
            0.666666666667,
            20,
            'USD',
            '[]'::jsonb,
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;
        const [tenantCloudCharge] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO tenant_cloud_charges (
            calculation_run_id,
            tenant_id,
            source_allocation_run_id,
            cloud_charge_rule_id,
            period_start,
            period_end,
            allocated_cost,
            included_cloud_cost,
            billable_cost,
            markup_type,
            markup_value,
            minimum_monthly_charge,
            gross_charge_amount,
            discount_amount,
            final_charge_amount,
            margin_amount,
            margin_percentage,
            currency,
            status,
            metadata
          )
          VALUES (
            ${chargeCalculationRunId}::uuid,
            ${tenantB.id}::uuid,
            ${allocationRunId}::uuid,
            ${chargeRuleId}::uuid,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '1 day',
            20,
            0,
            20,
            'percentage',
            60,
            0,
            32,
            0,
            32,
            12,
            60,
            'BRL',
            'draft',
            '{"source":"rls-test"}'::jsonb
          )
          RETURNING id
        `;

        return {
          branchId: branch.id,
          userId: user.id,
          templateId: template.id,
          runId: run.id,
          attachmentId: attachment.id,
          notificationId: notification.id,
          usageAggregateId: usageAggregate.id,
          usageEventId: usageEvent.id,
          cloudCostAllocationId: cloudCostAllocation.id,
          fieldLocationId: fieldLocation.id,
          fieldDispatchEventId: fieldDispatchEvent.id,
          fieldDispatchId: fieldDispatch.id,
          tenantCloudChargeId: tenantCloudCharge.id,
          workOrderAssignmentId: workOrderAssignment.id,
          workOrderEventId: workOrderEvent.id,
          workOrderId: workOrder.id,
        };
      });

      // Ω4C PR-01 (RN-ANEXO-08) — `attachments` (anexos genéricos polimórficos) com 3 tenants EFÊMEROS
      // (A, B, C). entity_id é um UUID qualquer (a tabela só tem FK ao tenant); o par entity_type/entity_id
      // é polimórfico. Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível in-tenant.
      const insertGenericAttachment = (tx: typeof client, tenantId: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO attachments (
          tenant_id, entity_type, entity_id, file_name, extension, content_type, size_bytes,
          storage_provider, storage_key, file_url, status, metadata
        )
        VALUES (
          ${tenantId}::uuid, 'maintenance_order', gen_random_uuid(), 'evidence.pdf', 'pdf',
          'application/pdf', 128, 'local', ${`maintenance_order/${tenantId}/evidence.pdf`},
          ${`local://attachments/${tenantId}/evidence.pdf`}, 'stored', '{}'::jsonb
        )
        RETURNING id
      `;
      const genericAttachmentAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await insertGenericAttachment(tx as typeof client, tenantA.id);
        return row.id;
      });
      const genericAttachmentBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await insertGenericAttachment(tx as typeof client, tenantB.id);
        return row.id;
      });
      const genericAttachmentCId = await withTenantRls(client, tenantC.id, async (tx) => {
        const [row] = await insertGenericAttachment(tx as typeof client, tenantC.id);
        return row.id;
      });

      const genericAttachmentsWithoutContext = await client.attachment.findMany({
        where: {
          id: {
            in: [genericAttachmentAId, genericAttachmentBId, genericAttachmentCId],
          },
        },
      });
      assert.deepEqual(
        genericAttachmentsWithoutContext.map((attachment) => attachment.id),
        [],
        "tenant-scoped attachments must not be visible without app.current_tenant_id",
      );

      const tenantAAttachmentView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.attachment.findMany({
          where: {
            id: {
              in: [genericAttachmentAId, genericAttachmentBId, genericAttachmentCId],
            },
          },
        });
        const crossTenantAttachmentUpdate = await tx.attachment.updateMany({
          where: {
            id: {
              in: [genericAttachmentBId, genericAttachmentCId],
            },
          },
          data: {
            status: "rejected",
          },
        });
        return {
          visibleIds: visible.map((attachment) => attachment.id),
          crossUpdatedRows: crossTenantAttachmentUpdate.count,
        };
      });
      assert.deepEqual(
        tenantAAttachmentView.visibleIds,
        [genericAttachmentAId],
        "tenant A must only see its own attachment (not tenant B/C)",
      );
      assert.equal(
        tenantAAttachmentView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C attachments",
      );

      const tenantBAttachment = await withTenantRls(client, tenantB.id, (tx) =>
        tx.attachment.findUnique({
          where: {
            id: genericAttachmentBId,
          },
        }),
      );
      assert.equal(tenantBAttachment?.status, "stored", "tenant B attachment stays visible + untouched in-tenant");
      const tenantCAttachment = await withTenantRls(client, tenantC.id, (tx) =>
        tx.attachment.findUnique({
          where: {
            id: genericAttachmentCId,
          },
        }),
      );
      assert.equal(tenantCAttachment?.status, "stored", "tenant C attachment stays visible + untouched in-tenant");

      // Ω4C PR-02 (RN-FIN-ORIGEM: multi-tenant) — Contas a Pagar por ORIGEM sobre financial_titles.source_type/
      // source_id (colunas ADITIVAS desta fatia) com 3 tenants EFÊMEROS (A, B, C). source_id é um UUID qualquer
      // (SEM FK nativa ao alvo — integridade app-level). Prova: invisível sem contexto + cross-tenant updateMany
      // count=0 + visível/intocado in-tenant. A tabela já tem RLS ENABLE/FORCE + policy desde 20260810000000;
      // as colunas herdam a política (mesma linha).
      const insertSourceTitle = (tx: typeof client, tenantId: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO financial_titles (
          tenant_id, direction, party_type, party_name, amount, currency, issue_date, due_date,
          paid_amount, status, competencia, source_type, source_id
        )
        VALUES (
          ${tenantId}::uuid, 'payable', 'supplier', 'RLS Fornecedor', 100.00, 'BRL', now(), now(),
          0, 'open', '2026-07', 'fuel_log', gen_random_uuid()
        )
        RETURNING id
      `;
      const sourceTitleAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await insertSourceTitle(tx as typeof client, tenantA.id);
        return row.id;
      });
      const sourceTitleBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await insertSourceTitle(tx as typeof client, tenantB.id);
        return row.id;
      });
      const sourceTitleCId = await withTenantRls(client, tenantC.id, async (tx) => {
        const [row] = await insertSourceTitle(tx as typeof client, tenantC.id);
        return row.id;
      });

      const sourceTitlesWithoutContext = await client.financialTitle.findMany({
        where: {
          id: {
            in: [sourceTitleAId, sourceTitleBId, sourceTitleCId],
          },
        },
      });
      assert.deepEqual(
        sourceTitlesWithoutContext.map((title) => title.id),
        [],
        "tenant-scoped financial titles (by source) must not be visible without app.current_tenant_id",
      );

      const tenantASourceTitleView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.financialTitle.findMany({
          where: {
            id: {
              in: [sourceTitleAId, sourceTitleBId, sourceTitleCId],
            },
          },
        });
        const crossTenantUpdate = await tx.financialTitle.updateMany({
          where: {
            id: {
              in: [sourceTitleBId, sourceTitleCId],
            },
          },
          data: {
            source_type: "maintenance_order",
          },
        });
        return {
          visibleIds: visible.map((title) => title.id),
          crossUpdatedRows: crossTenantUpdate.count,
        };
      });
      assert.deepEqual(
        tenantASourceTitleView.visibleIds,
        [sourceTitleAId],
        "tenant A must only see its own source-launched financial title (not tenant B/C)",
      );
      assert.equal(
        tenantASourceTitleView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C financial titles (by source)",
      );

      const tenantBSourceTitle = await withTenantRls(client, tenantB.id, (tx) =>
        tx.financialTitle.findUnique({
          where: {
            id: sourceTitleBId,
          },
        }),
      );
      assert.equal(tenantBSourceTitle?.source_type, "fuel_log", "tenant B source title stays visible + untouched in-tenant");
      const tenantCSourceTitle = await withTenantRls(client, tenantC.id, (tx) =>
        tx.financialTitle.findUnique({
          where: {
            id: sourceTitleCId,
          },
        }),
      );
      assert.equal(tenantCSourceTitle?.source_type, "fuel_log", "tenant C source title stays visible + untouched in-tenant");

      // Ω4C PR-03 (RN-EXT-08) — professional_statement_entries (Extrato do profissional) com 3 tenants EFÊMEROS
      // (A, B, C). A parcela referencia um operator_profile via FK composta (tenant_id, operator_profile_id) →
      // 1 profissional por tenant (A/B reusam o user já criado; C ganha branch+user+profile próprios). Prova:
      // invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant. RLS ENABLE/FORCE +
      // policy da migration 20260823000000; tenant_id 1º de todo índice.
      const createOperatorProfile = (tx: typeof client, tenantId: string, userId: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO operator_profiles (tenant_id, user_id) VALUES (${tenantId}::uuid, ${userId}::uuid)
        RETURNING id
      `;
      const operatorProfileAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await createOperatorProfile(tx as typeof client, tenantA.id, tenantAData.userId);
        return row.id;
      });
      const operatorProfileBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await createOperatorProfile(tx as typeof client, tenantB.id, tenantBData.userId);
        return row.id;
      });
      const tenantCProfessional = await withTenantRls(client, tenantC.id, async (tx) => {
        const branch = await tx.branch.create({
          data: { tenant_id: tenantC.id, name: "RLS Branch C", code: `RLS-C-${suffix}` },
        });
        const user = await tx.user.create({
          data: { tenant_id: tenantC.id, branch_id: branch.id, name: "RLS User C", email: `rls-c-${suffix}@example.com` },
        });
        const [profile] = await createOperatorProfile(tx as typeof client, tenantC.id, user.id);
        return { operatorProfileId: profile.id, userId: user.id };
      });

      const insertStatementEntry = (tx: typeof client, tenantId: string, operatorProfileId: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO professional_statement_entries (
          tenant_id, operator_profile_id, group_id, entry_type, direction, description,
          amount, currency, installment_number, installment_total, due_date, competencia, status
        )
        VALUES (
          ${tenantId}::uuid, ${operatorProfileId}::uuid, gen_random_uuid(), 'adjustment', 'debit', 'RLS ajuste',
          100.00, 'BRL', 1, 1, now(), '2026-07', 'pending'
        )
        RETURNING id
      `;
      const statementEntryAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await insertStatementEntry(tx as typeof client, tenantA.id, operatorProfileAId);
        return row.id;
      });
      const statementEntryBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await insertStatementEntry(tx as typeof client, tenantB.id, operatorProfileBId);
        return row.id;
      });
      const statementEntryCId = await withTenantRls(client, tenantC.id, async (tx) => {
        const [row] = await insertStatementEntry(tx as typeof client, tenantC.id, tenantCProfessional.operatorProfileId);
        return row.id;
      });

      const statementEntriesWithoutContext = await client.professionalStatementEntry.findMany({
        where: { id: { in: [statementEntryAId, statementEntryBId, statementEntryCId] } },
      });
      assert.deepEqual(
        statementEntriesWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped professional statement entries must not be visible without app.current_tenant_id",
      );

      const tenantAStatementView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.professionalStatementEntry.findMany({
          where: { id: { in: [statementEntryAId, statementEntryBId, statementEntryCId] } },
        });
        const crossTenantUpdate = await tx.professionalStatementEntry.updateMany({
          where: { id: { in: [statementEntryBId, statementEntryCId] } },
          data: { status: "settled" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAStatementView.visibleIds,
        [statementEntryAId],
        "tenant A must only see its own professional statement entry (not tenant B/C)",
      );
      assert.equal(
        tenantAStatementView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C professional statement entries",
      );

      const tenantBStatementEntry = await withTenantRls(client, tenantB.id, (tx) =>
        tx.professionalStatementEntry.findUnique({ where: { id: statementEntryBId } }),
      );
      assert.equal(tenantBStatementEntry?.status, "pending", "tenant B statement entry stays visible + untouched in-tenant");
      const tenantCStatementEntry = await withTenantRls(client, tenantC.id, (tx) =>
        tx.professionalStatementEntry.findUnique({ where: { id: statementEntryCId } }),
      );
      assert.equal(tenantCStatementEntry?.status, "pending", "tenant C statement entry stays visible + untouched in-tenant");

      // Ω4C PR-04 (RN-NOTIF-06) — scheduled_notifications (definição agendada do motor de notificações) com 3
      // tenants EFÊMEROS (A, B, C). FK composta (tenant_id, created_by) → users (A/B reusam o user já criado; C
      // usa o user criado no bloco do extrato). Prova: invisível sem contexto + cross-tenant updateMany count=0 +
      // visível/intocado in-tenant. RLS ENABLE/FORCE + policy da migration 20260824000000; tenant_id 1º de todo índice.
      const insertScheduledNotification = (tx: typeof client, tenantId: string, createdBy: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO scheduled_notifications (
          tenant_id, title, message, notify_at, visibility, custom_recipient_ids, status, created_by
        )
        VALUES (
          ${tenantId}::uuid, 'RLS agendada', 'RLS mensagem', now(), 'private', '[]'::jsonb, 'pending', ${createdBy}::uuid
        )
        RETURNING id
      `;
      const scheduledNotificationAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await insertScheduledNotification(tx as typeof client, tenantA.id, tenantAData.userId);
        return row.id;
      });
      const scheduledNotificationBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await insertScheduledNotification(tx as typeof client, tenantB.id, tenantBData.userId);
        return row.id;
      });
      const scheduledNotificationCId = await withTenantRls(client, tenantC.id, async (tx) => {
        const [row] = await insertScheduledNotification(tx as typeof client, tenantC.id, tenantCProfessional.userId);
        return row.id;
      });

      const scheduledWithoutContext = await client.scheduledNotification.findMany({
        where: { id: { in: [scheduledNotificationAId, scheduledNotificationBId, scheduledNotificationCId] } },
      });
      assert.deepEqual(
        scheduledWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped scheduled notifications must not be visible without app.current_tenant_id",
      );

      const tenantAScheduledView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.scheduledNotification.findMany({
          where: { id: { in: [scheduledNotificationAId, scheduledNotificationBId, scheduledNotificationCId] } },
        });
        const crossTenantUpdate = await tx.scheduledNotification.updateMany({
          where: { id: { in: [scheduledNotificationBId, scheduledNotificationCId] } },
          data: { status: "cancelled" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAScheduledView.visibleIds,
        [scheduledNotificationAId],
        "tenant A must only see its own scheduled notification (not tenant B/C)",
      );
      assert.equal(
        tenantAScheduledView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C scheduled notifications",
      );

      const tenantBScheduled = await withTenantRls(client, tenantB.id, (tx) =>
        tx.scheduledNotification.findUnique({ where: { id: scheduledNotificationBId } }),
      );
      assert.equal(tenantBScheduled?.status, "pending", "tenant B scheduled notification stays visible + untouched in-tenant");
      const tenantCScheduled = await withTenantRls(client, tenantC.id, (tx) =>
        tx.scheduledNotification.findUnique({ where: { id: scheduledNotificationCId } }),
      );
      assert.equal(tenantCScheduled?.status, "pending", "tenant C scheduled notification stays visible + untouched in-tenant");

      // Ω5P PR-01 (D-Ω5P-YARD-*) — yards → yard_areas → yard_spots (pátio físico + árvore + vaga) com 3 tenants
      // EFÊMEROS (A, B, C). O par público-credenciado × privado-contratual entra como dado do tenant (perfil real
      // = PR-02). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant.
      // RLS ENABLE/FORCE + policy da migration 20260833000000; tenant_id 1º de todo índice.
      const insertYardTriple = async (tx: typeof client, tenantId: string) => {
        const [yard] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO yards (tenant_id, name, address) VALUES (${tenantId}::uuid, 'RLS Pátio', 'Rua RLS, 1') RETURNING id
        `;
        const [area] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO yard_areas (tenant_id, yard_id, kind, name)
          VALUES (${tenantId}::uuid, ${yard.id}::uuid, 'BLOCK', 'Quadra RLS') RETURNING id
        `;
        const [spot] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO yard_spots (tenant_id, area_id, code)
          VALUES (${tenantId}::uuid, ${area.id}::uuid, 'A-01') RETURNING id
        `;
        return { yard_id: yard.id, area_id: area.id, spot_id: spot.id };
      };
      const yardA = await withTenantRls(client, tenantA.id, (tx) => insertYardTriple(tx as typeof client, tenantA.id));
      const yardB = await withTenantRls(client, tenantB.id, (tx) => insertYardTriple(tx as typeof client, tenantB.id));
      const yardC = await withTenantRls(client, tenantC.id, (tx) => insertYardTriple(tx as typeof client, tenantC.id));

      // yards invisíveis sem app.current_tenant_id.
      const yardsWithoutContext = await client.yard.findMany({
        where: { id: { in: [yardA.yard_id, yardB.yard_id, yardC.yard_id] } },
      });
      assert.deepEqual(
        yardsWithoutContext.map((yard) => yard.id),
        [],
        "tenant-scoped yards must not be visible without app.current_tenant_id",
      );

      // A vê só a sua vaga; cross-tenant updateMany (B/C) count=0. Setar BLOCKED preserva current_process_id NULL
      // (satisfaz o CHECK de coerência) — mas RLS barra as linhas de B/C, então nada é tocado.
      const tenantAYardView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.yardSpot.findMany({ where: { id: { in: [yardA.spot_id, yardB.spot_id, yardC.spot_id] } } });
        const crossTenantUpdate = await tx.yardSpot.updateMany({
          where: { id: { in: [yardB.spot_id, yardC.spot_id] } },
          data: { status: "BLOCKED" },
        });
        return { visibleIds: visible.map((spot) => spot.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAYardView.visibleIds,
        [yardA.spot_id],
        "tenant A must only see its own yard spot (not tenant B/C)",
      );
      assert.equal(
        tenantAYardView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C yard spots",
      );

      const tenantBSpot = await withTenantRls(client, tenantB.id, (tx) => tx.yardSpot.findUnique({ where: { id: yardB.spot_id } }));
      assert.equal(tenantBSpot?.status, "FREE", "tenant B yard spot stays visible + untouched in-tenant");
      const tenantCArea = await withTenantRls(client, tenantC.id, (tx) => tx.yardArea.findUnique({ where: { id: yardC.area_id } }));
      assert.equal(tenantCArea?.name, "Quadra RLS", "tenant C yard area stays visible + untouched in-tenant");

      // Ω5P PR-02 (D-Ω5P-JUR-*) — jurisdiction_profiles nos 3 tenants EFÊMEROS (A, B, C), cada um com OS 2 PERFIS
      // (1 PUBLIC_AGREEMENT + 1 PRIVATE_CONTRACT — cumpre J §2.4 "3 tenants + 2 perfis"). Prova: invisível sem
      // contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant. RLS ENABLE/FORCE + policy da
      // migration 20260834000000; tenant_id 1º de todo índice. FK única = tenant (RESTRICT).
      const insertJurisdictionPair = async (tx: typeof client, tenantId: string) => {
        const [pub] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO jurisdiction_profiles (tenant_id, name, scope)
          VALUES (${tenantId}::uuid, 'RLS Convênio Público', 'PUBLIC_AGREEMENT') RETURNING id
        `;
        const [priv] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO jurisdiction_profiles (tenant_id, name, scope, daily_cap)
          VALUES (${tenantId}::uuid, 'RLS Contrato Privado', 'PRIVATE_CONTRACT', 'UNLIMITED') RETURNING id
        `;
        return { public_id: pub.id, private_id: priv.id };
      };
      const jurA = await withTenantRls(client, tenantA.id, (tx) => insertJurisdictionPair(tx as typeof client, tenantA.id));
      const jurB = await withTenantRls(client, tenantB.id, (tx) => insertJurisdictionPair(tx as typeof client, tenantB.id));
      const jurC = await withTenantRls(client, tenantC.id, (tx) => insertJurisdictionPair(tx as typeof client, tenantC.id));

      // perfis invisíveis sem app.current_tenant_id.
      const jurWithoutContext = await client.jurisdictionProfile.findMany({
        where: { id: { in: [jurA.public_id, jurA.private_id, jurB.public_id, jurC.private_id] } },
      });
      assert.deepEqual(
        jurWithoutContext.map((profile) => profile.id),
        [],
        "tenant-scoped jurisdiction profiles must not be visible without app.current_tenant_id",
      );

      // A vê só os seus 2 perfis; cross-tenant updateMany (B/C) count=0.
      const tenantAJurView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.jurisdictionProfile.findMany({
          where: { id: { in: [jurA.public_id, jurA.private_id, jurB.public_id, jurC.private_id] } },
        });
        const crossTenantUpdate = await tx.jurisdictionProfile.updateMany({
          where: { id: { in: [jurB.public_id, jurC.private_id] } },
          data: { active: false },
        });
        return { visibleIds: visible.map((profile) => profile.id).sort(), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAJurView.visibleIds,
        [jurA.public_id, jurA.private_id].sort(),
        "tenant A must only see its own jurisdiction profiles (not tenant B/C)",
      );
      assert.equal(
        tenantAJurView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C jurisdiction profiles",
      );

      const tenantBProfile = await withTenantRls(client, tenantB.id, (tx) => tx.jurisdictionProfile.findUnique({ where: { id: jurB.public_id } }));
      assert.equal(tenantBProfile?.active, true, "tenant B jurisdiction profile stays visible + untouched in-tenant");
      const tenantCProfile = await withTenantRls(client, tenantC.id, (tx) => tx.jurisdictionProfile.findUnique({ where: { id: jurC.private_id } }));
      assert.equal(tenantCProfile?.daily_cap, "UNLIMITED", "tenant C private jurisdiction profile stays visible + untouched in-tenant");

      // Ω5P PR-05 (D-Ω5P-IMP-*) — impound_processes + custody_events nos 3 tenants EFÊMEROS (A, B, C). O processo
      // referencia o jurisdiction_profile (FK composta tenant-first, RESTRICT) do bloco PR-02; o evento é
      // APPEND-ONLY (hash/prev_hash 64-hex satisfazem o CHECK de formato; seq≥1). Veículo NÃO identificado é caso
      // VÁLIDO (D-Ω5P-09): unidentified_reason preenchido, sem placa (satisfaz o CHECK identity). Prova: invisível
      // sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant. RLS ENABLE/FORCE + policy da
      // migration 20260836000000; tenant_id 1º de todo índice.
      const custodyHash = "a".repeat(64);
      const custodyPrev = "b".repeat(64);
      const insertImpound = async (tx: typeof client, tenantId: string, profileId: string) => {
        const [proc] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO impound_processes (tenant_id, profile_id, origin_authority, vehicle_unidentified, unidentified_reason, custody_seq_head, custody_hash_head)
          VALUES (${tenantId}::uuid, ${profileId}::uuid, 'RLS Autoridade', true, 'Placa adulterada', 1, ${custodyHash})
          RETURNING id
        `;
        const [ev] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO custody_events (tenant_id, process_id, seq, type, payload, occurred_at, prev_hash, hash)
          VALUES (${tenantId}::uuid, ${proc.id}::uuid, 1, 'STATUS_CHANGE', ${'{"from":null,"to":"IN_REMOVAL"}'}::jsonb, now(), ${custodyPrev}, ${custodyHash})
          RETURNING id
        `;
        return { process_id: proc.id, event_id: ev.id };
      };
      const impA = await withTenantRls(client, tenantA.id, (tx) => insertImpound(tx as typeof client, tenantA.id, jurA.public_id));
      const impB = await withTenantRls(client, tenantB.id, (tx) => insertImpound(tx as typeof client, tenantB.id, jurB.public_id));
      const impC = await withTenantRls(client, tenantC.id, (tx) => insertImpound(tx as typeof client, tenantC.id, jurC.public_id));

      // processos invisíveis sem app.current_tenant_id.
      const impWithoutContext = await client.impoundProcess.findMany({
        where: { id: { in: [impA.process_id, impB.process_id, impC.process_id] } },
      });
      assert.deepEqual(
        impWithoutContext.map((process) => process.id),
        [],
        "tenant-scoped impound processes must not be visible without app.current_tenant_id",
      );

      // A vê só o seu processo; cross-tenant updateMany (B/C) count=0.
      const tenantAImpView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.impoundProcess.findMany({ where: { id: { in: [impA.process_id, impB.process_id, impC.process_id] } } });
        const crossTenantUpdate = await tx.impoundProcess.updateMany({
          where: { id: { in: [impB.process_id, impC.process_id] } },
          data: { origin_agent_name: "cross-tenant" },
        });
        return { visibleIds: visible.map((process) => process.id).sort(), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(tenantAImpView.visibleIds, [impA.process_id], "tenant A must only see its own impound process (not tenant B/C)");
      assert.equal(tenantAImpView.crossUpdatedRows, 0, "tenant A must not update tenant B/C impound processes");

      // custody_events: A vê só o seu evento; cross-tenant invisível.
      const tenantAEventView = await withTenantRls(client, tenantA.id, (tx) =>
        tx.custodyEvent.findMany({ where: { id: { in: [impA.event_id, impB.event_id, impC.event_id] } } }),
      );
      assert.deepEqual(tenantAEventView.map((e) => e.id), [impA.event_id], "tenant A must only see its own custody event (not tenant B/C)");

      const tenantBImp = await withTenantRls(client, tenantB.id, (tx) => tx.impoundProcess.findUnique({ where: { id: impB.process_id } }));
      assert.equal(tenantBImp?.status, "IN_REMOVAL", "tenant B impound process stays visible + untouched in-tenant");
      assert.equal(tenantBImp?.origin_agent_name, null, "tenant B impound process origin_agent_name untouched by tenant A cross-update");
      // verify de A sob tenant B → not_found (o processo de A é invisível no contexto de B).
      const crossVerify = await withTenantRls(client, tenantB.id, (tx) => tx.impoundProcess.findUnique({ where: { id: impA.process_id } }));
      assert.equal(crossVerify, null, "tenant B cannot see tenant A's process (verify would be not_found)");

      // Ω5P PR-06 (D-Ω5P-REC-*) — impound_intake_inspections nos 3 tenants EFÊMEROS (A, B, C). 1 vistoria por
      // processo (@@unique tenant+process); process→RESTRICT (I9). RLS ENABLE/FORCE + policy (migration
      // 20260837000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocada in-tenant.
      const insertInspection = async (tx: typeof client, tenantId: string, processId: string) => {
        const [insp] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO impound_intake_inspections (tenant_id, process_id, inspected_at, signature_status)
          VALUES (${tenantId}::uuid, ${processId}::uuid, now(), 'ABSENT')
          RETURNING id
        `;
        return insp.id;
      };
      const inspA = await withTenantRls(client, tenantA.id, (tx) => insertInspection(tx as typeof client, tenantA.id, impA.process_id));
      const inspB = await withTenantRls(client, tenantB.id, (tx) => insertInspection(tx as typeof client, tenantB.id, impB.process_id));
      const inspC = await withTenantRls(client, tenantC.id, (tx) => insertInspection(tx as typeof client, tenantC.id, impC.process_id));

      const inspWithoutContext = await client.intakeInspection.findMany({ where: { id: { in: [inspA, inspB, inspC] } } });
      assert.deepEqual(inspWithoutContext.map((i) => i.id), [], "intake inspections must not be visible without app.current_tenant_id");

      const tenantAInspView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.intakeInspection.findMany({ where: { id: { in: [inspA, inspB, inspC] } } });
        const crossUpdate = await tx.intakeInspection.updateMany({ where: { id: { in: [inspB, inspC] } }, data: { agent_name: "cross-tenant" } });
        return { visibleIds: visible.map((i) => i.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantAInspView.visibleIds, [inspA], "tenant A must only see its own intake inspection (not tenant B/C)");
      assert.equal(tenantAInspView.crossUpdatedRows, 0, "tenant A must not update tenant B/C intake inspections");

      const tenantBInsp = await withTenantRls(client, tenantB.id, (tx) => tx.intakeInspection.findUnique({ where: { id: inspB } }));
      assert.equal(tenantBInsp?.signature_status, "ABSENT", "tenant B intake inspection stays visible + untouched in-tenant");
      assert.equal(tenantBInsp?.agent_name, null, "tenant B intake inspection agent_name untouched by tenant A cross-update");

      // Ω5P PR-07 (D-Ω5P-CHG-*) — process_charges (ledger de encargos) + daily_accrual_runs nos 3 tenants EFÊMEROS.
      // O encargo referencia o impound_process (FK composta tenant-first, RESTRICT — I9). RLS ENABLE/FORCE + policy
      // (migration 20260838000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado
      // in-tenant. tenant_id 1º de todo índice.
      const insertCharge = async (tx: typeof client, tenantId: string, processId: string) => {
        const [charge] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO process_charges (tenant_id, process_id, kind, quantity, unit_amount, total_amount)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 'REMOVAL', 1, 150.00, 150.00)
          RETURNING id
        `;
        const [run] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO daily_accrual_runs (tenant_id, run_date, status) VALUES (${tenantId}::uuid, CURRENT_DATE, 'completed') RETURNING id
        `;
        return { charge_id: charge.id, run_id: run.id };
      };
      const chgA = await withTenantRls(client, tenantA.id, (tx) => insertCharge(tx as typeof client, tenantA.id, impA.process_id));
      const chgB = await withTenantRls(client, tenantB.id, (tx) => insertCharge(tx as typeof client, tenantB.id, impB.process_id));
      const chgC = await withTenantRls(client, tenantC.id, (tx) => insertCharge(tx as typeof client, tenantC.id, impC.process_id));

      const chgWithoutContext = await client.processCharge.findMany({ where: { id: { in: [chgA.charge_id, chgB.charge_id, chgC.charge_id] } } });
      assert.deepEqual(chgWithoutContext.map((c) => c.id), [], "process charges must not be visible without app.current_tenant_id");

      const tenantAChgView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.processCharge.findMany({ where: { id: { in: [chgA.charge_id, chgB.charge_id, chgC.charge_id] } } });
        const crossUpdate = await tx.processCharge.updateMany({ where: { id: { in: [chgB.charge_id, chgC.charge_id] } }, data: { settlement_note: "cross-tenant" } });
        return { visibleIds: visible.map((c) => c.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantAChgView.visibleIds, [chgA.charge_id], "tenant A must only see its own process charge (not tenant B/C)");
      assert.equal(tenantAChgView.crossUpdatedRows, 0, "tenant A must not update tenant B/C process charges");

      const runWithoutContext = await client.dailyAccrualRun.findMany({ where: { id: { in: [chgA.run_id, chgB.run_id, chgC.run_id] } } });
      assert.deepEqual(runWithoutContext.map((r) => r.id), [], "daily accrual runs must not be visible without app.current_tenant_id");
      const tenantARunView = await withTenantRls(client, tenantA.id, (tx) => tx.dailyAccrualRun.findMany({ where: { id: { in: [chgA.run_id, chgB.run_id, chgC.run_id] } } }));
      assert.deepEqual(tenantARunView.map((r) => r.id), [chgA.run_id], "tenant A must only see its own daily accrual run (not tenant B/C)");

      const tenantBChg = await withTenantRls(client, tenantB.id, (tx) => tx.processCharge.findUnique({ where: { id: chgB.charge_id } }));
      assert.equal(tenantBChg?.settlement_note, null, "tenant B process charge settlement_note untouched by tenant A cross-update");

      // Ω5P PR-09 (D-Ω5P-NOTIF-*) — process_notifications (trilha de notificações legais I6) nos 3 tenants EFÊMEROS.
      // A notificação referencia o impound_process (FK composta tenant-first, RESTRICT — I9). RLS ENABLE/FORCE +
      // policy (migration 20260839000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 +
      // visível/intocada in-tenant. tenant_id 1º de todo índice.
      const insertNotification = async (tx: typeof client, tenantId: string, processId: string) => {
        const [notification] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO process_notifications (tenant_id, process_id, kind, status, due_at)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 'OWNER_INITIAL', 'DUE', now())
          RETURNING id
        `;
        return notification.id;
      };
      const notifA = await withTenantRls(client, tenantA.id, (tx) => insertNotification(tx as typeof client, tenantA.id, impA.process_id));
      const notifB = await withTenantRls(client, tenantB.id, (tx) => insertNotification(tx as typeof client, tenantB.id, impB.process_id));
      const notifC = await withTenantRls(client, tenantC.id, (tx) => insertNotification(tx as typeof client, tenantC.id, impC.process_id));

      const notifWithoutContext = await client.processNotification.findMany({ where: { id: { in: [notifA, notifB, notifC] } } });
      assert.deepEqual(notifWithoutContext.map((n) => n.id), [], "process notifications must not be visible without app.current_tenant_id");

      const tenantANotifView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.processNotification.findMany({ where: { id: { in: [notifA, notifB, notifC] } } });
        const crossUpdate = await tx.processNotification.updateMany({ where: { id: { in: [notifB, notifC] } }, data: { reason: "cross-tenant" } });
        return { visibleIds: visible.map((n) => n.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantANotifView.visibleIds, [notifA], "tenant A must only see its own process notification (not tenant B/C)");
      assert.equal(tenantANotifView.crossUpdatedRows, 0, "tenant A must not update tenant B/C process notifications");

      const tenantBNotif = await withTenantRls(client, tenantB.id, (tx) => tx.processNotification.findUnique({ where: { id: notifB } }));
      assert.equal(tenantBNotif?.status, "DUE", "tenant B process notification stays visible + untouched in-tenant");
      assert.equal(tenantBNotif?.reason, null, "tenant B process notification reason untouched by tenant A cross-update");

      // Ω5P PR-10a (D-Ω5P-REL-*) — impound_releases (dossiê da liberação I5) + release_requirement_checks (checklist
      // SNAPSHOT) nos 3 tenants EFÊMEROS. A liberação referencia o impound_process (FK composta tenant-first,
      // RESTRICT — I9) e o check referencia a liberação (RESTRICT). RLS ENABLE/FORCE + policy (migration
      // 20260840000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant.
      const insertRelease = async (tx: typeof client, tenantId: string, processId: string) => {
        const [release] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO impound_releases (tenant_id, process_id, kind, status, recipient_name)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 'STANDARD', 'IN_PROGRESS', 'Quem Retira')
          RETURNING id
        `;
        const [check] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO release_requirement_checks (tenant_id, release_id, code, label, required, satisfied)
          VALUES (${tenantId}::uuid, ${release.id}::uuid, 'AUTHORITY_RELEASE', 'Autorizacao do orgao', true, false)
          RETURNING id
        `;
        return { release_id: release.id, check_id: check.id };
      };
      const relA = await withTenantRls(client, tenantA.id, (tx) => insertRelease(tx as typeof client, tenantA.id, impA.process_id));
      const relB = await withTenantRls(client, tenantB.id, (tx) => insertRelease(tx as typeof client, tenantB.id, impB.process_id));
      const relC = await withTenantRls(client, tenantC.id, (tx) => insertRelease(tx as typeof client, tenantC.id, impC.process_id));

      const relWithoutContext = await client.impoundRelease.findMany({ where: { id: { in: [relA.release_id, relB.release_id, relC.release_id] } } });
      assert.deepEqual(relWithoutContext.map((r) => r.id), [], "impound releases must not be visible without app.current_tenant_id");

      const tenantARelView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.impoundRelease.findMany({ where: { id: { in: [relA.release_id, relB.release_id, relC.release_id] } } });
        const crossUpdate = await tx.impoundRelease.updateMany({ where: { id: { in: [relB.release_id, relC.release_id] } }, data: { recipient_name: "cross-tenant" } });
        return { visibleIds: visible.map((r) => r.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantARelView.visibleIds, [relA.release_id], "tenant A must only see its own impound release (not tenant B/C)");
      assert.equal(tenantARelView.crossUpdatedRows, 0, "tenant A must not update tenant B/C impound releases");

      const checkWithoutContext = await client.releaseRequirementCheck.findMany({ where: { id: { in: [relA.check_id, relB.check_id, relC.check_id] } } });
      assert.deepEqual(checkWithoutContext.map((c) => c.id), [], "release requirement checks must not be visible without app.current_tenant_id");
      const tenantACheckView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.releaseRequirementCheck.findMany({ where: { id: { in: [relA.check_id, relB.check_id, relC.check_id] } } });
        const crossUpdate = await tx.releaseRequirementCheck.updateMany({ where: { id: { in: [relB.check_id, relC.check_id] } }, data: { note: "cross-tenant" } });
        return { visibleIds: visible.map((c) => c.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantACheckView.visibleIds, [relA.check_id], "tenant A must only see its own release requirement check (not tenant B/C)");
      assert.equal(tenantACheckView.crossUpdatedRows, 0, "tenant A must not update tenant B/C release requirement checks");

      const tenantBRel = await withTenantRls(client, tenantB.id, (tx) => tx.impoundRelease.findUnique({ where: { id: relB.release_id } }));
      assert.equal(tenantBRel?.recipient_name, "Quem Retira", "tenant B impound release stays visible + untouched in-tenant");

      // Ω5P PR-12 (D-Ω5P-AUC-*) — auction_attempts (contador append-only de rodadas de leilão desertas I8) nos 3
      // tenants EFÊMEROS. A tentativa referencia o impound_process (FK composta tenant-first, RESTRICT — I9). RLS
      // ENABLE/FORCE + policy (migration 20260841000000). Prova: invisível sem contexto + cross-tenant updateMany
      // count=0 + visível/intocado in-tenant. tenant_id 1º de todo índice; partial-unique de round_number raw-only.
      const insertAttempt = async (tx: typeof client, tenantId: string, processId: string) => {
        const [attempt] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO auction_attempts (tenant_id, process_id, round_number, outcome)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 1, 'DESERTED')
          RETURNING id
        `;
        return attempt.id;
      };
      const aucA = await withTenantRls(client, tenantA.id, (tx) => insertAttempt(tx as typeof client, tenantA.id, impA.process_id));
      const aucB = await withTenantRls(client, tenantB.id, (tx) => insertAttempt(tx as typeof client, tenantB.id, impB.process_id));
      const aucC = await withTenantRls(client, tenantC.id, (tx) => insertAttempt(tx as typeof client, tenantC.id, impC.process_id));

      const aucWithoutContext = await client.auctionAttempt.findMany({ where: { id: { in: [aucA, aucB, aucC] } } });
      assert.deepEqual(aucWithoutContext.map((a) => a.id), [], "auction attempts must not be visible without app.current_tenant_id");

      const tenantAAucView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.auctionAttempt.findMany({ where: { id: { in: [aucA, aucB, aucC] } } });
        const crossUpdate = await tx.auctionAttempt.updateMany({ where: { id: { in: [aucB, aucC] } }, data: { notes: "cross-tenant" } });
        return { visibleIds: visible.map((a) => a.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantAAucView.visibleIds, [aucA], "tenant A must only see its own auction attempt (not tenant B/C)");
      assert.equal(tenantAAucView.crossUpdatedRows, 0, "tenant A must not update tenant B/C auction attempts");

      const tenantBAuc = await withTenantRls(client, tenantB.id, (tx) => tx.auctionAttempt.findUnique({ where: { id: aucB } }));
      assert.equal(tenantBAuc?.outcome, "DESERTED", "tenant B auction attempt stays visible + untouched in-tenant");
      assert.equal(tenantBAuc?.notes, null, "tenant B auction attempt notes untouched by tenant A cross-update");

      // Ω5P PR-13a (D-Ω5P-AUC-*) — auction_edicts (designação de leilão POR RODADA I8) nos 3 tenants EFÊMEROS. O edital
      // referencia o impound_process (FK composta tenant-first, RESTRICT — I9). RLS ENABLE/FORCE + policy (migration
      // 20260842000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant.
      // tenant_id 1º de todo índice; partial-unique de round_number raw-only.
      const insertEdict = async (tx: typeof client, tenantId: string, processId: string) => {
        const [edict] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO auction_edicts (tenant_id, process_id, round_number, edict_reference, business_days, status)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 1, 'EDITAL-RLS-001', 15, 'DESIGNATED')
          RETURNING id
        `;
        return edict.id;
      };
      const edA = await withTenantRls(client, tenantA.id, (tx) => insertEdict(tx as typeof client, tenantA.id, impA.process_id));
      const edB = await withTenantRls(client, tenantB.id, (tx) => insertEdict(tx as typeof client, tenantB.id, impB.process_id));
      const edC = await withTenantRls(client, tenantC.id, (tx) => insertEdict(tx as typeof client, tenantC.id, impC.process_id));

      const edWithoutContext = await client.auctionEdict.findMany({ where: { id: { in: [edA, edB, edC] } } });
      assert.deepEqual(edWithoutContext.map((e) => e.id), [], "auction edicts must not be visible without app.current_tenant_id");

      const tenantAEdView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.auctionEdict.findMany({ where: { id: { in: [edA, edB, edC] } } });
        const crossUpdate = await tx.auctionEdict.updateMany({ where: { id: { in: [edB, edC] } }, data: { notes: "cross-tenant" } });
        return { visibleIds: visible.map((e) => e.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantAEdView.visibleIds, [edA], "tenant A must only see its own auction edict (not tenant B/C)");
      assert.equal(tenantAEdView.crossUpdatedRows, 0, "tenant A must not update tenant B/C auction edicts");

      const tenantBEd = await withTenantRls(client, tenantB.id, (tx) => tx.auctionEdict.findUnique({ where: { id: edB } }));
      assert.equal(tenantBEd?.status, "DESIGNATED", "tenant B auction edict stays visible + untouched in-tenant");
      assert.equal(tenantBEd?.notes, null, "tenant B auction edict notes untouched by tenant A cross-update");

      // Ω5P PR-14a (D-Ω5P-*) — settlements (liquidação em cascata §6º I7) + settlement_allocations (rateio append-only)
      // nos 3 tenants EFÊMEROS. Referenciam o impound_process (FK composta tenant-first, RESTRICT — I9); a allocation
      // referencia o settlement (FK composta tenant-first, RESTRICT). RLS ENABLE/FORCE + policy (migration
      // 20260845000000). Prova: invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant.
      // tenant_id 1º de todo índice; partial-unique de (tenant,process) + (tenant,settlement,order_seq) raw-only.
      const insertSettlement = async (tx: typeof client, tenantId: string, processId: string) => {
        const [settlement] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO settlements (tenant_id, process_id, sold_round, hammer_amount, owner_balance_amount, currency, status)
          VALUES (${tenantId}::uuid, ${processId}::uuid, 1, '9500.00'::numeric, '9500.00'::numeric, 'BRL', 'DISTRIBUTED')
          RETURNING id
        `;
        const [allocation] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO settlement_allocations (tenant_id, settlement_id, process_id, order_seq, beneficiary_kind, amount)
          VALUES (${tenantId}::uuid, ${settlement.id}::uuid, ${processId}::uuid, 1, 'OWNER_BALANCE', '9500.00'::numeric)
          RETURNING id
        `;
        return { settlement_id: settlement.id, allocation_id: allocation.id };
      };
      const setA = await withTenantRls(client, tenantA.id, (tx) => insertSettlement(tx as typeof client, tenantA.id, impA.process_id));
      const setB = await withTenantRls(client, tenantB.id, (tx) => insertSettlement(tx as typeof client, tenantB.id, impB.process_id));
      const setC = await withTenantRls(client, tenantC.id, (tx) => insertSettlement(tx as typeof client, tenantC.id, impC.process_id));

      const setWithoutContext = await client.settlement.findMany({ where: { id: { in: [setA.settlement_id, setB.settlement_id, setC.settlement_id] } } });
      assert.deepEqual(setWithoutContext.map((s) => s.id), [], "settlements must not be visible without app.current_tenant_id");

      const tenantASetView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.settlement.findMany({ where: { id: { in: [setA.settlement_id, setB.settlement_id, setC.settlement_id] } } });
        const crossUpdate = await tx.settlement.updateMany({ where: { id: { in: [setB.settlement_id, setC.settlement_id] } }, data: { status: "BALANCE_CLAIMED" } });
        return { visibleIds: visible.map((s) => s.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantASetView.visibleIds, [setA.settlement_id], "tenant A must only see its own settlement (not tenant B/C)");
      assert.equal(tenantASetView.crossUpdatedRows, 0, "tenant A must not update tenant B/C settlements");

      const tenantBSet = await withTenantRls(client, tenantB.id, (tx) => tx.settlement.findUnique({ where: { id: setB.settlement_id } }));
      assert.equal(tenantBSet?.status, "DISTRIBUTED", "tenant B settlement stays visible + untouched in-tenant (status not cross-updated)");

      const allocWithoutContext = await client.settlementAllocation.findMany({ where: { id: { in: [setA.allocation_id, setB.allocation_id, setC.allocation_id] } } });
      assert.deepEqual(allocWithoutContext.map((a) => a.id), [], "settlement allocations must not be visible without app.current_tenant_id");

      const tenantAAllocView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.settlementAllocation.findMany({ where: { id: { in: [setA.allocation_id, setB.allocation_id, setC.allocation_id] } } });
        const crossUpdate = await tx.settlementAllocation.updateMany({ where: { id: { in: [setB.allocation_id, setC.allocation_id] } }, data: { reference: "cross-tenant" } });
        return { visibleIds: visible.map((a) => a.id).sort(), crossUpdatedRows: crossUpdate.count };
      });
      assert.deepEqual(tenantAAllocView.visibleIds, [setA.allocation_id], "tenant A must only see its own settlement allocation (not tenant B/C)");
      assert.equal(tenantAAllocView.crossUpdatedRows, 0, "tenant A must not update tenant B/C settlement allocations");

      const tenantBAlloc = await withTenantRls(client, tenantB.id, (tx) => tx.settlementAllocation.findUnique({ where: { id: setB.allocation_id } }));
      assert.equal(tenantBAlloc?.beneficiary_kind, "OWNER_BALANCE", "tenant B settlement allocation stays visible + untouched in-tenant");
      assert.equal(tenantBAlloc?.reference, null, "tenant B settlement allocation reference untouched by tenant A cross-update");

      // Ω5P PR-03 (D-Ω5P-TAR-*) — price_tables ESCOPADAS (scope PUBLIC_AGREEMENT/PRIVATE_CONTRACT + vehicle_category)
      // nos 3 tenants EFÊMEROS. As 2 colunas novas são NULLABLE aditivas; a RLS (ENABLE/FORCE + policy
      // price_tables_tenant_isolation, migration 20260723000000) é HERDADA — o ADD COLUMN não a altera. Prova:
      // invisível sem contexto + cross-tenant updateMany count=0 + visível/intocado in-tenant. tenant_id 1º.
      const insertPriceTablePair = async (tx: typeof client, tenantId: string) => {
        const [pub] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO price_tables (tenant_id, name, status, scope, vehicle_category)
          VALUES (${tenantId}::uuid, 'RLS Diárias Convênio Motos', 'published', 'PUBLIC_AGREEMENT', 'MOTORCYCLE') RETURNING id
        `;
        const [priv] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO price_tables (tenant_id, name, status, scope, vehicle_category)
          VALUES (${tenantId}::uuid, 'RLS Diárias Contrato Carros', 'published', 'PRIVATE_CONTRACT', 'CAR') RETURNING id
        `;
        return { public_id: pub.id, private_id: priv.id };
      };
      const ptA = await withTenantRls(client, tenantA.id, (tx) => insertPriceTablePair(tx as typeof client, tenantA.id));
      const ptB = await withTenantRls(client, tenantB.id, (tx) => insertPriceTablePair(tx as typeof client, tenantB.id));
      const ptC = await withTenantRls(client, tenantC.id, (tx) => insertPriceTablePair(tx as typeof client, tenantC.id));

      const ptWithoutContext = await client.priceTable.findMany({
        where: { id: { in: [ptA.public_id, ptA.private_id, ptB.public_id, ptC.private_id] } },
      });
      assert.deepEqual(
        ptWithoutContext.map((table) => table.id),
        [],
        "tenant-scoped price tables must not be visible without app.current_tenant_id",
      );

      const tenantAPtView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.priceTable.findMany({
          where: { id: { in: [ptA.public_id, ptA.private_id, ptB.public_id, ptC.private_id] } },
        });
        const crossTenantUpdate = await tx.priceTable.updateMany({
          where: { id: { in: [ptB.public_id, ptC.private_id] } },
          data: { is_active: false },
        });
        return { visibleIds: visible.map((table) => table.id).sort(), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAPtView.visibleIds,
        [ptA.public_id, ptA.private_id].sort(),
        "tenant A must only see its own price tables (not tenant B/C)",
      );
      assert.equal(tenantAPtView.crossUpdatedRows, 0, "tenant A must not update tenant B/C price tables");

      const tenantBPt = await withTenantRls(client, tenantB.id, (tx) => tx.priceTable.findUnique({ where: { id: ptB.public_id } }));
      assert.equal(tenantBPt?.scope, "PUBLIC_AGREEMENT", "tenant B public price table stays visible + untouched in-tenant");
      assert.equal(tenantBPt?.vehicle_category, "MOTORCYCLE", "tenant B price table scoped category preserved in-tenant");
      const tenantCPt = await withTenantRls(client, tenantC.id, (tx) => tx.priceTable.findUnique({ where: { id: ptC.private_id } }));
      assert.equal(tenantCPt?.scope, "PRIVATE_CONTRACT", "tenant C private price table stays visible + untouched in-tenant");

      // Ω4C PR-20 (RN-NOTIFCEN-01/-04) — Central tenant-wide sobre scheduled_notifications, via os métodos REAIS
      // do repositório (listByTenant/cancelCentral) sob withTenantRls, reusando as 3 linhas A/B/C acima. Prova:
      // a central de A LISTA só a de A (não a de B/C) e CANCELA só pendentes do próprio tenant (cross-tenant → null,
      // a de B segue pendente). tenant_id 1º da cláusula + RLS como autoridade de isolamento.
      const { RlsPrismaScheduledNotificationRepository } = await import(
        "../src/modules/notifications/scheduled-notification-prisma.repository.js"
      );
      const centralScheduledRepo = new RlsPrismaScheduledNotificationRepository(client);

      const centralListForTenantA = await centralScheduledRepo.listByTenant(tenantA.id);
      const centralIdsForTenantA = centralListForTenantA.map((entry) => entry.id);
      assert.equal(centralIdsForTenantA.includes(scheduledNotificationAId), true, "central de A lista a agendada de A");
      assert.equal(centralIdsForTenantA.includes(scheduledNotificationBId), false, "central de A NÃO lista a agendada de B");
      assert.equal(centralIdsForTenantA.includes(scheduledNotificationCId), false, "central de A NÃO lista a agendada de C");

      const crossTenantCentralCancel = await centralScheduledRepo.cancelCentral(tenantA.id, scheduledNotificationBId);
      assert.equal(crossTenantCentralCancel, null, "central de A não cancela a agendada de B (cross-tenant → null)");
      const tenantBScheduledAfterCentral = await withTenantRls(client, tenantB.id, (tx) =>
        tx.scheduledNotification.findUnique({ where: { id: scheduledNotificationBId } }),
      );
      assert.equal(tenantBScheduledAfterCentral?.status, "pending", "tenant B scheduled notification untouched by tenant A central cancel");

      const inTenantCentralCancel = await centralScheduledRepo.cancelCentral(tenantA.id, scheduledNotificationAId);
      assert.equal(inTenantCentralCancel?.status, "cancelled", "central de A cancela a agendada PENDENTE de A (tenant-wide)");

      // Ω4C PR-06 (RN-MANUT-09) — maintenance_order_items (itens da manutenção) com 3 tenants EFÊMEROS (A, B, C).
      // Cada item referencia uma maintenance_order via FK composta (tenant_id, maintenance_order_id); a ordem
      // referencia um vehicle (FK composta). Prova: invisível sem contexto + cross-tenant updateMany count=0 +
      // visível/intocado in-tenant. RLS ENABLE/FORCE + policy da migration 20260826000000; tenant_id 1º de todo índice.
      const createMaintenanceItem = (tx: typeof client, tenantId: string) => (async () => {
        const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO vehicles (tenant_id, plate, model)
          VALUES (${tenantId}::uuid, ${`RLS-${tenantId.slice(0, 8)}`}, 'RLS Truck')
          RETURNING id
        `;
        const [order] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO maintenance_orders (tenant_id, vehicle_id, type, status, description, next_due_at)
          VALUES (${tenantId}::uuid, ${vehicle.id}::uuid, 'corretiva', 'agendada', 'RLS manutenção', now() + INTERVAL '30 day')
          RETURNING id
        `;
        const [item] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO maintenance_order_items (tenant_id, maintenance_order_id, item_type, description, unit_value, quantity)
          VALUES (${tenantId}::uuid, ${order.id}::uuid, 'service', 'RLS item', 100.00, 1.000)
          RETURNING id
        `;
        return item.id;
      })();
      const maintenanceItemAId = await withTenantRls(client, tenantA.id, (tx) => createMaintenanceItem(tx as typeof client, tenantA.id));
      const maintenanceItemBId = await withTenantRls(client, tenantB.id, (tx) => createMaintenanceItem(tx as typeof client, tenantB.id));
      const maintenanceItemCId = await withTenantRls(client, tenantC.id, (tx) => createMaintenanceItem(tx as typeof client, tenantC.id));

      const maintenanceItemsWithoutContext = await client.maintenanceOrderItem.findMany({
        where: { id: { in: [maintenanceItemAId, maintenanceItemBId, maintenanceItemCId] } },
      });
      assert.deepEqual(
        maintenanceItemsWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped maintenance order items must not be visible without app.current_tenant_id",
      );

      const tenantAMaintenanceItemView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.maintenanceOrderItem.findMany({
          where: { id: { in: [maintenanceItemAId, maintenanceItemBId, maintenanceItemCId] } },
        });
        const crossTenantUpdate = await tx.maintenanceOrderItem.updateMany({
          where: { id: { in: [maintenanceItemBId, maintenanceItemCId] } },
          data: { description: "RLS cross-tenant update should not apply" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAMaintenanceItemView.visibleIds,
        [maintenanceItemAId],
        "tenant A must only see its own maintenance order item (not tenant B/C)",
      );
      assert.equal(
        tenantAMaintenanceItemView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C maintenance order items",
      );

      const tenantBMaintenanceItem = await withTenantRls(client, tenantB.id, (tx) =>
        tx.maintenanceOrderItem.findUnique({ where: { id: maintenanceItemBId } }),
      );
      assert.equal(tenantBMaintenanceItem?.description, "RLS item", "tenant B maintenance item stays visible + untouched in-tenant");
      const tenantCMaintenanceItem = await withTenantRls(client, tenantC.id, (tx) =>
        tx.maintenanceOrderItem.findUnique({ where: { id: maintenanceItemCId } }),
      );
      assert.equal(tenantCMaintenanceItem?.description, "RLS item", "tenant C maintenance item stays visible + untouched in-tenant");

      // Ω4C PR-12 (RN-TELE-04) — telemetry_events (telemetria do app) com 3 tenants EFÊMEROS (A, B, C). Cada
      // evento referencia um operator_profile via FK composta (tenant_id, operator_profile_id) → reusa os
      // perfis do bloco PR-03 (A/B) e o profissional de C. Prova: (a) FK cross-tenant REJEITADA (evento de A
      // com perfil de B → violação de FK); (b) invisível sem contexto; (c) cross-tenant updateMany count=0;
      // (d) visível/intocado in-tenant. RLS ENABLE/FORCE + policy da migration 20260831000000; tenant_id 1º
      // de todo índice. TEARDOWN FK-SAFE: telemetry_events ANTES de operator_profiles (lição do CI-catch PR-06).
      const insertTelemetryEvent = (tx: typeof client, tenantId: string, operatorProfileId: string) => tx.$queryRaw<Array<{ id: string }>>`
        INSERT INTO telemetry_events (
          tenant_id, operator_profile_id, event_type, captured_at, lat, lng, accuracy_m, client_action_id
        )
        VALUES (
          ${tenantId}::uuid, ${operatorProfileId}::uuid, 'heartbeat', now(), -23.55, -46.63, 8.0, ${`rls-${tenantId}`}
        )
        RETURNING id
      `;

      // (a) FK composta cross-tenant: evento do tenant A apontando para o perfil do tenant B → violação de FK
      // (não existe (tenant_id=A, operator_profile_id=perfilB) em operator_profiles). A tx faz rollback.
      await assert.rejects(
        withTenantRls(client, tenantA.id, async (tx) => insertTelemetryEvent(tx as typeof client, tenantA.id, operatorProfileBId)),
        /foreign key|violates|constraint/i,
        "telemetry_events must reject a cross-tenant operator_profile via the composite FK",
      );

      const telemetryEventAId = await withTenantRls(client, tenantA.id, async (tx) => {
        const [row] = await insertTelemetryEvent(tx as typeof client, tenantA.id, operatorProfileAId);
        return row.id;
      });
      const telemetryEventBId = await withTenantRls(client, tenantB.id, async (tx) => {
        const [row] = await insertTelemetryEvent(tx as typeof client, tenantB.id, operatorProfileBId);
        return row.id;
      });
      const telemetryEventCId = await withTenantRls(client, tenantC.id, async (tx) => {
        const [row] = await insertTelemetryEvent(tx as typeof client, tenantC.id, tenantCProfessional.operatorProfileId);
        return row.id;
      });

      const telemetryWithoutContext = await client.telemetryEvent.findMany({
        where: { id: { in: [telemetryEventAId, telemetryEventBId, telemetryEventCId] } },
      });
      assert.deepEqual(
        telemetryWithoutContext.map((event) => event.id),
        [],
        "tenant-scoped telemetry events must not be visible without app.current_tenant_id",
      );

      const tenantATelemetryView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.telemetryEvent.findMany({
          where: { id: { in: [telemetryEventAId, telemetryEventBId, telemetryEventCId] } },
        });
        const crossTenantUpdate = await tx.telemetryEvent.updateMany({
          where: { id: { in: [telemetryEventBId, telemetryEventCId] } },
          data: { event_type: "app_disconnect" },
        });
        return { visibleIds: visible.map((event) => event.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantATelemetryView.visibleIds,
        [telemetryEventAId],
        "tenant A must only see its own telemetry event (not tenant B/C)",
      );
      assert.equal(
        tenantATelemetryView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C telemetry events",
      );

      const tenantBTelemetry = await withTenantRls(client, tenantB.id, (tx) =>
        tx.telemetryEvent.findUnique({ where: { id: telemetryEventBId } }),
      );
      assert.equal(tenantBTelemetry?.event_type, "heartbeat", "tenant B telemetry event stays visible + untouched in-tenant");
      const tenantCTelemetry = await withTenantRls(client, tenantC.id, (tx) =>
        tx.telemetryEvent.findUnique({ where: { id: telemetryEventCId } }),
      );
      assert.equal(tenantCTelemetry?.event_type, "heartbeat", "tenant C telemetry event stays visible + untouched in-tenant");

      // Ω4C PR-07 (MUL-SEG-08) — fines.responsible_operator_profile_id (condutor responsável) com 3 tenants
      // EFÊMEROS (A, B, C). A multa referencia um vehicle (FK composta) e um operator_profile (FK composta
      // RESTRICT, a coluna ADITIVA desta fatia — 20260827000000). Reusa os operator_profiles do bloco PR-03.
      // Prova: (a) FK cross-tenant REJEITADA (multa de A com perfil de B → violação de FK); (b) invisível sem
      // contexto; (c) cross-tenant updateMany count=0; (d) visível/intocada in-tenant. tenant_id 1º de todo índice.
      const createFineWithResponsible = (
        tx: typeof client,
        tenantId: string,
        operatorProfileId: string,
        numeroAuto: string,
      ) => (async () => {
        const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO vehicles (tenant_id, plate, model)
          VALUES (${tenantId}::uuid, ${`RLS-FINE-${tenantId.slice(0, 8)}`}, 'RLS Truck')
          RETURNING id
        `;
        const [fine] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO fines (
            tenant_id, vehicle_id, responsible_operator_profile_id, numero_auto, data_infracao, orgao, valor, status
          )
          VALUES (
            ${tenantId}::uuid, ${vehicle.id}::uuid, ${operatorProfileId}::uuid, ${numeroAuto}, now(), 'DETRAN-RLS', 150.00, 'recebida'
          )
          RETURNING id
        `;
        return fine.id;
      })();
      const fineAId = await withTenantRls(client, tenantA.id, (tx) => createFineWithResponsible(tx as typeof client, tenantA.id, operatorProfileAId, "RLS-FINE-A"));
      const fineBId = await withTenantRls(client, tenantB.id, (tx) => createFineWithResponsible(tx as typeof client, tenantB.id, operatorProfileBId, "RLS-FINE-B"));
      const fineCId = await withTenantRls(client, tenantC.id, (tx) => createFineWithResponsible(tx as typeof client, tenantC.id, tenantCProfessional.operatorProfileId, "RLS-FINE-C"));

      // (a) FK COMPOSTA cross-tenant REJEITADA: uma multa de A referenciando o perfil de B viola a FK (não existe
      // (tenant_id=A, operator_profile_id=perfilB) em operator_profiles). A tx inteira faz rollback (sem órfão).
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, async (tx) => {
            const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
              INSERT INTO vehicles (tenant_id, plate, model)
              VALUES (${tenantA.id}::uuid, ${`RLS-XFK-${tenantA.id.slice(0, 8)}`}, 'RLS Truck')
              RETURNING id
            `;
            await tx.$executeRaw`
              INSERT INTO fines (tenant_id, vehicle_id, responsible_operator_profile_id, numero_auto, data_infracao, orgao, valor, status)
              VALUES (${tenantA.id}::uuid, ${vehicle.id}::uuid, ${operatorProfileBId}::uuid, 'RLS-XFK', now(), 'DETRAN', 10.00, 'recebida')
            `;
          }),
        "responsible_operator_profile_id cross-tenant deve violar a FK composta RESTRICT",
      );

      const finesWithoutContext = await client.fine.findMany({
        where: { id: { in: [fineAId, fineBId, fineCId] } },
      });
      assert.deepEqual(
        finesWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped fines must not be visible without app.current_tenant_id",
      );

      const tenantAFineView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.fine.findMany({ where: { id: { in: [fineAId, fineBId, fineCId] } } });
        const crossTenantUpdate = await tx.fine.updateMany({
          where: { id: { in: [fineBId, fineCId] } },
          data: { orgao: "RLS cross-tenant update should not apply" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantAFineView.visibleIds,
        [fineAId],
        "tenant A must only see its own fine (not tenant B/C)",
      );
      assert.equal(
        tenantAFineView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C fines",
      );

      const tenantBFine = await withTenantRls(client, tenantB.id, (tx) => tx.fine.findUnique({ where: { id: fineBId } }));
      assert.equal(tenantBFine?.responsible_operator_profile_id, operatorProfileBId, "tenant B fine keeps its responsible in-tenant");
      assert.equal(tenantBFine?.orgao, "DETRAN-RLS", "tenant B fine orgao untouched in-tenant");
      const tenantCFine = await withTenantRls(client, tenantC.id, (tx) => tx.fine.findUnique({ where: { id: fineCId } }));
      assert.equal(tenantCFine?.responsible_operator_profile_id, tenantCProfessional.operatorProfileId, "tenant C fine keeps its responsible in-tenant");

      // Ω4C PR-09 (DANO-08) — damages.responsible_operator_profile_id (profissional responsável) com 3 tenants
      // EFÊMEROS (A, B, C). O dano referencia um vehicle (FK composta) e um operator_profile (FK composta
      // RESTRICT, a coluna ADITIVA desta fatia — 20260829000000). Reusa os operator_profiles do bloco PR-03.
      // Prova: (a) FK cross-tenant REJEITADA (dano de A com perfil de B → violação de FK); (b) invisível sem
      // contexto; (c) cross-tenant updateMany count=0; (d) visível/intocado in-tenant. tenant_id 1º de todo índice.
      // TEARDOWN FK-SAFE abaixo (damages ANTES de operator_profiles/vehicles — lição do CI-catch do PR-06).
      const createDamageWithResponsible = (
        tx: typeof client,
        tenantId: string,
        operatorProfileId: string,
      ) => (async () => {
        const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO vehicles (tenant_id, plate, model)
          VALUES (${tenantId}::uuid, ${`RLS-DMG-${tenantId.slice(0, 8)}`}, 'RLS Truck')
          RETURNING id
        `;
        const [damage] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO damages (
            tenant_id, vehicle_id, responsible_operator_profile_id, data, gravidade, descricao, status, tipo, origem
          )
          VALUES (
            ${tenantId}::uuid, ${vehicle.id}::uuid, ${operatorProfileId}::uuid, now(), 'moderada', 'RLS damage', 'registrado', 'internal', 'multa'
          )
          RETURNING id
        `;
        return damage.id;
      })();
      const damageAId = await withTenantRls(client, tenantA.id, (tx) => createDamageWithResponsible(tx as typeof client, tenantA.id, operatorProfileAId));
      const damageBId = await withTenantRls(client, tenantB.id, (tx) => createDamageWithResponsible(tx as typeof client, tenantB.id, operatorProfileBId));
      const damageCId = await withTenantRls(client, tenantC.id, (tx) => createDamageWithResponsible(tx as typeof client, tenantC.id, tenantCProfessional.operatorProfileId));

      // (a) FK COMPOSTA cross-tenant REJEITADA: um dano de A referenciando o perfil de B viola a FK (não existe
      // (tenant_id=A, operator_profile_id=perfilB) em operator_profiles). A tx inteira faz rollback (sem órfão).
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, async (tx) => {
            const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
              INSERT INTO vehicles (tenant_id, plate, model)
              VALUES (${tenantA.id}::uuid, ${`RLS-DXFK-${tenantA.id.slice(0, 8)}`}, 'RLS Truck')
              RETURNING id
            `;
            await tx.$executeRaw`
              INSERT INTO damages (tenant_id, vehicle_id, responsible_operator_profile_id, data, gravidade, descricao, status)
              VALUES (${tenantA.id}::uuid, ${vehicle.id}::uuid, ${operatorProfileBId}::uuid, now(), 'leve', 'RLS xfk', 'registrado')
            `;
          }),
        "damages.responsible_operator_profile_id cross-tenant deve violar a FK composta RESTRICT",
      );

      const damagesWithoutContext = await client.damage.findMany({
        where: { id: { in: [damageAId, damageBId, damageCId] } },
      });
      assert.deepEqual(
        damagesWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped damages must not be visible without app.current_tenant_id",
      );

      const tenantADamageView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.damage.findMany({ where: { id: { in: [damageAId, damageBId, damageCId] } } });
        const crossTenantUpdate = await tx.damage.updateMany({
          where: { id: { in: [damageBId, damageCId] } },
          data: { descricao: "RLS cross-tenant update should not apply" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantADamageView.visibleIds,
        [damageAId],
        "tenant A must only see its own damage (not tenant B/C)",
      );
      assert.equal(
        tenantADamageView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C damages",
      );

      const tenantBDamage = await withTenantRls(client, tenantB.id, (tx) => tx.damage.findUnique({ where: { id: damageBId } }));
      assert.equal(tenantBDamage?.responsible_operator_profile_id, operatorProfileBId, "tenant B damage keeps its responsible in-tenant");
      assert.equal(tenantBDamage?.descricao, "RLS damage", "tenant B damage descricao untouched in-tenant");
      const tenantCDamage = await withTenantRls(client, tenantC.id, (tx) => tx.damage.findUnique({ where: { id: damageCId } }));
      assert.equal(tenantCDamage?.responsible_operator_profile_id, tenantCProfessional.operatorProfileId, "tenant C damage keeps its responsible in-tenant");

      // Ω4C PR-08 (EST-12) — stock_movements com CUSTÓDIA: custody_type=professional + FK COMPOSTA RESTRICT
      // (tenant_id, custody_operator_profile_id) → operator_profiles (coluna ADITIVA da 20260828000000) com 3
      // tenants EFÊMEROS (A, B, C). Cada movimento referencia um inventory_item (FK composta) e reusa o
      // operator_profile do bloco PR-03. Prova: (a) FK cross-tenant REJEITADA (movimento de A com custódia do
      // perfil de B viola a FK); (b) invisível sem contexto; (c) cross-tenant updateMany count=0; (d) visível/
      // intocado in-tenant. tenant_id 1º de todo índice novo. TEARDOWN FK-SAFE abaixo (movimentos ANTES de
      // operator_profiles/vehicles/inventory_items — lição do CI-catch do PR-06).
      const createItemWithCustody = (tx: typeof client, tenantId: string, operatorProfileId: string, sku: string) => (async () => {
        const [item] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO inventory_items (tenant_id, sku, name, unit, is_fuel, item_type)
          VALUES (${tenantId}::uuid, ${sku}, 'RLS Item', 'un', true, 'product')
          RETURNING id
        `;
        const [movement] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO stock_movements (
            tenant_id, item_id, type, quantidade_sinalizada, custody_type, custody_operator_profile_id
          )
          VALUES (${tenantId}::uuid, ${item.id}::uuid, 'link', 3.000000, 'professional', ${operatorProfileId}::uuid)
          RETURNING id
        `;
        return { itemId: item.id, movementId: movement.id };
      })();
      const custodyA = await withTenantRls(client, tenantA.id, (tx) => createItemWithCustody(tx as typeof client, tenantA.id, operatorProfileAId, "RLS-STK-A"));
      const custodyB = await withTenantRls(client, tenantB.id, (tx) => createItemWithCustody(tx as typeof client, tenantB.id, operatorProfileBId, "RLS-STK-B"));
      const custodyC = await withTenantRls(client, tenantC.id, (tx) => createItemWithCustody(tx as typeof client, tenantC.id, tenantCProfessional.operatorProfileId, "RLS-STK-C"));

      // (a) FK COMPOSTA cross-tenant REJEITADA: um movimento de A com custódia do perfil de B viola a FK (não
      // existe (tenant_id=A, custody_operator_profile_id=perfilB) em operator_profiles). A tx inteira faz rollback.
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, async (tx) => {
            const [item] = await tx.$queryRaw<Array<{ id: string }>>`
              INSERT INTO inventory_items (tenant_id, sku, name, unit)
              VALUES (${tenantA.id}::uuid, 'RLS-STK-XFK', 'RLS Item', 'un')
              RETURNING id
            `;
            await tx.$executeRaw`
              INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, custody_operator_profile_id)
              VALUES (${tenantA.id}::uuid, ${item.id}::uuid, 'link', 1.000000, 'professional', ${operatorProfileBId}::uuid)
            `;
          }),
        "custody_operator_profile_id cross-tenant deve violar a FK composta RESTRICT",
      );

      const custodyMovementsWithoutContext = await client.stockMovement.findMany({
        where: { id: { in: [custodyA.movementId, custodyB.movementId, custodyC.movementId] } },
      });
      assert.deepEqual(
        custodyMovementsWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped stock movements (with custody) must not be visible without app.current_tenant_id",
      );

      const tenantACustodyView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.stockMovement.findMany({
          where: { id: { in: [custodyA.movementId, custodyB.movementId, custodyC.movementId] } },
        });
        const crossTenantUpdate = await tx.stockMovement.updateMany({
          where: { id: { in: [custodyB.movementId, custodyC.movementId] } },
          data: { reason: "RLS cross-tenant update should not apply" },
        });
        return { visibleIds: visible.map((entry) => entry.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantACustodyView.visibleIds,
        [custodyA.movementId],
        "tenant A must only see its own custody movement (not tenant B/C)",
      );
      assert.equal(
        tenantACustodyView.crossUpdatedRows,
        0,
        "tenant A must not update tenant B/C custody movements",
      );

      const tenantBCustody = await withTenantRls(client, tenantB.id, (tx) =>
        tx.stockMovement.findUnique({ where: { id: custodyB.movementId } }),
      );
      assert.equal(tenantBCustody?.custody_operator_profile_id, operatorProfileBId, "tenant B custody movement keeps its professional in-tenant");
      assert.equal(tenantBCustody?.custody_type, "professional", "tenant B custody movement type untouched in-tenant");
      const tenantCCustody = await withTenantRls(client, tenantC.id, (tx) =>
        tx.stockMovement.findUnique({ where: { id: custodyC.movementId } }),
      );
      assert.equal(tenantCCustody?.custody_operator_profile_id, tenantCProfessional.operatorProfileId, "tenant C custody movement keeps its professional in-tenant");

      // Ω4C PR-10 (RN-REM-10) — commission_calculations.settled_at (marcador de liquidação) com 3 tenants
      // EFÊMEROS (A, B, C). A calculation referencia policy + basis_event (FK compostas) + payee (User, FK
      // composta RESTRICT); as colunas ADITIVAS desta fatia são settled_at/settlement_ref (20260830000000). O
      // payee reusa o user de cada tenant (A/B o já criado; C o do bloco do extrato). Prova: invisível sem
      // contexto + cross-tenant updateMany de settled_at count=0 + visível/intocado in-tenant. RLS ENABLE/FORCE
      // + policy; tenant_id 1º de todo índice. TEARDOWN FK-SAFE abaixo (commission_calculations + basis/policy
      // ANTES de users — lição do CI-catch do PR-06).
      const seedCommissionCalculation = async (tx: typeof client, tenantId: string, payeeId: string, tag: string) => {
        const policy = await tx.commissionPolicy.create({
          data: { tenant_id: tenantId, name: `RLS Policy ${tag}`, scope: "tenant", vertical: "field_services", effective_from: new Date() },
        });
        const basisEvent = await tx.commissionBasisEvent.create({
          data: {
            tenant_id: tenantId,
            source_type: "work_order",
            source_id: `RLS-WO-${tag}-${suffix}`,
            source_event_name: "work_order.completed",
            idempotency_key: `RLS-CALC-BE-${tag}-${suffix}`,
            payload: {},
            occurred_at: new Date(),
            policy_id: policy.id,
          },
        });
        const calculation = await tx.commissionCalculation.create({
          data: {
            tenant_id: tenantId,
            basis_event_id: basisEvent.id,
            policy_id: policy.id,
            payee_id: payeeId,
            amount: 100,
            calculation_snapshot: {},
            idempotency_key: `RLS-CALC-${tag}-${suffix}`,
          },
        });
        return calculation.id;
      };
      const calculationAId = await withTenantRls(client, tenantA.id, (tx) => seedCommissionCalculation(tx as typeof client, tenantA.id, tenantAData.userId, "A"));
      const calculationBId = await withTenantRls(client, tenantB.id, (tx) => seedCommissionCalculation(tx as typeof client, tenantB.id, tenantBData.userId, "B"));
      const calculationCId = await withTenantRls(client, tenantC.id, (tx) => seedCommissionCalculation(tx as typeof client, tenantC.id, tenantCProfessional.userId, "C"));

      const calculationsWithoutContext = await client.commissionCalculation.findMany({
        where: { id: { in: [calculationAId, calculationBId, calculationCId] } },
      });
      assert.deepEqual(
        calculationsWithoutContext.map((calculation) => calculation.id),
        [],
        "tenant-scoped commission calculations must not be visible without app.current_tenant_id",
      );

      const settlementRef = "00000000-0000-4000-8000-000000000010";
      const tenantACalculationView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visible = await tx.commissionCalculation.findMany({
          where: { id: { in: [calculationAId, calculationBId, calculationCId] } },
        });
        // Cross-tenant: tenta liquidar (settled_at/settlement_ref) as calculations de B/C → count=0.
        const crossTenantUpdate = await tx.commissionCalculation.updateMany({
          where: { id: { in: [calculationBId, calculationCId] } },
          data: { settled_at: new Date(), settlement_ref: settlementRef },
        });
        return { visibleIds: visible.map((calculation) => calculation.id), crossUpdatedRows: crossTenantUpdate.count };
      });
      assert.deepEqual(
        tenantACalculationView.visibleIds,
        [calculationAId],
        "tenant A must only see its own commission calculation (not tenant B/C)",
      );
      assert.equal(
        tenantACalculationView.crossUpdatedRows,
        0,
        "tenant A must not settle tenant B/C commission calculations",
      );

      const tenantBCalculation = await withTenantRls(client, tenantB.id, (tx) =>
        tx.commissionCalculation.findUnique({ where: { id: calculationBId } }),
      );
      assert.equal(tenantBCalculation?.settled_at, null, "tenant B calculation stays unsettled (settled_at NULL) in-tenant");
      const tenantCCalculation = await withTenantRls(client, tenantC.id, (tx) =>
        tx.commissionCalculation.findUnique({ where: { id: calculationCId } }),
      );
      assert.equal(tenantCCalculation?.settled_at, null, "tenant C calculation stays unsettled (settled_at NULL) in-tenant");

      // Ω4C PR-08b (RN-BAIXA-09) — baixa automática de estoque: fuel_logs.stock_item_id +
      // maintenance_order_items.stock_item_id (novas FK compostas RESTRICT → inventory_items) +
      // stock_movements.source_type/source_id + índice PARCIAL UNIQUE de idempotência de origem
      // (stock_movements_source_active_key), com 3 tenants EFÊMEROS (A, B, C). Reusa os inventory_items do bloco
      // PR-08 (custodyA/B/C, is_fuel=true). Prova: (a) FK cross-tenant REJEITADA (fuel_log de A com stock_item de
      // B → 23503); (b) idempotência de origem (2º EXIT da MESMA fonte viola o índice parcial); (c) invisível sem
      // contexto; (d) cross-tenant updateMany count=0; (e) visível/intocado in-tenant. Inserts RAW (sem guard de
      // saldo do app — o balance-guard é provado em inventory-stock-decrement.test.ts). TEARDOWN FK-SAFE já
      // reordenado no finally (fuel_logs antes de inventory_items/vehicles; inventory_items após os itens).
      const createConsumerBaixa = (tx: typeof client, tenantId: string, stockItemId: string) => (async () => {
        const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO vehicles (tenant_id, plate, model)
          VALUES (${tenantId}::uuid, ${`RLS-BX-${tenantId.slice(0, 8)}`}, 'RLS Truck')
          RETURNING id
        `;
        const [fuelLog] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO fuel_logs (tenant_id, vehicle_id, fueled_at, fuel_type, liters, total_value, odometer, station_type, stock_item_id)
          VALUES (${tenantId}::uuid, ${vehicle.id}::uuid, now(), 'diesel', 40.0, 200.0, 1000, 'internal', ${stockItemId}::uuid)
          RETURNING id
        `;
        const [order] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO maintenance_orders (tenant_id, vehicle_id, type, status, description)
          VALUES (${tenantId}::uuid, ${vehicle.id}::uuid, 'corretiva', 'agendada', 'RLS baixa')
          RETURNING id
        `;
        const [item] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO maintenance_order_items (tenant_id, maintenance_order_id, item_type, description, unit_value, quantity, stock_item_id)
          VALUES (${tenantId}::uuid, ${order.id}::uuid, 'stock', 'RLS peça', 30.00, 5.000, ${stockItemId}::uuid)
          RETURNING id
        `;
        const [exit] = await tx.$queryRaw<Array<{ id: string }>>`
          INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, source_type, source_id)
          VALUES (${tenantId}::uuid, ${stockItemId}::uuid, 'saida', -40.0, 'base', 'fuel_log', ${fuelLog.id}::uuid)
          RETURNING id
        `;
        return { vehicleId: vehicle.id, fuelLogId: fuelLog.id, maintenanceItemId: item.id, exitId: exit.id };
      })();
      const baixaA = await withTenantRls(client, tenantA.id, (tx) => createConsumerBaixa(tx as typeof client, tenantA.id, custodyA.itemId));
      const baixaB = await withTenantRls(client, tenantB.id, (tx) => createConsumerBaixa(tx as typeof client, tenantB.id, custodyB.itemId));
      const baixaC = await withTenantRls(client, tenantC.id, (tx) => createConsumerBaixa(tx as typeof client, tenantC.id, custodyC.itemId));

      // (a) FK COMPOSTA cross-tenant REJEITADA: um fuel_log de A apontando o inventory_item de B viola a FK
      // (não existe (tenant_id=A, stock_item_id=itemB) em inventory_items). A tx inteira faz rollback (sem órfão).
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, async (tx) => {
            const [vehicle] = await tx.$queryRaw<Array<{ id: string }>>`
              INSERT INTO vehicles (tenant_id, plate, model)
              VALUES (${tenantA.id}::uuid, ${`RLS-BXFK-${tenantA.id.slice(0, 8)}`}, 'RLS Truck')
              RETURNING id
            `;
            await tx.$executeRaw`
              INSERT INTO fuel_logs (tenant_id, vehicle_id, fueled_at, fuel_type, liters, total_value, odometer, station_type, stock_item_id)
              VALUES (${tenantA.id}::uuid, ${vehicle.id}::uuid, now(), 'diesel', 10.0, 50.0, 1, 'internal', ${custodyB.itemId}::uuid)
            `;
          }),
        "fuel_logs.stock_item_id cross-tenant deve violar a FK composta RESTRICT",
      );

      // (b) Idempotência de origem: um 2º EXIT da MESMA fonte (tenant A, fuel_log:baixaA) viola o índice parcial
      // único stock_movements_source_active_key (a baixa é one-shot por entidade-fonte).
      await assert.rejects(
        () =>
          withTenantRls(client, tenantA.id, async (tx) => {
            await tx.$executeRaw`
              INSERT INTO stock_movements (tenant_id, item_id, type, quantidade_sinalizada, custody_type, source_type, source_id)
              VALUES (${tenantA.id}::uuid, ${custodyA.itemId}::uuid, 'saida', -1.0, 'base', 'fuel_log', ${baixaA.fuelLogId}::uuid)
            `;
          }),
        "2º EXIT da mesma fonte deve violar o índice parcial único (idempotência de origem)",
      );

      // (c) invisível sem contexto (fuel_logs / maintenance_order_items / stock_movements por origem).
      const fuelLogsWithoutContext = await client.fuelLog.findMany({
        where: { id: { in: [baixaA.fuelLogId, baixaB.fuelLogId, baixaC.fuelLogId] } },
      });
      assert.deepEqual(
        fuelLogsWithoutContext.map((entry) => entry.id),
        [],
        "tenant-scoped fuel logs must not be visible without app.current_tenant_id",
      );

      // (d) cross-tenant updateMany count=0 + (e) visível/intocado in-tenant.
      const tenantABaixaView = await withTenantRls(client, tenantA.id, async (tx) => {
        const visibleFuel = await tx.fuelLog.findMany({
          where: { id: { in: [baixaA.fuelLogId, baixaB.fuelLogId, baixaC.fuelLogId] } },
        });
        const crossFuelUpdate = await tx.fuelLog.updateMany({
          where: { id: { in: [baixaB.fuelLogId, baixaC.fuelLogId] } },
          data: { station: "RLS cross-tenant update should not apply" },
        });
        const crossExitUpdate = await tx.stockMovement.updateMany({
          where: { id: { in: [baixaB.exitId, baixaC.exitId] } },
          data: { reason: "RLS cross-tenant update should not apply" },
        });
        return {
          visibleFuelIds: visibleFuel.map((entry) => entry.id),
          crossFuelRows: crossFuelUpdate.count,
          crossExitRows: crossExitUpdate.count,
        };
      });
      assert.deepEqual(
        tenantABaixaView.visibleFuelIds,
        [baixaA.fuelLogId],
        "tenant A must only see its own fuel log with stock_item_id (not tenant B/C)",
      );
      assert.equal(tenantABaixaView.crossFuelRows, 0, "tenant A must not update tenant B/C fuel logs");
      assert.equal(tenantABaixaView.crossExitRows, 0, "tenant A must not update tenant B/C stock exit movements");

      const tenantBFuelLog = await withTenantRls(client, tenantB.id, (tx) => tx.fuelLog.findUnique({ where: { id: baixaB.fuelLogId } }));
      assert.equal(tenantBFuelLog?.stock_item_id, custodyB.itemId, "tenant B fuel log keeps its stock_item_id in-tenant");
      const tenantBExit = await withTenantRls(client, tenantB.id, (tx) => tx.stockMovement.findUnique({ where: { id: baixaB.exitId } }));
      assert.equal(tenantBExit?.source_type, "fuel_log", "tenant B stock exit keeps its source_type in-tenant");
      assert.equal(tenantBExit?.source_id, baixaB.fuelLogId, "tenant B stock exit keeps its source_id in-tenant");
      const tenantCMaintenanceStockItem = await withTenantRls(client, tenantC.id, (tx) =>
        tx.maintenanceOrderItem.findUnique({ where: { id: baixaC.maintenanceItemId } }),
      );
      assert.equal(tenantCMaintenanceStockItem?.stock_item_id, custodyC.itemId, "tenant C maintenance item keeps its stock_item_id in-tenant");

      const globalTenants = await client.tenant.findMany({
        where: {
          id: {
            in: tenantIds,
          },
        },
      });
      assert.equal(globalTenants.length, 3, "tenants must remain a global platform table");

      const usersWithoutContext = await client.user.findMany({
        where: {
          id: {
            in: [tenantAData.userId, tenantBData.userId],
          },
        },
      });
      assert.deepEqual(
        usersWithoutContext.map((user) => user.id),
        [],
        "tenant-scoped users must not be visible without app.current_tenant_id",
      );
      const notificationsWithoutContext = await client.notification.findMany({
        where: {
          id: {
            in: [tenantAData.notificationId, tenantBData.notificationId],
          },
        },
      });
      assert.deepEqual(
        notificationsWithoutContext.map((notification) => notification.id),
        [],
        "tenant-scoped notifications must not be visible without app.current_tenant_id",
      );
      const usageEventsWithoutContext = await client.cloudUsageEvent.findMany({
        where: {
          id: {
            in: [tenantAData.usageEventId, tenantBData.usageEventId],
          },
        },
      });
      assert.deepEqual(
        usageEventsWithoutContext.map((event) => event.id),
        [],
        "tenant-scoped cloud usage events must not be visible without app.current_tenant_id",
      );
      const usageAggregatesWithoutContext = await client.cloudUsageDailyAggregate.findMany({
        where: {
          id: {
            in: [tenantAData.usageAggregateId, tenantBData.usageAggregateId],
          },
        },
      });
      assert.deepEqual(
        usageAggregatesWithoutContext.map((aggregate) => aggregate.id),
        [],
        "tenant-scoped cloud usage aggregates must not be visible without app.current_tenant_id",
      );
      const fieldLocationsWithoutContext =
        await client.fieldOperatorLocation.findMany({
          where: {
            id: {
              in: [tenantAData.fieldLocationId, tenantBData.fieldLocationId],
            },
          },
        });
      assert.deepEqual(
        fieldLocationsWithoutContext.map((location) => location.id),
        [],
        "tenant-scoped field operator locations must not be visible without app.current_tenant_id",
      );
      const workOrdersWithoutContext = await client.workOrder.findMany({
        where: {
          id: {
            in: [tenantAData.workOrderId, tenantBData.workOrderId],
          },
        },
      });
      assert.deepEqual(
        workOrdersWithoutContext.map((workOrder) => workOrder.id),
        [],
        "tenant-scoped work orders must not be visible without app.current_tenant_id",
      );
      const workOrderEventsWithoutContext = await client.workOrderEvent.findMany({
        where: {
          id: {
            in: [tenantAData.workOrderEventId, tenantBData.workOrderEventId],
          },
        },
      });
      assert.deepEqual(
        workOrderEventsWithoutContext.map((event) => event.id),
        [],
        "tenant-scoped work order events must not be visible without app.current_tenant_id",
      );
      const workOrderAssignmentsWithoutContext = await client.workOrderAssignment.findMany({
        where: {
          id: {
            in: [tenantAData.workOrderAssignmentId, tenantBData.workOrderAssignmentId],
          },
        },
      });
      assert.deepEqual(
        workOrderAssignmentsWithoutContext.map((assignment) => assignment.id),
        [],
        "tenant-scoped work order assignments must not be visible without app.current_tenant_id",
      );
      const fieldDispatchesWithoutContext = await client.fieldDispatch.findMany({
        where: {
          id: {
            in: [tenantAData.fieldDispatchId, tenantBData.fieldDispatchId],
          },
        },
      });
      assert.deepEqual(
        fieldDispatchesWithoutContext.map((dispatch) => dispatch.id),
        [],
        "tenant-scoped field dispatches must not be visible without app.current_tenant_id",
      );
      const fieldDispatchEventsWithoutContext = await client.fieldDispatchEvent.findMany({
        where: {
          id: {
            in: [tenantAData.fieldDispatchEventId, tenantBData.fieldDispatchEventId],
          },
        },
      });
      assert.deepEqual(
        fieldDispatchEventsWithoutContext.map((event) => event.id),
        [],
        "tenant-scoped field dispatch events must not be visible without app.current_tenant_id",
      );
      const cloudCostAllocationsWithoutContext =
        await client.tenantCloudCostAllocation.findMany({
          where: {
            id: {
              in: [
                tenantAData.cloudCostAllocationId,
                tenantBData.cloudCostAllocationId,
              ],
            },
          },
        });
      assert.deepEqual(
        cloudCostAllocationsWithoutContext.map((allocation) => allocation.id),
        [],
        "tenant-scoped cloud cost allocations must not be visible without app.current_tenant_id",
      );
      const tenantCloudChargesWithoutContext =
        await client.tenantCloudCharge.findMany({
          where: {
            id: {
              in: [
                tenantAData.tenantCloudChargeId,
                tenantBData.tenantCloudChargeId,
              ],
            },
          },
        });
      assert.deepEqual(
        tenantCloudChargesWithoutContext.map((charge) => charge.id),
        [],
        "tenant-scoped cloud charges must not be visible without app.current_tenant_id",
      );

      const tenantAView = await withTenantRls(client, tenantA.id, async (tx) => {
        const users = await tx.user.findMany({
          where: {
            id: {
              in: [tenantAData.userId, tenantBData.userId],
            },
          },
        });
        const templates = await tx.checklistTemplate.findMany({
          where: {
            id: {
              in: [tenantAData.templateId, tenantBData.templateId],
            },
          },
        });
        const runs = await tx.checklistRun.findMany({
          where: {
            id: {
              in: [tenantAData.runId, tenantBData.runId],
            },
          },
        });
        const attachments = await tx.checklistAttachment.findMany({
          where: {
            id: {
              in: [tenantAData.attachmentId, tenantBData.attachmentId],
            },
          },
        });
        const notifications = await tx.notification.findMany({
          where: {
            id: {
              in: [tenantAData.notificationId, tenantBData.notificationId],
            },
          },
        });
        const usageEvents = await tx.cloudUsageEvent.findMany({
          where: {
            id: {
              in: [tenantAData.usageEventId, tenantBData.usageEventId],
            },
          },
        });
        const usageAggregates = await tx.cloudUsageDailyAggregate.findMany({
          where: {
            id: {
              in: [tenantAData.usageAggregateId, tenantBData.usageAggregateId],
            },
          },
        });
        const cloudCostAllocations = await tx.tenantCloudCostAllocation.findMany({
          where: {
            id: {
              in: [
                tenantAData.cloudCostAllocationId,
                tenantBData.cloudCostAllocationId,
              ],
            },
          },
        });
        const tenantCloudCharges = await tx.tenantCloudCharge.findMany({
          where: {
            id: {
              in: [
                tenantAData.tenantCloudChargeId,
                tenantBData.tenantCloudChargeId,
              ],
            },
          },
        });
        const crossTenantUpdate = await tx.user.updateMany({
          where: {
            id: tenantBData.userId,
          },
          data: {
            name: "RLS cross-tenant update should not apply",
          },
        });
        const crossTenantAllocationUpdate = await tx.tenantCloudCostAllocation.updateMany({
          where: {
            id: tenantBData.cloudCostAllocationId,
          },
          data: {
            cost_category: "rls_cross_tenant_update_should_not_apply",
          },
        });
        const crossTenantChargeUpdate = await tx.tenantCloudCharge.updateMany({
          where: {
            id: tenantBData.tenantCloudChargeId,
          },
          data: {
            status: "ready",
          },
        });
        const fieldLocations = await tx.fieldOperatorLocation.findMany({
          where: {
            id: {
              in: [tenantAData.fieldLocationId, tenantBData.fieldLocationId],
            },
          },
        });
        const crossTenantFieldLocationUpdate = await tx.fieldOperatorLocation.updateMany({
          where: {
            id: tenantBData.fieldLocationId,
          },
          data: {
            accuracy_meters: 99,
          },
        });
        const workOrders = await tx.workOrder.findMany({
          where: {
            id: {
              in: [tenantAData.workOrderId, tenantBData.workOrderId],
            },
          },
        });
        const workOrderEvents = await tx.workOrderEvent.findMany({
          where: {
            id: {
              in: [tenantAData.workOrderEventId, tenantBData.workOrderEventId],
            },
          },
        });
        const workOrderAssignments = await tx.workOrderAssignment.findMany({
          where: {
            id: {
              in: [tenantAData.workOrderAssignmentId, tenantBData.workOrderAssignmentId],
            },
          },
        });
        const fieldDispatches = await tx.fieldDispatch.findMany({
          where: {
            id: {
              in: [tenantAData.fieldDispatchId, tenantBData.fieldDispatchId],
            },
          },
        });
        const fieldDispatchEvents = await tx.fieldDispatchEvent.findMany({
          where: {
            id: {
              in: [tenantAData.fieldDispatchEventId, tenantBData.fieldDispatchEventId],
            },
          },
        });
        const crossTenantWorkOrderUpdate = await tx.workOrder.updateMany({
          where: {
            id: tenantBData.workOrderId,
          },
          data: {
            title: "RLS cross-tenant work order update should not apply",
          },
        });
        const crossTenantFieldDispatchUpdate = await tx.fieldDispatch.updateMany({
          where: {
            id: tenantBData.fieldDispatchId,
          },
          data: {
            observation: "RLS cross-tenant field dispatch update should not apply",
          },
        });

        return {
          attachmentIds: attachments.map((attachment) => attachment.id),
          cloudCostAllocationIds: cloudCostAllocations.map((allocation) => allocation.id),
          fieldDispatchEventIds: fieldDispatchEvents.map((event) => event.id),
          fieldDispatchIds: fieldDispatches.map((dispatch) => dispatch.id),
          fieldLocationIds: fieldLocations.map((location) => location.id),
          tenantCloudChargeIds: tenantCloudCharges.map((charge) => charge.id),
          workOrderAssignmentIds: workOrderAssignments.map((assignment) => assignment.id),
          workOrderEventIds: workOrderEvents.map((event) => event.id),
          workOrderIds: workOrders.map((workOrder) => workOrder.id),
          notificationIds: notifications.map((notification) => notification.id),
          runIds: runs.map((run) => run.id),
          templateIds: templates.map((template) => template.id),
          updatedAllocationRows: crossTenantAllocationUpdate.count,
          updatedChargeRows: crossTenantChargeUpdate.count,
          updatedFieldLocationRows: crossTenantFieldLocationUpdate.count,
          updatedFieldDispatchRows: crossTenantFieldDispatchUpdate.count,
          updatedWorkOrderRows: crossTenantWorkOrderUpdate.count,
          updatedRows: crossTenantUpdate.count,
          usageAggregateIds: usageAggregates.map((aggregate) => aggregate.id),
          usageEventIds: usageEvents.map((event) => event.id),
          userIds: users.map((user) => user.id),
        };
      });

      assert.deepEqual(tenantAView.userIds, [tenantAData.userId]);
      assert.deepEqual(tenantAView.templateIds, [tenantAData.templateId]);
      assert.deepEqual(tenantAView.runIds, [tenantAData.runId]);
      assert.deepEqual(tenantAView.attachmentIds, [tenantAData.attachmentId]);
      assert.deepEqual(tenantAView.notificationIds, [tenantAData.notificationId]);
      assert.deepEqual(tenantAView.usageAggregateIds, [tenantAData.usageAggregateId]);
      assert.deepEqual(tenantAView.usageEventIds, [tenantAData.usageEventId]);
      assert.deepEqual(tenantAView.fieldLocationIds, [tenantAData.fieldLocationId]);
      assert.deepEqual(tenantAView.fieldDispatchIds, [tenantAData.fieldDispatchId]);
      assert.deepEqual(tenantAView.fieldDispatchEventIds, [tenantAData.fieldDispatchEventId]);
      assert.deepEqual(tenantAView.workOrderIds, [tenantAData.workOrderId]);
      assert.deepEqual(tenantAView.workOrderEventIds, [tenantAData.workOrderEventId]);
      assert.deepEqual(tenantAView.workOrderAssignmentIds, [tenantAData.workOrderAssignmentId]);
      assert.deepEqual(tenantAView.cloudCostAllocationIds, [
        tenantAData.cloudCostAllocationId,
      ]);
      assert.deepEqual(tenantAView.tenantCloudChargeIds, [
        tenantAData.tenantCloudChargeId,
      ]);
      assert.equal(tenantAView.updatedRows, 0, "tenant A must not update tenant B rows");
      assert.equal(
        tenantAView.updatedAllocationRows,
        0,
        "tenant A must not update tenant B cloud cost allocations",
      );
      assert.equal(
        tenantAView.updatedChargeRows,
        0,
        "tenant A must not update tenant B cloud charges",
      );
      assert.equal(
        tenantAView.updatedFieldLocationRows,
        0,
        "tenant A must not update tenant B field operator locations",
      );
      assert.equal(
        tenantAView.updatedFieldDispatchRows,
        0,
        "tenant A must not update tenant B field dispatches",
      );
      assert.equal(
        tenantAView.updatedWorkOrderRows,
        0,
        "tenant A must not update tenant B work orders",
      );

      const tenantBUser = await withTenantRls(client, tenantB.id, (tx) =>
        tx.user.findUnique({
          where: {
            id: tenantBData.userId,
          },
        }),
      );
      assert.equal(tenantBUser?.name, "RLS User B");
      const tenantBCloudCostAllocation = await withTenantRls(client, tenantB.id, (tx) =>
        tx.tenantCloudCostAllocation.findUnique({
          where: {
            id: tenantBData.cloudCostAllocationId,
          },
        }),
      );
      assert.equal(tenantBCloudCostAllocation?.cost_category, "storage");
      const tenantBCloudCharge = await withTenantRls(client, tenantB.id, (tx) =>
        tx.tenantCloudCharge.findUnique({
          where: {
            id: tenantBData.tenantCloudChargeId,
          },
        }),
      );
      assert.equal(tenantBCloudCharge?.status, "draft");
      const tenantBFieldLocation = await withTenantRls(client, tenantB.id, (tx) =>
        tx.fieldOperatorLocation.findUnique({
          where: {
            id: tenantBData.fieldLocationId,
          },
        }),
      );
      assert.equal(tenantBFieldLocation?.accuracy_meters, 10);
      const tenantBWorkOrder = await withTenantRls(client, tenantB.id, (tx) =>
        tx.workOrder.findUnique({
          where: {
            id: tenantBData.workOrderId,
          },
        }),
      );
      assert.equal(tenantBWorkOrder?.title, "RLS Work Order B");
      const tenantBFieldDispatch = await withTenantRls(client, tenantB.id, (tx) =>
        tx.fieldDispatch.findUnique({
          where: {
            id: tenantBData.fieldDispatchId,
          },
        }),
      );
      assert.equal(tenantBFieldDispatch?.observation, "RLS field dispatch B");
    } finally {
      // Ω5P PR-05 — purga a CUSTÓDIA ANTES do loop low-priv (custody_events → impound_processes). custody_events
      // tem TRIGGER append-only (BEFORE UPDATE OR DELETE) que a ROLE DA APP (low-priv, NOSUPERUSER) NÃO contorna;
      // o teardown usa o adminClient (superuser) com session_replication_role=replica (só superuser), o caminho de
      // manutenção padrão do Postgres (o trigger não dispara em modo replica). O superuser também bypassa RLS, então
      // varre os 3 tenants. impound_processes → jurisdiction_profiles/yards/tenant são RESTRICT, então a custódia
      // cai ANTES do loop que apaga perfis/pátios/tenant. TEARDOWN FK-SAFE (custody_events → impound_processes).
      await adminClient.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        for (const tenantId of tenantIds) {
          await tx.$executeRawUnsafe(`DELETE FROM custody_events WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-14a — settlement_allocations → settlements → impound_processes (RESTRICT em cadeia): purga o rateio
          // ANTES da liquidação ANTES do processo (TEARDOWN FK-SAFE; settlement_allocations ANTES de settlements).
          await tx.$executeRawUnsafe(`DELETE FROM settlement_allocations WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM settlements WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-13a — auction_edicts → impound_processes é RESTRICT: purga a designação de leilão ANTES do processo
          // (TEARDOWN FK-SAFE; auction_edicts ANTES de custody_events/impound_processes).
          await tx.$executeRawUnsafe(`DELETE FROM auction_edicts WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-12 — auction_attempts → impound_processes é RESTRICT: purga o contador de leilão ANTES do processo
          // (TEARDOWN FK-SAFE; auction_attempts ANTES de custody_events/impound_processes).
          await tx.$executeRawUnsafe(`DELETE FROM auction_attempts WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-06 — intake_inspections → impound_processes é RESTRICT: purga a vistoria ANTES do processo.
          await tx.$executeRawUnsafe(`DELETE FROM impound_intake_inspections WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-07 — process_charges/daily_accrual_runs → impound_processes/tenant é RESTRICT: purga os encargos
          // e os runs ANTES do processo (TEARDOWN FK-SAFE).
          await tx.$executeRawUnsafe(`DELETE FROM process_charges WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM daily_accrual_runs WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-09 — process_notifications → impound_processes é RESTRICT: purga a trilha ANTES do processo.
          await tx.$executeRawUnsafe(`DELETE FROM process_notifications WHERE tenant_id = '${tenantId}'::uuid`);
          // Ω5P PR-10a — release_requirement_checks → impound_releases → impound_processes (RESTRICT em cadeia):
          // purga os checks ANTES das liberações ANTES do processo (TEARDOWN FK-SAFE).
          await tx.$executeRawUnsafe(`DELETE FROM release_requirement_checks WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM impound_releases WHERE tenant_id = '${tenantId}'::uuid`);
          await tx.$executeRawUnsafe(`DELETE FROM impound_processes WHERE tenant_id = '${tenantId}'::uuid`);
        }
      });
      for (const tenantId of tenantIds) {
        await withTenantRls(client, tenantId, async (tx) => {
          // Ω4C PR-08 — movimentos de estoque ANTES de operator_profiles/vehicles/inventory_items (as FK
          // compostas RESTRICT custody_operator_profile_id/custody_vehicle_id e item_id) — senão o cleanup
          // quebra na FK (lição do CI-catch do PR-06). inventory_items depois dos movimentos que os referenciam.
          await tx.stockMovement.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-08b — fuel_logs ANTES de inventory_items (nova FK RESTRICT fuel_logs.stock_item_id) E ANTES de
          // vehicles (FK vehicle_id). inventory_items foi MOVIDO para DEPOIS de maintenance_order_items (que também
          // referencia stock_item_id) — senão o cleanup quebra na FK RESTRICT (23503; lição do CI-catch do PR-06).
          await tx.fuelLog.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-04 — definições agendadas ANTES dos users (FK created_by é Cascade, mas explícito é limpo).
          await tx.scheduledNotification.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-03 — parcelas do extrato ANTES dos perfis (FK operator_profile é Restrict) e dos perfis ANTES
          // dos users (o cascade user→operator_profile falharia com parcela referenciando o perfil).
          await tx.professionalStatementEntry.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-10 — commission_calculations ANTES dos users (FK payee_id → users é Restrict), basis_events e
          // policies DEPOIS (calc → basis Cascade + calc/basis → policy Restrict), tudo ANTES do tenant. TEARDOWN
          // FK-SAFE (lição do CI-catch do PR-06).
          await tx.commissionCalculation.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.commissionBasisEvent.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.commissionPolicy.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-07 — multas ANTES dos perfis (FK responsible_operator_profile_id → operator_profiles é
          // Restrict) E ANTES das viaturas (FK fines.vehicle_id → vehicles é Restrict); senão o cleanup quebra
          // na FK (lição do CI-catch do PR-06).
          await tx.fine.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-09 — danos ANTES dos perfis (FK responsible_operator_profile_id → operator_profiles é
          // Restrict, a coluna ADITIVA da 20260829000000) E ANTES das viaturas (FK damages.vehicle_id →
          // vehicles é Restrict). TEARDOWN FK-SAFE (lição do CI-catch do PR-06). damage_attachments caem por
          // Cascade da própria FK ao dano.
          await tx.damage.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-12 — telemetria ANTES dos perfis. A FK composta (tenant_id, operator_profile_id) →
          // operator_profiles é CASCADE, mas o delete explícito antecipa a limpeza (TEARDOWN FK-SAFE, lição
          // do CI-catch do PR-06 — telemetry_events antes de operator_profiles/users/tenants).
          await tx.telemetryEvent.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.operatorProfile.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-02 — títulos lançados por origem (cleanup antes do tenant; FK ao tenant é Restrict).
          await tx.financialTitle.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.attachment.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.fieldDispatchEvent.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.fieldDispatch.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.workOrderAssignment.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.workOrderEvent.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.workOrder.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-06 — itens da manutenção ANTES das ordens (FK maintenance_order_items→maintenance_orders é
          // Restrict), ordens ANTES das viaturas (maintenance_orders.vehicle_id→vehicles), e viaturas ANTES do
          // tenant (vehicles.tenant_id→tenants, o que quebrava a deleção do tenant com FK vehicles_tenant_id_fkey).
          // workOrder já foi removido acima (também referencia vehicle).
          await tx.maintenanceOrderItem.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω4C PR-08b — inventory_items DEPOIS de stock_movements/fuel_logs/maintenance_order_items (as três
          // referenciam inventory_items via FK RESTRICT: item_id / stock_item_id). Ordem-alvo do teardown:
          // stockMovement → fuelLog → … → maintenanceOrderItem → inventoryItem → maintenanceOrder → vehicle.
          await tx.inventoryItem.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.maintenanceOrder.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.vehicle.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.fieldOperatorLocation.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.tenantCloudCharge.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.tenantCloudCostAllocation.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.cloudUsageDailyAggregate.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.cloudUsageEvent.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.checklistRun.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.checklistTemplate.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω5P PR-03 — price_tables ANTES do tenant (FK única em price_tables = tenant, RESTRICT). tariffs→price_tables
          // é CASCADE, mas nenhuma tarifa é inserida aqui; o delete explícito antecede o tenant. TEARDOWN FK-SAFE.
          await tx.priceTable.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω5P PR-02 — jurisdiction_profiles ANTES do tenant (FK única = tenant, RESTRICT). Sem dependentes ainda
          // (ImpoundProcess = PR-05), então cai isolado — só precede o tenant. TEARDOWN FK-SAFE.
          await tx.jurisdictionProfile.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          // Ω5P PR-01 — yard_spots → yard_areas → yards ANTES de branch/user/tenant. As FK de vaga/área são
          // CASCADE, mas o delete explícito antecipa a limpeza (TEARDOWN FK-SAFE, lição do CI-catch do PR-06);
          // yards→branches e yards→tenants são RESTRICT, então yards têm de cair antes de branch e do tenant.
          await tx.yardSpot.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.yardArea.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.yard.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.user.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
          await tx.branch.deleteMany({
            where: {
              tenant_id: tenantId,
            },
          });
        });
      }

      if (allocationRunId) {
        if (chargeCalculationRunId) {
          await client.cloudChargeCalculationRun.deleteMany({
            where: {
              id: chargeCalculationRunId,
            },
          });
        }
        await client.cloudCostAllocationRun.deleteMany({
          where: {
            id: allocationRunId,
          },
        });
      }
      if (chargeRuleId) {
        await client.cloudChargeRule.deleteMany({
          where: {
            id: chargeRuleId,
          },
        });
      }
      await client.tenant.deleteMany({
        where: {
          id: {
            in: tenantIds,
          },
        },
      });
      await client.$disconnect();
      // Teardown da role no MESMO lock de catálogo (DROP OWNED/DROP ROLE também escrevem
      // pg_authid/pg_auth_members e disputariam com os outros escritores do batch).
      //
      // SAN2-4b, C4: era `DROP OWNED` + `DROP ROLE` CRUS dentro de UMA transação — a terceira porta
      // de gênese de órfã desta família (medicao-3 O-2), além do SIGKILL e do SIGINT. Erro no
      // primeiro statement ABORTA a transação (`25P02`) e o segundo nunca chega a ser emitido: a
      // role sobrevive com LOGIN e 460 grants, e a exceção ainda mascara o erro original do teste
      // por vir de dentro de um `finally`. Medido no bloco: **10/10 sobreviveu** na forma crua
      // contra **0/10** com o helper, sob a mesma falha transitória injetada.
      //
      // `dropEphemeralRoleResilient` toma o lock POR STATEMENT (janelas curtas, PB), repete a
      // sequência inteira contra a armadilha `2BP01`, REPORTA as falhas no stderr e falha ALTO se a
      // role sobreviver. É o mesmo caminho que `vehicle-identity-schema` e
      // `impound-process-checklist-link-schema` já usam — esta família era a única de fora.
      await dropEphemeralRoleResilient(adminClient, roleName);
      await adminClient.$disconnect();
    }
  });
}

function buildConnectionStringForRole(
  source: string,
  roleName: string,
  rolePassword: string,
): string {
  const url = new URL(source);
  url.username = roleName;
  url.password = rolePassword;

  return url.toString();
}

function escapeSqlLiteral(value: string): string {
  return value.replace(/'/g, "''");
}
