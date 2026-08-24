// CAMADA 6 da cadeia de dados: o que pendura na VIATURA.
//
// Medido antes (2026-08-24): 5 abastecimentos, 2 manutenções, 1 multa, 2 apólices
// e 1 dano — para uma frota que a Camada 3 acabou de levar a 9 veículos. As telas
// de Frota abriam corretas e quase vazias, que numa demonstração é pior do que
// não abrir.
//
// A CADEIA é curta e toda para o mesmo lado: tudo aqui aponta VEÍCULO (Camada 3).
// Sem frota, este módulo inteiro fica pobre junto — foi por isso que ele ficou por
// último.
//
// COERÊNCIA QUE O SCRIPT MANTÉM, porque sem ela o dado passa na tela e não
// sobrevive a uma pergunta:
//   · odômetro CRESCENTE por veículo ao longo do tempo — abastecimento com
//     hodômetro que anda para trás é dado que ninguém consegue defender
//   · litros × preço/litro batendo com o valor total, na faixa do diesel S-10 no
//     Paraná (R$ 6,10 a R$ 6,60 no período)
//   · manutenção concluída tem `completed_at`; agendada não tem — estado sem o
//     carimbo que o sustenta é a classe de defeito que a junta do financeiro
//     reprovou
//   · multa com prazo de recurso ANTES do prazo de pagamento, e nº do auto no
//     formato do DETRAN/PR
//   · apólice com vigência de 12 meses cobrindo o presente
//
// Idempotente (marca o que criou em `notes`/`descricao`). Reversível com --limpar.
// Nunca apaga o que não criou.
//
// Uso:  node scripts/demo-seed/04-frota.mjs
//       node scripts/demo-seed/04-frota.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const MARCA = "[frota Guinchos Paraná]";
const limpar = process.argv.includes("--limpar");

const POSTOS = [
  "Posto Ipiranga — BR-277 km 84",
  "Posto Shell — Av. das Torres",
  "Posto Petrobras — Contorno Leste",
  "Posto Ale — BR-116 km 100",
  "Posto Texaco — Cidade Industrial",
];

const MANUTENCOES = [
  { tipo: "preventive", desc: "Revisão de 20.000 km — óleo, filtros e correias", custo: 1480.0, forn: "Oficina Mecânica Rodovia" },
  { tipo: "corrective", desc: "Troca do cabo de aço do guincho", custo: 2360.0, forn: "Auto Peças Central" },
  { tipo: "preventive", desc: "Alinhamento, balanceamento e rodízio de pneus", custo: 620.0, forn: "Pneus & Cia" },
  { tipo: "corrective", desc: "Reparo no sistema hidráulico da plataforma", custo: 4180.0, forn: "Oficina Mecânica Rodovia" },
  { tipo: "preventive", desc: "Inspeção do sistema de freios e sapatas", custo: 890.0, forn: "Auto Peças Central" },
  { tipo: "corrective", desc: "Substituição do motor de partida", custo: 1750.0, forn: "Auto Peças Central" },
  { tipo: "preventive", desc: "Troca de bateria e revisão elétrica", custo: 980.0, forn: "Auto Peças Central" },
  { tipo: "corrective", desc: "Reparo na roldana do munck", custo: 3240.0, forn: "Oficina Mecânica Rodovia" },
];

const INFRACOES = [
  { desc: "Excesso de velocidade — até 20% acima do limite", valor: 130.16, pontos: 4, orgao: "DER/PR" },
  { desc: "Estacionar em local proibido", valor: 195.23, pontos: 5, orgao: "Prefeitura de Curitiba" },
  { desc: "Transitar em faixa exclusiva de ônibus", valor: 195.23, pontos: 5, orgao: "Prefeitura de Curitiba" },
  { desc: "Excesso de peso no eixo traseiro", valor: 542.09, pontos: 5, orgao: "PRF" },
  { desc: "Avanço de sinal vermelho", valor: 293.47, pontos: 7, orgao: "DETRAN/PR" },
  { desc: "Não portar CRLV do reboque", valor: 130.16, pontos: 3, orgao: "DETRAN/PR" },
];

const SEGURADORAS = ["Seguradora Horizonte", "Porto Vale Seguros", "Aliança Frota Segura"];

