# C2 `guardiao-fail-closed` — evidência executada · `B-GOV-ELENCO-ENXUTO`

**Cadeira:** C2 · **Quórum:** maioria de 3 · **Data:** 2026-09-08

## Divulgação obrigatória (R2 do terreno)

Eu votei no **ciclo 1 do `B-GOV-ELENCO`** e o **reprovei** (achados `C2-01`..`C2-07`: enumeração de
vereditos defendida por exclusão, `Bash` em quem julga, anulação sem teto). O diff que julgo agora
**contém** aquele head (`25c0112a`) e o conserto dele (`7facc396`). O inspetor mediu e concluiu que não há
colisão que exija troca de cadeira — os defeitos que ESTE bloco conserta são da `A-C2`
(`inspetor-de-arnes-concorrente`), inelegível. Declaro a participação prévia e sigo.

## Forma da medição

```
$ git -C <wt> rev-parse HEAD
9c0e6ac9df237b5cfe1a6fe1d16d4128861d7d10
$ git -C <wt> rev-parse --abbrev-ref HEAD
chore/gov-elenco-enxuto
$ node --version
v20.19.5
$ git config core.autocrlf
true
$ uname -s
MINGW64_NT-10.0-22631
$ git -C <wt> status --porcelain   (vazio = worktree limpo)
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/C1-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/C2-evidencia.md
$ git -C <wt> diff --name-only adc41a54..HEAD
agent-orchestration/controle/pendencias.md
agent-orchestration/omega/juntas/BRIEFING-B-GOV-ELENCO-ENXUTO.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor-evidencia.md
agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor.md
```

## Sandbox da mutação

Cópia isolada e descartável em
`C:/Users/AMP/AppData/Local/Temp/claude/.../scratchpad/c2-copia` — caminho que **Windows e Git Bash
enxergam** (a armadilha do `mktemp -d` do briefing foi evitada de propósito). Copiados: `scripts/`,
`.claude/agents`, `.claude/skills`, `.agents/agents`, `.agents/skills`. A cópia **não é repositório git**
(sem `--ref`, o auditor lê o disco por `fs`; `git` nunca é invocado). Cada caso: aplica → **relê do disco e
compara com o que foi escrito** → mede → reverte → remede o baseline. Nenhum caso mediu sem confirmação.

**Baseline idêntico nos dois lados** (worktree real, somente-leitura, e cópia):
`23 agentes · 11 skills · 0 BLOQUEIA · 1 AVISO · ec=0`.

---

## ITEM 1(a) — a recusa nomeada REPROVA? · fixture `A-C2-02`

Fixture: comentário no fim da linha `tools:` de `.claude/agents/validador-mestre.md`
(`tools: Read, Grep, Glob, Bash # C2-FIXTURE comentario no fim da linha`), confirmada por `grep` no disco
antes de medir.

```
[BLOQUEIA] C1 recusa de medição · .claude/agents/validador-mestre.md
    não consigo ler o frontmatter — linha 4: `tools:` é escalar plano com ` #` — comentário e
    conteúdo indistinguíveis. ... Não medir REPROVA (`ec=1`).
[audit] 1 BLOQUEIA · 1 AVISO
ec=1
```

**VEREDITO PARCIAL 1(a): PASSA.** `ec=1`, regra `C1 recusa de medição`, **linha nomeada (4)**, e **zero
fabricação**: não há nenhuma acusação `C4` contra uma "ferramenta" chamada `Bash # C2-FIXTURE…`. O
`A-C2-02` está fechado. Efeito colateral coerente: o AVISO do `Bash` caiu de 17 para 16 papéis — o arquivo
recusado **sai da contagem**, que é o que "não medi este arquivo" tem de significar.

---

## ITEM 1(b) — a supressão vira fail-OPEN?

Três mutações em que o arquivo recusado **esconde um defeito real**:

