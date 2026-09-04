"use strict";

/* =========================================================================
   Painel de KPIs — ERP TechSolutions. Reescrito do zero em 2026-08-16.

   Contrato de honestidade (D-007 / D-KPI-INDEX-PAINEL):
   - TODO número na tela sai de Kpis/kpis-latest.json ou Kpis/kpis-history.json.
   - Dado ausente = seção escondida ou buraco na série. Nunca zero, nunca
     estimativa, nunca interpolação.
   - Servido por HTTP, o painel hidrata dos JSON (dados vivos). Aberto por
     file://, o navegador REJEITA a leitura de arquivo local — o painel cai na
     cópia congelada embutida, ROTULADA como congelada, e NÃO desenha gráfico
     algum (a série real exige o histórico, que ele não conseguiu ler).

   Contrato de auditoria (teste-guarda executa este arquivo num sandbox
   node:vm sem window e com um document mínimo, com fetch ausente E com fetch
   que rejeita — que é o caso real do navegador):
   - `buildChartSeries(history)` é pura, global e não toca o DOM. Devolve:
       {
         rows,   // registros com snapshot_date, na ordem do arquivo
         dates,  // rows.map(r => r.snapshot_date)
         tracks: [ { key, label, cls, points, measured, last } ],
                 // 3 trilhas; points tem o MESMO comprimento de rows e
                 // preserva null onde o registro não mediu a métrica
         blocks, // (number|null)[] — blocks_completed por registro
         weeks,  // [{ start, label, count, medido, spansGap, janelaParcial,
                 //    diasCobertos, primeiraData, ultimaData }]
                 //  ENTREGAS por semana, derivadas do delta do acumulado.
                 //  count é null quando a semana não teve medição — ausência
                 //  de medida NÃO é zero entregas. Ver buildDelivery.
         rounds  // { itens: [{label, value}], fora, corte } — entregas por
                 //  rodada, lida do NOME da versão. Ver buildRounds.
       }
   - Sem leitura dos JSON, nenhum innerHTML de gráfico é escrito e
     #charts-section permanece hidden.
   - O SVG gerado é inline e não referencia recurso externo.

   Este cabeçalho já afirmou que "semana sem registro é zero VERDADEIRO". Era
   falso, e sobreviveu à correção do código por três horas: a série contava
   REGISTROS publicados, e desenhava zero numa semana com 45 entregas. Um
   contrato que descreve a versão anterior do código é a mesma classe de
   defeito que este arquivo existe para matar — por isso ele é reescrito junto.
   ========================================================================= */

/* ------------------------------------------------------------------ utils */

function esc(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

var NUM_FMT = null;
try {
  NUM_FMT = new Intl.NumberFormat("pt-BR");
} catch (err) {
  NUM_FMT = null;
}

function fmtInt(n) {
  if (typeof n !== "number" || !isFinite(n)) return "";
  return NUM_FMT ? NUM_FMT.format(n) : String(n);
}

/** '2026-08-16' -> '16/08/2026' (sem Date/fuso — a string é a verdade). */
function fmtDateBR(iso) {
  var p = String(iso === null || iso === undefined ? "" : iso).split("-");
  if (p.length !== 3) return String(iso === null || iso === undefined ? "" : iso);
  return p[2] + "/" + p[1] + "/" + p[0];
}

/** '2026-08-16' -> '16/08'. */
function fmtDayMonth(iso) {
  var p = String(iso === null || iso === undefined ? "" : iso).split("-");
  if (p.length !== 3) return String(iso === null || iso === undefined ? "" : iso);
  return p[2] + "/" + p[1];
}

function plural(n, singular, plurals) {
  return n === 1 ? singular : plurals;
}

/* --------------------------------------------- leitura tolerante do history
   O history mistura épocas: contagens como "2437/2446" OU número, chave nova
   (frontend_smoke_tests) OU legada (frontend_smoke). Normaliza na leitura;
   registro sem a métrica vira null — o ponto é PULADO, nunca zerado. */

function metricPass(raw) {
  if (raw === null || raw === undefined) return null;
  var digits = String(raw).split("/")[0].replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function isoToUTC(iso) {
  var p = String(iso).split("-");
  return Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
}

function msToIso(ms) {
  var d = new Date(ms);
  var m = d.getUTCMonth() + 1;
  var day = d.getUTCDate();
  return d.getUTCFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
}

var WEEK_MS = 7 * 86400000;

/** Segunda-feira da semana do dia dado (UTC, em ms). */
function weekStartMs(ms) {
  var dow = (new Date(ms).getUTCDay() + 6) % 7;
  return ms - dow * 86400000;
}

/** Blocos de trabalho entregues por semana, derivados do contador ACUMULADO.

    Esta função já contou outra coisa e mentia: contava REGISTROS publicados no histórico e chamava
    isso de ritmo de entrega. Na semana de 06/07/2026 o gráfico desenhava **zero** — e 45 entregas
    tinham sido mergeadas naquela semana; as rodadas daquele período adiaram a publicação de KPI de
    todos os seus PRs para um snapshot único. Na semana de 27/07 desenhava 42, que eram 42 registros
    de 15 entregas. Errava nas duas direções, sob um título que dizia "Desempenho".

    O acumulado `blocks_completed` é medição real. A diferença entre dois pontos medidos é entrega
    real. Semana sem nenhuma medição devolve `count: null` — lacuna de medição não vira zero, que é
    a mesma regra das outras séries. E a barra logo após uma lacuna acumula o intervalo inteiro:
    marcada com `spansGap` para o gráfico poder dizer isso em vez de fingir precisão semanal. */
function buildDelivery(dates, blocks) {
  if (!dates.length) return [];

  var medidos = [];
  var i;
  for (i = 0; i < dates.length; i++) {
    if (blocks[i] !== null && blocks[i] !== undefined) medidos.push({ t: isoToUTC(dates[i]), v: blocks[i] });
  }
  if (medidos.length < 2) return [];

  var porSemana = {};
  for (i = 1; i < medidos.length; i++) {
    var delta = medidos[i].v - medidos[i - 1].v;
    if (delta <= 0) continue; // contador acumulado: só cresce; queda seria erro de dado, não entrega
    var semana = weekStartMs(medidos[i].t);
    porSemana[semana] = (porSemana[semana] || 0) + delta;
  }

  var comMedicao = {};
  for (i = 0; i < medidos.length; i++) comMedicao[weekStartMs(medidos[i].t)] = true;

  // "Esta barra acumula um intervalo sem medição?" é pergunta sobre MEDIÇÃO, não sobre delta. Calculá-la
  // dentro do laço acima escondia o caso em que o acumulado não mudou entre as duas pontas: a lacuna
  // continuava real, e a barra seguinte deixava de ser marcada. A pergunta certa é se a semana medida
  // anterior é a imediatamente anterior.
  var semanasMedidas = [];
  for (var chave in comMedicao) semanasMedidas.push(Number(chave));
  semanasMedidas.sort(function (a, b) { return a - b; });
  var aposLacuna = {};
  for (i = 1; i < semanasMedidas.length; i++) {
    if (semanasMedidas[i] - semanasMedidas[i - 1] > WEEK_MS) aposLacuna[semanasMedidas[i]] = true;
  }

  var primeira = weekStartMs(medidos[0].t);
  var ultima = weekStartMs(medidos[medidos.length - 1].t);
  var inicioSerie = medidos[0].t;
  var fimSerie = medidos[medidos.length - 1].t;

  // JANELA COBERTA, e nada além disso.
  //
  // Esta marca já disse "semana ainda em curso", e essa frase é uma afirmação sobre o RELÓGIO —
  // produzida por um cálculo que, deliberadamente, se recusa a olhar o relógio (usar `Date.now()`
  // faria a marca aparecer e sumir sozinha conforme o dia em que alguém abrisse a página, e nenhum
  // teste poderia prová-la). O resultado era verdadeiro só por coincidência: truncando o histórico
  // REAL no último snapshot antes da lacuna de 17 dias de junho, o painel afirmava "ainda em curso"
  // sobre uma semana encerrada havia até 12 dias.
  //
  // Também disse "N dias medidos", e o número é o span de dias de calendário desde a segunda-feira —
  // não a contagem de dias com medição. Na semana de 15/06 o rótulo dizia 4 e havia snapshot em 3.
  //
  // O que o dado sustenta é só isto: quantos dos 7 dias daquela semana estão DENTRO do intervalo que
  // a série publicada cobre. Vale para a PRIMEIRA semana tanto quanto para a última — as duas são
  // truncadas pelas bordas da série, e marcar só a última era arbitrário.
  var semanas = [];
  for (var t = primeira; t <= ultima; t += WEEK_MS) {
    var iso = msToIso(t);
    var recorteInicio = Math.max(t, inicioSerie);
    var recorteFim = Math.min(t + WEEK_MS - 1, fimSerie);
    var diasCobertos = Math.floor((recorteFim - recorteInicio) / 86400000) + 1;
    semanas.push({
      start: iso,
      label: fmtDayMonth(iso),
      count: comMedicao[t] ? porSemana[t] || 0 : null,
      medido: !!comMedicao[t],
      spansGap: !!aposLacuna[t],
      janelaParcial: diasCobertos < 7,
      diasCobertos: diasCobertos,
      ultimaData: msToIso(fimSerie),
      primeiraData: msToIso(inicioSerie)
    });
  }
  return semanas;
}

/* -------------------------------------------------- série pura (auditável) */

function buildChartSeries(history) {
  var rows = (Array.isArray(history) ? history : []).filter(function (r) {
    return r && r.snapshot_date;
  });
  var dates = rows.map(function (r) {
    return String(r.snapshot_date);
  });

  var tracks = [
    {
      key: "backend_tests",
      label: "Backend",
      cls: "backend",
      points: rows.map(function (r) {
        return metricPass(r.backend_tests);
      })
    },
    {
      key: "frontend_smoke_tests",
      label: "Console web",
      cls: "web",
      points: rows.map(function (r) {
        // chave legada: frontend_smoke (usada num trecho do histórico)
        return metricPass(r.frontend_smoke_tests !== null && r.frontend_smoke_tests !== undefined ? r.frontend_smoke_tests : r.frontend_smoke);
      })
    },
    {
      key: "flutter_tests",
      label: "App de campo",
      cls: "campo",
      points: rows.map(function (r) {
        return metricPass(r.flutter_tests);
      })
    }
  ];

  for (var i = 0; i < tracks.length; i++) {
    var pts = tracks[i].points;
    var measured = 0;
    var lastVal = null;
    for (var j = 0; j < pts.length; j++) {
      if (pts[j] !== null) {
        measured += 1;
        lastVal = pts[j];
      }
    }
    tracks[i].measured = measured;
    tracks[i].last = lastVal;
  }

  var blocks = rows.map(function (r) {
    return metricPass(r.blocks_completed);
  });

  return {
    rows: rows,
    dates: dates,
    tracks: tracks,
    blocks: blocks,
    weeks: buildDelivery(dates, blocks),
    rounds: buildRounds(rows)
  };
}


/* ------------------------------------------------- entregas por rodada
   A rodada NÃO é um campo do dado: ela é lida do nome da versão de cada entrega, que segue a
   convenção de nomenclatura do projeto. É a única fonte que existe — e por isso a tela diz de onde
   ela vem, em vez de apresentar o agrupamento como se fosse declarado. */

var ROTULOS_RODADA = [
  ["TELAS", "Telas"],
  ["OMEGA-VID", "Ω-VID"],
  ["OMEGA5P", "Ω5P"],
  ["OMEGA4C", "Ω4C"],
  ["OMEGA4", "Ω4"],
  ["OMEGA3", "Ω3"],
  ["OMEGA-GATE", "Saneamento"],
  ["OMEGA-GOV", "Saneamento"],
  ["OMEGA-DOCS", "Saneamento"],
  ["OMEGA-INFRA", "Saneamento"],
  ["SAN", "Saneamento"],
  ["GOV-", "Governança"],
  ["WS-MAPA", "Mapa"],
  ["M7-SLA", "Mapa"],
  ["JUNTA-MAPAS", "Mapa"],
  ["GOOGLE-MAPS", "Mapa"],
  ["WS-", "Onda 1"],
  ["PR-SCALE", "Onda 1"],
  ["ONDA", "Onda 1"],
  ["CHK", "Vistorias"],
  ["CHECKLIST", "Vistorias"],
  ["FIX-", "Correções"],
  ["KPI-", "Correções"],
  ["OMEGA", "Ω"],
  ["B-", "Blocos B"],
  ["BLOCO", "Blocos B"]
];

function roundOf(version) {
  var v = String(version || "").toUpperCase().replace(/^Ω/, "OMEGA");
  for (var i = 0; i < ROTULOS_RODADA.length; i++) {
    if (v.indexOf(ROTULOS_RODADA[i][0]) === 0) return ROTULOS_RODADA[i][1];
  }
  return "Outras";
}

// A política de KPI por PR foi decidida em 13/07/2026, mas o registro só virou CONTÍNUO em 19/07 —
// antes disso uma rodada inteira cabia num snapshot (uma delas: 1 registro para 21 entregas).
// Comparar barras dos dois regimes mentiria, então este gráfico corta aqui e DIZ que corta.
var RODADA_CORTE = "2026-07-19";

function buildRounds(rows) {
  var conta = {};
  var fora = 0;
  var ordem = [];
  for (var i = 0; i < rows.length; i++) {
    var d = String(rows[i].snapshot_date);
    if (d < RODADA_CORTE) { fora += 1; continue; }
    var k = roundOf(rows[i].version);
    if (conta[k] === undefined) { conta[k] = 0; ordem.push(k); }
    conta[k] += 1;
  }
  var itens = [];
  for (var j = 0; j < ordem.length; j++) itens.push({ label: ordem[j], value: conta[ordem[j]] });
  itens.sort(function (a, b) { return b.value - a.value; });
  return { itens: itens, fora: fora, corte: RODADA_CORTE };
}

/* ------------------------------------------------------------ escalas SVG */

function niceScale(maxValue) {
  if (!(maxValue > 0)) return { max: 1, step: 1 };
  var rough = maxValue / 5;
  var pow = Math.pow(10, Math.floor(Math.log(rough) / Math.LN10));
  var mult = [1, 2, 2.5, 5, 10];
  var step = pow * 10;
  for (var i = 0; i < mult.length; i++) {
    if (mult[i] * pow >= rough) {
      step = mult[i] * pow;
      break;
    }
  }
  return { max: Math.ceil(maxValue / step) * step, step: step };
}

/** Ticks temporais: primeira data, dia 1 de cada mês no meio, última data. */
function timeTicks(dates) {
  var first = dates[0];
  var last = dates[dates.length - 1];
  var ticks = [first];
  var end = isoToUTC(last);
  var d = new Date(isoToUTC(first));
  var y = d.getUTCFullYear();
  var m = d.getUTCMonth();
  for (;;) {
    m += 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    var ms = Date.UTC(y, m, 1);
    if (ms >= end) break;
    ticks.push(msToIso(ms));
  }
  if (last !== first) ticks.push(last);
  return ticks;
}

function srTable(id, caption, pairs) {
  var body = "";
  for (var i = 0; i < pairs.length; i++) {
    body += "<tr><td>" + esc(pairs[i][0]) + "</td><td>" + esc(pairs[i][1]) + "</td></tr>";
  }
  return (
    '<table id="' + id + '" class="sr-only"><caption>' + esc(caption) + "</caption>" +
    '<tbody><tr><th scope="col">Data</th><th scope="col">Valor</th></tr>' + body + "</tbody></table>"
  );
}

/** Retângulo com topo arredondado, ancorado na linha de base. */
function roundedTopRect(x, y, w, h, r) {
  if (!(h > 0)) return "";
  var rr = Math.min(r, w / 2, h);
  return (
    "M" + x.toFixed(1) + "," + (y + h).toFixed(1) +
    " L" + x.toFixed(1) + "," + (y + rr).toFixed(1) +
    " Q" + x.toFixed(1) + "," + y.toFixed(1) + " " + (x + rr).toFixed(1) + "," + y.toFixed(1) +
    " L" + (x + w - rr).toFixed(1) + "," + y.toFixed(1) +
    " Q" + (x + w).toFixed(1) + "," + y.toFixed(1) + " " + (x + w).toFixed(1) + "," + (y + rr).toFixed(1) +
    " L" + (x + w).toFixed(1) + "," + (y + h).toFixed(1) + " Z"
  );
}

/* ------------------------------------------------------------- gráfico 1
   Testes automatizados: 3 trilhas na mesma unidade (testes que passam), eixo
   único, vértice = medição real, ponto final rotulado direto. */

/** Quebras declaradas em `kpis-latest.json`.series_breaks, indexadas por série.
    Declaradas como DADO, e não inferidas por tamanho do salto: um salto grande também pode ser
    trabalho real, e adivinhar qual é qual seria o painel afirmando o que não mediu. */
function breaksFor(serieKey, points) {
  var decl = DATA.latest && DATA.latest.series_breaks;
  var itens = decl && Array.isArray(decl.itens) ? decl.itens : [];
  var out = {};
  for (var k = 0; k < itens.length; k++) {
    var it = itens[k];
    if (!it || it.serie !== serieKey) continue;
    // Localiza pela TRANSIÇÃO declarada (de → para), não pela data: várias entregas do mesmo dia
    // compartilham `snapshot_date`, e a quebra tem de cair na transição certa. Se a transição não
    // existir na série, a declaração está errada e nada é quebrado — o painel não inventa a ressalva.
    var anterior = null;
    for (var i = 0; i < points.length; i++) {
      if (points[i] === null) continue;
      if (anterior === it.de && points[i] === it.para) {
        out[i] = it;
        break;
      }
      anterior = points[i];
    }
  }
  return out;
}

function testsChartHtml(series) {
  var W = 760;
  var H = 300;
  var mL = 50;
  var mR = 118;
  var mT = 14;
  var mB = 30;
  var plotW = W - mL - mR;
  var plotH = H - mT - mB;

  var maxVal = 0;
  var t;
  for (t = 0; t < series.tracks.length; t++) {
    for (var p = 0; p < series.tracks[t].points.length; p++) {
      var v = series.tracks[t].points[p];
      if (v !== null && v > maxVal) maxVal = v;
    }
  }
  if (!(maxVal > 0)) return '<p class="nodata">Sem medições de teste no histórico.</p>';

  var scale = niceScale(maxVal);
  var t0 = isoToUTC(series.dates[0]);
  var span = Math.max(1, isoToUTC(series.dates[series.dates.length - 1]) - t0);
  function xOf(iso) {
    return mL + ((isoToUTC(iso) - t0) / span) * plotW;
  }
  function yOf(val) {
    return mT + plotH * (1 - val / scale.max);
  }

  var svg = "";
  var gv;
  for (gv = 0; gv <= scale.max; gv += scale.step) {
    var gy = yOf(gv).toFixed(1);
    svg += '<line class="grid-line" x1="' + mL + '" y1="' + gy + '" x2="' + (mL + plotW) + '" y2="' + gy + '"></line>';
    svg += '<text x="' + (mL - 8) + '" y="' + gy + '" text-anchor="end" dominant-baseline="middle">' + esc(fmtInt(gv)) + "</text>";
  }
  svg += '<line class="axis-line" x1="' + mL + '" y1="' + (mT + plotH) + '" x2="' + (mL + plotW) + '" y2="' + (mT + plotH) + '"></line>';

  var ticks = timeTicks(series.dates);
  for (var k = 0; k < ticks.length; k++) {
    var tx = xOf(ticks[k]).toFixed(1);
    svg += '<text x="' + tx + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(fmtDayMonth(ticks[k])) + "</text>";
  }

  var endLabels = [];
  var srTables = "";
  for (t = 0; t < series.tracks.length; t++) {
    var track = series.tracks[t];
    if (track.measured === 0) continue;
    var quebras = breaksFor(track.key, track.points);
    var segmentos = [];
    var coords = [];
    var dots = "";
    var pairs = [];
    var lastX = null;
    var lastY = null;
    var jaMediu = false;
    for (var i = 0; i < track.points.length; i++) {
      var val = track.points[i];
      if (val === null) continue; // lacuna de medição: o ponto é pulado
      var iso = series.dates[i];
      // Quebra de medida: encerra o segmento ANTES deste ponto. Os dois lados existem e são
      // verdadeiros, mas não são comparáveis — ligá-los afirmaria um crescimento que não houve.
      if (jaMediu && quebras[i]) {
        if (coords.length) segmentos.push(coords);
        coords = [];
        var bx = xOf(iso).toFixed(1);
        svg +=
          '<line class="break-rule" x1="' + bx + '" y1="' + mT + '" x2="' + bx + '" y2="' + (mT + plotH) + '">' +
          "<title>" + esc(fmtDateBR(iso) + " — mudança de medida: " + quebras[i].motivo) + "</title></line>";
      }
      var cx = xOf(iso);
      var cy = yOf(val);
      coords.push(cx.toFixed(1) + "," + cy.toFixed(1));
      dots +=
        '<circle class="pt fill-' + track.cls + '" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="2.2">' +
        "<title>" + esc(fmtDayMonth(iso) + " · " + track.label + ": " + fmtInt(val) + " testes") + "</title></circle>";
      pairs.push([fmtDateBR(iso), fmtInt(val)]);
      lastX = cx;
      lastY = cy;
      jaMediu = true;
    }
    if (coords.length) segmentos.push(coords);
    for (var sg = 0; sg < segmentos.length; sg++) {
      if (segmentos[sg].length > 1) {
        svg += '<polyline points="' + segmentos[sg].join(" ") + '" fill="none" class="stroke-' + track.cls + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>';
      }
    }
    svg += dots;
    endLabels.push({ x: lastX, y: lastY, label: track.label, value: track.last });
    srTables += srTable("sr-track-" + track.key, "Testes que passam — " + track.label, pairs);
  }

  // rótulos diretos no fim de cada linha, sem colisão
  endLabels.sort(function (a, b) {
    return a.y - b.y;
  });
  var prevY = -Infinity;
  for (var e = 0; e < endLabels.length; e++) {
    var ly = Math.max(endLabels[e].y, prevY + 26, mT + 10);
    ly = Math.min(ly, mT + plotH - 2);
    prevY = ly;
    svg +=
      '<text class="end-label" x="' + (mL + plotW + 10) + '" y="' + (ly - 5).toFixed(1) + '">' +
      '<tspan class="lbl" x="' + (mL + plotW + 10) + '">' + esc(endLabels[e].label) + "</tspan>" +
      '<tspan x="' + (mL + plotW + 10) + '" dy="13">' + esc(fmtInt(endLabels[e].value)) + "</tspan></text>";
  }

  var described = series.tracks
    .filter(function (tr) {
      return tr.measured > 0;
    })
    .map(function (tr) {
      return "sr-track-" + tr.key;
    })
    .join(" ");

  var legend =
    '<div class="chart-legend">' +
    '<span class="key key-backend"><i></i>Backend</span>' +
    '<span class="key key-web"><i></i>Console web</span>' +
    '<span class="key key-campo"><i></i>App de campo</span>' +
    "</div>";

  // A quebra sem explicação vira mistério; explicada, vira a informação mais honesta do gráfico.
  var declaradas = DATA.latest && DATA.latest.series_breaks && Array.isArray(DATA.latest.series_breaks.itens)
    ? DATA.latest.series_breaks.itens
    : [];
  var rotulos = {};
  for (var q = 0; q < series.tracks.length; q++) rotulos[series.tracks[q].key] = series.tracks[q].label;
  var notas = "";
  if (declaradas.length) {
    var linhas = "";
    for (var d = 0; d < declaradas.length; d++) {
      var it = declaradas[d];
      linhas +=
        "<li><b>" + esc(fmtDateBR(it.data)) + " · " + esc(rotulos[it.serie] || it.serie) + "</b> — " +
        esc(fmtInt(it.de) + " → " + fmtInt(it.para) + ". " + it.motivo) + "</li>";
    }
    notas =
      '<div class="chart-note"><p>A linha <b>quebra</b> onde a métrica mudou o que mede. Os dois lados são ' +
      "verdadeiros, mas não são comparáveis — ligá-los afirmaria um crescimento que não aconteceu.</p><ul>" +
      linhas + "</ul></div>";
  }

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Testes automatizados que passam ao longo do tempo, por trilha" aria-describedby="' + described + '" preserveAspectRatio="xMidYMid meet">' +
    svg +
    "</svg>" +
    legend +
    notas +
    srTables
  );
}

/* ------------------------------------------------------------- gráfico 2
   Blocos entregues: acumulado, uma série (cor da marca), fim destacado. */

function blocksChartHtml(series) {
  var W = 360;
  var H = 240;
  var mL = 40;
  var mR = 52;
  var mT = 16;
  var mB = 28;
  var plotW = W - mL - mR;
  var plotH = H - mT - mB;

  var maxVal = 0;
  var lastVal = null;
  var i;
  for (i = 0; i < series.blocks.length; i++) {
    if (series.blocks[i] !== null) {
      if (series.blocks[i] > maxVal) maxVal = series.blocks[i];
      lastVal = series.blocks[i];
    }
  }
  if (!(maxVal > 0)) return '<p class="nodata">Sem contagem de blocos no histórico.</p>';

  var scale = niceScale(maxVal);
  var t0 = isoToUTC(series.dates[0]);
  var span = Math.max(1, isoToUTC(series.dates[series.dates.length - 1]) - t0);
  function xOf(iso) {
    return mL + ((isoToUTC(iso) - t0) / span) * plotW;
  }
  function yOf(val) {
    return mT + plotH * (1 - val / scale.max);
  }

  var svg = "";
  for (var gv = 0; gv <= scale.max; gv += scale.step) {
    var gy = yOf(gv).toFixed(1);
    svg += '<line class="grid-line" x1="' + mL + '" y1="' + gy + '" x2="' + (mL + plotW) + '" y2="' + gy + '"></line>';
    svg += '<text x="' + (mL - 7) + '" y="' + gy + '" text-anchor="end" dominant-baseline="middle">' + esc(fmtInt(gv)) + "</text>";
  }
  svg += '<line class="axis-line" x1="' + mL + '" y1="' + (mT + plotH) + '" x2="' + (mL + plotW) + '" y2="' + (mT + plotH) + '"></line>';

  var first = series.dates[0];
  var last = series.dates[series.dates.length - 1];
  svg += '<text x="' + xOf(first).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="start">' + esc(fmtDayMonth(first)) + "</text>";
  if (last !== first) {
    svg += '<text x="' + xOf(last).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="end">' + esc(fmtDayMonth(last)) + "</text>";
  }

  var coords = [];
  var pairs = [];
  var lastX = null;
  var lastY = null;
  var dots = "";
  for (i = 0; i < series.blocks.length; i++) {
    var val = series.blocks[i];
    if (val === null) continue;
    var cx = xOf(series.dates[i]);
    var cy = yOf(val);
    coords.push(cx.toFixed(1) + "," + cy.toFixed(1));
    dots +=
      '<circle class="pt fill-brand" cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="1.7">' +
      "<title>" + esc(fmtDayMonth(series.dates[i]) + " · " + fmtInt(val) + " blocos") + "</title></circle>";
    pairs.push([fmtDateBR(series.dates[i]), fmtInt(val)]);
    lastX = cx;
    lastY = cy;
  }
  if (coords.length > 1) {
    svg += '<polyline points="' + coords.join(" ") + '" fill="none" class="stroke-brand" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"></polyline>';
  }
  svg += dots;
  if (lastX !== null) {
    var ly = Math.min(Math.max(lastY, mT + 10), mT + plotH - 2);
    svg += '<circle class="fill-brand" cx="' + lastX.toFixed(1) + '" cy="' + lastY.toFixed(1) + '" r="3.4"></circle>';
    svg += '<text class="end-label" x="' + (mL + plotW + 8) + '" y="' + ly.toFixed(1) + '" dominant-baseline="middle">' + esc(fmtInt(lastVal)) + "</text>";
  }

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Blocos de trabalho entregues, acumulado" aria-describedby="sr-blocks" preserveAspectRatio="xMidYMid meet">' +
    svg +
    "</svg>" +
    srTable("sr-blocks", "Blocos de trabalho entregues (acumulado)", pairs)
  );
}

