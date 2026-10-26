# B-SAN3-22 — Relatório do DEV backend

> **Identidade:** `dev-san322-sol` · papel DEV · Codex `gpt-5.6-sol`, esforço medium, nível menor declarado. Não planejou, não criticou e não vota.
> **Objeto:** backend, testes e registros da v2 final de `B-SAN3-22`; `frontend/**` está fora desta fatia.
> **Ref-base medida:** `origin/main` = `b08c755719a6cb0ed192fa04e549ac5fc67a3e67`, após `git fetch origin --prune` em 2026-10-25.
> **Worktree:** `C:/Users/AMP/w-san322`, branch `fix/checklist-trava-versao`, sem junction.

## P1 — Evidência incremental

### 1. Contrato, plano e terreno

- Comando: leitura integral de `CLAUDE.md`, `PROJECT_MEMORY.md`, `.agents/skills/saas-multi-tenant/SKILL.md`, plano v2 e crítica r1.
- Saída resumida: decisões Q1–Q4 preservadas; `prisma/**`, `migrations/**`, `frontend/**` e `Kpis/**` proibidos nesta fatia; tenant deve vir do ator e todo raw SQL deve ser tenant-first.
- Veredito parcial: conforme.
- Comando: `git fetch origin --prune; git rev-parse origin/main`.
- Saída resumida: `b08c755719a6cb0ed192fa04e549ac5fc67a3e67`, igual à ref julgada pelo plano v2.
- Veredito parcial: conforme.
- Comando: `Get-PSDrive C` antes do worktree e antes do `npm ci`.
- Saída resumida: 11,03 GB antes do worktree; 10,94 GB antes do `npm ci`.
- Veredito parcial: piso de 10 GB atendido; nova medição obrigatória após a instalação.
- Comando: `git worktree add -b fix/checklist-trava-versao C:/Users/AMP/w-san322 origin/main`.
- Saída resumida: worktree criado no head-base; branch acompanha `origin/main`.
- Veredito parcial: conforme.
- Comando: `npm ci` no worktree próprio.
- Saída resumida: primeira tentativa falhou por `EIDLETIMEOUT` em `registry.npmjs.org:443`; uma repetição ficou sem progresso de rede e foi interrompida; `npm ci --offline --no-audit --no-fund` concluiu com `added 326 packages in 27m`, ainda no worktree próprio e sem junction.
- Veredito parcial: conforme; instalação própria concluída sem junction.
- Comando: `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55432/dev_san322?schema=public npx prisma generate`.
- Saída resumida: Prisma Client 7.8.0 gerado no `node_modules` do worktree; a primeira chamada sem a variável falhou de forma honesta antes de gerar, e a repetição com a URL descartável concluiu.
- Veredito parcial: conforme; nenhuma base viva foi acessada.
- Comando: containers descartáveis `dev-san322-pg` (`127.0.0.1:55432`) e `dev-san322-redis` (`127.0.0.1:56379`), ambos saudáveis; `npx prisma migrate deploy` somente no banco `dev_san322`.
- Saída resumida: 116 migrações aplicadas no Postgres descartável; nenhum arquivo em `prisma/**` ou `migrations/**` foi alterado.
- Veredito parcial: conforme até o gate de disco.

### 2. Re-medição das premissas do plano

- Comando: leitura por blob com `git show origin/main:<arquivo>` das referências explícitas do plano em `checklist.validator.ts:167-181`, `checklist.service.ts:148-213,238-261,913-923`, `checklist-prisma.repository.ts:178-321,760-811,1106-1113`, `src/database/rls.ts:26-39`, migração RLS `:43-46`, arquivos web/mobile/testes/contratos e registros citados.
- Saída resumida: PATCH aceita status/componentes sem token; serviço lê `previous` antes da gravação; Prisma lê antes e atualiza sem lock/token; `getTemplate` filtra arquivado; reabertura carimba `previous.run.templateVersion`; wrapper abre transação RLS; caminhos web/mobile, RBAC, RN-CAD-007 e pendência de inativação coincidem com a v2.
- Veredito parcial: nenhuma premissa falsa; implementação autorizada.
- Comando: conferência dos caminhos com `git ls-files` (fallback porque `rg` não está instalado nesta máquina).
- Saída resumida: todos os arquivos citados existem no blob `origin/main`; nenhum foi inferido da árvore de outra branch.
- Veredito parcial: conforme §A7.

