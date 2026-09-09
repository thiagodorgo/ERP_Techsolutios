# PARECER DO INSPETOR DE TERRENO — junta do bloco `B-GOV-ELENCO-ENXUTO`

**Data:** 2026-09-08 · **Papel:** `inspetor-de-terreno-da-junta` (gate; não voto mérito, não conserto)
**Evidência item a item [P1]:** `00-inspetor-evidencia.md`, mesmo diretório.

---

## MODELO (declaração obrigatória, §C7.6-bis / `D-FALLBACK-MODELO-FABLE-OPUS`)

| item | valor |
|---|---|
| Papel | `inspetor-de-terreno-da-junta` |
| Modelo do frontmatter | **`fable`** — e **permanece**; não foi alterado |
| Modelo que efetivamente rodou | **Opus** (`claude-opus-5[1m]`) |
| Motivo | **limite de Fable da conta esgotado**, medido em 2026-09-08: `rate_limit` HTTP 429, `model sent to the API: claude-fable-5-1` |
| Degrau | 2º e **último**. `Fable → Opus → PARADA`. Não há terceiro degrau |

O fallback é ato do **invocador**, não do arquivo — trocar o `model:` do frontmatter tornaria a degradação
permanente e invisível para a próxima sessão, que é o que o `D-PLANEJADOR-MODELO-FABLE` existe para impedir.

---

## VEREDITO

# `LIBERADO COM RESSALVA`

O **tabuleiro está limpo e medido**: árvore sem mutação viva, heads confirmados, regra de escopo verdadeira
**por execução**, baseline honesto, fatia S0 verde, zero resíduo. O bloco é **legítimo** (não é ciclo 3
disfarçado), o **quórum é legítimo**, as **cadeiras são elegíveis** e o **corte foi provado com mutação de
controle**. As seis ressalvas abaixo são de **texto de briefing** e de **contrato**, não de terreno.

**R1, R2 e R3 são CONDIÇÕES DE PARTIDA**, não sugestões: a junta só começa com o briefing emendado. Digo
isto por escrito e por antecedência porque este orquestrador tem histórico **medido** de defeito exatamente
aqui — o dossiê §6 registra que ele *"escreveu no briefing uma regra de escopo que o meu próprio commit
violava"*, e o inspetor da passada 2 do bloco anterior bloqueou por isso. **Se as cadeiras forem disparadas
com o briefing como está, o voto nasce contaminado, e este parecer é o registro prévio disso.**

---

## O QUE MEDI, E O QUE DEU

| # | Verificação | Comando (forma no §"Forma" da evidência) | Resultado |
|---|---|---|---|
| 1.1 | Árvore limpa antes de eu escrever | `git -C <wt> status --porcelain` | **VERDE** — vazio |
| 1.2 | Heads batem com o briefing | `git rev-parse HEAD / adc41a54 / fe2748c8 / origin/main` | **VERDE** — `0389c4c1`, `adc41a54`, `fe2748c8`; `origin/main` **é** `fe2748c8` |
| 1.3 | "após `adc41a54` só `agent-orchestration/`" | `git diff --name-only adc41a54..HEAD \| grep -vc '^agent-orchestration/'` | **VERDE — `0`.** A regra é VERDADEIRA desta vez (1 commit, 1 arquivo: o próprio briefing) |
| 1.4 | §5-bis: nenhum caminho proibido | `git diff --name-only -M fe2748c8..adc41a54 \| grep -cE '^(src/\|tests/\|prisma/\|frontend/\|mobile/\|\.github/\|\.gitignore$\|scripts/sync-agent-)'` | **VERDE — `0`** em 113 arquivos; nenhum lockfile; único `scripts/` é o próprio auditor |
| 1.5 | Baseline honesto, medido agora | `node scripts/audit-agents-skills.mjs; ec=$?` | **VERDE — `ec=0`, `0 BLOQUEIA · 1 AVISO`** (o `C4-bis` do `Bash`, pendência do dono) |
| 1.5 | Fatia S0 — espelho Codex | `sync-agent-agents.mjs --check` · `sync-agent-skills.mjs --check` | **VERDE — `ec=0` nos dois** (23 agentes · 11 skills / 36 arquivos), recursivo |
| 1.5 | Sintaxe | `node --check` nos 3 scripts + `Kpis/app.js` | **VERDE — `ec=0` nos quatro** |
| 1.6 | Resíduo de rodada anterior | `docker ps -a` · `find -name '*probe*'` · `git worktree list` | **VERDE** — zero `jur-*`/`crit-*`, zero probe. `b06` e `gov-descuido` são de **outros blocos vivos**: reporto, não varro |
| 1.7 | Plano de isolamento no briefing | leitura + confronto com §C7.1-ter(c) | **VERDE** — worktree somente-leitura, cópia isolada, **junction/`npm ci` proibidos por escrito**; nenhuma cadeira precisa de banco |
| 2(a) | Bloco novo ou ciclo 3? | `grep D-AUDITOR-ENXUTO decisoes.md` · `grep -v '^//'` no script · `git diff --stat d2d25f6b..adc41a54` | **HONESTO** — ver abaixo |
| 2(b) | Descida de quórum | `sed -n 1961,1976p decisoes.md` | **LEGÍTIMA** — regra registrada **um dia antes** |
| 2(c) | Inelegibilidade por nome | `grep` nas duas atas | **SEM COLISÃO** |
| 2(d) | Assento permanente | `grep C7.1-quater` em CLAUDE/AGENTS/decisoes + `git ls-tree` | **NÃO SE APLICA** — a norma não existe neste repo |
| 3(a) | `C8` não emite mais nada | fixture em `SKILL.md` + **controle pré-corte** | **VERDE** — `1 BLOQUEIA·ec=1` antes → `0·ec=0` depois |
| 3(b) | Recusa nomeada reprova | fixture `A-C2-02` + **controle pré-corte** | **VERDE** — `ec=1`, `C1 recusa de medição`, **zero** fabricação |
| 3(c) | Default-deny sobreviveu | 2 mutantes (nome arbitrário + ferramenta desconhecida) | **VERDE** — `2 BLOQUEIA · ec=1` |

