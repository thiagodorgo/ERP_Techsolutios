# Mandato — Inspetor de terreno da junta do ciclo 3 — B-O6R-04a (PR 389, junta)

## MEDIDO

Estado do PR 389 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 389`
```
# refs do PR #389 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-10T13:23Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/inventory-consistency
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      e62d1e4b364d8473d8599ed207c92d61a19b426d
merge-base:      c1cfdabe12c74b58f8393dbee4f333224c56b303
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 35ef85be26e4ced21b25014ea7302c2fa60288cc (agent-orchestration/omega/juntas/J-B-O6R-04a-ciclo2.md:3 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-GOV-SEM-TETO.md (mencao no corpo) @head-do-PR
                 agent-orchestration/omega/juntas/J-B-SAN3-00.md (mencao no corpo) @head-do-PR
                 agent-orchestration/omega/juntas/J-B-SAN3-B1.md (mencao no corpo) @head-do-PR
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-o6r04a-c2-banco-rls.md .agents/agents/especialistas/jurado-o6r04a-c2-fail-closed-backend.md .agents/agents/especialistas/jurado-o6r04a-c2-suplente-banco-rls.md .agents/agents/especialistas/jurado-o6r04a-c2-suplente-fail-closed-backend.md .claude/agents/especialistas/jurado-o6r04a-c2-banco-rls.md .claude/agents/especialistas/jurado-o6r04a-c2-fail-closed-backend.md .claude/agents/especialistas/jurado-o6r04a-c2-suplente-banco-rls.md .claude/agents/especialistas/jurado-o6r04a-c2-suplente-fail-closed-backend.md .github/workflows/ci.yml agent-orchestration/codex/comandos/B-O6R-04a-inventory-consistency.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/J-B-O6R-04a-ciclo2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-critico-r1.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-critico-r2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-dev-integracao.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-dev.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-mandatos/C1c2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-mandatos/C2c2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-mandatos/C3c2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-mandatos/inspetor-c2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/00-quedas.md agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C1-evidencia.md agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C1-voto.json agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C2-evidencia.md agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C2-voto.json agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C3-evidencia.md agent-orchestration/omega/juntas/votos/B-O6R-04a/c2-C3-voto.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-fase1.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-fase2.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-apoio/crit2-probe-b04a.mts agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-census.sql agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase1.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase2.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase3.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase4.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase5.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-fase6.json agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-guards.mjs agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-kpi-apply.cjs agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-plano-v2.md agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-probe-b04a.mts agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-seed-dups.sql agent-orchestration/omega/juntas/votos/B-O6R-04a/critico-r2-apoio/crit3-size.json agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/f4.sh agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/f6.sh agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/m02-drill.sh agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/m02-seed.sql agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/mutations.mjs agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/npmtest.sh agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/recreate.sh agent-orchestration/omega/juntas/votos/B-O6R-04a/dev-integracao-apoio/union.py agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c2-evidencia.md agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c2-parecer.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-e5.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-faseA.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan3-probe-b04a.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c01.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c02.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c03.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c04.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c05.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c05b.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c06.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c07.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c08.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c09.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-c10.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-census-out.txt agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-census.sql agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-do.sql agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-down.sql agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-esqueleto-com-registro.bak.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseA.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseB.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-faseD.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-guards.mjs agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-kpi-apply.cjs agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-probe-b04a.mts agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-reup.sql agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s00c.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s01a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s01b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s02a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s02b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s03c.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s04a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s04b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s05.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06a.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06b.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s06c.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s07.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s08.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s09.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s10.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s11.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s12.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s13.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s14head.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-s14tail.md agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-seed-dups.sql agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-size.json agent-orchestration/omega/planos/B-O6R-04a-apoio/plan4-size10k.json agent-orchestration/omega/planos/B-O6R-04a-plano.md agent-orchestration/omega/reprovacoes/R-B-O6R-04a-ciclo1.md agent-orchestration/omega/reprovacoes/R-B-O6R-04a-ciclo2.md docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md docs/revisoes/O6R/achados.jsonl prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql prisma/schema.prisma scripts/inventory-duplicates-census.sql src/modules/inventory/cycle-count-prisma.repository.ts src/modules/inventory/cycle-count.repository.ts src/modules/inventory/cycle-count.service.ts src/modules/inventory/cycle-count.types.ts src/modules/inventory/inventory-prisma.repository.ts src/modules/inventory/inventory-uow-prisma.ts src/modules/inventory/inventory-uow.ts src/modules/inventory/inventory.types.ts tests/db-catalog-write-guard.test.ts tests/inventory-balance-lock-race-db.test.ts tests/inventory-cycle-count-close-units-db.test.ts tests/inventory-cycle-counts-routes.test.ts tests/inventory-migration-drill-db.test.ts tests/inventory-unique-backstops-db.test.ts tests/inventory-write-paths-guard.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < agent-orchestration/omega/planos/B-O6R-04a-plano.md`
```
1055
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), INSTANCIA NOVA para a junta do ciclo 3 do B-O6R-04a
  (PR 389), rodando no Codex em GPT-6 Astra, o equivalente ao Fable no contrato (secao C7.6-bis), porque o bloco toca dinheiro e dado;
  esgotado o Astra, cai para GPT-5.6 Sol DECLARADO no parecer; abaixo disso, PARA; usa o corpo do espelho Codex em
  .agents/agents/inspetor-de-terreno-da-junta.md de origin/main e declara na 1a linha do parecer o papel, o modelo, o mandato_md5
  deste arquivo e o md5 EOL-neutro do corpo; nao julga merito derruba com: `head -1 C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 389 resolvido pelo proprio inspetor por git e por gh, so com os check-runs CONCLUIDOS (ausencia, pendente ou
  cancelado bloqueia); a main de 2026-10-10 (o merge do PR 413) esta dentro do objeto por merge-base; o ciclo 3 NAO tem dev, e o
  inspetor prova que o diff de codigo (src, tests, prisma, scripts, .github) entre o objeto da junta do ciclo 2 e o objeto de agora
  e vazio; os insumos estao na ref: a secao Ciclo 3 de agent-orchestration/omega/planos/B-O6R-04a-plano.md, as 5 pendencias novas em
  agent-orchestration/controle/pendencias.md com o indice regenerado, a ata e o R do ciclo 2
  (agent-orchestration/omega/juntas/J-B-O6R-04a-ciclo2.md e agent-orchestration/omega/reprovacoes/R-B-O6R-04a-ciclo2.md) e a Emenda 8
  de agent-orchestration/codex/comandos/B-O6R-04a-inventory-consistency.md derruba com: `grep -ic 'check-run' C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-parecer.md` (novo)

O tabuleiro e o do C3.3 da secao Ciclo 3: C1 = jurado-o6r04a-c2-suplente-banco-rls e C2 = jurado-o6r04a-c2-suplente-fail-closed-backend
  (corpos rastreados nos dois espelhos, conferidos de forma EOL-neutra, com a nota literal do ciclo 3 que os mandatos deles trazem),
  C3 = coordenador-de-acessos (suplente inspetor-de-arnes-concorrente); a inelegibilidade por nome do C3.3 conferida, inclusive as
  cadeiras e os inspetores da junta do ciclo 2; um worktree e um container Linux descartavel por cadeira, com prefixo unico
  (j389c3-c1, j389c3-c2, j389c3-c3), nunca a base viva; disco de pelo menos 10 GB antes de cada cadeira; as ressalvas R1 a R7 da
  inspecao do ciclo 2 re-conferidas, nao herdadas derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; a evidencia e incremental com hora em
  C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-evidencia.md (novo) e o parecer em
  C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-parecer.md (novo), que o orquestrador versiona; worktree
  proprio detached C:/Users/AMP/w-insp389c3 (novo), removido pelo nome; nunca tail -f; timeout no que executa; a base viva e as portas
  do servidor do dono nunca sao alvo; nada escrito no repositorio fora da evidencia e do parecer; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/insp-c3-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 389; echo ec=$?`
```
COLAGEM    l.6-24: refs do PR #389 confere com a saida atual
AVISO      corrida hex em caminho versionado nao cobrada pela checagem 4: '20260873000000' em prisma/migrations/20260873000000_add_stock_movements_unique_backstops/migration.sql — l.28

PRE-VOO OK — C:/Users/AMP/w-389/agent-orchestration/omega/juntas/votos/B-O6R-04a/00-mandatos/inspetor-c3.md
ec=0
head=e62d1e4b364d8473d8599ed207c92d61a19b426d
utc=2026-10-10T13:24:06Z
```
