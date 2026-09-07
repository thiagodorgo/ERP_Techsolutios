# Inspetor de terreno — `B-GOV-ELENCO`, passada 2 · EVIDÊNCIA INCREMENTAL (§C7.7 P1)

Cada item é apensado assim que medido. Comando · saída resumida · veredito parcial. Todo comando com
`git -C <wt>` ou caminho absoluto; `wt` = `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`.

## 0 · Estado do terreno ANTES de eu escrever qualquer coisa

- `git -C <wt> rev-parse HEAD` → `911ed749a3f4d2b59ba3966528971a52e98b110b` · branch `chore/gov-auditoria-elenco`
- `git -C <wt> status --porcelain` → **vazio** (ec=0), medido ANTES de este arquivo existir
- `git -C <wt> log --oneline 25c0112a..HEAD` → 3 commits: `653da3c6` (briefing p1) · `23285d2d` (briefing p2) · `911ed749` (parecer p1 + quedas)
- `git -C <wt> diff --name-only 25c0112a..HEAD` → **4 caminhos**:
  `agent-orchestration/controle/pendencias.md` · `agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO.md` ·
  `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md` ·
  `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-quedas.md`
- `git worktree list` → 4 árvores: principal `d1fab3bc [demo/investidor]` · `b06` `005b522c` · `gov-descuido` `497d360d` · `gov-elenco` `911ed749`. Alheias apenas lidas.
- **Nota de protocolo:** este arquivo e o parecer final (`00b-inspetor-passada2.md`) são os ÚNICOS caminhos
  que eu escrevo, por mandato P1/P2. Depois deles, `status --porcelain` mostrará exatamente esses dois `??`.

## ITEM 1 · O bloqueio 1.2 foi levantado? — receita do §7 EXECUTADA VERBATIM → **VERDE**

Leitura do §7 (l.94-117): worktree somente-leitura para todo jurado · toda mutação em cópia isolada por
`mktemp -d` + `cp` · sem `git worktree add`, sem junction/symlink, sem `npm ci` · "se encontrar sujo, pare e
reporte anomalia; não contorne e não limpe". Os cinco pontos que nomeei na passada 1 estão escritos.

Pré-condição da receita, lida no script: sem `--ref`, `audit-agents-skills.mjs` **não chama `git`** —
`listar()`/`ler()` usam só `fs` a partir de `ROOT = dirname(import.meta.url)/..` (l.32, 79-91, 101-102).
Logo uma cópia fora do repo audita a si mesma. Provado executando (com `TMPDIR` no scratchpad da sessão;
`mktemp -d` honra a variável — a receita segue verbatim):

| passo | comando | saída |
|---|---|---|
| copiar | `MEU=$(mktemp -d); mkdir -p $MEU/scripts; cp $WT/scripts/audit-agents-skills.mjs $MEU/scripts/; cp -r $WT/.claude $WT/.agents $MEU/` | cópia: `.claude`=63 arquivos, `.agents`=64 — **iguais** ao worktree (63/64). `git rev-parse` na cópia → `fatal: not a git repository` (fora do repo, como prometido) |
| baseline da cópia | `cd $MEU && node scripts/audit-agents-skills.mjs` | `24 agentes · 12 skills · OK — nenhum achado` · **ec=0** |
| mutação A4 (forma do §3) | `printf '\n[teste](references/NAO-EXISTE.md)\n' >> $MEU/.claude/skills/backend-review-ts-prisma/SKILL.md` e re-rodar | `[BLOQUEIA] C8 link quebrado · .claude/skills/backend-review-ts-prisma/SKILL.md -> references/NAO-EXISTE.md` · `1 BLOQUEIA · 0 AVISO` · **ec=1** · **n_C8=1**, nomeia o arquivo (1) e o link (1) |
| worktree intocado | `git -C $WT status --porcelain` · md5 | porcelain = só este arquivo de evidência (`??`) · md5 `SKILL.md` no wt `266f93e7…` = blob `HEAD:` `266f93e7…` = cópia antes da mutação |
| auditor no worktree APÓS mutar a cópia | `cd $WT && node scripts/audit-agents-skills.mjs` | `OK — nenhum achado` · **ec=0** → a mutação ficou na cópia |
| desfazer na cópia | `cp $WT/.../SKILL.md $MEU/.../SKILL.md` e re-rodar | `OK — nenhum achado` · **ec=0** · **n_C8=0** |
| limpeza | `cd $TMPDIR && rm -rf $MEU` | `rm_ec=0` · `existe_ainda=NAO` |

