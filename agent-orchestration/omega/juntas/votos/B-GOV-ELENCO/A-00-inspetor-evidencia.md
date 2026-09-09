# A-00 · inspetor-de-terreno-da-junta — evidência executada (ciclo 2, fatia A)

**Papel:** `inspetor-de-terreno-da-junta` (gate de start, não vota mérito, não conserta — §C7.4-bis).
**Modelo que rodou:** **Opus** (`claude-opus-5[1m]`), NÃO Fable — ver seção "Modelo" do parecer
`A-00-inspetor.md` (`D-FALLBACK-MODELO-FABLE-OPUS`, primeira aplicação real).
**Worktree:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco` (sempre por
caminho absoluto; a árvore principal `demo/investidor` NÃO foi tocada).
**Forma de medição:** Bash (Git Bash) no worktree · `node v20.19.5` · `core.autocrlf=true` · exit code por
variável, nunca por pipe. Data: 2026-09-08.

---

## ITEM 1 — o tabuleiro e o isolamento

### 1.1 Worktree limpo ANTES de eu escrever

```
$ git -C <wt> status --porcelain
(saída vazia)
$ git status --porcelain | wc -l
0
```
**VERDE.** Zero linhas. Esta medição é anterior a qualquer escrita minha; os dois arquivos que eu crio
(`A-00-inspetor-evidencia.md`, `A-00-inspetor.md`) sujam o worktree DEPOIS desta leitura, por desenho.

### 1.2 Head confere com o briefing/plano

```
$ git rev-parse --short HEAD            -> 9ee66e3f     (alvo do briefing: 9ee66e3f)  OK
$ git rev-parse --short 7facc396        -> 7facc396     (head de código)              OK
$ git rev-parse --abbrev-ref HEAD       -> chore/gov-auditoria-elenco                 OK
$ git rev-parse --short origin/main     -> fe2748c8     (base declarada)              OK
$ git merge-base --is-ancestor 7facc396 HEAD ; echo $?   -> 0   (é ancestral)         OK
```
**VERDE.** Os quatro identificadores do briefing batem com o terreno.

### 1.3 A regra "depois de `7facc396` só `agent-orchestration/` muda" — CONFERIDA, não acreditada

```
$ git diff --name-only 7facc396..HEAD
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ciclo2-A.md
agent-orchestration/omega/planos/B-GOV-ELENCO-ciclo2-plano.md

$ git diff --name-only 7facc396..HEAD | grep -vc '^agent-orchestration/'
0                       <-- exigido pelo mandato: 0

