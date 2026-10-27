import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// DEMO-A (plano DEMO-SOCIO, AC-03/AC-04/AC-05) — os scripts da demonstração ao sócio, pelas funções PURAS: a trava
// de terreno (recusa fora do projeto demo-socio), a idempotência do seed e o formato do trajeto. Sem Docker, sem banco.
import {
  DEMO_DEVICES_NETWORK,
  DEMO_DEVICE_ID,
  buildOsmandQuery,
  buildTrajectory,
  demoTargetRefusals,
  measureCadence,
  missingPasswords,
  nextOsmandTimestamp,
  planEnsure,
  redactSecrets,
  simDockerRunArgs,
  statusPath,
  WORK_ORDER_TRANSITIONS,
  // @ts-expect-error -- script .mjs sem tipos
} from "../scripts/demo-socio-lib.mjs";
// @ts-expect-error -- script .mjs sem tipos
import { BACKGROUND_ORDERS, TENANT, USERS, VEHICLES, listItems } from "../scripts/demo-socio-seed.mjs";
// @ts-expect-error -- script .mjs sem tipos
import { SIM_SCRIPT, parseLatLon, simImageFromCompose } from "../scripts/demo-socio-trajeto.mjs";

type Row = { Names: string; Labels: string; Ports: string; State: string };
const row = (name: string, project: string, service: string, ports = ""): Row => ({
  Names: name,
  Labels: `com.docker.compose.project=${project},com.docker.compose.service=${service}`,
  Ports: ports,
  State: "running",
});
const healthy = (): Row[] => [
  row("demo-socio-api-1", "demo-socio", "api", "127.0.0.1:3102->3000/tcp"),
  row("demo-socio-postgres-1", "demo-socio", "postgres", "5432/tcp"),
  row("erp-postgres", "erp_techsolutios", "erp-postgres", "0.0.0.0:5432->5432/tcp, [::]:5432->5432/tcp"),
];

test("trava: o terreno demo-socio de pé passa (lista de recusas vazia)", () => {
  assert.deepEqual(demoTargetRefusals({ project: "demo-socio", containers: healthy() }), []);
});

test("trava: recusa projeto que não é demo-socio, inclusive erp-*", () => {
  assert.ok(demoTargetRefusals({ project: "erp-trc01-demo", containers: healthy() }).some((r: string) => /não é "demo-socio"/.test(r)));
  assert.ok(demoTargetRefusals({ project: "erp-trc01-demo", containers: healthy() }).some((r: string) => /erp-\*/.test(r)));
  assert.ok(demoTargetRefusals({ project: undefined, containers: healthy() }).length > 0);
});

test("trava: recusa a porta da base viva e qualquer porta que não seja a 3102", () => {
  for (const port of [5432, 6379, 3000, 5173, 5050, 8899]) {
    assert.ok(demoTargetRefusals({ project: "demo-socio", apiPort: port, containers: healthy() }).some((r: string) => /base viva/.test(r)), String(port));
  }
  assert.ok(demoTargetRefusals({ project: "demo-socio", apiPort: 3103, containers: healthy() }).length > 0);
  assert.ok(demoTargetRefusals({ project: "demo-socio", apiHost: "0.0.0.0", containers: healthy() }).length > 0);
});

test("trava: recusa sem a api com o rótulo do compose demo-socio", () => {
  const rows = healthy().filter((r) => r.Names !== "demo-socio-api-1");
  assert.ok(demoTargetRefusals({ project: "demo-socio", containers: rows }).some((r: string) => /nenhuma api/.test(r)));
});

test("trava: recusa quando OUTRA pilha publica a 3102", () => {
  const rows = [...healthy().filter((r) => r.Names !== "demo-socio-api-1"), row("demo-socio-api-1", "demo-socio", "api"), row("erp-api", "erp_techsolutios", "api", "127.0.0.1:3102->3000/tcp")];
  const refusals = demoTargetRefusals({ project: "demo-socio", containers: rows });
  assert.ok(refusals.some((r: string) => /fora do projeto demo-socio/.test(r)));
  assert.ok(refusals.some((r: string) => /não publica/.test(r)));
});

test("trava: recusa contêiner erp-* com rótulo demo-socio e banco da demo publicado no host", () => {
  const forged = [...healthy(), row("erp-forjado", "demo-socio", "worker")];
  assert.ok(demoTargetRefusals({ project: "demo-socio", containers: forged }).some((r: string) => /erp-\* dentro do projeto/.test(r)));
  const published = healthy().map((r) => (r.Names === "demo-socio-postgres-1" ? { ...r, Ports: "0.0.0.0:5432->5432/tcp" } : r));
  assert.ok(demoTargetRefusals({ project: "demo-socio", containers: published }).some((r: string) => /publica a porta 5432/.test(r)));
});

