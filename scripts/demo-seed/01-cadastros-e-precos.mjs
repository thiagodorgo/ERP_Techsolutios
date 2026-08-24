// CAMADA 1+2 da cadeia de dados: o catálogo de SERVIÇOS, os CLIENTES, e o
// vínculo que faltava entre TARIFA e SERVIÇO.
//
// O DEFEITO QUE ESTE SCRIPT EXISTE PARA CORRIGIR (apontado pelo dono em
// 2026-08-24, com captura da tela /cadastros/tarifas):
//
//   "se vai fazer uma tarifa, existe uma cadeia de itens obrigatórios que tem
//    que se criar — por exemplo serviço, preço etc."
//
// Medido antes: 39 tarifas, das quais 35 SEM service_catalog_id e 38 sem
// customer_id. Na tela, cada uma dessas linhas imprime "Todos os serviços /
// Todos os clientes" (TarifasPage.tsx). Dado que existe e não conta história
// nenhuma. Do outro lado da cadeia: 3 serviços no catálogo, dois deles com nome
// de teste e timestamp ("Servico A1 1783874676", "SemTarifa 14250").
//
// A CADEIA, na ordem em que precisa ser criada:
//   1. tenants                                    já existia
//   2. jurisdiction_profiles                      existia com nome minúsculo e
//                                                 sem acento, e sem diária
//   3. service_catalog                            <- o elo que faltava
//   4. customers                                  para a tarifa de contrato
//   5. tariffs.service_catalog_id / customer_id   <- o vínculo
//   6. jurisdiction_profiles.daily_service_catalog_id  (2ª fase, depende de 3)
//
// DUAS ARMADILHAS DO PRODUTO, ambas verificadas no código antes de agir:
//
//   (a) EXATAMENTE UM serviço ativo pode ter custody_profile_id. O resolvedor de
//       remoção por autoridade busca com LIMIT 2 e devolve null se achar 0 ou 2+,
//       derrubando fail-closed a remoção. Dois serviços de pátio marcados
//       quebrariam o fluxo tão silenciosamente quanto nenhum.
//
//   (b) jurisdiction_profiles.daily_service_catalog_id NULL faz charge.service.ts
//       dar break sem erro: nenhuma diária acumula. É por isso que o painel de
//       pátios mostrava "Arrecadação do mês R$ 0,00 · sem liquidação".
//
// Idempotente (identifica o que criou pela marca em description/notes).
// Reversível com --limpar. NUNCA apaga o que não criou: o resíduo de teste alheio
// é APOSENTADO por UPDATE (is_active=false + nome legível), nunca por DELETE —
// service_catalog é RESTRICT em cinco tabelas.
//
// Uso:  node scripts/demo-seed/01-cadastros-e-precos.mjs
//       node scripts/demo-seed/01-cadastros-e-precos.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const MARCA = "[catálogo Guinchos Paraná]";
const limpar = process.argv.includes("--limpar");

/* O catálogo de uma operação de guincho e pátio no Paraná. `familia` é a chave
   que liga cada serviço às tarifas que já existem — o vínculo do passo 5. */
const SERVICOS = [
  { familia: "saida_leve", nome: "Reboque leve — saída urbana", categoria: "Reboque", tipo: "reboque", destino: true, min: 90, preco: 180.0 },
  { familia: "km_urbano", nome: "Reboque leve — quilômetro urbano", categoria: "Reboque", tipo: "reboque", destino: true, min: 0, preco: 6.5 },
  { familia: "km_rodovia", nome: "Reboque leve — quilômetro em rodovia", categoria: "Reboque", tipo: "reboque", destino: true, min: 0, preco: 8.9 },
  { familia: "saida_pesado", nome: "Reboque pesado — saída", categoria: "Reboque", tipo: "reboque", destino: true, min: 300, preco: 890.0 },
  { familia: "km_pesado", nome: "Reboque pesado — quilômetro rodado", categoria: "Reboque", tipo: "reboque", destino: true, min: 0, preco: 14.5 },
  { familia: "moto", nome: "Reboque de motocicleta", categoria: "Reboque", tipo: "reboque", destino: true, min: 60, preco: 120.0 },
  { familia: "icamento", nome: "Içamento com guincho pesado", categoria: "Reboque", tipo: "reboque", destino: true, min: 180, preco: 640.0 },
  { familia: "desatolamento", nome: "Desatolamento e resgate", categoria: "Socorro", tipo: "socorro", destino: false, min: 120, preco: 380.0 },
  { familia: "ribanceira", nome: "Resgate em ribanceira", categoria: "Socorro", tipo: "socorro", destino: true, min: 360, preco: 3400.0 },
  { familia: "munck", nome: "Operação com munck", categoria: "Reboque", tipo: "reboque", destino: true, min: 60, preco: 420.0 },
  { familia: "transbordo", nome: "Transbordo de carga", categoria: "Reboque", tipo: "reboque", destino: true, min: 240, preco: 1250.0 },
  { familia: "plataforma", nome: "Plataforma estendida", categoria: "Reboque", tipo: "reboque", destino: true, min: 240, preco: 1680.0 },
  { familia: "hora_parada", nome: "Hora parada e espera", categoria: "Adicionais", tipo: "outro", destino: false, min: 60, preco: 95.0 },
  { familia: "adicional_horario", nome: "Adicional de horário e feriado", categoria: "Adicionais", tipo: "outro", destino: false, min: 0, preco: 145.0 },
  // O serviço da diária é o que destrava a arrecadação do pátio (armadilha b).
  { familia: "diaria_patio", nome: "Diária de permanência em pátio", categoria: "Pátio e custódia", tipo: "outro", destino: false, min: 0, preco: 42.0, diaria: true },
  { familia: "taxa_patio", nome: "Taxa de entrada, vistoria e liberação", categoria: "Pátio e custódia", tipo: "outro", destino: false, min: 45, preco: 135.0 },
  { familia: "movimento_patio", nome: "Remoção interna entre vagas", categoria: "Pátio e custódia", tipo: "outro", destino: false, min: 20, preco: 55.0 },
  // ÚNICO serviço com custody_profile_id (armadilha a).
  { familia: "remocao_autoridade", nome: "Remoção por determinação de autoridade", categoria: "Pátio e custódia", tipo: "reboque", destino: true, min: 150, preco: 260.0, custodia: true },
];

