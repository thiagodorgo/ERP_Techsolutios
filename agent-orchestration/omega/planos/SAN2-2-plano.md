# SAN2-2 — Plano do bloco: guard do espelho sem falso-vermelho, lista SUITES do CI honesta, §C7.1-bis/1-ter no contrato canônico

- **Papel:** `planejador-mestre` (Fable — `D-PLANEJADOR-MODELO-FABLE`). Plano escrito ANTES de qualquer linha de código; sem plano = veto.
- **Data:** 2026-08-30
- **Branch/worktree:** `fix/san2-2-guard-espelho-ci` em `.claude/worktrees/san2-r` (criada da `main` `87f6ae6`, já pushada; head atual `a3afdb1` = commit da trilha do porteiro).
- **Autorização de start:** porteiro pós-merge do #362 — **LIBERADO COM RESSALVA** (`agent-orchestration/omega/juntas/votos/SAN2-1R/00c-porteiro-pos-merge-362.md`), carregando as 4 ressalvas dos Achados (commit da trilha, backfill §C3.5, formalização da pendência, faxina §C5).
- **Separação de papéis (§C7.4-bis):** quem ACHOU cada defeito está nomeado no §2 e não conserta; quem PLANEJA é este agente; quem DESENVOLVE é um terceiro, nomeado no §8.

## §1. Objetivo

Fechar três defeitos de **processo/gate** (nenhum é feature de produto) e quitar as quatro ressalvas do porteiro, em 1 PR:

1. **`P-REG-S0-GUARD-FALSO-VERMELHO`** (MÉDIA, dono = este bloco): matar o falso-vermelho universal do `scripts/sync-agent-agents.mjs --check` em checkout fresco no Windows — sem abrir verde-cego (prova por mutação, §4).
2. **`P-O6R-B02-SUITES-LIST-CI`** (MÉDIA): tratar com honestidade a ausência da suíte de corrida do financeiro na lista `SUITES` do `ci.yml` — que, **medido**, não pode ser incluída hoje (o arquivo não existe na `main`; §2.2) — e fechar o buraco que DÁ para fechar: 4 suítes `-db` da `main` fora da lista curada.
3. **`P-C7-BIS-TER-FORA-DA-MAIN`** (achado do gate, confirmado pelo porteiro): transportar o texto normativo de **§C7.1-bis** (`D-INSPETOR-TERRENO-JUNTA`) e **§C7.1-ter** (`D-JUNTA-ESCOPO-E-CALIBRACAO`) da `demo/investidor` para os DOIS contratos da `main` (`CLAUDE.md` + `AGENTS.md`), sem arrastar nenhum outro conteúdo de demo, e **formalizar a pendência** (hoje sem entrada em `pendencias.md`) ao fechá-la.

- **Ator:** nenhum ator de produto — o "usuário" deste bloco é a própria junta (gate S0), o CI e o contrato de execução.
- **Fluxo origem→destino:** `demo/investidor` (texto normativo + agente) → `main` (contratos + `.claude/agents/`); disco (`tests/*-db`) → `ci.yml` (lista curada); assimetria l.39/l.80 → comparação eol-neutra.
- **Contrato REST / modelagem:** **N/A** — o bloco não toca rota, payload, model nem migration (`src/**` e `prisma/**` proibidos, §5). Não há 404/422/409 a declarar.
- **Baseline N / meta M≥2N:** o alvo `sync-agent-agents.mjs` tem **N=0** testes dedicados (medido: `grep -rln "sync-agent-agents" tests/` → nada). Meta: **≥6 casos novos** em `tests/agents-mirror-guard.test.ts` (M≥2N trivialmente satisfeito; declarado sem teatro). Suíte backend baseline oficial: **2595/2597** (SAN2-1R); esperado pós-bloco ≥2601, por execução real no PR.

## §2. Diagnóstico medido (comandos executados por este planejador, 2026-08-30, neste worktree)

### 2.1 Item 1 — o guard mente em checkout fresco

**Qual ponta normaliza: a FONTE.** Em `scripts/sync-agent-agents.mjs`, a l.39 (dentro de `transform()`) faz `rawInput.replace(/\r\n/g, '\n')` — o `want` gerado é sempre LF puro. A l.80 compara o **alvo cru**: `readFileSync(to, 'utf8') !== want`, sem normalizar. A assimetria é essa: fonte normalizada, alvo não.

Reprodução e contraprova, executadas aqui:

```
$ node scripts/sync-agent-agents.mjs --check            # neste worktree = checkout fresco
[agents-sync] DIVERGE: .agents/agents/agente-ci-doutor.md
... (22 DIVERGE, todos os agentes) ...
$ node scripts/sync-agent-agents.mjs --check >/dev/null 2>&1; echo $?   -> 1
$ head -c 200 .claude/agents/planejador-mestre.md | od -c   # fonte no disco: "- - - \r \n" (CRLF)
$ head -c 200 .agents/agents/planejador-mestre.md | od -c   # alvo no disco:  "- - - \r \n" (CRLF)
$ git show HEAD:.claude/agents/planejador-mestre.md | od -c # blob: "- - - \n" (LF puro)
$ git show HEAD:.agents/agents/planejador-mestre.md | od -c # blob: "- - - \n" (LF puro)
$ git config core.autocrlf   -> true
$ ls .gitattributes          -> NÃO EXISTE
$ ls .claude/agents/*.md | wc -l -> 22 · ls .agents/agents/*.md | wc -l -> 23 (22 + README, que é KEEP)
```

Ou seja: blobs LF em forma idêntica (**0/22 divergências reais** — mesmo resultado do inspetor registrado em `P-REG-S0-GUARD-FALSO-VERMELHO`, `pendencias.md` l.3893), o checkout materializa CRLF dos dois lados por `core.autocrlf=true`, o `transform` normaliza só a fonte → todo arquivo "diverge". Na árvore principal dá OK porque lá os alvos foram **escritos pelo próprio script** (`writeFileSync`, bytes LF), nunca re-checkoutados. É o gate fail-closed S0 de toda junta mentindo exatamente no arranjo (worktree novo por jurado) que o contrato exige.

Dois agravantes medidos: **nenhum job do CI roda o `--check`** (`grep sync-agent-agents .github/workflows/ci.yml` → 0 hits) e **nenhuma suíte o exercita** (`grep -rln sync-agent-agents tests/` → nada). O guard não tem guarda.

### 2.2 Item 2 — a suíte de corrida NÃO EXISTE na `main` (fato novo, muda a correção)