$ git log --oneline 7facc396..HEAD
9ee66e3f docs(junta): briefing da fatia A do ciclo 2 ...
88ff8726 docs(plano): EMENDA 2 — tres criterios corrigidos DEPOIS de medidos ...
```
**VERDE.** Os dois commits pós-código são exatamente o briefing e a EMENDA 2, ambos em
`agent-orchestration/`. Diferente do ciclo 1, a regra que o orquestrador escreveu **é verdadeira no commit
em que ele a escreveu**. (`grep -vc` devolve ec=1 quando o contador é 0 — é o comportamento normal do
`grep -c` sem match, não um erro; o número que vale é o `0` impresso.)

### 1.4 Arquivos centrais: árvore == blob do HEAD (sem mutação viva)

Medido com `git hash-object` (aplica o filtro `clean`, imune ao CRLF de `core.autocrlf=true`) contra
`git rev-parse HEAD:<caminho>` — e **não** com `git archive`+`tar`, que sob autocrlf fabrica divergência
(§C7.1-ter(c)).

```
IGUAL  CLAUDE.md                        2b9d650a8c69afc785067999e71abd5ff9710c96
IGUAL  AGENTS.md                        f6b86a771908d3d8353bf87288320ad4bc1f0d71
IGUAL  scripts/audit-agents-skills.mjs  2354129f5f3cc42b666ce8f95451cfe9efdc7249
IGUAL  Kpis/kpis-latest.json            9698ec5aeac8b05e58625cee270b580b0993f1d5
```
**VERDE.** Nenhuma mutação viva não-commitada nos arquivos que a junta vai medir. (O `CLAUDE.md`/`AGENTS.md`
deste worktree têm mtime recente sem estarem sujos — é carimbo de checkout, não edição: o hash prova.)

### 1.5 Declaração de isolamento por jurado no briefing — presente e específica

`BRIEFING-B-GOV-ELENCO-ciclo2-A.md:62-69`, seção **"ISOLAMENTO — obrigatório"**, diz por escrito:
worktree **SOMENTE-LEITURA** exceto os **dois arquivos do próprio jurado** em `votos/B-GOV-ELENCO/`;
**toda prova por mutação em cópia isolada** (`mktemp -d` + `cp` de `scripts/` e `.claude`/`.agents`, medir,
`rm -rf`); **sem `git worktree add`, sem junction, sem symlink, sem `npm ci`**; e "worktree sujo = pare e
reporte anomalia de terreno".
**VERDE.** É exatamente o plano de isolamento que o §1.2 do meu mandato exige — inclusive a proibição de
junction, que é a lição de 26/08 (`D-JUNTA-ESCOPO-E-CALIBRACAO`(c)). Banco não entra: este bloco não tem
migration, model nem query — nenhum jurado precisa de cluster, e a base viva não é alvo de ninguém (1.2
satisfeito por inexistência de alvo, não por omissão).

### 1.6 A receita de mutação em cópia — REUSO a prova do ciclo 1, e digo por quê

**Não re-executo** o `0 → 1 → 0` na cópia / `0 → 0 → 0` no worktree que eu mesmo provei nas três passadas do
ciclo 1. Motivo: o que ela prova é uma propriedade do **sistema de arquivos e do shell** (um `cp -r` para
`mktemp -d` produz uma árvore desconectada; mutação lá não alcança o worktree), e **nada disso mudou** — o
que mudou (base, diff, dev, e o próprio script auditado) não é insumo daquela prova.

**Mas uma coisa mudou e eu medi, em vez de reusar:** o auditor ganhou `--ref` no ciclo 2 (achado `C3-A7`),
isto é, um caminho de código que **fala com o git**. Se ele materializasse a ref em disco (checkout temporário,
`git worktree add`), a receita "mutação só em cópia" teria um furo novo. Não tem:

```
$ grep -nE 'writeFile|appendFile|mkdtemp|mkdir|rmSync|unlink|worktree add|spawnSync' scripts/audit-agents-skills.mjs
(nenhuma API de escrita)
$ grep -nE 'git\(\[' scripts/audit-agents-skills.mjs
94:  git(["rev-parse", "--verify", "--quiet", `${REF}^{commit}`]);
147: git(["ls-tree", "-r", "--name-only", REF, "--", prefixo])
169: git(["show", `${REF}:${caminho}`]);
```
**VERDE.** Os três subcomandos são leitura pura (`rev-parse`/`ls-tree`/`show`), com `stdio[0]="ignore"`. O
auditor **não escreve em disco** nem com `--ref` nem sem. Consequência prática para a junta: rodar
`--ref <sha>` **dentro do worktree** é seguro; e como uma cópia em `mktemp -d` não tem `.git`, o `--ref` só
funciona no worktree — o que é aceitável justamente porque ele é read-only.

### 1.7 Resíduo de rodada anterior

```
$ docker ps -a --format '{{.Names}}\t{{.Status}}'
erp-postgres    Up 10 days (healthy)
erp-redis       Up 10 days (healthy)
```
Nenhum container `jur-*`/`crit-*`. **VERDE.**

```
$ git status --porcelain --ignored   -> vazio
$ test -e node_modules               -> NAO (deliberado: §5-bis / briefing)
$ find . -maxdepth 2 -name node_modules -> nada  (nenhuma junction/symlink)
```
Nenhum `jur-probe*`, `*-probe.ts` ou temporário solto. **VERDE.**

```
$ git worktree list
.../ERP_Techsolutios                 d1fab3bc [demo/investidor]
.../.claude/worktrees/b06            005b522c [fix/billing-durability]
.../.claude/worktrees/gov-descuido   497d360d [docs/governanca-porteiro-pre-merge-sol]
.../.claude/worktrees/gov-elenco     9ee66e3f [chore/gov-auditoria-elenco]   <-- este
```
Os worktrees `b06` e `gov-descuido` são de **outros blocos, de outras sessões** — não são resíduo desta junta
e **não se varre resíduo alheio, reporta-se** (lição de 04/09: uma cadeira destruiu o worktree VIVO de outra
sessão lendo o nome como seu). Registro como **ressalva informativa**, não como sujeira: nenhum jurado desta
junta tem motivo para tocá-los, e o briefing já proíbe `git worktree add`.

**VEREDITO PARCIAL DO ITEM 1: VERDE.** Tabuleiro limpo, heads conferidos, regra de escopo pós-código
verdadeira (0 fora de `agent-orchestration/`), isolamento declarado por escrito e ferramenta provada
read-only. Uma ressalva informativa: dois worktrees de outros blocos coabitam o disco.

---

## ITEM 2 — inelegibilidade, EMENDA 2 declarada, e o assento

### 2.1 (a) As três cadeiras · inelegibilidade cruzada por nome

Comando: `grep -rln "<cadeira>" agent-orchestration/omega/juntas/J-*.md agent-orchestration/omega/reprovacoes/R-*.md`

```
agente-secops                  -> 16 atas, todas de OUTROS blocos (O6R-02 c3/c4, O6R-07b, SAN-4/5/6,
                                  SAN-PROD-*, O6R-B01 c2/c3, O6R-B05, CHK-04C, omega5p pr16/pr17)
