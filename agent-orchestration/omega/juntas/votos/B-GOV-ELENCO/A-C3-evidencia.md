# A-C3 — `coordenador-de-acessos` — evidência executada (fatia A, ciclo 2, `B-GOV-ELENCO`)

**Cadeira:** `A-C3` · **Mandato:** separação de poderes e cadeia de autorização (SoD).
**Worktree julgado:** `C:/Users/AMP/Documents/GitHub/ERP_Techsolutios/.claude/worktrees/gov-elenco`
**Regra de isolamento:** worktree somente-leitura, exceto os meus dois arquivos em `votos/B-GOV-ELENCO/`.
Toda mutação em cópia isolada (`mktemp -d` + `cp`), removida ao final.

## §0 · Forma da medição (publicada antes de qualquer número)

```
$ git -C <wt> rev-parse HEAD
d2d25f6b932eb1fd6da17a891cc1774540ae53e2
$ node --version
v20.19.5
$ git config --get core.autocrlf
true
$ git -C <wt> rev-parse --abbrev-ref HEAD
chore/gov-auditoria-elenco
$ git -C <wt> status --porcelain
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-C1-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-C1-voto.json
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-C2-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-C3-evidencia.md
```

**Escopo de código intocado desde o head declarado** (`7facc396..HEAD`, name-only): só
`agent-orchestration/` — briefing, plano do ciclo 2 e os dois arquivos do inspetor. Nenhum caminho de código.

**Cópia isolada** (toda mutação deste voto): `mktemp -d` no scratchpad + `cp` de `scripts/`, `.claude/`,
`.agents/`. Sem `git worktree add`, sem junction, sem symlink, sem `npm ci`. Baseline na cópia reproduz o do
worktree: `23 agentes · 11 skills · 0 BLOQUEIA · 1 AVISO · ec=0`. Removida no fim.

---

# ITEM 1 — a allowlist de escrita é uma decisão VISÍVEL?

## 1.0 · Baseline (worktree e cópia, idênticos)

```
$ node scripts/audit-agents-skills.mjs
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
  [AVISO] C4-bis Bash tolerado · .claude/agents/  (17 papéis, nomeados)
[audit] 0 BLOQUEIA · 1 AVISO
ec=0
```

## 1.1 · (a) Os quatro nomes da allowlist — três são devs/fábrica; **um vota**

`PODE_ESCREVER` (`scripts/audit-agents-skills.mjs` l.123-128), `description` lida arquivo por arquivo:

| nome | `description` (o que ele é) | julga? | evidência |
|---|---|---|---|
| `agente-fabrica` | "Escreve novos agentes durante a rodada" | não | 0 ocorrência de voto/veredito de junta no corpo |
| `dev-mapas` | "Dev da Junta de Mapas… Só atua com plano do planejador-mapas" | não | "Papel 2/3", é o DEV do trio |
| `frontend-pixel-master` | dev de frontend, "retorna código de produção" | não | nenhuma seção de voto |
| **`agente-devops-provisionador`** | "…config-as-code do provedor. **Vota nas juntas de infra.**" | **SIM** | l.3 da própria `description`; corpo tem `## Critério de voto / veto` (l.36) e "**VOTO FAVORÁVEL** só com…" (l.37), "voto justificado" (l.44) |

Origem do papel votante (evidência de data): `git log -S 'Vota nas juntas de infra' -- .claude/agents/agente-devops-provisionador.md`
→ **`fb2e5fdf` · 2026-07-13** · `ci(gate): Ω-GATE — CI roda a suíte inteira + main verde (#174)`. É o **único**
commit do arquivo. `git diff --name-status fe2748c8..HEAD` nos quatro arquivos: **vazio** — o bloco não editou
nenhum deles.

O que a isenção esconde hoje, medido (cópia isolada, tirando **só** esse nome da allowlist):

```
  [BLOQUEIA] C4 §C7.4-bis · .claude/agents/agente-devops-provisionador.md
      ferramentas "Write", "Edit" não são somente-leitura e o papel não está na allowlist de escrita
ec=1
```

