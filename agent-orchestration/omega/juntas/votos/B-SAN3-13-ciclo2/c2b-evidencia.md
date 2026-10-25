papel: cadeira C2 REFEITA (C2b), ciclo 2 | identidade: jurado-san313-c2b-opus | executor: subagente Claude Code genérico (corpo lido do blob do objeto, R1) | corpo: jurado-san313-c2-app-nunca-perde | modelo: Claude Opus 5.5 (claude-opus-5-5; nível menor DECLARADO; substituição: nenhuma) | objeto: cbf2db292f0643b9647017005c361a2e11da61c7 | mandato_md5: ed69d66d01ad35d1d47a476596a87bdf (CR retirado; = md5 cru e = declarado no pré-voo) | corpo_md5: 637aecf020d024a7e5c36a6ea5531d66 (EOL-neutro do blob cbf2db29:.claude/...c2-app-nunca-perde.md; recebido: 637aecf020d024a7e5c36a6ea5531d66) | corpo carregado × blob: IDENTICO | flutter 3.41.6 · dart 3.11.4

- livre em C: 9,9G (piso 7 GB) · memória de commit livre 13,65 GB (P8 c ≥ 4) · SCRATCH: C:/Users/AMP/erp-pausa-2026-10-03/j13c2-c2/ (pasta minha; j13-c2/ e j13-plan-c2/ só leitura, copiados)
- monocultura declarada: achador (jurado-san313-c2-opus), dev do ciclo 2 (dev-san313-c2-opus) e eu rodamos em Claude Opus; toda conclusão abaixo sai de execução minha.
- independência: não li c1-* nem c3-* deste ciclo; li o voto e a evidência da C2 do ciclo 1 (roteiro P3, A RE-VERIFICAR), R-B-SAN3-13-ciclo1.md, a seção Ciclo 2 do plano e o relatório do dev (roteiro).
- legalidade: insp-san313c2-parecer.md (inspetor-san313c2-opus) = LIBERADO COM RESSALVA (R1 corpo do blob; R2 monocultura; R3 disco/limpeza), me nomeia (jurado-san313-c2b-opus), ordem C2b → C1 → C3. Objeto por duas fontes: `git ls-remote origin refs/heads/fix/mobile-minhas-os` = `gh pr view 460` headRefOid = cbf2db29… (OPEN, draft=false, MERGEABLE). Check-runs no mandato: 14 | 0 não-verdes | 0 pendentes; flutter SUCCESS ×2 (re-medidos no fim).
- régua: DADO, unanimidade de 3 com veto, CICLO 2 (todo bloqueia dentro-do-bloco reprova). Vermelho-controle = objeto do ciclo 1 ed4e229e (= cbf2db29~6).
- divergência de terreno declarada: o mandato diz worktree `C:/Users/AMP/j13c2-c2-wt`; o orquestrador, no disparo, mandou `C:/Users/AMP/j13c2-c2b-wt`. Usei o do disparo (exclusivo, prefixo meu); nenhum outro uso de nenhum dos dois.

## Terreno
- `git -C .../ERP_Techsolutios worktree add --detach C:/Users/AMP/j13c2-c2b-wt cbf2db29…` → ec 0; HEAD = objeto; `.git` presente, `.env` ausente; sem junction (sem npm ci).
- `cd .../mobile/flutter_app && timeout -k 15 900 flutter pub get` → ec 0, `Got dependencies!`.
- "Banco" = Drift em memória dos testes; nenhum container, nenhum Postgres/Redis, nenhuma API remota.

