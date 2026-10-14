Modelo: Claude Opus 5.5 (`claude-opus-5-5`), nível menor, como COBERTURA do Codex (fora pelo limite até 18:14Z) — conforme `D-TOPO-NO-PLANO-E-EM-TODA-REPROVACAO` e a regra do dono de 2026-10-11.

# B-O6R-03a — crítica adversarial do plano v2 — rodada 2 (ÚLTIMA)

> **Papel:** `critico-adversarial` · **identidade:** `critico-b-o6r-03a-r2-opus` (instância nova; não é a r1 nem a tentativa caída anterior) · **ref julgada:** `10e8ce63` (ramo `fix/expense-sync-atomic`) · **estado:** CONCLUÍDO.
> **Limite do papel:** ataque ao plano antes de código; nenhum conserto ou plano substituto (§C7.4-bis).
> A tentativa anterior desta rodada (esqueleto "GPT-5.6 Sol", ref `f80dec91`) caiu; cópia em `C:/Users/AMP/erp-pausa-2026-10-03/03a-parcial/`. Nada dela é herdado como fato.

## 0. Terreno

**Comandos executados:** `git worktree add --detach C:/Users/AMP/w-crit03a-r2 10e8ce63`; `git rev-parse HEAD`; `git diff --stat 9b611468 10e8ce63 -- src tests prisma mobile frontend scripts .github`; `timeout 900 npm ci --no-audit --no-fund` (próprio); `cmd /c dir /AL C:\Users\AMP\w-crit03a-r2` (procura de junction); `uname -a`; `docker run --detach --name crit03a2-pg --publish 127.0.0.1:58431:5432 ... postgres:16` (senha descartável aleatória, fora do parecer); `DATABASE_URL=<crit03a2-pg> timeout 300 node node_modules/prisma/build/index.js migrate deploy`; `SELECT count(*) FROM _prisma_migrations; SHOW default_transaction_isolation`.

**Saída resumida:** HEAD `10e8ce6338df3f371e1150cc87b20e6db391b444`, árvore limpa; entre a base `9b611468` e o objeto só mudaram 3 arquivos de `docs/revisoes/SAN3/` (plano v2, r1, pré-crítica) — **zero diff de produto/teste/schema**. `npm ci` ec 0, 326 pacotes; nenhuma junction no worktree. Máquina `MINGW64_NT-10.0-22631` (Windows do dono, local). Banco próprio `crit03a2-pg` em `127.0.0.1:58431`; `migrate deploy` ec 0; **108** migrações; `read committed`. Base viva (`erp-postgres`, `erp-redis`) não foi tocada.

**Veredito parcial:** terreno próprio e ref correta. O objeto é plano sem implementação: T-A/T-C e as mutações de código do §3/§5 não existem para executar. O que segue é execução de (a) código do HEAD, (b) sondas SQL próprias no banco descartável, (c) um **modelo executável** da tabela de decisão do v2 (§2.1/§4.3), rotulado como modelo — nunca como prova do código futuro.

## 1. A-01 — compatibilidade do recibo legado

### 1.1 Recibo legado do próprio ator: zero lançamento novo

**Comando:** modelo executável da tabela de decisão do v2 (`model.mjs`, implementa §2.1 itens 2–6, §2.2 e §4.3 ao pé da letra: K2 = prefixo de 161 + `JSON.stringify([ator,id])`; leitura crua sempre ativa; dono conferido; SHA-256 de `{v:2,tenantId,actorUserId,clientActionId,type,normalized}`) + gerador `gen.mjs` que enumera **80 instâncias** = 4 estados prévios (`nenhum`, `legado de u1`, `K2 de u1`, `legado de u1 + K2 de u2`) × 2 atores × 2 payloads (igual/divergente) × 5 formas de id (UUID v4 do app, `local:42`, 160 sem `:`, com espaços, >160). `timeout 60 node gen.mjs`.

**Saída resumida:** `newEffectOverOwn = 0` (nenhuma instância cria efeito quando já existe recibo do mesmo ator); `divergentProcessed = 0`. Na forma do app: `legado de u1` + u1 reenvia (igual ou divergente) → `conflict/legacy_payload_unverifiable`, **+0** efeito.

**Veredito parcial:** no modelo, A-01 fechou para o próprio ator: o recibo legado reenviado gera 0 lançamento, sem depender de censo.

### 1.2 O censo e a leitura legada enxergam id com `:` e o id real do app

**Comando:** sonda SQL própria (`sql1.mjs`) em `crit03a2-pg`, sob `SET LOCAL ROLE crit03a2_probe` (NOSUPERUSER NOBYPASSRLS) e GUC de tenant. Grava o recibo cru na forma do app (`3f1c2a9e-…`, UUID v4) mais K2 de u1 e de u2 para o mesmo id externo, e lê pela chave crua. Depois, matriz de mutantes contra os testes do §3, tal como especificados (`matrix.mjs`).

**Saída resumida:** a PK aceita as 3 linhas: crua com 36 caracteres e as duas K2 com 240. A leitura crua acha o legado do app. RLS de outra organização vê **0**. Na matriz, o mutante **M11** da r1 (sem leitura crua) fica VERMELHO em todo A11. O mutante **M11'** ("leitura crua só se o id contém `:`") fica **verde** em `A11(local:42)` e `A11c(<uuid>:x)`, as únicas fixtures legadas que o v2 nomeia, e só fica vermelho com `A11[uuid v4 do app]` e `A11[160 sem ':']`. O app gera `clientActionId ?? _uuid.v4()` (`mobile/flutter_app/lib/core/sync/sync_action_factory.dart:25`).

**Veredito parcial:** a leitura legada do desenho enxerga qualquer forma, com ou sem `:`. A **especificação de teste**, porém, não nomeia a forma real do legado em produção (UUID v4, sem `:`). Um mutante plausível sobrevive à bateria nomeada. Isso confirma o achado 1 da pré-crítica, agora **por execução do modelo**. Vira **A-05 (`ajuste`)**.

**Censo (pergunta "o id legado com `:` é visto?") — comando:** `sql2.mjs` sob o papel sem BYPASSRLS. Ele grava 4 legados (`local:42`, o UUID do app, 160×`z` e os **primeiros 160 caracteres do próprio prefixo P**) e 2 K2 (de `local:42` e do UUID). Depois conta de três formas: total, sem `:` e pelo prefixo de 161.
**Saída:** `{"total":6,"sem_dois_pontos":4,"k2_por_prefixo":2,"legado_por_prefixo":4}`. O critério por `:` mistura legado e K2 nos dois sentidos: a K2 do UUID não tem `:`, e o legado `local:42` tem. O critério por prefixo de 161 separa certo, inclusive o legado adversarial de 160 caracteres que começa como P.
**Veredito parcial:** o censo do v2 (§2.1, "`position(':')` nunca discrimina versão"; categorias por decoder) vê o legado com `:`, e o v2 já não condiciona a compatibilidade ao censo. Esta parte da r1 fechou.

