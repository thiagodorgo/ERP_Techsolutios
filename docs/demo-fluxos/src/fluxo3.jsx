/* ============================================================================
   FLUXO 03 — Do resgate à custódia: o pátio.

   O console web deste vídeo é o PRODUTO (espelho de frontend/src). O aparelho é
   recriação — Dart não roda em bundle web —, mas recriação do CÓDIGO REAL do
   app, não do protótipo. Cada tela abaixo foi conferida linha a linha em:
     · mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart
     · mobile/flutter_app/lib/features/work_orders/ui/work_order_execute_screen.dart
     · mobile/flutter_app/lib/features/work_orders/domain/work_order_steps.dart
     · mobile/flutter_app/lib/shared/ui/sync_screen.dart

   O que este vídeo NÃO mostra, porque o produto não faz (fundamentação em
   docs/demo-fluxos/fundamentacao/F3.json):
     · o app de campo NÃO conhece pátio: não há tela, rota nem endpoint móvel de
       pátio, vaga ou custódia — por isso o aparelho só conclui o atendimento
     · não existe vistoria de recepção gravada pelo app (PUT /inspection e
       /inspection/complete não têm cliente em lugar nenhum)
     · o dossiê NUNCA mostra foto de checklist — o elo é um vínculo, não a imagem
     · não há card "Custódia ativa" no painel: o balde Custódia agrega
       ACTIVE_CUSTODY + JUDICIAL_HOLD, e o número que aparece é 33
     · /patios/processos não aceita filtro por link, e a varredura que abre a
       custódia depende de JOBS_WORKER_ENABLED, que vem DESLIGADA
   O vídeo termina no dossiê pela cadeia de custódia — que é o que a
   tela mostra de verdade — e não num álbum de fotos, que não existe.
   ========================================================================== */

import { createRoot } from "react-dom/client";
import {
  Camera, Check, ClipboardList, Clock, ListChecks, MapPin, Phone,
  RefreshCw, User, Wrench,
} from "lucide-react";
import { Filme } from "./player.jsx";
import { conta, jan } from "./engine.jsx";
import { GESTOR, MENU, ORG, SELO, dados } from "./comum.jsx";
import { AppBarra, AppCab, Stepper } from "./kit.jsx";

/* ------------------------------------------------------------------- dados */

const OS = dados.os_ativas.find((o) => o.code === "OS-000015");
const PATIOS = dados.patios;
const NORTE = PATIOS.find((p) => p.name === "Pátio Norte");

const VAGAS = PATIOS.reduce((s, p) => s + p.vagas, 0);        // 100
const OCUPADAS = PATIOS.reduce((s, p) => s + p.ocupadas, 0);  // 53
const PROCESSOS = dados.processos_por_status.reduce((s, p) => s + p.n, 0); // 75
const porStatus = (k) => dados.processos_por_status.find((p) => p.status === k)?.n ?? 0;
const CUSTODIA = porStatus("ACTIVE_CUSTODY") + porStatus("JUDICIAL_HOLD"); // 33

/* Rotas do espelho. Só entram as que têm dado gravado E renderizam cheias:
   /patios/processos e /patios/patios ficam de fora de propósito — a primeira
   caiu num 400 gravado, a segunda não tem a lista de pátios no snapshot. */
const ROTA_OS = "/work-orders";
/* O JSON foi extraído em UTC. Imprimir a string crua faria a MESMA ordem
   aparecer com um horário aqui e outro na fila web do fluxo 1 — medido: 03:10
   contra 00:10. Mesma função do fluxo 1, mesmo motivo. */
function agenda(txt) {
  if (!txt) return "";
  const [dm, hm] = String(txt).split(" ");
  const [d, m] = dm.split("/").map(Number);
  const [h, min] = (hm ?? "00:00").split(":").map(Number);
  const dt = new Date(Date.UTC(new Date(dados.gerado_em).getUTCFullYear(), m - 1, d, h, min));
  const p2 = (x) => String(x).padStart(2, "0");
  return `${p2(dt.getDate())}/${p2(dt.getMonth() + 1)} ${p2(dt.getHours())}:${p2(dt.getMinutes())}`;
}

const ROTA_PAINEL = "/patios/painel";
const ROTA_PATIO = "/patios/patios/23c99fed-2ba1-48b1-92b4-4438e3e05306";
const ROTA_PROCESSO = "/patios/processos/3264086d-3c58-4fb3-9080-2e2961e7cab9";

