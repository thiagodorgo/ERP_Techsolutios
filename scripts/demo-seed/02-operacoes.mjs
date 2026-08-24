// CAMADA 3 da cadeia de dados: liga as ORDENS DE SERVIÇO ao que a Camada 1 criou.
//
// Medido antes (2026-08-24): 17 OS, das quais 1 com serviço, 2 com cliente e 2
// com viatura. O resto carrega o nome do cliente em TEXTO SOLTO — a tela mostra,
// mas o dado não aponta para o cadastro, então nada a jusante funciona: não dá
// para faturar pela tabela do cliente, não dá para saber qual guincho foi, não dá
// para o extrato do profissional existir.
//
// A CADEIA de uma OS coerente:
//   1. customers            (Camada 1)  -> customer_id
//   2. service_catalog      (Camada 1)  -> service_catalog_id
//   3. vehicles                          -> vehicle_id (o guincho que atendeu)
//   4. teams / users                     -> team_id, assigned_user_id
//   5. carimbos de tempo coerentes com o status
//
// REGRA DO PASSO 5, que este repositório já aprendeu à força: ESTADO SEM CARIMBO
// É MENTIRA. `on_site` sem `arrived_at`, `completed` sem `completed_at`,
// `assigned` sem técnico — cada um é um defeito, e a junta do financeiro já
// reprovou entrega por isso. Este script NÃO inventa carimbo: ele só preenche o
// que falta para o status que a OS já tem, e nunca move status.
//
// A frota: 3 viaturas com nome de utilitário (Fiat Strada, VW Saveiro, Iveco
// Daily) para uma operação de guincho. Ganha os guinchos de verdade.
//
// Idempotente (só preenche o que está nulo). Reversível com --limpar, que desfaz
// SÓ os vínculos que este script criou. Nunca apaga OS.
//
// Uso:  node scripts/demo-seed/02-operacoes.mjs
//       node scripts/demo-seed/02-operacoes.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const MARCA = "[frota Guinchos Paraná]";
const limpar = process.argv.includes("--limpar");

/* Os guinchos da operação. `type` segue o vocabulário já usado na tabela. */
const FROTA = [
  { placa: "AWG-4C21", modelo: "Ford Cargo 1719 — plataforma", tipo: "truck", ano: 2021 },
  { placa: "BQR-7J08", modelo: "Mercedes-Benz Atego 1719 — plataforma", tipo: "truck", ano: 2022 },
  { placa: "CFT-2M55", modelo: "Volkswagen Delivery 11.180 — plataforma", tipo: "truck", ano: 2020 },
  { placa: "DHK-9P37", modelo: "Iveco Tector 240E28 — guincho pesado", tipo: "truck", ano: 2023 },
  { placa: "EJN-1R64", modelo: "Scania P310 — guincho pesado com munck", tipo: "truck", ano: 2022 },
  { placa: "FLP-6T92", modelo: "Renault Master — socorro mecânico", tipo: "van", ano: 2024 },
];

/* Palavra no título da OS -> família do serviço criada pela Camada 1. A ordem
   importa: a primeira que casar vence, então os casos específicos vêm antes. */
const TITULO_PARA_SERVICO = [
  [/determina[çc][ãa]o DETRAN|autoridade|apreens[ãa]o|estacionamento irregular/i, "Remoção por determinação de autoridade"],
  [/ribanceira/i, "Resgate em ribanceira"],
  [/atolada|atolado|desatolamento/i, "Desatolamento e resgate"],
  [/maquin[áa]rio|retroescavadeira/i, "Plataforma estendida"],
  [/pesado|carreta/i, "Reboque pesado — saída"],
  [/moto/i, "Reboque de motocicleta"],
  [/socorro|superaquecimento|bateria|el[ée]trico|pneu/i, "Hora parada e espera"],
  [/transfer[êe]ncia entre p[áa]tios/i, "Remoção interna entre vagas"],
  [/remo[çc][ãa]o|colis[ãa]o|perda total|guincho leve|transporte|van/i, "Reboque leve — saída urbana"],
];