### 1.3 Disjunção de K2 e limites do armazenamento

**Comando:** mesma sonda SQL. Pior caso de K2: 160 unidades que o JSON escapa como `\uXXXX`. Ator em maiúsculas. Id com NUL. Id cortado no meio de um par surrogate.

**Saída resumida:**
- **(2)** O pior caso de K2 tem **1164 caracteres / 1164 bytes** e a PK btree o aceita. Fica abaixo de 2704; não há erro de índice.
- **(3)** Ator gravado como `AAAAAAAA-…` é lido como `aaaaaaaa-…`: `===` em JS dá **false** e `=` em SQL dá **true**.
- **(4)** NUL na leitura crua dá **22021** antes de qualquer escrita: falha fechada.
- **(5)** Dois ids JS distintos com surrogate solto diferente (`…\uD83D` e `…\uDE00`) **colidem** na coluna crua: ambos viram U+FFFD e a leitura de um acha o outro.

A disjunção K2 × legado vale por comprimento: legado ≤160 unidades, K2 ≥161 caracteres ASCII de prefixo. A ida e volta é exata.

**Veredito parcial:** K2 é disjunta de todo id legado válido, e o tamanho cabe na PK atual sem migração. Ficam duas notas, sem risco de dinheiro no emissor de token atual:
- **(3)** O "dono conferido" e a própria K2 dependem de o `sub` chegar canônico. O emissor local usa `setSubject(input.user_id)` (`src/modules/auth/services/jwt.service.ts:40`), mas a verificação não canonicaliza (`authenticated-actor.middleware.ts:39`), e em dev/test o `x-user-id` entra com qualquer caixa. Vira **N-01**.
- **(5)** A colisão de surrogate é pré-existente no legado. No v2 ela resulta em conflito, com falha fechada. Vira **N-02**.

### 1.4 Ação de outro ator com o MESMO id: a premissa do v2 contra o cliente real

**Comandos, todos executados:**
- **(a)** Código do **HEAD** em modo memória (`head_batch.mts`). u1 técnico envia o lote que o app monta, `[expense_report.create X, expense_item.create {report_local_id}]`. Depois u2 (gestor) reenvia o mesmo X com o mesmo payload.
- **(b)** Sonda Flutter no worktree próprio (`test/zz_crit03a2_probe_test.dart`, descartável), com `SyncActionFactory`, `PersistentSyncQueueRepository`, `SyncReplayService` e `DioExpenseSyncBatchApi` **reais**. Um interceptor injeta o token da sessão corrente. A 1ª chamada responde 400 e as seguintes, 200. `timeout 900 flutter test test/zz_crit03a2_probe_test.dart`.
- **(c)** Gerador do item 1.1.

**Saída resumida:**
- **(a)** O lote 1 dá `400 EXPENSE_INVALID required_field`: o app manda `report_local_id`, e o servidor exige `reportId` (`expense_repository.dart:183`, `expense-management.service.ts:204`). Mesmo assim, **relatórios = 1** e o recibo X de u1 fica `processed`. O create comitou e o lote voltou como erro. No HEAD, o reenvio de X sob u2 dá `replayed:true` e **relatórios = 1**.
- **(b)** `+1: All tests passed`. A ação X, com `employeeUserId:"u1"` no payload, é reenviada na chamada 2 com `Authorization: Bearer token-de-u2`. A fila é por aparelho e organização:
  - `SyncAction` não tem campo de usuário (`sync_models.dart:19-28`);
  - a tabela Drift `sync_actions` não tem coluna de usuário e o arquivo é `erp_mobile.db` (`app_database.dart:187,242-253`);
  - `pendingForTenant` inclui `failed` e `conflict` (`sync_queue_repository.dart:37-46`);
  - `logout()` só apaga tokens (`auth_token_storage.dart:89-95`).
- **(c)** No modelo **correto** do v2, `newEffectOverOtherSamePayload = 10`: `legado de u1` + u2 reenvia o mesmo payload, e `K2 de u1` + u2 reenvia o mesmo payload, nas 5 formas de id. Os dois dão `processed`, **+1** efeito.

**Veredito parcial:** o v2 fecha A-01 e A-02 **na definição que ele mesmo adota**. A propriedade P-03a ("dois atores com a mesma chave local são ações diferentes", §0.1) é falsa para o cliente que existe no repositório. Com o app, ids são UUID v4: a colisão independente entre usuários é desprezível, e a forma realista de "dois atores, mesma chave" é **a mesma ação da fila reenviada sob outra sessão**. O gatilho é determinístico: todo lote do app com item volta 400 depois de comitar o create, que fica `failed` na fila. Nessa sequência, o HEAD produz 1 relatório; o v2, 2:
- se u2 for gestor, um segundo relatório de reembolso **para u1**;
- se u2 for técnico, um relatório **de u2 com os valores de u1**.

O A11b do v2 trava esse comportamento como requisito ("u2 mesma chave → um efeito próprio K2"). Vira **A-04 (`bloqueia`)**.

## 2. A-02 — colisão entre atores e replay divergente

**Comando:** `timeout 60 node matrix.mjs` roda 7 variantes do modelo contra os testes do §3, escritos como o v2 os especifica:
- variantes: correto, M10 combinado, M10 isolado (WHERE), C3-mut (hash sem ator), M11, M11' e M11'';
- testes: A11, A11c, A12, A12b, C3, mais duas fixtures de controle: A11 com o UUID do app e A12 com o `spentAt` de u2 diferente do de u1, como acontece quando cada aparelho gera o seu.

O gerador do item 1.1 cobre as 80 instâncias.

**Saída resumida (vermelho = o teste pega o mutante):**

| mutante | A11 local:42 | A11c | A11 uuid app | A11 160 | A12 (spec) | A12 fixture realista | A12b | C3 |
|---|---|---|---|---|---|---|---|---|
| correto | verde | verde | verde | verde | verde | verde | verde | verde |
| M10 combinado | verde | verde | verde | verde | **VERMELHO** | verde | verde | **VERMELHO** |
| M10 isolado (WHERE) | verde | verde | verde | verde | verde | verde | **VERMELHO** | verde |
| C3-mut (hash sem ator) | verde | verde | verde | verde | verde | verde | verde | **VERMELHO** |
| M11 | **VERM.** | **VERM.** | **VERM.** | **VERM.** | verde | verde | verde | verde |
| M11' (só com `:`) | verde | verde | **VERM.** | **VERM.** | verde | verde | verde | verde |
| M11'' (só sem `:`) | **VERM.** | **VERM.** | verde | verde | verde | verde | verde | verde |

