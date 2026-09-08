# Inspetor de terreno — `B-GOV-ELENCO`, passada 2 · **BLOQUEADO** (um item, uma linha)

**Alvo medido:** worktree `.claude/worktrees/gov-elenco` · head `911ed749` · branch `chore/gov-auditoria-elenco` ·
base `origin/main` = `fe2748c8` · head de código/elenco `25c0112a`. Todo comando com `git -C <wt>` ou caminho
absoluto; árvore principal (`d1fab3bc`, `demo/investidor`) **não tocada nem lida** nesta passada.
Evidência incremental (P1) em `00b-inspetor-passada2-evidencia.md`, ao lado. Mandato: 3 itens (P4).

---

## Item 1 — o bloqueio 1.2 foi levantado? **SIM · VERDE**

O §7 do briefing escreve os cinco pontos que nomeei: worktree **somente-leitura** para todo jurado; toda
mutação em **cópia isolada e própria** (`mktemp -d` + `cp`); **sem** `git worktree add`, junction, symlink ou
`npm ci`; **parar e reportar** se encontrar o worktree sujo. E a receita **funciona como escrita** — executei-a
verbatim (só com `TMPDIR` apontado ao scratchpad da sessão, que `mktemp -d` honra):

- Cópia = 63 + 64 arquivos, **iguais** ao worktree; `git rev-parse` nela → `fatal: not a git repository` — está
  fora do repo, e o auditor sem `--ref` não chama `git` (l.32, 79-91, 101-102: só `fs` a partir de
  `ROOT = dirname(script)/..`).
- Baseline da cópia: `24 agentes · 12 skills · OK` **ec=0**.
- Mutação A4 na cópia (`[teste](references/NAO-EXISTE.md)` numa `SKILL.md`): **exatamente 1**
  `C8 link quebrado`, nomeando arquivo e link, **ec=1**.
- Worktree durante a mutação: `status --porcelain` só com o meu arquivo de evidência; md5 da `SKILL.md`
  no worktree = blob `HEAD:` = `266f93e7…`; auditor no worktree **ec=0**. A mutação ficou onde devia.
- Desfeita a mutação: **0** achados, **ec=0**. `rm -rf $MEU` **ec=0**, diretório inexistente depois.

**0 → 1 → 0 na cópia, 0 → 0 → 0 no worktree.** É o isolamento que faltava, provado.

Duas notas de precisão, não bloqueiam: a receita é segura **a partir do worktree** (`.claude/` ali tem só
`agents/` e `skills/`; da árvore principal, `cp -r .claude` arrastaria `.claude/worktrees/`); e a cópia contém
só o que o auditor lê — cadeira que quiser mutar `CLAUDE.md`/`AGENTS.md`/`Kpis/*` copia-os antes.

## Item 2 — R1, R2, R3, R5 incorporadas?

| ressalva | estado | evidência |
|---|---|---|
| **R1** head medido + regra do que pode mudar | **PARCIAL — a regra é FALSA no head atual** | medir/registrar o hash: ok (l.15-17). A regra (l.18-20) diz: qualquer caminho fora de `agent-orchestration/omega/juntas/` em `diff 25c0112a..HEAD` = `dentro-do-bloco`, **bloqueia**. Medido: **N=4** caminhos; **1 fora** desse prefixo — `M agent-orchestration/controle/pendencias.md` (+29 linhas, `P-GOV-AUDITOR-FORA-DA-CI`, nascido da minha R3). Fora de `agent-orchestration/`: **0**. |
| **R2** plano de perda de jurado | **INCORPORADO** | §8, l.119-128: re-disparo da mesma identidade 1×; segunda queda → voto perdido na ata com cadeira e erro; **não fecha com <3 votos**; cadeira permanente homologa depois |
| **R3** §4 corrigido sobre CI | **INCORPORADO e VERDADEIRO** | `sed -n 60,75p .github/workflows/ci.yml` → l.69-70 só `sync-agent-agents.mjs --check`; `grep -c` de `audit-agents-skills` ou `sync-agent-skills` no `ci.yml` → **0**. §4 diz exatamente isso; pendência registrada em `controle/pendencias.md` |
| **R5** forma do A4 | **INCORPORADO** | §3, l.52-55: cópia isolada, UMA `SKILL.md`, link morto, exigir **1** C8 nomeando o arquivo, desfazer, exigir **0**, publicar ambos. Executei essa forma no Item 1: 1 → 0. (O plano §6 A4 segue sem forma — não mudou desde `25c0112a`; a forma vive no briefing, que é o contrato do jurado. Inerte.) |

