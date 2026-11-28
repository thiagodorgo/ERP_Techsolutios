// B-EVIDENCIA-INDICE — F4: as 2 rotas de LEITURA da evidência por OS, EM MEMÓRIA, pela rota real.
// L1 a L10 do plano (§8.3, com o texto de L5 e L7 ajustado pela §E1.8 e a 2ª variante de chave da §E1.6).
// Vermelhos antes, verdes depois: os casos falam com as ROTAS reais
// (GET /api/v1/work-orders/:workOrderId/evidences e .../evidences/:evidenceId/download) e afirmam comportamento.
// Na base as 2 rotas não existem e o app responde o 404 padrão (NOT_FOUND · route_not_found) — cada caso exige o
// status, o código e o reason que o §5.1 prescreve, então nenhum fica verde por construção.
// Repositório PÚBLICO: organizações de teste, e-mails @example.com, sem nome de pessoa nem caminho local.
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import type { Tenant, User } from "../src/modules/core-saas/types/core-saas.types.js";
import { JPEG_BYTES, PNG_BYTES } from "./helpers/upload-fixtures.js";

// O env congela no 1º import de src/; por isso todo import de src/ é dinâmico (molde da F3).
// A LEITURA resolve o provedor pela fábrica da D-014 (`createChecklistStorageProviderByName`), e a ESCRITA usa a
// mesma fábrica quando não há costura: sem costura, os dois apontam para CHECKLIST_STORAGE_LOCAL_DIR — é o que
// permite baixar exatamente o byte que o upload gravou.
const STORAGE_DIR = mkdtempSync(path.join(os.tmpdir(), "evind-leitura-"));
process.env.NODE_ENV = "test";
process.env.LOG_LEVEL = "silent";
process.env.CORE_SAAS_PERSISTENCE = "memory";
process.env.CHECKLIST_STORAGE_PROVIDER = "local";
process.env.CHECKLIST_STORAGE_LOCAL_DIR = STORAGE_DIR;
process.env.CHECKLIST_STORAGE_S3_BUCKET = "";
process.env.CHECKLIST_STORAGE_S3_REGION = "";

const SYNC_ROUTE = "/api/v1/mobile/sync/evidence-actions";
const UPLOAD_ROUTE = "/api/v1/mobile/evidence-uploads";
/** O nome de arquivo que o CLIENTE declarou: nunca pode sair na leitura (§5.3, L6). */
const NOME_DO_CLIENTE = "nome-do-cliente-L6.jpg";
const CAPTURADO_EM = "2026-11-27T12:01:00.000Z";

async function loadModules() {
  const [
    { createApp },
    workOrders,
    fieldDispatch,
    fieldLocation,
    operatorProfiles,
    sync,
    upload,
    evidence,
    scannerFactory,
    { CoreSaasRegistry },
    { MemoryCoreSaasAdapter },
    { InMemoryCoreSaasStore },
  ] = await Promise.all([
    import("../src/app.js"),
    import("../src/modules/work-orders/index.js"),
    import("../src/modules/field-dispatch/index.js"),
    import("../src/modules/field-location/index.js"),
    import("../src/modules/operator-profiles/operator-profile.service.js"),
    import("../src/modules/mobile/mobile-evidence-sync.js"),
    import("../src/modules/mobile/mobile-evidence-upload.js"),
    import("../src/modules/evidence/evidence-storage.js"),
    import("../src/modules/evidence/evidence-scanner.factory.js"),
    import("../src/modules/core-saas/services/core-saas.service.js"),
    import("../src/modules/core-saas/services/memory-core-saas.adapter.js"),
    import("../src/modules/core-saas/store/core-saas.store.js"),
  ]);
  return { createApp, workOrders, fieldDispatch, fieldLocation, operatorProfiles, sync, upload, evidence, scannerFactory, CoreSaasRegistry, MemoryCoreSaasAdapter, InMemoryCoreSaasStore };
}

const M = await loadModules();

// O gancho de limpeza fica DEPOIS do único await de módulo (guard G-ORD-1, como na F3).
after(() => rmSync(STORAGE_DIR, { recursive: true, force: true }));

type Linha = {
  id: string;
  tenantId: string;
  actorUserId: string;
  clientEvidenceId: string;
  scope: string;
  kind: string;
  workOrderId: string | null;
  metadata: Record<string, unknown>;
  fileStatus: string;
  storageProvider: string | null;
  storageKey: string | null;
  createdAt: Date;
  deletedAt: Date | null;
};

