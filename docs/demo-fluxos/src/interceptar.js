/* ============================================================================
   Interceptador de rede do espelho.

   Este módulo tem que rodar ANTES de qualquer módulo do frontend ser avaliado —
   por isso ele é importado primeiro, e por efeito colateral. O esbuild preserva
   a ordem de avaliação dos imports.

   O que ele faz: troca `fetch` e semeia o `localStorage` com a sessão gravada,
   de modo que os componentes REAIS de frontend/src rodem sem backend e sem
   passar pela seleção de organização.

   O que ele NÃO faz: inventar resposta. Se o vídeo pedir um endereço que não
   está no snapshot, isso vira uma FALTA registrada em `window.__espelhoFaltas`
   — e a verificação quebra por causa dela. Preferimos o vídeo falhar na bancada
   a mentir na apresentação.
   ========================================================================== */

import snapshot from "../snapshot-api.json";

const faltas = [];
window.__espelhoFaltas = faltas;
window.__espelhoAcertos = 0;

/** Mesma normalização do gravador: método + caminho + query ordenada. */
function chaveDe(metodo, url) {
  const u = new URL(url, "http://localhost:3000");
  const params = [...u.searchParams.entries()].sort(([a], [b]) => a.localeCompare(b));
  const busca = params.length ? "?" + params.map(([k, v]) => `${k}=${v}`).join("&") : "";
  return `${metodo.toUpperCase()} ${u.pathname}${busca}`;
}

/* Sessão e organização ativa, para o app nascer dentro da casca em vez de no
   /select-context. O token gravado é o literal "video-sem-token": o snapshot
   nunca carrega credencial (§2.8). */
for (const [chave, valor] of Object.entries(snapshot.armazenamento ?? {})) {
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* modo privado: o app cai no estado sem sessão, que também é honesto */
  }
}

const fetchOriginal = window.fetch.bind(window);

window.fetch = async (entrada, init = {}) => {
  const url = typeof entrada === "string" ? entrada : entrada?.url ?? String(entrada);
  const metodo = init.method ?? (typeof entrada === "object" ? entrada?.method : null) ?? "GET";

  if (!url.includes("/api/v1")) return fetchOriginal(entrada, init);

  const chave = chaveDe(metodo, url);
  let achado = snapshot.respostas[chave];

  // Segunda tentativa: mesmo caminho, query diferente. A tela pode paginar ou
  // filtrar de um jeito que o gravador não percorreu; o corpo da lista serve.
  if (!achado) {
    const semQuery = chave.split("?")[0];
    const alternativa = Object.keys(snapshot.respostas).find((k) => k.split("?")[0] === semQuery);
    if (alternativa) achado = snapshot.respostas[alternativa];
  }

  if (!achado) {
    faltas.push(chave);
    // Envelope vazio no formato do backend, para a tela mostrar o seu estado
    // vazio honesto em vez de quebrar.
    return new Response(JSON.stringify({ data: null, items: [], pagination: { total: 0 } }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  window.__espelhoAcertos += 1;
  return new Response(JSON.stringify(achado.corpo), {
    status: achado.status,
    headers: { "content-type": "application/json" },
  });
};

export const gravadoEm = snapshot.gravado_em;
export const totalRespostas = Object.keys(snapshot.respostas).length;
