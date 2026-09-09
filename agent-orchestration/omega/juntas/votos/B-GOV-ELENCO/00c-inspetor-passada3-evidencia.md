# Inspetor de terreno — `B-GOV-ELENCO`, passada 3 · EVIDÊNCIA INCREMENTAL (§C7.7 P1)

Cada item é apensado assim que medido. Comando · saída · veredito parcial. Todo comando com `git -C <wt>` ou
caminho absoluto; `wt` = `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`.
Árvore principal não tocada nem lida. Mandato: 3 itens (P4) — re-medir SÓ o que mudou desde o BLOQUEADO da passada 2.

## 0 · Estado do terreno ANTES de eu escrever qualquer coisa

- `git -C <wt> rev-parse HEAD` → `024661925ba7e0656266f71b28e8aaec7419afb8` (curto `02466192`) · branch `chore/gov-auditoria-elenco`
- `git -C <wt> status --porcelain | wc -l` → **0** (vazio), medido ANTES de este arquivo existir
- `git -C <wt> log --oneline 25c0112a..HEAD` → 4 commits: `653da3c6` · `23285d2d` · `911ed749` · **`02466192`** (o conserto, novo desde a passada 2)
- `git -C <wt> diff --name-status 911ed749..02466192` → **3 caminhos**, todos sob `agent-orchestration/omega/juntas/`:
  `M BRIEFING-B-GOV-ELENCO.md` (+19/-3) · `A votos/B-GOV-ELENCO/00b-inspetor-passada2-evidencia.md` · `A votos/B-GOV-ELENCO/00b-inspetor-passada2.md`
- **Nota de protocolo:** este arquivo e o parecer final (`00c-inspetor-passada3.md`) são os ÚNICOS caminhos que eu
  escrevo (P1/P2). Depois deles, `status --porcelain` mostrará exatamente esses dois `??`.

## ITEM 1 · Os três consertos que nomeei no BLOQUEADO da passada 2 → **VERDE nos três**

**(1) A regra de escopo do briefing é VERDADEIRA no head `02466192`?** — **SIM.**
- Regra escrita agora (l.15-20): `git -C <wt> diff --name-only 25c0112a..$(rev-parse HEAD)` com **qualquer** caminho
  fora de **`agent-orchestration/`** = achado `dentro-do-bloco`, **bloqueia**.
- Medido: `git -C <wt> diff --name-only 25c0112a..HEAD` → **N=6** caminhos:
  ```
  agent-orchestration/controle/pendencias.md
  agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-quedas.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00b-inspetor-passada2-evidencia.md
  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00b-inspetor-passada2.md
  ```
  `| grep -vc '^agent-orchestration/'` → **0**. (Controle: `grep -vc '^agent-orchestration/omega/juntas/'` → **1**,
  o `pendencias.md` — o prefixo antigo continuaria falso; o novo é verdadeiro.)
- **Coerência com o §5 do plano** (l.77-85, plano **inalterado** desde `25c0112a`: `diff --stat` → 0 linhas). O §5
  permite, em registro: `agent-orchestration/controle/{decisoes,pendencias,aposentadoria-especialistas}.md` e
  `agent-orchestration/omega/{planos,juntas}/**`. Os 6 caminhos medidos caem **todos** nesses dois itens
  (1 em `controle/pendencias.md`, 5 em `omega/juntas/**`). A regra do briefing e o §5 concordam no head a julgar.
  Observação inerte: o prefixo `agent-orchestration/` é um **superconjunto** dos caminhos de registro do §5
  (cobriria também `agent-orchestration/docs/`, `codex/`), mas nenhum caminho nesse vão existe no delta — a
  folga não é exercida; e para o delta pós-congelamento a regra é **mais estrita** que o §5 (bloqueia até
  `.claude/**`, que o §5 permite), o que é o desejado: código/elenco congelados em `25c0112a`.
- Melhoria colateral medida: a regra trocou `--name-status` por `--name-only`. Com `--name-status`, cada linha
  começa por `M\t`/`A\t` e um `grep -vc '^agent-orchestration/'` contaria **todas** as linhas como "fora" — a forma
  antiga não era mecanicamente aplicável; a nova é.

**(2) Os dois `00b-*` estão comitados?** — **SIM.**
- `git -C <wt> ls-files --error-unmatch <os dois>` → lista os dois, **ec=0**.
- `git -C <wt> log --diff-filter=A -- <os dois>` → `02466192 docs(junta): corrige a regra de escopo…`.
- `git -C <wt> status --porcelain | grep -c '00b-'` → **0** (nenhum `??`).

**(3) A referência da l.4 aponta para o nome certo?** — **SIM.**
- `grep -oE 'votos/B-GOV-ELENCO/00-inspetor-terreno[^)`]*'` → `votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md`;
  `test -f` no worktree → **existe**. Ocorrências do nome antigo `00-inspetor-terreno.md` → **0**.

Nota cosmética (não bloqueia, não é ressalva): o cabeçalho l.3 ainda diz "**PASSADA 2**" e o bloco l.22 se
intitula "Correção da passada 3". O texto é legível em contexto; registro para o orquestrador decidir.

**Veredito parcial 1: os três consertos entraram e são verdadeiros no head. VERDE.**

## ITEM 2 · As duas precisões da receita entraram no §7? → **VERDE**

- `grep -nE 'Duas precisões medidas pelo inspetor|a partir do worktree|arrastaria|copie-os também'` → **l.127-130**, dentro do §7
  (l.102) e antes do §8 (l.132). Texto: **(a)** "rode a receita **a partir do worktree** — ali `.claude/` tem só `agents/`
  e `skills/`; a partir da árvore principal, `cp -r .claude` arrastaria `.claude/worktrees/` inteiro"; **(b)** "A cópia
  leva só o que o auditor **lê**; se a sua mutação for em `CLAUDE.md`, `AGENTS.md` ou `Kpis/*`, copie-os também."
  São as duas notas que nomeei, com a premissa e a consequência.
