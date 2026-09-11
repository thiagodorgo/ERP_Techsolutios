# ATA DA JUNTA — B-O6R-06 (`fix/billing-durability`)

**Data:** 2026-09-07 · **Veredito: APROVADO 3×0 (unanimidade de 3)** · **Ciclo 1** (teto: 2, `D-TETO-DOIS-CICLOS`)

| | |
|---|---|
| **Head de CÓDIGO julgado** | **`0f0a872a`** — provado por pathspec: `git diff --numstat 0f0a872a <head> -- . ':!agent-orchestration' ':!.claude' ':!.agents' ':!docs'` sai **vazio** |
| Head de registro ao fechar | `0d838a1e` |
| Base | `origin/main` = **`fe2748c`** (= merge-base) |
| Achados que fecha | **`Ω6R-DIN-005`** e **`Ω6R-DIN-007`** — **2 P0** |
| Quórum | **Unanimidade de 3** (§C7.1-ter(b): o bloco toca **dinheiro** — faturamento e rateio). Não é 5/5 |

## §1 · Separação de papéis (§C7.4-bis) — quem ocupou cada papel

| Papel | Quem | Vota? |
|---|---|---|
| **Quem achou** | auditoria Ω6R (DIN-005, DIN-007) + `critico-adversarial` (2 rodadas, 3 bloqueantes + 7 ressalvas) | **não** |
| **Quem pesquisou** | `agente-pesquisador-web` — 2 PDs, 16 e 14 fontes | **não** |
| **Quem planejou** | `planejador-mestre` (plano + `EMENDA E1`) | **não** |
| **Quem desenvolveu** | dev `general-purpose` (8 commits) | **não** |
| **Quem liberou o tabuleiro** | `inspetor-de-terreno-da-junta` (2 passadas) | **não vota** |
| **C1 · banco/atomicidade/RLS** | `jurado-06-banco-atomicidade-rls` | **APROVADO** — 4 achados, todos `nota` |
| **C2 · invariante financeiro/rateio** | `jurado-06-invariante-financeiro-rateio` | **APROVADO** — 3 `nota` (1 dentro-do-bloco, 2 `pre-existente` com data e dono) |
| **C3 · contrato/regressão/KPI** | `jurado-06-contrato-regressao-kpi` | **APROVADO** — 4 achados, todos `nota` |

**Zero `bloqueia` em 11 achados.** Inelegibilidade conferida **por nome** pelo inspetor.

## §2 · O caminho — e onde cada etapa mordeu

1. **Plano** (`9f582a34`). Três achados de diagnóstico que o achado original não tinha: **ninguém agenda
   `cloud-usage.aggregate-daily`** (a projeção que o rateio lê é vazia em produção **por construção**);
   **`cloud_usage_events` tem `FORCE ROW LEVEL SECURITY`** e as leituras de plataforma rodam sem GUC — 0 linhas,
   **invisível na CI**, que roda como superusuário; e **`take: 100_000` no rateio**, mesma classe do DIN-007,
   10× maior.
2. **PDs** (`be608a52`, 16 e 14 fontes) — **contrariaram o plano em 5 pontos**. Os dois que mudaram código:
   `createMany({skipDuplicates})` gera `ON CONFLICT` **sem alvo** (engoliria conflito de PK) → **retirado**;
   e `_sum` devolve **`null`** para janela vazia (PostgreSQL: *"sum of no rows returns null, not zero"*;
   Prisma desde 2.21.0: todo campo agregado é nulável, `count` é a única exceção) → **tipos passaram a
   nuláveis**, com `_count._all` como discriminador.
3. **Crítico, rodada 1** (`be608a52`) — **PLANO FRÁGIL**, 3 bloqueantes:
   - **E1:** a invariante `I1` era **falsa por construção** — três sítios inserem em `checklist_runs`, não
     dois, e o terceiro é a **reabertura**, que cria run **sem métrica de propósito** (regra da junta do
     PR-03). O script de reparação **inseriria 1 unidade faturável por reabertura** — a cobrança dobrada que
     a PR-03 fechou — **e o §12 propunha rodá-lo na demo**.
   - **E2:** gravar no `completeRun` do repositório capturava **três** chamadores; a trilha de
     **divergência/sync mobile**, que hoje **não** fatura, passaria a faturar. **Raiz de método:** diagnóstico
     pelo *emissor*, conserto pelo *repositório*, conjuntos de chamadores que não coincidem.
   - **E3:** sob papel sem `BYPASSRLS`, a **escrita** do rateio falha, não só a leitura — provado por execução.
