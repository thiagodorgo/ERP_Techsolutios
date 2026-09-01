# Parecer do porteiro-pos-merge — PR #366 (SAN2-4b, squash `df496d2`)

> Instância nova, nascida do merge do #366 e morta ao fim deste parecer. Modelo: Fable
> (D-PORTEIRO-POS-MERGE). Worktree `san2-r` na `main` = `df496d2` (conferido). Data: 2026-08-31.
> Método: cada item nasceu `EM APURAÇÃO` e só mudou com a medição executada. `erp-postgres`/`erp-redis`
> não receberam NENHUM comando (nem leitura); toda medição foi git/arquivo/teste-sem-banco.

## 1. Integridade do merge

- [1.1] **OK.** `git log origin/main -3` → topo `df496d2` (SAN2-4b #366). `gh pr view 366` → `MERGED`,
  `mergeCommit df496d22659ead321e5050176c604ea0913e541d`, mergedAt 2026-08-31T22:58:08Z, branch
  `fix/san2-4b-corrigir-arnes`. O worktree está exatamente nesse commit.

## A. Promessa × diff real (o bloco toca produto: 1 arquivo em `src/`, 4 em `tests/`)

- [A.1] **OK.** `src/modules/authority/authority-password.ts:92-93` — `parseStored` valida
  `hash.length !== AUTHORITY_SCRYPT_PARAMS.keylen → undefined` e devolve `keylen: AUTHORITY_SCRYPT_PARAMS.keylen`
  (constante do sistema, não mais o `hash.length` do stored recebido). Round-trip canônico + pino, as duas
  validações presentes.
- [A.2] **OK.** `tests/authority-portal.test.ts` — 14 `test(` contados no arquivo (12 + os 2 guards novos
  em :214 canonicidade e :242 pino do keylen). O tamper troca o 1º char do payload (`:170`) com 4
  asserções pinando que morde (:175-178: mesmo comprimento, canônico, 32 bytes, bytes diferem).
- [A.3] **OK.** `tests/helpers/auth-identity-fixture.ts:123` — `"rls_test"` é a 6ª família de
  `SWEPT_ROLE_FAMILIES`; `:163` — `sweepOrphanEphemeralRoles` EXPORTADA; e o criador
  `tests/rls-tenant-isolation.test.ts:41-42` a invoca DENTRO de `withRoleCatalogLock`, antes do CREATE.
  As duas portas fecharam juntas, como prometido.
- [A.4] **OK.** `tests/rls-tenant-isolation.test.ts:3171` — o teardown (finally) usa
  `dropEphemeralRoleResilient(adminClient, roleName)` no lugar da forma crua.
- [A.5] **OK.** `git show df496d2 --name-only` filtrado por `.github/` e contrato/contract → vazio.
- [A.6] **OK.** 34 arquivos no stat; todos mapeiam ao declarado: 1 `src/` + 4 `tests/` (C1–C4), 3 `Kpis/`
  (C6), 26 `agent-orchestration/` (plano, briefing, ata, votos, pendências, status-geral, apenso ao plano
  do ciclo 5 e errata ao SAN2-2-plano — os dois últimos são a correção C3-A1 e o fechamento de
  `P-SAN2-2-PORTA-55432-RESERVADA`, ambos ditos no corpo/KPI). Sem escopo crescendo em silêncio.
  Achado BAIXO de relato, sem efeito de gate: o corpo do PR diz que as 3 pendências novas abrem com
  severidade "a classificar", mas o registro final carimba MÉDIA/BAIXA/MÉDIA — o próprio registro explica
  a tradução (`observa`/`bloqueia:false` é a escala da junta; a severidade foi classificada no registro,
  com critério citado). Divergência de relato, não de verdade.

## B. Contagens reexecutadas + KPI

- [B.1] **OK — REEXECUTADO.** `node --test --import tsx tests/authority-portal.test.ts` →
  `# tests 14 · pass 14 · fail 0 · skipped 0` (2,6 s).
- [B.2] **OK — REEXECUTADO.** `tests/agents-mirror-guard.test.ts` → 12/12, fail 0.
- [B.3] **OK — REEXECUTADO.** `tests/kpi-dashboard-charts.test.ts` → 16/16, fail 0.
- [B.4] **OK — REEXECUTADO.** `npm run check` (tsc --noEmit) → ec=0.
- [B.5] **OK — REEXECUTADO.** `node scripts/sync-agent-agents.mjs --check` → "OK — 23 agentes, espelho
  consistente", ec=0.
- [B.6] **OK — REEXECUTADO.** `node scripts/kpi-freeze.mjs --check` → "em dia (snapshot 2026-08-31)", ec=0.
- [B.7] **OK — REEXECUTADO.** `node --check Kpis/app.js` → ec=0.
- [B.8] **OK.** `Kpis/kpis-latest.json` versão SAN2-4b, `backend_tests` **2609/2611** com nota "Execucao
  real DESTE PR, N=1 rodada completa, forma canonica 3" e o delta +2 explicado pelos 2 guards (12→14 —
  que eu mesmo reproduzi no B.1). `blocks_completed` **155** com a condição literal "sobe para 156 SO
  QUANDO ESTE BLOCO MERGEAR" na entrada do history. 1 entrada SAN2-4b no history (149 no total);
  `pr`/`merge_commit`/`approved_head` null na autoria — permitido pela §C3.5, vira a dívida do B.10.