### 3. Vermelho-controle no head-base

- Comando: `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` antes de qualquer mudança em `src/**`.
- Saída resumida: **2/2 arquivos vermelhos** — `ERR_MODULE_NOT_FOUND` para `checklist.template-change.js` e export ausente `parseExpectedUpdatedAtDto`; exit 1.
- Veredito parcial: vermelho-controle confirmado no head-base `b08c7557`.

### 4. Implementação

- Classificador `checklist.template-change.ts`: allowlist fechada de caminhos textuais; toda propriedade desconhecida, chave de `config`, obrigatoriedade, ordem, regra, opção ou adição/remoção é mudança de campo.
- Borda HTTP: `expectedUpdatedAt` obrigatório no PATCH e publish; query obrigatória no DELETE; `componentKey` obrigatório nos componentes do PATCH.
- Repositórios: `SELECT ... FOR UPDATE` tenant-first para PATCH/publish/archive; `date_trunc('milliseconds', updated_at)`; `FOR KEY SHARE` para criação/reabertura; `activeRuns` contado na mesma transação; `previous` devolvido sob lock.
- Serviço/DTO/controller: 409 estável para stale/in-use/porta única; `activeRuns` em GET detalhe/PATCH/publish; arquivado continua servindo vistoria viva; componentes de run resolvidos sem filtrar arquivado.
- Consumidores de teste: tokens acrescentados nos 13 arquivos permitidos; PATCH de arquivamento migrou para DELETE onde previsto.
- `API_CONTRACTS.md`: contrato `checklist_template_patch@2026-10-25.b-san3-22` documentado.

### 5. Validação e mutações

Apurada na retomada do Codex (abaixo) e fechada em "Retomada (dev-san322-opus)", no fim deste arquivo.

### 6. Limpeza, commits e push

Na 1ª execução: parada antes de commits/push (gate de disco). Fechamento, commits e push: ver "Retomada (dev-san322-opus)".

## PAUSA 14:50:32Z

- **Motivo:** o gate de disco obrigatório disparou. Comando: `$b=(Get-PSDrive C).Free; $b; $b/1GB`. Saída: `10735886336` bytes = `9,99857330322266` GiB livres, abaixo dos 10 GB mínimos. A implementação parou imediatamente; nenhum teste/banco adicional, mutação, commit ou push foi executado depois da medição.
- **Head:** `b08c755719a6cb0ed192fa04e549ac5fc67a3e67` no branch local `fix/checklist-trava-versao`; nenhuma entrega foi empurrada.
- **Feito:** leitura integral das fontes; re-medição em `origin/main`; vermelho-controle; implementação inicial do backend/classificador/contrato e atualização dos 13 consumidores permitidos; testes puros novos verdes antes da reinstalação; `npm ci` próprio; `prisma generate`; Postgres/Redis isolados e saudáveis; 116 migrações aplicadas no banco descartável; containers removidos ao pausar.
- **Falta:** completar `tests/checklist-template-lock-db.test.ts` com CE-4/5/6/7/8/10/12/22/23/24; revisar o diff dos 13 arquivos para manter somente token/porta; executar toda a bateria backend e regressões; executar e restaurar, com hash, as mutações backend do §8.5; fechar registros/relatório; confirmar escopos proibidos/Kpis intactos; commits Conventional Commits; push sem PR; limpeza final.
- **Próximo comando (somente após recuperar ≥ 10 GB livres):** `[math]::Round((Get-PSDrive C).Free/1GB,3)`; se verde, recriar `dev-san322-pg`/`dev-san322-redis` nas mesmas portas isoladas e retomar pelo teste DB.

