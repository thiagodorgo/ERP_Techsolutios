# J-B-TRC-02 — ciclo 1

> Registro documental escrito em 2026-10-24 a partir dos votos, evidências, mandatos, parecer do inspetor e do plano de auditoria do ciclo 2. O redator não vota, não julga mérito e não reabre as medições.

## Objeto e régua

- **Entrega:** B-TRC-02, PR #454 — eventos e telemetria do Traccar.
- **Objeto julgado:** `38504427a7b962545e559bd4d312b520b458ac42`.
- **Tipo:** junta completa de segurança, com inspetor e 3 cadeiras; unanimidade com veto.
- **Terreno:** `LIBERADO COM RESSALVA` na reinspeção de 2026-10-21 às 08:04Z.
- **approved_head:** nenhum — REPROVADO (ciclo 1)

## Inspeção de terreno

O inspetor `inspetor-trc02-opus` liberou as três cadeiras sobre o objeto acima e registrou:

- **R-1:** a unidade do parecer do porteiro do #426 saiu vazia nos mandatos por defeito de geração; a saída real medida foi `72:LIBERADO COM RESSALVA`.
- **R-2:** monocultura Opus declarada; as cadeiras, o dev, o DBA e o redator usaram Claude Opus por escolha do dono.
- **R-3:** cada cadeira devia ser disparada com `model: "opus"` explícito, carregar o corpo pelo blob do objeto e não editar arquivo rastreado.

Parecer e evidência: `agent-orchestration/omega/juntas/votos/B-TRC-02/insp-trc02-parecer.md` e `insp-trc02-evidencia.md`.

## Papéis do ciclo 1 (§C7.4-bis)

- **Planejadores:** `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `planejador-trc02-emenda-fable`, `planejador-trc02-escopo-fable`, `planejador-trc02-v23-fable` e `planejador-trc02-v24-fable` — Fable, topo declarado.
- **Críticos e pré-revisão:** `critico-trc02-opus`, `critico-trc02-flash`, `critico-trc02-r2-opus` e `prerev-trc02-flash`.
- **Desenvolvedor:** `dev-trc02-opus`.
- **DBA guardião:** `dba-trc02-opus`; parecer favorável anterior aos votos e fora do objeto, divergência declarada nos mandatos.
- **Redatores/registro:** `redator-trc02-opus`, `redator-trc02-v2`, `redator-trc02-cdx`, `red-trc02-arg` e `registrador-trc02-opus`.
- **Fábrica dos especialistas:** `fabrica-trc02-opus` e `fabrica-trc02b-opus`.
- **Inspetor:** `inspetor-trc02-opus`.
- **Cadeiras:** (a) `jurado-trc02-a-opus`; (b) `jurado-trc02-b-opus`; (c) `jurado-trc02-c-opus`.

Quem achou o bloqueio foi a cadeira (b). Não houve conserto no ciclo 1. A auditoria e o plano do ciclo 2 foram escritos por identidade nova, `planejador-trc02-c2-fable`; o desenvolvimento seguinte foi atribuído a identidade distinta, `dev-trc02-c2-argon`.

## Composição e modelo

O dono escolheu em 2026-10-21 a opção **“3 em Claude Opus (Recomendado)”**, conforme relato do orquestrador declarado como tal. A composição efetiva foi monocultura Claude Opus e ficou registrada como ressalva R-2 do inspetor. Nenhuma substituição de modelo foi aplicada antes das quedas.

## Votos e evidências

| Cadeira | Estado do artefato | Resultado que conta | Registro |
|---|---|---|---|
| (a) banco, RLS, migração e arnês | voto `EM APURAÇÃO`; cerca de 21 seções incrementais de evidência | **voto perdido; não conta (P3)** | queda no item 3; a evidência gravada é somente roteiro de reexecução para sucessor |
| (b) superfície, segredo, escopo, auth e registro | voto concluído | **REPROVADO** | 1 achado `bloqueia`, `dentro-do-bloco`, não grave; 3 notas |
| (c) contrato de evento, allowlist, unidades e ordem | voto `EM APURAÇÃO`; evidência inicial | **voto perdido; não conta (P3)** | queda no cabeçalho de terreno; redo integral |

### Cadeira (b)

- **b-1 — bloqueia, dentro do bloco, não grave:** `phaseTwoSteps` manteve o andaime estrutural da variante Q1 = SIM revertida — `let binding`, atribuição posterior, alias `locked` e leituras de `locked` nos passos 3, 5 e 6. A evidência registrou 7 linhas fora das faixas permitidas do §6.6, sem efeito de comportamento medido. Como era o ciclo 1, o achado reprovou.
- **b-2 — nota:** `position.schema` passou a exportar seis helpers e o tipo de erro ganhou quatro motivos de evento fora da coluna literal “Muda”; o mecanismo era exigido pelo próprio plano e estava declarado no relatório.
- **b-3 — nota:** o critério escrito para `P-TRC-DEMO-LOGIN-SEM-ORG-INERTE` comparava o corpo público com `inert_no_execute`, estado que o corpo público não produz; a medição que distingue a propriedade é `active` com o passo do demo × `inactive` sem ele.
- **b-4 — nota:** o trecho “Contagens finais” com 97/434 estava superado pelas seções v2.3/v2.4, que registraram 103/463.

Os arquivos de voto e evidência ficam em `agent-orchestration/omega/juntas/votos/B-TRC-02/`. As duas perdas estão registradas, com custo de redo, em `00-quedas.md`.

## Respostas obrigatórias da reprovação (§C7.4-bis)

- **(a) A composição cobriu a competência?** Para o achado, **sim**: a cadeira (b), responsável por escopo/pathspec, encontrou-o por parse e `git show`. Para a junta, **não**: as cadeiras (a) e (c) não chegaram a voto. Banco/RLS e contrato de evento não foram julgados por inteiro; o ciclo 2 os julga pela primeira vez.
- **(b) Quem achou consertou?** **Não.** Ainda não havia conserto. Quem achou foi `jurado-trc02-b-opus`; quem auditou e planejou o ciclo 2 foi `planejador-trc02-c2-fable`; quem desenvolveria foi `dev-trc02-c2-argon`.
- **(c) O planejador usou dado podre?** O plano do ciclo 2 mediu o objeto por `git show`, o GitHub por `gh` e o merge-tree contra a `origin/main`. Dois fatos ficaram expressamente como relato do orquestrador: a causa da queda da cadeira (a) e a decisão do dono de 24/10 sobre o topo. A intenção do dev ao manter o andaime ficou expressamente como hipótese; a correlação com `M-E16′` foi medida.

## Veredito do ciclo 1

**REPROVADO.** Em junta de segurança com unanimidade e veto, o voto concluído e vermelho da cadeira (b) basta para reprovar. Os votos perdidos das cadeiras (a) e (c) não contam a favor nem contra; suas evidências incrementais servem apenas como roteiro P3.

O ciclo 2 refaz as três cadeiras com identidades novas: a cadeira (b) por estar vermelha; as cadeiras (a) e (c) porque não existe voto verde a carregar.

## Nota de norma inexistente na ref

Medido no objeto `38504427`: `§C7.1-quater` e “assento permanente” **não existem como norma na ref julgada**. A única menção relacionada está na anedota do §A7. O molde `TEMPLATE-J-ata.md` cita esses termos, mas não cria obrigação; pela regra §A7, norma ausente na ref não se aplica.
