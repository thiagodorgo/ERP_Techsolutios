# Aposentadoria de especialistas de junta — registro nominal

> **Para que serve.** Jurado de junta é **efêmero por desenho** (§C7.4): a `agente-fabrica` cria cadeiras sob
> medida para um bloco, elas votam, e o bloco fecha. O que o contrato nunca disse é **quando elas saem do
> diretório vivo** — e o resultado foi elenco acumulado. Este arquivo é o registro de quem saiu, de qual
> bloco, sob qual ata, e **em que commit o corpo pode ser lido de volta**.
>
> **Aposentar não apaga.** O corpo do agente continua no Git para sempre; a ata continua sendo a prova do
> voto. O que muda é só o diretório vivo, e o motivo é medido: a `description` de cada especialista entra no
> contexto de **toda sessão**, tenha ela relação com o bloco ou não.
>
> **Critério (aprovado pelo dono em 2026-09-07, `D-APOSENTADORIA-ELENCO-EFEMERO`):** especialista cujo bloco
> tem **ata fechada e PR mergeado** é aposentado. Cadeira de bloco **em voo** nunca sai. A remoção é sempre
> **por identificador de BLOCO**, nunca por nome de cadeira solto — nomes de papel colidem entre sessões.
>
> **Como reviver:** `git show <commit>:.claude/agents/especialistas/<nome>.md`. Se a competência voltar a ser
> necessária, o normal é a `agente-fabrica` criar uma cadeira **nova** (identidade nova é requisito do §C7.4);
> o corpo antigo serve de molde, não de ocupante.

---

## Rodada 1 — 2026-09-07 · bloco `B-GOV-ELENCO` · 15 cadeiras

Medido em `origin/main@fe2748c8`. Peso removido do contexto de toda sessão: **~19,8 KB de `description`
(~5.068 tokens)**.

| # | Cadeira | Bloco | Ata | PR que fechou | Corpo em |
|---|---|---|---|---|---|
| 1 | `critico-c5-adversarial` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 2 | `suplente-critico-c5-adversarial` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 3 | `jurado-c5-arnes-catalogo-postgres` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 4 | `jurado-c5-suplente-arnes-catalogo-postgres` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 5 | `jurado-c5-banco-fk-triggers` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 6 | `jurado-c5-suplente-banco-fk-triggers` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 7 | `jurado-c5-validador-diff-plano` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 8 | `jurado-c5-suplente-validador-diff-plano` | B-O6R-02 ciclo 5 | `J-B-O6R-02-ciclo5.md` | #371 | `e6a64619` |
| 9 | `especialista-arnes-postgres-node` | B-O6R-02 ciclos 1–2 | `J-B-O6R-02-ciclo2.md` | #371 | `99f18403` |
| 10 | `especialista-maquinas-de-desfazer` | B-O6R-02 ciclos 1–2 | `J-B-O6R-02-ciclo2.md` | #371 | `99f18403` |
| 11 | `inspetor-fixtures-financeiras-legadas` | B-O6R-02 ciclo 1 | `J-B-O6R-02-ciclo1.md` | #371 | `99f18403` |
| 12 | `jurado-07b-contrato-mobile-b108` | B-O6R-07b | `J-B-O6R-07b.md` | #380 | `fe2748c8` |
| 13 | `jurado-07b-suplente-contrato-mobile-b108` | B-O6R-07b | `J-B-O6R-07b.md` | #380 | `fe2748c8` |
| 14 | `jurado-07b-contrato-regressao-registro` | B-O6R-07b | `J-B-O6R-07b.md` | #380 | `fe2748c8` |
| 15 | `jurado-07b-suplente-contrato-regressao-registro` | B-O6R-07b | `J-B-O6R-07b.md` | #380 | `fe2748c8` |

**Elenco de especialistas depois desta rodada: 0.** O diretório `.claude/agents/especialistas/` fica vazio
até a próxima junta — que é o estado correto: cadeira efêmera só existe enquanto vota.

### Duas observações que a remoção NÃO pode engolir

**(a) `especialista-arnes-postgres-node` já estava QUEIMADO, não apenas encerrado.** O corpo de
`jurado-c5-arnes-catalogo-postgres` o nomeia entre as identidades substituídas ("todos queimados") junto de
`inspetor-de-arnes-concorrente`, `jurado-c4-arnes-concorrente` e `jurado-c4-suplente-arnes-concorrente`.
Queimado é mais forte que aposentado: ele era **inelegível** para aquele bloco mesmo se ficasse.

