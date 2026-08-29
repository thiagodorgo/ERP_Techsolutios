# SAN2-1R — Evidência do inspetor de terreno (00a)

Inspetor: `inspetor-de-terreno-da-junta` (4ª tentativa — rodando em `general-purpose` pela
exceção contratual de indisponibilidade de modelo; pin `fable` caiu 3× consecutivas neste
gate, registro em `votos/SAN2-1R/00-quedas.md`). Identidade nova; nada dos caídos é insumo.

Data: 2026-08-29. Worktree: `.claude/worktrees/san2-1` · branch `chore/san2-1-resgate`.

---

## Item 1 — Head e árvore

Comandos executados (todos no worktree, 2026-08-29):

```
$ git rev-parse HEAD
31cd9adc0a052d3fa03a7b757a3dc6d92a8fc144        # = 31cd9ad esperado ✔

$ git branch --show-current
chore/san2-1-resgate                             # ✔

$ git status --porcelain -uall
?? agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas.md
# único untracked = o registro de quedas esperado pelo mandato ✔
# nenhum tracked modificado; árvore sem mutação viva ✔

$ fsutil reparsepoint query ...\san2-1\node_modules
Erro: O arquivo ou pasta não é um ponto de nova análise. (exit=1)
# node_modules é DIRETÓRIO REAL, sem junction/symlink ✔ (regra §C7.1-ter(c))
```

**Veredito do item 1: LIMPO.** Head confere, árvore contém apenas o registro de quedas,
`node_modules` não é reparse point.

---

## Item 2 — Quórum (diff contra a base)

```
$ git rev-parse origin/main
a0a10750bf2d4fa4d322adea4d262578b0bf1d9f         # = a0a1075 esperado ✔

$ git merge-base a0a1075 31cd9ad
a0a10750...                                       # base é ancestral direto — branch linear ✔

$ git diff a0a1075..31cd9ad --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(VAZIO)                                           # ✔ sustenta MAIORIA-DE-3 (nenhum caminho de código tocado)

$ git diff a0a1075..31cd9ad --name-status         # 21 caminhos, todos M/A:
M AGENTS.md · M CLAUDE.md · M Kpis/app.js · M Kpis/kpis-history.json · M Kpis/kpis-latest.json
M agent-orchestration/controle/decisoes.md
A agent-orchestration/controle/gerar-indice-pendencias.py
A agent-orchestration/controle/pendencias-indice.md
M agent-orchestration/controle/pendencias.md
A agent-orchestration/omega/juntas/BRIEFING-SAN2-1.md
A agent-orchestration/omega/juntas/BRIEFING-SAN2-1R.md
A agent-orchestration/omega/juntas/votos/SAN2-1/00a-inspetor-terreno-passada2.md
A agent-orchestration/omega/juntas/votos/SAN2-1/00b-perda-de-inspetor.md
A agent-orchestration/omega/juntas/votos/SAN2-1/03-jurado-kpi-registro-ciclo2.json
A agent-orchestration/omega/juntas/votos/SAN2-1/04-jurado-triagem-ciclo2.json
M agent-orchestration/omega/juntas/votos/SAN2-R/00-quedas.md
A agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-evidencia.md
A agent-orchestration/omega/juntas/votos/SAN2-R/00c-porteiro-pos-merge-361.md
A agent-orchestration/omega/reprovacoes/DOSSIE-SAN2-1-parada.md
A agent-orchestration/omega/reprovacoes/R-SAN2-1-ciclo1.md
M docs/limpeza-de-disco.md

$ git diff a0a1075..31cd9ad --name-only | grep -vE '^(agent-orchestration/|docs/|Kpis/|CLAUDE\.md$|AGENTS\.md$)'
(sem saída — exit 1)                              # ✔ ZERO caminho fora da lista permitida

$ git log --oneline a0a1075..31cd9ad
31cd9ad docs(junta): briefing da junta do SAN2-1R
8860fc3 docs(resgate): o que as juntas verificaram entra; a etiqueta que mentia sai (SAN2-1R, opcao C)

$ git diff 8860fc3..31cd9ad --name-status
A agent-orchestration/omega/juntas/BRIEFING-SAN2-1R.md
# ✔ confere com o mandato: conteúdo em 8860fc3; 31cd9ad = SÓ o briefing
```

