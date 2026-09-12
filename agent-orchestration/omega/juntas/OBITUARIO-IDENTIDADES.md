# OBITUÁRIO DE IDENTIDADES DE JUNTA — registro canônico de quem não pode mais votar

> **Fonte primeira** da conferência de inelegibilidade por nome (§C7.1-bis, `D-INSPETOR-TERRENO-JUNTA`).
> Criado pelo bloco **SAN2-3** (plano: `agent-orchestration/omega/planos/SAN2-3-plano.md`).
> **Append-only:** sepultamento novo = **linha nova**. Nunca se remove linha daqui — um obituário que
> encolhe deixa de ser obituário.
>
> **O descarte é LÓGICO.** Nenhum arquivo de identidade foi apagado por este registro, em branch nenhuma.
> As **29** identidades abaixo (17 originais + 6 do `B-O6R-06` mérito, §3.4 + 6 do `B-O6R-06` delta, §3.5 — as 12 do `B-O6R-06` entraram na `main` pelo squash `15ef3fbe` e saem do diretório vivo no PR que as sepulta; o corpo segue lível em `15ef3fbe`) — as 17 originais continuam existindo como arquivo na branch `demo/investidor`
> (`.claude/agents/especialistas/` e o espelho `.agents/agents/especialistas/`) — servem de peça histórica
> citada por este documento. O que morre é o **direito de sentar numa junta**, não o byte.

## 1. Como usar (regra de consulta)

1. **Antes de compor qualquer junta**, o orquestrador / `agente-fabrica` confere os nomes propostos contra
   a tabela do §3. **0 colisões** é a condição de partida.
2. Identidade **`SEPULTADA`** não entra em junta nenhuma. Nunca. Não há reabilitação por tempo, por troca
   de bloco nem por "o caso dela era outro".
3. Identidade **`RESERVADA`** só entra na junta **para a qual está reservada** — nomeada na própria linha.
   Fora dela, comporta-se como sepultada.
4. O `inspetor-de-terreno-da-junta` usa este arquivo como **fonte primeira** da checagem
   "inelegibilidade dos papéis conferida por nome". **Ausência do nome aqui NÃO absolve:** as atas do caso
   continuam sendo a prova, e o gate segue **fail-closed** — nome não listado exige a conferência nas atas,
   não um passe livre.
5. Quem sepulta uma identidade nova **acrescenta a linha no mesmo PR** em que a junta fecha.

## 2. Placar

