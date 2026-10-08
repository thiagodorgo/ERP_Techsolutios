# Mandato — dev da errata 1 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T15:48Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      12adb603bcba94184d5b84035108ee4a169b2b68
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1045
```

## HIPOTESE

O papel e o dev da errata 1 do B-SAN3-11 (PR 401), identidade nova e local dev-errata1-b-san3-11, que nao achou, nao planejou e nao
  vota (nao e o dev de nuvem que escreveu o arnes, nem o inspetor, nem o planejador da errata, nem as cadeiras C1 a C3); a fonte e a
  secao 15 do plano docs/revisoes/SAN3/B-SAN3-11-plano.md (a errata do planejador-mestre, apensada verbatim pelo orquestrador); o dev
  declara na 1a linha da sua evidencia o papel, a identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md | grep -ic 'mandato_md5'`

Item 1 (E6 e E7 da secao 15.3): o arnes que roda o gerador fica sem teto de tempo, com erro de execucao e morte por sinal lancando com
  a causa nomeada, e toda mutacao de fonte de T13 e T14 passa por um helper que normaliza o fim de linha e prova que aplicou; so no
  arquivo frontend/tests/patios-dossie-versao.smoke.test.tsx, sem remover nem acrescentar teste (continua 16); e os vermelhos-controle
  A17, A19, A20 e A21 executados em copia de trabalho, cada um com o comando, o TAP resumido e a mensagem exata, e revertidos com diff
  vazio depois derruba com: `grep -ic 'morto por sinal' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

Item 2 (E8 da secao 15.9 e 15.10): a origin/main de agora integrada por merge e nunca por rebase, conflitos so em registro e KPI, as
  duas entradas mantidas com a deste bloco por ultimo; o KPI recontado contra ela (blocks_completed igual ao da main mais 1, o
  frontend_smoke_tests pelo TAP de uma execucao real, version e release nomeando B-SAN3-11 e o PR 401, os campos de commit de merge e de head aprovado
  nulos na autoria, history com n igual ao da main mais 1), e o app.js so pela saida de scripts/kpi-freeze.mjs com o --check verde derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

Item 3 (secao 15.8 e 15.13): a bateria nos DOIS terrenos desta maquina, um checkout CRLF e um checkout LF (com a contagem de CR no
  adapter colada em cada um), com a varredura da secao 15.7 dando TETO=0, NULL=0 e CP=1 no head novo, o diff da errata dentro do
  PERMITIDO da secao 15.5 e o do bloco dentro da secao 6 mais a emenda; a secao ERRATA 1 no DEV-relatorio.md do bloco, 1 linha em
  agent-orchestration/codex/log-execucao.md e em agent-orchestration/docs/status-geral.md; commits Conventional com git diff --check como
  trava em linha propria, e push para o ramo do PR 401, nunca main, nunca PR, nunca merge, sem linhas de atribuicao derruba com: `grep -ic 'TETO=0' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

O terreno e as regras: worktrees proprios detached C:/Users/AMP/w-dev11 (CRLF) e C:/Users/AMP/w-dev11lf (LF), npm ci proprio, sem
  junction, removidos pelo nome ao fim com 0 processo vivo; a evidencia incremental com a hora UTC em cada secao (P1) vai em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md, e a
  mensagem final e 1 linha apontando o arquivo (P2); nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout externo em tudo que executa;
  base viva erp-postgres 5432 e erp-redis 6379 nunca alvo; se a medicao provar defeito fora do PERMITIDO, grava e PARA; sob PAUSA, grava a
  secao PAUSA na evidencia, empurra o que estiver commitado e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/DEV-ERRATA1-401.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md
ec=0
head=12adb603bcba94184d5b84035108ee4a169b2b68
utc=2026-10-02T15:48:34Z
```