## Item 1 — C2-01 e C2-02 por execução (RQ-1, RQ-2, RQ-5)
- Cópias (P3): `j13-c2/zz_j13c2_sonda_test.dart.copia` → `j13c2-c2/sonda_ciclo1.copia` (md5 a2437e59b124ad50fe625ebf8d4ff7de); `j13-plan-c2/zz_plan13c2_p1_test.dart` → `j13c2-c2/p1_plan.copia` (md5 87c48b40…, roteiro). Gerador `j13c2-c2/gen_sondas.py` produz `zz_j13c2b_sonda_test.dart` (md5 cc1124167c790df35d91d0bdd6964e93: S2′/S3′ com a expectativa INVERTIDA e a drenagem; gancho de 2 argumentos pelo ajuste de 1 linha `(o) → (o, acts)` / `real(o) → real(o, acts)`; S1r nova) e `zz_j13c2b_ctl_test.dart` (md5 429be1e8…, igual com o gancho de 1 argumento, para o objeto do ciclo 1). Sonda R8″ minha: `zz_j13c2b_r8_test.dart` (md5 06b4f07073abe22da277772ccde2fc18). Ela usa o `QueryInterceptor` do Drift 2.34 para disparar o escritor em `Zone.root` logo DEPOIS do `DELETE FROM work_orders … AND`, ainda DENTRO da transação; espera 30 ms e conta os materiais dentro dela.
- `flutter test zz_j13c2b_sonda_test.dart zz_j13c2b_r8_test.dart --reporter expanded` (objeto) → ec 0, `+13: All tests passed!` (log `j13c2-c2/sonda-obj.log`):
  - S3′ → `J13C2 S3 janela_disparou=true OS_restantes=[w] materiais_de_w=1 acoes=(work_order_material.add/pending/w)`. Depois de drenar (material e ação `synced`): `OS_restantes=[] materiais_de_w=0`, a OS e as filhas saem.
  - S2′ (`saveAnswer` REAL, run `synced`) → `OS_restantes=[c] run_existe=true respostas=1 acoes_apos=(checklist_answer.upsert/pending)`. Depois de drenar: `OS_restantes=[] run_existe=true`.
  - R8″ ANTES → `n=10 apagou_false=10 material_e_OS_ficam=10`. DURANTE → `n=10 disparou=10 durante=[0 ×10] apagou_linha=10 material_sobrevive=10`: o Drift segura o escritor de fora até o commit, frequência 10/10. DEPOIS → `n=10 apagou_linha=10 material_orfao_sobrevive=10`; o órfão é a `P-MOBILE-ORFAOS-POS-PURGA`, já nomeada. Material pendente apagado: 0 em 30.
  - Predicado atômico, lido no objeto (`git diff ~6..objeto -- mobile/flutter_app/lib`): `deleteWorkOrderUnlessPending` roda numa `transaction` só. O 1º `customUpdate` é `DELETE FROM work_orders WHERE local_id = ? AND sync_status != 'pending' AND NOT EXISTS (SELECT 1 FROM work_order_materials WHERE work_order_local_id = ? AND sync_status != 'synced')`: a linha `pending` e o material entram no MESMO DELETE. As filhas só saem se `deleted == 1`. Não há `await` entre a decisão do predicado e o apagar da linha. A coluna `work_order_materials.sync_status` é `TEXT NOT NULL` (app_database.dart:407), sem NULL que escape do `!=`. No `_reconcile`: fabricada → `deleteWorkOrder`; senão, `!_hasPendingWork` → `deleteWorkOrderUnlessPending`.
- Testes do bloco no objeto: `flutter test bsan313_retencao_ciclo2 bsan313_os_purga_reconcilia bsan313_minhas_os_escopo bsan313_home_lista_e1 --reporter expanded` → ec 0, `+41: All tests passed!` (log `j13c2-c2/t-bloco.log`). IDs vistos: F4–F9, F11–F22, F22b, F24–F27, F26b, F27b, F28a–e, F29–F35, R10. O F31 imprime `apagou=true OS_restantes=[]`.
- VERMELHO-CONTROLE no objeto do ciclo 1. Montagem: `git checkout cbf2db29~4 -- mobile/flutter_app/lib` mais os 2 testes do commit de controle be2eef8f; `git diff --name-only ~6 ~4 -- mobile/flutter_app/lib` = 0, logo a lib é a de ed4e229e. Com `zz_j13c2b_ctl_test.dart`: ec 1, `+25 -6`, todos pela ASSERÇÃO e nenhum por compilação (log `j13c2-c2/ctl6.log`):
  - S3 → `OS_restantes=[] materiais_de_w=0` (`Expected: ['w'] Actual: []`);
  - S2 → `OS_restantes=[]` (`Expected: ['c'] Actual: []`);
  - F29 `Expected ['w'] Actual []`; F28a `Expected ['c'] Actual []`;
  - S1r `divergencias=208`; F24 `chave sem leitor em checklist_run.create: {run_id}`.

  Restauro: `git checkout cbf2db29 -- mobile/flutter_app` → `status --porcelain` com 0 linhas; `hash-object` = blob em work_order_repository.dart, drift_work_order_local_store.dart e bsan313_retencao_ciclo2_test.dart.
