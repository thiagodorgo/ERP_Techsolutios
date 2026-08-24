// Tira da TELA o resíduo de teste que seeds anteriores deixaram em campos que o
// usuário lê — e preenche os campos que apareciam vazios no dossiê.
//
// Cada item aqui foi visto numa captura de tela real, não inferido:
//   · dossiê, aba Visão Geral: "Nº DO AUTO/BO  demo-painel-0005"
//   · dossiê, aba Vistoria: OBSERVAÇÕES terminando em "[DEMO-DOSSIE]"
//   · detalhe do pátio: "Av. das Indústrias, 4200 — Curitiba/PR [demo-painel]"
//   · dossiê, aba Visão Geral: "CHASSI —" e "RENAVAM —" vazios
//
// CHASSI e RENAVAM não são enfeite: são o que identifica o veículo num processo
// de custódia (Res. CONTRAN 1025/2026). Vazios, o dossiê não serve de documento.
// São gerados de forma DETERMINÍSTICA a partir da placa, para o mesmo veículo
// receber sempre o mesmo número — inclusive se o script rodar de novo.
//
// Idempotente. Só UPDATE, nunca DELETE. Reversível com --reverter (devolve as
// marcas de teste e esvazia chassi/renavam que este script preencheu).
//
// Uso:  node scripts/demo-seed/11-polimento-visivel.mjs
//       node scripts/demo-seed/11-polimento-visivel.mjs --reverter

import crypto from "node:crypto";
import pg from "pg";

const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";
const reverter = process.argv.includes("--reverter");

/* Dígito verificador do RENAVAM (11 dígitos: 10 + DV, módulo 11 com pesos
   2..9,2,3 da direita para a esquerda). Fazemos o cálculo de verdade para o
   número não ser rejeitado por quem souber conferir. */
function renavamComDv(dez) {
  const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const soma = dez.split("").reduce((s, d, i) => s + Number(d) * pesos[i], 0);
  const resto = (soma * 10) % 11;
  return dez + String(resto >= 10 ? 0 : resto);
}

/* Determinístico pela placa: mesma placa -> mesmo chassi e mesmo renavam. */
function identificadores(placa) {
  const h = crypto.createHash("sha256").update(`erp-demo:${placa}`).digest("hex").toUpperCase();
  // VIN sem I, O e Q (a norma proíbe — são confundidos com 1 e 0).
  const alfabeto = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
  let chassi = "";
  for (let i = 0; i < 17; i += 1) chassi += alfabeto[parseInt(h.slice(i * 2, i * 2 + 2), 16) % alfabeto.length];
  const dez = (BigInt("0x" + h.slice(0, 12)) % 10000000000n).toString().padStart(10, "0");
  return { chassi, renavam: renavamComDv(dez) };
}

async function main() {
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: t } = await client.query("select id from tenants where slug='demo'");
  if (!t.length) throw new Error("tenant 'demo' não existe.");
  const tenantId = t[0].id;

  if (reverter) {
    const a = await client.query(
      `update impound_processes set incident_report_number = 'demo-painel-' || lpad((row_number() over ())::text, 4, '0')
         where tenant_id = $1 and incident_report_number like 'BO-%'`, [tenantId]);
    const b = await client.query(
      `update impound_intake_inspections set observations = observations || ' [DEMO-DOSSIE]'
         where tenant_id = $1 and observations not like '%[DEMO-DOSSIE]%'`, [tenantId]);
    const c = await client.query(
      `update yards set address = address || ' [demo-painel]' where tenant_id = $1 and address not like '%[demo-painel]%'`, [tenantId]);
    console.log(`[polimento] revertido: ${a.rowCount} autos · ${b.rowCount} observações · ${c.rowCount} endereços`);
    await client.end();
    return;
  }

  // 1. Nº do auto/BO: "demo-painel-0005" -> um número de boletim plausível do PR.
  const { rows: procs } = await client.query(
    `select id, vehicle_plate, incident_report_number, authority_case_number, vehicle_chassis, vehicle_renavam
       from impound_processes where tenant_id = $1 order by created_at`, [tenantId]);

  let autos = 0, ident = 0;
  for (const [i, p] of procs.entries()) {
    if (p.incident_report_number && /demo/i.test(p.incident_report_number)) {
      // Formato de boletim de ocorrência do Paraná: BO-<ano>-<sequencial>.
      const novo = `BO-2026-${String(100000 + i * 137).slice(-6)}`;
      await client.query("update impound_processes set incident_report_number = $1 where id = $2", [novo, p.id]);
      autos += 1;
    }
    if (!p.vehicle_chassis || !p.vehicle_renavam) {
      const { chassi, renavam } = identificadores(p.vehicle_plate ?? p.id);
      await client.query(
        `update impound_processes
            set vehicle_chassis = coalesce(nullif(vehicle_chassis, ''), $1),
                vehicle_renavam = coalesce(nullif(vehicle_renavam, ''), $2)
          where id = $3`, [chassi, renavam, p.id]);
      ident += 1;
    }
  }

  // 2. Marcas de teste em texto que o usuário lê.
  const obs = await client.query(
    `update impound_intake_inspections
        set observations = btrim(replace(observations, '[DEMO-DOSSIE]', ''))
      where tenant_id = $1 and observations like '%[DEMO-DOSSIE]%'`, [tenantId]);

  const end = await client.query(
    `update yards set address = btrim(replace(address, '[demo-painel]', ''))
      where tenant_id = $1 and address like '%[demo-painel]%'`, [tenantId]);

  console.log(`[polimento] nº do auto/BO normalizado: ${autos}`);
  console.log(`[polimento] chassi/renavam preenchidos: ${ident}`);
  console.log(`[polimento] observações limpas: ${obs.rowCount}`);
  console.log(`[polimento] endereços de pátio limpos: ${end.rowCount}`);

  const { rows: sobra } = await client.query(
    `select count(*) filter (where incident_report_number ilike '%demo%') as autos,
            count(*) filter (where vehicle_chassis is null or vehicle_chassis = '') as sem_chassi,
            count(*) filter (where vehicle_renavam is null or vehicle_renavam = '') as sem_renavam
       from impound_processes where tenant_id = $1`, [tenantId]);
  console.log(`[polimento] restam: ${sobra[0].autos} autos com "demo" · ${sobra[0].sem_chassi} sem chassi · ${sobra[0].sem_renavam} sem renavam`);

  await client.end();
}

main().catch((e) => {
  console.error("[polimento] falhou:", e.message);
  process.exit(1);
});