- [B.9] **OK.** Backfill do #365 preservado na entrada SAN2-4a do history: pr 365, merge_commit
  `45c3b97`, approved_head `4199b92` (head julgado da ata J-SAN2-4a), com a nota de honestidade sobre o
  C3-A1 do 4a. `mvp_demo` 99% / `mvp_vendavel` 88% intocados.
- [B.10] **DÍVIDA DUPLA NOMEADA para o PR do ciclo 5:** (1) backfill §C3.5 do #366 — pr 366,
  merge_commit `df496d2`, approved_head = **`2d2d16d`**, o head julgado LIDO na ata `J-SAN2-4b.md` l.6
  (NÃO o headRefOid `6b284f4` do GitHub: medi `git diff --name-only 2d2d16d 6b284f4` = 17 arquivos,
  TODOS em `agent-orchestration/`, zero em `Kpis/`, `src/`, `tests/` — registro pós-voto puro, mesma
  lógica dos backfills #362–#365); e (2) `blocks_completed` **155 → 156**, condição escrita pela própria
  entrada.
- [B.11] **NÃO REEXECUTEI, declarado:** a suíte backend completa (2609/2611 — exige cluster Postgres
  descartável; a base viva é intocável e não subo cluster para gate barato), o smoke do frontend
  (1126/1126, carregado §C3.3 — diff vazio em `frontend/`), a suíte Flutter (864/864, idem `mobile/`) e a
  bateria focada de contratos (34/34). O que o PR exerceu de novo (o único arquivo que mudou de
  denominador) eu reexecutei: 14/14.

## C. Próximo start (ciclo 5 do B-O6R-02, teto do §C7.4) e limpeza

- [C.1] **NENHUMA pendência bloqueante aberta alcança o ciclo 5.** Régua estruturada aplicada:
  15 campos `**Bloqueia…:**` no `pendencias.md` (regex larga, pegando também `**Bloqueia (todos os
  seis):**`, que a régua estreita perdia). 2 negados (B12 "nada"; ARNES-ISOLAMENTO "nada diretamente");
  2 em pendências FECHADAS (P-O6R-B01 fechada 2026-08-18; P-O6R-B05 fechada #353). Restam **8 pendências
  abertas** com campo não-negado (B02, B03, B04, B06, B07 com 2 campos, B08, B09, B10, B11) — todas
  bloqueiam FEATURE NOVA nos seus domínios. O ciclo 5 do B-O6R-02 é o bloco de CORREÇÃO da própria
  P-O6R-B02 (`fix/financial-uow`), não feature nova em financeiro; e a dependência declarada dele
  ("depende do B01") está satisfeita — P-O6R-B01 FECHADA. Start não negado por pendência.
- [C.2] **OK.** `P-REG-BATERIA-BARATA-DUAS-LISTAS` FECHADA em 2026-08-31 pelo SAN2-4b (l.4234, com a
  errata como condição de fechamento). E a receita que o ciclo 5 consome chegou ao merge: o apenso
  2026-08-31 ao `B-O6R-02-ciclo5-plano.md` fixa o critério do D29 como a LISTA NOMEADA dos 6 arquivos
  (audit-security · auth-identity-backfill-db · auth-identity-links-db · rls-tenant-isolation ·
  vehicle-identity-schema · impound-process-checklist-link-schema), declarando o par `(6, 37)` como
  necessário e INSUFICIENTE — exatamente o que a junta do 4a provou com as três listas.
- [C.3] **OK.** `J-SAN2-4b.md` existe no merge: APROVADO 3×0, UNANIMIDADE de 3 (quórum correto — primeiro
  bloco da rodada que toca produto, classe segurança + perda de dado, §C7.1-ter b), head julgado
  `2d2d16d`, CI 7/7 (run 33435953434), terreno LIBERADO COM RESSALVA. Veredito bate com o merge.
- [C.4] **OK.** As 3 pendências novas existem, datadas 2026-08-31, com status/severidade/dono:
  `P-KPI-RECENT-CONGELADO` (MÉDIA, dono SAN2-5), `P-AUTHORITY-N-NAO-CANONICO-NO-STORED` (BAIXA, dono
  "a atribuir" com candidato nomeado — o próximo bloco autorizado a tocar o arquivo; aceito pelo
  precedente da irmã intermitente, e é BAIXA), `P-ARNES-SWEEP-DEPENDE-DA-DISCIPLINA-DO-OPERADOR`
  (MÉDIA, dono = junta de `P-ARNES-RLS-TEST-FORA-DO-SWEEP`). Confirmei também o FATO por trás da
  primeira: `recent.as_of = 2026-08-28` e PR-topo 359 no `kpis-latest.json` do merge — o painel exibe
  estado 3 PRs atrás; a pendência é real, não derrubada.
- [C.5] **Amostragem de FECHADA conferida no código e por execução:**
  `P-ARNES-AUTHORITY-PORTAL-INTERMITENTE` (l.4008, FECHADA 2026-08-31). A causa 1/256 não existe mais
  (keylen pinado em `authority-password.ts:92-93`; tamper adultera DADO em `authority-portal.test.ts:170`)
  e o arquivo rodou 14/14 na minha máquina. "RESOLVIDA" é verdade.
- [C.6] **OK — C3-A1 chegou ao merge.** O apenso ao plano do ciclo 5 termina com linha em branco antes de
  "Re-execuções obrigatórias" (visto no diff do `df496d2`): a norma alheia renderiza FORA do blockquote
  do SAN2-4b. (A correção entrou no pós-voto — está no delta `2d2d16d..6b284f4`, como a ata manda:
  "Pós-voto trata C3-A1".)
- [C.7] **OK — C3-A2 aplicada.** A emenda em `pendencias.md:4849-4865` corrige a origem do ratchet para
  `0a39824`, 2026-08-19, `B-O6R-01` (#357), com os três comandos git RE-EXECUTADOS transcritos
  (`--diff-filter=A`, `-S FROZEN_ALLOWLIST`, log com 3 commits) — a classificação `pre-existente` fica
  mais forte (12 dias antes da branch, não 3).
- [C.8] **OK — limpeza §C5 conferida.** `docker ps -a` → SOMENTE `erp-postgres` e `erp-redis`, ambos
  `Up 2 days (healthy)` — zero containers de jurado/bloco (o par `san2-4b-*` foi derrubado). Branch
  remota `fix/san2-4b-corrigir-arnes` apagada (`git ls-remote` → 0). Zero branches locais mergeadas além
  da `main`. 4 worktrees (`git worktree list`: raiz demo/investidor do dono, agent-…-b02, gov-descuido,
  san2-r). Disco: 18 GB livres (df: 220/238 G) — acima do piso de ~10 GB; DEEP_CLEAN não exigido agora,
  mas é o próximo da fila quando cair.
- [C.9] **OK.** `git status --porcelain | grep '^ D'` → 0 arquivo rastreado apagado. Único untracked no
  worktree: este parecer.
- [C.10] **OK — incidente de terreno consignado** na ata (l.72-80): as três cadeiras no mesmo worktree,
  com a C2 mandatada a mutar; dano medido nenhum (C2 restaurou, C1 tinha sha256 conferido, C3 mediu dos
  blobs). Regra que fica, e que EU repasso como condição de terreno da junta do ciclo 5: **cadeira com
  mandato de mutação recebe worktree próprio, e isso é item do briefing** — o inspetor-de-terreno do
  ciclo 5 confere ANTES do voto (§C7.1-bis).

## Execuções (resumo dos comandos com resultado)

| Comando | Resultado |
|---|---|
| `git fetch` + `git log origin/main -3` | topo `df496d2` (#366) |
| `gh pr view 366 --json state,mergeCommit,…` | MERGED · `df496d2…` · 2026-08-31T22:58:08Z |
| `git show --stat df496d2` | 34 arquivos, +6045/−91 |
| `git show df496d2 --name-only` filtrado `.github/`+contratos | vazio |
| `node --test … tests/authority-portal.test.ts` | **14/14**, fail 0 |
| `node --test … tests/agents-mirror-guard.test.ts` | 12/12 |
| `node --test … tests/kpi-dashboard-charts.test.ts` | 16/16 |
| `npm run check` | ec=0 |
| `node scripts/sync-agent-agents.mjs --check` | OK, 23 agentes |
| `node scripts/kpi-freeze.mjs --check` | em dia (2026-08-31) |
| `node --check Kpis/app.js` | ec=0 |
| leitura estruturada dos 2 JSON de KPI | 2609/2611 real · 155 + condição do 156 · backfill #365 ok · mvp intocados |
| `git diff --name-only 2d2d16d 6b284f4` | 17 arquivos, 100% `agent-orchestration/` |
| régua `**Bloqueia…:**` (15 campos, script sobre o arquivo) | 8 abertas não-negadas; nenhuma alcança o ciclo 5 |
| `docker ps -a` · `git worktree list` · `df -h /c` | só `erp-*` Up 2d (healthy) · 4 worktrees · 18 GB livres |

## O próximo bloco pode começar?

Sim. O merge é íntegro; as quatro correções prometidas existem no código mergeado e o único arquivo que
mudou de denominador reproduz na minha máquina (14/14); o KPI é de execução real com a condição do 156
escrita; a ata é unânime com o quórum certo e head julgado nomeado; nenhuma pendência com campo
`**Bloqueia:**` aberto e não-negado alcança o ciclo 5; e os dois insumos que o ciclo 5 consome — a lista
NOMEADA dos 6 arquivos do D29 e o plano com a norma fora do blockquote — chegaram ao merge. A dívida que
viaja é a de sempre (o backfill, agora dupla) mais a regra de terreno do incidente.

## Parecer final

LIBERADO COM RESSALVA: ciclo 5 do B-O6R-02 (financeiro — teto do §C7.4, plano `B-O6R-02-ciclo5-plano.md`) | dentro do PR do ciclo 5 fecham (1) o backfill §C3.5 do #366 — pr 366, merge_commit `df496d2`, approved_head `2d2d16d` (head julgado da ata J-SAN2-4b, não o headRefOid) — e (2) `blocks_completed` 155→156; e o briefing da junta do ciclo 5 dá worktree próprio a TODA cadeira com mandato de mutação (regra do incidente consignado na ata, conferida pelo inspetor-de-terreno antes do voto).
