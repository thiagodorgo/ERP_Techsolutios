// Seed de FROTA (dados de demonstração) — popula o Mapa Operacional e as telas
// da Rodada F (Frota/Estoque) para o ambiente local em modo REAL.
// Idempotente: se a viatura "FLT-0001" já existir, não faz nada.
//
//   npm run db:seed        # base (tenant/roles/admin) — rode ANTES
//   npx tsx prisma/seed-fleet.ts
//
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import {
  LocalAuthCredentialRepository,
  LocalAuthCredentialService,
} from "../src/modules/auth/index.js";
import { withTenantRls } from "../src/database/rls.js";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run prisma/seed-fleet.ts.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// São Paulo — ponto base + offsets por operador (pins distintos no mapa).
const BASE_LAT = -23.55052;
const BASE_LNG = -46.633308;

async function main(): Promise<void> {
  const tenant = await prisma.tenant.findFirst({ where: { slug: "demo" }, select: { id: true } });
  if (!tenant) {
    throw new Error("Tenant 'demo' não encontrado. Rode `npm run db:seed` primeiro.");
  }

  await withTenantRls(prisma, tenant.id, async (tx) => {
    const tenantId = tenant.id;

    const already = await tx.vehicle.findFirst({ where: { tenant_id: tenantId, plate: "FLT-0001" }, select: { id: true } });
    if (already) {
      console.log("[seed-fleet] Frota demo já populada (FLT-0001 existe) — nada a fazer.");
      return;
    }

    const branch = await tx.branch.findFirst({ where: { tenant_id: tenantId, code: "MAIN" }, select: { id: true } });
    const admin = await tx.user.findFirst({ where: { tenant_id: tenantId, email: "admin.demo@example.com" }, select: { id: true } });
    const adminId = admin?.id ?? null;

    // Operador de campo (recebe o pin no mapa). Papel operator se existir.
    const operator = await tx.user.upsert({
      where: { tenant_id_email: { tenant_id: tenantId, email: "operador.demo@example.com" } },
      update: { name: "Marina Costa", status: "active", branch_id: branch?.id ?? null },
      create: { tenant_id: tenantId, branch_id: branch?.id ?? null, name: "Marina Costa", email: "operador.demo@example.com", status: "active" },
      select: { id: true, email: true },
    });
    const operator2 = await tx.user.upsert({
      where: { tenant_id_email: { tenant_id: tenantId, email: "operador2.demo@example.com" } },
      update: { name: "Roberto Lima", status: "active", branch_id: branch?.id ?? null },
      create: { tenant_id: tenantId, branch_id: branch?.id ?? null, name: "Roberto Lima", email: "operador2.demo@example.com", status: "active" },
      select: { id: true, email: true },
    });

    const operatorRole = await tx.role.findFirst({ where: { key: "operator", tenant_id: null }, select: { id: true } });
    if (operatorRole) {
      for (const u of [operator, operator2]) {
        const has = await tx.userRoleAssignment.findFirst({ where: { tenant_id: tenantId, user_id: u.id, role_id: operatorRole.id, branch_id: null }, select: { id: true } });
        if (!has) await tx.userRoleAssignment.create({ data: { tenant_id: tenantId, user_id: u.id, role_id: operatorRole.id, branch_id: null } });
      }
    }
    // Credencial p/ o operador logar e ver o próprio extrato/telas de campo.
    const creds = new LocalAuthCredentialService(new LocalAuthCredentialRepository(tx), {
      findByIdForTenant: (userId, tId) => tx.user.findFirst({ where: { id: userId, tenant_id: tId }, select: { id: true, tenant_id: true, email: true } }),
    });
    const operatorPassword = process.env.DEMO_ADMIN_PASSWORD?.trim() || "ChangeMe123!";
    await creds.upsertCredentialForUser({ tenant_id: tenantId, user_id: operator.id, email: operator.email, password: operatorPassword });
    await creds.upsertCredentialForUser({ tenant_id: tenantId, user_id: operator2.id, email: operator2.email, password: operatorPassword });

    // Cliente + Equipe (contexto de OS).
    const customer = await tx.customer.create({ data: { tenant_id: tenantId, name: "Indústria Alfa Ltda", document: "12.345.678/0001-90", city: "São Paulo", state: "SP", is_active: true, created_by: adminId } });
    const team = await tx.team.create({ data: { tenant_id: tenantId, name: "Equipe Norte", status: "active", is_active: true, leader_user_id: operator.id, created_by: adminId } });

    // 3 viaturas.
    const mk = (plate: string, model: string, type: string, year: number) =>
      tx.vehicle.create({ data: { tenant_id: tenantId, plate, model, type, year, status: "active", is_active: true, created_by: adminId }, select: { id: true, plate: true } });
    const v1 = await mk("FLT-0001", "Fiat Strada", "Utilitário", 2022);
    const v2 = await mk("FLT-0002", "VW Saveiro", "Utilitário", 2021);
    const v3 = await mk("FLT-0003", "Iveco Daily", "Guincho", 2020);

    const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

    // Abastecimentos (odômetro crescente por viatura).
    const fuel = (vehicleId: string, fueledAt: Date, liters: number, total: number, odometer: number, station: string) =>
      tx.fuelLog.create({ data: { tenant_id: tenantId, vehicle_id: vehicleId, operator_id: operator.id, fueled_at: fueledAt, fuel_type: "diesel_s10", liters, total_value: total, odometer, station, is_active: true, created_by: adminId } });
    await fuel(v1.id, daysAgo(20), 40, 260, 42000, "Posto Shell Marginal");
    await fuel(v1.id, daysAgo(8), 42, 281.4, 42580, "Posto Ipiranga Centro");
    await fuel(v2.id, daysAgo(15), 38, 247, 30500, "Posto BR Norte");
    await fuel(v2.id, daysAgo(4), 45, 301.5, 31120, "Posto Shell Marginal");
    await fuel(v3.id, daysAgo(10), 60, 402, 88000, "Posto Ipiranga Centro");

    // Manutenção em execução na v1 → badge "Em manutenção" no pin + tela Manutenção.
    await tx.maintenanceOrder.create({ data: { tenant_id: tenantId, vehicle_id: v1.id, type: "preventiva", status: "em_execucao", scheduled_for: daysAgo(1), description: "Revisão de 42.000 km — óleo, filtros e freios.", odometer: 42580, supplier: "Oficina Central", is_active: true, created_by: adminId } });
    await tx.maintenanceOrder.create({ data: { tenant_id: tenantId, vehicle_id: v2.id, type: "corretiva", status: "agendada", scheduled_for: new Date(Date.now() + 3 * 864e5), description: "Troca de embreagem.", is_active: true, created_by: adminId } });

    // Multa (prazo próximo) na v2.
    await tx.fine.create({ data: { tenant_id: tenantId, vehicle_id: v2.id, driver_id: operator2.id, numero_auto: "AI-2026-0001", data_infracao: daysAgo(12), orgao: "DETRAN-SP", valor: 195.23, pontos: 4, prazo_pagamento: new Date(Date.now() + 5 * 864e5), prazo_recurso: new Date(Date.now() + 5 * 864e5), status: "recebida", descricao: "Avanço de sinal vermelho.", is_active: true, created_by: adminId } });

    // Seguro vigente na v1 (v3 fica SEM seguro → badge "Sem seguro" no mapa).
    await tx.insurancePolicy.create({ data: { tenant_id: tenantId, vehicle_id: v1.id, seguradora: "Porto Seguro", numero_apolice: "AP-2026-777", vigencia_inicio: daysAgo(120), vigencia_fim: new Date(Date.now() + 245 * 864e5), valor: 3200, cobertura: "Compreensiva (colisão, roubo, terceiros).", status: "vigente", is_active: true, created_by: adminId } });

    // OS em andamento atribuída ao operador + viatura (o mapa mostra a OS ativa no pin).
    const wo = await tx.workOrder.create({ data: { tenant_id: tenantId, code: "OS-2026-0001", title: "Manutenção preventiva em campo", description: "Atendimento agendado — Indústria Alfa.", status: "in_progress", priority: "high", customer_id: customer.id, customer_name: customer.name ?? "Indústria Alfa Ltda", vehicle_id: v1.id, team_id: team.id, assigned_operator_id: operator.id, assigned_user_id: operator.id, service_city: "São Paulo", service_state: "SP", service_latitude: BASE_LAT, service_longitude: BASE_LNG, started_at: new Date(Date.now() - 90 * 60 * 1000), created_by: adminId }, select: { id: true } });
    // Ω1b — OS aberta COM endereço mas SEM coordenada: demonstra o painel "Sem localização" no mapa.
    await tx.workOrder.create({ data: { tenant_id: tenantId, code: "OS-2026-0002", title: "Vistoria de frota", status: "open", priority: "medium", vehicle_id: v3.id, assigned_operator_id: operator2.id, assigned_user_id: operator2.id, service_address: "Av. Paulista, 1578", service_city: "São Paulo", service_state: "SP", created_by: adminId } });
    // Ω1b — OS urgente aberta COM coordenada: pin de chamado vermelho que pulsa no mapa.
    await tx.workOrder.create({ data: { tenant_id: tenantId, code: "OS-2026-0003", title: "Reboque emergencial — via expressa", status: "open", priority: "urgent", customer_id: customer.id, customer_name: customer.name ?? "Indústria Alfa Ltda", service_address: "Marginal Tietê, km 22", service_city: "São Paulo", service_state: "SP", service_latitude: BASE_LAT + 0.012, service_longitude: BASE_LNG - 0.009, created_by: adminId } });

    // Despacho ativo para a OS.
    await tx.fieldDispatch.create({ data: { tenant_id: tenantId, work_order_id: wo.id, operator_user_id: operator.id, status: "on_route", metadata: {} } });

    // Localizações de campo RECENTES (não-stale) → os PINS do mapa.
    await tx.fieldOperatorLocation.create({ data: { tenant_id: tenantId, operator_user_id: operator.id, source: "mobile", latitude: BASE_LAT + 0.004, longitude: BASE_LNG + 0.003, accuracy_meters: 8, heading_degrees: 45, speed_meters_per_second: 6.5, battery_level: 82, recorded_at: new Date(Date.now() - 3 * 60 * 1000), metadata: {} } });
    await tx.fieldOperatorLocation.create({ data: { tenant_id: tenantId, operator_user_id: operator2.id, source: "mobile", latitude: BASE_LAT - 0.006, longitude: BASE_LNG - 0.004, accuracy_meters: 12, heading_degrees: 120, speed_meters_per_second: 0, battery_level: 64, recorded_at: new Date(Date.now() - 7 * 60 * 1000), metadata: {} } });

    // Itens de estoque (tela Estoque com dados).
    const item = (sku: string, name: string, unit: string, min: number, avg: number) =>
      tx.inventoryItem.create({ data: { tenant_id: tenantId, sku, name, unit, min_quantity: min, avg_cost: avg, is_active: true, created_by: adminId }, select: { id: true } });
    const it1 = await item("PN-OLEO-15W40", "Óleo 15W40 (litro)", "L", 20, 28.5);
    const it2 = await item("PN-FILTRO-AR", "Filtro de ar", "un", 10, 42);
    await tx.stockMovement.create({ data: { tenant_id: tenantId, item_id: it1.id, type: "entrada", quantidade_sinalizada: 50, unit_cost: 28.5, reason: "Compra NF-4471", created_by: adminId } });
    await tx.stockMovement.create({ data: { tenant_id: tenantId, item_id: it1.id, type: "consumo", quantidade_sinalizada: -8, work_order_id: wo.id, vehicle_id: v1.id, reason: "Revisão OS-2026-0001", created_by: adminId } });
    await tx.stockMovement.create({ data: { tenant_id: tenantId, item_id: it2.id, type: "entrada", quantidade_sinalizada: 30, unit_cost: 42, reason: "Compra NF-4471", created_by: adminId } });

    console.log("[seed-fleet] OK — 3 viaturas, 5 abastecimentos, 2 manutenções, 1 multa, 1 seguro, 2 OS, 1 despacho, 2 localizações de campo, 2 itens de estoque.");
    console.log("[seed-fleet] Login admin: admin.demo@example.com / ChangeMe123!  |  operador: operador.demo@example.com / ChangeMe123!");
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
