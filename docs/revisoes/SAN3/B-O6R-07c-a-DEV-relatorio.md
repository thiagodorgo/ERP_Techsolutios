# B-O6R-07c-a — relatório incremental do desenvolvedor

> **Papel:** desenvolvedor · **identidade:** `dev-b-o6r-07c-a` (nova). **Modelo:** Claude Opus 5.5 (bloco de
> permissão, não de dinheiro — o Fable está reservado a bloco de dinheiro, decisão do dono de 08/10).
> **Fonte:** `docs/revisoes/SAN3/B-O6R-07c-plano.md` v3, ramo `fix/o6r07c-subresource-scope`, head medido
> `5b16932ea9105f069f2d6e6c94f146805b2a2f25` (`git rev-parse HEAD` no worktree `C:/Users/AMP/w-07ca`).
> **Código-base:** `src/` idêntico a `origin/main` `c1cfdabe` (o ramo só acrescentava o plano e as críticas).
> **Ambiente (cabeçalho, nada exportado por conveniência no runner):** Windows 11, Git Bash (MINGW64), Node
> v20.19.5, `npm ci` próprio no worktree (sem junction). Sem `DATABASE_URL`/`REDIS_URL` no ambiente, exceto nas
> linhas da bateria `-db` em que o comando os declara inline. Containers próprios com prefixo `dev07ca-`.

Formato de cada passo: **comando** · **saída resumida** · **estado**.

## Passo 0 — terreno

- `git -C C:/Users/AMP/w-07ca rev-parse HEAD` → `5b16932e…` · `git status --short` vazio · ramo `fix/o6r07c-subresource-scope`.
- `df -h /c` → 9,5 GB livres (limite de parada: 7 GB).
- `docker ps` → só `erp-postgres`/`erp-redis` (do dono; não são alvo).
- `npm ci --no-audit --no-fund` → `added 326 packages in 14s`, ec=0 (avisos EBADENGINE de dependência opcional, pré-existentes).
- **Estado:** OK.

## Passo 1 — reexecução P3 dos geradores v3 do Apêndice A (extraídos por `awk`, sem edição)

- Extração: `census-v3.mts` (167 l.), `sync-v3.mts` (67), `tipos-v3.mts` (120), `classify-v3.cjs` (104),
  `prova-tipos-v3.mts` (29), `inject-get-escreve.mts` (24), `mk-malclass.cjs` (7), `inject-prefixo.mts` (27) do plano;
  `inject.mts` (42) da r1; `inject-novas.mts` (35), `inject-tipo.mts` (32), `inject-motivo.mts` (27) da r2.
- `DATABASE_URL=… npx prisma generate` (URL fictícia, só para o gerador; não conecta) → ec=0.
- `node --import tsx census-v3.mts c3.json` (35 s nesta máquina) → `ROTA 409 · ROTEADOR 75 · SUBAPP 0 · MIDDLEWARE 183 (14 chaves) · SEM-CAMINHO 0`; `field_technician 125 · technician 123 · toca-por-caminho 31 · toca-por-corpo 0`; `middleware que respondeu sucesso ao campo: 0 · leitura que escreve: 0`.
- `node --import tsx sync-v3.mts c3.json s3.json` (25 s) → `tipos 59 | lotes 5 | pares 30 (field_technician 20 · technician 23) | não resolvidos 3 | curingas estáticos 3 | curinga dinâmico 0 | lotes instáveis 0`.
- `node classify-v3.cjs c3.json s3.json --gravar inst-base.json` → `DESPACHO·07c-b=1 · EVIDENCIA-OS·07c-b=4 · LEITURA=174 · LEITURA-OS=12 · LOTE=5 · MIDDLEWARE=183 · N=15 · OS·07a=3 · OS·07c-a=10 · OS·SEM-ALCANCE=15 · R=10 · ROTEADOR=75 · SEM-ALCANCE-CAMPO=172 · VISTORIA·07c-b=18`; `chaves vivas: 468 | entradas ·07c-b: 23 | VIOLAÇÕES: 0`; ec=0.
- `node --import tsx prova-tipos-v3.mts` → as 12 linhas iguais às do plano (N3a/N3b/N3c/N10 resolvidos; N3d e comparação com variável em `naoResolvidos`; prefixo em curinga).
- **Estado:** os números do plano **reproduzem** exatamente nesta árvore.

