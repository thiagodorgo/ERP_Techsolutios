# Mandato — Cadeira (a) — B-TRC-01 (PR 426, junta)

## MEDIDO

Estado do PR 426 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 426`
```
# refs do PR #426 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-11T23:26Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/traccar-b-trc-01
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      0cccacbcf560bdb78951234fd0253ae7d3570cb2
merge-base:      9566d55bd719ce7d7a545281c57923a25f883ed3
merge commit:    <ainda nao mergeado>
check-runs:      total=12 nao-verdes=8 pendentes=8
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #426
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

AVISO: 8 check-run(s) ainda rodando.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-trc01-a-rls-e-banco.md .agents/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .agents/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .claude/agents/especialistas/jurado-trc01-a-rls-e-banco.md .claude/agents/especialistas/jurado-trc01-b-superficie-e-segredo.md .claude/agents/especialistas/jurado-trc01-c-contrato-e-atribuicao.md .env.example API_CONTRACTS.md agent-orchestration/codex/comandos/B-TRC-01-traccar-posicao-no-mapa.md docker-compose.traccar.yml docs/deployment.md docs/revisoes/TRACCAR/B-TRC-01-DECISAO-T13.md docs/revisoes/TRACCAR/B-TRC-01-dev.md docs/revisoes/TRACCAR/B-TRC-01-evidencias/bateria.sh docs/revisoes/TRACCAR/B-TRC-01-evidencias/mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/pgbench-gen.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada1.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/results-dev-2026-10-11-rodada2-final.jsonl docs/revisoes/TRACCAR/B-TRC-01-evidencias/run-mutations.mjs docs/revisoes/TRACCAR/B-TRC-01-evidencias/t13-mutante-formas-do-plano.ts.txt infra/traccar/dev/traccar.xml infra/traccar/fixtures/6.16.0/position-osmand.json prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql prisma/migrations/20260875000000_validate_location_source_check/migration.sql prisma/schema.prisma scripts/traccar-capture-fixture.mjs scripts/traccar-dev-demo.mjs src/config/env.ts src/database/rls.ts src/integrations/traccar/index.ts src/integrations/traccar/traccar-db.ts src/integrations/traccar/traccar-forward-auth.ts src/integrations/traccar/traccar-ingest.app.ts src/integrations/traccar/traccar-ingest.bootstrap.ts src/integrations/traccar/traccar-ingest.logger.ts src/integrations/traccar/traccar-ingestion.repository.ts src/integrations/traccar/traccar-ingestion.service.ts src/integrations/traccar/traccar-position.adapter.ts src/integrations/traccar/traccar-position.schema.ts src/integrations/traccar/traccar-rate-limit.ts src/integrations/traccar/traccar-resolution.ts src/modules/field-dispatch/field-dispatch-prisma.repository.ts src/modules/field-dispatch/field-dispatch.repository.ts src/modules/field-dispatch/field-dispatch.types.ts src/modules/field-location/field-location-prisma.repository.ts src/modules/field-location/field-location.service.ts src/modules/field-location/field-location.types.ts src/server.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-runtime-role-guard-db.test.ts tests/traccar-binding-uniqueness-db.test.ts tests/traccar-dev-topology.test.ts tests/traccar-forward-auth.test.ts tests/traccar-idempotency-db.test.ts tests/traccar-ingest-listener.test.ts tests/traccar-ingest-logs.test.ts tests/traccar-ingest-pool-db.test.ts tests/traccar-position-contract.test.ts tests/traccar-position-ingestion-db.test.ts tests/traccar-quarantine-db.test.ts tests/traccar-rate-limit.test.ts tests/traccar-resolution-cost.test.ts tests/traccar-resolution-race-db.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/TRACCAR/PLANO_TRACCAR.md`
```
1995
```

## HIPOTESE

O papel e a cadeira (a) (RLS, unicidade e banco) da junta de SEGURANCA do bloco B-TRC-01 (PR 426), identidade jurado-trc01-a-rls-e-banco, corpo tirado do
  blob do objeto (.claude/agents/especialistas/jurado-trc01-a-rls-e-banco.md no head do PR), disparado como general-purpose limitado por escrito a
  Read, Grep, Glob e Bash; roda no Claude Code em Opus 5.5, no nivel menor por decisao do dono de 2026-10-10, declarado no
  artefato; se o md5 EOL-neutro do corpo recebido divergir do publicado no disparo, a cadeira nao vota; declara na 1a linha da
  evidencia o papel, o modelo, o mandato_md5 deste arquivo e o md5 do corpo derruba com: `head -1 C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md | grep -ic 'mandato_md5'` (novo)

A legalidade e conferida antes do merito: o parecer do inspetor (C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/insp-trc01-parecer.md) diz LIBERADO ou LIBERADO COM RESSALVA;
  o objeto e o head do PR 426 resolvido de novo por git e por gh, com os check-runs concluidos; a regua e a do CLAUDE.md da ref,
  secao C7 item 8: seguranca e dado de localizacao, unanimidade de 3 com veto, teto de 2 ciclos; as regras do dono para o Traccar
  valem como criterio de veto; ninguem roda ferramenta no worktree do dev derruba com: `grep -ic 'LIBERADO' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md` (novo)

O merito, por EXECUCAO, sem diluir (cadeira (a) da secao 8.10 do plano): (1) o vinculo global e a trava da confirmacao; (2) o recibo
  global e a atomicidade; (3) o orcamento de tempo e o pool proprio; re-executa as MUT-04 a MUT-06, MUT-12, MUT-34, MUT-35, MUT-40 e MUT-41;
  julga CADA chave nova do ratchet T13 e os deltas L0 +2 e tabelas_com_dml +3, inclusive se o papel de runtime deve ter DML na
  traccar_quarantine_items, global e sem RLS derruba com: `grep -ic 'MUT-34' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md` (novo)

As regras da casa: unanimidade de 3 com veto; todo achado com gravidade (bloqueia, ajuste, nota) e escopo (dentro-do-bloco,
  ou pre-existente com evidencia de data ou origem, sem a qual conta como dentro-do-bloco); nao consigo medir e REPROVADO; a
  cadeira nao propoe correcao e nao le o voto das outras; KPI nao se cobra; T15, A11 e o relogio do teste do Console sao instaveis
  conhecidos; escreve so C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md e C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-voto.json, o voto nascendo como esqueleto com cada item EM APURACAO e gravado ao ser medido derruba com: `grep -ic '"escopo"' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-voto.json` (novo)

O terreno: worktree proprio detached C:/Users/AMP/w-jtrc-a, npm ci proprio sem junction; Postgres e Redis descartaveis em
  container Linux proprio com prefixo jtrc01-a-, porta alta so em 127.0.0.1 testada antes, REDIS_URL proprio em todo npm test,
  skipped 0 em toda execucao -db, imagem do Traccar so por digest, docker compose down -v sempre com os --profile; nunca a base viva
  nem as portas do servidor do dono nem servidor publico de demonstracao; containers trc01-* e de outras cadeiras nao sao alvo;
  remocao so pelo nome, nunca prune; nunca tail -f; timeout no que executa; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'jtrc01-a' C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/cadeira-a-evidencia.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 426; echo ec=$?`
```
COLAGEM    l.6-21: refs do PR #426 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '20260874000000' em prisma/migrations/20260874000000_traccar_ingestion_foundation/migration.sql — l.25
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '20260875000000' em prisma/migrations/20260875000000_validate_location_source_check/migration.sql — l.25

PRE-VOO OK — C:/Users/AMP/w-trc01/agent-orchestration/omega/juntas/votos/B-TRC-01/00-mandatos/cadeira-a.md
ec=0
head=0cccacbcf560bdb78951234fd0253ae7d3570cb2
utc=2026-10-11T23:26:42Z
```