No modelo correto, as 80 instâncias dão `divergentProcessed = 0`: replay divergente nunca é aceito, inclusive o de outro ator na mesma chave.

**Veredito parcial:** A-02 fechou no desenho. Ator no hash, ator no WHERE e agregado derivado do recibo bastam, e cada proteção tem um teste que pega a sua remoção isolada: C3 pega o hash sem ator; A12b, o WHERE sem ator.

Confirmo **em parte** o achado 2 da pré-crítica:
- o A12 só dá o vermelho **funcional** do M10 combinado se o replay de u2 "com 10" for **idêntico campo a campo** ao comando de u1;
- com fixture realista (`spentAt` diferente), o A12 fica verde sob o mutante;
- mesmo assim, a bateria **ainda pega** o M10 combinado pelo C3 (função pura). A afirmação do v2 "A12/B7 matam M10 combinado" (§3, §5) só vale com a fixture exata.

Vira **A-06 (`ajuste`)**: especificação de fixture, sem buraco de dinheiro, porque o C3 cobre.

## 3. Versão, rollback, drenagem e conflito manual

### 3.1 Rollback para o binário antigo com a rota aberta

**Comando:** código do **HEAD** em modo memória (`head_rollback.mts`). O repositório recebe o estado que a versão nova deixaria: relatório + recibo K2 de u1 para X, sem recibo cru. Depois o binário antigo recebe o replay fiel de X sob u1.

**Saída resumida:** antes, `relatorios = 1`; depois, `[{status:"processed",replayed:false}]` e **`relatorios = 2`**.

**Veredito parcial:** o binário antigo com a rota aberta lança dinheiro duas vezes, como o §10.5 afirma. A premissa do v2 está **correta**, e a proibição de rollback simples é necessária.

### 3.2 A condição executável da drenagem e do "rollback com sync fechado"

**Comandos:**
- `grep` de chave de desligamento em `src/modules/expense-management/expense-management.routes.ts` e `src/config/env.ts`: nenhuma;
- `grep -n "path|route|deny|block" fly.production.toml`: só os `path` dos health checks;
- `sed -n 241,262p docs/deployment.md` (Runbook A);
- `grep` em `.github/workflows/deploy-production.yml` (trava (c));
- `gh run list --workflow deploy-staging.yml --limit 3`.

**Saída resumida:**
- O binário antigo não tem chave para fechar só o sync de despesas, e o `fly.production.toml` não bloqueia por caminho.
- O **Runbook A** manda, como rollback, *"redeploy da imagem `:<sha-anterior>` — simétrico"* com tráfego (`docs/deployment.md:243-245`), e o ensaio de go-live é exatamente `deploy N → imagem N-1 → smoke verde` (`:253-255`). A trava (c) do CD de produção exige esse ensaio (`deploy-production.yml:34-35,109-121`).
- O deploy de staging está **desligado**: as 3 últimas execuções saíram `skipped`. Hoje não existe ambiente vivo com escritor antigo.

**Veredito parcial:** o §10.5 está certo no mérito, mas deixa três lacunas:
1. **"Reverter código mantendo sync de despesas fechado"** não tem mecanismo: nem o binário antigo nem a plataforma isolam a rota. Na prática, isso significa API inteira parada.
2. **O item 3 do drill entrega ao dev/C1** a prova de que *"voltar ao binário antigo mantém a rota inacessível"*, critério que nenhum dos dois consegue demonstrar sem infraestrutura que o próprio bloco proíbe criar. É critério impossível de passar, e vira insumo de reprovação de junta por processo.
3. **O Runbook A e a trava (c)**, vigentes no repositório, prescrevem o rollback que o v2 declara capaz de duplicar dinheiro, e o v2 **não registra esse conflito** (§A2).

Isso vira **A-07 (`ajuste`)**. Não há risco vivo hoje, e a pendência P-O6R-B03-PUBLICACAO-SEM-WRITER-ANTIGO já bloqueia a ativação; falta nomear os artefatos em conflito e tirar do dev a prova impossível.

### 3.3 Conflito manual: sem saída ou com segundo lançamento?

**Comando:** 2º caso da sonda Flutter. A ação recebe `conflict/legacy_payload_unverifiable` em 7 ciclos seguidos de `replayTenant`, e depois passa por `resolveConflictAction(keepMine)` (código real). Em seguida, `sed -n 99-112p expense-management.controller.ts`.

**Saída resumida:** `envios=7 status=conflict retry=0 keepMine.id_igual=true keepMine.status=pending`, `+2: All tests passed`. O controller grava 1 auditoria `outcome:"success"` por lote, inclusive quando o lote só tem conflitos.

**Veredito parcial:** nenhum caminho do app gera id novo a partir de conflito: `keepMine` preserva o id e `useServer` marca como sincronizado. Logo o conflito manual **não abre segundo lançamento** e **não perde o efeito**, que já existe no legado.

Há um efeito colateral que o v2 introduz: um recibo legado do próprio ator, que no HEAD terminava como `processed/replayed` e saía da fila, passa a ser conflito **reenviado em todo ciclo, sem limite**, porque `pendingForTenant` inclui `conflict` e o `retryCount` não sobe. Cada ciclo grava uma auditoria de "sucesso". Isso vira **N-03 (`nota`, dono 03b)**.

### 3.4 Ação presa e efeito duplo: instâncias geradas

**Comando:** o gerador do item 1.1, com as 80 instâncias.

**Saída resumida:** 0 instâncias de aceite divergente e 0 de efeito novo sobre recibo do próprio ator. As **10 instâncias** de efeito novo com o mesmo payload sobre recibo de **outro** ator são o A-04. Conflitos permanentes (`legacy_payload_unverifiable`, `receipt_ambiguous`) só ocorrem quando o efeito original existe; nenhum deles retém ação sem efeito.

**Veredito parcial:** fora o A-04, o v2 não cria caminho de perda de dado nem de segundo lançamento entre as instâncias geradas.

## 4. Migração e aderência de escopo

**Comandos:**
- `git diff --stat 9b611468 10e8ce63 -- prisma migrations`;
- `git ls-files migrations | wc -l`;
- `git grep -n -E "mobile_action_receipts|MobileActionReceipt|mobileActionReceipt" 10e8ce63 -- src scripts frontend mobile prisma tests .github ':!*.md'`;
- `grep` de `prisma/|migrations/|migra` no plano;
- no banco descartável: `pg_indexes` e `datcollate` da tabela, além dos INSERTs de K2 da sonda 1.2/1.3 sob papel sem BYPASSRLS.