type Repositorio = {
  findByClientEvidenceId: (tenantId: string, userId: string, clientEvidenceId: string) => Promise<Linha | undefined>;
  createAccepted: (input: never) => Promise<unknown>;
  markFileStored: (...args: never[]) => Promise<unknown>;
  listByWorkOrder: (tenantId: string, workOrderId: string) => Promise<readonly Linha[]>;
  findByIdForWorkOrder: (tenantId: string, workOrderId: string, id: string) => Promise<Linha | undefined>;
};

type Seed = {
  tenantA: Tenant;
  tenantB: Tenant;
  adminA: User;
  adminB: User;
  techA1: User;
  techA2: User;
  techB1: User;
  estoqueA: User;
};
type Api = { baseUrl: string; seed: Seed };

function repositorio(): Repositorio {
  return M.sync.getMobileEvidenceRepositoryForTests() as unknown as Repositorio;
}

function sha256Hex(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function seedCore(core: InstanceType<typeof M.CoreSaasRegistry>): Seed {
  const modules = ["dashboard", "mobile", "work_orders", "tenant_checklist", "expense_management", "inventory", "notifications", "field_operations"];
  const tenantA = core.createTenant({ name: "Organização Teste A", modules });
  const tenantB = core.createTenant({ name: "Organização Teste B", modules });
  const adminA = core.createUser({ tenantId: tenantA.id, name: "Gestor A", email: "indice-leitura-admin-a@example.com", roles: ["tenant_admin"] });
  const adminB = core.createUser({ tenantId: tenantB.id, name: "Gestor B", email: "indice-leitura-admin-b@example.com", roles: ["tenant_admin"] });
  const techA1 = core.createUser({ tenantId: tenantA.id, name: "Técnico A1", email: "indice-leitura-tech-a1@example.com", roles: ["field_technician"] });
  const techA2 = core.createUser({ tenantId: tenantA.id, name: "Técnico A2", email: "indice-leitura-tech-a2@example.com", roles: ["field_technician"] });
  const techB1 = core.createUser({ tenantId: tenantB.id, name: "Técnico B1", email: "indice-leitura-tech-b1@example.com", roles: ["field_technician"] });
  // L5: papel de tenant SEM `work_orders:read` (o catálogo do `inventory` não tem a chave).
  const estoqueA = core.createUser({ tenantId: tenantA.id, name: "Estoque A", email: "indice-leitura-estoque-a@example.com", roles: ["inventory"] });
  return { tenantA, tenantB, adminA, adminB, techA1, techA2, techB1, estoqueA };
}

async function withApi(callback: (api: Api) => Promise<void>): Promise<void> {
  M.workOrders.resetWorkOrderRuntimeForTests();
  M.fieldDispatch.resetFieldDispatchRuntimeForTests();
  M.sync.resetMobileEvidenceSyncRuntimeForTests();
  M.fieldLocation.resetFieldLocationRuntimeForTests();
  M.operatorProfiles.resetOperatorProfileRuntimeForTests();
  M.evidence.resetEvidenceAuditEventsForTests();
  M.scannerFactory.resetEvidenceScannerForTests();

  const core = new M.CoreSaasRegistry(new M.InMemoryCoreSaasStore());
  const seed = seedCore(core);
  const app = M.createApp(new M.MemoryCoreSaasAdapter(core));
  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  let failure: unknown;
  try {
    await callback({ baseUrl, seed });
  } catch (error) {
    failure = error;
  }
  try {
    M.sync.resetMobileEvidenceSyncRuntimeForTests();
    M.fieldLocation.resetFieldLocationRuntimeForTests();
    M.operatorProfiles.resetOperatorProfileRuntimeForTests();
    M.evidence.resetEvidenceAuditEventsForTests();
    M.scannerFactory.resetEvidenceScannerForTests();
    M.workOrders.resetWorkOrderRuntimeForTests();
    M.fieldDispatch.resetFieldDispatchRuntimeForTests();
  } catch (error) {
    failure ??= error;
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  if (failure !== undefined) throw failure;
}

function cabecalhos(tenant: Tenant, usuario: User | string, papel = "tenant_admin"): Record<string, string> {
  return { "x-tenant-id": tenant.id, "x-user-id": typeof usuario === "string" ? usuario : usuario.id, "x-role": papel };
}

function chaveDe(status: number, body: unknown): string {
  const erro = (body as { error?: { code?: string; reason?: string } } | null)?.error;
  return `${status}:${erro?.code ?? ""}:${erro?.reason ?? ""}`;
}

type RespostaJson = { status: number; body: any; text: string; k: string };

async function pedirJson(baseUrl: string, rota: string, hdrs: Record<string, string>, options: { method?: string; body?: unknown } = {}): Promise<RespostaJson> {
  const response = await fetch(`${baseUrl}${rota}`, {
    method: options.method ?? "GET",
    headers: { ...(options.body === undefined ? {} : { "content-type": "application/json" }), connection: "close", ...hdrs },
    ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = null;
  }
  return { status: response.status, body, text, k: chaveDe(response.status, body) };
}

type RespostaCrua = RespostaJson & { buf: Buffer; contentType: string; disposition: string };

async function pedirCru(baseUrl: string, rota: string, hdrs: Record<string, string>): Promise<RespostaCrua> {
  const response = await fetch(`${baseUrl}${rota}`, { method: "GET", headers: { connection: "close", ...hdrs } });
  const buf = Buffer.from(await response.arrayBuffer());
  let body: any = null;
  try {
    body = JSON.parse(buf.toString("utf8"));
  } catch {
    body = null;
  }
  return {
    status: response.status,
    body,
    text: buf.toString("utf8"),
    k: chaveDe(response.status, body),
    buf,
    contentType: response.headers.get("content-type") ?? "",
    disposition: response.headers.get("content-disposition") ?? "",
  };
}

const rotaLista = (workOrderId: string) => `/api/v1/work-orders/${workOrderId}/evidences`;
const rotaDownload = (workOrderId: string, evidenceId: string) => `/api/v1/work-orders/${workOrderId}/evidences/${evidenceId}/download`;

async function criarOs(api: Api): Promise<string> {
  const criada = await pedirJson(api.baseUrl, "/api/v1/work-orders", cabecalhos(api.seed.tenantA, api.seed.adminA), {
    method: "POST",
    body: { title: "OS da evidência índice (leitura)" },
  });
  assert.equal(criada.status, 201, JSON.stringify(criada.body));
  return criada.body.data.id as string;
}

/** A atribuição que faz o técnico de campo cair no `assigned_only` da porta de leitura (B-WO-LEITURA). */
async function despacharPara(api: Api, workOrderId: string, operatorUserId: string): Promise<void> {
  const despacho = await pedirJson(api.baseUrl, "/api/v1/operations/dispatches", cabecalhos(api.seed.tenantA, api.seed.adminA), {
    method: "POST",
    body: { workOrderId, operatorUserId },
  });
  assert.equal(despacho.status, 201, JSON.stringify(despacho.body));
}

async function syncar(api: Api, tenant: Tenant, userId: string, role: string, actions: Array<Record<string, unknown>>): Promise<RespostaJson> {
  return pedirJson(api.baseUrl, SYNC_ROUTE, cabecalhos(tenant, userId, role), {
    method: "POST",
    body: { client_batch_id: `leitura-lote-${randomUUID()}`, actions },
  });
}

function acaoObservacaoOs(code: string, workOrderId: string, note: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    client_evidence_id: code,
    type: "evidence.work_order_observation",
    local_created_at: CAPTURADO_EM,
    payload: { work_order_id: workOrderId, note, ...extra },
  };
}

function camposDeArquivo(bytes: Buffer, mimeType = "image/png"): Record<string, unknown> {
  return { file_name: NOME_DO_CLIENTE, content_type: mimeType, size_bytes: bytes.length, sha256: sha256Hex(bytes) };
}

function acaoFotoOs(code: string, workOrderId: string, bytes: Buffer = PNG_BYTES): Record<string, unknown> {
  return {
    client_evidence_id: code,
    type: "evidence.work_order_photo",
    local_created_at: CAPTURADO_EM,
    payload: { work_order_id: workOrderId, ...camposDeArquivo(bytes) },
  };
}

function acaoAssinaturaOs(code: string, workOrderId: string, signerName: string, bytes: Buffer = PNG_BYTES): Record<string, unknown> {
  return {
    client_evidence_id: code,
    type: "evidence.work_order_signature",
    local_created_at: CAPTURADO_EM,
    payload: { work_order_id: workOrderId, signer_name: signerName, ...camposDeArquivo(bytes) },
  };
}

async function enviarArquivo(
  api: Api,
  tenant: Tenant,
  userId: string,
  role: string,
  input: { evidenceId: string; clientEvidenceId: string; bytes: Buffer; mimeType?: string },
): Promise<{ status: number; body: any; text: string }> {
  const mimeType = input.mimeType ?? "image/png";
  const form = new FormData();
  form.append("evidence_id", input.evidenceId);
  form.append("client_evidence_id", input.clientEvidenceId);
  form.append("sha256", sha256Hex(input.bytes));
  form.append("size_bytes", String(input.bytes.length));
  form.append("content_type", mimeType);
  form.append("file", new Blob([input.bytes], { type: mimeType }), "arquivo.png");
  const response = await fetch(`${api.baseUrl}${UPLOAD_ROUTE}`, {
    method: "POST",
    headers: { connection: "close", ...cabecalhos(tenant, userId, role) },
    body: form,
  });
  const text = await response.text();
  const parsed = text ? JSON.parse(text) : {};
  return { status: response.status, body: parsed.data ?? parsed, text };
}

async function linha(api: Api, tenant: Tenant, userId: string, code: string): Promise<Linha> {
  const achada = await repositorio().findByClientEvidenceId(tenant.id, userId, code);
  assert.ok(achada, `a linha ${code} existe no repositório`);
  return achada;
}

/** OS-X com as 3 evidências do L1 (observação, assinatura guardada e foto guardada) e A1 atribuído. */
async function prepararOsX(api: Api): Promise<{ workOrderId: string; observacao: Linha; assinatura: Linha; foto: Linha }> {
  const workOrderId = await criarOs(api);
  await despacharPara(api, workOrderId, api.seed.techA1.id);
  const lote = await syncar(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", [
    acaoObservacaoOs("l1-obs", workOrderId, "Portão fechado."),
    acaoAssinaturaOs("l1-sign", workOrderId, "Quem Assinou"),
    acaoFotoOs("l1-photo", workOrderId),
  ]);
  assert.equal(lote.body?.data?.summary?.accepted, 3, JSON.stringify(lote.body));
  const evidenceIdPorCodigo = new Map<string, string>(lote.body.data.accepted.map((item: any) => [item.client_evidence_id, item.evidence_id]));
  for (const code of ["l1-sign", "l1-photo"]) {
    const envio = await enviarArquivo(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", {
      evidenceId: evidenceIdPorCodigo.get(code) as string,
      clientEvidenceId: code,
      bytes: PNG_BYTES,
    });
    assert.equal(envio.status, 201, `setup upload ${code}: ${envio.text}`);
  }
  return {
    workOrderId,
    observacao: await linha(api, api.seed.tenantA, api.seed.adminA.id, "l1-obs"),
    assinatura: await linha(api, api.seed.tenantA, api.seed.adminA.id, "l1-sign"),
    foto: await linha(api, api.seed.tenantA, api.seed.adminA.id, "l1-photo"),
  };
}

