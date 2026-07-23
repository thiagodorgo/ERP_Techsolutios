// Utilitário de exportação CSV compartilhado — promovido de AuditTenantPage (D-Ω4C-REM-CSV).
// Formato fixo, compatível com Excel pt-BR: BOM UTF-8 (acentuação correta), separador `;`, quebra `\r\n`.
// SEM dependência externa (proibido `exceljs`/nova dep). Exporta SOMENTE o dado real recebido do chamador —
// nunca fabrica linhas (D-007).

// Escapa uma célula: envolve em aspas quando contém `;`, aspas ou quebra de linha; aspas internas duplicadas.
export function csvCell(value: string): string {
  return /[";\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

// Serializa cabeçalho + linhas em uma string CSV (separador `;`, quebra `\r\n`), com escape por célula.
export function buildCsv(header: readonly string[], rows: readonly (readonly string[])[]): string {
  return [header, ...rows].map((cells) => cells.map(csvCell).join(";")).join("\r\n");
}

// Monta o Blob com BOM UTF-8 e dispara o download no navegador. Guardado para ambientes sem DOM
// (SSR/testes → no-op silencioso). Comportamento no navegador idêntico ao exportador original da Auditoria.
export function downloadCsv(filename: string, header: readonly string[], rows: readonly (readonly string[])[]): void {
  const csv = buildCsv(header, rows);
  if (typeof document === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return;
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
