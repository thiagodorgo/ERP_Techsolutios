// Povoa a VISTORIA DE RECEPÇÃO dos processos de custódia — fotos e conclusão —
// passando pela API REAL, não por SQL.
//
// POR QUE PELA API: cada foto anexada encadeia um evento `PHOTO_SET` na cadeia de
// hash da custódia, e a conclusão encadeia um `INSPECTION`. Um INSERT direto em
// `attachments` criaria a foto e deixaria a cadeia sem o elo — exatamente o
// defeito que o dossiê já mostrava ("Cadeia íntegra (0 eventos)" e "Nenhum evento
// de custódia registrado"), porque os 75 processos nasceram fora do caminho real.
//
// A CADEIA que esta tela exige, medida em 2026-08-24:
//   1. impound_processes                     ✔ existiam (75)
//   2. impound_intake_inspections            ✔ existiam (75, todas assinadas)
//   3. attachments entity_type=
//      'impound_intake_inspection' com
//      metadata.set em PHOTO_SET_CODES        -> FALTAVAM — 0 de 11 conjuntos
//   4. evento PHOTO_SET por foto              ✗ faltava (cadeia vazia)
//   5. evento INSPECTION na conclusão         ✗ faltava
// Sem o passo 3 a vistoria é INCOMPLETA (DEFAULT_REQUIRED_PHOTO_SETS exige os 11)
// e a galeria do dossiê aparece vazia — foi o que o dono viu.
//
// Idempotente: consulta a vistoria antes e só anexa o conjunto que falta.
// Não apaga nada — não há caminho de remoção nesta rota, e é proposital: foto de
// custódia é prova.
//
// Uso:  node scripts/demo-seed/10-vistorias-de-recepcao.mjs
//       node scripts/demo-seed/10-vistorias-de-recepcao.mjs --limite 10

const API = process.env.DEMO_API_URL ?? "http://localhost:3000/api/v1";
const EMAIL = process.env.DEMO_EMAIL ?? "admin.demo@example.com";
const SENHA = process.env.DEMO_ADMIN_PASSWORD ?? "ChangeMe123!";

const iLimite = process.argv.indexOf("--limite");
const LIMITE = iLimite > -1 ? Number(process.argv[iLimite + 1]) : Infinity;

/* Os 11 conjuntos obrigatórios (src/modules/impound/impound.intake.types.ts).
   Só existem 4 vistas nos assets, então cada conjunto aponta para a vista mais
   plausível — nunca para uma imagem que contradiga o rótulo. */
const CONJUNTOS = [
  ["FRONT", "front"],
  ["REAR", "back"],
  ["LEFT", "left"],
  ["RIGHT", "right"],
  ["ROOF", "front"],
  ["DASH_PANEL", "front"],
  ["ENGINE", "front"],
  ["CHASSIS_ID", "front"],
  ["ODOMETER", "front"],
  ["INNER_OBJECTS", "back"],
  ["DAMAGES", "left"],
];

/* A silhueta segue o tipo do veículo quando o processo informa; senão, sedã. */
const TIPO_POR_CATEGORIA = {
  CAR: "sedan", MOTORCYCLE: "motorcycle", TRUCK: "truck",
  BUS: "bus", VAN: "van", PICKUP: "pickup",
};

let token = null;

async function api(caminho, { metodo = "GET", corpo } = {}) {
  const r = await fetch(`${API}${caminho}`, {
    method: metodo,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    ...(corpo ? { body: JSON.stringify(corpo) } : {}),
  });
  const texto = await r.text();
  let json = null;
  try { json = texto ? JSON.parse(texto) : null; } catch { /* corpo não-JSON */ }
  return { ok: r.ok, status: r.status, json, texto };
}

async function main() {
  const login = await api("/auth/login", { metodo: "POST", corpo: { email: EMAIL, password: SENHA } });
  if (!login.ok) throw new Error(`login falhou (${login.status}): ${login.texto.slice(0, 200)}`);
  token = login.json?.data?.access_token;
  if (!token) throw new Error("login sem access_token");
  console.log(`[vistorias] autenticado como ${EMAIL}`);

  // O endpoint limita `limit` a 100 (IMPOUND_FILTER_INVALID acima disso), então
  // pagina até esgotar em vez de pedir tudo de uma vez.
  const processos = [];
  for (let offset = 0; ; offset += 100) {
    const pagina = await api(`/impound-processes?limit=100&offset=${offset}`);
    if (!pagina.ok) throw new Error(`lista de processos falhou (${pagina.status}): ${pagina.texto.slice(0, 200)}`);
    const itens = pagina.json?.items ?? pagina.json?.data ?? [];
    processos.push(...itens);
    if (itens.length < 100) break;
  }
  console.log(`[vistorias] ${processos.length} processos de custódia`);

  let jaOk = 0, anexadas = 0, concluidas = 0, semVistoria = 0;
  const falhas = [];
  let n = 0;

  for (const proc of processos) {
    if (n >= LIMITE) break;
    n += 1;

    const vistoria = await api(`/impound-processes/${proc.id}/inspection`);
    if (!vistoria.ok) {
      if (vistoria.status === 404) { semVistoria += 1; continue; }
      falhas.push(`${proc.id}: GET inspection ${vistoria.status}`);
      continue;
    }
    const view = vistoria.json?.data ?? vistoria.json;
    const existentes = new Set((view?.photos ?? []).map((f) => String(f.set).toUpperCase()));

    if (existentes.size >= CONJUNTOS.length && view?.complete) { jaOk += 1; continue; }

    const silhueta = TIPO_POR_CATEGORIA[String(proc.vehicleCategory ?? proc.vehicle_category ?? "").toUpperCase()] ?? "sedan";

    for (const [conjunto, vista] of CONJUNTOS) {
      if (existentes.has(conjunto)) continue;
      const r = await api(`/impound-processes/${proc.id}/inspection/photos`, {
        metodo: "POST",
        corpo: {
          set: conjunto,
          file_url: `/demo/vistoria/${silhueta}-${vista}.png`,
          file_name: `${conjunto.toLowerCase()}.png`,
          content_type: "image/png",
        },
      });
      if (r.ok) anexadas += 1;
      else falhas.push(`${proc.id} ${conjunto}: ${r.status} ${r.texto.slice(0, 120)}`);
    }

    if (!view?.complete) {
      const c = await api(`/impound-processes/${proc.id}/inspection/complete`, { metodo: "POST" });
      if (c.ok) concluidas += 1;
      else falhas.push(`${proc.id} complete: ${c.status} ${c.texto.slice(0, 160)}`);
    }

    if (n % 10 === 0) console.log(`[vistorias]   ${n}/${processos.length}…`);
  }

  console.log(`\n[vistorias] fotos anexadas: ${anexadas}`);
  console.log(`[vistorias] vistorias concluídas: ${concluidas}`);
  console.log(`[vistorias] já estavam completas: ${jaOk}`);
  if (semVistoria) console.log(`[vistorias] processos sem vistoria registrada: ${semVistoria}`);
  if (falhas.length) {
    console.log(`\n[vistorias] ${falhas.length} falhas — as 10 primeiras:`);
    for (const f of falhas.slice(0, 10)) console.log("  " + f);
  }
}

main().catch((e) => {
  console.error("[vistorias] falhou:", e.message);
  process.exit(1);
});
