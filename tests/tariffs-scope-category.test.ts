import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  createMemoryPriceTableService,
  resetPriceTableRuntimeForTests,
} from "../src/modules/price-tables/price-table.service.js";
import { PriceTableError, type PriceTableActorContext } from "../src/modules/price-tables/price-table.types.js";
import {
  createMemoryTariffService,
  resetTariffRuntimeForTests,
} from "../src/modules/tariffs/tariff.service.js";
import { createMemoryResolveTariff } from "../src/modules/tariffs/tariff-resolution.js";

// Ω5P PR-03 — resolveTariff (categoria × escopo × data, legado NULL = curinga) + RN-TAR-01 (não-sobreposição de
// vigências). Rota P: os eixos scope/vehicle_category vivem no CONTÊINER PriceTable; a linha Tariff é intocada.

const PUBLIC = "PUBLIC_AGREEMENT" as const;
const PRIVATE = "PRIVATE_CONTRACT" as const;

function actor(tenantId = randomUUID()): PriceTableActorContext {
  return {
    tenantId,
    userId: randomUUID(),
    roles: ["manager"],
    permissions: ["price_tables:read", "price_tables:create", "price_tables:update"],
  };
}

function reset() {
  resetPriceTableRuntimeForTests();
  resetTariffRuntimeForTests();
  return { pt: createMemoryPriceTableService(), tariff: createMemoryTariffService() };
}

type SeedOpts = {
  readonly scope?: typeof PUBLIC | typeof PRIVATE;
  readonly category?: string;
  readonly serviceCatalogId: string;
  readonly validFrom?: string;
  readonly validTo?: string;
  readonly unitPrice?: number;
  readonly customerId?: string;
  readonly tariffValidFrom?: string; // janela PRÓPRIA da Tariff (F1)
  readonly tariffValidTo?: string;
};

async function seed(
  pt: ReturnType<typeof createMemoryPriceTableService>,
  tariff: ReturnType<typeof createMemoryTariffService>,
  ctx: PriceTableActorContext,
  opts: SeedOpts,
): Promise<string> {
  const table = await pt.create(ctx, {
    name: `T-${randomUUID()}`,
    scope: opts.scope,
    vehicle_category: opts.category,
    valid_from: opts.validFrom,
    valid_to: opts.validTo,
  });
  await tariff.create(ctx, {
    price_table_id: table.id,
    service_catalog_id: opts.serviceCatalogId,
    customer_id: opts.customerId,
    unit_price: opts.unitPrice ?? 100,
    origin: "manual",
    valid_from: opts.tariffValidFrom,
    valid_to: opts.tariffValidTo,
  });
  await pt.update(ctx, table.id, { status: "published" });
  return table.id;
}

// ── resolveTariff: por CATEGORIA ─────────────────────────────────────────────────────────────────────────
test("resolveTariff: categoria específica (MOTORCYCLE) vence a tabela geral (category NULL)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const general = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 100 });
  const moto = await seed(pt, tariff, ctx, { category: "MOTORCYCLE", serviceCatalogId: service, unitPrice: 40 });

  const resolve = createMemoryResolveTariff();
  const forMoto = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, vehicleCategory: "MOTORCYCLE", date: new Date() });
  const forCar = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, vehicleCategory: "CAR", date: new Date() });

  assert.equal(forMoto?.priceTableId, moto, "MOTORCYCLE query resolves to the moto-specific table");
  assert.equal(forCar?.priceTableId, general, "CAR (no specific table) falls back to the general table");
});

test("resolveTariff: moto e carro na mesma modelagem via tabelas escopadas por categoria", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const moto = await seed(pt, tariff, ctx, { category: "MOTORCYCLE", serviceCatalogId: service, unitPrice: 30 });
  const car = await seed(pt, tariff, ctx, { category: "CAR", serviceCatalogId: service, unitPrice: 80 });

  const resolve = createMemoryResolveTariff();
  const forMoto = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, vehicleCategory: "MOTORCYCLE", date: new Date() });
  const forCar = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, vehicleCategory: "CAR", date: new Date() });

  assert.equal(forMoto?.priceTableId, moto);
  assert.equal(forMoto?.unitPrice, 30);
  assert.equal(forCar?.priceTableId, car);
  assert.equal(forCar?.unitPrice, 80);
});

