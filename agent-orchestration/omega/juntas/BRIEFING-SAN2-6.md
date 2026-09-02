# BRIEFING — junta do bloco `SAN2-6` (PR #368)

> **Head a julgar:** `41e2316` · **Base:** `origin/main` = `e6a6461` (#367) · **Branch:**
> `docs/san2-6-contrato-p1p6-teto` · **Worktree do orquestrador:** `.claude/worktrees/san2-r`.
> **Quórum: MAIORIA de 3** (§C7.1-ter(b)) — o bloco **não toca dinheiro, segurança, permissão nem perda de
> dado**; o diff de **código é 0 byte** (`src/`, `tests/`, `scripts/`, `prisma/`, `.github/`, `frontend/`,
> `mobile/`, lockfiles: nenhum arquivo).
> **Este briefing é insumo, não veredito.** Toda afirmação aqui é do orquestrador e **deve ser re-medida**
> por quem vota. Nada abaixo conta como fato provado.

---

## 1 · O que o bloco é, e por que ele existe agora

O próximo bloco da fila é o **ciclo 5 do `B-O6R-02`** (atomicidade do financeiro), que o dono decidiu
entregar ao **Codex**. Uma revisão de prontidão encontrou **duas lacunas que só aparecem sob pressão**, e o
dono mandou fechá-las **no contrato** antes do handoff:

1. **`P1`–`P6` não estava inline em nenhum contrato.** `CLAUDE.md` e `AGENTS.md` resumiam e **apontavam**
   para `agent-orchestration/omega/juntas/PROTOCOLO-JUNTA-RESILIENTE.md`. Medição do dev antes de editar:
   `grep -cE '\bP[1-6]\b'` = **0 / 0**. Um executor sob pressão não dá o salto de referência — e P1/P2 são
   exatamente o que protege uma **tentativa única** contra perda de trabalho.
2. **Nenhum contrato dizia que o ciclo 5 é a última tentativa.** Os dois diziam que o teto é 2 e que o
   `B-O6R-02` "chegou ao ciclo 5" — o que, lido isoladamente, sugere que o bloco **já estourou** o teto. A
   ordem real vivia fora do contrato (`controle/decisoes.md` `D-TETO-DOIS-CICLOS`, l.1790-1791).
   **O próprio orquestrador errou essa premissa e a repetiu ao dono várias vezes** antes de a revisão de
   prontidão corrigi-la.
3. **Efeito colateral obrigatório:** `.agents/agents/README.md` — o protocolo de emulação que o **Codex**
   lê — mandava, na reprovação, *"ciclos 4–5 replanejam"*: **o teto revogado**. Acrescentar o teto real ao
   contrato sem corrigir o README criaria contradição entre documentos mergeados.

**O dono também mandou publicar o handoff do Codex** — daí o comando de 1301 linhas e o plano do bloco
paralelo entrarem no mesmo PR.

## 2 · O diff, medido (re-meça)

```
git diff --numstat e6a6461...41e2316
```

| arquivo | + | − | o quê |
|---|---|---|---|
| `CLAUDE.md` | 57 | 11 | teto no §C7.4 (**inserção pura de 5**) + P1–P6 inline substituindo o item 7 |
| `AGENTS.md` | 61 | 15 | espelho §A2 + 4 correções só dele |
| `.agents/agents/README.md` | 26 | 14 | 9 edições — teto, roster, papéis inexistentes, os 2 gates ausentes |
| `PROTOCOLO-JUNTA-RESILIENTE.md` | 14 | 0 | emenda voto-esqueleto apensada (**append-only**) |
| `Kpis/kpis-history.json` | 14 | 2 | backfill #367 · `blocks_completed` 156→157 · âncora de head · entrada 151 |
| `Kpis/kpis-latest.json` | 12 | 12 | espelho da entrada 151 |
| `Kpis/app.js` | 1 | 1 | bloco `FROZEN` **regerado por `kpi-freeze.mjs`** |
| `controle/pendencias.md` | 98 | 0 | pendência com dono + Registro §A2 |
| `controle/pendencias-indice.md` | 7 | 6 | **regenerado por script** |
| `docs/status-geral.md` | 5 | 0 | — |
| `codex/comandos/B-O6R-02-ciclo5.md` | 1301 | 0 | **novo** — o comando do Codex |
| `omega/planos/B-O6R-07-plano.md` | 444 | 0 | **novo** — o bloco paralelo do Claude Code |
| `omega/planos/SAN2-6-plano.md` | 505 | 0 | **novo** — o plano deste bloco |
| `votos/SAN2-6/dev-contratos-readme.md` | 755 | 0 | **novo** — o diário do dev |
| `votos/SAN2-5/00c-porteiro-pos-merge-367.md` | 161 | 0 | **novo** — parecer do porteiro do #367 |

**Escopo proibido:** medido vazio. Re-meça:
`git diff --name-only e6a6461...41e2316 -- 'src/**' 'tests/**' 'scripts/**' 'prisma/**' '.github/**' 'frontend/**' 'mobile/**' 'package-lock.json'`

## 3 · O que cada cadeira julga (mandato ≤3 itens — **P4**)

### C1 — `auditor-da-insercao-e-da-paridade`  · **sem veto individual**
1. **Inserção pura onde foi prometida.** O dev declara `CLAUDE.md 5 0` e `AGENTS.md 5 0` no teto
   (§3.1) — zero remoções, *"não é conversão de EOL disfarçada"*. Confira por commit e por âncora, não por
   confiança. Onde houve **substituição** (item 7 dos dois contratos, README), o diff cabe nas linhas
   declaradas?
2. **Paridade §A2** (`D-INTEROP-CLAUDE-CODEX`: *alterou um, altera o outro no mesmo trabalho*). O bloco de
   P1–P6 e o do teto são **idênticos** nos dois contratos, salvo diferença estritamente de mecanismo? O
   orquestrador afirma **zero linha de diff** no bloco §C7.4→§C7.7 (110 linhas cada). **Prove ou derrube.**
3. **Os greps que definem "feito".** Antes: `P1..P6` = 0/0. Depois: ≥1 nos dois? `ciclo 6` presente na
   cláusula nova? `ciclos 4–5` **ausente** do README? A emenda voto-esqueleto está na fonte
   (`PROTOCOLO-JUNTA-RESILIENTE.md`) **e** inline no contrato?

### C2 — `provador-do-espelho-e-do-comando` · **PODER DE VETO**
1. **O espelho foi GERADO, não digitado.** `node scripts/sync-agent-agents.mjs --check` deve sair `ec=0`.
   **Mas o guard é fail-open conhecido** (`readdirSync` plano — não entra em `especialistas/`): `ec=0`
   **não é prova** sobre os corpos de jurado. Diga o que o `--check` prova **e o que ele não prova**.
   O README mergeado bate byte a byte com o que o script gera?
2. **Escopo proibido intocado**, provado por **mutação** e não só por diff vazio: mute uma perna
   (um arquivo de `src/`, um teste, `.github/ci.yml`), meça o comando ir a `ec≠0`, restaure, meça voltar a
   zero. Diff vazio que não sabe morder não prova nada.
3. **O comando do Codex contradiz o contrato que ele cita?** `B-O6R-02-ciclo5.md` (1301 l.) cita §C7.4,
   §C7.7, §C3.5, §C5. **As citações batem com o texto que ESTE PR deixa na `main`** — ou o comando descreve
   um contrato que não existirá após o merge? Amostre ≥5 citações. Inclui a §11.11 nova (git concorrente),
   cuja tabela de "o que é compartilhado entre worktrees" foi medida **nesta máquina** — confira
   `git rev-parse --git-dir` × `--git-common-dir`.

### C3 — `conferente-do-kpi-e-das-dividas` · **PODER DE VETO**
1. **Backfill §C3.5 do #367.** A entrada 150 do `kpis-history.json` deve ganhar `merge_commit e6a6461` e
   `approved_head` **`5256b49`** — que é o head **da ata** `J-SAN2-5.md`, **não** o `headRefOid` do PR.
   Confira **qual dos dois é o certo** e se o valor gravado é esse.
2. **Os números da entrada 151.** `blocks_completed` 156→157. As métricas de trilha que este PR **não
   tocou** (backend, smoke, flutter) estão **CARREGADAS com nota explícita §C3.3** — ou foram copiadas em
   silêncio como se fossem execução? `mvp_demo`/`mvp_vendavel` intocados (§C3.4)?
   E a **âncora de head** das provas `"442 0"`/`"100 0"` da entrada 150 — a 5ª ocorrência da classe
   *"número medido cedo, publicado tarde"* — foi de fato ancorada?
3. **O painel não defasou.** `Kpis/app.js` mudou 1 linha: o bloco `FROZEN`. Ele foi **gerado**
   (`node scripts/kpi-freeze.mjs`, depois `--check` `ec=0`) ou digitado? `tests/kpi-dashboard-charts.test.ts`
   passa **e morde** (drill isolado: JSON novo × `app.js` da `main` → `ec=1`)? `node --check Kpis/app.js`?
   `pendencias-indice.md` foi **regenerado por script**, com placar antes/depois?

## 4 · Protocolo obrigatório desta junta (§C7.7 — P1…P6, agora inline no contrato)

Cole no seu próprio raciocínio e **cumpra**:

```
Após CADA item: apense a votos/SAN2-6/<NN>-<cadeira>-evidencia.md
  -> comando executado · saída resumida · veredito parcial.                       [P1]
O arquivo NASCE como esqueleto com os 3 itens em EM APURAÇÃO, e cada um é
  gravado AO SER MEDIDO. Item grande também se fatia.        [P2, emenda voto-esqueleto]
ANTES da mensagem final: escreva votos/SAN2-6/<NN>-<cadeira>-voto.json.
  Mensagem final = 1 LINHA apontando o arquivo.                                   [P2]
Máximo 3 itens. Logs longos só no arquivo de evidência.                           [P4]
Se você substitui um caído: re-execute cada comando do -evidencia.md dele e
  compare, depois meça a cauda. Conclusão sem comando registrado NÃO é insumo.    [P3]
```

**Formato do voto** (`.json`): `cadeira` · `veredito` (`APROVADO` | `REPROVADO`) · `achados[]`, cada achado
com `id`, `gravidade` (`bloqueia` | `alta` | `media` | `baixa` | `nota`) e **`escopo`**
(`dentro-do-bloco` | `pre-existente`) — **§C7.1-ter(a): escopo declarado sem evidência de data ou origem é
tratado como `dentro-do-bloco`**. `pre-existente` **não reprova**: vira pendência nomeada com bloco dono.

**"Não consigo medir" = REPROVADO.** Você **não propõe correção** (§C7.4-bis): reporta defeito + evidência
executada + motivo.

## 5 · Inelegibilidade (confira por nome antes de aceitar a cadeira)

Não pode votar aqui quem: escreveu o plano `SAN2-6-plano.md`; foi o dev (`dev-san2-6`); votou em
`J-SAN2-1R`, `J-SAN2-2`, `J-SAN2-3`, `J-SAN2-4a`, `J-SAN2-4b` ou `J-SAN2-5`; ou é uma das **8 identidades
reservadas ao ciclo 5** em `.claude/agents/especialistas/` (`jurado-c5-*`, `critico-c5-*`,
`suplente-critico-c5-*`) — **queimá-las aqui custaria a tentativa única do `B-O6R-02`**. Fonte primeira da
inelegibilidade: `OBITUARIO-IDENTIDADES.md` (com a ressalva do próprio obituário: sua afirmação sobre o
espelho `.agents/agents/especialistas/` é **verdadeira em `demo/investidor` e falsa no head onde foi
escrita**).

## 6 · As armadilhas de máquina (medidas; ignorá-las fabrica achado falso)

1. **`grep -c $'\r'` NÃO conta CR** nesta máquina (devolveu 0 num arquivo de 494 CR). Use
   `tr -cd '\r' | wc -c`.
2. **`md5sum` e `git status` mentem** sob `core.autocrlf=true`. Meça **eol-neutro**.
3. **`sed -i` destrói o EOL dos contratos** — converte CRLF→LF no arquivo inteiro **mesmo sem casar nada**.
   Não use `sed -i` em `CLAUDE.md`/`AGENTS.md`. O dev declara ter usado `Edit`, nunca `sed`: **confira**.
4. **`git checkout -- <arquivo>` re-materializa CRLF** sob `autocrlf=true`, mesmo quando o blob é LF.
   Medido **nesta preparação**: o comando do Codex saiu de 0 CR (blob) para 1301 CR (árvore).
5. **`git archive` + `tar` é PROIBIDO** para medir conteúdo de commit — injeta CR e fabrica divergência.
   Use `git -c core.autocrlf=false checkout <head> -- <caminhos>` ou `git show` do blob.
6. **Heredoc com aspas quebra** neste shell.
7. **Números só valem com o head em que foram medidos** — publique o head ao lado do número.

## 7 · O que este bloco declaradamente NÃO faz (não é achado; é escopo)

- **Não corrige `CLAUDE.md` l.3-6** (ainda diz que prevalece o `AGENTS.md`, auto-corrigindo-se 25 linhas
  depois). Vira pendência com dono — `P-CLAUDE-ABERTURA-PRECEDENCIA-DESATUALIZADA`.
- **Não torna `scripts/sync-agent-agents.mjs` recursivo** (`P-SYNC-AGENTS-NAO-RECURSIVO`): `scripts/**` é
  escopo de outro bloco, e reescrever o sincronizador na véspera de uma tentativa única é mudança não
  testada no caminho crítico do gate.
- **Não popula `.agents/agents/especialistas/`** na `demo/investidor` (o espelho invertido: 15 sepultadas
  presentes, 6 das 8 necessárias ausentes). Neutralizado por desenho — o Codex **não julga**, então não
  precisa dos corpos de jurado; o comando manda ler `.claude/agents/especialistas/` direto.
- **Não executa nada do ciclo 5.**