**Saída resumida:**
- O diff de `prisma/` e `migrations/` é **vazio**, e `migrations/` tem 0 arquivos rastreados.
- A tabela só aparece em `src/modules/expense-management/**` (5 arquivos), no `schema.prisma` e na migração fundadora `20260619000000`. Nenhum teste, script, frontend ou mobile a usa.
- O plano só menciona `prisma` no `migrate deploy`/`generate` do banco descartável e na proibição do §6.2.
- K2 de 240 a 1164 bytes entra na PK `mobile_action_receipts_pkey (tenant_id, client_action_id)`. `status='processed'` passa no CHECK. `actor_user_id uuid` e `payload_hash TEXT` existem.
- Índices existentes: PK, `tenant_id`, `(tenant_id, actor_user_id)`, `action_type` e `status`. Collation `en_US.utf8`.

**Veredito parcial:** nada do v2 **como escrito** exige `prisma/**` ou `migrations/**`. A parada da l.243 não é acionada por A-01/A-02.

**Ressalva para o replanejamento:** o remédio do A-04 pode reabrir essa porta. Se ele precisar localizar, por **id externo**, um recibo K2 de **outro** ator, a K2 atual (`[ator,id]`, ator primeiro) não serve de prefixo, e nenhum índice existente cobre essa busca. Medir isso é do planejador. Se exigir índice ou coluna, vale a parada: **BLOCO PARA: exige migração**.

## Achados

Numeração contínua com a r1 (A-01..A-03). A-01 e A-02 da r1 **fecharam** no desenho do v2 (itens 1.1, 1.2 e 2); A-03 segue como nota de método, já absorvida pelo §3 do v2.

### A-04 — `bloqueia` · escopo `dentro-do-bloco` — a ação da fila de u1, reenviada sob a sessão de u2, vira um segundo lançamento

**Evidência executada:**
1. **HEAD em memória:** o lote que o app monta (`create X` + `item {report_local_id}`) devolve `400 required_field` **depois** de comitar o create, com `relatorios = 1` e recibo X `processed`. O create fica `failed` na fila. No HEAD, o reenvio de X sob u2 dá `replayed:true` e `relatorios = 1`.
2. **Sonda Flutter com classes reais:** X, com `employeeUserId:"u1"`, é reenviado com `Bearer token-de-u2`.
   - `SyncAction` não tem usuário, e a `sync_actions` do `erp_mobile.db` também não (`sync_models.dart:19-28`, `app_database.dart:187,242-253`).
   - `pendingForTenant` inclui `failed`/`conflict` (`sync_queue_repository.dart:37-46`), e `logout()` só apaga tokens.
3. **Modelo do v2 correto:** 10 instâncias dão **+1 efeito** com payload idêntico sobre recibo de outro ator: `legado de u1` e `K2 de u1` × as 5 formas de id. O **A11b** do v2 exige esse resultado.

**Evidência de escopo:** na mesma sequência, o HEAD de `10e8ce63`, anterior ao bloco, produz **1** relatório, medido no item 1.4(a). O segundo nasce da regra "outro ator ⇒ K2 própria ⇒ efeito novo", desenhada neste bloco: §2.1 item 3, A3/B1/A11b em `7ed1a7ca`/`f80dec91`. O comportamento da fila é anterior ao bloco, mas era inofensivo sob a chave crua.

**Alcance no tempo:** hoje o app manda o lote **sem token**. `syncBatchApiProvider` usa `const ApiConfig()` (`sync_providers.dart:51,109-112`), que é o Ω6R-QUA-001, aberto e de dono 03b. A duplicação fica **latente até o 03b autenticar o provedor**. O teste que o QUA-001 recomenda ("sem sessão fila não é consumida") não cobre **sessão de outro usuário**, e o §9.2 do v2 não entrega ao 03b nenhuma obrigação sobre isso.

**Motivo:**
- Com o app, ids são UUID v4. "Dois atores com a mesma chave local" quase nunca são duas ações independentes; são a **mesma** ação da fila do aparelho reenviada sob outra sessão.
- A P-03a do v2 (§0.1, "dois atores com a mesma chave local são ações diferentes") é **premissa falsa** para o cliente real.
- O teste de encerramento do `PLANO_SAN3.md:243` ("2 usuários com a mesma chave local → 2 lançamentos") e o §6 do CLAUDE.md ("tenant + usuário + client_action_id") também partem dela. Daí um **conflito de fonte**, que pelo §A2 se registra antes de consolidar, e que o v2 não registra.
- O dano é dinheiro:
  - se u2 for gestor, um segundo relatório de reembolso **para u1**;
  - se u2 for técnico, um relatório **de u2 com os valores de u1**.
- A decisão sobre quem garante que uma ação enfileirada nunca vire efeito novo sob outra sessão muda a semântica do A11b/A3/B1 ou o contrato entregue ao 03b. Por isso precisa existir antes do dev. Se ela contrariar o critério aprovado no `PLANO_SAN3`, é do dono.
- Se o remédio exigir localizar recibo de outro ator por id externo, a K2 atual não indexa essa busca (item 4), e vale a parada da l.243.

### A-05 — `ajuste` · `dentro-do-bloco` — nenhuma fixture legada nomeada tem a forma real do legado (UUID v4)

**Evidência:**
- A matriz do item 2 mostra o mutante M11' ("leitura crua só se o id contém `:`") verde em `A11(local:42)` e `A11c(<uuid>:x)`, as únicas fixtures legadas que o v2 nomeia em A11/B6/A11c/E10/§10.5.
- Ele só fica vermelho com o UUID do app ou com um id de 160 caracteres sem `:`.
- O app gera `_uuid.v4()` (`sync_action_factory.dart:25`).

**Motivo:** a bateria nomeada deixa vivo um mutante plausível, justamente na forma de dado que existe. O achado 1 da pré-crítica fica confirmado por execução do modelo.

### A-06 — `ajuste` · `dentro-do-bloco` — o A12 só é o vermelho funcional do M10 combinado com o comando de u1 idêntico

**Evidência:** pela matriz do item 2, o M10 combinado fica vermelho no A12 só com o replay de u2 igual campo a campo ao comando de u1. Com `spentAt` diferente, como acontece naturalmente entre aparelhos, o A12 fica verde, e só o C3 (função pura) o pega.

**Motivo:** o v2 afirma "A12/B7 matam M10 combinado" (§3, §5) e pede um vermelho por asserção de negócio. Sem fixar a fixture, essa promessa pode sair falsa, embora a bateria como um todo continue pegando o mutante pelo C3. O achado 2 da pré-crítica fica confirmado **em parte**.

