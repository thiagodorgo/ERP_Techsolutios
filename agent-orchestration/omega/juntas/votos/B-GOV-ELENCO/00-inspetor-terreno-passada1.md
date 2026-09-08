# Inspetor de terreno — `B-GOV-ELENCO`, passada 1 · **BLOQUEADO**

**Alvo medido:** worktree `.claude/worktrees/gov-elenco` · head `653da3c6` · branch
`chore/gov-auditoria-elenco` · base `origin/main` = `fe2748c8` (merge-base `fe2748c8`, história linear,
2 commits).

> **Nota do orquestrador (P1/P2 do §C7.7 não aplicados nesta passada — violação registrada, não escondida).**
> Este parecer foi disparado com **mandato de 7 itens** e **sem** as instruções P1 (evidência incremental em
> arquivo) e P2 (voto-arquivo-primeiro) do `D-JUNTA-RESILIENTE`. O agente sobreviveu e entregou; se tivesse
> caído, **todo o trabalho teria sido perdido** — exatamente o que o P1/P2 existem para evitar. O texto
> abaixo foi transcrito da mensagem final do agente pelo orquestrador. As passadas seguintes seguem o
> protocolo. Ver `00-quedas.md` e o §3 da ata.

---

## 1 · Isolamento

**1.1 Head e árvore limpa — VERDE, com divergência de nome.** `rev-parse --short HEAD` → `653da3c6`;
`status --porcelain` → **vazio**; `merge-base HEAD origin/main` → `fe2748c8`. O briefing dizia
`Head a julgar: 25c0112a`; medido: `diff --name-status 25c0112a..653da3c6` → **um único arquivo**,
`A agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO.md`. Circularidade natural (um briefing não nomeia
o commit que o contém), delta inerte — mas o jurado que medisse `fe2748c8..25c0112a` pelo briefing mediria
head diferente do aprovado. **Ressalva R1.**

**`node_modules` ausente NÃO é terreno sujo.** O auditor importa só `node:*` e chama `git`; os dois
`sync-*.mjs` idem. Junction/symlink é proibida (§C7.1-ter(c)) e nada aqui a exige.

