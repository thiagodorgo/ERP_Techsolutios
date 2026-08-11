import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import {
  CHECKLIST_APPLICABILITY_ROLES,
  ChecklistApplicabilityError,
  type ChecklistApplicabilityRule,
} from "../src/modules/checklists/applicability/checklist-applicability.types.js";
import {
  InMemoryChecklistApplicabilityRepository,
  type ChecklistApplicabilityRepository,
} from "../src/modules/checklists/applicability/checklist-applicability.repository.js";
import { resolveChecklistApplicability } from "../src/modules/checklists/applicability/checklist-applicability.resolution.js";

// CHECKLIST P1 PR-04a — o repositório Prisma da REGRA DE APLICABILIDADE contra o PostgreSQL REAL.
//
// Por que contra o banco de verdade e não com um duplo de teste: os três invariantes que mais importam nesta
// fatia NÃO EXISTEM em JavaScript.
//
//   1. O conflito de bucket é do ÍNDICE (parcial, `NULLS NOT DISTINCT`) — um teste com repositório falso
//      provaria apenas que o falso sabe recusar;
//   2. o tri-state do `update` é semântica do Prisma (`undefined` some, `null` vira NULL) — um duplo devolve
//      o que o autor mandou devolver;
//   3. a violação de CHECK chega como erro CRU do driver, sem código no topo e com A LINHA INTEIRA (incluindo
//      `tenant_id`) dentro de `cause.detail` — o vazamento §2.8 só é observável com o Postgres na frente.
//
// E o teste de PARIDADE fecha a fatia: a mesma sequência de operações roda nos dois repositórios e as saídas
// têm de ser iguais. O vínculo será STICKY na criação da ordem de serviço; divergir aqui é congelar vistorias
// diferentes conforme o ambiente, sobre veículos que já foram coletados.
//
// Cada caso cria uma organização DESCARTÁVEL e a remove no `finally`, escopada pelo id que ele mesmo criou —
// nunca apagamento em massa por curinga na base viva (P-JUNTA-LIMPEZA-BASE-VIVA).

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  test("repositório Prisma da aplicabilidade exige DATABASE_URL", {
    skip: "Defina DATABASE_URL, suba o PostgreSQL e rode as migrações para executar este teste.",
  });
} else {
  const connection = connectionString;

  test("create: grava no banco e devolve o domínio com NULL traduzido para 'qualquer' (undefined)", async () => {
    await comCenario(connection, async ({ client, repo, cenario }) => {
      const regra = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateColeta,
        role: "collection",
        notes: "Exigência contratual do cliente",
        createdBy: cenario.userId,
      });

      assert.equal(regra.tenantId, cenario.tenantId);
      assert.equal(regra.role, "collection");
      assert.equal(regra.isActive, true, "regra nasce ativa quando o pedido não diz o contrário");
      assert.equal(regra.notes, "Exigência contratual do cliente");

      // O ponto que mata a resolução se for mapeado errado: coluna NULA é o VALOR "qualquer" e no domínio isso
      // é `undefined`. Um `null` vazando passaria em `rule.customerId !== undefined` e a regra curinga
      // deixaria de casar QUALQUER contexto — o administrador veria "cadastrei e nunca aparece".
      assert.equal(regra.customerId, undefined, "cliente em branco tem de chegar como undefined, nunca null");
      assert.equal(regra.serviceCatalogId, undefined);
      assert.equal(regra.serviceType, undefined);
      assert.equal(regra.deletedAt, undefined);

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 1, "a linha existe mesmo no banco (não só no objeto devolvido)");
      assert.equal(linhas[0]?.customer_id, null, "no banco continua NULL — a tradução é só na fronteira");
      assert.equal(linhas[0]?.id, regra.id);
    });
  });

  test("conflito de bucket vem do ÍNDICE do banco e volta como recusa de NEGÓCIO (409), não erro cru", async () => {
    await comCenario(connection, async ({ repo, cenario }) => {
      await repo.create({ tenantId: cenario.tenantId, templateId: cenario.templateColeta, role: "collection" });

      const erro = await capturar(() =>
        repo.create({ tenantId: cenario.tenantId, templateId: cenario.templateEntrega, role: "collection" }),
      );

      assert.ok(erro instanceof ChecklistApplicabilityError, "o P2002 do Prisma tem de virar recusa de negócio");
      assert.equal(erro.statusCode, 409);
      assert.equal(erro.reason, "applicability_bucket_conflict");

      // §2.8 — o que o `sendRouteError` publicaria. A mensagem crua do Prisma para este caso carrega o CAMINHO
      // ABSOLUTO do arquivo no servidor e o trecho da query; a do driver carrega o nome interno da constraint.
      assertSemVazamento(erro, cenario.tenantId);
    });
  });

  test("bucket: duas criações CONCORRENTES no mesmo bucket — o banco é a autoridade, não um SELECT prévio", async () => {
    await comCenario(connection, async ({ client, repo, cenario }) => {
      // Um `findFirst` antes do `create` (check-then-act) deixaria as DUAS passarem: as duas leem "bucket
      // livre" antes de qualquer escrita commitar. O índice único é o único ponto do sistema em que essa
      // corrida não existe — e o preço de perdê-la é uma ordem de serviço com duas vistorias de coleta
      // concorrentes, sem critério para escolher qual o técnico preenche.
      const [primeira, segunda] = await Promise.allSettled([
        repo.create({ tenantId: cenario.tenantId, templateId: cenario.templateColeta, role: "collection" }),
        repo.create({ tenantId: cenario.tenantId, templateId: cenario.templateEntrega, role: "collection" }),
      ]);

      const aceitas = [primeira, segunda].filter((resultado) => resultado.status === "fulfilled");
      const recusadas = [primeira, segunda].filter((resultado) => resultado.status === "rejected");

      assert.equal(aceitas.length, 1, "exatamente uma criação pode vencer o bucket");
      assert.equal(recusadas.length, 1);

      const erro = (recusadas[0] as PromiseRejectedResult).reason;
      assert.ok(erro instanceof ChecklistApplicabilityError);
      assert.equal(erro.reason, "applicability_bucket_conflict", "a perdedora recebe a recusa de negócio, não 500");

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 1, "o banco ficou com UMA regra — não houve escrita fantasma da perdedora");
    });
  });

  test("update é TRI-STATE: `undefined` não mexe, `null` limpa o eixo e volta a valer para qualquer", async () => {
    await comCenario(connection, async ({ client, repo, cenario }) => {
      const regra = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateColeta,
        role: "collection",
        customerId: cenario.customerId,
        notes: "Contrato 2026",
      });

      // (1) Editar SÓ as observações não pode encostar no cliente. Se `undefined` virasse `null` na descida, a
      // regra do cliente que PAGOU pela exigência viraria curinga e passaria a valer para todo mundo — em
      // silêncio, numa edição de texto.
      const soNotas = await repo.update({
        tenantId: cenario.tenantId,
        ruleId: regra.id,
        notes: "Contrato 2026 — aditivo 1",
        updatedBy: cenario.userId,
      });

      assert.equal(soNotas?.notes, "Contrato 2026 — aditivo 1");
      assert.equal(soNotas?.customerId, cenario.customerId, "o eixo não citado no pedido tem de continuar intacto");
      assert.equal(soNotas?.role, "collection");
      assert.equal(soNotas?.updatedBy, cenario.userId);

      const apósNotas = await linhasCruas(client, cenario.tenantId);
      assert.equal(apósNotas[0]?.customer_id, cenario.customerId, "no banco também: a coluna não foi tocada");

      // (2) `null` explícito é o ÚNICO jeito de voltar ao curinga.
      const limpa = await repo.update({ tenantId: cenario.tenantId, ruleId: regra.id, customerId: null, notes: null });

      assert.equal(limpa?.customerId, undefined, "cliente limpo volta como 'qualquer' (undefined), não null");
      assert.equal(limpa?.notes, undefined);

      const apósLimpeza = await linhasCruas(client, cenario.tenantId);
      assert.equal(apósLimpeza[0]?.customer_id, null, "no banco a coluna virou NULL de verdade");

      // (3) `updated_at` acompanha a edição — sem isso, a coluna "última alteração" da tela mente.
      assert.ok(
        (limpa as ChecklistApplicabilityRule).updatedAt.getTime() >= regra.updatedAt.getTime(),
        "updated_at não pode andar para trás",
      );
    });
  });

  test("update recusa regra APAGADA (a guarda está no WHERE, junto com a escrita)", async () => {
    await comCenario(connection, async ({ repo, cenario }) => {
      const regra = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateColeta,
        role: "generic",
      });
      await repo.softDelete(cenario.tenantId, regra.id, cenario.userId);

      // Guarda e escrita no mesmo comando: um `findById` antes seria check-then-act, e entre a leitura e a
      // gravação outra sessão poderia apagar a regra — o update RESSUSCITARIA o que a organização removeu.
      const resultado = await repo.update({ tenantId: cenario.tenantId, ruleId: regra.id, notes: "ressuscitar" });

      assert.equal(resultado, undefined, "regra apagada não aceita edição");
    });
  });

  test("soft-delete LIBERA o bucket, preserva o histórico e some da entrada da resolução", async () => {
    await comCenario(connection, async ({ client, repo, cenario }) => {
      const original = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateColeta,
        role: "collection",
        notes: "Por que esta regra existiu",
      });

      const apagada = await repo.softDelete(cenario.tenantId, original.id, cenario.userId);

      assert.ok(apagada?.deletedAt instanceof Date, "soft-delete carimba a data");
      assert.equal(apagada?.isActive, false, "a regra apagada não pode continuar contando como ativa");
      assert.equal(apagada?.updatedBy, cenario.userId);

      // O bucket volta a ficar livre — a substituta entra sem que ninguém precise APAGAR a linha e perder o
      // registro de por que a regra anterior existiu.
      const substituta = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateEntrega,
        role: "collection",
      });
      assert.notEqual(substituta.id, original.id);

      const linhas = await linhasCruas(client, cenario.tenantId);
      assert.equal(linhas.length, 2, "a apagada CONTINUA no banco: soft-delete é histórico, não remoção");

      const ativas = await repo.listActive(cenario.tenantId);
      assert.deepEqual(ativas.map((regra) => regra.id), [substituta.id], "a resolução só enxerga a viva");

      const listaPadrão = await repo.list({ tenantId: cenario.tenantId });
      assert.deepEqual(listaPadrão.map((regra) => regra.id), [substituta.id], "a listagem esconde a apagada");

      const comApagadas = await repo.list({ tenantId: cenario.tenantId, includeDeleted: true });
      assert.equal(comApagadas.length, 2, "quem quer o histórico pede o histórico");

      assert.equal(
        await repo.softDelete(cenario.tenantId, original.id, cenario.userId),
        undefined,
        "apagar duas vezes não reescreve a data do apagamento original",
      );

      const aindaAchável = await repo.findById(cenario.tenantId, original.id);
      assert.ok(aindaAchável?.deletedAt, "findById ainda alcança a apagada — é assim que a tela explica o passado");
    });
  });

  test("regra DESATIVADA (sem apagar) sai da resolução, mas continua na listagem do administrador", async () => {
    await comCenario(connection, async ({ repo, cenario }) => {
      const regra = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateColeta,
        role: "collection",
        notes: "Suspensa enquanto o contrato é renegociado",
      });

      const suspensa = await repo.update({ tenantId: cenario.tenantId, ruleId: regra.id, isActive: false });
      assert.equal(suspensa?.isActive, false);
      assert.equal(suspensa?.deletedAt, undefined, "desativar NÃO é apagar — o cadastro continua inteiro");

      // Este é o caso que separa "desativada" de "apagada", e ele tem consequência de campo: enquanto a regra
      // estiver suspensa, nenhuma ordem de serviço nova pode receber a vistoria dela. Uma `listActive` que
      // filtrasse só `deleted_at` continuaria despachando ao guincheiro uma vistoria que a organização
      // suspendeu — e o índice parcial já liberou o bucket para a substituta, então as duas conviveriam.
      assert.deepEqual(await repo.listActive(cenario.tenantId), [], "regra suspensa não pode alimentar a resolução");

      const naListagem = await repo.list({ tenantId: cenario.tenantId });
      assert.deepEqual(
        naListagem.map((item) => item.id),
        [regra.id],
        "a listagem do administrador continua mostrando: é de lá que ele reativa",
      );

      // Bucket liberado pela desativação: a substituta entra sem conflito.
      const substituta = await repo.create({
        tenantId: cenario.tenantId,
        templateId: cenario.templateEntrega,
        role: "collection",
      });
      assert.deepEqual(
        (await repo.listActive(cenario.tenantId)).map((item) => item.id),
        [substituta.id],
        "só a substituta viva chega ao campo",
      );
    });
  });

  test("PARIDADE memória × Prisma: o mesmo roteiro produz o mesmo resultado nos dois modos", async () => {
    await comCenario(connection, async ({ repo, cenario }) => {
      const memoria = new InMemoryChecklistApplicabilityRepository();
      const roteiro = await Promise.all([executarRoteiro(repo, cenario), executarRoteiro(memoria, cenario)]);
      const [viaPrisma, viaMemoria] = roteiro;

      assert.deepEqual(
        viaPrisma!.criadas,
        viaMemoria!.criadas,
        "a criação diverge entre os modos — ordens de serviço congelariam regras diferentes conforme o ambiente",
      );

      assert.deepEqual(
        viaPrisma!.resolucao,
        viaMemoria!.resolucao,
        "a resolução diverge: o mesmo veículo receberia vistorias diferentes conforme o modo de persistência",
      );

      assert.deepEqual(viaPrisma!.edicaoParcial, viaMemoria!.edicaoParcial, "o tri-state do update diverge");
      assert.deepEqual(viaPrisma!.conflitoNaEdicao, viaMemoria!.conflitoNaEdicao, "o conflito de bucket na edição diverge");
      assert.deepEqual(viaPrisma!.apagada, viaMemoria!.apagada, "o soft-delete diverge");
      assert.deepEqual(viaPrisma!.aposApagar, viaMemoria!.aposApagar, "o que sobra vivo depois do apagamento diverge");
      assert.deepEqual(viaPrisma!.suspensa, viaMemoria!.suspensa, "a desativação da regra diverge");
      assert.deepEqual(
        viaPrisma!.aposSuspender,
        viaMemoria!.aposSuspender,
        "o que a resolução enxerga depois de uma regra ser SUSPENSA diverge",
      );
      assert.deepEqual(viaPrisma!.reciclada, viaMemoria!.reciclada, "a reutilização do bucket liberado diverge");

      // Âncora explícita: a paridade acima é comparação entre dois lados, e dois lados errados iguais passariam.
      // Este bloco crava a semântica que a junta decidiu, para que a paridade não vire "iguais no erro".
      assert.deepEqual(
        viaPrisma!.resolucao.matches,
        [{ role: "collection", templateId: cenario.templateColeta }],
        "cliente nomeado vence cliente qualquer, e o genérico é FALLBACK — não soma com a fase concreta",
      );
      assert.equal(viaPrisma!.resolucao.shadowed.length, 2, "a curinga perdedora e o genérico ficam como sombreamento");
    });
  });

  test("§2.8: violação de CHECK vira 400 de negócio — o erro cru traz a LINHA INTEIRA, com tenant_id dentro", async () => {
    await comCenario(connection, async ({ cenario, repo }) => {
      const erro = await capturar(() =>
        repo.create({
          tenantId: cenario.tenantId,
          templateId: cenario.templateColeta,
          role: "generic",
          serviceCatalogId: cenario.serviceCatalogId,
          serviceType: "reboque",
        }),
      );

      assert.ok(erro instanceof ChecklistApplicabilityError, "o DriverAdapterError cru não pode subir");
      assert.equal(erro.statusCode, 400);
      assert.equal(erro.reason, "applicability_service_axis_conflict");

      // Medido contra este Postgres: sem tratamento, o erro é um `DriverAdapterError` SEM `code` no topo (a
      // detecção só por `error.code` não o enxerga) e com `cause.detail` contendo a linha que falhou — o
      // `tenant_id` da organização vai junto, e o `sendRouteError` devolveria tudo como HTTP 400.
      assertSemVazamento(erro, cenario.tenantId);
    });
  });

  test("§2.8: referência inexistente vira 400 com explicação de negócio (a FK é tenant-first)", async () => {
    await comCenario(connection, async ({ cenario, repo }) => {
      const erro = await capturar(() =>
        repo.create({ tenantId: cenario.tenantId, templateId: randomUUID(), role: "delivery" }),
      );

      assert.ok(erro instanceof ChecklistApplicabilityError);
      assert.equal(erro.statusCode, 400);
      assert.equal(erro.reason, "applicability_invalid_reference");
      assert.match(erro.message, /modelo de vistoria/i, "a explicação diz QUAL referência falhou, em português de negócio");
      assertSemVazamento(erro, cenario.tenantId);
    });
  });

  // Achado do verificador (PROBLEMA 3): as provas cobriam unicidade, FK e CHECK — todas classificadas. O ramo
  // GENÉRICO do sanitizador, que existe justamente para o erro que ninguém previu, não era exercido por caso
  // nenhum: dava para trocá-lo por `return error` (devolvendo o erro CRU do driver) e a suíte seguia verde.
  // É o ramo com MAIOR risco §2.8, porque é o único que recebe o inesperado.
  test("§2.8: falha NÃO classificada também é sanitizada — o ramo que recebe o inesperado", async () => {
    await comCenario(connection, async ({ cenario, repo, client }) => {
      // Uma falha real e não classificada: a coluna existe no domínio mas some do banco no meio da operação.
      // Não é hipotética — é o que acontece durante um deploy com migração pendente.
      await client.$executeRawUnsafe(`ALTER TABLE checklist_applicability_rules RENAME COLUMN notes TO notes_tmp`);

      try {
        const erro = await capturar(() =>
          repo.create({ tenantId: cenario.tenantId, templateId: cenario.templateColeta, role: "delivery" }),
        );

        assert.ok(
          erro instanceof ChecklistApplicabilityError,
          "erro desconhecido não pode subir cru: `sendRouteError` devolveria a mensagem do driver como HTTP 400",
        );
        assert.equal(
          [500, 503].includes(erro.statusCode),
          true,
          `falha não classificada é do servidor, não do cliente — veio ${erro.statusCode}`,
        );
        assertSemVazamento(erro, cenario.tenantId);
      } finally {
        await client.$executeRawUnsafe(`ALTER TABLE checklist_applicability_rules RENAME COLUMN notes_tmp TO notes`);
      }
    });
  });

  test("isolamento: a consulta é filtrada por organização em todo método (não depende da RLS)", async () => {
    await comCenario(connection, async ({ client, repo, cenario }) => {
      const outraOrg = randomUUID();
      await client.$executeRawUnsafe(
        `INSERT INTO tenants (id, name, slug, status) VALUES ('${outraOrg}'::uuid, 'Outra organização', 'outra-${outraOrg.slice(0, 8)}', 'active')`,
      );

      try {
        const regra = await repo.create({
          tenantId: cenario.tenantId,
          templateId: cenario.templateColeta,
          role: "collection",
        });

        // Em desenvolvimento a conexão é SUPERUSUÁRIO, e o PostgreSQL ignora RLS para esse papel: uma asserção
        // de "a política bloqueou" aqui seria teatro. O que este caso prova é o filtro `tenant_id` da própria
        // consulta — a segunda barreira, a que continua valendo em qualquer papel de banco. A RLS em si é
        // provada estruturalmente em `tests/checklist-applicability-schema-db.test.ts`.
        assert.equal(await repo.findById(outraOrg, regra.id), undefined, "outra organização não alcança a regra pelo id");
        assert.deepEqual(await repo.listActive(outraOrg), [], "a resolução de outra organização não vê esta regra");
        assert.deepEqual(await repo.list({ tenantId: outraOrg }), []);
        assert.equal(await repo.update({ tenantId: outraOrg, ruleId: regra.id, notes: "invasão" }), undefined);
        assert.equal(await repo.softDelete(outraOrg, regra.id), undefined);

        const sobreviveu = await repo.findById(cenario.tenantId, regra.id);
        assert.equal(sobreviveu?.notes, undefined, "nada da outra organização encostou na regra");
        assert.equal(sobreviveu?.deletedAt, undefined);
      } finally {
        await teardown(client, outraOrg);
      }
    });
  });

  test("o CHECK de etapa do banco e a união de etapas do TypeScript são o MESMO conjunto", async () => {
    await comCenario(connection, async ({ client }) => {
      const linhas = await client.$queryRawUnsafe<Array<{ def: string }>>(
        `SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'checklist_applicability_rules_role_chk'`,
      );

      const noBanco = [...(linhas[0]?.def ?? "").matchAll(/'([^']+)'/g)].map((achado) => achado[1]).sort();

      // Este guard é o que sustenta o `record.role as ChecklistApplicabilityRole` do mapeador. Estender só o
      // CHECK (para `custody_yard`, o caso já previsto) faria a resolução receber uma etapa que ela não conhece
      // e DESCARTAR a regra em silêncio: nem aplicada, nem sombreada — invisível. Estender só a união de
      // TypeScript é o bug irmão que gerou o hotfix P-CHK-COMPONENT-TYPE-CHECK.
      assert.deepEqual(
        noBanco,
        [...CHECKLIST_APPLICABILITY_ROLES].sort(),
        "CHECK do banco e união de TypeScript divergiram — estenda os DOIS na mesma entrega",
      );
    });
  });
}

