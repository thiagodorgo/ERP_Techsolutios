# Parecer do porteiro pós-merge — PR #619 (B-APP-ORG-2)

> Cópia, no registro de 22/11 (`reg-2211-cl`), do parecer fora do repositório (`~/erp-pausa-2026-10-03/revisoes/app-org/porteiro-619-parecer.md`). Só os caminhos de home mudaram (para `~/`). A ata versionada é `J-619-b-app-org-2.md`; as ressalvas (1), (2) e (5) estão neste registro; da (3), o fechamento da `P-APP-ORG-ESCOLHA-SAI` está aqui, e a redistribuição das pendências com dono `B-APP-ORG-2` fica com o orquestrador; a (4), a limpeza, foi feita pelo orquestrador em 21/11 23:13 SP (`REGISTRO-PENDENTE.md`, fora do repositório).

- Papel: `porteiro-619`, porteiro pós-merge · modelo que rodou: **Claude Opus 5.5 (nível menor, declarado)**
- Objeto: squash `51acef6b` na `origin/main`, head aprovado `d2f55bd1`
- Início: 2026-11-21 22:50 SP

## 0. Merge íntegro
- `git fetch origin` → `36b5586d..51acef6b main`; `git log origin/main -3` → topo `51acef6b feat(mobile): ... (B-APP-ORG-2) (#619)`.
- `gh pr view 619 --json state,mergeCommit,headRefOid,mergedAt` → `MERGED`, merge `51acef6b1236d62dd57c877ba2229e9b19b78414`, head `d2f55bd13f26fe604ffe3b9115937235b6b4157e`, `2026-11-22T01:49:26Z` (= 22:49 SP de 21/11).
- `git diff d2f55bd1 51acef6b --stat` → vazio: a árvore do squash é a do head aprovado. Pai do squash = `36b5586d` (#612).
- **Veredito parcial: ÍNTEGRO.**

## 1. Promessa × diff
- `git diff 51acef6b^ 51acef6b --stat` → 45 arquivos, `+8826 −1873`; `--name-only | grep -v '^mobile/'` → 0 linhas: **o diff fica só em `mobile/`**. Nada em `Kpis/*` (KPI congelado, como o corpo declara).
- **A1** — `lib/core/network/listen_http_client.dart:32-33` (no `51acef6b`): recusa local se método ≠ `GET` ou caminho fora de `kListenPaths` (3 rotas: `/api/v1/work-orders`, `/commissions/calculations/mine`, `/commissions/statements/my-summary`); sem renovação; token próprio da escuta. Teto de 1 por pátio: `listen_sessions.dart:133,173` (mapa `_sessions[tenantId]`) + `_inFlight[tenantId]` deduplica o pedido em voo (l.118-119). EXISTE.
- **A2** — `tenant_selector_screen.dart` não existe no `51acef6b` (`git cat-file -e` → fatal; −1049 linhas no diff); `class MobileSkeletonList` em `lib/shared/ui/mobile_kit.dart:2239`; `work_orders/data/other_patios_calls.dart` + `work_order_list_screen.dart` (+653). EXISTE.
- **A3** — `commissions_by_patio.dart:265-271,296-310`: `totalCents` lido como texto e convertido por `int.tryParse`, `FormatException` se inválido; sem `double` no arquivo. EXISTE.
- **Conserto de sessão** — `auth_notifier.dart:142,171,280,343,477`: `discardAll()` na queda de abertura, na entrada, na troca, no Sair e na queda; `listen_token_journal.dart:12` usa `SerialLock` (`serial_lock.dart`, diário serializado); `listen_sessions.dart` com guardas de época GA/GB/GC antes de pedir, gravar e instalar. EXISTE.
- **Conserto único (Emenda 1.8.3.15)**, medido no `51acef6b`: C2-01 `git grep -E 'Color\(0x|Colors\.'` dos 2 arquivos → **0**; C4-01/C4-04 `auth_repository.dart:151` (frase) e `change_password_screen.dart:119` (`'Senha provisória vencida'`); C4-02 `bapporg2_provisoria_app_test.dart:196` (contagem de ações); C4-05 `bapporg2_comissoes_dados_test.dart:326` (CM10); C4-08 `bapporg2_troca_financas_test.dart` + `expense_list_screen.dart:102`; C1-01 `listen_sessions.dart:224-232` (guarda de época no `retainTenants`) + EP10 em `bapporg2_epoca_test.dart:161`. EXISTE. As 5 mutações vermelhas foram conferidas por outra casa (`conf-japp-fix-dp.md` itens 2.1–2.5); não as refiz.
- **Achado (registro, não grave):** o corpo do PR declara a suíte em `+2061 ~238`, número do objeto ANTES do conserto (`cf781a48`); o diário do dev no `d2f55bd1` mede `+2069 ~238` (`dev-japp-fix-cl.md:136`). O corpo não foi atualizado depois do conserto. Ver item 2 para o número reexecutado.
- **Veredito parcial: CONFERE**, com a nota do número desatualizado no corpo.

## 2. Testes reexecutados
Worktree próprio: `git worktree add ~/w-porteiro-619 origin/main` → `HEAD is now at 51acef6b`. Flutter 3.41.6. `flutter pub get` ok.
- **2a. Testes do bloco** (15 arquivos: `test/features/bapporg2_*_test.dart` + `bapporg_troca_telas_test.dart`), `flutter test --concurrency=1 --reporter expanded` → **`+115: All tests passed!`**, ec 0, 0 `[E]`, 0 pulos. (22:51 SP)
- **2b. Suíte inteira**, uma vez, `flutter test --concurrency=1 --reporter compact` (22:51–22:56 SP) → **`04:11 +2069 ~238: All other tests passed!`**, ec 0, 0 falha (`grep -c ' -[0-9]+:'` = 0), **238 pulos** (os que a suíte já pulava; o diário do dev no `d2f55bd1` mediu o mesmo `+2069 ~238`, `dev-japp-fix-cl.md:136`).
  - **O número REPRODUZ o do diário do conserto, não o do corpo do PR** (`+2061 ~238`, medido antes do conserto, que acrescentou 8 testes: TP1/TP3, CM10, TF1, EP10–EP12...). Achado de registro, não grave: o corpo do #619 ficou com a contagem do objeto anterior.
- **2c. Forma:** `~/tools/dart-3.13.4/dart-sdk/bin/dart format --output=none --set-exit-if-changed lib test` → `Formatted 373 files (0 changed)`; `flutter analyze` → `No issues found!`, ec 0.
- **Veredito parcial: VERDE, reexecutado.**

## 3. CI da main no 51acef6b
- `gh run list --branch main --limit 5` (22:50 SP) → `ci` 44973243958 `in_progress` no push do `51acef6b`; `deploy-staging` 44973243936 `skipped`.
- Acompanhado até o fim: `gh run view 44973243958` (23:12 SP) → **`completed success`**, 10 jobs: backend, backend-postgres, frontend, flutter, e2e, docker, antivirus, authority-portal e owner-portal `success`; `deploy` `skipped`. `gh api .../commits/51acef6b.../check-runs` → 9 `success`, 1 `skipped` (o `docker` começou às 23:09 SP, depois do backend, e terminou `success`).
- Resumos lidos no log (`gh run view 44973243958 --log`, não a cor do job, §C7 item 11(3)): backend `# tests 7337 # pass 7335 # fail 0 # skipped 2`; backend-postgres `# tests 1092 # pass 1092 # fail 0`; frontend `# tests 2097 # pass 2097 # fail 0`; flutter `+2069 ~238: All other tests passed!` (o mesmo número do meu 2b); `grep -c 'not ok'` no log inteiro = 0.
- **Veredito parcial: VERDE, concluído.**

## 4. Achados não graves da junta com dono
Fonte: `junta-app/votos/C{1,2,3,4}-voto.json` (objeto `cf781a48`), a Emenda 1.8.3.15, `conf-japp-fix-dp.md`, e o PR #620 (`gh pr view 620` → `OPEN`, head `e15ed435`; lido por `git fetch origin pull/620/head`).
- **Consertados no `d2f55bd1` e presentes no `51acef6b`** (medidos no item 1; mutações conferidas por outra casa, `conf-japp-fix-dp.md` 2.1–2.5, CONFERIDO): C1-01 (EP10), C2-01 (grep = 0), C4-01 (TP3), C4-02 (TP1, contagem de ações), C4-04 (texto), C4-05 (CM10), C4-08 (TF1).
- **Resolvidos por registro na emenda:** C4-03 (PERMITIDO nominal do `auth_repository.dart`), C4-06 e C4-07 (literais no diário: `dev-japp-fix-cl.md:110` em diante). A conferência confirma o escopo do conserto em 9 arquivos (`conf-japp-fix-dp.md` item 4).
- **Triagem do C4-05:** o sucessor marcou "grave" no `C4-voto.json` (`justificativa`), mas a própria cadeira mediu "o produto NÃO mistura pátios; só falta o teste" (`REGISTRO-PENDENTE.md`, 21/11 21:22). A triagem da Emenda 1.8.3.15 como não grave é coerente com essa medição, e o teste (CM10) entrou com a mutação vermelha. Aceito.
- **C3-01 a C3-11 (notas de registro): NÃO estão todos com dono.** `git grep -c <id>` em `agent-orchestration/controle/pendencias.md`:
  | achado | pendência | main | PR #620 |
  |---|---|---|---|
  | C3-02 | `P-APP-SERIAL-LOCK-UNICO` | 0 | 1 |
  | C3-03 | `P-APP-SAIR-LIMPEZA-QUE-LANCA` | 0 | 1 |
  | C3-04 | `P-APP-ORG-SESSAO-DE-ESCUTA-ORFA` | 0 | **0** |
  | C3-05 | `P-APP-COMISSOES-SKELETON-DO-KIT` | 0 | 1 |
  | C3-06 | `P-APP-ORG-COMISSAO-A-RECEBER` | 0 | **0** |
  | C3-07 | (linha sem número do chamado; sem id) | — | **ausente** (grep "número do chamado" = 0) |
  | C3-08 | `P-APP-OSCARD-TRANSBORDA-390` | 0 | 1 |
  C3-01 (conferência visual da A2), C3-09 e C3-10 (diários), C3-11 (pré-revisão do objeto final) são de processo e não aparecem no #620 com destino nomeado. **Achado (registro, não grave): C3-04, C3-06 e C3-07 não têm pendência nem no main nem no PR de registro aberto.**
- **Pendência que o #619 deveria fechar e segue ABERTA no #620:** `P-APP-ORG-ESCOLHA-SAI` (dono `B-APP-ORG-2`; critério "o PR do `B-APP-ORG-2` na `main` sem a tela de escolha ... provado por teste"). O `tenant_selector_screen.dart` não existe no `51acef6b`; a pendência pede fechamento no próximo registro (o #620 foi escrito antes do merge).
- **Ata da junta:** `git ls-tree --name-only origin/main agent-orchestration/omega/juntas/ | grep -iE 'J-619|japp'` → vazio; no PR #620 também vazio. **A ata J-619 não está na main nem no PR de registro aberto** (§C7.1: "junta sem registro = merge inválido" — os votos e a triagem existem fora do repo, em `revisoes/app-org/junta-app/`, e o próprio orquestrador registrou a falta em `REGISTRO-PENDENTE.md` 21/11 22:49). Ressalva de registro, a fechar no próximo PR de registro. Nota lateral, fora deste objeto: a ata J-613 (#613) também não aparece na main nem no #620 (`git grep -l 'J-613' ... omega/juntas` → vazio).
- **Veredito parcial: os achados de produto estão consertados; o registro tem dívida (ata J-619 ausente; C3-04/06/07 sem pendência; `P-APP-ORG-ESCOLHA-SAI` por fechar).**

## 5. Os itens 69/70 fecham?
- `docs/revisoes/SAN3/PLANO_SAN3.md:177-178` na `origin/main`: as linhas 69 e 70 não têm `FECHAD` (`grep -c FECHAD` = 0), e a coluna do dono segue "bloco próprio a abrir". Outros itens fechados trazem `**FECHADO no PR #...**` (ex.: l.170-171, itens 40 e 41).
- `agent-orchestration/controle/pendencias.md` na `origin/main`: `P-APP-LOGIN-MULTI-ORG-SEM-ESCOLHA` (item 69) e `P-APP-TROCA-ORG-NAO-TROCA` (item 70) com `status: ABERTA`.
- `git grep -E 'item 69: FECHA|item 70: FECHA|69 e 70 fecham|...' origin/main` → nada sobre o portão. `Kpis/kpis-latest.json` cita o 69 e o 70 só como itens que entraram.
- O servidor: `gh pr list --state all --search B-APP-ORG-2S` → só o #620 (registro); **não há PR do `B-APP-ORG-2S`**. O diff do #619 não toca `src/`.
- **Veredito parcial: NADA na main declara o 69 ou o 70 fechado. Correto: eles não fecham com este PR** (faltam o `B-APP-ORG-2S` e o ensaio E-69/E-70 na main).

## 6. Limpeza
- **O meu worktree:** `git worktree remove --force ~/w-porteiro-619` → removido; `git worktree prune`; `git worktree list | grep -c porteiro-619` = 0; diretório inexistente. A ref temporária `refs/remotes/porteiro619/pr620` foi apagada (`git update-ref -d`). Os logs desta medição, no scratchpad da sessão, foram apagados (só os que eu criei).
- **Branch remota NÃO apagada (achado de limpeza):** `git ls-remote --heads origin feat/app-org-2-app` → `d2f55bd13f26fe604ffe3b9115937235b6b4157e refs/heads/feat/app-org-2-app` (confirmado por `gh api .../branches/feat/app-org-2-app`). O merge não usou `--delete-branch`, ou a remoção falhou. O mandato dizia "ramo apagado", e isso não é verdade na origem.
- **Worktrees presos ao ramo (listados, NÃO apagados — para o orquestrador):**
  - `~/w-app-int` → `297a6c3e [feat/app-org-2-app]` (a branch LOCAL `feat/app-org-2-app` existe, em `297a6c3e`, 16 commits atrás da remota); `git status --porcelain` = 0 linhas.
  - `~/w-japp-fix` → `d2f55bd1 (detached HEAD)`; `git status --porcelain` = 0 linhas.
  Os dois estão limpos; a remoção (`git worktree remove --force`, depois de conferir processo vivo) e o `git branch -D feat/app-org-2-app` ficam com o orquestrador.
- **Rastreados apagados:** na árvore principal da sessão (ramo `fix/seed-org-demo-pt-br`, outra sessão) há ` D agent-orchestration/omega/juntas/J-515-b-ass-06.md` e ` D docs/revisoes/REGISTRO/reg-noite-0911-dev.md`. Não vêm do #619 (o diff é só `mobile/`) e não estão na ref julgada (§A7); reporto para o orquestrador, sem tocar.
- **Banco:** o bloco não mexe em banco (diff só em `mobile/`); nada a conferir de resíduo.
- **Disco:** `df -h /c` → 130 GB livres; não precisa de `DEEP_CLEAN`.

## Parecer
Fim: 2026-11-21 23:13 SP. Papel `porteiro-619` · modelo **Claude Opus 5.5, nível menor, declarado**.

**O produto confere:** o squash é a árvore do head aprovado, o diff fica em `mobile/`, A1, A2, A3, o conserto de sessão e o conserto único existem no código, os testes reexecutados batem (bloco `+115`, suíte `+2069 ~238`, 0 falha), format e analyze limpos, CI da main verde e concluído. Nenhum achado grave. Nada na main declara o 69 ou o 70 fechado, e eles não fecham: faltam o `B-APP-ORG-2S` (sem PR) e o ensaio E-69/E-70.

**Dívida que viaja junto (nenhuma impede o start, todas fecham no próximo PR de registro e na limpeza):**
1. **Ata J-619 ausente** em `agent-orchestration/omega/juntas/` na main e no #620 (§C7.1). Entra no próximo registro, com a triagem da Emenda 1.8.3.15, a conferência e quem ocupou cada papel. (Lateral: a ata J-613 também não aparece.)
2. **C3-04 (`P-APP-ORG-SESSAO-DE-ESCUTA-ORFA`), C3-06 (`P-APP-ORG-COMISSAO-A-RECEBER`) e C3-07 (linha sem número do chamado) sem pendência** nem na main nem no #620; C3-01, C3-09, C3-10 e C3-11 sem destino nomeado.
3. **`P-APP-ORG-ESCOLHA-SAI` fecha pelo critério dela** (o `tenant_selector_screen.dart` não existe no `51acef6b`) e segue ABERTA no #620. As pendências do #620 com dono `B-APP-ORG-2` que o bloco não consertou precisam de dono novo, já que o bloco mergeou.
4. **Branch remota `feat/app-org-2-app` NÃO apagada** (`d2f55bd1` na origem), mais a branch local em `297a6c3e`, e os worktrees `~/w-app-int` e `~/w-japp-fix` (ambos limpos), para o orquestrador remover (§C5).
5. **O corpo do #619 declara `+2061 ~238`**, a contagem de antes do conserto. A real, reexecutada, é `+2069 ~238`. Corrigir no registro (o corpo do PR mergeado não vale como número oficial).

LIBERADO COM RESSALVA: próxima demanda (o `B-APP-ORG-2S`, a parte do servidor dos itens 69 e 70, ou a que o orquestrador puser na fila) | no próximo PR de registro: a ata J-619; pendências com dono para C3-04, C3-06 e C3-07 (e destino para C3-01, 09, 10 e 11); fechar `P-APP-ORG-ESCOLHA-SAI` e redistribuir as pendências do #620 com dono `B-APP-ORG-2`; a contagem `+2069 ~238` no lugar da `+2061`; e na limpeza apagar a branch remota `feat/app-org-2-app`, a local e os worktrees `w-app-int` e `w-japp-fix`.