/* Os dois steppers do app são diferentes e nenhum é invenção:
   o do detalhe é o de STATUS (work_order_detail_screen.dart:336-342);
   o da execução é o do GUINCHO (work_order_steps.dart:32-37). */
const PASSOS_STATUS = ["Agendada", "Em rota", "No local", "Em exec.", "Concluída"];
const PASSOS_GUINCHO = ["Início", "Rota coleta", "Coleta", "Rota entrega", "Entrega", "Conclusão"];

/* --------------------------------------------------------- peças do aparelho */

/** ListTile do Material: título em cima, valor embaixo, ícone à esquerda. */
function Tile({ Icone, titulo, valor, ultimo }) {
  return (
    <div style={{
      display: "flex", gap: 11, alignItems: "flex-start", padding: "10px 12px",
      borderBottom: ultimo ? "none" : "1px solid #f1f5f9",
    }}>
      <Icone size={15} color="#64748b" style={{ flex: "none", marginTop: 2 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{titulo}</div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, lineHeight: 1.35 }}>{valor}</div>
      </div>
    </div>
  );
}

function Rotulo({ children }) {
  return <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0f172a", marginTop: 2 }}>{children}</div>;
}

function CartaoOS({ statusRotulo, statusTom }) {
  return (
    <div className="app-cartao">
      <div style={{ fontSize: 13, fontWeight: 800, color: "#2563eb", lineHeight: 1.3 }}>
        {OS.code} · {OS.title}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        <span className="app-pill app-pill--pendente">Prioridade Alta</span>
        <span className={`app-pill${statusTom ? ` app-pill--${statusTom}` : ""}`}>{statusRotulo}</span>
        <span className="app-pill">Guincho</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 10, fontSize: 12, color: "#475569" }}>
        <Clock size={13} color="#94a3b8" /> {agenda(OS.agendada)}
      </div>
    </div>
  );
}

function CartaoChecklist({ rotulo, sub, tom, botao }) {
  return (
    <div className="app-cartao" style={{ padding: 0 }}>
      <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "11px 12px" }}>
        <ListChecks size={16} color="#64748b" style={{ flex: "none" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700 }}>Checklist do atendimento</div>
          <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2 }}>{sub}</div>
        </div>
        <span className={`app-pill${tom ? ` app-pill--${tom}` : ""}`}>{rotulo}</span>
      </div>
      <div style={{ padding: "0 12px 12px" }}>
        <span className="app-btn-contorno" style={{ width: "100%", justifyContent: "center" }}>
          <ListChecks size={13} /> {botao}
        </span>
      </div>
    </div>
  );
}

/** SyncStatusBanner do app — a faixa âmbar de "tem coisa local esperando". */
function FaixaSync({ texto }) {
  return (
    <div style={{
      background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 11,
      padding: "9px 11px", display: "flex", gap: 8, alignItems: "center", color: "#b45309",
    }}>
      <RefreshCw size={14} style={{ flex: "none" }} />
      <div style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.35 }}>{texto}</div>
    </div>
  );
}

/* ----------------------------------------------------------------- telas */

/**
 * Detalhe da OS — work_order_detail_screen.dart.
 * Cabeçalho "Detalhe da OS" + subtítulo com o rótulo do status, stepper de
 * STATUS, card da OS, card do cliente, card do checklist e barra fixa. Quando o
 * status é final o app não oferece ação nenhuma: sobra só o botão "Mapa".
 */
function AppDetalhe({ fase }) {
  const conf = {
    rota: { rotulo: "Em rota", tom: "pendente", passo: 1, acao: "Cheguei ao local" },
    local: { rotulo: "No local", tom: "pendente", passo: 2, acao: "Iniciar atendimento" },
    concluida: { rotulo: "Concluída", tom: "online", passo: 4, acao: null },
  }[fase];

  return (
    <>
      <AppCab claro voltar titulo="Detalhe da OS" sub={conf.rotulo} />
      <div className="app-corpo" style={{ gap: 9 }}>
        <Stepper passos={PASSOS_STATUS} atual={conf.passo} />
        {fase === "concluida" ? (
          <FaixaSync texto="Esta OS possui alterações locais aguardando sync." />
        ) : null}
        <CartaoOS statusRotulo={conf.rotulo} statusTom={conf.tom} />
        <div className="app-cartao" style={{ padding: 0 }}>
          <Tile Icone={User} titulo="Cliente" valor={OS.customer_name} />
          <Tile Icone={Phone} titulo="Telefone" valor={OS.customer_phone} />
          <Tile Icone={MapPin} ultimo titulo="Endereço de atendimento"
            valor={`${OS.service_address} — ${OS.service_city}/${OS.service_state}`} />
        </div>
        {fase === "concluida" ? null : (
          <CartaoChecklist rotulo="Não iniciado" sub="Vistoria pendente" botao="Abrir checklist" />
        )}
      </div>
      <AppBarra>
        <div className="app-btn app-btn--vazio">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
            <MapPin size={14} /> Mapa
          </span>
        </div>
        {conf.acao ? <div className="app-btn">{conf.acao}</div> : null}
      </AppBarra>
    </>
  );
}