---

## ITEM 2 — O ITEM MAIS IMPORTANTE, RESPONDIDO DIRETO

### É bloco novo, ou é o ciclo 3 com outro nome? — **É BLOCO NOVO, e é honesto.**

Sustento isso em **três medições independentes**, nenhuma delas confiando no briefing:

**1. A decisão do dono existe FORA do briefing.** `D-AUDITOR-ENXUTO` está em
`agent-orchestration/controle/decisoes.md:1981`, datada 2026-09-08, com a citação do dono **idêntica** à do
briefing e a identificação explícita: *"É a Opção 3 + Opção 1 do §5 do dossiê"*. Não é o orquestrador se
autorizando — é §A1.1 registrado em arquivo.

**2. O teste decisivo: o que aconteceu com a gramática de link.** Um ciclo 3 disfarçado teria **consertado**
o regex para entender `<destino>` do CommonMark. Medi:

```
$ grep -nE "C8|\bLINK\b|semCercas|semCodeSpans|semComentariosHtml|embranquecer" \
      scripts/audit-agents-skills.mjs | grep -vE '^\s*[0-9]+://'
(VAZIO — só sobraram COMENTÁRIOS que documentam o corte)
```

**A gramática foi removida, não corrigida.** Isso é categoricamente o oposto do que os ciclos 1 e 2
tentaram. E a recusa nomeada (Opção 1) existe no código, linhas 424 e 560.

**3. O delta é de UM arquivo de código.** Contra o head reprovado do ciclo 2 (`d2d25f6b`), o bloco muda
`scripts/audit-agents-skills.mjs` (224 linhas, 664→668) e a diretiva de modelo; o resto é registro.
"Bloco novo e **pequeno**" — medido, não afirmado.

**A honestidade tem um limite, e ele vira R2:** a branch **continua** os artefatos reprovados
(`git merge-base --is-ancestor 25c0112a adc41a54` → SIM; idem `d2d25f6b`). Nada está escondido — o diff é
contra `origin/main`, então as cadeiras enxergam tudo — mas o **objeto do voto é um diff cumulativo de 113
arquivos**, e o briefing não avisa isso.

### O quórum caiu de unanimidade-3 para maioria-3 — **é legítimo, e não por afrouxamento.**

Não aceitei o argumento do briefing; fui atrás de fundamento mais forte, e ele existe.
`D-QUORUM-B-GOV-ELENCO` (**2026-09-07**, um dia ANTES de este bloco existir) escreve, literalmente:
*"qualquer bloco seguinte volta ao quórum do risco, salvo nova declaração."* No repositório o **default é o
quórum do risco**; o que exige declaração formal é **subir**. A descida é execução de regra, não conveniência
— e foi escrita pelo mecanismo (o assento, homologação nº 1) que exigiu o registro justamente para impedir
herança por inércia.