## 1.2 · (b) Acrescentar nome aparece no diff — e o que o nome COMPRA

Forma: `new Set([...])` com **um nome por linha** (l.123-128) → acrescentar é um diff de **+1 linha** em
`scripts/audit-agents-skills.mjs`, caminho permitido e revisado. Confirmado no diff do próprio bloco:
`git diff fe2748c8..HEAD -- scripts/audit-agents-skills.mjs` traz as 4 linhas `+` nominais. **Legível: sim.**

O que o nome compra, medido (M-A → M-B, cópia isolada):

| estado | `agente-secops` (papel que JULGA) | BLOQUEIA | ec | N do AVISO `C4-bis` |
|---|---|---|---|---|
| M-A | `tools: Read, Grep, Glob, Bash, **Write**` | **1** (`C4`, nomeando o arquivo) | **1** | 17 |
| M-B | idem + `"agente-secops"` em `PODE_ESCREVER` (+1 linha) | **0** | **0** | **16** |
| revert | — | 0 | 0 | 17 |

Duas propriedades saem daí. (i) O nome compra **isenção total**: `PODE_ESCREVER.has(base)` desliga **C4 inteiro
e o ramo BLOQUEIA do C5** para o papel — qualquer ferramenta, inclusive nome desconhecido, não é medida
(l.361-375). (ii) **O número publicado anda para o lado errado:** autorizar um papel que julga a escrever faz o
N do AVISO **cair** (17 → 16), porque a definição do N é "papéis **fora da allowlist** que carregam `Bash`".
A frase é literalmente verdadeira; o número que um leitor toma como "quantos que julgam podem escrever" diminui
quando alguém ganha mais poder.

## 1.3 · (c) `SOMENTE_LEITURA` deixa passar algo que escreve? — **não**, nome por nome

Sonda no meu próprio papel (`coordenador-de-acessos`, fora da allowlist), uma ferramenta por execução, cópia
isolada, revert entre cada uma:

```
ACEITOS (0 BLOQUEIA · ec=0): Read · Grep · Glob · WebFetch · WebSearch · Bash(tolerado) · os 5 juntos
NEGADOS (1 BLOQUEIA C4 · ec=1): Write · Edit · MultiEdit · NotebookEdit · Task · TodoWrite ·
                                NotebookRead · BashOutput · KillShell · SlashCommand · read · READ · Bash(git:*)
NEGADO por recusa de leitura (1 BLOQUEIA C1 · ec=1): *
trim: "  Read  ,  Grep  " -> 0 BLOQUEIA (a lista é comparada por igualdade exata, após trim)
```

Os cinco nomes de `SOMENTE_LEITURA` não escrevem em disco nem no repositório. `Task` (que geraria subagente
com escrita) é **negado**; a forma com escopo `Bash(git:*)` também é negada (fail-closed na direção certa);
variação de caixa é negada. **Nada que escreva passa pelo `SOMENTE_LEITURA`.**
*Observação declarada, e que eu NÃO cobro:* `WebFetch`/`WebSearch` são canais de **saída** (podem levar
conteúdo para fora), não de escrita no repositório — está fora da propriedade que o §C7.4-bis trata (quem
corrige), e o bloco não afirma nada sobre exfiltração.

## 1.4 · Honestidade da lista (C4-ter) e efeito nos dois sentidos (A-5)

```
dev-mapas fora da allowlist      -> 1 BLOQUEIA C4 "Edit","Write" · ec=1     (allowlist tem efeito)
nome fantasma na allowlist       -> 1 AVISO C4-ter "lista cita papel inexistente" · ec=0
```
A honestidade que o `C4-ter` faz cumprir é de **existência do arquivo**, não de **natureza do papel**: um
papel que vota entra na allowlist sem que checagem nenhuma o note.

## ACHADO A-C3-01 — a exceção de ESCRITA isenta um papel que VOTA, e o bloco não o nomeia

- **gravidade:** `MEDIA` — não derruba nenhuma propriedade declarada da fatia (A-3, A-4 e A-5 fecham por
  execução); é assimetria de honestidade entre as duas exceções do mesmo desenho.
