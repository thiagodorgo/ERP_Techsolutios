# porteiro-pos-merge-440 — evidência incremental (P1)

Papel: porteiro-pos-merge · modelo: Opus (nível menor, declarado; frontmatter `model: opus`) · identidade nova `porteiro-pos-merge-440`.
Ref medida: `40c3651f066278654e2c71df4c3b38e1d90994c8` (origin/main). Itens EM APURAÇÃO até gravados.

## Item 1 — merge íntegro
- `git log origin/main -3` → topo `40c3651f ... (#440)`, pai `a26f8afe (#444)`, `c260d362 (#443)`.
- `gh pr view 440 --json state,mergeCommit,headRefOid,mergedAt` → MERGED · mergeCommit 40c3651f · head a8977a0f · 2026-10-18T20:52:42Z.
- Veredito parcial: merge existe e bate. OK.

## Item 2 — promessa × diff
- `git diff --stat c260d362 40c3651f` → 72 arquivos; inclui o #444 (a26f8afe: AGENTS.md, CLAUDE.md, decisoes.md). Diff próprio do #440 = `git diff --name-status a26f8afe 40c3651f` → 69 arquivos (código: 13 src, 12 tests, 1 migration; resto atas/votos/especialistas/plano/dev).
- Trava única: `git grep assertTechnicianChangeAllowed 40c3651f -- src` → definida em work-order.service.ts:1759; chamada em assign (web+lote) :1714, assignFromDispatch :1825, field-dispatch.service.ts :264 (create), :571 (changeStatus/ativação), :657 (reassign). Confere.
- Ativar rascunho 403: field-dispatch.service.ts:954-963 `assertMayActivateDraft` exige `field_dispatch:create`. Confere.
- OS encerrada 409: field-dispatch.service.ts:968 `assertWorkOrderNotTerminal`; work-order.service.ts assignFromDispatch 409 terminal. Confere.
- Evidência `rejected not_found`: mobile-evidence-sync.ts:276. Confere. Reatribuir à mesma pessoa = no-op: work-order.service.ts:1763 (alvo igual → passa). Confere.
- Atomicidade: comentário work-order.service.ts:~1795 + `event` levado ao repositório (assign). Medida pela C2 da junta no Postgres; não remedida aqui além da suíte -db (ver item 3).
- Migration `prisma/migrations/20260877000000_backfill_.../migration.sql`: só UPDATE/INSERT + RAISE NOTICE; DELETE apenas em comentário de rollback (l.30-35). Não destrutiva. Autorização nominal: decisoes.md:3664 (P6 de D-07CB-EMENDA-RECOMENDACOES). Confere.
- Docs citados no corpo existem na ref (emenda, crítica, plano ciclo 2).
- Arquivos não citados no corpo (mobile-backend-contracts.test.ts, o6r07c-census-guard.test.ts, helpers/o6r07c-census.ts, fixtures/o6r07c-classificacao-vias.json) constam do plano ciclo 2 (grep 4-7 ocorrências cada). Sem escopo crescido em silêncio.
- Veredito parcial: promessa × diff confere.

## Item 3 — contagens reexecutadas (EM APURAÇÃO)
- `git worktree add --detach C:/Users/AMP/w-porteiro440 40c3651f` → HEAD 40c3651f. OK.
- `npm ci` (2 tentativas) → exit 134, `FATAL ERROR ... JavaScript heap out of memory` com heap de ~80 MB ("external memory pressure"). Medido: Win32_OperatingSystem FreePhysMB=4266, **FreeVirtualMemory=386 MB** (commit da máquina esgotado; vmmemWSL 4,2 GB). Ambiente, não código. Nova tentativa adiante.

## Item 3-bis — KPI congelado
- `git diff a26f8afe 40c3651f -- Kpis/ | wc -l` → 0. `Kpis/*` intocado no merge. Veredito: confere (não se cobra KPI, D-GOV-PROPORCIONAL 8(5)).

## Item 4 — pendências (na ref 40c3651f)
- `git show 40c3651f:agent-orchestration/controle/pendencias.md | grep ...`:
  - `P-07CB1-CANCELAR-EM-NO-LOCAL` (l.11180) ABERTA, dono B-O6R-07c-b2. Registrada.
  - `P-07CB1-ATRIBUICAO-WEB-COM-DESPACHO-ATIVO` (l.11174) ABERTA, dono B-O6R-07c-b2 (ou B-TECNICO-ESCOPO-a). Registrada.
  - **K2 após reinício (`P-07CB1-K2-CONCLUSAO-APOS-REINICIO`, plano §2.5) e CA6/CA7: NÃO estão em pendencias.md** (grep "reinício|CA6|CA7|K2-CONCLUSAO" → só l.9708, de outro bloco). A ata do ciclo 2 (l.45-49) diz "já registradas" para as 4 — **falso para 2 delas**; a própria ata, em C3c2-A2 (l.37), diz o contrário. Inconsistência de registro.
  - C3c2-A2: `P-07CB1-RESIDUAL-BACKFILL` e as 6 notas pré-existentes da §1.5 (technician sem field_dispatch:update; evidence_tenant_mismatch; "usar a do servidor"; evidência field_* com OS alheia; idempotência da vistoria sem ator; work_order.mileage) **ausentes** em pendencias.md. Mais K2 = 8. Confere a contagem do ajuste. Dono: orquestrador, PR de registro.
  - Registro do §2.11 do plano também faltando: `omega/reprovacoes/R-B-O6R-07c-b1-1.md` não existe na ref (`git ls-tree` reprovacoes → só R-B-O6R-07c-a-1.md).
  - `P-O6R-07CB-EMENDA-DECISOES` (l.11082) e `P-O6R-SUBRECURSO-OBJECT-SCOPE` (l.6714) continuam ABERTA no papel, com "bloqueia: fechamento do Ω6R-SEC-002".