Confirmei também que não há gatilho de risco: o bloco não toca `src/`, `prisma/`, `frontend/`, `mobile/`
(medido em 1.4), e o auditor **não roda na CI** (`P-GOV-AUDITOR-FORA-DA-CI`), logo não é gate automático de
nada. **Mas a frase auxiliar do briefing é inexata → R3.**

### Inelegibilidade — **sem colisão**, e o argumento do briefing se sustenta.

| Junta | Cadeiras (lidas nas atas) |
|---|---|
| ciclo 1 (3x0) | `validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor` |
| ciclo 2 (2x1) | `agente-secops` · `inspetor-de-arnes-concorrente` · `coordenador-de-acessos` |
| **aqui** | `validador-mestre` · `guardiao-fail-closed` · `agente-ci-doutor` |

- **"Votante do ciclo anterior": satisfeito nas DUAS leituras.** Bloco novo → não há ciclo anterior.
  Continuação → o ciclo anterior é o **ciclo 2**, e nenhuma cadeira do ciclo 2 senta aqui. Não preciso
  resolver a controvérsia para liberar.
- **"Achador dos defeitos em julgamento": satisfeito.** Os defeitos que *este bloco fecha* são, por
  `D-AUDITOR-ENXUTO`, os `A-C2-02/03/04/05` — todos de `inspetor-de-arnes-concorrente`, **corretamente
  inelegível**. Os achados de C1/C2/C3 foram fechados no ciclo 2 e verificados por junta **independente**
  (a ata registra `A-C2` provando o default-deny em 16 mutações).
- **Competência coberta, e bem:** `agente-ci-doutor` tem mandato literal *"o auditor mede o que diz?"*;
  `guardiao-fail-closed` cobre *"não medir é vermelho"*, que é o mecanismo central do bloco;
  `validador-mestre` cobre diff × plano × escopo × registro, que é a faxina.

**Onde discordo do briefing → R2:** a justificativa é verdadeira sobre o que o bloco **conserta** e silente
sobre o que ele **contém**. Essas três cadeiras reprovaram `25c0112a` 3×0, e esse commit está dentro do diff.
O viés não é só "mais duro": cadeira cuja linhagem já consumiu dois ciclos e um dossiê tem também incentivo a
**encerrar**.

---

## AS RESSALVAS (nomeadas, para o briefing, em destaque)

### R1 — CONDIÇÃO DE PARTIDA · a faxina entra como "já verificada", e é a MAIOR parte do diff

O briefing item 4 diz: *"Carrega a faxina, **já verificada por três cadeiras no ciclo 2**"* — afirmação da
ata anterior repassada como **fato estabelecido**, sem mandar medir. A seção *"você deve reexecutar"* cobre
**só** os dois itens da `A-C2`. Medi o peso do que entra assim:

```
$ git diff --name-status -M fe2748c8..adc41a54 | cut -c1 | sort | uniq -c
     36 A     30 D     15 M     32 R
```

**62 dos 113 arquivos** são a faxina (30 deleções = 15 especialistas × 2 espelhos; 32 renames `R100`).

Três problemas somados: (i) meu §2.1 proíbe herdar conclusão de ata como fato — foi assim que a premissa
falsa contaminou o ciclo 3 do financeiro; (ii) *"três cadeiras"* é **impreciso** — a ata do ciclo 2 mostra
`A-C1` cobrindo escopo/registro/KPI e `A-C3` cobrindo separação de poderes; o mandato da `A-C2` era o
auditor; (iii) **as mesmas 15 remoções foram metade da justificativa que SUBIU o quórum no ciclo 1** — agora
chegam sob **maioria** e rotuladas como pré-verificadas, ou seja, com **o menor escrutínio que já tiveram**.

**Por que é ressalva e não bloqueio:** eu medi as afirmações mecânicas e elas **procedem** — 30 deleções são
mesmo 15×2, e os 32 renames são `R100` (o próprio git atesta conteúdo idêntico). A premissa é verdadeira; o
que está errado é o **enquadramento que desestimula a cadeira a medir**.

**O que precisa acontecer:** marcar o item 4 como **"A RE-VERIFICAR"**, corrigir a atribuição de quem
verificou o quê, e dizer às cadeiras que a faxina é **62 dos 113 arquivos**, não um anexo.