## RETOMADA 2026-10-26

- Comando: `[math]::Round((Get-PSDrive C).Free/1GB,3)`.
- Saída resumida: `10,700 GiB`; o piso foi reduzido pelo dono de 10 para **7 GiB** em 25/10, portanto o gate de disco está verde.
- Veredito parcial: retomada autorizada pelo novo limite; medir novamente antes de cada suíte `-db`.
- Comando: `git status --short`, `git diff --stat`, branch/head e `git diff --check` em `C:/Users/AMP/w-san322`.
- Saída resumida: branch `fix/checklist-trava-versao`, head-base `b08c7557`; 23 arquivos rastreados modificados e 7 não rastreados; diff `426+ / 111-`; nenhum erro de whitespace. Os arquivos novos têm fechamento sintático; `tests/checklist-template-lock-db.test.ts` tem 231 linhas e oito testes/blocos declarados.
- Veredito parcial: parcial preservado e mensurável. `tests/checklist-editor-blockers-parity.test.ts`, não citado na contagem resumida de 13 consumidores da pausa, tem uma única linha necessária de `expectedUpdatedAt`; manter e declarar na conferência final de escopo.
- Comando: `git log b08c7557..origin/main` e `git diff --name-status b08c7557..origin/main`.
- Saída resumida: `origin/main` avançou por #460 e #461 até `b2f8e6cf`; nenhum arquivo backend/checklist deste bloco mudou. Há sobreposição somente nos registros `agent-orchestration/controle/pendencias.md` e `docs/revisoes/SAN3/PLANO_SAN3.md`, a reconciliar antes do push.
- Veredito parcial: backend pode continuar sobre o head-base; integração com a `main` atual será feita sem perder os registros de #460/#461.
- Comando: agrupamento de `docker ps --format '{{.Names}}'`, excluindo `erp-*` e tratando `-pg`/`-redis` do mesmo prefixo como um trabalho.
- Saída resumida: 2 trabalhos (`dev-san312a-c2`, `dev-san322`).
- Veredito parcial: pela decisão do dono de 25/10, nenhuma suíte `-db` roda enquanto houver mais de um trabalho; os containers `dev-san322-*` já estavam presentes na retomada e não foram iniciados nem usados por ela.
- Comando: `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` e `npm run check`.
- Saída resumida: **29/29 verdes**, 0 falhas/0 pulos; TypeScript `tsc --noEmit` verde.
- Veredito parcial: classificador, contrato de memória e tipagem conformes; próximo passo sem banco é a regressão dirigida.
- Comando: regressão dirigida sem `DATABASE_URL` em `checklist-routes`, `checklist-snapshot-dispatch`, `mobile-backend-contracts`, `field-dispatch-multi-checklist` e `field-dispatch-checklist-set-port`.
- Saída resumida: **79/79 verdes**, 0 falhas/0 pulos.
- Veredito parcial: nenhuma regressão nos consumidores e no despacho em memória.
- Comando: `npm test` sem `DATABASE_URL`, `npm run lint`, `npm run build`.
- Saída resumida: runner em modo `memory`, **344 arquivos** executados, exit 0; lint (`tsc --noEmit`) e build (`tsc`) verdes. Os pulos `-db` da suíte em memória não contam como prova de banco e serão substituídos pela execução dirigida no cluster descartável.
- Veredito parcial: bateria sem banco verde.
- Comando: `node scripts/migration-transaction-guard.mjs` e diff dos escopos proibidos.
- Saída resumida: `migrações: 116 · anteriores: 112 · novas: 4 · violações: 0`; diff vazio em `mobile/`, `prisma/`, `src/modules/core-saas/`, `frontend/` e `Kpis/`.
- Veredito parcial: nenhuma migração ou trilha proibida foi alterada. As 4 “novas” são posteriores ao snapshot interno do guard, não diff deste bloco.
- Comando: inspeção da lista `SUITES` de `.github/workflows/ci.yml`.
- Saída resumida: `tests/checklist-template-lock-db.test.ts` ausente; `.github/**` é proibido na v2 e no comando desta fatia.
- Veredito parcial: registrada `P-B-SAN3-22-CI-DB-SUITE`, dona orquestração por emenda antes do PR; o DEV não ampliou escopo silenciosamente.
- Comando: drills sem banco CE-3, CE-7a, CE-9b, CE-9d, CE-10c, CE-11b e CE-18a/18e; após cada mutação, teste alvo e restauração por `apply_patch`, seguida de SHA-256.
- Saída resumida: cada mutante deixou o teste nominal vermelho: CE-3/7a/9b/9d → bloco memória; CE-10c → teste novo de arquivado+vistoria viva; CE-11b → publish stale; CE-18a (`minPhotos` textual) → caso 5; CE-18e (retirar `label` da allowlist) → caso 25. Hashes restaurados: repository `A194B198…112`, service `C0204E42…C69`, classifier `ECF393BA…ACE`.
- Veredito parcial: mutações sem banco provam os guards declarados; os drills DB aguardam o teto Docker.
- Comando: revisão do contador Prisma de vistorias vivas.
- Saída resumida: `findMany(...).length` substituído por `count(...)`, preservando o filtro tenant-first e os dois status vivos; `npm run check` e testes puros **30/30** verdes depois do ajuste.
- Veredito parcial: mesmo contrato, sem carregar linhas inteiras desnecessariamente.