const dias = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
const daqui = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function main() {
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: t } = await client.query("select id from tenants where slug='demo'");
  if (!t.length) throw new Error("tenant 'demo' não existe.");
  const tenantId = t[0].id;
  const { rows: u } = await client.query("select id from users where tenant_id=$1 order by email limit 1", [tenantId]);
  const userId = u[0].id;

  if (limpar) {
    let n = 0;
    for (const [tb, col] of [["fuel_logs", "notes"], ["maintenance_orders", "description"], ["fines", "descricao"], ["insurance_policies", "cobertura"]]) {
      const r = await client.query(`delete from ${tb} where tenant_id = $1 and ${col} like $2`, [tenantId, `%${MARCA}%`]);
      n += r.rowCount;
    }
    console.log(`[frota] removido o que este script criou: ${n} registros`);
    await client.end();
    return;
  }

  const { rows: veiculos } = await client.query(
    "select id, plate, model from vehicles where tenant_id=$1 and is_active order by plate", [tenantId]);
  if (!veiculos.length) throw new Error("nenhuma viatura ativa — rode 02-operacoes.mjs antes.");

  const { rows: tecnicos } = await client.query(
    "select id from users where tenant_id=$1 and email like 'tecnico%' order by email", [tenantId]);

  const agora = new Date();
  const jaTem = async (tb, col) =>
    Number((await client.query(`select count(*)::int n from ${tb} where tenant_id=$1 and ${col} like $2`, [tenantId, `%${MARCA}%`])).rows[0].n);

  // ── 1. ABASTECIMENTO — odômetro crescente por veículo ─────────────────────
  let combustivel = 0;
  if (await jaTem("fuel_logs", "notes") === 0) {
    for (const [iv, v] of veiculos.entries()) {
      // O odômetro parte de ONDE A VIATURA JÁ ESTÁ, não de um número escolhido —
      // e as datas começam DEPOIS do último abastecimento dela. Sem isso, os
      // registros novos se intercalam com os antigos por data e o hodômetro anda
      // para trás. Foi o próprio guard deste script que pegou: 4 casos.
      const { rows: ult } = await client.query(
        `select coalesce(max(odometer), 0) odo, max(fueled_at) quando
           from fuel_logs where tenant_id = $1 and vehicle_id = $2`, [tenantId, v.id]);
      const base = Number(ult[0].odo) || 48000 + iv * 21500;
      const desde = ult[0].quando ? new Date(ult[0].quando) : dias(70);
      let odometro = base;
      for (let k = 9; k >= 0; k -= 1) {
        odometro += 780 + ((iv * 7 + k * 13) % 420);
        const litros = 120 + ((iv * 11 + k * 17) % 90);
        const precoLitro = 6.10 + (((iv + k) % 6) * 0.10);
        await client.query(
          `insert into fuel_logs (id, tenant_id, vehicle_id, operator_id, fueled_at, fuel_type, liters,
                                  total_value, odometer, station, notes, is_active, created_by, updated_by, created_at, updated_at)
           values ($1,$2,$3,$4,$5,'diesel_s10',$6,$7,$8,$9,$10,true,$11,$11,$12,$12)`,
          [randomUUID(), tenantId, v.id, tecnicos[(iv + k) % Math.max(tecnicos.length, 1)]?.id ?? null,
           new Date(desde.getTime() + ((10 - k) * 3 + iv) * 864e5),
           litros.toFixed(2), (litros * precoLitro).toFixed(2), odometro,
           POSTOS[(iv + k) % POSTOS.length], `Abastecimento de rota ${MARCA}`, userId, agora]);
        combustivel += 1;
      }
    }
  }

  // ── 2. MANUTENÇÃO — concluída carrega completed_at; agendada não ──────────
  let manut = 0;
  if (await jaTem("maintenance_orders", "description") === 0) {
    for (const [i, m] of MANUTENCOES.entries()) {
      const v = veiculos[i % veiculos.length];
      const concluida = i % 3 !== 0;
      const quando = dias(12 + i * 9);
      await client.query(
        `insert into maintenance_orders (id, tenant_id, vehicle_id, type, status, scheduled_for, completed_at,
                                         cost, supplier, odometer, description, is_active, next_due_at,
                                         created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,true,$12,$13,$13,$14,$14)`,
        [randomUUID(), tenantId, v.id, m.tipo, concluida ? "completed" : "scheduled",
         quando, concluida ? new Date(quando.getTime() + 6 * 3600e3) : null,
         concluida ? m.custo.toFixed(2) : null, m.forn, 52000 + i * 6400,
         `${m.desc} ${MARCA}`, daqui(60 + i * 15), userId, agora]);
      manut += 1;
    }
  }

  // ── 3. MULTAS — recurso ANTES do pagamento, auto no formato do DETRAN/PR ──
  let multas = 0;
  if (await jaTem("fines", "descricao") === 0) {
    for (const [i, f] of INFRACOES.entries()) {
      const v = veiculos[i % veiculos.length];
      const infracao = dias(25 + i * 11);
      await client.query(
        `insert into fines (id, tenant_id, vehicle_id, driver_id, numero_auto, data_infracao, orgao, descricao,
                            valor, pontos, prazo_recurso, prazo_pagamento, status, is_active,
                            created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,true,$14,$14,$15,$15)`,
        [randomUUID(), tenantId, v.id, tecnicos[i % Math.max(tecnicos.length, 1)]?.id ?? null,
         `PR${String(2600000 + i * 4177).padStart(9, "0")}`, infracao, f.orgao,
         `${f.desc} ${MARCA}`, f.valor.toFixed(2), f.pontos,
         new Date(infracao.getTime() + 30 * 864e5), new Date(infracao.getTime() + 45 * 864e5),
         i % 3 === 0 ? "paid" : i % 3 === 1 ? "pending" : "appealed", userId, agora]);
      multas += 1;
    }
  }

  // ── 4. APÓLICES — vigência de 12 meses cobrindo o presente ────────────────
  let apolices = 0;
  if (await jaTem("insurance_policies", "cobertura") === 0) {
    for (const [i, v] of veiculos.entries()) {
      const inicio = dias(120 + i * 12);
      await client.query(
        `insert into insurance_policies (id, tenant_id, vehicle_id, seguradora, numero_apolice, vigencia_inicio,
                                         vigencia_fim, valor, cobertura, status, is_active,
                                         created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',true,$10,$10,$11,$11)`,
        [randomUUID(), tenantId, v.id, SEGURADORAS[i % SEGURADORAS.length],
         `AP-2026-${String(48200 + i * 311).padStart(6, "0")}`, inicio,
         new Date(inicio.getTime() + 365 * 864e5), (4200 + i * 380).toFixed(2),
         `Casco + RCF-V + APP · guincho e reboque ${MARCA}`, userId, agora]);
      apolices += 1;
    }
  }

  console.log(`[frota] abastecimentos: ${combustivel} · manutenções: ${manut} · multas: ${multas} · apólices: ${apolices}`);

  // ── prova ─────────────────────────────────────────────────────────────────
  const { rows: p } = await client.query(
    `select (select count(*) from fuel_logs where tenant_id=$1) abast,
            (select count(*) from maintenance_orders where tenant_id=$1) manut,
            (select count(*) from fines where tenant_id=$1) multas,
            (select count(*) from insurance_policies where tenant_id=$1) apol,
            (select count(*) from maintenance_orders where tenant_id=$1 and status='completed' and completed_at is null) manut_sem_carimbo,
            (select count(*) from fines where tenant_id=$1 and prazo_recurso > prazo_pagamento) prazo_invertido`, [tenantId]);
  const r = p[0];
  console.log(`\n[prova] ${r.abast} abastecimentos · ${r.manut} manutenções · ${r.multas} multas · ${r.apol} apólices`);
  console.log(`[prova] concluídas sem carimbo de conclusão: ${r.manut_sem_carimbo} (tem que ser 0)`);
  console.log(`[prova] multas com prazo de recurso DEPOIS do pagamento: ${r.prazo_invertido} (tem que ser 0)`);

  const { rows: odo } = await client.query(
    `select count(*)::int n from (
       select vehicle_id, odometer, lag(odometer) over (partition by vehicle_id order by fueled_at) ant
         from fuel_logs where tenant_id=$1) x
      where ant is not null and odometer < ant`, [tenantId]);
  console.log(`[prova] abastecimentos com odômetro andando para trás: ${odo[0].n} (tem que ser 0)`);

  await client.end();
}

main().catch((e) => {
  console.error("[frota] falhou:", e.message);
  process.exit(1);
});
