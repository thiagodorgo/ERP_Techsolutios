/* ============================================================================
   O que os 4 fluxos compartilham: os dados reais, o menu do ERP e a identidade
   de quem opera. Um lugar só — se o produto mudar, muda aqui.
   ========================================================================== */

import dados from "../dados-reais.json";

export { dados };

export const ORG = dados.organizacao;

/** Carimbo de honestidade exibido em todo vídeo. */
export const SELO = new Date(dados.gerado_em).toLocaleDateString("pt-BR", {
  day: "2-digit", month: "2-digit", year: "numeric",
});

export const DESPACHANTE = { iniciais: "DR", nome: "Diego Ramos", papel: "Operação de Despacho" };
export const GESTOR = { iniciais: "AD", nome: "Admin Demo", papel: "Administrador" };
export const FINANCEIRO = { iniciais: "BL", nome: "Beatriz Lima", papel: "Financeiro" };

/** Menu do console. Os nomes são rótulos de negócio — nunca termo técnico (§3). */
export const MENU = [
  {
    grupo: "OPERAÇÃO",
    itens: [
      { nome: "Dashboard", icone: "dashboard" },
      { nome: "Ordens de Serviço", icone: "os" },
      { nome: "Despachos", icone: "despachos" },
      { nome: "Mapa Operacional", icone: "mapa" },
      { nome: "Checklists", icone: "checklists" },
    ],
  },
  {
    grupo: "PÁTIOS",
    itens: [
      { nome: "Painel", icone: "patios" },
      { nome: "Processos", icone: "docs" },
      { nome: "Vagas", icone: "camadas" },
    ],
  },
  {
    grupo: "FINANCEIRO",
    itens: [
      { nome: "Contas", icone: "financeiro" },
      { nome: "Títulos", icone: "titulos" },
      { nome: "Tabelas de Valores", icone: "precos" },
    ],
  },
];

/* --------------------------------------------------- atalhos de formatação */

export const CORES = {
  azul: "#2563eb", verde: "#10b981", ambar: "#f59e0b",
  vermelho: "#ef4444", roxo: "#8b5cf6", cinza: "#64748b",
};

/** Busca uma linha do JSON por chave/valor, para o vídeo nunca inventar número. */
export function acha(lista, chave, valor) {
  return (lista || []).find((x) => x[chave] === valor);
}

export function somaPor(lista, filtro, campo = "qtd") {
  return (lista || []).filter(filtro).reduce((s, x) => s + Number(x[campo] || 0), 0);
}