// ── resolveTariff: por ESCOPO ────────────────────────────────────────────────────────────────────────────
test("resolveTariff: escopo público × privado isolam; scope NULL é curinga", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const publicTable = await seed(pt, tariff, ctx, { scope: PUBLIC, serviceCatalogId: service, unitPrice: 50 });
  const privateTable = await seed(pt, tariff, ctx, { scope: PRIVATE, serviceCatalogId: service, unitPrice: 90 });
  const wildcard = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 70 });

  const resolve = createMemoryResolveTariff();
  const pub = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: PUBLIC, date: new Date() });
  const priv = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: PRIVATE, date: new Date() });
  const none = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date() });

  assert.equal(pub?.priceTableId, publicTable, "PUBLIC query → public-scoped table (specific beats wildcard)");
  assert.equal(priv?.priceTableId, privateTable, "PRIVATE query → private-scoped table");
  assert.equal(none?.priceTableId, wildcard, "no-scope query → the scope-NULL wildcard table");
});

test("resolveTariff: escopo sem tabela específica cai no curinga (scope NULL)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const wildcard = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 60 });

  const resolve = createMemoryResolveTariff();
  const pub = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: PUBLIC, date: new Date() });
  assert.equal(pub?.priceTableId, wildcard, "PUBLIC query with no public table → wildcard scope-NULL table");
});

// ── resolveTariff: por DATA (vigência da PriceTable) ─────────────────────────────────────────────────────
test("resolveTariff: a data seleciona a tabela cuja janela valid_from/valid_to a cobre", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  // Mesmo bucket (ambos scope/category NULL) → janelas DISJUNTAS para publicar ambas sem RN-TAR-01 409.
  const q1 = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 10, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-06-30T23:59:59Z" });
  const q2 = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 20, validFrom: "2026-07-01T00:00:00Z", validTo: "2026-12-31T23:59:59Z" });

  const resolve = createMemoryResolveTariff();
  const inFirst = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2026-03-15T12:00:00Z") });
  const inSecond = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2026-09-15T12:00:00Z") });
  const outside = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2025-12-01T12:00:00Z") });

  assert.equal(inFirst?.priceTableId, q1, "March → the H1 table");
  assert.equal(inSecond?.priceTableId, q2, "September → the H2 table");
  assert.equal(outside, undefined, "date outside every window → nothing applicable");
});

// ── resolveTariff: LEGADO NULL = curinga resolve IDÊNTICO (regressão ZERO) ───────────────────────────────
test("resolveTariff: legado (scope NULL, category NULL) resolve idêntico para qualquer scope/categoria", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const legacy = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 123.45 });

  const resolve = createMemoryResolveTariff();
  const plain = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date() });
  const withScope = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: PUBLIC, date: new Date() });
  const withCategory = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, vehicleCategory: "TRUCK", date: new Date() });
  const withBoth = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: PRIVATE, vehicleCategory: "MOTORCYCLE", date: new Date() });

  for (const [label, r] of [["plain", plain], ["scope", withScope], ["category", withCategory], ["both", withBoth]] as const) {
    assert.equal(r?.priceTableId, legacy, `legacy wildcard resolves for the ${label} query`);
    assert.equal(r?.unitPrice, 123.45, `legacy price for the ${label} query`);
  }
});

test("resolveTariff: só tabelas PUBLICADAS entram (rascunho é ignorado)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const draft = await pt.create(ctx, { name: `T-${randomUUID()}` });
  await tariff.create(ctx, { price_table_id: draft.id, service_catalog_id: service, unit_price: 999, origin: "manual" });
  // NÃO publica.

  const resolve = createMemoryResolveTariff();
  const r = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date() });
  assert.equal(r, undefined, "a draft table's tariff never resolves");
});