## Passo 2 — agrupamento das formas para o T12 (o plano permite, "desde que cada uma continue com a sua asserção")

- Grupo A = `inject.mts` (F1–F5) + `inject-prefixo.mts` (F6) + `inject-novas.mts` (N1, N2, N9) + `inject-tipo.mts` (N3a–c) + `inject-motivo.mts` (N10), aplicadas em sequência numa injeção só. Grupo B = `inject-get-escreve.mts` (F1′) sozinho: ele e o F1 do `inject.mts` registram a MESMA rota `GET …/aceitar-por-link`, e o primeiro registrado responderia pelos dois.
- Censo A: `ROTA 420 · ROTEADOR 80 · SUBAPP 1 · MIDDLEWARE 196 (15 chaves) · SEM-CAMINHO 1`, `MW-SUCESSO` ×2 (via-use). Lotes A: `cand 63 · lotes 6 · pares 42 · curinga dinâmico 1`.
- Classify A contra `inst-base.json` → 35 violações; cada forma aparece com a sua linha: F1 `NAO-CLASSIFICADA (na propriedade): ROTA GET …/aceitar-por-link`; F2 `…/via-all` ×5 métodos; F3 `ROTA POST …/:workOrderId/notas` + `ROTEADOR …/notas`; F4 `ROTA POST …/:id/fechar` (na propriedade); F5 `ROTA POST /api/v1/mobile/sync/novidade-actions` + `ROTEADOR /api/v1/mobile`; F6 `ROTA POST …/prefixo-actions` + 8 `PAR …prefixo-actions · checklist.*` + `CURINGA-DINAMICO`; N1 `NAO-CLASSIFICADA: MIDDLEWARE …/via-use · (anônima)` + 2 `MIDDLEWARE-RESPONDE-SUCESSO`; N2 `NAO-CLASSIFICADA: SUBAPP /api/v1` + `ROTA POST …/via-subapp` (na propriedade); N9 `SEM-CAMINHO`; N3a `PAR … · work_order.odometro`; N3b `… · work_order.reboque`; N3c `NAO-CLASSIFICADA: PAR … · km_rapida`; N10 `… · work_order.vistoria_set`.
- Classify B → 5 violações, entre elas `LEITURA-ESCREVE: GET /api/v1/work-orders/:workOrderId/aceitar-por-link`.
- B3: `mk-malclass.cjs inst-base.json inst-malclass.json` e classify A contra ele → as 3 `CLASSE-INCOMPATIVEL` (F1 `= LEITURA (esperado LEITURA-OS)`, F4 e F3 `= N (na propriedade)`).
- **Estado:** agrupar não mascara nenhuma forma. O T12 roda **2** censos de forma (A e B), mais o da linha de base.

## Passo 3 — régua de regressão na base (antes de qualquer código)

- **Ambiguidade registrada:** o plano diz "44 suítes não-`-db` das vias tocadas" mas não lista as 44 (a v1, `00109988` §4, só dá a regra: `git grep` dos caminhos/handlers do §2 + nomes `mobile|evidence|dispatch|checklist|comment|mileage|geocod|o6r07a-wo`). Reaplicando a regra hoje: 31 por nome + `git grep` → 36; não chega a 44. **Resolvido para o lado conservador:** rodo um **superconjunto** documentado — 73 suítes não-`-db` (as 31 por nome + toda suíte que cita `/attachments`, `/comments`, `geocode`, `/mobile/sync/`, `setMileage`, `geocode*ById`, `createUploadedAttachment`, `deleteAttachment`, `addComment`, `editComment`, `attachTag`, `detachTag`, `work_order.mileage`, `/mobile/checklist-runs`, `operations/dispatches`, `evidence-uploads` ou `/work-orders/`). E o `npm test` inteiro roda depois, que contém todas.
- `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap <73 arquivos>` em `c1cfdabe` (src) → `# tests 847 · pass 845 · fail 0 · skipped 2` (os 2 auto-pulos declarados de `-db`: autolink e impound-process-checklist-link-schema), 84 s, ec=0.
- **Estado:** linha de base da régua = 847/845/0/2.