**(b) `especialista-maquinas-de-desfazer` tem competência REUTILIZÁVEL, e sai mesmo assim.** A `description`
dele é genérica de verdade — "QUALQUER caminho que desfaz (delete, reverse, estorno, cancel, bounce, unclear,
reabertura, rollback)", "quando duas superfícies diferentes tocam o mesmo dinheiro", "quando uma suíte prova
invariante financeira pela EXISTÊNCIA de uma linha em vez do efeito líquido". É competência de papel
**permanente**, não de cadeira de bloco; o corpo é que está amarrado ao `B-O6R-02`. Sai por critério (o bloco
fechou), mas fica registrado como **`P-GOV-MAQUINAS-DE-DESFAZER-PROMOVER`**: se um bloco voltar a mexer em
caminho que desfaz dinheiro, o certo é **promovê-lo a papel permanente** em `.claude/agents/` com o corpo
generalizado — não recriá-lo como cadeira efêmera de novo.

---

## Rodada 2 — 2026-09-11 · bloco `B-O6R-06` · 12 cadeiras

Medido em `origin/main@15ef3fbe` (o squash do #385, onde as 12 entraram). Peso removido do contexto de toda
sessão: **~24,3 KB de `description` (24.897 caracteres, ~6.224 tokens)**, pelo método do auditor
(frontmatter linha a linha, aspas removidas, `String.length`). Remoção **por identificador de bloco**: os
prefixos `jurado-06-` (junta de mérito) e `jurado-06d-` (junta do delta) pertencem só ao `B-O6R-06`, e o
diretório não tinha nenhum outro arquivo (conferido antes do `git rm`).

| # | Cadeira | Bloco | Ata | PR que fechou | Corpo em |
|---|---|---|---|---|---|
| 1 | `jurado-06-banco-atomicidade-rls` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 2 | `jurado-06-contrato-regressao-kpi` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 3 | `jurado-06-invariante-financeiro-rateio` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 4 | `jurado-06-suplente-banco-atomicidade-rls` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 5 | `jurado-06-suplente-contrato-regressao-kpi` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 6 | `jurado-06-suplente-invariante-financeiro-rateio` | B-O6R-06 mérito | `J-B-O6R-06.md` | #385 | `15ef3fbe` |
| 7 | `jurado-06d-banco-atomicidade-rls` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |
| 8 | `jurado-06d-contrato-regressao-registro` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |
| 9 | `jurado-06d-invariante-financeiro-rateio` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |
| 10 | `jurado-06d-suplente-banco-atomicidade-rls` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |
| 11 | `jurado-06d-suplente-contrato-regressao-registro` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |
| 12 | `jurado-06d-suplente-invariante-financeiro-rateio` | B-O6R-06 delta | `J-B-O6R-06-delta.md` | #385 | `15ef3fbe` |

**Elenco de especialistas depois desta rodada: 0** — de novo o estado correto. As 12 também estão **sepultadas**
no `OBITUARIO-IDENTIDADES.md` (§3.4 e §3.5): aposentar tira do diretório vivo; sepultar tira o direito de voto.

**Observação que a remoção não pode engolir:** as seis `jurado-06d-*` só puderam votar porque o orquestrador as
**copiou para o diretório de agentes da árvore da sessão** (`demo/investidor`), já que o registro de agentes
resolve a partir de lá e não do worktree do bloco — mais uma instância de `P-GOV-CAMINHO-REPO-SESSAO`. As cópias
foram removidas no §C5 do #385 (medido: 0 restantes, 0 arquivo rastreado apagado). **E a dívida do §1.5 do
obituário se repetiu:** a junta do delta fechou no próprio #385 e as seis não foram sepultadas nele — pago
aqui, no PR seguinte, com a omissão declarada no §3.5 do obituário.

## Rodada 3 — 2026-09-17 · bloco `B-SAN3-01` (primeiro PR de execução da SAN3) · 2 cadeiras

Dívida A3 do parecer do porteiro pós-merge do #386 (`votos/SAN3-plano-opcao-B/00c-porteiro-pos-merge-386.md`), paga pelo
primeiro PR de execução a mergear. Medido em `origin/main@02bd7dab` (o squash do #386, onde as duas entraram). Peso removido
do contexto de toda sessão: **3.838 caracteres de `description` (~960 tokens)**, pelo método das rodadas anteriores
(frontmatter linha a linha, aspas removidas, `String.length`): 1.863 + 1.975. Remoção **por identificador de bloco**: o
prefixo `jurado-san3c2-` pertence só à junta do ciclo 2 do plano SAN3, e o diretório não tinha nenhum outro arquivo
(conferido antes do `git rm`).

| # | Cadeira | Bloco | Ata | PR que fechou | Corpo em |
|---|---|---|---|---|---|
| 1 | `jurado-san3c2-cobertura-de-fluxo` | plano SAN3, ciclo 2 | `J-SAN3-plano-ciclo2.md` | #386 | `02bd7dab` |
| 2 | `jurado-san3c2-suplente-cobertura-de-fluxo` | plano SAN3, ciclo 2 | `J-SAN3-plano-ciclo2.md` | #386 | `02bd7dab` |

**Elenco de especialistas depois desta rodada: 0.** As duas já estavam **sepultadas** no `OBITUARIO-IDENTIDADES.md` §3.6,
no próprio #386: aqui só saem do diretório vivo, e `node scripts/sync-agent-agents.mjs --check` segue verde.

---

## Rodada 4 — **EXECUTADA em 2026-09-21 pelo `B-SAN3-00`** (anunciada pelo `B-SAN3-04a`/#390) · bloco `B-SAN3-01` ciclo 2 · 2 cadeiras

Dívida **A1** do parecer do porteiro pós-merge do #387 (`PORTEIRO-387.md`, achado A1 — REGISTRO GRAVE), na parte que
o `B-SAN3-04a` (este PR) **não** pode pagar: a `D-APOSENTADORIA-ELENCO-EFEMERO` exige "ata fechada **e PR mergeado**",
e o precedente do #386 (rodada 3 acima) é literal — **sepultar** tira o direito de voto, **aposentar** tira do diretório
vivo, e as duas coisas não acontecem no mesmo PR.

O que este PR faz: **versiona** as duas nas duas pontas do espelho (`.claude/agents/especialistas/` por `git add -f` e
`.agents/agents/especialistas/` gerado pelo `sync-agent-agents.mjs`) e as **sepulta** no `OBITUARIO-IDENTIDADES.md`
§3.7. Até aqui elas viviam só no disco da árvore principal — invisíveis ao `git status`, sem cópia em `.agents/` —
e o `--check` ficava verde justamente porque não estavam no tree.

| # | Cadeira | Bloco | Ata | PR que versionou o corpo | PR que deve aposentar |
|---|---|---|---|---|---|
| 1 | `jurado-san3-01c2-fail-closed-web` | `B-SAN3-01` ciclo 2 | `J-B-SAN3-01.md` §Ciclo 2 | `B-SAN3-04a` (#390, `aadaa6d5`) | **`B-SAN3-00` — EXECUTADA** |
| 2 | `jurado-san3-01c2-suplente-fail-closed-web` | `B-SAN3-01` ciclo 2 | `J-B-SAN3-01.md` §Ciclo 2 | `B-SAN3-04a` (#390, `aadaa6d5`) | **`B-SAN3-00` — EXECUTADA** |

**Elenco de especialistas depois deste PR: 2** — o primeiro elenco não vazio desde a rodada 3, e é de propósito:
o corpo precisa estar no tree antes de poder ser aposentado com o corpo lível num squash. Peso no contexto enquanto
durar: os dois arquivos somam **100.138 bytes** em `.claude/agents/especialistas/` (48.295 + 51.843).
**Remoção por identificador de BLOCO** (nunca por nome de cadeira): o prefixo `jurado-san3-01c2-` pertence só à
junta do ciclo 2 do `B-SAN3-01`; quem executar confere que o diretório não ganhou arquivo de outra sessão antes do
`git rm`.

### Execução da rodada 4 — `B-SAN3-00`, 2026-09-21

Paga a **dívida 2** do parecer do porteiro pós-merge do #390 (`votos/B-SAN3-04a/00c-porteiro-pos-merge-390.md`),
pelo primeiro PR a mergear depois dele. O anúncio acima previa exatamente isto: **sepultar** tira o direito de
voto, **aposentar** tira do diretório vivo, e as duas coisas não acontecem no mesmo PR.

- **Medido em `origin/main@aadaa6d5` (o squash do #390), ANTES do `git rm`:** o tree tinha **exatamente 4**
  arquivos sob `especialistas/` — as 2 cadeiras × os 2 espelhos —, **todos** com o identificador de BLOCO
  `jurado-san3-01c2-`. **Nenhum arquivo de outra sessão no diretório** — a conferência que o próprio anúncio
  acima exige antes da remoção.
- **Remoção por identificador de BLOCO**, nunca por nome de cadeira solto
  (`feedback-remocao-por-identificador-de-bloco`): o prefixo `jurado-san3-01c2-` pertence só à junta do
  ciclo 2 do `B-SAN3-01`.
- **Nos dois espelhos**, como a dívida manda. `git diff --cached --numstat`: `0/503` e `0/533` em
  `.claude/agents/especialistas/`; `0/509` e `0/539` em `.agents/agents/especialistas/`.
- **`node scripts/sync-agent-agents.mjs --check` DEPOIS da remoção:** `OK — 23 agentes, espelho consistente`,
  `ec=0`.
- **Elenco de especialistas depois desta rodada: 0** — de volta ao estado correto; o índice de
  `especialistas/` fica vazio.
- **Peso removido do contexto de toda sessão:** arquivos **48.295 + 51.843 = 100.138 bytes** (bate **ao byte**
  com o número anunciado) · `description` **2.020 + 2.071 = 4.091 caracteres**.
- **As duas já estavam sepultadas** no `OBITUARIO-IDENTIDADES.md` §3.7, pelo próprio #390: aqui elas só saem
  do diretório vivo. Os corpos continuam legíveis para sempre —
  `git show aadaa6d5:.claude/agents/especialistas/<nome>.md`.