// ── resolveTariff: PROPERTY-BASED (≤1 e sempre a MAIS específica; determinístico) ────────────────────────
test("resolveTariff (property): retorna ≤1 e sempre o bucket mais específico; determinístico", async () => {
  const scopes = [undefined, PUBLIC, PRIVATE] as const;
  const cats = [undefined, "MOTORCYCLE", "CAR"] as const;
  const rand = <T>(xs: readonly T[]): T => xs[Math.floor(Math.random() * xs.length)]!;

  for (let iter = 0; iter < 40; iter++) {
    const { pt, tariff } = reset();
    const ctx = actor();
    const service = randomUUID();

    // No máx. 1 tabela por bucket (janela aberta) → sem sobreposição de mesmo-bucket (RN-TAR-01 nunca dispara).
    const present = new Map<string, string>(); // bucketKey → tableId
    for (const s of scopes) {
      for (const c of cats) {
        if (Math.random() < 0.5) continue; // inclui aleatoriamente cada bucket
        const id = await seed(pt, tariff, ctx, { scope: s, category: c, serviceCatalogId: service });
        present.set(`${s ?? "∅"}|${c ?? "∅"}`, id);
      }
    }

    const qs = rand(scopes);
    const qc = rand(cats);
    const resolve = createMemoryResolveTariff();
    const got = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: qs, vehicleCategory: qc, date: new Date() });

    // Oráculo: ordem de especificidade [SC, S∅, ∅C, ∅∅], relaxando categoria antes do escopo.
    const scopeTries = qs !== undefined ? [qs, undefined] : [undefined];
    const catTries = qc !== undefined ? [qc, undefined] : [undefined];
    let expected: string | undefined;
    outer: for (const s of scopeTries) {
      for (const c of catTries) {
        const hit = present.get(`${s ?? "∅"}|${c ?? "∅"}`);
        if (hit) {
          expected = hit;
          break outer;
        }
      }
    }
    assert.equal(got?.priceTableId, expected, `iter ${iter}: resolves to the most specific present bucket`);

    // Determinístico: a mesma consulta devolve o MESMO id.
    const again = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, scope: qs, vehicleCategory: qc, date: new Date() });
    assert.equal(again?.priceTableId, got?.priceTableId, `iter ${iter}: deterministic`);
  }
});

// ── RN-TAR-01: NÃO-sobreposição de vigências por (scope + vehicle_category + serviço) ─────────────────────
test("RN-TAR-01: publicar 2ª tabela mesmo bucket + janela sobreposta + serviço compartilhado → 409 TARIFF_OVERLAP", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });

  const clash = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "CAR", valid_from: "2026-06-01T00:00:00Z", valid_to: "2027-06-01T00:00:00Z" });
  await tariff.create(ctx, { price_table_id: clash.id, service_catalog_id: service, unit_price: 200, origin: "manual" });

  await assert.rejects(
    () => pt.update(ctx, clash.id, { status: "published" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
  );
});

test("RN-TAR-01: janelas DISJUNTAS no mesmo bucket → ambas publicam", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const a = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-06-30T00:00:00Z" });
  const b = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-07-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  assert.ok(a && b, "disjoint windows in the same bucket both publish");
});

test("RN-TAR-01: mesmo bucket + janela sobreposta + serviços DISTINTOS → sem 409 (sem serviço compartilhado)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: randomUUID(), validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  const other = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: randomUUID(), validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  assert.ok(other, "same bucket + overlap but distinct services → no false-positive overlap");
});

test("RN-TAR-01: buckets DIFERENTES + janela sobreposta + serviço compartilhado → sem 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  const priv = await seed(pt, tariff, ctx, { scope: PRIVATE, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  const moto = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "MOTORCYCLE", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  assert.ok(priv && moto, "different scope/category buckets never conflict (resolveTariff disambiguates)");
});

test("RN-TAR-01: legado (NULL,NULL) — duas tabelas curinga overlap + serviço compartilhado → 409; serviços distintos → OK", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });

  const clash = await pt.create(ctx, { name: `T-${randomUUID()}`, valid_from: "2026-03-01T00:00:00Z", valid_to: "2026-09-01T00:00:00Z" });
  await tariff.create(ctx, { price_table_id: clash.id, service_catalog_id: service, unit_price: 5, origin: "manual" });
  await assert.rejects(
    () => pt.update(ctx, clash.id, { status: "published" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
    "two legacy NULL/NULL tables sharing a service in overlapping windows conflict",
  );

  const ok = await seed(pt, tariff, ctx, { serviceCatalogId: randomUUID(), validFrom: "2026-03-01T00:00:00Z", validTo: "2026-09-01T00:00:00Z" });
  assert.ok(ok, "legacy tables with distinct services do not conflict");
});