- Premissa de (a) re-medida no head: `ls -A <wt>/.claude` → `agents` `skills` (só isso).

**Por que NÃO re-executo a receita e reaproveito a medição da passada 2 (0 → 1 → 0 na cópia, 0 → 0 → 0 no worktree):**
1. O bloco ```` ```bash ```` do §7 extraído de `911ed749:` e de `02466192:` → 10 linhas cada, **md5 idêntico**
   (`2aed39f1…`). A receita que provei é a mesma, byte a byte.
2. Os insumos que a receita copia e o auditor lê não mudaram: `git rev-parse 911ed749:<d>` = `HEAD:<d>` para
   `.claude` (`29800864`), `.agents` (`762bbefb`), `scripts` (`59be3822`), `Kpis` (`fbb9ad1d`) — **mesmo objeto tree**.
   E `scripts/audit-agents-skills.mjs` md5 `a8d5122c` e a `SKILL.md` mutada na passada 2 md5 `266f93e7` são iguais em
   blob `911ed749`, blob `HEAD` e árvore (`266f93e7` é o valor que registrei na passada 2).
3. O único delta `911ed749..HEAD` é texto de registro (3 caminhos em `omega/juntas/`, Item 0).
Receita igual + entrada igual = mesma saída; re-rodar só provaria determinismo do `cp`. O que mudou (texto) eu li.

**Veredito parcial 2: as duas precisões estão escritas e a medição que as motivou permanece válida. VERDE.**

## ITEM 3 · Terreno limpo no head `02466192` → **VERDE**

| medição | comando (forma) | resultado |
|---|---|---|
| head | `git -C <wt> rev-parse HEAD` | `024661925ba7e0656266f71b28e8aaec7419afb8` · branch `chore/gov-auditoria-elenco` |
| árvore | `git -C <wt> status --porcelain \| wc -l` | **0** antes de eu escrever (Item 0); depois, só os meus `??` (P1/P2) |
| espelho agentes | `node scripts/sync-agent-agents.mjs --check > f 2>&1; ec=$?` | `[agents-sync] OK — 24 agentes, espelho consistente.` **ec=0** |
| espelho skills | `node scripts/sync-agent-skills.mjs --check > f 2>&1; ec=$?` | `[skills-sync] OK — 12 skills, 39 arquivos, espelho idêntico.` **ec=0** |
| auditor (árvore) | `node scripts/audit-agents-skills.mjs > f 2>&1; ec=$?` | `alvo: árvore de trabalho · 24 agentes · 12 skills · OK — nenhum achado.` **ec=0** |
| auditor (BLOB do head) | `node scripts/audit-agents-skills.mjs --ref 02466192` | `alvo: 02466192 · 24 agentes · 12 skills · OK — nenhum achado.` **ec=0** |
| recursivo | `find .claude/agents -name '*.md' \| wc -l` etc. | `.claude/agents` **24** · `.agents/agents` **25** (24 + `README.md`) · diretórios `especialistas/` nos dois lados: **0** |
| delta pós-congelamento | `git -C <wt> diff --name-only 25c0112a..HEAD` | **N=6**, fora de `agent-orchestration/` = **0** (Item 1) |
| worktrees | `git -C <wt> worktree list` | 4: principal `d1fab3bc` · `b06` `005b522c` · `gov-descuido` `497d360d` · `gov-elenco` **`02466192`** — mesmas 4 da passada 2, só lidas |
| docker `jur-*`/`crit-*` (fora do mandato; só reporto) | `docker ps -a --format … \| grep -Ei 'jur-\|crit-' \| wc -l` | **0** |

**Não re-executado, com a justificativa medida (não afirmada):** as 4 suítes (`kpi-dashboard-charts`,
`kpi-achados-paridade`, `kpi-dashboard-contraste`, `agents-mirror-guard`) e o `--ref fe2748c8`.
- `git -C <wt> diff --name-only 911ed749..HEAD` → 3 caminhos, todos `agent-orchestration/omega/juntas/**`;
  `grep -cE '^(Kpis/|\.claude/|\.agents/|scripts/|tests/|CLAUDE\.md|AGENTS\.md)'` → **0**.
- Objetos tree de `.claude`, `.agents`, `scripts`, `Kpis` **iguais** entre `911ed749` e `HEAD` (Item 2).
- `--ref fe2748c8` lê o BLOB de um commit imutável: não há o que mudar.
Nada que as suítes leem mudou; os números da passada 1 (16/16 · 6/6 · 6/6 · 12/12, ec=0) continuam sendo os do head.

**Veredito parcial 3: VERDE.**

## Fechamento

- Parecer escrito em `00c-inspetor-passada3.md` (P2). **Veredito: LIBERADO**, com a condição operacional de comitar os
  dois `00c-*` antes de disparar C1/C2/C3 e de `diff --name-only 02466192..HEAD` listar exatamente esses 2 caminhos.
- `git -C <wt> status --porcelain` FINAL → **2 linhas**, exatamente:
```
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00c-inspetor-passada3-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00c-inspetor-passada3.md
```
- Limpeza: 6 `p3-*.txt` criados no scratchpad → removidos (`rm` ec=0, 0 restantes). 5 arquivos alheios (mtime 20:16–20:23)
  reportados e não varridos. Nenhum container/worktree/junction/cópia criado. Árvore principal e worktrees alheios não tocados.
