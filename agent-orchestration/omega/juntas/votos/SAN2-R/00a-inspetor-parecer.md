# Parecer do inspetor de terreno — junta SAN2-R (2026-08-29)

**Emitido pelo sucessor** (regra P3): o inspetor original mediu os 3 itens, persistiu a evidência em
`00a-inspetor-evidencia.md` e caiu escrevendo o parecer. Este sucessor **re-executou cada comando do
roteiro e comparou** — não redescobriu. Re-execução completa apensada ao arquivo de evidência.

## Itens re-executados × registrados

| # | Comando | Registrado (caído) | Re-executado (sucessor) | Status |
|---|---|---|---|---|
| 1 | `git rev-parse HEAD` | `edafadf` | `4b547e3` | **DIVERGIU-ESPERADO** — drift antecipado pelo mandato; delta medido = só `votos/SAN2-R/` (item 10) |
| 2 | `git status --porcelain` | vazio | vazio (exit 0) | CONFIRMADO |
| 3 | `fsutil reparsepoint query node_modules` | exit 1 (dir real) | exit 1 (dir real) | CONFIRMADO — sem junction (§C7.1-ter(c)) |
| 4 | `git rev-parse origin/main` | `74430cc` | `74430cc` | CONFIRMADO |
| 5 | `git diff 74430cc..edafadf --stat -- src prisma tests scripts frontend mobile .github package-lock.json` | vazio | vazio (ec=0) | CONFIRMADO — zero código de produto |
| 6 | `git diff 74430cc..edafadf --name-status` | 9 arquivos (contratos·Kpis·orquestração) | mesmos 9 | CONFIRMADO |
| 7 | `git log --oneline 74430cc..edafadf` | 3 commits | mesmos 3 | CONFIRMADO |
| 8 | `git merge-base --is-ancestor f8e84de edafadf` | ancestral | ec=0 | CONFIRMADO |
| 9 | `git diff f8e84de..edafadf --name-status` | só o briefing | só o briefing | CONFIRMADO |

## Medições novas (o drift de head, fechado por execução)

| # | Comando | Resultado | Leitura |
|---|---|---|---|
| 10 | `git diff edafadf..4b547e3 --name-status` | só `00-quedas.md` + `00a-inspetor-evidencia.md` | condição do mandato satisfeita: commits novos são registro de junta puro |
| 11 | `git merge-base --is-ancestor edafadf 4b547e3` | ec=0 | história linear, sem rebase |
| 12 | `git diff 74430cc..4b547e3 --stat -- src prisma tests …` | vazio (ec=0) | escopo "zero código de produto" vale também no head ATUAL — o quórum maioria-de-3 do briefing sustenta-se contra o head que a junta vai olhar |
| 13 | `git diff f8e84de..4b547e3 --name-status` | briefing + 2 de `votos/SAN2-R/` | delta total do head do briefing ao atual é só registro de junta |

Briefing (`BRIEFING-SAN2-R.md`) relido pelo sucessor: cadeiras 1:1 com a entrega (diff/escopo·forense·
KPI/registro), inelegibilidade do orquestrador declarada, plano de perda de jurado presente (P3, já
exercitado por esta própria sucessão), ciclo 1 de 2 sob `D-TETO-DOIS-CICLOS`. Confere com o registrado.

## Ressalvas

- **R1 (herdada do caído, ampliada e fechada por medição):** o briefing nomeia head `f8e84de`; a junta
  julgará sob `4b547e3`. O delta completo (item 13) é briefing + registro de junta — **não é contaminação**
  (mesmo padrão N1 da junta B-O6R-REG). Jurados: a ENTREGA a julgar são os 9 arquivos do diff
  `74430cc..4b547e3` FORA de `votos/SAN2-R/` (idênticos, medido, aos de `74430cc..edafadf`).
- **R2 (herdada do caído — nota de mérito para a cadeira de KPI/registro):** `Kpis/app.js` mudou e
  `Kpis/index.html` NÃO aparece no diff; a cadeira 3 verifica se o §C3 exigia tocar o painel.
- **R3 (nova):** o registro da junta muta durante a junta por desenho (P1 — evidência incremental) e este
  parecer + apenso ficam **untracked** (mandato proíbe commit). Jurado que rodar `git status --porcelain`
  verá `??` em `votos/SAN2-R/` — isso é o registro da própria junta, **não** mutação de terreno; nada fora
  de `votos/SAN2-R/` pode aparecer untracked.
- **Nota (não bloqueia):** o roteiro não registrou baseline `npm run check` — coerente com o diff de código
  de produto VAZIO (itens 5 e 12): não há o que o baseline medir que a `main` já não cubra; a bateria da
  cadeira 3 re-executa o que o briefing exige.

## Veredito

**LIBERADO COM RESSALVA** para a junta de 3 cadeiras do `BRIEFING-SAN2-R.md` (quórum maioria de 3),
com R1–R3 em destaque no briefing dos jurados.

**Limpeza:** nada foi criado além dos dois arquivos do mandato (este parecer + apenso à evidência);
nenhum container, worktree ou temporário aberto por este inspetor.