test("RN-TAR-01 (property): overlap ⇔ janelas se cruzam no mesmo bucket+serviço", async () => {
  const iso = (m: number) => new Date(Date.UTC(2026, m, 1)).toISOString();
  for (let iter = 0; iter < 30; iter++) {
    const { pt, tariff } = reset();
    const ctx = actor();
    const service = randomUUID();
    const aFrom = Math.floor(Math.random() * 6);
    const aTo = aFrom + 1 + Math.floor(Math.random() * 4);
    const bFrom = Math.floor(Math.random() * 6);
    const bTo = bFrom + 1 + Math.floor(Math.random() * 4);

    await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: iso(aFrom), validTo: iso(aTo) });
    const second = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "CAR", valid_from: iso(bFrom), valid_to: iso(bTo) });
    await tariff.create(ctx, { price_table_id: second.id, service_catalog_id: service, unit_price: 7, origin: "manual" });

    const overlaps = aFrom <= bTo && bFrom <= aTo; // intervalos fechados.
    if (overlaps) {
      await assert.rejects(
        () => pt.update(ctx, second.id, { status: "published" }),
        (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
        `iter ${iter}: overlapping windows must be rejected`,
      );
    } else {
      const published = await pt.update(ctx, second.id, { status: "published" });
      assert.equal(published.status, "published", `iter ${iter}: disjoint windows must publish`);
    }
  }
});

test("RN-TAR-01 ponto (ii): inserir serviço numa tabela JÁ PUBLICADA que colide com outra publicada → 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const serviceA = randomUUID();
  const serviceB = randomUUID();
  // T (published) com serviço A; T' (published) mesmo bucket + janela sobreposta com serviço B (sem colisão: A≠B).
  const tableT = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: serviceA, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: serviceB, validFrom: "2026-06-01T00:00:00Z", validTo: "2027-01-01T00:00:00Z" });

  // Agora adiciona o serviço B na tabela T (JÁ PUBLICADA) → passa a compartilhar B com T' na janela sobreposta → 409.
  await assert.rejects(
    () => tariff.create(ctx, { price_table_id: tableT, service_catalog_id: serviceB, unit_price: 15, origin: "manual" }),
    (e: unknown) => (e as { statusCode?: number; code?: string }).statusCode === 409 && (e as { code?: string }).code === "TARIFF_OVERLAP",
  );
});

test("RN-TAR-01 ponto (ii): inserir serviço numa tabela RASCUNHO nunca dispara (o gate é a publicação)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  // Tabela em RASCUNHO no mesmo bucket/janela/serviço → adicionar tarifa NÃO trava (só a publicação travaria).
  const draft = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "CAR", valid_from: "2026-03-01T00:00:00Z", valid_to: "2026-09-01T00:00:00Z" });
  const added = await tariff.create(ctx, { price_table_id: draft.id, service_catalog_id: service, unit_price: 9, origin: "manual" });
  assert.ok(added.id, "adding a tariff to a draft table never triggers RN-TAR-01");
});

// ── F1 [CRÍTICO]: data de partida — a janela PRÓPRIA da Tariff é avaliada NA DATA, não no relógio de parede ──
test("F1: resolveTariff respeita a janela própria da Tariff pela DATA (determinístico, não wall-clock)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  // Tabela com janela ABERTA (cobre toda data); a TARIFF tem janela própria H2/2026.
  await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 77, tariffValidFrom: "2026-07-01T00:00:00Z", tariffValidTo: "2026-12-31T23:59:59Z" });
  const resolve = createMemoryResolveTariff();
  const inWindow = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2026-09-15T12:00:00Z") });
  const beforeWindow = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2026-03-15T12:00:00Z") });
  const afterWindow = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2027-03-15T12:00:00Z") });
  assert.equal(inWindow?.unitPrice, 77, "date inside the tariff's own window resolves");
  assert.equal(beforeWindow, undefined, "date BEFORE the tariff window → excluded (proves asOf, not now())");
  assert.equal(afterWindow, undefined, "date AFTER the tariff window → excluded");
  const again = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: service, date: new Date("2026-09-15T12:00:00Z") });
  assert.equal(again?.id, inWindow?.id, "deterministic re-run for the same date");
});

