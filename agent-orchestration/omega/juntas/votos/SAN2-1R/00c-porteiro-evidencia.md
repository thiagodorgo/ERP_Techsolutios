# Evidência do porteiro pós-merge — PR #362 (SAN2-1R)

- **Agente:** `porteiro-pos-merge` (sucessor — o anterior caiu sem escrever nada; medição do zero).
- **R-modelo:** rodando em `general-purpose` pela exceção contratual de indisponibilidade de modelo (nota em `J-SAN2-1R.md`).
- **Data:** 2026-08-30 (relógio da máquina: 2026-08-29 ao início da medição).
- **Worktree:** `.claude/worktrees/san2-r`, na `main`.
- Cada entrada abaixo foi escrita imediatamente após a medição (uma entrada por comando).

## 0. Terreno

```
$ git log -1 --format='%H %d %s'
87f6ae615c07872c820b3a0dda771a6b48fb4d0d  (HEAD -> main, origin/main, origin/HEAD) docs(resgate): o que as juntas verificaram entra; a etiqueta que mentia sai (SAN2-1R) (#362)
$ git status --short
?? agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas-pos-merge.md
```
**HEAD = merge squash `87f6ae6` na `main` = OK.** Único untracked: o registro de quedas dos porteiros anteriores (não é mutação de entrega).

## 1. Promessa × diff real

### 1a. Diff de código (deve ser VAZIO)

```
$ git diff a0a1075..87f6ae6 --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(saída vazia; exit 0)
```
**VAZIO = OK.** O PR #362 não tocou código, testes, scripts, CI nem lockfile.

### 1b. Etiqueta nova nas 79 / antiga só em citação

```
$ grep -c "adiada por triagem autom" agent-orchestration/controle/pendencias.md
79
$ grep -rc "adiada por triagem autom" agent-orchestration/ CLAUDE.md AGENTS.md | grep -v ":0$"
pendencias.md:79 · decisoes.md:1 · BRIEFING-SAN2-1R.md:1 · votos/SAN2-1R/{01,02,03}-*:5 · DOSSIE-SAN2-1-parada.md:1
$ grep -rn "sem consequ.ncia de produto, dado, seguran.a ou n.mero" agent-orchestration/ CLAUDE.md AGENTS.md docs/ | cut -d: -f1 | sort | uniq -c
      2 agent-orchestration/omega/juntas/votos/SAN2-1/04-jurado-triagem-ciclo2.json
      1 agent-orchestration/omega/juntas/votos/SAN2-1R/03-kpi-evidencia.md
$ grep -n "sem consequ...ou n.mero" agent-orchestration/controle/pendencias.md
(vazio)
```
**OK.** Etiqueta nova ("adiada por triagem automática; NÃO verificada item a item") em **exatamente 79** entradas de `pendencias.md`. Etiqueta antiga ("sem consequência de produto, dado, segurança ou número") **zerada em `pendencias.md`**; sobrevive só como **citação do defeito** em 2 artefatos de voto (jurado do ciclo 2 do SAN2-1 e evidência de KPI do SAN2-1R) — exatamente o esperado.

### 1c. D-SAN2-OPCAO-C em `decisoes.md`

```
$ grep -n "D-SAN2-OPCAO-C" agent-orchestration/controle/decisoes.md
1847:## D-SAN2-OPCAO-C (decisão do dono, 2026-08-29) — o destino do SAN2-1: salvar agora, ler depois
```
**OK.** Entrada completa: opção C com os 5 itens (merge do verificado; troca da etiqueta pela frase verdadeira; P-036 duplicata; tripwire de tarifa fora do balde C; leitura das 79 adiada via P-SAN2-LEITURA-DAS-79). Registrada por exigência do R2 do inspetor de terreno.

---

# SUCESSOR 2 — retomada (o sucessor 1 caiu por `rate_limit` após o item 1c)

- **Agente:** `porteiro-pos-merge` (segundo sucessor), `general-purpose` pela exceção contratual de modelo.
- **Regra aplicada:** P3 do `PROTOCOLO-JUNTA-RESILIENTE.md` — **re-executar o roteiro registrado** (barato) e
  continuar de onde parou; não redescobrir.

## 0-bis. Re-execução do terreno (PASSO 0)

