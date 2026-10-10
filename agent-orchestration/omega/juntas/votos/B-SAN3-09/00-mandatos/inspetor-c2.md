# Mandato — Inspetor de terreno da junta 2 — B-SAN3-09 (PR 400, junta)

## MEDIDO

Estado do PR 400 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 400`
```
# refs do PR #400 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-08T15:56Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/bootstrap-platform-admin
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      a634b80748e3087e866cf0a1a8babcfbc1c3cc66
merge-base:      8ee10bd2e44d95206551b71351f23d901192cbb6
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado ba65c03a4c3edc0723633b0f1330f34852a60e6f (agent-orchestration/omega/juntas/J-B-SAN3-09.md:5 @head-do-PR) — aprovacao nao legivel por maquina
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-san3-09c2-c1-entrada-e-registro.md .agents/agents/especialistas/jurado-san3-09c2-c2-dryrun-e-concorrencia.md .agents/agents/especialistas/jurado-san3-09c2-c3-guard-ast-e-escopo.md .claude/agents/especialistas/jurado-san3-09c2-c1-entrada-e-registro.md .claude/agents/especialistas/jurado-san3-09c2-c2-dryrun-e-concorrencia.md .claude/agents/especialistas/jurado-san3-09c2-c3-guard-ast-e-escopo.md agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/J-B-SAN3-09.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev-kpi.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-09/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-09/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-09/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-09/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-09/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-09/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-KPI-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-09/FABRICA-ciclo2-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-09-1.md docs/deployment.md docs/revisoes/SAN3/B-SAN3-09-plano.md scripts/bootstrap-platform-admin.ts tests/san3-09-bootstrap-platform-admin-db.test.ts tests/san3-09-bootstrap-platform-admin.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-09-plano.md`
```
1898
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 2 do B-SAN3-09 (PR 400),
  rodando no Claude Code em Opus 5.5 por substituicao declarada (decisao do dono de 2026-10-08: Fable so em bloco que toca dinheiro, e
  este bloco nao toca), com o corpo de origin/main, e declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o
  md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno-c2.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 400 resolvido pelo proprio inspetor, e so e objeto com os check-runs CONCLUIDOS (ausencia, pendente ou cancelado
  bloqueia; vermelho e insumo do voto); o tabuleiro e o da secao 15.4 de docs/revisoes/SAN3/B-SAN3-09-plano.md: as tres cadeiras novas
  (jurado-san3-09c2-c1-entrada-e-registro, jurado-san3-09c2-c2-dryrun-e-concorrencia, jurado-san3-09c2-c3-guard-ast-e-escopo) estao
  rastreadas no head do PR nos dois espelhos (.claude/agents/especialistas e .agents/agents/especialistas) e S0 da verde
  (node scripts/sync-agent-agents.mjs --check); a inelegibilidade por nome da 15.4 e conferida (agente-secops, agente-dba-guardiao,
  guardiao-fail-closed, os dois planejadores, o dev de nuvem do ciclo 1, o dev-kpi e o dev do ciclo 2); um worktree por cadeira
  (w-j09c2a, w-j09c2b, w-j09c2c) e um container Linux descartavel por cadeira que usa banco, nunca a base viva derruba com: `grep -ic 'check-run' C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno-c2.md` (novo)

Os insumos: o relatorio do dev do ciclo 2 (C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-ciclo2-relatorio.md) e o
  relatorio da fabrica (C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/FABRICA-ciclo2-relatorio.md) sao lidos como roteiro e
  nao como fato; a queda do dev por limite de uso (secao QUEDA do relatorio) e o que ficou para a junta (MF1 e MF2) estao no briefing;
  os mandatos das cadeiras ficam em C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/ com a cerca do pre-voo
  igual ao head colado; plano de perda (queda relanca a mesma identidade) e de PAUSA (P7); nenhum segredo real no tabuleiro derruba com: `grep -ic 'FABRICA-ciclo2' C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno-c2.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno-c2.md (novo) e o orquestrador o versiona; worktree
  proprio detached C:/Users/AMP/w-insp400c2 (novo), removido pelo nome; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que
  executa; base viva nunca alvo; nada escrito no repositorio fora do parecer; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-inspetor-terreno-c2.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 400; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #400 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/inspetor-c2.md
ec=0
head=a634b80748e3087e866cf0a1a8babcfbc1c3cc66
utc=2026-10-08T15:56:50Z
```