Observação (não bloqueia, fica para a cadeira de diff): `gerar-indice-pendencias.py` é um
script Python, mas vive em `agent-orchestration/controle/` (caminho permitido) — NÃO está em
`scripts/` nem entra em nenhuma bateria de CI; é ferramenta documental do índice de pendências.

**Veredito do item 2: LIMPO.** Diff de código VAZIO → maioria-de-3 sustentada; todos os 21
caminhos dentro da lista permitida; branch linear com exatamente os 2 commits declarados.

---

## Item 3 — Terreno da junta

**3a. As 3 cadeiras cobrem a competência?** SIM. O briefing (`BRIEFING-SAN2-1R.md`, lido no
head) lista 7 itens de conferência; mapeamento completo:
- Cadeira 1 **fidelidade à opção C** (veto) → itens 1 (etiqueta das 79), 2 (P-036 duplicata),
  3 (tripwire de tarifa fora do balde C), 4 (P-SAN2-LEITURA-DAS-79 com dono/prazo/critério).
- Cadeira 2 **diff/portagem/append-only** (veto) → itens 6 (portagem sem reescrita; decisoes.md
  da main é prefixo do novo) e 7 (diff de código vazio + bateria), mais o único arquivo
  executável do diff (`gerar-indice-pendencias.py`, dentro de caminho permitido).
- Cadeira 3 **KPI/registro** → item 5 (dívidas do porteiro do #361: backfill, §C7 renumerado
  idêntico nos DOIS contratos, artefatos SAN2-R) + `Kpis/app.js`/`kpis-latest`/`kpis-history`.
Nenhum item do briefing fica sem cadeira; a natureza do diff (documental/registro, zero código
de produto) não exige competência de banco, concorrência ou frontend.

**3b. Orquestrador inelegível?** SIM — declarado no briefing, por papel e motivo: "Inelegível:
o orquestrador (autor do diff e do resgate)". É o autor dos 2 commits; papel único e inequívoco.

**3c. Enquadramento perante a `D-TETO-DOIS-CICLOS`?** CORRETO. A decisão (decisoes.md:1748,
citação literal do dono) manda: 2 ciclos → **para e chama o dono**. Medido no repo: o SAN2-1
rodou ciclo 1 (`R-SAN2-1-ciclo1.md`) e ciclo 2 (votos `03-`/`04-…ciclo2.json`), foi PARADO, e o
dossiê foi ao dono (`DOSSIE-SAN2-1-parada.md`, com as 4 opções A–D e recomendação C). O SAN2-1R
executa a intervenção humana que o teto exige — é o desfecho previsto pelo protocolo, não uma
3ª rodada de execução/reexecução do mesmo bloco. O próprio briefing ainda se autolimita:
"Ciclo 1 de 2 (D-TETO-DOIS-CICLOS)". Enquadramento "bloco NOVO executando decisão do dono" é
fiel à letra e ao propósito da decisão.
  - *Lacuna de registro (vira ressalva, não bloqueio):* a ESCOLHA do dono pela opção C não tem
    entrada própria em `decisoes.md` (grep por "opção C"/"resgate" só encontra o briefing e as
    etiquetas de `pendencias.md`). A mesma lição registrada na `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`
    ("decisão do dono vive no repositório, não na memória do agente") se aplica.

**3d. Nenhum jurado precisa de banco?** CONFIRMADO. Diff de código VAZIO (item 2); a bateria do
briefing (16/16 · 6/6 · freeze em dia · índice idempotente) é executável com node/python sobre
arquivos do repo — nenhuma verificação alcança `erp-postgres`/`erp-redis`, nenhum cluster
descartável por jurado é necessário. Nenhum jurado muta a árvore além do próprio arquivo de
voto em `votos/SAN2-1R/` (ver ressalva operacional sobre a checagem de idempotência do índice).

**Veredito do item 3: LIMPO, com 2 ressalvas de registro e 1 operacional (numeradas no parecer).**