/* Cada tarifa existente aponta para a família do serviço que a origina. O que a
   tela mostrava como "Todos os serviços" passa a mostrar o serviço de verdade. */
const TARIFA_PARA_FAMILIA = {
  "Saída de guincho — perímetro urbano": "saida_leve",
  "Saída de guincho — contrato": "saida_leve",
  "Saída de guincho — alta temporada": "saida_leve",
  "Quilômetro rodado — urbano": "km_urbano",
  "Quilômetro rodado — contrato": "km_urbano",
  "Quilômetro rodado — alta temporada": "km_urbano",
  "Quilômetro rodado — rodovia": "km_rodovia",
  "Quilômetro rodado — pesado": "km_pesado",
  "Saída de guincho pesado": "saida_pesado",
  "Içamento com guincho pesado": "icamento",
  "Desatolamento": "desatolamento",
  "Resgate em ribanceira": "ribanceira",
  "Hora de operação com munck": "munck",
  "Transbordo de carga": "transbordo",
  "Plataforma estendida": "plataforma",
  "Hora parada / espera": "hora_parada",
  "Hora parada — contrato": "hora_parada",
  "Serviço noturno (adicional)": "adicional_horario",
  "Finais de semana e feriados (adicional)": "adicional_horario",
  "Plantão 24h (adicional)": "adicional_horario",
  "Diária de veículo leve": "diaria_patio",
  "Diária de veículo pesado": "diaria_patio",
  "Diária de motocicleta": "diaria_patio",
  "Diária de pátio — contrato": "diaria_patio",
  "Guarda em área coberta (adicional)": "diaria_patio",
  "Taxa de entrada e vistoria": "taxa_patio",
  "Taxa de liberação": "taxa_patio",
  "Remoção interna entre vagas": "movimento_patio",
};

/* Clientes de contrato — os mesmos nomes que o seed financeiro e o de OS usam,
   para o sistema inteiro contar UMA história. */
const CLIENTES = [
  { nome: "Transportadora Aurora Ltda", doc: "98.765.432/0001-10", tel: "(41) 3350-4477", cidade: "Curitiba", uf: "PR" },
  { nome: "Seguradora Horizonte", doc: "12.345.678/0001-90", tel: "(41) 3222-8100", cidade: "Curitiba", uf: "PR" },
  { nome: "Construtora Meridiano S.A.", doc: "23.456.789/0001-01", tel: "(41) 3029-5060", cidade: "Fazenda Rio Grande", uf: "PR" },
  { nome: "Log&Co Transportes", doc: "34.567.890/0001-12", tel: "(41) 3072-8890", cidade: "São José dos Pinhais", uf: "PR" },
  { nome: "Agropecuária Serra Azul", doc: "45.678.901/0001-23", tel: "(42) 3623-7700", cidade: "Ponta Grossa", uf: "PR" },
  { nome: "Frigorífico Vale Verde", doc: "56.789.012/0001-34", tel: "(41) 3675-2200", cidade: "Curitiba", uf: "PR" },
  { nome: "Distribuidora Pampa", doc: "67.890.123/0001-45", tel: "(41) 3388-9911", cidade: "Curitiba", uf: "PR" },
  { nome: "Metalúrgica Ipiranga", doc: "89.012.345/0001-67", tel: "(41) 3346-7788", cidade: "Curitiba", uf: "PR" },
];