inspetor-de-arnes-concorrente  ->  7 atas, todas de OUTROS blocos (B-O6R-02 c1/c3/c4, O6R-B01 c2/c3,
                                  R-B-O6R-01 c1 e c2-residual)
coordenador-de-acessos         -> 46 atas, todas de OUTROS blocos (OMEGA3*, OMEGA4*, CHK-P1-*, MAPAS-8,
                                  ACESSO-gate, B-O6R-02 c2/c4, ...)
```

**Nenhuma é `J-B-GOV-ELENCO.md` nem `R-B-GOV-ELENCO-ciclo1.md`.** Grep dirigido nos artefatos DESTE bloco
(ata do ciclo 1, reprovação, plano do ciclo 1, pasta de votos) devolve só estas classes de ocorrência:

- `agente-secops`: plano do ciclo 1 l.190 (citado como EXEMPLO de papel `agente-*`) e `C3-evidencia.md`
  l.107/125/144/386 — **linha de tabela do auditor**, isto é, objeto medido.
- `inspetor-de-arnes-concorrente`: `C3-evidencia.md` l.110 (linha de tabela) e `PLANO-C2-evidencia.md` l.58
  (a escolha da cadeira pelo planejador).
- `coordenador-de-acessos`: `C3-evidencia.md` l.107 (linha de tabela) e `PLANO-C2-evidencia.md` l.58.

Toda ocorrência é **objeto medido** ou **candidata escolhida** — nenhuma como votante, achadora, planejadora
ou dev. Votantes do ciclo 1, pela ata l.21-24: `validador-mestre`, `guardiao-fail-closed`, `agente-ci-doutor`,
mais `cadeira-permanente-backend-review` (homologação nº 1). Planejador: `planejador-mestre`. Dev:
`dev-gov-elenco-c2`. **Zero colisão.** As três existem como agente no head
(`.claude/agents/{agente-secops,inspetor-de-arnes-concorrente,coordenador-de-acessos}.md`). **VERDE (3.1).**

**Cobertura de competência (3.2).** O objeto da fatia A é um **auditor de permissões de agente** + registro +
KPI. As cadeiras cobrem segurança/SoD (`agente-secops`, `coordenador-de-acessos`) e instrumento/arnês
(`inspetor-de-arnes-concorrente`), com mandatos casados no §9.1 do plano — A-C2 leva justamente
falso-negativo/falso-positivo, que é onde morava o instrumento cego do ciclo 1. **VERDE.**

**Ressalva informativa (não bloqueia):** as três cadeiras são **objeto do artefato que julgam** — as três
aparecem na tabela do auditor e as três carregam `Bash`, logo entram no AVISO agregado dos "17 papéis" que
esta fatia publica (`P-GOV-BASH-EM-QUEM-JULGA`). Não é inelegibilidade pelo §C7.4-bis, e o briefing já é
transparente ("regex cega a 13 de 24 papéis, **inclusive `agente-secops` — você**"). Mas cada voto deveria
**declarar** a condição, porque o AVISO que elas julgam as conta.

### 2.2 (a-bis) Corpo carregado × corpo julgado — e o instrumento errado do §9.4-4

O §9.4-4 do plano manda o inspetor conferir `md5sum <cwd>/.claude/agents/<x>.md` contra
`git show <head>:… | md5sum`. **Rodei, e o md5 acusou divergência nas três cadeiras** (worktree × árvore
principal):

```
agente-secops                  wt_md5=1d47a3e9…   principal_md5=dc1a2974…   DIVERGE
inspetor-de-arnes-concorrente  wt_md5=61d13969…   principal_md5=8caaef86…   DIVERGE
coordenador-de-acessos         wt_md5=88ee1c9e…   principal_md5=a4141c31…   DIVERGE
```

**A divergência é FALSA.** Com o instrumento correto:

```
git hash-object .claude/agents/agente-secops.md                     -> 6216e132…
git hash-object <principal>/.claude/agents/agente-secops.md         -> 6216e132…    IDÊNTICO
diff normalizado (tr -d CR nos dois lados) -> 0 linhas diferentes, nas TRÊS cadeiras
file <worktree>  -> "... with CRLF line terminators"
file <principal> -> (sem CRLF)
```

Conteúdo igual; só o line-ending físico difere, sob `core.autocrlf=true`. E contra o head:
`git hash-object` == `git rev-parse HEAD:<caminho>` nas três — **o corpo no worktree É o corpo do head**.

**Achado de terreno, escopo `pre-existente`** (evidência de origem: o texto do §9.4-4 é do plano de 07/09, e o
meu próprio cartão de papel, §1.1, prescreve a mesma receita): **`md5sum` para comparar corpo de agente
fabrica divergência nesta máquina.** É a mesma classe do `git archive`+`tar` que o
`D-JUNTA-ESCOPO-E-CALIBRACAO`(c) proibiu — a que já virou pendência ALTA fechada por não-reprodução no mesmo
dia. Instrumento certo: `git hash-object` (aplica o filtro `clean`) ou `diff` com `tr -d` do CR. **Quem for
conferir corpo na fatia B — onde "divergência no corpo do assento = BLOQUEADO" — precisa disto por escrito,
sob pena de bloquear a fatia B por artefato de CRLF.**

**Ressalva forte:** o briefing **não declara como cada identidade é carregada**, exigência explícita do
§9.4-4 ("o inspetor bloqueia sem eles"):

```
grep -niE 'corpo carregado|carregad|md5|blob do head|subagente' BRIEFING-B-GOV-ELENCO-ciclo2-A.md
(vazio)
```

**Não bloqueio**, porque medi o fato que a exigência quer garantir e ele é verde **nas duas hipóteses de
carga**: os corpos do worktree são idênticos ao head **e** idênticos em conteúdo aos da árvore principal —
então, seja qual for o `cwd` de onde o subagente é carregado, o corpo julgado é o corpo que roda. A ressalva
é que isso foi **provado por mim, não declarado pelo briefing**; se o orquestrador mudar o `cwd` de disparo
ou alguém editar os agentes na árvore principal (que está com trabalho não-commitado de outra sessão), a
prova cai.

### 2.3 (b) A EMENDA 2 — declarada em destaque, mas o corpo do plano não foi anotado

Posição no arquivo, medida:

```
grep -n '^> ## EMENDA|^# B-GOV-ELENCO|^## §' B-GOV-ELENCO-ciclo2-plano.md
    1: > ## EMENDA 2 — três critérios corrigidos DEPOIS de medidos (orquestrador, 2026-09-08)
   67: > ## EMENDA 1 — escopo acrescentado POR ORDEM DO DONO, no meio do ciclo (2026-09-07)
   91: # B-GOV-ELENCO — plano do CICLO 2 (a última tentativa)
  494: ## §7 · Critérios de aceite