## Item 3 — terreno no head novo · **VERDE**

`rev-parse HEAD` → `911ed749a3f4d2b59ba3966528971a52e98b110b` · `status --porcelain` → **vazio** antes de eu
escrever · `sync-agent-agents.mjs --check` → `OK — 24 agentes` **ec=0** · `sync-agent-skills.mjs --check` →
`OK — 12 skills, 39 arquivos` **ec=0** · recursivo: 24 `.md` em `.claude/agents`, 25 em `.agents/agents`
(24 + `README.md`), `especialistas/` ausente nos dois lados · `audit-agents-skills.mjs` (árvore) **ec=0** ·
`--ref 911ed749` (BLOB) **ec=0** · `diff --name-only 25c0112a..HEAD` → **N=4**, **0 fora de
`agent-orchestration/`**, 1 fora de `agent-orchestration/omega/juntas/` (o R1 acima).

**Não re-executado, com justificativa medida:** `diff --name-only 653da3c6..HEAD` (head da passada 1 → agora)
→ 4 caminhos, todos `agent-orchestration/`; nenhum artefato lido pelas 4 suítes ou pelo `--ref fe2748c8` mudou.
O 1.3 (docker/resíduos) não está no mandato desta passada e vale como medido na passada 1.

---

## Veredito: **BLOQUEADO** — um item, de uma linha

**O que está sujo:** a única regra dura de escopo que o briefing dá aos jurados (l.18-20, R1) é **falsa no
head que eles vão medir**. Aplicada como escrita, ela manda C1, C2 e C3 tratar `controle/pendencias.md` —
registro, no §5 PERMITIDO do plano (l.82), nascido de uma ressalva minha — como achado `dentro-do-bloco` que
**bloqueia**. Briefing e plano contradizem-se na regra que decide o voto, e o mandato desta passada já usa o
prefixo certo (`agent-orchestration/`) — o briefing, não. Uma reprovação por isso abriria ciclo 2 e o §C7.4
sem defeito nenhum, a classe de bloqueante que a auditoria de 28/08 mediu em 11 de 16. Não LIBERO um tabuleiro
cuja instrução de bloqueio eu medi como errada; e o conserto é uma linha, então a passada 3 é uma re-medição
de um `grep -vc`.

**O que precisa acontecer (nomeio, não conserto):**
1. Reescrever a regra de l.18-20 para o conjunto que é **verdadeiro e coerente com o §5 do plano**: caminhos
   fora de `agent-orchestration/` (ou, mais estrito, fora de `agent-orchestration/omega/juntas/` **e** de
   `agent-orchestration/controle/pendencias.md`) bloqueiam. Depois, `git -C <wt> diff --name-only 25c0112a..HEAD`
   filtrado pelo prefixo escolhido tem de dar **0** de fora no head que os jurados medirem.
2. **Comitar** os dois arquivos desta passada (`00b-inspetor-passada2-evidencia.md`, `00b-inspetor-passada2.md`)
   **antes** de qualquer jurado nascer — pelo §7 que vocês mesmos escreveram, jurado que encontrar `??` no
   worktree **para e reporta**. Os dois ficam sob `omega/juntas/`, então o head move sem ferir a regra corrigida.
3. Colateral, mesma edição: l.4 do briefing aponta `votos/B-GOV-ELENCO/00-inspetor-terreno.md`; o arquivo é
   `00-inspetor-terreno-passada1.md`.

**Ressalvas a levar ao briefing quando liberar:** as duas notas de precisão do Item 1 (receita só a partir do
worktree; copiar `CLAUDE.md`/`AGENTS.md`/`Kpis/*` para a cópia se a mutação for neles) e a nota inerte do R5
(plano §6 A4 sem forma; a forma está no §3 do briefing).

**Limpeza:** criei `tmp.EVarBUVaWQ/` (cópia da receita, 127 arquivos) e 8 `.txt` de saída no scratchpad da
sessão — todos removidos, `rm` ec=0, diretório inexistente ao fim. Nenhum container, worktree, junction ou
arquivo fora de `votos/B-GOV-ELENCO/` criado. Escrevi **só** os dois `00b-*` deste mandato; `status --porcelain`
final mostra exatamente esses dois `??`. Os 5 arquivos que restam no scratchpad (`bloco-c2bis.txt`,
`bloco-quater.txt`, `decisoes-append.txt`, `kpi-release.json`, `pendencias-append.txt`, mtime 20:16–20:23) são
**anteriores à minha sessão e alheios** — reportados, não varridos. Árvore principal e worktrees `b06`/
`gov-descuido` não tocados.