- Comando: inspeção do parcial, gate de disco/Docker e suíte DB dirigida com `DATABASE_URL=postgresql://postgres:***@127.0.0.1:55432/dev_san322?schema=public`, `REDIS_URL=redis://127.0.0.1:56379` e `CORE_SAAS_PERSISTENCE=prisma`.
- Saída resumida: 11,657 GiB livres antes da suíte; um único trabalho não-ERP (`dev-san322`, par Postgres/Redis); `git diff --check` limpo; arquivos novos completos. A suíte `checklist-template-lock-db` + `checklist-template-prisma-db` + `checklist-routes-db` + `checklist-run-lifecycle-db` executou **24/24 verdes**, 0 falhas/0 pulos, em 50,7 s.
- Veredito parcial: CE-4/5/6/7/8/10/12/22/23/24 e as regressões Prisma/lifecycle estão provadas no Postgres descartável; isolamento tenant-first também passou sob superusuário, sem depender de RLS.

- Comando: medição de disco e `npm test` com `DATABASE_URL`/`REDIS_URL` descartáveis e `CORE_SAAS_PERSISTENCE=prisma`.
- Saída resumida: 11,653 GiB livres antes da execução; **344 arquivos**, **3.971 testes registrados**, 3.732 pass, 237 fail, 2 skips, duração 582,9 s. Os casos deste bloco executados dentro da rodada (CE-18 e CE-4–25) ficaram verdes. As falhas globais são do arranjo que força para Prisma suítes desenhadas para memória: fixtures como `ten_000001`/`tenant-a` chegam a colunas UUID, repositórios em memória passam a consultar a base e dados compartilhados contaminam contagens. Houve ainda `EBUSY` no teardown de `traccar-event-migration-drill-db.test.ts`, que fez o guard de denominador acusar um arquivo sem teste.
- Veredito parcial: a bateria completa com banco foi executada e não é verde por incompatibilidades preexistentes fora do escopo; não há sinal de regressão do checklist. A prova DB canônica desta fatia é a suíte dirigida de 24/24 sem skip; o DEV não ampliará escopo para corrigir 237 falhas de outros módulos.