```
$ ls tests/ | grep -i "financial.*race"                                    -> (vazio)
$ git cat-file -e main:tests/financial-entry-delete-reverse-race-db.test.ts       -> não existe
$ git cat-file -e origin/main:... e demo/investidor:...                           -> não existe
$ git cat-file -e feat/o6r-b02-financial-uow:tests/financial-entry-delete-reverse-race-db.test.ts
  -> EXISTE (blob e5295083, head 12c3825, 2026-08-25)
```

O arquivo vive **só na branch não-mergeada** `feat/o6r-b02-financial-uow` — o B-O6R-02 parou no ciclo 5 com dossiê ao dono e nunca chegou à `main`. **Incluir a linha na lista `SUITES` hoje quebraria o CI da `main` imediatamente** (`node --test` sobre arquivo inexistente). A pendência `P-O6R-B02-SUITES-LIST-CI` (l.3690) foi escrita da perspectiva da branch do financeiro ("0 hits no head" = head `12c3825`); na `main` ela é **inexequível até o bloco financeiro mergear**.

O que a leitura completa do `ci.yml` deu (job `backend-postgres`, l.162–199: lista curada; l.204–209: guard anti-verde-cego de zero pulos):

```
$ ls tests/*-db.test.ts | wc -l          -> 21 suítes -db na main
$ (diff disco × lista SUITES do ci.yml)  -> 4 AUSENTES da lista:
  impound-custody-history-db.test.ts · vehicle-identity-merge-db.test.ts
  work-order-checklists-freeze-links-db.test.ts · work-order-checklists-sticky-db.test.ts
$ grep de skip nas 4                     -> todas auto-pulam sem DATABASE_URL (e só por isso)
```

As 4 **rodam** hoje no job `backend` (que define `DATABASE_URL`) — mas se o env quebrar, pulam **em silêncio** e o job fica verde. É a exata classe verde-cego que a lista curada + guard de zero pulos existe para punir. Elas são o pedaço fechável do item 2.

### 2.3 Item 3 — §C7.1-bis/1-ter fora da `main`, e o que MAIS falta para a cláusula ser executável

```
$ git show main:CLAUDE.md | grep -c "1-bis\|1-ter"  -> 0     · main:AGENTS.md -> 0
$ git show demo/investidor:CLAUDE.md | grep -c ...  -> 2     · demo:AGENTS.md -> 2
$ (localização exata na demo)  CLAUDE.md: 1-ter = l.333–363 · 1-bis = l.365–376 · item 2 = l.377
                               AGENTS.md: 1-ter = l.361 · 1-bis = l.393 · item 2 = l.405 (bloco = l.361–404)
$ (ponto de inserção na main)  CLAUDE.md: entre l.331 (fim do item 1) e l.332 (item 2)
                               AGENTS.md: entre l.359 e l.360
```

Fatos que calibram o transporte:

- **As DUAS decisões JÁ estão na `main:decisoes.md`** — `D-INSPETOR-TERRENO-JUNTA` (l.1549) e `D-JUNTA-ESCOPO-E-CALIBRACAO` (l.1610, com ERRATA apensada na l.1702). Falta só o texto **contratual**. A ERRATA corrige o §6 da decisão (inventário de divergências entre branches), **não** os números que o 1-ter cita (≈155/≈66/34) — esses vêm de `agent-orchestration/omega/auditoria-juntas-2026-08-28.md`, que **EXISTE na `main`** (`git cat-file -e` → ok). Transporte verbatim é seguro.
- **O agente que o 1-bis manda nascer NÃO existe na `main`:** `.claude/agents/inspetor-de-terreno-da-junta.md` → só na demo (115 linhas; frontmatter com `model: fable` e `tools:` — o sync remove `tools:` e preserva `model:`). Transportar o texto sem o agente deixaria a `main` com uma cláusula fail-closed **impossível de cumprir** — bloquearia toda junta. O agente entra no transporte; `.claude/agents/especialistas/` (dir que só existe na demo) **NÃO** entra.
- O `.agents/agents/README.md` não enumera o inspetor **nem na demo** (grep → 0) — nenhuma mudança de README é devida.
- `EXECUTION_MODEL.md` não menciona 1-bis/1-ter em nenhuma das duas branches (0×0) — fora do escopo.
- **Agravante confirmado:** `P-C7-BIS-TER-FORA-DA-MAIN` não tem entrada em `pendencias.md` nem no índice (grep → só `P-O6R-B02-SUITES-LIST-CI` l.3690 e `P-REG-S0-GUARD-FALSO-VERMELHO` l.3893). O índice é **GERADO** por `agent-orchestration/controle/gerar-indice-pendencias.py` — regenerar, não digitar.
- **Armadilha de terreno descoberta nesta medição (Windows/Git Bash):** o MSYS converte argumento `rev:.caminho` que começa com ponto (`demo/investidor:.claude/...` vira `demo\investidor;.claude\...`) e o git falha com "ambiguous argument". Extração de blob com caminho iniciado em `.` exige **`MSYS_NO_PATHCONV=1`**. E vale a lei do 1-ter(c): **nada de `git archive`+`tar`** sob `core.autocrlf=true` — só `git show` do blob.

### 2.4 Ressalvas do porteiro — estado medido

```
$ node -e "(history)"  -> entrada pr 362: merge_commit=null, approved_head=null (145 entradas no history)
$ node -e "(latest)"   -> release.pr=362, release.merge_commit=null, release.approved_head=null
$ (kpi-freeze.mjs)     -> a cópia FROZEN do app.js é GERADA do kpis-latest.json; editar o latest sem rodar
                          `node scripts/kpi-freeze.mjs` derruba o guard `tests/kpi-dashboard-charts.test.ts`
$ git worktree list    -> san2-1 em 55aa8a3 [chore/san2-1-resgate] (a remover)
$ git branch -a        -> chore/san2-1-triagem-pendencias (local, sem upstream) · origin/chore/san2-1-resgate (viva)
$ git status votos/SAN2-1R/ -> os 3 artefatos do porteiro JÁ estão commitados neste worktree (head a3afdb1)
```

**Quem achou o quê (§C7.4-bis):** item 1 = `inspetor-de-terreno-da-junta` do B-O6R-REG (R1), confirmado por execução pelo orquestrador e re-reproduzido por este planejador; item 2 = validação A5 + arnês #6 do B-O6R-02; item 3 = gate do #362, confirmado pelo porteiro pós-merge. Nenhum deles implementa a correção.

