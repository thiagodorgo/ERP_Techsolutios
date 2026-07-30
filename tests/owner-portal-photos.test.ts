import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";

process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.LOG_LEVEL = "silent";

import { Jimp } from "jimp";

import { createPortalApp } from "../src/portal-app.js";
import {
  InMemoryPortalReleaseRequestRepository,
  OwnerPortalService,
  PhotoConcurrencyGuard,
  PhotoConcurrencySaturatedError,
  PhotoLruCache,
  PhotoPipelineError,
  assertSafeImageDimensions,
  createOwnerPortalRouter,
  ImageHeaderRejectedError,
  minimizePhotoBuffer,
  withPhotoPipelineTimeout,
  createDefaultOwnerPortalService,
} from "../src/modules/owner-portal/index.js";
import {
  AntiAbuse,
  InMemoryChallengeStore,
  InMemoryPortalAccessLogRepository,
  InMemoryTokenBucketStore,
  TokenBucket,
  signOwnerSession,
  type AntiAbuseConfig,
} from "../src/modules/portal-shared/index.js";
import {
  createMemoryImpoundService,
  resetImpoundRuntimeForTests,
} from "../src/modules/impound/impound.service.js";
import {
  createMemoryChargeService,
  resetChargeRuntimeForTests,
} from "../src/modules/charging/charge.service.js";
import {
  createMemoryYardService,
  resetYardRuntimeForTests,
} from "../src/modules/yard/yard.service.js";
import {
  createMemoryJurisdictionService,
  resetJurisdictionRuntimeForTests,
} from "../src/modules/jurisdiction/jurisdiction.service.js";
import { saveAttachmentFile } from "../src/modules/attachments/attachment.storage.js";
import type { ImpoundActorContext } from "../src/modules/impound/impound.types.js";

const TENANT = randomUUID();
const LOG_SECRET = "test-portal-log-secret";
const SESSION_SECRET = "test-portal-session-secret";

function actor(tenantId = TENANT): ImpoundActorContext {
  return { tenantId, userId: randomUUID(), roles: ["manager"], permissions: ["impound:read", "impound:create", "impound:inspect"] };
}

const BASE_ANTI_ABUSE: AntiAbuseConfig = {
  ipBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  plateBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  readBucket: { capacity: 1000, refillTokens: 1000, refillIntervalMs: 60_000 },
  baseDifficulty: 2,
  maxDifficulty: 5,
  failuresPerStep: 1,
  failureWindowMs: 60_000,
};

type Harness = {
  readonly accessLog: InMemoryPortalAccessLogRepository;
  readonly service: OwnerPortalService;
  readonly photoCache: PhotoLruCache;
  readonly photoConcurrencyGuard: PhotoConcurrencyGuard;
};

function buildHarness(
  overrides: {
    antiAbuse?: Partial<AntiAbuseConfig>;
    minLatencyMs?: number;
    photoBucketCapacity?: number;
    photoConcurrencyMax?: number;
  } = {},
): Harness {
  resetImpoundRuntimeForTests();
  resetChargeRuntimeForTests();
  resetYardRuntimeForTests();
  resetJurisdictionRuntimeForTests();
  const accessLog = new InMemoryPortalAccessLogRepository();
  const releaseRequests = new InMemoryPortalReleaseRequestRepository();
  const photoCache = new PhotoLruCache();
  const photoConcurrencyGuard = new PhotoConcurrencyGuard(overrides.photoConcurrencyMax ?? 3);
  const photoRateLimiter = new TokenBucket(new InMemoryTokenBucketStore(), {
    capacity: overrides.photoBucketCapacity ?? 10,
    refillTokens: overrides.photoBucketCapacity ?? 10,
    refillIntervalMs: 5 * 60 * 1000,
  });
  const service = new OwnerPortalService({
    tenantId: TENANT,
    impound: createMemoryImpoundService(),
    charge: createMemoryChargeService(),
    yard: createMemoryYardService(),
    jurisdiction: createMemoryJurisdictionService(),
    releaseRequests,
    accessLog,
    antiAbuse: new AntiAbuse({ ...BASE_ANTI_ABUSE, ...overrides.antiAbuse }),
    challengeStore: new InMemoryChallengeStore(),
    logSecret: LOG_SECRET,
    sessionSecret: SESSION_SECRET,
    minLatencyMs: overrides.minLatencyMs ?? 0,
    challengeTtlMs: 120_000,
    photoRateLimiter,
    photoConcurrencyGuard,
    photoCache,
  });
  return { accessLog, service, photoCache, photoConcurrencyGuard };
}