### R2 — CONDIÇÃO DE PARTIDA · participação prévia das três cadeiras no diff cumulativo, não divulgada

O briefing declara elegibilidade dizendo que os defeitos deste bloco são da `A-C2`. Verdadeiro, mas
incompleto: o diff julgado **contém** `25c0112a` (reprovado 3×0 por essas três) e `7facc396` (o conserto dos
achados delas). Provado por `git merge-base --is-ancestor`.

**O que precisa acontecer:** o briefing informa cada cadeira da própria participação prévia, e cada uma
**declara no voto** o que já julgou nesta linhagem — exatamente como a ata do ciclo 2 fez com as dela.
Divulgação, não substituição: **não há colisão que exija troca de cadeira.**

### R3 — CONDIÇÃO DE PARTIDA · "este não reescreve a regra da junta" é inexato por medição

```
$ git diff --stat fe2748c8..adc41a54 -- CLAUDE.md AGENTS.md
 AGENTS.md | 48 ++++++    CLAUDE.md | 48 ++++++
```

As 48 linhas (espelhadas nos dois contratos) são o **§C7.6-bis**: norma que governa **em que modelo os gates
de TODA junta rodam**, e que institui uma **PARADA**. Isso É regra da junta. Somado às 30 deleções de
arquivo de agente, a frase pode fazer a cadeira **não olhar** justamente o que mais importa.

**A descida de quórum não depende desta frase** — sustenta-se sozinha no `D-QUORUM-B-GOV-ELENCO`. O que
precisa acontecer é **corrigir a frase** e apontar as cadeiras explicitamente para o §C7.6-bis e para as 30
deleções.

### R4 — plano de perda de jurado fora do mandato (meu §5.1)

O modelo de mandato do briefing cita **P1, P2 e P4**; **omite o P3**. O P3 existe e é normativo
(`D-JUNTA-RESILIENTE`, `CLAUDE.md:505`): *"Voto perdido não conta; o sucessor tem identidade nova"*, mais o
roteiro de re-execução barata a partir da evidência do caído.

Isto pesa **mais** aqui do que no normal: sob **maioria de 3**, uma queda somada a um 1×1 **não produz
maioria**, e a piscina de elegíveis desta linhagem já está estreita (6 identidades gastas em dois ciclos).

**O que precisa acontecer:** colar a linha do P3 no disparo e **nomear de antemão quem substitui cada
cadeira**.

### R5 — o MEU PRÓPRIO contrato manda bloquear por uma norma que não existe

`D-INSPETOR-TERRENO-JUNTA` §3.3 ordena **BLOQUEADO** se o `cadeira-permanente-backend-review` não estiver
convocado, por **§C7.1-quater**. Medi antes de aplicar:

```
$ grep -nE 'C7.1-quater|cadeira-permanente' CLAUDE.md AGENTS.md controle/decisoes.md   -> VAZIO nos três
$ git show fe2748c8:CLAUDE.md | grep -E 'C7.1-quater'                                  -> VAZIO
$ git ls-tree -r --name-only fe2748c8 | grep -i cadeira-permanente                     -> NÃO existe em main
$ git ls-tree -r --name-only chore/gov-elenco-fatia-b | grep -i cadeira-permanente
      .claude/agents/cadeira-permanente-backend-review.md      <- branch NÃO mergeada
```

**A norma nunca existiu em `origin/main`.** O assento é proposta não mergeada, com **desenho reprovado**
(dossiê §8), aguardando o dono. O briefing está **certo**: cobrar §C7.1-quater aqui seria reprovar sem
defeito — e o gate seria a patologia que a auditoria de 28/08 mediu em **11 de 16** bloqueantes.

**O que precisa acontecer (decisão do dono, não minha):** ou o assento é decidido e o §C7.1-quater passa a
existir no `CLAUDE.md`/`AGENTS.md`, ou o §3.3 do contrato do inspetor é emendado. Enquanto os dois
divergirem, todo inspetor futuro tem de escolher entre desobedecer o próprio contrato e bloquear sem defeito.

### R6 — achado sobre a escada `Fable → Opus → PARADA` (fui convidado a julgar o desenho)

O desenho é **fail-closed e correto no essencial**: um degrau nomeado, fim explícito, e a justificativa certa
(*"gate degradado é pior que gate ausente"* — a ausência é visível, a degradação não). Duas lacunas medidas:

