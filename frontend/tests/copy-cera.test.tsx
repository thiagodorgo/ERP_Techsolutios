import assert from "node:assert/strict";
import test from "node:test";

import React from "react";
import { renderToString } from "react-dom/server";

import { NotificationList } from "../src/modules/notifications/components/NotificationList";

// F12 pente-fino de copy (P-025): o estado vazio da central de notificações usa
// linguagem PT-BR de negócio, sem termo técnico ("tenant"/"inbox") e com acentos.
function renderEmptyNotifications(): string {
  return renderToString(
    <NotificationList notifications={[]} onArchive={() => {}} onMarkRead={() => {}} onOpen={() => {}} />,
  );
}

test("copy: estado vazio da central não expõe 'tenant' nem 'inbox'", () => {
  const html = renderEmptyNotifications();
  assert.doesNotMatch(html, /\btenant\b/i);
  assert.doesNotMatch(html, /\binbox\b/i);
});

test("copy: estado vazio usa a cópia PT-BR corrigida (organização, acentos)", () => {
  const html = renderEmptyNotifications();
  assert.match(html, /Nenhuma notificação encontrada/);
  assert.match(html, /A central exibirá eventos relevantes da sua organização aqui\./);
});
