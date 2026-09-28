# B-GOV-SEM-TETO — PLANO (PR #394) — ciclo 1

- **Papel:** `planejador-mestre` (identidade nova para este bloco) · **Modelo:** Fable 5.1 — o corpo fixa
  Fable (`D-PLANEJADOR-MODELO-FABLE`); **sem substituição** · **Corpo aplicado:**
  `.claude/agents/planejador-mestre.md` @ `3e92b2b8` (frontmatter `model: fable`; 23 corpos no head, espelho OK).
- **Separação de papéis (§C7.4-bis):** o **orquestrador** escreveu o texto do #394 (é o dev do bloco e **parte
  interessada**: elaborou sobre as palavras do dono). Eu **planejo e não desenvolvo, não voto**. Quem julga é a
  junta do §10. Nenhuma linha deste plano propõe redação nova do contrato — nomeia o que falta e quem decide.
- **Insumos lidos integralmente:** o diff `origin/main...3e92b2b8` (3 arquivos, +95/−34); `CLAUDE.md` e
  `AGENTS.md` no head (§C7 inteiro); a entrada `D-SEM-TETO-AUDITORIA-NO-3` em `decisoes.md`; os corpos dos
  gates no head (`inspetor-de-terreno-da-junta`, `porteiro-pos-merge`, `planejador-mestre`,
  `critico-adversarial`, `validador-mestre`, `agente-fabrica`); `.agents/agents/README.md`;
  `EXECUTION_MODEL.md`; as atas/registros do #393 (`J-B-GOV-MANDATO.md`, `R-B-GOV-MANDATO-1/2.md`,
  `BRIEFING-B-GOV-MANDATO.md`, `B-GOV-MANDATO-ciclo3-plano.md` §10) lidos do ramo `origin/chore/mandato-refs-e-preflight`;
  `Kpis/kpis-latest.json` e `kpis-history.json` da `main` e do #393; `J-B-SAN3-00.md`.
- **Nada herdado como fato:** todo número abaixo foi medido por mim em `C:/Users/AMP/w-teto` (árvore do head,
  `status --porcelain` vazio) ou por `git show`/`gh` contra o head. Não commitei nem empurrei nada.

---

## §0 — Terreno e LINHA DE BASE (medida por mim, comando + saída)

### 0.1 Referências do PR — `scripts/mandato-refs.sh 394`, saída verbatim

**Ressalva de terreno, declarada antes da saída:** `scripts/mandato-refs.sh` **não existe** na `origin/main`
(`fc3363e3`) nem no head do #394 (`ls scripts/mandato-refs.sh` → *No such file*). Ele é artefato do **#393**
(ramo `chore/mandato-refs-e-preflight`, worktree `C:/Users/AMP/w-mandato`, **sob julgamento**). Executei o
script **daquele ramo** com o cwd em `w-teto` (`bash C:/Users/AMP/w-mandato/scripts/mandato-refs.sh 394`) e
**cruzei cada campo** com `git rev-parse` local, `git rev-parse origin/docs/sem-teto-auditoria-no-3` e
`gh pr view 394 --json headRefOid,baseRefName,state,mergeable,isDraft` — **os quatro concordam**. A saída vale
como leitura de refs; não vale como aval do script.

