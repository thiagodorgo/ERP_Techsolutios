import assert from "node:assert/strict";
import test from "node:test";

import {
  applicabilityBucketKey,
  InMemoryChecklistApplicabilityRepository,
} from "../src/modules/checklists/applicability/checklist-applicability.repository.js";
import { ChecklistApplicabilityError } from "../src/modules/checklists/applicability/checklist-applicability.types.js";

// CHECKLIST P1 PR-04a — o repositório EM MEMÓRIA da regra de aplicabilidade.
//
// Por que este arquivo existe e por que ele é implacável: o índice único parcial do Postgres
// (`checklist_applicability_rules_bucket_key`, com `NULLS NOT DISTINCT`) é a única coisa que impede duas
// regras ativas de disputarem o mesmo bucket. Em memória NÃO existe índice — existe `bucketOcupado()`, um
// `some()` sobre um Map. Se essa guarda divergir do índice, o mesmo payload é aceito num modo e recusado no
// outro; e como o vínculo com a ordem de serviço é STICKY na criação (PR-04b) e não há backfill, a divergência
// não vira um erro visível: vira a vistoria ERRADA congelada naquela ordem para sempre.
//
// Este arquivo NÃO testa a resolução (isso é `checklist-applicability-resolution.test.ts`). Ele testa a
// PARIDADE da guarda com o banco, e é escrito para falhar quando a guarda relaxa.

const ORG = "org-alpha";
const OUTRA_ORG = "org-beta";

/**
 * A sentinela de "qualquer" usada por `applicabilityBucketKey`, escrita aqui como ESCAPE (`\u0000`) de
 * propósito: no fonte do repositório ela está gravada como byte NUL cru, e é justamente isso que faz o git
 * classificar aquele arquivo como binário. Este arquivo não repete o erro.
 */
const SENTINELA = "\u0000";

/** O `create` só recebe `role` e `templateId` como obrigatórios; o resto é eixo de bucket. */
function repositorio(): InMemoryChecklistApplicabilityRepository {
  return new InMemoryChecklistApplicabilityRepository();
}

function conflitoDeBucket(error: unknown): true {
  assert.ok(
    error instanceof ChecklistApplicabilityError,
    "o conflito de bucket precisa chegar como erro de domínio, não como TypeError de dentro do Map",
  );
  assert.equal(error.code, "CHECKLIST_APPLICABILITY_BUCKET_CONFLICT");
  assert.equal(error.statusCode, 409, "409 é o que a camada HTTP da PR-04c vai traduzir para o administrador");
  return true;
}

// ── 1. A GUARDA DE BUCKET ESPELHA O ÍNDICE ÚNICO PARCIAL ───────────────────────────────────────

test("bucket: duas regras curinga da MESMA etapa colidem — é o `NULLS NOT DISTINCT` reproduzido em memória", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  // No Postgres com NULLs DISTINTOS (o padrão) estas duas conviveriam e o desempate cairia todo no JS.
  // O índice existe justamente para tornar esta ambiguidade impossível — a memória tem de recusar igual.
  await assert.rejects(
    () => repo.create({ tenantId: ORG, templateId: "M2", role: "collection" }),
    conflitoDeBucket,
  );

  assert.deepEqual(
    (await repo.listActive(ORG)).map((regra) => regra.templateId),
    ["M1"],
    "a segunda regra não pode ter entrado no Map antes de o conflito estourar",
  );
});

test("bucket: NÃO colide onde o banco não colide — etapa, cliente e serviço são eixos SEPARADOS da chave", async () => {
  const repo = repositorio();

  // Cada uma destas cinco muda exatamente UM eixo da chave `(tenant, serviço, tipo, cliente, etapa)`.
  // Se a guarda for grosseira demais (ex.: comparar só tenant+etapa), alguma destas passa a falhar — e o
  // administrador fica impedido de cadastrar uma configuração que o banco aceita sem reclamar.
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  await repo.create({ tenantId: ORG, templateId: "M2", role: "delivery" });
  await repo.create({ tenantId: ORG, templateId: "M3", role: "generic" });
  await repo.create({ tenantId: ORG, templateId: "M4", role: "collection", customerId: "C1" });
  await repo.create({ tenantId: ORG, templateId: "M5", role: "collection", serviceCatalogId: "S1" });
  await repo.create({ tenantId: ORG, templateId: "M6", role: "collection", serviceType: "reboque" });

  assert.equal((await repo.listActive(ORG)).length, 6);
});

