# BRIEFING — junta do bloco `SAN2-1` (triagem e higiene das pendências)

**Head a julgar:** `6886892` · **branch** `chore/san2-1-triagem-pendencias` · **base** `origin/main` = `74430cc` (#360).
**Quórum:** **maioria de 3** (`D-JUNTA-ESCOPO-E-CALIBRACAO` §2 — o bloco **não** toca dinheiro, segurança,
permissão nem perda de dado; **diff de código vazio**). Sem `critico-adversarial`: não é bloco de invariante.
**Todo voto declara `escopo`** (`dentro-do-bloco` | `pre-existente`) além de `gravidade`. Escopo declarado sem
evidência de data ou origem vira `dentro-do-bloco`.

## 1. O que é e por que existe

Primeira fatia da rodada **Ω-SAN2**, cujo objetivo é **não levar dívida transversal para o ciclo 5** do
financeiro — que é o **teto do §C7.4** e não tem ciclo 6.

O problema, medido: o `pendencias.md` chegou a **226 cabeçalhos e mais de 3.500 linhas** e **perdeu o próprio
índice** — 97 entradas sem linha de `status:`, 131 sem severidade, 9 com dono. Foi nesse escuro que o status
de `P-O6R-B04` e `P-O6R-B05` ficou **trocado por 13 dias**. O #360 consertou a troca; este bloco conserta a
**causa**.

## 2. O que conferir, item a item, por execução

| # | Promessa | Como conferir |
|---|---|---|
| 1 | **Diff de código VAZIO** | `git diff 74430cc..6886892 --stat -- src prisma tests scripts frontend mobile .github <lockfiles>` tem de sair **vazio** |
| 2 | **Zero entradas sem status** | contar `## P-` × entradas com linha de status. Antes: 97 sem. Agora deve ser **0** |
| 3 | **O índice é GERADO, não digitado** | rodar `python agent-orchestration/controle/gerar-indice-pendencias.py` e conferir que o arquivo **não muda** (`git diff` vazio depois) |
| 4 | **Nada foi fechado por conta própria** | o diff só pode ter fechado **uma** entrada: `P-GOLIVE-SECRET-ROTATE`, e **por decisão do dono**. Qualquer outro fechamento novo é achado |
| 5 | **`DIFERIDO-LEVE` não é status** | nenhuma entrada pode ter `status: DIFERIDO-LEVE`. Diferida **continua ABERTA**; o marcador é `agendamento:` |
| 6 | **Lista nominal do balde C** | 81 marcadas. Amostre 5 e julgue se são mesmo cosméticas. **Se achar uma que não é, é achado** — foi o critério que o dono aprovou, e duas já saíram do balde por serem segurança disfarçada (`P-WOTS-FRONT-ACCESS`, `P-Ω4-3-INVOICE-LEASTPRIV`) |
| 7 | **A CRÍTICA fechada** | `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` existe em `decisoes.md`? O limite está escrito (dispensa é da **ação**, não da exposição; **caduca** se voltar a usar Google Maps)? A pendência aponta para a decisão? |
| 8 | **Backfill §C3.5 do #360** | entrada `pr: 360` do history com `merge_commit 74430cc` e `approved_head ee5ef03` |
| 9 | **Reconciliação** | `P-GOV-MAIN-SEM-PROTECAO` chegou à `main` **verbatim**, sem reescrita (§A2) |
| 10 | **Append-only** | `git diff` do `pendencias.md`: as linhas removidas (`-`) devem ser **quase nenhuma**. Remoção de registro histórico sem declaração é achado grave |
| 11 | **KPI honesto** | métricas **carregadas** com marcador §C3.3; `blocks_completed` **intocado em 152**; `mvp_*` intocados |
| 12 | **A limpeza de disco declarada bate** | `docs/limpeza-de-disco.md` afirma 21 → 26 GB. Confira `df -h /c` e diga se bate |

## 3. Bateria já executada (reexecutem o que quiserem)

`kpi-dashboard-charts` **16/16** · `kpi-achados-paridade` **6/6** · `kpi-freeze --check` em dia ·
`node --check Kpis/app.js` ec=0 · `git diff --check` limpo · os dois JSON parseiam. Node v20.19.5,
`npm ci` próprio no worktree (sem junction — `D-JUNTA-ESCOPO-E-CALIBRACAO` §3).

## 4. O que o bloco corrigiu **contra si mesmo**, e que a junta deve pesar

No meio do trabalho eu marquei **`status: DIFERIDO-LEVE`** em 34 entradas. Isso estava **errado** e teria
criado uma segunda mentira de registro — exatamente a classe que este bloco existe para exterminar: **uma
pendência diferida continua ABERTA**; diferir é agendamento, não fechamento. Corrigido para
`status: ABERTA · agendamento: DIFERIDO-LEVE`. **Julguem se a correção é suficiente ou se o placar ainda
induz a erro.**

## 5. O que NÃO julgar

O mérito dos blocos `B-O6R-*` (são roadmap, não dívida). O mérito da decisão do dono sobre a chave Google
Maps (é decisão do dono, §A1 — julguem apenas se o **registro** dela está correto e completo).

---

# EMENDA (2026-08-29) — ressalvas do inspetor de terreno, apensadas antes da junta (§A2)

Parecer: `votos/SAN2-1/00a-inspetor-terreno-passada2.md`. Veredito: **`LIBERADO COM RESSALVA`**.
Ele mediu por conta própria e confirmou: árvore limpa, **diff de código VAZIO** (o que sustenta o quórum de
maioria de 3), 9 arquivos todos dentro do permitido, sem junction, baseline `kpi-achados-paridade` **6/6**.

## R1 — o head a julgar é `29da9bd`, não `6886892`

O briefing acima nomeia `6886892`. O inspetor liberou `4e0df0f` e **provou a equivalência**
(`git diff 6886892..4e0df0f --name-status` = só o briefing). Depois disso entrou `29da9bd`, que acrescenta
**apenas** o registro da perda do inspetor anterior. **Julguem `29da9bd`.** A cadeia é
`6886892` (trabalho) → `4e0df0f` (briefing) → `29da9bd` (registro de perda) — os dois últimos são papelada
de junta, e o diff de produto é o mesmo. **Confiram isso, não acreditem.**

## R2 — plano de perda de jurado (o inspetor cobrou, e com razão)

**Hoje agentes caíram 5 vezes por infraestrutura**, incluindo o primeiro inspetor deste bloco. Regra desta
junta: **voto perdido não conta**; o suplente entra com **identidade nova** e **refaz o mandato inteiro** —
nada que o titular tenha começado é insumo, nem mesmo um parcial favorável. **A junta não fecha com menos de
3 votos**: dois votos não são maioria de três, são junta inválida.

## R3 — há um executável novo que o filtro de "diff de código vazio" NÃO enxerga

`agent-orchestration/controle/gerar-indice-pendencias.py` é **código**, ainda que viva em caminho documental.
O filtro do escopo mede `src/ prisma/ tests/ scripts/ frontend/ mobile/ .github/` — e não o alcança. **Isso
não muda o quórum** (não é código de produto, não roda em runtime, não entra em build nem em CI), mas a junta
tem de saber que existe em vez de descobrir depois. **A cadeira 1 deve lê-lo** e **a cadeira 2 deve
reexecutá-lo** para provar a idempotência que o §2.3 pede: rodar e conferir que o índice **não muda**.

## R4 — o S0 (espelho Codex) NÃO foi verificado nesta inspeção

Por ordem do orquestrador, `sync-agent-agents.mjs --check` não foi rodado: ele dá **falso-vermelho universal
em checkout fresco no Windows** (bug de CRLF), já registrado com dono em `P-REG-S0-GUARD-FALSO-VERMELHO`, e o
conserto é o **próximo bloco** (SAN2-2). Fica declarado como **não coberto**: a consistência do espelho não
foi medida aqui. Se algum jurado rodar o `--check` e vir vermelho, **não é achado deste bloco**.

## Cadeiras homologadas pelo inspetor

1. **diff/escopo e append-only** — diff de código vazio por medição própria; `pendencias.md` não pode ter
   perdido registro histórico (olhar as linhas `-`); ler o `gerar-indice-pendencias.py` (R3).
2. **triagem e regra de classificação** — julgar a regra `status: ABERTA · agendamento: DIFERIDO-LEVE`;
   **amostrar o balde C** e dizer se alguma das 81 não é cosmética; conferir o registro da
   `D-GOLIVE-MAPS-ROTACAO-DISPENSADA` (limite e caducidade escritos); **reexecutar o gerador** (R3).
3. **KPI/registro** — reexecutar os dois guards; backfill §C3.5 do #360 (`74430cc`/`ee5ef03`);
   `blocks_completed` intocado em **152**; embutido do `app.js` sem divergir dos JSON.

**Inelegível:** o orquestrador — escreveu o diff **e** o briefing (o §4 está em primeira pessoa). Não vota.

---

# EMENDA 2 (2026-08-29) — CICLO 2, e ele é o ÚLTIMO

## Regra nova do dono, em vigor a partir de agora

`D-TETO-DOIS-CICLOS` (`decisoes.md`, e já refletida no `CLAUDE.md` §C7.4 e no `AGENTS.md`): **o teto do
protocolo de dificuldade caiu de 5 ciclos para 2.** Consequência direta para você:

> **Este bloco está no ciclo 2. Se você reprovar, o bloco PARA e vira dossiê ao dono. Não existe ciclo 3.**

Isso **não é** motivo para aprovar por complacência — é o contrário. Um `bloqueia` seu agora significa que o
dono é chamado com dois conjuntos de achados na mesa, que é exatamente o que a regra quer. **Vote pelo que
mediu.** Se estiver bom, aprove; se não estiver, reprove e o dono decide.

## O que aconteceu no ciclo 1

A cadeira de triagem anterior **REPROVOU** com um `bloqueia` e mais 5 achados. Relatório em
`omega/reprovacoes/R-SAN2-1-ciclo1.md`, voto verbatim em `votos/SAN2-1/02-*.json`.

**A causa-raiz, medida em bancada depois do voto:** o classificador decidia "fechada" por substring no
cabeçalho, e isso confundia **duas** coisas — *vocabulário de domínio com vocabulário de status* (*"período
**fechado**"* fechou uma pendência) e *resolução parcial com resolução* (*"RESOLVIDO **PARCIAL**"* fechou uma
entrada que lista **quatro residuais abertos** sem cabeçalho próprio).

## O que você deve verificar — as 6 correções

| Achado do ciclo 1 | O que foi feito | Como conferir |
|---|---|---|
| **A-1** `bloqueia` — `P-Ω3F6` fechada carregando 4 residuais abertos | **REABERTA** | a entrada está `ABERTA`? a causa-raiz está escrita nela? |
| **A-2** — `P-Ω4-7-CLEAR-RETRO` fechada sem se declarar resolvida | **REABERTA** | idem |
| **A-3** — 11 notas diziam "Marcada ABERTA" sob `status: FECHADA` | nota trocada por transcrição | conte quantas ainda têm a nota **afirmando** (deve ser 0) |
| **A-4** — "zero sem status" media com régua mais estrita que o "97 antes" | régua declarada, par remedido | meça os **dois lados com a MESMA régua** |
| **A-5** — 2 diferidas não-cosméticas no balde C | movidas para o balde **A** | confira onde estão no índice |
| **A-6** — regra frágil (substring, agendamento vence severidade, cabeçalho conta como pendência) | classificador endurecido | leia o script |

## O que o classificador passou a fazer — julgue se basta

1. **Só a linha de status decide.** O cabeçalho **nunca** fecha; ele só **denuncia** contradição.
2. **Qualificador de parcialidade nunca fecha** (PARCIAL/PARCIALMENTE/RESIDUAL).
3. **Ausência de linha vira `SEM-STATUS`** — estado visível, não palpite.
4. **Contradição vira `CONTRADITÓRIA`** e exige decisão humana **por data** — regex não compara datas, e foi
   chutar isso que reprovou o ciclo 1.
5. **Marcador de agendamento tem de ser ATIVO** — a forma riscada `~~DIFERIDO-LEVE~~` deixou de remarcar.
   *(Este defeito eu **reintroduzi ao corrigir** o A-5, e ele está declarado.)*
6. **Severidade material sinaliza** quem está no balde C.
7. O placar declara que conta **228 cabeçalhos para 220 IDs**.

## Limitação que o bloco declara contra si

O sinalizador automático de "diferida material" lê a palavra de severidade no texto e **não pegou** as duas
que o jurado do ciclo 1 achou **lendo** — elas estavam rotuladas BAIXA. **O sinal automático é mais fraco que
a leitura.** Por isso a amostragem humana do balde C continua sendo a rede. **Amostre você também.**

## Também entrou neste head: a mudança de contrato

`CLAUDE.md` e `AGENTS.md` mudaram para registrar o `D-TETO-DOIS-CICLOS`. É **decisão do dono** (§A1, topo da
hierarquia) — **não julgue o mérito dela**. Julgue apenas se o **registro** está correto: os dois contratos
espelhados dizem a mesma coisa? o teto de 5 sumiu dos dois? a decisão está em `decisoes.md`?

**Head a julgar:** ver o disparo. **Quórum:** maioria de 3.