| # | Mutação | Defeito escondido | Saída | `ec` |
|---|---|---|---|---|
| `1b-01` | `tools: Read, Write, Edit # comentario` em `validador-mestre.md` | `C4` (`Write`,`Edit` em não-escritor) | só `C1 recusa`, linha 4 | **1** |
| `1b-02` | `name: NOME-QUE-NAO-BATE` + `model: opus` + `tools: … # comentario` em `planejador-mestre.md` | `C2` (name≠arquivo) **e** `C3` (contrato exige `model:fable`) | só `C1 recusa`, linha 5 | **1** |
| `1b-03` | idem numa **skill** (`.claude/skills/cloud-architect/SKILL.md`), `name` errado + `Write` | `C7` (name≠pasta) | só `C6 recusa`, linha 4 | **1** |

Os defeitos **ficam mesmo escondidos** — a supressão é real e faz o que promete. Ela é **segura porque a
recusa já reprova**: procurei caminho em que a recusa saísse como `AVISO` ou em que o arquivo recusado
deixasse de contar, e **não existe** — `lido.erro` tem exatamente dois consumidores
(`audit-agents-skills.mjs:421` agentes e `:557` skills) e **os dois emitem `BLOQUEIA` incondicional**, sem
ramo, sem flag, sem gravidade calculada. O terceiro consumidor (`:620`, `C10`, `lido.campos?.description ??
""`) trata o recusado como 0 byte, mas `C10` só existiria para **subir** gravidade, e o `ec` já é 1.

**VEREDITO PARCIAL 1(b): PASSA.** A supressão não abre fail-open **enquanto** a recusa for `BLOQUEIA`
incondicional. Registro a dependência: se algum dia a recusa virar `AVISO`, **todo defeito de um arquivo
recusado some junto** — hoje isso não é caminho alcançável, é acoplamento nomeado.

---

## ITEM 1(c) — a fronteira do subconjunto declarado: recusa ou SILÊNCIO?

16 construções fora do subconjunto, **uma por mutação**, todas revertidas com baseline `ec=0` reconfirmado:

| # | Construção | Resultado | `ec` | |
|---|---|---|---|---|
| `1c-01` | `tools: [Read, Write]` (fluxo) | `C1 recusa`, linha 4 | 1 | fecha |
| `1c-02` | `tools: &t Read, Write` (âncora) | `C1 recusa`, linha 4 | 1 | fecha |
| `1c-03` | `tools: !!str Write` (tag) | `C1 recusa`, linha 4 | 1 | fecha |
| `1c-04` | chave `tools:` **duplicada** (Read, depois Write) | `C1 recusa`: "chave `tools:` repetida" | 1 | fecha |
| `1c-05` | lista `tools:` com recuo de **1 espaço** + `Write` | `C1 recusa`, linha 5 | 1 | fecha |
| `1c-06` | lista `tools:` com recuo de **TAB** + `Write` | `C1 recusa`, linha 5 | 1 | fecha |
| `1c-07` | **BOM** UTF-8 no início | mede normal, sem achado | 0 | declarado no cabeçalho |
| `1c-08` | **`description: # TODO preencher`** | **`AVISO` description curta (16 chars)** | **0** | **BURACO** |
| `1c-09` | `tools: "Read, Bash # x"` (aspas) | `C1 recusa`: item `"Bash # x"` não é nome legível | 1 | fecha |
| `1c-10` | `tools:` como **mapa aninhado** com `Write` | `C1 recusa`: item `"Read: true Write: true"` | 1 | fecha |
| `1c-11` | `Tools:` **maiúsculo** com `Write` | `BLOQUEIA C5 sem tools — herda TUDO` | 1 | fecha |
| `1c-12` | plain **multi-linha** em `tools` (`Read` + `  Write`) | `C1 recusa`, linha 5 | 1 | fecha |
| `1c-13` | forma **escopada real do Claude Code** `Bash(git diff:*)` | `C1 recusa`: item não é nome legível | 1 | fecha |
| `1c-14` | `tools: ""` | `BLOQUEIA C5 sem tools` | 1 | fecha |
| `1c-15` | frontmatter fechado com `...` em vez de `---`, com `Write` dentro | `BLOQUEIA C1 frontmatter ausente` | 1 | fecha |
| `1c-16` | chave `tools:` **recuada** dentro do frontmatter, com `Write` | `C1 recusa`, linha 4 | 1 | fecha |