```

**Visibilidade: VERDE.** A EMENDA 2 é a **linha 1** do plano, antes do próprio título, em citação destacada,
**assinada** ("orquestrador, 2026-09-08") e com a autocrítica explícita ("emendar critério depois de ver a
medição é exatamente o gesto que merece desconfiança"). Não está diluída no corpo.

**Nomeia o que mudou em cada critério: VERDE.**
`A-17` (l.19-31): "Como estava" vira `A-17a` (duas passadas mortas → os 6 do `skill-creator`) e `A-17b` (só
`semCercas` morta, fixture de til → 1 falso `C8`), com mecanismo declarado (as duas passadas se sobrepõem na
cerca de crase) e um **vermelho de controle**. `A-16` (l.33-40): 71 → **34**, com mecanismo (o parser novo
recusa o arquivo inteiro com um achado) e denominador (23 agentes + 11 SKILL.md). `A-25` (l.42-52): a palavra
"assento" deixa de ser o teste; a substância ("não creditar o assento a esta entrega e dizer que vai para a
fatia B") passa a ser.

**Manda a junta julgar se afrouxou: VERDE.** Plano l.60-64 ("**se esta emenda afrouxou alguma propriedade**…
achado `dentro-do-bloco` **contra o orquestrador**, não contra o dev") e briefing l.71-78, em seção própria,
com a ordem de "não aceite a tabela T1–T7′ do dev sem reexecutar pelo menos uma das mutações".

**RESSALVA FORTE — o §7 ainda carrega a versão SUPERADA dos três critérios, sem ponteiro para a emenda:**

```
sed -n '494,557p' plano | grep -n 'EMENDA'
  -> só ocorrências de `EMENDA-1` que significam OUTRA coisa (a emenda à DECISÃO do assento, fatia B)

