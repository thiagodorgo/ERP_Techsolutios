# SAN2-6 — plano das CORREÇÕES PÓS-VOTO (delta declarado da junta `J-SAN2-6`)

> **Papéis (§C7.4-bis, *quem acha não conserta*):** **acharam** as cadeiras C1, C2 e C3 da junta — que não
> propuseram correção, como manda a regra. **Planeja** o orquestrador (este arquivo). **Desenvolve** o
> `dev-san2-6-correcoes`, identidade nova, que **não julga a validade dos achados** — implementa este plano.
> **Head do voto:** `d90fbbb` · **Base:** `origin/main` = `e6a6461` · Junta: **APROVADO 3×0, zero
> `bloqueia`**.
>
> **Por que corrigir agora e não deferir:** nenhum achado bloqueia, então o merge está autorizado como está.
> Mas o **C2-A1 / C3-A1** é uma violação do **§C3.1** (*o PR atualiza `Kpis/*` no mesmo PR*) sobre **46,1%
> do próprio PR**, e o `Kpis/index.html` é o **artefato principal** (§C3.0 — é o que o dono abre). Mergear
> assim publicaria um painel que não sabe que o handoff do ciclo 5 existe. As correções são de texto, custam
> minutos, e o porteiro pós-merge as confere.

---

## Achado por achado: o que se corrige, o que só se registra

| # | Cadeira | Grav. | Escopo | Destino |
|---|---|---|---|---|
| **C2-A1 / C3-A1** | C2 e C3, **independentes** | **alta** | `dentro-do-bloco` | **CORRIGIR** — §1 e §2 |
| **C2-A2** | C2 | baixa | `dentro-do-bloco` | **CORRIGIR** — §3 |
| **C2-A3** | C2 | nota | `pre-existente` | **CORRIGIR** — §4 (barato e é risco para o Codex) |
| **C3-N3** | C3 | nota | `dentro-do-bloco` | **CORRIGIR** — §5 |
| **C3-N1** | C3 | nota | `pre-existente` (dono: SAN2-5) | **CORRIGIR o que é deste bloco** — §6 |
| **C1-A1** | C1 | nota | `dentro-do-bloco` | **ERRATA apensa**, não reescrita — §7 |
| **C1-A2 · C1-A3 · C2-A4 · C3-N2** | C1, C2, C3 | nota | vários | **SÓ REGISTRAR** na ata — §8 |

---

## §1 — `Kpis/kpis-history.json`, entrada **151**: apensar ao `description`

**O defeito, com os números das duas cadeiras (a C3 corrigiu a C2 em dois pontos; valem os da C3):**
o `Kpis/*` foi escrito **uma vez**, em `53e44d3` (2026-09-01 23:00:44), e **nunca mais tocado** — o head é
de 2026-09-02 00:42. A `description` inventaria **45,4%** do PR e omite **2.067 das 3.783 linhas
adicionadas (54,6%)**, das quais **1.745 (46,1%) eram DESCRITÍVEIS**.

**Correções da C3 sobre a contagem da C2, a preservar:** o parecer do porteiro
`votos/SAN2-5/00c-porteiro-pos-merge-367.md` entrou em `b324258`, **20h49 ANTES** do `Kpis/*` — não é
"entrou depois"; e a C2 **não contou** os 2 arquivos do inspetor (`00a-inspetor-evidencia.md`,
`00a-inspetor-parecer.md`), que entraram em `d90fbbb`.

**Texto a APENSAR ao fim do `description` da entrada 151** (append puro; não reescrever o que já está lá):

