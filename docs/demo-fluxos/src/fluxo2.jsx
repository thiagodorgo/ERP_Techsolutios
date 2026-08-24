/* ============================================================================
   FLUXO 02 — O checklist que a web escreve e o campo preenche.

   O console web deste vídeo é o PRODUTO (espelho de frontend/src). O aparelho é
   recriação — Dart não roda em bundle web —, mas recriação do CÓDIGO REAL do
   app, não do protótipo: cada elemento abaixo foi conferido em
   mobile/flutter_app/lib/features/checklists/ui/checklist_run_screen.dart.

   O que este vídeo NÃO mostra, porque o app não faz (levantado por 8 agentes
   contra o código, 2026-08-24):
     · não há stepper na vistoria — o stepper vive no detalhe da OS
     · não há contador "Fotos 0/8" — cada photo_upload guarda UMA evidência
     · o mapa de avarias é outra tela, e este modelo não tem componente de avaria
     · nenhuma tela web renderiza as fotos de uma vistoria preenchida
   Por isso a volta termina no acompanhamento de execuções, que existe — e não
   num dossiê de fotos, que não existe.
   ========================================================================== */

import { createRoot } from "react-dom/client";
import { Camera, Check, ChevronRight, ListChecks, RefreshCw, Truck } from "lucide-react";
import { Filme } from "./player.jsx";
import { conta, jan } from "./engine.jsx";
import { GESTOR, MENU, ORG, SELO, dados } from "./comum.jsx";
import { AppBarra, AppCab, AppNav, Chip, Vistas } from "./kit.jsx";

const MODELO = dados.checklist_vistoria;
const COMPONENTES = dados.checklist_componentes;
const PUBLICADOS = dados.checklists_publicados;
const OBRIGATORIOS = COMPONENTES.filter((c) => c.required).length;

const ROTA_MODELOS = "/administrator/checklists";
const ROTA_EDITOR = `/administrator/checklists/${MODELO.id}`;
const ROTA_EXECUCOES = "/operations/checklists";

/* --------------------------------------------------------------- APARELHO */