## Passo 4 — o guard v3 portado (helper + instantâneo + T0–T13), na base

- `tests/helpers/o6r07c-census.ts`: porta **sem mudar o algoritmo** dos 4 geradores (corpo verbatim; só a casca muda — `argv`→parâmetro, arquivo→retorno, `process.exit` na ponta de linha de comando). Cada passada roda num **processo filho** (o censo intercepta `Router.prototype` e embrulha os `handle`; o app guarda estado em memória de módulo).
- `node --import tsx tests/helpers/o6r07c-census.ts gravar <scratch>/inst-porta.json` (36 s) → mesmas linhas do Apêndice A (`ROTA 409 · ROTEADOR 75 · MIDDLEWARE 183 (14 chaves)`, `59 · 5 · 30`, `468 chaves · 07c-b 23 · VIOLAÇÕES 0`); `cmp inst-porta.json tests/fixtures/o6r07c-classificacao-vias.json` → **idêntico** (o fixture é o `inst-base.json` do passo 1, byte a byte).
- `tests/fixtures/o6r07c-formas/`: `inject.mts` (r1), `inject-novas.mts`, `inject-tipo.mts`, `inject-motivo.mts` (r2), `inject-prefixo.mts`, `inject-get-escreve.mts` (plano) — cópias verbatim; `grupo-a.mts` = o agrupamento do passo 2.
- `node --test --import tsx --test-reporter=tap tests/o6r07c-census-guard.test.ts` (base) → `# tests 31 · pass 31 · fail 0` (15 de topo: T0–T13 + o de tempo; 16 subtestes do T12), 62 s de parede; tempos publicados: `base 57308 ms · grupo A 58196 ms · grupo B 57307 ms` (três censos em paralelo).
- **Estado:** guard verde na base (é a linha de base). O vermelho-controle do guard é por mutação (MG1–MG16, passo de mutações).

## Passo 5 — testes das vias, VERMELHOS na base (TDD)

- `tests/o6r07c-subresource-scope.test.ts`: laço G (uma entrada por chave `OS·07a`/`OS·07c-a` **lida do instantâneo**; receita genérica; parâmetro sem semente falha) + S-ANX, S-KM, S-KM-RESTART, S-COM, S-MOD, S-GEO, S-ORDEM, S-XT, S-DUAL, S-ROLES. Blobs do anexo em diretório temporário do próprio arquivo (`CHECKLIST_STORAGE_LOCAL_DIR`), nunca em `storage/`.
- Na base → `# tests 24 · pass 8 · fail 16`, ec=1. Vermelhos, cada um pelo motivo certo (o técnico B chega ao parse ou à escrita):
  - G-NEG `work_order.mileage` → `reason mileage_required`; DELETE anexo → `204`; DELETE comentário → `204`; DELETE tag → `404 tag_assignment_not_found`; PATCH comentário → `400 comment_required`; POST anexo → `400 multipart_required`; POST comentário → `400 comment_required`; POST tag → `201`; geocode → `422 no_address`; geocode-destination → `422 no_destination_address`;
  - S-ANX `DELETE do anexo alheio veio 204`; S-KM `ação accepted`; S-KM-RESTART `2º reenvio veio accepted` (o 1º, `already_applied`, já passa); S-COM `comentar veio 201`; S-GEO `origem veio 409 already_geocoded`; S-ORDEM `veio 400 multipart_required`.
- Verdes na base (controle, como o plano prevê): o laço G das 3 entradas do 07a (regressão), S-MOD, S-XT, S-DUAL, S-ROLES, e o teste de não-vazio do laço.
- **Estado:** vermelho-controle registrado.

## Sucessor