test("bucket: a MESMA combinação em organizações diferentes convive — `tenant_id` é o primeiro campo do índice", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  // Se isto falhar, uma organização passa a bloquear a configuração de outra: vazamento de isolamento pela
  // porta dos fundos, sem nunca expor um dado sequer.
  const daOutra = await repo.create({ tenantId: OUTRA_ORG, templateId: "M9", role: "collection" });

  assert.equal(daOutra.tenantId, OUTRA_ORG);
  assert.equal((await repo.listActive(ORG)).length, 1);
  assert.equal((await repo.listActive(OUTRA_ORG)).length, 1);
});

// ── 2. A SENTINELA: "ausente" é um VALOR, e esse valor precisa ser inalcançável ─────────────────

test("sentinela: ausência vira VALOR na chave, e o valor escolhido não é digitável por administrador nenhum", () => {
  const curinga = applicabilityBucketKey({ tenantId: ORG, role: "generic" });

  // A sentinela real do código é U+0000 (NUL). Isso é a escolha CERTA do ponto de vista de domínio: o
  // Postgres não armazena NUL em coluna `TEXT` e muito menos em coluna `UUID`, então nenhum valor vindo do
  // banco consegue se passar por "qualquer". Nenhuma string que um administrador consiga digitar colide.
  assert.equal(
    applicabilityBucketKey({ tenantId: ORG, serviceType: SENTINELA, role: "generic" }),
    curinga,
    "a sentinela é NUL — se alguém trocá-la por um caractere digitável, esta linha muda de significado",
  );

  for (const branco of [" ", "", "   ", "\t"]) {
    assert.notEqual(
      applicabilityBucketKey({ tenantId: ORG, serviceType: branco, role: "generic" }),
      curinga,
      `um tipo de serviço em branco (${JSON.stringify(branco)}) NÃO pode ser confundido com a regra curinga: ` +
        "seriam duas configurações distintas ocupando o mesmo bucket",
    );
  }
});

test("chave de bucket: o separador `|` é forjável — o que segura hoje é o banco, não este arquivo", () => {
  // (tipo="b|c", cliente="d") e (tipo="b", cliente="c|d") produzem a MESMA string de bucket. São dois
  // buckets diferentes para o banco e um só para a memória: a segunda regra seria recusada com "já existe
  // uma regra para esta combinação" sendo mentira.
  //
  // Por que isso não é explorável HOJE: `customer_id` e `service_catalog_id` são colunas UUID, e UUID não
  // contém `|`; só `service_type` é texto livre, e um campo livre sozinho não forja o limite entre dois
  // campos. Essa propriedade é CARGA ESTRUTURAL e nada neste módulo a enforça — o dia em que a PR-04c
  // aceitar um identificador de cliente que não seja UUID (código externo, documento, chave de integração),
  // dois buckets distintos passam a se canibalizar em silêncio.
  assert.equal(
    applicabilityBucketKey({ tenantId: ORG, serviceType: "b|c", customerId: "d", role: "collection" }),
    applicabilityBucketKey({ tenantId: ORG, serviceType: "b", customerId: "c|d", role: "collection" }),
  );
});