- MUTAÇÕES. Runner meu: `j13c2-c2/mut_c2b.py`, md5 final db51ecbc…. Ele usa âncora única CRLF-ciente, `git diff --numstat` e `flutter test … --timeout 30s`, separa compilação de asserção, restaura com `git checkout <objeto> -- f` e confere `hash-object` = blob e `status --porcelain --untracked-files=no` vazio. Saídas em `j13c2-c2/mut-item1.out` e `mut-item2.out`, logs em `mut-<nome>.log`. "Mutante compila" = nenhum marcador de compilação no log E casos irmãos verdes no mesmo arquivo (`+N` > 0 em todas). Não rodei `flutter analyze` por mutante (declarado). Incidente: na 1ª execução o runner não achou `flutter` (FileNotFoundError) com a M-C2-01a aplicada. Restaurei na hora (`git checkout`, hash=blob, status 0), e o runner passou a restaurar em qualquer exceção.
  - M-C2-01a (`NOT EXISTS` sem efeito, `AND 1 = 0`), numstat 1/1 → VERMELHO pela asserção: F29 `Expected ['w'] Actual []`, F30 `Expected false Actual <true>`, minha R8 ANTES `Expected <10> Actual <0>`. Restaurado, hash=blob.
  - M-C2-01b (`_reconcile` chama `deleteWorkOrder` na reconciliada) → VERMELHO: F29 e a minha S3′ `Expected ['w'] Actual []`.
  - M-C2-01c (predicado sem `sync_status != 'pending'`) → VERMELHO: F30 `Expected false Actual <true>`.
  - M-C2-01d (sem `transaction`, com `Future.sync`) → VERMELHO: F31 `Expected length 1 Actual []` E a minha R8 DURANTE `Expected <10> Actual <0>`. Sem a transação, o escritor entra entre o DELETE da linha e o das filhas e some, em 10 de 10.
  - M-C2-02a (gancho só com `run.syncStatus`, (b) e (c) mortos; numstat 3/4) → VERMELHO em 5: F28a–e (`Expected ['c'] Actual []`, `Expected ['ba','bm'] Actual []` …). Desvio 4 do dev CONFIRMADO: a mutação mata (b) e (c), e o F28e depende do (c).
  - M-C2-02b (casar só `server_run_id`) → VERMELHO: F28b `Expected ['ba','bm'] Actual ['bm']`.
  - M-C2-02c (`{'run_id'}` de volta em `checklist_answer.upsert`) → VERMELHO: F24 `Expected true Actual <false>`.
  - M-C2-02d (sem o (c)) → VERMELHO: F28e `Expected ['e'] Actual []`.
  - **Mutação PRÓPRIA, que ninguém listou: o (c) sem a ciência** (`if (ack != null && ack.syncStatus != synced) return true;` → `if (false) …`) → VERDE em retencao + sonda (`+19: All tests passed!`). O F28c usa o `acknowledge` real, que grava a ciência E enfileira a ação, e a ação já retém pelo (b). Nenhum teste isola a ciência gravada e ainda não enfileirada, que é a janela gravar→enfileirar que o (c) declara cobrir (para o marcador, o F28e isola essa janela; para a ciência, nada). Produto: a ciência mora em tabela própria, que este bloco nunca apaga, então nada se perde. A OS só sairia na janela de milissegundos entre gravar a ciência e enfileirá-la. Veredito parcial: ajuste · dentro-do-bloco · não grave (mesma classe da C2-03: ramo novo sem teste que acuse).
- Desvio 2 (F28b com duas OS), lido no objeto. `bm` (`addMarker` real) tem marcador `pending` e ação por `local_run_id`. `ba` (`saveAnswer` real sobre run SEM `serverId`) é segura só pela ação por `local_run_id`, então isola a propriedade "ação pendente que refere o run só por `local_run_id` retém a OS". A M-C2-02b a derruba (`Actual: ['bm']`). O F28b mede a PROPRIEDADE, não só a mutação. Desvio 4: medido acima (5 vermelhos).
- Veredito parcial do item 1:
  - C2-01 FECHADO: material pendente nunca apagado (S3′, F29–F31, R8″ 30/30, vermelho-controle no ciclo 1, M-C2-01a–d vermelhas).
  - C2-02 FECHADO: S2′, F28a–e, S1r com 314 casos e 0 divergências (208 no ciclo 1), M-C2-02a–d vermelhas.
  - Achado novo: C2b-01, ajuste (a ciência do (c) não tem teste que acuse).
  - Item 1 VERDE: nenhum bloqueia.