> **Identidade:** `dev-b-o6r-07c-a-sucessor` (nova), Claude Opus 5.5. O `dev-b-o6r-07c-a` caiu pelo limite de sessão
> no meio da implementação. Termino o 07c-a ao pé do plano v3; não replanejo, não julgo achado, não voto.
> **Ambiente:** Windows 11, Git Bash (MINGW64_NT-10.0-22631), Node v20.19.5, worktree `C:/Users/AMP/w-07ca`, `npm ci`
> próprio do antecessor (sem junction). Nada exportado por conveniência; `DATABASE_URL`/`REDIS_URL` só inline.

### S0 — o que herdei, medido (P3)

- `git rev-parse HEAD` = `git rev-parse origin/fix/o6r07c-subresource-scope` (após `git fetch`) = `99c5912d28293d5e369988a7e2866b43c17cfcd7`.
- `git status --short` → 5 ` M` não commitados: `API_CONTRACTS.md`, `work-order-comment.service.ts`,
  `work-order-attachment.controller.ts`, `work-order-attachment.service.ts`, `work-order.service.ts`.
- `diff <(tr -d '\r' < erp-pausa-2026-10-03/07ca-wip-nao-commitado.patch) <(git diff | tr -d '\r')` → vazio: o
  diff vivo é o salvo pelo orquestrador.
- `df -h /c` → 17 GB livres. `node_modules` presente (222 entradas) e `node_modules/.prisma/client` gerado.
  `docker ps -a` → só `erp-postgres`/`erp-redis` (do dono) e dois parados alheios; nenhum `dev07ca-`.
- Falta no ramo: `tests/o6r07c-subresource-scope-db.test.ts` (o `-db` do 07c-a.4) — não nasceu no `99c5912d`.

### S1 — conferência do WIP contra o 07c-a.2 (leitura do diff, item a item)

- `work-order.service.ts`: `getForMutation` = `get` → `assertMutationObjectScope` (corpo do 07a intocado) → OS. ✔
  `setMileage` troca `this.get` por `getForMutation` ✔. `geocodeById`/`geocodeDestinationById` trocam
  `parseRequiredUuid`+`findById` por `getForMutation` (mesmo 404 `WORK_ORDER_NOT_FOUND`/`not_found`, o `get` já faz
  `parseRequiredUuid`) — escopo antes do 409/422 ✔. `update`/`changeStatus` sem mudança ✔.
- `work-order-attachment.service.ts`: `assertCanMutate` exposto; `createUploadedAttachment` e `deleteAttachment` por
  `assertWorkOrderForMutation` (= `getForMutation` + a conversão 404 → `work_order_not_found` de `assertWorkOrder`) ✔;
  listar e baixar seguem em `get` ✔. **Corrigido:** o JSDoc do upload (Ω3-d) tinha ficado órfão acima do
  `assertCanMutate`; voltou para cima do `createUploadedAttachment` (só comentário; CRLF preservado, 241/241).
- `work-order-attachment.controller.ts`: `assertCanMutate` antes do teste de multipart e do parse ✔.
- `work-order-comment.service.ts`: as 5 escritas passam por `assertWorkOrderForMutation` antes de `parseComment` e da
  busca do comentário; `assertCanMutate` (D-Ω3F-5-COMMENT) intacto logo depois; `listComments` em `get` ✔.
- `API_CONTRACTS.md`: só as linhas de anexo, comentário, geocode e `/mobile/sync/work-order-actions` ✔.
- Fábricas: anexo e comentário usam `createDefaultWorkOrderService`/`createMemoryWorkOrderService`, ambas com
  `createDefaultReferenceResolvers()` → o `resolveActorOperatorProfileId` do 07a chega a `getForMutation` ✔.
- **Estado:** WIP mantido inteiro (nada descartado), com a correção de comentário acima.

### S2 — vermelho-controle das vias na base, reexecutado

- Método (sem stash/checkout/reset): cópia byte a byte dos 4 arquivos de `src/` com `md5sum` → `git cat-file --filters
  HEAD:<arq> > <arq>` (o blob de `99c5912d`, cujo `src/` é o de `c1cfdabe`) → teste → `cp -p` de volta → `md5sum -c` OK nos 4.