- Comando: drills DB CE-4, CE-5, CE-12-db, CE-22, CE-23 e CE-24; antes de cada execução foi medido disco (11,648–11,649 GiB), cada mutação foi aplicada com `apply_patch`, o teste nominal foi executado no Postgres descartável e o arquivo foi restaurado.
- Saída resumida: CE-4 sem `date_trunc` → stale indevido nos micros; CE-5 sem `FOR UPDATE` → sobrescrita aceita em vez de stale; CE-12 sem tenant no lock/leitura/update → o PATCH de A devolveu e gravou o modelo de B (`name=intruso`), deixando o teste vermelho; CE-22 carimbando o argumento antigo → `2 !== 3`; CE-23 com `FOR NO KEY UPDATE` → perdeu a serialização e o teste ficou vermelho; CE-24 mantendo a versão anterior → `2 !== 3`.
- Veredito parcial: os seis mutantes DB foram mortos pelos testes nominais. SHA-256 do repositório antes e depois: `F851BE6332D138505482C2E98BDF018EFE83D7FF01EAA002DBB55E28C10F002B`; `git diff --check` limpo após a restauração.

## Retomada (dev-san322-opus)

> **Identidade:** `dev-san322-opus` · papel DEV · Claude Opus 5.5, **nível menor declarado**, identidade nova. Sucede o `dev-san322-sol` (Codex), que caiu várias vezes por limite de uso; o dono mandou o Claude cobrir uma tarefa por vez. Não planejou e não vota. Fonte única: o plano v2 (`docs/revisoes/SAN3/B-SAN3-22-plano.md`, recopiado nesta retomada, porque a cópia anterior não tinha a seção "Aprovação do dono da maquete", acrescentada depois na fonte). Só backend; `frontend/**` intocado (Q4 (b): o backend corre em paralelo ao seletor).

### R1. Medição do parcial (P3/P7), antes de qualquer código

| Comando | Saída resumida | Veredito |
|---|---|---|
| `git -C C:/Users/AMP/w-san322 status --short` · `git diff --stat` · `git log -1` | head `b08c7557`, 0 commits; 23 rastreados modificados (+442/−111) e 7 não rastreados (`checklist.template-change.ts`, 3 testes novos, comando, plano, relatório) | parcial preservado |
| `df -h /c` · `docker ps` | 12 GB livres (piso 7 GB). Fora de `erp-*`, só `dev-san322-pg` (127.0.0.1:55432) e `dev-san322-redis` (127.0.0.1:56379), criados em 25/10 às 23:26Z; banco `dev_san322` com 116 migrações e `TimeZone=UTC` | terreno do ramo, reusado |
| leitura integral do diff de `src/` e dos 3 testes novos | código coerente com §2–§4 do plano. O `PrismaChecklistRepository` só é construído dentro da transação RLS (`withTenant`), então `FOR UPDATE` e `FOR KEY SHARE` valem até o commit. O teste de memória cobria o §8.1 **só no serviço**: faltavam pela rota CE-2a, CE-3 com GET, CE-7b/7c/7d, CE-8a/8b/8c, CE-9a/9e, CE-10c completo, CE-11b, CE-11c, CE-12, CE-13 e CE-14 (ausente na lista) | lacuna de teste, completada em R3 |
| `node --test --import tsx tests/checklist-template-change.test.ts tests/checklist-template-lock.test.ts` · `npm run check` | 29/29 verdes; `tsc` verde | o parcial compila e passa |

### R2. Vermelho-controle no head-base `b08c7557`

Os 6 arquivos de `src/modules/checklists/` do ramo foram copiados para o scratchpad e voltaram ao blob de `b08c7557` (`git show`); o `checklist.template-change.ts` saiu; os testes do ramo rodaram. Depois, restauro por cópia, com `sha256sum -c` OK nos 7 arquivos.