```
# refs do PR #394 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-09-28T12:58Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/sem-teto-auditoria-no-3
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      3e92b2b8ec7f19e4a51efbde810c292ed20a9cf4
merge-base:      fc3363e38aabd77f54e6b53034128182f8000571
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #394
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

- **Head a julgar:** `3e92b2b8ec7f19e4a51efbde810c292ed20a9cf4` (`3e92b2b8`) — 1 commit sobre a base,
  autor `thiagodorgo`, 2026-09-27 14:26:58 −03:00, `docs(governanca): D-SEM-TETO-AUDITORIA-NO-3 — cai o teto de
  ciclos, entra auditoria da maquina no ciclo 3`. `origin/docs/sem-teto-auditoria-no-3` = mesmo SHA.
- **Base:** `origin/main` = `fc3363e38aabd77f54e6b53034128182f8000571` (#392, 2026-09-21) = merge-base.
- **PR está em RASCUNHO (`isDraft=true`).** A junta julga o SHA; o rascunho é do orquestrador tirar **antes do
  merge**, não antes do voto. O inspetor 4.3 exige check-runs concluídos no head: **14/14, 0 não-verdes, 0
  pendentes** (medido pelo script e reconfirmado por `gh api .../commits/3e92b2b8/check-runs`).

### 0.2 O diff — três arquivos, e nada mais

`git diff --stat origin/main...HEAD`: `AGENTS.md | 43 (+28/−15)` · `CLAUDE.md | 43 (+28/−15)` ·
`agent-orchestration/controle/decisoes.md | 43 (+43/−0)` → **3 files, +95/−34**. `src/ tests/ prisma/
frontend/ mobile/ .github/ scripts/ Kpis/` — **0 linhas**. **`Kpis/*` não está no diff** (ver §5.E3).

### 0.3 O espelho — item 4 do §C7 idêntico nos dois contratos (md5 EOL-neutro)

Extração: da linha `^4\. \*\*Protocolo de dificuldade` até a linha anterior a `^   \*\*Por quê, medido`.

| arquivo | linhas do item 4 | linhas | md5 (blob, `git show`) | md5 (disco, `tr -d '\r'`) |
|---|---|---|---|---|
| `CLAUDE.md` | 412–438 | 27 | `3b6be147768e6b54aea34da046131296` | `3b6be147768e6b54aea34da046131296` |
| `AGENTS.md` | 440–466 | 27 | `3b6be147768e6b54aea34da046131296` | `3b6be147768e6b54aea34da046131296` |

`diff item4_CLAUDE item4_AGENTS` → **vazio (IDENTICOS)**. O parágrafo seguinte, **"Por quê, medido"**
(`CLAUDE.md:439–445` / `AGENTS.md:467–473`, **não tocado pelo PR**), também é idêntico nos dois:
md5 `ac5786e051578f2b5821b2e9840ac176` — ele importa no §3 (V-02).

### 0.4 CRLF fantasma — para o inspetor não ler mutação onde não há

`core.autocrlf=true`. Disco tem CR (`CLAUDE.md` 677 · `AGENTS.md` 726 · `decisoes.md` 2672), blob tem LF.
`md5sum` cru do disco **diverge** do blob (`4d26ffb1…` × `381b034d…`); `tr -d '\r' < arquivo | md5sum` **bate**
com `git show HEAD:arquivo | md5sum` nos três. `git diff HEAD --stat` → vazio; `status --porcelain` → vazio.
**Compare EOL-neutro** (inspetor 3.3, §C7.1-ter(c)).

### 0.5 Bateria já executada no head (forma: cwd `w-teto`, `ec` por variável)

- `git diff --check origin/main...HEAD` → **ec=0**.
- `node.exe scripts/sync-agent-agents.mjs --check` → `[agents-sync] OK — 23 agentes, espelho consistente.` **ec=0**.
- `.claude/agents/especialistas/` **não existe** no head nem na `origin/main` (`git ls-tree` → 0); existe só no
  ramo do #393 (5 corpos). Consequência no §10: os corpos das três cadeiras **nascem versionados no ramo do #394**.
- `w-teto` **não tem `node_modules`** → `npm run check` (inspetor 4.2) e os guards de KPI (§9) exigem `npm ci`
  **próprio** no worktree (sem junction — §C7.1-ter(c)).

### 0.6 Conflito conhecido com o #393 — medido

`git merge-tree --write-tree --name-only HEAD origin/chore/mandato-refs-e-preflight` → **ec=1**,
`CONFLICT (content): agent-orchestration/controle/decisoes.md` (os dois apensam a partir da l.2627).
**Só esse arquivo hoje.** Depois da E3 (KPI), `Kpis/kpis-latest.json`, `kpis-history.json`, `kpis-history.md`
e `app.js` **também** conflitam: o #393 já publica `blocks_completed = 168` (3 entradas `pr: 393`) e paga o
backfill do #392. Ordem decidida pelo orquestrador: **#394 mergeia primeiro; o #393 integra por merge** e
reconta (precedente C1-A3 do #392: "o número envelheceu"). Não é defeito do #394; o briefing avisa.

---

## §1 — Objetivo · ator · fluxo · contrato

- **Objetivo:** transcrever para o contrato de execução a decisão do dono de 2026-09-27 (cai o teto de dois
  ciclos; auditoria da orquestração e da junta se o ciclo 3 achar erro; continua-se), de forma que **a junta 3
  do #393 vote sob regra que a permita** — hoje a `main` diz "Reprovou no ciclo 2 → PARA. Não há ciclo 3."
- **Ator:** o orquestrador (dev/transcritor). **Consumidores:** todo agente que lê `CLAUDE.md`/`AGENTS.md`
  como norma; os gates (inspetor, porteiro); o Codex via `AGENTS.md` + `.agents/agents/README.md`.
- **Fluxo origem→destino:** palavras do dono (chat, 2026-09-27) → registro `D-SEM-TETO-AUDITORIA-NO-3` em
  `decisoes.md` (§A1.1) → §C7.4 item 4 do `CLAUDE.md` → espelho `AGENTS.md` (mesmo PR, §"Regra de espelhamento").
- **Contrato (o que a entrega tem de satisfazer):** (i) o texto operante diz **o que o dono decidiu — nem
  mais, nem menos**; onde o transcritor acrescentou, o acréscimo está **declarado como tal** ou a junta o
  aceita como derivação fiel; (ii) **nenhuma regra viva** remanescente contradiz a nova — em especial nenhum
  **gate** que corra antes da junta 3 do #393; (iii) o gatilho novo tem **mecanismo executável** ou as peças
  que faltam estão **nomeadas com dono**; (iv) espelho idêntico; (v) KPI por PR (§C3); (vi) registro do bloco.
- Sem rotas/payloads/códigos HTTP: bloco documental. Sem PD (§C7.3): não há dúvida técnica a pesquisar — há
  uma decisão do dono a transcrever; a **fidelidade** é o que se julga.

---

## §2 — As palavras do dono, e as elaborações do transcritor (para a junta julgar, uma a uma)

**Palavras cruas, como transmitidas pelo orquestrador no mandato deste plano (2026-09-27):**

> *"vamos remover a trava de dois ciclos, se rodar tres ciclos e encontrar mais erro, faremos uma auditoria na
> orquestração e na junta para gantir esta tudo normal e continuaremos. se esta encontrando erro esta tudo certo"*

**Proveniência, declarada:** essas palavras cruas **não existem em arquivo rastreado** — a única fonte é o
chat do dono com o orquestrador; o repositório só tem a versão **normalizada** (T-01). A junta **não consegue**
verificar a citação crua contra fonte primária; consegue medir a **distância** entre a crua (como transmitida)
e a transcrita, e julgar cada acréscimo. Decomposição da decisão em seis proposições do dono:

| # | o dono disse |
|---|---|
| W1 | remover a trava de **dois** ciclos |
| W2 | se rodar **três** ciclos e encontrar **mais erro** |
| W3 | faremos uma **auditoria na orquestração e na junta** |
| W4 | para garantir que **está tudo normal** |
| W5 | **e continuaremos** |
| W6 | se está encontrando erro, **está tudo certo** |

**Elaborações do transcritor** — tudo o que o texto do #394 diz **além** de W1–W6. Classes: `[interp]`
interpretação de palavra do dono · `[acrésc]` conteúdo novo · `[herança±]` regra anterior mantida **com
alteração** · `[arg]` argumento/racional posto na boca da decisão · `[não-verif]` afirmação que a junta não
consegue verificar · `[preserv]` preservação explícita (listada por completude). **Eu não julgo; enumero.**

| # | onde (head) | o que o transcritor escreveu | classe | contra o quê medir |
|---|---|---|---|---|
| T-01 | `decisoes.md` §"nas palavras dele" · `CLAUDE.md:429` | citação **normalizada** rotulada "nas palavras dele"/"literal": `gantir esta tudo normal` → `garantir que está tudo normal` (insere "que"); `tres`→`três`; `esta`→`está`; vírgula→ponto-e-vírgula; maiúscula | `[interp]` | W1–W6 crus. Corrigir ortografia sob o rótulo "nas palavras dele" é fidelidade? Inserir "que" muda sintaxe, não sentido — a junta diz |
| T-02 | `CLAUDE.md:413–414` "REVOGA … que já revogara o teto de 5 … **Não há mais teto por contagem de ciclos**" | de "remover a trava de **dois**" para "**nenhum** teto, nunca" (e não restaurar o de 5) | `[interp]` | W1+W2+W5: o dono removeu a de 2 e previu o ciclo 4; não disse "nunca parar" |
| T-03 | `CLAUDE.md:415` "Reprovação de junta NÃO para o bloco" | corolário geral de T-02 | `[interp]` | W5 cobre "após a auditoria"; o geral é derivação |
| T-04 | `CLAUDE.md:416` "identidade nova nas cadeiras que **votaram**" | o `D-TETO` dizia "na cadeira que **reprovou**" (`decisoes.md:1775`); o inspetor 3.1 diz "votante do ciclo anterior"; `J-B-O6R-02-ciclo4` aplicou "todos". O transcritor **resolveu uma divergência pré-existente contrato×gate sem registrá-la** (§A2) | `[herança±]` | `decisoes.md:1775` × inspetor 3.1 |
| T-05 | `CLAUDE.md:418–419` "Se o ciclo 3 também produzir achado **`bloqueia`**" | "encontrar mais erro" (W2) lido como **reprovação**; `ajuste`/`nota` não dispara | `[interp]` | W2 não distingue gravidade |
| T-06 | `CLAUDE.md:418–419` "**também**" · "**antes de abrir o ciclo 4** é **OBRIGATÓRIA**" | pressupõe 1, 2 **e** 3 reprovados; fixa momento e obrigatoriedade — que **nenhum gate executa** (§4 M-01) | `[interp]` | W2+W5 |
| T-07 | `CLAUDE.md:418` "auditoria da **MÁQUINA, não do bloco**" | exclusão explícita do bloco | `[acrésc]` | W3 não exclui nada |
| T-08 | `CLAUDE.md:420` "responde **por execução**" | método imposto | `[acrésc]` | W3/W4 não dizem como |
| T-09 | `CLAUDE.md:420–425` perguntas **(a)–(e)**; (a) "critério impossível de passar, premissa herdada, amostra do próprio autor, guarda que reconhece forma"; (d) "o **mandato do orquestrador passou no pré-voo**" | define o que "está tudo normal" significa. (a) é a lista de classes **dos achados do #393**; (d) cita um **pré-voo que só existe no #393** (`scripts/mandato-preflight.sh`, ausente no head e na `main`) — ver decisão em §4.1 | `[acrésc]` | W4 sem conteúdo |
| T-10 | `CLAUDE.md:425–426` "Conduz a auditoria uma identidade que **não votou, não planejou e não desenvolveu**" | quem conduz | `[acrésc]` | W3 diz "**faremos**" |
| T-11 | `CLAUDE.md:427–428` "**CONTINUA-SE** … máquina **defeituosa → conserta-se a máquina primeiro**" | o dono cobriu "está tudo normal → continuaremos" (W4+W5); o ramo "**não** está normal" é do transcritor (alternativa fiel possível: reportar ao dono) | `[acrésc]` | W4/W5 |
| T-12 | `CLAUDE.md:429–431` glosa: "Achado é a junta funcionando … máquina **fabricando** achados, ou **deixando de ver** os reais" | interpretação de W6; "deixando de ver" é preocupação que o dono não voicou | `[interp]`+`[acrésc]` | W6 |
| T-13 | `CLAUDE.md:432–435` "**Risco assumido** … melhor dirigido que uma contagem … O orquestrador **relata, a cada ciclo**, se a classe se repetiu sem informação nova" | dever **novo**, sem destinatário nem consequência; "melhor dirigido" é argumento | `[acrésc]`+`[arg]` | nenhuma W |
| T-14 | `CLAUDE.md:436` "`agente-fabrica` continua criando especialistas **por ciclo**" | herança sem o limite "dentro dos dois ciclos" | `[herança±]` | W1 remove o limite; "por ciclo" é do transcritor |
| T-15 | `CLAUDE.md:436–437` "§C7.5 … continuam valendo integralmente" | preservação | `[preserv]` | o dono não tocou nas paradas |
| T-16 | `decisoes.md` §"Por que a troca é uma melhora de desenho" | racional inteiro ("o teto pergunta se o orçamento acabou…"; "Foi o próprio `B-GOV-MANDATO` que mostrou…") escrito **pelo autor do #393** em nome da decisão | `[arg]` | o dono só articulou W6 |
| T-17 | `decisoes.md` §"Contexto medido que o dono **tinha na mão**" (2×1, 2×1, 0/51, 25/25+20/20, 87%/195) | afirmação sobre o **estado epistêmico do dono**; `195 pontos` e `0 de 51` só existem nessa entrada e no ramo do #393 | `[não-verif]` | nada prova o que o dono leu |
| T-18 | `decisoes.md` §"O que NÃO muda" (10 itens) | delimitação do alcance | `[acrésc]` | o dono não delimitou |
| T-19 | `decisoes.md` §"Blocos em voo … **retoma no ciclo 3**" | aplicação **retroativa** a bloco já PARADO (`J-B-GOV-MANDATO.md:84`: "o ciclo 2 é o último") | `[interp]` | contexto inferido; "retoma" não está nas W |
| T-20 | título `CLAUDE.md:412` "**NO CICLO 3**" × corpo `:419` "**antes de abrir o ciclo 4**" | durante o 3 ou entre 3 e 4? | consistência | W2 admite as duas |

**Total: 20 elaborações enumeradas** (T-15 é preservação, listada por completude). As que o orquestrador
**nomeou como suas** no mandato: T-09, T-10, T-11, T-13. As outras dezesseis **não estavam declaradas**.

---

## §3 — Regras vivas remanescentes que contradizem a nova (geradas da fonte, pela PROPRIEDADE)

**Critério, declarado.** *Regra viva* = texto que um ator **lê como norma no momento de agir**: os dois
contratos; os companheiros que o `CLAUDE.md` nomeia (`EXECUTION_MODEL.md` — "Detalhe completo, com exemplos";
`comando-template.md`); os corpos de agente nos dois espelhos e o protocolo de emulação `.agents/agents/README.md`
(nomeado na "Regra de espelhamento"); `PROTOCOLO-JUNTA-RESILIENTE.md` (§C7.7: "a fonte; em divergência, ela
vale"); skills; scripts/guards. *Registro histórico* = texto **datado que narra** evento ou decisão passada:
entradas anteriores de `decisoes.md` (append-only), atas `J-*`, `R-*`, votos, briefings, `status-geral.md`,
comandos de blocos passados, notas de KPI, planos encerrados, pendências. **Teste:** "se este texto sumisse,
algum ator agiria diferente hoje?" — sim = viva.

**Método — e a correção que ele sofreu.** A primeira varredura usou **quatro sementes** (`D-TETO-DOIS-CICLOS`,
"Não há ciclo 3", "dossiê ao dono", "teto de dois ciclos") — forma, não propriedade, e é **a classe do #393**.
A `agente-fabrica` (que **leu**, não executou; hipótese) apontou três linhas que as sementes não pegam. A
lista abaixo foi **regerada pela propriedade** — *qualquer regra que limite ou condicione o número de ciclos*
— com `grep -n -i 'ciclo'` em **todos** os arquivos de regra viva (contratos 29+29 linhas, `EXECUTION_MODEL`
9, `comando-template` 1, README 13, PROTOCOLO 3, os 23 corpos, skills 0) e leitura de cada linha. Origem de
cada uma por `git log -S`. Toda hipótese da fábrica foi **medida**; as três novas se confirmaram (V-03, V-05
l.122/126, V-09).

### 3.1 VIVAS e contraditórias — onze

| # | onde (head) | texto | origem | classe/escopo | efeito |
|---|---|---|---|---|---|
| V-01 | `CLAUDE.md:530–531` · `AGENTS.md:558–559` (§C7.7) | "…separação de papéis (§C7.4-bis) **e o teto de dois ciclos ficam intactos**." | `f895dd25` 2026-09-02 | **dentro-do-bloco** (mesmo arquivo/seção; o PR torna a frase falsa) | contrato afirma e nega o teto |
| V-02 | `CLAUDE.md:439–445` · `AGENTS.md:467–473` (cauda do item 4, "**Por quê, medido**") | "…precisa de **gente**, não de mais uma rodada. O dono passa a ser chamado … com **dois** conjuntos de achados na mesa, não cinco." | `a0a10750` 2026-08-29 | **dentro-do-bloco** (dentro do item reescrito) | item diz "continua-se" e a cauda justifica parar |
| V-03 | `CLAUDE.md:395` · `AGENTS.md:423` (§C7.1-bis, corpo do inspetor no contrato) | "insumos do briefing presentes (**parecer do crítico + PD nos ciclos ≥3**)" | `d2839039` 2026-08-30 | **dentro-do-bloco**: é o **contrato**, §C7, mesma seção; protocolo do teto de 5 **reativado** pela regra nova (sob o `D-TETO` não havia ciclo 3) | a `main` passa a exigir, no ciclo 3, um insumo que o §C7.4 novo não prescreve |
| V-04 | `.claude/agents/inspetor-de-terreno-da-junta.md:73–75` (+ espelho) item 2.2 | "**Se ciclo ≥ 3:** parecer do crítico (`R-*-ciclo<N>-premissa.md`) … PD ≥5 fontes … **BLOQUEADO (§C7.4)**" | `d2839039` 2026-08-30 | **pré-existente por data, dentro-do-bloco por efeito** (ver 3.3): executa V-03; citação **órfã** (§C7.4 novo não a contém) | **bloqueia a junta 3 do #393** — que tem parecer de crítico (2 rodadas) mas, segundo o orquestrador (**a re-verificar**), **não tem PD ≥5** |
| V-05 | `.agents/agents/README.md:59–63` (passo 5 da emulação Codex) e `:122,126` ("ciclos 1–2") | "teto de DOIS ciclos … reprovou no ciclo 2 → PARA e vira dossiê ao dono — **não há ciclo 3** … o ciclo 5 é a última tentativa" (n minúsculo: semente sensível a caixa não casa) | `90d30f8a` 2026-09-08 | **fronteira → entra**: lado Codex do espelho; o `sync` **preserva** o README (`KEEP`), ninguém o sincroniza | Codex opera sob o teto revogado |
| V-06 | `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md:6` | "(§C7.4-bis) e o teto de dois ciclos (`D-TETO-DOIS-CICLOS`)" | ~2026-08-29/09-02 | **fronteira → entra**: "a fonte" do §C7.7 por delegação; mesma frase de V-01 | normativo por delegação |
| V-07 | `.claude/agents/validador-mestre.md:100–101` (+ espelho `:106`) | "**Máximo 2 ciclos de reprovação por PR; na 3ª falha = CONDIÇÃO DE PARADA** da rodada (reportar ao humano)." | `bed17db3` **2026-07-08** | **pré-existente** (antecede o teto de 5; é uma segunda trava de 2, independente do `D-TETO`) | cadeira com veto manda parar na 3ª falha — **não** está na junta 3 do #393 |
| V-08 | `.claude/agents/critico-adversarial.md:3,6` (+ espelho) | "Nos **ciclos 4–5** do protocolo de reprovação (6 especialistas não resolveram): reabra a premissa … ≥5 fontes" | `21fdf516` 2026-07-10 | **pré-existente**, dormente sob o `D-TETO`, reativada com premissa que a regra nova não define | rodadas do crítico no #393 já esgotadas |
| V-09 | `.claude/agents/avaliador-mapas.md:17` (+ espelho) | "ciclo 3 reabre premissa com pesquisa ≥5" | ``56a6077b` 2026-07-13 (Ω-mapas)` | **pré-existente**, referência ao protocolo de 5 | fora de qualquer junta em curso |
| V-10 | `.claude/agents/agente-fabrica.md:8` (+ espelho `:15`) | "Especialistas do **ciclo 3** do protocolo de reprovação" | `21fdf516` 2026-07-10 | **pré-existente**, referência morta | baixa |
| V-11 | `EXECUTION_MODEL.md:270–278` | tabela do protocolo de **5 ciclos**: "**após 5 falho → parada + dossiê ao humano**" | `39eb46cc` 2026-07-28; último commit `7fada65e` 2026-08-15 — **não** tocado pelo `D-TETO` | **pré-existente** (um mês contradizendo o `D-TETO`); companheiro nomeado pelo `CLAUDE.md` | **três protocolos** vivos: 5 (aqui), 2 (V-01/V-05/V-07), nenhum (item 4) |

**Reclassificada para histórico:** `docs/CRONOGRAMA.md:106` ("Ciclo 5 é o teto do §C7.4 … não há ciclo 6",
`74430cc1` 2026-08-29) — registro **datado** sobre o `B-O6R-02`; vira viva só se alguém ler o cronograma como
norma. A junta pode reclassificar. Não contraditórias, para o controle de recall: `agente-secops.md:11`
("não passa por ciclo de reprovação"), `guardiao-fail-closed.md:9`, `inspetor-de-arnes-concorrente.md:9,84`
(narram a própria origem), `README.md:134,142,157` (adendos datados), `EXECUTION_MODEL.md:313,323` (exemplos).

### 3.2 Históricas — não são regra viva (listadas para a junta conferir o critério)

`decisoes.md:1775,1788,1814` (entradas `D-TETO-DOIS-CICLOS`/`D-JUNTA-RESILIENTE`, append-only, revogadas pela
nova) · `status-geral.md:4422` · `docs/revisoes/SAN3/PLANO_SAN3.md:616` · `docs/revisoes/SAN3/inventario/inventario-B2.md:35`
· `pendencias.md:7147` · `Kpis/kpis-latest.json` (nota do `B-GOV-ELENCO`) · `codex/comandos/B-O6R-02-ciclo5.md` ·
atas/R/votos/briefings, inclusive `J-B-GOV-MANDATO.md:84` no ramo do #393 ("Teto: `D-TETO-DOIS-CICLOS` — o
ciclo 2 é o último").

### 3.3 Decisão de ESCOPO — três classes, como o orquestrador pediu

**(a) ENTRA no #394 — V-01, V-02, V-03, V-04, V-05, V-06.** O escopo do head `3e92b2b8` está **incompleto**.
- V-01/V-02/V-03 são o **próprio contrato**, mesma §C7: `dentro-do-bloco` sem discussão (a contradição nasce
  **com** o PR ou é **reativada** por ele).
- **V-04 (inspetor 2.2) entra por EXCEÇÃO à regra "pré-existente → pendência"**, e a exceção fica escrita:
  (i) é a única remanescente com **efeito bloqueante concreto sobre a próxima junta** — a junta 3 do #393, que é
  **a razão de o #394 existir** (§1); deixá-la fora faz o PR falhar o próprio objetivo: legaliza o ciclo 3 no
  contrato e o gate segue proibindo-o na prática; (ii) o desempate interno do corpo (3.3: "cláusula inexistente
  = o item não se aplica") é **inferência num gate fail-closed** — não é mecanismo, é aposta; (iii) V-03 e V-04
  são **a mesma regra em dois lugares** (o contrato descreve o inspetor); consertar uma e não a outra é
  fabricar a divergência contrato×corpo que o inspetor 3.3 existe para pegar. **Alcance: SÓ o item 2.2** e o
  espelho `.agents/agents/`; nada mais no corpo.
- V-05 (README) e V-06 (PROTOCOLO): a **regra do espelho** ("alterou um, altera o outro no mesmo trabalho") e a
  delegação expressa do §C7.7 os trazem; são frases únicas, sem risco.

**(b) SAI com dono nomeado — V-07, V-08, V-09, V-10, V-11.** Pré-existentes por data (07-08 a 08-15), **sem
efeito na junta 3 do #393** (nenhuma dessas cadeiras está nela; as rodadas do crítico estão esgotadas), e
puxá-los espalharia a edição de gate por **quatro corpos e um companheiro** — a classe "remédio nasce com a
doença". Uma pendência única, `P-GOV-CICLOS-CORPOS-ORFAOS` (nome sugerido), com **dono** um bloco de
governança próprio, e a lista V-07…V-11 dentro dela.

**(c) Histórico — §3.2 + `CRONOGRAMA.md:106`**, pelo critério declarado acima.

---

## §4 — O gatilho de auditoria tem mecanismo? Parcial. Peças que faltam, nomeadas

**Definido no texto:** *quando* (ata do ciclo 3 com `bloqueia`; antes do ciclo 4); *o quê* (orquestração +
junta); *perguntas* (a)–(e); *método* (por execução); *quem conduz* (por exclusão); *desfecho sã* (ciclo 4
abre); *desfecho defeituosa* (conserta-se, depois ciclo 4).

**Não definido — dez peças:**

| # | peça ausente | por que importa |
|---|---|---|
| M-01 | **quem convoca** e **quem impede o ciclo 4 sem ela** | nenhum gate exige a auditoria; o inspetor não tem item "ciclo ≥4 → parecer de auditoria presente"; "OBRIGATÓRIA" (T-06) não é executável por máquina |
| M-02 | **corpo/papel do auditor** (não há `auditor-da-maquina` em `.claude/agents/`) e **modelo** | "identidade que não…" é exclusão, não designação |
| M-03 | **registro**: caminho do parecer, **forma do veredito**, **quórum** (1 identidade? junta?) | ciclos têm `R-*`; a auditoria não tem lugar |
| M-04 | "**conserta-se a máquina**": quem (§C7.4-bis: não o auditor), em que veículo, **quem atesta** "consertada" | sem isto é frase |
| M-05 | **recorrência**: só no ciclo 3? e no 6, 9…? | o único freio novo dispara uma vez |
| M-06 | relato por ciclo "classe repetida sem informação nova": **destinatário** e **consequência** | sinal sem efeito |
| M-07 | (d) "mandato passou no **pré-voo**" — `scripts/mandato-preflight.sh` só existe no #393 | contrato cita artefato ausente da `main` — **decidido em §4.1** |
| M-08 | interação com V-03/V-04 (ciclo ≥3 → crítico + PD) — **silêncio** | resolvido pela decisão (a) do §3.3 |
| M-09 | (b)/(c) duplicam o §C7.4-bis (a)(b)(c) — soma ou substitui? | duas respostas para a mesma pergunta |
| M-10 | dispara com "achado `bloqueia`" ou com **reprovação**? (`bloqueia` `pre-existente` não reprova, §C7.1-ter(a)) | ambiguidade no disparo |

**Veredito do plano:** o gatilho **não** tem mecanismo completo. Se as peças são do dono (não decididas) ou do
transcritor (legislou o que quis e calou o resto) é o que a C2 responde. Este plano **não desenha** o mecanismo
— com **uma exceção estreita, declarada abaixo** (§4.2), porque o §3.3(a) já obriga a tocar o item 2.2 do inspetor.

### 4.1 Decisão sobre a pergunta (d) — REESCREVER para não depender do #393

Alternativas: *(A)* reescrever (d) sem citar ferramenta; *(B)* declarar a ordem de merge como dependência.
**Decido (A).** Porque: (i) **(B) inverte a dependência** — o #394 é pré-requisito do #393, não o contrário;
(ii) durante a janela entre os merges (e para sempre, se o #393 mudar ou não mergear) o contrato citaria um
artefato que a `main` não tem — **norma citada tem de existir na ref** (inspetor 3.3); (iii) a propriedade que
(d) quer é "o mandato do orquestrador foi **conferido antes do voto**", que independe de qual ferramenta a
confere. **Propriedade para o dev:** (d) não nomeia arquivo/script ausente da árvore do head; quando o
pré-voo por máquina existir na `main`, ele **passa a ser** a forma de conferir — sem reescrever o contrato.
O texto é do dev; a C1 continua julgando T-09 como elaboração (a reescrita corrige a referência, não a apaga).

### 4.2 A peça mínima que torna "OBRIGATÓRIA" verdadeira — opção declarada, não imposta

Como o item 2.2 do inspetor **tem** de mudar (§3.3(a)), o dev tem duas saídas: *(i)* **apagar** 2.2 (mínimo);
*(ii)* substituí-lo por "**Se ciclo ≥ 4:** o parecer da auditoria da máquina (§C7.4 item 4) existe e está no
briefing; faltando = BLOQUEADO" — o que fecha **M-01** com o mecanismo que a casa já usa (gate fail-closed
antes da junta). *(ii)* é **mecanismo do transcritor, não palavra do dono**; se adotada, entra como tal na
entrada de `decisoes.md` e a C1 a julga como elaboração nova. **Este plano recomenda (ii) e não a impõe** —
é a menor peça que faz T-06 significar algo; o orquestrador decide e escreve na ata. Em qualquer das duas, a
**propriedade** que a C2 mede: V-03 (contrato) e 2.2 (corpo) **dizem a mesma coisa**, e o inspetor **continua
bloqueando** uma junta de ciclo ≥2 sem ata anterior (2.1), sem `R-*` ou sem plano (2.3) — a edição remove
**só** o insumo órfão.

---

## §5 — Entregas do bloco (o head `3e92b2b8` entrega só a E1)

- **E1 — o texto** (`CLAUDE.md` item 4, `AGENTS.md` espelho, `decisoes.md` registro). **Entregue.**
- **E2a — contrato consistente (§3.3(a), `dentro-do-bloco`):** V-01, V-02, V-03 nos **dois** contratos, e a
  reescrita de (d) (§4.1). O **conteúdo** das edições é do dev, à luz do voto — este plano dá a propriedade.
  **Não entregue.**
- **E2b — gate e espelhos (§3.3(a)):** V-04 (inspetor item 2.2 + `.agents/agents/`), V-05 (README passo 5 +
  l.122/126), V-06 (PROTOCOLO l.6). **Não entregue.**
- **E2c — pendência com dono (§3.3(b)):** `P-GOV-CICLOS-CORPOS-ORFAOS` em `pendencias.md` (índice **pelo
  gerador**, l.5 — nunca à mão) listando V-07…V-11 com bloco dono. **Não entregue.**
- **E3 — KPI (§C3):** §7. **Não entregue.**
- **E4 — registro:** este plano; `BRIEFING-B-GOV-SEM-TETO.md`; **3 corpos** das cadeiras versionados nos dois
  espelhos **antes** do inspetor; `J-B-GOV-SEM-TETO.md` (orquestrador, após o voto) com `- **Objeto julgado:**`
  e, se aprovado, `- **approved_head:**`; `votos/B-GOV-SEM-TETO/*`; parágrafo datado na entrada de `decisoes.md`
  registrando E2 (o que mudou além de E1, e por quê — §A2, nada em silêncio).

**Consequência declarada:** submeter `3e92b2b8` **como está** é submeter E1 sem E2/E3 — as cadeiras julgam a
lacuna com esta evidência. Emendar antes do inspetor muda o head; o §0 é re-medido por ele. **A escolha é do
orquestrador** e fica na ata. Dado que E2b é o que evita o bloqueio da junta 3 do #393, **o plano recomenda
emendar antes**: uma reprovação aqui custa um ciclo inteiro **sob o `D-TETO`**.

**Sob qual regra ESTE bloco é julgado:** a da `main` — `D-TETO-DOIS-CICLOS`. Duas reprovações = **para**,
sob a regra que tenta revogar.

---

## §6 — Escopo (§C4) — PERMITIDO e PROIBIDO, caminhos exatos

**PERMITIDO**
- `CLAUDE.md` — §C7.4 item 4 (E1 + (d)); §C7.1-bis l.395; cauda do item 4 l.439–445; §C7.7 l.530–531.
- `AGENTS.md` — espelho das mesmas quatro regiões (l.440–466, l.423, l.467–473, l.558–559), **mesmo commit**.
- `agent-orchestration/controle/decisoes.md` — entrada `D-SEM-TETO-AUDITORIA-NO-3` (append-only; emendas como
  parágrafo datado **dentro** da entrada).
- `.claude/agents/inspetor-de-terreno-da-junta.md` — **só o item 2.2** (l.73–75) — e o espelho
  `.agents/agents/inspetor-de-terreno-da-junta.md` (`sync-agent-agents.mjs` regenera; `--check` prova).
- `.agents/agents/README.md` l.59–63 e l.122,126 · `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` l.6.
- `agent-orchestration/controle/pendencias.md` (E2c; índice pelo gerador).
- `Kpis/kpis-latest.json` · `Kpis/kpis-history.json` · `Kpis/kpis-history.md` · `Kpis/app.js` (**só** via
  `node scripts/kpi-freeze.mjs`).
- `docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` · `agent-orchestration/omega/juntas/BRIEFING-B-GOV-SEM-TETO.md` ·
  `agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md` · `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/**`
  (únicos arquivos que uma cadeira escreve) · `agent-orchestration/docs/status-geral.md`.
- `.claude/agents/especialistas/<3 corpos>.md` + `.agents/agents/especialistas/<3 corpos>.md` (`git add -f`:
  o ignore global cobre os dois; o `sync` é recursivo).
- Opcional: `agent-orchestration/codex/comandos/B-GOV-SEM-TETO.md` (§C1; #387–#393 não criaram — pendência
  `P-O6R-B02-RULINGS-SEM-DESTINO`). Na ausência, **este plano é o comando do bloco**.

**PROIBIDO**
- `src/**` · `tests/**` · `prisma/**` · `migrations/**` · `frontend/**` · `mobile/**` · `.github/**` ·
  `infra/**` · `.env*` · lockfiles · `scripts/**` (inclusive **importar** `mandato-refs.sh`/`mandato-preflight.sh`
  do #393) · `docs/omega-pd.md` · `Kpis/index.html` · `Kpis/styles.css` · `Kpis/README.md` · `EXECUTION_MODEL.md`.
- **Qualquer linha do inspetor fora do item 2.2**; os corpos `validador-mestre`, `critico-adversarial`,
  `avaliador-mapas`, `agente-fabrica`, `porteiro-pos-merge`, `planejador-mestre` (V-07…V-10 → pendência).
- `J-*`/`R-*`/`BRIEFING-*`/votos de **outro** bloco (inclusive do #393).
- Texto novo no item 4 além do que o voto pedir e da reescrita de (d).

---

## §7 — Modelagem · baseline N · KPI

- **Modelagem:** não há (documental). Sem migration; rollback = revert do squash.
- **Baseline N de testes do bloco:** **N = 0** (sem código nem teste). Meta **M ≥ 2N = 0**, satisfeita por
  construção; o executável que existe são os guards de KPI (§9) e o `npm run check` do inspetor 4.2.
- **KPI — decisão: SIM, este bloco atualiza `Kpis/*` no próprio PR.** Regra e precedente:
  1. §C3.1: *todo PR que altere código, teste ou escopo* atualiza `Kpis/*`. O bloco tem **ID** e junta — é
     bloco, não nota; e este PR altera o **contrato que governa todos os blocos**.
  2. Precedente **executado**: `#392`/`B-SAN3-00` (registro, "sem código nem teste") publicou `blocks_completed
     166 → 167` com métricas **carregadas com nota** (§C3.3); `#391`/`B-SAN3-B1` e `#381`/`B-GOV-ELENCO-ENXUTO`
     idem; `#382` (docs-only) tocou `Kpis/*` (backfill). O único PR que **não** contou bloco foi `#386` — **plano
     sem ID de bloco**, e a nota do KPI o diz.
  3. Conteúdo: `blocks_completed` **167 → 168**, **recontado no pré-merge** a partir do valor que a `origin/main`
     publicar na hora (C1-A3: se o #393 mergear antes, é 169); `backend_tests`/`frontend_smoke_tests`/
     `flutter_tests` **carregados** com nota (§C3.3); `mvp_demo`/`mvp_vendavel` **intocados** (§C3.4); `pr: 394`,
     `merge_commit`/`approved_head` **`null` na autoria** (§C3.5); `Kpis/app.js` por `kpi-freeze.mjs`.
  4. **Backfill do #392** (última entrada da `main`: `pr null · merge_commit null · approved_head null`): pela
     regra do "bloco seguinte" (§C3.5), **o primeiro que mergear paga**. Se for o #394: `pr 392 ·
     merge_commit fc3363e38aabd77f54e6b53034128182f8000571` (gh) · `approved_head` = **objeto que a ata nomeia**
     (`J-B-SAN3-00.md:3` → `7822deaf9afabd076d1095eaf48a6dfb635e5401`), **nunca** o head do merge. A ata tem
     "Head que MERGEIA" distinto (l.7) — a C3 confere a leitura; **é o par já trocado duas vezes**
     (`REGISTRO-SAN3-00-APPROVED-HEAD-DUAS-VEZES`). O #393 paga o mesmo backfill no ramo dele → conflito em
     `Kpis/*` resolvido **pela `main`** quando ele integrar (§0.6).

---

## §8 — Arquivos tocados (E1 no head; E2/E3/E4 a entregar)

| arquivo | entrega | quem | prova |
|---|---|---|---|
| `CLAUDE.md` (l.412–438 · 395 · 439–445 · 530–531) | E1 · E2a | dev | md5 EOL-neutro × `AGENTS.md` |
| `AGENTS.md` (l.440–466 · 423 · 467–473 · 558–559) | E1 · E2a | dev | idem |
| `agent-orchestration/controle/decisoes.md` (l.2633+) | E1 · E4 | dev | `grep -c D-SEM-TETO-AUDITORIA-NO-3` ≥ 1; parágrafo datado de E2 |
| `.claude/agents/inspetor-de-terreno-da-junta.md` (l.73–75) + espelho | E2b | dev | diff **confinado** ao item 2.2; `sync --check` ec=0; V-03 = 2.2 |
| `.agents/agents/README.md` (l.59–63, 122, 126) · `PROTOCOLO-JUNTA-RESILIENTE.md` (l.6) | E2b | dev | grep negativo pela propriedade |
| `agent-orchestration/controle/pendencias.md` | E2c | dev | índice pelo gerador; 1 cabeçalho novo com V-07…V-11 |
| `Kpis/kpis-latest.json` · `kpis-history.json` · `kpis-history.md` · `app.js` | E3 | dev | §9 itens 9–11 |
| `docs/revisoes/SAN3/B-GOV-SEM-TETO-plano.md` · `omega/juntas/BRIEFING-B-GOV-SEM-TETO.md` | E4 | planejador (eu) | existem no ramo |
| `.claude/agents/especialistas/<c1,c2,c3>.md` + espelho | E4 | fábrica escreve, **orquestrador versiona** | `git ls-tree HEAD` os lista |
| `omega/juntas/J-B-GOV-SEM-TETO.md` · `votos/B-GOV-SEM-TETO/**` | E4 | orquestrador · cadeiras | ata com `Objeto julgado` |

---

## §9 — Bateria de validação (§9 do contrato), com a FORMA declarada

Cwd `C:/Users/AMP/w-teto`; `export MSYS_NO_PATHCONV=1`; `git.exe`/`node.exe` com `C:/…`; **ec por variável**
(`cmd > "$TEMP/x.txt" 2>&1; ec=$?`), nunca por pipe. `HEAD` = o head que a ata nomear.

1. `git.exe status --porcelain` → **vazio**. `git.exe rev-parse HEAD` = head da ata.
2. `git.exe diff --check origin/main...HEAD` → **ec=0** (hoje: 0).
3. `node.exe scripts/sync-agent-agents.mjs --check` → **ec=0**, "espelho consistente" (hoje: 23 agentes; com
   os 3 corpos a contagem sobe — publicar N).
4. **Espelho** (comando do §0.3): item 4 com md5 EOL-neutro igual nos dois e `diff` vazio (hoje `3b6be147…`);
   após E2a, mesma técnica para l.395/423, l.439–445/467–473 e l.531/559.
5. **Marcadores:** `grep -c 'D-SEM-TETO-AUDITORIA-NO-3' CLAUDE.md AGENTS.md agent-orchestration/controle/decisoes.md`
   ≥ 1 cada. **Negativo pela PROPRIEDADE (após E2), `-i`:** `grep -n -i -E 'teto de dois ciclos|não há ciclo 3|
   ciclos ≥3|ciclos? ≥ 3|ciclo ≥ 3|dossiê ao dono|última tentativa' CLAUDE.md AGENTS.md .agents/agents/README.md
   .claude/agents/inspetor-de-terreno-da-junta.md .agents/agents/inspetor-de-terreno-da-junta.md
   agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md` → **0 linhas** (hoje: **9** — V-01 ×2, V-03 ×2,
   V-04 ×2, V-05 ×2, V-06 ×1). E `grep -n 'mandato-preflight' CLAUDE.md AGENTS.md` → 0 (hoje 0; (d) diz "pré-voo").
6. **Edição de gate confinada:** `git diff origin/main...HEAD -- .claude/agents/inspetor-de-terreno-da-junta.md`
   toca **só** l.73–75 (hunks = 1); `grep -c 'BLOQUEADO' <corpo>` inalterado nos demais itens (hoje: contar e publicar).
7. **CRLF-neutro:** para cada arquivo tocado, `tr -d '\r' < f | md5sum` = `git show HEAD:f | md5sum`.
8. **Check-runs** (inspetor 4.3): `gh api repos/thiagodorgo/ERP_Techsolutios/commits/<head>/check-runs --jq
   '"\(.total_count) \([.check_runs[]|select(.conclusion!="success")]|length)"'` → `N 0`, N > 0 (hoje `14 0`).
9. **Baseline do inspetor 4.2:** `npm ci` **próprio** em `w-teto` (sem junction) → `npm run check` **ec=0**.
10. `node.exe --check Kpis/app.js` → ec=0 · `node.exe scripts/kpi-freeze.mjs --check` → **ec=0** ·
    `node.exe -e "require('./Kpis/kpis-latest.json');require('./Kpis/kpis-history.json')"` → ec=0.
11. Guards de KPI: `node.exe --test --import tsx tests/kpi-dashboard-charts.test.ts
    tests/kpi-dashboard-contraste.test.ts tests/kpi-achados-paridade.test.ts` → **pass/fail com N** (referência
    do #392, **a re-verificar**: 17/17 · 6/6 · 6/6).
12. Conflito (informativo): `git.exe merge-tree --write-tree --name-only HEAD origin/chore/mandato-refs-e-preflight`
    → `decisoes.md` (+ `Kpis/*` após E3). Só declara; não resolve aqui.
13. Antes do merge, **não antes do voto:** `gh pr view 394 --json isDraft -q .isDraft` → `false`.
14. Limpeza §C5: `node_modules` de `w-teto` fica; worktrees de jurado removidos por `git worktree remove
    --force`; **uma linha** no fechamento.

---

## §10 — Junta (§C7) — composição, quórum, papéis, isolamento, perda

- **Quórum: MAIORIA DE 3 — e por que continua adequado com a edição de gate (§3.3(a)).** §C7.1-ter(b) é
  **literal**: unanimidade de 3 quando o bloco toca **dinheiro, segurança, permissão ou perda de dado** —
  nenhum dos quatro (`git diff --name-only origin/main...HEAD -- src prisma frontend mobile .github` = **0**;
  controle positivo `-- CLAUDE.md` = 1). Precedente executado: o `B-GOV-ELENCO-ENXUTO` (#381) acrescentou o
  §C7.6-bis **com uma PARADA** e apagou 30 corpos de agente sob **maioria de 3**, por decisão do dono
  (`D-QUORUM-B-GOV-ELENCO`; "escalar quórum sem risco que o justifique é o que queima ciclos"). A edição aqui
  é **um item** (2.2) do inspetor, confinada por diff (§9.6), e **remove** uma exigência órfã em vez de criar
  poder novo. **Se o orquestrador discordar, sobe para unanimidade de 3 ANTES do inspetor** — quórum não muda
  em voo. Sem veto individual. **Sem `critico-adversarial`** (não é bloco de invariante).
- **Três cadeiras, identidades NOVAS da fábrica, corpos versionados nos dois espelhos ANTES do inspetor**
  (`.claude/agents/especialistas/` não existe no head — §0.5; o inspetor 3.3 confere md5 EOL-neutro). Nomes:
  `jurado-semteto-c1-fidelidade-transcricao` · `jurado-semteto-c2-consistencia-normativa` ·
  `jurado-semteto-c3-escopo-registro` — corpos **vistos no disco** de `w-teto` em 2026-09-28 10:14 (`.claude/agents/especialistas/`), **não versionados e sem espelho `.agents/`** no momento deste plano — só contam se estiverem no head (`git ls-tree <head>`), com md5 EOL-neutro declarado no voto.

| cadeira | competência | pergunta única |
|---|---|---|
| **C1 — fidelidade da transcrição** | texto × decisão do dono | cada T-01–T-20 (§2), **uma a uma**, mais o que E2 acrescentar ((d) reescrita; opção §4.2): derivação **fiel** de W1–W6, ou o transcritor legislou? `bloqueia` só onde a elaboração **muda o que o dono decidiu** |
| **C2 — consistência normativa** | espelho, regras vivas, gate, mecanismo | §0.3 reproduzido; V-01–V-11 **regeradas pela propriedade** (`grep -i 'ciclo'` em toda regra viva) e reclassificadas com `git log -S`; V-03 = 2.2 (mesma regra, mesmo sentido); **mutação**: com a edição, o inspetor ainda bloqueia sem ata anterior/`R-*`/plano? §4: as dez peças faltam mesmo? falta alguma? |
| **C3 — escopo, registro e terreno** | §C4, §C3, §C5, ata | diff = exatamente o §6 (por laço `git diff --name-only`, não amostra); edição de gate confinada (§9.6); E3 conforme §7 com N e forma; conflito §0.6 re-medido; corpos das cadeiras no head; `isDraft`; ata com `Objeto julgado`; pendência E2c pelo gerador |

- **Votam JUNTAS, nunca 2+1.** Cada cadeira **resolve o head por conta própria** (`git rev-parse` + `gh pr
  view`) e declara no voto o modelo e o md5 do corpo aplicado.
- **Inelegíveis, por nome (§C7.4-bis; inspetor 3.1/3.1-bis contra `OBITUARIO-IDENTIDADES.md` e as atas):** o
  **orquestrador** (autor do texto); **eu** (`planejador-mestre` deste bloco); a **`agente-fabrica`** (escreveu
  os corpos e a hipótese do §3); **todos os votantes do #393** — ciclo 1: `jurado-mandato-c1-prevoo-fail-closed`,
  `jurado-mandato-c2-pergunta-feita`, `jurado-mandato-c3-escopo-kpi-registro`; ciclo 2: `guardiao-fail-closed`
  (**agente permanente** — fora mesmo assim), `medidor-de-cobertura-do-artefato`,
  `jurado-mandato-c3b-fronteira-numero-registro`. **Inelegíveis por interesse (recomendação; o inspetor decide):**
  as cadeiras **designadas** para a junta 3 do #393 (`jurado-mandato-c1c-invariancia-de-forma`,
  `jurado-mandato-c2c-cobertura-por-mutacao`, `jurado-mandato-c3c-fronteira-numero-registro`) — votariam sob a
  regra que esta junta legaliza; os devs do #393 (`aa051e8cc3eb1c1a0`, `a4ed42a5e3a81bdd3`, Dev-T, Dev-S); o
  `planejador-mestre` do ciclo 3 do #393 (o plano dele **já se apoia** no #394).
- **Isolamento (inspetor 1.2), por escrito:** cadeiras **somente-leitura** — escrevem **apenas**
  `agent-orchestration/omega/juntas/votos/B-GOV-SEM-TETO/<cadeira>.md` e `<cadeira>-evidencia.md`. Leitura do
  head por `git show <head>:<caminho>` ou **worktree próprio e descartável** em caminho curto (`git worktree add
  --detach C:/Users/AMP/w-jur-<id> <head>`; remoção **só** por `git worktree remove --force`; **sem junction**).
  **Nenhuma cadeira precisa de banco**; **a base viva `erp-postgres` (5432) / `erp-redis` (6379) não é alvo de
  ninguém**; sem Docker. Guards de KPI (C3): `npm ci` **próprio**. Mutação para medir (C2 sobre o inspetor)
  **só em cópia fora do repo**, apagada ao fim.
- **Perda de jurado (inspetor 5.1; §C7.7 P1–P3):** queda por infra **relança a MESMA identidade**; voto perdido
  **nunca** conta como aprovação; **a junta não fecha com menos de 3 votos de mérito**; evidência incremental
  (P1); sem suplente.
- **Regra de voto:** `gravidade` (`bloqueia`/`ajuste`/`nota`) **e** `escopo` (`dentro-do-bloco`/`pre-existente`
  **com evidência de data ou origem**; sem evidência = `dentro-do-bloco`). **"Não consigo medir" = REPROVADO.**
  **Nenhuma cadeira propõe correção.** Afirmações deste plano, do briefing e da fábrica são **hipóteses**.
- **§C7.4-bis, por escrito (ciclo 1, preventivo):** (a) composição cobre a competência? **Sim** — fidelidade,
  norma+gate, escopo/registro; (b) quem achou consertou? **Não se aplica ainda**; se reprovar, o dev do ciclo 2
  é identidade nova e **não** o orquestrador; (c) dado podre? **Tudo medido em §0/§3 ou marcado não-verificável**
  (T-17; a citação crua; a afirmação "o #393 não tem PD ≥5" é do orquestrador — **a re-verificar**).

---

## §11 — Riscos e rollback

| risco | mitigação / rollback |
|---|---|
| A junta reprova E1 por elaboração (T-*) e o bloco entra em ciclo 2 **sob o `D-TETO`** — reprovar de novo = **para** | dev novo no ciclo 2; plano novo (Fable obrigatório); se parar, o #393 **fica ilegal** no ciclo 3 até decisão do dono — dizer isso ao dono cedo |
| E2b fica de fora e o inspetor da junta 3 do #393 **bloqueia** pelo 2.2 (V-04) | §3.3(a): entra no #394; se o orquestrador recusar, a decisão fica **escrita** (não improvisada no parecer do inspetor) |
| A edição do inspetor **enfraquece** outro item (classe "remédio nasce com a doença") | §9.6 (diff confinado a 1 hunk) + mutação da C2: sem ata anterior/`R-*`/plano o inspetor **ainda bloqueia** |
| A opção §4.2(ii) é lida como "palavra do dono" | entra em `decisoes.md` como **mecanismo do transcritor**; a C1 a julga |
| Colisão de KPI com o #393 (168 × 168; backfill do #392 pago duas vezes) | #394 primeiro; #393 integra por merge, mantém o valor da `main` e reconta (C1-A3) |
| Corpos das cadeiras não versionados → inspetor **BLOQUEADO** (2× em 2026-09-20) | `git add -f` nos dois espelhos + `sync --check` **antes** do inspetor |
| CRLF lido como mutação viva | §0.4: comandos EOL-neutros no briefing |
| `isDraft=true` esquecido → merge falha | §9.13, **depois** do voto |
| `mandato-refs.sh` ausente no head lido como defeito | §0.1: é do #393; cobrar aqui é reprovação por construção |
| Rollback | `git revert` do squash; só texto/KPI muda; a pendência E2c fica (é verdadeira com ou sem o PR) |

---

## §12 — A linha

O head `3e92b2b8` transcreve **seis proposições do dono** em **vinte elaborações** (quatro declaradas pelo
transcritor, dezesseis não); deixa **onze regras vivas** apontando para tetos revogados — **três no próprio
contrato** (uma delas, §C7.1-bis, é o gate que corre antes de toda junta e que **bloquearia a junta 3 do #393
no dia seguinte ao merge**), duas nos espelhos que o contrato manda tocar junto, seis pré-existentes por data
que viram pendência com dono; institui um gatilho com **dez peças sem mecanismo** e cita, na pergunta (d),
uma ferramenta que a `main` não tem; e **não traz KPI**, que o §C3 e quatro precedentes exigem. **Decisões
deste plano:** E2a/E2b entram no #394 (inclusive o item 2.2 do inspetor, por exceção escrita); V-07…V-11 saem
com dono; (d) é reescrita para não depender do #393; KPI sim; **maioria de 3** mantida com a justificativa
de §10 — e o dono do quórum é o orquestrador, antes do inspetor. Nada disso diz que o texto é ruim — diz **o
que a junta tem de medir** e o que o transcritor, parte interessada, não podia atestar sozinho.