**15 de 16 fecham.** Todas as construções que o briefing nomeia (aspas, `|`/`>`, multi-linha, lista em
bloco, chave duplicada, BOM, indentação) caem na recusa ou num `BLOQUEIA` legítimo. **A exceção é o
`1c-08`, e é silêncio-que-vira-verde** — está detalhado como achado `C2E-01` abaixo.

---

## ITEM 2 — o corte do `C8` não abriu buraco

**(a) O corte é real.** Injetei quatro links quebrados de uma vez em `.claude/agents/validador-mestre.md`
**e** em `.claude/skills/cloud-architect/SKILL.md` — destino inexistente, **destino com espaço** (que era o
`A-C2-05`, o único fail-OPEN medido em toda a auditoria), destino CommonMark entre sinais de menor/maior e
travessia `../../../`. Fixture confirmada nos dois arquivos antes de medir:

```
[audit] alvo: árvore de trabalho · 23 agentes · 11 skills
[audit] 0 BLOQUEIA · 1 AVISO
ec=0
```

**0 achados, `ec=0`.** A checagem não existe mais. `A-C2-03` e `A-C2-05` estão fechados **por remoção**,
não por conserto — que é exatamente o que o dono decidiu.

**(b) Nada mais dependia daquelas funções.** `semCercas`, `semCodeSpans`, `semComentariosHtml`,
`embranquecer`, o regex `LINK` e a string `C8` **só aparecem em COMENTÁRIO** (linhas 27, 31–40, 532–534) —
nenhuma ocorrência em código. Rodei uma varredura de identificador declarado-e-não-usado sobre o arquivo
inteiro: **nenhuma função órfã** ficou para trás.

Confronto entre o que o cabeçalho promete e o que **de fato emite achado** (extraído das 25 chamadas
`add()`): `C0` · `C1` (recusa + frontmatter) · `C2` · `C3` · `C4` · `C4-bis` · `C4-ter` · `C5` · `C6`
(recusa + raiz + frontmatter) · `C7` · `C9` · `C10`. **Nenhum `C8`, e nenhuma checagem prometida faltando.**
O corte não desativou vizinho em silêncio.

**(c) O `C0` sobreviveu**, e em três formas:

| Alvo | Saída | `ec` |
|---|---|---|
| `--ref 0f17135a` (commit **raiz** do repositório) | `C0 alvo vazio · 0 agentes e 0 skills` | **1** |
| cópia com `.claude/agents` **e** `.claude/skills` vazios | `C0 alvo vazio` | **1** |
| cópia com **só os agentes** vazios (11 skills presentes) | `C0 alvo vazio · 0 agentes e 11 skills` | **1** |

O piso pega o vazio **total e o parcial** (a condição é OU, não E), nos dois modos de leitura (`--ref` pelo
blob e árvore de trabalho pelo `fs`). Com menos checagens, "verde vazio" ficaria mais barato — e não ficou.

*Observação sem gravidade:* na terceira linha o texto diz "**nada** foi auditado — 0 agentes e 11 skills"
quando 11 skills foram auditadas. Cosmético, e erra para o lado seguro (`BLOQUEIA`).

*Nota:* `C10` **não emite neste head** — `.claude/agents/especialistas/` não existe mais (os 15 foram
aposentados). Não há peso a medir; não é silêncio, é conjunto vazio.

---

## ITEM 3 — o `C4`/`C5` default-deny sobreviveu ao corte

11 mutações próprias (não reaproveitei as 16 do ciclo anterior):

