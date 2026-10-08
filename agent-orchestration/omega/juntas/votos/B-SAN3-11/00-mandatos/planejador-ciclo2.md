# Mandato — planejador do ciclo 2 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T03:53Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      849f05bb25b3a1adf5ce033796ce5f0e3f638654
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
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/J-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
1449
```

## HIPOTESE

O papel e o planejador-mestre do ciclo 2 do B-SAN3-11 (PR 401), identidade nova planejador-ciclo2-b-san3-11, que nao achou, nao
  desenvolveu e nao votou; o Fable e obrigatorio porque o fluxo volta ao planejador depois de reprovacao (secao C7 item 6 do contrato);
  esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para; declara na 1a linha do arquivo de saida o papel, a
  identidade, o modelo e o mandato_md5 deste arquivo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md | grep -ic 'mandato_md5'`

Item 1: os quatro bloqueantes do registro agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md (C1-01, C2-01, C2-02 e C3-B1), lidos como relatorio de quem achou e nunca como fato,
  re-medidos por execucao propria no head do PR 401 num worktree detached proprio C:/Users/AMP/w-plc2 (o estilo computado dos links no
  navegador, as mutacoes da C2 no DTO e no receptor com o gerador e a suite, e o par pendencias e indice), com comando e saida colados;
  e a decisao do §4 do plano (nulo e vigente) tratada como premissa a reabrir, porque o C2-01 a ataca derruba com: `grep -ic 'C2-01' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md`

Item 2: o remedio de cada bloqueante decidido como PROPRIEDADE, com o criterio de aceite e a mutacao que o deixa vermelho, medido nos
  dois checkouts desta maquina (CRLF e LF): o link distinguivel do texto em repouso, sob hover e sob foco; a ausencia ou invalidez da
  chave de substituicao do lado fechado; todo ponto que apresenta a situacao de uma vistoria enumerado pela propriedade e nao pelo nome
  do receptor; e as pendencias do bloco com dono valido do plano da rodada; mais o destino de cada ajuste e nota da junta (dentro, ou
  fora com razao e dono) derruba com: `grep -ic 'mutacao\|mutação' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md`

Item 3: o escopo do ciclo 2 com caminhos exatos, a integracao da origin/main de agora por merge com o KPI recontado contra ela, a
  bateria nos dois terrenos, o papel de quem desenvolve (nao achou e nao planejou) e a composicao da junta do ciclo 2 (tres identidades
  novas, com a competencia de cada cadeira escrita para a agente-fabrica); o texto sai pronto para o orquestrador apensar ao plano
  docs/revisoes/SAN3/B-SAN3-11-plano.md como secao 16 derruba com: `grep -ic 'agente-fabrica' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md`

O terreno e as regras: o planejador nao desenvolve, nao commita e nao vota; escreve so C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md, incremental com a hora UTC (P1), mensagem
  final de 1 linha (P2); worktree proprio removido pelo nome ao fim com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada;
  timeout em tudo que executa; base viva nunca alvo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PLANO-C2-B-SAN3-11.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md
ec=0
head=849f05bb25b3a1adf5ce033796ce5f0e3f638654
utc=2026-10-03T03:53:47Z
```