/** Uma evidência da OS — work_order_execute_screen.dart:_EvidenceSection. */
function LinhaEvidencia({ arquivo, tamanho, estado }) {
  const cor = { local: ["#3b82f6", "Salvo no aparelho", ""],
    enviando: ["#8b5cf6", "Enviando", ""],
    guardado: ["#10b981", "Armazenado", "online"] }[estado];
  return (
    <div style={{
      display: "flex", background: "#fff", border: "1px solid #e2e8f0",
      borderRadius: 13, overflow: "hidden",
    }}>
      <div style={{ width: 4, background: cor[0], flex: "none" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", flex: 1, minWidth: 0 }}>
        <span style={{
          width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9",
          display: "grid", placeItems: "center", flex: "none",
        }}>
          <Camera size={15} color="#475569" />
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            fontSize: 12, fontWeight: 700, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{arquivo}</div>
          <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 2 }}>Camera · {tamanho}</div>
        </div>
        <span className={`app-pill${cor[2] ? ` app-pill--${cor[2]}` : ""}`}
          style={estado === "enviando" ? { background: "#ede9fe", color: "#6d28d9" } : null}>
          {cor[1]}
        </span>
      </div>
    </div>
  );
}

/**
 * Atendimento — work_order_execute_screen.dart.
 * É aqui, e só aqui, que aparecem as seis etapas do guincho; e é aqui que a
 * evidência atravessa "Salvo no aparelho" → "Enviando" → "Armazenado".
 */
function AppAtendimento({ t }) {
  const evidencias = conta(t, 22, 26, 0, 2);
  const primeira = t >= 27 ? "guardado" : t >= 25 ? "enviando" : "local";
  const segunda = t >= 27.5 ? "enviando" : "local";

  return (
    <>
      <AppCab claro voltar titulo="Atendimento" sub={`${OS.code} · ${OS.customer_name}`}
        direita={<span className="app-pill app-pill--pendente">Em atendimento</span>} />
      <div className="app-corpo" style={{ gap: 9 }}>
        <div className="app-cartao" style={{ padding: 0 }}>
          <Tile Icone={Wrench} ultimo titulo={`${OS.code} · ${OS.title}`} valor={OS.customer_name} />
        </div>

        <div className="app-cartao" style={{ padding: "4px 4px 6px" }}>
          <Stepper passos={PASSOS_GUINCHO} atual={2} />
        </div>

        <Rotulo>Checklist</Rotulo>
        <CartaoChecklist rotulo="Não iniciado" sub="Vistoria pendente" botao="Abrir checklist" />

        <div style={{ height: 1, background: "#e2e8f0", margin: "2px 0" }} />
        <Rotulo>Evidências</Rotulo>
        {evidencias >= 1 ? (
          <LinhaEvidencia arquivo="evidencia-1755993047812.jpg" tamanho="1.8 MB" estado={primeira} />
        ) : null}
        {evidencias >= 2 ? (
          <LinhaEvidencia arquivo="evidencia-1755993089406.jpg" tamanho="2.1 MB" estado={segunda} />
        ) : null}
        <span className="app-btn-contorno" style={{ width: "100%", justifyContent: "center" }}>
          <Camera size={13} /> Registrar evidência
        </span>

        <div style={{ height: 1, background: "#e2e8f0", margin: "2px 0" }} />
        <Rotulo>Concluir OS</Rotulo>
        <div className="app-btn app-btn--verde" style={{ flex: "none", height: 44, fontSize: 14 }}>
          {t >= 28.4 ? "Concluindo…" : "Concluir OS"}
        </div>
      </div>
    </>
  );
}

/**
 * Sincronização — sync_screen.dart.
 * Os rótulos das ações são os que o app monta a partir do tipo da ação
 * (`work_order.status_update` → "Work Order Status Update"). Feios, e reais.
 */
