# Mandato — inspetor de terreno, segunda passada — B-SAN3-01b (PR 402, junta)

## MEDIDO

Estado do PR 402 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 402`
```
# refs do PR #402 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T16:11Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/web-guarda-por-alcance-e-estado-da-pagina
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      2cfd4f4895d1a2c932f2e1abaf362cc5ec114e11
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #402
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md .claude/agents/especialistas/jurado-san3-01b-c2-cadeia-de-acesso.md Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/BRIEFING-B-SAN3-01b.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/fabrica-c2.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-quedas.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/FABRICA-C2-relatorio.md docs/revisoes/SAN3/B-SAN3-01b-plano.md frontend/package.json frontend/src/modules/operations/dispatches/dispatches.service.ts frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx frontend/src/modules/work-orders/repository.ts frontend/tests/work-orders-honest-errors.test.tsx frontend/tests/work-orders-page-live.test.tsx
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-01b-plano.md`
```
2070
```

## HIPOTESE

O papel e a segunda passada do inspetor-de-terreno-da-junta da junta 1 do B-SAN3-01b (PR 402), pela MESMA instancia que emitiu o
  parecer BLOQUEADO em C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-inspetor-terreno.md (o remedio que ele nomeou), em Fable por contrato, com o corpo de origin/main, e
  declara na 1a linha do parecer novo o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402-p2.md | grep -ic 'mandato_md5'`

Antes de herdar qualquer item do primeiro parecer, o inspetor mede que o delta entre o objeto do primeiro parecer (o SHA que o proprio parecer nomeia) e o head novo do PR so traz
  registro: o corpo novo da C2 nos dois espelhos, arquivos em votos/B-SAN3-01b, o briefing e os mandatos; codigo, testes ou Kpis no delta
  invalidam a heranca e pedem a inspecao inteira derruba com: `grep -ic 'delta' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402-p2.md`

Os itens que o remedio afeta, medidos de novo no head novo: 1.1 (arvore e head); 3.1 (a identidade nova jurado-san3-01b-c2-cadeia-de-acesso
  sem colisao com ata, voto, obituario nem corpo, e inelegibilidade das tres cadeiras conferida por nome); 3.3 (o corpo novo carregado
  igual ao julgado, EOL-neutro, nos dois espelhos e versionado no head); 4.1 (S0, node scripts/sync-agent-agents.mjs --check igual a
  zero); 4.3 (check-runs CONCLUIDOS no head novo); e os mandatos novos das tres cadeiras em C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/ com a cerca igual ao head
  colado e lendo o briefing agent-orchestration/omega/juntas/BRIEFING-B-SAN3-01b.md, que carrega as ressalvas R1 a R9 e as divergencias
  declaradas pela secao A2 derruba com: `grep -ic 'BRIEFING' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402-p2.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402-p2.md e o orquestrador o versiona; worktree
  proprio detached C:/Users/AMP/w-insp402 recriado e removido pelo nome, com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV
  exportada; timeout no que executa; base viva nunca alvo; nada escrito no repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402-p2.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 402; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #402 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/inspetor-passada2.md
ec=0
head=2cfd4f4895d1a2c932f2e1abaf362cc5ec114e11
utc=2026-10-02T16:11:41Z
```