test("idempotência: a 1ª rodada cria tudo, a 2ª não cria nada", () => {
  const desired = [{ plate: "GEX1A23" }, { plate: "GEX2B34" }];
  const first = planEnsure([], desired, (x: { plate: string }) => x.plate, (x: { plate: string }) => x.plate);
  assert.equal(first.toCreate.length, 2);
  const existing = first.toCreate.map((item: { plate: string }, index: number) => ({ id: String(index), plate: item.plate }));
  const second = planEnsure(existing, desired, (x: { plate: string }) => x.plate, (x: { plate: string }) => x.plate);
  assert.equal(second.toCreate.length, 0);
  assert.equal(second.present.length, 2);
});

test("idempotência: a chave natural ignora caixa, acento e espaço nas pontas; chave desejada repetida é erro", () => {
  const plan = planEnsure([{ name: "  pátio central " }], [{ name: "Pátio Central" }, { name: "Patio Norte" }], (x: { name: string }) => x.name, (x: { name: string }) => x.name);
  assert.deepEqual(plan.toCreate.map((x: { name: string }) => x.name), ["Patio Norte"]);
  assert.throws(() => planEnsure([], [{ k: "a" }, { k: "A" }], (x: { k: string }) => x.k, (x: { k: string }) => x.k), /repetida/);
});

test("idempotência: o status da OS anda pelo caminho mais curto e não anda na 2ª rodada", () => {
  assert.deepEqual(statusPath("open", "completed"), ["assigned", "accepted", "on_route", "on_site", "in_progress", "completed"]);
  assert.deepEqual(statusPath("open", "paused"), ["assigned", "accepted", "on_route", "on_site", "in_progress", "paused"]);
  assert.deepEqual(statusPath("completed", "completed"), []);
  assert.equal(statusPath("completed", "open"), null);
  for (const order of BACKGROUND_ORDERS as Array<{ status: string }>) {
    if (order.status === "cancelled") continue; // cancelar é POST /cancel com decisão financeira, não PATCH /status
    assert.ok(statusPath("open", order.status) !== null, order.status);
    assert.ok(!(statusPath("open", order.status) ?? []).includes("cancelled"));
  }
  assert.deepEqual(Object.keys(WORK_ORDER_TRANSITIONS).sort(), ["accepted", "assigned", "cancelled", "completed", "in_progress", "on_route", "on_site", "open", "paused", "rejected"]);
});

test("dados do seed: os 6 módulos, 4 perfis, Guincho 01 e de 8 a 15 OS de fundo", () => {
  assert.deepEqual([...TENANT.modules].sort(), ["dashboard", "field_operations", "finance", "notifications", "tenant_checklist", "work_orders"]);
  assert.deepEqual(USERS.map((u: { roles: string[] }) => u.roles[0]).sort(), ["field_dispatcher", "field_technician", "manager", "tenant_admin"]);
  assert.ok(VEHICLES.some((v: { model: string }) => v.model === "Guincho 01"));
  for (const v of VEHICLES as Array<{ plate: string }>) assert.match(v.plate, /^[A-Z]{3}\d[A-Z]\d{2}$/, "placa Mercosul");
  assert.ok(BACKGROUND_ORDERS.length >= 8 && BACKGROUND_ORDERS.length <= 15);
  assert.ok(new Set((BACKGROUND_ORDERS as Array<{ status: string }>).map((o) => o.status)).size >= 5, "status variados");
});

test("senhas: só por DEMO_*_PASSWORD, nunca no código; o --posicao exige só a do guincheiro", () => {
  assert.deepEqual(missingPasswords({}, "seed").sort(), ["DEMO_ADMIN_PASSWORD", "DEMO_DISPATCHER_PASSWORD", "DEMO_MANAGER_PASSWORD", "DEMO_TECH_PASSWORD"]);
  assert.deepEqual(missingPasswords({ DEMO_TECH_PASSWORD: "curta" }, "posicao"), ["DEMO_TECH_PASSWORD"]);
  assert.deepEqual(missingPasswords({ DEMO_TECH_PASSWORD: "longa-o-bastante" }, "posicao"), []);
  const source = readFileSync(new URL("../scripts/demo-socio-seed.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /password\s*[:=]\s*["'`][^"'`$]{4,}["'`]/i, "nenhuma senha literal no seed");
  assert.equal(redactSecrets("a senha s3nh4-demo vazou", ["s3nh4-demo"]), "a senha <redigido> vazou");
});

test("listagens: o seed lê os formatos {data:{items}}, {data:[…]} e {items}", () => {
  assert.equal(listItems({ data: { items: [1, 2] } }).length, 2);
  assert.equal(listItems({ data: [1] }).length, 1);
  assert.equal(listItems({ items: [1, 2, 3] }).length, 3);
  assert.equal(listItems({}).length, 0);
});

