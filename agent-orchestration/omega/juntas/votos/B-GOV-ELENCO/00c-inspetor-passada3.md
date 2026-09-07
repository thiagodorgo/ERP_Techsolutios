# Inspetor de terreno — `B-GOV-ELENCO`, passada 3 · **LIBERADO**

**Alvo medido:** worktree `.claude/worktrees/gov-elenco` · head **`02466192`** (`024661925ba7e0656266f71b28e8aaec7419afb8`)
· branch `chore/gov-auditoria-elenco` · base `origin/main` = `fe2748c8` · head de código/elenco `25c0112a`. Todo comando
com `git -C <wt>` ou caminho absoluto; árvore principal **não tocada nem lida**. Evidência incremental (P1) em
`00c-inspetor-passada3-evidencia.md`, ao lado. Mandato: 3 itens (P4) — re-medi **só o que mudou** desde o BLOQUEADO
da passada 2 (um item, uma linha).

---

## Item 1 — os três consertos que nomeei · **VERDE nos três**

1. **A regra de escopo do briefing é VERDADEIRA no head.** Regra (l.15-20): qualquer caminho de
   `git -C <wt> diff --name-only 25c0112a..HEAD` fora de **`agent-orchestration/`** = `dentro-do-bloco`, bloqueia.
   Medido: **N=6** caminhos · `grep -vc '^agent-orchestration/'` → **0**. (Controle: com o prefixo antigo
   `omega/juntas/` daria **1** — o `controle/pendencias.md`. O antigo era falso; o novo é verdadeiro.)
   **Coerência com o §5 do plano** (plano inalterado desde `25c0112a`, `diff --stat` = 0 linhas): os 6 caminhos caem
   todos nos dois itens de registro do §5 — `controle/{decisoes,pendencias,aposentadoria-especialistas}.md` (1) e
   `omega/{planos,juntas}/**` (5). Briefing e plano **concordam** no head a julgar. A regra ainda ficou mecanicamente
   aplicável: trocou `--name-status` (cujas linhas começam por `M\t`/`A\t` e fariam um `grep -v '^agent…'` contar
   tudo como "fora") por `--name-only`.
2. **Os dois `00b-*` estão comitados:** `ls-files --error-unmatch` ec=0 · adicionados em `02466192` ·
   `status --porcelain | grep -c 00b-` → **0**.
3. **A referência da l.4 aponta para `00-inspetor-terreno-passada1.md`**, que existe (`test -f`); ocorrências do nome
   antigo → **0**.

## Item 2 — as duas precisões da receita · **VERDE**

§7, l.127-130: **(a)** rodar a receita a partir do worktree (`.claude/` ali tem só `agents/` e `skills/` — re-medido
por `ls -A`; da árvore principal `cp -r .claude` arrastaria `.claude/worktrees/`); **(b)** copiar `CLAUDE.md`/
`AGENTS.md`/`Kpis/*` para a cópia se a mutação for neles. É o texto que pedi.