l.520  A-16 … -> 1 ou mais BLOQUEIA falsos (71 no ciclo 1); restaurado -> 0
l.521  A-17 … cópia do script sem a remoção de cercas -> voltam os 6 falsos do `skill-creator`
l.529  A-25 … `description` sem "5 de 12", sem "6,6 KB", sem "assento"
```

As três linhas **contradizem a emenda e não dizem que foram emendadas**. O §9.1 manda `A-16`/`A-17` para a
cadeira **A-C2** e `A-25` para a **A-C1**, e o briefing manda ler "§7 (critérios)". Uma cadeira que meça
`A-17` **como escrito no §7** obtém **0** (é o que o dev mediu em T5) e reprova o bloco por um critério que o
próprio orquestrador já reconheceu como mal formulado — reprovação sem defeito, **no ciclo em que não há
ciclo 3**. Agravante de nomenclatura: "EMENDA 1 / EMENDA 2" (topo do plano) e "`EMENDA-1`" (§6 l.471-474 e
§7-B l.540/548, = emenda à decisão `D-CADEIRA-PERMANENTE-JUNTA`) são coisas diferentes com o mesmo nome no
mesmo arquivo.

Isto **não é "emenda escondida no corpo do plano"** (o gatilho de BLOQUEIO do meu mandato): ela está no topo
e o briefing a destaca. É **tabuleiro ambíguo** — e a correção é de briefing, não minha (§C7.4-bis: eu nomeio,
não conserto).

### 2.4 (c) O assento permanente não homologa esta fatia — minha leitura

O briefing (l.98-100) funda a exceção em: "o contrato da `main` ainda não tem o §C7.1-quater — ele nasce na
fatia B; julgar a A sob uma regra que ainda está em julgamento seria circularidade sem ganho". **Medi a
premissa em vez de acreditar:**

```
git show origin/main:CLAUDE.md               | grep -c 'C7.1-quater'          -> 0
grep -c 'C7.1-quater' CLAUDE.md   (head 9ee66e3f)                             -> 0
git show origin/main:agent-orchestration/controle/decisoes.md
      | grep 'D-CADEIRA-PERMANENTE-JUNTA|C7.1-quater|cadeira-permanente'      -> (vazio)
grep 'D-CADEIRA-PERMANENTE-JUNTA|C7.1-quater' decisoes.md   (head)            -> (vazio)
git ls-tree origin/main --name-only .claude/agents/ | grep cadeira-permanente -> (vazio)
git ls-tree chore/gov-elenco-fatia-b --name-only .claude/agents/ | grep cadeira-permanente
      -> .claude/agents/cadeira-permanente-backend-review.md