| | |
|---|---|
| Identidades registradas | **31** (17 originais + 6 do `B-O6R-06` mérito, §3.4 + 6 do `B-O6R-06` delta, §3.5 + 2 do PR #386 ciclo 2, §3.6) |
| **SEPULTADAS** | **31** (6 do `B-O6R-ARNES` + 9 do `B-O6R-02` ciclo 4 + 2 ex-reservadas do `B-O6R-02` ciclo 5 + 6 do `B-O6R-06` mérito + 6 do `B-O6R-06` delta + 2 do PR #386 ciclo 2) |
| **RESERVADAS** | **0** (as duas do §3.3 participaram do ciclo 5, que rodou e mergeou no #371 — ver a emenda no fim do §3.3) |
| Arquivos apagados por este registro | **0** |

> **Correção de placar (2026-09-11, PR do plano SAN3).** A versão anterior dizia **17 registradas** e **21
> sepultadas** na mesma tabela — contradição introduzida pelo orquestrador ao acrescentar o §3.4 sem recontar a
> primeira linha. E as 2 reservadas estavam vencidas desde 2026-09-04 (§3.3). A saída das 12 do `B-O6R-06`
> do diretório vivo é registrada à parte, em `controle/aposentadoria-especialistas.md` (rodada 2): aposentar
> tira do diretório; sepultar tira o direito de voto — e este arquivo continua não apagando byte nenhum.

**A conta NÃO é "16 queimados + 1 preservado"** — essa lista, herdada do enunciado do bloco, erra em uma
identidade. Ver §5 (Divergência §A2).

## 3. As identidades

Colunas: **classe de queima** = `votou` (assinou voto em disco) · `nomeada-e-preparada` (entrou no briefing
como titular ou suplente de um caso já concluído; não assinou voto) · `reservada` (criada para caso que
ainda não rodou). Todas as 17 vivem, como arquivo, em `demo/investidor` **nas duas pontas do espelho**
(`.claude/agents/especialistas/<nome>.md` e `.agents/agents/especialistas/<nome>.md`).

> **Nota (2026-09-11):** a frase acima descreve as 17 originais. As 12 do `B-O6R-06` (§3.4 e §3.5) entraram
> na `main` pelo squash `15ef3fbe` e **saem do diretório vivo no mesmo PR que sepulta as seis do delta**
> (`D-APOSENTADORIA-ELENCO-EFEMERO`; registro em `controle/aposentadoria-especialistas.md`, rodada 2). O corpo
> continua lível em `15ef3fbe`.

### 3.1 Caso `B-O6R-ARNES` — arnês de teste · junta concluída 2026-08-28 · **APROVADO 3×0** · PR #359
Ata: `J-B-O6R-ARNES.md` (l.3: *"APROVADO por maioria — 3 APROVADO · 0 REPROVADO · 0 voto perdido"*; head
julgado `d4cf978`, head final `0c37fa2`). Briefing: `BRIEFING-B-O6R-ARNES.md`. Votos: `votos/B-O6R-ARNES/`.

| # | Identidade | Papel | Status | Classe | Evidência | Nasceu em |
|---|---|---|---|---|---|---|
| 1 | `jurado-arnes-catalogo-postgres` | titular, cadeira 1 (veto) — arnês/catálogo | **SEPULTADA** | `votou` | `votos/B-O6R-ARNES/01-jurado-arnes-catalogo.json` (autor, campo `jurado` l.2) + ata + briefing | `bd0d700` (2026-08-28) |
| 2 | `jurado-arnes-runner-denominador` | titular, cadeira runner/denominador | **SEPULTADA** | `votou` | `votos/B-O6R-ARNES/02-jurado-arnes-runner.json` + ata + briefing + `planos/B-O6R-ARNES-plano.md` | `e74b469` (2026-08-28) |
| 3 | `jurado-arnes-diff-escopo-registro` | titular, cadeira diff/escopo/registro (veto) | **SEPULTADA** | `votou` | `votos/B-O6R-ARNES/03-jurado-arnes-diff.json` + ata + briefing + plano | `e74b469` (2026-08-28) |
| 4 | `jurado-arnes-suplente-catalogo-postgres` | suplente da cadeira 1 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-ARNES.md` + `votos/.../00a-inspetor-terreno-passada1-BLOQUEADO.md` + citada no voto `01` como suplente nomeado | `e74b469` (2026-08-28) |
| 5 | `jurado-arnes-suplente-runner-denominador` | suplente do runner | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-ARNES.md` + parecer `00a` do inspetor | `e74b469` (2026-08-28) |
| 6 | `jurado-arnes-suplente-diff-escopo-registro` | suplente do diff/escopo | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-ARNES.md` + parecer `00a` do inspetor | `e74b469` (2026-08-28) |

*Por que os suplentes 4–6 também são sepultados:* a ata registra *"nenhum precisou entrar"* — mas os três
foram **nomeados no briefing antes do início e preparados sobre o material do caso**. Já leram a entrega que
julgariam. Numa junta futura sobre a mesma trilha, a frescura da identidade — o que faz o voto valer — já
não existe.

### 3.2 Caso `B-O6R-02` ciclo 4 — atomicidade do financeiro · junta concluída 2026-08-28 · **REPROVADO 4×1**
Ata: `J-B-O6R-02-ciclo4.md` (l.3: *"REPROVADO. Placar 4 APROVADO · 1 REPROVADO · 0 voto perdido"*; head
julgado `12c3825`). Briefing: `BRIEFING-B-O6R-02-ciclo4.md`. Votos: `votos/B-O6R-02-ciclo4/`. Reprovação
registrada em `reprovacoes/R-B-O6R-02-ciclo4.md`.

| # | Identidade | Papel | Status | Classe | Evidência | Nasceu em |
|---|---|---|---|---|---|---|
| 7 | `jurado-c4-fail-closed-enumeracao` | titular, fail-closed/exaustividade | **SEPULTADA** | `votou` | `votos/B-O6R-02-ciclo4/01-jurado-c4-fail-closed-enumeracao.json` (autor) + ata + briefing + `R-B-O6R-02-ciclo4.md` | `1736727` (2026-08-25) |
| 8 | `jurado-c4-arnes-concorrente` | titular, arnês concorrente — **caiu sem votar** | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-02-ciclo4.md` + ata + citada em `04-jurado-c4-suplente-arnes.json` como o titular substituído | `1736727` (2026-08-25) |
| 9 | `jurado-c4-ataque-ao-dinheiro` | titular, ataque ao razão (veto) — **caiu sem votar** | **SEPULTADA** | `nomeada-e-preparada` | briefing + ata + parecer `00b` do inspetor + citada em `02-jurado-c4-suplente-dinheiro.json` | `1736727` (2026-08-25) |
| 10 | `jurado-c4-banco-triggers` | titular, banco/locks/triggers (veto) — **caiu sem votar** | **SEPULTADA** | `nomeada-e-preparada` | briefing + ata + citada em `03-jurado-c4-suplente-banco.json` | `1736727` (2026-08-25) |
| 11 | `jurado-c4-validador-diff-plano` | titular, validação diff×plano (veto) — **caiu sem votar** | **SEPULTADA** | `nomeada-e-preparada` | briefing + ata + citada em `05-jurado-c4-suplente-validador.json` | `1736727` (2026-08-25) |
| 12 | `jurado-c4-suplente-arnes-concorrente` | suplente do arnês — **votou; foi quem REPROVOU** | **SEPULTADA** | `votou` | `votos/B-O6R-02-ciclo4/04-jurado-c4-suplente-arnes.json` (autor) + ata + `R-B-O6R-02-ciclo4.md`; **e ainda é o ACHADOR do bloco `B-O6R-ARNES`** — inelegível lá por segundo motivo (`J-B-O6R-ARNES.md` **l.43**, "Achador (origem do bloco) … **inelegível** aqui") | `160a87f` (2026-08-28) |
| 13 | `jurado-c4-suplente-ataque-ao-dinheiro` | suplente do dinheiro (veto) — votou | **SEPULTADA** | `votou` | `votos/B-O6R-02-ciclo4/02-jurado-c4-suplente-dinheiro.json` (autor) + ata + parecer `00c` + `R-B-O6R-02-ciclo4.md` | `160a87f` (2026-08-28) |
| 14 | `jurado-c4-suplente-banco-triggers` | suplente de banco (veto) — votou | **SEPULTADA** | `votou` | `votos/B-O6R-02-ciclo4/03-jurado-c4-suplente-banco.json` (autor) + ata + parecer `00c` + `R-B-O6R-02-ciclo4.md` | `160a87f` (2026-08-28) |
| 15 | `jurado-c4-suplente-validador-diff-plano` | suplente do validador (veto) — votou | **SEPULTADA** | `votou` | `votos/B-O6R-02-ciclo4/05-jurado-c4-suplente-validador.json` (autor) + ata + parecer `00c` + `R-B-O6R-02-ciclo4.md` | `160a87f` (2026-08-28) |

*Nota de forma:* o ciclo 4 rodou com **1 titular + 4 suplentes** assinando os cinco votos — os quatro
titulares das linhas 8–11 caíram sem votar (limite de sessão / interrupção) e foram substituídos. Cair sem
votar **não desqueima**: os quatro receberam o briefing e o material do caso.

### 3.3 RESERVADAS — ciclo 5 do `B-O6R-02` (não rodou)
`ls agent-orchestration/omega/juntas/ | grep -i ciclo5` → **vazio**;
`ls agent-orchestration/omega/juntas/votos/ | grep -i ciclo5` → **vazio**.
O plano existe e espera: `agent-orchestration/omega/planos/B-O6R-02-ciclo5-plano.md`.

| # | Identidade | Papel | Status | Classe | Evidência da reserva | Nasceu em |
|---|---|---|---|---|---|---|
| 16 | `jurado-c5-arnes-catalogo-postgres` | cadeira do arnês/catálogo Postgres (veto) do **ciclo 5** | **RESERVADA — junta do ciclo 5 do `B-O6R-02`** | `reservada` (nunca votou) | `J-B-O6R-ARNES.md` l.51-56 **verbatim**: *"O titular novo nasceu em `bd0d700`; `jurado-c5-arnes-catalogo-postgres` ficou **intocado e reservado** para a junta do ciclo 5."* Reconfirmado em `votos/B-O6R-ARNES/01-jurado-arnes-catalogo.json` l.2: *"a cadeira anterior … foi recusada pelo inspetor de terreno — contrato de outra junta (ciclo 5 do B-O6R-02) — e **permanece reservada àquela junta**"*. Também citada em `planos/B-O6R-02-ciclo5-plano.md`. | `77ead96` (2026-08-28) |
| 17 | `critico-c5-adversarial` | crítico adversarial do **ciclo 5** (ataca o plano, não vota mérito) | **RESERVADA — ciclo 5 do `B-O6R-02`** | `reservada` (nunca votou) | `planos/B-O6R-02-ciclo5-plano.md` **l.10, 171, 230, 301** — nomeado como o crítico do ciclo 5 (*"`critico-c5-adversarial` (criado, `77ead96`) ataca ESTE PLANO antes do código"*). `grep -rl` em `omega/` não devolve **nenhum** arquivo de voto nem ata de caso concluído. | `77ead96` (2026-08-28) |

**Alerta ao futuro:** sepultar qualquer uma das duas destrói a composição já pronta do próximo bloco
financeiro da fila. Foi o erro que este bloco quase cometeu ao herdar a lista de 16.

> **EMENDA (2026-09-11, PR do plano SAN3) — as duas RESERVADAS estão SEPULTADAS, e desde 2026-09-04.** O
> título desta seção diz "ciclo 5 do `B-O6R-02` (não rodou)". **Rodou**: a junta do ciclo 5 fechou e o bloco
> mergeou no **#371 (`99f18403`, 2026-09-04)**. Medido nas atas:
> - `jurado-c5-arnes-catalogo-postgres` ocupou a **cadeira C1** e **votou APROVADO**
>   (`J-B-O6R-02-ciclo5.md:17`; voto `votos/B-O6R-02-ciclo5/02-C1-arnes-catalogo-postgres.md`) → classe
>   **`votou`**;
> - `critico-c5-adversarial` foi o **crítico adversarial** do ciclo (parecer
>   `votos/B-O6R-02-ciclo5/01-critico-adversarial.md`, 5 achados; objeto do bloqueio da 1ª passada do
>   inspetor, `J-B-O6R-02-ciclo5.md:78`) → não vota por desenho, mas entrou e trabalhou num caso **concluído**
>   → classe **`nomeada-e-preparada`**.
>
> Pelo §1.2 não há reabilitação. As duas também já constam **aposentadas** do diretório vivo
> (`controle/aposentadoria-especialistas.md`, rodada 1, linhas 1 e 3). A reserva era para uma junta que já
> aconteceu; mantê-la seria o §1.3 autorizando uma identidade a sentar numa junta que não existe mais. O texto
> original desta seção fica como está: o obituário não reescreve linha, acrescenta.

## 4. Papéis permanentes — o obituário NÃO os cobre

Os **23 papéis de `.claude/agents/*.md`** (+ o espelho `.agents/agents/*.md`, 23 papéis + `README.md`)
**não se sepultam**. São contratos de papel reutilizáveis — `planejador-mestre`, `critico-adversarial`,
`inspetor-de-terreno-da-junta`, `porteiro-pos-merge`, os `agente-*`, os inspetores, etc. A inelegibilidade
deles é **por caso**, não por identidade, e continua sendo conferida **nas atas do caso**:

- quem planejou um bloco não desenvolve nem vota nele (§C7.4-bis);
- quem achou um defeito não o conserta (§C7.4-bis);
- quem votou nos ciclos 1–4 do `B-O6R-02` é inelegível no ciclo 5 — e é por isso que as identidades
  descartáveis do §3 existiram.

Este obituário cobre **identidades descartáveis de caso** (as `especialistas/`). Para o resto, aponta as
atas. Um dia em que um papel permanente precise ser aposentado, ele entra aqui — com linha nova e motivo.

## 5. Divergência §A2 — o enunciado herdado × o que o repositório mede

Registrada também em `agent-orchestration/controle/decisoes.md` (`REGISTRO-SAN2-3-OBITUARIO`), como manda
a regra de "sem consolidação silenciosa".

**(a) "Descartar os 16 especialistas de `.claude/agents/especialistas/`" é um no-op na `main`.**
O diretório **nunca existiu** na `main`: `git ls-tree -r --name-only HEAD -- .claude/agents/ .agents/agents/
| grep -c especialistas` → **0**, e `git log main --oneline -- .claude/agents/especialistas/` → vazio. Os
17 arquivos nasceram e vivem só na `demo/investidor` (5 commits: `1736727`, `160a87f`, `77ead96`,
`e74b469`, `bd0d700`). Não há mandato escrito para apagá-los; as formulações canônicas são as dos porteiros
(#362: *"SAN2-3 (obituário dos 16 especialistas): documental"*; #363: *"obituário dos 16 especialistas,
preservando `critico-c5-adversarial`"*). **Resolução:** o bloco não apaga nada, em branch nenhuma — o
registro lógico é a entrega.

**(b) A lista "16 queimados + 1 preservado" está errada em 1 identidade.**
São **15 + 2**. `jurado-c5-arnes-catalogo-postgres` estava na lista dos 16 e **não pode ser sepultado**:
a ata do ARNES o reservou explicitamente para o ciclo 5, depois de o `inspetor-de-terreno-da-junta`
**bloquear** o seu reaproveitamento na cadeira 1 daquele bloco. **Resolução:** as duas identidades do ciclo
5 entram como `RESERVADA`, com a citação literal na linha.

**(c) Nada de guard de código novo — argumento, para ser derrubado no voto se for o caso.**
O vetor real de reuso é a **composição da junta**, não a existência de um arquivo: as juntas c4 e ARNES
rodaram inteiras com identidades que **nunca estiveram na `main`**. Um teste do tipo "nome queimado não
existe como arquivo na árvore" daria **verde com o reuso acontecendo** — falsa segurança, a exata classe de
defeito que a rodada SAN2 combate. O gate fail-closed já existe e é anterior à junta (§C7.1-bis); o que
faltava era **a fonte**, não um segundo fiscal. Ela é este arquivo.

## 6. Trilha

| Bloco | O que fez | Data |
|---|---|---|
| **SAN2-3** | Criou este registro com as 17 identidades (15 sepultadas + 2 reservadas); apontou-o no `inspetor-de-terreno-da-junta`; **zero descarte físico** | 2026-08-30 |

---

### 3.4 Caso `B-O6R-06` — durabilidade do faturável · junta concluída 2026-09-07 · **APROVADO 3×0** · PR #385

Ata: `J-B-O6R-06.md` (head de código julgado `0f0a872a`; ata em `005b522c`). Briefing:
`BRIEFING-B-O6R-06.md`. Votos: `votos/B-O6R-06/`. Todas as seis nasceram em **`e35492ef` (2026-09-07)**.

> **Acrescentado a posteriori, e a dívida é declarada.** O §1.5 manda a linha entrar **no mesmo PR em que a
> junta fecha**. A junta fechou em `005b522c` e as seis linhas **não** entraram — omissão do orquestrador.
> Foi o `inspetor-de-terreno-da-junta` que a nomeou, ao **BLOQUEAR** a junta do delta em 2026-09-09: o
> orquestrador havia convocado estas mesmas seis identidades para votar o delta, sem conferir o obituário.
> O item que produziu o achado foi o **3.1-bis** ("o obituário é fonte PRIMEIRA, antes do grep") — que
> faltava no corpo carregado do próprio inspetor, e que ele só foi ler porque aplicou o item 3.3 a si mesmo.

| # | Identidade | Papel | Status | Classe | Evidência | Nasceu em |
|---|---|---|---|---|---|---|
| 1 | `jurado-06-banco-atomicidade-rls` | titular, cadeira C1 (veto) — banco/atomicidade/RLS | **SEPULTADA** | `votou` | `votos/B-O6R-06/C1-banco-rls-voto.json` (campo `jurado` nomeia a si mesma) + `C1-banco-rls-evidencia.md` + ata + briefing l.37 | `e35492ef` (2026-09-07) |
| 2 | `jurado-06-invariante-financeiro-rateio` | titular, cadeira C2 (veto) — invariante financeiro/rateio | **SEPULTADA** | `votou` | `votos/B-O6R-06/C2-financeiro-rateio-voto.json` + `C2-financeiro-rateio-evidencia.md` + ata + briefing l.38 | `e35492ef` (2026-09-07) |
| 3 | `jurado-06-contrato-regressao-kpi` | titular, cadeira C3 (veto) — contrato/regressão/KPI | **SEPULTADA** | `votou` | `votos/B-O6R-06/C3-contrato-kpi-voto.json` + `C3-contrato-kpi-evidencia.md` + ata + briefing l.39 | `e35492ef` (2026-09-07) |
| 4 | `jurado-06-suplente-banco-atomicidade-rls` | suplente da cadeira C1 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-06.md` l.37 (coluna suplente) — caso **concluído** | `e35492ef` (2026-09-07) |
| 5 | `jurado-06-suplente-invariante-financeiro-rateio` | suplente da cadeira C2 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-06.md` l.38 — caso **concluído** | `e35492ef` (2026-09-07) |
| 6 | `jurado-06-suplente-contrato-regressao-kpi` | suplente da cadeira C3 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-06.md` l.39 — caso **concluído** | `e35492ef` (2026-09-07) |

**O precedente aplicado, e por que ele decide.** O §1.2 diz que não há reabilitação por tempo, por troca de
bloco nem por "o caso dela era outro". O caso `B-O6R-ARNES` (§3.1) fechou **APROVADO 3×0**, exatamente como
este, e ainda assim sepultou os 3 titulares (`votou`) **e** os 3 suplentes (`nomeada-e-preparada`). Nesta
casa o sepultamento decorre de **ter votado** — ou de ter sido nomeada e preparada num caso concluído —,
nunca de a junta ter reprovado. O argumento "mas foi aprovado, então elas podem votar o delta" já havia sido
testado e recusado pelo registro antes de eu tentar usá-lo.

**Consequência para o delta:** a junta que julga o delta do `B-O6R-06` precisa de **identidades novas** nas
três cadeiras, com suplentes novos — o plano de perda de jurado que apontava para os `jurado-06-suplente-*`
**não é lícito**, porque aponta para a mesma classe queimada.

### 3.5 Caso `B-O6R-06` DELTA — conserto de isolamento + registro · junta concluída 2026-09-09 · **APROVADO 3×0** · PR #385

Ata: `J-B-O6R-06-delta.md` (head julgado **`e26eb9e5`**; merge `15ef3fbe`). Briefing:
`BRIEFING-B-O6R-06-delta.md`. Votos: `votos/B-O6R-06-delta/`. As seis nasceram no commit de branch
**`764a3b04` (2026-09-09)**, criadas pela `agente-fabrica` depois que o inspetor bloqueou a primeira
convocação, que usava as seis `jurado-06-*` do §3.4, já sepultadas.

> **Acrescentado a posteriori, e é a SEGUNDA vez da mesma dívida.** O §1.5 manda a linha entrar **no mesmo
> PR em que a junta fecha**. A junta do delta fechou e foi persistida **no próprio #385** — e o orquestrador,
> que tinha acabado de pagar exatamente esta dívida para as `jurado-06-*` (§3.4), **não sepultou as
> `jurado-06d-*` no mesmo PR**. Quem nomeou a omissão foi o `porteiro-pos-merge` do #385 (ressalva 2 do
> parecer de 2026-09-11: "`OBITUARIO-IDENTIDADES.md` tem **0** menções a `jurado-06d-*`"). Pago aqui, no PR
> seguinte, declarado.

| # | Identidade | Papel | Status | Classe | Evidência | Nasceu em |
|---|---|---|---|---|---|---|
| 1 | `jurado-06d-banco-atomicidade-rls` | titular, cadeira C1 (veto) — banco/isolamento | **SEPULTADA** | `votou` | `votos/B-O6R-06-delta/C1-banco-atomicidade-rls-voto.json` (campo `jurado` nomeia a si mesma; `voto: APROVADO`; `head_medido: e26eb9e5`) + evidência + ata §2 | `764a3b04` (2026-09-09) |
| 2 | `jurado-06d-invariante-financeiro-rateio` | titular, cadeira C2 (veto) — invariante financeiro/rateio | **SEPULTADA** | `votou` | `votos/B-O6R-06-delta/C2-invariante-financeiro-rateio-voto.json` (`voto: APROVADO`, `achados_bloqueantes: 0`) + evidência + ata §2 | `764a3b04` (2026-09-09) |
| 3 | `jurado-06d-contrato-regressao-registro` | titular, cadeira C3 (veto) — contrato/regressão/registro | **SEPULTADA** | `votou` | `votos/B-O6R-06-delta/C3-contrato-regressao-registro-voto.json` (`voto: APROVADO`) + evidência + ata §2 | `764a3b04` (2026-09-09) |
| 4 | `jurado-06d-suplente-banco-atomicidade-rls` | suplente da cadeira C1 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-B-O6R-06-delta.md` §1 (tabela de composição, coluna suplente) — caso **concluído** | `764a3b04` (2026-09-09) |
| 5 | `jurado-06d-suplente-invariante-financeiro-rateio` | suplente da cadeira C2 | **SEPULTADA** | `nomeada-e-preparada` | idem | `764a3b04` (2026-09-09) |
| 6 | `jurado-06d-suplente-contrato-regressao-registro` | suplente da cadeira C3 | **SEPULTADA** | `nomeada-e-preparada` | idem | `764a3b04` (2026-09-09) |

**As 12 do `B-O6R-06` saem do diretório vivo neste mesmo PR** (`D-APOSENTADORIA-ELENCO-EFEMERO`, registro
nominal em `controle/aposentadoria-especialistas.md`, rodada 2). O corpo de cada uma segue lível em
`15ef3fbe` (`git show 15ef3fbe:.claude/agents/especialistas/<nome>.md`).

---

### 3.6 Caso PR #386 (plano SAN3), ciclo 2 — cobertura de fluxo prometido · junta concluída 2026-09-12 · **REPROVADO 1×2** · PR #386

Ata: `J-SAN3-plano-ciclo2.md` (conteúdo julgado **`ecc32712`**; head na junta `03e4977a`). Briefing:
`BRIEFING-SAN3-plano-ciclo2.md`. Votos: `votos/SAN3-plano-ciclo2/`. As duas nasceram no commit de branch
**`f84bc634` (2026-09-12)**, criadas pela `agente-fabrica` pelo protocolo de dificuldade (§C7.4, ciclo 1 → 2) depois
da reprovação 0×3 do ciclo 1 (`J-SAN3-plano-ciclo1.md`), com a competência que faltou ao plano: cobertura de fluxo
prometido. **Sepultadas no mesmo PR em que a junta fechou** (§1.5).

| # | Identidade | Papel | Status | Classe | Evidência | Nasceu em |
|---|---|---|---|---|---|---|
| 1 | `jurado-san3c2-cobertura-de-fluxo` | titular, cadeira C1 (veto) — cobertura de fluxo prometido, agenda e viabilidade | **SEPULTADA** | `votou` | `votos/SAN3-plano-ciclo2/C1-cobertura-de-fluxo-voto.json` (`veredito: REPROVADO`, `modelo: claude-opus-5`) + evidência + ata | `f84bc634` (2026-09-12) |
| 2 | `jurado-san3c2-suplente-cobertura-de-fluxo` | suplente da cadeira C1 | **SEPULTADA** | `nomeada-e-preparada` | `BRIEFING-SAN3-plano-ciclo2.md` §1 (tabela de composição, coluna suplente) — caso **concluído** | `f84bc634` (2026-09-12) |

As permanentes que votaram (`guardiao-fail-closed`, `agente-ci-doutor`) e as nomeadas como suplentes
(`agente-secops`, `agente-dba-guardiao`) **não entram aqui** — o §4 não as cobre.

**A aposentadoria NÃO é neste PR.** A `D-APOSENTADORIA-ELENCO-EFEMERO` exige "ata fechada **e PR mergeado**"; as duas
saem do diretório vivo no primeiro PR depois do merge do #386 (rodada 3 de `controle/aposentadoria-especialistas.md`),
com o corpo lível no squash do #386. O §1 do briefing do ciclo 2 dizia "sepultadas e aposentadas no mesmo PR" —
divergência registrada no §5 da ata.
