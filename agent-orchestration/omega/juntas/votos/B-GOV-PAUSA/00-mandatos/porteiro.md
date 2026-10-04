# Mandato — porteiro-397 — B-GOV-PAUSA (PR 397, pos-merge)

## MEDIDO

Estado do PR 397 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 397`
```
# refs do PR #397 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-01T20:51Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/gov-pausa-grava-e-para
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      5fed0a55458d2a9dd731f3eeb15ee59830f16c76
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    513937b0555e2a6175e7e89d8ae9e44dbc995f8a
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   67c2c280612cb644f246af0b5410cab59afe028d
                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md:6 @head-do-PR

AVISO: merge commit != approved_head. Isso e NORMAL quando houve pre-merge —
       e e exatamente o par que o orquestrador ja trocou duas vezes.
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 397 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato §C2.8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 397, em Fable por
  contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e declara na 1a
  linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-397.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: a promessa do PR (corpo e ata
  agent-orchestration/omega/juntas/J-B-GOV-PAUSA.md) contra o diff real do commit de merge; as contagens reexecutadas (KPI: o
  blocks_completed contra a main anterior ao merge, as tres trilhas carregadas com nota, os guards de KPI com npm ci proprio); a
  ata com o head aprovado e os tres votos; as duas pendencias que a ata manda abrir no registro seguinte (elaboracoes do transcritor
  e caso sem fonte) e as duas que o PR abriu, conferidas no agent-orchestration/controle/pendencias.md da main derruba com: `grep -ic 'aprovado'\|head aprovado' agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-397.md`

O porteiro confere a limpeza §C5 que o orquestrador declarou (worktrees do PR removidos pelo nome, ramo apagado no local e no remoto
  depois de provar arvores iguais, remote prune, main local avancada; o post-merge-cleanup.sh nao rodou porque o docker volume prune
  derrubaria o cluster de KPI de um dev vivo do PR 393), e se alguma pendencia que BLOQUEIA o proximo alvo continua aberta; os
  proximos alvos sao o ciclo 4 do PR 393 e as tarefas de nuvem dos blocos B-SAN3-05, B-SAN3-09 e B-SAN3-11 derruba com: `grep -icE 'LIBERADO|BLOQUEADO' agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/PORTEIRO-397.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora num arquivo do scratchpad da sessao, que o
  orquestrador versiona byte a byte no ramo docs/registro-397; o porteiro mede num worktree proprio detached em caminho curto, removido
  pelo nome ao fim, nunca tail -f nem MSYS_NO_PATHCONV exportada, timeout no que executa, base viva erp-postgres 5432 e erp-redis 6379
  nunca alvo, nada escrito no repositorio; se receber PAUSA, grava a secao PAUSA no parecer e para sozinho derruba com: `git ls-remote origin refs/heads/docs/registro-397 | wc -l`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 397; echo ec=$?`
```
COLAGEM    l.6-22: refs do PR #397 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg397/agent-orchestration/omega/juntas/votos/B-GOV-PAUSA/00-mandatos/porteiro.md
ec=0
head=bc1ae0ed41a8f643ba26f22389835a3b5e66b4cf
utc=2026-10-01T20:51:55Z
```
