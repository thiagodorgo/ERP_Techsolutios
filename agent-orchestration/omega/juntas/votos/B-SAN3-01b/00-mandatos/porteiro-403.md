# Mandato — porteiro pos-merge do registro — B-SAN3-01b (PR 403, pos-merge)

## MEDIDO

Estado do PR 403 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 403`
```
# refs do PR #403 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T23:35Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/registro-402
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      f397aac47dc478355dad34e4203b6019ce100747
merge-base:      3e40a256ce801a8e63230b4b764ba1d2803f4f23
merge commit:    f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #403
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 403 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato secao C2 item 8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 403, registro puro do
  PR 402, em Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e
  declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-403.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: a promessa do corpo do PR 403 contra o diff real do commit
  de merge (so registro e KPI sem mudar numero: nenhum codigo nem teste); o backfill da secao C3 item 5 da entrada do B-SAN3-01b nos dois
  JSON de KPI (PR, commit de merge e head aprovado iguais ao merge do PR 402 e a ata J-B-SAN3-01b), com o FROZEN do app.js pelo kpi-freeze e
  os guards de KPI executados; e as quatro pendencias novas com dono e o indice pelo gerador sem diff residual derruba com: `grep -ic 'kpi-freeze' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-403.md`

O porteiro confere a limpeza da secao C5 declarada pelo orquestrador (worktree e ramo do registro removidos, ramo remoto apagado, main
  local avancada) e diz se alguma pendencia que BLOQUEIA os proximos alvos continua aberta; os proximos alvos sao a junta do PR 401 (que ja
  integrou esta main) e o ciclo 4 do PR 393; o veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-403.md`

O terreno: o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-403.md e o orquestrador o versiona; worktree proprio detached em caminho curto
  C:/Users/AMP/w-port403, npm ci proprio sem junction, removido pelo nome ao fim com 0 processo vivo; nunca tail -f nem MSYS_NO_PATHCONV
  exportada; timeout no que executa; base viva nunca alvo; nada escrito no repositorio; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-403.md`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 403; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #403 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg403/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro-403.md
ec=0
head=f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
utc=2026-10-02T23:35:44Z
```
