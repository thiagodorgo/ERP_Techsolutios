import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test, { after } from "node:test";

import { createEphemeralRole } from "./helpers/auth-identity-fixture.js";

// B-O6R-12 — o regime normativo do pátio congela na abertura do processo (item 24 do portão, Ω6R-DAT-004).
//
// Suíte -db sobre a base que a CI migrou (os cenários que relêem a migração moram no drill). Regras do plano v2:
//   - o perfil é editado SEMPRE pelo JurisdictionService.update (ou por HTTP, na C8), nunca por SQL — exceto o
//     ponteiro da diária, que não tem escritor em src (C12, C13), como em produção (§3.1);
//   - o papel de runtime é efêmero, NOSUPERUSER NOBYPASSRLS (C17, E1.9′);
//   - o modo de persistência é ligado ANTES de qualquer import de src: a auditoria lê env.CORE_SAAS_PERSISTENCE
//     na carga do módulo (A7), e por isso todo src entra por import dinâmico.

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-O6R-12 snapshot exige DATABASE_URL", { skip: "Defina DATABASE_URL para a suíte -db." });
} else {
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([import("@prisma/adapter-pg"), import("@prisma/client")]);
  const { PrismaImpoundRepository, RlsPrismaImpoundRepository } = await import("../src/modules/impound/impound-prisma.repository.js");
  const { ImpoundService } = await import("../src/modules/impound/impound.service.js");
  const { ImpoundError } = await import("../src/modules/impound/impound.types.js");
  const { RlsPrismaChargeRepository } = await import("../src/modules/charging/charge-prisma.repository.js");
  const { ChargeService } = await import("../src/modules/charging/charge.service.js");
  const { RlsPrismaJurisdictionRepository, PrismaJurisdictionRepository } = await import("../src/modules/jurisdiction/jurisdiction-prisma.repository.js");
  const { JurisdictionService } = await import("../src/modules/jurisdiction/jurisdiction.service.js");
  const { RlsPrismaReleaseRepository } = await import("../src/modules/release/release-prisma.repository.js");
  const { ReleaseService } = await import("../src/modules/release/release.service.js");
  const { PrismaNotificationRepository } = await import("../src/modules/impound/impound.notifications-prisma.repository.js");
  const { PrismaPatiosDashboardRepository } = await import("../src/modules/patios-dashboard/patios-dashboard-prisma.repository.js");
  type Tariff = import("../src/modules/tariffs/tariff.types.js").Tariff;
  type TariffResolver = import("../src/modules/tariffs/tariff-resolution.js").TariffResolver;

  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  const tenantsCriados: string[] = [];
  const MS_PER_DAY = 86_400_000;

  const PERMISSOES = [
    "impound:read",
    "impound:create",
    "charging:read",
    "charging:create",
    "jurisdiction:read",
    "jurisdiction:update",
    "release:process",
  ] as const;

  type Cenario = {
    tenantId: string;
    userId: string;
    profileId: string;
    actor: { tenantId: string; userId: string; roles: ["manager"]; permissions: typeof PERMISSOES };
  };

  async function semear(rotulo: string, perfil: Record<string, unknown> = {}): Promise<Cenario> {
    const marca = `${rotulo}-${randomUUID().slice(0, 8)}`;
    const tenant = await admin.tenant.create({ data: { name: `B12 ${marca}`, slug: `b12-${marca}` } });
    tenantsCriados.push(tenant.id);
    const user = await admin.user.create({ data: { tenant_id: tenant.id, name: "B12", email: `b12-${marca}@example.com` } });
    const profile = await admin.jurisdictionProfile.create({
      data: {
        tenant_id: tenant.id,
        name: `Perfil ${marca}`,
        scope: "PUBLIC_AGREEMENT",
        owner_notif_days: 5,
        notice_edict_day: 10,
        auction_eligible_day: 60,
        auction_edict_business_days: 15,
        daily_model: "ROLLING_24H",
        daily_cap: "SIX_MONTHS",
        release_requirements: [{ code: "crlv", label: "CRLV", required: true }],
        ...perfil,
      },
    });
    return {
      tenantId: tenant.id,
      userId: user.id,
      profileId: profile.id,
      actor: { tenantId: tenant.id, userId: user.id, roles: ["manager"], permissions: PERMISSOES },
    };
  }

  const impound = new ImpoundService(new RlsPrismaImpoundRepository(admin));
  const jurisdiction = new JurisdictionService(new RlsPrismaJurisdictionRepository(admin));

  // Abre o processo pelo caminho de produção (ImpoundService → requireProfileRegime → INSERT → gatilho) e o põe
  // em custódia com entrada em t0.
  async function abrir(c: Cenario, t0?: Date): Promise<string> {
    const processo = await impound.create(c.actor as never, {
      profile_id: c.profileId,
      origin_authority: "Autoridade solicitante",
      vehicle_unidentified: true,
      unidentified_reason: "Aguardando vistoria de recepção",
    });
    if (t0) await admin.impoundProcess.update({ where: { id: processo.id }, data: { entered_at: t0, status: "ACTIVE_CUSTODY" } });
    return processo.id;
  }

  const editar = (c: Cenario, body: Record<string, unknown>) => jurisdiction.update(c.actor as never, c.profileId, body);

  function resolverQueAnota(): { resolver: TariffResolver; chamadas: Array<{ scope: string; serviceCatalogId: string }> } {
    const chamadas: Array<{ scope: string; serviceCatalogId: string }> = [];
    const resolver: TariffResolver = async (input) => {
      chamadas.push({ scope: input.scope as string, serviceCatalogId: input.serviceCatalogId });
      const tarifa: Tariff = {
        id: randomUUID(),
        tenantId: input.tenantId,
        priceTableId: randomUUID(),
        name: "Diária",
        unitPrice: 10,
        currency: "BRL",
        origin: "test",
        status: "active",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      return tarifa;
    };
    return { resolver, chamadas };
  }

  const servico = async (c: Cenario, nome: string): Promise<string> =>
    (await admin.serviceCatalog.create({ data: { tenant_id: c.tenantId, name: `${nome} ${randomUUID().slice(0, 6)}` } })).id;
  const apontar = (c: Cenario, serviceId: string) =>
    admin.$executeRawUnsafe(`UPDATE jurisdiction_profiles SET daily_service_catalog_id = $1::uuid WHERE id = $2::uuid`, serviceId, c.profileId);
  const codigoDe = (error: unknown): string | undefined =>
    (error as { code?: string; meta?: { code?: string }; cause?: { code?: string } }).code ??
    (error as { meta?: { code?: string } }).meta?.code ??
    (error as { cause?: { code?: string } }).cause?.code;

  after(async () => {
    // TEARDOWN escopado aos tenants desta execução (superusuário + replica para a trilha append-only).
    const { drainCloudUsageBestEffortForTests } = await import("../src/modules/cloud-usage/cloud-usage.service.js");
    await drainCloudUsageBestEffortForTests();
    for (const tenantId of tenantsCriados) {
      await admin.$transaction(async (tx) => {
        await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
        for (const tabela of [
          "release_requirement_checks",
          "impound_releases",
          "impound_outbox_events",
          "process_notifications",
          "process_charges",
          "daily_accrual_runs",
          "custody_events",
          "third_party_vehicle_identities",
          "impound_processes",
          "audit_logs",
          "user_role_assignments",
          "jurisdiction_profiles",
          "service_catalog",
        ]) {
          await tx.$executeRawUnsafe(`DELETE FROM ${tabela} WHERE tenant_id = $1::uuid`, tenantId);
        }
        await tx.$executeRawUnsafe(
          `DELETE FROM role_permissions WHERE role_id IN (SELECT id FROM roles WHERE tenant_id = $1::uuid)`,
          tenantId,
        );
        await tx.$executeRawUnsafe(`DELETE FROM roles WHERE tenant_id = $1::uuid`, tenantId);
        await tx.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId);
        await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId);
      });
    }
    const { prisma } = await import("../src/database/prisma.js");
    await prisma.$disconnect();
    await admin.$disconnect();
  });

  test("B-O6R-12 C4/C5/C6/C16 (base da CI): o banco carimba, ignora o payload, congela e devolve 23503", async () => {
    const c = await semear("car");
    const forjado = await admin.$queryRawUnsafe<Array<{ id: string; regime_daily_cap: string }>>(
      `INSERT INTO impound_processes (tenant_id, profile_id, vehicle_unidentified, unidentified_reason, status, origin_authority, regime_daily_cap)
       VALUES ($1::uuid, $2::uuid, true, 'B-O6R-12', 'IN_REMOVAL', 'Órgão', 'UNLIMITED') RETURNING id, regime_daily_cap`,
      c.tenantId,
      c.profileId,
    );
    assert.equal(forjado[0]!.regime_daily_cap, "SIX_MONTHS");
    await assert.rejects(
      admin.$executeRawUnsafe(`UPDATE impound_processes SET regime_daily_cap = 'UNLIMITED' WHERE id = $1::uuid`, forjado[0]!.id),
      (error: unknown) => String((error as Error).message).includes("imutavel"),
    );
    const colunas = await admin.$queryRawUnsafe<Array<{ column_name: string; is_nullable: string }>>(
      `SELECT column_name, is_nullable FROM information_schema.columns
        WHERE table_schema='public' AND table_name='impound_processes' AND column_name LIKE 'regime_%'`,
    );
    assert.equal(colunas.length, 9);
    assert.ok(colunas.every((col) => col.is_nullable === (col.column_name === "regime_daily_service_catalog_id" ? "YES" : "NO")));
  });

  test("B-O6R-12 C17 + E1.9′: sob o papel de runtime o carimbo grava o regime certo; escrita cruzada dá 23503", async () => {
    const a = await semear("rta");
    const b = await semear("rtb");
    const role = await createEphemeralRole(admin, connectionString);
    try {
      const atributos = await admin.$queryRawUnsafe<Array<{ rolsuper: boolean; rolbypassrls: boolean }>>(
        `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = $1`,
        role.roleName,
      );
      assert.deepEqual(atributos[0], { rolsuper: false, rolbypassrls: false });
      const inserir = (tenantId: string, guc: string | null) =>
        role.client.$transaction(async (tx) => {
          if (guc) await tx.$executeRaw`SELECT set_config('app.current_tenant_id', ${guc}, true)`;
          return (
            await tx.$queryRawUnsafe<Array<{ regime_daily_cap: string; regime_owner_notif_days: number }>>(
              `INSERT INTO impound_processes (tenant_id, profile_id, vehicle_unidentified, unidentified_reason, status, origin_authority, regime_daily_cap)
               VALUES ($1::uuid, $2::uuid, true, 'B-O6R-12 runtime', 'IN_REMOVAL', 'Órgão', 'UNLIMITED')
               RETURNING regime_daily_cap, regime_owner_notif_days`,
              tenantId,
              a.profileId,
            )
          )[0]!;
        });
      // C17 — o carimbo, sob o papel sem BYPASSRLS, lê o perfil da organização do GUC.
      assert.deepEqual(await inserir(a.tenantId, a.tenantId), { regime_daily_cap: "SIX_MONTHS", regime_owner_notif_days: 5 });
      // E1.9′ — escrita cruzada (tenant_id de B com o GUC de A) e escrita sem GUC: o gatilho roda antes do WITH
      // CHECK da RLS e recusa com 23503. Continua recusada; o código observável muda de 42501 para 23503.
      await assert.rejects(inserir(b.tenantId, a.tenantId), (error: unknown) => codigoDe(error) === "23503" || /23503|perfil normativo inexistente/.test(String(error)));
      await assert.rejects(inserir(a.tenantId, null), (error: unknown) => codigoDe(error) === "23503" || /23503|perfil normativo inexistente/.test(String(error)));
      // O controle da C17 (tirar do papel o SELECT no perfil e ver o INSERT cair) mora no drill, numa base
      // própria: aqui, na base compartilhada, ele seria escrita de catálogo concorrente (E1.11′).
    } finally {
      await role.drop();
    }
  });

  test("B-O6R-12 C15: perfil ausente ou de outra organização dá 400 antes da abertura, sem identidade órfã", async () => {
    const a = await semear("inva");
    const b = await semear("invb");
    const repo = new PrismaImpoundRepository(admin);
    const isInvalidProfile = (error: unknown): boolean =>
      error instanceof ImpoundError && error.statusCode === 400 && error.reason === "invalid_profile_reference";
    for (const profileId of [randomUUID(), b.profileId]) {
      await assert.rejects(
        repo.createProcess({
          tenantId: a.tenantId,
          vehicleUnidentified: true,
          unidentifiedReason: "Teste perfil inválido",
          profileId,
          originAuthority: "Órgão",
          openingEvent: { type: "STATUS_CHANGE", payload: { from: null, to: "IN_REMOVAL", reason: "process_opened" }, occurredAt: new Date() },
        }),
        isInvalidProfile,
      );
      await assert.rejects(
        repo.openFromRemovalAtomic({
          tenantId: a.tenantId,
          serviceOrderId: randomUUID(),
          profileId,
          originAuthority: "Órgão",
          unidentifiedReason: "Teste perfil inválido",
          completedAt: new Date(),
        }),
        isInvalidProfile,
      );
    }
    const contar = async (tabela: string) =>
      (await admin.$queryRawUnsafe<Array<{ n: number }>>(`SELECT count(*)::int AS n FROM ${tabela} WHERE tenant_id = $1::uuid`, a.tenantId))[0]!.n;
    assert.equal(await contar("impound_processes"), 0, "nenhum processo nasceu nas quatro recusas");
    assert.equal(await contar("third_party_vehicle_identities"), 0, "nenhuma identidade órfã");
  });

  test("B-O6R-12 C1 + C3 + C13: editar teto e escopo e trocar o ponteiro não mudam a cobrança do processo aberto", async () => {
    const T0 = new Date("2024-05-01T12:00:00.000Z");
    const c = await semear("cob");
    const s1 = await servico(c, "Diária S1");
    await apontar(c, s1);
    const processId = await abrir(c, T0);
    const { resolver, chamadas } = resolverQueAnota();
    const cobranca = new ChargeService(new RlsPrismaChargeRepository(admin), resolver);
    const diarias = async () => (await cobranca.list(c.actor as never, processId)).filter((linha) => linha.kind === "DAILY").length;

    assert.equal((await cobranca.accrueProcess(c.tenantId, processId, new Date(T0.getTime() + 20 * MS_PER_DAY))).accrued, 20);
    await editar(c, { daily_cap: "THIRTY_DAYS_LEGACY", scope: "PRIVATE_CONTRACT" });
    const s2 = await servico(c, "Diária S2");
    await apontar(c, s2);
    const perfilAgora = await admin.jurisdictionProfile.findUniqueOrThrow({ where: { id: c.profileId } });
    assert.deepEqual(
      [perfilAgora.daily_cap, perfilAgora.scope, perfilAgora.daily_service_catalog_id],
      ["THIRTY_DAYS_LEGACY", "PRIVATE_CONTRACT", s2],
      "controle: o perfil vivo mudou de fato",
    );

    const T40 = new Date(T0.getTime() + 40 * MS_PER_DAY);
    await cobranca.accrueProcess(c.tenantId, processId, T40);
    // C1 — o teto da abertura (SIX_MONTHS) segue valendo: 40 diárias, não 30.
    assert.equal(await diarias(), 40);
    assert.equal((await cobranca.getStatement(c.actor as never, processId, T40)).cap?.cap, "SIX_MONTHS");
    // C3 — a tarifa é resolvida no escopo da abertura em TODAS as chamadas.
    assert.equal(chamadas.length, 40);
    assert.deepEqual([...new Set(chamadas.map((chamada) => chamada.scope))], ["PUBLIC_AGREEMENT"]);
    // C13 — a cópia não nula do ponteiro (S1) vence o ponteiro novo do perfil (S2).
    assert.deepEqual([...new Set(chamadas.map((chamada) => chamada.serviceCatalogId))], [s1]);
  });

  test("B-O6R-12 C2: o modelo da abertura (ROLLING_24H) segue valendo depois de o perfil passar a CALENDAR", async () => {
    // Entrada às 23:30 em São Paulo (02:30Z); 1 h depois, ROLLING_24H não deve nada e CALENDAR deveria 2 datas.
    const entrada = new Date("2024-05-01T02:30:00.000Z");
    const c = await semear("mod");
    const processId = await abrir(c, entrada);
    await editar(c, { daily_model: "CALENDAR" });
    const cobranca = new ChargeService(new RlsPrismaChargeRepository(admin), resolverQueAnota().resolver);
    const estado = await cobranca.getReleaseChargeState(c.tenantId, processId, new Date(entrada.getTime() + 60 * 60 * 1000));
    assert.equal(estado?.nDueNow, 0, "ROLLING_24H da abertura: nada devido na 1ª hora");
  });

  test("B-O6R-12 C12: ponteiro NULL na abertura — configurado depois no perfil, o acúmulo seguinte cria as diárias", async () => {
    const T0 = new Date("2024-06-01T12:00:00.000Z");
    const c = await semear("cat");
    const processId = await abrir(c, T0);
    const cobranca = new ChargeService(new RlsPrismaChargeRepository(admin), resolverQueAnota().resolver);
    const T5 = new Date(T0.getTime() + 5 * MS_PER_DAY);
    const antes = await cobranca.accrueProcess(c.tenantId, processId, T5);
    assert.deepEqual([antes.accrued, antes.errors], [0, 1], "fail-closed sem serviço-diária");
    await apontar(c, await servico(c, "Diária tardia"));
    const depois = await cobranca.accrueProcess(c.tenantId, processId, T5);
    assert.equal(depois.accrued, 5, "o catch-up cria as 5 diárias devidas");
  });

  test("B-O6R-12 C20: liberação iniciada depois da edição usa os requisitos da abertura", async () => {
    const c = await semear("lib");
    const processId = await abrir(c, new Date(Date.now() - 3 * MS_PER_DAY));
    await editar(c, {
      release_requirements: [
        { code: "crlv", label: "CRLV", required: true },
        { code: "laudo", label: "Laudo pericial", required: true },
      ],
    });
    const cobranca = new ChargeService(new RlsPrismaChargeRepository(admin), resolverQueAnota().resolver);
    const liberacao = new ReleaseService(new RlsPrismaReleaseRepository(admin), new RlsPrismaImpoundRepository(admin), (t, p) =>
      cobranca.getReleaseChargeState(t, p),
    );
    const view = await liberacao.start({ tenantId: c.tenantId, userId: c.userId }, processId, {});
    assert.deepEqual(
      view.checks.map((check) => [check.code, check.required]),
      [["crlv", true]],
      "o requisito acrescentado ao perfil depois da abertura não entra na liberação",
    );
  });

  test("B-O6R-12 C20b: trocar o escopo do perfil não tira o processo do rito de notificação", async () => {
    const c = await semear("not");
    const processId = await abrir(c, new Date(Date.now() - 2 * MS_PER_DAY));
    await editar(c, { scope: "PRIVATE_CONTRACT", owner_notif_days: 20 });
    const repo = new PrismaNotificationRepository(admin);
    assert.ok((await repo.listNotificationCandidates(c.tenantId, 50)).includes(processId), "o processo segue candidato ao rito");
    const contexto = await repo.loadScheduleContext(c.tenantId, processId);
    assert.deepEqual([contexto?.scope, contexto?.ownerNotifDays, contexto?.noticeEdictDay], ["PUBLIC_AGREEMENT", 5, 10]);
  });

  test("B-O6R-12 C20c: o gate de leilão usa o prazo da abertura (60), não o editado (90)", async () => {
    const c = await semear("lei");
    const processId = await abrir(c, new Date(Date.now() - 2 * MS_PER_DAY));
    await editar(c, { auction_eligible_day: 90 });
    const { createPrismaAuctionPorts } = await import("../src/modules/auction/auction-prisma.repository.js");
    const ports = await createPrismaAuctionPorts();
    const perfil = await ports.profile(c.tenantId, processId);
    assert.deepEqual([perfil?.scope, perfil?.auctionEligibleDay], ["PUBLIC_AGREEMENT", 60]);
  });

  test("B-O6R-12 C20d: o alerta de prazo do painel usa o prazo da abertura", async () => {
    const agora = new Date();
    const entrada = new Date(agora.getTime() - 20 * MS_PER_DAY);
    const c = await semear("pai");
    const processId = await abrir(c, entrada);
    await editar(c, { owner_notif_days: 15 });
    const resumo = await new PrismaPatiosDashboardRepository(admin).getSummary({ tenantId: c.tenantId, now: agora });
    const alertas = resumo.deadlineAlerts.filter((alerta: { processId: string }) => alerta.processId === processId);
    assert.ok(
      alertas.some((alerta: { kind: string; dueAt: string }) => alerta.kind === "OWNER_INITIAL" && alerta.dueAt === new Date(entrada.getTime() + 5 * MS_PER_DAY).toISOString()),
      `alerta de notificação inicial em entrada + 5 dias; veio ${JSON.stringify(alertas)}`,
    );
  });

  test("B-O6R-12 E1.8′: com um PATCH aberto, a abertura não espera e grava o perfil confirmado", async () => {
    const c = await semear("lock");
    const outro = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
    try {
      const regimeAberto = await admin.$transaction(
        async (tx) => {
          const editado = await new PrismaJurisdictionRepository(tx).updateProfile({
            tenantId: c.tenantId,
            profileId: c.profileId,
            dailyCap: "UNLIMITED",
            updatedBy: c.userId,
          });
          assert.equal(editado?.profile.dailyCap, "UNLIMITED");
          assert.deepEqual(editado?.changes.daily_cap, { from: "SIX_MONTHS", to: "UNLIMITED" });
          // Outra conexão abre um processo do MESMO perfil enquanto o PATCH não confirmou.
          return outro.$transaction(async (tx2) => {
            await tx2.$executeRawUnsafe(`SET LOCAL lock_timeout = '2s'`);
            return (
              await tx2.$queryRawUnsafe<Array<{ regime_daily_cap: string }>>(
                `INSERT INTO impound_processes (tenant_id, profile_id, vehicle_unidentified, unidentified_reason, status, origin_authority)
                 VALUES ($1::uuid, $2::uuid, true, 'B-O6R-12 concorrência', 'IN_REMOVAL', 'Órgão') RETURNING regime_daily_cap`,
                c.tenantId,
                c.profileId,
              )
            )[0]!.regime_daily_cap;
          });
        },
        { timeout: 20_000 },
      );
      assert.equal(regimeAberto, "SIX_MONTHS", "a abertura concorrente não esperou e gravou o perfil confirmado");
      const perfil = await admin.jurisdictionProfile.findUniqueOrThrow({ where: { id: c.profileId } });
      assert.equal(perfil.daily_cap, "UNLIMITED", "o PATCH confirmou depois");
    } finally {
      await outro.$disconnect();
    }
  });

  test("B-O6R-12 C2-02/C3-02: dois PATCHes concorrentes do mesmo perfil ficam em fila, e o 'from' do 2º é o valor confirmado pelo 1º", async () => {
    const c = await semear("fila");
    // A 2ª conexão leva um application_name próprio, para a barreira achá-la em pg_stat_activity.
    const nomeDaConexao = `b12_patch2_${randomUUID().replaceAll("-", "").slice(0, 10)}`;
    const urlDoSegundo = new URL(connectionString);
    urlDoSegundo.searchParams.set("application_name", nomeDaConexao);
    const segundo = new PrismaClient({ adapter: new PrismaPg({ connectionString: urlDoSegundo.toString() }) });
    const { Client } = await import("pg");
    const vigia = new Client({ connectionString });
    await vigia.connect();
    try {
      let patch2: Promise<Awaited<ReturnType<InstanceType<typeof PrismaJurisdictionRepository>["updateProfile"]>>> | undefined;
      await admin.$transaction(
        async (tx) => {
          const primeiro = await new PrismaJurisdictionRepository(tx).updateProfile({
            tenantId: c.tenantId,
            profileId: c.profileId,
            dailyCap: "UNLIMITED",
            updatedBy: c.userId,
          });
          assert.deepEqual(primeiro?.changes.daily_cap, { from: "SIX_MONTHS", to: "UNLIMITED" });
          patch2 = segundo.$transaction(
            (tx2) =>
              new PrismaJurisdictionRepository(tx2).updateProfile({
                tenantId: c.tenantId,
                profileId: c.profileId,
                dailyCap: "THIRTY_DAYS_LEGACY",
                updatedBy: c.userId,
              }),
            { timeout: 20_000 },
          );
          // Barreira determinística: só confirma o 1º depois que o 2º está PARADO numa trava (nunca por relógio).
          let parado = false;
          for (let tentativa = 0; tentativa < 400 && !parado; tentativa += 1) {
            const linhas = await vigia.query(
              `SELECT 1 FROM pg_stat_activity WHERE application_name = $1 AND wait_event_type = 'Lock'`,
              [nomeDaConexao],
            );
            parado = (linhas.rowCount ?? 0) > 0;
            if (!parado) await new Promise((resolve) => setTimeout(resolve, 25));
          }
          assert.ok(parado, "o 2º PATCH ficou parado na trava da linha do perfil");
        },
        { timeout: 20_000 },
      );
      const segundoResultado = await patch2!;
      assert.deepEqual(
        segundoResultado?.changes.daily_cap,
        { from: "UNLIMITED", to: "THIRTY_DAYS_LEGACY" },
        "o 'from' da auditoria do 2º PATCH é o valor que o 1º confirmou, não o que havia antes dele",
      );
    } finally {
      await vigia.end();
      await segundo.$disconnect();
    }
  });

  test("B-O6R-12 C3-01: requisito de liberação com 'required' ausente ou malformado continua exigido no retrato, como na liberação", async () => {
    const c = await semear("req");
    // Só nasce por SQL direto (o PATCH e o POST sempre gravam 'required' booleano), como no legado.
    await admin.$executeRawUnsafe(
      `UPDATE jurisdiction_profiles SET release_requirements = $2::jsonb WHERE id = $1::uuid`,
      c.profileId,
      JSON.stringify([
        { code: "crlv", label: "CRLV legado" },
        { code: "laudo", label: "Laudo", required: "sim" },
        { code: "foto", label: "Foto", required: false },
      ]),
    );
    const processId = await abrir(c);
    const processo = await new PrismaImpoundRepository(admin).findProcessById(c.tenantId, processId);
    const retrato = processo?.regime?.releaseRequirements.map((r) => [r.code, r.label, r.required]);
    const liberacao = (await new RlsPrismaReleaseRepository(admin).loadReleaseRequirements(c.tenantId, processId))?.map((r) => [
      r.code,
      r.label,
      r.required,
    ]);
    assert.deepEqual(
      retrato,
      [
        ["crlv", "CRLV legado", true],
        ["laudo", "Laudo", true],
        ["foto", "Foto", false],
      ],
      "na dúvida, o requisito é obrigatório (fail-closed); só o false explícito o dispensa",
    );
    assert.deepEqual(retrato, liberacao, "o retrato que o portal mostra é o mesmo que a liberação exige");
  });

  test("B-O6R-12 C8: o PATCH por HTTP grava na auditoria cada campo com valor anterior e novo (allowlist)", async () => {
    const [{ createApp }, { PrismaCoreSaasService }, { PrismaCoreSaasStore }, repositorios, { signAccessToken }] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/services/prisma-core-saas.service.js"),
      import("../src/modules/core-saas/store/prisma-core-saas.store.js"),
      import("../src/modules/core-saas/repositories/index.js"),
      import("../src/modules/auth/index.js"),
    ]);
    const service = new PrismaCoreSaasService(
      new PrismaCoreSaasStore(
        admin,
        new repositorios.TenantRepository(admin),
        new repositorios.UserRepository(admin),
        new repositorios.RoleRepository(admin),
        new repositorios.UserRoleRepository(admin),
        new repositorios.AuditLogRepository(admin),
      ),
    );
    const c = await semear("aud", { notes: "nota interna antes" });
    const papel = await admin.role.create({ data: { tenant_id: c.tenantId, key: "manager", name: `Gestão ${randomUUID().slice(0, 6)}`, scope: "tenant" } });
    for (const key of ["jurisdiction:read", "jurisdiction:update"]) {
      const permissao = await admin.permission.upsert({ where: { key }, update: {}, create: { key, description: `Permissão ${key}` } });
      await admin.rolePermission.create({ data: { role_id: papel.id, permission_id: permissao.id } });
    }
    const usuario = await admin.user.findUniqueOrThrow({ where: { id: c.userId } });
    await admin.userRoleAssignment.create({ data: { tenant_id: c.tenantId, user_id: c.userId, role_id: papel.id } });
    const token = await signAccessToken({ user_id: c.userId, tenant_id: c.tenantId, email: usuario.email, roles: ["manager"] });

    const server: Server = createApp(service).listen(0);
    try {
      await new Promise<void>((resolve) => server.once("listening", resolve));
      const porta = (server.address() as AddressInfo).port;
      const resposta = await fetch(`http://127.0.0.1:${porta}/api/v1/jurisdiction-profiles/${c.profileId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ daily_cap: "THIRTY_DAYS_LEGACY", owner_notif_days: 7, notes: "nota interna SIGILOSA", name: "Perfil renomeado" }),
      });
      assert.equal(resposta.status, 200, await resposta.text());
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    }

    const linhas = await admin.$queryRawUnsafe<Array<{ metadata: Record<string, any>; texto: string }>>(
      `SELECT metadata, metadata::text AS texto FROM audit_logs WHERE tenant_id = $1::uuid AND action = 'jurisdiction_profile.updated'`,
      c.tenantId,
    );
    assert.equal(linhas.length, 1, "uma linha de auditoria do PATCH");
    const { metadata, texto } = linhas[0]!;
    assert.deepEqual(metadata.changes.daily_cap, { from: "SIX_MONTHS", to: "THIRTY_DAYS_LEGACY" });
    assert.deepEqual(metadata.changes.owner_notif_days, { from: 5, to: 7 });
    for (const campo of ["daily_cap", "owner_notif_days", "notes", "name"]) assert.ok(metadata.changed_fields.includes(campo), `changed_fields sem ${campo}`);
    assert.equal("notes" in metadata.changes, false);
    assert.equal(texto.includes("SIGILOSA"), false, "o texto livre de notes não vai para a auditoria");
    assert.equal(texto.includes("nota interna antes"), false);
  });
}
