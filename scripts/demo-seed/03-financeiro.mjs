// CAMADA 5 da cadeia de dados: dá ORIGEM RASTREÁVEL ao dinheiro.
//
// Medido antes (2026-08-24): 103 títulos, e **zero** apontando a ordem de serviço
// que os originou (`work_order_id` = 0/103) ou a parte cadastrada (`party_id` =
// 0/103). O nome do cliente vive em texto solto na coluna `party_name`.
//
// Por que isso importa mais do que parece: um título sem origem é um número que
// ninguém consegue auditar. Não dá para responder "de onde veio esta cobrança?",
// não dá para navegar da OS ao dinheiro, e o campo `work_order_id` existe no DTO
// — a tela pode mostrar o elo, só não tem o que mostrar.
//
// A CADEIA:
//   1. customers / suppliers      (Camada 1)  -> party_id
//   2. work_orders                (Camada 3)  -> work_order_id
//   3. financial_accounts                      -> account_id (já estava)
//   4. source_type/source_id                   -> a origem declarada
//
// REGRA DE HONESTIDADE DESTE SCRIPT: um título só recebe `work_order_id` quando
// existe uma OS **do mesmo cliente** para apontar. Inventar o elo seria pior que
// deixá-lo nulo — passaria a auditoria e mentiria na tela. O relatório diz
// quantos ficaram sem, e por quê.
//
// Idempotente (só preenche o que está nulo). Reversível com --limpar.
// Nunca apaga título — dinheiro não se apaga em seed.
//
// Uso:  node scripts/demo-seed/03-financeiro.mjs
//       node scripts/demo-seed/03-financeiro.mjs --limpar

import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const limpar = process.argv.includes("--limpar");

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
      `update financial_titles set work_order_id = null, party_id = null, source_type = null, source_id = null
        where tenant_id = $1`, [tenantId]);
    console.log(`[financeiro] origem desfeita em ${r.rowCount} títulos`);
    await client.end();
    return;
  }

  // ── 1. party_id: liga o título à parte cadastrada, casando pelo nome ───────
  const parte = await client.query(
    `update financial_titles ft
        set party_id = c.id, updated_by = $2, updated_at = now()
       from customers c
      where ft.tenant_id = $1 and c.tenant_id = $1
        and ft.party_type = 'customer' and ft.party_id is null
        and ft.party_name = c.name`, [tenantId, userId]);

  // Fornecedor mora noutra tabela; se ela não existir no schema, o passo é pulado
  // e o relatório diz — melhor pular declarando do que fingir que ligou.
  let temFornecedores = true;
  let parteForn = { rowCount: 0 };
  try {
    parteForn = await client.query(
      `update financial_titles ft
          set party_id = s.id, updated_by = $2, updated_at = now()
         from suppliers s
        where ft.tenant_id = $1 and s.tenant_id = $1
          and ft.party_type = 'supplier' and ft.party_id is null
          and ft.party_name = s.name`, [tenantId, userId]);
  } catch {
    temFornecedores = false;
  }

  // ── 2. work_order_id: casamento 1:1 com a OS do MESMO cliente ────────────
  //
  // O banco tem `financial_titles_wo_direction_active_key`: UM título ativo por
  // (ordem, direção). A trava está certa — uma OS não gera dois recebíveis — e
  // foi ela que pegou a primeira versão deste script, que apontava vários
  // títulos para a mesma ordem.
  //
  // Então o vínculo é um casamento 1:1: cada ordem recebe no máximo um título, e
  // cada título no máximo uma ordem. A escolha é determinística (título mais
  // recente para a ordem concluída mais recente), para rodar duas vezes dar o
  // mesmo resultado. O que sobrar de qualquer lado fica NULO — inventar o elo
  // passaria na auditoria e mentiria na tela.
  const os = await client.query(
    `with pares as (
       select ft.id as title_id, w.id as wo_id,
              row_number() over (partition by w.id  order by ft.issue_date desc, ft.id) as rn_ordem,
              row_number() over (partition by ft.id order by w.completed_at desc nulls last, w.id) as rn_titulo
         from financial_titles ft
         join work_orders w
           on w.tenant_id = ft.tenant_id and w.customer_name = ft.party_name
        where ft.tenant_id = $1 and ft.direction = 'receivable'
          and ft.work_order_id is null and ft.deleted_at is null
          and not exists (
                select 1 from financial_titles x
                 where x.work_order_id = w.id and x.direction = 'receivable' and x.deleted_at is null)
     )
     update financial_titles t
        set work_order_id = p.wo_id, source_type = 'work_order', source_id = p.wo_id,
            updated_by = $2, updated_at = now()
       from pares p
      where t.id = p.title_id and p.rn_ordem = 1 and p.rn_titulo = 1`, [tenantId, userId]);

  // ── prova ─────────────────────────────────────────────────────────────────
  console.log(`[financeiro] party_id ligado — clientes: ${parte.rowCount}${temFornecedores ? ` · fornecedores: ${parteForn.rowCount}` : " · fornecedores: (tabela ausente, passo pulado)"}`);
  console.log(`[financeiro] títulos a receber ligados à OS de origem: ${os.rowCount}`);

  const { rows: p } = await client.query(
    `select count(*) total,
            count(work_order_id) com_os,
            count(party_id) com_parte,
            count(*) filter (where direction='receivable' and work_order_id is null) receber_sem_os
       from financial_titles where tenant_id = $1 and deleted_at is null`, [tenantId]);
  const r = p[0];
  console.log(`\n[prova] ${r.total} títulos · ${r.com_os} com OS · ${r.com_parte} com parte cadastrada`);
  console.log(`[prova] a receber ainda SEM ordem de origem: ${r.receber_sem_os}`);

  if (Number(r.receber_sem_os) > 0) {
    const { rows: quem } = await client.query(
      `select party_name, count(*)::int n from financial_titles
        where tenant_id=$1 and direction='receivable' and work_order_id is null and deleted_at is null
        group by party_name order by n desc limit 8`, [tenantId]);
    console.log(`[prova] o elo ficou NULO em vez de inventado — ou não há OS desse cliente, ou a OS já`);
    console.log(`        tem o seu recebível (um título ativo por ordem, trava do banco):`);
    for (const q of quem) console.log(`          ${q.n}× ${q.party_name}`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("[financeiro] falhou:", e.message);
  process.exit(1);
});
