#!/usr/bin/env node
// B-SAN3-06b — seções de pendências cujo corpo cita este bloco.
import { readFileSync } from "node:fs";

const lines = readFileSync(process.argv[2], "utf8").split("\n");
const sections = [];
let current = null;
lines.forEach((text, index) => {
  if (/^#{2,4} /.test(text)) {
    current = {
      headerLine: index + 1,
      id: (text.match(/^#{2,4} ([^\s(]+)/) ?? [])[1] ?? text,
      cites: [],
      status: null,
    };
    sections.push(current);
    return;
  }
  if (!current) return;
  if (/B-SAN3-06b/.test(text)) current.cites.push(index + 1);
  if (current.status === null && /^- status:/i.test(text)) {
    current.status = text.replace(/^- status:\s*/i, "").slice(0, 60);
  }
});
const matches = sections.filter((section) => section.cites.length);
console.log(
  `# seções = ${sections.length} · citam B-SAN3-06b = ${matches.length} · abertas = ${matches.filter((section) => /ABERTA|aberto/i.test(section.status ?? "")).length}`,
);
for (const section of matches) {
  console.log(
    `${section.headerLine} | ${section.id} | cita em l.${section.cites.join(",")} | status: ${section.status ?? "(sem linha de status)"}`,
  );
}
