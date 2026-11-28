import "dotenv/config";

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test, { after } from "node:test";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";
import { PNG_BYTES } from "./helpers/upload-fixtures.js";

// -----------------------------------------------------------------------------------------------
// B-EVIDENCIA-INDICE · F2b — o repositório da evidência NO BANCO, com RLS (§8.4, casos D).
//
// Molde: `tests/b-material-sync-db.test.ts` (papel efêmero NOSUPERUSER NOBYPASSRLS do arnês, admin só
// semeia/observa/limpa, teardown escopado pelos ids do próprio teste) e
// `tests/b-aprov-duraveis-rls-db.test.ts`.
//
// CAMADAS PROVADAS AQUI, declaradas:
//   (1) o REPOSITÓRIO Prisma e o BANCO (F2b) — D1, D5 a D9, D10 (complemento), D11, D12, D14, D15(a/b) e
//       D16 chamando o repositório de verdade que a rota chama;
//   (2) A ROTA (F5) — o app inteiro (`createApp`) em modo `prisma`, com o recibo e a linha no PostgreSQL
//       real: D1(rota), D2, D3, D4 (+ o complemento do §A1.2), D10 (as 2 rotas de leitura da F4), D13,
//       D15(c) e D16(rota). São os casos que o §8.4 escreve "pela rota".
// Cada caso diz a camada em que está.
//
// A suíte FIXA o modo `prisma` ela mesma, antes de qualquer import da aplicação (lição do #357,
// `tests/financial-period-close-write-race-db.test.ts`): o job `backend` da CI tem DATABASE_URL e roda
// com `CORE_SAAS_PERSISTENCE=memory`, e sem a fixação estes casos exercitariam a memória e "passariam".
// -----------------------------------------------------------------------------------------------

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("B-EVIDENCIA-INDICE · o índice da evidência com banco exige DATABASE_URL e um banco migrado", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrations para executar esta suíte.",
  });
} else {
  // ANTES de qualquer import da aplicação (todos abaixo são dinâmicos; o primeiro deles congela src/config/env.ts).
  process.env.CORE_SAAS_PERSISTENCE = "prisma";
  process.env.LOG_LEVEL = "silent";
  process.env.JWT_SECRET ??= "dev-only-change-me";
  process.env.JWT_EXPIRES_IN ??= "15m";

  // F5 — os casos "pela rota" gravam e leem o binário por um provedor LOCAL num diretório temporário. A
  // fábrica da leitura (D-014) resolve `CHECKLIST_STORAGE_LOCAL_DIR` pelo env CONGELADO, então ele é fixado
  // AQUI, antes do primeiro import de src/, e a costura do upload aponta para o MESMO diretório — é o que
  // faz o download devolver o byte que o upload gravou (o idioma de `tests/evidencia-indice-leitura.test.ts`).
  const DIRETORIO_DE_ARMAZENAMENTO = mkdtempSync(path.join(os.tmpdir(), "evind-db-"));
  process.env.CHECKLIST_STORAGE_PROVIDER = "local";
  process.env.CHECKLIST_STORAGE_LOCAL_DIR = DIRETORIO_DE_ARMAZENAMENTO;
  process.env.CHECKLIST_STORAGE_S3_BUCKET = "";
  process.env.CHECKLIST_STORAGE_S3_REGION = "";

  const TABLE = "mobile_evidences";
  const METADATA_KEYS_CHECK = "mobile_evidences_metadata_keys_chk";
  const METADATA_SIZE_CHECK = "mobile_evidences_metadata_chk";
  const METADATA_MAX_BYTES = 16384;

  // §E1.3: os 23 nomes que o sync recusa mais o par da organização, que o CHECK do banco também recusa.
  const CHAVES_RECUSADAS_PELO_BANCO = [
    "token", "access_token", "accesstoken", "refresh_token", "refreshToken", "authorization", "Bearer",
    "password", "secret", "bucket", "storage_key", "storagekey", "storage-key", "file_url", "fileUrl",
    "absolute_path", "absolutePath", "local_path", "localpath", "path", "PATH", "base64", "file_data",
    "tenant_id", "TENANT_ID", "tenantid",
  ] as const;

  let syncModule: typeof import("../src/modules/mobile/mobile-evidence-sync.js") | undefined;
  let admin: ReturnType<typeof createPrismaClient> | undefined;
  let papel: EphemeralRole | undefined;
  const organizacoesCriadas: string[] = [];

  type Cenario = {
    tenantA: string;
    tenantB: string;
    usuarioA1: string;
    usuarioA2: string;
    gestorA: string;
    usuarioB1: string;
    osA: string;
    osB: string;
  };

  let cenario: Cenario | undefined;

  async function moduloSync(): Promise<typeof import("../src/modules/mobile/mobile-evidence-sync.js")> {
    syncModule ??= await import("../src/modules/mobile/mobile-evidence-sync.js");
    return syncModule;
  }

  async function rlsModule(): Promise<typeof import("../src/database/rls.js")> {
    return import("../src/database/rls.js");
  }

  async function adminClient(): Promise<ReturnType<typeof createPrismaClient>> {
    if (!admin) {
      // O admin do cluster é SUPERUSER: contorna o RLS. É exatamente a conexão que o D8 pede para provar
      // que o filtro de organização mora no CÓDIGO do repositório, e não só na política do banco.
      admin = createPrismaClient(connectionString!);
    }
    return admin;
  }

  async function papelEfemero(): Promise<EphemeralRole> {
    if (!papel) {
      papel = await createEphemeralRole(await adminClient(), connectionString!);
    }
    return papel;
  }

  async function cenarioFixo(): Promise<Cenario> {
    if (cenario) return cenario;
    const db = await adminClient();
    const sufixo = randomUUID().replaceAll("-", "").slice(0, 10);
    // Módulos contratados: os casos "pela rota" da F5 passam pelo portão de módulos (B-SAN3-18) quando o
    // ator tem JWT; com os cabeçalhos legados de dev/test o portão segue, mas a organização já nasce com o
    // que o app de campo e a OS precisam.
    const modulos = "ARRAY['dashboard', 'mobile', 'work_orders', 'field_operations']::text[]";
    const [tenantA] = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ${modulos}) RETURNING id::text`,
      `Organização Teste A ${sufixo}`,
    )) as Array<{ id: string }>;
    const [tenantB] = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug, modules) VALUES ($1, $1, ${modulos}) RETURNING id::text`,
      `Organização Teste B ${sufixo}`,
    )) as Array<{ id: string }>;
    organizacoesCriadas.push(tenantA!.id, tenantB!.id);

    const usuario = async (tenantId: string, nome: string, email: string): Promise<string> => {
      const [linha] = (await db.$queryRawUnsafe(
        `INSERT INTO users (tenant_id, name, email) VALUES ($1::uuid, $2, $3) RETURNING id::text`,
        tenantId,
        nome,
        email,
      )) as Array<{ id: string }>;
      return linha!.id;
    };
    const os = async (tenantId: string, code: string): Promise<string> => {
      const [linha] = (await db.$queryRawUnsafe(
        `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS do índice da evidência') RETURNING id::text`,
        tenantId,
        code,
      )) as Array<{ id: string }>;
      return linha!.id;
    };

    cenario = {
      tenantA: tenantA!.id,
      tenantB: tenantB!.id,
      usuarioA1: await usuario(tenantA!.id, "Tecnico A1", `indice-a1-${sufixo}@example.com`),
      usuarioA2: await usuario(tenantA!.id, "Tecnico A2", `indice-a2-${sufixo}@example.com`),
      gestorA: await usuario(tenantA!.id, "Gestor A", `indice-gestor-a-${sufixo}@example.com`),
      usuarioB1: await usuario(tenantB!.id, "Tecnico B1", `indice-b1-${sufixo}@example.com`),
      osA: await os(tenantA!.id, `OS-INDICE-A-${sufixo}`),
      osB: await os(tenantB!.id, `OS-INDICE-B-${sufixo}`),
    };
    return cenario;
  }

  after(async () => {
    // Teardown ESCOPADO pelos ids criados por esta suíte, na ordem das FKs (todas RESTRICT):
    // evidências antes de OS e usuários, OS e usuários antes da organização.
    await derrubarApp();
    if (admin && organizacoesCriadas.length > 0) {
      for (const tenantId of organizacoesCriadas) {
        await admin.$executeRawUnsafe(`DELETE FROM ${TABLE} WHERE tenant_id = $1::uuid`, tenantId).catch(() => undefined);
        await admin.$executeRawUnsafe(`DELETE FROM work_orders WHERE tenant_id = $1::uuid`, tenantId).catch(() => undefined);
        await admin.$executeRawUnsafe(`DELETE FROM users WHERE tenant_id = $1::uuid`, tenantId).catch(() => undefined);
        await admin.$executeRawUnsafe(`DELETE FROM tenants WHERE id = $1::uuid`, tenantId).catch(() => undefined);
      }
    }
    if (papel) {
      await papel.drop().catch(() => undefined);
    }
    await admin?.$disconnect();
    rmSync(DIRETORIO_DE_ARMAZENAMENTO, { recursive: true, force: true });
  });

  function errorText(error: unknown): string {
    const partes: string[] = [];
    const vistos = new Set<unknown>();
    const andar = (candidato: unknown, profundidade: number): void => {
      if (profundidade > 6 || candidato === null || vistos.has(candidato)) return;
      if (typeof candidato === "string") {
        partes.push(candidato);
        return;
      }
      if (typeof candidato !== "object") return;
      vistos.add(candidato);
      const registro = candidato as Record<string, unknown>;
      for (const chave of ["message", "cause", "meta", "driverAdapterError"]) andar(registro[chave], profundidade + 1);
    };
    andar(error, 0);
    return partes.join(" | ");
  }

  function sqlState(error: unknown): string | undefined {
    const codigos: string[] = [];
    const vistos = new Set<unknown>();
    const andar = (candidato: unknown, profundidade: number): void => {
      if (profundidade > 6 || candidato === null || vistos.has(candidato)) return;
      if (typeof candidato !== "object") return;
      vistos.add(candidato);
      const registro = candidato as Record<string, unknown>;
      for (const chave of ["code", "originalCode"]) {
        if (typeof registro[chave] === "string") codigos.push(registro[chave] as string);
      }
      for (const chave of ["cause", "meta", "driverAdapterError"]) andar(registro[chave], profundidade + 1);
    };
    andar(error, 0);
    return codigos.find((codigo) => /^\d{5}$/.test(codigo));
  }

  function constraintDe(error: unknown): string | undefined {
    return errorText(error).match(/constraint "([^"]+)"/)?.[1];
  }

  async function esperarViolacao(promessa: Promise<unknown>, estado: string, rotulo: string, restricao?: string): Promise<void> {
    try {
      await promessa;
    } catch (error) {
      assert.equal(sqlState(error), estado, `${rotulo}: SQLSTATE esperado ${estado}, veio ${sqlState(error)} — ${errorText(error).slice(0, 240)}`);
      if (restricao) {
        assert.equal(constraintDe(error), restricao, `${rotulo}: a restrição violada é ${restricao} — ${errorText(error).slice(0, 240)}`);
      }
      return;
    }
    assert.fail(`${rotulo}: era para falhar com ${estado}${restricao ? ` em ${restricao}` : ""} e passou`);
  }

  type LinhaDireta = {
    tenantId: string;
    actorUserId: string;
    clientEvidenceId: string;
    actionType?: string;
    scope?: string;
    kind?: string;
    workOrderId?: string | null;
    metadata?: Record<string, unknown> | unknown[];
    fileStatus?: string;
    fileId?: string | null;
    storageProvider?: string | null;
    storageKey?: string | null;
    mimeType?: string | null;
    sizeBytes?: number | null;
    checksumSha256?: string | null;
    storedAt?: Date | null;
  };

  // INSERT direto, sob o papel efêmero e o contexto de organização dado. É o caminho do D7, D9, D11 e D15.
  async function inserirDireto(contexto: string, linha: LinhaDireta): Promise<void> {
    const { withTenantRls } = await rlsModule();
    const role = await papelEfemero();
    await withTenantRls(role.client as never, contexto, (tx) =>
      tx.$executeRawUnsafe(
        `INSERT INTO ${TABLE}
           (tenant_id, actor_user_id, client_evidence_id, action_type, scope, kind, work_order_id,
            metadata, fingerprint_sha256, local_created_at, file_status,
            file_id, storage_provider, storage_key, mime_type, size_bytes, checksum_sha256, stored_at)
         VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6, $7::uuid, $8::jsonb, $9, $10::timestamptz, $11,
                 $12, $13, $14, $15, $16, $17, $18::timestamptz)`,
        linha.tenantId,
        linha.actorUserId,
        linha.clientEvidenceId,
        linha.actionType ?? "evidence.work_order_photo",
        linha.scope ?? "work_order",
        linha.kind ?? "photo",
        linha.workOrderId ?? null,
        JSON.stringify(linha.metadata ?? {}),
        "c".repeat(64),
        new Date(),
        linha.fileStatus ?? "awaiting_file",
        linha.fileId ?? null,
        linha.storageProvider ?? null,
        linha.storageKey ?? null,
        linha.mimeType ?? null,
        linha.sizeBytes ?? null,
        linha.checksumSha256 ?? null,
        linha.storedAt ?? null,
      ),
    );
  }

  type EntradaAceita = {
    tenantId: string;
    actorUserId: string;
    clientEvidenceId: string;
    actionType: "evidence.work_order_photo";
    scope: "work_order";
    kind: "photo";
    workOrderId: string | null;
    metadata: Record<string, unknown>;
    fingerprintSha256: string;
    localCreatedAt: Date;
    fileStatus: "awaiting_file";
  };

  function entradaAceita(cen: Cenario, codigo: string, extra: Partial<EntradaAceita> = {}): EntradaAceita {
    return {
      tenantId: cen.tenantA,
      actorUserId: cen.usuarioA1,
      clientEvidenceId: codigo,
      actionType: "evidence.work_order_photo",
      scope: "work_order",
      kind: "photo",
      workOrderId: cen.osA,
      metadata: { note: "Foto da frente do veículo", work_order_id: cen.osA },
      fingerprintSha256: "d".repeat(64),
      localCreatedAt: new Date(),
      fileStatus: "awaiting_file",
      ...extra,
    };
  }

  function arquivoGuardado(rotulo: string) {
    return {
      fileId: `file_${randomUUID().replaceAll("-", "").slice(0, 20)}`,
      storageProvider: "local",
      storageKey: `evidence/${rotulo}/${randomUUID()}.png`,
      mimeType: "image/png",
      sizeBytes: 2048,
      checksumSha256: "e".repeat(64),
      storedAt: new Date(),
    };
  }

  // O CHECK `mobile_evidences_metadata_chk` mede `octet_length("metadata"::text)`, e o texto do JSONB
  // NÃO é o JSON compacto (o Postgres põe um espaço depois de ":" e de ","). Por isso o tamanho é MEDIDO
  // no banco, e o preenchimento é calibrado contra a medição — nunca calculado por suposição.
  async function bytesDoJsonbNoBanco(metadata: unknown): Promise<number> {
    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      `SELECT octet_length($1::jsonb::text)::int AS n`,
      JSON.stringify(metadata),
    )) as Array<{ n: number }>;
    return linha!.n;
  }

  async function metadadoComBytesNoBanco(alvo: number): Promise<Record<string, unknown>> {
    let nota = "x".repeat(Math.max(0, alvo));
    for (let tentativa = 0; tentativa < 6; tentativa += 1) {
      const medido = await bytesDoJsonbNoBanco({ note: nota });
      if (medido === alvo) break;
      nota = "x".repeat(Math.max(0, nota.length + (alvo - medido)));
    }
    const final = await bytesDoJsonbNoBanco({ note: nota });
    assert.equal(final, alvo, `o metadado tem exatamente ${alvo} bytes de texto do JSONB (medido no banco)`);
    return { note: nota };
  }

  /**
   * Uma OS NOVA da organização, opcionalmente atribuída a um usuário. A atribuição é pela forma "user id"
   * (`work-order.service.ts` compara `assignedOperatorId` com o `userId` do ator; a OS não tem perfil de
   * operador). O D10 usa uma OS SÓ DELE: a OS-A do cenário é compartilhada pelos outros casos, e a lista
   * da evidência é por OS — misturar as duas faria o caso contar a evidência alheia.
   */
  async function criarOs(tenantId: string, code: string, atribuidaA?: string): Promise<string> {
    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title, assigned_operator_id)
       VALUES ($1::uuid, $2, 'OS do índice da evidência', $3::uuid) RETURNING id::text`,
      tenantId,
      code,
      atribuidaA ?? null,
    )) as Array<{ id: string }>;
    return linha!.id;
  }

  async function contarLinhas(tenantId: string, codigo?: string): Promise<number> {
    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      codigo
        ? `SELECT count(*)::int AS n FROM ${TABLE} WHERE tenant_id = $1::uuid AND client_evidence_id = $2`
        : `SELECT count(*)::int AS n FROM ${TABLE} WHERE tenant_id = $1::uuid`,
      tenantId,
      ...(codigo ? [codigo] : []),
    )) as Array<{ n: number }>;
    return linha!.n;
  }

  // =============================================================================================
  // D1 (camada repositório) — o repositório resolvido pelo produto em modo `prisma` é o do BANCO:
  // a linha criada por ele existe no Postgres, com as colunas certas.
  // =============================================================================================
  test("[D1] com CORE_SAAS_PERSISTENCE=prisma, createAccepted grava a linha no Postgres com as colunas certas", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    assert.equal(process.env.CORE_SAAS_PERSISTENCE, "prisma", "a suíte fixa o modo prisma antes de importar a aplicação");

    const repositorio = sync.resolveMobileEvidenceRepository();
    const codigo = `cev-${randomUUID()}`;
    const criado = await repositorio.createAccepted(entradaAceita(cen, codigo));
    assert.equal(criado.outcome, "created", `esperado created, veio ${JSON.stringify(criado).slice(0, 200)}`);

    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      `SELECT tenant_id::text, actor_user_id::text, client_evidence_id, action_type, scope, kind, work_order_id::text,
              metadata, fingerprint_sha256, file_status, file_id, storage_provider, storage_key, mime_type,
              size_bytes, checksum_sha256, stored_at, deleted_at, local_created_at, created_at
         FROM ${TABLE} WHERE tenant_id = $1::uuid AND client_evidence_id = $2`,
      cen.tenantA,
      codigo,
    )) as Array<Record<string, unknown>>;
    assert.ok(linha, "a linha existe no Postgres (não só na memória do processo)");
    assert.equal(linha!.tenant_id, cen.tenantA);
    assert.equal(linha!.actor_user_id, cen.usuarioA1);
    assert.equal(linha!.action_type, "evidence.work_order_photo");
    assert.equal(linha!.scope, "work_order");
    assert.equal(linha!.kind, "photo");
    assert.equal(linha!.work_order_id, cen.osA);
    assert.equal(linha!.file_status, "awaiting_file");
    assert.equal(linha!.fingerprint_sha256, "d".repeat(64));
    assert.deepEqual(linha!.metadata, { note: "Foto da frente do veículo", work_order_id: cen.osA });
    assert.equal(linha!.file_id, null);
    assert.equal(linha!.storage_provider, null);
    assert.equal(linha!.storage_key, null);
    assert.equal(linha!.mime_type, null);
    assert.equal(linha!.size_bytes, null);
    assert.equal(linha!.checksum_sha256, null);
    assert.equal(linha!.stored_at, null);
    assert.equal(linha!.deleted_at, null);
    assert.ok(linha!.local_created_at instanceof Date, "local_created_at é timestamptz");
    assert.ok(linha!.created_at instanceof Date, "created_at é timestamptz");
  });

  // =============================================================================================
  // D5 — dois `createAccepted` simultâneos com a mesma chave: 1 linha, um `created` e um `duplicate`.
  // =============================================================================================
  test("[D5] dois createAccepted simultâneos com a mesma chave: 1 linha, um created e um duplicate, nenhum erro", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const repositorio = sync.resolveMobileEvidenceRepository();
    const codigo = `cev-${randomUUID()}`;
    const entrada = entradaAceita(cen, codigo);

    const resultados = await Promise.allSettled([
      repositorio.createAccepted(entrada),
      repositorio.createAccepted({ ...entrada, fingerprintSha256: "f".repeat(64) }),
    ]);
    const falhas = resultados.filter((item) => item.status === "rejected") as PromiseRejectedResult[];
    assert.deepEqual(falhas.map((item) => errorText(item.reason)), [], "nenhum erro: o índice único arbitra a corrida");
    const desfechos = resultados
      .map((item) => (item as PromiseFulfilledResult<{ outcome: string }>).value.outcome)
      .sort();
    assert.deepEqual(desfechos, ["created", "duplicate"], "um created e um duplicate");
    assert.equal(await contarLinhas(cen.tenantA, codigo), 1, "uma linha só");
  });

  // =============================================================================================
  // D6 — dois `markFileStored` simultâneos: 1 vencedor, a linha tem os dados de um só, nenhum erro.
  // =============================================================================================
  test("[D6] dois markFileStored simultâneos: um vencedor, a linha tem os dados de um só", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const repositorio = sync.resolveMobileEvidenceRepository();
    const codigo = `cev-${randomUUID()}`;
    const criado = await repositorio.createAccepted(entradaAceita(cen, codigo));
    assert.equal(criado.outcome, "created");

    const primeiro = { ...arquivoGuardado("d6-um"), storageKey: `${cen.tenantA}/d6-um-${randomUUID()}.png` };
    const segundo = { ...arquivoGuardado("d6-dois"), storageKey: `${cen.tenantA}/d6-dois-${randomUUID()}.png` };
    const resultados = await Promise.allSettled([
      repositorio.markFileStored(cen.tenantA, cen.usuarioA1, codigo, primeiro),
      repositorio.markFileStored(cen.tenantA, cen.usuarioA1, codigo, segundo),
    ]);
    const falhas = resultados.filter((item) => item.status === "rejected") as PromiseRejectedResult[];
    assert.deepEqual(falhas.map((item) => errorText(item.reason)), [], "nenhum erro");
    const desfechos = resultados
      .map((item) => (item as PromiseFulfilledResult<{ outcome: string }>).value.outcome)
      .sort();
    assert.deepEqual(desfechos, ["current", "updated"], "um vencedor e um que devolve a linha atual");

    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      `SELECT file_status, file_id, storage_key::text FROM ${TABLE} WHERE tenant_id = $1::uuid AND client_evidence_id = $2`,
      cen.tenantA,
      codigo,
    )) as Array<{ file_status: string; file_id: string; storage_key: string }>;
    assert.equal(linha!.file_status, "stored");
    const vencedor = linha!.file_id === primeiro.fileId ? primeiro : linha!.file_id === segundo.fileId ? segundo : undefined;
    assert.ok(vencedor, `a linha tem os dados de UM só dos dois arquivos (veio ${linha!.file_id})`);
    assert.equal(linha!.storage_key, vencedor!.storageKey, "nenhuma dobra: chave e file_id são do mesmo vencedor");
  });

  // =============================================================================================
  // D7 — SQL sob o papel efêmero NOSUPERUSER NOBYPASSRLS: sem contexto, contexto A lendo B, INSERT
  //      com tenant_id de B sob A, UPDATE e DELETE de linha de B sob A.
  // =============================================================================================
  test("[D7] RLS FORÇADO sob papel NOSUPERUSER NOBYPASSRLS: 0 linha sem contexto, 0 linha de B sob A, INSERT recusado com 42501, UPDATE e DELETE de B não afetam nada", async () => {
    const { withTenantRls } = await rlsModule();
    const cen = await cenarioFixo();
    const role = await papelEfemero();
    const db = await adminClient();

    const [postura] = (await role.client.$queryRawUnsafe(
      `SELECT rolsuper, rolbypassrls FROM pg_roles WHERE rolname = current_user`,
    )) as Array<{ rolsuper: boolean; rolbypassrls: boolean }>;
    assert.deepEqual(postura, { rolsuper: false, rolbypassrls: false }, "o papel do arnês é NOSUPERUSER NOBYPASSRLS");

    const codigoA = `cev-${randomUUID()}`;
    const codigoB = `cev-${randomUUID()}`;
    for (const [tenantId, userId, osId, codigo] of [
      [cen.tenantA, cen.usuarioA1, cen.osA, codigoA],
      [cen.tenantB, cen.usuarioB1, cen.osB, codigoB],
    ] as const) {
      await db.$executeRawUnsafe(
        `INSERT INTO ${TABLE} (tenant_id, actor_user_id, client_evidence_id, action_type, scope, kind, work_order_id, metadata, fingerprint_sha256, local_created_at, file_status)
         VALUES ($1::uuid, $2::uuid, $3, 'evidence.work_order_photo', 'work_order', 'photo', $4::uuid, '{}'::jsonb, $5, now(), 'awaiting_file')`,
        tenantId,
        userId,
        codigo,
        osId,
        "a".repeat(64),
      );
    }

    // Asserções ESCOPADAS aos códigos deste teste: a base é compartilhada com os outros casos da suíte.
    const escopo = `client_evidence_id IN ($1, $2)`;
    const [semContexto] = (await role.client.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM ${TABLE} WHERE ${escopo}`,
      codigoA,
      codigoB,
    )) as Array<{ n: number }>;
    assert.equal(semContexto!.n, 0, "sem contexto de organização, 0 linha");

    const sobA = await withTenantRls(role.client as never, cen.tenantA, async (tx) => {
      const [total] = (await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM ${TABLE} WHERE ${escopo}`,
        codigoA,
        codigoB,
      )) as Array<{ n: number }>;
      const [deB] = (await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM ${TABLE} WHERE client_evidence_id = $1`,
        codigoB,
      )) as Array<{ n: number }>;
      return { total: total!.n, deB: deB!.n };
    });
    assert.deepEqual(sobA, { total: 1, deB: 0 }, "o contexto de A vê 1 linha (a sua) e nenhuma de B");

    const sobB = await withTenantRls(role.client as never, cen.tenantB, async (tx) => {
      const [deA] = (await tx.$queryRawUnsafe(
        `SELECT count(*)::int AS n FROM ${TABLE} WHERE client_evidence_id = $1`,
        codigoA,
      )) as Array<{ n: number }>;
      return deA!.n;
    });
    assert.equal(sobB, 0, "controle cruzado: o contexto de B não lê a linha de A");

    await esperarViolacao(
      withTenantRls(role.client as never, cen.tenantA, (tx) =>
        tx.$executeRawUnsafe(
          `INSERT INTO ${TABLE} (tenant_id, actor_user_id, client_evidence_id, action_type, scope, kind, work_order_id, metadata, fingerprint_sha256, local_created_at, file_status)
           VALUES ($1::uuid, $2::uuid, $3, 'evidence.work_order_photo', 'work_order', 'photo', $4::uuid, '{}'::jsonb, $5, now(), 'awaiting_file')`,
          cen.tenantB,
          cen.usuarioB1,
          `cev-${randomUUID()}`,
          cen.osB,
          "b".repeat(64),
        ),
      ),
      "42501",
      "INSERT com tenant_id de B sob o contexto de A",
    );

    const afetadasUpdate = await withTenantRls(role.client as never, cen.tenantA, (tx) =>
      tx.$executeRawUnsafe(`UPDATE ${TABLE} SET deleted_at = now() WHERE client_evidence_id = $1`, codigoB),
    );
    assert.equal(afetadasUpdate, 0, "o UPDATE de linha de B sob o contexto de A não afeta nenhuma linha");

    const afetadasDelete = await withTenantRls(role.client as never, cen.tenantA, (tx) =>
      tx.$executeRawUnsafe(`DELETE FROM ${TABLE} WHERE client_evidence_id = $1`, codigoB),
    );
    assert.equal(afetadasDelete, 0, "o DELETE de linha de B sob o contexto de A não afeta nenhuma linha");

    const [linhaB] = (await db.$queryRawUnsafe(
      `SELECT deleted_at FROM ${TABLE} WHERE client_evidence_id = $1`,
      codigoB,
    )) as Array<{ deleted_at: Date | null }>;
    assert.equal(linhaB!.deleted_at, null, "a linha de B continua intacta");
  });

  // =============================================================================================
  // D8 — o MESMO isolamento com o repositório sobre uma conexão que CONTORNA o RLS (o admin superuser):
  //      prova o filtro de organização do CÓDIGO, não só a política do banco.
  // =============================================================================================
  test("[D8] sobre uma conexão que contorna o RLS, o repositório não devolve nem altera linha de outra organização", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const db = await adminClient();

    const [postura] = (await db.$queryRawUnsafe(
      `SELECT current_setting('is_superuser') AS superusuario,
              (SELECT relrowsecurity FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AS rls,
              (SELECT relforcerowsecurity FROM pg_class WHERE relname = '${TABLE}' AND relkind = 'r') AS forcado`,
    )) as Array<{ superusuario: string; rls: boolean; forcado: boolean }>;
    assert.equal(postura!.superusuario, "on", "a conexão do repositório é de superuser: contorna o RLS");
    assert.deepEqual({ rls: postura!.rls, forcado: postura!.forcado }, { rls: true, forcado: true }, "a tabela tem RLS ligado e forçado — e mesmo assim o filtro é do código");

    const repositorio = sync.resolveMobileEvidenceRepository();
    const codigoB = `cev-${randomUUID()}`;
    const criadoB = await repositorio.createAccepted(
      entradaAceita(cen, codigoB, { tenantId: cen.tenantB, actorUserId: cen.usuarioB1, workOrderId: cen.osB }),
    );
    assert.equal(criadoB.outcome, "created");
    if (criadoB.outcome !== "created") return;
    const idB = criadoB.record.id;

    assert.equal(await repositorio.findByClientEvidenceId(cen.tenantA, cen.usuarioB1, codigoB), undefined, "findByClientEvidenceId de A não vê o recibo de B");
    assert.deepEqual(await repositorio.listByWorkOrder(cen.tenantA, cen.osB), [], "listByWorkOrder de A não lista a OS de B");
    assert.equal(await repositorio.findByIdForWorkOrder(cen.tenantA, cen.osB, idB), undefined, "findByIdForWorkOrder de A não acha a evidência de B");

    const arquivo = { ...arquivoGuardado("d8"), storageKey: `${cen.tenantB}/d8-${randomUUID()}.png` };
    const marcado = await repositorio.markFileStored(cen.tenantA, cen.usuarioB1, codigoB, arquivo);
    assert.equal(marcado.outcome, "not_found", "markFileStored de A sobre o recibo de B não acha a linha");

    const [linhaB] = (await db.$queryRawUnsafe(
      `SELECT file_status, file_id FROM ${TABLE} WHERE id = $1::uuid`,
      idB,
    )) as Array<{ file_status: string; file_id: string | null }>;
    assert.deepEqual(linhaB, { file_status: "awaiting_file", file_id: null }, "a linha de B não foi tocada");

    // Controle positivo: o mesmo repositório, com o contexto de B, vê e altera a linha de B.
    const listaB = await repositorio.listByWorkOrder(cen.tenantB, cen.osB);
    assert.ok(listaB.some((item) => item.id === idB), "com o contexto de B, a linha aparece");
    assert.ok(listaB.every((item) => item.tenantId === cen.tenantB), "e nenhuma linha de outra organização vaza");
    const marcadoB = await repositorio.markFileStored(cen.tenantB, cen.usuarioB1, codigoB, arquivo);
    assert.equal(marcadoB.outcome, "updated", "com o contexto de B, a troca condicional acontece");
  });

  // =============================================================================================
  // D9 — INSERT com work_order_id de OS da organização B sob o contexto de A: a FK composta recusa.
  // =============================================================================================
  test("[D9] a FK composta (tenant_id, work_order_id) recusa ligar a evidência a OS de outra organização", async () => {
    const cen = await cenarioFixo();
    const db = await adminClient();
    const codigo = `cev-${randomUUID()}`;
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA,
        actorUserId: cen.usuarioA1,
        clientEvidenceId: codigo,
        workOrderId: cen.osB,
      }),
      "23503",
      "INSERT com work_order_id de B sob o contexto de A",
      "mobile_evidences_tenant_id_work_order_id_fkey",
    );
    assert.equal(await contarLinhas(cen.tenantA, codigo), 0, "nenhuma linha foi criada");
    const [total] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM ${TABLE} WHERE client_evidence_id = $1`,
      codigo,
    )) as Array<{ n: number }>;
    assert.equal(total!.n, 0, "nenhuma linha em organização nenhuma");
  });

  // =============================================================================================
  // D10 (complemento, camada repositório) — evidência com `deleted_at` preenchido não aparece na lista
  // e não é achada por id. É a metade Prisma da MU17. A metade das rotas é da F4/F5.
  // =============================================================================================
  test("[D10 complemento] evidência com deleted_at preenchido não aparece na lista nem na busca por id", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const db = await adminClient();
    const repositorio = sync.resolveMobileEvidenceRepository();

    const viva = `cev-${randomUUID()}`;
    const excluida = `cev-${randomUUID()}`;
    const criadaViva = await repositorio.createAccepted(entradaAceita(cen, viva));
    const criadaExcluida = await repositorio.createAccepted(entradaAceita(cen, excluida));
    assert.equal(criadaViva.outcome, "created");
    assert.equal(criadaExcluida.outcome, "created");
    if (criadaViva.outcome !== "created" || criadaExcluida.outcome !== "created") return;

    // Direto no banco, no preparo do teste, como o §E1.8 manda.
    await db.$executeRawUnsafe(`UPDATE ${TABLE} SET deleted_at = now() WHERE id = $1::uuid`, criadaExcluida.record.id);

    const lista = await repositorio.listByWorkOrder(cen.tenantA, cen.osA);
    assert.ok(!lista.some((item) => item.clientEvidenceId === excluida), "a evidência excluída não aparece na lista");
    assert.ok(lista.some((item) => item.clientEvidenceId === viva), "controle positivo: a viva aparece");
    assert.equal(
      await repositorio.findByIdForWorkOrder(cen.tenantA, cen.osA, criadaExcluida.record.id),
      undefined,
      "a busca por id da evidência excluída não devolve nada",
    );
    assert.equal(
      (await repositorio.findByIdForWorkOrder(cen.tenantA, cen.osA, criadaViva.record.id))?.clientEvidenceId,
      viva,
      "controle positivo: a evidência viva é achada por id",
    );
  });

  // =============================================================================================
  // D11 — cada CHECK do §E1.7, um por vez, sob o papel efêmero com o contexto de A.
  // =============================================================================================
  test("[D11] cada restrição de verificação recusa o seu caso, e os controles entram", async () => {
    const cen = await cenarioFixo();
    const dadosStored = {
      fileStatus: "stored",
      fileId: `file_${randomUUID().replaceAll("-", "").slice(0, 16)}`,
      storageProvider: "local",
      mimeType: "image/png",
      sizeBytes: 1024,
      checksumSha256: "f".repeat(64),
      storedAt: new Date(),
    };

    // (a) `stored` sem a chave do objeto.
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        workOrderId: cen.osA, ...dadosStored, storageKey: null,
      }),
      "23514", "(a) stored sem chave", "mobile_evidences_stored_chk",
    );

    // (b) observação com `awaiting_file`.
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        actionType: "evidence.work_order_observation", kind: "observation", workOrderId: cen.osA, fileStatus: "awaiting_file",
      }),
      "23514", "(b) observação com awaiting_file", "mobile_evidences_kind_file_chk",
    );

    // (c) escopo `work_order` sem OS.
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`, workOrderId: null,
      }),
      "23514", "(c) scope work_order sem OS", "mobile_evidences_scope_work_order_chk",
    );

    // (d) chave de objeto sem a organização.
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        workOrderId: cen.osA, ...dadosStored, storageKey: `evidence/${randomUUID()}.png`,
      }),
      "23514", "(d) chave sem a organização", "mobile_evidences_storage_key_tenant_chk",
    );

    // (e) chave com a organização colada no meio de outro segmento (§E1.6).
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        workOrderId: cen.osA, ...dadosStored, storageKey: `evidence/prefixo${cen.tenantA}/${randomUUID()}.png`,
      }),
      "23514", "(e) organização colada no meio de outro segmento", "mobile_evidences_storage_key_tenant_chk",
    );

    // (f) metadado com 16385 bytes de texto do JSONB; controle com 16384 entra (§E1.4).
    const acima = await metadadoComBytesNoBanco(METADATA_MAX_BYTES + 1);
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        workOrderId: cen.osA, metadata: acima,
      }),
      "23514", "(f) metadado acima do teto", METADATA_SIZE_CHECK,
    );

    const noLimite = await metadadoComBytesNoBanco(METADATA_MAX_BYTES);
    await inserirDireto(cen.tenantA, {
      tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
      workOrderId: cen.osA, metadata: noLimite,
    });

    // (g) metadado que não é objeto.
    await esperarViolacao(
      inserirDireto(cen.tenantA, {
        tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
        workOrderId: cen.osA, metadata: ["nao", "sou", "objeto"],
      }),
      "23514", "(g) metadado que é array", METADATA_SIZE_CHECK,
    );

    // Controle positivo do (d)/(e): a chave com a organização como segmento inteiro entra.
    await inserirDireto(cen.tenantA, {
      tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
      workOrderId: cen.osA, ...dadosStored, storageKey: `evidence/${cen.tenantA}/${randomUUID()}.png`,
    });
  });

  // =============================================================================================
  // D12 — apagar a OS que tem evidência é RECUSADO pela FK (RESTRICT); a evidência continua.
  // =============================================================================================
  test("[D12] apagar a OS que tem evidência é recusado pela FK RESTRICT e a evidência continua", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const db = await adminClient();
    const repositorio = sync.resolveMobileEvidenceRepository();

    const [osExclusiva] = (await db.$queryRawUnsafe(
      `INSERT INTO work_orders (tenant_id, code, title) VALUES ($1::uuid, $2, 'OS que será apagada') RETURNING id::text`,
      cen.tenantA,
      `OS-INDICE-D12-${randomUUID().replaceAll("-", "").slice(0, 8)}`,
    )) as Array<{ id: string }>;
    const criado = await repositorio.createAccepted(entradaAceita(cen, `cev-${randomUUID()}`, { workOrderId: osExclusiva!.id }));
    assert.equal(criado.outcome, "created");

    await esperarViolacao(
      db.$executeRawUnsafe(`DELETE FROM work_orders WHERE id = $1::uuid`, osExclusiva!.id),
      "23503",
      "apagar a OS que tem evidência",
      "mobile_evidences_tenant_id_work_order_id_fkey",
    );

    const [continua] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM ${TABLE} WHERE work_order_id = $1::uuid`,
      osExclusiva!.id,
    )) as Array<{ n: number }>;
    assert.equal(continua!.n, 1, "a evidência continua lá");
    const [osSegueViva] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM work_orders WHERE id = $1::uuid`,
      osExclusiva!.id,
    )) as Array<{ n: number }>;
    assert.equal(osSegueViva!.n, 1, "a OS não foi apagada");

    await db.$executeRawUnsafe(`DELETE FROM ${TABLE} WHERE work_order_id = $1::uuid`, osExclusiva!.id);
    await db.$executeRawUnsafe(`DELETE FROM work_orders WHERE id = $1::uuid`, osExclusiva!.id);
  });

  // =============================================================================================
  // D14 (camada repositório) — o recibo é por organização + USUÁRIO + código: o gestor da mesma
  // organização que manda o mesmo código tem a própria linha, e nunca vê nem altera a de A1.
  // A metade "pela rota, com upload" é da F5.
  // =============================================================================================
  test("[D14] o mesmo código por dois usuários da mesma organização dá duas linhas, e o markFileStored de um não toca a do outro", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const db = await adminClient();
    const repositorio = sync.resolveMobileEvidenceRepository();
    const codigo = `cev-${randomUUID()}`;

    const deA1 = await repositorio.createAccepted(entradaAceita(cen, codigo));
    assert.equal(deA1.outcome, "created");
    const arquivoDeA1 = { ...arquivoGuardado("d14-a1"), storageKey: `${cen.tenantA}/d14-a1-${randomUUID()}.png` };
    const marcadoA1 = await repositorio.markFileStored(cen.tenantA, cen.usuarioA1, codigo, arquivoDeA1);
    assert.equal(marcadoA1.outcome, "updated", "A1 guarda o próprio arquivo");

    // O gestor da MESMA organização manda o mesmo código: não é `duplicate`, é linha nova dele.
    assert.equal(
      await repositorio.findByClientEvidenceId(cen.tenantA, cen.gestorA, codigo),
      undefined,
      "o recibo do gestor não é o de A1 (o usuário faz parte da chave)",
    );
    const doGestor = await repositorio.createAccepted(entradaAceita(cen, codigo, { actorUserId: cen.gestorA }));
    assert.equal(doGestor.outcome, "created", "o gestor recebe created, não already_applied nem conflict");

    const arquivoDoGestor = { ...arquivoGuardado("d14-gestor"), storageKey: `${cen.tenantA}/d14-gestor-${randomUUID()}.png` };
    const marcadoGestor = await repositorio.markFileStored(cen.tenantA, cen.gestorA, codigo, arquivoDoGestor);
    assert.equal(marcadoGestor.outcome, "updated");
    if (marcadoGestor.outcome !== "updated") return;
    assert.equal(marcadoGestor.record.fileId, arquivoDoGestor.fileId, "o gestor grava na linha DELE");
    assert.equal(marcadoGestor.record.actorUserId, cen.gestorA);

    const linhas = (await db.$queryRawUnsafe(
      `SELECT actor_user_id::text, file_status, file_id, storage_key::text FROM ${TABLE}
        WHERE tenant_id = $1::uuid AND client_evidence_id = $2 ORDER BY actor_user_id::text`,
      cen.tenantA,
      codigo,
    )) as Array<{ actor_user_id: string; file_status: string; file_id: string | null; storage_key: string | null }>;
    assert.equal(linhas.length, 2, "2 linhas no banco, uma por usuário");
    const deA1NoBanco = linhas.find((linha) => linha.actor_user_id === cen.usuarioA1)!;
    assert.deepEqual(
      { status: deA1NoBanco.file_status, fileId: deA1NoBanco.file_id, chave: deA1NoBanco.storage_key },
      { status: "stored", fileId: arquivoDeA1.fileId, chave: arquivoDeA1.storageKey },
      "a linha de A1 não mudou",
    );

    // REFORÇO medido (diário, MU2b aplicada um ponto por vez — §E1.6): com o cenário acima o ponto
    // `markFileStored` sobrevive, porque a linha de A1 já está `stored` e a condição da troca condicional
    // a exclui do `where` mesmo sem o usuário. O que mata a mutação é o MESMO cenário do plano com as
    // DUAS linhas ainda em `awaiting_file`: sem o usuário no `where`, o `updateMany` casa as duas e o
    // arquivo do gestor vaza para a linha de A1. §E1.8: "sobrevivente é teste a reforçar".
    const codigoAmbos = `cev-${randomUUID()}`;
    const criadoA1 = await repositorio.createAccepted(entradaAceita(cen, codigoAmbos));
    const criadoGestor = await repositorio.createAccepted(entradaAceita(cen, codigoAmbos, { actorUserId: cen.gestorA }));
    assert.equal(criadoA1.outcome, "created");
    assert.equal(criadoGestor.outcome, "created");

    const arquivoGestor2 = { ...arquivoGuardado("d14-reforco"), storageKey: `${cen.tenantA}/d14-reforco-${randomUUID()}.png` };
    const marcadoGestor2 = await repositorio.markFileStored(cen.tenantA, cen.gestorA, codigoAmbos, arquivoGestor2);
    assert.equal(marcadoGestor2.outcome, "updated");
    if (marcadoGestor2.outcome !== "updated") return;
    assert.equal(marcadoGestor2.record.actorUserId, cen.gestorA, "a troca aconteceu na linha do gestor");

    const [linhaA1Intacta] = (await db.$queryRawUnsafe(
      `SELECT file_status, file_id, storage_key::text FROM ${TABLE} WHERE id = $1::uuid`,
      criadoA1.outcome === "created" ? criadoA1.record.id : "",
    )) as Array<{ file_status: string; file_id: string | null; storage_key: string | null }>;
    assert.deepEqual(
      linhaA1Intacta,
      { file_status: "awaiting_file", file_id: null, storage_key: null },
      "o arquivo do gestor NÃO vazou para a linha de A1, que segue aguardando o próprio arquivo",
    );

    const arquivoA1 = { ...arquivoGuardado("d14-a1-reforco"), storageKey: `${cen.tenantA}/d14-a1-reforco-${randomUUID()}.png` };
    const marcadoA1Ref = await repositorio.markFileStored(cen.tenantA, cen.usuarioA1, codigoAmbos, arquivoA1);
    assert.equal(marcadoA1Ref.outcome, "updated", "A1 guarda o próprio arquivo na própria linha");
    if (marcadoA1Ref.outcome !== "updated") return;
    assert.equal(marcadoA1Ref.record.fileId, arquivoA1.fileId);

    const [linhaGestorIntacta] = (await db.$queryRawUnsafe(
      `SELECT file_id FROM ${TABLE} WHERE id = $1::uuid`,
      criadoGestor.outcome === "created" ? criadoGestor.record.id : "",
    )) as Array<{ file_id: string | null }>;
    assert.equal(linhaGestorIntacta!.file_id, arquivoGestor2.fileId, "e a linha do gestor não foi sobrescrita pela de A1");
  });

  // =============================================================================================
  // D15 (a) e (b), camada banco — o CHECK das chaves do metadado, em todos os níveis, sem diferenciar
  // maiúsculas. A metade (c), pela rota, é da F5.
  // =============================================================================================
  test("[D15 a/b] o CHECK das chaves do metadado recusa cada nome proibido no topo, em objeto, em array e em array de array, e aceita os controles", async () => {
    const cen = await cenarioFixo();
    const formas = (chave: string): Array<Record<string, unknown>> => [
      { [chave]: "valor", note: "topo" },
      { aninhado: { [chave]: "valor" }, note: "dentro de objeto" },
      { lista: [{ [chave]: "valor" }], note: "dentro de array" },
      { lista: [[{ [chave]: "valor" }]], note: "dentro de array de array" },
    ];

    for (const chave of CHAVES_RECUSADAS_PELO_BANCO) {
      for (const [indice, metadata] of formas(chave).entries()) {
        await esperarViolacao(
          inserirDireto(cen.tenantA, {
            tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: `cev-${randomUUID()}`,
            workOrderId: cen.osA, metadata,
          }),
          "23514",
          `D15(a) chave "${chave}" na forma ${indice}`,
          METADATA_KEYS_CHECK,
        );
      }
    }

    const codigoAceito = `cev-${randomUUID()}`;
    // (b) controles: o metadado legítimo do app, a palavra proibida num VALOR e chaves só parecidas.
    await inserirDireto(cen.tenantA, {
      tenantId: cen.tenantA, actorUserId: cen.usuarioA1, clientEvidenceId: codigoAceito, workOrderId: cen.osA,
      metadata: { note: "o token do portão quebrou", tokens: ["lista", "permitida"], pathway: "caminho", file_path_label: "rótulo" },
    });
    assert.equal(await contarLinhas(cen.tenantA, codigoAceito), 1, "os controles são aceitos");
  });

  // =============================================================================================
  // D16 (camada repositório) — erro de DADO do banco no createAccepted nunca é 503: vira `invalid`
  // com o reason certo. A metade "pela rota" é da F5. É o que mata a MU19.
  // =============================================================================================
  test("[D16] createAccepted classifica o erro de dado do banco: teto vira metadata_too_large, nulo vira metadata_not_storable, e a ação sadia entra", async () => {
    const sync = await moduloSync();
    const cen = await cenarioFixo();
    const repositorio = sync.resolveMobileEvidenceRepository();

    // (a) a FAIXA: o JSON compacto cabe no teto do serviço, o texto do JSONB não cabe no teto do banco.
    const lista = Array.from({ length: 6000 }, (_, indice) => indice % 10);
    const metadataFaixa = { lista } as Record<string, unknown>;
    const compacto = Buffer.byteLength(JSON.stringify(metadataFaixa), "utf8");
    const noBanco = await bytesDoJsonbNoBanco(metadataFaixa);
    assert.ok(compacto <= METADATA_MAX_BYTES, `o JSON compacto (${compacto} bytes) cabe no teto do serviço`);
    assert.ok(noBanco > METADATA_MAX_BYTES, `o texto do JSONB (${noBanco} bytes) ESTÁ acima do teto do banco: é a faixa do §E1.4`);
    const codigoFaixa = `cev-${randomUUID()}`;
    const resultadoFaixa = await repositorio.createAccepted(entradaAceita(cen, codigoFaixa, { metadata: metadataFaixa }));
    assert.deepEqual(resultadoFaixa, { outcome: "invalid", reason: "metadata_too_large" }, "a faixa vira metadata_too_large, nunca 503");
    assert.equal(await contarLinhas(cen.tenantA, codigoFaixa), 0, "nenhuma linha da ação recusada pelo teto");

    // (b) o caractere nulo (U+0000) dentro de um texto: o JSONB não o guarda.
    const codigoNulo = `cev-${randomUUID()}`;
    const resultadoNulo = await repositorio.createAccepted(
      entradaAceita(cen, codigoNulo, { metadata: { note: "antes\u0000depois" } as Record<string, unknown> }),
    );
    assert.deepEqual(resultadoNulo, { outcome: "invalid", reason: "metadata_not_storable" }, "o nulo vira metadata_not_storable, nunca 503");
    assert.equal(await contarLinhas(cen.tenantA, codigoNulo), 0, "nenhuma linha da ação com nulo");

    // (c) a ação sadia, depois das duas.
    const codigoSadio = `cev-${randomUUID()}`;
    const resultadoSadio = await repositorio.createAccepted(entradaAceita(cen, codigoSadio));
    assert.equal(resultadoSadio.outcome, "created", "a ação sadia é aceita");
    assert.equal(await contarLinhas(cen.tenantA, codigoSadio), 1, "com linha no banco");
  });

  // =============================================================================================
  // F5 — OS CASOS "PELA ROTA" (§8.4): o app inteiro (`createApp`) em modo `prisma`, com o recibo de
  // idempotência e a linha no PostgreSQL REAL e o binário num provedor local temporário. São os casos
  // que a F2b declarou como desta fatia: D1(rota), D2, D3, D4 (+ o complemento do §A1.2), D10 (as 2
  // rotas de leitura da F4 + o complemento da §E1.8), D13, D15(c) e D16(rota).
  //
  // REGIME, declarado: o app fala pela conexão que `src/database/prisma.ts` resolve — a do administrador
  // do cluster, que é SUPERUSER e portanto contorna o RLS. É a MESMA conexão que o D8 usa de propósito,
  // para provar que o filtro de organização mora no CÓDIGO do repositório e não só na política. O papel
  // efêmero NOSUPERUSER NOBYPASSRLS continua sendo o dos casos de SQL e de política (D7, D9, D11,
  // D15 a/b); o escopo entre organizações das 2 rotas novas SOB O PAPEL SEM BYPASS é provado pelo oráculo
  // do B-WO-LEITURA com banco (`tests/wo-leitura-scope-db.test.ts`, R19 e R20 — §8.5).
  //
  // AUTENTICAÇÃO: os cabeçalhos legados de dev/test (`x-tenant-id`/`x-user-id`/`x-role`), o idioma de
  // `tests/b-comissao-motor-liberacao-db.test.ts` em modo prisma; as permissões vêm do catálogo pelo papel.
  // ARMAZENAMENTO: a costura de teste do upload com um provedor local que CONTA as chamadas a `save` (o
  // espião do §A1.2), sobre o MESMO diretório que a fábrica da leitura resolve pelo env congelado.
  // SCANNER: o stub "clean" — o antivírus é o objeto do U1 a U11 e do B-108, não destes casos.
  // =============================================================================================
  const ROTA_SYNC = "/api/v1/mobile/sync/evidence-actions";
  const ROTA_UPLOAD = "/api/v1/mobile/evidence-uploads";
  const CAPTURADO_EM = "2026-11-27T12:01:00.000Z";
  const rotaLista = (workOrderId: string): string => `/api/v1/work-orders/${workOrderId}/evidences`;
  const rotaDownload = (workOrderId: string, evidenceId: string): string =>
    `/api/v1/work-orders/${workOrderId}/evidences/${evidenceId}/download`;

  // §E1.3: a lista do SERVIÇO é a expressão do banco menos o par da organização (as 3 últimas entradas).
  const NOMES_RECUSADOS_PELO_SERVICO: readonly string[] = CHAVES_RECUSADAS_PELO_BANCO.slice(
    0,
    CHAVES_RECUSADAS_PELO_BANCO.length - 3,
  );

  function sha256Hex(bytes: Buffer): string {
    return createHash("sha256").update(bytes).digest("hex");
  }

  let uploadModule: typeof import("../src/modules/mobile/mobile-evidence-upload.js") | undefined;

  async function moduloUpload(): Promise<typeof import("../src/modules/mobile/mobile-evidence-upload.js")> {
    uploadModule ??= await import("../src/modules/mobile/mobile-evidence-upload.js");
    return uploadModule;
  }

  type ArmazenamentoContador = { provider: unknown; saves: () => number; deletes: () => number };

  let armazenamentoContador: ArmazenamentoContador | undefined;

  async function armazenamento(): Promise<ArmazenamentoContador> {
    if (armazenamentoContador) return armazenamentoContador;
    const { LocalChecklistStorageProvider } = await import("../src/modules/checklists/storage/local-checklist-storage.provider.js");
    const interno = new LocalChecklistStorageProvider(DIRETORIO_DE_ARMAZENAMENTO);
    let saves = 0;
    let deletes = 0;
    armazenamentoContador = {
      provider: {
        name: "local" as const,
        async save(input: unknown) {
          saves += 1;
          return interno.save(input as never);
        },
        async getObject(input: unknown) {
          return interno.getObject(input as never);
        },
        async deleteObject(input: unknown) {
          deletes += 1;
          return interno.deleteObject(input as never);
        },
      },
      saves: () => saves,
      deletes: () => deletes,
    };
    return armazenamentoContador;
  }

  let servidor: Server | undefined;
  let base: string | undefined;

  async function subirApp(): Promise<string> {
    const [{ createApp }, coreSaas] = await Promise.all([
      import("../src/app.js"),
      import("../src/modules/core-saas/index.js"),
    ]);
    const server: Server = createApp(await coreSaas.createCoreSaasService()).listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    servidor = server;
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    return base;
  }

  async function derrubarApp(): Promise<void> {
    const server = servidor;
    servidor = undefined;
    base = undefined;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  /** O `reset` do upload zera o scanner e MANTÉM a costura; aqui as duas são (re)aplicadas de propósito. */
  async function aplicarCosturas(): Promise<void> {
    const upload = await moduloUpload();
    const { provider } = await armazenamento();
    upload.configureMobileEvidenceUploadStorageForTests({ provider } as never);
    upload.configureMobileEvidenceUploadScannerForTests({ scan: async () => ({ status: "clean" as const }) } as never);
  }

  async function apiRota(): Promise<string> {
    if (base) return base;
    const url = await subirApp();
    await aplicarCosturas();
    return url;
  }

  /**
   * O "reinício" do §8.4 (D2, D3, D4): o processo é OUTRO — o servidor cai, os runtimes que viviam só na
   * RAM zeram e os serviços são recriados. O que é durável fica: a linha no Postgres e o objeto no
   * armazenamento. É exatamente isso que o bloco garante (na base sem o índice, o upload respondia 409
   * `evidence_metadata_required` depois do reinício).
   */
  async function reiniciar(): Promise<string> {
    await derrubarApp();
    const [sync, upload, workOrders] = await Promise.all([
      moduloSync(),
      moduloUpload(),
      import("../src/modules/work-orders/index.js"),
    ]);
    sync.resetMobileEvidenceSyncRuntimeForTests();
    await upload.resetMobileEvidenceUploadRuntimeForTests();
    workOrders.resetWorkOrderRuntimeForTests();
    const url = await subirApp();
    await aplicarCosturas();
    return url;
  }

  function cabecalhosRota(tenantId: string, userId: string, papel: string): Record<string, string> {
    return { "x-tenant-id": tenantId, "x-user-id": userId, "x-role": papel };
  }

  type RespostaHttp = {
    status: number;
    /** `status:code:reason` — a chave que compara a resposta com a do inexistente (o idioma do censo). */
    k: string;
    texto: string;
    corpo: any;
    buf: Buffer;
    contentType: string;
    disposition: string;
  };

  async function chamar(
    caminho: string,
    init: { method?: string; headers?: Record<string, string>; body?: BodyInit } = {},
  ): Promise<RespostaHttp> {
    const url = await apiRota();
    const resposta = await fetch(`${url}${caminho}`, {
      method: init.method ?? "GET",
      headers: { connection: "close", ...init.headers },
      ...(init.body === undefined ? {} : { body: init.body }),
      signal: AbortSignal.timeout(60_000),
    });
    const buf = Buffer.from(await resposta.arrayBuffer());
    const texto = buf.toString("utf8");
    let corpo: any = null;
    try {
      corpo = texto ? JSON.parse(texto) : null;
    } catch {
      corpo = null;
    }
    return {
      status: resposta.status,
      k: `${resposta.status}:${corpo?.error?.code ?? ""}:${corpo?.error?.reason ?? ""}`,
      texto,
      corpo,
      buf,
      contentType: resposta.headers.get("content-type") ?? "",
      disposition: resposta.headers.get("content-disposition") ?? "",
    };
  }

  async function chamarJson(
    caminho: string,
    headers: Record<string, string>,
    method = "GET",
    body?: unknown,
  ): Promise<RespostaHttp> {
    return chamar(caminho, {
      method,
      headers: { "content-type": "application/json", ...headers },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  }

  async function syncarRota(
    tenantId: string,
    userId: string,
    papel: string,
    actions: readonly Record<string, unknown>[],
  ): Promise<RespostaHttp> {
    return chamarJson(ROTA_SYNC, cabecalhosRota(tenantId, userId, papel), "POST", {
      client_batch_id: `f5-${randomUUID()}`,
      actions,
    });
  }

  async function enviarArquivoRota(
    tenantId: string,
    userId: string,
    papel: string,
    entrada: { evidenceId: string; clientEvidenceId: string; bytes: Buffer; mimeType?: string },
  ): Promise<RespostaHttp & { dados: any }> {
    const mimeType = entrada.mimeType ?? "image/png";
    const form = new FormData();
    form.append("evidence_id", entrada.evidenceId);
    form.append("client_evidence_id", entrada.clientEvidenceId);
    form.append("sha256", sha256Hex(entrada.bytes));
    form.append("size_bytes", String(entrada.bytes.length));
    form.append("content_type", mimeType);
    form.append("file", new Blob([entrada.bytes], { type: mimeType }), "arquivo.png");
    const resposta = await chamar(ROTA_UPLOAD, {
      method: "POST",
      headers: cabecalhosRota(tenantId, userId, papel),
      body: form,
    });
    return { ...resposta, dados: resposta.corpo?.data ?? resposta.corpo };
  }

  function camposDeArquivo(bytes: Buffer, mimeType = "image/png"): Record<string, unknown> {
    return { file_name: "arquivo.png", content_type: mimeType, size_bytes: bytes.length, sha256: sha256Hex(bytes) };
  }

  function acaoObservacaoOs(
    codigo: string,
    workOrderId: string,
    note: string,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      client_evidence_id: codigo,
      type: "evidence.work_order_observation",
      local_created_at: CAPTURADO_EM,
      payload: { work_order_id: workOrderId, note, ...extra },
    };
  }

  function acaoFotoOs(codigo: string, workOrderId: string, bytes: Buffer = PNG_BYTES): Record<string, unknown> {
    return {
      client_evidence_id: codigo,
      type: "evidence.work_order_photo",
      local_created_at: CAPTURADO_EM,
      payload: { work_order_id: workOrderId, ...camposDeArquivo(bytes) },
    };
  }

  function acaoAssinaturaOs(
    codigo: string,
    workOrderId: string,
    signerName: string,
    bytes: Buffer = PNG_BYTES,
  ): Record<string, unknown> {
    return {
      client_evidence_id: codigo,
      type: "evidence.work_order_signature",
      local_created_at: CAPTURADO_EM,
      payload: { work_order_id: workOrderId, signer_name: signerName, ...camposDeArquivo(bytes) },
    };
  }

  async function linhaNoBanco(tenantId: string, codigo: string): Promise<Record<string, any> | undefined> {
    const db = await adminClient();
    const linhas = (await db.$queryRawUnsafe(
      `SELECT id::text, tenant_id::text, actor_user_id::text, client_evidence_id, action_type, scope, kind,
              work_order_id::text, metadata, fingerprint_sha256, file_status, file_id, storage_provider,
              storage_key, mime_type, size_bytes, checksum_sha256, stored_at, deleted_at
         FROM ${TABLE} WHERE tenant_id = $1::uuid AND client_evidence_id = $2`,
      tenantId,
      codigo,
    )) as Array<Record<string, any>>;
    return linhas[0];
  }

  async function contarLinhasPorPrefixo(tenantId: string, prefixo: string): Promise<number> {
    const db = await adminClient();
    const [linha] = (await db.$queryRawUnsafe(
      `SELECT count(*)::int AS n FROM ${TABLE} WHERE tenant_id = $1::uuid AND client_evidence_id LIKE $2`,
      tenantId,
      `${prefixo}%`,
    )) as Array<{ n: number }>;
    return linha!.n;
  }

  /** Os objetos guardados no diretório do armazenamento, em ordem absoluta: é o "1 objeto" do D4. */
  function objetosGuardados(): string[] {
    if (!existsSync(DIRETORIO_DE_ARMAZENAMENTO)) return [];
    return readdirSync(DIRETORIO_DE_ARMAZENAMENTO, { recursive: true, withFileTypes: true })
      .filter((entrada) => entrada.isFile())
      .map((entrada) => path.join(entrada.parentPath ?? (entrada as { path: string }).path, entrada.name))
      .sort();
  }

  // =============================================================================================
  // D1 (pela rota) — o sync pela rota real, em modo `prisma`, grava a linha no Postgres.
  // =============================================================================================
  test("[D1 rota] o sync pela rota real, em modo prisma, grava as 3 linhas no Postgres com as colunas certas", async () => {
    const cen = await cenarioFixo();
    const codigoObs = `f5-d1-obs-${randomUUID()}`;
    const codigoFoto = `f5-d1-foto-${randomUUID()}`;
    const codigoSign = `f5-d1-sign-${randomUUID()}`;

    const resposta = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [
      acaoObservacaoOs(codigoObs, cen.osA, "Portão fechado."),
      acaoFotoOs(codigoFoto, cen.osA),
      acaoAssinaturaOs(codigoSign, cen.osA, "Quem Assinou"),
    ]);
    assert.equal(resposta.status, 200, resposta.texto);
    assert.equal(resposta.corpo.data.summary.accepted, 3, resposta.texto);
    assert.equal(resposta.corpo.data.summary.rejected, 0, resposta.texto);
    assert.equal(resposta.corpo.data.summary.conflicts, 0, resposta.texto);
    assert.equal(resposta.corpo.data.summary.already_applied, 0, resposta.texto);

    const obs = await linhaNoBanco(cen.tenantA, codigoObs);
    assert.ok(obs, "a observação existe no Postgres, não só na RAM do processo");
    assert.equal(obs!.tenant_id, cen.tenantA);
    assert.equal(obs!.actor_user_id, cen.gestorA, "o ator da linha é o ator autenticado, nunca o payload");
    assert.equal(obs!.action_type, "evidence.work_order_observation");
    assert.deepEqual(
      { scope: obs!.scope, kind: obs!.kind, file_status: obs!.file_status },
      { scope: "work_order", kind: "observation", file_status: "none" },
    );
    assert.equal(obs!.work_order_id, cen.osA);
    assert.equal((obs!.metadata as Record<string, unknown>).note, "Portão fechado.");
    assert.equal(obs!.file_id, null);
    assert.equal(obs!.storage_provider, null);
    assert.equal(obs!.storage_key, null);
    assert.equal(obs!.deleted_at, null);
    assert.match(String(obs!.fingerprint_sha256), /^[a-f0-9]{64}$/, "a impressão digital do recibo");

    const foto = await linhaNoBanco(cen.tenantA, codigoFoto);
    assert.ok(foto, "a foto existe no Postgres");
    assert.deepEqual(
      { scope: foto!.scope, kind: foto!.kind, file_status: foto!.file_status },
      { scope: "work_order", kind: "photo", file_status: "awaiting_file" },
      "com arquivo por vir: `awaiting_file` e nenhuma coluna de arquivo",
    );
    assert.equal((foto!.metadata as Record<string, unknown>).sha256, sha256Hex(PNG_BYTES));
    assert.equal(foto!.size_bytes, null);
    assert.equal(foto!.checksum_sha256, null);

    const assinatura = await linhaNoBanco(cen.tenantA, codigoSign);
    assert.ok(assinatura, "a assinatura existe no Postgres");
    assert.equal(assinatura!.kind, "signature");
    assert.equal((assinatura!.metadata as Record<string, unknown>).signer_name, "Quem Assinou");

    const recibos = resposta.corpo.data.accepted as Array<Record<string, unknown>>;
    assert.equal(recibos.length, 3, "os 3 recibos voltam no lote");
    assert.ok(
      new Set([obs!.id, foto!.id, assinatura!.id]).size === 3,
      "cada ação tem a SUA linha no índice",
    );
  });

  // =============================================================================================
  // D2 — reinício: o mesmo lote volta `already_applied`, com o MESMO recibo, e a linha não dobra.
  // =============================================================================================
  test("[D2] reinício: o mesmo lote volta already_applied com o mesmo recibo, e continua 1 linha por ação", async () => {
    const cen = await cenarioFixo();
    const codigo = `f5-d2-${randomUUID()}`;
    const acao = acaoObservacaoOs(codigo, cen.osA, "Registrada antes do reinício.");

    const antes = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [acao]);
    assert.equal(antes.status, 200, antes.texto);
    assert.equal(antes.corpo.data.summary.accepted, 1, antes.texto);
    const recibo = antes.corpo.data.accepted[0].evidence_id as string;
    assert.ok(recibo, "o recibo veio na resposta");

    await reiniciar();

    const depois = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [acao]);
    assert.equal(depois.status, 200, depois.texto);
    assert.equal(depois.corpo.data.summary.accepted, 0, "nada é aceito de novo depois do reinício");
    assert.equal(depois.corpo.data.summary.already_applied, 1, depois.texto);
    assert.equal(depois.corpo.data.summary.conflicts, 0, "a mesma impressão digital não é conflito");
    assert.equal(depois.corpo.data.summary.rejected, 0, depois.texto);
    assert.equal(depois.corpo.data.already_applied[0].evidence_id, recibo, "o recibo é o MESMO de antes");
    assert.equal(depois.corpo.data.already_applied[0].status, "already_applied");
    assert.equal(await contarLinhas(cen.tenantA, codigo), 1, "1 linha só: o reinício não dobra o recibo");
  });

  // =============================================================================================
  // D3 — reinício NO MEIO: sync → reinício → upload. Na base sem o índice o upload respondia 409
  //      `evidence_metadata_required`; com o índice durável ele responde 201 `stored`.
  // =============================================================================================
  test("[D3] reinício no meio: sync → reinício → upload responde 201 stored e a linha vira stored no banco", async () => {
    const cen = await cenarioFixo();
    const codigo = `f5-d3-${randomUUID()}`;
    const antes = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [acaoFotoOs(codigo, cen.osA)]);
    assert.equal(antes.status, 200, antes.texto);
    assert.equal(antes.corpo.data.summary.accepted, 1, antes.texto);
    const evidenceId = antes.corpo.data.accepted[0].evidence_id as string;

    await reiniciar();

    const envio = await enviarArquivoRota(cen.tenantA, cen.gestorA, "tenant_admin", {
      evidenceId,
      clientEvidenceId: codigo,
      bytes: PNG_BYTES,
    });
    assert.equal(envio.status, 201, envio.texto);
    assert.equal(envio.dados.status, "stored");

    const linha = await linhaNoBanco(cen.tenantA, codigo);
    assert.ok(linha, "a linha do recibo sobreviveu ao reinício");
    assert.equal(linha!.file_status, "stored");
    assert.equal(linha!.file_id, envio.dados.file_id);
    assert.equal(linha!.storage_provider, "local");
    assert.ok(
      String(linha!.storage_key).startsWith(`${cen.tenantA}/`),
      `a chave começa pela organização da linha: ${linha!.storage_key}`,
    );
    assert.equal(linha!.mime_type, "image/png");
    assert.equal(linha!.size_bytes, PNG_BYTES.length);
    assert.equal(linha!.checksum_sha256, sha256Hex(PNG_BYTES));
    assert.ok(linha!.stored_at instanceof Date, "stored_at gravado");
  });

  // =============================================================================================
  // D4 — reinício → reenvio do upload já guardado: 201 com o MESMO `file_id`, 1 objeto, e (complemento
  //      do §A1.2) ZERO chamada ao `provider.save` no reenvio.
  // =============================================================================================
  test("[D4] reinício e reenvio do upload já guardado: 201 com o mesmo file_id, 1 objeto e 0 save no reenvio", async () => {
    const cen = await cenarioFixo();
    const codigo = `f5-d4-${randomUUID()}`;
    const lote = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [acaoFotoOs(codigo, cen.osA)]);
    assert.equal(lote.status, 200, lote.texto);
    assert.equal(lote.corpo.data.summary.accepted, 1, lote.texto);
    const evidenceId = lote.corpo.data.accepted[0].evidence_id as string;

    const primeiro = await enviarArquivoRota(cen.tenantA, cen.gestorA, "tenant_admin", {
      evidenceId,
      clientEvidenceId: codigo,
      bytes: PNG_BYTES,
    });
    assert.equal(primeiro.status, 201, primeiro.texto);
    assert.equal(primeiro.dados.status, "stored");
    const fileId = primeiro.dados.file_id as string;
    assert.ok(fileId, "o file_id veio na resposta");

    const objetosAntes = objetosGuardados();
    const savesAntes = (await armazenamento()).saves();
    assert.equal(savesAntes >= 1, true, "o primeiro envio gravou o objeto");

    await reiniciar();

    const reenvio = await enviarArquivoRota(cen.tenantA, cen.gestorA, "tenant_admin", {
      evidenceId,
      clientEvidenceId: codigo,
      bytes: PNG_BYTES,
    });
    assert.equal(reenvio.status, 201, reenvio.texto);
    assert.equal(reenvio.dados.status, "stored");
    assert.equal(reenvio.dados.file_id, fileId, "o reenvio devolve o MESMO file_id");

    const savesDepois = (await armazenamento()).saves();
    assert.equal(savesDepois - savesAntes, 0, "o reenvio NÃO grava o objeto de novo (§A1.2)");
    assert.deepEqual(objetosGuardados(), objetosAntes, "1 objeto só: nenhum arquivo novo no armazenamento");
    assert.equal(await contarLinhas(cen.tenantA, codigo), 1, "1 linha só: o reenvio não dobra o índice");
    const linha = await linhaNoBanco(cen.tenantA, codigo);
    assert.equal(linha!.file_id, fileId, "a linha continua com o file_id do primeiro envio");
  });

  // =============================================================================================
  // D10 (pelas 2 rotas) — gestor, A1 atribuído, A2 não atribuído e organização B: os mesmos resultados
  //      de L1 a L4, mais o complemento da §E1.8 (a linha com `deleted_at` some da lista e o download
  //      dela dá 404 `evidence_not_found`).
  // =============================================================================================
  test("[D10 rota] as 2 rotas de leitura com banco repetem L1 a L4, e a evidência excluída some da lista e do download", async () => {
    const cen = await cenarioFixo();
    // OS EXCLUSIVA deste caso, já atribuída ao A1: a lista da evidência é por OS, e a OS-A do cenário
    // carrega a evidência dos outros casos (D1, D2, D3, D4, D15c e D16).
    const osD10 = await criarOs(cen.tenantA, `OS-INDICE-D10-${randomUUID().replaceAll("-", "").slice(0, 8)}`, cen.usuarioA1);
    const codigoObs = `f5-d10-obs-${randomUUID()}`;
    const codigoSign = `f5-d10-sign-${randomUUID()}`;
    const codigoFoto = `f5-d10-foto-${randomUUID()}`;

    const lote = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [
      acaoObservacaoOs(codigoObs, osD10, "Portão fechado."),
      acaoAssinaturaOs(codigoSign, osD10, "Quem Assinou"),
      acaoFotoOs(codigoFoto, osD10),
    ]);
    assert.equal(lote.status, 200, lote.texto);
    assert.equal(lote.corpo.data.summary.accepted, 3, lote.texto);
    const reciboPorCodigo = new Map<string, string>(
      (lote.corpo.data.accepted as Array<Record<string, string>>).map((item) => [item.client_evidence_id, item.evidence_id]),
    );
    for (const codigo of [codigoSign, codigoFoto]) {
      const envio = await enviarArquivoRota(cen.tenantA, cen.gestorA, "tenant_admin", {
        evidenceId: reciboPorCodigo.get(codigo) as string,
        clientEvidenceId: codigo,
        bytes: PNG_BYTES,
      });
      assert.equal(envio.status, 201, `setup do upload ${codigo}: ${envio.texto}`);
    }
    const idDaFoto = String((await linhaNoBanco(cen.tenantA, codigoFoto))!.id);

    // L1 com banco — o gestor lista as 3 evidências, com os campos do §5.3.
    const gestor = cabecalhosRota(cen.tenantA, cen.gestorA, "tenant_admin");
    const listaGestor = await chamarJson(rotaLista(osD10), gestor);
    assert.equal(listaGestor.status, 200, listaGestor.texto);
    const itens = listaGestor.corpo.data.items as Array<Record<string, any>>;
    assert.equal(itens.length, 3, listaGestor.texto);
    assert.deepEqual(
      itens.map((item) => item.kind).sort(),
      ["observation", "photo", "signature"],
    );
    const observacao = itens.find((item) => item.kind === "observation")!;
    assert.equal(observacao.note, "Portão fechado.");
    assert.equal(observacao.file, null, "a observação não tem arquivo (§3.1: file_status = none)");
    const foto = itens.find((item) => item.kind === "photo")!;
    assert.equal(foto.file.status, "stored");
    assert.equal(foto.file.mimeType, "image/png", "o tipo VERIFICADO no upload, não o declarado pelo cliente");
    assert.equal(foto.file.sizeBytes, PNG_BYTES.length);
    assert.equal(foto.file.downloadPath, rotaDownload(osD10, foto.id), "o caminho da rota do §5.1");
    assert.equal(foto.capturedAt, CAPTURADO_EM);
    assert.equal(foto.createdBy, cen.gestorA);
    assert.equal(foto.createdByName, "Gestor A", "o nome legível vem do banco, nunca o UUID");
    assert.equal(itens.find((item) => item.kind === "signature")!.signerName, "Quem Assinou");
    for (const proibido of [
      "storage_key",
      "storageKey",
      "storage_provider",
      "storageProvider",
      "checksum",
      "file_id",
      "fingerprint",
      "tenant_id",
      "client_evidence_id",
      "metadata",
    ]) {
      assert.equal(listaGestor.texto.includes(proibido), false, `a allowlist da §5.3 não expõe ${proibido}`);
    }

    // L2 com banco — A1, o técnico ATRIBUÍDO, lista e baixa; os bytes baixados são os enviados.
    const a1 = cabecalhosRota(cen.tenantA, cen.usuarioA1, "field_technician");
    const listaA1 = await chamarJson(rotaLista(osD10), a1);
    assert.equal(listaA1.status, 200, listaA1.texto);
    assert.equal((listaA1.corpo.data.items as unknown[]).length, 3, "o atribuído vê as 3 evidências da OS dele");
    const downloadA1 = await chamar(rotaDownload(osD10, idDaFoto), { headers: a1 });
    assert.equal(downloadA1.status, 200, downloadA1.texto);
    assert.equal(downloadA1.buf.equals(PNG_BYTES), true, "os bytes baixados são os enviados");
    assert.equal(downloadA1.contentType.startsWith("image/png"), true, `o tipo vem dos bytes: ${downloadA1.contentType}`);
    assert.equal(downloadA1.disposition.startsWith("attachment"), true, `sempre attachment: ${downloadA1.disposition}`);

    // L3 com banco — A2, NÃO atribuído: o mesmo status, código e reason de um UUID aleatório.
    const a2 = cabecalhosRota(cen.tenantA, cen.usuarioA2, "field_technician");
    const osAleatoria = randomUUID();
    const listaA2 = await chamarJson(rotaLista(osD10), a2);
    const listaInexistente = await chamarJson(rotaLista(osAleatoria), a2);
    assert.equal(listaA2.status, 404, listaA2.texto);
    assert.equal(listaA2.k, listaInexistente.k, "a OS alheia responde exatamente o que a inexistente responde");
    assert.equal(listaA2.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${listaA2.k}`);
    const downloadA2 = await chamarJson(rotaDownload(osD10, idDaFoto), a2);
    assert.equal(downloadA2.status, 404, downloadA2.texto);
    assert.equal(downloadA2.k, listaInexistente.k, "o download segue o mesmo 404 da lista");

    // L4 com banco — usuário da organização B, com work_orders:read, usando os ids da A.
    const b1 = cabecalhosRota(cen.tenantB, cen.usuarioB1, "tenant_admin");
    const listaB = await chamarJson(rotaLista(osD10), b1);
    const listaBInexistente = await chamarJson(rotaLista(osAleatoria), b1);
    assert.equal(listaB.status, 404, listaB.texto);
    assert.equal(listaB.k, listaBInexistente.k, "entre organizações, o 404 é idêntico ao do inexistente");
    assert.equal(listaB.k, "404:WORK_ORDER_NOT_FOUND:work_order_not_found", `§5.1: ${listaB.k}`);
    const downloadB = await chamarJson(rotaDownload(osD10, idDaFoto), b1);
    assert.equal(downloadB.status, 404, downloadB.texto);
    assert.equal(downloadB.k, listaBInexistente.k, "o id da evidência é VÁLIDO na A e mesmo assim não vaza");

    // Complemento da §E1.8 — `deleted_at` preenchido DIRETO no banco, no preparo do caso.
    const db = await adminClient();
    await db.$executeRawUnsafe(`UPDATE ${TABLE} SET deleted_at = now() WHERE id = $1::uuid`, idDaFoto);
    const listaSemExcluida = await chamarJson(rotaLista(osD10), gestor);
    assert.equal(listaSemExcluida.status, 200, listaSemExcluida.texto);
    const restantes = listaSemExcluida.corpo.data.items as Array<Record<string, any>>;
    assert.equal(restantes.length, 2, "a evidência excluída não aparece na lista");
    assert.equal(
      restantes.some((item) => item.id === idDaFoto),
      false,
      "a linha com deleted_at preenchido saiu da lista",
    );
    const downloadExcluida = await chamarJson(rotaDownload(osD10, idDaFoto), gestor);
    assert.equal(downloadExcluida.status, 404, downloadExcluida.texto);
    assert.equal(
      downloadExcluida.k,
      "404:WORK_ORDER_EVIDENCE_NOT_FOUND:evidence_not_found",
      `§E1.8: o download da excluída é 404 evidence_not_found — ${downloadExcluida.k}`,
    );
  });

  // =============================================================================================
  // D13 — ator autenticado sem linha em `users` daquela organização: a FK composta recusa o INSERT e a
  //       ação vai para `rejected` com 403 `user_required`. Nenhuma linha, nenhum 500, nenhum 503.
  // =============================================================================================
  test("[D13] ator sem linha em users daquela organização: rejected 403 user_required, nenhuma linha e nenhum 500", async () => {
    const cen = await cenarioFixo();
    const usuarioFantasma = randomUUID();
    const codigo = `f5-d13-${randomUUID()}`;

    const resposta = await syncarRota(cen.tenantA, usuarioFantasma, "field_technician", [
      {
        client_evidence_id: codigo,
        type: "evidence.field_observation",
        local_created_at: CAPTURADO_EM,
        payload: { note: "Ator sem linha em users desta organização." },
      },
    ]);

    assert.equal(resposta.status, 200, `o lote é 200 partial, nunca 500 nem 503: ${resposta.texto.slice(0, 300)}`);
    assert.equal(resposta.corpo.data.summary.accepted, 0, resposta.texto.slice(0, 300));
    assert.equal(resposta.corpo.data.summary.rejected, 1, resposta.texto.slice(0, 300));
    const recusada = (resposta.corpo.data.rejected as Array<Record<string, any>>)[0];
    assert.equal(recusada.client_evidence_id, codigo);
    assert.equal(recusada.status, "rejected");
    assert.equal(recusada.error.code, "FORBIDDEN", `403 user_required: ${JSON.stringify(recusada.error)}`);
    assert.equal(recusada.error.reason, "user_required", JSON.stringify(recusada.error));
    assert.equal(await contarLinhas(cen.tenantA, codigo), 0, "nenhuma linha: a FK do usuário recusou o INSERT");
  });

  // =============================================================================================
  // D15 (c) — pela ROTA com banco: os 23 nomes que o serviço recusa. Nenhum chega ao `CHECK` do banco
  //         como `metadata_not_storable`, e nenhum vira 503: a lista do serviço cobre a do banco.
  // =============================================================================================
  test("[D15 c] pela rota com banco, os 23 nomes recusados viram rejected unsafe_payload — nunca metadata_not_storable nem 503", async () => {
    const cen = await cenarioFixo();
    assert.equal(
      NOMES_RECUSADOS_PELO_SERVICO.length,
      23,
      "os 23 nomes do §E1.3: a lista do banco menos o par da organização",
    );
    const prefixo = `f5-d15c-${randomUUID().replaceAll("-", "").slice(0, 8)}`;
    const acoes = NOMES_RECUSADOS_PELO_SERVICO.map((nome, indice) =>
      acaoObservacaoOs(`${prefixo}-${indice}`, cen.osA, "Observação de controle.", { [nome]: "valor" }),
    );

    const resposta = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", acoes);
    assert.equal(resposta.status, 200, `o lote é 200 partial: ${resposta.texto.slice(0, 300)}`);
    assert.equal(resposta.corpo.data.summary.accepted, 0, resposta.texto.slice(0, 300));
    assert.equal(resposta.corpo.data.summary.rejected, 23, resposta.texto.slice(0, 300));
    const reasons = new Set(
      (resposta.corpo.data.rejected as Array<Record<string, any>>).map((item) => item.error.reason as string),
    );
    assert.deepEqual(
      [...reasons],
      ["unsafe_payload"],
      "a lista do serviço cobre a do banco: nada chega ao CHECK como metadata_not_storable",
    );
    assert.equal(await contarLinhasPorPrefixo(cen.tenantA, prefixo), 0, "nenhuma linha dos 23 recusados");
  });

  // =============================================================================================
  // D16 (pela rota) — o banco recusa, o serviço classifica e o lote segue 200: a faixa entre os dois
  //       tetos vira `metadata_too_large`, o caractere nulo vira `metadata_not_storable` e a ação sadia
  //       do mesmo lote é aceita, com linha. Nenhum 503 (é o que mata a MU19 pela rota).
  // =============================================================================================
  test("[D16 rota] pela rota com banco: a faixa vira metadata_too_large, o nulo metadata_not_storable, a sadia entra e o lote é 200", async () => {
    const cen = await cenarioFixo();
    const lista = Array.from({ length: 6000 }, (_, indice) => indice % 10);
    const codigoFaixa = `f5-d16-faixa-${randomUUID()}`;
    const codigoNulo = `f5-d16-nulo-${randomUUID()}`;
    const codigoSadio = `f5-d16-sadio-${randomUUID()}`;

    // A FAIXA do §E1.4: o JSON compacto cabe no teto do serviço; o texto do JSONB não cabe no teto do banco.
    const metadataDaFaixa = { work_order_id: cen.osA, note: "Faixa entre os dois tetos.", lista, kind: "observation" };
    const compacto = Buffer.byteLength(JSON.stringify(metadataDaFaixa), "utf8");
    const noBanco = await bytesDoJsonbNoBanco(metadataDaFaixa);
    assert.ok(compacto <= METADATA_MAX_BYTES, `o JSON compacto (${compacto} bytes) cabe no teto do serviço`);
    assert.ok(noBanco > METADATA_MAX_BYTES, `o texto do JSONB (${noBanco} bytes) ESTÁ acima do teto do banco`);

    const resposta = await syncarRota(cen.tenantA, cen.gestorA, "tenant_admin", [
      acaoObservacaoOs(codigoFaixa, cen.osA, "Faixa entre os dois tetos.", { lista }),
      acaoObservacaoOs(codigoNulo, cen.osA, "antes\u0000depois"),
      acaoObservacaoOs(codigoSadio, cen.osA, "A ação sadia, depois das duas."),
    ]);

    assert.equal(resposta.status, 200, `o lote é 200 partial, nunca 503: ${resposta.texto.slice(0, 300)}`);
    assert.equal(resposta.corpo.data.summary.accepted, 1, resposta.texto.slice(0, 300));
    assert.equal(resposta.corpo.data.summary.rejected, 2, resposta.texto.slice(0, 300));
    const reasonPorCodigo = new Map<string, string>(
      (resposta.corpo.data.rejected as Array<Record<string, any>>).map((item) => [
        item.client_evidence_id as string,
        item.error.reason as string,
      ]),
    );
    assert.equal(reasonPorCodigo.get(codigoFaixa), "metadata_too_large", "a faixa vira metadata_too_large");
    assert.equal(reasonPorCodigo.get(codigoNulo), "metadata_not_storable", "o nulo vira metadata_not_storable");
    assert.equal(
      (resposta.corpo.data.accepted as Array<Record<string, unknown>>)[0].client_evidence_id,
      codigoSadio,
      "a ação sadia, depois das duas recusadas, é aceita no mesmo lote",
    );
    assert.equal(await contarLinhas(cen.tenantA, codigoFaixa), 0, "nenhuma linha da ação recusada pelo teto");
    assert.equal(await contarLinhas(cen.tenantA, codigoNulo), 0, "nenhuma linha da ação com o caractere nulo");
    assert.equal(await contarLinhas(cen.tenantA, codigoSadio), 1, "a ação sadia tem linha no banco");
  });
}
