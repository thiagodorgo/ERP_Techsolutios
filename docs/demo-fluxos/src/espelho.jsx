/* ============================================================================
   O ESPELHO — monta o console web REAL dentro do vídeo.

   Não é recriação: é `frontend/src/App.tsx`, com os mesmos componentes, o mesmo
   roteador e o mesmo CSS que rodam em produção. O que muda é só de onde vem o
   dado: em vez da rede, do snapshot gravado do sistema em operação.

   Consequência que é o ponto todo: mexeu na tela do produto, recompilou, o vídeo
   mudou junto. E o vídeo não consegue mostrar tela que não existe.

   Vive num iframe próprio de propósito — o CSS do produto e o CSS do filme não
   se encostam, e `100vh` dentro do quadro vale a altura do quadro.

   A rota vem do hash (espelho.html#/patios/painel) e também por postMessage,
   que é como o filme troca de tela sem recarregar.
   ========================================================================== */

import "./interceptar.js";

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, useNavigate } from "react-router-dom";

import { App } from "@erp/App";
import "@erp/styles/global.css";
import "@erp/styles/app.css";

const rotaInicial = () => decodeURIComponent(window.location.hash.slice(1)) || "/dashboard";

/** Leva o roteador real para onde o filme mandar, sem remontar o app. */
function Piloto({ rota }) {
  const navigate = useNavigate();
  useEffect(() => {
    if (rota) navigate(rota, { replace: true });
  }, [rota, navigate]);
  return null;
}

function Espelho() {
  const [rota, setRota] = useState(rotaInicial);

  useEffect(() => {
    const porHash = () => setRota(rotaInicial());
    const porMensagem = (ev) => {
      const d = ev.data;
      if (d && d.tipo === "espelho:rota" && typeof d.rota === "string") setRota(d.rota);
    };
    window.addEventListener("hashchange", porHash);
    window.addEventListener("message", porMensagem);
    return () => {
      window.removeEventListener("hashchange", porHash);
      window.removeEventListener("message", porMensagem);
    };
  }, []);

  return (
    <MemoryRouter initialEntries={[rota]}>
      <Piloto rota={rota} />
      <App />
    </MemoryRouter>
  );
}

createRoot(document.getElementById("raiz")).render(<Espelho />);

/* Avisa o filme (e a verificação) de que o espelho subiu e de quantas respostas
   ele serviu. É por aqui que o guard descobre que uma tela ficou sem dado. */
window.setTimeout(() => {
  window.parent?.postMessage(
    { tipo: "espelho:pronto", acertos: window.__espelhoAcertos, faltas: window.__espelhoFaltas },
    "*",
  );
}, 1500);
