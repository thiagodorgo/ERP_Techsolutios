import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
  STANDARD_ROLES,
  type Permission,
  type Role,
} from "../src/modules/core-saas/permissions/catalog.js";
import {
  LocalAuthCredentialRepository,
  LocalAuthCredentialService,
} from "../src/modules/auth/index.js";
import { withTenantRls } from "../src/database/rls.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma/seed.ts.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const permissionDescriptions = {
  "platform:cloud-charge-rules:read": "Consultar regras comerciais de markup cloud no Console da Plataforma.",
  "platform:cloud-charge-rules:write": "Criar e editar regras comerciais de markup cloud no Console da Plataforma.",
  "platform:cloud-charges:read": "Consultar calculos e charges cloud por tenant no Console da Plataforma.",
  "platform:cloud-charges:calculate": "Executar calculo de charges cloud com markup por tenant.",
  "platform:cloud-cost-allocation:read": "Consultar runs e alocacoes de custo cloud por tenant.",
  "platform:cloud-cost-allocation:run": "Executar motor de alocacao de custo cloud por tenant.",
  "platform:cloud-costs:read": "Consultar custos AWS CUR brutos importados no Console da Plataforma.",
  "platform:cloud-costs:import": "Importar custos AWS CUR via fonte segura sem credenciais reais.",
  "platform:cloud-usage:read": "Consultar uso cloud medido por tenant no Console da Plataforma.",
  "platform:dashboard:read": "Consultar visao geral do Console da Plataforma.",
  "platform:tenants:read": "Consultar tenants no Console da Plataforma.",
  "platform:audit:read": "Consultar auditoria global do Console da Plataforma.",
  "tenant.manage": "Gerenciar configuracoes, filiais e dados administrativos do tenant.",
  "users.manage": "Criar e alterar usuarios do tenant.",
  "users.read": "Consultar usuarios do tenant.",
  "users:read": "Consultar usuarios do tenant no padrao RBAC namespace.",
  "roles.manage": "Consultar e manter papeis e permissoes.",
  "audit.read": "Consultar trilhas de auditoria do tenant.",
  "audit:read": "Consultar trilhas de auditoria do tenant no padrao RBAC namespace.",
  "dashboard:read": "Consultar dashboard e visao operacional do tenant.",
  "tenant_settings:read": "Consultar configuracoes administrativas do tenant.",
  "tenant_settings:update": "Criar e atualizar Parametros (configuracoes key-value) do tenant.",
  "work_orders:read": "Consultar ordens de servico.",
  "work_orders:create": "Criar ordens de servico.",
  "work_orders:update": "Atualizar dados editaveis de ordens de servico.",
  "work_orders:assign": "Atribuir operador ou usuario a ordens de servico.",
  "work_orders:status": "Alterar status operacional de ordens de servico.",
  "work_orders:cancel": "Cancelar ordens de servico.",
  "work_orders:delete": "Excluir ordens de servico quando permitido por regra futura.",
  "field_location:read": "Consultar localizacao operacional de campo.",
  "field_location:send": "Enviar localizacao operacional de campo.",
  "field_location:history": "Consultar historico de localizacao de campo.",
  "field_operator:read": "Consultar operadores em campo.",
  "field_operator:action": "Executar acoes sobre operadores em campo.",
  "field_dispatch:read": "Consultar despachos operacionais.",
  "field_dispatch:create": "Criar despachos operacionais.",
  "field_dispatch:update": "Atualizar despachos operacionais.",
  "field_dispatch:cancel": "Cancelar despachos operacionais com motivo.",
  "field_dispatch:reassign": "Reatribuir despachos operacionais para outro operador.",
  "logistics:read": "Consultar visao logistica do tenant.",
  "logistics_routes:read": "Consultar rotas logisticas.",
  "billing:read": "Consultar cobrancas do tenant.",
  "invoices:read": "Consultar faturas do tenant.",
  "payments:read": "Consultar pagamentos do tenant.",
  "commissions:read": "Consultar politicas, eventos-base e resultados do motor de comissoes do tenant.",
  "commissions:read_own": "Consultar apenas informacoes proprias de comissao quando a visao individual estiver disponivel.",
  "commissions:manage_policy": "Criar e manter politicas e regras-base de comissao do tenant.",
  "commissions:calculate": "Registrar eventos-base e executar a base operacional do motor de comissoes.",
  "commissions:approve": "Aprovar resultados e ciclos de comissao quando a etapa estiver disponivel.",
  "commissions:adjust": "Registrar ajustes controlados de comissao quando a etapa estiver disponivel.",
  "commissions:settle": "Marcar ciclos de comissao como liquidados quando a etapa estiver disponivel.",
  "commissions:audit": "Consultar trilha e diagnostico operacional do motor de comissoes.",
  "expense_report:read": "Consultar Prestações de Contas permitidas do tenant.",
  "expense_report:read_own": "Consultar apenas Prestações de Contas próprias.",
  "expense_report:create": "Criar Prestação de Contas no modulo Gestao de Despesas.",
  "expense_report:update": "Atualizar Prestação de Contas em status editavel.",
  "expense_report:submit": "Submeter Prestação de Contas para aprovacao.",
  "expense_report:approve_manager": "Aprovar Prestação de Contas operacionalmente como manager.",
  "expense_report:approve_finance": "Validar Prestação de Contas financeiramente.",
  "expense_report:return": "Devolver Prestação de Contas para correcao com motivo.",
  "expense_report:reject": "Rejeitar Prestação de Contas com justificativa.",
  "expense_report:pay": "Agendar ou registrar pagamento/devolucao futura de Prestação de Contas.",
  "expense_policy:read": "Consultar politicas e categorias de Gestao de Despesas.",
  "expense_policy:manage": "Gerenciar politicas de Gestao de Despesas.",
  "expense_receipt:attach": "Anexar metadados de recibos a itens de despesa.",
  "expense_sync:write": "Enviar lote idempotente de acoes mobile de despesas.",
  "expense_audit:read": "Consultar trilha e diagnostico de Gestao de Despesas.",
  "os.manage": "Gerenciar ordens de servico.",
  "os.read": "Consultar ordens de servico.",
  "inventory.manage": "Gerenciar estoque e movimentacoes.",
  "inventory.read": "Consultar estoque.",
  "finance.manage": "Gerenciar informacoes financeiras.",
  "finance.read": "Consultar informacoes financeiras.",
  "finance:read": "Consultar informacoes financeiras no padrao RBAC namespace.",
  "notifications:read": "Consultar a propria caixa de notificacoes internas.",
  "notifications:update": "Marcar notificacoes proprias como lidas ou arquivadas.",
  "tenant_checklists:read": "Consultar checklists configuraveis do tenant.",
  "tenant_checklists:create": "Criar checklists configuraveis do tenant.",
  "tenant_checklists:update": "Editar, ativar e inativar checklists configuraveis do tenant.",
  "tenant_checklists:publish": "Publicar versoes de checklist configuravel.",
  "checklist_runs:read": "Consultar execucoes, comparacoes, respostas e evidencias de checklist.",
  "checklist_runs:create": "Iniciar execucoes de checklist publicado.",
  "checklist_runs:update": "Registrar respostas, anexos, marcadores e divergencias de checklist.",
  "checklist_runs:complete": "Concluir execucoes de checklist.",
  "checklist_runs:acknowledge": "Registrar ciencia de responsabilidade em execucoes de checklist.",
  "price_tables:read": "Consultar Tabelas de Valores (precos) do tenant.",
  "price_tables:create": "Criar Tabelas de Valores do tenant.",
  "price_tables:update": "Editar, publicar, arquivar e inativar Tabelas de Valores do tenant.",
  "tariffs:read": "Consultar Tarifas (itens de preco) das Tabelas de Valores do tenant.",
  "tariffs:create": "Criar Tarifas nas Tabelas de Valores do tenant.",
  "tariffs:update": "Editar e inativar Tarifas das Tabelas de Valores do tenant.",
  "branches:read": "Consultar Filiais do tenant.",
  "branches:create": "Criar Filiais do tenant.",
  "branches:update": "Editar e inativar Filiais do tenant (status inactive).",
  "suppliers:read": "Consultar Fornecedores do tenant.",
  "suppliers:create": "Criar Fornecedores do tenant.",
  "suppliers:update": "Editar e inativar Fornecedores do tenant.",
  "operator_profiles:read": "Consultar Profissionais (perfis dos operadores de campo) do tenant.",
  "operator_profiles:create": "Criar Profissionais (perfil profissional de operador de campo) do tenant.",
  "operator_profiles:update": "Editar, gerir consentimento e inativar Profissionais do tenant.",
  "tags:read": "Consultar Tags (marcadores/etiquetas) do tenant.",
  "tags:create": "Criar Tags do tenant.",
  "tags:update": "Editar e inativar Tags do tenant.",
  "pois:read": "Consultar POIs (pontos de interesse geograficos) do tenant.",
  "pois:create": "Criar POIs do tenant.",
  "pois:update": "Editar e inativar POIs do tenant.",
} satisfies Record<Permission, string>;

