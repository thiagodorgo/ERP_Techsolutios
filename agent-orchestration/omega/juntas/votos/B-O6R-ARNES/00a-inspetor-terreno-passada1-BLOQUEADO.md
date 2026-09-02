# Inspetor de terreno — 1ª passada (2026-08-28) — BLOQUEADO

> Texto verbatim do agente `inspetor-de-terreno-da-junta`, persistido pelo orquestrador.

# PARECER DO INSPETOR DE TERRENO — junta do bloco `B-O6R-ARNES` (1ª passada, 2026-08-28)

**Inspetor:** `inspetor-de-terreno-da-junta`, instância nova, Fable (`claude-fable-5`), conforme `D-INSPETOR-TERRENO-JUNTA`.
**Objeto:** terreno da junta de 3 cadeiras (maioria simples, `D-JUNTA-ESCOPO-E-CALIBRACAO` §2) que julgará o head `d4cf978` de `fix/o6r-arnes-catalogo-unico` (PR #359), plano `agent-orchestration/omega/planos/B-O6R-ARNES-plano.md`.
**Regra aplicada:** fail-closed — só conta o que eu medi por execução nesta sessão. Nenhuma afirmação do briefing do orquestrador ou do dev foi herdada sem re-medição, exceto onde marcado.

## 1. Isolamento

**1.1 Head existe, é o nomeado, árvore limpa — VERDE.**
- `git rev-parse --short fix/o6r-arnes-catalogo-unico` → **`d4cf978`**; `gh pr view 359 --json headRefOid,state,baseRefName` → `headRefOid: d4cf978ae70…`, `state: OPEN`, base `main` — o head local é exatamente o do PR.
- `git merge-base 6efe5ad fix/o6r-arnes-catalogo-unico` → **`6efe5ad`** — a branch parte da base declarada no plano, sem contaminação de outra trilha.
- `git -C .claude/worktrees/arnes-dev status --porcelain` → **vazio** (worktree do dev = index = head; nenhuma mutação viva).
- Árvore principal (`demo/investidor`, `e74b469`): o snapshot inicial acusava ` M` em `.claude/agents/planejador-mestre.md`, `.claude/agents/porteiro-pos-merge.md` e `scripts/sync-agent-agents.mjs`. Medido por `git hash-object <arquivo>` × `git rev-parse HEAD:<arquivo>`: **os três pares de hashes são idênticos** (`f209f8e…`, `9a97167…`, `a87d9a6…`) — era stat-dirty (mtime), não mutação; `git diff --name-only` agora vazio. **Não há mutação viva de conteúdo em nenhuma das duas árvores.**

**1.2 Plano de isolamento declarado e verificável — VERDE.**
O plano (§13.5 + §9, lido integralmente) declara por escrito: worktree próprio por jurado que muta (`git worktree add --detach`, `npm ci` próprio, **junction proibida** com a data do incidente de 26/08), cluster Postgres descartável por jurado em porta própria, base viva `erp-postgres`/`erp-redis` **jamais alvo**, pristino por `hash-object` (nunca `git archive`+`tar` — errata autocrlf), exit por variável. Os corpos dos 6 jurados repetem o protocolo de terreno.
- Worktree do dev conferido como exemplar da regra: `node_modules` presente e **real** — `fsutil reparsepoint query node_modules` → "não é um ponto de nova análise"; `dir /AL` sem junction.
- Node da máquina: `node --version` → **v20.19.5**, o declarado.

**1.3 Resíduos — VERDE COM RESSALVAS (inertes, nomeadas abaixo).**
- `docker ps -a` → **apenas** `erp-postgres` e `erp-redis` (a base viva, up 5h, healthy). Zero containers `jur-*`/`crit-*` órfãos.
- `find` por `jur-probe*`/`*-probe.ts` fora de `node_modules` → vazio.
- Worktrees além do principal e do `arnes-dev`: `agent-af6ea607f3ddf8efd` (`12c3825`, bloco irmão financeiro suspenso) — porcelain **limpo**; `plan-c5` (`12c3825` detached) — porcelain **limpo**; `gov-descuido` (`48a75e9`) — **1 mutação viva**: ` M scripts/porteiro-pre-merge.mjs`. Nenhum dos três toca o head desta junta nem os arquivos que ela julga → resíduo **inerte para esta junta** = ressalva R2, não bloqueio.
- `.tmp-demo/` untracked na árvore principal (logs, PNG, scripts de demo) — inerte, fora do escopo do bloco = ressalva R3.

## 2. Insumos do briefing

**2.1 Ata anterior presente, afirmações a re-verificar — VERDE.**
- `J-B-O6R-02-ciclo4.md` existe e é rastreada; `R-B-O6R-02-ciclo4.md` existe, rastreado, lido: papéis do ciclo nomeados, achadores declarados inelegíveis, **nenhuma correção proposta** — íntegro como insumo do achado.
- Voto do achador `04-jurado-c4-suplente-arnes.json`: JSON parse OK, `voto: REPROVADO` — legível. **Porém untracked** (assim como 02/03/05) = ressalva R1.
- Marcadores `[A RE-VERIFICAR]` medidos por grep nos 6 corpos: c5-catalogo=2 · runner=6 · diff=7 · supl-catalogo=5 · supl-runner=6 · supl-diff=7. As afirmações herdadas (objeto ACL vs `pg_authid`, tabela N=10 do c4, etc.) estão marcadas como a re-verificar, com o dono da re-medição nomeado. As afirmações do dev (7/13 vermelhas F0, N=10 idênticas, 13/13, 22→34 casos, residual +10 atribuído, dois auto-defeitos) **não entram neste parecer como fato** — são o objeto do voto; os corpos das cadeiras 1(supl)/2/3 mandam re-executá-las (D37–D43, canônicas, pisos §6, diff §5).
- Divergências do plano registradas pelo dev **antes de consolidar** (§A2), conferidas dentro da branch (`git show fix/…:agent-orchestration/controle/pendencias.md`): `P-ARNES-DIVERGENCIA-RUNNER-SUMICO-NAO-EXISTE-NA-MAIN` (l.3078) e `P-ARNES-DIVERGENCIA-KPI-APP-JS-FORA-DA-§5` (l.3100, gerado por `scripts/kpi-freeze.mjs`). Medido por mim: `git diff --numstat 6efe5ad..head -- Kpis/app.js` → **`1  1`** — exatamente a linha `var FROZEN`, como declarado. Também presentes na branch: `P-ARNES-RLS-TEST-FORA-DO-SWEEP`, `P-ARNES-VAZAMENTO-LINEAR-IDENTIDADES` (+4/+4 `core-saas-prisma`, +1/+1 `core-saas-role-authority-db`, fora da §5, nomeados e não consertados), `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL`, `P-ARNES-AUTO-DEFEITOS-DO-PROPRIO-BLOCO`.

**2.2 Crítico + PD (§C7.4, ciclo ≥3) — NÃO SE APLICA, registrado como fato do desenho.**
Esta é a **primeira** junta do bloco `B-O6R-ARNES` (ciclo 1 dele). A ausência do `critico-adversarial` não é falta: `D-JUNTA-ESCOPO-E-CALIBRACAO` §2 (lida em `decisoes.md` l.1658) o reserva para blocos de invariante, e este bloco toca só `tests/` e `scripts/` — o plano §13.6 registra isso para a ata.

**2.3 Plano do ciclo — VERDE.** Existe, nomeia base (`6efe5ad`) e branch, lista fechada §5, bateria §9 **com forma declarada** (N, env, Node, exit por variável, cluster descartável por bateria), pisos §6 vinculantes, §14 separando medido/herdado/não-medido.

## 3. Papéis (§C7.4-bis)

**3.1 Inelegibilidade por nome — VERDE.**
- `git log --diff-filter=A` das 6 identidades: as 2 cadeiras novas + 3 suplentes criados **hoje** em `e74b469`; `jurado-c5-arnes-catalogo-postgres` criado em `77ead96`.
- `grep -rl` dos 3 nomes das cadeiras em `omega/juntas/`, `omega/reprovacoes/`, `docs/juntas/` → **vazio**: nenhuma votou, achou ou planejou nada antes.
- Achador (`jurado-c4-suplente-arnes-concorrente`) ≠ qualquer cadeira/suplente (identidades distintas por arquivo); planejador (`planejador-mestre` instância nova) e dev (`general-purpose`, commits `c6ae7fa`→`d4cf978`) não ocupam cadeira. Nenhum acúmulo.

**3.2 Competência × achado — VERDE no desenho, comprometida no corpo (ver item 6).** Catálogo Postgres (cadeira 1), runner/denominador (cadeira 2), diff/escopo/registro (cadeira 3) cobrem exatamente as classes do achado do c4 e as propriedades PA–PG do plano.

## 4. Fatias de orquestração

**4.1 Espelho Codex (S0) — VERDE.**
- `node scripts/sync-agent-agents.mjs --check` executado por mim na árvore principal → **ec=0, "39 agentes, espelho consistente"**.
- Recursividade conferida por contagem própria: `.claude/agents/**/*.md` = **39** = `.agents/agents/**/*.md` (sem README); `especialistas/` **16 = 16**, com as 8 identidades arnês presentes dos dois lados.
- `cmp` byte a byte acusa divergência em todos — **investigado, não herdado**: o espelho é transformado **por desenho** (frontmatter portátil sem `tools:` + preâmbulo Codex; cabeçalho do próprio script, l.8–10: corpo VERBATIM). Diff com CR normalizado de um par amostrado: só a remoção de `tools:` e o preâmbulo — corpo idêntico. O `--check` do script é a medida do contrato e passou.
- A branch não toca `.claude/agents/**` (lista completa dos 14 arquivos do diff conferida — só `tests/`, `scripts/run-backend-tests.mjs`, `Kpis/*`, `agent-orchestration/*`), logo o espelho da principal vale para o head.

**4.2 Baseline honesto, medido agora, no head a julgar — VERDE.**
- No worktree `arnes-dev` (head `d4cf978`, porcelain vazio): `npm run check > log 2>&1; ec=$?` → **ec=0** (`tsc -p tsconfig.json --noEmit`, saída limpa).
- CI do PR conferida por mim: `gh pr checks 359` → **7/7 pass** (authority-portal, backend 5m37s, backend-postgres 2m07s, docker, flutter, frontend, owner-portal), `MERGEABLE`.
- Escopo proibido re-medido por mim (não herdado do orquestrador): `git diff --stat 6efe5ad..head -- src prisma .github CLAUDE.md AGENTS.md frontend mobile package-lock.json package.json infra .env` → **vazio**. Diff total: 14 arquivos, **+1455/−88** — bate com o declarado.

## 5. Quórum e perda de jurado — VERDE.
Plano §13.4, por escrito: 1 suplente por cadeira **nomeado antes do início** (os 3 criados em `e74b469`, antes desta inspeção); jurado caído → suplente re-executa o briefing **inteiro**; voto perdido **nunca conta**; a junta **não fecha com menos de 3 votos**. Regra de decisão escrita: maioria simples, veto individual restrito a `bloqueia` + `dentro-do-bloco`.

## 6. A regra nova (`D-JUNTA-ESCOPO-E-CALIBRACAO`) nos corpos — **VERMELHO na cadeira 1. É o item que bloqueia.**

Medido por grep + leitura nos 6 corpos:

| Identidade | tabela `escopo` | "sem evidência = dentro-do-bloco" | advertência lado A (não poupar) | advertência lado B (denominador/classe = objeto do bloco) | campo `escopo` no formato de voto |
|---|---|---|---|---|---|
| `jurado-c5-arnes-catalogo-postgres` (cadeira 1, **VETO**) | **0 ocorrências** | **não** | **não** | não | **não** (l.295: só `gravidade`) |
| `jurado-arnes-runner-denominador` | sim (l.42) | sim | sim (l.48–53: "Não confunda 'o defeito é antigo' com 'a correção é antiga'") | sim ("fechá-lo é o objeto declarado deste bloco", PE/C-E) | sim (l.307) |
| `jurado-arnes-diff-escopo-registro` (veto) | sim (l.40) | sim | sim (l.47–52: "impede o abuso simétrico: carimbar de 'pré-existente' o que o bloco acabou de escrever") | sim (mecânica do veto l.31–33) | sim (l.317) |
| `jurado-arnes-suplente-catalogo-postgres` | sim | sim | sim (l.69–70: "Não use o rótulo para poupar o bloco do que ele veio fechar") | sim ("a classe do arnês **é o objeto do bloco**") | sim |
| `jurado-arnes-suplente-runner-denominador` | sim | sim | sim (l.68–70) | sim | sim |
| `jurado-arnes-suplente-diff-escopo-registro` | sim | sim | sim (l.70–71) | sim | sim |

E pior que a ausência da regra: **o corpo da cadeira 1 é o contrato de OUTRA junta.** Lido no arquivo (`.claude/agents/especialistas/jurado-c5-arnes-catalogo-postgres.md`):
- description e l.10: "cadeira do arnês da **junta ampliada do ciclo 5** de **B-O6R-02** (atomicidade do financeiro)… Julga o PLANO e o MÉRITO";
- l.26: "Você re-executa **o briefing do ciclo 5 inteiro**";
- l.44–45 e §6: drills **D26/D26b "e os que o plano do ciclo 5 numerar"** — não os D37–D43 deste plano; manda ler "o head do ciclo 5" — não `d4cf978`;
- l.295: formato de voto **sem o campo `escopo`**; zero menções a `D-JUNTA-ESCOPO-E-CALIBRACAO`.

**Por que isso bloqueia (fail-closed):** esta é a primeira junta sob a regra que o dono acabou de escrever, e a regra diz — `decisoes.md` l.1641–1642 — que "escopo declarado sem evidência = achado tratado como `dentro-do-bloco`". Uma cadeira **com veto** cujo formato de voto não tem o campo produz, por construção, votos sem `escopo` — que a regra manda tratar como `dentro-do-bloco`. Ou seja: o terreno entrega à cadeira de maior poder exatamente o mecanismo de reprovar este bloco por achado pré-existente — **a classe de defeito de processo que criou este bloco** (`B-O6R-02` c4: "reprovado por um defeito que não criou e estava proibido de consertar"). E o mandato dela aponta para plano, drills e head de outro bloco — a mesma classe da premissa herdada que contaminou o ciclo 3 do B-O6R-01. Não existe briefing da junta separado que supra isso (procurado: `find agent-orchestration -name "*arnes*"` → só o plano e o voto do achador; nenhuma ata/briefing do B-O6R-ARNES existe ainda).

---

## VEREDITO: **BLOQUEADO**

**Item sujo único (evidência acima, §6):** a cadeira 1 (`jurado-c5-arnes-catalogo-postgres`, veto) entra na junta sem a regra de escopo no corpo, sem o campo `escopo` no formato de voto, e com mandato, drills e head apontando para a junta do ciclo 5 do `B-O6R-02` — não para este bloco.

**O que precisa acontecer para limpar (nomeio; não conserto — §C7.4-bis):** o orquestrador escolhe um dos dois caminhos e registra a escolha na ata: **(a)** emendar o corpo da cadeira 1 (apensar, nunca reescrever — §A2) com o protocolo `B-O6R-ARNES`: regra de escopo completa (tabela + evidência de data/origem + "sem evidência = dentro-do-bloco"), advertência dos dois lados, formato de voto com `escopo`, e o redirecionamento explícito de mandato (plano deste bloco, head `d4cf978`, drills D37/D38/D39/D42/D43) — seguido de `sync-agent-agents.mjs` para o espelho; ou **(b)** promover `jurado-arnes-suplente-catalogo-postgres` a titular da cadeira 1 (o corpo dele já está integralmente equipado — tabela, advertência nas duas direções, formato com `escopo`, drills deste bloco) e nomear novo suplente para a cadeira, com registro nominal na ata. Feito um dos dois, **me chamem de novo** — o resto do terreno está limpo e a segunda passada será curta.

## Ressalvas nomeadas (sobrevivem à recomposição; o orquestrador as põe em destaque no briefing dos jurados)

- **R1 — votos 02–05 do ciclo 4 untracked**, inclusive o do achador (`04-jurado-c4-suplente-arnes.json`), insumo formal deste bloco. Existem e são legíveis (JSON parse OK), mas não estão no git — persistir na trilha `demo/investidor` antes ou junto da ata desta junta; insumo de achado que pode sumir num `git clean` é registro em risco.
- **R2 — worktree `gov-descuido` com mutação viva** (` M scripts/porteiro-pre-merge.mjs`). Não toca esta junta; é resíduo mutado da trilha de governança — dono daquela trilha resolve, e nenhum jurado desta junta entra lá.
- **R3 — `.tmp-demo/` untracked na árvore principal** — resíduo inerte de demo; faxina §C5 fora desta junta.
- **R4 — worktrees do bloco irmão vivos** (`agent-af6ea607f3ddf8efd`, `plan-c5`, ambos `12c3825`, porcelain limpo). Legítimos do `B-O6R-02` suspenso; inertes aqui. Nenhum jurado desta junta os usa — cada jurado que muta cria o seu, como o plano manda.
- **R5 — duas divergências do plano já registradas pelo dev (§A2), a serem re-julgadas pela cadeira 3, não presumidas corretas:** `Kpis/app.js` fora da §5 com diff medido de exatamente 1 linha (`var FROZEN`, `numstat 1 1`); e `P-O6R-B02-RUNNER-SUMICO-SEM-SKIP` inexistente na `main` (a §12 mandava fechá-la; o dev registrou a não-existência em vez de fabricar o fechamento). Nota adjacente: `Kpis/index.html` está na lista §5 e **não** aparece no diff — o painel hidrata dos JSON e pode legitimamente não mudar, mas quem julga se §C3 foi cumprido é a cadeira 3, por execução.
- **R6 — as afirmações do dev do briefing** (F0 7/13 vermelhas · N=10 idênticas `2597/2595/0/2/ec0` · 13/13 denominador 37 · 22→34 casos · residual +10 atribuído a `core-saas-prisma`/`core-saas-role-authority-db` · dois auto-defeitos `14fb8fb`/`1676a5b`) entram no briefing **todas marcadas `[A RE-VERIFICAR]`** — nenhuma virou fato neste parecer; os juízes são os drills e canônicas que os corpos das cadeiras mandam re-executar.

## Linha de limpeza

Para medir, criei apenas 1 arquivo de log no scratchpad da sessão (`…\scratchpad\baseline-check.log`, fora do repositório) — permanece fora do repo e morre com a sessão. Nenhum container, worktree, branch, arquivo ou role foi criado por mim; a base viva `erp-postgres`/`erp-redis` não recebeu nenhum comando (nem leitura); nenhuma junction criada; o único efeito colateral no repo foi o refresh de stat do index da árvore principal feito pelo `git diff` (conteúdo provado intacto por `hash-object` = blob do HEAD, os três pares idênticos). Nada a remover.