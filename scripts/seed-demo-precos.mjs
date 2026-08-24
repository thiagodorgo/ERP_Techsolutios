// Povoa TABELAS DE VALORES e TARIFAS reais no tenant `demo`.
//
// Por que existe: medido em 2026-08-23, as 10 tabelas do tenant demo eram quase
// todas resíduo de teste ("Prova 1783820763934862800", "Tabela Smoke", "Terminal
// 1783820569385872200", "teste") e 7 delas tinham ZERO itens. A única com nome de
// produto — "Tabela Guincho 2026" — estava vazia. Numa demonstração, a tela de
// preços abria sem preço.
//
// Idempotente: identifica o que criou pelo prefixo em `origin` e não duplica.
// NÃO apaga nada que não tenha criado. Nunca roda DELETE em massa.
//
// Uso:  node scripts/seed-demo-precos.mjs
//       node scripts/seed-demo-precos.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const MARCA = "DEMO-PRECOS";
const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

// Cada tabela com uma faixa de valor distinta, para a coluna de agregado mostrar
// variedade em vez de repetir a mesma faixa.
const TABELAS = [
  {
    nome: "Guincho Leve — Tabela Padrão 2026",
    status: "published",
    itens: [
      ["Saída de guincho — perímetro urbano", 180.0, "por acionamento"],
      ["Quilômetro rodado — urbano", 6.5, "por km"],
      ["Quilômetro rodado — rodovia", 8.9, "por km"],
      ["Hora parada / espera", 95.0, "por hora"],
      ["Serviço noturno (adicional)", 120.0, "por acionamento"],
      ["Finais de semana e feriados (adicional)", 145.0, "por acionamento"],
      ["Içamento com guincho pesado", 640.0, "por acionamento"],
      ["Desatolamento", 380.0, "por acionamento"],
    ],
  },
  {
    nome: "Guincho Pesado — Tabela Padrão 2026",
    status: "published",
    itens: [
      ["Saída de guincho pesado", 890.0, "por acionamento"],
      ["Quilômetro rodado — pesado", 14.5, "por km"],
      ["Hora de operação com munck", 420.0, "por hora"],
      ["Transbordo de carga", 1250.0, "por acionamento"],
      ["Plataforma estendida", 1680.0, "por acionamento"],
      ["Resgate em ribanceira", 3400.0, "por acionamento"],
    ],
  },
  {
    nome: "Pátio — Custódia e Diárias 2026",
    status: "published",
    itens: [
      ["Diária de veículo leve", 42.0, "por dia"],
      ["Diária de veículo pesado", 96.0, "por dia"],
      ["Diária de motocicleta", 24.0, "por dia"],
      ["Taxa de entrada e vistoria", 135.0, "por processo"],
      ["Taxa de liberação", 168.0, "por processo"],
      ["Guarda em área coberta (adicional)", 18.0, "por dia"],
      ["Remoção interna entre vagas", 55.0, "por movimento"],
    ],
  },
  {
    nome: "Contrato Transportadora Aurora",
    status: "published",
    itens: [
      ["Saída de guincho — contrato", 152.0, "por acionamento"],
      ["Quilômetro rodado — contrato", 5.4, "por km"],
      ["Hora parada — contrato", 78.0, "por hora"],
      ["Diária de pátio — contrato", 34.0, "por dia"],
    ],
  },
  {
    nome: "Tabela Sazonal — Alta Temporada",
    status: "draft",
    itens: [
      ["Saída de guincho — alta temporada", 235.0, "por acionamento"],
      ["Quilômetro rodado — alta temporada", 9.8, "por km"],
      ["Plantão 24h (adicional)", 190.0, "por acionamento"],
    ],
  },
];

function diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function money(v) { return v.toFixed(2); }

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
    await client.query("delete from tariffs where tenant_id = $1 and origin = $2", [tenantId, MARCA]);
    await client.query("delete from price_tables where tenant_id = $1 and name = any($2::text[])", [tenantId, TABELAS.map((t) => t.nome)]);
    console.log("[seed-demo-precos] removido o que este script havia criado.");
    await client.end();
    return;
  }

  const { rows: jaTem } = await client.query("select count(*)::int as n from tariffs where tenant_id = $1 and origin = $2", [tenantId, MARCA]);
  if (jaTem[0].n > 0) {
    console.log(`[seed-demo-precos] já povoado (${jaTem[0].n} tarifas). Use --limpar para refazer.`);
    await client.end();
    return;
  }

  const agora = new Date();
  const vigencia = diasAtras(45);
  let criadasTabelas = 0, criadasTarifas = 0;

  for (const t of TABELAS) {
    const tableId = randomUUID();
    await client.query(
      `insert into price_tables (id, tenant_id, name, description, currency, version, status, is_active, valid_from, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,'BRL',1,$5,$6,$7,$8,$8,$9,$9)`,
      [tableId, tenantId, t.nome, `Tabela de valores para demonstração — ${t.nome}.`, t.status, t.status === "published", vigencia, userId, agora],
    );
    criadasTabelas += 1;

    for (const [nome, preco, regra] of t.itens) {
      await client.query(
        `insert into tariffs (id, tenant_id, price_table_id, name, unit_price, currency, origin, rule, valid_from, status, is_active, created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,'BRL',$6,$7,$8,$9,$10,$11,$11,$12,$12)`,
        [randomUUID(), tenantId, tableId, nome, money(preco), MARCA, regra, vigencia, t.status, t.status === "published", userId, agora],
      );
      criadasTarifas += 1;
    }
  }

  console.log(`[seed-demo-precos] ${criadasTabelas} tabelas · ${criadasTarifas} tarifas.`);
  const { rows: resumo } = await client.query(
    `select pt.name,
            count(f.*)::int as itens,
            to_char(min(f.unit_price),'FM999G990D00') as menor,
            to_char(max(f.unit_price),'FM999G990D00') as maior
       from price_tables pt
       left join tariffs f on f.price_table_id = pt.id
      where pt.tenant_id = $1 and pt.name = any($2::text[])
      group by pt.name order by pt.name`,
    [tenantId, TABELAS.map((t) => t.nome)],
  );
  for (const r of resumo) {
    console.log(`  ${String(r.name).padEnd(38)} ${String(r.itens).padStart(2)} itens   R$ ${r.menor} – R$ ${r.maior}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("[seed-demo-precos] falhou:", e.message);
  process.exit(1);
});