test("trajeto: N pontos, de/para exatos, horário estritamente crescente e coordenadas válidas", () => {
  const plan = buildTrajectory({ points: 12, startEpochSeconds: 1_800_000_000, stepSeconds: 5 });
  assert.equal(plan.length, 12);
  assert.deepEqual([plan[0].lat, plan[0].lon], [-23.5614, -46.6559]);
  assert.deepEqual([plan[11].lat, plan[11].lon], [-23.569, -46.6494]);
  for (let i = 1; i < plan.length; i += 1) {
    assert.ok(plan[i].timestamp > plan[i - 1].timestamp);
    assert.ok(plan[i].lat <= plan[i - 1].lat, "anda no sentido do destino");
  }
  assert.equal(plan[11].speed, 0, "chega parado");
  assert.throws(() => buildTrajectory({ points: 1, startEpochSeconds: 1 }), /points/);
  assert.throws(() => buildTrajectory({ points: 3, startEpochSeconds: 1, from: { lat: 95, lon: 0 } }), /lat/);
});

test("trajeto: o horário de envio nunca repete nem volta, mesmo dois envios no mesmo segundo", () => {
  const a = nextOsmandTimestamp(1_800_000_000_400, undefined);
  const b = nextOsmandTimestamp(1_800_000_000_900, a);
  const c = nextOsmandTimestamp(1_800_000_005_000, b);
  assert.deepEqual([a, b, c], [1_800_000_000, 1_800_000_001, 1_800_000_005]);
});

test("trajeto: docker run --rm na rede interna do projeto, com guincho01, NUNCA docker compose", () => {
  const args = simDockerRunArgs({ image: "img@sha256:x", point: { lat: -23.5, lon: -46.6, timestamp: 1_800_000_000, speed: 15 }, script: SIM_SCRIPT });
  assert.equal(args[0], "run");
  assert.ok(args.includes("--rm"));
  assert.equal(args[args.indexOf("--network") + 1], "demo-socio_traccar_devices");
  assert.equal(DEMO_DEVICES_NETWORK, "demo-socio_traccar_devices");
  assert.ok(args.includes(`TRC_SIM_ID=${DEMO_DEVICE_ID}`) && DEMO_DEVICE_ID === "guincho01");
  assert.match(args[args.indexOf("--name") + 1], /^demo-socio-trajeto-guincho01-1800000000$/);
  assert.ok(!args.includes("compose"));
  const source = readFileSync(new URL("../scripts/demo-socio-trajeto.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source.replace(/^\s*\/\/.*$/gm, ""), /docker compose|"compose"/, "o código do trajeto não chama compose");
  assert.match(SIM_SCRIPT, /osmand_status=/);
  assert.equal(buildOsmandQuery({ id: "guincho01", lat: -23.5, lon: -46.6, timestamp: 1, speed: 0 }), "id=guincho01&lat=-23.5&lon=-46.6&timestamp=1&speed=0");
});

test("trajeto: a imagem do simulador é a do overlay, fixada por digest; coordenada de flag é validada", () => {
  const image = simImageFromCompose(readFileSync(new URL("../docker-compose.traccar.yml", import.meta.url), "utf8"));
  assert.match(image, /^node:20-bookworm-slim@sha256:[0-9a-f]{64}$/);
  assert.deepEqual(parseLatLon("-23.1,-46.2", undefined), { lat: -23.1, lon: -46.2 });
  assert.throws(() => parseLatLon("abc", undefined), /inválida/);
});

test("trajeto: cadência medida a partir dos instantes de envio", () => {
  assert.deepEqual(measureCadence([0, 5000, 10100]), { intervals: 2, meanMs: 5050, minMs: 5000, maxMs: 5100 });
  assert.deepEqual(measureCadence([0]), { intervals: 0, meanMs: 0, minMs: 0, maxMs: 0 });
});

test("status e down: só pelo rótulo do projeto demo-socio, sem docker compose; o down recusa erp-* e simula sem --confirmo", () => {
  for (const file of ["demo-socio-status.sh", "demo-socio-down.sh"]) {
    const source = readFileSync(new URL(`../scripts/${file}`, import.meta.url), "utf8");
    const code = source.replace(/^\s*#.*$/gm, "");
    assert.match(code, /label=\$LABEL|label=\$\{?LABEL/, file);
    assert.match(source, /LABEL="com\.docker\.compose\.project=\$PROJECT"/, file);
    assert.match(source, /PROJECT="demo-socio"/, file);
    assert.doesNotMatch(code, /docker compose|docker-compose/, file);
  }
  const down = readFileSync(new URL("../scripts/demo-socio-down.sh", import.meta.url), "utf8");
  assert.match(down, /grep -qE '\^erp-'/);
  assert.match(down, /--confirmo\) CONFIRM=1/);
  assert.match(down, /SIMULAÇÃO: nada removido/);
});

test("folha de cola: existe e não carrega senha", () => {
  const sheet = readFileSync(new URL("../docs/demo/DEMO-SOCIO-folha-de-cola.md", import.meta.url), "utf8");
  for (const user of USERS as Array<{ email: string }>) assert.ok(sheet.includes(user.email), user.email);
  assert.doesNotMatch(sheet, /(senha|password)\s*[:=]\s*\S{6,}/i);
  assert.match(sheet, /Se o PC reiniciou/);
});
