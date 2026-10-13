# Mandato — Inspetor de terreno da junta — B-TRC-01 (PR 426, junta)

## MEDIDO

Estado do PR 426 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-13T05:33Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-01
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      e38b47ea9f6431941eed32405e8ddf01f70ab817
merge-base:      9566d55bd719ce7d7a545281c57923a25f883ed3
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #426
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-trc01-a-rls-e-banco.md .agents/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .agents/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .claude/agents/especialistas/jurado-trc01-a-rls-e-banco.md .claude/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .claude/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .env.example API_CONTRACTS.md agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-a.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-b.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-c.md agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/inspetor-trc01.md docker-compose.traccar.yml docs/deployment.md docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md docs/revisoes/TRACCAR/B-TRC-01-dev.md docs/revisoes/TRACCAR/B-TRC-01-evidencias/bateria.sh docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/pgbench-gen.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada1.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada2-final.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/run-mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/t13-mutante-formas-do-plano.ts.txt infra/traccar/dev/traccar.xml infra/traccar/fixtures/6.16.0/position-osmand.json prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql prisma/migrations/20260875000000_validate_location_source_check/migration.sql prisma/schema.prisma scripts/traccar-capture-fixture.mjs scripts/traccar-dev-demo.mjs src/config/env.ts src/database/rls.ts src/integrations/traccar/index.ts src/integrations/traccar/traccar-db.ts src/integrations/traccar/traccar-forward-auth.ts src/integrations/traccar/traccar-ingest.app.ts src/integrations/traccar/traccar-ingest.bootstrap.ts src/integrations/traccar/traccar-ingest.logger.ts src/integrations/traccar/traccar-ingestion.repository.ts src/integrations/traccar/traccar-ingestion.service.ts src/integrations/traccar/traccar-position.adapter.ts src/integrations/traccar/traccar-position.schema.ts src/integrations/traccar/traccar-rate-limit.ts src/integrations/traccar/traccar-resolution.ts src/modules/field-dispatch/field-dispatch-prisma.repository.ts src/modules/field-dispatch/field-dispatch.repository.ts src/modules/field-dispatch/field-dispatch.types.ts src/modules/field-location/field-location-prisma.repository.ts src/modules/field-location/field-location.service.ts src/modules/field-location/field-location.types.ts src/server.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-runtime-role-guard-db.test.ts tests/traccar-binding-uniqueness-db.test.ts tests/traccar-dev-topology.test.ts tests/traccar-forward-auth.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-ingest-listener.test.ts tests/traccar-ingest-logs.test.ts tests/traccar-ingest-pool-db.test.ts tests/traccar-position-contract.test.ts tests/traccar-position-ingestion-db.test.ts tests/traccar-quarantine-db.test.ts tests/traccar-rate-limit.test.ts tests/traccar-resolution-cost.test.ts tests/traccar-resolution-race-db.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/TRACCAR/PLANO_TRACCAR.md`
```
1995
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta de SEGURANCA do bloco
  B-TRC-01 (PR 426, a primeira posicao do Traccar no mapa em dev), rodando no executor que o disparo nomeia (Codex em GPT-5.6 Sol por decisao do dono de 2026-10-12, ou Claude Code em Opus 5.5), no nivel menor por decisao do
  dono de 2026-10-10, declarado no parecer; usa o corpo de origin/main e declara na 1a linha do parecer o papel, o modelo, o
  mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 426 resolvido pelo proprio inspetor por git e por gh, so com os check-runs CONCLUIDOS (ausencia, pendente ou
  cancelado bloqueia; vermelho e insumo; o T15, o A11 e o falso vermelho do relogio no teste do Console do 06a, PR 427, sao conhecidos);
  os insumos estao na ref: o plano em docs/revisoes/TRACCAR (README, PLANO_TRACCAR.md secao 8 inteira e as emendas v2.2 e v2.3), o
  relatorio do dev em docs/revisoes/TRACCAR/B-TRC-01-dev.md e a decisao do orquestrador sobre o ratchet T13 e os dois literais
  (L0 109 para 111 e tabelas_com_dml 115 para 118) em docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md derruba com: `grep -ic 'check-run' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md` (novo)

O tabuleiro e o da secao 8.10 do plano: as tres cadeiras novas (jurado-trc01-a-rls-e-banco, jurado-trc01-b-superficie-e-segredo,
  jurado-trc01-c-contrato-e-atribuicao) rastreadas no head nos dois espelhos e S0 verde (node scripts/sync-agent-agents.mjs --check),
  corpo carregado e corpo julgado conferidos de forma EOL-neutra; inelegiveis o dev do bloco (dev-trc01-claude), os devs do conserto do 503 (dev-trc01-503-agy, dev-trc01-503-gemini, dev-trc01-503-flash), o revisor da API que achou os testes faltantes (rev-503-delta), o planejador do
  plano e os criticos r1 e r2; o agente-dba-guardiao revisa a migracao aditiva; um worktree e containers Linux descartaveis por
  cadeira com prefixo unico (jtrc01-a, jtrc01-b, jtrc01-c), imagem do Traccar so por digest, nunca a base viva nem os servidores
  publicos de demonstracao; os containers trc01-* do dev isolados ou removidos; disco de pelo menos 10 GB derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; a evidencia e incremental com hora em C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-evidencia.md (novo)
  e o parecer em C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md (novo), que o orquestrador versiona; worktree proprio detached C:/Users/AMP/w-insp-trc01
  (novo), removido pelo nome; nunca tail -f; timeout no que executa; a base viva e as portas do servidor do dono nunca sao alvo;
  PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 426; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '20260874000000' em prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql — l.23
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '20260875000000' em prisma/migrations/20260875000000_validate_location_source_check/migration.sql — l.23

PRE-VOO OK — agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/inspetor-trc01.md
ec=0
head=e38b47ea9f6431941eed32405e8ddf01f70ab817
utc=2026-10-13T05:35:46Z
```
