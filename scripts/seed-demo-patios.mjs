// Povoa o tenant `demo` com massa de PÁTIOS suficiente para o painel gerencial
// (`/patios/painel`) mostrar ocupação variada, processos nas cinco fases e prazos.
//
// Por que existe: o seed base cria 1 pátio com 6 vagas e 1 processo. O painel abre
// tecnicamente correto e visualmente vazio — pior que não abrir, numa demonstração.
//
// Idempotente: identifica o que criou por prefixo e não duplica em reexecução.
// NÃO apaga nada que não tenha criado. Nunca roda DELETE em massa.
//
// Uso:  node scripts/seed-demo-patios.mjs
//       node scripts/seed-demo-patios.mjs --limpar   (remove só o que este script criou)

import { randomUUID } from "node:crypto";
import pg from "pg";

const MARCA = "demo-painel";
const conn = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/erp_techsolutions?schema=public";

// Cada pátio com uma taxa de ocupação diferente, para o painel mostrar as três
// faixas de cor (folgado / apertado / lotado) em vez de um número só.
const PATIOS = [
  { nome: "Pátio Norte",   endereco: "Av. das Indústrias, 4200 — Curitiba/PR", vagas: 40, ocupadas: 34, bloqueadas: 2 },
  { nome: "Pátio Central", endereco: "R. Barão do Rio Branco, 118 — Curitiba/PR", vagas: 24, ocupadas: 12, bloqueadas: 1 },
  { nome: "Pátio Oeste",   endereco: "Rod. BR-277, km 18 — Campo Largo/PR", vagas: 30, ocupadas: 6, bloqueadas: 0 },
];

// Distribuição pelas cinco fases do painel. Os status vêm de PHASE_BUCKET_BY_STATUS
// (src/modules/patios-dashboard) — mantenha em paridade se a FSM mudar.
const FASES = [
  { status: "IN_REMOVAL",          qtd: 4,  ocupaVaga: false },
  { status: "RECEPTION",           qtd: 6,  ocupaVaga: true },
  { status: "ACTIVE_CUSTODY",      qtd: 28, ocupaVaga: true },
  { status: "JUDICIAL_HOLD",       qtd: 5,  ocupaVaga: true },
  { status: "RELEASE_IN_PROGRESS", qtd: 7,  ocupaVaga: true },
  { status: "RELEASED_FOR_REPAIR", qtd: 2,  ocupaVaga: false },
  { status: "AUCTION_ELIGIBLE",    qtd: 5,  ocupaVaga: true },
  { status: "AUCTION_PREP",        qtd: 3,  ocupaVaga: true },
  { status: "LOTTED",              qtd: 2,  ocupaVaga: true },
  { status: "RELEASED",            qtd: 9,  ocupaVaga: false },
  { status: "AUCTION_CLOSED",      qtd: 3,  ocupaVaga: false },
];

const MARCAS = ["Fiat", "Volkswagen", "Chevrolet", "Ford", "Honda", "Toyota", "Hyundai", "Renault", "Jeep", "Nissan"];
const MODELOS = ["Uno", "Gol", "Onix", "Ka", "Civic", "Corolla", "HB20", "Sandero", "Renegade", "March"];
const CORES = ["Prata", "Branco", "Preto", "Vermelho", "Cinza", "Azul"];
const AUTORIDADES = ["PRF", "Polícia Militar", "Guarda Municipal", "DETRAN/PR"];

function placa(i) {
  const L = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const a = L[i % 26], b = L[(i * 7) % 26], c = L[(i * 13) % 26];
  return `${a}${b}${c}${String(i % 10)}${L[(i * 3) % 26]}${String((i * 3) % 10)}${String((i * 7) % 10)}`;
}