// ── roteiro de paridade ──────────────────────────────────────────────────────
/**
 * A MESMA sequência de operações, executada contra qualquer implementação da interface. Tudo o que sai daqui é
 * normalizado (sem id gerado, sem carimbo de tempo), porque o que precisa bater é a SEMÂNTICA — não o uuid.
 */
async function executarRoteiro(repo: ChecklistApplicabilityRepository, cenario: Cenario) {
  const doCliente = await repo.create({
    tenantId: cenario.tenantId,
    templateId: cenario.templateColeta,
    role: "collection",
    customerId: cenario.customerId,
    notes: "Exigência do cliente",
  });
  const curingaDeColeta = await repo.create({
    tenantId: cenario.tenantId,
    templateId: cenario.templateEntrega,
    role: "collection",
  });
  const generica = await repo.create({
    tenantId: cenario.tenantId,
    templateId: cenario.templateGenerico,
    role: "generic",
  });

  const publicados = new Set([cenario.templateColeta, cenario.templateEntrega, cenario.templateGenerico]);
  const resolucaoBruta = resolveChecklistApplicability(await repo.listActive(cenario.tenantId), { customerId: cenario.customerId }, publicados);
  const resolucao = {
    matches: resolucaoBruta.matches.map((achado) => ({ role: achado.role, templateId: achado.templateId })),
    shadowed: resolucaoBruta.shadowed
      .map((achado) => ({ role: achado.role, templateId: achado.templateId }))
      .sort(porTexto),
  };

  // Tri-state: só as observações mudam — o cliente da regra tem de sobreviver.
  const edicaoParcial = await repo.update({
    tenantId: cenario.tenantId,
    ruleId: doCliente.id,
    notes: "Exigência do cliente — revisada",
  });

  // Limpar o cliente joga a regra para o bucket que a curinga de coleta já ocupa: os dois modos têm de recusar
  // com a MESMA recusa de negócio (em memória o desempate é calculado; no Prisma vem do índice).
  const conflitoNaEdicao = await capturar(() =>
    repo.update({ tenantId: cenario.tenantId, ruleId: doCliente.id, customerId: null }),
  );

  const apagada = await repo.softDelete(cenario.tenantId, curingaDeColeta.id, cenario.userId);
  const aposApagar = (await repo.listActive(cenario.tenantId)).map(forma).sort(porTexto);

  // Desativar é diferente de apagar, e os dois modos têm de concordar nisso: a suspensa some da resolução sem
  // sair do cadastro.
  const suspensa = await repo.update({ tenantId: cenario.tenantId, ruleId: generica.id, isActive: false });
  const aposSuspender = (await repo.listActive(cenario.tenantId)).map(forma).sort(porTexto);

  // O bucket liberado aceita substituta.
  const reciclada = await repo.create({
    tenantId: cenario.tenantId,
    templateId: cenario.templateGenerico,
    role: "collection",
  });

  return {
    criadas: [doCliente, curingaDeColeta, generica].map(forma),
    resolucao,
    edicaoParcial: forma(edicaoParcial),
    conflitoNaEdicao: formaDoErro(conflitoNaEdicao),
    apagada: forma(apagada),
    aposApagar,
    suspensa: forma(suspensa),
    aposSuspender,
    reciclada: forma(reciclada),
  };
}

