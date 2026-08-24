/* ============================================================================
   FLUXO 04 — Do serviço ao dinheiro.

   O console web deste vídeo é o PRODUTO (espelho de frontend/src, servido pelo
   snapshot do banco). O aparelho é recriação — Dart não roda em bundle web —,
   mas recriação do CÓDIGO REAL do app, conferido em
   mobile/flutter_app/lib/features/work_orders/ui/work_order_conclusion_screen.dart
   e .../domain/work_order_conclusion.dart.

   O que este vídeo NÃO mostra, porque o produto não faz (fundamentação F4,
   24 passos inexistentes, todos verificados contra código e banco):
     · não há cartão de "Distância" na conclusão — a tela tem Tempo e Materiais
     · a comissão NÃO vem de tabela de preço: é valor-base por prioridade × 10%,
       calculado dentro do aparelho, e nunca sai dele (o app não lê nem grava
       comissão em endpoint nenhum)
     · a linha "Veículo" do resumo traz o CÓDIGO da OS, não placa nem modelo
     · concluir só funciona a partir de "em atendimento" — por isso a ordem
       âncora é a OS-000015 (in_progress), não a OS-000013 (já concluída)
     · nenhuma ação de campo cria título financeiro; nenhum dos 103 títulos do
       banco tem ordem de serviço vinculada
     · não existe baixa de título pela web, nem extrato de caixa, nem rota de
       detalhe de tabela de valores
     · /finance/commissions abre um modal de filtro sobre uma tela sem uma única
       comissão calculada — fica fora do roteiro
   Por isso a volta termina no caixa e nas contas a pagar, que existem com dado
   real — e não num extrato de comissões, que não existe.
   ========================================================================== */

import { createRoot } from "react-dom/client";
import { CheckCircle2, Clock, Cloud, Package, Wallet } from "lucide-react";
import { Filme } from "./player.jsx";
import { dinheiro, num } from "./engine.jsx";
import { GESTOR, MENU, ORG, SELO, acha, dados } from "./comum.jsx";
import { AppBarra, AppCab } from "./kit.jsx";

/* ------------------------------------------------------- números reais */

/** A ordem que o app CONSEGUE concluir: in_progress → "em atendimento". */
const OS = acha(dados.os_ativas, "code", "OS-000015");

/* A comissão do aparelho não vem de tabela: work_order_conclusion_screen.dart
   fixa a alíquota em 10% e o valor-base por prioridade. O vocabulário do
   backend é traduzido em work_order_remote_api.dart. Reproduzimos a MESMA
   conta, com a prioridade gravada no banco — nada de número escolhido a dedo. */
const ALIQUOTA = 10;
const BASE_CENTAVOS = { critical: 200000, high: 150000, normal: 100000, low: 80000 };
const PRIORIDADE_DO_APP = { urgent: "critical", high: "high", medium: "normal", low: "low" };
const COMISSAO_CENTAVOS = Math.round(
  (BASE_CENTAVOS[PRIORIDADE_DO_APP[OS.priority]] * ALIQUOTA) / 100,
);
const COMISSAO = `R$ ${dinheiro(COMISSAO_CENTAVOS / 100)}`;

const FIN = dados.financeiro_por_situacao;
const soma = (filtro, campo) =>
  FIN.filter(filtro).reduce((s, x) => s + (campo === "qtd" ? x.qtd : num(x.total)), 0);

const TITULOS_TOTAL = soma(() => true, "qtd");
const A_RECEBER = soma((x) => x.direction === "receivable", "qtd");
const A_PAGAR = soma((x) => x.direction === "payable", "qtd");
const receberAberto = acha(
  FIN.filter((x) => x.direction === "receivable"),
  "status",
  "open",
);
const receberParcial = acha(
  FIN.filter((x) => x.direction === "receivable"),
  "status",
  "partially_paid",
);
const pagarAberto = acha(FIN.filter((x) => x.direction === "payable"), "status", "open");
const pagarPago = acha(FIN.filter((x) => x.direction === "payable"), "status", "paid");
const pagarParcial = acha(FIN.filter((x) => x.direction === "payable"), "status", "partially_paid");