**Veredito parcial 1: LEVANTADO.** O mecanismo é o que eu nomeei e funciona como escrito: 0 → 1 → 0, com o
worktree em ec=0 o tempo todo.

Duas notas de precisão (não bloqueiam): (a) a receita é segura **a partir do worktree**, cujo `.claude/` tem só
`agents/` e `skills/` (399 KB); rodada por engano a partir da árvore principal, `cp -r .claude` arrastaria
`.claude/worktrees/` (3 árvores) — o §7 já fixa `WT` no worktree, e o R4 já proíbe a árvore principal.
(b) A cópia contém só o que o auditor lê; a cadeira que quiser mutar `CLAUDE.md`/`AGENTS.md`/`Kpis/*` precisa
copiá-los para a mesma pasta antes ("mute o que precisar aqui dentro" cobre, mas não diz).

## ITEM 2 · Ressalvas R1, R2, R3, R5

**R1 — PARCIAL; a regra do "o que pode mudar" é FALSA no head atual → VERMELHO.**
- Incorporado: o briefing manda medir `git -C <wt> rev-parse HEAD` e registrar o hash no voto (l.15-17). ✔
- Regra escrita (l.18-20): "se `diff --name-status 25c0112a..HEAD` mostrar **qualquer** caminho fora de
  `agent-orchestration/omega/juntas/`, isso é achado `dentro-do-bloco` e **bloqueia**".
- Medido: `git -C <wt> diff --name-status 25c0112a..911ed749` →
  ```
  M  agent-orchestration/controle/pendencias.md
  A  agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO.md
  A  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-inspetor-terreno-passada1.md
  A  agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/00-quedas.md
  ```
  `grep -vc '^agent-orchestration/omega/juntas/'` → **1** (`controle/pendencias.md`, +29 linhas: o registro
  `P-GOV-AUDITOR-FORA-DA-CI`, nascido da minha R3). `grep -vc '^agent-orchestration/'` → **0**.
- O caminho está no §5 PERMITIDO do plano (l.82: `agent-orchestration/controle/{decisoes,pendencias,…}.md`)
  e é registro, não código. Mas **a regra do briefing, aplicada como escrita, manda os três jurados
  BLOQUEAR** por ele. Briefing e plano contradizem-se na única regra dura de escopo que o briefing enuncia —
  e o mandato desta passada já usa o prefixo certo (`agent-orchestration/`), o briefing não.

**R2 — INCORPORADO → VERDE.** §8 (l.119-128): re-disparo da mesma identidade 1×; segunda queda → voto perdido
registrado na ata com cadeira e erro; junta **não fecha com <3 votos** sob unanimidade; cadeira permanente
homologa depois. `grep -niE 'perda|queda|re-?dispar|voto perdido'` → 5 linhas, todas no §8.

**R3 — INCORPORADO e VERDADEIRO → VERDE.** §4 (l.61-70) diz: CI roda só `sync-agent-agents --check`; auditor e
`sync-agent-skills --check` são gates manuais; `.github/**` proibido → `P-GOV-AUDITOR-FORA-DA-CI`. Re-medido no
head: `sed -n '60,75p' .github/workflows/ci.yml` → l.69-70 `Agents mirror guard (sync-agent-agents --check)` /
`run: node scripts/sync-agent-agents.mjs --check`; `grep -c 'audit-agents-skills\|sync-agent-skills' ci.yml`
→ **0**. A pendência está registrada em `controle/pendencias.md` (+29 linhas, é o `M` do R1).