| Teste | Saída no head-base | Veredito |
|---|---|---|
| `checklist-template-change` | `ERR_MODULE_NOT_FOUND` (`checklist.template-change.js`) | vermelho ✓ |
| `checklist-template-lock-db` (com `DATABASE_URL` do banco descartável) | 9/9 `not ok`: CE-12-forma, CE-4/5, CE-6/7/8, CE-10-db, CE-12-db, CE-22/23, CE-22, CE-24, CE-25 | vermelho ✓ (o da `-db` não estava registrado; feito agora) |
| `checklist-template-lock` (arquivo inteiro) | `SyntaxError`: `parseExpectedUpdatedAtDto` não existe | vermelho por importação |
| só a parte REST (cópia temporária sem o import do validador, apagada depois) | CE-1/2a/2b/3/14 `expected 0` (sem `activeRuns`) · CE-7 `409 × 200` · CE-9 `409 × 200` · CE-10 `400 × 204` · CE-11 `409 × 200` · CE-8c `1 × 2` leituras; **passam** CE-12 (controle, como o plano prevê) e CE-11c (guard de futuro) | vermelho comportamental ✓ |
| guard CE-13 sobre os testes do head-base (16 arquivos extraídos por `git show`) | 30 sítios sem token: **10 PATCH + 16 publish + 4 `updateTemplate` diretos**, exatamente o M-27 | vermelho ✓ |

### R3. O que esta identidade acrescentou