### A-07 — `ajuste` · `dentro-do-bloco` — o drill do §10.5 pede ao dev uma prova impossível, e o v2 não registra o conflito com o Runbook A

**Evidência:**
- O binário antigo, com um recibo K2, lança um segundo relatório (`relatorios 1 → 2`), o que confirma o perigo.
- Não existe chave para fechar só o sync, nem no binário nem no `fly.production.toml`.
- O Runbook A manda o rollback simétrico N-1 com tráfego (`docs/deployment.md:243-255`), e a trava (c) do CD exige esse ensaio (`deploy-production.yml:34-35,109-121`).
- O staging está desligado: 3 execuções `skipped`.

**Motivo:**
- "Reverter mantendo sync fechado" não tem mecanismo; na prática, significa API inteira parada.
- O item 3 do drill pede ao dev/C1 a prova de que *voltar ao binário antigo mantém a rota inacessível*. É critério impossível de passar dentro do escopo do bloco, e vira artefato de reprovação por processo.
- O artefato operacional vigente prescreve o rollback que o v2 proíbe, sem registro do conflito (§A2).

### Notas

- **N-01 (`nota`).** "Dono conferido" e K2 dependem de `sub` canônico. Uma linha gravada com o ator em maiúsculas é lida em minúsculas: `===` em JS dá false e `=` em SQL dá true (item 1.3). Hoje o emissor usa `setSubject(input.user_id)`, mas a verificação não canonicaliza, e em dev/test o `x-user-id` entra com qualquer caixa. É o achado 5 da pré-crítica, sem caminho de produção no emissor atual.
- **N-02 (`nota`, `pre-existente`).** Na coluna crua, ids distintos com surrogate solto colidem, porque viram U+FFFD (item 1.3). No v2 isso vira conflito, com falha fechada.
- **N-03 (`nota`, dono 03b).** O legado do próprio ator vira conflito **reenviado em todo ciclo, sem limite**: 7 de 7 envios com `retry=0` na sonda. Cada lote grava uma auditoria com outcome success (item 3.3). O HEAD, por sua vez, terminava a ação.
- **N-04 (`nota`).** Achados da pré-crítica que conferi ou deixei de conferir:
  - **3** coincide com o §10.4 do v2: efeito legado sem recibo não se recupera.
  - **4** foi confirmado na parte do app pelo item 1.4(a): `report_local_id` dá 400.
  - **6** (rebaixamento de permissão, que dá falso conflito com falha fechada) **não foi executado**.
  - **7** (REST sem idempotência) está fora do escopo do bloco.
  - **8** foi confirmado pelo item 4.

## Veredito

**VOLTA AO PLANO.**

**O que sobreviveu ao ataque e pode virar requisito sem retrabalho:**
- **A-01** fechou para o próprio ator: 0 efeito novo em 80 instâncias, leitura crua independente de forma e censo por prefixo correto.
- **A-02** fechou: 0 replay divergente aceito, e cada proteção tem um teste que pega a sua remoção isolada.
- A K2 é disjunta de todo id legado e cabe na PK atual, pior caso de 1164 bytes.
- Nada do v2 exige migração.
- A proibição de rollback simples tem fundamento medido (1 → 2 relatórios no binário antigo).
- O conflito manual do app atual não gera segundo lançamento.

**O que impede o dev de começar:** **1 achado `bloqueia`, o A-04.** A premissa central do v2 ("dois atores com a mesma chave local são ações diferentes") é falsa para o cliente que está no repositório. Com o app autenticado, que é o que o 03b vai entregar, a fila por aparelho reenvia a ação de u1 sob a sessão de u2, e o v2 a lança de novo. O A11b do próprio v2 exige esse resultado.

A volta é **estreita**. A v3 precisa:
1. corrigir a P-03a;
2. registrar o conflito de fonte com `PLANO_SAN3.md:243` e com o §6 do CLAUDE.md (§A2);
3. obter a decisão, do dono se ela contrariar o critério aprovado, sobre quem garante que uma ação enfileirada não vira efeito novo sob outra sessão, e com qual trava na ativação do 03a ou no DoD do 03b;
4. alinhar A11b/A3/B1 a essa decisão;
5. absorver A-05, A-06 e A-07.

O restante do v2 não precisa ser refeito.

Esta é a 2ª e última rodada de crítica do plano (corpo do `critico-adversarial`): não há r3. Os itens acima entram como **requisitos explícitos** na v3.

## Apêndice — sondas, para re-execução (P3)

Os scripts viviam no scratchpad da sessão e no worktree descartável, ambos removidos. Estão transcritos aqui na íntegra para o sucessor ou a junta re-executarem. Os `.mjs` rodam com `node` a partir de um diretório que contenha os três juntos. Os `.mts` rodam com `CORE_SAAS_PERSISTENCE=memory node --import tsx <arquivo> <raiz-do-worktree>`. A sonda Dart vai em `mobile/flutter_app/test/` de um worktree próprio e roda com `flutter test`. As sondas SQL estão descritas nos itens 1.2, 1.3 e 4, com papel NOSUPERUSER NOBYPASSRLS e `ROLLBACK` ao fim.

### model.mjs