/** Forma comparável de uma regra: sem id gerado e sem carimbo de tempo, que divergem por construção. */
function forma(rule: ChecklistApplicabilityRule | undefined) {
  if (!rule) return null;

  return {
    tenantId: rule.tenantId,
    templateId: rule.templateId,
    serviceCatalogId: rule.serviceCatalogId ?? "(qualquer)",
    serviceType: rule.serviceType ?? "(qualquer)",
    customerId: rule.customerId ?? "(qualquer)",
    role: rule.role,
    isActive: rule.isActive,
    notes: rule.notes ?? "(sem observação)",
    createdBy: rule.createdBy ?? "(sem autor)",
    updatedBy: rule.updatedBy ?? "(sem autor)",
    apagada: rule.deletedAt !== undefined,
  };
}

function formaDoErro(error: unknown) {
  if (!(error instanceof ChecklistApplicabilityError)) return { tipo: String(error) };

  return { statusCode: error.statusCode, code: error.code, reason: error.reason, message: error.message };
}

function porTexto(left: unknown, right: unknown): number {
  return JSON.stringify(left) < JSON.stringify(right) ? -1 : 1;
}

// ── §2.8 ─────────────────────────────────────────────────────────────────────
/**
 * O que o `sendRouteError` publicaria: a mensagem e os campos anexos ao erro. A pilha fica de fora de propósito
 * — ela nunca vai para o corpo da resposta e traz caminho absoluto até em erro de negócio legítimo.
 */
