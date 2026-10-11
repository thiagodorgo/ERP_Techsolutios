# Mandato — Inspetor de terreno da junta do 07c-a — B-O6R-07c (PR 414, junta)

## MEDIDO

Estado do PR 414 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 414`
```
# refs do PR #414 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-10T16:24Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/o6r07c-subresource-scope
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      98803254ac53dbcedefe0d2d1aa3146525d6fd95
merge-base:      ab52ec5065dec1fd542e8280f0f2150187780955
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #414
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md .agents/agents/especialistas/jurado-07ca-c2-censo-e-guard.md .agents/agents/especialistas/jurado-07ca-c3-regressao-escopo.md .claude/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md .claude/agents/especialistas/jurado-07ca-c2-censo-e-guard.md .claude/agents/especialistas/jurado-07ca-c3-regressao-escopo.md API_CONTRACTS.md docs/revisoes/SAN3/B-O6R-07c-CRITICA-r1.md docs/revisoes/SAN3/B-O6R-07c-CRITICA-r2.md docs/revisoes/SAN3/B-O6R-07c-a-DEV-relatorio.md docs/revisoes/SAN3/B-O6R-07c-a-FABRICA-relatorio.md docs/revisoes/SAN3/B-O6R-07c-plano.md src/modules/work-order-comments/work-order-comment.service.ts src/modules/work-orders/work-order-attachment.controller.ts src/modules/work-orders/work-order-attachment.service.ts src/modules/work-orders/work-order.service.ts tests/fixtures/o6r07c-classificacao-vias.json tests/fixtures/o6r07c-formas/grupo-a.mts tests/fixtures/o6r07c-formas/inject-get-escreve.mts tests/fixtures/o6r07c-formas/inject-motivo.mts tests/fixtures/o6r07c-formas/inject-novas.mts tests/fixtures/o6r07c-formas/inject-prefixo.mts tests/fixtures/o6r07c-formas/inject-tipo.mts tests/fixtures/o6r07c-formas/inject.mts tests/helpers/o6r07c-census.ts tests/o6r07c-census-guard.test.ts tests/o6r07c-subresource-scope-db.test.ts tests/o6r07c-subresource-scope.test.ts tests/work-order-attachments-routes.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-O6R-07c-plano.md`
```
1440
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta do bloco B-O6R-07c-a
  (PR 414, escopo por objeto nos subrecursos da OS), rodando no Claude Code em Opus 5.5, no nivel menor por decisao do dono de
  2026-10-10 (topo so no plano e em toda reprovacao de junta), declarado no parecer; usa o corpo de origin/main e declara na 1a linha
  do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 414 resolvido pelo proprio inspetor por git e por gh, so com os check-runs CONCLUIDOS (ausencia, pendente ou
  cancelado bloqueia; vermelho e insumo, e a falha conhecida do T15 do PR 405 e pre-existente); a main de 2026-10-10 com o merge do
  PR 389 esta dentro do objeto por merge-base; os insumos estao na ref: o plano v3 em docs/revisoes/SAN3/B-O6R-07c-plano.md (secoes
  Comum e 07c-a, e a 07c-a.7 da junta), as criticas B-O6R-07c-CRITICA-r1.md e B-O6R-07c-CRITICA-r2.md, o relatorio do dev em
  docs/revisoes/SAN3/B-O6R-07c-a-DEV-relatorio.md e o relatorio da fabrica em docs/revisoes/SAN3/B-O6R-07c-a-FABRICA-relatorio.md derruba com: `grep -ic 'check-run' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md` (novo)

O tabuleiro e o da secao 07c-a.7: as tres cadeiras novas (jurado-07ca-c1-escopo-por-objeto, jurado-07ca-c2-censo-e-guard,
  jurado-07ca-c3-regressao-escopo) rastreadas no head nos dois espelhos e S0 verde (node scripts/sync-agent-agents.mjs --check), corpo
  carregado e corpo julgado conferidos de forma EOL-neutra; a inelegibilidade por nome da 07c-a.7 conferida, inclusive o
  coordenador-de-acessos e o guardiao-fail-closed (achadores em juntas anteriores) e a tensao do PLANO_SAN3 registrada; o 07c-b fora
  deste PR; um worktree e um container Linux descartavel por cadeira com prefixo unico (j07ca-c1, j07ca-c2, j07ca-c3), nunca a base
  viva; disco de pelo menos 10 GB antes de cada cadeira derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; a evidencia e incremental com hora em
  C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-evidencia.md (novo) e o parecer em
  C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md (novo), que o orquestrador versiona;
  worktree proprio detached C:/Users/AMP/w-insp-07ca (novo), removido pelo nome; nunca tail -f; timeout no que executa; a base viva e
  as portas do servidor do dono nunca sao alvo; nada escrito no repositorio fora da evidencia e do parecer; PAUSA grava a secao PAUSA
  e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 414; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #414 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/00-mandatos/inspetor-07ca.md
ec=0
head=98803254ac53dbcedefe0d2d1aa3146525d6fd95
utc=2026-10-10T16:24:59Z
```
