/* ============================================================================
   Sala de projeção — a moldura comum dos 4 vídeos.

   O fluxo entrega: duração, capítulos, beats (narração + legenda técnica),
   feixes (as travessias web↔mobile) e dois componentes que se desenham em
   função do tempo. Esta moldura cuida do resto: câmera, transporte, cartelas.
   ========================================================================== */

import { useEffect, useRef } from "react";
import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import {
  ALVOS, FEIXE_DE, FEIXE_PARA, beatDe, capituloDe, estiloSuperficie, jan, mmss,
  useEscalaPalco, useRelogio, useTeclado,
} from "./engine.jsx";
import { Aparelho, Feixe, Navegador } from "./kit.jsx";

/**
 * O console web dentro do vídeo é o PRODUTO, não um desenho dele: um iframe
 * carregando espelho.html, que monta frontend/src/App.tsx com o snapshot do
 * sistema no lugar da rede.
 *
 * Vive em iframe por dois motivos concretos: o CSS do produto e o do filme
 * nunca se encostam, e `100vh` lá dentro vale os 700px do quadro.
 *
 * A rota muda por postMessage — trocar o src recarregaria o app a cada cena.
 */
function EspelhoWeb({ rota }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current?.contentWindow?.postMessage({ tipo: "espelho:rota", rota }, "*");
  }, [rota]);
  return (
    <div className="espelho-moldura">
    <iframe
      ref={ref}
      className="espelho-quadro"
      src={`espelho.html#${encodeURIComponent(rota)}`}
      title="Console web do ERP TechSolutions"
      loading="eager"
    />
    </div>
  );
}

const VELOCIDADES = [0.5, 1, 1.5, 2];

