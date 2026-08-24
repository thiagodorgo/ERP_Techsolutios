/* ============================================================================
   FLUXO 01 — Do chamado à rua: a operação despacha, o campo executa.

   O console web deste vídeo é o PRODUTO (espelho de frontend/src, com o snapshot
   gravado do banco no lugar da rede). O aparelho é recriação — Dart não roda em
   bundle web —, mas recriação do CÓDIGO REAL do app. Cada rótulo, cada estado e
   cada botão abaixo foi conferido em:
     · mobile/flutter_app/lib/features/work_orders/ui/work_order_list_screen.dart
     · mobile/flutter_app/lib/features/work_orders/ui/work_order_detail_screen.dart
     · mobile/flutter_app/lib/shared/ui/sync_screen.dart
     · mobile/flutter_app/lib/shared/ui/mobile_kit.dart (MobileOsCard, MobilePill)
     · mobile/flutter_app/lib/features/work_orders/domain/work_order_models.dart

   O que este vídeo NÃO mostra, porque o produto não faz (fundamentação F1.json,
   28 passos inexistentes conferidos contra o código):

     · ninguém escolhe o número da OS — o servidor gera em sequência
       (formatWorkOrderCode), então o vídeo NÃO encena "criar a OS-000017"
     · não há tela web que ATRIBUA técnico a uma ordem: o POST /work-orders/:id/
       assign existe no backend e nenhuma tela do frontend o chama. O vídeo diz
       isso em voz alta no capítulo do despacho, em vez de fingir o contrário
     · não há seletor de técnico por nome: o formulário de despacho pede
       identificadores digitados. Por isso o vídeo não abre o formulário
     · não há empurrão do servidor para o aparelho — sem websocket, sem SSE, sem
       push. O aparelho PUXA. O feixe da travessia é rotulado como pull
     · /dispatch/console é tela de dado literal, com o nome de outra empresa —
       fica fora
     · a OS-000017 já está em `on_route` no banco. Filmar a transição nela seria
       encenar algo que já aconteceu; quem muda de estado no aparelho é a
       OS-000014, que está `assigned` (= "Despachada" no vocabulário do app)
     · a coluna SITUAÇÃO da web não "vira Em rota ao vivo": o console relê a cada
       30 s (useAutoRefresh) e o selo AO VIVO é rótulo fixo, não stream

   Uma omissão deliberada, e o motivo: o snapshot aprovado (usuarios_demo) não
   traz NENHUM usuário de campo. O app escreve, nessas linhas, o começo do e-mail
   do técnico — e inventar um nome seria exatamente o defeito que este projeto
   mais combate. Então a linha de identidade mostra o papel e a organização, que
   são reais, e o cartão do responsável fica no fallback do próprio código
   ("Você"). A legenda técnica do beat diz isso ao espectador.
   ========================================================================== */

import { createRoot } from "react-dom/client";
import {
  ArrowLeft, Building2, Check, ChevronDown, Clock, CloudUpload, HardHat,
  Map, MapPin, Navigation, Phone, RefreshCw, Search, ShieldCheck, User, Wrench,
} from "lucide-react";
import { Filme } from "./player.jsx";
import { conta, jan } from "./engine.jsx";
import { GESTOR, MENU, ORG, SELO, dados } from "./comum.jsx";
import { AppBarra, AppCab, AppNav } from "./kit.jsx";

/* ---------------------------------------------------- números, todos do banco */

const POR_STATUS = Object.fromEntries(dados.os_por_status.map((s) => [s.status, s.n]));
const n = (k) => POR_STATUS[k] || 0;

const TOTAL_OS = dados.os_por_status.reduce((s, x) => s + x.n, 0);
const CONCLUIDAS = n("completed");
/** O painel soma open+assigned+accepted; a lista soma TODAS as não-finais.
    Mesmo rótulo, dois recortes — o vídeo diz isso em vez de esconder. */
const ABERTAS_PAINEL = n("open") + n("assigned") + n("accepted");
const NAO_FINAIS = TOTAL_OS - CONCLUIDAS - n("cancelled") - n("rejected");
const EM_CAMPO = n("on_route") + n("on_site") + n("in_progress") + n("paused");

