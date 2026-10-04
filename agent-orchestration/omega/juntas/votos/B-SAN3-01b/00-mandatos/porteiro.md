# Mandato — porteiro pos-merge — B-SAN3-01b (PR 402, pos-merge)

## MEDIDO

Estado do PR 402 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 402`
```
# refs do PR #402 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T22:28Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/web-guarda-por-alcance-e-estado-da-pagina
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      1483a6f7680ba9504e12bf25eaaa423373cd1a01
merge-base:      4ab9d232d2c6705ad39cf6bd4313ca5c91b222a9
merge commit:    3e40a256ce801a8e63230b4b764ba1d2803f4f23
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   cdf370dcb4c817e1c4292aed1204140951616971
                 ^ LIDO DA ATA: agent-orchestration/omega/juntas/J-B-SAN3-01b.md:5 @head-do-PR

AVISO: merge commit != approved_head. Isso e NORMAL quando houve pre-merge —
       e e exatamente o par que o orquestrador ja trocou duas vezes.
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 402 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato secao C2 item 8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 402 (B-SAN3-01b), em
  Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e declara na
  1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: a promessa do corpo do PR 402 e do plano
  docs/revisoes/SAN3/B-SAN3-01b-plano.md contra o diff real do commit de merge; as contagens reexecutadas na main de agora (o test:smoke do
  frontend com N e forma por TAP, e os testes do bloco), contra o KPI publicado (blocks_completed 170, frontend_smoke_tests do bloco); e os
  campos de PR, commit de merge e head aprovado do KPI, que ficaram nulos na autoria e devem o backfill da secao C3 item 5 derruba com: `grep -ic 'test:smoke' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md`

O porteiro confere a ata agent-orchestration/omega/juntas/J-B-SAN3-01b.md (o head aprovado igual ao objeto que as tres cadeiras votaram,
  o veredito, os pareceres do inspetor e as quedas), a absorcao do squash pela comparacao de arvores, as pendencias que o bloco fecha por
  amostragem, e os seis ajustes e notas da junta que ainda nao tem pendencia nomeada com dono; e a limpeza da secao C5 declarada pelo
  orquestrador (worktrees do PR e das cadeiras removidos, ramo apagado no local e no remoto, remote prune, main local avancada, nenhum
  artefato de build nem ramo local mergeado a remover na arvore principal) derruba com: `grep -ic 'J-B-SAN3-01b' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md`

O porteiro diz se alguma pendencia que BLOQUEIA os proximos alvos continua aberta; os proximos alvos sao o PR 401 (B-SAN3-11, que precisa
  integrar esta main e recontar o KPI antes do inspetor novo) e o ciclo 4 do PR 393; o veredito e LIBERADO, LIBERADO COM RESSALVA ou
  BLOQUEADO derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md`

O terreno: o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md e o orquestrador o versiona byte a byte no ramo docs/registro-402; worktree proprio
  detached em caminho curto C:/Users/AMP/w-port402, npm ci proprio sem junction, removido pelo nome ao fim com 0 processo vivo; nunca tail
  -f nem MSYS_NO_PATHCONV exportada; timeout no que executa; base viva erp-postgres 5432 e erp-redis 6379 nunca alvo; nada escrito no
  repositorio; sob PAUSA grava a secao PAUSA no parecer e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-402.md`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 402; echo ec=$?`
```
COLAGEM    l.6-22: refs do PR #402 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg402/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro.md
ec=0
head=3e40a256ce801a8e63230b4b764ba1d2803f4f23
utc=2026-10-02T22:28:21Z
```
