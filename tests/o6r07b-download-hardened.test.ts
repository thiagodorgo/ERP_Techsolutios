import assert from "node:assert/strict";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Readable } from "node:stream";
import test from "node:test";

import express from "express";

import {
  buildContentDisposition,
  sendVerifiedFile,
} from "../src/modules/evidence/serve-verified-file.js";
import { isStorageKeyWithinTenant } from "../src/modules/evidence/storage-key-scope.js";
import { EMPTY_BYTES, HTML_BYTES, JPEG_BYTES, MZ_BYTES, PDF_BYTES, PNG_BYTES } from "./helpers/upload-fixtures.js";

// B-O6R-07b (Ω6R-SEC-004) · §6.4 do plano + EMENDA E1·10 — aceites do EGRESSO (D1–D6) e do guard de
// prefixo de tenant (T1–T10).
//
// PARTE 1 (D1–D6) roda contra um app express MÍNIMO, sem helmet e sem os routers do produto. Isso é
// deliberado e é o que torna D6 um teste PERMANENTE em vez de uma mutação de sessão: se `nosniff` só
// aparecesse por causa do helmet global, ele sumiria aqui. O plano previa D6 como mutação temporária em
// `app.ts` (que nunca entraria no diff); esta forma prova a MESMA propriedade — cinto e suspensório —
// e fica no repositório.
//
// PARTE 2 (T1–T10) exercita `isStorageKeyWithinTenant`, a decisão que os 4 resolvers passam a tomar
// antes de qualquer `getObject`. Os casos EM ROTA dos 4 resolvers vivem em
// `tests/o6r07b-mime-sniff-routes.test.ts` (D1 por rota) e, para E5, em `tests/owner-portal-photos.test.ts`.
//
// VERMELHO-CONTROLE na base `e55245a`: `serve-verified-file.ts` e `storage-key-scope.ts` NÃO EXISTEM —
// os 4 routers respondiam `Content-Type` da linha + `inline`, e nenhum resolver conferia o prefixo de
// tenant. Todo teste deste arquivo falha por ausência de módulo.

// ══════════════════════════════════════════════════════════════════════════════════════════════════
// PARTE 1 — D1–D6: o que sai da rota de arquivo
// ══════════════════════════════════════════════════════════════════════════════════════════════════

type ServedFile = { body: Buffer | Readable; fileName: string; sizeBytes?: number };

async function serve(file: ServedFile): Promise<{ status: number; headers: Headers; body: Buffer }> {
  const app = express();
  // SEM helmet, SEM os routers do produto: o que aparecer nos headers foi o helper que pôs.
  app.get("/f", (_request, response) => {
    response.status(200);
    void sendVerifiedFile(response, file);
  });
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  try {
    const response = await fetch(`http://127.0.0.1:${port}/f`);
    const body = Buffer.from(await response.arrayBuffer());
    return { status: response.status, headers: response.headers, body };
  } finally {
    await closeServer(server);
  }
}

test("D1 egresso: PNG → content-type dos BYTES, attachment, nosniff, corpo byte-idêntico, content-length", async () => {
  const served = await serve({ body: PNG_BYTES, fileName: "foto.png", sizeBytes: PNG_BYTES.length });
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/png");
  assert.equal(served.headers.get("content-disposition")?.startsWith("attachment;"), true);
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.equal(served.headers.get("content-length"), String(PNG_BYTES.length));
  assert.deepEqual(served.body, PNG_BYTES);
});

test("D1b egresso: `inline` NUNCA aparece — attachment para TODOS os tipos, imagem verificada inclusive", async () => {
  for (const [bytes, expected] of [
    [PNG_BYTES, "image/png"],
    [JPEG_BYTES, "image/jpeg"],
    [PDF_BYTES, "application/pdf"],
  ] as const) {
    const served = await serve({ body: bytes, fileName: "arquivo.bin" });
    assert.equal(served.headers.get("content-type"), expected);
    assert.equal(served.headers.get("content-disposition")?.includes("inline"), false);
    assert.equal(served.headers.get("content-disposition")?.startsWith("attachment;"), true);
  }
});