export function Filme({ fluxo }) {
  const { t, tocando, velocidade, setVelocidade, irPara, alternar } = useRelogio(fluxo.duracao);
  useTeclado({ alternar, irPara, t, duracao: fluxo.duracao });
  const { ref: refPalco, escala } = useEscalaPalco();
  const refTrilha = useRef(null);

  const iBeat = beatDe(fluxo.beats, t);
  const beat = fluxo.beats[iBeat];
  const iCap = capituloDe(fluxo.capitulos, t);

  const foco = beat.superficie === "titulo" ? "titulo" : beat.superficie;
  const alvos = ALVOS[foco] || ALVOS.ambos;

  const feixe = fluxo.feixes.find((f) => t >= f.t0 && t <= f.t1);
  const progFeixe = feixe ? jan(t, feixe.t0, feixe.t1) : 0;

  const abertura = fluxo.abertura;
  const fecho = fluxo.fecho;
  const opAbertura = abertura ? 1 - jan(t, abertura.ate - 0.7, abertura.ate) : 0;
  const opFecho = fecho ? jan(t, fecho.de, fecho.de + 0.7) : 0;
  const emCartela = opAbertura > 0.02 || opFecho > 0.02;

  const aoClicarTrilha = (ev) => {
    const el = refTrilha.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    irPara(((ev.clientX - r.left) / r.width) * fluxo.duracao);
  };

  return (
    <div className="film">
      <header className="film-topo">
        <a className="voltar" href="index.html">&#8592; Fluxos</a>
        <span className="film-num" style={{ color: fluxo.cor, borderColor: fluxo.cor }}>
          FLUXO {String(fluxo.num).padStart(2, "0")}
        </span>
        <h1 className="film-titulo">{fluxo.titulo}</h1>
        <div className="film-sub">
          <span className="film-org">{fluxo.org}</span>
          <span>{fluxo.capitulos[iCap]?.nome}</span>
        </div>
      </header>

      <div className="palco" ref={refPalco}>
        <div className="cenario" style={{ transform: `scale(${escala})` }}>
          <div className="superficie" style={estiloSuperficie(alvos.web, { width: 1180 })}>
            <Navegador rota={fluxo.rota(t)}>
              <EspelhoWeb rota={fluxo.rota(t)} />
            </Navegador>
          </div>

          <div className="superficie" style={estiloSuperficie(alvos.telefone, { width: 392 })}>
            <Aparelho><fluxo.Telefone t={t} /></Aparelho>
          </div>

          <Feixe de={FEIXE_DE} para={FEIXE_PARA} prog={progFeixe}
            etiqueta={feixe?.etiqueta} inverso={feixe?.dir === "mobile-web"} />
        </div>

        <div className="selo-dado">
          dados do banco vivo &middot; <b>{fluxo.selo}</b>
          <br />organização <b>{fluxo.org}</b>
        </div>

        {!emCartela ? (
          <div className="narracao">
            <p className="narracao-texto" key={iBeat}>{beat.narracao}</p>
            {beat.tec ? <div className="legenda-tec" key={`tec-${iBeat}`}>{beat.tec}</div> : null}
          </div>
        ) : null}

        {abertura && opAbertura > 0.02 ? (
          <div className="cartela" style={{ opacity: opAbertura }}>
            <div className="cartela-in">
              <div className="cartela-eyebrow" style={{ color: fluxo.cor }}>{abertura.eyebrow}</div>
              <h1>{abertura.titulo}</h1>
              <p>{abertura.texto}</p>
            </div>
          </div>
        ) : null}

        {fecho && opFecho > 0.02 ? (
          <div className="cartela" style={{ opacity: opFecho }}>
            <div className="cartela-in">
              <div className="cartela-eyebrow" style={{ color: fluxo.cor }}>{fecho.eyebrow}</div>
              <h1>{fecho.titulo}</h1>
              <p>{fecho.texto}</p>
              {fecho.numeros ? (
                <div className="cartela-nums">
                  {fecho.numeros.map((n) => (
                    <div className="cartela-num" key={n.rotulo}>
                      <b style={{ color: n.cor }}>{n.valor}</b><span>{n.rotulo}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <div className="transporte">
          <button className="tbtn" onClick={() => irPara(0)} title="Voltar ao início" aria-label="Voltar ao início">
            <RotateCcw size={15} />
          </button>
          <button className="tbtn" onClick={() => irPara(t - 5)} title="5 s atrás" aria-label="Cinco segundos atrás">
            <SkipBack size={15} />
          </button>
          <button className="tbtn tbtn--play" onClick={alternar}
            title={tocando ? "Pausar (espaço)" : "Reproduzir (espaço)"}
            aria-label={tocando ? "Pausar" : "Reproduzir"}>
            {tocando ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
          </button>
          <button className="tbtn" onClick={() => irPara(t + 5)} title="5 s à frente" aria-label="Cinco segundos à frente">
            <SkipForward size={15} />
          </button>

          <div className="trilha" ref={refTrilha} onClick={aoClicarTrilha}
            role="slider" tabIndex={0} aria-label="Linha do tempo"
            aria-valuemin={0} aria-valuemax={Math.round(fluxo.duracao)} aria-valuenow={Math.round(t)}>
            <div className="trilha-fundo" />
            <div className="trilha-preench" style={{ width: `${(t / fluxo.duracao) * 100}%` }} />
            {fluxo.capitulos.map((c) => (
              <i key={c.t} className={`marca-cap${t >= c.t ? " passou" : ""}`}
                style={{ left: `${(c.t / fluxo.duracao) * 100}%` }} />
            ))}
            <div className="trilha-bola" style={{ left: `${(t / fluxo.duracao) * 100}%` }} />
          </div>

          <div className="timecode"><b>{mmss(t)}</b> / {mmss(fluxo.duracao)}</div>

          <button className="tbtn tbtn--peq"
            onClick={() => setVelocidade(VELOCIDADES[(VELOCIDADES.indexOf(velocidade) + 1) % VELOCIDADES.length])}
            title="Velocidade de reprodução">
            {velocidade}&times;
          </button>
        </div>

        <div className="capitulos">
          {fluxo.capitulos.map((c, i) => (
            <button key={c.t} className={`cap${i === iCap ? " on" : ""}`} onClick={() => irPara(c.t + 0.05)}>
              <b>{mmss(c.t)}</b>{c.nome}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