```js
// MODELO EXECUTÁVEL da tabela de decisão do plano v2 (§2.1, §2.2, §4.2, §4.3). NÃO é o código futuro.
import { createHash } from "node:crypto";
const P = "expense-sync-v2/".padEnd(161, "~");
const norm = (id) => id.trim().slice(0, 160);
const K2 = (actor, id) => P + JSON.stringify([actor, id]);
const canon = (v) => Array.isArray(v) ? v.map(canon) : (v && typeof v === "object") ? Object.fromEntries(Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => [k, canon(v[k])])) : v;
export function fp(m, t, actor, id, type, cmd) {
  const o = m.fpNoActor ? { v: 2, tenantId: t, clientActionId: id, type, normalized: cmd } : { v: 2, tenantId: t, actorUserId: actor, clientActionId: id, type, normalized: cmd };
  return createHash("sha256").update(JSON.stringify(canon(o))).digest("hex");
}
export function newStore() { return { receipts: new Map(), events: [], effects: [] }; }
export function run(S, m, t, actor, rawId, type, cmd) {
  const id = norm(rawId);
  const doRaw = m.skipRaw ? false : m.rawOnlyIfColon ? id.includes(":") : m.rawOnlyIfNoColon ? !id.includes(":") : true;
  const raw = doRaw ? S.receipts.get(t + "|" + id) : undefined;
  const k2 = S.receipts.get(t + "|" + K2(actor, id));
  const rawOwn = raw && raw.actor === actor;
  const h = fp(m, t, actor, id, type, cmd);
  if (rawOwn && k2) return { status: "conflict", code: "receipt_ambiguous" };
  if (rawOwn) return { status: "conflict", code: raw.type !== type ? "payload_mismatch" : "legacy_payload_unverifiable", resultRef: raw.resultRef };
  if (k2) {
    if (k2.actor !== actor || k2.status !== "processed" || !k2.resultRef) return { status: "conflict", code: "receipt_unverifiable" };
    if (k2.type !== type) return { status: "conflict", code: "payload_mismatch", resultRef: k2.resultRef };
    const agg = k2.aggregate;
    const evs = S.events.filter(e => e.aggregate === agg && e.type === "synced" && (m.whereNoActor ? true : e.actor === actor));
    if (evs.some(e => e.hash === h)) return { status: "processed", replayed: true, resultRef: k2.resultRef };
    if (evs.length) return { status: "conflict", code: "payload_mismatch", resultRef: k2.resultRef };
    return { status: "conflict", code: "receipt_unverifiable" };
  }
  const ref = "ref" + (S.effects.length + 1);
  const agg = cmd.reportId ?? ref;
  S.effects.push({ actor, id, type, cmd, ref });
  S.receipts.set(t + "|" + K2(actor, id), { actor, type, status: "processed", resultRef: ref, aggregate: agg });
  S.events.push({ aggregate: agg, type: "synced", hash: h, actor });
  return { status: "processed", replayed: false, resultRef: ref };
}
export function seedLegacy(S, t, actor, rawId, type, cmd) { // o que o HEAD grava: chave crua, sem prova de payload
  const id = norm(rawId); const ref = "legacy" + (S.effects.length + 1);
  S.effects.push({ actor, id, type, cmd, ref, legacy: true });
  S.receipts.set(t + "|" + id, { actor, type, status: "processed", resultRef: ref, aggregate: ref });
}
```

### matrix.mjs

```js
import { newStore, run, seedLegacy, fp } from "./model.mjs";
const T = "t1", u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", u2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const R = "rrrrrrrr-rrrr-4rrr-8rrr-rrrrrrrrrrrr";
const item = (amount, extra = {}) => ({ reportId: R, categoryKey: "fuel", spentAt: "2026-10-11T10:00:00.000Z", amount, currency: "BRL", ...extra });
const create = (adv = 100) => ({ employeeUserId: u1, periodStart: "2026-10-11", periodEnd: "2026-10-11", origin: "mobile", advanceAmount: adv, currency: "BRL" });
const APPID = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";
// ---- testes como o v2 os especifica (§3), parametrizados pelo id legado ----
const tests = {
  "A11(local:42)": (m) => { const S = newStore(); seedLegacy(S, T, u1, "local:42", "create", create()); const a = run(S, m, T, u1, "local:42", "create", create()); const b = run(S, m, T, u1, "local:42", "create", create(999)); return S.effects.length === 1 && a.status === "conflict" && b.status === "conflict"; },
  "A11c(<uuid>:x)": (m) => { const S = newStore(); seedLegacy(S, T, u1, u2 + ":x", "create", create()); const a = run(S, m, T, u1, u2 + ":x", "create", create()); return S.effects.length === 1 && a.status === "conflict"; },
  "A11[app uuid v4]": (m) => { const S = newStore(); seedLegacy(S, T, u1, APPID, "create", create()); const a = run(S, m, T, u1, APPID, "create", create()); return S.effects.length === 1 && a.status === "conflict"; },
  "A11[160 sem ':']": (m) => { const id = "z".repeat(160); const S = newStore(); seedLegacy(S, T, u1, id, "create", create()); const a = run(S, m, T, u1, id, "create", create()); return S.effects.length === 1 && a.status === "conflict"; },
  "A12(spec: u2 replay = cmd de u1)": (m) => { const S = newStore(); run(S, m, T, u1, "X", "item", item(10)); run(S, m, T, u2, "X", "item", item(20)); const a = run(S, m, T, u2, "X", "item", item(10)); const b = run(S, m, T, u2, "X", "item", item(20)); return a.status === "conflict" && b.status === "processed" && S.effects.length === 2; },
  "A12[fixture realista: spentAt de u2 difere]": (m) => { const S = newStore(); run(S, m, T, u1, "X", "item", item(10)); run(S, m, T, u2, "X", "item", item(20, { spentAt: "2026-10-11T10:05:00.000Z" })); const a = run(S, m, T, u2, "X", "item", item(10, { spentAt: "2026-10-11T10:05:00.000Z" })); return a.status === "conflict" && S.effects.length === 2; },
  "A12b(evento de u2 movido p/ u1)": (m) => { const S = newStore(); run(S, m, T, u2, "X", "item", item(20)); const ev = S.events.find(e => e.actor === u2); const h = fp({}, T, u2, "X", "item", item(10)); S.events.push({ aggregate: R, type: "synced", hash: h, actor: u1 }); S.events.splice(S.events.indexOf(ev), 1); const a = run(S, m, T, u2, "X", "item", item(10)); return a.status === "conflict"; },
  "C3(hash muda com ator)": (m) => fp(m, T, u1, "X", "item", item(10)) !== fp(m, T, u2, "X", "item", item(10)),
};
const mutants = { "correto": {}, "M10 combinado": { fpNoActor: 1, whereNoActor: 1 }, "M10 isolado (WHERE)": { whereNoActor: 1 }, "C3-mut (hash sem ator)": { fpNoActor: 1 }, "M11 (sem lookup cru)": { skipRaw: 1 }, "M11' (cru só se tem ':')": { rawOnlyIfColon: 1 }, "M11'' (cru só se NÃO tem ':')": { rawOnlyIfNoColon: 1 } };
const names = Object.keys(tests);
console.log(["mutante", ...names].join(" | "));
for (const [mn, m] of Object.entries(mutants)) console.log([mn, ...names.map(n => tests[n](m) ? "verde" : "VERMELHO")].join(" | "));
```

### gen.mjs