function porKind(items: any[], kind: string): any {
  const achados = items.filter((item) => item.kind === kind);
  assert.equal(achados.length, 1, `uma evidência ${kind} na lista: ${JSON.stringify(items)}`);
  return achados[0];
}

/**
 * L7 — a costura que adultera a chave da linha DIRETO no repositório (§8.3 L7). O repositório real continua por
 * baixo; só a chave lida é trocada, exatamente como ficaria uma linha gravada com a chave de outra organização.
 */
function repositorioComChaveAdulterada(chave: string): Repositorio {
  const interno = repositorio();
  const trocar = (registro: Linha | undefined): Linha | undefined => (registro ? ({ ...registro, storageKey: chave } as Linha) : registro);
  return {
    findByClientEvidenceId: (tenantId, userId, code) => interno.findByClientEvidenceId(tenantId, userId, code),
    createAccepted: (input) => interno.createAccepted(input),
    markFileStored: (...args) => interno.markFileStored(...args),
    listByWorkOrder: async (tenantId, workOrderId) => (await interno.listByWorkOrder(tenantId, workOrderId)).map((registro) => trocar(registro) as Linha),
    findByIdForWorkOrder: async (tenantId, workOrderId, id) => trocar(await interno.findByIdForWorkOrder(tenantId, workOrderId, id)),
  };
}