| # | Mutação | Saída | `ec` |
|---|---|---|---|
| `3-01` | papel **de nome qualquer** (`zzz-papel-inventado`, casa prefixo nenhum) com `Write`, espelho junto | `BLOQUEIA C4 §C7.4-bis` — "Write não é somente-leitura" | **1** |
| `3-02` | `MultiEdit` (a que passava limpo na v1) | `BLOQUEIA C4` nomeando `MultiEdit` | **1** |
| `3-03` | `FooTool` inventada | `BLOQUEIA C4` nomeando `FooTool` | **1** |
| `3-04` | `NotebookEdit, TodoWrite, Task, SlashCommand, KillShell, BashOutput` | `BLOQUEIA C4` nomeando **as seis**, num achado só | **1** |
| `3-05` | `tools:` **ausente** em não-escritor | `BLOQUEIA C5 — herda TUDO, inclusive escrita` | **1** |
| `3-06` | `agente-fabrica` (**dentro** da allowlist) com `Write, Edit, Bash` | **0 BLOQUEIA** — não é acusado | 0 |
| `3-07` | `dev-mapas` (**dentro** da allowlist) sem `tools:` | `AVISO C5` | 0 |
| `3-08` | não-escritor só com `Read, Grep, Glob, WebFetch, WebSearch` | **0 BLOQUEIA** — sem falso positivo | 0 |
| `3-09` | papel novo **só** no `.claude` com `Write` | `BLOQUEIA C4` **mais** `BLOQUEIA C9 sem par` | **1** |
| `3-10` | papel novo **só** no espelho `.agents` com `Write` | `BLOQUEIA C9 órfão` | **1** |
| `3-11` | papel novo com `Read, Bash` (não-escritor) | `AVISO C4-bis` (17 vira 18 papéis) | **0** |

**O membro não previsto nasce NEGADO.** A pergunta que me define — *"acrescenta-se o próximo membro e
esquece-se de classificá-lo: nega ou permite?"* — tem resposta medida, enumeração por enumeração:

- `SOMENTE_LEITURA` (`audit-agents-skills.mjs:158`) — ferramenta nova **NEGA** (8 nomes atacados, 8 negados,
  nenhum ignorado);
- `PODE_ESCREVER` (`:150`) — papel novo **NEGA** (nasce não-escritor e passa a ser medido);
- `tools:` ausente **NEGA**. Não há `else` que permita, não há `?? true`, não há allowlist vazia
  significando "tudo".

Nenhuma das duas é derivada por exclusão: são **allowlists literais**, curtas e visíveis no diff — sem
`Exclude`, sem `.filter(x => !outro.includes(x))`, sem "união igual ao conjunto de origem". **Não há guard
tautológico aqui**: cada uma das 11 mutações mudou o resultado, ou seja, todas as asserções **podem** falhar,
e falharam quando atacadas.

### O `AVISO` do `Bash` — honestidade declarada, ou exceção esvaziando a regra?

`3-11` mede o pior caso: **papel de junta novo, nascido com `Bash`, sai `ec=0`**. Nessa aresta o default é
*permitir*. Julgo que, **dentro do escopo desta fatia**, é a saída certa — e digo por quê com mecanismo, não
com deferência:

1. `TOLERADA_COM_AVISO` (`:166`) tem **um** membro literal e **não absorve membro novo** — provado em
   `3-02`/`3-03`/`3-04`: oito ferramentas desconhecidas caíram todas em `BLOQUEIA`. A exceção não cresce
   sozinha; um segundo nome ali seria linha de diff.
2. O aviso **nomeia, conta e lista** os 17 papéis, e aponta dono (`P-GOV-BASH-EM-QUEM-JULGA`). O número
   **se move com a realidade**: 17 no baseline, 16 quando um arquivo é recusado, 18 com o papel novo de
   `3-11`. Não é texto congelado — é medição.
3. Não há saída melhor **dentro desta fatia**: `BLOQUEIA` deixaria o auditor permanentemente vermelho em 17
   papéis, e vermelho constante é vermelho nenhum; e remover o `Bash` quebraria o §C7.7 P1/P2, que é o
   protocolo sob o qual **eu mesmo estou escrevendo este arquivo agora, com `cat >`**. Declaro o conflito de
   interesse: sou um dos 17 nomeados na lista.

