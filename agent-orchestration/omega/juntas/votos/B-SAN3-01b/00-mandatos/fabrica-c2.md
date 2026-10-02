# Mandato — fabrica da cadeira C2 — B-SAN3-01b (PR 402, junta)

## MEDIDO

Estado do PR 402 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 402`
```
# refs do PR #402 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T15:37Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/web-guarda-por-alcance-e-estado-da-pagina
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      b1feb32305f6f05fc9fb2161fe583d800a0e1800
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #402
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-01b-plano.md frontend/package.json frontend/src/modules/operations/dispatches/dispatches.service.ts frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx frontend/src/modules/work-orders/repository.ts frontend/tests/work-orders-honest-errors.test.tsx frontend/tests/work-orders-page-live.test.tsx
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-01b-plano.md`
```
2070
```

## HIPOTESE

O papel e a agente-fabrica, instancia nova, que escreve UM corpo de jurado com identidade nova para a cadeira C2 da junta 1 do
  B-SAN3-01b (PR 402), porque o inspetor de terreno declarou inelegivel o coordenador-de-acessos (achador do C2-05, que o bloco fecha) e
  o plano docs/revisoes/SAN3/B-SAN3-01b-plano.md nomeia este remedio na secao 10; a fabrica declara na 1a linha do seu relatorio o
  papel, o modelo e o mandato_md5 que o orquestrador lhe passa no disparo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-402.md | grep -ic 'mandato_md5'`

O corpo novo e C:/Users/AMP/w-nuv01b/.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md (novo), identidade jurado-san3-01b-c2-cadeia-de-acesso, sem colisao com ata, voto,
  obituario nem corpo existente, com frontmatter name, description e tools (Read, Grep, Glob, Bash) derruba com: `git -C C:/Users/AMP/w-nuv01b grep -il 'jurado-san3-01b-c2-cadeia-de-acesso' HEAD -- agent-orchestration .claude .agents | wc -l`

A competencia e a do coordenador-de-acessos de origin/main (a cadeia papel, permissoes, provisionamento, menu, rota e backend), lido
  inteiro, e o mandato do corpo sao os tres itens da linha C2 da secao 10 do plano, sem diluir: CE-G2 (o mapa de papeis do frontend
  executado contra RBAC_MATRIX.md, contra src/modules/work-orders/work-order.routes.ts e contra os casos GB1 a GB3, 13 papeis); a regua
  do gate igual a do backend e a do botao de criar, e a nota N5; o vermelho-controle no head-base de GB1 e GB2 (7 papeis) derruba com: `grep -ic 'GB1' C:/Users/AMP/w-nuv01b/.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`

O corpo segue o rigor dos jurados de identidade nova de origin/main: quorum unanimidade de 3 com veto; todo achado com gravidade e
  escopo (pre-existente so com evidencia de data ou origem); nao consigo medir e REPROVADO; nao propoe correcao; P1, P2 e P7 do
  contrato; declara o mandato_md5 e o md5 EOL-neutro do corpo na 1a linha da evidencia; e cita so norma que existe em origin/main
  (uma norma que vive so num PR aberto nao se aplica) derruba com: `grep -ic 'unanimidade' C:/Users/AMP/w-nuv01b/.claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md`

A fabrica nao versiona nem commita (nao tem Bash), nao vota e nao escreve outro arquivo alem do corpo e do relatorio C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-402.md; o
  orquestrador gera o espelho em .agents por scripts/sync-agent-agents.mjs e versiona os dois espelhos com add -f no ramo do PR 402 derruba com: `grep -ic 'sync-agent-agents' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/FABRICA-402.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 402; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #402 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/fabrica-c2.md
ec=0
head=b1feb32305f6f05fc9fb2161fe583d800a0e1800
utc=2026-10-02T15:37:13Z
```