/** "22/08 21:10" + o ano da extração → Date. Serve só para contar agenda vencida. */
const REF = new Date(dados.gerado_em);
function quando(txt) {
  const [dia, hora] = txt.split(" ");
  const [d, m] = dia.split("/").map(Number);
  const [hh, mm] = hora.split(":").map(Number);
  return new Date(REF.getFullYear(), m - 1, d, hh, mm);
}
const ATRASADAS = dados.os_ativas.filter((o) => quando(o.agendada) < REF).length;

/** A ordem que o campo executa: é a única do snapshot que ainda não saiu. */
const OS = dados.os_ativas.find((o) => o.status === "assigned");

const ROTA_PAINEL = "/dashboard";
const ROTA_FILA = "/work-orders";
const ROTA_ORDEM = "/work-orders/3d748a21-63c9-4fcc-9836-e53d15ddb8bf";
const ROTA_DESPACHOS = "/operations/dispatches";

/* ------------------------------------- vocabulário do app (não o do backend) */

/* work_order_remote_api.dart:260-270 traduz o vocabulário do servidor; os
   rótulos e os tons saem de work_order_models.dart:31-111. */
const STATUS_APP = {
  open: ["Agendada", "info"],
  assigned: ["Despachada", "info"],
  accepted: ["Despachada", "info"],
  on_route: ["Em rota", "warning"],
  on_site: ["No local", "warning"],
  in_progress: ["Em atendimento", "warning"],
  completed: ["Concluída", "done"],
};
const PRIO_APP = {
  low: ["Baixa", "info"],
  medium: ["Normal", "info"],
  high: ["Alta", "warning"],
  urgent: ["Crítica", "danger"],
};

/* MobilePill.colorsFor + ErpMobileTheme — os pares exatos do app. */
const TONS = {
  info: ["#EFF6FF", "#2563EB"],
  warning: ["#FFFBEB", "#D97706"],
  done: ["#ECFDF5", "#059669"],
  danger: ["#FEF2F2", "#DC2626"],
  neutro: ["#F1F5F9", "#475569"],
};
const ACENTO = { info: "#2563EB", warning: "#D97706", danger: "#DC2626", done: "#059669" };

function Pill({ tom = "neutro", children }) {
  const [bg, fg] = TONS[tom] || TONS.neutro;
  return <span className="app-pill" style={{ background: bg, color: fg }}>{children}</span>;
}

/* ------------------------------------------------------- peças do aparelho */

/** MobileOsCard — barra de acento na cor da prioridade + duas linhas de pills. */
function CartaoOS({ os, aceso }) {
  const [rotStatus, tomStatus] = STATUS_APP[os.status] || ["Agendada", "info"];
  const [rotPrio, tomPrio] = PRIO_APP[os.priority] || ["Normal", "info"];
  return (
    <div className="app-cartao" style={{
      padding: 0, display: "flex", overflow: "hidden", marginBottom: 0,
      borderColor: aceso ? "#2563eb" : "#e2e8f0",
      boxShadow: aceso ? "0 0 0 3px rgba(37,99,235,.13)" : "none",
    }}>
      <i style={{ width: 4, background: ACENTO[tomPrio], flex: "none" }} />
      <div style={{ padding: "10px 12px", minWidth: 0, flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, color: "#94a3b8" }}>{os.code}</span>
          <Pill tom={tomPrio}>{rotPrio}</Pill>
          <span style={{ flex: 1 }} />
          <Pill tom={tomStatus}>{rotStatus}</Pill>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 800, marginTop: 5, lineHeight: 1.25 }}>{os.title}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 2 }}>{os.customer_name}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "#94a3b8", fontSize: 10.5 }}>
          <MapPin size={11} style={{ flex: "none" }} />
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{os.service_address}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 4, color: "#94a3b8", fontSize: 10.5 }}>
          <Clock size={11} style={{ flex: "none" }} />
          <span>{os.agendada}</span>
          <span style={{ flex: 1 }} />
          <Pill tom="info">Guincho</Pill>
        </div>
      </div>
    </div>
  );
}

/** Chips de estado do topo da lista — ativo em azul sólido (_FilterChip). */
function ChipsFiltro() {
  return (
    <div style={{ display: "flex", gap: 8, padding: "9px 15px 2px" }}>
      {["Todas", "Agendadas", "Em campo", "Concluídas"].map((g, i) => (
        <span key={g} style={{
          fontSize: 10.5, fontWeight: 700, padding: "5px 11px", borderRadius: 999,
          background: i === 0 ? "#2563eb" : "#fff",
          color: i === 0 ? "#fff" : "#64748b",
          border: `1px solid ${i === 0 ? "#2563eb" : "#e2e8f0"}`,
          whiteSpace: "nowrap",
        }}>{g}</span>
      ))}
    </div>
  );
}