O buraco é real e é **do dono**, não do bloco: quem julga escreve. O bloco não o fechou e **também não
fingiu** ter fechado — que é a diferença entre este ciclo e o `C3-A2` do ciclo 1, onde a frase
*"§C7.4-bis respeitado por construção"* era falsa.

---

## Mapa das cópias da autoridade — e quem vence na divergência

**Autoridade "quem pode escrever":**

| # | Onde | O quê |
|---|---|---|
| 1 | `scripts/audit-agents-skills.mjs:150-155` | `PODE_ESCREVER` — 4 nomes literais |
| 2 | `.claude/agents/*.md`, chave `tools:` | a concessão real |
| 3 | `.agents/agents/*.md` (espelho Codex) | **gerado**; o `tools:` é **removido** na transformação (`scripts/sync-agent-agents.mjs:8-11`, `D-INTEROP`, 2026-07-28) |

**Uma única autoridade, com concordância imposta por mecanismo que falha sozinho.** Medido: editei à mão
`.agents/agents/validador-mestre.md` injetando `tools: Read, Write, Edit`; o
`node scripts/sync-agent-agents.mjs --check` respondeu `[agents-sync] DIVERGE` com **`ec=1`**, e esse guard
roda na CI (`.github/workflows/ci.yml:69-70` — leitura para mapear a autoridade, não cobrança de escopo).
O auditor sozinho é cego a isso (`ec=0`), e **não precisa** ver: o espelho não é uma segunda verdade, é
projeção regenerável de `.claude/agents/`. Baseline do guard no worktree real:
`OK — 23 agentes, espelho consistente`, `ec=0`.

**Autoridade "qual papel tem modelo fixado":**

| # | Onde | O quê |
|---|---|---|
| 1 | `scripts/audit-agents-skills.mjs:128-132` | `MODELO_FIXADO` — **3 nomes literais** |
| 2 | `CLAUDE.md:437` e `AGENTS.md:465` (§C7 item **6-bis**, NOVO neste bloco) | *"os gates da junta e o planejador-mestre têm model: fable fixado"* — uma **categoria**, não uma lista |
| 3 | `model:` no frontmatter de cada agente | o valor real |

Aqui a mesma verdade vive em **dois literais e uma prosa**, e **nada falha quando divergirem** (`C2E-02`).

---

## ACHADOS

### `C2E-01` — a chave excluída da recusa **cancela** uma acusação verdadeira (fail-OPEN de `ec`)

**gravidade: MÉDIA · escopo: `dentro-do-bloco` · NÃO bloqueia**

`audit-agents-skills.mjs:227` declara: *"As chaves cujo VALOR o auditor transforma em ACUSAÇÃO — e só elas"*,
e exclui `description` com a justificativa (`:220-225`) de que *"um comentário absorvido no fim não consegue
virar acusação nenhuma"*, reforçada em `:263-264`: *"em description a leitura errada não vira acusação"*.

**Mutação `1c-08`, executada:** frontmatter com `description: # TODO preencher`.

```
[AVISO] C1 frontmatter · .claude/agents/validador-mestre.md
    description curta (16 chars)
[audit] 0 BLOQUEIA · 2 AVISO
ec=0
```

Em YAML real, `description:` seguida só de comentário é **valor nulo** — e a regra do próprio auditor
(`:445`) para esse caso é `BLOQUEIA "sem description: — o agente não é roteável"`. O parser lê o comentário
como se fosse o conteúdo, e o `BLOQUEIA` vira `AVISO`: **verde onde cabia vermelho.**

**A propriedade ausente, nomeada:** `description` **é** transformada em acusação (`:445`, `BLOQUEIA`) e **não
está** em `CHAVES_MEDIDAS_POR_VALOR` — logo a asserção de `:227` ("e só elas") é **falsa por medição**, e a
justificativa da exclusão é **unidirecional**: verifica que um comentário não consegue **criar** um
diagnóstico falso, e não verifica que ele consegue **cancelar** um verdadeiro. Não existe mecanismo que force
a concordância entre "conjunto de chaves protegidas pela recusa" e "conjunto de chaves que viram acusação";
a coincidência é mantida à mão.