```js
// Gera TODAS as instâncias (estado prévio × ator do pedido × payload × forma do id) e roda o MODELO correto do v2.
import { newStore, run, seedLegacy } from "./model.mjs";
const T = "t1", u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", u2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ids = { uuid_app: "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f", colon: "local:42", len160: "z".repeat(160), padded: "  pad-1  ", over160: "y".repeat(200) };
const cmdA = { employeeUserId: u1, periodStart: "2026-10-11", periodEnd: "2026-10-11", origin: "mobile", advanceAmount: 100, currency: "BRL" };
const cmdB = { ...cmdA, advanceAmount: 999 };
const priors = {
  none: () => {},
  legacy_u1: (S, id) => seedLegacy(S, T, u1, id, "create", cmdA),
  k2_u1: (S, id) => run(S, {}, T, u1, id, "create", cmdA),
  legacy_u1_and_k2_u2: (S, id) => { seedLegacy(S, T, u1, id, "create", cmdA); run(S, {}, T, u2, id, "create", cmdA); },
};
let n = 0; const viol = { divergentProcessed: [], newEffectOverOwn: [], newEffectOverOtherSamePayload: [] };
const rows = [];
for (const [pn, prior] of Object.entries(priors)) for (const actor of [u1, u2]) for (const [cn, cmd] of [["igual", cmdA], ["divergente", cmdB]]) for (const [iname, id] of Object.entries(ids)) {
  const S = newStore(); prior(S, id); const before = S.effects.length;
  const ownBefore = [...S.receipts.values()].some(r => r.actor === actor);
  const otherBefore = [...S.receipts.values()].some(r => r.actor !== actor);
  const r = run(S, {}, T, actor, id, "create", cmd); n++;
  const delta = S.effects.length - before;
  const who = actor === u1 ? "u1" : "u2";
  if (r.status === "processed" && r.replayed && cn === "divergente") viol.divergentProcessed.push(`${pn}/${who}/${iname}`);
  if (delta > 0 && ownBefore) viol.newEffectOverOwn.push(`${pn}/${who}/${iname}`);
  if (delta > 0 && otherBefore && cn === "igual") viol.newEffectOverOtherSamePayload.push(`${pn}/${who}/${iname}`);
  if (iname === "uuid_app") rows.push(`${pn} | ${who} | ${cn} | ${r.status}${r.code ? "/" + r.code : ""} | +${delta}`);
}
console.log("instancias =", n);
console.log("forma uuid_app (a do app):\nprior | ator | payload | resposta | efeitos novos"); rows.forEach(r => console.log(r));
for (const [k, v] of Object.entries(viol)) console.log(k, "=", v.length, v.length ? JSON.stringify(v.filter(x => x.endsWith("uuid_app"))) : "");
```

### sql2.mjs

```js
import pg from "pg";
const c = new pg.Client({ connectionString: process.env.CRIT_DB, application_name: "crit03a2-sql2" }); await c.connect(); const q = (s, p) => c.query(s, p);
const T = "11111111-1111-4111-8111-111111111111", u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", u2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const P = "expense-sync-v2/".padEnd(161, "~"); const K2 = (a, id) => P + JSON.stringify([a, id]);
await q("BEGIN"); await q("SET LOCAL ROLE crit03a2_probe"); await q("SELECT set_config('app.current_tenant_id',$1,true)", [T]);
const ins = (id, actor) => q("INSERT INTO mobile_action_receipts(tenant_id,client_action_id,actor_user_id,action_type,status,result_ref,processed_at) VALUES ($1,$2,$3,'expense_report.create','processed','r',now())", [T, id, actor]);
// legado: local:42, uuid do app, 160 chars, e um legado que COMEÇA com o texto do prefixo mas tem 160
await ins("local:42", u1); await ins("3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f", u1); await ins("z".repeat(160), u2); await ins(P.slice(0, 160), u2);
await ins(K2(u1, "local:42"), u1); await ins(K2(u2, "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f"), u2);
const r = await q(`SELECT count(*)::int total,
  count(*) FILTER (WHERE position(':' in client_action_id)=0)::int sem_dois_pontos,
  count(*) FILTER (WHERE left(client_action_id,161)=$1)::int k2_por_prefixo,
  count(*) FILTER (WHERE left(client_action_id,161)<>$1)::int legado_por_prefixo
  FROM mobile_action_receipts WHERE tenant_id=$2`, [P, T]);
console.log("censo:", JSON.stringify(r.rows[0]));
await q("ROLLBACK"); await c.end();
```

### head_batch.mts

```ts
// Sonda: código do HEAD 10e8ce63 (modo memória). Lote do app [create X, item(report_local_id)].
const W = process.argv[2];
const svcMod = await import(`file:///${W}/src/modules/expense-management/expense-management.service.ts`);
const { ROLE_PERMISSIONS } = await import(`file:///${W}/src/modules/core-saas/permissions/catalog.ts`).catch(() => ({} as any));
svcMod.resetExpenseManagementRuntimeForTests();
const svc = svcMod.createMemoryExpenseManagementService();
const repo = svcMod.getMemoryExpenseManagementRepositoryForTests();
const T = "11111111-1111-4111-8111-111111111111";
const u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const u2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const tech = ["expense_report:read_own","expense_report:create","expense_report:update","expense_report:submit","expense_sync:write"];
const mgr = ["expense_report:read", ...tech];
const actor = (userId: string, permissions: string[]) => ({ tenantId: T, userId, roles: [], permissions }) as any;
const X = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f"; // forma do app: uuid v4, sem ':'
const createPayload = { local_id: "PC-local-1", employeeUserId: u1, periodStart: "2026-10-11T10:00:00.000Z", periodEnd: "2026-10-11T10:00:00.000Z", origin: "mobile", advanceAmount: 100 };
const itemPayload = { report_local_id: "PC-local-1", category_id: "fuel", amount: 10 };
const count = async () => (await repo.listReports({ tenantId: T, limit: 100, offset: 0 } as any)).total;
let r: any;
try { r = await svc.syncExpenseActions(actor(u1, tech), { actions: [ { clientActionId: X, type: "expense_report.create", payload: createPayload }, { clientActionId: "c0ffee00-1111-4222-8333-444455556666", type: "expense_item.create", payload: itemPayload } ] }); console.log("lote1 OK", JSON.stringify(r)); }
catch (e: any) { console.log("lote1 ERRO", e.status ?? e.statusCode, e.code, e.reason); }
console.log("relatorios apos lote1 =", await count(), "| recibo X =", JSON.stringify(await repo.findMobileActionReceipt({ tenantId: T, clientActionId: X })));
// mesmo aparelho, u2 (gestor) logado: a fila reenvia X com o payload de u1
r = await svc.syncExpenseActions(actor(u2, mgr), { actions: [ { clientActionId: X, type: "expense_report.create", payload: createPayload } ] });
console.log("HEAD replay X sob u2 =", JSON.stringify(r.results), "| relatorios =", await count());
```

### head_rollback.mts

```ts
// Sonda: binário ANTIGO (HEAD 10e8ce63, memória) diante de um recibo K2 que a versão nova teria gravado.
const W = process.argv[2];
const svcMod = await import(`file:///${W}/src/modules/expense-management/expense-management.service.ts`);
svcMod.resetExpenseManagementRuntimeForTests();
const svc = svcMod.createMemoryExpenseManagementService();
const repo = svcMod.getMemoryExpenseManagementRepositoryForTests();
const T = "11111111-1111-4111-8111-111111111111", u1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const tech = ["expense_report:read_own","expense_report:create","expense_report:update","expense_report:submit","expense_sync:write"];
const actor = { tenantId: T, userId: u1, roles: [], permissions: tech } as any;
const X = "3f1c2a9e-7b4d-4e2a-9c1f-0a1b2c3d4e5f";
const payload = { employeeUserId: u1, periodStart: "2026-10-11T10:00:00.000Z", periodEnd: "2026-10-11T10:00:00.000Z", origin: "mobile", advanceAmount: 100 };
// estado deixado pela versão nova: efeito + recibo K2 (chave interna), nenhum recibo cru
const report = await repo.createReport({ tenantId: T, employeeUserId: u1, periodStart: new Date("2026-10-11"), periodEnd: new Date("2026-10-11"), origin: "mobile", advanceAmount: 100, currency: "BRL", createdBy: u1 } as any);
const P = "expense-sync-v2/".padEnd(161, "~");
await repo.createMobileActionReceipt({ tenantId: T, clientActionId: P + JSON.stringify([u1, X]), actorUserId: u1, actionType: "expense_report.create", status: "processed", resultRef: report.id, processedAt: new Date() } as any);
const count = async () => (await repo.listReports({ tenantId: T, limit: 100, offset: 0 } as any)).total;
console.log("antes do replay no binario antigo: relatorios =", await count());
const r = await svc.syncExpenseActions(actor, { actions: [{ clientActionId: X, type: "expense_report.create", payload }] });
console.log("binario antigo, replay de X:", JSON.stringify(r.results.map((x: any) => ({ status: x.status, replayed: x.replayed }))), "| relatorios =", await count());
```

### zz_crit03a2_probe_test.dart

```dart
// SONDA DESCARTÁVEL do critico-b-o6r-03a-r2 (worktree próprio, removido ao fim). Não é teste do produto.
import 'dart:convert';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:erp_techsolutions_mobile/core/network/api_contracts.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_factory.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_action_store.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_conflict_resolver.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_models.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_queue_repository.dart';
import 'package:erp_techsolutions_mobile/core/sync/sync_replay_service.dart';
import 'package:flutter_test/flutter_test.dart';

