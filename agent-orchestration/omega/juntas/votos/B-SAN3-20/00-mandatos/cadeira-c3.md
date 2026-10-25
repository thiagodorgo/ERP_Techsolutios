# Mandato — Cadeira C3 (regressão, escopo e registro) — B-SAN3-20 (PR 456, junta de DINHEIRO, ciclo 1)

## MEDIDO

Estado do PR 456 no instante da redação, pela ferramenta `mandato-refs.sh` copiada sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/` para `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/`, executada com o cwd no worktree do objeto, medido por: `cd C:/Users/AMP/w-san320 && bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh 456`
```
# refs do PR #456 — GERADO por scripts/mandato-refs.sh, para COLAR no mandato
# gerado em: 2026-10-24T20:14Z · repo: thiagodorgo/ERP_Techsolutios

ramo:            fix/cheque-x-baixa
base:            origin/main
estado:          OPEN | rascunho=false | MERGEABLE
head do PR:      a0f5aabca6b86aba21051baffd40c245b5ef1a05
merge-base:      7ab2fe71d0d40c2be51a790f0d20893651cdf972
merge commit:    <ainda nao mergeado>
check-runs:      total=14 nao-verdes=0 pendentes=0
approved_head:   AUSENTE — nenhuma ata nomeia nem menciona #456
                 (a junta nao votou, ou a ata nao esta em origin/main nem no head do PR)

```

O ramo remoto `origin/fix/cheque-x-baixa` aponta para o mesmo SHA que o PR 456 declara como head (segunda fonte do objeto), medido por: `git -C C:/Users/AMP/w-san320 ls-remote origin refs/heads/fix/cheque-x-baixa`
```
a0f5aabca6b86aba21051baffd40c245b5ef1a05	refs/heads/fix/cheque-x-baixa
```

Todos os check-runs do objeto estão concluídos e `success` (zero pendentes e zero diferentes de `success`); total e nomes ordenados abaixo, medido por: `gh api repos/thiagodorgo/ERP_Techsolutios/commits/a0f5aabca6b86aba21051baffd40c245b5ef1a05/check-runs --jq '.total_count, ([.check_runs[] | select(.status != "completed" or .conclusion != "success")] | length), ([.check_runs[] | .name] | sort | join(", "))'`
```
14
0
authority-portal, authority-portal, backend, backend, backend-postgres, backend-postgres, docker, docker, flutter, flutter, frontend, frontend, owner-portal, owner-portal
```

Do merge-base (`origin/main`) ao objeto o ramo tem 10 commits de primeiro pai: o último (`<objeto>`) adiciona os 6 arquivos dos corpos das 3 cadeiras desta junta; `<objeto>~1` e `<objeto>~2` são o relatório do dev; `<objeto>~3` é o registro operacional e contratos; `<objeto>~4` é o código/barreiras/drill da retomada em Claude Opus; `<objeto>~5` e `<objeto>~6` são o código parcial e a fixture K12 do dev Codex; `<merge-base>~1` é a ref base medida no plano antes do PR 455, com `src/`, `prisma/`, `tests/` e `.github/` idênticos ao merge-base, medido por: `cd C:/Users/AMP/w-san320 && git rev-list --first-parent --count 7ab2fe71d0d40c2be51a790f0d20893651cdf972..a0f5aabca6b86aba21051baffd40c245b5ef1a05; git log --first-parent --format='%ad %s' --date=format:'%m-%d %H:%M' 7ab2fe71d0d40c2be51a790f0d20893651cdf972..a0f5aabca6b86aba21051baffd40c245b5ef1a05 | cut -c1-110; git diff --quiet 7ab2fe71d0d40c2be51a790f0d20893651cdf972~1 7ab2fe71d0d40c2be51a790f0d20893651cdf972 -- src prisma tests .github && echo 'src, prisma e tests iguais entre <merge-base>~1 e <merge-base>'`
```
10
10-24 16:56 docs(junta): corpos das 3 cadeiras da junta de dinheiro do B-SAN3-20
10-24 16:25 docs(financeiro): relatório — bateria com a CI, critérios K1–K12 e limpeza (B-SAN3-20)
10-24 16:14 docs(financeiro): relatório da retomada — vermelho-controle e bateria (B-SAN3-20)
10-24 15:50 docs(registro): D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO, fecha P-Ω4-7-DUPLA-CONTAGEM com o limite, 9
10-24 15:50 fix(financeiro): CAS síncrono do cheque em memória, precedência do cheque_required, barreiras K
10-24 15:03 fix(financeiro): vincula cheque ao titulo (B-SAN3-20)
10-24 14:55 test(financeiro): registra baseline da retomada (B-SAN3-20)
10-24 14:51 docs(financeiro): vincula relatório ao PR (B-SAN3-20)
10-24 14:50 docs(financeiro): normaliza plano versionado (B-SAN3-20)
10-24 14:50 docs(financeiro): registra parada no baseline (B-SAN3-20)
src, prisma e tests iguais entre <merge-base>~1 e <merge-base>
```

Os três corpos das cadeiras existem no objeto (`<objeto>`) e, descontados o frontmatter e o preâmbulo Codex do espelho, são IDÊNTICOS entre `C:/Users/AMP/w-san320/.claude/agents/especialistas/` e `C:/Users/AMP/w-san320/.agents/agents/especialistas/` (comparação EOL-neutra, sem publicar hash de blob); o commit `<objeto>` tocou exclusivamente esses 6 arquivos; e o S0 (`scripts/sync-agent-agents.mjs --check`) está verde no objeto, medido por: `cd C:/Users/AMP/w-san320 && for c in c1-dinheiro c2-banco-migracao c3-regressao; do p1=C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-$c.md; p2=C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-$c.md; diff <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p1#C:/Users/AMP/w-san320/}" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | sed '/^$/d') <(git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p2#C:/Users/AMP/w-san320/}" | tr -d '\r' | awk 'f; $0=="---"{n++; if(n==2) f=1}' | awk 'index($0,"Papel para o Codex"){s=1} s&&$0==""{s=0; next} !s' | sed '/^$/d') >/dev/null && echo "IDENTICO corpo $c" || echo "DIVERGE corpo $c"; done; git show --format= --stat=200 a0f5aabca6b86aba21051baffd40c245b5ef1a05 | sed 's|^ |C:/Users/AMP/w-san320/|'; node scripts/sync-agent-agents.mjs --check`
```
IDENTICO corpo c1-dinheiro
IDENTICO corpo c2-banco-migracao
IDENTICO corpo c3-regressao
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md       |  88 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md |  89 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md      | 102 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md       |  82 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md |  83 +++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md      |  96 ++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++
C:/Users/AMP/w-san320/6 files changed, 540 insertions(+)
[agents-sync] OK — 79 agentes, espelho consistente.
```