```

**A premissa é verdadeira — e mais forte do que o briefing afirma:** não só a cláusula §C7.1-quater não
existe no contrato em vigor; **a decisão `D-CADEIRA-PERMANENTE-JUNTA` não existe em `decisoes.md`, e o
próprio agente do assento não existe na `main` nem neste head.** Ele existe **apenas** em
`chore/gov-elenco-fatia-b` — ou seja, o assento **é o entregável da fatia B**. Convocá-lo aqui seria fazer um
artefato ainda não julgado homologar a fatia que o antecede.

**Minha leitura: a exceção é BEM FUNDAMENTADA — não é o bloco fugindo do próprio gate.** (i) Não há gate a
fugir no contrato em vigor (0 ocorrências em `CLAUDE.md` e em `decisoes.md` da `main`); (ii) o objeto do gate
não existe no head julgado; (iii) a exceção está **declarada por escrito no briefing**, com destino nomeado
("na fatia B ele homologa, com nota de conflito") — o oposto de omissão.

**Duas ressalvas honestas, porque a mudança é uma mudança:**

1. **O assento homologou o CICLO 1 deste mesmo bloco** (ata l.24 e l.38: "homologação **nº 1**"), sob
   **exatamente o mesmo** estado do contrato. Logo "a regra ainda não existe" **não explica sozinha** por que
   homologou então e não agora. O que de fato mudou está na própria tabela do briefing (l.90): o assento
   passou para "**Quem ACHOU** … + o assento (re-escopo de `C2-01`)" — e quem achou é inelegível. **Esse é o
   fundamento forte, e o briefing não o conecta à exceção.** Recomendação de tabuleiro: declarar as duas
   razões, para a ata não registrar um gate que sumiu sem motivo escrito.
2. **Contra o meu próprio cartão de papel.** O §3.3 do meu mandato diz "assento permanente convocado;
   ausência = BLOQUEADO", citando §C7.1-quater e `D-CADEIRA-PERMANENTE-JUNTA`. Medi que **as duas normas
   citadas não existem no repositório em vigor** — o meu cartão cobra uma regra ainda não promulgada (ela
   nasce na fatia B). Aplicá-la fail-closed aqui seria bloquear por norma inexistente. **Registro a
   divergência em vez de escolher um lado em silêncio (§A2):** se o dono ler o §3.3 do cartão como ordem
   autônoma, este parecer vira BLOQUEADO por este único item; pela medição do contrato em vigor, não vira.

**VEREDITO PARCIAL DO ITEM 2: VERDE, com duas ressalvas fortes** — (i) o §7 do plano contradiz a EMENDA 2 nos
três critérios emendados, sem ponteiro, e a colisão "EMENDA-1" agrava; (ii) o briefing não declara como as
identidades são carregadas (§9.4-4), e a receita `md5sum` que ele mandaria usar fabrica divergência sob
`core.autocrlf=true`. Inelegibilidade das três cadeiras: **limpa**. Exceção do assento: **fundamentada**.

---

## ITEM 3 — baseline honesto e escopo

Forma comum: `cmd > arq 2>&1; ec=$?` (exit por variável, **nunca** por pipe). `node v20.19.5`,
`core.autocrlf=true`, worktree sem `node_modules` (deliberado).

### 3.1 O auditor no head

```
node scripts/audit-agents-skills.mjs   ->  ec=0
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado · .claude/agents/
      17 papéis fora da allowlist de escrita carregam `Bash` … Papéis: agente-ci-doutor,
      agente-dba-guardiao, agente-secops, avaliador-mapas, cognicao-visual, coordenador-de-acessos,
      critico-adversarial, estrategista, guardiao-fail-closed, inspetor-de-arnes-concorrente,
      inspetor-de-terreno-da-junta, master-teste-telas-rotas, planejador-mapas, planejador-mestre,
      porteiro-pos-merge, validador-mestre
[audit] 0 BLOQUEIA · 1 AVISO
```

**VERDE — exatamente o esperado:** `ec=0` e **1 AVISO**. Nota de forma: `grep -c AVISO` devolve **2** e
`grep -c BLOQUEIA` devolve **1**, porque a linha-resumo contém as duas palavras; a linha que vale é
`[audit] 0 BLOQUEIA · 1 AVISO`. Cadeira que contar por `grep -c` publica número errado.

**Transparência:** o AVISO nomeia **as três cadeiras desta junta** (`agente-secops`, `coordenador-de-acessos`,
`inspetor-de-arnes-concorrente`) **e a mim** (`inspetor-de-terreno-da-junta`). Somos objeto do artefato que
julgamos e libero. Declarado, não escondido.

### 3.2 Espelho Codex (fatia S0) — o erro que se repetiu dois ciclos

```
node scripts/sync-agent-agents.mjs --check  -> ec=0   [agents-sync] OK — 23 agentes, espelho consistente.
node scripts/sync-agent-skills.mjs --check  -> ec=0   [skills-sync] OK — 11 skills, 36 arquivos, espelho idêntico.
```

**Recursividade conferida** (o `especialistas/` já ficou fora de um guard raso antes):
`scripts/sync-agent-agents.mjs` l.66-73 diz "Recursivo DE PROPOSITO: o listing raso ja deixou `especialistas/`
fora do…", com `readdirSync(..., withFileTypes)` e recursão em `isDirectory()`. Neste head não há subpasta em
`.claude/agents/` (23 arquivos, 0 subpastas); `.agents/agents/` tem 24 e a diferença é **`README.md`**
(protocolo de emulação), confirmada por `diff` das listas de nomes. **VERDE.**

### 3.3 `node --check`

```
scripts/audit-agents-skills.mjs   ec=0
scripts/kpi-freeze.mjs            ec=0
scripts/sync-agent-agents.mjs     ec=0
scripts/sync-agent-skills.mjs     ec=0
Kpis/app.js                       ec=0
```

**VERDE.** Dependência dos scripts: só builtins (`node:fs`, `node:path`, `node:url`, `node:child_process`) —
é o que torna a ausência de `node_modules` compatível com a bateria.

### 3.4 A afirmação central do §5-bis, verificada por execução

```
git diff --name-only -M fe2748c8..7facc396   -> 91 arquivos
grep -cE '^(src/|tests/|prisma/|frontend/|mobile/|\.github/|\.gitignore|scripts/sync-agent-)'   -> 0
distribuição:  32 .agents/ · 31 .claude/ · 24 agent-orchestration/ · 3 Kpis/ · 1 scripts/
scripts/ e Kpis/ no diff: scripts/audit-agents-skills.mjs · Kpis/app.js · Kpis/kpis-history.json
                          · Kpis/kpis-latest.json
