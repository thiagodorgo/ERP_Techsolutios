# A-00 · PARECER DO INSPETOR DE TERRENO — `B-GOV-ELENCO`, ciclo 2, fatia A

**Evidência executada:** `agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/A-00-inspetor-evidencia.md`
(496 linhas, comando + saída + veredito parcial de cada item).

---

## Modelo (obrigatório — `D-FALLBACK-MODELO-FABLE-OPUS`)

| | |
|---|---|
| **Papel** | `inspetor-de-terreno-da-junta` (gate de start; não vota mérito, não conserta) |
| **Modelo que rodou** | **Opus** (`claude-opus-5[1m]`) |
| **Modelo do contrato** | **Fable** — `model: fable` no frontmatter, conferido no head: `.claude/agents/inspetor-de-terreno-da-junta.md` |
| **Por que o Fable faltou** | **Limite da conta esgotado.** O disparo anterior deste mesmo papel morreu com `rate_limit` HTTP 429, `model sent to the API: claude-fable-5-1`, mensagem "You've reached your Fable limit" |
| **Autorização** | Decisão do dono de 2026-09-07 (`D-FALLBACK-MODELO-FABLE-OPUS`), que autoriza **exatamente um** substituto — Opus — e **exige** declaração |
| **Frontmatter** | **PERMANECE `fable`** (medido: `grep '^model:'` → `model: fable`). O fallback é do **invocador**; volta ao Fable quando o limite renovar |

**Esta é a primeira aplicação real da política.** O mandato pede que, se eu achar a política mal desenhada,
isso entre como achado de terreno. Entra — em §6 deste parecer, com o que medi.

---

## VEREDITO

# LIBERADO COM RESSALVA

A junta da fatia A **pode começar**. O tabuleiro está limpo no que importa para o voto valer: worktree sem
mutação viva, heads conferidos, escopo pós-código verdadeiro, isolamento declarado por escrito, ferramenta
provada read-only, inelegibilidade limpa, espelho Codex consistente e baseline honesto (substituto, com
justificativa por identidade de árvore — não por conveniência).

**Nada aqui é bloqueio.** As ressalvas abaixo são de **ambiguidade de tabuleiro** e de **instrumento**, e o
seu lugar é o briefing das cadeiras, em destaque — não a minha mão (§C7.4-bis: quem inspeciona não arruma).

### Resumo por item

| Item | O que foi provado | Resultado |
|---|---|---|
| 1 · tabuleiro/isolamento | `status --porcelain` vazio antes de eu escrever; `9ee66e3f` / `7facc396` / `fe2748c8` / branch conferem; `diff 7facc396..HEAD` fora de `agent-orchestration/` = **0**; 4 arquivos centrais com hash igual ao blob do head; isolamento declarado (l.62-69); auditor sem nenhuma API de escrita; zero container `jur-*`, zero probe, zero junction | **VERDE** |
| 2 · inelegibilidade/EMENDA 2/assento | 3 cadeiras ausentes das atas deste bloco (aparecem só como objeto medido); EMENDA 2 na **linha 1**, assinada, nomeando os 3 critérios; briefing manda julgá-la; exceção do assento **medida e verdadeira** (§C7.1-quater e `D-CADEIRA-PERMANENTE-JUNTA` **não existem** na `main`; o agente do assento só existe na fatia B) | **VERDE** + 2 ressalvas fortes |
| 3 · baseline/escopo | auditor `ec=0` com **1 AVISO**; `sync-agent-agents --check` e `sync-agent-skills --check` `ec=0` (recursivos); `node --check` `ec=0` em 5 arquivos; §5-bis verdadeiro por diff **e** por identidade de árvore (`src/ tests/ prisma/ frontend/ mobile/ .github/` + `package.json`/lock **idênticos** à base); `D-FALLBACK` intacto na fatia B (`grep -c '6-bis'` = 3) | **VERDE** |

---

## Ressalvas nomeadas — para o briefing das cadeiras, em destaque

### R1 (FORTE) · O §7 do plano contradiz a EMENDA 2, sem nenhum ponteiro