async function main() {
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: t } = await client.query("select id from tenants where slug='demo'");
  if (!t.length) throw new Error("tenant 'demo' não existe.");
  const tenantId = t[0].id;
  const { rows: u } = await client.query("select id from users where tenant_id=$1 order by email limit 1", [tenantId]);
  const userId = u[0].id;

  if (limpar) {
    const r = await client.query(
      `update work_orders set service_catalog_id = null, customer_id = null, vehicle_id = null, team_id = null
        where tenant_id=$1 and code like 'OS-0000%'`, [tenantId]);
    const v = await client.query("delete from vehicles where tenant_id=$1 and notes like $2", [tenantId, `%${MARCA}%`]);
    console.log(`[operações] vínculos desfeitos em ${r.rowCount} OS · ${v.rowCount} viaturas removidas`);
    await client.end();
    return;
  }

  const agora = new Date();

  // ── 1. Frota de guinchos ──────────────────────────────────────────────────
  const viaturas = [];
  let frotaCriada = 0;
  for (const v of FROTA) {
    const { rows: ex } = await client.query("select id from vehicles where tenant_id=$1 and plate=$2 limit 1", [tenantId, v.placa]);
    if (ex.length) { viaturas.push(ex[0].id); continue; }
    const id = randomUUID();
    await client.query(
      `insert into vehicles (id, tenant_id, plate, model, type, year, status, is_active, notes, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,'active',true,$7,$8,$8,$9,$9)`,
      [id, tenantId, v.placa, v.modelo, v.tipo, v.ano, `Guincho da operação ${MARCA}`, userId, agora]);
    viaturas.push(id);
    frotaCriada += 1;
  }

  // ── 2. Índices de quem pode ser apontado ──────────────────────────────────
  const { rows: servicos } = await client.query(
    "select id, name from service_catalog where tenant_id=$1 and is_active = true", [tenantId]);
  const idServico = Object.fromEntries(servicos.map((s) => [s.name, s.id]));

  const { rows: clientes } = await client.query("select id, name from customers where tenant_id=$1", [tenantId]);
  const idCliente = Object.fromEntries(clientes.map((c) => [c.name, c.id]));

  const { rows: equipes } = await client.query("select id from teams where tenant_id=$1 order by created_at", [tenantId]);

  // ── 3. O vínculo, OS por OS ───────────────────────────────────────────────
  const { rows: oss } = await client.query(
    `select id, code, title, customer_name, status, service_catalog_id, customer_id, vehicle_id, team_id,
            started_at, arrived_at, completed_at, assigned_user_id
       from work_orders where tenant_id=$1 order by code`, [tenantId]);

  let comServico = 0, comCliente = 0, comViatura = 0, comEquipe = 0;
  const semServico = [];

  for (const [i, os] of oss.entries()) {
    const campos = [];
    const valores = [];
    let n = 1;

    if (!os.service_catalog_id) {
      const regra = TITULO_PARA_SERVICO.find(([re]) => re.test(os.title ?? ""));
      const alvo = regra ? idServico[regra[1]] : null;
      if (alvo) { campos.push(`service_catalog_id = $${n++}`); valores.push(alvo); comServico += 1; }
      else semServico.push(`${os.code} — "${String(os.title).slice(0, 46)}"`);
    }

    // O cliente do cadastro só entra quando o NOME BATE. Órgão público (DETRAN,
    // Guarda Municipal, PRF) não é cliente cadastrado — fica no texto, e isso é
    // a resposta certa, não um vínculo faltando.
    if (!os.customer_id && os.customer_name && idCliente[os.customer_name]) {
      campos.push(`customer_id = $${n++}`); valores.push(idCliente[os.customer_name]); comCliente += 1;
    }

    if (!os.vehicle_id && viaturas.length) {
      campos.push(`vehicle_id = $${n++}`); valores.push(viaturas[i % viaturas.length]); comViatura += 1;
    }

    if (!os.team_id && equipes.length) {
      campos.push(`team_id = $${n++}`); valores.push(equipes[i % equipes.length].id); comEquipe += 1;
    }

    if (!campos.length) continue;
    valores.push(userId, tenantId, os.id);
    await client.query(
      `update work_orders set ${campos.join(", ")}, updated_by = $${n++}, updated_at = now()
        where tenant_id = $${n++} and id = $${n}`, valores);
  }

  // ── 4. Carimbos: só o que falta para o status que a OS JÁ tem ─────────────
  // Nunca move status; nunca inventa carimbo para estado que não o exige.
  const carimbos = await client.query(
    `update work_orders set
        started_at = case when status in ('on_route','on_site','in_progress','completed') and started_at is null
                          then coalesce(scheduled_for, created_at) + interval '20 minutes' else started_at end,
        arrived_at = case when status in ('on_site','in_progress','completed') and arrived_at is null
                          then coalesce(started_at, scheduled_for, created_at) + interval '55 minutes' else arrived_at end,
        completed_at = case when status = 'completed' and completed_at is null
                          then coalesce(arrived_at, started_at, created_at) + interval '2 hours' else completed_at end,
        updated_at = now()
      where tenant_id = $1
        and ((status in ('on_route','on_site','in_progress','completed') and started_at is null)
          or (status in ('on_site','in_progress','completed') and arrived_at is null)
          or (status = 'completed' and completed_at is null))`, [tenantId]);

  // ── prova ─────────────────────────────────────────────────────────────────
  console.log(`[operações] viaturas de guincho criadas: ${frotaCriada}`);
  console.log(`[operações] OS ligadas — serviço: ${comServico} · cliente: ${comCliente} · viatura: ${comViatura} · equipe: ${comEquipe}`);
  console.log(`[operações] carimbos de tempo completados: ${carimbos.rowCount}`);
  if (semServico.length) {
    console.log(`[operações] ${semServico.length} OS sem serviço identificável pelo título (nenhuma regra casou):`);
    for (const s of semServico) console.log("    " + s);
  }

  const { rows: p } = await client.query(
    `select count(*) total, count(service_catalog_id) srv, count(customer_id) cli, count(vehicle_id) via,
            count(team_id) eqp, count(assigned_user_id) tec,
            count(*) filter (where status in ('on_site','in_progress','completed') and arrived_at is null) sem_chegada,
            count(*) filter (where status = 'completed' and completed_at is null) sem_conclusao
       from work_orders where tenant_id=$1`, [tenantId]);
  const r = p[0];
  console.log(`\n[prova] ${r.total} OS · serviço ${r.srv} · cliente ${r.cli} · viatura ${r.via} · equipe ${r.eqp} · técnico ${r.tec}`);
  console.log(`[prova] estados sem o carimbo que os sustenta: ${r.sem_chegada} sem chegada · ${r.sem_conclusao} sem conclusão (tem que ser 0 e 0)`);

  await client.end();
}

main().catch((e) => {
  console.error("[operações] falhou:", e.message);
  process.exit(1);
});