**1.2 Plano de isolamento declarado — VERMELHO · BLOQUEIA.**
`grep -niE 'worktree|postgres|cluster|muta'` no briefing: ele manda **os três jurados** rodarem no **mesmo
worktree** e **não diz onde acontece a prova por mutação** que o próprio plano exige — **A4** ("injetar link
morto"), **C2** ("prova por mutação"), **C3** ("falso-negativo" = injetar defeito). Dois ou três jurados
mutando o mesmo worktree em paralelo é **a contaminação dos ciclos 2 e 3**: o C3 lê o link morto que o C2
injetou; o C1 vê `status --porcelain` sujo e não sabe de quem é.

Mecanismo nomeado (não consertado — nomear é do inspetor): declarar o worktree **somente-leitura** para todo
jurado e mandar **toda mutação para cópia isolada por jurado**. O auditor deriva `ROOT` de `import.meta.url`
(l.32), então uma cópia em `<mkdtemp>/scripts/` audita `<mkdtemp>/.claude` — mesmo padrão de
`tests/agents-mirror-guard.test.ts`. E: **jurado que encontrar o worktree sujo para e reporta**, não contorna.

**1.3 Resíduos — VERDE.** `docker ps -a` → só `erp-postgres` e `erp-redis` (base viva, 9 dias up); filtro
`jur|crit|probe|junta` → nenhum. `git clean -nxd` no worktree → vazio. **Alheios e inertes, reportados e não
varridos:** worktrees `b06` e `gov-descuido` de outras sessões; `%TEMP%/mirror_files.txt` de 2026-09-01.

## 2 · Insumos

**2.1** Ciclo 1, sem ata anterior. **Premissa falsa detectada:** o briefing §4 dizia que o guard "roda em CI
pelo `sync-agent-agents --check` já existente mais o comando do §6". Medido: `ci.yml` l.69-70 roda **só**
`sync-agent-agents.mjs --check`; **nem `sync-agent-skills --check` nem `audit-agents-skills.mjs` rodam em
CI**, e `.github/**` é proibido. **Ressalva R3.**
**2.2** Ciclo 1 — crítico e PD não exigidos (§C7.1-bis pede a partir do ciclo 3). Não cobrado.
**2.3** Plano nomeia base, §5/§5-bis exatos, bateria A1–A10 com forma — **exceto A4**, que não diz o que
injetar, onde, nem como restaurar. **Ressalva R5.**

## 3 · Papéis (§C7.4-bis)

**3.1 Inelegibilidade — VERDE.** `grep -rl` em `J-*`/`R-*`: `validador-mestre` (56 atas),
`agente-ci-doutor` (10), `guardiao-fail-closed` (5), `cadeira-permanente-backend-review` (0). Nenhum é
votante de ciclo anterior **deste** bloco (não há), nem achador/planejador/dev. Os três votaram em
`J-B-O6R-02` ciclos 1–4, **não** no ciclo 5 nem em `J-B-O6R-07b` — as juntas cujos especialistas estão sendo
aposentados. Sem colisão. Os quatro têm `tools: Read, Grep, Glob, Bash` — sem `Write`/`Edit`.

**Composição de papéis permanentes — sustenta-se.** O §C7.4 pede identidade nova em ciclo de reprovação;
ciclo 1 não queimou ninguém, e criar 3 efêmeros para julgar a aposentadoria de 15 efêmeros seria o defeito
que o bloco corrige.

**Achar/planejar/desenvolver no mesmo orquestrador — leitura para a ata: NÃO invalida o ciclo 1.** O texto do
§C7.4-bis é "Todo **ciclo de reprovação** distribui três papéis em três agentes distintos", e as perguntas
(a)(b)(c) são "a cada reprovação". Ciclo 1 é o fluxo normal do §C2 — e a proteção existe aqui: **nenhuma das
quatro cadeiras escreveu uma linha do diff**. Duas condições ficam: (i) se reprovar, a correção vai para
agente distinto do orquestrador; (ii) a ata registra a nota. Registro também que o "achador" é **em parte a
própria ferramenta sob julgamento** — motivo a mais para C3 existir.

**3.3 Assento permanente — VERDE, com circularidade registrada.** Briefing §6 e plano §8 o nomeiam; a ordem
("depois dos votos de mérito e antes do merge") está no `CLAUDE.md` do head, §C2.6-bis; a cadeira não está
entre C1–C3. **Circularidade:** a regra que me manda conferir isto nasce **neste head** e não existe em
`main`. **Eu a aplico já** — fui instanciado com o corpo do head e o bloco a convoca voluntariamente — mas
registro que **hoje a ausência seria inconsistência do bloco consigo mesmo (mérito de C1), não bloqueio por
lei**. A partir do merge, o 3.3 bloqueia por lei.

## 4 · Fatia S0 e baseline

**4.1 Espelho Codex — VERDE.** `sync-agent-agents.mjs --check` → `OK — 24 agentes`, **ec=0**;
`sync-agent-skills.mjs --check` → `OK — 12 skills, 39 arquivos`, **ec=0**. Conferido recursivamente:
24 arquivos em `.claude/agents/`, 25 em `.agents/agents/` (24 + `README.md`); `especialistas/` **não existe**
em nenhum lado. md5 cru divergiu em 24/24 — **esperado por desenho**: `transform()` remove `tools:` e injeta
o preâmbulo Codex, e a fonte tem CRLF enquanto o alvo tem LF; o `--check` compara EOL-neutro contra o
`transform()`. Índice Codex: 24 listados = 24 arquivos (`diff` vazio).

**4.2 Baseline honesto — VERDE, e o substituto é suficiente.**
- Afirmação do §7 do plano **verificada verdadeira**: `diff --name-only fe2748c8..653da3c6` filtrado por
  `^(src|tests|prisma|frontend|mobile)/` → **nenhum** (ec=1); `.github/` e `.gitignore` idem. 87 caminhos:
  38 `.agents`, 37 `.claude`, 3 `Kpis`, 6 `agent-orchestration`, `CLAUDE.md`, `AGENTS.md`, o script novo.
- `npm run check` = `tsc -p tsconfig.json --noEmit`, e `tsconfig.json` tem `include: ["src/**/*.ts"]`,
  `rootDir: src` → **provadamente invariante** a este diff.
- `npm test` **não é** invariante: 4 testes leem artefatos tocados. Rodados com o `tsx` da árvore principal
  **por caminho absoluto** (leitura; sem instalar, sem junction), `cwd` no worktree, ec por variável:
  **`kpi-dashboard-charts` 16/16 · `kpi-achados-paridade` 6/6 · `kpi-dashboard-contraste` 6/6 ·
  `agents-mirror-guard` 12/12 — ec=0 nos quatro.** Worktree limpo depois.
- Auditor: árvore de trabalho **ec=0**; `--ref 653da3c6` (BLOB) **ec=0**; **`--ref fe2748c8` (base) ec=1 com
  6 BLOQUEIA** — prova que o auditor **vê** o defeito que o bloco corrige, não que ficou verde por não olhar.
- `node --check` nos 3 scripts + `Kpis/app.js` → ec=0 nos quatro.

## 5 · Quórum

**5.1 Plano de perda de jurado — AUSENTE (ressalva forte, R2).** `grep -niE 'perda|queda|cair|re-?dispar|voto
perdido'` no briefing e no plano → só o "perda de dado" do §C7.1-ter(b). Junta de **unanimidade de 3** que
perde um voto por infra fica ininterpretável. Precedente: `votos/B-O6R-REG/00b-perda-de-jurado-trilha.md`.

---

## Veredito: **BLOQUEADO**

**Um item bloqueia — 1.2.** Sem plano escrito de isolamento, com três jurados apontados para um único
worktree e uma bateria que exige injeção de defeito, o terreno é o dos ciclos 2 e 3 **antes de acontecer**.
O conserto é uma seção no briefing — não há `node_modules` a instalar nem cluster a subir.

**Ressalvas para a mesma passada:** **R1** head declarado e medido · **R2** plano de perda de jurado ·
**R3** corrigir o §4 (auditor e `sync-agent-skills --check` **não** rodam em CI) · **R4** a árvore principal
(`demo/investidor`, `d1fab3bc`) tem 14 ` M` + 45 `??`, e 9 dos ` M` são mutações reais incluindo **o rascunho
do próprio §C7.1-quater** — todo comando de jurado usa `git -C <wt>` ou caminho absoluto, e o voto registra o
`rev-parse` medido · **R5** A4 sem forma.

**Limpeza:** 13 arquivos de saída criados no scratchpad da sessão e removidos (`rm` ec=0). Nenhum container,
worktree ou arquivo no repo criado; `status --porcelain` do worktree vazio ao fim; árvore principal apenas
lida. Resíduos alheios (`mirror_files.txt` de 01/09, worktrees `b06`/`gov-descuido`) ficaram como estavam.
