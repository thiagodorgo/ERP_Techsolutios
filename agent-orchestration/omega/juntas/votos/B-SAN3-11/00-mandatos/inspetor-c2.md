# Mandato — inspetor-da-junta-2 — B-SAN3-11 (PR 401, junta)

## MEDIDO

Estado do PR 401 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 401`
```
# refs do PR #401 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T16:43Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/dossie-versao-da-vistoria
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      59aa7593f7d245e1d57ffeb0b5ca12fb98f10247
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado defa502ee0a03dabbc8786d568d00f7eb7ca726d (agent-orchestration/omega/juntas/J-B-SAN3-11.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md .agents/agents/especialistas/jurado-san3-11-c2-enumeracao-tipada.md .agents/agents/especialistas/jurado-san3-11-c2-registro-e-escopo.md .claude/agents/especialistas/jurado-san3-11-c2-afordancia-e-ancora.md .claude/agents/especialistas/jurado-san3-11-c2-enumeracao-tipada.md .claude/agents/especialistas/jurado-san3-11-c2-registro-e-escopo.md Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-11-dossie-versao-da-vistoria.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md agent-orchestration/omega/juntas/J-B-SAN3-11.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C1c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C2c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/C3c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-ciclo2-D3.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev-integracao2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/fabrica-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-b.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-c2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2-bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-ciclo2.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/planejador-errata1bis.md agent-orchestration/omega/juntas/votos/B-SAN3-11/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-errata1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-11/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-11/PLANEJADOR-errata1bis-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-11-1.md docs/revisoes/SAN3/B-SAN3-11-plano.md frontend/package.json frontend/src/modules/patios/processes/components/ChecklistRunsPanel.tsx frontend/src/modules/patios/processes/components/DossiePrintDocument.tsx frontend/src/modules/patios/processes/processes.adapter.ts frontend/src/modules/patios/processes/processes.types.ts frontend/tests/patios-dossie-checklist.smoke.test.tsx frontend/tests/patios-dossie-print.smoke.test.tsx frontend/tests/patios-dossie-versao.smoke.test.tsx scripts/san3-11-dossie-vistoria-censo.mjs
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-11-plano.md`
```
2079
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), 3a instancia, para a junta 2 do B-SAN3-11 (PR 401),
  ciclo 2; as duas instancias da junta 1 nao repetem; com o corpo de origin/main no espelho Codex .agents/agents/inspetor-de-terreno-da-junta.md e o protocolo de
  emulacao de .agents/agents/README.md, rodando no Codex em GPT-6 Astra, o modelo de gate do espelho (secao C7.6-bis), porque o dono
  suspendeu o Fable ate o reinicio do limite semanal e habilitou o Codex neste projeto (2026-10-03), e declara na 1a linha do parecer o papel, o modelo
  com a substituicao, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-c2.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 401 resolvido pelo proprio inspetor, so com os check-runs CONCLUIDOS; a secao do ciclo 2 do briefing
  agent-orchestration/omega/juntas/BRIEFING-B-SAN3-11.md e insumo a re-verificar, nunca fato; o delta entre o fim do codigo do ciclo 2
  nomeado no briefing e o objeto so traz registro; o baseline honesto e re-medido NOS DOIS terrenos desta maquina (um checkout CRLF e
  um LF, com a contagem de CR colada): o frontend check, o arquivo de teste do bloco e o test:smoke com N e forma por TAP; e o
  core.autocrlf efetivo conferido depois da anomalia que o briefing registra derruba com: `grep -ic 'CRLF' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-c2.md`

O tabuleiro: os corpos das tres cadeiras do ciclo 2 (jurado-san3-11-c2-afordancia-e-ancora, jurado-san3-11-c2-enumeracao-tipada,
  jurado-san3-11-c2-registro-e-escopo) commitados no objeto nos dois espelhos, com os apensos da secao 16-bis.5 na C3 e na C2, e S0
  (node scripts/sync-agent-agents.mjs --check igual a zero); inelegibilidade conferida por nome contra o briefing e o obituario; um
  worktree por cadeira que muta (w-s11k2a, w-s11k2b e w-s11k2blf, w-s11k2c) e a arvore do orquestrador nunca mutada; os mandatos das
  tres cadeiras em C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/ com a cerca igual ao head colado; plano de perda (queda relanca a mesma identidade) e de PAUSA;
  e as normas citadas nos corpos existentes na ref julgada derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-c2.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-c2.md e o
  orquestrador o versiona; worktrees proprios detached C:/Users/AMP/w-insp401c (CRLF) e C:/Users/AMP/w-insp401clf (LF), npm ci proprio
  sem junction, removidos pelo nome com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem --worktree;
  timeout no que executa; base viva nunca alvo; nada escrito no repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-401-c2.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 401; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #401 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv11/agent-orchestration/omega/juntas/votos/B-SAN3-11/00-mandatos/inspetor-c2.md
ec=0
head=59aa7593f7d245e1d57ffeb0b5ca12fb98f10247
utc=2026-10-03T16:43:45Z
```
