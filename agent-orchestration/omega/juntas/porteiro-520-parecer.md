# Parecer do porteiro pós-merge — PR #520 (B-O6R-03b) — 2026-11-09

**Papel · modelo que rodou:** porteiro-pos-merge · Claude Opus 5.5 (nível menor DECLARADO, §C7.6). Sem queda de modelo.
**Objeto:** PR #520, B-O6R-03b: despesas (RDV) de verdade no app de campo (replay autenticado, payload, permissão e conflito). Fecha o item 30 do portão (`Ω6R-QUA-001`).
**Onde medi (§A7):** `origin/main` = `e7e8d678` (merge do #520) e head aprovado `77e5ed30`. As duas árvores são idênticas (`8f42d818…`). Usei um worktree próprio, `C:/Users/thiag/w-porteiro520`, desanexado em `e7e8d678`, com `npm ci` e `flutter pub get` próprios (sem junction) e sem Docker. Não toquei os worktrees vivos `w-ass08` e `w-demoint`; o `w-ass08b` não aparece no `git worktree list`.

## 1. Merge íntegro: OK
- `git log origin/main --oneline -5`: o topo é `e7e8d678` (#520), com pai `89f1d38e` (#521).
- `gh pr view 520`: `MERGED` em 2026-11-09 às 20:45 (SP). O `mergeCommit` é `e7e8d6787baa…`, igual ao topo da main; o `headRefOid` é `77e5ed30`.
- `git rev-parse e7e8d678^{tree}` = `77e5ed30^{tree}` = `8f42d818…`: o squash é byte a byte o head aprovado. Por isso o CI do head vale para o que está na main.

## 2. Promessa × diff real: OK
- `git show --stat e7e8d678`: 28 arquivos (+2825/−813). O PROIBIDO ficou intocado: nenhum caminho em `src/modules/expense-management/**`, `prisma/**`, `Kpis/**`, `frontend/**`, `pubspec.*`, `.github/**`, `CLAUDE.md` ou `AGENTS.md`.
- `catalog.ts`: `--numstat` dá 5/0. As 5 linhas (`expense_report:read_own`, `create`, `update`, `submit`, `expense_sync:write`) estão em 975–979, dentro do bloco `field_technician` (935–990). O `expense_sync:write` aparece 4 vezes no pai e 5 no merge; os de `manager:587`, `technician:641` e `operator:827` já existiam. O snapshot também dá 5/0, no bloco `field_technician`. O `expense_receipt:attach` aparece 1 vez no `technician` e 0 no `field_technician`, como o PB4 promete.
- `sync_screen.dart`: o comando diz "só as 2 linhas do gancho", e o arquivo teve 13/4 linhas. São o import, a variável `resolved` e as 2 chamadas do gancho, ou seja, consequência mecânica e não escopo novo.
- `b093_evidence_camera_gallery_test.dart`: 1 linha (`seedIfEmpty: true`). É a emenda declarada no §7.2 do plano do conserto e está citada no corpo do PR.
- Trava de escopo do §9 do conserto:
  - `git diff --name-only aae29e51 77e5ed30` dá 9 caminhos, todos no PERMITIDO;
  - `-- src/ prisma/ Kpis/` sai vazio;
  - `sync_replay_service.dart` tem 3 hunks (115, 151 e 329→341), dentro das faixas do plano;
  - o `comm -23` entre os arquivos do merge K0 e os do ramo sai vazio, ou seja, o merge não tem conteúdo próprio.
- `git diff --check 89f1d38e e7e8d678`: rc 0.

## 3. Números reexecutados: OK
| O quê | Declarado | Reexecutado por mim em `e7e8d678` | CI |
|---|---|---|---|
| `bo6r03b_expense_http_errors_test.dart` | 10/10 | **10/10** (E1–E10), rc 0 | — |
| suíte Flutter | 1047/1047 | **+1047, All tests passed**, rc 0, zero `-N`, zero `~N` | head `77e5ed30`: +1047. Main de antes (`89f1d38e`): +1021, logo o delta é **+26** = 16 + 10. No diff: 26 `test(`/`testWidgets(` adicionados e 0 removidos |
| raiz, os 3 testes do K3 (`b-o6r-03b-*` + `core-saas-role-authority`) | 17/17 | **17/17**, 0 fail, 0 skip, rc 0 | — |
| backend (`npm test`, sem `DATABASE_URL` e sem Redis) | 3990 total, 3855 pass, 7 não-verdes e 128 skip no head original; +1 (RB4c) no conserto | **4018 total, 3881 pass, 9 fail, 128 skip** | head: 4750 / 4748 pass / 0 fail / 2 skip. Main de antes: 4745, logo o delta é **+5** = RB1 3 + RB4b 1 + RB4c 1. Merge na main: 4750 / 0 fail |
| `backend-postgres` | — | não rodei (sem Docker, por ordem) | head e merge: 503/503, 0 fail |

**Conferência do backend local:**
- O total bate exatamente: 3990 + 1 (RB4c) + 27 (os testes `ass-07-*` do #519, contados pelo porteiro do #519) = **4018**.
- O pass também bate: 3855 + 1 + 27 − 2 = **3881**. O skip é 128, como declarado.
- Dos 9 vermelhos, 7 são os pré-existentes que o PR lista:
  - 3 do `tests/job-queue.test.ts`;
  - 2 de `domain event publishes mapped …`;
  - o `o writer grava SET … EX …`, com ida real ao Redis;
  - o piso de denominador do `tests/core-saas-role-authority.test.ts`.
- Os outros 2 são de ambiente local. São `compose resolve os dois perfis sem consultar o daemon` e `overlay não publica porta do clamd`, ambos de `tests/avreal-compose-topology.test.ts`, que veio do #477 em 02/11 e que o #520 não toca. Os dois deram `spawnSync docker ETIMEDOUT` em 60 s, com a CLI do Docker lenta nesta máquina (os vizinhos do mesmo arquivo passaram em 51 s e 31 s). No CI do head e no da main eles passam.
- **A primeira rodada local foi descartada, por erro meu de ambiente.** Exportei a `DATABASE_URL` fictícia para o `npm test` inteiro, quando o plano só a pede para o `prisma generate`. Com a URL presente, o runner RODA as suítes `-db` (`scripts/run-backend-tests.mjs:67-120`), e o resultado foram 762 falhas por não alcançar o banco em `127.0.0.1:1`. Repeti sem a URL, e o resultado é o da tabela.

**CI:**
- Head `77e5ed30`: 16/16 `completed/success` (runs `42719525188`, push, e `42719533706`, PR). Os logs de `backend`, `backend-postgres` e `flutter` têm 0 `not ok`.
- Merge na main: run `42723037189` `completed/success` (8 jobs `success` e o `deploy` `skipped`). O `backend` deu 4750 com 0 fail, o `backend-postgres` 503/503 e o `flutter` +1047.

## 4. KPI: não se aplica
O KPI está congelado (`D-GOV-PROPORCIONAL`, item 8(5)). O diff não toca `Kpis/**`, e por isso não cobro nada aqui.

## 5. Ata da junta: o conteúdo confere, mas ela NÃO está versionada
- A `agent-orchestration/omega/juntas/J-520-b-o6r-03b.md` existe SÓ no disco da sessão, sem rastreio: `git cat-file -e origin/main:…` falha. Foi gravada às 20:45:20, 17 s antes do merge.
- O conteúdo registra:
  - o inspetor LIBERADO;
  - os votos C1 APROVA, C2 REPROVA (F1: o 503 virava conflito, com perda de reembolso) e C3 APROVA, ou seja, 2×1;
  - a auditoria do topo (Opus 5.5), com 7 achados reais;
  - o conserto único pelo DeepSeek;
  - a conferência por Claude em identidade nova: lente A CONFERIDO e lente B sem defeito de produto, mais 3 itens de registro, entre eles `21468f73` → `7a479474`;
  - os papéis do §C7.4-bis, com (a), (b) e (c) respondidos;
  - as 3 pendências novas.
- Reexecutei estas afirmações da ata:
  - 16/16 no head ✓;
  - o `21468f73` não é ancestral do head (`merge-base --is-ancestor` rc 1) e nenhuma ref remota o contém ✓;
  - `7a479474`, `7016dcfb`, `aae29e51`, `a0e99582` e `f63c8bb6` são ancestrais (rc 0) ✓;
  - o escopo do conserto tem 9 caminhos ✓;
  - a trava do índice dá rc 0 ✓.
- Faltam dois arquivos:
  - `omega/reprovacoes/R-B-O6R-03b-ciclo1.md`, que o §8 do plano do conserto põe a cargo do orquestrador. Ele não existe nem na ref nem no disco. Nenhum commit da main toca `reprovacoes/` desde 28/10, ou seja, sob o fluxo rápido a ata virou o registro de fato.
  - `votos/B-O6R-03b/00-dev.md`, que o comando nomeia. O diário existe, em `docs/revisoes/REENVIOS/B-O6R-03b-dev.md`.

## 6. Pendências: o conteúdo confere, com ressalva de formato
- As 3 novas estão na main, e cada uma aparece 1 vez no índice:
  - `pendencias.md:12975`: `P-REFINO-INVENTARIO-SEM-GUARDA`;
  - `pendencias.md:12981`: `P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO` (dono `B-MATERIAL-REENVIO`, com pergunta ao dono);
  - `pendencias.md:12988`: `P-BACKEND-ENVELOPE-400-FALHA-DE-INFRA` (dono `B-ARNES-2`).
- O índice não tem resíduo:
  - regenerei com `python agent-orchestration/controle/gerar-indice-pendencias.py` (rc 0; 786 cabeçalhos e 775 IDs);
  - `git diff --quiet` do índice deu rc 0, ou seja, o índice da main é exatamente o que o gerador produz;
  - há 0 marcadores de conflito no `pendencias.md` e no índice.
- Os apensos do §8 estão lá: `:2939` (`Ω6R-QUA-001`) e `:11064` (`P-O6R-B03-CONTRATO-CONFLITO-POR-ACAO`).
- Formato: as 3 não têm os campos `PR-alvo` e `bloqueia`, que as vizinhas têm (por exemplo, `:12959` e `:12965`). Pelo texto, nenhuma delas bloqueia o início de outro bloco.
- A afirmação da `P-REFINO-INVENTARIO-SEM-GUARDA` confere: `node scripts/inventario-fluxos.mjs --check` dá rc 1 em `e7e8d678`.
- **Amostragem de pendência fechada: `Ω6R-QUA-001`** (FECHADA em `:2932`).
  - No código, o fechamento é verdade. Em `sync_providers.dart:137-164`, com token, o provedor monta `DioExpenseSyncBatchApi(createAuthenticatedHttpClient(config, …))`; sem token resolvido, vira `SessionlessExpenseSyncBatchApi`; carregando, vira `PendingBackendExpenseSyncBatchApi`.
  - **Nenhum teste guarda isso:** ver o achado A1.

## 7. Limpeza (§C5): RESSALVA
- O ramo remoto **NÃO foi apagado**: `git ls-remote --heads origin fix/mobile-rdv-sync` devolve `77e5ed30…`, e `gh api …/branches/fix/mobile-rdv-sync` confirma que ele existe.
- O ramo local foi removido (`git branch --list '*rdv*'` sai vazio). O worktree `w-o6r03b` também: não está no `git worktree list`, o diretório não existe e o `prune --dry-run` sai vazio.
- Na árvore principal da sessão (`fix/seed-org-demo-pt-br` @ `3ff93b64`), `git status --porcelain | grep '^ D'` mostra 2 arquivos rastreados apagados: `agent-orchestration/omega/juntas/J-515-b-ass-06.md` e `docs/revisoes/REGISTRO/reg-noite-0911-dev.md`. Os dois são anteriores a este bloco (entraram pelo #517, `11a00a4b`) e existem na `origin/main`, ou seja, nada se perdeu no remoto.
- Disco: 233 GB livres (`df -h /c`), acima do piso; não precisa de DEEP_CLEAN. Banco: o bloco não tocou base viva (sem Docker e sem `prisma/`).

## 8. O próximo pode começar? O #522, sim; na trilha REENVIOS, a ordem do dono põe o B' antes do C
- Nenhuma pendência ABERTA está marcada como bloqueando o início do `B-ASS-08` ou do `B-MATERIAL-REENVIO`. As que citam o `B-ASS-08` fecham dentro dele ou depois dele, e não seguram o início:
  - `:12646`: "bloqueia: item 60";
  - `:12673`: "bloqueia: ligar o canal, não bloqueia os blocos fail-closed";
  - `:12899` e `:12935`: "bloqueia: não".
- A `P-O6R-03b-VERSAO-DO-GESTOR-SEM-RECIBO` (dono `B-MATERIAL-REENVIO`) não bloqueia o início do C. Mas ela traz uma pergunta ao dono, que precisa de resposta, ou de um padrão declarado, antes de o dev mexer nessa parte.
- **A ordem da trilha está escrita na ref:**
  - `agent-orchestration/omega/planos/B-REENVIOS-plano.md:9`: "**Ordem (DONO P24 + P4):** A → B → B' → C → C'";
  - `B-REENVIOS-plano.md:525`: "### G.3 Bloco B' — `B-RDV-COMPROVANTE` … **logo depois do `B-O6R-03b`** (DONO P4), antes do C";
  - o próprio plano declara que essa posição é "leitura literal de 'logo depois do 03b'" e que ela "se desfaz numa linha do dono" (`:542`);
  - o §C não lista o B' como pré-requisito técnico (`:291`).
- Procurei uma decisão que troque a ordem e não achei nenhuma: nem em `decisoes.md` da main, nem no disco da sessão, nem na memória. Pela ref, portanto, o próximo da trilha REENVIOS é o **B'** (`B-RDV-COMPROVANTE`), não o C.
- O PR #522 está `OPEN` e `BEHIND`: ele precisa receber a main. O #520 mexeu no `pendencias.md` e no índice gerado, e o índice se regenera pelo script, sem resolução à mão.

## Achados
- **A1. O item 30 fechou sem teste que pegue a regressão dele.** Não é grave: o produto está correto.
  - Apliquei a mutação M-P1 no meu worktree, em `mobile/flutter_app/lib/core/sync/sync_providers.dart:139`: `if (config.accessToken == null) {` → `if (true || config.accessToken == null) {` (1 arquivo, 1 linha). Ela reproduz exatamente o defeito do item 30: o canal de despesa nunca recebe o cliente autenticado.
  - Com a mutação, a suíte Flutter inteira deu **+1047, All tests passed** (rc 0). Reverti com `git checkout`, e o blob `8aa84346…` voltou igual ao da `e7e8d678`.
  - Logo, a metade "com sessão válida" do "Teste de encerramento" do item 30 não tem teste que a guarde. O critério está em `docs/revisoes/SAN3/PLANO_SAN3.md:301`: "RDV criado offline sincroniza com sessão válida; replay → 1".
  - O que tem teste:
    - a criação offline e o reenvio em ordem (RB3, com `CaptureBatchApi`);
    - o cliente de produção com token nos erros HTTP (E1–E10);
    - o 200/`processed` do `field_technician` no backend (RB1);
    - o "replay → 1", pela idempotência que já existia (`tests/expense-management-routes.test.ts:104`, papel `technician`; o mecanismo não depende do papel).
  - O que falta: um teste que leia o `syncBatchApiProvider` real com sessão válida, prove o `DioExpenseSyncBatchApi` com `Authorization: Bearer <token>` e fique vermelho sob a M-P1.
- **A2. Ata e correção do SHA fora do repo.** A `J-520-b-o6r-03b.md` só existe no disco. A correção `21468f73` → `7a479474` está na ata, que não está versionada, e no corpo do PR, que fica fora do repo. Na main, `docs/revisoes/REENVIOS/B-O6R-03b-dev.md:88` ainda cita o `2146…` sem nota.
- **A3. O `PLANO_SAN3` fecha o item 30 no head errado.**
  - `docs/revisoes/SAN3/PLANO_SAN3.md:158` cita o "head 2330023f", que é anterior à junta e ao conserto do defeito grave. O head aprovado é `77e5ed30` e o merge é `e7e8d678`.
  - A nota está numa 7ª célula, além das 6 do cabeçalho (`:110`). O GFM ignora célula excedente, então a nota não aparece na tabela renderizada.
  - O mesmo vale para a emenda da linha `:301`, que está numa 10ª célula (o cabeçalho, em `:290`, tem 9).
- **A4. Backfill de rastreabilidade pendente.** `agent-orchestration/docs/status-geral.md:3` e `agent-orchestration/codex/log-execucao.md:5222` dizem "PR #520 aberto", e nenhum registro da main cita `e7e8d678` nem `77e5ed30`.
- **A5. Ramo remoto não apagado.** O `fix/mobile-rdv-sync` continua no `origin` (§C5).
- **A6. Ordem da trilha REENVIOS.** Ver o item 8.
- **A7. Itens menores de registro.**
  - As 3 pendências novas estão sem `PR-alvo` e sem `bloqueia`.
  - Faltam o `R-B-O6R-03b-ciclo1.md` (pedido pelo §8 do plano) e o `votos/B-O6R-03b/00-dev.md` (pedido pelo comando).
- **Fora do bloco, só observação:** os 2 rastreados apagados na árvore da sessão (item 7). As atas `J-519-b-ass-07.md` e `porteiro-519-parecer.md` também existem só no disco.

## O que executei
- `git fetch origin --prune`; `git log origin/main --oneline -5`; `gh pr view 520 --json state,mergeCommit,headRefOid,commits,body`.
- `git show --stat e7e8d678` e `--numstat`; diffs de `catalog.ts`, do snapshot, de `RBAC_MATRIX.md`, de `sync_screen.dart`, do b093, de `docs/api.md`, de `docs/mobile-sync-contracts.md` e do `PLANO_SAN3.md`; `grep` dos blocos de papel e das permissões no pai e no merge.
- `gh api …/commits/<sha>/check-runs` no head e no merge; `gh run view <run> --job <job> --log | grep '# tests|pass|fail|skipped'` nos runs `42719533706` (head), `42708543517` (main de antes) e `42723037189` (merge).
- `git merge-base --is-ancestor` dos 7 SHAs citados; `git branch -r --contains 21468f73`; `git rev-parse <sha>^{tree}`.
- `git worktree add --detach C:/Users/thiag/w-porteiro520 e7e8d678`; `npm ci` (rc 0); `npx prisma generate` com `DATABASE_URL` fictícia (rc 0); `flutter pub get` (rc 0).
- `flutter test test/core/sync/bo6r03b_expense_http_errors_test.dart` (10/10); `flutter test --reporter compact` (+1047); mutação M-P1 + `flutter test --reporter compact` (+1047, ou seja, a mutação sobreviveu), seguida de `git checkout` e `git hash-object` (blob igual).
- `node --test --import tsx tests/b-o6r-03b-expense-payload-contract.test.ts tests/b-o6r-03b-field-technician-expense-sync.test.ts tests/core-saas-role-authority.test.ts` (17/17).
- `env -u DATABASE_URL -u REDIS_URL npm test` (4018 / 3881 / 9 fail / 128 skip), mais a rodada descartada com a `DATABASE_URL` fictícia.
- `python agent-orchestration/controle/gerar-indice-pendencias.py` + `git diff --quiet` (rc 0); `grep` de marcadores de conflito; `node scripts/inventario-fluxos.mjs --check` (rc 1).
- `git diff --name-only aae29e51 77e5ed30 [-- src/ prisma/ Kpis/]`; `comm -23` do merge K0; `git diff --check 89f1d38e e7e8d678` (rc 0).
- `git ls-remote --heads origin fix/mobile-rdv-sync`; `gh api …/branches/fix/mobile-rdv-sync`; `git worktree list`; `git status --porcelain`; `df -h /c`; memória livre (29 GB de commit, acima do piso do P8).
- `gh pr view 522`; `grep` de "bloqueia" no `pendencias.md` da main; leitura de `B-REENVIOS-plano.md` (`:9`, `:291`, `:525`, `:542`) e `grep` em `decisoes.md` (main e disco).

## O que NÃO executei
- O `backend-postgres` local, porque a ordem foi rodar sem Docker. Para ele vale o CI: 503/503 no head e no merge.
- `dart format`, `flutter analyze` e `npm run check/lint/build` locais. O CI do head e do merge está verde.
- Os 6 testes que dependem de Redis, porque não há Redis local. O CI os roda verdes.

LIBERADO COM RESSALVA: junta do B-ASS-08 parte 1 (PR #522); na trilha REENVIOS, o B' (B-RDV-COMPROVANTE), que a ordem do dono (B-REENVIOS-plano.md:9 e :525) põe antes do bloco C | (1) no próximo bloco que tocar sync_providers.dart, um teste que leia o syncBatchApiProvider com sessão válida, prove o cliente autenticado e fique vermelho sob a M-P1; (2) no próximo PR de registro: versionar a ata J-520, corrigir o fechamento do item 30 no PLANO_SAN3 (head 77e5ed30, merge e7e8d678, dentro das colunas), pôr a nota do SHA 7a479474 no diário, fazer o backfill do merge em status-geral e log-execucao, e dar PR-alvo e bloqueia às 3 pendências; (3) apagar o ramo remoto fix/mobile-rdv-sync; (4) o bloco C só começa depois do B' ou com uma linha do dono que troque a ordem.