## §3. Correção proposta, item a item

### 3.1 Guard do espelho (FECHA `P-REG-S0-GUARD-FALSO-VERMELHO`)

**(a) O conserto, na ponta que hoje NÃO normaliza.** Na comparação do `--check` (l.80), normalizar o alvo com a MESMA regra da fonte antes de comparar:

- de: `if (readFileSync(to, 'utf8') !== want) drift.push(...)`
- para: ler o alvo, aplicar `.replace(/\r\n/g, '\n')` e comparar com `want`.

Simetria por construção: as duas pontas passam pela mesma normalização; a comparação vira eol-neutra (o que o guard sempre quis medir é o CONTEÚDO do papel, não a materialização do autocrlf). O caminho de escrita (l.92–101) **não muda**: continua gravando LF, e o git normaliza no commit.

**(b) Teste permanente `tests/agents-mirror-guard.test.ts`** (novo, entra no glob do `npm test`). Sem tocar a interface do script: o teste **copia o script real** (lido de `scripts/sync-agent-agents.mjs` em runtime) para uma árvore sintética no scratchpad (`<tmp>/scripts/` + `<tmp>/.claude/agents/` + `<tmp>/.agents/agents/`) e o executa como child process — o `ROOT` do script deriva da própria localização, então a cópia o aponta para a árvore de fixture. Casos mínimos (≥6): (1) fonte CRLF + espelho LF → exit 0; (2) fonte LF + espelho CRLF → exit 0; (3) mutação de 1 linha de corpo no espelho → exit 1 + `DIVERGE` no arquivo certo; (4) arquivo faltando no espelho → exit 1 + `FALTA`; (5) arquivo a mais no espelho (fora do KEEP) → exit 1 + `SOBRA`; (6) no espelho gerado, `tools:` removida e **`model:` preservada** (a regra de `D-PLANEJADOR-MODELO-FABLE` não pode sofrer drift). Teardown escopado no scratchpad — nada de mass-delete fora dele.

**(c) O guard ganha guarda no CI:** passo novo no job `backend` do `ci.yml` (após "Install dependencies", antes dos testes): `node scripts/sync-agent-agents.mjs --check`. No runner Linux o checkout é LF — zero interferência de autocrlf — e drift real do espelho passa a **reprovar o PR** (regra do D-INTEROP: alterou um, altera o outro no mesmo PR). Custa <1s.

**Na pendência:** `P-REG-S0-GUARD-FALSO-VERMELHO` → FECHADA neste PR, com apenso de evidência (§4, drills A/B); o registro original fica (§A2).

### 3.2 Lista SUITES do CI (trata `P-O6R-B02-SUITES-LIST-CI` com o que é possível na `main`)

**(a) A suíte nomeada NÃO entra — e isso fica escrito.** Motivo medido (§2.2): o arquivo não existe na `main`; a linha quebraria o CI. Ações: **apensar** à entrada `P-O6R-B02-SUITES-LIST-CI` (l.3690) a medição de 2026-08-30 (arquivo só em `feat/o6r-b02-financial-uow`, blob `e5295083`) e **re-atribuir o dono**: "PR que mergear o B-O6R-02 (ciclo 5 financeiro) — a inclusão na lista SUITES é parte da DoD daquele merge". Status: **segue ABERTA** (não se fecha o que não se pode executar). No `ci.yml`, 1 linha de comentário no bloco SUITES reservando o lugar da suíte para o merge do financeiro.

**(b) As 4 ausentes que EXISTEM na `main` entram — cada uma provada antes.** Para cada uma de `impound-custody-history-db` · `vehicle-identity-merge-db` · `work-order-checklists-freeze-links-db` · `work-order-checklists-sticky-db`: o dev roda a suíte nas condições EXATAS do job (`CORE_SAAS_PERSISTENCE=prisma`, `RBAC_DB_PARITY=1`, banco **descartável** migrado + seed — **nunca** `erp-postgres`/`erp-redis`) e ela só entra na lista se der **0 pulos e 0 falhas**; quem pular ou falhar por desenho fica FORA, com o porquê em comentário no `ci.yml` e pendência nomeada com bloco dono. Esperado (pelas condições de skip medidas — só ausência de `DATABASE_URL`): as 4 entram; lista vai de 23 → 27 suítes, sob o guard de zero pulos já existente (l.204–209).

### 3.3 Transporte de §C7.1-bis/1-ter (FECHA `P-C7-BIS-TER-FORA-DA-MAIN`, formalizando-a antes)

Ordem de operações no PR:

1. **Formalizar a pendência**: entrada nova `## P-C7-BIS-TER-FORA-DA-MAIN (2026-08-29 — achado do gate do #362, confirmado pelo porteiro)` em `pendencias.md`, com a evidência dos 4 pontos (0/0 na main, 2/2 na demo) e o agravante (ID sem entrada até aqui). No MESMO PR, marcá-la FECHADA com a evidência do transporte. Regenerar o índice: `python agent-orchestration/controle/gerar-indice-pendencias.py`.
2. **Extrair os fragmentos por `git show` do blob** (nunca archive/tar; `MSYS_NO_PATHCONV=1` onde o caminho começar com ponto):
   - `git show demo/investidor:CLAUDE.md | sed -n '333,376p'` → inserir em `CLAUDE.md` entre as atuais l.331 e l.332 (dentro do §C7, depois do item 1, antes do item 2 — mesma posição e ordem da demo: 1-ter, depois 1-bis).
   - `git show demo/investidor:AGENTS.md | sed -n '361,404p'` → inserir em `AGENTS.md` entre l.359 e l.360.
   - Conferir `diff` fragmento×fragmento (esperado: idênticos, ou só diferenças estritamente de ferramenta, listadas na ata) e que `git diff` dos contratos mostre **apenas os hunks de inserção** — o §C7.4 vigente (teto de 2 ciclos), o §C7.7 e todo o resto ficam intactos; a demo carrega o §C7.4 ANTIGO e ele **NÃO vem junto**.
3. **Transportar o instrumento da cláusula**: `MSYS_NO_PATHCONV=1 git show 'demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md' > .claude/agents/inspetor-de-terreno-da-junta.md` (verbatim, 115 linhas). Rodar `node scripts/sync-agent-agents.mjs` (já consertado) → o espelho ganha `.agents/agents/inspetor-de-terreno-da-junta.md` (23 agentes). **Nada mais da demo entra** — nem `especialistas/`, nem qualquer outro arquivo.
4. **Sem tocar `decisoes.md`**: as duas decisões já estão lá; o transporte é execução delas, registrado na pendência + ata da junta (§A2 — não se reescreve decisão).

