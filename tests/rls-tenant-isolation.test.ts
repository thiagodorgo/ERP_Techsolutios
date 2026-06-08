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
      tenantIds.push(tenantA.id, tenantB.id);

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

        return {
          branchId: branch.id,
          userId: user.id,
          templateId: template.id,
          runId: run.id,
          attachmentId: attachment.id,
          notificationId: notification.id,
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

        return {
          branchId: branch.id,
          userId: user.id,
          templateId: template.id,
          runId: run.id,
          attachmentId: attachment.id,
          notificationId: notification.id,
        };
      });

      const globalTenants = await client.tenant.findMany({
        where: {
          id: {
            in: tenantIds,
          },
        },
      });
      assert.equal(globalTenants.length, 2, "tenants must remain a global platform table");

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
        const crossTenantUpdate = await tx.user.updateMany({
          where: {
            id: tenantBData.userId,
          },
          data: {
            name: "RLS cross-tenant update should not apply",
          },
        });

        return {
          attachmentIds: attachments.map((attachment) => attachment.id),
          notificationIds: notifications.map((notification) => notification.id),
          runIds: runs.map((run) => run.id),
          templateIds: templates.map((template) => template.id),
          updatedRows: crossTenantUpdate.count,
          userIds: users.map((user) => user.id),
        };
      });

      assert.deepEqual(tenantAView.userIds, [tenantAData.userId]);
      assert.deepEqual(tenantAView.templateIds, [tenantAData.templateId]);
      assert.deepEqual(tenantAView.runIds, [tenantAData.runId]);
      assert.deepEqual(tenantAView.attachmentIds, [tenantAData.attachmentId]);
      assert.deepEqual(tenantAView.notificationIds, [tenantAData.notificationId]);
      assert.equal(tenantAView.updatedRows, 0, "tenant A must not update tenant B rows");

      const tenantBUser = await withTenantRls(client, tenantB.id, (tx) =>
        tx.user.findUnique({
          where: {
            id: tenantBData.userId,
          },
        }),
      );
      assert.equal(tenantBUser?.name, "RLS User B");
    } finally {
      for (const tenantId of tenantIds) {
        await withTenantRls(client, tenantId, async (tx) => {
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
