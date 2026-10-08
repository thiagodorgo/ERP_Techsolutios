# Mandato — inspetor de terreno — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T11:37Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      cff64cecc9a46fea0f0adc280401c135fc660125
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1045
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 1 do B-SAN3-11 (PR 401),
  em Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e
  declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 401 resolvido pelo proprio inspetor, e so e objeto com os check-runs CONCLUIDOS (ausencia, pendente ou cancelado
  bloqueia; vermelho e insumo do voto); o tabuleiro e o da secao 10 do plano docs/revisoes/SAN3/B-SAN3-11-plano.md: as tres cadeiras
  (cognicao-visual, guardiao-fail-closed, coordenador-de-acessos) existem no origin/main e nao participaram deste bloco (inelegiveis por
  nome: o planejador do B-SAN3-11, o dev de nuvem dev-san3-11-dossie e o orquestrador); um worktree por cadeira que muta (w-j11c1,
  w-j11c2, w-j11c3) e a arvore do dev nunca mutada; nenhum jurado precisa de banco; S0 (node scripts/sync-agent-agents.mjs --check igual a
  zero); baseline honesto (frontend check e smoke com npm ci proprio); plano de perda (queda relanca a mesma identidade) e de PAUSA (P7) derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md`

Os mandatos: um por papel em agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/ com a cerca do veredito do pre-voo e a cerca igual ao head colado (errata 15.15 do plano do
  B-GOV-MANDATO); o desenvolvimento foi feito na nuvem, com mandato proprio no mesmo diretorio e relatorio em agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md, que o
  inspetor le como insumo e nao como fato; a correcao pos-CI (kpi-freeze) e parte do objeto derruba com: `grep -ic '00-mandatos' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em
  C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md e o orquestrador o
  versiona; worktree proprio detached C:/Users/AMP/w-insp401, removido pelo nome; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no
  que executa; base viva nunca alvo; nada escrito no repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md
ec=0
head=cff64cecc9a46fea0f0adc280401c135fc660125
utc=2026-10-02T11:37:57Z
```
