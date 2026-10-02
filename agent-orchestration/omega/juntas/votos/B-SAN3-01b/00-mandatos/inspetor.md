# Mandato — inspetor de terreno — B-SAN3-01b (PR 402, junta)

## MEDIDO

Estado do PR 402 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 402`
```
# refs do PR #402 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T11:40Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/web-guarda-por-alcance-e-estado-da-pagina
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      b02745b734bc14aee3209928b30dcdcfa50e12ec
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #402
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-01b-web-guarda-por-alcance-e-estado-da-pagina.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md docs/revisoes/SAN3/B-SAN3-01b-plano.md frontend/package.json frontend/src/modules/operations/dispatches/dispatches.service.ts frontend/src/modules/registry/service-quotes/useServiceQuoteReferences.ts frontend/src/modules/work-orders/pages/WorkOrdersPage.tsx frontend/src/modules/work-orders/repository.ts frontend/tests/work-orders-honest-errors.test.tsx frontend/tests/work-orders-page-live.test.tsx
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-01b-plano.md`
```
2070
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 1 do B-SAN3-01b (PR 402),
  em Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e
  declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 402 resolvido pelo proprio inspetor, e so e objeto com os check-runs CONCLUIDOS (ausencia, pendente ou cancelado
  bloqueia; vermelho e insumo do voto); o tabuleiro e o da secao 10 de docs/revisoes/SAN3/B-SAN3-01b-plano.md: as tres cadeiras (guardiao-fail-closed,
  coordenador-de-acessos, cognicao-visual) existem no origin/main; a inelegibilidade e decidida por nome pelo inspetor, inclusive a do
  coordenador-de-acessos, que achou o mesmo botao na junta do B-SAN3-04a (o plano pede essa decisao e nomeia o suplente pela fabrica);
  inelegiveis certos: os dois planejadores do bloco, o dev de nuvem e o orquestrador derruba com: `grep -ic 'inelegib' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402.md`

O resto do tabuleiro: um worktree por cadeira que muta (w-j01bc1, w-j01bc2, w-j01bc3) com npm ci proprio e Node 20; nenhum jurado
  precisa de banco; S0 (node scripts/sync-agent-agents.mjs --check igual a zero); baseline honesto (frontend check e smoke com npm ci
  proprio; os numeros da secao 0.6 a re-verificar); os mandatos um por papel em C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/ com a cerca do veredito do pre-voo
  igual ao head colado (errata 15.15 do plano do B-GOV-MANDATO); o relatorio do dev em C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/DEV-relatorio.md lido como insumo e nao como
  fato; o plano nomeia o diretorio da junta com o prefixo J, e a casa usa o diretorio sem prefixo, que e o que existe; plano de perda
  (queda relanca a mesma identidade) e de PAUSA (P7) derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402.md e o orquestrador o versiona; worktree
  proprio detached C:/Users/AMP/w-insp402, removido pelo nome; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que executa; base
  viva nunca alvo; nada escrito no repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-402.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 402; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #402 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv01b/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/inspetor.md
ec=0
head=b02745b734bc14aee3209928b30dcdcfa50e12ec
utc=2026-10-02T11:40:28Z
```