/** Grava um objeto REAL sob um prefixo escolhido, com bytes próprios: se o guard falhar, é ele que sai. */
function gravarObjeto(chaveRelativa: string, bytes: Buffer): void {
  const absoluto = path.join(STORAGE_DIR, ...chaveRelativa.split("/"));
  mkdirSync(path.dirname(absoluto), { recursive: true });
  writeFileSync(absoluto, bytes);
}

// ════════════════════════════════════════════════════════════════════════════════════════════════
// L1 a L10
// ════════════════════════════════════════════════════════════════════════════════════════════════

test("L1 — gestor lista a OS-X: 200 com as 3 evidências e note, signerName, capturedAt, createdByName e file certos", async () => {
  await withApi(async (api) => {
    const { workOrderId, observacao, assinatura, foto } = await prepararOsX(api);
    const resposta = await pedirJson(api.baseUrl, rotaLista(workOrderId), cabecalhos(api.seed.tenantA, api.seed.adminA));
    assert.equal(resposta.status, 200, resposta.text);
    const items = resposta.body.data.items;
    assert.equal(items.length, 3, JSON.stringify(items));

    const obs = porKind(items, "observation");
    assert.equal(obs.id, observacao.id);
    assert.equal(obs.workOrderId, workOrderId);
    assert.equal(obs.note, "Portão fechado.");
    assert.equal(obs.signerName, null);
    assert.equal(obs.capturedAt, CAPTURADO_EM);
    assert.equal(obs.createdBy, api.seed.adminA.id);
    assert.equal(obs.createdByName, "Gestor A");
    assert.equal(obs.file, null, "a observação não tem arquivo");

    const sign = porKind(items, "signature");
    assert.equal(sign.id, assinatura.id);
    assert.equal(sign.signerName, "Quem Assinou");
    assert.equal(sign.note, null);
    assert.equal(sign.createdByName, "Gestor A");
    assert.deepEqual(sign.file, {
      status: "stored",
      mimeType: "image/png",
      sizeBytes: PNG_BYTES.length,
      downloadPath: rotaDownload(workOrderId, assinatura.id),
    });

    const photo = porKind(items, "photo");
    assert.equal(photo.id, foto.id);
    assert.equal(photo.note, null);
    assert.equal(photo.signerName, null);
    assert.equal(photo.capturedAt, CAPTURADO_EM);
    assert.deepEqual(photo.file, {
      status: "stored",
      mimeType: "image/png",
      sizeBytes: PNG_BYTES.length,
      downloadPath: rotaDownload(workOrderId, foto.id),
    });
  });
});