package.json / package-lock.json / pubspec: ausentes do diff
```

**A afirmação do §5-bis é VERDADEIRA.** No range inteiro (`fe2748c8..HEAD`, 92 arquivos) o contador de
caminhos proibidos também é **0**.

Prova mais forte que o `diff` — **identidade de árvore**, imune a rename, a CRLF e a pathspec mal escrita
(`git rev-parse fe2748c8:<dir>` contra `git rev-parse HEAD:<dir>`):

```
src/       ARVORE IDENTICA  7f626fbc12b4644e15fcdb2af58d7d5a450e925c
tests/     ARVORE IDENTICA  8d00ef1bb12d21858c5532f075fb6e79d2d4b618
prisma/    ARVORE IDENTICA  be98074af9123b1548406d5127ae8f0c07ebf177
frontend/  ARVORE IDENTICA  24be761ec4b5a46269d25b44a59e6cd4522c967a
mobile/    ARVORE IDENTICA  3a2ac02813c2c079296d7bac832cc57a2ff7d8a5
.github/   ARVORE IDENTICA  638395976fc1e21006eded36197e9af4e65e4394
package.json IDENTICO · package-lock.json IDENTICO
```

### 3.5 O baseline substituto BASTA — e o que ele não cobre

**Basta, e o motivo é a identidade acima, não a conveniência.** `npm run check` compila e testa `src/` e
`tests/` com `package.json` e lock fixos; as seis árvores e os dois manifestos são **o mesmo objeto de git**
na base e no head. Não existe delta que a bateria pudesse enxergar. Instalar `node_modules` aqui custaria
disco que o dono não tem (`docs/limpeza-de-disco.md`) para medir uma diferença **provadamente vazia**. No
lugar, tudo executado agora: auditor `ec=0`, dois espelhos `ec=0`, `node --check` em 5 arquivos, identidade
de árvore.

**O que o substituto NÃO cobre (ressalva nomeada):** ele prova que **este bloco não pode ter mexido** no
verde/vermelho da suíte; **não** mede se `origin/main` (`fe2748c8`) está verde em termos absolutos — isso eu
não medi e não é mensurável aqui sem instalar. Para atribuir regressão ao bloco, a cobertura é completa; para
afirmar "o repositório está verde", não é. A junta não deve publicar o segundo a partir do primeiro. As 4
suítes do dev (16/16 · 6/6 · 6/6 · 12/12, com o `tsx` da árvore principal por caminho absoluto) são insumo
**do dev**, a re-verificar pela cadeira A-C1 (critério A-24) — **eu não as re-executei**.

### 3.6 `D-FALLBACK-MODELO-FABLE-OPUS` não sumiu

```
git show chore/gov-elenco-fatia-b:CLAUDE.md | grep -c '6-bis'              -> 3    (exigido: >= 1)
   l.480: "…`D-FALLBACK-MODELO-FABLE-OPUS`).** Quatro papéis têm `model: fable`…"