### 3.4 Ressalvas do porteiro (mesmo PR)

1. **Trilha do gate**: os 3 artefatos de `agent-orchestration/omega/juntas/votos/SAN2-1R/` já foram commitados no head `a3afdb1` deste worktree — o dev **confirma** que os 3 estão no diff do PR (durabilidade §C7.1) e não os reescreve.
2. **Backfill §C3.5**: na entrada `pr: 362` do `Kpis/kpis-history.json` E no `release` do `Kpis/kpis-latest.json`: `merge_commit: "87f6ae6"`, `approved_head: "4cd0867"` + nota de 1 linha: "approved_head = head JULGADO consignado na ata; headRefOid 55aa8a3 = +2 commits de registro puro pós-voto (3d85618 ata, 55aa8a3 nº do PR no KPI) — não vistos pela junta". Em seguida **obrigatório**: `node scripts/kpi-freeze.mjs` (reinjeta o FROZEN no `app.js`) e reexecutar o guard de charts.
3. **Entrada SAN2-2 nova** no history (+ latest vira o snapshot do bloco): contagens de **execução real** desta árvore — suíte backend completa reexecutada (baseline 2595/2597 + ≥6 novos = esperado ≥2601; qualquer delta explicado no note); trilhas não tocadas (frontend/flutter) carregam o último oficial com nota explícita (§C3.3); `pr` preenchido após `gh pr create`; `merge_commit`/`approved_head` = `null` na autoria (§C3.5 — backfill no bloco seguinte).
4. **Faxina §C5 (pós-merge, fora do diff)**: `git worktree remove --force .claude/worktrees/san2-1` → `git push origin --delete chore/san2-1-resgate` → `git branch -D chore/san2-1-triagem-pendencias` → `bash scripts/post-merge-cleanup.sh`. Reportada em 1 linha no fechamento do bloco.

## §4. Como provar que a correção funciona (mutação em checkout fresco — não só "ficou verde")

**Drill A — o falso-vermelho morreu onde ele nascia.** Worktree NOVO no scratchpad (`git worktree add <scratchpad>/san2-2-proof <head-do-PR>`; **sem** `npm ci` — o script só usa `node:fs`; junction de `node_modules` PROIBIDA; remoção só via `git worktree remove --force`). Nele, sob `core.autocrlf=true`, confirmar por `od -c` que fonte E alvo materializaram CRLF, e então: `node scripts/sync-agent-agents.mjs --check` → **exit 0, "23 agentes, espelho consistente"**. É o mesmo arranjo que hoje dá 22 DIVERGE (§2.1) — o par antes/depois é a prova.

**Drill B — o guard ainda morde (4 mutações, 4 vermelhos certos).** No MESMO worktree fresco, em sequência, revertendo entre cada uma:
1. mutar 1 linha do corpo de um agente-FONTE (ex.: `.claude/agents/critico-adversarial.md`) → `--check` DEVE sair 1 com `DIVERGE` exatamente nesse arquivo;
2. mutar 1 linha de um arquivo do ESPELHO → exit 1 + `DIVERGE`;
3. apagar 1 arquivo do espelho → exit 1 + `FALTA`;
4. criar `.agents/agents/intruso.md` → exit 1 + `SOBRA`.
Se qualquer mutação passar verde, a correção trocou falso-vermelho por verde-cego → **REPROVA o item**. Evidência (comando + saída) vai para o arquivo de evidência da junta, item a item (§C7.7 — a morte só custa a cauda não medida).

**Drill C — permanente:** `tests/agents-mirror-guard.test.ts` (§3.1b) codifica A+B como regressão; roda em todo `npm test` e no CI.

**Item 2:** prova local ANTES do push — cada uma das 4 suítes contra Postgres **descartável** migrado+seed em `prisma`, com contagem de pulos = 0 registrada por suíte; prova final = o job `backend-postgres` do PRÓPRIO PR verde com a lista expandida sob o guard de zero pulos (l.204–209). O TAP do job é a evidência.

**Item 3:** no head do PR: `grep -c "1-bis\|1-ter" CLAUDE.md` → 2 e `AGENTS.md` → 2; `git diff main...HEAD -- CLAUDE.md AGENTS.md` mostra SOMENTE os hunks de inserção; diff fragmento CLAUDE × fragmento AGENTS vazio (ou só diferenças de ferramenta, listadas na ata); `--check` do espelho verde com o inspetor incluído (23 agentes); `MSYS_NO_PATHCONV=1 git show` do agente na demo × arquivo novo na árvore → diff vazio (transporte verbatim).

