# Mandato — Cadeira C1 jurado-07ca-c1-escopo-por-objeto — B-O6R-07c (PR 414, junta)

## MEDIDO

Estado do PR 414 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 414`
```
# refs do PR #414 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-10T16:59Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/o6r07c-subresource-scope
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      d72552634202aafd712a4bde25fe2134285b88c6
merge-base:      9b611468902f3984d7704ef2dd6e3ad1d0c08b3a
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #414
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md .agents/agents/especialistas/jurado-07ca-c2-censo-e-guard.md .agents/agents/especialistas/jurado-07ca-c3-regressao-escopo.md .claude/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md .claude/agents/especialistas/jurado-07ca-c2-censo-e-guard.md .claude/agents/especialistas/jurado-07ca-c3-regressao-escopo.md API_CONTRACTS.md agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/omega/juntas/votos/B-O6R-07c/00-mandatos/inspetor-07ca.md agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-evidencia.md agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md docs/revisoes/SAN3/B-O6R-07c-CRITICA-r1.md docs/revisoes/SAN3/B-O6R-07c-CRITICA-r2.md docs/revisoes/SAN3/B-O6R-07c-a-DEV-relatorio.md docs/revisoes/SAN3/B-O6R-07c-a-FABRICA-relatorio.md docs/revisoes/SAN3/B-O6R-07c-plano.md src/modules/work-order-comments/work-order-comment.service.ts src/modules/work-orders/work-order-attachment.controller.ts src/modules/work-orders/work-order-attachment.service.ts src/modules/work-orders/work-order.service.ts tests/fixtures/o6r07c-classificacao-vias.json tests/fixtures/o6r07c-formas/grupo-a.mts tests/fixtures/o6r07c-formas/inject-get-escreve.mts tests/fixtures/o6r07c-formas/inject-motivo.mts tests/fixtures/o6r07c-formas/inject-novas.mts tests/fixtures/o6r07c-formas/inject-prefixo.mts tests/fixtures/o6r07c-formas/inject-tipo.mts tests/fixtures/o6r07c-formas/inject.mts tests/helpers/o6r07c-census.ts tests/o6r07c-census-guard.test.ts tests/o6r07c-subresource-scope-db.test.ts tests/o6r07c-subresource-scope.test.ts tests/work-order-attachments-routes.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-O6R-07c-plano.md`
```
1440
```

## HIPOTESE

O papel e a cadeira C1 da junta do bloco B-O6R-07c-a (PR 414), identidade jurado-07ca-c1-escopo-por-objeto, corpo tirado do blob do objeto
  (.claude/agents/especialistas/jurado-07ca-c1-escopo-por-objeto.md no head do PR), disparado como general-purpose limitado por escrito a Read, Grep, Glob e Bash;
  roda no Claude Code em Opus 5.5, no nivel menor por decisao do dono de 2026-10-10 (topo so no plano e em toda reprovacao de
  junta), declarado no artefato; se o md5 EOL-neutro do corpo recebido divergir do publicado no disparo, a cadeira nao vota;
  declara na 1a linha da evidencia o papel, o modelo, o mandato_md5 deste arquivo e o md5 do corpo derruba com: `head -1 C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-evidencia.md | grep -ic 'mandato_md5'` (novo)

A legalidade e conferida antes do merito: o parecer do inspetor (C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/insp-07ca-parecer.md) diz LIBERADO ou LIBERADO COM
  RESSALVA; o objeto e o head do PR 414 resolvido de novo por git e por gh, com os check-runs concluidos, e o delta desde o objeto
  do inspetor e so registro (o merge da main, o parecer e o registro do bloco); a regua e a do CLAUDE.md da ref, secao C7 item 8: bloco de permissao, unanimidade de 3 com veto,
  teto de 2 ciclos; o 07c-b NAO e deste PR e cobra-lo e reprovacao por construcao; o diretorio desta junta e
  votos/B-O6R-07c (o corpo diz B-O6R-07c-a e ali vale o mandato), o parecer do inspetor e insp-07ca-parecer.md e as
  quedas ficam em 00-quedas.md, escritas pelo orquestrador; depois do parecer a main de agora (PR 415, 7 arquivos de
  registro) foi integrada por merge, e com ela entram no objeto a regra de modelo D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO,
  a tensao do coordenador, as perguntas D1 a D3 do 07c e a pendencia do dano; ninguem roda ferramenta no worktree do dev
  derruba com: `grep -ic 'LIBERADO' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-evidencia.md` (novo)

O merito, por EXECUCAO, sem diluir (linha C1 da secao 07c-a.7 do plano): G-NEG, G-POS e G-WIDE por sonda PROPRIA no head (o
  tecnico nao atribuido recebe recusa nas 10 vias, o atribuido passa, gestor e operador passam); a matriz RBAC_MATRIX.md nas linhas
  45 e 66 contra o catalogo e contra o comportamento, a moderacao de comentario e o 404 entre organizacoes; e a km pelo sync, com a
  semantica de status do 07a e o S-KM-RESTART derruba com: `grep -ic 'G-NEG' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-evidencia.md` (novo)

As regras da casa: unanimidade de 3 com veto; todo achado com gravidade (bloqueia, ajuste, nota) e escopo (dentro-do-bloco,
  ou pre-existente com evidencia de data ou origem, sem a qual conta como dentro-do-bloco); nao consigo medir e REPROVADO; a
  cadeira nao propoe correcao e nao le o voto das outras; KPI nao se cobra; as falhas conhecidas do T15 do PR 405 e do A10 do
  o6r06 sao pre-existentes; escreve so C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-evidencia.md e C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-voto.json, o voto
  nascendo como esqueleto com cada item EM APURACAO e gravado ao ser medido derruba com: `grep -ic '"escopo"' C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/07ca-C1-voto.json` (novo)

O terreno: worktree proprio detached C:/Users/AMP/w-ciclo1-07ca-c1, npm ci proprio sem junction; banco so em container Linux proprio com
  prefixo j07ca-c1-, sem porta publicada, removido pelo nome e nunca prune; a base viva e as portas do servidor do dono nunca sao alvo;
  nenhuma senha real em evidencia ou voto; nunca tail -f; timeout em tudo; evidencia incremental com hora (P1); PAUSA grava a
  secao PAUSA e para (P7); ao fim, worktree e containers removidos pelo nome derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-ciclo1-07ca-c1'`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 414; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #414 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-07ca/agent-orchestration/omega/juntas/votos/B-O6R-07c/00-mandatos/C1c.md
ec=0
head=d72552634202aafd712a4bde25fe2134285b88c6
utc=2026-10-10T16:59:54Z
```