A EMENDA 2 está na **linha 1** e é impecável quanto à visibilidade. Mas o corpo do plano **não foi anotado**:

- l.520 `A-16` ainda diz "**71** no ciclo 1" (a emenda diz **34**);
- l.521 `A-17` ainda diz "cópia sem a remoção de cercas → voltam os **6** falsos" (a emenda a substituiu por
  `A-17a`/`A-17b`, porque essa mutação dá **0**);
- l.529 `A-25` ainda testa a **palavra** "assento" (a emenda passou a testar a substância).

`sed -n '494,557p' | grep EMENDA` não devolve nenhuma referência à emenda — só ocorrências de `EMENDA-1` que
significam **outra coisa** (a emenda à decisão `D-CADEIRA-PERMANENTE-JUNTA`, §6/§7-B). O §9.1 manda
`A-16`/`A-17` para **A-C2** e `A-25` para **A-C1**, e o briefing manda ler "§7 (critérios)".

**O risco é concreto e assimétrico:** uma cadeira que meça `A-17` **como escrito no §7** obtém 0, e reprova
o bloco por um critério que o orquestrador já reconheceu como mal formulado — **no ciclo em que não há
ciclo 3**. **O que precisa acontecer:** o briefing dizer, com as linhas, que a EMENDA 2 **substitui** os
enunciados de `A-16`, `A-17` e `A-25` do §7, e que a colisão de nome "EMENDA-1" (topo × §6/§7-B) é aparente.

### R2 (FORTE) · O briefing não declara como cada identidade é carregada (§9.4-4)

`grep -niE 'corpo carregado|carregad|md5|blob do head|subagente'` no briefing → **vazio**. O §9.4-4 do plano
diz que "o inspetor bloqueia sem eles". **Não bloqueei porque medi o fato que a exigência protege, e ele é
verde nas duas hipóteses de carga:** os corpos das três cadeiras no worktree são idênticos ao blob do head
**e** idênticos em conteúdo aos da árvore principal — seja qual for o `cwd` do disparo, o corpo julgado é o
corpo que roda. **O que precisa acontecer:** o briefing declarar a forma de carga. Se o orquestrador disparar
de outro `cwd`, ou se alguém editar `.claude/agents/` na árvore principal (que tem trabalho não-commitado de
outra sessão), **a minha prova caduca** e o item volta a ser bloqueante.

### R3 (FORTE, e crítica para a FATIA B) · `md5sum` fabrica divergência sob `core.autocrlf=true`

Rodei a receita do §9.4-4 (`md5sum` dos dois lados) e ela acusou **DIVERGE nas três cadeiras**. É **falso**:
`git hash-object` dá o **mesmo** hash nos dois lados e o `diff` normalizado (`tr -d` do CR) dá **0 linhas**;
`file` mostra CRLF de um lado e não do outro. Mesma classe do `git archive`+`tar` que o
`D-JUNTA-ESCOPO-E-CALIBRACAO`(c) proibiu — e que já custou uma pendência ALTA fechada por não-reprodução.

**Onde isso morde:** na fatia B, "**divergência no corpo do assento = BLOQUEADO**". Com `md5sum`, a fatia B
bloqueia por artefato de line-ending. **O que precisa acontecer:** trocar a receita por `git hash-object`
(ou `diff` normalizado) no §9.4-4 do plano — e, quando o dono quiser, no §1.1 do meu próprio cartão de papel,
que prescreve o mesmo instrumento errado. **Não corrijo nenhum dos dois: nomeio.**

### R4 · `git show <ref>:<caminho/com/barras>` falha no Git Bash desta máquina