- **escopo:** `pre-existente` **no mecanismo** — o acúmulo "papel que vota em junta com `Write, Edit`" nasce em
  `fb2e5fdf`, **2026-07-13**, único commit de `agente-devops-provisionador.md`, ~2 meses antes deste bloco, e o
  bloco não tocou o arquivo (`git diff --name-status fe2748c8..HEAD` vazio nos 4). A classe é a mesma que
  `P-GOV-BASH-EM-QUEM-JULGA` já registra como pre-existente (2026-08-12).
  **`dentro-do-bloco` na PUBLICAÇÃO** — a linha `PODE_ESCREVER` nasce neste head
  (`git diff fe2748c8..HEAD -- scripts/audit-agents-skills.mjs`): o bloco converteu uma cegueira acidental
  (a regex `JULGA()` não via `agente-*`) numa **isenção nomeada**, e tratou as duas exceções do desenho com
  padrões diferentes — a de `Bash` saiu **nomeada, contada (N=17) e com dono**; a de escrita saiu nomeada,
  **sem N, sem dono e sem dizer que um dos quatro se auto-descreve como votante**.
- **motivo (por que importa, sem propor correção):** o instrumento existe para fazer o §C7.4-bis visível. Hoje
  o número que ele publica sobre "quem julga e pode escrever" **exclui por definição** o caso mais forte —
  `Write` + `Edit` + `Bash` num papel com veto — e **diminui** quando um novo papel que julga é autorizado.
- **não reprova** (§C7.1-ter(a)): mecanismo pre-existente com data; a metade `dentro-do-bloco` é MÉDIA.

**VEREDITO PARCIAL — ITEM 1: PASSA.** Default-deny fecha `C3-A1` e `C3-A2` na parte que lhe cabe: 13 nomes
arbitrários negados, 6 aceitos, allowlist com efeito nos dois sentidos, revert `0 → 1 → 0` na cópia. Um achado
MÉDIA registrado (`A-C3-01`), que não derruba a propriedade.

---

# ITEM 2 — o AVISO do `Bash` é honesto, ou é a exceção virando regra?

## 2.1 · (a) Contei eu mesmo, sem usar o script — **17, e os mesmos nomes**

Contagem independente (`awk` sobre a linha `tools:` do frontmatter, subtraindo os 4 de `PODE_ESCREVER`),
contra a lista que o auditor publica em `--json` (`achados[].papeis`):

```
$ awk '…/^tools:/ … Bash …' .claude/agents/*.md | grep -v -x -e <os 4 da allowlist> | sort   -> 17 nomes
$ node scripts/audit-agents-skills.mjs --json | (achados C4-bis).papeis.length              -> 17
$ diff minha_contagem lista_publicada                                                        -> IDÊNTICAS
```

**O AVISO diz a verdade.** N publicado = N medido = 17; os nomes batem um a um.

Números de contexto que medi para saber o que o 17 significa:

| medida | valor | como |
|---|---|---|
| papéis com `Bash` no elenco inteiro | **20** de 23 | `grep -l '^tools:.*Bash' .claude/agents/*.md \| wc -l` |
| desses, dentro da allowlist (logo, fora do N) | **3** — `agente-devops-provisionador`, `dev-mapas`, `frontend-pixel-master` | idem, por nome |
| dos 17, quantos têm linguagem de voto/veto/veredito no corpo | **17 de 17** | `grep -i 'voto\|veto\|reprov\|aprovad\|veredito\|junta'` em cada um |
| papéis fora da allowlist com `Write`/`Edit`/`MultiEdit`/`NotebookEdit` | **0** | baseline `0 BLOQUEIA` |

## 2.2 · (b) O AVISO não derruba o exit code — honestidade, e o que ela custa

**Não é carve-out do `Bash`.** A separação AVISO × BLOQUEIA é geral no instrumento: 6 sítios `AVISO`
(description curta, `C5` na allowlist, `C4-bis`, `C4-ter`, `C10` abaixo do limiar) contra 23 sítios
`BLOQUEIA`, e o exit é uma linha só — `process.exit(bloqueia.length ? 1 : 0)` (l.664), declarada no cabeçalho
(l.29: *"AVISO nunca derruba o exit"*). O `Bash` entrou pelo canal de severidade que já existia, não por uma
exceção escrita sob medida para ele.