4. **Emenda E1** (`26182d6b`, +380/−0, corpo byte-idêntico). A intenção de faturar volta ao **emissor por
   assinatura**: parâmetro `billing` **obrigatório e sem default** — troca convenção por **condição de
   compilador** (`C6`: compila sem o parâmetro → `check` vermelho).
5. **Crítico, rodada 2** (`dc47e668`) — **PLANO ROBUSTO COM RESSALVA**. E1/E2/E3 fechados; **E1 reaberto
   noutro caminho**: as duas metades da emenda se contradiziam — o reconcile cobria *"todas as runs com
   `completed_at`"*, e a trilha C termina **com `completed_at` e sem métrica por decisão do bloco**.
   **Bloqueou o ramo `completed` do script**; `I2′` **não é verificável por SQL**.
6. **Implementação** (`e2d4e119`→`0f0a872a`, 8 commits). O **canário exigido pelo `R2-C` pegou defeito no
   código do próprio dev**: `sumUsageBasis` e o `deleteMany` confiavam **só** na RLS, e dev/CI rodam como
   `postgres` — o `groupBy` somava a base de **todas as organizações num balde só**.
7. **Inspetor** — passada 1 `BLOQUEADO` (só o briefing), passada 2 **LIBERADO**.

## §3 · Números — quatro fontes independentes

| Fonte | base `fe2748c` | head `0f0a872a` |
|---|---|---|
| dev (cluster próprio) | **2938 · 2936 pass** | **2992 · 2990 pass** |
| inspetor (cluster próprio) | *não reproduziu* (R4) | **2992 · 2990 pass** |
| **C3 (cluster próprio, banco pristino)** | **2938 · 2936 pass · 0 fail · 2 skip · ec=0** | **2992 · 2990 pass · 0 fail · ec=0** |

**Δ = +54**, e a C3 o fechou por **três caminhos independentes**: denominador (2992−2938), aprovados
(2990−2936) e **soma por arquivo rodada uma a uma** (15+6+6+6+4+10+7). **Piso único ≥47 → 54.** Os 2 skips
são `permission-catalog-db-parity` ×2.

**A lacuna 90 × 54 é unidade de contagem, não ausência:** o desenho conta sub-asserções, a execução conta
blocos `test()`. **Nenhum aceite falta na suíte** — a C3 verificou. Publicada como observação, **não como
critério**: cobrar `≥90` seria erro do jurado.

## §4 · O registro mais útil desta junta — a C3 declarou o próprio erro de método

A C3 rodou **head e base simultaneamente na mesma máquina**. As duas passadas vieram com timeout; uma terceira,
do head sozinho, ainda deu **4 falhas — três delas nos aceites `S1`/`S3′`/`S10` do próprio bloco**.

**O diagnóstico veio da asserção, não da intuição:** `S1` esperava `10001` e recebeu **`10002`** — exatamente
uma linha a mais — e `S10` diferia por exatamente **`40.000000`**. Resíduo da própria passada anterior dela, no
mesmo banco. **Em banco novo: zero falhas.**

**Se ela tivesse parado na terceira passada, teria REPROVADO UM BLOCO ÍNTEGRO por sujeira própria.** Fica em ata
porque é a forma mais barata de a junta errar, e porque o que a salvou foi a **forma** do número (uma linha a
mais; um delta exato), não o instinto.

**E a prova por ausência de grep mordeu-a duas vezes no mesmo lugar:** o laço acusou `B9 AUSENTE` e depois
`B6′ AUSENTE`, **os dois falsos** — vivem num rótulo combinado, `test("B6′/B9 · o GUC é SUBSTITUÍDO a cada
volta…")`, exatamente como a `E1·7` os pareia.

## §5 · Alarmes encerrados, com os dois lados publicados

1. **`K4`** — temeu-se que a `evidencia_fechamento` do `DIN-005` citasse um caso da série bloqueada, o que
   seria um P0 "fechando" com prova inexistente. **Quatro medições independentes, quatro negativas**
   (orquestrador, fábrica, inspetor, C3). **Encerrado.**
