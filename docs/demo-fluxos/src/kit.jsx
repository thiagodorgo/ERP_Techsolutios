/* ============================================================================
   Kit de superfícies — as recriações do console web e do app de campo.

   Fidelidade: os ícones vêm do MESMO pacote que o produto usa (lucide-react
   0.511.0, o que está em frontend/node_modules), e a grade, os tokens e a cópia
   vêm das referências aprovadas em docs/claude-code-handoff/screen-refs/.
   Recriar, não reinterpretar — §11 do CLAUDE.md.
   ========================================================================== */

import {
  Bell, Search, ChevronDown, LayoutGrid, ClipboardList, MapPin, Send, CheckSquare,
  Package, ListChecks, ShoppingCart, Route, Warehouse, Wallet, Receipt, Tag,
  Plus, Filter, Download, Clock, Truck, Building2, Wrench, Camera, Check,
  Home, User, DollarSign, ChevronRight, ArrowLeft, Navigation, AlertTriangle,
  FileText, Layers, Banknote, TrendingUp,
} from "lucide-react";

export const ICONES = {
  dashboard: LayoutGrid, os: ClipboardList, mapa: MapPin, despachos: Send,
  aprovacoes: CheckSquare, estoque: Package, checklists: ListChecks,
  compras: ShoppingCart, rotas: Route, patios: Warehouse, financeiro: Wallet,
  titulos: Receipt, precos: Tag, relatorios: TrendingUp, docs: FileText,
  camadas: Layers, dinheiro: Banknote,
};

/* ------------------------------------------------------------ janela do web */