test("L2 — A1 (atribuído) lista e baixa: 200 nos dois e os bytes baixados são os enviados", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantA, api.seed.techA1, "field_technician");
    const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    assert.equal(lista.status, 200, lista.text);
    assert.equal(lista.body.data.items.length, 3);

    const download = await pedirCru(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
    assert.equal(download.status, 200, download.text);
    assert.equal(download.buf.equals(PNG_BYTES), true, "os bytes baixados são os enviados");
    assert.equal(download.contentType.startsWith("image/png"), true, `o tipo vem dos bytes: ${download.contentType}`);
    assert.equal(download.disposition.startsWith("attachment"), true, `sempre attachment: ${download.disposition}`);
  });
});

test("L3 — A2 (não atribuído) lista e baixa a OS-X: o MESMO status, código e reason de um UUID aleatório", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantA, api.seed.techA2, "field_technician");
    const osAleatoria = randomUUID();

    const listaAlheia = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    const listaInexistente = await pedirJson(api.baseUrl, rotaLista(osAleatoria), hdrs);
    assert.equal(listaAlheia.status, 404, listaAlheia.text);
    assert.equal(listaAlheia.k, listaInexistente.k, "a OS alheia responde exatamente o que a inexistente responde");
    assert.equal(listaAlheia.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${listaAlheia.k}`);

    const downloadAlheio = await pedirJson(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
    const downloadInexistente = await pedirJson(api.baseUrl, rotaDownload(osAleatoria, randomUUID()), hdrs);
    assert.equal(downloadAlheio.status, 404, downloadAlheio.text);
    assert.equal(downloadAlheio.k, downloadInexistente.k);
    assert.equal(downloadAlheio.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${downloadAlheio.k}`);
  });
});

test("L4 — usuário da organização B com work_orders:read usa os ids da A: 404 igual ao inexistente", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantB, api.seed.adminB);

    const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    const listaInexistente = await pedirJson(api.baseUrl, rotaLista(randomUUID()), hdrs);
    assert.equal(lista.status, 404, lista.text);
    assert.equal(lista.k, listaInexistente.k);
    assert.equal(lista.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${lista.k}`);

    // O id da evidência é VÁLIDO (existe na organização A): mesmo assim, 404 de OS, igual ao inexistente.
    const download = await pedirJson(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
    const downloadInexistente = await pedirJson(api.baseUrl, rotaDownload(randomUUID(), randomUUID()), hdrs);
    assert.equal(download.status, 404, download.text);
    assert.equal(download.k, downloadInexistente.k);
    assert.equal(download.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${download.k}`);

    // O técnico de B, com os mesmos ids da A, também não vê nada.
    const listaTecnicoB = await pedirJson(api.baseUrl, rotaLista(workOrderId), cabecalhos(api.seed.tenantB, api.seed.techB1, "field_technician"));
    assert.equal(listaTecnicoB.k, listaInexistente.k);
  });
});