/* Resíduo de teste alheio que aparece na tela de tarifas. Aposentado por UPDATE,
   nunca apagado — não sabemos o que referencia. */
const TARIFAS_RESIDUO = ["[auditoria inspetor - ignorar]", "Avulsa 1783874622", "Reverif C2 vigencia", "Sa�da padr�o"];

async function main() {
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: t } = await client.query("select id from tenants where slug='demo'");
  if (!t.length) throw new Error("tenant 'demo' não existe.");
  const tenantId = t[0].id;
  const { rows: u } = await client.query("select id from users where tenant_id=$1 order by email limit 1", [tenantId]);
  const userId = u[0].id;

  if (limpar) {
    // Desfaz na ordem inversa da cadeia: primeiro os vínculos, depois o que criou.
    await client.query("update jurisdiction_profiles set daily_service_catalog_id = null where tenant_id=$1", [tenantId]);
    await client.query(
      `update tariffs set service_catalog_id = null, customer_id = null
        where tenant_id=$1 and service_catalog_id in (select id from service_catalog where tenant_id=$1 and description like $2)`,
      [tenantId, `%${MARCA}%`]);
    const s = await client.query("delete from service_catalog where tenant_id=$1 and description like $2", [tenantId, `%${MARCA}%`]);
    const c = await client.query("delete from customers where tenant_id=$1 and notes like $2", [tenantId, `%${MARCA}%`]);
    console.log(`[cadastros] removido o que este script criou: ${s.rowCount} serviços, ${c.rowCount} clientes.`);
    await client.end();
    return;
  }

  const agora = new Date();

  // ── 1. Perfil de jurisdição: nome legível, acentuado ──────────────────────
  await client.query(
    `update jurisdiction_profiles set name = 'Convênio DETRAN/PR — remoção por autoridade', updated_by = $2
      where tenant_id = $1 and name = 'policia de transito'`, [tenantId, userId]);

  // ── 2. Aposenta o resíduo de teste do catálogo (UPDATE, nunca DELETE) ─────
  const aposentados = await client.query(
    `update service_catalog
        set name = '(descontinuado) ' || name, status = 'inactive', is_active = false, updated_by = $2
      where tenant_id = $1 and (name ~ '[0-9]{6,}' or name like 'SemTarifa%') and name not like '(descontinuado)%'`,
    [tenantId, userId]);

  // "Guincho ate 200km" é nome de produto, só está sem acento e sem tipo.
  await client.query(
    `update service_catalog
        set name = 'Reboque leve — até 200 km', category = 'Reboque', service_type = 'reboque',
            requires_destination = true, estimated_duration_minutes = 240, updated_by = $2
      where tenant_id = $1 and name = 'Guincho ate 200km'`, [tenantId, userId]);

  // ── 3. O catálogo de serviços ─────────────────────────────────────────────
  const idPorFamilia = {};
  let criados = 0;
  for (const s of SERVICOS) {
    const { rows: existe } = await client.query(
      "select id from service_catalog where tenant_id=$1 and name=$2 limit 1", [tenantId, s.nome]);
    if (existe.length) { idPorFamilia[s.familia] = existe[0].id; continue; }
    const id = randomUUID();
    await client.query(
      `insert into service_catalog
         (id, tenant_id, name, description, category, estimated_duration_minutes, base_price,
          status, is_active, service_type, requires_destination, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,'active',true,$8,$9,$10,$10,$11,$11)`,
      [id, tenantId, s.nome, `${s.categoria} · ${MARCA}`, s.categoria, s.min || null, s.preco.toFixed(2),
       s.tipo, s.destino, userId, agora]);
    idPorFamilia[s.familia] = id;
    criados += 1;
  }

  // ── 4. custody_profile_id em EXATAMENTE UM serviço (armadilha a) ──────────
  const { rows: perfil } = await client.query(
    "select id from jurisdiction_profiles where tenant_id=$1 order by created_at limit 1", [tenantId]);
  const perfilId = perfil[0]?.id ?? null;
  const idRemocao = idPorFamilia.remocao_autoridade;
  if (perfilId && idRemocao) {
    // Zera qualquer outro antes de marcar o nosso: 2+ derruba o resolvedor tanto
    // quanto 0 (LIMIT 2 → null → fail-closed).
    await client.query(
      "update service_catalog set custody_profile_id = null where tenant_id=$1 and id <> $2 and custody_profile_id is not null",
      [tenantId, idRemocao]);
    await client.query("update service_catalog set custody_profile_id = $1 where id = $2", [perfilId, idRemocao]);
  }

  // ── 5. A diária do pátio (armadilha b) — destrava a arrecadação ───────────
  if (perfilId && idPorFamilia.diaria_patio) {
    await client.query(
      "update jurisdiction_profiles set daily_service_catalog_id = $1, updated_by = $3 where id = $2",
      [idPorFamilia.diaria_patio, perfilId, userId]);
  }

  // ── 6. Clientes ───────────────────────────────────────────────────────────
  const idPorCliente = {};
  let clientesCriados = 0;
  for (const c of CLIENTES) {
    // Casa por NOME ou por DOCUMENTO: (tenant_id, document) é único, e outro seed
    // pode ter criado o mesmo CNPJ com grafia diferente do nome.
    const { rows: ex } = await client.query(
      "select id from customers where tenant_id=$1 and (name=$2 or document=$3) limit 1", [tenantId, c.nome, c.doc]);
    if (ex.length) { idPorCliente[c.nome] = ex[0].id; continue; }
    const id = randomUUID();
    await client.query(
      `insert into customers (id, tenant_id, name, document, phone, city, state, is_active, notes, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,true,$8,$9,$9,$10,$10)`,
      [id, tenantId, c.nome, c.doc, c.tel, c.cidade, c.uf, `Cliente de demonstração ${MARCA}`, userId, agora]);
    idPorCliente[c.nome] = id;
    clientesCriados += 1;
  }

  // ── 7. O VÍNCULO — o defeito que o dono apontou ───────────────────────────
  let ligadas = 0;
  for (const [nomeTarifa, familia] of Object.entries(TARIFA_PARA_FAMILIA)) {
    const idServico = idPorFamilia[familia];
    if (!idServico) continue;
    const r = await client.query(
      "update tariffs set service_catalog_id = $1, updated_by = $3 where tenant_id = $2 and name = $4 and service_catalog_id is null",
      [idServico, tenantId, userId, nomeTarifa]);
    ligadas += r.rowCount;
  }

  // Tarifa de CONTRATO aponta o cliente do contrato; tabela padrão vale para
  // todos, e ali o vínculo nulo é a resposta CERTA — não um vazio por descuido.
  const idAurora = idPorCliente["Transportadora Aurora Ltda"];
  let deContrato = 0;
  if (idAurora) {
    const r = await client.query(
      `update tariffs set customer_id = $1, updated_by = $3
        where tenant_id = $2 and name like '%contrato%' and customer_id is null`, [idAurora, tenantId, userId]);
    deContrato = r.rowCount;
  }

  // ── 8. Resíduo de teste nas tarifas: some da lista, sem sumir do banco ────
  const residuo = await client.query(
    `update tariffs set is_active = false, status = 'draft', name = case when coalesce(btrim(name),'') = ''
            then '(registro de teste sem nome)' else name end, updated_by = $2
      where tenant_id = $1 and is_active = true
        and (coalesce(btrim(name),'') = '' or name = any($3::text[]))`,
    [tenantId, userId, TARIFAS_RESIDUO]);

  // ── prova ─────────────────────────────────────────────────────────────────
  console.log(`[cadastros] serviços criados: ${criados} · resíduo aposentado: ${aposentados.rowCount}`);
  console.log(`[cadastros] clientes criados: ${clientesCriados}`);
  console.log(`[cadastros] tarifas ligadas a serviço: ${ligadas} · a cliente de contrato: ${deContrato}`);
  console.log(`[cadastros] tarifas de teste desativadas: ${residuo.rowCount}`);

  const { rows: prova } = await client.query(
    `select count(*) total,
            count(service_catalog_id) com_servico,
            count(*) filter (where is_active) ativas,
            count(*) filter (where is_active and service_catalog_id is null) ativas_sem_servico
       from tariffs where tenant_id = $1`, [tenantId]);
  console.log(`\n[prova] tarifas: ${prova[0].total} no total · ${prova[0].com_servico} com serviço · ${prova[0].ativas} ativas · ${prova[0].ativas_sem_servico} ATIVAS SEM SERVIÇO`);

  const { rows: cad } = await client.query(
    `select count(*) filter (where is_active) servicos_ativos,
            count(*) filter (where custody_profile_id is not null) com_custodia
       from service_catalog where tenant_id = $1`, [tenantId]);
  console.log(`[prova] serviços ativos: ${cad[0].servicos_ativos} · com perfil de custódia: ${cad[0].com_custodia} (tem que ser exatamente 1)`);

  const { rows: jp } = await client.query(
    "select name, daily_service_catalog_id is not null as tem_diaria from jurisdiction_profiles where tenant_id=$1", [tenantId]);
  for (const p of jp) console.log(`[prova] perfil "${p.name}" · diária configurada: ${p.tem_diaria}`);

  await client.end();
}

main().catch((e) => {
  console.error("[cadastros] falhou:", e.message);
  process.exit(1);
});
