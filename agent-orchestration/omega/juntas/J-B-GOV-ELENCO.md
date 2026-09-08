# J-B-GOV-ELENCO — ata da junta do bloco `B-GOV-ELENCO` (ciclo 1)

> **Quórum: unanimidade de 3** — §C7.1-ter(b) literal daria **maioria de 3** (governança, sem
> dinheiro/segurança/permissão/perda de dado no produto). A subida foi declarada no §8 do plano, com
> justificativa: o bloco **reescreve a regra da própria junta** e **remove 15 arquivos**. O assento permanente
> conferiu que é decisão **declarada, não silenciosa**, e que não é a escalada-por-reprovação que a auditoria
> de 28/08 mediu — mas cobrou o registro formal, feito em `D-QUORUM-B-GOV-ELENCO` (`decisoes.md`).
>
> **Head julgado:** `918f5a01` (head de **código/elenco**: `25c0112a`; o resto é registro) ·
> **Base:** `origin/main` = `fe2748c8` · **Branch:** `chore/gov-auditoria-elenco` ·
> **Worktree:** `.claude/worktrees/gov-elenco` · **Terreno:** `LIBERADO` na **3ª** passada.

---

## §1 · VEREDITO

**REPROVADO — 3×0, unânime.** Homologado pelo assento permanente com ressalva.

| Cadeira | Papel | Voto | Achados que pesaram |
|---|---|---|---|
| **C1** `validador-mestre` | diff × plano × escopo × registro | **REPROVADO** | `C1-01` ALTA · +3 BAIXA · +1 MÉDIA `pre-existente` |
| **C2** `guardiao-fail-closed` | as travas fail-closed | **REPROVADO** | `C2-01`, `C2-02` bloqueiam · +4 ALTA/MÉDIA |
| **C3** `agente-ci-doutor` | o auditor mede o que diz? | **REPROVADO** | `C3-A1`, `C3-A4` bloqueiam · `C3-A2` ALTA · +4 |
| **P** `cadeira-permanente-backend-review` | homologa o **voto** | **HOMOLOGADO COM RESSALVA** | 3 votos `GANHO`; `C2-01` re-escopado |

Votos integrais e evidência incremental (P1) em `votos/B-GOV-ELENCO/`.

---

## §2 · §C7.4-bis — QUEM OCUPOU CADA PAPEL

| Papel | Quem | Observação |
|---|---|---|
| **Quem ACHOU** | `scripts/audit-agents-skills.mjs` + o orquestrador que o rodou | e, no ciclo, as 3 cadeiras + o inspetor |
| **Quem PLANEJOU** | orquestrador (plano nasceu da medição; **as 2 decisões de rumo foram do dono**) | inelegível para votar |
| **Quem DESENVOLVEU** | orquestrador | não julgou a validade de achado nenhum |
| **Quem JULGOU** | C1, C2, C3 — papéis **permanentes**, nenhum escreveu uma linha do diff | ver §2.1 |
| **Quem HOMOLOGOU** | `cadeira-permanente-backend-review` | homologação **nº 1** |
| **Quem CORRIGE (ciclo 2)** | **agente distinto do orquestrador** — obrigatório | ver §6 |

### As três perguntas obrigatórias, respondidas por escrito

**(a) A composição cobre a competência que os achados exigem?** **Sim, e provou-se por resultado.** As três
acharam classes **diferentes** e **nenhuma redundante**: C1 pegou o painel mentindo (KPI), C2 pegou a
enumeração defendida por exclusão (fail-closed), C3 pegou o instrumento cego (medição). Duas delas chegaram
**independentemente** ao mesmo fato — `Bash` dá poder de escrita a quem julga (C2-05 e C3-A2) — o que é o
sinal mais forte de que a composição cobria.

**(b) Quem achou é quem consertou?** **Não — e nada foi consertado.** Este é o ciclo 1; o REPROVADO acabou de
sair. A regra vale a partir de agora e é a primeira linha do §6: **a correção vai para agente distinto do
orquestrador**, que escreveu o desenho reprovado.