test("L5 — ator sem work_orders:read: 403 de permissão nas DUAS rotas, antes de qualquer leitura", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantA, api.seed.estoqueA, "inventory");
    const osAleatoria = randomUUID();

    const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    assert.equal(lista.status, 403, lista.text);
    assert.equal(lista.k, "403:FORBIDDEN:permission_required", `§5.1: ${lista.k}`);
    // "antes de qualquer leitura": a OS existente e a inexistente respondem IDÊNTICAS — a porta de permissão
    // vem antes da porta da OS, então nada sobre a existência da OS vaza.
    assert.equal(lista.k, (await pedirJson(api.baseUrl, rotaLista(osAleatoria), hdrs)).k);

    const download = await pedirJson(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
    assert.equal(download.status, 403, download.text);
    assert.equal(download.k, "403:FORBIDDEN:permission_required", `§5.1: ${download.k}`);
    assert.equal(download.k, (await pedirJson(api.baseUrl, rotaDownload(osAleatoria, randomUUID()), hdrs)).k);
  });
});

test("L6 — allowlist positiva do corpo da lista: só os campos do §5.3, nada de chave, provedor, organização ou nome do cliente", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const resposta = await pedirJson(api.baseUrl, rotaLista(workOrderId), cabecalhos(api.seed.tenantA, api.seed.adminA));
    assert.equal(resposta.status, 200, resposta.text);
    const items = resposta.body.data.items as any[];
    assert.equal(items.length, 3);

    // Allowlist POSITIVA: o conjunto exato de chaves por item (é o que mata a MU9 — espalhar a linha inteira).
    const chavesDoItem = ["capturedAt", "createdAt", "createdBy", "createdByName", "file", "id", "kind", "note", "signerName", "workOrderId"].sort();
    const chavesDoArquivo = ["downloadPath", "mimeType", "sizeBytes", "status"].sort();
    for (const item of items) {
      assert.deepEqual(Object.keys(item).sort(), chavesDoItem, `chaves do item: ${JSON.stringify(Object.keys(item))}`);
      if (item.file !== null) assert.deepEqual(Object.keys(item.file).sort(), chavesDoArquivo, `chaves do file: ${JSON.stringify(Object.keys(item.file))}`);
    }

    const texto = JSON.stringify(resposta.body);
    const proibidos = [
      "storage_key",
      "storageKey",
      "storage_provider",
      "storageProvider",
      "checksum",
      "file_id",
      "fileId",
      "fingerprint",
      "tenant_id",
      "tenantId",
      "evidence:",
      "client_evidence_id",
      "clientEvidenceId",
      "deleted_at",
      "deletedAt",
      "bucket",
      "metadata",
      "action_type",
      "actionType",
      "mobile-evidence-wo",
      NOME_DO_CLIENTE,
      foto.storageKey as string,
      api.seed.tenantA.id,
    ];
    for (const proibido of proibidos) {
      assert.equal(texto.includes(proibido), false, `a lista expõe ${proibido}: ${texto}`);
    }
    // O caminho de download é o da rota do §5.1, montado com os dois ids — nunca a chave do objeto.
    assert.equal(texto.includes(rotaDownload(workOrderId, foto.id)), true, texto);
  });
});

test("L7 — chave adulterada para o prefixo da organização B: download 404 evidence_file_not_found e 0 leitura do objeto de B", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    // Objetos REAIS no prefixo de B, com bytes DIFERENTES dos de A: se o guard sair da frente, são eles que vêm.
    const bytesDeB = JPEG_BYTES;
    const variantes = [
      // 1ª variante: a organização B no 1º segmento (a forma que o CHECK do banco já recusa).
      `${api.seed.tenantB.id}/mobile-evidence-wo-${workOrderId}/alheio-simples.jpg`,
      // 2ª variante (§E1.6, o residual declarado): a organização da linha como 2º segmento, sob o prefixo de B.
      `${api.seed.tenantB.id}/${api.seed.tenantA.id}/mobile-evidence-wo-${workOrderId}/alheio-aninhado.jpg`,
    ];
    for (const chave of variantes) gravarObjeto(chave, bytesDeB);

    const hdrs = cabecalhos(api.seed.tenantA, api.seed.adminA);
    for (const chave of variantes) {
      M.sync.setMobileEvidenceRepositoryForTests(repositorioComChaveAdulterada(chave) as never);
      try {
        const download = await pedirCru(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
        assert.equal(download.status, 404, `chave ${chave}: ${download.text}`);
        assert.equal(download.k, "404:WORK_ORDER_EVIDENCE_NOT_FOUND:evidence_file_not_found", `chave ${chave}: ${download.k}`);
        assert.equal(download.buf.equals(bytesDeB), false, `chave ${chave}: o objeto da organização B foi lido`);
        assert.equal(download.text.includes(chave), false, `chave ${chave}: o corpo revela a chave`);
        // A lista segue 200 (a adulteração é da chave, não da linha) e continua sem a chave.
        const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
        assert.equal(lista.status, 200, lista.text);
        assert.equal(JSON.stringify(lista.body).includes(chave), false, `chave ${chave}: a lista expõe a chave`);
      } finally {
        M.sync.setMobileEvidenceRepositoryForTests(undefined);
      }
    }
  });
});

