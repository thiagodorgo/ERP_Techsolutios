# Mandato — porteiro do merge do PR 406 — B-SAN3-01b (PR 406, pos-merge)

## MEDIDO

Estado do PR 406 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 406`
```
# refs do PR #406 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T15:45Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/registro-porteiro-404
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      82fe6ba803d77f7cc02c31cddf214b396568793f
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    8ee10bd2e44d95206551b71351f23d901192cbb6
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #406
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 406 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato secao C2 item 8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 406, registro puro
  (parecer do porteiro do PR 404, decisoes do dono de 03 e 04/10, ressalvas R404-1 e R404-3, pausa e retomada), rodando no Claude Code em
  Opus 5.5 por substituicao declarada (o frontmatter diz Fable; o dono suspendeu Fable e Astra ate o reset semanal e manda usar o Claude
  em Opus nas janelas sem Codex, uma tarefa por vez); corpo de origin/main; declara na 1a linha do parecer o papel, o modelo, o
  mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-406.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: a promessa do corpo do PR 406 contra o diff real do commit
  de merge (so registro: nenhum codigo, teste nem numero de KPI muda); o parecer do porteiro do PR 404 versionado contra o arquivo de
  origem declarado (so EOL e espacos finais normalizados); as decisoes em agent-orchestration/controle/decisoes.md com a citacao literal do dono separada da
  transcricao e o conflito com a secao C7.6 registrado; a R404-1 (titulos do kpis-history.md) feita; o kpi-freeze --check e os guards de
  KPI executados derruba com: `grep -ic 'kpi-freeze' C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-406.md`

O porteiro confere a limpeza da secao C5 declarada pelo orquestrador (worktree e ramo do registro removidos, ramo remoto apagado, main
  local avancada) e diz se alguma pendencia que BLOQUEIA os proximos alvos continua aberta; os proximos alvos sao a junta 5 do PR 393, a
  junta 3 do PR 401 e a junta do PR 405; o veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-406.md`

O terreno: o parecer e incremental com hora em C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-406.md (novo) e o orquestrador o versiona; worktree proprio detached em caminho curto
  C:/Users/AMP/w-port406, npm ci proprio sem junction, removido pelo nome ao fim com 0 processo vivo; ha uma matriz de mutantes do PR 393
  rodando na maquina (w-e5), que ninguem toca; nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem --worktree; timeout em
  tudo; base viva nunca alvo; nada escrito no repositorio; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/PORTEIRO-406.md`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 406; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #406 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg406/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro-406.md
ec=0
head=8ee10bd2e44d95206551b71351f23d901192cbb6
utc=2026-10-04T15:45:19Z
```