// Seeds um processo com sessão (mesma receita do owner-portal-dossier.test.ts).
async function seedProcessWithSession(input: { plate: string; renavam: string }): Promise<{ processId: string; session: string }> {
  const jurisdiction = createMemoryJurisdictionService();
  const profile = await jurisdiction.create(actor(), {
    name: `Perfil ${input.plate}`,
    scope: "PUBLIC_AGREEMENT",
    release_requirements: [],
  });
  const yardService = createMemoryYardService();
  const yard = await yardService.create(actor(), { name: "Pátio Teste", address: "Rua Teste, 1" });
  const impound = createMemoryImpoundService();
  const process = await impound.create(actor(), {
    profile_id: profile.id,
    origin_authority: "Órgão Teste",
    vehicle_plate: input.plate,
    vehicle_renavam: input.renavam,
    vehicle_brand: "VW",
    vehicle_model: "Gol",
    vehicle_color: "Prata",
    vehicle_year: 2020,
    yard_id: yard.id,
  });
  await impound.transition(actor(), process.id, { to: "RECEPTION" });
  const session = await signOwnerSession({ processId: process.id }, { secret: SESSION_SECRET });
  return { processId: process.id, session };
}

// Anexa 1 foto REAL (bytes válidos, decodificáveis pelo jimp) à vistoria do processo, via storage LOCAL de verdade
// (saveAttachmentFile) — o mesmo caminho que resolveAttachmentDownload vai ler depois.
async function seedPhoto(processId: string, buffer: Buffer, mimeType: string): Promise<void> {
  const impound = createMemoryImpoundService();
  const inspection = await impound.saveInspection(actor(), processId, {});
  const stored = await saveAttachmentFile({
    tenantId: TENANT,
    entityType: "impound_intake_inspection",
    entityId: inspection.id,
    upload: { buffer, originalName: `foto.${mimeType === "image/png" ? "png" : "jpg"}`, mimeType, sizeBytes: buffer.length },
  });
  await impound.addInspectionPhoto(actor(), processId, {
    set: "FRONT",
    file_url: stored.fileUrl,
    file_name: stored.fileName,
    content_type: stored.contentType,
    storage_provider: stored.storageProvider,
    storage_key: stored.storageKey,
  });
}

async function makePngBuffer(width: number, height: number, color = 0x3366ccff): Promise<Buffer> {
  const image = new Jimp({ width, height, color });
  return image.getBuffer("image/png");
}

function fabricatedHugePng(width: number, height: number): Buffer {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const chunkLength = Buffer.alloc(4);
  chunkLength.writeUInt32BE(13, 0);
  const chunkType = Buffer.from("IHDR", "ascii");
  const widthBuf = Buffer.alloc(4);
  widthBuf.writeUInt32BE(width, 0);
  const heightBuf = Buffer.alloc(4);
  heightBuf.writeUInt32BE(height, 0);
  const rest = Buffer.alloc(5); // bit depth, color type, compression, filter, interlace
  return Buffer.concat([signature, chunkLength, chunkType, widthBuf, heightBuf, rest]);
}

