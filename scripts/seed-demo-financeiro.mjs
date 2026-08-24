// Povoa o tenant `demo` com massa FINANCEIRA para as telas de Financeiro,
// Contas a Pagar/Receber e Extrato terem o que mostrar numa demonstração.
//
// Por que existe: medido em 2026-08-23, o tenant demo tinha `financial_titles = 0`,
// `financial_entries = 0` e `financial_accounts = 0`. As telas abriam corretas e
// vazias — numa demonstração isso é pior do que não abrir.
//
// Idempotente: identifica o que criou pelo prefixo em `document` e não duplica.
// NÃO apaga nada que não tenha criado. Nunca roda DELETE em massa.
//
// Uso:  node scripts/seed-demo-financeiro.mjs
//       node scripts/seed-demo-financeiro.mjs --limpar

import { randomUUID } from "node:crypto";
import pg from "pg";

const MARCA = "DEMO-FIN";
const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

const CONTAS = [
  { nome: "Caixa Operacional", kind: "cash", saldo: "15000.00", banco: null },
  { nome: "Banco Itaú — C/C 12345-6", kind: "bank", saldo: "184320.55", banco: "Itaú Unibanco" },
  { nome: "Banco do Brasil — C/C 98765-4", kind: "bank", saldo: "62890.10", banco: "Banco do Brasil" },
];

const CLIENTES = [
  "Transportadora Aurora Ltda", "Construtora Meridiano S.A.", "Frigorífico Vale Verde",
  "Distribuidora Pampa", "Log&Co Transportes", "Agropecuária Serra Azul",
  "Metalúrgica Ipiranga", "Supermercados Bom Preço",
];
const FORNECEDORES = [
  "Auto Peças Central", "Pneus & Cia", "Oficina Mecânica Rodovia",
  "Combustíveis Planalto", "Seguradora Horizonte",
];

const CATEGORIAS_RECEBER = ["Serviço de guincho", "Diária de pátio", "Taxa de liberação", "Serviço de reboque", "Estadia"];
const CATEGORIAS_PAGAR = ["Peças e insumos", "Combustível", "Manutenção de frota", "Seguro", "Serviços de terceiros"];
const METODOS = ["pix", "boleto", "transfer", "card", "cash"];

