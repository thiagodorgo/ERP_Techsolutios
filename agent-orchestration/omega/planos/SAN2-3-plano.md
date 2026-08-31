# SAN2-3 — Obituário das identidades de junta: o descarte é LÓGICO, e o registro é o mecanismo

> **Plano do `planejador-mestre`** (Fable por contrato, `D-PLANEJADOR-MODELO-FABLE`), gravado seção a
> seção em 2026-08-30/31. Branch `chore/san2-3-obituario-especialistas` (da `main` = `d283903`), worktree
> `.claude/worktrees/san2-r`. Autorização de start: porteiro pós-merge do #363 = **LIBERADO COM RESSALVA**
> (`agent-orchestration/omega/juntas/votos/SAN2-2/00c-porteiro-pos-merge-363.md`), e este plano incorpora
> as duas ressalvas dele como obrigações do PR (§3.4 e §3.5).
> Quem planeja não desenvolve nem vota (§C7.4-bis) — outro agente executa este plano.

## §1 — Objetivo, ator, fluxo, contrato, modelagem

**Objetivo.** Tornar impossível, por registro canônico e barato de consultar, o REUSO de identidades de
junta já queimadas — e fazer isso sem apagar um único arquivo, porque (a) não há o que apagar na `main`
(medido no §2) e (b) duas das dezessete identidades estão **reservadas** para a junta do ciclo 5 do
financeiro e enterrá-las seria destruir insumo de um bloco da fila. O bloco também quita as duas ressalvas
do porteiro do #363: o backfill §C3.5 do próprio #363 e dono REAL para as duas pendências que hoje exibem
o falso "sim" que uma delas denuncia.

**Ator.** Executor: uma instância dev designada pelo orquestrador (não este planejador). Leitores-alvo do
artefato principal: **quem compõe juntas** (orquestrador/`agente-fabrica`) e o
**`inspetor-de-terreno-da-junta`**, cuja checagem "inelegibilidade dos papéis conferida por nome"
(§C7.1-bis) ganha aqui a sua fonte canônica.

**Fluxo origem→destino.**
1. Identidades: hoje vivem como 17 arquivos em `demo/investidor` (`.claude/agents/especialistas/` e o
   espelho `.agents/agents/especialistas/`), invisíveis à `main` e ao guard → viram **registro lógico na
   `main`** (`OBITUARIO-IDENTIDADES.md`), com status, classe de queima e evidência por linha. Os arquivos
   físicos na demo **não são tocados** — descarte lógico, como o contrato deste papel exige para dados.
