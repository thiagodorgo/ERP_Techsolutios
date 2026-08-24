// Dá às ORDENS DE SERVIÇO do tenant `demo` a narrativa do protótipo aprovado:
// operação de guincho em Curitiba, com clientes que já existem no módulo financeiro.
//
// Por que existe: medido em 2026-08-23, as 17 OS do tenant demo eram resíduo de
// auditoria — "OS smoke 3c", "OS AUDIT OMEGA3B", "OS DISPATCH HARDENING", uma com
// UUID no título. A web mostrava isso; o app de campo, conectado ao mesmo backend,
// mostraria também. A regra do dono: O QUE A WEB FALAR, O MOBILE TEM QUE ENTENDER —
// os dois bebem do banco, então a história se conserta NA FONTE, uma vez.
//
// Coerência entre módulos: os clientes são os MESMOS do seed financeiro
// (Transportadora Aurora, Construtora Meridiano, Log&Co...) para o sistema inteiro
// contar uma história só — a OS gera o título, o título vira lançamento.
//
// Coerência de estado: cada status carrega os timestamps que o sustentam.
// "on_site" sem arrived_at é estado mentiroso — a mesma classe de defeito que a
// junta do financeiro reprovou. Aqui: on_route ⇒ started_at; on_site/in_progress ⇒
// started_at+arrived_at; completed ⇒ tudo + completed_at; assigned ⇒ técnico real.
//
// Idempotente e reversível: o de-para fica gravado no próprio script; --reverter
// devolve os títulos antigos. NÃO apaga nada. Nunca roda DELETE.
//
// Uso:  node scripts/seed-demo-os.mjs
//       node scripts/seed-demo-os.mjs --reverter

import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

// code (imutável, é a âncora) → narrativa nova. Os codes atuais são plausíveis de
// produto; mudá-los arriscaria referências. As duas OS-2026-* do seed base ficam.
const NARRATIVA = [
  { code: "OS-000017", titulo: "Remoção de veículo — colisão na BR-277", cliente: "Seguradora Horizonte", doc: "12.345.678/0001-90", tel: "(41) 3222-8100", end: "BR-277, km 82 — pista sentido litoral", cidade: "Curitiba", uf: "PR", prio: "urgent", status: "on_route" },
  { code: "OS-000016", titulo: "Guincho leve — pane elétrica", cliente: "Transportadora Aurora Ltda", doc: "98.765.432/0001-10", tel: "(41) 3350-4477", end: "Av. das Torres, 1840 — Jardim Botânico", cidade: "Curitiba", uf: "PR", prio: "high", status: "on_site" },
  { code: "OS-000015", titulo: "Recolhimento ao pátio — determinação DETRAN", cliente: "DETRAN/PR", doc: null, tel: "(41) 3361-1212", end: "R. Chile, 2050 — Rebouças", cidade: "Curitiba", uf: "PR", prio: "high", status: "in_progress" },
  { code: "OS-000014", titulo: "Transporte de maquinário — retroescavadeira", cliente: "Construtora Meridiano S.A.", doc: "23.456.789/0001-01", tel: "(41) 3029-5060", end: "Rod. BR-116, km 104 — canteiro sul", cidade: "Fazenda Rio Grande", uf: "PR", prio: "medium", status: "assigned" },
  { code: "OS-000013", titulo: "Remoção de veículo — estacionamento irregular", cliente: "Guarda Municipal de Curitiba", doc: null, tel: "153", end: "R. XV de Novembro, 964 — Centro", cidade: "Curitiba", uf: "PR", prio: "medium", status: "completed" },
  { code: "OS-000012", titulo: "Socorro mecânico — superaquecimento", cliente: "Log&Co Transportes", doc: "34.567.890/0001-12", tel: "(41) 3072-8890", end: "Contorno Leste, km 71", cidade: "São José dos Pinhais", uf: "PR", prio: "high", status: "completed" },
  { code: "OS-000011", titulo: "Guincho pesado — carreta atolada", cliente: "Agropecuária Serra Azul", doc: "45.678.901/0001-23", tel: "(42) 3623-7700", end: "PR-151, km 12 — acesso à fazenda", cidade: "Ponta Grossa", uf: "PR", prio: "urgent", status: "completed" },
  { code: "OS-000010", titulo: "Remoção pós-colisão — perda total", cliente: "Seguradora Horizonte", doc: "12.345.678/0001-90", tel: "(41) 3222-8100", end: "Av. Mal. Floriano Peixoto, 3322", cidade: "Curitiba", uf: "PR", prio: "high", status: "completed" },
  { code: "OS-000009", titulo: "Transferência entre pátios — lote leilão", cliente: "Guinchos Paraná (interno)", doc: null, tel: null, end: "Pátio Norte → Pátio Central", cidade: "Curitiba", uf: "PR", prio: "low", status: "completed" },
  { code: "OS-000008", titulo: "Guincho leve — pneu furado sem estepe", cliente: "Frigorífico Vale Verde", doc: "56.789.012/0001-34", tel: "(41) 3675-2200", end: "R. da Cidadania, 200 — CIC", cidade: "Curitiba", uf: "PR", prio: "medium", status: "completed" },
  { code: "OS-000007", titulo: "Resgate em ribanceira — Serra do Mar", cliente: "Seguradora Horizonte", doc: "12.345.678/0001-90", tel: "(41) 3222-8100", end: "BR-376, km 668 — curva da Santa", cidade: "Guaratuba", uf: "PR", prio: "urgent", status: "completed" },
  { code: "OS-000006", titulo: "Remoção de moto — apreensão PRF", cliente: "PRF — 4ª Delegacia", doc: null, tel: "191", end: "BR-116, km 98 — posto PRF", cidade: "Campina Grande do Sul", uf: "PR", prio: "medium", status: "completed" },
  { code: "OS-000005", titulo: "Guincho leve — falha no câmbio", cliente: "Distribuidora Pampa", doc: "67.890.123/0001-45", tel: "(41) 3388-9911", end: "Av. Pres. Kennedy, 4121 — Portão", cidade: "Curitiba", uf: "PR", prio: "medium", status: "completed" },
  { code: "OS-000004", titulo: "Transporte de van escolar — revisão", cliente: "Supermercados Bom Preço", doc: "78.901.234/0001-56", tel: "(41) 3013-4455", end: "R. Itacolomi, 940 — Portão", cidade: "Curitiba", uf: "PR", prio: "low", status: "completed" },
  { code: "OS-000003", titulo: "Socorro elétrico — bateria", cliente: "Metalúrgica Ipiranga", doc: "89.012.345/0001-67", tel: "(41) 3346-7788", end: "R. João Bettega, 5200 — CIC", cidade: "Curitiba", uf: "PR", prio: "low", status: "completed" },
];