- Amostragem de "fechada": `P-CONFLITO-INICIO-ATENDIMENTO` (l.11143, "FECHA com o merge do #440, trava no estado escolhido = No local"). Código: field-dispatch.service.ts:81 `DISPATCH_SERVICE_STARTED = {arrived,in_service}` (sem on_route); work-order.types.ts:445 `WORK_ORDER_SERVICE_STARTED`; resolver ligado na composição work-order.service.ts:2205-2208. Verdade.
- Bloqueio do próximo alvo (merge do B-TRC-01 #426 e PR de registro): bloqueantes de B-TRC-01 em pendencias.md (P-TRC-FORMA-QUATRO-OU-SETE, P-TRC-AWS-FLY-PRAZO, P-TRC-CONVIVENCIA-APP, P-TRC-PLANO-V22) todas FECHADA; P-TRC-VINCULO-POSSE/LGPD/AWS-ESTUDO declaram "não bloqueia o B-TRC-01". Nenhuma das pendências do #440 cita B-TRC ou o PR de registro em "bloqueia".
- Veredito parcial: nada BLOQUEIA o próximo alvo; dívida de registro (8 pendências + R-…-1.md + ata "já registradas" incorreta) viaja para o PR de registro.

## Item 3 — contagens reexecutadas (worktree detached C:/Users/AMP/w-porteiro440 @ 40c3651f, npm ci próprio)
- `npm ci` (3ª tentativa, FreeVirtMB=4404) → exit 0, 326 pacotes. `DATABASE_URL=postgresql://x:x@127.0.0.1:1/x npx prisma generate` → 0 (sem DATABASE_URL o config do prisma falha — P-AGENTE-CHECK-SEM-GENERATE, já registrada).
- `npm run check` → exit 0 (tsc --noEmit limpo).
- `REDIS_URL=redis://127.0.0.1:1 node --test --import tsx` nos 3 arquivos juntos → 246 testes, 244 pass, 2 fail: ambas em san3-05 (subteste 33 + pai T13), `FATAL ERROR ... heap out of memory` no processo-filho do gerador (~650 MB, commit da máquina pressionado). Re-rodado só o san3-05: 33/35, falha agora no subteste 34, também OOM — a falha migra de subteste = ambiente.
- `node --test --test-concurrency=1 ... san3-05-acessos-de-plataforma-guard.test.ts` → **35/35 pass, 0 OOM**.
- `o6r07c-b-scope.test.ts` sozinho → **187/187** (bate com o corpo do PR). `o6r07c-subresource-scope.test.ts` → **24/24**. Soma 187+24+35 = 246 = total da rodada conjunta.
- CI no head a8977a0f: `gh api .../commits/a8977a0f/check-runs` → 14 runs, todos completed/success (backend, backend-postgres, frontend, flutter, docker, owner-portal, authority-portal ×2). Confere "CI 14/14". Os 3565/3563 do job backend NÃO foram reexecutados aqui (suíte inteira não rodada — pressão de memória).
- Veredito parcial: números declarados que reexecutei reproduzem (187/187; check limpo). Falhas observadas são OOM de ambiente, desaparecem com concorrência 1.
- Suíte -db: Docker antes = 1 trabalho não-erp (`jtrc01c3-a-*`), eu = 2º. `docker run --name porteiro440-pg postgres:16 -p 127.0.0.1:55440` → `prisma migrate deploy` "All migrations have been successfully applied" (inclui 20260877000000_backfill) → `node --test --test-concurrency=1 tests/o6r07c-b-scope-db.test.ts` → **13/13 pass, 0 skip** (bate com "13 casos"). `docker rm -f porteiro440-pg` → removido (contagem 0). Base viva erp-* não tocada.

## Item 5 — Ω6R-SEC-002 no papel (ref 40c3651f)
- `git show 40c3651f:docs/revisoes/O6R/achados.jsonl` (parse) → 17 P0; 16 `fechado`; **`Ω6R-SEC-002` (linha 9) `status: parcialmente_superado`**, sem `fechado_por`/`fechado_em`. O registro de P0 da main NÃO permite dizer P0 = 0.
- Critério de fechamento (CE-2, `docs/revisoes/SAN3/PLANO_SAN3.md:325`; `pendencias.md:6802`): escopo provado por censo gerado + 403 com vermelho-controle + guard vermelho para rota nova. Reexecutado: `node --test --test-concurrency=1 tests/o6r07c-census-guard.test.ts` → 2 rodadas com OOM de ambiente (32/19/13 e 16/14/2); na 2ª, **T0–T11, T13 e T14 pass** (T11 "entradas ·07c-b = lista literal, vazia desde o 07c-b1"; T14 "gerado == instantâneo"); T12 e "tempo do censo" falharam por `Fatal process out of memory` (4 ocorrências). CI no head verde. O critério de código se sustenta onde a máquina deixou medir.
- Papel ainda aberto, a fechar por APPEND no PR de registro:
  1. `docs/revisoes/O6R/achados.jsonl:9` → `status: fechado`, `fechado_por: B-O6R-07c-b1 (PR #440, 40c3651f)`, `fechado_em`, `evidencia_fechamento` (ata J-B-O6R-07c-b1-ciclo2).
  2. `pendencias.md:6714` `P-O6R-SUBRECURSO-OBJECT-SCOPE` (status l.6766: "ABERTA — PARCIAL ... o resíduo é do B-O6R-07c-b") → FECHADA pelo #440.
  3. `pendencias.md:3100/3156` `P-O6R-B07` (ABERTA PARCIAL; residual SEC-002) → residual do SEC-002 fechado; segue aberta só pelo residual do SEC-004 (`P-O6R-B07B-SCANNER-AV-REAL`).
  4. `pendencias.md:11078` `P-O6R-07CB-EMENDA-DECISOES` (ABERTA; "bloqueia o fechamento do último P0") → FECHADA (emenda aprovada, D-07CB-EMENDA-RECOMENDACOES; testes do 07c-b1).
  5. `pendencias.md:11143` `P-CONFLITO-INICIO-ATENDIMENTO` ("FECHA com o merge do #440") → marcar FECHADA.
  6. `Kpis/kpis-latest.json:134-136` (`p0_abertos: 1`) — KPI congelado: fica para o marco do loop de KPI (não é cobrança deste PR).
- Veredito parcial: código fecha o SEC-002 (junta + minha reexecução parcial); o papel não — 5 registros a mudar + KPI no marco.

## Item 5-bis — ata e objeto julgado × objeto mergeado
- Atas na ref: `J-B-O6R-07c-b1-ciclo1.md` (REPROVADO 1×2) e `J-B-O6R-07c-b1-ciclo2.md` (APROVADO 3×0). `c1/c2/c3-voto.json` → `voto: APROVADO` ×3, objeto 7ff1e003. Inspetor `insp-07cb1c2-parecer.md` → **LIBERADO**. Confere.
- `git diff --name-status 7ff1e003 a8977a0f` → 17 arquivos, só AGENTS.md, CLAUDE.md, decisoes.md (via merge da main/#444) e a ata+votos do ciclo 2; **zero src/tests/prisma**. `git rev-parse a8977a0f^{tree}` = `40c3651f^{tree}` = 6c5b3ebd. O que mergeou é o que foi julgado (+ registro).

## Item 6 — limpeza §C5 (só reporte)
- `git ls-remote --heads origin fix/o6r07cb1-despacho-atribui` → **1 (branch remota do PR #440 MERGED NÃO apagada)**.
- Branch local `fix/o6r07cb1-despacho-atribui` existe, presa ao worktree `C:/Users/AMP/w-07cb1` (do orquestrador; não toquei). Demais locais: chore/agente-api-2 (#419 OPEN), docs/planos-api-2026-10-11 (sem PR), feat/traccar-b-trc-01 (#426 OPEN), fix/dash-perfil (sem remota, sem PR).
- `git status --porcelain | grep '^ D'` → vazio na árvore principal e no w-07cb1. w-07cb1 tem 55 ` M` que somem com `diff --ignore-cr-at-eol` (fantasmas autocrlf) + o meu arquivo de evidência untracked.
- Worktrees vivos: w-07cb1, w-agapi2, w-dash, w-j07cb1c2-c2 (detached 7ff1e003, sobra de jurado do ciclo 2 — a ata diz "worktrees removidos"), w-jc3-a, w-planos, w-trc01.
- Disco: `df -h /c` → 27 GB livres (>10 GB; DEEP_CLEAN não necessário).
- Containers: só erp-* e jtrc01c3-a-*; o meu porteiro440-pg removido.
- Veredito parcial: limpeza pós-merge INCOMPLETA (branch remota + worktree w-j07cb1c2-c2 remanescente).

## Teardown do porteiro
- `git worktree remove --force C:/Users/AMP/w-porteiro440` → 0; diretório inexistente; container porteiro440-pg removido; logs próprios do scratchpad apagados. Nada rastreado tocado; sem commit, sem push.