```
$ git log -1 --format='%H %d %s'
87f6ae615c07872c820b3a0dda771a6b48fb4d0d  (HEAD -> main, origin/main, origin/HEAD) docs(resgate): o que as juntas verificaram entra; a etiqueta que mentia sai (SAN2-1R) (#362)
$ git diff a0a1075..87f6ae6 --stat -- src prisma tests scripts frontend mobile .github package-lock.json
(saída vazia; exit 0)
$ git status --short
?? agent-orchestration/omega/juntas/votos/SAN2-1R/00-quedas-pos-merge.md
?? agent-orchestration/omega/juntas/votos/SAN2-1R/00c-porteiro-evidencia.md
```
**CONFIRMA o registrado pelo sucessor 1**, sem divergência. HEAD da `main` = `87f6ae6` (merge squash do #362);
diff de código base→head **VAZIO**; único untracked novo é este próprio arquivo de evidência.

## 1b-bis. Etiqueta nova × etiqueta antiga (re-execução + inspeção do contexto)

```
$ grep -c "adiada por triagem autom" agent-orchestration/controle/pendencias.md
79
$ grep -c "sem consequ.ncia de produto, dado, seguran.a ou n.mero" agent-orchestration/controle/pendencias.md
0
$ grep -rn "sem consequ.ncia de produto, dado, seguran.a ou n.mero" agent-orchestration/ CLAUDE.md AGENTS.md docs/ | cut -d: -f1 | sort | uniq -c
      2 agent-orchestration/omega/juntas/votos/SAN2-1/04-jurado-triagem-ciclo2.json
      1 agent-orchestration/omega/juntas/votos/SAN2-1R/00c-porteiro-evidencia.md   <- este arquivo (untracked)
      1 agent-orchestration/omega/juntas/votos/SAN2-1R/03-kpi-evidencia.md
```
**CONFIRMA o sucessor 1.** Fui além dele e **li o contexto dos 2 arquivos rastreados** para provar que são
*citação do defeito* e não etiqueta viva:
- `04-jurado-triagem-ciclo2.json` — é o **voto que reprovou** o ciclo 2 do SAN2-1; a frase aparece dentro de
  `justificativa`, `titulo`, `evidencia_executada` e `motivo`, sempre entre aspas, acusando o carimbo.
- `03-kpi-evidencia.md` (linha 71) — "A velha etiqueta mentirosa (…): **0 ocorrências** em `pendencias.md`".
**Veredito do item:** a alegação do bloco (2 arquivos, só citação) **bate**. Nenhuma pendência viva carrega a
etiqueta que mentia.

## 1c. `P-036` — status FECHADA e menção à duplicata

```
$ grep -n "P-036" agent-orchestration/controle/pendencias.md
425:## P-036 (PRÉ-EXISTENTE — descoberto no smoke do Ω3-c) — create de checklist quebrado no live/prisma
4062:A-C1/A-C2 do ciclo 2: `P-036`, `P-Ω3F3B-UPDATE-VALIDA4` — todas já retiradas/fechadas individualmente).
$ sed -n '425,439p' agent-orchestration/controle/pendencias.md
... - **status:** FECHADA · **severidade:** era ALTA · **dono:** encerrado
    <sub>**FECHADA em 2026-08-29 (resgate da opção C) como DUPLICATA da `P-CHK-TEMPLATE-PRISMA-V7`,
    resolvida em 2026-08-02.** ... o fix vive em `src/modules/checklists/checklist-prisma.repository.ts`
    com o comentário "NÃO passar tenant_id aqui". O texto original segue abaixo (§A2).</sub>
```
**OK.** `status: FECHADA` (era `ABERTA · DIFERIDO-LEVE · severidade: a classificar`), severidade retroagida a
`era ALTA`, dono `encerrado`, e a palavra **DUPLICATA** com o ID da gêmea. O texto original preservado (§A2 —
não some em silêncio).

**Não me contentei com a alegação — conferi a duplicata na fonte:**
```
$ grep -n "P-CHK-TEMPLATE-PRISMA-V7" agent-orchestration/controle/pendencias.md
1675:## P-CHK-TEMPLATE-PRISMA-V7 (2026-08-01) — createTemplate falha no runtime do Prisma v7
      (bug REAL de produção) — **RESOLVIDO (2026-08-02)**
$ grep -n -A14 "async createTemplate" src/modules/checklists/checklist-prisma.repository.ts
129:  async createTemplate(data: CreateTemplateData): Promise<ChecklistTemplate> {
130-    const record = await this.client.checklistTemplate.create({
141-        components: {
142-          // P-CHK-TEMPLATE-PRISMA-V7 — NÃO passar `tenant_id` aqui: é relation-scalar COMPARTILHADO ...
144-          // O Prisma v7 rejeita o argumento explícito ("Unknown argument tenant_id") e o infere do template pai.
```
**A duplicata é REAL, não alegada:** mesma chamada (`checklistTemplate.create`), mesma mensagem de erro
("Unknown argument tenant_id"), mesmo arquivo, e o fix está **vivo no código** com o comentário nomeando a
gêmea. Fechar a P-036 como duplicata é correto — não é fechamento por conveniência.

## 1d. `P-SAN2-LEITURA-DAS-79` — entrada própria e dono

```
$ grep -rn "P-SAN2-LEITURA-DAS-79" agent-orchestration/controle/ | cut -d: -f1 | sort | uniq -c
      1 decisoes.md · 1 pendencias-indice.md · 80 pendencias.md
$ grep -n "^## P-SAN2-LEITURA-DAS-79" agent-orchestration/controle/pendencias.md
4050:## P-SAN2-LEITURA-DAS-79 (2026-08-29) — MÉDIA · **Dono:** bloco próprio, DEPOIS do ciclo 5 do financeiro
$ grep -n "P-SAN2-LEITURA-DAS-79" agent-orchestration/controle/pendencias-indice.md
93:| `P-SAN2-LEITURA-DAS-79` | 4050 | MÉDIA | sim | ... |
```
**OK.** Entrada própria (linha 4050) com `status: ABERTA · severidade: MÉDIA · dono: bloco próprio`,
**indexada** em `pendencias-indice.md` (balde A, com linha e severidade), e citada em `decisoes.md`. As
outras 79 ocorrências em `pendencias.md` são o ponteiro dentro de cada etiqueta ("a leitura real é a
P-SAN2-LEITURA-DAS-79") — **79 etiquetas + 1 entrada = 80**, e o número fecha com o item 1b.

O corpo carrega o que importa para o bloco futuro **não nascer cego**: as **79** a ler uma a uma; a taxa
medida de contaminação (**4 materiais em 11 lidas ≈ 40%**, com os 4 IDs nominais); a extrapolação
(~25–30 materiais escondidos) que justifica MÉDIA e não BAIXA; e o **critério de fechamento** (veredito
individual + evidência, materiais promovidos, índice regenerado, etiqueta de triagem removida). O
compromisso da opção C **não evaporou** — é a diferença entre adiar e descartar.

### Achado menor 1d-α (NOTA, não bloqueia)
O título e o campo dono dizem **"DEPOIS do ciclo 5 do financeiro"** e o corpo justifica com *"não pode ficar
no caminho crítico do teto do §C7.4"*. Mas o `D-TETO-DOIS-CICLOS` (2026-08-29) **revogou o teto de 5** e o
fixou em **2** — o §C7.4 do `CLAUDE.md` já está reescrito. A referência não fica órfã na prática (o
`B-O6R-02` **já está** no ciclo 5, aberto antes da revogação, então o marco existe), mas é uma âncora a uma
regra revogada. Registro como nota para o bloco dono reancorar ("depois do desfecho do `B-O6R-02`"), não
como defeito de entrega — nenhum número nem decisão depende disso.

---

# SUCESSOR 3 — retomada (o sucessor 2 caiu por `connection lost` após o item 1d)

- **Agente:** `porteiro-pos-merge` (terceiro sucessor), `general-purpose` pela exceção contratual de modelo.
- **Regra aplicada:** P3 do `PROTOCOLO-JUNTA-RESILIENTE.md` — re-executo **barato** o terreno registrado e
  **continuo de 1e**; não redescubro o que já está medido e escrito acima.

## 0-ter. Re-execução barata do terreno

```
$ git log -1 --format='%H %d %s'
87f6ae615c07872c820b3a0dda771a6b48fb4d0d  (HEAD -> main, origin/main, origin/HEAD) docs(resgate): o que as juntas verificaram entra; a etiqueta que mentia sai (SAN2-1R) (#362)
```
**CONFIRMA** os sucessores 1 e 2: HEAD da `main` = `87f6ae6` (merge squash do #362). Sem divergência.

## 1e. `D-SAN2-OPCAO-C` em `decisoes.md` — existe E descreve a opção C

```
$ grep -n "D-SAN2-OPCAO-C" agent-orchestration/controle/decisoes.md
1847:## D-SAN2-OPCAO-C (decisão do dono, 2026-08-29) — o destino do SAN2-1: salvar agora, ler depois
$ sed -n '1847,1900p' agent-orchestration/controle/decisoes.md
(entrada completa lida — 4 parágrafos)
```
**OK — e o conteúdo bate item a item**, não é só o cabeçalho:
- **Contexto** nomeia a origem: `SAN2-1` reprovado nos ciclos 1 e 2, **PARADO** pelo `D-TETO-DOIS-CICLOS`
  (primeiro bloco a acionar a regra), dossiê com 4 opções.
- **A decisão** enumera os **5 itens da opção C**: (1) mergear o que as duas juntas verificaram (índice
  idempotente, 97→0 sem status, CRÍTICA falsa fechada, backfill, reconciliação, limpeza de disco);
  (2) trocar a etiqueta das 79 pela frase verdadeira; (3) `P-036` como duplicata da
  `P-CHK-TEMPLATE-PRISMA-V7`; (4) tripwire de tarifa fora do balde C; (5) **adiar — não descartar** — a
  leitura das 79 em `P-SAN2-LEITURA-DAS-79`.
- **Execução** declara `SAN2-1R` como **bloco novo executando decisão do dono**, explicitamente *não* ciclo 3
  ("não existe ciclo 3 sob o teto") — coerente com o §C7.4 vigente.
- **Por que existe** cita a exigência do R2 do inspetor de terreno e ancora no §A1.1.

**Cruzamento com os itens anteriores:** os 5 itens da decisão são exatamente os que os itens 1b (etiqueta),
1c (P-036 duplicata) e 1d (P-SAN2-LEITURA-DAS-79) mediram como executados. A decisão **não é letra morta**.

## 1f. §C7 na ordem 4, 4-bis, 5, 6, 7 — e o item 7 idêntico nos dois contratos

```
$ awk 'NR>=323 && NR<=400 && /^[0-9]+(-bis|-ter)?\. |^## /' CLAUDE.md
## C7. Política de autonomia por juntas … | 1. Verde da junta … | 2. O humano é informado …
| 3. Regra da dúvida … | 4. Protocolo de dificuldade — TETO DE DOIS CICLOS …
| 4-bis. SEPARAÇÃO DE PAPÉIS NA CORREÇÃO … | 5. Paradas imediatas irredutíveis …
| 6. Modelo do planejador-mestre … | 7. Protocolo de junta resiliente … | ## 8. GitHub Flow …
$ awk 'NR>=351 && NR<=430 && …' AGENTS.md
(mesma sequência: 1, 2, 3, 4, 4-bis, 5, 6, 7, ## 8)
```
**OK.** A ordem pedida — **4 · 4-bis · 5 · 6 · 7** — vale **nos dois** contratos, sem item duplicado, sem
buraco e sem numeração fora de sequência. O item 7 novo (`D-JUNTA-RESILIENTE`) entrou **no fim**, antes do
`## 8`, sem deslocar nem renumerar nada — que é o único jeito de inserir sem quebrar as citações "§C7.4",
"§C7.4-bis", "§C7.5" espalhadas pela trilha.

```
$ awk '/^7\. \*\*Protocolo de junta resiliente/,/^---$/' CLAUDE.md | grep -v '^---$' > c7_claude.txt
$ awk '/^7\. \*\*Protocolo de junta resiliente/,/^---$/' AGENTS.md | grep -v '^---$' > c7_agents.txt
$ wc -l  → 12 e 12   $ diff c7_claude.txt c7_agents.txt → (vazio)
$ md5sum → 0844dc70286611bc49033afd7742f24b  (AMBOS)
```
**IDÊNTICOS byte a byte** (12 linhas, mesmo md5). O item 7 é regra **comum** (não específica de ferramenta),
então espelho verbatim é exatamente o que a regra de espelhamento exige — e é o que está lá. Confirmei sem
`git archive`/`tar`, pela lição §C7.1-ter(c) de CRLF fabricado (li os arquivos da árvore direto).

### ACHADO A-1 (CONFIRMA e AMPLIA o do orquestrador) — §C7.1-bis e §C7.1-ter fora da `main` nos DOIS contratos

```
$ grep -c "1-bis\|1-ter" CLAUDE.md AGENTS.md
CLAUDE.md:0
AGENTS.md:0
$ git show main:CLAUDE.md            | grep -c "1-bis\|1-ter"   → 0
$ git show demo/investidor:CLAUDE.md | grep -c "1-bis\|1-ter"   → 2
```
**Confirmado, e vai além do registrado em `00-quedas-pos-merge.md`:** o orquestrador mediu a ausência no
`CLAUDE.md`. Medi também o **`AGENTS.md`** — o espelho Codex — e ele **também não tem** as seções. Ou seja,
`D-INSPETOR-TERRENO-JUNTA` (§C7.1-bis) e `D-JUNTA-ESCOPO-E-CALIBRACAO` (§C7.1-ter) estão fora dos **dois**
contratos da `main`, não de um só. O trabalho da `P-C7-BIS-TER-FORA-DA-MAIN` é portanto **dobrado** (dois
arquivos + o `--check` do espelho), o que reforça o destino **SAN2-2**, que já é o bloco que toca contrato e
espelho.

**Nota de escopo (§C7.1-ter(a)):** `pre-existente`. As duas seções nunca estiveram na `main` — `74430cc`
(antes de tudo hoje) já media 0, e o #362 não as removeu. **Não reprova o #362.**

### CORREÇÃO DO PRÓPRIO PORTEIRO (auto-registro, P1)
Escrevi acima, na primeira versão deste item, que o #362 *"não tocou nem `CLAUDE.md` nem `AGENTS.md`"*.
**Estava errado, e a próxima medição que eu mesmo rodei desmentiu.** Corrijo em vez de apagar:

```
$ git diff a0a1075..87f6ae6 --stat -- CLAUDE.md AGENTS.md
 AGENTS.md | 24 ++++++++++----------
 CLAUDE.md | 24 ++++++++++----------
 2 files changed, 24 insertions(+), 24 deletions(-)
$ git log --oneline -1 -S "D-JUNTA-RESILIENTE" -- CLAUDE.md
a0a1075 docs(orquestracao): a junta passa a sobreviver a morte de quem a executa (SAN2-R) (#361)
$ git diff a0a1075..87f6ae6 -- CLAUDE.md
(bloco de 12 linhas do item 7 REMOVIDO de entre o item 4 e o 4-bis, e REINSERIDO depois do item 6)
```
**O que isso revela — e melhora o item 1f:** o item 7 nasceu no **#361** (`a0a1075`) **no lugar errado**,
encravado **entre o item 4 e o 4-bis**, partindo ao meio o par `4`/`4-bis`. O **#362** não criou o item 7:
ele **moveu** o bloco para depois do item 6. As 24 linhas por arquivo são exatamente esse movimento
(12 removidas de um ponto + 12 inseridas no outro), byte a byte — daí o md5 idêntico entre os dois contratos
que medi acima. A verificação 1f não é decorativa: **ela audita uma correção que o #362 de fato entregou**, e
a entrega está **certa nos dois arquivos**. O deslize foi meu ao inferir "diff de código vazio ⇒ contrato
intocado" — o filtro de caminhos do item 1a **não inclui** `CLAUDE.md`/`AGENTS.md`. Nenhuma outra conclusão
deste parecer dependia dessa inferência.

## 2. Contagens REEXECUTADAS (não copiadas) + estado do backfill de KPI

### 2a. `tests/kpi-dashboard-charts.test.ts` — o guard do painel

```
$ node --test --import tsx tests/kpi-dashboard-charts.test.ts
1..16
# tests 16 · # pass 16 · # fail 0 · # cancelled 0 · # skipped 0 · # todo 0
# duration_ms 5743.9567
```
**16/16 CONFIRMADO por execução minha** — a alegação do bloco bate. Este é o guard do §C3.1.0 (executa o
`app.js` de verdade; falha se o painel defasar do snapshot, se um gráfico sumir ou se a seção mentir sem
dado). Denominador **16**, sem skip e sem todo — nada de verde por teste pulado.

### 2b. `scripts/kpi-freeze.mjs --check`

```
$ node scripts/kpi-freeze.mjs --check
kpi-freeze: em dia (snapshot 2026-08-29).
exit=0
```
**OK.** O congelado do `file://` bate com o JSON; o fallback embutido não está mentindo (§C3.1.0).

### 2c. `Kpis/kpis-history.json` — backfill do #361 feito, dívida do #362 explícita

```
$ (últimas 4 entradas do array — 145 no total)
{'pr': 359, 'merge_commit': 'f081b5d', 'approved_head': 'd4cf978'}
{'pr': 360, 'merge_commit': '74430cc', 'approved_head': 'ee5ef03'}
{'pr': 361, 'merge_commit': 'a0a1075', 'approved_head': '48dc863'}   <- BACKFILL FEITO
{'pr': 362, 'merge_commit': None,      'approved_head': None}        <- dívida do próximo PR
$ (chaves da entrada 362) approved_head, backend_tests, blocks_completed, description,
  flutter_tests, frontend_smoke_tests, merge_commit, pr, snapshot_date, version
  backend_tests = '2595/2597' · flutter_tests = '864/864'
```
**OK nos dois lados, exatamente como o §C3.5 manda:**
- **#361 backfillado** com `a0a1075`/`48dc863` — e `a0a1075` é o merge squash do #361 que eu mesmo já havia
  usado como base do diff no item 1a. O par **fecha com a realidade do git**, não é hash decorativo.
- **#362 com `null` nos dois** — que é o **estado correto na autoria** (só existem pós-merge) e **não
  bloqueia** (§C3.5 e §9). É **dívida nomeada do próximo PR**, com os valores já determinados:
  `merge_commit = 87f6ae6` e `approved_head = 4cd0867`.

**Não aceitei os dois hashes futuros de boca — conferi que existem e que a linhagem fecha:**
```
$ git log --oneline -1 4cd0867
4cd0867 docs(governanca): D-SAN2-OPCAO-C — a escolha do dono ganha entrada propria (R2 do inspetor)
$ git log --oneline -3 4cd0867   → 4cd0867 · 31cd9ad (briefing da junta) · 8860fc3 (resgate, opção C)
$ git merge-base --is-ancestor a0a1075 4cd0867 → verdadeiro
```
`4cd0867` é de fato a **ponta da branch do SAN2-1R** (seus 3 commits são os do bloco: resgate → briefing →
D-SAN2-OPCAO-C, o último atendendo o R2 do inspetor), e ela **saiu do #361** (`a0a1075` é ancestral). O
backfill do próximo PR tem o par certo à mão.

**Sub-achado 2c-α (NOTA, não bloqueia):** `Kpis/kpis-latest.json` **não carrega** os campos `pr`/
`merge_commit`/`approved_head` no topo — sua estrutura é outra (`metrics`, `recent`, `policy`,
`production_readiness`, `series_breaks`, …). Os hashes do #361 (`a0a1075`/`48dc863`) e o número `362`
aparecem **dentro** dele (busca no JSON serializado: presentes), mas `87f6ae6`/`4cd0867` não — coerente com
a dívida de backfill acima, não é divergência. Registro só para o backfill do próximo PR **não esquecer o
`latest.json`** ao mexer no `history.json`.

---

## 3. Próximo start, bloqueios e limpeza §C5 — **MEDIDO PELO ORQUESTRADOR, NÃO PELO PORTEIRO**

> **Aviso de proveniência (P3).** As entradas abaixo foram medidas pelo **orquestrador** depois de a cadeira
> do porteiro cair **quatro vezes**. Elas NÃO são voto nem parecer, e **não valem como verificação própria**
> do porteiro: são **roteiro de re-execução barata**. Quem assinar o parecer re-roda e compara — conclusão
> sem comando re-executado continua não-insumo.

### 3a. Pendências que BLOQUEIA e estão abertas × alvos SAN2-2 / SAN2-3

Comando: script Python sobre `pendencias.md` — separa por `## P-`, exige linha de `BLOQUEIA` **afirmativa**
(descarta "não bloqueia" / "zero bloqueia"), lê a linha de status e cruza com os alvos
(`sync-agent-agents`, `ci.yml`, `workflows/ci`, `especialistas`, `.claude/agents`, `espelho`).

Saída: **16 BLOQUEIA afirmativas e não fechadas.** Duas alcançam os alvos:

| Pendência | Alvo tocado | Impede o start? |
|---|---|---|
| `P-REG-S0-GUARD-FALSO-VERMELHO` | `sync-agent-agents`, espelho | **Não — é o item 1 do próprio SAN2-2** |
| `P-O6R-ARNES-ISOLAMENTO` | `ci.yml` | **Não — dono declarado é bloco próprio (SAN2-4)** |

As outras 14 são as trilhas Ω6R/Ω4/Ω3F, que não alcançam scripts, CI nem `.claude/agents/`.

**Veredito parcial:** nenhuma `BLOQUEIA` aberta impede o **start** do SAN2-2 ou do SAN2-3. As duas que
tocam os alvos **são o trabalho**, não impedimento a ele.

**Anomalia menor a conferir:** `P-O6R-B11` devolve a palavra de status `HOJE` — a linha de status não segue
a forma esperada. Não altera o veredito; vale como achado de forma.

### 3b. Branch de resgate no remoto

```
git ls-remote --heads origin | grep -iE "resgate|san2"
→ 55aa8a3  refs/heads/chore/san2-1-resgate     (NÃO era vazio)
git rev-list --count main..chore/san2-1-resgate   → 5
```

A branch do PR #362 **continua no remoto** após o merge. Os 5 commits à frente da `main` são o esperado de
um squash (a `main` recebeu a árvore, não os commits). **Achado de limpeza §C5: o `--delete-branch` não foi
aplicado ao #362.** Não bloqueia start.

### 3c. Worktrees e disco

```
git worktree list  → 5: árvore principal (demo/investidor) · agent-af6ea607f3ddf8efd (financeiro, insumo
                       do ciclo 5) · gov-descuido · san2-1 (chore/san2-1-resgate) · san2-r (main)
df -h /c           → 19 GB livres (93% usado)
```

Disco caiu de **23 GB → 19 GB** desde o porteiro do #360. Acima do piso de ~10 GB da §C5; sem ação exigida.

### 3d. Trilha do SAN2-1 na `main` (amostra de 3)

`J-SAN2-1R.md` (53 linhas) · `DOSSIE-SAN2-1-parada.md` (105) · `pendencias-indice.md` (306) — **as três
presentes na `main`.**

### 3e. Branch parada `chore/san2-1-triagem-pendencias` — pode ser removida?

```
git rev-list --count main..chore/san2-1-triagem-pendencias        → 13
git rev-parse --abbrev-ref ...@{upstream}                         → fatal: no upstream
git ls-remote --heads origin | grep -i triagem                    → (nenhuma)
git diff --name-only --diff-filter=A main <branch>                → 0 arquivos
```

13 commits, **sem upstream, zero refs no remoto** — existe só neste disco. Conteúdo, medido arquivo a arquivo
(`git diff <blob> <blob>`, sem passar pelo filtro de worktree — a armadilha do `core.autocrlf`):

| Arquivo | Linhas só na branch | Leitura |
|---|---|---|
| `AGENTS.md` · `CLAUDE.md` | **0** · **0** | contratos integralmente absorvidos |
| `decisoes.md` | 19 | **falso alarme, corrigido abaixo** |
| `pendencias.md` | 81 | **zero cabeçalhos `## P-`** — só texto de corpo superado |
| `pendencias-indice.md` | 204 | índice regenerado na `main` com placar novo |
| `Kpis/*` | 1 · 4 · 9 | snapshot do bloco parado, superado por #361/#362 |

**Erro do orquestrador, registrado em vez de apagado.** As 19 linhas de `decisoes.md` foram lidas primeiro
como *"decisão do dono presa neste disco"* — a `D-GOLIVE-MAPS-ROTACAO-DISPENSADA`. Medição seguinte
desmentiu:

```
D-GOLIVE-MAPS-ROTACAO-DISPENSADA por ref:
  main                              2 ocorrências
  chore/san2-1-triagem-pendencias   1 ocorrência
  chore/san2-1-resgate              2 ocorrências
P-GOLIVE-SECRET-ROTATE na main → status: FECHADA · era CRÍTICA
```

A `main` tem **mais** ocorrências que a branch; o diff desalinhou porque o bloco foi **reposicionado** na
`main`. Nada preso, nada perdido. Fica registrado porque a classe do engano é a que este bloco existe para
matar: **contar linha de diff e chamar de conteúdo ausente**.

**Veredito parcial:** a branch parada não guarda **nenhum** conteúdo exclusivo — zero arquivos novos, zero
pendências novas, contratos com delta zero. É removível com segurança. O worktree `san2-1` aponta para
`chore/san2-1-resgate` (a do #362), não para esta.

### 3a-ERRATA — o "16" estava errado; o número honesto é **8**

**Quem pegou:** a **quinta** cadeira do porteiro, segundos antes de cair. Ela contou `grep -c "BLOQUEIA"` →
**14 linhas**, não bateu com as 16 pendências do orquestrador, e declarou que ia investigar. Caiu antes de
concluir. O orquestrador re-mediu a partir da pista.

**A causa, medida.** O arquivo tem **duas coisas diferentes** com a mesma palavra:

```
grep -oiE "\*\*[^*]{0,12}bloqueia[^*]{0,4}\*\*|BLOQUEIA" pendencias.md | sort | uniq -c
     38  bloqueia          <- prosa
     14  **Bloqueia:**     <- CAMPO ESTRUTURADO
     13  BLOQUEIA          <- prosa com ênfase
      2  Bloqueia
      1  **BLOQUEIA**
```

O contador do orquestrador rodou com `re.I` sobre **qualquer linha afirmativa**, e por isso somou menção em
prosa ao campo estruturado. A régua correta é o **campo `**Bloqueia:**`**, lendo o **valor** do campo.

**Remedição pelo campo (13 pendências têm o campo):** 3 fechadas · 2 abertas com o bloqueio **negado**
("não bloqueia…") · **8 abertas que realmente bloqueiam** — `P-O6R-B03`, `B04`, `B06`, `B07`, `B08`, `B09`,
`B10`, `B11`. Todas são trilhas de **feature** da Ω6R (despesas/RDV, estoque, billing, OS+RBAC, jobs/tempo
real, despacho+Mapa, portal do proprietário, OS mobile).

**Segundo erro do orquestrador, também da régua:** as duas pendências que eu disse "alcançar os alvos"
(`P-REG-S0-GUARD-FALSO-VERMELHO`, `P-O6R-ARNES-ISOLAMENTO`) **não têm campo `**Bloqueia:**` nenhum** —
entraram na minha lista só por menção em prosa.

**Terceiro erro, idem:** a "anomalia `P-O6R-B11` com status `HOJE`" **não existe**. A linha real é
`**Estado hoje, conferido de primeira mão na main (e80430a)…**`, e foi o meu regex de status que capturou a
palavra "hoje". O arquivo está correto; o medidor é que estava torto.

**O veredito parcial não muda, e agora é mais forte:** **nenhuma** das 8 pendências que realmente bloqueiam
alcança `scripts/`, `.github/workflows/` ou `.claude/agents/`. Todas as 8 bloqueiam **feature de produto** —
e nem SAN2-2 (guard do espelho + suíte no CI) nem SAN2-3 (obituário dos especialistas) são feature. O start
dos dois segue livre; o que mudou foi a **honestidade do número**, de 16 inflado para 8 medido.

**Lição, para a série:** três erros nesta seção, os três da **mesma causa** — régua frouxa aplicada a texto
semiestruturado, exatamente a doença que reprovou o SAN2-1 nos dois ciclos. Foi um agente **caindo** que
pegou. Terceira vez no dia em que uma cadeira morre logo após enunciar um achado real e o achado sobrevive
porque estava escrito.

### 3f. Divergência `approved_head` × `headRefOid` — apurada (roteiro do orquestrador)

**Quem levantou:** o **sexto** sucessor do porteiro, no item 0 do parecer: `gh pr view 362` devolve
`headRefOid = 55aa8a3`, e o roteiro manda backfillar `approved_head = 4cd0867`. Ele encaminhou para
apuração e caiu antes de chegar lá.

**Medição:**

```
git merge-base --is-ancestor 4cd0867 55aa8a3      → SIM (4cd0867 vem antes)
4cd0867  2026-08-29 20:08  docs(governanca): D-SAN2-OPCAO-C — a escolha do dono ganha entrada
55aa8a3  2026-08-29 20:30  chore(kpi): numero do PR (#362) no snapshot e no history (§C3.5)
git log --oneline 4cd0867..55aa8a3:
  3d85618  docs(junta): ata da J-SAN2-1R — APROVADO 3x0 …
  55aa8a3  chore(kpi): numero do PR (#362) …
ata J-SAN2-1R na main: "→ **4cd0867** … head julgado pelas 3 cadeiras"
```

**Não é defeito — são duas coisas diferentes com nomes parecidos.** `approved_head` (§C3.6) é o head que a
**junta julgou**: `4cd0867`, consignado na ata. `headRefOid` é a **ponta que o GitHub mergeou**: `55aa8a3`.
O delta entre os dois são **dois commits pós-voto de registro puro** — a própria ata (que só pode nascer
depois do voto) e o número do PR no KPI (que só existe depois do `gh pr create`). Nenhum toca conteúdo
julgado.

**Consequência prática para o backfill:** o próximo PR grava `merge_commit 87f6ae6` e
`approved_head **4cd0867**` — o head julgado, **não** o `headRefOid`. Fica escrito porque a escolha tem de
ser deliberada: gravar `55aa8a3` seria declarar que a junta aprovou dois commits que ela nunca viu.
