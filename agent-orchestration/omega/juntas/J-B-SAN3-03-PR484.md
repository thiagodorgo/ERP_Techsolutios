# J-B-SAN3-03-PR484 — junta do PR #484, rateio exato do custo de nuvem (B-SAN3-03)

- **PR:** #484 — `fix(cloud-billing): rateio exato do custo de nuvem (B-SAN3-03)`, ramo `fix/cloud-billing-exato`.
- **Régua:** fluxo rápido de junta (`D-JUNTA-FLUXO-RAPIDO`, §C7 item 10), **unanimidade de 3 com veto**: o bloco toca dinheiro e o isolamento entre organizações (item 10(1)).
- **Objeto da junta:** `5b628b886520bcbece0228eec9d47c965a32b577`.
- **Objeto depois do conserto único e da conferência:** `353677535f855d931a0e02fccc64297cfdb443ae`.
- **Merge:** squash `e7dcbbb7c6d5e729081266363dd73c70ad2312bb`, em 03/11/2026 às 10:50:25 SP (`2026-11-03T13:50:25Z`).
- **CI:** head `35367753` com 16/16 check-runs concluídos e verdes (runs `41642082165`, `push`, e `41642092077`, `pull_request`); merge `e7dcbbb7` com a run `41647952407` (`push`, `ci`, 8 jobs, `success`).
- **Resultado:** junta **REPROVADA** (C1 REPROVADO; C2 e C3 APROVADO; a régua é unanimidade) por um defeito GRAVE dentro do bloco; triagem e auditoria do topo; **um conserto** (K1–K5 + §11); conferência **CONFERIDO COM RESSALVA**, sem grave restante; nenhuma cadeira refeita (item 10(4)); porteiro pós-merge **LIBERADO COM RESSALVA**.
- **Evidências versionadas:** `agent-orchestration/omega/juntas/votos/B-SAN3-03-PR484/`, copiadas de `erp-pausa-2026-10-03/revisoes/j484/` (mais o parecer do porteiro e a emenda 2 do bloco). Cópia normalizada: UTF-8 (14 logs da conferência estavam em UTF-16), fim de linha LF e sem espaço no fim de linha; os oito logs inteiros de CI (de 0,7 a 9 MB) ficaram fora, porque se reproduzem pelo `gh run view`.

Todas as referências acima foram medidas por comando para esta ata: `gh pr view 484 --json state,headRefOid,mergeCommit,mergedAt` → `MERGED`, `35367753…`, `e7dcbbb7…`, `2026-11-03T13:50:25Z`; `gh api repos/thiagodorgo/ERP_Techsolutios/commits/353677535f855d931a0e02fccc64297cfdb443ae/check-runs` → `total_count 16`, 16 `success`; `gh run view 41647952407 --json headSha,event,conclusion` → `e7dcbbb7…`, `push`, `success`; os commits do conserto, por `gh pr view 484 --json commits`.

## Antes da junta

- **Pré-revisão:** `prerev-san303-sol` (Codex GPT-5.6 Sol), objeto `49ddd0f8`, **REPROVADO** (A1 grave, A1–A6). Foi o insumo da emenda 2.
- **Plano do conserto da pré-revisão (emenda 2, §1–§9):** orquestrador, Claude Opus 5.5, no papel de topo declarado (Fable suspenso, `D-FABLE-SUSPENSO-0211`, §C7.6-bis).
- **Críticas da emenda 2:** `crit-san303-e2-sol` e `crit-san303-e2b-sol` (Codex), ambas **REPROVADO** sobre `49ddd0f8`; o autor incorporou as duas nas §7 e §8 da emenda.
- **Devs da emenda 2:** `dev-san303-sol`, `dev-san303-opus`, `dev-san303-e2-sol`, `dev-san303-e2-astra`, `dev-san303-e2-sol2` (declarados no relatório `docs/revisoes/SAN3/B-SAN3-03-dev.md`).
- **Inspetor de terreno:** `inspetor-j484-opus`, Claude Opus 5.5, nível menor declarado. **LIBERADO COM RESSALVA**, com as ressalvas R1–R6 levadas ao briefing: as correções das §7/§8 entraram como "a re-verificar" (R1); a RETOMADA 16 (driver de mutações com `exit 1`) virou ponto a medir (R2); worktree, container e porta por cadeira (R3); no máximo 2 cadeiras em paralelo, com memória ≥ 4 GB (R4); P1/P2/P3/P6/P7 colados, unanimidade sobre `5b628b88` e `arquivos_medidos` (R5); composição nomeada por competência (R6). Fonte: `votos/B-SAN3-03-PR484/inspetor-parecer.md` e `BRIEFING.md`.

## Composição e votos

