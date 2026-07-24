import "dotenv/config";

import assert from "node:assert/strict";
import test from "node:test";

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

    await adminClient.$executeRawUnsafe(
      `CREATE ROLE "${roleName}" LOGIN PASSWORD '${escapeSqlLiteral(rolePassword)}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT`,
    );
    await adminClient.$executeRawUnsafe(`GRANT USAGE ON SCHEMA public TO "${roleName}"`);
    await adminClient.$executeRawUnsafe(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO "${roleName}"`,
    );
    await adminClient.$executeRawUnsafe(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO "${roleName}"`,
    );

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
          await tx.inventoryItem.deleteMany({
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
      await adminClient.$executeRawUnsafe(`DROP OWNED BY "${roleName}"`);
      await adminClient.$executeRawUnsafe(`DROP ROLE IF EXISTS "${roleName}"`);
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