test("D2 egresso: o tipo NÃO pode vir da linha — o helper nem recebe mimeType (prova estrutural)", async () => {
  // O mecanismo (3) do achado era `Content-Type: result.file.mimeType`, e esse `mimeType` vinha da
  // coluna (no provider local o `getObject` nem devolve tipo). `VerifiedFileToSend` não tem campo de
  // tipo NENHUM: não há por onde uma linha mentirosa alcançar o header. Aqui, bytes PNG entregues com
  // um nome que grita "html" saem como image/png.
  const served = await serve({ body: PNG_BYTES, fileName: "pagina.html" });
  assert.equal(served.headers.get("content-type"), "image/png");
});

test("D3 egresso: bytes SEM assinatura (legado, MZ, HTML) → application/octet-stream + attachment", async () => {
  for (const bytes of [MZ_BYTES, HTML_BYTES, Buffer.from("bytes legados sem assinatura")]) {
    const served = await serve({ body: bytes, fileName: "legado.png" });
    assert.equal(served.headers.get("content-type"), "application/octet-stream");
    assert.equal(served.headers.get("content-disposition")?.startsWith("attachment;"), true);
    assert.equal(served.headers.get("x-content-type-options"), "nosniff");
    assert.deepEqual(served.body, bytes);
  }
});

test("D4 egresso: nome com aspas, barra invertida, CR/LF, acento e emoji → header seguro e sem injeção", async () => {
  const hostile = 'rela"tório\\..\\..\\caçamba\r\nX-Injetado: sim\u0000 🚚.png';
  const served = await serve({ body: PNG_BYTES, fileName: hostile });
  const disposition = served.headers.get("content-disposition") ?? "";
  assert.equal(disposition.startsWith("attachment;"), true);
  assert.equal(served.headers.get("x-injetado"), null, "nenhum header foi injetado pelo nome");
  assert.equal(/[\r\n\u0000]/.test(disposition), false, "CR/LF/NUL nunca alcançam o header");
  const quoted = /filename="([^"]*)"/.exec(disposition)?.[1] ?? "";
  assert.equal(/["\\%]/.test(quoted), false, "nenhum quoted-pair emitido (RFC 6266 Ap. D)");
  assert.equal(quoted.includes("/") || quoted.includes("\\"), false, "path stripping");
  assert.ok(disposition.includes("filename*=UTF-8''"), "o nome íntegro vai no filename*");
  const indexOfFilename = disposition.indexOf('filename="');
  const indexOfExtended = disposition.indexOf("filename*=");
  assert.ok(indexOfFilename < indexOfExtended, "filename ANTES de filename* (RFC 6266 Apêndice D)");
});

test("D4b buildContentDisposition: nome 100% não-ASCII vira `arquivo.<ext>`, nunca `?`", () => {
  const disposition = buildContentDisposition("🚚📸.png");
  assert.ok(disposition.includes('filename="arquivo.png"'), disposition);
  assert.equal(disposition.includes("?"), false, "`?` é reservado em nome de arquivo no Windows");
  assert.ok(disposition.includes("filename*=UTF-8''"));
});

test("D4b-2 buildContentDisposition: nome SÓ de emoji (sem extensão) vira `arquivo`", () => {
  const disposition = buildContentDisposition("🚚📸");
  assert.ok(disposition.includes('filename="arquivo"'), disposition);
  assert.ok(disposition.includes("filename*=UTF-8''"));
});

test("D4c buildContentDisposition: nome reservado do Windows e nome vazio caem no genérico", () => {
  assert.ok(buildContentDisposition("CON.png").includes('filename="arquivo.png"'));
  assert.ok(buildContentDisposition("...").includes('filename="arquivo"'));
  assert.ok(buildContentDisposition("").includes('filename="arquivo"'));
});