| Cadeira | Competência | Identidade | Modelo declarado | Voto | Achados |
|---|---|---|---|---|---|
| C1 — isolamento entre organizações e fail-closed | tag ambígua ou desconhecida mandando custo a outra organização | `jurado-j484-c1b-opus` (sucessor de `jurado-j484-c1-opus`) | Claude Opus, nível menor | **REPROVADO** | C1b-A1 **GRAVE** (dentro do bloco); C1b-A2 não grave (pré-existente) |
| C2 — dinheiro no resumo | período e contrato da rota | `jurado-j484-c2-opus` | Claude Opus, nível menor | APROVADO | C2-N1, C2-N2, C2-N3, não graves |
| C3 — banco real, regressão, escopo e registro | suíte, CI e Postgres | `jurado-j484-c3-opus` | Claude Opus, nível menor | APROVADO | C3-01, não grave |

Os três votos referem-se ao objeto `5b628b88`. Cada cadeira usou worktree e Postgres descartável próprios (`j484-c1b-pg`, `j484-c2-pg`, `j484-c3-pg`) e os removeu no fim. Votos: `c1b-voto.json`, `c2-voto.json`, `c3-voto.json`; evidências: `c1b-evidencia.md`, `c2-evidencia.md`, `c3-evidencia.md`, com sondas, mutações e logs no mesmo diretório. O `c1-voto.json` e o `c1-evidencia.md` do antecessor ficam como registro da queda; o voto dele está `EM APURAÇÃO` e não conta.

**Cruzamento de modelo (§C7 item 11(1)):** o código julgado foi escrito por último em Codex (Sol/Astra); as três cadeiras são Claude Opus. O autor da emenda 2 é o orquestrador (Claude Opus); as cadeiras são identidades distintas dele (inspetor, item 4).

## O que a junta achou

- **C1b-A1 (GRAVE, dentro do bloco):** dois nomes de organização que se leem iguais e diferem por um caractere invisível (11 `Default_Ignorable` medidos, mais U+FEFF no meio) não eram recusados como ambíguos. A tag escrita como se lê levava o valor inteiro para a organização de nome limpo, em memória e no Postgres, e a alocação alimenta a cobrança (`cloud-charge-prisma.repository.ts:197`). Erra dinheiro entre organizações.
- **C1b-A2 (não grave, pré-existente desde `6f27faae`, 08/06):** letra de outro alfabeto no nome (homóglifo, "c" cirílico) desvia a tag da mesma forma; só se alcança por escrita deliberada do papel que grava o nome.
- **C2-N1:** a data validada pelo parser podia diferir do dia UTC usado no casamento da run (ISO com fuso, `24:00`, hora sem fuso).
- **C2-N2 (pré-existente):** chave de query com outra grafia (`PeriodStart`, `periodStart[]`) era ignorada, e o resumo voltava sem filtro.
- **C2-N3:** lacuna de teste: nenhum teste prendia o terminador do prefixo de data, e a M47-c literal não provava o T-RUN-1 sozinha.
- **C3-01:** a contagem 256/256 da RETOMADA 16 não se reproduzia pela letra (sem lista literal nem log).
- **R2 do inspetor, medido pela C1b:** M13 e M16 ficaram vermelhas pela sentinela `CONTEXT_LEAK`; o `exit 1` era do critério `AssertionError` do driver do dev, não de mutante vivo.

## Triagem e auditoria do topo (emenda 2, §10)

- **Quem triou e planejou:** o orquestrador, Claude Opus, no papel de topo declarado (Fable suspenso). Não achou e não consertou.
- **Auditoria do topo, declarada (item 10(5)):** o C1b-A1 é **defeito real do produto**, não artefato do processo. A causa: a §7 normalizou espaço e largura, mas não os caracteres invisíveis.

| Achado | Gravidade · escopo | Destino |
|---|---|---|
| C1b-A1 | GRAVE · dentro | conserto agora (K1) |
| C2-N1 | não grave · dentro, simples | mesma leva (K2) |
| C2-N2 | não grave · pré-existente, simples | mesma leva (K3) |
| C2-N3 | não grave · dentro | mesma leva (K4) |
| C3-01 | não grave · dentro | mesma leva (K5) |
| C1b-A2 | não grave · pré-existente, grande | pendência `P-SAN303-HOMOGLIFO-NOME` |

Fonte: `votos/B-SAN3-03-PR484/emenda-2-triagem-e-conserto.md`, §10.

## Conserto único