> O HANDOFF DO CICLO 5 — E A CORREÇÃO QUE A JUNTA EXIGIU DESTE PRÓPRIO REGISTRO. Achado **C2-A1** e
> **C3-A1** da junta `J-SAN2-6`, encontrado **por duas cadeiras independentes**, gravidade **alta**, escopo
> `dentro-do-bloco`, **nenhum bloqueia**. O conjunto `Kpis/*` foi escrito UMA vez, em `53e44d3`
> (2026-09-01 23:00:44), e **nunca mais tocado** — enquanto `2c1eee1` (+1.702) e `41e2316` (+43) traziam
> depois o maior artefato do PR. Resultado medido: esta `description` inventariava **45,4%** do PR e
> omitia **2.067 das 3.783 linhas adicionadas (54,6%)**, das quais **1.745 (46,1%) descritíveis**. É a
> **6ª materialização** da classe *"número medido cedo, publicado tarde"* — a mesma que este bloco declara
> ter fechado para a entrada 150 e **reabriu na 151**. Corrigido aqui, pós-voto, com o delta declarado na
> ata. **O QUE FALTAVA, e agora está inventariado: (a)**
> `agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md` — **1.301 linhas, NOVO, 34,4% do PR**: o comando
> que o **Codex** executa no ciclo-teto do `B-O6R-02`. 12 seções, checkpoints `CP-0`..`CP-FIM`, §3 é um
> **preflight que ABORTA** (a árvore principal do dono está em `demo/investidor`, 49 à frente/9 atrás da
> `main`, sem o obituário e com o `AGENTS.md` casando 1 de 4 marcadores de governança — um Codex lançado
> ali receberia contrato velho). §2 declara que a divisão *"Codex executa, Claude julga"* **SOBREPÕE** o
> protocolo de emulação de `.agents/agents/README.md`: a separação de papéis (§C7.4-bis) vira **física
> entre ferramentas**, porque o Codex emula papéis em sequência no mesmo contexto e isso seria contaminação
> por construção. §11 traz **11 armadilhas de máquina medidas**, entre elas a §11.11 (git concorrente),
> escrita nesta rodada e **re-medida pela cadeira C2**: `index.lock` e `FETCH_HEAD` são **por worktree** —
> o ponto real de disputa entre as duas ferramentas é o `git fetch`, que escreve `refs/remotes/origin/*` e
> `packed-refs` no *common-dir*. **(b)** `agent-orchestration/omega/planos/B-O6R-07-plano.md` — **444
> linhas, NOVO**: o bloco que o Claude Code ataca **em paralelo** ao ciclo 5 (SEC-002 P0, residuais do
> SEC-003, SEC-004 em 5 vias), fatiado em `07a`/`07b`. **(c)**
> `agent-orchestration/omega/juntas/BRIEFING-SAN2-6.md` (162 l.) e os artefatos desta junta. **AUTORIZAÇÃO,
> agora num controle durável e não só num insumo de junta:** ordem literal do dono, na mesma sessão — *"o
> proximo bloco mergea isso me passe o handoff do codex e seu prompt … planeje tambem um bloco para vc
> atacar"* — **fonte de verdade nº 1 (§A1), que vence o §5 de um plano**. Até esta correção ela existia
> **só** no §1 do `BRIEFING-SAN2-6.md`, que é insumo de junta e é ele próprio um dos arquivos fora da lista
> fechada do §5. **A CONSEQUÊNCIA ACEITA, que passa a valer:** escopo permitido de um plano **não é
> emendável por ordem verbal sem registro** — ordem do dono que amplie escopo de bloco em curso entra no
> Registro §A2 **e** neste `description`, no mesmo PR, antes do merge. **O QUE NÃO MUDA:** nenhum dos
> arquivos é código, teste ou migration — o diff de `src/`, `tests/`, `prisma/`, `scripts/`, `.github/`,
> `frontend/`, `mobile/` e `.claude/agents/` segue **VAZIO**, provado **por mutação** pela cadeira C2 (os
> quatro caminhos mutados e commitados em worktree descartável fazem a mesma medida sair `ec=1`
> nomeando-os; restaurados, volta a `ec=0`); as contagens de teste seguem **CARREGADAS §C3.3** e `mvp_*`
> **intocados**.

**Correção gêmea, no mesmo movimento:** o item **(4)** da seção *"O QUE ESTE BLOCO NAO FECHOU"* abre com
*"Nada do ciclo 5 em si"* e fecha com *"o SAN2-6 prepara o TABULEIRO documental; nao move nenhuma peca do
jogo"*. Os itens que ele **enumera** seguem verdadeiros (o `git diff` de `.github/` e `.claude/agents/`
é vazio), mas o título e o fecho leem como excluindo justamente o que o PR entrega. **Acrescentar ao item
(4), sem apagar o que está lá:** *"— **ressalva da junta (C3-A1):** os itens enumerados acima seguem
verdadeiros por medição, mas 'nada do ciclo 5' NÃO vale para o **comando de bloco** do ciclo 5, que ESTE PR
entrega (1.301 l.); o que o bloco não move são as **peças de execução** (S0, a linha do `ci.yml`, os corpos
`*-c5-*`, drills e censo), não o **tabuleiro documental**, que é exatamente o que ele monta."*