A resposta do dono à Q1 (`A: só pela compensação (Recomendado)`) e a Emenda E1 estão apensadas ao plano no objeto (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md`), e a decisão `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` está gravada em `agent-orchestration/controle/decisoes.md` do objeto junto com `D-TOPO-E-O-CLAUDE` e `REGISTRO-SAN3-CONFLITOS`, medido por: `cd C:/Users/AMP/w-san320 && p=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md && git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | tr -d '\r' | grep -n -i -o -E 'Resposta literal do dono:.*A: só pela compensação \(Recomendado\)|^## Emenda E1 \(24/10, orquestrador\)'; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/decisoes.md | tr -d '\r' | grep -n -i -o -E 'D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO|D-TOPO-E-O-CLAUDE|REGISTRO-SAN3-CONFLITOS'`
```
518:Resposta literal do dono: ***"A: só pela compensação (Recomendado)
524:## Emenda E1 (24/10, orquestrador)
2316:REGISTRO-SAN3-CONFLITOS
2334:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3843:D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO
3863:REGISTRO-SAN3-CONFLITOS
```

Do merge-base (`origin/main`) ao objeto (`<objeto>`), o diff do bloco toca exatamente 37 arquivos (os 31 do bloco mais os 6 arquivos dos corpos das 3 cadeiras desta junta); nenhum caminho proibido do §3.2 (`Kpis/`, migrações anteriores, `tests/cheque-clear-bounce-atomic-db.test.ts`, `src/modules/financial-titles/financial-title.validators.ts`, `src/modules/financial-entries/financial-entry.repository.ts`, `src/modules/financial-entries/financial-entry-prisma.repository.ts`, `src/modules/cheques/cheque.controller.ts`, `src/modules/cheques/cheque.routes.ts`, `frontend/`, `mobile/`) foi alterado; e `RBAC_MATRIX.md` mudou apenas na linha 130 (`1 1` no numstat), medido por: `cd C:/Users/AMP/w-san320 && git diff --name-only 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 | wc -l; git diff --name-status 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 | sed -E 's#([0-9]{4})([0-9]{4})([0-9]{6})#\1-\2-\3#g' | awk '{print $1, "C:/Users/AMP/w-san320/" $2}'; git diff --name-only 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- Kpis tests/cheque-clear-bounce-atomic-db.test.ts src/modules/financial-titles/financial-title.validators.ts src/modules/financial-entries/financial-entry.repository.ts src/modules/financial-entries/financial-entry-prisma.repository.ts src/modules/cheques/cheque.controller.ts src/modules/cheques/cheque.routes.ts frontend mobile | wc -l; git diff --numstat 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- RBAC_MATRIX.md`
```
42
A C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c1-dinheiro.md
A C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c2-banco-migracao.md
A C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md
A C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c1-dinheiro.md
A C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c2-banco-migracao.md
A C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md
M C:/Users/AMP/w-san320/.github/workflows/ci.yml
M C:/Users/AMP/w-san320/API_CONTRACTS.md
M C:/Users/AMP/w-san320/RBAC_MATRIX.md
A C:/Users/AMP/w-san320/agent-orchestration/codex/comandos/B-SAN3-20-cheque-x-baixa.md
M C:/Users/AMP/w-san320/agent-orchestration/codex/log-execucao.md
M C:/Users/AMP/w-san320/agent-orchestration/controle/decisoes.md
M C:/Users/AMP/w-san320/agent-orchestration/controle/pendencias-indice.md
M C:/Users/AMP/w-san320/agent-orchestration/controle/pendencias.md
M C:/Users/AMP/w-san320/agent-orchestration/docs/status-geral.md
A C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r1.md
A C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-critica-r2.md
A C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md
A C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-plano.md
M C:/Users/AMP/w-san320/docs/revisoes/SAN3/PLANO_SAN3.md
A C:/Users/AMP/w-san320/prisma/migrations/2026-0881-000000_cheque_title_link/migration.sql
M C:/Users/AMP/w-san320/prisma/schema.prisma
M C:/Users/AMP/w-san320/src/modules/cheques/cheque-prisma.repository.ts
M C:/Users/AMP/w-san320/src/modules/cheques/cheque.dto.ts
M C:/Users/AMP/w-san320/src/modules/cheques/cheque.repository.ts
M C:/Users/AMP/w-san320/src/modules/cheques/cheque.service.ts
M C:/Users/AMP/w-san320/src/modules/cheques/cheque.types.ts
M C:/Users/AMP/w-san320/src/modules/cheques/cheque.validators.ts
M C:/Users/AMP/w-san320/src/modules/financial-entries/financial-entry-undo-owners.ts
M C:/Users/AMP/w-san320/src/modules/financial-entries/financial-entry.service.ts
M C:/Users/AMP/w-san320/src/modules/financial-titles/financial-title-prisma.repository.ts
M C:/Users/AMP/w-san320/src/modules/financial-titles/financial-title.repository.ts
M C:/Users/AMP/w-san320/src/modules/financial-titles/financial-title.service.ts
M C:/Users/AMP/w-san320/src/modules/financial-titles/financial-title.types.ts
M C:/Users/AMP/w-san320/src/modules/financial-uow/financial-uow.ts
A C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts
A C:/Users/AMP/w-san320/tests/cheque-title-link-migration-drill-db.test.ts
A C:/Users/AMP/w-san320/tests/cheque-title-link.test.ts
M C:/Users/AMP/w-san320/tests/financial-entry-undo-owners.test.ts
A C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts
M C:/Users/AMP/w-san320/tests/financial-uow-journal-classification.test.ts
A C:/Users/AMP/w-san320/tests/fixtures/prisma-migrate-diff-baseline.sql
0
1	1	RBAC_MATRIX.md
```

No `.github/workflows/ci.yml` do objeto, o bloco `SUITES` do job `backend-postgres` inclui as 3 suítes `-db` novas (`tests/cheque-title-link-atomic-db.test.ts (novo)`, `tests/financial-title-status-cas-db.test.ts (novo)`, `tests/cheque-title-link-migration-drill-db.test.ts (novo)`); em `API_CONTRACTS.md` estão os dois identificadores de contrato versionados do §5.5 (`financial_entry_undo@2026-10-21.b-san3-20` e `financial_title_mutation@2026-10-21.b-san3-20`); em `agent-orchestration/controle/pendencias.md`, `P-Ω4-7-DUPLA-CONTAGEM` está FECHADA, `P-Ω4-3-INVOICE-LEASTPRIV` segue ABERTA (sem diff contra o merge-base) e as 9 pendências `P-SAN3-20-*` estão abertas com dono; e em `docs/revisoes/SAN3/PLANO_SAN3.md` o item 22 está marcado fechado no merge do PR 456, medido por: `cd C:/Users/AMP/w-san320 && git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:.github/workflows/ci.yml | tr -d '\r' | grep -n -i -E 'cheque-title-link-atomic-db|financial-title-status-cas-db|cheque-title-link-migration-drill-db' | sed -E 's#tests/#C:/Users/AMP/w-san320/tests/#'; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:API_CONTRACTS.md | tr -d '\r' | grep -n -i -o -E 'financial_(entry_undo|title_mutation)@2026-10-21\.b-san3-20'; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/pendencias.md | tr -d '\r' | grep -n -i -A2 -E '^## P-(Ω4-7-DUPLA-CONTAGEM|Ω4-3-INVOICE-LEASTPRIV)' | grep -i -E '^## P-|status:'; for id in P-SAN3-20-DESVINCULAR-DEPOSITADO P-SAN3-20-DELETE-TITULO-COM-CHEQUE P-SAN3-20-RESUMO-CHEQUE-VINCULADO P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE P-SAN3-20-CHEQUE-FISICO-DUPLICADO P-SAN3-20-TELA-CHEQUES P-SAN3-20-ATALHO-PAY-CHEQUE-ID P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA P-SAN3-20-CHECK-STATUS-X-PAID; do echo "$id=$(git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:agent-orchestration/controle/pendencias.md | grep -c -i -- "$id")"; done; git show a0f5aabca6b86aba21051baffd40c245b5ef1a05:docs/revisoes/SAN3/PLANO_SAN3.md | tr -d '\r' | grep -n -i -E '22 \|.*B-SAN3-20'`
```
269:          SUITES="$SUITES C:/Users/AMP/w-san320/tests/cheque-title-link-atomic-db.test.ts"
270:          SUITES="$SUITES C:/Users/AMP/w-san320/tests/financial-title-status-cas-db.test.ts"
271:          SUITES="$SUITES C:/Users/AMP/w-san320/tests/cheque-title-link-migration-drill-db.test.ts"
477:financial_title_mutation@2026-10-21.b-san3-20
495:financial_entry_undo@2026-10-21.b-san3-20
P-SAN3-20-DESVINCULAR-DEPOSITADO=1
P-SAN3-20-DELETE-TITULO-COM-CHEQUE=1
P-SAN3-20-RESUMO-CHEQUE-VINCULADO=1
P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE=1
P-SAN3-20-CHEQUE-FISICO-DUPLICADO=2
P-SAN3-20-TELA-CHEQUES=1
P-SAN3-20-ATALHO-PAY-CHEQUE-ID=1
P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA=1
P-SAN3-20-CHECK-STATUS-X-PAID=1
140:| 22 | `P-Ω4-7-DUPLA-CONTAGEM` — nada impede baixar o título e compensar o cheque do mesmo dinheiro. **Conflito com `D-Ω4-7-NO-TITLE`** (registrado) — **FECHADO pelo `B-SAN3-20` no merge do PR #456** (`D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO`: cheque vinculado ao título, a compensação É a liquidação e a porta do título recusa `check`; limite: por linha de cheque, `P-SAN3-20-CHEQUE-FISICO-DUPLICADO`) | 4 | B1; `decisoes.md` (`D-Ω4-7-NO-TITLE`) | `B-SAN3-20` | ✓ |
```

Na tabela R5 do relatório do dev (`C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md`) há 33 linhas de mutação (`M1–M4`, `M6–M14`, `M16–M19`, `M20'`, `M21`, `M22`, `M25–M34`, `M36`, `M37`, com `M8` desdobrada em `M8-mem` e `M8-db`) mais o parágrafo de `M5` em base migrada própria (total: as 32 mutações planejadas no §4.1); em `frontend/src` e `mobile/flutter_app/lib` há zero ocorrências de `/cheques` ou `payment_method`, e o único chamador de `PATCH /financial-titles/:id/status` no frontend é `frontend/src/modules/finance/titles/financial-titles.service.ts` (usado por `C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/TitlesListView.tsx`), medido por: `cd C:/Users/AMP/w-san320 && p=C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md && git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | tr -d '\r' | grep -c -i -E '^\| M[0-9]'; git show "a0f5aabca6b86aba21051baffd40c245b5ef1a05:${p#C:/Users/AMP/w-san320/}" | tr -d '\r' | grep -n -i -o -E '\*\*M5\*\* \(FK de 1 coluna na migração'; git grep -c -i -E '/cheques|payment_method' a0f5aabca6b86aba21051baffd40c245b5ef1a05 -- frontend/src mobile/flutter_app/lib || echo "0 ocorrencias em frontend/mobile"; grep -n -i -E '/financial-titles/.*/status|changeTitleStatus' C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/financial-titles.service.ts C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/TitlesListView.tsx | sed -E 's#:([0-9]+):# (linha \1): #'`
```
33
100:**M5** (FK de 1 coluna na migração
0 ocorrencias em frontend/mobile
grep: C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/TitlesListView.tsx: No such file or directory
C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/financial-titles.service.ts (linha 69):   const response = await apiRequest<unknown>(`/financial-titles/${encodeURIComponent(titleId)}/status`, {
```

O modelo de mandato do §C7.7 do contrato (P1, P2, P4, P3, P7), verbatim no `CLAUDE.md` do objeto, medido por: `git -C C:/Users/AMP/w-san320 show a0f5aabca6b86aba21051baffd40c245b5ef1a05:CLAUDE.md | tr -d '\r' | sed -n '729,736p'`
```
   Após CADA item: apense a <cadeira>-evidencia.md → comando · saída resumida · veredito parcial.  [P1]
   Antes da mensagem final: escreva <cadeira>-voto.json. Mensagem final = 1 linha apontando o arquivo.  [P2]
   Máximo 3 itens; logs longos só no arquivo de evidência.  [P4]
   Se você substituir um caído: re-execute cada comando do <cadeira>-evidencia.md dele e compare, depois
   meça a cauda. Conclusão sem comando registrado NÃO é insumo.  [P3]
   Se receber PAUSA: termine o comando em curso, grave `## PAUSA <hora UTC>` em <cadeira>-evidencia.md
   (head · feito · falta · próximo comando · arquivos meio-escritos) e pare sozinho com 1 linha apontando
   o arquivo. Não inicie item novo.  [P7]
```

## HIPOTESE

Você é `jurado-san320-c3-argon`, identidade nova, executor Antigravity (`agy`), modelo `gemini-4-argon` (esforço medium, nível menor declarado, §C7.6). Você compartilha o modelo `gemini-4-argon` com o inspetor (`insp-san320-argon`, que não julga mérito) e com a fábrica/redator (`fab-red-san320-argon`, que não vota), mas tem **identidade distinta** — declare isso no voto para a ata. O seu corpo canônico é `C:/Users/AMP/w-san320/.claude/agents/especialistas/jurado-san320-c3-regressao.md` no blob do objeto `a0f5aabca6b86aba21051baffd40c245b5ef1a05` (idêntico ao espelho `C:/Users/AMP/w-san320/.agents/agents/especialistas/jurado-san320-c3-regressao.md`, medido acima), acumulando a competência de `agente-ci-doutor` e `validador-mestre`. Regra de esgotamento: se o Argon esgotar (limite, 429, fila parada), termine o comando em curso, grave `## PAUSA <hora UTC>` em `cadeira-c3-evidencia.md` (P7) e pare SEM emitir voto; o orquestrador lança um sucessor em Claude Opus (`model: "opus"` explícito, identidade nova), que re-executa os comandos registrados (P3) antes de medir a cauda; se o Claude Opus esgotar, **PARA** (§C7.6-bis). Na primeira linha de `cadeira-c3-evidencia.md`, declare executor efetivo, modelo, nível, objeto, `mandato_md5` deste arquivo (`tr -d '\r' < <mandato> | md5sum`) e o veredito EOL-neutro (`IDENTICO`/`DIVERGE`) do corpo carregado contra o blob do objeto. Confirme que o seu nome não coincide com nenhum inelegível (`planejador-san3-20-astra`, `planejador-san3-20-fable`, críticos r1/r2, `dev-san3-20`, `dev-san320-opus`, `fab-red-san320-argon`, `insp-san320-argon`, `jurado-san320-c1-opus`, `jurado-san320-c2-pro`, orquestrador). Tudo no plano v3, nas críticas r1/r2 e no relatório do dev é **A RE-VERIFICAR**, derruba com: `head -1 C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-evidencia.md | grep -i -E 'executor|gemini-4-argon|mandato_md5|IDENTICO|DIVERGE'`

Legalidade, régua e isolamento de terreno: só comece o mérito após ler `insp-san320-parecer.md` com `LIBERADO` ou `LIBERADO COM RESSALVA` e confirmar que o objeto continua sendo `a0f5aabca6b86aba21051baffd40c245b5ef1a05` com todos os check-runs concluídos. Régua: bloco de **DINHEIRO** — unanimidade de 3 cadeiras com poder de veto (§C7 item 8(1)), teto de 2 ciclos (item 8(2)), **ciclo 1** (qualquer achado `bloqueia` com escopo `dentro-do-bloco` reprova); todo achado declara `gravidade` (`bloqueia` | `ajuste` | `nota`), `escopo` (`dentro-do-bloco` | `pre-existente` com commit/data de origem e pendência com dono, §C7.1-ter(a)), `classe`, comando, saída e N/forma; todo voto declara `arquivos_medidos` (§C7 item 9(0), sem globs `**`); "não consigo medir" item seu = `REPROVADO`; não proponha correção (§C7.4-bis); não cobre KPI (`Kpis/**` está congelado, item 8(5)); não abra votos de outras cadeiras antes de fechar o seu. Terreno: crie worktree próprio `C:/Users/AMP/w-jsan320-c3` em `--detach a0f5aabca6b86aba21051baffd40c245b5ef1a05`, com `npm ci` próprio, `npm run db:generate` (Emenda E1) e zero junction de `node_modules` (§C7.1-ter(c)); se subir banco para suítes `-db`, use Postgres 16 descartável próprio `jsan320-c3-pg` em `127.0.0.1` numa porta alta livre (ex.: `55443`), respeitando o orçamento P8 (commit livre ≥ 4 GB, no máximo 2 trabalhos Docker simultâneos excluídos `erp-*`) e nunca tocando a base viva (`erp-postgres`/`erp-redis`, portas `5432`/`6379`); ao final, restaure qualquer mutação provando `git hash-object` igual ao blob do objeto, remova `jsan320-c3-pg` (se criado) e remova `C:/Users/AMP/w-jsan320-c3` com `git worktree remove --force`, derruba com: `grep -i -E 'w-jsan320-c3|arquivos_medidos|gravidade|escopo|teardown' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-voto.json`

Item 1 de 3 (bateria §4.6, check-runs concluídos no head, `SUITES`, orçamento de skip e H12 / Risco Residual 2 — §5.2 C3 item 1): meça que todos os check-runs do objeto `a0f5aabca6b86aba21051baffd40c245b5ef1a05` estão `completed` e `success` (14/14, incluindo `backend`, `backend-postgres` e `frontend`) e que `.github/workflows/ci.yml` inclui as **3 suítes `-db` novas** em `SUITES` sob o guard de zero skip; no seu worktree `C:/Users/AMP/w-jsan320-c3` (após `npm run db:generate` da Emenda E1), reexecute: (i) o passo 2 da bateria §4.6 (as 9 suítes de memória do bloco → 304/304 pass, `fail 0`, `skipped 0`, com `C:/Users/AMP/w-san320/tests/cheque-title-link.test.ts` 38/38 e `tests/financial-titles.test.ts` 64/64); (ii) as regressões de memória do financeiro (`tests/work-order-invoicing.test.ts`, `tests/financial-title-source.test.ts`, `tests/work-order-financials-routes.test.ts`, `tests/financial-summary.test.ts` → `fail 0`, `skipped 0`); (iii) os guardas do passo 7 (`npm run check`, `npm run lint`, `npm run build`, `node --check Kpis/app.js`, `git diff --check`, `node scripts/sync-agent-agents.mjs --check` → todos `ec=0`); (iv) **H12 e Risco Residual 2**: confirme por `git grep -i` e leitura de `tests/financial-titles.test.ts` (64/64) e `tests/financial-title-invariants-db.test.ts` (16/16) que `applyPayment` absoluto saiu de `FinancialTitleRepository`, dos dois repositórios, de `TITLE_REPO_KIND`, do delegador `journaledTitles` e de `tests/financial-uow-journal-classification.test.ts`, que `svc.applyPayment` usa o CAS incremental (`applyPaymentGuarded`) sem quebrar nenhum caso existente e que `T-K11e` prende a recusa de sobrescrita. Vermelho-controle: meça `M22` (`titleId` fora de `CHEQUE_FIELD_CLASS` → TS1360), `M32` (`svc.applyPayment` sobrescrevendo absoluto → `T-K11e` vermelho) e `M36` (`applyPayment` em `TITLE_REPO_KIND` sem o membro na interface → TS2353), com restauro por hash, derruba com: `grep -i -E 'Item 1|304|64/64|16/16|SUITES|H12|applyPayment|M22|M32|M36|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-evidencia.md`

Item 2 de 3 (diff × §3 PERMITIDO/PROIBIDO, 32 mutações + M5 com vermelho registrado e ampliação nominal — §5.2 C3 item 2): execute o laço completo sobre `git diff --name-status 7ab2fe71d0d40c2be51a790f0d20893651cdf972 a0f5aabca6b86aba21051baffd40c245b5ef1a05` e prove que todos os 37 caminhos pertencem ao **PERMITIDO** do §3.1 (mais os 6 arquivos dos corpos desta junta) e que o **PROIBIDO** do §3.2 está 100% intocado (`Kpis/**` intocado, migrações antigas intocadas, `tests/cheque-clear-bounce-atomic-db.test.ts` intocado — R1-08 —, `FINANCIAL_TITLE_STATUS_TRANSITIONS` e `STATUS_ALLOWLIST` em `src/modules/financial-titles/financial-title.validators.ts` intocados, `src/modules/financial-entries/financial-entry.repository.ts` e `src/modules/financial-entries/financial-entry-prisma.repository.ts` intocados com diff líquido zero contra o merge-base, `RBAC_MATRIX.md` alterado apenas na linha 130); avalie e ratifique no voto a ampliação nominal do §3.1 (`src/modules/financial-entries/financial-entry.service.ts`, `src/modules/financial-entries/financial-entry-undo-owners.ts`, `src/modules/financial-uow/financial-uow.ts`). Confira na seção R5 de `C:/Users/AMP/w-san320/docs/revisoes/SAN3/B-SAN3-20-dev.md` que todas as **32 mutações** planejadas (`M1–M14`, `M16–M19`, `M20′`, `M21`, `M22`, `M25–M34`, `M36`, `M37`, mais `M5` em base própria) têm vermelho registrado (`M8` declarada equivalente no `T-K2b` e morta no `T-K2d`; `M20` equivalente no plano e substituída por `M20′`; `M35` mandato da C2) e re-execute por amostragem própria no seu worktree pelo menos 6 mutações (`M1`, `M4`, `M12`, `M17`, `M22`, `M32`, `M36`), restaurando os hashes ao final. Vermelho-controle: prove que o seu verificador de escopo acusa um caminho proibido sintético e que cada mutação da amostragem falha antes do restauro, derruba com: `grep -i -E 'Item 2|PERMITIDO|PROIBIDO|Kpis|FINANCIAL_TITLE_STATUS_TRANSITIONS|RBAC_MATRIX|32|M1|M4|M8|M12|M17|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-evidencia.md`

Item 3 de 3 (registro operacional §5.5 e Riscos Residuais 6 e 8 — §5.2 C3 item 3): confira por diff contra `7ab2fe71d0d40c2be51a790f0d20893651cdf972`: (a) **Risco Residual 6 e `decisoes.md`**: `D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO` foi apensada **depois** da última entrada de `origin/main` (`7ab2fe71d0d40c2be51a790f0d20893651cdf972`, `D-SAN3-04B-PAINEL-PROPRIO`), sem reescrever entradas anteriores, contém a resposta literal do dono à Q1 (*"A: só pela compensação (Recomendado)"*), o que revê em `D-Ω4-7-NO-TITLE` e o que preserva, o limite de §2.2 (por linha de cheque), as regras D1′ e D8/P2 com ponteiro para §2.5, a nota §A7 sobre `D-MIGRACAO-COM-TRANSACAO-EXPLICITA`, e o apenso no item (2) de `REGISTRO-SAN3-CONFLITOS`; (b) **`pendencias.md` e `pendencias-indice.md`**: `P-Ω4-7-DUPLA-CONTAGEM` passada a FECHADA com evidência e com o limite declarado, **`P-Ω4-3-INVOICE-LEASTPRIV` intocada e ABERTA** (o erro do parcial do Codex foi desfeito na retomada), todas as **9 pendências novas** do §5.5 (`P-SAN3-20-DESVINCULAR-DEPOSITADO`, `P-SAN3-20-DELETE-TITULO-COM-CHEQUE`, `P-SAN3-20-RESUMO-CHEQUE-VINCULADO`, `P-SAN3-20-LEGADO-CHECK-SEM-CHEQUE`, `P-SAN3-20-CHEQUE-FISICO-DUPLICADO`, `P-SAN3-20-TELA-CHEQUES`, `P-SAN3-20-ATALHO-PAY-CHEQUE-ID`, `P-SAN3-20-DRIFT-MIGRACOES-X-SCHEMA`, `P-SAN3-20-CHECK-STATUS-X-PAID`) abertas com dono, e `python agent-orchestration/controle/gerar-indice-pendencias.py` com diff zero; (c) **`API_CONTRACTS.md` e rastreabilidade**: contratos `financial_entry_undo@2026-10-21.b-san3-20` e `financial_title_mutation@2026-10-21.b-san3-20`, item 22 fechado em `docs/revisoes/SAN3/PLANO_SAN3.md`, e registro em `C:/Users/AMP/w-san320/agent-orchestration/codex/comandos/B-SAN3-20-cheque-x-baixa.md`, `agent-orchestration/docs/status-geral.md` e `agent-orchestration/codex/log-execucao.md` (nomeando o planejador, os dois críticos r1/r2 e os dois devs); (d) **Risco Residual 8**: confirme em `frontend/src/modules/finance/titles/financial-titles.service.ts` e `C:/Users/AMP/w-san320/frontend/src/modules/finance/titles/TitlesListView.tsx` que um `409 title_status_conflict` de `PATCH /financial-titles/:id/status` é tratado via `ApiError.safeMessage` sem quebrar a tela. Vermelho-controle: prove que o seu verificador de registro acusa se uma das 9 pendências `P-SAN3-20-*` ou um dos 2 contratos for omitido, derruba com: `grep -i -E 'Item 3|D-SAN3-20-CHEQUE-SO-PELA-COMPENSACAO|P-Ω4-7-DUPLA-CONTAGEM|P-Ω4-3-INVOICE-LEASTPRIV|P-SAN3-20-CHECK-STATUS-X-PAID|financial_title_mutation|TitlesListView|vermelho' C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-evidencia.md`

Protocolo P1/P2/P3/P4/P7 do §C7.7, verbatim no bloco colado acima, com `<cadeira>` = `cadeira-c3`: apense a `cadeira-c3-evidencia.md` após CADA item; `cadeira-c3-voto.json` nasce esqueleto com os 3 itens EM APURAÇÃO e o campo `arquivos_medidos`, e fecha antes da mensagem final de 1 linha; únicos arquivos escritos por você no repositório: `cadeira-c3-evidencia.md` e `cadeira-c3-voto.json` em `C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/`; nunca edite código fora do seu worktree descartável e nunca faça commit, derruba com: `test -f C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/cadeira-c3-voto.json`

## MEDIDO

Pré-voo deste mandato executado com `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh` e `C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh` (copiados sem alteração de `C:/Users/AMP/erp-pausa-2026-10-03/redator-trc02-c2/`), pelo redator `fab-red-san320-argon` (Antigravity, Gemini 4 Argon, nível menor declarado), medido por: `cd C:/Users/AMP/w-san320 && MANDATO_REFS=C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-refs.sh bash C:/Users/AMP/erp-pausa-2026-10-03/redator-san320/mandato-preflight.sh C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c3.md 456 2>&1; echo ec=${PIPESTATUS[0]}`
```
COLAGEM    l.6-20: refs do PR #456 confere com a saida atual

PRE-VOO OK — C:/Users/AMP/w-san320/agent-orchestration/omega/juntas/votos/B-SAN3-20/00-mandatos/cadeira-c3.md
ec=0
```
