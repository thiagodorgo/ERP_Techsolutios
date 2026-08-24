// Povoa o DOSSIÊ de cada veículo recolhido: vistoria de entrada, execução de
// checklist com fotos das quatro vistas, e o vínculo processo ↔ checklist.
//
// Por que existe: o dossiê é a peça de custódia jurídica — é o que prova o estado
// do veículo na entrada. Sem foto e sem vistoria ele abre vazio, e numa demonstração
// o argumento regulatório (Res. CONTRAN 1025/2026) fica sem lastro visual.
//
// As fotos são os assets reais do app de campo (`mobile/flutter_app/assets/images/`),
// copiados para `frontend/public/demo/vistoria/` e servidos pelo próprio front.
//
// Idempotente: identifica o que criou pelo prefixo e não duplica.
// NÃO apaga nada que não tenha criado. Nunca roda DELETE em massa.
//
// Uso:  node scripts/seed-demo-dossie.mjs
//       node scripts/seed-demo-dossie.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const MARCA = "DEMO-DOSSIE";
const TEMPLATE_NOME = "Vistoria de Entrada — Pátio";
const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

// Os assets existem para estes seis tipos, com quatro vistas cada.
const TIPOS = ["sedan", "pickup", "van", "truck", "bus", "motorcycle"];
const VISTAS = [
  { chave: "front", rotulo: "Frente" },
  { chave: "back", rotulo: "Traseira" },
  { chave: "left", rotulo: "Lateral esquerda" },
  { chave: "right", rotulo: "Lateral direita" },
];

// Marca do veículo → silhueta plausível. O que não casar cai em sedan.
const TIPO_POR_MODELO = {
  Uno: "sedan", Gol: "sedan", Onix: "sedan", Ka: "sedan", Civic: "sedan",
  Corolla: "sedan", HB20: "sedan", Sandero: "sedan", March: "sedan",
  Renegade: "pickup",
};

const ESTADOS_LATARIA = ["Íntegra", "Amassados leves", "Amassados na lateral direita", "Riscos superficiais", "Avaria frontal"];
const ESTADOS_PINTURA = ["Original", "Repintura parcial", "Desbotada", "Riscos profundos"];
const ESTADOS_PNEUS = ["Meia-vida", "Novos", "Desgastados", "Um pneu murcho"];
const OBJETOS = ["Nenhum objeto pessoal", "Documentos no porta-luvas", "Ferramentas no porta-malas", "Cadeirinha infantil"];
const FALTANTES = ["Nada faltando", "Triângulo ausente", "Estepe ausente", "Macaco e chave de roda ausentes"];
const PAPEL = "collection"; // checklist_runs_role_chk: collection | delivery | generic
const AGENTES = ["Carlos Menezes", "Fernanda Lopes", "Rafael Duarte", "Juliana Prado", "Marcos Vinícius"];

function tipoDoVeiculo(modelo, i) {
  return TIPO_POR_MODELO[modelo] ?? TIPOS[i % TIPOS.length];
}
function diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }

