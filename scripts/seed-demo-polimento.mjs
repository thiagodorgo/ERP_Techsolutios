// Corrige os textos de DADO que aparecem na tela e destoam numa demonstração.
//
// Não é conserto de código — é conserto do que o seed base gravou. Cada item aqui
// foi visto numa captura de tela real, não inferido.
//
// 1. O tenant chamava-se "Tenant Demo". A palavra "Tenant" aparecia no seletor de
//    organização, no TOPO DE TODAS AS TELAS. O §3 do CLAUDE.md proíbe termo técnico
//    na UI (`tenant` → "organização"), e para um investidor isso lê como protótipo.
// 2. "Patio Sul" sem acento, ao lado de "Pátio Norte/Central/Oeste" com acento.
//
// ATENÇÃO — o app Flutter tem 'Tenant Demo' CRAVADO em
// `mobile/flutter_app/lib/core/bootstrap/bootstrap_session.dart:183,186`, com 3 testes
// asseverando. Renomear só aqui faz o app mostrar um nome e a web outro. Os dois lados
// precisam andar juntos.
//
// Idempotente. NÃO apaga nada. Nunca roda DELETE.
//
// Uso:  node scripts/seed-demo-polimento.mjs
//       node scripts/seed-demo-polimento.mjs --reverter

import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

const NOME_ANTIGO = "Tenant Demo";
const NOME_NOVO = "Guinchos Paraná";

async function main() {
  const reverter = process.argv.includes("--reverter");
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const de = reverter ? NOME_NOVO : NOME_ANTIGO;
  const para = reverter ? NOME_ANTIGO : NOME_NOVO;

  const t = await client.query("update tenants set name = $1 where slug = 'demo' and name = $2", [para, de]);
  if (t.rowCount) console.log(`[polimento] organização: "${de}" → "${para}"`);
  else {
    const { rows } = await client.query("select name from tenants where slug = 'demo'");
    console.log(`[polimento] organização já está como "${rows[0]?.name ?? "(não encontrada)"}" — nada a fazer.`);
  }

  if (!reverter) {
    const y = await client.query(
      "update yards set name = 'Pátio Sul' where name = 'Patio Sul' and tenant_id = (select id from tenants where slug = 'demo')",
    );
    if (y.rowCount) console.log(`[polimento] pátio: "Patio Sul" → "Pátio Sul" (${y.rowCount})`);
    else console.log("[polimento] acentuação dos pátios já em dia.");
  }

  // 3. Resíduo de teste visível nos DOIS clientes: o template 'HACKEADO' v99 estava
  // PUBLICADO — aparecia na lista do builder na web E no /mobile/checklists/available
  // do técnico. Os cinco 'Novo modelo' em rascunho poluíam o builder. Soft-delete
  // (deleted_at), reversível com --reverter; nenhuma linha é apagada.
  const alvo = "name = 'HACKEADO' or name = 'Novo modelo'";
  if (reverter) {
    const r = await client.query("update checklist_templates set deleted_at = null where tenant_id = (select id from tenants where slug='demo') and (" + alvo + ") and deleted_at is not null");
    if (r.rowCount) console.log('[polimento] templates de teste restaurados: ' + r.rowCount);
  } else {
    const r = await client.query("update checklist_templates set deleted_at = now() where tenant_id = (select id from tenants where slug='demo') and (" + alvo + ") and deleted_at is null");
    if (r.rowCount) console.log('[polimento] templates de teste ocultados (soft-delete): ' + r.rowCount);
    else console.log('[polimento] nenhum template de teste visível — nada a fazer.');
  }

  // 4. RENOMEIA_TEMPLATES: os dois publicados restantes carregavam jargao de teste
  // no NOME ('E2E', 'Omega3c') — visivel no app e no builder. Rotulo, nao chave:
  // runs referenciam template_id, entao renomear e seguro e reversivel.
  const RENOMES = [
    ['E2E Coleta obrigatoria', 'Checklist de Coleta — Guincho'],
    ['Inspecao Guincho Omega3c', 'Inspeção do Guincho — Saída'],
  ];
  for (const [antigo, novo] of RENOMES) {
    const de = reverter ? novo : antigo, para = reverter ? antigo : novo;
    const r = await client.query("update checklist_templates set name = $1 where tenant_id = (select id from tenants where slug='demo') and name = $2", [para, de]);
    if (r.rowCount) console.log('[polimento] template: "' + de + '" → "' + para + '"');
  }

  const { rows: final } = await client.query(
    `select t.name as org, (select string_agg(y.name, ' · ' order by y.name) from yards y where y.tenant_id = t.id) as patios
       from tenants t where t.slug = 'demo'`,
  );
  console.log(`[polimento] estado: ${final[0].org} — ${final[0].patios}`);

  await client.end();
}

main().catch((e) => {
  console.error("[polimento] falhou:", e.message);
  process.exit(1);
});
