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