test("DIVERGÊNCIA memória × banco: tipo de serviço em branco — o banco RECUSA por CHECK, a memória ACEITA", async () => {
  const repo = repositorio();

  // `checklist_applicability_rules_service_type_not_blank_chk` recusa `''`, `' '` e `'   '` no Postgres
  // (provado em `tests/checklist-applicability-schema-db.test.ts`). Aqui os três entram sem um pio.
  for (const [indice, branco] of [" ", "", "   "].entries()) {
    const regra = await repo.create({
      tenantId: ORG,
      templateId: `M${indice}`,
      role: "generic",
      serviceType: branco,
      customerId: `C${indice}`,
    });
    assert.equal(regra.serviceType, branco, "a memória guarda literalmente o branco que o banco proibiria");
  }

  // O estrago não é o 500 no Prisma: é o terceiro estado invisível. Uma regra com tipo em branco não é
  // curinga (não casa qualquer serviço) e não é concreta (nenhuma ordem de serviço tem tipo em branco).
  // Ela casa NADA, e na tela parece configurada — que é exatamente o motivo do CHECK existir.
  assert.equal((await repo.listActive(ORG)).length, 3);

  // PINAGEM CONSCIENTE: este teste documenta a divergência, não a abençoa. Fechá-la é do validador da
  // PR-04c (o `create` em memória não deve aceitar o que o banco recusa). Quando fechar, este teste falha —
  // e é para falhar mesmo: quem fechar atualiza esta expectativa e apaga a pendência.
});

test("DIVERGÊNCIA memória × banco: os dois eixos de serviço juntos — o banco RECUSA, a memória ACEITA", async () => {
  const repo = repositorio();

  // `checklist_applicability_rules_service_axis_chk` garante `num_nonnulls(service_catalog_id, service_type) <= 1`.
  // Em memória a regra nasce com os dois preenchidos, e aí ela só casa uma ordem que satisfaça AMBOS —
  // uma conjunção que o desenho do eixo diz não existir (`serviceSpecificity` nem sequer prevê o caso: ele
  // devolve 0 e trata a regra como "por serviço concreto", ignorando o tipo).
  const hibrida = await repo.create({
    tenantId: ORG,
    templateId: "M1",
    role: "collection",
    serviceCatalogId: "S1",
    serviceType: "reboque",
  });

  assert.equal(hibrida.serviceCatalogId, "S1");
  assert.equal(hibrida.serviceType, "reboque");

  // `checklistApplicabilityServiceAxisError()` existe em `checklist-applicability.types.ts` e não é chamada
  // por ninguém em todo o repositório. A mensagem para o administrador está escrita e nunca chega até ele.
});

// ── 3. O ÍNDICE É PARCIAL: só regra VIVA E ATIVA ocupa bucket ──────────────────────────────────

test("índice parcial: desativar a regra LIBERA o bucket (é o `WHERE is_active` do índice)", async () => {
  const repo = repositorio();
  const primeira = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  await assert.rejects(
    () => repo.create({ tenantId: ORG, templateId: "M2", role: "collection" }),
    conflitoDeBucket,
  );

  await repo.update({ tenantId: ORG, ruleId: primeira.id, isActive: false });

  // Sem o `rule.isActive` dentro de `bucketOcupado`, a organização ficaria presa: desativou a regra antiga e
  // ainda assim não consegue cadastrar a nova, sem nenhuma explicação na tela.
  const segunda = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });
  assert.equal(segunda.isActive, true);
  assert.deepEqual((await repo.listActive(ORG)).map((regra) => regra.templateId), ["M2"]);
});

test("índice parcial: apagar (softDelete) LIBERA o bucket, e a apagada não ressuscita", async () => {
  const repo = repositorio();
  const primeira = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  const apagada = await repo.softDelete(ORG, primeira.id, "usuario-1");
  assert.ok(apagada?.deletedAt, "soft-delete carimba a data — o histórico de por que a regra existiu fica");
  assert.equal(apagada.isActive, false, "apagada e ainda ativa seria uma linha que o índice parcial ignora por um motivo e a resolução lê por outro");
  assert.equal(apagada.updatedBy, "usuario-1");

  await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });

  // Idempotência: apagar de novo e editar uma apagada são não-operações, não erros nem ressurreições.
  assert.equal(await repo.softDelete(ORG, primeira.id), undefined);
  assert.equal(await repo.update({ tenantId: ORG, ruleId: primeira.id, isActive: true }), undefined);
  assert.deepEqual((await repo.listActive(ORG)).map((regra) => regra.templateId), ["M2"]);
});