2. **`B3` no `DIN-007`** — é citado **apenas para ser excluído** (*"fica como REGRESSÃO e NÃO entra nesta
   evidência"*), o **oposto** do defeito contra o qual a regra protege.
3. **`Kpis/index.html` fora do diff é conformidade** — shell de 172 linhas com **zero número cravado**; o §6
   não o autoriza, e o #380 também não o tocou.
4. **A inversão do papel de banco** — o defeito do canário é **invisível sob `NOBYPASSRLS`** (a RLS faz o
   recorte e o teste passa **com o defeito presente**); só aparece sob `postgres`. A C1 mediu **sob os dois
   papéis**, como o mandato exigia. **Medir só sob o papel restrito teria aprovado o bug.**

## §6 · Decisões e ressalvas que ficam em ata

1. **O ramo `completed` do `scripts/reconcile-checklist-usage.ts` NÃO foi implementado** — bloqueado pelo
   crítico. **A junta decide o predicado observável**, e exige aceite da série K com run de trilha C semeada
   **antes de qualquer `--apply` na demo**. Registrado em `P-O6R-B06-RECONCILE-BLOQUEADO`.
2. **`I2′` não foi reescrita** — não é verificável por SQL (o universo contém *"que passou por
   `service.completeRun`"*, predicado que não existe em coluna). Ninguém inventou predicado.
3. **Duas divergências de escopo, declaradas pelo dev e devolvidas à junta:** 2 arquivos de teste `-db` fora
   do §6 (sem caminho verde alternativo; a saída exigia migration, proibida — **nenhum guard afrouxado, um
   ficou mais forte**) e o papel do drill vindo de `createEphemeralRole` em vez do nome do plano. A C3
   confirmou que em `tests/` são **exatamente essas duas**.
4. **Contagem de pendências:** o dev narrou **10**; o registro contém **11** — três comandos concordantes,
   **nenhuma falta**. Publicados os dois números.
5. **A pendência-mãe segue `ABERTA` na autoria**, coerente com `aguardando_merge` e `merge_commit = null`.
6. **`Ω6R D-002` continua fora como autoridade** — rascunho não deliberado; o dono optou por não deliberá-lo.
   O bloco foi feito pelo caminho aprovado.

## §7 · Perguntas obrigatórias do §C7.4-bis

- **(a) A composição cobre a competência?** Sim. C1 mediu banco e RLS por execução sob **dois papéis**; C2
  julgou o valor com tolerância zero contra referência em `BigInt`; C3 reproduziu a baseline que o inspetor
  não conseguiu.
- **(b) Quem achou é quem consertou?** **Não.** Auditoria/crítico acharam → pesquisadora informou →
  planejador emendou → dev implementou → jurados julgaram. **Cinco papéis, cinco identidades.**
- **(c) O planejador usou dado podre?** **Usou, e foi pego duas vezes:** a invariante `I1` era falsa por
  construção, e o `createMany` fazia o oposto do que o plano supunha. As PDs e o crítico corrigiram **antes**
  da primeira linha de código.

## §8 · Consequência

**Verde da junta = merge autorizado** (§C7.1). Após o merge: limpeza §C5, **`porteiro-pos-merge`** (§C2.8) e
backfill de `pr`/`merge_commit`/`approved_head`.

**O que este bloco destrava:** com os 2 P0 fechados, o gate da **trilha CHECKLIST P1** — que exigia
`B-O6R-07` **e** `B-O6R-06` — fica satisfeito **por bloco**, e as 5 fatias paradas desde 15/08 podem voltar.
**Ressalva do porteiro do #380, que continua valendo:** o enunciado do gate cita **achados**, e o residual P0
do `SEC-002` (`P-O6R-SUBRECURSO-OBJECT-SCOPE`, ABERTA, ALTA) fica **fora** do "resta só o B06" — não alcança
este bloco; alcança quem for abrir aquele gate.

**Nota de terreno (defeito de despacho do orquestrador):** a C3 gravou voto e evidência no caminho da **árvore
principal** em vez do worktree do bloco — a armadilha de caminho absoluto. Os dois arquivos foram movidos com
`cmp` byte a byte **antes** de a origem ser apagada; nada rastreado foi tocado na principal.

## §9 · Homologação da cadeira permanente

> **CORREÇÃO DE FUNDAMENTAÇÃO (2026-09-09), feita antes do PR e não depois de cobrada.**
> Esta seção citava o **`§C7.1-quater`** como base normativa. Medido depois: **essa seção não existe em ref
> nenhuma** — nem em `origin/main` (`a01fc014`), nem em `fe2748c8`, nem na árvore principal. Ela existe só
> em `origin/chore/gov-elenco-fatia-b` / `25c0112a`, a branch cujo desenho foi **reprovado em duas juntas e
> nunca mergeou**. O `CLAUDE.md` carregado pela sessão do orquestrador a continha; o do repositório, não.
>
> O `§A7` da ref vigente (`CLAUDE.md:125`, entrado pelo #383) é explícito: **"norma citada que não existe na
> ref julgada não se aplica"**. Portanto:
> - **A convocação continua válida** — ela foi **determinação escrita do dono** em 2026-09-08 ("validando o
>   alegado pela junta"), e decisão do dono é fonte §A1.1, acima do contrato escrito. O que era inválido era
>   a *citação*, não o *ato*.
> - **O trabalho da cadeira continua valendo** por si: ela reexecutou 6 suítes da C1, as 2 de resumo da C2,
>   reproduziu o Δ=+54 e o absoluto 2992 da C3, e as duas ALTAs dela se provaram sozinhas — a colisão de
>   `blocks_completed` (dois blocos escrevendo 162 a partir da mesma base 161) e o `0 fail` do `npm test` que
>   não reproduz. Nada disso depende de qual seção autoriza a cadeira.
> - **Nenhum merge fica condicionado a ela.** A regra "ata sem o parecer dele = merge inválido" pertence à
>   mesma seção inexistente e **não se aplica**.
>
> Confirmado de forma independente pelo `porteiro-pos-merge` da regularização, que recebeu o **mesmo**
> contrato contaminado, mediu-o contra a ref e registrou o mesmo: `votos/REGULARIZACAO-382-383-384/01-parecer-porteiro.md`.
> A pendência da classe é `P-GOV-CAMINHO-REPO-SESSAO`, com a reincidência agora registrada.

**Parecer:** `votos/B-O6R-06/99-cadeira-permanente.md` (285 l.) · **medições brutas:**
`99-cadeira-permanente-medicoes.md` (262 l., M1–M27, apensadas ao vivo).

### VEREDITO: `HOMOLOGADO COM RESSALVA` — o 3×0 vale

Os **três votos foram GANHOS**: execução registrada, `N` e forma publicados, e o `escopo` dos três
`pre-existente` datado — a cadeira **reconferiu os três** no catálogo (`0648a8e1` e `6f27faae`, ambos de
2026-06-08, anteriores à branch). **Não há veto a examinar** (zero `bloqueia`), e **não houve reprovação por
construção**: as três cadeiras enumeraram por escrito o que *não* cobravam.

**Quórum:** exigido unanimidade de 3 (dinheiro). A cadeira **mediu ela mesma** as três condições de 5/5 e as
achou ausentes — `package.json`/lock = 0 arquivo, `frontend`/`mobile`/`src/infra` = 0, `ci.yml` = +8/−0 num
job de **teste**, não de deploy. Aplicado 3×0. **Bate — nem abaixo, nem acima.**

**Por que 11 achados e zero `bloqueia` não é carimbo:** os 11 têm comando e contra-medição; **três são contra
a própria casa**; os `pre-existente` publicam o `N` do efeito (4,285714 deslocados, 7,5%); e a falsificação
existe — as 17 mutações da C1 ficaram `ec=1` no alvo, e uma suíte `-db` sem `DATABASE_URL` sai **verde e
vazia** (`tests=1 pass=0 skip=1 ec=0`).

### Nota de modelo (obrigatória)

O frontmatter fixa `model: fable`. A **primeira convocação caiu com HTTP 429 — cota do Fable esgotada —
antes de medir qualquer coisa**, e nada foi herdado dela. O contrato prevê a exceção
(*"indisponibilidade do modelo vira nota na ata"*): **este parecer rodou em Opus**.

### Retroatividade

A `D-CADEIRA-PERMANENTE-JUNTA` é de **2026-09-07** e esta junta votou **antes** dela. **Não é omissão de
ninguém** — e o `inspetor-de-terreno-da-junta` desta junta **não podia** ter bloqueado por falta de convocação
da cadeira. O dono determinou a entrada retroativa em **2026-09-08**, "validando o alegado pela junta".

### Série da cadeira

**1 homologada / 0 anuladas** antes deste parecer → **2 / 0** depois.
A cadeira registra a assimetria enquanto é pequena e **se recusa a fabricar tendência com duas juntas**;
deixa o contraditório para o porteiro, notando que das duas **uma havia reprovado e outra aprovou** — a
correlação é com a existência de execução, não com o lado do veredito.

### As 8 ressalvas (nenhuma é defeito de produto — a cadeira não achou nenhum)

| # | grav. | ressalva | dono |
|---|---|---|---|
| 1 | **ALTA** | `origin/main` moveu **depois** do voto e o merge **conflita**; quem resolver autora conteúdo de KPI que cadeira nenhuma validou — os números têm de ser **re-derivados por execução na base nova** | merge + `porteiro-pos-merge` |
| 2 | **ALTA** | Publicar a forma que reproduz o verde e **corrigir a lição do §4 desta ata** | este bloco |
| 3 | MÉDIA | **12 corpos de jurado entram no merge fora da lista fechada do §6** — classe recorrente | molde de plano |
| 4 | MÉDIA | Série da cadeira passada como `0/0` no despacho, quando era `1/0` | orquestrador |
| 5 | BAIXA | Ata sem os dois hashes que o §5 do plano manda registrar (a **ordem** está correta) | este bloco |
| 6 | BAIXA | Ata escreve "LIBERADO" onde o inspetor escreveu "LIBERADO **COM RESSALVA**" | este bloco |
| 7 | BAIXA | Sem `00-quedas.md` nem linha "quedas: 0" — o quórum foi apurado **contando identidades** | este bloco |
| 8 | BAIXA | `core.autocrlf` publicado por **1 das 3** cadeiras — reincidência parcial | próximo briefing |

### §9.1 · CORREÇÃO DO §4 desta ata (ressalva 2) — a lição estava errada

O §4 acima atribuiu o `10002` a **resíduo próprio** e concluiu *"em banco novo: zero falhas"*.
**A cadeira reexecutou e não reproduziu:** `npm test` **N=2** deu `fail 1` (banco reusado) e **`fail 3` com
banco pristino**. Denominador idêntico (2992). **Banco novo não cura.**

**O mecanismo real está escrito no próprio repositório**, em `.github/workflows/ci.yml`: *"sentinela que o
paralelismo do `npm test` polui"*. O `npm test` roda arquivos **em paralelo contra um banco só**; a suíte
assere **contagem global** (10.001) lendo em 21 páginas de 500 — outra suíte escrevendo na janela produz
**exatamente uma a mais**, com banco novo ou velho.

**E `npm test` + `DATABASE_URL` não é a forma de nenhum job do CI:** `backend` roda **sem** `DATABASE_URL`;
`backend-postgres` roda **subconjunto curado** com guard anti-verde-cego. **Na forma canônica** — schema
recriado + as 4 suítes numa invocação — a cadeira mediu **`37/37, fail 0, skip 0, ec=0`**.

**Efeito:** é ressalva **de forma, não de mérito**. Os números da C3 reproduzem (Δ=+54 e o absoluto 2992
foram refeitos pela cadeira) e as suítes do bloco **são verdes onde o CI as roda**. O que não se sustenta
**como prova** é o `0 fail` do `npm test`: `N=1`, em forma que o repo documenta como instável, com a forma
publicada omitindo **a variável que decide** — o paralelismo.

### §9.2 · Nota do orquestrador — duas falhas minhas, e a main andando

1. **Passei a série da cadeira como `0/0` e estava errado** (era `1/0`, homologação nº 1 na junta do
   `B-GOV-ELENCO`, em `origin/main` via #381). A cadeira **mediu em vez de aceitar o número do despacho** —
   que é exatamente para isso que ela existe. Ressalva 4.
2. Antes disso, no despacho da própria junta, a C3 gravou voto e evidência na **árvore principal** em vez do
   worktree (§8) — segunda armadilha de caminho absoluto na mesma junta.
3. **A `main` andou OUTRA VEZ durante a apuração da cadeira:** ela mediu contra `90d30f8a` (#381); ao fim
   do parecer `origin/main` já era **`1b8319f9`** (#382). Os conflitos passaram de **5 para 6** —
   `agent-orchestration/docs/status-geral.md` entrou. A ressalva 1 **cresceu**, não encolheu.

**Padrão que isto expõe, e que vale mais que o conflito:** um bloco aprovado e parado acumula conflito
**exatamente nos arquivos de registro** que todo PR toca — os quatro do `Kpis/`, `pendencias.md`,
`status-geral.md`. **Tempo entre aprovação e merge é dívida de KPI**, e ela cresce sozinha.