/* ------------------------------------------------------------- gráfico 3
   Blocos entregues por semana: diferença do contador ACUMULADO entre medições.
   Semana sem medição não desenha barra — ver buildDelivery sobre por que este
   gráfico já contou outra coisa e errava nas duas direções. */

function velocityChartHtml(series) {
  var weeks = series.weeks;
  // Não é "sem registros": o histórico pode ter centenas e ainda assim não dar série semanal —
  // basta faltar medição de blocos, ou existir só uma (não há intervalo para medir entrega).
  if (!weeks.length) return '<p class="nodata">O histórico não tem duas medições de blocos entregues — sem intervalo, não há entrega por semana a mostrar.</p>';

  var W = 360;
  var H = 240;
  var mL = 34;
  var mR = 10;
  var mT = 22;
  var mB = 30;
  var plotW = W - mL - mR;
  var plotH = H - mT - mB;

  var maxVal = 0;
  var i;
  for (i = 0; i < weeks.length; i++) {
    if (weeks[i].count !== null && weeks[i].count > maxVal) maxVal = weeks[i].count;
  }
  if (!(maxVal > 0)) return '<p class="nodata">Sem medições de blocos entregues no histórico.</p>';
  var scale = niceScale(maxVal);
  function yOf(val) {
    return mT + plotH * (1 - val / scale.max);
  }

  var svg = "";
  for (var gv = 0; gv <= scale.max; gv += scale.step) {
    var gy = yOf(gv).toFixed(1);
    svg += '<line class="grid-line" x1="' + mL + '" y1="' + gy + '" x2="' + (mL + plotW) + '" y2="' + gy + '"></line>';
    svg += '<text x="' + (mL - 7) + '" y="' + gy + '" text-anchor="end" dominant-baseline="middle">' + esc(fmtInt(gv)) + "</text>";
  }
  svg += '<line class="axis-line" x1="' + mL + '" y1="' + (mT + plotH) + '" x2="' + (mL + plotW) + '" y2="' + (mT + plotH) + '"></line>';

  var band = plotW / weeks.length;
  var gap = Math.min(8, Math.max(2, band * 0.18));
  var barW = band - gap;
  var labelEvery = weeks.length > 8 ? 2 : 1;
  var pairs = [];

  var houveLacuna = false;
  var houveAcumulo = false;
  var houveParcial = false;

  for (i = 0; i < weeks.length; i++) {
    var wk = weeks[i];
    var x = mL + i * band + gap / 2;

    if (wk.count === null) {
      // Semana sem medição: NÃO é zero entregas — é ausência de medida. Marca discreta no eixo,
      // nenhuma barra, nenhum rótulo numérico. Desenhar zero aqui foi o defeito que este gráfico teve.
      houveLacuna = true;
      svg +=
        '<rect class="week-gap" x="' + x.toFixed(1) + '" y="' + mT + '" width="' + barW.toFixed(1) + '" height="' + plotH + '">' +
        "<title>" + esc("Semana de " + wk.label + " — sem medição publicada. Não significa zero entregas.") + "</title></rect>";
      pairs.push(["Semana de " + fmtDateBR(wk.start), "sem medição"]);
      if (i % labelEvery === 0) {
        svg += '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(wk.label) + "</text>";
      }
      continue;
    }

    var y = yOf(wk.count);
    var h = mT + plotH - y;
    var titulo = "Semana de " + wk.label + " · " + fmtInt(wk.count) + " " + plural(wk.count, "bloco entregue", "blocos entregues");
    if (wk.janelaParcial) {
      houveParcial = true;
      // Afirmação de MEDIDA, com a data que a produziu — nunca afirmação sobre o relógio.
      var borda = i === 0 ? "começa em " + fmtDateBR(wk.primeiraData) : "para em " + fmtDateBR(wk.ultimaData);
      titulo += " — janela incompleta: a série " + borda + " e cobre " + fmtInt(wk.diasCobertos) + " dos 7 dias";
    }
    if (wk.spansGap) {
      houveAcumulo = true;
      titulo += " — janela maior que uma semana: mede desde a última medição publicada";
    }
    if (h > 0) {
      svg +=
        '<path class="bar fill-brand' + (wk.spansGap ? " bar--spans-gap" : "") + (wk.janelaParcial ? " bar--parcial" : "") +
        '" d="' + roundedTopRect(x, y, barW, h, 3) + '">' +
        "<title>" + esc(titulo) + "</title></path>";
    }
    svg +=
      '<text class="bar-label" x="' + (x + barW / 2).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" text-anchor="middle">' +
      esc(fmtInt(wk.count)) + (wk.spansGap ? "*" : "") + (wk.janelaParcial ? "†" : "") + "</text>";
    if (i % labelEvery === 0) {
      svg += '<text x="' + (x + barW / 2).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle">' + esc(wk.label) + "</text>";
    }
    pairs.push([
      "Semana de " + fmtDateBR(wk.start),
      fmtInt(wk.count) +
        (wk.spansGap ? " (janela desde a última medição publicada)" : "") +
        (wk.janelaParcial ? " (janela incompleta: cobre " + fmtInt(wk.diasCobertos) + " de 7 dias)" : "")
    ]);
  }

  var nota = "";
  if (houveLacuna || houveAcumulo || houveParcial) {
    nota = '<div class="chart-note"><p>';
    if (houveLacuna) {
      // "sem barra" sozinho seria falso: uma semana MEDIDA com zero entregas também não desenha
      // barra — ela desenha o número 0. A lacuna é a que não tem barra NEM número.
      nota += "Semana sem barra e sem número é semana <b>sem medição publicada</b> — não é zero entregas. ";
    }
    if (houveAcumulo) {
      nota += "A barra marcada com <b>*</b> mede desde a última medição publicada — a janela dela é maior que uma semana.";
    }
    if (houveParcial) {
      nota +=
        " As barras marcadas com <b>†</b> cobrem uma <b>janela incompleta</b>: a série publicada começa em " +
        esc(fmtDateBR(weeks[0].primeiraData)) + " e para em " + esc(fmtDateBR(weeks[0].ultimaData)) +
        ", então a primeira e a última semana são recortadas pelas bordas — não são comparáveis com as inteiras.";
    }
    nota += "</p></div>";
  }

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Blocos de trabalho entregues por semana" aria-describedby="sr-velocity" preserveAspectRatio="xMidYMid meet">' +
    svg +
    "</svg>" +
    nota +
    srTable("sr-velocity", "Blocos de trabalho entregues por semana", pairs)
  );
}


/* ------------------------------------------------------------- gráfico 4
   Entregas por rodada — barras HORIZONTAIS porque o rótulo é texto e vertical
   colidiria com onze categorias. */

function roundsChartHtml(series) {
  var r = series.rounds;
  if (!r || !r.itens.length) return '<p class="nodata">Nenhuma entrega publicada depois do corte de registro contínuo.</p>';

  // Este cartão ocupa a largura inteira: o viewBox tem de ser largo como o do gráfico de testes
  // (760), senão o SVG escala ~2,8× e a tipografia sai gigante ao lado dos outros três.
  var itens = r.itens;
  var W = 760;
  var linha = 26;
  var mT = 8;
  var mB = 8;
  var mL = 104;
  var mR = 46;
  var H = mT + mB + itens.length * linha;
  var plotW = W - mL - mR;

  var maxVal = 0;
  var i;
  for (i = 0; i < itens.length; i++) if (itens[i].value > maxVal) maxVal = itens[i].value;

  var svg = "";
  var pares = [];
  for (i = 0; i < itens.length; i++) {
    var y = mT + i * linha;
    var w = maxVal > 0 ? (itens[i].value / maxVal) * plotW : 0;
    svg +=
      '<text class="row-label" x="' + (mL - 8) + '" y="' + (y + linha / 2).toFixed(1) + '" text-anchor="end" dominant-baseline="middle">' +
      esc(itens[i].label) + "</text>";
    if (w > 0) {
      svg +=
        '<rect class="bar-h fill-brand" x="' + mL + '" y="' + (y + 4) + '" width="' + w.toFixed(1) + '" height="' + (linha - 8) + '" rx="2">' +
        "<title>" + esc(itens[i].label + ": " + fmtInt(itens[i].value) + " " + plural(itens[i].value, "entrega publicada", "entregas publicadas")) + "</title></rect>";
    }
    svg +=
      '<text class="bar-label" x="' + (mL + w + 6).toFixed(1) + '" y="' + (y + linha / 2).toFixed(1) + '" dominant-baseline="middle">' +
      esc(fmtInt(itens[i].value)) + "</text>";
    pares.push([itens[i].label, fmtInt(itens[i].value)]);
  }

  var nota =
    '<div class="chart-note"><p>A rodada é lida do <b>nome da versão</b> de cada entrega — é a única fonte que o dado tem, ' +
    "não um campo declarado." +
    (r.fora > 0
      ? " O gráfico começa em " + esc(fmtDateBR(r.corte)) + ", quando o registro passou a ser publicado por entrega; as " +
        esc(fmtInt(r.fora)) + " publicações anteriores ficam de fora porque uma rodada inteira cabia num snapshot, e comparar os dois regimes mentiria."
      : "") +
    "</p></div>";

  return (
    '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Entregas publicadas por rodada de trabalho" aria-describedby="sr-rounds" preserveAspectRatio="xMidYMid meet">' +
    svg +
    "</svg>" +
    nota +
    srTable("sr-rounds", "Entregas publicadas por rodada de trabalho", pares)
  );
}

/* --------------------------------------------------------------- DOM raso
   Só document.getElementById + innerHTML/textContent/hidden — o teste-guarda
   roda este arquivo com um document mínimo, sem window. Eventos são opcionais
   e só se ligam quando addEventListener existe de verdade. */

function byId(id) {
  return document.getElementById(id);
}

function setHTML(id, html) {
  var el = byId(id);
  if (el) el.innerHTML = html;
}

function setText(id, text) {
  var el = byId(id);
  if (el) el.textContent = text;
}

function reveal(id) {
  var el = byId(id);
  if (el) el.hidden = false;
  // O link do menu segue a seção: aparece com ela, some com ela. Ver o comentário no index.html.
  var doc = typeof document !== "undefined" ? document : null;
  if (doc && typeof doc.querySelector === "function") {
    var link = doc.querySelector('[data-nav-for="' + id + '"]');
    if (link) link.hidden = false;
  }
}

function listen(id, evt, fn) {
  var el = byId(id);
  if (el && typeof el.addEventListener === "function") el.addEventListener(evt, fn);
}

/* --------------------------------------------------------- estado da página */

var DATA = { latest: null, blocosById: {}, fechadosById: {} };
var FILTER = { sev: "all", estado: "all", mod: "all" };

function indexRoadmap(latest) {
  DATA.blocosById = {};
  DATA.blocoDoAchado = {};
  var blocos = latest && latest.roadmap && Array.isArray(latest.roadmap.blocos) ? latest.roadmap.blocos : [];
  for (var i = 0; i < blocos.length; i++) {
    if (blocos[i] && blocos[i].id) {
      DATA.blocosById[blocos[i].id] = blocos[i];
      // índice reverso: o cronograma também atribui achados a blocos
      // (há achado com bloco null cujo bloco só existe do lado do roadmap)
      if (Array.isArray(blocos[i].achados)) {
        for (var a = 0; a < blocos[i].achados.length; a++) {
          if (DATA.blocoDoAchado[blocos[i].achados[a]] === undefined) {
            DATA.blocoDoAchado[blocos[i].achados[a]] = blocos[i].id;
          }
        }
      }
    }
  }
  DATA.fechadosById = {};
  var fechados = latest && latest.production_readiness && Array.isArray(latest.production_readiness.fechados) ? latest.production_readiness.fechados : [];
  for (var j = 0; j < fechados.length; j++) {
    if (fechados[j] && fechados[j].id) DATA.fechadosById[fechados[j].id] = fechados[j];
  }
}

/* ------------------------------------------------------------- cabeçalho */

function renderMasthead(latest, mode) {
  var bits = [];
  if (latest.snapshot_date) bits.push("Snapshot de " + fmtDateBR(latest.snapshot_date));
  if (latest.version) bits.push("versão " + latest.version);
  if (latest.release && latest.release.status_label) bits.push(latest.release.status_label);
  if (bits.length) setText("meta-line", bits.join(" · "));

  var badge = byId("data-mode");
  if (badge) {
    if (mode === "live") {
      badge.className = "data-mode data-mode--live";
      badge.textContent = "Dados vivos — hidratados agora dos arquivos de KPI deste diretório.";
    } else {
      badge.className = "data-mode data-mode--frozen";
      badge.textContent = "Cópia congelada de " + fmtDateBR(latest.snapshot_date) + " — abra o painel por um servidor para os dados vivos.";
    }
    badge.hidden = false;
  }
}

/* ------------------------------------------ 1. onde o projeto está (dual) */

function meterHtml(labelHtml, valueHtml, pct, ok) {
  var fill = "";
  if (typeof pct === "number" && isFinite(pct)) {
    var w = Math.max(0, Math.min(100, pct));
    fill = '<span class="meter-fill' + (ok ? " meter-fill--ok" : "") + '" style="width:' + w.toFixed(1) + '%"></span>';
  }
  return (
    '<div class="meter"><div class="meter-line"><span>' + labelHtml + '</span><span class="num">' + valueHtml + "</span></div>" +
    '<div class="meter-bar">' + fill + "</div></div>"
  );
}