test("índice parcial: nascer desativada não ocupa bucket — mas REATIVAR com o bucket tomado é recusado", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  const rascunho = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection", isActive: false });
  assert.equal(rascunho.isActive, false, "cadastrar desativada tem de ser possível: é como se prepara a troca");

  // Aqui é onde a guarda paga o aluguel. Se o `update` não checasse o bucket, a organização terminaria com
  // DUAS regras ativas para a mesma combinação — e qual vistoria o guincheiro recebe viraria sorteio.
  await assert.rejects(
    () => repo.update({ tenantId: ORG, ruleId: rascunho.id, isActive: true }),
    conflitoDeBucket,
  );

  assert.equal((await repo.findById(ORG, rascunho.id))?.isActive, false, "a reativação recusada não pode ter gravado nada");
});

test("DEFEITO: o repositório devolve a MESMA referência que guarda — quem recebe pode adulterar o que está dentro", async () => {
  const repo = repositorio();
  const criada = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection", notes: "original" });

  assert.equal(
    criada === (await repo.findById(ORG, criada.id)),
    true,
    "se esta linha falhar, o repositório passou a devolver CÓPIAS (o certo) — refaça o fixture do teste seguinte",
  );

  // `readonly` do TypeScript não existe em tempo de execução: some no build. Quem tiver a referência muda o
  // estado guardado sem passar por `update`, ou seja, sem a checagem de bucket e sem carimbar `updatedAt` —
  // e, no limite, trocando o `tenantId` para mover a regra de organização.
  (criada as { notes?: string }).notes = "adulterado por fora";
  assert.equal((await repo.findById(ORG, criada.id))?.notes, "adulterado por fora");
});

test("defesa em profundidade: regra APAGADA não ocupa bucket nem entra em `listActive`, mesmo marcada como ativa", async () => {
  const repo = repositorio();
  const apagadaPoremAtiva = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  // Hoje `softDelete` sempre desliga `isActive`, então o `!rule.deletedAt` de `bucketOcupado`/`listActive`
  // nunca é o guarda que decide — o `isActive` sozinho já resolveria, e uma mutação que apagasse o
  // `!rule.deletedAt` passaria despercebida por toda a suíte. Este teste forja o único estado que separa os
  // dois guardas (apagada E ativa) para que a redundância seja de fato VERIFICADA, e não só declarada.
  // O forjamento usa a referência viva do teste anterior — é o preço de o repositório não devolver cópias.
  (apagadaPoremAtiva as { deletedAt?: Date }).deletedAt = new Date();
  (apagadaPoremAtiva as { isActive: boolean }).isActive = true;

  // O bucket tem de estar livre: `deleted_at IS NULL` faz parte do WHERE do índice parcial, e no banco a
  // linha apagada sai do índice independentemente do que `is_active` diga.
  const nova = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });
  assert.equal(nova.templateId, "M2");

  assert.deepEqual(
    (await repo.listActive(ORG)).map((regra) => regra.templateId),
    ["M2"],
    "regra apagada não pode alimentar a resolução nem que alguém a remarque como ativa",
  );
});

// ── 4. TRI-STATE DO UPDATE: `null` limpa, `undefined` preserva, valor troca ────────────────────

test("tri-state: `undefined` preserva o eixo, valor troca o eixo, `null` limpa o eixo", async () => {
  const repo = repositorio();
  const regra = await repo.create({
    tenantId: ORG,
    templateId: "M1",
    role: "collection",
    customerId: "C1",
    serviceType: "reboque",
    notes: "exigência do contrato",
  });

  // `undefined` = "não mexe". Um PATCH que só troca a observação não pode desconfigurar o cliente da regra.
  const soNota = await repo.update({ tenantId: ORG, ruleId: regra.id, notes: "outra observação" });
  assert.equal(soNota?.customerId, "C1");
  assert.equal(soNota?.serviceType, "reboque");
  assert.equal(soNota?.notes, "outra observação");

  const trocado = await repo.update({ tenantId: ORG, ruleId: regra.id, customerId: "C2" });
  assert.equal(trocado?.customerId, "C2");
  assert.equal(trocado?.serviceType, "reboque", "trocar um eixo não pode arrastar o outro junto");

  // `null` = "volta a ser qualquer". Sem o tri-state não existiria como desfazer uma restrição: só apagando
  // a regra e recriando — e recriar perde a proveniência que a PR-04b vai gravar na ordem de serviço.
  const limpo = await repo.update({ tenantId: ORG, ruleId: regra.id, customerId: null, serviceType: null, notes: null });
  assert.equal(limpo?.customerId, undefined);
  assert.equal(limpo?.serviceType, undefined);
  assert.equal(limpo?.notes, undefined);
});

