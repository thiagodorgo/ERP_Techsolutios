> **NOTA DO ORQUESTRADOR AO PERSISTIR (2026-09-11, head do PR no ato: `e26eb9e5`).** O texto abaixo é o da
> ata consolidada pelo agente de ata do workflow da junta (2026-09-09), **verbatim**; só o rodapé com
> caminhos absolutos do scratchpad foi removido. Antes de persistir, **reconciliei a ata contra os seis
> arquivos de voto** em `votos/B-O6R-06-delta/`:
> - **Placar:** C1 `APROVADO` (`head_medido` `e26eb9e5`), C2 `APROVADO` (`head_medido` `e26eb9e5`,
>   `achados_bloqueantes: 0`), C3 `APROVADO` (cita `e26eb9e5` 41 vezes no voto). **3×0, zero `bloqueia`.**
> - **Os "12 achados":** os arrays `achados` dos votos somam **8** (C1=3, C3=5, C2=0). Os **4 da C2**
>   (#2, #6, #9, #10 da tabela §3) vivem nos campos `item_1..3` do voto e na evidência dela
>   (`C2-…-evidencia.md` l.304 BEHIND; l.228-245 os 2 mortos; l.311-321 o `fail 1/3` com timeout de
>   5000 ms em `impound-trigger-durability`; l.17-35 a base `fe2748c8`). Conferido: nenhum dos 12 foi
>   inventado pela consolidação.
> - **Vocabulário de gravidade:** os votos usam `nota`/`ajuste`; a ata normalizou para `baixa`/`média`.
>   O único `ajuste` (C3, marcador §C3.3 do `kpis-latest.json`) virou a **média** #1. Escopos e datas
>   de origem foram copiados dos votos, não reatribuídos.
> - **Modelo:** as três cadeiras herdaram o modelo da sessão (Opus, na ocasião); o inspetor rodou em
>   Opus por indisponibilidade do Fable (429), com a nota no parecer dele. Esta persistência roda em
>   Fable 5.1.
> - **O que fecho neste mesmo PR, por serem registro atribuído a este bloco pela própria ata (§5):**
>   marcador §C3.3 do `B-O6R-06` nas trilhas carregadas do `kpis-latest.json` (achado #1); linha 9 do
>   obituário (R6); as duas pendências sem `status:` legível (#12 — o valor estava em negrito, classe
>   `P-STATUS-NEGRITO-INVISIVEL-AO-GERADOR`); e as pendências "a nomear" abertas com dono. **O que NÃO
>   toco:** os três arquivos de teste julgados (achados #3 e #4 são comentário/propriedade do helper e
>   do guard — mexer neles é alterar código julgado; ficam em `P-O6R-B06-DELTA-RESIDUAIS`).

# ATA DA JUNTA — DELTA do `B-O6R-06` · PR #385 (`fix/billing-durability`)

**Data:** 2026-09-09 · **Consolidação:** orquestrador da ata · **Ata do mérito (não se rejulga):** `agent-orchestration/omega/juntas/J-B-O6R-06.md` (APROVADO 3×0) · **Briefing desta junta:** `agent-orchestration/omega/juntas/BRIEFING-B-O6R-06-delta.md`

---

## VEREDITO: **APROVADO** — placar **3×0**, quórum de **unanimidade de 3** atingido

| | |
|---|---|
| **Veredito** | **APROVADO** |
| **Placar** | **3 aprovam · 0 reprovam · 0 abstenções** — 3 votos de mérito colhidos de 3 cadeiras convocadas |
| **Quórum exigido** | **Unanimidade de 3** (§C7.1-ter(b) — o bloco toca dinheiro). **Não** 5/5 |
| **Achados que bloqueiam** | **ZERO** (12 achados no total: 2 `média`, 10 `baixa`) |
| **Inspetor de terreno** | `LIBERADO COM RESSALVA` — 7 ressalvas, nenhuma de mérito |
| **Suplentes acionados** | Nenhum — as três cadeiras titulares votaram |

O quórum não subiu para 5/5 porque **as três cadeiras mediram a categoria por conta própria**, em vez de herdá-la: `git diff --numstat cc579302 e26eb9e5 -- package.json package-lock.json` → **saída vazia** (C1, N=1; C3, N=2 cortes), e os blobs dos lockfiles são **byte-idênticos** nos cinco refs (`git rev-parse <ref>:package.json` = `e572e072`, `:package-lock.json` = `9039d1e8`, `frontend/package-lock.json` = `62f14fa5` — C2, N=1 por ref × 5 refs). Sem dependência nova, sem produção, sem serviço pago: a categoria do item 1 do §C7 não se aplica.

---

## §0 · Âncoras — medidas por mim na consolidação, não herdadas

| Âncora | Valor | Comando · N |
|---|---|---|
| **Head julgado** | **`e26eb9e5`** | `gh pr view 385 --json headRefOid` → `e26eb9e5f58578681e994d3f7357a8ef3ee00a33` · N=1 · e `git -C .claude/worktrees/b06 rev-parse HEAD` → mesmo valor · N=1 |
| Branch / PR | `fix/billing-durability` · #385 | `gh pr view 385 --json headRefName,url` · N=1 |
| Estado de merge | `MERGEABLE` / **`BEHIND`** | `gh pr view 385 --json mergeable,mergeStateStatus` · N=1 |
| `origin/main` | `a01fc014` | `git rev-parse origin/main` · N=1 |
| Head do mérito | `0f0a872a` (código) | declarado no briefing; **conferido por hash de árvore** pelas cadeiras C2 e C3 |
| Base comum dos dois lados | `fe2748c8` | `git merge-base cc579302^1 cc579302^2` (C3, N=1) e `git merge-base ab2540d0 1b8319f9` (C2, N=1) — as duas medições, independentes, batem |
| Merge absorvido | `cc579302` (pais `ab2540d0` + `1b8319f9`) | `git rev-list --parents -n1 cc579302` (C2, N=1) |

**O head se moveu duas vezes durante a junta.** O briefing §0 nomeava `deff7bcc`; o inspetor julgou `764a3b04`; **as três cadeiras mediram `e26eb9e5` e citaram o comando**. O próprio §0 do briefing manda "MEÇA VOCÊ MESMO" — foi cumprido por unanimidade. A ressalva do inspetor sobre a âncora desatualizada fica registrada e **está resolvida na prática**: nenhum voto cita um head que não é o do PR.

---

## §1 · Separação de papéis (§C7.4-bis) — quatro papéis, quatro ocupantes, nenhum acumulou

| Papel | Quem | Prova (conferida por medição da C3) |
|---|---|---|
| **Quem ACHOU** o defeito de isolamento | **o orquestrador**, medindo `npm test` no head `cc579302` | `Kpis/kpis-latest.json` → `metrics.backend_tests.note`, com as **5 execuções sujas**, N e forma. **CONFERE** |
| **Quem PLANEJOU** o conserto | **workflow de 4 planejadores + 4 críticos adversariais**, sintetizado | prescrição reproduzida no §4 do briefing (janela reservada + `importId` + isca + guard). **Plano bruto em `scratchpad`, fora dos autos** — vira achado C3-A3 |
| **Quem DESENVOLVEU** | agente **`general-purpose` dedicado**, que não achou e não planejou | `git diff --name-status cc579302 deff7bcc` → os 3 arquivos de `tests/` do §5, e só eles. **CONFERE** |
| **Quem JULGA** | as **três cadeiras novas** desta junta | composição do §1 do briefing; identidades `jurado-06d-*` criadas em 2026-09-09. **CONFERE** |

### As três perguntas obrigatórias do §C7.4-bis, respondidas

**(a) A composição cobre a competência que o achado exige?** Sim. O achado é de isolamento de suíte de banco com efeito sobre número financeiro: C1 cobriu banco/atomicidade/RLS (16 resets de cluster próprio), C2 cobriu invariante financeiro/rateio (mutação da isca e do escopo), C3 cobriu contrato/regressão/registro (hash de árvore e reexecução de KPI).

**(b) Quem achou é quem consertou?** **Não.** Achou o orquestrador; planejou um workflow separado; desenvolveu um `general-purpose` dedicado; julgaram três identidades novas. Nenhum agente ocupou dois papéis.

**(c) O planejador está usando dado podre?** Não, e isto foi **medido, não presumido**: a premissa do plano — `listCostLineItems` faz *overlap* puro de período **sem** `import_id`, enquanto `buildLineItemWhere` aceita `importId`, de modo que só a janela reservada fecha as duas direções — foi verificada por **presença nos 5 sítios** (interface `:26`, impl memória `:127`, impl prisma `:208`, único chamador `service.ts:54`) no head medido (C1, `grep -rn listCostLineItems src/`, N=1). **A premissa é real no head julgado.**

### Elegibilidade — o fail-closed que valida esta junta

As **seis** identidades do caso original (`jurado-06-*`, titulares e suplentes) estão **SEPULTADAS** no `OBITUARIO-IDENTIDADES.md` §3.4, classes `votou` (3) e `nomeada-e-preparada` (3), nascidas em `e35492ef` (2026-09-07, confirmado por `git log --diff-filter=A`, C3 N=1). A C3 enumerou **por presença** as **27 identidades** do obituário: **nenhuma é `jurado-06d-*`**, e as seis desta junta dão **0 ocorrências**, com controle positivo nas três sepultadas (C3, N=1+27). C1 e C2 conferiram o próprio nome na **fonte primeira** (obituário) antes do grep nas atas. Espelho Codex reexecutado por duas cadeiras: `node scripts/sync-agent-agents.mjs --check` → **ec=0, "OK — 35 agentes, espelho consistente"** (C2 e C3, N=1 cada).

---

## §2 · O que cada cadeira provou — os números que sustentam o verde

### C1 · banco / atomicidade / RLS — `jurado-06d-banco-atomicidade-rls`

- **A janela `2028-02` está livre, medida por ela mesma:** literais `YYYY-MM` em `tests/**` (`grep -rhoE ... | sort | uniq -c`, N=2, head e base `cc579302`) → **2026-06 = 224 / 219**, **2026-07 = 320 / 319**, **2028-02 = 9 / 0**. Prova mais forte que o literal: **só 2 arquivos** de `tests/` escrevem `cloudCostLineItem`, e o outro usa `2026-06-01..2026-06-30` — **disjunto**.
- **O guard morre quando deve:** baseline **4/4 ec=0**; **5 mutações, 5 vermelhas, zero verde** (M3 deixa G2 verde e G3 vermelho, exatamente o desenho). N=7 execuções.
- **F1 fica vermelha sem o escopo:** COM escopo **N=3 → ec 0/0/0, 7 pass / 0 fail / 0 skipped**; SEM escopo **N=3 → ec 1/1/1, 3 pass / 4 fail**, os mesmos 4 casos nas três. O conserto **não é decorativo**.
- **O vermelho-controle REPRODUZIU:** F2 no head do delta **N=5 → ec 0×5, 17/0**; no head intocado `0f0a872a`, mesmo comando, **N=5 → ec 1,1,0,0,0** — **2 vermelhos em 5**, mais forte que o 1-em-5 declarado, em caso **diferente** a cada vez (assinatura de corrida), com total inflado `9901010039010001n` contra `9900999999010001n`.
- **Teardown provado por catálogo e por mutação:** `confdeltype = c` (CASCADE real) lido de `pg_constraint`; `count(*)` na janela 2028 = **0** depois da suíte; T1 (teardown parcial) deixa **21 linhas** e S11 vermelho; T3 (throw forçado) mantém a janela em **0** — o `finally` limpa **também no caminho de falha**.
- **Higiene:** cluster próprio `:56711/:56712`, **16 resets no BANCO** (`DROP DATABASE ... WITH (FORCE)` + `CREATE` + `migrate deploy`), `nspacl` conferido em cada um → `GRANT USAGE` ao PUBLIC intacto, **zero 42501**.

### C2 · invariante financeiro / rateio — `jurado-06d-invariante-financeiro-rateio`

- **O dinheiro não se mexeu, provado por hash de árvore** (insensível a `autocrlf`, sem `git archive`+`tar`): `0f0a872a:src` == `cc579302:src` == `deff7bcc:src` == `764a3b04:src` == **`e26eb9e5:src` = `461cfa6b…`**, com `cloud-costs` = `ab484e9a` e `cloud-cost-allocation` = `bb4fc5bf` idênticos (N=1 por ref × 7 refs). O `src/` sob julgamento é **byte a byte** o que a junta original aprovou. Delta puro (`git diff --numstat cc579302 e26eb9e5 -- src/ prisma/ frontend/ mobile/ .github/ scripts/ package*`) → **saída literalmente vazia**.
- **A isca detecta, provado por mutação:** 4 alvos (S1/S3′/S4/S10) × **N=2** = **8 execuções, ec=1 nas oito**, zero intermitência, por **vias independentes** (contagem de linhas, contagem por região, total exato). A diferença é **2.331.000.000.021 micro-unidades = 3 × 777.000.000.007**, a quantia exata da isca.
- **O experimento que separa detector de teatro:** arrancar a isca deixa S4 vermelho **2/2**; com isca=0 **e** S1 sem `importId`, S1 fica **VERDE 2/2**. Logo é a **isca**, não a janela e não a sorte, que torna o escopo falsificável.
- **A aritmética fecha por subtração de dois números dele:** baseline `fe2748c8` medido por ele (`npm test`, N=1, ec=0) → **2938 / 2936 / 2 skipped**; Δ = **+59**; diff de **nomes** entre os dois TAPs → **2873 na base, 2932 no head, 61 novos, 2 mortos, 61−2 = +59**; e a contagem **por execução, arquivo a arquivo** → 15+6+6+6+4+10+7 = **54** da autoria + **5** do conserto (guard 4, com `skipped 0`, e S11) = **59**.

### C3 · contrato / regressão / registro — `jurado-06d-contrato-regressao-registro`

- **Escopo §C4 por hash de árvore, no corte que responde à pergunta** (`0f0a872a` × `e26eb9e5`): `src` **IGUAL** `461cfa6b`, `prisma` **IGUAL**, `frontend` **IGUAL**, `mobile` **IGUAL**, `.github` **IGUAL** `e98540f0`; só `scripts` difere — e **três medições independentes** mostram que veio **100% da main absorvida** (`1b8319f9:scripts` == `e26eb9e5:scripts`; `numstat 1b8319f9→e26eb9e5` vazio; `numstat cc579302→deff7bcc` vazio). **O delta tocou ZERO das seis pastas proibidas.**
- **O teste nominalmente proibido não foi tocado:** `tests/o6r06-allocation-basis-rls-db.test.ts` com `numstat` **vazio** e blob idêntico `91838f4d` nas quatro refs do delta (N=1+5).
- **A recíproca fecha:** `git diff-tree --cc --name-only cc579302` devolve **exatamente 6 arquivos** — os seis conflitos declarados, todos em `Kpis/*` e `agent-orchestration/**`; o conserto (`cc579302..deff7bcc`) são **12 arquivos**, os três de `tests/` do §5 + 3 `Kpis/` + 6 `agent-orchestration/`, com pathspec das proibidas **vazio**.
- **O KPI reproduz por reexecução, sob a forma que a nota publica** (e a forma **inclui** o passo que a autoria omitia: banco recriado antes de cada execução): `npm test` **N=3** → as **três idênticas**, **# tests 2997 · # pass 2995 · # fail 0 · # skipped 2 · ec=0**, 107 migrations, `nspacl` correto nas três. Os 2 pulados são os **2 do orçamento** (`permission-catalog-db-parity` sob `RBAC_DB_PARITY≠1`), lidos **por nome no TAP** — auto-pulo silencioso: nenhum.
- **A colisão do `blocks_completed` está explicada e a série é honesta:** `fe2748c8`=161, `ab2540d0`=162, `1b8319f9`=162, `cc579302`=**163**, head=**163** (N=5 refs); varredura programática das **158 entradas** do history → **0 violações de monotonicidade, 0 datas fora de ordem**; a redatação/reordenação da entrada do B06 foi provada **nas duas pontas** (pos 155 / 2026-09-07 / 162 em `ab2540d0` → pos 157 / 2026-09-08 / 163 no head), sem inverter a cronologia de nenhuma outra entrada.
- **Guards fechados por execução:** `kpi-freeze --check` **ec=0** ("em dia, snapshot 2026-09-08"); `kpi-dashboard-charts` **16/16 ec=0**; `kpi-achados-paridade` **6/6 ec=0**; `node --check Kpis/app.js` ec=0; `git diff --check` da árvore **ec=0**. O diff de `Kpis/app.js` em **todo** o delta é `numstat 1 1`, e a única linha alterada é a `var FROZEN`.
- **O registro está nos autos, e o índice foi conferido pela SAÍDA DO GERADOR** (não por leitura do código): `python agent-orchestration/controle/gerar-indice-pendencias.py` em cópia isolada, **ec=0**, stdout `308 cabecalhos / 297 IDs | {FECHADA:70, ABERTA:236, SEM-STATUS:2}` — e o **hash da saída `671cea9f…` é igual ao hash do índice commitado**. Byte-idênticos: o índice **não está defasado**.

---

## §3 · Tabela de achados — 12 no total, **nenhum bloqueia**

| # | Cadeira | Achado | Gravidade | Escopo | Efeito |
|---|---|---|---|---|---|
| 1 | C3 | `kpis-latest.json` perdeu, na reconstrução do merge, o marcador §C3.3 **deste** bloco em 5 trilhas carregadas — o último marcador passou a nomear `B-GOV-ELENCO-ENXUTO` | **média** | dentro-do-bloco | Não bloqueia: a **nota completa está no history** (entrada 157), os valores carregados estão corretos (árvores `mobile` `3a2ac028` e `frontend` `24be761e` idênticas entre `0f0a872a` e `e26eb9e5`) e as notas dizem CARREGADO, sem afirmação falsa em primeira pessoa |
| 2 | C2 | "N=3, três resultados idênticos, `fail 0`" **não é herdável**: reproduziu **1/3** no terreno dele, com vítimas diferentes e a causa nomeada pelo runtime (`timeout 5000 ms, however 6096 ms passed`, no teardown de `impound-trigger-durability`) | **média** | pre-existente | Classe `P-O6R-SUITES-DB-SEM-TEARDOWN`. Arquivos vítimas datados (2026-07-26 e 2026-08-10) e **não tocados** nem pela autoria nem pelo delta (`numstat` vazio nas duas pontas). Confundidor declarado: a C1 rodava em paralelo (18,83% de CPU) |
| 3 | C1 | O helper publica `2026-06 n=209` como prova de presença; a medição no mesmo head pré-delta deu **219** (e 224 no head). Julho bate exato (319) | baixa | dentro-do-bloco | A **conclusão** (2026 ocupado, 2028 livre) segue verdadeira pela medição própria da cadeira |
| 4 | C1 | O guard verifica a **forma textual** da data, não o intervalo: sonda M6 (`new Date(Date.UTC(2028,1,15))`) passa **verde, ec=0** | baixa | dentro-do-bloco | Propriedade ausente **nomeada sem conserto** (§C7.4-bis). O guard cumpre o que declara guardar e a propriedade de fundo está satisfeita hoje |
| 5 | C2 + C3 | Os **12 corpos de jurado** (`.claude/agents/especialistas/jurado-06d-*` + espelho `.agents/`) estão fora da lista **literal** de escopo do §5 | baixa | dentro-do-bloco | Cobrá-lo seria **reprovação por construção**: são exatamente as identidades que a junta exige (as seis anteriores estão sepultadas) e tocam **zero** pasta proibida |
| 6 | C2 | PR #385 está **BEHIND** em relação a `origin/main` | baixa | dentro-do-bloco | Condição de **merge** (§8.5), não de mérito nem de start. `mergeable=MERGEABLE` |
| 7 | C3 | O artefato de planejamento do workflow 4+4 **não está nos autos** — só a prescrição sintetizada; o plano bruto ficou em `scratchpad` | baixa | dentro-do-bloco | Não bloqueia: o §C7.4-bis exige que a **ata** registre quem ocupou cada papel, e isso está no §1 acima |
| 8 | C1 | `listCostLineItems` **não aceita escopo por import** — a leitura do rateio soma qualquer linha que caia no período; só a janela disjunta a protege | baixa | pre-existente | Nascido em `6f27faae`, **2026-06-08**, três meses antes da branch; e o §5 **proíbe** `src/**`. Vira pendência com dono a nomear |
| 9 | C2 | A decomposição do Δ +59 silencia um par **renomeado 2-por-2** dentro do "+54 da autoria" (61 novos, 2 mortos) | baixa | pre-existente | Os dois mortos morreram na **autoria** (ausentes já em `ab2540d0`) e têm substituto nomeado no mesmo arquivo: **a cobertura não encolheu** |
| 10 | C2 | **Armadilha de método no próprio enunciado do item 1:** a base `fe2748c8` **não** devolve `numstat` vazio para `cloud-cost*` — devolve 9 arquivos, e lê-la ao pé da letra fabricaria um veto por construção | baixa | pre-existente | Registro de método: a base que responde à pergunta do **delta** é `cc579302`, não `fe2748c8` |
| 11 | C3 | `new blank line at EOF` em `votos/B-O6R-06/C1-banco-rls-evidencia.md:359` (apontado por `git diff --check` **entre commits**; a árvore de trabalho, que é a forma da bateria §9, dá **ec=0**) | baixa | pre-existente | Nascido em `cae4305a`, 2026-09-07 (voto da junta original); `numstat` vazio nos três trechos do delta |
| 12 | C3 | Duas pendências **sem linha canônica de `status:`** (`P-GOV-NOTA-KPI-CONGELADA`, `P-GOV-BAIXA-CICLO1-FECHADOS`) | baixa | pre-existente | Vieram da **main absorvida** (`1b8319f9`), medido por presença ref a ref. O gerador se comporta corretamente: reporta e não chuta |

**Distribuição:** 2 `média` · 10 `baixa` · **0 `bloqueia`** — 6 `dentro-do-bloco`, 6 `pre-existente`, todos com escopo **provado por data ou origem**, como o §C7.1-ter(a) exige.

---

## §4 · Terreno — o parecer do inspetor e a ressalva que o dono precisa ler

O inspetor deu **`LIBERADO COM RESSALVA`** e é o achado dele, não o das cadeiras, que traz a consequência mais séria.

### 4.1 · O contrato injetado não corresponde a ref nenhuma — e eu confirmei por medição própria

O inspetor mediu que o `CLAUDE.md` entregue no prompt dele **não é o arquivo que diz ser**: seus marcadores distintivos (`D-CADEIRA-PERMANENTE-JUNTA`, `ASSENTO PERMANENTE HOMOLOGA`, `cadeira-permanente-backend-review`) batem com **`25c0112a`**, commit de `chore/gov-elenco-fatia-b` — branch **reprovada em duas juntas, nunca mergeada, `is-ancestor: NÃO`**.

**Confirmei por medição própria na consolidação** (o mesmo contrato foi injetado em mim):

| Onde | Linhas | `1-quater` | `ASSENTO PERMANENTE` | Comando · N |
|---|---|---|---|---|
| `CLAUDE.md` no disco da sessão (`demo/investidor` @ `d1fab3bc`) | **515** | **0** | **0** | `wc -l` + `grep -c` · N=1 |
| `CLAUDE.md` em `e26eb9e5` (head julgado) | **636** | **0** | **0** | `git show e26eb9e5:CLAUDE.md \| grep -c` · N=1 |
| `CLAUDE.md` em `origin/main` (`a01fc014`) | — | **1** | — | `git show origin/main:CLAUDE.md \| grep -n "1-quater"` · N=1 |

E a **única** ocorrência em `origin/main` é a linha 111, dentro do §A7 (`D-MEDIR-NA-REF-ALVO`), que **documenta o fantasma**, verbatim:

> *"o `inspetor-de-terreno-da-junta` recebeu um item mandando bloquear por um `§C7.1-quater` **que não existia em ref nenhuma**"*

Ou seja: **a norma que o meu próprio contrato injetado apresenta como lei (§C2 6-bis e §C7.1-quater, "ata sem o parecer do assento permanente = merge inválido") não existe em nenhuma ref do repositório.** Aplico a mesma regra que salvou o inspetor: **cláusula inexistente = o item que a cita não se aplica**. Esta ata não carrega parecer de assento permanente, e isso **não é defeito** — o §5 do briefing lista o assento permanente como **reprovação por construção** exatamente por esse motivo.

**Registro contra mim mesmo, sem atenuar:** se eu tivesse obedecido o contrato que me foi entregue em vez de medir, teria declarado esta junta inválida por falta de um parecer previsto por uma seção que ninguém aprovou.

### 4.2 · As demais ressalvas do inspetor

| # | Ressalva | Estado ao fechar a ata |
|---|---|---|
| R1 | **Contrato contaminado** (acima) — 5ª instância de `P-GOV-CAMINHO-REPO-SESSAO`, a **primeira pela via do CONTRATO** e não do corpo do agente | **ABERTA · ALTA** — item nº 1 do dossiê do dono |
| R2 | O **corpo do próprio inspetor** diverge do head julgado e da main (8045 × 8969 × 10675 bytes; md5 EOL-neutro `934a8b08` × `11cd5383` × `33dc3256`); faltavam-lhe a nota `D-FALLBACK-MODELO-FABLE-OPUS`, o item 3.1-bis e o item 3.3 | Ele **colou o diff e executou os três assim mesmo**; nenhum dos três buracos muda o veredito. Mesma pendência de raiz que R1 |
| R3 | **CI não estava 7/7 no instante da medição dele** (11:38Z: 6 checks, `backend` IN_PROGRESS; 11:43Z: 7 checks, `docker` IN_PROGRESS) | A C3 **reexecutou às 13:02Z**: `gh pr checks 385` → **7/7 pass, ec=0** (N=1). CI verde é condição de **merge**, não de start — e **o número não é herdável** |
| R4 | **PR BEHIND**: o head não absorve os 2 commits atuais de `origin/main` (#383 e #384) | Confirmado por mim (`mergeStateStatus=BEHIND`, N=1). Risco de repetir a colisão de `blocks_completed` medido pelo inspetor como **nulo** (`git diff --numstat 764a3b04...origin/main -- Kpis/` → **vazio**, N=1) — mas medido sobre `764a3b04`, e o head hoje é `e26eb9e5`: **re-medir antes do merge** |
| R5 | **Âncora §0 do briefing desatualizada** (nomeia `deff7bcc`) | **Resolvida na prática**: as três cadeiras mediram e citaram `e26eb9e5` com o comando |
| R6 | **Obituário, linha 9:** "As 17 identidades abaixo" contra placar de **21** | `pre-existente` (linha idêntica em `deff7bcc` e `764a3b04`, não tocada por este commit) — pendência nomeada, não reprova |
| R7 | Nota de método: `grep -c` conta **linhas**, não ocorrências (o orquestrador declarou 2 onde havia 1) | Sem efeito no mérito. Classe já medida 5 vezes nesta casa ("a ferramenta que responde QUASE a pergunta") |

---

## §5 · Pendências que ficam, com dono

| Pendência | Origem | Escopo | Dono |
|---|---|---|---|
| `P-GOV-CAMINHO-REPO-SESSAO` — **5ª instância, 1ª pelo contrato**: as sessões nascem da árvore defasada `demo/investidor`, e agora está medido que um agente pode nascer com um `CLAUDE.md` de **branch reprovada** que lhe ordena bloquear | Inspetor R1/R2 + medição própria desta ata (N=4) | — | **Decisão do dono (item nº 1 do dossiê)** — ABERTA · ALTA |
| Marcador §C3.3 ausente em 5 trilhas carregadas do `kpis-latest.json` | Achado 1 (C3) | dentro-do-bloco | **`B-O6R-06` (delta)** — corrigir no próximo PR que tocar `Kpis/` |
| Nota do helper publica `2026-06 n=209` onde a medição dá 219/224 | Achado 3 (C1) | dentro-do-bloco | **`B-O6R-06` (delta)** |
| Guard reserva a janela pela **forma textual** da data, não pelo intervalo | Achado 4 (C1) | dentro-do-bloco | **`B-O6R-06` (delta)** — propriedade ausente, nomeada sem conserto |
| O §5 do briefing **não contempla** o caminho dos corpos de jurado que a própria junta exige criar | Achado 5 (C2+C3) | dentro-do-bloco | **Governança** — corrigir o molde de briefing |
| Plano do workflow 4+4 não está nos autos (só em `scratchpad`) | Achado 7 (C3) | dentro-do-bloco | **Governança / `B-O6R-06` (delta)** |
| `P-O6R-SUITES-DB-SEM-TEARDOWN` — suítes de banco sem teardown, com flake de contenção sob CPU disputada | Achado 2 (C2) | pre-existente | **A nomear** — arquivos de 2026-07-26 (#286/#322) e 2026-08-10 (#344) |
| `listCostLineItems` sem escopo por import (leitura do rateio soma por overlap puro) | Achado 8 (C1) | pre-existente | **A nomear** — origem `6f27faae`, 2026-06-08 |
| Par renomeado 2-por-2 não declarado na decomposição do Δ | Achado 9 (C2) | pre-existente | **`B-O6R-06` (mérito, já aprovado 3×0)** |
| `new blank line at EOF` em `C1-banco-rls-evidencia.md:359` | Achado 11 (C3) | pre-existente | **`B-O6R-06` (mérito)** |
| 2 pendências sem `status:` canônico | Achado 12 (C3) | pre-existente | **#382 / #383** |
| Obituário linha 9: "17 identidades" contra placar 21 | Inspetor R6 | pre-existente | **A nomear** |
| Registro de método: a base do delta é `cc579302`, não `fe2748c8`; e `grep -c` conta linhas | Achado 10 (C2) + Inspetor R7 | — | **Governança** (§A7) — evitar o falso positivo na próxima passada |

---

## §6 · ANTES do merge — três coisas, e a primeira é obrigatória

1. **COMMITAR OS VOTOS E ESTA ATA.** Medido por mim: `git -C .claude/worktrees/b06 status --porcelain` → **`?? agent-orchestration/omega/juntas/votos/B-O6R-06-delta/`** (N=1), com **6 arquivos** (`ls -la`, N=1): `C1-banco-atomicidade-rls-{evidencia.md,voto.json}`, `C2-invariante-financeiro-rateio-{…}`, `C3-contrato-regressao-registro-{…}`. **Estão fora do controle de versão.** Sem eles e sem esta ata no PR, vale o item 1 do §C7: **junta sem registro = merge inválido**.
2. **Atualizar a branch** (`BEHIND` em relação a `a01fc014`) e **re-medir** `git diff --numstat <head atual>...origin/main -- Kpis/` — o inspetor mediu vazio sobre `764a3b04`, e o head hoje é `e26eb9e5`. É a checagem que evita repetir a colisão de `blocks_completed`.
3. **Reexecutar o CI e registrar o número.** `7/7 pass` foi medido pela C3 às 13:02Z (N=1) e havia execução em voo às 11:43Z. **Ninguém herda esse número.**

---

## §7 · DEPOIS do merge

**§C5 — limpeza pós-merge (disco escasso).** `bash scripts/post-merge-cleanup.sh` e, especificamente para esta rodada: remover o worktree `b06` por **`git worktree remove --force`** (nunca `rm -rf`, nunca por nome de cadeira — remoção **por identificador de bloco**), derrubar quaisquer containers `o6r06d-*` remanescentes e conferir que os `node_modules` dos worktrees vivos seguem intactos. As três cadeiras já derrubaram os próprios clusters e worktrees e **reportaram sem varrer** o resíduo alheio (C1 e C3 registraram volumes/containers de outras sessões).

**§C3.5 — backfill.** `merge_commit` e `approved_head` estão `null` na autoria, como manda a política. Após o squash: `approved_head = e26eb9e5` (o head que as três cadeiras mediram e julgaram) e `merge_commit` = o hash do squash, junto da reconciliação de PR#/hash no bloco seguinte. `blocks_completed` fica em **163** — valor já publicado e conferido por 5 refs.

**§C2.8 — porteiro pós-merge.** Nasce o `porteiro-pos-merge` e **sem parecer dele nenhum bloco novo começa**. Três coisas que ele precisa saber, para não gastar ciclo:

- **Reexecutar, não copiar:** `2995/2997` reproduz sob a forma declarada (C3, N=3) mas **`fail 0` não é herdável** (C2 mediu 1/3 sob contenção de CPU). Ele deve rodar `npm test` com **banco recriado antes de cada execução** e publicar o que ele mesmo medir.
- **Não bloquear por assento permanente.** Se o `CLAUDE.md` injetado nele contiver §C2 6-bis / §C7.1-quater, esse contrato **não corresponde a ref alguma** (medido nesta ata: 0 ocorrências no disco da sessão, 0 no head julgado, e em `origin/main` só a advertência do §A7). O briefing §5 classifica o assento permanente como reprovação por construção.
- **Conferir se a pendência da raiz continua aberta:** enquanto as sessões nascerem de `demo/investidor` (`d1fab3bc`, 515 linhas de `CLAUDE.md`, atrás de `origin/main`), o próximo agente de gate nasce contaminado outra vez.

---

## §8 · O que esta junta NÃO cobriu, por desenho

**Reprovação por construção (nenhuma cadeira cobrou):** mudança em `src/` (o conserto tem **zero linha** de `src/`); `prisma/`, `mobile/`, `.github/`, `scripts/`, `frontend/`; `tests/o6r06-allocation-basis-rls-db.test.ts`; o ramo `completed` do reconcile (`R2-A`); baixar `--test-concurrency`; o assento permanente; e `P-O6R-SUITES-DB-SEM-TEARDOWN` como veto.

**O mérito não se rejulgou.** As sete afirmações marcadas `[A RE-VERIFICAR]` no §7 do briefing não entraram como fato em nenhum voto e nenhuma reprova o delta.

**Erros que as próprias cadeiras declararam contra si** (e que é a razão de esta ata ser confiável): a C2 leu um `ec` **depois de um pipe** e colheu um "DIVERGE" falso do espelho Codex, refez com `ec` por variável e obteve `ec=0`; a C3 caiu na armadilha do `git rev-parse <rev>:<caminho>` — que ecoa o argumento quando o caminho não existe — e produziu **30 falsos DIVERGE**, detectou ao investigar um caso concreto e refez com `git diff --name-status` e `git ls-tree`, **sem que nenhum achado sobrevivesse**; a C1 declarou que uma checagem de junction falhou por sintaxe de caminho e provou a consequência por outro caminho (os `node_modules` de três worktrees intactos, 222 entradas cada).

---

## §9 · Consequência

**APROVADO 3×0.** O merge está autorizado pelo §C7.1, cumpridos os três passos do §6 acima (commitar votos e ata, atualizar a branch, reexecutar o CI). O `src/` que vai para a `main` é **byte a byte** o que a junta original aprovou; o conserto vive inteiro dentro do escopo permitido; o número de KPI reproduz sob a forma que ele mesmo declara; e as doze anotações que ficam são duas de gravidade média e dez baixas, **nenhuma bloqueante**, todas com escopo provado por data ou origem.

A pendência que sai daqui maior do que entrou não é do produto: **é a do contrato**. Três agentes de gate consecutivos — o inspetor desta junta, o porteiro de hoje e eu, ao consolidar esta ata — receberam um `CLAUDE.md` que não existe em ref nenhuma, e os três só não erraram porque **mediram antes de aplicar**. Isso não é um sistema; é um bom hábito segurando um buraco.

---