| Parte | O que muda | Quem fez | Modelo | Commits |
|---|---|---|---|---|
| K1 | `normalizeTenantTag` remove `Default_Ignorable_Code_Point` e `Cf` antes do resto; T-TAG-14, T-TAG-db-2, M57 | `dev-san303-k-sol` | Codex GPT-5.6 Sol, nível menor, esforço high | `0f731d4b`, `1963e94a`, `89171135` |
| K2 | data do resumo só `AAAA-MM-DD` com ida e volta; T-SUM-9, M58 | `dev-san303-k-sol` | Codex GPT-5.6 Sol | `1af05802`, `0bc37e75` |
| K3 | chave desconhecida no resumo → 400 `summary_query_invalid`; T-SUM-10, M59 | `dev-san303-k-sol` | Codex GPT-5.6 Sol | `03901eb9`, `4d325ccc` |
| K4 | M47-c′ no lugar da M47-c | `dev-san303-k-sol` | Codex GPT-5.6 Sol | `f1a123ca` |
| K5 | bateria dirigida publicada com lista literal e log (`B-SAN3-03-bateria.txt`/`.log`) | `dev-san303-k-opus` | Claude Opus, nível menor | `c7387fd7`, `35367753` |
| §11 da emenda 2 | `tests/san3-05-leituras-de-plataforma-db.test.ts`, só a chamada do resumo em `AAAA-MM-DD`; merge da `main` sem rebase | `dev-san303-k-opus` | Claude Opus, nível menor | `f4bb114d`, `88e63e11` |

- O K5 e o §11 ficaram com o Claude porque `dev-san303-k-sol` bateu o limite de uso depois de K1–K4 (RETOMADA 22 do relatório do dev).
- **§11 da emenda 2 (orquestrador, topo declarado, `D-EMENDA-ANTES-DO-CODIGO`):** o K2 recusou a chamada em ISO completo de um teste de outro bloco; a regra ficou, e o teste passou a mandar a data no formato do contrato. A emenda também mandou resolver o conflito do PR com a `main` por `git merge origin/main`, sem rebase nem `push --force`.

## Conferência (item 10(3), passo 5)

- **`conf-484-agy-opus`** — Claude Opus 5.5 pelo Antigravity, nível menor declarado, identidade nova. Mediu os itens 1 e 2 (2a–2d) e **caiu por cota** (429, *"Individual quota reached… Resets in 3h58m"*) antes da cauda (C3-01 e item 3).
- **`conf-484b-opus`** — Claude Opus 5.5 (subagente do Claude Code), nível menor declarado, identidade nova. Pelo P3, re-executou cada comando registrado do antecessor e comparou (saídas iguais), depois mediu a cauda.
- **Cruzamento, declarado:** K1–K4 (Codex) cruzam modelo; K5 e §11 (Claude) não cruzam, porque o Codex estava sem limite (§C7 item 11(2)).
- **Resultado:** o grave **C1b-A1 sumiu** em memória e no Postgres, nos 12 caracteres e nas duas estratégias; T-TAG-14 e T-TAG-db-2 vermelhos em `5b628b88` (20/14/6) e verdes no objeto; C2-N1, C2-N2, C2-N3 e C3-01 fecharam (bateria do K5: 38 arquivos, 307/303/4/0, as 4 falhas de `setsid` do Windows, como declarado); 16/16 check-runs; TAP `backend` 4371/4369/0/2 e `backend-postgres` 493/493/0/0 nas duas runs, 0 `not ok`; escopo cabe no §4 + §10 + §11; `git diff --check` limpo.
- **Ressalvas não graves:** (1) nenhum teste cobre tag com caractere invisível, embora o comportamento falhe fechado → `P-SAN303-TESTE-TAG-INVISIVEL`; (2) `B-SAN3-03-bateria.txt`/`.log` fora da lista literal do §4/§10, aceitos como entrega do K5; (3) `P-SAN303-HOMOGLIFO-NOME` não estava registrada → paga neste registro; (4) K5 e §11 sem cruzamento de modelo, declarado.
- **Veredito:** **CONFERIDO COM RESSALVA**. Nenhum grave restante; nenhum caso do item 10(4) para refazer cadeira.

Fonte: `votos/B-SAN3-03-PR484/conf-484-parecer.md` (as duas identidades no mesmo arquivo), com os logs `conf-*` e `confb-*`. Os logs inteiros de CI que a conferência baixou (`conf-ci-*`, `confb-ci-*`, de 0,7 a 9 MB) **não foram versionados**: reproduzem-se por `gh run view 41642082165 --job <id> --log` e `gh run view 41642092077 --job <id> --log`.

## Quedas (P6)