function renderScopeCard(metrics) {
  var mv = metrics.mvp_vendavel;
  var md = metrics.mvp_demo;
  if (!mv && !md) return false;
  var html = '<p class="kicker">Escopo construído</p>';
  if (mv) {
    if (mv.display !== undefined && mv.display !== null) {
      html += '<div class="state-value">' + esc(mv.display) + "</div>";
    }
    if (mv.label) html += '<p class="state-label">' + esc(mv.label) + "</p>";
    if (typeof mv.value === "number") {
      html += meterHtml("Escopo do produto vendável", esc(mv.display !== undefined && mv.display !== null ? mv.display : mv.value), mv.value, false);
    }
    if (mv.caveat) html += '<p class="state-caveat">' + esc(mv.caveat) + "</p>";
  }
  if (md && md.display !== undefined && md.display !== null) {
    var mdLabel = md.label ? md.label : "Escopo demonstrável";
    html += '<p class="state-second">' + esc(mdLabel) + ': <span class="num">' + esc(md.display) + "</span></p>";
    // A ressalva do 99% também tem de aparecer. Sem esta linha, a correção que trouxe "ESTIMADO"
    // para o 88% criava uma ASSIMETRIA pior do que o problema original: o número mais alto e mais
    // lisonjeiro da página ficava, por contraste, parecendo o sólido. O `.state-second` fica abaixo
    // de um divisor tracejado (styles.css), em compartimento próprio — a ressalva de cima não o cobre.
    if (md.caveat) html += '<p class="state-caveat state-caveat--second">' + esc(md.caveat) + "</p>";
  }
  setHTML("card-scope", html);
  return true;
}

function renderReadinessCard(pr) {
  if (!pr) {
    setHTML("card-readiness", '<p class="kicker">Prontidão para produção</p><p class="nodata">Sem veredito de prontidão registrado no snapshot.</p>');
    return false;
  }
  var html = '<div class="hazard-top"></div><p class="kicker">Prontidão para produção</p>';
  if (pr.veredito) html += '<div class="state-verdict">' + esc(pr.veredito) + "</div>";
  if (pr.deploy_bloqueado === true) {
    html += '<p><span class="tag tag--crit">Implantação bloqueada</span></p>';
  }
  if (typeof pr.p0_total === "number" && typeof pr.p0_fechados === "number") {
    html += meterHtml(
      "Achados críticos corrigidos",
      esc(fmtInt(pr.p0_fechados) + " de " + fmtInt(pr.p0_total)),
      pr.p0_total > 0 ? (pr.p0_fechados / pr.p0_total) * 100 : null,
      true
    );
  }
  if (typeof pr.p1_total === "number" && typeof pr.p1_fechados === "number") {
    html += meterHtml(
      "Achados relevantes corrigidos",
      esc(fmtInt(pr.p1_fechados) + " de " + fmtInt(pr.p1_total)),
      pr.p1_total > 0 ? (pr.p1_fechados / pr.p1_total) * 100 : null,
      true
    );
  }
  if (Array.isArray(pr.fechados) && pr.fechados.length) {
    html += '<ul class="closed-list">';
    for (var i = 0; i < pr.fechados.length; i++) {
      var f = pr.fechados[i];
      html += '<li><span class="num">' + esc(f.id) + "</span> — fechado por " + esc(f.por) + (f.em ? " em " + esc(fmtDateBR(f.em)) : "") + "</li>";
    }
    html += "</ul>";
  }
  var fonteBits = [];
  if (pr.fonte_veredito) fonteBits.push(String(pr.fonte_veredito).split(" — ")[0]);
  if (pr.data_veredito) fonteBits.push("veredito de " + fmtDateBR(pr.data_veredito));
  if (pr.as_of) fonteBits.push("dados de " + fmtDateBR(pr.as_of));
  if (fonteBits.length) html += '<p class="state-source">' + esc(fonteBits.join(" · ")) + "</p>";
  setHTML("card-readiness", html);
  return true;
}

var KPI_MAIN = [
  { key: "backend_tests", label: "Testes de backend" },
  { key: "frontend_smoke_tests", label: "Testes do console web" },
  { key: "flutter_tests", label: "Testes do app de campo" },
  { key: "blocks_completed", label: "Blocos de trabalho entregues" }
];

var KPI_SECONDARY = [
  { key: "flutter_modules", label: "módulos do app de campo" },
  { key: "mobile_backend_contracts", label: "contratos do app com o servidor" },
  { key: "mobile_core_saas_contracts", label: "contratos do núcleo do sistema" },
  { key: "backend_contract_tests_focused", label: "testes de contrato (subconjunto focado)" }
];

function metricDisplay(metric) {
  if (!metric || typeof metric !== "object") return null;
  if (metric.display !== undefined && metric.display !== null) return String(metric.display);
  if (metric.value !== undefined && metric.value !== null) return String(metric.value);
  return null;
}

function renderKpiStrip(metrics) {
  var cards = "";
  var i;
  for (i = 0; i < KPI_MAIN.length; i++) {
    var m = metrics[KPI_MAIN[i].key];
    var disp = metricDisplay(m);
    if (disp === null) continue;
    // O campo `note` é prosa de engenharia escrita para o histórico — cita `npm test`, `.env`,
    // `prisma`, `CI`, `§C3.3`. Expô-la como dica de ferramenta punha jargão de desenvolvimento na
    // superfície de uma página feita para investidor, contra a regra §3. O número e o rótulo bastam;
    // a explicação de cada trilha está no subtítulo da seção.
    cards +=
      '<div class="card kpi-card"><span class="num">' + esc(disp) + '</span><span class="kpi-label">' + esc(KPI_MAIN[i].label) + "</span></div>";
  }
  setHTML("kpi-cards", cards);

  var chips = "";
  for (i = 0; i < KPI_SECONDARY.length; i++) {
    var s = metrics[KPI_SECONDARY[i].key];
    var sd = metricDisplay(s);
    if (sd === null) continue;
    chips += '<li><span class="num">' + esc(sd) + "</span> " + esc(KPI_SECONDARY[i].label) + "</li>";
  }
  setHTML("kpi-secondary", chips);
  return cards !== "" || chips !== "";
}

function renderState(latest) {
  var metrics = latest.metrics && typeof latest.metrics === "object" ? latest.metrics : null;
  var any = false;
  if (metrics) {
    if (renderScopeCard(metrics)) any = true;
    if (renderKpiStrip(metrics)) any = true;
  }
  if (renderReadinessCard(latest.production_readiness)) any = true;
  if (any) reveal("state-section");
}

/* ------------------------------------------------------------ 3. conclusão */

function nextBindingBlock(latest) {
  var r = latest.roadmap;
  if (!r || !Array.isArray(r.ordem_vinculante)) return null;
  for (var i = 0; i < r.ordem_vinculante.length; i++) {
    var b = DATA.blocosById[r.ordem_vinculante[i]];
    if (b && b.estado !== "concluido") return b;
  }
  return null;
}

function renderConclusion(latest) {
  var sentences = [];
  var pr = latest.production_readiness;
  var itens = latest.findings && Array.isArray(latest.findings.itens) ? latest.findings.itens : null;

  if (itens && pr && typeof pr.p0_total === "number" && typeof pr.p1_total === "number") {
    // Contador ausente NÃO vira zero: "0 corrigidos" é uma afirmação, e a fonte não a fez (D-007).
    var temFechados = typeof pr.p0_fechados === "number" && typeof pr.p1_fechados === "number";
    var frase =
      "A auditoria adversarial encomendada pelo próprio time catalogou " + fmtInt(itens.length) + " achados — " +
      fmtInt(pr.p0_total) + " críticos e " + fmtInt(pr.p1_total) + " relevantes";
    if (temFechados) {
      var fechadosTotal = pr.p0_fechados + pr.p1_fechados;
      frase += " — e " + fmtInt(fechadosTotal) + " " + plural(fechadosTotal, "já foi corrigido", "já foram corrigidos") + " com rastro verificável";
    }
    sentences.push(frase + ".");
  } else if (itens) {
    sentences.push("A auditoria adversarial encomendada pelo próprio time catalogou " + fmtInt(itens.length) + " achados.");
  }

  if (pr && pr.veredito) {
    var s = "O veredito vigente é “" + pr.veredito + "”";
    var origem = [];
    if (pr.fonte_veredito) origem.push(String(pr.fonte_veredito).split(" — ")[0]);
    if (pr.data_veredito) origem.push(fmtDateBR(pr.data_veredito));
    if (origem.length) s += " (" + origem.join(", ") + ")";
    if (pr.deploy_bloqueado === true) {
      // A cláusula "até os críticos fecharem" só é verdadeira ENQUANTO houver crítico aberto. Escrita
      // fixa, ela sobrevivia ao próprio fim e continuava prometendo uma condição já cumprida.
      s += ", e a implantação em produção segue bloqueada";
      if (typeof pr.p0_abertos === "number" && pr.p0_abertos > 0) {
        s += " até os " + fmtInt(pr.p0_abertos) + " " + plural(pr.p0_abertos, "achado crítico em aberto fechar", "achados críticos em aberto fecharem");
      } else if (typeof pr.p0_abertos === "number") {
        s += "; os achados críticos fecharam, e o destravamento depende de novo veredito de junta";
      }
    }
    sentences.push(s + ".");
  }

  var r = latest.roadmap;
  if (r && Array.isArray(r.blocos) && r.blocos.length) {
    var done = 0;
    for (var i = 0; i < r.blocos.length; i++) {
      if (r.blocos[i].estado === "concluido") done += 1;
    }
    var s2 = "Do cronograma de correção, " + fmtInt(done) + " de " + fmtInt(r.blocos.length) + " blocos " + plural(done, "está concluído", "estão concluídos");
    var next = nextBindingBlock(latest);
    if (next) {
      s2 += "; o próximo passo vinculante é “" + next.titulo + "” (" + next.id + ")";
      if (next.estado === "plano_aprovado") s2 += ", já com plano aprovado";
    }
    sentences.push(s2 + ".");
  }

  var m = latest.metrics;
  if (m) {
    var mv = metricDisplay(m.mvp_vendavel);
    var bt = metricDisplay(m.backend_tests);
    var ws = metricDisplay(m.frontend_smoke_tests);
    var ft = metricDisplay(m.flutter_tests);
    var bc = metricDisplay(m.blocks_completed);
    if (mv) {
      // "estimado" precisa sobreviver até aqui: a fonte declara este número um palpite, e a prosa
      // não pode devolver a ele a autoridade de medição que o cartão acabou de tirar.
      var s3 = "Do lado do escopo, " + mv + " do produto vendável está construído — percentual estimado de escopo, não medida de prontidão";
      var trilhas = [];
      if (bt) trilhas.push(bt + " testes de backend");
      if (ws) trilhas.push(ws + " no console web");
      if (ft) trilhas.push(ft + " no app de campo");
      if (trilhas.length) s3 += " — sustentado por " + trilhas.join(", ");
      if (bc) s3 += ", ao longo de " + bc + " blocos de trabalho entregues";
      sentences.push(s3 + ".");
    }
  }

  if (!sentences.length) return;
  setText("conclusion-text", sentences.join(" "));
  reveal("conclusion-section");
}

/* ------------------------------------------------------ 4. últimas demandas */

var TIPO_LABELS = {
  feature: { label: "Funcionalidade", cls: "tag--brand" },
  correcao: { label: "Correção", cls: "tag--neutral" },
  correcao_critica: { label: "Correção crítica", cls: "tag--crit" },
  infraestrutura: { label: "Infraestrutura", cls: "tag--neutral" },
  auditoria: { label: "Auditoria", cls: "tag--neutral" }
};

function renderRecent(latest) {
  var rec = latest.recent;
  if (!rec || !Array.isArray(rec.itens) || !rec.itens.length) return;
  var html = "";
  for (var i = 0; i < rec.itens.length; i++) {
    var it = rec.itens[i];
    var tipo = TIPO_LABELS[it.tipo] ? TIPO_LABELS[it.tipo] : { label: it.tipo, cls: "tag--neutral" };
    var meta = "";
    if (it.pr !== null && it.pr !== undefined) meta += '<span class="num">PR #' + esc(it.pr) + "</span>";
    if (it.data) meta += "<span>" + esc(fmtDateBR(it.data)) + "</span>";
    meta += '<span class="tag ' + tipo.cls + '">' + esc(tipo.label) + "</span>";

    var facts = "";
    var j;
    if (typeof it.ciclos_de_reprovacao === "number" && it.ciclos_de_reprovacao > 0) {
      facts +=
        '<li class="fact-ciclos">' +
        esc(fmtInt(it.ciclos_de_reprovacao) + " " + plural(it.ciclos_de_reprovacao, "ciclo de reprovação", "ciclos de reprovação") + " antes de passar") +
        "</li>";
    }
    if (Array.isArray(it.fecha)) {
      for (j = 0; j < it.fecha.length; j++) {
        facts += '<li class="fact-fecha">Fecha ' + esc(it.fecha[j]) + "</li>";
      }
    }
    if (Array.isArray(it.descobertos)) {
      for (j = 0; j < it.descobertos.length; j++) {
        facts += '<li class="fact-descoberto">Descobriu: ' + esc(it.descobertos[j]) + "</li>";
      }
    }

    html +=
      '<li class="card recent-item">' +
      '<div class="recent-meta">' + meta + "</div>" +
      "<h3>" + esc(it.titulo) + "</h3>" +
      (it.resumo ? '<p class="resumo">' + esc(it.resumo) + "</p>" : "") +
      (facts ? '<ul class="recent-facts">' + facts + "</ul>" : "") +
      "</li>";
  }
  setHTML("recent-list", html);
  reveal("recent-section");
}

/* ------------------------------------------------------------- 5. achados */

var SEV_LABELS = { P0: "Crítico", P1: "Relevante" };

var ESTADO_META = {
  plano: { label: "Em correção planejada", order: 1 },
  adiado: { label: "Adiados (na fila do cronograma)", order: 2 },
  sembloco: { label: "Sem bloco de correção", order: 3 },
  aberto: { label: "Em aberto", order: 4 },
  parcial: { label: "Parcialmente superados", order: 5 },
  corrigido: { label: "Corrigidos", order: 6 }
};

/** Bloco de correção do achado: o campo do próprio achado, ou o que o
    cronograma atribui (índice reverso) — derivado dos dados, nunca inventado. */
function blocoDoItem(item) {
  if (item.bloco) return item.bloco;
  if (item.id && DATA.blocoDoAchado[item.id] !== undefined) return DATA.blocoDoAchado[item.id];
  return null;
}

/** "Adiado" é derivado, nunca inventado: ativo + bloco atribuído + bloco
    ainda a_fazer. Os demais estados vêm do status do achado + estado do bloco. */
function deriveEstado(item) {
  if (item.status === "fechado") return "corrigido";
  if (item.status === "parcialmente_superado") return "parcial";
  var blocoId = blocoDoItem(item);
  if (!blocoId) return "sembloco";
  var b = DATA.blocosById[blocoId];
  if (b && b.estado === "a_fazer") return "adiado";
  if (b && b.estado === "plano_aprovado") return "plano";
  return "aberto";
}

function estadoLineHtml(item, estado) {
  var blocoId = blocoDoItem(item);
  var b = blocoId ? DATA.blocosById[blocoId] : null;
  var blocoRef = b ? blocoId + " · " + b.titulo : blocoId;
  if (estado === "corrigido") {
    var fc = DATA.fechadosById[item.id];
    if (fc) return "Corrigido — " + esc(fc.por) + (fc.em ? " em " + esc(fmtDateBR(fc.em)) : "");
    return "Corrigido" + (blocoId ? " no bloco " + esc(blocoId) : "");
  }
  if (estado === "parcial") {
    return "Parcialmente superado" + (blocoRef ? " — o restante fica no bloco " + esc(blocoRef) : "");
  }
  if (estado === "plano") return "Em correção planejada — bloco " + esc(blocoRef);
  if (estado === "adiado") return "Adiado — na fila do bloco " + esc(blocoRef);
  if (estado === "sembloco") return "Em aberto — ainda sem bloco de correção";
  return "Em aberto" + (blocoRef ? " — bloco " + esc(blocoRef) : "");
}

function findingsOf(latest) {
  return latest.findings && Array.isArray(latest.findings.itens) ? latest.findings.itens : [];
}

function renderFindingsControls() {
  var itens = findingsOf(DATA.latest);
  var counts = { sev: {}, estado: {}, mod: {} };
  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    counts.sev[it.severidade] = (counts.sev[it.severidade] || 0) + 1;
    var est = deriveEstado(it);
    counts.estado[est] = (counts.estado[est] || 0) + 1;
    if (it.modulo) counts.mod[it.modulo] = (counts.mod[it.modulo] || 0) + 1;
  }

  function chip(group, value, label, count) {
    var pressed = FILTER[group] === value ? "true" : "false";
    return (
      '<button type="button" class="filter-btn" data-' + group + '="' + esc(value) + '" aria-pressed="' + pressed + '">' +
      esc(label) + (count === null ? "" : " (" + fmtInt(count) + ")") +
      "</button>"
    );
  }

  var html = '<div class="filter-group" role="group" aria-label="Filtrar por gravidade">';
  html += '<span class="filter-group-label">Gravidade</span>';
  html += chip("sev", "all", "Todos", null);
  if (counts.sev.P0) html += chip("sev", "P0", "Críticos", counts.sev.P0);
  if (counts.sev.P1) html += chip("sev", "P1", "Relevantes", counts.sev.P1);
  html += "</div>";

  html += '<div class="filter-group" role="group" aria-label="Filtrar por estado">';
  html += '<span class="filter-group-label">Estado</span>';
  html += chip("estado", "all", "Todos", null);
  var estadoKeys = [];
  for (var k in ESTADO_META) {
    if (counts.estado[k]) estadoKeys.push(k);
  }
  estadoKeys.sort(function (a, b) {
    return ESTADO_META[a].order - ESTADO_META[b].order;
  });
  for (var e = 0; e < estadoKeys.length; e++) {
    html += chip("estado", estadoKeys[e], ESTADO_META[estadoKeys[e]].label, counts.estado[estadoKeys[e]]);
  }
  html += "</div>";

  var mods = [];
  for (var mkey in counts.mod) mods.push(mkey);
  mods.sort();
  if (mods.length) {
    html += '<div class="filter-group"><label class="filter-group-label" for="filter-mod">Módulo</label>';
    html += '<select class="filter-select" id="filter-mod" data-mod="1">';
    html += '<option value="all"' + (FILTER.mod === "all" ? " selected" : "") + ">Todos os módulos</option>";
    for (var m = 0; m < mods.length; m++) {
      html +=
        '<option value="' + esc(mods[m]) + '"' + (FILTER.mod === mods[m] ? " selected" : "") + ">" +
        esc(mods[m]) + " (" + fmtInt(counts.mod[mods[m]]) + ")</option>";
    }
    html += "</select></div>";
  }

  setHTML("findings-filters", html);
}

function renderFindingsList() {
  var itens = findingsOf(DATA.latest);
  var html = "";
  var shown = 0;
  for (var i = 0; i < itens.length; i++) {
    var it = itens[i];
    var estado = deriveEstado(it);
    if (FILTER.sev !== "all" && it.severidade !== FILTER.sev) continue;
    if (FILTER.estado !== "all" && estado !== FILTER.estado) continue;
    if (FILTER.mod !== "all" && it.modulo !== FILTER.mod) continue;
    shown += 1;
    var sevLabel = SEV_LABELS[it.severidade] ? SEV_LABELS[it.severidade] : it.severidade;
    var sevCls = it.severidade === "P0" ? "finding--p0" : "finding--p1";
    var sevTag = it.severidade === "P0" ? "tag--crit" : "tag--warn";
    html +=
      '<li class="card finding ' + sevCls + '">' +
      '<div class="finding-top">' +
      '<span class="tag ' + sevTag + '">' + esc(sevLabel) + "</span>" +
      "<code>" + esc(it.id) + "</code>" +
      '<span class="finding-mod">' + esc(it.modulo) + "</span>" +
      "</div>" +
      '<p class="resumo">' + esc(it.resumo) + "</p>" +
      '<p class="finding-state finding-state--' + estado + '">' + estadoLineHtml(it, estado) + "</p>" +
      "</li>";
  }
  setHTML("findings-list", html);
  var empty = byId("findings-empty");
  if (empty) empty.hidden = shown !== 0;

  setText(
    "findings-status",
    shown === 0
      ? "Nenhum achado corresponde aos filtros escolhidos."
      : fmtInt(shown) + " de " + fmtInt(itens.length) + " " + plural(itens.length, "achado", "achados") + " em exibição."
  );
}