async function main(): Promise<void> {
  // Ω-ACESSO — módulos provisionados ao tenant demo (governam a visibilidade dos itens de menu com
  // requiredModules; field_operations habilita o Mapa Operacional). Sem isto o menu vem vazio (modules []).
  const DEMO_TENANT_MODULES = [
    "dashboard",
    "work_orders",
    "field_operations",
    "logistics",
    "finance",
    "checklists",
    "tenant_checklist",
    "notifications",
    "users",
    "audit",
  ];
  const tenant = await prisma.tenant.upsert({
    where: {
      slug: "demo",
    },
    update: {
      name: "Tenant Demo",
      status: "active",
      modules: DEMO_TENANT_MODULES,
    },
    create: {
      name: "Tenant Demo",
      slug: "demo",
      status: "active",
      modules: DEMO_TENANT_MODULES,
    },
  });

  const permissions = new Map<Permission, { id: string }>();
  const roles = new Map<Role, { id: string }>();

  for (const permission of PERMISSION_CATALOG) {
    // Fallback: permissões novas (ex.: frota/estoque da Rodada F) podem não ter
    // descrição no mapa — `description` é NOT NULL, então geramos uma genérica.
    const description = permissionDescriptions[permission] ?? `Permissão ${permission}.`;
    const permissionRecord = await prisma.permission.upsert({
      where: {
        key: permission,
      },
      update: {
        description,
      },
      create: {
        key: permission,
        description,
      },
      select: {
        id: true,
      },
    });

    permissions.set(permission, permissionRecord);
  }

  for (const role of STANDARD_ROLES) {
    const roleRecord = await upsertSystemRole(role);
    roles.set(role, roleRecord);

    for (const permission of ROLE_PERMISSIONS[role]) {
      const permissionRecord = permissions.get(permission);

      if (!permissionRecord) {
        throw new Error(`Permission not seeded: ${permission}`);
      }

      await prisma.rolePermission.upsert({
        where: {
          role_id_permission_id: {
            role_id: roleRecord.id,
            permission_id: permissionRecord.id,
          },
        },
        update: {},
        create: {
          role_id: roleRecord.id,
          permission_id: permissionRecord.id,
        },
      });
    }
  }

  const tenantAdminRole = roles.get("tenant_admin");
  const superAdminRole = roles.get("super_admin");

  if (!tenantAdminRole) {
    throw new Error("tenant_admin role was not seeded.");
  }

  if (!superAdminRole) {
    throw new Error("super_admin role was not seeded.");
  }

  await withTenantRls(prisma, tenant.id, async (tx) => {
    const branch = await tx.branch.upsert({
      where: {
        tenant_id_code: {
          tenant_id: tenant.id,
          code: "MAIN",
        },
      },
      update: {
        name: "Filial Principal",
        status: "active",
      },
      create: {
        tenant_id: tenant.id,
        name: "Filial Principal",
        code: "MAIN",
        status: "active",
      },
    });

    // Ω2-e — Parâmetros default do tenant demo (upsert idempotente por [tenant_id, key]).
    const demoTenantSettings = [
      { key: "organization.theme", value: "enterprise_blue", category: "appearance" },
      { key: "organization.currency", value: "BRL", category: "general" },
      { key: "organization.timezone", value: "America/Sao_Paulo", category: "general" },
      { key: "organization.business_name", value: "Organização Demonstração", category: "general" },
    ];

    for (const setting of demoTenantSettings) {
      await tx.tenantSetting.upsert({
        where: {
          tenant_id_key: {
            tenant_id: tenant.id,
            key: setting.key,
          },
        },
        update: {
          value: setting.value,
          category: setting.category,
        },
        create: {
          tenant_id: tenant.id,
          key: setting.key,
          value: setting.value,
          category: setting.category,
        },
      });
    }

    const admin = await tx.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: tenant.id,
          email: "admin.demo@example.com",
        },
      },
      update: {
        name: "Admin Demo",
        status: "active",
        branch_id: branch.id,
      },
      create: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        name: "Admin Demo",
        email: "admin.demo@example.com",
        status: "active",
      },
    });

    const existingAdminAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: admin.id,
        role_id: tenantAdminRole.id,
        branch_id: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingAdminAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          tenant_id: tenant.id,
          user_id: admin.id,
          role_id: tenantAdminRole.id,
          branch_id: null,
        },
      });
    }

    const localAuthCredentials = new LocalAuthCredentialService(
      new LocalAuthCredentialRepository(tx),
      {
        findByIdForTenant: (userId, tenantId) =>
          tx.user.findFirst({
            where: {
              id: userId,
              tenant_id: tenantId,
            },
            select: {
              id: true,
              tenant_id: true,
              email: true,
            },
          }),
      },
    );

    await localAuthCredentials.upsertCredentialForUser({
      tenant_id: tenant.id,
      user_id: admin.id,
      email: admin.email,
      password: readDemoAdminPassword(),
    });

    const platformAdmin = await tx.user.upsert({
      where: {
        tenant_id_email: {
          tenant_id: tenant.id,
          email: readPlatformAdminEmail(),
        },
      },
      update: {
        name: "Platform Admin Local",
        status: "active",
        branch_id: branch.id,
      },
      create: {
        tenant_id: tenant.id,
        branch_id: branch.id,
        name: "Platform Admin Local",
        email: readPlatformAdminEmail(),
        status: "active",
      },
    });

    const existingPlatformAdminAssignment = await tx.userRoleAssignment.findFirst({
      where: {
        tenant_id: tenant.id,
        user_id: platformAdmin.id,
        role_id: superAdminRole.id,
        branch_id: null,
      },
      select: {
        id: true,
      },
    });

    if (!existingPlatformAdminAssignment) {
      await tx.userRoleAssignment.create({
        data: {
          tenant_id: tenant.id,
          user_id: platformAdmin.id,
          role_id: superAdminRole.id,
          branch_id: null,
        },
      });
    }

    await localAuthCredentials.upsertCredentialForUser({
      tenant_id: tenant.id,
      user_id: platformAdmin.id,
      email: platformAdmin.email,
      password: readPlatformAdminPassword(),
    });

    const existingSeedAudit = await tx.auditLog.findFirst({
      where: {
        tenant_id: tenant.id,
        action: "seed.initialized",
        entity: "database",
        entity_id: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!existingSeedAudit) {
      await tx.auditLog.create({
        data: {
          tenant_id: tenant.id,
          actor_user_id: admin.id,
          action: "seed.initialized",
          entity: "database",
          entity_id: tenant.id,
          metadata: {
            source: "prisma/seed.ts",
            auth_note: "Admins locais criados com senhas configuraveis por DEMO_ADMIN_PASSWORD e E2E_PLATFORM_PASSWORD.",
          },
        },
      });
    }
  });
}

