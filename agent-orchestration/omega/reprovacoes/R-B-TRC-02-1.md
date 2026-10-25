# R-B-TRC-02 — ciclo 1 (2026-10-21)

**Entrega:** B-TRC-02, PR #454 — eventos e telemetria do Traccar.
**Junta (segurança, completa):** inspetor de terreno (`inspetor-trc02-opus`, `LIBERADO COM RESSALVA`) · 3 cadeiras, unanimidade com veto. Ata: `agent-orchestration/omega/juntas/J-B-TRC-02-ciclo1.md` (objeto `38504427`).
**Arquivo gravado em 2026-10-24** pelo commit R do ciclo 2. O conteúdo vem dos artefatos do ciclo 1 e do plano de auditoria do ciclo 2; nada foi re-medido por este registro.

## Veredito do ciclo 1: REPROVADO

- **(a) banco, RLS, migração e arnês** (`jurado-trc02-a-opus`) → voto `EM APURAÇÃO`; caiu no item 3 por limite semanal do Claude. **Voto perdido, não conta (P3)**. A evidência incremental é roteiro de reexecução.
- **(b) superfície, segredo, escopo, auth e registro** (`jurado-trc02-b-opus`) → **REPROVADO**, por b-1: resíduo estrutural da variante Q1 = SIM revertida em `phaseTwoSteps`, classificado como `bloqueia`, `dentro-do-bloco`, não grave e sem efeito de comportamento medido. Também registrou as notas b-2, b-3 e b-4.
- **(c) contrato de evento, allowlist, unidades e ordem** (`jurado-trc02-c-opus`) → voto `EM APURAÇÃO`; caiu no cabeçalho de terreno por limite semanal do Claude. **Voto perdido, não conta (P3)**.

As quedas e os custos de redo estão em `agent-orchestration/omega/juntas/votos/B-TRC-02/00-quedas.md`.

## Auditoria de topo (`D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO`)

`planejador-trc02-c2-fable` (Fable) confirmou que b-1 é um achado real de escopo/higiene, não grave e sem efeito de comportamento; a régua era escrita e passável, e a máquina foi considerada sã. Plano: `docs/revisoes/TRACCAR/B-TRC-02-ciclo2-auditoria-e-plano.md`.

## As três perguntas da reprovação (§C7.4-bis)

- **(a) A composição cobriu a competência?** Para b-1, sim; para a junta inteira, não, porque (a) e (c) não concluíram votos.
- **(b) Quem achou conserta?** Não. Achou `jurado-trc02-b-opus`; planejou `planejador-trc02-c2-fable`; o desenvolvimento seguinte foi atribuído a `dev-trc02-c2-argon`.
- **(c) Dado podre no planejamento?** As medições foram feitas no objeto/ref-alvo. A causa da queda da cadeira (a) e a decisão do dono sobre o topo foram rotuladas como relato do orquestrador; a intenção do dev foi mantida como hipótese, não fato.

## Separação de papéis e composição

- **Planejamento do ciclo 1:** `planejador-trc02-fable`, `planejador-trc02-v2-fable`, `planejador-trc02-emenda-fable`, `planejador-trc02-escopo-fable`, `planejador-trc02-v23-fable` e `planejador-trc02-v24-fable`.
- **Crítica/pré-revisão:** `critico-trc02-opus`, `critico-trc02-flash`, `critico-trc02-r2-opus` e `prerev-trc02-flash`.
- **Desenvolvimento:** `dev-trc02-opus`; **DBA:** `dba-trc02-opus`; **inspetor:** `inspetor-trc02-opus`.
- **Redação/registro/fábrica:** identidades discriminadas na ata do ciclo 1.
- **Cadeiras:** `jurado-trc02-a-opus`, `jurado-trc02-b-opus` e `jurado-trc02-c-opus`.

O dono escolheu em 2026-10-21 **“3 em Claude Opus (Recomendado)”**, conforme relato do orquestrador declarado como tal. A monocultura Opus ficou registrada na ressalva R-2 do inspetor.

## Norma da ref e ação

`§C7.1-quater` e “assento permanente” não existem como norma no objeto `38504427`; a citação no molde de ata não obriga (§A7).

O ciclo 2 refaz as três cadeiras com identidades novas: a (b) por voto vermelho; (a) e (c) porque voto perdido não é verde carregável. O plano determina registrar o ciclo 1, integrar a `main`, remover o resíduo b-1 sem mudar comportamento, reancorar `M-E16″`, executar a bateria e recompor a junta.