async function main() {
  const limpar = process.argv.includes("--limpar");
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: tRows } = await client.query("select id from tenants where slug = 'demo' limit 1");
  if (!tRows.length) throw new Error("tenant 'demo' não existe — rode `npm run db:seed` antes.");
  const tenantId = tRows[0].id;
  const { rows: uRows } = await client.query("select id from users where tenant_id = $1 limit 1", [tenantId]);
  const userId = uRows[0].id;

  if (limpar) {
    await client.query("delete from impound_process_checklist_links where tenant_id = $1 and checklist_run_id in (select id from checklist_runs where tenant_id = $1 and client_run_key like $2)", [tenantId, `${MARCA}%`]);
    await client.query("delete from checklist_attachments where tenant_id = $1 and file_name like $2", [tenantId, `${MARCA}%`]);
    await client.query("delete from checklist_run_answers where run_id in (select id from checklist_runs where tenant_id = $1 and client_run_key like $2)", [tenantId, `${MARCA}%`]);
    await client.query("delete from checklist_runs where tenant_id = $1 and client_run_key like $2", [tenantId, `${MARCA}%`]);
    await client.query("delete from impound_intake_inspections where tenant_id = $1 and observations like $2", [tenantId, `%${MARCA}%`]);
    await client.query("delete from checklist_template_components where template_id in (select id from checklist_templates where tenant_id = $1 and name = $2)", [tenantId, TEMPLATE_NOME]);
    await client.query("delete from checklist_templates where tenant_id = $1 and name = $2", [tenantId, TEMPLATE_NOME]);
    console.log("[seed-demo-dossie] removido o que este script havia criado.");
    await client.end();
    return;
  }

  const { rows: jaTem } = await client.query("select count(*)::int as n from checklist_runs where tenant_id = $1 and client_run_key like $2", [tenantId, `${MARCA}%`]);
  if (jaTem[0].n > 0) {
    console.log(`[seed-demo-dossie] já povoado (${jaTem[0].n} vistorias). Use --limpar para refazer.`);
    await client.end();
    return;
  }

  const agora = new Date();

  // 1. Um template de verdade. Os que existem no tenant demo são resíduo de teste
  //    ("HACKEADO" v99, cinco "Novo modelo" em rascunho) e não servem para demonstrar.
  const templateId = randomUUID();
  await client.query(
    `insert into checklist_templates (id, tenant_id, name, type, description, version, status, schema, created_by, updated_by, published_at, created_at, updated_at)
     values ($1,$2,$3,'towing_collection','Vistoria obrigatoria de entrada no patio — quatro vistas e estado de conservacao.',1,'published','{}'::jsonb,$5,$5,$4,$4,$4)`,
    [templateId, tenantId, TEMPLATE_NOME, agora, userId],
  );

  const componentes = [];
  const defs = [
    { key: "tipo_veiculo", type: "vehicle_selector", label: "Tipo de veículo", required: true },
    ...VISTAS.map((v) => ({ key: `foto_${v.chave}`, type: "photo_upload", label: `Foto — ${v.rotulo}`, required: true })),
    { key: "avarias", type: "observation", label: "Avarias e observações", required: false },
  ];
  let ordem = 0;
  for (const d of defs) {
    const id = randomUUID();
    await client.query(
      `insert into checklist_template_components (id, tenant_id, template_id, component_key, type, label, required, order_index, config, validation_rules, visibility_rules, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$9,$9)`,
      [id, tenantId, templateId, d.key, d.type, d.label, d.required, ordem, agora],
    );
    componentes.push({ id, ...d });
    ordem += 1;
  }

  // 2. Um dossiê por processo recolhido.
  const { rows: processos } = await client.query(
    `select id, vehicle_plate, vehicle_brand, vehicle_model, entered_at
       from impound_processes where tenant_id = $1 order by created_at limit 200`,
    [tenantId],
  );

  let vistorias = 0, fotos = 0, inspecoes = 0;
  const compFoto = Object.fromEntries(componentes.filter((c) => c.type === "photo_upload").map((c) => [c.key, c.id]));
  const compTipo = componentes.find((c) => c.type === "vehicle_selector").id;
  const compObs = componentes.find((c) => c.type === "observation").id;

  for (let i = 0; i < processos.length; i += 1) {
    const p = processos[i];
    const tipo = tipoDoVeiculo(p.vehicle_model, i);
    const quando = p.entered_at ?? diasAtras(30);
    const runId = randomUUID();

    await client.query(
      `insert into checklist_runs
        (id, tenant_id, template_id, template_version, related_entity_type, related_entity_id,
         status, started_by, completed_by, started_at, completed_at, client_run_key, role, created_at, updated_at)
       values ($1,$2,$3,1,'impound_process',$4,'completed',$5,$5,$6,$6,$7,$8,$6,$6)`,
      [runId, tenantId, templateId, p.id, userId, quando, `${MARCA}-${p.vehicle_plate}`, PAPEL],
    );
    vistorias += 1;

    await client.query(
      `insert into checklist_run_answers (id, tenant_id, run_id, component_id, value, metadata, created_at, updated_at)
       values ($1,$2,$3,$4,$5::jsonb,'{}'::jsonb,$6,$6)`,
      [randomUUID(), tenantId, runId, compTipo, JSON.stringify({ selected: tipo }), quando],
    );
    await client.query(
      `insert into checklist_run_answers (id, tenant_id, run_id, component_id, value, metadata, created_at, updated_at)
       values ($1,$2,$3,$4,$5::jsonb,'{}'::jsonb,$6,$6)`,
      [randomUUID(), tenantId, runId, compObs, JSON.stringify({ text: `${ESTADOS_LATARIA[i % ESTADOS_LATARIA.length]}. ${FALTANTES[i % FALTANTES.length]}.` }), quando],
    );

    for (const v of VISTAS) {
      const nome = `${MARCA}-${p.vehicle_plate}-${v.chave}.png`;
      await client.query(
        `insert into checklist_attachments (id, tenant_id, run_id, component_id, file_url, file_name, mime_type, size_bytes, metadata, created_by, created_at)
         values ($1,$2,$3,$4,$5,$6,'image/png',$7,$8::jsonb,$9,$10)`,
        [
          randomUUID(), tenantId, runId, compFoto[`foto_${v.chave}`],
          `/demo/vistoria/${tipo}-${v.chave}.png`, nome, 148000 + ((i * 37) % 90000),
          JSON.stringify({ vista: v.rotulo, placa: p.vehicle_plate, origem: "vistoria de entrada" }),
          userId, quando,
        ],
      );
      fotos += 1;
    }

    await client.query(
      `insert into impound_process_checklist_links (id, tenant_id, process_id, checklist_run_id, link_source, created_by, created_at)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [randomUUID(), tenantId, p.id, runId, "AUTO", userId, quando],
    );

    await client.query(
      `insert into impound_intake_inspections
        (id, tenant_id, process_id, inspected_at, agent_name, bodywork_state, paint_state, tires_state,
         internal_objects, missing_equipment, odometer_km, observations,
         signer_name, signature_status, signed_at, completed_at, completed_by, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'signed',$4,$4,$14,$14,$14,$4,$4)`,
      [
        randomUUID(), tenantId, p.id, quando, AGENTES[i % AGENTES.length],
        ESTADOS_LATARIA[i % ESTADOS_LATARIA.length], ESTADOS_PINTURA[i % ESTADOS_PINTURA.length], ESTADOS_PNEUS[i % ESTADOS_PNEUS.length],
        OBJETOS[i % OBJETOS.length], FALTANTES[i % FALTANTES.length],
        (18000 + ((i * 4137) % 180000)) / 10,
        `Vistoria de entrada conforme Res. CONTRAN 1025/2026. [${MARCA}]`,
        AGENTES[(i + 2) % AGENTES.length], userId,
      ],
    );
    inspecoes += 1;
  }

  console.log(`[seed-demo-dossie] template "${TEMPLATE_NOME}" com ${componentes.length} componentes.`);
  console.log(`[seed-demo-dossie] ${vistorias} vistorias · ${fotos} fotos · ${inspecoes} inspeções de entrada.`);
  const { rows: amostra } = await client.query(
    `select p.vehicle_plate, p.vehicle_brand||' '||p.vehicle_model as veiculo,
            (select count(*) from checklist_attachments a
               join impound_process_checklist_links l on l.checklist_run_id = a.run_id
              where l.process_id = p.id) as fotos
       from impound_processes p where p.tenant_id = $1 order by p.created_at limit 4`,
    [tenantId],
  );
  for (const r of amostra) console.log(`  ${String(r.vehicle_plate).padEnd(9)} ${String(r.veiculo).padEnd(22)} ${r.fotos} fotos`);

  await client.end();
}

main().catch((e) => {
  console.error("[seed-demo-dossie] falhou:", e.message);
  process.exit(1);
});