function renderFindings(latest) {
  var itens = findingsOf(latest);
  if (!itens.length) return;

  var pr = latest.production_readiness;
  var lead = "A auditoria catalogou <span class=\"num\">" + fmtInt(itens.length) + "</span> achados";
  if (pr && typeof pr.p0_total === "number" && typeof pr.p1_total === "number") {
    // A decomposição só entra quando os quatro contadores existem. Antes, contador ausente virava
    // "0 corrigidos, 0 em aberto" — uma afirmação que a fonte não fez (D-007).
    var decompor = function (total, fechados, abertos, rotulo) {
      var txt = ': <span class="num">' + fmtInt(total) + "</span> " + rotulo;
      if (typeof fechados === "number" && typeof abertos === "number") {
        txt += " (" + fmtInt(fechados) + " corrigidos, " + fmtInt(abertos) + " em aberto)";
      }
      return txt;
    };
    lead += decompor(pr.p0_total, pr.p0_fechados, pr.p0_abertos, "críticos") +
      " e" + decompor(pr.p1_total, pr.p1_fechados, pr.p1_abertos, "relevantes").slice(1);
  }
  lead += ".";
  if (latest.findings.as_of) lead += " Dados de " + esc(fmtDateBR(latest.findings.as_of)) + ".";
  setHTML("findings-lead", lead);

  renderFindingsControls();
  renderFindingsList();
  reveal("findings-section");

  listen("findings-filters", "click", function (ev) {
    var t = ev && ev.target;
    var btn = t && typeof t.closest === "function" ? t.closest("[data-sev],[data-estado]") : null;
    if (!btn) return;
    var sev = btn.getAttribute("data-sev");
    var est = btn.getAttribute("data-estado");
    if (sev !== null) FILTER.sev = sev;
    if (est !== null) FILTER.estado = est;

    // Redesenhar o grupo inteiro destrói o botão que estava com o foco, e o teclado cai para o
    // corpo da página a cada clique — quem navega por teclado perde o lugar. Guarda-se qual chip
    // era, e o foco volta para ele depois do redesenho.
    var marca = sev !== null ? "data-sev" : "data-estado";
    var valor = sev !== null ? sev : est;

    renderFindingsControls();
    renderFindingsList();

    var painel = byId("findings-filters");
    if (painel && typeof painel.querySelector === "function") {
      var novo = painel.querySelector("[" + marca + '="' + valor + '"]');
      if (novo && typeof novo.focus === "function") novo.focus();
    }
  });
  listen("findings-filters", "change", function (ev) {
    var t = ev && ev.target;
    if (t && typeof t.getAttribute === "function" && t.getAttribute("data-mod") !== null) {
      FILTER.mod = t.value;
      renderFindingsList();
    }
  });
}

/* ---------------------------------------------------------- 6. cronograma */

var ESTADO_BLOCO = {
  concluido: { label: "Concluído", tag: "tag--ok", chk: "chk chk--done", glyph: "✓" },
  plano_aprovado: { label: "Plano aprovado", tag: "tag--brand", chk: "chk chk--plano", glyph: "•" },
  a_fazer: { label: "A fazer", tag: "tag--neutral", chk: "chk", glyph: "" }
};

function renderRoadmap(latest) {
  var r = latest.roadmap;
  if (!r || !Array.isArray(r.blocos) || !r.blocos.length) return;

  var done = 0;
  for (var d = 0; d < r.blocos.length; d++) {
    if (r.blocos[d].estado === "concluido") done += 1;
  }
  var progress =
    '<p class="kicker">Checklist</p>' +
    meterHtml("Blocos de correção concluídos", esc(fmtInt(done) + " de " + fmtInt(r.blocos.length)), (done / r.blocos.length) * 100, true);
  var pr = latest.production_readiness;
  if (pr && typeof pr.p0_abertos === "number") {
    // Com críticos abertos, dizer o que falta. Com zero, o painel NÃO anuncia destravamento:
    // liberar produção é decisão de junta, e antecipá-la ao ver um contador zerar seria o painel
    // concedendo o que não pode conceder.
    progress += pr.p0_abertos > 0
      ? '<p class="state-caveat">Fechar os ' + esc(fmtInt(pr.p0_abertos)) + " " +
        esc(plural(pr.p0_abertos, "achado crítico em aberto", "achados críticos em aberto")) +
        " é a condição para reavaliar a produção.</p>"
      : '<p class="state-caveat">Os achados críticos fecharam. Liberar a produção depende de novo veredito de junta — o painel não antecipa essa decisão.</p>';
  }
  setHTML("roadmap-progress", progress);

  if (Array.isArray(r.ordem_vinculante) && r.ordem_vinculante.length) {
    var order = '<span class="order-label">Ordem vinculante</span>';
    var nextFound = false;
    for (var o = 0; o < r.ordem_vinculante.length; o++) {
      var id = r.ordem_vinculante[o];
      var b = DATA.blocosById[id];
      var cls = "order-step";
      var glyph = "";
      if (b && b.estado === "concluido") {
        cls += " order-step--done";
        glyph = "✓ ";
      } else if (!nextFound) {
        cls += " order-step--next";
        nextFound = true;
      }
      if (o > 0) order += '<span class="order-arrow" aria-hidden="true">→</span>';
      order += '<span class="' + cls + '"' + (b && b.titulo ? ' title="' + esc(b.titulo) + '"' : "") + ">" + glyph + esc(id) + "</span>";
    }
    setHTML("roadmap-order", order);
  }

  var list = "";
  for (var i = 0; i < r.blocos.length; i++) {
    var bloco = r.blocos[i];
    var meta = ESTADO_BLOCO[bloco.estado] ? ESTADO_BLOCO[bloco.estado] : { label: bloco.estado, tag: "tag--neutral", chk: "chk", glyph: "" };
    var facts = "";
    if (Array.isArray(bloco.achados) && bloco.achados.length) {
      facts += "<li>Fecha " + fmtInt(bloco.achados.length) + " " + plural(bloco.achados.length, "achado", "achados") + "</li>";
      for (var a = 0; a < bloco.achados.length; a++) {
        facts += "<li><code>" + esc(bloco.achados[a]) + "</code></li>";
      }
    }
    if (Array.isArray(bloco.dep) && bloco.dep.length) {
      facts += '<li class="fact-dep">Depende de ' + esc(bloco.dep.join(", ")) + "</li>";
    }
    if (bloco.pr !== null && bloco.pr !== undefined) {
      facts += '<li>PR #' + esc(bloco.pr) + "</li>";
    }
    list +=
      '<li class="card roadmap-block">' +
      '<span class="' + meta.chk + '" aria-hidden="true">' + meta.glyph + "</span>" +
      "<div>" +
      "<h3>" + esc(bloco.titulo) + " <code>" + esc(bloco.id) + '</code> <span class="tag ' + meta.tag + '">' + esc(meta.label) + "</span></h3>" +
      (bloco.nota ? '<p class="nota">' + esc(bloco.nota) + "</p>" : "") +
      (facts ? '<ul class="roadmap-facts">' + facts + "</ul>" : "") +
      "</div></li>";
  }
  setHTML("roadmap-list", list);

  var tb = r.trilha_bloqueada;
  if (tb && Array.isArray(tb.itens) && tb.itens.length) {
    var blocked = "<h3>" + esc(tb.titulo ? tb.titulo : "Trilha represada") + " — represada de propósito</h3>";
    blocked += "<p>Funcionalidades prontas para começar, seguradas por decisão de junta até os blocos " + esc(Array.isArray(tb.bloqueada_por) ? tb.bloqueada_por.join(" e ") : "") + " fecharem.</p>";
    blocked += "<ul>";
    for (var tI = 0; tI < tb.itens.length; tI++) {
      blocked += "<li><code>" + esc(tb.itens[tI].id) + "</code> — " + esc(tb.itens[tI].titulo) + "</li>";
    }
    blocked += "</ul>";
    if (tb.fonte) blocked += "<p><em>" + esc(tb.fonte) + ".</em></p>";
    setHTML("roadmap-blocked", blocked);
    reveal("roadmap-blocked");
  }

  reveal("roadmap-section");
}

/* --------------------------------------------------------------- rodapé */

function renderFooter(latest, mode) {
  var sources = [];
  function addSource(s) {
    if (s && sources.indexOf(s) === -1) sources.push(s);
  }
  if (latest.production_readiness) addSource(latest.production_readiness.source);
  if (latest.findings) addSource(latest.findings.source);
  if (latest.roadmap) addSource(latest.roadmap.source);
  if (latest.recent) addSource(latest.recent.source);
  if (latest.production_readiness && latest.production_readiness.fonte_veredito) addSource(latest.production_readiness.fonte_veredito);

  var html = "";
  if (sources.length) html += "<p>Fontes dos dados: " + esc(sources.join(" · ")) + "</p>";
  html +=
    "<p>Este painel hidrata em tempo de execução de Kpis/kpis-latest.json e Kpis/kpis-history.json. " +
    "Dado ausente fica de fora — o painel não estima, não interpola e não completa com zero.</p>";
  if (mode === "frozen" && latest.snapshot_date) {
    html += "<p>Visualização atual: cópia congelada embutida no painel em " + esc(fmtDateBR(latest.snapshot_date)) + ".</p>";
  }
  setHTML("footer-sources", html);
}

/* ------------------------------------------------------------ hidratação */

function renderAll(latest, mode) {
  if (!latest || typeof latest !== "object") {
    setText("meta-line", "Sem dados: os arquivos de KPI não puderam ser lidos e não há cópia embutida.");
    return;
  }
  DATA.latest = latest;
  indexRoadmap(latest);
  renderMasthead(latest, mode);
  renderState(latest);
  renderConclusion(latest);
  renderRecent(latest);
  renderFindings(latest);
  renderRoadmap(latest);
  renderFooter(latest, mode);
}

function renderChartsFromHistory(history) {
  var series = buildChartSeries(history);
  if (!series.rows.length) {
    showChartsNote("O histórico de KPIs está vazio — sem série real, nenhum gráfico é desenhado.");
    return;
  }
  setHTML("chart-tests", testsChartHtml(series));
  setHTML("chart-blocks", blocksChartHtml(series));
  setHTML("chart-velocity", velocityChartHtml(series));
  setHTML("chart-rounds", roundsChartHtml(series));
  reveal("charts-section");
  var note = byId("charts-offline-note");
  if (note) note.hidden = true;
}

function showChartsNote(msg) {
  var note = byId("charts-offline-note");
  if (note) {
    note.textContent = msg;
    note.hidden = false;
  }
}

function fetchJson(path) {
  return fetch(path, { cache: "no-store" }).then(function (res) {
    if (!res || !res.ok) throw new Error("Falha ao ler " + path);
    return res.json();
  });
}

/* Cópia congelada embutida (fallback de file://). O conteúdo é injetado por
   script de build a partir do kpis-latest.json REAL — nunca digitado à mão.
   Sem histórico embutido: gráfico só com a série real, via fetch. */