**Reaproveito a medição da passada 2 (0 → 1 → 0 na cópia, 0 → 0 → 0 no worktree) e não re-executo, por medição:**
o bloco ```` ```bash ```` do §7 extraído de `911ed749:` e `02466192:` tem **md5 idêntico** (10 linhas); e os objetos
tree de `.claude` (`29800864`), `.agents` (`762bbefb`), `scripts` (`59be3822`) e `Kpis` (`fbb9ad1d`) são **os mesmos**
em `911ed749` e `HEAD` (`git rev-parse <rev>:<dir>`). Receita igual + entrada igual = mesma saída; re-rodar provaria
só o determinismo do `cp`. O que mudou é texto, e o texto eu li.

## Item 3 — terreno limpo no head `02466192` · **VERDE**

`status --porcelain` → **0 linhas** antes de eu escrever · `sync-agent-agents.mjs --check` → `OK — 24 agentes` **ec=0** ·
`sync-agent-skills.mjs --check` → `OK — 12 skills, 39 arquivos` **ec=0** · `audit-agents-skills.mjs` (árvore) →
`24 agentes · 12 skills · OK` **ec=0** · `--ref 02466192` (BLOB do head) → `OK` **ec=0** · recursivo: `.claude/agents` 24
`.md`, `.agents/agents` 25 (24 + `README.md`), `especialistas/` **0** nos dois lados · worktrees: as mesmas 4 da passada 2,
`gov-elenco` em `02466192` · docker `jur-*`/`crit-*`: **0** (fora do mandato; só reporto). Exit sempre por variável
(`cmd > f 2>&1; ec=$?`).

**Não re-executado, com justificativa medida:** as 4 suítes e o `--ref fe2748c8`. `diff --name-only 911ed749..HEAD` →
3 caminhos, todos `omega/juntas/**`; `grep -cE '^(Kpis/|\.claude/|\.agents/|scripts/|tests/|CLAUDE\.md|AGENTS\.md)'`
→ **0**; trees iguais (Item 2); `fe2748c8` é BLOB imutável. Os 16/16 · 6/6 · 6/6 · 12/12 da passada 1 continuam sendo
os números deste head.

---

## Veredito: **LIBERADO**

O único item que bloqueava a passada 2 — a regra de escopo falsa — está reescrito, é **verdadeiro no head** (0 de 6 fora)
e **coerente com o §5**. Os dois colaterais (arquivos `00b-*` soltos; referência morta) estão fechados. As duas
precisões da receita entraram no §7. Espelhos, auditor e árvore: verdes, com N e forma. Nada que as suítes leem mudou.

**Condição operacional (mecânica, não ressalva):** os dois arquivos desta passada (`00c-inspetor-passada3-evidencia.md`,
`00c-inspetor-passada3.md`) ficam `??` no worktree por desenho (P1/P2). **Comitá-los antes de disparar C1/C2/C3** —
pelo §7, jurado que encontrar `??` para e reporta. Este LIBERADO cobre o head resultante **se e só se**
`git -C <wt> diff --name-only 02466192..HEAD` listar **exatamente esses 2 caminhos** (ambos sob
`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/`): a regra do briefing continua verdadeira (8 de 8 dentro de
`agent-orchestration/`), e os trees de `.claude`/`.agents`/`scripts`/`Kpis` continuam os que medi. Qualquer outro
caminho nesse commit está fora do que eu provei.

**Observações inertes (registro; nada a pôr em destaque no briefing):** (i) o cabeçalho l.3 ainda diz "PASSADA 2" e o
bloco l.22 se chama "Correção da passada 3" — cosmético. (ii) O prefixo `agent-orchestration/` é um superconjunto dos
caminhos de registro do §5 (cobriria `agent-orchestration/docs/`, `codex/`); a folga **não é exercida** — 6 de 6
caminhos estão dentro do §5. (iii) O plano §6 A4 segue sem forma; a forma está no §3 do briefing, que é o contrato do
jurado (plano inalterado, 0 linhas).

**Limpeza:** criei 6 `p3-*.txt` no scratchpad da sessão (saídas de `--check`/auditor e os dois extratos da receita) —
`rm -f` **ec=0**, `ls p3-* | wc -l` → **0**. Nenhum container, worktree, junction, symlink ou cópia da receita criado.
Escrevi **só** os dois `00c-*` deste mandato; `status --porcelain` final mostra exatamente esses dois `??`. Os 5 arquivos
alheios do scratchpad (`bloco-c2bis.txt`, `bloco-quater.txt`, `decisoes-append.txt`, `kpi-release.json`,
`pendencias-append.txt`, mtime 20:16–20:23, anteriores à minha primeira escrita às 20:52) — **reportados, não varridos**.
Árvore principal (`d1fab3bc`) e worktrees `b06`/`gov-descuido` não tocados.