// ── F2 [CRÍTICO]: RN-TAR-01 não é burlável editando a janela de uma tabela JÁ PUBLICADA ──────────────────────
test("F2: editar a janela de uma tabela JÁ PUBLICADA para sobrepor outra do mesmo bucket → 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-06-30T00:00:00Z" });
  // B publica em janela DISJUNTA (ok).
  const b = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "CAR", valid_from: "2026-07-01T00:00:00Z", valid_to: "2026-12-31T00:00:00Z" });
  await tariff.create(ctx, { price_table_id: b.id, service_catalog_id: service, unit_price: 20, origin: "manual" });
  const published = await pt.update(ctx, b.id, { status: "published" });
  assert.equal(published.status, "published", "disjoint window publishes");
  // Agora edita a janela de B (JÁ publicada) p/ retroagir a Jan → sobrepõe A → 409 (bypass fechado).
  await assert.rejects(
    () => pt.update(ctx, b.id, { valid_from: "2026-01-01T00:00:00Z" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
  );
});

test("F2: editar a CATEGORIA de uma tabela publicada p/ colidir com outra do bucket-destino → 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  // B publica no bucket MOTO (não colide com CAR).
  const b = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "MOTORCYCLE", valid_from: "2026-01-01T00:00:00Z", valid_to: "2026-12-31T00:00:00Z" });
  await tariff.create(ctx, { price_table_id: b.id, service_catalog_id: service, unit_price: 20, origin: "manual" });
  await pt.update(ctx, b.id, { status: "published" });
  // Muda a categoria de B para CAR (bucket de A) → colisão → 409.
  await assert.rejects(
    () => pt.update(ctx, b.id, { vehicle_category: "CAR" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
  );
});

// ── F2 ciclo-2 [CRÍTICO]: REATIVAR (is_active false→true) uma publicada revalida a não-sobreposição ──────────
test("F2 ciclo-2: reativar uma tabela publicada que recria sobreposição → 409; desativar sozinho → sem 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  // A publica [Jan-Dez] PUBLIC/CAR serviço S (preço 100).
  const a = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, unitPrice: 100, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  // Desativar A sozinho → SEM 409 (desativação segue livre).
  const deactivated = await pt.update(ctx, a, { is_active: false });
  assert.equal(deactivated.isActive, false, "deactivating alone is always allowed (no overlap guard)");
  // B publica MESMO bucket/janela/serviço → A inativa não é peer → B passa (preço 200).
  const b = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, unitPrice: 200, validFrom: "2026-06-01T00:00:00Z", validTo: "2027-01-01T00:00:00Z" });
  assert.ok(b, "B publishes while A is inactive (A is not a peer)");
  // Reativar A → recria a sobreposição com B → 409 (bypass ciclo-2 fechado).
  await assert.rejects(
    () => pt.update(ctx, a, { is_active: true }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
  );
});

// ── F3 [ALTO]: orçamento legado cego a tabelas escopadas (byte-idêntico) ─────────────────────────────────────
test("F3: criar tabela ESCOPADA não altera a resolução do orçamento LEGADO", async () => {
  const { createMemoryApplicableTariffResolver } = await import("../src/modules/service-quotes/service-quote.service.js");
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const legacy = await seed(pt, tariff, ctx, { serviceCatalogId: service, unitPrice: 100 });
  const resolver = createMemoryApplicableTariffResolver();
  const before = await resolver(ctx.tenantId, service, undefined);
  assert.equal(before?.priceTableId, legacy);
  assert.equal(before?.unitPrice, 100);
  // Cria uma tabela ESCOPADA publicada com preço DIFERENTE para o MESMO serviço.
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, unitPrice: 999 });
  const after = await resolver(ctx.tenantId, service, undefined);
  assert.equal(after?.priceTableId, legacy, "scoped table must NOT enter the legacy quote resolution");
  assert.equal(after?.unitPrice, 100, "legacy quote price unchanged by the scoped table");
});