var FROZEN = {"snapshot_date":"2026-09-03","version":"B-O6R-07a","source":"Kpis/kpis-latest.json","scope":"root_project_kpis_reflecting_mobile_and_web","release":{"block":"\nB-O6R-07a — sub-bloco de AUTORIZACAO da trilha `fix/authorization-and-uploads` do plano Ω6R: fecha o P0 Ω6R-SEC-002 (permissao dedicada `work_orders:approve`, SoD no decide e escopo por objeto no caminho do tecnico), fecha os dois residuais do P1 Ω6R-SEC-003 (lockout no caminho anonimo e rate-limit por IP), pina N/r/p no scrypt de tenant e PROVISIONA a chave nova por MIGRACAO — sem ela a permissao nasce morta em producao. Ω6R-SEC-004 (uploads) NAO entra: e o 07b.","title":"\nO tecnico de campo para de aprovar a propria ordem de servico — e a permissao chega ao banco","pr":369,"merge_commit":null,"approved_head":null,"status":"published_per_pr","summary":"\nB-O6R-07a — o sub-bloco de AUTORIZAÇÃO da trilha \"autorização e uploads\" do plano Ω6R: **SUPERA PARCIALMENTE** o P0 **Ω6R-SEC-002** (status `parcialmente_superado` — ver CORREÇÃO PÓS-VOTO no fim deste texto), fecha os dois residuais nomeados do P1 **Ω6R-SEC-003** e PROVISIONA no banco a permissão que ambos exigem. Plano obrigatório: `agent-orchestration/omega/planos/B-O6R-07-plano.md` — corpo + **EMENDA E1** + **EMENDA E2**, as duas escritas DEPOIS de o dev parar e devolver um achado. O fatiamento 07a/07b é do §1 do plano (precedente SAN2-4a/4b): **Ω6R-SEC-004 (uploads — scanner fail-closed, magic bytes, download endurecido) NÃO ENTRA AQUI**; é o 07b, e o gate da CHECKLIST P1 (\"até B-O6R-07 mergear\") só se satisfaz com os DOIS mergeados.\n\nO QUE ENTROU — inventário COMPLETO, medido antes de escrever esta linha. `git diff --numstat origin/main...HEAD` no head `73a351c` (`origin/main` = `f895dd2`, merge-base limpa): **32 arquivos, +4.842 / −27**, em 5 commits. Por camada: `tests/` 12 arq +1.790/−13 · `src/` 11 arq +344/−14 · `prisma/` 1 arq +47 · `agent-orchestration/` 8 arq +2.661. Sobre essa base, ESTE PR ainda acrescenta a camada de registro (KPI, achados, pendências, status-geral e o diário `dev-k1-k3-kpi.md`), cujo numstat final está publicado no §Fechamento de `agent-orchestration/omega/juntas/votos/O6R-07a/dev-k1-k3-kpi.md`. Nenhum artefato fica sem nome abaixo — é a lição do #368, onde a `description` foi escrita cedo, nunca mais tocada, e acabou inventariando 45,4% do PR (achado alta, por DUAS cadeiras independentes).\n\n**(1) SEC-002 — o P0 — em três cortes.** (a) **Permissão dedicada `work_orders:approve`** (`core-saas/permissions/catalog.ts` +13; `work-orders/work-order.routes.ts` +10/−2): `POST /approvals/:id/approve` e `/reject` exigiam `work_orders:update` — a MESMA guarda do `PATCH /work-orders/:id` — e `technician`/`field_technician` TÊM `:update`; ou seja, o técnico de campo decidia aprovação tenant-wide. Mesmo idioma do `work_orders:mileage_correct`, precedente da casa no MESMO arquivo. Concessão MÍNIMA: `manager` explicitamente; `tenant_admin`/`super_admin`/`platform_admin` por HERANÇA do catálogo; `finance`/`inventory` (\"approval-by-policy\" na matriz) ficam FORA enquanto não houver política de VALOR ancorada no agregado (`approval.types.ts` não tem campo de valor — medido) → pendência nova `P-O6R-B07-APPROVAL-BY-POLICY`. **Leitura não decide:** `GET /approvals/pending` e `/:id` seguem em `work_orders:read`. (b) **SoD no decide** (`approval.service.ts` +39; `approval.types.ts` +11/−2): `actor.userId === requestedByUserId` → **403 `self_decision`**, para approve E reject, com rastro auditável — ação nova `approval.self_decision_denied` e `outcome: \"denied\"` no enum FECHADO (recusa em silêncio é indistinguível de \"ninguém tentou\", e o padrão que se quer detectar é a repetição). (c) **Escopo por objeto** (`work-order.service.ts` +69/−1; `work-order.types.ts` +61): ator que só alcança a OS por papel de campo só muta a OS ATRIBUÍDA a ele (lookup 1:1 `OperatorProfile` por `user_id`); OS de outro ou sem atribuição → **403 `not_assigned_to_actor`**, nunca 404 (o 404 segue reservado a cross-tenant). Nasce no SERVICE — autoridade backend, não UI.\n\n**(2) SEC-003 — os DOIS residuais, e a causa em duas partes.** O NÚCLEO do SEC-003 (UPDATE atômico threshold→`locked_until`) já tinha sido fechado pelo **B-O6R-01 (#357)** — medição do §2.2 do plano, não suposição; este bloco não re-implementa o que já existe. Restavam: (a) **caminho anônimo** (`local-auth-login.service.ts` +35/−5, `anonymous-login.service.ts` +16/−3, `anonymous-login.constants.ts` +16 NOVO): `verifyAnonymousCandidate` passa a chamar o MESMO `incrementFailedAttempts` atômico do B01 — zero contador novo, zero read-modify-write novo — e deixa rastro; a RESPOSTA anônima segue **401 uniforme** (o 423 nunca vaza por essa via, preservando o anti-enumeração do B01). Trade-off consignado no plano §3.4 e entregue à junta: armar lockout por via anônima cria vetor de negação de acesso à conta; mitigação = TTL 15 min + balde por e-mail + rastro. Fecha `P-O6R-B01-ANONIMO-SEM-LOCKOUT` (ALTA). (b) **rate-limit por IP** (`auth.routes.ts` +57/−1): `TokenBucket` REUTILIZADO de `portal-shared` (zero dependência nova — dependência nova exigiria junta-5), chave HMAC derivada de `JWT_SECRET` sobre o IP, nas DUAS rotas de login, estouro → **429 `RATE_LIMITED`**. Fecha `P-O6R-B01-RATE-LIMIT-IP` COM residual re-nomeado `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO` (multi-réplica/Redis + política de `X-Forwarded-For` + enumeração do 400 `TENANT_ID_REQUIRED`), que este bloco NÃO fecha e diz em voz alta.\n\n**(3) O pino do KDF — a classe irmã do SAN2-4b, procurada por ordem do briefing** (`auth/services/password.service.ts` +17). O defeito EXATO do `authority-password` (keylen vindo do dado) NÃO está aqui: `SCRYPT_KEY_LENGTH` é pinado em 64. **Mas `N`, `r` e `p` vinham do stored e eram aceitos para qualquer inteiro positivo** — mesma família (\"parâmetro do KDF vem do dado, não do sistema\"). Agora `parseScryptHash` aceita SOMENTE N=16384, r=8, p=1; qualquer outro trio → `invalid_credentials` **sem rodar scrypt** (um stored forjado com N alto estourava `maxmem` e o erro propagava → 500 no login). Rotação de parâmetros passa a exigir versão nova de formato, como o comentário-lição do 4b prescreve. Módulo distinto de `src/modules/authority/**`, que é PROIBIDO aqui por colisão com o ciclo 5 — sem sobreposição.\n\n**(4) A MIGRAÇÃO DE PROVISIONAMENTO — obrigatória, e o motivo é o mais importante deste PR.** `prisma/migrations/20260871000000_grant_work_orders_approve_permission/migration.sql` (+47, diretório NOVO, aditiva e idempotente). **Permissão que existe só no catálogo em CÓDIGO nasce MORTA em produção:** o deploy roda EXCLUSIVAMENTE `prisma migrate deploy` (`deploy-production.yml:136-141`, sem `db:seed`) — a linha não existiria na tabela `permissions`, e a rota protegida por ela responderia **403 para TODOS os papéis, inclusive o manager**. Quem disse isso não fui eu: foi o guard `tests/permission-catalog-migration-parity.test.ts`, que ficou VERMELHO com a mensagem por extenso assim que a chave entrou no catálogo. Forma copiada da migração-padrão `20260861000000_grant_checklist_run_reopen_permission` (cabeçalho + runbook de `down` + `INSERT ... ON CONFLICT DO NOTHING` nas duas tabelas). Distribuição NO BANCO: `r.key IN ('super_admin','tenant_admin','manager')` — `platform_admin` NÃO existe como linha em `roles` (nenhuma migração insere em `roles`); no catálogo em CÓDIGO ele herda normalmente. **Prova que a migração provisiona, REEXECUTADA por mim (não herdada do diário do dev):** em cluster só-migrado e SEM seed, `select key from permissions where key='work_orders:approve'` devolve a chave — quem inseriu foi a migração; em banco semeado à parte (`erp_k3_parity`, criado e DERRUBADO no mesmo passo, sem tocar a base de trabalho), `role_permissions` devolve exatamente **manager, super_admin, tenant_admin** — `technician`, `operator` e `field_technician` de fora, como a distribuição manda.\n\n**(5) AS DUAS EMENDAS DO PLANO — o que cada uma corrigiu do PRÓPRIO plano.** Nenhuma delas foi \"ajuste de rota\": as duas nascem de um dev que PAROU e devolveu, como o contrato manda, e as duas são apenso APPEND-ONLY (`git diff --numstat` do plano = **255 adições, 0 remoções**). **EMENDA E1** (+ o achado do dev D1): o §3.1 EXIGIA a chave nova; o §5 PROIBIA `prisma/**` INTEIRO; o §3.10 previu o caso e errou o INSTRUMENTO, nomeando \"seed\" — e `prisma/seed.ts` também é `prisma/**`. **Não havia caminho dentro do escopo declarado: o erro era do plano, não do dev.** A E1 emenda o §5 de forma NOMINAL e fechada (4 caminhos, nada genérico), rejeita a opção \"D1 em PR próprio\" com 4 razões — a mais forte: mandaria o dev DESFAZER código pronto e provado, que é exatamente a classe medida pela `D-JUNTA-SEPARACAO-DE-PAPEIS` — e mede a colisão com o ciclo 5 comando a comando (as duas migrations do c5 tocam só `financial_titles`/`financial_entries`; a deste bloco só `permissions`/`role_permissions`; `migrate deploy` aplica migração pendente MAIS ANTIGA que uma já aplicada sem erro nem warning — medido em cluster descartável com o MESMO prisma 7.8.0 do repo; risco real ≈ ZERO nas duas ordens de merge). A E1 também MATA por escrito duas linhas do corpo: \"arquivo de seed de paridade RBAC\" (instrumento errado) e \"ZERO migration → zero colisão\". **EMENDA E2** (+ o achado do dev U3): a falha do sticky avançou da l.612 para a l.620, e a emenda **recusou a saída fácil**. Renumerar 620→403 e 628→403 deixaria o caso verde e MUTILADO: as três requisições morreriam no guard de escopo, a cobertura declarada do caso (o DESVIO pela rota genérica com papéis REAIS do catálogo, fechado pelo SERVIÇO) sumiria em silêncio, e nenhum teste HTTP provaria mais a porta única do conjunto. Decisão medida: **o defeito era do ARRANJO do teste, não do guard** — o arranjo nunca atribuiu a OS a ninguém. A correção atribui a OS a um técnico real (perfil de operador + `POST /assign`), REVERTE ao texto byte-exato pré-E1 as 2 linhas que a E1 tinha autorizado, e deixa l.620 em **409** e l.628 em **200**. Zero linha de `src/**`: o contrato de produto não muda.\n\n**(6) A DESCOBERTA DO `RBAC_MATRIX.md:45` — quem contrariava a matriz era o código ANTIGO.** É o fundamento que sustenta o item (5) e o corte (1c), e vale ser dito sozinho: a coluna 7 (`field_technician`) da linha 45 diz, por escrito, **`execute/update-assigned`** — o poder de update do técnico JÁ ERA escopado à OS atribuída na fonte de verdade que \"não se move\" (§5 do plano congela `RBAC_MATRIX.md`/`APPROVAL_LIMITS.md`: o código converge PARA eles). Logo o guard `not_assigned_to_actor` **não inova nem endurece a política — ele a CUMPRE**; o **200 antigo é que a contrariava**. A consequência aceita, dita às claras para a junta: técnico não-atribuído perde as mutações das rotas **GUARDADAS** — PATCH `/work-orders/:id` e PATCH `/:id/status`; ele **MANTÉM** anexar, apagar anexo alheio e comentar em qualquer OS da organização (medido por execução pela junta — errata **E-a**; ver CORREÇÃO PÓS-VOTO no fim). É fail-closed **no que guarda** — recusa a mais, nunca permissão a mais. A tensão §A2 sobre a semântica de `assigned_operator_id` (atribuição por user id × id de perfil) foi consignada pelo dev e **segue com a junta** — nem a E1 nem a E2 a resolvem.\n\n**(7) OS VERMELHOS-CONTROLE — com os números, um por correção.** Regra-mãe do §4 do plano: nenhuma correção vale por \"ficou verde\"; a MESMA sonda tem de ficar VERMELHA contra o head-base ou com a correção revertida por injeção. §2.5 mediu a detecção-base dos defeitos: **ZERO** — a suíte estava inteira verde sobre o código defeituoso. Resultados, todos com `ec != 0` no vermelho: **permissão** `tests 3 · pass 2 · fail 1` (technician recebia **200** no approve) · **SoD** `tests 3 · pass 0 · fail 3` (autoaprovação **200**) · **escopo por objeto** `tests 5 · pass 3 · fail 2` (técnico A mutava OS de B com **200**) · **lockout anônimo** `tests 13 · pass 4 · fail 9` → verde `13/13` · **rate-limit IP** `tests 6 · pass 2 · fail 4` → verde `6/6`, com os 4 `not ok` nomeados e o mesmo modo de falha (o volume passava como se nada fosse, respondendo 401) · **pino N/r/p** `tests 6 · pass 1 · fail 5` → verde `6/6` · **arranjo do sticky** `tests 15 · pass 14 · fail 1` (`403 !== 409`) → verde `15/15`. Os três vermelhos de auth foram **REFEITOS DO ZERO** pelo sucessor do agente caído (item 9), por injeção de mutação com o CR do arquivo conferido inalterado.\n\n**(8) CONTAGEM DE TESTES — EXECUÇÃO REAL, com N e FORMA (§C3.3).** `backend_tests` **2645/2647**, medido POR MIM nesta árvore, N=1 rodada completa, forma canônica: `npm test` (= `node scripts/run-backend-tests.mjs`), `DATABASE_URL`/`REDIS_URL` do cluster descartável do bloco (`o6r07a-final-pg` :56450 / `o6r07a-final-redis` :56451, **104** migrations), `CORE_SAAS_PERSISTENCE` **não exportada** e `RBAC_DB_PARITY` **ausente** — a mesma forma do job `backend` do CI e da nota do #366. Node v20.19.5. Saída literal: `255 arquivo(s) · 2647 teste(s) · pass 2645 · fail 0 · skipped 2`, `ec=0`, 193 155 ms, e `grep -c \"^not ok\"` no log inteiro = **0**. **O DELTA É +36 E FECHA PELOS DOIS LADOS:** base oficial 248 arq/2611 testes (#366) → 255/2647; os 7 arquivos NOVOS somados isoladamente dão exatamente 36 (approval-permission 3 · approval-sod 3 · wo-object-scope 5 · anon-lockout 7 · anon-lockout-db 6 · login-rate-limit 6 · scrypt-pin 6), e os 4 arquivos EDITADOS mantiveram denominador (sticky 15, approval-routes 2, auth-login-anonymous-db 6, core-saas 26). Não há número órfão. Os **2 `skipped` têm nome**: são os dois casos de `permission-catalog-db-parity`, que se auto-declaram pulados porque a forma canônica não exporta `RBAC_DB_PARITY` — e eu os rodei À PARTE, COM banco semeado, `2/2 pass, skipped 0, ec=0`, junto com `permission-catalog-migration-parity` `3/3, skipped 0, ec=0`: o aceite do E3.1 exigia os DOIS guards verdes e nenhum deles pulado. Bateria completa, `ec` medido por mim: `npm run check` **0** · `npm run lint` **0** · `npm test` **0** · `npm run build` **0** · `node --test --import tsx tests/mobile-backend-contracts.test.ts` **0** (`25/25`, o contrato B-108 não regrediu) · `npm --prefix frontend run check` **0** · `npm --prefix frontend run build` **0** · `git diff --check` **0**. **CARREGADAS §C3.3, com marcador explícito em CADA uma:** `frontend_smoke_tests` 1126/1126, `flutter_tests` 864/864, `backend_contract_tests_focused` 34/34, `flutter_modules` 17/17, `mobile_backend_contracts` 18/18 e `mobile_core_saas_contracts` 21/21 — o PR **não toca** `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem VAZIOS). `mvp_demo` **99%** e `mvp_vendavel` **88%** INTOCADOS (§C3.4): correção de segurança não move escopo de produto. `blocks_completed` **157 → 158**, cumprindo a condição que a entrada SAN2-6 escreveu para si mesma (\"sobe para 158 SÓ QUANDO O SAN2-6 MERGEAR\") — mergeou no #368/`f895dd2`. Pelo mesmo critério: sobe para **159 só quando ESTE PR mergear**. `pr`/`merge_commit`/`approved_head` **null na autoria** (§C3.5).\n\n**(9) AS DUAS QUEDAS DE AGENTE, com o custo real de cada uma.** (a) **`dev-o6r07a-auth-residuais`** (registro em `.../votos/O6R-07a/00-quedas.md`, +96): morreu em `server_error` (*No response from API*) no vão mais perigoso possível — a mensagem de morte foi \"vermelho-controle final do A1 confirmado, **restaurando a correção**\", e o vermelho-controle funciona INJETANDO a reversão e depois restaurando. **Não deixou a árvore revertida** (verificado marcador a marcador: A1 em `local-auth-login.service.ts:261`, A2 em `auth.routes.ts:113`, A3 em `password.service.ts:135`; o numstat de `src/modules/auth/` é de adições dominantes, não de remoção em massa). **Custo real: o código sobreviveu, a PROVA não** — ele mediu A1, A2 e A3 sem gravar nenhum (arquivo escrito às 14:46 com o `§0 Baseline` e nunca mais; os 4 arquivos de teste carimbados 14:48–15:02), deixando os três em `EM APURAÇÃO`, e o sucessor `dev-o6r07a-auth-provas` refez **3/3 dos vermelhos-controle do zero**. Contraste que mede o protocolo: na queda da cadeira C3 do `J-SAN2-6`, com o P1 CUMPRIDO, o custo foi **1/3 do mandato**. E o registro da queda **já foi corrigido pelo sucessor**: onde o orquestrador escreveu \"não sobrou comando nenhum\", sobraram **9 arquivos de saída bruta** no scratchpad — a conclusão continua certa por outro motivo (saída sem comando, sem head e sem atribuição é **log órfão**, indistinguível de log inventado), e a errata está apensa ao próprio `00-quedas.md`. (b) **A cadeira C3 do `J-SAN2-6`** — queda `rate_limit` 429, 0 voto perdido, P1 cumprido, custo 1/3 do mandato; ela pertence à junta do #368, cujo parecer de porteiro viaja NESTE PR (`.../votos/SAN2-6/00c-porteiro-pos-merge-368.md`, +88). O registro de quedas DESTE bloco tem **uma** linha; a segunda queda é a que ele usa como contraste, e é dita aqui com a origem declarada para não inflar o numerador da série P6.\n\n**(10) BACKFILL §C3.5 DO #368 — a dívida do porteiro, paga AQUI.** Aplicado na entrada **SAN2-6** deste mesmo `kpis-history.json`: `pr` **368** · `merge_commit` **`f895dd2`** · `approved_head` **`d90fbbb`**. A RAZÃO do `approved_head` está transcrita ao lado do valor, na própria entrada 151, porque o porteiro registrou como **ressalva R1** que a ata não nomeava o head final: o precedente provado pela cadeira C3 do `J-SAN2-6` (3 de 3 casos onde os hashes divergem — #363/#364/#366) grava **o head da ATA**, nunca o `headRefOid`; a ata `J-SAN2-6.md` nomeia `d90fbbb` (3 ocorrências) e NÃO nomeia `9051e9b` nem `85a9058` (0 ocorrências). O head final `9051e9b` tem árvore idêntica ao squash e carrega o **delta pós-voto** que a ata declara em prosa mas não pina por hash. **REGRA DO PRIMEIRO-QUE-MERGE (§7.1 do plano):** o ciclo 5 do `B-O6R-02` roda em PARALELO, no Codex, em branch própria, e o porteiro do #368 atribuiu a dívida a \"quem mergear primeiro\". **Este PR paga.** O ciclo 5 deve **VERIFICAR e NÃO duplicar** — se ao rebasear encontrar a entrada 151 já com `pr`/`merge_commit`/`approved_head` preenchidos, a dívida está quitada e nada há a fazer. Registro §A2 da reatribuição em `agent-orchestration/controle/pendencias.md` (precedente idêntico: SAN2-5 e SAN2-6 fizeram o mesmo).\n\n**(11) REGISTROS E GUARDS.** `achados.jsonl` + `REGISTRO_ACHADOS_O6R.md`: `Ω6R-SEC-002` e `Ω6R-SEC-003` passam a **`fechado`** com `fechado_em`/`fechado_por`/`evidencia_fechamento` — e **SEM hash de merge**, de propósito: o guard `tests/kpi-achados-paridade.test.ts` distingue \"fechado na autoria\" de \"fechado na main\", e por isso `p0_fechados` continua **4** e `p1_fechados` continua **0** no painel, com os dois entrando em `production_readiness.aguardando_merge`. O veredito **REPROVADO PARA PRODUÇÃO** e `deploy_bloqueado: true` seguem intactos: fechar achado não libera deploy — só junta libera. `pendencias.md`: fecham `P-O6R-B07A-PROVISIONAMENTO-DA-CHAVE` e `P-O6R-B07A-STICKY-409-VIRA-403` (as duas que **BLOQUEAVAM o merge do 07a**) e os dois residuais do B01; `P-O6R-B07` fecha só a METADE (o título \"1 P0 + 2 P1\" zera com o 07b); nascem `P-O6R-B07-APPROVAL-BY-POLICY` e `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`. `pendencias-indice.md` **REGENERADO PELO GERADOR** (`python agent-orchestration/controle/gerar-indice-pendencias.py`), com placar antes/depois publicado no diário do registro. `node scripts/kpi-freeze.mjs` reinjetou a cópia congelada do `Kpis/app.js` a partir deste JSON e o `--check` fecha em `ec=0`; `node --check Kpis/app.js` `ec=0`; `tests/kpi-dashboard-charts.test.ts` verde e **provado MORDENDO** (o `app.js` da `main` contra este JSON dá `ec=1`). `Kpis/index.html` **NÃO muda**: nenhuma dimensão nova nasce neste bloco e o painel hidrata dos JSON (§C3.0) — conferido por medição, não presumido.\n\n**O QUE ESTE BLOCO NÃO FECHOU — dito aqui porque número honesto inclui o que falta.** (1) **`Ω6R-SEC-004` segue ABERTO**: as 5 vias de upload (mobile evidence, attachments, checklists, damages, work-order-attachments) continuam com scanner Noop incondicional, MIME do cliente e download `inline` — é o 07b, e até ele mergear a CHECKLIST P1 permanece bloqueada. (2) **Alçada por VALOR não é implementável neste agregado** (`approval.types.ts` não tem campo de valor): o \"alçada\" do achado se satisfaz no nível papel-política; `finance`/`inventory` ficam sem `work_orders:approve` — `P-O6R-B07-APPROVAL-BY-POLICY`. (3) **`team_id` não entra como critério de escopo** (sem modelo de membership medido). (4) **Rate-limit é IN-PROCESS**: multi-réplica, `X-Forwarded-For` e a enumeração via 400 `TENANT_ID_REQUIRED` ficam em `P-O6R-B07-RATE-LIMIT-DISTRIBUIDO`. (5) **A tensão §A2 do `assigned_operator_id`** (atribuir por user id grava id que não é de perfil → atribuído legítimo pode receber 403) segue ABERTA e é decisão da JUNTA, não do dev nem deste registro. (6) **Condições `pre-existente` herdadas, com a mesma evidência de origem já publicada:** `Kpis/kpis-history.md` (espelho Markdown) segue parado desde o #360 e o bloco `recent` deste JSON segue congelado no #359 (`P-KPI-RECENT-CONGELADO`) enquanto o history já vai no #368; e `release.summary` — este texto — segue sem consumidor na tela (`P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY`). Este bloco não inaugura nenhuma das três nem as esconde. (7) **Nada do ciclo 5**: `git diff --name-only origin/main...HEAD` sobre `.github/`, `scripts/`, `frontend/`, `mobile/`, `CLAUDE.md`, `AGENTS.md`, `RBAC_MATRIX.md` e `APPROVAL_LIMITS.md` sai **VAZIO**, e nenhum dos 8 arquivos de teste reservados ao ciclo 5 aparece no diff.\n\n\n---\n\n**CORREÇÃO PÓS-VOTO — CICLO 2 (achado `K2-A1` da cadeira C3, `alta`, `dentro-do-bloco`).** O texto acima nasceu no **ciclo 1**, que foi **REPROVADO 2×1**, e ficou contradizendo a correção central do ciclo 2 — inclusive contra o `findings` **deste mesmo arquivo**. A junta pegou antes do merge. O que vale:\n\n- **O P0 `Ω6R-SEC-002` NÃO está fechado: está `parcialmente_superado`.** O ciclo 2 provou **9 rotas mutantes ainda abertas** ao técnico não atribuído (3 por execução — anexar 201, **apagar anexo alheio 204 com o blob removido**, comentar 201; 4 por leitura; 2 condicionadas a env), origem `bf456b0` 13/07 #173 e `D-Ω3F-5-COMMENT`. Dona: **`P-O6R-SUBRECURSO-OBJECT-SCOPE`** (ALTA), bloco **`B-O6R-07c`**.\n- **E há uma DÉCIMA via, achada POR EXECUÇÃO pela cadeira C1-v2 e fora do censo dos dois routers:** `POST /mobile/sync/work-order-actions` com `work_order.mileage` deixa o técnico não atribuído escrever quilometragem em OS alheia (medido `null→111111`). **`pre-existente`** (`eed6240`, 17/07, #197) — não reprova, mas torna **vinculante** que \"9 rotas\" seja lido como **escopado aos dois routers** e que o `B-O6R-07c` **cense a superfície de sync** antes de fechar o P0.\n- **Contagem de testes deste PR (ciclo 2, execução real):** `256 arquivo(s) · 2656 teste(s) · pass **2654** · fail 0 · skipped 2`, `ec=0`. **Os parágrafos de medição acima são do CICLO 1** (`255/2647/2645`) e ficam **preservados como tal** — reescrevê-los seria atribuir a quem mediu um número que ele não mediu.\n- **O que o ciclo 2 corrigiu:** a cobrança do lockout anônimo saiu do laço por candidato e virou **ato único pós-veredicto** (o dono com o mesmo e-mail em duas organizações deixou de **trancar a si mesmo ao logar CORRETAMENTE**); e o **dual-match** curou o `403` que o guard novo causava na **fila offline do mobile** ao técnico legitimamente atribuído.\n\n**Registro canonical do §C3.1:** a entrada **`B-O6R-07a-ciclo2`** do `kpis-history.json` (e o espelho `.md`) já nasceu correta — esta correção alinha o `release.summary` a ela. **Classe do defeito:** narrativa escrita cedo, corrigida no lugar canônico e **não no lugar publicado** — a mesma família que o #368 já pagara, agora pega **antes** do merge.","backfill_note":"\nBackfill §C3.5 do **#368** aplicado por ESTE bloco (B-O6R-07a): `pr` 368, `merge_commit` `f895dd2`, `approved_head` `d90fbbb` — vive na entrada **SAN2-6** do `kpis-history.json`, e nao aqui. O `approved_head` e o head da ATA (`agent-orchestration/omega/juntas/J-SAN2-6.md`, que o nomeia 3 vezes), **NAO** o head final `9051e9b` (0 ocorrencias na ata; arvore identica a do squash; carrega o delta pos-voto que a ata declara em prosa sem pinar por hash): gravar um head que a junta nunca viu declararia que ela aprovou um commit que nao julgou. Precedente PROVADO pela cadeira C3 do `J-SAN2-6` — **3 de 3** casos com hashes divergentes (#363, #364, #366) gravaram o head julgado. A escolha esta escrita ao lado do valor na propria entrada 151 porque o porteiro pos-merge do #368 registrou como **ressalva R1** que a ata nao nomeava o head final, e exigiu que quem backfillasse dissesse QUAL head e POR QUE — sob pena de nascer a 7a materializacao da classe `numero sem ancora`. Quitada pela REGRA DO PRIMEIRO-QUE-MERGE (§7.1 do plano B-O6R-07): o ciclo 5 do `B-O6R-02` roda em paralelo e a divida estava atribuida ao `PR seguinte`; quem merge primeiro paga, o outro VERIFICA e nao duplica. O proximo backfill — `pr`/`merge_commit`/`approved_head` da entrada **B-O6R-07a**, hoje `null` — e divida do PR seguinte."},"metrics":{"flutter_tests":{"value":864,"total":864,"display":"864/864","note":"Execução real: 860/860 → 864/864 (+4): o app ganhou o mapeamento dos códigos novos do login sem organização (409/400/429 — bo6r01_login_sem_org_erros_test.dart). Na primeira rodada completa 1 teste de telemetria (PR-13, fora da superfície deste bloco) falhou sob paralelismo e passou isolado e na rodada completa seguinte — flake pré-existente, registrado. [Ciclos 2 e 3: valor CARREGADO — a trilha Flutter não foi tocada pelas correções; sem reexecução (§C3.3).] [B-O6R-ARNES: valor CARREGADO — a trilha Flutter nao foi tocada (o bloco so altera tests/** e scripts/** do backend); sem reexecucao (§C3.3). O `npm --prefix frontend run check` e o build rodaram VERDES na bateria como regressao, sem mover a contagem de smoke.] [B-O6R-REG: valor CARREGADO — este bloco NAO tocou codigo nem teste (diff vazio contra a base em src/, tests/, scripts/, prisma/, frontend/, mobile/ e .github/, conferido pela junta); sem reexecucao (§C3.3). A nota acima descreve a execucao do B-O6R-ARNES (#359), NAO deste PR — marcador acrescentado em 2026-08-29 pelo achado A-2 da cadeira de KPI, que observou que smoke e Flutter ja carregavam o marcador do bloco anterior e o backend afirmava, em primeira pessoa, N=10 'sobre o codigo final deste PR'.] [SAN2-R: valor CARREGADO — bloco de orquestracao, diff de codigo vazio; sem reexecucao (§C3.3).] [SAN2-1R: valor CARREGADO — bloco de registro, diff de codigo vazio; sem reexecucao (§C3.3).] [SAN2-2: valor CARREGADO — o PR NAO toca `mobile/` (prova: `git diff --name-only main...HEAD -- mobile/` sai VAZIO); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-3: valor CARREGADO — o PR NAO toca `mobile/` (prova: `git diff --name-only main...HEAD -- mobile/` e o diff da arvore de trabalho saem os DOIS vazios); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-4a: valor CARREGADO — bloco de MEDICAO, diff de codigo vazio; o PR NAO toca `mobile/` (prova: `git diff --name-only main...HEAD -- mobile/` e o diff da arvore de trabalho saem os DOIS vazios); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[SAN2-5: valor CARREGADO — o bloco NAO toca codigo de produto (governanca de junta, registro e painel); sem reexecucao (§C3.3). Prova medida nas DUAS pontas: `git diff --name-only main...HEAD -- src/ tests/ prisma/` e `git status --porcelain -- src/ tests/ prisma/` saem os DOIS VAZIOS, e `mobile/` nao aparece em nenhum dos dois. A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[SAN2-6: valor CARREGADO — bloco 100% documental/registro (contratos, README do Codex, fonte do protocolo, KPI e pendencias); sem reexecucao (§C3.3). Prova medida nas DUAS pontas: `git diff --name-only main...HEAD -- mobile/` e `git status --porcelain -- mobile/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"frontend_smoke_tests":{"value":1126,"total":1126,"display":"1126/1126","note":"Execução real: 1125/1125 → 1126/1126 (+1): o adapter web mapeia os códigos novos do login sem organização (auth-login-errors.adapter.test.ts), com cópia sem termo técnico. [Ciclos 2 e 3: valor CARREGADO — a trilha web não foi tocada pelas correções; sem reexecução (§C3.3).] [B-O6R-ARNES: valor CARREGADO — a trilha web nao foi tocada (o bloco so altera tests/** e scripts/** do backend); sem reexecucao (§C3.3). O `npm --prefix frontend run check` e o build rodaram VERDES na bateria como regressao, sem mover a contagem de smoke.] [B-O6R-REG: valor CARREGADO — este bloco NAO tocou codigo nem teste (diff vazio contra a base em src/, tests/, scripts/, prisma/, frontend/, mobile/ e .github/, conferido pela junta); sem reexecucao (§C3.3). A nota acima descreve a execucao do B-O6R-ARNES (#359), NAO deste PR — marcador acrescentado em 2026-08-29 pelo achado A-2 da cadeira de KPI, que observou que smoke e Flutter ja carregavam o marcador do bloco anterior e o backend afirmava, em primeira pessoa, N=10 'sobre o codigo final deste PR'.] [SAN2-R: valor CARREGADO — bloco de orquestracao, diff de codigo vazio; sem reexecucao (§C3.3).] [SAN2-1R: valor CARREGADO — bloco de registro, diff de codigo vazio; sem reexecucao (§C3.3).] [SAN2-2: valor CARREGADO — o PR NAO toca `frontend/` (prova: `git diff --name-only main...HEAD -- frontend/` sai VAZIO); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-3: valor CARREGADO — o PR NAO toca `frontend/` (prova: `git diff --name-only main...HEAD -- frontend/` e o diff da arvore de trabalho saem os DOIS vazios); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-4a: valor CARREGADO — bloco de MEDICAO, diff de codigo vazio; o PR NAO toca `frontend/` (prova: `git diff --name-only main...HEAD -- frontend/` e o diff da arvore de trabalho saem os DOIS vazios); sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[SAN2-5: valor CARREGADO — o bloco NAO toca codigo de produto (governanca de junta, registro e painel); sem reexecucao (§C3.3). Prova medida nas DUAS pontas: `git diff --name-only main...HEAD -- src/ tests/ prisma/` e `git status --porcelain -- src/ tests/ prisma/` saem os DOIS VAZIOS, e `frontend/` nao aparece em nenhum dos dois. A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[SAN2-6: valor CARREGADO — bloco 100% documental/registro (contratos, README do Codex, fonte do protocolo, KPI e pendencias); sem reexecucao (§C3.3). Prova medida nas DUAS pontas: `git diff --name-only main...HEAD -- frontend/` e `git status --porcelain -- frontend/` saem os DOIS VAZIOS. A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"backend_tests":{"value":2654,"total":2656,"display":"2654/2656","note":"Execucao real DESTE PR no CICLO 2 (o ciclo 1 media 2645/2647), N=1 rodada completa, FORMA CANONICA declarada: `npm test` (= `node scripts/run-backend-tests.mjs`) com `DATABASE_URL`/`REDIS_URL` exportadas para o par descartavel do ciclo 2 (`dev-c2-pg` :15432, postgres:16, **104** migrations — reuso declarado do container que o proprio bloco subiu; `dev-c2c-redis` :15433, portas medidas por `docker ps` + `netsh` antes), `CORE_SAAS_PERSISTENCE` **NAO exportada** (o runner declara `memory` no processo filho, como o job `backend` do CI) e `RBAC_DB_PARITY` **AUSENTE**. Resultado literal da rodada final: **256 arquivo(s) · 2656 teste(s) · pass 2654 · fail 0 · skipped 2**, `ec=0`. O DELTA sobre o ciclo 1 e **+9 e fecha pelos dois lados**: 255→256 arquivos (o NOVO `o6r07a-anon-lockout-multiorg` = 5) e, nos editados, `o6r07a-anon-lockout-db` 6→7 (+1, caso multi-org sob RLS real) e `o6r07a-wo-object-scope` 5→8 (+3, dual-match) — focados N=3 cada: 5/5 · 7/7 · 8/8 · 7/7, `ec=0` nas 12 execucoes. Honestidade da rodada: a PRIMEIRA suite plena do ciclo 2 saiu `pass 2653 · fail 1` — o unico vermelho era o guard `kpi-dashboard-charts` mordendo a cauda da queda #3 do bloco (`kpis-latest.json` editado pelo dev caido sem rodar `kpi-freeze`); fechada a cauda (freeze re-rodado), a rodada final fechou sem tocar em teste nenhum. Entre a primeira e a final houve DUAS rodadas vermelhas sob CONTENDA de maquina — o critico do ciclo 5 do B-O6R-02 (containers crit-c5-pg/crit-c5-red) rodava em paralelo na mesma maquina: fail 6 e fail 5, TODAS as vitimas com timeout de transacao (5000 ms estourados) ou corrida, interseccao de vitimas entre rodadas VAZIA, nenhum arquivo do bloco entre elas, e parede +54%; com a maquina livre a rodada final voltou ao patamar de parede da rodada 1 e fechou verde. As 4 rodadas estao gravadas no diario dev-ciclo2.md, cada uma com ec, placar e causa nomeada."},"backend_contract_tests_focused":{"value":34,"total":34,"display":"34/34","note":"Bateria focada do B-O6R-ARNES, execucao real, composicao declarada: 29 casos em tests/npm-test-runner-guard.test.ts (21 da base + 3 portados verbatim do guard de skip C5.3 + 5 do piso de denominador) + 5 em tests/db-catalog-write-guard.test.ts com DATABASE_URL presente (1 ratchet lexical + 4 casos -db novos: sonda de barreira sob o mecanismo unico, teardown resiliente com falha injetada, e as duas metades do sweep). Baseline da base era 22 (21 runner-guard + 1 ratchet); nenhum caso morreu; a meta M >= 31 do plano fica cumprida com 34. Sem DATABASE_URL os 4 casos -db nao rodam e o arquivo declara 1 pulo — declarado, nunca silencioso. [SAN2-2: valor CARREGADO — esta bateria focada e do B-O6R-ARNES e NAO foi reexecutada por este PR; a bateria focada do SAN2-2 sao os 12 casos de `tests/agents-mirror-guard.test.ts`, que ja entram contados em `backend_tests` (§C3.3).] [SAN2-3: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4a: valor CARREGADO — bateria focada do B-O6R-ARNES, nao reexecutada aqui (§C3.3); o PR nao toca `tests/` nem `scripts/`.] [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[SAN2-5: valor CARREGADO — o bloco nao toca contratos nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[SAN2-6: valor CARREGADO — o bloco nao toca contratos REST nem `src/`; sem reexecucao (§C3.3). A nota acima descreve execucao de bloco anterior, NAO deste PR.] \n[B-O6R-07a: valor CARREGADO — bateria focada do B-O6R-ARNES, NAO reexecutada aqui (§C3.3); este PR nao toca `scripts/` nem os dois arquivos que a compoem. A bateria focada DESTE bloco sao os 36 casos dos 7 arquivos `tests/o6r07a-*.test.ts`, que ja entram contados em `backend_tests`.]"},"flutter_modules":{"value":17,"total":17,"display":"17/17","note":" [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"},"mvp_demo":{"value":99,"unit":"%","display":"99%","note":"Ω4 fechou o modulo Financeiro do tenant completo (Contas, Titulos AR/AP, Faturamento anti-refaturamento, Caixa/Extrato, Conciliacao, Fechamento com trava retroativa, Cheque, Dashboard real) sobre o hub da OS da Fase 1. +1 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.]","label":"Escopo demonstrável entregue","caveat":"Também estimado, pela mesma régua."},"mvp_vendavel":{"value":88,"unit":"%","display":"88%","note":"Ω4 entregou o pilar Financeiro (AR/AP com chokepoint, faturamento idempotente, caixa/extrato, conciliacao, fechamento de periodo, cheque, dashboard agregado) — nucleo vendavel de gestao financeira. +5 por escopo. Percentual estimado, sujeito a revisao humana. [SAN2-4b: INTOCADO — o PR nao move escopo: conserta arnes de teste e endurece um primitivo de autenticacao, sem entregar funcionalidade nova ao usuario (§C3.4).] [SAN2-6: INTOCADO — o bloco não move escopo de produto] [B-O6R-07a: INTOCADO — o bloco nao move escopo de produto (§C3.4): fecha defeito de autorizacao e autenticacao, sem entregar funcionalidade nova ao usuario.]","label":"Escopo do produto vendável entregue","caveat":"Percentual ESTIMADO, sujeito a revisão humana — não é medição. Mede escopo funcional construído; prontidão para produção é a outra dimensão do painel, medida ao lado."},"blocks_completed":{"value":158,"display":"158","note":"\nSAN2-6 mergeado no #368 (`f895dd2`): a entrada anterior do history declarava, com estas letras, que o numero `sobe para 158 SO QUANDO O SAN2-6 MERGEAR` — mergeou, e o numero sobe. Medido por mim, nao copiado: o parecer do porteiro pos-merge do #368 (`agent-orchestration/omega/juntas/votos/SAN2-6/00c-porteiro-pos-merge-368.md`) registra o merge com `merge_commit f895dd2`, e `git rev-parse origin/main` nesta arvore devolve `f895dd2`. Este e o backfill §C3.5 que o porteiro atribuiu a `quem mergear primeiro` entre o ciclo 5 do B-O6R-02 e o B-O6R-07 — este PR paga (regra do primeiro-que-merge, §7.1 do plano), e o ciclo 5 deve VERIFICAR e NAO duplicar. Pelo mesmo criterio, e para nao repetir a divida: o numero sobe para **159 SO QUANDO O B-O6R-07a MERGEAR** — na autoria ele fica em 158. O 07b conta 159 -> 160 com a mesma justificativa de sub-bloco pleno (precedente SAN2-4a/4b, um incremento por PR mergeado)."},"mobile_backend_contracts":{"value":18,"total":18,"display":"18/18","note":" [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — a metrica `contratos do app com o servidor` nao foi reexecutada e o PR nao toca `mobile/` (§C3.3). O que ESTE PR rodou, como regressao do contrato B-108, foi o arquivo `tests/mobile-backend-contracts.test.ts`: **25/25, fail 0, skipped 0, `ec=0`** — numero medido, publicado aqui como execucao de regressao e NAO promovido a valor da metrica, porque a regua dos 18/18 e outra e trocar a regua sem junta fabricaria uma quebra de serie.]"},"mobile_core_saas_contracts":{"value":21,"total":21,"display":"21/21","note":" [SAN2-4b: valor CARREGADO — o PR nao toca esta trilha; sem reexecucao (§C3.3). Prova medida nas DUAS pontas (commitado e arvore de trabalho): `git diff --name-only 45c3b97...HEAD` e `git status --porcelain` sobre `mobile/` e `frontend/` saem VAZIOS. O diff de codigo deste bloco sao 5 arquivos: `src/modules/authority/authority-password.ts` e quatro em `tests/`.] \n[B-O6R-07a: valor CARREGADO — o ultimo valor oficial, NAO reexecutado por este PR (§C3.3). O bloco corrige autorizacao e autenticacao no backend: o diff nao toca `frontend/` nem `mobile/`, provado nas DUAS pontas (`git diff --name-only origin/main...HEAD -- frontend/ mobile/` e `git status --porcelain` saem os DOIS VAZIOS). `npm --prefix frontend run check` e `npm --prefix frontend run build` rodaram VERDES (`ec=0`) como regressao, sem mover a contagem de smoke. A nota acima descreve execucao de bloco anterior, NAO deste PR.]"}},"policy":{"dual_kpis":false,"root_reflection":"Kpis/ (painel ÚNICO)","rules":["Painel ÚNICO: `Kpis/`. A política dupla foi REVOGADA pelo dono em 2026-08-12 (D-KPI-DUPLA-REVOGADA) e o `mobile/flutter_app/Kpis/` foi apagado — manter dois painéis em paridade manual multiplicava trabalho e risco de divergirem.","Todo PR que altere código/teste/escopo atualiza `Kpis/*` no próprio PR, com contagem de execução REAL (D-KPI-PER-PR); a junta do PR valida os números.","PR que toque Flutter atualiza a métrica `flutter_tests` aqui — não há segundo conjunto.","O ARTEFATO PRINCIPAL é o `Kpis/index.html` (D-KPI-INDEX-PAINEL); os JSON são a fonte de dados e o painel hidrata deles em runtime."]},"notes":["Omega-VID PR-07 (2026-08-01, frontend-only): VehicleDossieModal — o dossie do veiculo num Modal size='lg' (PR-06) com ABAS (Tabs do design-system), aberto ao clicar na vaga OCUPADA do mapa de ocupacao (nao navega mais) e por deep-link ?dossie=<processId>. Componente novo VehicleDossieModal.tsx (frontend/src/modules/patios/processes/components/): a casca fia os hooks (useProcessDossie/useStatement/impound:read) e delega o corpo PURO VehicleDossieView (separado para ser testavel via renderToString com fixtures — mesmo padrao dos paineis puros do modulo). 6 abas reorganizando as secoes que a ProcessoDossiePage empilhava: Visao Geral (ProcessIdentityCard: identificacao/origem + local de guarda), Vistoria de Recepcao (InspectionSection), Linha do Tempo (IntegritySeal+ProcessTimeline), Debitos (GuiaDebitos + LancamentoChargeModal aninhado), Liberacao (LiberacaoPanel), Leilao/Liquidacao (AuctionPanel+LiquidacaoPanel). As abas Checklist do Guincho (PR-08) e Historico de Custodias (PR-09) NAO entram — a estrutura de abas so fica pronta. Hook novo useProcessDossie(processId, enabled=true) extrai a logica de fetch da ProcessoDossiePage (getProcess + eventos/verify/vistoria em paralelo + join client-side patio/vaga + auto-refresh) reusado pela pagina E pelo modal SEM duplicar; a ProcessoDossiePage foi refatorada para consumi-lo, comportamento INALTERADO. ProcessIdentityCard.tsx extraido (2 cards) reusado nos dois. OccupancyMap: a vaga OCUPADA deixa de ser <Link to=/patios/processos/:id> (ExternalLink) e vira BOTAO onOpenDossie(processId) (FileText) — nao navega, sem <Link>/href; §allowlist: currentProcessId nunca como texto. Sem onOpenDossie -> span nao-clicavel (sem trigger morto). PatioDetailPage: o estado {open,processId} do modal E a query ?dossie= (fonte da verdade; helpers PUROS setDossieParam/clearDossieParam em dossieDeepLink.ts): abrir empurra o param (botao-voltar fecha), fechar remove com replace, montar com ?dossie= ja preenchido (refresh/link compartilhado) ABRE automaticamente. A rota /patios/processos/:processId (ProcessoDossiePage) CONTINUA como deep-link/fallback direto. Tabs do design-system ganha role='tab'+aria-selected (aditivo, nao muda classe/texto). Estados obrigatorios (§7): loading/skeleton, erro+retry, acesso-negado (impound:read), nao-encontrado. A11y: foco no modal (PR-06), alvo >=44px no X, aria nas abas. Fidelidade §11: PT-BR de negocio, acentuacao, sem badge PLANNED/TODO, sem rota como texto; cabecalho = placa + chip de status. +16 smoke tests reais (patios-dossie-modal.smoke.test.tsx=14 + patios-dossie-deeplink.smoke.test.tsx=2) + patios-mapa.smoke migrado (3 testes <Link>->botao). Bateria: npm --prefix frontend run check OK, test:smoke 970/970 (0 fail/0 skip, sobre 954), build OK (dist limpo apos, §C5), git diff --check limpo. frontend_smoke 954 -> 970 (execucao real). backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 123->124 (1 bloco = 1 PR). Escopo: frontend/src/modules/patios/** + frontend/src/components/ui/index.tsx (Tabs aria) + frontend/package.json + frontend/tests/** + Kpis/*. INTOCADOS: src/** (backend), mobile/**, aba Checklist(PR-08)/Historico(PR-09). pr/merge_commit/approved_head null na autoria.","Omega-VID PR-06 (2026-08-01, frontend-only, design-system): o Modal do design system ganha uma prop OPCIONAL size?: 'md'|'lg' (default 'md') para abrir a reta de UI do dossie do veiculo (PR-07 com abas). size='lg' => className 'ui-modal ui-modal--lg' + children envolvido em <div class='ui-modal__body'>. CSS novo SO na variante (.ui-modal--lg width min(1180px,96vw)/max-height 92vh/flex-column; body overflow-y auto/flex 1; header flex none; X 44px; focus-visible) — o seletor base .ui-drawer,.ui-modal (420px, compartilhado) NAO foi tocado, entao Drawer e todos os modais 'md' seguem intocados. O caminho 'md' e byte-identico ao codigo anterior (className inalterada + children renderizado DIRETO, sem wrapper) — decisao consciente de so aplicar o body-div no 'lg' para garantir ZERO regressao. Grep por '<Modal' em frontend/src confirmou que NENHUM dos ~55 usos passa 'size' hoje (NovoProcessoModal/SpotPickerModal/VacateSpotModal/LancamentoChargeModal/YardFormModal/YardAreaFormModal/YardSpotFormModal/EditalModal/PerfilFormModal/ProcessPickerModal de Patios + estoque/frota/financeiro/cadastros/notificacoes/sessoes/work-orders) => todos herdam 'md' => zero mudanca visual. Theme-aware (tokens --surface-panel/--shadow-overlay, sem cor hardcoded). A11y: role='dialog'+aria-modal='true'+aria-label mantidos, botao X (aria-label='Fechar'), alvo de toque >=44px + foco visivel na variante lg (base 36px preservado). Responsivo: 96vw + max-height 92vh + body scrollavel => nunca estoura a viewport. NAO foi introduzido close por backdrop/Esc (o Modal nunca teve — evita regredir modais com onClose condicional a estado busy). Componente Tabs (ja existente) NAO tocado (reuso no PR-07). +4 smoke tests reais (frontend/tests/modal-large.test.tsx, registrados em package.json test:smoke): frontend_smoke 950 -> 954 (execucao real 954 pass/0 fail/0 skip). Bateria: npm --prefix frontend run check OK, test:smoke 954/954, build OK (dist limpo apos, §C5), git diff --check limpo. backend/flutter INALTERADOS (frontend-only, ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed 122->123 (1 bloco = 1 PR; horizontal de design-system, numero sujeito a junta). Escopo: frontend/src/components/ui/index.tsx + frontend/src/styles/app.css + frontend/package.json + frontend/tests/modal-large.test.tsx + Kpis/*. INTOCADOS: src/** (backend), mobile/**, o .ui-modal base, Tabs. pr/merge_commit/approved_head null na autoria.","Omega-VID PR-05 FIX-JUNTA (2026-08-01, D-Omega-VID-05-SEED): a junta do PR-05 APROVOU_CONDICIONADO; o critico-adversarial provou por PoC 1 MEDIA real — a colisao-POR-REUSO (uma placa digitada errada na OS que casa EXATAMENTE o plate_key de uma identidade existente de OUTRO veiculo faz o processo do 2o veiculo ser agregado sob a identidade do 1o: UMA identidade passa a conter processos de DOIS veiculos) NAO tinha caminho de correcao. Das mitigacoes registradas na D-record, 2 NAO operavam sobre a colisao-por-reuso: (a) a vistoria NAO reapontava identity_id; (b) o banner duplicateCandidates so dispara com >=2 identidades ATIVAS da mesma placa (a colisao-por-reuso produz UMA -> nunca aparece); (c) merge/unmerge NAO fazem SPLIT. Resultado: agregacao errada so seria corrigivel por SQL manual (proibido, D-Omega-VID-01). CONSERTO (o dominio-correto — a vistoria e a fonte de verdade da identidade, D-Omega5P-REC-10): quando a vistoria de recepcao CONFIRMA a placa (saveInspection), o fluxo RE-RESOLVE e RE-APONTA ImpoundProcess.identity_id para a identidade correta daquela placa confirmada, NA MESMA tx RLS da vistoria (reconcileIdentityFromConfirmedPlate em impound-prisma.repository.upsertInspection; REUSA resolveOrCreateByPlateKey do PR-05). Isso SPLITA a agregacao errada (o processo de Y, ao confirmar Y na vistoria, sai da identidade de X e vai para a de Y) e sobe a identidade confirmada PROVISIONAL->CONFIRMED. A vistoria e a garantia de CONVERGENCIA EVENTUAL, INDEPENDENTE do guard de seed-time (o guard estrito /^[A-Z0-9]{7}$/ do sweep vs. o truthy do backfill deixa de importar). Limitacoes aceitas por desenho documentadas na D-record (fragmentacao sob sweeps concorrentes -> vistoria+merge reconciliam; AUTO-link fail-closed -> trade-off intencional atomicidade/zero-orfao, comentado no codigo). +3 test() DB-gated reais (SPLIT vivo / no-op idempotente / PROVISIONAL->CONFIRMED); suite do arquivo 25->28; regressao impound/vehicle-identity/owner-portal/stock-custody 217 pass/0 fail. backend 2082/2088 -> 2085/2091. flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3). blocks_completed inalterado (122; fix dentro do PR-05). Escopo: src/modules/impound/{service,intake.types,repository,impound-prisma.repository}.ts + agent-orchestration/controle/decisoes.md + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations, impound.hashchain/impound.transitions/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity, scripts/backfill-*, mobile/**. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","Omega-VID PR-05 (2026-08-01, D-Omega-VID-05-SEED — backend-only): fecha a corrida 'backfill 1x vs sweep continuo' (achado #1 da junta de arquitetura). O sweep OS->custodia (impound.reconcile) passa a RESOLVER/CRIAR a ThirdPartyVehicleIdentity e AUTO-linkar os ChecklistRun da OS ao ImpoundProcess NA MESMA transacao da abertura (openFromRemovalAtomic). Guard de forma de placa (7 alfanumericos apos normalizePlateKey): plausivel -> resolve-ou-cria PROVISIONAL/unidentified=false/plate_key com REUSO byte-identico ao backfill PR-03 (findFirst confidence!=MERGED orderBy created_at asc) => sweep e backfill convergem na MESMA identidade agregadora; lixo/vazio -> PROVISIONAL/unidentified=true reason neutro (satisfaz identity_chk). O PROCESSO segue vehicle_unidentified=true (D-Omega5P-REC-10; identidade dele so pela vistoria); a identidade agregadora e PROVISIONAL, separada. Efeito-de-dominio SISTEMA (created_by NULL, sem re-checar permissao de vehicle_identity/checklist). Fail-CLOSED por construcao (nao fail-open): identidade+link na MESMA tx (identity-create SEM unique -> sem P2002/25P02; FK/CHECK na propria tx; link por upsert ON CONFLICT idempotente) => se o INSERT do processo colidir no indice PARCIAL unico (duplicate_service_order) a tx INTEIRA reverte, inclusive identidade+link => nenhum orfao. SEM migracao (colunas identity_id/ImpoundProcessChecklistLink/ThirdPartyVehicleIdentity ja existem do PR-02/04; custody_events.type e TEXT livre sem CHECK — nao ha o problema que mordeu o PR-A). Escopo: src/modules/impound/** (reconcile/service/types/prisma-repo/repo) + src/modules/vehicle-identities/{vehicle-identity.repository,vehicle-identity-prisma.repository,vehicle-identity.types}.ts (helper) + tests + Kpis/*. INTOCADOS: prisma/schema.prisma+migrations (sem migracao), impound.hashchain.ts/impound.transitions.ts/resolveTransition (FSM/cadeia), mergeIdentities/unmergeIdentity (PR-04), scripts/backfill-* (so referencia), RBAC/rotas/.env/lockfiles/mobile/**. +18 test() reais (3 unit InMemory + 15 DB-gated Postgres): backend 2064/2070 -> 2082/2088; flutter/frontend_smoke inalterados (backend-only, D-KPI-PER-PR §C3.3); blocks_completed 121->122. pr/merge_commit/approved_head null na autoria (backfill pos-merge).","PR-B FIX-JUNTA (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter): correcao dos 6 achados reais da junta APROVADO_CONDICIONADO. (1 ALTA/crash) migracao Drift: as constantes de CREATE ja traziam as colunas novas, entao um device em schema 1/2 subindo direto para 13 criava a tabela ja completa (from<2 work_orders / from<3 checklist) e depois o ALTER ADD COLUMN duplicava -> 'duplicate column name' -> onUpgrade falha -> banco nao abre -> dados offline inacessiveis. Guardas from>=2 (work_orders: service_type/customer_*/vehicle_*/team_*) e from>=3 (checklist_runs.kind, checklist_attachments.5cols) fazem o ALTER so rodar quando a tabela NAO nasceu completa nesta migracao (mesma intencao do par create/else-if do work_order_evidence). +2 testes de MIGRACAO REAL (nenhum existia; todos usavam openInMemory=onCreate fresco). (2) marker sem component_id: addMarker agora LANCA e nao enfileira (backend exige component_id -> 400 -> sumia apos maxRetry); tela guarda + componentId virou required. (3) acknowledgement: (a) lote ordenado por created_at no store (ORDER BY) e no replay (sort estavel) garantindo divergence->ack->complete; (b) completeRun reporta has_divergence REAL (antes forcava false -> rebaixava pending_acknowledgement->completed e a ciencia 409-perdia); (c) 409 ACKNOWLEDGEMENT_NOT_REQUIRED mapeado para failed retryavel (nao conflito terminal que exclui do replay para sempre). (4) AutoSyncCoordinator: novo downloadPendingRuns baixa o server_run_id das runs iniciadas 100% offline (com acoes/fotos pendentes sem serverId) ANTES do replay, sem depender de reabrir a tela. (5) foto: blob so apagado com status=='stored' (§B-108); scan_failed/rejected/pending_review preservam o blob (espelha evidence). (6) acentuacao PT-BR do AwaitingDispatchView (servico/nao/voce/ja->serviço/não/você/já) + doc de getOrStartRun + widget test. flutter_tests 822->835 (+13 reais; 835/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS (Flutter-only; ultimo valor oficial, D-KPI-PER-PR §C3.3). blocks_completed inalterado (fix dentro da PR-B). Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** e pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-B (2026-08-01, D-CHK-DISPATCH-CREATE — lado Flutter, consome o backend PR-A ja mergeado): o guincheiro deixa de CRIAR a run localmente e passa a BAIXAR a run pre-criada pelo despacho. (1) checklist_repository.resolveRunForWorkOrder: novo remoto fetchRunsForWorkOrder (GET /api/v1/mobile/checklist-runs?workOrderId[&checklistId], parse tolerante snake/camel, desambigua por checklistId), grava o server_run_id no Drift, responde CONTRA a run baixada; getOrStartRun NAO enfileira mais runCreate; lista vazia -> 'aguardando despacho' (sem run local, sem runCreate; a lista vazia PODE ser falha de provisao, nao so ausencia); offline -> run local usavel + carimbo do server_run_id nas acoes ja enfileiradas quando o download chega. (2) sync destravado: supportedActionTypes = ciclo completo menos runCreate; elegibilidade exige server_run_id (satisfeito). (3) codec canonico: marker/divergence/acknowledgement/attachment -> tipos+payloads que o backend PR-A aceita (antes caiam no generico e o efeito sumia); run_id = server_run_id baixado. (4) foto por MULTIPART: blob durable offline-first + ChecklistAttachmentUploadService (POST /mobile/checklist-runs/:runId/attachments) plugado no auto-sync; migracao Drift ADITIVA 12->13. (5) UI 'aguardando despacho' (loading/erro/retry, PT-BR, a11y). flutter_tests 807->822 (+15 test reais, suite 822/0-falha/0-skip). backend_tests (2064/2070) e frontend_smoke (950) INALTERADOS — PR Flutter-only; carregam o ultimo valor oficial (D-KPI-PER-PR §C3.3). blocks_completed 120->121. Escopo: mobile/flutter_app/** + Kpis/* (dual). src/** INTOCADO. pubspec/lock INTOCADOS. pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA REVERIF (2026-08-01): a re-verificacao da junta achou 1 MEDIA + 1 BAIXA no conserto de idempotencia da criacao de run (item 2 do FIX-JUNTA). (MEDIA) o P2002 catch-then-refetch rodava numa transacao ABORTADA: withTenantRls envolve TODO o PrismaChecklistRepository.createRun numa UNICA transacao interativa; sob 2 despachos/creates concorrentes da MESMA OS com a mesma client_run_key, o perdedor sofria unique violation (23505/P2002), a tx entrava em ABORTED e a re-busca getRunByClientKey no catch falhava com 25P02 ('current transaction is aborted') — sem code P2002, NAO era re-capturada -> createRun LANCAVA em vez de devolver {created:false}. Impacto: o perdedor caia no fail-open do field-dispatch como provisao FALHA -> evento ESPURIO field_dispatch_checklist_run_failed + notificacao falsa ao operador (falso alarme do proprio sinal de observabilidade recem-adicionado), e no mobile-sync retornava erro em vez de already_applied. Cura na RAIZ: createRun com client_run_key passou a usar INSERT ... ON CONFLICT (tenant_id, client_run_key) DO NOTHING RETURNING via $queryRaw (0 linhas -> conflito, tx NAO aborta -> SELECT normal devolve a existente com created:false; 1 linha -> created:true; respostas via createMany na mesma tx; caminho SEM client_run_key inalterado). InMemory ja espelhava o contrato {run, created}. RlsPrismaChecklistRepository exportado para o teste. (BAIXA) o teste de concorrencia [nao super-conta] rodava so em memory (serializa sincrono, nunca exercita o 25P02): adicionado tests/checklist-run-create-concurrency-db.test.ts (DB-gated, Postgres real) que forca o perdedor ao ON CONFLICT via barreira (a N-concorrencia ingenua mascara o abort) e prova created:false LIMPO + 1 run + 1 checklist_runs_count + ZERO evento/notificacao espurios. Provado VIVO: 2/2 verdes com a cura; o teste-barreira REPROVA (25P02) contra o codigo antigo. Escopo respeitado: withTenantRls/rls.ts INTOCADO (a cura e no INSERT do repo). +2 test() -> backend 2062/2068 -> 2064/2070. blocks_completed inalterado (120; re-verificacao dentro da PR-A). pr/merge_commit/approved_head null na autoria.","PR-A FIX-JUNTA (2026-08-01): correcao dos 6 achados da junta APROVADO_CONDICIONADO da PR-A. (1 ALTA/dba) migracao aditiva 20260858000000 estende o CHECK field_dispatch_events_event_type_check para admitir 'field_dispatch_checklist_run_failed' — sem ela o INSERT do evento fail-open estourava 23514 NAO-capturado (create NAO usa $transaction) -> HTTP 500 com despacho orfao + Outbox perdido + auditoria perdida; provado vivo contra Postgres (valor novo -> INSERT OK; valor fora da lista -> 23514); comentario falso em field-dispatch.types.ts corrigido; + defesa-em-profundidade try/catch na auditoria. (2 MEDIA/critico) repository.createRun devolve {run, created}; o service PULA audit + publishDomainEvent('checklist_run.created') quando created=false -> nao super-conta a metrica FATURADA checklist_runs_count sob 2 despachos concorrentes / 2x POST mesma client_run_key (in-memory+Prisma+Rls+callers). (3 MEDIA/critico) reassign agora REPROVISIONA a run idempotente (auto-recuperacao real quando a provisao do create falhou) + notificacao ao operador via motor de notificacoes existente (injetado no composition root, dependency-inverted). (4 BAIXA) reason de auditoria CODIFICADO (taxonomia curta / ChecklistError.reason), nunca error.message cru (§2.8). (5 BAIXA) GET run-por-OS aceita ?checklistId= p/ desambiguar quando a OS troca de checklist entre despachos (>1 run; ordem created_at desc). (6 BAIXA/dba) comentario de ops sobre indice nao-CONCURRENTLY na migracao 20260857000000. (7) mobile-backend-contracts fixa CORE_SAAS_PERSISTENCE=memory no setup. +3 test() reais -> backend 2059->2062 / 2065->2068. blocks_completed inalterado (120; fix dentro da mesma PR-A). Migracao 20260858000000 aplicada viva (migrate deploy + migrate status up-to-date).","PR-20-FIX (2026-07-30): trigger BEFORE UPDATE em impound_outbox_events (guard_update) — a fila de outbox so podia ter DELETE bloqueado, nao UPDATE; um UPDATE de payload/tenant_id/process_id/event_type/occurred_at/schema_version/target/created_at rodava sem erro (PoC do critico-adversarial). Adicionado na MESMA migracao 20260853000000 (ainda nao commitada), so status/attempts/last_error mutaveis por desenho da fila. Migracao reaplicada viva no Postgres de dev (prisma db execute + checksum de _prisma_migrations reconciliado); prisma validate/migrate status OK. +1 teste em tests/impound-outbox.test.ts prova UPDATE de payload/process_id bloqueado e status/attempts/last_error permitido. backend 1956/1971 (numero relatado pelo PR-20 original) -> 1957/1972; regressao da familia impound/auction/release/settlement (26 arquivos, 203 testes) verde. frontend_smoke inalterado (937) — aguarda o PR de frontend paralelo fechar seu proprio achado e atualizar essa metrica no proprio PR quando fechar.","PR-17b (2026-07-30): fotos de vistoria MINIMIZADAS servidas pelo owner-portal (resize<=1024px+JPEG q70+marca-d'agua fixa, buffer-in/buffer-out, zero disco). Conserto pos-revisao de junta (secops/coordenador-de-acessos/dba-guardiao APROVARAM; critico-adversarial + avaliador REPROVARAM com achados concretos, ambos fechados nesta entrega): (1) C2 — composicao do semaforo de concorrencia invertida (guard.run envolve o trabalho REAL sem timeout embutido; o timeout de resposta HTTP envolve o resultado de guard.run) para o slot so ser devolvido ao pool quando a decodificacao de fato termina, nunca quando um timeout externo dispara antes; teste de regressao (2c) prova o comportamento correto. (2) D-007 — availabilityLabel deixou de prometer 'visualizacao' nesta tela (o PWA ainda nao tem UI que consuma /photos/:opaqueRef; adiado para PR de frontend futuro). (3) este proprio snapshot fecha a pendencia de KPI-por-PR (git diff de Kpis/ estava vazio no diff original). +17 testes sempre-roda (owner-portal-photos.test.ts, arquivo novo), zero DB-gated novos, zero dependencia nova alem do jimp ja aprovado.","PR-19 (2026-07-29): a autoridade credenciada aprova/rejeita a liberacao in-system pelo MESMO BFF isolado do 18a/18b — fecha a Fase 5 (fundacao/solicitar/aprovar) e a SoD final triplice (autoridade SOLICITA / operador CONCLUI / autoridade APROVA). Vinculacao D-08 por proveniencia (nunca por texto livre) e a decisao de design mais defendida do PR (contra a tentacao de amarrar por authority_case_number, spoofavel). Zero mudanca no gate I5/resolveTransition/IMPOUND_TRANSITIONS/impound.hashchain — 100% aditivo. 2 CHECKs pre-existentes precisaram de widening aditivo (achados por prova viva contra Postgres, nao em memory) — motivo a mais para a bateria DB-gated ser obrigatoria antes do merge.","FIX-NAV-MENU-PLATFORM-JWT (2026-07-29): remove o 500 do menu platform sob JWT/Prisma na fronteira correta. O pseudo-tenant platform nao e UUID nem tenant persistido; somente Navigation opta por preservar suas permissoes derivadas dos papeis canonicos do JWT assinado. Os outros 55 usos no baseline pos-PR-18a continuam fail-closed, tenants reais usam RBAC persistente e platform nao habilita itens tenantOnly. O [0] observado era efeito no teste depois do 500, nao a causa de producao. Suite protegida 7/7 em Prisma real; suite completa pos-rebase 1900 pass/0 fail/6 skip (1906 total); +3 testes adversariais.","D-Ω4-KPI-RELATORIO (reconciliação 2026-07-18): a rodada Ω4 (Financeiro do tenant ×1,5) deferiu a atualização de KPI de todos os seus PRs (#206–#225) para este snapshot único. Contagens de execução real ao fim da PÓS-FASE 1: backend 989→1242 (0 fail, 6 skip DB-gated que rodam no CI; 1248 total), smoke web 486→514. Flutter/mobile inalterados (Ω4 foi web/backend-only; política dupla). 8 agregados-feature (Ω4-1..8) → blocks_completed 58→66; mvp_demo 98→99 e mvp_vendavel 83→88 movidos por escopo (módulo Financeiro completo). Cada agregado por junta adversarial + pós-análise; relatório em agent-orchestration/omega/RELATORIO-OMEGA4.md. pr: 226; merge_commit/approved_head null na autoria (backfill pós-merge).","D-Ω3F-KPI-RELATORIO (reconciliação 2026-07-17): a rodada Ω3F deferiu a atualização de KPI de todos os seus PRs (#184–#204) para este snapshot único. Contagens de teste vêm de execução real ao fim da Fase 1: backend 989 (0 fail, 6 skip), smoke web 486. Flutter/mobile inalterados (Ω3F foi web/backend-only). mvp_demo/vendavel movidos (+2/+5) por escopo — hub operacional da OS completo.","JUNTA-MAPAS (2026-07-13): PR docs/agentes-only — cria 3 agentes (.claude/agents/planejador-mapas, dev-mapas, avaliador-mapas) + docs/maps/kb-mapas.md + D-JUNTA-MAPAS + ata J-JUNTA-MAPAS. NENHUM codigo de produto/teste tocado: TODAS as metricas de teste carregam o ultimo valor oficial (Ω-INFRA-1: backend 768/768, Flutter 764/764, smoke web 44/44). blocks_completed inalterado (49) — governanca/tooling nao conta como bloco de feature entregue, mesmo criterio de Ω-GOV/Ω-DOCS. mvp_demo/mvp_vendavel inalterados (nenhum escopo de produto movido). Nenhuma chave/billing/SKU do Google ativado.","Ω-GOV (2026-07-13): backend_tests corrigido de 15/15 (so core-saas) para 766/766 — a suite INTEIRA que o gate do CI passou a rodar no Ω-GATE (100 arquivos + Postgres+Redis). Primeira aplicacao da politica KPI-por-PR (D-KPI-PER-PR). Este PR e web/backend/docs-only: metrics de Flutter/mobile e frontend seguem os ultimos valores oficiais (B-124) ate serem re-baseadas em PRs das respectivas trilhas.","frontend_smoke_tests avancou de 33/33 para 44/44 na PR #125 (+10 testes unitarios do dashboard.adapter B-124 e +1 render smoke do dashboard); frontend check e build OK.","blocks_completed segue a regra de contagem de blocos entregues: 48 (ate B-123) + B-124 = 49.","mvp_demo e mvp_vendavel mantidos nos ultimos valores oficiais publicados (96%/78%, tipo estimado); nao houve decisao humana explicita para altera-los no B-124 — a revisao pode ajusta-los. B-123 fechou a fidelidade do fluxo de OS mobile e B-124 fechou o dashboard web enriquecido, mas os percentuais permanecem oficiais ate decisao humana.","flutter_tests e contratos mobile permanecem nos ultimos valores oficiais (B-124, web-only); backend_tests foi ATUALIZADO para 766/766 no Ω-GOV (suite backend inteira do gate do CI apos o Ω-GATE).","Na politica KPI-por-PR (D-KPI-PER-PR), um PR web/backend-only (como este Ω-GOV) atualiza so a raiz Kpis/*; a paridade de version/block com mobile/flutter_app/Kpis/ vale quando o PR toca ambos os conjuntos. Aqui a raiz avanca para Ω-GOV e o mobile segue em B-124 ate um PR que mexa em Flutter/mobile."],"limitations":["S3/presigned real pendente","Persistencia duravel DB/Redis do receipt pendente","Antivirus real pendente","Download protegido final pendente","Retencao definitiva pendente","Settings web sem backend dedicado (lacuna documentada)","Piloto Android real ainda precisa validacao em dispositivo fisico"],"production_readiness":{"veredito":"REPROVADO PARA PRODUÇÃO","fonte_veredito":"Junta J-6R, 5×0 — docs/revisoes/O6R/ATA_J6R.md","data_veredito":"2026-08-12","deploy_bloqueado":true,"p0_total":15,"p0_fechados":4,"p0_abertos":11,"p1_total":15,"p1_fechados":0,"p1_abertos":15,"fechados":[{"id":"Ω6R-SEC-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-TEN-001","por":"B-O6R-01 (PR #357, 0a39824)","em":"2026-08-19"},{"id":"Ω6R-DAT-001","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"},{"id":"Ω6R-DIN-006","por":"B-O6R-05 (PR #353, a8901ff)","em":"2026-08-15"}],"as_of":"2026-09-02","source":"docs/revisoes/O6R/achados.jsonl","aguardando_merge":[{"id":"Ω6R-SEC-003","por":"B-O6R-07a (PR na autoria; nº e hash no backfill pós-merge)","em":"2026-09-02"}],"nota_aguardando":"Conserto escrito e em revisão, ainda NÃO na main. Não conta como corrigido: a junta ainda pode reprovar — e reprovou o ciclo 2 deste bloco. O Ω6R-SEC-002 SAIU desta lista no ciclo 2 do B-O6R-07a: deixou de ser declarado fechado (virou parcialmente_superado, com 9 rotas nomeadas na pendência P-O6R-SUBRECURSO-OBJECT-SCOPE) e não se aguarda merge do que não se declara fechado."},"findings":{"as_of":"2026-09-02","source":"docs/revisoes/O6R/achados.jsonl","itens":[{"id":"Ω6R-DIN-001","severidade":"P0","modulo":"financial-entries / financial-titles","status":"ativo","resumo":"Pagamento de título: o lançamento é gravado antes de aplicar ao título; duas requisições ao mesmo tempo podem pagar duas vezes.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-002","severidade":"P0","modulo":"financial-entries / financial-titles","status":"ativo","resumo":"Estorno lança a contrapartida contábil mas não devolve o valor pago nem o status do título — o título fica pago sem estar.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-003","severidade":"P0","modulo":"cheques / financial-entries","status":"ativo","resumo":"Cheque: estado, lançamento e vínculo são gravados em etapas separadas; falha no meio deixa o cheque inconsistente.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-004","severidade":"P0","modulo":"financial-titles","status":"ativo","resumo":"Dá para reduzir o valor de um título abaixo do que já foi pago, e apagar título já pago.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-005","severidade":"P0","modulo":"checklists / cloud-usage / cloud-cost-allocation","status":"ativo","resumo":"A métrica que gera cobrança é gravada em melhor-esforço: se falhar, o consumo some e nunca é recuperado.","bloco":"B-O6R-06"},{"id":"Ω6R-SEC-001","severidade":"P0","modulo":"core-saas / auth / platform","status":"fechado","resumo":"Quem administra uma organização consegue se promover a administrador da plataforma e passar a ler, alterar e suspender TODAS as outras.","bloco":"B-O6R-01"},{"id":"Ω6R-TEN-001","severidade":"P0","modulo":"auth / core-saas","status":"fechado","resumo":"Duas pessoas com o mesmo e-mail em organizações diferentes: uma assume a conta da outra, sem saber a senha.","bloco":"B-O6R-01"},{"id":"Ω6R-DAT-001","severidade":"P0","modulo":"config / core-saas / runtime","status":"fechado","resumo":"Produção podia subir guardando organizações, usuários e permissões só na memória, perdendo tudo no primeiro reinício.","bloco":"B-O6R-05"},{"id":"Ω6R-SEC-002","severidade":"P0","modulo":"work-orders / approvals / RBAC","status":"parcialmente_superado","resumo":"O técnico de campo podia aprovar a própria ordem de serviço; papel, SoD e escopo nas duas rotas guardadas foram fechados, mas 9 rotas mutantes (anexos, comentários, geocode) seguem alcançáveis sobre OS alheia.","bloco":"B-O6R-07"},{"id":"Ω6R-ARQ-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"A fila de tarefas retira o item antes de garantir que alguém vai processá-lo: se o processo cair, a tarefa some.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-002","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"Cada reinício semeia agendamentos novos sem deduplicar — as tarefas periódicas se multiplicam.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-003","severidade":"P1","modulo":"field-ops-realtime","status":"ativo","resumo":"As atualizações em tempo real vivem na memória de um processo só; com mais de uma máquina, parte dos usuários não recebe.","bloco":"B-O6R-08"},{"id":"Ω6R-ARQ-004","severidade":"P1","modulo":"field-dispatch","status":"ativo","resumo":"Despacho e o evento que o registra são gravados separados: falha no meio deixa despacho sem rastro.","bloco":"B-O6R-09"},{"id":"Ω6R-DIN-006","severidade":"P0","modulo":"jobs / charging / impound / notifications","status":"fechado","resumo":"O executor de tarefas de fundo nunca subia em produção: diárias de pátio, reconciliação de custódia e notificações legais não aconteciam.","bloco":"B-O6R-05"},{"id":"Ω6R-PERF-001","severidade":"P1","modulo":"infra/jobs","status":"ativo","resumo":"O executor inicia uma tarefa sem esperar a anterior e não tem prazo máximo — uma tarefa travada trava a fila.","bloco":"B-O6R-08"},{"id":"Ω6R-PERF-002","severidade":"P1","modulo":"frontend / API client","status":"ativo","resumo":"A tela recarrega sem travar chamadas em andamento e sem tempo limite; conexão ruim empilha requisições.","bloco":"B-O6R-10"},{"id":"Ω6R-PERF-003","severidade":"P1","modulo":"owner-portal / runtime","status":"ativo","resumo":"Processamento de imagem grande roda no mesmo processo do sistema; três simultâneas podem derrubar a resposta.","bloco":"B-O6R-10"},{"id":"Ω6R-QUA-001","severidade":"P1","modulo":"mobile-flutter / expense-management","status":"ativo","resumo":"O aplicativo reenvia despesas sem credencial, num endereço que exige permissão — o reenvio falha calado.","bloco":"B-O6R-03"},{"id":"Ω6R-QUA-002","severidade":"P1","modulo":"mobile-flutter / mobile-inventory / inventory","status":"ativo","resumo":"Estoque no aplicativo enfileira tipos incompatíveis e não tem reenvio — movimentação feita offline pode se perder.","bloco":"B-O6R-04"},{"id":"Ω6R-DIN-007","severidade":"P0","modulo":"cloud-costs","status":"ativo","resumo":"O resumo de custos de nuvem soma apenas as primeiras 10.000 linhas, em silêncio — acima disso o total fica errado.","bloco":"B-O6R-06"},{"id":"Ω6R-QUA-003","severidade":"P1","modulo":"financial-entries / cheques / period-close / expenses","status":"ativo","resumo":"Os testes financeiros usam banco de mentira: atomicidade e concorrência nunca foram exercitadas.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-008","severidade":"P0","modulo":"financial-period-closes / financial writers","status":"ativo","resumo":"O fechamento de período usa trava, mas quem escreve não a respeita: dá para lançar depois do período fechado.","bloco":"B-O6R-02"},{"id":"Ω6R-DIN-009","severidade":"P0","modulo":"expense-management","status":"ativo","resumo":"Sincronização de despesa grava o efeito antes do comprovante, em transações separadas; falha no meio deixa despesa sem comprovante.","bloco":"B-O6R-03"},{"id":"Ω6R-DAT-002","severidade":"P0","modulo":"inventory","status":"ativo","resumo":"Saldo de estoque: duas movimentações simultâneas do mesmo item não se serializam — o saldo pode ficar errado.","bloco":"B-O6R-04"},{"id":"Ω6R-DAT-003","severidade":"P0","modulo":"inventory / cycle-count","status":"ativo","resumo":"Contagem de inventário: cada ajuste do fechamento grava separado, sem travar a sessão — fechamento concorrente corrompe a contagem.","bloco":"B-O6R-04"},{"id":"Ω6R-QUA-004","severidade":"P1","modulo":"mobile-flutter / work-orders","status":"parcialmente_superado","resumo":"O aplicativo lia a resposta da ordem de serviço no formato errado; a linha do tempo remota nunca funcionou.","bloco":"B-O6R-11"},{"id":"Ω6R-QUA-005","severidade":"P1","modulo":"mobile-flutter / prestador","status":"ativo","resumo":"O aplicativo enfileira sem esperar a gravação e reescreve a fila inteira a cada item.","bloco":"B-O6R-11"},{"id":"Ω6R-SEC-003","severidade":"P1","modulo":"auth","status":"fechado","resumo":"Senha errada não trava a conta: o contador sobe, mas nada nunca bloqueia — tentativa infinita.","bloco":"B-O6R-07"},{"id":"Ω6R-SEC-004","severidade":"P1","modulo":"evidence / attachments / mobile","status":"ativo","resumo":"O antivírus de anexo devolve “limpo” por padrão e o tipo do arquivo vem do cliente; anexo malicioso abre no navegador.","bloco":"B-O6R-07"},{"id":"Ω6R-DAT-004","severidade":"P1","modulo":"jurisdiction / charging","status":"ativo","resumo":"Editar o perfil normativo re-tempera custódias em curso, sem versão nem vigência, e a auditoria não registra o que mudou.","bloco":"B-O6R-12"}]},"roadmap":{"as_of":"2026-08-19","source":"docs/revisoes/O6R/PLANO_O6R.md + agent-orchestration/omega/juntas/J-CHK-04C-EMENDA-deliberacao-j6r.md","ordem_vinculante":["B-O6R-05","B-O6R-01","B-O6R-02","B-O6R-07","B-O6R-06"],"blocos":[{"id":"B-O6R-01","titulo":"Identidade e autoridade","achados":["Ω6R-SEC-001","Ω6R-TEN-001"],"dep":[],"estado":"concluido","nota":"Mergeado em 2026-08-19. TRÊS ciclos: 1 reprovado (6 bloqueantes), 2 vetado (batch 33% vermelho na forma do job), 3 aprovado 5×0 sem veto. Dez instâncias de \"o artefato afirma o que a execução não produz\", todas nascidas em correções.","pr":357},{"id":"B-O6R-02","titulo":"Atomicidade do financeiro","achados":["Ω6R-DIN-001","Ω6R-DIN-002","Ω6R-DIN-003","Ω6R-DIN-004","Ω6R-DIN-008","Ω6R-QUA-003"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-03","titulo":"Sincronização de despesas","achados":["Ω6R-DIN-009","Ω6R-QUA-001"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-04","titulo":"Consistência de estoque","achados":["Ω6R-DAT-002","Ω6R-DAT-003","Ω6R-QUA-002"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-05","titulo":"Portões de runtime de produção","achados":["Ω6R-DAT-001","Ω6R-DIN-006"],"dep":[],"estado":"concluido","pr":353,"nota":"Mergeado em 2026-08-15. Junta do PR 3×0, sem veto."},{"id":"B-O6R-06","titulo":"Durabilidade do faturamento","achados":["Ω6R-DIN-005","Ω6R-DIN-007"],"dep":["B-O6R-02","B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-07","titulo":"Autorização e anexos","achados":["Ω6R-SEC-002","Ω6R-SEC-003","Ω6R-SEC-004"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-08","titulo":"Tarefas duráveis e tempo real","achados":["Ω6R-ARQ-001","Ω6R-ARQ-002","Ω6R-ARQ-003","Ω6R-PERF-001"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-09","titulo":"Despacho atômico","achados":["Ω6R-ARQ-004"],"dep":["B-O6R-08"],"estado":"a_fazer"},{"id":"B-O6R-10","titulo":"Proteção de carga no cliente","achados":["Ω6R-PERF-002","Ω6R-PERF-003"],"dep":["B-O6R-05"],"estado":"a_fazer"},{"id":"B-O6R-11","titulo":"Contratos do aplicativo de campo","achados":["Ω6R-QUA-004","Ω6R-QUA-005"],"dep":["B-O6R-01"],"estado":"a_fazer"},{"id":"B-O6R-12","titulo":"Versão do perfil normativo","achados":["Ω6R-DAT-004"],"dep":[],"estado":"a_fazer","nota":"Acrescentado ao plano em 2026-08-16. O achado nasceu depois da junta da auditoria e ficou sem bloco de correção — a lacuna foi encontrada pelo guard de paridade, na primeira execução. Critério de aceite provisório, a ser ratificado pela junta do próprio bloco."}],"trilha_bloqueada":{"titulo":"Trilha de vistorias","itens":[{"id":"CHK-04c-B","titulo":"Aba de aplicabilidade e ajuste no envio"},{"id":"CHK-05a","titulo":"Versão da vistoria no dossiê do veículo"},{"id":"CHK-06","titulo":"Impressão da vistoria"}],"bloqueada_por":["B-O6R-06","B-O6R-07"],"fonte":"A deliberação da junta veda features nos módulos atingidos enquanto houver achado crítico aberto neles."}},"recent":{"as_of":"2026-08-28","source":"git log main + agent-orchestration/omega/juntas/","itens":[{"pr":359,"data":"2026-08-28","tipo":"qualidade","titulo":"O arnes de teste deixa de mentir sobre o proprio numero","resumo":"A suite passou a ter UM mecanismo de escrita de catalogo do Postgres — antes tres arquivos escreviam por fora e 7 de 13 rodadas ficavam vermelhas por disputa, inclusive derrubando quem respeitava o mecanismo. Agora sao 13 de 13, com o mesmo total em todas. O teardown deixou de poder abandonar usuario de banco com permissao de escrita: 10 rodadas completas terminaram com zero residuo, contra dois abandonados antes. E o runner passou a recusar o verde quando um arquivo de teste some sem avisar: em vez de publicar um total menor e plausivel, ele fica vermelho e diz QUAL arquivo sumiu."},{"pr":null,"data":"2026-08-18","tipo":"seguranca","titulo":"Identidade global: o e-mail deixa de decidir quem você é","resumo":"Fecha os dois piores achados da auditoria: administrador de organização não se promove mais a plataforma (allowlist fechada por construção) e a troca de organização passa a exigir VÍNCULO provado por credencial — homônimos deixam de virar a mesma pessoa. Login sem organização refeito (a senha decide), religação e desvínculo em autosserviço com revogação real de sessões, trilha append-only ilegível por organização e a luz login_without_org no readiness. Transações centrais provadas sob role NÃO-superusuário — a única configuração em que o isolamento existe.","fecha":["Ω6R-SEC-001","Ω6R-TEN-001"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":355,"data":"2026-08-16","tipo":"correcao","titulo":"A bateria de testes local passa a ser igual à da integração contínua","resumo":"O arquivo de ambiente do repositório fixava banco real e sequestrava a bateria local: 90 vermelhos falsos só na máquina do dono, e nenhum deles era defeito. O risco maior não era o vermelho — era alguém aprender a ignorá-lo. Agora o executor resolve o modo e o declara em uma linha.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":354,"data":"2026-08-15","tipo":"infraestrutura","titulo":"O ambiente de homologação deixa de dormir","resumo":"Escalar a zero era barato e silenciosamente errado: com a máquina dormindo, as tarefas de fundo não rodam — diárias de pátio, reconciliação de custódia e notificações legais não aconteceriam. O ambiente diria “verde” sem nunca ter executado uma tarefa. Custo autorizado pelo dono.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":353,"data":"2026-08-15","tipo":"correcao_critica","titulo":"Produção não sobe mais sem persistir e sem executor de tarefas","resumo":"Dois dos quinze achados críticos, fechados com portões que reprovam a subida em vez de avisar. Provisionar homologação pela lista antiga teria o boot reprovado por cinco itens que existiam no código e não estavam documentados.","fecha":["Ω6R-DAT-001","Ω6R-DIN-006"],"descobertos":[],"ciclos_de_reprovacao":0},{"pr":352,"data":"2026-08-15","tipo":"feature","titulo":"A ordem de serviço passa a ter um conjunto de vistorias","resumo":"Quatro ciclos de reprovação adversarial antes de passar. O terceiro ciclo inverteu o erro do segundo em vez de corrigir a raiz, e o comentário do código afirmava uma garantia que o código não dava. A quarta versão parou de inferir e passou a perguntar.","fecha":[],"descobertos":["Vistoria pendente não é lida na expedição","Razão de recusa não normalizada na criação","Verde vazio da bateria no Windows"],"ciclos_de_reprovacao":4},{"pr":347,"data":"2026-08-14","tipo":"auditoria","titulo":"Auditoria adversarial total — 30 achados catalogados","resumo":"Auditoria encomendada pelo próprio time, não por incidente. Veredito da junta: reprovado para produção, 5×0. Quinze achados críticos, quinze relevantes, cada um com módulo, evidência e bloco de correção.","fecha":[],"descobertos":["30 achados (15 críticos, 15 relevantes)"],"ciclos_de_reprovacao":0},{"pr":351,"data":"2026-08-12","tipo":"correcao","titulo":"A linha do tempo remota da ordem de serviço nunca funcionou","resumo":"O aplicativo de campo lia a resposta num formato que o servidor nunca enviou. Passava nos testes porque os testes usavam o formato errado dos dois lados. Fechou o componente da linha do tempo; detalhe, status e atribuição do mesmo achado seguem abertos — o achado é PARCIALMENTE superado, não fechado.","fecha":[],"descobertos":[],"ciclos_de_reprovacao":0,"superado_parcialmente":["Ω6R-QUA-004"]}]},"series_breaks":{"as_of":"2026-08-17","source":"Kpis/kpis-history.json — os dois casos estão descritos no campo description do próprio registro","nota":"Pontos em que a RÉGUA mudou: ou a métrica passou a medir outra coisa, ou ficou sem ser relida enquanto o trabalho acontecia. Nos dois casos, ligar os lados com uma linha contínua afirmaria um crescimento de um dia que não houve. Declarado aqui, e não inferido por tamanho do salto, porque salto grande também pode ser trabalho real de verdade.","itens":[{"serie":"backend_tests","data":"2026-07-13","de":15,"para":766,"motivo":"A medida passou a contar a suíte de backend INTEIRA. Antes contava só o núcleo do sistema — os outros 100 arquivos de teste já existiam e não entravam na conta."},{"serie":"frontend_smoke_tests","data":"2026-07-13","de":44,"para":378,"motivo":"O 44 era a contagem completa e real em 05/07 — a suíte do console web tinha 5 arquivos. Entre 05/07 e 13/07 nenhuma entrega releu a métrica: quatro registros repetiram o 44 enquanto a suíte crescia para 62 arquivos. O 378 é a releitura. O salto é trabalho real que a régua só registrou no fim."}]}};

function startFrozen() {
  if (FROZEN && typeof FROZEN === "object") {
    renderAll(FROZEN, "frozen");
    showChartsNote(
      "Painel aberto sem servidor: os gráficos dependem da série real do histórico (kpis-history.json) e não são desenhados aqui — o painel não estima. " +
        "Os demais números vêm de uma cópia congelada em " + fmtDateBR(FROZEN.snapshot_date) + "."
    );
  } else {
    setText("meta-line", "Sem dados: os arquivos de KPI não puderam ser lidos e não há cópia embutida.");
    showChartsNote("Sem fonte de dados, nenhum gráfico é desenhado.");
  }
}

function boot() {
  if (typeof fetch !== "function") {
    startFrozen();
    return;
  }
  fetchJson("./kpis-latest.json")
    .then(function (latest) {
      renderAll(latest, "live");
      return fetchJson("./kpis-history.json")
        .then(function (history) {
          renderChartsFromHistory(history);
          // Os dois arquivos são atualizados no mesmo PR, mas nada obriga o navegador a receber a
          // mesma safra dos dois (cache, arquivo pela metade, alguém editando um só). Se a última
          // data do histórico não alcança o snapshot do cartão, a página tem de DIZER — senão o
          // cartão mostra um número que ponta nenhuma do gráfico sustenta.
          var ultima = null;
          if (Array.isArray(history)) {
            for (var i = history.length - 1; i >= 0; i--) {
              if (history[i] && history[i].snapshot_date) { ultima = String(history[i].snapshot_date); break; }
            }
          }
          if (ultima && latest.snapshot_date && ultima < String(latest.snapshot_date)) {
            showChartsNote(
              "Os cartões acima são do snapshot de " + fmtDateBR(latest.snapshot_date) +
              ", e o histórico dos gráficos vai só até " + fmtDateBR(ultima) +
              " — as duas leituras são de safras diferentes."
            );
          }
        })
        .catch(function () {
          showChartsNote("O histórico (kpis-history.json) não pôde ser lido — os gráficos só são desenhados com a série real; nada é estimado.");
        });
    })
    .catch(function () {
      startFrozen();
    });
}

boot();