- `tests/checklist-template-lock.test.ts`: o §8.1 pela porta HTTP (REST em memória, molde `checklist-routes.test.ts`). São CE-1/2a/2b/3/14, CE-7a–d/8a/8b, CE-9a–e, CE-10a–c (inclui resposta 200, `available` não lista, `createRun` 404 e reabrir 409), CE-11a/11b, CE-12, CE-8c (repositório instrumentado: 1 leitura e auditoria `versionFrom/versionTo/typeFrom/typeTo`), o guard CE-11c e o guard CE-13 (leitura de arquivo, inclusive URL concatenada).
- `tests/checklist-template-change.test.ts`: `required` `false→true` e reordenar `config.options` (CE-18b/18c pedem os dois sentidos).
- **`createRun` de modelo arquivado responde 404, não 409** como diz o CE-10c do plano. Medido e inalterado: o serviço resolve o modelo por `getTemplate`, que não enxerga arquivado. O teste fixa 404.
- **Premissa do plano incompleta (M-27), declarada.** O inventário de consumidores não contou `tests/helpers/o6r07c-census.ts:90`, que publica com a URL **concatenada** e sem token. No `npm test` isso derrubou 14 testes do `o6r07c-census-guard` ("semente incompleta"). O conserto tem 1 linha, da mesma natureza das 13 permitidas (só o token), mas fica **fora da lista nominal do PERMITIDO**, como o `checklist-editor-blockers-parity.test.ts` que o Codex já tinha declarado. O CE-13 passou a pegar a forma concatenada (mutação em R5). A junta (C2/C3) julga.
- `agent-orchestration/controle/pendencias.md`: `P-B-SAN3-22-CI-DB-SUITE` re-medida e corrigida, de "bloqueia o merge" para "não bloqueia". A suíte `-db` nova **roda na CI** no job `backend` (`npm test` com `DATABASE_URL`, superusuário `postgres`, orçamento de skip 2); só não está na lista curada do `backend-postgres`, onde o §12 a situa.
- Merge de `origin/main` (`9dad66c0`: #459, #460, #461, #462) **sem rebase**, no commit `7cbae4c1`. O único conflito foi em `pendencias.md` (os dois lados acrescentaram no fim), resolvido mantendo os dois blocos. A `main` não tocou `src/modules/checklists` nem os testes de checklist (`git diff b08c7557 origin/main -- src/modules/checklists tests/checklist*` = 0 linhas). O seletor `B-APARENCIA-USUARIO` entrou pelo #461, então a válvula H-08 não será necessária na fatia de tela.

### R4. Bateria depois do merge

Disco: 12 GB antes de cada suíte `-db`. Docker: 1 trabalho fora de `erp-*`. `npx prisma migrate deploy` aplicou no banco descartável a migração nova da `main` (`20260882000000_…`).

| Comando | Resultado |
|---|---|
| `npm run check` · `npm run lint` · `npm run build` | verdes |
| testes do bloco e regressões sem banco (14 arquivos: `checklist-template-change`, `checklist-template-lock`, `checklist-routes`, `checklist-snapshot-dispatch`, `mobile-backend-contracts`, `field-dispatch-multi-checklist`, `field-dispatch-checklist-set-port` e os demais consumidores) | **368/368**, 0 falha, 0 pulo |
| `-db` com `CORE_SAAS_PERSISTENCE=prisma`: `checklist-template-lock-db`, `checklist-template-prisma-db`, `checklist-routes-db`, `checklist-run-lifecycle-db`, `checklist-run-create-concurrency-db` | **26/26**, 0 falha, 0 pulo |
| `tests/o6r07c-census-guard.test.ts`, depois do token na semente | 32/32 |
| `npm test` na forma do job `backend` (`DATABASE_URL` e `REDIS_URL` exportados, `CORE_SAAS_PERSISTENCE=memory`), banco **limpo** `dev_san322_c` | 361 arquivos · **4120 testes · pass 4108 · fail 10 · skip 2** (orçamento 2); exit 1 pelas falhas e pelo piso de denominador. Os 52 `ok … CE-` do bloco estão no TAP, inclusive `CE-12-db` e `CE-22/23` |
| `node scripts/migration-transaction-guard.mjs` | `migrações: 117 · anteriores: 112 · novas: 5 · violações: 0` (as 5 "novas" são posteriores ao instantâneo interno do guard; o diff deste bloco em `prisma/` é 0) |
| `git diff --check origin/main...HEAD` | limpo |
| `git diff --name-only origin/main...HEAD -- mobile/ prisma/ src/modules/core-saas/ frontend/ Kpis/ .github/ src/database/` | **0** arquivos |

**As 10 falhas do `npm test` são do Windows; nenhuma é de checklist.** Rodadas isoladas, em banco limpo (`dev_san322_b`):

| Arquivo | Isolado (pass/fail) | Causa medida |
|---|---|---|
| `san3-05-runtime-role-guard-db` (4) | 8/4 | `setsid: ausente — necessário para impedir que psql leia a senha do terminal` (o job da CI é Linux) |
| `san3-09-bootstrap-platform-admin-db` (2) | 0/2 | o spawn de `node_modules/.bin/prisma` (script de shell) falha no Windows |
| `traccar-event-migration-drill-db` e `work-order-invoicing-migration-drill-db` (1 cada, mais o piso de denominador) | 6/1 cada | `EBUSY` no teardown (trava de arquivo do Windows), já registrado pelo Codex |
| `traccar-position-ingestion-db` (2: tempo esgotado → 503) | **22/0** | sensível a carga; passa sozinho |

Na 1ª rodada (banco `dev_san322` reaproveitado) houve ainda 1 falha em `o6r06-allocation-basis-rls-db` (`count 13 × 11`, linhas de outro teste no mesmo período). No banco limpo: 10/10. Poluição de banco compartilhado, não do bloco.

**Escopo por arquivo de teste (CE-33), declarado.** Passam de 4 linhas, só com o encanamento do token: `checklist-routes` (+14/−9: helpers devolvem `updatedAt`; o PATCH `archived` de 716-720 vira DELETE), `checklist-routes-db` (+6/−5: idem em 211), `checklist-snapshot-dispatch` (+8/−8), `checklist-template-prisma-db` (+8/−4: o fixture publica antes de `createRun`, porque a R6 exige publicado sob lock), `mobile-backend-contracts` (+16/−5: o stub Prisma da reabertura responde à 2ª `$queryRaw`, a do `FOR KEY SHARE` da R6), `mobile-checklists-available` (+5/−5) e `work-order-checklists-sticky` (+5/−5). Fora da lista nominal: `checklist-editor-blockers-parity` (1 linha, do Codex) e `helpers/o6r07c-census.ts` (1 linha, desta identidade).

### R5. Mutações

Cada uma: backup no scratchpad, mutante, teste nominal, restauro por cópia com SHA-256 conferido.

| CE | Mutante | Teste que ficou vermelho | Restauro |
|---|---|---|---|
| CE-3 | memória sem comparar o token | CE-1/2a/2b/3/14 (REST) | `a194b198…` OK |
| CE-7a | classificador sempre `text` | CE-7a…8b (REST) | `ecf393ba…` OK |
| CE-9b | `draft` com viva tratado como texto | CE-9a…9e (REST) | `a194b198…` OK |
| CE-10c | `render` não serve `archived` | CE-10a…10c (REST) | `79692556…` OK |
| CE-11b | publicar sem o predicado do token (memória) | CE-11a/11b (REST) | `a194b198…` OK |
| CE-8c | serviço lê o modelo antes de gravar | CE-8c (1 × 2 leituras) | `79692556…` OK |
| CE-14 | GET de detalhe com `activeRuns` fixo em 0 | CE-1/2a/2b/3/14 | `c24d5c62…` OK |
| CE-13 | tirar o token de `work-order-checklists-sticky.test.ts:832` | CE-13 | `69f1bb62…` OK |
| CE-13 (URL concatenada) | tirar o token de `helpers/o6r07c-census.ts:90` | CE-13 | `af315b02…` OK |
| **CE-12-db** | sem `tenant_id` no `FOR UPDATE`, no `getTemplate` e no `update` | CE-12-db (superusuário) | `72870797…` OK |
| CE-4 | `updated_at = $x`, sem `date_trunc` | CE-4/5 | `72870797…` OK |
| CE-5 | lock sem `FOR UPDATE` | CE-4/5 | `72870797…` OK |
| CE-23 | `FOR NO KEY UPDATE` no lugar de `FOR UPDATE` | CE-22/23 | `72870797…` OK |
| CE-22 | `createRun` carimba a versão do argumento | CE-22/23 | `72870797…` OK |
| CE-24 | a reabertura mantém `previous.run.templateVersion` | CE-24 | `72870797…` OK |

**15 mutações, 15 vermelhas, 15 restauradas.** As de banco rodaram no Postgres limpo `dev_san322_b` (base antes delas: `checklist-template-lock-db` 9/9). As do Codex (CE-9d, CE-18a/18e e as 6 de banco dele, antes do merge) seguem registradas acima. CE-27 e CE-30 são da fatia web.

### R6. Commits, push e limpeza

- Commits em Conventional Commits, sem atribuição: `c67a31bf` fix(checklists), `adb115cf` test(checklists), o do registro, o merge `7cbae4c1` e o commit final desta retomada (testes acrescentados, semente do censo, pendência corrigida e este relatório).
- `git push -u origin fix/checklist-trava-versao`. PR **não** aberto.
- Limpeza §C5: `dev-san322-pg` e `dev-san322-redis` removidos (com os bancos `dev_san322`, `_b` e `_c`). Worktree mantido. No scratchpad, só os arquivos desta identidade.
- **Para o orquestrador:** (1) a fatia web (`P-B-SAN3-22-FRONT-TOKEN-E-3-APARENCIAS`) é pré-requisito de merge: sem ela, o editor web atual leva 400 ao salvar, publicar e arquivar (R9 do plano); (2) a emenda de escopo para `helpers/o6r07c-census.ts` e `checklist-editor-blockers-parity.test.ts`; (3) `P-B-SAN3-22-CI-DB-SUITE`, agora não bloqueante.