**KPI:** `node scripts/kpi-freeze.mjs --check` → exit 0 · `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → 16/16 (ou mais, se o guard crescer) · `node --check Kpis/app.js`.

## §5. Escopo (caminhos exatos)

**PERMITIDO (tudo o mais é proibido):**

- `scripts/sync-agent-agents.mjs` — só a comparação do `--check` (§3.1a).
- `tests/agents-mirror-guard.test.ts` — NOVO (§3.1b).
- `.github/workflows/ci.yml` — só: passo do `--check` no job `backend` (§3.1c) + bloco SUITES do job `backend-postgres` (até 4 linhas novas + comentários, §3.2).
- `CLAUDE.md` e `AGENTS.md` — só a inserção dos blocos 1-ter/1-bis no §C7 (§3.3.2); nenhuma outra linha.
- `.claude/agents/inspetor-de-terreno-da-junta.md` — NOVO, verbatim da demo (§3.3.3).
- `.agents/agents/inspetor-de-terreno-da-junta.md` — GERADO pelo sync (não editar à mão).
- `agent-orchestration/controle/pendencias.md` — 3 entradas: formalizar+fechar `P-C7-BIS-TER-FORA-DA-MAIN`; fechar `P-REG-S0-GUARD-FALSO-VERMELHO`; apensar medição e re-atribuir dono em `P-O6R-B02-SUITES-LIST-CI` (apensos; texto histórico não se reescreve).
- `agent-orchestration/controle/pendencias-indice.md` — regenerado pelo script (não digitar).
- `Kpis/kpis-history.json` · `Kpis/kpis-latest.json` · `Kpis/app.js` (via `kpi-freeze.mjs`) · `Kpis/index.html` se o guard exigir (§3.4.2–3).
- `agent-orchestration/omega/planos/SAN2-2-plano.md` (este arquivo) · `agent-orchestration/omega/juntas/J-SAN2-2*.md` + `agent-orchestration/omega/juntas/votos/SAN2-2/**` (ata/votos/evidência) · `agent-orchestration/omega/reprovacoes/R-SAN2-2-*.md` se houver ciclo 2.
- `agent-orchestration/docs/status-geral.md` · `agent-orchestration/codex/log-execucao.md` — registro do bloco.
- Os 3 artefatos de `agent-orchestration/omega/juntas/votos/SAN2-1R/` — já commitados; ficam no diff, não se reescrevem.

**PROIBIDO (lista explícita, além de "tudo o mais"):**

- `src/**`, `frontend/**`, `mobile/**`, `portals/**`, `prisma/**`, `migrations/**`, `infra/**`, `.env*`, lockfiles (`package-lock.json`, `frontend/package-lock.json`, `pubspec.*`).
- `tests/**` EXCETO o arquivo novo nomeado acima. Em particular: NÃO importar `tests/financial-entry-delete-reverse-race-db.test.ts` (nem qualquer arquivo) da branch `feat/o6r-b02-financial-uow`.
- `.claude/agents/**` EXCETO o arquivo novo nomeado; `.claude/agents/especialistas/**` da demo NÃO entra.
- `.github/workflows/{backup-database,deploy-production,deploy-staging,uptime-check}.yml`.
- `decisoes.md` (as decisões já existem; nada a escrever), `EXECUTION_MODEL.md`, demais seções de `CLAUDE.md`/`AGENTS.md`.
- Containers `erp-postgres`/`erp-redis` (banco de prova = descartável); `git push --force`; commit na `main`; `git archive`+`tar` para medir conteúdo; junction/symlink de `node_modules` entre worktrees.

## §6. Bateria de validação (sequência exata; o dev roda NA ORDEM, e compara cada número esperado com o obtido)

**Regra do número que não bate (vale para toda a bateria): PARAR.** Nunca ajustar o esperado ao obtido. Se a
divergência for do bloco → consertar antes do PR; se for pré-existente → pendência nomeada com bloco dono e o
número publicado com N, forma e causa (§C7.1-ter-a). O KPI publica SEMPRE o executado, nunca o planejado.

### Fase 1 — guard do espelho (item 1), antes de tudo (é o S0 da junta deste próprio bloco)

1. `node scripts/sync-agent-agents.mjs` → regenera o espelho; esperado: **23 agentes** (22 + inspetor novo).
2. `node scripts/sync-agent-agents.mjs --check` → **exit 0** NESTE worktree — o mesmo arranjo que hoje dá
   22 DIVERGE (§2.1); o par antes/depois é a primeira evidência. Se ainda houver DIVERGE: a normalização do
   §3.1a está errada/incompleta → voltar ao código, não seguir adiante.
3. **Drill A (§4):** `git worktree add "$SCRATCH/san2-2-proof" HEAD` (sem `npm ci`; junction PROIBIDA) →
   `od -c` prova CRLF materializado em fonte E alvo → `node scripts/sync-agent-agents.mjs --check` →
   **exit 0, 23 agentes**. Remoção SÓ por `git worktree remove --force "$SCRATCH/san2-2-proof"` (ao fim da Fase 1).
4. **Drill B (§4):** 4 mutações no worktree de prova, revertendo entre cada → **4× exit 1** com o rótulo
   certo (`DIVERGE`/`DIVERGE`/`FALTA`/`SOBRA`). Qualquer verde = a correção abriu verde-cego → REPROVA o
   item, volta ao §3.1a. Evidência (comando + saída) por mutação em `votos/SAN2-2/`.
5. `node --test --import tsx tests/agents-mirror-guard.test.ts` → **≥6 pass · 0 fail · 0 skip**. Skip aqui é
   proibido por desenho (o teste não depende de banco/env): 1 skip = teste mentindo → consertar o teste.

### Fase 2 — as 4 suítes `-db`, cada uma em banco DESCARTÁVEL (item 2)

Nunca `erp-postgres`/`erp-redis` (§5): containers próprios do bloco em portas altas, condições EXATAS do job
`backend-postgres` (`ci.yml` l.100–111):

```bash
docker run -d --name san2-2-pg -e POSTGRES_DB=erp_techsolutions -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -p 55432:5432 postgres:16
docker run -d --name san2-2-redis -p 56379:6379 redis:7
export DATABASE_URL="postgresql://postgres:postgres@localhost:55432/erp_techsolutions?schema=public"
export REDIS_URL="redis://localhost:56379"
export CORE_SAAS_PERSISTENCE=prisma RBAC_DB_PARITY=1 JWT_SECRET=dev-only-change-me LOG_LEVEL=silent
npx prisma migrate deploy && npm run db:seed
for s in impound-custody-history-db vehicle-identity-merge-db \
         work-order-checklists-freeze-links-db work-order-checklists-sticky-db; do
  node --test --import tsx "tests/$s.test.ts" 2>&1 | tee "$SCRATCH/$s.tap"
  grep -E '^# (pass|fail|skipped) ' "$SCRATCH/$s.tap"
done
```

Esperado por suíte: **0 fail · 0 skipped** — não há denominador prévio de `pass` (o N de cada suíte é
registrado na evidência da junta; o critério de entrada na lista é zero pulo/zero falha, §3.2b). Rodar o
`for` **3 vezes** seguidas: intermitência local já desqualifica a linha (§7c). Suíte que pular/falhar fica
**FORA** da lista, com comentário no `ci.yml` + pendência nomeada com bloco dono — não se força.

### Fase 3 — transporte do contrato (item 3)

- `grep -c "1-bis\|1-ter" CLAUDE.md` → **2** · `grep -c "1-bis\|1-ter" AGENTS.md` → **2**.
- `git diff main...HEAD -- CLAUDE.md AGENTS.md | grep -c '^-[^-]'` → **0** (nenhuma linha removida: o
  transporte é inserção PURA — prova mecânica de que o §C7.4 vigente, teto de 2 ciclos, ficou intacto e o
  antigo da demo NÃO veio; ver §7d).
- Diff fragmento×fragmento (bloco inserido no CLAUDE × bloco inserido no AGENTS) → vazio, ou só diferenças
  estritamente de ferramenta listadas na ata.
- `MSYS_NO_PATHCONV=1 git show 'demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md' | diff - .claude/agents/inspetor-de-terreno-da-junta.md`
  → **vazio** (verbatim, 115 linhas).
- `node scripts/sync-agent-agents.mjs --check` de novo → exit 0, **23 agentes** (espelho do inspetor
  GERADO pelo sync, não editado à mão).

### Fase 4 — pendências e KPI

- `python agent-orchestration/controle/gerar-indice-pendencias.py` → índice regenerado;
  `git diff --stat agent-orchestration/controle/` mostra SÓ `pendencias.md` + `pendencias-indice.md`;
  grep dos 3 IDs confirma o estado de cada um (FECHADA / FECHADA / ABERTA-reatribuída).
- Backfill 362 + entrada SAN2-2 nos JSON (§3.4.2–3) → `node scripts/kpi-freeze.mjs` →
  `node scripts/kpi-freeze.mjs --check` → **exit 0** → `node --check Kpis/app.js` → exit 0.
- `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → **16/16 pass** (ou mais se o guard
  crescer; fail = freeze defasado ou série inconsistente → rodar o freeze de novo, NUNCA editar `app.js` à mão).

### Fase 5 — suíte completa e higiene (bateria padrão §9)

Reset de ambiente antes: recriar o par descartável limpo (`docker rm -f san2-2-pg san2-2-redis` → subir de
novo → `npx prisma migrate deploy`, SEM seed), `export CORE_SAAS_PERSISTENCE=memory`, `unset RBAC_DB_PARITY`
— espelha o job `backend` do CI (`ci.yml` l.14–21). A base viva não é alvo em NENHUMA fase.

- `npm run check` → exit 0 · `npm run lint` → exit 0.
- `npm test` → **pass ≥2601** (baseline 2595/2597 do SAN2-1R + ≥6 do teste novo), e os 2 não-pass do
  baseline continuam sendo OS MESMOS, pelos mesmos motivos (conferir no TAP quais são). Se pass <2601:
  regressão, ou o teste novo não entrou no glob do `run-backend-tests.mjs` → consertar. Se surgir pulo novo:
  identificar QUAL suíte e por quê (env quebrado ou efeito do bloco) antes do PR. Se pass > esperado sem
  causa conhecida: identificar a origem; o delta inteiro vai explicado no note do history (§C3.3).
- `npm run build` → exit 0.
- `git diff --check` → limpo.
- `git diff main...HEAD --stat` → TODO arquivo do diff consta do PERMITIDO do §5; arquivo fora da lista =
  remover antes do push.
- Teardown: `docker rm -f san2-2-pg san2-2-redis` + limpeza dos `.tap` do scratchpad (§C5, escopada).

### Fase 6 — pós-push (antes da junta votar)

Os DOIS jobs do CI verdes no PR: no `backend`, o passo novo `sync-agent-agents --check` verde; no
`backend-postgres`, o TAP mostra a lista com **27 suítes** e o guard de zero pulos reporta
`testes pulados: 0`. O TAP do job é a prova final do item 2 (§4) e entra na evidência da junta.

## §7. Riscos e o que pode dar errado (cada um com detecção e reversão)

**(a) A normalização do alvo mascarar divergência REAL de conteúdo.** A regra nova é eol-neutra e SÓ
eol-neutra: `\r\n`→`\n`, nada de trim, case ou colapso de espaço. "Divergência real que consista apenas de
EOL" não existe como drift normativo: sob `core.autocrlf=true` o commit renormaliza para LF e os blobs ficam
idênticos (medido: 0/22 divergências de blob, §2.1) — o que o guard mede é o papel, não a materialização do
checkout. Qualquer outra diferença de byte (palavra trocada, espaço interno, BOM, linha a mais) continua
reprovando. **Detecção:** Drill B — 4 mutações de conteúdo, 4 vermelhos obrigatórios (§4); e o caso 3 do
teste permanente FIXA a semântica: se alguém alargar a normalização no futuro, a mutação de 1 linha para de
reprovar e o teste acusa no mesmo `npm test`. **Reversão:** a mudança é 1 expressão na comparação (l.80) —
revert de 1 linha restaura o comportamento anterior por inteiro.

**(b) O passo novo no CI reprovar PRs legítimos.** Reprovar PR que editou `.claude/agents/` sem rodar o sync
NÃO é falso positivo — é o D-INTEROP funcionando ("alterou um, altera o outro no mesmo PR"). O falso positivo
real seria PR que não tocou agente algum ficar vermelho no passo. No runner Linux o checkout materializa os
blobs como estão (LF, sem autocrlf) — o arranjo do falso-vermelho do Windows não existe lá; e, após (a), a
comparação é eol-neutra dos dois lados de toda forma. **Detecção:** a saída do passo NOMEIA os arquivos
(`DIVERGE`/`FALTA`/`SOBRA <path>`) — vermelho num PR cujo diff não toca esses paths = bug do guard, não do
PR. **Reversão:** remover o passo é 1 linha no `ci.yml` (PR de correção + pendência nomeada). PROIBIDO
"reverter" com `continue-on-error`/`|| true` — seria verde-cego institucionalizado no mesmo lugar que este
bloco veio fechar.

**(c) As 4 suítes `-db` entrarem na lista e ficarem intermitentes no CI.** Flake no `backend-postgres`
bloqueia PRs sem relação — o guard de zero pulos (l.204–209) não perdoa. **Detecção antecipada:** Fase 2
roda cada suíte **3×** em banco descartável — intermitência local já barra a linha antes do push.
**Detecção tardia:** vermelho intermitente no CI com o mesmo código (re-run muda o resultado).
**Reversão:** remover SÓ a linha da suíte flaky (revert de 1 linha), pendência nomeada
`P-SAN2-2-SUITE-FLAKY-<nome>` com bloco dono; a suíte continua rodando no job `backend` como hoje — recuo
honesto e barato, nunca skip silencioso.

**(d) O transporte arrastar o §C7.4 ANTIGO da demo (teto de 5 ciclos, REVOGADO por `D-TETO-DOIS-CICLOS`) —
o risco mais caro do bloco.** A demo carrega o §C7.4 pré-revogação ("ciclos 1–2 … ciclos 4–5 … parada só
após o ciclo 5"); se ele pegar carona na inserção, o contrato canônico REABRE em silêncio um protocolo
revogado, e toda junta futura lê o teto errado de ciclos. **Detecção (3 camadas, todas na Fase 3):**
(1) extração por `sed -n` de faixa FECHADA do blob (`333,376p` / `361,404p`) — nunca copiar o §C7 inteiro à
mão; (2) `git diff main...HEAD -- CLAUDE.md AGENTS.md | grep -c '^-[^-]'` → **0**: como o transporte é
inserção pura, QUALQUER linha removida nesses dois arquivos = contaminação; (3) grep dos marcadores do texto
antigo ("ciclos 4–5", "ciclo 5 falho") com contagem idêntica à da main pré-PR (medir antes E depois — o
1-ter cita "ciclo 4"/"quatro ciclos" como fato histórico, o que não colide com esses marcadores). A cadeira
de contrato (§8) REEXECUTA as três camadas; não aceita afirmação. **Reversão:** antes do merge,
`git checkout main -- CLAUDE.md AGENTS.md` + reextração; se chegasse à main, PR imediato de correção com
diff mínimo + apenso na pendência (§A2 — registra-se, não se reescreve).

**(e) `kpi-freeze` esquecido derrubando o guard de charts.** Editar `kpis-latest.json`/`kpis-history.json`
sem rodar `node scripts/kpi-freeze.mjs` deixa o FROZEN do `app.js` defasado (§2.4). **Detecção:** dupla e já
embutida na bateria — `kpi-freeze.mjs --check` (exit 1 se defasado, Fase 4) e
`tests/kpi-dashboard-charts.test.ts`, que roda no `npm test` (Fase 5) E no CI: o risco só vira dano se DUAS
fases forem puladas. **Reversão:** rodar o freeze e reexecutar o guard. NUNCA editar `Kpis/app.js` à mão
para "fazer passar" — o guard-teatro já foi pego por mutação uma vez (memória do painel honesto).

**(f) A faxina §C5 apagar o que não devia.** Três lâminas: o worktree `san2-1`, a branch local
`chore/san2-1-triagem-pendencias` (SEM upstream — commits só nela morrem com `-D`) e a remota
`chore/san2-1-resgate`. Histórico real (2026-08-26): rm -rf num worktree com junction de `node_modules`
mutilou a árvore do dev E a principal — junction entre worktrees é PROIBIDA, mas pode existir por legado.
**Detecção ANTES do corte:** (1) conferir se `.claude/worktrees/san2-1/node_modules` é reparse point
(`fsutil reparsepoint query …` ou `ls -la` mostrando link) — se for, parar e desfazer o link primeiro;
remoção do worktree SÓ por `git worktree remove --force` (nunca rm -rf); (2)
`git log --oneline main..chore/san2-1-triagem-pendencias` — commit não alcançável pela main = anotar o hash
na ata ANTES do `-D`; (3) confirmar que os 3 artefatos do porteiro estão no head DESTE worktree antes do
delete remoto (medido §2.4: estão, `a3afdb1`); (4) `git clean -nxd` (dry-run) antes de qualquer clean.
**Reversão:** branch local volta por `git branch <nome> <hash-do-reflog>` (~90 dias); remota deletada volta
por push do hash anotado na ata; worktree removido via `git worktree remove` não apaga nada rastreado — é
regenerável por `git worktree add`.

**(g) (adicional) O teste permanente rodar uma CÓPIA do script e mascarar drift do script real.** O desenho
do §3.1b copia `scripts/sync-agent-agents.mjs` para uma árvore sintética; se uma mudança futura no script
(ex.: derivação do `ROOT`) fizer a cópia se comportar diferente do original, o teste validaria um artefato,
não o guard real. **Detecção:** o teste lê o script REAL em runtime (não um snapshot), então muda junto; e o
passo do CI (§3.1c) executa o script original na árvore original a cada PR — as duas pontas se cobrem.
**Reversão:** se divergirem (teste verde + passo do CI vermelho, ou vice-versa), o par de resultados é em si
o diagnóstico; trata-se o script, nunca se afrouxa o teste.

## §8. Junta e quórum

### 8.1 Quórum: UNANIMIDADE — decidido, não em aberto

Pela régua do §C7.1-ter-b: unanimidade de 3 quando o bloco toca dinheiro, segurança, permissão ou perda de
dado; maioria de 3 no resto. O contra-argumento honesto para maioria existe e fica registrado: o bloco não
toca `src/**` nem dado de cliente, e cada correção reverte com ~1 linha (§7a/b/c). Ele perde para três fatos:
(1) o bloco reescreve o **gate fail-closed S0 de toda junta futura** — defeito aqui não é bug de produto, é
gate que MENTE, e o modo de falha é silencioso (um falso-verde não fica vermelho em lugar nenhum depois; a
detecção vive SÓ nesta junta); (2) altera o **contrato canônico** que define o que todo agente tem permissão
de fazer — o risco (d) reabriria em silêncio um protocolo revogado, e "revert de 1 linha" não vale para
contaminação que ninguém detecta; (3) mexe na lista curada do CI, cujo modo de falha é exatamente verde-cego
(perda do sinal de teste = perda do dado de medição). As categorias do 1-ter leem-se pelo raio de estrago da
falha silenciosa, e aqui o raio é todas as juntas e todos os merges futuros. Decisão: UNANIMIDADE. O custo
em atrito que a auditoria mediu está limitado por D-TETO-DOIS-CICLOS (máx. 2 ciclos antes de dossiê) e pelo
1-ter-a (achado pré-existente com evidência NÃO reprova — vira pendência nomeada com bloco dono).

### 8.2 Composição: 4 cadeiras votantes, todas com veto (unanimidade 4×0)

O piso do 1-ter-b é 3; o bloco exige 4 competências distintas, e fundir duas cadeiras para manter a
aritmética em 3 seria teatro de quórum — unanimidade de 4 é mais estrita que o piso, nunca menos. Todo voto
declara `gravidade` E `escopo` com evidência (1-ter-a; escopo sem evidência = `dentro-do-bloco`). Sem
cadeira de `critico-adversarial`: não é bloco de invariante financeiro (1-ter-b). Identidades: todas NOVAS
e efêmeras — especificação de cada cadeira e votos em `agent-orchestration/omega/juntas/votos/SAN2-2/`;
nenhum arquivo novo em `.claude/agents/` (o §5 só permite o inspetor — jurado não vira agente versionado
neste bloco).

- **C1 — `provador-de-mutacao-do-espelho`** (veto: sim). Julga o item 1 inteiro: a normalização do §3.1a é
  eol-neutra e SÓ eol (risco a); REEXECUTA ele próprio o Drill A (worktree fresco, par antes/depois) e o
  Drill B (4 mutações → 4 vermelhos com o rótulo certo) — não aceita saída de terceiro; o teste permanente
  tem ≥6 casos e 0 skip, incluindo o caso 6 (`model:` preservada — a regra de `D-PLANEJADOR-MODELO-FABLE`
  não pode sofrer drift); risco (g): confere que o teste roda a cópia e o passo do CI roda o original, e que
  as duas pontas se cobrem.
- **C2 — `curador-da-lista-suites-ci`** (veto: sim). Julga o item 2: o passo novo do `--check` no job
  `backend` sem `continue-on-error` nem exit code engolido (§7b — recuo assim é PROIBIDO); as 4 linhas
  novas da lista `SUITES` com a evidência das 3 execuções × 0 pulo/0 falha em banco descartável (risco c —
  intermitência local desqualifica a linha); que a suíte do financeiro NÃO entrou, com comentário-reserva no
  `ci.yml` e dono reatribuído na pendência (§3.2a); guard de zero pulos (l.204–209) intacto; TAP do job
  `backend-postgres` do próprio PR com 27 suítes e `testes pulados: 0`.
- **C3 — `zelador-do-contrato-canonico`** (veto: sim). Julga o item 3: REEXECUTA as 3 camadas do §7d
  (inserção pura com 0 linhas removidas; marcadores do §C7.4 antigo com contagem idêntica à da main pré-PR;
  extração por faixa fechada) — o §7d já nomeia esta cadeira: não aceita afirmação; paridade dos fragmentos
  CLAUDE×AGENTS (D-INTEROP — diferença só estritamente de ferramenta, listada na ata); inspetor verbatim
  (diff vazio contra o blob da demo, com `MSYS_NO_PATHCONV=1`); nada mais da demo no diff (nem
  `especialistas/`); as 3 pendências no estado certo (FECHADA / FECHADA / ABERTA-reatribuída) e o índice
  regenerado pelo script, não digitado.
- **C4 — `auditor-do-kpi-honesto`** (veto: sim). Julga as ressalvas do porteiro no KPI: backfill do 362
  (`merge_commit 87f6ae6`, `approved_head 4cd0867`, nota dos +2 commits pós-voto); entrada SAN2-2 com
  contagens de EXECUÇÃO REAL — reconta do TAP da Fase 5, não aceita número copiado (≥2601 com delta
  explicado; os 2 não-pass do baseline são OS MESMOS); `kpi-freeze.mjs` rodado + `--check` exit 0; guard
  `tests/kpi-dashboard-charts.test.ts` verde; trilhas não tocadas com nota explícita (§C3.3).

**Dev do bloco (§C7.4-bis, prometido no cabeçalho deste plano):** identidade nova **`dev-san2-2`** —
implementa o §3, não achou nada do §2, não planejou, não vota.

### 8.3 Inelegíveis nesta junta (por nome — §C7.4-bis + pool queimado)

1. **`inspetor-de-terreno-da-junta`, na instância do B-O6R-REG (R1)** — achou o item 1
   (`P-REG-S0-GUARD-FALSO-VERMELHO`). Não ocupa cadeira de mérito; o papel de terreno desta junta exige
   instância NOVA (§8.4).
2. **Orquestrador da sessão** — confirmou o item 1 por execução (§2.4); revisor de ações sinalizadas, não
   jurado.
3. **`planejador-mestre` (este agente)** — planejou o bloco (§C7.4-bis) e re-reproduziu o item 1 (§2.1):
   duplamente contaminado.
4. **Quem assinou a validação A5 e quem operou o arnês #6 do B-O6R-02** — acharam o item 2; qualquer
   identidade que tenha assinado esses dois artefatos está fora.
5. **O condutor do gate do #362** e o **`porteiro-pos-merge` do #362** — acharam/confirmaram o item 3; o
   porteiro, além disso, emitiu o LIBERADO COM RESSALVA que este bloco quita — julgaria as próprias
   ressalvas.
6. **`dev-san2-2`** — desenvolve, não julga (§C7.4-bis).
7. **Pool queimado (regra geral):** nenhuma identidade que votou nas juntas do B-O6R-02 (as 16 inelegíveis
   + os 14 especialistas criados lá), do B-O6R-REG, do B-O6R-ARNES, do SAN2-R ou do SAN2-1R senta cadeira —
   as 4 do §8.2 nascem novas para este bloco, e o inspetor de terreno confere esta lista por nome antes do
   LIBERADO (§C7.1-bis).

### 8.4 Inspeção de terreno com o instrumento nascendo dentro do próprio bloco (bootstrap do §C7.1-bis)

O §C7.1-bis exige o inspetor ANTES da junta; a `main` não o tem (§2.3) — mas o HEAD DO PR tem: o transporte
do §3.3.3 faz parte do diff que a junta julga. Resolução, com o fail-closed preservado:

1. **Instância NOVA do papel, instanciada do arquivo do head do PR** (não da demo diretamente, não da
   instância inelegível do B-O6R-REG). Pré-condição de validade: diff vazio entre o arquivo do head e o blob
   `demo/investidor:.claude/agents/inspetor-de-terreno-da-junta.md` (a mesma prova da Fase 3), com o hash
   consignado na ata. Divergência = inspeção inválida = junta não começa.
2. **A fatia S0 que ele executa usa o script já corrigido, no arranjo que hoje mente** (checkout fresco sob
   `core.autocrlf=true`) — e é esse o ponto do bloco: a primeira junta a se beneficiar do conserto é a dele
   mesma. Exit ≠ 0 → sem LIBERADO → volta ao dev sem voto. O fail-closed não ganha exceção de bootstrap.
3. **Anti-circularidade, por escrito na ata:** o verde do inspetor NÃO é prova de mérito do item 1 — ele
   julga tabuleiro, não mérito (§C7.1-bis), e a ata marca "instrumento e fatia S0 nascem neste bloco". A
   prova de mérito é da C1, que reexecuta os Drills A/B por conta própria, sem herdar o resultado da
   inspeção (afirmação anterior = a re-verificar). Se o conserto tiver trocado falso-vermelho por
   verde-cego, quem pega é o Drill B (4 mutações → 4 vermelhos), não o LIBERADO do inspetor.
4. **O resto do checklist do 1-bis vale sem adaptação:** worktree próprio para cada jurado que muta (C1) e
   banco descartável onde houver banco (nenhuma cadeira toca `erp-postgres`/`erp-redis`); inelegibilidade do
   §8.3 conferida por nome; plano de perda de jurado declarado — cadeira perdida no meio do ciclo →
   `agente-fabrica` cria substituto NOVO com a mesma especificação da cadeira; voto não se herda.