- `env -u DATABASE_URL -u REDIS_URL CORE_SAAS_PERSISTENCE=memory node --test --import tsx --test-reporter=tap
  tests/o6r07c-subresource-scope.test.ts` na base → `# tests 24 · pass 8 · fail 16`, ec=1: os mesmos 16 do passo 5 (laço G das
  10 vias do 07c-a, S-ANX, S-KM, S-KM-RESTART, S-COM, S-GEO, S-ORDEM). Restauração: `md5sum -c` OK.

### S3 — com a implementação

- `npm run check` → ec=0.
- `tests/o6r07c-subresource-scope.test.ts` → `# tests 24 · pass 24 · fail 0` (3,4 s).
- `tests/o6r07c-census-guard.test.ts` → `# tests 31 · pass 31 · fail 0` (68 s; `base 63799 ms · grupo A 64479 ms · grupo B 63607 ms`).
- `tests/o6r07a-wo-object-scope.test.ts` (sem edição) → `# tests 8 · pass 8 · fail 0`.
- Commit `d8900248` `fix(work-orders): escopo por objeto nas escritas dos subrecursos da OS (B-O6R-07c-a)`, empurrado.

### S4 — o `-db` (`tests/o6r07c-subresource-scope-db.test.ts`, novo)

- Cluster próprio: `docker run --name dev07ca-pg … -p 127.0.0.1:47807:5432 postgres:16-alpine` e `--name dev07ca-redis …
  -p 127.0.0.1:47808:6379 redis:7` (a primeira escolha, 55807, caiu numa faixa reservada do Windows — `netsh … excludedportrange`;
  o container que não subiu foi removido pelo nome). `DATABASE_URL=… npx prisma generate` ec=0; `npx prisma migrate deploy` ec=0
  ("All migrations have been successfully applied").
- Desenho: composição de PRODUÇÃO (`CORE_SAAS_PERSISTENCE=prisma` antes dos imports dinâmicos; o `[modo]` afirma o modo) — as
  fábricas default com o `resolveActorOperatorProfileId` real lendo `operator_profiles` (é o que a M9 derruba). Anexo, comentário
  e km (pela `syncMobileWorkOrderActions`), positivo por perfil e por user id, e um negativo por via. Organização descartável por
  caso, teardown escopado pelo id semeado + conferência de zero resíduo. Sem as palavras do ratchet de catálogo.
- Head: `# tests 6 · pass 6 · fail 0`. Sem `DATABASE_URL`: `# tests 1 · skipped 1` (pulo declarado).
- Base (mesmo método do S2, restauração `md5sum -c` OK): `# tests 6 · pass 3 · fail 3` — `[negativo · anexo]` "apagar anexo: o
  técnico B não foi recusado", `[negativo · comentário]` "comentar: o técnico B não foi recusado", `[negativo · km]` "km do não
  atribuído veio accepted"; `[modo]`, `[perfil]`, `[user id]` verdes (controle). Uma primeira versão com um negativo único ficava
  vermelha na base pelo motivo ERRADO (`assertCanMutate is not a function`) — foi partida por via, começando pela chamada que já
  existia na base.
- Resíduo: `select count(*) from tenants where slug like 'o6r07c-db-%'` → 0; nenhum `o6r07c-*` em `%TEMP%`.
- **Fora do escopo, registrado:** o `-db` não entra na lista curada do job `backend-postgres` (`.github/workflows/ci.yml`), que é
  escopo proibido do bloco; no job `backend` ele se declara pulado. Proposta de pendência para o orquestrador:
  `P-O6R-07CA-DB-FORA-DA-LISTA-CI` (dono: o próximo bloco que tocar `ci.yml`).

### S5 — mutações M1–M11 (arnês `mut.mjs` no scratchpad do sucessor)

