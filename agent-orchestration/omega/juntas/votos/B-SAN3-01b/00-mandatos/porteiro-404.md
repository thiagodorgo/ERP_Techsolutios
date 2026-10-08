# Mandato — porteiro do merge do PR 404 — B-SAN3-01b (PR 404, pos-merge)

## MEDIDO

Estado do PR 404 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 404`
```
# refs do PR #404 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-03T16:29Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            docs/registro-403
base:            origin/main
estado:          MERGED | rascunho=false | UNKNOWN
head do PR:      cc7a2acd16854b19cc44315c5eb5fb6b29788d27
merge-base:      f03b883fb6ffeeddd4b833300ff3832ee4dc8cc0
merge commit:    b404815ce3d1f1b8e5121bd1526978f7222e7479
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #404
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

O commit de merge do PR esta na origin/main medido por: `git merge-base --is-ancestor "$(gh pr view 404 --json mergeCommit --jq .mergeCommit.oid)" origin/main && echo NA-MAIN || echo FORA`
```
NA-MAIN
```

O ramo de registro parte da origin/main (merge-base igual) medido por: `[ "$(git merge-base origin/main HEAD)" = "$(git rev-parse origin/main)" ] && echo IGUAL || echo DIFERENTE`
```
IGUAL
```

## HIPOTESE

O papel e o porteiro-pos-merge (contrato secao C2 item 8, D-PORTEIRO-POS-MERGE), instancia nova para o merge do PR 404, registro puro das
  quatro ressalvas do porteiro do PR 403, rodando no Codex em GPT-6 Astra, o modelo de gate do espelho Codex (secao C7.6-bis), porque o dono
  suspendeu o Fable ate o reinicio do limite semanal e habilitou o Codex neste projeto (2026-10-03); corpo de origin/main no espelho
  .agents/agents/porteiro-pos-merge.md com o protocolo de emulacao de .agents/agents/README.md; declara na 1a linha do parecer o papel, o
  modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-404.md | grep -ic 'mandato_md5'`

O porteiro revalida o que foi entregue, por execucao propria e nunca por copia: a promessa do corpo do PR 404 contra o diff real do commit
  de merge (so registro: nenhum codigo, teste nem numero de KPI muda); o parecer do porteiro do PR 403 e o do PR 399 versionados byte a byte
  contra os arquivos de origem declarados; a backfill_note do B-SAN3-01b corrigida (a arvore do merge e a do head final do PR) conferida nos
  dois JSON de KPI, com o FROZEN do app.js pelo kpi-freeze --check e os guards de KPI executados; os donos novos de
  P-SAN3-01B-MOCK-POR-CONVENCAO-DE-NOME e P-SAN3-01B-PROVA-DO-GATE-EXTENSIONAL validos no plano da rodada, e o indice pelo gerador sem diff
  residual derruba com: `grep -ic 'kpi-freeze' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-404.md`

O porteiro confere a limpeza da secao C5 declarada pelo orquestrador (worktree e ramo do registro do 404 removidos, ramo remoto apagado,
  main local avancada) e diz se alguma pendencia que BLOQUEIA os proximos alvos continua aberta; os proximos alvos sao a junta 2 do PR 401,
  a junta 4 do PR 393 (em curso) e a junta do PR 400; o veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-404.md`

O terreno: o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-404.md e o orquestrador o versiona; worktree proprio detached em caminho curto
  C:/Users/AMP/w-port404, npm ci proprio sem junction, removido pelo nome ao fim com 0 processo vivo; a maquina esta sob carga de outra junta,
  entao nada de bateria inteira sem necessidade e timeout em tudo; nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem
  --worktree; base viva nunca alvo; nada escrito no repositorio; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -ic 'medido por' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/PORTEIRO-404.md`

## MEDIDO

Pre-voo deste mandato no head do ramo de registro, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 404; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #404 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-reg404/agent-orchestration/omega/juntas/votos/B-SAN3-01b/00-mandatos/porteiro-404.md
ec=0
head=b404815ce3d1f1b8e5121bd1526978f7222e7479
utc=2026-10-03T16:30:03Z
```