// ── HTTP harness ────────────────────────────────────────────────────────────────────────────────────────────────
async function withApp(service: OwnerPortalService, run: (baseUrl: string) => Promise<void>): Promise<void> {
  const app = createPortalApp({ ownerRouter: createOwnerPortalRouter(() => Promise.resolve(service)) });
  const server = app.listen(0);
  try {
    await run(await getBaseUrl(server));
  } finally {
    await closeServer(server);
  }
}
async function getBaseUrl(server: Server): Promise<string> {
  await new Promise<void>((resolve) => server.once("listening", resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
async function getBinary(baseUrl: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; buffer: Buffer; contentType: string | null; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers });
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return { status: response.status, buffer, contentType: response.headers.get("content-type"), text: buffer.toString("utf8") };
}
async function getJson(baseUrl: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; text: string }> {
  const response = await fetch(`${baseUrl}${path}`, { method: "GET", headers });
  return { status: response.status, text: await response.text() };
}
function bearer(session: string): Record<string, string> {
  return { authorization: `Bearer ${session}` };
}

// Extrai o(s) opaqueRef(s) do dossiê (endpoint já testado no PR-17 dossier test; aqui usado só como setup).
async function fetchOpaqueRefs(baseUrl: string, session: string): Promise<Array<{ opaqueRef: string; capturedAtLabel: string }>> {
  const res = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(session));
  assert.equal(res.status, 200);
  const dossier = JSON.parse(res.text).data as { photos: { sets: Array<{ opaqueRef: string; capturedAtLabel: string }> } };
  return dossier.photos.sets;
}

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (1) S1+C1 — header-guard rejeita dimensão absurda SEM chamar Jimp.read
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(1) header-guard: PNG com IHDR de dimensão absurda (50000x50000) é rejeitado SEM decodificar (spy em Jimp.read)", async () => {
  const huge = fabricatedHugePng(50_000, 50_000);
  assert.throws(() => assertSafeImageDimensions(huge), ImageHeaderRejectedError);

  // Spy: monkey-patch Jimp.read (propriedade gravável do singleton exportado por "jimp") para provar que o
  // pipeline NUNCA o invoca quando o header já reprovou.
  const originalRead = Jimp.read;
  let readCalled = false;
  // @ts-expect-error — monkey-patch deliberado só para o teste; restaurado no finally.
  Jimp.read = (...args: unknown[]) => {
    readCalled = true;
    // @ts-expect-error — repassa para a implementação real caso o teste precise (não deveria chegar aqui).
    return originalRead(...args);
  };
  try {
    await assert.rejects(minimizePhotoBuffer(huge), PhotoPipelineError);
    assert.equal(readCalled, false, "Jimp.read NUNCA deve ser chamado para um header já rejeitado");
  } finally {
    // @ts-expect-error — restaura o binding original.
    Jimp.read = originalRead;
  }
});

test("(1b) header-guard: dimensão individual absurda com produto pequeno (1x40_000_000) também é rejeitada (S1)", () => {
  const degenerate = fabricatedHugePng(1, 40_000_000);
  assert.throws(() => assertSafeImageDimensions(degenerate), ImageHeaderRejectedError);
});

test("(1c) header-guard: imagem legítima pequena passa", async () => {
  const buffer = await makePngBuffer(64, 48);
  assert.doesNotThrow(() => assertSafeImageDimensions(buffer));
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (2) S2+C2 — semáforo de concorrência: N+1 requisições simultâneas → a N+1 recebe 503 (Saturated)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(2) semáforo de concorrência: N=2 em voo + a 3ª chega → PhotoConcurrencySaturatedError imediato", async () => {
  const guard = new PhotoConcurrencyGuard(2);
  const releasers: Array<() => void> = [];
  const pending = (): Promise<void> => new Promise<void>((resolve) => releasers.push(resolve));

  const task1 = guard.run(() => pending());
  const task2 = guard.run(() => pending());
  assert.equal(guard.inFlightCountForTests, 2);

  // 3ª (N+1) — deve rejeitar IMEDIATAMENTE (não enfileira).
  await assert.rejects(guard.run(() => pending()), PhotoConcurrencySaturatedError);

  // Libera 1 das 2 em voo → o slot abre e uma nova task é aceita.
  releasers[0]();
  await task1;
  const task3 = guard.run(async () => "ok");
  assert.equal(await task3, "ok");

  releasers[1]();
  await task2;
  assert.equal(guard.inFlightCountForTests, 0);
});