// ── F8 [PLANO]: customer_id faz parte do bucket-key do overlap ──────────────────────────────────────────────
test("F8: mesmo bucket + janela sobreposta, tarifas que diferem SÓ pelo cliente → sem 409; mesmo cliente → 409", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const service = randomUUID();
  const custA = randomUUID();
  const custB = randomUUID();
  await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, customerId: custA, validFrom: "2026-01-01T00:00:00Z", validTo: "2026-12-31T00:00:00Z" });
  // Cliente DIFERENTE (custB) no mesmo bucket/janela → não conflita → publica.
  const t2 = await seed(pt, tariff, ctx, { scope: PUBLIC, category: "CAR", serviceCatalogId: service, customerId: custB, validFrom: "2026-06-01T00:00:00Z", validTo: "2027-06-01T00:00:00Z" });
  assert.ok(t2, "tables differing only by customer do not conflict");
  // MESMO cliente (custA) no mesmo bucket/janela → 409.
  const t3 = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "CAR", valid_from: "2026-03-01T00:00:00Z", valid_to: "2026-09-01T00:00:00Z" });
  await tariff.create(ctx, { price_table_id: t3.id, service_catalog_id: service, customer_id: custA, unit_price: 5, origin: "manual" });
  await assert.rejects(
    () => pt.update(ctx, t3.id, { status: "published" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 409 && e.code === "TARIFF_OVERLAP",
  );
});

// ── F4 [ALTO]: o invariante não depende do teto de página (>100 tabelas no bucket) ──────────────────────────
test("F4: resolveTariff enxerga além de 100 tabelas publicadas (alvo é o MAIS ANTIGO → o limit:100-desc o excluiria)", async () => {
  const { pt, tariff } = reset();
  const ctx = actor();
  const targetService = randomUUID();
  // Alvo criado PRIMEIRO (o mais antigo): um list(limit:100, createdAt desc) o deixaria fora → miss no antigo.
  const target = await seed(pt, tariff, ctx, { serviceCatalogId: targetService, unitPrice: 4242, validFrom: "2030-01-01T00:00:00Z", validTo: "2030-12-31T00:00:00Z" });
  // 105 tabelas gerais (∅∅) publicadas DEPOIS, serviços DISTINTOS + janelas disjuntas (não colidem entre si nem com o alvo).
  for (let i = 0; i < 105; i++) {
    const month = i % 12;
    await seed(pt, tariff, ctx, {
      serviceCatalogId: randomUUID(),
      unitPrice: i,
      validFrom: new Date(Date.UTC(2020 + Math.floor(i / 12), month, 1)).toISOString(),
      validTo: new Date(Date.UTC(2020 + Math.floor(i / 12), month, 28)).toISOString(),
    });
  }
  const resolve = createMemoryResolveTariff();
  const got = await resolve({ tenantId: ctx.tenantId, serviceCatalogId: targetService, date: new Date("2030-06-15T00:00:00Z") });
  assert.equal(got?.priceTableId, target, "server-side bucket query finds the oldest table (no limit:100 cap)");
  assert.equal(got?.unitPrice, 4242);
});

// ── DTO / validação dos novos eixos ──────────────────────────────────────────────────────────────────────
test("scope inválido → 400; vehicle_category normaliza para app-code (uppercase)", async () => {
  const { pt } = reset();
  const ctx = actor();
  await assert.rejects(
    () => pt.create(ctx, { name: `T-${randomUUID()}`, scope: "POLICIA" }),
    (e: unknown) => e instanceof PriceTableError && e.statusCode === 400 && e.reason === "invalid_scope",
  );
  const table = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: "public_agreement", vehicle_category: "moto" });
  assert.equal(table.scope, PUBLIC, "scope is normalized to the uppercase enum");
  assert.equal(table.vehicleCategory, "MOTO", "vehicle_category is normalized to app-code uppercase");
});

test("DTO expõe scope + scopeLabel PT-BR + vehicleCategory; nunca tenant_id", async () => {
  const { toPriceTableDto } = await import("../src/modules/price-tables/price-table.dto.js");
  const { pt } = reset();
  const ctx = actor();
  const table = await pt.create(ctx, { name: `T-${randomUUID()}`, scope: PUBLIC, vehicle_category: "TRUCK" });
  const dto = toPriceTableDto({ ...table }) as Record<string, unknown>;
  assert.equal(dto.scope, PUBLIC);
  assert.equal(dto.scopeLabel, "Convênio público");
  assert.equal(dto.vehicleCategory, "TRUCK");
  assert.equal("tenant_id" in dto, false, "§allowlist: DTO never exposes tenant_id");
  assert.equal("tenantId" in dto, false, "§allowlist: DTO never exposes tenantId");
});