## Item 2 — C2-03 e o resto dos desvios (RQ-3, RQ-2 F24)
- F32, F33, F34 e F35 estão VERDES no objeto, dentro dos `+41` do item 1 (`j13c2-c2/t-bloco.log`).
- Mutações J, pelo mesmo runner (`j13c2-c2/mut-item2.out`), todas restauradas com hash=blob e status vazio, nenhuma por compilação:
  - J1 (`_pendingActionStatuses` sem `syncing`, numstat 0/1) → VERMELHO pela asserção: F32 `Expected ['sl','sm'] Actual []`. Também ficam vermelhas as minhas S1 (`Expected <0> Actual <52>`) e S1r (`Actual <130>`).
  - J2 (`_serial` sem `try/finally`, numstat 5/7) → VERMELHO por `timeout`: F33 `TimeoutException after 0:00:05` (o `timeout(5s)` do teste). A suíte NÃO travou: terminou em 35 s, `+20 -2`. O 2º vermelho, F35 `Test timed out after 30 seconds`, é colateral: a cauda estática ficou presa pela exceção do F33. É o próprio defeito que a J2 simula; não é instabilidade do objeto.
  - J5 (`allowSeedOrders: true` cravado no provider) → VERMELHO: F34 `Expected: empty Actual: ['wo-local-1','wo-local-2','wo-local-3']`.
  - J6 (API sem caminhada tratada como `complete: true`) → VERMELHO: F35 `Expected ['a','b'] Actual ['a']`.
- `remoteAuthModeProvider`: `grep -n` no objeto. Ele é declarado em l.1021 (`Provider<bool>((_) => kIsRemoteAuth)`) e lido pelos DOIS providers: `workOrderRemoteApiProvider` l.1026 (`if (!ref.watch(remoteAuthModeProvider)) return null;`) e `workOrderRepositoryProvider` l.1045 (`allowSeedOrders: !ref.watch(remoteAuthModeProvider)`). O F34, lido no objeto e verde, sobrescreve o provider com `true` (store vazio) e com `false` (semeia `wo-local-1..3`). A J5 o deixa vermelho.
- F24 reforçado. No objeto, verde. No objeto do ciclo 1 (item 1, `ctl6.log`), vermelho pela chave `run_id`: `chave sem leitor em checklist_run.create: {run_id}`. A M-C2-02c (`{'run_id'}` de volta) o deixa vermelho no objeto. `run_id` entre aspas no repositório = 0 linhas (medido no mandato e coerente com o diff lido).
- Desvio 1 (F21, F25 e R10 sem linha mudada): `git diff cbf2db29~6 cbf2db29 -- …/bsan313_os_purga_reconcilia_test.dart` tem 4 hunks (l.7 import, l.69 API só-lista, l.644 F32/F33/F35, l.676 F24). Nenhuma linha `+`/`-` cita F21, F25 ou R10 (grep = 0), e a única linha removida é a isenção do F24 (`difference({'run_id'})` → `difference(workOrderRunReferenceKeys)`). Os três compilam e passam com o typedef de 2 argumentos, o que prova que não usam lambda de 1 argumento (usam `buildWorkOrderExternalPendingWork`). Desvio CONFIRMADO; nenhuma asserção afrouxada.
- Desvio 3 (6 sítios produtores, não 7): `git grep 'type: ChecklistSyncActionTypes\.'` = 6 sítios, e `runCreate` como tipo gravado = 0 (medido no mandato). Em `checklist_repository.dart` há 6 linhas `'local_run_id':` e 7 linhas `'server_run_id':` (a 7ª é o carimbo do replay, l.406). O F24 conta os sítios e exige ≥ N ocorrências de cada chave no arquivo: é contagem AGREGADA, não uma checagem por sítio.
  - **Mutação PRÓPRIA:** apaguei as 2 linhas de `server_run_id` do sítio `divergenceCreate` (numstat 0/2) → o F24 fica VERDE (`+22: All tests passed!`, `j13c2-c2/mut-f24.out`). As 7 − 1 = 6 ocorrências restantes ainda cobrem os 6 sítios. A asserção dos produtores vê só a FORMA (quantas vezes a chave aparece no arquivo), não a propriedade "cada sítio grava as duas chaves".
  - Impacto no produto: nenhum. Todos os 6 sítios gravam `local_run_id`, e o (b) casa por qualquer das duas chaves; tirar `local_run_id` de um sítio daria 5 < 6 e deixaria o F24 vermelho.
  - Veredito parcial: C2b-02, nota · dentro-do-bloco · não grave.
- Veredito parcial do item 2: C2-03 FECHADO, com J1, J2, J5 e J6 vermelhas pela asserção ou por timeout, sem travar a suíte. Desvios 1 e 3 conferidos; o desvio 3 gera a nota C2b-02. Item 2 VERDE.