class _Adapter implements HttpClientAdapter {
  _Adapter(this.handler);
  final ResponseBody Function(RequestOptions) handler;
  @override
  Future<ResponseBody> fetch(RequestOptions o, Stream<Uint8List>? s, Future<void>? c) async => handler(o);
  @override
  void close({bool force = false}) {}
}

void main() {
  test('fila do aparelho reenvia acao de u1 sob a sessao de u2', () async {
    var currentToken = 'token-de-u1';
    final sent = <Map<String, Object?>>[];
    var call = 0;
    final dio = Dio(BaseOptions(baseUrl: 'http://probe.invalid'));
    dio.interceptors.add(InterceptorsWrapper(onRequest: (o, h) {
      o.headers['Authorization'] = 'Bearer $currentToken';
      h.next(o);
    }));
    dio.httpClientAdapter = _Adapter((o) {
      call++;
      final body = o.data as Map<String, dynamic>;
      for (final a in (body['actions'] as List)) {
        sent.add({'call': call, 'auth': o.headers['Authorization'], 'clientActionId': (a as Map)['clientActionId'], 'type': a['type'], 'employeeUserId': (a['payload'] as Map)['employeeUserId']});
      }
      if (call == 1) {
        // servidor comitou o create e recusou o lote (ex.: item com report_local_id -> 400)
        return ResponseBody.fromString(jsonEncode({'error': {'code': 'EXPENSE_INVALID'}}), 400, headers: {Headers.contentTypeHeader: ['application/json']});
      }
      final results = (body['actions'] as List).map((a) => {'clientActionId': (a as Map)['clientActionId'], 'status': 'processed', 'resultRef': 'r'}).toList();
      return ResponseBody.fromString(jsonEncode({'data': {'results': results}}), 200, headers: {Headers.contentTypeHeader: ['application/json']});
    });
    final queue = PersistentSyncQueueRepository(InMemorySyncActionStore());
    final f = SyncActionFactory();
    final create = f.create(tenantId: 't1', type: ExpenseSyncActionTypes.reportCreate, payload: {'employeeUserId': 'u1', 'advanceAmount': 100, 'origin': 'mobile'});
    final item = f.create(tenantId: 't1', type: ExpenseSyncActionTypes.itemCreate, payload: {'report_local_id': 'PC-local-1', 'amount': 10});
    await queue.enqueue(create);
    await queue.enqueue(item);
    final svc = SyncReplayService(queue: queue, api: DioExpenseSyncBatchApi(dio), supportedActionTypes: ExpenseSyncActionTypes.supported);
    final r1 = await svc.replayTenant('t1');
    // logout de u1 limpa so tokens; u2 entra no mesmo aparelho/organizacao
    currentToken = 'token-de-u2';
    final r2 = await svc.replayTenant('t1');
    // ignore: avoid_print
    print('PROBE r1.failed=${r1.failed.length} r2.synced=${r2.synced.length}');
    for (final s in sent) {
      // ignore: avoid_print
      print('PROBE sent ${jsonEncode(s)}');
    }
    final createSends = sent.where((s) => s['clientActionId'] == create.clientActionId).toList();
    expect(createSends.length, 2);
    expect(createSends[0]['auth'], 'Bearer token-de-u1');
    expect(createSends[1]['auth'], 'Bearer token-de-u2');
    expect(createSends[1]['employeeUserId'], 'u1');
  });

  test('conflito volta a ser enviado sozinho e keepMine preserva o id', () async {
    final queue = PersistentSyncQueueRepository(InMemorySyncActionStore());
    final a = SyncActionFactory().create(tenantId: 't1', type: ExpenseSyncActionTypes.reportCreate, payload: {'x': 1});
    await queue.enqueue(a);
    var calls = 0;
    final api = CaptureBatchApi((batch) { calls++; return batch.map((b) => SyncActionResult(clientActionId: b.clientActionId, status: 'conflict', errorCode: 'legacy_payload_unverifiable')).toList(); });
    final svc = SyncReplayService(queue: queue, api: api, supportedActionTypes: ExpenseSyncActionTypes.supported);
    for (var i = 0; i < 7; i++) { await svc.replayTenant('t1'); }
    final after = (await queue.actionsForTenant('t1')).single;
    final kept = resolveConflictAction(after, ConflictChoice.keepMine);
    // ignore: avoid_print
    print('PROBE2 envios=$calls status=${after.status} retry=${after.retryCount} keepMine.id_igual=${kept.clientActionId == a.clientActionId} keepMine.status=${kept.status}');
    expect(calls, 7);
    expect(kept.clientActionId, a.clientActionId);
  });
}
```