const OS_TOTAL = dados.os_por_status.reduce((s, x) => s + x.n, 0);
const OS_CONCLUIDAS = acha(dados.os_por_status, "status", "completed").n;
const CONTAS = dados.contas.length;

/* ------------------------------------------------------------- rotas */

const ROTA_ORDENS = "/work-orders";
const OS_WEB = "3d748a21-63c9-4fcc-9836-e53d15ddb8bf";
const ROTA_OS_FINANCEIRO = `/work-orders/${OS_WEB}?aba=financeiro`;
const ROTA_COBRANCAS = "/finance/charges";
const ROTA_FINANCEIRO = "/finance";
const ROTA_PAGAMENTOS = "/finance/payments";

/* --------------------------------------------------------------- APARELHO */

/* Tokens do tema real do app (mobile/flutter_app/lib/shared/theme/):
   AppBar branca sem elevação, cards brancos com borda #E2E8F0 e raio 14,
   primário #2563EB, sucesso #059669. O cartão de comissão usa
   scheme.tertiaryContainer — que, para a semente #2563EB, é #FFD6F8 (rosa
   claro), com onTertiaryContainer #5A3D58. Não é verde: pintar de verde seria
   inventar. Valores conferidos com material_color_utilities 0.13.0. */
const ROSA = "#ffd6f8";
const ROSA_TINTA = "#5a3d58";