async function upsertSystemRole(role: Role): Promise<{ id: string }> {
  const existingRole = await prisma.role.findFirst({
    where: {
      key: role,
      tenant_id: null,
    },
    select: {
      id: true,
    },
  });

  if (existingRole) {
    return prisma.role.update({
      where: {
        id: existingRole.id,
      },
      data: {
        name: formatRoleName(role),
        scope: "system",
      },
      select: {
        id: true,
      },
    });
  }

  return prisma.role.create({
    data: {
      key: role,
      name: formatRoleName(role),
      scope: "system",
    },
    select: {
      id: true,
    },
  });
}

function formatRoleName(role: string): string {
  return role
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function readDemoAdminPassword(): string {
  const configuredPassword = process.env.DEMO_ADMIN_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("DEMO_ADMIN_PASSWORD is required when running seed in production.");
  }

  return "ChangeMe123!";
}

function readPlatformAdminEmail(): string {
  return process.env.E2E_PLATFORM_EMAIL?.trim().toLowerCase() || "platform.admin@erp.local";
}

function readPlatformAdminPassword(): string {
  const configuredPassword = process.env.E2E_PLATFORM_PASSWORD?.trim() || process.env.PLATFORM_ADMIN_PASSWORD?.trim();

  if (configuredPassword) {
    return configuredPassword;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("E2E_PLATFORM_PASSWORD or PLATFORM_ADMIN_PASSWORD is required when running seed in production.");
  }

  return "platform-admin-dev-password";
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