## Item 3 — regressão dos itens da C2 do ciclo 1 no objeto (CA-13 a CA-24)
Fonte: a mesma execução `zz_j13c2b_sonda_test.dart` do item 1 (`sonda-obj.log`, `+13`), os `+41` do bloco e as mutações.
- **Matriz S1 (CA-15/16/17/19/24).** É a S1 do ciclo 1 sem mudança: tipos lidos de `api_contracts.dart` pela regex de classe `*SyncActionTypes` × 6 `SyncStatus` × 5 chaves de OS, mais 1 controle. Resultado: `tipos=26 status=6 chaves=5 N=781 ficou=520 saiu=261 divergencias=0`, idêntico ao ciclo 1.
- **S1r, nova: as chaves de run** (`local_run_id`, `server_run_id`). Drift em memória, gancho REAL, run `synced` por OS, mais 2 controles de run de OUTRA OS. Resultado: `tipos=26 status=6 chaves=2 N=314 ficou=208 saiu=106 divergencias=0`.
  - Por que o N mudou: o ciclo 1 media só as 5 chaves de OS (781). As 2 chaves de run passaram a ser LIDAS pelo ramo 4 (b) no ciclo 2, então entram como matriz própria: 26 × 6 × 2 + 2 = 314. Total medido: 781 + 314 = 1095 combinações, 0 divergências.
  - Propriedade medida: fica ⇔ status ∈ {pending, syncing, failed, conflict}, para QUALQUER tipo e QUALQUER das 7 chaves. Run de outra OS não segura (os 2 controles saem).
  - Vermelho-controle: a S1r tem 208 divergências no objeto do ciclo 1, e a J1 deixa S1 (52) e S1r (130) vermelhas.
- **Trava (CA-20).**
  - S5a: `durante={7× false} depois={7× true}` (duas instâncias).
  - S5b: `erro=ArgumentError seguinte=WorkOrderMutationResult`.
  - S5c: `enfileirando_ao_mesmo_tempo=1 total=2`.
  - Os três são iguais ao ciclo 1. `_serial`, `_serialTail` e os 7 invólucros não mudaram no diff (só `_reconcile`, o gancho, o mapa e os providers).
  - VERMELHO-CONTROLE: a FM16 do ciclo 1 (trava por instância, `static` removido de `_serialTail` e `_serial`, numstat 2/2) deixa VERMELHAS a minha S5a (`Expected: empty Actual: [true ×7]`) e o F22 do dev (`Expected ['x'] Actual []`). Restaurada com hash=blob.
- **F16 e a regra de fabricação S4.**
  - F16 está verde nos `+41`.
  - S4 (linha sem serverId e sem `create`, com status_update `pending`, material `pending` e evidência com blob `pending`, `allowSeedOrders:false`) dá `OS_apos_load=[] evid=0 mat=0 acoes=1`, igual ao ciclo 1. A semente sai pelo `deleteWorkOrder` incondicional, que o ciclo 2 não mexeu (C2-04, nota de desenho, não reaberta).
  - `P-MOBILE-ORFAOS-POS-PURGA` (pendencias.md l.11735, BAIXA, dono B-SAN3-16): o item (a) nomeia a ação órfã da S4, e o item (b) nomeia o material e a ação órfãos gravados depois do commit (a minha R8″ DEPOIS, 10/10).
  - O que ela NÃO nomeia: a evidência e o material `pending` da linha FABRICADA, que a S4 mostra apagados (`evid=0 mat=0`), e o blob dessa evidência, que fica sem linha. A frase "Nenhum dado é apagado" vale para (b), não para (a). É dado de linha fabricada, por desenho do plano §2.3. Vira a nota C2b-03 (registro), sem reabrir a C2-04.
- **Verdade parcial (CA-14) e outra organização (F17).**
  - S6: `apos503=2 erro=Erro interno do servidor.`; com a sessão de demonstração `tenant-demo`, `restantes=(e1, real)`, a outra organização não é tocada.
  - S8b: `restantes=(k1, s2) incompleta=false`, o múltiplo exato fecha completo e reconcilia.
  - F4, F5 e F35 verdes; a J6 deixa o F35 vermelho.
