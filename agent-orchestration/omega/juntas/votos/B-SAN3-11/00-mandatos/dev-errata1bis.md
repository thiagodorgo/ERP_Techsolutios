# Mandato — retomada do dev da errata 1 (1-bis) — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T20:55Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      ff1f69b4de1e04ac8b75f02018faa12591538492
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1319
```

## HIPOTESE

O papel e a retomada do dev da errata 1 do B-SAN3-11 (PR 401), a MESMA identidade dev-errata1-b-san3-11 (local, Opus), que parou com
  duas divergencias e agora segue a errata 1-bis do planejador, apensada verbatim pelo orquestrador como subsecao 15-bis do plano
  docs/revisoes/SAN3/B-SAN3-11-plano.md; o dev declara na 1a linha da secao de retomada da sua evidencia o papel, a identidade, o modelo
  e o mandato_md5 deste arquivo derruba com: `grep -ic 'mandato_md5' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

Item 1 (passos 0 e 1 da secao 15-bis.5): o ramo remoto do PR integrado ao head local do dev por merge e nunca por rebase, e o E9 (so a linha
  de status da pendencia P-CHK-DOSSIE-VERSAO-NA-UI em agent-orchestration/controle/pendencias.md e o indice regenerado pelo gerador, sem
  edicao manual), cada um em commit proprio derruba com: `grep -ic 'SEM STATUS' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

Item 2 (passos 2 a 4): no head final, os controles A17 linha nova, A19, A20 e A21 por mutacao em copia de trabalho com o TAP contado e
  a restauracao provada por diff vazio, e a bateria da secao 15.8 inteira nos dois terrenos (CRLF e LF, com a contagem de CR colada), com
  a varredura v2 da secao 15-bis.7 (auto-teste colado antes de usar) dando TETO=0, NULL=0, CP=1 e EOL=3 nomeados, e o A26; recontagem
  do KPI so se o smoke ou a main mudarem derruba com: `grep -ic 'ERR_ASSERTION' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

Item 3 (passos 5 a 7): a secao de retomada no DEV-relatorio.md do bloco (append, sem reescrever a da parada), 1 linha em
  agent-orchestration/codex/log-execucao.md e em agent-orchestration/docs/status-geral.md, o push fast-forward para o ramo do PR depois de
  provar a ancestralidade, nunca force, nunca main, nunca PR, sem linhas de atribuicao, e os dois worktrees do dev removidos pelo nome
  com 0 processo vivo derruba com: `grep -ic 'is-ancestor' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

O terreno e as regras: o que a secao 15-bis.4 diz que vale nao se refaz; se a medicao contradisser a errata 1-bis, o dev grava e PARA de
  novo; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout externo em tudo que executa; base viva nunca alvo; evidencia incremental com
  hora (P1); mensagem final de 1 linha (P2); sob PAUSA grava a secao PAUSA, empurra o que estiver commitado e pronto e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md
ec=0
head=ff1f69b4de1e04ac8b75f02018faa12591538492
utc=2026-10-02T20:55:46Z
```