function BuscaEPrioridade() {
  return (
    <>
      <div style={{ padding: "8px 15px 4px" }}>
        <div className="app-input" style={{ marginTop: 0, borderRadius: 12, color: "#94a3b8", fontWeight: 400 }}>
          <Search size={15} /> Buscar OS, cliente ou endereço...
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "2px 15px 6px", fontSize: 11, color: "#64748b", fontWeight: 600 }}>
        Prioridade:
        <span style={{ color: "#0f172a", fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 3 }}>
          Todas <ChevronDown size={12} />
        </span>
      </div>
    </>
  );
}

/** A lista antes do aparelho puxar: o app não tem o que mostrar, e diz isso. */
function AppFilaVazia() {
  return (
    <>
      <AppCab claro titulo="Ordens de Serviço" />
      <ChipsFiltro />
      <BuscaEPrioridade />
      <div className="app-corpo app-corpo--liso" style={{ justifyContent: "center", alignItems: "center", gap: 12 }}>
        <Wrench size={34} color="#2563eb" />
        <div style={{ textAlign: "center", padding: "0 26px" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Nenhuma OS encontrada</div>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 7, lineHeight: 1.5 }}>
            Você ainda não possui ordens atribuídas.
          </div>
        </div>
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

/** O aparelho puxando: LinearProgressIndicator logo abaixo do cabeçalho. */
function AppFilaCarregando({ t }) {
  const p = jan(t, 53, 61);
  return (
    <>
      <AppCab claro titulo="Ordens de Serviço" />
      <div className="app-progresso">
        <div className="app-progresso-barra" style={{ width: `${p * 100}%` }} />
      </div>
      <ChipsFiltro />
      <BuscaEPrioridade />
      <div className="app-corpo app-corpo--liso" style={{ justifyContent: "center", alignItems: "center", gap: 12 }}>
        <CloudUpload size={30} color="#cbd5e1" style={{ transform: "rotate(180deg)" }} />
        <div style={{ fontSize: 12, color: "#94a3b8" }}>Carregando ordens…</div>
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

function AppFila() {
  return (
    <>
      <AppCab claro titulo="Ordens de Serviço" />
      <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", padding: "5px 15px", fontSize: 10.5, color: "#64748b" }}>
        <RefreshCw size={12} color="#059669" /> Atualizado as 09:41
      </div>
      <ChipsFiltro />
      <BuscaEPrioridade />
      <div className="app-corpo app-corpo--liso" style={{ gap: 10, paddingTop: 6 }}>
        {dados.os_ativas.map((o) => (
          <CartaoOS key={o.code} os={o} aceso={o.code === OS.code} />
        ))}
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

/* ------------------------------------------------------- detalhe da ordem */

/** _WorkOrderStepper — cinco passos, os rótulos verbatim do código. */
const PASSOS = ["Agendada", "Em rota", "No local", "Em exec.", "Concluída"];

function StepperOS({ atual }) {
  return (
    <div className="app-cartao" style={{ padding: "12px 8px", display: "flex", alignItems: "flex-start" }}>
      {PASSOS.map((p, i) => (
        <div key={p} style={{ display: "contents" }}>
          <div style={{ flex: 1, display: "grid", placeItems: "center", gap: 4 }}>
            <div style={{
              width: 26, height: 26, borderRadius: "50%", display: "grid", placeItems: "center",
              background: i < atual ? "#2563eb" : i === atual ? "#EFF6FF" : "#F1F5F9",
              transition: "background 420ms ease",
            }}>
              {i < atual
                ? <Check size={13} strokeWidth={3.2} color="#fff" />
                : <i style={{
                    width: 9, height: 9, borderRadius: "50%",
                    background: i === atual ? "#2563eb" : "#94a3b8", display: "block",
                  }} />}
            </div>
            <div style={{
              fontSize: 8.5, textAlign: "center", lineHeight: 1.15,
              color: i <= atual ? "#2563eb" : "#94a3b8",
              fontWeight: i === atual ? 800 : 600,
            }}>{p}</div>
          </div>
          {i < PASSOS.length - 1 ? (
            <i style={{
              width: 11, height: 2, marginTop: 12, flex: "none",
              background: i < atual ? "#2563eb" : "#e2e8f0",
            }} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** ListTile do Material, como o app monta os cartões de dado. */
function Ficha({ Icone, titulo, sub, direita, ultima }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12, padding: "9px 13px",
      borderBottom: ultima ? "none" : "1px solid #f1f5f9",
    }}>
      <Icone size={16} color="#64748b" style={{ flex: "none" }} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0f172a" }}>{titulo}</div>
        <div style={{ fontSize: 11, color: "#64748b", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sub}</div>
      </div>
      {direita}
    </div>
  );
}

function AppDetalhe({ t }) {
  const saiu = t >= 77;
  const [rotStatus, tomStatus] = STATUS_APP[saiu ? "on_route" : OS.status];
  const [rotPrio, tomPrio] = PRIO_APP[OS.priority];

  return (
    <>
      <AppCab claro voltar titulo="Detalhe da OS" sub={rotStatus} />
      <div className="app-corpo" style={{ gap: 8, paddingTop: 11 }}>
        <div className="app-cartao" style={{ padding: 0 }}>
          <Ficha Icone={Building2} titulo={ORG} sub="Técnico de Campo"
            direita={<ShieldCheck size={15} color="#94a3b8" />} ultima />
        </div>

        <StepperOS atual={saiu ? 1 : 0} />

        {saiu ? (
          <div style={{
            border: "1px solid rgba(217,119,6,.35)", background: "rgba(217,119,6,.12)",
            borderRadius: 8, padding: "9px 11px", display: "flex", gap: 8, alignItems: "center",
            color: "#b45309", fontSize: 11.5, fontWeight: 600, lineHeight: 1.35,
          }}>
            <RefreshCw size={15} style={{ flex: "none" }} />
            Esta OS possui alterações locais aguardando sync.
          </div>
        ) : null}

        <div className="app-cartao" style={{ padding: 13 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#2563eb", lineHeight: 1.3 }}>
            {OS.code} · {OS.title}
          </div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 8 }}>
            <Pill tom={tomPrio}>Prioridade {rotPrio}</Pill>
            <Pill tom={tomStatus}>{rotStatus}</Pill>
            <Pill tom="info">Guincho</Pill>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 9, color: "#64748b", fontSize: 11.5 }}>
            <Clock size={14} color="#94a3b8" /> {OS.agendada}
          </div>
        </div>

        <div className="app-cartao" style={{ padding: 0 }}>
          <Ficha Icone={User} titulo="Cliente" sub={OS.customer_name} />
          <Ficha Icone={Phone} titulo="Telefone" sub={OS.customer_phone} />
          <Ficha Icone={MapPin} titulo="Endereço de atendimento" sub={OS.service_address} ultima />
        </div>

        <div className="app-cartao" style={{ padding: 0 }}>
          <Ficha Icone={HardHat} titulo="Técnico responsável" sub="Você"
            direita={<Pill tom="done">Você</Pill>} ultima />
        </div>
      </div>

      <AppBarra>
        <div className="app-btn app-btn--vazio">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Map size={15} /> Mapa</span>
        </div>
        <div className="app-btn">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
            {saiu ? <><MapPin size={16} /> Cheguei ao local</> : <><Navigation size={16} /> Iniciar rota</>}
          </span>
        </div>
      </AppBarra>
    </>
  );
}

/* ------------------------------------------------------------ sincronização */

function AppSync({ t }) {
  const subindo = t >= 88 && t < 92;
  const enviados = conta(t, 88, 92, 0, 1);
  const pendentes = 1 - enviados;

  const kpis = [
    ["Pendentes", pendentes, "#c2410c"],
    ["Sincronizados", enviados, "#15803d"],
    ["Erros", 0, "#b91c1c"],
    ["Conflitos", 0, "#7f1d1d"],
  ];

  return (
    <>
      <AppCab claro titulo="Sincronização" direita={<Pill tom="done">Online</Pill>} />
      <div className="app-corpo" style={{ gap: 11 }}>
        <div style={{ display: "flex", gap: 7 }}>
          {kpis.map(([r, v, c]) => (
            <div key={r} className="app-cartao" style={{ flex: 1, padding: "9px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{r}</div>
            </div>
          ))}
        </div>

        <div className="app-cartao" style={{ padding: 0 }}>
          <Ficha Icone={RefreshCw} titulo={subindo ? "Sincronizando..." : "Auto sync"}
            sub={enviados ? "Último sync: 24/08 09:41" : "Aguardando reconexão para sincronizar."}
            direita={<Check size={16} color={enviados ? "#16a34a" : "#cbd5e1"} strokeWidth={3} />} ultima />
        </div>

        <div className="app-btn" style={{ height: 44, borderRadius: 10, fontSize: 13.5 }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <RefreshCw size={15} /> {subindo ? "Sincronizando..." : "Sincronizar agora"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
          <HardHat size={14} color="#64748b" />
          <span style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>Ordens de Serviço</span>
          <span style={{ flex: 1 }} />
          {pendentes ? <Pill tom="warning">1 pendente</Pill> : null}
        </div>

        <div className="app-cartao" style={{ padding: 0 }}>
          <Ficha Icone={Clock} titulo="Work Order Status Change" sub={`${OS.code} · 24/08 09:41`}
            direita={enviados
              ? <Pill tom="done">Sincronizado</Pill>
              : <Pill tom="warning">{subindo ? "Sincronizando" : "Pendente"}</Pill>} ultima />
        </div>
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

function TelaFone({ t }) {
  if (t < 53) return <AppFilaVazia />;
  if (t < 61) return <AppFilaCarregando t={t} />;
  if (t < 69) return <AppFila />;
  if (t < 84) return <AppDetalhe t={t} />;
  return <AppSync t={t} />;
}

/* ---------------------------------------------------------------- ROTEIRO */

const fluxo = {
  num: 1,
  cor: "#3b82f6",
  titulo: "Do chamado à rua — a operação despacha, o campo executa",
  org: ORG,
  selo: SELO,
  usuario: GESTOR,
  menu: MENU,
  duracao: 100,

  rota: (t) =>
    t < 20 ? ROTA_PAINEL
      : t < 30 ? ROTA_FILA
        : t < 40 ? ROTA_ORDEM
          : t < 53 ? ROTA_DESPACHOS
            : ROTA_FILA,

  Telefone: TelaFone,

  abertura: {
    ate: 6,
    eyebrow: "FLUXO 01 · CONSOLE → CAMPO → CONSOLE",
    titulo: "Uma ordem sai do escritório, chega à rua, e o estado volta sozinho",
    texto: "O console à esquerda deste vídeo não é um desenho do produto: é o produto, montado do mesmo código que roda em operação, com os dados gravados do banco. À direita, o aplicativo do técnico, recriado do código do app de campo.",
  },

  fecho: {
    de: 94,
    eyebrow: "O CAMINHO INTEIRO",
    titulo: "Painel · Fila · Ordem · Despacho · Campo · Fila de sincronização",
    texto: "Um registro só, atravessando escritório e rua, sem ninguém redigitar nada. E o que o produto ainda não faz está dito no próprio vídeo, no minuto do despacho — não escondido.",
    numeros: [
      { valor: String(TOTAL_OS), rotulo: "ordens no banco", cor: "#3b82f6" },
      { valor: String(EM_CAMPO), rotulo: "em campo agora", cor: "#f59e0b" },
      { valor: String(CONCLUIDAS), rotulo: "concluídas", cor: "#10b981" },
      { valor: String(dados.dossie.runs), rotulo: "vistorias executadas", cor: "#8b5cf6" },
    ],
  },

  capitulos: [
    { t: 0, nome: "Abertura" },
    { t: 6, nome: "O painel" },
    { t: 20, nome: "A fila" },
    { t: 30, nome: "A ordem" },
    { t: 40, nome: "O despacho" },
    { t: 53, nome: "A travessia" },
    { t: 61, nome: "O campo abre" },
    { t: 69, nome: "A ordem no campo" },
    { t: 77, nome: "Um toque" },
    { t: 84, nome: "A fila local" },
    { t: 90, nome: "A volta" },
    { t: 94, nome: "Fecho" },
  ],

  feixes: [
    { t0: 53, t1: 61, dir: "web-mobile", etiqueta: "GET /api/v1/work-orders — o aparelho puxa" },
    { t0: 90, t1: 94, dir: "mobile-web", etiqueta: "POST /api/v1/mobile/sync/work-order-actions" },
  ],

  beats: [
    { t: 0, superficie: "titulo", narracao: "", tec: "" },
    {
      t: 6, superficie: "web",
      narracao: `O painel abre com o estado real da operação: ${TOTAL_OS} ordens no total, ${EM_CAMPO} equipes em campo agora, ${CONCLUIDAS} já concluídas.`,
      tec: `GET /api/v1/dashboard/summary · byStatus{open ${n("open")} · assigned ${n("assigned")} · on_route ${n("on_route")} · on_site ${n("on_site")} · in_progress ${n("in_progress")} · completed ${CONCLUIDAS}}`,
    },
    {
      t: 13, superficie: "web",
      narracao: `E abre também com o que dói: ${ATRASADAS} agendas vencidas, em vermelho, com o alerta no topo da tela.`,
      tec: "overdue = scheduled_for < agora E status não terminal · o alerta é do produto, não do vídeo",
    },
    {
      t: 20, superficie: "web",
      narracao: `A fila é a mesma que a operação usa todo dia. Aqui, "abertas" conta tudo que ainda não fechou: ${NAO_FINAIS}. No painel eram ${ABERTAS_PAINEL} — dois recortes do mesmo banco, e o vídeo prefere explicar a esconder.`,
      tec: `lista: abertas = não-finais (${NAO_FINAIS}) · painel: open+assigned+accepted (${ABERTAS_PAINEL}) · ${TOTAL_OS} ordens no contador`,
    },
    {
      t: 30, superficie: "web",
      narracao: "Colisão na BR-277, quilômetro 82, sentido litoral. Cliente Seguradora Horizonte, prioridade urgente — com nove abas de contexto na mesma ordem.",
      tec: "GET /api/v1/work-orders/:id · Informações gerais · Financeiro · Orçamento · Comentários · Arquivos · Mobile · Quilometragem · Mapa · Logs",
    },
    {
      t: 40, superficie: "web",
      narracao: "O envio para o campo é um registro próprio. Ao criar, o servidor congela o formulário de vistoria vigente e provisiona a execução: o técnico recebe o modelo daquele instante, não o de amanhã.",
      tec: "POST /api/v1/operations/dispatches · freeze → provision → create · fail-open auditado na linha do tempo",
    },
    {
      t: 47, superficie: "web",
      narracao: "E uma honestidade, porque investidor merece o mapa inteiro: criar o despacho amarra a ordem ao operador, mas ainda não carimba o técnico na própria ordem. Essa ponta está aberta.",
      tec: "POST /work-orders/:id/assign existe no servidor · nenhuma tela do frontend o chama — a coluna TÉCNICO ainda mostra o botão Atribuir",
    },
    {
      t: 53, superficie: "ambos",
      narracao: "Não existe empurrão. Quando o técnico abre o aplicativo, é o aparelho que vai buscar a fila no servidor.",
      tec: "GET /api/v1/work-orders · sem websocket, sem SSE, sem push no app · build de campo com ERP_AUTH_MODE=remote",
    },
    {
      t: 61, superficie: "mobile",
      narracao: "A fila chega ao campo com o essencial na primeira dobra: código, prioridade, situação, cliente, endereço e horário.",
      tec: "work_order_list_screen.dart · estados: Todas · Agendadas · Em campo · Concluídas · o recorte é por organização",
    },
    {
      t: 69, superficie: "mobile",
      narracao: "O transporte de maquinário está despachado e ainda não saiu. O stepper mostra a linha inteira do atendimento e onde essa ordem parou.",
      tec: "assigned no servidor → \"Despachada\" no aparelho · a identidade do técnico não está no recorte aprovado do banco e fica fora do quadro",
    },
    {
      t: 77, superficie: "mobile",
      narracao: "Um toque, e a ordem muda de estado. A escrita é local primeiro: sem sinal, nada se perde.",
      tec: "repo.updateStatus → banco local + fila de sync, zero HTTP · banner: \"Esta OS possui alterações locais aguardando sync.\"",
    },
    {
      t: 84, superficie: "mobile",
      narracao: "A ação fica na fila do aparelho e sobe quando a rede volta — ou quando o técnico manda subir.",
      tec: "idempotência = organização + usuário + client_action_id",
    },
    {
      t: 90, superficie: "ambos",
      narracao: "O servidor responde item a item: aceito, rejeitado ou conflito. E a fila do escritório relê sozinha, sem ninguém ligar para o técnico para perguntar onde ele está.",
      tec: "POST /api/v1/mobile/sync/work-order-actions · work_order.status_change · enRoute → on_route · o console relê a cada 30 s — não é stream",
    },
    { t: 94, superficie: "titulo", narracao: "", tec: "" },
  ],
};

createRoot(document.getElementById("raiz")).render(<Filme fluxo={fluxo} />);