function diasAtras(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function diasAFrente(n) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function competencia(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`; }
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
    // Ordem de FK: lançamento aponta título e conta.
    await client.query("delete from financial_entries where tenant_id = $1 and description like $2", [tenantId, `${MARCA}%`]);
    await client.query("delete from financial_titles where tenant_id = $1 and document like $2", [tenantId, `${MARCA}%`]);
    await client.query("delete from financial_accounts where tenant_id = $1 and notes like $2", [tenantId, `${MARCA}%`]);
    console.log("[seed-demo-financeiro] removido o que este script havia criado.");
    await client.end();
    return;
  }

  const { rows: jaTem } = await client.query("select count(*)::int as n from financial_titles where tenant_id = $1 and document like $2", [tenantId, `${MARCA}%`]);
  if (jaTem[0].n > 0) {
    console.log(`[seed-demo-financeiro] já povoado (${jaTem[0].n} títulos). Use --limpar para refazer.`);
    await client.end();
    return;
  }

  const agora = new Date();
  const contas = [];
  for (const c of CONTAS) {
    const id = randomUUID();
    await client.query(
      `insert into financial_accounts (id, tenant_id, name, kind, currency, opening_balance, bank_name, status, is_active, notes, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,'BRL',$5,$6,'active',true,$7,$8,$8,$9,$9)`,
      [id, tenantId, c.nome, c.kind, c.saldo, c.banco, `${MARCA} conta de demonstração`, userId, agora],
    );
    contas.push(id);
  }

  // Distribuição pensada para a tela ter as quatro situações visíveis de uma vez:
  // vencido em aberto (vermelho), a vencer, parcialmente pago e quitado.
  const PLANO = [
    { direction: "receivable", status: "open",           qtd: 14, vencido: true,  pagoPct: 0 },
    { direction: "receivable", status: "open",           qtd: 18, vencido: false, pagoPct: 0 },
    { direction: "receivable", status: "partially_paid", qtd: 9,  vencido: false, pagoPct: 0.4 },
    { direction: "receivable", status: "paid",           qtd: 22, vencido: false, pagoPct: 1 },
    { direction: "payable",    status: "open",           qtd: 8,  vencido: true,  pagoPct: 0 },
    { direction: "payable",    status: "open",           qtd: 11, vencido: false, pagoPct: 0 },
    { direction: "payable",    status: "partially_paid", qtd: 5,  vencido: false, pagoPct: 0.5 },
    { direction: "payable",    status: "paid",           qtd: 16, vencido: false, pagoPct: 1 },
  ];

  let n = 0, criadosTitulos = 0, criadosLancamentos = 0;
  for (const p of PLANO) {
    for (let k = 0; k < p.qtd; k += 1) {
      n += 1;
      const receber = p.direction === "receivable";
      const parte = receber ? CLIENTES[n % CLIENTES.length] : FORNECEDORES[n % FORNECEDORES.length];
      const categoria = receber ? CATEGORIAS_RECEBER[n % CATEGORIAS_RECEBER.length] : CATEGORIAS_PAGAR[n % CATEGORIAS_PAGAR.length];
      const valor = receber ? 480 + ((n * 137) % 9200) : 260 + ((n * 89) % 5400);
      const pago = valor * p.pagoPct;
      const emissao = diasAtras(20 + ((n * 5) % 150));
      const vencimento = p.vencido ? diasAtras(2 + ((n * 3) % 40)) : diasAFrente(3 + ((n * 7) % 55));
      const titleId = randomUUID();

      await client.query(
        `insert into financial_titles
          (id, tenant_id, direction, party_type, party_name, document, category, description,
           amount, currency, issue_date, due_date, paid_amount, status, competencia, account_id,
           created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'BRL',$10,$11,$12,$13,$14,$15,$16,$16,$17,$17)`,
        [
          titleId, tenantId, p.direction, receber ? "customer" : "supplier", parte,
          `${MARCA}-${String(1000 + n)}`, categoria,
          `${categoria} — ${parte}`,
          money(valor), emissao, vencimento, money(pago), p.status, competencia(emissao),
          contas[n % contas.length], userId, agora,
        ],
      );
      criadosTitulos++;

      // Lançamento de caixa para o que foi pago — é o que faz o Extrato ter linha.
      if (pago > 0) {
        await client.query(
          `insert into financial_entries
            (id, tenant_id, account_id, title_id, direction, amount, currency, payment_method, category,
             occurred_at, competencia, description, reconciled, created_by, updated_by, created_at, updated_at)
           values ($1,$2,$3,$4,$5,$6,'BRL',$7,$8,$9,$10,$11,$12,$13,$13,$14,$14)`,
          [
            randomUUID(), tenantId, contas[n % contas.length], titleId,
            receber ? "in" : "out", money(pago), METODOS[n % METODOS.length], categoria,
            diasAtras(1 + ((n * 2) % 30)), competencia(emissao),
            `${MARCA} liquidação — ${parte}`, n % 3 !== 0, userId, agora,
          ],
        );
        criadosLancamentos++;
      }
    }
  }

  console.log(`[seed-demo-financeiro] ${contas.length} contas · ${criadosTitulos} títulos · ${criadosLancamentos} lançamentos.`);
  const { rows: resumo } = await client.query(
    `select direction,
            status,
            count(*)::int as qtd,
            to_char(sum(amount), 'FM999G999G990D00') as total
       from financial_titles
      where tenant_id = $1 and deleted_at is null
      group by direction, status order by direction, status`,
    [tenantId],
  );
  for (const r of resumo) {
    console.log(`  ${String(r.direction === "receivable" ? "a receber" : "a pagar").padEnd(10)} ${String(r.status).padEnd(15)} ${String(r.qtd).padStart(3)} títulos   R$ ${r.total}`);
  }
  const { rows: venc } = await client.query(
    `select count(*)::int as n, to_char(coalesce(sum(amount - paid_amount),0),'FM999G999G990D00') as saldo
       from financial_titles
      where tenant_id = $1 and deleted_at is null and status in ('open','partially_paid') and due_date < now()`,
    [tenantId],
  );
  console.log(`  VENCIDOS em aberto: ${venc[0].n} títulos · saldo R$ ${venc[0].saldo}`);

  await client.end();
}

main().catch((e) => {
  console.error("[seed-demo-financeiro] falhou:", e.message);
  process.exit(1);
});
