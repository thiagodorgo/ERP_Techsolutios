# Mandato — fabrica das cadeiras do ciclo 2 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T04:49Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      653532f7abfffc1be738c9b111d78d54d6bc4ea1
merge-base:      f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado defa502ee0a03dabbc8786d568d00f7eb7ca726d (agent-orchestration/omega/juntas/J-B-SAN3-11.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/J-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1449
```

## HIPOTESE

O papel e a agente-fabrica, instancia nova, que escreve os TRES corpos de jurado de identidade nova da junta do ciclo 2 do B-SAN3-11 (PR
  401), como a secao 16.8 do plano docs/revisoes/SAN3/B-SAN3-11-plano.md manda (identidade, competencia e itens de cada cadeira na tabela da secao); declara na 1a
  linha do seu relatorio o papel, o modelo e o mandato_md5 que o orquestrador lhe passa no disparo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md | grep -ic 'mandato_md5'`

Os corpos sao C:/Users/AMP/w-nuv11/.claude/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md (novo),
  C:/Users/AMP/w-nuv11/.claude/agents/especialistas/jurado-san3-11-c2-enumeracao-tipada.md (novo) e
  C:/Users/AMP/w-nuv11/.claude/agents/especialistas/jurado-san3-11-c2-registro-e-escopo.md (novo), cada um com a competencia e os itens
  da linha dele na tabela da secao 16.8, sem diluir, com frontmatter name, description e tools (Read, Grep, Glob, Bash) derruba com: `grep -ic 'jurado-san3-11-c2' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md`

Cada corpo segue o rigor dos jurados de identidade nova de origin/main: unanimidade de 3 com veto; achado com gravidade e escopo
  (pre-existente so com evidencia de data ou origem); nao consigo medir e REPROVADO; nao propoe correcao; P1, P2 e P7; declara o
  mandato_md5 e o md5 EOL-neutro do corpo na 1a linha da evidencia; cita so norma que existe em origin/main derruba com: `grep -ic 'unanimidade' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md`

A fabrica nao versiona nem commita (nao tem Bash), nao vota e nao escreve outro arquivo alem dos tres corpos e do relatorio C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md; o
  orquestrador gera o espelho em .agents por scripts/sync-agent-agents.mjs e versiona os dois espelhos derruba com: `grep -ic 'sync-agent-agents' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-401-c2.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/fabrica-ciclo2.md
ec=0
head=653532f7abfffc1be738c9b111d78d54d6bc4ea1
utc=2026-10-03T04:49:17Z
```