function assertSemVazamento(error: unknown, tenantId: string): void {
  const anexo = error as { readonly message?: unknown; readonly cause?: unknown; readonly meta?: unknown };
  const superficie = [
    typeof anexo.message === "string" ? anexo.message : "",
    serializar(anexo.cause),
    serializar(anexo.meta),
  ].join(" ");

  assert.ok(!superficie.includes(tenantId), "a resposta não pode carregar o identificador da organização (§2.8)");
  assert.ok(
    !superficie.includes("checklist_applicability_rules"),
    "nome de tabela/constraint interna não é assunto do cliente",
  );
  assert.ok(!/[A-Za-z]:\\|\/home\/|\/usr\//.test(superficie), "caminho absoluto do servidor não pode vazar");
  assert.ok(!/\b(insert|select|update)\b\s+(into|from|"|checklist)/i.test(superficie), "trecho de SQL não pode vazar");
}

function serializar(value: unknown): string {
  if (value === undefined || value === null) return "";

  try {
    // O `cause` do erro tem de entrar na serialização: é exatamente ali que o driver guarda o `detail` com a
    // linha que falhou (e o `tenant_id` dentro dela). Um serializador que achatasse o erro em nome+mensagem
    // deixaria o vazamento passar por baixo do próprio guard.
    return (
      JSON.stringify(value, (_chave, valor) =>
        valor instanceof Error
          ? { name: valor.name, message: valor.message, cause: (valor as { readonly cause?: unknown }).cause }
          : valor,
      ) ?? ""
    );
  } catch {
    return String(value);
  }
}

async function capturar(work: () => Promise<unknown>): Promise<unknown> {
  try {
    await work();
    return undefined;
  } catch (error) {
    return error;
  }
}

// ── infra ────────────────────────────────────────────────────────────────────
type Cenario = {
  readonly tenantId: string;
  readonly userId: string;
  readonly customerId: string;
  readonly serviceCatalogId: string;
  readonly templateColeta: string;
  readonly templateEntrega: string;
  readonly templateGenerico: string;
};

async function bootstrap(connection: string) {
  const [{ PrismaPg }, { PrismaClient }] = await Promise.all([
    import("@prisma/adapter-pg"),
    import("@prisma/client"),
  ]);
  const { RlsPrismaChecklistApplicabilityRepository } = await import(
    "../src/modules/checklists/applicability/checklist-applicability-prisma.repository.js"
  );
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: connection }) });

  return { client, repo: new RlsPrismaChecklistApplicabilityRepository(client) };
}