git show chore/gov-elenco-fatia-b:AGENTS.md | grep -c (D-FALLBACK|6-bis)   -> 4    (espelho presente)
git rev-parse --short chore/gov-elenco-fatia-b                             -> c0cbfe10
head da fatia A:  grep -c '6-bis' CLAUDE.md -> 0 ;  D-FALLBACK -> 0        (por desenho)
```

**VERDE.** A ordem do dono está inteira na fatia B, com espelho em `AGENTS.md`, e ausente da fatia A **por
desenho declarado** — não por perda.

Verificação da própria **EMENDA 1** (que a junta vai cobrar): papéis com `model: fable` são **3** no head da
fatia A (`inspetor-de-terreno-da-junta`, `planejador-mestre`, `porteiro-pos-merge`) e **4** na fatia B (os
mesmos + `cadeira-permanente-backend-review`, que só existe lá). Os quatro **continuam dizendo `fable`** — o
fallback é do invocador, como a decisão manda. A linha de fallback no corpo do agente existe **só** na fatia B
(`grep -ci opus` no meu cartão: fatia B = 2, head A = 0).

### 3.7 Armadilha de forma, medida, para as cadeiras não caírem nela

`git show <ref>:<caminho/com/barras>` no Git Bash desta máquina **falha** por conversão de caminho do MSYS:

```
$ git show 'chore/gov-elenco-fatia-b:.claude/agents/inspetor-de-terreno-da-junta.md'
fatal: ambiguous argument 'chore\gov-elenco-fatia-b;.claude\agents\…': unknown revision or path not in the working tree
```

(o dois-pontos vira ponto-e-vírgula e as barras viram contrabarras). Com `export MSYS2_ARG_CONV_EXCL='*'` o
mesmo comando funciona — reproduzi os dois lados. **Relevante para a junta:** os critérios `A-15` (blob via
`git show`), `A-27` (`git show 25c0112a:<plano>`) e o roteiro do `A-22` usam exatamente essa forma. Cadeira
que não exporte a variável pode ler o `fatal:` como "o blob não existe" e reportar **ausência falsa**.

**VEREDITO PARCIAL DO ITEM 3: VERDE.** Auditor `ec=0` com 1 AVISO · espelhos Codex `ec=0` e recursivos ·
`node --check` `ec=0` em 5 arquivos · §5-bis verdadeiro por diff **e** por identidade de árvore · ordem do
dono preservada na fatia B. Ressalvas: o baseline substituto não afirma o verde absoluto da `main`; e a
armadilha do MSYS em `git show`.

---

## ADENDO AO ITEM 2 — herança da ata do ciclo 1 (meu §2.1) e quórum (meu §5.1)

### Afirmação do ciclo 1 repassada como fato

```
grep -n 'passou inteira|A1–A10|32/32|15/15'  BRIEFING-B-GOV-ELENCO-ciclo2-A.md
l.24-25: "O ciclo 1 foi REPROVADO 3×0. O planejador (Fable) recomendou fatiar: a faxina passou inteira
          no ciclo 1 (A1–A10 verdes, 32/32 renames por hash, 15/15 aposentadorias) e não pode ficar
          refém do desenho do assento permanente…"

grep -ic 're-verificar'  BRIEFING-B-GOV-ELENCO-ciclo2-A.md   -> 0
```

O briefing **afirma como fato** três medições do ciclo 1 (A1–A10 verdes, 32/32 renames, 15/15
aposentadorias), e **não marca a ata como "A RE-VERIFICAR"** — exigência do §9.4-5 do próprio plano e do §2.1
do meu mandato. É a mecânica que contaminou o ciclo 3 do `B-O6R-02` (premissa herdada da ata anterior).

**Não bloqueio, por uma razão medida:** a propriedade que a marcação protege **está preservada pelo critério
`A-22`** (plano l.526: "roteiro C1 **re-executado**: 32/32 renames com hash de blob idêntico; 30 D = 15×2;
15/15 corpos no commit citado e iguais a `fe2748c8`"), **atribuído à cadeira A-C1** (l.571). A junta é
obrigada a re-medir, não a acreditar. **Ressalva:** a frase do briefing deve ganhar a marca, porque quem lê o
briefing e não o §7 recebe a herança sem o aviso — e a justificativa do **fatiamento** repousa nela.

### Quórum e perda de jurado (meu §5.1) — declarados

Briefing, seção "Perda de jurado": unanimidade de 3; voto perdido não é aprovação nem reprovação; cadeira que
cair por infra é **re-disparada uma vez com a mesma identidade**; segunda queda = voto perdido nomeado na ata;
**a junta não fecha com menos de 3 votos de mérito**; registro em `votos/B-GOV-ELENCO/00-quedas.md` (arquivo
já existe, do ciclo 1). Plano §9.3 acrescenta: máx. 2 cadeiras em paralelo e pausa de 15 min após 2 quedas em
30 min. **VERDE** — é o item que faltou no ciclo 3 do `B-O6R-02` e aqui está escrito.
