# Mandato — dev do ciclo 2, fatia D3 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T04:48Z · repo: thiagodorgo/ERP_Techsolutios

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

O papel e o dev do ciclo 2 do B-SAN3-11 (PR 401), identidade nova e local dev-ciclo2-b-san3-11 (Opus 5.5), que nao achou, nao planejou e
  nao vota (nao e o dev de nuvem nem o dev da errata), executando a fatia D3 da secao 16 do plano docs/revisoes/SAN3/B-SAN3-11-plano.md (a secao do ciclo 2, apensada
  verbatim pelo orquestrador); declara na 1a linha da sua secao do relatorio o papel, a identidade, o modelo e o mandato_md5 deste
  arquivo derruba com: `grep -ic 'mandato_md5' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md`

Item 1: a entrega E14 da secao 16.3 (as duas pendencias do bloco com dono valido do plano da rodada e o texto medido, o indice pelo gerador) derruba com: `grep -ic 'E14' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md`

Item 2: a entrega E15 da secao 16.3 e a secao 16.7 (o KPI recontado contra a main integrada, com blocks_completed igual ao da main mais 1 e
  o smoke por execucao real, a backfill_note verdadeira, o app.js so pela saida do kpi-freeze com o --check verde) derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md`

Item 3: o registro (a secao do ciclo 2 no DEV-relatorio.md do bloco, 1 linha em log-execucao e em status-geral) e o push fast-forward para
  o ramo do PR 401 depois de provar a ancestralidade, nunca force, nunca main, nunca PR; e os worktrees do dev removidos pelo nome com 0
  processo vivo derruba com: `grep -ic 'is-ancestor' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md`

O terreno e as regras: worktrees proprios C:/Users/AMP/w-dc2 (CRLF) e C:/Users/AMP/w-dc2lf (LF, core.autocrlf=false), npm ci proprio sem
  junction; commits locais em Conventional Commits com git diff --cached --check como trava, sem linha de atribuicao; so o escopo da secao
  16.4; se a medicao contradisser a secao 16, grava e PARA; evidencia incremental com hora UTC em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md (P1), mensagem final de 1 linha (P2);
  nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout em tudo; base viva nunca alvo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-C2-401.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D3.md
ec=0
head=653532f7abfffc1be738c9b111d78d54d6bc4ea1
utc=2026-10-03T04:49:05Z
```
