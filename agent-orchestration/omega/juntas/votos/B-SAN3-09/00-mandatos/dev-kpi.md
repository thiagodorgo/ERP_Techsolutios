# Mandato — dev de KPI e registro — B-SAN3-09 (PR 400, junta)

## MEDIDO

Estado do PR 400 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 400`
```
# refs do PR #400 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T16:07Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/bootstrap-platform-admin
base:            origin/main
estado:          OPEN | rascunho=true | MERGEABLE
head do PR:      aa64aac395075ef65cfc6638004270ee41b05f42
merge-base:      8ee10bd2e44d95206551b71351f23d901192cbb6
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=4 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #400
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md docs/deployment.md docs/revisoes/SAN3/B-SAN3-09-plano.md scripts/bootstrap-platform-admin.ts tests/san3-09-bootstrap-platform-admin-db.test.ts tests/san3-09-bootstrap-platform-admin.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-09-plano.md`
```
1550
```

## HIPOTESE

O papel e o dev de KPI e registro do B-SAN3-09 (PR 400), identidade NOVA dev-kpi-b-san3-09 (nao planejou, nao desenvolveu o codigo do bloco e
  nao vota), rodando no Claude Code em Opus 5.5 (decisao do dono de 2026-10-04: Claude em Opus nas janelas sem Codex, uma tarefa por vez;
  Fable e Astra suspensos ate o reset semanal); declara na 1a linha do relatorio o papel, a identidade, o modelo e o mandato_md5 deste
  arquivo derruba com: `head -1 C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-KPI-relatorio.md | grep -ic 'mandato_md5'`

Item 1: o KPI do bloco recontado contra a origin/main integrada pelo merge do orquestrador (secao C3 do contrato): blocks_completed igual ao
  da main mais 1, as contagens de teste das trilhas que o bloco exerceu por execucao real no head (N e forma por TAP, suite backend num
  cluster Postgres descartavel proprio), as trilhas nao tocadas carregadas com nota, os campos de commit de merge e de head aprovado nulos na
  autoria, a entrada do history do bloco por ultimo, a linha no kpis-history.md, e Kpis/app.js so por node scripts/kpi-freeze.mjs com o
  --check verde derruba com: `grep -ic 'blocks_completed' C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-KPI-relatorio.md`

Item 2: os guards de KPI executados (os testes de painel e de paridade de KPI da suite) e a backfill_note verdadeira contra o history da main
  real; nada fora de Kpis/** e do relatorio muda; um commit local em Conventional Commits com git diff --cached --check como trava em linha
  propria, que o orquestrador empurra derruba com: `grep -ic 'kpi-freeze' C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-KPI-relatorio.md`

O terreno: worktree proprio detached C:/Users/AMP/w-k400 no head do ramo, npm ci proprio sem junction, prisma generate com DATABASE_URL so
  no ambiente do comando, cluster Postgres descartavel proprio em porta livre provada (a base viva erp-postgres 5432 e erp-redis 6379 nunca
  e alvo); o worktree fica de pe ate o orquestrador empurrar e depois e removido pelo nome com 0 processo vivo; evidencia incremental com
  hora em C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-KPI-relatorio.md (novo) (P1); mensagem final de 1 linha (P2); nunca tail -f nem MSYS_NO_PATHCONV exportada; nunca git config sem --worktree;
  timeout em tudo; sob PAUSA grava a secao PAUSA e para (P7) derruba com: `git -C C:/Users/AMP/Documents/GitHub/ERP_Techsolutios worktree list | grep -ic 'w-k400'`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 400; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #400 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev-kpi.md
ec=0
head=aa64aac395075ef65cfc6638004270ee41b05f42
utc=2026-10-04T16:07:35Z
```
