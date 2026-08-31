# OBITUÁRIO DE IDENTIDADES DE JUNTA — registro canônico de quem não pode mais votar

> **Fonte primeira** da conferência de inelegibilidade por nome (§C7.1-bis, `D-INSPETOR-TERRENO-JUNTA`).
> Criado pelo bloco **SAN2-3** (plano: `agent-orchestration/omega/planos/SAN2-3-plano.md`).
> **Append-only:** sepultamento novo = **linha nova**. Nunca se remove linha daqui — um obituário que
> encolhe deixa de ser obituário.
>
> **O descarte é LÓGICO.** Nenhum arquivo de identidade foi apagado por este registro, em branch nenhuma.
> As 17 identidades abaixo continuam existindo como arquivo na branch `demo/investidor`
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
| Identidades registradas | **17** |
| **SEPULTADAS** | **15** (6 do `B-O6R-ARNES` + 9 do `B-O6R-02` ciclo 4) |
| **RESERVADAS** | **2** (`jurado-c5-arnes-catalogo-postgres` · `critico-c5-adversarial`) |
| Arquivos apagados por este registro | **0** |

**A conta NÃO é "16 queimados + 1 preservado"** — essa lista, herdada do enunciado do bloco, erra em uma
identidade. Ver §5 (Divergência §A2).

## 3. As identidades

Colunas: **classe de queima** = `votou` (assinou voto em disco) · `nomeada-e-preparada` (entrou no briefing
como titular ou suplente de um caso já concluído; não assinou voto) · `reservada` (criada para caso que
ainda não rodou). Todas as 17 vivem, como arquivo, em `demo/investidor` **nas duas pontas do espelho**
(`.claude/agents/especialistas/<nome>.md` e `.agents/agents/especialistas/<nome>.md`).

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