type BootstrapClient = Awaited<ReturnType<typeof bootstrap>>["client"];

async function comCenario(
  connection: string,
  callback: (contexto: {
    readonly client: BootstrapClient;
    readonly repo: ChecklistApplicabilityRepository;
    readonly cenario: Cenario;
  }) => Promise<void>,
): Promise<void> {
  const { client, repo } = await bootstrap(connection);
  const sufixo = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const tenant = await client.tenant.create({ data: { name: `Aplicabilidade ${sufixo}`, slug: `aplic-${sufixo}` } });

  try {
    const [coleta, entrega, generico] = await Promise.all(
      ["Vistoria de coleta", "Vistoria de entrega", "Vistoria padrão"].map((name) =>
        client.checklistTemplate.create({
          data: { tenant_id: tenant.id, name, type: "towing_collection", status: "published", schema: {} },
        }),
      ),
    );
    const customer = await client.customer.create({
      data: { tenant_id: tenant.id, name: `Cliente ${sufixo}` },
    });
    const servico = await client.serviceCatalog.create({
      data: { tenant_id: tenant.id, name: `Reboque ${sufixo}`, service_type: "reboque" },
    });

    await callback({
      client,
      repo,
      cenario: {
        tenantId: tenant.id,
        userId: randomUUID(),
        customerId: customer.id,
        serviceCatalogId: servico.id,
        templateColeta: coleta!.id,
        templateEntrega: entrega!.id,
        templateGenerico: generico!.id,
      },
    });
  } finally {
    await teardown(client, tenant.id);
    await client.$disconnect();
  }
}

async function linhasCruas(client: BootstrapClient, tenantId: string) {
  return client.$queryRawUnsafe<Array<{ id: string; customer_id: string | null; deleted_at: Date | null }>>(
    `SELECT id, customer_id, deleted_at FROM checklist_applicability_rules WHERE tenant_id = '${tenantId}'::uuid ORDER BY created_at`,
  );
}

/**
 * Remove SÓ a organização que este teste criou, na ordem das dependências. Nunca apagamento por curinga na base
 * viva: a limpeza tem escopo do que o próprio caso semeou (P-JUNTA-LIMPEZA-BASE-VIVA).
 */
async function teardown(client: BootstrapClient, tenantId: string): Promise<void> {
  await client.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("SET LOCAL session_replication_role = 'replica'");
    await tx.$executeRawUnsafe(`DELETE FROM checklist_applicability_rules WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM checklist_templates WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM service_catalog WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM customers WHERE tenant_id = '${tenantId}'::uuid`);
    await tx.$executeRawUnsafe(`DELETE FROM tenants WHERE id = '${tenantId}'::uuid`);
  });
}