**Por que MÉDIA e não bloqueante — com os números:**
- **prevalência 0 nos dois alvos medidos.** `description` que é só comentário: **0** em `HEAD` (40 arquivos
  `.md` sob `.claude/`) e **0** em `fe2748c8` (55 arquivos);
- fica **fora do caminho de autorização de escrita** — `name`, `model` e `tools` recusam corretamente (16
  construções atacadas, 15 fecham). O efeito é sobre *roteabilidade*, não sobre privilégio;
- **não vira silêncio total:** o arquivo continua na saída, nomeado, com um `AVISO` absurdo de "description
  curta (16 chars)". O fail-open é do **exit code**, não do relatório;
- a medição que o bloco declara para justificar a exclusão **confere**: `description` contendo espaço-cerquilha
  aparece em exatamente **5** arquivos de `fe2748c8`, todos `especialistas/jurado-c5-*` — os mesmos que esta
  faxina aposenta — e em **0** no `HEAD`. A diligência foi real; faltou a segunda direção.

### `C2E-02` — `MODELO_FIXADO` é lista de obrigação sem mecanismo: gate novo nasce NÃO CONFERIDO

**gravidade: MÉDIA · escopo: `dentro-do-bloco` · NÃO bloqueia**

**Mutação `M-01`, executada:** papel novo `zzz-gate-novo` com `model: sonnet`, `tools: Read, Grep`, espelho
criado junto.

```
[audit] alvo: árvore de trabalho · 24 agentes · 11 skills
[audit] 0 BLOQUEIA · 1 AVISO
ec=0
```

**Silêncio total sobre o modelo.** O `C3` só confere os 3 nomes escritos em `MODELO_FIXADO` (`:128-132`);
para os demais não há default — há ausência. Contraste na mesma bateria: `M-02` (`planejador-mestre` com
`model: sonnet`) e `M-03` (sem linha `model:`) dão **`BLOQUEIA C3`**, `ec=1`. O guard funciona **para quem
está na lista**, e não pode falhar para quem não está.

**Quem vence na divergência: o lado permissivo.** Se o §C7.6-bis passar a chamar de gate um papel que
ninguém acrescentou a `MODELO_FIXADO`, o auditor sai **verde** — justamente para o gate mais novo. Isso
contradiz o texto que este bloco acabou de escrever no contrato: *"gate degradado é pior que gate ausente:
a ausência seria visível; a degradação não"* (`CLAUDE.md:449-451`).

**Cobertura existente, e o que ela não cobre:** `C4-ter` (`:518-527`) pega **a direção inversa** — nome na
lista sem arquivo. Confirmado pela mutação `M-04` (apaguei `porteiro-pos-merge.md` e o espelho):
`AVISO C4-ter lista cita papel inexistente`, `ec=0`. Nada pega a direção "contrato fixa, lista omite".

**Por que MÉDIA e não bloqueante:** divergência **0 hoje** — `MODELO_FIXADO` tem exatamente os 3 papéis que o
contrato nomeia (§C2.8 porteiro, §C7.1-bis inspetor, §C7.6 planejador) e exatamente os 3 que trazem
`model: fable` no frontmatter (o quarto `model:` do repo é `frontend-pixel-master: inherit`, que o contrato
não menciona em lugar nenhum — conferido por grep nos dois arquivos). A direção da falha é **sub-aplicação de
obrigação**, não escalada de permissão: nenhum papel ganha poder por causa disso. Registro que o auditor **já
sabe declarar essa limitação quando quer** — o `C10` a declara por escrito (`:610-614`,
`P-GOV-C10-ENCERRADO`); o `C3` não declara nenhuma.

### `C2E-03` — `Bash` em quem julga: aresta permissiva, mas nomeada, contada e com dono

**gravidade: BAIXA · escopo: `pre-existente` · NÃO bloqueia**