test("D4d buildContentDisposition: `' ( ) *` são percent-encodados no filename* (não são attr-char)", () => {
  // `encodeURIComponent` deixa esses quatro CRUS e eles NÃO são `attr-char` do RFC 8187. É a armadilha
  // de JS que a PD-O6R-B07B-DISPOSITION mediu.
  const disposition = buildContentDisposition("a'b(c)d*e.png");
  const extended = disposition.split("filename*=UTF-8''")[1] ?? "";
  for (const char of ["'", "(", ")", "*"]) {
    assert.equal(extended.includes(char), false, `${char} tinha de estar percent-encodado: ${extended}`);
  }
  assert.ok(extended.includes("%27") && extended.includes("%28") && extended.includes("%29") && extended.includes("%2A"));
});

test("D5 egresso: corpo em FLUXO de 0 B, 5 B, 32 B e 10 MB sai byte-idêntico", async () => {
  const cases: readonly Buffer[] = [
    EMPTY_BYTES,
    Buffer.from("12345"),
    PNG_BYTES.subarray(0, 32), // exatamente 32 B: a cabeca de 14 sai e ainda sobra corpo para o pipe
    Buffer.concat([PNG_BYTES, Buffer.alloc(10 * 1024 * 1024 - PNG_BYTES.length, 0x42)]),
  ];
  for (const bytes of cases) {
    const served = await serve({ body: Readable.from([bytes]), fileName: "fluxo.bin", sizeBytes: bytes.length });
    assert.equal(served.body.length, bytes.length, `tamanho divergiu em ${bytes.length} B`);
    assert.deepEqual(served.body, bytes, `corpo divergiu em ${bytes.length} B`);
  }
});

test("D5b egresso: fluxo em MUITOS pedaços pequenos (a cabeça atravessa vários chunks) sai íntegro", async () => {
  const chunks = [PNG_BYTES.subarray(0, 3), PNG_BYTES.subarray(3, 6), PNG_BYTES.subarray(6), Buffer.from("cauda")];
  const expected = Buffer.concat(chunks);
  const served = await serve({ body: Readable.from(chunks), fileName: "picotado.png", sizeBytes: expected.length });
  assert.deepEqual(served.body, expected);
  assert.equal(served.headers.get("content-type"), "image/png");
});

test("D5c egresso: fluxo de 0 B → octet-stream (não há assinatura para reconhecer)", async () => {
  const served = await serve({ body: Readable.from([]), fileName: "vazio.png", sizeBytes: 0 });
  assert.equal(served.headers.get("content-type"), "application/octet-stream");
  assert.equal(served.body.length, 0);
});

test("D6 egresso: `nosniff` vem do HELPER, não do helmet — este app não tem helmet nenhum", async () => {
  // É o cinto-e-suspensório do §3.5: garantia que só existe numa composição de middleware é garantia
  // que não se testa por resposta. MUTAÇÃO QUE DERRUBA: remover o `setHeader("X-Content-Type-Options")`
  // do helper → aqui fica `null` (e em produção continuaria verde pelo helmet, que é o verde-cego).
  const served = await serve({ body: PNG_BYTES, fileName: "foto.png" });
  assert.equal(served.headers.get("x-content-type-options"), "nosniff");
  assert.equal(served.headers.get("content-security-policy"), "default-src 'none'; sandbox allow-downloads");
  assert.equal(served.headers.get("cross-origin-resource-policy"), "same-origin");
  assert.equal(served.headers.get("cache-control"), "private, no-store");
});

test("D6b egresso: o CSP sandbox leva `allow-downloads` — sandbox pelado BLOQUEIA o download", async () => {
  const served = await serve({ body: PNG_BYTES, fileName: "foto.png" });
  const csp = served.headers.get("content-security-policy") ?? "";
  assert.ok(csp.includes("sandbox allow-downloads"), csp);
});

// ══════════════════════════════════════════════════════════════════════════════════════════════════
// PARTE 2 — T1–T10: a chave de storage tem de ficar dentro do tenant DA LINHA
// ══════════════════════════════════════════════════════════════════════════════════════════════════

const TENANT_A = "11111111-1111-1111-1111-111111111111";
const TENANT_B = "22222222-2222-2222-2222-222222222222";

test("T1 guard: chave de OUTRO tenant é recusada (local)", () => {
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_B}/run-1/obj.png`, tenantId: TENANT_A, provider: "local" }),
    false,
  );
});

test("T2 guard: chave do PRÓPRIO tenant é aceita (local, 3 segmentos)", () => {
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_A}/run-1/obj.png`, tenantId: TENANT_A, provider: "local" }),
    true,
  );
});