test("tri-state: limpar um eixo pode CRIAR conflito de bucket — e a recusa não pode corromper o estado", async () => {
  const repo = repositorio();
  const curinga = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  const doCliente = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection", customerId: "C1" });
  const antes = await repo.findById(ORG, doCliente.id);

  // O caso que só aparece no `update`: a regra do cliente C1 é legítima hoje. Ao limpar o cliente ela passa
  // a disputar o bucket curinga, que já é da M1. É o mesmo estouro do índice, disparado por edição em vez
  // de criação — e é justamente o caminho que um `update` sem checagem deixaria passar.
  await assert.rejects(
    () => repo.update({ tenantId: ORG, ruleId: doCliente.id, customerId: null }),
    conflitoDeBucket,
  );

  const depois = await repo.findById(ORG, doCliente.id);
  assert.equal(depois?.customerId, "C1", "a edição recusada tem de ser atômica: nada pela metade");
  assert.equal(depois?.updatedAt.getTime(), antes?.updatedAt.getTime(), "nem o carimbo de edição pode ter mexido");
  assert.equal((await repo.findById(ORG, curinga.id))?.templateId, "M1");
  assert.equal((await repo.listActive(ORG)).length, 2);
});

test("tri-state: trocar a ETAPA move a regra de bucket — e colide se a etapa de destino já estiver tomada", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "delivery" });
  const daColeta = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });

  await assert.rejects(
    () => repo.update({ tenantId: ORG, ruleId: daColeta.id, role: "delivery" }),
    conflitoDeBucket,
  );

  // Para etapa livre, a mudança passa: `generic` é outro bucket.
  const movida = await repo.update({ tenantId: ORG, ruleId: daColeta.id, role: "generic" });
  assert.equal(movida?.role, "generic");
});

test("tri-state: editar a própria regra sem mudar de bucket não colide consigo mesma", async () => {
  const repo = repositorio();
  const regra = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection", customerId: "C1" });

  // Se `bucketOcupado` não excluísse a própria candidata, TODA edição de regra ativa seria recusada — a
  // funcionalidade inteira ficaria travada no primeiro PATCH.
  const editada = await repo.update({ tenantId: ORG, ruleId: regra.id, notes: "revisado" });
  assert.equal(editada?.notes, "revisado");
  assert.equal(editada?.customerId, "C1");
});

// ── 5. LISTAGEM: o apagado não some do banco, mas some da tela ─────────────────────────────────

test("list: esconde as apagadas por padrão e as mostra com `includeDeleted`", async () => {
  const repo = repositorio();
  const viva = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  const morta = await repo.create({ tenantId: ORG, templateId: "M2", role: "delivery" });
  await repo.softDelete(ORG, morta.id);

  const padrao = await repo.list({ tenantId: ORG });
  assert.deepEqual(padrao.map((regra) => regra.id), [viva.id], "a tela do administrador não mostra lixo apagado");

  const comApagadas = await repo.list({ tenantId: ORG, includeDeleted: true });
  assert.equal(comApagadas.length, 2, "o histórico continua acessível — soft-delete não é delete");
  assert.equal(comApagadas.some((regra) => regra.id === morta.id), true);
});