**(a) "Esgotado" não tem teste de medição escrito.** A norma exige declarar *qual papel · qual modelo ·
por que o Fable faltou* — mas **não exige evidência**. Numa casa cuja regra de ouro é "afirmação sem
execução não conta", o predicado que autoriza rebaixar o gate é o único que pode ser **afirmado**. Um
invocador com pressa declara "Fable esgotado" sem medir, e a degradação invisível que a regra existe para
impedir acontece **por dentro dela**. Conserto barato, e este bloco já fez espontaneamente o certo: colar a
evidência (`rate_limit` HTTP 429, `model sent to the API: claude-fable-5-1`) — foi por existir essa medição
que eu pude confirmar hoje o meu próprio rebaixamento em vez de aceitá-lo.

**(b) A PARADA não diz o que fazer com uma junta pela metade.** O texto manda registrar o trabalho em voo e
avisar o dono (família do §C7.5), mas não diz como se lê o **quórum** de uma junta com 2 de 3 votos dados
quando o Opus acaba, nem quem declara a rodada retomável quando o limite renova. Interage direto com **R4**:
sob maioria de 3, "voto perdido não conta" (P3) mais uma parada no meio deixa o dono com um resultado que
ele não consegue interpretar — que é exatamente o problema que o P3 nasceu para resolver.

Nenhuma das duas bloqueia esta junta. Ambas são **matéria do dono**, e ficam registradas aqui.

---

## UMA NOTA DE MÉTODO, PORQUE QUASE ME PEGOU

Na primeira tentativa do item 3(a) injetei o link quebrado num `.claude/agents/*.md`. O script novo saiu
`ec=0` — e eu teria escrito "corte confirmado". **O controle pré-corte saiu `ec=0` também.** Fui ver por quê:

```
$ grep -n -A14 'C8 — link relativo' <pre>/scripts/audit-agents-skills.mjs
568:  const resolvido = posix.normalize(posix.join(`.claude/skills/${dir}`, alvo));
```

O `C8` **só existiu dentro de `SKILL.md`**. Minha fixture estava fora do escopo dele: eu teria "provado" o
corte com um teste que **nunca teria pego nada** — a ferramenta que responde **quase** a pergunta. Não foi a
releitura que pegou: foi rodar o controle. **Toda medição deste parecer tem mutação de controle contra o
script pré-corte, na mesma cópia e com a mesma fixture.** Recomendo que as cadeiras façam o mesmo: neste
bloco, "0 achados" sem controle não distingue *cortado* de *fora de escopo*.

E a armadilha que me foi avisada não me pegou porque **não usei `mktemp -d`**: usei caminho que os dois
lados enxergam, rodei com `cd` + caminho **relativo**, e **li cada fixture de volta do disco** antes de
medir. A prova de que o Windows resolve o caminho é o próprio auditor ter reportado `23 agentes · 11 skills`
na cópia — se não resolvesse, teria reportado `0 · 0` e passado verde sem medir nada.

---

## LIMPEZA

Criei duas cópias isoladas **fora do repositório**, no scratchpad da sessão — `iso-inspetor` (script do
head) e `iso-pre` (script pré-corte, extraído por `git show 3b4aa97c^:...`) — mais quatro arquivos de saída
temporários. **Todas removidas** (`rm -rf`), confirmado por `ls`. Confirmado também, por execução, que
**nada vazou para o worktree**:

```
$ git -C <wt> status --porcelain
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor-evidencia.md
?? agent-orchestration/omega/juntas/votos/B-GOV-ELENCO-ENXUTO/00-inspetor.md
$ ls <wt>/.claude/agents/ | grep -c zzz          -> 0   (nenhum mutante vazou)
$ git -C <wt> diff --stat                        -> (vazio; nenhum arquivo rastreado tocado)
$ cd <wt> && node scripts/audit-agents-skills.mjs -> ec=0   (worktree segue no baseline)
```

**Não toquei na árvore principal** (`C:/Users/AMP/Documents/GitHub/ERP_Techsolutios`, `demo/investidor`),
nem nos worktrees `b06` e `gov-descuido`, que são de outros blocos vivos: resíduo alheio se reporta, não se
varre. Os únicos arquivos que criei no worktree são os **meus dois**, no diretório que o briefing autoriza.
Não sou a fonte da próxima contaminação.
