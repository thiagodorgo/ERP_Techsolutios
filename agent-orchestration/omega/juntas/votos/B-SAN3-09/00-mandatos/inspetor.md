# Mandato — inspetor de terreno — B-SAN3-09 (PR 400, junta)

## MEDIDO

Estado do PR 400 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 400`
```
# refs do PR #400 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-02T11:44Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            feat/bootstrap-platform-admin
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      d7e857d19f712009237c486b07e4820197ed941a
merge-base:      5b6e103638f398d6074eecc5daebdf2d3bcd2252
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #400
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-09-bootstrap-platform-admin.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md docs/deployment.md docs/revisoes/SAN3/B-SAN3-09-plano.md scripts/bootstrap-platform-admin.ts tests/san3-09-bootstrap-platform-admin-db.test.ts tests/san3-09-bootstrap-platform-admin.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-09-plano.md`
```
1550
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 1 do B-SAN3-09 (PR 400),
  em Fable por contrato (esgotado o Fable, Opus com a substituicao declarada; esgotado o Opus, para), com o corpo de origin/main, e
  declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-400.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 400 resolvido pelo proprio inspetor, e so e objeto com os check-runs CONCLUIDOS (ausencia, pendente ou cancelado
  bloqueia; vermelho e insumo do voto); o tabuleiro e o da secao 10 de docs/revisoes/SAN3/B-SAN3-09-plano.md: as tres cadeiras (agente-secops, agente-dba-guardiao,
  guardiao-fail-closed) existem no origin/main e nao participaram deste bloco (inelegiveis por nome: o planejador do B-SAN3-09, o dev de
  nuvem e o orquestrador); um worktree por cadeira (w-j09c1, w-j09c2, w-j09c3) e um cluster Postgres descartavel por cadeira que usa
  banco, em portas livres provadas e nunca a base viva; S0 (node scripts/sync-agent-agents.mjs --check igual a zero); baseline honesto
  (npm run check e os dois testes do bloco com npm ci proprio) derruba com: `grep -ic 'check-run' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-400.md`

Os mandatos: um por papel em C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/ com a cerca do veredito do pre-voo igual ao head colado (errata 15.15 do plano do
  B-GOV-MANDATO); o relatorio do dev em C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/DEV-relatorio.md lido como insumo e nao como fato; plano de perda (queda relanca a mesma
  identidade) e de PAUSA (P7); nenhum segredo real no tabuleiro (a senha do bootstrap e de teste e descartavel) derruba com: `grep -ic '00-mandatos' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-400.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-400.md e o orquestrador o versiona; worktree
  proprio detached C:/Users/AMP/w-insp400, removido pelo nome; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que executa; base
  viva nunca alvo; nada escrito no repositorio; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/AppData/Local/Temp/claude/c--Users-AMP-Documents-GitHub-ERP-Techsolutios/3ad1b87d-fdbf-41f2-b085-1068e01c5d64/scratchpad/INSPETOR-400.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 400; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #400 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-nuv09/agent-orchestration/omega/juntas/votos/B-SAN3-09/00-mandatos/inspetor.md
ec=0
head=d7e857d19f712009237c486b07e4820197ed941a
utc=2026-10-02T11:44:55Z
```