O MSYS converte o `:` em `;` e as `/` em `\`, e o git responde `fatal: ambiguous argument`. Reproduzi os dois
lados: com `export MSYS2_ARG_CONV_EXCL='*'`, funciona. Os critérios `A-15`, `A-22` e `A-27` usam exatamente
essa forma. **Uma cadeira sem a variável pode ler o `fatal:` como "o blob não existe" e reportar ausência
falsa.** Vai no briefing como nota de forma.

### R5 · O baseline substituto não afirma o verde absoluto da `main`

Provei que o bloco **não pode** ter mexido na suíte: `src/ tests/ prisma/ frontend/ mobile/ .github/` e
`package.json`/lock são **o mesmo objeto de git** na base e no head. Não medi — e não é mensurável aqui sem
instalar `node_modules` — se `fe2748c8` está verde em termos absolutos. **A junta não deve publicar
"repositório verde" a partir de "o bloco não mexeu".** As 4 suítes do dev (16/16 · 6/6 · 6/6 · 12/12) são
insumo **dele**, a re-verificar por A-C1 no `A-24`; **eu não as re-executei**.

### R6 · O briefing herda três medições do ciclo 1 como fato, sem a marca "A RE-VERIFICAR"

Briefing l.24-25: "a faxina passou inteira no ciclo 1 (A1–A10 verdes, 32/32 renames por hash, 15/15
aposentadorias)". `grep -ic 're-verificar'` no briefing → **0**, contra o §9.4-5 do próprio plano e o §2.1 do
meu mandato. **Não bloqueia** porque o critério `A-22` obriga a **re-executar** o roteiro (32/32, 30 D = 15×2,
15/15 corpos) e está atribuído a **A-C1**. **Mas a justificativa do fatiamento repousa nessa herança** — e
quem ler o briefing sem o §7 a recebe sem aviso. Precisa da marca.

### R7 · A exceção do assento é bem fundamentada — e o briefing declara a razão mais fraca

**Minha leitura: não é o bloco fugindo do próprio gate.** Medi: `§C7.1-quater` = **0** ocorrências em
`origin/main:CLAUDE.md`; `D-CADEIRA-PERMANENTE-JUNTA` = **ausente** de `decisoes.md`; o agente
`cadeira-permanente-backend-review` **não existe** na `main` nem neste head — existe **só** em
`chore/gov-elenco-fatia-b`. O assento **é o entregável da fatia B**; convocá-lo aqui seria fazer um artefato
ainda não julgado homologar a fatia que o antecede.

**Duas notas honestas:** (i) o assento **homologou o ciclo 1 deste mesmo bloco** ("homologação nº 1", ata
l.24/l.38) sob **o mesmo** estado do contrato — logo "a regra ainda não existe" não explica sozinha a
mudança; o fundamento forte é que, ao **re-escopar `C2-01`**, ele virou "**quem achou**" (tabela do briefing
l.90) e ficou **inelegível**. O briefing tem os dois fatos e **não os conecta**. (ii) O §3.3 do **meu cartão**
manda BLOQUEAR por ausência do assento, citando duas normas que **medi não existirem** no repositório em
vigor. **Registro a divergência em vez de escolher um lado em silêncio (§A2):** se o dono ler o §3.3 como
ordem autônoma, este parecer vira **BLOQUEADO** por esse único item; pela medição do contrato em vigor, não vira.

### R8 (informativa) · As cadeiras — e eu — somos objeto do artefato julgado

O AVISO agregado que a fatia A publica nomeia 17 papéis com `Bash`, entre eles `agente-secops`,
`coordenador-de-acessos`, `inspetor-de-arnes-concorrente` e `inspetor-de-terreno-da-junta`. Não é
inelegibilidade (§C7.4-bis: não acharam, não planejaram, não implementaram) e o briefing já é transparente
("inclusive `agente-secops` — **você**"). **Cada voto deve declarar a condição**, porque o AVISO que ele
julga o conta.

### R9 (informativa) · Dois worktrees de outros blocos coabitam o disco

`b06` (`fix/billing-durability`) e `gov-descuido` (`docs/governanca-porteiro-pre-merge-sol`). **Não são
resíduo desta junta e não se varre resíduo alheio — reporta-se** (lição de 04/09: uma cadeira destruiu o
worktree vivo de outra sessão lendo o nome como seu). Nenhum jurado desta junta tem motivo para tocá-los, e o
briefing já proíbe `git worktree add`.

---

## §6 · Achado de terreno sobre a própria política de fallback de modelo

O mandato pede a minha leitura da política que me deixou rodar em Opus. Li o texto integral na fatia B
(`git show chore/gov-elenco-fatia-b:CLAUDE.md`, §C7.6-bis) e o comparei com o contrato em vigor.

**O que está BEM desenhado, e eu não mudaria:** substituto **único e nomeado** (nunca "o modelo da sessão",
nunca para baixo em silêncio — a frase "degradar um gate para um modelo mais fraco é pior do que não ter
gate, porque o parecer sai com a mesma cara de autoridade e menos capacidade por trás" é exatamente o risco);
declaração com **conteúdo obrigatório** (papel · modelo · motivo) e **destino nomeado** (parecer + ata);
**frontmatter permanece `fable`**, com o fallback no invocador — impede a degradação virar permanente e
invisível; e a articulação explícita com o item 6 ("**estende**, e não substitui").

**Três lacunas, todas medidas:**

1. **A norma que me autoriza não está no contrato em vigor.** `git show origin/main:CLAUDE.md | grep -c '6-bis'`
   → **0**; `D-FALLBACK-MODELO-FABLE-OPUS` → **0** na `main`. Ela vive **só** em `chore/gov-elenco-fatia-b`
   (`c0cbfe10`), branch **não mergeada e ainda por julgar**. A ordem do dono é fonte §A1.1 e está acima do
   arquivo, então a substituição é legítima; o frágil é o **rastro**: um porteiro que leia a `main` daqui a
   um mês encontra um gate rodado em Opus e **nenhuma regra que o justifique**. Mitigação disponível hoje: a
   **ata da fatia A** (que merga nesta fatia) carregar a declaração — não só o meu parecer.
2. **O destino "e na ata" não tem quem o feche.** Quem escreve a ata é o orquestrador; nenhum critério do §7
   cobra a linha do modelo (não poderia — a política está na outra fatia). Sugestão para a junta da fatia B:
   um critério "toda ata declara o modelo de cada papel com `model: fable` que rodou", com a mutação que o
   deixa vermelho.
3. **Silêncio sobre o segundo degrau e sobre o que se perde.** O texto não diz o que fazer se **o Opus também**
   faltar (para um gate fail-closed a resposta natural é "sem gate, sem junta", mas silêncio em cadeia
   fail-closed vira "o invocador decide"), e não exige que o papel substituído diga **qual parte do mandato é
   sensível ao modelo**. No meu caso a distinção é nítida e eu a declaro: **os itens 1 e 3 são execução** —
   comandos com exit code lido por variável, reproduzíveis por qualquer modelo, e um leitor cético pode
   re-rodar cada linha da evidência; **o item 2(b)(c) é julgamento** — se a EMENDA 2 está declarada o
   bastante, e se a exceção do assento se sustenta. É aí, e só aí, que o leitor deve descontar o fato de eu
   não ser Fable.

---

## Limpeza

**Não criei nada que precise ser derrubado.** Zero container (os dois `erp-*` estavam de pé antes e seguem
de pé — este bloco não tem banco), zero worktree, zero junction, zero `npm ci`, zero cópia em `mktemp -d`
(não precisei mutar nada: todo item foi provável por leitura, hash e exit code). Os únicos temporários foram
`/tmp/{aud,sa,ss,nc,d,full,cb}.txt` — redirecionamentos de saída da própria sessão de shell, fora do
repositório e do worktree.

**No worktree eu escrevi exatamente os meus dois arquivos**, ambos em
`agent-orchestration/omega/juntas/votos/B-GOV-ELENCO/`: `A-00-inspetor-evidencia.md` e `A-00-inspetor.md`.
Nenhum outro arquivo tocado; a árvore principal (`demo/investidor`, trabalho não-commitado de outra sessão)
**não foi tocada** — só lida, e apenas para comparar corpos de agente.

---

**LIBERADO COM RESSALVA.** As cadeiras `agente-secops`, `inspetor-de-arnes-concorrente` e
`coordenador-de-acessos` podem ser disparadas. Ressalvas **R1**, **R2** e **R3** vão no briefing em destaque;
**R4** a **R9** como notas de forma e de leitura. Eu não voto, não julgo o mérito e não conserto — só provei
que o tabuleiro é justo.