test("L8 — download de observação: 404 evidence_file_not_found; download de awaiting_file: 409 evidence_file_not_ready", async () => {
  await withApi(async (api) => {
    const { workOrderId, observacao } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantA, api.seed.adminA);

    const semArquivo = await pedirJson(api.baseUrl, rotaDownload(workOrderId, observacao.id), hdrs);
    assert.equal(semArquivo.status, 404, semArquivo.text);
    assert.equal(semArquivo.k, "404:WORK_ORDER_EVIDENCE_NOT_FOUND:evidence_file_not_found", `§5.1: ${semArquivo.k}`);

    // Uma foto sincronizada e AINDA sem o binário: a linha existe, o arquivo não.
    const pendente = await syncar(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", [acaoFotoOs("l8-awaiting", workOrderId)]);
    assert.equal(pendente.body?.data?.summary?.accepted, 1, JSON.stringify(pendente.body));
    const linhaPendente = await linha(api, api.seed.tenantA, api.seed.adminA.id, "l8-awaiting");
    assert.equal(linhaPendente.fileStatus, "awaiting_file");

    const naoPronto = await pedirJson(api.baseUrl, rotaDownload(workOrderId, linhaPendente.id), hdrs);
    assert.equal(naoPronto.status, 409, naoPronto.text);
    assert.equal(naoPronto.k, "409:WORK_ORDER_EVIDENCE_NOT_READY:evidence_file_not_ready", `§5.1 (molde attachment_not_ready): ${naoPronto.k}`);

    // E o `file` da linha pendente sai sem tipo nem tamanho (§5.3: só quando stored).
    const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    assert.equal(lista.status, 200, lista.text);
    const item = lista.body.data.items.find((candidate: any) => candidate.id === linhaPendente.id);
    assert.deepEqual(item.file, {
      status: "awaiting_file",
      mimeType: null,
      sizeBytes: null,
      downloadPath: rotaDownload(workOrderId, linhaPendente.id),
    });
  });
});

test("L9 — position: presente para quem tem field_location:read, campo AUSENTE para quem não tem, 200 nos dois", async () => {
  await withApi(async (api) => {
    const workOrderId = await criarOs(api);
    await despacharPara(api, workOrderId, api.seed.techA1.id);

    // O gps só entra no metadata com consentimento de rastreamento do autor (§4.2): perfil de operador do autor.
    const autor = randomUUID();
    const perfil = await pedirJson(api.baseUrl, "/api/v1/operator-profiles", cabecalhos(api.seed.tenantA, api.seed.adminA), {
      method: "POST",
      body: { user_id: autor, tracking_consent: true },
    });
    assert.equal(perfil.status, 201, JSON.stringify(perfil.body));
    const gps = { lat: -23.55052, lng: -46.633308, accuracy_m: 12 };
    const lote = await syncar(api, api.seed.tenantA, autor, "tenant_admin", [acaoObservacaoOs("l9-gps", workOrderId, "Com posição.", { gps })]);
    assert.equal(lote.body?.data?.summary?.accepted, 1, JSON.stringify(lote.body));
    const registro = await linha(api, api.seed.tenantA, autor, "l9-gps");
    assert.deepEqual(registro.metadata.gps, gps, "setup: o consentimento deixou o gps entrar");

    // COM field_location:read (tenant_admin tem o catálogo inteiro menos as platform:).
    const comPermissao = await pedirJson(api.baseUrl, rotaLista(workOrderId), cabecalhos(api.seed.tenantA, api.seed.adminA));
    assert.equal(comPermissao.status, 200, comPermissao.text);
    const itemCom = comPermissao.body.data.items.find((candidate: any) => candidate.id === registro.id);
    assert.deepEqual(itemCom.position, { lat: gps.lat, lng: gps.lng, accuracyM: gps.accuracy_m }, "§5.3: position");

    // SEM field_location:read (field_technician atribuído): 200 e o campo AUSENTE (não nulo).
    const semPermissao = await pedirJson(api.baseUrl, rotaLista(workOrderId), cabecalhos(api.seed.tenantA, api.seed.techA1, "field_technician"));
    assert.equal(semPermissao.status, 200, semPermissao.text);
    const itemSem = semPermissao.body.data.items.find((candidate: any) => candidate.id === registro.id);
    assert.ok(itemSem, "o técnico atribuído vê a evidência");
    assert.equal("position" in itemSem, false, "o campo some sem a permissão: " + JSON.stringify(itemSem));
    assert.equal(JSON.stringify(semPermissao.body).includes("-23.55052"), false, "a posição não vaza por outro campo");
  });
});