test("T3 guard: a via V2 usa 4 segmentos (`tenant/entityType/entityId/obj`) e continua válida", () => {
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_A}/damage/${TENANT_B}/obj.png`, tenantId: TENANT_A, provider: "local" }),
    true,
    "o tenant é o PRIMEIRO segmento; o resto da chave não decide nada",
  );
});

test("T4 guard: prefixo que apenas COMEÇA com o tenant não passa (nada de match por string)", () => {
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_A}-outro/run/obj.png`, tenantId: TENANT_A, provider: "local" }),
    false,
  );
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_A}x/run/obj.png`, tenantId: TENANT_A, provider: "local" }),
    false,
  );
});

test("T5 guard: chave vazia, só barras, ou relativa (`../`) é recusada", () => {
  for (const storageKey of ["", "/", "///", "../outside.png", `../${TENANT_A}/obj.png`]) {
    assert.equal(
      isStorageKeyWithinTenant({ storageKey, tenantId: TENANT_A, provider: "local" }),
      false,
      `chave ${JSON.stringify(storageKey)}`,
    );
  }
});

test("T6 guard: tenant vazio nunca autoriza nada", () => {
  assert.equal(isStorageKeyWithinTenant({ storageKey: "x/y/z", tenantId: "", provider: "local" }), false);
  assert.equal(isStorageKeyWithinTenant({ storageKey: "x/y/z", tenantId: "   ", provider: "local" }), false);
});

test("T7 guard: no provider LOCAL não há prefixo — chave prefixada é recusada", () => {
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `p/q/${TENANT_A}/run/obj.png`, tenantId: TENANT_A, provider: "local" }),
    false,
  );
});

test("T8 guard: chave que aponta para a RAIZ do outro tenant (sem objeto) também é recusada", () => {
  assert.equal(isStorageKeyWithinTenant({ storageKey: TENANT_B, tenantId: TENANT_A, provider: "local" }), false);
  assert.equal(
    isStorageKeyWithinTenant({ storageKey: `${TENANT_B}/`, tenantId: TENANT_A, provider: "local" }),
    false,
  );
});

test("T10 guard: no S3 o prefixo configurado é descontado antes de conferir o tenant", async () => {
  const previous = process.env.CHECKLIST_STORAGE_S3_PREFIX;
  process.env.CHECKLIST_STORAGE_S3_PREFIX = "p/q";
  try {
    // O `env` congela no primeiro import, então o valor efetivo é o do snapshot. Este caso mede o
    // comportamento com o prefixo VIGENTE, qualquer que seja ele — o que importa é a propriedade:
    // com prefixo, a chave prefixada do PRÓPRIO tenant passa; a do OUTRO, não.
    const { env } = await import("../src/config/env.js");
    const prefix = env.CHECKLIST_STORAGE_S3_PREFIX.split("/").filter(Boolean).join("/");
    const own = prefix ? `${prefix}/${TENANT_A}/run/obj.png` : `${TENANT_A}/run/obj.png`;
    const alien = prefix ? `${prefix}/${TENANT_B}/run/obj.png` : `${TENANT_B}/run/obj.png`;
    assert.equal(isStorageKeyWithinTenant({ storageKey: own, tenantId: TENANT_A, provider: "s3" }), true, own);
    assert.equal(isStorageKeyWithinTenant({ storageKey: alien, tenantId: TENANT_A, provider: "s3" }), false, alien);
    // E a chave SEM o prefixo vigente também passa (o guard aceita o tenant no primeiro segmento).
    assert.equal(
      isStorageKeyWithinTenant({ storageKey: `${TENANT_A}/run/obj.png`, tenantId: TENANT_A, provider: "s3" }),
      true,
    );
  } finally {
    if (previous === undefined) delete process.env.CHECKLIST_STORAGE_S3_PREFIX;
    else process.env.CHECKLIST_STORAGE_S3_PREFIX = previous;
  }
});

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
}