2. Ressalva 1 do porteiro: parecer B7 → `Kpis/kpis-history.json` (backfill da entrada #363).
3. Ressalva 2: parecer C2/C4 → `agent-orchestration/controle/pendencias.md` (dono real nas duas
   pendências) → `pendencias-indice.md` regenerado.

**Contrato REST: N/A declarado.** O bloco não cria nem toca rota, payload ou código de status — nenhum
404/422/409 a definir. Diff vazio em `src/**` é verificação da bateria (§6.11).

**Modelagem: N/A declarado, com o princípio aplicado.** Nenhum model, nenhuma migration, nenhum Decimal ou
timestamptz. Mas o princípio central da modelagem deste contrato — **delete lógico, nunca físico** — é a
própria decisão de desenho do bloco: o obituário É o soft-delete das identidades (§3.2).

**Baseline/meta (resumo; detalhe no §6):** N = 28 casos reexecutados de verdade (12 do guard do espelho +
16 do guard do painel); o bloco **não adiciona teste** por decisão argumentada (§3.3), então M≥2N não se
cumpre com teste novo — se cumpre com **prova dobrada por bateria**: 11 verificações, 7 executáveis e 4
estruturais, cada uma nomeada no §6.

## §2 — Diagnóstico MEDIDO (comandos executados por este planejador em 2026-08-30/31, worktree `san2-r` em `f56e453`)

**2.1 — O diretório do enunciado NÃO existe na `main`, e nunca existiu.**
```
git ls-tree -r --name-only main -- .claude/agents/            → 23 arquivos, NENHUM em especialistas/
git log main --oneline -- .claude/agents/especialistas/        → vazio (zero commits na história da main)
git ls-tree -r --name-only main -- .agents/agents/             → 24 (23 papéis + README), idem
ls .claude/agents/especialistas  (neste worktree, filho da main) → não existe
```
O enunciado herdado do bloco — *"descarte dos 16 especialistas queimados em `.claude/agents/especialistas/`"*
— **não tem mandato escrito no repositório**: `grep -rn "descart|queimad"` sobre briefings e atas SAN2 não
o encontra; as únicas formulações canônicas são as dos porteiros (#362: *"SAN2-3 (obituário dos 16
especialistas): documental"*; #363: *"obituário dos 16 especialistas, preservando `critico-c5-adversarial`"*).
**Descartar da `main` o que nunca esteve nela é um no-op** — o conteúdo real do bloco é outro (§3).

**2.2 — Onde os 17 arquivos vivem: só na `demo/investidor`, nas DUAS pontas.**
```
git ls-tree -r --name-only demo/investidor -- .claude/agents/especialistas/  → 17 arquivos
git ls-tree -r --name-only demo/investidor -- .agents/agents/ | grep especialistas → os MESMOS 17 no espelho
git log demo/investidor --oneline --diff-filter=A -- .claude/agents/especialistas/
  → 5 commits: 1736727 (painel c4) · 160a87f (suplentes c4) · 77ead96 (identidades do ciclo 5)
    · e74b469 (cadeiras+suplentes ARNES) · bd0d700 (titular catálogo ARNES)
```

**2.3 — O guard do espelho NÃO enxerga subdiretório — nem na fonte, nem no alvo.**
`scripts/sync-agent-agents.mjs` l.66 e l.74: `readdirSync(SRC)`/`readdirSync(DST)` **não-recursivos**,
filtrados por `.endsWith('.md')`. Consequência dupla, medida no código: (a) na demo, os 17 em
`especialistas/` passam por baixo do `--check` (nem FALTA, nem SOBRA, nem DIVERGE); (b) na `main`, o guard
consertado no #363 protege os 23 papéis da raiz e nada mais. **Nenhum guard de código vigia essas
identidades hoje** — o único gate real é o `inspetor-de-terreno-da-junta` (§C7.1-bis, "inelegibilidade dos
papéis conferida por nome"), que não tem fonte canônica para conferir: caça em atas.

**2.4 — A CONTRADIÇÃO que o mandato herdou: a conta não é 16+1, é 15+2.**
A lista "16 queimados + `critico-c5-adversarial` preservado" quebra contra a ata do ARNES:
```
J-B-O6R-ARNES.md l.51-56 (verbatim): o inspetor BLOQUEOU o reaproveitamento de
jurado-c5-arnes-catalogo-postgres na cadeira 1 do ARNES ("o corpo dele é o contrato de OUTRA junta —
mandato do ciclo 5 do B-O6R-02"); o titular novo nasceu em bd0d700; e
"jurado-c5-arnes-catalogo-postgres ficou INTOCADO e RESERVADO para a junta do ciclo 5."
```
Mapa de participação, medido por `grep -rln <nome> agent-orchestration/omega/juntas/` para cada um dos 17:
- **6 `jurado-arnes-*`** (3 titulares + 3 suplentes) → caso `B-O6R-ARNES`, concluído (J-B-O6R-ARNES
  APROVADO 3×0; merge #359, cf. `votos/B-O6R-ARNES/00c-porteiro-pos-merge-359.md`). Titulares votaram
  (votos 01/02/03 em disco); suplentes nomeados e preparados antes do início. **QUEIMADAS: 6.**
- **9 `jurado-c4-*`** (5 titulares + 4 suplentes) → caso `B-O6R-02` ciclo 4, concluído (J-B-O6R-02-ciclo4;
  votos em disco: 1 titular + 4 suplentes votaram — 01-fail-closed-enumeracao, 02-suplente-dinheiro,
  03-suplente-banco, 04-suplente-arnes, 05-suplente-validador; os outros 4 titulares caíram e foram
  substituídos). Nota: `jurado-c4-suplente-arnes-concorrente` é ainda o ACHADOR do bloco ARNES —
  inelegível lá por segundo motivo (ata l.44). **QUEIMADAS: 9.**
- **`jurado-c5-arnes-catalogo-postgres`** → criado em 77ead96 PARA o ciclo 5; nunca votou; reserva
  explícita na ata (acima). **RESERVADA, não queimada.**
- **`critico-c5-adversarial`** → criado em 77ead96 PARA o ciclo 5; `grep -rln` só o encontra no parecer do
  porteiro do #363 — **nunca votou em junta nenhuma. RESERVADA.**
O ciclo 5 do financeiro NÃO rodou (não há `J-B-O6R-02-ciclo5*` nem `votos/B-O6R-02-ciclo5/`; o plano
`B-O6R-02-ciclo5-plano.md` existe e espera). Enterrar as 2 reservadas destruiria a composição pronta do
próximo bloco financeiro da fila. **Divergência tratada no §3.1 e registrada por §A2 (§3.6).**

**2.5 — As duas ressalvas do porteiro, conferidas na fonte.**
- Backfill §C3.5 do #363 (parecer B7): entrada corrente do `Kpis/kpis-history.json` (última das 146,
  `version: "SAN2-2"`) e o `release` do `kpis-latest.json` têm `pr`/`merge_commit`/`approved_head` =
  `null`. Devidos: `pr: 363` · `merge_commit: d283903` · `approved_head: c8dc716` — o head **julgado**
  (J-SAN2-2.md l.5 e §Delta pós-voto), NÃO o `e4926bd` do GitHub (delta = a própria ata + registro
  pós-voto; mesma lógica do backfill do #362, aplicada no #363 com `4cd0867`≠`55aa8a3`).
- Dono real (parecer C2/C4): `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` (pendencias.md l.4405, dono "a
  atribuir") e `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` (l.4345, dono por classe). A segunda mediu **91 falsos
  "sim" em 108 (84%)** e nomeia as DUAS faltas do classificador de `gerar-indice-pendencias.py`. A ironia
  apontada pelo porteiro: com dono "a atribuir", o índice exibe para elas o falso "sim" que uma delas
  denuncia. Nomear dono REAL as tira, de fato, da própria estatística que carregam.

**2.6 — Ferramentas que o bloco vai EXECUTAR (não editar), conferidas.**
`scripts/kpi-freeze.mjs` (reinjeta a linha `var FROZEN` do `app.js` a partir do `kpis-latest.json`; guard
`tests/kpi-dashboard-charts.test.ts` compara os dois) · `agent-orchestration/controle/gerar-indice-pendencias.py`
(gera `pendencias-indice.md`; bugado no classificador de dono — dono do conserto passa a ser nomeado por
este PR, §3.5) · `scripts/sync-agent-agents.mjs` (espelha/verifica os 23 papéis da raiz).

## §3 — O que fazer, item a item

**3.1 — O conteúdo real do bloco é o OBITUÁRIO COMO REGISTRO — e a conta certa é 15+2.**
Criar **`agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md`** (novo; vive em `juntas/` porque é lá
que briefings e atas moram — é onde quem compõe junta e o inspetor de terreno já olham). Conteúdo mínimo:
- Tabela das **17 identidades**, uma linha cada: nome · caso de origem · papel (titular/suplente/crítico) ·
  **status** (`SEPULTADA` ou `RESERVADA — ciclo 5 do B-O6R-02`) · **classe de queima** (`votou` |
  `nomeada-e-preparada para caso concluído`) · evidência (ata + arquivo de voto quando houver + commit da
  demo que a criou) · onde o arquivo físico vive (`demo/investidor`, dois lados do espelho).
  **15 SEPULTADAS** (6 arnes + 9 c4) e **2 RESERVADAS** (`jurado-c5-arnes-catalogo-postgres` e
  `critico-c5-adversarial`) — cada linha com a evidência do §2.4, reconferida pelo executor.
- Seção **"Regra de consulta"**: composição de junta exige 0 colisões contra este registro; identidade
  `SEPULTADA` não entra em junta nenhuma; identidade `RESERVADA` só entra na junta para a qual está
  reservada; o registro é **append-only** (sepultamento novo = linha nova, nunca remoção).
- Seção **"Papéis permanentes"**: os 23 de `.claude/agents/` NÃO se sepultam — a inelegibilidade deles é
  **por caso** e continua sendo conferida nas atas do caso (ex.: quem votou nos ciclos 1–4 do B-O6R-02 é
  inelegível no ciclo 5). O obituário cobre identidades descartáveis de caso; aponta as atas para o resto.
- Seção **"Divergência §A2"**: o texto do §2.1+§2.4 — enunciado herdado sem mandato escrito, descarte na
  main vazio, e a lista 16+1 corrigida para 15+2 pela ata do ARNES.

**3.2 — NENHUM descarte físico, em lugar nenhum — decisão argumentada.**
(a) Na `main`: no-op — nada existe (§2.1). (b) Na `demo/investidor`: **fora do alcance e do direito deste
PR** — é branch de trabalho do dono, este PR nasce da `main` e não a toca; e apagar os 17 pela lista
herdada mataria as 2 reservadas do ciclo 5. (c) Não nasce pendência de "apagar depois": os arquivos não
fazem mal onde estão (o guard não os vê — §2.3; nenhum job os consome), servem de peça histórica citada
pelo obituário, e criar mais uma pendência "a atribuir" seria fabricar exatamente o lixo que a ressalva 2
manda limpar. O obituário É o descarte — **lógico, com registro, reversível por leitura** — o mesmo
princípio (delete lógico) que este contrato de papel impõe a dados de produto.

**3.3 — Mecanismo anti-reuso: fonte canônica + gate que JÁ existe. Sem guard de código novo — argumento.**
Editar **`.claude/agents/inspetor-de-terreno-da-junta.md`**: inserção pura de 2–4 linhas na checagem de
inelegibilidade, apontando `OBITUARIO-IDENTIDADES.md` como **fonte primeira** da conferência por nome
(atas continuam sendo a prova; ausência do nome no obituário NÃO absolve — vale o fail-closed). Depois:
`node scripts/sync-agent-agents.mjs` regenera o espelho `.agents/agents/inspetor-de-terreno-da-junta.md`
(**nunca editado à mão** — regra do espelho), e o guard + os 12 testes provam a simetria.
Por que NÃO um teste novo de "nome queimado não existe como arquivo": (i) o vetor real de reuso é a
**composição da junta**, não a existência de arquivo — as juntas c4 e ARNES rodaram com arquivos que nunca
estiveram na `main`; um teste sobre a árvore da main daria verde com o reuso acontecendo na demo; (ii) o
gate fail-closed já existe e é anterior à junta (§C7.1-bis) — o que faltava era a fonte, não um segundo
fiscal; (iii) verde de arquivo-não-existe ≠ ausência de reuso = falsa segurança, a classe de defeito que a
rodada SAN2 inteira combate. Se a junta discordar, que derrube ESTE argumento no voto.

**3.4 — Ressalva 1 do porteiro: backfill §C3.5 do #363 + entrada KPI do SAN2-3 (§C3).**
Em `Kpis/kpis-history.json`: na entrada `version: "SAN2-2"` (última das 146), preencher `pr: 363`,
`merge_commit: "d283903"`, `approved_head: "c8dc716"`, e registrar na nota da entrada por que NÃO é o
`e4926bd` do GitHub (head julgado da ata J-SAN2-2.md l.5; delta pós-voto = ata + registro puro — precedente
do #362). Em seguida, **append** da entrada nova `version: "SAN2-3"`: `pr`/`merge_commit`/`approved_head`
= `null` na autoria (§C3.5); `blocks_completed` **152→153** (o merge do SAN2-2 — conferir a convenção na
própria entrada anterior, que declara "sobe para 153 só quando este bloco mergear"); `backend_tests`/
`frontend_smoke_tests`/`flutter_tests` **carregados com nota §C3.3** (o PR não toca `src/`, `tests/`,
`frontend/`, `mobile/` — prova: `git diff --name-only main...HEAD` sobre esses caminhos = vazio), MAS com
as suítes que o PR **exerce de verdade** reexecutadas e declaradas: guard do espelho 12 casos + guard do
painel 16 casos, N≥2 execuções cada, contagens da execução e não de memória. `mvp_demo`/`mvp_vendavel`
INTOCADOS (o PR não move escopo de produto). `Kpis/kpis-latest.json`: `release` novo do SAN2-3 (título,
summary honesto com o que o bloco NÃO fez — o descarte físico — e a correção 16+1→15+2). Depois
`node scripts/kpi-freeze.mjs` reinjeta o FROZEN no `Kpis/app.js` (única mudança permitida nesse arquivo).

**3.5 — Ressalva 2: dono REAL — e o dono é um bloco NOMEADO, o SAN2-5.**
Em `agent-orchestration/controle/pendencias.md`, editar SÓ o campo de dono das duas pendências:
- `P-KPI-PAINEL-NAO-RENDERIZA-SUMMARY` → dono: **bloco SAN2-5 — "ferramentas de registro honestas"**,
  parte 1: `Kpis/app.js`/`index.html` renderizam `release.summary` e a `description` do history.
- `P-SAN2-2-INDICE-DONO-SEMPRE-SIM` → dono: **bloco SAN2-5**, parte 2: as DUAS faltas medidas do
  classificador de dono em `gerar-indice-pendencias.py`.
Argumento para UM bloco: mesma classe de defeito (a ferramenta de registro não entrega ao leitor o que o
registro diz), mesmo harness de prova (guard do painel + regeneração do índice), tamanho pequeno; entra na
fila após SAN2-4a/4b, não bloqueia o ciclo 5. Isso é **nomeação de dono** (obrigação da ressalva), não
promessa de merge: se o dono humano redirecionar, re-atribui com registro — ainda assim infinitamente
melhor que "a atribuir". Depois: regenerar `pendencias-indice.md` com o script EXISTENTE (bugado — **não
consertá-lo aqui**: quem acha não conserta, §C7.4-bis, e o conserto acabou de ganhar dono nomeado). No PR,
declarar: as duas linhas passam a exibir um "sim" VERDADEIRO; os ~89 falsos-sim restantes ficam para o
SAN2-5, ciente e dito.

**3.6 — Registro §A2 da divergência em `controle/`.**
Uma entrada curta e aditiva em `agent-orchestration/controle/decisoes.md` — rotulada como REGISTRO DE
CONFLITO MEDIDO, não decisão de dono: enunciado herdado ("descarte dos 16 em `.claude/agents/especialistas/`")
× repositório (diretório inexistente na main; 1 dos 16 RESERVADO pela ata do ARNES); resolução = este
plano (§3.1/§3.2), apontando a seção "Divergência §A2" do obituário. Sem isso, a consolidação seria
silenciosa — exatamente o que §A2 proíbe.

**3.7 — Peças da junta e do processo.** `BRIEFING-SAN2-3.md`, parecer do inspetor de terreno em
`votos/SAN2-3/00a-*`, votos `votos/SAN2-3/0N-*.json` (com `escopo` + `gravidade`, §C7.1-ter), ata
`J-SAN2-3.md` com papéis nomeados — cada peça gravada em disco assim que fechar (30 agentes caíram hoje
por `server_error`; contexto não sobrevive, disco sim).

## §4 — Como provar (cada afirmação com a sua verificação)

| Afirmação | Prova executável |
|---|---|
| As 15 sepultadas participaram dos casos citados | por linha: `grep -rln <nome> agent-orchestration/omega/juntas/` devolve exatamente as peças citadas na linha (ata/briefing/voto); votos JSON conferidos por nome de arquivo em `votos/B-O6R-ARNES/` e `votos/B-O6R-02-ciclo4/` |
| As 2 reservadas NUNCA votaram | `grep -rln` de cada uma não devolve nenhum arquivo de voto/ata de caso concluído; reserva citada verbatim de `J-B-O6R-ARNES.md` l.51-56 |
| Nada nasceu na `main` sob especialistas/ | `git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/ \| grep -c especialistas` → **0** |
| Espelho do inspetor íntegro e GERADO | `node scripts/sync-agent-agents.mjs --check` → exit 0, "23 agentes"; `tests/agents-mirror-guard.test.ts` → 12/12/0 |
| Painel não defasa dos JSON | `node scripts/kpi-freeze.mjs --check` → "em dia"; `tests/kpi-dashboard-charts.test.ts` → 16/16/0; `node --check Kpis/app.js` |
| Backfill certo, armadilha do e4926bd evitada | `python -c "import json; e=json.load(open('Kpis/kpis-history.json'))[-2]; assert (e['pr'],e['merge_commit'],e['approved_head'])==(363,'d283903','c8dc716')"` (índice -2 = entrada SAN2-2 após o append da SAN2-3) |
| Entrada nova conforme §C3.5 | mesma leitura na `[-1]`: `version SAN2-3`, nulls na autoria, `blocks_completed` 153 |
| Dono real gravado e refletido | `grep -n "SAN2-5" agent-orchestration/controle/pendencias.md` nas duas pendências; diff do `pendencias-indice.md` muda SÓ as linhas esperadas |
| Regeneração idempotente | rodar `gerar-indice-pendencias.py` 2×; a 2ª execução produz diff vazio |
| Diff do PR ⊆ escopo permitido | `git diff --name-only main...HEAD` — lista contida no §5, byte a byte |
| Nenhum código de produto tocado | `git diff --name-only main...HEAD -- src/ prisma/ frontend/ mobile/ tests/ scripts/ .github/` → vazio |

## §5 — Escopo: caminhos exatos

**PERMITIDO (lista fechada; regra do espelho = o `.agents/agents/` correspondente é sempre GERADO):**
- `agent-orchestration/omega/juntas/OBITUARIO-IDENTIDADES.md` — **novo** (artefato principal)
- `agent-orchestration/omega/planos/SAN2-3-plano.md` — este plano
- `.claude/agents/inspetor-de-terreno-da-junta.md` — inserção pura de 2–4 linhas (§3.3)
- `.agents/agents/inspetor-de-terreno-da-junta.md` — **somente via `node scripts/sync-agent-agents.mjs`**
- `agent-orchestration/controle/pendencias.md` — SÓ os campos de dono das 2 pendências do §3.5
- `agent-orchestration/controle/pendencias-indice.md` — **somente via `gerar-indice-pendencias.py`**
- `agent-orchestration/controle/decisoes.md` — 1 entrada aditiva (§3.6)
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` — §3.4 (backfill + append)
- `Kpis/app.js` — **somente a linha `var FROZEN` via `node scripts/kpi-freeze.mjs`**
- `agent-orchestration/omega/juntas/BRIEFING-SAN2-3.md` · `J-SAN2-3.md` · `votos/SAN2-3/**` — peças da junta

**PROIBIDO (além do §C4 padrão):**
- **qualquer outra branch** — `demo/investidor` intocada (os 17 arquivos ficam onde estão); nenhum push
  fora de `chore/san2-3-obituario-especialistas`
- `.claude/agents/especialistas/**` e `.agents/agents/especialistas/**` — não existem na main e **não
  devem nascer** nela (nem "para arquivar")
- os outros 22 papéis de `.claude/agents/*.md` e o `README.md` do espelho
- `scripts/**` (inclusive `gerar-indice-pendencias.py`, `sync-agent-agents.mjs`, `kpi-freeze.mjs` — são
  EXECUTADOS, jamais editados; o conserto do classificador é do SAN2-5)
- `tests/**` (nenhum teste novo — decisão §3.3), `src/**`, `prisma/**`, `migrations/**`, `frontend/**`,
  `mobile/**`, `.github/**`, `CLAUDE.md`, `AGENTS.md`, `Kpis/index.html` (estrutura), `.env*`, lockfiles
- containers `erp-postgres`/`erp-redis` e qualquer base viva — o bloco não precisa de banco nenhum

## §6 — Bateria de validação (ordem exata; tudo no worktree `san2-r`)

1. `node scripts/sync-agent-agents.mjs` (regen do espelho após a edição do inspetor)
2. `node scripts/sync-agent-agents.mjs --check` → exit 0 · "OK — 23 agentes"
3. `node --test --import tsx tests/agents-mirror-guard.test.ts` → **12 pass / 0 fail / 0 skip** (N≥2 execuções)
4. `node scripts/kpi-freeze.mjs` e depois `node scripts/kpi-freeze.mjs --check` → "em dia"
5. `node --test --import tsx tests/kpi-dashboard-charts.test.ts` → **16 pass / 0 fail / 0 skip** (N≥2)
6. `node --check Kpis/app.js`
7. `python agent-orchestration/controle/gerar-indice-pendencias.py` **2×** → 2ª execução com diff vazio
8. Prova do obituário (§4, linhas 1–3): loop de `grep -rln` pelas 17 identidades + `git ls-tree ... | grep -c especialistas` → 0
9. Prova do backfill (§4): leitura JSON das entradas `[-2]`/`[-1]` do history + validade `json.load` dos 2 arquivos
10. `git diff --check` (whitespace) e `git diff --name-only main...HEAD` ⊆ §5
11. `git diff --name-only main...HEAD -- src/ prisma/ frontend/ mobile/ tests/ scripts/ .github/` → **vazio**

**Baseline e meta, ditos sem teatro:** N = 28 casos exercidos de verdade (12+16), M≥2N **não se cumpre com
teste novo** — decisão §3.3, argumentada e derrubável pela junta — e sim com as 11 provas acima, das quais
7 executáveis e 4 estruturais. Suítes não exercidas (backend completo 2607/2609, smoke 1126, flutter 864)
são CARREGADAS com nota §C3.3 e a prova do item 11 atrás delas.

## §7 — Riscos e rollback

| # | Risco | Mitigação | Rollback |
|---|---|---|---|
| R1 | Obituário errar a classe de UMA identidade (ex.: sepultar uma reservada) e o ciclo 5 perder jurado pronto | prova linha a linha (§6.8) + cadeira 1 confere contra as atas; as 2 reservadas têm citação literal (J-B-O6R-ARNES l.56) | revert do arquivo — registro puro, sem estado externo |
| R2 | A edição do inspetor alterar o gate fail-closed além do pretendido | inserção pura de 2–4 linhas; diff lido pela cadeira 3; espelho gerado, nunca manual; guard 12/12 | revert + re-sync |
| R3 | Backfill com hash errado — a armadilha do `e4926bd` que o porteiro nomeou | valores fixados NA FONTE (parecer B7 + ata l.5), verificação por igualdade exata (§4) | revert dos JSON + `kpi-freeze` |
| R4 | Regenerar o índice com o script BUGADO re-classificar linhas alheias (mudar o input muda o output) | diff do `pendencias-indice.md` inspecionado: só as linhas esperadas mudam; qualquer linha a mais → investigar ANTES do commit, sem "consertar" o script (dono: SAN2-5) | revert do índice |
| R5 | Queda de agente no meio (30 caíram hoje por `server_error`) | cada artefato gravado ao fechar (§3.7); plano já em disco; suplentes nomeados antes do início | retomar do disco — nada vive só em contexto |
| R6 | Nomear SAN2-5 e o dono humano não querer o bloco | é nomeação de dono de pendência (obrigação da ressalva), não promessa de merge; redirecionamento re-atribui com registro | editar o campo de dono, com trilha |
| R7 | Tocar sem querer a `demo/investidor` ou as bases vivas | o bloco inteiro roda no worktree `san2-r`; §5 proíbe por nome; inspetor de terreno confere árvore e containers antes da junta | n/a (prevenção) |

Rollback geral: PR documental + KPI, **1 revert limpo** — sem migração, sem banco, sem infra, sem efeito
em produto.

## §8 — Junta: composição e quórum sob `D-JUNTA-ESCOPO-E-CALIBRACAO`

**Natureza do bloco:** documental/governança. Não toca dinheiro, segurança de produto, permissão RBAC nem
dado de produção; **não há perda de dado** — nenhum descarte físico acontece (§3.2), o registro é
append-only, e o único contrato de papel tocado recebe inserção pura verificada por guard.
**Quórum: MAIORIA DE 3** (§C7.1-ter(b) — "maioria de 3 no resto"). Argumento contra inflar: unanimidade é
reservada por regra escrita a dinheiro/segurança/permissão/perda-de-dado; a auditoria de 2026-08-28 mediu
que quórum inflado foi o que consumiu 24% dos ciclos em 3 blocos — não recriar o problema num bloco de
registro. **Sem `critico-adversarial`**: reservado a invariante (precedente do ARNES, mesma prova: diff
vazio em `src/`/`prisma/`/`.github/`/contratos — §6.11).

| Papel | Quem | Regra |
|---|---|---|
| Planejador | esta instância (`planejador-mestre`, Fable) | não desenvolve, não vota |
| Dev | instância designada pelo orquestrador | não planejou, não vota |
| Inspetor de terreno | `inspetor-de-terreno-da-junta`, instância nova | **fail-closed §C7.1-bis: sem o LIBERADO dele a junta não começa**; confere terreno + fatia S0 (`sync --check`) + inelegibilidade — usando o PRÓPRIO obituário em draft como fonte (dogfooding) |
| Cadeira 1 (veto) — registro/atas | identidade nova, competência diff/escopo/registro | confere o mapa 15+2 linha a linha contra atas e votos |
| Cadeira 2 — KPI honesto | identidade nova | backfill #363 (§3.4), entrada SAN2-3, freeze, notas §C3.3 |
| Cadeira 3 — governança/espelho | identidade nova | edição do inspetor, sync/guard, índice, donos reais (§3.5) |
| Suplentes | 3, nomeados ANTES do início | protocolo resiliente (perda de jurado declarada) |

Todo voto declara `escopo` + `gravidade` (§C7.1-ter(a)); escopo sem evidência = `dentro-do-bloco`. As 3
cadeiras e os 3 suplentes são identidades novas com **0 colisões conferidas contra o obituário em draft** —
a primeira junta composta pelo mecanismo que ela mesma julga. Ata `J-SAN2-3.md` nomeia quem ocupou cada
papel (ata sem isso = ciclo inválido, §C7.4-bis).

---
*Plano gravado seção a seção em 2026-08-30/31 por `planejador-mestre` (Fable). Reprovação de qualquer
cadeira → novo plano desta mesma mesa consolidando os pareceres (§C7.4), jamais emenda em cima do voto.*