test("list: filtra por modelo e por etapa sem misturar os dois filtros", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  await repo.create({ tenantId: ORG, templateId: "M1", role: "delivery" });
  await repo.create({ tenantId: ORG, templateId: "M2", role: "collection", customerId: "C1" });

  assert.equal((await repo.list({ tenantId: ORG, templateId: "M1" })).length, 2);
  assert.equal((await repo.list({ tenantId: ORG, role: "collection" })).length, 2);
  assert.equal((await repo.list({ tenantId: ORG, templateId: "M1", role: "collection" })).length, 1);
});

test("listActive: só regras VIVAS — é a entrada da resolução, e ela não pode receber nem apagada nem desativada", async () => {
  const repo = repositorio();
  const viva = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  const desativada = await repo.create({ tenantId: ORG, templateId: "M2", role: "delivery", isActive: false });
  const apagada = await repo.create({ tenantId: ORG, templateId: "M3", role: "generic" });
  await repo.softDelete(ORG, apagada.id);

  const ativas = await repo.listActive(ORG);

  assert.deepEqual(ativas.map((regra) => regra.id), [viva.id]);
  assert.equal(ativas.some((regra) => regra.id === desativada.id), false);
  assert.equal(ativas.some((regra) => regra.id === apagada.id), false);
});

// ── 6. ISOLAMENTO POR ORGANIZAÇÃO: em TODOS os métodos, não só na leitura ──────────────────────

test("isolamento: nenhum método atravessa a fronteira da organização", async () => {
  const repo = repositorio();
  const daOrg = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection", notes: "original" });
  const daOutra = await repo.create({ tenantId: OUTRA_ORG, templateId: "M9", role: "collection" });

  // Leitura por id: conhecer o id de outra organização não pode bastar.
  assert.equal(await repo.findById(OUTRA_ORG, daOrg.id), undefined);
  assert.equal(await repo.findById(ORG, daOutra.id), undefined);

  // Listagens.
  assert.deepEqual((await repo.list({ tenantId: OUTRA_ORG })).map((regra) => regra.id), [daOutra.id]);
  assert.deepEqual((await repo.list({ tenantId: OUTRA_ORG, includeDeleted: true })).map((regra) => regra.id), [daOutra.id]);
  assert.deepEqual((await repo.listActive(OUTRA_ORG)).map((regra) => regra.id), [daOutra.id]);

  // ESCRITA é o que importa mais: o RLS do banco recusa, e a memória tem de recusar igual. Um `update`
  // que atravessasse aqui seria adulteração de configuração alheia — e a única prova é este teste, porque
  // nesta fatia não existe rota nem serviço para um teste de permissão pegar.
  assert.equal(await repo.update({ tenantId: OUTRA_ORG, ruleId: daOrg.id, notes: "adulterado" }), undefined);
  assert.equal(await repo.softDelete(OUTRA_ORG, daOrg.id), undefined);

  const intacta = await repo.findById(ORG, daOrg.id);
  assert.equal(intacta?.notes, "original");
  assert.equal(intacta?.isActive, true);
  assert.equal(intacta?.deletedAt, undefined);
});

test("isolamento: o bucket de uma organização não é liberado nem ocupado pela outra", async () => {
  const repo = repositorio();
  const daOrg = await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });
  await repo.create({ tenantId: OUTRA_ORG, templateId: "M9", role: "collection" });

  // Apagar na org A não pode liberar o bucket da org B.
  await repo.softDelete(ORG, daOrg.id);
  await assert.rejects(
    () => repo.create({ tenantId: OUTRA_ORG, templateId: "M8", role: "collection" }),
    conflitoDeBucket,
  );

  // E o bucket da org A ficou de fato livre.
  const nova = await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });
  assert.equal(nova.tenantId, ORG);
});

// ── 7. RESET: o utilitário de teste não pode vazar entre suítes ────────────────────────────────

test("reset: limpa tudo — sem isso, um teste contaminaria o bucket do seguinte", async () => {
  const repo = repositorio();
  await repo.create({ tenantId: ORG, templateId: "M1", role: "collection" });

  repo.reset();

  assert.deepEqual(await repo.list({ tenantId: ORG, includeDeleted: true }), []);
  await repo.create({ tenantId: ORG, templateId: "M2", role: "collection" });
});
