# Mandato — inspetor de terreno novo — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T23:31Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      97e5ec12d5aff21d2c7d875b34184d99abbeefbd
merge-base:      f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #401
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1449
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia NOVA para a junta 1 do B-SAN3-11 (PR 401),
  como a secao 15.11 do plano manda depois da correcao pre-junta (a instancia que emitiu o primeiro parecer BLOQUEADO nao repete), em
  Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e declara
  na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-b.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 401 resolvido pelo proprio inspetor, so com os check-runs CONCLUIDOS; o primeiro parecer em
  C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md e insumo a re-verificar, nunca fato; o baseline honesto e re-medido NOS DOIS
  terrenos desta maquina, um checkout CRLF (o de core.autocrlf=true, onde o primeiro parecer achou vermelho) e um checkout LF, com a
  contagem de CR colada em cada um: o frontend check, o arquivo de teste do bloco e o test:smoke com N e forma por TAP derruba com: `grep -ic 'CRLF' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-b.md`

O tabuleiro: o delta entre o fim do codigo do bloco (nomeado no briefing agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md) e o
  objeto so traz as duas integracoes da main e registro, como o briefing descreve, e o diff do PR contra a main fica no escopo do plano; as tres cadeiras (cognicao-visual, guardiao-fail-closed, coordenador-de-acessos) existem no origin/main e a
  inelegibilidade e conferida por nome contra a lista do briefing; um worktree por cadeira que muta (w-j11c1, w-j11c2, w-j11c3) e a
  arvore do orquestrador nunca mutada; S0 (node scripts/sync-agent-agents.mjs --check igual a zero); os mandatos novos das tres cadeiras
  em C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/ com a cerca igual ao head colado e lendo o briefing; plano de perda (queda relanca a mesma identidade) e de PAUSA derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-b.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-b.md e o orquestrador o versiona; worktrees
  proprios detached C:/Users/AMP/w-insp401b (CRLF) e C:/Users/AMP/w-insp401lf (LF), npm ci proprio sem junction, removidos pelo nome com
  0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que executa; base viva nunca alvo; nada escrito no
  repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-b.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md
ec=0
head=97e5ec12d5aff21d2c7d875b34184d99abbeefbd
utc=2026-10-02T23:31:53Z
```