| agente | modelo (pin/herdado) | mandato (nº itens) | fase da morte | erro | custo do redo |
|---|---|---|---|---|---|
| `jurado-j484-c1-opus` | opus (workflow) | 3 | item 3 (mutações), itens 1–2 medidos | parada por PAUSA do dono (P7), 03/11 ~00:00 SP; workflow parado | item 3 inteiro + voto; itens 1–2 re-executáveis pela `c1-evidencia.md` (P3) |
| `conf-484-agy-opus` | antigravity `claude-opus-5-5-high` | 3 | item 2 em diante (C3-01 e item 3) | 429 "Individual quota reached… Resets in 3h58m" | cauda C3-01 + item 3; itens 1–2c re-executáveis pelo parecer (P3) |

Fontes: `votos/B-SAN3-03-PR484/00-quedas.md` e `00-quedas-conferencia.md`. A primeira não é morte: é a pausa ordenada pelo dono na noite de 02/11 (*"nao clade, vamos para por hoje, pause e anote tudo"*); o sucessor `jurado-j484-c1b-opus` re-executou a evidência do antecessor pelo P3 e mediu a cauda.

## Separação de papéis (§C7.4-bis)

| Papel | Quem |
|---|---|
| Inspetor | `inspetor-j484-opus` |
| Quem achou | `jurado-j484-c1b-opus` (C1b-A1, C1b-A2), `jurado-j484-c2-opus` (C2-N1..N3), `jurado-j484-c3-opus` (C3-01) |
| Quem planejou | orquestrador, Claude Opus no papel de topo declarado (emenda 2, §10 e §11) |
| Quem consertou | `dev-san303-k-sol` (Codex, K1–K4); `dev-san303-k-opus` (Claude, K5 e §11) |
| Quem conferiu | `conf-484-agy-opus` → `conf-484b-opus` (Claude Opus) |
| Porteiro | `porteiro-484-opus` (Claude Opus) |

- Quem achou não planejou nem consertou; quem consertou não conferiu.
- **Cruzamento ausente, declarado:** o K5 e o §11 foram feitos e conferidos por Claude, porque o Codex estava sem limite (item 11(2)).
- **Fluxo rápido (item 10(3)), cumprido:** pré-revisão → junta uma vez → triagem → um conserto → conferência → merge → porteiro. Nenhuma cadeira refeita.

## Porteiro pós-merge

`porteiro-484-opus` (Claude Opus 5.5, nível menor declarado) mediu na `origin/main` em `e7dcbbb7`: promessa × diff; 40/40 nos testes do bloco; 253/253 no "Como testar" do PR; a M57 morde (20/14/6); a mutação do `import_id` morde (T26-db-1/2); CI do merge concluída e verde; ramo, worktrees e containers do bloco apagados. **LIBERADO COM RESSALVA** para o `B-ASS-00` (e o REC-01 do pátio segue sem bloqueio). As ressalvas, todas de registro:

1. itens 25 e 26 marcados FECHADO no `PLANO_SAN3.md` e nas 3 pendências, com head `35367753`, merge `e7dcbbb7`, data 2026-11-03 e CI `41647952407`;
2. esta ata, com papéis e quedas;
3. `P-SAN303-HOMOGLIFO-NOME` e `P-SAN303-TESTE-TAG-INVISIVEL` criadas com dono e PR-alvo, e o índice regenerado.

As três são pagas pelo PR de registro de 03/11 que traz esta ata. O porteiro também notou, sem gravidade, que o corpo do PR #484 ficou defasado (caixas de pré-revisão e junta desmarcadas); o comentário de fechamento traz o fluxo real. Fonte: `votos/B-SAN3-03-PR484/porteiro-pos-merge.md`.

**Item 25 medido antes de marcar FECHADO (este registro).** O critério do §5.1 do `PLANO_SAN3.md` para o `B-SAN3-03` pede, por produtor, fato e métrica juntos ou nenhum, e custo de API ≠ `unallocated`. No log do job `backend` da run `41647952407` (merge `e7dcbbb7`), `gh run view 41647952407 --job 125958177192 --log` mostra `ok` em T-UP-db-2, T-DOWN-db-2, T-JOB-db-2 (falha injetada → fato e unidade juntos ou nenhum), C-1, C-2, C-3, C-5 (censo da base), T-API-3 (ApiGateway e AWSELB alocados), T-STO-2 e T-STO-db-1, T26-1, T26-db-1 e T26-db-2; o resumo TAP é `# tests 4371 · pass 4369 · fail 0 · skipped 2`, e o `backend-postgres` (job `125958176908`) dá `493 · 493 · 0 · 0`, 0 `not ok` nos dois. O item 25 fecha pelo critério dele.

## Limite

Esta ata registra fatos do #484. Ela não transforma ressalva de porteiro ou de conferência em decisão de produto. A decisão de mandar tag desconhecida para `unknown_tenant_tag` (`P-SAN303-TAG-DESCONHECIDA`, §8 da emenda 2) é **leitura do orquestrador**, e o dono pode revertê-la.