/** O que o técnico vê quando o despacho ainda não provisionou a execução. */
function AppAguardando() {
  return (
    <>
      <AppCab claro voltar titulo="Checklists da OS" sub="OS-000015 · Recolhimento ao pátio" />
      <div className="app-corpo" style={{ justifyContent: "center", alignItems: "center", gap: 13 }}>
        <ListChecks size={30} color="#cbd5e1" />
        <div style={{ textAlign: "center", fontSize: 12.5, color: "#64748b", lineHeight: 1.55, padding: "0 22px" }}>
          <b style={{ display: "block", fontSize: 14, color: "#0f172a", marginBottom: 5 }}>
            Aguardando despacho do checklist
          </b>
          A vistoria aparece aqui assim que a operação despachar o atendimento.
        </div>
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

function AppListaDaOS() {
  return (
    <>
      <AppCab claro voltar titulo="Checklists da OS" sub="OS-000015 · Recolhimento ao pátio" />
      <div className="app-corpo">
        {PUBLICADOS.map((m) => {
          const alvo = m.name === MODELO.name;
          return (
            <div key={m.name} className="app-cartao" style={{
              borderColor: alvo ? "#2563eb" : "#e2e8f0",
              boxShadow: alvo ? "0 0 0 3px rgba(37,99,235,.13)" : "none",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, lineHeight: 1.3 }}>{m.name}</div>
                  <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>
                    Atualizado em {SELO}
                  </div>
                </div>
                {alvo ? <span className="app-pill">Obrigatório</span> : null}
              </div>
              <div style={{ marginTop: 10, display: "flex" }}>
                <span className={alvo ? "app-btn-contorno app-btn-contorno--forte" : "app-btn-contorno"}>
                  {alvo ? "Iniciar" : "Iniciar"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <AppNav ativo="OS" />
    </>
  );
}

/** Um card por componente — é assim que o app monta a tela, na ordem do modelo. */
function CampoVeiculo({ escolhido, vista }) {
  return (
    <div className="app-campo">
      <div className="app-campo-rot">{COMPONENTES[0].label} <b>*</b></div>
      <div className="app-input">
        {escolhido ? <><Truck size={14} color="#2563eb" /> Carro</> : <span style={{ color: "#94a3b8" }}>Selecione</span>}
      </div>
      {escolhido ? (
        <div style={{ marginTop: 11 }}>
          <div className="app-campo-rot" style={{ marginBottom: 6 }}>Vista do veículo</div>
          <Vistas tipo="sedan" sel={vista} feitas={0} />
        </div>
      ) : null}
    </div>
  );
}

function CampoEvidencia({ rotulo, estado }) {
  const registrada = estado === "ok";
  return (
    <div className="app-campo">
      <div className="app-campo-rot">{rotulo} <b>*</b></div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 7 }}>
        <span className={`app-btn-contorno${registrada ? " app-btn-contorno--ok" : ""}`}>
          {estado === "registrando"
            ? "Registrando…"
            : registrada
              ? <><Check size={13} strokeWidth={3} /> Evidência registrada</>
              : <><Camera size={13} /> Adicionar evidência</>}
        </span>
        {registrada ? <span className="app-pill app-pill--pendente">Pendente sync</span> : null}
      </div>
    </div>
  );
}

function CampoObservacao({ preenchida }) {
  return (
    <div className="app-campo">
      <div className="app-campo-rot">{COMPONENTES[5].label}</div>
      <div className="app-input app-input--area">
        {preenchida
          ? "Amassado na porta dianteira esquerda e risco no capô. Pneu dianteiro direito vazio."
          : <span style={{ color: "#94a3b8" }}>Adicione observações</span>}
      </div>
    </div>
  );
}

function AppVistoria({ t }) {
  // Uma evidência por componente, na ordem do modelo — 4 fotos, não 8.
  const evidencias = conta(t, 58, 69, 0, 4);
  const escolheuTipo = t >= 51;
  const vista = Math.min(3, Math.max(0, evidencias - (t >= 69 ? 1 : 0)));
  const observacao = t >= 71;
  const feitos = (escolheuTipo ? 1 : 0) + evidencias;
  const concluindo = t >= 74;

  return (
    <>
      <AppCab claro voltar titulo={MODELO.name}
        sub={`Obrigatórios: ${feitos}/${OBRIGATORIOS}`}
        direita={<span className="app-pill">{feitos >= OBRIGATORIOS ? "Pronto" : "Em andamento"}</span>} />
      <div className="app-progresso">
        <div className="app-progresso-barra" style={{ width: `${(feitos / OBRIGATORIOS) * 100}%` }} />
      </div>
      <div className="app-corpo app-corpo--liso" style={{ gap: 9 }}>
        <CampoVeiculo escolhido={escolheuTipo} vista={vista} />
        {COMPONENTES.slice(1, 5).map((c, i) => (
          <CampoEvidencia key={c.label} rotulo={c.label}
            estado={evidencias > i ? "ok" : evidencias === i && t >= 58 ? "registrando" : "vazio"} />
        ))}
        <CampoObservacao preenchida={observacao} />
      </div>
      <AppBarra>
        <div className={`app-btn${concluindo ? " app-btn--verde" : ""}`}>
          {concluindo ? "Concluindo…" : "Concluir checklist"}
        </div>
      </AppBarra>
    </>
  );
}

function AppSincronizacao({ t }) {
  const enviados = conta(t, 78, 84, 0, 5);
  const itens = [
    "Vistoria de Entrada — Pátio",
    "Foto — Frente", "Foto — Traseira",
    "Foto — Lateral esquerda", "Foto — Lateral direita",
  ];
  return (
    <>
      <AppCab claro titulo="Sincronização"
        direita={<span className="app-pill app-pill--online">Online</span>} />
      <div className="app-corpo">
        <div style={{ display: "flex", gap: 7 }}>
          {[["Pendentes", 5 - enviados, "#f59e0b"], ["Sincronizados", enviados, "#10b981"],
            ["Erros", 0, "#94a3b8"], ["Conflitos", 0, "#94a3b8"]].map(([r, v, c]) => (
            <div key={r} className="app-cartao" style={{ flex: 1, padding: "9px 7px", textAlign: "center" }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: c, fontVariantNumeric: "tabular-nums" }}>{v}</div>
              <div style={{ fontSize: 8.5, color: "#94a3b8", fontWeight: 600, marginTop: 2 }}>{r}</div>
            </div>
          ))}
        </div>
        <div className="app-rotulo" style={{ marginTop: 3 }}>CHECKLISTS</div>
        {itens.map((it, i) => (
          <div key={it} className="app-cartao" style={{ padding: "9px 11px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 11.5, fontWeight: 600, flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{it}</span>
            {i < enviados
              ? <span className="app-pill app-pill--online"><Check size={10} strokeWidth={3.4} /> Sincronizado</span>
              : <span className="app-pill app-pill--pendente">Pendente</span>}
          </div>
        ))}
      </div>
      <AppBarra>
        <div className="app-btn">
          <RefreshCw size={15} style={{ marginRight: 7, verticalAlign: -3 }} />
          {enviados < 5 ? "Sincronizando…" : "Sincronizar agora"}
        </div>
      </AppBarra>
    </>
  );
}

function TelaFone({ t }) {
  if (t < 36) return <AppAguardando />;
  if (t < 43) return <AppListaDaOS />;
  if (t < 76) return <AppVistoria t={t} />;
  return <AppSincronizacao t={t} />;
}

/* ---------------------------------------------------------------- ROTEIRO */

const fluxo = {
  num: 2,
  cor: "#8b5cf6",
  titulo: "O checklist que a web escreve e o campo preenche",
  org: ORG,
  selo: SELO,
  usuario: GESTOR,
  menu: MENU,
  duracao: 100,

  rota: (t) => (t < 13 ? ROTA_MODELOS : t < 88 ? ROTA_EDITOR : ROTA_EXECUCOES),

  Telefone: TelaFone,

  abertura: {
    ate: 6,
    eyebrow: "FLUXO 02 · WEB → CAMPO → WEB",
    titulo: "O que a operação publica, o campo recebe — item por item",
    texto: "Um modelo de vistoria é montado uma vez no console. O aparelho do técnico não recebe uma tela parecida: recebe a estrutura, e monta a tela sozinho — mesma ordem, mesmos rótulos, mesma obrigatoriedade.",
  },
  fecho: {
    de: 94,
    eyebrow: "A VOLTA COMPLETA",
    titulo: "Seis itens publicados. Seis itens executados. Nada redigitado.",
    texto: "O console à esquerda deste vídeo não é um desenho do produto: é o produto, montado a partir do mesmo código que roda em operação, com os dados gravados do banco.",
    numeros: [
      { valor: String(COMPONENTES.length), rotulo: "itens no modelo", cor: "#8b5cf6" },
      { valor: String(OBRIGATORIOS), rotulo: "obrigatórios", cor: "#ef4444" },
      { valor: String(PUBLICADOS.length), rotulo: "modelos publicados", cor: "#3b82f6" },
      { valor: String(dados.dossie.runs), rotulo: "execuções no banco", cor: "#10b981" },
    ],
  },

  capitulos: [
    { t: 0, nome: "Abertura" },
    { t: 6, nome: "Os modelos" },
    { t: 13, nome: "O editor" },
    { t: 26, nome: "Publicar" },
    { t: 31, nome: "A travessia" },
    { t: 43, nome: "O campo abre" },
    { t: 51, nome: "A vistoria" },
    { t: 58, nome: "As evidências" },
    { t: 76, nome: "Sincroniza" },
    { t: 88, nome: "O acompanhamento" },
    { t: 94, nome: "Fecho" },
  ],

  feixes: [
    { t0: 31, t1: 38, dir: "web-mobile", etiqueta: "GET /mobile/checklists/available" },
    { t0: 82, t1: 88, dir: "mobile-web", etiqueta: "POST /mobile/sync/checklist-actions" },
  ],

  beats: [
    { t: 0, superficie: "titulo", narracao: "", tec: "" },
    {
      t: 6, superficie: "web",
      narracao: "Modelos de checklist. Quem escreve é a operação — nenhum desenvolvedor entra nesse caminho.",
      tec: "/administrator/checklists · tela real do produto, dado gravado do banco",
    },
    {
      t: 13, superficie: "web",
      narracao: "A Vistoria de Entrada do pátio, aberta no editor. Cada campo do formulário vira um campo obrigatório no aparelho.",
      tec: "checklist_template_components · order_index define a ordem no campo",
    },
    {
      t: 21, superficie: "web",
      narracao: "Seis campos: o tipo do veículo, as quatro fotos das quatro vistas, e as observações de avaria.",
      tec: `${OBRIGATORIOS} obrigatórios · 1 opcional`,
    },
    {
      t: 26, superficie: "web",
      narracao: "Publicar. A partir deste segundo, as próximas ordens já saem com esta versão.",
      tec: "publicado — já disponível no aplicativo para as próximas ordens",
    },
    {
      t: 31, superficie: "ambos",
      narracao: "O aparelho não recebe um desenho da tela. Recebe a estrutura — e monta a tela sozinho.",
      tec: "GET /api/v1/mobile/checklists/available",
    },
    {
      t: 43, superficie: "mobile",
      narracao: "Na mão do técnico, dentro da ordem que ele está atendendo. Nada foi digitado duas vezes.",
      tec: "a vistoria é provisionada pelo despacho, não criada pelo técnico",
    },
    {
      t: 51, superficie: "mobile",
      narracao: "Seis campos publicados, seis campos na tela. O contador de obrigatórios é a mesma conta que a operação definiu.",
      tec: `Obrigatórios: X/${OBRIGATORIOS} — vem do modelo, não do aplicativo`,
    },
    {
      t: 58, superficie: "mobile",
      narracao: "Uma evidência por vista. A foto fica no aparelho e sobe como anexo — não como texto colado num campo.",
      tec: "photo_upload × 4 · anexo multipart, blob preservado até o servidor confirmar",
    },
    {
      t: 71, superficie: "mobile",
      narracao: "As avarias entram por escrito, no campo que a operação deixou aberto para isso.",
      tec: "observation · único campo opcional do modelo",
    },
    {
      t: 76, superficie: "mobile",
      narracao: "Sem sinal, nada se perde: tudo fica na fila local do aparelho e sobe quando a rede volta.",
      tec: "idempotência = organização + usuário + client_action_id",
    },
    {
      t: 82, superficie: "ambos",
      narracao: "A fila esvazia. Cinco itens sobem — o preenchimento e as quatro evidências.",
      tec: "POST /api/v1/mobile/sync/checklist-actions",
    },
    {
      t: 88, superficie: "web",
      narracao: "E a operação vê a execução no acompanhamento, sem pedir foto por aplicativo de mensagem a ninguém.",
      tec: "/operations/checklists · execuções por ordem de serviço",
    },
    { t: 94, superficie: "titulo", narracao: "", tec: "" },
  ],
};

createRoot(document.getElementById("raiz")).render(<Filme fluxo={fluxo} />);