test("(2b) integração HTTP: balde de concorrência 1 → a 2ª leitura simultânea da MESMA foto recebe 503", async () => {
  const { service } = buildHarness({ photoConcurrencyMax: 1 });
  const seeded = await seedProcessWithSession({ plate: "CNC1C11", renavam: "10101010101" });
  const bigPng = await makePngBuffer(1600, 1200);
  await seedPhoto(seeded.processId, bigPng, "image/png");

  await withApp(service, async (baseUrl) => {
    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    assert.equal(refs.length, 1);
    const [first, second] = await Promise.all([
      getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session)),
      getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session)),
    ]);
    const statuses = [first.status, second.status].sort();
    // 1 delas processa (200), a outra estoura o semáforo (503) — nunca as 2 em 200 com concurrency=1 e cache MISS.
    assert.deepEqual(statuses, [200, 503]);
  });
});

// PoC do crítico-adversarial (conserto pós-junta) — a composição ANTIGA era
// `guard.run(() => minimizePhotoBuffer(...))`, e `minimizePhotoBuffer` já embutia `withTimeout(...)` por dentro.
// Como `guard.run` faz `finally { inFlight -= 1 }` no que resolver PRIMEIRO, um timeout que dispara ANTES do
// trabalho real terminar devolvia o slot ao pool enquanto a decodificação síncrona continuava rodando em
// background sem ser contada — anulando a garantia de N=3 decodificações reais simultâneas (C2). A composição
// CORRIGIDA é `withTimeout(guard.run(() => runPipeline(...)), ms)`: o guard envolve o trabalho real (sem
// timeout embutido) e só libera o slot quando ele de fato termina; o timeout envolve só a ESPERA da resposta.
test("(2c) C2 regressão: guard só libera o slot quando o trabalho REAL termina, não quando um timeout externo dispara antes dele", async () => {
  const guard = new PhotoConcurrencyGuard(3);
  let resolveSlow: (value: string) => void = () => {};
  const slowTask = new Promise<string>((resolve) => {
    resolveSlow = resolve;
  });
  // guard.run envolve DIRETAMENTE o trabalho lento (sem timeout embutido) — composição corrigida.
  const guarded = guard.run(() => slowTask);
  // Timeout MUITO menor que o trabalho real, aplicado por FORA (sobre o resultado de guard.run), nunca por dentro.
  const raced = withPhotoPipelineTimeout(guarded, 5);

  await assert.rejects(raced, PhotoPipelineError);
  // O timeout externo já disparou (raced rejeitou) — mas o slot NÃO pode ter sido liberado: o trabalho real
  // (slowTask) ainda está em voo. Este é exatamente o furo que o crítico provou na composição antiga.
  assert.equal(
    guard.inFlightCountForTests,
    1,
    "inFlight só pode cair quando o trabalho REAL resolve/rejeita — nunca quando um timeout externo dispara antes dele",
  );

  // Só quando o trabalho real de fato termina é que o slot é devolvido.
  resolveSlow("done-late");
  await guarded;
  assert.equal(guard.inFlightCountForTests, 0, "após o trabalho real terminar de fato, o slot é liberado");
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (3) C3 — cache só pós-HMAC: opaqueRef inválido nunca povoa/lê o cache
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(3) cache: opaqueRef inválido NUNCA povoa o cache; opaqueRef válido povoa (chave = attachmentId)", async () => {
  const { service, photoCache } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "CAC1H11", renavam: "20202020202" });
  const png = await makePngBuffer(200, 150);
  await seedPhoto(seeded.processId, png, "image/png");

  await withApp(service, async (baseUrl) => {
    const bogus = await getBinary(baseUrl, "/portal/v1/owner/photos/00000000deadbeef", bearer(seeded.session));
    assert.equal(bogus.status, 404);
    assert.equal(photoCache.sizeForTests, 0, "opaqueRef inválido não pode nunca tocar o cache");

    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    const ok1 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    assert.equal(ok1.status, 200);
    assert.equal(photoCache.sizeForTests, 1, "opaqueRef válido povoa o cache 1x (chave = attachmentId resolvido)");

    // 2ª leitura do MESMO opaqueRef → cache HIT (não muda o tamanho do cache; ainda 1 entrada).
    const ok2 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    assert.equal(ok2.status, 200);
    assert.equal(photoCache.sizeForTests, 1);
    assert.deepEqual(ok1.buffer, ok2.buffer, "cache HIT devolve o MESMO buffer já minimizado");
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (4) opaqueRef não-previsível: outro attachment/processo → 404; 1 char alterado → 404
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(4)+(6) opaqueRef IDOR-proof: 1 char alterado → 404; ref de OUTRO processo → 404 (isolamento cross-sessão)", async () => {
  const { service } = buildHarness();
  const a = await seedProcessWithSession({ plate: "REF1A11", renavam: "30303030303" });
  const b = await seedProcessWithSession({ plate: "REF2B22", renavam: "40404040404" });
  const pngA = await makePngBuffer(120, 90);
  const pngB = await makePngBuffer(140, 100);
  await seedPhoto(a.processId, pngA, "image/png");
  await seedPhoto(b.processId, pngB, "image/png");

  await withApp(service, async (baseUrl) => {
    const refsA = await fetchOpaqueRefs(baseUrl, a.session);
    const refsB = await fetchOpaqueRefs(baseUrl, b.session);
    assert.equal(refsA.length, 1);
    assert.equal(refsB.length, 1);
    assert.notEqual(refsA[0].opaqueRef, refsB[0].opaqueRef);

    // Ref legítimo de A, com a sessão de A → 200.
    const ok = await getBinary(baseUrl, `/portal/v1/owner/photos/${refsA[0].opaqueRef}`, bearer(a.session));
    assert.equal(ok.status, 200);

    // 1 char alterado no ref legítimo → 404.
    const tampered = refsA[0].opaqueRef.slice(0, -1) + (refsA[0].opaqueRef.at(-1) === "0" ? "1" : "0");
    const tamperedRes = await getBinary(baseUrl, `/portal/v1/owner/photos/${tampered}`, bearer(a.session));
    assert.equal(tamperedRes.status, 404);

    // Ref de B (existente, mas OUTRO processo) usado com a SESSÃO de A → 404 (nunca serve o attachment errado).
    const crossRes = await getBinary(baseUrl, `/portal/v1/owner/photos/${refsB[0].opaqueRef}`, bearer(a.session));
    assert.equal(crossRes.status, 404);

    // Ref de A usado com a SESSÃO de B → 404 (o servidor recompõe pelo processId DA SESSÃO, não do ref).
    const crossRes2 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refsA[0].opaqueRef}`, bearer(b.session));
    assert.equal(crossRes2.status, 404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (5) comparação HMAC sem early-return + caso zero-fotos normalizado (prova estrutural)
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(5) estrutural: o loop de comparação NÃO tem early-return (break/return) e normaliza o caso zero-fotos", async () => {
  const source = await (await import("node:fs/promises")).readFile(
    new URL("../src/modules/owner-portal/owner-portal.service.ts", import.meta.url),
    "utf8",
  );
  const start = source.indexOf("for (const candidate of candidates) {");
  assert.notEqual(start, -1, "loop de recompute do opaqueRef não encontrado");
  const end = source.indexOf("if (candidates.length === 0) {", start);
  assert.notEqual(end, -1);
  const loopBody = source.slice(start, end);
  // Ignora comentários (ex. "// sem break (C4)" é documental, não um `break;` real) — checa só código executável.
  const loopBodyNoComments = loopBody.replace(/\/\/.*$/gm, "");
  assert.equal(/\bbreak\s*;/.test(loopBodyNoComments), false, "o loop NUNCA pode ter break (early-exit) — precisa iterar TODAS as fotos");
  assert.equal(/\breturn\b/.test(loopBodyNoComments), false, "o loop NUNCA pode ter return dentro do corpo (early-exit)");
  assert.match(source, /candidates\.length === 0/, "há um ramo explícito para o caso zero-fotos");
  assert.match(source.slice(end), /dummyExpected/, "o caso zero-fotos faz uma comparação DUMMY para normalizar o timing");
});

test("(5b) integração: processo SEM fotos → 404 uniforme (o caminho zero-fotos não lança nem trava)", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "ZER0F00", renavam: "50505050505" });
  await withApp(service, async (baseUrl) => {
    const res = await getBinary(baseUrl, "/portal/v1/owner/photos/qualquer-coisa-aqui", bearer(seeded.session));
    assert.equal(res.status, 404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (7) marca-d'água presente: resize≤1024 + JPEG válido
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(7) pipeline: saída é JPEG válido, maior lado ≤1024px, e decodifica de volta pelo próprio jimp", async () => {
  const source = await makePngBuffer(1600, 900);
  const result = await minimizePhotoBuffer(source, () => new Date("2026-07-29T12:00:00Z"));
  assert.equal(result.contentType, "image/jpeg");
  // Assinatura JPEG (SOI...EOI).
  assert.equal(result.buffer[0], 0xff);
  assert.equal(result.buffer[1], 0xd8);
  const decoded = await Jimp.read(result.buffer);
  assert.ok(Math.max(decoded.width, decoded.height) <= 1024, `maior lado deve ser <=1024, foi ${Math.max(decoded.width, decoded.height)}`);
  // Aspect ratio preservado (1600:900 = 16:9).
  assert.equal(decoded.width, 1024);
  assert.equal(Math.round((decoded.height / decoded.width) * 100), Math.round((900 / 1600) * 100));
});

test("(7b) integração HTTP: a resposta servida é JPEG≤1024 mesmo para origem PNG grande", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "WMK1W11", renavam: "60606060606" });
  await seedPhoto(seeded.processId, await makePngBuffer(2000, 1000), "image/png");
  await withApp(service, async (baseUrl) => {
    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    const res = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    assert.equal(res.status, 200);
    assert.equal(res.contentType, "image/jpeg");
    const decoded = await Jimp.read(res.buffer);
    assert.ok(Math.max(decoded.width, decoded.height) <= 1024);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (8) §2.8 — log PHOTO_VIEWED sem attachmentId/opaqueRef; resposta/headers sem storageKey/fileUrl
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(8) §2.8: log PHOTO_VIEWED nunca leva attachmentId/opaqueRef; resposta/headers nunca levam storage_key/fileUrl", async () => {
  const { service, accessLog } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "LOG2P22", renavam: "70707070707" });
  await seedPhoto(seeded.processId, await makePngBuffer(100, 80), "image/png");
  let opaqueRef = "";
  let attachmentId = "";
  await withApp(service, async (baseUrl) => {
    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    opaqueRef = refs[0].opaqueRef;
    const res = await getBinary(baseUrl, `/portal/v1/owner/photos/${opaqueRef}`, bearer(seeded.session));
    assert.equal(res.status, 200);
    // Nenhum header expõe storage/local do arquivo.
    const headerBlob = JSON.stringify([...(await fetch(`${baseUrl}/portal/v1/owner/photos/${opaqueRef}`, { headers: bearer(seeded.session) })).headers.entries()]);
    assert.equal(headerBlob.toLowerCase().includes("storage"), false);
    assert.equal(headerBlob.toLowerCase().includes("local://"), false);
  });
  const impound = createMemoryImpoundService();
  const inspection = await impound.getInspection(actor(), seeded.processId);
  attachmentId = inspection.photos[0]?.id ?? "";
  assert.notEqual(attachmentId, "", "seed sanity: precisa ter 1 foto");

  const photoRows = accessLog.readForTests().filter((r) => r.action === "PHOTO_VIEWED");
  assert.ok(photoRows.length >= 1);
  assert.equal(photoRows[0].outcome, "AUTHORIZED");
  assert.equal(photoRows[0].processId, seeded.processId, "AUTHORIZED amarra o process_id (I10) — nunca o attachmentId");
  const blob = JSON.stringify(photoRows);
  assert.equal(blob.includes(attachmentId), false, "attachmentId NUNCA em claro no log");
  assert.equal(blob.includes(opaqueRef), false, "opaqueRef NUNCA em claro no log");
  assert.equal(blob.toLowerCase().includes("storage"), false);
  for (const row of photoRows) {
    assert.deepEqual(
      Object.keys(row).sort(),
      ["action", "createdAt", "id", "ipHash", "occurredAt", "outcome", "portal", "processId", "queryFingerprint", "sessionId", "tenantId", "userAgent"].sort().filter((k) =>
        Object.keys(row).includes(k),
      ),
    );
    // MESMO allowlist do DOSSIER_VIEWED: sem queryFingerprint/sessionId preenchidos nesta ação.
    assert.equal(row.queryFingerprint, undefined);
  }
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// (9) rate-limit DEDICADO de foto (balde ≠ balde do dossiê), número explícito
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("(9) rate-limit dedicado: balde de foto (capacidade 2) estoura independente do balde do dossiê (bem mais folgado)", async () => {
  const { service, accessLog } = buildHarness({ photoBucketCapacity: 2 });
  const seeded = await seedProcessWithSession({ plate: "RAT2E22", renavam: "80808080808" });
  await seedPhoto(seeded.processId, await makePngBuffer(100, 80), "image/png");

  await withApp(service, async (baseUrl) => {
    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    const r1 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    const r2 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    const r3 = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer(seeded.session));
    assert.equal(r1.status, 200);
    assert.equal(r2.status, 200);
    assert.equal(r3.status, 429, "a 3ª leitura de FOTO da mesma sessão+IP estoura o balde DEDICADO (capacidade 2)");

    // O balde do DOSSIÊ continua com folga (1000 no harness) — não é o mesmo balde.
    const dossierRes = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    assert.equal(dossierRes.status, 200, "o dossiê NÃO compartilha o balde estourado da foto (balde dedicado)");
  });
  assert.ok(accessLog.readForTests().some((r) => r.action === "PHOTO_VIEWED" && r.outcome === "RATE_LIMITED"));
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Sessão inválida → 401 uniforme (mesma filosofia dos demais endpoints do portal).
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("sessão ausente/forjada → 401 SESSION_INVALID uniforme no endpoint de foto", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "SES1S11", renavam: "90909090909" });
  await seedPhoto(seeded.processId, await makePngBuffer(80, 60), "image/png");
  await withApp(service, async (baseUrl) => {
    const refs = await fetchOpaqueRefs(baseUrl, seeded.session);
    const noAuth = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`);
    assert.equal(noAuth.status, 401);
    const forged = await getBinary(baseUrl, `/portal/v1/owner/photos/${refs[0].opaqueRef}`, bearer("nao-e-um-token"));
    assert.equal(forged.status, 401);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// Dossiê: `photos` no novo shape {sets:[{opaqueRef,capturedAtLabel}],availabilityLabel}.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("dossiê: photos vira {sets:[{opaqueRef,capturedAtLabel}],availabilityLabel} (nunca setsAvailableCount)", async () => {
  const { service } = buildHarness();
  const seeded = await seedProcessWithSession({ plate: "DTO1D11", renavam: "11122233344" });
  await seedPhoto(seeded.processId, await makePngBuffer(90, 70), "image/png");
  await withApp(service, async (baseUrl) => {
    const res = await getJson(baseUrl, "/portal/v1/owner/dossier", bearer(seeded.session));
    assert.equal(res.status, 200);
    const dossier = JSON.parse(res.text).data as Record<string, unknown>;
    const photos = dossier.photos as { sets: Array<{ opaqueRef: string; capturedAtLabel: string }>; availabilityLabel: string };
    assert.equal(Object.prototype.hasOwnProperty.call(photos, "setsAvailableCount"), false);
    assert.equal(photos.sets.length, 1);
    assert.match(photos.sets[0].opaqueRef, /^[0-9a-f]{64}$/);
    assert.match(photos.sets[0].capturedAtLabel, /^\d{2}\/\d{2}\/\d{4}$/);
    assert.ok(photos.availabilityLabel.length > 0);
    // §2.8: nunca id interno em claro no dossiê.
    assert.equal(res.text.includes("fileUrl"), false);
    assert.equal(res.text.includes("storageKey"), false);
    assert.equal(res.text.includes("storage_key"), false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
// D1 — a rota SÓ existe no ownerRouter isolado; smoke de que createDefaultOwnerPortalService monta corretamente.
// ══════════════════════════════════════════════════════════════════════════════════════════════════════════════
test("D1: wiring default (createDefaultOwnerPortalService) inclui os deps de foto sem lançar", async () => {
  const service = await createDefaultOwnerPortalService();
  assert.ok(service instanceof OwnerPortalService);
});