function diasAtras(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  const limpar = process.argv.includes("--limpar");
  const client = new pg.Client({ connectionString: conn });
  await client.connect();

  const { rows: tRows } = await client.query("select id from tenants where slug = 'demo' limit 1");
  if (!tRows.length) throw new Error("tenant 'demo' não existe — rode `npm run db:seed` antes.");
  const tenantId = tRows[0].id;

  const { rows: bRows } = await client.query("select id from branches where tenant_id = $1 limit 1", [tenantId]);
  const branchId = bRows.length ? bRows[0].id : null;

  const { rows: uRows } = await client.query("select id from users where tenant_id = $1 limit 1", [tenantId]);
  const userId = uRows[0].id;

  const { rows: pRows } = await client.query("select id from jurisdiction_profiles where tenant_id = $1 limit 1", [tenantId]);
  const profileId = pRows.length ? pRows[0].id : null;

  if (limpar) {
    // Remoção ESCOPADA ao que este script criou — identificado pela marca no endereço.
    // Ordem de FK: vaga aponta processo, área aponta pátio.
    await client.query("update yard_spots set status = 'FREE', current_process_id = null where area_id in (select a.id from yard_areas a join yards y on y.id = a.yard_id where y.tenant_id = $1 and y.address like $2)", [tenantId, `%${MARCA}%`]);
    await client.query("delete from impound_processes where tenant_id = $1 and incident_report_number like $2", [tenantId, `${MARCA}%`]);
    await client.query("delete from yard_spots where area_id in (select a.id from yard_areas a join yards y on y.id = a.yard_id where y.tenant_id = $1 and y.address like $2)", [tenantId, `%${MARCA}%`]);
    await client.query("delete from yard_areas where yard_id in (select id from yards where tenant_id = $1 and address like $2)", [tenantId, `%${MARCA}%`]);
    await client.query("delete from yards where tenant_id = $1 and address like $2", [tenantId, `%${MARCA}%`]);
    console.log("[seed-demo-patios] removido o que este script havia criado.");
    await client.end();
    return;
  }

  const { rows: jaTem } = await client.query("select count(*)::int as n from yards where tenant_id = $1 and address like $2", [tenantId, `%${MARCA}%`]);
  if (jaTem[0].n > 0) {
    console.log(`[seed-demo-patios] já povoado (${jaTem[0].n} pátios com a marca). Use --limpar para refazer.`);
    await client.end();
    return;
  }

  const agora = new Date();
  const vagasLivresPorPatio = [];
  let criadoPatios = 0, criadoVagas = 0, criadoProcessos = 0;

  for (const p of PATIOS) {
    const yardId = randomUUID();
    await client.query(
      `insert into yards (id, tenant_id, branch_id, name, address, capacity_hint, timezone, active, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,'America/Sao_Paulo',true,$7,$7,$8,$8)`,
      [yardId, tenantId, branchId, p.nome, `${p.endereco} [${MARCA}]`, p.vagas, userId, agora],
    );
    criadoPatios++;

    const areaId = randomUUID();
    await client.query(
      `insert into yard_areas (id, tenant_id, yard_id, parent_id, kind, name, covered, vehicle_class, created_by, updated_by, created_at, updated_at)
       values ($1,$2,$3,null,'BLOCK','Setor A',false,'CAR',$4,$4,$5,$5)`,
      [areaId, tenantId, yardId, userId, agora],
    );

    const livres = [];
    for (let i = 1; i <= p.vagas; i += 1) {
      const spotId = randomUUID();
      // Bloqueadas primeiro, depois as que vão receber processo, o resto livre.
      const bloqueada = i <= p.bloqueadas;
      const status = bloqueada ? "BLOCKED" : "FREE";
      await client.query(
        `insert into yard_spots (id, tenant_id, area_id, code, covered, vehicle_class, status, current_process_id, created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,false,'CAR',$5,null,$6,$6,$7,$7)`,
        [spotId, tenantId, areaId, `A-${String(i).padStart(3, "0")}`, status, userId, agora],
      );
      criadoVagas++;
      if (!bloqueada && livres.length < p.ocupadas) livres.push(spotId);
    }
    vagasLivresPorPatio.push({ yardId, vagas: livres });
  }

  // Processos: distribuídos pelas fases; os que ocupam vaga consomem a fila de vagas livres.
  let n = 0;
  const filaVagas = vagasLivresPorPatio.flatMap((y) => y.vagas.map((v) => ({ yardId: y.yardId, spotId: v })));
  let cursorVaga = 0;

  for (const fase of FASES) {
    for (let k = 0; k < fase.qtd; k += 1) {
      n += 1;
      const alvo = fase.ocupaVaga && cursorVaga < filaVagas.length ? filaVagas[cursorVaga] : null;
      const yardId = alvo ? alvo.yardId : vagasLivresPorPatio[n % vagasLivresPorPatio.length].yardId;
      const processId = randomUUID();
      const entrada = diasAtras(3 + ((n * 7) % 180));

      await client.query(
        `insert into impound_processes
          (id, tenant_id, vehicle_plate, vehicle_brand, vehicle_model, vehicle_color, vehicle_year,
           vehicle_unidentified, yard_id, profile_id, status, entered_at,
           origin_authority, origin_agent_name, authority_case_number, incident_report_number, legal_basis,
           custody_seq_head, created_by, updated_by, created_at, updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,false,$8,$9,$10,$11,$12,$13,$14,$15,$16,0,$17,$17,$11,$11)`,
        [
          processId, tenantId, placa(n),
          MARCAS[n % MARCAS.length], MODELOS[n % MODELOS.length], CORES[n % CORES.length], 2012 + (n % 13),
          yardId, profileId, fase.status, entrada,
          AUTORIDADES[n % AUTORIDADES.length], `Agente ${100 + n}`,
          `PROC-${String(2000 + n)}`, `${MARCA}-${String(n).padStart(4, "0")}`,
          "Art. 271 do CTB — remoção por infração",
          userId,
        ],
      );
      criadoProcessos++;

      if (alvo) {
        await client.query("update yard_spots set status = 'OCCUPIED', current_process_id = $1 where id = $2", [processId, alvo.spotId]);
        cursorVaga += 1;
      }
    }
  }

  console.log(`[seed-demo-patios] ${criadoPatios} pátios · ${criadoVagas} vagas · ${criadoProcessos} processos no tenant demo.`);
  const { rows: resumo } = await client.query(
    `select y.name,
            count(s.*) filter (where s.status = 'OCCUPIED') as ocupadas,
            count(s.*) filter (where s.status = 'FREE') as livres,
            count(s.*) filter (where s.status = 'BLOCKED') as bloqueadas
       from yards y
       join yard_areas a on a.yard_id = y.id
       join yard_spots s on s.area_id = a.id
      where y.tenant_id = $1
      group by y.name order by y.name`,
    [tenantId],
  );
  for (const r of resumo) {
    const total = Number(r.ocupadas) + Number(r.livres) + Number(r.bloqueadas);
    const taxa = total ? Math.round((Number(r.ocupadas) / total) * 100) : 0;
    console.log(`  ${String(r.name).padEnd(16)} ${String(r.ocupadas).padStart(3)}/${String(total).padEnd(3)} ocupadas (${taxa}%) · ${r.bloqueadas} bloqueadas`);
  }

  await client.end();
}

main().catch((e) => {
  console.error("[seed-demo-patios] falhou:", e.message);
  process.exit(1);
});