Evidência de origem: o achado é do **ciclo 1** do bloco anterior (`C3-A2`, ao qual duas cadeiras chegaram
independentemente) e está registrado como `P-GOV-BASH-EM-QUEM-JULGA` no dossiê ao dono
(`agent-orchestration/omega/DOSSIE-B-GOV-ELENCO.md` §7, 2026-09-08), **antecedendo esta branch**. Fechá-lo
exige decisão do dono, não código. Análise completa no ITEM 3 acima.

### `C2E-04` — texto do `C0` diz "nada foi auditado" com 11 skills auditadas

**gravidade: BAIXA · escopo: `dentro-do-bloco` · NÃO bloqueia** — cosmético, e erra para `BLOQUEIA`.

---

## O que ficou SEM executar (declarado)

1. **Não rodei o auditor na CI** — ele não está lá, e exigi-lo seria `P-GOV-AUDITOR-FORA-DA-CI` (reprovação
   por construção). Rodei só o `sync-agent-agents --check`, para mapear a autoridade do espelho.
2. **Não auditei a faxina** (32 renames, 30 deleções, índice do Codex, backfill do #380) — é da cadeira `C1`.
   Só constatei o efeito colateral dentro do meu escopo: sem `especialistas/`, o `C10` não emite.
3. **Não julguei** `.github/**`, `tests/**`, `.gitignore`, o assento permanente (`§C7.1-quater`, que não
   existe na `main` nem aqui), nem a volta da checagem de link (`P-GOV-AUDITOR-SEM-CHECAGEM-DE-LINK`).
4. **Não exercitei o modo `--json`** contra as mutações — só o modo texto e o `ec`. Os dois saem da mesma
   lista `ordenados` e do mesmo `process.exit`, mas isso é leitura minha, não medição.
5. **Não medi sob `core.autocrlf=false`.** Tudo rodou com `autocrlf=true`, que é a configuração desta máquina
   e o caso que já fabricou divergência nesta trilha.

## Limpeza e isolamento

40 mutações, **todas em cópia descartável** (`c2-copia`, `c2-vazio`, `c2-meio` no scratchpad da sessão), cada
uma confirmada no disco antes de medir e revertida depois, com o baseline `ec=0` reconfirmado a cada
reversão. **Nenhuma mutação tocou o worktree**: as únicas execuções ali foram somente-leitura
(`node scripts/audit-agents-skills.mjs [--ref]`, `sync-agent-agents.mjs --check`, `git`). `git status` do
worktree contém apenas os arquivos de voto permitidos. Não usei `git worktree add`, junction nem `npm ci`.

---

## VEREDITO

| Item | Resultado |
|---|---|
| 1(a) a recusa reprova, sem fabricar nome | **PASSA** — `ec=1`, `C1 recusa`, linha nomeada, zero fabricação |
| 1(b) a supressão não vira fail-open | **PASSA** — recusa é `BLOQUEIA` incondicional nos 2 consumidores; não há caminho para `AVISO` |
| 1(c) a fronteira recusa em vez de silenciar | **PASSA com ressalva** — 15/16; o furo é `C2E-01`, fora das 3 chaves protegidas |
| 2(a) o corte do `C8` é real | **PASSA** — 0 achados, `ec=0` |
| 2(b) nada mais dependia daquelas funções | **PASSA** — só comentário; nenhuma função órfã; lista prometida igual à emitida |
| 2(c) o `C0` sobreviveu | **PASSA** — dispara no vazio total e no parcial, nos 2 modos |
| 3 default-deny sobreviveu | **PASSA** — 11/11; membro novo nasce NEGADO em todas as enumerações de privilégio |

O bloco entrega a propriedade que prometeu: **na omissão, o auditor fica vermelho, e em runtime o membro não
previsto é recusado**. As duas falhas que achei (`C2E-01`, `C2E-02`) são latentes (prevalência 0 medida), ficam
**fora do caminho de autorização de escrita** e não falsificam o mecanismo central — falsificam uma **frase de
apoio** sobre por que a exclusão de `description` seria segura, e a **completude** de uma lista de obrigação.
Viram pendência nomeada, não veto.

**VOTO: A FAVOR** — fail-closed provado por mutação.