**Nota de composição, levantada pelo inspetor e registrada aqui:** achar/planejar/desenvolver caíram **no
mesmo orquestrador**. O §C7.4-bis exige a separação em três agentes **no ciclo de REPROVAÇÃO** ("todo ciclo de
reprovação distribui…"); este é o ciclo 1, o fluxo normal do §C2. A proteção que a regra busca existiu: as
quatro cadeiras são independentes e nenhuma escreveu uma linha do diff. Registra-se também que **o "achador"
era em parte a própria ferramenta sob julgamento** — e foi exatamente aí que C3 achou o buraco.

**(c) O planejador está usando dado podre?** **Estava, e foi pego antes de codar.** A sessão vinha operando na
branch `demo/investidor`, medida em **22 commits atrás e 49 à frente** de `origin/main`: `main` tinha 38
agentes contra 57 ali (já aposentara os 9 jurados do ciclo 4), e `CLAUDE.md` (+78/−5), `AGENTS.md` (+80/−7) e
`decisoes.md` (+165/−31) divergiam. Um `§C7.1-quater` escrito ali nasceria sobre contrato desatualizado. O
dono decidiu: **branch nova de `origin/main`, edições reaplicadas sobre a versão certa**. O assento conferiu
que há **uma só cópia do plano** (`25c0112a`, 142 linhas, inalterada) — sem risco de régua sem apensos.

---

## §3 · O TERRENO: TRÊS PASSADAS, DUAS BLOQUEADAS

| Passada | Veredito | Motivo |
|---|---|---|
| 1 | **BLOQUEADO** | **Isolamento.** Três jurados apontados para **um único worktree**, com bateria que **exige injeção de defeito** (A4, C2, C3). Contaminação dos ciclos 2 e 3 armada de antemão |
| 2 | **BLOQUEADO** | **Uma regra minha que o meu próprio commit violava.** O briefing dizia que só `omega/juntas/` podia mudar após `25c0112a`; o commit `23285d2d` mexeu em `controle/pendencias.md` — para registrar a pendência nascida da ressalva R3 **do próprio inspetor**. Aplicada como escrita, mandaria as cadeiras reprovarem um caminho que o §5 **permite**: reprovação por construção |
| 3 | **LIBERADO** | os três consertos re-medidos; 0 caminhos fora de `agent-orchestration/` |

O inspetor **executou a receita de isolamento** antes de liberá-la: `0 → 1 → 0` na cópia, `0 → 0 → 0` no
worktree. Foi essa prova que destravou a passada 2. Ele também pegou uma **afirmação falsa** no briefing — eu
escrevera que o auditor roda em CI; **não roda**, a CI só executa `sync-agent-agents --check`
(`grep -c` de `audit-agents-skills|sync-agent-skills` em `ci.yml` → **0**). Virou
`P-GOV-AUDITOR-FORA-DA-CI`.

### Violação de protocolo do ORQUESTRADOR, registrada e não escondida

O primeiro disparo do inspetor levou **mandato de 7 itens**, **sem** P1 (evidência incremental em arquivo) e
**sem** P2 (voto-arquivo-primeiro) do `D-JUNTA-RESILIENTE` (§C7.7). Não houve queda — mas um parecer com 4
suítes executadas e 3 execuções do auditor ficou **inteiro numa única mensagem final**, e o postmortem de
29/08 mediu ~50% de queda numa sessão. Falha minha, não do agente. Corrigido a partir da passada 2: todos os
disparos seguintes levaram o mandato verbatim do §C7.7, ≤3 itens, P1 e P2. **Quedas na junta: 0**
(`00-quedas.md`).

---

## §4 · O QUE CADA CADEIRA PROVOU, POR EXECUÇÃO

### C1 — o painel se contradiz na mesma carga
`blocks_completed` ficou com `value: 162` e `display: "161"`, e o `app.js` renderiza `display`. Executando o
`app.js` de verdade: **card 161, gráfico 162**, JSON `value` 162, history 162, `note` dizendo "161 → 162".
A entrega do bloco **não aparece no único número que o dono abre** — e os 3 guards de KPI passam **28/28**:
silencioso. O `FROZEN` é byte-idêntico ao JSON (A8 verde), então propaga o erro para o modo `file://`.
**A1–A10 todos PASSAM**, medidos por ela; no A9 ela não amostrou 3 como o mandato permitia: verificou **as
15** aposentadorias — corpo presente no commit citado 15/15, blob idêntico 15/15, os 3 commits de revival
ancestrais de `origin/main`. **O registro de aposentadoria é verdadeiro.**

### C2 — a enumeração defendida por exclusão
`C2-01`: a regra operativa de negação nomeia **só `ANULADO`** (porteiro l.48, `CLAUDE.md` l.405 e l.232,
`decisoes.md` l.1948) — um veredito com string não prevista **não dispara a negação**, e o permitido vira o
**complemento de um conjunto enumerado**. `C2-02`: não é membro hipotético — o desenho **já produz três casos
não classificados**, e o único com rota escrita foi para o lado **permitido**; com assimetria: cadeira de
mérito que não mede é reprovada, o assento que não consegue medir **homologa com ressalva**.
Mais: `Bash` dá escrita a quem julga (`C2-05`); anular **não consome ciclo e não tem limite** — iterado,
esvazia o veto sem que nenhuma linha diga "aprovado" (`C2-06`); "fail-closed nas duas pontas" são *antes do
voto* e *depois do merge*, com o **merge no meio sem guarda** — nulidade retroativa, não prevenção (`C2-03`).

### C3 — o instrumento era cego para a própria classe
`C3-A1`: `JULGA()` casa por prefixo e **não reconhece `agente-*`** — injetando `Write, Edit, NotebookEdit` em
`agente-ci-doutor.md` (**a própria cadeira C3**) o auditor sai `OK — nenhum achado`, `ec=0`, enquanto a mesma
mutação em `validador-mestre` sai `ec=1`. `C3-A2`: `MultiEdit` passa limpo e **`Bash` está em 11 de 11**
papéis que `JULGA()` reconhece — logo o **§4.4 do plano publicou "§C7.4-bis respeitado por construção" a
partir de instrumento cego para a classe**. Hoje o §C7.4-bis é respeitado **por convenção, não por
construção**. `C3-A4`: terceira classe de falso-positivo — fence indentado, fence `~~~`, code span inline e
`description` YAML multi-linha, cada um `ec=1` com artefato válido.
**Confirmou o que está são:** 9 das 10 checagens, A4 cumprido `0→1→0`, os dois consertos **load-bearing por
falsificação** (71 e 6 falsos-positivos voltam se revertidos), controle `--ref fe2748c8` = `ec=1` com 6
BLOQUEIA, e `--ref` medindo o commit de verdade.

---

## §P · ASSENTO PERMANENTE — HOMOLOGAÇÃO Nº 1 (§C7.1-quater)

Rodou **depois** dos três votos de mérito e **antes** de qualquer merge. Parecer integral em
`votos/B-GOV-ELENCO/99-cadeira-permanente.md`.

**P.1 · Cada voto foi GANHO? Os três, sim** — e ele **reexecutou** uma afirmação central de cada uma:
`16/16 · 6/6 · 6/6 · 12/12` das suítes de KPI e o `metricDisplay` → card 161 (C1); o controle de mutação
`ec=1` (C2); `agente-ci-doutor +Write → ec=0` contra `validador-mestre → ec=1`, e fence de til → 1 `C8` falso
(C3). Ressalva comum: **nenhuma publicou a versão do Node**; só C3 publicou forma completa.

**P.2 · Cada veto foi LEGÍTIMO?** `C1-01`, `C2-02`, `C3-A1` e `C3-A4`: **LEGÍTIMOS**, `dentro-do-bloco`,
dentro do §5, com evidência que ele reproduziu. **`C2-01` re-escopado** — o componente **textual** sustenta
`ALTA`; o componente **mecânico** ("veredito de junta é prosa sem parser") **antecede o bloco**
(D-SAN-AUTONOMIA 13/07, porteiro 12/08, inspetor 24/08; `grep` de parsers em `scripts`/`tests`/`.github` →
**0**) e exigiria `tests/**` ou `.github/**`, que o **§5-bis PROÍBE**. Logo **não se sustenta como veto
mecânico** e vira pendência com bloco dono.
**Reprovação por construção: nenhuma.** Nenhuma cadeira cobrou `.gitignore`, `.github/**`, `src/`, `tests/`,
suíte local ou `blockchain-developer`; C2 e C3 declararam explicitamente que não cobram a CI.

**P.3 · Quórum:** exigido `maioria de 3`, aplicado `unanimidade de 3`, subida **declarada** no §8 do plano —
mas ausente de `decisoes.md`. Cobrou o registro. Efeito neste ciclo: **nenhum** (3×0). Votos perdidos: **0**;
o assento **não** ocupou cadeira de mérito.

**P.4 · Série entre juntas:** primeira homologação — sem série para comparar. Não fabricou tendência.

**P.5 · A série dele:** **homologadas 1 (com ressalva) · anuladas 0.** É esta linha que o
`porteiro-pos-merge` confere (item 5-bis).

**VEREDITO:** `HOMOLOGADO COM RESSALVA` — a reprovação 3×0 **vale**.

---

## §5 · PENDÊNCIAS

Abertas por este ciclo, em `agent-orchestration/controle/pendencias.md`:
`P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER` · `P-GOV-WORKTREES-NAO-IGNORADAS` · `P-GOV-SKILLS-RELEVANCIA` ·
`P-GOV-AUDITOR-FORA-DA-CI` · `P-GOV-VEREDITO-SEM-PARSER` (C2-01 mecânico, re-escopado pelo assento) ·
`P-GOV-BASH-EM-QUEM-JULGA` (C2-05 / C3-A2, componente `pre-existente`) ·
`P-GOV-ESPELHO-CONTRATO-SEM-GUARD` (C2-07) · `P-GOV-NOTA-KPI-CONGELADA` (C1-05, **dono `B-O6R-02` ciclo 5**).

## §6 · CONSEQUÊNCIA — o ciclo 2

`D-TETO-DOIS-CICLOS`: **este foi o ciclo 1**. O ciclo 2 corrige e volta à junta com **identidade nova na
cadeira que reprovou**. Reprovando no ciclo 2, **para** — dossiê ao dono, sem ciclo 3.

**Obrigatório no ciclo 2, e a ata registra para que não se perca:**
1. **A correção vai para agente distinto do orquestrador** (§C7.4-bis). Quem escreveu o desenho reprovado
   **não** o conserta. O `planejador-mestre` (**Fable obrigatório** quando o fluxo volta para ele após
   correção — §C7.6) escreve o plano a partir dos relatórios; outro agente implementa.
2. **Fechar antes de recomeçar**, conforme a ressalva do assento: o re-escopo de `C2-01`; o registro do
   quórum (feito — `D-QUORUM-B-GOV-ELENCO`); as pendências nomeadas; a exceção do briefing §7 para
   `votos/<bloco>/` (o "nenhum jurado escreve" contradizia o P2, que **manda** o jurado escrever ali); e a
   exigência de que os próximos votos publiquem **versão do Node e `core.autocrlf`**.
3. **O que NÃO se herda:** nada de `C1`, `C2` ou `C3` conta como fato no ciclo 2 sem re-execução — mas a
   evidência **registrada em arquivo** (P1/P3) é roteiro de re-execução barata.

**O que este ciclo entregou de válido, e que a reprovação não apaga:** os cinco defeitos reais medidos em
`origin/main` (5 skills que nunca carregaram, 15 especialistas acumulados, índice do Codex divergente) são
**verdadeiros e independentes do desenho reprovado** — C1 verificou o registro de aposentadoria 15/15 e todos
os A1–A10. O que a junta reprovou foi **o desenho do assento permanente** (C2), **o instrumento de medição**
(C3) e **um erro de publicação no painel** (C1).