**O que isso custa, medido e dito sem enfeite:** a classe tolerada cobre **100%** da população que ela nomeia
(17 de 17 papéis não-allowlist com `Bash`, todos com linguagem de voto), e a classe que o `C4` **reprova** tem
**0 instância real hoje**. Ou seja: neste head o `C4` reprova nada do que existe e tolera tudo o que existe.
As 13 sondas do item 1 provam que ele **fecha** contra o que ainda não existe — é **barreira de regressão**,
não detector do estado atual. E o exit code não é consumido em lugar nenhum: `grep -rn "audit-agents-skills"
.github/` e `package.json` → **vazios** (leitura para caracterizar o efeito; **não cobro** — é
`P-GOV-AUDITOR-FORA-DA-CI`, pre-existente, e §10.1 do plano).

**Isso esvazia a regra?** Esvaziaria **se o bloco afirmasse que a regra está sendo feita cumprir.** Ele afirma
o contrário, e nos três lugares em que a afirmação vive: no apenso (E3, separando "**por construção** para
`Write/Edit/MultiEdit/NotebookEdit`/desconhecida" de "**por convenção** para `Bash`, N=17"), na pendência
(*"(a) O mecanismo continua ABERTO"*) e no próprio texto do AVISO. A classe de defeito que reprovou o ciclo 1
era **afirmação sem instrumento**; aqui a afirmação foi encolhida até caber no que o instrumento prova. Isso é
honestidade, e é a diferença entre exceção **declarada** e exceção **invisível**.

*Observação declarada, que NÃO cobro:* nada **assere** o N depois do merge — o `17` é critério de junta
(`A-6`), não guard; um 18º papel com `Bash` passaria com `ec=0` e só um humano lendo o AVISO notaria. O guard
exigiria `tests/**` (§5-bis) → §10.1, deferido com dono.
*Segunda observação, também não cobrada:* a pendência registra `dono: bloco de governança de ferramentas de
agente` na linha de status e `a saída é decisão do dono` no adendo. Li os dois sentidos como compatíveis
(quem implementa × quem decide a direção) e **não** transformo ambiguidade de palavra em achado.

## 2.3 · (c) A tensão é real — estou escrevendo isto com `Bash`

Fato, não retórica: este arquivo de evidência e o meu `A-C3-voto.json` estão sendo gravados por
`cat > … <<'EOF'`, porque `coordenador-de-acessos` tem `tools: Read, Grep, Glob, Bash` e o §C7.7 P1/P2 **exige**
que eu grave evidência incremental e voto. Tirar `Bash` de mim me impediria de votar.

Procurei caminho melhor **dentro do escopo desta fatia** (`scripts/audit-agents-skills.mjs`, `.claude/agents/**`,
registro). Os que consegui nomear:

| alternativa | por que não está disponível nesta fatia |
|---|---|
| tirar `Bash` de quem julga | quebra P1/P2 (§C7.7); §10.3 do plano nomeia como reprovação por construção |
| fazer `Bash` = BLOQUEIA | §10.3, corolário explícito: *"cobrar que o AVISO agregado de A-6 seja BLOQUEIA é o mesmo item"*; e deixaria `ec=1` permanente |
| asserir o N mecanicamente | exige `tests/**` → §5-bis → §10.1; deferido com dono |
| conceder `Bash` **escopado** em vez de amplo | **medido:** `tools: Bash(git:*)` → `1 BLOQUEIA C4 · ec=1`, enquanto `tools: Bash` → tolerado. O incentivo do instrumento aponta para a concessão **mais ampla**. **Não asserto** que o `tools:` de subagente aceite a forma escopada no runtime — não medi isso, e afirmá-lo seria hipótese vendida como fato (§A6); registrar a direção do incentivo é o que a medição sustenta |

**Digo, então, o que o mandato pede que eu diga:** a saída escolhida — tolerar, **nomear**, **contar** e
**apontar dono** — é a certa para esta fatia, e **não encontrei caminho melhor dentro do escopo dela**. As três
alternativas óbvias estão vedadas pelo próprio §10 ou pelo protocolo que me obriga a escrever; a quarta eu não
consigo sustentar sem pesquisa que esta fatia não carrega.

**VEREDITO PARCIAL — ITEM 2: PASSA.** O AVISO é honesto (N e nomes reproduzem em contagem independente); a
tolerância usa o canal de severidade geral do instrumento, não um carve-out; e a afirmação publicada foi
encolhida até o tamanho do que a execução prova. Nenhum achado.

---

# ITEM 3 — os papéis do §C7.4-bis foram mesmo distintos neste ciclo?

## 3.1 · O que a autoria do git NÃO prova (dito antes dos números)

```
$ git log --format=... fe2748c8..HEAD
d2d25f6b | thiagodorgo | 2026-09-08 02:05 | docs(junta): tira um CR literal solto do briefing
179557e3 | thiagodorgo | 2026-09-08 02:04 | docs(junta): as 3 ressalvas do inspetor da fatia A
9ee66e3f | thiagodorgo | 2026-09-08 01:45 | docs(junta): briefing da fatia A do ciclo 2
88ff8726 | thiagodorgo | 2026-09-08 01:44 | docs(plano): EMENDA 2 — tres criterios corrigidos DEPOIS de medidos
7facc396 | thiagodorgo | 2026-09-08 01:40 | fix(gov): ciclo 2, fatia A — auditor default-deny, 3a classe de FP, KPI 162
```

**Todos os commits têm o mesmo `author`** — é a identidade git da máquina do dono, não a do agente. Portanto
**a autoria do git não distingue orquestrador de dev**, e eu não a uso como prova. A separação, aqui, vive no
**registro** (arquivos de evidência, briefing, ata) e no **comportamento** — é isso que dá para medir. Registro
a limitação em vez de fingir que o campo de autor diz alguma coisa.

Dois fatos que a ordem dos commits **sim** estabelece: o commit de **código** (`7facc396`, 01:40) vem **antes**
da `EMENDA 2` (`88ff8726`, 01:44). A emenda é literalmente "critério corrigido **depois** de medido" — e o
artefato não esconde isso: diz no próprio título.

## 3.2 · (a) O dev é identidade distinta — e a §2.0 mostra a cadeia de decisão

`DEV-A-evidencia.md` abre declarando o papel ("quem DESENVOLVE… **não julgo a validade de nenhum achado**"),
head de partida próprio (`c0cbfe10`) e forma própria (`v20.19.5`, `autocrlf=true`).

**§2.0** é o teste da cadeia: o dev recebeu uma **decisão de partição do orquestrador** (mandar o
`D-FALLBACK-MODELO-FABLE-OPUS` inteiro para a fatia B) e a **executou**, registrando quem decidiu, o motivo
dado e o efeito item a item. E fez três coisas que só fazem sentido se o papel for outro:

- executou o `A-21` sobre **8** arquivos em vez dos 4 do plano — critério **mais estrito**, nunca mais frouxo;
- **não reescreveu o plano** (quem edita plano é o planejador, §C7.4-bis);
- registrou a consequência **para a junta ver com nome**, em vez de absorvê-la em silêncio.

Conferido também o §5-bis: `ls .claude/agents/` filtrado por dev-gov/c2 → **vazio**. Nenhum arquivo de agente
novo foi criado para o dev, como o plano exige (thread efêmero, não papel permanente).

## 3.3 · (b) O dev julgou algum achado? — **não**, e a busca é negativa

Busca por linguagem de mérito em `DEV-A-evidencia.md` (achado inválido · não procede · discordo do achado ·
o achado está errado · não é defeito) → **vazio**. O que aparece é o oposto (l.4, 222, 261, 353, 358, 363):
*"eu implemento, não julgo"*, *"não declarei o A-17 verde"*, *"não reescrevi o plano"*, *"devolvo ao
orquestrador"*, *"não reabri o mérito de nenhum achado do ciclo 1: implementei os nove"*.

## 3.4 · (c) Os três itens devolvidos — separação funcionando, ou dev empurrando decisão que era dele?

A pergunta se resolve por execução, não por leitura. O dev **recusou** fazer a passada de code span ignorar
linha que pareça cerca, dizendo que seria "código escrito para o teste: uma mudança que, com as duas passadas
vivas, é **no-op**, e só muda o comportamento **do mutante**". **Implementei o atalho que ele recusou**, na
cópia isolada, e medi:

| # | configuração | BLOQUEIA | ec | leitura |
|---|---|---|---|---|
| controle | head intacto | 0 | 0 | baseline |
| ATALHO (i) | atalho ativo, **as duas passadas vivas** | **0** | **0** | idêntico ao baseline: **é no-op** |
| ATALHO (ii) | atalho ativo + **só a passada de cerca morta** | **6** (`skill-creator/SKILL.md`) | **1** | **o A-17 antigo fecharia pela letra** |
| revert | script restaurado | 0 | 0 | volta ao baseline |

A caracterização do dev **reproduz exatamente**: era uma alteração de uma linha, invisível no comportamento
correto, que teria feito o critério fechar. **Ele tinha o atalho na mão, ele o descreveu, e não o usou** — e
escreveu por quê. Isso não é o dev empurrando decisão que era dele: mudar **critério** nunca foi papel dele
(§C7.4-bis), e a única forma de "resolver sozinho" que existia era justamente essa fraude de instrumento.
**A separação funcionou, e é medível.**

## 3.5 · (d) A EMENDA 2 foi assinada pelo orquestrador — afrouxou alguma propriedade?

Reexecutei as mutações (o briefing proíbe aceitar a tabela T1–T7′ do dev sem reexecutar ao menos uma; fiz
quatro), em cópia isolada, com revert conferido em cada uma:

| critério | forma ANTIGA | forma NOVA (EMENDA 2) | o que EU medi |
|---|---|---|---|
| `A-16` | "71 falsos" com a normalização de CRLF morta | "≥1 BLOQUEIA falso, publicando N e forma; esperado **34**" | **34 BLOQUEIA · ec=1**, decompostos em **23 `C1` (agentes) + 11 `C6` (skills)** = **um por arquivo**; revert → 0. **34 = 23 + 11**, o denominador da fatia A |
| `A-17` letra antiga | "só a passada de cerca morta → voltam os **6**" | — | **0 BLOQUEIA · ec=0** — a letra antiga **não fecha**, como o dev registrou |
| `A-17a` | — | "as duas passadas mortas → **exatamente 6**" | **6 BLOQUEIA · ec=1**, todos em `skill-creator/SKILL.md`, nomeando `FORMS.md`, `REFERENCE.md`, `EXAMPLES.md`, `DOCX-JS.md`, `REDLINING.md`, `OOXML.md` — **os seis do enunciado**; revert → 0 |
| `A-17b` | — | "só a passada de cerca morta, fixture de **til** → **exatamente 1**" | fixture com cerca de til montada por mim: controle (duas vivas) → **0**; só a de cerca morta → **1**, nomeando `references/GUIA-TIL.md`; restaurado → **0** |
| `A-25` | description sem "5 de 12", sem "6,6 KB", sem "assento" | não pode creditar o assento; deve dizer que vai para a fatia B | os **três** greps antigos → `false`; e a frase nova diz *"vai inteiro para a fatia B… esta entrada NÃO o publica como entregue"*. **Passa no antigo E no novo** (confirma a A-C1) |

**Resposta à pergunta do mandato:** o que a A-C1 mediu para o `A-25` — passa no antigo **e** no novo — **NÃO**
vale para `A-16` nem para `A-17`: os dois **falham na letra antiga**. Medi por que, em cada um:

- **`A-16`** — o `71` foi produzido pelo parser do ciclo 1, que emitia três achados por arquivo (`name`,
  `description`, `model`); o do ciclo 2 **recusa o arquivo inteiro com um achado**. Minha decomposição
  (23 + 11 = um por arquivo) confirma o mecanismo declarado. A **propriedade** ("o conserto de CRLF é
  load-bearing") sobrevive com folga: 34 falsos sem ele, 0 com ele. O número mudou porque o **instrumento**
  mudou, não porque a trave andou.
- **`A-17`** — a letra antiga é **improvável neste desenho**, e provei a razão sozinho: com só a passada de
  cerca morta o resultado é 0 porque a passada de *code span* casa a mesma crase tripla. As duas passadas
  existem porque o `C3-A4` cobrou duas classes. A forma nova prova **mais**, não menos: `A-17a` reproduz os 6
  exatos do enunciado **e** tem vermelho de controle declarado ("se der 0 com as duas mortas, o conserto é
  decorativo e reprova"); `A-17b` prova o que a forma antiga **queria** e não conseguia — a passada de cerca
  **sozinha** impedindo um falso-positivo (til), onde a outra não alcança.

**Nenhuma propriedade foi afrouxada.** Em `A-17`, a emenda torna o critério **mais** informativo.

## ACHADO A-C3-02 — a emenda é ato de PLANEJAMENTO, e quem a assinou não é o planejador

- **gravidade:** `MEDIA` (não `bloqueia`) · **escopo:** `dentro-do-bloco` — evidência de origem: a `EMENDA 2`
  nasce em `88ff8726`, **2026-09-08**, nesta branch (medido por `git log -S` sobre o plano), quatro minutos
  **depois** do commit de código.
- **o defeito:** o §2 do próprio plano do ciclo 2 reparte os papéis e atribui **planejar** ao
  `planejador-mestre` (Fable), listando o orquestrador como quem "dispara, escreve briefing e ata" e
  inelegível para implementar e votar. **Emendar o plano é planejar.** Quem assinou a `EMENDA 2` é o mesmo
  ator que **achou, planejou e desenvolveu o ciclo 1** — o ciclo reprovado 3×0 — e a emenda reescreve os
  critérios pelos quais a correção desse mesmo ciclo é julgada. É a parte com o maior interesse no resultado
  ajustando a régua depois de ver a medição.
- **por que MÉDIA e não BLOQUEIA:** o §C7.4-bis(b) fala de **código** ("quem achou é quem consertou?"), não de
  critério — então isto é achado de **cadeia de autorização**, não violação literal do texto. E o que
  impediria o dano **está medido por mim**: a emenda está em destaque no topo, datada e assinada; nomeia o
  próprio gesto como suspeito; roteia o julgamento à junta; e **as propriedades sobreviveram à reexecução**
  (§3.5, quatro mutações). Some-se que o dev, que podia ter fechado o `A-17` com uma linha, recusou (§3.4).
- **não proponho correção** (§C7.4-bis).

**VEREDITO PARCIAL — ITEM 3: PASSA.** Os três papéis estão distintos no registro e, mais que isso, **no
comportamento medível**: o dev devolveu três itens sem resolvê-los, recusou o atalho que fecharia o critério
(e eu executei o atalho para confirmar que era mesmo um no-op disfarçado) e não julgou nenhum achado. A
`EMENDA 2` não afrouxou propriedade nenhuma — as 4 mutações que reexecutei batem com a tabela do dev.
Um achado MÉDIA registrado (`A-C3-02`) sobre quem assina emenda de plano.

---

## Limpeza (§C5)

Cópia isolada (`…/scratchpad/ac3-UTe6pO`) e os temporários de mutação **removidos**; conferido por `test -d`
→ não existe mais. Worktree ao fim: `git status --porcelain` só com os arquivos de voto das cadeiras;
`git rev-parse HEAD` = `d2d25f6b932eb1fd6da17a891cc1774540ae53e2` (inalterado); auditor no worktree `ec=0`.
Nada rastreado tocado; nenhum `git worktree add`, junction, symlink ou `npm ci`.

## Fecho

**Itens 1, 2 e 3: PASSAM.** Dois achados `MEDIA` registrados (`A-C3-01`, `A-C3-02`), nenhum `bloqueia`.
Voto em `A-C3-voto.json`.