function Girando() {
  return (
    <svg width="17" height="17" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r="7" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="2" />
      <path d="M9 2 a7 7 0 0 1 7 7" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate"
          from="0 9 9" to="360 9 9" dur="0.9s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

/** _StatCard — ícone 14px primário, legenda labelSmall, valor titleLarge w800. */
function Estatistica({ Icone, legenda, valor }) {
  return (
    <div className="app-cartao" style={{ flex: 1, padding: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <Icone size={14} color="#2563eb" />
        <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.03em" }}>
          {legenda}
        </span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, marginTop: 8, color: "#0f172a", lineHeight: 1 }}>
        {valor}
      </div>
    </div>
  );
}

/** _SummaryRow — ListTile dense: rótulo pequeno em cima, valor em negrito. */
function LinhaResumo({ rotulo, valor, ultima }) {
  return (
    <div style={{
      padding: "10px 14px",
      borderBottom: ultima ? "none" : "1px solid #f1f5f9",
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#64748b", letterSpacing: "0.03em" }}>
        {rotulo}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a", marginTop: 2, lineHeight: 1.35 }}>
        {valor}
      </div>
    </div>
  );
}

/**
 * Conclusão do atendimento. Três fases, e todas existem no código: pronto,
 * enviando (botão desabilitado com indicador) e concluído (card
 * 'conclusion-synced' + botão OK verde).
 */
function AppConclusao({ fase }) {
  const concluido = fase === "concluido";
  const enviando = fase === "enviando";
  return (
    <>
      <AppCab claro titulo="Conclusão" />
      <div className="app-corpo" style={{ gap: 12 }}>
        <div className="app-cartao" style={{ background: ROSA, borderColor: "#f0c2e6" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Wallet size={16} color={ROSA_TINTA} />
            <span style={{ fontSize: 13, color: ROSA_TINTA, fontWeight: 600 }}>Sua comissão</span>
          </div>
          <div style={{
            fontSize: 30, fontWeight: 800, color: ROSA_TINTA, marginTop: 6,
            letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
          }}>
            {COMISSAO}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Estatistica Icone={Clock} legenda="Tempo" valor="—" />
          <Estatistica Icone={Package} legenda="Materiais" valor="0" />
        </div>

        <div className="app-cartao" style={{ padding: 0, overflow: "hidden" }}>
          <LinhaResumo rotulo="Serviço" valor={OS.title} />
          <LinhaResumo rotulo="Cliente" valor={OS.customer_name} />
          <LinhaResumo rotulo="Veículo" valor={OS.code} ultima />
        </div>

        {concluido ? (
          <div className="app-cartao" style={{
            background: ROSA, borderColor: "#f0c2e6", padding: "12px 14px",
            display: "flex", gap: 11, alignItems: "center",
          }}>
            <Cloud size={19} color="#0f172a" style={{ flex: "none" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                Atendimento concluído
              </div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 1 }}>
                Sincronização em segundo plano.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <AppBarra>
        {concluido ? (
          <div className="app-btn" style={{
            background: "#059669", boxShadow: "0 8px 18px -8px rgba(5,150,105,.85)",
          }}>
            OK
          </div>
        ) : (
          <div className="app-btn" style={{
            gap: 8, gridAutoFlow: "column", opacity: enviando ? 0.6 : 1,
            boxShadow: enviando ? "none" : undefined,
          }}>
            {enviando ? <Girando /> : <CheckCircle2 size={17} strokeWidth={2.4} />}
            Concluir atendimento
          </div>
        )}
      </AppBarra>
    </>
  );
}

function TelaFone({ t }) {
  const fase = t < 23 ? "pronto" : t < 26.5 ? "enviando" : "concluido";
  return <AppConclusao fase={fase} />;
}

/* ---------------------------------------------------------------- ROTEIRO */

const fluxo = {
  num: 4,
  cor: "#10b981",
  titulo: "Do serviço ao dinheiro",
  org: ORG,
  selo: SELO,
  usuario: GESTOR,
  menu: MENU,
  duracao: 96,

  rota: (t) =>
    t < 45
      ? ROTA_ORDENS
      : t < 57
        ? ROTA_OS_FINANCEIRO
        : t < 71
          ? ROTA_COBRANCAS
          : t < 79
            ? ROTA_FINANCEIRO
            : ROTA_PAGAMENTOS,

  Telefone: TelaFone,

  abertura: {
    ate: 6,
    eyebrow: "FLUXO 04 · CAMPO → CONSOLE → CAIXA",
    titulo: "Do serviço ao dinheiro, sem ninguém redigitar",
    texto:
      "O atendimento fecha no aparelho do técnico. Daí em diante o dinheiro segue um caminho só: lançamento na ordem, título financeiro, caixa. Este vídeo percorre esse caminho nas telas reais — e, onde o produto ainda não fecha o elo, mostra a tela vazia em vez de encenar o passo.",
  },
  fecho: {
    de: 88,
    eyebrow: "O CAIXA FECHA COM O QUE ESTÁ NO BANCO",
    titulo: `${TITULOS_TOTAL} títulos, ${CONTAS} contas, nenhum número digitado à mão.`,
    texto:
      "O console à esquerda não é um desenho do produto: é o produto, montado do mesmo código que roda em operação, sobre o snapshot do banco. Onde o elo ainda não existe — do item lançado ao título, e da comissão do campo ao extrato da web — o vídeo mostrou o vazio, não uma encenação.",
    numeros: [
      { valor: COMISSAO, rotulo: "comissão calculada no aparelho", cor: "#10b981" },
      { valor: String(TITULOS_TOTAL), rotulo: "títulos financeiros", cor: "#3b82f6" },
      { valor: `R$ ${dinheiro(num(receberAberto.total), 0)}`, rotulo: "a receber em aberto", cor: "#f59e0b" },
      { valor: String(CONTAS), rotulo: "contas financeiras", cor: "#8b5cf6" },
    ],
  },

  capitulos: [
    { t: 0, nome: "Abertura" },
    { t: 6, nome: "A comissão" },
    { t: 14, nome: "O resumo" },
    { t: 22, nome: "Concluir" },
    { t: 30, nome: "A travessia" },
    { t: 37, nome: "A carteira" },
    { t: 45, nome: "O valor da ordem" },
    { t: 57, nome: "As cobranças" },
    { t: 71, nome: "O caixa" },
    { t: 79, nome: "O que se paga" },
    { t: 87, nome: "Fecho" },
  ],

  feixes: [
    { t0: 30, t1: 36.5, dir: "mobile-web", etiqueta: "POST /mobile/sync/work-order-actions" },
  ],

  beats: [
    { t: 0, superficie: "titulo", narracao: "", tec: "" },
    {
      t: 6, superficie: "mobile",
      narracao: `Fim do atendimento. Antes de qualquer outra coisa, o técnico vê quanto aquele serviço rendeu para ele: ${COMISSAO}.`,
      tec: `valor-base por prioridade × alíquota de ${ALIQUOTA}% — conta feita dentro do aparelho`,
    },
    {
      t: 14, superficie: "mobile",
      narracao:
        "Tempo e materiais só aparecem quando existem. Aqui ainda não existem — e a tela mostra um traço, não um número de enfeite.",
      tec: "WorkOrderConclusionSummary — service · customer · assetLabel · elapsed · materiais",
    },
    {
      t: 22, superficie: "mobile",
      narracao:
        "Concluir não espera rede. A ação entra na fila do aparelho e sobe sozinha quando a conexão volta.",
      tec: "idempotência = organização + usuário + client_action_id",
    },
    {
      t: 30, superficie: "ambos",
      narracao:
        "A volta é por um canal só — o mesmo por onde passa toda ação de campo, de qualquer aparelho.",
      tec: "POST /api/v1/mobile/sync/work-order-actions · work_order.status_change",
    },
    {
      t: 37, superficie: "web",
      narracao: `No console, a mesma carteira que o campo enxerga: ${OS_TOTAL} ordens desta organização, ${OS_CONCLUIDAS} já concluídas.`,
      tec: `/work-orders · GET /api/v1/work-orders — ${OS_TOTAL} ordens, dado gravado do banco`,
    },
    {
      t: 45, superficie: "web",
      narracao:
        "Dentro da ordem, o dinheiro tem aba própria. O valor não é digitado: é lançado da tabela de valores do cliente e congelado no instante do lançamento.",
      tec: "POST /work-orders/:id/financial-items — preço congelado da tarifa vigente",
    },
    {
      t: 51, superficie: "web",
      narracao:
        "E nesta base de demonstração não há um único item lançado. A tela diz isso, em vez de somar um total que não existe.",
      tec: "GET /work-orders/:id/financial-items — 0 itens no banco de demonstração",
    },
    {
      t: 57, superficie: "web",
      narracao: `O que já virou cobrança está aqui: ${receberAberto.qtd} títulos em aberto, ${dinheiro(num(receberAberto.total))} reais.`,
      tec: `GET /api/v1/financial-titles?direction=receivable — KPIs somados sobre os títulos reais`,
    },
    {
      t: 64, superficie: "web",
      narracao: `A grade abre título por título: documento, cliente, valor, vencimento e situação. ${receberParcial.qtd} deles foram pagos só em parte — e a linha diz "Parcial", não "Pago".`,
      tec: `parcialmente pagos: ${receberParcial.qtd} títulos · R$ ${dinheiro(num(receberParcial.total))} a receber`,
    },
    {
      t: 71, superficie: "web",
      narracao: `O painel financeiro fecha a conta da operação: o que entra, o que sai, o saldo das ${CONTAS} contas e o percentual de inadimplência.`,
      tec: "GET /api/v1/financial-summary — aberto = status ∉ {pago, cancelado} · saldo = abertura + entradas − saídas",
    },
    {
      t: 79, superficie: "web",
      narracao: `O outro lado usa exatamente a mesma grade: ${A_PAGAR} títulos a pagar, com fornecedor, vencimento e agendamento.`,
      tec: `direction=payable — ${pagarAberto.qtd} em aberto · ${pagarPago.qtd} pagos · ${pagarParcial.qtd} parciais`,
    },
    { t: 87, superficie: "titulo", narracao: "", tec: "" },
  ],
};

/* Guarda de sanidade: se o JSON de dados mudar de forma, o vídeo falha na
   bancada em vez de exibir "undefined" numa apresentação. */
if (!OS || !receberAberto || !pagarAberto || A_RECEBER + A_PAGAR !== TITULOS_TOTAL) {
  throw new Error("dados-reais.json não tem as linhas que o fluxo 4 cita");
}

createRoot(document.getElementById("raiz")).render(<Filme fluxo={fluxo} />);
