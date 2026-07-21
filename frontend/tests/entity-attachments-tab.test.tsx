import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { EntityAttachmentsView } from "../src/modules/attachments/components/EntityAttachmentsTab";
import { adaptAttachments } from "../src/modules/attachments/attachments.adapter";
import type { AttachmentView } from "../src/modules/attachments/attachments.types";

// PR-01 Ω4C — aba "Arquivos" polimórfica (front): composição AutEM recriada no DS do ERP.
// Cobre: render (Detalhes do Registro + tabela + colunas), estados §7 (loading/vazio/acesso não
// permitido/dados desatualizados), gating (canUpload/canDelete) e §2.8 (o adapter NUNCA projeta
// storageKey/fileUrl/checksum/tenant_id, mesmo se vierem no raw).

// Raw com campos INTERNOS que jamais podem vazar (§2.8), além da allow-list do DTO.
const RAW_WITH_SECRETS = {
  id: "att-1",
  entityType: "maintenance_order",
  entityId: "mo-1",
  fileName: "nota-fiscal.pdf",
  extension: "pdf",
  contentType: "application/pdf",
  sizeBytes: 20480,
  status: "stored",
  downloadPath: "/attachments/att-1/download",
  uploadedByName: "Maria Souza",
  uploadedAt: "2026-07-14T15:30:00.000Z",
  storageKey: "s3://bucket/secret/key.pdf",
  fileUrl: "https://bucket.s3/secret/file",
  checksum: "sha256:deadbeefcafe",
  tenant_id: "ten-secret-01",
};

function firstView(): AttachmentView {
  const [view] = adaptAttachments([RAW_WITH_SECRETS]);
  assert.ok(view, "adapter deveria produzir um view");
  return view;
}

type ViewProps = Parameters<typeof EntityAttachmentsView>[0];

function renderView(overrides: Partial<ViewProps> = {}): string {
  const base: ViewProps = {
    summary: [{ label: "Situação", value: "Agendada" }],
    items: [],
    loading: false,
    forbidden: false,
    source: "api",
    canUpload: true,
    canDelete: true,
    busy: false,
    feedback: null,
    filter: "",
    onFilterChange: () => {},
    onRefresh: () => {},
    onPickFile: () => {},
    onFileSelected: () => {},
    onDownload: () => {},
    onDelete: () => {},
  };
  return renderToString(<EntityAttachmentsView {...base} {...overrides} />);
}

test("render: Detalhes do Registro + tabela com colunas Data e Hora | Extensão | Tipo | Ações", () => {
  const html = renderView({ items: [firstView()] });
  assert.match(html, /Detalhes do Registro/);
  assert.match(html, /Situação/);
  assert.match(html, /Agendada/);
  assert.match(html, /Arquivos/);
  // Colunas do AutEM.
  assert.match(html, /Data e Hora/);
  assert.match(html, /Extensão/);
  assert.match(html, /<th[^>]*>Tipo<\/th>/);
  assert.match(html, /Ações/);
  // Conteúdo da linha: data formatada dd/mm HH:mm (America/Sao_Paulo → 12:30), extensão e tipo PT-BR.
  assert.match(html, /14\/07 12:30/);
  assert.match(html, /pdf/);
  assert.match(html, /PDF/);
  assert.match(html, /Disponível/);
  assert.match(html, /Baixar/);
});

test("estado §7 loading: skeleton (aria-busy) enquanto carrega e sem itens", () => {
  const html = renderView({ loading: true, items: [] });
  assert.match(html, /aria-busy="true"/);
});

test("estado §7 vazio: 'Nenhum registro encontrado'", () => {
  const html = renderView({ loading: false, items: [] });
  assert.match(html, /Nenhum registro encontrado/);
});

test("estado §7 acesso não permitido: forbidden mostra 'Acesso não permitido' e esconde a tabela", () => {
  const html = renderView({ forbidden: true, items: [] });
  assert.match(html, /Acesso não permitido/);
  assert.doesNotMatch(html, /Nenhum registro encontrado/);
});

test("estado §7 dados desatualizados: source=fallback mostra alerta honesto", () => {
  const html = renderView({ source: "fallback", items: [] });
  assert.match(html, /desatualizados/);
});

test("gating: canUpload=false esconde '+ Cadastrar Arquivo'; canUpload=true mostra", () => {
  const semUpload = renderView({ canUpload: false });
  assert.doesNotMatch(semUpload, /Cadastrar Arquivo/);

  const comUpload = renderView({ canUpload: true });
  assert.match(comUpload, /Cadastrar Arquivo/);
});

test("gating: canDelete=false esconde 'Excluir' na linha; canDelete=true mostra", () => {
  const semExcluir = renderView({ items: [firstView()], canDelete: false });
  assert.doesNotMatch(semExcluir, /Excluir/);

  const comExcluir = renderView({ items: [firstView()], canDelete: true });
  assert.match(comExcluir, /Excluir/);
});

test("§2.8: o adapter NUNCA projeta storageKey/fileUrl/checksum/tenant_id — nem no view nem no render", () => {
  const view = firstView();
  const serialized = JSON.stringify(view);
  assert.doesNotMatch(serialized, /storageKey|fileUrl|checksum|tenant_id/i);
  assert.doesNotMatch(serialized, /s3:\/\/|deadbeef|ten-secret/i);

  // O render também não pode conter qualquer resquício sensível.
  const html = renderView({ items: [view], canUpload: true, canDelete: true });
  assert.doesNotMatch(html, /s3:\/\/|deadbeef|ten-secret|bucket/i);

  // A allow-list permanece intacta (o que DEVE aparecer).
  assert.equal(view.fileName, "nota-fiscal.pdf");
  assert.equal(view.extension, "pdf");
  assert.equal(view.status, "stored");
});

test("adapter: descarta item sem id (D-007) e ordena por data desc", () => {
  const views = adaptAttachments([
    { id: "a", fileName: "antigo.pdf", uploadedAt: "2026-07-01T10:00:00.000Z", contentType: "application/pdf", status: "stored" },
    { fileName: "sem-id.pdf" },
    { id: "b", fileName: "novo.pdf", uploadedAt: "2026-07-10T10:00:00.000Z", contentType: "application/pdf", status: "stored" },
  ]);
  assert.equal(views.length, 2); // o item sem id foi descartado
  assert.equal(views[0].id, "b"); // mais recente primeiro
  assert.equal(views[1].id, "a");
});