- Arnês: âncora escrita com `\n` e convertida para o EOL do arquivo (CRLF em `src/`), **contagem de ocorrências exigida**
  antes de gravar (prova de aplicação), backup com sha256 e restauração conferida. Ensaio a seco das 34 mutações
  (aplica + restaura, sem teste): todas casaram a contagem esperada e voltaram ao sha original; `git status` idêntico.
- Para cada M: `tests/o6r07c-subresource-scope.test.ts` (memória) · `tests/o6r07c-subresource-scope-db.test.ts` (cluster
  `dev07ca-pg`) · `tests/o6r07a-wo-object-scope.test.ts`; depois restauração (sha == original) e `git status --short` vazio.

| mutação | memória (24) | `-db` (6) | 07a (8) | o que caiu |
|---|---|---|---|---|
| M1 `getForMutation` sem `assertMutationObjectScope` | 8/16 fail | 3/3 fail | 8/0 | G-NEG das 10 vias do 07c-a, S-ANX, S-KM, S-KM-RESTART, S-COM, S-GEO, S-ORDEM; os 3 negativos `-db`. As 3 do 07a seguem verdes (não passam por ele) |
| M2 `setMileage` volta a `get` | 21/3 | 5/1 | 8/0 | G-NEG `work_order.mileage`, S-KM, S-KM-RESTART; `-db` `[negativo · km]` |
| M3 geocodes voltam a `findById` | 21/3 | 6/0 | 8/0 | G-NEG `geocode` e `geocode-destination`, S-GEO (o `-db` não cobre geocode — o plano não o pede lá) |
| M4 multipart antes do escopo | 22/2 | 6/0 | 8/0 | G-NEG `POST …/attachments`, S-ORDEM (o serviço ainda recusa; só a ORDEM muda) |
| M5a `addComment` volta a `assertWorkOrder` | 22/2 | 5/1 | 8/0 | G-NEG `POST …/comments`, S-COM; `-db` `[negativo · comentário]` |
| M5b `editComment` idem | 22/2 | 6/0 | 8/0 | G-NEG `PATCH …/comments/:commentId`, S-COM |
| M5c `deleteComment` idem | 22/2 | 5/1 | 8/0 | G-NEG `DELETE …/comments/:commentId`, S-COM; `-db` `[negativo · comentário]` |
| M5d `attachTag` idem | 22/2 | 6/0 | 8/0 | G-NEG `POST …/tags/:tagId`, S-COM |
| M5e `detachTag` idem | 22/2 | 6/0 | 8/0 | G-NEG `DELETE …/tags/:tagId`, S-COM |
| M6 moderação só do autor | 23/1 | 6/0 | 8/0 | S-MOD |
| M7 nega tudo (`if (true \|\| …)`) | 7/17 | 2/4 | 4/4 | G-POS das 13 entradas, S-DUAL; e, por semente com o técnico A, S-KM-RESTART, S-COM, S-MOD, `-db` `[perfil]`/`[user id]` e os negativos de anexo/comentário; 4 do 07a |
| M8 escopo também a `tenant_wide` (sem o `return` de `actorMutatesAssignedOnly`) | 7/17 | 6/0 | 6/2 | G-WIDE das 13 entradas, S-MOD, S-ROLES; e, por semente com o gestor, S-ANX e S-XT; 2 do 07a (gestão e dois papéis) |
| M9 `resolveActorOperatorProfileId` → `undefined` | 8/16 | 3/3 | 6/2 | **`-db [perfil]` vermelho e `-db [user id]` verde**; os negativos de anexo/comentário do `-db` caem na semente (o técnico A é atribuído por perfil); na memória, G-POS das 13 e S-COM/S-MOD/S-KM-RESTART |
| M10 `getForMutation` converte o 404 em 403 | 23/1 | 6/0 | 8/0 | S-XT |
| M11 recibo consultado depois do `processAction` (`mobile-work-order-sync.ts`, temporária) | 23/1 | 6/0 | 8/0 | S-KM-RESTART, **1ª asserção**: "1º reenvio veio rejected not_assigned_to_actor" |

- Toda restauração: sha == original; `git status --short` só com o relatório (em edição).
