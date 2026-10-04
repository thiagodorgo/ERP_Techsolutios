# Mandato — porteiro-398 — B-GOV-PAUSA (PR 398, pos-merge)

## MEDIDO

Estado do PR 398 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 398`
```
# refs do PR #398 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T21:31Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/registro-397
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      899e706c94f8308eaa3bb484da61bed37f7a48dc
merge-base:      513937b0555e2a6175e7e89d8ae9e44dbc995f8a
merge commit:    5bcdcc58fda793dd6e5ffc12f2d0709bef3f222d
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #398
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 398 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato §C2.8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 398, em Fable por
  contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e declara na 1a
  linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-398.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: o PR 398 e REGISTRO PURO do PR 397 (nenhum arquivo
  de src, tests, prisma, frontend, mobile, .github ou scripts); a promessa do corpo do PR contra o diff real do commit de merge — o
  parecer do porteiro do 397 versionado byte a byte, o backfill do 397 (commit de merge e head aprovado, este lido da ata
  agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md) nos dois JSON de KPI e o app.js so pelo kpi-freeze, as duas pendencias da junta
  abertas com dono no agent-orchestration/controle/pendencias.md e o indice pelo gerador, a fonte do caso do dev de testes versionada,
  e a errata pos-merge no corpo do PR 397 no GitHub derruba com: `grep -ic 'aprovado' agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-398.md`

O porteiro confere a limpeza §C5 que o orquestrador declarou (worktrees do PR removidos pelo nome, ramo apagado no local e no remoto
  depois de provar arvores iguais, remote prune, main local avancada; o post-merge-cleanup.sh nao rodou porque o docker volume prune
  derrubaria o cluster de KPI de um dev vivo do PR 393), e se alguma pendencia que BLOQUEIA o proximo alvo continua aberta; os
  proximos alvos sao o ciclo 4 do PR 393 (integrado com a main deste merge) e as tarefas de nuvem dos blocos B-SAN3-05, B-SAN3-09 e B-SAN3-11 derruba com: `grep -icE 'LIBERADO|BLOQUEADO' agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-398.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora num arquivo do scratchpad da sessao, que o
  orquestrador versiona byte a byte no ramo docs/registro-398; o porteiro mede num worktree proprio detached em caminho curto, removido
  pelo nome ao fim, nunca tail -f nem MSYS_NO_PATHCONV exportada, timeout no que executa, base viva erp-postgres 5432 e erp-redis 6379
  nunca alvo, nada escrito no repositorio; se receber PAUSA, grava a secao PAUSA no parecer e para sozinho derruba com: `git ls-remote origin refs/heads/docs/registro-398 | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 398; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #398 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg398/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/porteiro-398.md
ec=0
head=8e853ed49e989668eaa59cf9a2c711776e6f7f29
utc=2026-10-01T21:31:39Z
```
