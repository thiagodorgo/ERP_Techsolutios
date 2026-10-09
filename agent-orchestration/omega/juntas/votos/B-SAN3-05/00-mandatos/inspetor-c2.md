# Mandato — Inspetor de terreno da junta 2 — B-SAN3-05 (PR 405, junta)

## MEDIDO

Estado do PR 405 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 405`
```
# refs do PR #405 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-09T07:12Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/runtime-role-sem-bypass
base:            origin/main
estado:          OPEN | rascunho=true | CONFLICTING
head do PR:      dbf8ba15133cb949c747c0b9b33934ef8e159d66
merge-base:      c8af64580cb85ddf4960fecb2f8604384f8f0328
merge commit:    <ainda nao mergeado>
check-runs:      total=7 nao-verdes=0 pendentes=0
approved_head:   NAO DETERMINAVEL (a ata casa o PR mas NAO declara aprovacao: nenhuma linha '- **approved_head:**')
                 objeto declarado 5ab037a3fc8f0b4ae1d24d68fd23691b154df7e1 (agent-orchestration/omega/juntas/J-B-SAN3-05.md:5 @head-do-PR) — aprovacao nao legivel por maquina
                 agent-orchestration/omega/juntas/J-B-SAN3-09.md (mencao no corpo) @origin/main
                 NAO invente: sem a linha '- **approved_head:**' numa ata que se declare
                 sobre este PR, a ferramenta NAO afirma qual head a junta aprovou.
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-san305-c2-arnes-e-escopo.md .agents/agents/especialistas/jurado-san305-c2-credencial-e-papel.md .agents/agents/especialistas/jurado-san305-c2-ratchet-e-superficie.md .claude/agents/especialistas/jurado-san305-c2-arnes-e-escopo.md .claude/agents/especialistas/jurado-san305-c2-credencial-e-papel.md .claude/agents/especialistas/jurado-san305-c2-ratchet-e-superficie.md .gitattributes agent-orchestration/codex/comandos/B-SAN3-05-runtime-role-sem-bypass.md agent-orchestration/codex/log-execucao.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md agent-orchestration/docs/status-geral.md agent-orchestration/omega/juntas/J-B-SAN3-05.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-inspetor-terreno.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/C1.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/C2.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/C3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev-sucessor-2.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/dev.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/inspetor.md agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/planejador-v3.md agent-orchestration/omega/juntas/votos/B-SAN3-05/C1-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-05/C1-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-05/C2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-05/C2-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-05/C3-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-05/C3-voto.json agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/FABRICA-ciclo2-relatorio.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-c2-evidencia.md agent-orchestration/omega/juntas/votos/B-SAN3-05/PLANEJADOR-v3-relatorio.md agent-orchestration/omega/reprovacoes/R-B-SAN3-05-1.md docker-compose.prod.yml docs/deployment.md docs/revisoes/SAN3/B-SAN3-05-critica-r1.md docs/revisoes/SAN3/B-SAN3-05-critica-r2.md docs/revisoes/SAN3/B-SAN3-05-plano.md scripts/db-runtime-role.sh scripts/san3-05-acessos-de-plataforma.mjs src/config/env.ts src/database/rls.ts src/database/runtime-role.bootstrap.ts src/database/runtime-role.ts src/modules/cloud-charges/cloud-charge-prisma.repository.ts src/modules/cloud-usage/cloud-usage-prisma.repository.ts src/server.ts tests/db-catalog-write-guard.test.ts tests/fixtures/san3-05-mutacoes/Ma_alias.ts tests/fixtures/san3-05-mutacoes/Mb_destructure.ts tests/fixtures/san3-05-mutacoes/Mc_element.ts tests/fixtures/san3-05-mutacoes/Md_tx_sem_setter.ts tests/fixtures/san3-05-mutacoes/Me_root_dentro_wrapper.ts tests/fixtures/san3-05-mutacoes/Mf_new_como_argumento.ts tests/fixtures/san3-05-mutacoes/Mg_subclasse.ts tests/fixtures/san3-05-mutacoes/Mh_funcao_livre_client.ts tests/fixtures/san3-05-mutacoes/Mi_sql_em_constante.ts tests/fixtures/san3-05-mutacoes/Mj_campo_arrow.ts tests/fixtures/san3-05-mutacoes/Mk_fabrica_param_tx.ts tests/fixtures/san3-05-mutacoes/Ml_mutacao_do_plano.ts tests/fixtures/san3-05-mutacoes/Mm_getter_prisma.ts tests/fixtures/san3-05-mutacoes/Mn_membro_nao_previsto.ts tests/fixtures/san3-05-mutacoes/Mo_tx_param_helper.ts tests/fixtures/san3-05-mutacoes/Mp_this_client_fora_de_classe_injetada.ts tests/fixtures/san3-05-mutacoes/Mq_updateManyAndReturn.ts tests/fixtures/san3-05-mutacoes/N01_destructure_renomeado.ts tests/fixtures/san3-05-mutacoes/N02_alias_do_delegate.ts tests/fixtures/san3-05-mutacoes/N03_new_via_namespace.ts tests/fixtures/san3-05-mutacoes/N04_import_renomeado.ts tests/fixtures/san3-05-mutacoes/N05_setter_condicional.ts tests/fixtures/san3-05-mutacoes/N06_setter_no_cliente_errado.ts tests/fixtures/san3-05-mutacoes/N07_delegate_como_argumento.ts tests/fixtures/san3-05-mutacoes/N08_subclasse_via_namespace.ts tests/fixtures/san3-05-mutacoes/N09_setter_em_comentario.ts tests/fixtures/san3-05-mutacoes/N10_any.ts tests/fixtures/san3-05-mutacoes/c2-c3a-generic-constructor.ts tests/fixtures/san3-05-mutacoes/c2-c3b-union-constructor.ts tests/fixtures/san3-05-mutacoes/c2-c3c-reflect-construct.ts tests/fixtures/san3-05-mutacoes/c2-c3e-nested-relation.ts tests/fixtures/san3-05-mutacoes/c2-f2-migration.sql tests/fixtures/san3-05-mutacoes/c2-f2-reader.fixture.tsx tests/fixtures/san3-05-mutacoes/c2-f2-schema.prisma tests/production-runtime-gates.test.ts tests/san3-05-acessos-de-plataforma-guard.test.ts tests/san3-05-leituras-de-plataforma-db.test.ts tests/san3-05-runtime-role-bootstrap.test.ts tests/san3-05-runtime-role-guard-db.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-SAN3-05-plano.md`
```
1704
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta 2 do B-SAN3-05 (PR 405),
  rodando no Claude Code em Opus 5.5 por substituicao declarada (decisao do dono de 2026-10-08: Fable so em bloco que toca dinheiro, e
  este bloco nao toca), com o corpo de origin/main, e declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o
  md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 405 resolvido pelo proprio inspetor, e so e objeto com os check-runs CONCLUIDOS, inclusive o job docker
  (ausencia, pendente ou cancelado bloqueia; vermelho e insumo do voto); o tabuleiro e o da secao C2.5 de docs/revisoes/SAN3/B-SAN3-05-plano.md:
  as tres cadeiras novas (jurado-san305-c2-credencial-e-papel, jurado-san305-c2-arnes-e-escopo, jurado-san305-c2-ratchet-e-superficie)
  estao rastreadas no head do PR nos dois espelhos e S0 da verde (node scripts/sync-agent-agents.mjs --check); a inelegibilidade por nome
  da C2.5 e conferida, inclusive contra especialistas nao rastreados de nome parecido na arvore principal; um worktree por cadeira e um
  container Linux descartavel por cadeira, com os prefixos dos corpos, nunca a base viva derruba com: `grep -ic 'check-run' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md` (novo)