- **Query (CA-13).** S8 deu `reqs=3 q0={scope: assigned, openOnly: true, paginate: cursor, limit: 100} q1cursor_igual=true offset=false complete=true ids=(s1, s2)`: a 1ª requisição vai sem cursor, o cursor segue byte a byte, não há `offset` e há dedupe. A rede (`work_order_remote_api.dart`) não mudou no ciclo 2: o diff de lib tem só 3 arquivos (item 1).
- **Busca no caminho de purga** (`tr -d '\r' | sed -n '/_reconcile/,/^  }/p'` e o mesmo para `_purgeFabricatedOrders`): só aparecem `deleteWorkOrder` (fabricada) e `deleteWorkOrderUnlessPending` (reconciliada). No repositório inteiro: `clearAll` = 0, `offset` = 0, `isFinal` = 1, e esse único é um COMENTÁRIO (l.345, "por status local (`isFinal`, F23)"). `grep -rn "clearAll()" lib` não acha chamador. No store Drift, o DELETE sem `WHERE` existe só no corpo de `clearAll` (l.244-246), que ninguém chama.
- **Telas (CA-21/22) e vizinhos.** F26, F26b, F27 e F27b verdes nos `+41`.
  - `flutter test -j 1 b099 b103 work_orders/b115 work_orders/b126 home_screen_test b084 bsan313_×4 --reporter compact` → ec 0, `+150: All tests passed!`, 0 "timed out".
  - Na ordem inversa (bsan313 primeiro): ec 0, `+150`, 0 "timed out". A ordem não muda o resultado; o `b084` está verde.
- Veredito parcial do item 3: sem regressão. Nenhuma das 1095 combinações tira OS com pendência. A trava está igual e a FM16 a acusa. Nada é purgado sob verdade parcial, e a query está igual. A busca não acha caminho novo de apagar. Vizinhos verdes nas duas ordens. Nota C2b-03 (registro da pendência). Item 3 VERDE.

## Objeto no fim e teardown
- `git ls-remote origin refs/heads/fix/mobile-minhas-os` = `gh pr view 460` headRefOid = cbf2db292f0643b9647017005c361a2e11da61c7 (OPEN, draft=false, MERGEABLE). Check-runs pela API: `14 | 0 não-verdes | 0 pendentes`, `flutter` = success,success.
- Sondas `zz_j13c2b_*` apagadas do worktree (contagem 0). SQLite `j13c2-c2-*` nenhum criado (0). Nenhum container. `git status --porcelain` do worktree = 0 linhas antes da remoção. Processos com `j13c2-c2b-wt` na linha de comando, fora powershell/bash: 0.
- `git -C …/ERP_Techsolutios worktree remove --force C:/Users/AMP/j13c2-c2b-wt` → ec 0, diretório removido, `worktree list | grep j13c2-c2b` = 0.
- Disco: os logs pesados (`mut-*.log`, `viz*.log`) foram apagados depois de medidos; ficam os resumos `mut-item1.out`, `mut-item2.out`, `mut-f24.out`, `sonda-obj.log`, `ctl6.log` e `t-bloco.log`. A pasta `j13c2-c2/` ocupa 190K. Livre em C: 9,9G.
- Escritas em w-san313: só `c2b-evidencia.md` e `c2b-voto.json`. Nada commitado.

## Achados (nenhuma proposta de correção)
- **C2b-01** · ajuste · dentro-do-bloco · não grave. O ramo (c) do gancho, na parte da ciência, não tem teste que o acuse: a mutação (c)-sem-ciência fica verde (19/19). A ciência gravada e ainda não enfileirada não segura a OS em nenhum teste. Nada se perde, porque a ciência mora em tabela própria que este bloco nunca apaga.
- **C2b-02** · nota · dentro-do-bloco · não grave. O F24 confere os produtores de vistoria por contagem agregada de `'server_run_id':` no arquivo, não por sítio. Tirar `server_run_id` de um sítio (`divergenceCreate`) deixa o F24 verde (22/22). Sem impacto no produto: `local_run_id` está em todo sítio, e o (b) casa por qualquer das duas chaves.
- **C2b-03** · nota · dentro-do-bloco · não grave (registro). A `P-MOBILE-ORFAOS-POS-PURGA` nomeia a ação órfã da linha fabricada, mas não a evidência e o material pendentes dessa linha que a regra de fabricação apaga, nem o blob que fica sem linha (S4: `evid=0 mat=0 acoes=1`). É desenho (C2-04), não reaberto.
- Achados do ciclo 1: C2-01 FECHADO, C2-02 FECHADO, C2-03 FECHADO. C2-04 sem mudança (nota de desenho), medida igual.

VEREDITO DA CADEIRA C2b: APROVADO
