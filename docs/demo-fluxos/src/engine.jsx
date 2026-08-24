/* ============================================================================
   Motor do filme — relógio, interpolação e o vocabulário de tempo que os 4
   fluxos usam para descrever o que aparece em cada segundo.

   Um vídeo aqui não é um arquivo de vídeo: é um componente React que recebe o
   tempo `t` e se desenha. A vantagem para uma demonstração é que ele nunca
   desatualiza em relação ao produto — quando a tela muda, o vídeo muda junto.
   ========================================================================== */

import { useCallback, useEffect, useRef, useState } from "react";

/* ------------------------------------------------------------ interpolação */

export const trava = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const entre = (a, b, x) => a + (b - a) * x;

/** Progresso 0→1 dentro da janela [a, b]. Fora da janela, satura. */
export const jan = (t, a, b) => (b <= a ? (t >= b ? 1 : 0) : trava((t - a) / (b - a), 0, 1));

/** Saída suave — o movimento chega e assenta. */
export const suave = (x) => 1 - Math.pow(1 - trava(x), 3);
/** Entrada e saída suaves — para deslocamentos longos de câmera. */
export const suaveAmbos = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
/** Um passinho a mais no fim — para coisas que "pousam". */
export const pulo = (x) => {
  const c = 1.70158 + 1;
  const y = trava(x) - 1;
  return 1 + c * y * y * y + 1.70158 * y * y;
};

export const apos = (t, a) => t >= a;
export const dentro = (t, a, b) => t >= a && t < b;

/** Número que sobe de `de` até `ate` na janela [a, b]. */
export const conta = (t, a, b, de, ate) => Math.round(entre(de, ate, suave(jan(t, a, b))));

/** Contagem em dinheiro, com o separador brasileiro. */
export const brl = (v, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "28,045.00" (formato bruto do Postgres) → 28045 */
export const num = (s) => (typeof s === "number" ? s : Number(String(s).replace(/,/g, "")));

/** "28,045.00" → "28.045,00" */
export const dinheiro = (s, casas = 2) => brl(num(s), casas);

export const mmss = (s) => {
  const m = Math.floor(Math.max(0, s) / 60);
  const r = Math.floor(Math.max(0, s) % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* ---------------------------------------------------------------- relógio */

/**
 * Relógio do filme. `requestAnimationFrame` em vez de `setInterval` — a
 * animação acompanha o refresh da tela, e a aba em segundo plano não acumula
 * quadros atrasados (o delta é limitado a 100 ms por quadro).
 */
export function useRelogio(duracao, { autoplay = true, aoFim = "pausa" } = {}) {
  const [t, setT] = useState(0);
  const [tocando, setTocando] = useState(autoplay);
  const [velocidade, setVelocidade] = useState(1);
  const ref = useRef({ t: 0, ultimo: 0, raf: 0 });

  useEffect(() => {
    ref.current.t = t;
  }, [t]);

  useEffect(() => {
    if (!tocando) return undefined;
    ref.current.ultimo = performance.now();
    const passo = (agora) => {
      const st = ref.current;
      const dt = Math.min((agora - st.ultimo) / 1000, 0.1) * velocidade;
      st.ultimo = agora;
      let prox = st.t + dt;
      if (prox >= duracao) {
        if (aoFim === "repete") prox = 0;
        else {
          prox = duracao;
          setTocando(false);
        }
      }
      st.t = prox;
      setT(prox);
      st.raf = requestAnimationFrame(passo);
    };
    ref.current.raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(ref.current.raf);
  }, [tocando, velocidade, duracao, aoFim]);

  const irPara = useCallback(
    (segundo) => {
      const v = trava(segundo, 0, duracao);
      ref.current.t = v;
      setT(v);
    },
    [duracao],
  );

  const alternar = useCallback(() => {
    setTocando((p) => {
      if (!p && ref.current.t >= duracao - 0.01) irPara(0);
      return !p;
    });
  }, [duracao, irPara]);

  return { t, tocando, velocidade, setVelocidade, irPara, alternar, setTocando };
}

/* -------------------------------------------------------------- narrativa */

/** Índice do beat corrente. Os beats vêm ordenados por `t`. */
export function beatDe(beats, t) {
  let i = 0;
  for (let k = 0; k < beats.length; k += 1) if (t >= beats[k].t) i = k;
  return i;
}

/** Índice do capítulo corrente. */
export function capituloDe(capitulos, t) {
  let i = 0;
  for (let k = 0; k < capitulos.length; k += 1) if (t >= capitulos[k].t) i = k;
  return i;
}

/**
 * Posição das superfícies no palco.
 *
 * O foco é uma string por beat ("web" | "mobile" | "ambos" | "titulo"). A
 * câmera não corta: interpola entre os alvos, e é o `transition` do CSS que
 * faz o movimento. Cada alvo é [x, y, escala, opacidade].
 */
export const ALVOS = {
  web: {
    web: [-150, -30, 0.90, 1],
    telefone: [640, 6, 0.68, 0.45],
  },
  mobile: {
    web: [-980, -20, 0.66, 0.26],
    telefone: [30, -46, 0.78, 1],
  },
  ambos: {
    web: [-355, -22, 0.70, 1],
    telefone: [500, -20, 0.76, 1],
  },
  titulo: {
    web: [-430, 60, 0.66, 0.13],
    telefone: [545, 60, 0.66, 0.13],
  },
};

/* Âncoras do feixe no arranjo "ambos", em coordenadas do cenário (1500x880).
   Derivadas dos ALVOS acima: borda direita da janela web (395 + 1180*0.70/2) e
   borda esquerda do aparelho (1250 - 392*0.76/2). Se os ALVOS mudarem, mudam. */
export const FEIXE_DE = [808, 419];
export const FEIXE_PARA = [1101, 419];

export function estiloSuperficie(alvo, ancora) {
  const [x, y, s, o] = alvo;
  return {
    transform: `translate(-50%, -50%) translate(${x}px, ${y}px) scale(${s})`,
    opacity: o,
    left: "50%",
    top: "50%",
    ...ancora,
  };
}

/* ------------------------------------------------------------------ teclado */

export function useTeclado({ alternar, irPara, t, duracao }) {
  useEffect(() => {
    const aoTeclar = (ev) => {
      const alvo = ev.target;
      if (alvo && (alvo.tagName === "INPUT" || alvo.tagName === "TEXTAREA")) return;
      if (ev.code === "Space" || ev.key === "k") {
        ev.preventDefault();
        alternar();
      } else if (ev.key === "ArrowRight") {
        ev.preventDefault();
        irPara(t + 5);
      } else if (ev.key === "ArrowLeft") {
        ev.preventDefault();
        irPara(t - 5);
      } else if (ev.key === "Home" || ev.key === "0") {
        ev.preventDefault();
        irPara(0);
      } else if (ev.key === "End") {
        ev.preventDefault();
        irPara(duracao);
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [alternar, irPara, t, duracao]);
}

/** Escala o cenário (1500×880) para caber no palco, sem cortar. */
export function useEscalaPalco(largura = 1500, altura = 880) {
  const ref = useRef(null);
  const [escala, setEscala] = useState(1);
  useEffect(() => {
    const medir = () => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      setEscala(Math.min(r.width / largura, r.height / altura));
    };
    medir();
    const obs = new ResizeObserver(medir);
    if (ref.current) obs.observe(ref.current);
    window.addEventListener("resize", medir);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, [largura, altura]);
  return { ref, escala };
}