## §2 — `Kpis/kpis-latest.json`: espelhar em `release.summary`

O `release.summary` do `kpis-latest.json` espelha o `description` da entrada 151. **Apensar o MESMO texto
do §1** (incluindo a ressalva do item (4)), para os dois não divergirem. Depois:

```
node scripts/kpi-freeze.mjs            # reinjeta o bloco FROZEN em Kpis/app.js a partir do latest
node scripts/kpi-freeze.mjs --check    # tem de sair ec=0
```

**Atenção (medido pela C3):** o `FROZEN` do `app.js` é `JSON.stringify` do latest — mexer no
`release.summary` **muda o `app.js`**. Se o `--check` sair `ec≠0` depois do freeze, **pare e reporte**.

## §3 — C2-A2: o intervalo de linha do §4.1 do comando do Codex

`agent-orchestration/codex/comandos/B-O6R-02-ciclo5.md`, §4.1 (~l.235) manda ler
*"§C7.4 (protocolo de dificuldade + o teto, **l.388-397**)"*.

**Medido pela C2 no blob do head:** o §C7.4 vai de **l.380** (o cabeçalho *"4. **Protocolo de dificuldade —
TETO DE DOIS CICLOS…"*) a **l.405** (l.406 já é o §C7.4-bis). O intervalo citado **deixa de fora o cabeçalho
e o núcleo do teto** — l.386-387, *"Reprovou no ciclo 2 → PARA. Não há ciclo 3. Dossiê ao dono"* — e termina
numa linha em branco.

**Correção:** trocar `l.388-397` por **`l.380-405`**. **Confira o intervalo por medição própria no blob do
head antes de gravar** — não copie deste plano; é citação de contrato vivo, a mesma classe que a cadeira C2
do #367 já pegou duas vezes (`ACH-C2-01`/`C2-02`), e o leitor é o Codex numa tentativa única.

## §4 — C2-A3: o README do Codex omite `model:` do frontmatter portátil

`.agents/agents/README.md` l.7 descreve o frontmatter do espelho como *"(name + description)"*, omitindo
**`model:`**, que o `scripts/sync-agent-agents.mjs` **preserva por contrato** (`D-PLANEJADOR-MODELO-FABLE`;
o comentário do próprio script, l.44-52, diz que apagá-lo faria o espelho Codex perder a regra **em
silêncio**).

**Risco concreto:** um Codex que leia só o README pode concluir que o `model:` do `planejador-mestre` **não
vale** no espelho — e o `planejador-mestre` em Fable é **obrigatório** no passo em que o fluxo volta para
ele depois de correção de código, que é exatamente o que o ciclo 5 fará.

**Correção:** trocar `(name + description)` por **`(name + description + model, quando o papel o fixa)`**,
com meia linha dizendo que o `model:` é preservado por contrato. `.agents/agents/README.md` está em `KEEP`
no script (l.27) — **não é gerado**, edite-o direto. Rode `node scripts/sync-agent-agents.mjs --check`
depois: tem de seguir `ec=0`.

## §5 — C3-N3: uniformizar o marcador §C3.3 do `backend_tests`

Em `Kpis/kpis-latest.json`, `metrics.backend_tests.note` abre com *"Execucao real DESTE PR, com N=1 rodada
completa…"* — texto **herdado do #366**. O marcador `[SAN2-6: …]` no fim já o desarma, então **§C3.3 está
cumprido**; a falha é de **forma**: das quatro métricas, `backend_tests` é a **única** cujo marcador não
repete a frase literal que `frontend_smoke_tests`, `flutter_tests` e `backend_contract_tests_focused` usam
— e é justamente a métrica cuja abertura afirma execução em primeira pessoa.

**Correção:** acrescentar ao marcador `[SAN2-6: …]` do `backend_tests` a **mesma frase literal** usada nas
outras três (copie-a verbatim de uma delas). Espelhe em `kpis-history.json` se a nota existir lá também.

## §6 — C3-N1: o carimbo de `mvp_*` está dois blocos atrasado

As `note` de `mvp_demo` e `mvp_vendavel` terminam em `[SAN2-4b: INTOCADO — …]`. **Não é violação de §C3.4**
(que exige justificativa apenas **quando o valor muda**, e 99%/88% não mudaram), mas um leitor do
`kpis-latest.json` do head vê `version: "SAN2-6"` com carimbo dizendo `SAN2-4b`.

**Correção:** apensar o carimbo **deste** bloco — `[SAN2-6: INTOCADO — o bloco não move escopo de produto]`
— **sem apagar** o do `SAN2-4b`. **Não** invente o carimbo do SAN2-5: ele não foi posto, e forjá-lo seria
fabricar registro. **Registrar na ata** que o vão `SAN2-4b → SAN2-5` fica como **pendência com dono nomeado
(SAN2-5)**, escopo `pre-existente` com a evidência que a C3 mediu (a `note` da base `e6a6461` é
byte-idêntica à do head).

## §7 — C1-A1: errata APENSA ao diário do dev, nunca reescrita

A tabela do §3.4 do diário `votos/SAN2-6/dev-contratos-readme.md` **subdeclara** a edição 9a: diz `+5` para
a seção *"### Gates fail-closed"*, e o hunk real é **`+6 -0`** (as 5 linhas de conteúdo mais o separador em
branco). A soma das adições declaradas por edição dá **25**; o numstat real é **26**. As remoções (14)
batem. Duas âncoras são **off-by-one**: a edição 9a é declarada *"após a l.75"* e o hunk insere após a
**l.76** (linha em branco); a edição 8 é declarada *"após a l.38"* e insere após a **l.39**. **Nenhuma linha
pré-existente foi tocada** — os hunks continuam sendo inserção pura e o efeito semântico é nulo.

**Correção:** **NÃO edite os números da tabela do dev.** O diário é registro histórico de quem executou;
reescrevê-lo apagaria a evidência do erro. **Apense ao fim do arquivo** uma seção
`## ERRATA (pós-voto, achado C1-A1 da junta J-SAN2-6)` com: o que a cadeira mediu, o comando que ela usou, e
a frase de que a contabilidade do registro estava imprecisa **sem** que o conteúdo estivesse errado.
Assine como **orquestrador**, não como o dev.

## §8 — Só registrar na ata (não corrigir)

- **C1-A2** (nota) — a tabela de EOL do diário mede a **árvore de trabalho**, não o blob. Os blobs são LF
  puro dos dois lados (CR=0 em `e6a6461` e em `d90fbbb`), então **não existe delta de EOL possível dentro
  deste commit** — a prova de ausência de conversão é **mais forte** que a apresentada. Registrar para que
  uma passada futura não leia a tabela do diário como afirmação sobre o blob.
- **C1-A3** (nota, `pre-existente`, nascida em `39eb46c`, 2026-07-28, PR #303) — diffando o **§C7 inteiro**
  (167 l. cada), sobra **uma** linha divergente: o item 3 nomeia `agente-pesquisador-web` no `CLAUDE.md` e
  *"subagente pesquisador web"* no `AGENTS.md`. **Diferença de mecanismo**, explicitamente permitida pelo
  `D-INTEROP-CLAUDE-CODEX`; a regra é idêntica. **Não corrigir** — vira pendência nomeada, bloco dono: quem
  tocar o §C7.3 do espelho.
- **C2-A4** (nota, `pre-existente`) — tensão apenas literal entre o *"sempre válido"* do README e o §2.1 do
  comando; em contexto, *"sempre válido"* qualifica o **mecanismo**, e o comando mantém o contrato acima de
  si (l.5). Os dois invariantes do README sobrevivem.
- **C3-N2** (nota, `dentro-do-bloco`) — a `description` da entrada **150** **não é apenso puro**: há
  **reescrita in loco** a partir do char 3775 (a errata que ancora os números ao head). Declarada no próprio
  texto e rastreável, **não é defeito** — mas registre, para a próxima cadeira não herdar *"foi só apenso"*
  como fato: uma entrada **já mergeada** teve texto publicado **reescrito**, não só acrescido.

## §9 — Registro §A2 em `controle/pendencias.md`

Apensar ao **"Registro §A2 do bloco SAN2-6"** (que hoje traz seis divergências) a **sétima**, com o texto de
consequência do §1 (*"escopo permitido de um plano não é emendável por ordem verbal sem registro"*),
declarada **fechada aqui**. Abrir/registrar as pendências nomeadas de **C1-A3** e **C3-N1** com bloco dono.
Depois: **regenerar `pendencias-indice.md` PELO GERADOR** (`python
agent-orchestration/controle/gerar-indice-pendencias.py`), publicando o **placar antes/depois** — a C3 mediu
`242/233/192` (baldes A34 B81 C77) no head; qualquer número novo tem de ser o do gerador, **nunca digitado**.

## §10 — Bateria de verificação (ordem exata, publique o `ec` de cada uma)

```
node scripts/kpi-freeze.mjs                                        # reinjeta o FROZEN
node scripts/kpi-freeze.mjs --check                                # ec=0
node --check Kpis/app.js                                           # ec=0
node --test --import tsx tests/kpi-dashboard-charts.test.ts        # 16/16, 0 skip, ec=0
node scripts/sync-agent-agents.mjs --check                         # ec=0
npm run check                                                      # ec=0 (prova que nenhum codigo foi arrastado)
git diff --check                                                   # limpo
python agent-orchestration/controle/gerar-indice-pendencias.py     # indice regenerado; placar antes/depois
git diff --numstat                                                 # o delta cabe nos arquivos deste plano
```

**Prova de escopo, obrigatória e a última:**

```
git diff --name-only e6a6461...HEAD -- 'src/**' 'tests/**' 'scripts/**' 'prisma/**' \
  '.github/**' 'frontend/**' 'mobile/**' 'package-lock.json' '.claude/agents/**'
```
tem de sair **VAZIO**. `.agents/agents/README.md` é a **única** exceção autorizada fora de `Kpis/`,
`agent-orchestration/` e do comando — e só pela edição do §4.

## §11 — Armadilhas de máquina (medidas; ignorá-las fabrica defeito)

1. `grep -c $'\r'` **não conta CR** aqui — use `tr -cd '\r' | wc -c`.
2. `md5sum`/`git status` **mentem** sob `core.autocrlf=true` — meça eol-neutro ou sobre o blob.
3. **`sed -i` destrói o EOL** de `CLAUDE.md`/`AGENTS.md`/`README.md` mesmo sem casar nada — **proibido**
   nesses arquivos. Use a ferramenta `Edit`.
4. `git checkout -- <arq>` **re-materializa CRLF** sob `autocrlf=true` mesmo com blob LF (medido nesta
   rodada: 0 → 1.301 CR no comando do Codex).
5. **`git archive`+`tar` PROIBIDO** para medir conteúdo de commit.
6. **Heredoc com aspas quebra** neste shell — escreva arquivos com `Write`.
7. **JSON de KPI é grande**: edite com script Node (`JSON.parse` → mutar campo → `JSON.stringify` com o
   **mesmo formato de indentação** do arquivo) ou com `Edit` de âncora exata. **Confira que o JSON parseia
   e que a contagem de entradas segue 151** depois de cada edição.
8. `$!` não é o PID do Windows.

## §12 — O que este plano PROÍBE

- Tocar `src/`, `tests/`, `prisma/`, `scripts/`, `.github/`, `frontend/`, `mobile/`, `.claude/agents/`,
  lockfiles.
- Editar `CLAUDE.md` ou `AGENTS.md` (o bloco já os fixou; a junta já os julgou).
- **Reescrever** números do diário do dev (§7 manda **apensar** errata).
- Forjar o carimbo `SAN2-5` inexistente em `mvp_*` (§6).
- Alterar `mvp_demo`/`mvp_vendavel`, `blocks_completed` ou qualquer contagem de teste.
- Julgar a validade dos achados. Se algum lhe parecer errado, **reporte e pare** — não decida sozinho.