function AppSincronizacao({ t }) {
  const enviados = conta(t, 35, 39, 0, 3);
  const pendentes = 3 - enviados;
  const itens = [
    ["Work Order Status Update", "22/08 09:41"],
    ["Work Order Evidence Attach", "22/08 09:38"],
    ["Work Order Evidence Attach", "22/08 09:36"],
  ];

  return (
    <>
      <AppCab claro titulo="Sincronização"
        direita={<span className="app-pill app-pill--online">Online</span>} />
      <div className="app-corpo" style={{ gap: 10 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {[["Pendentes", pendentes, "#c2410c"], ["Sincronizados", enviados, "#15803d"],
            ["Erros", 0, "#b91c1c"], ["Conflitos", 0, "#7f1d1d"]].map(([r, v, c]) => (
            <div key={r} className="app-cartao" style={{ flex: 1, padding: "9px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{r}</div>
            </div>
          ))}
        </div>

        <div className="app-btn" style={{ flex: "none", height: 44, fontSize: 14 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            <RefreshCw size={15} />
            {pendentes > 0 ? "Sincronizando..." : "Sincronizar agora"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <ClipboardList size={15} color="#64748b" />
          <span style={{ fontSize: 12.5, fontWeight: 700 }}>Ordens de Serviço</span>
          {pendentes > 0 ? (
            <span className="app-pill app-pill--pendente" style={{ marginLeft: "auto" }}>
              {pendentes} pendente(s)
            </span>
          ) : null}
        </div>

        {itens.map(([nome, quando], i) => (
          <div key={`${nome}-${quando}`} className="app-cartao"
            style={{ padding: "8px 11px", display: "flex", alignItems: "center", gap: 9 }}>
            {i < enviados
              ? <Check size={16} color="#059669" strokeWidth={3} />
              : <Clock size={16} color="#94a3b8" />}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontSize: 12, fontWeight: 600, overflow: "hidden",
                textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{nome}</div>
              <div style={{ fontSize: 10.5, color: "#64748b", marginTop: 1 }}>{quando}</div>
            </div>
            <span className={i < enviados ? "app-pill app-pill--online" : "app-pill app-pill--pendente"}>
              {i < enviados ? "Sincronizado" : "Pendente"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}

function TelaFone({ t }) {
  if (t < 14) return <AppDetalhe fase="rota" />;
  if (t < 21) return <AppDetalhe fase="local" />;
  if (t < 29) return <AppAtendimento t={t} />;
  if (t < 34) return <AppDetalhe fase="concluida" />;
  return <AppSincronizacao t={t} />;
}

/* ---------------------------------------------------------------- ROTEIRO */

const fluxo = {
  num: 3,
  cor: "#f59e0b",
  titulo: "Do resgate à custódia — o pátio",
  org: ORG,
  selo: SELO,
  usuario: GESTOR,
  menu: MENU,
  duracao: 96,

  rota: (t) => (t < 40 ? ROTA_OS : t < 65 ? ROTA_PAINEL : t < 73 ? ROTA_PATIO : ROTA_PROCESSO),

  Telefone: TelaFone,

  abertura: {
    ate: 7,
    eyebrow: "FLUXO 03 · CAMPO → CUSTÓDIA → PÁTIO",
    titulo: "Recolher é fácil. Responder pelo veículo por meses é o produto.",
    texto: "Um guincho por determinação de autoridade não acaba na entrega: começa uma guarda com endereço, vaga, prazo correndo e diária. Este vídeo segue esse caminho — do celular do guincheiro até o dossiê do veículo no pátio.",
  },
  fecho: {
    de: 90,
    eyebrow: "DO RESGATE À CUSTÓDIA",
    titulo: "Cem vagas, setenta e cinco processos, trinta e três veículos sob guarda.",
    texto: "O console à esquerda deste vídeo é o produto: o mesmo código que roda em operação, com os dados gravados do banco. E a custódia não é uma lista de campos — é uma cadeia encadeada por hash, que o próprio sistema recomputa para dizer se ela está íntegra.",
    numeros: [
      { valor: String(PATIOS.length), rotulo: "pátios de guarda", cor: "#f59e0b" },
      { valor: String(VAGAS), rotulo: "vagas cadastradas", cor: "#3b82f6" },
      { valor: String(PROCESSOS), rotulo: "processos de custódia", cor: "#8b5cf6" },
      { valor: String(CUSTODIA), rotulo: "veículos sob guarda", cor: "#10b981" },
    ],
  },

  capitulos: [
    { t: 0, nome: "Abertura" },
    { t: 7, nome: "A ordem no campo" },
    { t: 21, nome: "O atendimento" },
    { t: 29, nome: "A conclusão" },
    { t: 34, nome: "A travessia" },
    { t: 40, nome: "O painel dos pátios" },
    { t: 53, nome: "Ocupação" },
    { t: 59, nome: "As fases" },
    { t: 65, nome: "O Pátio Norte" },
    { t: 73, nome: "O dossiê do veículo" },
    { t: 90, nome: "Fecho" },
  ],

  feixes: [
    { t0: 34, t1: 40, dir: "mobile-web", etiqueta: "POST /mobile/sync/work-order-actions" },
  ],

  beats: [
    { t: 0, superficie: "titulo", narracao: "", tec: "" },
    {
      t: 7, superficie: "mobile",
      narracao: "Uma remoção do DETRAN chega ao guincheiro como outra ordem qualquer: cliente, endereço e o passo em que ele está.",
      tec: `GET /api/v1/work-orders · ${OS.code} · prioridade Alta · serviço Guincho`,
    },
    {
      t: 14, superficie: "mobile",
      narracao: "Ele confirma a chegada. O aplicativo registra um endereço de atendimento: o app de campo não conhece pátio nem vaga.",
      tec: "work_order_detail_screen.dart · nenhuma rota do app de campo é de pátio ou vaga",
    },
    {
      t: 21, superficie: "mobile",
      narracao: "No atendimento, o guincho tem seis etapas próprias. A evidência fica salva no aparelho, sobe, e só então vira armazenada.",
      tec: "work_order_steps.dart · 6 passos · POST /mobile/evidence-uploads · blob preservado até status=stored",
    },
    {
      t: 29, superficie: "mobile",
      narracao: "Ordem concluída. É este ato — não a vistoria, não a chegada — que pode abrir um processo de custódia na retaguarda.",
      tec: "work_orders.status = 'completed' · alterações locais aguardando sincronização",
    },
    {
      t: 34, superficie: "ambos",
      narracao: "A fila local sobe quando a rede volta. Enviar duas vezes não duplica: a chave é organização, usuário e identificador da ação.",
      tec: "POST /api/v1/mobile/sync/work-order-actions",
    },
    {
      t: 40, superficie: "web",
      narracao: "Na retaguarda o processo nasce da ordem concluída — com a hora de entrada carimbada na conclusão, não em quem digitou.",
      tec: "IN_REMOVAL → RECEPTION · entered_at = OS.completed_at · exige custody_profile_id e JOBS_WORKER_ENABLED (padrão: desligada)",
    },
    {
      t: 47, superficie: "web",
      narracao: `O painel dos pátios: ${VAGAS} vagas, ${OCUPADAS} ocupadas, ${PROCESSOS} processos de custódia e ${CUSTODIA} veículos sob guarda.`,
      tec: "GET /api/v1/patios/dashboard/summary · permissão impound:read",
    },
    {
      t: 53, superficie: "web",
      narracao: `A cor carrega informação. O Pátio Norte está com ${NORTE.ocupadas} das ${NORTE.vagas} vagas ocupadas — faixa apertada. Os outros três têm folga.`,
      tec: "yard_spots.status · folgada até 59% · apertada de 60% a 85% · lotada acima de 85%",
    },
    {
      t: 59, superficie: "web",
      narracao: "Quatorze situações do rito viram cinco fases. E onde não há dado o painel diz que não há: arrecadação de leilão em zero.",
      tec: `ACTIVE_CUSTODY + JUDICIAL_HOLD → Custódia = ${CUSTODIA} · auctionRevenue 0,00 · releaseQueueDepth 0`,
    },
    {
      t: 65, superficie: "web",
      narracao: "No Pátio Norte: quarenta vagas, quatro livres, trinta e quatro ocupadas, duas bloqueadas. A grade é da área — aqui, o Setor A.",
      tec: "GET /api/v1/yards/:yardId/occupancy · a grade é POR ÁREA",
    },
    {
      t: 73, superficie: "web",
      narracao: "Cada vaga ocupada abre o dossiê de quem está nela: placa, marca, órgão solicitante, base legal e a hora de entrada no pátio.",
      tec: "GET /api/v1/impound-processes/:id · vaga A-009 · Art. 271 do CTB",
    },
    {
      t: 82, superficie: "web",
      narracao: "E cada passo fica encadeado: o conjunto fotográfico carrega o hash do evento anterior. Adulterar um quebra a cadeia inteira.",
      tec: "GET /impound-processes/:id/verify · o selo recomputa a cadeia de hash (I2), em vez de pedir confiança",
    },
    { t: 90, superficie: "titulo", narracao: "", tec: "" },
  ],
};

createRoot(document.getElementById("raiz")).render(<Filme fluxo={fluxo} />);
