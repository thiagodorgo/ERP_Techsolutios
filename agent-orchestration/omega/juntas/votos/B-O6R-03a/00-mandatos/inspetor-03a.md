# Mandato — Inspetor de terreno da junta — B-O6R-03a (PR 425, junta)

## MEDIDO

Estado do PR 425 pela ferramenta do B-GOV-MANDATO medido por: `bash scripts/mandato-refs.sh 425`
```
# refs do PR #425 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-11T23:15Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/expense-sync-atomic
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      5cee8e5754888ef138d8d8b2bcb9ad9c37907ad5
merge-base:      9566d55bd719ce7d7a545281c57923a25f883ed3
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #425
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)
```

Os arquivos que o ramo muda contra a base dele (merge-base com origin/main) medido por: `git diff --name-only "$(git merge-base origin/main HEAD)" HEAD | paste -sd" "`
```
.agents/agents/especialistas/jurado-o6r03a-v2-banco.md .agents/agents/especialistas/jurado-o6r03a-v2-regressao.md .agents/agents/especialistas/jurado-o6r03a-v2-replay.md .claude/agents/especialistas/jurado-o6r03a-v2-banco.md .claude/agents/especialistas/jurado-o6r03a-v2-regressao.md .claude/agents/especialistas/jurado-o6r03a-v2-replay.md .github/workflows/ci.yml API_CONTRACTS.md agent-orchestration/controle/decisoes.md agent-orchestration/controle/pendencias-indice.md agent-orchestration/controle/pendencias.md docs/revisoes/O6R/REGISTRO_ACHADOS_O6R.md docs/revisoes/SAN3/B-O6R-03a-CRITICA-r1.md docs/revisoes/SAN3/B-O6R-03a-CRITICA-r2.md docs/revisoes/SAN3/B-O6R-03a-EMENDA-v3.md docs/revisoes/SAN3/B-O6R-03a-PRECRITICA-api.md docs/revisoes/SAN3/B-O6R-03a-dev.md docs/revisoes/SAN3/B-O6R-03a-plano.md src/modules/expense-management/expense-management-prisma.repository.ts src/modules/expense-management/expense-management.dto.ts src/modules/expense-management/expense-management.repository.ts src/modules/expense-management/expense-management.service.ts src/modules/expense-management/expense-management.types.ts src/modules/expense-management/expense-management.validators.ts src/modules/expense-management/expense-sync.ts src/modules/expense-management/index.ts tests/expense-management-routes.test.ts tests/expense-sync-atomic-db.test.ts tests/expense-sync-fingerprint.test.ts
```

O plano do bloco existe no ramo, com este numero de linhas medido por: `wc -l < docs/revisoes/SAN3/B-O6R-03a-plano.md`
```
454
```

## HIPOTESE

O papel e o inspetor-de-terreno-da-junta (contrato secao C7.1-bis, fail-closed), instancia nova para a junta do bloco B-O6R-03a
  (PR 425, sync de despesa atomico e sem lancamento em dobro, bloco de DINHEIRO), rodando no Claude Code em Opus 5.5, no nivel menor
  por decisao do dono de 2026-10-10 (topo so no plano e em toda reprovacao de junta), declarado no parecer; usa o corpo de origin/main
  e declara na 1a linha do parecer o papel, o modelo, o mandato_md5 deste arquivo e o md5 EOL-neutro do corpo; ele nao julga merito derruba com: `head -1 C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md | grep -ic 'mandato_md5'` (novo)

O objeto e o head do PR 425 resolvido pelo proprio inspetor por git e por gh, so com os check-runs CONCLUIDOS (ausencia, pendente ou
  cancelado bloqueia; vermelho e insumo; o T15 do B-SAN3-05 e o A11 sao instaveis conhecidos, dono B-ARNES-2); os insumos estao na
  ref: o plano v2 em docs/revisoes/SAN3/B-O6R-03a-plano.md (secao 8, a junta), a emenda v3, as criticas r1 e r2, a pre-critica da
  API e o relatorio do dev em docs/revisoes/SAN3/B-O6R-03a-dev.md (inclusive o incidente R11a, desfeito e conferido por sha256) derruba com: `grep -ic 'check-run' C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md` (novo)

O tabuleiro e o da secao 8 do plano: as tres cadeiras novas (jurado-o6r03a-v2-banco, jurado-o6r03a-v2-replay,
  jurado-o6r03a-v2-regressao) rastreadas no head nos dois espelhos e S0 verde (node scripts/sync-agent-agents.mjs --check), corpo
  carregado e corpo julgado conferidos de forma EOL-neutra; a inelegibilidade por nome da secao 8.2 conferida (planejadores v1 e
  v2, criticos r1 e r2, os devs do bloco, inclusive o dev-03a-codex e o dev-03a-claude); a decisao do dono D-03a = A e o passo 0
  da v3 registrados em agent-orchestration/controle/decisoes.md; um worktree e um container Linux descartavel por cadeira com prefixo unico (j03a-c1,
  j03a-c2, j03a-c3), papel sem BYPASSRLS, nunca a base viva; os containers trc01-* de outro bloco nao sao alvo; disco de pelo
  menos 10 GB antes de cada cadeira derruba com: `grep -ic 'inelegib' C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md` (novo)

O veredito e LIBERADO, LIBERADO COM RESSALVA ou BLOQUEADO; a evidencia e incremental com hora em
  C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-evidencia.md (novo) e o parecer em
  C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md (novo), que o orquestrador versiona;
  worktree proprio detached C:/Users/AMP/w-insp-03a (novo), removido pelo nome; nunca tail -f; timeout no que executa; a base viva e
  as portas do servidor do dono nunca sao alvo; nada escrito no repositorio fora da evidencia e do parecer; PAUSA grava a secao PAUSA
  e para (P7) derruba com: `grep -icE 'LIBERADO|BLOQUEADO' C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/insp-03a-parecer.md` (novo)

## MEDIDO

Pre-voo deste mandato no head do PR, com o pre-voo do ramo do B-GOV-MANDATO copiado para um arnes local medido por: `bash scripts/mandato-preflight.sh <este-mandato> 425; echo ec=$?`
```
COLAGEM    l.6-19: refs do PR #425 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-03a/agent-orchestration/omega/juntas/votos/B-O6R-03a/00-mandatos/inspetor-03a.md
ec=0
head=5cee8e5754888ef138d8d8b2bcb9ad9c37907ad5
utc=2026-10-11T23:15:21Z
```