function h(n) { const d = new Date(); d.setHours(d.getHours() - n); return d; }

async function main() {
  const reverter = process.argv.includes("--reverter");
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: tRows } = await client.query("select id from tenants where slug = 'demo' limit 1");
  if (!tRows.length) throw new Error("tenant 'demo' não existe.");
  const tenantId = tRows[0].id;

  if (reverter) {
    // Reversão: só o título volta a marcar o que era resíduo; o resto fica.
    for (const n of NARRATIVA) {
      await client.query("update work_orders set title = '(resíduo de teste revertido) ' || $1 where tenant_id = $2 and code = $3 and title = $1", [n.titulo, tenantId, n.code]);
    }
    console.log("[seed-demo-os] títulos marcados como revertidos.");
    await client.end();
    return;
  }

  // Técnicos reais do tenant para atribuição — estado "assigned" sem ninguém é mentira.
  const { rows: tecnicos } = await client.query(
    `select u.id from users u where u.tenant_id = $1 and u.email like 'tecnico%' order by u.email`,
    [tenantId],
  );
  if (!tecnicos.length) throw new Error("nenhum técnico no tenant demo.");

  let n = 0, mudadas = 0;
  for (const os of NARRATIVA) {
    n += 1;
    const tecnico = tecnicos[n % tecnicos.length].id;
    // Timestamps coerentes com o status — nunca um estado sem o carimbo que o sustenta.
    const criada = h(20 + n * 9);
    let campos = { started_at: null, arrived_at: null, completed_at: null, assigned: null };
    if (os.status === "assigned") campos.assigned = tecnico;
    if (os.status === "on_route") { campos.assigned = tecnico; campos.started_at = h(2); }
    if (os.status === "on_site") { campos.assigned = tecnico; campos.started_at = h(3); campos.arrived_at = h(1); }
    if (os.status === "in_progress") { campos.assigned = tecnico; campos.started_at = h(4); campos.arrived_at = h(2); }
    if (os.status === "completed") {
      campos.assigned = tecnico;
      campos.started_at = h(16 + n * 9); campos.arrived_at = h(15 + n * 9); campos.completed_at = h(14 + n * 9);
    }

    const r = await client.query(
      `update work_orders set
         title = $1, customer_name = $2, customer_document = $3, customer_phone = $4,
         service_address = $5, service_city = $6, service_state = $7,
         priority = $8, status = $9,
         assigned_user_id = coalesce($10, assigned_user_id),
         started_at = $11, arrived_at = $12, completed_at = $13,
         scheduled_for = $14, updated_at = now()
       where tenant_id = $15 and code = $16`,
      [
        os.titulo, os.cliente, os.doc, os.tel, os.end, os.cidade, os.uf,
        os.prio, os.status, campos.assigned,
        campos.started_at, campos.arrived_at, campos.completed_at,
        criada, tenantId, os.code,
      ],
    );
    mudadas += r.rowCount;
  }

  console.log(`[seed-demo-os] ${mudadas} ordens de serviço com a narrativa do protótipo.`);
  const { rows: resumo } = await client.query(
    `select status, count(*)::int as n from work_orders where tenant_id = $1 group by status order by n desc`,
    [tenantId],
  );
  for (const r of resumo) console.log(`  ${String(r.status).padEnd(14)} ${r.n}`);

  await client.end();
}

main().catch((e) => {
  console.error("[seed-demo-os] falhou:", e.message);
  process.exit(1);
});
