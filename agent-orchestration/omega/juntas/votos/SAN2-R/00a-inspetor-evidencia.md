# Evidência do inspetor de terreno — SAN2-R (2026-08-29)

## Item 1 — Head e árvore

```
$ git rev-parse HEAD
edafadf666d351011addfee9013bd95c1e4957ef   (short: edafadf — bate com o mandato)

$ git status --porcelain
(vazio)

$ fsutil reparsepoint query node_modules
Erro: O arquivo ou pasta não é um ponto de nova análise.  (exit=1 → diretório REAL, não junction)
```

**Veredito parcial:** VERDE. Head é o nomeado (`edafadf`), árvore sem mutação viva, `node_modules` é diretório real (regra §C7.1-ter(c) respeitada).

## Item 2 — Diff que decide o quórum

```
$ git rev-parse origin/main
74430cc1d2e822e720a6762832ced36c3ca4baa8   (bate com a base do mandato)

$ git diff 74430cc..edafadf --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(VAZIO — exit 0, nenhuma linha)

$ git diff 74430cc..edafadf --name-status
M  AGENTS.md
M  CLAUDE.md
M  Kpis/app.js
M  Kpis/kpis-history.json
M  Kpis/kpis-latest.json
M  agent-orchestration/controle/decisoes.md
A  agent-orchestration/omega/POSTMORTEM-QUEDAS-2026-08-29.md
A  agent-orchestration/omega/juntas/BRIEFING-SAN2-R.md
A  agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md
```

**Veredito parcial:** VERDE. Zero toque em `src/ prisma/ tests/ scripts/ frontend/ mobile/ .github/ package-lock.json`.
Os 9 arquivos do diff pertencem todos às classes permitidas: `agent-orchestration/**` (3) · `Kpis/*` (3) ·
`CLAUDE.md` · `AGENTS.md`. Nota (não bloqueia, é mérito da cadeira de KPI): `Kpis/app.js` mudou mas
`Kpis/index.html` NÃO aparece no diff — a cadeira de KPI deve verificar se o §C3 exigia mexer no painel.

## Item 3 — Cadeiras, inelegibilidade e a divergência de head do briefing

```
$ git log --oneline 74430cc..edafadf
edafadf docs(junta): briefing da junta do SAN2-R — a junta roda sob o protocolo que julga
f8e84de docs(orquestracao): a junta passa a sobreviver a morte de quem a executa (SAN2-R)
9fd6ac6 feat(governanca): o teto do protocolo de dificuldade cai de 5 ciclos para 2 (D-TETO-DOIS-CICLOS)

$ git merge-base --is-ancestor f8e84de edafadf  → é ancestral
$ git diff f8e84de..edafadf --name-status
A  agent-orchestration/omega/juntas/BRIEFING-SAN2-R.md   (delta = SÓ o próprio briefing)
```

Briefing lido (`BRIEFING-SAN2-R.md`):
- **Cadeiras:** (1) diff/escopo [veto] · (2) forense [veto] · (3) KPI/registro — cobertura 1-para-1 com o
  que a entrega exige (diff de contrato/espelho · postmortem de 6 fatos · backfill+snapshot KPI). VERDE.
- **Inelegível:** "o orquestrador (escreveu o diff)" — declarado por escrito. O autor do postmortem é o
  mesmo orquestrador, logo a exclusão cobre também o conflito achador×julgador da cadeira forense. VERDE.
- **Plano de perda de jurado:** presente ("R2 emendada (P3): sucessor de caído re-executa o roteiro de
  evidência") — a ressalva R2 da junta B-O6R-REG foi absorvida. VERDE.
- **Quórum "maioria de 3":** sustenta-se contra o diff REAL medido no item 2 (zero código de produto;
  nada de dinheiro/segurança/permissão/perda de dado). VERDE.
- **DIVERGÊNCIA MEDIDA:** o briefing nomeia head `f8e84de`; o head real e o do mandato é `edafadf`.
  Explicação provada acima: `edafadf` acrescenta apenas o briefing (mesma situação da junta B-O6R-REG,
  `757485c`×`8c00fab`, consignada lá como N1). Não é contaminação — vira ressalva R1.

**Veredito parcial:** VERDE com 1 ressalva (head do briefing × head julgado).

