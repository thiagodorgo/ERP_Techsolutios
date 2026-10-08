# Mandato — planejador do ciclo 3 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T14:06Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      bf285f132c6020808210942b2a632b33a7523e1f
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado defa502ee0a03dabbc8786d568d00f7eb7ca726d (agent-orchestration/omega/juntas/J-B-SAN3-11.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 objeto declarado d24f7283bfba55d298e8118e7b590465c5a4d4d6 (agent-orchestration/omega/juntas/J-B-SAN3-11.md:90 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md .agents/agents/especialistas/jurado-san3-11-c2-enumeracao-tipada.md .agents/agents/especialistas/jurado-san3-11-c2-registro-e-escopo.md .claude/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md .claude/agents/especialistas/jurado-san3-11-c2-enumeracao-tipada.md .claude/agents/especialistas/jurado-san3-11-c2-registro-e-escopo.md Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/J-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/fabrica-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2-bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C1c2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1c2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2c2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2c2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3c2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3c2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-2.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
2079
```

## HIPOTESE

O papel e planejador-mestre, identidade NOVA planejador-ciclo3-b-san3-11 (nao achou, nao planejou nem desenvolveu ciclo algum deste
  bloco), rodando no Codex em GPT-5.6 Sol (o dono suspendeu Fable e Astra ate o reset semanal, o que suspende a obrigacao de Fable no
  retorno ao planejador, secao C7 item 6), substituicao declarada; declara na 1a linha da secao nova do plano o papel, a identidade, o
  modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo planejador-mestre do espelho Codex de origin/main derruba com: `grep -ic 'planejador-ciclo3-b-san3-11' C:/Users/AMP/w-nuv11/docs/revisoes/SAN3/B-SAN3-11-plano.md`

Item 1 — os dois bloqueia da junta 2, lidos como relato de quem achou e nunca como fato: C2c2-F1 (o gerador P-L3 e fail-open para
  acesso por indice e para conjunto vazio) e C2c2-F2 (o fluxo adapter, service, hook e painel nao limpa as linhas ao recusar resposta
  subsequente), em C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/C2c2-evidencia.md e C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/C2c2-voto.json; o planejador reproduz por execucao propria o vermelho-controle de cada um no
  head, e decide o remedio por PROPRIEDADE (o membro nao previsto nasce negado; recusa de contrato zera o estado mostrado), com a mutacao
  que deixa cada criterio vermelho derruba com: `grep -ic 'C2c2-F1' C:/Users/AMP/w-nuv11/docs/revisoes/SAN3/B-SAN3-11-plano.md`

Item 2 — o ciclo 3 inteiro: dev com identidade nova, testes antes do codigo, escopo permitido e proibido, a bateria nos dois terrenos,
  o KPI recontado contra a main, as competencias das tres cadeiras da junta 3 para a agente-fabrica, e o lembrete de que, se o ciclo 3
  reprovar com bloqueia, a auditoria da maquina vem antes do ciclo 4 (secao C7.4) derruba com: `grep -ic 'auditoria' C:/Users/AMP/w-nuv11/docs/revisoes/SAN3/B-SAN3-11-plano.md`

A secao nova entra so por adicao ao fim do plano C:/Users/AMP/w-nuv11/docs/revisoes/SAN3/B-SAN3-11-plano.md, como secao 17, sem tocar outra linha nem outro arquivo; o planejador nao conserta, nao
  escreve caso, codigo nem corpo e nao versiona derruba com: `git -C C:/Users/AMP/w-nuv11 status --porcelain | grep -iv 'B-SAN3-11-plano.md' | grep -iv '^ M .agents' | grep -ic .`

O terreno: mede num worktree proprio detached C:/Users/AMP/w-pl11c3 no head do ramo, com npm ci proprio sem junction, removido pelo nome ao
  fim com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem --worktree; timeout em tudo; base viva nunca
  alvo; a cota da conta dura de 35 a 50 minutos por janela, entao a secao 17 nasce como esqueleto EM APURACAO e cada parte e gravada assim
  que medida; sob PAUSA grava a secao PAUSA no fim e para derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-pl11c3'`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-22: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo3.md
ec=0
head=bf285f132c6020808210942b2a632b33a7523e1f
utc=2026-10-04T14:06:31Z
```
