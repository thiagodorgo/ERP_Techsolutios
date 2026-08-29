# BRIEFING — junta do bloco `B-O6R-REG` (sincronização de registro)

**Head a julgar:** `757485c` · **branch** `chore/o6r-reg-sync-359` · **base** `origin/main` = `f081b5d` (#359).
**Quórum:** **maioria de 3** (`D-JUNTA-ESCOPO-E-CALIBRACAO` §2 — o bloco **não** toca dinheiro, segurança,
permissão nem perda de dado; nenhuma linha de código de produto). Sem `critico-adversarial`: não é bloco de
invariante.
**Todo voto declara `escopo`** (`dentro-do-bloco` | `pre-existente`) além de `gravidade`. Escopo declarado sem
evidência de data ou origem é tratado como `dentro-do-bloco`.

## 1. O que este bloco é

Bloco de **registro**. O diff em `src/`, `prisma/`, `tests/`, `scripts/`, `frontend/`, `mobile/`, `.github/` e
lockfiles é **VAZIO** — isso é item de bateria, não promessa: confiram com
`git diff f081b5d..757485c -- src prisma tests scripts frontend mobile .github package-lock.json`.

Origem: o parecer do `porteiro-pos-merge` do #359
(`agent-orchestration/omega/juntas/votos/B-O6R-ARNES/00c-porteiro-pos-merge-359.md`), veredito
**LIBERADO COM RESSALVA**, que nomeou **6 achados**. Dois foram fechados pelo orquestrador no mesmo dia (B:
branch remota apagada; D: trilha pushada). **Este bloco fecha os quatro restantes** — A, C, E, F.

## 2. O que tem de ser conferido, item a item

| # | Promessa | Como conferir |
|---|---|---|
| 1 | **Backfill §C3.5** (achado A) | `Kpis/kpis-latest.json` e a entrada `#359` do `kpis-history.json` têm `merge_commit` = `f081b5d` e `approved_head` = `d4cf978`, com nota do head final `0c37fa2`. Confiram que `d4cf978` é mesmo o head que a junta aprovou (ata `J-B-O6R-ARNES.md` §6) e que a árvore de `f081b5d` bate com a de `0c37fa2`. |
| 2 | **"piso 0" corrigido** (achado C) | 3 lugares: `codex/log-execucao.md`, `docs/status-geral.md`, `P-ARNES-CANONICA1` — **e** a `description` do history, que o porteiro **não** tinha nomeado. O fato correto: o piso **dispara 1 vez**, nomeando `tests/core-saas-role-authority.test.ts`; o pulo **declarado** não cai nele. |
| 3 | **"6 arquivos" → 7** (achado F) | `log-execucao.md` e `status-geral.md`. A lista nomeada no próprio `status-geral.md` sempre teve 7 e soma 37. |
| 4 | **"2358" → 2359 + linha `Dono:`** (achado F) | `P-ARNES-CANONICA1-VERMELHO-AMBIENTAL`. |
| 5 | **2 achados órfãos com dono** (achado E) | `P-ARNES-CONEXAO-SEM-ASSEVERACAO-DE-IDENTIDADE` e `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` existem agora na `main`. O segundo exige **atribuição por execução N≥10 ANTES** de qualquer correção — confiram que o texto **não** manda consertar. |
| 6 | **Troca de status B-04/B-05** (achado NÃO previsto pelo porteiro) | Este é o item de maior consequência. Confiram que a correção está certa e não inverteu de novo: `P-O6R-B04` (estoque) = **ABERTA**, `P-O6R-B05` = **FECHADA pelo #353**. Contraprova independente: `Kpis/kpis-latest.json` → `roadmap.blocos` e `production_readiness.fechados`. |
| 7 | **Reconciliação da trilha** | 29 registros + `decisoes.md`. **Ponto crítico:** `decisoes.md` foi tomado inteiro de `demo/investidor`. A alegação é que a `main` é **prefixo estrito** da `demo` (append-only puro) e que **nada foi sobrescrito**. **Confiram isso por execução**, não por leitura: `git show f081b5d:agent-orchestration/controle/decisoes.md` vs. as primeiras 1545 linhas da versão nova. Se alguma linha da `main` sumiu, é `bloqueia`. |
| 8 | **Povoamento excluído** | Os 6 JSON de `omega/planos/povoamento/` são dados da **demo** e ficaram FORA por decisão do dono. Confiram que não entraram. |
| 9 | **KPI honesto** | Métricas **carregadas** com nota §C3.3 (nenhuma trilha de código tocada); `blocks_completed` **intocado em 152**; `mvp_*` intocados. O critério (registro/governança não conta como bloco entregue) tem precedente em `JUNTA-MAPAS` e `Ω-GOV` — confiram se aceitam. |
| 10 | **`.gitignore`** | `.claude/worktrees/` e `.tmp-demo/` passam a ser ignorados. Confiram que **nenhum arquivo rastreado** passou a ser ignorado: `git ls-files | grep -E '^\.claude/worktrees/|^\.tmp-demo/'` deve dar 0. |

## 3. Bateria já executada (reexecutem o que quiserem)

`tests/kpi-dashboard-charts.test.ts` **16/16** · `tests/kpi-achados-paridade.test.ts` **6/6** ·
`npm run check` **ec=0** · `node scripts/kpi-freeze.mjs --check` em dia · `node --check Kpis/app.js` **ec=0** ·
`git diff --check` limpo · os dois JSON parseiam. Node v20.19.5, `npm ci` próprio no worktree
(sem junction — `D-JUNTA-ESCOPO-E-CALIBRACAO` §3).

## 4. A divergência que este bloco declara contra si mesmo

`P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE`: o bloco foi implementado **sem** plano do `planejador-mestre`,
contra o §C7. O argumento (não há linha de código; o "plano" é o fecho do parecer do porteiro) está escrito na
pendência, junto com a recomendação de que o contrato ganhe carve-out explícita. **A junta decide** se ratifica
como pontual ou se isso é achado. Não escondam: se acharem que é `bloqueia`, reprovem.

## 5. O que NÃO julgar

O mérito do `B-O6R-ARNES` (#359) já foi julgado e mergeado. O mérito do `B-O6R-02` ciclo 5 é de outra junta.
Aqui julga-se **só** se o registro passou a dizer o que a execução diz.

---

# EMENDA (2026-08-29) — ressalvas do inspetor de terreno, apensadas antes da junta (§A2)

Parecer: `agent-orchestration/omega/juntas/votos/B-O6R-REG/00a-inspetor-terreno-passada1.md`.
Veredito: **`LIBERADO COM RESSALVA`**. O inspetor mediu e confirmou, por execução própria: diff de código
**vazio**, `.gitignore` sem rastreado ignorado, `Kpis/app.js` com diff de **1 linha** (só o `FROZEN` regerado),
povoamento **fora**, quórum "maioria de 3" **sustentado** pelo diff real, baseline `npm run check` **ec=0**,
sem junction, sem resíduo de jurado, e **nenhum cluster de banco é necessário**.

**N1 — os dois hashes.** O briefing acima nomeia `757485c`; o head efetivamente julgado é **`8c00fab`**, cujo
único acréscimo é este próprio briefing (medido: `--name-status` = 1 arquivo). A ata consigna os dois.

## R1 — ATENÇÃO: o guard do S0 dá FALSO-VERMELHO neste worktree

Se você rodar `node scripts/sync-agent-agents.mjs --check` aqui, verá **`DIVERGE` em 22 agentes**. **Não é
divergência real** e **não é achado deste bloco**. Causa medida: a l.39 normaliza CRLF na **fonte**, a l.80
compara o **alvo cru**; sob `core.autocrlf=true` um checkout fresco materializa os dois com CRLF. Nos blobs
commitados, com eol neutralizado: **0/22**. Na árvore principal: `OK — 40 agentes`. Já registrado com dono em
`P-REG-S0-GUARD-FALSO-VERMELHO`. **Não conserte o script** — `scripts/` está fora do escopo, e consertar aqui
destruiria a promessa central do bloco.

## R2 — plano de perda de jurado

Jurado que cair por infra (limite de sessão, interrupção) **não tem voto contado**. O suplente de identidade
nova **re-executa o briefing inteiro** — nada do que o titular começou conta. A junta **não fecha com menos de
3 votos**; 2 votos = junta inválida, não maioria.

## R3 — isolamento e mandato

Mandato **read-only**: nenhum jurado muta arquivo rastreado, cria commit ou branch. **Nenhum jurado precisa de
banco** — `erp-postgres`/`erp-redis` (base viva) **jamais são alvo, nem de leitura**. Re-execução de bateria:
serializada no `reg-359`, ou em worktree detached próprio com `npm ci` próprio — **junction/symlink de
`node_modules` é PROIBIDA** (`D-JUNTA-ESCOPO-E-CALIBRACAO` §3). Para medir conteúdo de commit, use `git show`
ou `git -c core.autocrlf=false checkout` — **nunca** `git archive`+`tar` (é a classe da R1).

## R4 — o item 6 foi achado E consertado pela mesma mão

A troca de status `P-O6R-B04`/`P-O6R-B05` foi encontrada **e** corrigida pelo orquestrador — a classe que o
§C7.4-bis manda desconfiar. **A cadeira de trilha deve verificá-lo executando a contraprova independente**
(`Kpis/kpis-latest.json` → `roadmap.blocos` e `production_readiness.fechados`), com desconfiança máxima, e
**nunca** por leitura do texto que o próprio orquestrador escreveu. Se a correção inverteu de novo, é `bloqueia`.

## R5 — os achados B e D não são fato herdado

O §1 afirma que o porteiro fechou B (branch remota apagada) e D (trilha pushada). **Spot-check pela cadeira de
diff/escopo**, por execução: `git ls-remote --heads origin | grep arnes` e `git ls-remote --heads origin | grep demo/investidor`.

## R6 — resíduos fora do terreno (não são achado da junta)

`.claude/worktrees/gov-descuido` tem mutação **real** não commitada em `scripts/porteiro-pre-merge.mjs` — é
workstream **paralelo** de governança, nenhum jurado desta junta o usa. `agent-af6ea607…` e `plan-c5` limpos.
`.tmp-demo/` untracked e inerte.

## Cadeiras homologadas pelo inspetor

1. **diff/escopo** — diff vazio de código, `.gitignore`, povoamento fora, `8c00fab` só-briefing, e o **mérito da
   divergência de processo** (`P-REG-DIVERGENCIA-SEM-PLANEJADOR-MESTRE`). Com veto.
2. **KPI/números** — backfill §C3.5, "piso 0", "6→7", "2358→2359", `FROZEN`, honestidade §C3.3,
   `blocks_completed` intocado em 152, `mvp_*` intocados.
3. **trilha/append-only** — prefixo estrito de `decisoes.md` **por execução**, os 29 registros, as pendências
   órfãs com dono, e a troca B-04/B-05 pela contraprova independente (R4). Com veto.

**Inelegíveis, por nome:** o orquestrador (escreveu o diff **e** achou o item 6 — não vota); `porteiro-pos-merge`
(achador de A–F); `inspetor-de-terreno-da-junta` (julgou o terreno); `jurado-arnes-*` e suplentes (votaram o
material cujo **registro** está em julgamento); `jurado-c4-*` e `jurado-c5-*`.