Os insumos: o relatorio do dev do ciclo 2 (C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/DEV-ciclo2-relatorio.md,
  com as tres paradas obrigatorias e as erratas 1 a 3 do D4, a 2 e a 3 por decisao do dono) e o relatorio da fabrica
  (C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/FABRICA-ciclo2-relatorio.md, com as divergencias que ela anotou)
  sao lidos como roteiro e nao como fato; o dev do ciclo 2 teve duas identidades (o Codex e um sucessor que caiu sem gravar nada) e
  o commit de registro do orquestrador que versionou os corpos esta fora do escopo do dev por desenho; plano de perda (queda relanca a
  mesma identidade) e de PAUSA (P7); nenhum segredo real no tabuleiro derruba com: `grep -ic 'FABRICA-ciclo2' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; o parecer e incremental com hora em C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md (novo) e o orquestrador o versiona; worktree
  proprio detached C:/Users/AMP/w-insp405c2 (novo), removido pelo nome; nunca tail -f nem MSYS_NO_PATHCONV exportada; timeout no que
  executa; base viva nunca alvo; nada escrito no repositorio fora do parecer; PAUSA grava a secao PAUSA e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/ciclo2/00-inspetor-terreno.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 405; echo ec=$?`
```
COLAGEM    l.6-22: refs do PR #405 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-o05/agent-orchestration/omega/juntas/votos/B-SAN3-05/00-mandatos/inspetor-c2.md
ec=0
head=dbf8ba15133cb949c747c0b9b33934ef8e159d66
utc=2026-10-09T07:12:22Z
```