export function Navegador({ rota, children }) {
  return (
    <div className="browser">
      <div className="browser-chrome">
        <div className="bolinhas"><i className="bolinha" /><i className="bolinha" /><i className="bolinha" /></div>
        <div className="url">
          <span className="cadeado">&#9679;</span>
          <span>localhost:5173</span><b>{rota}</b>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * Casca do ERP. O menu é dado de entrada — cada fluxo passa o seu, para que a
 * barra lateral mostre exatamente os itens que aquele papel enxerga.
 */
export function Web({ menu, ativo, titulo, usuario, org, children }) {
  return (
    <div className="web">
      <aside className="side">
        <div className="side-marca">
          <div className="side-logo">&#127807;</div>
          <div className="side-nome">TechSolutions<span>PLATAFORMA ERP</span></div>
        </div>
        <div style={{ overflow: "hidden", flex: 1 }}>
          {menu.map((grupo) => (
            <div key={grupo.grupo}>
              <div className="side-grupo">{grupo.grupo}</div>
              {grupo.itens.map((it) => {
                const Ic = ICONES[it.icone] || LayoutGrid;
                return (
                  <div key={it.nome} className={`side-item${it.nome === ativo ? " side-item--ativo" : ""}`}>
                    <span className="ic"><Ic size={15} strokeWidth={2} /></span>
                    <span>{it.nome}</span>
                    {it.badge ? <span className="side-badge">{it.badge}</span> : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="side-user">
          <div className="side-avatar">{usuario.iniciais}</div>
          <div className="side-user-nome">{usuario.nome}<span>{usuario.papel}</span></div>
        </div>
      </aside>

      <div className="topbar">
        <div className="topbar-titulo">{titulo}</div>
        <div className="busca"><Search size={13} /> Buscar pedidos, itens, clientes&hellip;</div>
        <div className="seletor-org"><Building2 size={13} /> {org} <ChevronDown size={13} /></div>
        <div className="sino"><Bell size={15} /></div>
      </div>

      <main className="conteudo">{children}</main>
    </div>
  );
}

export function PagCab({ titulo, sub, chip, acoes }) {
  return (
    <header className="pagina-cab">
      <div style={{ minWidth: 0 }}>
        <h1 className="pagina-titulo">{titulo}{chip}</h1>
        <p className="pagina-sub">{sub}</p>
      </div>
      {acoes ? <div className="pagina-acoes">{acoes}</div> : null}
    </header>
  );
}

export function Botao({ children, primario, Icone, ...resto }) {
  return (
    <span className={`btn${primario ? " btn--primario" : ""}`} {...resto}>
      {Icone ? <Icone size={14} strokeWidth={2.4} /> : null}{children}
    </span>
  );
}

export const BotaoNovo = (p) => <Botao primario Icone={Plus} {...p} />;
export const BotaoFiltrar = (p) => <Botao Icone={Filter} {...p} />;
export const BotaoExportar = (p) => <Botao Icone={Download} {...p} />;

export function Chip({ tom = "cinza", vivo, children }) {
  return <span className={`chip chip--${tom}${vivo ? " chip--vivo" : ""}`}>{children}</span>;
}

/** Faixa de KPIs. `aceso` é o índice em destaque — é o card "clicado". */
export function Kpis({ itens, aceso = -1 }) {
  return (
    <div className="kpis" style={{ gridTemplateColumns: `repeat(${itens.length}, minmax(0, 1fr))` }}>
      {itens.map((k, i) => (
        <div key={k.rotulo} className={`kpi${i === aceso ? " kpi--aceso" : ""}`}>
          <div className="kpi-topo">
            <i className="kpi-ponto" style={{ background: k.cor }} />
            <span className="kpi-valor">{k.valor}</span>
          </div>
          <div className="kpi-rotulo">{k.rotulo}</div>
          {k.delta ? <div className="kpi-delta" style={{ color: k.corDelta || k.cor }}>{k.delta}</div> : null}
        </div>
      ))}
    </div>
  );
}

export function Cartao({ titulo, sub, link, children, style }) {
  return (
    <section className="cartao" style={style}>
      {titulo ? (
        <header className="cartao-cab">
          <span className="cartao-titulo">{titulo}</span>
          {sub ? <span className="cartao-sub">{sub}</span> : null}
          {link ? <span className="cartao-link">{link}</span> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Tabela({ colunas, linhas }) {
  return (
    <table className="tab">
      <thead>
        <tr>{colunas.map((c) => <th key={c.k} style={c.dir === "num" ? { textAlign: "right" } : null}>{c.t}</th>)}</tr>
      </thead>
      <tbody>
        {linhas.map((l) => (
          <tr key={l.chave} className={[l.nova ? "linha--nova" : "", l.destaque ? "linha--destaque" : ""].join(" ").trim()}>
            {colunas.map((c) => (
              <td key={c.k} className={c.dir === "num" ? "num" : undefined}>{l[c.k]}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Barra({ pct, cor }) {
  return (
    <div className="barra-trilho">
      <div className="barra-preench" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: cor }} />
    </div>
  );
}

/* --------------------------------------------------------- gráficos (SVG) */

/** Colunas verticais. SVG inline, zero dependência — a mesma regra do painel (PD-004). */
export function Colunas({ dados, largura = 300, altura = 108, prog = 1 }) {
  const max = Math.max(...dados.map((d) => d.v), 1);
  const passo = largura / dados.length;
  const lg = passo * 0.56;
  return (
    <svg width={largura} height={altura + 20} role="img" aria-label="gráfico de colunas">
      {dados.map((d, i) => {
        const h = (d.v / max) * altura * prog;
        return (
          <g key={d.r}>
            <rect x={i * passo + (passo - lg) / 2} y={altura - h} width={lg} height={Math.max(h, 1)} rx="3" fill={d.cor} />
            <text x={i * passo + passo / 2} y={altura + 13} textAnchor="middle" fontSize="8.5" fill="#94a3b8">{d.r}</text>
          </g>
        );
      })}
    </svg>
  );
}

/** Rosca de proporção. */
export function Rosca({ fatias, tamanho = 108, prog = 1 }) {
  const total = fatias.reduce((s, f) => s + f.v, 0) || 1;
  const raio = tamanho / 2 - 9;
  const circ = 2 * Math.PI * raio;
  let acc = 0;
  return (
    <svg width={tamanho} height={tamanho} role="img" aria-label="gráfico de proporção">
      <g transform={`translate(${tamanho / 2} ${tamanho / 2}) rotate(-90)`}>
        {fatias.map((f) => {
          const frac = (f.v / total) * prog;
          const el = (
            <circle key={f.r} r={raio} fill="none" stroke={f.cor} strokeWidth="15"
              strokeDasharray={`${circ * frac} ${circ}`} strokeDashoffset={-circ * acc} />
          );
          acc += frac;
          return el;
        })}
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ aparelho */

export function Aparelho({ children }) {
  return (
    <div className="aparelho">
      <div className="tela">
        <div className="notch" />
        <div className="statusbar">
          <span>9:41</span>
          <span style={{ display: "flex", gap: 5, alignItems: "center", fontSize: 11 }}>
            <span>&#9601;&#9603;&#9605;</span><span>&#9646;&#9646;&#9646;</span>
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}

export function AppCab({ titulo, sub, claro, direita, voltar }) {
  return (
    <header className={`app-cab${claro ? " app-cab--claro" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {voltar ? <ArrowLeft size={18} style={{ flex: "none", marginTop: 2 }} /> : null}
        <div style={{ minWidth: 0, flex: 1 }}>
          <h2>{titulo}</h2>
          {sub ? <p>{sub}</p> : null}
        </div>
        {direita}
      </div>
    </header>
  );
}

export function AppNav({ ativo = "Início" }) {
  const itens = [
    { n: "Início", I: Home }, { n: "OS", I: ClipboardList }, { n: "Mapa", I: MapPin },
    { n: "Finanças", I: DollarSign }, { n: "Perfil", I: User },
  ];
  return (
    <nav className="app-nav">
      {itens.map(({ n, I }) => (
        <div key={n} className={n === ativo ? "on" : ""}>
          <span className="ic"><I size={17} strokeWidth={2.1} /></span>{n}
        </div>
      ))}
    </nav>
  );
}

export function AppBarra({ children }) {
  return <div className="app-barra">{children}</div>;
}

export function Stepper({ passos, atual }) {
  return (
    <div className="stepper">
      {passos.map((p, i) => (
        <div key={p} className={`stepper-passo${i < atual ? " ok" : ""}${i === atual ? " atual" : ""}`}>
          <div className="stepper-bola">{i < atual ? <Check size={13} strokeWidth={3.2} /> : i + 1}</div>
          <div className="stepper-nome">{p}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------- vistoria: vistas e fotos */

export const VISTAS = [
  { k: "left", r: "Esquerda" }, { k: "right", r: "Direita" },
  { k: "front", r: "Frente" }, { k: "back", r: "Traseira" },
];

export const foto = (tipo, vista) => `assets/vistoria/${tipo}-${vista}.png`;

export function Vistas({ tipo = "sedan", feitas = 0, sel = 0 }) {
  return (
    <div className="vistas">
      {VISTAS.map((v, i) => (
        <div key={v.k} className={`vista${i === sel ? " sel" : ""}${i < feitas ? " feita" : ""}`}>
          <img src={foto(tipo, v.k)} alt={`${v.r} do veículo`} />
          <span>{v.r}</span>
        </div>
      ))}
    </div>
  );
}

/** Grade de 8 lugares — a vistoria 360° do protótipo (2 fotos por vista). */
export function GradeFotos({ tipo = "sedan", n = 0, total = 8 }) {
  const ordem = ["left", "left", "right", "right", "front", "front", "back", "back"];
  return (
    <div className="grade-fotos">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="slot">
          {i < n
            ? <img src={foto(tipo, ordem[i % ordem.length])} alt={`Foto ${i + 1} do veículo`} />
            : <Camera className="slot-vazio" size={15} />}
        </div>
      ))}
    </div>
  );
}

export const AVARIAS = {
  amassado: "#ef4444",
  risco: "#f59e0b",
  quebrado: "#8b5cf6",
};

export function MapaAvarias({ tipo = "sedan", marcas = [] }) {
  return (
    <div className="avarias">
      <img src={foto(tipo, "left")} alt="Silhueta do veículo para marcação de avarias" />
      {marcas.map((m, i) => (
        <span key={`${m.x}-${m.y}`} className="marcador"
          style={{ left: `${m.x}%`, top: `${m.y}%`, background: AVARIAS[m.tipo], animationDelay: `${i * 90}ms` }}>
          {i + 1}
        </span>
      ))}
    </div>
  );
}

export function LegendaAvarias({ n }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 11, fontSize: 9.5, color: "#94a3b8", marginTop: 7 }}>
      {Object.entries(AVARIAS).map(([nome, cor]) => (
        <span key={nome} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <i style={{ width: 7, height: 7, borderRadius: "50%", background: cor, display: "inline-block" }} />
          {nome[0].toUpperCase() + nome.slice(1)}
        </span>
      ))}
      <span style={{ marginLeft: "auto", color: "#2563eb", fontWeight: 700, textDecoration: "underline" }}>
        {n} avaria(s) <ChevronRight size={9} style={{ verticalAlign: "-1px" }} />
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------- o feixe */

/**
 * O feixe entre as duas superfícies. É a tese do produto em forma visual:
 * o que a web publica, o aparelho recebe — e o que o campo grava, a web lê.
 * A etiqueta carrega o endpoint REAL, porque é ela que dá credibilidade.
 */
export function Feixe({ de, para, prog, etiqueta, inverso }) {
  if (prog <= 0 || prog >= 1) return null;
  const [x1, y1] = inverso ? para : de;
  const [x2, y2] = inverso ? de : para;
  const cx = (x1 + x2) / 2;
  const cy = y1 - 96;
  const caminho = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

  // Ponto no caminho quadrático em `prog`.
  const u = prog;
  const px = (1 - u) * (1 - u) * x1 + 2 * (1 - u) * u * cx + u * u * x2;
  const py = (1 - u) * (1 - u) * y1 + 2 * (1 - u) * u * cy + u * u * y2;
  const aparicao = Math.min(1, prog * 4, (1 - prog) * 4);

  return (
    <svg className="feixe" viewBox="0 0 1500 880" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="gradFeixe" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path className="feixe-trilho" d={caminho} opacity={aparicao} />
      <path className="feixe-vivo" d={caminho} opacity={aparicao}
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - prog} />
      <g className="feixe-pacote" opacity={aparicao}>
        <circle cx={px} cy={py} r="7" fill="#c4b5fd" />
        <circle cx={px} cy={py} r="15" fill="none" stroke="#8b5cf6" strokeWidth="1.6" opacity={0.55} />
      </g>
      {etiqueta ? (
        <text className="feixe-etiqueta" x={cx} y={cy + 34} textAnchor="middle" opacity={aparicao}>
          {etiqueta}
        </text>
      ) : null}
    </svg>
  );
}

/* -------------------------------------------------- peças de apoio de tela */

export function Faixa({ tom = "ambar", Icone = AlertTriangle, titulo, texto }) {
  const cores = {
    ambar: ["#fffbeb", "#fde68a", "#b45309"],
    vermelho: ["#fef2f2", "#fecaca", "#b91c1c"],
    verde: ["#ecfdf5", "#a7f3d0", "#047857"],
    azul: ["#eff6ff", "#bfdbfe", "#1d4ed8"],
  }[tom];
  return (
    <div style={{
      background: cores[0], border: `1px solid ${cores[1]}`, borderRadius: 10,
      padding: "10px 12px", display: "flex", gap: 9, alignItems: "flex-start", color: cores[2],
    }}>
      <Icone size={15} style={{ flex: "none", marginTop: 1 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.1em", fontWeight: 700, opacity: 0.8 }}>{titulo}</div>
        <div style={{ fontSize: 12, fontWeight: 700, marginTop: 2, lineHeight: 1.35 }}>{texto}</div>
      </div>
    </div>
  );
}

export function LinhaDado({ Icone, rotulo, valor }) {
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "center", padding: "9px 0", borderBottom: "1px solid #f1f5f9" }}>
      <Icone size={15} color="#94a3b8" style={{ flex: "none" }} />
      <div style={{ minWidth: 0 }}>
        <div className="app-rotulo">{rotulo}</div>
        <div style={{ fontSize: 13, fontWeight: 700, marginTop: 1 }}>{valor}</div>
      </div>
    </div>
  );
}

export { Clock, Truck, Wrench, Building2, Navigation, Camera, Check, ChevronRight, AlertTriangle };
