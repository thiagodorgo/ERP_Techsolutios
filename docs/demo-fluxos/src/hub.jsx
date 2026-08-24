/* ============================================================================
   Sala de projeção — a porta de entrada dos 4 fluxos.

   Os números desta página vêm do mesmo dados-reais.json que alimenta os vídeos.
   Se o banco mudar e o export rodar de novo, esta página muda junto — ela não
   guarda número escrito à mão.
   ========================================================================== */

import { createRoot } from "react-dom/client";
import { ArrowRight, Database, Monitor, Smartphone } from "lucide-react";
import { ORG, SELO, dados } from "./comum.jsx";
import { dinheiro, num } from "./engine.jsx";

const FLUXOS = [
  {
    n: 1, cor: "#3b82f6", arquivo: "fluxo-1-chamado.html",
    titulo: "Do chamado à rua",
    texto: "O despacho abre a ordem no console e atribui o técnico. Segundos depois ela está na mão de quem dirige o guincho — com endereço, prazo e contato. O status volta sozinho.",
    tags: ["Despacho", "App de campo", "SLA ao vivo"],
  },
  {
    n: 2, cor: "#8b5cf6", arquivo: "fluxo-2-checklist.html",
    titulo: "O checklist que a web escreve e o campo preenche",
    texto: "Um modelo de vistoria é montado uma vez no console. O aparelho recebe a estrutura — mesma ordem, mesmos rótulos, mesma obrigatoriedade — e devolve fotos e avarias para o dossiê do veículo.",
    tags: ["Builder", "Vistoria 360°", "Sincronização"],
  },
  {
    n: 3, cor: "#f59e0b", arquivo: "fluxo-3-patio.html",
    titulo: "Do resgate à custódia",
    texto: "O veículo entra no pátio e vira processo com vaga, prazo e responsável. O painel gerencial mostra ocupação por pátio e deixa cada card filtrar a operação inteira.",
    tags: ["Pátios", "Ocupação", "Cards que filtram"],
  },
  {
    n: 4, cor: "#10b981", arquivo: "fluxo-4-dinheiro.html",
    titulo: "Do serviço ao dinheiro",
    texto: "O atendimento fecha, o técnico vê a comissão, e a tabela de valores que originou o preço aparece por extenso. O título nasce, é baixado e cai no extrato.",
    tags: ["Tabela de valores", "Títulos", "Extrato"],
  },
];

const receber = (dados.financeiro_por_situacao || []).filter((r) => r.direction === "receivable");
const totalReceber = receber.reduce((s, r) => s + num(r.total), 0);
const vagas = (dados.patios || []).reduce((s, p) => s + p.vagas, 0);
const ocupadas = (dados.patios || []).reduce((s, p) => s + p.ocupadas, 0);
const processos = (dados.processos_por_status || []).reduce((s, p) => s + p.n, 0);

function Hub() {
  return (
    <div className="hub">
      <header className="hub-topo">
        <div className="hub-eyebrow">ERP TECHSOLUTIONS &middot; QUATRO FLUXOS</div>
        <h1>Um chamado que vira <em>vistoria</em>, <em>custódia</em> e <em>dinheiro</em> — sem ninguém redigitar nada.</h1>
        <p className="hub-lead">
          Quatro reencenações do sistema em operação, cada uma mostrando o console web e o
          aplicativo de campo lado a lado. Não são telas de apresentação: os números vieram do
          banco em {SELO}, e cada travessia entre a web e o aparelho carrega o endereço real
          do serviço que a faz acontecer.
        </p>

        <div className="hub-nums">
          <div className="hub-num">
            <b style={{ color: "#3b82f6" }}>{processos}</b>
            <span>processos de custódia</span>
          </div>
          <div className="hub-num">
            <b style={{ color: "#f59e0b" }}>{ocupadas}<span style={{ opacity: 0.4 }}>/{vagas}</span></b>
            <span>vagas ocupadas em 4 pátios</span>
          </div>
          <div className="hub-num">
            <b style={{ color: "#8b5cf6" }}>{dados.dossie.fotos}</b>
            <span>fotos de vistoria no dossiê</span>
          </div>
          <div className="hub-num">
            <b style={{ color: "#10b981" }}>R$ {dinheiro(totalReceber, 0)}</b>
            <span>em contas a receber</span>
          </div>
        </div>
      </header>

      <div className="hub-grade">
        {FLUXOS.map((f) => (
          <a className="hub-card" key={f.n} href={f.arquivo} style={{ "--cor": f.cor }}>
            <div className="hub-card-num">FLUXO {String(f.n).padStart(2, "0")}</div>
            <h2>{f.titulo}</h2>
            <p>{f.texto}</p>
            <div className="hub-card-pe">
              <Monitor size={12} /> web
              <ArrowRight size={11} style={{ opacity: 0.5 }} />
              <Smartphone size={12} /> campo
              <span style={{ flex: 1 }} />
              {f.tags.map((t) => <span className="hub-tag" key={t}>{t}</span>)}
            </div>
          </a>
        ))}
      </div>

      <footer className="hub-rodape">
        <p>
          <Database size={13} style={{ verticalAlign: -2, marginRight: 7, opacity: 0.6 }} />
          <b>De onde vêm os números.</b> Organização <b>{ORG}</b>, banco de desenvolvimento,
          extraído em {SELO} por <code>node docs/demo-fluxos/../../.tmp-demo/export-dados.mjs</code> para{" "}
          <code>dados-reais.json</code>. Os valores agregados que aparecem nas telas são os do banco;
          a linha do tempo de um veículo específico é a encenação do fluxo, não um registro histórico.
        </p>
        <p>
          <b>Como recompilar.</b> <code>node docs/demo-fluxos/build.mjs</code> — o esbuild empacota React
          e os dados dentro de cada arquivo, então os vídeos abrem por <code>file://</code>, sem servidor
          e sem rede. <b>Atalhos:</b> espaço reproduz e pausa, setas andam 5 segundos, os capítulos
          embaixo saltam direto para a cena.
        </p>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("raiz")).render(<Hub />);
