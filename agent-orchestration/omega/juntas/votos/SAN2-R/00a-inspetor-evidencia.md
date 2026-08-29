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


---

## Re-execução pelo sucessor (P3) — 2026-08-29

Sucessor do inspetor caído (queda #1 do registro P6). Cada comando do roteiro acima foi **re-executado
e comparado** com a saída registrada — nenhuma conclusão foi herdada sem comando.

```
$ git rev-parse HEAD
4b547e3f65ea5bc4566a6da931dfa15ead65af11   (era edafadf no roteiro — drift antecipado pelo mandato, medido abaixo)

$ git status --porcelain
(vazio, exit 0)

$ fsutil reparsepoint query node_modules
Erro: O arquivo ou pasta não é um ponto de nova análise.  (exit=1 → diretório REAL — igual ao registrado)

$ git rev-parse origin/main
74430cc1d2e822e720a6762832ced36c3ca4baa8   (igual ao registrado)

$ git diff 74430cc..edafadf --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(VAZIO, ec=0 — igual ao registrado)

$ git diff 74430cc..edafadf --name-status
(mesmos 9 arquivos, byte a byte, do roteiro)

$ git log --oneline 74430cc..edafadf
(mesmos 3 commits: edafadf · f8e84de · 9fd6ac6)

$ git merge-base --is-ancestor f8e84de edafadf   → ec=0 (ancestral, igual ao registrado)
$ git diff f8e84de..edafadf --name-status        → só BRIEFING-SAN2-R.md (igual ao registrado)
```

### Medições NOVAS do sucessor (drift de head edafadf → 4b547e3)

```
$ git log --oneline edafadf..4b547e3
4b547e3 docs(junta): queda 1 da junta SAN2-R registrada no formato P6 — e o P1 pagou o proprio custo

$ git diff edafadf..4b547e3 --name-status
A  agent-orchestration/omega/juntas/votos/SAN2-R/00-quedas.md
A  agent-orchestration/omega/juntas/votos/SAN2-R/00a-inspetor-evidencia.md
(condição do mandato satisfeita: SÓ arquivos em votos/SAN2-R/)

$ git merge-base --is-ancestor edafadf 4b547e3   → ec=0 (linear, sem rebase)

$ git diff 74430cc..4b547e3 --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(VAZIO, ec=0 — o escopo "zero código de produto" vale TAMBÉM no head atual)

$ git diff 74430cc..4b547e3 --name-status
(os mesmos 9 arquivos do roteiro + os 2 de votos/SAN2-R/ — nada mais)

$ git diff f8e84de..4b547e3 --name-status
(briefing + 2 arquivos de votos/SAN2-R/ — delta total do head do briefing ao head atual é só registro de junta)
```

**Conclusão da re-execução:** 9/9 comandos do roteiro CONFIRMADOS; o único item divergente (HEAD) divergiu
exatamente como o mandato antecipou, e o delta foi medido como registro de junta puro. Parecer em
`00a-inspetor-parecer.md`.
