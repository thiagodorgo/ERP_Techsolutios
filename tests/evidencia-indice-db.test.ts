import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test, { after } from "node:test";

import { createPrismaClient } from "../src/database/pg-connection.js";
import { createEphemeralRole, type EphemeralRole } from "./helpers/auth-identity-fixture.js";

// -----------------------------------------------------------------------------------------------
// B-EVIDENCIA-INDICE · F2b — o repositório da evidência NO BANCO, com RLS (§8.4, casos D).
//
// Molde: `tests/b-material-sync-db.test.ts` (papel efêmero NOSUPERUSER NOBYPASSRLS do arnês, admin só
// semeia/observa/limpa, teardown escopado pelos ids do próprio teste) e
// `tests/b-aprov-duraveis-rls-db.test.ts`.
//
// CAMADA PROVADA AQUI, declarada: o REPOSITÓRIO Prisma com RLS e o BANCO. Os casos que o plano escreve
// "pela rota" (D1 a D4, D13, D15(c), D16 pela rota) dependem das rotas de leitura da F4 e do arnês HTTP
// com `CORE_SAAS_PERSISTENCE=prisma`, que é a fatia F5; aqui a MESMA propriedade é exercitada uma camada
// abaixo, chamando o repositório de verdade que a rota chama. Cada caso diz a camada em que está.
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
    const [tenantA] = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text`,
      `Organização Teste A ${sufixo}`,
    )) as Array<{ id: string }>;
    const [tenantB] = (await db.$queryRawUnsafe(
      `INSERT INTO tenants (name, slug) VALUES ($1, $1) RETURNING id::text`,
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
}