**R5 — INCORPORADO → VERDE.** §3 (l.52-55) dá a forma: cópia isolada, UMA `SKILL.md`,
`[teste](references/NAO-EXISTE.md)`, exigir **exatamente 1** `C8 link quebrado` nomeando o arquivo, desfazer,
exigir **0**, publicar os dois números. Executei essa forma no Item 1: **1 → 0**. Nota inerte: o **plano**
(`planos/B-GOV-ELENCO-plano.md` §6 A4, l.106) não mudou desde `25c0112a` e continua sem forma; a forma vive só
no briefing, que é o contrato do jurado.

## ITEM 3 · Terreno no head novo → **VERDE**

| medição | comando | resultado |
|---|---|---|
| head | `git -C <wt> rev-parse HEAD` | `911ed749a3f4d2b59ba3966528971a52e98b110b` |
| árvore | `git -C <wt> status --porcelain` | **vazio** antes de eu escrever; depois, só `?? …/00b-inspetor-passada2-evidencia.md` (meu, por P1) |
| espelho agentes | `node scripts/sync-agent-agents.mjs --check` | `OK — 24 agentes, espelho consistente.` **ec=0** |
| espelho skills | `node scripts/sync-agent-skills.mjs --check` | `OK — 12 skills, 39 arquivos, espelho idêntico.` **ec=0** |
| recursivo | `find … -name '*.md'` | `.claude/agents` 24 · `.agents/agents` 25 (24 + `README.md`) · `especialistas/` **ausente nos dois lados** |
| auditor (árvore) | `node scripts/audit-agents-skills.mjs` | `24 agentes · 12 skills · OK` **ec=0** |
| auditor (BLOB) | `node scripts/audit-agents-skills.mjs --ref 911ed749` | `alvo: 911ed749 · OK` **ec=0** |
| delta desde o head de código | `git -C <wt> diff --name-only 25c0112a..HEAD` | **N=4** caminhos · fora de `agent-orchestration/` = **0** · fora de `agent-orchestration/omega/juntas/` = **1** (ver R1) |

## Fechamento · o que NÃO re-medi, e por quê · limpeza

- **Não re-executado (mandato):** as 4 suítes (`kpi-dashboard-charts`, `kpi-achados-paridade`,
  `kpi-dashboard-contraste`, `agents-mirror-guard`), o `--ref fe2748c8` e o 1.3 (docker/resíduos).
  Justificativa medida: `git -C <wt> diff --name-only 653da3c6..HEAD` (head da passada 1 → agora) → 4 caminhos,
  `grep -vc '^agent-orchestration/'` = **0**. Nenhum artefato que aquelas suítes leem (`Kpis/*`, `.claude/**`,
  `.agents/**`, `scripts/*`) mudou. O 1.3 vale como medido na passada 1 (~40 min).
- **Scratchpad ao final:** `ls` → 5 arquivos (`bloco-c2bis.txt`, `bloco-quater.txt`, `decisoes-append.txt`,
  `kpi-release.json`, `pendencias-append.txt`), todos com mtime **20:16–20:23**, anteriores à minha primeira
  escrita (20:44) — **alheios (do orquestrador), reportados e não varridos**. Tudo que eu criei
  (`tmp.EVarBUVaWQ/`, `copia-*.txt`, `wt-apos-mut.txt`, `i3-*.txt`) foi removido com ec=0.
- **Referência morta no briefing (achado colateral):** l.4 aponta `votos/B-GOV-ELENCO/00-inspetor-terreno.md`;
  o arquivo chama-se `00-inspetor-terreno-passada1.md` (`ls votos/B-GOV-ELENCO/`).
