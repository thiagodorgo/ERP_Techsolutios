# Mandato — inspetor da junta 1 — B-SAN3-05 (PR 405, junta)

## MEDIDO

Estado do PR 405 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 405`
```
# refs do PR #405 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-04T19:34Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/runtime-role-sem-bypass
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      240dbaa9560c3ccb23a41e42885e8d1b7815fb32
merge-base:      b404815ce3d1f1b8e5121bd1526978f7222e7479
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #405
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.gitattributes Kpis/app.js Kpis/kpis-history.json Kpis/kpis-history.md Kpis/kpis-latest.json agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev-sucessor-2.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md docker-compose.prod.yml docs/deployment.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md scripts/db-runtime-role.sh scripts/san3-05-acessos-de-plataforma.mjs src/config/env.ts src/database/rls.ts src/database/runtime-role.bootstrap.ts src/database/runtime-role.ts src/modules/cloud-charges/cloud-charge-prisma.repository.ts src/modules/cloud-usage/cloud-usage-prisma.repository.ts src/server.ts tests/db-catalog-write-guard.test.ts tests/fixtures/san3-05-mutacoes/Ma_alias.ts tests/fixtures/san3-05-mutacoes/Mb_destructure.ts tests/fixtures/san3-05-mutacoes/Mc_element.ts tests/fixtures/san3-05-mutacoes/Md_tx_sem_setter.ts tests/fixtures/san3-05-mutacoes/Me_root_dentro_wrapper.ts tests/fixtures/san3-05-mutacoes/Mf_new_como_argumento.ts tests/fixtures/san3-05-mutacoes/Mg_subclasse.ts tests/fixtures/san3-05-mutacoes/Mh_funcao_livre_client.ts tests/fixtures/san3-05-mutacoes/Mi_sql_em_constante.ts tests/fixtures/san3-05-mutacoes/Mj_campo_arrow.ts tests/fixtures/san3-05-mutacoes/Mk_fabrica_param_tx.ts tests/fixtures/san3-05-mutacoes/Ml_mutacao_do_plano.ts tests/fixtures/san3-05-mutacoes/Mm_getter_prisma.ts tests/fixtures/san3-05-mutacoes/Mn_membro_nao_previsto.ts tests/fixtures/san3-05-mutacoes/Mo_tx_param_helper.ts tests/fixtures/san3-05-mutacoes/Mp_this_client_fora_de_classe_injetada.ts tests/fixtures/san3-05-mutacoes/Mq_updateManyAndReturn.ts tests/fixtures/san3-05-mutacoes/N01_destructure_renomeado.ts tests/fixtures/san3-05-mutacoes/N02_alias_do_delegate.ts tests/fixtures/san3-05-mutacoes/N03_new_via_namespace.ts tests/fixtures/san3-05-mutacoes/N04_import_renomeado.ts tests/fixtures/san3-05-mutacoes/N05_setter_condicional.ts tests/fixtures/san3-05-mutacoes/N06_setter_no_cliente_errado.ts tests/fixtures/san3-05-mutacoes/N07_delegate_como_argumento.ts tests/fixtures/san3-05-mutacoes/N08_subclasse_via_namespace.ts tests/fixtures/san3-05-mutacoes/N09_setter_em_comentario.ts tests/fixtures/san3-05-mutacoes/N10_any.ts tests/production-runtime-gates.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-runtime-role-guard-db.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-05-plano.md`
```
1121
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 1 do B-SAN3-05 (PR 405), com o
  corpo de origin/main, rodando no Claude Code em Opus 5.5 ou no Codex em GPT-5.6 Sol, com a substituicao declarada (o dono suspendeu Fable e
  Astra ate o reset semanal), e declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo;
  ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md | grep -ic 'mandato_md5'`

O objeto e o head do PR 405 resolvido pelo proprio inspetor, so com os check-runs CONCLUIDOS (inclusive o job docker que o secao 10 do plano
  docs/revisoes/SAN3/B-SAN3-05-plano.md exige, ou a razao medida de ele nao rodar); o tabuleiro e o da secao 10: as tres cadeiras (agente-dba-guardiao, agente-secops,
  guardiao-fail-closed) existem no origin/main e nao participaram deste bloco (inelegiveis por nome: critico-b-san3-05, planejador-b-san3-05-v3,
  os devs dev-b-san3-05, dev-b-san3-05-sucessor-1 e dev-b-san3-05-sucessor-2, e o orquestrador); um worktree e um cluster Postgres
  descartavel por cadeira, em portas livres provadas, nunca a base viva; S0 (node scripts/sync-agent-agents.mjs --check igual a zero); baseline
  honesto (npm run check e o arquivo de teste do bloco, com npm ci proprio) derruba com: `grep -ic 'check-run' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md`

Os mandatos: um por papel em C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/ com a cerca igual ao head colado; o relatorio do dev em C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md lido como insumo e
  nao como fato; a regra em vigor (CLAUDE.md secao C7 item 8, D-GOV-PROPORCIONAL: junta completa porque o bloco mexe em seguranca e permissao,
  teto de 2 ciclos, KPI congelado); plano de perda e de PAUSA (P7); nenhum segredo real no tabuleiro derruba com: `grep -ic '00-mandatos' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md`

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md (novo) e o
  orquestrador o versiona; worktree proprio detached C:/Users/AMP/w-insp405, removido pelo nome com 0 processo vivo; nunca tail -f nem
  MSYS_NO_PATHCONV exportada; nunca git config sem --worktree; timeout em tudo; base viva nunca alvo; nada escrito alem do parecer; PAUSA grava a
  secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md`

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 405; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #405 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/inspetor.md
ec=0
head=240dbaa9560c3ccb23a41e42885e8d1b7815fb32
utc=2026-10-04T19:34:56Z
```