test("L10 — evidência field e evidência com deleted_at não aparecem na lista de OS nenhuma; download 404", async () => {
  await withApi(async (api) => {
    const { workOrderId, foto } = await prepararOsX(api);
    const hdrs = cabecalhos(api.seed.tenantA, api.seed.adminA);

    // (a) evidência de escopo FIELD cujo `work_order_id` é só rótulo livre do app (F5): a coluna fica nula.
    const campo = await syncar(api, api.seed.tenantA, api.seed.adminA.id, "tenant_admin", [
      {
        client_evidence_id: "l10-field",
        type: "evidence.field_observation",
        local_created_at: CAPTURADO_EM,
        payload: { note: "Observação de campo.", work_order_id: workOrderId },
      },
    ]);
    assert.equal(campo.body?.data?.summary?.accepted, 1, JSON.stringify(campo.body));
    const linhaCampo = await linha(api, api.seed.tenantA, api.seed.adminA.id, "l10-field");
    assert.equal(linhaCampo.scope, "field");
    assert.equal(linhaCampo.workOrderId, null, "setup: a coluna work_order_id fica nula no escopo field");

    const lista = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    assert.equal(lista.status, 200, lista.text);
    const ids = (lista.body.data.items as any[]).map((item) => item.id);
    assert.equal(ids.includes(linhaCampo.id), false, "a evidência field não aparece na lista de OS nenhuma");
    assert.equal(ids.length, 3, "só as 3 da OS-X: " + JSON.stringify(ids));
    const downloadCampo = await pedirJson(api.baseUrl, rotaDownload(workOrderId, linhaCampo.id), hdrs);
    assert.equal(downloadCampo.status, 404, downloadCampo.text);
    assert.equal(downloadCampo.k, "404:WORK_ORDER_EVIDENCE_NOT_FOUND:evidence_not_found", "§5.1: " + downloadCampo.k);
    // Não há rota de leitura para a evidência field (§5.3): o caminho nem existe.
    const rotaField = await pedirJson(api.baseUrl, "/api/v1/mobile/evidences", hdrs);
    assert.equal(rotaField.k, "404:NOT_FOUND:route_not_found", "§5.3: " + rotaField.k);

    // (b) delete lógico direto no repositório (costura de teste): some da lista e o download dá 404.
    const marcar = (repositorio() as unknown as { setDeletedAtForTests?: unknown }).setDeletedAtForTests;
    assert.equal(typeof marcar, "function", "a costura de delete lógico do repositório em memória deve existir (L10 mata a MU17)");
    const excluida = (repositorio() as any).setDeletedAtForTests(api.seed.tenantA.id, api.seed.adminA.id, "l1-photo", new Date()) as boolean;
    assert.equal(excluida, true, "setup: a linha da foto foi marcada como excluída");

    const listaFinal = await pedirJson(api.baseUrl, rotaLista(workOrderId), hdrs);
    assert.equal(listaFinal.status, 200, listaFinal.text);
    const idsFinais = (listaFinal.body.data.items as any[]).map((item) => item.id);
    assert.equal(idsFinais.includes(foto.id), false, "a linha com deleted_at não aparece na lista");
    assert.equal(idsFinais.length, 2, "sobram a observação e a assinatura: " + JSON.stringify(idsFinais));
    const downloadExcluida = await pedirJson(api.baseUrl, rotaDownload(workOrderId, foto.id), hdrs);
    assert.equal(downloadExcluida.status, 404, downloadExcluida.text);
    assert.equal(downloadExcluida.k, "404:WORK_ORDER_EVIDENCE_NOT_FOUND:evidence_not_found", "§5.1: " + downloadExcluida.k);
  });
});
